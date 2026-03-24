# TelegramChannel 使用文档

**版本:** 1.0.0  
**日期:** 2026-03-13  
**状态:** ✅ 已完成

---

## 📋 目录

- [概述](#概述)
- [快速开始](#快速开始)
- [配置说明](#配置说明)
- [API 参考](#api-参考)
- [使用示例](#使用示例)
- [最佳实践](#最佳实践)
- [故障排查](#故障排查)
- [测试指南](#测试指南)

---

## 概述

`TelegramChannel` 是 AxonClaw Channel 系统的 Telegram 平台实现，提供完整的 Telegram Bot API 集成。

### 核心特性

- ✅ **Polling 模式** - 自动轮询消息更新
- ✅ **Webhook 模式** - 支持推送通知
- ✅ **消息类型** - 文本/图片/文件/语音/视频
- ✅ **解析模式** - 支持 Markdown/HTML/纯文本
- ✅ **回复消息** - 支持回复特定消息
- ✅ **聊天限制** - 可配置允许的聊天 ID 列表
- ✅ **自动重连** - 网络错误自动恢复
- ✅ **事件系统** - 完整的事件订阅机制

### 技术栈

- **Runtime:** Node.js / Electron Renderer
- **Language:** TypeScript 5.x
- **API:** Telegram Bot API
- **HTTP:** Native `fetch` API

---

## 快速开始

### 1. 安装依赖

TelegramChannel 使用原生 `fetch` API，无需额外依赖。确保你的环境支持：

```bash
# Node.js 18+ 已内置 fetch
node --version

# 如需 polyfill (旧版本 Node.js)
npm install node-fetch
```

### 2. 创建 Telegram Bot

1. 在 Telegram 中搜索 `@BotFather`
2. 发送 `/newbot` 创建新 bot
3. 按照提示设置 bot 名称和 username
4. 保存获得的 **Bot Token** (格式：`123456789:ABCdefGHIjklMNOpqrsTUVwxyz`)

### 3. 基本使用

```typescript
import { TelegramChannel } from './channels/telegram/TelegramChannel';
import { TelegramConfig } from './channels/types';

// 配置
const config: TelegramConfig = {
  name: 'My Bot',
  type: 'telegram',
  enabled: true,
  status: 'disconnected',
  config: {
    botToken: 'YOUR_BOT_TOKEN_HERE',
    pollingInterval: 3000,
  },
};

// 创建 Channel
const channel = new TelegramChannel(config);

// 监听事件
channel.onEvent(event => {
  console.log('Event:', event.type, event.data);
});

// 监听消息
channel.onMessage(message => {
  console.log('Received:', message.content);
});

// 连接
await channel.connect();
console.log('Connected as:', channel.getBotUsername());

// 发送消息
const result = await channel.sendMessage('@username', 'Hello from AxonClaw!');
console.log('Sent:', result.success);

// 断开
await channel.disconnect();
```

---

## 配置说明

### TelegramConfig 接口

```typescript
interface TelegramConfig extends BaseChannelConfig {
  type: 'telegram';
  config: {
    /** Telegram Bot Token (必需) */
    botToken: string;
    
    /** Bot 用户名 (连接后自动填充) */
    botUsername?: string;
    
    /** 允许的聊天 ID 列表 (空 = 允许所有) */
    allowedChatIds?: string[];
    
    /** Webhook URL (可选，不设置则使用 polling) */
    webhookUrl?: string;
    
    /** Polling 间隔 (毫秒，默认：3000) */
    pollingInterval?: number;
  };
}
```

### 配置示例

#### 基础配置 (Polling 模式)

```typescript
{
  name: 'Support Bot',
  type: 'telegram',
  enabled: true,
  status: 'disconnected',
  config: {
    botToken: process.env.TELEGRAM_BOT_TOKEN!,
    pollingInterval: 3000,
  },
}
```

#### 生产配置 (Webhook 模式)

```typescript
{
  name: 'Production Bot',
  type: 'telegram',
  enabled: true,
  status: 'disconnected',
  config: {
    botToken: process.env.TELEGRAM_BOT_TOKEN!,
    webhookUrl: 'https://your-domain.com/webhook/telegram',
    allowedChatIds: ['123456789', '-1001234567890'], // 只允许特定聊天
  },
}
```

#### 安全配置 (限制访问)

```typescript
{
  name: 'Private Bot',
  type: 'telegram',
  enabled: true,
  status: 'disconnected',
  config: {
    botToken: process.env.TELEGRAM_BOT_TOKEN!,
    allowedChatIds: [
      '123456789',  // 管理员个人聊天
      '-1001234567890', // 官方群组
    ],
  },
}
```

---

## API 参考

### 构造函数

```typescript
constructor(config: TelegramConfig)
```

**参数:**
- `config` - Telegram 配置对象

**返回:**
- `TelegramChannel` 实例

---

### connect()

初始化并连接 Telegram Bot。

```typescript
async connect(): Promise<void>
```

**可能抛出的异常:**
- `Error` - Token 无效或网络错误

**事件:**
- `connected` - 连接成功
- `error` - 连接失败

---

### disconnect()

断开 Telegram Bot 连接。

```typescript
async disconnect(): Promise<void>
```

**行为:**
- 停止 polling
- 删除 webhook (如果设置了)
- 触发 `disconnected` 事件

---

### sendMessage()

发送消息到指定聊天。

```typescript
async sendMessage(
  targetId: string,
  content: string,
  options?: SendMessageOptions
): Promise<SendMessageResult>
```

**参数:**
- `targetId` - 目标聊天 ID (用户 ID 或群组 ID)
- `content` - 消息内容
- `options` - 可选参数
  - `type` - 消息类型 (`text`, `image`, `file`, `voice`, `video`)
  - `replyTo` - 回复的消息 ID
  - `parseMode` - 解析模式 (`markdown`, `html`, `plain`)
  - `metadata` - 自定义元数据

**返回:**
```typescript
{
  success: boolean,
  messageId?: string,
  timestamp?: number,
  error?: string
}
```

---

### getStatus()

获取当前连接状态。

```typescript
getStatus(): ChannelStatus
```

**返回值:**
- `'connected'` - 已连接
- `'disconnected'` - 已断开
- `'connecting'` - 连接中
- `'error'` - 错误状态
- `'auth_required'` - 需要认证

---

### getLastError()

获取最后一次错误。

```typescript
getLastError(): Error | null
```

---

### getBotUsername()

获取 Bot 用户名 (连接后可用)。

```typescript
getBotUsername(): string | undefined
```

---

### onEvent()

订阅频道事件。

```typescript
onEvent(listener: (event: ChannelEvent) => void): () => void
```

**事件类型:**
- `connected` - 连接成功
- `disconnected` - 断开连接
- `error` - 发生错误
- `message` - 收到消息
- `status_change` - 状态变化

**返回:** 清理函数 (用于取消订阅)

---

### onMessage()

订阅收到的消息。

```typescript
onMessage(listener: (message: IncomingMessage) => void): () => void
```

**返回:** 清理函数

---

## 使用示例

### 1. 基础机器人

```typescript
import { TelegramChannel } from './channels/telegram/TelegramChannel';

const channel = new TelegramChannel({
  name: 'Echo Bot',
  type: 'telegram',
  enabled: true,
  status: 'disconnected',
  config: {
    botToken: 'YOUR_TOKEN',
  },
});

// 监听消息并回复
channel.onMessage(async (message) => {
  console.log(`Received from ${message.senderName}: ${message.content}`);
  
  // 回复消息
  await channel.sendMessage(
    message.senderId,
    `Echo: ${message.content}`,
    { replyTo: message.platformMessageId }
  );
});

await channel.connect();
console.log('Echo Bot is running...');
```

---

### 2. 命令处理

```typescript
channel.onMessage(async (message) => {
  const text = message.content.trim();
  
  if (text === '/start') {
    await channel.sendMessage(
      message.senderId,
      '👋 欢迎使用 AxonClaw Bot!\n\n发送 /help 查看帮助。',
      { parseMode: 'markdown' }
    );
  } else if (text === '/help') {
    await channel.sendMessage(
      message.senderId,
      `**可用命令:**
- /start - 开始使用
- /help - 显示帮助
- /status - 系统状态
- /feedback - 发送反馈`,
      { parseMode: 'markdown' }
    );
  } else if (text === '/status') {
    const status = channel.getStatus();
    await channel.sendMessage(
      message.senderId,
      `Bot 状态：\`${status}\``,
      { parseMode: 'markdown' }
    );
  }
});
```

---

### 3. 与 ChannelManager 集成

```typescript
import { ChannelManager } from './channels/ChannelManager';
import { TelegramChannel } from './channels/telegram/TelegramChannel';
import { TelegramConfig } from './channels/types';

// 获取 Manager 单例
const manager = ChannelManager.getInstance({
  autoReconnect: true,
  reconnectDelay: 5000,
  maxReconnectAttempts: 5,
});

// 注册 Telegram 工厂
manager.registerChannelType('telegram', (config) => {
  return new TelegramChannel(config as TelegramConfig);
});

// 添加 Channel
const channelId = await manager.addChannel({
  name: 'Support Bot',
  type: 'telegram',
  enabled: true,
  status: 'disconnected',
  config: {
    botToken: process.env.TELEGRAM_BOT_TOKEN!,
  },
});

// 监听全局消息
manager.onMessage((message) => {
  console.log('Global message:', message.content);
});

// 通过 Manager 发送消息
await manager.sendMessage(channelId, '@username', 'Hello!');
```

---

### 4. 广播消息

```typescript
// 发送到多个聊天
const chatIds = ['user1', 'user2', 'group1'];

await Promise.all(
  chatIds.map(async (chatId) => {
    const result = await channel.sendMessage(
      chatId,
      '📢 系统通知：今晚 23:00 进行系统维护',
      { parseMode: 'plain' }
    );
    
    if (result.success) {
      console.log(`✓ Sent to ${chatId}`);
    } else {
      console.error(`✗ Failed to ${chatId}: ${result.error}`);
    }
  })
);
```

---

### 5. 错误处理

```typescript
try {
  await channel.connect();
} catch (error) {
  console.error('Connection failed:', error);
  
  // 检查错误类型
  if (error.message.includes('Unauthorized')) {
    console.error('Invalid bot token!');
  } else if (error.message.includes('network')) {
    console.error('Network error, will retry...');
  }
  
  // 优雅降级
  channel.onEvent((event) => {
    if (event.type === 'error') {
      console.error('Channel error:', event.data.error);
      // 触发告警、记录日志等
    }
  });
}
```

---

### 6. 环境变量配置

```typescript
// .env
TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyz
TELEGRAM_ALLOWED_CHATS=123456789,-1001234567890
TELEGRAM_WEBHOOK_URL=https://your-domain.com/webhook/telegram

// config.ts
const config: TelegramConfig = {
  name: 'Production Bot',
  type: 'telegram',
  enabled: true,
  status: 'disconnected',
  config: {
    botToken: process.env.TELEGRAM_BOT_TOKEN!,
    allowedChatIds: process.env.TELEGRAM_ALLOWED_CHATS?.split(',') || [],
    webhookUrl: process.env.TELEGRAM_WEBHOOK_URL,
    pollingInterval: 3000,
  },
};
```

---

## 最佳实践

### 1. 安全管理

**✅ 使用环境变量存储 Token:**
```typescript
// Good
botToken: process.env.TELEGRAM_BOT_TOKEN

// Bad
botToken: '123456789:ABCdef...' // 硬编码!
```

**✅ 限制允许的聊天:**
```typescript
allowedChatIds: [
  'admin_user_id',
  '-1001234567890', // 官方群组
]
```

**✅ 验证 Webhook:**
```typescript
// 在 webhook 端点验证请求来源
app.post('/webhook/telegram', (req, res) => {
  const ip = req.ip;
  // 验证 IP 是否来自 Telegram
  if (!isTelegramIP(ip)) {
    return res.status(403).send('Forbidden');
  }
  // 处理 webhook
});
```

---

### 2. 性能优化

**✅ 合理设置 Polling 间隔:**
```typescript
// 开发环境 - 快速响应
pollingInterval: 1000

// 生产环境 - 节省资源
pollingInterval: 3000
```

**✅ 使用 Webhook 替代 Polling:**
```typescript
// 高流量场景使用 webhook
config: {
  webhookUrl: 'https://your-domain.com/webhook',
  // 不需要 pollingInterval
}
```

**✅ 消息批处理:**
```typescript
// 批量发送 (如果平台支持)
const messages = ['msg1', 'msg2', 'msg3'];
await Promise.all(
  messages.map(msg => channel.sendMessage(chatId, msg))
);
```

---

### 3. 错误恢复

**✅ 实现重试逻辑:**
```typescript
async sendMessageWithRetry(
  targetId: string,
  content: string,
  maxRetries = 3
): Promise<SendMessageResult> {
  for (let i = 0; i < maxRetries; i++) {
    const result = await channel.sendMessage(targetId, content);
    if (result.success) return result;
    
    // 等待后重试
    await new Promise(r => setTimeout(r, 1000 * (i + 1)));
  }
  
  return { success: false, error: 'Max retries exceeded' };
}
```

**✅ 监控连接状态:**
```typescript
setInterval(() => {
  const status = channel.getStatus();
  if (status === 'error' || status === 'disconnected') {
    console.warn('Channel unhealthy, attempting reconnect...');
    channel.connect().catch(console.error);
  }
}, 60000); // 每分钟检查
```

---

### 4. 日志记录

**✅ 记录关键事件:**
```typescript
channel.onEvent(event => {
  logger.info('Channel event', {
    type: event.type,
    channelId: event.channelId,
    timestamp: event.timestamp,
    data: event.data,
  });
});

channel.onMessage(message => {
  logger.debug('Received message', {
    from: message.senderId,
    content: message.content,
    timestamp: message.timestamp,
  });
});
```

---

## 故障排查

### 常见问题

#### 1. 无法连接 (Unauthorized)

**症状:** `Error: Unauthorized`

**原因:** Bot Token 无效或已过期

**解决方案:**
1. 在 BotFather 重新生成 Token
2. 更新环境变量
3. 重启应用

```bash
# 重新生成 Token
# 在 Telegram 中联系 @BotFather
# /revoke - 撤销旧 Token
# /newbot - 创建新 Bot

# 更新 .env
TELEGRAM_BOT_TOKEN=new_token_here
```

---

#### 2. 收不到消息

**症状:** `onMessage` 回调不触发

**排查步骤:**
1. 检查 Bot 是否已添加到群组/频道
2. 验证 `allowedChatIds` 配置
3. 查看 polling 是否正常工作
4. 检查 Bot 隐私设置

```typescript
// 启用调试日志
channel.onEvent(event => {
  console.log('Event:', event);
});

// 检查状态
console.log('Status:', channel.getStatus());
console.log('Last error:', channel.getLastError());
```

---

#### 3. 消息发送失败 (Chat not found)

**症状:** `Bad Request: chat not found`

**原因:** 
- 聊天 ID 不正确
- Bot 不在该聊天中
- 聊天已被封禁

**解决方案:**
1. 验证聊天 ID 格式 (用户 ID 为正数，群组 ID 为负数)
2. 确保 Bot 已加入群组
3. 检查 Bot 权限

```typescript
// 正确的聊天 ID 格式
await channel.sendMessage('123456789', 'Hello'); // 个人聊天
await channel.sendMessage('-1001234567890', 'Hello'); // 超级群组
```

---

#### 4. 速率限制 (Too Many Requests)

**症状:** `Too Many Requests: retry after 42`

**原因:** 超过 Telegram API 速率限制

**解决方案:**
1. 实现指数退避重试
2. 减少消息频率
3. 使用消息队列

```typescript
async sendMessageWithRateLimit(targetId: string, content: string) {
  try {
    return await channel.sendMessage(targetId, content);
  } catch (error: any) {
    if (error.message.includes('retry after')) {
      const retryAfter = parseInt(error.message.match(/retry after (\d+)/)[1]);
      await new Promise(r => setTimeout(r, retryAfter * 1000));
      return channel.sendMessage(targetId, content);
    }
    throw error;
  }
}
```

---

#### 5. Webhook 不工作

**症状:** 设置了 webhook 但收不到更新

**排查步骤:**
1. 验证 webhook URL 可公开访问
2. 检查 SSL 证书
3. 确认端口正确 (443, 80, 88, 8443)
4. 查看 webhook 状态

```typescript
// 检查 webhook 状态
const webhookInfo = await fetch(
  `https://api.telegram.org/bot${TOKEN}/getWebhookInfo`
).then(r => r.json());

console.log('Webhook info:', webhookInfo);
```

---

## 测试指南

### 单元测试

运行测试:

```bash
# 运行所有测试
npm test

# 只运行 TelegramChannel 测试
npm test -- TelegramChannel.test.ts

# 运行集成测试 (需要配置)
TELEGRAM_TEST_BOT_TOKEN=xxx TELEGRAM_TEST_CHAT_ID=yyy npm test
```

### 测试配置

创建 `.env.test`:

```bash
TELEGRAM_TEST_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyz
TELEGRAM_TEST_CHAT_ID=123456789
```

### 手动测试

```typescript
// test-manual.ts
import { TelegramChannel } from './TelegramChannel';

async function test() {
  const channel = new TelegramChannel({
    name: 'Test Bot',
    type: 'telegram',
    enabled: true,
    status: 'disconnected',
    config: {
      botToken: process.env.TELEGRAM_BOT_TOKEN!,
    },
  });

  // 监听所有事件
  channel.onEvent(event => {
    console.log('📡 Event:', event.type, event.data);
  });

  // 监听消息
  channel.onMessage(message => {
    console.log('💬 Message:', message.content);
  });

  try {
    // 连接
    console.log('Connecting...');
    await channel.connect();
    console.log('✅ Connected as:', channel.getBotUsername());

    // 发送测试消息
    console.log('Sending test message...');
    const result = await channel.sendMessage(
      'YOUR_CHAT_ID',
      '🧪 Test message from manual test'
    );
    console.log('Send result:', result);

    // 保持运行
    console.log('Listening for messages... (Ctrl+C to exit)');
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

test();
```

---

## 文件结构

```
src/renderer/channels/
├── types.ts                          # 类型定义
├── ChannelManager.ts                 # 中央管理器
├── telegram/
│   ├── TelegramChannel.ts            # Telegram 实现 ⭐
│   ├── TelegramChannel.test.ts       # 测试套件
│   └── README.md                     # 本文档
├── discord/                          # (待实现)
├── whatsapp/                         # (待实现)
└── slack/                            # (待实现)
```

---

## 后续计划

### Phase 1 (已完成) ✅
- [x] 核心类型定义
- [x] TelegramChannel 实现
- [x] 单元测试
- [x] 使用文档

### Phase 2 (计划中)
- [ ] 支持发送图片/文件
- [ ] 支持发送语音/视频
- [ ] 内联键盘支持
- [ ] 消息编辑/删除

### Phase 3 (未来)
- [ ] Telegram Passport 集成
- [ ] 支付功能
- [ ] 游戏支持
- [ ] Sticker 管理

---

## 相关资源

- [Telegram Bot API 文档](https://core.telegram.org/bots/api)
- [Telegram Bot FAQ](https://core.telegram.org/bots/faq)
- [AxonClaw Channel 系统文档](../README.md)
- [ChannelManager API](../ChannelManager.ts)

---

## 贡献指南

欢迎贡献代码！请遵循:

1. Fork 项目
2. 创建特性分支 (`git checkout -b feature/telegram-feature`)
3. 提交更改 (`git commit -m 'Add telegram feature'`)
4. 推送到分支 (`git push origin feature/telegram-feature`)
5. 开启 Pull Request

### 代码规范

- 使用 TypeScript 严格模式
- 遵循 ESLint 配置
- 编写单元测试 (覆盖率 > 80%)
- 更新文档

---

**AxonClaw Development Team** 🜏
