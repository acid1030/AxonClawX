# 中介者模式专业工具 - Mediator Pattern Pro

**版本:** 1.0.0  
**作者:** Axon  
**创建时间:** 2026-03-13

---

## 📋 概述

中介者模式 (Mediator Pattern) 是一种行为设计模式，用一个中介对象来封装一系列的对象交互。中介者使各对象不需要显式地相互引用，从而使其耦合松散，而且可以独立地改变它们之间的交互。

### 核心优势

- ✅ **解耦通信** - 同事类之间零依赖
- ✅ **集中控制** - 消息路由逻辑集中管理
- ✅ **灵活扩展** - 轻松添加新的同事类和消息类型
- ✅ **可测试性** - 中介者可独立测试
- ✅ **可观察性** - 内置消息历史和日志功能

---

## 🏗️ 架构设计

```
┌─────────────────────────────────────────────────────────┐
│                     Mediator (中介者)                    │
│  ┌─────────────────────────────────────────────────┐    │
│  │  ConcreteMediator                               │    │
│  │  - 同事注册/注销管理                             │    │
│  │  - 消息路由与分发                                │    │
│  │  - 消息过滤与处理                                │    │
│  │  - 请求 - 响应模式支持                            │    │
│  │  - 消息历史追踪                                  │    │
│  └─────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
              ▲                    ▲                    ▲
              │                    │                    │
    ┌─────────┴─────────┐ ┌────────┴────────┐ ┌────────┴────────┐
    │   Colleague 1     │ │   Colleague 2   │ │   Colleague 3   │
    │  (同事类)          │ │  (同事类)        │ │  (同事类)        │
    └───────────────────┘ └─────────────────┘ └─────────────────┘
```

---

## 📦 核心组件

### 1. 中介者接口 (Mediator)

```typescript
interface Mediator {
  register(colleague: Colleague): void;           // 注册同事
  unregister(colleagueId: string): void;          // 注销同事
  send<T>(message: Omit<Message<T>, 'id' | 'timestamp'>): void;  // 发送消息
  broadcast<T>(topic: string, payload: T, senderId: string): void;  // 广播
  sendTo<T>(receiverId: string, payload: T, senderId: string): void;  // 点对点
  request<T, R>(receiverId: string, payload: T, senderId: string): Promise<R>;  // 请求 - 响应
  addHandler(topic: string, handler: MessageHandler): void;  // 添加处理器
  addFilter(filter: MessageFilter): void;         // 添加过滤器
}
```

### 2. 同事类基类 (BaseColleague)

```typescript
abstract class BaseColleague implements Colleague {
  readonly id: string;
  
  send<T>(message: Omit<Message<T>, 'id' | 'timestamp'>): void;
  broadcast<T>(topic: string, payload: T): void;
  sendTo<T>(receiverId: string, payload: T, topic: string): void;
  request<T, R>(receiverId: string, payload: T): Promise<R>;
  abstract receive<T>(message: Message<T>): void;
}
```

### 3. 消息类型 (MessageType)

```typescript
enum MessageType {
  BROADCAST = 'broadcast',           // 广播消息
  UNICAST = 'unicast',               // 点对点消息
  REQUEST_RESPONSE = 'request_response',  // 请求 - 响应
  EVENT = 'event',                   // 事件通知
  COMMAND = 'command'                // 命令消息
}
```

### 4. 消息优先级 (MessagePriority)

```typescript
enum MessagePriority {
  LOW = 0,      // 低优先级
  NORMAL = 1,   // 普通优先级
  HIGH = 2,     // 高优先级
  URGENT = 3    // 紧急优先级
}
```

---

## 🚀 快速开始

### 基础用法

```typescript
import { ConcreteMediator, BaseColleague, MessageType } from './mediator-pattern-pro-skill';

// 1. 创建中介者
const mediator = new ConcreteMediator({
  enableLogging: true,
  enableHistory: true
});

// 2. 定义同事类
class MyColleague extends BaseColleague {
  receive<T>(message: Message<T>): void {
    console.log(`[${this.id}] 收到消息:`, message.payload);
  }
}

// 3. 创建并注册同事
const colleague1 = new MyColleague('colleague_1');
const colleague2 = new MyColleague('colleague_2');

mediator.register(colleague1);
mediator.register(colleague2);

// 4. 发送消息
colleague1.broadcast('chat', { content: '大家好！' });
colleague1.sendTo('colleague_2', { content: '嘿，在吗？' }, 'private');

// 5. 请求 - 响应
const response = await colleague1.request('colleague_2', { query: 'data' });
```

---

## 📖 使用场景

### 场景 1: 聊天室系统

```typescript
class ChatUser extends BaseColleague {
  receive<T>(message: Message<T>): void {
    if (message.topic === 'chat') {
      console.log(`[${this.id}] ${message.payload.content}`);
    }
  }

  sendMessage(content: string) {
    this.broadcast('chat', { content, timestamp: Date.now() });
  }
}

// 使用
const mediator = new ConcreteMediator();
const user1 = new ChatUser('alice');
const user2 = new ChatUser('bob');

mediator.register(user1);
mediator.register(user2);

user1.sendMessage('Hello, Bob!');  // Bob 会收到
```

### 场景 2: 微服务通信

```typescript
class Microservice extends BaseColleague {
  receive<T>(message: Message<T>): void {
    if (message.metadata?.isRequest) {
      const { action, params } = message.payload as any;
      
      switch (action) {
        case 'createOrder':
          this.sendResponse(message, { orderId: '123' });
          break;
        case 'processPayment':
          this.sendResponse(message, { transactionId: 'TXN_456' });
          break;
      }
    }
  }

  async callService(serviceId: string, action: string, params: any) {
    return await this.request(serviceId, { action, params });
  }
}

// 使用
const orderService = new Microservice('order_svc', 'OrderService');
const paymentService = new Microservice('payment_svc', 'PaymentService');

mediator.register(orderService);
mediator.register(paymentService);

// 订单服务调用支付服务
const result = await orderService.callService('payment_svc', 'processPayment', {
  amount: 99.99
});
```

### 场景 3: 事件总线

```typescript
// 创建中介者
const eventBus = new ConcreteMediator();

// 添加事件处理器
eventBus.addHandler('user.login', {
  handle: (msg) => console.log('用户登录:', msg.payload)
});

eventBus.addHandler('user.logout', {
  handle: (msg) => console.log('用户登出:', msg.payload)
});

// 发布事件
eventBus.broadcast('user.login', { userId: '123', ip: '192.168.1.1' });
```

### 场景 4: 消息过滤

```typescript
// 只允许特定主题的消息
mediator.addFilter(new TopicFilter(['important', 'alert']));

// 只允许高优先级消息
mediator.addFilter(new PriorityFilter(MessagePriority.HIGH));

// 发送者白名单
mediator.addFilter(new SenderWhitelistFilter(['admin_1', 'admin_2']));

// 组合使用多个过滤器
mediator.addFilter(new TopicFilter(['alert']));
mediator.addFilter(new PriorityFilter(MessagePriority.URGENT));
```

---

## 🔧 高级功能

### 自定义消息处理器

```typescript
class StatisticsHandler implements MessageHandler {
  private stats = { total: 0, byTopic: new Map() };

  handle(message: Message): void {
    this.stats.total++;
    const count = this.stats.byTopic.get(message.topic) || 0;
    this.stats.byTopic.set(message.topic, count + 1);
  }

  getStatistics() {
    return this.stats;
  }
}

// 使用
const statsHandler = new StatisticsHandler();
mediator.addHandler('*', statsHandler);
```

### 自定义消息过滤器

```typescript
class CustomFilter implements MessageFilter {
  filter(message: Message): boolean {
    // 自定义过滤逻辑
    return message.payload?.validated === true;
  }
}

// 使用
mediator.addFilter(new CustomFilter());
```

### 消息历史查询

```typescript
// 获取最近 100 条消息
const history = mediator.getMessageHistory(100);

// 按条件筛选
const importantMessages = history.filter(
  msg => msg.topic === 'alert' && msg.priority >= MessagePriority.HIGH
);

// 清空历史
mediator.clearHistory();
```

---

## ⚙️ 配置选项

```typescript
const mediator = new ConcreteMediator({
  enableHistory: true,        // 是否启用消息历史
  maxHistorySize: 1000,       // 消息历史最大长度
  enableLogging: false,       // 是否启用日志
  defaultRequestTimeout: 5000, // 默认请求超时 (毫秒)
  asyncProcessing: true       // 是否异步处理消息
});
```

---

## 📊 API 参考

### Mediator 方法

| 方法 | 描述 | 参数 | 返回值 |
|------|------|------|--------|
| `register` | 注册同事 | colleague: Colleague | void |
| `unregister` | 注销同事 | colleagueId: string | void |
| `send` | 发送消息 | message: Message | void |
| `broadcast` | 广播消息 | topic, payload, senderId | void |
| `sendTo` | 点对点发送 | receiverId, payload, senderId, topic? | void |
| `request` | 请求 - 响应 | receiverId, payload, senderId, timeout? | Promise\<R\> |
| `addHandler` | 添加处理器 | topic, handler | void |
| `removeHandler` | 移除处理器 | topic, handler | void |
| `addFilter` | 添加过滤器 | filter: MessageFilter | void |
| `removeFilter` | 移除过滤器 | filter: MessageFilter | void |
| `getColleagues` | 获取所有同事 | - | Colleague[] |
| `getColleagueCount` | 获取同事数量 | - | number |
| `getMessageHistory` | 获取消息历史 | limit?: number | Message[] |
| `clearHistory` | 清空消息历史 | - | void |

### BaseColleague 方法

| 方法 | 描述 | 参数 | 返回值 |
|------|------|------|--------|
| `send` | 发送消息 | message | void |
| `broadcast` | 广播消息 | topic, payload | void |
| `sendTo` | 点对点发送 | receiverId, payload, topic? | void |
| `request` | 请求 - 响应 | receiverId, payload, timeout? | Promise\<R\> |
| `sendResponse` | 发送响应 | originalMessage, response | void |
| `sendErrorResponse` | 发送错误响应 | originalMessage, error | void |
| `receive` | 接收消息 (抽象) | message | void |

---

## 🧪 运行示例

```bash
# 运行所有示例
cd /Users/nike/.openclaw/workspace
npx ts-node src/skills/mediator-pattern-examples.ts

# 或运行单个示例
npx ts-node -e "
  import { example1_chatRoom } from './src/skills/mediator-pattern-examples';
  example1_chatRoom();
"
```

---

## 📁 文件结构

```
src/skills/
├── mediator-pattern-pro-skill.ts    # 核心实现
├── mediator-pattern-examples.ts     # 使用示例
└── MEDIATOR-PATTERN-README.md       # 本文档
```

---

## 🎯 最佳实践

### ✅ 推荐做法

1. **使用基类** - 继承 `BaseColleague` 而非直接实现接口
2. **主题命名** - 使用有意义的主题名 (如 `user.login`, `order.created`)
3. **错误处理** - 在 `receive` 方法中捕获异常
4. **消息验证** - 在处理器中验证消息格式
5. **日志记录** - 开发时启用 `enableLogging`

### ❌ 避免做法

1. **循环依赖** - 同事类不应直接引用其他同事
2. **过度过滤** - 避免添加过多过滤器影响性能
3. **大消息体** - 消息 payload 应保持精简
4. **同步阻塞** - 避免在 `receive` 中执行耗时操作

---

## 🔍 调试技巧

```typescript
// 1. 启用日志
const mediator = new ConcreteMediator({ enableLogging: true });

// 2. 查看消息历史
const history = mediator.getMessageHistory();
console.log('最近消息:', history);

// 3. 查看注册的同事
console.log('同事列表:', mediator.getColleagues().map(c => c.id));

// 4. 添加全局日志处理器
mediator.addHandler('*', new LoggingHandler('[全局]'));
```

---

## 📝 更新日志

### v1.0.0 (2026-03-13)

- ✅ 初始版本发布
- ✅ 中介者核心实现
- ✅ 同事类基类
- ✅ 5 种消息类型支持
- ✅ 消息过滤器系统
- ✅ 消息处理器系统
- ✅ 请求 - 响应模式
- ✅ 消息历史追踪
- ✅ 完整使用示例

---

## 📞 支持

如有问题或建议，请联系 Axon 团队。

---

_此文档由 Axon 自动生成 · 2026-03-13_
