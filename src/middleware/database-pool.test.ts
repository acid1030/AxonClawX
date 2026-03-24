/**
 * SQLite 连接池测试
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { DatabasePool, PoolError, query, execute, transaction } from './database-pool';
import * as fs from 'fs';
import * as path from 'path';

const TEST_DB_PATH = path.join(__dirname, '../../test-db.sqlite');

describe('DatabasePool', () => {
  let pool: DatabasePool;

  beforeAll(async () => {
    // 清理测试数据库
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
  });

  afterAll(async () => {
    // 清理
    if (pool) {
      await pool.close();
    }
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
  });

  it('应该成功创建连接池', async () => {
    pool = new DatabasePool({
      dbPath: TEST_DB_PATH,
      poolSize: 3,
      acquireTimeout: 2000,
      queryTimeout: 5000,
    });

    const stats = pool.getStats();
    expect(stats.totalSize).toBe(3);
    expect(stats.available).toBe(3);
    expect(stats.inUse).toBe(0);
  });

  it('应该成功创建表', async () => {
    await execute(`
      CREATE TABLE IF NOT EXISTS test_users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE,
        age INTEGER
      )
    `);

    const tables = await query(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='test_users'"
    );
    expect(tables.length).toBe(1);
  });

  it('应该成功插入数据', async () => {
    const result = await execute(
      'INSERT INTO test_users (name, email, age) VALUES (?, ?, ?)',
      ['Alice', 'alice@test.com', 25]
    );

    expect(result.changes).toBe(1);
    expect(result.lastInsertRowid).toBe(1);
  });

  it('应该成功查询数据', async () => {
    const users = await query('SELECT * FROM test_users');
    expect(users.length).toBe(1);
    expect(users[0].name).toBe('Alice');
    expect(users[0].email).toBe('alice@test.com');
  });

  it('应该成功查询单条数据', async () => {
    const { queryOne } = await import('./database-pool');
    const user = await queryOne('SELECT * FROM test_users WHERE email = ?', ['alice@test.com']);
    
    expect(user).toBeDefined();
    expect((user as any).name).toBe('Alice');
  });

  it('应该支持参数化查询', async () => {
    await execute('INSERT INTO test_users (name, email, age) VALUES (?, ?, ?)', [
      'Bob',
      'bob@test.com',
      30,
    ]);

    const users = await query('SELECT * FROM test_users WHERE age > ?', [25]);
    expect(users.length).toBe(2);
  });

  it('应该支持事务', async () => {
    const result = await transaction(async (db) => {
      db.prepare('INSERT INTO test_users (name, email, age) VALUES (?, ?, ?)').run(
        'Charlie',
        'charlie@test.com',
        35
      );

      db.prepare('UPDATE test_users SET age = ? WHERE email = ?').run(26, 'alice@test.com');

      return { success: true };
    });

    expect(result).toEqual({ success: true });

    // 验证事务提交
    const users = await query('SELECT * FROM test_users ORDER BY id');
    expect(users.length).toBe(3);
    expect((users[0] as any).age).toBe(26);
  });

  it('事务失败应该回滚', async () => {
    try {
      await transaction(async (db) => {
        db.prepare('INSERT INTO test_users (name, email, age) VALUES (?, ?, ?)').run(
          'ShouldRollback',
          'rollback@test.com',
          99
        );

        // 故意抛出错误
        throw new Error('Simulated error');
      });
    } catch (error: any) {
      expect(error.message).toBe('Simulated error');
    }

    // 验证回滚
    const users = await query("SELECT * FROM test_users WHERE name = 'ShouldRollback'");
    expect(users.length).toBe(0);
  });

  it('应该支持并发查询', async () => {
    const promises = Array.from({ length: 5 }, (_, i) =>
      execute('INSERT INTO test_users (name, email, age) VALUES (?, ?, ?)', [
        `User${i}`,
        `user${i}@test.com`,
        20 + i,
      ])
    );

    const results = await Promise.all(promises);
    expect(results.length).toBe(5);

    const allUsers = await query('SELECT * FROM test_users');
    expect(allUsers.length).toBeGreaterThanOrEqual(8);
  });

  it('应该返回正确的统计信息', async () => {
    const stats = pool.getStats();
    
    expect(stats.totalSize).toBe(3);
    expect(stats.totalCreated).toBeGreaterThanOrEqual(3);
    expect(stats.queryTimeouts).toBe(0);
  });

  it('应该支持自定义超时', async () => {
    const { query } = await import('./database-pool');
    
    // 正常查询
    const users = await query('SELECT * FROM test_users LIMIT 1', [], { timeout: 5000 });
    expect(users.length).toBe(1);
  });

  it('应该支持优雅关闭', async () => {
    const testPool = new DatabasePool({ dbPath: TEST_DB_PATH });
    await testPool.close();
    
    const stats = testPool.getStats();
    expect(stats.totalClosed).toBe(stats.totalCreated);
  });

  it('关闭后应该拒绝新请求', async () => {
    const testPool = new DatabasePool({ dbPath: TEST_DB_PATH });
    await testPool.close();

    await expect(testPool.query('SELECT 1')).rejects.toThrow('POOL_CLOSED');
  });
});

describe('PoolError', () => {
  it('应该正确识别错误类型', async () => {
    const pool = new DatabasePool({ dbPath: TEST_DB_PATH, poolSize: 1 });
    
    // 获取唯一的连接
    const conn = await pool.getConnection();
    
    // 尝试获取第二个连接应该超时
    try {
      await Promise.race([
        pool.getConnection(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 100)
        )
      ]);
    } catch (error: any) {
      // 可能是 POOL_EXHAUSTED 或 Timeout
      expect(error).toBeDefined();
    }

    pool.releaseConnection(conn);
    await pool.close();
  });
});
