# AxonClaw 分布式部署方案

> 版本：v1.0
> 创建时间：2026-03-12 23:30
> 负责人：AXON 🜏 + ATLAS (基础设施)

---

## 📊 现状分析

### OpenClaw 多节点能力

**官方状态**:
- ❌ 原生多节点部署：**讨论中** (2026.3 路线图)
- ✅ 单节点 Gateway: `ws://127.0.0.1:18789`
- ✅ Sub-agent 系统：单会话内多 Agent
- ✅ 消息路由：多渠道支持

**我们的机会**:
> **AxonClaw 可以实现 OpenClaw 还没有的分布式能力，建立技术壁垒！**

---

## 🎯 分布式架构设计

### 方案对比

| 方案 | 优点 | 缺点 | 复杂度 | 我们的选择 |
|------|------|------|--------|-----------|
| **集中式 Gateway** | 简单、易管理 | 单点故障 | ⭐ | ❌ |
| **多 Gateway 联邦** | 高可用、可扩展 | 需要同步 | ⭐⭐⭐ | ✅ 采用 |
| **P2P 网状** | 去中心化 | 复杂、难调试 | ⭐⭐⭐⭐⭐ | ⚪ 后续 |

### AxonClaw 分布式架构

```
┌─────────────────────────────────────────────────────────────┐
│                    AxonClaw 分布式网络                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│  │  Node-01    │    │  Node-02    │    │  Node-03    │     │
│  │  (Mac mini) │    │  (MacBook)  │    │  (VPS)      │     │
│  │  主节点     │    │  开发节点   │    │  云端节点   │     │
│  │             │    │             │    │             │     │
│  │  Gateway    │    │  Gateway    │    │  Gateway    │     │
│  │  :18789     │    │  :18789     │    │  :18789     │     │
│  │             │    │             │    │             │     │
│  │  Agents:    │    │  Agents:    │    │  Agents:    │     │
│  │  - NEXUS    │    │  - ZARA     │    │  - ATLAS    │     │
│  │  - AXON     │    │  - BLAZE    │    │  - CIPHER   │     │
│  │  - DANTE    │    │  - SPARK    │    │  - SAGE     │     │
│  └──────┬──────┘    └──────┬──────┘    └──────┬──────┘     │
│         │                  │                  │             │
│         └──────────────────┼──────────────────┘             │
│                            │                                │
│                   ┌────────▼────────┐                       │
│                   │  协调层          │                       │
│                   │  (Coordinator)   │                       │
│                   │                  │                       │
│                   │  - 任务分发      │                       │
│                   │  - 状态同步      │                       │
│                   │  - 结果聚合      │                       │
│                   └────────┬────────┘                       │
│                            │                                │
│                   ┌────────▼────────┐                       │
│                   │  共享存储        │                       │
│                   │  (SQLite+Sync)   │                       │
│                   │                  │                       │
│                   │  - 数据库同步    │                       │
│                   │  - 文件同步      │                       │
│                   │  - 记忆同步      │                       │
│                   └─────────────────┘                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 🖥️ 节点规划

### 节点 1: 主节点 (Mac mini)

**位置**: 用户家中
**角色**: 协调中心 + 核心 Agent

| 配置 | 详情 |
|------|------|
| **设备** | Mac mini (M1/M2) |
| **IP** | 192.168.1.x (内网) |
| **Gateway** | ws://192.168.1.x:18789 |
| **Agent** | AXON, NEXUS, DANTE, KAEL |
| **职责** | 任务协调、数据库主节点、用户交互 |

### 节点 2: 开发节点 (MacBook)

**位置**: 用户随身携带
**角色**: 前端开发 + 移动办公

| 配置 | 详情 |
|------|------|
| **设备** | MacBook Pro |
| **IP** | 动态 (内网/外网) |
| **Gateway** | ws://192.168.1.y:18789 |
| **Agent** | ZARA, BLAZE, SPARK, PIXEL |
| **职责** | UI 开发、即时响应、移动场景 |

### 节点 3: 云端节点 (VPS)

**位置**: 云服务器
**角色**: 24 小时运行 + 重任务

| 配置 | 详情 |
|------|------|
| **设备** | VPS (4C8G 或更高) |
| **IP** | 公网 IP |
| **Gateway** | ws://公网 IP:18789 |
| **Agent** | ATLAS, CIPHER, SAGE, ECHO |
| **职责** | 持续监控、安全审计、数据分析 |

### 节点 4-N: 扩展节点

**可选设备**:
- Raspberry Pi (低功耗监控)
- 旧电脑改造 (专用 Agent)
- 公司电脑 (办公场景)

---

## 🔧 技术实现

### 阶段 1: 多 Gateway 支持 (本周)

**目标**: 客户端可连接多个 Gateway

```typescript
// src/renderer/lib/gateway-client-multi.ts
export class MultiGatewayClient {
  private gateways: Map<string, WebSocket>;
  private primaryGateway: string;

  constructor(config: GatewayConfig[]) {
    this.gateways = new Map();
    config.forEach(gw => {
      this.connect(gw);
    });
    this.primaryGateway = config[0].id;
  }

  connect(config: GatewayConfig) {
    const ws = new WebSocket(config.url);
    ws.onopen = () => {
      console.log(`Connected to ${config.id}`);
      this.gateways.set(config.id, ws);
    };
    ws.onclose = () => {
      console.log(`Disconnected from ${config.id}`);
      this.gateways.delete(config.id);
      // 自动重连
      setTimeout(() => this.connect(config), 3000);
    };
  }

  sendTo(nodeId: string, message: any) {
    const ws = this.gateways.get(nodeId);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    } else {
      // 故障转移：发送到主节点
      this.sendToPrimary(message);
    }
  }

  broadcast(message: any) {
    this.gateways.forEach((ws, id) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message));
      }
    });
  }

  async invokeOnNode(nodeId: string, task: string): Promise<any> {
    // 发送任务到指定节点
    return new Promise((resolve, reject) => {
      const ws = this.gateways.get(nodeId);
      // ... 实现任务调用
    });
  }
}
```

### 阶段 2: 任务分发系统 (下周)

**目标**: 智能任务路由

```typescript
// src/renderer/services/task-dispatcher.ts
export class TaskDispatcher {
  private nodes: NodeStatus[];
  private loadBalancer: LoadBalancer;

  async dispatch(task: Task): Promise<string> {
    // 1. 分析任务类型
    const taskType = this.analyzeTask(task);
    
    // 2. 选择合适节点
    const targetNode = this.selectNode(taskType);
    
    // 3. 发送任务
    const sessionId = await this.sendToNode(targetNode, task);
    
    // 4. 监控执行
    this.monitorTask(sessionId);
    
    return sessionId;
  }

  private selectNode(taskType: TaskType): string {
    switch (taskType) {
      case 'UI_DEVELOPMENT':
        return 'node-02'; // MacBook (前端开发)
      case 'DATA_ANALYSIS':
        return 'node-03'; // VPS (计算能力强)
      case 'SECURITY_AUDIT':
        return 'node-03'; // VPS (安全隔离)
      case 'USER_INTERACTION':
        return 'node-01'; // Mac mini (主节点)
      default:
        return this.loadBalancer.leastLoaded();
    }
  }
}
```

### 阶段 3: 数据同步 (下周)

**目标**: SQLite 数据库多节点同步

```typescript
// src/renderer/services/db-sync.ts
export class DatabaseSync {
  private localDb: AxonDatabase;
  private syncPeers: string[];

  async syncChanges(changes: Change[]) {
    // 1. 记录本地变更
    await this.localDb.recordChanges(changes);
    
    // 2. 广播到所有节点
    await this.broadcastToPeers(changes);
    
    // 3. 接收远程变更
    this.listenForRemoteChanges();
  }

  private async broadcastToPeers(changes: Change[]) {
    const syncPromises = this.syncPeers.map(async (peer) => {
      await fetch(`http://${peer}:18790/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ changes }),
      });
    });
    await Promise.all(syncPromises);
  }

  private listenForRemoteChanges() {
    // 启动本地同步服务器
    const server = createServer((req, res) => {
      if (req.url === '/sync' && req.method === 'POST') {
        // 接收远程变更并应用
        this.applyRemoteChanges(req.body);
      }
    });
    server.listen(18790);
  }
}
```

### 阶段 4: Agent 迁移 (后续)

**目标**: Agent 可在节点间迁移

```typescript
// src/renderer/services/agent-migration.ts
export class AgentMigration {
  async migrate(agentId: string, fromNode: string, toNode: string) {
    // 1. 保存 Agent 状态
    const state = await this.captureState(agentId, fromNode);
    
    // 2. 传输到新节点
    await this.transferState(state, toNode);
    
    // 3. 在新节点恢复
    await this.restoreState(agentId, state, toNode);
    
    // 4. 从旧节点清理
    await this.cleanup(agentId, fromNode);
  }

  private async captureState(agentId: string, nodeId: string) {
    // 捕获 Agent 的完整状态
    return {
      agentId,
      memory: await this.getMemory(agentId),
      context: await this.getContext(agentId),
      config: await this.getConfig(agentId),
      timestamp: Date.now(),
    };
  }
}
```

---

## 📡 通信协议

### Gateway 间通信

```json
{
  "type": "node-to-node",
  "from": "node-01",
  "to": "node-02",
  "message": {
    "type": "task-dispatch",
    "taskId": "task-123",
    "task": "创建 React 组件",
    "agent": "ZARA",
    "priority": "high"
  }
}
```

### 心跳检测

```typescript
// 每 30 秒发送心跳
setInterval(() => {
  nodes.forEach(node => {
    sendHeartbeat(node);
  });
}, 30000);

// 超时判定 (90 秒无响应)
if (lastHeartbeat < Date.now() - 90000) {
  markNodeAsOffline(nodeId);
}
```

---

## 🔐 安全考虑

### 认证机制

```typescript
// 节点间认证 Token
const nodeToken = generateToken({
  nodeId: 'node-01',
  permissions: ['read', 'write', 'execute'],
  expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 天
});

// 验证请求
function verifyNodeToken(token: string): boolean {
  const payload = verify(token, NODE_SECRET);
  return payload.expiresAt > Date.now();
}
```

### 加密通信

```typescript
// WebSocket over TLS
const ws = new WebSocket('wss://node-01.example.com:18789');

// 消息加密
const encrypted = encrypt(message, sharedSecret);
ws.send(encrypted);
```

---

## 📊 部署清单

### 节点 1: Mac mini (主节点)

```bash
# 1. 安装 OpenClaw
brew install openclaw

# 2. 配置 Gateway
cat >> ~/.openclaw/config.json << EOF
{
  "gateway": {
    "port": 18789,
    "bind": "0.0.0.0",  # 允许外网访问
    "auth": true
  },
  "nodes": {
    "enabled": true,
    "role": "coordinator"
  }
}
EOF

# 3. 启动 Gateway
openclaw gateway start

# 4. 配置防火墙
sudo pfctl -f /etc/pf.conf  # 开放 18789 端口
```

### 节点 2: MacBook (开发节点)

```bash
# 1. 安装 OpenClaw
brew install openclaw

# 2. 配置 Gateway
cat >> ~/.openclaw/config.json << EOF
{
  "gateway": {
    "port": 18789,
    "bind": "127.0.0.1",  # 仅本地
    "auth": true
  },
  "nodes": {
    "enabled": true,
    "role": "worker",
    "coordinator": "ws://192.168.1.x:18789"
  }
}
EOF

# 3. 启动 Gateway
openclaw gateway start
```

### 节点 3: VPS (云端节点)

```bash
# 1. Docker 部署
docker run -d \
  --name openclaw \
  -p 18789:18789 \
  -v openclaw-data:/data \
  -e OPENCLAW_NODE_ROLE=worker \
  -e OPENCLAW_COORDINATOR=ws://192.168.1.x:18789 \
  openclaw/openclaw:latest

# 2. 配置防火墙
ufw allow 18789/tcp
```

---

## 🎯 使用场景

### 场景 1: 分布式开发

```
用户： "ZARA，创建 Dashboard 组件"

AXON (Node-01) → 分析任务
   ↓
ZARA (Node-02/MacBook) → 开发组件
   ↓
结果 → Node-01 → 用户
```

### 场景 2: 24 小时监控

```
ATLAS (Node-03/VPS) → 持续监控系统
   ↓ 发现异常
   ↓
AXON (Node-01) → 通知用户
   ↓
用户 → 处理
```

### 场景 3: 重任务计算

```
用户： "分析这个 10GB 数据集"

AXON (Node-01) → 路由到
   ↓
ECHO (Node-03/VPS) → 执行分析 (VPS 计算能力强)
   ↓
结果 → Node-01 → 用户
```

---

## 📅 实施计划

### P0 (本周 3/12-3/15)

| 任务 | 负责人 | 状态 |
|------|--------|------|
| 多 Gateway 客户端 | DANTE | ⚪ 待开始 |
| 节点配置管理 | ATLAS | ⚪ 待开始 |
| 基础通信协议 | CIPHER | ⚪ 待开始 |

### P1 (下周 3/16-3/22)

| 任务 | 负责人 | 状态 |
|------|--------|------|
| 任务分发系统 | NEXUS | ⚪ 计划中 |
| 数据库同步 | DANTE | ⚪ 计划中 |
| 心跳检测 | ATLAS | ⚪ 计划中 |

### P2 (后续 3/23-3/30)

| 任务 | 负责人 | 状态 |
|------|--------|------|
| Agent 迁移 | KAEL | ⚪ 计划中 |
| 负载均衡 | NEXUS | ⚪ 计划中 |
| 故障转移 | CIPHER | ⚪ 计划中 |

---

## 📊 竞争优势

| 功能 | ClawDeckX | OpenClaw | AxonClaw |
|------|-----------|----------|----------|
| 单节点部署 | ✅ | ✅ | ✅ |
| **多节点分布式** | ❌ | ❌ | ✅ **领先** |
| 任务智能路由 | ❌ | ❌ | ✅ **领先** |
| 数据多节点同步 | ❌ | ❌ | ✅ **领先** |
| Agent 迁移 | ❌ | ❌ | ✅ **领先** |

---

## 🎯 总结

### 当前状态

- ❌ OpenClaw 原生多节点：**讨论中**
- ✅ AxonClaw 可自主实现
- ✅ 建立技术壁垒的机会

### 战略价值

1. **技术领先**: OpenClaw 还没有的功能
2. **实用价值**: 充分利用用户现有设备
3. **竞争壁垒**: 竞争对手难以快速跟进

### 下一步

1. 询问用户有哪些设备可用
2. 规划具体节点部署
3. 开始实现多 Gateway 支持

---

*报告版本：v1.0*
*创建时间：2026-03-12 23:30*
*作者：AXON 🜏 + ATLAS*
