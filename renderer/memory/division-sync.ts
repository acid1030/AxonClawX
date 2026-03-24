/**
 * 分队记忆同步系统 - 精简版
 * 
 * 核心功能：同步协议、状态跟踪、冲突解决
 * 
 * @module division-sync
 * @author ARIA (设计分队)
 * @date 2026-03-13
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { EventEmitter } from 'events';

// ============ 类型定义 ============

export type SyncStatus = 'synced' | 'pending' | 'syncing' | 'error';

export interface SyncChange {
  path: string;
  action: 'create' | 'update' | 'delete';
  hash: string;
  timestamp: string;
  priority: 'high' | 'normal' | 'low';
  content?: string;
}

export interface SyncMessage {
  type: 'push_update' | 'pull_request' | 'division_report';
  source: string;
  target: string;
  timestamp: number;
  changes: SyncChange[];
  division?: string;
  commander?: string;
  summary?: string;
  tags?: string[];
  confidence?: number;
}

export interface ConflictRecord {
  id: string;
  path: string;
  globalVersion: SyncChange;
  divisionVersion: SyncChange;
  detectedAt: string;
  status: 'pending' | 'resolved' | 'escalated';
  resolution?: 'global_wins' | 'division_wins' | 'manual' | 'merged';
  resolvedAt?: string;
}

export interface SyncState {
  lastSync: string;
  status: SyncStatus;
  globalVersion?: string;
  pending: SyncChange[];
  conflicts: ConflictRecord[];
  syncHistory: {
    timestamp: string;
    type: 'push' | 'pull' | 'incremental' | 'report';
    changes: number;
    success: boolean;
    error?: string;
  }[];
}

export interface DivisionReport {
  type: 'division_report';
  source: string;
  target: string;
  timestamp: number;
  division: string;
  commander: string;
  content: Array<{
    path: string;
    action: 'create' | 'update' | 'delete';
    summary: string;
    tags: string[];
    confidence: number;
  }>;
}

// ============ 常量 ============

const MEMORY_ROOT = path.join(process.env.HOME || '~', '.openclaw', 'memory');
const SYNC_STATE_FILE = path.join(MEMORY_ROOT, '.sync-state.yaml');
const INCREMENTAL_CHECK_INTERVAL = 5 * 60 * 1000; // 5 分钟

// ============ 事件发射器 ============

export class SyncEventEmitter extends EventEmitter {
  on(event: 'sync-start', listener: (type: string) => void): this;
  on(event: 'sync-complete', listener: (type: string, changes: number) => void): this;
  on(event: 'conflict-detected', listener: (conflict: ConflictRecord) => void): this;
  on(event: 'conflict-resolved', listener: (conflict: ConflictRecord) => void): this;
  on(event: 'error', listener: (error: Error) => void): this;
  on(event: string, listener: (...args: any[]) => void): this {
    return super.on(event, listener);
  }
}

export const syncEvents = new SyncEventEmitter();

// ============ 状态跟踪 ============

export function loadSyncState(): SyncState {
  const defaultState: SyncState = {
    lastSync: new Date().toISOString(),
    status: 'synced',
    pending: [],
    conflicts: [],
    syncHistory: [],
  };

  if (!fs.existsSync(SYNC_STATE_FILE)) {
    return defaultState;
  }

  try {
    const content = fs.readFileSync(SYNC_STATE_FILE, 'utf-8');
    return yaml.load(content) as SyncState || defaultState;
  } catch (error) {
    console.error('Failed to load sync state:', error);
    return defaultState;
  }
}

export function saveSyncState(state: SyncState): void {
  try {
    fs.mkdirSync(path.dirname(SYNC_STATE_FILE), { recursive: true });
    const yamlContent = yaml.dump(state, { indent: 2, lineWidth: -1, noRefs: true });
    fs.writeFileSync(SYNC_STATE_FILE, yamlContent, 'utf-8');
  } catch (error) {
    console.error('Failed to save sync state:', error);
    syncEvents.emit('error', error as Error);
  }
}

export function updateSyncState(updates: Partial<SyncState>): SyncState {
  const state = loadSyncState();
  const newState = { ...state, ...updates };
  saveSyncState(newState);
  return newState;
}

export function recordSyncHistory(
  type: 'push' | 'pull' | 'incremental' | 'report',
  changes: number,
  success: boolean,
  error?: string
): void {
  const state = loadSyncState();
  state.syncHistory.unshift({ timestamp: new Date().toISOString(), type, changes, success, error });
  state.syncHistory = state.syncHistory.slice(0, 100);
  state.lastSync = new Date().toISOString();
  state.status = success ? 'synced' : 'error';
  saveSyncState(state);
}

// ============ 冲突解决 ============

function generateConflictId(): string {
  return `conflict_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function detectConflict(
  changePath: string,
  globalChange: SyncChange,
  divisionChange: SyncChange
): ConflictRecord | null {
  if (globalChange.hash === divisionChange.hash) {
    return null;
  }

  return {
    id: generateConflictId(),
    path: changePath,
    globalVersion: globalChange,
    divisionVersion: divisionChange,
    detectedAt: new Date().toISOString(),
    status: 'pending',
  };
}

export function resolveConflict(conflictId: string, resolution: 'global_wins' | 'manual'): ConflictRecord | null {
  const state = loadSyncState();
  const conflictIndex = state.conflicts.findIndex(c => c.id === conflictId);
  
  if (conflictIndex === -1) {
    console.error(`Conflict ${conflictId} not found`);
    return null;
  }

  const conflict = state.conflicts[conflictIndex];
  conflict.resolution = resolution;
  conflict.resolvedAt = new Date().toISOString();
  conflict.status = 'resolved';
  
  state.conflicts[conflictIndex] = conflict;
  saveSyncState(state);
  
  syncEvents.emit('conflict-resolved', conflict);
  return conflict;
}

// ============ 同步协议 ============

function getAllFiles(dir: string, fileList: string[] = []): string[] {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stats = fs.statSync(fullPath);
    if (stats.isDirectory()) {
      getAllFiles(fullPath, fileList);
    } else {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

function generateHash(content: string): string {
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(content).digest('hex');
}

/**
 * 推送同步：Global → Division
 */
export async function pushFromGlobal(
  divisionId: string,
  changes: SyncChange[]
): Promise<{ success: boolean; applied: number; conflicts: number }> {
  syncEvents.emit('sync-start', 'push');
  
  const state = loadSyncState();
  state.status = 'syncing';
  saveSyncState(state);
  
  let applied = 0;
  let conflicts = 0;
  const divisionPath = path.join(MEMORY_ROOT, 'divisions', divisionId, 'shared');
  
  try {
    for (const change of changes) {
      const fullPath = path.join(divisionPath, change.path);
      const pendingChange = state.pending.find(p => p.path === change.path);
      
      if (pendingChange) {
        const conflict = detectConflict(change.path, change, pendingChange);
        if (conflict) {
          state.conflicts.push(conflict);
          conflicts++;
          resolveConflict(conflict.id, 'global_wins');
          console.log(`Conflict resolved (global wins): ${change.path}`);
        }
      }
      
      const dir = path.dirname(fullPath);
      fs.mkdirSync(dir, { recursive: true });
      
      if (change.action === 'delete') {
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
        }
      } else if (change.content) {
        fs.writeFileSync(fullPath, change.content, 'utf-8');
      }
      
      applied++;
    }
    
    state.lastSync = new Date().toISOString();
    state.status = 'synced';
    state.globalVersion = new Date().toISOString();
    state.pending = state.pending.filter(p => !changes.find(c => c.path === p.path));
    saveSyncState(state);
    recordSyncHistory('push', applied, true);
    
    syncEvents.emit('sync-complete', 'push', applied);
    return { success: true, applied, conflicts };
  } catch (error) {
    console.error('Push sync failed:', error);
    recordSyncHistory('push', applied, false, (error as Error).message);
    syncEvents.emit('error', error as Error);
    return { success: false, applied, conflicts: 0 };
  }
}

/**
 * 拉取同步：Division → Global
 */
export async function pullToGlobal(
  divisionId: string,
  fullSync: boolean = false
): Promise<{ success: boolean; pulled: number }> {
  syncEvents.emit('sync-start', 'pull');
  
  const state = loadSyncState();
  state.status = 'syncing';
  saveSyncState(state);
  
  const divisionPath = path.join(MEMORY_ROOT, 'divisions', divisionId, 'shared');
  let pulled = 0;
  
  try {
    if (!fs.existsSync(divisionPath)) {
      return { success: true, pulled: 0 };
    }
    
    const files = getAllFiles(divisionPath);
    for (const file of files) {
      const relativePath = path.relative(divisionPath, file);
      const content = fs.readFileSync(file, 'utf-8');
      
      state.pending.push({
        path: relativePath,
        action: 'create',
        hash: generateHash(content),
        timestamp: new Date().toISOString(),
        priority: 'normal',
        content,
      });
      pulled++;
    }
    
    saveSyncState(state);
    recordSyncHistory('pull', pulled, true);
    syncEvents.emit('sync-complete', 'pull', pulled);
    
    return { success: true, pulled };
  } catch (error) {
    console.error('Pull sync failed:', error);
    recordSyncHistory('pull', pulled, false, (error as Error).message);
    syncEvents.emit('error', error as Error);
    return { success: false, pulled: 0 };
  }
}

/**
 * 增量同步检查（5 分钟间隔）
 */
export async function incrementalSync(divisionId: string): Promise<{ success: boolean; newChanges: number }> {
  syncEvents.emit('sync-start', 'incremental');
  
  const state = loadSyncState();
  const lastSyncTime = new Date(state.lastSync).getTime();
  const now = Date.now();
  
  if (now - lastSyncTime < INCREMENTAL_CHECK_INTERVAL) {
    return { success: true, newChanges: 0 };
  }
  
  const divisionPath = path.join(MEMORY_ROOT, 'divisions', divisionId, 'shared');
  let newChanges = 0;
  
  try {
    if (!fs.existsSync(divisionPath)) {
      return { success: true, newChanges: 0 };
    }
    
    const files = getAllFiles(divisionPath);
    for (const file of files) {
      const stats = fs.statSync(file);
      if (stats.mtimeMs > lastSyncTime) {
        const relativePath = path.relative(divisionPath, file);
        const content = fs.readFileSync(file, 'utf-8');
        
        if (!state.pending.some(p => p.path === relativePath)) {
          state.pending.push({
            path: relativePath,
            action: 'update',
            hash: generateHash(content),
            timestamp: new Date(stats.mtimeMs).toISOString(),
            priority: 'normal',
            content,
          });
          newChanges++;
        }
      }
    }
    
    if (newChanges > 0) {
      saveSyncState(state);
    }
    
    recordSyncHistory('incremental', newChanges, true);
    syncEvents.emit('sync-complete', 'incremental', newChanges);
    
    return { success: true, newChanges };
  } catch (error) {
    console.error('Incremental sync failed:', error);
    recordSyncHistory('incremental', newChanges, false, (error as Error).message);
    syncEvents.emit('error', error as Error);
    return { success: false, newChanges: 0 };
  }
}

/**
 * 上报同步：队员 → 队长 → Global
 */
export async function reportToGlobal(
  divisionId: string,
  commanderId: string,
  content: Array<{
    path: string;
    action: 'create' | 'update' | 'delete';
    summary: string;
    tags: string[];
    confidence: number;
  }>
): Promise<{ success: boolean; reportId?: string }> {
  const report: DivisionReport = {
    type: 'division_report',
    source: `divisions/${divisionId}/shared`,
    target: 'global/sync-queue',
    timestamp: Date.now(),
    division: divisionId,
    commander: commanderId,
    content,
  };
  
  const reportId = `report_${Date.now()}_${divisionId}`;
  const reportPath = path.join(MEMORY_ROOT, 'global', 'sync-queue', `${reportId}.yaml`);
  
  try {
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    const yamlContent = yaml.dump(report, { indent: 2, lineWidth: -1, noRefs: true });
    fs.writeFileSync(reportPath, yamlContent, 'utf-8');
    console.log(`Report submitted: ${reportPath}`);
    return { success: true, reportId };
  } catch (error) {
    console.error('Report submission failed:', error);
    syncEvents.emit('error', error as Error);
    return { success: false };
  }
}

// ============ 工具函数 ============

export function getPendingChanges(): SyncChange[] {
  return loadSyncState().pending;
}

export function clearProcessedChanges(processedPaths: string[]): void {
  const state = loadSyncState();
  state.pending = state.pending.filter(p => !processedPaths.includes(p.path));
  saveSyncState(state);
}

export function getConflicts(status?: 'pending' | 'resolved'): ConflictRecord[] {
  const state = loadSyncState();
  return status ? state.conflicts.filter(c => c.status === status) : state.conflicts;
}

export function getSyncSummary(): {
  status: SyncStatus;
  lastSync: string;
  pendingCount: number;
  conflictCount: number;
  globalVersion?: string;
} {
  const state = loadSyncState();
  return {
    status: state.status,
    lastSync: state.lastSync,
    pendingCount: state.pending.length,
    conflictCount: state.conflicts.filter(c => c.status === 'pending').length,
    globalVersion: state.globalVersion,
  };
}

// ============ 自动同步 ============

let incrementalSyncInterval: NodeJS.Timeout | null = null;

export function startAutoSync(divisionId: string): void {
  if (incrementalSyncInterval) {
    clearInterval(incrementalSyncInterval);
  }
  
  incrementalSyncInterval = setInterval(async () => {
    await incrementalSync(divisionId);
  }, INCREMENTAL_CHECK_INTERVAL);
  
  console.log(`Auto-sync started for division: ${divisionId}`);
}

export function stopAutoSync(): void {
  if (incrementalSyncInterval) {
    clearInterval(incrementalSyncInterval);
    incrementalSyncInterval = null;
    console.log('Auto-sync stopped');
  }
}

// ============ 默认导出 ============

export default {
  loadSyncState, saveSyncState, updateSyncState, recordSyncHistory, getSyncSummary,
  detectConflict, resolveConflict, getConflicts,
  pushFromGlobal, pullToGlobal, incrementalSync, reportToGlobal,
  getPendingChanges, clearProcessedChanges,
  startAutoSync, stopAutoSync,
  syncEvents,
};
