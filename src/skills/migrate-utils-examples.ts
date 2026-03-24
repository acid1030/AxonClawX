/**
 * 数据库迁移工具使用示例
 * 
 * 本文件展示 migrate-utils-skill 的各种使用场景
 */

import { MigrationManager, createMigrationManager, quickMigrate } from './migrate-utils-skill';
import * as path from 'path';

// ============================================================================
// 示例 1: 基础使用 - 创建并执行迁移
// ============================================================================

async function example1_basic() {
  console.log('\n===== 示例 1: 基础使用 =====\n');

  const manager = new MigrationManager({
    dbPath: './example.db',
    migrationsDir: './migrations'
  });

  // 创建迁移
  await manager.createMigration(
    'create_users_table',
    `
    CREATE TABLE users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE,
      created_at TEXT DEFAULT (datetime('now'))
    );
    `,
    'DROP TABLE users;'
  );

  // 执行迁移
  const result = await manager.migrate();
  console.log('迁移结果:', result);

  // 查看状态
  const status = await manager.getStatus();
  console.log('当前版本:', status.currentVersion);
  console.log('已执行迁移:', status.executed.length);

  manager.close();
}

// ============================================================================
// 示例 2: 多步骤迁移 - 构建完整数据库架构
// ============================================================================

async function example2_multiStep() {
  console.log('\n===== 示例 2: 多步骤迁移 =====\n');

  const manager = new MigrationManager();

  // 迁移 1: 用户表
  await manager.createMigration(
    'create_users_table',
    `
    CREATE TABLE users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );
    `,
    'DROP TABLE users;'
  );

  // 迁移 2: 任务表
  await manager.createMigration(
    'create_tasks_table',
    `
    CREATE TABLE tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT DEFAULT 'pending',
      priority TEXT DEFAULT 'medium',
      user_id INTEGER,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
    `,
    'DROP TABLE tasks;'
  );

  // 迁移 3: 添加索引
  await manager.createMigration(
    'add_indexes',
    `
    CREATE INDEX idx_tasks_user_id ON tasks(user_id);
    CREATE INDEX idx_tasks_status ON tasks(status);
    CREATE INDEX idx_users_email ON users(email);
    `,
    `
    DROP INDEX idx_tasks_user_id;
    DROP INDEX idx_tasks_status;
    DROP INDEX idx_users_email;
    `
  );

  // 一次性执行所有迁移
  const result = await manager.migrate();
  console.log(`✅ 执行了 ${result.migrations.length} 个迁移`);
  console.log('迁移列表:', result.migrations);

  manager.close();
}

// ============================================================================
// 示例 3: 版本回滚 - 回到稳定版本
// ============================================================================

async function example3_rollback() {
  console.log('\n===== 示例 3: 版本回滚 =====\n');

  const manager = new MigrationManager();

  // 查看当前状态
  const status = await manager.getStatus();
  console.log('当前版本:', status.currentVersion);
  console.log('已执行迁移:', status.executed.length);

  // 回滚最后一次迁移
  console.log('\n回滚最后一次迁移...');
  const rollbackResult = await manager.rollback();
  console.log('回滚结果:', rollbackResult);

  // 或者回滚到指定版本
  if (status.executed.length > 2) {
    const targetVersion = status.executed[0].name; // 回到第一个版本
    console.log(`\n回滚到版本：${targetVersion}`);
    const result = await manager.rollbackTo(targetVersion);
    console.log('回滚结果:', result);
  }

  manager.close();
}

// ============================================================================
// 示例 4: 迁移历史查询
// ============================================================================

async function example4_history() {
  console.log('\n===== 示例 4: 迁移历史查询 =====\n');

  const manager = new MigrationManager();

  // 获取完整状态
  const status = await manager.getStatus();

  console.log('\n📊 迁移状态报告');
  console.log('================');
  console.log(`当前版本：${status.currentVersion || '无'}`);
  console.log(`已执行：${status.executed.length}`);
  console.log(`待执行：${status.pending.length}`);

  // 显示已执行的迁移
  if (status.executed.length > 0) {
    console.log('\n✅ 已执行的迁移:');
    status.executed.forEach((m, i) => {
      console.log(`  ${i + 1}. ${m.name}`);
      console.log(`     执行时间：${m.executed_at}`);
    });
  }

  // 显示待执行的迁移
  if (status.pending.length > 0) {
    console.log('\n⏳ 待执行的迁移:');
    status.pending.forEach((m, i) => {
      console.log(`  ${i + 1}. ${m.name}`);
      console.log(`     文件路径：${m.path}`);
    });
  }

  // 获取最近 5 条历史记录
  const history = manager.getHistory(5);
  console.log('\n📜 最近迁移历史:');
  history.forEach(m => {
    console.log(`  [${m.id}] ${m.name} - ${m.executed_at}`);
  });

  manager.close();
}

// ============================================================================
// 示例 5: 检查迁移状态
// ============================================================================

async function example5_checkStatus() {
  console.log('\n===== 示例 5: 检查迁移状态 =====\n');

  const manager = new MigrationManager();

  // 检查特定迁移是否已执行
  const migrations = [
    'create_users_table',
    'create_tasks_table',
    'add_indexes'
  ];

  for (const name of migrations) {
    // 查找包含该名称的迁移
    const status = await manager.getStatus();
    const executed = status.executed.find(m => m.name.includes(name));
    
    if (executed) {
      console.log(`✅ ${name}: 已执行 (${executed.executed_at})`);
    } else {
      console.log(`⏳ ${name}: 待执行`);
    }
  }

  manager.close();
}

// ============================================================================
// 示例 6: 使用便捷函数
// ============================================================================

async function example6_quickFunctions() {
  console.log('\n===== 示例 6: 使用便捷函数 =====\n');

  // 快速执行迁移
  console.log('执行迁移...');
  const migrateResult = await quickMigrate('./quick-example.db');
  console.log('迁移结果:', migrateResult);

  // 注意：quickRollback 需要至少有一个已执行的迁移
  // const rollbackResult = await quickRollback('./quick-example.db');
  // console.log('回滚结果:', rollbackResult);
}

// ============================================================================
// 示例 7: 错误处理
// ============================================================================

async function example7_errorHandling() {
  console.log('\n===== 示例 7: 错误处理 =====\n');

  const manager = new MigrationManager();

  try {
    // 创建一个有问题的迁移
    await manager.createMigration(
      'bad_migration',
      'INVALID SQL SYNTAX HERE;' // 故意写错的 SQL
    );

    const result = await manager.migrate();

    if (result.success) {
      console.log('✅ 迁移成功');
    } else {
      console.log('❌ 迁移失败');
      console.log('错误信息:', result.error);
      console.log('已执行的迁移:', result.migrations);
    }
  } catch (error) {
    console.error('💥 未知错误:', error);
  } finally {
    manager.close();
  }
}

// ============================================================================
// 示例 8: 生产环境部署脚本
// ============================================================================

async function example8_production() {
  console.log('\n===== 示例 8: 生产环境部署 =====\n');

  const manager = new MigrationManager({
    dbPath: process.env.DB_PATH || './production.db',
    migrationsDir: path.join(__dirname, '../migrations')
  });

  try {
    console.log('🚀 开始数据库迁移...');
    
    // 执行迁移
    const result = await manager.migrate();

    if (result.success) {
      console.log('✅ 迁移成功!');
      console.log(`   执行了 ${result.migrations.length} 个迁移`);
      
      // 显示当前版本
      const status = await manager.getStatus();
      console.log(`   当前版本：${status.currentVersion}`);
    } else {
      console.error('❌ 迁移失败!');
      console.error(`   错误：${result.error}`);
      console.error(`   已执行 ${result.migrations.length} 个迁移`);
      
      // 自动回滚
      console.log('\n🔄 开始自动回滚...');
      const rollbackResult = await manager.rollback();
      
      if (rollbackResult.success) {
        console.log('✅ 回滚成功');
      } else {
        console.error('❌ 回滚失败，需要手动干预!');
      }
    }
  } catch (error) {
    console.error('💥 部署过程中发生错误:', error);
    process.exit(1);
  } finally {
    manager.close();
  }
}

// ============================================================================
// 示例 9: 自定义迁移表名
// ============================================================================

async function example9_customTableName() {
  console.log('\n===== 示例 9: 自定义迁移表名 =====\n');

  const manager = new MigrationManager({
    dbPath: './custom.db',
    migrationsDir: './migrations',
    tableName: 'schema_versions' // 使用自定义表名
  });

  await manager.createMigration('test_migration', 'SELECT 1;');
  const result = await manager.migrate();
  
  console.log('迁移结果:', result);
  
  const status = await manager.getStatus();
  console.log('当前版本:', status.currentVersion);

  manager.close();
}

// ============================================================================
// 示例 10: 批量创建迁移
// ============================================================================

async function example10_batchCreate() {
  console.log('\n===== 示例 10: 批量创建迁移 =====\n');

  const manager = new MigrationManager();

  const migrations = [
    {
      name: 'create_posts_table',
      up: `
        CREATE TABLE posts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          content TEXT,
          user_id INTEGER,
          created_at TEXT DEFAULT (datetime('now')),
          FOREIGN KEY (user_id) REFERENCES users(id)
        );
      `,
      down: 'DROP TABLE posts;'
    },
    {
      name: 'create_comments_table',
      up: `
        CREATE TABLE comments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          content TEXT NOT NULL,
          post_id INTEGER,
          user_id INTEGER,
          created_at TEXT DEFAULT (datetime('now')),
          FOREIGN KEY (post_id) REFERENCES posts(id),
          FOREIGN KEY (user_id) REFERENCES users(id)
        );
      `,
      down: 'DROP TABLE comments;'
    },
    {
      name: 'add_post_tags',
      up: `
        ALTER TABLE posts ADD COLUMN tags TEXT;
      `,
      down: `
        ALTER TABLE posts DROP COLUMN tags;
      `
    }
  ];

  console.log('创建迁移文件...');
  for (const migration of migrations) {
    const filePath = await manager.createMigration(
      migration.name,
      migration.up,
      migration.down
    );
    console.log(`  ✅ ${migration.name} -> ${filePath}`);
  }

  console.log('\n执行所有迁移...');
  const result = await manager.migrate();
  console.log(`✅ 执行了 ${result.migrations.length} 个迁移`);

  manager.close();
}

// ============================================================================
// 运行所有示例
// ============================================================================

async function runAllExamples() {
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║       数据库迁移工具使用示例 (Migrate Utils Examples)    ║');
  console.log('╚══════════════════════════════════════════════════════════╝');

  try {
    await example1_basic();
    await example2_multiStep();
    await example3_rollback();
    await example4_history();
    await example5_checkStatus();
    await example6_quickFunctions();
    await example7_errorHandling();
    await example9_customTableName();
    await example10_batchCreate();
    
    // 示例 8 是生产环境脚本，通常单独运行
    // await example8_production();

    console.log('\n╔══════════════════════════════════════════════════════════╗');
    console.log('║                  所有示例运行完成 ✅                      ║');
    console.log('╚══════════════════════════════════════════════════════════╝\n');
  } catch (error) {
    console.error('运行示例时发生错误:', error);
  }
}

// 如果直接运行此文件
if (require.main === module) {
  runAllExamples();
}

// 导出所有示例函数
export {
  example1_basic,
  example2_multiStep,
  example3_rollback,
  example4_history,
  example5_checkStatus,
  example6_quickFunctions,
  example7_errorHandling,
  example8_production,
  example9_customTableName,
  example10_batchCreate,
  runAllExamples
};
