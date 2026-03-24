/**
 * Advanced Health Check Middleware - Usage Examples
 * 
 * @author KAEL (Axon Engineering)
 * @version 2.0.0
 */

import express from 'express';
import { 
  createAdvancedHealthChecker, 
  getAdvancedHealthStatus,
  advancedPresets,
  type HealthCheckConfig 
} from './health-check-advanced';

// ============================================================================
// 示例 1: 基础使用 (仅系统资源监控)
// ============================================================================

const app1 = express();

// 使用默认配置创建健康检查中间件
app1.use(createAdvancedHealthChecker({
  serviceName: 'MyApp',
  version: '1.0.0',
}));

// 访问：GET /health

// ============================================================================
// 示例 2: 完整配置 (数据库 + Redis + 外部 API)
// ============================================================================

const app2 = express();

const fullConfig: HealthCheckConfig = {
  serviceName: 'AxonClaw API',
  version: '2.0.0',
  
  // SQLite 数据库检查
  database: {
    type: 'sqlite',
    dbPath: '/path/to/axonclaw.db',
    timeout: 5000,
  },
  
  // Redis 检查
  redis: {
    host: 'localhost',
    port: 6379,
    password: 'your-password', // 可选
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
      critical: true, // 关键依赖，失败会导致整体 unhealthy
    },
    {
      name: 'Email Service',
      url: 'https://api.sendgrid.com',
      method: 'HEAD',
      timeout: 3000,
      critical: false, // 非关键依赖，失败只会导致 degraded
    },
    {
      name: 'CDN',
      url: 'https://cdn.example.com',
      method: 'HEAD',
      timeout: 2000,
      critical: false,
    },
  ],
  
  // 阈值配置
  diskWarningThreshold: 80,
  diskCriticalThreshold: 90,
  memoryWarningThreshold: 80,
  memoryCriticalThreshold: 90,
  cpuWarningThreshold: 80,
  cpuCriticalThreshold: 90,
};

app2.use(createAdvancedHealthChecker(fullConfig));

// ============================================================================
// 示例 3: 使用预定义配置
// ============================================================================

const app3 = express();

// 使用 Web 服务预设
app3.use(createAdvancedHealthChecker({
  ...advancedPresets.web,
  serviceName: 'Web Server',
}));

// 使用 API 服务预设
app4.use(createAdvancedHealthChecker({
  ...advancedPresets.api,
  serviceName: 'API Server',
}));

// 使用数据库服务预设
app5.use(createAdvancedHealthChecker({
  ...advancedPresets.database,
  serviceName: 'Database Server',
  database: {
    type: 'postgres',
    connectionString: 'postgresql://user:pass@localhost:5432/dbname',
  },
}));

// ============================================================================
// 示例 4: 独立函数调用 (非中间件)
// ============================================================================

async function manualHealthCheck() {
  const config: HealthCheckConfig = {
    serviceName: 'Manual Check',
    database: {
      type: 'sqlite',
      dbPath: './data/app.db',
    },
    redis: {
      host: 'localhost',
      port: 6379,
    },
  };

  const health = await getAdvancedHealthStatus(config);
  
  console.log('Health Status:', health.status);
  console.log('Timestamp:', health.timestamp);
  console.log('Summary:', health.summary);
  
  // 输出示例:
  // {
  //   "status": "healthy",
  //   "timestamp": "2026-03-13T09:00:00.000Z",
  //   "uptime": 3600,
  //   "version": "2.0.0",
  //   "serviceName": "Manual Check",
  //   "checks": {
  //     "database": { "healthy": true, "message": "SQLite database OK", ... },
  //     "redis": { "healthy": true, "message": "Redis connection OK", ... },
  //     "disk": { "healthy": true, "message": "Disk usage: 45.2%", ... },
  //     "memory": { "healthy": true, "message": "Memory usage: 62.1%", ... },
  //     "cpu": { "healthy": true, "message": "CPU load: 1.2 (15.0%)", ... }
  //   },
  //   "summary": {
  //     "totalChecks": 5,
  //     "passedChecks": 5,
  //     "failedChecks": 0,
  //     "warnings": []
  //   }
  // }
}

// ============================================================================
// 示例 5: PostgreSQL 数据库检查
// ============================================================================

const app6 = express();

app6.use(createAdvancedHealthChecker({
  serviceName: 'PostgreSQL App',
  database: {
    type: 'postgres',
    connectionString: 'postgresql://username:password@localhost:5432/database',
    timeout: 5000,
  },
  redis: {
    host: 'localhost',
    port: 6379,
  },
}));

// ============================================================================
// 示例 6: MySQL 数据库检查
// ============================================================================

const app7 = express();

app7.use(createAdvancedHealthChecker({
  serviceName: 'MySQL App',
  database: {
    type: 'mysql',
    connectionString: 'mysql://username:password@localhost:3306/database',
    timeout: 5000,
  },
}));

// ============================================================================
// 示例 7: MongoDB 检查
// ============================================================================

const app8 = express();

app8.use(createAdvancedHealthChecker({
  serviceName: 'MongoDB App',
  database: {
    type: 'mongodb',
    connectionString: 'mongodb://localhost:27017/mydb',
    timeout: 5000,
  },
}));

// ============================================================================
// 示例 8: 定时健康检查 (用于监控)
// ============================================================================

import { createAdvancedHealthChecker } from './health-check-advanced';

const checker = createAdvancedHealthChecker({
  serviceName: 'Monitored Service',
  database: { type: 'sqlite', dbPath: './app.db' },
  redis: { host: 'localhost', port: 6379 },
});

// 每 30 秒执行一次健康检查
setInterval(async () => {
  // 注意：这里需要手动调用 checkAll 方法
  // 实际使用中可以通过扩展类来实现
  console.log('Running scheduled health check...');
}, 30000);

// ============================================================================
// 示例 9: 自定义健康检查端点
// ============================================================================

const app9 = express();
const healthChecker = new (require('./health-check-advanced').AdvancedHealthChecker)({
  serviceName: 'Custom Endpoint App',
  database: { type: 'sqlite', dbPath: './app.db' },
});

app9.get('/api/v1/health', async (req, res) => {
  const health = await healthChecker.checkAll();
  res.json(health);
});

app9.get('/api/v1/health/summary', async (req, res) => {
  const health = await healthChecker.checkAll();
  res.json({
    status: health.status,
    uptime: health.uptime,
    summary: health.summary,
  });
});

// ============================================================================
// 示例 10: Docker 健康检查
// ============================================================================

/**
 * 在 Dockerfile 中使用:
 * 
 * HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
 *   CMD curl -f http://localhost:3000/health || exit 1
 * 
 * 或在 docker-compose.yml 中:
 * 
 * services:
 *   app:
 *     healthcheck:
 *       test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
 *       interval: 30s
 *       timeout: 5s
 *       retries: 3
 *       start_period: 5s
 */

// ============================================================================
// 响应示例
// ============================================================================

/**
 * GET /health 响应示例 (healthy):
 * 
 * {
 *   "status": "healthy",
 *   "timestamp": "2026-03-13T09:00:00.000Z",
 *   "uptime": 3600.123,
 *   "version": "2.0.0",
 *   "serviceName": "AxonClaw API",
 *   "checks": {
 *     "database": {
 *       "healthy": true,
 *       "message": "SQLite database OK",
 *       "responseTime": 2,
 *       "details": { "type": "sqlite", "path": "/app/axonclaw.db", "size": 1048576 }
 *     },
 *     "redis": {
 *       "healthy": true,
 *       "message": "Redis connection OK",
 *       "responseTime": 3,
 *       "details": { "host": "localhost", "port": 6379 }
 *     },
 *     "externalAPIs": [
 *       {
 *         "healthy": true,
 *         "message": "External API OK (200)",
 *         "responseTime": 150,
 *         "details": { "name": "Payment Gateway", "url": "...", "critical": true, "status": 200 }
 *       }
 *     ],
 *     "disk": {
 *       "healthy": true,
 *       "message": "Disk usage: 45.2%",
 *       "totalGB": 512,
 *       "freeGB": 280.5,
 *       "usagePercent": 45.2
 *     },
 *     "memory": {
 *       "healthy": true,
 *       "message": "Memory usage: 62.1%",
 *       "totalGB": 16,
 *       "freeGB": 6.06,
 *       "usagePercent": 62.1
 *     },
 *     "cpu": {
 *       "healthy": true,
 *       "message": "CPU load: 1.2 (15.0%)",
 *       "usagePercent": 15,
 *       "cores": 8,
 *       "load": [1.2, 1.5, 1.3]
 *     }
 *   },
 *   "summary": {
 *     "totalChecks": 6,
 *     "passedChecks": 6,
 *     "failedChecks": 0,
 *     "warnings": []
 *   }
 * }
 * 
 * GET /health 响应示例 (degraded):
 * 
 * {
 *   "status": "degraded",
 *   "timestamp": "2026-03-13T09:00:00.000Z",
 *   "uptime": 3600.123,
 *   "version": "2.0.0",
 *   "serviceName": "AxonClaw API",
 *   "checks": {
 *     "database": { "healthy": true, ... },
 *     "redis": { "healthy": true, ... },
 *     "externalAPIs": [
 *       {
 *         "healthy": false,
 *         "message": "External API returned 503 (expected 200)",
 *         "responseTime": 1500,
 *         "details": { "name": "Email Service", "url": "...", "critical": false, "status": 503 }
 *       }
 *     ],
 *     "disk": { "healthy": true, ... },
 *     "memory": { "healthy": true, ... },
 *     "cpu": { "healthy": true, ... }
 *   },
 *   "summary": {
 *     "totalChecks": 6,
 *     "passedChecks": 5,
 *     "failedChecks": 1,
 *     "warnings": ["Email Service: External API returned 503 (expected 200)"]
 *   }
 * }
 * 
 * GET /health 响应示例 (unhealthy):
 * 
 * {
 *   "status": "unhealthy",
 *   "timestamp": "2026-03-13T09:00:00.000Z",
 *   "uptime": 3600.123,
 *   "version": "2.0.0",
 *   "serviceName": "AxonClaw API",
 *   "checks": {
 *     "database": {
 *       "healthy": false,
 *       "message": "Database connection failed",
 *       "error": "Connection refused",
 *       "responseTime": 5001
 *     },
 *     "redis": { "healthy": true, ... },
 *     "disk": { "healthy": true, ... },
 *     "memory": { "healthy": true, ... },
 *     "cpu": { "healthy": true, ... }
 *   },
 *   "summary": {
 *     "totalChecks": 5,
 *     "passedChecks": 4,
 *     "failedChecks": 1,
 *     "warnings": ["Database connection failed"]
 *   }
 * }
 */

export { app1, app2, app3, fullConfig, manualHealthCheck };
