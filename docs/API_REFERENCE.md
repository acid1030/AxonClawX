# AxonClaw API 参考文档

> 版本: v1.0
> 更新时间: 2026-03-12
> Gateway: ws://127.0.0.1:18789
> 协议: JSON-RPC 2.0

---

## 概述

AxonClaw Gateway 提供 WebSocket 接口，使用 JSON-RPC 2.0 协议进行通信。

### 连接

```typescript
const ws = new WebSocket('ws://127.0.0.1:18789');

ws.onopen = () => {
  // 连接成功
};
```

### 请求格式

```json
{
  "jsonrpc": "2.0",
  "method": "方法名",
  "params": { /* 参数 */ },
  "id": 1
}
```

### 响应格式

```json
{
  "jsonrpc": "2.0",
  "result": { /* 结果 */ },
  "id": 1
}
```

### 错误响应

```json
{
  "jsonrpc": "2.0",
  "error": {
    "code": -32600,
    "message": "Invalid Request"
  },
  "id": 1
}
```

---

## Agent API

### 获取 Agent 列表

```json
{
  "jsonrpc": "2.0",
  "method": "agents.list",
  "params": {},
  "id": 1
}
```

**响应:**
```json
{
  "jsonrpc": "2.0",
  "result": {
    "agents": [
      {
        "id": "agent-001",
        "name": "ZARA",
        "role": "fullstack",
        "status": "idle",
        "specialty": "全栈开发"
      }
    ]
  },
  "id": 1
}
```

### 创建 Agent

```json
{
  "jsonrpc": "2.0",
  "method": "agents.create",
  "params": {
    "name": "BLAZE",
    "role": "frontend",
    "specialty": "前端开发",
    "soul": "对像素的极致追求..."
  },
  "id": 2
}
```

### 更新 Agent

```json
{
  "jsonrpc": "2.0",
  "method": "agents.update",
  "params": {
    "id": "agent-001",
    "updates": {
      "name": "ZARA-PRO",
      "status": "busy"
    }
  },
  "id": 3
}
```

### 删除 Agent

```json
{
  "jsonrpc": "2.0",
  "method": "agents.delete",
  "params": {
    "id": "agent-001"
  },
  "id": 4
}
```

---

## Session API

### 获取会话列表

```json
{
  "jsonrpc": "2.0",
  "method": "sessions.list",
  "params": {
    "limit": 20,
    "offset": 0
  },
  "id": 5
}
```

**响应:**
```json
{
  "jsonrpc": "2.0",
  "result": {
    "sessions": [
      {
        "key": "session-001",
        "label": "项目讨论",
        "createdAt": "2026-03-12T10:00:00Z",
        "lastMessage": "继续推进..."
      }
    ],
    "total": 15
  },
  "id": 5
}
```

### 发送消息

```json
{
  "jsonrpc": "2.0",
  "method": "sessions.send",
  "params": {
    "sessionKey": "session-001",
    "message": "开始新任务"
  },
  "id": 6
}
```

### 获取消息历史

```json
{
  "jsonrpc": "2.0",
  "method": "sessions.history",
  "params": {
    "sessionKey": "session-001",
    "limit": 50
  },
  "id": 7
}
```

---

## Channel API

### 获取 Channel 列表

```json
{
  "jsonrpc": "2.0",
  "method": "channels.list",
  "params": {},
  "id": 8
}
```

**响应:**
```json
{
  "jsonrpc": "2.0",
  "result": {
    "channels": [
      {
        "id": "telegram-main",
        "type": "telegram",
        "name": "Telegram Bot",
        "status": "connected",
        "config": {
          "botToken": "***"
        }
      }
    ]
  },
  "id": 8
}
```

### 配置 Channel

```json
{
  "jsonrpc": "2.0",
  "method": "channels.configure",
  "params": {
    "type": "telegram",
    "config": {
      "botToken": "your-bot-token"
    }
  },
  "id": 9
}
```

### 检查 Channel 状态

```json
{
  "jsonrpc": "2.0",
  "method": "channels.health",
  "params": {
    "channelId": "telegram-main"
  },
  "id": 10
}
```

---

## 诊断 API

### 系统诊断

```json
{
  "jsonrpc": "2.0",
  "method": "diagnostics.run",
  "params": {},
  "id": 11
}
```

**响应:**
```json
{
  "jsonrpc": "2.0",
  "result": {
    "status": "healthy",
    "checks": [
      {
        "name": "Node.js Version",
        "status": "pass",
        "value": "v22.13.1"
      },
      {
        "name": "Gateway",
        "status": "pass",
        "value": "Running on port 18789"
      },
      {
        "name": "Database",
        "status": "pass",
        "value": "SQLite connected"
      }
    ]
  },
  "id": 11
}
```

### 获取系统状态

```json
{
  "jsonrpc": "2.0",
  "method": "system.status",
  "params": {},
  "id": 12
}
```

---

## 错误码

| 代码 | 含义 |
|------|------|
| -32700 | Parse error |
| -32600 | Invalid Request |
| -32601 | Method not found |
| -32602 | Invalid params |
| -32603 | Internal error |
| 1001 | Agent not found |
| 1002 | Session not found |
| 1003 | Channel not found |
| 2001 | Authentication failed |
| 2002 | Permission denied |

---

## TypeScript 客户端

```typescript
// lib/gateway-client.ts
export class GatewayClient {
  private ws: WebSocket;
  private requestId = 0;
  private pendingRequests = new Map<number, {
    resolve: (value: any) => void;
    reject: (error: any) => void;
  }>();

  constructor(url: string = 'ws://127.0.0.1:18789') {
    this.ws = new WebSocket(url);
    this.ws.onmessage = this.handleMessage.bind(this);
  }

  private handleMessage(event: MessageEvent) {
    const response = JSON.parse(event.data);
    const pending = this.pendingRequests.get(response.id);
    if (pending) {
      if (response.error) {
        pending.reject(response.error);
      } else {
        pending.resolve(response.result);
      }
      this.pendingRequests.delete(response.id);
    }
  }

  async call<T>(method: string, params: any = {}): Promise<T> {
    return new Promise((resolve, reject) => {
      const id = ++this.requestId;
      this.pendingRequests.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({
        jsonrpc: '2.0',
        method,
        params,
        id
      }));
    });
  }

  // Agent API
  listAgents() { return this.call('agents.list'); }
  createAgent(params: any) { return this.call('agents.create', params); }
  updateAgent(params: any) { return this.call('agents.update', params); }
  deleteAgent(id: string) { return this.call('agents.delete', { id }); }

  // Session API
  listSessions(params: any = {}) { return this.call('sessions.list', params); }
  sendMessage(sessionKey: string, message: string) {
    return this.call('sessions.send', { sessionKey, message });
  }
}
```

---

*文档版本: v1.0 | 2026-03-12*
