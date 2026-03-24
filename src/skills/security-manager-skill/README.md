# 🔒 Security Manager Skill

**安全管理器技能** - 企业级 Web 安全策略管理工具

---

## 📦 功能概览

| 功能模块 | 描述 | 使用场景 |
|---------|------|---------|
| **CSP 策略** | Content Security Policy 管理 | 防止 XSS、数据注入攻击 |
| **CORS 配置** | Cross-Origin Resource Sharing | 跨域访问控制 |
| **速率限制** | Rate Limiting | 防暴力破解、DDoS 防护 |
| **安全工具** | 辅助函数集 | 输入清理、源验证等 |

---

## 🚀 快速开始

### 1. 导入技能

```typescript
import { SecurityManager } from './src/skills/security-manager-skill';
```

### 2. 配置 CSP

```typescript
// 生产环境 - 严格模式
const cspPolicy = SecurityManager.createCspPolicy('strict');

// 在 Express 中使用
app.use((req, res, next) => {
  res.setHeader(
    SecurityManager.getCspHeaderName(cspPolicy),
    SecurityManager.generateCspHeader(cspPolicy)
  );
  next();
});
```

### 3. 配置 CORS

```typescript
const corsConfig = SecurityManager.createCorsConfig('strict', {
  origin: ['https://yourdomain.com']
});

app.use((req, res, next) => {
  const headers = SecurityManager.generateCorsHeaders(corsConfig, req.headers.origin);
  Object.entries(headers).forEach(([key, value]) => res.setHeader(key, value));
  next();
});
```

### 4. 配置速率限制

```typescript
const limiter = SecurityManager.createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 分钟
  maxRequests: 100, // 最多 100 次请求
});

app.use((req, res, next) => {
  const result = limiter.check(req.ip || 'unknown');
  if (!result.allowed) {
    return res.status(429).json({ error: 'Too Many Requests' });
  }
  next();
});
```

---

## 📁 文件结构

```
src/skills/
├── security-manager-skill.ts      # 核心实现 (22KB)
├── security-manager-skill.examples.md  # 详细使用示例 (14KB)
└── security-manager-skill/
    └── README.md                  # 本文件
```

---

## 📖 详细文档

- **完整示例**: 查看 [`security-manager-skill.examples.md`](./security-manager-skill.examples.md)
- **API 参考**: 查看 TypeScript 源文件中的 JSDoc 注释

---

## 🎯 预设模板

### CSP 模板

| 模板名 | 描述 | 适用场景 |
|-------|------|---------|
| `strict` | 严格模式 | 生产环境 |
| `development` | 开发模式 | 本地开发 |
| `api` | API 专用 | 无界面服务 |

### CORS 模板

| 模板名 | 描述 | 适用场景 |
|-------|------|---------|
| `strict` | 指定源 | 生产环境 |
| `development` | 允许所有 | 本地开发 |
| `gateway` | API 网关 | 微服务架构 |

### 速率限制模板

| 模板名 | 限制 | 适用场景 |
|-------|------|---------|
| `strict` | 15 分钟 10 次 | 登录/注册 |
| `standard` | 1 分钟 100 次 | 一般 API |
| `generous` | 1 分钟 1000 次 | 公开 API |
| `bruteForceProtection` | 1 小时 5 次 | 敏感操作 |

---

## 🔐 安全最佳实践

### ✅ 推荐做法

1. **CSP**
   - 生产环境使用 `strict` 模板
   - 避免 `'unsafe-inline'` 和 `'unsafe-eval'`
   - 使用 nonce 管理内联脚本
   - 启用 `report-uri` 监控违规

2. **CORS**
   - 明确指定允许的源
   - 不要将 `credentials` 与 `*` 一起使用
   - 限制方法和头到最小必要集合

3. **速率限制**
   - 登录接口使用严格限制
   - 使用分层限制提供多层保护
   - 记录并监控触发事件

### ❌ 避免做法

```typescript
// ❌ 错误的 CSP
const badCsp = SecurityManager.createCspPolicy('custom', {
  'default-src': ['*'], // 允许所有源
  'script-src': ["'unsafe-inline'", "'unsafe-eval'"], // 危险
});

// ❌ 错误的 CORS
const badCors = SecurityManager.createCorsConfig('custom', {
  origin: '*',
  credentials: true, // 冲突！
});

// ❌ 错误的速率限制
const badLimiter = SecurityManager.createRateLimiter({
  windowMs: 0, // 无效
  maxRequests: 0, // 无效
});
```

---

## 🧪 验证配置

```typescript
// 验证 CSP
const cspValidation = SecurityManager.validateCspPolicy(cspPolicy);
if (!cspValidation.valid) {
  console.error('CSP 错误:', cspValidation.errors);
}

// 验证 CORS
const corsValidation = SecurityManager.validateCorsConfig(corsConfig);
if (!corsValidation.valid) {
  console.error('CORS 错误:', corsValidation.errors);
}

// 验证速率限制
const rateLimitValidation = SecurityManager.validateRateLimitConfig(config);
if (!rateLimitValidation.valid) {
  console.error('速率限制错误:', rateLimitValidation.errors);
}
```

---

## 🛠️ 工具函数

```typescript
// 生成 CSP nonce
const nonce = SecurityManager.generateCspNonce(16);

// 生成 OAuth state
const state = SecurityManager.generateOAuthState(32);

// 验证源
const trusted = SecurityManager.isOriginTrusted(
  'https://example.com',
  ['https://example.com']
);

// 清理输入 (防 XSS)
const sanitized = SecurityManager.sanitizeInput('<script>alert("XSS")</script>');

// 验证 Content-Type
const allowed = SecurityManager.isContentTypeAllowed(
  'application/json',
  ['application/json', 'text/plain']
);
```

---

## 📊 性能提示

1. **CSP 缓存**: 策略可以预先编译并缓存
2. **速率限制清理**: 过期记录自动清理
3. **内存监控**: 定期调用 `limiter.getStats()` 监控状态

---

## 🤝 集成示例

### Express

```typescript
import express from 'express';
import { SecurityManager } from './skills/security-manager-skill';

const app = express();

// 完整安全栈
app.use(cspMiddleware(SecurityManager.createCspPolicy('strict')));
app.use(corsMiddleware(SecurityManager.createCorsConfig('strict', {
  origin: ['https://example.com']
})));
app.use(rateLimitMiddleware(SecurityManager.createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 100
})));

app.listen(3000);
```

### Koa

```typescript
import Koa from 'koa';
import { SecurityManager } from './skills/security-manager-skill';

const app = new Koa();

app.use(async (ctx, next) => {
  // CSP
  const policy = SecurityManager.createCspPolicy('strict');
  ctx.set(SecurityManager.getCspHeaderName(policy), 
          SecurityManager.generateCspHeader(policy));
  
  // CORS
  const cors = SecurityManager.createCorsConfig('strict', {
    origin: ['https://example.com']
  });
  const headers = SecurityManager.generateCorsHeaders(cors, ctx.get('Origin'));
  Object.entries(headers).forEach(([k, v]) => ctx.set(k, v));
  
  // 速率限制
  const limiter = SecurityManager.createRateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 100
  });
  const result = limiter.check(ctx.ip);
  if (!result.allowed) {
    ctx.status = 429;
    return;
  }
  
  await next();
});
```

---

## 📝 更新日志

### v1.0.0 (2026-03-13)
- ✅ CSP 策略管理
- ✅ CORS 配置
- ✅ 速率限制
- ✅ 安全工具函数
- ✅ TypeScript 支持
- ✅ 完整文档

---

## 📄 许可证

MIT License

---

**创建时间:** 2026-03-13  
**维护者:** Axon Security Team  
**版本:** 1.0.0
