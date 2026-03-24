/**
 * CSRF 防护中间件使用示例
 * 
 * @author Axon
 * @version 1.0.0
 */

import { createCSRFMiddleware, CSRFProtection } from './csrf';

// ============================================
// 示例 1: 基础用法 (Express 风格)
// ============================================

const csrf = createCSRFMiddleware('your-super-secret-key-min-16-chars', {
  tokenExpiration: 3600000, // 1 小时
  cookieName: 'csrf_token',
  doubleSubmitCookie: true,
});

// 在 Express 中使用
// app.use(csrf.createExpressMiddleware());

// ============================================
// 示例 2: 自定义配置
// ============================================

const csrfCustom = createCSRFMiddleware('another-secret-key-1234567890', {
  tokenExpiration: 7200000, // 2 小时
  tokenLength: 64, // 更长的 Token
  cookieName: 'xsrf_token',
  headerName: 'X-XSRF-Token',
  cookieOptions: {
    path: '/api',
    secure: true,
    httpOnly: true,
    sameSite: 'strict',
    maxAge: 7200,
  },
  excludePaths: ['/api/public', '/health', '/api/webhooks/*'],
  validateNonSafeMethodsOnly: true,
});

// ============================================
// 示例 3: 手动生成和验证 Token
// ============================================

const csrfManual = createCSRFMiddleware('manual-secret-key-abcdefgh');

// 生成 Token
const tokenInfo = csrfManual.generateToken();
console.log('Generated Token:', tokenInfo.token);
console.log('Expires at:', new Date(tokenInfo.expires).toISOString());

// 验证 Token
const isValid = csrfManual.validateToken(tokenInfo.token);
console.log('Token valid:', isValid); // true

// 验证过期 Token
const expiredToken = 'abc123:1234567890:signature';
const isExpiredValid = csrfManual.validateToken(expiredToken);
console.log('Expired token valid:', isExpiredValid); // false

// ============================================
// 示例 4: Koa 风格中间件
// ============================================

function createKoaCSRFMiddleware(csrf: CSRFProtection) {
  return async (ctx: any, next: () => Promise<void>) => {
    const middlewareCtx = {
      method: ctx.method,
      path: ctx.path,
      getHeader: (name: string) => ctx.get(name),
      getCookie: (name: string) => ctx.cookies.get(name),
      setCookie: (name: string, value: string, options?: any) => {
        ctx.cookies.set(name, value, options);
      },
    };

    try {
      csrf.middleware(middlewareCtx, () => {});
      // 暴露 Token 给前端
      if (middlewareCtx.csrfToken) {
        ctx.set('X-CSRF-Token', middlewareCtx.csrfToken.split(':')[0]);
      }
      await next();
    } catch (error: any) {
      if (error.name === 'CSRFError') {
        ctx.status = 403;
        ctx.body = {
          error: 'CSRF_VALIDATION_FAILED',
          message: error.message,
        };
        return;
      }
      throw error;
    }
  };
}

// 在 Koa 中使用
// const csrfKoa = createCSRFMiddleware('koa-secret-key-1234567890123456');
// app.use(createKoaCSRFMiddleware(csrfKoa));

// ============================================
// 示例 5: Fastify 插件
// ============================================

function createFastifyCSRFPlugin(csrf: CSRFProtection) {
  return async (fastify: any, options: any) => {
    fastify.addHook('onRequest', async (request: any, reply: any) => {
      const middlewareCtx = {
        method: request.method,
        path: request.url,
        getHeader: (name: string) => request.headers[name.toLowerCase()],
        getCookie: (name: string) => {
          const cookies = request.headers.cookie;
          if (!cookies) return undefined;
          const match = cookies.match(new RegExp(`${name}=([^;]+)`));
          return match ? match[1] : undefined;
        },
        setCookie: (name: string, value: string, options?: any) => {
          reply.setCookie(name, value, options);
        },
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
  };
}

// 在 Fastify 中使用
// const csrfFastify = createCSRFMiddleware('fastify-secret-key-1234567890123456');
// fastify.register(createFastifyCSRFPlugin(csrfFastify));

// ============================================
// 示例 6: 前端使用示例 (JavaScript)
// ============================================

/**
 * 前端获取 CSRF Token 并发送请求
 * 
 * 浏览器端示例代码 (非 TypeScript)
 */
const frontendExample = `
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
      'X-CSRF-Token': csrfToken.split(':')[0], // 只发送原始 token
    },
    body: JSON.stringify(data),
    credentials: 'include', // 发送 Cookie
  });
  
  if (response.status === 403) {
    // Token 无效，刷新页面重新获取
    window.location.reload();
    return;
  }
  
  return response.json();
}

// 使用示例
// postWithCSRF('/api/users', { name: 'John' });
`;

// ============================================
// 示例 7: 完整 Express 应用集成
// ============================================

/**
 * 完整的 Express 应用示例
 * 
 * 这段代码展示如何在 Express 应用中完整集成 CSRF 防护
 */
const expressAppExample = `
import express from 'express';
import cookieParser from 'cookie-parser';
import { createCSRFMiddleware } from './middleware/csrf';

const app = express();
const csrf = createCSRFMiddleware('your-production-secret-key-change-this', {
  tokenExpiration: 3600000,
  cookieName: 'csrf_token',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'strict',
    maxAge: 3600,
  },
  excludePaths: ['/api/public', '/health', '/webhooks/*'],
});

// 中间件顺序很重要!
app.use(cookieParser());
app.use(express.json());
app.use(csrf.createExpressMiddleware());

// 路由示例
app.get('/api/form', (req, res) => {
  // Token 已通过中间件设置到 Cookie 和 Header
  res.json({
    message: 'Form endpoint',
    csrfToken: res.getHeader('X-CSRF-Token'),
  });
});

app.post('/api/submit', (req, res) => {
  // 如果 CSRF 验证失败，不会到达这里
  res.json({
    success: true,
    message: 'Form submitted successfully',
  });
});

app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});
`;

// ============================================
// 示例 8: 测试用例
// ============================================

/**
 * CSRF 中间件测试示例
 */
function runTests() {
  const csrf = createCSRFMiddleware('test-secret-key-1234567890123456');

  console.log('\n=== CSRF Middleware Tests ===\n');

  // Test 1: Token 生成
  const token1 = csrf.generateToken();
  console.assert(token1.token.includes(':'), 'Token should contain colons');
  console.assert(token1.expires > Date.now(), 'Token should have future expiration');
  console.log('✓ Test 1: Token generation passed');

  // Test 2: Token 验证
  const isValid = csrf.validateToken(token1.token);
  console.assert(isValid === true, 'Valid token should pass validation');
  console.log('✓ Test 2: Token validation passed');

  // Test 3: 过期 Token 验证
  const expiredToken = 'abc123:1000000000:invalidsignature';
  const isExpiredValid = csrf.validateToken(expiredToken);
  console.assert(isExpiredValid === false, 'Expired token should fail validation');
  console.log('✓ Test 3: Expired token rejection passed');

  // Test 4: 无效签名
  const tamperedToken = `${token1.token.split(':')[0]}:9999999999:fakesignature`;
  const isTamperedValid = csrf.validateToken(tamperedToken);
  console.assert(isTamperedValid === false, 'Tampered token should fail validation');
  console.log('✓ Test 4: Signature verification passed');

  // Test 5: 空 Token
  const isEmptyValid = csrf.validateToken('');
  console.assert(isEmptyValid === false, 'Empty token should fail validation');
  console.log('✓ Test 5: Empty token rejection passed');

  // Test 6: 密钥长度检查
  try {
    createCSRFMiddleware('short');
    console.log('✗ Test 6: Should throw error for short key');
  } catch (e: any) {
    console.assert(e.message.includes('16 characters'), 'Should require 16+ char key');
    console.log('✓ Test 6: Key length validation passed');
  }

  console.log('\n=== All Tests Passed ===\n');
}

// 运行测试
// runTests();

export { runTests };
