# Multiton Pattern Skill - 使用示例

**作者:** KAEL  
**版本:** 1.0.0  
**文件:** `src/skills/multiton-pattern-skill.ts`

---

## 📖 概述

多例模式 (Multiton Pattern) 是单例模式的泛化，允许为不同的键创建不同的实例，但相同键始终返回同一实例。

**核心特性:**
- ✅ 键控实例管理
- ✅ 线程安全创建
- ✅ 实例池支持
- ✅ 自动回收机制
- ✅ 统计监控

---

## 🚀 快速开始

### 示例 1: 基础多例创建

```typescript
import { getOrCreateMultiton } from './src/skills/multiton-pattern-skill';

// 创建数据库连接多例
const dbPrimary = await getOrCreateMultiton('db-primary', () => {
  console.log('创建主数据库连接...');
  return new DatabaseConnection('primary');
});

const dbReplica = await getOrCreateMultiton('db-replica', () => {
  console.log('创建从数据库连接...');
  return new DatabaseConnection('replica');
});

// 再次获取相同键的实例 (不会重新创建)
const dbPrimaryAgain = await getOrCreateMultiton('db-primary', () => {
  console.log('这行不会执行');
  return new DatabaseConnection('primary');
});

console.log(dbPrimary === dbPrimaryAgain); // true - 相同实例
console.log(dbPrimary === dbReplica);      // false - 不同实例
```

---

### 示例 2: 启用日志和配置

```typescript
import { getOrCreateMultiton } from './src/skills/multiton-pattern-skill';

const logger = await getOrCreateMultiton('logger', () => {
  return new WinstonLogger();
}, {
  name: 'AppLogger',
  enableLog: true,           // 启用日志
  maxIdleTime: 300000,       // 5 分钟空闲超时
  enableAutoRecycle: true,   // 启用自动回收
});
```

**日志输出:**
```
[Multiton] 实例 [AppLogger] 未命中缓存，创建新实例...
[Multiton] 实例 [AppLogger] 创建成功
[Multiton] 实例 [AppLogger] 命中缓存 (访问次数：2)
```

---

### 示例 3: 实例释放与回收

```typescript
import { 
  getOrCreateMultiton, 
  releaseMultiton, 
  deleteMultiton 
} from './src/skills/multiton-pattern-skill';

// 创建实例
const cache = await getOrCreateMultiton('cache', () => new RedisCache());

// 使用实例
await cache.set('key', 'value');

// 释放实例 (标记为可回收)
releaseMultiton('cache', { enableLog: true });

// 强制删除实例
deleteMultiton('cache', { enableLog: true });
```

---

### 示例 4: 实例池管理

```typescript
import { InstancePool } from './src/skills/multiton-pattern-skill';

// 创建数据库连接池
const dbPool = new InstancePool<DatabaseConnection>({
  name: 'DatabasePool',
  minSize: 5,              // 最小连接数
  maxSize: 20,             // 最大连接数
  enableLog: true,
  factory: () => new DatabaseConnection(),
  validate: (conn) => conn.isConnected(),  // 验证连接有效性
  destroy: (conn) => conn.close(),         // 销毁连接
});

// 获取连接
const conn1 = await dbPool.acquire();
const conn2 = await dbPool.acquire();

// 使用连接
await conn1.query('SELECT * FROM users');

// 归还连接
await dbPool.release(conn1);

// 查看池统计
const stats = dbPool.getStatistics();
console.log(stats);
// { size: 5, available: 4, inUse: 1, waiting: 0 }

// 销毁池
await dbPool.destroy();
```

---

### 示例 5: 多例管理器 (命名空间支持)

```typescript
import { createMultitonManager } from './src/skills/multiton-pattern-skill';

// 创建数据库管理器
const dbManager = createMultitonManager({
  namespace: 'database',
  enableLog: true,
  maxIdleTime: 600000,  // 10 分钟
});

// 创建不同数据库连接
const primary = await dbManager.get('primary', () => new Database('primary'));
const replica = await dbManager.get('replica', () => new Database('replica'));
const analytics = await dbManager.get('analytics', () => new Database('analytics'));

// 查看所有键
console.log(dbManager.keys()); 
// ['primary', 'replica', 'analytics']

// 查看统计
const stats = dbManager.statistics();
console.log(stats.instanceDistribution);
// { primary: 1, replica: 1, analytics: 1 }

// 释放特定实例
dbManager.release('primary');
```

---

### 示例 6: 自动回收后台任务

```typescript
import { 
  startAutoRecycle, 
  getOrCreateMultiton,
  getMultitonStatistics 
} from './src/skills/multiton-pattern-skill';

// 启动自动回收 (每 1 分钟检查一次)
const stopRecycle = startAutoRecycle(60000, { enableLog: true });

// 创建一些实例
const cache1 = await getOrCreateMultiton('cache-1', () => new Cache());
const cache2 = await getOrCreateMultiton('cache-2', () => new Cache());
const cache3 = await getOrCreateMultiton('cache-3', () => new Cache());

// 使用后立即释放
// ... 使用 cache1 ...
// cache1 将在 5 分钟后被自动回收

// 停止自动回收
stopRecycle();

// 查看统计
const stats = getMultitonStatistics();
console.log(`总实例数：${stats.totalInstances}`);
console.log(`缓存命中率：${stats.hitRate.toFixed(2)}%`);
```

---

### 示例 7: 实际应用场景 - HTTP 客户端池

```typescript
import { getOrCreateMultiton, InstancePool } from './src/skills/multiton-pattern-skill';

// 场景 1: 为不同 API 创建独立的 HTTP 客户端
const createApiClient = (baseUrl: string) => {
  return getOrCreateMultiton(`http-client-${baseUrl}`, () => {
    return axios.create({
      baseURL: baseUrl,
      timeout: 5000,
      headers: { 'Content-Type': 'application/json' },
    });
  });
};

// 使用
const githubClient = await createApiClient('https://api.github.com');
const gitlabClient = await createApiClient('https://gitlab.com/api/v4');

// 场景 2: 创建 WebSocket 连接池
const wsPool = new InstancePool<WebSocket>({
  name: 'WebSocketPool',
  minSize: 3,
  maxSize: 10,
  factory: () => new WebSocket('wss://example.com'),
  validate: (ws) => ws.readyState === WebSocket.OPEN,
  destroy: (ws) => ws.close(),
});

// 获取 WebSocket 连接
const ws1 = await wsPool.acquire();
ws1.send('Hello');
await wsPool.release(ws1);
```

---

### 示例 8: 实际应用场景 - 缓存管理器

```typescript
import { createMultitonManager } from './src/skills/multiton-pattern-skill';

// 创建缓存管理器
const cacheManager = createMultitonManager({
  namespace: 'cache',
  enableLog: true,
  maxIdleTime: 1800000,  // 30 分钟
});

// 为不同数据类型创建独立缓存
const userCache = await cacheManager.get('users', () => {
  return new Map<string, User>();
});

const productCache = await cacheManager.get('products', () => {
  return new Map<string, Product>();
});

// 使用缓存
userCache.set('user-1', { id: '1', name: 'Alice' });
productCache.set('prod-1', { id: '1', name: 'Laptop' });

// 查看缓存统计
const stats = cacheManager.statistics();
console.log(`缓存命中率：${stats.hitRate.toFixed(2)}%`);
```

---

### 示例 9: 实际应用场景 - 日志记录器多例

```typescript
import { getOrCreateMultiton } from './src/skills/multiton-pattern-skill';

// 为不同模块创建独立日志记录器
const getLogger = async (module: string) => {
  return getOrCreateMultiton(`logger-${module}`, () => {
    const winston = require('winston');
    return winston.createLogger({
      level: 'info',
      format: winston.format.json(),
      transports: [
        new winston.transports.File({ filename: `logs/${module}.log` }),
      ],
    });
  }, {
    name: `Logger:${module}`,
    enableLog: false,
  });
};

// 使用
const authLogger = await getLogger('auth');
const paymentLogger = await getLogger('payment');
const emailLogger = await getLogger('email');

// 各模块日志独立输出到不同文件
authLogger.info('User logged in');
paymentLogger.info('Payment processed');
emailLogger.info('Email sent');
```

---

### 示例 10: 完整示例 - 微服务连接管理

```typescript
import { 
  getOrCreateMultiton, 
  InstancePool,
  createMultitonManager,
  getMultitonStatistics 
} from './src/skills/multiton-pattern-skill';

// ============================================================================
// 1. 创建服务连接管理器
// ============================================================================

const serviceManager = createMultitonManager({
  namespace: 'service',
  enableLog: true,
  maxIdleTime: 300000,  // 5 分钟
});

// ============================================================================
// 2. 定义服务连接工厂
// ============================================================================

class ServiceConnection {
  constructor(
    public serviceName: string,
    public endpoint: string
  ) {
    console.log(`连接到服务：${serviceName}`);
  }

  async call<T>(method: string, params: any): Promise<T> {
    console.log(`调用 ${this.serviceName}.${method}(${JSON.stringify(params)})`);
    // 模拟 RPC 调用
    await this.sleep(100);
    return { success: true, data: params } as T;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  disconnect(): void {
    console.log(`断开服务：${this.serviceName}`);
  }
}

// ============================================================================
// 3. 创建服务连接
// ============================================================================

const userService = await serviceManager.get('user', () => {
  return new ServiceConnection('user-service', 'http://user:8080');
});

const orderService = await serviceManager.get('order', () => {
  return new ServiceConnection('order-service', 'http://order:8080');
});

const paymentService = await serviceManager.get('payment', () => {
  return new ServiceConnection('payment-service', 'http://payment:8080');
});

// ============================================================================
// 4. 使用服务
// ============================================================================

const user = await userService.call<User>('getUser', { id: '123' });
const order = await orderService.call<Order>('createOrder', { userId: '123' });
const result = await paymentService.call<PaymentResult>('charge', {
  orderId: order.id,
  amount: 99.99,
});

// ============================================================================
// 5. 查看统计
// ============================================================================

const stats = serviceManager.statistics();
console.log('=== 服务连接统计 ===');
console.log(`总实例数：${stats.totalInstances}`);
console.log(`活跃实例：${stats.activeInstances}`);
console.log(`空闲实例：${stats.idleInstances}`);
console.log(`缓存命中率：${stats.hitRate.toFixed(2)}%`);
console.log(`实例分布:`, stats.instanceDistribution);

// ============================================================================
// 6. 创建数据库连接池
// ============================================================================

const dbPool = new InstancePool<DatabaseConnection>({
  name: 'MainDBPool',
  minSize: 5,
  maxSize: 20,
  enableLog: true,
  factory: () => new DatabaseConnection('postgresql://localhost:5432/mydb'),
  validate: (conn) => conn.ping(),
  destroy: (conn) => conn.close(),
});

// 并发获取连接
const connections = await Promise.all(
  Array(10).fill(null).map(() => dbPool.acquire())
);

// 使用连接
await Promise.all(
  connections.map((conn, i) => conn.query(`SELECT * FROM table_${i}`))
);

// 归还连接
await Promise.all(
  connections.map((conn) => dbPool.release(conn))
);

// 查看池统计
const poolStats = dbPool.getStatistics();
console.log('=== 连接池统计 ===');
console.log(`池大小：${poolStats.size}`);
console.log(`可用：${poolStats.available}`);
console.log(`使用中：${poolStats.inUse}`);
console.log(`等待：${poolStats.waiting}`);

// ============================================================================
// 7. 清理
// ============================================================================

// 释放服务连接
serviceManager.release('user');
serviceManager.release('order');
serviceManager.release('payment');

// 销毁连接池
await dbPool.destroy();
```

---

## 📊 API 参考

### 核心函数

| 函数 | 描述 | 返回值 |
|------|------|--------|
| `getOrCreateMultiton(key, factory, options)` | 获取或创建多例实例 | `Promise<T>` |
| `releaseMultiton(key, options)` | 释放实例 (标记为可回收) | `void` |
| `deleteMultiton(key, options)` | 强制删除实例 | `boolean` |
| `clearAllMultitons(options)` | 清空所有实例 | `void` |
| `getMultitonStatistics()` | 获取统计信息 | `PoolStatistics` |
| `resetStatistics()` | 重置统计 | `void` |

### InstancePool 类

| 方法 | 描述 | 返回值 |
|------|------|--------|
| `acquire(timeout)` | 获取实例 | `Promise<T>` |
| `release(instance)` | 归还实例 | `Promise<void>` |
| `getStatistics()` | 获取池统计 | `PoolStatistics` |
| `destroy()` | 销毁池 | `Promise<void>` |

### createMultitonManager

| 方法 | 描述 |
|------|------|
| `get(key, factory)` | 获取或创建实例 |
| `release(key)` | 释放实例 |
| `delete(key)` | 删除实例 |
| `keys()` | 获取所有键 |
| `statistics()` | 获取统计 |

---

## ⚠️ 注意事项

1. **线程安全**: 所有操作都支持异步锁，确保线程安全
2. **内存管理**: 启用 `enableAutoRecycle` 可自动回收空闲实例
3. **性能优化**: 高频访问的场景建议使用 `InstancePool` 预创建实例
4. **错误处理**: 工厂函数抛出异常时，实例不会被注册
5. **命名规范**: 建议使用 `namespace-key` 格式组织键名

---

## 🎯 最佳实践

### ✅ 推荐

```typescript
// 1. 使用命名空间组织
const manager = createMultitonManager({ namespace: 'database' });

// 2. 启用日志便于调试
const instance = await getOrCreateMultiton('key', factory, { enableLog: true });

// 3. 使用后立即释放
await use(instance);
releaseMultiton('key');

// 4. 高频场景使用连接池
const pool = new InstancePool({ minSize: 5, maxSize: 20 });
```

### ❌ 避免

```typescript
// 1. 不要创建过多不同键的实例 (内存泄漏风险)
for (let i = 0; i < 10000; i++) {
  await getOrCreateMultiton(`key-${i}`, factory); // ❌
}

// 2. 不要忘记释放实例
const instance = await getOrCreateMultiton('key', factory);
use(instance);
// 忘记 releaseMultiton('key') // ❌

// 3. 不要在工厂函数中执行耗时操作
await getOrCreateMultiton('key', async () => {
  await sleep(10000); // ❌ 会阻塞其他请求
});
```

---

**完成时间:** 2026-03-13  
**技能文件:** `src/skills/multiton-pattern-skill.ts`  
**示例文件:** `MULTITON-EXAMPLES.md`
