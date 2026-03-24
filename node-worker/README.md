# AxonClaw Node Worker

工作节点代理 - 多节点架构的执行平面

## 功能

- ✅ 自动连接主节点
- ✅ 节点注册
- ✅ 定时心跳 (30 秒)
- ✅ 任务执行
- ✅ 自动重连
- ✅ 系统信息采集

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

### 指定控制器地址

```bash
CONTROLLER_URL=ws://192.168.7.10:18789 yarn dev
```

## 配置

### 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `CONTROLLER_URL` | `ws://localhost:18789` | 控制器 WebSocket 地址 |

### 配置文件

- **节点 ID**: `~/.openclaw/data/node-id.txt`
- **Gateway Token**: `~/.openclaw/data/gateway-token.txt`
- **日志文件**: `~/.openclaw/logs/node-worker.log`

## 任务执行

### 支持的任务类型

#### exec:command

执行 shell 命令:

```json
{
  "id": "task-123",
  "type": "exec:command",
  "command": "npm run test",
  "env": {
    "NODE_ENV": "test"
  },
  "timeoutMs": 300000
}
```

### 任务生命周期

```
PENDING → DISPATCHED → RUNNING → COMPLETED/FAILED
                ↓
            ACK (确认接收)
                ↓
         PROGRESS (可选进度)
```

## 架构

```
NodeWorker
├── WebSocket Client    # 连接控制器
├── Heartbeat Sender    # 心跳发送
├── Task Executor       # 任务执行
└── Logger              # 日志系统
```

## 自动重连

Worker 使用指数退避策略自动重连:

```
尝试 1: 立即
尝试 2: 2 秒后
尝试 3: 4 秒后
尝试 4: 8 秒后
...
最大：30 秒
```

## 日志格式

```json
{
  "timestamp": "2026-03-13T03:28:00.000Z",
  "level": "INFO",
  "module": "NodeWorker",
  "message": "已连接到控制器",
  "data": {
    "nodeId": "worker-uuid"
  }
}
```

## 开发

### 代码结构

```
src/node-worker/
├── index.ts          # 主入口
├── package.json
└── tsconfig.json
```

### 添加任务类型

在 `executeTask` 方法中添加新的任务类型:

```typescript
private async executeTask(task: Task) {
  switch (task.type) {
    case 'exec:command':
      // 执行命令
      break;
    
    case 'browser:action':
      // 浏览器操作 (待实现)
      break;
    
    case 'file:operation':
      // 文件操作 (待实现)
      break;
  }
}
```

## 部署到远程节点

### 使用配对脚本

```bash
# 在主节点运行
../../scripts/node-pair.sh --host 192.168.7.80 --user axonclaw
```

### 手动部署

```bash
# 1. 同步代码
rsync -avz ./ axonclaw@192.168.7.80:~/.openclaw/workspace/

# 2. 安装依赖
ssh axonclaw@192.168.7.80 "cd ~/.openclaw/workspace/src/node-worker && yarn install"

# 3. 配置 Gateway Token
scp ~/.openclaw/data/gateway-token.txt axonclaw@192.168.7.80:~/.openclaw/data/

# 4. 启动 Worker
ssh axonclaw@192.168.7.80 "cd ~/.openclaw/workspace/src/node-worker && yarn dev"
```

### 使用 systemd (推荐)

创建服务文件 `/etc/systemd/system/axonclaw-worker.service`:

```ini
[Unit]
Description=AxonClaw Node Worker
After=network.target

[Service]
Type=simple
User=axonclaw
WorkingDirectory=/home/axonclaw/.openclaw/workspace/src/node-worker
ExecStart=/usr/bin/node dist/index.js
Restart=always
RestartSec=10
Environment=CONTROLLER_URL=ws://192.168.7.10:18789

[Install]
WantedBy=multi-user.target
```

启动服务:

```bash
sudo systemctl daemon-reload
sudo systemctl enable axonclaw-worker
sudo systemctl start axonclaw-worker
sudo systemctl status axonclaw-worker
```

## 故障排查

### 问题：无法连接控制器

**检查**:
1. 控制器是否运行
2. 网络是否通畅
3. Gateway Token 是否正确

```bash
# 测试 WebSocket 连接
wscat -c ws://localhost:18789

# 查看日志
tail -f ~/.openclaw/logs/node-worker.log
```

### 问题：任务执行失败

**检查**:
1. 命令是否存在
2. 权限是否足够
3. 超时时间是否合理

```bash
# 查看任务日志
grep "task" ~/.openclaw/logs/node-worker.log | tail -20
```

## 监控

### 查看节点状态

```bash
# 在主节点查看
cat ~/.openclaw/data/nodes.json | jq '.nodes["worker-uuid"]'
```

### 查看心跳

```bash
# 实时查看心跳日志
tail -f ~/.openclaw/logs/node-controller.log | grep heartbeat
```

## 安全

- Gateway Token 认证
- 连接加密 (WSS，待实现)
- 命令白名单 (待实现)
- 资源限制 (待实现)

## 性能指标

| 指标 | 目标 | 当前 |
|------|------|------|
| 连接延迟 | < 100ms | - |
| 心跳间隔 | 30s | ✅ |
| 任务响应 | < 1s | - |

## 待办事项

- [ ] 支持更多任务类型 (browser, file, memory)
- [ ] 实现任务进度报告
- [ ] 添加资源监控
- [ ] 支持 WSS 加密连接
- [ ] 实现命令白名单
- [ ] 添加资源限制

## 许可证

MIT
