# 数据库迁移工具技能 (Migrate Utils Skill)

**模块路径:** `src/skills/migrate-utils-skill.ts`

---

## 📋 功能概览

| 功能 | 描述 |
|------|------|
| **迁移文件生成** | 自动创建带时间戳的 SQL 迁移文件 |
| **迁移执行** | 按顺序执行所有待处理的迁移 |
| **迁移回滚** | 回滚最后一次或指定版本的迁移 |
| **状态追踪** | 记录迁移历史，查看当前版本 |

---

## 🚀 快速开始

### 1. 基础使用

```typescript
import { MigrationManager } from './src/skills/migrate-utils-skill';

// 创建迁移管理器
const manager = new MigrationManager({
  dbPath: './axonclaw.db',
  migrationsDir: './migrations'
});

// 执行所有待处理的迁移
await manager.migrate();

// 查看迁移状态
const status = await manager.getStatus();
console.log(`当前版本：${status.currentVersion}`);
console.log(`待执行迁移：${status.pending.length}`);

// 关闭连接
manager.close();
```

### 2. 便捷函数

```typescript
import { quickMigrate, quickRollback } from './src/skills/migrate-utils-skill';

// 一键执行迁移
const result = await quickMigrate('./axonclaw.db');
console.log(`执行了 ${result.migrations.length} 个迁移`);

// 一键回滚
const rollbackResult = await quickRollback('./axonclaw.db');
console.log(`回滚了 ${rollbackResult.migrations.length} 个迁移`);
```

---

## 📖 详细用法

### 生成迁移文件

#### 创建空迁移

```typescript
await manager.createMigration('create_users_table');
// 生成文件：./migrations/1710342000000_create_users_table.sql
```

#### 创建带 SQL 的迁移

```typescript
await manager.createMigration(
  'add_email_column',
  'ALTER TABLE users ADD COLUMN email TEXT;',
  'ALTER TABLE users DROP COLUMN email;'
);
```

#### 生成的文件结构

```sql
-- Migration: add_email_column
-- Generated at: 2026-03-13T10:00:00.000Z

-- ====== UP ======
ALTER TABLE users ADD COLUMN email TEXT;

-- ====== DOWN ======
ALTER TABLE users DROP COLUMN email;
```

### 执行迁移

#### 执行所有待处理迁移

```typescript
const result = await manager.migrate();

if (result.success) {
  console.log(`✅ 成功执行 ${result.migrations.length} 个迁移`);
  console.log('迁移列表:', result.migrations);
} else {
  console.error('❌ 迁移失败:', result.error);
}
```

#### 执行单个迁移

```typescript
const result = await manager.migrateSingle('1710342000000_create_users_table');
```

### 回滚迁移

#### 回滚最后一次迁移

```typescript
const result = await manager.rollback();

if (result.success) {
  console.log(`✅ 成功回滚 ${result.migrations.length} 个迁移`);
} else {
  console.error('❌ 回滚失败:', result.error);
}
```

#### 回滚到指定版本

```typescript
// 回滚到 create_users_table 之后的所有迁移
const result = await manager.rollbackTo('1710342000000_create_users_table');
```

#### 回滚单个迁移

```typescript
const result = await manager.rollbackSingle('1710342000000_add_email_column');
```

### 查看迁移状态

#### 获取完整状态

```typescript
const status = await manager.getStatus();

console.log('===== 迁移状态 =====');
console.log(`当前版本：${status.currentVersion || '无'}`);
console.log(`已执行迁移：${status.executed.length}`);
console.log(`待执行迁移：${status.pending.length}`);

// 查看已执行的迁移
status.executed.forEach(m => {
  console.log(`  - ${m.name} (执行于：${m.executed_at})`);
});

// 查看待执行的迁移
status.pending.forEach(m => {
  console.log(`  - ${m.name} (文件：${m.path})`);
});
```

#### 查看迁移历史

```typescript
const history = manager.getHistory(5); // 最近 5 条记录
history.forEach(m => {
  console.log(`${m.id}. ${m.name} - ${m.executed_at}`);
});
```

#### 检查迁移是否已执行

```typescript
const isExecuted = manager.isExecuted('1710342000000_create_users_table');
console.log(`迁移已执行：${isExecuted}`);
```

---

## 🔧 配置选项

### MigrationConfig

```typescript
interface MigrationConfig {
  /** 数据库路径 (默认：./axonclaw.db) */
  dbPath?: string;
  
  /** 迁移文件目录 (默认：./migrations) */
  migrationsDir?: string;
  
  /** 迁移表名 (默认：migrations) */
  tableName?: string;
}
```

### 自定义配置示例

```typescript
const manager = new MigrationManager({
  dbPath: './data/production.db',
  migrationsDir: './database/migrations',
  tableName: 'schema_migrations'
});
```

---

## 📁 迁移文件命名规范

迁移文件遵循以下命名格式：

```
{timestamp}_{name}.sql
```

- **timestamp**: 13 位时间戳 (Date.now())
- **name**: 迁移名称 (仅允许字母、数字、下划线)

**示例:**
```
1710342000000_create_users_table.sql
1710342001000_add_email_column.sql
1710342002000_create_posts_table.sql
```

---

## 🎯 实际应用场景

### 场景 1: 项目初始化

```typescript
// 1. 创建迁移管理器
const manager = new MigrationManager();

// 2. 创建初始表结构
await manager.createMigration(
  'create_users_table',
  `CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE,
    created_at TEXT DEFAULT (datetime('now'))
  );`
);

await manager.createMigration(
  'create_tasks_table',
  `CREATE TABLE tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    user_id INTEGER,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );`
);

// 3. 执行迁移
await manager.migrate();
```

### 场景 2: 添加新功能

```typescript
// 为新功能添加字段
await manager.createMigration(
  'add_user_avatar',
  'ALTER TABLE users ADD COLUMN avatar_url TEXT;',
  'ALTER TABLE users DROP COLUMN avatar_url;'
);

await manager.migrate();
```

### 场景 3: 版本回滚

```typescript
// 发现新版本有问题，回滚到最后一次稳定版本
const status = await manager.getStatus();
const stableVersion = status.executed[status.executed.length - 2].name;

await manager.rollbackTo(stableVersion);
console.log(`✅ 已回滚到稳定版本：${stableVersion}`);
```

### 场景 4: CI/CD 集成

```typescript
// deploy.ts
import { MigrationManager } from './src/skills/migrate-utils-skill';

async function deploy() {
  const manager = new MigrationManager({
    dbPath: process.env.DB_PATH || './production.db'
  });

  try {
    console.log('🚀 开始执行数据库迁移...');
    const result = await manager.migrate();
    
    if (result.success) {
      console.log('✅ 部署成功!');
      process.exit(0);
    } else {
      console.error('❌ 部署失败:', result.error);
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ 未知错误:', error);
    process.exit(1);
  } finally {
    manager.close();
  }
}

deploy();
```

---

## ⚠️ 注意事项

### 1. 事务安全

- 所有迁移操作都在事务中执行
- 失败时自动回滚，保证数据一致性
- 建议为每个迁移提供 DOWN SQL 以便回滚

### 2. 迁移顺序

- 迁移按时间戳顺序执行
- 确保迁移文件的时间戳正确
- 不要手动修改已执行的迁移文件

### 3. 生产环境

```typescript
// 生产环境建议
const manager = new MigrationManager({
  dbPath: process.env.PRODUCTION_DB_PATH,
  migrationsDir: path.join(__dirname, '../migrations')
});

// 执行前备份
manager.getDatabase().backup('./backup.db');

// 执行迁移
const result = await manager.migrate();

// 验证结果
if (!result.success) {
  // 自动回滚
  await manager.rollback();
}
```

### 4. 错误处理

```typescript
try {
  const result = await manager.migrate();
  if (!result.success) {
    console.error('迁移失败:', result.error);
    // 记录错误日志
    // 发送告警通知
  }
} catch (error) {
  console.error('未知错误:', error);
}
```

---

## 📊 API 参考

### MigrationManager 类

| 方法 | 描述 | 返回值 |
|------|------|--------|
| `createMigration(name, upSql?, downSql?)` | 创建迁移文件 | `Promise<string>` 文件路径 |
| `migrate()` | 执行所有待处理迁移 | `Promise<MigrationResult>` |
| `migrateSingle(name)` | 执行单个迁移 | `Promise<MigrationResult>` |
| `rollback()` | 回滚最后一次迁移 | `Promise<MigrationResult>` |
| `rollbackTo(name)` | 回滚到指定版本 | `Promise<MigrationResult>` |
| `rollbackSingle(name)` | 回滚单个迁移 | `Promise<MigrationResult>` |
| `getStatus()` | 获取迁移状态 | `Promise<MigrationStatus>` |
| `getHistory(limit?)` | 获取迁移历史 | `MigrationRecord[]` |
| `isExecuted(name)` | 检查迁移是否已执行 | `boolean` |
| `getDatabase()` | 获取数据库连接 | `Database` |
| `getMigrationsDir()` | 获取迁移目录 | `string` |
| `close()` | 关闭数据库连接 | `void` |

### 便捷函数

| 函数 | 描述 | 返回值 |
|------|------|--------|
| `createMigrationManager(config?)` | 创建管理器实例 | `MigrationManager` |
| `quickMigrate(dbPath?)` | 快速执行迁移 | `Promise<MigrationResult>` |
| `quickRollback(dbPath?)` | 快速回滚迁移 | `Promise<MigrationResult>` |

---

## 🧪 测试示例

```typescript
import { MigrationManager } from './src/skills/migrate-utils-skill';
import * as fs from 'fs';
import * as path from 'path';

describe('MigrationManager', () => {
  let manager: MigrationManager;
  const testDbPath = './test.db';

  beforeEach(() => {
    manager = new MigrationManager({ dbPath: testDbPath });
  });

  afterEach(() => {
    manager.close();
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  test('应该创建迁移文件', async () => {
    const filePath = await manager.createMigration('test_migration');
    expect(fs.existsSync(filePath)).toBe(true);
  });

  test('应该执行迁移', async () => {
    await manager.createMigration(
      'create_test_table',
      'CREATE TABLE test (id INTEGER PRIMARY KEY);'
    );

    const result = await manager.migrate();
    expect(result.success).toBe(true);
    expect(result.migrations.length).toBe(1);
  });

  test('应该回滚迁移', async () => {
    await manager.createMigration(
      'create_test_table',
      'CREATE TABLE test (id INTEGER PRIMARY KEY);',
      'DROP TABLE test;'
    );

    await manager.migrate();
    const rollbackResult = await manager.rollback();

    expect(rollbackResult.success).toBe(true);
    expect(rollbackResult.migrations.length).toBe(1);
  });

  test('应该获取迁移状态', async () => {
    const status = await manager.getStatus();
    expect(status).toHaveProperty('executed');
    expect(status).toHaveProperty('pending');
    expect(status).toHaveProperty('currentVersion');
  });
});
```

---

## 📝 更新日志

### v1.0.0 (2026-03-13)
- ✅ 初始版本发布
- ✅ 支持迁移文件生成
- ✅ 支持迁移执行/回滚
- ✅ 支持迁移状态追踪
- ✅ 事务安全保障
- ✅ 完整的 TypeScript 类型定义

---

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request！

**开发环境设置:**
```bash
# 克隆项目
git clone <repo-url>

# 安装依赖
npm install

# 运行测试
npm test

# 运行示例
npx ts-node examples/migration-example.ts
```

---

## 📄 许可证

MIT License

---

**维护者:** AxonClaw Team  
**最后更新:** 2026-03-13
