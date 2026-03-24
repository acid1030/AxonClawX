/**
 * SQLite 连接池使用示例
 * 
 * 演示如何使用 database-pool.ts 模块
 */

import {
  DatabasePool,
  getPool,
  query,
  queryOne,
  execute,
  transaction,
  PoolError,
  type PoolConfig,
} from './database-pool';

// ==================== 示例 1: 基础配置 ====================

async function example1_BasicConfig() {
  console.log('\n=== 示例 1: 基础配置 ===\n');

  const config: PoolConfig = {
    dbPath: './data/app.db',
    poolSize: 5,              // 连接池大小
    acquireTimeout: 3000,      // 获取连接超时 (ms)
    queryTimeout: 10000,       // 查询超时 (ms)
    healthCheckInterval: 30000, // 健康检查间隔 (ms)
    idleTimeout: 120000,       // 空闲超时 (ms)
    enableWAL: true,           // 启用 WAL 模式
    enableForeignKeys: true,   // 启用外键
  };

  const pool = new DatabasePool(config);

  // 查看池子状态
  console.log('池子状态:', pool.getStats());

  await pool.close();
}

// ==================== 示例 2: 简单查询 ====================

async function example2_SimpleQuery() {
  console.log('\n=== 示例 2: 简单查询 ===\n');

  const pool = getPool({
    dbPath: './data/app.db',
    poolSize: 3,
  });

  try {
    // 创建表
    await execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE,
        age INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 插入数据
    const insertResult = await execute(
      'INSERT INTO users (name, email, age) VALUES (?, ?, ?)',
      ['Alice', 'alice@example.com', 25]
    );
    console.log('插入结果:', insertResult);

    // 查询数据
    const users = await query('SELECT * FROM users WHERE age > ?', [20]);
    console.log('查询结果:', users);

    // 查询单条
    const user = await queryOne('SELECT * FROM users WHERE email = ?', ['alice@example.com']);
    console.log('单条结果:', user);

  } catch (error) {
    if (error instanceof PoolError) {
      console.error('数据库错误:', error.code, error.message);
    } else {
      console.error('其他错误:', error);
    }
  }

  await pool.close();
}

// ==================== 示例 3: 事务处理 ====================

async function example3_Transaction() {
  console.log('\n=== 示例 3: 事务处理 ===\n');

  const pool = getPool({ dbPath: './data/app.db' });

  try {
    // 创建账户表
    await execute(`
      CREATE TABLE IF NOT EXISTS accounts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        balance REAL DEFAULT 0
      )
    `);

    // 初始化账户
    await execute('INSERT OR IGNORE INTO accounts (id, name, balance) VALUES (1, "A", 1000)');
    await execute('INSERT OR IGNORE INTO accounts (id, name, balance) VALUES (2, "B", 1000)');

    // 转账事务
    const result = await transaction(async (db) => {
      // 检查 A 的余额
      const accountA = db.prepare('SELECT balance FROM accounts WHERE id = ?').get(1) as any;
      console.log('A 的当前余额:', accountA.balance);

      if (accountA.balance < 500) {
        throw new Error('余额不足');
      }

      // 扣款
      db.prepare('UPDATE accounts SET balance = balance - ? WHERE id = ?').run(500, 1);
      
      // 收款
      db.prepare('UPDATE accounts SET balance = balance + ? WHERE id = ?').run(500, 2);

      return { success: true, message: '转账成功' };
    });

    console.log('事务结果:', result);

    // 验证结果
    const accounts = await query('SELECT * FROM accounts');
    console.log('最终账户状态:', accounts);

  } catch (error) {
    console.error('事务失败:', error);
  }

  await pool.close();
}

// ==================== 示例 4: 并发查询 ====================

async function example4_ConcurrentQueries() {
  console.log('\n=== 示例 4: 并发查询 ===\n');

  const pool = getPool({
    dbPath: './data/app.db',
    poolSize: 5,
  });

  try {
    // 创建测试表
    await execute(`
      CREATE TABLE IF NOT EXISTS logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        message TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 并发插入 10 条数据
    const promises = Array.from({ length: 10 }, (_, i) =>
      execute('INSERT INTO logs (message) VALUES (?)', [`Log message ${i + 1}`])
    );

    const results = await Promise.all(promises);
    console.log('并发插入结果:', results.length, '条');

    // 并发查询
    const allLogs = await query('SELECT * FROM logs ORDER BY id DESC LIMIT 5');
    console.log('最新 5 条日志:', allLogs);

    // 查看池子状态
    console.log('池子状态:', pool.getStats());

  } catch (error) {
    console.error('并发错误:', error);
  }

  await pool.close();
}

// ==================== 示例 5: 自定义超时 ====================

async function example5_CustomTimeout() {
  console.log('\n=== 示例 5: 自定义超时 ===\n');

  const pool = getPool({
    dbPath: './data/app.db',
    queryTimeout: 5000, // 默认 5 秒超时
  });

  try {
    // 使用自定义超时时间
    const result = await query(
      'SELECT * FROM users',
      [],
      { timeout: 1000 } // 覆盖为 1 秒
    );
    console.log('查询结果:', result);

  } catch (error) {
    if (error instanceof PoolError && error.code === 'QUERY_TIMEOUT') {
      console.error('查询超时!');
    } else {
      console.error('其他错误:', error);
    }
  }

  await pool.close();
}

// ==================== 示例 6: 错误处理与重连 ====================

async function example6_ErrorHandling() {
  console.log('\n=== 示例 6: 错误处理与重连 ===\n');

  const pool = getPool({
    dbPath: './data/app.db',
    poolSize: 3,
    acquireTimeout: 2000,
  });

  try {
    // 模拟连接耗尽
    const connections = [];
    for (let i = 0; i < 5; i++) {
      // 获取连接但不释放 (模拟长时间占用)
      // 实际使用中一定要记得释放!
    }

    // 这个查询会因为连接池耗尽而失败
    try {
      await query('SELECT * FROM users');
    } catch (error) {
      if (error instanceof PoolError && error.code === 'POOL_EXHAUSTED') {
        console.log('连接池耗尽，等待重试...');
        // 等待后重试
        await new Promise(resolve => setTimeout(resolve, 1000));
        const result = await query('SELECT * FROM users LIMIT 1');
        console.log('重试成功:', result);
      }
    }

  } catch (error) {
    console.error('错误:', error);
  }

  await pool.close();
}

// ==================== 示例 7: 在 Express/Koa 中使用 ====================

// 假设你在使用 Express
async function example7_WebFramework() {
  console.log('\n=== 示例 7: Web 框架集成 ===\n');

  // 初始化池子 (应用启动时)
  const pool = getPool({
    dbPath: './data/app.db',
    poolSize: 10,
  });

  // Express 示例
  /*
  import express from 'express';
  const app = express();

  // 用户列表 API
  app.get('/api/users', async (req, res) => {
    try {
      const users = await query('SELECT * FROM users');
      res.json({ success: true, data: users });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // 创建用户 API
  app.post('/api/users', async (req, res) => {
    const { name, email, age } = req.body;
    try {
      const result = await execute(
        'INSERT INTO users (name, email, age) VALUES (?, ?, ?)',
        [name, email, age]
      );
      res.json({ success: true, id: result.lastInsertRowid });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // 转账 API (使用事务)
  app.post('/api/transfer', async (req, res) => {
    const { fromId, toId, amount } = req.body;
    try {
      const result = await transaction(async (db) => {
        const from = db.prepare('SELECT balance FROM accounts WHERE id = ?').get(fromId) as any;
        if (from.balance < amount) {
          throw new Error('余额不足');
        }
        db.prepare('UPDATE accounts SET balance = balance - ? WHERE id = ?').run(amount, fromId);
        db.prepare('UPDATE accounts SET balance = balance + ? WHERE id = ?').run(amount, toId);
        return { success: true };
      });
      res.json(result);
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  // 应用关闭时清理
  process.on('SIGTERM', async () => {
    await pool.close();
    process.exit(0);
  });
  */

  console.log('Web 框架集成示例 (见代码注释)');
  await pool.close();
}

// ==================== 示例 8: 批量操作 ====================

async function example8_BatchOperations() {
  console.log('\n=== 示例 8: 批量操作 ===\n');

  const pool = getPool({ dbPath: './data/app.db' });

  try {
    // 创建批量插入表
    await execute(`
      CREATE TABLE IF NOT EXISTS metrics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        value REAL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 批量插入 (使用事务提高性能)
    await transaction(async (db) => {
      const insert = db.prepare('INSERT INTO metrics (name, value) VALUES (?, ?)');
      const insertMany = db.transaction((metrics: Array<[string, number]>) => {
        for (const [name, value] of metrics) {
          insert.run(name, value);
        }
      });

      // 准备 100 条数据
      const metrics = Array.from({ length: 100 }, (_, i) => [
        `metric_${i}`,
        Math.random() * 100,
      ] as [string, number]);

      insertMany(metrics);
      console.log('批量插入 100 条数据完成');
    });

    // 统计
    const count = await queryOne('SELECT COUNT(*) as count FROM metrics') as any;
    console.log('总记录数:', count.count);

  } catch (error) {
    console.error('批量操作错误:', error);
  }

  await pool.close();
}

// ==================== 示例 9: 监控与统计 ====================

async function example9_Monitoring() {
  console.log('\n=== 示例 9: 监控与统计 ===\n');

  const pool = getPool({
    dbPath: './data/app.db',
    poolSize: 5,
  });

  // 模拟一些查询
  for (let i = 0; i < 10; i++) {
    await query('SELECT * FROM users LIMIT 1');
  }

  // 获取统计信息
  const stats = pool.getStats();
  console.log('池子统计:', JSON.stringify(stats, null, 2));

  /*
  // 可以定期上报到监控系统
  setInterval(() => {
    const stats = pool.getStats();
    console.log('实时监控:', {
      使用率：((stats.totalSize - stats.available) / stats.totalSize * 100).toFixed(2) + '%',
      等待队列：stats.waiting,
      查询超时：stats.queryTimeouts,
      重连次数：stats.reconnections,
    });
  }, 5000);
  */

  await pool.close();
}

// ==================== 示例 10: 与现有 db-lite.ts 集成 ====================

async function example10_LegacyIntegration() {
  console.log('\n=== 示例 10: 与现有 db-lite.ts 集成 ===\n');

  // 方式 1: 使用连接池替代单例连接
  const pool = getPool({ dbPath: './axonclaw.db' });

  // 原来的 db-lite.ts 使用方式:
  // const db = new Database('./axonclaw.db');
  // db.prepare('SELECT * FROM tasks').all()

  // 新的使用方式:
  const tasks = await pool.query('SELECT * FROM tasks');
  console.log('任务列表:', tasks);

  // 方式 2: 保持向后兼容
  // 可以在 db-lite.ts 中导出一个使用连接池的 db 对象
  /*
  import { getPool } from './middleware/database-pool';
  
  const pool = getPool();
  
  export const db = {
    prepare: (sql: string) => {
      // 返回一个包装的 statement
      return {
        run: (...params: any[]) => pool.execute(sql, params),
        get: (...params: any[]) => pool.queryOne(sql, params),
        all: (...params: any[]) => pool.query(sql, params),
      };
    },
    exec: (sql: string) => pool.execute(sql),
    close: () => pool.close(),
  };
  */

  await pool.close();
}

// ==================== 运行所有示例 ====================

async function runAllExamples() {
  console.log('🚀 SQLite 连接池使用示例\n');
  console.log('='.repeat(50));

  try {
    await example1_BasicConfig();
    await example2_SimpleQuery();
    await example3_Transaction();
    await example4_ConcurrentQueries();
    await example5_CustomTimeout();
    await example6_ErrorHandling();
    await example7_WebFramework();
    await example8_BatchOperations();
    await example9_Monitoring();
    await example10_LegacyIntegration();

    console.log('\n✅ 所有示例运行完成!\n');
  } catch (error) {
    console.error('\n❌ 示例运行失败:', error);
  }
}

// 如果直接运行此文件
if (require.main === module) {
  runAllExamples();
}

// 导出示例函数供测试使用
export {
  example1_BasicConfig,
  example2_SimpleQuery,
  example3_Transaction,
  example4_ConcurrentQueries,
  example5_CustomTimeout,
  example6_ErrorHandling,
  example7_WebFramework,
  example8_BatchOperations,
  example9_Monitoring,
  example10_LegacyIntegration,
  runAllExamples,
};
