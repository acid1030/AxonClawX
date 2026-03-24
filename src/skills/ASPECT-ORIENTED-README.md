# 面向切面编程 (AOP) 技能

**作者:** KAEL  
**版本:** 1.0.0  
**创建时间:** 2026-03-13

---

## 📖 概述

本技能提供完整的 AOP (Aspect-Oriented Programming) 编程实现，支持：

1. **切面定义** - 模块化横切关注点
2. **通知类型** - Before/After/Around/Throw 四种通知
3. **织入机制** - 运行时动态代理织入

---

## 🚀 快速开始

### 1. 基础用法

```typescript
import {
  createWeaver,
  createAspect,
  beforeAdvice,
  afterReturningAdvice,
  aroundAdvice
} from './src/skills/aspect-oriented-skill';

// 创建织入器
const weaver = createWeaver({ debug: true });

// 定义切面
const loggingAspect = createAspect('Logging', {
  methodPattern: '*'  // 匹配所有方法
}, [
  beforeAdvice((jp) => {
    console.log(`调用 ${jp.methodName}`);
  }),
  afterReturningAdvice((jp, result) => {
    console.log(`${jp.methodName} 返回:`, result);
  })
]);

// 注册切面
weaver.registerAspect(loggingAspect);

// 创建代理对象
class UserService {
  getUser(id: number) {
    return { id, name: 'Alice' };
  }
}

const userService = weaver.createProxy(new UserService());

// 调用方法会自动应用切面
userService.getUser(123);
// 输出:
// [AOP] Executing: getUser with 1 args
// 调用 getUser
// getUser 返回：{ id: 123, name: 'Alice' }
```

---

## 📚 API 参考

### 核心接口

#### `createWeaver(config)`

创建 AOP 织入器。

```typescript
interface AopProxyConfig {
  debug?: boolean;    // 启用调试日志
  timeout?: number;   // 超时时间 (ms)
}
```

#### `createAspect(name, pointcut, advices)`

创建切面。

```typescript
interface Pointcut {
  classPattern?: string;    // 类名匹配 (支持通配符)
  methodPattern?: string;   // 方法名匹配 (支持通配符)
  matcher?: Function;       // 自定义匹配函数
}
```

### 通知类型

#### `beforeAdvice(handler, priority?)`

前置通知，在方法执行前运行。

```typescript
beforeAdvice((jp) => {
  console.log('方法参数:', jp.args);
  // 可以修改参数
  jp.setArgs(['new', 'args']);
});
```

#### `afterAdvice(handler, priority?)`

后置通知，在方法执行后运行 (无论是否抛出异常)。

```typescript
afterAdvice((jp) => {
  console.log('方法执行完成');
});
```

#### `afterReturningAdvice(handler, priority?)`

返回通知，在方法成功返回后运行。

```typescript
afterReturningAdvice((jp, result) => {
  console.log('返回值:', result);
});
```

#### `afterThrowingAdvice(handler, priority?)`

异常通知，在方法抛出异常后运行。

```typescript
afterThrowingAdvice((jp, error) => {
  console.error('捕获异常:', error);
});
```

#### `aroundAdvice(handler, priority?)`

环绕通知，完全包围方法执行。

```typescript
aroundAdvice(async (jp) => {
  console.log('Before');
  const result = await jp.proceed();  // 执行原方法
  console.log('After');
  return result;  // 可以修改返回值
});
```

---

## 🎯 内置切面

### 日志切面

```typescript
import { createLoggingAspect } from './aspect-oriented-skill';

weaver.registerAspect(createLoggingAspect({
  methodPattern: '*',
  logArgs: true,
  logResult: true
}));
```

### 性能监控切面

```typescript
import { createPerformanceAspect } from './aspect-oriented-skill';

weaver.registerAspect(createPerformanceAspect({
  methodPattern: '*',
  threshold: 100  // ms
}));
```

### 缓存切面

```typescript
import { createCacheAspect } from './aspect-oriented-skill';

weaver.registerAspect(createCacheAspect({
  methodPattern: 'get*',
  ttl: 60000,  // 1 分钟
  cacheKeyFn: (jp) => `${jp.methodName}:${JSON.stringify(jp.args)}`
}));
```

### 事务切面

```typescript
import { createTransactionAspect } from './aspect-oriented-skill';

weaver.registerAspect(createTransactionAspect({
  methodPattern: 'save*',
  beginTransaction: async () => db.beginTransaction(),
  commitTransaction: async () => db.commit(),
  rollbackTransaction: async () => db.rollback()
}));
```

### 权限验证切面

```typescript
import { createAuthAspect } from './aspect-oriented-skill';

weaver.registerAspect(createAuthAspect({
  methodPattern: '*',
  checkPermission: async (jp) => {
    const user = getCurrentUser();
    return user.hasPermission(jp.methodName);
  },
  onUnauthorized: (jp) => {
    throw new Error('Unauthorized access');
  }
}));
```

---

## 💡 使用场景

### 1. 日志记录

```typescript
const loggingAspect = createLoggingAspect();
weaver.registerAspect(loggingAspect);
```

### 2. 性能监控

```typescript
const perfAspect = createPerformanceAspect({ threshold: 100 });
weaver.registerAspect(perfAspect);
```

### 3. 参数验证

```typescript
const validationAspect = createAspect('Validation', {
  methodPattern: 'create*'
}, [
  beforeAdvice((jp) => {
    const [data] = jp.args;
    if (!data.email?.includes('@')) {
      throw new Error('Invalid email');
    }
  })
]);
```

### 4. 缓存

```typescript
const cacheAspect = createCacheAspect({
  methodPattern: 'get*',
  ttl: 300000
});
```

### 5. 事务管理

```typescript
const txAspect = createTransactionAspect({
  methodPattern: 'save*',
  beginTransaction: () => db.begin(),
  commitTransaction: () => db.commit(),
  rollbackTransaction: () => db.rollback()
});
```

### 6. 异常处理

```typescript
const errorAspect = createAspect('ErrorHandling', {
  methodPattern: '*'
}, [
  afterThrowingAdvice((jp, error) => {
    logError(error);
    sendAlert(error);
  })
]);
```

---

## 🔧 高级用法

### 组合多个切面

```typescript
weaver.registerAspect(createLoggingAspect());
weaver.registerAspect(createPerformanceAspect());
weaver.registerAspect(createCacheAspect());
weaver.registerAspect(createTransactionAspect());

// 所有切面会按优先级自动排序执行
```

### 自定义切点匹配

```typescript
const customAspect = createAspect('Custom', {
  matcher: (target, methodName) => {
    // 自定义匹配逻辑
    return target instanceof AdminService && methodName.startsWith('admin');
  }
}, [
  beforeAdvice((jp) => {
    console.log('Admin method called');
  })
]);
```

### 修改参数和返回值

```typescript
const transformAspect = createAspect('Transform', {
  methodPattern: '*'
}, [
  aroundAdvice(async (jp) => {
    // 修改参数
    jp.setArgs([transformInput(jp.args[0])]);
    
    // 执行原方法
    const result = await jp.proceed();
    
    // 修改返回值
    return transformOutput(result);
  })
]);
```

---

## ⚠️ 注意事项

1. **性能影响**: AOP 会增加方法调用开销，避免在性能敏感代码中使用过多切面
2. **调试困难**: 代理对象可能使调试复杂化，建议开发环境启用 `debug: true`
3. **异步支持**: 所有通知都支持异步函数，使用 `async/await` 即可
4. **优先级**: 数字越小优先级越高，`beforeAdvice` 默认优先级为 100

---

## 📝 运行示例

```bash
cd /Users/nike/.openclaw/workspace
npx ts-node src/skills/aspect-oriented-skill.ts
```

---

## 📋 总结

| 功能 | API | 描述 |
|------|-----|------|
| 创建织入器 | `createWeaver()` | 创建 AOP 织入器实例 |
| 创建切面 | `createAspect()` | 定义切面和通知 |
| 前置通知 | `beforeAdvice()` | 方法执行前运行 |
| 后置通知 | `afterAdvice()` | 方法执行后运行 |
| 返回通知 | `afterReturningAdvice()` | 方法返回后运行 |
| 异常通知 | `afterThrowingAdvice()` | 方法异常后运行 |
| 环绕通知 | `aroundAdvice()` | 包围方法执行 |
| 日志切面 | `createLoggingAspect()` | 自动日志记录 |
| 性能切面 | `createPerformanceAspect()` | 性能监控 |
| 缓存切面 | `createCacheAspect()` | 自动缓存 |
| 事务切面 | `createTransactionAspect()` | 事务管理 |
| 权限切面 | `createAuthAspect()` | 权限验证 |

---

**完成时间:** 5 分钟内  
**状态:** ✅ 已完成
