# 舱壁模式工具 - 使用示例

**作者:** KAEL  
**版本:** 1.0.0  
**日期:** 2026-03-13

---

## 📋 目录

1. [快速开始](#快速开始)
2. [基础用法](#基础用法)
3. [资源池管理](#资源池管理)
4. [故障隔离](#故障隔离)
5. [实际场景](#实际场景)
6. [最佳实践](#最佳实践)

---

## 快速开始

```typescript
import { createBulkhead, createResourcePoolManager, createFaultIsolator } from './bulkhead-pattern-skill';

// 1. 创建舱壁
const bulkhead = createBulkhead({
  name: 'my-service',
  resourceType: 'connection',
  maxResources: 10
});

// 2. 获取资源
const permit = await bulkhead.acquire();
try {
  // 执行业务逻辑
  await doSomething();
} finally {
  // 3. 释放资源
  permit.release();
}
```

---

## 基础用法

### 1. 创建舱壁

```typescript
const dbBulkhead = createBulkhead({
  name: 'database-pool',           // 舱壁名称
  resourceType: 'connection',       // 资源类型：thread|connection|memory|cpu|bandwidth|custom
  maxResources: 20,                 // 最大资源数
  minResources: 2,                  // 最小保留资源 (可选)
  acquireTimeoutMs: 5000,           // 获取超时 (ms)
  failureThreshold: 5,              // 故障阈值 (连续失败次数)
  recoveryTimeMs: 30000,            // 恢复时间 (ms)
  warningThreshold: 0.8             // 告警阈值 (使用率 0-1)
});
```

### 2. 获取和释放资源

```typescript
// 方式 1: 异步获取 (阻塞)
try {
  const permit = await dbBulkhead.acquire();
  try {
    await database.query('SELECT * FROM users');
    dbBulkhead.recordSuccess();
  } catch (error) {
    dbBulkhead.recordFailure();
    throw error;
  } finally {
    permit.release();
  }
} catch (error) {
  console.error('获取资源失败:', error.message);
}

// 方式 2: 尝试获取 (非阻塞)
const permit = dbBulkhead.tryAcquire();
if (permit) {
  try {
    // 执行业务逻辑
  } finally {
    permit.release();
  }
} else {
  console.log('资源不足，稍后重试');
}

// 方式 3: 自定义超时
const permit = await dbBulkhead.acquire(1000); // 1 秒超时
```

### 3. 监听事件

```typescript
dbBulkhead.onEvent((event) => {
  console.log(`[${event.type}] ${event.bulkheadName}`, event.data);
});

// 事件类型:
// - 'acquire': 获取资源
// - 'release': 释放资源
// - 'reject': 拒绝请求
// - 'failure': 发生故障
// - 'recovery': 恢复
// - 'state_change': 状态变更
```

### 4. 舱壁状态

```typescript
const state = dbBulkhead.getState();
// BulkheadState: healthy | constrained | open | half_open | failed

const metrics = dbBulkhead.getMetrics();
// {
//   state: 'healthy',
//   usedResources: 15,
//   availableResources: 5,
//   totalResources: 20,
//   utilizationRate: 0.75,
//   waitingRequests: 3,
//   totalFailures: 0,
//   totalRejections: 0
// }
```

---

## 资源池管理

### 1. 创建资源池管理器

```typescript
import { createResourcePoolManager } from './bulkhead-pattern-skill';

const poolManager = createResourcePoolManager();
```

### 2. 创建多个舱壁

```typescript
// API 服务资源池
const apiCpu = poolManager.createBulkhead({
  name: 'api-cpu',
  resourceType: 'cpu',
  maxResources: 100
});

const apiMemory = poolManager.createBulkhead({
  name: 'api-memory',
  resourceType: 'memory',
  maxResources: 2048 // MB
});

const apiDatabase = poolManager.createBulkhead({
  name: 'api-database',
  resourceType: 'connection',
  maxResources: 50
});
```

### 3. 组织资源池

```typescript
// 将多个舱壁组织为一个资源池
poolManager.createResourcePool('api-service', [
  'api-cpu',
  'api-memory',
  'api-database'
]);

// 获取资源池中的所有舱壁
const apiServicePool = poolManager.getResourcePool('api-service');

// 获取所有舱壁的指标
const allMetrics = poolManager.getAllMetrics();
for (const [name, metrics] of allMetrics) {
  console.log(`${name}: ${(metrics.utilizationRate * 100).toFixed(1)}% 利用率`);
}

// 获取不健康的舱壁
const unhealthy = poolManager.getUnhealthyBulkheads();
```

---

## 故障隔离

### 1. 创建故障隔离器

```typescript
import { createFaultIsolator } from './bulkhead-pattern-skill';

const isolator = createFaultIsolator(
  poolManager,
  'adaptive' // 策略：'aggressive' | 'conservative' | 'adaptive'
);
```

### 2. 定义故障传播关系

```typescript
// 定义：数据库故障会导致缓存和搜索服务故障
isolator.defineFailurePropagation('database', ['cache', 'search']);

// 定义：支付故障会影响订单服务
isolator.defineFailurePropagation('payment-service', ['order-service']);
```

### 3. 隔离故障

```typescript
// 隔离故障舱壁
await isolator.isolateFault('database', true); // true = 防止级联

// 恢复舱壁
isolator.recoverBulkhead('database');
```

### 4. 获取健康报告

```typescript
const report = isolator.getHealthReport();
console.log('整体状态:', report.overall); // healthy | degraded | critical
console.log('警告:', report.warnings);

// 示例输出:
// {
//   overall: 'degraded',
//   bulkheads: [
//     { name: 'database', state: 'open', utilizationRate: 0 },
//     { name: 'cache', state: 'healthy', utilizationRate: 0.3 }
//   ],
//   warnings: [
//     "Bulkhead 'database' is open"
//   ]
// }
```

---

## 实际场景

### 场景 1: 数据库连接池保护

```typescript
import { createBulkhead } from './bulkhead-pattern-skill';

const dbBulkhead = createBulkhead({
  name: 'postgres-main',
  resourceType: 'connection',
  maxResources: 50,
  acquireTimeoutMs: 3000,
  failureThreshold: 5
});

// 数据库操作装饰器
async function withDatabase<T>(operation: () => Promise<T>): Promise<T> {
  const permit = await dbBulkhead.acquire();
  try {
    const result = await operation();
    dbBulkhead.recordSuccess();
    return result;
  } catch (error) {
    dbBulkhead.recordFailure();
    throw error;
  } finally {
    permit.release();
  }
}

// 使用
const users = await withDatabase(async () => {
  return await db.query('SELECT * FROM users');
});
```

### 场景 2: 微服务线程池隔离

```typescript
const poolManager = createResourcePoolManager();

// 为每个微服务创建独立的线程池
poolManager.createBulkhead({
  name: 'user-service',
  resourceType: 'thread',
  maxResources: 100,
  failureThreshold: 10
});

poolManager.createBulkhead({
  name: 'order-service',
  resourceType: 'thread',
  maxResources: 50,
  failureThreshold: 5
});

poolManager.createBulkhead({
  name: 'payment-service',
  resourceType: 'thread',
  maxResources: 30,
  failureThreshold: 3
});

// 服务调用
async function callUserService(request: any) {
  const bulkhead = poolManager.getBulkhead('user-service')!;
  const permit = await bulkhead.acquire();
  try {
    return await userService.handle(request);
  } catch (error) {
    bulkhead.recordFailure();
    throw error;
  } finally {
    permit.release();
  }
}
```

### 场景 3: API 限流保护

```typescript
const apiBulkhead = createBulkhead({
  name: 'api-rate-limiter',
  resourceType: 'bandwidth',
  maxResources: 1000, // 每秒请求数
  acquireTimeoutMs: 100,
  warningThreshold: 0.9
});

// Express 中间件
app.use(async (req, res, next) => {
  const permit = apiBulkhead.tryAcquire();
  if (!permit) {
    return res.status(429).json({ error: 'Too many requests' });
  }
  
  try {
    await next();
  } finally {
    permit.release();
  }
});
```

### 场景 4: 内存配额管理

```typescript
const memoryBulkhead = createBulkhead({
  name: 'memory-quota',
  resourceType: 'memory',
  maxResources: 4096, // 4GB
  acquireTimeoutMs: 1000
});

// 大文件处理
async function processLargeFile(file: Buffer) {
  const permit = await memoryBulkhead.acquire();
  try {
    // 处理文件 (假设需要 500MB)
    const result = await heavyProcessing(file);
    return result;
  } finally {
    permit.release();
  }
}
```

---

## 最佳实践

### ✅ 推荐做法

1. **为关键资源创建舱壁**
   ```typescript
   // 数据库、外部 API、文件系统等
   const dbBulkhead = createBulkhead({ ... });
   const apiBulkhead = createBulkhead({ ... });
   ```

2. **使用 try-finally 确保资源释放**
   ```typescript
   const permit = await bulkhead.acquire();
   try {
     // 业务逻辑
   } finally {
     permit.release(); // 总是释放
   }
   ```

3. **记录成功/失败**
   ```typescript
   try {
     await operation();
     bulkhead.recordSuccess();
   } catch (error) {
     bulkhead.recordFailure();
     throw error;
   }
   ```

4. **监听事件进行监控**
   ```typescript
   bulkhead.onEvent((event) => {
     logger.info(`[Bulkhead] ${event.type}`, event.data);
     // 发送到监控系统
   });
   ```

5. **定义故障传播关系**
   ```typescript
   isolator.defineFailurePropagation('database', ['cache', 'search']);
   ```

### ❌ 避免做法

1. **忘记释放资源**
   ```typescript
   // ❌ 错误
   const permit = await bulkhead.acquire();
   doSomething(); // 如果抛出异常，permit 永远不会释放
   ```

2. **舱壁配置过大或过小**
   ```typescript
   // ❌ 错误：资源过多，失去隔离意义
   createBulkhead({ maxResources: 10000 });
   
   // ❌ 错误：资源过少，频繁拒绝
   createBulkhead({ maxResources: 1 });
   ```

3. **忽略故障阈值**
   ```typescript
   // ❌ 错误：不记录失败
   try {
     await operation();
   } catch (error) {
     // 没有调用 recordFailure()
   }
   ```

---

## API 参考

### Bulkhead 类

| 方法 | 描述 | 返回值 |
|------|------|--------|
| `acquire(timeoutMs?)` | 获取资源许可 | `Promise<ResourcePermit>` |
| `tryAcquire()` | 尝试获取 (非阻塞) | `ResourcePermit \| null` |
| `recordSuccess()` | 记录成功 | `void` |
| `recordFailure()` | 记录失败 | `void` |
| `getState()` | 获取当前状态 | `BulkheadState` |
| `getMetrics()` | 获取统计信息 | `BulkheadMetrics` |
| `onEvent(handler)` | 注册事件处理器 | `void` |

### ResourcePoolManager 类

| 方法 | 描述 | 返回值 |
|------|------|--------|
| `createBulkhead(config)` | 创建舱壁 | `Bulkhead` |
| `getBulkhead(name)` | 获取舱壁 | `Bulkhead \| undefined` |
| `createResourcePool(name, bulkheadNames)` | 创建资源池 | `void` |
| `getResourcePool(name)` | 获取资源池 | `Bulkhead[]` |
| `getAllMetrics()` | 获取所有指标 | `Map<string, BulkheadMetrics>` |
| `getUnhealthyBulkheads()` | 获取不健康舱壁 | `Bulkhead[]` |

### FaultIsolator 类

| 方法 | 描述 | 返回值 |
|------|------|--------|
| `defineFailurePropagation(source, targets)` | 定义故障传播 | `void` |
| `isolateFault(name, preventCascade)` | 隔离故障 | `Promise<void>` |
| `recoverBulkhead(name)` | 恢复舱壁 | `void` |
| `getHealthReport()` | 获取健康报告 | `HealthReport` |

---

## 总结

舱壁模式是微服务架构中的关键弹性模式，通过资源隔离防止故障传播和系统雪崩。

**核心价值:**
- 🔒 **资源隔离** - 防止单一服务耗尽所有资源
- 🛡️ **故障隔离** - 阻止故障级联传播
- 📊 **可观测性** - 实时监控资源使用和健康状态
- 🔄 **自动恢复** - 故障后自动尝试恢复

**适用场景:**
- 数据库连接池管理
- 微服务线程池隔离
- API 限流保护
- 内存/CPU 配额管理
- 第三方服务调用保护

---

**文档版本:** 1.0.0  
**最后更新:** 2026-03-13
