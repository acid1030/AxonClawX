# AxonClaw Node Connector

通过 SSH + 环境变量实现节点连接

## 核心功能

- ✅ SSH 登录远程主机
- ✅ 单命令执行：`export OPENCLAW_NODE_NAME=<name> && openclaw node run &`
- ✅ 连接验证（检查进程是否启动）
- ✅ SSH 配置管理
- ✅ 连接状态追踪

## 快速开始

### 安装依赖

```bash
cd src/node
yarn install
```

### 使用示例

#### 方式 1: 直接 CLI

```bash
# 连接节点
yarn dev 192.168.1.100 worker-1

# 或使用 ts-node
npx ts-node node-connector.ts 192.168.1.100 worker-1
```

#### 方式 2: 编程使用

```typescript
import { nodeConnector } from './node-connector';

// 连接节点
const result = await nodeConnector.connectNode('192.168.1.100', 'worker-1');

if (result.success) {
  console.log('✅ 连接成功:', result.nodeId);
} else {
  console.log('❌ 连接失败:', result.error);
}

// 断开连接
await nodeConnector.disconnectNode('worker-1-192-168-1-100');

// 查看所有连接
const connections = nodeConnector.getConnections();
```

#### 方式 3: 自定义 SSH 配置

```typescript
import { NodeConnector } from './node-connector';

const connector = new NodeConnector();

const result = await connector.connectNode('192.168.1.100', 'worker-1', {
  host: '192.168.1.100',
  port: 22,
  username: 'admin',
  privateKey: '/Users/nike/.ssh/id_rsa',
  passphrase: 'your-passphrase'
});
```

## 配置

### 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `SSH_USERNAME` | `root` | 默认 SSH 用户名 |
| `SSH_KEY_PATH` | - | SSH 私钥路径 |
| `HOME` | 用户主目录 | 配置和日志文件路径 |

### 配置文件

- **连接配置**: `~/.openclaw/data/node-connections.json`
- **日志文件**: `~/.openclaw/logs/node-connector.log`

## API

### NodeConnector 类

#### `connectNode(host, name, sshConfig?)`

连接到远程节点

```typescript
async connectNode(
  host: string,      // SSH 主机地址
  name: string,      // 节点名称
  sshConfig?: SSHConfig  // 可选的 SSH 配置
): Promise<ConnectionResult>
```

**返回**:
```typescript
{
  success: boolean,
  nodeId?: string,
  message: string,
  error?: string
}
```

#### `disconnectNode(nodeId)`

断开节点连接

```typescript
async disconnectNode(nodeId: string): Promise<boolean>
```

#### `getConnections()`

获取所有连接

```typescript
getConnections(): NodeConnection[]
```

#### `getConnectionStatus(nodeId)`

获取连接状态

```typescript
getConnectionStatus(nodeId: string): NodeConnection | undefined
```

#### `saveSSHConfig(name, config)`

保存 SSH 配置

```typescript
saveSSHConfig(name: string, config: SSHConfig): boolean
```

## 类型定义

### SSHConfig

```typescript
interface SSHConfig {
  host: string;
  port: number;
  username: string;
  password?: string;
  privateKey?: string;
  passphrase?: string;
  keepaliveInterval?: number;
  readyTimeout?: number;
}
```

### NodeConnection

```typescript
interface NodeConnection {
  id: string;
  name: string;
  host: string;
  status: 'connected' | 'disconnected' | 'error';
  connectedAt?: number;
  lastError?: string;
}
```

## 连接流程

```
1. SSH 连接
   ↓
2. 执行命令：export OPENCLAW_NODE_NAME="worker-1" && openclaw node run &
   ↓
3. 等待 2 秒
   ↓
4. 验证：pgrep -f "openclaw node"
   ↓
5. 更新状态 → 成功/失败
```

## 日志格式

```json
{
  "timestamp": "2026-03-13T07:01:00.000Z",
  "level": "INFO",
  "message": "SSH 连接成功",
  "data": {
    "host": "192.168.1.100",
    "name": "worker-1"
  }
}
```

## 故障排查

### 问题：连接超时

**检查**:
1. SSH 服务是否运行：`ssh user@host`
2. 防火墙是否阻止 22 端口
3. 主机地址是否正确

```bash
# 测试 SSH 连接
ssh -v user@192.168.1.100

# 检查端口
nc -zv 192.168.1.100 22
```

### 问题：命令执行失败

**检查**:
1. openclaw 是否已安装
2. 用户权限是否正确
3. 查看远程日志

```bash
# 手动测试命令
ssh user@host "openclaw node run"

# 查看远程进程
ssh user@host "ps aux | grep openclaw"
```

### 问题：验证失败

**可能原因**:
1. 节点启动时间超过 2 秒
2. 进程名不匹配
3. 权限问题

**解决**: 调整 `CONFIG.VERIFICATION_DELAY` 或检查远程日志

## 安全

- 支持 SSH 密钥认证（推荐）
- 支持密码认证
- 支持密钥 passphrase
- 连接超时保护（10 秒）
- Keepalive 心跳（30 秒）

## 与 NodeController 集成

NodeConnector 负责**建立连接**，NodeController 负责**管理连接**。

```typescript
// 1. 使用 NodeConnector 连接节点
const result = await nodeConnector.connectNode(host, name);

// 2. 节点自动通过 WebSocket 注册到 NodeController
// (openclaw node run 会启动 WebSocket 客户端)

// 3. NodeController 管理已注册的节点
const nodes = nodeController.getNodes();
```

## 待办事项

- [ ] 支持 SSH agent 转发
- [ ] 支持跳板机（bastion host）
- [ ] 添加连接池管理
- [ ] 实现自动重连
- [ ] 添加性能监控
- [ ] 支持批量连接

## 许可证

MIT
