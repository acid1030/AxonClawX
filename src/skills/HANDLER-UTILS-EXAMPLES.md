# Handler Utils Skill - 使用示例

## 示例 1: 简单的 JSON API

```typescript
import { createServer } from 'http';
import { parseRequest, sendJson, sendError } from './src/skills/handler-utils-skill';

const server = createServer(async (req, res) => {
  try {
    const parsed = await parseRequest(req);
    
    if (parsed.method === 'GET' && parsed.path === '/api/hello') {
      sendJson(res, {
        success: true,
        data: { message: 'Hello, World!' },
        timestamp: Date.now()
      });
      return;
    }
    
    sendError(res, 'Not Found', 404);
  } catch (error) {
    sendError(res, error as Error, 500);
  }
});

server.listen(3000, () => {
  console.log('Server: http://localhost:3000');
});

// 测试: curl http://localhost:3000/api/hello
```

---

## 示例 2: POST 请求处理

```typescript
import { createServer } from 'http';
import { parseRequest, sendJson, sendError, buildSuccessResponse } from './src/skills/handler-utils-skill';

const users: any[] = [];

const server = createServer(async (req, res) => {
  const parsed = await parseRequest(req);
  
  if (parsed.method === 'POST' && parsed.path === '/api/users') {
    try {
      // 验证必填字段
      const { name, email } = parsed.body;
      
      if (!name || !email) {
        sendError(res, 'Name and email are required', 400);
        return;
      }
      
      // 创建用户
      const user = {
        id: users.length + 1,
        name,
        email,
        createdAt: new Date().toISOString()
      };
      
      users.push(user);
      
      // 发送响应
      sendJson(res, buildSuccessResponse(user, {
        message: 'User created successfully'
      }), 201);
      
    } catch (error) {
      sendError(res, error as Error, 500);
    }
    return;
  }
  
  sendError(res, 'Not Found', 404);
});

server.listen(3000);

// 测试:
// curl -X POST http://localhost:3000/api/users \
//   -H "Content-Type: application/json" \
//   -d '{"name":"John","email":"john@example.com"}'
```

---

## 示例 3: 使用路由器

```typescript
import { createServer } from 'http';
import {
  parseRequest,
  createRouter,
  sendJson,
  sendError,
  createNotFoundError,
  extractPathParams
} from './src/skills/handler-utils-skill';

const users = [
  { id: 1, name: 'Alice', email: 'alice@example.com' },
  { id: 2, name: 'Bob', email: 'bob@example.com' }
];

// 路由处理器
const routes = [
  // GET /users
  {
    method: 'GET',
    path: '/users',
    handler: async (req: any, res: any) => {
      sendJson(res, { success: true, data: users });
    }
  },
  
  // GET /users/:id
  {
    method: 'GET',
    path: '/users/:id',
    handler: async (req: any, res: any) => {
      const params = extractPathParams('/users/:id', req.path);
      const user = users.find(u => u.id === parseInt(params.id));
      
      if (!user) {
        throw createNotFoundError('User');
      }
      
      sendJson(res, { success: true, data: user });
    }
  },
  
  // POST /users
  {
    method: 'POST',
    path: '/users',
    handler: async (req: any, res: any) => {
      const newUser = {
        id: users.length + 1,
        ...req.body
      };
      users.push(newUser);
      sendJson(res, { success: true, data: newUser }, 201);
    }
  }
];

const router = createRouter(routes as any);

const server = createServer(async (req, res) => {
  try {
    const parsed = await parseRequest(req);
    await router(parsed, res);
  } catch (error) {
    sendError(res, error as Error, 500);
  }
});

server.listen(3000);
```

---

## 示例 4: 请求验证

```typescript
import { createServer } from 'http';
import {
  parseRequest,
  sendJson,
  sendError,
  createBodyValidator,
  createValidationError,
  buildSuccessResponse
} from './src/skills/handler-utils-skill';

// 创建验证器
const registerValidator = createBodyValidator({
  required: ['email', 'password', 'name'],
  types: {
    email: 'string',
    password: 'string',
    name: 'string',
    age: 'number'
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
    age: (value) => {
      if (value === undefined) return { valid: true };
      return {
        valid: value >= 18 && value <= 120,
        message: 'Age must be between 18 and 120'
      };
    }
  }
});

const server = createServer(async (req, res) => {
  const parsed = await parseRequest(req);
  
  if (parsed.method === 'POST' && parsed.path === '/api/register') {
    // 验证请求
    const validation = registerValidator.validate(parsed.body);
    
    if (!validation.valid) {
      sendError(res, createValidationError('Validation failed', validation.errors), 400);
      return;
    }
    
    // 处理注册逻辑
    const user = {
      id: Date.now(),
      ...validation.data,
      createdAt: new Date().toISOString()
    };
    
    sendJson(res, buildSuccessResponse(user, {
      message: 'Registration successful'
    }), 201);
    return;
  }
  
  sendError(res, 'Not Found', 404);
});

server.listen(3000);

// 测试:
// curl -X POST http://localhost:3000/api/register \
//   -H "Content-Type: application/json" \
//   -d '{"email":"test@example.com","password":"12345678","name":"Test"}'
```

---

## 示例 5: 错误处理

```typescript
import { createServer } from 'http';
import {
  parseRequest,
  sendJson,
  sendError,
  HttpError,
  createNotFoundError,
  createValidationError,
  createAuthenticationError,
  withErrorHandler
} from './src/skills/handler-utils-skill';

// 模拟数据库
const db = {
  users: [
    { id: 1, name: 'Alice', email: 'alice@example.com' }
  ]
};

// 处理器 1: 使用 try-catch
const getUserHandler1 = async (req: any, res: any) => {
  try {
    const userId = parseInt(req.query.id as string);
    const user = db.users.find(u => u.id === userId);
    
    if (!user) {
      throw createNotFoundError('User');
    }
    
    sendJson(res, { success: true, data: user });
  } catch (error) {
    if (error instanceof HttpError) {
      sendError(res, error.toResponse(), error.status);
    } else {
      sendError(res, error as Error, 500);
    }
  }
};

// 处理器 2: 使用错误包装器
const getUserHandler2 = withErrorHandler(
  async (req: any, res: any) => {
    const userId = parseInt(req.query.id as string);
    const user = db.users.find(u => u.id === userId);
    
    if (!user) {
      throw createNotFoundError('User');
    }
    
    sendJson(res, { success: true, data: user });
  },
  (error, req, res) => {
    console.error('Error:', error.message);
    
    if (error instanceof HttpError) {
      sendError(res, error.toResponse(), error.status);
    } else {
      sendError(res, 'Internal server error', 500);
    }
  }
);

// 处理器 3: 自动错误处理 (推荐)
const getUserHandler3 = async (req: any, res: any) => {
  const userId = parseInt(req.query.id as string);
  
  if (isNaN(userId)) {
    throw createValidationError('Invalid user ID');
  }
  
  const user = db.users.find(u => u.id === userId);
  
  if (!user) {
    throw createNotFoundError('User');
  }
  
  sendJson(res, { success: true, data: user });
  // 错误会自动被路由器捕获
};

const router = createRouter([
  { method: 'GET', path: '/users/v1', handler: getUserHandler1 },
  { method: 'GET', path: '/users/v2', handler: getUserHandler2 },
  { method: 'GET', path: '/users/v3', handler: getUserHandler3 }
]);

const server = createServer(async (req, res) => {
  const parsed = await parseRequest(req);
  await router(parsed, res);
});

server.listen(3000);
```

---

## 示例 6: 中间件链

```typescript
import { createServer } from 'http';
import {
  parseRequest,
  createHandler,
  createRouter,
  sendJson,
  sendError,
  createAuthenticationError,
  ParsedRequest
} from './src/skills/handler-utils-skill';
import { ServerResponse } from 'http';

// 中间件 1: 日志
const logger = async (req: ParsedRequest, res: ServerResponse) => {
  const startTime = Date.now();
  
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} from ${req.ip}`);
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    console.log(`  → ${res.statusCode} (${duration}ms)`);
  });
};

// 中间件 2: CORS
const cors = async (req: ParsedRequest, res: ServerResponse) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
  }
};

// 中间件 3: 认证
const authenticate = async (req: ParsedRequest, res: ServerResponse) => {
  const authHeader = req.headers['authorization'];
  
  if (!authHeader) {
    sendError(res, createAuthenticationError('Authorization header required'), 401);
    return;
  }
  
  // 简单的 token 验证 (示例)
  const token = authHeader.replace('Bearer ', '');
  if (token !== 'secret-token') {
    sendError(res, createAuthenticationError('Invalid token'), 401);
    return;
  }
  
  // 将用户信息附加到请求
  (req as any).user = { id: 1, name: 'Admin' };
};

// 业务处理器
const protectedHandler = async (req: ParsedRequest, res: ServerResponse) => {
  sendJson(res, {
    success: true,
    data: {
      message: 'Protected resource accessed',
      user: (req as any).user
    }
  });
};

// 组合处理器
const secureHandler = createHandler(
  logger,
  cors,
  authenticate,
  protectedHandler
);

// 公开处理器 (无需认证)
const publicHandler = createHandler(
  logger,
  cors,
  async (req: ParsedRequest, res: ServerResponse) => {
    sendJson(res, { success: true, data: { message: 'Public resource' } });
  }
);

const router = createRouter([
  { method: 'GET', path: '/public', handler: publicHandler },
  { method: 'GET', path: '/protected', handler: secureHandler }
]);

const server = createServer(async (req, res) => {
  const parsed = await parseRequest(req);
  await router(parsed, res);
});

server.listen(3000);

// 测试:
// curl http://localhost:3000/public
// curl http://localhost:3000/protected  # 401
// curl -H "Authorization: Bearer secret-token" http://localhost:3000/protected  # 200
```

---

## 示例 7: 文件上传处理

```typescript
import { createServer } from 'http';
import { parseRequest, sendJson, sendError } from './src/skills/handler-utils-skill';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const server = createServer(async (req, res) => {
  const parsed = await parseRequest(req, {
    maxBodySize: 50 * 1024 * 1024  // 50MB
  });
  
  if (parsed.method === 'POST' && parsed.path === '/api/upload') {
    try {
      const contentType = parsed.headers['content-type'] as string;
      
      if (!contentType?.includes('multipart/form-data')) {
        sendError(res, 'Only multipart/form-data is supported', 415);
        return;
      }
      
      // 保存上传的文件
      const uploadDir = join(process.cwd(), 'uploads');
      mkdirSync(uploadDir, { recursive: true });
      
      const filename = `upload_${Date.now()}.bin`;
      const filepath = join(uploadDir, filename);
      
      if (parsed.body.raw) {
        writeFileSync(filepath, parsed.body.raw);
        
        sendJson(res, {
          success: true,
          data: {
            filename,
            size: parsed.body.raw.length,
            path: filepath
          },
          message: 'File uploaded successfully'
        });
      } else {
        sendError(res, 'No file data received', 400);
      }
      
    } catch (error) {
      sendError(res, error as Error, 500);
    }
    return;
  }
  
  sendError(res, 'Not Found', 404);
});

server.listen(3000);

// 测试:
// curl -X POST http://localhost:3000/api/upload \
//   -F "file=@/path/to/file.txt"
```

---

## 示例 8: 完整的 REST API

```typescript
import { createServer } from 'http';
import {
  parseRequest,
  createRouter,
  createHandler,
  sendJson,
  sendError,
  createBodyValidator,
  createValidationError,
  createNotFoundError,
  createConflictError,
  buildSuccessResponse,
  buildErrorResponse,
  extractPathParams,
  ParsedRequest
} from './src/skills/handler-utils-skill';
import { ServerResponse } from 'http';

// 模拟数据库
interface User {
  id: number;
  name: string;
  email: string;
  createdAt: string;
}

let users: User[] = [
  { id: 1, name: 'Alice', email: 'alice@example.com', createdAt: new Date().toISOString() },
  { id: 2, name: 'Bob', email: 'bob@example.com', createdAt: new Date().toISOString() }
];

let nextId = 3;

// 验证器
const userValidator = createBodyValidator({
  required: ['name', 'email'],
  types: { name: 'string', email: 'string' },
  custom: {
    email: (value) => ({
      valid: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
      message: 'Invalid email format'
    })
  }
});

// 中间件
const jsonMiddleware = async (req: ParsedRequest, res: ServerResponse) => {
  res.setHeader('Content-Type', 'application/json');
};

const corsMiddleware = async (req: ParsedRequest, res: ServerResponse) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
  }
};

// CRUD 处理器
const listUsers = async (req: ParsedRequest, res: ServerResponse) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  
  const start = (page - 1) * limit;
  const end = start + limit;
  const paginatedUsers = users.slice(start, end);
  
  sendJson(res, buildSuccessResponse(paginatedUsers, {
    message: 'Users retrieved',
    pagination: {
      page,
      pageSize: limit,
      total: users.length,
      totalPages: Math.ceil(users.length / limit),
      hasNext: end < users.length,
      hasPrev: page > 1
    }
  }));
};

const getUser = async (req: ParsedRequest, res: ServerResponse) => {
  const params = extractPathParams('/users/:id', req.path);
  const user = users.find(u => u.id === parseInt(params.id));
  
  if (!user) {
    throw createNotFoundError('User');
  }
  
  sendJson(res, buildSuccessResponse(user));
};

const createUser = async (req: ParsedRequest, res: ServerResponse) => {
  // 验证
  const validation = userValidator.validate(req.body);
  if (!validation.valid) {
    throw createValidationError('Invalid input', validation.errors);
  }
  
  // 检查邮箱是否已存在
  const existing = users.find(u => u.email === validation.data!.email);
  if (existing) {
    throw createConflictError('Email already exists');
  }
  
  // 创建用户
  const newUser: User = {
    id: nextId++,
    name: validation.data!.name,
    email: validation.data!.email,
    createdAt: new Date().toISOString()
  };
  
  users.push(newUser);
  
  sendJson(res, buildSuccessResponse(newUser, {
    message: 'User created'
  }), 201);
};

const updateUser = async (req: ParsedRequest, res: ServerResponse) => {
  const params = extractPathParams('/users/:id', req.path);
  const userId = parseInt(params.id);
  const userIndex = users.findIndex(u => u.id === userId);
  
  if (userIndex === -1) {
    throw createNotFoundError('User');
  }
  
  // 更新
  users[userIndex] = {
    ...users[userIndex],
    ...req.body,
    id: userId,  // 保持 ID 不变
    createdAt: users[userIndex].createdAt  // 保持创建时间
  };
  
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
  { method: 'GET', path: '/users', handler: createHandler(corsMiddleware, jsonMiddleware, listUsers) },
  { method: 'GET', path: '/users/:id', handler: createHandler(corsMiddleware, jsonMiddleware, getUser) },
  { method: 'POST', path: '/users', handler: createHandler(corsMiddleware, jsonMiddleware, createUser) },
  { method: 'PUT', path: '/users/:id', handler: createHandler(corsMiddleware, jsonMiddleware, updateUser) },
  { method: 'DELETE', path: '/users/:id', handler: createHandler(corsMiddleware, jsonMiddleware, deleteUser) }
]);

// 创建服务器
const server = createServer(async (req, res) => {
  try {
    const parsed = await parseRequest(req);
    await router(parsed, res);
  } catch (error) {
    console.error('Unhandled error:', error);
    sendJson(res, buildErrorResponse('INTERNAL_ERROR', 'Internal server error'), 500);
  }
});

server.listen(3000, () => {
  console.log('🚀 REST API Server running on http://localhost:3000');
  console.log('');
  console.log('Endpoints:');
  console.log('  GET    /users          - List all users (with pagination)');
  console.log('  GET    /users/:id      - Get user by ID');
  console.log('  POST   /users          - Create new user');
  console.log('  PUT    /users/:id      - Update user');
  console.log('  DELETE /users/:id      - Delete user');
  console.log('');
  console.log('Query Parameters:');
  console.log('  ?page=1&limit=10       - Pagination');
});

// 测试:
// curl http://localhost:3000/users
// curl http://localhost:3000/users/1
// curl -X POST http://localhost:3000/users -H "Content-Type: application/json" -d '{"name":"Charlie","email":"charlie@example.com"}'
// curl -X PUT http://localhost:3000/users/1 -H "Content-Type: application/json" -d '{"name":"Alice Updated"}'
// curl -X DELETE http://localhost:3000/users/1
```

---

## 运行示例

```bash
# 1. 编译 TypeScript
npx tsc src/skills/handler-utils-skill.ts --outDir dist --module commonjs --target es2020

# 2. 运行示例
node dist/examples/example-8-rest-api.js

# 3. 测试 API
curl http://localhost:3000/users
curl -X POST http://localhost:3000/users -H "Content-Type: application/json" -d '{"name":"Test","email":"test@example.com"}'
```

---

## 总结

这些示例展示了 Handler Utils Skill 的核心功能：

1. ✅ **基础请求处理** - 解析请求和发送响应
2. ✅ **路由系统** - 支持参数化路径
3. ✅ **请求验证** - 灵活的数据验证
4. ✅ **错误处理** - 统一的错误响应格式
5. ✅ **中间件链** - 可组合的处理器
6. ✅ **完整 API** - RESTful CRUD 操作

根据需求选择合适的模式进行开发！
