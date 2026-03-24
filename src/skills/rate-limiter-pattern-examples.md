# 限流器模式工具 - 使用示例

## 📚 目录

1. [快速开始](#快速开始)
2. [Token Bucket 限流器](#token-bucket-限流器)
3. [Sliding Window 限流器](#sliding-window-限流器)
4. [Fixed Window 限流器](#fixed-window-限流器)
5. [Leaky Bucket 限流器](#leaky-bucket-限流器)
6. [分布式限流器](#分布式限流器)
7. [中间件集成](#中间件集成)
8. [实际场景](#实际场景)

---

## 快速开始

### 安装与导入

```typescript
import {
  TokenBucketLimiter,
  SlidingWindowLimiter,
  FixedWindowLimiter,
  LeakyBucketLimiter,
  MemoryDistributedLimiter,
  RateLimiterFactory,
  createRateLimiterMiddleware,
  type RateLimiterConfig,
} from './skills/rate-limiter-pattern-skill';
```

### 基础使用

```typescript
// 创建限流器：1 分钟内最多 100 次请求
const limiter = new SlidingWindowLimiter('user-123', 60000, 100);

// 检查请求是否允许
const result = limiter.tryAcquire();

if (result.allowed) {
  // 处理请求
  console.log(`✅ 允许请求，剩余：${result.remaining}`);
} else {
  // 拒绝请求
  console.log(`❌ 请求被限流，请等待 ${result.retryAfter}ms`);
}
```

---

## Token Bucket 限流器

### 特点
- ✅ 支持突发流量
- ✅ 平滑限流
- ✅ 适合 API 网关

### 基础示例

```typescript
// 创建：容量 10 个令牌，补充速率 0.5 tokens/ms (即 500 tokens/秒)
const limiter = new TokenBucketLimiter('api-user', 10, 0.5);

// 尝试获取 1 个令牌
const result = limiter.tryAcquire();
console.log(result);
// {
//   allowed: true,
//   remaining: 9,
//   resetTime: 1234567890,
//   used: 1
// }

// 尝试获取多个令牌 (批量操作)
const bulkResult = limiter.tryAcquire(5);
console.log(`获取 5 个令牌：${bulkResult.allowed}`);
```

### 动态配置

```typescript
const limiter = new TokenBucketLimiter('dynamic', 10, 1);

// 运行时调整容量
limiter.setCapacity(20);

// 运行时调整补充速率
limiter.setRefillRate(2);

// 获取当前状态
const state = limiter.getState();
console.log(state);
// {
//   key: 'dynamic',
//   state: { allowed: true, remaining: 20, ... },
//   config: { maxRequests: 20, refillRate: 2, ... }
// }
```

### 实际场景：API 限流

```typescript
class APIGateway {
  private limiters: Map<string, TokenBucketLimiter> = new Map();

  constructor() {
    // 为每个用户创建独立的限流器
  }

  private getLimiter(userId: string): TokenBucketLimiter {
    if (!this.limiters.has(userId)) {
      // 普通用户：100 请求/分钟
      this.limiters.set(userId, new TokenBucketLimiter(userId, 100, 1.67));
    }
    return this.limiters.get(userId)!;
  }

  async handleRequest(userId: string, request: any) {
    const limiter = this.getLimiter(userId);
    const result = limiter.tryAcquire();

    if (!result.allowed) {
      throw new Error(`Rate limit exceeded. Retry after ${result.retryAfter}ms`);
    }

    // 处理请求...
    return { success: true, remaining: result.remaining };
  }
}
```

---

## Sliding Window 限流器

### 特点
- ✅ 精确限流
- ✅ 无窗口边界问题
- ✅ 适合高频请求控制

### 基础示例

```typescript
// 创建：5 秒内最多 5 次请求
const limiter = new SlidingWindowLimiter('user-123', 5000, 5);

for (let i = 0; i < 8; i++) {
  const result = limiter.tryAcquire();
  console.log(`请求 ${i + 1}: ${result.allowed ? '✅' : '❌'} (剩余：${result.remaining})`);
}

// 输出:
// 请求 1: ✅ (剩余：4)
// 请求 2: ✅ (剩余：3)
// 请求 3: ✅ (剩余：2)
// 请求 4: ✅ (剩余：1)
// 请求 5: ✅ (剩余：0)
// 请求 6: ❌ (剩余：0)
// 请求 7: ❌ (剩余：0)
// 请求 8: ❌ (剩余：0)
```

### 动态配置

```typescript
const limiter = new SlidingWindowLimiter('user-123', 10000, 10);

// 调整窗口大小
limiter.setWindow(5000); // 改为 5 秒窗口

// 调整最大请求数
limiter.setMaxRequests(20); // 改为最多 20 次
```

### 实际场景：防止暴力破解

```typescript
class LoginSecurity {
  private limiter = new SlidingWindowLimiter('login-attempts', 300000, 5); // 5 分钟 5 次

  async attemptLogin(username: string, password: string): Promise<{ success: boolean }> {
    const result = this.limiter.tryAcquire();

    if (!result.allowed) {
      const waitMinutes = Math.ceil((result.retryAfter || 0) / 60000);
      throw new Error(`Too many login attempts. Try again in ${waitMinutes} minutes.`);
    }

    // 验证密码...
    const success = await this.validateCredentials(username, password);
    
    if (!success) {
      // 记录失败尝试
      await this.logFailedAttempt(username);
    }

    return { success };
  }
}
```

---

## Fixed Window 限流器

### 特点
- ✅ 简单高效
- ✅ 易于实现
- ⚠️ 窗口边界可能突发

### 基础示例

```typescript
// 创建：10 秒内最多 10 次请求
const limiter = new FixedWindowLimiter('user-123', 10000, 10);

for (let i = 0; i < 13; i++) {
  const result = limiter.tryAcquire();
  console.log(`请求 ${i + 1}: ${result.allowed ? '✅' : '❌'}`);
  
  // 等待 1 秒
  await new Promise(resolve => setTimeout(resolve, 1000));
}
```

### 实际场景：按小时统计

```typescript
// 每小时最多 1000 次请求
const hourlyLimiter = new FixedWindowLimiter('hourly-quota', 3600000, 1000);

function checkQuota(): boolean {
  const result = hourlyLimiter.tryAcquire();
  
  if (!result.allowed) {
    const minutesUntilReset = Math.ceil((result.resetTime - Date.now()) / 60000);
    console.log(`配额已用尽，${minutesUntilReset} 分钟后重置`);
    return false;
  }
  
  return true;
}
```

---

## Leaky Bucket 限流器

### 特点
- ✅ 平滑输出
- ✅ 保护后端服务
- ✅ 队列管理

### 基础示例

```typescript
// 创建：容量 5，漏速率 0.2 requests/ms (即 200 requests/秒)
const limiter = new LeakyBucketLimiter('queue', 5, 0.2);

for (let i = 0; i < 8; i++) {
  const result = limiter.tryAcquire();
  console.log(`请求 ${i + 1}: ${result.allowed ? '✅' : '❌'}`);
}
```

### 实际场景：数据库连接池保护

```typescript
class DatabaseConnectionPool {
  private limiter = new LeakyBucketLimiter('db-connections', 10, 0.5); // 10 连接，500ms/连接

  async executeQuery(query: string): Promise<any> {
    const result = this.limiter.tryAcquire();

    if (!result.allowed) {
      // 等待后重试
      await new Promise(resolve => setTimeout(resolve, result.retryAfter));
      return this.executeQuery(query); // 递归重试
    }

    try {
      return await this.db.query(query);
    } finally {
      // 模拟连接释放 (漏水)
      // LeakyBucket 会自动处理
    }
  }
}
```

---

## 分布式限流器

### 特点
- ✅ 多实例共享限流
- ✅ 支持动态配置
- ⚠️ 生产环境需使用 Redis

### 内存版示例

```typescript
const distributed = new MemoryDistributedLimiter({
  windowMs: 60000,      // 1 分钟
  maxRequests: 100,     // 最多 100 次
  algorithm: 'sliding-window',
});

// 不同用户的限流
const user1Result = await distributed.tryAcquire('user-1');
const user2Result = await distributed.tryAcquire('user-2');

// 获取状态
const state = await distributed.getState('user-1');
console.log(`user-1: ${state.state.used}/${state.config.maxRequests}`);

// 重置限流
await distributed.reset('user-1');

// 动态更新配置
await distributed.updateConfig('user-1', {
  maxRequests: 200, // VIP 用户提升到 200 次/分钟
});
```

### Redis 实现示例 (伪代码)

```typescript
import Redis from 'ioredis';

class RedisDistributedLimiter implements DistributedLimiter {
  private redis: Redis;

  constructor(redisUrl: string) {
    this.redis = new Redis(redisUrl);
  }

  async tryAcquire(key: string): Promise<RateLimitResult> {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    // 使用 Lua 脚本保证原子性
    const luaScript = `
      local key = KEYS[1]
      local now = tonumber(ARGV[1])
      local windowStart = tonumber(ARGV[2])
      local maxRequests = tonumber(ARGV[3])

      -- 移除过期请求
      redis.call('ZREMRANGEBYSCORE', key, '-inf', windowStart)

      -- 当前请求数
      local current = redis.call('ZCARD', key)

      if current < maxRequests then
        redis.call('ZADD', key, now, now .. '-' .. math.random())
        redis.call('EXPIRE', key, math.ceil((now - windowStart) / 1000))
        return {1, maxRequests - current - 1}
      else
        return {0, 0}
      end
    `;

    const [allowed, remaining] = await this.redis.eval(
      luaScript,
      1,
      `ratelimit:${key}`,
      now.toString(),
      windowStart.toString(),
      this.maxRequests.toString()
    );

    return {
      allowed: allowed === 1,
      remaining,
      resetTime: now + this.windowMs,
      retryAfter: allowed === 1 ? undefined : this.windowMs,
      used: this.maxRequests - remaining,
    };
  }
}
```

---

## 中间件集成

### Express 中间件

```typescript
import express from 'express';
import { createRateLimiterMiddleware } from './skills/rate-limiter-pattern-skill';

const app = express();

// API 限流：1 分钟 100 次
app.use('/api', createRateLimiterMiddleware({
  windowMs: 60000,
  maxRequests: 100,
  algorithm: 'sliding-window',
}));

// 登录限流：5 分钟 5 次
app.use('/auth/login', createRateLimiterMiddleware({
  windowMs: 300000,
  maxRequests: 5,
  algorithm: 'sliding-window',
}));

// 搜索限流：10 秒 3 次
app.use('/api/search', createRateLimiterMiddleware({
  windowMs: 10000,
  maxRequests: 3,
  algorithm: 'token-bucket',
  refillRate: 0.3,
}));

app.listen(3000);
```

### Koa 中间件

```typescript
import Koa from 'koa';
import { RateLimiterFactory } from './skills/rate-limiter-pattern-skill';

const app = new Koa();

const config: RateLimiterConfig = {
  windowMs: 60000,
  maxRequests: 100,
  algorithm: 'sliding-window',
};

const limiter = RateLimiterFactory.createDistributed(config);

app.use(async (ctx, next) => {
  const key = ctx.ip;
  const result = await limiter.tryAcquire(key);

  ctx.set('X-RateLimit-Limit', config.maxRequests.toString());
  ctx.set('X-RateLimit-Remaining', result.remaining.toString());
  ctx.set('X-RateLimit-Reset', result.resetTime.toString());

  if (!result.allowed) {
    ctx.set('Retry-After', (result.retryAfter || 1000).toString());
    ctx.status = 429;
    ctx.body = {
      error: 'Too Many Requests',
      retryAfter: result.retryAfter,
    };
    return;
  }

  await next();
});
```

---

## 实际场景

### 场景 1: 多等级用户限流

```typescript
class TieredRateLimiter {
  private limiters: Map<string, MemoryDistributedLimiter> = new Map();

  constructor() {
    // 免费用户：10 次/分钟
    this.limiters.set('free', new MemoryDistributedLimiter({
      windowMs: 60000,
      maxRequests: 10,
      algorithm: 'sliding-window',
    }));

    // Pro 用户：100 次/分钟
    this.limiters.set('pro', new MemoryDistributedLimiter({
      windowMs: 60000,
      maxRequests: 100,
      algorithm: 'sliding-window',
    }));

    // Enterprise 用户：1000 次/分钟
    this.limiters.set('enterprise', new MemoryDistributedLimiter({
      windowMs: 60000,
      maxRequests: 1000,
      algorithm: 'sliding-window',
    }));
  }

  async checkLimit(userId: string, tier: string): Promise<RateLimitResult> {
    const limiter = this.limiters.get(tier) || this.limiters.get('free')!;
    return limiter.tryAcquire(userId);
  }
}
```

### 场景 2: IP 限流 + 用户限流双重检查

```typescript
class DualLayerLimiter {
  private ipLimiter = new SlidingWindowLimiter('ip-global', 60000, 1000); // 全 IP 1000 次/分钟
  private userLimiter = new MemoryDistributedLimiter({
    windowMs: 60000,
    maxRequests: 100,
    algorithm: 'sliding-window',
  });

  async check(ip: string, userId: string): Promise<{ allowed: boolean; reason?: string }> {
    // 第一层：IP 限流
    const ipResult = this.ipLimiter.tryAcquire();
    if (!ipResult.allowed) {
      return { allowed: false, reason: 'IP rate limit exceeded' };
    }

    // 第二层：用户限流
    const userResult = await this.userLimiter.tryAcquire(userId);
    if (!userResult.allowed) {
      return { allowed: false, reason: 'User rate limit exceeded' };
    }

    return { allowed: true };
  }
}
```

### 场景 3: 突发流量处理

```typescript
class BurstHandler {
  // 正常限流器
  private normalLimiter = new TokenBucketLimiter('normal', 100, 1);
  
  // 突发限流器 (更大的桶)
  private burstLimiter = new TokenBucketLimiter('burst', 500, 0.5);

  async handleRequest(isBurst: boolean): Promise<RateLimitResult> {
    if (isBurst) {
      return this.burstLimiter.tryAcquire();
    } else {
      return this.normalLimiter.tryAcquire();
    }
  }
}
```

### 场景 4: 限流监控与告警

```typescript
class RateLimitMonitor {
  private limiter: SlidingWindowLimiter;
  private alertThreshold: number = 0.8; // 80% 使用率告警

  constructor(key: string, windowMs: number, maxRequests: number) {
    this.limiter = new SlidingWindowLimiter(key, windowMs, maxRequests);
  }

  async checkAndAlert(): Promise<RateLimitResult> {
    const result = this.limiter.tryAcquire();
    const usage = 1 - (result.remaining / this.limiter.getState().config.maxRequests);

    if (usage >= this.alertThreshold) {
      console.warn(`⚠️ 限流告警：${this.limiter.getState().key} 使用率 ${Math.round(usage * 100)}%`);
      
      // 发送告警通知
      await this.sendAlert({
        key: this.limiter.getState().key,
        usage: Math.round(usage * 100),
        remaining: result.remaining,
        resetTime: result.resetTime,
      });
    }

    return result;
  }

  private async sendAlert(data: any): Promise<void> {
    // 实现告警逻辑 (邮件、短信、Slack 等)
    console.log('📧 发送告警:', data);
  }
}
```

---

## 算法对比

| 算法 | 优点 | 缺点 | 适用场景 |
|------|------|------|----------|
| **Token Bucket** | 支持突发、平滑 | 实现稍复杂 | API 网关、用户限流 |
| **Sliding Window** | 精确、无边界问题 | 内存占用高 | 高频请求、精确控制 |
| **Fixed Window** | 简单、高效 | 窗口边界突发 | 按时间统计、配额管理 |
| **Leaky Bucket** | 平滑输出、保护后端 | 不支持突发 | 队列管理、后端保护 |

---

## 最佳实践

### 1. 选择合适的算法

```typescript
// API 限流 → Token Bucket
const apiLimiter = new TokenBucketLimiter('api', 100, 1.67);

// 登录保护 → Sliding Window
const loginLimiter = new SlidingWindowLimiter('login', 300000, 5);

// 配额管理 → Fixed Window
const quotaLimiter = new FixedWindowLimiter('quota', 3600000, 1000);

// 后端保护 → Leaky Bucket
const backendLimiter = new LeakyBucketLimiter('backend', 50, 0.5);
```

### 2. 设置合理的限流值

```typescript
// 根据业务场景调整
const configs = {
  // 公开 API：宽松限流
  public: { windowMs: 60000, maxRequests: 100 },
  
  // 认证 API：严格限流
  auth: { windowMs: 300000, maxRequests: 5 },
  
  // 搜索 API：防止滥用
  search: { windowMs: 10000, maxRequests: 3 },
  
  // 上传 API：资源消耗大
  upload: { windowMs: 3600000, maxRequests: 10 },
};
```

### 3. 友好的错误响应

```typescript
if (!result.allowed) {
  res.status(429).json({
    error: 'Too Many Requests',
    message: `Rate limit exceeded. Please retry after ${Math.ceil((result.retryAfter || 0) / 1000)} seconds.`,
    retryAfter: result.retryAfter,
    resetTime: new Date(result.resetTime).toISOString(),
    limit: config.maxRequests,
    remaining: result.remaining,
  });
}
```

### 4. 限流头信息

```typescript
// 始终返回限流相关信息
res.setHeader('X-RateLimit-Limit', config.maxRequests.toString());
res.setHeader('X-RateLimit-Remaining', result.remaining.toString());
res.setHeader('X-RateLimit-Reset', result.resetTime.toString());

if (!result.allowed) {
  res.setHeader('Retry-After', (result.retryAfter || 1000).toString());
}
```

---

## 性能优化

### 1. 使用 Map 缓存限流器

```typescript
class LimiterCache {
  private cache = new Map<string, SlidingWindowLimiter>();

  getLimiter(key: string): SlidingWindowLimiter {
    if (!this.cache.has(key)) {
      this.cache.set(key, new SlidingWindowLimiter(key, 60000, 100));
    }
    return this.cache.get(key)!;
  }

  // 定期清理不活跃的限流器
  cleanup(inactiveMs: number = 3600000): void {
    // 实现清理逻辑
  }
}
```

### 2. 批量操作

```typescript
// 一次性获取多个令牌
const result = tokenBucket.tryAcquire(5);

// 比循环 5 次 tryAcquire(1) 更高效
```

### 3. 异步限流检查

```typescript
// 非阻塞检查
async function checkRateLimit(key: string): Promise<boolean> {
  const result = await distributedLimiter.tryAcquire(key);
  return result.allowed;
}
```

---

## 常见问题

### Q: 如何选择窗口大小？

A: 根据业务需求：
- 登录保护：5-15 分钟
- API 调用：1 分钟
- 资源配额：1 小时/1 天
- 搜索请求：10 秒

### Q: 分布式限流器必须用 Redis 吗？

A: 生产环境推荐 Redis，原因：
- 原子操作 (Lua 脚本)
- 持久化
- 多实例共享
- 高性能

### Q: 如何处理限流后的重试？

A: 使用指数退避：

```typescript
async function retryWithBackoff(fn: () => Promise<any>, maxRetries: number = 3): Promise<any> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (error.status !== 429 || i === maxRetries - 1) {
        throw error;
      }
      
      const backoff = Math.pow(2, i) * 1000; // 1s, 2s, 4s
      await new Promise(resolve => setTimeout(resolve, backoff));
    }
  }
}
```

---

## 总结

限流器是保护系统稳定性和公平性的关键组件。本工具提供：

✅ **4 种经典算法** - Token Bucket, Sliding Window, Fixed Window, Leaky Bucket  
✅ **分布式支持** - 内存版 + Redis 实现指南  
✅ **动态配置** - 运行时调整限流参数  
✅ **中间件集成** - Express/Koa 开箱即用  
✅ **丰富示例** - 实际场景代码参考

选择适合你业务的算法，合理配置参数，让系统更稳定！
