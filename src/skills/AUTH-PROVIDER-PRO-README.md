# 🔐 KAEL Auth Provider Pro

**专业认证提供器工具** - 多认证方式、Token 管理、权限验证

---

## 📦 文件结构

```
src/skills/
├── auth-provider-pro-skill.ts          # 主实现文件
├── auth-provider-pro-skill.examples.md # 详细使用文档
└── AUTH-PROVIDER-PRO-README.md         # 本文件 (快速参考)
```

---

## 🚀 快速开始 (5 分钟)

### 1. 安装

无需额外依赖，使用 Node.js 原生 `crypto` 和 Web Crypto API。

### 2. 基础使用

```typescript
import { 
  generateJWT, 
  verifyJWT,
  hashPassword,
  verifyPassword
} from './auth-provider-pro-skill';

// JWT 认证
const token = generateJWT(
  { userId: '123', email: 'user@example.com', roles: ['admin'] },
  'your-secret-key',
  3600
);

const result = verifyJWT(token, 'your-secret-key');
if (result.valid) {
  console.log('用户:', result.payload.userId);
}

// 密码哈希
const { hash, salt } = await hashPassword('SecurePassword123');
const isValid = await verifyPassword('SecurePassword123', hash, salt);
```

### 3. 运行示例

```bash
npx ts-node src/skills/auth-provider-pro-skill.ts
```

---

## ✨ 核心功能

### 1. JWT 认证

```typescript
import { createAuthProvider } from './auth-provider-pro-skill';

const authProvider = createAuthProvider({
  jwtSecret: 'your-secret-key',
  jwtExpiresIn: 3600
});

// 生成
const token = authProvider.generateJWT({ userId: '123' });

// 验证
const result = authProvider.verifyJWT(token);

// 刷新
const newToken = authProvider.refreshJWT(token);

// 撤销
authProvider.revokeJWT(token);
```

### 2. OAuth2 认证

```typescript
const config = {
  clientId: 'github-client-id',
  clientSecret: 'github-secret',
  authorizeUrl: 'https://github.com/login/oauth/authorize',
  tokenUrl: 'https://github.com/login/oauth/access_token',
  redirectUri: 'https://yourapp.com/callback',
  scope: ['user:email']
};

// 生成授权 URL
const state = authProvider.generateState();
const url = authProvider.generateOAuth2AuthorizeUrl(config, state);

// 交换授权码
const tokenInfo = await authProvider.exchangeOAuth2Code(config, code, state);
```

### 3. API Key 认证

```typescript
// 生成
const apiKey = authProvider.generateAPIKey({
  name: 'Production App',
  permissions: ['posts:read', 'posts:write'],
  expiresDays: 90
});

// 验证
const isValid = authProvider.validateAPIKey(providedKey, storedKey);

// 权限检查
const result = authProvider.checkAPIKeyPermissions(
  storedKey,
  'posts',
  'delete'
);
```

### 4. Basic Auth

```typescript
// 编码
const authHeader = authProvider.encodeBasicAuth({
  username: 'admin',
  password: 'SecurePassword123'
});

// 解码
const credentials = authProvider.decodeBasicAuth(authHeader);

// 验证
const isValid = authProvider.validateBasicAuth(authHeader, credentials);
```

### 5. 权限验证 (RBAC)

```typescript
import { createAuthProvider, defaultRoles } from './auth-provider-pro-skill';

const authProvider = createAuthProvider({
  jwtSecret: 'secret',
  roles: defaultRoles
});

// 检查权限
const result = authProvider.checkPermission(
  ['admin'],    // 用户角色
  'users',      // 资源
  'delete'      // 操作
);

if (result.allowed) {
  // 执行删除
} else {
  console.log('缺少权限:', result.missingPermissions);
}

// 检查角色
const hasRole = authProvider.hasRole(['editor', 'user'], 'admin');
```

---

## 📊 API 参考

### 快速函数 (无需实例化)

| 函数 | 描述 | 示例 |
|------|------|------|
| `generateJWT` | 生成 JWT | `generateJWT(payload, secret, expiresIn)` |
| `verifyJWT` | 验证 JWT | `verifyJWT(token, secret)` |
| `generateAPIKey` | 生成 API Key | `generateAPIKey(name, permissions, expiresDays)` |
| `hashPassword` | 哈希密码 | `await hashPassword(password)` |
| `verifyPassword` | 验证密码 | `await verifyPassword(password, hash, salt)` |
| `checkPermission` | 检查权限 | `checkPermission(roles, resource, action)` |

### 认证提供器方法

| 方法 | 描述 |
|------|------|
| `generateJWT(payload, expiresIn?)` | 生成 JWT Token |
| `verifyJWT(token)` | 验证 JWT Token |
| `refreshJWT(token, expiresIn?)` | 刷新 JWT Token |
| `revokeJWT(token)` | 撤销 JWT Token |
| `generateOAuth2AuthorizeUrl(config, state)` | 生成 OAuth2 授权 URL |
| `exchangeOAuth2Code(config, code, state)` | 交换 OAuth2 授权码 |
| `validateOAuth2State(provided, stored)` | 验证 OAuth2 State |
| `generateAPIKey(config)` | 生成 API Key |
| `validateAPIKey(key, storedKey)` | 验证 API Key |
| `checkAPIKeyPermissions(key, resource, action)` | 检查 API Key 权限 |
| `encodeBasicAuth(credentials)` | 编码 Basic Auth 头 |
| `decodeBasicAuth(authHeader)` | 解码 Basic Auth 头 |
| `validateBasicAuth(authHeader, credentials)` | 验证 Basic Auth |
| `checkPermission(roles, resource, action)` | 检查权限 |
| `hasRole(userRoles, requiredRole)` | 检查角色 |
| `hasPermission(userRoles, resource, action)` | 检查权限 (简化) |
| `generateState()` | 生成 OAuth2 State |
| `generateCodeVerifier()` | 生成 PKCE Code Verifier |
| `generateCodeChallenge(verifier)` | 生成 PKCE Code Challenge |
| `hashPassword(password, salt?)` | 哈希密码 |
| `verifyPassword(password, hash, salt)` | 验证密码 |

---

## 🎯 预定义角色

```typescript
// 默认角色
defaultRoles = [
  { name: 'admin', permissions: [{ resource: '*', actions: ['*'] }] },
  { name: 'user', permissions: [...] },
  { name: 'guest', permissions: [...] },
  { name: 'moderator', permissions: [...], inherits: ['user'] }
]
```

---

## 🔒 安全最佳实践

### ✅ 推荐做法

1. **使用强密钥**: 至少 32 字符随机字符串
2. **短过期时间**: JWT 1-2 小时，刷新 Token 7 天
3. **使用 HTTPS**: 所有认证相关请求
4. **密码加盐**: 每个用户唯一盐值
5. **权限最小化**: 只授予必要权限
6. **httpOnly Cookie**: 前端存储 Token

### ❌ 避免做法

1. ❌ 弱密钥 (`123456`, `secret`)
2. ❌ Token 过期时间过长 (1 年)
3. ❌ HTTP 传输认证信息
4. ❌ 明文存储密码
5. ❌ 过度授权 (`*` 所有权限)
6. ❌ localStorage 存储 Token

---

## 📝 完整示例

### Express 应用集成

```typescript
import express from 'express';
import { createAuthProvider, defaultRoles } from './auth-provider-pro-skill';

const app = express();
const authProvider = createAuthProvider({
  jwtSecret: process.env.JWT_SECRET,
  roles: defaultRoles
});

// 认证中间件
function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.slice(7);
  const result = authProvider.verifyJWT(token);
  
  if (!result.valid) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  req.user = result.payload;
  next();
}

// 登录
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  // ... 验证密码
  const token = authProvider.generateJWT({ userId: user.id });
  res.json({ token });
});

// 保护的路由
app.get('/profile', authMiddleware, (req, res) => {
  res.json({ user: req.user });
});

app.listen(3000);
```

---

## 🐛 常见问题

### Q: Token 过期了怎么办？

使用刷新 token 机制或重新登录:

```typescript
const newToken = authProvider.refreshJWT(oldToken);
if (!newToken) {
  // 要求重新登录
}
```

### Q: 如何实现多设备登录？

为每个设备生成不同的 token:

```typescript
const token = authProvider.generateJWT({
  userId: '123',
  jti: crypto.randomUUID(),
  deviceId: 'device-xyz'
});
```

### Q: 如何禁用用户的所有 token？

使用 token 版本机制:

```typescript
// 生成时添加版本号
const token = authProvider.generateJWT({
  userId: '123',
  tokenVersion: 2
});

// 验证时检查
if (payload.tokenVersion < getUserTokenVersion(userId)) {
  return { valid: false, error: 'Token outdated' };
}
```

---

## 📚 详细文档

查看 [`auth-provider-pro-skill.examples.md`](./auth-provider-pro-skill.examples.md) 获取:

- 完整使用示例
- 代码片段
- 最佳实践
- API 详细文档

---

**版本:** 1.0.0  
**作者:** KAEL  
**创建时间:** 2026-03-13  
**许可证:** MIT
