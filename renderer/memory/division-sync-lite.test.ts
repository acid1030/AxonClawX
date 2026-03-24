/**
 * Division Sync Lite - 测试
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { syncGlobalToDivision, syncDivisionToGlobal, syncBidirectional } from './division-sync-lite';

const TEST_MEMORY_ROOT = path.join(process.env.HOME || '~', '.openclaw', 'test-memory');
const TEST_GLOBAL = path.join(TEST_MEMORY_ROOT, 'global', 'shared');
const TEST_DIVISION = path.join(TEST_MEMORY_ROOT, 'divisions', 'test-div', 'shared');

describe('Division Sync Lite', () => {
  beforeAll(() => {
    // 清理测试目录
    if (fs.existsSync(TEST_MEMORY_ROOT)) {
      fs.rmSync(TEST_MEMORY_ROOT, { recursive: true });
    }
    // 创建测试文件结构
    fs.mkdirSync(TEST_GLOBAL, { recursive: true });
    fs.mkdirSync(TEST_DIVISION, { recursive: true });
  });

  afterAll(() => {
    // 清理测试目录
    if (fs.existsSync(TEST_MEMORY_ROOT)) {
      fs.rmSync(TEST_MEMORY_ROOT, { recursive: true });
    }
  });

  it('应该同步新文件 (Global → Division)', () => {
    // 创建测试文件
    const testFile = path.join(TEST_GLOBAL, 'test.md');
    fs.writeFileSync(testFile, 'test content', 'utf-8');

    const result = syncGlobalToDivision('test-div');
    
    expect(result.synced).toBeGreaterThanOrEqual(1);
    expect(fs.existsSync(path.join(TEST_DIVISION, 'test.md'))).toBe(true);
  });

  it('应该同步新文件 (Division → Global)', () => {
    const testFile = path.join(TEST_DIVISION, 'division-test.md');
    fs.writeFileSync(testFile, 'division content', 'utf-8');

    const result = syncDivisionToGlobal('test-div');
    
    expect(result.synced).toBeGreaterThanOrEqual(1);
  });

  it('应该执行双向同步', () => {
    const result = syncBidirectional('test-div');
    
    expect(result.globalToDivision).toBeDefined();
    expect(result.divisionToGlobal).toBeDefined();
  });
});
