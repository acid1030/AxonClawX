# 责任链模式工具 - 使用示例

## 快速开始

```typescript
import { createChain, BaseHandler, type IRequest, type IHandler } from './chain-of-responsibility-skill';

// 1. 创建简单处理器
const loggingHandler: IHandler = {
  name: 'LoggingHandler',
  canHandle: (req) => true,
  handle: (req, next) => {
    console.log(`处理请求：${req.type}`);
    return next();
  }
};

// 2. 构建责任链
const chain = createChain('MyChain')
  .use(loggingHandler)
  .use({
    name: 'MyHandler',
    canHandle: (req) => req.type === 'GET',
    handle: (req, next) => {
      req.result = { data: 'Hello World' };
      req.handled = true;
      return req.result;
    }
  })
  .build();

// 3. 执行请求
const request: IRequest = {
  type: 'GET',
  data: { id: 1 }
};

const result = chain.execute(request);
console.log(result); // { data: 'Hello World' }
```

## 完整示例：API 请求处理管道

```typescript
import {
  createChain,
  BaseHandler,
  LoggingHandler,
  AuthHandler,
  ValidationHandler,
  CacheHandler,
  type IRequest
} from './chain-of-responsibility-skill';

// 定义验证函数
const validateToken = (token: string): boolean => {
  return token.startsWith('Bearer ') && token.length > 20;
};

const validateBody = (req: IRequest): boolean => {
  if (req.type === 'POST' && !req.data) {
    throw new Error('POST 请求必须有 body');
  }
  return true;
};

// 构建完整的 API 处理链
const apiChain = createChain('API Pipeline')
  .use(new LoggingHandler())                    // 1. 日志记录
  .use(new AuthHandler(validateToken))          // 2. 认证
  .use(
    new ValidationHandler([validateBody])       // 3. 验证
      .addValidator((req) => req.data?.id !== undefined)
  )
  .use(new CacheHandler(60000))                 // 4. 缓存 (1 分钟)
  .withErrorHandler((error, req) => {           // 5. 错误处理
    console.error('请求失败:', error.message);
    return { error: error.message, status: 500 };
  })
  .build();

// 使用示例
const request: IRequest = {
  type: 'GET',
  data: { id: 123 },
  metadata: {
    token: 'Bearer abc123xyz789',
    requiresAuth: true
  }
};

const response = apiChain.execute(request);
```

## 内置处理器

### LoggingHandler - 日志记录
```typescript
import { LoggingHandler } from './chain-of-responsibility-skill';

const chain = createChain('WithLogging')
  .use(new LoggingHandler())
  .build();
```

### AuthHandler - 认证
```typescript
import { AuthHandler } from './chain-of-responsibility-skill';

const authHandler = new AuthHandler((token) => {
  // 验证 token 逻辑
  return isValidToken(token);
});

const chain = createChain('WithAuth')
  .use(authHandler)
  .build();
```

### ValidationHandler - 验证
```typescript
import { ValidationHandler } from './chain-of-responsibility-skill';

const validationHandler = new ValidationHandler([
  (req) => req.data !== null,
  (req) => req.type !== 'POST' || req.data.id !== undefined
]);

const chain = createChain('WithValidation')
  .use(validationHandler)
  .build();
```

### CacheHandler - 缓存
```typescript
import { CacheHandler } from './chain-of-responsibility-skill';

// 缓存 5 分钟
const cacheHandler = new CacheHandler(5 * 60 * 1000);

const chain = createChain('WithCache')
  .use(cacheHandler)
  .build();
```

## 动态组合

### 串行组合
```typescript
import { HandlerCompositor, createChain } from './chain-of-responsibility-skill';

const handler1: IHandler = { /* ... */ };
const handler2: IHandler = { /* ... */ };
const handler3: IHandler = { /* ... */ };

// 按顺序执行所有处理器
const serialHandler = HandlerCompositor.serial(handler1, handler2, handler3);

const chain = createChain('SerialChain')
  .use(serialHandler)
  .build();
```

### 并行组合
```typescript
import { HandlerCompositor } from './chain-of-responsibility-skill';

// 同时执行所有处理器，返回第一个成功结果
const parallelHandler = HandlerCompositor.parallel(handler1, handler2, handler3);
```

### 条件组合
```typescript
import { HandlerCompositor } from './chain-of-responsibility-skill';

const conditionalHandler = HandlerCompositor.conditional(
  (req) => req.data?.priority === 'high',  // 条件
  highPriorityHandler,                      // 条件为真时使用
  normalHandler                             // 条件为假时使用 (可选)
);
```

### 重试组合
```typescript
import { HandlerCompositor } from './chain-of-responsibility-skill';

// 失败时自动重试，最多 5 次
const retryHandler = HandlerCompositor.retry(flakyHandler, 5);
```

## 运行时动态修改

```typescript
import { createChain, type IHandler } from './chain-of-responsibility-skill';

const chain = createChain('DynamicChain')
  .use(initialHandler)
  .build();

// 添加处理器到链尾
chain.add(newHandler);

// 添加处理器到指定位置
chain.addAt(1, middlewareHandler);

// 添加处理器到链头
chain.addFirst(loggingHandler);

// 移除处理器
chain.remove(oldHandler);

// 清空所有处理器
chain.clear();

// 获取当前处理器列表
const handlers = chain.getHandlers();
console.log(`当前有 ${handlers.length} 个处理器`);
```

## 自定义处理器

```typescript
import { BaseHandler, type IRequest } from './chain-of-responsibility-skill';

class MyCustomHandler extends BaseHandler {
  constructor() {
    super({ 
      name: 'MyCustomHandler',
      priority: 50,      // 优先级 (可选)
      optional: true     // 是否可选 (可选)
    });
  }
  
  canHandle(request: IRequest): boolean {
    // 判断是否处理此请求
    return request.type === 'CUSTOM';
  }
  
  handle(request: IRequest, next: () => any): any {
    // 处理逻辑
    console.log('处理自定义请求');
    
    // 调用下一个处理器
    const result = next();
    
    // 后处理
    request.result = { ...result, processed: true };
    request.handled = true;
    
    return request.result;
  }
}

// 使用自定义处理器
const chain = createChain('WithCustom')
  .use(new MyCustomHandler())
  .build();
```

## 短路模式

```typescript
import { createChain } from './chain-of-responsibility-skill';

const chain = createChain('ShortCircuitChain')
  .withShortCircuit()  // 启用短路模式
  .use(handler1)
  .use(handler2)
  .use(handler3)
  .build();

// 当某个处理器设置 request.handled = true 时，立即停止执行后续处理器
```

## 错误处理

```typescript
import { createChain } from './chain-of-responsibility-skill';

const chain = createChain('WithErrorHandling')
  .use(someHandler)
  .withErrorHandler((error, request) => {
    // 统一错误处理
    console.error('链执行错误:', error);
    
    // 返回错误响应
    return {
      success: false,
      error: error.message,
      timestamp: Date.now()
    };
  })
  .build();
```

## 异步执行

```typescript
import { createChain } from './chain-of-responsibility-skill';

const chain = createChain('AsyncChain')
  .use(asyncHandler1)
  .use(asyncHandler2)
  .build();

// 异步执行
const result = await chain.executeAsync({
  type: 'ASYNC',
  data: { /* ... */ }
});
```

## 优先级排序

处理器会按照 `priority` 自动排序 (数字越小优先级越高):

```typescript
import { createChain, type IHandler } from './chain-of-responsibility-skill';

const highPriority: IHandler = {
  name: 'HighPriority',
  priority: 1,  // 高优先级
  canHandle: () => true,
  handle: (req, next) => { /* ... */ }
};

const lowPriority: IHandler = {
  name: 'LowPriority',
  priority: 100,  // 低优先级
  canHandle: () => true,
  handle: (req, next) => { /* ... */ }
};

const chain = createChain('PriorityChain')
  .use(lowPriority)   // 先添加
  .use(highPriority)  // 后添加
  .build();

// 实际执行顺序：HighPriority → LowPriority (按优先级排序)
```

## 适用场景

- ✅ **API 请求处理管道** - 认证 → 验证 → 缓存 → 业务逻辑
- ✅ **事件处理系统** - 多个处理器按顺序处理同一事件
- ✅ **数据验证流水线** - 多层验证规则
- ✅ **中间件系统** - Express/Koa 风格的中间件
- ✅ **插件架构** - 动态加载/卸载插件处理器
- ✅ **日志和监控** - 在请求前后插入日志/监控处理器

## 最佳实践

1. **保持处理器单一职责** - 每个处理器只做一件事
2. **使用优先级控制顺序** - 认证 > 验证 > 缓存 > 业务逻辑
3. **合理设置 optional** - 非关键处理器设为可选
4. **统一错误处理** - 使用 `withErrorHandler` 集中处理错误
5. **使用 LoggingHandler** - 便于调试和监控
6. **缓存热点请求** - 使用 CacheHandler 提升性能
