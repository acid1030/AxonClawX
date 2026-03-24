# AxonClaw Node Controller

主节点控制器 - 多节点架构的控制平面

## 功能

- ✅ WebSocket 服务器 (端口 18789)
- ✅ 节点注册与管理
- ✅ Gateway Token 认证
- ✅ 心跳检测与故障发现
- ✅ 任务调度 (待实现)
- ✅ 结构化日志

## 快速开始

### 安装依赖

```bash
yarn install
```

### 开发模式

```bash
yarn dev
```

### 生产模式

```bash
yarn build
yarn start
```

## 配置

### 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `HOME` | 用户主目录 | 日志和数据文件路径 |

### 配置文件

- **节点注册表**: `~/.openclaw/data/nodes.json`
- **Gateway Token**: `~/.openclaw/data/gateway-token.txt`
- **日志文件**: `~/.openclaw/logs/node-controller.log`

## API

### WebSocket 端点

```
ws://localhost:18789
```

### JSON-RPC 方法

#### 节点注册

**请求** (Worker → Controller):
```json
{
  "jsonrpc": "2.0",
  "method": "nodes.register",
  "params": {
    "nodeId": "worker-uuid",
    "name": "worker-name",
    "type": "worker",
    "ip": "192.168.7.80",
    "port": 18790,
    "gatewayToken": "xxx",
    "capabilities": ["exec", "browser"],
    "metadata": {
      "hostname": "worker.local",
      "os": "Darwin",
      "arch": "arm64",
      "cpuCores": 8,
      "memoryGB": 16
    }
  },
  "id": 1
}
```

**响应** (Controller → Worker):
```json
{
  "jsonrpc": "2.0",
  "result": {
    "status": "accepted",
    "nodeId": "worker-uuid",
    "assignedRoles": ["worker"],
    "config": {
      "heartbeatInterval": 30000,
      "taskPollInterval": 5000
    }
  },
  "id": 1
}
```

#### 心跳

**请求** (Worker → Controller):
```json
{
  "jsonrpc": "2.0",
  "method": "nodes.heartbeat",
  "params": {
    "nodeId": "worker-uuid",
    "timestamp": 1710302430000,
    "sequence": 1,
    "status": {
      "cpu": 0.35,
      "memory": 0.62,
      "disk": 0.45
    },
    "runtime": {
      "activeTasks": 2,
      "uptime": 86400000
    }
  },
  "id": 1
}
```

**响应**:
```json
{
  "jsonrpc": "2.0",
  "result": {
    "status": "ok"
  },
  "id": 1
}
```

## 架构

```
NodeController
├── NodeRegistry        # 节点注册表
├── NodeWebSocketServer # WebSocket 服务器
├── HeartbeatDetector   # 心跳检测器
└── Logger              # 日志系统
```

## 节点状态机

```
HEALTHY ──(心跳超时)──> SUSPECTED
   ▲                        │
   │                        │ (继续超时)
   │                        ▼
   │                   UNREACHABLE
   │                        │
   │                  (主动探测失败)
   │                        ▼
   └──────────────────── FAILED
         (恢复)
```

## 日志格式

```json
{
  "timestamp": "2026-03-13T03:28:00.000Z",
  "level": "INFO",
  "module": "NodeController",
  "message": "节点已注册",
  "data": {
    "nodeId": "worker-uuid",
    "name": "worker-name"
  }
}
```

## 开发

### 代码结构

```
src/node-controller/
├── index.ts          # 主入口
├── logger.ts         # 日志模块
├── heartbeat.ts      # 心跳检测
├── package.json
└── tsconfig.json
```

### 添加新功能

1. 在 `index.ts` 中添加 JSON-RPC 方法处理
2. 在 `heartbeat.ts` 中扩展故障检测逻辑
3. 更新日志记录

### 测试

```bash
# 运行测试
yarn test

# 集成测试
../../scripts/test-p0-communication.sh
```

## 故障排查

### 问题：节点无法注册

**检查**:
1. Gateway Token 是否正确
2. WebSocket 服务器是否运行
3. 防火墙是否阻止 18789 端口

```bash
# 检查服务器状态
lsof -i :18789

# 查看日志
tail -f ~/.openclaw/logs/node-controller.log
```

### 问题：心跳超时

**检查**:
1. 网络连接是否稳定
2. Worker 是否正常运行
3. 系统负载是否过高

```bash
# 查看节点状态
cat ~/.openclaw/data/nodes.json | jq '.nodes[].status'
```

## 安全

- Gateway Token 认证 (所有节点必须提供有效 token)
- Ed25519 签名 (待实现)
- TLS 1.3 (待实现)
- 防火墙规则 (仅允许局域网访问)

## 性能指标

| 指标 | 目标 | 当前 |
|------|------|------|
| WebSocket 延迟 | < 50ms | - |
| 心跳处理 | < 10ms | - |
| 节点容量 | 10+ | 未测试 |

## 待办事项

- [ ] 集成 OpenClaw nodes 工具
- [ ] 实现 Ed25519 签名验证
- [ ] 添加 TLS 支持
- [ ] 完善故障转移逻辑
- [ ] 实现任务调度器
- [ ] 添加监控指标

## 许可证

MIT
