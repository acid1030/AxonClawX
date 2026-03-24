# SQLite 连接池管理模块

## 📋 概述

`database-pool.ts` 是一个功能完整的 SQLite 连接池实现，提供连接管理、自动重连和查询超时功能。

## ✨ 核心功能

### 1. 连接池管理
- 维护固定数量的数据库连接
- 智能分配和回收连接
- 支持并发查询
- 等待队列机制

### 2. 自动重连
- 连接健康检查
- 失效连接自动重建
- 空闲连接超时回收
- 重连次数统计

### 3. 查询超时
- 可配置的查询超时时间
- 防止长时间阻塞
- 超时统计和监控
- 支持自定义超时

## 📦 安装

项目已包含 `better-sqlite3` 依赖，无需额外安装。

## 🚀 快速开始

### 基础用法

```typescript
import { getPool, query, execute } from './middleware/database-pool';

// 获取连接池 (单例)
const pool = getPool({
  dbPath: './data/app.db',
  poolSize: 10,
});

// 简单查询
const users = await query('SELECT * FROM users WHERE age > ?', [20]);

// 插入数据
const result = await execute(
  'INSERT INTO users (name, email) VALUES (?, ?)',
  ['Alice', 'alice@example.com']
);

// 关闭池子
await pool.close();
```

### 事务处理

```typescript
import { transaction } from './middleware/database-pool';

const result = await transaction(async (db) => {
  // 在事务中执行多个操作
  db.prepare('UPDATE accounts SET balance = balance - ? WHERE id = ?').run(100, 1);
  db.prepare('UPDATE accounts SET balance = balance + ? WHERE id = ?').run(100, 2);
  
  return { success: true };
});
```

## ⚙️ 配置选项

```typescript
interface PoolConfig {
  /** 数据库文件路径 (默认: ./axonclaw.db) */
  dbPath?: string;
  
  /** 连接池大小 (默认: 10) */
  poolSize?: number;
  
  /** 获取连接超时时间 ms (默认: 5000) */
  acquireTimeout?: number;
  
  /** 查询超时时间 ms (默认: 30000) */
  queryTimeout?: number;
  
  /** 连接健康检查间隔 ms (默认: 60000) */
  healthCheckInterval?: number;
  
  /** 连接最大空闲时间 ms (默认: 300000) */
  idleTimeout?: number;
  
  /** 是否启用 WAL 模式 (默认: true) */
  enableWAL?: boolean;
  
  /** 是否启用外键约束 (默认: true) */
  enableForeignKeys?: boolean;
}
```

## 📖 API 文档

### 类：DatabasePool

#### 构造函数

```typescript
const pool = new DatabasePool(config?: PoolConfig);
```

#### 方法

| 方法 | 描述 | 返回值 |
|------|------|--------|
| `getConnection()` | 获取一个可用连接 | `Promise<PooledConnection>` |
| `releaseConnection(conn)` | 释放连接回池子 | `void` |
| `query(sql, params, options)` | 执行查询 | `Promise<T[]>` |
| `queryOne(sql, params, options)` | 执行查询并返回第一条 | `Promise<T \| undefined>` |
| `execute(sql, params, options)` | 执行写操作 | `Promise<{changes, lastInsertRowid}>` |
| `transaction(fn, options)` | 执行事务 | `Promise<T>` |
| `getStats()` | 获取池子统计 | `PoolStats` |
| `close()` | 关闭池子 | `Promise<void>` |

### 便捷函数

```typescript
// 查询多条
const results = await query<T>('SELECT * FROM table WHERE id > ?', [100]);

// 查询单条
const user = await queryOne<User>('SELECT * FROM users WHERE id = ?', [1]);

// 执行写操作
const result = await execute('DELETE FROM logs WHERE created_at < ?', [date]);

// 事务
const result = await transaction(async (db) => {
  // ...
});
```

### 统计信息

```typescript
const stats = pool.getStats();
console.log(stats);
// {
//   totalSize: 10,        // 池子总大小
//   available: 7,         // 可用连接数
//   inUse: 3,             // 正在使用的连接数
//   waiting: 0,           // 等待队列长度
//   totalCreated: 12,     // 累计创建连接数
//   totalClosed: 2,       // 累计关闭连接数
//   queryTimeouts: 0,     // 查询超时次数
//   reconnections: 1,     // 重连次数
// }
```

## 🛡️ 错误处理

### PoolError 类型

```typescript
import { PoolError } from './middleware/database-pool';

try {
  await query('SELECT * FROM large_table');
} catch (error) {
  if (error instanceof PoolError) {
    switch (error.code) {
      case 'POOL_EXHAUSTED':
        console.error('连接池耗尽');
        break;
      case 'CONNECTION_LOST':
        console.error('连接丢失');
        break;
      case 'QUERY_TIMEOUT':
        console.error('查询超时');
        break;
      case 'POOL_CLOSED':
        console.error('连接池已关闭');
        break;
    }
  }
}
```

## 📊 监控示例

```typescript
// 定期监控池子状态
setInterval(() => {
  const stats = pool.getStats();
  const usageRate = ((stats.totalSize - stats.available) / stats.totalSize * 100).toFixed(2);
  
  console.log(`[DB-Monitor] 使用率：${usageRate}% | 等待：${stats.waiting} | 超时：${stats.queryTimeouts}`);
  
  // 告警
  if (stats.waiting > 10) {
    console.warn('[DB-Monitor] 警告：等待队列过长!');
  }
  if (stats.queryTimeouts > 100) {
    console.warn('[DB-Monitor] 警告：查询超时过多!');
  }
}, 5000);
```

## 🔌 与 Web 框架集成

### Express

```typescript
import express from 'express';
import { query, execute, transaction } from './middleware/database-pool';

const app = express();

// 列表 API
app.get('/api/users', async (req, res) => {
  try {
    const users = await query('SELECT * FROM users');
    res.json({ success: true, data: users });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 创建 API
app.post('/api/users', async (req, res) => {
  try {
    const { name, email } = req.body;
    const result = await execute(
      'INSERT INTO users (name, email) VALUES (?, ?)',
      [name, email]
    );
    res.json({ success: true, id: result.lastInsertRowid });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 优雅关闭
process.on('SIGTERM', async () => {
  await getPool().close();
  process.exit(0);
});
```

### Koa

```typescript
import Koa from 'koa';
import { getPool } from './middleware/database-pool';

const app = new Koa();

// 中间件：注入数据库连接
app.use(async (ctx, next) => {
  const pool = getPool();
  ctx.db = pool;
  
  try {
    await next();
  } catch (error) {
    ctx.status = 500;
    ctx.body = { error: error.message };
  }
});

app.use(async (ctx) => {
  const users = await ctx.db.query('SELECT * FROM users');
  ctx.body = { data: users };
});
```

## 🎯 最佳实践

### 1. 使用事务批量操作

```typescript
// ❌ 慢：逐条插入
for (const item of items) {
  await execute('INSERT INTO table (value) VALUES (?)', [item.value]);
}

// ✅ 快：事务批量插入
await transaction(async (db) => {
  const insert = db.prepare('INSERT INTO table (value) VALUES (?)');
  for (const item of items) {
    insert.run(item.value);
  }
});
```

### 2. 合理设置连接池大小

```typescript
// 根据并发量调整
const poolSize = Math.ceil(os.cpus().length * 1.5);

const pool = getPool({
  poolSize: poolSize,
  acquireTimeout: 3000,
});
```

### 3. 避免长时间占用连接

```typescript
// ❌ 错误：忘记释放连接
const conn = await pool.getConnection();
const result = conn.db.prepare('SELECT * FROM table').all();
// 忘记 releaseConnection

// ✅ 正确：使用便捷函数
const result = await query('SELECT * FROM table');

// ✅ 正确：手动管理时确保释放
const conn = await pool.getConnection();
try {
  const result = conn.db.prepare('SELECT * FROM table').all();
  return result;
} finally {
  pool.releaseConnection(conn);
}
```

### 4. 设置合理的超时时间

```typescript
// 读操作：较短超时
const users = await query('SELECT * FROM users', [], { timeout: 5000 });

// 写操作：较长超时
await execute('CREATE INDEX idx_name ON users(name)', [], { timeout: 30000 });

// 批量操作：更长超时
await transaction(async (db) => {
  // ... 大量数据处理
}, { timeout: 60000 });
```

## 📝 示例代码

完整示例请查看：
- `database-pool.example.ts` - 10 个使用示例
- 运行示例：`uv run ts-node src/middleware/database-pool.example.ts`

## 🔧 与 db-lite.ts 集成

可以将现有的 `db-lite.ts` 迁移到连接池：

```typescript
// db-lite.ts
import { getPool } from './middleware/database-pool';

const pool = getPool();

// 保持原有 API
export const tasks = {
  create: (t: any) => {
    return pool.execute(
      'INSERT INTO tasks(title,description,status,priority) VALUES(?,?,?,?)',
      [t.title, t.description, t.status, t.priority]
    );
  },
  getAll: () => pool.query('SELECT * FROM tasks'),
  // ... 其他方法
};

export const db = {
  prepare: (sql: string) => ({
    run: (...params: any[]) => pool.execute(sql, params),
    get: (...params: any[]) => pool.queryOne(sql, params),
    all: (...params: any[]) => pool.query(sql, params),
  }),
};
```

## 📈 性能建议

1. **启用 WAL 模式**: 默认已启用，提高并发性能
2. **批量操作使用事务**: 减少磁盘 I/O
3. **合理设置池大小**: 根据并发量调整
4. **监控池子状态**: 及时发现性能瓶颈
5. **避免长查询**: 使用超时保护

## ⚠️ 注意事项

1. **连接池是单例**: 多次调用 `getPool()` 返回同一个实例
2. **优雅关闭**: 应用退出前调用 `pool.close()`
3. **异常处理**: 事务失败会自动回滚
4. **并发安全**: 连接池是线程安全的

---

**作者:** KAEL  
**版本:** 1.0.0  
**最后更新:** 2026-03-13
