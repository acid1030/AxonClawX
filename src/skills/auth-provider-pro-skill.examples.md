# 🔐 KAEL Auth Provider Pro - 使用示例

**版本:** 1.0.0  
**作者:** KAEL  
**创建时间:** 2026-03-13

---

## 📋 目录

1. [快速开始](#快速开始)
2. [JWT 认证](#jwt-认证)
3. [OAuth2 认证](#oauth2-认证)
4. [API Key 认证](#api-key-认证)
5. [Basic Auth](#basic-auth)
6. [权限验证 (RBAC)](#权限验证-rbac)
7. [密码哈希](#密码哈希)
8. [完整示例](#完整示例)

---

## 🚀 快速开始

### 安装依赖

```bash
# 无需额外依赖，使用 Node.js 原生 crypto 和 Web Crypto API
```

### 基础使用

```typescript
import { 
  generateJWT, 
  verifyJWT, 
  createAuthProvider,
  defaultRoles 
} from './auth-provider-pro-skill';

// 快速生成和验证 JWT
const token = generateJWT(
  { userId: '123', email: 'user@example.com' },
  'your-secret-key',
  3600
);

const result = verifyJWT(token, 'your-secret-key');
console.log(result.valid); // true
console.log(result.payload?.userId); // '123'
```

---

## 🔑 JWT 认证

### 1. 创建认证提供器

```typescript
import { createAuthProvider, defaultRoles } from './auth-provider-pro-skill';

const authProvider = createAuthProvider({
  jwtSecret: 'your-super-secret-key-min-32-chars',
  jwtExpiresIn: 3600,           // 1 小时
  refreshTokenExpiresIn: 604800, // 7 天
  roles: defaultRoles
});
```

### 2. 生成 JWT Token

```typescript
const payload = {
  userId: 'user-123',
  email: 'user@example.com',
  roles: ['admin', 'moderator'],
  permissions: ['posts:write', 'comments:delete']
};

const token = authProvider.generateJWT(payload, 7200); // 2 小时过期
console.log('JWT Token:', token);
// eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c2VyLTEyMyIsImVtYWlsIjoidXNlckBleGFtcGxlLmNvbSIsInJvbGVzIjpbImFkbWluIiwibW9kZXJhdG9yIl0sImlhdCI6MTY0NzM2MjgwMCwiZXhwIjoxNjQ3MzY2NDAwfQ.xxx
```

### 3. 验证 JWT Token

```typescript
const result = authProvider.verifyJWT(token);

if (result.valid) {
  console.log('用户 ID:', result.payload?.userId);
  console.log('邮箱:', result.payload?.email);
  console.log('角色:', result.payload?.roles);
} else {
  console.error('验证失败:', result.error);
  if (result.expired) {
    console.log('Token 已过期');
  }
}
```

### 4. 刷新 JWT Token

```typescript
const newTokenInfo = authProvider.refreshJWT(token, 7200);

if (newTokenInfo) {
  console.log('新 Token:', newTokenInfo.token);
  console.log('过期时间:', new Date(newTokenInfo.expiresAt).toLocaleString());
  console.log('Token 类型:', newTokenInfo.tokenType);
} else {
  console.log('刷新失败 (可能已过期或无效)');
}
```

### 5. 撤销 JWT Token

```typescript
// 用户登出时撤销 token
authProvider.revokeJWT(token);

// 验证被撤销的 token
const result = authProvider.verifyJWT(token);
console.log(result.valid); // false
console.log(result.error); // 'Token has been revoked'
```

---

## 🌐 OAuth2 认证

### 1. 配置 OAuth2 Provider (以 GitHub 为例)

```typescript
import { createAuthProvider } from './auth-provider-pro-skill';

const authProvider = createAuthProvider({ jwtSecret: 'temp' });

const githubConfig = {
  clientId: 'your-github-client-id',
  clientSecret: 'your-github-client-secret',
  authorizeUrl: 'https://github.com/login/oauth/authorize',
  tokenUrl: 'https://github.com/login/oauth/access_token',
  redirectUri: 'https://yourapp.com/auth/callback',
  scope: ['user:email', 'read:user'],
  pkce: true // 启用 PKCE 增强安全
};
```

### 2. 生成授权 URL

```typescript
// 生成 state 防止 CSRF
const state = authProvider.generateState();

// 存储 state (会话或 Redis)
storeInSession('oauth_state', state);

// 生成授权 URL
const authorizeUrl = authProvider.generateOAuth2AuthorizeUrl(githubConfig, state);

// 重定向用户
res.redirect(authorizeUrl);
```

### 3. 处理回调

```typescript
// 回调路由 /auth/callback
app.get('/auth/callback', async (req, res) => {
  const { code, state } = req.query;
  
  // 验证 state
  const storedState = getFromSession('oauth_state');
  if (!authProvider.validateOAuth2State(state as string, storedState)) {
    return res.status(400).json({ error: 'Invalid state' });
  }
  
  try {
    // 交换授权码
    const tokenInfo = await authProvider.exchangeOAuth2Code(
      githubConfig,
      code as string,
      state as string
    );
    
    // 使用 access token 获取用户信息
    const userInfo = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${tokenInfo.token}`
      }
    }).then(r => r.json());
    
    // 生成应用内的 JWT
    const appToken = authProvider.generateJWT({
      userId: userInfo.id.toString(),
      email: userInfo.email,
      provider: 'github'
    });
    
    res.json({ token: appToken, user: userInfo });
  } catch (error) {
    res.status(500).json({ error: 'OAuth2 exchange failed' });
  }
});
```

### 4. PKCE Code Verifier/Challenge

```typescript
// 生成 Code Verifier
const codeVerifier = authProvider.generateCodeVerifier();
console.log('Code Verifier:', codeVerifier);

// 生成 Code Challenge
const codeChallenge = await authProvider.generateCodeChallenge(codeVerifier);
console.log('Code Challenge:', codeChallenge);

// 在授权 URL 中使用
const params = new URLSearchParams({
  code_challenge: codeChallenge,
  code_challenge_method: 'S256'
});
```

---

## 🔐 API Key 认证

### 1. 生成 API Key

```typescript
import { generateAPIKey, createAuthProvider } from './auth-provider-pro-skill';

const authProvider = createAuthProvider({ jwtSecret: 'temp' });

// 生成 API Key
const apiKey = authProvider.generateAPIKey({
  name: 'Production App',
  permissions: ['posts:read', 'posts:write', 'users:read'],
  expiresDays: 90 // 90 天后过期
});

console.log('API Key:', apiKey.key);
// ak_x7K9mP2nQ4vL8wR3tY6uI0oA5sD1fG9hJ2kM4bN7cX
console.log('权限:', apiKey.permissions);
console.log('过期时间:', new Date(apiKey.expiresAt!).toLocaleString());
```

### 2. 验证 API Key

```typescript
// 从数据库加载存储的 API Key
const storedKey = await loadAPIKeyFromDB('ak_x7K9mP2nQ4vL8wR3tY6uI0oA5sD1fG9hJ2kM4bN7cX');

// 验证
const isValid = authProvider.validateAPIKey(providedKey, storedKey);
if (!isValid) {
  return res.status(401).json({ error: 'Invalid API Key' });
}
```

### 3. 检查 API Key 权限

```typescript
// 检查是否有权限执行操作
const permResult = authProvider.checkAPIKeyPermissions(
  storedKey,
  'posts',
  'delete'
);

if (!permResult.allowed) {
  return res.status(403).json({
    error: 'Permission denied',
    reason: permResult.reason,
    missing: permResult.missingPermissions
  });
}

// 执行删除操作
await deletePost(postId);
```

### 4. 在中间件中使用

```typescript
// Express 中间件示例
function apiKeyAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  const apiKeyHeader = req.headers['x-api-key'] as string;
  
  if (!apiKeyHeader) {
    return res.status(401).json({ error: 'API Key required' });
  }
  
  // 从数据库加载
  const storedKey = await loadAPIKeyFromDB(apiKeyHeader);
  if (!storedKey) {
    return res.status(401).json({ error: 'Invalid API Key' });
  }
  
  // 验证
  const isValid = authProvider.validateAPIKey(apiKeyHeader, storedKey);
  if (!isValid) {
    return res.status(401).json({ error: 'API Key expired or invalid' });
  }
  
  // 附加到请求对象
  (req as any).apiKey = storedKey;
  next();
}

// 使用
app.use('/api/*', apiKeyAuthMiddleware);
```

---

## 👤 Basic Auth

### 1. 编码认证凭据

```typescript
import { createAuthProvider } from './auth-provider-pro-skill';

const authProvider = createAuthProvider({ 
  jwtSecret: 'temp',
  basicAuthRealm: 'My App'
});

const credentials = {
  username: 'admin',
  password: 'SecurePassword123'
};

const authHeader = authProvider.encodeBasicAuth(credentials);
console.log(authHeader);
// Basic YWRtaW46U2VjdXJlUGFzc3dvcmQxMjM=
```

### 2. 解码认证凭据

```typescript
const decoded = authProvider.decodeBasicAuth(authHeader);
if (decoded) {
  console.log('用户名:', decoded.username);
  console.log('密码:', decoded.password);
}
```

### 3. 验证 Basic Auth

```typescript
const isValid = authProvider.validateBasicAuth(
  authHeader,
  { username: 'admin', password: 'SecurePassword123' }
);

if (!isValid) {
  res.setHeader('WWW-Authenticate', 'Basic realm="My App"');
  return res.status(401).json({ error: 'Unauthorized' });
}
```

### 4. Basic Auth 中间件

```typescript
function basicAuthMiddleware(
  validCredentials: { username: string; password: string }
) {
  return (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      res.setHeader('WWW-Authenticate', 'Basic realm="Secure Area"');
      return res.status(401).json({ error: 'Authorization required' });
    }
    
    const isValid = authProvider.validateBasicAuth(authHeader, validCredentials);
    if (!isValid) {
      res.setHeader('WWW-Authenticate', 'Basic realm="Secure Area"');
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    next();
  };
}

// 使用
app.use('/admin', basicAuthMiddleware({
  username: 'admin',
  password: 'SuperSecret123'
}));
```

---

## 🛡️ 权限验证 (RBAC)

### 1. 定义角色和权限

```typescript
import { createAuthProvider, Role } from './auth-provider-pro-skill';

const customRoles: Role[] = [
  {
    name: 'superadmin',
    permissions: [
      { resource: '*', actions: ['*'] } // 所有资源的所有操作
    ]
  },
  {
    name: 'admin',
    permissions: [
      { resource: 'users', actions: ['read', 'write', 'delete'] },
      { resource: 'posts', actions: ['read', 'write', 'delete'] },
      { resource: 'comments', actions: ['read', 'write', 'delete'] }
    ]
  },
  {
    name: 'editor',
    permissions: [
      { resource: 'posts', actions: ['read', 'write'] },
      { resource: 'comments', actions: ['read', 'write', 'delete'] }
    ],
    inherits: ['user'] // 继承 user 角色的权限
  },
  {
    name: 'user',
    permissions: [
      { resource: 'profile', actions: ['read', 'write'] },
      { resource: 'posts', actions: ['read'] },
      { resource: 'comments', actions: ['read', 'write'] }
    ]
  },
  {
    name: 'guest',
    permissions: [
      { resource: 'posts', actions: ['read'] },
      { resource: 'public', actions: ['read'] }
    ]
  }
];

const authProvider = createAuthProvider({
  jwtSecret: 'your-secret',
  roles: customRoles
});
```

### 2. 检查权限

```typescript
// 检查用户是否有权限
const result = authProvider.checkPermission(
  ['editor'], // 用户的角色
  'posts',    // 资源
  'delete'    // 操作
);

console.log(result.allowed); // false
console.log(result.reason);  // 'Permission denied'
```

### 3. 检查角色

```typescript
const hasAdminRole = authProvider.hasRole(['editor', 'user'], 'admin');
console.log(hasAdminRole); // false

const hasUserRole = authProvider.hasRole(['editor', 'user'], 'user');
console.log(hasUserRole); // true
```

### 4. 简化权限检查

```typescript
const canWritePosts = authProvider.hasPermission(
  ['editor'],
  'posts',
  'write'
);
console.log(canWritePosts); // true
```

### 5. 权限中间件

```typescript
function requirePermission(resource: string, action: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const userRoles = (req as any).user?.roles || [];
    
    const result = authProvider.checkPermission(userRoles, resource, action);
    
    if (!result.allowed) {
      return res.status(403).json({
        error: 'Forbidden',
        reason: result.reason,
        missing: result.missingPermissions
      });
    }
    
    next();
  };
}

// 使用
app.delete(
  '/api/posts/:id',
  requirePermission('posts', 'delete'),
  async (req, res) => {
    // 只有有删除权限的用户能访问
    await deletePost(req.params.id);
    res.json({ success: true });
  }
);
```

### 6. 基于角色的路由保护

```typescript
function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const userRoles = (req as any).user?.roles || [];
    
    const hasRequiredRole = roles.some(role => 
      authProvider.hasRole(userRoles, role)
    );
    
    if (!hasRequiredRole) {
      return res.status(403).json({
        error: 'Forbidden',
        message: `Required roles: ${roles.join(' or ')}`
      });
    }
    
    next();
  };
}

// 使用
app.get('/admin/users', requireRole('admin', 'superadmin'), (req, res) => {
  // 只有 admin 或 superadmin 能访问
  res.json({ users: [] });
});
```

---

## 🔒 密码哈希

### 1. 哈希密码

```typescript
import { hashPassword } from './auth-provider-pro-skill';

const password = 'MySecurePassword123';
const { hash, salt } = await hashPassword(password);

console.log('哈希:', hash);
console.log('盐值:', salt);

// 存储到数据库
await db.users.create({
  username: 'newuser',
  passwordHash: hash,
  passwordSalt: salt
});
```

### 2. 验证密码

```typescript
import { verifyPassword } from './auth-provider-pro-skill';

// 从数据库加载
const user = await db.users.findByUsername('newuser');

// 验证密码
const isValid = await verifyPassword(
  providedPassword,
  user.passwordHash,
  user.passwordSalt
);

if (isValid) {
  console.log('密码正确');
  // 生成 token
  const token = generateJWT({ userId: user.id });
} else {
  console.log('密码错误');
}
```

### 3. 完整注册/登录流程

```typescript
// 注册
app.post('/register', async (req, res) => {
  const { username, password, email } = req.body;
  
  // 哈希密码
  const { hash, salt } = await hashPassword(password);
  
  // 创建用户
  const user = await db.users.create({
    username,
    email,
    passwordHash: hash,
    passwordSalt: salt,
    roles: ['user']
  });
  
  // 生成 JWT
  const token = generateJWT({
    userId: user.id,
    email: user.email,
    roles: user.roles
  });
  
  res.json({ token, user: { id: user.id, email: user.email } });
});

// 登录
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  
  // 查找用户
  const user = await db.users.findByUsername(username);
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  
  // 验证密码
  const isValid = await verifyPassword(
    password,
    user.passwordHash,
    user.passwordSalt
  );
  
  if (!isValid) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  
  // 生成 JWT
  const token = generateJWT({
    userId: user.id,
    email: user.email,
    roles: user.roles
  }, 'your-secret-key', 3600);
  
  res.json({ token, user: { id: user.id, email: user.email } });
});
```

---

## 📦 完整示例

### Express 应用完整集成

```typescript
import express from 'express';
import { createAuthProvider, defaultRoles } from './auth-provider-pro-skill';

const app = express();
app.use(express.json());

// 初始化认证提供器
const authProvider = createAuthProvider({
  jwtSecret: process.env.JWT_SECRET || 'change-me-in-production',
  jwtExpiresIn: 3600,
  roles: defaultRoles
});

// 认证中间件
function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization required' });
  }
  
  const token = authHeader.slice(7);
  const result = authProvider.verifyJWT(token);
  
  if (!result.valid) {
    return res.status(401).json({
      error: 'Invalid token',
      reason: result.error
    });
  }
  
  (req as any).user = result.payload;
  next();
}

// 公开路由：注册
app.post('/api/auth/register', async (req, res) => {
  const { username, password, email } = req.body;
  
  const { hash, salt } = await authProvider.hashPassword(password);
  
  // TODO: 保存到数据库
  const user = { id: '1', username, email, passwordHash: hash, passwordSalt: salt };
  
  const token = authProvider.generateJWT({
    userId: user.id,
    email: user.email,
    roles: ['user']
  });
  
  res.json({ token, user: { id: user.id, email: user.email } });
});

// 公开路由：登录
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  
  // TODO: 从数据库加载用户
  const user = { 
    id: '1', 
    username, 
    email: 'user@example.com',
    passwordHash: '...',
    passwordSalt: '...',
    roles: ['user']
  };
  
  const isValid = await authProvider.verifyPassword(
    password,
    user.passwordHash,
    user.passwordSalt
  );
  
  if (!isValid) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  
  const token = authProvider.generateJWT({
    userId: user.id,
    email: user.email,
    roles: user.roles
  });
  
  res.json({ token, user: { id: user.id, email: user.email } });
});

// 保护的路由：获取个人资料
app.get('/api/profile', authMiddleware, (req, res) => {
  const user = (req as any).user;
  res.json({ 
    userId: user.userId,
    email: user.email,
    roles: user.roles
  });
});

// 保护的路由：删除帖子 (需要权限)
app.delete('/api/posts/:id', 
  authMiddleware,
  (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    const result = authProvider.checkPermission(
      user.roles || [],
      'posts',
      'delete'
    );
    
    if (!result.allowed) {
      return res.status(403).json({ error: 'Permission denied' });
    }
    
    next();
  },
  async (req, res) => {
    // TODO: 删除帖子
    res.json({ success: true, postId: req.params.id });
  }
);

// 启动服务器
app.listen(3000, () => {
  console.log('🚀 Server running on http://localhost:3000');
});
```

---

## 🎯 最佳实践

### 1. JWT 安全

```typescript
// ✅ 好的做法
const authProvider = createAuthProvider({
  jwtSecret: process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex'),
  jwtExpiresIn: 3600, // 短时间过期
  refreshTokenExpiresIn: 604800
});

// ❌ 坏的做法
const authProvider = createAuthProvider({
  jwtSecret: '123456', // 太简单
  jwtExpiresIn: 31536000 // 1 年太长
});
```

### 2. Token 存储

```typescript
// ✅ 前端存储
// - 使用 httpOnly cookie (防止 XSS)
// - 或使用内存存储 + 刷新 token 机制

// ❌ 避免
// - localStorage (易受 XSS 攻击)
// - URL 参数 (会记录在日志中)
```

### 3. 密码安全

```typescript
// ✅ 好的做法
const { hash, salt } = await authProvider.hashPassword(password);
// 使用唯一盐值
// 验证时使用相同盐值

// ❌ 坏的做法
// - 不使用盐值
// - 所有用户使用相同盐值
// - 明文存储密码
```

### 4. 权限最小化

```typescript
// ✅ 只授予必要权限
const apiKey = authProvider.generateAPIKey({
  name: 'Read-only App',
  permissions: ['posts:read'] // 只读
});

// ❌ 过度授权
const apiKey = authProvider.generateAPIKey({
  name: 'My App',
  permissions: ['*'] // 所有权限
});
```

---

## 📊 API 参考

### 核心接口

| 方法 | 描述 | 参数 | 返回值 |
|------|------|------|--------|
| `generateJWT` | 生成 JWT | payload, expiresIn | string |
| `verifyJWT` | 验证 JWT | token | TokenValidationResult |
| `refreshJWT` | 刷新 JWT | token, expiresIn | TokenInfo \| null |
| `revokeJWT` | 撤销 JWT | token | boolean |
| `generateOAuth2AuthorizeUrl` | OAuth2 授权 URL | config, state | string |
| `exchangeOAuth2Code` | 交换 OAuth2 码 | config, code, state | Promise<TokenInfo> |
| `generateAPIKey` | 生成 API Key | config | APIKeyConfig |
| `validateAPIKey` | 验证 API Key | key, storedKey | boolean |
| `checkPermission` | 检查权限 | roles, resource, action | PermissionCheckResult |
| `hasRole` | 检查角色 | userRoles, requiredRole | boolean |
| `hashPassword` | 哈希密码 | password, salt? | Promise<{hash, salt}> |
| `verifyPassword` | 验证密码 | password, hash, salt | Promise<boolean> |

---

## 🐛 常见问题

### Q: Token 过期了怎么办？

A: 使用刷新 token 机制或重新登录：

```typescript
const newTokenInfo = authProvider.refreshJWT(oldToken);
if (!newTokenInfo) {
  // 刷新失败，要求重新登录
  redirectToLogin();
}
```

### Q: 如何实现多设备登录？

A: 为每个设备生成不同的 token，使用不同的 jti (JWT ID) 标识：

```typescript
const token = authProvider.generateJWT({
  userId: '123',
  jti: crypto.randomUUID(), // 唯一标识
  deviceId: 'device-xyz'
});
```

### Q: 如何禁用某个用户的所有 token？

A: 维护用户黑名单或使用 token 版本：

```typescript
// 方法 1: 在 payload 中添加版本号
const token = authProvider.generateJWT({
  userId: '123',
  tokenVersion: 2 // 递增版本
});

// 验证时检查版本
if (payload.tokenVersion < getUserTokenVersion(payload.userId)) {
  return { valid: false, error: 'Token version outdated' };
}
```

---

**文档版本:** 1.0.0  
**最后更新:** 2026-03-13  
**维护者:** KAEL
