# JWT 认证中间件

> 强大的 JWT 认证解决方案，支持验证、刷新、权限检查

## 🚀 快速开始

### 安装依赖

本项目使用 Node.js 原生 `crypto` 模块，**无需额外依赖**。

### 基础使用

```typescript
import { createAuthMiddleware, presets } from './middleware/auth';

// 1. 创建配置 (开发环境)
const config = presets.development();

// 2. 创建中间件
const authMiddleware = createAuthMiddleware(config);

// 3. 在 Express 中使用
app.get('/api/protected', authMiddleware, (req, res) => {
  const user = req.user; // 已验证的用户上下文
  res.json({ userId: user.userId });
});
```

## 📋 功能特性

### 1. JWT 验证

- ✅ 支持 HS256/HS384/HS512 (HMAC)
- ✅ 支持 RS256/RS384/RS512 (RSA)
- ✅ 多密钥轮换支持
- ✅ 时钟漂移容差
- ✅ 签发者/受众验证

### 2. Token 刷新

- ✅ 支持过期 Token 刷新
- ✅ 可配置刷新窗口 (默认 24 小时)
- ✅ 自动继承用户信息

### 3. 权限检查

- ✅ 基于资源的权限控制
- ✅ 支持通配符 (`*`)
- ✅ 角色支持 (admin 超级权限)
- ✅ 细粒度操作控制

## 🔧 API 参考

### 核心函数

#### `createAuthMiddleware(config)`

创建认证中间件。

```typescript
const middleware = createAuthMiddleware({
  keys: [{
    kid: 'key-1',
    key: 'your-secret-key',
    type: 'HS256',
    primary: true,
  }],
  issuer: 'your-app',
  audience: 'your-api',
  clockToleranceMs: 30000,
});
```

#### `signJWT(payload, keyConfig, expiresIn)`

签发 JWT Token。

```typescript
const token = signJWT(
  {
    sub: 'user-123',
    role: 'admin',
    permissions: [
      { resource: 'articles', actions: ['read', 'write'] }
    ],
  },
  keyConfig,
  3600 // 1 小时
);
```

#### `verifyJWT(token, config)`

验证 JWT Token。

```typescript
try {
  const payload = verifyJWT(token, config);
  console.log('User:', payload.sub);
} catch (error) {
  console.log('验证失败:', error.code);
}
```

#### `refreshToken(token, config, newExpiresIn)`

刷新 Token。

```typescript
const result = refreshToken(oldToken, config, 7200);
if (result.success) {
  console.log('新 Token:', result.token);
}
```

#### `checkPermission(context, resource, action)`

检查权限。

```typescript
const result = checkPermission(context, 'articles', 'delete');
if (result.allowed) {
  // 允许操作
}
```

### 权限中间件

```typescript
import { createPermissionMiddleware } from './auth';

// 需要特定权限
app.delete(
  '/api/articles/:id',
  authMiddleware,
  createPermissionMiddleware([
    { resource: 'articles', action: 'delete' }
  ]),
  handler
);
```

## 🎯 使用场景

### 场景 1: 用户登录

```typescript
app.post('/api/login', async (req, res) => {
  const user = await authenticate(req.body);
  
  const token = signJWT(
    {
      sub: user.id,
      role: user.role,
      permissions: user.permissions,
    },
    primarykey,
    3600
  );
  
  res.json({ token, expiresIn: 3600 });
});
```

### 场景 2: Token 刷新端点

```typescript
app.post('/api/refresh', async (req, res) => {
  const result = refreshToken(req.body.refreshToken, config);
  
  if (!result.success) {
    return res.status(401).json({ error: result.error });
  }
  
  res.json({ token: result.token });
});
```

### 场景 3: 保护 API 路由

```typescript
// 需要认证
app.get('/api/profile', authMiddleware, (req, res) => {
  res.json({ user: req.user });
});

// 需要特定权限
app.post(
  '/api/articles',
  authMiddleware,
  createPermissionMiddleware([
    { resource: 'articles', action: 'write' }
  ]),
  (req, res) => { /* ... */ }
);
```

### 场景 4: 多角色权限

```typescript
const token = signJWT(
  {
    sub: 'user-123',
    role: 'editor',
    permissions: [
      { resource: 'articles', actions: ['read', 'write'] },
      { resource: 'comments', actions: ['read', 'write', 'delete'] },
      { resource: 'users', actions: ['read'] },
    ],
  },
  keyConfig,
  3600
);
```

## 🔐 密钥管理

### 开发环境 (HS256)

```typescript
const config = presets.development();
// 自动生成安全的随机密钥
```

### 生产环境 (RS256)

```typescript
const { publicKey, privateKey } = generateRSAKeyPair();

const config = presets.production(publicKey, privateKey);
```

### 密钥轮换

```typescript
const config = presets.rotation([
  { kid: 'key-2024-01', key: '...', type: 'HS256', primary: true },
  { kid: 'key-2023-12', key: '...', type: 'HS256', primary: false },
  { kid: 'key-2023-11', key: '...', type: 'HS256', primary: false },
]);
```

## 📊 错误处理

中间件会自动处理错误并返回适当的 HTTP 状态码:

| 状态码 | 错误代码 | 说明 |
|--------|----------|------|
| 401 | `UNAUTHORIZED` | 缺少 Token |
| 401 | `TOKEN_EXPIRED` | Token 已过期 |
| 403 | `SIGNATURE_INVALID` | 签名无效 |
| 403 | `FORBIDDEN` | 权限不足 |

### 错误响应示例

```json
{
  "error": "TOKEN_EXPIRED",
  "message": "Token has expired",
  "expiredAt": 1710316800000
}
```

## 🛠️ 工具函数

```typescript
// 生成 HMAC 密钥
const secret = generateHMACKey(32);

// 生成 RSA 密钥对
const { publicKey, privateKey } = generateRSAKeyPair();

// 从请求中提取 Token
const token = extractToken(req);
```

## 📁 文件结构

```
src/middleware/
├── auth.ts           # 核心实现
├── auth.example.ts   # 使用示例
└── auth.md           # 本文档
```

## 🎓 完整示例

查看 `auth.example.ts` 获取 10 个完整的使用示例，包括:

1. 开发环境配置
2. 生产环境配置
3. 签发 Token
4. 验证 Token
5. 刷新 Token
6. 权限检查
7. Express 集成
8. 密钥轮换
9. 自定义 Token 提取
10. 完整登录/刷新流程

## ⚠️ 安全建议

1. **生产环境使用 RS256** - 比 HS256 更安全
2. **定期轮换密钥** - 建议每月轮换
3. **短期 Access Token** - 1 小时或更短
4. **使用 Refresh Token** - 长期凭证单独管理
5. **HTTPS 传输** - 永远不要在 HTTP 上传输 Token
6. **存储安全** - 客户端使用 HttpOnly Cookie 或安全存储

## 📝 许可证

MIT License - AxonClaw Project
