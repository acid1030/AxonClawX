# Session Manager Skill - ACE 会话管理器

> 轻量级会话管理工具，支持会话创建、验证和过期管理

**作者:** ACE  
**版本:** 1.0.0  
**创建时间:** 2026-03-13

---

## 📋 功能特性

- ✅ **会话创建** - 生成唯一会话 ID，支持自定义 TTL 和数据存储
- ✅ **会话验证** - 快速验证会话有效性，返回详细原因
- ✅ **会话过期** - 自动过期管理，支持手动刷新和清理
- ✅ **内存存储** - 基于 Map 的高效内存存储
- ✅ **自动清理** - 可配置的自动清理定时器
- ✅ **TypeScript** - 完整的类型定义

---

## 🚀 快速开始

### 基础使用

```typescript
import { createSessionManager } from './session-manager-skill';

// 创建管理器
const manager = createSessionManager({
  defaultTTL: 30 * 60 * 1000,  // 30 分钟
  autoCleanup: true,
  cleanupInterval: 5 * 60 * 1000,
});

// 创建会话
const session = manager.create('user_123', {
  data: { username: '张三', role: 'admin' },
});

// 验证会话
const result = manager.validate(session.id);
if (result.isValid) {
  console.log('会话有效:', result.session);
}

// 销毁会话
manager.destroy(session.id);
```

### 快速函数

```typescript
import { quickCreateSession, quickValidateSession } from './session-manager-skill';

// 快速创建和验证
const session = quickCreateSession('user_456');
const valid = quickValidateSession(session.id);
```

---

## 📖 API 文档

### 类型定义

#### SessionConfig

```typescript
interface SessionConfig {
  /** 默认会话过期时间 (毫秒) */
  defaultTTL: number;
  /** 是否自动清理过期会话 */
  autoCleanup?: boolean;
  /** 清理间隔 (毫秒) */
  cleanupInterval?: number;
}
```

#### Session

```typescript
interface Session {
  id: string;
  userId: string;
  createdAt: number;
  expiresAt: number;
  lastAccessedAt: number;
  data: Record<string, any>;
  isValid: boolean;
}
```

#### SessionValidationResult

```typescript
interface SessionValidationResult {
  isValid: boolean;
  reason?: 'expired' | 'not_found' | 'invalid' | null;
  session?: Session | null;
}
```

### 核心方法

#### createSessionManager(config)

创建会话管理器实例。

```typescript
const manager = createSessionManager({
  defaultTTL: 30 * 60 * 1000,
});
```

#### manager.create(userId, options?)

创建新会话。

**参数:**
- `userId` - 用户 ID
- `options` - 可选配置
  - `ttl` - 自定义 TTL (毫秒)
  - `data` - 会话数据

**返回:** Session 对象

```typescript
const session = manager.create('user_123', {
  ttl: 7 * 24 * 60 * 60 * 1000,  // 7 天
  data: { role: 'admin' },
});
```

#### manager.validate(sessionId)

验证会话有效性。

**返回:** SessionValidationResult

```typescript
const result = manager.validate(sessionId);
if (!result.isValid) {
  console.log('无效原因:', result.reason);
  // 'expired' | 'not_found' | 'invalid'
}
```

#### manager.get(sessionId)

获取会话 (自动验证)。

**返回:** Session | null

```typescript
const session = manager.get(sessionId);
if (session) {
  console.log('用户:', session.userId);
}
```

#### manager.refresh(sessionId, ttl?)

刷新会话过期时间。

```typescript
const refreshed = manager.refresh(sessionId, 60 * 60 * 1000);
```

#### manager.destroy(sessionId)

销毁会话。

**返回:** boolean

```typescript
const success = manager.destroy(sessionId);
```

#### manager.listByUser(userId)

获取用户的所有活跃会话。

**返回:** Session[]

```typescript
const sessions = manager.listByUser('user_123');
console.log(`共有 ${sessions.length} 个活跃会话`);
```

#### manager.cleanup()

手动清理过期会话。

**返回:** 清理的会话数量

```typescript
const count = manager.cleanup();
console.log(`清理了 ${count} 个会话`);
```

#### manager.dispose()

销毁管理器，停止清理定时器。

```typescript
manager.dispose();
```

---

## 💡 使用场景

### 1. 用户登录会话

```typescript
const manager = createSessionManager({
  defaultTTL: 24 * 60 * 60 * 1000,  // 24 小时
});

// 登录时创建会话
const session = manager.create(userId, {
  data: {
    username,
    email,
    roles: ['user'],
    permissions: ['read'],
  },
});

// 将 session.id 存储到 cookie 或返回给客户端
```

### 2. API 请求验证中间件

```typescript
function authMiddleware(req, res, next) {
  const sessionId = req.headers['x-session-id'];
  const result = manager.validate(sessionId);
  
  if (!result.isValid) {
    return res.status(401).json({
      error: 'Unauthorized',
      reason: result.reason,
    });
  }
  
  req.user = result.session.data;
  next();
}
```

### 3. 记住我功能

```typescript
// 普通登录 (24 小时)
const session = manager.create(userId, {
  ttl: 24 * 60 * 60 * 1000,
});

// 记住我 (7 天)
const longSession = manager.create(userId, {
  ttl: 7 * 24 * 60 * 60 * 1000,
});
```

### 4. 多设备会话管理

```typescript
// 查看用户的所有活跃设备
const sessions = manager.listByUser(userId);
console.log('活跃设备:');
sessions.forEach(s => {
  console.log(`- ${s.data.device} (最后访问：${new Date(s.lastAccessedAt).toLocaleString()})`);
});

// 强制下线所有设备
sessions.forEach(s => manager.destroy(s.id));
```

---

## ⚙️ 配置选项

### 默认配置

```typescript
{
  defaultTTL: 30 * 60 * 1000,      // 30 分钟
  autoCleanup: true,               // 启用自动清理
  cleanupInterval: 5 * 60 * 1000,  // 5 分钟清理一次
}
```

### 自定义配置

```typescript
// 短会话 (5 分钟)
const shortManager = createSessionManager({
  defaultTTL: 5 * 60 * 1000,
  cleanupInterval: 1 * 60 * 1000,
});

// 长会话 (7 天)
const longManager = createSessionManager({
  defaultTTL: 7 * 24 * 60 * 60 * 1000,
  cleanupInterval: 60 * 60 * 1000,
});

// 禁用自动清理 (手动控制)
const manualManager = createSessionManager({
  defaultTTL: 30 * 60 * 1000,
  autoCleanup: false,
});
```

---

## 🧪 测试

运行示例文件:

```bash
cd /Users/nike/.openclaw/workspace/src/skills
npx ts-node session-manager-skill.examples.ts
```

---

## 📝 注意事项

1. **内存存储** - 会话数据存储在内存中，重启后丢失
2. **单进程** - 不支持多进程/集群共享会话
3. **安全性** - 敏感数据请加密后存储
4. **清理定时器** - 使用 `unref()` 允许进程退出
5. **类型安全** - 完整的 TypeScript 类型定义

---

## 🔗 相关文件

- `session-manager-skill.ts` - 核心实现
- `session-manager-skill.examples.ts` - 使用示例
- `session-manager-skill.readme.md` - 本文档

---

## 📄 许可证

MIT License

---

**最后更新:** 2026-03-13  
**维护者:** ACE
