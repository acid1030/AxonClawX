# Observer Pattern Skill - 使用示例

## 快速开始

```typescript
import ObserverPatternSkill from './observer-pattern-skill';

// 1. 创建实例
const observer = new ObserverPatternSkill();

// 2. 创建主题
observer.createTopic('notifications');

// 3. 订阅主题
observer.subscribe('notifications', 'user-1', 'User One', (message) => {
  console.log('Received:', message);
});

// 4. 广播消息
observer.broadcast('notifications', { type: 'info', content: 'Hello!' });
```

---

## 场景 1: 任务状态通知

```typescript
const observer = new ObserverPatternSkill();

// 创建任务状态主题
observer.createTopic('task.status');
observer.createTopic('task.progress');

// 前端订阅任务状态
observer.subscribe('task.status', 'frontend', 'Frontend UI', (event) => {
  updateUI(event); // 更新界面显示
});

// 后端订阅任务进度
observer.subscribe('task.progress', 'backend', 'Backend Service', (event) => {
  logProgress(event); // 记录进度日志
});

// 任务执行中广播状态
observer.broadcast('task.status', {
  taskId: 'task-123',
  status: 'running',
  timestamp: Date.now(),
});

observer.broadcast('task.progress', {
  taskId: 'task-123',
  progress: 45,
  message: 'Processing...',
});
```

---

## 场景 2: 多 Agent 协作

```typescript
const observer = new ObserverPatternSkill();

// 创建协作主题
observer.createTopic('agent.coordination');
observer.createTopic('agent.results');

// 主 Agent 订阅结果
observer.subscribe('agent.results', 'main-agent', 'Main Agent', (result) => {
  console.log('Subagent result:', result);
  // 合并结果或触发下一步
});

// 子 Agent 订阅协调指令
observer.subscribe('agent.coordination', 'sub-agent-1', 'Sub Agent 1', (指令) => {
  executeTask(指令);
});

// 派发任务
observer.broadcast('agent.coordination', {
  targetAgent: 'sub-agent-1',
  action: 'fetch_data',
  params: { url: 'https://api.example.com' },
});

// 子 Agent 汇报结果
observer.broadcast('agent.results', {
  agentId: 'sub-agent-1',
  status: 'success',
  data: { /* ... */ },
});
```

---

## 场景 3: 系统事件总线

```typescript
const observer = new ObserverPatternSkill();

// 创建系统事件主题
observer.createTopic('system.startup');
observer.createTopic('system.shutdown');
observer.createTopic('system.error');
observer.createTopic('system.config.change');

// 日志服务订阅所有事件
observer.subscribe('system.startup', 'logger', 'Logger', (e) => log(e));
observer.subscribe('system.shutdown', 'logger', 'Logger', (e) => log(e));
observer.subscribe('system.error', 'logger', 'Logger', (e) => logError(e));
observer.subscribe('system.config.change', 'logger', 'Logger', (e) => log(e));

// 监控服务订阅错误事件
observer.subscribe('system.error', 'monitor', 'Monitor Service', (e) => {
  if (e.severity === 'critical') {
    sendAlert(e);
  }
});

// 触发系统事件
observer.broadcast('system.startup', {
  version: '1.0.0',
  timestamp: Date.now(),
});
```

---

## 场景 4: 实时数据推送

```typescript
const observer = new ObserverPatternSkill();

// 创建数据流主题
observer.createTopic('data.stream');

// 多个客户端订阅数据流
for (let i = 0; i < 5; i++) {
  observer.subscribe('data.stream', `client-${i}`, `Client ${i}`, (data) => {
    renderChart(data);
  });
}

// 定时推送数据
setInterval(() => {
  observer.broadcast('data.stream', {
    timestamp: Date.now(),
    value: Math.random() * 100,
  });
}, 1000);
```

---

## 场景 5: 与 OpenClaw Message 工具集成

```typescript
import ObserverPatternSkill from './observer-pattern-skill';
import { message } from '@openclaw/tools';

const observer = new ObserverPatternSkill();
observer.createTopic('openclaw.alerts');

// 订阅告警主题并发送到消息通道
observer.subscribe('openclaw.alerts', 'telegram-bridge', 'Telegram Bridge', async (alert) => {
  await message({
    action: 'send',
    channel: alert.channel || '-1002381931352',
    message: alert.content,
  });
});

// 触发告警
observer.broadcast('openclaw.alerts', {
  channel: '-1002381931352',
  content: '⚠️ 任务执行超时警告',
  type: 'warning',
});
```

---

## API 参考

### 主题管理

| 方法 | 参数 | 返回值 | 描述 |
|------|------|--------|------|
| `createTopic` | `topicName: string` | `boolean` | 创建新主题 |
| `deleteTopic` | `topicName: string` | `boolean` | 删除主题 |
| `listTopics` | - | `string[]` | 列出所有主题 |
| `getTopicInfo` | `topicName: string` | `TopicInfo \| null` | 获取主题信息 |

### 观察者管理

| 方法 | 参数 | 返回值 | 描述 |
|------|------|--------|------|
| `subscribe` | `topicName, observerId, observerName, callback` | `boolean` | 订阅主题 |
| `unsubscribe` | `topicName, observerId` | `boolean` | 取消订阅 |
| `getObservers` | `topicName: string` | `Observer[] \| null` | 获取所有观察者 |
| `isSubscribed` | `topicName, observerId` | `boolean` | 检查是否已订阅 |

### 消息广播

| 方法 | 参数 | 返回值 | 描述 |
|------|------|--------|------|
| `broadcast` | `topicName, message` | `boolean` | 广播消息 |
| `getMessageHistory` | `topicName, limit?` | `any[]` | 获取消息历史 |
| `clearHistory` | `topicName: string` | `boolean` | 清空历史 |

### 批量操作

| 方法 | 参数 | 返回值 | 描述 |
|------|------|--------|------|
| `subscribeMultiple` | `subscriptions[]` | `{success, topicName}[]` | 批量订阅 |
| `broadcastMultiple` | `broadcasts[]` | `{success, topicName}[]` | 批量广播 |

### 统计信息

| 方法 | 参数 | 返回值 | 描述 |
|------|------|--------|------|
| `getStats` | - | `Stats` | 全局统计 |
| `exportState` | - | `any` | 导出状态 |

---

## 最佳实践

1. **主题命名规范**: 使用点分隔的层级命名，如 `user.login.success`
2. **观察者 ID 唯一性**: 确保每个观察者有唯一 ID
3. **错误处理**: 在回调中捕获异常，避免影响其他观察者
4. **消息历史限制**: 设置合理的 `maxHistoryLength` 避免内存泄漏
5. **及时取消订阅**: 观察者销毁前调用 `unsubscribe`

---

**创建时间:** 2026-03-13  
**创建者:** KAEL (Subagent)
