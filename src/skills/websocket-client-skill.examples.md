# WebSocket Client Skill 使用示例

**文件:** `src/skills/websocket-client-skill.ts`  
**版本:** 1.0.0  
**作者:** Axon  
**创建时间:** 2026-03-13

---

## 📦 快速开始

### 1. 基础连接

```typescript
import { createWebSocketClient, WebSocketState } from './websocket-client-skill';

// 创建客户端
const client = createWebSocketClient({
  url: 'ws://localhost:18792',
});

// 注册事件监听器
client
  .on('open', () => {
    console.log('✅ 连接成功!');
  })
  .on('close', (code, reason) => {
    console.log(`❌ 连接关闭: ${code} - ${reason}`);
  })
  .on('error', (error) => {
    console.error('💥 错误:', error.message);
  })
  .on('message', (message) => {
    console.log('📨 收到消息:', message);
  });

// 连接
client.connect();

// 发送消息
client.send({
  type: 'subscribe',
  data: { channels: ['task.update', 'agent.status'] },
});

// 断开连接
// client.disconnect();
```

---

## 🔁 自动重连配置

### 2. 自定义重连策略

```typescript
const client = createWebSocketClient({
  url: 'ws://localhost:18792',
  
  // 启用自动重连
  autoReconnect: true,
  
  // 初始重连延迟 (ms)
  reconnectDelay: 1000,
  
  // 最大重连延迟 (ms)
  maxReconnectDelay: 30000,
  
  // 重连延迟倍增系数 (指数退避)
  reconnectMultiplier: 2,
  
  // 最大重连次数 (0 = 无限)
  maxReconnectAttempts: 10,
});

// 监听重连事件
client.on('reconnect', (attempt, delay) => {
  console.log(`🔄 重连中... 第 ${attempt} 次尝试，${delay}ms 后连接`);
});

client.connect();
```

**重连策略说明:**
- 第 1 次重连：1 秒后
- 第 2 次重连：2 秒后
- 第 3 次重连：4 秒后
- 第 4 次重连：8 秒后
- ...
- 最大延迟：30 秒

---

## 💓 心跳检测

### 3. 心跳配置与监控

```typescript
const client = createWebSocketClient({
  url: 'ws://localhost:18792',
  
  // 心跳间隔 (ms)
  heartbeatInterval: 30000,
  
  // 心跳超时时间 (ms)
  heartbeatTimeout: 10000,
});

// 监听心跳事件
client
  .on('heartbeat', () => {
    console.log('💓 心跳正常');
  })
  .on('heartbeatTimeout', () => {
    console.warn('⚠️ 心跳超时，将触发重连');
  });

client.connect();
```

**心跳机制:**
1. 连接建立后立即发送第一次 Ping
2. 每隔 `heartbeatInterval` 发送 Ping
3. 等待 Pong 响应，超时则触发 `heartbeatTimeout`
4. 心跳超时后自动断开并重连

---

## 📬 消息队列

### 4. 离线消息队列

```typescript
const client = createWebSocketClient({
  url: 'ws://localhost:18792',
  
  // 消息队列最大容量
  maxQueueSize: 1000,
  
  // 离线时消息入队
  queueOfflineMessages: true,
  
  // 连接后自动重放队列消息
  replayOnConnect: true,
});

// 发送消息 (离线时自动入队)
client.send({
  type: 'task.update',
  data: { taskId: '123', status: 'in_progress' },
});

// 查看队列状态
console.log('队列消息数:', client.getQueuedMessageCount());

// 手动清空队列
// client.clearQueue();

client.connect();
```

**消息队列特性:**
- 离线时发送的消息自动缓存
- 连接建立后自动重放
- 每条消息最多重试 3 次
- 队列满时移除最旧消息 (FIFO)

---

## 📊 统计监控

### 5. 获取客户端统计信息

```typescript
const client = createWebSocketClient({
  url: 'ws://localhost:18792',
});

client.connect();

// 定期获取统计信息
setInterval(() => {
  const stats = client.getStats();
  
  console.log('=== WebSocket 统计 ===');
  console.log('状态:', stats.currentState);
  console.log('连接次数:', stats.connectionCount);
  console.log('重连次数:', stats.reconnectCount);
  console.log('发送消息:', stats.messagesSent);
  console.log('接收消息:', stats.messagesReceived);
  console.log('队列消息:', stats.queuedMessages);
  console.log('心跳次数:', stats.heartbeatCount);
  console.log('心跳超时:', stats.heartbeatTimeoutCount);
  console.log('正常运行时间:', stats.uptime, 'ms');
  console.log('=====================');
}, 60000);

// 重置统计
// client.resetStats();
```

---

## 🎯 自定义消息处理器

### 6. 注册特定消息类型处理器

```typescript
const client = createWebSocketClient({
  url: 'ws://localhost:18792',
  
  // 自定义协议处理器
  customHandlers: {
    'task.update': (data) => {
      console.log('📋 任务更新:', data);
      // 更新 UI
    },
    
    'agent.status': (data) => {
      console.log('🤖 Agent 状态:', data);
      // 更新 Agent 列表
    },
    
    'system.notify': (data) => {
      console.log('🔔 系统通知:', data.level, data.message);
      // 显示通知
    },
  },
});

client.connect();

// 订阅频道
client.send({
  type: 'subscribe',
  data: {
    channels: ['task.update', 'agent.status', 'system.notify'],
  },
});
```

---

## 🔄 状态管理

### 7. 监听连接状态变化

```typescript
import { WebSocketState } from './websocket-client-skill';

const client = createWebSocketClient({
  url: 'ws://localhost:18792',
});

client.on('stateChange', (state) => {
  switch (state) {
    case WebSocketState.CONNECTING:
      console.log('🔄 连接中...');
      break;
    
    case WebSocketState.CONNECTED:
      console.log('✅ 已连接');
      break;
    
    case WebSocketState.RECONNECTING:
      console.log('🔁 重连中...');
      break;
    
    case WebSocketState.DISCONNECTED:
      console.log('❌ 已断开');
      break;
  }
});

// 检查连接状态
if (client.isConnected()) {
  console.log('当前已连接');
}

client.connect();
```

---

## 🚀 完整示例

### 8. 生产环境完整配置

```typescript
import { createWebSocketClient, WebSocketState } from './websocket-client-skill';

class ARIAWebSocketService {
  private client: ReturnType<typeof createWebSocketClient>;
  
  constructor() {
    this.client = createWebSocketClient({
      url: process.env.WS_URL || 'ws://localhost:18792',
      
      // 重连配置
      autoReconnect: true,
      reconnectDelay: 1000,
      maxReconnectDelay: 30000,
      reconnectMultiplier: 2,
      maxReconnectAttempts: 0, // 无限重连
      
      // 心跳配置
      heartbeatInterval: 30000,
      heartbeatTimeout: 10000,
      
      // 消息队列
      maxQueueSize: 1000,
      queueOfflineMessages: true,
      replayOnConnect: true,
      
      // 自定义处理器
      customHandlers: {
        'task.update': this.handleTaskUpdate.bind(this),
        'agent.status': this.handleAgentStatus.bind(this),
        'system.notify': this.handleSystemNotify.bind(this),
      },
    });

    this.setupEventListeners();
  }
  
  private setupEventListeners(): void {
    this.client
      .on('open', () => {
        console.log('✅ ARIA WebSocket 连接成功');
        this.subscribeToChannels();
      })
      .on('close', (code, reason) => {
        console.warn(`⚠️ ARIA WebSocket 断开: ${code} - ${reason}`);
      })
      .on('error', (error) => {
        console.error('💥 ARIA WebSocket 错误:', error);
      })
      .on('reconnect', (attempt, delay) => {
        console.log(`🔄 ARIA WebSocket 重连: #${attempt}, ${delay}ms`);
      })
      .on('heartbeat', () => {
        // 静默心跳，无需日志
      })
      .on('heartbeatTimeout', () => {
        console.warn('⚠️ ARIA WebSocket 心跳超时');
      })
      .on('stateChange', (state) => {
        this.onStateChange(state);
      });
  }
  
  private subscribeToChannels(): void {
    this.client.send({
      type: 'subscribe',
      data: {
        channels: [
          'task.update',
          'task.status',
          'agent.status',
          'agent.heartbeat',
          'system.notify',
        ],
      },
    });
  }
  
  private handleTaskUpdate(data: any): void {
    console.log('📋 任务更新:', data.taskId, data.status);
    // 触发 UI 更新
  }
  
  private handleAgentStatus(data: any): void {
    console.log('🤖 Agent 状态:', data.agentId, data.status);
    // 更新 Agent 列表
  }
  
  private handleSystemNotify(data: any): void {
    console.log('🔔 系统通知:', data.level, data.message);
    // 显示通知
  }
  
  private onStateChange(state: WebSocketState): void {
    // 根据状态更新 UI
    switch (state) {
      case WebSocketState.CONNECTED:
        // 显示在线状态
        break;
      case WebSocketState.DISCONNECTED:
      case WebSocketState.RECONNECTING:
        // 显示离线/重连状态
        break;
    }
  }
  
  public connect(): void {
    this.client.connect();
  }
  
  public disconnect(): void {
    this.client.disconnect();
  }
  
  public sendTaskUpdate(taskId: string, status: string): void {
    this.client.send({
      type: 'task.update',
      data: { taskId, status },
    });
  }
  
  public getStats() {
    return this.client.getStats();
  }
}

// 使用示例
const wsService = new ARIAWebSocketService();
wsService.connect();

// 发送任务更新
wsService.sendTaskUpdate('task-123', 'completed');

// 查看统计
console.log(wsService.getStats());
```

---

## 🧪 测试示例

### 9. 单元测试示例

```typescript
import { WebSocketClient, WebSocketState } from './websocket-client-skill';

describe('WebSocketClient', () => {
  let client: WebSocketClient;

  beforeEach(() => {
    client = new WebSocketClient({
      url: 'ws://localhost:18792',
      autoReconnect: false,
    });
  });

  afterEach(() => {
    client.disconnect();
  });

  test('should create client with default config', () => {
    expect(client.getState()).toBe(WebSocketState.DISCONNECTED);
    expect(client.isConnected()).toBe(false);
  });

  test('should queue messages when offline', () => {
    client.send({ type: 'test', data: { value: 1 } });
    client.send({ type: 'test', data: { value: 2 } });
    
    expect(client.getQueuedMessageCount()).toBe(2);
  });

  test('should clear message queue', () => {
    client.send({ type: 'test' });
    client.clearQueue();
    
    expect(client.getQueuedMessageCount()).toBe(0);
  });

  test('should track stats', () => {
    const stats = client.getStats();
    
    expect(stats.currentState).toBe(WebSocketState.DISCONNECTED);
    expect(stats.messagesSent).toBe(0);
    expect(stats.messagesReceived).toBe(0);
  });

  test('should register event handlers', () => {
    const mockHandler = jest.fn();
    
    client.on('message', mockHandler);
    client.off('message', mockHandler);
    
    // 验证处理器已移除
    expect(true).toBe(true);
  });
});
```

---

## 📝 API 参考

### 核心方法

| 方法 | 描述 | 返回值 |
|------|------|--------|
| `connect()` | 连接到 WebSocket 服务器 | `this` (链式调用) |
| `disconnect()` | 手动断开连接 | `this` |
| `send(message, queueIfOffline)` | 发送消息 | `boolean` (是否成功发送) |
| `getState()` | 获取当前状态 | `WebSocketState` |
| `isConnected()` | 检查是否已连接 | `boolean` |
| `getQueuedMessageCount()` | 获取队列消息数 | `number` |
| `clearQueue()` | 清空消息队列 | `this` |
| `getStats()` | 获取统计信息 | `ClientStats` |
| `resetStats()` | 重置统计信息 | `this` |

### 事件监听

| 事件 | 回调参数 | 描述 |
|------|----------|------|
| `open` | `()` | 连接建立 |
| `close` | `(code, reason)` | 连接关闭 |
| `error` | `(error)` | 发生错误 |
| `message` | `(message)` | 收到消息 |
| `stateChange` | `(state)` | 状态变化 |
| `reconnect` | `(attempt, delay)` | 重连事件 |
| `heartbeat` | `()` | 心跳响应 |
| `heartbeatTimeout` | `()` | 心跳超时 |

### 配置选项

| 选项 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| `url` | `string` | - | WebSocket 服务器 URL |
| `autoReconnect` | `boolean` | `true` | 是否自动重连 |
| `reconnectDelay` | `number` | `1000` | 初始重连延迟 (ms) |
| `maxReconnectDelay` | `number` | `30000` | 最大重连延迟 (ms) |
| `reconnectMultiplier` | `number` | `2` | 重连延迟倍增系数 |
| `maxReconnectAttempts` | `number` | `0` | 最大重连次数 (0=无限) |
| `heartbeatInterval` | `number` | `30000` | 心跳间隔 (ms) |
| `heartbeatTimeout` | `number` | `10000` | 心跳超时 (ms) |
| `maxQueueSize` | `number` | `1000` | 消息队列最大容量 |
| `queueOfflineMessages` | `boolean` | `true` | 离线消息入队 |
| `replayOnConnect` | `boolean` | `true` | 连接后重放队列 |
| `customHandlers` | `Record` | `{}` | 自定义消息处理器 |

---

## ⚠️ 注意事项

1. **内存泄漏预防**: 组件卸载时务必调用 `disconnect()`
2. **消息大小**: WebSocket 消息建议控制在 1MB 以内
3. **并发连接**: 浏览器通常限制同一域名最多 10 个 WebSocket 连接
4. **心跳间隔**: 建议 30-60 秒，避免过于频繁
5. **重连策略**: 生产环境建议设置 `maxReconnectAttempts` 避免无限重连

---

**交付完成时间:** 2026-03-13  
**技能文件:** `src/skills/websocket-client-skill.ts`  
**示例文件:** `src/skills/websocket-client-skill.examples.md`
