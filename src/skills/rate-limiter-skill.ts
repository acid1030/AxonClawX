/**
 * 限流工具技能 - Axon
 * 
 * 提供三种经典限流算法：
 * 1. 令牌桶算法 (Token Bucket) - 允许突发流量
 * 2. 滑动窗口算法 (Sliding Window) - 精确控制速率
 * 3. 分布式限流 (Distributed Rate Limiter) - 基于 Redis 的多节点限流
 * 
 * @module rate-limiter-skill
 */

// ============================================
// 类型定义
// ============================================

/**
 * 限流结果
 */
export interface RateLimitResult {
  /** 是否允许通过 */
  allowed: boolean;
  /** 剩余可用数量 */
  remaining: number;
  /** 重置时间戳 (毫秒) */
  resetTime: number;
  /** 重试等待时间 (毫秒) */
  retryAfter?: number;
}

/**
 * 令牌桶配置
 */
export interface TokenBucketOptions {
  /** 桶容量 (最大令牌数) */
  capacity: number;
  /** 令牌补充速率 (个/秒) */
  refillRate: number;
  /** 初始令牌数，默认为容量 */
  initialTokens?: number;
}

/**
 * 滑动窗口配置
 */
export interface SlidingWindowOptions {
  /** 窗口大小 (毫秒) */
  windowSize: number;
  /** 窗口内最大请求数 */
  maxRequests: number;
}

/**
 * 分布式限流配置
 */
export interface DistributedRateLimiterOptions {
  /** Redis 客户端实例 */
  redisClient: RedisClient;
  /** 限流键名前缀 */
  keyPrefix?: string;
  /** 窗口大小 (毫秒) */
  windowSize: number;
  /** 窗口内最大请求数 */
  maxRequests: number;
}

/**
 * Redis 客户端接口 (简化版)
 */
export interface RedisClient {
  /** 执行 Lua 脚本 */
  eval(script: string, keys: string[], args: string[]): Promise<any>;
  /** 获取值 */
  get(key: string): Promise<string | null>;
  /** 设置值 */
  set(key: string, value: string, options?: { EX?: number; PX?: number; NX?: boolean }): Promise<boolean>;
}

// ============================================
// 1. 令牌桶算法 (Token Bucket)
// ============================================

/**
 * 令牌桶限流器类
 * 
 * 算法原理:
 * - 维护一个固定容量的桶，按固定速率产生令牌
 * - 请求到来时消耗令牌，无令牌则拒绝
 * - 允许突发流量 (最多消耗桶内所有令牌)
 * 
 * 适用场景:
 * - API 网关限流
 * - 允许适度突发的场景
 * - 需要平滑流量峰值的场景
 * 
 * @example
 * const limiter = new TokenBucketLimiter({ capacity: 10, refillRate: 2 });
 * 
 * // 尝试消耗 1 个令牌
 * const result = limiter.acquire();
 * if (result.allowed) {
 *   console.log('请求通过，剩余令牌:', result.remaining);
 * } else {
 *   console.log('请求被限流，等待:', result.retryAfter, 'ms');
 * }
 * 
 * // 批量获取令牌
 * const bulkResult = limiter.acquire(5);
 */
export class TokenBucketLimiter {
  private capacity: number;
  private refillRate: number; // 令牌/秒
  private tokens: number;
  private lastRefillTime: number;

  constructor(options: TokenBucketOptions) {
    const { capacity, refillRate, initialTokens } = options;
    
    if (capacity <= 0) {
      throw new Error('Token bucket capacity must be greater than 0');
    }
    if (refillRate <= 0) {
      throw new Error('Refill rate must be greater than 0');
    }

    this.capacity = capacity;
    this.refillRate = refillRate;
    this.tokens = initialTokens ?? capacity;
    this.lastRefillTime = Date.now();
  }

  /**
   * 补充令牌 (内部方法)
   */
  private refill(): void {
    const now = Date.now();
    const elapsed = (now - this.lastRefillTime) / 1000; // 转换为秒
    const tokensToAdd = elapsed * this.refillRate;
    
    this.tokens = Math.min(this.capacity, this.tokens + tokensToAdd);
    this.lastRefillTime = now;
  }

  /**
   * 获取令牌
   * 
   * @param tokensNeeded - 需要的令牌数量，默认为 1
   * @returns 限流结果
   */
  acquire(tokensNeeded: number = 1): RateLimitResult {
    if (tokensNeeded <= 0) {
      throw new Error('Tokens needed must be greater than 0');
    }

    this.refill();

    if (this.tokens >= tokensNeeded) {
      this.tokens -= tokensNeeded;
      return {
        allowed: true,
        remaining: Math.floor(this.tokens),
        resetTime: Date.now() + Math.ceil((this.capacity - this.tokens) / this.refillRate * 1000),
      };
    } else {
      // 计算需要等待的时间
      const tokensDeficit = tokensNeeded - this.tokens;
      const waitTime = Math.ceil(tokensDeficit / this.refillRate * 1000);
      
      return {
        allowed: false,
        remaining: Math.floor(this.tokens),
        resetTime: Date.now() + waitTime,
        retryAfter: waitTime,
      };
    }
  }

  /**
   * 尝试获取令牌 (不实际消耗)
   * 
   * @param tokensNeeded - 需要的令牌数量
   * @returns 是否足够
   */
  tryAcquire(tokensNeeded: number = 1): boolean {
    this.refill();
    return this.tokens >= tokensNeeded;
  }

  /**
   * 获取当前可用令牌数
   */
  getAvailableTokens(): number {
    this.refill();
    return Math.floor(this.tokens);
  }

  /**
   * 重置限流器
   */
  reset(): void {
    this.tokens = this.capacity;
    this.lastRefillTime = Date.now();
  }
}

// ============================================
// 2. 滑动窗口算法 (Sliding Window)
// ============================================

/**
 * 滑动窗口限流器类
 * 
 * 算法原理:
 * - 维护一个时间窗口，记录窗口内的请求时间戳
 * - 请求到来时移除过期请求，检查窗口内请求数
 * - 超出限制则拒绝
 * 
 * 适用场景:
 * - 精确控制请求速率
 * - 防止固定窗口边界问题
 * - 需要严格限流的场景
 * 
 * @example
 * const limiter = new SlidingWindowLimiter({ windowSize: 60000, maxRequests: 100 });
 * 
 * // 检查请求
 * const result = limiter.check();
 * if (result.allowed) {
 *   console.log('请求通过，剩余配额:', result.remaining);
 * } else {
 *   console.log('请求被限流，等待:', result.retryAfter, 'ms');
 * }
 * 
 * // 批量检查
 * for (let i = 0; i < 10; i++) {
 *   limiter.check();
 * }
 */
export class SlidingWindowLimiter {
  private windowSize: number; // 毫秒
  private maxRequests: number;
  private requests: number[]; // 存储请求时间戳

  constructor(options: SlidingWindowOptions) {
    const { windowSize, maxRequests } = options;
    
    if (windowSize <= 0) {
      throw new Error('Window size must be greater than 0');
    }
    if (maxRequests <= 0) {
      throw new Error('Max requests must be greater than 0');
    }

    this.windowSize = windowSize;
    this.maxRequests = maxRequests;
    this.requests = [];
  }

  /**
   * 清理过期请求
   */
  private cleanup(): void {
    const now = Date.now();
    const windowStart = now - this.windowSize;
    
    // 移除窗口外的请求
    while (this.requests.length > 0 && this.requests[0] < windowStart) {
      this.requests.shift();
    }
  }

  /**
   * 检查并记录请求
   * 
   * @returns 限流结果
   */
  check(): RateLimitResult {
    this.cleanup();

    const now = Date.now();
    const remaining = this.maxRequests - this.requests.length;

    if (this.requests.length < this.maxRequests) {
      this.requests.push(now);
      return {
        allowed: true,
        remaining: remaining - 1,
        resetTime: now + this.windowSize,
      };
    } else {
      // 计算最早请求的过期时间
      const oldestRequest = this.requests[0];
      const waitTime = oldestRequest + this.windowSize - now;
      
      return {
        allowed: false,
        remaining: 0,
        resetTime: oldestRequest + this.windowSize,
        retryAfter: Math.max(0, waitTime),
      };
    }
  }

  /**
   * 获取当前窗口内的请求数
   */
  getRequestCount(): number {
    this.cleanup();
    return this.requests.length;
  }

  /**
   * 重置限流器
   */
  reset(): void {
    this.requests = [];
  }

  /**
   * 获取窗口配置信息
   */
  getConfig(): { windowSize: number; maxRequests: number } {
    return {
      windowSize: this.windowSize,
      maxRequests: this.maxRequests,
    };
  }
}

// ============================================
// 3. 分布式限流 (Distributed Rate Limiter)
// ============================================

/**
 * 分布式限流器类 (基于 Redis)
 * 
 * 算法原理:
 * - 使用 Redis Lua 脚本实现原子操作
 * - 滑动窗口计数，支持多节点共享限流状态
 * - 避免分布式环境下的竞态条件
 * 
 * 适用场景:
 * - 多服务器集群限流
 * - 微服务架构下的全局限流
 * - 需要精确分布式计数的场景
 * 
 * @example
 * const limiter = new DistributedRateLimiter({
 *   redisClient: redis,
 *   keyPrefix: 'api:limit:',
 *   windowSize: 60000, // 1 分钟
 *   maxRequests: 100,
 * });
 * 
 * // 检查用户请求
 * const result = await limiter.check('user:123');
 * if (result.allowed) {
 *   console.log('请求通过');
 * } else {
 *   console.log('请求被限流');
 * }
 * 
 * // 检查 IP 请求
 * const ipResult = await limiter.check('ip:192.168.1.1');
 */
export class DistributedRateLimiter {
  private redisClient: RedisClient;
  private keyPrefix: string;
  private windowSize: number;
  private maxRequests: number;

  // Lua 脚本：原子性地检查并增加计数
  private static readonly LUA_SCRIPT = `
    local key = KEYS[1]
    local windowSize = tonumber(ARGV[1])
    local maxRequests = tonumber(ARGV[2])
    local now = tonumber(ARGV[3])
    
    -- 移除窗口外的请求
    local windowStart = now - windowSize
    redis.call('ZREMRANGEBYSCORE', key, '-inf', windowStart)
    
    -- 获取当前窗口内的请求数
    local currentCount = redis.call('ZCARD', key)
    
    if currentCount < maxRequests then
      -- 添加新请求
      redis.call('ZADD', key, now, now .. '-' .. math.random())
      redis.call('PEXPIRE', key, windowSize)
      return {1, maxRequests - currentCount - 1, now + windowSize}
    else
      -- 获取最早请求的时间
      local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
      local retryAfter = 0
      if oldest and #oldest >= 2 then
        retryAfter = tonumber(oldest[2]) + windowSize - now
      end
      return {0, 0, now + retryAfter, retryAfter}
    end
  `;

  constructor(options: DistributedRateLimiterOptions) {
    const { redisClient, keyPrefix = 'ratelimit:', windowSize, maxRequests } = options;
    
    if (!redisClient) {
      throw new Error('Redis client is required');
    }
    if (windowSize <= 0) {
      throw new Error('Window size must be greater than 0');
    }
    if (maxRequests <= 0) {
      throw new Error('Max requests must be greater than 0');
    }

    this.redisClient = redisClient;
    this.keyPrefix = keyPrefix;
    this.windowSize = windowSize;
    this.maxRequests = maxRequests;
  }

  /**
   * 检查并记录请求
   * 
   * @param identifier - 限流标识 (如用户 ID、IP 地址等)
   * @returns 限流结果
   */
  async check(identifier: string): Promise<RateLimitResult> {
    const key = `${this.keyPrefix}${identifier}`;
    const now = Date.now();

    try {
      const result = await this.redisClient.eval(
        DistributedRateLimiter.LUA_SCRIPT,
        [key],
        [
          this.windowSize.toString(),
          this.maxRequests.toString(),
          now.toString(),
        ]
      );

      const [allowed, remaining, resetTime, retryAfter] = result;

      return {
        allowed: allowed === 1,
        remaining: parseInt(remaining, 10),
        resetTime: parseInt(resetTime, 10),
        retryAfter: retryAfter ? parseInt(retryAfter, 10) : undefined,
      };
    } catch (error) {
      // Redis 故障时的降级策略：允许通过但记录错误
      console.error('[DistributedRateLimiter] Redis error:', error);
      return {
        allowed: true,
        remaining: this.maxRequests,
        resetTime: now + this.windowSize,
      };
    }
  }

  /**
   * 重置指定标识的限流状态
   * 
   * @param identifier - 限流标识
   */
  async reset(identifier: string): Promise<void> {
    const key = `${this.keyPrefix}${identifier}`;
    await this.redisClient.eval(
      'redis.call("DEL", KEYS[1])',
      [key],
      []
    );
  }

  /**
   * 获取指定标识的当前请求数
   * 
   * @param identifier - 限流标识
   * @returns 请求数
   */
  async getCount(identifier: string): Promise<number> {
    const key = `${this.keyPrefix}${identifier}`;
    const now = Date.now();
    const windowStart = now - this.windowSize;

    // 先清理过期数据
    await this.redisClient.eval(
      'redis.call("ZREMRANGEBYSCORE", KEYS[1], "-inf", ARGV[1])',
      [key],
      [windowStart.toString()]
    );

    // 获取计数 (需要 Redis ZCARD 命令)
    const count = await this.redisClient.eval(
      'return redis.call("ZCARD", KEYS[1])',
      [key],
      []
    );

    return parseInt(count, 10);
  }
}

// ============================================
// 工厂函数：创建限流器
// ============================================

/**
 * 创建令牌桶限流器
 * 
 * @param capacity - 桶容量
 * @param refillRate - 补充速率 (个/秒)
 * @param initialTokens - 初始令牌数
 * @returns 令牌桶限流器实例
 * 
 * @example
 * const limiter = createTokenBucket(10, 2); // 10 个令牌，每秒 2 个
 */
export function createTokenBucket(
  capacity: number,
  refillRate: number,
  initialTokens?: number
): TokenBucketLimiter {
  return new TokenBucketLimiter({ capacity, refillRate, initialTokens });
}

/**
 * 创建滑动窗口限流器
 * 
 * @param windowSize - 窗口大小 (毫秒)
 * @param maxRequests - 最大请求数
 * @returns 滑动窗口限流器实例
 * 
 * @example
 * const limiter = createSlidingWindow(60000, 100); // 1 分钟内最多 100 次请求
 */
export function createSlidingWindow(
  windowSize: number,
  maxRequests: number
): SlidingWindowLimiter {
  return new SlidingWindowLimiter({ windowSize, maxRequests });
}

/**
 * 创建分布式限流器
 * 
 * @param redisClient - Redis 客户端
 * @param windowSize - 窗口大小 (毫秒)
 * @param maxRequests - 最大请求数
 * @param keyPrefix - 键名前缀
 * @returns 分布式限流器实例
 * 
 * @example
 * const limiter = createDistributedLimiter(redis, 60000, 100);
 */
export function createDistributedLimiter(
  redisClient: RedisClient,
  windowSize: number,
  maxRequests: number,
  keyPrefix: string = 'ratelimit:'
): DistributedRateLimiter {
  return new DistributedRateLimiter({
    redisClient,
    keyPrefix,
    windowSize,
    maxRequests,
  });
}

// ============================================
// 使用示例
// ============================================

if (require.main === module) {
  console.log('=== 限流工具技能 - 使用示例 ===\n');

  // 1. 令牌桶算法示例
  console.log('1️⃣ 令牌桶算法 (Token Bucket):');
  console.log('   配置：容量=10, 补充速率=2 个/秒\n');
  
  const tokenBucket = createTokenBucket(10, 2);
  
  console.log('   连续请求 5 次:');
  for (let i = 1; i <= 5; i++) {
    const result = tokenBucket.acquire();
    console.log(
      `   请求 ${i}: ${result.allowed ? '✅ 通过' : '❌ 拒绝'}, 剩余令牌: ${result.remaining}`
    );
  }
  
  console.log('\n   等待 2 秒后再次请求:');
  setTimeout(() => {
    const result = tokenBucket.acquire();
    console.log(
      `   请求: ${result.allowed ? '✅ 通过' : '❌ 拒绝'}, 剩余令牌: ${result.remaining}`
    );
    
    // 2. 滑动窗口算法示例
    console.log('\n2️⃣ 滑动窗口算法 (Sliding Window):');
    console.log('   配置：窗口=5 秒，最大请求=3 次\n');
    
    const slidingWindow = createSlidingWindow(5000, 3);
    
    console.log('   连续请求 5 次:');
    for (let i = 1; i <= 5; i++) {
      const result = slidingWindow.check();
      if (result.allowed) {
        console.log(
          `   请求 ${i}: ✅ 通过, 剩余配额: ${result.remaining}`
        );
      } else {
        console.log(
          `   请求 ${i}: ❌ 拒绝, 等待: ${result.retryAfter}ms`
        );
      }
    }
    
    console.log('\n   ⏳ 等待窗口滑动...');
    setTimeout(() => {
      const result = slidingWindow.check();
      console.log(
        `   新请求: ${result.allowed ? '✅ 通过' : '❌ 拒绝'}, 剩余配额: ${result.remaining}`
      );
      
      console.log('\n3️⃣ 分布式限流 (Distributed Rate Limiter):');
      console.log('   需要 Redis 环境，此处展示伪代码示例:\n');
      console.log(`   const redis = new Redis();
   const limiter = createDistributedLimiter(redis, 60000, 100);
   
   // 检查用户请求
   const result = await limiter.check('user:123');
   if (result.allowed) {
     console.log('请求通过');
   } else {
     console.log('请求被限流，等待:', result.retryAfter, 'ms');
   }`);
      
      console.log('\n✅ 所有示例完成!\n');
    }, 5100);
  }, 2000);
}
