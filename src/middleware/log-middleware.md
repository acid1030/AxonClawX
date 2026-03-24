# HTTP 请求日志中间件

**作者:** KAEL (AxonClaw Engineering)  
**版本:** 1.0.0  
**位置:** `src/middleware/log-middleware.ts`

---

## 📋 功能特性

### 1. 请求/响应日志
- ✅ 记录请求方法、路径、状态码
- ✅ 记录响应时间 (高精度)
- ✅ 可选记录客户端 IP、User-Agent
- ✅ 可选记录请求/响应大小
- ✅ 自动生成请求 ID (支持 X-Request-ID 头)

### 2. 性能统计
- ✅ 实时聚合性能指标
- ✅ 平均/最大/最小响应时间
- ✅ P95/P99 百分位响应时间
- ✅ 每秒请求数 (RPS)
- ✅ 状态码分类统计
- ✅ 可配置时间窗口

### 3. 日志分级
- ✅ 自动根据状态码选择日志级别
  - 5xx → `error`
  - 4xx → `warn`
  - 其他 → 配置级别
- ✅ 支持 debug/info/warn/error 四级
- ✅ 慢请求自动告警

### 4. 多种日志格式
- ✅ `simple` - 简洁格式 (生产环境)
- ✅ `detailed` - 详细格式 (调试)
- ✅ `colored` - 彩色输出 (开发环境)
- ✅ `json` - JSON 格式 (日志收集系统)

---

## 🚀 快速开始

### 基础用法

```typescript
import express from 'express';
import { httpLogger } from './middleware/log-middleware';

const app = express();

// 使用默认配置
app.use(httpLogger());

app.listen(3000);
```

### 使用预设配置 (推荐)

```typescript
import { loggerPresets } from './middleware/log-middleware';

// 根据环境选择
if (process.env.NODE_ENV === 'production') {
  app.use(loggerPresets.production());
} else {
  app.use(loggerPresets.development());
}
```

---

## ⚙️ 配置选项

```typescript
interface LogMiddlewareConfig {
  logger?: Logger;              // 自定义 Logger 实例
  level?: LogLevel;             // 日志级别：debug | info | warn | error
  skipPaths?: RegExp[];         // 跳过日志的路径正则
  includeIp?: boolean;          // 是否包含 IP (默认：true)
  includeUserAgent?: boolean;   // 是否包含 User-Agent (默认：false)
  includeSize?: boolean;        // 是否包含请求/响应大小 (默认：true)
  format?: 'json' | 'simple' | 'detailed' | 'colored'; // 日志格式
  enableStats?: boolean;        // 是否启用性能统计 (默认：true)
  statsWindowMs?: number;       // 统计窗口大小 (ms) (默认：60000)
  logSlowRequests?: boolean;    // 是否记录慢请求 (默认：true)
  slowRequestThresholdMs?: number; // 慢请求阈值 (ms) (默认：1000)
}
```

---

## 📊 性能统计 API

### 获取统计数据

```typescript
import { getPerformanceStats } from './middleware/log-middleware';

app.get('/metrics', (req, res) => {
  const stats = getPerformanceStats();
  res.json(stats);
});
```

### 获取格式化报告

```typescript
import { getPerformanceReport } from './middleware/log-middleware';

app.get('/metrics/report', (req, res) => {
  res.type('text');
  res.send(getPerformanceReport());
});
```

### 重置统计

```typescript
import { resetPerformanceStats } from './middleware/log-middleware';

app.post('/metrics/reset', (req, res) => {
  resetPerformanceStats();
  res.json({ success: true });
});
```

---

## 📝 输出示例

### 开发模式 (colored)

```
GET /api/users 200 52.34ms
POST /api/login 401 8.12ms
GET /api/slow-endpoint 200 1502.45ms
[WARN] Slow request detected: GET /api/slow-endpoint took 1502.45ms
```

### 详细模式 (detailed)

```
[req123-abc] GET /api/users | 200 | 52.34ms | IP: 127.0.0.1 | Req: 256B | Res: 1.2KB
```

### 生产模式 (simple)

```
GET /api/users 200 52.34ms
POST /api/login 401 8.12ms
```

### JSON 格式

```json
{
  "requestId": "req123-abc",
  "method": "GET",
  "path": "/api/users",
  "statusCode": 200,
  "responseTime": 52.34,
  "ip": "127.0.0.1",
  "requestSize": 256,
  "responseSize": 1228,
  "timestamp": "2026-03-13T09:23:45.123Z"
}
```

### 性能统计报告

```
╔══════════════════════════════════════════════════════════╗
║           HTTP Performance Statistics                    ║
╠══════════════════════════════════════════════════════════╣
║  Total Requests:     1245                                 ║
║  Avg Response Time:  45.23                               ms ║
║  Min Response Time:  2.12                                ms ║
║  Max Response Time:  1502.45                             ms ║
║  P95 Response Time:  125.67                              ms ║
║  P99 Response Time:  345.89                              ms ║
║  Requests/Second:    20.75                                ║
╠══════════════════════════════════════════════════════════╣
║  Status Codes:                                            ║
║    2xx: 1198                                              ║
║    3xx: 12                                                ║
║    4xx: 28                                                ║
║    5xx: 7                                                 ║
╚══════════════════════════════════════════════════════════╝
```

---

## 🎯 预设配置

### production

- 格式：`simple`
- 级别：`info`
- 性能统计：启用
- 慢请求阈值：1000ms
- 适用：生产环境

### development

- 格式：`colored`
- 级别：`debug`
- 性能统计：启用
- 慢请求阈值：500ms
- 包含：IP, User-Agent, 请求/响应大小
- 适用：开发环境

### json

- 格式：`json`
- 级别：`info`
- 性能统计：启用
- 包含：所有字段
- 适用：ELK/Splunk/Datadog

### silent

- 格式：`simple`
- 级别：`error`
- 性能统计：禁用
- 慢请求：禁用
- 适用：高频接口 (webhook、心跳)

### verbose

- 格式：`detailed`
- 级别：`debug`
- 性能统计：启用
- 慢请求阈值：100ms
- 包含：所有字段
- 适用：调试模式

---

## 🔧 高级用法

### 跳过特定路径

```typescript
app.use(httpLogger({
  skipPaths: [
    /^\/health/,
    /^\/metrics/,
    /^\/favicon.ico/,
    /^\/static\//,
  ]
}));
```

### 自定义 Logger

```typescript
import { Logger } from '../logger/logger';

const customLogger = new Logger({
  logDir: './logs/http',
  defaultLevel: 'debug',
});

app.use(httpLogger({
  logger: customLogger,
  level: 'debug',
}));
```

### 性能监控 Dashboard

```typescript
import { getPerformanceStats } from './middleware/log-middleware';

app.get('/admin/performance', (req, res) => {
  const stats = getPerformanceStats();
  res.json({
    success: true,
    data: stats,
    timestamp: new Date().toISOString(),
  });
});
```

### 定时打印统计

```typescript
import { getPerformanceReport } from './middleware/log-middleware';

// 每 5 分钟打印一次
setInterval(() => {
  const stats = getPerformanceStats();
  if (stats && stats.totalRequests > 0) {
    console.log('\n' + getPerformanceReport());
  }
}, 300000);
```

---

## 📈 性能统计数据结构

```typescript
interface PerformanceStats {
  totalRequests: number;      // 总请求数
  avgResponseTime: number;    // 平均响应时间 (ms)
  maxResponseTime: number;    // 最慢响应时间 (ms)
  minResponseTime: number;    // 最快响应时间 (ms)
  p95ResponseTime: number;    // P95 响应时间 (ms)
  p99ResponseTime: number;    // P99 响应时间 (ms)
  requestsPerSecond: number;  // 每秒请求数 (RPS)
  statusCodes: {
    '2xx': number;            // 成功请求数
    '3xx': number;            // 重定向数
    '4xx': number;            // 客户端错误数
    '5xx': number;            // 服务器错误数
  };
  windowStart: number;        // 统计窗口起始时间戳
}
```

---

## 🎨 日志级别自动选择

中间件会根据响应状态码自动调整日志级别：

| 状态码 | 日志级别 | 颜色 |
|--------|----------|------|
| 5xx    | error    | 🔴 红 |
| 4xx    | warn     | 🟡 黄 |
| 3xx    | info     | 🔵 青 |
| 2xx    | info     | 🟢 绿 |

**注意:** 即使配置 `level: 'info'`,500 错误也会被记录为 `error` 级别。

---

## 🚨 慢请求检测

当启用 `logSlowRequests` 时，超过阈值的请求会额外记录一条警告日志：

```typescript
app.use(httpLogger({
  logSlowRequests: true,
  slowRequestThresholdMs: 500, // 超过 500ms 视为慢请求
}));
```

输出示例：

```
[WARN] Slow request detected: GET /api/slow-endpoint took 1502.45ms
```

---

## 📦 相关文件

- `src/middleware/log-middleware.ts` - 中间件实现
- `src/middleware/log-middleware.example.ts` - 完整使用示例
- `src/middleware/log-middleware.md` - 本文档

---

## 🔗 相关中间件

- `src/middleware/logger.ts` - 基础日志中间件 (简化版)
- `src/logger/logger.ts` - Logger 核心类
- `src/middleware/request-id.ts` - 请求 ID 生成中间件

---

## ✅ 最佳实践

1. **生产环境使用 `production` 预设** - 简洁格式，减少日志量
2. **开发环境使用 `development` 预设** - 彩色输出，便于调试
3. **跳过健康检查和指标端点** - 避免日志污染
4. **启用性能统计** - 监控接口性能
5. **设置合理的慢请求阈值** - 及时发现性能问题
6. **使用 JSON 格式集成日志系统** - 便于日志收集和分析

---

**最后更新:** 2026-03-13  
**维护者:** KAEL (AxonClaw Engineering)
