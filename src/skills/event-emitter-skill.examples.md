# 事件发射器技能 - 使用示例

**文件:** `event-emitter-skill.ts`  
**作者:** Axon  
**版本:** 1.0.0

---

## 📖 快速开始

### 1. 基础订阅与发射

```typescript
import { createEventEmitter } from './src/skills/event-emitter-skill';

// 创建发射器
const emitter = createEventEmitter();

// 订阅事件
emitter.on('user:login', (data, eventName) => {
  console.log(`📢 事件 ${eventName}: 用户 ${data.username} 登录了`);
});

// 发射事件
await emitter.emit('user:login', { 
  username: 'Alice',
  timestamp: Date.now(),
  ip: '192.168.1.100'
});

// 输出：📢 事件 user:login: 用户 Alice 登录了
```

---

### 2. 取消订阅

```typescript
// 订阅并获取取消函数
const unsubscribe = emitter.on('notification', (data) => {
  console.log('收到通知:', data);
});

// 发射第一次
await emitter.emit('notification', { message: 'Hello' }); // ✅ 会触发

// 取消订阅
unsubscribe();

// 发射第二次
await emitter.emit('notification', { message: 'World' }); // ❌ 不会触发
```

---

### 3. 一次性监听 (once)

```typescript
// 只监听一次
emitter.once('task:complete', (result) => {
  console.log('✅ 任务完成:', result);
});

// 第一次触发 - 会执行
await emitter.emit('task:complete', { success: true, duration: 1200 });

// 第二次触发 - 不会执行 (已自动取消)
await emitter.emit('task:complete', { success: false }); 

// 验证监听器数量
console.log(emitter.listenerCount('task:complete')); // 输出：0
```

---

### 4. 通配符匹配

```typescript
// 监听所有 user 相关事件
emitter.on('user:*', (data, eventName) => {
  console.log(`👤 用户事件 [${eventName}]:`, data);
});

// 监听所有 order 相关事件
emitter.on('order:*', (data, eventName) => {
  console.log(`🛒 订单事件 [${eventName}]:`, data);
});

// 发射各种用户事件
await emitter.emit('user:login', { username: 'Alice' });
await emitter.emit('user:logout', { username: 'Alice' });
await emitter.emit('user:update', { username: 'Alice', role: 'admin' });

// 发射订单事件
await emitter.emit('order:created', { orderId: '12345' });
await emitter.emit('order:paid', { orderId: '12345' });
```

---

### 5. 优先级控制

```typescript
// 不同优先级的监听器
emitter.on('order:created', () => {
  console.log('1️⃣ 低优先级 - 发送统计');
}, 0);

emitter.on('order:created', () => {
  console.log('2️⃣ 中优先级 - 更新库存');
}, 5);

emitter.on('order:created', () => {
  console.log('3️⃣ 高优先级 - 验证订单');
}, 10);

// 发射事件 - 按优先级执行
await emitter.emit('order:created', { orderId: '123' });

// 输出顺序:
// 3️⃣ 高优先级 - 验证订单
// 2️⃣ 中优先级 - 更新库存
// 1️⃣ 低优先级 - 发送统计
```

---

### 6. 异步处理与超时

```typescript
// 异步事件处理器
emitter.on('data:sync', async (data) => {
  console.log('🔄 开始同步...', data);
  await new Promise(resolve => setTimeout(resolve, 1000));
  console.log('✅ 同步完成');
});

// 带超时的发射
try {
  await emitter.emit('data:sync', { records: 100 }, { 
    timeout: 5000,  // 5 秒超时
    captureErrors: true 
  });
} catch (error) {
  console.error('❌ 同步超时:', error);
}
```

---

### 7. 错误捕获

```typescript
// 不捕获错误 (抛出异常)
emitter.on('critical:event', () => {
  throw new Error('处理失败!');
});

try {
  await emitter.emit('critical:event', {}, { 
    captureErrors: false  // 不捕获，抛出异常
  });
} catch (error) {
  console.error('捕获到错误:', error.message);
}

// 捕获错误 (不抛出)
await emitter.emit('critical:event', {}, { 
  captureErrors: true  // 默认行为，记录错误但不抛出
});
```

---

### 8. 全局单例发射器

```typescript
import { getGlobalEmitter } from './src/skills/event-emitter-skill';

// 在文件 A 中
const emitter1 = getGlobalEmitter();
emitter1.on('global:msg', (data) => console.log('A 收到:', data));

// 在文件 B 中
const emitter2 = getGlobalEmitter();
emitter2.on('global:msg', (data) => console.log('B 收到:', data));

// 发射一次，所有地方都能收到
await emitter1.emit('global:msg', { text: 'Hello World' });

// 输出:
// A 收到：{ text: 'Hello World' }
// B 收到：{ text: 'Hello World' }
```

---

### 9. 统计信息

```typescript
const emitter = createEventEmitter();

// 添加一些监听器
emitter.on('event1', () => {});
emitter.on('event2', () => {});
emitter.on('event2', () => {});

// 发射一些事件
await emitter.emit('event1', {});
await emitter.emit('event2', {});
await emitter.emit('event3', {}); // 没有监听器

// 获取统计
const stats = emitter.getStats();
console.log(stats);

// 输出:
// {
//   totalEvents: 2,        // 有监听器的事件数
//   totalListeners: 3,     // 总监听器数
//   emittedCount: 3,       // 已发射次数
//   eventMap: {            // 每个事件的监听器数量
//     event1: 1,
//     event2: 2
//   }
// }
```

---

### 10. 实际应用场景

#### A. 用户行为追踪

```typescript
const emitter = createEventEmitter();

// 分析服务
emitter.on('user:*', (data, eventName) => {
  analytics.track(eventName, data);
});

// 日志服务
emitter.on('*', (data, eventName) => {
  logger.info(`事件：${eventName}`, data);
});

// 业务代码
await emitter.emit('user:click', { button: 'buy', page: 'home' });
await emitter.emit('user:scroll', { percentage: 80 });
```

#### B. 任务完成回调

```typescript
// 等待任务完成
const taskPromise = new Promise((resolve) => {
  emitter.once('task:done', (result) => resolve(result));
});

// 启动任务
runTask().then((result) => {
  emitter.emit('task:done', result);
});

// 等待结果
const result = await taskPromise;
```

#### C. 模块解耦

```typescript
// 订单模块
emitter.on('order:created', async (order) => {
  await inventory.reduce(order.items);
  await notification.send('订单创建成功');
  await analytics.record('order_created');
});

// 订单服务 (不需要知道有哪些监听器)
orderService.create(data); // 内部会 emit('order:created', order)
```

---

## ⚙️ 配置选项

### EventEmitter 构造函数

```typescript
const emitter = new EventEmitter({
  maxListeners: 100,   // 最大监听器数量 (默认 100)
  wildcard: true       // 是否启用通配符 (默认 true)
});
```

### emit 选项

```typescript
await emitter.emit('event', data, {
  async: true,          // 是否异步执行 (默认 true)
  timeout: 5000,        // 超时时间 (毫秒)
  captureErrors: true   // 是否捕获错误 (默认 true)
});
```

---

## 🎯 API 速查

| 方法 | 描述 | 返回值 |
|------|------|--------|
| `on(event, handler, priority?)` | 订阅事件 | 取消函数 |
| `once(event, handler, priority?)` | 一次性监听 | 取消函数 |
| `off(event, handler?)` | 取消订阅 | void |
| `emit(event, data?, options?)` | 异步发射事件 | Promise<void> |
| `emitSync(event, data?)` | 同步发射事件 | void |
| `removeAllListeners(event?)` | 移除所有监听器 | void |
| `listenerCount(event)` | 获取监听器数量 | number |
| `eventNames()` | 获取所有事件名 | string[] |
| `getStats()` | 获取统计信息 | EmitterStats |
| `setMaxListeners(n)` | 设置最大监听器数 | void |

---

## ⚠️ 注意事项

1. **内存泄漏**: 记得在组件销毁时取消订阅
2. **异步处理**: 默认异步执行，如需同步用 `emitSync`
3. **错误处理**: 默认捕获错误，如需抛出设置 `captureErrors: false`
4. **通配符性能**: 大量通配符监听器可能影响性能

---

**完成时间:** 5 分钟内 ✅  
**交付物:** `src/skills/event-emitter-skill.ts` + 使用示例
