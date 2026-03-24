# 事件溯源工具使用示例

## 快速开始

### 1. 基础用法

```typescript
import { EventSourcingManager, Event } from './event-sourcing-skill';

// 创建管理器
const manager = new EventSourcingManager({
  storePath: './events.json',
  autoSave: true
});
manager.init();

// 记录事件
manager.record(
  'UserCreated',
  'user-123',
  'User',
  { name: 'Axon', email: 'axon@example.com' }
);

// 重建状态
const state = manager.rebuildState('User', 'user-123', {
  'UserCreated': (state, event) => ({
    ...state,
    name: event.data.name,
    email: event.data.email
  })
});

console.log(state);
```

### 2. 完整示例：订单系统

```typescript
import { EventSourcingManager } from './event-sourcing-skill';

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
  }),
  'OrderCancelled': (state: any, event: Event) => ({
    ...state,
    status: 'cancelled',
    cancelledAt: event.timestamp,
    reason: event.data.reason
  })
};

// 记录订单生命周期事件
manager.record('OrderCreated', 'order-001', 'Order', {
  customerId: 'cust-456',
  items: [
    { productId: 'p1', quantity: 2, price: 99 },
    { productId: 'p2', quantity: 1, price: 199 }
  ],
  total: 397
});

manager.record('OrderPaid', 'order-001', 'Order', {
  paymentMethod: 'credit_card'
});

manager.record('OrderShipped', 'order-001', 'Order', {
  trackingNumber: 'SF123456789'
});

// 重建当前状态
const current = manager.rebuildState('Order', 'order-001', orderHandlers);
console.log('当前状态:', current.state);

// 重建到付款时的状态
const atPayment = manager.getRebuilder().rebuildToVersion(
  'Order',
  'order-001',
  2,
  orderHandlers
);
console.log('付款时状态:', atPayment.state);

// 回放所有事件
manager.replay('Order', 'order-001', (event, index) => {
  console.log(`${index + 1}. ${event.type} - ${new Date(event.timestamp).toLocaleString()}`);
});
```

### 3. 高级用法：带元数据的事件

```typescript
// 记录带元数据的事件
manager.record(
  'TaskUpdated',
  'task-001',
  'Task',
  { changes: { priority: 'high' } },
  {
    userId: 'user-123',
    correlationId: 'corr-456',
    causationId: 'evt_previous_event_id',
    ipAddress: '192.168.1.1'
  }
);

// 查询特定用户的事件
const store = manager.getStore();
const allEvents = store.getAllEvents();
const userEvents = allEvents.filter(e => e.metadata?.userId === 'user-123');
```

### 4. 时间旅行调试

```typescript
// 重建到特定时间点
const timestamp = Date.now() - 3600000; // 1 小时前
const historical = manager.getRebuilder().rebuildToTimestamp(
  'Task',
  'task-001',
  timestamp,
  taskHandlers
);
console.log('1 小时前的状态:', historical.state);

// 流式回放（用于动画或调试）
await manager.getPlayer().playStream(
  'Task',
  'task-001',
  async (event) => {
    console.log(`▶️ ${event.type}`);
    await new Promise(r => setTimeout(r, 500)); // 0.5 秒间隔
  },
  500 // 延迟毫秒
);
```

### 5. 事件查询

```typescript
const store = manager.getStore();

// 获取所有事件
const allEvents = store.getAllEvents();

// 获取特定聚合根的事件
const taskEvents = store.getEvents('Task', 'task-001');

// 获取当前版本
const version = store.getVersion('Task', 'task-001');

// 按事件类型查询
const player = manager.getPlayer();
const createdEvents: Event[] = [];
player.playByType('TaskCreated', (event) => {
  createdEvents.push(event);
});

// 按时间范围查询
const today = new Date();
today.setHours(0, 0, 0, 0);
const todayEvents: Event[] = [];
player.playByTimeRange(today.getTime(), Date.now(), (event) => {
  todayEvents.push(event);
});
```

### 6. 多聚合根示例

```typescript
// 项目管理
manager.record('ProjectCreated', 'proj-001', 'Project', {
  name: 'AxonClaw',
  owner: 'KAEL'
});

// 任务管理
manager.record('TaskCreated', 'task-001', 'Task', {
  projectId: 'proj-001',
  title: '实现事件溯源'
});

// 用户管理
manager.record('UserJoined', 'user-001', 'User', {
  projectId: 'proj-001',
  role: 'developer'
});

// 分别重建不同聚合根
const project = manager.rebuildState('Project', 'proj-001', projectHandlers);
const task = manager.rebuildState('Task', 'task-001', taskHandlers);
const user = manager.rebuildState('User', 'user-001', userHandlers);
```

### 7. 运行示例

```bash
# 直接运行示例
cd /Users/nike/.openclaw/workspace
uv run ts-node src/skills/event-sourcing-skill.ts

# 或在 TypeScript 项目中导入
import { example } from './src/skills/event-sourcing-skill';
example();
```

## API 参考

### EventSourcingManager

| 方法 | 参数 | 返回值 | 描述 |
|------|------|--------|------|
| `init()` | - | void | 初始化（加载已有事件） |
| `record()` | type, aggregateId, aggregateType, data, metadata? | Event | 记录事件 |
| `rebuildState()` | aggregateType, aggregateId, handlers | ProjectionState | 重建状态 |
| `replay()` | aggregateType, aggregateId, callback | void | 回放事件 |
| `getStore()` | - | EventStoreImpl | 获取事件存储 |
| `getRebuilder()` | - | StateRebuilder | 获取状态重建器 |
| `getPlayer()` | - | EventPlayer | 获取事件回放器 |

### EventStoreImpl

| 方法 | 描述 |
|------|------|
| `append(event)` | 记录事件 |
| `getEvents(type, id)` | 获取聚合根事件 |
| `getAllEvents()` | 获取所有事件 |
| `getVersion(type, id)` | 获取当前版本 |
| `save()` | 保存到文件 |
| `load()` | 从文件加载 |
| `clear()` | 清空存储 |

### StateRebuilder

| 方法 | 描述 |
|------|------|
| `rebuild(type, id, handlers)` | 重建当前状态 |
| `rebuildToTimestamp(type, id, timestamp, handlers)` | 重建到指定时间 |
| `rebuildToVersion(type, id, version, handlers)` | 重建到指定版本 |

### EventPlayer

| 方法 | 描述 |
|------|------|
| `play(type, id, callback)` | 回放聚合根事件 |
| `playAll(callback)` | 回放所有事件 |
| `playByType(type, callback)` | 回放指定类型事件 |
| `playByTimeRange(start, end, callback)` | 回放时间范围内事件 |
| `playStream(type, id, handler, delay?)` | 流式回放 |

## 最佳实践

1. **事件命名**: 使用过去时态 (UserCreated, TaskCompleted)
2. **不可变性**: 事件一旦记录，永不修改
3. **版本控制**: 每个聚合根独立版本
4. **元数据**: 记录用户、关联 ID 等上下文
5. **快照**: 对于大量事件的聚合根，定期创建快照
6. **幂等性**: 事件处理器应该是幂等的

## 注意事项

- 事件存储文件会持续增长，定期归档旧事件
- 敏感数据不要直接存储在事件中
- 事件模式变更需要迁移策略
- 生产环境建议使用数据库而非 JSON 文件
