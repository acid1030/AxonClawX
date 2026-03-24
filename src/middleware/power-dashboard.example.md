# KAEL Power Dashboard - 使用指南

## 概述

KAEL Power Dashboard 是一个实时系统监控中间件，提供：

- ⚡ **CPU/内存使用率** - 实时监控系统资源
- 📊 **请求统计** - 追踪请求数量、响应时间
- ❤️ **健康状态** - 自动健康检测和预警
- 📈 **可视化仪表板** - 美观的实时监控界面

---

## 快速开始

### 1. 引入中间件

```typescript
import { createPowerDashboard } from './middleware/power-dashboard';

// 创建仪表板中间件
const dashboard = createPowerDashboard({
  sampleInterval: 5000,    // 采样间隔 (毫秒)
  historySize: 100,        // 历史记录保留数量
});

// 在你的 HTTP 服务器中使用
import { createServer } from 'http';

const server = createServer((req, res) => {
  dashboard.middleware(req, res, () => {
    // 其他路由处理
    res.writeHead(404);
    res.end('Not Found');
  });
});

server.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
  console.log('Dashboard: http://localhost:3000/dashboard');
});
```

### 2. 访问仪表板

打开浏览器访问：`http://localhost:3000/dashboard`

---

## API 端点

### GET /dashboard

返回监控仪表板 HTML 页面。

### GET /api/metrics

返回当前系统指标。

**响应示例:**

```json
{
  "timestamp": 1710326400000,
  "cpu": {
    "usage": 45.67,
    "cores": 8,
    "load": [2.34, 2.12, 1.98]
  },
  "memory": {
    "total": 16384,
    "used": 8192,
    "free": 8192,
    "usage": 50.0
  },
  "requests": {
    "total": 1234,
    "active": 5,
    "perSecond": 42,
    "avgResponseTime": 85.5
  },
  "health": {
    "status": "healthy",
    "uptime": 3600,
    "pid": 12345
  }
}
```

### GET /api/metrics/history

返回历史指标数据（数组）。

### GET /api/health

快速健康检查端点。

**响应示例:**

```json
{
  "status": "healthy",
  "uptime": 3600,
  "timestamp": 1710326400000
}
```

---

## 配置选项

```typescript
interface DashboardConfig {
  /** 采样间隔 (毫秒)，默认 5000 */
  sampleInterval?: number;
  
  /** 历史记录保留数量，默认 100 */
  historySize?: number;
  
  /** 仪表板服务端口 (如果使用独立服务) */
  port?: number;
  
  /** 是否启用 WebSocket 实时推送 (未来功能) */
  enableWebSocket?: boolean;
}
```

---

## 高级用法

### 访问监控器实例

```typescript
const dashboard = createPowerDashboard();

// 获取当前指标
const metrics = dashboard.getMetrics();
console.log('CPU Usage:', metrics.cpu.usage);

// 获取历史记录
const history = dashboard.getHistory();
console.log('Historical data:', history);

// 监听指标更新事件
dashboard.monitor.on('metrics', (metrics) => {
  console.log('New metrics:', metrics);
});
```

### 与 Express 集成

```typescript
import express from 'express';
import { createPowerDashboard } from './middleware/power-dashboard';

const app = express();
const dashboard = createPowerDashboard();

// 使用中间件
app.use(dashboard.middleware);

// 自定义路由
app.get('/api/status', (req, res) => {
  const metrics = dashboard.getMetrics();
  res.json(metrics);
});

app.listen(3000);
```

---

## 健康状态说明

| 状态 | 条件 | 说明 |
|------|------|------|
| `healthy` | CPU < 70% 且 内存 < 70% | 系统运行正常 |
| `warning` | CPU > 70% 或 内存 > 70% | 资源使用较高，需关注 |
| `critical` | CPU > 90% 或 内存 > 90% | 资源紧张，立即处理 |

---

## 仪表板功能

### 实时监控卡片

- **CPU 使用率** - 显示当前使用率、核心数、负载平均值
- **内存使用** - 显示已用/总内存、使用率百分比
- **请求统计** - 总请求数、活跃请求、QPS、平均响应时间
- **系统健康** - 运行时间、健康状态、进程 ID

### 性能趋势图

- 支持切换 CPU/内存/请求 三种指标
- 实时更新的折线图
- 最近 60 个数据点

### 最近请求列表

- 显示最近的请求记录
- 包含请求方法、路径、状态码、响应时间

---

## 注意事项

1. **性能影响**: 默认 5 秒采样间隔，对系统性能影响极小
2. **内存占用**: 历史记录限制为 100 条，防止内存泄漏
3. **生产环境**: 建议添加认证中间件保护仪表板页面
4. **安全**: `/api/*` 端点应限制访问权限

---

## 故障排除

### 仪表板无法加载

检查 HTML 文件路径是否正确：
```typescript
// 确保文件存在于 src/monitor/dashboard-power.html
```

### 数据不更新

1. 检查浏览器控制台是否有错误
2. 确认 `/api/metrics` 端点可访问
3. 检查采样间隔配置

### 内存占用过高

减少历史记录数量：
```typescript
createPowerDashboard({ historySize: 50 });
```

---

## 技术栈

- **运行时**: Node.js
- **语言**: TypeScript
- **依赖**: 仅使用 Node.js 内置模块 (os, fs, path, events)
- **前端**: 原生 HTML/CSS/JavaScript (无框架依赖)

---

## 版本历史

### v1.0.0 (2026-03-13)

- ✨ 初始版本发布
- ⚡ CPU/内存实时监控
- 📊 请求统计功能
- ❤️ 健康状态检测
- 📈 可视化仪表板

---

**Author:** Axon (KAEL Engineering)  
**License:** MIT
