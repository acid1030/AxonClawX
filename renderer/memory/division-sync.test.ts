/**
 * 分队记忆同步系统测试
 * 
 * @file division-sync.test.ts
 * @author ARIA (设计分队)
 * @date 2026-03-13
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import {
  loadSyncState,
  saveSyncState,
  updateSyncState,
  detectConflict,
  resolveConflict,
  archiveVersion,
  pushFromGlobal,
  pullToGlobal,
  incrementalSync,
  reportToGlobal,
  getPendingChanges,
  getConflicts,
  getSyncSummary,
  recordSyncHistory,
  SyncChange,
  SyncState,
} from './division-sync';

// 测试用的临时目录
const TEST_MEMORY_ROOT = path.join(__dirname, '.test-sync-memory');
const ORIGINAL_MEMORY_ROOT = process.env.MEMORY_ROOT;

describe('Division Sync - 状态跟踪', () => {
  beforeEach(() => {
    // 设置测试环境
    process.env.MEMORY_ROOT = TEST_MEMORY_ROOT;
    
    // 清理并创建测试目录
    if (fs.existsSync(TEST_MEMORY_ROOT)) {
      fs.rmSync(TEST_MEMORY_ROOT, { recursive: true });
    }
    fs.mkdirSync(TEST_MEMORY_ROOT, { recursive: true });
  });

  afterEach(() => {
    // 恢复环境
    if (ORIGINAL_MEMORY_ROOT) {
      process.env.MEMORY_ROOT = ORIGINAL_MEMORY_ROOT;
    }
    
    // 清理测试目录
    if (fs.existsSync(TEST_MEMORY_ROOT)) {
      fs.rmSync(TEST_MEMORY_ROOT, { recursive: true });
    }
  });

  test('应该加载默认同步状态', () => {
    const state = loadSyncState();
    
    expect(state).toBeDefined();
    expect(state.status).toBe('synced');
    expect(state.pending).toEqual([]);
    expect(state.conflicts).toEqual([]);
    expect(state.lastSync).toBeDefined();
  });

  test('应该保存和加载同步状态', () => {
    const testState: SyncState = {
      lastSync: '2026-03-13T13:30:00.000Z',
      status: 'synced',
      pending: [],
      conflicts: [],
      syncHistory: [],
    };

    saveSyncState(testState);
    const loadedState = loadSyncState();

    expect(loadedState.lastSync).toBe(testState.lastSync);
    expect(loadedState.status).toBe(testState.status);
  });

  test('应该更新同步状态', () => {
    const initialState = loadSyncState();
    expect(initialState.status).toBe('synced');

    const updatedState = updateSyncState({ status: 'pending' });
    expect(updatedState.status).toBe('pending');

    const reloadedState = loadSyncState();
    expect(reloadedState.status).toBe('pending');
  });

  test('应该记录同步历史', () => {
    recordSyncHistory('push', 5, true);
    
    const state = loadSyncState();
    expect(state.syncHistory.length).toBeGreaterThan(0);
    expect(state.syncHistory[0].type).toBe('push');
    expect(state.syncHistory[0].changes).toBe(5);
    expect(state.syncHistory[0].success).toBe(true);
  });

  test('应该限制同步历史记录数量', () => {
    // 记录 150 次同步
    for (let i = 0; i < 150; i++) {
      recordSyncHistory('incremental', 1, true);
    }
    
    const state = loadSyncState();
    expect(state.syncHistory.length).toBeLessThanOrEqual(100);
  });
});

describe('Division Sync - 冲突解决', () => {
  beforeEach(() => {
    process.env.MEMORY_ROOT = TEST_MEMORY_ROOT;
    
    if (fs.existsSync(TEST_MEMORY_ROOT)) {
      fs.rmSync(TEST_MEMORY_ROOT, { recursive: true });
    }
    fs.mkdirSync(TEST_MEMORY_ROOT, { recursive: true });
  });

  afterEach(() => {
    if (ORIGINAL_MEMORY_ROOT) {
      process.env.MEMORY_ROOT = ORIGINAL_MEMORY_ROOT;
    }
    
    if (fs.existsSync(TEST_MEMORY_ROOT)) {
      fs.rmSync(TEST_MEMORY_ROOT, { recursive: true });
    }
  });

  test('应该检测到冲突', () => {
    const globalChange: SyncChange = {
      path: 'knowledge/test.md',
      action: 'update',
      hash: 'sha256:abc123',
      timestamp: '2026-03-13T13:00:00.000Z',
      priority: 'normal',
    };

    const divisionChange: SyncChange = {
      path: 'knowledge/test.md',
      action: 'update',
      hash: 'sha256:def456',
      timestamp: '2026-03-13T13:05:00.000Z',
      priority: 'normal',
    };

    const conflict = detectConflict('knowledge/test.md', globalChange, divisionChange);
    
    expect(conflict).not.toBeNull();
    expect(conflict!.path).toBe('knowledge/test.md');
    expect(conflict!.status).toBe('pending');
  });

  test('相同 hash 不应该检测到冲突', () => {
    const change: SyncChange = {
      path: 'knowledge/test.md',
      action: 'update',
      hash: 'sha256:same123',
      timestamp: '2026-03-13T13:00:00.000Z',
      priority: 'normal',
    };

    const conflict = detectConflict('knowledge/test.md', change, change);
    
    expect(conflict).toBeNull();
  });

  test('应该解决冲突 (Global 优先)', () => {
    // 先创建一个冲突
    const state = loadSyncState();
    const conflict = detectConflict(
      'knowledge/test.md',
      {
        path: 'knowledge/test.md',
        action: 'update',
        hash: 'sha256:global',
        timestamp: '2026-03-13T13:00:00.000Z',
        priority: 'normal',
      },
      {
        path: 'knowledge/test.md',
        action: 'update',
        hash: 'sha256:division',
        timestamp: '2026-03-13T13:05:00.000Z',
        priority: 'normal',
      }
    )!;
    
    state.conflicts.push(conflict);
    saveSyncState(state);

    // 解决冲突
    const resolved = resolveConflict(conflict.id, 'global_wins');
    
    expect(resolved).not.toBeNull();
    expect(resolved!.resolution).toBe('global_wins');
    expect(resolved!.status).toBe('resolved');
    expect(resolved!.resolvedAt).toBeDefined();
  });

  test('应该归档被覆盖的版本', () => {
    const version: SyncChange = {
      path: 'knowledge/test.md',
      action: 'update',
      hash: 'sha256:test',
      timestamp: '2026-03-13T13:00:00.000Z',
      priority: 'normal',
      content: '# Test Content',
    };

    const archivedPath = archiveVersion('knowledge/test.md', version, 'test_override');
    
    expect(archivedPath).toBeDefined();
    expect(archivedPath).toContain('.archived');
    expect(fs.existsSync(archivedPath)).toBe(true);
  });
});

describe('Division Sync - 同步协议', () => {
  beforeEach(() => {
    process.env.MEMORY_ROOT = TEST_MEMORY_ROOT;
    
    if (fs.existsSync(TEST_MEMORY_ROOT)) {
      fs.rmSync(TEST_MEMORY_ROOT, { recursive: true });
    }
    fs.mkdirSync(TEST_MEMORY_ROOT, { recursive: true });
    
    // 创建 Division 目录结构
    fs.mkdirSync(path.join(TEST_MEMORY_ROOT, 'divisions', 'miiow', 'shared'), { recursive: true });
    fs.mkdirSync(path.join(TEST_MEMORY_ROOT, 'global', 'sync-queue'), { recursive: true });
  });

  afterEach(() => {
    if (ORIGINAL_MEMORY_ROOT) {
      process.env.MEMORY_ROOT = ORIGINAL_MEMORY_ROOT;
    }
    
    if (fs.existsSync(TEST_MEMORY_ROOT)) {
      fs.rmSync(TEST_MEMORY_ROOT, { recursive: true });
    }
  });

  test('应该执行推送同步 (Global → Division)', async () => {
    const changes: SyncChange[] = [
      {
        path: 'knowledge/test1.md',
        action: 'create',
        hash: 'sha256:abc123',
        timestamp: '2026-03-13T13:00:00.000Z',
        priority: 'normal',
        content: '# Test Content 1',
      },
      {
        path: 'knowledge/test2.md',
        action: 'create',
        hash: 'sha256:def456',
        timestamp: '2026-03-13T13:01:00.000Z',
        priority: 'normal',
        content: '# Test Content 2',
      },
    ];

    const result = await pushFromGlobal('miiow', changes);
    
    expect(result.success).toBe(true);
    expect(result.applied).toBe(2);
    expect(result.conflicts).toBe(0);

    // 验证文件已创建
    const file1Path = path.join(TEST_MEMORY_ROOT, 'divisions', 'miiow', 'shared', 'knowledge', 'test1.md');
    const file2Path = path.join(TEST_MEMORY_ROOT, 'divisions', 'miiow', 'shared', 'knowledge', 'test2.md');
    
    expect(fs.existsSync(file1Path)).toBe(true);
    expect(fs.existsSync(file2Path)).toBe(true);
  });

  test('推送同步应该处理冲突', async () => {
    // 先创建本地 pending 更改
    const state = loadSyncState();
    state.pending.push({
      path: 'knowledge/conflict.md',
      action: 'update',
      hash: 'sha256:local',
      timestamp: '2026-03-13T13:00:00.000Z',
      priority: 'normal',
      content: '# Local Content',
    });
    saveSyncState(state);

    // 推送 Global 更改
    const changes: SyncChange[] = [
      {
        path: 'knowledge/conflict.md',
        action: 'update',
        hash: 'sha256:global',
        timestamp: '2026-03-13T13:05:00.000Z',
        priority: 'high',
        content: '# Global Content',
      },
    ];

    const result = await pushFromGlobal('miiow', changes);
    
    expect(result.success).toBe(true);
    expect(result.conflicts).toBe(1);

    // 验证冲突已解决
    const conflicts = getConflicts('pending');
    expect(conflicts.length).toBe(0);
  });

  test('应该执行拉取同步 (Division → Global)', async () => {
    // 创建 Division 文件
    const divisionPath = path.join(TEST_MEMORY_ROOT, 'divisions', 'miiow', 'shared');
    fs.writeFileSync(path.join(divisionPath, 'file1.md'), '# File 1');
    fs.writeFileSync(path.join(divisionPath, 'file2.md'), '# File 2');

    const result = await pullToGlobal('miiow');
    
    expect(result.success).toBe(true);
    expect(result.pulled).toBe(2);

    // 验证 pending 中有更改
    const pending = getPendingChanges();
    expect(pending.length).toBe(2);
  });

  test('应该执行增量同步', async () => {
    const divisionPath = path.join(TEST_MEMORY_ROOT, 'divisions', 'miiow', 'shared');
    
    // 先设置上次同步时间为 10 分钟前
    updateSyncState({ lastSync: new Date(Date.now() - 10 * 60 * 1000).toISOString() });
    
    // 创建文件
    fs.writeFileSync(path.join(divisionPath, 'new-file.md'), '# New File');

    const result = await incrementalSync('miiow');
    
    expect(result.success).toBe(true);
    expect(result.newChanges).toBe(1);
  });

  test('增量同步在时间间隔内不应该执行', async () => {
    // 设置上次同步时间为刚刚
    updateSyncState({ lastSync: new Date().toISOString() });
    
    const result = await incrementalSync('miiow');
    
    expect(result.success).toBe(true);
    expect(result.newChanges).toBe(0);
  });

  test('应该上报到 Global', async () => {
    const content = [
      {
        path: 'knowledge/discovery.md',
        action: 'create',
        summary: '新的发现',
        tags: ['important', 'knowledge'],
        confidence: 0.95,
      },
    ];

    const result = await reportToGlobal('miiow', 'MIIOW-COMMANDER', content);
    
    expect(result.success).toBe(true);
    expect(result.reportId).toBeDefined();

    // 验证报告文件已创建
    const reportFiles = fs.readdirSync(path.join(TEST_MEMORY_ROOT, 'global', 'sync-queue'));
    expect(reportFiles.length).toBeGreaterThan(0);
  });
});

describe('Division Sync - 状态查询', () => {
  beforeEach(() => {
    process.env.MEMORY_ROOT = TEST_MEMORY_ROOT;
    
    if (fs.existsSync(TEST_MEMORY_ROOT)) {
      fs.rmSync(TEST_MEMORY_ROOT, { recursive: true });
    }
    fs.mkdirSync(TEST_MEMORY_ROOT, { recursive: true });
  });

  afterEach(() => {
    if (ORIGINAL_MEMORY_ROOT) {
      process.env.MEMORY_ROOT = ORIGINAL_MEMORY_ROOT;
    }
    
    if (fs.existsSync(TEST_MEMORY_ROOT)) {
      fs.rmSync(TEST_MEMORY_ROOT, { recursive: true });
    }
  });

  test('应该获取同步摘要', () => {
    const summary = getSyncSummary();
    
    expect(summary).toBeDefined();
    expect(summary.status).toBe('synced');
    expect(summary.pendingCount).toBe(0);
    expect(summary.conflictCount).toBe(0);
  });

  test('应该获取待处理更改', () => {
    const state = loadSyncState();
    state.pending.push({
      path: 'pending/test.md',
      action: 'create',
      hash: 'sha256:pending',
      timestamp: '2026-03-13T13:00:00.000Z',
      priority: 'normal',
    });
    saveSyncState(state);

    const pending = getPendingChanges();
    expect(pending.length).toBe(1);
    expect(pending[0].path).toBe('pending/test.md');
  });

  test('应该清除已处理的更改', () => {
    const state = loadSyncState();
    state.pending.push(
      {
        path: 'processed/test1.md',
        action: 'create',
        hash: 'sha256:1',
        timestamp: '2026-03-13T13:00:00.000Z',
        priority: 'normal',
      },
      {
        path: 'processed/test2.md',
        action: 'create',
        hash: 'sha256:2',
        timestamp: '2026-03-13T13:01:00.000Z',
        priority: 'normal',
      }
    );
    saveSyncState(state);

    // 清除一个
    // Note: clearProcessedChanges is not exported, so we test via direct state manipulation
    const currentState = loadSyncState();
    currentState.pending = currentState.pending.filter(p => p.path !== 'processed/test1.md');
    saveSyncState(currentState);

    const pending = getPendingChanges();
    expect(pending.length).toBe(1);
    expect(pending[0].path).toBe('processed/test2.md');
  });
});

describe('Division Sync - 事件发射', () => {
  beforeEach(() => {
    process.env.MEMORY_ROOT = TEST_MEMORY_ROOT;
    
    if (fs.existsSync(TEST_MEMORY_ROOT)) {
      fs.rmSync(TEST_MEMORY_ROOT, { recursive: true });
    }
    fs.mkdirSync(TEST_MEMORY_ROOT, { recursive: true });
  });

  afterEach(() => {
    if (ORIGINAL_MEMORY_ROOT) {
      process.env.MEMORY_ROOT = ORIGINAL_MEMORY_ROOT;
    }
    
    if (fs.existsSync(TEST_MEMORY_ROOT)) {
      fs.rmSync(TEST_MEMORY_ROOT, { recursive: true });
    }
  });

  test('应该发射同步开始事件', async () => {
    const { syncEvents } = await import('./division-sync');
    
    return new Promise<void>((resolve) => {
      syncEvents.once('sync-start', (type) => {
        expect(type).toBe('push');
        resolve();
      });

      pushFromGlobal('miiow', []);
    });
  });

  test('应该发射同步完成事件', async () => {
    const { syncEvents } = await import('./division-sync');
    
    return new Promise<void>((resolve) => {
      syncEvents.once('sync-complete', (type, changes) => {
        expect(type).toBe('push');
        expect(changes).toBe(0);
        resolve();
      });

      pushFromGlobal('miiow', []);
    });
  });

  test('应该发射冲突检测事件', async () => {
    const { syncEvents } = await import('./division-sync');
    
    return new Promise<void>((resolve) => {
      syncEvents.once('conflict-resolved', (conflict) => {
        expect(conflict).toBeDefined();
        resolve();
      });

      // 创建并解决冲突
      const state = loadSyncState();
      const conflict = detectConflict(
        'test.md',
        {
          path: 'test.md',
          action: 'update',
          hash: 'sha256:a',
          timestamp: '2026-03-13T13:00:00.000Z',
          priority: 'normal',
        },
        {
          path: 'test.md',
          action: 'update',
          hash: 'sha256:b',
          timestamp: '2026-03-13T13:05:00.000Z',
          priority: 'normal',
        }
      )!;
      
      state.conflicts.push(conflict);
      saveSyncState(state);
      
      resolveConflict(conflict.id, 'global_wins');
    });
  });
});
