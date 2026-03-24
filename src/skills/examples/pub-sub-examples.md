# 发布订阅技能使用示例 - Pub/Sub Skill Examples

## 快速开始

### 1. 基础使用

```typescript
import { createPubSub, PubSubManager } from './pub-sub-skill';

// 创建管理器实例
const pubsub = createPubSub({ maxHistoryPerTopic: 100 });

// 订阅主题
const subId = pubsub.subscribe('user.created', (message) => {
  console.log('收到消息:', message.data);
});

// 发布消息
await pubsub.publish('user.created', {
  userId: '123',
  username: 'john',
  email: 'john@example.com'
});

// 取消订阅
pubsub.unsubscribe(subId);
```

---

## 功能示例

### 2. 主题管理

```typescript
// 创建主题
pubsub.createTopic('orders');
pubsub.createTopic('notifications.email', true); // 系统主题

// 列出所有主题
const topics = pubsub.listTopics();
console.log('所有主题:', topics);

// 按模式列出主题
const orderTopics = pubsub.listTopics('orders.*');
console.log('订单相关主题:', orderTopics);

// 获取主题信息
const topicInfo = pubsub.getTopic('user.created');
console.log('主题信息:', topicInfo);
// 输出:
// {
//   name: 'user.created',
//   subscriberCount: 1,
//   messageCount: 5,
//   lastMessageAt: 1234567890,
//   isSystem: false
// }

// 删除主题
pubsub.deleteTopic('orders');
```

---

### 3. 订阅管理

#### 3.1 基础订阅

```typescript
// 普通订阅
const subId = pubsub.subscribe('user.*', (message) => {
  console.log('收到用户事件:', message.topic, message.data);
});

// 订阅一次 (once)
pubsub.subscribeOnce('system.startup', (message) => {
  console.log('系统启动:', message.data);
});

// 带过滤器的订阅
const filter = pubsub.createFilter({
  fields: { priority: 'high' }
});

pubsub.subscribe('notifications', (message) => {
  console.log('高优先级通知:', message.data);
}, { filter });
```

#### 3.2 通配符订阅

```typescript
// 订阅所有用户事件
pubsub.subscribe('user.*', (message) => {
  // 匹配：user.created, user.updated, user.deleted
  console.log('用户事件:', message.topic);
});

// 订阅所有事件
pubsub.subscribe('*', (message) => {
  console.log('所有消息:', message.topic);
});

// 多级通配符
pubsub.subscribe('api.v1.*', (message) => {
  // 匹配：api.v1.users, api.v1.orders
  console.log('API v1 事件:', message.topic);
});
```

#### 3.3 取消订阅

```typescript
// 取消单个订阅
const subId = pubsub.subscribe('test', () => {});
pubsub.unsubscribe(subId);

// 批量取消 (需要自己管理订阅 ID)
const subIds = [
  pubsub.subscribe('topic1', () => {}),
  pubsub.subscribe('topic2', () => {}),
];
subIds.forEach(id => pubsub.unsubscribe(id));
```

---

### 4. 消息过滤

#### 4.1 字段匹配过滤

```typescript
// 只接收特定字段的消息
const filter = pubsub.createFilter({
  fields: {
    status: 'completed',
    type: 'payment'
  }
});

pubsub.subscribe('orders', (message) => {
  console.log('已完成的支付订单:', message.data);
}, { filter });

// 发布消息
await pubsub.publish('orders', {
  orderId: '123',
  status: 'completed',
  type: 'payment',
  amount: 100
}); // 会被接收

await pubsub.publish('orders', {
  orderId: '456',
  status: 'pending',
  type: 'payment',
  amount: 200
}); // 不会被接收 (status 不匹配)
```

#### 4.2 正则表达式过滤

```typescript
// 只接收包含特定关键词的消息
const filter = pubsub.createFilter({
  regex: /error|critical|warning/i
});

pubsub.subscribe('logs', (message) => {
  console.log('重要日志:', message.data);
}, { filter });

// 发布消息
await pubsub.publish('logs', 'System error occurred'); // 会被接收
await pubsub.publish('logs', 'Normal operation'); // 不会被接收
```

#### 4.3 时间范围过滤

```typescript
// 只接收最近 5 分钟的消息
const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;

const filter = pubsub.createFilter({
  timeRange: {
    start: fiveMinutesAgo
  }
});

pubsub.subscribe('events', (message) => {
  console.log('最近的事件:', message.data);
}, { filter });
```

#### 4.4 自定义函数过滤

```typescript
// 复杂的自定义过滤逻辑
const filter = pubsub.createFilter({
  fn: (message, topic) => {
    // 只处理金额大于 1000 的订单
    if (topic.includes('order') && message.data.amount > 1000) {
      return true;
    }
    
    // 只处理 VIP 用户
    if (message.data.userType === 'vip') {
      return true;
    }
    
    return false;
  }
});

pubsub.subscribe('transactions', (message) => {
  console.log('大额交易或 VIP 用户:', message.data);
}, { filter });
```

#### 4.5 组合过滤

```typescript
// 组合多种过滤条件
const filter = pubsub.createFilter({
  fields: { priority: 'high' },
  regex: /urgent/i,
  timeRange: {
    start: Date.now() - 60 * 60 * 1000 // 最近 1 小时
  },
  fn: (message) => {
    // 额外的自定义逻辑
    return message.data.amount > 500;
  }
});

pubsub.subscribe('alerts', (message) => {
  console.log('紧急高优先级告警:', message.data);
}, { filter });
```

---

### 5. 消息发布

```typescript
// 基础发布
await pubsub.publish('user.created', {
  userId: '123',
  username: 'john'
});

// 带元数据的发布
await pubsub.publish('order.completed', {
  orderId: '456',
  amount: 299.99
}, {
  senderId: 'order-service',
  metadata: {
    region: 'us-east',
    version: '1.0',
    traceId: 'abc-123-xyz'
  }
});

// 不保存历史
await pubsub.publish('temp.event', {
  data: 'temporary'
}, {
  skipHistory: true
});
```

---

### 6. 消息历史与查询

```typescript
// 获取消息历史
const history = pubsub.getHistory('user.created', 10);
console.log('最近 10 条用户创建消息:', history);

// 搜索消息
const results = pubsub.searchMessages(
  'user.*',
  (message) => message.data.username === 'john',
  50
);
console.log('John 的相关消息:', results);

// 获取统计信息
const stats = pubsub.getStats();
console.log('统计信息:', stats);
// 输出:
// {
//   totalTopics: 5,
//   totalSubscriptions: 10,
//   totalMessages: 150,
//   activeSubscribers: 8
// }
```

---

## 实战场景

### 7. 场景 1: 事件驱动架构

```typescript
import { createPubSub } from './pub-sub-skill';

const eventBus = createPubSub();

// 用户服务
eventBus.subscribe('user.created', async (message) => {
  // 发送欢迎邮件
  await sendWelcomeEmail(message.data.email);
  
  // 创建默认配置
  await createDefaultSettings(message.data.userId);
  
  // 记录审计日志
  await auditLog('USER_CREATED', message.data);
});

// 订单服务
eventBus.subscribe('order.placed', async (message) => {
  // 扣减库存
  await reduceStock(message.data.items);
  
  // 创建支付单
  await createPayment(message.data.orderId, message.data.amount);
});

// 通知服务 (监听所有事件)
eventBus.subscribe('*', async (message) => {
  await logEvent(message.topic, message.data);
});

// 业务代码
await eventBus.publish('user.created', {
  userId: '123',
  email: 'user@example.com'
});

await eventBus.publish('order.placed', {
  orderId: '456',
  items: [{ sku: 'A', qty: 2 }],
  amount: 299.99
});
```

---

### 8. 场景 2: 微服务通信

```typescript
const serviceBus = createPubSub();

// API 网关服务
serviceBus.subscribe('api.request', async (message) => {
  // 限流检查
  if (await isRateLimited(message.data.ip)) {
    return;
  }
  
  // 转发到对应服务
  await forwardToService(message.data.path, message.data.body);
});

// 认证服务
serviceBus.subscribe('auth.validate', async (message) => {
  const isValid = await validateToken(message.data.token);
  await serviceBus.publish('auth.result', {
    requestId: message.data.requestId,
    valid: isValid
  });
});

// 日志服务
serviceBus.subscribe('log.*', async (message) => {
  await writeToELK(message.topic, message.data);
});
```

---

### 9. 场景 3: 实时通知系统

```typescript
const notificationBus = createPubSub();

// 用户订阅自己的通知
function subscribeUserNotifications(userId: string, callback: (msg: Message) => void) {
  return notificationBus.subscribe(
    `user.${userId}.notifications`,
    callback,
    {
      filter: notificationBus.createFilter({
        timeRange: { start: Date.now() }
      })
    }
  );
}

// 发送通知
async function sendNotification(userId: string, content: string, priority: string) {
  await notificationBus.publish(`user.${userId}.notifications`, {
    content,
    priority,
    read: false
  });
}

// 高优先级通知 (广播)
async function broadcastUrgent(message: string) {
  await notificationBus.publish('broadcast.urgent', {
    message,
    timestamp: Date.now()
  });
}
```

---

### 10. 场景 4: 数据管道

```typescript
const dataPipeline = createPubSub();

// 数据源
dataPipeline.subscribe('data.raw', async (message) => {
  // 数据清洗
  const cleaned = await cleanData(message.data);
  await dataPipeline.publish('data.cleaned', cleaned);
});

// 数据转换
dataPipeline.subscribe('data.cleaned', async (message) => {
  // 数据转换
  const transformed = await transformData(message.data);
  await dataPipeline.publish('data.transformed', transformed);
});

// 数据加载
dataPipeline.subscribe('data.transformed', async (message) => {
  // 加载到数据库
  await loadToDatabase(message.data);
  await dataPipeline.publish('data.loaded', {
    success: true,
    records: message.data.length
  });
});

// 启动数据流
await dataPipeline.publish('data.raw', rawData);
```

---

## API 参考

### PubSubManager 类

| 方法 | 描述 | 参数 | 返回值 |
|------|------|------|--------|
| `createTopic` | 创建主题 | `topicName: string, isSystem?: boolean` | `TopicInfo` |
| `deleteTopic` | 删除主题 | `topicName: string` | `boolean` |
| `listTopics` | 列出主题 | `pattern?: string` | `TopicInfo[]` |
| `getTopic` | 获取主题信息 | `topicName: string` | `TopicInfo \| undefined` |
| `subscribe` | 订阅主题 | `topic, handler, options?` | `string` (订阅 ID) |
| `unsubscribe` | 取消订阅 | `subscriptionId: string` | `boolean` |
| `subscribeOnce` | 订阅一次 | `topic, handler, filter?` | `string` |
| `publish` | 发布消息 | `topic, data, options?` | `Promise<Message>` |
| `createFilter` | 创建过滤器 | `options: FilterOptions` | `MessageFilter` |
| `getHistory` | 获取历史消息 | `topic, limit?` | `Message[]` |
| `searchMessages` | 搜索消息 | `topicPattern, filter?, limit?` | `Message[]` |
| `getStats` | 获取统计信息 | - | `PubSubStats` |

### FilterOptions 接口

```typescript
interface FilterOptions {
  regex?: RegExp;              // 正则表达式过滤
  fields?: Record<string, any>; // 字段匹配过滤
  fn?: MessageFilter;          // 自定义函数过滤
  timeRange?: {
    start?: number;
    end?: number;
  };                           // 时间范围过滤
}
```

### Message 接口

```typescript
interface Message<T = any> {
  id: string;                  // 消息 ID
  topic: string;               // 主题
  data: T;                     // 消息内容
  timestamp: number;           // 时间戳
  senderId?: string;           // 发送者 ID
  metadata?: Record<string, any>; // 元数据
}
```

---

## 最佳实践

### ✅ 推荐

1. **使用有意义的主题命名**
   ```typescript
   // 好
   'user.created', 'order.completed', 'payment.failed'
   
   // 不好
   'event1', 'data', 'msg'
   ```

2. **合理使用通配符**
   ```typescript
   // 订阅相关事件
   'user.*', 'api.v1.*'
   ```

3. **使用过滤器减少不必要的处理**
   ```typescript
   const filter = pubsub.createFilter({
     fields: { priority: 'high' }
   });
   ```

4. **及时取消不需要的订阅**
   ```typescript
   const subId = pubsub.subscribe('temp', handler);
   // ... 使用完成后
   pubsub.unsubscribe(subId);
   ```

### ❌ 避免

1. **避免过度使用全局订阅**
   ```typescript
   // 不推荐：监听所有事件
   pubsub.subscribe('*', handler);
   ```

2. **避免在过滤器中执行耗时操作**
   ```typescript
   // 不推荐
   const filter = pubsub.createFilter({
     fn: async (msg) => {
       await slowDatabaseQuery(msg); // 会阻塞消息分发
     }
   });
   ```

3. **避免消息循环**
   ```typescript
   // 危险：可能导致无限循环
   pubsub.subscribe('a', async () => {
     await pubsub.publish('b', {});
   });
   pubsub.subscribe('b', async () => {
     await pubsub.publish('a', {}); // 循环!
   });
   ```

---

## 性能提示

1. **限制历史消息数量**
   ```typescript
   const pubsub = createPubSub({ maxHistoryPerTopic: 50 });
   ```

2. **使用 skipHistory 跳过不重要的消息**
   ```typescript
   await pubsub.publish('debug.log', data, { skipHistory: true });
   ```

3. **定期清理不用的主题**
   ```typescript
   const topics = pubsub.listTopics();
   topics.forEach(t => {
     if (t.subscriberCount === 0 && t.messageCount === 0) {
       pubsub.deleteTopic(t.name);
     }
   });
   ```

---

**版本:** 1.0.0  
**作者:** Axon  
**最后更新:** 2026-03-13
