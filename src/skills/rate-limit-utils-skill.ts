/**
 * 速率限制工具包 (Rate Limit Utils)
 * 
 * 功能:
 * 1. Token Bucket 算法 - 令牌桶限流
 * 2. Sliding Window 算法 - 滑动窗口限流
 * 3. 分布式限流 - 基于 Redis 的分布式限流
 * 
 * @author Axon
 * @date 2026-03-13
 */

// ==================== 类型定义 ====================

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfter?: number;
}

export interface TokenBucketOptions {
  capacity: number;      // 桶容量 (最大令牌数)
  refillRate: number;    // 补充速率 (令牌/秒)
  refillInterval?: number; // 补充间隔 (毫秒), 默认 1000ms
}

export interface SlidingWindowOptions {
  windowSize: number;    // 窗口大小 (毫秒)
  maxRequests: number;   // 窗口内最大请求数
}

export interface DistributedRateLimitOptions {
  key: string;           // 限流键 (如用户 ID、IP 等)
  windowSize: number;    // 窗口大小 (毫秒)
  maxRequests: number;   // 窗口内最大请求数
  redisClient: any;      // Redis 客户端实例
}

// ==================== Token Bucket 算法 ====================

/**
 * Token Bucket 令牌桶算法实现
 * 
 * 原理:
 * - 固定容量的桶，按固定速率生成令牌
 * - 请求消耗令牌，桶空则拒绝
 * - 允许突发流量 (只要有令牌)
 */
export class TokenBucket {
  private capacity: number;
  private tokens: number;
  private refillRate: number;
  private refillInterval: number;
  private lastRefill: number;

  constructor(options: TokenBucketOptions) {
    this.capacity = options.capacity;
    this.tokens = options.capacity;
    this.refillRate = options.refillRate;
    this.refillInterval = options.refillInterval ?? 1000;
    this.lastRefill = Date.now();
  }

  /**
   * 补充令牌
   */
  private refill(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    const tokensToAdd = (elapsed / this.refillInterval) * this.refillRate;
    
    this.tokens = Math.min(this.capacity, this.tokens + tokensToAdd);
    this.lastRefill = now;
  }

  /**
   * 尝试获取令牌
   * @param tokens 需要的令牌数 (默认 1)
   */
  async acquire(tokens: number = 1): Promise<RateLimitResult> {
    this.refill();

    if (this.tokens >= tokens) {
      this.tokens -= tokens;
      return {
        allowed: true,
        remaining: Math.floor(this.tokens),
        resetAt: Date.now() + this.refillInterval,
      };
    }

    // 计算等待时间
    const tokensNeeded = tokens - this.tokens;
    const waitTime = (tokensNeeded / this.refillRate) * this.refillInterval;

    return {
      allowed: false,
      remaining: 0,
      resetAt: Date.now() + Math.ceil(waitTime),
      retryAfter: Math.ceil(waitTime / 1000),
    };
  }

  /**
   * 获取当前令牌数
   */
  getTokens(): number {
    this.refill();
    return Math.floor(this.tokens);
  }

  /**
   * 重置桶状态
   */
  reset(): void {
    this.tokens = this.capacity;
    this.lastRefill = Date.now();
  }
}

// ==================== Sliding Window 算法 ====================

/**
 * Sliding Window 滑动窗口算法实现
 * 
 * 原理:
 * - 维护一个时间窗口内的请求记录
 * - 窗口滑动，过期请求被移除
 * - 精确控制任意时间段内的请求数
 */
export class SlidingWindow {
  private windowSize: number;
  private maxRequests: number;
  private requests: number[];

  constructor(options: SlidingWindowOptions) {
    this.windowSize = options.windowSize;
    this.maxRequests = options.maxRequests;
    this.requests = [];
  }

  /**
   * 清理过期请求
   */
  private cleanup(): void {
    const now = Date.now();
    const cutoff = now - this.windowSize;
    this.requests = this.requests.filter(timestamp => timestamp > cutoff);
  }

  /**
   * 尝试添加请求
   */
  async acquire(): Promise<RateLimitResult> {
    this.cleanup();

    if (this.requests.length < this.maxRequests) {
      this.requests.push(Date.now());
      return {
        allowed: true,
        remaining: this.maxRequests - this.requests.length,
        resetAt: Date.now() + this.windowSize,
      };
    }

    // 计算最早请求的过期时间
    const oldestRequest = this.requests[0];
    const resetAt = oldestRequest + this.windowSize;
    const retryAfter = Math.ceil((resetAt - Date.now()) / 1000);

    return {
      allowed: false,
      remaining: 0,
      resetAt,
      retryAfter: Math.max(0, retryAfter),
    };
  }

  /**
   * 获取当前窗口内的请求数
   */
  getRequestCount(): number {
    this.cleanup();
    return this.requests.length;
  }

  /**
   * 重置窗口
   */
  reset(): void {
    this.requests = [];
  }
}

// ==================== 分布式限流 (Redis) ====================

/**
 * 分布式限流器 (基于 Redis)
 * 
 * 原理:
 * - 使用 Redis 原子操作保证分布式一致性
 * - 支持多节点共享限流状态
 * - 适用于集群环境
 */
export class DistributedRateLimiter {
  private key: string;
  private windowSize: number;
  private maxRequests: number;
  private redisClient: any;

  constructor(options: DistributedRateLimitOptions) {
    this.key = `rate_limit:${options.key}`;
    this.windowSize = options.windowSize;
    this.maxRequests = options.maxRequests;
    this.redisClient = options.redisClient;
  }

  /**
   * 尝试获取限流许可 (使用 Redis INCR + EXPIRE)
   */
  async acquire(): Promise<RateLimitResult> {
    const now = Date.now();
    const windowKey = `${this.key}:${Math.floor(now / this.windowSize)}`;

    try {
      // 原子操作: 递增计数
      const current = await this.redisClient.incr(windowKey);
      
      // 如果是第一个请求，设置过期时间
      if (current === 1) {
        await this.redisClient.pexpire(windowKey, this.windowSize);
      }

      const resetAt = (Math.floor(now / this.windowSize) + 1) * this.windowSize;
      const remaining = Math.max(0, this.maxRequests - current);

      if (current <= this.maxRequests) {
        return {
          allowed: true,
          remaining,
          resetAt,
        };
      }

      return {
        allowed: false,
        remaining: 0,
        resetAt,
        retryAfter: Math.ceil((resetAt - now) / 1000),
      };
    } catch (error) {
      // Redis 故障时降级为允许 (fail-open 策略)
      console.error('[DistributedRateLimiter] Redis error:', error);
      return {
        allowed: true,
        remaining: this.maxRequests,
        resetAt: now + this.windowSize,
      };
    }
  }

  /**
   * 使用 Lua 脚本的原子限流 (更精确)
   */
  async acquireWithLua(): Promise<RateLimitResult> {
    const luaScript = `
      local key = KEYS[1]
      local limit = tonumber(ARGV[1])
      local window = tonumber(ARGV[2])
      local now = tonumber(ARGV[3])
      
      local current = redis.call('INCR', key)
      
      if current == 1 then
        redis.call('PEXPIRE', key, window)
      end
      
      local ttl = redis.call('PTTL', key)
      
      if current <= limit then
        return {1, limit - current, ttl}
      else
        return {0, 0, ttl}
      end
    `;

    try {
      const now = Date.now();
      const windowKey = `${this.key}:${Math.floor(now / this.windowSize)}`;
      
      const result = await this.redisClient.eval(
        luaScript,
        1,
        windowKey,
        this.maxRequests,
        this.windowSize,
        now
      );

      const [allowed, remaining, ttl] = result;
      const resetAt = now + ttl;

      return {
        allowed: allowed === 1,
        remaining,
        resetAt,
        retryAfter: allowed ? undefined : Math.ceil(ttl / 1000),
      };
    } catch (error) {
      console.error('[DistributedRateLimiter] Lua script error:', error);
      return {
        allowed: true,
        remaining: this.maxRequests,
        resetAt: Date.now() + this.windowSize,
      };
    }
  }

  /**
   * 重置限流状态
   */
  async reset(): Promise<void> {
    const pattern = `${this.key}:*`;
    const keys = await this.redisClient.keys(pattern);
    
    if (keys.length > 0) {
      await this.redisClient.del(...keys);
    }
  }
}

// ==================== 工厂函数 ====================

/**
 * 创建 Token Bucket 限流器
 */
export function createTokenBucket(options: TokenBucketOptions): TokenBucket {
  return new TokenBucket(options);
}

/**
 * 创建 Sliding Window 限流器
 */
export function createSlidingWindow(options: SlidingWindowOptions): SlidingWindow {
  return new SlidingWindow(options);
}

/**
 * 创建分布式限流器
 */
export function createDistributedRateLimiter(
  options: DistributedRateLimitOptions
): DistributedRateLimiter {
  return new DistributedRateLimiter(options);
}

// ==================== 使用示例 ====================

/**
 * 使用示例代码
 * 
 * 运行方式: npx ts-node src/skills/rate-limit-utils-skill.ts
 */
async function runExamples() {
  console.log('='.repeat(60));
  console.log('🚀 速率限制工具 - 使用示例');
  console.log('='.repeat(60));

  // ────────────────────────────────────────────────────────
  // 示例 1: Token Bucket 算法
  // ────────────────────────────────────────────────────────
  console.log('\n📦 示例 1: Token Bucket 令牌桶算法');
  console.log('-'.repeat(60));

  const bucket = createTokenBucket({
    capacity: 10,        // 最多 10 个令牌
    refillRate: 2,       // 每秒补充 2 个令牌
  });

  console.log(`初始令牌数：${bucket.getTokens()}`);

  // 模拟 12 次请求
  for (let i = 1; i <= 12; i++) {
    const result = await bucket.acquire();
    console.log(
      `请求 ${i}: ${result.allowed ? '✅ 允许' : '❌ 拒绝'} | ` +
      `剩余：${result.remaining} | ` +
      `${result.retryAfter ? `重试：${result.retryAfter}s` : ''}`
    );
  }

  // 等待令牌补充
  console.log('\n⏳ 等待 2 秒让令牌补充...');
  await new Promise(resolve => setTimeout(resolve, 2000));
  console.log(`补充后令牌数：${bucket.getTokens()}`);

  // ────────────────────────────────────────────────────────
  // 示例 2: Sliding Window 算法
  // ────────────────────────────────────────────────────────
  console.log('\n\n📊 示例 2: Sliding Window 滑动窗口算法');
  console.log('-'.repeat(60));

  const window = createSlidingWindow({
    windowSize: 5000,    // 5 秒窗口
    maxRequests: 5,      // 最多 5 个请求
  });

  console.log(`窗口大小：5 秒 | 最大请求数：5`);

  // 模拟 7 次请求
  for (let i = 1; i <= 7; i++) {
    const result = await window.acquire();
    console.log(
      `请求 ${i}: ${result.allowed ? '✅ 允许' : '❌ 拒绝'} | ` +
      `剩余：${result.remaining} | ` +
      `${result.retryAfter ? `重试：${result.retryAfter}s` : ''}`
    );
  }

  // ────────────────────────────────────────────────────────
  // 示例 3: 分布式限流 (需要 Redis)
  // ────────────────────────────────────────────────────────
  console.log('\n\n🌐 示例 3: 分布式限流 (Redis)');
  console.log('-'.repeat(60));

  // 模拟 Redis 客户端 (实际使用时替换为真实 Redis 客户端)
  const mockRedis = {
    store: new Map<string, { value: number; expiry: number }>(),
    
    async incr(key: string): Promise<number> {
      const item = this.store.get(key);
      if (!item || Date.now() > item.expiry) {
        this.store.set(key, { value: 1, expiry: Date.now() + 60000 });
        return 1;
      }
      item.value++;
      return item.value;
    },
    
    async pexpire(key: string, ms: number): Promise<void> {
      const item = this.store.get(key);
      if (item) {
        item.expiry = Date.now() + ms;
      }
    },
    
    async keys(pattern: string): Promise<string[]> {
      const prefix = pattern.replace('*', '');
      return Array.from(this.store.keys()).filter(k => k.startsWith(prefix));
    },
    
    async del(...keys: string[]): Promise<void> {
      keys.forEach(k => this.store.delete(k));
    },
    
    async eval(_script: string, _numKeys: number, ...args: any[]): Promise<any[]> {
      // 简化版 Lua 脚本模拟
      const key = args[0];
      const limit = args[1];
      const current = await this.incr(key);
      await this.pexpire(key, args[3]);
      const ttl = 5000;
      return current <= limit ? [1, limit - current, ttl] : [0, 0, ttl];
    },
  };

  const distributed = createDistributedRateLimiter({
    key: 'user:123',
    windowSize: 5000,
    maxRequests: 5,
    redisClient: mockRedis,
  });

  console.log(`限流键：user:123 | 窗口：5 秒 | 最大：5 请求`);

  // 模拟 7 次请求
  for (let i = 1; i <= 7; i++) {
    const result = await distributed.acquire();
    console.log(
      `请求 ${i}: ${result.allowed ? '✅ 允许' : '❌ 拒绝'} | ` +
      `剩余：${result.remaining}`
    );
  }

  // ────────────────────────────────────────────────────────
  // 示例 4: 实际应用场景 - API 限流中间件
  // ────────────────────────────────────────────────────────
  console.log('\n\n🔧 示例 4: API 限流中间件 (伪代码)');
  console.log('-'.repeat(60));

  const apiLimiter = createTokenBucket({
    capacity: 100,
    refillRate: 10,
  });

  console.log(`
// Express.js 中间件示例:
app.use('/api', async (req, res, next) => {
  const result = await apiLimiter.acquire();
  
  if (!result.allowed) {
    res.set('Retry-After', result.retryAfter?.toString() || '1');
    return res.status(429).json({
      error: 'Too Many Requests',
      retryAfter: result.retryAfter,
    });
  }
  
  res.set('X-RateLimit-Remaining', result.remaining.toString());
  next();
});
  `);

  // ────────────────────────────────────────────────────────
  // 总结
  // ────────────────────────────────────────────────────────
  console.log('\n' + '='.repeat(60));
  console.log('✅ 所有示例执行完成');
  console.log('='.repeat(60));
  console.log(`
📋 算法选择指南:

1. Token Bucket (令牌桶)
   ✓ 允许突发流量
   ✓ 平滑限流
   ✓ 适合 API 限流、用户请求限流

2. Sliding Window (滑动窗口)
   ✓ 精确控制时间段内请求数
   ✓ 无边界问题
   ✓ 适合严格限流场景

3. Distributed Rate Limiter (分布式限流)
   ✓ 多节点共享状态
   ✓ 集群环境必备
   ✓ 需要 Redis 支持
  `);
}

// 如果直接运行此文件，执行示例
if (require.main === module) {
  runExamples().catch(console.error);
}
