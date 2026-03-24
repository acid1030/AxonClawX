# Session 会话管理中间件

提供内存/Redis 双模式会话管理，支持会话过期、用户状态跟踪。

## 🚀 快速开始

### 1. 安装依赖

```bash
# Redis 模式需要安装 ioredis
npm install ioredis
```

### 2. 基础使用

```typescript
import { createSessionMiddleware } from './middleware/session';

// 创建中间件实例
const session = createSessionMiddleware({
  store: 'memory', // 或 'redis'
  ttl: 24 * 60 * 60 * 1000, // 24 小时
  cookieName: 'sessionId',
  rolling: true,
});

// 初始化
await session.initialize();

// 在 Express 中使用
app.use(session.middleware());
```

## 📋 配置选项

```typescript
interface SessionConfig {
  /** 存储类型 */
  store: 'memory' | 'redis';
  
  /** Redis 配置 (仅 redis 模式) */
  redis?: {
    host: string;
    port: number;
    password?: string;
    db?: number;
    keyPrefix?: string;
  };
  
  /** 会话过期时间 (毫秒) */
  ttl: number;
  
  /** 空闲超时时间 (毫秒) */
  idleTimeout?: number;
  
  /** Cookie 名称 */
  cookieName?: string;
  
  /** Cookie 配置 */
  cookie?: {
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: 'strict' | 'lax' | 'none';
    path?: string;
    domain?: string;
  };
  
  /** 自动续期 */
  rolling?: boolean;
  
  /** 清理间隔 (毫秒) */
  cleanupInterval?: number;
}
```

## 🔧 API 参考

### 创建会话

```typescript
const sessionData = await session.createSession(
  'user-123',  // 用户 ID (可选)
  {            // 自定义数据 (可选)
    username: 'axon',
    role: 'admin',
  },
  req          // 请求对象 (可选，用于获取 IP/User-Agent)
);
```

### 获取会话

```typescript
const sessionData = await session.getSession(sessionId);
```

### 更新会话

```typescript
await session.updateSession(sessionId, {
  userStatus: 'busy',
  data: { lastLogin: new Date() },
});
```

### 续期会话

```typescript
await session.touchSession(sessionId);
```

### 销毁会话

```typescript
await session.destroySession(sessionId);
```

### 更新用户状态

```typescript
await session.updateUserStatus(sessionId, 'online');
// 状态选项：'online' | 'idle' | 'away' | 'busy' | 'offline'
```

### 获取在线用户数

```typescript
const count = await session.getOnlineUserCount();
```

## 💡 使用场景

### 1. Express 集成

```typescript
import express from 'express';
import { createSessionMiddleware } from './middleware/session';

const app = express();
const session = createSessionMiddleware({
  store: 'redis',
  redis: { host: 'localhost', port: 6379 },
  ttl: 7 * 24 * 60 * 60 * 1000,
});

await session.initialize();
app.use(session.middleware());

app.post('/login', async (req: any, res: any) => {
  const user = await validateUser(req.body);
  if (user) {
    await req.sessionStore.update(req.sessionId, {
      userId: user.id,
      role: user.role,
      userStatus: 'online',
    });
    res.json({ success: true });
  }
});

app.get('/profile', (req: any, res: any) => {
  res.json(req.session);
});

app.post('/logout', async (req: any, res: any) => {
  await req.sessionStore.destroy(req.sessionId);
  res.json({ success: true });
});
```

### 2. WebSocket 集成

```typescript
import WebSocket from 'ws';
import { createSessionMiddleware } from './middleware/session';

const wss = new WebSocket.Server({ port: 8080 });
const session = createSessionMiddleware({ store: 'memory', ttl: 3600000 });

await session.initialize();

wss.on('connection', async (ws, req) => {
  const sessionId = getSessionId(req);
  const sessionData = await session.getSession(sessionId);
  
  if (sessionData) {
    await session.updateUserStatus(sessionId, 'online');
    
    ws.on('close', async () => {
      await session.updateUserStatus(sessionId, 'offline');
    });
  }
});
```

### 3. 自定义中间件组合

```typescript
// 权限检查中间件
app.use(async (req: any, res: any, next: any) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: '需要登录' });
  }
  
  if (req.session.userStatus === 'busy') {
    return res.status(403).json({ error: '用户忙碌' });
  }
  
  next();
});
```

## 🔐 安全建议

1. **生产环境使用 Redis**: 内存模式在重启后会丢失所有会话
2. **启用 HTTPS**: 设置 `cookie.secure: true`
3. **使用 SameSite**: 防止 CSRF 攻击
4. **合理设置 TTL**: 根据安全要求调整过期时间
5. **定期清理**: 自动清理过期会话，释放资源

## 📊 性能优化

### Redis 模式最佳实践

```typescript
const session = createSessionMiddleware({
  store: 'redis',
  redis: {
    host: 'localhost',
    port: 6379,
    keyPrefix: 'app:session:', // 避免键名冲突
  },
  ttl: 24 * 60 * 60 * 1000,
  cleanupInterval: 5 * 60 * 1000, // 5 分钟清理一次
});
```

### 内存模式注意事项

- 适合开发环境或小型应用
- 重启后会话丢失
- 注意内存占用，合理设置 TTL

## 🧪 测试示例

```typescript
import { createSessionMiddleware } from './middleware/session';

describe('Session Middleware', () => {
  let session;

  beforeEach(async () => {
    session = createSessionMiddleware({
      store: 'memory',
      ttl: 1000, // 1 秒用于测试
    });
    await session.initialize();
  });

  afterEach(async () => {
    await session.close();
  });

  it('should create and retrieve session', async () => {
    const created = await session.createSession('user-1', { test: true });
    const retrieved = await session.getSession(created.sessionId);
    
    expect(retrieved.userId).toBe('user-1');
    expect(retrieved.data.test).toBe(true);
  });

  it('should expire session after TTL', async (done) => {
    const created = await session.createSession('user-2');
    
    setTimeout(async () => {
      const expired = await session.getSession(created.sessionId);
      expect(expired).toBeNull();
      done();
    }, 1100);
  });
});
```

## 📝 更多示例

查看 `session.example.ts` 获取完整使用示例。

## ⚠️ 注意事项

1. 使用前必须调用 `initialize()`
2. 应用关闭时调用 `close()` 清理资源
3. Redis 模式需要安装 `ioredis`
4. 内存模式会自动清理过期会话
5. Redis 模式依赖 Redis 的过期机制

---

**Author:** Axon  
**Version:** 1.0.0
