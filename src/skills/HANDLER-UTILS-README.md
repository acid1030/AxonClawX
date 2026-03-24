# HTTP 请求处理器工具技能 - Handler Utils Skill

**版本:** 1.0.0  
**作者:** Axon  
**模块:** `skills/handler-utils`

---

## 📋 功能概览

### 1. 请求解析 (Request Parsing)
- ✅ 自动解析请求体 (JSON/Form/Text)
- ✅ 查询参数解析
- ✅ 请求头标准化
- ✅ 客户端 IP 提取
- ✅ 请求大小限制

### 2. 响应构建 (Response Building)
- ✅ 统一响应格式
- ✅ 错误响应标准化
- ✅ CORS 支持
- ✅ 缓存控制
- ✅ 响应时间追踪

### 3. 错误处理 (Error Handling)
- ✅ HTTP 错误类
- ✅ 快捷错误创建器
- ✅ 异步错误包装器
- ✅ 请求验证器
- ✅ 路由器中间件

---

## 🚀 快速开始

### 基础使用

```typescript
import {
  parseRequest,
  sendJson,
  sendError,
  buildSuccessResponse,
  buildErrorResponse
} from './src/skills/handler-utils-skill';

import { IncomingMessage, ServerResponse } from 'http';

// 创建 HTTP 服务器
import { createServer } from 'http';

const server = createServer(async (req, res) => {
  try {
    // 1. 解析请求
    const parsed = await parseRequest(req);
    
    console.log(`[${parsed.method}] ${parsed.path}`);
    console.log('Query:', parsed.query);
    console.log('Body:', parsed.body);
    
    // 2. 处理业务逻辑
    const data = { message: 'Hello, World!', timestamp: Date.now() };
    
    // 3. 发送响应
    const response = buildSuccessResponse(data, {
      message: 'Request processed successfully'
    });
    
    sendJson(res, response, 200);
    
  } catch (error) {
    // 4. 错误处理
    sendError(res, error as Error, 500);
  }
});

server.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});
```

---

## 📖 详细用法

### 1. 请求解析

#### 基本解析

```typescript
const parsed = await parseRequest(req, {
  maxBodySize: 10 * 1024 * 1024,  // 10MB 限制
  parseBody: true,                 // 解析请求体
  parseQuery: true                 // 解析查询参数
});

// parsed 结构:
{
  method: 'POST',
  path: '/api/users',
  query: { page: '1', limit: '10' },
  headers: { 'content-type': 'application/json', ... },
  body: { name: 'John', email: 'john@example.com' },
  ip: '192.168.1.100',
  timestamp: 1710337200000,
  url: URL { ... },
  original: IncomingMessage { ... }
}
```

#### 解析不同内容类型

```typescript
// JSON 请求体
// Content-Type: application/json
// Body: { "name": "John", "age": 30 }
const parsed = await parseRequest(req);
console.log(parsed.body); // { name: 'John', age: 30 }

// Form 表单
// Content-Type: application/x-www-form-urlencoded
// Body: name=John&age=30
const parsed = await parseRequest(req);
console.log(parsed.body); // { name: 'John', age: '30' }

// 纯文本
// Content-Type: text/plain
// Body: Hello World
const parsed = await parseRequest(req);
console.log(parsed.body); // 'Hello World'
```

---

### 2. 响应构建

#### 成功响应

```typescript
import { buildSuccessResponse, sendJson } from './handler-utils-skill';

// 简单响应
sendJson(res, { users: [...] }, 200);

// 标准响应格式
const response = buildSuccessResponse(users, {
  message: 'Users retrieved successfully',
  requestId: 'req_123456',
  pagination: {
    page: 1,
    pageSize: 10,
    total: 100,
    totalPages: 10,
    hasNext: true,
    hasPrev: false
  }
});

sendJson(res, response, 200);

// 响应结构:
{
  success: true,
  data: [...],
  message: 'Users retrieved successfully',
  requestId: 'req_123456',
  timestamp: 1710337200000,
  pagination: { ... }
}
```

#### 错误响应

```typescript
import { buildErrorResponse, sendError } from './handler-utils-skill';

// 简单错误
sendError(res, 'Something went wrong', 500);

// 标准错误格式
const errorResponse = buildErrorResponse('VALIDATION_ERROR', 'Invalid email format', {
  details: { field: 'email', value: 'invalid' },
  path: '/api/users',
  method: 'POST'
});

sendJson(res, errorResponse, 400);

// 错误结构:
{
  code: 'VALIDATION_ERROR',
  message: 'Invalid email format',
  details: { field: 'email', value: 'invalid' },
  requestId: 'req_789012',
  timestamp: 1710337200000,
  path: '/api/users',
  method: 'POST'
}
```

#### 带选项的响应

```typescript
import { sendResponse } from './handler-utils-skill';

sendResponse(res, data, {
  status: 201,
  contentType: 'application/json',
  cors: true,
  corsOptions: {
    origin: 'https://example.com',
    methods: 'GET, POST',
    credentials: true
  },
  cache: {
    enabled: true,
    maxAge: 3600,
    private: false
  },
  headers: {
    'X-Custom-Header': 'value'
  }
});
```

---

### 3. 错误处理

#### HTTP 错误类

```typescript
import {
  HttpError,
  createValidationError,
  createNotFoundError,
  createAuthenticationError
} from './handler-utils-skill';

// 使用错误类
throw new HttpError('Custom error', 400, 'CUSTOM_ERROR');

// 使用快捷创建器
throw createValidationError('Email is required', { field: 'email' });
throw createNotFoundError('User');
throw createAuthenticationError('Token expired');
throw createAuthorizationError('Admin access required');
throw createConflictError('Email already exists');
throw createRateLimitError(60); // 60 秒后重试
throw createTimeoutError('Database query timeout');
throw createInternalError('Unexpected error occurred');
```

#### 错误处理包装器

```typescript
import { withErrorHandler, sendError } from './handler-utils-skill';

// 包装异步处理器
const handler = withErrorHandler(
  async (req, res) => {
    const data = await fetchData();
    sendJson(res, data);
  },
  (error, req, res) => {
    console.error('Handler error:', error);
    sendError(res, error, 500);
  }
);

// 使用
http.createServer(async (req, res) => {
  const parsed = await parseRequest(req);
  await handler(parsed, res);
});
```

---

### 4. 路由器

#### 创建路由器

```typescript
import {
  createRouter,
  parseRequest,
  sendJson,
  createNotFoundError
} from './handler-utils-skill';

// 定义路由
const router = createRouter([
  // GET /users
  {
    method: 'GET',
    path: '/users',
    handler: async (req, res) => {
      const users = await getUsers(req.query);
      sendJson(res, { success: true, data: users });
    }
  },
  
  // POST /users
  {
    method: 'POST',
    path: '/users',
    handler: async (req, res) => {
      const user = await createUser(req.body);
      sendJson(res, { success: true, data: user }, 201);
    }
  },
  
  // GET /users/:id (参数化路径)
  {
    method: 'GET',
    path: '/users/:id',
    handler: async (req, res) => {
      const params = extractPathParams('/users/:id', req.path);
      const user = await getUserById(params.id);
      
      if (!user) {
        throw createNotFoundError('User');
      }
      
      sendJson(res, { success: true, data: user });
    }
  },
  
  // 正则表达式路径
  {
    method: 'GET',
    path: /^\/api\/v\d+\/users$/,
    handler: async (req, res) => {
      sendJson(res, { success: true, data: [] });
    }
  }
]);

// 在服务器中使用
const server = createServer(async (req, res) => {
  const parsed = await parseRequest(req);
  await router(parsed, res);
});

server.listen(3000);
```

---

### 5. 请求验证

#### 创建验证器

```typescript
import { createBodyValidator, createValidationError } from './handler-utils-skill';

// 定义验证模式
const userValidator = createBodyValidator({
  required: ['email', 'password'],
  types: {
    email: 'string',
    password: 'string',
    age: 'number',
    tags: 'array'
  },
  custom: {
    email: (value) => ({
      valid: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
      message: 'Invalid email format'
    }),
    password: (value) => ({
      valid: value.length >= 8,
      message: 'Password must be at least 8 characters'
    }),
    age: (value) => ({
      valid: value >= 18 && value <= 120,
      message: 'Age must be between 18 and 120'
    })
  },
  minLength: {
    password: 8
  },
  pattern: {
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  }
});

// 在处理器中使用
const handler = async (req, res) => {
  const validation = userValidator.validate(req.body);
  
  if (!validation.valid) {
    throw createValidationError('Validation failed', validation.errors);
  }
  
  const user = await createUser(validation.data!);
  sendJson(res, { success: true, data: user }, 201);
};
```

---

### 6. 中间件处理器

#### 创建处理器链

```typescript
import { createHandler, parseRequest } from './handler-utils-skill';

// 认证中间件
const authenticate = async (req: ParsedRequest, res: ServerResponse) => {
  const token = req.headers['authorization'];
  
  if (!token) {
    sendError(res, createAuthenticationError(), 401);
    return;
  }
  
  // 验证 token...
  // 将用户信息附加到请求
  (req as any).user = await verifyToken(token);
};

// 日志中间件
const logger = async (req: ParsedRequest, res: ServerResponse) => {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    console.log(`[${req.method}] ${req.path} ${res.statusCode} ${duration}ms`);
  });
};

// 验证中间件
const validateUserInput = async (req: ParsedRequest, res: ServerResponse) => {
  const validation = userValidator.validate(req.body);
  
  if (!validation.valid) {
    sendError(res, createValidationError('Invalid input', validation.errors), 400);
    return;
  }
};

// 组合处理器
const createUserHandler = createHandler(
  logger,
  authenticate,
  validateUserInput,
  async (req: ParsedRequest, res: ServerResponse) => {
    const user = await createUser(req.body);
    sendJson(res, { success: true, data: user }, 201);
  }
);

// 路由
const router = createRouter([
  {
    method: 'POST',
    path: '/users',
    handler: createUserHandler
  }
]);
```

---

## 📊 类型定义

### 主要类型

```typescript
// HTTP 方法
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';

// 状态码
type StatusCode = 200 | 201 | 204 | 301 | 302 | 304 | 400 | 401 | 403 | 404 | 405 | 408 | 409 | 415 | 422 | 429 | 500 | 502 | 503 | 504;

// 解析后的请求
interface ParsedRequest<T = any> {
  method: HttpMethod;
  path: string;
  query: Record<string, string | string[]>;
  headers: Record<string, string | string[]>;
  body: T;
  original: IncomingMessage;
  url: URL;
  ip?: string;
  timestamp: number;
}

// 成功响应
interface SuccessResponse<T = any> {
  success: true;
  data: T;
  message?: string;
  requestId?: string;
  timestamp: number;
  pagination?: PaginationInfo;
}

// 错误响应
interface ErrorResponse {
  code: string;
  message: string;
  details?: any;
  stack?: string;
  requestId?: string;
  timestamp: number;
  path: string;
  method: string;
}

// HTTP 错误类
class HttpError extends Error {
  code: string;
  status: StatusCode;
  type: ErrorType;
  details?: any;
  
  constructor(message: string, status?: StatusCode, code?: string, type?: ErrorType, details?: any);
  toResponse(requestId?: string, path?: string, method?: string): ErrorResponse;
}
```

---

## 🎯 完整示例

### RESTful API 服务器

```typescript
import { createServer } from 'http';
import {
  parseRequest,
  createRouter,
  sendJson,
  sendError,
  createHandler,
  createBodyValidator,
  createValidationError,
  createNotFoundError,
  buildSuccessResponse,
  extractPathParams,
  ParsedRequest
} from './src/skills/handler-utils-skill';
import { ServerResponse } from 'http';

// 模拟数据库
const users = [
  { id: 1, name: 'John', email: 'john@example.com' },
  { id: 2, name: 'Jane', email: 'jane@example.com' }
];

// 验证器
const userValidator = createBodyValidator({
  required: ['name', 'email'],
  types: { name: 'string', email: 'string' },
  custom: {
    email: (value) => ({
      valid: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
      message: 'Invalid email'
    })
  }
});

// 中间件
const corsMiddleware = async (req: ParsedRequest, res: ServerResponse) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
  }
};

const loggerMiddleware = async (req: ParsedRequest, res: ServerResponse) => {
  const startTime = Date.now();
  
  res.on('finish', () => {
    console.log(`[${req.method}] ${req.path} ${res.statusCode} ${Date.now() - startTime}ms`);
  });
};

// 路由处理器
const getUsers = async (req: ParsedRequest, res: ServerResponse) => {
  const response = buildSuccessResponse(users, {
    message: 'Users retrieved',
    pagination: {
      page: 1,
      pageSize: 10,
      total: users.length,
      totalPages: 1,
      hasNext: false,
      hasPrev: false
    }
  });
  sendJson(res, response);
};

const getUserById = async (req: ParsedRequest, res: ServerResponse) => {
  const params = extractPathParams('/users/:id', req.path);
  const user = users.find(u => u.id === parseInt(params.id));
  
  if (!user) {
    throw createNotFoundError('User');
  }
  
  sendJson(res, buildSuccessResponse(user));
};

const createUser = async (req: ParsedRequest, res: ServerResponse) => {
  const validation = userValidator.validate(req.body);
  
  if (!validation.valid) {
    throw createValidationError('Invalid input', validation.errors);
  }
  
  const newUser = {
    id: users.length + 1,
    ...validation.data!
  };
  
  users.push(newUser);
  sendJson(res, buildSuccessResponse(newUser, { message: 'User created' }), 201);
};

const updateUser = async (req: ParsedRequest, res: ServerResponse) => {
  const params = extractPathParams('/users/:id', req.path);
  const userId = parseInt(params.id);
  const userIndex = users.findIndex(u => u.id === userId);
  
  if (userIndex === -1) {
    throw createNotFoundError('User');
  }
  
  users[userIndex] = { ...users[userIndex], ...req.body };
  sendJson(res, buildSuccessResponse(users[userIndex]));
};

const deleteUser = async (req: ParsedRequest, res: ServerResponse) => {
  const params = extractPathParams('/users/:id', req.path);
  const userId = parseInt(params.id);
  const userIndex = users.findIndex(u => u.id === userId);
  
  if (userIndex === -1) {
    throw createNotFoundError('User');
  }
  
  users.splice(userIndex, 1);
  sendJson(res, buildSuccessResponse({ message: 'User deleted' }));
};

// 创建路由器
const router = createRouter([
  { method: 'GET', path: '/users', handler: createHandler(corsMiddleware, loggerMiddleware, getUsers) },
  { method: 'GET', path: '/users/:id', handler: createHandler(corsMiddleware, loggerMiddleware, getUserById) },
  { method: 'POST', path: '/users', handler: createHandler(corsMiddleware, loggerMiddleware, createUser) },
  { method: 'PUT', path: '/users/:id', handler: createHandler(corsMiddleware, loggerMiddleware, updateUser) },
  { method: 'DELETE', path: '/users/:id', handler: createHandler(corsMiddleware, loggerMiddleware, deleteUser) }
]);

// 创建服务器
const server = createServer(async (req, res) => {
  try {
    const parsed = await parseRequest(req);
    await router(parsed, res);
  } catch (error) {
    console.error('Server error:', error);
    sendError(res, error as Error, 500);
  }
});

server.listen(3000, () => {
  console.log('🚀 Server running on http://localhost:3000');
  console.log('📚 API Endpoints:');
  console.log('   GET    /users      - List users');
  console.log('   GET    /users/:id  - Get user by ID');
  console.log('   POST   /users      - Create user');
  console.log('   PUT    /users/:id  - Update user');
  console.log('   DELETE /users/:id  - Delete user');
});
```

---

## 🔧 工具函数

```typescript
// 格式化字节
formatBytes(1024);           // '1.00 KB'
formatBytes(1048576);        // '1.00 MB'

// 计算响应大小
calculateResponseSize({ data: 'test' });  // 15 (bytes)

// 检查 Accept 头
acceptsContentType(req, 'application/json');

// 记录请求日志
logRequest(req, res, startTime);
```

---

## 📝 最佳实践

### 1. 统一错误处理

```typescript
// ✅ 推荐：使用 HTTP 错误类
throw createValidationError('Invalid email');

// ❌ 不推荐：直接抛普通错误
throw new Error('Invalid email');
```

### 2. 统一响应格式

```typescript
// ✅ 推荐：使用构建器
sendJson(res, buildSuccessResponse(data));

// ❌ 不推荐：直接发送数据
sendJson(res, data);
```

### 3. 中间件链

```typescript
// ✅ 推荐：使用处理器链
const handler = createHandler(
  logger,
  authenticate,
  validate,
  businessLogic
);

// ❌ 不推荐：嵌套回调
async (req, res) => {
  await logger(req, res);
  await authenticate(req, res);
  // ...
}
```

### 4. 请求验证

```typescript
// ✅ 推荐：使用验证器
const validation = validator.validate(req.body);
if (!validation.valid) {
  throw createValidationError('Invalid input', validation.errors);
}

// ❌ 不推荐：手动检查
if (!req.body.email) {
  sendError(res, 'Email required', 400);
}
```

---

## 🎯 总结

Handler Utils Skill 提供了完整的 HTTP 请求处理解决方案：

- ✅ **请求解析** - 自动解析各种内容类型
- ✅ **响应构建** - 统一响应格式和错误处理
- ✅ **错误处理** - 丰富的错误类和快捷创建器
- ✅ **路由器** - 支持参数化路径和正则匹配
- ✅ **验证器** - 灵活的请求验证系统
- ✅ **中间件** - 处理器链式组合

适用于构建 RESTful API、Web 服务器、微服务等场景。
