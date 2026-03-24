/**
 * Global Rate Limiter - Usage Examples
 * 
 * 全局限流中间件使用示例
 * 
 * @author Axon
 * @version 1.0.0
 */

import createGlobalRateLimiter, { 
  createRateLimitAdminAPI,
  presets,
  GlobalRateLimitConfig 
} from './rate-limit-global';

// ==================== 示例 1: 基础用法 ====================

/**
 * 基础配置 - 适用于大多数场景
 */
const basicExample = () => {
  // 创建限流中间件
  const rateLimiter = createGlobalRateLimiter({
    globalBucketSize: 500,      // 全局最多 500 个并发请求
    globalRefillRate: 50,       // 每秒补充 50 个令牌
    ipBucketSize: 50,           // 每个 IP 最多 50 个请求
    ipRefillRate: 5,            // 每个 IP 每秒补充 5 个令牌
  });

  // 在 Express 中使用
  // app.use(rateLimiter);

  // 在 Koa 中使用
  // app.use(async (ctx, next) => {
  //   await rateLimiter(ctx.req, ctx.res, next);
  // });

  console.log('✅ 基础限流中间件已创建');
};

// ==================== 示例 2: 使用预设配置 ====================

/**
 * 使用预设配置快速部署
 */
const presetExample = () => {
  // 开发环境
  const devLimiter = createGlobalRateLimiter(presets.development);
  
  // 生产环境
  const prodLimiter = createGlobalRateLimiter(presets.production);
  
  // 高并发场景
  const highTrafficLimiter = createGlobalRateLimiter(presets.highTraffic);
  
  // API 网关
  const apiGatewayLimiter = createGlobalRateLimiter(presets.apiGateway);

  console.log('✅ 预设配置限流器已创建');
};

// ==================== 示例 3: 管理 API 集成 ====================

/**
 * 集成管理 API，支持动态配置
 */
const adminAPIExample = () => {
  const limiter = createGlobalRateLimiter(presets.production);
  const adminAPI = createRateLimitAdminAPI(limiter);

  // 模拟 Express 路由
  const express = require('express');
  const router = express.Router();

  // GET /api/admin/rate-limit/stats - 获取统计信息
  router.get('/stats', (req: any, res: any) => {
    const stats = adminAPI.getStats();
    res.json({
      totalRequests: stats.totalRequests,
      blockedRequests: stats.blockedRequests,
      activeIPs: stats.activeIPs,
      blacklistedIPs: stats.blacklistedIPs,
      rateLimitHits: stats.rateLimitHits,
      blacklistHits: stats.blacklistHits,
    });
  });

  // GET /api/admin/rate-limit/blacklist - 获取黑名单
  router.get('/blacklist', (req: any, res: any) => {
    const blacklist = adminAPI.getBlacklist();
    res.json({ blacklist });
  });

  // POST /api/admin/rate-limit/blacklist - 添加 IP 到黑名单
  router.post('/blacklist', (req: any, res: any) => {
    const { ip, reason, permanent } = req.body;
    const result = adminAPI.addBlacklist(ip, reason, permanent);
    res.json(result);
  });

  // DELETE /api/admin/rate-limit/blacklist/:ip - 从黑名单移除
  router.delete('/blacklist/:ip', (req: any, res: any) => {
    const { ip } = req.params;
    const result = adminAPI.removeBlacklist(ip);
    res.json(result);
  });

  // POST /api/admin/rate-limit/stats/reset - 重置统计
  router.post('/stats/reset', (req: any, res: any) => {
    const result = adminAPI.resetStats();
    res.json(result);
  });

  console.log('✅ 管理 API 已创建');
  
  return router;
};

// ==================== 示例 4: 自定义 IP 提取 ====================

/**
 * 在复杂网络环境下自定义 IP 提取逻辑
 */
const customIPExtractionExample = () => {
  const limiter = createGlobalRateLimiter(presets.production);

  // 创建包装中间件
  const customRateLimiter = async (req: any, res: any, next: () => void) => {
    // 自定义 IP 提取逻辑
    let ip: string;
    
    // 1. 检查 Cloudflare CDN
    const cfIP = req.headers['cf-connecting-ip'];
    if (cfIP) {
      ip = cfIP;
    }
    // 2. 检查多层代理
    else if (req.headers['x-forwarded-for']) {
      const forwardedIPs = req.headers['x-forwarded-for'].split(',');
      ip = forwardedIPs[0].trim(); // 取第一个 IP
    }
    // 3. 检查真实 IP
    else if (req.headers['x-real-ip']) {
      ip = req.headers['x-real-ip'];
    }
    // 4. 回退到 socket
    else {
      ip = req.socket?.remoteAddress || '127.0.0.1';
    }

    // 清理 IP 格式 (移除 IPv6 前缀)
    ip = ip.replace(/^::ffff:/, '');

    // 调用限流器
    return limiter(req, res, next);
  };

  console.log('✅ 自定义 IP 提取限流器已创建');
  
  return customRateLimiter;
};

// ==================== 示例 5: 条件限流 ====================

/**
 * 根据路径或用户身份应用不同的限流策略
 */
const conditionalRateLimitExample = () => {
  // 创建多个限流器
  const strictLimiter = createGlobalRateLimiter(presets.apiGateway);
  const normalLimiter = createGlobalRateLimiter(presets.production);
  const relaxedLimiter = createGlobalRateLimiter(presets.development);

  const conditionalLimiter = async (req: any, res: any, next: () => void) => {
    const path = req.path || '';
    const userRole = req.user?.role; // 假设已认证

    // API 端点 - 严格限流
    if (path.startsWith('/api/')) {
      return strictLimiter(req, res, next);
    }
    
    // 管理员 - 宽松限流
    if (userRole === 'admin') {
      return relaxedLimiter(req, res, next);
    }
    
    // 认证用户 - 标准限流
    if (userRole) {
      return normalLimiter(req, res, next);
    }
    
    // 未认证用户 - 严格限流
    return strictLimiter(req, res, next);
  };

  console.log('✅ 条件限流器已创建');
  
  return conditionalLimiter;
};

// ==================== 示例 6: 实时监控面板 ====================

/**
 * 集成 WebSocket 实现实时监控
 */
const realTimeMonitoringExample = () => {
  const limiter = createGlobalRateLimiter(presets.production);
  
  // 假设使用 Socket.IO
  const io = require('socket.io')(3001);

  // 定期推送统计信息
  setInterval(() => {
    const stats = limiter.getStats();
    
    // 广播给所有连接的客户端
    io.emit('rate-limit-stats', {
      timestamp: Date.now(),
      totalRequests: stats.totalRequests,
      blockedRequests: stats.blockedRequests,
      activeIPs: stats.activeIPs,
      blacklistedIPs: stats.blacklistedIPs,
      rateLimitHits: stats.rateLimitHits,
      requestDistribution: Array.from(stats.requestDistribution.entries()),
    });
  }, 5000); // 每 5 秒推送一次

  console.log('✅ 实时监控已配置');
  
  return limiter;
};

// ==================== 示例 7: 完整应用集成 ====================

/**
 * 在完整应用中的集成示例
 */
const fullApplicationExample = () => {
  const express = require('express');
  const app = express();

  // 1. 创建限流器
  const rateLimiter = createGlobalRateLimiter({
    globalBucketSize: 1000,
    globalRefillRate: 100,
    ipBucketSize: 100,
    ipRefillRate: 10,
    temporaryBanDurationMs: 3600000, // 1 小时
  });

  // 2. 创建管理 API
  const adminAPI = createRateLimitAdminAPI(rateLimiter);

  // 3. 应用限流中间件 (放在最前面)
  app.use(rateLimiter);

  // 4. 其他中间件
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // 5. 业务路由
  app.get('/', (req: any, res: any) => {
    res.json({ message: 'Hello World' });
  });

  app.get('/api/data', (req: any, res: any) => {
    res.json({ data: 'Some data' });
  });

  // 6. 管理路由
  app.use('/api/admin/rate-limit', adminAPIExample());

  // 7. 错误处理
  app.use((err: any, req: any, res: any, next: any) => {
    console.error('Error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  });

  // 8. 启动服务器
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📊 Rate limiter active: Global=${1000} req, IP=${100} req`);
  });

  // 9. 优雅关闭
  process.on('SIGTERM', () => {
    console.log('🛑 Shutting down gracefully...');
    // 清理限流器资源
    // limiter.destroy(); // 如果需要手动清理
    process.exit(0);
  });
};

// ==================== 示例 8: 测试限流器 ====================

/**
 * 简单的限流器测试
 */
const testRateLimiter = () => {
  const limiter = createGlobalRateLimiter({
    globalBucketSize: 10,
    globalRefillRate: 2,
    ipBucketSize: 5,
    ipRefillRate: 1,
  });

  console.log('🧪 开始限流测试...\n');

  // 模拟请求
  for (let i = 1; i <= 15; i++) {
    const result = limiter.processRequest('192.168.1.100');
    
    if (result.allowed) {
      console.log(`请求 ${i}: ✅ 允许 (剩余：${result.remaining})`);
    } else {
      console.log(`请求 ${i}: ❌ 拒绝 (原因：${result.reason}, 等待：${result.retryAfter}ms)`);
    }
  }

  // 查看统计
  const stats = limiter.getStats();
  console.log('\n📊 统计信息:');
  console.log(`总请求：${stats.totalRequests}`);
  console.log(`被拒绝：${stats.blockedRequests}`);
  console.log(`活跃 IP: ${stats.activeIPs}`);

  // 测试黑名单
  console.log('\n🚫 测试黑名单...');
  limiter.addToBlacklist('192.168.1.200', '恶意行为', true);
  
  const blacklistResult = limiter.processRequest('192.168.1.200');
  console.log(`黑名单 IP 请求：${blacklistResult.allowed ? '✅ 允许' : '❌ 拒绝'}`);
  console.log(`原因：${blacklistResult.blacklistInfo?.reason}`);

  console.log('\n✅ 测试完成\n');
};

// ==================== 导出所有示例 ====================

export {
  basicExample,
  presetExample,
  adminAPIExample,
  customIPExtractionExample,
  conditionalRateLimitExample,
  realTimeMonitoringExample,
  fullApplicationExample,
  testRateLimiter,
};

// 运行测试 (如果直接执行此文件)
if (require.main === module) {
  testRateLimiter();
}
