/**
 * 限流工具技能使用示例
 * 
 * @module skills/throttle-utils-examples
 */

import {
  TokenBucket,
  LeakyBucket,
  SlidingWindow,
  CompositeThrottle,
  createTokenBucket,
  createLeakyBucket,
  createSlidingWindow,
  createCompositeThrottle,
  createExpressMiddleware
} from './throttle-utils-skill';

// ==================== 示例 1: 令牌桶算法 ====================

/**
 * 场景: API 网关限流
 * 配置: 每秒 10 个请求，突发容量 100
 */
export function exampleTokenBucket() {
  const limiter = new TokenBucket({
    capacity: 100,        // 最多 100 个令牌 (突发容量)
    refillRate: 10,       // 每秒补充 10 个令牌
    fillInitially: true   // 初始填满
  });

  // 模拟请求处理
  async function handleRequest(requestId: string) {
    if (limiter.tryAcquire()) {
      console.log(`✅ 请求 ${requestId} 被允许`);
      // 处理业务逻辑...
    } else {
      console.log(`❌ 请求 ${requestId} 被拒绝 (限流)`);
    }
  }

  // 并发测试
  for (let i = 0; i < 120; i++) {
    handleRequest(`req-${i}`);
  }

  console.log(`当前可用令牌: ${limiter.getAvailableTokens()}`);
}

/**
 * 场景: 用户下载限流 (阻塞等待)
 */
export async function exampleTokenBucketBlocking() {
  const limiter = createTokenBucket(5, 1); // 容量 5，每秒 1 个

  async function downloadFile(fileId: string) {
    // 等待获取令牌 (最多等 30 秒)
    const allowed = await limiter.acquire(1, 30000);
    
    if (allowed) {
      console.log(`📥 开始下载 ${fileId}`);
      // 执行下载...
    } else {
      console.log(`⏰ 下载 ${fileId} 超时`);
    }
  }

  // 并发下载
  await Promise.all([
    downloadFile('file-1'),
    downloadFile('file-2'),
    downloadFile('file-3'),
    downloadFile('file-4'),
    downloadFile('file-5'),
    downloadFile('file-6'), // 这个需要等待
  ]);
}

// ==================== 示例 2: 漏桶算法 ====================

/**
 * 场景: 消息队列平滑处理
 * 配置: 每秒处理 5 条消息，队列容量 50
 */
export function exampleLeakyBucket() {
  const limiter = new LeakyBucket({
    capacity: 50,   // 最多 50 条消息
    leakRate: 5     // 每秒处理 5 条
  });

  // 模拟消息生产
  async function produceMessage(messageId: string) {
    if (limiter.tryAdd()) {
      console.log(`📨 消息 ${messageId} 入队`);
      // 消息会被以固定速率处理
    } else {
      console.log(`🚫 消息 ${messageId} 被拒绝 (队列已满)`);
    }
  }

  // 突发消息流
  for (let i = 0; i < 60; i++) {
    produceMessage(`msg-${i}`);
  }

  console.log(`当前队列水量: ${limiter.getWaterLevel().toFixed(2)}`);
  console.log(`剩余容量: ${limiter.getRemainingCapacity().toFixed(2)}`);
}

/**
 * 场景: 数据库连接池限流
 */
export async function exampleLeakyBucketDB() {
  const limiter = createLeakyBucket(10, 2); // 容量 10，每秒 2 个连接

  async function executeQuery(queryId: string) {
    const allowed = await limiter.add(1, 5000); // 最多等 5 秒
    
    if (allowed) {
      console.log(`🗄️ 执行查询 ${queryId}`);
      // 执行数据库查询...
    } else {
      console.log(`⏰ 查询 ${queryId} 超时`);
    }
  }

  // 并发查询
  await Promise.all(
    Array.from({ length: 15 }, (_, i) => executeQuery(`query-${i}`))
  );
}

// ==================== 示例 3: 滑动窗口算法 ====================

/**
 * 场景: IP 访问频率限制
 * 配置: 1 分钟内最多 60 次请求
 */
export function exampleSlidingWindow() {
  const limiter = new SlidingWindow({
    windowSize: 60000,  // 1 分钟窗口
    maxRequests: 60,    // 最多 60 次请求
    smooth: true        // 使用平滑滑动窗口
  });

  // 模拟 IP 请求
  function handleIPRequest(ip: string, requestId: string) {
    if (limiter.tryRecord()) {
      console.log(`✅ IP ${ip} 请求 ${requestId} 被允许`);
    } else {
      console.log(`🚫 IP ${ip} 请求 ${requestId} 被限流`);
    }
  }

  // 模拟正常流量
  for (let i = 0; i < 70; i++) {
    handleIPRequest('192.168.1.100', `req-${i}`);
  }

  console.log(`当前窗口请求数: ${limiter.getRequestCount()}`);
  console.log(`剩余可用请求: ${limiter.getRemainingRequests()}`);
}

/**
 * 场景: 短信验证码发送限制
 */
export async function exampleSlidingWindowSMS() {
  const limiter = createSlidingWindow(300000, 3); // 5 分钟内最多 3 条

  async function sendSMS(phoneNumber: string, code: string) {
    const allowed = await limiter.record(1, 10000); // 最多等 10 秒
    
    if (allowed) {
      console.log(`📱 发送验证码到 ${phoneNumber}: ${code}`);
      // 调用短信服务...
    } else {
      console.log(`🚫 ${phoneNumber} 发送频率过高，请稍后再试`);
    }
  }

  // 模拟用户频繁请求
  await sendSMS('138****0000', '123456');
  await sendSMS('138****0000', '123457');
  await sendSMS('138****0000', '123458');
  await sendSMS('138****0000', '123459'); // 这个会被限流
}

// ==================== 示例 4: 组合限流器 ====================

/**
 * 场景: 多层 API 限流
 * - 令牌桶: 控制突发流量
 * - 漏桶: 平滑处理速率
 * - 滑动窗口: 限制时间段内总请求数
 */
export function exampleCompositeThrottle() {
  const limiter = new CompositeThrottle({
    tokenBucket: {
      capacity: 20,
      refillRate: 5
    },
    leakyBucket: {
      capacity: 50,
      leakRate: 10
    },
    slidingWindow: {
      windowSize: 60000, // 1 分钟
      maxRequests: 100,
      smooth: true
    }
  });

  // 模拟 API 请求
  async function handleAPIRequest(endpoint: string) {
    const allowed = await limiter.execute(5000); // 最多等 5 秒
    
    if (allowed) {
      console.log(`🔌 API ${endpoint} 请求成功`);
      // 处理 API 请求...
    } else {
      console.log(`🚫 API ${endpoint} 请求被拒绝`);
    }
  }

  // 并发请求
  Promise.all(
    Array.from({ length: 30 }, (_, i) => handleAPIRequest(`/api/resource/${i}`))
  );
}

// ==================== 示例 5: Express 中间件集成 ====================

/**
 * 场景: Express API 限流中间件
 */
export function exampleExpressMiddleware() {
  // 假设在 Express 应用中
  // import express from 'express';
  // const app = express();

  const limiter = createTokenBucket(100, 10); // 每秒 10 个，容量 100

  // 创建中间件
  const rateLimitMiddleware = createExpressMiddleware(limiter);

  // 使用示例:
  // app.use('/api/', rateLimitMiddleware);
  // app.get('/api/users', (req, res) => {
  //   res.json({ users: [] });
  // });

  console.log('✅ Express 限流中间件已配置');
  console.log('   限制: 100 请求/突发，10 请求/秒');
}

// ==================== 示例 6: 实际应用场景 ====================

/**
 * 场景 1: 用户等级限流
 */
export function exampleUserTierLimits() {
  interface UserTier {
    free: { capacity: number; refillRate: number };
    premium: { capacity: number; refillRate: number };
    enterprise: { capacity: number; refillRate: number };
  }

  const tierLimits: UserTier = {
    free: { capacity: 10, refillRate: 1 },
    premium: { capacity: 100, refillRate: 10 },
    enterprise: { capacity: 1000, refillRate: 100 }
  };

  function getLimiterForUser(tier: keyof UserTier) {
    const limits = tierLimits[tier];
    return createTokenBucket(limits.capacity, limits.refillRate);
  }

  const freeLimiter = getLimiterForUser('free');
  const premiumLimiter = getLimiterForUser('premium');

  console.log('🎯 用户等级限流配置:');
  console.log('   Free: 10 请求/突发，1 请求/秒');
  console.log('   Premium: 100 请求/突发，10 请求/秒');
  console.log('   Enterprise: 1000 请求/突发，100 请求/秒');
}

/**
 * 场景 2: 爬虫限流
 */
export async function exampleWebCrawler() {
  const domainLimiter = new Map<string, SlidingWindow>();

  function getDomainLimiter(domain: string) {
    if (!domainLimiter.has(domain)) {
      // 每个域名：10 秒内最多 5 次请求
      domainLimiter.set(domain, createSlidingWindow(10000, 5));
    }
    return domainLimiter.get(domain)!;
  }

  async function crawlPage(url: string) {
    const domain = new URL(url).hostname;
    const limiter = getDomainLimiter(domain);

    const allowed = await limiter.record(1, 5000);
    if (allowed) {
      console.log(`🕷️ 爬取：${url}`);
      // 执行爬取...
    } else {
      console.log(`⏸️ 等待：${url} (域名限流)`);
    }
  }

  // 爬取多个页面
  const urls = [
    'https://example.com/page1',
    'https://example.com/page2',
    'https://example.com/page3',
    'https://another.com/page1',
    'https://another.com/page2',
  ];

  await Promise.all(urls.map(url => crawlPage(url)));
}

// ==================== 运行示例 ====================

if (require.main === module) {
  console.log('🚀 运行限流工具示例\n');

  console.log('=== 示例 1: 令牌桶 ===');
  exampleTokenBucket();

  console.log('\n=== 示例 2: 漏桶 ===');
  exampleLeakyBucket();

  console.log('\n=== 示例 3: 滑动窗口 ===');
  exampleSlidingWindow();

  console.log('\n=== 示例 4: 组合限流 ===');
  exampleCompositeThrottle();

  console.log('\n=== 示例 5: Express 中间件 ===');
  exampleExpressMiddleware();

  console.log('\n=== 示例 6: 实际场景 ===');
  exampleUserTierLimits();

  console.log('\n✅ 所有示例运行完成');
}
