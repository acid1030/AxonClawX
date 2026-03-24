# 钩子系统技能 (Hook System Skill) - KAEL

> 优雅的事件钩子管理系统，支持优先级、超时控制和执行中断

---

## 🚀 快速开始

```typescript
import { createHookSystem } from './hook-system-skill';

const hookSystem = createHookSystem();

// 注册钩子
hookSystem.register('user:beforeSave', (data) => {
  data.validated = true;
  return data;
}, { priority: 10 });

// 触发钩子
const result = await hookSystem.execute('user:beforeSave', userData);
```

---

## 📋 核心功能

### 1. 钩子注册 (Register)

```typescript
const hookId = hookSystem.register<T, R>(
  hookName: string,
  handler: HookHandler<T, R>,
  options?: HookOptions
): string
```

**选项参数:**
- `priority` (number): 优先级，数字越大越先执行，默认 0
- `description` (string): 钩子描述
- `once` (boolean): 是否只执行一次，默认 false
- `timeout` (number): 超时时间 (毫秒)
- `canAbort` (boolean): 是否允许中断后续钩子，默认 false

**示例:**
```typescript
// 高优先级钩子
hookSystem.register('order:process', handler, { 
  priority: 100,
  description: '订单验证',
  timeout: 5000 
});

// 一次性钩子
hookSystem.register('app:init', initHandler, { once: true });

// 可中断钩子
hookSystem.register('request:validate', validator, { 
  priority: 10, 
  canAbort: true 
});
```

---

### 2. 钩子触发 (Execute)

```typescript
// 异步执行
const result = await hookSystem.execute<T>(
  hookName: string,
  data: T,
  context?: { meta?: Record<string, any> }
): Promise<HookExecutionResult<T>>

// 同步执行
const result = hookSystem.executeSync<T>(
  hookName: string,
  data: T,
  context?: { meta?: Record<string, any> }
): HookExecutionResult<T>
```

**返回结果:**
```typescript
interface HookExecutionResult<T> {
  success: boolean;       // 是否成功
  data: T;               // 最终数据
  results: any[];        // 所有钩子的返回值
  executionTime: number; // 执行时间 (毫秒)
  aborted: boolean;      // 是否被中断
  error?: string;        // 错误信息
}
```

**示例:**
```typescript
const result = await hookSystem.execute('user:beforeSave', userData);

if (result.success) {
  console.log('处理后的数据:', result.data);
} else {
  console.error('执行失败:', result.error);
}
```

---

### 3. 钩子优先级 (Priority)

优先级高的钩子先执行：

```typescript
// 执行顺序：3 -> 2 -> 1
hookSystem.register('event', () => console.log('优先级 3'), { priority: 3 });
hookSystem.register('event', () => console.log('优先级 2'), { priority: 2 });
hookSystem.register('event', () => console.log('优先级 1'), { priority: 1 });

await hookSystem.execute('event', {});
// 输出:
// 优先级 3
// 优先级 2
// 优先级 1
```

---

## 🛠️ 高级功能

### 中断执行

```typescript
hookSystem.register('request:validate', (data, context) => {
  if (!data.valid) {
    // 中断后续钩子
    hookSystem.abort(context);
  }
  return data;
}, { canAbort: true });
```

### 超时控制

```typescript
hookSystem.register('slow:task', async (data) => {
  await someSlowOperation();
  return data;
}, { timeout: 5000 }); // 5 秒超时

const result = await hookSystem.execute('slow:task', {});
if (!result.success) {
  console.error('超时:', result.error);
}
```

### 一次性钩子

```typescript
hookSystem.register('app:init', () => {
  console.log('初始化 (只执行一次)');
}, { once: true });

await hookSystem.execute('app:init', {}); // 执行
await hookSystem.execute('app:init', {}); // 不执行
await hookSystem.execute('app:init', {}); // 不执行
```

---

## 📊 管理功能

### 获取钩子信息

```typescript
// 获取所有钩子名称
const names = hookSystem.getHookNames();

// 获取钩子数量
const count = hookSystem.getHookCount('user:beforeSave');

// 获取钩子详细信息
const hooks = hookSystem.getHooks('user:beforeSave');

// 获取统计信息
const stats = hookSystem.getStats();
```

### 取消注册

```typescript
// 取消指定钩子
const hookId = hookSystem.register('temp', handler);
hookSystem.unregister('temp', hookId);

// 取消所有钩子
hookSystem.unregister('temp');

// 清空所有钩子
hookSystem.clear();
```

---

## 🌐 全局单例

```typescript
import { getGlobalHookSystem } from './hook-system-skill';

const global1 = getGlobalHookSystem();
const global2 = getGlobalHookSystem();

console.log(global1 === global2); // true

// 在不同模块中共享同一个钩子系统
```

---

## 💡 实际应用场景

### 1. Web 请求中间件

```typescript
const middleware = createHookSystem();

// 认证中间件
middleware.register('request:before', async (req, ctx) => {
  const token = req.headers.authorization;
  if (!token) {
    middleware.abort(ctx);
    throw new Error('Unauthorized');
  }
  req.user = await verifyToken(token);
  return req;
}, { priority: 100, canAbort: true });

// 日志中间件
middleware.register('request:before', (req) => {
  console.log(`${req.method} ${req.path}`);
  return req;
}, { priority: 50 });

// CORS 中间件
middleware.register('request:before', (req) => {
  req.headers['Access-Control-Allow-Origin'] = '*';
  return req;
}, { priority: 10 });

// 使用
await middleware.execute('request:before', request);
```

### 2. 数据管道处理

```typescript
const pipeline = createHookSystem();

pipeline.register('data:validate', (data) => {
  const valid = data.every(item => item.id);
  if (!valid) throw new Error('Invalid data');
  return data;
}, { priority: 30 });

pipeline.register('data:transform', (data) => {
  return data.map(item => ({ ...item, processed: true }));
}, { priority: 20 });

pipeline.register('data:enrich', async (data) => {
  return Promise.all(data.map(async item => ({
    ...item,
    extra: await fetchExtraData(item.id)
  })));
}, { priority: 10 });

// 使用
const result = await pipeline.execute('data:validate', rawData);
```

### 3. 生命周期钩子

```typescript
const lifecycle = createHookSystem();

lifecycle.register('app:beforeStart', () => {
  console.log('应用启动前准备...');
});

lifecycle.register('app:afterStart', () => {
  console.log('应用已启动');
});

lifecycle.register('app:beforeStop', () => {
  console.log('应用停止前清理...');
});

// 使用
await lifecycle.execute('app:beforeStart', {});
await startApplication();
await lifecycle.execute('app:afterStart', {});
```

---

## 📈 统计信息

```typescript
interface HookStats {
  totalHooks: number;          // 总钩子数
  totalRegisteredHooks: number; // 总注册钩子 ID 数
  totalExecutions: number;      // 总执行次数
  executionMap: Record<string, number>; // 各钩子的执行次数
}

const stats = hookSystem.getStats();
console.log(stats);
```

---

## ⚠️ 注意事项

1. **钩子执行顺序**: 按优先级降序执行 (优先级高的先执行)
2. **数据传递**: 每个钩子的返回值会作为下一个钩子的输入
3. **错误处理**: 单个钩子失败不会影响其他钩子执行
4. **一次性钩子**: 执行后自动从注册列表中移除
5. **超时控制**: 超时后抛出错误，但不影响其他钩子

---

## 🧪 运行示例

```bash
# 运行使用示例
npx tsx src/skills/hook-system-skill.examples.ts
```

---

## 📝 文件清单

- `hook-system-skill.ts` - 钩子系统核心实现
- `hook-system-skill.examples.ts` - 使用示例
- `HOOK-SYSTEM-README.md` - 本文档

---

**作者:** Axon/KAEL  
**版本:** 1.0.0  
**最后更新:** 2026-03-13
