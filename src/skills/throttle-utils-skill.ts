/**
 * API 限流工具技能
 * 
 * 功能:
 * 1. 令牌桶算法 (Token Bucket)
 * 2. 漏桶算法 (Leaky Bucket)
 * 3. 滑动窗口算法 (Sliding Window)
 * 
 * @module skills/throttle-utils
 */

// ==================== 令牌桶算法 ====================

/**
 * 令牌桶限流器配置
 */
export interface TokenBucketOptions {
  /** 桶容量 (最大令牌数) */
  capacity: number;
  /** 令牌补充速率 (每秒补充的令牌数) */
  refillRate: number;
  /** 是否立即填充初始令牌 */
  fillInitially?: boolean;
}

/**
 * 令牌桶限流器
 * 
 * 原理:
 * - 系统以固定速率向桶中添加令牌
 * - 请求需要消耗令牌才能执行
 * - 桶满时不再添加令牌
 * - 无令牌时请求被拒绝或等待
 */
export class TokenBucket {
  private capacity: number;
  private refillRate: number;
  private tokens: number;
  private lastRefill: number;

  constructor(options: TokenBucketOptions) {
    this.capacity = options.capacity;
    this.refillRate = options.refillRate;
    this.tokens = options.fillInitially !== false ? options.capacity : 0;
    this.lastRefill = Date.now();
  }

  /**
   * 补充令牌 (基于时间流逝)
   */
  private refill(): void {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000; // 转换为秒
    const tokensToAdd = elapsed * this.refillRate;
    
    this.tokens = Math.min(this.capacity, this.tokens + tokensToAdd);
    this.lastRefill = now;
  }

  /**
   * 尝试获取令牌
   * @param count - 需要的令牌数，默认 1
   * @returns 是否成功获取
   */
  tryAcquire(count: number = 1): boolean {
    this.refill();
    
    if (this.tokens >= count) {
      this.tokens -= count;
      return true;
    }
    return false;
  }

  /**
   * 获取令牌 (阻塞等待)
   * @param count - 需要的令牌数
   * @param timeout - 超时时间 (ms)，默认不超时
   * @returns Promise，成功时解析为 true
   */
  async acquire(count: number = 1, timeout?: number): Promise<boolean> {
    const startTime = Date.now();
    
    while (!this.tryAcquire(count)) {
      if (timeout && Date.now() - startTime >= timeout) {
        return false;
      }
      // 计算等待时间
      const neededTokens = count - this.tokens;
      const waitTime = Math.min(
        (neededTokens / this.refillRate) * 1000,
        timeout ? timeout - (Date.now() - startTime) : 100
      );
      
      if (waitTime > 0) {
        await new Promise(resolve => setTimeout(resolve, Math.max(waitTime, 10)));
      }
    }
    
    return true;
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
    this.lastRefill = Date.now();
  }
}

// ==================== 漏桶算法 ====================

/**
 * 漏桶限流器配置
 */
export interface LeakyBucketOptions {
  /** 桶容量 (最大请求数) */
  capacity: number;
  /** 漏水速率 (每秒处理的请求数) */
  leakRate: number;
}

/**
 * 漏桶限流器
 * 
 * 原理:
 * - 请求像水一样流入桶中
 * - 桶以固定速率漏水 (处理请求)
 * - 桶满时新请求被拒绝
 * - 强制平滑流量输出
 */
export class LeakyBucket {
  private capacity: number;
  private leakRate: number;
  private water: number;
  private lastLeak: number;

  constructor(options: LeakyBucketOptions) {
    this.capacity = options.capacity;
    this.leakRate = options.leakRate;
    this.water = 0;
    this.lastLeak = Date.now();
  }

  /**
   * 漏水 (基于时间流逝)
   */
  private leak(): void {
    const now = Date.now();
    const elapsed = (now - this.lastLeak) / 1000; // 转换为秒
    const leakedAmount = elapsed * this.leakRate;
    
    this.water = Math.max(0, this.water - leakedAmount);
    this.lastLeak = now;
  }

  /**
   * 尝试添加请求 (水)
   * @param amount - 请求量，默认 1
   * @returns 是否成功添加
   */
  tryAdd(amount: number = 1): boolean {
    this.leak();
    
    if (this.water + amount <= this.capacity) {
      this.water += amount;
      return true;
    }
    return false;
  }

  /**
   * 添加请求 (阻塞等待)
   * @param amount - 请求量
   * @param timeout - 超时时间 (ms)，默认不超时
   * @returns Promise，成功时解析为 true
   */
  async add(amount: number = 1, timeout?: number): Promise<boolean> {
    const startTime = Date.now();
    
    while (!this.tryAdd(amount)) {
      if (timeout && Date.now() - startTime >= timeout) {
        return false;
      }
      // 计算等待时间
      const neededSpace = this.water + amount - this.capacity;
      const waitTime = Math.min(
        (neededSpace / this.leakRate) * 1000,
        timeout ? timeout - (Date.now() - startTime) : 100
      );
      
      if (waitTime > 0) {
        await new Promise(resolve => setTimeout(resolve, Math.max(waitTime, 10)));
      }
    }
    
    return true;
  }

  /**
   * 获取当前桶中水量 (待处理请求数)
   */
  getWaterLevel(): number {
    this.leak();
    return this.water;
  }

  /**
   * 获取剩余容量
   */
  getRemainingCapacity(): number {
    this.leak();
    return this.capacity - this.water;
  }

  /**
   * 重置限流器
   */
  reset(): void {
    this.water = 0;
    this.lastLeak = Date.now();
  }
}

// ==================== 滑动窗口算法 ====================

/**
 * 滑动窗口限流器配置
 */
export interface SlidingWindowOptions {
  /** 窗口大小 (毫秒) */
  windowSize: number;
  /** 窗口内最大请求数 */
  maxRequests: number;
  /** 是否使用平滑滑动窗口 (默认 false，使用固定窗口) */
  smooth?: boolean;
}

/**
 * 请求记录
 */
interface RequestRecord {
  timestamp: number;
  weight: number;
}

/**
 * 滑动窗口限流器
 * 
 * 原理:
 * - 维护一个时间窗口
 * - 统计窗口内的请求数量
 * - 超过阈值时拒绝新请求
 * - 窗口随时间滑动
 */
export class SlidingWindow {
  private windowSize: number;
  private maxRequests: number;
  private smooth: boolean;
  private requests: RequestRecord[];

  constructor(options: SlidingWindowOptions) {
    this.windowSize = options.windowSize;
    this.maxRequests = options.maxRequests;
    this.smooth = options.smooth ?? false;
    this.requests = [];
  }

  /**
   * 清理过期请求
   */
  private cleanup(): void {
    const now = Date.now();
    const cutoff = now - this.windowSize;
    
    this.requests = this.requests.filter(req => req.timestamp > cutoff);
  }

  /**
   * 尝试记录请求
   * @param weight - 请求权重，默认 1
   * @returns 是否成功记录
   */
  tryRecord(weight: number = 1): boolean {
    this.cleanup();
    
    const currentCount = this.smooth
      ? this.requests.reduce((sum, req) => sum + req.weight, 0)
      : this.requests.length;
    
    if (currentCount + weight <= this.maxRequests) {
      this.requests.push({
        timestamp: Date.now(),
        weight
      });
      return true;
    }
    return false;
  }

  /**
   * 记录请求 (阻塞等待)
   * @param weight - 请求权重
   * @param timeout - 超时时间 (ms)，默认不超时
   * @returns Promise，成功时解析为 true
   */
  async record(weight: number = 1, timeout?: number): Promise<boolean> {
    const startTime = Date.now();
    
    while (!this.tryRecord(weight)) {
      if (timeout && Date.now() - startTime >= timeout) {
        return false;
      }
      
      // 等待到下一个请求可以被接受
      const waitTime = this.getWaitTime();
      if (waitTime > 0) {
        await new Promise(resolve => setTimeout(resolve, Math.min(waitTime, 100)));
      } else {
        // 避免忙等待
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }
    
    return true;
  }

  /**
   * 获取等待时间 (ms)
   */
  private getWaitTime(): number {
    if (this.requests.length === 0) {
      return 0;
    }
    
    const oldestRequest = this.requests[0].timestamp;
    const expiresAt = oldestRequest + this.windowSize;
    const now = Date.now();
    
    return Math.max(0, expiresAt - now);
  }

  /**
   * 获取当前窗口内的请求数
   */
  getRequestCount(): number {
    this.cleanup();
    
    if (this.smooth) {
      return this.requests.reduce((sum, req) => sum + req.weight, 0);
    }
    return this.requests.length;
  }

  /**
   * 获取剩余可用请求数
   */
  getRemainingRequests(): number {
    this.cleanup();
    
    const currentCount = this.smooth
      ? this.requests.reduce((sum, req) => sum + req.weight, 0)
      : this.requests.length;
    
    return Math.max(0, this.maxRequests - currentCount);
  }

  /**
   * 重置限流器
   */
  reset(): void {
    this.requests = [];
  }
}

// ==================== 组合限流器 ====================

/**
 * 组合限流器配置
 */
export interface CompositeThrottleOptions {
  /** 令牌桶配置 */
  tokenBucket?: TokenBucketOptions;
  /** 漏桶配置 */
  leakyBucket?: LeakyBucketOptions;
  /** 滑动窗口配置 */
  slidingWindow?: SlidingWindowOptions;
}

/**
 * 组合限流器 (同时使用多种算法)
 */
export class CompositeThrottle {
  private tokenBucket?: TokenBucket;
  private leakyBucket?: LeakyBucket;
  private slidingWindow?: SlidingWindow;

  constructor(options: CompositeThrottleOptions) {
    if (options.tokenBucket) {
      this.tokenBucket = new TokenBucket(options.tokenBucket);
    }
    if (options.leakyBucket) {
      this.leakyBucket = new LeakyBucket(options.leakyBucket);
    }
    if (options.slidingWindow) {
      this.slidingWindow = new SlidingWindow(options.slidingWindow);
    }
  }

  /**
   * 尝试执行 (所有限流器都通过)
   */
  tryExecute(): boolean {
    if (this.tokenBucket && !this.tokenBucket.tryAcquire()) {
      return false;
    }
    if (this.leakyBucket && !this.leakyBucket.tryAdd()) {
      return false;
    }
    if (this.slidingWindow && !this.slidingWindow.tryRecord()) {
      return false;
    }
    return true;
  }

  /**
   * 执行 (阻塞等待)
   * @param timeout - 超时时间 (ms)
   */
  async execute(timeout?: number): Promise<boolean> {
    const startTime = Date.now();
    
    const tryAll = () => {
      const remaining = timeout ? timeout - (Date.now() - startTime) : undefined;
      if (remaining !== undefined && remaining <= 0) {
        return false;
      }
      return this.tryExecute();
    };
    
    while (!tryAll()) {
      if (timeout && Date.now() - startTime >= timeout) {
        return false;
      }
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    
    return true;
  }

  /**
   * 重置所有限流器
   */
  reset(): void {
    this.tokenBucket?.reset();
    this.leakyBucket?.reset();
    this.slidingWindow?.reset();
  }
}

// ==================== 工厂函数 ====================

/**
 * 创建令牌桶限流器
 */
export function createTokenBucket(capacity: number, refillRate: number): TokenBucket {
  return new TokenBucket({ capacity, refillRate });
}

/**
 * 创建漏桶限流器
 */
export function createLeakyBucket(capacity: number, leakRate: number): LeakyBucket {
  return new LeakyBucket({ capacity, leakRate });
}

/**
 * 创建滑动窗口限流器
 */
export function createSlidingWindow(windowSizeMs: number, maxRequests: number): SlidingWindow {
  return new SlidingWindow({ windowSize: windowSizeMs, maxRequests });
}

/**
 * 创建组合限流器
 */
export function createCompositeThrottle(options: CompositeThrottleOptions): CompositeThrottle {
  return new CompositeThrottle(options);
}

// ==================== 中间件适配器 (Express/Koa) ====================

/**
 * Express 限流中间件
 */
export function createExpressMiddleware(throttle: TokenBucket | LeakyBucket | SlidingWindow) {
  return async (req: any, res: any, next: () => void) => {
    let allowed = false;
    
    if (throttle instanceof TokenBucket) {
      allowed = throttle.tryAcquire();
    } else if (throttle instanceof LeakyBucket) {
      allowed = throttle.tryAdd();
    } else if (throttle instanceof SlidingWindow) {
      allowed = throttle.tryRecord();
    }
    
    if (!allowed) {
      res.status(429).json({
        error: 'Too Many Requests',
        message: 'Rate limit exceeded',
        retryAfter: 1
      });
      return;
    }
    
    next();
  };
}
