/**
 * API 限流技能 - Rate Limit Skill
 * 
 * 功能:
 * 1. 按用户限流
 * 2. 按 IP 限流
 * 3. 可配置限流规则
 * 
 * @author Axon
 * @version 1.0.0
 */

// ============== 类型定义 ==============

export interface RateLimitConfig {
  /** 桶容量 (最大令牌数) */
  bucketSize: number;
  /** 令牌补充速率 (每秒补充的令牌数) */
  refillRate: number;
  /** 限流时间窗口 (毫秒) */
  windowMs?: number;
  /** 是否按 IP 限流 */
  limitByIP: boolean;
  /** 是否按用户 ID 限流 */
  limitByUser: boolean;
  /** 自定义规则 */
  rules?: RateLimitRule[];
}

export interface RateLimitRule {
  /** 规则名称 */
  name: string;
  /** 匹配的路径模式 (支持通配符 *) */
  pathPattern: string;
  /** 该路径的桶容量 */
  bucketSize: number;
  /** 该路径的补充速率 */
  refillRate: number;
}

export interface RateLimitResult {
  /** 是否允许请求 */
  allowed: boolean;
  /** 剩余令牌数 */
  remaining: number;
  /** 重置时间 (毫秒时间戳) */
  resetTime: number;
  /** 重试等待时间 (毫秒) */
  retryAfter?: number;
}

interface TokenBucket {
  tokens: number;
  lastRefill: number;
  capacity: number;
  refillRate: number;
}

interface BucketMap {
  [key: string]: TokenBucket;
}

// ============== 令牌桶限流器实现 ==============

/**
 * 令牌桶限流器类
 */
export class TokenBucketLimiter {
  private buckets: BucketMap = {};
  private config: RateLimitConfig;
  private cleanupInterval?: NodeJS.Timeout;

  constructor(config: RateLimitConfig) {
    this.config = config;
    this.startCleanup();
  }

  /**
   * 获取或创建令牌桶
   */
  private getBucket(key: string): TokenBucket {
    if (!this.buckets[key]) {
      this.buckets[key] = {
        tokens: this.config.bucketSize,
        lastRefill: Date.now(),
        capacity: this.config.bucketSize,
        refillRate: this.config.refillRate,
      };
    }
    return this.buckets[key];
  }

  /**
   * 补充令牌
   */
  private refillBucket(bucket: TokenBucket): void {
    const now = Date.now();
    const timePassed = (now - bucket.lastRefill) / 1000;
    const tokensToAdd = timePassed * bucket.refillRate;
    bucket.tokens = Math.min(bucket.capacity, bucket.tokens + tokensToAdd);
    bucket.lastRefill = now;
  }

  /**
   * 尝试消费令牌
   */
  public consume(key: string, cost: number = 1): RateLimitResult {
    const bucket = this.getBucket(key);
    this.refillBucket(bucket);

    const now = Date.now();
    const resetTime = now + Math.ceil((bucket.capacity - bucket.tokens) / bucket.refillRate) * 1000;

    if (bucket.tokens >= cost) {
      bucket.tokens -= cost;
      return {
        allowed: true,
        remaining: Math.floor(bucket.tokens),
        resetTime,
      };
    }

    const tokensNeeded = cost - bucket.tokens;
    const waitTimeMs = Math.ceil((tokensNeeded / bucket.refillRate) * 1000);

    return {
      allowed: false,
      remaining: 0,
      resetTime,
      retryAfter: waitTimeMs,
    };
  }

  /**
   * 获取当前桶状态
   */
  public getStatus(key: string): RateLimitResult {
    const bucket = this.getBucket(key);
    this.refillBucket(bucket);

    const now = Date.now();
    const resetTime = now + Math.ceil((bucket.capacity - bucket.tokens) / bucket.refillRate) * 1000;

    return {
      allowed: bucket.tokens >= 1,
      remaining: Math.floor(bucket.tokens),
      resetTime,
      retryAfter: bucket.tokens < 1 ? Math.ceil((1 - bucket.tokens) / bucket.refillRate * 1000) : undefined,
    };
  }

  /**
   * 清理过期桶
   */
  private startCleanup(): void {
    const cleanupIntervalMs = this.config.windowMs || 60000;
    
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      const threshold = cleanupIntervalMs * 2;

      for (const [key, bucket] of Object.entries(this.buckets)) {
        if (now - bucket.lastRefill > threshold) {
          delete this.buckets[key];
        }
      }
    }, cleanupIntervalMs);

    if (this.cleanupInterval.unref) {
      this.cleanupInterval.unref();
    }
  }

  /**
   * 停止清理定时器
   */
  public destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }
}

// ============== 工具函数 ==============

/**
 * 路径匹配工具
 */
function matchPathPattern(pattern: string, path: string): boolean {
  const regexPattern = pattern
    .replace(/\./g, '\\.')
    .replace(/\*/g, '.*');
  const regex = new RegExp(`^${regexPattern}$`);
  return regex.test(path);
}

/**
 * 从请求中提取标识符
 */
function extractIdentifiers(req: any, config: RateLimitConfig): string[] {
  const identifiers: string[] = [];

  if (config.limitByIP) {
    const ip = req.ip || 
               req.headers?.['x-forwarded-for'] || 
               req.socket?.remoteAddress || 
               'unknown';
    identifiers.push(`ip:${ip}`);
  }

  if (config.limitByUser) {
    const userId = req.user?.id || 
                   req.headers?.['x-user-id'] || 
                   req.session?.userId;
    if (userId) {
      identifiers.push(`user:${userId}`);
    }
  }

  if (identifiers.length === 0) {
    identifiers.push('global');
  }

  return identifiers;
}

// ============== 技能主函数 ==============

/**
 * 创建限流中间件
 * 
 * @param config 限流配置
 * @returns 中间件函数 (兼容 Express/Koa)
 */
export function createRateLimiter(config: RateLimitConfig) {
  const limiter = new TokenBucketLimiter(config);

  return async (req: any, res: any, next: () => void): Promise<void> => {
    const identifiers = extractIdentifiers(req, config);

    // 检查自定义规则
    if (config.rules) {
      const path = req.path || req.url || '';
      const matchedRule = config.rules.find(rule => matchPathPattern(rule.pathPattern, path));
      
      if (matchedRule) {
        const ruleLimiter = new TokenBucketLimiter({
          ...config,
          bucketSize: matchedRule.bucketSize,
          refillRate: matchedRule.refillRate,
        });

        for (const identifier of identifiers) {
          const key = `${matchedRule.name}:${identifier}`;
          const result = ruleLimiter.consume(key);

          if (!result.allowed) {
            setRateLimitHeaders(res, matchedRule.bucketSize, result);
            sendRateLimitError(res, matchedRule.name, result);
            return;
          }
        }
        next();
        return;
      }
    }

    // 默认限流
    for (const identifier of identifiers) {
      const result = limiter.consume(identifier);

      if (!result.allowed) {
        setRateLimitHeaders(res, config.bucketSize, result);
        sendRateLimitError(res, 'Rate limit exceeded', result);
        return;
      }
    }

    next();
  };
}

/**
 * 设置限流响应头
 */
function setRateLimitHeaders(res: any, limit: number, result: RateLimitResult): void {
  res.setHeader?.('X-RateLimit-Limit', limit.toString());
  res.setHeader?.('X-RateLimit-Remaining', result.remaining.toString());
  res.setHeader?.('X-RateLimit-Reset', result.resetTime.toString());
  if (result.retryAfter) {
    res.setHeader?.('Retry-After', result.retryAfter.toString());
  }
}

/**
 * 发送限流错误响应
 */
function sendRateLimitError(res: any, message: string, result: RateLimitResult): void {
  res.statusCode = 429;
  res.end?.(JSON.stringify({
    error: 'Too Many Requests',
    message,
    retryAfter: result.retryAfter,
    resetTime: result.resetTime,
  }));
}

// ============== 预定义配置模板 ==============

/**
 * 预定义限流配置
 */
export const presets = {
  /** 宽松限流：100 请求/分钟 */
  relaxed: {
    bucketSize: 100,
    refillRate: 100 / 60,
    limitByIP: true,
    limitByUser: false,
  } as RateLimitConfig,

  /** 标准限流：60 请求/分钟 */
  standard: {
    bucketSize: 60,
    refillRate: 1,
    limitByIP: true,
    limitByUser: false,
  } as RateLimitConfig,

  /** 严格限流：10 请求/分钟 */
  strict: {
    bucketSize: 10,
    refillRate: 10 / 60,
    limitByIP: true,
    limitByUser: true,
  } as RateLimitConfig,

  /** API 专用：30 请求/分钟，按用户限流 */
  api: {
    bucketSize: 30,
    refillRate: 0.5,
    limitByIP: false,
    limitByUser: true,
  } as RateLimitConfig,

  /** 登录接口：5 请求/分钟，防暴力破解 */
  login: {
    bucketSize: 5,
    refillRate: 5 / 60,
    limitByIP: true,
    limitByUser: false,
  } as RateLimitConfig,

  /** 搜索接口：20 请求/分钟 */
  search: {
    bucketSize: 20,
    refillRate: 20 / 60,
    limitByIP: true,
    limitByUser: false,
  } as RateLimitConfig,
};

// ============== 快捷创建函数 ==============

/**
 * 创建带自定义规则的限流器
 */
export function createRuleBasedLimiter(baseConfig: RateLimitConfig, rules: RateLimitRule[]) {
  return createRateLimiter({
    ...baseConfig,
    rules,
  });
}

/**
 * 创建 IP 限流器
 */
export function createIPLimiter(requestsPerMinute: number = 60) {
  return createRateLimiter({
    bucketSize: requestsPerMinute,
    refillRate: requestsPerMinute / 60,
    limitByIP: true,
    limitByUser: false,
  });
}

/**
 * 创建用户限流器
 */
export function createUserLimiter(requestsPerMinute: number = 100) {
  return createRateLimiter({
    bucketSize: requestsPerMinute,
    refillRate: requestsPerMinute / 60,
    limitByIP: false,
    limitByUser: true,
  });
}

/**
 * 创建混合限流器 (IP + 用户)
 */
export function createHybridLimiter(ipLimit: number = 60, userLimit: number = 100) {
  return createRateLimiter({
    bucketSize: Math.min(ipLimit, userLimit),
    refillRate: Math.min(ipLimit, userLimit) / 60,
    limitByIP: true,
    limitByUser: true,
  });
}

// ============== 导出默认 ==============

export default createRateLimiter;
