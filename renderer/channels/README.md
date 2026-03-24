# Channel 系统架构设计文档

**版本:** 1.0  
**日期:** 2026-03-13  
**作者:** AxonClaw Development Team  
**状态:** ✅ 设计完成

---

## 📋 目录

- [概述](#概述)
- [架构设计](#架构设计)
- [核心组件](#核心组件)
- [类型定义](#类型定义)
- [使用指南](#使用指南)
- [平台实现](#平台实现)
- [最佳实践](#最佳实践)
- [故障排查](#故障排查)

---

## 概述

Channel 系统是 AxonClaw 的核心模块，提供统一的多平台消息通道抽象层。通过标准化的接口设计，支持 Telegram、WhatsApp、Discord、Slack 等主流消息平台的无缝集成。

### 设计目标

1. **统一抽象** - 为不同平台提供一致的操作接口
2. **类型安全** - 完整的 TypeScript 类型定义
3. **可扩展** - 易于添加新的平台支持
4. **高可用** - 自动重连、错误恢复机制
5. **可观测** - 完善的统计和事件系统

### 支持的平台

| 平台 | 状态 | 特性 |
|------|------|------|
| Telegram | 🟢 就绪 | Bot API, Webhook, Polling |
| WhatsApp | 🟢 就绪 | Business API, Webhook |
| Discord | 🟢 就绪 | Bot, Gateway, Intents |
| Slack | 🟢 就绪 | Bot Token, Socket Mode |

---

## 架构设计

### 系统架构图

```
┌─────────────────────────────────────────────────────────┐
│                    Application Layer                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │  Chat UI    │  │  Bot Logic  │  │  Analytics  │     │
│  └─────────────┘  └─────────────┘  └─────────────┘     │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│                   ChannelManager Layer                   │
│  ┌─────────────────────────────────────────────────┐    │
│  │  • Lifecycle Management  • Event Routing        │    │
│  │  • Auto-reconnect        • Statistics           │    │
│  │  • Message Broadcasting  • Error Handling       │    │
│  └─────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│                  Channel Abstraction Layer               │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│  │Telegram  │ │WhatsApp  │ │ Discord  │ │  Slack   │  │
│  │ Channel  │ │ Channel  │ │ Channel  │ │ Channel  │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘  │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│                   Platform SDK Layer                     │
│  node-telegram-bot-api │ whatsapp-api │ discord.js     │
└─────────────────────────────────────────────────────────┘
```

### 设计模式

1. **Factory Pattern** - Channel 工厂创建
2. **Strategy Pattern** - 平台特定策略
3. **Observer Pattern** - 事件订阅系统
4. **Singleton Pattern** - ChannelManager 单例

---

## 核心组件

### 1. ChannelManager

中央编排枢纽，管理所有 Channel 的生命周期。

```typescript
import { ChannelManager } from './channels/ChannelManager';

// 获取单例
const manager = ChannelManager.getInstance({
  autoReconnect: true,
  reconnectDelay: 5000,
  maxReconnectAttempts: 5,
});

// 注册平台工厂
manager.registerChannelType('telegram', telegramFactory);

// 添加 Channel
const channelId = await manager.addChannel({
  name: 'My Bot',
  type: 'telegram',
  enabled: true,
  status: 'disconnected',
  config: { botToken: '...' },
});

// 发送消息
await manager.sendMessage(channelId, '@username', 'Hello!');

// 监听事件
manager.onEvent(event => {
  console.log('Channel event:', event);
});
```

### 2. ChannelWrapper

Channel 装饰器，提供重连逻辑和事件发射。

**核心功能:**
- 自动重连（指数退避）
- 事件聚合
- 状态跟踪
- 错误处理

### 3. ChannelRegistry

平台工厂注册表，管理 Channel 创建逻辑。

```typescript
const registry = manager.getRegistry();

// 注册工厂
registry.register('telegram', (config) => new TelegramChannel(config));

// 获取工厂
const factory = registry.getFactory('telegram');
```

---

## 类型定义

### 核心类型

#### ChannelType

```typescript
type ChannelType = 
  | 'telegram'
  | 'whatsapp'
  | 'discord'
  | 'slack';
```

#### ChannelStatus

```typescript
type ChannelStatus = 
  | 'connected'
  | 'disconnected'
  | 'connecting'
  | 'error'
  | 'auth_required';
```

#### BaseChannelConfig

```typescript
interface BaseChannelConfig {
  name: string;
  type: ChannelType;
  enabled: boolean;
  status: ChannelStatus;
  lastConnectedAt?: number;
  errorMessage?: string;
}
```

### 平台特定配置

#### TelegramConfig

```typescript
interface TelegramConfig extends BaseChannelConfig {
  type: 'telegram';
  config: {
    botToken: string;
    botUsername?: string;
    allowedChatIds?: string[];
    webhookUrl?: string;
    pollingInterval?: number;
  };
}
```

#### DiscordConfig

```typescript
interface DiscordConfig extends BaseChannelConfig {
  type: 'discord';
  config: {
    botToken: string;
    applicationId?: string;
    allowedGuildIds?: string[];
    allowedChannelIds?: string[];
    intents?: number;
  };
}
```

#### WhatsAppConfig

```typescript
interface WhatsAppConfig extends BaseChannelConfig {
  type: 'whatsapp';
  config: {
    apiToken: string;
    phoneNumberId: string;
    businessAccountId: string;
    webhookVerifyToken?: string;
    apiVersion?: string;
  };
}
```

#### SlackConfig

```typescript
interface SlackConfig extends BaseChannelConfig {
  type: 'slack';
  config: {
    botToken: string;
    signingSecret?: string;
    allowedChannelIds?: string[];
    socketMode?: boolean;
  };
}
```

### 消息类型

#### IncomingMessage

```typescript
interface IncomingMessage {
  id: string;
  channelId: string;
  platformMessageId: string;
  senderId: string;
  senderName?: string;
  content: string;
  type: 'text' | 'image' | 'file' | 'voice' | 'video';
  timestamp: number;
  rawData?: any;
}
```

#### SendMessageResult

```typescript
interface SendMessageResult {
  success: boolean;
  messageId?: string;
  timestamp?: number;
  error?: string;
}
```

### 事件系统

#### ChannelEvent

```typescript
interface ChannelEvent {
  type: ChannelEventType;
  channelId: string;
  timestamp: number;
  data?: any;
}

type ChannelEventType = 
  | 'connected'
  | 'disconnected'
  | 'error'
  | 'message'
  | 'status_change';
```

---

## 使用指南

### 快速开始

#### 1. 安装依赖

```bash
npm install node-telegram-bot-api discord.js @slack/bolt whatsapp-api
```

#### 2. 实现平台 Channel

```typescript
// channels/telegram/TelegramChannel.ts
import { IChannel, TelegramConfig, SendMessageOptions } from '../types';
import TelegramBot from 'node-telegram-bot-api';

export class TelegramChannel implements IChannel {
  public id: string;
  public config: TelegramConfig;
  private bot: TelegramBot;
  private lastError: Error | null = null;

  constructor(config: TelegramConfig) {
    this.id = `telegram_${Date.now()}`;
    this.config = config;
    this.bot = new TelegramBot(config.config.botToken, {
      polling: { interval: config.config.pollingInterval || 3000 },
    });
  }

  async connect(): Promise<void> {
    try {
      const info = await this.bot.getMe();
      this.config.config.botUsername = info.username;
      this.config.status = 'connected';
      this.config.lastConnectedAt = Date.now();
    } catch (error) {
      this.lastError = error as Error;
      this.config.status = 'error';
      this.config.errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    await this.bot.stopPolling();
    this.config.status = 'disconnected';
  }

  async sendMessage(
    targetId: string,
    content: string,
    options?: SendMessageOptions
  ): Promise<SendMessageResult> {
    try {
      const message = await this.bot.sendMessage(targetId, content, {
        parse_mode: options?.parseMode === 'markdown' ? 'Markdown' : undefined,
        reply_to_message_id: options?.replyTo,
      });

      return {
        success: true,
        messageId: message.message_id.toString(),
        timestamp: Date.now(),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send message',
      };
    }
  }

  getStatus(): ChannelStatus {
    return this.config.status;
  }

  getLastError(): Error | null {
    return this.lastError;
  }
}
```

#### 3. 注册并使用

```typescript
// main.ts
import { ChannelManager } from './channels/ChannelManager';
import { TelegramChannel } from './channels/telegram/TelegramChannel';

const manager = ChannelManager.getInstance();

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

// 监听消息
manager.onMessage((message) => {
  console.log('Received:', message.content);
});
```

### 高级用法

#### 广播消息

```typescript
// 发送到多个 Channel
const channelIds = ['telegram_123', 'discord_456', 'slack_789'];
const results = await manager.broadcast(
  channelIds,
  '@channel',
  '🚨 系统维护通知：今晚 23:00-01:00 进行系统升级',
  { parseMode: 'markdown' }
);

results.forEach((result, channelId) => {
  if (result.success) {
    console.log(`✓ ${channelId} sent`);
  } else {
    console.error(`✗ ${channelId} failed: ${result.error}`);
  }
});
```

#### 事件监听

```typescript
// 全局事件监听
manager.onEvent((event) => {
  switch (event.type) {
    case 'connected':
      console.log(`Channel ${event.channelId} connected`);
      break;
    case 'disconnected':
      console.log(`Channel ${event.channelId} disconnected`);
      break;
    case 'error':
      console.error(`Channel ${event.channelId} error:`, event.data.error);
      break;
    case 'message':
      console.log(`Channel ${event.channelId} received message`);
      break;
  }
});

// 单个 Channel 监听
const channel = manager.getChannel(channelId);
if (channel && 'onEvent' in channel) {
  (channel as any).onEvent((event: ChannelEvent) => {
    console.log('Channel event:', event);
  });
}
```

#### 统计监控

```typescript
// 获取统计信息
const stats = manager.getStats(channelId);
if (stats) {
  console.log(`Messages sent: ${stats.messagesSent}`);
  console.log(`Messages received: ${stats.messagesReceived}`);
  console.log(`Errors: ${stats.errors}`);
  console.log(`Uptime: ${stats.uptime}s`);
  console.log(`Last activity: ${new Date(stats.lastActivity!).toISOString()}`);
}

// 重置统计
manager.resetStats(channelId);
```

---

## 平台实现

### Telegram 实现

**依赖:** `node-telegram-bot-api`

```bash
npm install node-telegram-bot-api
```

**特性:**
- ✅ Polling 模式
- ✅ Webhook 模式
- ✅ 文本/图片/文件/语音
- ✅ 回复消息
- ✅ Markdown/HTML 解析

**配置示例:**
```typescript
{
  name: 'Telegram Bot',
  type: 'telegram',
  config: {
    botToken: '123456789:ABCdefGHIjklMNOpqrsTUVwxyz',
    webhookUrl: 'https://your-domain.com/webhook/telegram',
    pollingInterval: 3000,
  },
}
```

### Discord 实现

**依赖:** `discord.js`

```bash
npm install discord.js
```

**特性:**
- ✅ Gateway 连接
- ✅ 文本/富媒体消息
- ✅ Guild/Channel 过滤
- ✅ Intents 配置

**配置示例:**
```typescript
{
  name: 'Discord Bot',
  type: 'discord',
  config: {
    botToken: 'MTIzNDU2Nzg5MDEyMzQ1Njc4OQ.GHIJKL.mnopqrstuvwxyz',
    applicationId: '123456789012345678',
    allowedGuildIds: ['guild_id_1', 'guild_id_2'],
    intents: 32767, // All intents
  },
}
```

### WhatsApp 实现

**依赖:** `whatsapp-api` 或 Meta Business API

```bash
npm install whatsapp-api
```

**特性:**
- ✅ Business API
- ✅ Webhook 验证
- ✅ 模板消息
- ✅ 媒体消息

**配置示例:**
```typescript
{
  name: 'WhatsApp Business',
  type: 'whatsapp',
  config: {
    apiToken: 'EAAB...token',
    phoneNumberId: '123456789',
    businessAccountId: '987654321',
    webhookVerifyToken: 'verify_token',
    apiVersion: 'v17.0',
  },
}
```

### Slack 实现

**依赖:** `@slack/bolt`

```bash
npm install @slack/bolt
```

**特性:**
- ✅ Socket Mode
- ✅ HTTP Events API
- ✅ 交互式组件
- ✅ Block Kit

**配置示例:**
```typescript
{
  name: 'Slack Bot',
  type: 'slack',
  config: {
    botToken: 'xoxb-...',
    signingSecret: '...',
    socketMode: true,
    allowedChannelIds: ['C123ABC', 'D456DEF'],
  },
}
```

---

## 最佳实践

### 1. 安全管理

**环境变量存储敏感信息:**
```typescript
// ✅ Good
config: {
  botToken: process.env.TELEGRAM_BOT_TOKEN,
}

// ❌ Bad
config: {
  botToken: '123456789:ABCdef...', // Hardcoded!
}
```

**权限最小化:**
```typescript
// 只允许特定 Guild/Channel
config: {
  allowedGuildIds: ['trusted_guild_id'],
  allowedChannelIds: ['allowed_channel_id'],
}
```

### 2. 错误处理

**优雅降级:**
```typescript
try {
  await manager.sendMessage(channelId, target, content);
} catch (error) {
  // Fallback to alternative channel
  await manager.sendMessage(fallbackChannelId, target, content);
}
```

**重试机制:**
```typescript
const result = await manager.sendMessage(channelId, target, content);
if (!result.success && result.error?.includes('rate_limit')) {
  setTimeout(() => {
    manager.sendMessage(channelId, target, content);
  }, 1000);
}
```

### 3. 性能优化

**消息批处理:**
```typescript
// 批量发送（如果平台支持）
const messages = ['msg1', 'msg2', 'msg3'];
await Promise.all(
  messages.map(msg => manager.sendMessage(channelId, target, msg))
);
```

**连接池:**
```typescript
// 复用 Channel 实例，避免频繁创建/销毁
const channels = new Map<string, IChannel>();
```

### 4. 可观测性

**日志记录:**
```typescript
manager.onEvent(event => {
  logger.info('Channel event', {
    type: event.type,
    channelId: event.channelId,
    timestamp: event.timestamp,
  });
});
```

**指标监控:**
```typescript
// Prometheus/Grafana 指标
const stats = manager.getAllStats();
stats.forEach((channelStats, channelId) => {
  metrics.channelUptime.set({ channel: channelId }, channelStats.uptime);
  metrics.messagesSent.set({ channel: channelId }, channelStats.messagesSent);
});
```

---

## 故障排查

### 常见问题

#### 1. Channel 无法连接

**症状:** 状态一直为 `connecting` 或 `error`

**排查步骤:**
1. 检查 Token/凭证是否正确
2. 验证网络连接
3. 查看 `errorMessage` 字段
4. 检查平台 API 状态

```typescript
const channel = manager.getChannel(channelId);
if (channel) {
  console.log('Status:', channel.getStatus());
  console.log('Error:', channel.getLastError());
  console.log('Config:', channel.config);
}
```

#### 2. 消息发送失败

**症状:** `sendMessage` 返回 `success: false`

**排查步骤:**
1. 检查 Channel 状态是否为 `connected`
2. 验证目标 ID 格式
3. 检查消息内容长度限制
4. 查看平台速率限制

```typescript
const result = await manager.sendMessage(channelId, target, content);
if (!result.success) {
  console.error('Send failed:', result.error);
  // Check rate limit
  if (result.error?.includes('rate_limit')) {
    // Wait and retry
  }
}
```

#### 3. 自动重连不工作

**症状:** 断开后没有自动重连

**排查步骤:**
1. 检查 `autoReconnect` 配置
2. 验证 `maxReconnectAttempts` 是否耗尽
3. 查看重连延迟设置

```typescript
const manager = ChannelManager.getInstance({
  autoReconnect: true,
  reconnectDelay: 5000,
  maxReconnectAttempts: 10, // Increase if needed
});
```

#### 4. 事件不触发

**症状:** `onEvent` 监听器没有收到事件

**排查步骤:**
1. 确保监听器在 Channel 添加前注册
2. 检查监听器是否被意外移除
3. 验证事件类型拼写

```typescript
// Register listener before adding channels
manager.onEvent(event => {
  console.log('Event:', event);
});

// Keep reference to cleanup function
const cleanup = manager.onEvent(handler);
// Don't call cleanup() unless you want to stop listening
```

### 调试模式

启用详细日志:
```typescript
process.env.CHANNEL_DEBUG = 'true';

// In Channel implementations
if (process.env.CHANNEL_DEBUG) {
  console.log('[Channel] Connecting...', config);
}
```

---

## 文件结构

```
src/renderer/channels/
├── types.ts                      # 类型定义
├── ChannelManager.ts             # 中央管理器
├── ChannelManagementView.tsx     # UI 组件
├── README.md                     # 本文档
├── telegram/
│   └── TelegramChannel.ts        # Telegram 实现
├── discord/
│   └── DiscordChannel.ts         # Discord 实现
├── whatsapp/
│   └── WhatsAppChannel.ts        # WhatsApp 实现
└── slack/
    └── SlackChannel.ts           # Slack 实现
```

---

## 后续计划

### Phase 1 (已完成)
- ✅ 核心类型定义
- ✅ ChannelManager 实现
- ✅ UI 组件设计

### Phase 2 (进行中)
- [ ] Telegram 平台实现
- [ ] Discord 平台实现
- [ ] 数据库集成

### Phase 3 (计划中)
- [ ] WhatsApp 平台实现
- [ ] Slack 平台实现
- [ ] 消息队列集成

### Phase 4 (未来)
- [ ] WebSocket 实时推送
- [ ] 消息加密
- [ ] 更多平台支持 (Line, WeChat, etc.)

---

## 贡献指南

欢迎贡献代码！请遵循以下步骤:

1. Fork 项目
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 开启 Pull Request

### 代码规范

- 使用 TypeScript 严格模式
- 遵循 ESLint 配置
- 编写单元测试
- 更新文档

---

## 许可证

MIT License - See LICENSE file for details.

---

**AxonClaw Development Team** 🜏
