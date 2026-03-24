# 工作单元技能 - Unit of Work Skill

**作者:** KAEL  
**版本:** 1.0.0  
**创建时间:** 2026-03-13

---

## 📋 功能概述

工作单元 (Unit of Work) 模式实现，用于管理业务事务中的所有变更，确保数据一致性。

### 核心功能

1. **工作单元** - 跟踪业务事务中的所有变更
2. **事务提交** - 原子性提交所有变更
3. **事务回滚** - 失败时回滚到初始状态

---

## 🚀 快速开始

### 安装

无需额外安装，直接使用：

```typescript
import { createUnitOfWork, UnitOfWork } from './src/skills/unit-of-work-skill';
```

### 基本用法

```typescript
// 1. 创建工作单元
const uow = createUnitOfWork({
  name: 'UserRegistration',
  autoRollback: true,
});

// 2. 注册变更
uow.registerNew('users', 'user_001', {
  username: 'alice',
  email: 'alice@example.com',
});

uow.registerUpdate('inventory', 'item_001',
  { quantity: 10 },
  { quantity: 9 }
);

// 3. 提交事务
await uow.commit();

// 或回滚
await uow.rollback();
```

---

## 📖 API 文档

### 创建方式

#### createUnitOfWork(config?)

```typescript
import { createUnitOfWork } from './unit-of-work-skill';

const uow = createUnitOfWork({
  name: 'MyTransaction',           // 事务名称
  enableTracking: true,             // 启用变更追踪
  autoRollback: true,               // 失败时自动回滚
  beforeCommit: (changes) => {},    // 提交前钩子
  afterCommit: (changes) => {},     // 提交后钩子
  beforeRollback: (changes) => {},  // 回滚前钩子
  afterRollback: (changes) => {},   // 回滚后钩子
  validateChange: (change) => true, // 变更验证函数
});
```

### 变更注册方法

#### registerNew(entityType, entityId, data)

注册新增操作

```typescript
uow.registerNew('users', 'user_001', {
  username: 'alice',
  email: 'alice@example.com',
});
```

#### registerUpdate(entityType, entityId, originalData, newData)

注册更新操作

```typescript
uow.registerUpdate('accounts', 'acc_001',
  { balance: 1000 },  // 原始数据
  { balance: 900 }    // 新数据
);
```

#### registerDelete(entityType, entityId, originalData)

注册删除操作

```typescript
uow.registerDelete('users', 'user_001', {
  id: 'user_001',
  username: 'alice',
});
```

### 事务控制方法

#### commit()

提交所有变更

```typescript
try {
  await uow.commit();
  console.log('事务提交成功');
} catch (error) {
  console.log('提交失败，已自动回滚');
}
```

#### rollback()

回滚所有未提交的变更

```typescript
await uow.rollback();
```

#### clear()

清除所有变更，重置状态

```typescript
uow.clear();
```

### 状态查询

#### state

获取当前状态

```typescript
console.log(uow.state);
// 'IDLE' | 'IN_PROGRESS' | 'COMMITTED' | 'ROLLED_BACK'
```

#### getChanges()

获取所有变更历史

```typescript
const changes = uow.getChanges();
changes.forEach(change => {
  console.log(`${change.type} ${change.entityType}:${change.entityId}`);
});
```

#### getStats()

获取统计信息

```typescript
const stats = uow.getStats();
console.log(stats);
// { createCount: 2, updateCount: 1, deleteCount: 0, totalCount: 3 }
```

### 高级功能

#### 快照 (嵌套事务)

```typescript
// 创建快照
const snapshotId = uow.createSnapshot();

try {
  // 执行一些操作
  uow.registerNew('child', 'c1', { name: 'Child' });
  
  // 可能失败的操作
  throw new Error('失败');
} catch (error) {
  // 回滚到快照
  uow.restoreSnapshot(snapshotId);
}
```

#### 事务装饰器

```typescript
import { withTransaction } from './unit-of-work-skill';

const transferMoney = withTransaction(
  async (fromId, toId, amount, uow) => {
    uow.registerUpdate('accounts', fromId,
      { balance: 1000 },
      { balance: 1000 - amount }
    );
    uow.registerUpdate('accounts', toId,
      { balance: 500 },
      { balance: 500 + amount }
    );
  },
  { name: 'MoneyTransfer' }
);

await transferMoney('acc_001', 'acc_002', 100);
```

#### 变更验证

```typescript
const uow = createUnitOfWork({
  validateChange: (change) => {
    // 不允许删除审计日志
    if (change.type === 'DELETE' && change.entityType === 'audit_logs') {
      return '禁止删除审计日志';
    }
    return true;
  },
});
```

---

## 📝 使用场景

### 1. 用户注册

```typescript
const uow = createUnitOfWork({ name: 'UserRegistration' });

uow.registerNew('users', userId, userData);
uow.registerNew('user_profiles', profileId, profileData);
uow.registerNew('notification_settings', notifId, notifData);

await uow.commit();
```

### 2. 订单处理

```typescript
const uow = createUnitOfWork({ 
  name: 'OrderProcessing',
  autoRollback: true,
});

uow.registerNew('orders', orderId, orderData);
uow.registerUpdate('inventory', productId, oldInv, newInv);
uow.registerUpdate('user_points', userId, oldPoints, newPoints);

await uow.commit();
```

### 3. 批量数据导入

```typescript
const uow = createUnitOfWork({ name: 'BatchImport' });

products.forEach(product => {
  uow.registerNew('products', product.id, product);
  uow.registerNew('inventory', product.id, { productId: product.id, quantity: product.stock });
});

await uow.commit();
```

### 4. 资金转账

```typescript
const transferMoney = withTransaction(
  async (fromId, toId, amount, uow) => {
    uow.registerUpdate('accounts', fromId, fromAcc, { ...fromAcc, balance: fromAcc.balance - amount });
    uow.registerUpdate('accounts', toId, toAcc, { ...toAcc, balance: toAcc.balance + amount });
    uow.registerNew('transactions', txId, { fromId, toId, amount });
  },
  { name: 'MoneyTransfer' }
);

await transferMoney('acc_001', 'acc_002', 100);
```

---

## 🎯 最佳实践

### ✅ 推荐做法

1. **始终使用 autoRollback** - 确保失败时自动清理
2. **添加变更验证** - 在业务层面验证变更合法性
3. **使用钩子函数** - 记录日志、发送通知等
4. **合理命名事务** - 便于追踪和调试
5. **及时提交或回滚** - 避免长时间持有事务

### ❌ 避免做法

1. **不要跨事务共享变更** - 每个事务应该独立
2. **不要在提交后修改变更** - 提交后变更不可变
3. **不要忽略错误处理** - 始终捕获并处理异常
4. **不要过度使用嵌套事务** - 保持事务扁平化

---

## 📊 状态流转

```
IDLE → IN_PROGRESS → COMMITTED
                  ↘
                   ROLLED_BACK
```

- **IDLE**: 初始状态，无变更
- **IN_PROGRESS**: 已注册变更，等待提交
- **COMMITTED**: 已成功提交
- **ROLLED_BACK**: 已回滚

---

## 📁 文件结构

```
src/skills/
├── unit-of-work-skill.ts          # 核心实现
├── unit-of-work-skill.examples.ts # 使用示例
└── unit-of-work-skill/
    └── README.md                  # 本文档
```

---

## 🧪 运行示例

```bash
cd /Users/nike/.openclaw/workspace
npx ts-node src/skills/unit-of-work-skill.examples.ts
```

---

## 📝 更新日志

### v1.0.0 (2026-03-13)

- ✅ 初始版本发布
- ✅ 工作单元核心功能
- ✅ 事务提交/回滚
- ✅ 变更追踪
- ✅ 快照功能
- ✅ 事务装饰器
- ✅ 变更验证
- ✅ 完整示例代码

---

**KAEL** - 工程总管
