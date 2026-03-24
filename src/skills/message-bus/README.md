# 消息总线技能 - ACE

> 提供完整的消息传递解决方案，包含总线管理、消息路由和消息队列三大核心功能。

**作者:** ACE  
**版本:** 1.0.0  
**创建时间:** 2026-03-13

---

## 📦 核心功能

### 1. 总线管理 (Bus Management)
- ✅ 创建和销毁消息总线实例
- ✅ 注册/注销消息处理器
- ✅ 启动/停止总线
- ✅ 实时统计监控
- ✅ 消息历史记录

### 2. 消息路由 (Message Routing)
- ✅ 基于主题的消息分发
- ✅ 通配符匹配 (`user.*.created`)
- ✅ 多处理器并行处理
- ✅ 动态订阅/取消订阅
- ✅ 路由规则优先级

### 3. 消息队列 (Message Queue)
- ✅ 优先级队列 (URGENT > HIGH > NORMAL > LOW)
- ✅ 阻塞式/非阻塞式消费
- ✅ 队列容量限制
- ✅ 消息超时处理
- ✅ 请求 - 响应模式

---

## 🚀 快速开始

### 安装依赖

```bash
# 无需额外依赖，纯 TypeScript 实现
```

### 基础使用

```typescript
import {
  MessageBus,
  MessagePriority,
  MessageType,
  type MessageHandler
} from './skills/message-bus-skill';

// 1. 创建总线
const bus = new MessageBus({
  id: 'my-bus',
  maxQueueSize: 1000,
  enableLogging: true
});

// 2. 注册处理器
const handler: MessageHandler = {
  id: 'user-processor',
  topic: 'user.*',
  active: true,
  handle: async (message) => {
    console.log('收到消息:', message.payload);
  }
};

bus.registerHandler(handler);

// 3. 启动总线
bus.start();

// 4. 发布消息
bus.publish({
  type: MessageType.EVENT,
  topic: 'user.created',
  payload: { userId: 123, name: 'Alice' },
  priority: MessagePriority.HIGH
});

// 5. 查看统计
const stats = bus.getStatistics();
console.log(stats);

// 6. 停止总线
bus.stop();
```

---

## 📖 API 文档

### MessageBus 类

#### 构造函数参数

```typescript
interface MessageBusConfig {
  id: string;                    // 总线 ID
  maxQueueSize?: number;         // 最大队列长度 (默认：1000)
  messageTimeout?: number;       // 消息超时时间 ms (默认：30000)
  enableLogging?: boolean;       // 是否启用日志 (默认：false)
  defaultPriority?: MessagePriority; // 默认优先级 (默认：NORMAL)
}
```

#### 主要方法

| 方法 | 描述 | 参数 | 返回值 |
|------|------|------|--------|
| `start()` | 启动总线 | - | void |
| `stop()` | 停止总线 | - | void |
| `destroy()` | 销毁总线 | - | void |
| `registerHandler(handler)` | 注册处理器 | MessageHandler | void |
| `unregisterHandler(handlerId)` | 注销处理器 | string | void |
| `addRoutingRule(rule)` | 添加路由规则 | RoutingRule | void |
| `removeRoutingRule(ruleId)` | 移除路由规则 | string | void |
| `publish(message)` | 发布消息 | Omit<Message> | Message |
| `broadcast(topic, payload, senderId?)` | 广播消息 | string, T, string? | Message |
| `requestResponse(topic, payload, timeout?)` | 请求 - 响应 | string, T, number? | Promise<R\|null> |
| `getStatistics()` | 获取统计 | - | BusStatistics |
| `getMessageHistory(limit?)` | 获取历史 | number | Message[] |

### MessageRouter 类

```typescript
import { MessageRouter } from './skills/message-bus-skill';

const router = new MessageRouter();

// 添加路由规则
router.addRule({
  id: 'rule-1',
  topicPattern: 'order.*',
  handlerIds: ['processor-1', 'processor-2'],
  active: true,
  priority: 10
});

// 订阅主题
router.subscribe('user.email.*', 'email-service');

// 路由消息
const targets = router.route('order.created');
// 返回：['processor-1', 'processor-2']
```

### PriorityMessageQueue 类

```typescript
import { PriorityMessageQueue, MessagePriority } from './skills/message-bus-skill';

const queue = new PriorityMessageQueue(100);

// 入队
queue.enqueue(message);

// 出队 (阻塞式，带超时)
const msg = await queue.dequeue(5000);

// 出队 (非阻塞式)
const msgNow = queue.dequeueNow();

// 查看队首
const peek = queue.peek();

// 队列长度
const size = queue.size();
```

---

## 🎯 使用场景

### 场景 1: 事件驱动架构

```typescript
// 用户服务
bus.publish({
  type: MessageType.EVENT,
  topic: 'user.created',
  payload: { userId: 123 }
});

// 邮件服务 (监听 user.created)
bus.registerHandler({
  id: 'email-service',
  topic: 'user.created',
  handle: async (msg) => {
    await sendWelcomeEmail(msg.payload.userId);
  }
});

// 数据分析服务 (监听所有 user.* 事件)
bus.registerHandler({
  id: 'analytics',
  topic: 'user.*',
  handle: async (msg) => {
    await trackEvent(msg.topic, msg.payload);
  }
});
```

### 场景 2: 微服务通信

```typescript
// 订单服务发布事件
bus.publish({
  type: MessageType.EVENT,
  topic: 'order.created',
  payload: { orderId: 'ORD-001', amount: 299.99 },
  priority: MessagePriority.HIGH
});

// 库存服务处理
bus.registerHandler({
  id: 'inventory-service',
  topic: 'order.created',
  handle: async (msg) => {
    await reserveInventory(msg.payload.orderId);
  }
});

// 支付服务处理
bus.registerHandler({
  id: 'payment-service',
  topic: 'order.payment',
  handle: async (msg) => {
    await processPayment(msg.payload);
  }
});
```

### 场景 3: 请求 - 响应模式

```typescript
// 客户端发送请求
const result = await bus.requestResponse<{ a: number; b: number }, number>(
  'calc.add',
  { a: 10, b: 5 },
  5000  // 5 秒超时
);
console.log(result); // 15

// 服务端处理请求
bus.registerHandler({
  id: 'calculator',
  topic: 'calc.*',
  handle: async (msg) => {
    const { a, b } = msg.payload;
    msg.payload = a + b;
    msg.status = MessageStatus.COMPLETED;
  }
});
```

### 场景 4: 优先级任务处理

```typescript
const queue = new PriorityMessageQueue(100);

// 紧急告警 (最高优先级)
queue.enqueue({
  id: 'alert-1',
  topic: 'alert.critical',
  payload: { message: '服务器宕机!' },
  priority: MessagePriority.URGENT
});

// 用户登录 (高优先级)
queue.enqueue({
  id: 'login-1',
  topic: 'user.login',
  payload: { userId: 123 },
  priority: MessagePriority.HIGH
});

// 日常报告 (普通优先级)
queue.enqueue({
  id: 'report-1',
  topic: 'report.daily',
  payload: { date: '2026-03-13' },
  priority: MessagePriority.NORMAL
});

// 数据备份 (低优先级)
queue.enqueue({
  id: 'backup-1',
  topic: 'data.backup',
  payload: { type: 'full' },
  priority: MessagePriority.LOW
});

// 出队顺序：URGENT → HIGH → NORMAL → LOW
```

---

## 📊 消息优先级

| 优先级 | 枚举值 | 说明 | 使用场景 |
|--------|--------|------|----------|
| URGENT | 3 | 紧急 | 系统告警、故障处理 |
| HIGH | 2 | 高 | 用户操作、支付处理 |
| NORMAL | 1 | 普通 | 日常业务、通知发送 |
| LOW | 0 | 低 | 数据备份、日志归档 |

---

## 🔧 高级功能

### 通配符主题匹配

```typescript
// 匹配所有 user 事件
handler.topic = 'user.*'

// 匹配特定用户的操作
handler.topic = 'user.123.*'

// 匹配所有创建事件
handler.topic = '*.created'

// 精确匹配
handler.topic = 'order.payment.completed'
```

### 路由规则优先级

```typescript
// 高优先级规则先匹配
router.addRule({
  id: 'vip-rule',
  topicPattern: 'order.*',
  handlerIds: ['vip-processor'],
  priority: 100  // 高优先级
});

router.addRule({
  id: 'normal-rule',
  topicPattern: 'order.*',
  handlerIds: ['normal-processor'],
  priority: 10  // 低优先级
});
```

### 消息超时处理

```typescript
// 设置消息超时时间
const bus = new MessageBus({
  messageTimeout: 60000  // 60 秒超时
});

// 请求 - 响应模式下的超时
const result = await bus.requestResponse(
  'slow.operation',
  { data: '...' },
  10000  // 10 秒超时
);

if (result === null) {
  console.log('请求超时');
}
```

---

## 📝 运行示例

```bash
# 运行完整示例
npx ts-node src/skills/message-bus-skill.examples.ts

# 示例输出包含:
# 1. 基础总线管理
# 2. 消息路由
# 3. 优先级队列
# 4. 请求 - 响应模式
# 5. 电商订单处理完整流程
```

---

## ⚠️ 注意事项

1. **内存管理**: 消息历史会一直保留，定期清理或使用 `getMessageHistory()` 限制数量
2. **处理器异常**: 处理器抛出异常会导致消息状态变为 FAILED，但不会影响其他处理器
3. **队列容量**: 达到 `maxQueueSize` 后发布消息会抛出异常
4. **超时设置**: 合理设置 `messageTimeout` 避免消息长时间占用资源
5. **主题命名**: 使用清晰的层级命名，如 `service.event.type`

---

## 📁 文件结构

```
src/skills/
├── message-bus-skill.ts          # 核心实现
├── message-bus-skill.examples.ts # 使用示例
└── message-bus/
    └── README.md                 # 本文档
```

---

## 🎓 学习路径

1. **入门**: 运行 `message-bus-skill.examples.ts` 查看示例
2. **基础**: 学习 `MessageBus` 的创建和使用
3. **进阶**: 掌握 `MessageRouter` 的路由规则
4. **高级**: 使用 `PriorityMessageQueue` 实现优先级处理
5. **实战**: 参考电商订单处理示例实现业务逻辑

---

## 📞 支持

如有问题或建议，请联系 ACE 团队。

**最后更新:** 2026-03-13
