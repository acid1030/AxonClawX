# 发布订阅技能 - Pub/Sub Skill

## 概述

一个功能完整的发布订阅 (Publish-Subscribe) 模式实现，支持主题管理、消息过滤和通配符匹配。

## 功能特性

✅ **主题管理**
- 创建/删除主题
- 列出所有主题 (支持模式匹配)
- 获取主题统计信息
- 系统主题标记

✅ **发布订阅**
- 订阅主题 (支持通配符 `*`)
- 取消订阅
- 一次性订阅 (once)
- 异步消息分发

✅ **消息过滤**
- 字段匹配过滤
- 正则表达式过滤
- 自定义函数过滤
- 时间范围过滤
- 组合过滤

✅ **其他功能**
- 消息历史记录
- 消息搜索
- 统计信息
- 自动主题创建

## 安装使用

```typescript
import { createPubSub, PubSubManager } from './pub-sub-skill';

// 创建实例
const pubsub = createPubSub({ maxHistoryPerTopic: 100 });

// 订阅
const subId = pubsub.subscribe('user.created', (message) => {
  console.log('新用户:', message.data);
});

// 发布
await pubsub.publish('user.created', {
  userId: '123',
  username: 'john'
});

// 取消订阅
pubsub.unsubscribe(subId);
```

## 快速示例

### 1. 通配符订阅

```typescript
// 订阅所有用户事件
pubsub.subscribe('user.*', (message) => {
  console.log('用户事件:', message.topic);
});

// 发布
await pubsub.publish('user.created', { id: 1 });
await pubsub.publish('user.updated', { id: 1 });
```

### 2. 消息过滤

```typescript
// 创建过滤器 (只接收高优先级消息)
const filter = pubsub.createFilter({
  fields: { priority: 'high' }
});

pubsub.subscribe('events', (message) => {
  console.log('高优先级:', message.data);
}, { filter });
```

### 3. 正则过滤

```typescript
const filter = pubsub.createFilter({
  regex: /error|warning/i
});

pubsub.subscribe('logs', (message) => {
  console.log('重要日志:', message.data);
}, { filter });
```

### 4. 消息历史

```typescript
// 获取最近 10 条消息
const history = pubsub.getHistory('user.created', 10);

// 搜索消息
const results = pubsub.searchMessages(
  'user.*',
  (msg) => msg.data.username === 'john',
  50
);
```

## API 文档

详细 API 文档和使用示例请查看:
- [使用示例](./examples/pub-sub-examples.md)
- [测试文件](./test-pub-sub-skill.ts)

## 运行测试

```bash
npx ts-node src/skills/test-pub-sub-skill.ts
```

## 实战场景

### 事件驱动架构

```typescript
const eventBus = createPubSub();

// 用户服务
eventBus.subscribe('user.created', async (message) => {
  await sendWelcomeEmail(message.data.email);
  await createDefaultSettings(message.data.userId);
});

// 订单服务
eventBus.subscribe('order.placed', async (message) => {
  await reduceStock(message.data.items);
  await createPayment(message.data.orderId);
});
```

### 微服务通信

```typescript
const serviceBus = createPubSub();

// API 网关
serviceBus.subscribe('api.request', async (message) => {
  if (await isRateLimited(message.data.ip)) return;
  await forwardToService(message.data.path, message.data.body);
});

// 认证服务
serviceBus.subscribe('auth.validate', async (message) => {
  const isValid = await validateToken(message.data.token);
  await serviceBus.publish('auth.result', { valid: isValid });
});
```

### 实时通知系统

```typescript
// 用户订阅自己的通知
function subscribeUserNotifications(userId: string, callback: any) {
  return pubsub.subscribe(`user.${userId}.notifications`, callback);
}

// 发送通知
await pubsub.publish(`user.${userId}.notifications`, {
  content: '您有新消息',
  priority: 'high'
});
```

## 类型定义

```typescript
interface Message<T = any> {
  id: string;
  topic: string;
  data: T;
  timestamp: number;
  senderId?: string;
  metadata?: Record<string, any>;
}

interface FilterOptions {
  regex?: RegExp;
  fields?: Record<string, any>;
  fn?: MessageFilter;
  timeRange?: { start?: number; end?: number; };
}

interface PubSubStats {
  totalTopics: number;
  totalSubscriptions: number;
  totalMessages: number;
  activeSubscribers: number;
}
```

## 最佳实践

### ✅ 推荐

1. 使用有意义的主题命名：`user.created`, `order.completed`
2. 合理使用通配符：`user.*`, `api.v1.*`
3. 使用过滤器减少不必要的处理
4. 及时取消不需要的订阅

### ❌ 避免

1. 避免过度使用全局订阅 `*`
2. 避免在过滤器中执行耗时操作
3. 避免消息循环

## 性能提示

1. 限制历史消息数量：`createPubSub({ maxHistoryPerTopic: 50 })`
2. 使用 `skipHistory` 跳过不重要的消息
3. 定期清理不用的主题

## 版本

- **版本:** 1.0.0
- **作者:** Axon
- **最后更新:** 2026-03-13

## 许可证

MIT
