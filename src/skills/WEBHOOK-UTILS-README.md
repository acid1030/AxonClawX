# Webhook Utils Skill - 使用示例

> 增强版 Webhook 工具 - 支持发送、签名验证、重试机制、速率限制和队列管理

## 目录

1. [基础用法](#基础用法)
2. [签名验证](#签名验证)
3. [重试机制](#重试机制)
4. [速率限制](#速率限制)
5. [请求队列](#请求队列)
6. [批量发送](#批量发送)
7. [日志记录](#日志记录)
8. [端点测试](#端点测试)
9. [完整示例](#完整示例)

---

## 基础用法

### 快速发送

```typescript
import { sendWebhook, createWebhookPayload } from './src/skills/webhook-utils-skill';

// 快速发送 Webhook
const result = await sendWebhook(
  'https://api.example.com/webhook',
  createWebhookPayload('user.created', {
    userId: '12345',
    email: 'user@example.com',
  })
);

console.log(result);
// {
//   success: true,
//   statusCode: 200,
//   responseData: { received: true },
//   retries: 0,
//   duration: 234,
//   requestId: '550e8400-e29b-41d4-a716-446655440000'
// }
```

### 自定义载荷

```typescript
import { createWebhookPayload } from './src/skills/webhook-utils-skill';

const payload = createWebhookPayload('order.completed', {
  orderId: 'ORD-2026-001',
  amount: 299.99,
  currency: 'CNY',
}, {
  source: 'payment-service',
  version: '2.0',
});

console.log(payload);
// {
//   event: 'order.completed',
//   timestamp: 1710324000000,
//   data: { orderId: 'ORD-2026-001', amount: 299.99, currency: 'CNY' },
//   id: 'uuid...',
//   source: 'payment-service',
//   version: '2.0'
// }
```

---

## 签名验证

### 发送带签名的 Webhook

```typescript
import { WebhookSender } from './src/skills/webhook-utils-skill';

const sender = new WebhookSender({
  url: 'https://api.example.com/webhook',
  secret: 'your-secret-key',
  signatureAlgorithm: 'sha256', // 或 'sha512'
  signatureHeader: 'X-Webhook-Signature',
});

const result = await sender.send({
  event: 'payment.received',
  timestamp: Date.now(),
  data: { transactionId: 'TXN-001' },
});
```

### 接收端验证签名

```typescript
import { verifyWebhookSignature, verifySignature } from './src/skills/webhook-utils-skill';

// Express.js 示例
app.post('/webhook', (req, res) => {
  const signature = req.headers['x-webhook-signature'] as string;
  const body = req.body;
  const secret = 'your-secret-key';
  
  // 方法 1: 验证完整请求
  const verification = verifyWebhookSignature(body, signature, secret);
  
  // 方法 2: 验证原始字符串
  const rawBody = JSON.stringify(body);
  const verification2 = verifySignature(rawBody, signature, secret, 'sha256');
  
  if (!verification.valid) {
    console.error('Signature verification failed:', verification.error);
    return res.status(401).json({ error: 'Invalid signature' });
  }
  
  // 签名验证通过，处理业务逻辑
  console.log('Webhook received:', body);
  res.status(200).json({ received: true });
});
```

### 手动生成签名

```typescript
import { generateSignature } from './src/skills/webhook-utils-skill';

const payload = JSON.stringify({ event: 'test', data: {} });
const secret = 'my-secret';
const signature = generateSignature(payload, secret, 'sha256');

console.log('Signature:', signature);
// 输出：64 字符的十六进制字符串
```

---

## 重试机制

### 配置重试策略

```typescript
import { WebhookSender } from './src/skills/webhook-utils-skill';

const sender = new WebhookSender({
  url: 'https://api.example.com/webhook',
  retry: {
    maxRetries: 5,              // 最多重试 5 次
    initialDelay: 1000,         // 初始延迟 1 秒
    maxDelay: 60000,            // 最大延迟 60 秒
    backoffFactor: 2,           // 指数退避因子
    enableJitter: true,         // 启用抖动 (防止雪崩)
    jitterRange: 0.2,           // 抖动范围 ±20%
    retryStatusCodes: [         // 触发重试的状态码
      408, // Request Timeout
      429, // Too Many Requests
      500, // Internal Server Error
      502, // Bad Gateway
      503, // Service Unavailable
      504, // Gateway Timeout
    ],
  },
  timeout: 15000, // 15 秒超时
});

const result = await sender.send({
  event: 'critical.event',
  timestamp: Date.now(),
  data: { important: 'data' },
});

console.log(`Retries: ${result.retries}, Duration: ${result.duration}ms`);
```

### 重试延迟计算示例

```typescript
// 配置：initialDelay=1000, backoffFactor=2, enableJitter=true
// 重试延迟：
// 第 1 次重试：~1000ms (1000 * 2^0 ± 20%)
// 第 2 次重试：~2000ms (1000 * 2^1 ± 20%)
// 第 3 次重试：~4000ms (1000 * 2^2 ± 20%)
// 第 4 次重试：~8000ms (1000 * 2^3 ± 20%)
// 第 5 次重试：~16000ms (1000 * 2^4 ± 20%)
```

---

## 速率限制

### 配置速率限制

```typescript
import { WebhookSender, RateLimiter } from './src/skills/webhook-utils-skill';

// 方法 1: 在 WebhookSender 中配置
const sender = new WebhookSender({
  url: 'https://api.example.com/webhook',
  rateLimit: {
    windowMs: 60000,      // 1 分钟窗口
    maxRequests: 100,     // 最多 100 次请求
  },
});

// 方法 2: 独立使用 RateLimiter
const limiter = new RateLimiter({
  windowMs: 1000,  // 1 秒
  maxRequests: 10, // 每秒最多 10 次
});

for (let i = 0; i < 15; i++) {
  const check = limiter.check();
  if (!check.allowed) {
    console.log(`Rate limited! Retry after ${check.retryAfter}ms`);
    await sleep(check.retryAfter!);
  }
  limiter.record();
  console.log(`Request ${i + 1} sent`);
}
```

### 检查速率限制状态

```typescript
const sender = new WebhookSender({
  url: 'https://api.example.com/webhook',
  rateLimit: {
    windowMs: 60000,
    maxRequests: 100,
  },
});

// 发送一些请求
await sender.send({ event: 'test1', timestamp: Date.now(), data: {} });
await sender.send({ event: 'test2', timestamp: Date.now(), data: {} });

// 查看当前状态
const status = sender.getRateLimitStatus();
console.log(status);
// { current: 2, max: 100, windowMs: 60000 }
```

---

## 请求队列

### 使用优先级队列

```typescript
import { WebhookQueue, WebhookSender, createWebhookPayload } from './src/skills/webhook-utils-skill';

// 创建队列 (最大并发 5)
const queue = new WebhookQueue(5);

// 创建发送器
const sender = new WebhookSender({
  url: 'https://api.example.com/webhook',
  retry: { maxRetries: 3 },
});

// 设置处理器
queue.setHandler(async (task) => {
  console.log(`Processing task ${task.id} (priority: ${task.priority})`);
  
  const result = await sender.send(task.payload);
  
  if (!result.success) {
    console.error(`Task ${task.id} failed: ${result.error}`);
    // 可以选择重新入队
    if (task.retryCount < 3) {
      task.retryCount++;
      queue.enqueue(task.payload, task.priority);
    }
  }
});

// 添加任务 (优先级 1-10, 数字越小优先级越高)
queue.enqueue(createWebhookPayload('low.priority', {}), 10);
queue.enqueue(createWebhookPayload('high.priority', {}), 1);
queue.enqueue(createWebhookPayload('normal.priority', {}), 5);

// 查看队列状态
console.log(queue.getStatus());
// { pending: 3, active: 0, maxConcurrency: 5 }
```

---

## 批量发送

### 并发发送多个 Webhook

```typescript
import { sendWebhooks, createWebhookPayload } from './src/skills/webhook-utils-skill';

const webhooks = [
  {
    url: 'https://service1.example.com/webhook',
    payload: createWebhookPayload('event1', { data: 'value1' }),
  },
  {
    url: 'https://service2.example.com/webhook',
    payload: createWebhookPayload('event2', { data: 'value2' }),
    options: {
      secret: 'secret1',
      timeout: 5000,
    },
  },
  {
    url: 'https://service3.example.com/webhook',
    payload: createWebhookPayload('event3', { data: 'value3' }),
  },
];

// 并发发送 (最多 5 个并发)
const results = await sendWebhooks(webhooks, 5);

results.forEach((result, index) => {
  console.log(`Webhook ${index + 1}: ${result.success ? '✓' : '✗'}`);
  if (!result.success) {
    console.error(`  Error: ${result.error}`);
  }
});
```

---

## 日志记录

### 启用日志

```typescript
import { WebhookSender } from './src/skills/webhook-utils-skill';

const sender = new WebhookSender({
  url: 'https://api.example.com/webhook',
  enableLogging: true,
  retry: { maxRetries: 3 },
});

// 发送一些请求
await sender.send({ event: 'test1', timestamp: Date.now(), data: {} });
await sender.send({ event: 'test2', timestamp: Date.now(), data: {} });

// 获取日志 (默认最近 100 条)
const logs = sender.getLogs();
console.log(logs);
// [
//   {
//     timestamp: 1710324000000,
//     eventType: 'send',
//     url: 'https://api.example.com/webhook',
//     requestId: 'uuid...',
//     statusCode: 200,
//     duration: 234,
//     retries: 0,
//   },
//   {
//     eventType: 'success',
//     ...
//   }
// ]

// 获取指定数量的日志
const recentLogs = sender.getLogs(10);

// 清空日志
sender.clearLogs();
```

### 日志事件类型

- `send`: 发送请求
- `retry`: 重试
- `success`: 成功
- `failure`: 失败
- `rate_limit`: 触发速率限制

---

## 端点测试

### 测试 Webhook 端点可达性

```typescript
import { testWebhookEndpoint } from './src/skills/webhook-utils-skill';

// 测试端点
const result = await testWebhookEndpoint('https://api.example.com/webhook', {
  method: 'GET',
  timeout: 5000,
});

console.log(result);
// {
//   reachable: true,
//   statusCode: 200,
//   responseTime: 123
// }

// 或者测试失败的端点
const failResult = await testWebhookEndpoint('https://invalid.example.com');
console.log(failResult);
// {
//   reachable: false,
//   error: 'fetch failed'
// }
```

---

## 完整示例

### 生产环境 Webhook 服务

```typescript
import {
  WebhookSender,
  createWebhookPayload,
  verifyWebhookSignature,
  WebhookQueue,
} from './src/skills/webhook-utils-skill';

// ============== 发送端配置 ==============

class WebhookService {
  private sender: WebhookSender;
  private queue: WebhookQueue;

  constructor() {
    this.sender = new WebhookSender({
      url: process.env.WEBHOOK_URL!,
      secret: process.env.WEBHOOK_SECRET!,
      signatureAlgorithm: 'sha256',
      timeout: 10000,
      enableLogging: true,
      retry: {
        maxRetries: 3,
        initialDelay: 1000,
        maxDelay: 30000,
        backoffFactor: 2,
        enableJitter: true,
      },
      rateLimit: {
        windowMs: 60000,
        maxRequests: 100,
      },
    });

    this.queue = new WebhookQueue(5);
    this.queue.setHandler(async (task) => {
      const result = await this.sender.send(task.payload);
      if (!result.success) {
        console.error(`Webhook failed: ${result.error}`);
      }
    });
  }

  // 发送事件 (立即发送)
  async sendEvent(event: string, data: any): Promise<void> {
    const payload = createWebhookPayload(event, data);
    const result = await this.sender.send(payload);
    
    if (!result.success) {
      throw new Error(`Webhook delivery failed: ${result.error}`);
    }
  }

  // 队列发送 (异步处理)
  queueEvent(event: string, data: any, priority: number = 5): string {
    const payload = createWebhookPayload(event, data);
    return this.queue.enqueue(payload, priority);
  }

  // 获取发送统计
  getStats(): any {
    return {
      queue: this.queue.getStatus(),
      rateLimit: this.sender.getRateLimitStatus(),
      recentLogs: this.sender.getLogs(10),
    };
  }
}

// ============== 接收端配置 ==============

// Express.js 示例
import express from 'express';

const app = express();
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET!;

app.post('/webhook', express.json(), (req, res) => {
  const signature = req.headers['x-webhook-signature'] as string;
  
  // 验证签名
  const verification = verifyWebhookSignature(
    req.body,
    signature,
    WEBHOOK_SECRET
  );

  if (!verification.valid) {
    console.warn('Invalid webhook signature:', verification.error);
    return res.status(401).json({ error: 'Invalid signature' });
  }

  // 处理事件
  const { event, data, timestamp } = req.body;
  console.log(`Received webhook: ${event}`, data);

  // 异步处理
  processWebhookEvent(event, data).catch(console.error);

  res.status(200).json({ received: true });
});

async function processWebhookEvent(event: string, data: any): Promise<void> {
  switch (event) {
    case 'user.created':
      await handleUserCreated(data);
      break;
    case 'order.completed':
      await handleOrderCompleted(data);
      break;
    case 'payment.received':
      await handlePaymentReceived(data);
      break;
    default:
      console.log(`Unhandled event: ${event}`);
  }
}

// ============== 使用示例 ==============

const webhookService = new WebhookService();

// 立即发送
await webhookService.sendEvent('user.created', {
  userId: '12345',
  email: 'user@example.com',
});

// 队列发送 (低优先级)
webhookService.queueEvent('analytics.event', { page: '/home' }, 10);

// 队列发送 (高优先级)
webhookService.queueEvent('payment.received', { amount: 299.99 }, 1);

// 查看统计
console.log(webhookService.getStats());
```

---

## API 参考

### 类

- **WebhookSender**: 主要发送器类
- **WebhookQueue**: 优先级请求队列
- **RateLimiter**: 速率限制器

### 函数

- **sendWebhook**: 快速发送单个 Webhook
- **sendWebhooks**: 批量发送多个 Webhook
- **createWebhookPayload**: 创建标准载荷
- **generateSignature**: 生成 HMAC 签名
- **verifySignature**: 验证签名
- **verifyWebhookSignature**: 从请求中验证签名
- **testWebhookEndpoint**: 测试端点可达性

### 类型

- `WebhookConfig`: 发送器配置
- `RetryConfig`: 重试配置
- `RateLimitConfig`: 速率限制配置
- `WebhookPayload`: 载荷结构
- `WebhookResult`: 发送结果
- `SignatureVerification`: 签名验证结果
- `WebhookLogEntry`: 日志条目

---

## 最佳实践

1. **始终使用 HTTPS**: 保证传输安全
2. **使用强密钥**: secret 至少 32 字符
3. **启用签名验证**: 生产环境必须验证签名
4. **合理配置重试**: 根据业务重要性设置
5. **实施速率限制**: 避免被目标服务封禁
6. **记录关键事件**: 便于排查问题
7. **监控失败率**: 设置告警阈值
8. **定期轮换密钥**: 提高安全性

---

## 故障排除

### 签名验证失败

```typescript
// 检查密钥是否一致
console.log('Sender secret:', process.env.WEBHOOK_SECRET);
console.log('Receiver secret:', process.env.WEBHOOK_SECRET);

// 检查签名头名称
console.log('Expected header:', 'X-Webhook-Signature');
console.log('Received headers:', Object.keys(req.headers));

// 检查载荷格式 (必须是相同的 JSON 字符串)
const payload1 = JSON.stringify({ a: 1 });
const payload2 = JSON.stringify({ a: 1 });
console.log(payload1 === payload2); // true
```

### 重试过多

```typescript
// 调整重试配置
const sender = new WebhookSender({
  retry: {
    maxRetries: 2,  // 减少重试次数
    initialDelay: 500,  // 缩短初始延迟
    retryStatusCodes: [500, 503],  // 只重试特定状态码
  },
});
```

### 速率限制触发频繁

```typescript
// 增加限制或降低发送频率
const sender = new WebhookSender({
  rateLimit: {
    windowMs: 60000,      // 1 分钟
    maxRequests: 200,     // 增加到 200 次/分钟
  },
});

// 或使用队列平滑发送
const queue = new WebhookQueue(2); // 限制并发数为 2
```

---

## 作者

Axon (NOVA Subagent) - 2026-03-13

## 版本

1.0.0
