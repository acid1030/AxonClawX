# API 限流技能 - 使用示例

## 🜏 快速开始

### 1. 基础用法 - 标准限流

```typescript
import express from 'express';
import { createRateLimiter } from './src/skills/rate-limit-skill';

const app = express();

// 标准限流：60 请求/分钟，按 IP 限流
const limiter = createRateLimiter({
  bucketSize: 60,
  refillRate: 1, // 每秒补充 1 个令牌
  limitByIP: true,
  limitByUser: false,
});

app.use('/api/', limiter);

app.get('/api/data', (req, res) => {
  res.json({ message: 'Success' });
});
```

---

### 2. 使用预定义配置

```typescript
import { createRateLimiter, presets } from './src/skills/rate-limit-skill';

// 使用预定义的宽松配置
app.use('/api/', createRateLimiter(presets.relaxed));

// 使用预定义的严格配置
app.use('/api/admin/', createRateLimiter(presets.strict));

// 使用预定义的 API 配置 (按用户限流)
app.use('/api/user/', createRateLimiter(presets.api));
```

---

### 3. 按用户限流

```typescript
import { createUserLimiter } from './src/skills/rate-limit-skill';

// 用户限流：100 请求/分钟
const userLimiter = createUserLimiter(100);

app.use('/api/user/', userLimiter);

// 需要用户认证中间件先设置 req.user 或 req.session.userId
app.get('/api/user/profile', authenticateUser, userLimiter, (req, res) => {
  res.json({ user: req.user });
});
```

---

### 4. 按 IP 限流

```typescript
import { createIPLimiter } from './src/skills/rate-limit-skill';

// IP 限流：60 请求/分钟
const ipLimiter = createIPLimiter(60);

app.use('/api/', ipLimiter);

// 防止暴力破解
app.post('/api/login', createIPLimiter(5), loginHandler);
```

---

### 5. 混合限流 (IP + 用户)

```typescript
import { createHybridLimiter } from './src/skills/rate-limit-skill';

// IP 限流 60 请求/分钟，用户限流 100 请求/分钟
const hybridLimiter = createHybridLimiter(60, 100);

app.use('/api/', hybridLimiter);
```

---

### 6. 自定义路径规则

```typescript
import { createRuleBasedLimiter } from './src/skills/rate-limit-skill';

const limiter = createRuleBasedLimiter(
  // 基础配置
  {
    bucketSize: 60,
    refillRate: 1,
    limitByIP: true,
    limitByUser: false,
  },
  // 自定义规则
  [
    {
      name: 'login',
      pathPattern: '/api/auth/login',
      bucketSize: 5,      // 登录接口：5 请求/分钟
      refillRate: 5 / 60,
    },
    {
      name: 'search',
      pathPattern: '/api/search/*',
      bucketSize: 20,     // 搜索接口：20 请求/分钟
      refillRate: 20 / 60,
    },
    {
      name: 'upload',
      pathPattern: '/api/upload',
      bucketSize: 10,     // 上传接口：10 请求/分钟
      refillRate: 10 / 60,
    },
  ]
);

app.use('/api/', limiter);
```

---

### 7. 完整 Express 示例

```typescript
import express from 'express';
import { createRateLimiter, presets } from './src/skills/rate-limit-skill';

const app = express();
app.use(express.json());

// 全局标准限流
app.use('/api/', createRateLimiter(presets.standard));

// 登录接口 - 严格限流防暴力破解
app.post('/api/auth/login', createRateLimiter(presets.login), (req, res) => {
  // 登录逻辑
  res.json({ token: 'xxx' });
});

// 搜索接口 - 中等限流
app.get('/api/search', createRateLimiter(presets.search), (req, res) => {
  res.json({ results: [] });
});

// 用户接口 - 按用户限流
app.get('/api/user/profile', createRateLimiter(presets.api), (req, res) => {
  res.json({ user: { id: 1, name: 'Axon' } });
});

// 启动服务器
app.listen(3000, () => {
  console.log('🜏 Server running on port 3000');
});
```

---

## 📊 响应头说明

限流器会自动设置以下响应头：

```
X-RateLimit-Limit: 60          # 最大请求数
X-RateLimit-Remaining: 45      # 剩余请求数
X-RateLimit-Reset: 1710316800  # 重置时间戳 (毫秒)
Retry-After: 5000              # 建议重试等待时间 (毫秒)
```

---

## 🚫 限流响应

当请求被限制时，返回 429 状态码：

```json
{
  "error": "Too Many Requests",
  "message": "Rate limit exceeded",
  "retryAfter": 5000,
  "resetTime": 1710316800000
}
```

---

## ⚙️ 配置参数说明

| 参数 | 类型 | 说明 | 默认值 |
|------|------|------|--------|
| `bucketSize` | number | 桶容量 (最大令牌数) | 必填 |
| `refillRate` | number | 每秒补充的令牌数 | 必填 |
| `windowMs` | number | 限流时间窗口 (毫秒) | 60000 |
| `limitByIP` | boolean | 是否按 IP 限流 | false |
| `limitByUser` | boolean | 是否按用户 ID 限流 | false |
| `rules` | RateLimitRule[] | 自定义路径规则 | 可选 |

---

## 🎯 预定义配置

| 配置名 | 请求/分钟 | 限流方式 | 适用场景 |
|--------|-----------|----------|----------|
| `relaxed` | 100 | IP | 宽松场景 |
| `standard` | 60 | IP | 通用 API |
| `strict` | 10 | IP + 用户 | 敏感操作 |
| `api` | 30 | 用户 | 认证用户 API |
| `login` | 5 | IP | 登录接口 |
| `search` | 20 | IP | 搜索接口 |

---

## 🔧 高级用法

### 动态调整限流规则

```typescript
import { TokenBucketLimiter } from './src/skills/rate-limit-skill';

const limiter = new TokenBucketLimiter({
  bucketSize: 60,
  refillRate: 1,
  limitByIP: true,
  limitByUser: false,
});

// 检查用户当前状态
const status = limiter.getStatus('ip:192.168.1.1');
console.log(`剩余请求数：${status.remaining}`);

// 手动消费令牌 (例如：高成本操作消耗多个令牌)
const result = limiter.consume('ip:192.168.1.1', 5); // 消耗 5 个令牌

// 清理资源
limiter.destroy();
```

### 结合 Redis 实现分布式限流

```typescript
// 可以将 TokenBucketLimiter 的 buckets 存储替换为 Redis
// 实现跨服务器的分布式限流
```

---

## 📝 注意事项

1. **用户识别**: 按用户限流需要认证中间件先设置 `req.user.id` 或 `req.session.userId`
2. **IP 识别**: 支持 `X-Forwarded-For` 头，适用于反向代理场景
3. **内存管理**: 限流器会自动清理长时间未使用的桶，无需手动管理
4. **性能**: 令牌桶算法时间复杂度 O(1)，适合高并发场景

---

_🜏 Axon - 逻辑化身，绝对的优雅_
