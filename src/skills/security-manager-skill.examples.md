# Security Manager Skill - 使用示例

**文件位置:** `src/skills/security-manager-skill.ts`  
**功能:** CSP 策略管理、CORS 配置、速率限制

---

## 📋 目录

1. [CSP 策略管理](#1-csp-策略管理)
2. [CORS 配置](#2-cors-配置)
3. [速率限制](#3-速率限制)
4. [安全工具函数](#4-安全工具函数)
5. [Express 中间件集成](#5-express-中间件集成)

---

## 1. CSP 策略管理

### 1.1 使用预设模板

```typescript
import { SecurityManager } from './skills/security-manager-skill';

// 严格模式 (生产环境推荐)
const strictPolicy = SecurityManager.createCspPolicy('strict');
console.log(SecurityManager.generateCspHeader(strictPolicy));
// 输出：default-src 'self'; script-src 'self'; style-src 'self'; ...

// 开发模式 (宽松模式)
const devPolicy = SecurityManager.createCspPolicy('development');

// API 专用模式
const apiPolicy = SecurityManager.createCspPolicy('api');
```

### 1.2 自定义 CSP 策略

```typescript
// 创建自定义策略
const customPolicy = SecurityManager.createCspPolicy('custom', {
  'default-src': ["'self'"],
  'script-src': ["'self'", 'https://cdn.example.com'],
  'style-src': ["'self'", "'unsafe-inline'"],
  'img-src': ["'self'", 'data:', 'https://images.example.com'],
  'connect-src': ["'self'", 'https://api.example.com'],
  'frame-ancestors': ["'none'"],
});

// 添加额外的源
const updatedPolicy = SecurityManager.addCspSources(
  customPolicy,
  'script-src',
  ['https://analytics.example.com']
);

// 移除源
const cleanedPolicy = SecurityManager.removeCspSources(
  updatedPolicy,
  'img-src',
  ['data:']
);

// 生成 HTTP 头
const headerName = SecurityManager.getCspHeaderName(customPolicy);
const headerValue = SecurityManager.generateCspHeader(customPolicy);

console.log(`${headerName}: ${headerValue}`);
```

### 1.3 报告模式 (仅监控，不阻止)

```typescript
const reportOnlyPolicy = SecurityManager.createCspPolicy('strict');
reportOnlyPolicy.reportOnly = true;
reportOnlyPolicy.reportUri = '/api/csp-report';

console.log(SecurityManager.getCspHeaderName(reportOnlyPolicy));
// 输出：Content-Security-Policy-Report-Only
```

### 1.4 验证策略

```typescript
const policy = SecurityManager.createCspPolicy('strict');
const validation = SecurityManager.validateCspPolicy(policy);

if (!validation.valid) {
  console.error('CSP 策略错误:', validation.errors);
}
```

### 1.5 使用 Nonce (高级用法)

```typescript
// 为每个请求生成随机 nonce
const nonce = SecurityManager.generateCspNonce(16);

const policyWithNonce = SecurityManager.createCspPolicy('custom', {
  'default-src': ["'self'"],
  'script-src': ["'self'", `'nonce-${nonce}'`],
});

// 在 HTML 中使用
// <script nonce="${nonce}">console.log('安全脚本');</script>
```

---

## 2. CORS 配置

### 2.1 使用预设模板

```typescript
import { SecurityManager } from './skills/security-manager-skill';

// 严格模式 (指定允许的源)
const strictCors = SecurityManager.createCorsConfig('strict', {
  origin: ['https://example.com', 'https://app.example.com']
});

// 开发模式 (允许所有源)
const devCors = SecurityManager.createCorsConfig('development');

// API 网关模式
const gatewayCors = SecurityManager.createCorsConfig('gateway');
```

### 2.2 自定义 CORS 配置

```typescript
const customCors = SecurityManager.createCorsConfig('custom', {
  origin: ['https://example.com', 'https://api.example.com'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
  exposedHeaders: ['X-Request-Id', 'X-RateLimit-Remaining'],
  credentials: true,
  maxAge: 7200, // 2 小时
});

// 添加新的允许源
const updatedCors = SecurityManager.addCorsOrigins(customCors, [
  'https://new-domain.com'
]);

// 移除源
const cleanedCors = SecurityManager.removeCorsOrigins(updatedCors, [
  'https://old-domain.com'
]);
```

### 2.3 动态源验证

```typescript
// 使用函数动态判断源是否允许
const dynamicCors = SecurityManager.createCorsConfig('custom', {
  origin: (origin: string) => {
    // 自定义验证逻辑
    return origin?.endsWith('.example.com') || false;
  },
  methods: ['GET', 'POST'],
});

// 验证特定源
const isAllowed = SecurityManager.isCorsOriginAllowed(
  dynamicCors,
  'https://api.example.com'
);
console.log(isAllowed); // true
```

### 2.4 生成 CORS 头

```typescript
const corsConfig = SecurityManager.createCorsConfig('strict', {
  origin: ['https://example.com']
});

const headers = SecurityManager.generateCorsHeaders(
  corsConfig,
  'https://example.com' // 请求来源
);

console.log(headers);
// {
//   'Access-Control-Allow-Origin': 'https://example.com',
//   'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH',
//   'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
//   'Access-Control-Expose-Headers': 'X-Request-Id',
//   'Access-Control-Max-Age': '86400'
// }
```

### 2.5 验证配置

```typescript
const corsConfig = SecurityManager.createCorsConfig('custom', {
  origin: '*',
  credentials: true, // ⚠️ 这会触发错误
});

const validation = SecurityManager.validateCorsConfig(corsConfig);
if (!validation.valid) {
  console.error('CORS 配置错误:', validation.errors);
  // 输出：Credentials cannot be used with wildcard origin
}
```

---

## 3. 速率限制

### 3.1 使用预设模板

```typescript
import { SecurityManager } from './skills/security-manager-skill';

// 严格模式 (登录/注册接口)
const loginLimiter = SecurityManager.createRateLimiter(
  SecurityManager.RATE_LIMIT_TEMPLATES.strict
);

// 标准模式 (一般 API)
const apiLimiter = SecurityManager.createRateLimiter(
  SecurityManager.RATE_LIMIT_TEMPLATES.standard
);

// 防暴力破解模式
const bruteForceLimiter = SecurityManager.createRateLimiter(
  SecurityManager.RATE_LIMIT_TEMPLATES.bruteForceProtection
);
```

### 3.2 自定义速率限制

```typescript
const customLimiter = SecurityManager.createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 分钟
  maxRequests: 100, // 最多 100 次请求
  keyGenerator: (req) => req.ip, // 按 IP 限制
  onLimitReached: (key, count) => {
    console.warn(`速率限制触发: ${key}, 请求数: ${count}`);
  },
  skip: (req) => req.path === '/health', // 跳过健康检查
});

// 检查请求
const result = customLimiter.check('192.168.1.100');
console.log(result);
// { allowed: true, remaining: 99, resetTime: 1710345600000 }

if (!result.allowed) {
  console.log('请求被限制，请稍后重试');
}
```

### 3.3 分层速率限制 (多重保护)

```typescript
// 同时应用多层限制
const layeredLimiter = SecurityManager.createLayeredRateLimiter([
  {
    // 全局限制：每小时 1000 次
    windowMs: 60 * 60 * 1000,
    maxRequests: 1000,
  },
  {
    // 每分钟限制：每分钟 100 次
    windowMs: 60 * 1000,
    maxRequests: 100,
  },
  {
    // 每秒限制：每秒 10 次
    windowMs: 1000,
    maxRequests: 10,
  },
]);

const result = layeredLimiter.check('user-123');
console.log(result);
```

### 3.4 生成速率限制头

```typescript
const limiter = SecurityManager.createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 100,
});

const result = limiter.check('192.168.1.100');
const headers = SecurityManager.generateRateLimitHeaders(result);

console.log(headers);
// {
//   'X-RateLimit-Limit': '100',
//   'X-RateLimit-Remaining': '99',
//   'X-RateLimit-Reset': '1710345600'
// }
```

### 3.5 管理限制器

```typescript
const limiter = SecurityManager.createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 10,
});

// 获取统计信息
const stats = limiter.getStats();
console.log(stats); // { totalKeys: 5, blockedKeys: 2 }

// 重置特定 key
limiter.resetKey('192.168.1.100');

// 重置所有限制
limiter.reset();
```

### 3.6 验证配置

```typescript
const config = {
  windowMs: -1000, // ⚠️ 错误：负数
  maxRequests: 100,
};

const validation = SecurityManager.validateRateLimitConfig(config);
if (!validation.valid) {
  console.error('配置错误:', validation.errors);
  // 输出：windowMs must be positive
}
```

---

## 4. 安全工具函数

### 4.1 生成随机值

```typescript
// 生成 CSP nonce
const nonce = SecurityManager.generateCspNonce(16);
console.log(nonce); // 例如：rAnd0mN0nc3V4lu3==

// 生成 OAuth state
const state = SecurityManager.generateOAuthState(32);
console.log(state); // 例如：a1b2c3d4e5f6...
```

### 4.2 源验证

```typescript
// 验证请求来源
const trusted = SecurityManager.isOriginTrusted(
  'https://example.com',
  ['https://example.com', 'https://api.example.com']
);
console.log(trusted); // true

// 支持通配符
const wildcardTrusted = SecurityManager.isOriginTrusted(
  'https://sub.example.com',
  ['https://*.example.com']
);
console.log(wildcardTrusted); // true
```

### 4.3 输入清理 (防 XSS)

```typescript
const userInput = '<script>alert("XSS")</script>';
const sanitized = SecurityManager.sanitizeInput(userInput);
console.log(sanitized);
// 输出：&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;
```

### 4.4 Content-Type 验证

```typescript
const allowed = SecurityManager.isContentTypeAllowed(
  'application/json; charset=utf-8',
  ['application/json', 'text/plain']
);
console.log(allowed); // true

// 支持通配符
const wildcardAllowed = SecurityManager.isContentTypeAllowed(
  'image/png',
  ['image/*']
);
console.log(wildcardAllowed); // true
```

---

## 5. Express 中间件集成

### 5.1 CSP 中间件

```typescript
import express from 'express';
import { SecurityManager } from './skills/security-manager-skill';

const app = express();

// CSP 中间件
function cspMiddleware(policy: ReturnType<typeof SecurityManager.createCspPolicy>) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const headerName = SecurityManager.getCspHeaderName(policy);
    const headerValue = SecurityManager.generateCspHeader(policy);
    res.setHeader(headerName, headerValue);
    next();
  };
}

// 使用严格 CSP
const strictPolicy = SecurityManager.createCspPolicy('strict');
app.use(cspMiddleware(strictPolicy));
```

### 5.2 CORS 中间件

```typescript
// CORS 中间件
function corsMiddleware(config: ReturnType<typeof SecurityManager.createCorsConfig>) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const origin = req.headers.origin;
    const headers = SecurityManager.generateCorsHeaders(config, origin);
    
    // 设置所有 CORS 头
    Object.entries(headers).forEach(([key, value]) => {
      res.setHeader(key, value);
    });
    
    // 处理预检请求
    if (req.method === 'OPTIONS') {
      return res.sendStatus(204);
    }
    
    next();
  };
}

// 使用 CORS
const corsConfig = SecurityManager.createCorsConfig('strict', {
  origin: ['https://example.com'],
});
app.use(corsMiddleware(corsConfig));
```

### 5.3 速率限制中间件

```typescript
// 速率限制中间件
function rateLimitMiddleware(limiter: ReturnType<typeof SecurityManager.createRateLimiter>) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    // 跳过特定请求
    if (req.path === '/health') {
      return next();
    }
    
    const clientKey = req.ip || req.headers['x-forwarded-for'] || 'unknown';
    const result = limiter.check(clientKey as string);
    
    // 设置速率限制头
    const headers = SecurityManager.generateRateLimitHeaders(result);
    Object.entries(headers).forEach(([key, value]) => {
      res.setHeader(key, value);
    });
    
    if (!result.allowed) {
      return res.status(429).json({
        error: 'Too Many Requests',
        retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000),
      });
    }
    
    next();
  };
}

// 应用速率限制
const apiLimiter = SecurityManager.createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 100,
});

// 全局应用
app.use(rateLimitMiddleware(apiLimiter));

// 或对特定路由应用更严格的限制
const loginLimiter = SecurityManager.createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 10,
});
app.post('/api/login', rateLimitMiddleware(loginLimiter), loginHandler);
```

### 5.4 完整安全中间件栈

```typescript
import express from 'express';
import { SecurityManager } from './skills/security-manager-skill';

const app = express();

// 1. CSP 策略
const cspPolicy = SecurityManager.createCspPolicy('strict');
app.use((req, res, next) => {
  res.setHeader(
    SecurityManager.getCspHeaderName(cspPolicy),
    SecurityManager.generateCspHeader(cspPolicy)
  );
  next();
});

// 2. CORS 配置
const corsConfig = SecurityManager.createCorsConfig('strict', {
  origin: ['https://example.com'],
});
app.use((req, res, next) => {
  const headers = SecurityManager.generateCorsHeaders(corsConfig, req.headers.origin);
  Object.entries(headers).forEach(([key, value]) => res.setHeader(key, value));
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// 3. 速率限制
const limiter = SecurityManager.createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 100,
  onLimitReached: (key) => {
    console.warn(`[SECURITY] Rate limit exceeded for ${key}`);
  },
});
app.use((req, res, next) => {
  const result = limiter.check(req.ip || 'unknown');
  const headers = SecurityManager.generateRateLimitHeaders(result);
  Object.entries(headers).forEach(([key, value]) => res.setHeader(key, value));
  if (!result.allowed) {
    return res.status(429).json({ error: 'Too Many Requests' });
  }
  next();
});

// 4. 输入清理中间件
app.use(express.json({
  validate: (body) => {
    // 递归清理字符串字段
    const sanitize = (obj: any): any => {
      if (typeof obj === 'string') return SecurityManager.sanitizeInput(obj);
      if (Array.isArray(obj)) return obj.map(sanitize);
      if (obj && typeof obj === 'object') {
        return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, sanitize(v)]));
      }
      return obj;
    };
    return sanitize(body);
  }
}));

app.listen(3000, () => {
  console.log('🔒 安全服务器启动在 http://localhost:3000');
});
```

---

## 🎯 最佳实践

### CSP
- ✅ 生产环境使用 `strict` 模板
- ✅ 避免使用 `'unsafe-inline'` 和 `'unsafe-eval'`
- ✅ 使用 nonce 管理内联脚本
- ✅ 启用 `report-uri` 监控违规

### CORS
- ✅ 明确指定允许的源，避免使用 `*`
- ✅ 不要将 `credentials` 与通配符源一起使用
- ✅ 限制 `methods` 和 `headers` 到最小必要集合
- ✅ 设置合理的 `maxAge` 减少预检请求

### 速率限制
- ✅ 登录接口使用严格限制 (15 分钟 10 次)
- ✅ API 接口使用标准限制 (1 分钟 100 次)
- ✅ 使用分层限制提供多层保护
- ✅ 记录并监控触发限制的事件

---

## 📊 性能提示

1. **速率限制器清理**: 内部定时器已设置为 `unref()`，不会阻止进程退出
2. **内存优化**: 过期记录会自动清理，建议定期调用 `getStats()` 监控
3. **CSP 缓存**: CSP 策略可以预先编译并缓存，避免每次请求重新生成

---

**创建时间:** 2026-03-13  
**版本:** 1.0.0
