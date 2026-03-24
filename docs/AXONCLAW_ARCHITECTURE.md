# AxonClaw 技术架构设计文档

> **项目名称**: AxonClaw  
> **文档版本**: v1.0  
> **创建时间**: 2026-03-12  
> **基于架构**: ClawX v1.2 + OpenClaw 2026.2.25

---

## 📋 目录

- [一、架构总览](#一架构总览)
- [二、系统架构](#二系统架构)
- [三、技术栈详解](#三技术栈详解)
- [四、核心模块设计](#四核心模块设计)
- [五、数据流设计](#五数据流设计)
- [六、安全架构](#六安全架构)
- [七、性能优化](#七性能优化)
- [八、部署架构](#八部署架构)

---

## 一、架构总览

### 1.1 架构愿景

AxonClaw 采用**分层架构 + 模块化设计**,在继承 ClawX 优秀架构的基础上，进行全面增强和扩展。

**核心设计原则**:
- ✅ **高内聚低耦合**: 模块职责清晰，接口定义明确
- ✅ **可扩展性**: 插件化架构，易于添加新功能
- ✅ **高性能**: 异步处理，消息驱动，资源优化
- ✅ **高可用**: 故障恢复，容错机制，健康检查
- ✅ **安全性**: 多层防护，权限控制，数据加密

### 1.2 架构分层

```
┌─────────────────────────────────────────────────────────────┐
│                    AxonClaw 架构分层                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │  表现层 (Presentation Layer)                          │ │
│  │  - Electron 渲染进程                                   │ │
│  │  - React 19 UI 组件                                     │ │
│  │  - shadcn/ui 组件库                                     │ │
│  └───────────────────────────────────────────────────────┘ │
│                          │                                  │
│                          │ IPC / WebSocket                  │
│                          ▼                                  │
│  ┌───────────────────────────────────────────────────────┐ │
│  │  应用层 (Application Layer)                           │ │
│  │  - Electron 主进程                                     │ │
│  │  - AxonClaw Gateway                                   │ │
│  │  - 业务逻辑处理                                        │ │
│  └───────────────────────────────────────────────────────┘ │
│                          │                                  │
│                          │ 函数调用 / 事件                   │
│                          ▼                                  │
│  ┌───────────────────────────────────────────────────────┐ │
│  │  领域层 (Domain Layer)                                │ │
│  │  - Agent 编排引擎                                      │ │
│  │  - Channel 管理器                                      │ │
│  │  - 内容工厂                                            │ │
│  │  - 插件运行时                                          │ │
│  └───────────────────────────────────────────────────────┘ │
│                          │                                  │
│                          │ API 调用                          │
│                          ▼                                  │
│  ┌───────────────────────────────────────────────────────┐ │
│  │  基础设施层 (Infrastructure Layer)                    │ │
│  │  - pi-coding-agent 引擎                                │ │
│  │  - LLM Provider 接口                                   │ │
│  │  - 数据库 (SQLite)                                     │ │
│  │  - 文件系统                                            │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 二、系统架构

### 2.1 整体系统架构

```
┌─────────────────────────────────────────────────────────────────┐
│                      AxonClaw 系统架构                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │               用户接入层 (User Access Layer)              │ │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐        │ │
│  │  │ 桌面客户端│ │  微信   │ │  飞书   │ │  其他   │        │ │
│  │  │         │ │  /QQ    │ │         │ │ Channel │        │ │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘        │ │
│  └───────────────────────────────────────────────────────────┘ │
│                              │                                  │
│                              │ 消息输入                         │
│                              ▼                                  │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │               应用服务层 (Application Layer)              │ │
│  │  ┌─────────────────────────────────────────────────────┐ │ │
│  │  │          AxonClaw Gateway (控制中枢)                │ │ │
│  │  │  ┌─────────────────────────────────────────────────┐│ │ │
│  │  │  │  - WebSocket 服务器 (ws://127.0.0.1:18789)      ││ │ │
│  │  │  │  - 消息路由 (Message Router)                    ││ │ │
│  │  │  │  - 会话管理 (Session Manager)                   ││ │ │
│  │  │  │  - 配置管理 (Config Manager)                    ││ │ │
│  │  │  │  - 权限控制 (Security & Auth)                   ││ │ │
│  │  │  │  - Cron 调度器                                    ││ │ │
│  │  │  └─────────────────────────────────────────────────┘│ │ │
│  │  └─────────────────────────────────────────────────────┘ │ │
│  │                                                           │ │
│  │  ┌─────────────────────────────────────────────────────┐ │ │
│  │  │           业务模块 (Business Modules)               │ │ │
│  │  │  ┌───────────┐ ┌───────────┐ ┌───────────┐        │ │ │
│  │  │  │  Agent    │ │ Channel   │ │  Content  │        │ │ │
│  │  │  │  Orchestrator│ Manager   │ │  Factory  │        │ │ │
│  │  │  └───────────┘ └───────────┘ └───────────┘        │ │ │
│  │  │  ┌───────────┐ ┌───────────┐ ┌───────────┐        │ │ │
│  │  │  │  Plugin   │ │ Workflow  │ │  Memory   │        │ │ │
│  │  │  │  Runtime  │ │ Templates │ │  Manager  │        │ │ │
│  │  │  └───────────┘ └───────────┘ └───────────┘        │ │ │
│  │  └─────────────────────────────────────────────────────┘ │ │
│  └───────────────────────────────────────────────────────────┘ │
│                              │                                  │
│                              │ 工具调用 / LLM 请求               │
│                              ▼                                  │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │               执行引擎层 (Execution Layer)                │ │
│  │  ┌─────────────────────────────────────────────────────┐ │ │
│  │  │         pi-coding-agent 引擎 (增强版)               │ │ │
│  │  │  - Agent Loop                                       │ │ │
│  │  │  - 工具执行 (Tools)                                 │ │ │
│  │  │  - 记忆管理 (Memory)                                │ │ │
│  │  │  - 思维链推理 (Chain of Thought)                    │ │ │
│  │  │  - 多 Agent 协作                                     │ │ │
│  │  └─────────────────────────────────────────────────────┘ │ │
│  └───────────────────────────────────────────────────────────┘ │
│                              │                                  │
│                              │ API 调用                          │
│                              ▼                                  │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │               外部服务层 (External Services)              │ │
│  │  ┌───────────┐ ┌───────────┐ ┌───────────┐              │ │
│  │  │  LLM      │ │  第三方   │ │  社交     │              │ │
│  │  │ Providers │ │  APIs     │ │  平台     │              │ │
│  │  │ Claude/   │ │ 支付/    │ │  微信/    │              │ │
│  │  │ GPT/豆包  │ │ 地图等   │ │  飞书等   │              │ │
│  │  └───────────┘ └───────────┘ └───────────┘              │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 进程架构

```
┌─────────────────────────────────────────────────────────────┐
│              AxonClaw 多进程架构                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │  Electron 主进程 (Main Process)                       │ │
│  │  - 应用生命周期管理                                    │ │
│  │  - 原生菜单/窗口                                       │ │
│  │  - 系统托盘                                            │ │
│  │  - 自动更新                                            │ │
│  └─────────────────────┬─────────────────────────────────┘ │
│                        │                                   │
│          ┌─────────────┼─────────────┐                     │
│          │             │             │                     │
│          ▼             ▼             ▼                     │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐          │
│  │ 渲染进程 1  │ │ 渲染进程 2  │ │ 渲染进程 N  │          │
│  │ (主窗口)    │ │ (设置窗口)  │ │ (其他窗口)  │          │
│  │ React 19 UI │ │ React 19 UI │ │ React 19 UI │          │
│  └─────────────┘ └─────────────┘ └─────────────┘          │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │  Gateway 进程 (独立 Node.js 进程)                       │ │
│  │  - WebSocket 服务器                                    │ │
│  │  - Agent 编排引擎                                      │ │
│  │  - Channel 管理器                                      │ │
│  │  - 插件运行时                                          │ │
│  │  - Cron 调度器                                         │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │  辅助进程 (可选)                                       │ │
│  │  - 内容生成进程 (CPU/GPU 密集型)                         │ │
│  │  - 插件沙盒进程 (隔离运行)                             │ │
│  │  - 备份进程 (定时任务)                                 │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**进程间通信**:
- **渲染进程 ↔ 主进程**: Electron IPC
- **主进程 ↔ Gateway**: WebSocket (ws://127.0.0.1:18789)
- **Gateway ↔ 外部服务**: HTTP/HTTPS, WebSocket
- **进程间消息**: JSON-RPC 2.0 协议

---

## 三、技术栈详解

### 3.1 完整技术栈

```typescript
interface TechStack {
  // 前端技术栈
  frontend: {
    framework: "React 19";
    language: "TypeScript 5.x";
    bundler: "Vite 5.x";
    uiLibrary: "shadcn/ui (基于 Radix UI)";
    cssFramework: "Tailwind CSS 3.x";
    stateManagement: "Zustand";
    routing: "React Router 6.x";
    httpClient: "Axios";
    websocket: "ws";
  };

  // 后端技术栈
  backend: {
    runtime: "Node.js 22.14.0+";
    framework: "Express.js / Koa";
    websocket: "ws";
    database: "SQLite (better-sqlite3)";
    orm: "Prisma (可选)";
    processManager: "node:child_process";
  };

  // Electron
  electron: {
    version: "Latest";
    mainProcess: "Node.js";
    ipc: "Electron IPC";
    nativeModules: "better-sqlite3, node-ffi (可选)";
  };

  // AI 引擎
  aiEngine: {
    core: "pi-coding-agent (增强版)";
    llmProviders: [
      "Anthropic (Claude)",
      "OpenAI (GPT)",
      "Google (Gemini)",
      "字节豆包",
      "月之暗面 (Kimi)",
      "MiniMax",
      "智谱 AI (GLM)"
    ];
  };

  // 内容生成
  contentGeneration: {
    imageModels: [
      "Stable Diffusion API",
      "Midjourney API",
      "DALL-E 3 API",
      "Flux API"
    ];
    videoTools: [
      "FFmpeg",
      "自定义视频处理库"
    ];
  };

  // 开发与运维
  devOps: {
    packageManager: "pnpm / npm";
    versionControl: "Git";
    ciCd: "GitHub Actions";
    testing: [
      "Jest (单元测试)",
      "Playwright (E2E 测试)",
      "React Testing Library"
    ];
    linting: [
      "ESLint",
      "Prettier",
      "TypeScript ESLint"
    ];
  };
}
```

### 3.2 核心技术选型理由

#### React 19
```
优势:
  ✅ 并发特性提升性能
  ✅ 组件化开发
  ✅ 虚拟 DOM 高效渲染
  ✅ 丰富的生态系统
  ✅ Server Components 支持 (可选)

适用场景:
  - 复杂 UI 交互
  - 实时数据更新
  - 组件复用
```

#### shadcn/ui
```
优势:
  ✅ 代码完全可控 (非黑盒依赖)
  ✅ 基于 Radix UI (无障碍访问)
  ✅ Tailwind CSS 驱动 (易于定制)
  ✅ 现代化设计
  ✅ TypeScript 支持完善

为什么不是其他组件库:
  - Ant Design: 过于重量级，样式不够现代化
  - Material-UI: 设计风格不符，包体积大
  - Chakra UI: 性能不如 shadcn/ui + Tailwind
```

#### Zustand
```
优势:
  ✅ 轻量级 (仅 1KB)
  ✅ 简单易用的 API
  ✅ 无样板代码
  ✅ 支持 TypeScript
  ✅ 性能优异

对比 Redux:
  - 更少的样板代码
  - 更简单的 API
  - 更好的性能
```

#### Electron
```
优势:
  ✅ 跨平台 (macOS/Windows/Linux)
  ✅ 成熟的生态系统
  ✅ 支持原生功能集成
  ✅ 开发效率高

对比其他方案:
  - Tauri: 更小的包体积，但生态不如 Electron
  - Flutter Desktop: 学习曲线陡峭
  - NW.js: 社区活跃度不如 Electron
```

---

## 四、核心模块设计

### 4.1 AxonClaw Gateway (增强版)

```typescript
// Gateway 核心接口
interface AxonClawGateway {
  // 1. WebSocket 服务器
  websocketServer: {
    port: number;          // 默认 18789
    bind: string;          // 默认 127.0.0.1
    auth: {
      mode: 'token';
      token: string;
    };
    connections: Map<string, WebSocket>;
  };

  // 2. 消息路由
  messageRouter: {
    route: (message: Message) => Promise<void>;
    subscribe: (topic: string, handler: Handler) => void;
    unsubscribe: (topic: string, handler: Handler) => void;
    broadcast: (message: Message) => void;
  };

  // 3. 会话管理
  sessionManager: {
    create: (config: SessionConfig) => Promise<Session>;
    get: (sessionKey: string) => Promise<Session>;
    list: () => Promise<Session[]>;
    delete: (sessionKey: string) => Promise<void>;
    update: (sessionKey: string, updates: Partial<Session>) => Promise<void>;
  };

  // 4. Agent 编排
  agentOrchestrator: {
    createAgent: (config: AgentConfig) => Promise<Agent>;
    getAgent: (agentId: string) => Promise<Agent>;
    listAgents: () => Promise<Agent[]>;
    assignTask: (agentId: string, task: Task) => Promise<void>;
    coordinateAgents: (agentIds: string[], task: ComplexTask) => Promise<Result>;
  };

  // 5. Channel 管理
  channelManager: {
    registerChannel: (channel: Channel) => Promise<void>;
    getChannel: (channelId: string) => Promise<Channel>;
    listChannels: () => Promise<Channel[]>;
    startChannel: (channelId: string) => Promise<void>;
    stopChannel: (channelId: string) => Promise<void>;
    getChannelStatus: (channelId: string) => Promise<ChannelStatus>;
  };

  // 6. 配置管理
  configManager: {
    load: () => Promise<Config>;
    save: (config: Config) => Promise<void>;
    validate: (config: Config) => Promise<ValidationResult>;
    watch: (callback: ConfigChangeCallback) => void;
  };

  // 7. Cron 调度
  cronScheduler: {
    create: (config: CronConfig) => Promise<CronJob>;
    list: () => Promise<CronJob[]>;
    enable: (jobId: string) => Promise<void>;
    disable: (jobId: string) => Promise<void>;
    runNow: (jobId: string) => Promise<void>;
    getHistory: (jobId: string) => Promise<CronHistory[]>;
  };

  // 8. 插件运行时
  pluginRuntime: {
    loadPlugin: (pluginPath: string) => Promise<Plugin>;
    unloadPlugin: (pluginId: string) => Promise<void>;
    listPlugins: () => Promise<Plugin[]>;
    executePlugin: (pluginId: string, input: any) => Promise<any>;
  };
}
```

### 4.2 多 Agent 协作系统

```typescript
// Agent 接口定义
interface Agent {
  id: string;
  role: string;              // 角色名称
  specialty: string;         // 专业领域
  soul: string;              // SOUL.md 内容
  user: string;              // USER.md 内容
  memory: Memory;            // 记忆系统
  tools: Tool[];             // 可用工具
  status: AgentStatus;       // 状态
  metrics: AgentMetrics;     // 性能指标
}

// Agent 状态
enum AgentStatus {
  IDLE = 'idle',
  BUSY = 'busy',
  ERROR = 'error',
  OFFLINE = 'offline'
}

// 任务定义
interface Task {
  id: string;
  type: 'simple' | 'complex';
  description: string;
  priority: number;
  assignedTo?: string;       // Agent ID
  status: TaskStatus;
  createdAt: Date;
  completedAt?: Date;
}

// 复杂任务分解
interface ComplexTask {
  id: string;
  description: string;
  subTasks: SubTask[];
  dependencies: Dependency[];
  assignedAgents: string[];
  status: TaskStatus;
}

interface SubTask {
  id: string;
  description: string;
  assignedTo: string;        // Agent ID
  status: TaskStatus;
  result?: any;
}

interface Dependency {
  from: string;              // SubTask ID
  to: string;                // SubTask ID
}

// 任务路由
interface TaskRouter {
  // 任务分配策略
  strategies: {
    ROUND_ROBIN: 'round-robin';
    LEAST_LOADED: 'least-loaded';
    SPECIALTY_BASED: 'specialty-based';
    PRIORITY_BASED: 'priority-based';
  };

  // 分配任务
  assign: (task: Task, agents: Agent[]) => Agent;

  // 负载均衡
  balance: () => void;

  // 任务队列
  queue: {
    enqueue: (task: Task) => void;
    dequeue: () => Task;
    peek: () => Task;
    size: () => number;
  };
}

// 消息总线
interface MessageBus {
  // 发布消息
  publish: (topic: string, message: Message) => void;

  // 订阅消息
  subscribe: (topic: string, callback: MessageCallback) => void;

  // 取消订阅
  unsubscribe: (topic: string, callback: MessageCallback) => void;

  // 广播消息
  broadcast: (message: Message) => void;

  // 请求 - 响应模式
  request: (topic: string, message: Message) => Promise<Response>;
}

// 协作引擎
interface CollaborationEngine {
  // 任务分解
  decompose: (task: ComplexTask) => SubTask[];

  // 协调执行
  coordinate: (subTasks: SubTask[]) => Promise<Result>;

  // 结果合并
  merge: (results: Result[]) => FinalResult;

  // 冲突解决
  resolveConflict: (conflict: Conflict) => Promise<Solution>;
}
```

### 4.3 Channel 管理系统

```typescript
// Channel 接口
interface Channel {
  id: string;
  type: ChannelType;
  config: ChannelConfig;
  status: ChannelStatus;
  adapter: ChannelAdapter;
}

// Channel 类型
enum ChannelType {
  WECHAT = 'wechat',
  QQ = 'qq',
  FEISHU = 'feishu',
  DINGTALK = 'dingtalk',
  WECHAT_WORK = 'wechat-work',
  WHATSAPP = 'whatsapp',
  TELEGRAM = 'telegram',
  DISCORD = 'discord',
  SLACK = 'slack',
  IMESSAGE = 'imessage'
}

// Channel 适配器
interface ChannelAdapter {
  // 连接
  connect: () => Promise<void>;

  // 断开
  disconnect: () => Promise<void>;

  // 发送消息
  send: (message: Message) => Promise<void>;

  // 接收消息
  receive: (callback: MessageCallback) => void;

  // 健康检查
  healthCheck: () => Promise<HealthStatus>;
}

// Channel 管理器
interface ChannelManager {
  // 注册 Channel
  register: (channel: Channel) => Promise<void>;

  // 启动 Channel
  start: (channelId: string) => Promise<void>;

  // 停止 Channel
  stop: (channelId: string) => Promise<void>;

  // 获取状态
  getStatus: (channelId: string) => Promise<ChannelStatus>;

  // 列出所有 Channel
  list: () => Promise<Channel[]>;

  // DM 配对管理
  dmPairing: {
    listPending: () => Promise<PairingRequest[]>;
    approve: (code: string) => Promise<void>;
    reject: (code: string) => Promise<void>;
    listApproved: () => Promise<ApprovedDM[]>;
    revoke: (userId: string) => Promise<void>;
  };

  // 白名单管理
  allowlist: {
    add: (userId: string) => Promise<void>;
    remove: (userId: string) => Promise<void>;
    list: () => Promise<string[]>;
  };
}
```

### 4.4 内容工厂

```typescript
// 内容工厂接口
interface ContentFactory {
  // 1. 文章生成
  articleGenerator: {
    generate: (params: ArticleParams) => Promise<Article>;
    optimize: (article: Article, options: OptimizeOptions) => Promise<Article>;
    publish: (article: Article, platforms: string[]) => Promise<void>;
  };

  // 2. 视频生成
  videoGenerator: {
    generate: (params: VideoParams) => Promise<Video>;
    edit: (video: Video, edits: EditOptions) => Promise<Video>;
    export: (video: Video, format: VideoFormat) => Promise<void>;
  };

  // 3. 图片生成
  imageGenerator: {
    generate: (params: ImageParams) => Promise<Image>;
    edit: (image: Image, edits: EditOptions) => Promise<Image>;
    batchGenerate: (params: ImageParams[]) => Promise<Image[]>;
  };

  // 4. 内容优化
  contentOptimizer: {
    optimizeTitle: (title: string) => Promise<TitleVariant[]>;
    generateHashtags: (content: string, platform: string) => Promise<string[]>;
    predictCTR: (content: Content) => Promise<number>;
    trackPerformance: (contentId: string) => Promise<PerformanceMetrics>;
  };
}

// 文章生成参数
interface ArticleParams {
  topic: string;
  style: ArticleStyle;
  length: number;           // 字数
  includeImages: number;    // 配图数量
  seoKeywords: string[];
  targetPlatform: string;
}

// 视频生成参数
interface VideoParams {
  script: string;
  duration: number;         // 秒
  aspectRatio: string;      // 9:16, 16:9, 1:1
  includeVoiceover: boolean;
  includeSubtitles: boolean;
  style: VideoStyle;
}

// 图片生成参数
interface ImageParams {
  prompt: string;
  model: 'sd' | 'mj' | 'dall-e-3' | 'flux';
  size: string;             // 1024x1024, etc.
  style: ImageStyle;
  negativePrompt?: string;
}
```

### 4.5 插件运行时

```typescript
// 插件接口
interface Plugin {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  capabilities: PluginCapability[];
  config: PluginConfig;
  status: PluginStatus;
}

// 插件能力
interface PluginCapability {
  type: 'trigger' | 'action' | 'condition';
  name: string;
  description: string;
  inputs: PluginInput[];
  outputs: PluginOutput[];
}

// 插件运行时
interface PluginRuntime {
  // 加载插件
  load: (pluginPath: string) => Promise<Plugin>;

  // 卸载插件
  unload: (pluginId: string) => Promise<void>;

  // 执行插件
  execute: (pluginId: string, input: any) => Promise<any>;

  // 插件通信
  messaging: {
    send: (pluginId: string, message: Message) => Promise<void>;
    receive: (pluginId: string, callback: MessageCallback) => void;
  };

  // 插件存储
  storage: {
    get: (pluginId: string, key: string) => Promise<any>;
    set: (pluginId: string, key: string, value: any) => Promise<void>;
    delete: (pluginId: string, key: string) => Promise<void>;
  };

  // 沙盒隔离
  sandbox: {
    enable: boolean;
    resourceLimits: {
      maxMemory: number;    // MB
      maxCPU: number;       // %
      maxDisk: number;      // MB
    };
  };
}
```

---

## 五、数据流设计

### 5.1 消息处理流程

```
用户发送消息 (通过任何 Channel)
        │
        ▼
┌─────────────────────────────────┐
│ 1. Channel Adapter 接收消息      │
│    - 转换为统一格式              │
│    - 验证权限 (DM 配对/白名单)    │
└──────────────┬──────────────────┘
               │
               ▼
┌─────────────────────────────────┐
│ 2. Gateway 接收消息              │
│    - WebSocket 接收               │
│    - 验证 Token                  │
│    - 解析 JSON-RPC 2.0            │
└──────────────┬──────────────────┘
               │
               ▼
┌─────────────────────────────────┐
│ 3. 消息路由                      │
│    - 查找目标 Agent              │
│    - 任务分配 (多 Agent 场景)      │
│    - 加入任务队列                │
└──────────────┬──────────────────┘
               │
               ▼
┌─────────────────────────────────┐
│ 4. Agent 处理                    │
│    - 加载记忆 (SOUL/USER/MEMORY) │
│    - 调用 LLM                    │
│    - 执行工具                    │
│    - 生成回复                    │
└──────────────┬──────────────────┘
               │
               ▼
┌─────────────────────────────────┐
│ 5. 返回结果                      │
│    - 流式传输 (可选)             │
│    - 更新记忆                    │
│    - 记录日志                    │
└──────────────┬──────────────────┘
               │
               ▼
┌─────────────────────────────────┐
│ 6. Channel 发送回复              │
│    - 转换为平台格式              │
│    - 发送给用户                  │
└─────────────────────────────────┘
```

### 5.2 数据模型

```typescript
// 核心数据模型

// 消息
interface Message {
  id: string;
  type: MessageType;
  sessionKey: string;
  from: string;
  to: string;
  content: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

// 会话
interface Session {
  key: string;
  label: string;
  agentId: string;
  channelId: string;
  model: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, any>;
}

// 记忆条目
interface MemoryEntry {
  id: string;
  type: 'short' | 'long';
  content: string;
  importance: number;
  createdAt: Date;
  lastAccessedAt: Date;
  tags: string[];
}

// 工具
interface Tool {
  name: string;
  description: string;
  parameters: ToolParameters;
  execute: (args: any) => Promise<any>;
}

// 配置
interface Config {
  gateway: GatewayConfig;
  providers: ProviderConfig[];
  agents: AgentConfig[];
  channels: ChannelConfig[];
  skills: SkillConfig[];
  sandbox: SandboxConfig;
}
```

---

## 六、安全架构

### 6.1 多层安全防护

```
┌─────────────────────────────────────────────────────────────┐
│              AxonClaw 安全架构                               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  第 1 层：网络安全                                            │
│  ├─ 本地回环绑定 (127.0.0.1)                                │
│  ├─ Token 认证                                               │
│  ├─ WebSocket 加密 (WSS)                                     │
│  └─ 防火墙规则                                               │
│                                                             │
│  第 2 层：应用安全                                            │
│  ├─ 用户认证 (OAuth2 / SSO)                                 │
│  ├─ 权限控制 (RBAC)                                         │
│  ├─ 会话管理                                                │
│  └─ 输入验证                                                │
│                                                             │
│  第 3 层：数据安全                                            │
│  ├─ 数据加密 (AES-256)                                      │
│  ├─ API Key 安全存储                                         │
│  ├─ 敏感信息脱敏                                            │
│  └─ 数据备份                                                │
│                                                             │
│  第 4 层：运行安全                                            │
│  ├─ 沙盒隔离                                                │
│  ├─ 资源限制                                                │
│  ├─ 命令白名单                                              │
│  └─ 审计日志                                                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 6.2 认证与授权

```typescript
// 认证配置
interface AuthConfig {
  // 1. Token 认证
  token: {
    mode: 'token';
    token: string;         // 随机生成
    rotation: number;      // 自动轮换周期 (毫秒)
  };

  // 2. OAuth2 (企业版)
  oauth2: {
    provider: 'okta' | 'azure-ad' | 'keycloak';
    clientId: string;
    clientSecret: string;
    redirectUri: string;
  };

  // 3. SSO (企业版)
  sso: {
    provider: 'saml' | 'oidc';
    metadataUrl: string;
  };
}

// 权限控制 (RBAC)
interface RBACConfig {
  roles: {
    admin: {
      permissions: ['*'];
    };
    editor: {
      permissions: [
        'agent.create',
        'agent.edit',
        'content.publish',
        // ...
      ];
    };
    viewer: {
      permissions: [
        'agent.view',
        'content.view',
        // ...
      ];
    };
  };

  users: {
    [userId: string]: {
      role: string;
      customPermissions?: string[];
    };
  };
}
```

### 6.3 数据加密

```typescript
// 加密配置
interface EncryptionConfig {
  // 1. 数据传输加密
  transport: {
    protocol: 'https' | 'wss';
    tlsVersion: '1.3';
    cipherSuites: string[];
  };

  // 2. 数据存储加密
  storage: {
    algorithm: 'AES-256-GCM';
    keyDerivation: 'PBKDF2';
    iterations: 100000;
    saltLength: 32;
  };

  // 3. API Key 加密存储
  apiKeyStorage: {
    encryption: 'AES-256-GCM';
    keychain: true;        // 使用系统密钥链
  };
}
```

---

## 七、性能优化

### 7.1 性能优化策略

```typescript
interface PerformanceOptimization {
  // 1. 前端优化
  frontend: {
    codeSplitting: true;           // 代码分割
    lazyLoading: true;             // 懒加载
    treeShaking: true;             // 摇树优化
    imageOptimization: true;       // 图片优化
    caching: {
      httpCaching: true;
      serviceWorker: true;
      indexedDB: true;
    };
  };

  // 2. 后端优化
  backend: {
    clustering: true;              // Node.js 集群
    caching: {
      redis: true;                 // Redis 缓存
      memoryCache: true;           // 内存缓存
    };
    database: {
      indexing: true;              // 数据库索引
      connectionPooling: true;     // 连接池
      queryOptimization: true;     // 查询优化
    };
    asyncProcessing: {
      messageQueue: true;          // 消息队列
      backgroundJobs: true;        // 后台任务
    };
  };

  // 3. AI 优化
  ai: {
    contextCompression: true;      // 上下文压缩
    streamingResponse: true;       // 流式响应
    batchProcessing: true;         // 批量处理
    modelCaching: true;            // 模型缓存
  };
}
```

### 7.2 性能指标目标

```
┌─────────────────────────────────────────────────────────────┐
│              AxonClaw 性能指标目标                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  前端性能:                                                  │
│  ├─ 首屏加载时间 (FCP): < 1.5 秒                             │
│  ├─ 可交互时间 (TTI): < 3 秒                                 │
│  ├─ 页面加载时间：< 3 秒                                     │
│  └─ 60 FPS 渲染                                              │
│                                                             │
│  后端性能:                                                  │
│  ├─ API 响应时间 (P50): < 100 毫秒                           │
│  ├─ API 响应时间 (P95): < 500 毫秒                           │
│  ├─ API 响应时间 (P99): < 1 秒                               │
│  └─ 吞吐量：1000+ 请求/秒                                    │
│                                                             │
│  AI 性能:                                                   │
│  ├─ 首字延迟 (TTFB): < 1 秒                                  │
│  ├─ 平均响应时间：< 5 秒                                     │
│  └─ 并发处理：10+ 并发对话                                   │
│                                                             │
│  资源使用:                                                  │
│  ├─ 内存占用：< 500MB (空闲), < 2GB (负载)                  │
│  ├─ CPU 使用：< 10% (空闲), < 50% (负载)                     │
│  └─ 磁盘占用：< 2GB (安装), < 10GB (运行)                   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 八、部署架构

### 8.1 本地部署架构

```
┌─────────────────────────────────────────────────────────────┐
│              AxonClaw 本地部署架构                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  用户计算机 (macOS/Windows/Linux)                           │
│  ┌───────────────────────────────────────────────────────┐ │
│  │  AxonClaw 桌面应用                                     │ │
│  │  ┌─────────────────────────────────────────────────┐ │ │
│  │  │  Electron 应用                                   │ │ │
│  │  │  - 渲染进程 (React 19 UI)                        │ │ │
│  │  │  - 主进程 (应用管理)                             │ │ │
│  │  └─────────────────────────────────────────────────┘ │ │
│  │                                                       │ │
│  │  ┌─────────────────────────────────────────────────┐ │ │
│  │  │  AxonClaw Gateway (Node.js 进程)                 │ │ │
│  │  │  - WebSocket 服务器                              │ │ │
│  │  │  - Agent 引擎                                    │ │ │
│  │  │  - Channel 管理                                  │ │ │
│  │  └─────────────────────────────────────────────────┘ │ │
│  │                                                       │ │
│  │  ┌─────────────────────────────────────────────────┐ │ │
│  │  │  数据存储                                        │ │ │
│  │  │  - SQLite 数据库                                 │ │ │
│  │  │  - 文件系统                                      │ │ │
│  │  └─────────────────────────────────────────────────┘ │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 8.2 云端部署架构 (SaaS)

```
┌─────────────────────────────────────────────────────────────┐
│              AxonClaw 云端部署架构 (SaaS)                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  互联网                                                     │
│       │                                                     │
│       ▼                                                     │
│  ┌───────────────────────────────────────────────────────┐ │
│  │  负载均衡 (Load Balancer)                             │ │
│  │  - AWS ALB / Nginx                                    │ │
│  └───────────────────┬───────────────────────────────────┘ │
│                      │                                      │
│          ┌───────────┼───────────┐                         │
│          │           │           │                         │
│          ▼           ▼           ▼                         │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐          │
│  │ 实例 1       │ │ 实例 2       │ │ 实例 N       │          │
│  │ AxonClaw   │ │ AxonClaw   │ │ AxonClaw   │          │
│  │ Gateway    │ │ Gateway    │ │ Gateway    │          │
│  └──────┬──────┘ └──────┬──────┘ └──────┬──────┘          │
│         │               │               │                   │
│         └───────────────┼───────────────┘                   │
│                         │                                   │
│                         ▼                                   │
│  ┌───────────────────────────────────────────────────────┐ │
│  │  数据层                                                │ │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐     │ │
│  │  │  PostgreSQL │ │   Redis     │ │    S3       │     │ │
│  │  │  (主数据)   │ │  (缓存)     │ │  (文件存储) │     │ │
│  │  └─────────────┘ └─────────────┘ └─────────────┘     │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │  监控与运维                                            │ │
│  │  - CloudWatch / Prometheus                            │ │
│  │  - ELK Stack (日志)                                   │ │
│  │  - Auto Scaling (自动扩缩容)                          │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 8.3 混合部署架构

```
┌─────────────────────────────────────────────────────────────┐
│              AxonClaw 混合部署架构                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  本地环境 (用户计算机)                                       │
│  ┌───────────────────────────────────────────────────────┐ │
│  │  AxonClaw 桌面客户端                                   │ │
│  │  - 轻量级 UI                                           │ │
│  │  - 本地缓存                                            │ │
│  │  - 离线模式                                            │ │
│  └───────────────────┬───────────────────────────────────┘ │
│                      │                                      │
│                      │ HTTPS/WSS                            │
│                      │                                      │
│                      ▼                                      │
│  云端环境 (AWS/Azure/阿里云)                                │
│  ┌───────────────────────────────────────────────────────┐ │
│  │  AxonClaw Cloud Gateway                               │ │
│  │  - 7×24 小时运行                                        │ │
│  │  - Agent 执行引擎                                      │ │
│  │  - 数据存储                                            │ │
│  │  - 备份和同步                                          │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  优势:                                                      │
│  ✅ 本地客户端轻量快速                                      │
│  ✅ 云端 7×24 小时运行                                       │
│  ✅ 数据自动同步                                            │
│  ✅ 离线模式支持                                            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 九、总结

### 9.1 架构特点

**继承 ClawX**:
- ✅ Electron + React 19 双进程架构
- ✅ WebSocket 通信 (ws://127.0.0.1:18789)
- ✅ shadcn/ui + Tailwind CSS
- ✅ Zustand 状态管理
- ✅ SQLite 本地存储

**增强与扩展**:
- ✅ 多 Agent 协作系统
- ✅ Channel 管理系统
- ✅ 内容工厂
- ✅ 插件运行时
- ✅ 工作流引擎

### 9.2 技术优势

1. **高性能**: 异步处理，消息驱动，资源优化
2. **高可用**: 故障恢复，容错机制，健康检查
3. **可扩展**: 插件化架构，模块化设计
4. **安全**: 多层防护，权限控制，数据加密
5. **易用**: 傻瓜式操作，专家级能力

---

*文档版本：v1.0*  
*创建时间：2026-03-12*  
*作者：AxonClaw Team*  
*下次更新：架构重大变更时*
