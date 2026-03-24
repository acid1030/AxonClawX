/**
 * Request ID Middleware - 使用示例
 * 
 * 演示如何使用 Request ID 中间件进行请求追踪和日志关联
 */

import express from 'express';
import { 
  requestId, 
  getRequestId, 
  withRequestId,
  generateRequestId,
  generateRequestIdWithPrefix,
  presets,
  REQUEST_ID_HEADER 
} from './request-id';
import { getLogger } from '../logger/logger';

// ============ 示例 1: 基础用法 ============

function example1_basic() {
  const app = express();
  
  // 使用 Request ID 中间件
  app.use(requestId());
  
  app.get('/api/status', (req, res) => {
    // 访问 Request ID
    const requestId = getRequestId(req);
    
    res.json({ 
      status: 'ok',
      requestId,
      timestamp: new Date().toISOString()
    });
  });
  
  return app;
}

// ============ 示例 2: 自定义配置 ============

function example2_customConfig() {
  const app = express();
  
  app.use(requestId({
    includeInResponse: true,      // 在响应头中返回 Request ID
    attachToLogs: true,           // 附加到日志
    generator: () => `req-${Date.now()}-${Math.random().toString(36).substring(2, 9).toUpperCase()}`
  }));
  
  return app;
}

// ============ 示例 3: 使用预设配置 ============

function example3_presets() {
  const app = express();
  
  // 生产环境
  if (process.env.NODE_ENV === 'production') {
    app.use(presets.production());
  } else {
    app.use(presets.development());
  }
  
  return app;
}

// ============ 示例 4: 多服务追踪 (带前缀) ============

function example4_multiService() {
  const app = express();
  
  // API 服务使用 API 前缀
  app.use('/api', presets.withPrefix('API').apply({}));
  
  // WebSocket 服务使用 WS 前缀
  app.use('/ws', presets.withPrefix('WS').apply({}));
  
  return app;
}

// ============ 示例 5: 日志关联 ============

function example5_logContext() {
  const app = express();
  const logger = getLogger();
  
  app.use(requestId());
  
  app.post('/api/data', (req, res) => {
    // 创建带 Request ID 上下文的 Logger
    const requestId = getRequestId(req)!;
    const contextLogger = withRequestId(logger, requestId);
    
    // 所有日志自动包含 Request ID
    contextLogger.info('DATA', 'Processing data request');
    
    // 模拟异步处理
    setTimeout(() => {
      contextLogger.info('DATA', 'Data validation passed');
      contextLogger.info('DATA', 'Saving to database');
      
      res.json({ 
        success: true, 
        requestId,
        message: 'Data processed successfully'
      });
    }, 100);
  });
  
  return app;
}

// ============ 示例 6: 完整的 Express 应用 ============

function example6_fullApp() {
  const app = express();
  const logger = getLogger();
  
  // 1. 使用 Request ID 中间件 (在所有路由之前)
  app.use(requestId(presets.production()));
  
  // 2. 健康检查端点
  app.get('/health', (req, res) => {
    res.json({ 
      status: 'healthy',
      requestId: getRequestId(req),
      timestamp: new Date().toISOString()
    });
  });
  
  // 3. API 端点 - 用户列表
  app.get('/api/users', (req, res) => {
    const requestId = getRequestId(req)!;
    const contextLogger = withRequestId(logger, requestId);
    
    contextLogger.info('USER', 'Fetching user list');
    
    // 模拟数据库查询
    const users = [
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' }
    ];
    
    contextLogger.info('USER', `Returned ${users.length} users`);
    
    res.json({ 
      users,
      requestId,
      count: users.length
    });
  });
  
  // 4. API 端点 - 创建用户
  app.post('/api/users', (req, res) => {
    const requestId = getRequestId(req)!;
    const contextLogger = withRequestId(logger, requestId);
    
    contextLogger.info('USER', 'Creating new user');
    
    // 模拟创建
    const newUser = { id: 3, name: 'Charlie' };
    
    contextLogger.info('USER', 'User created successfully', { userId: newUser.id });
    
    res.status(201).json({ 
      user: newUser,
      requestId,
      message: 'User created'
    });
  });
  
  // 5. 错误处理
  app.get('/api/error', (req, res) => {
    const requestId = getRequestId(req)!;
    const contextLogger = withRequestId(logger, requestId);
    
    contextLogger.error('ERROR', 'Simulated error', {
      error: 'This is a test error',
      code: 'TEST_ERROR'
    });
    
    res.status(500).json({
      error: 'Internal server error',
      requestId,
      message: 'Error logged with Request ID for tracing'
    });
  });
  
  // 6. 启动服务器
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    logger.info('SERVER', `Server running on port ${PORT}`);
  });
  
  return app;
}

// ============ 示例 7: 分布式追踪 ============

/**
 * 在服务间传递 Request ID
 */
async function example7_distributedTracing() {
  const app = express();
  app.use(requestId());
  
  // 服务 A - 接收请求并调用服务 B
  app.get('/api/process', async (req, res) => {
    const requestId = getRequestId(req)!;
    const logger = withRequestId(getLogger(), requestId);
    
    logger.info('SERVICE-A', 'Received request');
    
    try {
      // 调用服务 B 时传递 Request ID
      const response = await fetch('http://service-b:3001/api/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          [REQUEST_ID_HEADER]: requestId, // 传递 Request ID
        },
        body: JSON.stringify({ data: 'test' })
      });
      
      const result = await response.json();
      
      logger.info('SERVICE-A', 'Service B responded', { result });
      
      res.json({
        success: true,
        requestId,
        serviceB: result
      });
    } catch (error) {
      logger.error('SERVICE-A', 'Service B call failed', { error });
      res.status(500).json({
        error: 'Service B unavailable',
        requestId
      });
    }
  });
  
  return app;
}

// ============ 示例 8: 自定义 Request ID 生成器 ============

function example8_customGenerator() {
  const app = express();
  
  // 使用 UUID 格式的 Request ID
  app.use(requestId({
    generator: () => {
      // 简单的 UUID v4 生成
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    }
  }));
  
  app.get('/api/uuid', (req, res) => {
    res.json({
      requestId: getRequestId(req),
      format: 'UUID v4'
    });
  });
  
  return app;
}

// ============ 示例 9: 测试 Request ID 中间件 ============

/**
 * 使用 Jest 测试 Request ID 中间件
 */
describe('Request ID Middleware', () => {
  it('should generate Request ID for each request', async () => {
    const app = express();
    app.use(requestId());
    
    app.get('/test', (req, res) => {
      res.json({ requestId: getRequestId(req) });
    });
    
    // 模拟请求测试...
  });
  
  it('should use client-provided Request ID', async () => {
    const app = express();
    app.use(requestId());
    
    app.get('/test', (req, res) => {
      res.json({ requestId: getRequestId(req) });
    });
    
    // 发送带 X-Request-ID 头的请求...
  });
  
  it('should include Request ID in response header', async () => {
    const app = express();
    app.use(requestId({ includeInResponse: true }));
    
    app.get('/test', (req, res) => {
      res.json({ status: 'ok' });
    });
    
    // 检查响应头是否包含 X-Request-ID...
  });
});

// ============ 导出所有示例 ============

export {
  example1_basic,
  example2_customConfig,
  example3_presets,
  example4_multiService,
  example5_logContext,
  example6_fullApp,
  example7_distributedTracing,
  example8_customGenerator,
};

// ============ 快速启动示例 ============

/**
 * 一键启动完整示例应用
 * 
 * 运行: node request-id.example.js
 */
if (require.main === module) {
  console.log('🚀 Starting Request ID Example Server...');
  example6_fullApp();
}
