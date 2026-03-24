# 高级健康检查中间件

**版本:** 2.0.0  
**作者:** KAEL (Axon Engineering)  
**创建时间:** 2026-03-13

---

## 📋 概述

`health-check-advanced.ts` 提供全面的系统健康监控功能，适用于生产环境的微服务和 API 网关。

### 核心功能

| 功能 | 描述 | 状态 |
|------|------|------|
| 数据库检查 | SQLite/PostgreSQL/MySQL/MongoDB | ✅ |
| Redis 检查 | TCP 连接测试 | ✅ |
| 外部 API 检查 | HTTP 可达性验证 | ✅ |
| 磁盘监控 | 空间使用率分析 | ✅ |
| 内存监控 | RAM 使用率分析 | ✅ |
| CPU 监控 | 负载和核心数统计 | ✅ |
| 健康状态 | healthy/degraded/unhealthy | ✅ |
| 警告系统 | 阈值告警 | ✅ |

---

## 🚀 快速开始

### 基础使用

```typescript
import express from 'express';
import { createAdvancedHealthChecker } from './health-check-advanced';

const app = express();

// 添加健康检查端点
app.use(createAdvancedHealthChecker({
  serviceName: 'MyApp',
  version: '1.0.0',
}));

// 访问：GET /health
```

### 完整配置

```typescript
import { createAdvancedHealthChecker } from './health-check-advanced';

const healthMiddleware = createAdvancedHealthChecker({
  serviceName: 'AxonClaw API',
  version: '2.0.0',
  
  // 数据库配置
  database: {
    type: 'sqlite',
    dbPath: '/path/to/axonclaw.db',
    timeout: 5000,
  },
  
  // Redis 配置
  redis: {
    host: 'localhost',
    port: 6379,
    timeout: 3000,
  },
  
  // 外部 API 检查
  externalAPIs: [
    {
      name: 'Payment Gateway',
      url: 'https://api.stripe.com/health',
      method: 'GET',
      expectedStatus: 200,
      timeout: 5000,
      critical: true,
    },
  ],
  
  // 阈值配置
  diskWarningThreshold: 80,
  diskCriticalThreshold: 90,
  memoryWarningThreshold: 80,
  memoryCriticalThreshold: 90,
  cpuWarningThreshold: 80,
  cpuCriticalThreshold: 90,
});
```

---

## 📊 响应格式

### Healthy 状态

```json
{
  "status": "healthy",
  "timestamp": "2026-03-13T09:00:00.000Z",
  "uptime": 3600.123,
  "version": "2.0.0",
  "serviceName": "AxonClaw API",
  "checks": {
    "database": {
      "healthy": true,
      "message": "SQLite database OK",
      "responseTime": 2,
      "details": {
        "type": "sqlite",
        "path": "/app/axonclaw.db",
        "size": 1048576
      }
    },
    "redis": {
      "healthy": true,
      "message": "Redis connection OK",
      "responseTime": 3,
      "details": {
        "host": "localhost",
        "port": 6379
      }
    },
    "disk": {
      "healthy": true,
      "message": "Disk usage: 45.2%",
      "totalGB": 512,
      "freeGB": 280.5,
      "usagePercent": 45.2
    },
    "memory": {
      "healthy": true,
      "message": "Memory usage: 62.1%",
      "totalGB": 16,
      "freeGB": 6.06,
      "usagePercent": 62.1
    },
    "cpu": {
      "healthy": true,
      "message": "CPU load: 1.2 (15.0%)",
      "usagePercent": 15,
      "cores": 8,
      "load": [1.2, 1.5, 1.3]
    }
  },
  "summary": {
    "totalChecks": 5,
    "passedChecks": 5,
    "failedChecks": 0,
    "warnings": []
  }
}
```

### Degraded 状态

```json
{
  "status": "degraded",
  "summary": {
    "totalChecks": 6,
    "passedChecks": 5,
    "failedChecks": 1,
    "warnings": ["Email Service: External API returned 503"]
  }
}
```

### Unhealthy 状态

```json
{
  "status": "unhealthy",
  "summary": {
    "totalChecks": 5,
    "passedChecks": 3,
    "failedChecks": 2,
    "warnings": ["Database connection failed", "Redis connection failed"]
  }
}
```

---

## ⚙️ 配置选项

### HealthCheckConfig

| 属性 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| `serviceName` | string | 'AxonClaw' | 服务名称 |
| `version` | string | '2.0.0' | 版本号 |
| `database` | DatabaseConfig | - | 数据库配置 |
| `redis` | RedisConfig | - | Redis 配置 |
| `externalAPIs` | ExternalAPIConfig[] | [] | 外部 API 列表 |
| `diskWarningThreshold` | number | 80 | 磁盘警告阈值 (%) |
| `diskCriticalThreshold` | number | 90 | 磁盘严重阈值 (%) |
| `memoryWarningThreshold` | number | 80 | 内存警告阈值 (%) |
| `memoryCriticalThreshold` | number | 90 | 内存严重阈值 (%) |
| `cpuWarningThreshold` | number | 80 | CPU 警告阈值 (%) |
| `cpuCriticalThreshold` | number | 90 | CPU 严重阈值 (%) |

### DatabaseConfig

| 属性 | 类型 | 描述 |
|------|------|------|
| `type` | 'sqlite' \| 'postgres' \| 'mysql' \| 'mongodb' | 数据库类型 |
| `dbPath` | string | SQLite 数据库路径 |
| `connectionString` | string | 连接字符串 (PostgreSQL/MySQL/MongoDB) |
| `timeout` | number | 连接超时 (毫秒) |

### RedisConfig

| 属性 | 类型 | 描述 |
|------|------|------|
| `host` | string | Redis 主机 |
| `port` | number | Redis 端口 |
| `password` | string | 密码 (可选) |
| `timeout` | number | 连接超时 (毫秒) |

### ExternalAPIConfig

| 属性 | 类型 | 描述 |
|------|------|------|
| `name` | string | API 名称 |
| `url` | string | API URL |
| `method` | 'GET' \| 'POST' \| 'HEAD' | 请求方法 |
| `expectedStatus` | number | 期望状态码 |
| `timeout` | number | 超时时间 (毫秒) |
| `critical` | boolean | 是否关键依赖 |

---

## 🎯 预定义配置

### Web 服务预设

```typescript
import { advancedPresets } from './health-check-advanced';

createAdvancedHealthChecker({
  ...advancedPresets.web,
  serviceName: 'Web Server',
});
```

### API 服务预设

```typescript
createAdvancedHealthChecker({
  ...advancedPresets.api,
  serviceName: 'API Server',
});
```

### 数据库服务预设

```typescript
createAdvancedHealthChecker({
  ...advancedPresets.database,
  serviceName: 'Database Server',
});
```

### 严格预设 (关键服务)

```typescript
createAdvancedHealthChecker({
  ...advancedPresets.strict,
  serviceName: 'Critical Service',
});
```

---

## 🔧 使用场景

### 1. Docker 健康检查

```dockerfile
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1
```

### 2. Kubernetes 探针

```yaml
livenessProbe:
  httpGet:
    path: /health
    port: 3000
  initialDelaySeconds: 30
  periodSeconds: 10
  timeoutSeconds: 5
  failureThreshold: 3

readinessProbe:
  httpGet:
    path: /health
    port: 3000
  initialDelaySeconds: 5
  periodSeconds: 5
  timeoutSeconds: 3
  failureThreshold: 3
```

### 3. Prometheus 监控

```typescript
import client from 'prom-client';

const healthGauge = new client.Gauge({
  name: 'app_health_status',
  help: 'Application health status (1=healthy, 0=unhealthy)',
});

app.get('/metrics', async (req, res) => {
  const health = await getAdvancedHealthStatus(config);
  healthGauge.set(health.status === 'healthy' ? 1 : 0);
  res.send(await client.register.metrics());
});
```

### 4. 告警集成

```typescript
setInterval(async () => {
  const health = await getAdvancedHealthStatus(config);
  
  if (health.status === 'unhealthy') {
    await sendAlert({
      severity: 'critical',
      service: health.serviceName,
      message: `Service unhealthy: ${health.summary.warnings.join(', ')}`,
    });
  } else if (health.summary.warnings.length > 0) {
    await sendAlert({
      severity: 'warning',
      service: health.serviceName,
      message: `Service degraded: ${health.summary.warnings.join(', ')}`,
    });
  }
}, 60000); // 每分钟检查
```

---

## 📈 性能指标

| 检查类型 | 平均响应时间 | 资源消耗 |
|---------|-------------|---------|
| 磁盘检查 | < 1ms | 极低 |
| 内存检查 | < 1ms | 极低 |
| CPU 检查 | < 1ms | 极低 |
| SQLite 检查 | 1-5ms | 低 |
| Redis 检查 | 1-10ms | 低 |
| PostgreSQL 检查 | 5-50ms | 中 |
| 外部 API 检查 | 50-5000ms | 中 |

---

## ⚠️ 注意事项

1. **生产环境配置**: 建议设置合理的阈值，避免误报
2. **外部 API**: 关键 API 设置 `critical: true`，非关键设置 `false`
3. **超时设置**: 外部 API 检查建议设置 3-5 秒超时
4. **频率控制**: 健康检查端点建议设置速率限制
5. **敏感信息**: 不要在响应中暴露敏感配置

---

## 📝 更新日志

### v2.0.0 (2026-03-13)
- ✅ 新增 Redis 连接检查
- ✅ 新增外部 API 检查
- ✅ 新增 CPU 负载监控
- ✅ 支持多种数据库类型
- ✅ 添加预定义配置预设
- ✅ 改进健康状态判定逻辑
- ✅ 添加详细警告系统

### v1.0.0
- 基础健康检查功能
- SQLite 支持
- 磁盘和内存监控

---

## 📄 许可证

MIT License - Axon Engineering
