# 数据库迁移工具 - 快速开始指南

**5 分钟上手数据库迁移管理**

---

## 🎯 一分钟速览

```typescript
import { MigrationManager } from './src/skills/migrate-utils-skill';

const manager = new MigrationManager();

// 1. 创建迁移
await manager.createMigration('create_users', 'CREATE TABLE users (...);', 'DROP TABLE users;');

// 2. 执行迁移
await manager.migrate();

// 3. 查看状态
const status = await manager.getStatus();

// 4. 回滚 (如果需要)
await manager.rollback();
```

---

## 📦 安装

无需额外安装，模块已内置于 `src/skills/migrate-utils-skill.ts`

**依赖:**
- `better-sqlite3` (项目已有依赖)

---

## 🚀 三步开始

### Step 1: 初始化

```typescript
import { MigrationManager } from './src/skills/migrate-utils-skill';

const manager = new MigrationManager({
  dbPath: './myapp.db',      // 数据库文件路径
  migrationsDir: './migrations' // 迁移文件目录
});
```

### Step 2: 创建迁移

```typescript
// 方式 1: 创建空迁移 (手动编辑 SQL)
await manager.createMigration('add_new_feature');

// 方式 2: 创建带 SQL 的迁移
await manager.createMigration(
  'create_products_table',
  `
  CREATE TABLE products (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    price REAL
  );
  `,
  'DROP TABLE products;'
);
```

### Step 3: 执行迁移

```typescript
const result = await manager.migrate();

if (result.success) {
  console.log('✅ 迁移成功!');
} else {
  console.error('❌ 迁移失败:', result.error);
}
```

---

## 📁 迁移文件结构

创建迁移后，会在 `migrations` 目录下生成文件：

```
migrations/
├── 1710342000000_create_users_table.sql
├── 1710342001000_create_products_table.sql
└── 1710342002000_add_indexes.sql
```

**文件内容示例:**

```sql
-- Migration: create_products_table
-- Generated at: 2026-03-13T10:00:00.000Z

-- ====== UP ======
CREATE TABLE products (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  price REAL
);

-- ====== DOWN ======
DROP TABLE products;
```

---

## 🔄 常用操作

### 执行迁移

```typescript
// 执行所有待处理的迁移
await manager.migrate();

// 执行单个迁移
await manager.migrateSingle('1710342000000_create_users_table');
```

### 回滚迁移

```typescript
// 回滚最后一次迁移
await manager.rollback();

// 回滚到指定版本
await manager.rollbackTo('1710342000000_create_users_table');

// 回滚单个迁移
await manager.rollbackSingle('1710342001000_create_products_table');
```

### 查看状态

```typescript
const status = await manager.getStatus();

console.log('当前版本:', status.currentVersion);
console.log('已执行:', status.executed.length);
console.log('待执行:', status.pending.length);
```

---

## 💡 实用技巧

### 技巧 1: 使用便捷函数

```typescript
import { quickMigrate, quickRollback } from './src/skills/migrate-utils-skill';

// 一行代码执行迁移
await quickMigrate('./myapp.db');

// 一行代码回滚
await quickRollback('./myapp.db');
```

### 技巧 2: 检查迁移状态

```typescript
// 检查是否已执行
const isExecuted = manager.isExecuted('1710342000000_create_users_table');

// 获取历史记录
const history = manager.getHistory(10); // 最近 10 条
```

### 技巧 3: 批量创建迁移

```typescript
const migrations = [
  { name: 'create_users', up: 'CREATE TABLE...', down: 'DROP TABLE...' },
  { name: 'create_posts', up: 'CREATE TABLE...', down: 'DROP TABLE...' },
  { name: 'create_comments', up: 'CREATE TABLE...', down: 'DROP TABLE...' }
];

for (const m of migrations) {
  await manager.createMigration(m.name, m.up, m.down);
}

await manager.migrate(); // 一次性执行所有
```

---

## ⚠️ 注意事项

### ✅ 推荐做法

1. **始终提供 DOWN SQL** - 方便回滚
2. **小步提交** - 每个迁移只做一件事
3. **测试迁移** - 在开发环境先测试
4. **备份数据库** - 生产环境执行前备份

### ❌ 避免做法

1. **修改已执行的迁移** - 会导致不一致
2. **手动改时间戳** - 破坏迁移顺序
3. **跳过 DOWN SQL** - 无法回滚
4. **大迁移** - 难以调试和回滚

---

## 🎓 完整示例

```typescript
import { MigrationManager } from './src/skills/migrate-utils-skill';

async function setupDatabase() {
  const manager = new MigrationManager();

  try {
    // 创建用户表
    await manager.createMigration(
      'create_users_table',
      `
      CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        email TEXT NOT NULL UNIQUE,
        created_at TEXT DEFAULT (datetime('now'))
      );
      `,
      'DROP TABLE users;'
    );

    // 创建文章表
    await manager.createMigration(
      'create_posts_table',
      `
      CREATE TABLE posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        content TEXT,
        user_id INTEGER,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
      `,
      'DROP TABLE posts;'
    );

    // 添加索引
    await manager.createMigration(
      'add_indexes',
      `
      CREATE INDEX idx_posts_user_id ON posts(user_id);
      CREATE INDEX idx_users_email ON users(email);
      `,
      `
      DROP INDEX idx_posts_user_id;
      DROP INDEX idx_users_email;
      `
    );

    // 执行所有迁移
    const result = await manager.migrate();

    if (result.success) {
      console.log('✅ 数据库初始化完成!');
      console.log(`   执行了 ${result.migrations.length} 个迁移`);
    } else {
      console.error('❌ 数据库初始化失败:', result.error);
    }

  } catch (error) {
    console.error('💥 发生错误:', error);
  } finally {
    manager.close();
  }
}

setupDatabase();
```

---

## 📚 更多资源

- **完整文档:** `MIGRATE-README.md`
- **使用示例:** `migrate-utils-examples.ts`
- **源代码:** `src/skills/migrate-utils-skill.ts`

---

## ❓ 常见问题

### Q: 迁移文件放在哪里？
A: 默认在 `./migrations` 目录，可通过配置自定义。

### Q: 如何知道当前数据库版本？
A: 使用 `getStatus()` 查看 `currentVersion`。

### Q: 迁移失败怎么办？
A: 自动回滚，修复 SQL 后重新执行。

### Q: 可以在生产环境使用吗？
A: 可以，建议先备份再执行。

---

**开始使用吧!** 🚀

如有问题，请查阅完整文档或查看示例代码。
