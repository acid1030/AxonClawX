# 🔐 身份认证提供工具 - ACE 使用指南

**版本:** 1.0.0  
**作者:** Axon  
**最后更新:** 2026-03-13

---

## 📋 功能概览

本工具提供完整的身份认证功能：

1. **JWT 生成/验证** - 安全的 Token 生成与验证
2. **OAuth2 流程** - 完整的 OAuth2 授权支持
3. **会话管理** - 灵活的会话存储与管理

---

## 🚀 快速开始

### 安装依赖

无需额外依赖，使用 Node.js 原生 `crypto` 模块。

### 导入工具

```typescript
import {
  // JWT
  generateJWT,
  verifyJWT,
  decodeJWT,
  refreshJWT,
  
  // OAuth2
  generateOAuth2AuthorizeUrl,
  generateOAuth2State,
  generateCodeVerifier,
  generateCodeChallenge,
  exchangeOAuth2Code,
  refreshOAuth2Token,
  
  // 会话管理
  createSession,
  isSessionValid,
  touchSession,
  MemorySessionStore,
  CookieUtils
} from './src/skills/auth-provider-skill';
```

---

## 1️⃣ JWT 使用示例

### 生成 Token

```typescript
const payload = {
  userId: 'user-123',
  email: 'user@example.com',
  roles: ['admin', 'user'],
  permissions: ['read', 'write']
};

const secret = 'your-super-secret-key';
const token = generateJWT(payload, secret, 3600); // 1 小时过期

console.log(token);
// eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c2VyLTEyMyIsImVtYWlsIjoidXNlckBleGFtcGxlLmNvbSIsInJvbGVzIjpbImFkbWluIiwidXNlciJdLCJpYXQiOjE2MTYxNjE2MTYsImV4cCI6MTYxNjE2NTIxNn0.xxx
```

### 验证 Token

```typescript
const result = verifyJWT(token, secret);

if (result.valid) {
  console.log('✅ Token 有效');
  console.log('用户 ID:', result.payload?.userId);
  console.log('角色:', result.payload?.roles);
} else {
  console.log('❌ Token 无效:', result.error);
  // 可能的错误:
  // - "Invalid token format" - Token 格式错误
  // - "Invalid signature" - 签名不匹配
  // - "Token expired" - Token 已过期
}
```

### 解码 Token (不验证)

```typescript
// 仅查看内容，不验证签名有效性
const decoded = decodeJWT(token);

console.log('Header:', decoded.header);
// { alg: 'HS256', typ: 'JWT' }

console.log('Payload:', decoded.payload);
// { userId: 'user-123', email: 'user@example.com', ... }
```

### 刷新 Token

```typescript
// 基于旧 token 生成新 token (延长有效期)
const newToken = refreshJWT(token, secret, 7200); // 2 小时

// 如果 token 已过期或无效，会抛出错误
try {
  const refreshed = refreshJWT(expiredToken, secret, 3600);
} catch (error) {
  console.error('无法刷新 Token:', error.message);
}
```

### 实际应用场景

#### Express 中间件

```typescript
import { Request, Response, NextFunction } from 'express';
import { verifyJWT } from './auth-provider-skill';

const JWT_SECRET = process.env.JWT_SECRET!;

export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing authorization header' });
  }

  const token = authHeader.substring(7); // 移除 "Bearer "
  const result = verifyJWT(token, JWT_SECRET);

  if (!result.valid) {
    return res.status(401).json({ error: result.error });
  }

  // 将用户信息附加到请求对象
  (req as any).user = result.payload;
  next();
}

// 使用
app.get('/api/protected', authMiddleware, (req, res) => {
  res.json({ 
    message: '访问成功',
    user: (req as any).user 
  });
});
```

#### 登录接口

```typescript
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;

  // 1. 验证用户凭证 (从数据库等)
  const user = await validateUserCredentials(email, password);
  
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  // 2. 生成 JWT
  const token = generateJWT(
    {
      userId: user.id,
      email: user.email,
      roles: user.roles
    },
    process.env.JWT_SECRET!,
    3600 // 1 小时
  );

  // 3. 返回 Token
  res.json({
    token,
    expiresIn: 3600,
    tokenType: 'Bearer'
  });
});
```

---

## 2️⃣ OAuth2 使用示例

### 完整流程

#### 步骤 1: 生成授权 URL

```typescript
const oauthConfig = {
  clientId: 'your-github-client-id',
  clientSecret: 'your-github-client-secret',
  authorizeUrl: 'https://github.com/login/oauth/authorize',
  tokenUrl: 'https://github.com/login/oauth/access_token',
  redirectUri: 'https://yourapp.com/auth/callback',
  scopes: ['user:email', 'read:user']
};

// 生成随机 state (用于 CSRF 防护)
const state = generateOAuth2State();

// 将 state 存储到 session (在回调时验证)
session.oauthState = state;

// 生成授权 URL
const authUrl = generateOAuth2AuthorizeUrl(oauthConfig, state);

// 重定向用户到授权页面
res.redirect(authUrl);
```

#### 步骤 2: 处理回调

```typescript
app.get('/auth/callback', async (req, res) => {
  const { code, state } = req.query;
  const storedState = req.session.oauthState;

  // 验证 state
  if (state !== storedState) {
    return res.status(400).json({ error: 'Invalid state parameter' });
  }

  try {
    // 用授权码换取 Token
    const tokenResponse = await exchangeOAuth2Code(
      oauthConfig,
      code as string,
      state as string,
      storedState as string
    );

    console.log('Access Token:', tokenResponse.accessToken);
    console.log('Refresh Token:', tokenResponse.refreshToken);
    console.log('Expires In:', tokenResponse.expiresIn);

    // 存储 Token 到 session 或数据库
    req.session.accessToken = tokenResponse.accessToken;
    req.session.refreshToken = tokenResponse.refreshToken;

    // 获取用户信息 (使用 access token)
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${tokenResponse.accessToken}`
      }
    });
    const userInfo = await userResponse.json();

    // 创建本地会话或登录
    res.json({ success: true, user: userInfo });

  } catch (error) {
    console.error('OAuth2 错误:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
});
```

### PKCE 模式 (推荐用于移动端/SPA)

```typescript
// 步骤 1: 生成 PKCE 参数
const codeVerifier = generateCodeVerifier();
const codeChallenge = generateCodeChallenge(codeVerifier);

// 存储 code verifier (在回调时使用)
session.codeVerifier = codeVerifier;

// 步骤 2: 生成带 PKCE 的授权 URL
const authUrl = generateOAuth2AuthorizeUrl(
  {
    ...oauthConfig,
    // 手动添加 PKCE 参数
  },
  state
) + `&code_challenge=${codeChallenge}&code_challenge_method=S256`;

res.redirect(authUrl);

// 步骤 3: 回调时交换 Token (需要支持 PKCE 的 OAuth2 提供商)
// 注意：exchangeOAuth2Code 需要扩展以支持 PKCE
```

### 刷新 Token

```typescript
async function refreshAccessToken(refreshToken: string) {
  try {
    const newToken = await refreshOAuth2Token(oauthConfig, refreshToken);
    
    // 更新存储的 Token
    session.accessToken = newToken.accessToken;
    if (newToken.refreshToken) {
      session.refreshToken = newToken.refreshToken;
    }

    return newToken;
  } catch (error) {
    console.error('Token 刷新失败:', error);
    // 需要重新登录
    throw error;
  }
}
```

### 撤销 Token

```typescript
// 用户登出时撤销 Token
async function logout(accessToken: string, refreshToken: string) {
  const revokeUrl = 'https://github.com/login/oauth/revoke_token';
  
  try {
    await revokeOAuth2Token(
      revokeUrl,
      refreshToken,
      'refresh_token',
      oauthConfig.clientId,
      oauthConfig.clientSecret
    );
    console.log('Token 已撤销');
  } catch (error) {
    console.error('撤销失败:', error);
  }
}
```

### 常见 OAuth2 提供商配置

#### GitHub

```typescript
const githubConfig: OAuth2Config = {
  clientId: process.env.GITHUB_CLIENT_ID!,
  clientSecret: process.env.GITHUB_CLIENT_SECRET!,
  authorizeUrl: 'https://github.com/login/oauth/authorize',
  tokenUrl: 'https://github.com/login/oauth/access_token',
  redirectUri: 'https://yourapp.com/auth/github/callback',
  scopes: ['user:email', 'read:user']
};
```

#### Google

```typescript
const googleConfig: OAuth2Config = {
  clientId: process.env.GOOGLE_CLIENT_ID!,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
  authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenUrl: 'https://oauth2.googleapis.com/token',
  redirectUri: 'https://yourapp.com/auth/google/callback',
  scopes: ['openid', 'email', 'profile']
};
```

#### Microsoft

```typescript
const microsoftConfig: OAuth2Config = {
  clientId: process.env.AZURE_CLIENT_ID!,
  clientSecret: process.env.AZURE_CLIENT_SECRET!,
  authorizeUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
  tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
  redirectUri: 'https://yourapp.com/auth/microsoft/callback',
  scopes: ['openid', 'email', 'profile', 'User.Read']
};
```

---

## 3️⃣ 会话管理示例

### 基础使用

```typescript
import { 
  createSession, 
  isSessionValid, 
  touchSession,
  MemorySessionStore 
} from './auth-provider-skill';

// 创建会话存储
const sessionStore = new MemorySessionStore();

// 创建新会话
const session = createSession(
  'user-123',           // 用户 ID
  3600,                 // 1 小时过期
  {                     // 附加数据
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0...'
  }
);

// 存储会话
await sessionStore.set(session.sessionId, session);

// 获取会话
const retrieved = await sessionStore.get(session.sessionId);
if (retrieved && isSessionValid(retrieved)) {
  console.log('会话有效，用户 ID:', retrieved.userId);
}

// 更新会话活跃时间 (延长有效期)
const updated = touchSession(retrieved!, 7200); // 2 小时
await sessionStore.set(updated.sessionId, updated);

// 删除会话 (登出)
await sessionStore.delete(session.sessionId);
```

### Express 会话中间件

```typescript
import { Request, Response, NextFunction } from 'express';
import { 
  createSession, 
  isSessionValid,
  MemorySessionStore,
  CookieUtils 
} from './auth-provider-skill';

const sessionStore = new MemorySessionStore();
const SESSION_COOKIE_NAME = 'session_id';
const SESSION_TTL = 86400; // 24 小时

export function sessionMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  // 从 Cookie 获取 session ID
  const cookies = CookieUtils.parse(req.headers.cookie || '');
  const sessionId = cookies[SESSION_COOKIE_NAME];

  if (sessionId) {
    // 获取并验证会话
    sessionStore.get(sessionId).then(session => {
      if (session && isSessionValid(session)) {
        // 附加会话到请求
        (req as any).session = session;
        (req as any).userId = session.userId;
        
        // 更新活跃时间
        const updated = touchSession(session, SESSION_TTL);
        sessionStore.set(sessionId, updated);
      }
      next();
    });
  } else {
    next();
  }
}

// 登录时创建会话
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  
  // 验证用户
  const user = await validateUser(email, password);
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  // 创建会话
  const session = createSession(user.id, SESSION_TTL, {
    email: user.email,
    roles: user.roles
  });

  // 存储会话
  await sessionStore.set(session.sessionId, session);

  // 设置 Cookie
  const cookie = CookieUtils.serialize(
    SESSION_COOKIE_NAME,
    session.sessionId,
    {
      maxAge: SESSION_TTL,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/'
    }
  );

  res.setHeader('Set-Cookie', cookie);
  res.json({ success: true, user: { id: user.id, email: user.email } });
});

// 登出
app.post('/logout', async (req, res) => {
  const cookies = CookieUtils.parse(req.headers.cookie || '');
  const sessionId = cookies[SESSION_COOKIE_NAME];

  if (sessionId) {
    await sessionStore.delete(sessionId);
  }

  // 清除 Cookie
  const cookie = CookieUtils.serialize(
    SESSION_COOKIE_NAME,
    '',
    { maxAge: 0, path: '/' }
  );

  res.setHeader('Set-Cookie', cookie);
  res.json({ success: true });
});
```

### 生产环境：Redis 会话存储

```typescript
import { createClient } from 'redis';
import { SessionStore, SessionData, isSessionValid } from './auth-provider-skill';

export class RedisSessionStore implements SessionStore {
  private client: ReturnType<typeof createClient>;

  constructor(redisUrl: string) {
    this.client = createClient({ url: redisUrl });
    this.client.connect();
  }

  async get(sessionId: string): Promise<SessionData | null> {
    const data = await this.client.get(`session:${sessionId}`);
    if (!data) return null;

    const session = JSON.parse(data) as SessionData;
    
    if (!isSessionValid(session)) {
      await this.delete(sessionId);
      return null;
    }

    return session;
  }

  async set(sessionId: string, data: SessionData): Promise<void> {
    const ttl = Math.floor((data.expiresAt - Date.now()) / 1000);
    await this.client.setEx(
      `session:${sessionId}`,
      ttl,
      JSON.stringify(data)
    );
  }

  async delete(sessionId: string): Promise<void> {
    await this.client.del(`session:${sessionId}`);
  }

  async clean(): Promise<void> {
    // Redis 会自动处理过期，无需手动清理
  }

  async destroy(): Promise<void> {
    await this.client.quit();
  }
}

// 使用
const sessionStore = new RedisSessionStore('redis://localhost:6379');
```

---

## 🔒 安全最佳实践

### 1. JWT 安全

```typescript
// ✅ 好的做法
const secret = process.env.JWT_SECRET; // 从环境变量读取
const token = generateJWT(payload, secret, 3600); // 短过期时间

// ❌ 坏的做法
const secret = 'my-secret'; // 硬编码
const token = generateJWT(payload, secret, 86400 * 365); // 1 年过期
```

### 2. OAuth2 安全

```typescript
// ✅ 必须验证 state
const storedState = session.oauthState;
if (state !== storedState) {
  throw new Error('CSRF attack detected');
}

// ✅ 使用 HTTPS
const config = {
  redirectUri: 'https://yourapp.com/callback', // 必须 HTTPS
  // ...
};

// ✅ 最小权限原则
const config = {
  scopes: ['user:email'], // 只请求必要的权限
  // ...
};
```

### 3. 会话安全

```typescript
// ✅ 安全的 Cookie 配置
const cookie = CookieUtils.serialize('session_id', sessionId, {
  maxAge: 86400,
  httpOnly: true,      // 防止 XSS 读取
  secure: true,        // 仅 HTTPS
  sameSite: 'strict',  // 防止 CSRF
  path: '/'
});

// ✅ 定期清理过期会话
const store = new MemorySessionStore(3600000); // 每小时清理
```

---

## 🧪 测试示例

```typescript
import { 
  generateJWT, 
  verifyJWT, 
  createSession,
  MemorySessionStore 
} from './auth-provider-skill';

describe('Auth Provider', () => {
  const SECRET = 'test-secret';

  test('生成和验证 JWT', () => {
    const payload = { userId: '123', email: 'test@example.com' };
    const token = generateJWT(payload, SECRET, 3600);
    const result = verifyJWT(token, SECRET);

    expect(result.valid).toBe(true);
    expect(result.payload?.userId).toBe('123');
  });

  test('检测过期 Token', async () => {
    const token = generateJWT({ userId: '123' }, SECRET, 1); // 1 秒过期
    await new Promise(r => setTimeout(r, 1100)); // 等待 1.1 秒
    
    const result = verifyJWT(token, SECRET);
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Token expired');
  });

  test('会话管理', async () => {
    const store = new MemorySessionStore();
    const session = createSession('user-123', 3600);

    await store.set(session.sessionId, session);
    const retrieved = await store.get(session.sessionId);

    expect(retrieved).not.toBeNull();
    expect(retrieved?.userId).toBe('user-123');

    await store.destroy();
  });
});
```

---

## 📊 API 参考

### JWT 函数

| 函数 | 描述 | 参数 | 返回值 |
|------|------|------|--------|
| `generateJWT` | 生成 JWT Token | payload, secret, expiresIn | string |
| `verifyJWT` | 验证 JWT Token | token, secret | { valid, payload?, error? } |
| `decodeJWT` | 解码 JWT (不验证) | token | { header, payload, signature } |
| `refreshJWT` | 刷新 JWT Token | token, secret, newExpiresIn | string |

### OAuth2 函数

| 函数 | 描述 | 参数 | 返回值 |
|------|------|------|--------|
| `generateOAuth2AuthorizeUrl` | 生成授权 URL | config, state, scopes | string |
| `generateOAuth2State` | 生成随机 state | - | string |
| `generateCodeVerifier` | 生成 PKCE verifier | - | string |
| `generateCodeChallenge` | 生成 PKCE challenge | verifier | string |
| `exchangeOAuth2Code` | 交换授权码 | config, code, state, storedState | Promise<OAuth2TokenResponse> |
| `refreshOAuth2Token` | 刷新 Token | config, refreshToken | Promise<OAuth2TokenResponse> |
| `revokeOAuth2Token` | 撤销 Token | revokeUrl, token, tokenType, clientId, clientSecret | Promise<void> |

### 会话管理函数

| 函数 | 描述 | 参数 | 返回值 |
|------|------|------|--------|
| `generateSessionId` | 生成会话 ID | - | string |
| `createSession` | 创建会话 | userId, ttl, data | SessionData |
| `isSessionValid` | 验证会话 | session | boolean |
| `touchSession` | 更新会话 | session, ttl | SessionData |

### 类

| 类 | 描述 | 方法 |
|----|------|------|
| `MemorySessionStore` | 内存会话存储 | get, set, delete, clean, destroy, size |
| `CookieUtils` | Cookie 工具 | serialize, parse |

---

## 🎯 运行示例

```bash
# 运行内置示例
cd /Users/nike/.openclaw/workspace
npx ts-node src/skills/auth-provider-skill.ts

# 或编译后运行
npx tsc src/skills/auth-provider-skill.ts --outDir dist
node dist/skills/auth-provider-skill.js
```

输出:
```
=== 身份认证提供工具 - ACE - 使用示例 ===

1️⃣ JWT 生成与验证:
   生成的 Token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQ...
   验证结果: ✅ 有效
   用户 ID: user-123
   邮箱：user@example.com
   角色：admin, user
   刷新后的 Token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQ...

2️⃣ OAuth2 流程:
   生成的 State: a1b2c3d4e5f6...
   授权 URL: https://github.com/login/oauth/authorize?client_id=...
   Code Verifier: xyz123...
   Code Challenge: abc456...

3️⃣ 会话管理:
   会话 ID: 1a2b3c4d5e6f...
   用户 ID: user-123
   创建时间: 2026-03-13T12:00:00.000Z
   过期时间: 2026-03-13T13:00:00.000Z
   会话有效：✅
   会话已存储，当前会话数：1
   会话已更新，新过期时间：2026-03-13T14:00:00.000Z

4️⃣ Cookie 工具:
   Set-Cookie: session_id=1a2b3c4d5e6f...; Max-Age=86400; HttpOnly; Secure; SameSite=strict; Path=/
   解析结果：{"session_id":"abc123","user_id":"user-123"}

✅ 所有示例执行完成!
```

---

## 📝 注意事项

1. **生产环境** 必须使用环境变量存储密钥
2. **HTTPS** OAuth2 回调 URL 必须使用 HTTPS
3. **密钥轮换** 定期更换 JWT 密钥和 OAuth2 客户端密钥
4. **日志记录** 记录认证失败尝试，但不要记录敏感信息
5. **速率限制** 对登录和 Token 刷新接口实施速率限制

---

## 🆘 常见问题

### Q: Token 被篡改了怎么办？
A: `verifyJWT` 会检测签名不匹配，返回 `valid: false, error: "Invalid signature"`

### Q: 如何实现 Token 黑名单？
A: 使用 Redis 存储已撤销的 Token ID，验证时检查是否在黑名单中

### Q: OAuth2 state 必须存储吗？
A: 是的，必须存储并验证，否则会有 CSRF 攻击风险

### Q: 会话存储选内存还是 Redis？
A: 开发用内存，生产环境用 Redis 或其他持久化存储

---

**文档结束**
