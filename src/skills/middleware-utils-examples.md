# HTTP 中间件工具技能 - 使用示例

## 快速开始

```typescript
import {
  createMiddlewareChain,
  createLoggerMiddleware,
  createAuthMiddleware,
  createCORSMiddleware,
  createBodyParserMiddleware,
  createErrorHandlingMiddleware
} from './middleware-utils-skill';
```

---

## 示例 1: 基础 API 中间件栈

```typescript
// 创建完整的 API 中间件栈
const apiMiddleware = createMiddlewareChain()
  .use(createLoggerMiddleware({ level: 'info', format: 'json' }), { priority: 10 })
  .use(createResponseTimeMiddleware(), { priority: 9 })
  .use(createCORSMiddleware({ 
    origin: 'https://myapp.com',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
  }), { priority: 8 })
  .use(createRateLimitMiddleware({ 
    windowMs: 60000, 
    maxRequests: 100 
  }), { priority: 7 })
  .use(createBodyParserMiddleware(), { priority: 6 })
  .use(createAuthMiddleware({ required: false }), { priority: 5 })
  .use(createErrorHandlingMiddleware({ logErrors: true }), { priority: 1 });

// 使用
const ctx: MiddlewareContext = {
  request: new Request('https://api.example.com/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'John' })
  }),
  response: new Response(),
  next: async () => {},
  state: {}
};

await apiMiddleware.execute(ctx);
console.log(ctx.response); // 处理后的响应
```

---

## 示例 2: 路由系统

```typescript
import { createRouterMiddleware, createAuthMiddleware } from './middleware-utils-skill';

const router = createRouterMiddleware();

// 公开路由
router.route('/api/public/*', 
  async (ctx) => {
    ctx.response = new Response(JSON.stringify({ public: true }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
);

// 需要认证的路由
router.route('/api/users', 
  createAuthMiddleware({ required: true }),
  async (ctx) => {
    const users = [{ id: 1, name: 'Alice' }];
    ctx.response = new Response(JSON.stringify(users), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
);

// 管理员路由
router.route('/admin/*', 
  createAuthMiddleware({ required: true }),
  createConditionalInterceptor(
    (ctx) => !ctx.state.user?.isAdmin,
    async (ctx) => {
      ctx.response = new Response('Forbidden', { status: 403 });
    }
  ),
  async (ctx) => {
    ctx.response = new Response('Admin panel');
  }
);

// 处理请求
await router.middleware(ctx);
```

---

## 示例 3: 请求/响应拦截

```typescript
import { 
  createRequestInterceptor, 
  createResponseInterceptor,
  createMiddlewareChain 
} from './middleware-utils-skill';

// API 客户端中间件
const apiClient = createMiddlewareChain()
  // 请求拦截：添加认证头
  .use(createRequestInterceptor(async (req, ctx) => {
    const newHeaders = new Headers(req.headers);
    newHeaders.set('X-API-Key', process.env.API_KEY || '');
    newHeaders.set('X-Request-ID', crypto.randomUUID());
    return new Request(req.url, { 
      method: req.method, 
      headers: newHeaders,
      body: req.body 
    });
  }))
  
  // 请求拦截：添加超时
  .use(createRequestInterceptor(async (req, ctx) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    
    ctx.state.abortController = controller;
    ctx.state.cleanup = () => clearTimeout(timeout);
    
    return req;
  }))
  
  // 响应拦截：统一错误处理
  .use(createResponseInterceptor(async (res, ctx) => {
    ctx.state.cleanup?.();
    
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(`API Error ${res.status}: ${errorData.message || res.statusText}`);
    }
    
    // 添加响应元数据
    const newHeaders = new Headers(res.headers);
    newHeaders.set('X-Processed-By', 'middleware-utils');
    return new Response(res.body, {
      status: res.status,
      headers: newHeaders
    });
  }));
```

---

## 示例 4: 条件中间件

```typescript
import { createConditionalInterceptor, pathMatcher, methodMatcher } from './middleware-utils-skill';

// 仅对 POST 请求应用速率限制
const rateLimitForPosts = createConditionalInterceptor(
  methodMatcher('POST'),
  createRateLimitMiddleware({ maxRequests: 10, windowMs: 60000 })
);

// 仅对管理路由应用严格认证
const adminAuth = createConditionalInterceptor(
  pathMatcher('/admin/*'),
  createAuthMiddleware({ required: true })
);

// 组合使用
const middleware = createMiddlewareChain()
  .use(rateLimitForPosts)
  .use(adminAuth)
  .use(createLoggerMiddleware());
```

---

## 示例 5: 自定义中间件

```typescript
import { Middleware, MiddlewareContext } from './middleware-utils-skill';

// 自定义缓存中间件
const cacheMiddleware: Middleware = async (ctx) => {
  const cacheKey = `http:${ctx.request.url}`;
  const cache = caches.default;
  
  // 尝试从缓存获取
  if (ctx.request.method === 'GET') {
    const cached = await cache.match(ctx.request);
    if (cached) {
      ctx.response = cached;
      ctx.state.fromCache = true;
      return;
    }
  }
  
  await ctx.next();
  
  // 缓存响应
  if (ctx.request.method === 'GET' && ctx.response.ok) {
    const cacheResponse = ctx.response.clone();
    ctx.state.waitUntil?.(cache.put(cacheKey, cacheResponse));
  }
};

// 自定义验证中间件
const validateUserMiddleware: Middleware = async (ctx) => {
  const body = ctx.state.body;
  
  if (!body?.email || !body?.password) {
    ctx.response = new Response(
      JSON.stringify({ error: 'Email and password required' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
    return;
  }
  
  // 邮箱格式验证
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(body.email)) {
    ctx.response = new Response(
      JSON.stringify({ error: 'Invalid email format' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
    return;
  }
  
  await ctx.next();
};

// 使用
const chain = createMiddlewareChain()
  .use(cacheMiddleware)
  .use(validateUserMiddleware);
```

---

## 示例 6: 完整 HTTP 服务器

```typescript
// 模拟 HTTP 服务器
async function handleRequest(request: Request): Promise<Response> {
  const chain = createMiddlewareChain()
    .use(createLoggerMiddleware({ format: 'json' }))
    .use(createResponseTimeMiddleware())
    .use(createCORSMiddleware())
    .use(createRateLimitMiddleware({ maxRequests: 100 }))
    .use(createBodyParserMiddleware())
    .use(createRouterMiddleware().middleware)
    .use(createErrorHandlingMiddleware());
  
  const ctx: MiddlewareContext = {
    request,
    response: new Response('Not Found', { status: 404 }),
    next: async () => {},
    state: {}
  };
  
  try {
    await chain.execute(ctx);
    return ctx.response;
  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Internal Server Error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// 部署 (如 Cloudflare Workers)
export default {
  async fetch(request: Request): Promise<Response> {
    return handleRequest(request);
  }
};
```

---

## 示例 7: 中间件优先级控制

```typescript
// 优先级数字越大，执行越早
const chain = createMiddlewareChain()
  .use(createLoggerMiddleware(), { name: 'logger', priority: 100 })      // 最先执行
  .use(createCORSMiddleware(), { name: 'cors', priority: 90 })
  .use(createRateLimitMiddleware(), { name: 'ratelimit', priority: 80 })
  .use(createBodyParserMiddleware(), { name: 'bodyparser', priority: 70 })
  .use(createAuthMiddleware(), { name: 'auth', priority: 60 })
  .use(async (ctx) => {
    // 业务逻辑 (优先级 0)
    ctx.response = new Response('OK');
  }, { name: 'handler', priority: 0 })
  .use(createErrorHandlingMiddleware(), { name: 'error', priority: -100 }); // 最后执行
```

---

## API 参考

### 工厂函数

| 函数 | 描述 | 参数 |
|------|------|------|
| `createLoggerMiddleware` | 日志记录 | `{ level, format }` |
| `createAuthMiddleware` | 认证验证 | `{ tokenHeader, required }` |
| `createCORSMiddleware` | CORS 处理 | `{ origin, methods, allowedHeaders, credentials }` |
| `createRateLimitMiddleware` | 速率限制 | `{ windowMs, maxRequests, keyGenerator }` |
| `createErrorHandlingMiddleware` | 错误处理 | `{ logErrors, customHandler }` |
| `createBodyParserMiddleware` | 请求体解析 | 无 |
| `createResponseTimeMiddleware` | 响应时间 | 无 |

### 组合器

| 函数 | 描述 |
|------|------|
| `createMiddlewareChain()` | 创建可链式调用的中间件链 |
| `composeMiddlewares(...middlewares)` | 组合多个中间件为单个 |

### 拦截器

| 函数 | 描述 |
|------|------|
| `createRequestInterceptor(fn)` | 拦截并修改请求 |
| `createResponseInterceptor(fn)` | 拦截并修改响应 |
| `createConditionalInterceptor(condition, middleware)` | 条件执行中间件 |

### 工具

| 函数 | 描述 |
|------|------|
| `pathMatcher(pattern)` | 路径匹配器 (支持通配符) |
| `methodMatcher(...methods)` | HTTP 方法匹配器 |
| `createRouterMiddleware()` | 创建路由中间件 |

---

## 最佳实践

1. **优先级设置**: 错误处理中间件应该优先级最低 (-100)，日志中间件优先级最高 (100)
2. **条件中间件**: 使用 `createConditionalInterceptor` 避免不必要的中间件执行
3. **错误处理**: 始终在最后添加错误处理中间件
4. **性能**: 速率限制和缓存中间件应该尽早执行
5. **可测试性**: 将中间件拆分为小函数，便于单元测试

---

**创建时间:** 2026-03-13  
**作者:** KAEL  
**版本:** 1.0.0
