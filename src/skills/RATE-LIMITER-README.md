# 限流工具 (Rate Limiter)

> 三种经典限流算法实现 - 令牌桶、滑动窗口、分布式限流

## 📦 安装

无需额外安装，直接使用：

```typescript
import {
  TokenBucketLimiter,
  SlidingWindowLimiter,
  DistributedRateLimiter,
  createTokenBucket,
  createSlidingWindow,
  createDistributedLimiter,
  type RateLimitResult,
} from '@/skills/rate-limiter-skill';
```

## 🚀 快速开始

### 1. 令牌桶算法 (Token Bucket)

**原理**: 固定容量的桶按固定速率产生令牌，请求消耗令牌，无令牌则拒绝

**特点**: 
- ✅ 允许突发流量
- ✅ 平滑流量峰值
- ✅ 适合 API 网关

**适用场景**: API 限流、允许适度突发的场景

```typescript
import { createTokenBucket } from '@/skills/rate-limiter-skill';

// 创建限流器：容量 10 个令牌，每秒补充 2 个
const limiter = createTokenBucket(10, 2);

// 单次请求
const result = limiter.acquire();
if (result.allowed) {
  console.log('✅ 请求通过，剩余令牌:', result.remaining);
} else {
  console.log('❌ 请求被限流，等待:', result.retryAfter, 'ms');
}

// 批量请求 (消耗多个令牌)
const bulkResult = limiter.acquire(5);

// 预先检查 (不消耗令牌)
if (limiter.tryAcquire(3)) {
  console.log('有足够令牌');
}

// 获取当前可用令牌数
const available = limiter.getAvailableTokens();

// 重置限流器
limiter.reset();
```

### 2. 滑动窗口算法 (Sliding Window)

**原理**: 维护滑动时间窗口，记录窗口内请求时间戳，超出限制则拒绝

**特点**:
- ✅ 精确控制请求速率
- ✅ 无固定窗口边界问题
- ✅ 严格限流

**适用场景**: 严格限流、防刷、精确速率控制

```typescript
import { createSlidingWindow } from '@/skills/rate-limiter-skill';

// 创建限流器：5 秒内最多 100 次请求
const limiter = createSlidingWindow(5000, 100);

// 检查请求
const result = limiter.check();
if (result.allowed) {
  console.log('✅ 请求通过，剩余配额:', result.remaining);
} else {
  console.log('❌ 请求被限流，等待:', result.retryAfter, 'ms');
}

// 获取当前窗口内请求数
const count = limiter.getRequestCount();

// 重置限流器
limiter.reset();
```

### 3. 分布式限流 (Distributed Rate Limiter)

**原理**: 基于 Redis Lua 脚本实现原子操作，多节点共享限流状态

**特点**:
- ✅ 支持多节点集群
- ✅ 原子操作，无竞态条件
- ✅ 故障降级策略

**适用场景**: 微服务架构、多服务器集群、全局限流

```typescript
import { createDistributedLimiter } from '@/skills/rate-limiter-skill';
import Redis from 'ioredis';

// 创建 Redis 客户端
const redis = new Redis({
  host: 'localhost',
  port: 6379,
});

// 创建分布式限流器：1 分钟内最多 100 次请求
const limiter = createDistributedLimiter(redis, 60000, 100, 'api:limit:');

// 按用户 ID 限流
const userResult = await limiter.check('user:123');
if (userResult.allowed) {
  console.log('✅ 用户请求通过');
} else {
  console.log('❌ 用户请求被限流，等待:', userResult.retryAfter, 'ms');
}

// 按 IP 地址限流
const ipResult = await limiter.check('ip:192.168.1.1');

// 获取当前请求数
const count = await limiter.getCount('user:123');

// 重置指定用户的限流状态
await limiter.reset('user:123');
```

## 📖 API 文档

### 类型定义

#### RateLimitResult

限流结果接口

```typescript
interface RateLimitResult {
  allowed: boolean;      // 是否允许通过
  remaining: number;     // 剩余可用数量
  resetTime: number;     // 重置时间戳 (毫秒)
  retryAfter?: number;   // 重试等待时间 (毫秒)
}
```

### TokenBucketLimiter

令牌桶限流器类

#### 构造函数

```typescript
constructor(options: TokenBucketOptions)
```

**配置参数**:
- `capacity`: 桶容量 (最大令牌数)
- `refillRate`: 令牌补充速率 (个/秒)
- `initialTokens`: 初始令牌数 (可选，默认为容量)

#### 方法

##### acquire(tokensNeeded?: number): RateLimitResult

获取令牌

**参数**:
- `tokensNeeded`: 需要的令牌数量 (默认 1)

**返回**: 限流结果

```typescript
const result = limiter.acquire(3); // 消耗 3 个令牌
```

##### tryAcquire(tokensNeeded?: number): boolean

尝试获取令牌 (不实际消耗)

**参数**:
- `tokensNeeded`: 需要的令牌数量

**返回**: 是否足够

```typescript
if (limiter.tryAcquire(5)) {
  limiter.acquire(5); // 安全消耗
}
```

##### getAvailableTokens(): number

获取当前可用令牌数

```typescript
const available = limiter.getAvailableTokens();
```

##### reset(): void

重置限流器

```typescript
limiter.reset(); // 恢复到初始状态
```

### SlidingWindowLimiter

滑动窗口限流器类

#### 构造函数

```typescript
constructor(options: SlidingWindowOptions)
```

**配置参数**:
- `windowSize`: 窗口大小 (毫秒)
- `maxRequests`: 窗口内最大请求数

#### 方法

##### check(): RateLimitResult

检查并记录请求

**返回**: 限流结果

```typescript
const result = limiter.check();
```

##### getRequestCount(): number

获取当前窗口内的请求数

```typescript
const count = limiter.getRequestCount();
```

##### reset(): void

重置限流器

```typescript
limiter.reset();
```

##### getConfig(): { windowSize: number; maxRequests: number }

获取窗口配置信息

```typescript
const config = limiter.getConfig();
```

### DistributedRateLimiter

分布式限流器类

#### 构造函数

```typescript
constructor(options: DistributedRateLimiterOptions)
```

**配置参数**:
- `redisClient`: Redis 客户端实例
- `keyPrefix`: 限流键名前缀 (可选，默认 'ratelimit:')
- `windowSize`: 窗口大小 (毫秒)
- `maxRequests`: 窗口内最大请求数

#### 方法

##### check(identifier: string): Promise<RateLimitResult>

检查并记录请求

**参数**:
- `identifier`: 限流标识 (用户 ID、IP 地址等)

**返回**: 限流结果 (Promise)

```typescript
const result = await limiter.check('user:123');
```

##### reset(identifier: string): Promise<void>

重置指定标识的限流状态

**参数**:
- `identifier`: 限流标识

```typescript
await limiter.reset('user:123');
```

##### getCount(identifier: string): Promise<number>

获取指定标识的当前请求数

**参数**:
- `identifier`: 限流标识

**返回**: 请求数 (Promise)

```typescript
const count = await limiter.getCount('user:123');
```

### 工厂函数

#### createTokenBucket

创建令牌桶限流器

```typescript
function createTokenBucket(
  capacity: number,
  refillRate: number,
  initialTokens?: number
): TokenBucketLimiter
```

#### createSlidingWindow

创建滑动窗口限流器

```typescript
function createSlidingWindow(
  windowSize: number,
  maxRequests: number
): SlidingWindowLimiter
```

#### createDistributedLimiter

创建分布式限流器

```typescript
function createDistributedLimiter(
  redisClient: RedisClient,
  windowSize: number,
  maxRequests: number,
  keyPrefix?: string
): DistributedRateLimiter
```

## 🎯 实际应用场景

### 1. API 网关限流

```typescript
import { createTokenBucket } from '@/skills/rate-limiter-skill';

// 每个 API Key 独立限流
const apiLimiters = new Map<string, TokenBucketLimiter>();

function getApiLimiter(apiKey: string): TokenBucketLimiter {
  if (!apiLimiters.has(apiKey)) {
    // 100 次/秒，允许突发到 200 次
    apiLimiters.set(apiKey, createTokenBucket(200, 100));
  }
  return apiLimiters.get(apiKey)!;
}

// Express 中间件
app.use('/api', (req, res, next) => {
  const apiKey = req.headers['x-api-key'] as string;
  const limiter = getApiLimiter(apiKey);
  
  const result = limiter.acquire();
  
  if (result.allowed) {
    res.setHeader('X-RateLimit-Remaining', result.remaining);
    res.setHeader('X-RateLimit-Reset', result.resetTime);
    next();
  } else {
    res.setHeader('X-RateLimit-RetryAfter', result.retryAfter);
    res.status(429).json({
      error: 'Too Many Requests',
      retryAfter: result.retryAfter,
    });
  }
});
```

### 2. 用户行为防刷

```typescript
import { createSlidingWindow } from '@/skills/rate-limiter-skill';

// 防止恶意刷接口
const userLimiters = new Map<string, SlidingWindowLimiter>();

function checkUserAction(userId: string): boolean {
  if (!userLimiters.has(userId)) {
    // 1 分钟内最多 60 次操作
    userLimiters.set(userId, createSlidingWindow(60000, 60));
  }
  
  const limiter = userLimiters.get(userId)!;
  const result = limiter.check();
  
  if (!result.allowed) {
    console.warn(`用户 ${userId} 触发限流，等待 ${result.retryAfter}ms`);
    return false;
  }
  
  return true;
}

// 使用示例
app.post('/api/action', (req, res) => {
  const userId = req.user.id;
  
  if (!checkUserAction(userId)) {
    return res.status(429).json({ error: '操作过于频繁' });
  }
  
  // 处理业务逻辑
  res.json({ success: true });
});
```

### 3. 分布式会话限流

```typescript
import { createDistributedLimiter } from '@/skills/rate-limiter-skill';
import Redis from 'ioredis';

const redis = new Redis();
const sessionLimiter = createDistributedLimiter(redis, 60000, 100, 'session:');

// 会话级别限流
async function checkSession(sessionId: string): Promise<boolean> {
  const result = await sessionLimiter.check(sessionId);
  return result.allowed;
}

// WebSocket 连接限流
wss.on('connection', (ws, req) => {
  const sessionId = getSessionId(req);
  
  ws.on('message', async (data) => {
    const allowed = await checkSession(sessionId);
    
    if (!allowed) {
      ws.send(JSON.stringify({ error: '消息发送过于频繁' }));
      return;
    }
    
    // 处理消息
    handleMessage(data);
  });
});
```

### 4. 爬虫防护

```typescript
import { createSlidingWindow } from '@/skills/rate-limiter-skill';

// IP 级别限流
const ipLimiters = new Map<string, SlidingWindowLimiter>();

function checkIP(ip: string): boolean {
  if (!ipLimiters.has(ip)) {
    // 10 秒内最多 20 次请求
    ipLimiters.set(ip, createSlidingWindow(10000, 20));
  }
  
  const limiter = ipLimiters.get(ip)!;
  return limiter.check().allowed;
}

// 清理过期限流器 (每 5 分钟)
setInterval(() => {
  const now = Date.now();
  for (const [ip, limiter] of ipLimiters.entries()) {
    if (limiter.getRequestCount() === 0) {
      ipLimiters.delete(ip);
    }
  }
}, 300000);
```

### 5. 微服务全局限流

```typescript
import { createDistributedLimiter } from '@/skills/rate-limiter-skill';

const redis = new Redis();
const globalLimiter = createDistributedLimiter(redis, 1000, 10000, 'global:api:');

// 全局限流中间件
async function globalRateLimit(req, res, next) {
  const result = await globalLimiter.check('all');
  
  res.setHeader('X-RateLimit-Limit', 10000);
  res.setHeader('X-RateLimit-Remaining', result.remaining);
  res.setHeader('X-RateLimit-Reset', result.resetTime);
  
  if (!result.allowed) {
    return res.status(429).json({
      error: '系统繁忙，请稍后重试',
      retryAfter: result.retryAfter,
    });
  }
  
  next();
}
```

## ⚡ 算法对比

| 特性 | 令牌桶 | 滑动窗口 | 分布式 |
|------|--------|----------|--------|
| **突发支持** | ✅ 支持 | ❌ 严格 | ✅ 支持 |
| **精确度** | 中 | 高 | 高 |
| **性能** | 高 | 中 | 中 (依赖 Redis) |
| **分布式** | ❌ 单机 | ❌ 单机 | ✅ 多节点 |
| **内存占用** | 低 | 中 (存储时间戳) | 中 (Redis) |
| **实现复杂度** | 低 | 低 | 中 |

## 📊 配置建议

### API 网关
```typescript
// 令牌桶：允许突发
createTokenBucket(1000, 100); // 100 次/秒，突发 1000 次
```

### 用户操作
```typescript
// 滑动窗口：严格限制
createSlidingWindow(60000, 60); // 1 分钟 60 次
```

### 分布式系统
```typescript
// 分布式限流：全局限流
createDistributedLimiter(redis, 1000, 10000); // 1 秒 1 万次
```

### 防爬虫
```typescript
// 滑动窗口：IP 限流
createSlidingWindow(10000, 20); // 10 秒 20 次
```

## ⚠️ 注意事项

### 1. 内存管理
```typescript
// 定期清理不用的限流器
setInterval(() => {
  for (const [key, limiter] of limiters.entries()) {
    if (limiter.getRequestCount() === 0) {
      limiters.delete(key);
    }
  }
}, 300000); // 5 分钟
```

### 2. Redis 故障降级
```typescript
try {
  const result = await limiter.check(identifier);
} catch (error) {
  // 降级策略：允许通过但记录日志
  console.error('Redis 故障，使用降级策略');
  return { allowed: true, remaining: 100, resetTime: Date.now() + 60000 };
}
```

### 3. 时间同步
分布式限流需要所有节点时间同步，建议使用 NTP。

### 4. 键名设计
```typescript
// 好的键名设计
`api:limit:user:${userId}`
`api:limit:ip:${ipAddress}`
`api:limit:global`

// 避免键名冲突
const keyPrefix = 'ratelimit:' + serviceName + ':';
```

## 🧪 测试示例

```typescript
import { createTokenBucket, createSlidingWindow } from '@/skills/rate-limiter-skill';

describe('限流器测试', () => {
  test('令牌桶 - 允许突发', () => {
    const limiter = createTokenBucket(10, 1);
    
    // 前 10 次应该都通过
    for (let i = 0; i < 10; i++) {
      expect(limiter.acquire().allowed).toBe(true);
    }
    
    // 第 11 次应该被拒绝
    expect(limiter.acquire().allowed).toBe(false);
  });

  test('滑动窗口 - 严格限流', async () => {
    const limiter = createSlidingWindow(1000, 5);
    
    // 前 5 次通过
    for (let i = 0; i < 5; i++) {
      expect(limiter.check().allowed).toBe(true);
    }
    
    // 第 6 次拒绝
    expect(limiter.check().allowed).toBe(false);
    
    // 等待窗口滑动
    await new Promise(resolve => setTimeout(resolve, 1100));
    
    // 应该又能通过
    expect(limiter.check().allowed).toBe(true);
  });
});
```

## 📚 相关文件

- 源代码：`src/skills/rate-limiter-skill.ts`
- 本文档：`src/skills/RATE-LIMITER-README.md`

## 🤝 贡献

遵循项目代码规范，确保类型安全和测试覆盖。

## 📝 版本历史

- **v1.0.0** - 初始版本
  - ✅ 令牌桶算法
  - ✅ 滑动窗口算法
  - ✅ 分布式限流 (Redis)
  - ✅ 完整 TypeScript 类型
  - ✅ 详细使用文档
