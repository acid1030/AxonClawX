# 响应格式化中间件使用示例

## 快速开始

### 1. 基础用法

```typescript
import express from 'express';
import { responseFormatter, success, error, paginated } from './middleware/response-formatter';

const app = express();

// 注册中间件 (放在路由之前)
app.use(responseFormatter());

// 简单成功响应
app.get('/api/users/:id', (req, res) => {
  const user = { id: 1, name: 'Axon', email: 'axon@example.com' };
  res.json(success(user));
  // 响应:
  // {
  //   "success": true,
  //   "data": { "id": 1, "name": "Axon", "email": "axon@example.com" },
  //   "timestamp": "2026-03-13T08:32:00.000Z",
  //   "requestId": "req_1710316320000_abc123"
  // }
});

// 带消息的成功响应
app.post('/api/users', (req, res) => {
  const user = createUser(req.body);
  res.status(201).json(success(user, '用户创建成功'));
  // 响应:
  // {
  //   "success": true,
  //   "data": { ... },
  //   "message": "用户创建成功",
  //   "timestamp": "...",
  //   "requestId": "..."
  // }
});

// 错误响应
app.get('/api/users/:id', (req, res) => {
  const user = getUserById(req.params.id);
  if (!user) {
    return res.status(404).json(error('用户不存在', 'USER_NOT_FOUND'));
  }
  res.json(success(user));
  // 错误响应:
  // {
  //   "success": false,
  //   "data": null,
  //   "code": "USER_NOT_FOUND",
  //   "message": "用户不存在",
  //   "timestamp": "...",
  //   "requestId": "...",
  //   "error": {
  //     "message": "用户不存在"
  //   }
  // }
});
```

### 2. 使用 Response 扩展方法

注册中间件后，可以直接使用 `res.success()`, `res.error()`, `res.paginated()`:

```typescript
app.get('/api/users/:id', (req, res) => {
  const user = getUserById(req.params.id);
  if (!user) {
    return res.status(404).error('用户不存在', 'USER_NOT_FOUND');
  }
  res.success(user, '获取成功');
});

app.get('/api/users', (req, res) => {
  const users = getUsers();
  const total = getTotalCount();
  const page = parseInt(req.query.page as string) || 1;
  const pageSize = parseInt(req.query.pageSize as string) || 10;
  
  res.paginated(users, total, { page, pageSize, total });
});
```

### 3. 分页响应

```typescript
app.get('/api/articles', (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const pageSize = parseInt(req.query.pageSize as string) || 10;
  
  const articles = getArticles(page, pageSize);
  const total = getArticleCount();
  
  res.json(paginated(articles, total, { page, pageSize, total }));
  // 响应:
  // {
  //   "success": true,
  //   "data": [ ... ],
  //   "timestamp": "...",
  //   "requestId": "...",
  //   "pagination": {
  //     "page": 1,
  //     "pageSize": 10,
  //     "total": 100,
  //     "totalPages": 10,
  //     "hasNext": true,
  //     "hasPrev": false
  //   }
  // }
});
```

### 4. 配合错误处理中间件

```typescript
// 全局错误处理中间件
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err);
  
  // 使用标准错误格式
  res.status(err.status || 500).json(
    error(
      err.message,
      err.code || 'INTERNAL_ERROR',
      { stack: err.stack, details: err.details }
    )
  );
});

// 业务代码中直接抛出错误
app.get('/api/data', async (req, res, next) => {
  try {
    const data = await fetchData();
    res.success(data);
  } catch (err) {
    next(err); // 交给错误处理中间件
  }
});
```

### 5. 自定义配置

```typescript
// 自定义请求 ID 生成
app.use(responseFormatter({
  includeRequestId: true,
  hideDetailsInProduction: true,
  generateRequestId: () => {
    return `axon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}));

// 不包含请求 ID
app.use(responseFormatter({
  includeRequestId: false
}));
```

### 6. 完整示例

```typescript
import express, { Request, Response, NextFunction } from 'express';
import { 
  responseFormatter, 
  success, 
  error, 
  paginated,
  ApiResponse 
} from './middleware/response-formatter';

const app = express();

// 注册中间件
app.use(express.json());
app.use(responseFormatter());

// 获取单个用户
app.get('/api/users/:id', (req: Request, res: Response) => {
  const user = getUserById(req.params.id);
  
  if (!user) {
    return res.status(404).error('用户不存在', 'USER_NOT_FOUND');
  }
  
  res.success(user, '获取成功');
});

// 获取用户列表 (分页)
app.get('/api/users', (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const pageSize = parseInt(req.query.pageSize as string) || 10;
  
  const users = getUsers(page, pageSize);
  const total = getUserCount();
  
  res.paginated(users, total, { page, pageSize, total }, '获取成功');
});

// 创建用户
app.post('/api/users', (req: Request, res: Response) => {
  const { name, email } = req.body;
  
  if (!name || !email) {
    return res.status(400).error('姓名和邮箱必填', 'VALIDATION_ERROR');
  }
  
  const user = createUser({ name, email });
  res.status(201).success(user, '用户创建成功');
});

// 更新用户
app.put('/api/users/:id', (req: Request, res: Response) => {
  const user = updateUser(req.params.id, req.body);
  
  if (!user) {
    return res.status(404).error('用户不存在', 'USER_NOT_FOUND');
  }
  
  res.success(user, '更新成功');
});

// 删除用户
app.delete('/api/users/:id', (req: Request, res: Response) => {
  const deleted = deleteUser(req.params.id);
  
  if (!deleted) {
    return res.status(404).error('用户不存在', 'USER_NOT_FOUND');
  }
  
  res.success(null, '删除成功');
});

// 全局错误处理
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled error:', err);
  
  res.status(500).error(
    '服务器内部错误',
    'INTERNAL_ERROR',
    process.env.NODE_ENV === 'development' ? { stack: err.stack } : undefined
  );
});

// 404 处理
app.use((req: Request, res: Response) => {
  res.status(404).error('接口不存在', 'ROUTE_NOT_FOUND');
});

export default app;
```

## 响应格式规范

### 成功响应

```json
{
  "success": true,
  "data": { ... },
  "message": "可选消息",
  "timestamp": "2026-03-13T08:32:00.000Z",
  "requestId": "req_1710316320000_abc123"
}
```

### 错误响应

```json
{
  "success": false,
  "data": null,
  "code": "ERROR_CODE",
  "message": "错误消息",
  "timestamp": "2026-03-13T08:32:00.000Z",
  "requestId": "req_1710316320000_abc123",
  "error": {
    "message": "详细错误消息",
    "details": { ... },  // 仅开发环境
    "stack": "..."       // 仅开发环境
  }
}
```

### 分页响应

```json
{
  "success": true,
  "data": [...],
  "message": "可选消息",
  "timestamp": "2026-03-13T08:32:00.000Z",
  "requestId": "req_1710316320000_abc123",
  "pagination": {
    "page": 1,
    "pageSize": 10,
    "total": 100,
    "totalPages": 10,
    "hasNext": true,
    "hasPrev": false
  }
}
```

## 最佳实践

1. **始终使用标准格式**: 所有 API 响应都应遵循统一格式
2. **提供有意义的错误代码**: 如 `USER_NOT_FOUND`, `VALIDATION_ERROR`
3. **生产环境隐藏细节**: 避免泄露敏感信息
4. **使用请求 ID 追踪**: 便于日志关联和问题排查
5. **分页参数验证**: 限制最大 pageSize 防止滥用

---

**作者**: Axon  
**版本**: 1.0.0  
**创建时间**: 2026-03-13
