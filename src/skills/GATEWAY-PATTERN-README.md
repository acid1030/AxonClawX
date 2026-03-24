# Gateway Pattern Skill - 使用示例

## 📖 概述

Gateway Pattern Skill 提供了一个完整的 API 网关实现，包含三大核心功能：

1. **路由定义** - 灵活的路由规则配置系统
2. **请求转发** - 基于规则的请求转发到后端服务
3. **网关过滤** - 请求/响应拦截器链式处理

## 🚀 快速开始

### 基础示例

```typescript
import APIGateway, { RouteConfig, FilterConfig } from './gateway-pattern-skill';

// 1. 创建网关实例
const gateway = new APIGateway({
  defaultTimeout: 30000,
  logging: true,
  logLevel: 'info',
});

// 2. 定义路由
const userRoute: RouteConfig = {
  id: 'user-api',
  path: '/api/users/*',
  method: '*',
  target: 'http://localhost:3001',
  preservePath: true,
  priority: 10,
};

const productRoute: RouteConfig = {
  id: 'product-api',
  path: '/api/products/:id',
  method: 'GET',
  target: 'http://localhost:3002',
  priority: 20,
};

// 3. 添加路由
gateway.addRoute(userRoute).addRoute(productRoute);

// 4. 处理请求
const context = {
  url: 'http://localhost:8080/api/users/123',
  path: '/api/users/123',
  method: 'GET' as const,
  headers: { 'Content-Type': 'application/json' },
  query: {},
};

const response = await gateway.handleRequest(context);
console.log(response);
// {
//   requestId: 'req_l5x8k2m9n3p',
//   statusCode: 200,
//   body: { id: 123, name: 'John' },
//   duration: 45,
//   source: 'http://localhost:3001'
// }
```

## 🛣️ 路由定义

### 精确匹配

```typescript
gateway.addRoute({
  id: 'health-check',
  path: '/health',
  method: 'GET',
  target: 'http://localhost:3000/health',
});
```

### 通配符匹配

```typescript
// 匹配所有 /api/users 开头的路径
gateway.addRoute({
  id: 'users-all',
  path: '/api/users/*',
  method: '*',
  target: 'http://localhost:3001',
  preservePath: true,
});
```

### 动态参数

```typescript
// 匹配 /api/users/123, /api/users/456 等
gateway.addRoute({
  id: 'user-by-id',
  path: '/api/users/:id',
  method: 'GET',
  target: 'http://localhost:3001',
});

// 在过滤器中可以访问路径参数
// context.pathParams = { id: '123' }
```

### 路径重写

```typescript
// 将 /api/v1/users/123 转发到 http://localhost:3001/users/123
gateway.addRoute({
  id: 'user-api-v1',
  path: '/api/v1/users/*',
  method: '*',
  target: 'http://localhost:3001',
  pathRewrite: {
    from: '^/api/v1',
    to: '',
  },
});
```

### 路由优先级

```typescript
// 高优先级路由先匹配
gateway
  .addRoute({
    id: 'specific-route',
    path: '/api/users/special',
    method: 'GET',
    target: 'http://localhost:3003',
    priority: 100, // 高优先级
  })
  .addRoute({
    id: 'general-route',
    path: '/api/users/*',
    method: 'GET',
    target: 'http://localhost:3001',
    priority: 10, // 低优先级
  });

// GET /api/users/special → 匹配 specific-route (priority: 100)
// GET /api/users/123 → 匹配 general-route (priority: 10)
```

## 🔌 网关过滤器

### 认证过滤器

```typescript
import { createAuthFilter } from './gateway-pattern-skill';

// 创建认证过滤器
const authFilter = createAuthFilter(async (token) => {
  // 验证 token 逻辑
  const isValid = await validateToken(token);
  return isValid;
});

gateway.addFilter(authFilter);

// 在路由中使用过滤器
gateway.addRoute({
  id: 'protected-api',
  path: '/api/protected/*',
  method: '*',
  target: 'http://localhost:3000',
  filters: ['auth'], // 应用认证过滤器
});
```

### 日志过滤器

```typescript
import { createLoggingFilter } from './gateway-pattern-skill';

const loggingFilter = createLoggingFilter();

gateway.addFilter(loggingFilter);

// 日志输出:
// [Request] GET /api/users/123
// [Response] 200 (45ms)
```

### CORS 过滤器

```typescript
import { createCorsFilter } from './gateway-pattern-skill';

const corsFilter = createCorsFilter(['https://example.com', 'https://app.example.com']);

gateway.addFilter(corsFilter);

// 自动添加 CORS 响应头:
// Access-Control-Allow-Origin: https://example.com
// Access-Control-Allow-Methods: GET, POST, PUT, DELETE, PATCH, OPTIONS
// Access-Control-Allow-Headers: Content-Type, Authorization
```

### 限流过滤器

```typescript
import { createRateLimitFilter } from './gateway-pattern-skill';

// 限制每个 IP 每 60 秒最多 100 个请求
const rateLimitFilter = createRateLimitFilter(100, 60000);

gateway.addFilter(rateLimitFilter);

// 超过限制时返回错误:
// Error: Rate limit exceeded. Try again in 30s
```

### 请求体解析过滤器

```typescript
import { createBodyParserFilter } from './gateway-pattern-skill';

const bodyParserFilter = createBodyParserFilter();

gateway.addFilter(bodyParserFilter);

// 自动将 JSON 字符串解析为对象
// context.body: '{"name": "John"}' → { name: 'John' }
```

### 自定义过滤器

```typescript
import { FilterConfig, GatewayContext, GatewayResponse } from './gateway-pattern-skill';

// 自定义请求过滤器 - 添加请求时间戳
const timestampFilter: FilterConfig = {
  id: 'timestamp',
  name: 'Timestamp Filter',
  type: 'request',
  priority: 50,
  enabled: true,
  handler: {
    onRequest(context) {
      context.headers['X-Request-Time'] = Date.now().toString();
      context.data = context.data || {};
      context.data.processedAt = new Date().toISOString();
      return context;
    },
  },
};

// 自定义响应过滤器 - 添加响应元数据
const metadataFilter: FilterConfig = {
  id: 'metadata',
  name: 'Metadata Filter',
  type: 'response',
  priority: 50,
  enabled: true,
  handler: {
    onResponse(context, response) {
      response.body = {
        ...response.body,
        _metadata: {
          requestId: response.requestId,
          timestamp: Date.now(),
          source: response.source,
        },
      };
      return response;
    },
  },
};

gateway.addFilter(timestampFilter).addFilter(metadataFilter);
```

## 🎯 完整示例

### 微服务网关

```typescript
import APIGateway, {
  createAuthFilter,
  createLoggingFilter,
  createCorsFilter,
  createRateLimitFilter,
  createBodyParserFilter,
} from './gateway-pattern-skill';

// 创建网关
const gateway = new APIGateway({
  defaultTimeout: 30000,
  logging: true,
  logLevel: 'info',
});

// 创建过滤器
const authFilter = createAuthFilter(async (token) => {
  // 验证 JWT token
  return verifyJWT(token);
});

const loggingFilter = createLoggingFilter();
const corsFilter = createCorsFilter(['https://app.example.com']);
const rateLimitFilter = createRateLimitFilter(100, 60000);
const bodyParserFilter = createBodyParserFilter();

// 添加全局过滤器
gateway
  .addFilter(loggingFilter)
  .addFilter(corsFilter)
  .addFilter(bodyParserFilter);

// 定义路由
const routes = [
  // 用户服务
  {
    id: 'user-service',
    path: '/api/users/*',
    method: '*',
    target: 'http://localhost:3001',
    preservePath: true,
    priority: 10,
    filters: ['auth', 'rate-limit'],
  },
  // 产品服务
  {
    id: 'product-service',
    path: '/api/products/*',
    method: '*',
    target: 'http://localhost:3002',
    preservePath: true,
    priority: 10,
  },
  // 订单服务
  {
    id: 'order-service',
    path: '/api/orders/*',
    method: '*',
    target: 'http://localhost:3003',
    preservePath: true,
    priority: 10,
    filters: ['auth'],
  },
  // 健康检查 (无需认证)
  {
    id: 'health-check',
    path: '/health',
    method: 'GET',
    target: 'http://localhost:3000/health',
    priority: 100,
  },
];

// 添加所有路由
routes.forEach(route => gateway.addRoute(route));

// 启动 HTTP 服务器
import { createServer } from 'http';

const server = createServer(async (req, res) => {
  const context = {
    url: req.url || '',
    path: req.url?.split('?')[0] || '',
    method: req.method as any,
    headers: req.headers as Record<string, string>,
    query: parseQueryString(req.url || ''),
    body: await readBody(req),
  };

  const response = await gateway.handleRequest(context);

  res.writeHead(response.statusCode, response.headers);
  res.end(JSON.stringify(response.body));
});

server.listen(8080, () => {
  console.log('Gateway server running on http://localhost:8080');
});
```

### API 版本管理

```typescript
// 支持多版本 API
gateway
  // v2 版本 (高优先级)
  .addRoute({
    id: 'user-api-v2',
    path: '/api/v2/users/*',
    method: '*',
    target: 'http://localhost:3001/v2',
    pathRewrite: { from: '^/api/v2', to: '' },
    priority: 20,
    filters: ['auth'],
  })
  // v1 版本 (向后兼容)
  .addRoute({
    id: 'user-api-v1',
    path: '/api/v1/users/*',
    method: '*',
    target: 'http://localhost:3001/v1',
    pathRewrite: { from: '^/api/v1', to: '' },
    priority: 20,
    filters: ['auth'],
  });
```

### 蓝绿部署

```typescript
// 蓝绿部署 - 通过权重控制流量
let greenTraffic = false;

gateway
  // 蓝色环境 (默认)
  .addRoute({
    id: 'user-service-blue',
    path: '/api/users/*',
    method: '*',
    target: 'http://blue.internal:3001',
    preservePath: true,
    priority: greenTraffic ? 5 : 10,
    enabled: !greenTraffic,
  })
  // 绿色环境
  .addRoute({
    id: 'user-service-green',
    path: '/api/users/*',
    method: '*',
    target: 'http://green.internal:3001',
    preservePath: true,
    priority: greenTraffic ? 10 : 5,
    enabled: greenTraffic,
  });

// 切换流量
function switchTraffic() {
  greenTraffic = !greenTraffic;
  // 重新配置路由优先级...
}
```

## 📊 过滤器优先级

| 优先级 | 过滤器 | 说明 |
|--------|--------|------|
| 100 | Auth | 认证 (最先执行) |
| 90 | Rate Limit | 限流保护 |
| 80 | Body Parser | 请求体解析 |
| 50 | Custom | 自定义过滤器 |
| 10 | Logging | 日志记录 (最后执行) |

## 📝 API 参考

### APIGateway 类

```typescript
class APIGateway {
  constructor(options?: GatewayOptions);
  
  // 路由管理
  addRoute(config: RouteConfig): APIGateway;
  removeRoute(routeId: string): boolean;
  getRoutes(): RouteConfig[];
  
  // 过滤器管理
  addFilter(config: FilterConfig): APIGateway;
  removeFilter(filterId: string): boolean;
  getFilters(): FilterConfig[];
  
  // 请求处理
  handleRequest(context: GatewayContext): Promise<GatewayResponse>;
  
  // 内部方法
  matchRoute(method: HttpMethod, path: string): RouteConfig | undefined;
}
```

### 类型定义

```typescript
interface RouteConfig {
  id: string;
  path: string;
  method: HttpMethod | '*';
  target: string;
  preservePath?: boolean;
  pathRewrite?: { from: string; to: string };
  headers?: Headers;
  timeout?: number;
  retries?: number;
  priority?: number;
  filters?: string[];
  enabled?: boolean;
}

interface FilterConfig {
  id: string;
  name: string;
  type: 'request' | 'response' | 'both';
  priority: number;
  handler: FilterHandler;
  enabled?: boolean;
}

interface GatewayContext {
  requestId: string;
  url: string;
  path: string;
  method: HttpMethod;
  headers: Headers;
  query: QueryParams;
  body?: any;
  route?: RouteConfig;
  timestamp: number;
  pathParams?: Record<string, string>;
  data?: Record<string, any>;
}

interface GatewayResponse {
  requestId: string;
  statusCode: number;
  headers: Headers;
  body: any;
  duration: number;
  error?: string;
  source?: string;
}
```

## 🎨 最佳实践

### 1. 过滤器链设计

```typescript
// 推荐：按优先级组织过滤器
gateway
  .addFilter(authFilter)        // 100 - 认证
  .addFilter(rateLimitFilter)   // 90 - 限流
  .addFilter(bodyParserFilter)  // 80 - 解析
  .addFilter(customFilter)      // 50 - 业务逻辑
  .addFilter(loggingFilter);    // 10 - 日志
```

### 2. 路由组织

```typescript
// 按服务分组路由配置
const userRoutes: RouteConfig[] = [
  { id: 'users-list', path: '/api/users', method: 'GET', target: USER_SERVICE },
  { id: 'users-get', path: '/api/users/:id', method: 'GET', target: USER_SERVICE },
  { id: 'users-create', path: '/api/users', method: 'POST', target: USER_SERVICE },
];

userRoutes.forEach(route => gateway.addRoute(route));
```

### 3. 错误处理

```typescript
try {
  const response = await gateway.handleRequest(context);
  if (response.statusCode >= 500) {
    // 处理服务器错误
    logError(response);
  }
} catch (error) {
  // 处理网关错误
  handleGatewayError(error);
}
```

## 🔧 高级用法

### 动态路由

```typescript
// 运行时添加/移除路由
gateway.addRoute(dynamicRoute);
gateway.removeRoute('old-route');

// 基于条件启用/禁用路由
function enableRoute(routeId: string) {
  const routes = gateway.getRoutes();
  const route = routes.find(r => r.id === routeId);
  if (route) {
    route.enabled = true;
  }
}
```

### 自定义响应处理

```typescript
// 在过滤器中修改响应
const cacheFilter: FilterConfig = {
  id: 'cache',
  name: 'Cache Filter',
  type: 'response',
  priority: 60,
  handler: {
    onResponse(context, response) {
      // 添加缓存头
      if (context.method === 'GET' && response.statusCode === 200) {
        response.headers['Cache-Control'] = 'public, max-age=300';
      }
      return response;
    },
  },
};
```

---

**版本:** 1.0.0  
**最后更新:** 2026-03-13
