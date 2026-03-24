/**
 * 数据库连接池工具技能 - 使用示例
 * 
 * 本文件展示了 PoolManager 的各种使用场景
 * 
 * @author KAEL
 */

import { getPoolManager, PoolManager } from './pool-utils-skill';

// ==================== 示例 1: 初始化连接池 ====================

async function initConnectionPool() {
  console.log('🔧 初始化连接池...');

  const poolManager = getPoolManager({
    maxConnections: 10,      // 最大连接数
    minConnections: 2,       // 最小连接数
    idleTimeoutMs: 30000,    // 30 秒空闲超时
    connectionTimeoutMs: 5000, // 5 秒连接超时
    queryTimeoutMs: 10000,   // 10 秒查询超时
    retryAttempts: 3,        // 最多重试 3 次
    retryDelayMs: 1000,      // 重试间隔 1 秒
  });

  // 创建主数据库连接池
  await poolManager.createPool('main-db', {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'myapp',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  });

  // 创建只读数据库连接池 (用于查询分离)
  await poolManager.createPool('read-db', {
    host: process.env.DB_READ_HOST || 'localhost',
    port: parseInt(process.env.DB_READ_PORT || '5432'),
    database: process.env.DB_NAME || 'myapp',
    user: process.env.DB_READ_USER || 'postgres_readonly',
    password: process.env.DB_READ_PASSWORD || 'password',
  });

  console.log('✅ 连接池初始化完成');
}

// ==================== 示例 2: 基础 CRUD 操作 ====================

async function basicCRUDOperations() {
  const poolManager = getPoolManager();

  console.log('\n📝 执行基础 CRUD 操作...');

  // CREATE - 创建用户
  const createUser = await poolManager.query(
    'main-db',
    'INSERT INTO users (name, email, age) VALUES ($1, $2, $3) RETURNING *',
    ['张三', 'zhangsan@example.com', 25],
    { timeout: 5000, retry: true }
  );
  console.log('创建用户:', createUser.rows[0]);

  // READ - 查询用户
  const users = await poolManager.query(
    'read-db',  // 使用只读连接池
    'SELECT * FROM users WHERE age > $1 ORDER BY created_at DESC',
    [18],
    { timeout: 5000 }
  );
  console.log('查询到用户数:', users.rows.length);

  // UPDATE - 更新用户
  const updateUser = await poolManager.query(
    'main-db',
    'UPDATE users SET age = $1 WHERE email = $2 RETURNING *',
    [26, 'zhangsan@example.com'],
    { retry: true }
  );
  console.log('更新用户:', updateUser.rows[0]);

  // DELETE - 删除用户
  const deleteUser = await poolManager.query(
    'main-db',
    'DELETE FROM users WHERE email = $1 RETURNING *',
    ['zhangsan@example.com'],
    { retry: true }
  );
  console.log('删除用户:', deleteUser.rows[0]);
}

// ==================== 示例 3: 事务处理 ====================

async function transactionExample() {
  const poolManager = getPoolManager();

  console.log('\n💳 执行事务操作...');

  try {
    await poolManager.transaction('main-db', async (client) => {
      // 场景：银行转账
      const amount = 100;
      const fromAccountId = 1;
      const toAccountId = 2;

      // 检查余额
      const balanceCheck = await client.query(
        'SELECT balance FROM accounts WHERE id = $1',
        [fromAccountId]
      );
      
      if (balanceCheck.rows[0].balance < amount) {
        throw new Error('余额不足');
      }

      // 扣款
      await client.query(
        'UPDATE accounts SET balance = balance - $1 WHERE id = $2',
        [amount, fromAccountId]
      );

      // 收款
      await client.query(
        'UPDATE accounts SET balance = balance + $1 WHERE id = $2',
        [amount, toAccountId]
      );

      // 记录交易日志
      await client.query(
        'INSERT INTO transactions (from_id, to_id, amount, created_at) VALUES ($1, $2, $3, NOW())',
        [fromAccountId, toAccountId, amount]
      );

      console.log('✅ 转账成功');
    });
  } catch (error) {
    console.error('❌ 事务失败:', (error as Error).message);
    // 事务会自动回滚
  }
}

// ==================== 示例 4: 批量操作 ====================

async function batchOperations() {
  const poolManager = getPoolManager();

  console.log('\n📦 执行批量操作...');

  // 批量插入
  const users = [
    ['用户 1', 'user1@example.com', 20],
    ['用户 2', 'user2@example.com', 25],
    ['用户 3', 'user3@example.com', 30],
  ];

  await poolManager.transaction('main-db', async (client) => {
    for (const [name, email, age] of users) {
      await client.query(
        'INSERT INTO users (name, email, age) VALUES ($1, $2, $3)',
        [name, email, age]
      );
    }
  });

  console.log(`✅ 批量插入 ${users.length} 条记录`);
}

// ==================== 示例 5: 连接池监控 ====================

async function monitorPoolStats() {
  const poolManager = getPoolManager();

  console.log('\n📊 连接池监控数据:');

  const stats = poolManager.getStats();

  console.table({
    '总连接数': stats.totalConnections,
    '活跃连接': stats.activeConnections,
    '空闲连接': stats.idleConnections,
    '总查询数': stats.totalQueries,
    '平均查询时间': `${stats.avgQueryTime.toFixed(2)}ms`,
    '错误次数': stats.errorCount,
  });

  // 健康状态判断
  const healthStatus = {
    status: 'healthy',
    issues: [] as string[],
  };

  if (stats.activeConnections > 15) {
    healthStatus.issues.push('活跃连接数过高');
    healthStatus.status = 'warning';
  }

  if (stats.errorCount > 10) {
    healthStatus.issues.push('错误次数过多');
    healthStatus.status = 'critical';
  }

  if (stats.avgQueryTime > 1000) {
    healthStatus.issues.push('平均查询时间过长');
    healthStatus.status = 'warning';
  }

  console.log('健康状态:', healthStatus);
}

// ==================== 示例 6: 错误处理与重试 ====================

async function errorHandlingExample() {
  const poolManager = getPoolManager();

  console.log('\n⚠️ 测试错误处理...');

  try {
    // 模拟超时查询
    await poolManager.query(
      'main-db',
      'SELECT pg_sleep(15)',  // 故意超时
      [],
      { timeout: 5000, retry: false }  // 不重试
    );
  } catch (error) {
    console.error('捕获到超时错误:', (error as Error).message);
  }

  try {
    // 模拟需要重试的查询
    await poolManager.query(
      'main-db',
      'SELECT * FROM non_existent_table',  // 表不存在
      [],
      { timeout: 5000, retry: true }  // 会重试 3 次
    );
  } catch (error) {
    console.error('捕获到查询错误:', (error as Error).message);
  }
}

// ==================== 示例 7: 优雅关闭 ====================

async function gracefulShutdown() {
  const poolManager = getPoolManager();

  console.log('\n🛑 优雅关闭连接池...');

  try {
    // 等待当前查询完成
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // 释放所有连接
    await poolManager.releaseAll();

    console.log('✅ 所有连接池已安全释放');
  } catch (error) {
    console.error('❌ 关闭失败:', (error as Error).message);
  }
}

// ==================== 主函数 - 运行所有示例 ====================

async function main() {
  console.log('🚀 数据库连接池工具技能 - 使用示例\n');
  console.log('='.repeat(50));

  try {
    // 1. 初始化
    await initConnectionPool();

    // 2. 基础 CRUD
    await basicCRUDOperations();

    // 3. 事务处理
    await transactionExample();

    // 4. 批量操作
    await batchOperations();

    // 5. 监控统计
    await monitorPoolStats();

    // 6. 错误处理
    await errorHandlingExample();

    // 7. 优雅关闭
    await gracefulShutdown();

    console.log('\n' + '='.repeat(50));
    console.log('✅ 所有示例执行完成!');
  } catch (error) {
    console.error('\n❌ 执行失败:', (error as Error).message);
    process.exit(1);
  }
}

// 运行示例
if (require.main === module) {
  main().catch(console.error);
}

// 导出示例函数供测试使用
export {
  initConnectionPool,
  basicCRUDOperations,
  transactionExample,
  batchOperations,
  monitorPoolStats,
  errorHandlingExample,
  gracefulShutdown,
  main,
};
