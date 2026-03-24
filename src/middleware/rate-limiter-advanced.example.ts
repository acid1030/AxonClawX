/**
 * Advanced Rate Limiter - Usage Examples
 * 
 * 演示如何使用高级限流器：
 * 1. 基础滑动窗口限流
 * 2. 分布式限流 (Redis)
 * 3. 动态限流规则
 * 4. 运行时规则管理
 * 
 * @author Axon
 * @version 1.0.0
 */

import express from 'express';
import createAdvancedRateLimiter, {
  AdvancedRateLimitConfig,
  DynamicRule,
  presets,
  presetRules,
} from './rate-limiter-advanced';

// ==================== 示例 1: 基础滑动窗口限流 ====================

/**
 * 最简单的使用方式：内存模式，滑动窗口限流
 */
function example1_basic() {
  const app = express();

  const config: AdvancedRateLimitConfig = {
    defaultAlgorithm: 'sliding-window',
    defaultSlidingWindow: {
      windowSizeMs: 60000, // 1 分钟窗口
      maxRequests: 100,    // 最多 100 个请求
    },
    dynamicRules: [], // 不使用动态规则
    verbose: true,
  };

  const rateLimiter = createAdvancedRateLimiter(config);

  // 应用到所有路由
  app.use(rateLimiter);

  app.get('/api/data', (req, res) => {
    res.json({ message: 'Success' });
  });

  app.listen(3000, () => {
    console.log('Example 1: Basic rate limiter running on port 3000');
  });
}

// ==================== 示例 2: 使用 Redis 分布式限流 ====================

/**
 * 使用 Redis 实现分布式限流 (多实例共享限流状态)
 * 
 * 注意：需要先安装 Redis 客户端
 * npm install ioredis 或 npm install redis
 */
async function example2_redis() {
  const express = require('express');
  const Redis = require('ioredis');

  const app = express();

  // 创建 Redis 客户端
  const redisClient = new Redis({
    host: 'localhost',
    port: 6379,
    password: undefined, // 如果有密码
    db: 0,
  });

  // 测试 Redis 连接
  try {
    await redisClient.ping();
    console.log('✓ Redis connected');
  } catch (error) {
    console.error('✗ Redis connection failed:', error);
    console.log('Falling back to memory mode');
  }

  const config: AdvancedRateLimitConfig = {
    defaultAlgorithm: 'sliding-window',
    defaultSlidingWindow: {
      windowSizeMs: 60000,
      maxRequests: 100,
    },
    dynamicRules: [],
    redis: {
      host: 'localhost',
      port: 6379,
      keyPrefix: 'myapp:ratelimit:', // 自定义键前缀，避免冲突
    },
    verbose: true,
  };

  const rateLimiter = createAdvancedRateLimiter(config);

  app.use(rateLimiter);

  app.get('/api/data', (req, res) => {
    res.json({ message: 'Success', distributed: true });
  });

  app.listen(3000, () => {
    console.log('Example 2: Redis-backed rate limiter running on port 3000');
  });

  // 优雅关闭
  process.on('SIGINT', () => {
    redisClient.disconnect();
    process.exit(0);
  });
}

// ==================== 示例 3: 动态限流规则 ====================

/**
 * 使用预定义的动态规则，针对不同 API 路径应用不同的限流策略
 */
function example3_dynamicRules() {
  const app = express();

  const config: AdvancedRateLimitConfig = {
    defaultAlgorithm: 'sliding-window',
    defaultSlidingWindow: {
      windowSizeMs: 60000,
      maxRequests: 100, // 默认：100 请求/分钟
    },
    // 使用预定义的规则
    dynamicRules: [
      presetRules.auth,    // 登录接口：5 请求/分钟
      presetRules.api,     // API 接口：100 请求/分钟
      presetRules.upload,  // 文件上传：10 请求/小时
      presetRules.search,  // 搜索接口：30 请求/分钟
    ],
    // 全局限流保护
    globalLimit: {
      maxRequests: 5000,
      windowSizeMs: 60000,
    },
    verbose: true,
  };

  const rateLimiter = createAdvancedRateLimiter(config);

  app.use(rateLimiter);

  // 不同的 API 路径会自动应用对应的限流规则
  app.post('/auth/login', (req, res) => {
    // 限流：5 请求/分钟 (auth 规则)
    res.json({ message: 'Login endpoint' });
  });

  app.get('/api/users', (req, res) => {
    // 限流：100 请求/分钟 (api 规则)
    res.json({ message: 'Users API' });
  });

  app.post('/upload/file', (req, res) => {
    // 限流：10 请求/小时 (upload 规则)
    res.json({ message: 'Upload endpoint' });
  });

  app.get('/search/query', (req, res) => {
    // 限流：30 请求/分钟 (search 规则)
    res.json({ message: 'Search endpoint' });
  });

  app.get('/other/endpoint', (req, res) => {
    // 限流：100 请求/分钟 (默认规则)
    res.json({ message: 'Other endpoint' });
  });

  app.listen(3000, () => {
    console.log('Example 3: Dynamic rules rate limiter running on port 3000');
  });
}

// ==================== 示例 4: 自定义动态规则 ====================

/**
 * 创建自定义动态规则，支持路径通配符、HTTP 方法、用户代理匹配等
 */
function example4_customRules() {
  const app = express();

  // 自定义规则：VIP 用户限流更宽松
  const vipUserRule: DynamicRule = {
    id: 'vip-user-limit',
    name: 'VIP User Rate Limit',
    pathPattern: '/api/**',
    methods: ['GET', 'POST'],
    algorithm: 'sliding-window',
    slidingWindow: {
      windowSizeMs: 60000,
      maxRequests: 500, // VIP: 500 请求/分钟
    },
    priority: 1, // 高优先级
    enabled: true,
    // 自定义条件：检查是否为 VIP 用户
    customCondition: (req) => {
      return req.user?.vip === true || req.headers?.['x-vip'] === 'true';
    },
  };

  // 自定义规则：爬虫限流更严格
  const botRule: DynamicRule = {
    id: 'bot-limit',
    name: 'Bot/Crawler Rate Limit',
    pathPattern: '**', // 匹配所有路径
    userAgentPattern: '.*(bot|crawler|spider|scraper).*',
    algorithm: 'sliding-window',
    slidingWindow: {
      windowSizeMs: 60000,
      maxRequests: 10, // 爬虫：10 请求/分钟
    },
    priority: 2,
    enabled: true,
  };

  const config: AdvancedRateLimitConfig = {
    defaultAlgorithm: 'sliding-window',
    defaultSlidingWindow: {
      windowSizeMs: 60000,
      maxRequests: 100,
    },
    dynamicRules: [vipUserRule, botRule, presetRules.auth],
    verbose: true,
  };

  const rateLimiter = createAdvancedRateLimiter(config);

  app.use(rateLimiter);

  app.get('/api/data', (req, res) => {
    res.json({ message: 'API endpoint with custom rules' });
  });

  app.listen(3000, () => {
    console.log('Example 4: Custom rules rate limiter running on port 3000');
  });
}

// ==================== 示例 5: 运行时规则管理 ====================

/**
 * 动态添加、修改、删除限流规则 (无需重启服务)
 */
function example5_runtimeManagement() {
  const app = express();

  const config: AdvancedRateLimitConfig = {
    defaultAlgorithm: 'sliding-window',
    defaultSlidingWindow: {
      windowSizeMs: 60000,
      maxRequests: 100,
    },
    dynamicRules: [presetRules.api],
    verbose: true,
  };

  const rateLimiter = createAdvancedRateLimiter(config);
  const ruleManager = rateLimiter.getRuleManager();

  app.use(rateLimiter);

  // 管理 API：动态添加规则
  app.post('/admin/ratelimit/rules', express.json(), (req, res) => {
    const { action, rule } = req.body;

    try {
      switch (action) {
        case 'add':
          ruleManager.addRule(rule as DynamicRule);
          res.json({ success: true, message: 'Rule added' });
          break;

        case 'update':
          ruleManager.updateRule(rule.id, rule);
          res.json({ success: true, message: 'Rule updated' });
          break;

        case 'remove':
          ruleManager.removeRule(rule.id);
          res.json({ success: true, message: 'Rule removed' });
          break;

        case 'toggle':
          ruleManager.toggleRule(rule.id, rule.enabled);
          res.json({ success: true, message: `Rule ${rule.enabled ? 'enabled' : 'disabled'}` });
          break;

        default:
          res.status(400).json({ error: 'Unknown action' });
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // 管理 API：获取所有规则
  app.get('/admin/ratelimit/rules', (req, res) => {
    const rules = ruleManager.getAllRules();
    res.json({ rules });
  });

  // 管理 API：获取统计信息
  app.get('/admin/ratelimit/stats', (req, res) => {
    const stats = rateLimiter.getStats();
    res.json({ stats });
  });

  app.get('/api/data', (req, res) => {
    res.json({ message: 'Data endpoint' });
  });

  app.listen(3000, () => {
    console.log('Example 5: Runtime rule management running on port 3000');
    console.log('Admin APIs:');
    console.log('  GET  /admin/ratelimit/rules  - List all rules');
    console.log('  POST /admin/ratelimit/rules  - Add/Update/Remove/Toggle rule');
    console.log('  GET  /admin/ratelimit/stats  - Get statistics');
  });
}

// ==================== 示例 6: 使用预设配置 ====================

/**
 * 快速使用预设配置 (开发/生产/API 网关)
 */
function example6_presets() {
  const app = express();

  // 方式 1: 使用生产环境预设
  const rateLimiter = createAdvancedRateLimiter(presets.production);

  // 方式 2: 使用 API 网关预设
  // const rateLimiter = createAdvancedRateLimiter(presets.apiGateway);

  // 方式 3: 基于预设自定义
  // const rateLimiter = createAdvancedRateLimiter({
  //   ...presets.production,
  //   defaultSlidingWindow: {
  //     ...presets.production.defaultSlidingWindow,
  //     maxRequests: 200, // 调整为 200 请求/分钟
  //   },
  // });

  app.use(rateLimiter);

  app.get('/api/**', (req, res) => {
    res.json({ message: 'API with production preset' });
  });

  app.listen(3000, () => {
    console.log('Example 6: Using presets running on port 3000');
  });
}

// ==================== 示例 7: 响应头信息 ====================

/**
 * 限流响应头说明
 * 
 * 每次请求都会返回以下响应头：
 * - X-RateLimit-Limit: 当前窗口内的请求总数
 * - X-RateLimit-Remaining: 剩余可用请求数
 * - X-RateLimit-Reset: 窗口重置时间 (Unix 时间戳)
 * - X-RateLimit-Algorithm: 使用的限流算法
 * - X-RateLimit-Rule: 匹配的规则 ID
 * - X-RateLimit-Window-Start: 窗口开始时间
 * - X-RateLimit-Window-End: 窗口结束时间
 * 
 * 当限流触发时 (HTTP 429):
 * - Retry-After: 建议的重试等待时间 (秒)
 */
function example7_responseHeaders() {
  const app = express();

  const config: AdvancedRateLimitConfig = {
    defaultAlgorithm: 'sliding-window',
    defaultSlidingWindow: {
      windowSizeMs: 60000,
      maxRequests: 10, // 故意设置很小以便演示
    },
    dynamicRules: [],
    verbose: true,
  };

  const rateLimiter = createAdvancedRateLimiter(config);

  app.use(rateLimiter);

  app.get('/api/demo', (req, res) => {
    // 响应头已经自动添加，客户端可以读取
    res.json({
      message: 'Check response headers for rate limit info',
      tip: 'Look for X-RateLimit-* headers',
    });
  });

  // 自定义错误处理
  app.use((err: any, req: any, res: any, next: any) => {
    if (res.statusCode === 429) {
      res.json({
        error: 'Too Many Requests',
        message: 'Please slow down',
        retryAfter: res.getHeader('Retry-After'),
        resetTime: new Date(parseInt(res.getHeader('X-RateLimit-Reset'))).toISOString(),
      });
    } else {
      next(err);
    }
  });

  app.listen(3000, () => {
    console.log('Example 7: Response headers demo running on port 3000');
    console.log('Try making multiple requests and check the headers!');
  });
}

// ==================== 示例 8: 完整综合示例 ====================

/**
 * 综合所有功能的完整示例
 */
function example8_complete() {
  const app = express();

  // 1. 基础配置
  const config: AdvancedRateLimitConfig = {
    defaultAlgorithm: 'sliding-window',
    defaultSlidingWindow: {
      windowSizeMs: 60000,
      maxRequests: 100,
    },

    // 2. Redis 分布式支持 (可选)
    // redis: {
    //   host: 'localhost',
    //   port: 6379,
    //   keyPrefix: 'myapp:ratelimit:',
    // },

    // 3. 动态规则
    dynamicRules: [
      // 认证接口：严格限流
      {
        id: 'auth-strict',
        name: 'Authentication Strict',
        pathPattern: '/auth/**',
        methods: ['POST'],
        algorithm: 'sliding-window',
        slidingWindow: {
          windowSizeMs: 60000,
          maxRequests: 5,
        },
        priority: 1,
        enabled: true,
      },

      // API 接口：标准限流
      presetRules.api,

      // 搜索接口：中等限流
      presetRules.search,

      // VIP 用户：宽松限流
      {
        id: 'vip-generous',
        name: 'VIP Generous',
        pathPattern: '/api/**',
        algorithm: 'sliding-window',
        slidingWindow: {
          windowSizeMs: 60000,
          maxRequests: 500,
        },
        priority: 2,
        enabled: true,
        customCondition: (req) => req.user?.vip === true,
      },
    ],

    // 4. 全局限流保护
    globalLimit: {
      maxRequests: 10000,
      windowSizeMs: 60000,
    },

    // 5. 详细日志
    verbose: true,
  };

  const rateLimiter = createAdvancedRateLimiter(config);
  const ruleManager = rateLimiter.getRuleManager();

  // 应用限流中间件
  app.use(rateLimiter);

  // 业务路由
  app.post('/auth/login', (req, res) => {
    res.json({ message: 'Login (5 req/min)' });
  });

  app.get('/api/users', (req, res) => {
    res.json({ message: 'Users API (100 req/min)' });
  });

  app.get('/search/query', (req, res) => {
    res.json({ message: 'Search (30 req/min)' });
  });

  // 管理路由
  app.get('/admin/stats', (req, res) => {
    const stats = rateLimiter.getStats();
    res.json(stats);
  });

  app.get('/admin/rules', (req, res) => {
    const rules = ruleManager.getAllRules();
    res.json({ rules });
  });

  app.post('/admin/rules', express.json(), (req, res) => {
    const { action, rule } = req.body;
    
    if (action === 'add') {
      ruleManager.addRule(rule as DynamicRule);
      res.json({ success: true });
    } else if (action === 'toggle') {
      ruleManager.toggleRule(rule.id, rule.enabled);
      res.json({ success: true });
    }
  });

  // 启动服务
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log('='.repeat(60));
    console.log('Advanced Rate Limiter - Complete Example');
    console.log('='.repeat(60));
    console.log(`Server running on port ${PORT}`);
    console.log('');
    console.log('Endpoints:');
    console.log('  POST /auth/login   - 5 requests/minute');
    console.log('  GET  /api/users    - 100 requests/minute');
    console.log('  GET  /search/query - 30 requests/minute');
    console.log('');
    console.log('Admin APIs:');
    console.log('  GET /admin/stats   - View statistics');
    console.log('  GET /admin/rules   - List all rules');
    console.log('  POST /admin/rules  - Manage rules');
    console.log('');
    console.log('Response Headers:');
    console.log('  X-RateLimit-Limit');
    console.log('  X-RateLimit-Remaining');
    console.log('  X-RateLimit-Reset');
    console.log('  X-RateLimit-Algorithm');
    console.log('  X-RateLimit-Rule');
    console.log('='.repeat(60));
  });

  // 优雅关闭
  process.on('SIGINT', () => {
    console.log('\nShutting down...');
    rateLimiter.destroy();
    process.exit(0);
  });
}

// ==================== 导出示例 ====================

// 根据需要运行示例
// example1_basic();
// example2_redis();
// example3_dynamicRules();
// example4_customRules();
// example5_runtimeManagement();
// example6_presets();
// example7_responseHeaders();
example8_complete();

export {
  example1_basic,
  example2_redis,
  example3_dynamicRules,
  example4_customRules,
  example5_runtimeManagement,
  example6_presets,
  example7_responseHeaders,
  example8_complete,
};
