/**
 * Division Sync Lite - 极简版 Global ↔ Division 文件同步
 * 
 * 核心功能：时间戳比较，新的覆盖旧的，每 5 分钟执行
 * 代码量：<10KB
 * 
 * @module division-sync-lite
 * @author ARIA (设计分队)
 * @date 2026-03-13
 */

import * as fs from 'fs';
import * as path from 'path';

// ============ 配置 ============

const MEMORY_ROOT = path.join(process.env.HOME || '~', '.openclaw', 'memory');
const GLOBAL_SHARED = path.join(MEMORY_ROOT, 'global', 'shared');
const DIVISIONS_ROOT = path.join(MEMORY_ROOT, 'divisions');
const SYNC_INTERVAL = 5 * 60 * 1000; // 5 分钟

// ============ 工具函数 ============

/**
 * 获取文件信息（包含 mtime）
 */
function getFileInfo(filePath: string): { path: string; mtime: number; content: string } | null {
  if (!fs.existsSync(filePath)) return null;
  
  const stats = fs.statSync(filePath);
  const content = fs.readFileSync(filePath, 'utf-8');
  
  return {
    path: filePath,
    mtime: stats.mtimeMs,
    content,
  };
}

/**
 * 递归获取目录下所有文件
 */
function getAllFiles(dir: string, baseDir: string = dir): string[] {
  if (!fs.existsSync(dir)) return [];
  
  const files: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...getAllFiles(fullPath, baseDir));
    } else {
      files.push(fullPath);
    }
  }
  
  return files;
}

/**
 * 复制文件（包含目录结构）
 */
function copyFile(src: string, dest: string): void {
  const dir = path.dirname(dest);
  fs.mkdirSync(dir, { recursive: true });
  fs.copyFileSync(src, dest);
}

/**
 * 同步单个文件（时间戳比较，新的覆盖旧的）
 */
function syncFile(src: string, dest: string, baseDir: string): { synced: boolean; reason: string } {
  const srcInfo = getFileInfo(src);
  const destInfo = getFileInfo(dest);
  
  // 源文件不存在
  if (!srcInfo) {
    if (destInfo) {
      fs.unlinkSync(dest);
      return { synced: true, reason: 'deleted (source removed)' };
    }
    return { synced: false, reason: 'source not found' };
  }
  
  // 目标文件不存在 -> 直接复制
  if (!destInfo) {
    copyFile(src, dest);
    return { synced: true, reason: 'created (new file)' };
  }
  
  // 时间戳比较：新的覆盖旧的
  if (srcInfo.mtime > destInfo.mtime) {
    copyFile(src, dest);
    return { synced: true, reason: 'updated (newer mtime)' };
  }
  
  return { synced: false, reason: 'up-to-date' };
}

// ============ 核心同步函数 ============

/**
 * Global → Division 同步
 */
export function syncGlobalToDivision(divisionId: string): { synced: number; skipped: number; errors: string[] } {
  const divisionShared = path.join(DIVISIONS_ROOT, divisionId, 'shared');
  const result = { synced: 0, skipped: 0, errors: [] as string[] };
  
  try {
    // 确保目标目录存在
    fs.mkdirSync(divisionShared, { recursive: true });
    
    // 获取 Global 所有文件
    const globalFiles = getAllFiles(GLOBAL_SHARED);
    
    for (const globalFile of globalFiles) {
      const relativePath = path.relative(GLOBAL_SHARED, globalFile);
      const divisionFile = path.join(divisionShared, relativePath);
      
      try {
        const syncResult = syncFile(globalFile, divisionFile, GLOBAL_SHARED);
        if (syncResult.synced) {
          result.synced++;
          console.log(`[Sync] ${relativePath}: ${syncResult.reason}`);
        } else {
          result.skipped++;
        }
      } catch (error) {
        result.errors.push(`${relativePath}: ${(error as Error).message}`);
      }
    }
  } catch (error) {
    result.errors.push(`Global→Division sync failed: ${(error as Error).message}`);
  }
  
  return result;
}

/**
 * Division → Global 同步（上报）
 */
export function syncDivisionToGlobal(divisionId: string): { synced: number; skipped: number; errors: string[] } {
  const divisionShared = path.join(DIVISIONS_ROOT, divisionId, 'shared');
  const result = { synced: 0, skipped: 0, errors: [] as string[] };
  
  try {
    // 确保 Global 目录存在
    fs.mkdirSync(GLOBAL_SHARED, { recursive: true });
    
    // 获取 Division 所有文件
    const divisionFiles = getAllFiles(divisionShared);
    
    for (const divisionFile of divisionFiles) {
      const relativePath = path.relative(divisionShared, divisionFile);
      const globalFile = path.join(GLOBAL_SHARED, 'divisions', divisionId, relativePath);
      
      try {
        const syncResult = syncFile(divisionFile, globalFile, divisionShared);
        if (syncResult.synced) {
          result.synced++;
          console.log(`[Sync] ${relativePath}: ${syncResult.reason}`);
        } else {
          result.skipped++;
        }
      } catch (error) {
        result.errors.push(`${relativePath}: ${(error as Error).message}`);
      }
    }
  } catch (error) {
    result.errors.push(`Division→Global sync failed: ${(error as Error).message}`);
  }
  
  return result;
}

/**
 * 双向同步（先 Global→Division，再 Division→Global）
 */
export function syncBidirectional(divisionId: string): {
  globalToDivision: { synced: number; skipped: number; errors: string[] };
  divisionToGlobal: { synced: number; skipped: number; errors: string[] };
} {
  console.log(`[Sync] Starting bidirectional sync for division: ${divisionId}`);
  
  const g2d = syncGlobalToDivision(divisionId);
  const d2g = syncDivisionToGlobal(divisionId);
  
  console.log(`[Sync] Complete - G→D: ${g2d.synced} synced, ${g2d.skipped} skipped | D→G: ${d2g.synced} synced, ${d2g.skipped} skipped`);
  
  return {
    globalToDivision: g2d,
    divisionToGlobal: d2g,
  };
}

// ============ 自动同步 ============

let syncInterval: NodeJS.Timeout | null = null;

/**
 * 启动自动同步（每 5 分钟）
 */
export function startAutoSync(divisionId: string): void {
  if (syncInterval) {
    clearInterval(syncInterval);
  }
  
  // 立即执行一次
  syncBidirectional(divisionId);
  
  // 每 5 分钟执行
  syncInterval = setInterval(() => {
    syncBidirectional(divisionId);
  }, SYNC_INTERVAL);
  
  console.log(`[Sync] Auto-sync started for division: ${divisionId} (every 5 minutes)`);
}

/**
 * 停止自动同步
 */
export function stopAutoSync(): void {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
    console.log('[Sync] Auto-sync stopped');
  }
}

// ============ 默认导出 ============

export default {
  syncGlobalToDivision,
  syncDivisionToGlobal,
  syncBidirectional,
  startAutoSync,
  stopAutoSync,
};
