# 事件发射器工具 - 使用指南

**文件:** `src/skills/event-emitter-skill.ts`  
**作者:** KAEL (Axon)  
**版本:** 1.0.0  
**完成时间:** 5 分钟内 ✅

---

## 🎯 核心功能

### 1. 事件注册 (Event Registration)
- ✅ `on()` - 订阅事件
- ✅ `once()` - 一次性监听
- ✅ 支持优先级控制
- ✅ 支持通配符匹配

### 2. 事件触发 (Event Triggering)
- ✅ `emit()` - 异步发射
- ✅ `emitSync()` - 同步发射
- ✅ 支持超时控制
- ✅ 支持错误捕获

### 3. 事件监听 (Event Listening)
- ✅ 精确匹配
- ✅ 通配符匹配 (`*`)
- ✅ 优先级排序
- ✅ 自动清理 (once)

---

## 📖 快速开始

### 基础用法

```typescript
import { createEventEmitter } from './src/skills/event-emitter-skill';

// 创建事件发射器
const emitter = createEventEmitter();

// 1. 事件注册
emitter.on('user:login', (data, eventName) => {
  console.log(`用户 ${data.username} 登录了`);
});

// 2. 事件触发
await emitter.emit('user:login', { 
  username: 'Alice',
  timestamp: Date.now()
});

// 3. 取消监听
const unsubscribe = emitter.on('notification', (msg) => {
  console.log(msg);
});
unsubscribe(); // 取消订阅
```

---

## 💡 使用示例

### 示例 1: 用户行为追踪系统

```typescript
import { createEventEmitter } from './src/skills/event-emitter-skill';

const analytics = createEventEmitter();

// 注册监听器 - 分析服务
analytics.on('user:*', (data, eventName) => {
  console.log(`📊 分析：${eventName}`, data);
});

// 注册监听器 - 日志服务
analytics.on('*', (data, eventName) => {
  console.log(`📝 日志：${eventName}`);
});

// 触发事件
await analytics.emit('user:click', { 
  element: 'buy-button',
  page: '/products'
});

await analytics.emit('user:scroll', { 
  percentage: 75,
  page: '/home'
});
```

---

### 示例 2: 任务完成回调

```typescript
import { createEventEmitter } from './src/skills/event-emitter-skill';

const taskEmitter = createEventEmitter();

// 等待任务完成
function waitForTask(taskId: string): Promise<any> {
  return new Promise((resolve) => {
    taskEmitter.once(`task:${taskId}:done`, (result) => {
      resolve(result);
    });
  });
}

// 启动任务
async function runTask(taskId: string) {
  console.log(`任务 ${taskId} 开始执行`);
  
  // 模拟异步任务
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // 任务完成，触发事件
  await taskEmitter.emit(`task:${taskId}:done`, {
    success: true,
    duration: 1000
  });
}

// 使用
const taskPromise = waitForTask('task-123');
runTask('task-123');
const result = await taskPromise;
console.log('任务完成:', result);
```

---

### 示例 3: 优先级处理

```typescript
import { createEventEmitter } from './src/skills/event-emitter-skill';

const orderEmitter = createEventEmitter();

// 高优先级 - 验证订单 (优先级 10)
orderEmitter.on('order:created', (order) => {
  console.log('🔒 验证订单:', order.id);
}, 10);

// 中优先级 - 扣减库存 (优先级 5)
orderEmitter.on('order:created', (order) => {
  console.log('📦 扣减库存:', order.id);
}, 5);

// 低优先级 - 发送通知 (优先级 0)
orderEmitter.on('order:created', (order) => {
  console.log('📧 发送通知:', order.id);
}, 0);

// 触发 - 按优先级执行
await orderEmitter.emit('order:created', { id: 'ORD-123' });

// 输出顺序:
// 🔒 验证订单：ORD-123
// 📦 扣减库存：ORD-123
// 📧 发送通知：ORD-123
```

---

### 示例 4: 模块解耦

```typescript
// 事件定义 (events.ts)
export const Events = {
  USER_REGISTERED: 'user:registered',
  ORDER_CREATED: 'order:created',
  PAYMENT_COMPLETED: 'payment:completed',
} as const;

// 用户模块 (user.service.ts)
import { createEventEmitter } from './event-emitter-skill';
import { Events } from './events';

export class UserService {
  private emitter = createEventEmitter();
  
  async register(userData: any) {
    // 创建用户
    const user = await this.createUser(userData);
    
    // 触发事件 (不需要知道有哪些监听器)
    await this.emitter.emit(Events.USER_REGISTERED, user);
    
    return user;
  }
  
  onEvent(event: string, handler: any) {
    this.emitter.on(event, handler);
  }
}

// 邮件服务 (email.service.ts)
const userService = new UserService();

// 监听用户注册事件
userService.onEvent(Events.USER_REGISTERED, async (user) => {
  await sendWelcomeEmail(user.email);
});

// 分析服务 (analytics.service.ts)
userService.onEvent(Events.USER_REGISTERED, async (user) => {
  await trackEvent('user_registered', { userId: user.id });
});
```

---

### 示例 5: 全局事件总线

```typescript
import { getGlobalEmitter } from './src/skills/event-emitter-skill';

// 在任意文件中获取全局发射器
const eventBus = getGlobalEmitter();

// 模块 A
eventBus.on('app:ready', () => {
  console.log('模块 A 已就绪');
});

// 模块 B
eventBus.on('app:ready', () => {
  console.log('模块 B 已就绪');
});

// 主程序
await eventBus.emit('app:ready');

// 输出:
// 模块 A 已就绪
// 模块 B 已就绪
```

---

### 示例 6: 异步处理与超时

```typescript
import { createEventEmitter } from './src/skills/event-emitter-skill';

const dataEmitter = createEventEmitter();

// 注册异步处理器
dataEmitter.on('data:sync', async (data) => {
  console.log('🔄 开始同步数据...');
  
  // 模拟耗时操作
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  console.log('✅ 同步完成:', data);
});

// 带超时的发射
try {
  await dataEmitter.emit('data:sync', { records: 1000 }, {
    timeout: 5000,        // 5 秒超时
    captureErrors: true   // 捕获错误
  });
} catch (error) {
  console.error('❌ 同步失败:', error.message);
}
```

---

### 示例 7: 错误处理

```typescript
import { createEventEmitter } from './src/skills/event-emitter-skill';

const errorEmitter = createEventEmitter();

// 可能出错的处理器
errorEmitter.on('critical:operation', async () => {
  throw new Error('操作失败!');
});

// 方式 1: 捕获错误 (默认)
await errorEmitter.emit('critical:operation', {}, {
  captureErrors: true  // 记录错误但不抛出
});
console.log('程序继续执行');

// 方式 2: 抛出错误
try {
  await errorEmitter.emit('critical:operation', {}, {
    captureErrors: false  // 抛出异常
  });
} catch (error) {
  console.error('捕获到错误:', error.message);
}
```

---

### 示例 8: 统计与监控

```typescript
import { createEventEmitter } from './src/skills/event-emitter-skill';

const monitoredEmitter = createEventEmitter();

// 添加监听器
monitoredEmitter.on('event1', () => {});
monitoredEmitter.on('event2', () => {});
monitoredEmitter.on('event2', () => {});

// 发射事件
await monitoredEmitter.emit('event1', {});
await monitoredEmitter.emit('event2', {});

// 获取统计信息
const stats = monitoredEmitter.getStats();
console.log('统计信息:', stats);

// 输出:
// {
//   totalEvents: 2,           // 有监听器的事件数
//   totalListeners: 3,        // 总监听器数量
//   emittedCount: 2,          // 已发射次数
//   eventMap: {               // 每个事件的监听器数量
//     event1: 1,
//     event2: 2
//   }
// }

// 查询特定事件的监听器数量
console.log('event1 监听器数量:', monitoredEmitter.listenerCount('event1'));
console.log('所有事件:', monitoredEmitter.eventNames());
```

---

## ⚙️ API 参考

### 构造函数

```typescript
new EventEmitter(options?: {
  maxListeners?: number;   // 最大监听器数量 (默认 100)
  wildcard?: boolean;      // 是否启用通配符 (默认 true)
})
```

### 核心方法

| 方法 | 参数 | 返回值 | 描述 |
|------|------|--------|------|
| `on` | `(event, handler, priority?)` | `() => void` | 订阅事件，返回取消函数 |
| `once` | `(event, handler, priority?)` | `() => void` | 一次性监听 |
| `off` | `(event, handler?)` | `void` | 取消订阅 |
| `emit` | `(event, data?, options?)` | `Promise<void>` | 异步发射事件 |
| `emitSync` | `(event, data?)` | `void` | 同步发射事件 |

### 管理方法

| 方法 | 参数 | 返回值 | 描述 |
|------|------|--------|------|
| `removeAllListeners` | `(event?)` | `void` | 移除所有监听器 |
| `listenerCount` | `(event)` | `number` | 获取监听器数量 |
| `eventNames` | `()` | `string[]` | 获取所有事件名 |
| `getStats` | `()` | `EmitterStats` | 获取统计信息 |
| `setMaxListeners` | `(n)` | `void` | 设置最大监听器数 |

### Emit 选项

```typescript
{
  async?: boolean;         // 是否异步执行 (默认 true)
  timeout?: number;        // 超时时间 (毫秒)
  captureErrors?: boolean  // 是否捕获错误 (默认 true)
}
```

---

## ⚠️ 注意事项

### 1. 内存泄漏
```typescript
// ❌ 错误：组件销毁时未取消订阅
component.on('event', handler);

// ✅ 正确：保存取消函数并在适当时机调用
const unsubscribe = component.on('event', handler);
// 组件销毁时
unsubscribe();
```

### 2. 异步处理
```typescript
// emit() 默认异步执行，会等待所有处理器完成
await emitter.emit('async:event', data);

// emitSync() 同步执行，不等待 Promise
emitter.emitSync('sync:event', data);
```

### 3. 错误处理
```typescript
// 默认捕获所有错误
await emitter.emit('event', data); // 错误会被 console.error

// 需要抛出错误时
await emitter.emit('event', data, { captureErrors: false });
```

### 4. 通配符性能
```typescript
// 大量通配符监听器可能影响性能
emitter.on('*', handler);        // 匹配所有事件
emitter.on('user:*', handler);   // 匹配 user 开头的事件

// 建议：只在必要时使用通配符
```

---

## 🎯 最佳实践

### 1. 使用常量定义事件名
```typescript
// events.ts
export const USER_EVENTS = {
  LOGIN: 'user:login',
  LOGOUT: 'user:logout',
  UPDATE: 'user:update',
} as const;

// 使用
emitter.on(USER_EVENTS.LOGIN, handler);
```

### 2. 类型安全
```typescript
interface LoginData {
  username: string;
  timestamp: number;
}

emitter.on<LoginData>('user:login', (data) => {
  console.log(data.username); // TypeScript 提供类型提示
});
```

### 3. 分层事件总线
```typescript
// 全局事件总线
const globalEmitter = getGlobalEmitter();

// 模块级事件总线
const moduleEmitter = createEventEmitter();

// 使用场景分离
globalEmitter.on('app:*', globalHandler);  // 全局事件
moduleEmitter.on('module:*', moduleHandler); // 模块内部事件
```

---

## 📊 测试覆盖

所有核心功能已通过测试验证:
- ✅ 基础订阅与发射
- ✅ 取消订阅
- ✅ 一次性监听
- ✅ 通配符匹配
- ✅ 优先级控制
- ✅ 异步处理
- ✅ 统计信息
- ✅ 全局单例

**测试文件:** `src/skills/test-event-emitter.ts`  
**测试结果:** 8/8 通过 (100%)

---

## 📦 交付清单

- ✅ `src/skills/event-emitter-skill.ts` - 核心实现
- ✅ `src/skills/event-emitter-skill.examples.md` - 详细示例
- ✅ `src/skills/test-event-emitter.ts` - 测试文件
- ✅ 本使用指南

---

**任务完成!** 🎉  
事件发射器工具已准备就绪，可立即使用。
