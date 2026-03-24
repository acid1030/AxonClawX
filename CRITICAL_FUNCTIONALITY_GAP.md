# 🔴 功能缺失诊断报告

**诊断时间:** 2026-03-14 08:00 GMT+8  
**诊断人:** Axon  
**状态:** **严重 - 界面完整，功能空壳**

---

## 📊 现状分析

### ✅ 已完成 (界面层)

| 模块 | 完成度 | 说明 |
|------|--------|------|
| Dashboard UI | 100% | 仪表板界面完整 |
| 聊天界面 | 100% | 消息输入/显示完整 |
| Agent 管理 | 100% | 列表/表单完整 |
| 多 Agent 协作 | 100% | 工作流可视化完整 |
| 内容工厂 | 100% | 模板选择/表单/预览完整 |
| 路由系统 | 100% | 所有路由可访问 |

### ❌ 缺失 (功能层)

| 模块 | 完成度 | 缺失内容 | 优先级 |
|------|--------|----------|--------|
| **OpenClaw Gateway 连接** | 0% | HTTP API 调用、WebSocket 通信 | P0 |
| **真实 Agent 调用** | 0% | 无法调用 NEXUS/ARIA/KAEL 等 | P0 |
| **实时消息推送** | 0% | WebSocket 未集成 | P0 |
| **任务执行引擎** | 10% | 只有前端模拟，无实际执行 | P0 |
| **内容生成** | 10% | 只有模板，无 AI 生成 | P1 |
| **数据库持久化** | 0% | SQLite 未集成 | P1 |

---

## 🔍 根因分析

### 代码结构问题
```
renderer/services/
├── agent-orchestrator.ts    ✅ 存在，但纯前端模拟
├── content-factory.ts       ✅ 存在，但无 AI 集成
├── agentsService.ts         ✅ 存在，但内存存储
├── sessionsService.ts       ✅ 存在，但无 Gateway 连接
└── messagesService.ts       ✅ 存在，但无 WebSocket
```

### 缺失的核心连接
```
前端界面 → ❌ OpenClaw Gateway → ❌ 真实 Agent
         → ❌ WebSocket 服务    → ❌ 实时消息
         → ❌ SQLite 数据库    → ❌ 持久化
```

---

## ⚡ 紧急修复计划 (08:00-12:00)

### Phase 1: Gateway 连接层 (2 小时) 🔴

**目标:** 实现与 OpenClaw Gateway 的真实通信

**任务:**
1. 创建 `GatewayService` - HTTP API 封装
2. 创建 `WebSocketClient` - 实时消息推送
3. 集成到现有 Services 层
4. 验证连接

**代码位置:**
```typescript
// renderer/services/gateway.ts (新建)
export class GatewayService {
  private baseUrl = 'http://localhost:18791';
  private wsUrl = 'ws://localhost:18792';
  
  async listSessions() { ... }
  async executeTask(task: Task) { ... }
  async sendMessage(message: Message) { ... }
}

// renderer/services/websocket-client.ts (新建)
export class WebSocketClient {
  connect(): Promise<void> { ... }
  onMessage(callback: (msg: any) => void) { ... }
}
```

---

### Phase 2: Agent 调用集成 (1.5 小时) 🟡

**目标:** 真实调用 Agent 执行任务

**任务:**
1. 修改 `agent-orchestrator.ts` - 使用 GatewayService
2. 实现任务派发逻辑
3. 添加结果回调处理

**修改示例:**
```typescript
// Before (模拟)
const result = await this.simulateAgentExecution(agentId, task);

// After (真实)
const result = await GatewayService.executeTask({
  agentId,
  task,
  callback: (progress) => this.updateProgress(progress)
});
```

---

### Phase 3: 实时消息集成 (1 小时) 🟡

**目标:** WebSocket 实时接收 Agent 消息

**任务:**
1. 创建 `WebSocketClient` 单例
2. 集成到聊天界面
3. 实现消息推送 UI 更新

**代码位置:**
```typescript
// renderer/views/ChatView.tsx
useEffect(() => {
  const ws = WebSocketClient.getInstance();
  ws.onMessage((msg) => {
    setMessages(prev => [...prev, msg]);
  });
}, []);
```

---

### Phase 4: 验证测试 (0.5 小时) 🟢

**目标:** 端到端功能验证

**测试清单:**
- [ ] Dashboard 显示真实 Agent 状态
- [ ] 聊天界面接收真实消息
- [ ] Agent 管理界面显示真实数据
- [ ] 任务执行返回真实结果
- [ ] 内容工厂调用真实 AI

---

## 📋 详细实现方案

### 1. GatewayService 实现

```typescript
// renderer/services/gateway.ts
import { EventEmitter } from 'events';

export interface GatewayConfig {
  httpUrl: string;
  wsUrl: string;
  token?: string;
}

export class GatewayService extends EventEmitter {
  private static instance: GatewayService;
  private config: GatewayConfig;
  private ws: WebSocket | null = null;

  constructor(config: GatewayConfig) {
    super();
    this.config = config;
  }

  static getInstance(): GatewayService {
    if (!GatewayService.instance) {
      GatewayService.instance = new GatewayService({
        httpUrl: 'http://localhost:18791',
        wsUrl: 'ws://localhost:18792',
      });
    }
    return GatewayService.instance;
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.config.wsUrl);
      this.ws.onopen = () => {
        console.log('Gateway WebSocket connected');
        resolve();
      };
      this.ws.onerror = (error) => reject(error);
    });
  }

  async listSessions() {
    const response = await fetch(`${this.config.httpUrl}/sessions/list`);
    return response.json();
  }

  async executeTask(task: {
    agentId: string;
    action: string;
    params: any;
  }) {
    const response = await fetch(`${this.config.httpUrl}/tasks/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(task),
    });
    return response.json();
  }

  sendMessage(message: any) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }
}
```

### 2. 集成到现有服务

```typescript
// renderer/services/agentsService.ts (修改)
import { GatewayService } from './gateway';

const gateway = GatewayService.getInstance();

export const agentsService = {
  async getAgents() {
    // Before: return mockAgents;
    // After:
    const sessions = await gateway.listSessions();
    return sessions.map(s => ({
      id: s.id,
      name: s.name,
      role: s.role,
      status: s.status,
    }));
  },

  async executeAgentTask(agentId: string, task: any) {
    return await gateway.executeTask({ agentId, ...task });
  },
};
```

### 3. 聊天界面集成

```typescript
// renderer/views/ChatView.tsx (修改)
import { GatewayService } from '@/services/gateway';

export const ChatView: React.FC = () => {
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    const gateway = GatewayService.getInstance();
    
    // 连接 WebSocket
    gateway.connect().then(() => {
      // 监听消息
      gateway.on('message', (msg) => {
        setMessages(prev => [...prev, msg]);
      });
    });
  }, []);

  const handleSend = async (text: string) => {
    const gateway = GatewayService.getInstance();
    gateway.sendMessage({ type: 'chat', text });
  };

  // ... rest of component
};
```

---

## 🎯 验收标准

**12:00 前必须完成:**

| 功能 | 验收标准 | 状态 |
|------|----------|------|
| Gateway 连接 | 成功连接 http://localhost:18791 | ⚪ |
| WebSocket | 成功连接 ws://localhost:18792 | ⚪ |
| Agent 列表 | 显示真实 Agent 状态 | ⚪ |
| 任务执行 | 点击执行返回真实结果 | ⚪ |
| 消息推送 | 实时接收 Agent 消息 | ⚪ |

---

## ⚠️ 风险预警

### 高风险
- **Gateway 未启动** - 需要用户先启动 OpenClaw Gateway
- **端口冲突** - 18791/18792 可能被占用
- **CORS 问题** - 浏览器可能阻止跨域请求

### 缓解措施
1. 提供 Gateway 启动脚本
2. 添加端口检测
3. 配置 Vite 代理

---

## 📞 需要用户确认

1. **OpenClaw Gateway 是否已启动？**
   - 如未启动，执行 `openclaw gateway start`

2. **Gateway Token 是否已配置？**
   - 位置：`~/.openclaw/data/gateway-token.json`

3. **优先实现哪个功能？**
   - A. 聊天消息 (最直接)
   - B. Agent 任务执行 (核心)
   - C. Dashboard 数据 (展示)

---

**建议:** 立即启动 Gateway，然后按 A→B→C 顺序实现。

**Axon 签名:** _"空壳界面毫无价值。真实功能才是生产力。"_ 🜏
