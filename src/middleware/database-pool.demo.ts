/**
 * SQLite 连接池快速验证脚本
 * 
 * 运行：uv run ts-node src/middleware/database-pool.demo.ts
 */

import { DatabasePool, query, execute, transaction } from './database-pool';
import * as path from 'path';

const DEMO_DB = path.join(__dirname, '../../demo-db.sqlite');

async function demo() {
  console.log('🚀 SQLite 连接池快速验证\n');

  // 1. 创建连接池
  console.log('1️⃣  创建连接池...');
  const pool = new DatabasePool({
    dbPath: DEMO_DB,
    poolSize: 5,
    queryTimeout: 10000,
  });
  console.log('   ✅ 连接池创建成功\n');

  // 2. 创建表
  console.log('2️⃣  创建测试表...');
  await execute(`
    CREATE TABLE IF NOT EXISTS demo_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE,
      age INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log('   ✅ 表创建成功\n');

  // 3. 插入数据
  console.log('3️⃣  插入测试数据...');
  const result = await execute(
    'INSERT INTO demo_users (name, email, age) VALUES (?, ?, ?)',
    ['张三', 'zhangsan@example.com', 28]
  );
  console.log(`   ✅ 插入成功，ID: ${result.lastInsertRowid}\n`);

  // 4. 查询数据
  console.log('4️⃣  查询数据...');
  const users = await query('SELECT * FROM demo_users');
  console.log('   查询结果:', JSON.stringify(users, null, 2));
  console.log();

  // 5. 事务示例
  console.log('5️⃣  事务示例...');
  await transaction(async (db) => {
    db.prepare('INSERT INTO demo_users (name, email, age) VALUES (?, ?, ?)').run(
      '李四',
      'lisi@example.com',
      32
    );
    db.prepare('UPDATE demo_users SET age = ? WHERE name = ?').run(29, '张三');
  });
  console.log('   ✅ 事务执行成功\n');

  // 6. 并发查询
  console.log('6️⃣  并发查询测试...');
  const promises = Array.from({ length: 3 }, (_, i) =>
    execute('INSERT INTO demo_users (name, email, age) VALUES (?, ?, ?)', [
      `用户${i + 1}`,
      `user${i + 1}@example.com`,
      20 + i,
    ])
  );
  await Promise.all(promises);
  console.log('   ✅ 并发插入 3 条数据成功\n');

  // 7. 查看统计
  console.log('7️⃣  连接池统计...');
  const stats = pool.getStats();
  console.log('   统计信息:', JSON.stringify(stats, null, 2));
  console.log();

  // 8. 最终查询
  console.log('8️⃣  最终数据...');
  const allUsers = await query('SELECT * FROM demo_users ORDER BY id');
  console.log(`   共有 ${allUsers.length} 条记录:`);
  allUsers.forEach((u: any) => {
    console.log(`   - ${u.name} (${u.email}), ${u.age}岁`);
  });
  console.log();

  // 清理
  await pool.close();
  console.log('✅ 验证完成!\n');
}

// 运行演示
demo().catch(console.error);
