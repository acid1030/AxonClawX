# Channel 系统架构可视化

## 系统架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                         AxonClaw Application                     │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    UI Layer (React)                       │  │
│  │  ┌────────────────────────────────────────────────────┐  │  │
│  │  │        ChannelManagementView.tsx                   │  │  │
│  │  │  • Channel 列表展示                                 │  │  │
│  │  │  • 添加/删除/编辑 Channel                           │  │  │
│  │  │  • 状态监控和统计                                   │  │  │
│  │  │  • 平台特定配置表单                                 │  │  │
│  │  └────────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              ↓ IPC                               │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                 ChannelManager Layer                      │  │
│  │  ┌────────────────────────────────────────────────────┐  │  │
│  │  │              ChannelManager (Singleton)             │  │  │
│  │  │  • 生命周期管理 (add/remove/connect/disconnect)     │  │  │
│  │  │  • 事件路由和广播                                   │  │  │
│  │  │  • 自动重连机制                                     │  │  │
│  │  │  • 统计追踪                                         │  │  │
│  │  │  • 消息路由 (单发/广播)                             │  │  │
│  │  └────────────────────────────────────────────────────┘  │  │
│  │                              ↓                              │  │
│  │  ┌────────────────────────────────────────────────────┐  │  │
│  │  │           ChannelWrapper (Decorator)                │  │  │
│  │  │  • 自动重连逻辑                                     │  │  │
│  │  │  • 事件发射增强                                     │  │  │
│  │  │  • 状态跟踪                                         │  │  │
│  │  │  • 错误处理                                         │  │  │
│  │  └────────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              ↓ Factory                           │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              Channel Abstraction Layer                    │  │
│  │                                                            │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │  │
│  │  │   Telegram   │  │   WhatsApp   │  │   Discord    │   │  │
│  │  │   Channel    │  │   Channel    │  │   Channel    │   │  │
│  │  │              │  │              │  │              │   │  │
│  │  │  - connect   │  │  - connect   │  │  - connect   │   │  │
│  │  │  - disconnect│  │  - disconnect│  │  - disconnect│   │  │
│  │  │  - sendMsg   │  │  - sendMsg   │  │  - sendMsg   │   │  │
│  │  │  - getStatus │  │  - getStatus │  │  - getStatus │   │  │
│  │  └──────────────┘  └──────────────┘  └──────────────┘   │  │
│  │                                                            │  │
│  │  ┌──────────────┐                                        │  │
│  │  │    Slack     │  (更多平台可扩展)                       │  │
│  │  │   Channel    │                                        │  │
│  │  └──────────────┘                                        │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              ↓ SDK                               │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                  Platform SDK Layer                       │  │
│  │                                                            │  │
│  │  node-telegram    whatsapp-api    discord.js    @slack/   │  │
│  │  -bot-api         (or Meta API)                  bolt     │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## 数据流图

### 消息发送流程

```
User Input
    ↓
[ChannelManagementView]
    ↓ (sendMessage API call)
[ChannelManager]
    ↓ (validate & route)
[ChannelWrapper]
    ↓ (decorated send)
[Platform Channel]
    ↓ (SDK call)
[Platform API]
    ↓
Message Sent ✓
```

### 消息接收流程

```
[Platform API]
    ↓ (webhook/polling)
[Platform Channel]
    ↓ (normalize)
[ChannelWrapper]
    ↓ (emit event)
[ChannelManager]
    ↓ (broadcast to listeners)
[Message Handlers]
    ↓
Application Logic
```

### 事件流图

```
Channel Event (connect/disconnect/error/message)
    ↓
[ChannelWrapper.onEvent]
    ↓ (emit)
[ChannelManager.eventListeners]
    ↓ (notify all)
[UI Components] [Message Handlers] [Analytics]
```

## 类关系图

```
┌─────────────────────────┐
│   ChannelManager        │
│   (Singleton)           │
│─────────────────────────│
│ + getInstance()         │
│ + addChannel()          │
│ + removeChannel()       │
│ + connectChannel()      │
│ + disconnectChannel()   │
│ + sendMessage()         │
│ + broadcast()           │
│ + onEvent()             │
│ + onMessage()           │
│ + getStats()            │
└───────────┬─────────────┘
            │ manages
            │ 1..*
            ↓
┌─────────────────────────┐
│   ChannelWrapper        │
│   (Decorator)           │
│─────────────────────────│
│ + connect()             │
│ + disconnect()          │
│ + sendMessage()         │
│ + getStatus()           │
│ + onEvent()             │
└───────────┬─────────────┘
            │ decorates
            │
            ↓
┌─────────────────────────┐
│      IChannel           │
│      (Interface)        │
│─────────────────────────│
│ + id: string            │
│ + config: ChannelConfig │
│ + connect(): Promise    │
│ + disconnect(): Promise │
│ + sendMessage()         │
│ + getStatus()           │
│ + getLastError()        │
└───────────┬─────────────┘
            │ implemented by
            │
     ┌──────┴──────┬──────────────┬──────────────┐
     ↓             ↓              ↓              ↓
┌─────────┐ ┌──────────┐ ┌──────────┐ ┌─────────┐
│Telegram │ │WhatsApp  │ │ Discord  │ │  Slack  │
│Channel  │ │Channel   │ │ Channel  │ │ Channel │
└─────────┘ └──────────┘ └──────────┘ └─────────┘
```

## 类型层次结构

```
ChannelConfig (Union Type)
    │
    ├─ TelegramConfig
    │   └─ config: { botToken, botUsername, allowedChatIds, ... }
    │
    ├─ WhatsAppConfig
    │   └─ config: { apiToken, phoneNumberId, businessAccountId, ... }
    │
    ├─ DiscordConfig
    │   └─ config: { botToken, applicationId, allowedGuildIds, ... }
    │
    └─ SlackConfig
        └─ config: { botToken, signingSecret, allowedChannelIds, ... }

ChannelStatus (Union Type)
    ├─ connected
    ├─ disconnected
    ├─ connecting
    ├─ error
    └─ auth_required

ChannelEventType (Union Type)
    ├─ connected
    ├─ disconnected
    ├─ error
    ├─ message
    └─ status_change
```

## 文件依赖关系

```
index.ts
    │
    ├─→ types.ts
    │       └─ (no dependencies)
    │
    ├─→ ChannelManager.ts
    │       └─→ types.ts
    │
    └─→ ChannelManagementView.tsx
            ├─→ types.ts
            └─→ ChannelManager.ts
```

## 状态转换图

```
Channel Lifecycle:

    ┌─────────────┐
    │disconnected │
    └──────┬──────┘
           │ connect()
           ↓
    ┌─────────────┐
    │ connecting  │──────────────┐
    └──────┬──────┘              │
           │                     │
     ┌─────┴─────┐               │
     │           │               │
     ↓           ↓               │
┌─────────┐ ┌────────┐           │
│connected│ │ error  │───retry───┘
└────┬────┘ └────────┘
     │
     │ disconnect()
     ↓
┌─────────────┐
│disconnected │
└─────────────┘
```

## 组件通信图

```
┌──────────────────┐
│  MainLayout      │
│                  │
│  ┌────────────┐  │
│  │ Navigation │  │
│  └─────┬──────┘  │
│        │ click   │
│        ↓         │
│  ┌────────────┐  │
│  │ "channels" │  │
│  └─────┬──────┘  │
└────────┼────────┘
         │
         ↓ render
┌────────────────────────────┐
│  ChannelManagementView     │
│                            │
│  ┌──────────────────────┐  │
│  │  Channel List        │  │
│  │  • Status indicators │  │
│  │  • Toggle switches   │  │
│  │  • Delete buttons    │  │
│  └──────────────────────┘  │
│                            │
│  ┌──────────────────────┐  │
│  │  Add Channel Modal   │  │
│  │  • Platform select   │  │
│  │  • Config form       │  │
│  └──────────────────────┘  │
│                            │
│  Uses: ChannelManager      │
└────────────────────────────┘
         │
         │ calls
         ↓
┌────────────────────────────┐
│  ChannelManager            │
│  • manage channels         │
│  • route events            │
│  • track stats             │
└────────────────────────────┘
```

## 部署架构

```
┌─────────────────────────────────────────┐
│           Electron Main Process          │
│                                          │
│  ┌────────────────────────────────────┐ │
│  │  ChannelManager (Node.js)          │ │
│  │  • Platform SDKs                   │ │
│  │  • WebSocket servers (optional)    │ │
│  └────────────────────────────────────┘ │
└─────────────────────────────────────────┘
                    ↑↓ IPC
┌─────────────────────────────────────────┐
│         Electron Renderer Process        │
│                                          │
│  ┌────────────────────────────────────┐ │
│  │  React UI (ChannelManagementView)  │ │
│  │  • Channel list                    │ │
│  │  • Config forms                    │ │
│  └────────────────────────────────────┘ │
└─────────────────────────────────────────┘
                    ↓ HTTPS/Webhook
┌─────────────────────────────────────────┐
│           External Platforms             │
│                                          │
│  Telegram API    WhatsApp API           │
│  Discord API     Slack API              │
└─────────────────────────────────────────┘
```

---

**AxonClaw Channel System - Architecture Visualization** 🜏
