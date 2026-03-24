# 消息队列技能使用示例

## 📦 安装与导入

```typescript
import { createMessageQueue, MessageQueue } from './src/skills/message-queue-skill';
```

---

## 🚀 快速开始

### 1. 创建基础队列

```typescript
// 使用默认配置
const queue = createMessageQueue();

// 自定义配置
const queue = createMessageQueue({
  name: 'my-app-queue',
  maxMessages: 10000,
  defaultTTL: 3600000, // 1 小时
  persistence: {
    enabled: true,
    directory: './data/messages',
    maxMessagesPerFile: 1000,
    retentionDays: 7,
  },
});
```

---

## 📤 消息发布

### 基础发布

```typescript
// 发布简单消息
queue.publish('notifications', {
  userId: '123',
  message: '欢迎使用消息队列!',
});

// 发布带优先级的消息
queue.publish('alerts', {
  type: 'error',
  content: '服务器异常!',
}, {
  priority: 'high', // 'high' | 'normal' | 'low'
});

// 发布带过期时间的消息
queue.publish('temp-data', {
  cacheKey: 'user-123',
  value: 'some-data',
}, {
  ttl: 60000, // 1 分钟后过期
});

// 发布带元数据的消息
queue.publish('analytics', {
  event: 'page_view',
  page: '/home',
}, {
  priority: 'low',
  ttl: 86400000, // 24 小时
  metadata: {
    source: 'web',
    userAgent: 'Mozilla/5.0...',
    ip: '192.168.1.1',
  },
});
```

### 批量发布

```typescript
const messages = queue.publishBatch([
  {
    topic: 'user.events',
    payload: { userId: '1', action: 'login' },
    priority: 'normal',
  },
  {
    topic: 'user.events',
    payload: { userId: '2', action: 'signup' },
    priority: 'high',
  },
  {
    topic: 'system.logs',
    payload: { level: 'info', message: 'System started' },
    priority: 'low',
  },
]);

console.log(`发布了 ${messages.length} 条消息`);
console.log('消息 IDs:', messages.map(m => m.id));
```

---

## 📥 消息订阅

### 基础订阅

```typescript
// 订阅主题
const subscriberId = queue.subscribe('notifications', (message) => {
  console.log('收到通知:', message.payload);
  console.log('消息 ID:', message.id);
  console.log('创建时间:', new Date(message.createdAt));
});

// 异步回调
queue.subscribe('async-events', async (message) => {
  // 执行异步操作
  await processEvent(message.payload);
  console.log('处理完成');
});
```

### 带过滤器的订阅

```typescript
// 只接收高优先级消息
queue.subscribe('alerts', (message) => {
  console.log('高优先级告警:', message.payload);
}, (message) => {
  return message.priority === 'high';
});

// 只接收特定类型的消息
queue.subscribe('user.events', (message) => {
  console.log('用户登录事件:', message.payload);
}, (message) => {
  return message.payload.action === 'login';
});

// 复合过滤
queue.subscribe('orders', (message) => {
  console.log('大额订单:', message.payload);
}, (message) => {
  return message.payload.amount > 1000 && 
         message.payload.status === 'pending';
});
```

### 取消订阅

```typescript
// 取消订阅
const success = queue.unsubscribe(subscriberId);
console.log('取消订阅:', success ? '成功' : '失败');

// 获取所有订阅者
const subscribers = queue.getSubscribers();
console.log('当前订阅者数量:', subscribers.length);

// 获取指定主题的订阅者
const topicSubscribers = queue.getSubscribersByTopic('notifications');
console.log('notifications 主题订阅者:', topicSubscribers.length);
```

---

## 💾 消息持久化

### 启用持久化

```typescript
const queue = createMessageQueue({
  name: 'persistent-queue',
  persistence: {
    enabled: true,
    directory: './data/messages', // 持久化目录
    maxMessagesPerFile: 1000,     // 单文件最大消息数
    retentionDays: 14,            // 保留 14 天
  },
});

// 发布的消息会自动持久化
queue.publish('important.events', {
  event: 'critical-operation',
  data: 'must-not-lose',
});

// 查看持久化消息数量
const count = queue.getPersistedMessageCount();
console.log('持久化消息数:', count);
```

### 持久化文件结构

```
./data/messages/
├── persistent-queue-2026-03-13-0.json
├── persistent-queue-2026-03-13-1.json
├── persistent-queue-2026-03-14-0.json
└── ...
```

每个文件包含 JSON 数组格式的消息。

---

## 🔍 消息查询

### 获取单条消息

```typescript
const message = queue.getMessage<MessageType>('msg-123456');
if (message) {
  console.log('消息内容:', message.payload);
  console.log('状态:', message.status);
}
```

### 按主题查询

```typescript
// 获取最新 50 条消息
const messages = queue.getMessagesByTopic('user.events', 50);

// 处理消息
messages.forEach(msg => {
  console.log(`${msg.id}: ${JSON.stringify(msg.payload)}`);
});
```

### 获取所有消息

```typescript
const allMessages = queue.getAllMessages(100);
console.log(`当前有 ${allMessages.length} 条未过期消息`);
```

---

## ⚙️ 消息管理

### 更新消息状态

```typescript
// 标记为已送达
queue.updateMessageStatus('msg-123', 'delivered');

// 标记为失败
queue.updateMessageStatus('msg-456', 'failed');
```

### 删除消息

```typescript
const deleted = queue.deleteMessage('msg-789');
console.log('删除成功:', deleted);
```

### 清理过期消息

```typescript
// 定期清理 (建议每小时执行一次)
const cleaned = queue.cleanupExpiredMessages();
console.log(`清理了 ${cleaned} 条过期消息`);

// 结合定时器
setInterval(() => {
  const cleaned = queue.cleanupExpiredMessages();
  if (cleaned > 0) {
    console.log(`[清理] 移除了 ${cleaned} 条过期消息`);
  }
}, 3600000); // 每小时
```

### 清空队列

```typescript
queue.clear();
console.log('队列已清空');
```

---

## 📊 统计监控

### 获取队列统计

```typescript
const stats = queue.getStats();

console.log('=== 队列统计 ===');
console.log('总消息数:', stats.totalMessages);
console.log('订阅者数量:', stats.subscriberCount);
console.log('持久化消息数:', stats.persistedMessages);

console.log('\n按主题分布:');
Object.entries(stats.byTopic).forEach(([topic, count]) => {
  console.log(`  ${topic}: ${count}`);
});

console.log('\n按优先级分布:');
Object.entries(stats.byPriority).forEach(([priority, count]) => {
  console.log(`  ${priority}: ${count}`);
});

console.log('\n按状态分布:');
Object.entries(stats.byStatus).forEach(([status, count]) => {
  console.log(`  ${status}: ${count}`);
});
```

### 实时监控示例

```typescript
// 每 5 秒输出一次统计
setInterval(() => {
  const stats = queue.getStats();
  console.log(`[监控] 消息：${stats.totalMessages} | 订阅者：${stats.subscriberCount}`);
}, 5000);
```

---

## 🎯 实际应用场景

### 场景 1: 用户通知系统

```typescript
const notificationQueue = createMessageQueue({
  name: 'notifications',
  defaultTTL: 300000, // 5 分钟
});

// 订阅者：发送邮件
notificationQueue.subscribe('user.notifications', async (message) => {
  const { userId, type, content } = message.payload;
  await sendEmail(userId, type, content);
});

// 订阅者：发送推送
notificationQueue.subscribe('user.notifications', async (message) => {
  const { userId, type, content } = message.payload;
  await sendPushNotification(userId, content);
}, (message) => {
  // 只处理高优先级的推送
  return message.priority === 'high';
});

// 发布通知
notificationQueue.publish('user.notifications', {
  userId: '123',
  type: 'welcome',
  content: '欢迎加入!',
}, {
  priority: 'normal',
});
```

### 场景 2: 事件总线

```typescript
const eventBus = createMessageQueue({
  name: 'event-bus',
  maxMessages: 50000,
});

// 注册事件处理器
eventBus.subscribe('order.created', async (message) => {
  const { orderId, userId, amount } = message.payload;
  
  // 扣减库存
  await reduceStock(orderId);
  
  // 创建物流单
  await createShipping(orderId);
  
  // 发送确认邮件
  await sendConfirmationEmail(userId, orderId);
});

// 发布事件
eventBus.publish('order.created', {
  orderId: 'ORD-20260313-001',
  userId: 'user-123',
  amount: 299.99,
  items: [...],
}, {
  priority: 'high',
  ttl: 60000, // 1 分钟内必须处理
});
```

### 场景 3: 日志收集

```typescript
const logQueue = createMessageQueue({
  name: 'logs',
  persistence: {
    enabled: true,
    directory: './data/logs',
    retentionDays: 30,
  },
});

// 订阅者：写入文件
logQueue.subscribe('app.logs', (message) => {
  const { level, message: logMessage, context } = message.payload;
  const logLine = `[${level}] ${logMessage} ${JSON.stringify(context)}`;
  fs.appendFileSync('./app.log', logLine + '\n');
});

// 订阅者：发送到远程日志服务
logQueue.subscribe('app.logs', async (message) => {
  await sendToLogService(message.payload);
}, (message) => {
  // 只发送错误日志
  return message.payload.level === 'error';
});

// 记录日志
logQueue.publish('app.logs', {
  level: 'info',
  message: 'User logged in',
  context: { userId: '123', ip: '192.168.1.1' },
}, {
  priority: 'low',
});
```

### 场景 4: 任务调度

```typescript
const taskQueue = createMessageQueue({
  name: 'tasks',
  defaultTTL: 3600000,
});

// 工作进程
taskQueue.subscribe('tasks.image.process', async (message) => {
  const { imageUrl, operations } = message.payload;
  
  try {
    await processImage(imageUrl, operations);
    queue.updateMessageStatus(message.id, 'delivered');
  } catch (error) {
    queue.updateMessageStatus(message.id, 'failed');
    console.error('处理失败:', error);
  }
});

// 提交任务
taskQueue.publish('tasks.image.process', {
  imageUrl: 'https://example.com/image.jpg',
  operations: ['resize', 'compress', 'watermark'],
}, {
  priority: 'normal',
  ttl: 1800000, // 30 分钟内处理
  metadata: {
    requestId: 'req-123',
    userId: 'user-456',
  },
});
```

---

## 🔧 高级配置

### 动态更新配置

```typescript
// 更新队列配置
queue.updateConfig({
  maxMessages: 20000,
  defaultTTL: 7200000, // 2 小时
  persistence: {
    enabled: true,
    retentionDays: 30,
  },
});

// 获取当前配置
const config = queue.getConfig();
console.log('当前配置:', config);
```

### 自定义消息类型

```typescript
interface UserEvent {
  userId: string;
  action: 'login' | 'logout' | 'signup';
  timestamp: number;
}

interface SystemLog {
  level: 'info' | 'warn' | 'error';
  message: string;
  context: Record<string, any>;
}

// 类型安全的发布
queue.publish<UserEvent>('user.events', {
  userId: '123',
  action: 'login',
  timestamp: Date.now(),
});

// 类型安全的订阅
queue.subscribe<UserEvent>('user.events', (message) => {
  // message.payload 类型为 UserEvent
  console.log(message.payload.userId);
});
```

---

## ⚠️ 注意事项

### 1. 内存管理

```typescript
// 定期清理过期消息
setInterval(() => {
  queue.cleanupExpiredMessages();
}, 3600000);

// 监控队列大小
const stats = queue.getStats();
if (stats.totalMessages > 8000) {
  console.warn('队列接近容量上限!');
}
```

### 2. 错误处理

```typescript
queue.subscribe('events', (message) => {
  try {
    processMessage(message);
  } catch (error) {
    console.error('处理消息失败:', error);
    queue.updateMessageStatus(message.id, 'failed');
  }
});
```

### 3. 性能优化

```typescript
// 批量发布优于单次发布
queue.publishBatch(messages);

// 使用过滤器减少不必要的回调
queue.subscribe('all.events', handler, (msg) => {
  return msg.priority === 'high'; // 只处理高优先级
});
```

---

## 📝 API 参考

### MessageQueue 类

| 方法 | 参数 | 返回值 | 描述 |
|------|------|--------|------|
| `publish` | topic, payload, options | Message | 发布消息 |
| `publishBatch` | messages[] | Message[] | 批量发布 |
| `subscribe` | topic, callback, filter | string | 订阅主题 |
| `unsubscribe` | subscriberId | boolean | 取消订阅 |
| `getMessage` | messageId | Message\|null | 获取消息 |
| `getMessagesByTopic` | topic, limit | Message[] | 按主题查询 |
| `getAllMessages` | limit | Message[] | 获取所有消息 |
| `deleteMessage` | messageId | boolean | 删除消息 |
| `updateMessageStatus` | messageId, status | boolean | 更新状态 |
| `cleanupExpiredMessages` | - | number | 清理过期消息 |
| `clear` | - | void | 清空队列 |
| `getStats` | - | QueueStats | 获取统计 |
| `getSubscribers` | - | Subscriber[] | 获取订阅者 |
| `updateConfig` | config | void | 更新配置 |
| `getConfig` | - | MessageQueueConfig | 获取配置 |

---

**创建时间:** 2026-03-13  
**版本:** 1.0.0  
**作者:** KAEL
