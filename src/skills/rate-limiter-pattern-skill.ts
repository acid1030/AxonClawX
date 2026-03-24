/**
 * 限流器模式工具技能 - KAEL
 * 
 * 功能:
 * 1. 限流算法 - Token Bucket, Sliding Window, Leaky Bucket, Fixed Window
 * 2. 分布式限流 - Redis -backed 限流器
 * 3. 动态配置 - 运行时调整限流参数
 * 
 * @module skills/rate-limiter-pattern
 */

// ==================== 类型定义 ====================

/**
 * 限流器配置接口
 */
export interface RateLimiterConfig {
  /** 限流窗口大小 (毫秒) */
  windowMs: number;
  /** 窗口内最大请求数 */
  maxRequests: number;
  /** 限流算法类型 */
  algorithm: 'token-bucket' | 'sliding-window' | 'leaky-bucket' | 'fixed-window';
  /** 是否启用突发流量 (仅 token-bucket) */
  allowBurst?: boolean;
  /** 令牌补充速率 (tokens/ms, 仅 token-bucket) */
  refillRate?: number;
}

/**
 * 限流结果接口
 */
export interface RateLimitResult {
  /** 是否允许通过 */
  allowed: boolean;
  /** 剩余请求数 */
  remaining: number;
  /** 重置时间戳 (毫秒) */
  resetTime: number;
  /** 重试等待时间 (毫秒，仅在限流时) */
  retryAfter?: number;
  /** 当前使用量 */
  used: number;
}

/**
 * 限流器状态接口
 */
export interface RateLimiterState {
  /** 限流器标识 */
  key: string;
  /** 当前状态 */
  state: RateLimitResult;
  /** 配置信息 */
  config: RateLimiterConfig;
}

// ==================== Token Bucket 限流器 ====================

/**
 * Token Bucket 限流器
 * 
 * 原理:
 * - 固定容量的桶，以恒定速率产生令牌
 * - 请求消耗令牌，无令牌时拒绝
 * - 支持突发流量 (桶内有存量令牌)
 * 
 * 适用场景:
 * - 需要平滑流量但允许突发
 * - API 网关限流
 * - 用户请求频率控制
 */
export class TokenBucketLimiter {
  private key: string;
  private capacity: number;
  private tokens: number;
  private refillRate: number; // tokens per ms
  private lastRefill: number;

  /**
   * 创建 Token Bucket 限流器
   * @param key - 限流器标识
   * @param capacity - 桶容量 (最大令牌数)
   * @param refillRate - 令牌补充速率 (tokens/ms)
   */
  constructor(key: string, capacity: number, refillRate: number) {
    if (capacity <= 0) {
      throw new Error('Capacity must be positive');
    }
    if (refillRate <= 0) {
      throw new Error('Refill rate must be positive');
    }

    this.key = key;
    this.capacity = capacity;
    this.tokens = capacity; // 初始满桶
    this.refillRate = refillRate;
    this.lastRefill = Date.now();
  }

  /**
   * 补充令牌 (内部方法)
   */
  private refill(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    const newTokens = elapsed * this.refillRate;
    
    this.tokens = Math.min(this.capacity, this.tokens + newTokens);
    this.lastRefill = now;
  }

  /**
   * 尝试获取令牌
   * @param tokens - 需要的令牌数，默认为 1
   * @returns 限流结果
   */
  tryAcquire(tokens: number = 1): RateLimitResult {
    this.refill();

    const allowed = this.tokens >= tokens;
    
    if (allowed) {
      this.tokens -= tokens;
    }

    // 计算等待时间
    const retryAfter = allowed 
      ? undefined 
      : Math.ceil((tokens - this.tokens) / this.refillRate);

    // 计算重置时间 (桶满的时间)
    const timeToFull = Math.ceil((this.capacity - this.tokens) / this.refillRate);
    const resetTime = Date.now() + timeToFull;

    return {
      allowed,
      remaining: Math.floor(this.tokens),
      resetTime,
      retryAfter,
      used: this.capacity - Math.floor(this.tokens),
    };
  }

  /**
   * 获取当前状态
   */
  getState(): RateLimiterState {
    this.refill();
    
    return {
      key: this.key,
      state: {
        allowed: this.tokens >= 1,
        remaining: Math.floor(this.tokens),
        resetTime: Date.now() + Math.ceil((this.capacity - this.tokens) / this.refillRate),
        used: this.capacity - Math.floor(this.tokens),
      },
      config: {
        windowMs: Math.ceil(this.capacity / this.refillRate),
        maxRequests: this.capacity,
        algorithm: 'token-bucket',
        allowBurst: true,
        refillRate: this.refillRate,
      },
    };
  }

  /**
   * 动态调整容量
   * @param newCapacity - 新容量
   */
  setCapacity(newCapacity: number): void {
    if (newCapacity <= 0) {
      throw new Error('Capacity must be positive');
    }
    
    this.capacity = newCapacity;
    this.tokens = Math.min(this.tokens, newCapacity);
  }

  /**
   * 动态调整补充速率
   * @param newRate - 新速率 (tokens/ms)
   */
  setRefillRate(newRate: number): void {
    if (newRate <= 0) {
      throw new Error('Refill rate must be positive');
    }
    
    this.refill(); // 先补充当前令牌
    this.refillRate = newRate;
  }
}

// ==================== Sliding Window 限流器 ====================

/**
 * Sliding Window 限流器 (滑动窗口)
 * 
 * 原理:
 * - 记录每个请求的时间戳
 * - 窗口滑动，移除过期请求
 * - 精确控制任意时间窗口内的请求数
 * 
 * 适用场景:
 * - 需要精确限流
 * - 防止窗口边界突发
 * - 高频请求控制
 */
export class SlidingWindowLimiter {
  private key: string;
  private windowMs: number;
  private maxRequests: number;
  private timestamps: number[] = [];

  /**
   * 创建滑动窗口限流器
   * @param key - 限流器标识
   * @param windowMs - 窗口大小 (毫秒)
   * @param maxRequests - 窗口内最大请求数
   */
  constructor(key: string, windowMs: number, maxRequests: number) {
    if (windowMs <= 0) {
      throw new Error('Window size must be positive');
    }
    if (maxRequests <= 0) {
      throw new Error('Max requests must be positive');
    }

    this.key = key;
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
  }

  /**
   * 清理过期时间戳
   */
  private cleanup(): void {
    const now = Date.now();
    const cutoff = now - this.windowMs;
    
    // 移除窗口外的时间戳
    this.timestamps = this.timestamps.filter(ts => ts > cutoff);
  }

  /**
   * 尝试记录请求
   * @returns 限流结果
   */
  tryAcquire(): RateLimitResult {
    this.cleanup();
    
    const now = Date.now();
    const currentCount = this.timestamps.length;
    const allowed = currentCount < this.maxRequests;

    if (allowed) {
      this.timestamps.push(now);
    }

    // 计算最早过期的时间
    const oldestTimestamp = this.timestamps[0] || now;
    const resetTime = oldestTimestamp + this.windowMs;
    const retryAfter = allowed ? undefined : Math.max(0, resetTime - now);

    return {
      allowed,
      remaining: Math.max(0, this.maxRequests - this.timestamps.length),
      resetTime,
      retryAfter,
      used: this.timestamps.length,
    };
  }

  /**
   * 获取当前状态
   */
  getState(): RateLimiterState {
    this.cleanup();
    
    const now = Date.now();
    const oldestTimestamp = this.timestamps[0] || now;

    return {
      key: this.key,
      state: {
        allowed: this.timestamps.length < this.maxRequests,
        remaining: Math.max(0, this.maxRequests - this.timestamps.length),
        resetTime: oldestTimestamp + this.windowMs,
        used: this.timestamps.length,
      },
      config: {
        windowMs: this.windowMs,
        maxRequests: this.maxRequests,
        algorithm: 'sliding-window',
      },
    };
  }

  /**
   * 动态调整窗口大小
   * @param newWindowMs - 新窗口大小 (毫秒)
   */
  setWindow(newWindowMs: number): void {
    if (newWindowMs <= 0) {
      throw new Error('Window size must be positive');
    }
    
    this.windowMs = newWindowMs;
    this.cleanup();
  }

  /**
   * 动态调整最大请求数
   * @param newMax - 新最大请求数
   */
  setMaxRequests(newMax: number): void {
    if (newMax <= 0) {
      throw new Error('Max requests must be positive');
    }
    
    this.maxRequests = newMax;
  }
}

// ==================== Fixed Window 限流器 ====================

/**
 * Fixed Window 限流器 (固定窗口)
 * 
 * 原理:
 * - 将时间划分为固定大小的窗口
 * - 每个窗口内独立计数
 * - 窗口重置时计数器清零
 * 
 * 适用场景:
 * - 简单限流场景
 * - 按分钟/小时统计
 * - 资源消耗控制
 */
export class FixedWindowLimiter {
  private key: string;
  private windowMs: number;
  private maxRequests: number;
  private currentWindow: number = 0;
  private count: number = 0;

  /**
   * 创建固定窗口限流器
   * @param key - 限流器标识
   * @param windowMs - 窗口大小 (毫秒)
   * @param maxRequests - 窗口内最大请求数
   */
  constructor(key: string, windowMs: number, maxRequests: number) {
    if (windowMs <= 0) {
      throw new Error('Window size must be positive');
    }
    if (maxRequests <= 0) {
      throw new Error('Max requests must be positive');
    }

    this.key = key;
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
    this.currentWindow = Math.floor(Date.now() / windowMs);
  }

  /**
   * 检查并重置窗口
   */
  private checkWindow(): void {
    const now = Math.floor(Date.now() / this.windowMs);
    
    if (now !== this.currentWindow) {
      this.currentWindow = now;
      this.count = 0;
    }
  }

  /**
   * 尝试记录请求
   * @returns 限流结果
   */
  tryAcquire(): RateLimitResult {
    this.checkWindow();
    
    const allowed = this.count < this.maxRequests;
    
    if (allowed) {
      this.count++;
    }

    const resetTime = (this.currentWindow + 1) * this.windowMs;
    const retryAfter = allowed ? undefined : resetTime - Date.now();

    return {
      allowed,
      remaining: Math.max(0, this.maxRequests - this.count),
      resetTime,
      retryAfter,
      used: this.count,
    };
  }

  /**
   * 获取当前状态
   */
  getState(): RateLimiterState {
    this.checkWindow();
    
    const resetTime = (this.currentWindow + 1) * this.windowMs;

    return {
      key: this.key,
      state: {
        allowed: this.count < this.maxRequests,
        remaining: Math.max(0, this.maxRequests - this.count),
        resetTime,
        used: this.count,
      },
      config: {
        windowMs: this.windowMs,
        maxRequests: this.maxRequests,
        algorithm: 'fixed-window',
      },
    };
  }

  /**
   * 动态调整窗口大小
   * @param newWindowMs - 新窗口大小 (毫秒)
   */
  setWindow(newWindowMs: number): void {
    if (newWindowMs <= 0) {
      throw new Error('Window size must be positive');
    }
    
    this.windowMs = newWindowMs;
    this.currentWindow = Math.floor(Date.now() / newWindowMs);
    this.count = 0;
  }

  /**
   * 动态调整最大请求数
   * @param newMax - 新最大请求数
   */
  setMaxRequests(newMax: number): void {
    if (newMax <= 0) {
      throw new Error('Max requests must be positive');
    }
    
    this.maxRequests = newMax;
  }
}

// ==================== Leaky Bucket 限流器 ====================

/**
 * Leaky Bucket 限流器 (漏桶)
 * 
 * 原理:
 * - 固定容量的桶，请求像水一样注入
 * - 桶以恒定速率漏水 (处理请求)
   - 桶满时溢出 (拒绝请求)
 * 
 * 适用场景:
 * - 平滑输出速率
 * - 保护后端服务
 * - 队列管理
 */
export class LeakyBucketLimiter {
  private key: string;
  private capacity: number;
  private leakRate: number; // requests per ms
  private waterLevel: number = 0;
  private lastLeak: number = Date.now();

  /**
   * 创建漏桶限流器
   * @param key - 限流器标识
   * @param capacity - 桶容量
   * @param leakRate - 漏速率 (requests/ms)
   */
  constructor(key: string, capacity: number, leakRate: number) {
    if (capacity <= 0) {
      throw new Error('Capacity must be positive');
    }
    if (leakRate <= 0) {
      throw new Error('Leak rate must be positive');
    }

    this.key = key;
    this.capacity = capacity;
    this.leakRate = leakRate;
  }

  /**
   * 漏水 (内部方法)
   */
  private leak(): void {
    const now = Date.now();
    const elapsed = now - this.lastLeak;
    const leaked = elapsed * this.leakRate;
    
    this.waterLevel = Math.max(0, this.waterLevel - leaked);
    this.lastLeak = now;
  }

  /**
   * 尝试注入请求
   * @returns 限流结果
   */
  tryAcquire(): RateLimitResult {
    this.leak();
    
    const allowed = this.waterLevel < this.capacity;
    
    if (allowed) {
      this.waterLevel += 1;
    }

    // 计算等待时间
    const retryAfter = allowed 
      ? undefined 
      : Math.ceil((this.waterLevel - this.capacity + 1) / this.leakRate);

    // 计算重置时间 (桶空的时间)
    const timeToEmpty = Math.ceil(this.waterLevel / this.leakRate);
    const resetTime = Date.now() + timeToEmpty;

    return {
      allowed,
      remaining: Math.floor(this.capacity - this.waterLevel),
      resetTime,
      retryAfter,
      used: Math.floor(this.waterLevel),
    };
  }

  /**
   * 获取当前状态
   */
  getState(): RateLimiterState {
    this.leak();
    
    const timeToEmpty = Math.ceil(this.waterLevel / this.leakRate);
    const resetTime = Date.now() + timeToEmpty;

    return {
      key: this.key,
      state: {
        allowed: this.waterLevel < this.capacity,
        remaining: Math.floor(this.capacity - this.waterLevel),
        resetTime,
        used: Math.floor(this.waterLevel),
      },
      config: {
        windowMs: Math.ceil(this.capacity / this.leakRate),
        maxRequests: this.capacity,
        algorithm: 'leaky-bucket',
      },
    };
  }

  /**
   * 动态调整容量
   * @param newCapacity - 新容量
   */
  setCapacity(newCapacity: number): void {
    if (newCapacity <= 0) {
      throw new Error('Capacity must be positive');
    }
    
    this.capacity = newCapacity;
    this.waterLevel = Math.min(this.waterLevel, newCapacity);
  }

  /**
   * 动态调整漏速率
   * @param newRate - 新速率 (requests/ms)
   */
  setLeakRate(newRate: number): void {
    if (newRate <= 0) {
      throw new Error('Leak rate must be positive');
    }
    
    this.leak();
    this.leakRate = newRate;
  }
}

// ==================== 分布式限流器 (Redis 模拟) ====================

/**
 * 分布式限流器接口 (用于 Redis 实现)
 */
export interface DistributedLimiter {
  tryAcquire(key: string): Promise<RateLimitResult>;
  getState(key: string): Promise<RateLimiterState>;
  reset(key: string): Promise<void>;
}

/**
 * 内存版分布式限流器 (模拟 Redis 行为)
 * 
 * 注意: 生产环境应使用 Redis + Lua 脚本实现
 * 此实现仅用于演示和测试
 */
export class MemoryDistributedLimiter implements DistributedLimiter {
  private store: Map<string, { timestamps: number[]; config: RateLimiterConfig }> = new Map();
  private defaultConfig: RateLimiterConfig;

  /**
   * 创建分布式限流器
   * @param config - 默认配置
   */
  constructor(config: RateLimiterConfig) {
    this.defaultConfig = config;
  }

  /**
   * 获取或创建限流器状态
   */
  private getOrCreate(key: string): { timestamps: number[]; config: RateLimiterConfig } {
    if (!this.store.has(key)) {
      this.store.set(key, {
        timestamps: [],
        config: { ...this.defaultConfig },
      });
    }
    return this.store.get(key)!;
  }

  /**
   * 尝试获取限流
   * @param key - 限流器标识 (通常是用户 ID 或 IP)
   * @returns 限流结果
   */
  async tryAcquire(key: string): Promise<RateLimitResult> {
    const data = this.getOrCreate(key);
    const { config } = data;
    const now = Date.now();
    const cutoff = now - config.windowMs;

    // 清理过期请求
    data.timestamps = data.timestamps.filter(ts => ts > cutoff);

    const allowed = data.timestamps.length < config.maxRequests;
    
    if (allowed) {
      data.timestamps.push(now);
    }

    const oldestTimestamp = data.timestamps[0] || now;
    const resetTime = oldestTimestamp + config.windowMs;
    const retryAfter = allowed ? undefined : Math.max(0, resetTime - now);

    return {
      allowed,
      remaining: Math.max(0, config.maxRequests - data.timestamps.length),
      resetTime,
      retryAfter,
      used: data.timestamps.length,
    };
  }

  /**
   * 获取限流器状态
   * @param key - 限流器标识
   */
  async getState(key: string): Promise<RateLimiterState> {
    const data = this.getOrCreate(key);
    const { timestamps, config } = data;
    const now = Date.now();
    const cutoff = now - config.windowMs;

    // 清理过期请求
    const validTimestamps = timestamps.filter(ts => ts > cutoff);
    const oldestTimestamp = validTimestamps[0] || now;

    return {
      key,
      state: {
        allowed: validTimestamps.length < config.maxRequests,
        remaining: Math.max(0, config.maxRequests - validTimestamps.length),
        resetTime: oldestTimestamp + config.windowMs,
        used: validTimestamps.length,
      },
      config,
    };
  }

  /**
   * 重置限流器
   * @param key - 限流器标识
   */
  async reset(key: string): Promise<void> {
    this.store.delete(key);
  }

  /**
   * 动态更新配置
   * @param key - 限流器标识
   * @param config - 新配置
   */
  async updateConfig(key: string, config: Partial<RateLimiterConfig>): Promise<void> {
    const data = this.getOrCreate(key);
    data.config = { ...data.config, ...config };
  }
}

// ==================== 限流器工厂 ====================

/**
 * 限流器工厂
 * 
 * 根据配置创建合适的限流器实例
 */
export class RateLimiterFactory {
  /**
   * 创建限流器
   * @param key - 限流器标识
   * @param config - 限流配置
   * @returns 限流器实例
   */
  static create(key: string, config: RateLimiterConfig): 
    | TokenBucketLimiter 
    | SlidingWindowLimiter 
    | FixedWindowLimiter 
    | LeakyBucketLimiter {
    
    switch (config.algorithm) {
      case 'token-bucket': {
        const refillRate = config.refillRate || (config.maxRequests / config.windowMs);
        return new TokenBucketLimiter(key, config.maxRequests, refillRate);
      }
      
      case 'sliding-window':
        return new SlidingWindowLimiter(key, config.windowMs, config.maxRequests);
      
      case 'fixed-window':
        return new FixedWindowLimiter(key, config.windowMs, config.maxRequests);
      
      case 'leaky-bucket': {
        const leakRate = config.maxRequests / config.windowMs;
        return new LeakyBucketLimiter(key, config.maxRequests, leakRate);
      }
      
      default:
        throw new Error(`Unknown algorithm: ${(config as any).algorithm}`);
    }
  }

  /**
   * 创建分布式限流器
   * @param config - 限流配置
   * @returns 分布式限流器实例
   */
  static createDistributed(config: RateLimiterConfig): MemoryDistributedLimiter {
    return new MemoryDistributedLimiter(config);
  }
}

// ==================== 中间件集成示例 ====================

/**
 * Express 中间件工厂函数
 * 
 * @param config - 限流配置
 * @returns Express 中间件
 * 
 * @example
 * app.use('/api', rateLimiterMiddleware({
 *   windowMs: 60000,
 *   maxRequests: 100,
 *   algorithm: 'sliding-window'
 * }));
 */
export function createRateLimiterMiddleware(config: RateLimiterConfig) {
  const limiter = RateLimiterFactory.createDistributed(config);

  return async (req: any, res: any, next: () => void) => {
    // 使用 IP 或用户 ID 作为标识
    const key = req.ip || req.headers['x-forwarded-for'] || 'anonymous';
    
    const result = await limiter.tryAcquire(key as string);

    // 设置限流响应头
    res.setHeader('X-RateLimit-Limit', config.maxRequests);
    res.setHeader('X-RateLimit-Remaining', result.remaining);
    res.setHeader('X-RateLimit-Reset', result.resetTime.toString());

    if (!result.allowed) {
      res.setHeader('Retry-After', (result.retryAfter || 1000).toString());
      res.status(429).json({
        error: 'Too Many Requests',
        message: 'Rate limit exceeded. Please try again later.',
        retryAfter: result.retryAfter,
      });
      return;
    }

    if (result.retryAfter !== undefined) {
      res.setHeader('Retry-After', result.retryAfter.toString());
    }

    next();
  };
}

// ==================== 使用示例 ====================

if (require.main === module) {
  (async () => {
    console.log('=== 限流器模式工具 - 使用示例 ===\n');

    // 1. Token Bucket 示例
    console.log('1️⃣ Token Bucket 限流器:');
    const tokenBucket = new TokenBucketLimiter('api-user-1', 10, 0.5); // 10 tokens, 0.5 tokens/ms
    
    for (let i = 0; i < 15; i++) {
      const result = tokenBucket.tryAcquire();
      console.log(`   请求 ${i + 1}: ${result.allowed ? '✅ 允许' : '❌ 拒绝'} (剩余：${result.remaining})`);
    }
    console.log('');

    // 2. Sliding Window 示例
    console.log('2️⃣ Sliding Window 限流器:');
    const slidingWindow = new SlidingWindowLimiter('api-user-2', 5000, 5); // 5 秒内最多 5 次
    
    for (let i = 0; i < 8; i++) {
      const result = slidingWindow.tryAcquire();
      console.log(`   请求 ${i + 1}: ${result.allowed ? '✅ 允许' : '❌ 拒绝'} (剩余：${result.remaining})`);
    }
    console.log('');

    // 3. Fixed Window 示例
    console.log('3️⃣ Fixed Window 限流器:');
    const fixedWindow = new FixedWindowLimiter('api-user-3', 10000, 10); // 10 秒内最多 10 次
    
    for (let i = 0; i < 13; i++) {
      const result = fixedWindow.tryAcquire();
      console.log(`   请求 ${i + 1}: ${result.allowed ? '✅ 允许' : '❌ 拒绝'} (剩余：${result.remaining})`);
    }
    console.log('');

    // 4. Leaky Bucket 示例
    console.log('4️⃣ Leaky Bucket 限流器:');
    const leakyBucket = new LeakyBucketLimiter('api-user-4', 5, 0.2); // 容量 5, 漏速率 0.2/ms
    
    for (let i = 0; i < 8; i++) {
      const result = leakyBucket.tryAcquire();
      console.log(`   请求 ${i + 1}: ${result.allowed ? '✅ 允许' : '❌ 拒绝'} (剩余：${result.remaining})`);
    }
    console.log('');

    // 5. 分布式限流器示例
    console.log('5️⃣ 分布式限流器:');
    const distributed = new MemoryDistributedLimiter({
      windowMs: 60000,
      maxRequests: 10,
      algorithm: 'sliding-window',
    });

    const users = ['user-1', 'user-2', 'user-1', 'user-1', 'user-2'];
    for (const user of users) {
      const result = await distributed.tryAcquire(user);
      console.log(`   ${user}: ${result.allowed ? '✅ 允许' : '❌ 拒绝'} (剩余：${result.remaining})`);
    }

    // 获取状态
    const state = await distributed.getState('user-1');
    console.log(`   user-1 状态：已使用 ${state.state.used}/${state.config.maxRequests}`);
    console.log('');

    // 6. 工厂模式示例
    console.log('6️⃣ 限流器工厂:');
    const limiter1 = RateLimiterFactory.create('test-1', {
      windowMs: 60000,
      maxRequests: 100,
      algorithm: 'token-bucket',
      refillRate: 2,
    });
    console.log(`   创建 Token Bucket: ${limiter1.constructor.name}`);

    const limiter2 = RateLimiterFactory.create('test-2', {
      windowMs: 10000,
      maxRequests: 50,
      algorithm: 'sliding-window',
    });
    console.log(`   创建 Sliding Window: ${limiter2.constructor.name}`);
    console.log('');

    // 7. 动态配置示例
    console.log('7️⃣ 动态配置:');
    const dynamicLimiter = new TokenBucketLimiter('dynamic', 10, 1);
    console.log(`   初始容量：${dynamicLimiter.getState().config.maxRequests}`);
    
    dynamicLimiter.setCapacity(20);
    console.log(`   调整后容量：${dynamicLimiter.getState().config.maxRequests}`);
    
    dynamicLimiter.setRefillRate(2);
    console.log(`   调整后补充速率：${dynamicLimiter.getState().config.refillRate}`);
    console.log('');

    console.log('✅ 所有示例执行完成!');
  })();
}
