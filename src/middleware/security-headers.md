# Security Headers Middleware

HTTP 安全头中间件，为 Express 应用提供全面的安全防护。

## 功能特性

### 1. Content-Security-Policy (CSP)
防止 XSS 攻击和数据注入，通过指定哪些动态资源允许加载。

### 2. X-Frame-Options
防止点击劫持攻击，控制页面是否允许被 `<frame>`、`<iframe>` 等嵌入。

### 3. X-Content-Type-Options
防止 MIME 类型嗅探攻击，强制浏览器使用服务器声明的 Content-Type。

### 4. Strict-Transport-Security (HSTS)
强制使用 HTTPS 连接，防止协议降级攻击。

### 5. 额外保护
- Referrer-Policy: 控制引用信息发送策略
- Permissions-Policy: 控制浏览器功能权限
- X-XSS-Protection: 旧版浏览器的 XSS 过滤 (可选)

## 快速开始

```typescript
import { securityHeaders } from './middleware/security-headers';

// 使用默认配置
app.use(securityHeaders());
```

## 配置选项

### SecurityHeadersConfig

```typescript
interface SecurityHeadersConfig {
  contentSecurityPolicy?: CSPConfig | false;
  xFrameOptions?: 'DENY' | 'SAMEORIGIN' | { allowFrom: string } | false;
  xContentTypeOptions?: boolean;
  strictTransportSecurity?: HSTSConfig | false;
  xXSSProtection?: boolean;
  referrerPolicy?: ReferrerPolicy;
  permissionsPolicy?: PermissionsPolicyConfig;
}
```

### CSPConfig

```typescript
interface CSPConfig {
  defaultSrc?: string[];
  scriptSrc?: string[];
  styleSrc?: string[];
  imgSrc?: string[];
  fontSrc?: string[];
  connectSrc?: string[];
  mediaSrc?: string[];
  objectSrc?: string[];
  baseUri?: string[];
  formAction?: string[];
  frameSrc?: string[];
  upgradeInsecureRequests?: boolean;
  blockAllMixedContent?: boolean;
  reportUri?: string;
}
```

### HSTSConfig

```typescript
interface HSTSConfig {
  maxAge?: number;        // 秒，默认 31536000 (1 年)
  includeSubDomains?: boolean;
  preload?: boolean;
}
```

## 预设配置

### strictSecurityConfig
适用于高安全需求场景 (金融、医疗等)。

### relaxedSecurityConfig
适用于开发环境或需要嵌入第三方资源的场景。

### apiSecurityConfig
适用于纯 API 服务。

## 使用示例

### 基础使用

```typescript
import express from 'express';
import { securityHeaders } from './middleware/security-headers';

const app = express();
app.use(securityHeaders());
```

### 自定义配置

```typescript
app.use(securityHeaders({
  contentSecurityPolicy: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", 'https://cdn.example.com'],
    styleSrc: ["'self'", "'unsafe-inline'"],
  },
  xFrameOptions: 'SAMEORIGIN',
  strictTransportSecurity: {
    maxAge: 31536000,
    includeSubDomains: true,
  },
}));
```

### 条件性应用

```typescript
app.use((req, res, next) => {
  if (req.path.startsWith('/admin')) {
    return securityHeaders(strictSecurityConfig)(req, res, next);
  }
  return securityHeaders()(req, res, next);
});
```

### 动态 CSP (使用 Nonce)

```typescript
app.use((req, res, next) => {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  res.locals.cspNonce = nonce;
  
  securityHeaders({
    contentSecurityPolicy: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", `'nonce-${nonce}'`],
    },
  })(req, res, next);
});
```

## 测试

使用 curl 测试安全头:

```bash
curl -I http://localhost:3000/
```

预期响应头:

```
Content-Security-Policy: default-src 'self'; script-src 'self'; ...
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
Referrer-Policy: strict-origin-when-cross-origin
```

## 注意事项

1. **HSTS 仅在 HTTPS 下生效** - 确保你的应用运行在 HTTPS 上或在反向代理后
2. **CSP 需要逐步收紧** - 先在 Report-Only 模式下测试，再正式启用
3. **生产环境使用严格配置** - 开发环境可以使用宽松配置
4. **定期更新配置** - 根据安全最佳实践更新配置

## 相关文件

- `security-headers.ts` - 中间件实现
- `security-headers.example.ts` - 使用示例
- `security-headers.md` - 本文档

## 作者

Axon  
Version 1.0.0
