# 限流器模式工具 - 快速参考

## 🚀 快速开始

```typescript
import { 
  SlidingWindowLimiter, 
  TokenBucketLimiter,
  MemoryDistributedLimiter,
  createRateLimiterMiddleware 
} from './skills/rate-limiter-pattern-skill';
```

## 📦 核心 API

### 1. SlidingWindowLimiter (推荐)

```typescript
const limiter = new SlidingWindowLimiter('key', windowMs, maxRequests);
const result = limiter.tryAcquire();

if (result.allowed) {
  // 处理请求
} else {
  // 等待 result.retryAfter 毫秒
}
```

### 2. TokenBucketLimiter

```typescript
const limiter = new TokenBucketLimiter('key', capacity, refillRate);
const result = limiter.tryAcquire(tokens);
```

### 3. FixedWindowLimiter

```typescript
const limiter = new FixedWindowLimiter('key', windowMs, maxRequests);
const result = limiter.tryAcquire();
```

### 4. LeakyBucketLimiter

```typescript
const limiter = new LeakyBucketLimiter('key', capacity, leakRate);
const result = limiter.tryAcquire();
```

### 5. 分布式限流器

```typescript
const limiter = new MemoryDistributedLimiter({
  windowMs: 60000,
  maxRequests: 100,
  algorithm: 'sliding-window',
});

const result = await limiter.tryAcquire('user-id');
await limiter.updateConfig('user-id', { maxRequests: 200 });
```

### 6. Express 中间件

```typescript
app.use('/api', createRateLimiterMiddleware({
  windowMs: 60000,
  maxRequests: 100,
  algorithm: 'sliding-window',
}));
```

## 📊 限流结果

```typescript
interface RateLimitResult {
  allowed: boolean;      // 是否允许
  remaining: number;     // 剩余请求数
  resetTime: number;     // 重置时间戳
  retryAfter?: number;   // 重试等待时间 (ms)
  used: number;          // 已使用数量
}
```

## 🎯 算法选择

| 场景 | 推荐算法 | 配置示例 |
|------|----------|----------|
| API 限流 | Token Bucket | `new TokenBucketLimiter('api', 100, 1.67)` |
| 登录保护 | Sliding Window | `new SlidingWindowLimiter('login', 300000, 5)` |
| 配额管理 | Fixed Window | `new FixedWindowLimiter('quota', 3600000, 1000)` |
| 后端保护 | Leaky Bucket | `new LeakyBucketLimiter('backend', 50, 0.5)` |

## 🔧 动态配置

```typescript
// Token Bucket
limiter.setCapacity(20);
limiter.setRefillRate(2);

// Sliding/Fixed Window
limiter.setWindow(5000);
limiter.setMaxRequests(20);

// Leaky Bucket
limiter.setCapacity(10);
limiter.setLeakRate(0.5);
```

## 📈 状态监控

```typescript
const state = limiter.getState();
console.log(state);
// {
//   key: 'user-123',
//   state: { allowed: true, remaining: 95, resetTime: 1234567890, used: 5 },
//   config: { windowMs: 60000, maxRequests: 100, algorithm: 'sliding-window' }
// }
```

## ⚠️ 最佳实践

1. **设置合理的限流值** - 根据业务场景调整
2. **返回限流头信息** - `X-RateLimit-*`
3. **友好的错误响应** - 包含 `retryAfter`
4. **监控告警** - 使用率超过 80% 时告警
5. **分级限流** - 不同用户等级不同限流

## 📝 完整示例

```typescript
import { SlidingWindowLimiter } from './skills/rate-limiter-pattern-skill';

class APIService {
  private limiter = new SlidingWindowLimiter('api', 60000, 100);

  async handleRequest(req: Request, res: Response) {
    const result = this.limiter.tryAcquire();

    // 设置限流头
    res.setHeader('X-RateLimit-Limit', '100');
    res.setHeader('X-RateLimit-Remaining', result.remaining.toString());
    res.setHeader('X-RateLimit-Reset', result.resetTime.toString());

    if (!result.allowed) {
      res.setHeader('Retry-After', (result.retryAfter || 1000).toString());
      return res.status(429).json({
        error: 'Too Many Requests',
        retryAfter: result.retryAfter,
      });
    }

    // 处理请求
    return res.json({ success: true });
  }
}
```

## 🔗 详细文档

查看 `rate-limiter-pattern-examples.md` 获取完整使用示例和最佳实践。
