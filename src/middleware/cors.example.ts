/**
 * CORS Middleware Usage Examples
 * 
 * 展示如何在不同场景下使用 CORS 中间件
 */

import { createCorsMiddleware, presets, createCorsWithValidator } from './cors';

// ============================================
// 示例 1: 基础使用 - 允许所有来源
// ============================================
const openCors = createCorsMiddleware({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false,
  maxAge: 86400, // 预检缓存 24 小时
});

// 在 Express 中使用
// app.use(openCors);

// 在 Koa 中使用
// app.use(openCors);

// ============================================
// 示例 2: 使用预定义配置 - 开发环境
// ============================================
const devCors = createCorsMiddleware(presets.development);
// 允许 localhost 和 127.0.0.1 的所有端口，支持凭证

// ============================================
// 示例 3: 多来源配置
// ============================================
const multiOriginCors = createCorsMiddleware({
  origin: [
    'https://example.com',
    'https://app.example.com',
    'https://admin.example.com',
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['X-Custom-Header', 'X-RateLimit-Remaining'],
  credentials: true, // 允许携带 cookies
  maxAge: 3600,
});

// ============================================
// 示例 4: 正则匹配子域名
// ============================================
const subdomainCors = createCorsMiddleware({
  // 匹配所有 *.example.com 子域名
  origin: /^https:\/\/[a-z0-9-]+\.example\.com$/,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false,
  maxAge: 86400,
});

// ============================================
// 示例 5: 自定义来源验证函数 (异步)
// ============================================
const customValidatorCors = createCorsWithValidator(
  async (origin) => {
    if (!origin) return true; // 同源请求允许
    
    // 从数据库或缓存检查来源是否合法
    const allowedOrigins = await getAllowedOriginsFromDB();
    return allowedOrigins.includes(origin);
  },
  {
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    maxAge: 1800,
  }
);

// 模拟从数据库获取允许的来源
async function getAllowedOriginsFromDB(): Promise<string[]> {
  // 实际场景中从数据库读取
  return ['https://trusted-site.com', 'https://partner.example.com'];
}

// ============================================
// 示例 6: 动态来源验证 (同步)
// ============================================
const dynamicCors = createCorsWithValidator(
  (origin) => {
    if (!origin) return true;
    
    // 简单的白名单检查
    const whitelist = [
      'https://example.com',
      'https://app.example.com',
    ];
    
    return whitelist.includes(origin);
  },
  presets.standard
);

// ============================================
// 示例 7: 完整 Express 应用集成
// ============================================
/*
import express from 'express';
import { createCorsMiddleware } from './cors';

const app = express();

// 生产环境 CORS 配置
const corsMiddleware = createCorsMiddleware({
  origin: ['https://example.com', 'https://app.example.com'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['X-Custom-Header'],
  credentials: true,
  maxAge: 3600,
});

// 在所有路由之前使用 CORS 中间件
app.use(corsMiddleware);

// 其他中间件
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 路由
app.get('/api/data', (req, res) => {
  res.json({ message: 'Hello from CORS-enabled API' });
});

app.post('/api/submit', (req, res) => {
  res.json({ received: req.body });
});

// 启动服务器
app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});
*/

// ============================================
// 示例 8: 完整 Koa 应用集成
// ============================================
/*
import Koa from 'koa';
import { createCorsMiddleware } from './cors';

const app = new Koa();

// CORS 中间件
app.use(createCorsMiddleware(presets.standard));

// 其他中间件
app.use(async (ctx, next) => {
  await next();
});

// 路由
app.use(async (ctx) => {
  ctx.body = { message: 'Koa CORS example' };
});

app.listen(3000);
*/

// ============================================
// 示例 9: 仅对特定路由启用 CORS
// ============================================
/*
import express from 'express';
import { createCorsMiddleware } from './cors';

const app = express();

// 创建不同配置的 CORS 中间件
const publicCors = createCorsMiddleware(presets.open);
const privateCors = createCorsMiddleware(presets.standard);

// 公开 API - 允许所有来源
app.use('/api/public', publicCors);
app.get('/api/public/info', (req, res) => {
  res.json({ public: true });
});

// 私有 API - 仅允许指定来源
app.use('/api/private', privateCors);
app.get('/api/private/user', (req, res) => {
  res.json({ private: true, user: req.user });
});
*/

// ============================================
// 示例 10: 预检请求缓存测试
// ============================================
/*
// 浏览器会缓存预检请求结果，在 maxAge 秒内不再发送 OPTIONS 请求
// 配置 maxAge 可以减少预检请求次数，提升性能

const cachedCors = createCorsMiddleware({
  origin: 'https://example.com',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type'],
  credentials: true,
  maxAge: 86400, // 缓存 24 小时
});

// 响应头会包含:
// Access-Control-Max-Age: 86400
*/

// ============================================
// 示例 11: 处理凭证 (Cookies/Authorization)
// ============================================
/*
// 当 credentials: true 时:
// 1. origin 不能为 '*'，必须是具体来源或动态来源
// 2. 前端需要设置: xhr.withCredentials = true 或 fetch credentials: 'include'
// 3. 响应头会包含: Access-Control-Allow-Credentials: true

const credentialsCors = createCorsMiddleware({
  origin: 'https://example.com',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true, // 关键配置
  maxAge: 3600,
});

// 前端示例:
// fetch('https://api.example.com/data', {
//   credentials: 'include', // 携带 cookies
//   headers: {
//     'Authorization': 'Bearer token123'
//   }
// });
*/

// ============================================
// 示例 12: 自定义暴露头
// ============================================
/*
// 默认情况下，浏览器只能访问简单的响应头
// 使用 exposedHeaders 可以暴露自定义头给客户端 JavaScript

const customHeadersCors = createCorsMiddleware({
  origin: 'https://example.com',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: [
    'X-Custom-Header',
    'X-RateLimit-Limit',
    'X-RateLimit-Remaining',
    'X-RateLimit-Reset',
  ],
  credentials: false,
  maxAge: 3600,
});

// 前端可以访问:
// const response = await fetch('/api/data');
// const customHeader = response.headers.get('X-Custom-Header');
*/

export {
  openCors,
  devCors,
  multiOriginCors,
  subdomainCors,
  customValidatorCors,
  dynamicCors,
};
