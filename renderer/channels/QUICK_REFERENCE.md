# Channel 系统快速参考

## 核心 API

### ChannelManager

```typescript
import { ChannelManager } from './channels';

// 获取实例
const manager = ChannelManager.getInstance({
  autoReconnect: true,
  reconnectDelay: 5000,
  maxReconnectAttempts: 5,
});

// 注册平台
manager.registerChannelType('telegram', telegramFactory);

// 添加 Channel
const id = await manager.addChannel(config);

// 发送消息
await manager.sendMessage(channelId, targetId, content);

// 监听事件
manager.onEvent(event => console.log(event));
```

## 类型速查

### ChannelType
- `telegram` - Telegram Bot
- `whatsapp` - WhatsApp Business
- `discord` - Discord Bot
- `slack` - Slack App

### ChannelStatus
- `connected` - 已连接
- `disconnected` - 已断开
- `connecting` - 连接中
- `error` - 错误
- `auth_required` - 需要认证

### 消息类型
- `text` - 文本
- `image` - 图片
- `file` - 文件
- `voice` - 语音
- `video` - 视频

## 配置示例

### Telegram
```typescript
{
  name: 'My Bot',
  type: 'telegram',
  enabled: true,
  config: {
    botToken: '123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11',
    pollingInterval: 3000,
  }
}
```

### Discord
```typescript
{
  name: 'Discord Bot',
  type: 'discord',
  enabled: true,
  config: {
    botToken: 'MTIzNDU2Nzg5...token',
    intents: 32767,
  }
}
```

### WhatsApp
```typescript
{
  name: 'WhatsApp Business',
  type: 'whatsapp',
  enabled: true,
  config: {
    apiToken: 'EAAB...token',
    phoneNumberId: '123456789',
    businessAccountId: '987654321',
  }
}
```

### Slack
```typescript
{
  name: 'Slack Bot',
  type: 'slack',
  enabled: true,
  config: {
    botToken: 'xoxb-...token',
    socketMode: true,
  }
}
```

## 常用操作

### 连接/断开
```typescript
await manager.connectChannel(channelId);
await manager.disconnectChannel(channelId);
```

### 广播消息
```typescript
const results = await manager.broadcast(
  ['ch1', 'ch2', 'ch3'],
  '@channel',
  '重要通知'
);
```

### 获取统计
```typescript
const stats = manager.getStats(channelId);
console.log(stats.messagesSent);
console.log(stats.uptime);
```

### 删除 Channel
```typescript
await manager.removeChannel(channelId);
```

## 事件监听

```typescript
manager.onEvent(event => {
  switch (event.type) {
    case 'connected':
      // Channel 已连接
      break;
    case 'disconnected':
      // Channel 已断开
      break;
    case 'error':
      // 发生错误
      console.error(event.data.error);
      break;
    case 'message':
      // 收到消息
      console.log(event.data.message);
      break;
  }
});
```

## 错误处理

```typescript
try {
  await manager.sendMessage(channelId, target, content);
} catch (error) {
  if (error.message.includes('rate_limit')) {
    // 等待后重试
    setTimeout(() => {
      manager.sendMessage(channelId, target, content);
    }, 1000);
  } else {
    // 其他错误
    console.error(error);
  }
}
```

## UI 集成

```typescript
import { ChannelManagementView } from './channels';

function App() {
  return (
    <ChannelManagementView 
      channelManager={manager}
    />
  );
}
```

## 文件位置

```
src/renderer/channels/
├── types.ts                    # 类型定义
├── ChannelManager.ts           # 管理器
├── ChannelManagementView.tsx   # UI 组件
├── index.ts                    # 导出
├── README.md                   # 详细文档
└── QUICK_REFERENCE.md          # 本文件
```

## 依赖安装

```bash
# Telegram
npm install node-telegram-bot-api

# Discord
npm install discord.js

# WhatsApp
npm install whatsapp-api

# Slack
npm install @slack/bolt
```

## 环境变量

```bash
TELEGRAM_BOT_TOKEN=123456:ABC-DEF...
DISCORD_BOT_TOKEN=MTIzNDU2...
WHATSAPP_API_TOKEN=EAAB...
SLACK_BOT_TOKEN=xoxb-...
```

---

**快速参考 | AxonClaw Channel System** 🜏
