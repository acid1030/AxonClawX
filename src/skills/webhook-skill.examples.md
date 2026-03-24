# Webhook 技能使用示例

## 快速开始

### 1. 基础用法 - 发送 Webhook

```typescript
import { sendWebhook, createWebhookPayload } from './src/skills/webhook-skill';

// 发送简单的 Webhook
const result = await sendWebhook(
  'https://api.example.com/webhook',
  {
    event: 'user.created',
    timestamp: Date.now(),
    data: {
      userId: '12345',
      email: 'user@example.com',
    },
  }
);

console.log(result);
// {
//   success: true,
//   statusCode: 200,
//   responseData: { received: true },
//   retries: 0,
//   duration: 234
// }
```

### 2. 使用便捷函数创建载荷

```typescript
import { sendWebhook, createWebhookPayload } from './src/skills/webhook-skill';

const payload = createWebhookPayload(
  'order.completed',
  {
    orderId: 'ORD-2026-001',
    amount: 99.99,
    currency: 'USD',
  }
);

const result = await sendWebhook('https://api.example.com/webhook', payload);
```

### 3. 配置重试机制

```typescript
import { WebhookSender } from './src/skills/webhook-skill';

const sender = new WebhookSender({
  url: 'https://api.example.com/webhook',
  retry: {
    maxRetries: 5,           // 最多重试 5 次
    initialDelay: 2000,      // 初始延迟 2 秒
    maxDelay: 60000,         // 最大延迟 60 秒
    backoffFactor: 2,        // 指数退避因子
    retryStatusCodes: [408, 429, 500, 502, 503, 504],
  },
  timeout: 15000,            // 15 秒超时
});

const result = await sender.send({
  event: 'payment.processed',
  timestamp: Date.now(),
  data: { paymentId: 'PAY-123' },
});

if (!result.success) {
  console.error(`发送失败，重试${result.retries}次: ${result.error}`);
}
```

### 4. 添加自定义请求头

```typescript
import { sendWebhook } from './src/skills/webhook-skill';

const result = await sendWebhook(
  'https://api.example.com/webhook',
  {
    event: 'custom.event',
    timestamp: Date.now(),
    data: { message: 'Hello' },
  },
  {
    headers: {
      'X-Custom-Header': 'MyValue',
      'Authorization': 'Bearer token123',
    },
    method: 'POST',
  }
);
```

### 5. 使用 HMAC 签名

```typescript
import { sendWebhook, verifyWebhookSignature } from './src/skills/webhook-skill';

// 发送方 - 自动添加签名
const result = await sendWebhook(
  'https://api.example.com/webhook',
  {
    event: 'secure.event',
    timestamp: Date.now(),
    data: { secret: 'data' },
  },
  {
    secret: 'my-super-secret-key',  // 签名密钥
    signatureHeader: 'X-Webhook-Signature',  // 签名头名称
  }
);

// 接收方 - 验证签名
function handleWebhookRequest(request: Request, secret: string) {
  const signature = request.headers.get('X-Webhook-Signature');
  const body = await request.json();
  
  const verification = verifyWebhookSignature(body, signature, secret);
  
  if (!verification.valid) {
    console.error('签名验证失败:', verification.error);
    return new Response('Invalid signature', { status: 401 });
  }
  
  console.log('签名验证通过');
  // 处理 Webhook 逻辑...
  return new Response('OK', { status: 200 });
}
```

### 6. 签名验证工具函数

```typescript
import { verifySignature, generateSignature } from './src/skills/webhook-skill';

// 生成签名
const payload = JSON.stringify({ event: 'test', data: {} });
const signature = generateSignature(payload, 'my-secret-key');
console.log('签名:', signature);

// 验证签名
const verification = verifySignature(payload, signature, 'my-secret-key');
console.log('验证结果:', verification.valid);  // true
console.log('接收到的签名:', verification.receivedSignature);
console.log('计算出的签名:', verification.computedSignature);

// 验证失败的签名
const badVerification = verifySignature(payload, 'wrong-signature', 'my-secret-key');
console.log('验证失败:', badVerification.valid);  // false
console.log('错误信息:', badVerification.error);
```

### 7. 完整示例 - Express 服务器接收 Webhook

```typescript
import express from 'express';
import { verifyWebhookSignature, WebhookSender } from './src/skills/webhook-skill';

const app = express();
const WEBHOOK_SECRET = 'my-super-secret-key';

// 中间件验证签名
app.use('/webhook', express.json(), (req, res, next) => {
  const signature = req.headers['x-webhook-signature'] as string;
  const verification = verifyWebhookSignature(req.body, signature, WEBHOOK_SECRET);
  
  if (!verification.valid) {
    return res.status(401).json({ error: 'Invalid signature' });
  }
  
  next();
});

// 处理 Webhook
app.post('/webhook', (req, res) => {
  const { event, timestamp, data } = req.body;
  
  console.log(`收到事件: ${event}`);
  console.log(`时间戳: ${timestamp}`);
  console.log(`数据:`, data);
  
  // 处理业务逻辑...
  
  res.json({ received: true });
});

app.listen(3000, () => {
  console.log('Webhook 服务器运行在 http://localhost:3000');
});
```

### 8. 完整示例 - 发送带重试的 Webhook

```typescript
import { WebhookSender, createWebhookPayload } from './src/skills/webhook-skill';

async function notifyUserService(event: string, data: any) {
  const sender = new WebhookSender({
    url: 'https://api.userservice.com/webhooks',
    secret: 'user-service-secret',
    retry: {
      maxRetries: 3,
      initialDelay: 1000,
      maxDelay: 10000,
      backoffFactor: 2,
    },
    timeout: 10000,
    headers: {
      'X-Service-Name': 'OrderService',
    },
  });

  const payload = createWebhookPayload(event, data);
  const result = await sender.send(payload);

  if (result.success) {
    console.log(`✓ Webhook 发送成功 (${result.duration}ms, 重试${result.retries}次)`);
    return result;
  } else {
    console.error(
      `✗ Webhook 发送失败: ${result.error} (状态码：${result.statusCode}, 重试${result.retries}次)`
    );
    throw new Error(result.error);
  }
}

// 使用示例
await notifyUserService('order.created', {
  orderId: 'ORD-2026-001',
  userId: 'USR-123',
  total: 299.99,
});
```

### 9. 批量发送 Webhook

```typescript
import { WebhookSender } from './src/skills/webhook-skill';

async function broadcastEvent(
  urls: string[],
  payload: any,
  secret?: string
) {
  const results = await Promise.allSettled(
    urls.map(async (url) => {
      const sender = new WebhookSender({
        url,
        secret,
        retry: {
          maxRetries: 2,
          initialDelay: 500,
        },
      });
      
      return sender.send(payload);
    })
  );

  const successes = results.filter(
    (r): r is PromiseFulfilledResult<any> =>
      r.status === 'fulfilled' && r.value.success
  );
  const failures = results.filter(
    (r): r is PromiseRejectedResult | PromiseFulfilledResult<any> =>
      r.status === 'rejected' ||
      (r.status === 'fulfilled' && !r.value.success)
  );

  return {
    total: urls.length,
    successes: successes.length,
    failures: failures.length,
    results,
  };
}

// 使用示例
const endpoints = [
  'https://service1.com/webhook',
  'https://service2.com/webhook',
  'https://service3.com/webhook',
];

const stats = await broadcastEvent(
  endpoints,
  {
    event: 'system.broadcast',
    timestamp: Date.now(),
    data: { message: 'System maintenance in 10 minutes' },
  },
  'broadcast-secret'
);

console.log(`发送统计: ${stats.successes}/${stats.total} 成功`);
```

## 类型定义

```typescript
// Webhook 配置
interface WebhookConfig {
  url: string;                      // Webhook URL
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>; // 自定义请求头
  secret?: string;                  // 签名密钥
  signatureHeader?: string;         // 签名头名称
  timeout?: number;                 // 超时时间 (毫秒)
  retry?: RetryConfig;              // 重试配置
}

// 重试配置
interface RetryConfig {
  maxRetries: number;               // 最大重试次数
  initialDelay?: number;            // 初始延迟 (毫秒)
  maxDelay?: number;                // 最大延迟 (毫秒)
  backoffFactor?: number;           // 退避因子
  retryStatusCodes?: number[];      // 触发重试的状态码
}

// Webhook 载荷
interface WebhookPayload {
  event: string;                    // 事件类型
  timestamp: number;                // 时间戳
  data: any;                        // 数据内容
  id?: string;                      // 唯一 ID
}

// 发送结果
interface WebhookResult {
  success: boolean;                 // 是否成功
  statusCode?: number;              // HTTP 状态码
  responseData?: any;               // 响应数据
  error?: string;                   // 错误信息
  retries?: number;                 // 重试次数
  duration?: number;                // 总耗时 (毫秒)
}

// 签名验证结果
interface SignatureVerification {
  valid: boolean;                   // 验证是否通过
  receivedSignature?: string;       // 接收到的签名
  computedSignature?: string;       // 计算出的签名
  error?: string;                   // 错误信息
}
```

## API 参考

### 类

- **WebhookSender**: 主要的 Webhook 发送器类
  - `constructor(config: WebhookConfig)`
  - `send(payload: WebhookPayload): Promise<WebhookResult>`

### 函数

- **sendWebhook**: 快速发送 Webhook
  - `sendWebhook(url, payload, options?): Promise<WebhookResult>`

- **createWebhookPayload**: 创建标准 Webhook 载荷
  - `createWebhookPayload(event, data, id?): WebhookPayload`

- **verifySignature**: 验证 HMAC 签名
  - `verifySignature(payload, signature, secret): SignatureVerification`

- **verifyWebhookSignature**: 从请求中验证签名
  - `verifyWebhookSignature(body, signatureHeader, secret): SignatureVerification`

- **generateSignature**: 生成 HMAC-SHA256 签名
  - `generateSignature(payload, secret): string`

## 最佳实践

1. **始终使用 HTTPS**: Webhook URL 应该使用 HTTPS 保证传输安全
2. **使用签名**: 生产环境务必配置 `secret` 进行签名验证
3. **合理配置重试**: 根据业务重要性设置重试次数和延迟
4. **记录日志**: 记录发送结果和重试次数便于排查问题
5. **超时设置**: 根据网络情况设置合理的超时时间
6. **错误处理**: 处理所有可能的错误情况
