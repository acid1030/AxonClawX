# 多渠道通知技能 - 使用示例

## 📋 目录

1. [快速开始](#快速开始)
2. [基础用法](#基础用法)
3. [高级功能](#高级功能)
4. [实际场景](#实际场景)
5. [最佳实践](#最佳实践)

---

## 快速开始

### 1. 安装与导入

```typescript
import { 
  createNotificationService,
  NotificationChannelType,
  NotificationPriority,
  NotificationType,
} from './notification-channel-skill';
```

### 2. 最小化配置

```typescript
// 仅配置飞书通知
const service = createNotificationService({
  feishu: {
    webhookUrl: 'https://open.feishu.cn/open-apis/bot/v2/hook/YOUR_WEBHOOK_URL',
  },
  defaultChannels: ['feishu'],
});

// 发送第一条通知
await service.sendQuick('Hello', '这是第一条通知！');
```

---

## 基础用法

### 1. 单渠道通知

#### 飞书通知

```typescript
const service = createNotificationService({
  feishu: {
    webhookUrl: 'https://open.feishu.cn/open-apis/bot/v2/hook/xxx',
    secret: 'SECxxx', // 可选，用于签名验证
    senderName: '系统助手',
  },
  defaultChannels: ['feishu'],
});

await service.sendQuick(
  '系统通知',
  '服务器重启完成',
  'success',
  'normal'
);
```

#### 邮件通知

```typescript
const service = createNotificationService({
  email: {
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // true for 465
    from: 'noreply@yourcompany.com',
    username: 'your-email@gmail.com',
    password: 'your-app-password',
    defaultTo: ['admin@yourcompany.com', 'team@yourcompany.com'],
  },
  defaultChannels: ['email'],
});

await service.send({
  title: '每周报告',
  content: `
    本周工作汇总:
    - 完成任务：15 个
    - 修复 Bug: 8 个
    - 代码审查：12 次
  `,
  type: 'info',
  data: {
    '完成任务': 15,
    '修复 Bug': 8,
    '代码审查': 12,
  },
});
```

#### WebSocket 推送

```typescript
const service = createNotificationService({
  websocket: {
    url: 'ws://localhost:8080/notifications',
    token: 'your-auth-token',
    reconnectInterval: 5000,
    maxReconnects: 3,
  },
  defaultChannels: ['websocket'],
});

await service.sendQuick('实时通知', '用户已上线', 'info', 'normal');
```

### 2. 多渠道同时发送

```typescript
const service = createNotificationService({
  feishu: {
    webhookUrl: 'https://open.feishu.cn/open-apis/bot/v2/hook/feishu-hook',
  },
  email: {
    host: 'smtp.example.com',
    port: 587,
    secure: false,
    from: 'system@example.com',
    username: 'system',
    password: 'password',
    defaultTo: ['team@example.com'],
  },
  websocket: {
    url: 'ws://localhost:8080/notifications',
  },
  defaultChannels: ['feishu', 'email', 'websocket'], // 默认所有渠道
});

// 一条通知，三个渠道同时发送
await service.sendQuick(
  '紧急通知',
  '生产环境异常，请立即处理！',
  'error',
  'urgent'
);
```

### 3. 指定渠道发送

```typescript
// 仅发送到飞书
await service.send(
  { title: '通知', content: '内容' },
  ['feishu']
);

// 发送到飞书和邮件
await service.send(
  { title: '通知', content: '内容' },
  ['feishu', 'email']
);
```

---

## 高级功能

### 1. 使用通知模板

#### 使用内置模板

```typescript
const service = createNotificationService({
  feishu: { webhookUrl: '...' },
  enableTemplates: true, // 启用内置模板
});

// 系统告警模板
await service.send(
  {
    title: '数据库连接失败',
    content: '无法连接到主数据库',
    data: {
      error: 'ECONNREFUSED',
      host: 'db.example.com',
      port: 5432,
    },
  },
  ['feishu', 'email'],
  'system-alert' // 使用内置告警模板
);

// 任务完成模板
await service.send(
  {
    title: '数据同步',
    content: '已完成所有数据同步',
    data: {
      processed: 10000,
      duration: '5m 32s',
    },
  },
  ['feishu'],
  'task-complete'
);
```

#### 创建自定义模板

```typescript
// 注册自定义模板
service.registerTemplate({
  id: 'deployment-notice',
  name: '部署通知',
  titleTemplate: '🚀 [{{environment}}] {{title}}',
  contentTemplate: `
部署状态：{{status}}
应用名称：{{appName}}
版本号：{{version}}
部署时间：{{timestamp}}

详细信息:
{{content}}
  `,
  defaultType: 'info',
  defaultPriority: 'normal',
});

// 使用自定义模板
await service.send(
  {
    title: '生产环境部署',
    content: '部署成功，无错误',
    data: {
      environment: 'Production',
      status: '✅ 成功',
      appName: 'MyApp',
      version: 'v2.3.1',
    },
  },
  ['feishu', 'email'],
  'deployment-notice'
);
```

#### 动态模板变量

```typescript
service.registerTemplate({
  id: 'dynamic-template',
  name: '动态模板',
  titleTemplate: '[{{type}}] {{title}} - {{priority}}',
  contentTemplate: `
{{content}}

---
时间：{{timestamp}}
{{#each data}}
{{@key}}: {{this}}
{{/each}}
  `,
});
```

### 2. 通知优先级

```typescript
// 低优先级 - 不会打扰
await service.sendQuick(
  '日常报告',
  '今日任务完成',
  'info',
  'low'
);

// 普通优先级 - 正常通知
await service.sendQuick(
  '任务更新',
  '新任务已分配',
  'info',
  'normal'
);

// 高优先级 - 重要提醒
await service.sendQuick(
  '资源警告',
  '磁盘空间不足',
  'warning',
  'high'
);

// 紧急优先级 - 立即处理
await service.sendQuick(
  '系统崩溃',
  '主服务无响应',
  'error',
  'urgent'
);
```

### 3. 带结构化数据的通知

```typescript
await service.send({
  title: '性能监控报告',
  content: '过去 1 小时性能指标',
  type: 'info',
  priority: 'normal',
  data: {
    'CPU 使用率': '45%',
    '内存使用': '2.3GB / 8GB',
    '磁盘 IO': '120 MB/s',
    '网络流量': '45 Mbps',
    '活跃连接': 1234,
    '响应时间': '120ms',
  },
});
```

### 4. 批量发送与结果处理

```typescript
const result = await service.send(
  {
    title: '系统通知',
    content: '测试批量发送',
  },
  ['feishu', 'email', 'websocket']
);

console.log('发送统计:', {
  总数：result.total,
  成功：result.success,
  失败：result.failed,
});

// 检查每个渠道的结果
result.results.forEach((r) => {
  if (r.success) {
    console.log(`✅ ${r.channel} 发送成功`);
  } else {
    console.error(`❌ ${r.channel} 发送失败：${r.error}`);
  }
});
```

---

## 实际场景

### 场景 1: CI/CD 部署通知

```typescript
import { createNotificationService } from './notification-channel-skill';

const notifier = createNotificationService({
  feishu: { webhookUrl: process.env.FEISHU_WEBHOOK },
  email: {
    host: 'smtp.company.com',
    port: 587,
    secure: false,
    from: 'ci@company.com',
    username: process.env.SMTP_USER,
    password: process.env.SMTP_PASS,
    defaultTo: ['dev-team@company.com'],
  },
  defaultChannels: ['feishu', 'email'],
});

// 部署开始
await notifier.send(
  {
    title: '部署开始',
    content: `正在部署 ${process.env.APP_NAME} 到 ${process.env.ENVIRONMENT}`,
    type: 'info',
    data: {
      分支：process.env.BRANCH,
      版本：process.env.VERSION,
      提交：process.env.COMMIT_HASH,
    },
  },
  undefined,
  'deployment-notice'
);

// 部署完成
try {
  // ... 部署逻辑
  
  await notifier.send(
    {
      title: '部署成功',
      content: '部署已完成，服务正常运行',
      type: 'success',
      data: {
        耗时：'3m 24s',
        状态：'健康',
        实例数：3,
      },
    },
    undefined,
    'task-complete'
  );
} catch (error) {
  await notifier.send(
    {
      title: '部署失败',
      content: `部署过程中发生错误：${error.message}`,
      type: 'error',
      priority: 'urgent',
      data: {
        错误：error.stack,
        回滚：'自动回滚已触发',
      },
    },
    undefined,
    'system-alert'
  );
}
```

### 场景 2: 系统监控告警

```typescript
class SystemMonitor {
  private notifier: NotificationService;
  private thresholds = {
    cpu: 90,
    memory: 85,
    disk: 95,
  };

  constructor() {
    this.notifier = createNotificationService({
      feishu: { webhookUrl: process.env.FEISHU_WEBHOOK },
      websocket: { url: 'ws://localhost:8080/alerts' },
      defaultChannels: ['feishu', 'websocket'],
    });
  }

  async checkMetrics(metrics: any) {
    const alerts = [];

    if (metrics.cpu > this.thresholds.cpu) {
      alerts.push({
        metric: 'CPU',
        value: metrics.cpu,
        threshold: this.thresholds.cpu,
      });
    }

    if (metrics.memory > this.thresholds.memory) {
      alerts.push({
        metric: '内存',
        value: metrics.memory,
        threshold: this.thresholds.memory,
      });
    }

    if (metrics.disk > this.thresholds.disk) {
      alerts.push({
        metric: '磁盘',
        value: metrics.disk,
        threshold: this.thresholds.disk,
      });
    }

    if (alerts.length > 0) {
      await this.sendAlert(alerts);
    }
  }

  private async sendAlert(alerts: any[]) {
    const content = alerts
      .map((a) => `⚠️ ${a.metric}: ${a.value}% (阈值：${a.threshold}%)`)
      .join('\n');

    await this.notifier.send(
      {
        title: '系统资源告警',
        content,
        type: 'warning',
        priority: alerts.length > 1 ? 'urgent' : 'high',
        data: {
          告警数量：alerts.length,
          时间：new Date().toISOString(),
          主机：require('os').hostname(),
        },
      },
      undefined,
      'system-alert'
    );
  }
}

// 使用
const monitor = new SystemMonitor();
setInterval(async () => {
  const metrics = await getSystemMetrics(); // 实现获取系统指标的函数
  await monitor.checkMetrics(metrics);
}, 60000); // 每分钟检查
```

### 场景 3: 用户活动通知

```typescript
class UserActivityNotifier {
  private notifier: NotificationService;

  constructor() {
    this.notifier = createNotificationService({
      feishu: { webhookUrl: process.env.FEISHU_WEBHOOK },
      email: {
        host: 'smtp.company.com',
        port: 587,
        secure: false,
        from: 'notifications@company.com',
        username: process.env.SMTP_USER,
        password: process.env.SMTP_PASS,
      },
      defaultChannels: ['feishu'],
    });
  }

  async notifyNewUser(user: any) {
    await this.notifier.send({
      title: '新用户注册',
      content: `用户 ${user.name} 已完成注册`,
      type: 'success',
      data: {
        用户 ID: user.id,
        邮箱：user.email,
        注册时间：user.createdAt,
        来源：user.source,
      },
    });
  }

  async notifyLoginAttempt(user: any, success: boolean, ip: string) {
    if (!success) {
      await this.notifier.send(
        {
          title: '登录失败告警',
          content: `用户 ${user.email} 登录失败`,
          type: 'warning',
          priority: 'high',
          data: {
            IP 地址：ip,
            时间：new Date().toISOString(),
            原因：'密码错误',
          },
        },
        ['feishu', 'email']
      );
    }
  }

  async notifySubscriptionExpiring(user: any, daysLeft: number) {
    await this.notifier.send(
      {
        title: '订阅即将到期',
        content: `用户 ${user.name} 的订阅还有 ${daysLeft} 天到期`,
        type: 'warning',
        data: {
          用户：user.email,
          订阅类型：user.plan,
          到期日：user.subscriptionEnd,
        },
      },
      ['email']
    );
  }
}
```

### 场景 4: 定时任务报告

```typescript
import { createNotificationService } from './notification-channel-skill';
import cron from 'node-cron';

const dailyReporter = createNotificationService({
  feishu: { webhookUrl: process.env.FEISHU_WEBHOOK },
  email: {
    host: 'smtp.company.com',
    port: 587,
    secure: false,
    from: 'reports@company.com',
    username: process.env.SMTP_USER,
    password: process.env.SMTP_PASS,
    defaultTo: ['management@company.com'],
  },
});

// 每天上午 9 点发送日报
cron.schedule('0 9 * * *', async () => {
  const yesterdayStats = await getYesterdayStats(); // 实现获取统计数据的函数

  await dailyReporter.send(
    {
      title: '每日运营报告',
      content: `
昨日关键指标:
- 新增用户：${yesterdayStats.newUsers}
- 活跃用户：${yesterdayStats.activeUsers}
- 订单数量：${yesterdayStats.orders}
- 收入：¥${yesterdayStats.revenue}
      `,
      type: 'info',
      data: {
        '新增用户': yesterdayStats.newUsers,
        '活跃用户': yesterdayStats.activeUsers,
        '订单数量': yesterdayStats.orders,
        '收入': `¥${yesterdayStats.revenue}`,
        '转化率': `${yesterdayStats.conversionRate}%`,
      },
    },
    ['feishu', 'email'],
    'daily-report'
  );
});
```

---

## 最佳实践

### 1. 配置管理

```typescript
// 使用环境变量管理配置
const config = {
  feishu: {
    webhookUrl: process.env.FEISHU_WEBHOOK_URL,
    secret: process.env.FEISHU_SECRET,
  },
  email: {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    from: process.env.SMTP_FROM,
    username: process.env.SMTP_USERNAME,
    password: process.env.SMTP_PASSWORD,
    defaultTo: process.env.SMTP_DEFAULT_TO?.split(',') || [],
  },
  websocket: {
    url: process.env.WS_NOTIFICATION_URL,
    token: process.env.WS_TOKEN,
  },
  defaultChannels: (process.env.DEFAULT_CHANNELS || 'feishu').split(',') as NotificationChannelType[],
};

const service = createNotificationService(config);
```

### 2. 错误处理

```typescript
try {
  const result = await service.sendQuick('通知', '内容');
  
  if (result.failed > 0) {
    console.warn(`部分渠道发送失败：${result.failed}/${result.total}`);
    
    // 记录失败的渠道
    result.results
      .filter((r) => !r.success)
      .forEach((r) => {
        console.error(`渠道 ${r.channel} 失败：${r.error}`);
      });
  }
} catch (error) {
  console.error('通知发送失败:', error);
  // 实现降级策略，如写入日志文件
}
```

### 3. 渠道降级

```typescript
async function sendWithFallback(content: NotificationContent) {
  // 优先使用 WebSocket
  let result = await service.send(content, ['websocket']);
  
  if (result.failed > 0) {
    // WebSocket 失败，降级到飞书
    result = await service.send(content, ['feishu']);
  }
  
  if (result.failed > 0) {
    // 飞书也失败，降级到邮件
    result = await service.send(content, ['email']);
  }
  
  return result;
}
```

### 4. 通知去重

```typescript
class DedupedNotifier {
  private service: NotificationService;
  private recentNotifications: Map<string, number> = new Map();
  private dedupeWindow = 5 * 60 * 1000; // 5 分钟

  constructor(service: NotificationService) {
    this.service = service;
  }

  async send(content: NotificationContent) {
    const key = this.createDedupeKey(content);
    const now = Date.now();

    // 检查是否在去重窗口内
    const lastSent = this.recentNotifications.get(key);
    if (lastSent && now - lastSent < this.dedupeWindow) {
      console.log('通知已去重:', content.title);
      return;
    }

    // 发送通知
    await this.service.send(content);
    
    // 记录发送时间
    this.recentNotifications.set(key, now);
    
    // 清理过期记录
    this.cleanup();
  }

  private createDedupeKey(content: NotificationContent): string {
    return `${content.title}:${content.content}`;
  }

  private cleanup() {
    const now = Date.now();
    for (const [key, time] of this.recentNotifications.entries()) {
      if (now - time > this.dedupeWindow) {
        this.recentNotifications.delete(key);
      }
    }
  }
}
```

### 5. 性能优化

```typescript
// 批量发送时限制并发数
async function sendBatched(
  service: NotificationService,
  contents: NotificationContent[],
  batchSize = 10
) {
  const results = [];
  
  for (let i = 0; i < contents.length; i += batchSize) {
    const batch = contents.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map((content) => service.send(content))
    );
    results.push(...batchResults);
    
    // 避免频率限制
    if (i + batchSize < contents.length) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
  
  return results;
}
```

---

## 常见问题

### Q: 如何获取飞书 Webhook URL？

A: 
1. 在飞书群聊中添加自定义机器人
2. 复制生成的 Webhook URL
3. 可选：配置签名密钥增强安全性

### Q: 邮件发送失败怎么办？

A:
- 检查 SMTP 配置是否正确
- 确认邮箱服务商允许 SMTP 登录
- 部分邮箱需要应用专用密码
- 检查防火墙是否阻止 SMTP 端口

### Q: WebSocket 连接不稳定？

A:
- 增加 `reconnectInterval` 和 `maxReconnects`
- 实现心跳机制保持连接
- 添加连接状态监控

### Q: 如何自定义通知样式？

A:
- 飞书：使用 `card` 模板自定义消息卡片
- 邮件：修改 HTML 模板
- WebSocket: 在接收端自定义渲染

---

## API 参考

### NotificationService

| 方法 | 描述 | 参数 | 返回值 |
|------|------|------|--------|
| `send` | 发送通知 | content, channels?, templateId? | Promise<BatchSendResult> |
| `sendQuick` | 快速发送 | title, content, type?, priority? | Promise<BatchSendResult> |
| `registerTemplate` | 注册模板 | template | void |
| `unregisterTemplate` | 移除模板 | templateId | void |
| `getChannelStatus` | 获取渠道状态 | - | Record<channel, boolean> |

### 内置模板

| 模板 ID | 名称 | 用途 |
|--------|------|------|
| `system-alert` | 系统告警 | 紧急系统问题 |
| `task-complete` | 任务完成 | 任务执行完成 |
| `error-report` | 错误报告 | 错误详情报告 |
| `daily-report` | 日常报告 | 定期汇总报告 |

---

**版本:** 1.0.0  
**作者:** Axon  
**最后更新:** 2026-03-13
