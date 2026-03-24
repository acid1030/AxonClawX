# 🔗 连接池工具 (Pool Utils)

高效、通用的连接池管理工具，支持连接的创建、复用和回收。

## 📦 安装

无需安装，直接使用：

```typescript
import { ConnectionPool, createPool, createPoolWithValidation } from './src/skills/pool-utils-skill';
```

## 🚀 快速开始

### 最简单的使用方式

```typescript
import { createPool } from './src/skills/pool-utils-skill';

// 创建连接池
const pool = createPool(
  async () => {
    // 创建连接的逻辑
    return new YourResource();
  },
  {
    min: 2,      // 最小连接数
    max: 10      // 最大连接数
  }
);

// 使用连接 (自动管理)
const result = await pool.use(async (conn) => {
  return await conn.resource.doSomething();
});
```

## 📖 API 文档

### 核心类

#### `ConnectionPool<T>`

完整的连接池实现，提供所有功能。

```typescript
const pool = new ConnectionPool<YourResource>(
  {
    create: async () => {/* 创建连接 */},
    validate: async (resource) => {/* 验证连接 */},
    destroy: async (resource) => {/* 销毁连接 */}
  },
  {
    min: 0,              // 最小连接数 (默认：0)
    max: 10,             // 最大连接数 (默认：10)
    idleTimeout: 300000, // 空闲超时 (默认：5 分钟)
    maxLifetime: 1800000,// 最大生命周期 (默认：30 分钟)
    acquireTimeout: 10000,// 获取超时 (默认：10 秒)
    eagerCreate: false   // 预先创建最小连接 (默认：false)
  }
);
```

#### 主要方法

| 方法 | 描述 | 返回值 |
|------|------|--------|
| `acquire()` | 获取连接 | `Promise<Connection<T>>` |
| `release(conn)` | 释放连接回池 | `Promise<void>` |
| `use(fn)` | 自动管理连接生命周期 | `Promise<R>` |
| `getStats()` | 获取池统计信息 | `PoolStats` |
| `close()` | 关闭池并销毁所有连接 | `Promise<void>` |
| `isClosedPool()` | 检查池是否已关闭 | `boolean` |

### 便捷工厂函数

#### `createPool<T>(createFn, config?)`

快速创建简单连接池。

```typescript
const pool = createPool(
  async () => new DatabaseConnection(),
  { min: 2, max: 10 }
);
```

#### `createPoolWithValidation<T>(createFn, validateFn, config?)`

创建带健康检查的连接池。

```typescript
const pool = createPoolWithValidation(
  async () => new DatabaseConnection(),
  async (conn) => await conn.ping(),
  { min: 2, max: 10 }
);
```

## 💡 使用场景

### 1. 数据库连接池

```typescript
const dbPool = createPoolWithValidation(
  async () => await createDBConnection(),
  async (conn) => await conn.ping(),
  { min: 5, max: 20 }
);

// 执行查询
const users = await dbPool.use(async (conn) => {
  return await conn.resource.query('SELECT * FROM users');
});
```

### 2. HTTP 客户端池

```typescript
const httpPool = createPool(
  async () => new HttpClient({ baseURL: 'https://api.example.com' }),
  { min: 1, max: 5, eagerCreate: true }
);

// 并发请求
const [users, posts] = await Promise.all([
  httpPool.use(conn => conn.resource.get('/users')),
  httpPool.use(conn => conn.resource.get('/posts'))
]);
```

### 3. WebSocket 连接池

```typescript
const wsPool = new ConnectionPool(
  {
    create: async () => new WebSocket('wss://realtime.example.com'),
    validate: async (ws) => ws.readyState === WebSocket.OPEN,
    destroy: async (ws) => ws.close()
  },
  { min: 1, max: 3 }
);

await wsPool.use(conn => {
  conn.resource.send(JSON.stringify({ type: 'ping' }));
});
```

### 4. 文件句柄池

```typescript
const filePool = createPool(
  async () => await fs.open('/tmp/cache.db', 'r+'),
  { min: 0, max: 4, idleTimeout: 60000 }
);

await filePool.use(async (conn) => {
  await fs.read(conn.resource, buffer, 0, buffer.length, 0);
});
```

## 📊 监控与调试

### 查看池状态

```typescript
const stats = pool.getStats();
console.log(stats);
// {
//   total: 5,      // 总连接数
//   idle: 3,       // 空闲连接
//   active: 2,     // 活跃连接
//   waiting: 0,    // 等待获取连接的队列长度
//   created: 10,   // 累计创建数
//   destroyed: 5   // 累计销毁数
// }
```

### 优雅关闭

```typescript
// 应用关闭时
process.on('SIGINT', async () => {
  await pool.close();
  console.log('连接池已关闭');
  process.exit(0);
});
```

## ⚠️ 注意事项

1. **始终释放连接**: 使用 `use()` 方法可以自动管理，避免忘记释放
2. **合理设置超时**: 根据业务场景调整 `acquireTimeout`
3. **监控池状态**: 定期检查 `getStats()` 避免连接泄漏
4. **验证连接健康**: 对于数据库等长连接，建议提供 `validate` 函数

## 🧪 运行示例

```bash
cd /Users/nike/.openclaw/workspace
npx ts-node src/skills/pool-utils-examples.ts
```

## 📝 完整示例

查看 [`pool-utils-examples.ts`](./pool-utils-examples.ts) 获取完整的使用示例，包括：
- 数据库连接池
- HTTP 客户端池
- WebSocket 连接池
- 并发控制演示
- 错误处理

---

**创建时间:** 2026-03-13  
**维护者:** KAEL  
**版本:** 1.0.0
