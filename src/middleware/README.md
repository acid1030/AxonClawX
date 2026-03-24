# 审计日志中间件使用指南

## 📋 概述

`audit-log.ts` 是一个功能完整的审计日志中间件，提供:

- ✅ **请求/响应日志** - 自动记录所有 HTTP 请求
- ✅ **用户操作追踪** - 手动记录关键业务操作
- ✅ **敏感操作告警** - 自动检测并告警敏感操作
- ✅ **数据脱敏** - 自动脱敏敏感字段 (密码、token 等)
- ✅ **日志轮转** - 自动按日期分片和文件大小轮转
- ✅ **查询过滤** - 支持多维度日志查询

---

## 🚀 快速开始

### 1. 基础使用

```typescript
import express from 'express';
import { auditMiddleware, auditLogger } from '@/middleware/audit-log';

const app = express();

// 应用中间件 (自动记录所有请求)
app.use(auditMiddleware);

// 在路由中记录自定义事件
app.post('/api/users', (req, res) => {
  // 业务逻辑...
  
  auditLogger.logUserAction(
    req.user.id,
    'create_user',
    `创建新用户：${req.body.username}`
  );
  
  res.json({ success: true });
});
```

### 2. 完整示例

```typescript
// server.ts
import express from 'express';
import { auditMiddleware, auditLogger } from '@/middleware/audit-log';

const app = express();

// 配置中间件
app.use(auditMiddleware);

// 登录接口
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const success = validateUser(username, password);
  
  // 记录登录事件
  auditLogger.logLogin(
    username,
    success,
    req.ip,
    { userAgent: req.headers['user-agent'] }
  );
  
  if (success) {
    res.json({ token: generateToken(username) });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

// 删除用户 (敏感操作)
app.delete('/api/users/:id', (req, res) => {
  // 记录数据删除
  auditLogger.logDataAccess(
    req.user.id,
    'user',
    req.params.id,
    'delete'
  );
  
  // 业务逻辑...
  res.json({ success: true });
});

// 配置变更 (敏感操作)
app.put('/api/config', (req, res) => {
  auditLogger.logConfigChange(
    req.user.id,
    req.body.key,
    oldValue,
    req.body.value
  );
  
  res.json({ success: true });
});

// 权限变更 (高敏感操作)
app.post('/api/permissions', (req, res) => {
  auditLogger.logPermissionChange(
    req.user.id,
    req.body.targetUserId,
    req.body.permission,
    req.body.granted
  );
  
  res.json({ success: true });
});

// 全局错误处理
app.use((err: Error, req: any, res: any, next: any) => {
  auditLogger.logError(err, req, {
    route: req.path,
    method: req.method
  });
  
  res.status(500).json({ error: 'Internal Server Error' });
});

// 设置告警回调
auditLogger.on('log', (entry) => {
  if (entry.level === 'alert') {
    // 发送告警通知 (邮件、Slack 等)
    sendAlert(entry);
  }
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
```

---

## 📖 API 文档

### AuditLogger 类

#### 构造函数

```typescript
const logger = new AuditLogger(config?: Partial<AuditLogConfig>);
```

**配置选项:**

| 选项 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `logPath` | string | `'./logs/audit'` | 日志文件路径 |
| `maxFileSize` | number | `100` | 最大文件大小 (MB) |
| `retentionDays` | number | `30` | 日志保留天数 |
| `enableConsole` | boolean | `true` | 启用控制台输出 |
| `logRequestBody` | boolean | `true` | 记录请求体 |
| `logResponseBody` | boolean | `false` | 记录响应体 |
| `sensitiveFields` | string[] | `[...]` | 敏感字段列表 |
| `sensitivePaths` | RegExp[] | `[...]` | 敏感路径模式 |
| `onAlert` | function | `undefined` | 告警回调函数 |

#### 方法

##### `log(entry)` - 记录自定义日志

```typescript
logger.log({
  level: 'info',           // 'info' | 'warn' | 'error' | 'alert'
  eventType: 'user_action',
  userId: 'user-123',
  description: '用户执行了某个操作',
  metadata: { key: 'value' },
  isSensitive: true
});
```

##### `logRequest(req)` - 记录请求开始

```typescript
const requestId = logger.logRequest(req);
```

##### `logResponse(req, res, duration, requestId)` - 记录请求结束

```typescript
logger.logResponse(req, res, duration, requestId);
```

##### `logError(error, req?, metadata?)` - 记录错误

```typescript
logger.logError(error, req, {
  route: req.path,
  method: req.method
});
```

##### `logUserAction(userId, action, description, metadata?)` - 记录用户操作

```typescript
logger.logUserAction(
  'user-123',
  'create_post',
  '创建新文章',
  { postId: 'post-456' }
);
```

##### `logLogin(userId, success, ip, metadata?)` - 记录登录事件

```typescript
logger.logLogin(
  'user-123',
  true,  // 成功/失败
  '192.168.1.1',
  { userAgent: 'Mozilla/5.0...' }
);
```

##### `logLogout(userId, ip)` - 记录登出事件

```typescript
logger.logLogout('user-123', '192.168.1.1');
```

##### `logDataAccess(userId, resourceType, resourceId, action)` - 记录数据访问

```typescript
// action: 'read' | 'write' | 'delete'
logger.logDataAccess('user-123', 'user', 'user-456', 'delete');
```

##### `logConfigChange(userId, configKey, oldValue, newValue)` - 记录配置变更

```typescript
logger.logConfigChange(
  'admin-123',
  'max_upload_size',
  10 * 1024 * 1024,
  20 * 1024 * 1024
);
```

##### `logPermissionChange(userId, targetUserId, permission, granted)` - 记录权限变更

```typescript
logger.logPermissionChange(
  'admin-123',
  'user-456',
  'admin_access',
  true  // 授予/撤销
);
```

##### `getRecentLogs(limit?)` - 获取最近的日志

```typescript
const logs = logger.getRecentLogs(100); // 默认 100 条
```

##### `queryLogs(filters)` - 查询日志

```typescript
const sensitiveLogs = logger.queryLogs({
  eventType: 'security_alert',
  userId: 'user-123',
  level: 'alert',
  startTime: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  endTime: new Date().toISOString(),
  isSensitive: true
});
```

##### `cleanup()` - 清理旧日志

```typescript
logger.cleanup(); // 删除超过 retentionDays 的日志
```

---

## 🎯 使用场景

### 1. 安全审计

```typescript
// 监控所有敏感操作
auditLogger.on('log', (entry) => {
  if (entry.isSensitive) {
    console.log('🔒 敏感操作:', entry.description);
  }
});
```

### 2. 合规性报告

```typescript
// 生成每日审计报告
function generateDailyReport() {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  
  const logs = auditLogger.queryLogs({
    startTime: yesterday.toISOString(),
    endTime: new Date().toISOString()
  });
  
  return {
    totalEvents: logs.length,
    sensitiveEvents: logs.filter(l => l.isSensitive).length,
    alerts: logs.filter(l => l.level === 'alert').length,
    errors: logs.filter(l => l.level === 'error').length
  };
}
```

### 3. 用户行为分析

```typescript
// 分析用户活跃度
function getUserActivity(userId: string, days: number = 7) {
  const startTime = new Date();
  startTime.setDate(startTime.getDate() - days);
  
  const logs = auditLogger.queryLogs({
    userId,
    startTime: startTime.toISOString()
  });
  
  return {
    totalActions: logs.length,
    logins: logs.filter(l => l.eventType === 'user_login').length,
    dataAccess: logs.filter(l => l.eventType === 'data_access').length,
    dataModifications: logs.filter(l => l.eventType === 'data_modify').length
  };
}
```

### 4. 实时告警

```typescript
// 配置告警回调
const auditMiddleware = createAuditMiddleware({
  onAlert: (entry) => {
    // 发送到 Slack
    sendSlackMessage({
      channel: '#security-alerts',
      text: `🚨 安全告警: ${entry.description}`,
      attachments: [{
        color: 'danger',
        fields: [
          { title: '用户', value: entry.userId, short: true },
          { title: 'IP', value: entry.ip, short: true },
          { title: '时间', value: entry.timestamp, short: false }
        ]
      }]
    });
    
    // 发送邮件
    sendEmail({
      to: 'security@company.com',
      subject: `安全告警：${entry.eventType}`,
      body: JSON.stringify(entry, null, 2)
    });
  }
});
```

---

## 🔧 自定义配置

### 示例 1: 生产环境配置

```typescript
const productionMiddleware = createAuditMiddleware({
  logPath: '/var/log/axonclaw/audit',
  maxFileSize: 500,      // 500MB
  retentionDays: 90,     // 保留 90 天
  enableConsole: false,  // 关闭控制台输出
  logRequestBody: false, // 不记录请求体 (节省空间)
  logResponseBody: false,
  onAlert: sendToSIEM    // 发送到 SIEM 系统
});
```

### 示例 2: 开发环境配置

```typescript
const devMiddleware = createAuditMiddleware({
  logPath: './logs/audit',
  maxFileSize: 50,
  retentionDays: 7,
  enableConsole: true,
  logRequestBody: true,
  logResponseBody: true,
  sensitiveFields: ['password', 'token']
});
```

### 示例 3: 高安全环境配置

```typescript
const highSecurityMiddleware = createAuditMiddleware({
  logPath: '/secure/audit-logs',
  maxFileSize: 100,
  retentionDays: 365,    // 保留 1 年
  enableConsole: false,
  logRequestBody: true,  // 记录所有请求
  logResponseBody: true, // 记录所有响应
  sensitiveFields: [
    'password', 'token', 'secret', 'key',
    'authorization', 'cookie', 'session',
    'credit_card', 'ssn', 'id_card', 'phone'
  ],
  sensitivePaths: [
    /\/api\/admin/,
    /\/api\/users/,
    /\/api\/payments/,
    /\/api\/delete/,
    /\/api\/export/
  ],
  onAlert: (entry) => {
    // 多重告警
    sendToSIEM(entry);
    sendEmail(entry);
    sendSlack(entry);
  }
});
```

---

## 📊 日志格式

### 日志条目结构

```json
{
  "id": "1710345678901-abc123def",
  "timestamp": "2026-03-13T08:48:00.000Z",
  "level": "alert",
  "eventType": "security_alert",
  "userId": "admin-001",
  "sessionId": "session-xyz",
  "method": "DELETE",
  "path": "/api/users/123",
  "statusCode": 200,
  "duration": 45,
  "ip": "192.168.1.100",
  "userAgent": "Mozilla/5.0...",
  "description": "敏感操作告警：DELETE /api/users/123",
  "isSensitive": true,
  "alertReason": "敏感操作成功执行",
  "metadata": {
    "requestId": "req-123"
  }
}
```

### 日志级别

| 级别 | 说明 | 触发条件 |
|------|------|----------|
| `info` | 普通信息 | 常规请求、成功操作 |
| `warn` | 警告 | 失败登录、敏感操作 |
| `error` | 错误 | 服务器错误、异常 |
| `alert` | 告警 | 敏感操作成功、权限变更 |

---

## 🔒 安全特性

### 1. 自动脱敏

```typescript
// 以下字段会自动脱敏
sensitiveFields: [
  'password', 'token', 'secret', 'key',
  'authorization', 'cookie', 'session'
];

// 原始请求
{
  "username": "admin",
  "password": "secret123",
  "token": "abc123"
}

// 日志中显示
{
  "username": "admin",
  "password": "[REDACTED]",
  "token": "[REDACTED]"
}
```

### 2. 敏感路径检测

```typescript
// 自动检测敏感路径
sensitivePaths: [
  /\/admin\//,
  /\/api\/users\/\d+$/,
  /\/api\/permissions/,
  /\/api\/delete/
];

// 访问这些路径会自动触发告警
DELETE /api/users/123  →  🚨 告警
```

### 3. 日志轮转

- 按日期分片：`audit-2026-03-13.log`
- 按大小轮转：超过 `maxFileSize` 自动备份
- 定期清理：删除超过 `retentionDays` 的日志

---

## 🧪 测试示例

```typescript
// audit-log.test.ts
import { AuditLogger } from './audit-log';

describe('AuditLogger', () => {
  let logger: AuditLogger;

  beforeEach(() => {
    logger = new AuditLogger({
      logPath: './test-logs',
      enableConsole: false
    });
  });

  test('should log user action', () => {
    const entry = logger.logUserAction(
      'user-123',
      'test_action',
      'Test description'
    );

    expect(entry.userId).toBe('user-123');
    expect(entry.eventType).toBe('user_action');
  });

  test('should sanitize sensitive fields', () => {
    const logs = logger.getRecentLogs();
    const log = logs[logs.length - 1];
    
    expect(log.metadata?.password).toBe('[REDACTED]');
  });

  test('should trigger alert on sensitive operation', () => {
    const onAlert = jest.fn();
    logger = new AuditLogger({ onAlert });

    logger.log({
      level: 'alert',
      eventType: 'security_alert',
      description: 'Test alert'
    });

    expect(onAlert).toHaveBeenCalled();
  });
});
```

---

## 📝 最佳实践

### 1. 在应用启动时初始化

```typescript
// app.ts
import { auditLogger } from '@/middleware/audit-log';

// 设置告警处理
auditLogger.on('log', handleAlert);

// 定期清理
setInterval(() => auditLogger.cleanup(), 24 * 60 * 60 * 1000);

// 优雅关闭
process.on('SIGTERM', () => {
  auditLogger.log({
    level: 'info',
    eventType: 'system_event',
    description: '应用关闭'
  });
  process.exit(0);
});
```

### 2. 在关键业务点记录

```typescript
// 所有数据修改操作
app.put('/api/:resource/:id', (req, res) => {
  auditLogger.logDataAccess(
    req.user.id,
    req.params.resource,
    req.params.id,
    'write'
  );
  // ...
});

// 所有删除操作
app.delete('/api/:resource/:id', (req, res) => {
  auditLogger.logDataAccess(
    req.user.id,
    req.params.resource,
    req.params.id,
    'delete'
  );
  // ...
});
```

### 3. 集成监控系统

```typescript
// 发送到 Prometheus
auditLogger.on('log', (entry) => {
  auditLogCounter.inc({
    level: entry.level,
    eventType: entry.eventType
  });
});

// 发送到 ELK
auditLogger.on('log', (entry) => {
  elasticsearchClient.index({
    index: 'audit-logs',
    body: entry
  });
});
```

---

## ⚠️ 注意事项

1. **性能影响**: 记录请求体/响应体会增加 I/O 开销
2. **存储空间**: 根据日志量调整 `maxFileSize` 和 `retentionDays`
3. **隐私合规**: 确保符合 GDPR 等数据保护法规
4. **日志安全**: 保护日志文件不被未授权访问

---

## 📚 相关文档

- [AxonClaw 架构文档](../../docs/AXONCLAW_ARCHITECTURE.md)
- [Gateway 开发指南](../../docs/GATEWAY_DEV.md)
- [安全最佳实践](../../docs/SECURITY_BEST_PRACTICES.md)

---

**最后更新:** 2026-03-13  
**维护者:** KAEL Engineering Team
