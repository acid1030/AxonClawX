# 🔧 限流工具技能 (Throttle Utils)

**功能:** API 限流控制  
**算法:** 令牌桶、漏桶、滑动窗口  
**位置:** `src/skills/throttle-utils-skill.ts`

---

## 📦 快速开始

```typescript
import {
  TokenBucket,
  LeakyBucket,
  SlidingWindow,
  createTokenBucket,
  createLeakyBucket,
  createSlidingWindow
} from './throttle-utils-skill';
```

---

## 🎯 三种算法对比

| 算法 | 特点 | 适用场景 |
|------|------|----------|
| **令牌桶** | 允许突发流量 | API 网关、用户限流 |
| **漏桶** | 强制平滑输出 | 消息队列、数据库连接 |
| **滑动窗口** | 精确时间窗口控制 | IP 限流、短信验证码 |

---

## 📖 API 文档

### 1. 令牌桶 (TokenBucket)

```typescript
const limiter = new TokenBucket({
  capacity: 100,        // 桶容量 (最大令牌数)
  refillRate: 10,       // 每秒补充速率
  fillInitially: true   // 是否初始填满
});

// 非阻塞尝试
if (limiter.tryAcquire()) {
  // 执行请求
}

// 阻塞等待 (最多 30 秒)
await limiter.acquire(1, 30000);

// 查询状态
limiter.getAvailableTokens(); // 当前可用令牌数
limiter.reset();              // 重置
```

### 2. 漏桶 (LeakyBucket)

```typescript
const limiter = new LeakyBucket({
  capacity: 50,   // 桶容量
  leakRate: 5     // 每秒处理速率
});

// 非阻塞尝试
if (limiter.tryAdd()) {
  // 请求入队
}

// 阻塞等待
await limiter.add(1, 5000);

// 查询状态
limiter.getWaterLevel();         // 当前水量 (待处理数)
limiter.getRemainingCapacity();  // 剩余容量
limiter.reset();                 // 重置
```

### 3. 滑动窗口 (SlidingWindow)

```typescript
const limiter = new SlidingWindow({
  windowSize: 60000,  // 窗口大小 (毫秒)
  maxRequests: 60,    // 最大请求数
  smooth: true        // 是否平滑滑动
});

// 非阻塞尝试
if (limiter.tryRecord()) {
  // 记录请求
}

// 阻塞等待
await limiter.record(1, 10000);

// 查询状态
limiter.getRequestCount();     // 当前请求数
limiter.getRemainingRequests(); // 剩余可用
limiter.reset();               // 重置
```

### 4. 组合限流器 (CompositeThrottle)

```typescript
const limiter = new CompositeThrottle({
  tokenBucket: { capacity: 20, refillRate: 5 },
  leakyBucket: { capacity: 50, leakRate: 10 },
  slidingWindow: { windowSize: 60000, maxRequests: 100 }
});

// 所有限流器都通过才执行
if (limiter.tryExecute()) {
  // 执行
}

await limiter.execute(5000); // 阻塞等待
```

---

## 🌟 使用场景

### 场景 1: API 网关限流

```typescript
// 每秒 10 个请求，允许突发 100 个
const apiLimiter = createTokenBucket(100, 10);

app.use('/api/', (req, res, next) => {
  if (apiLimiter.tryAcquire()) {
    next();
  } else {
    res.status(429).json({ error: 'Too Many Requests' });
  }
});
```

### 场景 2: 用户等级限流

```typescript
const tierLimits = {
  free: { capacity: 10, refillRate: 1 },
  premium: { capacity: 100, refillRate: 10 },
  enterprise: { capacity: 1000, refillRate: 100 }
};

function getLimiter(tier: string) {
  const { capacity, refillRate } = tierLimits[tier];
  return createTokenBucket(capacity, refillRate);
}
```

### 场景 3: 短信验证码限流

```typescript
// 5 分钟内最多 3 条
const smsLimiter = createSlidingWindow(300000, 3);

async function sendSMS(phone: string) {
  if (await smsLimiter.record(1, 5000)) {
    // 发送短信
  } else {
    throw new Error('发送频率过高');
  }
}
```

### 场景 4: 爬虫限流

```typescript
const domainLimiters = new Map<string, SlidingWindow>();

function getDomainLimiter(domain: string) {
  if (!domainLimiters.has(domain)) {
    domainLimiters.set(domain, createSlidingWindow(10000, 5));
  }
  return domainLimiters.get(domain)!;
}

async function crawl(url: string) {
  const domain = new URL(url).hostname;
  const limiter = getDomainLimiter(domain);
  
  if (await limiter.record()) {
    // 爬取页面
  }
}
```

### 场景 5: Express 中间件

```typescript
import { createExpressMiddleware, createTokenBucket } from './throttle-utils-skill';

const limiter = createTokenBucket(100, 10);
const rateLimit = createExpressMiddleware(limiter);

app.use('/api/', rateLimit);
```

---

## 🧪 运行示例

```bash
# 查看示例代码
src/skills/throttle-utils-examples.ts

# 运行示例 (Node.js)
npx ts-node src/skills/throttle-utils-examples.ts
```

---

## 📊 性能建议

### 令牌桶
- ✅ 适合允许突发的场景
- ✅ 内存占用低 (只维护令牌数)
- ⚠️ 短时间可能超出平均速率

### 漏桶
- ✅ 强制平滑输出
- ✅ 保护下游系统
- ⚠️ 不允许突发

### 滑动窗口
- ✅ 精确控制时间窗口
- ✅ 防止窗口边界突发
- ⚠️ 内存占用较高 (需维护请求记录)

---

## 🔧 扩展建议

1. **分布式限流**: 使用 Redis 实现跨实例限流
2. **动态限流**: 根据系统负载自动调整参数
3. **白名单**: 为特定用户/IP 提供豁免
4. **监控告警**: 记录限流指标并触发告警

---

## 📝 文件清单

- `throttle-utils-skill.ts` - 核心实现
- `throttle-utils-examples.ts` - 使用示例
- `THROTTLE-README.md` - 本文档

---

**创建时间:** 2026-03-13  
**创建者:** KAEL (Subagent)  
**状态:** ✅ 完成
