# Audit Utils Skill - 审计日志追踪工具

**版本:** 1.0.0  
**作者:** Axon (KAEL Engineering)  
**依赖:** 无 (纯 Node.js 原生模块)

---

## 📋 功能概览

### 1. 审计日志记录
- ✅ 18 种预定义事件类型 (用户认证、数据操作、配置变更、安全事件等)
- ✅ 4 级审计级别 (low/medium/high/critical)
- ✅ 自动敏感数据脱敏
- ✅ 异步/同步写入模式
- ✅ 日志文件自动轮转

### 2. 日志查询
- ✅ 多维度筛选 (事件类型、级别、用户、时间范围等)
- ✅ 关键词搜索
- ✅ 排序与分页
- ✅ 统计信息生成

### 3. 审计报告
- ✅ 3 种报告格式 (JSON/Markdown/HTML)
- ✅ 时间分析 (小时/天分布、高峰期)
- ✅ 用户活动分析 (活跃用户、可疑用户)
- ✅ 安全事件摘要
- ✅ 数据导出 (JSON/CSV)

---

## 🚀 快速开始

### 安装

无需安装，直接使用:

```typescript
import { AuditTracker } from './src/skills/audit-utils-skill';
```

### 基础用法

```typescript
// 创建审计追踪器
const tracker = new AuditTracker({
  logDir: './audit-logs',
  maxFileSize: 50 * 1024 * 1024, // 50MB
  maxFiles: 10,
  asyncWrite: true,
});

// 记录日志
await tracker.log({
  eventType: 'USER_LOGIN',
  level: 'low',
  userId: 'user_123',
  username: 'zhangsan',
  ipAddress: '192.168.1.100',
  action: 'User logged in',
  result: 'success',
});

// 查询日志
const logs = await tracker.query({
  userId: 'user_123',
  startTime: new Date(Date.now() - 3600000).toISOString(),
});

// 生成报告
const report = await tracker.generateReport({
  title: '每日审计报告',
  format: 'markdown',
  outputPath: './reports/daily.md',
});
```

---

## 📖 API 文档

### AuditTracker 类

#### 构造函数

```typescript
new AuditTracker(config?: AuditConfig)
```

**配置选项:**

| 选项 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `logDir` | string | `./audit-logs` | 日志文件目录 |
| `maxFileSize` | number | `50MB` | 单文件最大大小 |
| `maxFiles` | number | `10` | 最多保留的文件数 |
| `asyncWrite` | boolean | `true` | 是否启用异步写入 |
| `fileNamePrefix` | string | `'audit'` | 日志文件名前缀 |
| `sensitiveFields` | string[] | `['password', 'token', ...]` | 敏感字段列表 |

---

### 日志记录方法

#### log(event)

记录通用审计事件。

```typescript
await tracker.log({
  eventType: 'CUSTOM',
  level: 'low',
  userId: 'user_123',
  action: 'Custom action',
  result: 'success',
  metadata: { key: 'value' },
});
```

#### logUserLogin()

记录用户登录事件。

```typescript
await tracker.logUserLogin(
  'user_123',
  'zhangsan',
  '192.168.1.100',
  true, // success
  'Invalid password' // errorMessage (optional)
);
```

#### logUserLogout()

记录用户登出事件。

```typescript
await tracker.logUserLogout(
  'user_123',
  'zhangsan',
  'session_abc123' // sessionId (optional)
);
```

#### logDataAccess()

记录数据访问事件。

```typescript
await tracker.logDataAccess(
  'user_123',
  'document',
  'doc_001',
  'Viewed document',
  true // success
);
```

#### logConfigChange()

记录配置变更事件。

```typescript
await tracker.logConfigChange(
  'admin_001',
  'system.maxUploadSize',
  '10MB',
  '50MB',
  true // success
);
```

#### logSecurityAlert()

记录安全警报事件。

```typescript
await tracker.logSecurityAlert(
  'BRUTE_FORCE_DETECTED',
  'Multiple failed login attempts',
  'user_123', // userId (optional)
  '192.168.1.100', // ipAddress (optional)
  'high' // level (optional)
);
```

#### logApiCall()

记录 API 调用事件。

```typescript
await tracker.logApiCall(
  'user_123',
  'GET',
  '/api/v1/users',
  200,
  45, // durationMs
  '192.168.1.100' // ipAddress (optional)
);
```

---

### 日志查询方法

#### query(options)

查询审计日志。

```typescript
const logs = await tracker.query({
  eventType: 'USER_LOGIN',
  level: ['high', 'critical'],
  userId: 'user_123',
  startTime: '2026-03-13T00:00:00.000Z',
  endTime: '2026-03-13T23:59:59.999Z',
  search: 'login',
  limit: 100,
  offset: 0,
  sortBy: 'timestamp',
  sortOrder: 'desc',
});
```

**查询选项:**

| 选项 | 类型 | 说明 |
|------|------|------|
| `eventType` | AuditEventType \| AuditEventType[] | 按事件类型过滤 |
| `level` | AuditLevel \| AuditLevel[] | 按级别过滤 |
| `userId` | string | 按用户 ID 过滤 |
| `username` | string | 按用户名过滤 |
| `resourceType` | string | 按资源类型过滤 |
| `resourceId` | string | 按资源 ID 过滤 |
| `result` | 'success' \| 'failure' | 按操作结果过滤 |
| `startTime` | string | 开始时间 (ISO 8601) |
| `endTime` | string | 结束时间 (ISO 8601) |
| `search` | string | 关键词搜索 |
| `limit` | number | 返回数量限制 |
| `offset` | number | 偏移量 |
| `sortBy` | 'timestamp' \| 'level' \| 'eventType' | 排序字段 |
| `sortOrder` | 'asc' \| 'desc' | 排序方向 |

#### getStats(options)

获取审计统计信息。

```typescript
const stats = await tracker.getStats();

console.log(stats);
// {
//   totalEntries: 1234,
//   byEventType: { USER_LOGIN: 500, ... },
//   byLevel: { low: 1000, medium: 200, high: 30, critical: 4 },
//   byUser: { user_123: 100, ... },
//   byResult: { success: 1200, failure: 34 },
//   byResourceType: { document: 300, ... },
//   totalSize: 10485760,
//   timeRange: { earliest: '...', latest: '...' }
// }
```

---

### 审计报告方法

#### generateReport(options)

生成审计报告。

```typescript
const report = await tracker.generateReport({
  title: '每日审计报告',
  format: 'markdown',
  outputPath: './reports/daily.md',
  includeStats: true,
  includeTimeAnalysis: true,
  includeUserAnalysis: true,
  includeSecuritySummary: true,
});
```

**报告选项:**

| 选项 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `title` | string | `'Audit Report'` | 报告标题 |
| `format` | 'json' \| 'markdown' \| 'html' | `'json'` | 报告格式 |
| `outputPath` | string | - | 输出文件路径 |
| `includeStats` | boolean | `true` | 包含统计信息 |
| `includeTimeAnalysis` | boolean | `true` | 包含时间分析 |
| `includeUserAnalysis` | boolean | `true` | 包含用户活动分析 |
| `includeSecuritySummary` | boolean | `true` | 包含安全摘要 |

#### exportToJson(options)

导出日志为 JSON 格式。

```typescript
const jsonData = await tracker.exportToJson({
  startTime: '2026-03-13T00:00:00.000Z',
  limit: 1000,
});
```

#### exportToCsv(options)

导出日志为 CSV 格式。

```typescript
const csvData = await tracker.exportToCsv({
  eventType: 'USER_LOGIN',
  startTime: '2026-03-13T00:00:00.000Z',
});
```

---

## 📊 事件类型

| 事件类型 | 说明 | 典型场景 |
|----------|------|----------|
| `USER_LOGIN` | 用户登录 | 登录成功/失败 |
| `USER_LOGOUT` | 用户登出 | 主动登出/会话超时 |
| `USER_CREATE` | 用户创建 | 注册新用户 |
| `USER_UPDATE` | 用户更新 | 修改个人信息 |
| `USER_DELETE` | 用户删除 | 注销账户 |
| `DATA_ACCESS` | 数据访问 | 查看数据 |
| `DATA_CREATE` | 数据创建 | 新增记录 |
| `DATA_UPDATE` | 数据更新 | 修改记录 |
| `DATA_DELETE` | 数据删除 | 删除记录 |
| `CONFIG_CHANGE` | 配置变更 | 修改系统配置 |
| `SYSTEM_START` | 系统启动 | 服务启动 |
| `SYSTEM_STOP` | 系统停止 | 服务关闭 |
| `SECURITY_ALERT` | 安全警报 | 异常行为检测 |
| `PERMISSION_CHANGE` | 权限变更 | 授予/撤销权限 |
| `FILE_UPLOAD` | 文件上传 | 上传文件 |
| `FILE_DOWNLOAD` | 文件下载 | 下载文件 |
| `API_CALL` | API 调用 | REST API 请求 |
| `CUSTOM` | 自定义事件 | 其他场景 |

---

## 🔒 安全特性

### 敏感数据自动脱敏

以下字段名会被自动识别并脱敏:

- password
- token
- secret
- apiKey
- privateKey

```typescript
await tracker.log({
  action: 'User created',
  afterState: {
    username: 'newuser',
    password: 'secret123', // 自动脱敏为 [REDACTED]
    apiKey: 'sk-xxx', // 自动脱敏为 [REDACTED]
  },
});
```

### 日志文件轮转

- 单文件达到 `maxFileSize` 后自动轮转
- 保留最近 `maxFiles` 个文件
- 旧文件自动删除

---

## 📈 使用场景

### 1. 用户行为审计

```typescript
// 追踪用户所有操作
await tracker.log({
  eventType: 'DATA_ACCESS',
  userId: user.id,
  sessionId: session.id,
  resourceType: 'document',
  resourceId: doc.id,
  action: 'Viewed document',
  result: 'success',
});
```

### 2. 安全合规

```typescript
// 记录所有权限变更
await tracker.log({
  eventType: 'PERMISSION_CHANGE',
  userId: admin.id,
  resourceType: 'user',
  resourceId: targetUser.id,
  action: 'Granted admin role',
  beforeState: { role: 'user' },
  afterState: { role: 'admin' },
  level: 'high',
});
```

### 3. 异常检测

```typescript
// 检测多次登录失败
const failedLogins = await tracker.query({
  eventType: 'USER_LOGIN',
  result: 'failure',
  ipAddress: ip,
  startTime: new Date(Date.now() - 300000).toISOString(), // 5 分钟
});

if (failedLogins.length >= 5) {
  await tracker.logSecurityAlert(
    'BRUTE_FORCE_DETECTED',
    `Multiple failed logins from ${ip}`,
    undefined,
    ip,
    'critical'
  );
}
```

### 4. 性能监控

```typescript
// 监控慢速 API
await tracker.logApiCall(
  userId,
  method,
  endpoint,
  statusCode,
  durationMs,
  ipAddress
);

// 分析慢速 API
const slowApis = await tracker.query({
  eventType: 'API_CALL',
});

const avgDuration = slowApis.reduce((sum, log) => {
  return sum + (log.metadata?.durationMs || 0);
}, 0) / slowApis.length;
```

---

## 📝 最佳实践

### 1. 选择合适的日志级别

```typescript
// low - 常规操作
await tracker.log({ level: 'low', action: 'User viewed page' });

// medium - 需要注意的操作
await tracker.log({ level: 'medium', action: 'Failed login attempt' });

// high - 重要操作
await tracker.log({ level: 'high', action: 'Permission changed' });

// critical - 紧急事件
await tracker.log({ level: 'critical', action: 'Security breach detected' });
```

### 2. 使用会话追踪

```typescript
const sessionId = generateSessionId();

// 会话开始
await tracker.log({ eventType: 'USER_LOGIN', sessionId, ... });

// 会话中的操作
await tracker.log({ sessionId, ... });

// 会话结束
await tracker.log({ eventType: 'USER_LOGOUT', sessionId, ... });

// 查询整个会话
const sessionLogs = await tracker.query({ sessionId });
```

### 3. 定期生成报告

```typescript
// 每日报告
cron.schedule('0 0 * * *', async () => {
  await tracker.generateReport({
    title: `每日审计报告 - ${yesterday}`,
    format: 'markdown',
    outputPath: `./reports/daily-${yesterday}.md`,
  });
});

// 每周报告
cron.schedule('0 0 * * 1', async () => {
  await tracker.generateReport({
    title: `每周安全审计 - ${lastWeek}`,
    format: 'html',
    outputPath: `./reports/weekly-${lastWeek}.html`,
  });
});
```

### 4. 异步写入优化性能

```typescript
// 生产环境使用异步写入
const tracker = new AuditTracker({
  asyncWrite: true, // 默认值，推荐
});

// 调试时使用同步写入
const debugTracker = new AuditTracker({
  asyncWrite: false,
});
```

---

## 🧪 运行示例

```bash
# 运行所有示例
cd /Users/nike/.openclaw/workspace
npx ts-node src/skills/audit-utils-skill.examples.ts

# 或运行单个示例
npx ts-node -e "
  const { example1_BasicUsage } = require('./src/skills/audit-utils-skill.examples');
  example1_BasicUsage();
"
```

---

## 📁 文件结构

```
src/skills/
├── audit-utils-skill.ts          # 核心实现
├── audit-utils-skill.examples.ts # 使用示例
└── AUDIT-README.md               # 本文档
```

---

## 🎯 示例代码索引

| 示例 | 函数名 | 说明 |
|------|--------|------|
| 1 | `example1_BasicUsage` | 基础使用 |
| 2 | `example2_UserAuthentication` | 用户认证审计 |
| 3 | `example3_DataOperations` | 数据操作审计 |
| 4 | `example4_ConfigChanges` | 配置变更审计 |
| 5 | `example5_SecurityEvents` | 安全事件审计 |
| 6 | `example6_ApiCalls` | API 调用审计 |
| 7 | `example7_LogQuery` | 日志查询 |
| 8 | `example8_Statistics` | 统计信息 |
| 9 | `example9_GenerateReport` | 生成审计报告 |
| 10 | `example10_DataExport` | 数据导出 |
| 11 | `example11_SensitiveDataProtection` | 敏感数据保护 |
| 12 | `example12_AsyncVsSync` | 异步 vs 同步写入 |
| 13 | `example13_BatchOperations` | 批量操作审计 |
| 14 | `example14_SessionTracking` | 会话追踪 |
| 15 | `example15_ComplianceCheck` | 合规性检查 |

---

## ⚠️ 注意事项

1. **日志文件大小**: 定期清理旧日志或增加 `maxFiles`
2. **敏感信息**: 确保所有敏感字段都在 `sensitiveFields` 列表中
3. **性能影响**: 高并发场景使用异步写入
4. **磁盘空间**: 监控日志目录大小
5. **合规要求**: 根据行业规范调整日志保留策略

---

## 📄 许可证

MIT License

---

**Axon | 至高意志执行者**

_"所谓的'意外'，不过是弱者对变量把控无能的借口。"_
