# Decorator Pattern Skill - ACE

**装饰器模式工具** - 用于动态增强对象/函数功能

---

## 📋 概述

装饰器模式是一种结构型设计模式，允许在不修改原始对象结构的情况下，动态地为对象添加新功能。本实现提供了完整的装饰器模式工具集，支持函数装饰、对象装饰、链式装饰和条件装饰。

### 核心特性

| 功能 | 描述 | 状态 |
|------|------|------|
| **功能装饰** | 为对象/函数添加新功能而不修改原始结构 | ✅ |
| **链式装饰** | 支持多个装饰器链式组合 | ✅ |
| **条件装饰** | 基于条件动态应用装饰器 | ✅ |
| **类型安全** | 完整的 TypeScript 类型支持 | ✅ |
| **元数据追踪** | 自动记录装饰器应用历史 | ✅ |

---

## 🚀 快速开始

### 1. 基础函数装饰

```typescript
import { decorateFunction, createLoggerDecorator, createCacheDecorator } from './decorator-pattern-skill';

// 原始函数
const expensiveCalculation = (n: number): number => {
  console.log('Calculating...');
  return n * n;
};

// 添加日志和缓存装饰
const decoratedFn = decorateFunction(
  expensiveCalculation,
  createLoggerDecorator(),
  createCacheDecorator()
);

// 使用
decoratedFn(5); // 第一次：计算并缓存
decoratedFn(5); // 第二次：从缓存返回
```

### 2. 对象装饰

```typescript
import { decorateObject, PerformanceDecorator } from './decorator-pattern-skill';

class DataService {
  fetchData(id: string): string {
    return `Data for ${id}`;
  }
}

const service = new DataService();
const monitoredService = decorateObject(service, new PerformanceDecorator());

monitoredService.fetchData('123'); // 自动记录执行时间
```

### 3. 条件装饰

```typescript
import { decorateIf, createLoggerDecorator } from './decorator-pattern-skill';

const isDevelopment = true;

const apiCall = async (url: string) => {
  return fetch(url);
};

// 仅在开发环境添加日志
const decoratedApi = decorateIf(
  apiCall,
  createLoggerDecorator('dev-logger'),
  () => isDevelopment
);
```

---

## 📚 API 参考

### 核心类

#### DecoratorManager<T>

对象装饰器管理器，用于管理对象装饰器的注册和应用。

```typescript
const manager = new DecoratorManager(targetObject);
manager.register(decorator1);
manager.register(decorator2);
manager.applyAll();
const result = manager.getResult();
```

**主要方法:**
- `register(decorator)` - 注册单个装饰器
- `registerMany(decorators)` - 注册多个装饰器
- `apply(name)` - 应用指定装饰器
- `applyAll()` - 应用所有已注册装饰器
- `applyIf(name, condition)` - 条件应用装饰器
- `chain(...names)` - 链式应用装饰器
- `getResult()` - 获取装饰后的对象
- `getAppliedDecorators()` - 获取已应用的装饰器列表
- `reset()` - 重置到初始状态

#### FunctionDecoratorChain<P, R>

函数装饰器链，用于组合多个函数装饰器。

```typescript
const chain = new FunctionDecoratorChain();
chain.use(decorator1);
chain.use(decorator2);
const decoratedFn = chain.apply(originalFn);
```

**主要方法:**
- `use(decorator)` - 添加装饰器
- `useMany(decorators)` - 添加多个装饰器
- `apply(fn)` - 应用所有装饰器到函数
- `applyIf(fn, decorator, condition)` - 条件应用装饰器
- `getStats()` - 获取装饰统计
- `reset()` - 重置状态

### 内置装饰器

#### 函数装饰器

| 装饰器 | 描述 | 参数 |
|--------|------|------|
| `createLoggerDecorator(name?)` | 添加日志功能 | name: 装饰器名称 |
| `createCacheDecorator(cache?, name?)` | 添加缓存功能 | cache: Map 实例, name: 名称 |
| `createRetryDecorator(maxRetries?, delayMs?, name?)` | 添加重试功能 | maxRetries: 最大重试次数, delayMs: 重试延迟 |
| `createValidateDecorator(validator, name?)` | 添加验证功能 | validator: 验证函数, name: 名称 |

#### 对象装饰器

| 装饰器 | 描述 | 参数 |
|--------|------|------|
| `PerformanceDecorator(name?)` | 性能监控 | name: 装饰器名称 |
| `PermissionDecorator(checkPermission, name?)` | 权限控制 | checkPermission: 权限检查函数, name: 名称 |

### 便捷函数

```typescript
// 快速装饰对象
decorateObject(target, ...decorators)

// 快速装饰函数
decorateFunction(fn, ...decorators)

// 条件装饰函数
decorateIf(fn, decorator, condition)

// 创建条件装饰器
createConditionalDecorator({ condition, decorator, elseDecorator })
```

---

## 🎯 使用场景

### 场景 1: API 客户端增强

```typescript
const fetchUser = async (userId: string) => {
  return api.get(`/users/${userId}`);
};

const enhancedFetch = decorateFunction(
  fetchUser,
  createLoggerDecorator('API'),
  createCacheDecorator(new Map(), 'users'),
  createRetryDecorator(3, 1000)
);
```

### 场景 2: 表单验证

```typescript
const submitForm = (data: FormData) => {
  return api.post('/submit', data);
};

const validatedSubmit = decorateFunction(
  submitForm,
  createValidateDecorator((data) => {
    if (!data.email?.includes('@')) return 'Invalid email';
    if (!data.password || data.password.length < 6) return 'Password too short';
    return true;
  })
);
```

### 场景 3: 权限控制

```typescript
const permissionDecorator = new PermissionDecorator(
  (user, permission) => user.permissions.includes(permission)
);
permissionDecorator.require('deleteUser', 'admin:delete');

const securedService = decorateObject(new UserService(), permissionDecorator);
```

### 场景 4: 性能监控

```typescript
const perfMonitor = new PerformanceDecorator();
const monitoredService = decorateObject(new DataService(), perfMonitor);

// 执行操作后获取统计
const stats = perfMonitor.getStats();
console.log(stats);
// { fetchData: { count: 10, avg: 45.2, min: 30, max: 120 } }
```

### 场景 5: 环境感知功能

```typescript
const config = {
  isDevelopment: true,
  enableLogging: true,
  enableCache: false
};

const loggingDecorator = createConditionalDecorator({
  condition: () => config.enableLogging,
  decorator: createLoggerDecorator()
});

const cacheDecorator = createConditionalDecorator({
  condition: () => config.enableCache,
  decorator: createCacheDecorator()
});
```

---

## 🔧 自定义装饰器

### 创建函数装饰器

```typescript
import { FunctionDecorator } from './decorator-pattern-skill';

function createCustomDecorator<P extends any[], R>(
  name: string,
  handler: (fn: (...args: P) => R) => (...args: P) => R
): FunctionDecorator<P, R> {
  return {
    name,
    apply: handler
  };
}

// 使用示例：限流装饰器
const rateLimiter = createCustomDecorator(
  'rate-limiter',
  (fn) => {
    const calls: number[] = [];
    return (...args) => {
      const now = Date.now();
      if (calls.filter(t => now - t < 1000).length >= 10) {
        throw new Error('Rate limit exceeded');
      }
      calls.push(now);
      return fn(...args);
    };
  }
);
```

### 创建对象装饰器

```typescript
import { ObjectDecorator } from './decorator-pattern-skill';

class CustomObjectDecorator<T extends object> extends ObjectDecorator<T> {
  constructor(name: string = 'custom') {
    super(name);
  }

  apply(target: T): T {
    const decorated = target as any;
    
    // 添加新功能
    decorated.customMethod = () => {
      console.log('Custom method called');
    };

    return decorated;
  }
}
```

---

## 📊 装饰器元数据

所有装饰器都会自动记录元数据：

```typescript
const result = manager.getResult();

// 查询装饰器信息
console.log(result.getDecorators());
// [{ name: 'logger', appliedAt: 1234567890, type: 'function' }]

// 检查是否已应用某装饰器
console.log(result.hasDecorator('logger')); // true
console.log(result.hasDecorator('cache'));  // false

// 访问原始对象
console.log(result.original);
```

---

## ⚠️ 注意事项

### 1. 装饰器顺序

装饰器的应用顺序很重要，后应用的装饰器会包裹先应用的装饰器：

```typescript
// 顺序：logger -> cache -> retry
decorateFunction(fn, logger, cache, retry);

// 调用流程：logger(cache(retry(fn)))
```

### 2. 异步函数

所有装饰器都支持异步函数：

```typescript
const asyncFn = async (data: any) => {
  return await api.post('/endpoint', data);
};

const decoratedAsync = decorateFunction(
  asyncFn,
  createLoggerDecorator(),
  createRetryDecorator()
);

await decoratedAsync({ key: 'value' });
```

### 3. 类型安全

使用 TypeScript 时，装饰器会保持函数的类型签名：

```typescript
const fn: (a: number, b: string) => boolean = (a, b) => true;

const decorated = decorateFunction(fn, createLoggerDecorator());
// decorated 的类型仍然是 (a: number, b: string) => boolean
```

### 4. 性能考虑

- 缓存装饰器会占用内存，注意缓存大小
- 日志装饰器会影响性能，生产环境建议禁用
- 重试装饰器会增加请求延迟

---

## 📝 完整示例

查看完整使用示例：

```bash
# 运行所有示例场景
npx ts-node src/skills/examples/decorator-pattern-examples.ts
```

示例场景包括：
1. API 客户端增强
2. 表单验证
3. 权限控制
4. 性能监控
5. 环境感知功能
6. 自定义限流器
7. 数据处理管道
8. 可观察模式

---

## 📄 许可证

MIT License

---

**Author:** Axon  
**Version:** 1.0.0  
**Last Updated:** 2026-03-13
