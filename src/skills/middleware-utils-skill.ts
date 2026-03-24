/**
 * HTTP 中间件工具技能
 * 
 * 功能:
 * 1. 中间件创建 - 工厂函数创建标准中间件
 * 2. 中间件组合 - 链式组合多个中间件
 * 3. 请求/响应拦截 - 拦截和修改请求/响应
 * 
 * @author KAEL
 * @version 1.0.0
 */

// ============ 类型定义 ============

export interface MiddlewareContext {
  request: Request;
  response: Response;
  next: () => Promise<void>;
  state: Record<string, any>;
}

export type Middleware = (ctx: MiddlewareContext) => Promise<void>;

export interface MiddlewareOptions {
  name?: string;
  priority?: number;
  enabled?: boolean;
}

export interface MiddlewareChain {
  middlewares: Array<{ middleware: Middleware; options: MiddlewareOptions }>;
  use: (middleware: Middleware, options?: MiddlewareOptions) => MiddlewareChain;
  execute: (ctx: MiddlewareContext) => Promise<void>;
}

// ============ 中间件工厂 ============

/**
 * 创建日志中间件
 */
export function createLoggerMiddleware(options: { level?: 'info' | 'warn' | 'error'; format?: 'json' | 'text' } = {}): Middleware {
  const { level = 'info', format = 'text' } = options;
  
  return async (ctx: MiddlewareContext) => {
    const timestamp = new Date().toISOString();
    const method = ctx.request.method;
    const url = ctx.request.url;
    
    const logEntry = format === 'json' 
      ? JSON.stringify({ timestamp, method, url, level })
      : `[${timestamp}] ${method} ${url}`;
    
    console.log(logEntry);
    await ctx.next();
  };
}

/**
 * 创建认证中间件
 */
export function createAuthMiddleware(options: { tokenHeader?: string; required?: boolean } = {}): Middleware {
  const { tokenHeader = 'authorization', required = true } = options;
  
  return async (ctx: MiddlewareContext) => {
    const token = ctx.request.headers.get(tokenHeader);
    
    if (!token) {
      if (required) {
        ctx.response = new Response('Unauthorized', { status: 401 });
        return;
      }
      await ctx.next();
      return;
    }
    
    // 简单的 token 验证逻辑 (可扩展为 JWT 验证等)
    if (!token.startsWith('Bearer ')) {
      ctx.response = new Response('Invalid token format', { status: 401 });
      return;
    }
    
    ctx.state.user = { token: token.slice(7) };
    await ctx.next();
  };
}

/**
 * 创建 CORS 中间件
 */
export function createCORSMiddleware(options: { 
  origin?: string; 
  methods?: string[]; 
  allowedHeaders?: string[];
  credentials?: boolean;
} = {}): Middleware {
  const { 
    origin = '*', 
    methods = ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders = ['Content-Type', 'Authorization'],
    credentials = false
  } = options;
  
  return async (ctx: MiddlewareContext) => {
    // 处理预检请求
    if (ctx.request.method === 'OPTIONS') {
      ctx.response = new Response(null, { status: 204 });
      ctx.response.headers.set('Access-Control-Allow-Origin', origin);
      ctx.response.headers.set('Access-Control-Allow-Methods', methods.join(', '));
      ctx.response.headers.set('Access-Control-Allow-Headers', allowedHeaders.join(', '));
      if (credentials) {
        ctx.response.headers.set('Access-Control-Allow-Credentials', 'true');
      }
      return;
    }
    
    await ctx.next();
    
    // 添加 CORS 头到响应
    ctx.response.headers.set('Access-Control-Allow-Origin', origin);
    if (credentials) {
      ctx.response.headers.set('Access-Control-Allow-Credentials', 'true');
    }
  };
}

/**
 * 创建速率限制中间件
 */
export function createRateLimitMiddleware(options: { 
  windowMs?: number; 
  maxRequests?: number;
  keyGenerator?: (req: Request) => string;
} = {}): Middleware {
  const { 
    windowMs = 60000, 
    maxRequests = 100,
    keyGenerator = (req) => req.headers.get('x-forwarded-for') || 'unknown'
  } = options;
  
  const requestCounts = new Map<string, { count: number; resetTime: number }>();
  
  return async (ctx: MiddlewareContext) => {
    const key = keyGenerator(ctx.request);
    const now = Date.now();
    
    let record = requestCounts.get(key);
    
    if (!record || now > record.resetTime) {
      record = { count: 1, resetTime: now + windowMs };
      requestCounts.set(key, record);
    } else {
      record.count++;
    }
    
    if (record.count > maxRequests) {
      ctx.response = new Response('Too Many Requests', { status: 429 });
      ctx.response.headers.set('Retry-After', Math.ceil((record.resetTime - now) / 1000).toString());
      return;
    }
    
    ctx.response.headers.set('X-RateLimit-Limit', maxRequests.toString());
    ctx.response.headers.set('X-RateLimit-Remaining', (maxRequests - record.count).toString());
    
    await ctx.next();
  };
}

/**
 * 创建错误处理中间件
 */
export function createErrorHandlingMiddleware(options: { 
  logErrors?: boolean;
  customHandler?: (error: Error, ctx: MiddlewareContext) => Response;
} = {}): Middleware {
  const { logErrors = true, customHandler } = options;
  
  return async (ctx: MiddlewareContext) => {
    try {
      await ctx.next();
    } catch (error) {
      if (logErrors) {
        console.error('[Middleware Error]', error);
      }
      
      if (customHandler) {
        ctx.response = customHandler(error as Error, ctx);
      } else {
        ctx.response = new Response(
          JSON.stringify({ error: 'Internal Server Error', message: (error as Error).message }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }
  };
}

/**
 * 创建请求体解析中间件
 */
export function createBodyParserMiddleware(): Middleware {
  return async (ctx: MiddlewareContext) => {
    const contentType = ctx.request.headers.get('content-type') || '';
    
    if (contentType.includes('application/json')) {
      try {
        ctx.state.body = await ctx.request.json();
      } catch {
        ctx.response = new Response('Invalid JSON', { status: 400 });
        return;
      }
    } else if (contentType.includes('application/x-www-form-urlencoded')) {
      try {
        const text = await ctx.request.text();
        ctx.state.body = Object.fromEntries(new URLSearchParams(text));
      } catch {
        ctx.response = new Response('Invalid form data', { status: 400 });
        return;
      }
    }
    
    await ctx.next();
  };
}

/**
 * 创建响应时间中间件
 */
export function createResponseTimeMiddleware(): Middleware {
  return async (ctx: MiddlewareContext) => {
    const start = Date.now();
    
    await ctx.next();
    
    const duration = Date.now() - start;
    ctx.response.headers.set('X-Response-Time', `${duration}ms`);
  };
}

// ============ 中间件组合器 ============

/**
 * 创建中间件链
 */
export function createMiddlewareChain(): MiddlewareChain {
  const middlewares: Array<{ middleware: Middleware; options: MiddlewareOptions }> = [];
  
  return {
    middlewares,
    
    use(middleware: Middleware, options: MiddlewareOptions = {}): MiddlewareChain {
      middlewares.push({
        middleware,
        options: {
          name: options.name || `middleware_${middlewares.length}`,
          priority: options.priority ?? 0,
          enabled: options.enabled ?? true
        }
      });
      
      // 按优先级排序
      middlewares.sort((a, b) => (b.options.priority || 0) - (a.options.priority || 0));
      
      return this;
    },
    
    async execute(ctx: MiddlewareContext): Promise<void> {
      let index = 0;
      
      const dispatch = async (i: number): Promise<void> => {
        if (i <= index) {
          throw new Error('next() called multiple times');
        }
        
        index = i;
        
        if (i === middlewares.length) {
          return;
        }
        
        const { middleware, options } = middlewares[i];
        
        if (!options.enabled) {
          return dispatch(i + 1);
        }
        
        await middleware({
          ...ctx,
          next: () => dispatch(i + 1)
        });
      };
      
      await dispatch(0);
    }
  };
}

/**
 * 组合多个中间件 (简化版)
 */
export function composeMiddlewares(...middlewares: Middleware[]): Middleware {
  return async (ctx: MiddlewareContext) => {
    const chain = createMiddlewareChain();
    middlewares.forEach(mw => chain.use(mw));
    await chain.execute(ctx);
  };
}

// ============ 请求/响应拦截器 ============

/**
 * 创建请求拦截器
 */
export function createRequestInterceptor(
  interceptor: (request: Request, ctx: MiddlewareContext) => Request | Promise<Request>
): Middleware {
  return async (ctx: MiddlewareContext) => {
    ctx.request = await interceptor(ctx.request, ctx);
    await ctx.next();
  };
}

/**
 * 创建响应拦截器
 */
export function createResponseInterceptor(
  interceptor: (response: Response, ctx: MiddlewareContext) => Response | Promise<Response>
): Middleware {
  return async (ctx: MiddlewareContext) => {
    await ctx.next();
    ctx.response = await interceptor(ctx.response, ctx);
  };
}

/**
 * 创建条件拦截器
 */
export function createConditionalInterceptor(
  condition: (ctx: MiddlewareContext) => boolean | Promise<boolean>,
  interceptor: Middleware
): Middleware {
  return async (ctx: MiddlewareContext) => {
    if (await condition(ctx)) {
      return interceptor(ctx);
    }
    await ctx.next();
  };
}

// ============ 实用工具函数 ============

/**
 * 路径匹配器
 */
export function pathMatcher(pattern: string | RegExp): (ctx: MiddlewareContext) => boolean {
  return (ctx: MiddlewareContext) => {
    const url = new URL(ctx.request.url);
    const pathname = url.pathname;
    
    if (pattern instanceof RegExp) {
      return pattern.test(pathname);
    }
    
    // 支持通配符
    if (pattern.includes('*')) {
      const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
      return regex.test(pathname);
    }
    
    return pathname === pattern;
  };
}

/**
 * 方法匹配器
 */
export function methodMatcher(...methods: string[]): (ctx: MiddlewareContext) => boolean {
  const upperMethods = methods.map(m => m.toUpperCase());
  return (ctx: MiddlewareContext) => upperMethods.includes(ctx.request.method.toUpperCase());
}

/**
 * 创建路由中间件
 */
export function createRouterMiddleware(): {
  route: (path: string | RegExp, ...middlewares: Middleware[]) => void;
  middleware: Middleware;
} {
  const routes: Array<{ 
    path: string | RegExp; 
    middlewares: Middleware[];
    matcher: (ctx: MiddlewareContext) => boolean;
  }> = [];
  
  return {
    route(path: string | RegExp, ...middlewares: Middleware[]) {
      routes.push({
        path,
        middlewares,
        matcher: pathMatcher(path)
      });
    },
    
    async middleware(ctx: MiddlewareContext) {
      for (const route of routes) {
        if (route.matcher(ctx)) {
          const chain = createMiddlewareChain();
          route.middlewares.forEach(mw => chain.use(mw));
          await chain.execute(ctx);
          return;
        }
      }
      await ctx.next();
    }
  };
}

// ============ 使用示例 ============

/*
// 示例 1: 基础中间件链
const chain = createMiddlewareChain()
  .use(createLoggerMiddleware({ level: 'info', format: 'json' }))
  .use(createResponseTimeMiddleware())
  .use(createCORSMiddleware({ origin: 'https://example.com' }))
  .use(createAuthMiddleware({ required: false }))
  .use(createBodyParserMiddleware());

// 执行
const ctx: MiddlewareContext = {
  request: new Request('https://api.example.com/users'),
  response: new Response(),
  next: async () => {},
  state: {}
};

await chain.execute(ctx);


// 示例 2: 路由系统
const router = createRouterMiddleware();

router.route('/api/users', 
  createAuthMiddleware(),
  async (ctx) => {
    ctx.response = new Response(JSON.stringify({ users: [] }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
);

router.route('/api/public/*',
  async (ctx) => {
    ctx.response = new Response('Public endpoint');
  }
);

await router.middleware(ctx);


// 示例 3: 请求/响应拦截
const apiClient = createMiddlewareChain()
  .use(createRequestInterceptor(async (req, ctx) => {
    // 添加认证头
    const newHeaders = new Headers(req.headers);
    newHeaders.set('X-API-Key', 'your-api-key');
    return new Request(req.url, { ...req, headers: newHeaders });
  }))
  .use(createResponseInterceptor(async (res, ctx) => {
    // 统一错误处理
    if (!res.ok) {
      const error = await res.json();
      throw new Error(`API Error: ${error.message}`);
    }
    return res;
  }));


// 示例 4: 条件中间件
const adminOnly = createConditionalInterceptor(
  (ctx) => ctx.request.url.includes('/admin'),
  createAuthMiddleware({ required: true })
);


// 示例 5: 组合中间件
const apiMiddleware = composeMiddlewares(
  createLoggerMiddleware(),
  createCORSMiddleware(),
  createRateLimitMiddleware({ maxRequests: 50 }),
  createErrorHandlingMiddleware()
);
*/

export default {
  // 工厂函数
  createLoggerMiddleware,
  createAuthMiddleware,
  createCORSMiddleware,
  createRateLimitMiddleware,
  createErrorHandlingMiddleware,
  createBodyParserMiddleware,
  createResponseTimeMiddleware,
  
  // 组合器
  createMiddlewareChain,
  composeMiddlewares,
  
  // 拦截器
  createRequestInterceptor,
  createResponseInterceptor,
  createConditionalInterceptor,
  
  // 工具
  pathMatcher,
  methodMatcher,
  createRouterMiddleware
};
