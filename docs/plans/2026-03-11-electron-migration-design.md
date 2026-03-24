# ClawDeskTop-Electron 迁移设计文档

> 将 ClawDeskTop-Python (PyQt6) 迁移到 Electron + React 19 + Tailwind CSS + OpenClaw
> 
> **创建时间**: 2026-03-11
> **状态**: 设计阶段

---

## 一、项目概述

### 1.1 背景

**源项目**: ClawDeskTop-Python (AxonClaw)
- **技术栈**: Python 3.9+ + PyQt6
- **代码量**: ~11,000+ 行，24 个文件
- **功能模块**: 10 个完整模块

**目标**: 迁移到现代化 Web 技术栈，与 ClawX 架构保持一致

### 1.2 目标架构

```
┌─────────────────────────────────────────────────────────────┐
│                   ClawDeskTop-Electron                      │
├─────────────────────────────────────────────────────────────┤
│  渲染进程 (React 19 + Tailwind CSS + TypeScript)            │
│    ↓ WebSocket (ws://127.0.0.1:18789)                       │
│  主进程 (Electron Main)                                      │
│    ↓ 子进程/嵌入                                              │
│  OpenClaw Gateway (内置)                                     │
│    ↓ HTTP/WebSocket                                          │
│  LLM / 外部服务                                              │
└─────────────────────────────────────────────────────────────┘
```

### 1.3 技术栈

| 层级 | 技术 | 用途 |
|------|------|------|
| **框架** | Electron 33+ | 跨平台桌面应用 |
| **UI** | React 19 + TypeScript | 组件化 UI 开发 |
| **样式** | Tailwind CSS 4 + shadcn/ui | 现代化样式系统 |
| **状态管理** | Zustand | 轻量级状态管理 |
| **通信** | WebSocket | 实时双向通信 |
| **核心** | OpenClaw Gateway | Agent 执行引擎 |
| **构建** | Vite + electron-builder | 快速构建和打包 |

---

## 二、架构设计

### 2.1 目录结构

```
ClawDeskTop-Electron/
├── package.json
├── electron.vite.config.ts          # Electron Vite 配置
├── tsconfig.json
├── tailwind.config.js
├── src/
│   ├── main/                         # Electron 主进程
│   │   ├── index.ts                  # 主进程入口
│   │   ├── gateway/                  # Gateway 管理
│   │   │   ├── manager.ts            # Gateway 生命周期管理
│   │   │   └── process.ts            # 子进程管理
│   │   ├── ipc/                      # IPC 通信
│   │   │   ├── handlers.ts           # IPC 处理器
│   │   │   └── channels.ts           # 通道定义
│   │   └── tray/                     # 系统托盘
│   │       └── index.ts
│   │
│   ├── renderer/                     # 渲染进程 (React)
│   │   ├── index.html
│   │   ├── main.tsx                  # React 入口
│   │   ├── App.tsx                   # 根组件
│   │   ├── components/               # 通用组件
│   │   │   ├── ui/                   # shadcn/ui 组件
│   │   │   │   ├── button.tsx
│   │   │   │   ├── input.tsx
│   │   │   │   ├── dialog.tsx
│   │   │   │   └── ...
│   │   │   ├── layout/               # 布局组件
│   │   │   │   ├── Sidebar.tsx       # 侧边栏
│   │   │   │   ├── Header.tsx        # 顶部栏
│   │   │   │   └── MainLayout.tsx    # 主布局
│   │   │   └── shared/               # 共享组件
│   │   │       ├── MessageBubble.tsx # 消息气泡
│   │   │       ├── MarkdownRenderer.tsx
│   │   │       └── CodeBlock.tsx
│   │   │
│   │   ├── views/                    # 页面组件
│   │   │   ├── ChatView.tsx          # 对话界面
│   │   │   ├── SessionsView.tsx      # 会话管理
│   │   │   ├── AgentsView.tsx        # 代理管理
│   │   │   ├── NodesView.tsx         # 节点管理
│   │   │   ├── SkillsView.tsx        # 技能管理
│   │   │   ├── CronView.tsx          # 定时任务
│   │   │   ├── ConfigView.tsx        # 配置中心
│   │   │   ├── LogsView.tsx          # 日志查看
│   │   │   └── SettingsView.tsx      # 系统设置
│   │   │
│   │   ├── hooks/                    # 自定义 Hooks
│   │   │   ├── useWebSocket.ts       # WebSocket 连接
│   │   │   ├── useGateway.ts         # Gateway 状态
│   │   │   ├── useSessions.ts        # 会话管理
│   │   │   └── useTheme.ts           # 主题管理
│   │   │
│   │   ├── stores/                   # Zustand 状态管理
│   │   │   ├── gatewayStore.ts       # Gateway 状态
│   │   │   ├── sessionsStore.ts      # 会话状态
│   │   │   ├── messagesStore.ts      # 消息状态
│   │   │   └── settingsStore.ts      # 设置状态
│   │   │
│   │   ├── lib/                      # 工具库
│   │   │   ├── gateway-client.ts     # Gateway WebSocket 客户端
│   │   │   ├── types.ts              # TypeScript 类型定义
│   │   │   └── utils.ts              # 工具函数
│   │   │
│   │   └── styles/                   # 样式文件
│   │       ├── globals.css           # 全局样式
│   │       └── themes/               # 主题
│   │           └── dark.css
│   │
│   └── preload/                      # 预加载脚本
│       └── index.ts                  # 暴露 API 给渲染进程
│
├── resources/                        # 资源文件
│   ├── icons/                        # 图标
│   └── images/                       # 图片
│
└── build/                            # 构建配置
    ├── entitlements.mac.plist
    └── notarize.js
```

### 2.2 核心模块设计

#### 2.2.1 Gateway 管理器（主进程）

```typescript
// src/main/gateway/manager.ts

import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';

export class GatewayManager extends EventEmitter {
  private process: ChildProcess | null = null;
  private port: number = 18789;
  private isRunning: boolean = false;

  async start(): Promise<void> {
    if (this.isRunning) return;
    
    // 方式1: 通过 npm 包启动
    // 方式2: 通过子进程启动 openclaw gateway run
    this.process = spawn('openclaw', ['gateway', 'run', '--compact'], {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: process.env,
    });

    this.process.stdout?.on('data', (data) => {
      this.emit('log', 'info', data.toString());
    });

    this.process.stderr?.on('data', (data) => {
      this.emit('log', 'error', data.toString());
    });

    this.process.on('exit', (code) => {
      this.isRunning = false;
      this.emit('stopped', code);
    });

    // 等待 Gateway 就绪
    await this.waitForReady();
    this.isRunning = true;
    this.emit('started');
  }

  async stop(): Promise<void> {
    if (this.process) {
      this.process.kill();
      this.process = null;
      this.isRunning = false;
    }
  }

  private async waitForReady(): Promise<void> {
    // 轮询健康检查
    for (let i = 0; i < 60; i++) {
      try {
        const response = await fetch(`http://127.0.0.1:${this.port}/health`);
        if (response.ok) return;
      } catch (e) {
        // 继续等待
      }
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    throw new Error('Gateway 启动超时');
  }
}
```

#### 2.2.2 WebSocket 客户端（渲染进程）

```typescript
// src/renderer/lib/gateway-client.ts

import { EventEmitter } from 'events';

export interface GatewayMessage {
  type: string;
  sessionKey?: string;
  text?: string;
  [key: string]: any;
}

export class GatewayClient extends EventEmitter {
  private ws: WebSocket | null = null;
  private url: string = 'ws://127.0.0.1:18789';
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;

  connect(): void {
    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
      this.emit('connected');
      
      // 发送认证
      this.send({ type: 'auth', token: 'clawx-desktop' });
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.handleMessage(data);
      } catch (e) {
        console.error('Failed to parse message:', e);
      }
    };

    this.ws.onclose = () => {
      this.emit('disconnected');
      this.attemptReconnect();
    };

    this.ws.onerror = (error) => {
      this.emit('error', error);
    };
  }

  private handleMessage(data: any): void {
    switch (data.type) {
      case 'chat.reply':
        this.emit('chat:reply', data);
        break;
      case 'chat.streaming':
        this.emit('chat:streaming', data);
        break;
      case 'tool.call':
        this.emit('tool:call', data);
        break;
      case 'tool.result':
        this.emit('tool:result', data);
        break;
      case 'session.update':
        this.emit('session:update', data);
        break;
      default:
        this.emit('message', data);
    }
  }

  send(message: GatewayMessage): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      setTimeout(() => this.connect(), 2000 * this.reconnectAttempts);
    }
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}
```

#### 2.2.3 状态管理（Zustand）

```typescript
// src/renderer/stores/sessionsStore.ts

import { create } from 'zustand';

interface Session {
  key: string;
  label: string | null;
  model: string | null;
  messageCount: number;
  tokenCount: number;
  lastActiveAt: string | null;
  status: 'active' | 'error';
}

interface SessionsState {
  sessions: Session[];
  activeSessionKey: string | null;
  isLoading: boolean;
  
  // Actions
  setSessions: (sessions: Session[]) => void;
  setActiveSession: (key: string | null) => void;
  addSession: (session: Session) => void;
  updateSession: (key: string, updates: Partial<Session>) => void;
  removeSession: (key: string) => void;
}

export const useSessionsStore = create<SessionsState>((set) => ({
  sessions: [],
  activeSessionKey: null,
  isLoading: false,

  setSessions: (sessions) => set({ sessions }),
  setActiveSession: (key) => set({ activeSessionKey: key }),
  addSession: (session) => set((state) => ({
    sessions: [...state.sessions, session]
  })),
  updateSession: (key, updates) => set((state) => ({
    sessions: state.sessions.map((s) =>
      s.key === key ? { ...s, ...updates } : s
    )
  })),
  removeSession: (key) => set((state) => ({
    sessions: state.sessions.filter((s) => s.key !== key)
  })),
}));
```

---

## 三、功能模块迁移映射

### 3.1 Phase 1: 核心模块（第 1-4 天）

| 原模块 (PyQt6) | 新模块 (React) | 文件 | 功能 |
|----------------|----------------|------|------|
| `main_window.py` | `MainLayout.tsx` | 布局 | 主窗口 + 侧边栏 |
| `chat_widget.py` | `ChatView.tsx` | 对话 | 消息列表 + 输入框 |
| `message_bubble.py` | `MessageBubble.tsx` | 组件 | 消息气泡 |
| `markdown_renderer.py` | `MarkdownRenderer.tsx` | 组件 | Markdown 渲染 |
| `code_highlighter.py` | `CodeBlock.tsx` | 组件 | 代码高亮 |
| `sessions_widget.py` | `SessionsView.tsx` | 页面 | 会话管理 |
| `gateway_manager.py` | `gateway/manager.ts` | 主进程 | Gateway 管理 |

### 3.2 Phase 2: 管理模块（第 5-7 天）

| 原模块 (PyQt6) | 新模块 (React) | 文件 | 功能 |
|----------------|----------------|------|------|
| `subagents_widget.py` | `AgentsView.tsx` | 页面 | 代理管理 |
| `nodes_widget.py` | `NodesView.tsx` | 页面 | 节点管理 |
| `skills_widget.py` | `SkillsView.tsx` | 页面 | 技能管理 |

### 3.3 Phase 3: 高级模块（第 8-10 天）

| 原模块 (PyQt6) | 新模块 (React) | 文件 | 功能 |
|----------------|----------------|------|------|
| `cron_widget.py` | `CronView.tsx` | 页面 | 定时任务 |
| `config_widget.py` | `ConfigView.tsx` | 页面 | 配置中心 |
| `logs_widget.py` | `LogsView.tsx` | 页面 | 日志查看 |
| `settings_widget.py` | `SettingsView.tsx` | 页面 | 系统设置 |
| `version_manager.py` | `lib/version.ts` | 工具 | 版本管理 |
| `license_manager.py` | `lib/license.ts` | 工具 | 许可证 |

---

## 四、UI 设计规范

### 4.1 颜色系统（与原版一致）

```css
/* src/renderer/styles/globals.css */

:root {
  /* 背景 */
  --bg-main: #0f172a;      /* Slate 900 */
  --bg-panel: #1e293b;     /* Slate 800 */
  --bg-hover: #334155;     /* Slate 700 */
  
  /* 边框 */
  --border: #475569;       /* Slate 600 */
  --border-light: #64748b; /* Slate 500 */
  
  /* 文本 */
  --text-primary: #f1f5f9;   /* Slate 100 */
  --text-secondary: #94a3b8; /* Slate 400 */
  --text-muted: #64748b;     /* Slate 500 */
  
  /* 品牌色 */
  --brand: #6366f1;         /* Indigo 500 */
  --brand-hover: #818cf8;   /* Indigo 400 */
  --brand-light: #a5b4fc;   /* Indigo 300 */
  
  /* 状态色 */
  --success: #22c55e; /* Green 500 */
  --error: #ef4444;   /* Red 500 */
  --warning: #eab308; /* Yellow 500 */
  
  /* 气泡色 */
  --user-bubble: #3b82f6; /* Blue 500 */
  --ai-bubble: #374151;   /* Gray 700 */
}
```

### 4.2 尺寸规范

```typescript
// src/renderer/lib/constants.ts

export const Sizes = {
  // 侧边栏
  SIDEBAR_WIDTH: 90,
  SIDEBAR_ICON_SIZE: 46,
  
  // 头部
  HEADER_HEIGHT: 56,
  
  // 消息气泡
  BUBBLE_RADIUS: 16,
  BUBBLE_PADDING: 12,
  AVATAR_SIZE: 36,
  
  // 按钮
  BUTTON_RADIUS: 8,
  SEND_BUTTON_SIZE: 40,
  
  // 卡片
  CARD_RADIUS: 12,
  CARD_PADDING: 16,
} as const;
```

### 4.3 shadcn/ui 配置

```typescript
// components.json

{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "default",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.js",
    "css": "src/renderer/styles/globals.css",
    "baseColor": "slate",
    "cssVariables": true
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils"
  }
}
```

---

## 五、通信协议

### 5.1 WebSocket 消息类型

#### 客户端 → Gateway

```typescript
// 发送聊天消息
{
  type: 'chat.message',
  sessionKey: 'agent:main:main',
  text: '帮我写一个 React 组件'
}

// 创建会话
{
  type: 'sessions.create',
  label: '新会话',
  model: 'claude-opus-4-6'
}

// 删除会话
{
  type: 'sessions.delete',
  sessionKey: 'xxx'
}

// 创建定时任务
{
  type: 'cron.create',
  schedule: '0 9 * * *',
  prompt: '发送晨报'
}
```

#### Gateway → 客户端

```typescript
// AI 回复（流式）
{
  type: 'chat.reply',
  sessionKey: 'agent:main:main',
  text: '好的，我来帮你写...',
  streaming: true
}

// 工具调用
{
  type: 'tool.call',
  toolName: 'write',
  args: { path: '/tmp/test.ts' }
}

// 会话列表更新
{
  type: 'sessions.list',
  sessions: [...]
}

// 错误
{
  type: 'error',
  message: '会话不存在'
}
```

### 5.2 IPC 通信（主进程 ↔ 渲染进程）

```typescript
// src/main/ipc/channels.ts

export const IPC_CHANNELS = {
  // Gateway 相关
  GATEWAY_START: 'gateway:start',
  GATEWAY_STOP: 'gateway:stop',
  GATEWAY_STATUS: 'gateway:status',
  GATEWAY_LOG: 'gateway:log',
  
  // 配置相关
  CONFIG_GET: 'config:get',
  CONFIG_SET: 'config:set',
  
  // 系统相关
  SYSTEM_INFO: 'system:info',
  APP_QUIT: 'app:quit',
} as const;
```

---

## 六、开发计划

### 6.1 Phase 1: 核心模块（第 1-4 天）

| 天数 | 任务 | 交付物 |
|------|------|--------|
| Day 1 | 项目初始化 + 基础架构 | Vite + Electron 配置完成 |
| Day 2 | 主进程 Gateway 管理 | Gateway 可启动/停止 |
| Day 3 | 对话界面 UI | ChatView + MessageBubble |
| Day 4 | 会话管理 + WebSocket 连接 | 完整的聊天功能 |

### 6.2 Phase 2: 管理模块（第 5-7 天）

| 天数 | 任务 | 交付物 |
|------|------|--------|
| Day 5 | 代理管理 + 节点管理 | AgentsView + NodesView |
| Day 6 | 技能管理 | SkillsView |
| Day 7 | 整合测试 | Phase 2 功能完整 |

### 6.3 Phase 3: 高级模块（第 8-10 天）

| 天数 | 任务 | 交付物 |
|------|------|--------|
| Day 8 | 定时任务 + 配置中心 | CronView + ConfigView |
| Day 9 | 日志查看 + 系统设置 | LogsView + SettingsView |
| Day 10 | 打包测试 + 文档 | 可发布的应用 |

---

## 七、风险与缓解

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| Gateway 启动失败 | 高 | 添加重试机制 + 降级到外部 Gateway |
| WebSocket 连接不稳定 | 中 | 心跳检测 + 自动重连 |
| 打包体积过大 | 中 | 代码分割 + Tree Shaking |
| 性能问题（长会话） | 中 | 虚拟滚动 + 懒加载 |
| 跨平台兼容性 | 低 | 使用 Electron 最佳实践 |

---

## 八、验收标准

### Phase 1 验收标准

- [ ] Electron 应用可正常启动
- [ ] Gateway 可自动启动并连接
- [ ] 可发送消息并收到 AI 回复
- [ ] 消息支持 Markdown 渲染
- [ ] 代码高亮正常显示
- [ ] 会话列表可正常加载
- [ ] 可创建/删除/重命名会话

### Phase 2 验收标准

- [ ] 代理列表可正常显示
- [ ] 可启动/停止子代理
- [ ] 节点列表可正常显示
- [ ] 技能列表可正常显示
- [ ] 可安装/卸载技能

### Phase 3 验收标准

- [ ] 定时任务 CRUD 功能完整
- [ ] 配置中心可正常修改配置
- [ ] 日志查看可实时刷新
- [ ] 系统设置可正常保存
- [ ] macOS/Windows 打包成功
- [ ] 应用启动时间 < 3s
- [ ] 内存占用 < 200MB

---

## 九、后续优化

1. **性能优化**
   - 虚拟滚动（长会话历史）
   - 懒加载组件
   - WebWorker 处理大文件

2. **功能增强**
   - 快捷键支持
   - 拖拽上传文件
   - 消息搜索
   - 主题切换
   - 多语言支持

3. **打包优化**
   - 代码签名
   - 自动更新
   - 崩溃报告

---

**文档版本**: 1.0
**最后更新**: 2026-03-11
**作者**: OpenClaw AI Assistant
