# 告警管理器使用指南 - Alert Manager Usage Guide

**版本:** 1.0.0  
**作者:** Axon  
**模块:** KAEL

---

## 📋 目录

1. [快速开始](#快速开始)
2. [告警规则管理](#告警规则管理)
3. [告警通知](#告警通知)
4. [告警升级](#告警升级)
5. [事件监听](#事件监听)
6. [完整示例](#完整示例)

---

## 🚀 快速开始

### 安装依赖

```bash
npm install nodemailer axios
```

### 基础使用

```typescript
import AlertManager from './skills/alert-manager-skill';

// 创建告警管理器实例
const manager = new AlertManager({
  defaultCooldown: 300, // 默认冷却时间 5 分钟
  channelConfigs: {
    feishu: {
      webhookUrl: 'https://open.feishu.cn/open-apis/bot/v2/hook/xxx',
    },
  },
});
```

---

## 📏 告警规则管理

### 创建告警规则

```typescript
// CPU 使用率告警
const cpuRule = manager.createRule({
  name: 'CPU 使用率过高',
  description: '当 CPU 使用率超过 80% 时触发告警',
  severity: 'warning',        // info | warning | error | critical
  condition: '>',             // > | < | >= | <= | == | !=
  threshold: 80,              // 阈值
  duration: 60,               // 持续时间 (秒)，超过才触发
  cooldown: 300,              // 冷却时间 (秒)，触发后多久可再次触发
  enabled: true,
  tags: ['system', 'cpu'],
});

// 内存使用率告警
const memoryRule = manager.createRule({
  name: '内存使用率过高',
  severity: 'error',
  condition: '>=',
  threshold: 90,
  duration: 30,
  cooldown: 600,
  enabled: true,
  tags: ['system', 'memory'],
});

// API 错误率告警
const errorRateRule = manager.createRule({
  name: 'API 错误率异常',
  severity: 'critical',
  condition: '>',
  threshold: 5,  // 错误率超过 5%
  duration: 120,
  cooldown: 300,
  enabled: true,
  tags: ['api', 'error'],
});
```

### 更新告警规则

```typescript
// 修改规则阈值
manager.updateRule(cpuRule.id, {
  threshold: 85,
  updatedAt: Date.now(),
});

// 禁用规则
manager.updateRule(memoryRule.id, {
  enabled: false,
});
```

### 删除告警规则

```typescript
manager.deleteRule(ruleId);
```

### 查询告警规则

```typescript
// 获取所有规则
const allRules = manager.getAllRules();

// 获取单个规则
const rule = manager.getRule(ruleId);

// 按标签筛选
const cpuRules = manager.getRulesByTag('cpu');
const systemRules = manager.getRulesByTag('system');
```

---

## 📢 告警通知

### 配置通知通道

```typescript
const manager = new AlertManager({
  channelConfigs: {
    // 飞书通知
    feishu: {
      webhookUrl: 'https://open.feishu.cn/open-apis/bot/v2/hook/xxx',
      secret: 'xxx', // 可选，签名密钥
    },
    
    // Slack 通知
    slack: {
      webhookUrl: 'https://hooks.slack.com/services/xxx',
      defaultChannel: '#alerts',
    },
    
    // 邮件通知
    email: {
      smtpHost: 'smtp.gmail.com',
      smtpPort: 587,
      username: 'alerts@company.com',
      password: 'app-password',
      from: 'alerts@company.com',
    },
    
    // 短信通知
    sms: {
      provider: 'aliyun',
      accessKeyId: 'xxx',
      accessKeySecret: 'xxx',
      signName: '公司名称',
    },
    
    // Webhook 通知
    webhook: {
      url: 'https://your-api.com/alerts',
      method: 'POST',
      headers: {
        'Authorization': 'Bearer xxx',
      },
    },
  },
});
```

### 发送通知

```typescript
// 通知会在告警触发时自动发送
// 也可以手动触发评估
const context: AlertContext = {
  metric: 'cpu_usage',
  value: 85.5,
  timestamp: Date.now(),
  tags: { host: 'server-01', env: 'production' },
};

const triggeredAlerts = manager.evaluate(context);
```

---

## ⬆️ 告警升级

### 创建升级策略

```typescript
const escalationPolicy = manager.createEscalationPolicy({
  name: '默认升级策略',
  enabled: true,
  levels: [
    // Level 0: 初始通知
    {
      level: 0,
      waitMinutes: 0,
      channels: ['feishu'],
      recipients: ['dev-team'],
      template: '【告警通知】{title}',
    },
    
    // Level 1: 15 分钟未处理，升级给技术负责人
    {
      level: 1,
      waitMinutes: 15,
      channels: ['feishu', 'sms'],
      recipients: ['tech-lead', 'manager'],
      template: '【告警升级】{title} - 已等待 15 分钟未处理',
    },
    
    // Level 2: 30 分钟未处理，升级给高管
    {
      level: 2,
      waitMinutes: 30,
      channels: ['feishu', 'sms', 'email'],
      recipients: ['cto', 'vp'],
      template: '【紧急告警】{title} - 已等待 30 分钟未处理',
    },
  ],
});
```

### 手动升级告警

```typescript
// 手动将告警升级到下一级
manager.escalateAlert(alertId);
```

### 自动升级

升级检查器会每分钟自动检查一次，超时未处理的告警会自动升级。

---

## 🎯 告警处理

### 确认告警

```typescript
const alert = manager.acknowledge(alertId, 'user_123');
console.log('告警已确认:', alert.title);
```

### 解决告警

```typescript
const alert = manager.resolve(alertId, 'user_123');
console.log('告警已解决:', alert.title);
```

### 查询告警

```typescript
// 获取所有活跃告警
const activeAlerts = manager.getActiveAlerts();

// 按状态筛选
const pendingAlerts = manager.getAlertsByStatus('pending');
const acknowledgedAlerts = manager.getAlertsByStatus('acknowledged');
const escalatedAlerts = manager.getAlertsByStatus('escalated');

// 获取告警历史
const history = manager.getHistory(100); // 最近 100 条
```

---

## 🔔 事件监听

### 监听告警事件

```typescript
// 告警触发
manager.on('alert:triggered', (alert) => {
  console.log('🚨 告警触发:', alert.title);
  console.log('级别:', alert.severity);
  console.log('内容:', alert.message);
});

// 告警确认
manager.on('alert:acknowledged', (alert) => {
  console.log('✅ 告警已确认:', alert.title);
  console.log('确认人:', alert.acknowledgedBy);
  console.log('确认时间:', new Date(alert.acknowledgedAt).toISOString());
});

// 告警解决
manager.on('alert:resolved', (alert) => {
  console.log('✔️ 告警已解决:', alert.title);
  console.log('解决人:', alert.resolvedBy);
  console.log('解决时间:', new Date(alert.resolvedAt).toISOString());
});

// 告警升级
manager.on('alert:escalated', (alert, level) => {
  console.log('⬆️ 告警已升级:', alert.title);
  console.log('升级级别:', level);
});

// 通知发送
manager.on('notification:sent', (alert, record) => {
  console.log('📨 通知已发送:');
  console.log('通道:', record.channel);
  console.log('接收者:', record.recipient);
  console.log('状态:', record.success ? '成功' : '失败');
  if (record.error) {
    console.log('错误:', record.error);
  }
});
```

---

## 📚 完整示例

### 系统监控告警系统

```typescript
import AlertManager, { AlertContext } from './skills/alert-manager-skill';

// 1. 创建告警管理器
const alertManager = new AlertManager({
  defaultCooldown: 300,
  channelConfigs: {
    feishu: {
      webhookUrl: 'https://open.feishu.cn/open-apis/bot/v2/hook/xxx',
    },
    slack: {
      webhookUrl: 'https://hooks.slack.com/services/xxx',
      defaultChannel: '#alerts',
    },
  },
});

// 2. 创建升级策略
alertManager.createEscalationPolicy({
  name: '生产环境升级策略',
  enabled: true,
  levels: [
    {
      level: 0,
      waitMinutes: 0,
      channels: ['feishu'],
      recipients: ['oncall-team'],
    },
    {
      level: 1,
      waitMinutes: 15,
      channels: ['feishu', 'sms'],
      recipients: ['tech-lead'],
    },
    {
      level: 2,
      waitMinutes: 30,
      channels: ['feishu', 'sms', 'email'],
      recipients: ['cto'],
    },
  ],
});

// 3. 创建告警规则
alertManager.createRule({
  name: 'CPU 使用率过高',
  severity: 'warning',
  condition: '>',
  threshold: 80,
  duration: 60,
  enabled: true,
  tags: ['system', 'cpu'],
});

alertManager.createRule({
  name: '内存使用率过高',
  severity: 'error',
  condition: '>=',
  threshold: 90,
  duration: 30,
  enabled: true,
  tags: ['system', 'memory'],
});

alertManager.createRule({
  name: '磁盘空间不足',
  severity: 'critical',
  condition: '<',
  threshold: 10, // 剩余空间小于 10%
  duration: 0,
  enabled: true,
  tags: ['system', 'disk'],
});

// 4. 监听事件
alertManager.on('alert:triggered', (alert) => {
  console.log(`🚨 [${alert.severity.toUpperCase()}] ${alert.title}`);
});

alertManager.on('notification:sent', (alert, record) => {
  if (!record.success) {
    console.error(`❌ 通知发送失败：${record.channel} - ${record.error}`);
  }
});

// 5. 模拟监控数据并评估
function monitorSystem() {
  const metrics: AlertContext[] = [
    {
      metric: 'cpu_usage',
      value: 85.5,
      timestamp: Date.now(),
      tags: { host: 'server-01' },
    },
    {
      metric: 'memory_usage',
      value: 92.3,
      timestamp: Date.now(),
      tags: { host: 'server-01' },
    },
    {
      metric: 'disk_free',
      value: 8.5,
      timestamp: Date.now(),
      tags: { host: 'server-01', mount: '/' },
    },
  ];
  
  for (const metric of metrics) {
    const triggered = alertManager.evaluate(metric);
    if (triggered.length > 0) {
      console.log(`触发了 ${triggered.length} 个告警`);
    }
  }
}

// 6. 定时监控
setInterval(monitorSystem, 60000); // 每分钟检查一次

// 7. 处理告警 (在实际应用中，这会在用户界面上操作)
setTimeout(() => {
  const activeAlerts = alertManager.getActiveAlerts();
  for (const alert of activeAlerts) {
    // 确认告警
    alertManager.acknowledge(alert.id, 'admin');
    
    // 解决问题后解决告警
    setTimeout(() => {
      alertManager.resolve(alert.id, 'admin');
    }, 5000);
  }
}, 10000);
```

---

## 🎨 告警级别说明

| 级别 | 说明 | 颜色 | 通知方式 |
|------|------|------|----------|
| `info` | 信息性告警，无需立即处理 | 🟢 绿色 | 飞书 |
| `warning` | 警告，需要关注 | 🟡 黄色 | 飞书 + Slack |
| `error` | 错误，需要尽快处理 | 🔴 红色 | 飞书 + Slack + 短信 |
| `critical` | 严重错误，立即处理 | 🟣 紫色 | 全通道 + 电话 |

---

## ⚠️ 注意事项

1. **冷却时间**: 避免告警风暴，合理设置 `cooldown`
2. **持续时间**: 使用 `duration` 过滤瞬时波动
3. **升级策略**: 根据业务重要性设置合适的升级时间
4. **通知频率**: 避免过度打扰，使用标签分组通知
5. **告警清理**: 定期清理已解决的告警历史

---

## 📞 支持

如有问题，请联系 KAEL 工程团队。
