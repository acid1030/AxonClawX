# 🔐 ACE Auth Provider - 快速参考

## 文件结构

```
src/skills/
├── auth-provider-skill.ts          # 主实现文件
├── auth-provider-skill.examples.md # 详细使用文档
└── AUTH-README.md                  # 本文件 (快速参考)
```

## 5 分钟上手

### 1. 生成 JWT Token

```typescript
import { generateJWT, verifyJWT } from './auth-provider-skill';

const token = generateJWT(
  { userId: '123', email: 'user@example.com' },
  'your-secret-key',
  3600
);

const result = verifyJWT(token, 'your-secret-key');
if (result.valid) {
  console.log('用户 ID:', result.payload.userId);
}
```

### 2. OAuth2 登录

```typescript
import { generateOAuth2AuthorizeUrl, generateOAuth2State, exchangeOAuth2Code } from './auth-provider-skill';

// 生成授权 URL
const state = generateOAuth2State();
const authUrl = generateOAuth2AuthorizeUrl({
  clientId: 'your-client-id',
  authorizeUrl: 'https://github.com/login/oauth/authorize',
  redirectUri: 'https://yourapp.com/callback'
}, state);

// 重定向用户
res.redirect(authUrl);

// 处理回调
const token = await exchangeOAuth2Code(config, code, state, storedState);
```

### 3. 会话管理

```typescript
import { createSession, MemorySessionStore } from './auth-provider-skill';

const store = new MemorySessionStore();
const session = createSession('user-123', 3600);

await store.set(session.sessionId, session);
const retrieved = await store.get(session.sessionId);
```

## 运行示例

```bash
npx ts-node src/skills/auth-provider-skill.ts
```

## 详细文档

查看 [`auth-provider-skill.examples.md`](./auth-provider-skill.examples.md) 获取完整 API 文档和使用示例。

---

**完成时间:** 2026-03-13  
**版本:** 1.0.0  
**作者:** Axon
