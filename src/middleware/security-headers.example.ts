/**
 * Security Headers Middleware - 使用示例
 * 
 * @author Axon
 * @version 1.0.0
 */

import express from 'express';
import { 
  securityHeaders, 
  strictSecurityConfig, 
  relaxedSecurityConfig,
  apiSecurityConfig 
} from './security-headers';

const app = express();

// ============ 示例 1: 使用默认配置 ============
// 适用于大多数 Web 应用，提供基础安全防护
app.use(securityHeaders());

// ============ 示例 2: 使用严格配置 ============
// 适用于高安全需求场景 (金融、医疗等)
app.use('/secure', securityHeaders(strictSecurityConfig));

// ============ 示例 3: 使用宽松配置 ============
// 适用于开发环境或需要嵌入第三方资源的场景
if (process.env.NODE_ENV === 'development') {
  app.use(securityHeaders(relaxedSecurityConfig));
}

// ============ 示例 4: API 专用配置 ============
// 适用于纯 API 服务，不需要 CSP
app.use('/api', securityHeaders(apiSecurityConfig));

// ============ 示例 5: 自定义配置 ============
app.use(securityHeaders({
  // Content-Security-Policy 自定义
  contentSecurityPolicy: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", 'https://cdn.example.com', 'https://www.google-analytics.com'],
    styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
    imgSrc: ["'self'", 'data:', 'https:', 'https://www.google-analytics.com'],
    fontSrc: ["'self'", 'https:', 'data:'],
    connectSrc: ["'self'", 'https://api.example.com', 'wss://socket.example.com'],
    objectSrc: ["'none'"],
    baseUri: ["'self'"],
    formAction: ["'self'", 'https://payment.example.com'],
    frameSrc: ["'self'", 'https://www.youtube.com'],
    upgradeInsecureRequests: true,
    blockAllMixedContent: true,
    reportUri: '/api/csp-report', // CSP 违规报告地址
  },
  
  // X-Frame-Options - 允许同源嵌入
  xFrameOptions: 'SAMEORIGIN',
  
  // X-Content-Type-Options - 启用
  xContentTypeOptions: true,
  
  // Strict-Transport-Security - 自定义
  strictTransportSecurity: {
    maxAge: 31536000, // 1 年
    includeSubDomains: true,
    preload: true,
  },
  
  // Referrer-Policy - 控制引用信息
  referrerPolicy: 'strict-origin-when-cross-origin',
  
  // Permissions-Policy - 控制浏览器功能权限
  permissionsPolicy: {
    camera: ["'self'"], // 只允许本站使用摄像头
    microphone: ["'self'"], // 只允许本站使用麦克风
    geolocation: ["'self'", 'https://maps.example.com'], // 允许本站和地图服务
    payment: ["'self'"], // 只允许本站处理支付
    usb: [], // 禁用 USB
    fullscreen: ["'self'"], // 只允许本站全屏
    clipboardWrite: ["'self'"], // 只允许本站写入剪贴板
  },
}));

// ============ 示例 6: 条件性应用中间件 ============
// 根据路径动态应用不同的安全策略
app.use((req, res, next) => {
  if (req.path.startsWith('/admin')) {
    // 管理后台使用严格配置
    return securityHeaders(strictSecurityConfig)(req, res, next);
  }
  
  if (req.path.startsWith('/api')) {
    // API 使用 API 专用配置
    return securityHeaders(apiSecurityConfig)(req, res, next);
  }
  
  // 其他路径使用默认配置
  return securityHeaders()(req, res, next);
});

// ============ 示例 7: 动态 CSP (根据请求生成) ============
app.use((req, res, next) => {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  
  // 将 nonce 传递给模板引擎
  res.locals.cspNonce = nonce;
  
  // 使用 nonce 的 CSP 配置
  securityHeaders({
    contentSecurityPolicy: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", `'nonce-${nonce}'`],
      styleSrc: ["'self'", `'nonce-${nonce}'`],
    },
  })(req, res, next);
});

// ============ 示例路由 ============

app.get('/', (req, res) => {
  // 在模板中使用 nonce (如果使用了示例 7)
  const nonce = res.locals.cspNonce || '';
  
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Security Headers Demo</title>
        ${nonce ? `<style nonce="${nonce}">body { font-family: sans-serif; }</style>` : ''}
      </head>
      <body>
        <h1>Security Headers Demo</h1>
        <p>检查响应头以验证安全头是否正确设置。</p>
        ${nonce ? `<script nonce="${nonce}">console.log('Inline script with nonce');</script>` : ''}
      </body>
    </html>
  `);
});

app.get('/api/csp-report', (req, res) => {
  // 接收 CSP 违规报告
  console.log('CSP Violation Report:', req.body);
  res.status(204).send();
});

// ============ 启动服务器 ============

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log('Security headers applied!');
});

// ============ 测试命令 ============

// 使用 curl 测试安全头:
// curl -I http://localhost:3000/
// 
// 预期响应头:
// Content-Security-Policy: default-src 'self'; script-src 'self'; ...
// X-Frame-Options: DENY
// X-Content-Type-Options: nosniff
// Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
// Referrer-Policy: strict-origin-when-cross-origin
