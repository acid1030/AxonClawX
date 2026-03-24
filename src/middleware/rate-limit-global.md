# Global Rate Limiter Middleware

全局限流中间件 - 应用级请求限流解决方案

---

## 📋 功能特性

### 1. 全局请求限流
- ✅ 令牌桶算法实现
- ✅ 全局限流 + IP 限流双层保护
- ✅ 可配置的桶容量和补充速率
- ✅ 自动清理过期数据

### 2. IP 黑名单管理
- ✅ 永久封禁支持
- ✅ 临时封禁 (自动过期)
- ✅ 自动触发封禁 (频繁违规)
- ✅ 封禁原因记录

### 3. 限流统计监控
- ✅ 实时请求统计
- ✅ IP 级别请求追踪
- ✅ 请求分布热力图
- ✅ 历史数据保留
- ✅ 管理 API 集成

---

## 🚀 快速开始

### 安装

```bash
# 无需额外依赖，使用 TypeScript 编译即可
npm install typescript --save-dev
```

### 基础使用

```typescript
import createGlobalRateLimiter from './middleware/rate-limit-global';

// 创建限流中间件
const rateLimiter = createGlobalRateLimiter({
  globalBucketSize: 500,    // 全局 500 个并发请求
  globalRefillRate: 50,     // 每秒补充 50 个令牌
  ipBucketSize: 50,         // 每 IP 50 个请求
  ipRefillRate: 5,          // 每 IP 每秒 5 个令牌
});

// Express 集成
app.use(rateLimiter);

// Koa 集成
app.use(async (ctx, next) => {
  await rateLimiter(ctx.req, ctx.res, next);
});
```

---

## ⚙️ 配置选项

### GlobalRateLimitConfig

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `globalBucketSize` | number | 必填 | 全局桶容量 (最大并发请求数) |
| `globalRefillRate` | number | 必填 | 全局令牌补充速率 (每秒) |
| `ipBucketSize` | number | globalBucketSize/10 | 每 IP 桶容量 |
| `ipRefillRate` | number | globalRefillRate/10 | 每 IP 补充速率 |
| `blacklistCheckIntervalMs` | number | 5000 | 黑名单检查间隔 (毫秒) |
| `statsRetentionHours` | number | 24 | 统计保留时间 (小时) |
| `temporaryBanDurationMs` | number | 3600000 | 临时封禁时长 (1 小时) |

### 预设配置

```typescript
import { presets } from './middleware/rate-limit-global';

// 开发环境
presets.development
// globalBucketSize: 1000, globalRefillRate: 100
// ipBucketSize: 100, ipRefillRate: 10

// 生产环境
presets.production
// globalBucketSize: 500, globalRefillRate: 50
// ipBucketSize: 50, ipRefillRate: 5

// 高并发场景
presets.highTraffic
// globalBucketSize: 2000, globalRefillRate: 200
// ipBucketSize: 100, ipRefillRate: 10

// API 网关
presets.apiGateway
// globalBucketSize: 100, globalRefillRate: 10
// ipBucketSize: 20, ipRefillRate: 2
```

---

## 🛠️ 管理 API

### 创建管理接口

```typescript
import { createRateLimitAdminAPI } from './middleware/rate-limit-global';

const limiter = createGlobalRateLimiter(presets.production);
const adminAPI = createRateLimitAdminAPI(limiter);

// 获取统计
const stats = adminAPI.getStats();

// 添加黑名单
adminAPI.addBlacklist('192.168.1.100', '恶意攻击', true);

// 移除黑名单
adminAPI.removeBlacklist('192.168.1.100');

// 重置统计
adminAPI.resetStats();
```

### REST API 示例

```typescript
// GET /api/admin/rate-limit/stats
{
  "totalRequests": 15420,
  "blockedRequests": 342,
  "activeIPs": 156,
  "blacklistedIPs": 12,
  "rateLimitHits": 280,
  "blacklistHits": 62
}

// GET /api/admin/rate-limit/blacklist
{
  "blacklist": [
    {
      "ip": "192.168.1.100",
      "reason": "恶意攻击",
      "permanent": true,
      "bannedAt": 1710345600000,
      "violationCount": 150
    }
  ]
}

// POST /api/admin/rate-limit/blacklist
{
  "ip": "192.168.1.200",
  "reason": "暴力破解",
  "permanent": false
}
// Response: { "success": true, "ip": "192.168.1.200" }
```

---

## 📊 响应头

限流器会自动添加以下响应头:

```http
X-RateLimit-Global-Limit: 500
X-RateLimit-Global-Remaining: 423
X-RateLimit-Global-Reset: 1710345678000
Retry-After: 3
```

黑名单响应头:

```http
X-Blacklisted: true
X-Blacklist-Reason: 恶意攻击
X-Blacklist-Expires: 1710349200000
```

---

## 🔍 统计数据

### RateLimitStats 结构

```typescript
interface RateLimitStats {
  totalRequests: number;        // 总请求数
  blockedRequests: number;      // 被拒绝请求数
  activeIPs: number;            // 活跃 IP 数
  blacklistedIPs: number;       // 黑名单 IP 数
  rateLimitHits: number;        // 限流触发次数
  blacklistHits: number;        // 黑名单触发次数
  requestDistribution: Map;     // 请求分布 (时间窗口)
  ipStats: Map;                 // 各 IP 统计
}
```

### IP 统计

```typescript
interface IPStatEntry {
  ip: string;           // IP 地址
  requestCount: number; // 请求总数
  blockedCount: number; // 被拒绝次数
  firstSeen: number;    // 首次请求时间
  lastSeen: number;     // 最后请求时间
  avgResponseTime?: number; // 平均响应时间
}
```

---

## 🎯 高级用法

### 1. 条件限流

```typescript
const strictLimiter = createGlobalRateLimiter(presets.apiGateway);
const normalLimiter = createGlobalRateLimiter(presets.production);

app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return strictLimiter(req, res, next);
  }
  return normalLimiter(req, res, next);
});
```

### 2. 自定义 IP 提取

```typescript
const customLimiter = async (req, res, next) => {
  // Cloudflare CDN
  const ip = req.headers['cf-connecting-ip'] || 
             req.headers['x-forwarded-for']?.split(',')[0] ||
             req.socket?.remoteAddress;
  
  return rateLimiter(req, res, next);
};
```

### 3. 实时监控 (WebSocket)

```typescript
setInterval(() => {
  const stats = limiter.getStats();
  io.emit('rate-limit-stats', {
    timestamp: Date.now(),
    totalRequests: stats.totalRequests,
    blockedRequests: stats.blockedRequests,
    activeIPs: stats.activeIPs,
  });
}, 5000);
```

---

## 🧪 测试

```typescript
import { testRateLimiter } from './middleware/rate-limit-global.example';

// 运行测试
testRateLimiter();
```

输出示例:

```
🧪 开始限流测试...

请求 1: ✅ 允许 (剩余：9)
请求 2: ✅ 允许 (剩余：8)
...
请求 10: ✅ 允许 (剩余：0)
请求 11: ❌ 拒绝 (原因：rate-limit, 等待：500ms)
...

📊 统计信息:
总请求：15
被拒绝：6
活跃 IP: 1

🚫 测试黑名单...
黑名单 IP 请求：❌ 拒绝
原因：恶意行为

✅ 测试完成
```

---

## ⚠️ 注意事项

### 1. 内存管理
- 限流器会自动清理过期数据
- 长时间运行的应用建议定期重置统计
- 高并发场景考虑使用 Redis 等外部存储

### 2. 性能优化
- 生产环境建议使用 `unref()` 允许进程退出
- 黑名单检查间隔不宜过短 (建议 ≥ 5 秒)
- 统计保留时间根据需求调整

### 3. 分布式部署
当前实现为单机版本，分布式场景建议:
- 使用 Redis 共享令牌桶状态
- 使用集中式黑名单存储
- 考虑使用专门的限流服务 (如 Kong, Envoy)

---

## 📝 错误码

| HTTP 状态码 | 说明 |
|------------|------|
| 429 | 请求过多 (限流触发) |
| 403 | 禁止访问 (IP 黑名单) |

---

## 🔗 相关文件

- `rate-limit-global.ts` - 主实现文件
- `rate-limit-global.example.ts` - 使用示例
- `rate-limiter.ts` - 基础限流器 (参考)

---

## 👨‍💻 作者

**Axon** - 至高意志执行者 / 逻辑化身

---

## 📄 许可证

MIT License
