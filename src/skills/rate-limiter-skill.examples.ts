/**
 * 限流工具 - 使用示例集合
 * 
 * 展示三种限流算法的实际应用场景
 */

import {
  createTokenBucket,
  createSlidingWindow,
  createDistributedLimiter,
  TokenBucketLimiter,
  SlidingWindowLimiter,
} from '@/skills/rate-limiter-skill';

// ============================================
// 示例 1: API 网关限流 (令牌桶)
// ============================================

/**
 * API 限流中间件
 * 每个 API Key 独立限流，允许适度突发
 */
export class APIRateLimiter {
  private limiters: Map<string, TokenBucketLimiter>;

  constructor() {
    this.limiters = new Map();
  }

  /**
   * 获取或创建 API Key 的限流器
   */
  getLimiter(apiKey: string): TokenBucketLimiter {
    if (!this.limiters.has(apiKey)) {
      // 100 次/秒，允许突发到 200 次
      this.limiters.set(apiKey, createTokenBucket(200, 100));
    }
    return this.limiters.get(apiKey)!;
  }

  /**
   * 检查请求是否允许
   */
  check(apiKey: string, tokensNeeded: number = 1): {
    allowed: boolean;
    remaining: number;
    resetTime: number;
    retryAfter?: number;
  } {
    const limiter = this.getLimiter(apiKey);
    return limiter.acquire(tokensNeeded);
  }

  /**
   * 清理不活跃的限流器
   */
  cleanup(): void {
    for (const [apiKey, limiter] of this.limiters.entries()) {
      if (limiter.getAvailableTokens() >= 199) {
        // 几乎未使用，删除以节省内存
        this.limiters.delete(apiKey);
      }
    }
  }
}

// 使用示例
const apiLimiter = new APIRateLimiter();

function handleApiRequest(apiKey: string) {
  const result = apiLimiter.check(apiKey);
  
  if (result.allowed) {
    console.log(`✅ API 请求通过，剩余配额：${result.remaining}`);
    // 处理业务逻辑
  } else {
    console.log(`❌ API 请求被限流，等待：${result.retryAfter}ms`);
    // 返回 429 错误
  }
}

// ============================================
// 示例 2: 用户行为防刷 (滑动窗口)
// ============================================

/**
 * 用户操作限流器
 * 防止恶意刷接口
 */
export class UserActionLimiter {
  private limiters: Map<string, SlidingWindowLimiter>;
  private readonly windowSize: number;
  private readonly maxActions: number;

  constructor(windowSizeMs: number = 60000, maxActions: number = 60) {
    this.windowSize = windowSizeMs;
    this.maxActions = maxActions;
    this.limiters = new Map();
  }

  /**
   * 检查用户操作
   */
  check(userId: string): boolean {
    if (!this.limiters.has(userId)) {
      this.limiters.set(
        userId,
        createSlidingWindow(this.windowSize, this.maxActions)
      );
    }

    const limiter = this.limiters.get(userId)!;
    const result = limiter.check();

    if (!result.allowed) {
      console.warn(
        `⚠️ 用户 ${userId} 触发限流，${result.retryAfter}ms 后重试`
      );
    }

    return result.allowed;
  }

  /**
   * 获取用户剩余操作次数
   */
  getRemainingActions(userId: string): number {
    const limiter = this.limiters.get(userId);
    if (!limiter) {
      return this.maxActions;
    }
    return this.maxActions - limiter.getRequestCount();
  }

  /**
   * 重置用户限流状态
   */
  reset(userId: string): void {
    const limiter = this.limiters.get(userId);
    if (limiter) {
      limiter.reset();
    }
  }
}

// 使用示例
const userLimiter = new UserActionLimiter(60000, 60); // 1 分钟 60 次

function handleUserAction(userId: string, action: string) {
  if (!userLimiter.check(userId)) {
    return {
      success: false,
      error: '操作过于频繁，请稍后再试',
    };
  }

  console.log(`✅ 用户 ${userId} 执行操作：${action}`);
  // 处理业务逻辑
  return { success: true };
}

// ============================================
// 示例 3: IP 地址防爬虫 (滑动窗口)
// ============================================

/**
 * IP 限流器
 * 防止爬虫和 DDoS 攻击
 */
export class IPRateLimiter {
  private limiters: Map<string, SlidingWindowLimiter>;
  private readonly cleanupInterval: NodeJS.Timeout;

  constructor() {
    this.limiters = new Map();
    
    // 每 5 分钟清理一次不活跃的 IP
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 300000);
  }

  /**
   * 检查 IP 请求
   */
  check(ip: string): boolean {
    if (!this.limiters.has(ip)) {
      // 10 秒内最多 20 次请求
      this.limiters.set(ip, createSlidingWindow(10000, 20));
    }

    const limiter = this.limiters.get(ip)!;
    return limiter.check().allowed;
  }

  /**
   * 获取 IP 当前请求数
   */
  getRequestCount(ip: string): number {
    const limiter = this.limiters.get(ip);
    return limiter ? limiter.getRequestCount() : 0;
  }

  /**
   * 清理不活跃的 IP
   */
  private cleanup(): void {
    const toDelete: string[] = [];

    for (const [ip, limiter] of this.limiters.entries()) {
      if (limiter.getRequestCount() === 0) {
        toDelete.push(ip);
      }
    }

    toDelete.forEach((ip) => this.limiters.delete(ip));
    console.log(`🧹 清理了 ${toDelete.length} 个不活跃的 IP`);
  }

  /**
   * 销毁限流器
   */
  destroy(): void {
    clearInterval(this.cleanupInterval);
    this.limiters.clear();
  }
}

// 使用示例
const ipLimiter = new IPRateLimiter();

function handleRequest(ip: string, path: string) {
  if (!ipLimiter.check(ip)) {
    const count = ipLimiter.getRequestCount(ip);
    console.warn(
      `🚫 IP ${ip} 请求过于频繁 (${count} 次), 访问路径：${path}`
    );
    return {
      status: 429,
      body: { error: 'Too Many Requests' },
    };
  }

  console.log(`✅ IP ${ip} 访问：${path}`);
  // 处理请求
  return { status: 200 };
}

// ============================================
// 示例 4: 分布式限流 (Redis)
// ============================================

/**
 * 分布式限流服务
 * 基于 Redis 实现多节点共享限流状态
 */
export class DistributedLimitService {
  private limiter: ReturnType<typeof createDistributedLimiter>;

  constructor(redisClient: any) {
    this.limiter = createDistributedLimiter(
      redisClient,
      60000, // 1 分钟
      100,   // 100 次请求
      'api:limit:'
    );
  }

  /**
   * 检查用户请求
   */
  async checkUser(userId: string): Promise<{
    allowed: boolean;
    remaining: number;
    resetTime: number;
    retryAfter?: number;
  }> {
    return this.limiter.check(`user:${userId}`);
  }

  /**
   * 检查 API 请求
   */
  async checkApi(apiKey: string): Promise<{
    allowed: boolean;
    remaining: number;
    resetTime: number;
    retryAfter?: number;
  }> {
    return this.limiter.check(`api:${apiKey}`);
  }

  /**
   * 检查 IP 请求
   */
  async checkIP(ip: string): Promise<{
    allowed: boolean;
    remaining: number;
    resetTime: number;
    retryAfter?: number;
  }> {
    return this.limiter.check(`ip:${ip}`);
  }

  /**
   * 重置用户限流状态
   */
  async resetUser(userId: string): Promise<void> {
    await this.limiter.reset(`user:${userId}`);
  }

  /**
   * 获取用户请求数
   */
  async getUserRequestCount(userId: string): Promise<number> {
    return this.limiter.getCount(`user:${userId}`);
  }
}

// 使用示例 (需要 Redis)
/*
import Redis from 'ioredis';

const redis = new Redis({
  host: 'localhost',
  port: 6379,
  password: 'your-password',
});

const distributedLimiter = new DistributedLimitService(redis);

// 在 Express 中间件中使用
app.use('/api', async (req, res, next) => {
  const userId = req.user?.id;
  const apiKey = req.headers['x-api-key'];
  
  let result;
  
  if (userId) {
    result = await distributedLimiter.checkUser(userId);
  } else if (apiKey) {
    result = await distributedLimiter.checkApi(apiKey as string);
  } else {
    result = await distributedLimiter.checkIP(req.ip);
  }
  
  res.setHeader('X-RateLimit-Remaining', result.remaining);
  res.setHeader('X-RateLimit-Reset', result.resetTime);
  
  if (!result.allowed) {
    res.setHeader('Retry-After', Math.ceil(result.retryAfter! / 1000));
    return res.status(429).json({
      error: 'Too Many Requests',
      retryAfter: result.retryAfter,
    });
  }
  
  next();
});
*/

// ============================================
// 示例 5: 组合限流策略
// ============================================

/**
 * 多层限流策略
 * 结合多种限流算法实现更精细的控制
 */
export class MultiLayerRateLimiter {
  private globalLimiter: SlidingWindowLimiter;      // 全局限流
  private userLimiter: Map<string, TokenBucketLimiter>; // 用户限流
  private ipLimiter: Map<string, SlidingWindowLimiter>; // IP 限流

  constructor() {
    // 全局限流：1 秒最多 1000 次请求
    this.globalLimiter = createSlidingWindow(1000, 1000);
    
    this.userLimiter = new Map();
    this.ipLimiter = new Map();
  }

  /**
   * 多层检查
   */
  check(userId: string, ip: string): {
    allowed: boolean;
    reason?: string;
    remaining: number;
  } {
    // 1. 全局检查
    const globalResult = this.globalLimiter.check();
    if (!globalResult.allowed) {
      return {
        allowed: false,
        reason: '系统繁忙，请稍后重试',
        remaining: 0,
      };
    }

    // 2. 用户检查
    if (!this.userLimiter.has(userId)) {
      this.userLimiter.set(userId, createTokenBucket(100, 10));
    }
    const userResult = this.userLimiter.get(userId)!.acquire();
    if (!userResult.allowed) {
      return {
        allowed: false,
        reason: '您的操作过于频繁',
        remaining: userResult.remaining,
      };
    }

    // 3. IP 检查
    if (!this.ipLimiter.has(ip)) {
      this.ipLimiter.set(ip, createSlidingWindow(10000, 50));
    }
    const ipResult = this.ipLimiter.get(ip)!.check();
    if (!ipResult.allowed) {
      return {
        allowed: false,
        reason: 'IP 请求频率过高',
        remaining: 0,
      };
    }

    return {
      allowed: true,
      remaining: userResult.remaining,
    };
  }
}

// 使用示例
const multiLimiter = new MultiLayerRateLimiter();

function handleRequestWithMultiLayer(userId: string, ip: string) {
  const result = multiLimiter.check(userId, ip);
  
  if (!result.allowed) {
    console.log(`❌ 请求被拒绝：${result.reason}`);
    return { status: 429, error: result.reason };
  }
  
  console.log(`✅ 请求通过，剩余配额：${result.remaining}`);
  return { status: 200 };
}

// ============================================
// 示例 6: WebSocket 消息限流
// ============================================

/**
 * WebSocket 消息限流器
 * 防止消息洪水攻击
 */
export class WebSocketRateLimiter {
  private limiters: Map<string, TokenBucketLimiter>;

  constructor() {
    this.limiters = new Map();
  }

  /**
   * 检查消息是否允许发送
   */
  checkMessage(sessionId: string, messageSize: number = 1): boolean {
    if (!this.limiters.has(sessionId)) {
      // 每秒 10 条消息，允许突发到 20 条
      this.limiters.set(sessionId, createTokenBucket(20, 10));
    }

    const limiter = this.limiters.get(sessionId)!;
    return limiter.tryAcquire(messageSize);
  }

  /**
   * 消耗令牌
   */
  consume(sessionId: string, tokens: number = 1): void {
    const limiter = this.limiters.get(sessionId);
    if (limiter) {
      limiter.acquire(tokens);
    }
  }

  /**
   * 会话断开时清理
   */
  cleanup(sessionId: string): void {
    this.limiters.delete(sessionId);
  }
}

// 使用示例
const wsLimiter = new WebSocketRateLimiter();

/*
wss.on('connection', (ws, req) => {
  const sessionId = getSessionId(req);

  ws.on('message', (data) => {
    if (!wsLimiter.checkMessage(sessionId)) {
      ws.send(JSON.stringify({
        type: 'error',
        message: '消息发送过于频繁',
      }));
      return;
    }

    wsLimiter.consume(sessionId);
    // 处理消息
  });

  ws.on('close', () => {
    wsLimiter.cleanup(sessionId);
  });
});
*/

// ============================================
// 运行示例
// ============================================

if (require.main === module) {
  console.log('=== 限流工具 - 使用示例 ===\n');

  // 示例 1: API 限流
  console.log('1️⃣ API 限流示例:');
  handleApiRequest('test-api-key');
  handleApiRequest('test-api-key');
  handleApiRequest('test-api-key');

  // 示例 2: 用户操作限流
  console.log('\n2️⃣ 用户操作限流示例:');
  handleUserAction('user-123', '点赞');
  handleUserAction('user-123', '评论');
  handleUserAction('user-123', '分享');

  // 示例 3: IP 限流
  console.log('\n3️⃣ IP 限流示例:');
  handleRequest('192.168.1.1', '/api/data');
  handleRequest('192.168.1.1', '/api/users');
  handleRequest('192.168.1.1', '/api/posts');

  // 示例 4: 多层限流
  console.log('\n4️⃣ 多层限流示例:');
  handleRequestWithMultiLayer('user-456', '192.168.1.2');
  handleRequestWithMultiLayer('user-456', '192.168.1.2');
  handleRequestWithMultiLayer('user-456', '192.168.1.2');

  console.log('\n✅ 所有示例完成!\n');
}
