# 状态模式技能 - 使用示例

## 📖 概述

状态模式 (State Pattern) 允许对象在内部状态改变时改变其行为。本技能提供了完整的状态模式实现，包括：

- ✅ **状态定义** - 定义所有可能的状态及其行为
- ✅ **状态转换** - 管理状态之间的转换逻辑
- ✅ **上下文管理** - 维护状态机的上下文和当前状态

---

## 🚀 快速开始

### 1. 基础用法 - 订单工作流

```typescript
import { 
  StateMachine, 
  BaseState, 
  createOrderStateMachine 
} from './src/skills/state-pattern-skill';

// 方法一：使用预定义的订单状态机
const orderMachine = createOrderStateMachine(true);
await orderMachine.initialize();

console.log(orderMachine.getCurrentStateId()); // 'created'

// 触发事件
await orderMachine.trigger('pay');
console.log(orderMachine.getCurrentStateId()); // 'paid'

await orderMachine.trigger('ship');
console.log(orderMachine.getCurrentStateId()); // 'shipped'

await orderMachine.trigger('confirm');
console.log(orderMachine.getCurrentStateId()); // 'completed'
```

### 2. 自定义状态机 - 用户认证流程

```typescript
import { StateMachine, BaseState } from './src/skills/state-pattern-skill';

// 定义状态类
class LoggedOutState extends BaseState<any> {
  readonly id = 'loggedOut';
  readonly name = '未登录';
  
  async onEnter(context: any): Promise<void> {
    console.log('用户已登出');
  }
  
  allowedEvents(): string[] {
    return ['login', 'register'];
  }
}

class LoggedInState extends BaseState<any> {
  readonly id = 'loggedIn';
  readonly name = '已登录';
  
  async onEnter(context: any): Promise<void> {
    console.log(`欢迎，${context.username || '用户'}`);
  }
  
  async handle(event: string, payload: any, context: any): Promise<void> {
    if (event === 'updateProfile') {
      context.username = payload.username;
      console.log('个人资料已更新');
    }
  }
  
  allowedEvents(): string[] {
    return ['logout', 'updateProfile'];
  }
}

class SuspendedState extends BaseState<any> {
  readonly id = 'suspended';
  readonly name = '已冻结';
  
  async onEnter(context: any): Promise<void> {
    console.log('账户已被冻结');
  }
  
  allowedEvents(): string[] {
    return ['appeal'];
  }
}

// 创建状态机
const authMachine = new StateMachine({
  id: 'auth-flow',
  initialState: 'loggedOut',
  initialContext: { username: null, loginCount: 0 },
  enableLogging: true
});

// 注册状态
authMachine.registerState(new LoggedOutState());
authMachine.registerState(new LoggedInState());
authMachine.registerState(new SuspendedState());

// 定义转换规则
authMachine.defineTransition('loggedOut', 'login', 'loggedIn');
authMachine.defineTransition('loggedOut', 'register', 'loggedIn');
authMachine.defineTransition('loggedIn', 'logout', 'loggedOut');
authMachine.defineTransition('loggedIn', 'violation', 'suspended');
authMachine.defineTransition('suspended', 'appeal', 'loggedIn');

// 使用
await authMachine.initialize();
await authMachine.trigger('login', { username: 'Alice' });
await authMachine.trigger('updateProfile', { username: 'Alice_Updated' });
await authMachine.trigger('logout');
```

### 3. 状态转换监听器

```typescript
import { StateMachine, BaseState } from './src/skills/state-pattern-skill';

// 创建状态机
const machine = new StateMachine({
  id: 'demo',
  initialState: 'idle',
  enableLogging: true
});

// 添加转换监听器
machine.addTransitionListener((fromState, toState, event, context) => {
  console.log(`🔄 转换：${fromState} --[${event}]--> ${toState}`);
  console.log(`   上下文：`, context);
});

// 定义状态
class IdleState extends BaseState {
  readonly id = 'idle';
  readonly name = '空闲';
  allowedEvents() { return ['start']; }
}

class RunningState extends BaseState {
  readonly id = 'running';
  readonly name = '运行中';
  allowedEvents() { return ['pause', 'stop']; }
}

class PausedState extends BaseState {
  readonly id = 'paused';
  readonly name = '已暂停';
  allowedEvents() { return ['resume', 'stop']; }
}

// 注册并初始化
machine.registerState(new IdleState());
machine.registerState(new RunningState());
machine.registerState(new PausedState());

machine.defineTransition('idle', 'start', 'running');
machine.defineTransition('running', 'pause', 'paused');
machine.defineTransition('running', 'stop', 'idle');
machine.defineTransition('paused', 'resume', 'running');
machine.defineTransition('paused', 'stop', 'idle');

await machine.initialize();
await machine.trigger('start');
// 输出：🔄 转换：idle --[start]--> running
```

### 4. 状态历史追踪

```typescript
import { StateMachine, BaseState } from './src/skills/state-pattern-skill';

const machine = createOrderStateMachine(false);
await machine.initialize();

await machine.trigger('pay');
await machine.trigger('ship');
await machine.trigger('confirm');

// 获取历史记录
const history = machine.getHistory();
console.log('状态历史:');
history.forEach(record => {
  console.log(`  - ${record.stateId} (${new Date(record.enteredAt).toISOString()})`);
  if (record.exitedAt) {
    console.log(`    离开：${new Date(record.exitedAt).toISOString()}`);
  }
  console.log(`    触发事件：${record.triggeredBy}`);
});
```

### 5. 上下文管理

```typescript
import { StateMachine, BaseState } from './src/skills/state-pattern-skill';

class ProcessingState extends BaseState<{ progress: number; data: any }> {
  readonly id = 'processing';
  readonly name = '处理中';
  
  async handle(event: string, payload: any, context: { progress: number; data: any }): Promise<void> {
    if (event === 'updateProgress') {
      context.progress = payload.progress;
      console.log(`进度：${context.progress}%`);
    }
  }
  
  allowedEvents(): string[] {
    return ['updateProgress', 'complete', 'abort'];
  }
}

const machine = new StateMachine({
  id: 'processor',
  initialState: 'processing',
  initialContext: { progress: 0, data: null }
});

machine.registerState(new ProcessingState());
machine.defineTransition('processing', 'complete', 'completed');
machine.defineTransition('processing', 'abort', 'aborted');

await machine.initialize();

// 更新上下文
machine.updateContext({ data: { fileId: '123' } });
await machine.trigger('updateProgress', { progress: 50 });
await machine.trigger('updateProgress', { progress: 100 });

console.log('最终上下文:', machine.getContext());
// 输出：{ progress: 100, data: { fileId: '123' } }
```

### 6. 错误处理

```typescript
import { StateMachine, BaseState } from './src/skills/state-pattern-skill';

const machine = createOrderStateMachine(false);
await machine.initialize();

// 尝试无效的事件
const result = await machine.trigger('ship'); // 在 'created' 状态下不允许

if (!result.success) {
  console.error(`❌ 转换失败：${result.error}`);
  console.log(`   当前状态：${result.fromState}`);
}

// 输出：
// ❌ 转换失败：Event 'ship' not allowed in state '已创建'
//    当前状态：created
```

---

## 📋 完整示例：游戏角色状态机

```typescript
import { StateMachine, BaseState } from './src/skills/state-pattern-skill';

// 角色状态
class IdleState extends BaseState<any> {
  readonly id = 'idle';
  readonly name = '待机';
  
  async onEnter(context: any): Promise<void> {
    console.log('🎮 角色进入待机状态');
  }
  
  allowedEvents(): string[] {
    return ['move', 'attack', 'defend', 'rest'];
  }
}

class MovingState extends BaseState<any> {
  readonly id = 'moving';
  readonly name = '移动中';
  
  async onEnter(context: any): Promise<void> {
    console.log('🏃 角色开始移动');
  }
  
  async onExit(context: any): Promise<void> {
    console.log('🛑 角色停止移动');
  }
  
  async handle(event: string, payload: any, context: any): Promise<void> {
    if (event === 'move') {
      context.position = payload.position;
      console.log(`📍 移动到：${JSON.stringify(payload.position)}`);
    }
  }
  
  allowedEvents(): string[] {
    return ['move', 'stop', 'attack'];
  }
}

class AttackingState extends BaseState<any> {
  readonly id = 'attacking';
  readonly name = '攻击中';
  
  async onEnter(context: any): Promise<void> {
    console.log('⚔️ 角色发动攻击');
  }
  
  async handle(event: string, payload: any, context: any): Promise<void> {
    if (event === 'attack') {
      context.damage = (context.damage || 0) + payload.damage;
      console.log(`💥 造成伤害：${payload.damage} (累计：${context.damage})`);
    }
  }
  
  allowedEvents(): string[] {
    return ['complete', 'cancel'];
  }
}

class DefendingState extends BaseState<any> {
  readonly id = 'defending';
  readonly name = '防御中';
  
  async onEnter(context: any): Promise<void> {
    console.log('🛡️ 角色进入防御姿态');
    context.defenseMultiplier = 0.5;
  }
  
  async onExit(context: any): Promise<void> {
    context.defenseMultiplier = 1;
  }
  
  allowedEvents(): string[] {
    return ['complete', 'cancel'];
  }
}

class RestingState extends BaseState<any> {
  readonly id = 'resting';
  readonly name = '休息中';
  
  async onEnter(context: any): Promise<void> {
    console.log('💤 角色开始休息');
  }
  
  async handle(event: string, payload: any, context: any): Promise<void> {
    if (event === 'rest') {
      context.health = Math.min(100, (context.health || 0) + payload.heal);
      console.log(`❤️  恢复生命：${payload.heal} (当前：${context.health})`);
    }
  }
  
  allowedEvents(): string[] {
    return ['wake', 'continue'];
  }
}

// 创建游戏角色状态机
const characterMachine = new StateMachine({
  id: 'character-state',
  initialState: 'idle',
  initialContext: {
    health: 100,
    position: { x: 0, y: 0 },
    damage: 0,
    defenseMultiplier: 1
  },
  enableLogging: false
});

// 注册所有状态
characterMachine.registerState(new IdleState());
characterMachine.registerState(new MovingState());
characterMachine.registerState(new AttackingState());
characterMachine.registerState(new DefendingState());
characterMachine.registerState(new RestingState());

// 定义转换规则
characterMachine.defineTransition('idle', 'move', 'moving');
characterMachine.defineTransition('idle', 'attack', 'attacking');
characterMachine.defineTransition('idle', 'defend', 'defending');
characterMachine.defineTransition('idle', 'rest', 'resting');

characterMachine.defineTransition('moving', 'move', 'moving');
characterMachine.defineTransition('moving', 'stop', 'idle');
characterMachine.defineTransition('moving', 'attack', 'attacking');

characterMachine.defineTransition('attacking', 'complete', 'idle');
characterMachine.defineTransition('attacking', 'cancel', 'idle');

characterMachine.defineTransition('defending', 'complete', 'idle');
characterMachine.defineTransition('defending', 'cancel', 'idle');

characterMachine.defineTransition('resting', 'wake', 'idle');
characterMachine.defineTransition('resting', 'continue', 'resting');

// 使用示例
async function gameLoop() {
  await characterMachine.initialize();
  
  console.log('\n=== 游戏开始 ===\n');
  
  // 移动
  await characterMachine.trigger('move', { position: { x: 10, y: 20 } });
  await characterMachine.trigger('move', { position: { x: 15, y: 25 } });
  await characterMachine.trigger('stop');
  
  // 攻击
  await characterMachine.trigger('attack');
  await characterMachine.trigger('attack', { damage: 25 });
  await characterMachine.trigger('attack', { damage: 30 });
  await characterMachine.trigger('complete');
  
  // 防御
  await characterMachine.trigger('defend');
  await characterMachine.trigger('complete');
  
  // 休息
  await characterMachine.trigger('rest');
  await characterMachine.trigger('rest', { heal: 20 });
  await characterMachine.trigger('wake');
  
  console.log('\n=== 游戏结束 ===\n');
  console.log('最终状态:', characterMachine.getCurrentStateId());
  console.log('角色数据:', characterMachine.getContext());
}

gameLoop();
```

---

## 🎯 API 参考

### StateMachine 类

| 方法 | 参数 | 返回值 | 描述 |
|------|------|--------|------|
| `registerState` | `state: IState<T>` | `void` | 注册状态 |
| `defineTransition` | `from: StateId, event: string, to: StateId` | `void` | 定义转换规则 |
| `initialize` | - | `Promise<void>` | 初始化状态机 |
| `trigger` | `event: string, payload?: any` | `Promise<TransitionResult>` | 触发事件 |
| `getCurrentState` | - | `IState<T> \| null` | 获取当前状态对象 |
| `getCurrentStateId` | - | `StateId \| null` | 获取当前状态 ID |
| `getContext` | - | `T` | 获取上下文 |
| `updateContext` | `updates: Partial<T>` | `void` | 更新上下文 |
| `getHistory` | - | `StateHistory[]` | 获取状态历史 |
| `isInState` | `stateId: StateId` | `boolean` | 检查是否在指定状态 |
| `addTransitionListener` | `listener: TransitionListener<T>` | `void` | 添加转换监听器 |
| `reset` | - | `Promise<void>` | 重置状态机 |

### BaseState 类

| 方法 | 参数 | 返回值 | 描述 |
|------|------|--------|------|
| `onEnter` | `context: T` | `Promise<void>` | 进入状态钩子 |
| `onExit` | `context: T` | `Promise<void>` | 退出状态钩子 |
| `handle` | `event: string, payload: any, context: T` | `Promise<void>` | 处理事件 |
| `allowedEvents` | - | `string[]` | 获取允许的事件列表 |

---

## 💡 最佳实践

### 1. 状态命名
```typescript
// ✅ 好的命名
class OrderCreatedState { id = 'created'; name = '已创建'; }
class UserLoggedInState { id = 'loggedIn'; name = '已登录'; }

// ❌ 避免的命名
class State1 { id = 's1'; } // 不具描述性
class CreatedOrderState { id = 'orderCreated'; } // 词序不一致
```

### 2. 转换规则集中管理
```typescript
// ✅ 推荐：在创建状态机时统一定义
function createOrderMachine() {
  const machine = new StateMachine({...});
  // 注册状态...
  
  // 集中定义所有转换
  machine.defineTransition('created', 'pay', 'paid');
  machine.defineTransition('created', 'cancel', 'cancelled');
  // ...
  
  return machine;
}

// ❌ 避免：在代码各处分散定义
machine.defineTransition(...); // 这里
// ... 其他代码
machine.defineTransition(...); // 又这里
```

### 3. 状态历史用于调试
```typescript
// 启用日志记录
const machine = new StateMachine({
  enableLogging: true,
  onTransition: (from, to, event, context) => {
    console.log(`[审计] ${from} -> ${to} via ${event}`);
  }
});
```

### 4. 错误处理
```typescript
const result = await machine.trigger('someEvent');
if (!result.success) {
  // 优雅地处理无效转换
  console.warn(`无效操作：${result.error}`);
}
```

---

## 🔧 调试技巧

### 启用调试模式
```typescript
// 全局调试标志
globalThis.__STATE_PATTERN_DEBUG__ = true;

// 或在状态机配置中启用
const machine = new StateMachine({
  enableLogging: true
});
```

### 查看状态历史
```typescript
const history = machine.getHistory();
console.table(history.map(h => ({
  状态：h.stateId,
  进入时间：new Date(h.enteredAt).toLocaleTimeString(),
  离开时间：h.exitedAt ? new Date(h.exitedAt).toLocaleTimeString() : '当前',
  触发事件：h.triggeredBy
})));
```

---

## 📝 总结

状态模式技能提供了：

1. **清晰的状态定义** - 每个状态封装自己的行为
2. **灵活的状态转换** - 通过事件驱动状态变化
3. **完整的上下文管理** - 维护状态间共享的数据
4. **强大的扩展性** - 易于添加新状态和转换规则
5. **调试友好** - 内置日志和历史追踪

适用于：订单流程、用户认证、游戏状态、工作流引擎等场景。
