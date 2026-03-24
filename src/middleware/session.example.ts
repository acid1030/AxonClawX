/**
 * Session 中间件使用示例
 * 
 * 展示如何在不同场景下使用会话管理中间件
 * 
 * @author Axon
 */

import { createSessionMiddleware, SessionData, UserStatus } from './session';

// ============================================
// 示例 1: 基础内存会话配置
// ============================================
const memorySession = createSessionMiddleware({
  store: 'memory',
  ttl: 24 * 60 * 60 * 1000, // 24 小时
  idleTimeout: 30 * 60 * 1000, // 30 分钟空闲超时
  cookieName: 'sessionId',
  rolling: true, // 自动续期
  cleanupInterval: 10 * 60 * 1000, // 10 分钟清理一次
});

// ============================================
// 示例 2: Redis 会话配置 (生产环境推荐)
// ============================================
const redisSession = createSessionMiddleware({
  store: 'redis',
  redis: {
    host: 'localhost',
    port: 6379,
    password: process.env.REDIS_PASSWORD,
    db: 0,
    keyPrefix: 'axonclaw:session:',
  },
  ttl: 7 * 24 * 60 * 60 * 1000, // 7 天
  cookieName: 'sessionId',
  rolling: true,
  cookie: {
    httpOnly: true,
    secure: true, // HTTPS 环境下启用
    sameSite: 'strict',
    path: '/',
  },
});

// ============================================
// 示例 3: 在 Express 中使用
// ============================================
async function expressExample() {
  const express = require('express');
  const app = express();

  // 初始化会话中间件
  await memorySession.initialize();

  // 使用中间件
  app.use(memorySession.middleware());

  // 路由示例
  app.get('/login', async (req: any, res: any) => {
    const { username, password } = req.body;

    // 验证用户 (这里简化处理)
    const user = await validateUser(username, password);
    
    if (user) {
      // 更新会话，添加用户信息
      await req.sessionStore.update(req.sessionId, {
        userId: user.id,
        role: user.role,
        userStatus: 'online',
        data: {
          username: user.username,
          email: user.email,
        },
      });

      res.json({
        success: true,
        message: '登录成功',
        session: req.session,
      });
    } else {
      res.status(401).json({
        success: false,
        message: '用户名或密码错误',
      });
    }
  });

  app.get('/profile', async (req: any, res: any) => {
    // 访问会话数据
    const session = req.session as SessionData;
    
    res.json({
      userId: session.userId,
      role: session.role,
      status: session.userStatus,
      data: session.data,
    });
  });

  app.post('/logout', async (req: any, res: any) => {
    // 销毁会话
    await req.sessionStore.destroy(req.sessionId);
    
    // 清除 Cookie
    res.setHeader('Set-Cookie', 'sessionId=; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Path=/');
    
    res.json({ success: true, message: '已退出登录' });
  });

  app.listen(3000, () => {
    console.log('Server running on http://localhost:3000');
  });
}

// ============================================
// 示例 4: 在 Koa 中使用
// ============================================
async function koaExample() {
  const Koa = require('koa');
  const app = new Koa();

  await redisSession.initialize();

  // Koa 中间件
  app.use(memorySession.middleware());

  app.use(async (ctx: any, next: any) => {
    if (ctx.path === '/login') {
      // 登录逻辑
      ctx.body = { success: true };
    } else if (ctx.path === '/status') {
      // 获取在线用户数
      const count = await redisSession.getOnlineUserCount();
      ctx.body = { onlineUsers: count };
    } else {
      await next();
    }
  });
}

// ============================================
// 示例 5: 直接使用 API (无框架)
// ============================================
async function directAPIExample() {
  await memorySession.initialize();

  // 创建会话
  const session = await memorySession.createSession(
    'user-123',
    {
      username: 'axon',
      role: 'admin',
      preferences: { theme: 'dark', language: 'zh-CN' },
    }
  );

  console.log('Created session:', session.sessionId);

  // 获取会话
  const retrieved = await memorySession.getSession(session.sessionId);
  console.log('Retrieved session:', retrieved);

  // 更新用户状态
  await memorySession.updateUserStatus(session.sessionId, 'busy');

  // 续期会话
  await memorySession.touchSession(session.sessionId);

  // 获取在线用户数
  const onlineCount = await memorySession.getOnlineUserCount();
  console.log('Online users:', onlineCount);

  // 销毁会话
  await memorySession.destroySession(session.sessionId);

  // 关闭中间件
  await memorySession.close();
}

// ============================================
// 示例 6: WebSocket 会话集成
// ============================================
async function websocketExample() {
  const WebSocket = require('ws');
  const wss = new WebSocket.Server({ port: 8080 });

  await memorySession.initialize();

  // 会话到 WebSocket 连接的映射
  const sessionConnections = new Map<string, any>();

  wss.on('connection', async (ws: any, req: any) => {
    // 从 Cookie 或 URL 参数获取会话 ID
    const sessionId = extractSessionFromRequest(req);
    
    if (sessionId) {
      const session = await memorySession.getSession(sessionId);
      
      if (session) {
        // 绑定会话到连接
        sessionConnections.set(sessionId, ws);
        
        // 更新用户状态为在线
        await memorySession.updateUserStatus(sessionId, 'online');

        ws.on('message', async (message: any) => {
          // 更新最后活动时间
          await memorySession.touchSession(sessionId);
          
          // 处理消息...
          console.log(`User ${session.userId}: ${message}`);
        });

        ws.on('close', async () => {
          // 用户断开连接，更新状态
          await memorySession.updateUserStatus(sessionId, 'offline');
          sessionConnections.delete(sessionId);
        });
      } else {
        ws.close(4001, 'Session expired');
      }
    } else {
      ws.close(4000, 'No session provided');
    }
  });

  console.log('WebSocket server running on ws://localhost:8080');
}

// ============================================
// 示例 7: 中间件组合使用
// ============================================
async function middlewareCompositionExample() {
  const express = require('express');
  const app = express();

  // 创建多个中间件
  const session = createSessionMiddleware({
    store: 'redis',
    redis: { host: 'localhost', port: 6379 },
    ttl: 24 * 60 * 60 * 1000,
  });

  // 初始化
  await session.initialize();

  // 中间件栈
  app.use(session.middleware());
  
  // 权限检查中间件 (依赖会话)
  app.use(async (req: any, res: any, next: any) => {
    const sessionData = req.session as SessionData;
    
    // 检查是否需要登录
    if (!sessionData.userId) {
      return res.status(401).json({ error: '需要登录' });
    }

    // 检查用户状态
    if (sessionData.userStatus === 'busy') {
      return res.status(403).json({ error: '用户当前忙碌' });
    }

    next();
  });

  // 受保护的路由
  app.get('/dashboard', (req: any, res: any) => {
    res.json({
      message: '欢迎访问仪表盘',
      user: req.session.data,
    });
  });
}

// ============================================
// 示例 8: 会话事件监听
// ============================================
async function sessionEventsExample() {
  await memorySession.initialize();

  // 创建会话
  const session = await memorySession.createSession('user-456', {
    username: 'test-user',
  });

  // 监听会话活动
  console.log('Session created at:', new Date(session.createdAt));
  console.log('Session expires at:', new Date(session.expiresAt));

  // 定期检查会话状态
  const checkInterval = setInterval(async () => {
    const currentSession = await memorySession.getSession(session.sessionId);
    
    if (!currentSession) {
      console.log('Session has expired or been destroyed');
      clearInterval(checkInterval);
      return;
    }

    console.log('Session status:', {
      userId: currentSession.userId,
      userStatus: currentSession.userStatus,
      lastActivity: new Date(currentSession.lastActivity),
      remainingTTL: Math.round((currentSession.expiresAt - Date.now()) / 1000) + 's',
    });
  }, 5000);

  // 5 分钟后停止检查
  setTimeout(() => {
    clearInterval(checkInterval);
    memorySession.close();
  }, 5 * 60 * 1000);
}

// ============================================
// 辅助函数
// ============================================

/**
 * 模拟用户验证
 */
async function validateUser(username: string, password: string) {
  // 实际项目中应该查询数据库
  if (username === 'admin' && password === 'admin123') {
    return {
      id: 'user-123',
      username: 'admin',
      email: 'admin@example.com',
      role: 'admin',
    };
  }
  return null;
}

/**
 * 从请求中提取会话 ID
 */
function extractSessionFromRequest(req: any): string | null {
  // 从 Cookie
  const cookieHeader = req.headers?.cookie;
  if (cookieHeader) {
    const match = cookieHeader.match(/sessionId=([^;]+)/);
    if (match) return match[1];
  }

  // 从 URL 参数
  const url = new URL(req.url, 'http://localhost');
  const sessionId = url.searchParams.get('sessionId');
  if (sessionId) return sessionId;

  return null;
}

// ============================================
// 导出示例
// ============================================
export {
  memorySession,
  redisSession,
  expressExample,
  koaExample,
  directAPIExample,
  websocketExample,
  middlewareCompositionExample,
  sessionEventsExample,
};
