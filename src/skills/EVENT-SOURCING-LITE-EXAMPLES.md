# 事件溯源轻量工具 - 使用示例

**文件:** `src/skills/event-sourcing-lite-skill.ts`  
**作者:** KAEL  
**版本:** 1.0.0

---

## 快速开始

### 1. 导入模块

```typescript
import { createEventStore, EventStoreLiteImpl, LiteEvent } from './event-sourcing-lite-skill';
```

---

## 功能演示

### 功能 1: 事件追加 (Append)

```typescript
// 创建事件存储实例
const store = createEventStore();

// 追加事件
const userCreated = store.append(
  'UserCreated',           // 事件类型
  'user-123',              // 聚合根 ID
  {                        // 事件数据
    username: 'john',
    email: 'john@example.com',
    age: 25
  },
  {                        // 可选元数据
    userId: 'admin-001',
    requestId: 'req-xyz'
  }
);

console.log('事件已创建:', userCreated);
// 输出:
// {
//   id: "1710334800000-abc123def",
//   type: "UserCreated",
//   aggregateId: "user-123",
//   timestamp: 1710334800000,
//   data: { username: 'john', email: 'john@example.com', age: 25 },
//   metadata: { userId: 'admin-001', requestId: 'req-xyz' }
// }

// 继续追加事件
store.append('UserEmailUpdated', 'user-123', {
  newEmail: 'john.new@example.com',
  reason: '用户主动修改'
});

store.append('UserAgeUpdated', 'user-123', {
  newAge: 26,
  reason: '生日'
});
```

---

### 功能 2: 事件回放 (Replay)

```typescript
// 回放所有事件
const allEvents = store.replay('user-123');
console.log(`总共 ${allEvents.length} 个事件`);

allEvents.forEach(event => {
  console.log(`[${event.type}]`, event.data);
});

// 输出:
// [UserCreated] { username: 'john', email: 'john@example.com', age: 25 }
// [UserEmailUpdated] { newEmail: 'john.new@example.com', reason: '用户主动修改' }
// [UserAgeUpdated] { newAge: 26, reason: '生日' }

// 获取所有聚合根的事件
const allAggregateEvents = store.getAllEvents();
console.log(`系统总共 ${allAggregateEvents.length} 个事件`);
```

---

### 功能 3: 快照管理 (Snapshot Management)

```typescript
// 创建快照 (在事件数量较多时优化性能)
store.createSnapshot(
  'user-123',              // 聚合根 ID
  {                        // 当前状态
    id: 'user-123',
    username: 'john',
    email: 'john.new@example.com',
    age: 26,
    version: 3
  },
  3                        // 版本号
);

// 获取快照
const snapshot = store.getSnapshot('user-123');
console.log('快照版本:', snapshot?.version);
console.log('快照状态:', snapshot?.state);

// 删除快照
store.deleteSnapshot('user-123');
console.log('快照已删除');
```

---

## 高级用法

### 状态重建 (State Rebuild)

```typescript
// 定义状态归约函数
interface UserState {
  id: string;
  username?: string;
  email?: string;
  age?: number;
  version: number;
}

const userReducer = (state: UserState, event: LiteEvent): UserState => {
  switch (event.type) {
    case 'UserCreated':
      return {
        ...state,
        username: event.data.username,
        email: event.data.email,
        age: event.data.age,
        version: state.version + 1
      };
    
    case 'UserEmailUpdated':
      return {
        ...state,
        email: event.data.newEmail,
        version: state.version + 1
      };
    
    case 'UserAgeUpdated':
      return {
        ...state,
        age: event.data.newAge,
        version: state.version + 1
      };
    
    default:
      return state;
  }
};

// 重建状态 (自动使用快照 + 事件回放)
const currentState = store.rebuildState<UserState>(
  'user-123',
  userReducer,
  { id: 'user-123', version: 0 }  // 初始状态
);

console.log('重建后的状态:', currentState);
// 输出:
// {
//   id: 'user-123',
//   username: 'john',
//   email: 'john.new@example.com',
//   age: 26,
//   version: 3
// }
```

---

### 数据持久化

```typescript
// 导出数据
const exported = store.export();
console.log(`导出 ${exported.events.length} 个事件`);

// 保存到文件 (Node.js 环境)
import * as fs from 'fs';
fs.writeFileSync(
  'event-store.json',
  JSON.stringify({
    events: exported.events,
    snapshots: Array.from(exported.snapshots.entries())
  }, null, 2)
);

// 从文件导入
const imported = JSON.parse(fs.readFileSync('event-store.json', 'utf-8'));
const newStore = createEventStore();
newStore.import({
  events: imported.events,
  snapshots: new Map(imported.snapshots)
});

console.log(`导入 ${newStore.getEventCount()} 个事件`);
```

---

### 多聚合根示例

```typescript
// 订单聚合根
store.append('OrderCreated', 'order-456', {
  orderId: 'order-456',
  userId: 'user-123',
  items: [
    { productId: 'p1', quantity: 2 },
    { productId: 'p2', quantity: 1 }
  ],
  total: 299.99
});

store.append('OrderPaid', 'order-456', {
  paymentMethod: 'alipay',
  transactionId: 'txn-789'
});

store.append('OrderShipped', 'order-456', {
  trackingNumber: 'SF123456789',
  carrier: '顺丰速运'
});

// 商品聚合根
store.append('ProductCreated', 'product-789', {
  name: '无线鼠标',
  price: 99.99,
  stock: 1000
});

store.append('StockUpdated', 'product-789', {
  change: -2,
  reason: '订单扣减'
});

// 分别回放不同聚合根的事件
const orderEvents = store.replay('order-456');
const productEvents = store.replay('product-789');

console.log(`订单事件：${orderEvents.length} 个`);
console.log(`商品事件：${productEvents.length} 个`);
```

---

## 完整示例

```typescript
import { createEventStore, LiteEvent } from './event-sourcing-lite-skill';

// 1. 创建事件存储
const store = createEventStore();

// 2. 记录用户生命周期事件
store.append('UserRegistered', 'user-001', {
  email: 'alice@example.com',
  plan: 'premium'
});

store.append('SubscriptionActivated', 'user-001', {
  plan: 'premium',
  duration: '12 months'
});

store.append('ProfileUpdated', 'user-001', {
  displayName: 'Alice Wang'
});

// 3. 创建快照优化性能
store.createSnapshot('user-001', {
  email: 'alice@example.com',
  plan: 'premium',
  displayName: 'Alice Wang',
  status: 'active'
}, 3);

// 4. 继续记录事件
store.append('LoginSuccessful', 'user-001', {
  ip: '192.168.1.100',
  device: 'Chrome on macOS'
});

// 5. 回放事件
const events = store.replay('user-001');
console.log('用户事件流:');
events.forEach(e => console.log(`  - ${e.type}: ${JSON.stringify(e.data)}`));

// 6. 统计信息
console.log(`\n统计:`);
console.log(`  总事件数：${store.getEventCount()}`);
console.log(`  快照数：${store.getSnapshotCount()}`);
```

---

## API 参考

### EventStoreLiteImpl

| 方法 | 参数 | 返回值 | 描述 |
|------|------|--------|------|
| `append` | `type, aggregateId, data, metadata?` | `LiteEvent` | 追加事件 |
| `replay` | `aggregateId, fromVersion?` | `LiteEvent[]` | 回放事件 |
| `getAllEvents` | - | `LiteEvent[]` | 获取所有事件 |
| `createSnapshot` | `aggregateId, state, version` | `Snapshot` | 创建快照 |
| `getSnapshot` | `aggregateId` | `Snapshot \| undefined` | 获取快照 |
| `deleteSnapshot` | `aggregateId` | `boolean` | 删除快照 |
| `rebuildState` | `aggregateId, reducer, initialState` | `T` | 重建状态 |
| `export` | - | `EventStoreLite` | 导出数据 |
| `import` | `data` | `void` | 导入数据 |
| `clear` | - | `void` | 清空存储 |
| `getEventCount` | - | `number` | 事件数量 |
| `getSnapshotCount` | - | `number` | 快照数量 |

---

## 最佳实践

1. **事件命名**: 使用过去时态 (UserCreated, OrderUpdated)
2. **事件不可变**: 事件一旦创建就不应修改
3. **快照策略**: 每 N 个事件创建一个快照 (建议 50-100)
4. **元数据**: 记录 userId、requestId 等追踪信息
5. **状态重建**: 使用纯函数作为 reducer

---

**完成时间:** < 5 分钟  
**交付物:** `src/skills/event-sourcing-lite-skill.ts` + 使用示例
