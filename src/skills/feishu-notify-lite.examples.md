# Feishu Notify Lite - 使用示例

## 快速开始

```typescript
import { sendTextMessage, sendRichTextMessage, RichText, formatError } from './feishu-notify-lite';

const WEBHOOK = 'https://open.feishu.cn/open-apis/bot/v2/hook/xxx';
```

## 1. 发送文本消息

```typescript
const result = await sendTextMessage(
  WEBHOOK,
  '🔔 系统通知：部署完成'
);

if (!result.success) {
  console.error(formatError(result));
}
```

## 2. 发送富文本消息

```typescript
const result = await sendRichTextMessage(
  WEBHOOK,
  '项目进度更新',
  [
    RichText.row(
      RichText.text('当前进度：'),
      RichText.text('85%')
    ),
    RichText.row(
      RichText.text('详情：'),
      RichText.link('点击查看', 'https://example.com')
    ),
    RichText.row(RichText.at('ou_xxxxx')),
  ]
);
```

## 3. 通用消息发送

```typescript
import { sendFeishuMessage } from './feishu-notify-lite';

const message = {
  msg_type: 'text' as const,
  content: { text: '自定义消息' }
};

const result = await sendFeishuMessage(
  { webhookUrl: WEBHOOK },
  message
);
```

## 4. 错误处理

```typescript
try {
  const result = await sendTextMessage(WEBHOOK, '测试');
  
  if (!result.success) {
    throw new Error(formatError(result));
  }
  
  console.log(`发送成功，耗时：${result.duration}ms`);
} catch (error) {
  console.error('发送失败:', error);
}
```

## 5. 完整示例

```typescript
import { sendTextMessage, sendRichTextMessage, RichText, formatError } from './feishu-notify-lite';

async function notifyDeployment() {
  const webhook = process.env.FEISHU_WEBHOOK!;
  
  // 发送开始通知
  await sendTextMessage(webhook, '🚀 开始部署...');
  
  // 模拟部署...
  
  // 发送完成通知
  const result = await sendRichTextMessage(
    webhook,
    '部署完成',
    [
      RichText.row(RichText.text('环境：'), RichText.text('production')),
      RichText.row(RichText.text('版本：'), RichText.text('v1.2.3')),
      RichText.row(RichText.link('查看日志', 'https://logs.example.com')),
      RichText.row(RichText.at('ou_manager_id')),
    ]
  );
  
  if (!result.success) {
    console.error('通知失败:', formatError(result));
  }
}
```
