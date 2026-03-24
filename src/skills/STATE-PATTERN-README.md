# 状态模式技能 - State Pattern Skill

> 状态模式允许对象在内部状态改变时改变其行为，将状态相关的逻辑封装到独立的状态类中。

---

## 📖 简介

状态模式 (State Pattern) 是一种行为设计模式，它允许对象在其内部状态改变时改变它的行为。状态模式将状态相关的复杂逻辑和条件判断封装到独立的状态类中，使代码更加清晰、可维护。

### 核心功能

1. **状态定义** - 定义所有可能的状态及其行为
2. **状态转换** - 通过事件驱动状态之间的转换
3. **上下文管理** - 维护状态机的上下文数据和当前状态

---

## 🚀 快速开始

### 安装

无需额外安装，直接使用：

```typescript
import { StateMachine, BaseState } from './src/skills/state-pattern-skill';
```

### 基础示例

```typescript
import { StateMachine, BaseState } from './src/skills/state-pattern-skill';

// 1. 定义状态
class IdleState extends BaseState {
  readonly id = 'idle';
  readonly name = '空闲';
  allowedEvents() { return ['start']; }
}

class RunningState extends BaseState {
  readonly id = 'running';
  readonly name = '运行中';
  allowedEvents() { return ['stop']; }
}

// 2. 创建状态机
const machine = new StateMachine({
  id: 'demo',
  initialState: 'idle'
});

// 3. 注册状态
machine.registerState(new IdleState());
machine.registerState(new RunningState());

// 4. 定义转换规则
machine.defineTransition('idle', 'start', 'running');
machine.defineTransition('running', 'stop', 'idle');

// 5. 初始化并使用
await machine.initialize();
await machine.trigger('start'); // 转换到 running 状态
```

---

## 📋 API 文档

### StateMachine 类

状态机核心类，管理所有状态和转换。

#### 构造函数参数

```typescript
interface StatePatternConfig<T> {
  id?: string;              // 状态机 ID (可选)
  initialState: StateId;    // 初始状态 ID (必填)
  initialContext?: T;       // 初始上下文 (可选)
  enableLogging?: boolean;  // 是否启用日志 (可选)
  onTransition?: listener;  // 转换监听器 (可选)
}
```

#### 主要方法

| 方法 | 描述 | 示例 |
|------|------|------|
| `registerState(state)` | 注册状态 | `machine.registerState(new MyState())` |
| `defineTransition(from, event, to)` | 定义转换规则 | `machine.defineTransition('idle', 'start', 'running')` |
| `initialize()` | 初始化状态机 | `await machine.initialize()` |
| `trigger(event, payload)` | 触发事件 | `await machine.trigger('start', { data: 123 })` |
| `getCurrentState()` | 获取当前状态对象 | `machine.getCurrentState()` |
| `getCurrentStateId()` | 获取当前状态 ID | `machine.getCurrentStateId()` |
| `getContext()` | 获取上下文 | `machine.getContext()` |
| `updateContext(updates)` | 更新上下文 | `machine.updateContext({ key: value })` |
| `getHistory()` | 获取状态历史 | `machine.getHistory()` |
| `isInState(stateId)` | 检查是否在指定状态 | `machine.isInState('running')` |
| `addTransitionListener(listener)` | 添加转换监听器 | `machine.addTransitionListener(cb)` |
| `reset()` | 重置状态机 | `await machine.reset()` |

### BaseState 类

所有状态的基类，提供默认实现。

#### 属性

```typescript
abstract readonly id: StateId;    // 状态唯一标识
abstract readonly name: string;   // 状态可读名称
```

#### 方法

| 方法 | 描述 | 默认实现 |
|------|------|----------|
| `onEnter(context)` | 进入状态时调用 | 空 |
| `onExit(context)` | 退出状态时调用 | 空 |
| `handle(event, payload, context)` | 处理事件 | 空 |
| `allowedEvents()` | 返回允许的事件列表 | `[]` |

---

## 💡 使用场景

### 1. 订单工作流

```
created → paid → shipped → completed
   ↓        ↓
cancelled  refunded
```

### 2. 用户认证

```
loggedOut → loggedIn → suspended
    ↑          ↓
    └──────────┘
```

### 3. 游戏角色状态

```
        → moving →
       /    ↓     \
idle ←       → attacking
   ↓            ↓
resting ←  defending
```

### 4. 审批流程

```
draft → submitted → reviewing → approved
                         ↓
                      rejected
```

---

## 🎯 最佳实践

### 1. 状态命名规范

```typescript
// ✅ 推荐：使用过去分词或形容词
class OrderCreatedState { id = 'created'; }
class UserLoggedInState { id = 'loggedIn'; }

// ❌ 避免：名词或动词原形
class CreateState { id = 'create'; }
class LoginState { id = 'login'; }
```

### 2. 转换规则集中定义

```typescript
// ✅ 推荐：在工厂函数中统一定义
function createOrderMachine() {
  const machine = new StateMachine({...});
  // 注册状态...
  
  // 集中定义所有转换
  machine.defineTransition('created', 'pay', 'paid');
  machine.defineTransition('paid', 'ship', 'shipped');
  // ...
  
  return machine;
}
```

### 3. 使用监听器进行审计

```typescript
machine.addTransitionListener((from, to, event, context) => {
  // 记录到数据库或日志系统
  auditLog.create({ from, to, event, timestamp: Date.now() });
});
```

### 4. 错误处理

```typescript
const result = await machine.trigger('someEvent');
if (!result.success) {
  console.warn(`无效操作：${result.error}`);
  // 优雅地处理错误
}
```

---

## 📁 文件结构

```
src/skills/
├── state-pattern-skill.ts          # 核心实现
└── examples/
    ├── STATE-PATTERN-EXAMPLES.md   # 详细使用文档
    └── state-pattern-examples.ts   # 可运行示例代码
```

---

## 🔧 调试

### 启用日志

```typescript
const machine = new StateMachine({
  enableLogging: true
});
```

### 全局调试模式

```typescript
globalThis.__STATE_PATTERN_DEBUG__ = true;
```

### 查看状态历史

```typescript
const history = machine.getHistory();
console.table(history.map(h => ({
  状态：h.stateId,
  进入时间：new Date(h.enteredAt).toLocaleTimeString(),
  触发事件：h.triggeredBy
})));
```

---

## 📝 完整示例

详见：
- [使用文档](./examples/STATE-PATTERN-EXAMPLES.md)
- [示例代码](./examples/state-pattern-examples.ts)

运行示例：

```bash
npx ts-node src/skills/examples/state-pattern-examples.ts
```

---

## ⚖️ 许可证

MIT License

---

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

---

**作者**: Axon  
**版本**: 1.0.0  
**创建时间**: 2026-03-13
