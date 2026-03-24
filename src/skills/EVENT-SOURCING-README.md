# 事件溯源工具 (Event Sourcing Skill)

**作者:** KAEL  
**版本:** 1.0.0  
**完成时间:** 2026-03-13 20:18

---

## 📦 功能概述

事件溯源 (Event Sourcing) 是一种架构模式，通过记录所有状态变更事件来重建系统状态。

### 核心功能

| 功能 | 描述 |
|------|------|
| **事件记录** | 不可变地记录所有状态变更事件 |
| **状态重建** | 通过重放事件重建任意时间点的状态 |
| **事件回放** | 支持流式回放、时间范围查询、类型过滤 |

---

## 🚀 快速开始

### 1. 安装

```bash
# 无需额外依赖，使用 Node.js 原生模块
```

### 2. 基础使用

```typescript
import { EventSourcingManager } from './event-sourcing-skill';

// 创建管理器
const manager = new EventSourcingManager({
  storePath: './events.json',
  autoSave: true
});
manager.init();

// 记录事件
manager.record(
  'UserCreated',
  'user-001',
  'User',
  { name: 'Axon', email: 'axon@example.com' }
);

// 重建状态
const state = manager.rebuildState('User', 'user-001', {
  'UserCreated': (state, event) => ({
    ...state,
    name: event.data.name,
    email: event.data.email
  })
});

console.log(state);
```

---

## 📖 API 文档

### EventSourcingManager

主入口类，提供完整的事件溯源功能。

#### 构造函数

```typescript
new EventSourcingManager(config?: EventSourcingConfig)
```

**配置参数:**

| 参数 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| `storePath` | string | `'./event-store.json'` | 事件存储文件路径 |
| `autoSave` | boolean | `true` | 是否自动保存 |
| `snapshotInterval` | number | `100` | 快照间隔（事件数） |

#### 方法

##### `init(): void`

初始化事件存储，从文件加载已有事件。

```typescript
manager.init();
```

---

##### `record(type, aggregateId, aggregateType, data, metadata?): Event`

记录一个新事件。

**参数:**

| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `type` | string | ✅ | 事件类型 (如 'UserCreated') |
| `aggregateId` | string | ✅ | 聚合根 ID |
| `aggregateType` | string | ✅ | 聚合根类型 |
| `data` | Record<string, any> | ✅ | 事件数据 |
| `metadata` | object | ❌ | 元数据 (userId, correlationId 等) |

**返回值:** `Event` - 创建的完整事件对象

**示例:**

```typescript
const event = manager.record(
  'TaskCompleted',
  'task-001',
  'Task',
  { completedAt: new Date().toISOString() },
  { userId: 'user-123', correlationId: 'corr-456' }
);
```

---

##### `rebuildState(aggregateType, aggregateId, handlers): ProjectionState`

重建聚合根的当前状态。

**参数:**

| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `aggregateType` | string | ✅ | 聚合根类型 |
| `aggregateId` | string | ✅ | 聚合根 ID |
| `handlers` | Record<string, Function> | ✅ | 事件处理器映射 |

**返回值:** `ProjectionState` - 包含状态和版本信息

**示例:**

```typescript
const taskHandlers = {
  'TaskCreated': (state, event) => ({
    ...state,
    title: event.data.title,
    status: 'pending'
  }),
  'TaskCompleted': (state, event) => ({
    ...state,
    status: 'completed'
  })
};

const result = manager.rebuildState('Task', 'task-001', taskHandlers);
console.log(result.state); // 当前状态
console.log(result.version); // 当前版本
```

---

##### `replay(aggregateType, aggregateId, callback): void`

回放聚合根的所有事件。

**参数:**

| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `aggregateType` | string | ✅ | 聚合根类型 |
| `aggregateId` | string | ✅ | 聚合根 ID |
| `callback` | Function | ✅ | 回调函数 (event, index) => void |

**示例:**

```typescript
manager.replay('Task', 'task-001', (event, index) => {
  console.log(`${index + 1}. ${event.type} @ ${new Date(event.timestamp).toLocaleString()}`);
});
```

---

##### `getStore(): EventStoreImpl`

获取底层事件存储实例。

---

##### `getRebuilder(): StateRebuilder`

获取状态重建器实例（支持高级重建功能）。

---

##### `getPlayer(): EventPlayer`

获取事件回放器实例（支持高级回放功能）。

---

### StateRebuilder

高级状态重建功能。

#### `rebuildToTimestamp(aggregateType, aggregateId, timestamp, handlers): ProjectionState`

重建到指定时间点的状态。

```typescript
const oneHourAgo = Date.now() - 3600000;
const historical = manager.getRebuilder().rebuildToTimestamp(
  'Task',
  'task-001',
  oneHourAgo,
  taskHandlers
);
```

#### `rebuildToVersion(aggregateType, aggregateId, version, handlers): ProjectionState`

重建到指定版本的状态。

```typescript
const v2State = manager.getRebuilder().rebuildToVersion(
  'Task',
  'task-001',
  2,
  taskHandlers
);
```

---

### EventPlayer

高级事件回放功能。

#### `playAll(callback): void`

回放所有事件。

```typescript
manager.getPlayer().playAll(event => {
  console.log(event.type);
});
```

#### `playByType(eventType, callback): void`

回放指定类型的事件。

```typescript
manager.getPlayer().playByType('TaskCreated', event => {
  console.log('新任务:', event.data.title);
});
```

#### `playByTimeRange(startTime, endTime, callback): void`

回放指定时间范围内的事件。

```typescript
const today = new Date();
today.setHours(0, 0, 0, 0);
manager.getPlayer().playByTimeRange(today.getTime(), Date.now(), event => {
  console.log('今日事件:', event.type);
});
```

#### `playStream(aggregateType, aggregateId, handler, delayMs?): Promise<void>`

流式回放事件（支持延迟，用于动画或调试）。

```typescript
await manager.getPlayer().playStream(
  'Task',
  'task-001',
  async (event) => {
    console.log(`▶️ ${event.type}`);
    await new Promise(r => setTimeout(r, 500));
  },
  500 // 500ms 间隔
);
```

---

## 📝 完整示例

### 订单管理系统

```typescript
import { EventSourcingManager, Event } from './event-sourcing-skill';

const manager = new EventSourcingManager();
manager.init();

// 定义订单事件处理器
const orderHandlers = {
  'OrderCreated': (state: any, event: Event) => ({
    ...state,
    customerId: event.data.customerId,
    items: event.data.items,
    total: event.data.total,
    status: 'created',
    createdAt: event.timestamp
  }),
  'OrderPaid': (state: any, event: Event) => ({
    ...state,
    status: 'paid',
    paidAt: event.timestamp,
    paymentMethod: event.data.paymentMethod
  }),
  'OrderShipped': (state: any, event: Event) => ({
    ...state,
    status: 'shipped',
    shippedAt: event.timestamp,
    trackingNumber: event.data.trackingNumber
  }),
  'OrderDelivered': (state: any, event: Event) => ({
    ...state,
    status: 'delivered',
    deliveredAt: event.timestamp
  })
};

// 记录订单生命周期
manager.record('OrderCreated', 'order-001', 'Order', {
  customerId: 'cust-456',
  items: [{ productId: 'p1', quantity: 2, price: 99 }],
  total: 198
});

manager.record('OrderPaid', 'order-001', 'Order', {
  paymentMethod: 'credit_card'
});

manager.record('OrderShipped', 'order-001', 'Order', {
  trackingNumber: 'SF123456789'
});

manager.record('OrderDelivered', 'order-001', 'Order', {});

// 查询当前状态
const current = manager.rebuildState('Order', 'order-001', orderHandlers);
console.log('当前状态:', current.state.status); // 'delivered'

// 查询发货时状态
const atShipping = manager.getRebuilder().rebuildToVersion(
  'Order',
  'order-001',
  3,
  orderHandlers
);
console.log('发货时状态:', atShipping.state.status); // 'shipped'

// 回放事件历史
manager.replay('Order', 'order-001', (event, i) => {
  console.log(`${i + 1}. ${event.type}`);
});
```

---

## 🎯 最佳实践

### 1. 事件命名规范

使用**过去时态**命名事件：

```typescript
✅ UserCreated
✅ TaskCompleted
✅ OrderShipped

❌ CreateUser
❌ CompleteTask
❌ ShipOrder
```

### 2. 事件不可变性

事件一旦记录，**永不修改**：

```typescript
// ❌ 错误：不要修改已记录的事件
event.data.price = 100;

// ✅ 正确：记录新事件进行修正
manager.record('PriceCorrected', orderId, 'Order', {
  oldPrice: 99,
  newPrice: 100,
  reason: '定价错误'
});
```

### 3. 元数据使用

记录上下文信息：

```typescript
manager.record(
  'TaskUpdated',
  'task-001',
  'Task',
  { changes: { priority: 'high' } },
  {
    userId: 'user-123',
    correlationId: 'corr-456',
    causationId: 'previous-event-id',
    ipAddress: '192.168.1.1'
  }
);
```

### 4. 事件处理器幂等性

确保处理器是幂等的：

```typescript
// ✅ 好的处理器
'TaskAssigned': (state, event) => ({
  ...state,
  assignee: event.data.assignee,
  assignedAt: event.timestamp
})

// ❌ 避免副作用
'TaskAssigned': (state, event) => {
  sendEmail(event.data.assignee); // 副作用！
  return { ...state, assignee: event.data.assignee };
}
```

### 5. 快照优化

对于大量事件的聚合根，定期创建快照：

```typescript
const manager = new EventSourcingManager({
  snapshotInterval: 100 // 每 100 个事件创建快照
});
```

---

## ⚠️ 注意事项

1. **存储增长**: 事件存储会持续增长，定期归档旧事件
2. **敏感数据**: 不要在事件中存储密码等敏感信息
3. **模式变更**: 事件模式变更需要迁移策略
4. **生产环境**: 建议使用数据库而非 JSON 文件存储

---

## 📂 文件结构

```
src/skills/
├── event-sourcing-skill.ts    # 核心实现
├── EXAMPLES.md                # 使用示例
└── EVENT-SOURCING-README.md   # 本文档
```

---

## 🧪 测试

```typescript
import { EventSourcingManager } from './event-sourcing-skill';

// 单元测试示例
describe('EventSourcingManager', () => {
  let manager: EventSourcingManager;

  beforeEach(() => {
    manager = new EventSourcingManager({ autoSave: false });
  });

  it('should record and rebuild events', () => {
    manager.record('TaskCreated', 'task-001', 'Task', { title: 'Test' });
    
    const state = manager.rebuildState('Task', 'task-001', {
      'TaskCreated': (s, e) => ({ ...s, title: e.data.title })
    });

    expect(state.state.title).toBe('Test');
    expect(state.version).toBe(1);
  });
});
```

---

## 📚 参考资料

- [Martin Fowler - Event Sourcing](https://martinfowler.com/eaaDev/EventSourcing.html)
- [Greg Young - CQRS and Event Sourcing](https://www.youtube.com/watch?v=JHGkaShoyNs)
- [Event Sourcing Pattern](https://microservices.io/patterns/data/event-sourcing.html)

---

**交付完成** ✅  
**用时:** < 5 分钟
