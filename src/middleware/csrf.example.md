# CSRF 防护中间件使用指南

## 快速开始

### 1. 安装依赖

无需额外依赖，使用 Node.js 内置 `crypto` 模块。

### 2. 基础使用

```typescript
import { createCSRFMiddleware } from './middleware/csrf';

// 创建 CSRF 中间件实例
const csrf = createCSRFMiddleware('your-secret-key-at-least-16-chars', {
  tokenExpiration: 3600000, // 1 小时
  cookieName: 'csrf_token',
  doubleSubmitCookie: true,
});

// 在 Express 中使用
app.use(csrf.createExpressMiddleware());
```

## 配置选项

| 选项 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `tokenExpiration` | `number` | `3600000` | Token 有效期 (毫秒) |
| `tokenLength` | `number` | `32` | Token 长度 (字节) |
| `cookieName` | `string` | `'csrf_token'` | Cookie 名称 |
| `cookieOptions` | `CookieOptions` | - | Cookie 配置 |
| `headerName` | `string` | `'X-CSRF-Token'` | 请求头名称 |
| `doubleSubmitCookie` | `boolean` | `true` | 启用双重提交 Cookie 模式 |
| `excludePaths` | `string[]` | `[]` | 排除的路径 (不需要验证) |
| `validateNonSafeMethodsOnly` | `boolean` | `true` | 仅验证非安全方法 |

### CookieOptions

| 选项 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `path` | `string` | `'/'` | Cookie 路径 |
| `domain` | `string` | - | Cookie 域名 |
| `secure` | `boolean` | `true` | 仅 HTTPS |
| `httpOnly` | `boolean` | `true` | 仅 HTTP |
| `sameSite` | `'strict' \| 'lax' \| 'none'` | `'strict'` | SameSite 策略 |
| `maxAge` | `number` | `3600` | Cookie 最大年龄 (秒) |

## 工作原理

### 1. Token 生成

```
Token 格式：{randomToken}:{expiresTimestamp}:{signature}

例如：a1b2c3d4...:1710345600000:9f8e7d6c...
```

- 使用加密安全的随机数生成器
- 包含过期时间戳
- 使用 HMAC-SHA256 签名防止篡改

### 2. Token 验证流程

```
请求到达
    ↓
检查是否排除路径 → 是 → 跳过验证
    ↓ 否
检查是否为安全方法 (GET/HEAD/OPTIONS)
    ↓ 是
生成新 Token 并设置 Cookie
    ↓ 否 (POST/PUT/DELETE/PATCH)
从 Header 获取 Token
    ↓
从 Cookie 获取 Token (双重提交模式)
    ↓
验证 Token 签名和过期时间
    ↓
比较 Header 和 Cookie 中的 Token
    ↓
验证通过 → 继续处理
    ↓ 失败
返回 403 错误
```

### 3. 双重提交 Cookie 模式

```
1. 服务器生成 Token 并设置到 Cookie
2. 前端从 Cookie 读取 Token，添加到请求 Header
3. 服务器验证 Header 和 Cookie 中的 Token 是否一致
4. 一致则验证通过，否则拒绝请求
```

## 框架集成

### Express

```typescript
import express from 'express';
import cookieParser from 'cookie-parser';
import { createCSRFMiddleware } from './middleware/csrf';

const app = express();
const csrf = createCSRFMiddleware('your-secret-key-change-in-production');

app.use(cookieParser());
app.use(express.json());
app.use(csrf.createExpressMiddleware());

app.post('/api/submit', (req, res) => {
  // CSRF 验证通过才会到达这里
  res.json({ success: true });
});
```

### Koa

```typescript
import Koa from 'koa';
import { createCSRFMiddleware } from './middleware/csrf';

const app = new Koa();
const csrf = createCSRFMiddleware('your-secret-key');

app.use(async (ctx, next) => {
  const middlewareCtx = {
    method: ctx.method,
    path: ctx.path,
    getHeader: (name) => ctx.get(name),
    getCookie: (name) => ctx.cookies.get(name),
    setCookie: (name, value, options) => ctx.cookies.set(name, value, options),
  };

  try {
    csrf.middleware(middlewareCtx, () => {});
    if (middlewareCtx.csrfToken) {
      ctx.set('X-CSRF-Token', middlewareCtx.csrfToken.split(':')[0]);
    }
    await next();
  } catch (error: any) {
    if (error.name === 'CSRFError') {
      ctx.status = 403;
      ctx.body = { error: 'CSRF_VALIDATION_FAILED', message: error.message };
      return;
    }
    throw error;
  }
});
```

### Fastify

```typescript
import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import { createCSRFMiddleware } from './middleware/csrf';

const fastify = Fastify();
const csrf = createCSRFMiddleware('your-secret-key');

await fastify.register(cookie);

fastify.addHook('onRequest', async (request, reply) => {
  const middlewareCtx = {
    method: request.method,
    path: request.url,
    getHeader: (name) => request.headers[name.toLowerCase()],
    getCookie: (name) => request.cookies[name],
    setCookie: (name, value, options) => reply.setCookie(name, value, options),
  };

  try {
    csrf.middleware(middlewareCtx, () => {});
    if (middlewareCtx.csrfToken) {
      reply.header('X-CSRF-Token', middlewareCtx.csrfToken.split(':')[0]);
    }
  } catch (error: any) {
    if (error.name === 'CSRFError') {
      reply.code(403).send({
        error: 'CSRF_VALIDATION_FAILED',
        message: error.message,
      });
    }
    throw error;
  }
});
```

## 前端使用

### 获取 Token

```javascript
// 从 Cookie 获取 Token
function getCookie(name) {
  const match = document.cookie.match(new RegExp(name + '=([^;]+)'));
  return match ? match[1] : null;
}

// 发送带 CSRF Token 的请求
async function postWithCSRF(url, data) {
  const csrfToken = getCookie('csrf_token');
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken.split(':')[0],
    },
    body: JSON.stringify(data),
    credentials: 'include',
  });
  
  if (response.status === 403) {
    // Token 无效，刷新页面
    window.location.reload();
    return;
  }
  
  return response.json();
}
```

### React 示例

```tsx
import { useEffect, useState } from 'react';

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(name + '=([^;]+)'));
  return match ? match[1] : null;
}

function SubmitForm() {
  const [csrfToken, setCsrfToken] = useState<string>('');

  useEffect(() => {
    // 从 Cookie 获取 Token
    const token = getCookie('csrf_token');
    if (token) {
      setCsrfToken(token.split(':')[0]);
    }
  }, []);

  const handleSubmit = async (data: any) => {
    const response = await fetch('/api/submit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken,
      },
      body: JSON.stringify(data),
      credentials: 'include',
    });

    if (response.status === 403) {
      window.location.reload();
      return;
    }

    return response.json();
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* 表单内容 */}
      <button type="submit">提交</button>
    </form>
  );
}
```

## 安全最佳实践

### ✅ 推荐做法

1. **使用强密钥**: 至少 32 字符的随机字符串
2. **启用 HTTPS**: 生产环境必须设置 `secure: true`
3. **使用 SameSite**: 设置为 `'strict'` 或 `'lax'`
4. **定期轮换密钥**: 定期更换 secret key
5. **设置合理的过期时间**: 1-2 小时为宜

### ❌ 避免做法

1. **不要使用弱密钥**: 避免使用可预测的字符串
2. **不要禁用 HttpOnly**: Cookie 必须设置 `httpOnly: true`
3. **不要在生产环境禁用 secure**: 始终启用 HTTPS
4. **不要排除敏感路径**: 谨慎配置 `excludePaths`

## 错误处理

### 错误响应

```json
{
  "error": "CSRF_VALIDATION_FAILED",
  "message": "Invalid or missing CSRF token in header"
}
```

### 常见错误

| 错误信息 | 原因 | 解决方案 |
|---------|------|---------|
| `Invalid or missing CSRF token in header` | Header 中缺少或 Token 无效 | 检查前端是否正确设置 Header |
| `Missing CSRF token in cookie` | Cookie 中缺少 Token | 检查 Cookie 是否正确设置 |
| `CSRF token mismatch between header and cookie` | Header 和 Cookie Token 不一致 | 确保前端从 Cookie 读取并发送到 Header |

## 测试

```typescript
import { createCSRFMiddleware } from './middleware/csrf';

const csrf = createCSRFMiddleware('test-secret-key-1234567890123456');

// 生成 Token
const token = csrf.generateToken();
console.log('Token:', token.token);

// 验证 Token
console.log('Valid:', csrf.validateToken(token.token)); // true

// 验证过期 Token
console.log('Expired:', csrf.validateToken('abc:1000000000:fake')); // false
```

## API 参考

### createCSRFMiddleware

```typescript
function createCSRFMiddleware(
  secretKey: string,
  config?: CSRFConfig
): CSRFProtection
```

创建 CSRF 中间件实例。

### CSRFProtection 类

#### 方法

- `generateToken(): CSRFTokenInfo` - 生成新 Token
- `validateToken(token: string): boolean` - 验证 Token
- `middleware(ctx, next) => void` - 中间件主函数
- `createExpressMiddleware()` - 创建 Express 中间件

#### CSRFTokenInfo

```typescript
interface CSRFTokenInfo {
  token: string;      // Token 值
  expires: number;    // 过期时间戳
  signature: string;  // 签名
}
```

## 性能考虑

- Token 生成使用加密安全随机数，性能开销极小
- 验证使用 HMAC-SHA256，单次验证 < 1ms
- 无外部依赖，无网络请求
- 内存占用：每个 Token 约 100 字节

## 兼容性

- Node.js 14+
- 支持所有主流框架 (Express, Koa, Fastify, NestJS)
- 浏览器兼容：所有现代浏览器
