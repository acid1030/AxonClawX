# Audit Trail Skill - 审计日志追踪工具

**版本:** 1.0.0  
**作者:** Axon (KAEL Engineering)  
**交付时间:** 2026-03-13  
**依赖:** 无 (纯 Node.js 原生模块)

---

## 📦 交付物

1. `src/skills/audit-trail-skill.ts` - 主模块 (重新导出 audit-utils-skill)
2. `src/skills/audit-trail-skill.examples.ts` - 15 个使用示例
3. 本文档 - 快速参考

---

## 🚀 快速开始

### 1. 导入模块

```typescript
import { AuditTracker } from './src/skills/audit-trail-skill';
```

### 2. 创建追踪器

```typescript
const tracker = new AuditTracker({
  logDir: './audit-logs',
  maxFileSize: 50 * 1024 * 1024, // 50MB
  maxFiles: 10,
  asyncWrite: true,
});
```

### 3. 记录日志

```typescript
// 基础日志
await tracker.log({
  eventType: 'CUSTOM',
  level: 'low',
  userId: 'user_001',
  action: '用户操作',
  result: 'success',
});

// 快捷方法
await tracker.logUserLogin('user_001', 'zhangsan', '192.168.1.100', true);
await tracker.logDataAccess('user_001', 'document', 'doc_001', '查看文档', true);
await tracker.logSecurityAlert('BRUTE_FORCE', '检测到暴力破解', undefined, '192.168.1.100', 'critical');
```

### 4. 查询日志

```typescript
const logs = await tracker.query({
  userId: 'user_001',
  eventType: 'USER_LOGIN',
  startTime: new Date(Date.now() - 3600000).toISOString(),
  limit: 100,
});
```

### 5. 生成报告

```typescript
const report = await tracker.generateReport({
  title: '每日审计报告',
  format: 'markdown',
  outputPath: './reports/daily.md',
});
```

---

## 📖 核心功能

### 1. 审计事件 (18 种预定义类型)

| 事件类型 | 说明 | 快捷方法 |
|----------|------|----------|
| `USER_LOGIN` | 用户登录 | `logUserLogin()` |
| `USER_LOGOUT` | 用户登出 | `logUserLogout()` |
| `DATA_ACCESS` | 数据访问 | `logDataAccess()` |
| `DATA_CREATE` | 数据创建 | `logDataCreate()` |
| `DATA_UPDATE` | 数据更新 | `logDataUpdate()` |
| `DATA_DELETE` | 数据删除 | `logDataDelete()` |
| `CONFIG_CHANGE` | 配置变更 | `logConfigChange()` |
| `SECURITY_ALERT` | 安全警报 | `logSecurityAlert()` |
| `API_CALL` | API 调用 | `logApiCall()` |
| `CUSTOM` | 自定义事件 | `log()` |

### 2. 日志存储

- ✅ 自动文件轮转 (达到大小限制自动创建新文件)
- ✅ 异步写入 (默认启用，高性能)
- ✅ 敏感数据自动脱敏 (password, token, apiKey 等)
- ✅ 旧日志自动清理

### 3. 查询分析

```typescript
// 多维度筛选
const logs = await tracker.query({
  eventType: 'USER_LOGIN',
  level: ['high', 'critical'],
  userId: 'user_001',
  startTime: '2026-03-13T00:00:00.000Z',
  endTime: '2026-03-13T23:59:59.999Z',
  search: 'login',
  limit: 100,
  offset: 0,
  sortBy: 'timestamp',
  sortOrder: 'desc',
});

// 统计信息
const stats = await tracker.getStats();
// { totalEntries, byEventType, byLevel, byUser, byResult, ... }
```

---

## 📊 15 个使用示例

运行所有示例:

```bash
cd /Users/nike/.openclaw/workspace
npx ts-node src/skills/audit-trail-skill.examples.ts
```

### 示例列表

| # | 示例 | 函数名 | 说明 |
|---|------|--------|------|
| 1 | 基础使用 | `example1_basicUsage` | 创建追踪器、记录简单事件 |
| 2 | 用户认证 | `example2_userAuthentication` | 登录/登出审计 |
| 3 | 数据操作 | `example3_dataOperations` | CRUD 操作审计 |
| 4 | 配置变更 | `example4_configChanges` | 系统配置变更 |
| 5 | 安全事件 | `example5_securityEvents` | 安全警报记录 |
| 6 | API 调用 | `example6_apiCalls` | REST API 审计 |
| 7 | 日志查询 | `example7_logQuery` | 多维度筛选查询 |
| 8 | 统计信息 | `example8_statistics` | 获取统计数据 |
| 9 | 生成报告 | `example9_generateReport` | Markdown/HTML报告 |
| 10 | 数据导出 | `example10_dataExport` | JSON/CSV导出 |
| 11 | 敏感数据保护 | `example11_sensitiveDataProtection` | 自动脱敏 |
| 12 | 会话追踪 | `example12_sessionTracking` | 完整会话审计 |
| 13 | 批量操作 | `example13_batchOperations` | 批量记录日志 |
| 14 | 合规性检查 | `example14_complianceCheck` | 未授权访问检测 |
| 15 | 性能监控 | `example15_performanceMonitoring` | 慢速 API 分析 |

---

## 🔒 安全特性

### 敏感数据自动脱敏

以下字段名会被自动识别并替换为 `[REDACTED]`:

- password
- token
- secret
- apiKey
- privateKey

```typescript
await tracker.log({
  action: '用户创建',
  afterState: {
    username: 'newuser',
    password: 'secret123', // → [REDACTED]
    apiKey: 'sk-xxx', // → [REDACTED]
  },
});
```

### 日志文件轮转

```typescript
const tracker = new AuditTracker({
  maxFileSize: 50 * 1024 * 1024, // 50MB 自动轮转
  maxFiles: 10, // 保留最近 10 个文件
});
```

---

## 📈 使用场景

### 用户行为审计

```typescript
await tracker.log({
  eventType: 'DATA_ACCESS',
  userId: user.id,
  sessionId: session.id,
  resourceType: 'document',
  resourceId: doc.id,
  action: '查看文档',
  result: 'success',
});
```

### 安全合规

```typescript
await tracker.log({
  eventType: 'PERMISSION_CHANGE',
  userId: admin.id,
  action: '授予管理员权限',
  beforeState: { role: 'user' },
  afterState: { role: 'admin' },
  level: 'high',
});
```

### 异常检测

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
    `多次登录失败 from ${ip}`,
    undefined,
    ip,
    'critical'
  );
}
```

---

## ⚡ 最佳实践

### 1. 选择合适的日志级别

```typescript
// low - 常规操作
await tracker.log({ level: 'low', action: '查看页面' });

// medium - 需要注意
await tracker.log({ level: 'medium', action: '登录失败' });

// high - 重要操作
await tracker.log({ level: 'high', action: '权限变更' });

// critical - 紧急事件
await tracker.log({ level: 'critical', action: '安全漏洞' });
```

### 2. 使用会话追踪

```typescript
const sessionId = `session_${Date.now()}`;

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
// 每日报告 (cron)
await tracker.generateReport({
  title: `每日审计报告 - ${date}`,
  format: 'markdown',
  outputPath: `./reports/daily-${date}.md`,
});
```

---

## 📁 文件结构

```
src/skills/
├── audit-utils-skill.ts          # 核心实现 (29KB)
├── audit-utils-skill.examples.ts # 详细示例 (18KB)
├── audit-trail-skill.ts          # 快捷导出 (本交付物)
├── audit-trail-skill.examples.ts # 快速示例 (14KB, 本交付物)
└── AUDIT-README.md               # 完整文档
```

---

## ✅ 验收清单

- [x] `src/skills/audit-trail-skill.ts` 创建完成
- [x] `src/skills/audit-trail-skill.examples.ts` 创建完成 (15 个示例)
- [x] 支持 18 种审计事件类型
- [x] 支持 4 级审计级别 (low/medium/high/critical)
- [x] 支持多维度查询筛选
- [x] 支持统计信息生成
- [x] 支持报告生成 (JSON/Markdown/HTML)
- [x] 支持数据导出 (JSON/CSV)
- [x] 敏感数据自动脱敏
- [x] 日志文件自动轮转
- [x] 异步写入优化性能

---

## 🎯 5 分钟完成！

**任务:** 审计追踪  
**功能:** 审计事件、日志存储、查询分析  
**交付物:** 代码文件 + 使用示例  
**状态:** ✅ 完成

---

**Axon | 至高意志执行者**

_"所谓的'意外'，不过是弱者对变量把控无能的借口。"_
