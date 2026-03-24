# Webhook 技能

> Webhook 发送与管理 - 支持重试机制和签名验证

## 功能特性

- ✅ **Webhook 发送**: 支持 GET/POST/PUT/DELETE/PATCH 方法
- ✅ **重试机制**: 指数退避策略，可配置重试次数和延迟
- ✅ **签名验证**: HMAC-SHA256 签名生成与验证
- ✅ **超时控制**: 可配置请求超时时间
- ✅ **自定义请求头**: 支持添加任意 HTTP 请求头

## 快速开始

### 安装

无需额外安装，技能已内置于 `src/skills/webhook-skill.ts`

### 基础用法

```typescript
import { sendWebhook } from './src/skills/webhook-skill';

const result = await sendWebhook(
  'https://api.example.com/webhook',
  {
    event: 'user.created',
    timestamp: Date.now(),
    data: { userId: '12345' },
  }
);

console.log(result);
// { success: true, statusCode: 200, retries: 0, duration: 234 }
```

### 带重试的 Webhook

```typescript
import { WebhookSender } from './src/skills/webhook-skill';

const sender = new WebhookSender({
  url: 'https://api.example.com/webhook',
  retry: {
    maxRetries: 3,
    initialDelay: 1000,
    maxDelay: 30000,
    backoffFactor: 2,
  },
  timeout: 10000,
});

const result = await sender.send({
  event: 'order.completed',
  timestamp: Date.now(),
  data: { orderId: 'ORD-001' },
});
```

### 签名验证

```typescript
import { verifyWebhookSignature } from './src/skills/webhook-skill';

// 接收 Webhook 时验证签名
function handleWebhook(request: Request, secret: string) {
  const signature = request.headers.get('X-Webhook-Signature');
  const body = await request.json();
  
  const verification = verifyWebhookSignature(body, signature, secret);
  
  if (!verification.valid) {
    return new Response('Invalid signature', { status: 401 });
  }
  
  // 处理 Webhook 逻辑...
  return new Response('OK', { status: 200 });
}
```

## API 文档

### 类

#### WebhookSender

主要的 Webhook 发送器类。

```typescript
constructor(config: WebhookConfig)
send(payload: WebhookPayload): Promise<WebhookResult>
```

### 函数

#### sendWebhook

快速发送 Webhook（一次性使用）。

```typescript
sendWebhook(
  url: string,
  payload: WebhookPayload,
  options?: Partial<WebhookConfig>
): Promise<WebhookResult>
```

#### createWebhookPayload

创建标准 Webhook 载荷。

```typescript
createWebhookPayload(
  event: string,
  data: any,
  id?: string
): WebhookPayload
```

#### verifySignature

验证 HMAC 签名。

```typescript
verifySignature(
  payload: string,
  signature: string,
  secret: string
): SignatureVerification
```

#### verifyWebhookSignature

从请求中验证签名。

```typescript
verifyWebhookSignature(
  body: any,
  signatureHeader: string | undefined,
  secret: string
): SignatureVerification
```

#### generateSignature

生成 HMAC-SHA256 签名。

```typescript
generateSignature(
  payload: string,
  secret: string
): string
```

## 类型定义

### WebhookConfig

```typescript
interface WebhookConfig {
  url: string;                      // Webhook URL
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>; // 自定义请求头
  secret?: string;                  // 签名密钥
  signatureHeader?: string;         // 签名头名称
  timeout?: number;                 // 超时时间 (毫秒)
  retry?: RetryConfig;              // 重试配置
}
```

### RetryConfig

```typescript
interface RetryConfig {
  maxRetries: number;               // 最大重试次数
  initialDelay?: number;            // 初始延迟 (毫秒)
  maxDelay?: number;                // 最大延迟 (毫秒)
  backoffFactor?: number;           // 退避因子
  retryStatusCodes?: number[];      // 触发重试的状态码
}
```

### WebhookPayload

```typescript
interface WebhookPayload {
  event: string;                    // 事件类型
  timestamp: number;                // 时间戳
  data: any;                        // 数据内容
  id?: string;                      // 唯一 ID
}
```

### WebhookResult

```typescript
interface WebhookResult {
  success: boolean;                 // 是否成功
  statusCode?: number;              // HTTP 状态码
  responseData?: any;               // 响应数据
  error?: string;                   // 错误信息
  retries?: number;                 // 重试次数
  duration?: number;                // 总耗时 (毫秒)
}
```

### SignatureVerification

```typescript
interface SignatureVerification {
  valid: boolean;                   // 验证是否通过
  receivedSignature?: string;       // 接收到的签名
  computedSignature?: string;       // 计算出的签名
  error?: string;                   // 错误信息
}
```

## 使用示例

详细示例请查看 [`webhook-skill.examples.md`](./webhook-skill.examples.md)

## 测试

```bash
npx vitest run src/skills/webhook-skill.test.ts
```

## 最佳实践

1. **始终使用 HTTPS**: 保证传输安全
2. **使用签名**: 生产环境务必配置 `secret`
3. **合理配置重试**: 根据业务重要性设置重试策略
4. **记录日志**: 记录发送结果便于排查问题
5. **超时设置**: 根据网络情况设置合理超时

## 作者

Axon - 至高意志执行者

## 版本

1.0.0
