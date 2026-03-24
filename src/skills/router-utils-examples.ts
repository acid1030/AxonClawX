/**
 * Router Utils Skill - 使用示例
 * 
 * 演示路由工具技能的各种使用场景
 */

import {
  createRouter,
  RouterUtils,
  loggingMiddleware,
  authMiddleware,
  rateLimitMiddleware,
  corsMiddleware,
  defineRoute,
  MiddlewareContext
} from './router-utils-skill';

// ==================== 示例 1: 基础路由匹配 ====================

function example1_basicRouting() {
  console.log('\n=== 示例 1: 基础路由匹配 ===\n');

  const router = createRouter();

  // 注册静态路由
  router.register({
    path: '/home',
    method: 'GET',
    handler: () => ({ page: 'home' })
  });

  // 注册动态参数路由
  router.register({
    path: '/users/:id',
    method: 'GET',
    handler: (ctx) => ({ userId: ctx.params.id })
  });

  // 注册多参数路由
  router.register({
    path: '/posts/:postId/comments/:commentId',
    method: 'GET',
    handler: (ctx) => ({
      postId: ctx.params.postId,
      commentId: ctx.params.commentId
    })
  });

  // 测试匹配
  const tests = [
    { path: '/home', method: 'GET' },
    { path: '/users/123', method: 'GET' },
    { path: '/posts/456/comments/789', method: 'GET' },
    { path: '/notfound', method: 'GET' }
  ];

  tests.forEach(({ path, method }) => {
    const result = router.match(path, method);
    console.log(`${method} ${path}:`);
    console.log(`  Matched: ${result.matched}`);
    if (result.matched) {
      console.log(`  Params:`, result.params);
    } else {
      console.log(`  Error: ${result.error}`);
    }
  });
}

// ==================== 示例 2: 可选参数 ====================

function example2_optionalParams() {
  console.log('\n=== 示例 2: 可选参数 ===\n');

  const router = createRouter();

  // 可选参数路由
  router.register({
    path: '/posts/:id/comments/:commentId?',
    method: 'GET',
    handler: (ctx) => ({
      postId: ctx.params.id,
      commentId: ctx.params.commentId || 'all'
    })
  });

  // 测试
  const tests = [
    '/posts/123',
    '/posts/123/comments/456'
  ];

  tests.forEach(path => {
    const result = router.match(path, 'GET');
    console.log(`GET ${path}:`);
    if (result.matched) {
      console.log(`  Params:`, result.params);
    }
  });
}

// ==================== 示例 3: 通配符路由 ====================

function example3_wildcardRoutes() {
  console.log('\n=== 示例 3: 通配符路由 ===\n');

  const router = createRouter();

  // 通配符路由 - 匹配所有路径
  router.register({
    path: '/files/*',
    method: 'GET',
    handler: (ctx) => ({
      path: ctx.params[0]
    })
  });

  // 测试
  const tests = [
    '/files/documents/report.pdf',
    '/files/images/logo.png',
    '/files/deep/nested/folder/file.txt'
  ];

  tests.forEach(path => {
    const result = router.match(path, 'GET');
    console.log(`GET ${path}:`);
    if (result.matched) {
      console.log(`  Captured:`, result.params);
    }
  });
}

// ==================== 示例 4: 中间件链 ====================

async function example4_middlewareChain() {
  console.log('\n=== 示例 4: 中间件链 ===\n');

  const router = createRouter();

  // 自定义中间件
  const timingMiddleware: MiddlewareFn = async (ctx, next) => {
    const start = Date.now();
    await next();
    const duration = Date.now() - start;
    console.log(`  [Timing] ${ctx.path} took ${duration}ms`);
  };

  const validateUserMiddleware: MiddlewareFn = async (ctx, next) => {
    const userId = ctx.params.id;
    if (!userId || isNaN(Number(userId))) {
      throw new Error('Invalid user ID');
    }
    console.log(`  [Validation] User ID ${userId} is valid`);
    await next();
  };

  const enrichContextMiddleware: MiddlewareFn = async (ctx, next) => {
    ctx.data = {
      timestamp: new Date().toISOString(),
      requestId: Math.random().toString(36).substr(2, 9)
    };
    await next();
  };

  // 注册带中间件的路由
  router.register({
    path: '/users/:id',
    method: 'GET',
    middlewares: [
      timingMiddleware,
      validateUserMiddleware,
      loggingMiddleware,
      enrichContextMiddleware
    ],
    handler: async (ctx) => {
      console.log(`  [Handler] Processing request for user ${ctx.params.id}`);
      console.log(`  [Handler] Context data:`, ctx.data);
      return {
        userId: ctx.params.id,
        requestedAt: ctx.data?.timestamp
      };
    }
  });

  // 测试
  const result = router.match('/users/123', 'GET');
  if (result.matched && result.route?.middlewares) {
    const ctx: MiddlewareContext = {
      params: result.params || {},
      query: {},
      path: '/users/123',
      method: 'GET'
    };

    try {
      await router.executeMiddlewares(ctx, result.route.middlewares);
      console.log(`  Middleware chain completed successfully`);
    } catch (error) {
      console.log(`  Middleware error:`, (error as Error).message);
    }
  }
}

// ==================== 示例 5: 认证中间件 ====================

async function example5_authMiddleware() {
  console.log('\n=== 示例 5: 认证中间件 ===\n');

  const router = createRouter();

  // 模拟用户数据库
  const users = new Map([
    ['token_abc123', { id: '1', name: 'Alice' }],
    ['token_xyz789', { id: '2', name: 'Bob' }]
  ]);

  // 认证中间件
  const auth = authMiddleware((ctx) => {
    const token = ctx.query.token;
    return users.has(token);
  });

  router.register({
    path: '/profile',
    method: 'GET',
    middlewares: [auth],
    handler: (ctx) => {
      const token = ctx.query.token;
      const user = users.get(token);
      return { user };
    }
  });

  // 测试
  const tests = [
    { token: 'token_abc123', expected: 'success' },
    { token: 'invalid_token', expected: 'fail' }
  ];

  for (const { token, expected } of tests) {
    const result = router.match(`/profile?token=${token}`, 'GET');
    console.log(`GET /profile?token=${token}:`);
    
    if (result.matched && result.route?.middlewares) {
      const ctx: MiddlewareContext = {
        params: {},
        query: { token },
        path: '/profile',
        method: 'GET'
      };

      try {
        await router.executeMiddlewares(ctx, result.route.middlewares);
        console.log(`  ✓ Auth passed`);
      } catch (error) {
        console.log(`  ✗ Auth failed: ${(error as Error).message}`);
      }
    }
  }
}

// ==================== 示例 6: 速率限制 ====================

async function example6_rateLimit() {
  console.log('\n=== 示例 6: 速率限制 ===\n');

  const router = createRouter();

  // 限制：5 次请求 / 10 秒
  const rateLimit = rateLimitMiddleware(5, 10000);

  router.register({
    path: '/api/data',
    method: 'GET',
    middlewares: [rateLimit],
    handler: () => ({ data: 'success' })
  });

  // 测试
  console.log('Sending 7 rapid requests...\n');
  
  for (let i = 1; i <= 7; i++) {
    const result = router.match('/api/data', 'GET');
    console.log(`Request ${i}:`);
    
    if (result.matched && result.route?.middlewares) {
      const ctx: MiddlewareContext = {
        params: {},
        query: {},
        path: '/api/data',
        method: 'GET'
      };

      try {
        await router.executeMiddlewares(ctx, result.route.middlewares);
        console.log(`  ✓ Success`);
      } catch (error) {
        console.log(`  ✗ Blocked: ${(error as Error).message}`);
      }
    }
  }
}

// ==================== 示例 7: CORS 中间件 ====================

async function example7_corsMiddleware() {
  console.log('\n=== 示例 7: CORS 中间件 ===\n');

  const router = createRouter();

  const cors = corsMiddleware({
    origin: 'https://example.com',
    methods: ['GET', 'POST'],
    headers: ['Content-Type', 'Authorization']
  });

  router.register({
    path: '/api/*',
    method: '*',
    middlewares: [cors],
    handler: (ctx) => ({ endpoint: ctx.path })
  });

  // 测试预检请求
  const result = router.match('/api/users', 'OPTIONS');
  if (result.matched && result.route?.middlewares) {
    const ctx: MiddlewareContext = {
      params: {},
      query: {},
      path: '/api/users',
      method: 'OPTIONS'
    };

    await router.executeMiddlewares(ctx, result.route.middlewares);
    console.log('CORS headers:', ctx.data?.headers);
  }
}

// ==================== 示例 8: 链式路由定义 ====================

function example8_chainDefinition() {
  console.log('\n=== 示例 8: 链式路由定义 ===\n');

  const router = createRouter();

  // 使用链式 API 定义路由
  defineRoute('/products/:id')
    .method('GET')
    .use(loggingMiddleware)
    .handler(async (ctx) => {
      console.log(`  Fetching product ${ctx.params.id}`);
      return { productId: ctx.params.id };
    });

  defineRoute('/products')
    .method('POST')
    .use(loggingMiddleware)
    .handler(async (ctx) => {
      console.log(`  Creating new product`);
      return { success: true };
    });

  // 测试
  const routes = router.getRoutes();
  console.log(`Registered ${routes.length} routes:`);
  routes.forEach(route => {
    console.log(`  ${route.method || '*'} ${route.path}`);
  });
}

// ==================== 示例 9: 参数验证 ====================

function example9_paramValidation() {
  console.log('\n=== 示例 9: 参数验证 ===\n');

  const router = createRouter();

  router.register({
    path: '/products/:id',
    method: 'GET',
    params: [
      {
        name: 'id',
        type: 'number',
        required: true,
        validate: (value) => {
          const num = Number(value);
          return num > 0 && Number.isInteger(num);
        }
      }
    ],
    handler: (ctx) => ({ productId: Number(ctx.params.id) })
  });

  // 测试
  const tests = [
    '/products/123',      // 有效
    '/products/0',        // 无效 (<=0)
    '/products/-5',       // 无效 (负数)
    '/products/abc',      // 无效 (非数字)
    '/products/12.5'      // 无效 (小数)
  ];

  tests.forEach(path => {
    const result = router.match(path, 'GET');
    console.log(`GET ${path}:`);
    console.log(`  Matched: ${result.matched}`);
    if (!result.matched) {
      console.log(`  Error: ${result.error}`);
    }
  });
}

// ==================== 示例 10: 路由 URL 生成 ====================

function example10_urlGeneration() {
  console.log('\n=== 示例 10: 路由 URL 生成 ===\n');

  const router = createRouter();

  // 注册带名称的路由
  router.register({
    path: '/users/:userId/posts/:postId',
    method: 'GET',
    name: 'userPost'
  });

  router.register({
    path: '/products/:id',
    method: 'GET',
    name: 'productDetail'
  });

  router.register({
    path: '/search/:query?',
    method: 'GET',
    name: 'search'
  });

  // 生成 URL
  const urls = [
    { name: 'userPost', params: { userId: '123', postId: '456' } },
    { name: 'productDetail', params: { id: '789' } },
    { name: 'search', params: { query: 'laptop' } },
    { name: 'search', params: {} }
  ];

  urls.forEach(({ name, params }) => {
    try {
      const url = router.generate(name, params);
      console.log(`${name}(${JSON.stringify(params)}): ${url}`);
    } catch (error) {
      console.log(`${name}: Error - ${(error as Error).message}`);
    }
  });
}

// ==================== 示例 11: HTTP 方法路由 ====================

function example11_httpMethods() {
  console.log('\n=== 示例 11: HTTP 方法路由 ===\n');

  const router = createRouter();

  // RESTful 风格路由
  const resourceRoutes = [
    { path: '/users', method: 'GET' as const, handler: () => 'List users' },
    { path: '/users', method: 'POST' as const, handler: () => 'Create user' },
    { path: '/users/:id', method: 'GET' as const, handler: (ctx: any) => `Get user ${ctx.params.id}` },
    { path: '/users/:id', method: 'PUT' as const, handler: (ctx: any) => `Update user ${ctx.params.id}` },
    { path: '/users/:id', method: 'DELETE' as const, handler: (ctx: any) => `Delete user ${ctx.params.id}` }
  ];

  router.registerAll(resourceRoutes);

  // 测试
  const tests = [
    { path: '/users', method: 'GET' },
    { path: '/users', method: 'POST' },
    { path: '/users/123', method: 'GET' },
    { path: '/users/123', method: 'PUT' },
    { path: '/users/123', method: 'DELETE' },
    { path: '/users/123', method: 'PATCH' } // 未定义
  ];

  tests.forEach(({ path, method }) => {
    const result = router.match(path, method);
    console.log(`${method} ${path}: ${result.matched ? '✓' : '✗'}`);
  });
}

// ==================== 示例 12: 路由分组 (模拟) ====================

function example12_routeGrouping() {
  console.log('\n=== 示例 12: 路由分组 (模拟) ===\n');

  const router = createRouter();

  // 模拟路由分组 - API v1
  const apiV1Prefix = '/api/v1';
  
  router.register({
    path: `${apiV1Prefix}/users`,
    method: 'GET',
    name: 'api.v1.users.list'
  });

  router.register({
    path: `${apiV1Prefix}/users/:id`,
    method: 'GET',
    name: 'api.v1.users.get'
  });

  router.register({
    path: `${apiV1Prefix}/posts`,
    method: 'GET',
    name: 'api.v1.posts.list'
  });

  // 模拟路由分组 - API v2
  const apiV2Prefix = '/api/v2';
  
  router.register({
    path: `${apiV2Prefix}/users`,
    method: 'GET',
    name: 'api.v2.users.list'
  });

  // 获取所有 API v1 路由
  const v1Routes = router.getRoutes().filter(r => r.path.startsWith(apiV1Prefix));
  console.log(`API v1 Routes (${v1Routes.length}):`);
  v1Routes.forEach(r => console.log(`  ${r.method || '*'} ${r.path}`));

  console.log();

  const v2Routes = router.getRoutes().filter(r => r.path.startsWith(apiV2Prefix));
  console.log(`API v2 Routes (${v2Routes.length}):`);
  v2Routes.forEach(r => console.log(`  ${r.method || '*'} ${r.path}`));
}

// ==================== 运行所有示例 ====================

async function runAllExamples() {
  console.log('╔════════════════════════════════════════════╗');
  console.log('║  Router Utils Skill - 使用示例             ║');
  console.log('╚════════════════════════════════════════════╝');

  try {
    example1_basicRouting();
    example2_optionalParams();
    example3_wildcardRoutes();
    await example4_middlewareChain();
    await example5_authMiddleware();
    await example6_rateLimit();
    await example7_corsMiddleware();
    example8_chainDefinition();
    example9_paramValidation();
    example10_urlGeneration();
    example11_httpMethods();
    example12_routeGrouping();

    console.log('\n╔════════════════════════════════════════════╗');
    console.log('║  所有示例执行完成 ✓                        ║');
    console.log('╚════════════════════════════════════════════╝\n');
  } catch (error) {
    console.error('示例执行失败:', error);
  }
}

// 导出示例函数
export {
  example1_basicRouting,
  example2_optionalParams,
  example3_wildcardRoutes,
  example4_middlewareChain,
  example5_authMiddleware,
  example6_rateLimit,
  example7_corsMiddleware,
  example8_chainDefinition,
  example9_paramValidation,
  example10_urlGeneration,
  example11_httpMethods,
  example12_routeGrouping
};

// 如果直接运行此文件
if (typeof require !== 'undefined' && require.main === module) {
  runAllExamples();
}

export default runAllExamples;
