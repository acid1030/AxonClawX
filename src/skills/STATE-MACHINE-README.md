# 🔄 状态机技能 - State Machine Skill

**版本:** 1.0.0  
**作者:** Axon  
**创建时间:** 2026-03-13

---

## 📖 概述

状态机技能提供了一个完整的有限状态机 (FSM) 实现，支持：

- ✅ **状态定义** - 定义状态机的所有可能状态
- ✅ **状态转换** - 配置状态之间的转换规则和条件
- ✅ **事件触发** - 通过事件驱动状态转换
- ✅ **守卫函数** - 条件判断是否允许转换
- ✅ **动作钩子** - 转换执行时的副作用
- ✅ **生命周期钩子** - 进入/退出状态时的回调
- ✅ **历史记录** - 追踪状态变更历史
- ✅ **统计信息** - 监控状态机运行状态

---

## 🚀 快速开始

### 1. 基础用法

```typescript
import { StateMachine, createState, createTransition } from './state-machine-skill';

// 定义状态
const states = [
  createState('idle', { name: '空闲', initial: true }),
  createState('running', { name: '运行中' }),
  createState('completed', { name: '已完成', final: true }),
];

// 定义转换
const transitions = [
  createTransition('idle', 'START', 'running'),
  createTransition('running', 'COMPLETE', 'completed'),
];

// 创建状态机
const machine = new StateMachine({
  id: 'my-machine',
  states,
  transitions,
  initialContext: { count: 0 },
});

// 启动状态机
machine.start();

// 发送事件
await machine.send('START');
await machine.send('COMPLETE');

// 获取当前状态
console.log(machine.getCurrentState()); // 'completed'
```

### 2. 带守卫和动作的转换

```typescript
const transitions = [
  createTransition('pending', 'PAY', 'paid', {
    // 守卫：检查条件
    guard: (ctx) => ctx.amount > 0,
    
    // 动作：执行副作用
    action: (ctx, event) => {
      ctx.paidAt = Date.now();
      console.log(`支付成功：${ctx.amount}`);
    },
  }),
];
```

### 3. 状态生命周期钩子

```typescript
const states = [
  createState('active', {
    // 进入状态时执行
    onEnter: (ctx) => {
      console.log('进入活跃状态');
      startMonitoring();
    },
    
    // 退出状态时执行
    onExit: (ctx) => {
      console.log('离开活跃状态');
      stopMonitoring();
    },
    
    // 状态内事件处理
    on: {
      UPDATE: (ctx) => {
        console.log('在活跃状态内处理 UPDATE 事件');
      },
    },
  }),
];
```

---

## 📚 API 参考

### StateMachine 类

#### 构造函数

```typescript
new StateMachine<T>(config: StateMachineConfig<T>)
```

**配置参数:**

| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `id` | string | 否 | 状态机唯一标识 |
| `states` | StateDefinition[] | 是 | 状态定义列表 |
| `transitions` | TransitionDefinition[] | 是 | 转换定义列表 |
| `initialContext` | Partial<T> | 否 | 初始上下文 |
| `enableLogging` | boolean | 否 | 是否启用日志 (默认：true) |
| `strict` | boolean | 否 | 严格模式 (默认：false) |
| `onStateChange` | Function | 否 | 状态变更回调 |
| `onEvent` | Function | 否 | 事件回调 |
| `onError` | Function | 否 | 错误处理回调 |

#### 核心方法

| 方法 | 参数 | 返回值 | 描述 |
|------|------|--------|------|
| `start()` | - | void | 启动状态机 |
| `stop()` | - | void | 停止状态机 |
| `send(eventId, payload?)` | eventId: string, payload?: any | Promise<boolean> | 发送事件 |
| `getCurrentState()` | - | string \| null | 获取当前状态 ID |
| `getContext()` | - | T | 获取上下文 |
| `updateContext(updates)` | updates: Partial<T> | void | 更新上下文 |
| `getAvailableEvents()` | - | string[] | 获取可用事件列表 |
| `getHistory(limit?)` | limit?: number | StateHistoryEntry[] | 获取历史记录 |
| `getStats()` | - | StateMachineStats | 获取统计信息 |
| `getInfo()` | - | StateMachineInfo | 获取完整信息 |
| `isInState(stateId)` | stateId: string | boolean | 检查是否在指定状态 |
| `canSend(eventId)` | eventId: string | boolean | 检查是否可以触发事件 |
| `reset()` | - | void | 重置到初始状态 |

### 辅助函数

#### createState

```typescript
createState<T>(id: string, options?: Partial<StateDefinition<T>>): StateDefinition<T>
```

**选项:**

| 选项 | 类型 | 描述 |
|------|------|------|
| `name` | string | 状态名称 (可读) |
| `description` | string | 状态描述 |
| `initial` | boolean | 是否为初始状态 |
| `final` | boolean | 是否为终止状态 |
| `onEnter` | StateHook | 进入钩子 |
| `onExit` | StateHook | 退出钩子 |
| `on` | Record<string, StateHook> | 状态内事件处理 |
| `metadata` | Record<string, any> | 元数据 |

#### createTransition

```typescript
createTransition<T>(from: string, event: string, to: string, options?: Partial<TransitionDefinition<T>>): TransitionDefinition<T>
```

**选项:**

| 选项 | 类型 | 描述 |
|------|------|------|
| `guard` | TransitionGuard | 转换守卫函数 |
| `action` | TransitionAction | 转换动作函数 |
| `description` | string | 转换描述 |

#### createEvent

```typescript
createEvent<T>(id: string, payload?: any, context?: Partial<T>): StateEvent<T>
```

---

## 💡 使用场景

### 1. 订单管理

```typescript
// 订单状态流转
pending → paid → shipped → delivered
              ↓
          cancelled
```

### 2. 用户认证

```typescript
// 登录流程
logged_out → logging_in → logged_in
                 ↓              ↓
             logged_out    logged_out (logout)
                 ↑
              locked
```

### 3. 任务执行

```typescript
// 任务生命周期
idle → running → completed
         ↓     ↙     ↑
       paused   failed
         ↓
       running (resume)
```

### 4. UI 组件状态

```typescript
// 数据加载状态
idle → loading → success
            ↓        ↓
          error ←───┘ (refetch)
```

### 5. 工作流引擎

```typescript
// 审批流程
draft → submitted → reviewing → approved
                      ↓            ↓
                  rejected    completed
```

---

## 🎯 最佳实践

### 1. 使用守卫验证条件

```typescript
createTransition('paid', 'SHIP', 'shipped', {
  guard: (ctx) => {
    // 确保已支付且地址有效
    return ctx.paidAt && ctx.shippingAddress?.validated;
  },
});
```

### 2. 在动作中更新上下文

```typescript
createTransition('running', 'COMPLETE', 'completed', {
  action: (ctx, event) => {
    ctx.completedAt = Date.now();
    ctx.result = event.payload?.result;
  },
});
```

### 3. 监听状态变更

```typescript
const machine = new StateMachine({
  // ...
  onStateChange: (from, to, event) => {
    // 发送通知、记录日志、触发其他系统
    analytics.track('state_change', { from, to, event: event.id });
  },
});
```

### 4. 错误处理

```typescript
const machine = new StateMachine({
  // ...
  strict: true, // 未定义事件抛出错误
  onError: (error, event) => {
    logger.error('状态机错误', { error, event });
    alertService.notify('操作失败，请重试');
  },
});
```

### 5. 使用元数据记录额外信息

```typescript
createState('reviewing', {
  name: '审核中',
  metadata: {
    requiresApproval: true,
    timeout: 24 * 60 * 60 * 1000, // 24 小时
    notifyRoles: ['admin', 'manager'],
  },
});
```

---

## 📊 监控与调试

### 获取状态机信息

```typescript
const info = machine.getInfo();
console.log('状态机信息:', info);

// 输出:
// {
//   id: 'order-001',
//   currentState: 'shipped',
//   context: { orderId: '001', amount: 299.99, ... },
//   availableEvents: ['DELIVER', 'CANCEL'],
//   historyLength: 5,
//   stats: { ... }
// }
```

### 查看历史记录

```typescript
const history = machine.getHistory(10); // 最近 10 条
history.forEach(entry => {
  console.log(`${entry.from} → ${entry.to} (${entry.event.id})`);
});
```

### 统计信息

```typescript
const stats = machine.getStats();
console.log(`
  总状态数：${stats.totalStates}
  总转换数：${stats.totalTransitions}
  成功转换：${stats.successfulTransitions}
  失败转换：${stats.failedTransitions}
  运行时间：${stats.uptime}ms
`);
```

---

## ⚠️ 注意事项

1. **异步操作**: 钩子和动作函数支持 Promise，确保使用 `await`
2. **上下文不可变**: `getContext()` 返回副本，使用 `updateContext()` 修改
3. **严格模式**: 生产环境建议启用 `strict: true` 捕获未处理事件
4. **历史限制**: 历史记录最多保留 1000 条，超出自动裁剪
5. **状态机启动**: 创建后需调用 `start()` 才能处理事件

---

## 📝 示例代码

完整示例请查看：
- [`state-machine-skill.examples.ts`](./state-machine-skill.examples.ts)

示例包括：
- 订单状态机
- 用户认证状态机
- 任务执行状态机
- UI 组件状态机

---

## 🔧 扩展建议

1. **持久化**: 将状态和上下文保存到数据库
2. **可视化**: 使用状态图展示状态流转
3. **时间驱动**: 添加定时器和延迟转换
4. **并行状态**: 支持多个正交状态区域
5. **嵌套状态**: 支持层次化状态机 (HSM)

---

**状态机是管理复杂流程的强大工具，合理使用可以大幅提升代码的可维护性和可靠性。**
