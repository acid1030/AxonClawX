# 高级限流器 - 使用文档

**版本:** 1.0.0  
**作者:** Axon  
**更新时间:** 2026-03-13

---

## 📋 功能特性

### 1. 滑动窗口限流 (Sliding Window)
- ✅ 精确的滑动窗口算法
- ✅ 支持任意窗口大小
- ✅ 原子性操作 (Redis Lua 脚本)
- ✅ 内存模式降级支持

### 2. 分布式限流 (Redis)
- ✅ 多实例共享限流状态
- ✅ Redis 连接池支持
- ✅ 自动故障降级 (Redis 失败 → 内存模式)
- ✅ 自定义键前缀

### 3. 动态限流规则
- ✅ 路径通配符匹配 (`*`, `**`)
- ✅ HTTP 方法过滤
- ✅ 用户代理匹配
- ✅ 自定义条件函数
- ✅ 运行时规则管理 (无需重启)
- ✅ 优先级排序

---

## 🚀 快速开始

### 基础使用 (内存模式)

```typescript
import createAdvancedRateLimiter from './middleware/rate-limiter-advanced';

const app = express();

const rateLimiter = createAdvancedRateLimiter({
  defaultAlgorithm: 'sliding-window',
  defaultSlidingWindow: {
    windowSizeMs: 60000,  // 1 分钟
    maxRequests: 100,     // 100 请求
  },
  dynamicRules: [],
});

app.use(rateLimiter);
```

### 使用 Redis 分布式限流

```typescript
const rateLimiter = createAdvancedRateLimiter({
  defaultAlgorithm: 'sliding-window',
  defaultSlidingWindow: {
    windowSizeMs: 60000,
    maxRequests: 100,
  },
  redis: {
    host: 'localhost',
    port: 6379,
    keyPrefix: 'myapp:ratelimit:',
  },
  dynamicRules: [],
});
```

### 使用动态规则

```typescript
import { presetRules } from './middleware/rate-limiter-advanced';

const rateLimiter = createAdvancedRateLimiter({
  defaultAlgorithm: 'sliding-window',
  defaultSlidingWindow: {
    windowSizeMs: 60000,
    maxRequests: 100,
  },
  dynamicRules: [
    presetRules.auth,    // 登录接口：5 请求/分钟
    presetRules.api,     // API 接口：100 请求/分钟
    presetRules.upload,  // 文件上传：10 请求/小时
  ],
  globalLimit: {
    maxRequests: 5000,
    windowSizeMs: 60000,
  },
});
```

---

## 📖 配置说明

### AdvancedRateLimitConfig

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `defaultAlgorithm` | `RateLimitAlgorithm` | ✅ | 默认限流算法 |
| `defaultSlidingWindow` | `SlidingWindowConfig` | ✅ | 默认滑动窗口配置 |
| `redis` | `RedisConfig` | ❌ | Redis 配置 (可选) |
| `dynamicRules` | `DynamicRule[]` | ✅ | 动态规则列表 |
| `globalLimit` | `object` | ❌ | 全局限流配置 |
| `verbose` | `boolean` | ❌ | 是否记录详细日志 |
| `cleanupIntervalMs` | `number` | ❌ | 清理间隔 (毫秒) |

### DynamicRule

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | `string` | ✅ | 规则唯一标识 |
| `name` | `string` | ✅ | 规则名称 |
| `pathPattern` | `string` | ✅ | 路径匹配模式 |
| `methods` | `string[]` | ❌ | HTTP 方法过滤 |
| `userAgentPattern` | `string` | ❌ | 用户代理匹配 |
| `algorithm` | `RateLimitAlgorithm` | ✅ | 限流算法 |
| `slidingWindow` | `SlidingWindowConfig` | ❌ | 滑动窗口配置 |
| `priority` | `number` | ✅ | 优先级 (越小越高) |
| `enabled` | `boolean` | ✅ | 是否启用 |
| `customCondition` | `function` | ❌ | 自定义条件函数 |

---

## 🎯 预定义规则

### presetRules.auth
- **路径:** `/auth/**`
- **限流:** 5 请求/分钟
- **用途:** 登录、注册等认证接口

### presetRules.api
- **路径:** `/api/**`
- **限流:** 100 请求/分钟
- **用途:** 通用 API 接口

### presetRules.upload
- **路径:** `/upload/**`
- **限流:** 10 请求/小时
- **用途:** 文件上传接口

### presetRules.search
- **路径:** `/search/**`
- **限流:** 30 请求/分钟
- **用途:** 搜索接口

### presetRules.webhook
- **路径:** `/webhook/**`
- **限流:** 1000 请求/分钟
- **用途:** Webhook 回调接口

---

## 🔧 运行时规则管理

### 获取规则管理器

```typescript
const rateLimiter = createAdvancedRateLimiter(config);
const ruleManager = rateLimiter.getRuleManager();
```

### 添加规则

```typescript
ruleManager.addRule({
  id: 'custom-rule',
  name: 'Custom Rule',
  pathPattern: '/custom/**',
  algorithm: 'sliding-window',
  slidingWindow: {
    windowSizeMs: 60000,
    maxRequests: 50,
  },
  priority: 10,
  enabled: true,
});
```

### 更新规则

```typescript
ruleManager.updateRule('custom-rule', {
  slidingWindow: {
    windowSizeMs: 60000,
    maxRequests: 100, // 调整为 100 请求
  },
});
```

### 启用/禁用规则

```typescript
ruleManager.toggleRule('custom-rule', false); // 禁用
ruleManager.toggleRule('custom-rule', true);  // 启用
```

### 移除规则

```typescript
ruleManager.removeRule('custom-rule');
```

### 获取所有规则

```typescript
const rules = ruleManager.getAllRules();
```

---

## 📊 统计信息

### 获取统计

```typescript
const stats = rateLimiter.getStats();
console.log(stats);
```

### 统计字段

```typescript
interface RateLimitStats {
  totalRequests: number;      // 总请求数
  blockedRequests: number;    // 被拒绝的请求数
  ruleStats: Map<string, RuleStatEntry>;  // 各规则统计
  rateLimitHits: number;      // 限流触发次数
}
```

---

## 🌐 响应头

### 正常请求

| 响应头 | 说明 |
|--------|------|
| `X-RateLimit-Limit` | 当前窗口内的请求总数 |
| `X-RateLimit-Remaining` | 剩余可用请求数 |
| `X-RateLimit-Reset` | 窗口重置时间 (Unix 时间戳) |
| `X-RateLimit-Algorithm` | 使用的限流算法 |
| `X-RateLimit-Rule` | 匹配的规则 ID |
| `X-RateLimit-Window-Start` | 窗口开始时间 |
| `X-RateLimit-Window-End` | 窗口结束时间 |

### 限流触发 (HTTP 429)

| 响应头 | 说明 |
|--------|------|
| `Retry-After` | 建议的重试等待时间 (秒) |
| `Content-Type` | `application/json` |

### 响应体示例

```json
{
  "error": "Too Many Requests",
  "message": "Rate limit exceeded",
  "algorithm": "sliding-window",
  "ruleId": "api-limit",
  "remaining": 0,
  "resetTime": 1710345600000,
  "retryAfter": 30
}
```

---

## 🎨 预设配置

### 开发环境

```typescript
import { presets } from './middleware/rate-limiter-advanced';

const rateLimiter = createAdvancedRateLimiter(presets.development);
```

**特点:**
- 1000 请求/分钟 (默认)
- 10000 请求/分钟 (全局)
- 详细日志开启

### 生产环境

```typescript
const rateLimiter = createAdvancedRateLimiter(presets.production);
```

**特点:**
- 100 请求/分钟 (默认)
- 5000 请求/分钟 (全局)
- 包含常用规则 (auth, api, upload, search)
- 详细日志关闭

### API 网关

```typescript
const rateLimiter = createAdvancedRateLimiter(presets.apiGateway);
```

**特点:**
- 60 请求/分钟 (默认)
- 10000 请求/分钟 (全局)
- 包含 webhook 规则
- 严格限流

---

## 🔍 路径匹配规则

### 通配符

| 模式 | 说明 | 示例 |
|------|------|------|
| `*` | 匹配单级路径 | `/api/*` 匹配 `/api/users` |
| `**` | 匹配任意级路径 | `/api/**` 匹配 `/api/users/123/posts` |
| 精确匹配 | 完全匹配 | `/auth/login` 仅匹配 `/auth/login` |

### 示例

```typescript
// 匹配所有 API 路径
pathPattern: '/api/**'

// 匹配单层 API 路径
pathPattern: '/api/*'

// 匹配特定路径
pathPattern: '/auth/login'

// 匹配所有路径
pathPattern: '**'
```

---

## 🛡️ 最佳实践

### 1. 分层限流

```typescript
const config = {
  // 全局限流 (第一层)
  globalLimit: {
    maxRequests: 10000,
    windowSizeMs: 60000,
  },
  
  // 动态规则 (第二层)
  dynamicRules: [
    // 关键接口严格限流
    presetRules.auth,
    // 普通接口标准限流
    presetRules.api,
  ],
  
  // 默认限流 (第三层)
  defaultSlidingWindow: {
    windowSizeMs: 60000,
    maxRequests: 100,
  },
};
```

### 2. 识别维度

```typescript
// 按 IP 限流 (默认)
identifier = `ip:${ip}`

// 按用户 ID 限流
identifier = `user:${userId}`

// 按 IP + 用户限流
identifier = `ip:${ip}:user:${userId}`
```

### 3. 优雅降级

```typescript
// Redis 失败时自动降级到内存模式
// 不会阻止请求通过 (fail-open)
try {
  const result = await limiter.processRequest(req);
} catch (error) {
  console.error('Rate limiter error:', error);
  next(); // 允许请求通过
}
```

### 4. 监控告警

```typescript
// 定期检查统计
setInterval(() => {
  const stats = rateLimiter.getStats();
  const blockRate = stats.blockedRequests / stats.totalRequests;
  
  if (blockRate > 0.1) { // 超过 10% 的请求被限流
    console.warn('High rate limit block rate:', blockRate);
    // 发送告警...
  }
}, 60000);
```

---

## 🧪 测试示例

### 使用 curl 测试

```bash
# 快速发送多个请求
for i in {1..20}; do
  curl -i http://localhost:3000/api/data
  echo ""
done

# 查看响应头
curl -i http://localhost:3000/api/data
```

### 使用 Apache Bench

```bash
# 100 个请求，10 个并发
ab -n 100 -c 10 http://localhost:3000/api/data
```

### 使用 wrk

```bash
# 10 秒，100 并发
wrk -t2 -c100 -d10s http://localhost:3000/api/data
```

---

## 📝 常见问题

### Q: Redis 连接失败怎么办？
A: 限流器会自动降级到内存模式，不会影响服务运行。

### Q: 如何区分不同用户？
A: 限流器会自动检测 `req.user.id`、`req.headers['x-user-id']` 或 `req.session.userId`。

### Q: 如何临时关闭限流？
A: 使用 `ruleManager.toggleRule(ruleId, false)` 禁用特定规则。

### Q: 限流数据如何持久化？
A: 使用 Redis 模式时，数据会自动存储在 Redis 中。

### Q: 如何调整限流阈值？
A: 使用 `ruleManager.updateRule(ruleId, updates)` 动态更新规则配置。

---

## 📚 相关文件

- **源码:** `src/middleware/rate-limiter-advanced.ts`
- **示例:** `src/middleware/rate-limiter-advanced.example.ts`
- **本文档:** `src/middleware/rate-limiter-advanced.md`

---

**最后更新:** 2026-03-13  
**维护者:** Axon
