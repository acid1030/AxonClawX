/**
 * Advanced Rate Limiter Middleware
 * 
 * 多级限流系统，支持：
 * 1. 滑动窗口限流 (Sliding Window)
 * 2. 分布式限流 (Redis  backed)
 * 3. 动态限流规则 (Dynamic Rules)
 * 
 * @author Axon
 * @version 1.0.0
 */

// ==================== 类型定义 ====================

/**
 * 限流算法类型
 */
export type RateLimitAlgorithm = 'sliding-window' | 'fixed-window' | 'token-bucket' | 'leaky-bucket';

/**
 * Redis 配置
 */
export interface RedisConfig {
  /** Redis 主机 */
  host: string;
  /** Redis 端口 */
  port: number;
  /** Redis 密码 (可选) */
  password?: string;
  /** Redis 数据库索引 */
  db?: number;
  /** 键前缀 */
  keyPrefix?: string;
  /** 连接超时 (毫秒) */
  connectionTimeout?: number;
}

/**
 * 滑动窗口配置
 */
export interface SlidingWindowConfig {
  /** 窗口大小 (毫秒) */
  windowSizeMs: number;
  /** 窗口内最大请求数 */
  maxRequests: number;
  /** 是否使用平滑限流 */
  smooth?: boolean;
}

/**
 * 动态规则配置
 */
export interface DynamicRule {
  /** 规则 ID */
  id: string;
  /** 规则名称 */
  name: string;
  /** 匹配的路径模式 (支持通配符 * 和正则) */
  pathPattern: string;
  /** 匹配的 HTTP 方法 */
  methods?: string[];
  /** 匹配的用户代理模式 */
  userAgentPattern?: string;
  /** 限流算法 */
  algorithm: RateLimitAlgorithm;
  /** 滑动窗口配置 */
  slidingWindow?: SlidingWindowConfig;
  /** 固定窗口配置 */
  fixedWindow?: {
    windowSizeMs: number;
    maxRequests: number;
  };
  /** 令牌桶配置 */
  tokenBucket?: {
    bucketSize: number;
    refillRate: number;
  };
  /** 优先级 (数字越小优先级越高) */
  priority: number;
  /** 是否启用 */
  enabled: boolean;
  /** 自定义条件函数 (服务端执行) */
  customCondition?: (req: any) => boolean;
}

/**
 * 限流配置
 */
export interface AdvancedRateLimitConfig {
  /** 默认算法 */
  defaultAlgorithm: RateLimitAlgorithm;
  /** 默认滑动窗口配置 */
  defaultSlidingWindow: SlidingWindowConfig;
  /** Redis 配置 (可选，不配置则使用内存模式) */
  redis?: RedisConfig;
  /** 动态规则列表 */
  dynamicRules: DynamicRule[];
  /** 全局限流配置 */
  globalLimit?: {
    maxRequests: number;
    windowSizeMs: number;
  };
  /** 是否记录详细日志 */
  verbose?: boolean;
  /** 清理间隔 (毫秒) */
  cleanupIntervalMs?: number;
}

/**
 * 限流结果
 */
export interface RateLimitResult {
  /** 是否允许请求 */
  allowed: boolean;
  /** 使用的规则 ID */
  ruleId?: string;
  /** 限流算法 */
  algorithm: RateLimitAlgorithm;
  /** 剩余请求数 */
  remaining: number;
  /** 窗口重置时间 (毫秒时间戳) */
  resetTime: number;
  /** 重试等待时间 (毫秒) */
  retryAfter?: number;
  /** 当前请求计数 */
  currentCount: number;
  /** 限流元数据 */
  metadata?: {
    /** 窗口开始时间 */
    windowStart: number;
    /** 窗口结束时间 */
    windowEnd: number;
    /** 限流键 */
    limitKey: string;
  };
}

/**
 * 限流统计
 */
export interface RateLimitStats {
  /** 总请求数 */
  totalRequests: number;
  /** 被拒绝的请求数 */
  blockedRequests: number;
  /** 各规则的请求统计 */
  ruleStats: Map<string, RuleStatEntry>;
  /** 限流触发次数 */
  rateLimitHits: number;
}

export interface RuleStatEntry {
  /** 规则 ID */
  ruleId: string;
  /** 规则名称 */
  ruleName: string;
  /** 请求总数 */
  requestCount: number;
  /** 被拒绝次数 */
  blockedCount: number;
  /** 平均响应时间 (毫秒) */
  avgResponseTime: number;
}

// ==================== Redis 客户端抽象 ====================

/**
 * Redis 客户端接口 (兼容 ioredis/node-redis)
 */
interface RedisClient {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, mode?: string, expireTime?: number): Promise<'OK' | null>;
  incr(key: string): Promise<number>;
  expire(key: string, seconds: number): Promise<number>;
  eval(script: string, keys: string[], args: string[]): Promise<any>;
  disconnect(): void;
}

/**
 * 内存存储实现 (用于无 Redis 场景)
 */
class MemoryStore {
  private store: Map<string, { value: string; expiresAt?: number }> = new Map();
  private cleanupInterval?: NodeJS.Timeout;

  constructor(cleanupIntervalMs: number = 60000) {
    this.startCleanup(cleanupIntervalMs);
  }

  async get(key: string): Promise<string | null> {
    const item = this.store.get(key);
    if (!item) return null;
    if (item.expiresAt && Date.now() > item.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return item.value;
  }

  async set(key: string, value: string, mode?: string, expireTime?: number): Promise<'OK' | null> {
    const expiresAt = expireTime ? Date.now() + expireTime : undefined;
    this.store.set(key, { value, expiresAt });
    return 'OK';
  }

  async incr(key: string): Promise<number> {
    const current = await this.get(key);
    const newValue = current ? parseInt(current, 10) + 1 : 1;
    await this.set(key, newValue.toString());
    return newValue;
  }

  async expire(key: string, seconds: number): Promise<number> {
    const item = this.store.get(key);
    if (item) {
      item.expiresAt = Date.now() + seconds * 1000;
      return 1;
    }
    return 0;
  }

  async eval(script: string, keys: string[], args: string[]): Promise<any> {
    // 简化的 Lua 脚本支持 (仅支持滑动窗口)
    if (script.includes('ZADD') && script.includes('ZREMRANGEBYRANK')) {
      const [key, windowStart, windowSize, maxRequests] = args;
      const now = Date.now();
      const windowStartMs = parseInt(windowStart, 10);
      const windowSizeMs = parseInt(windowSize, 10);
      const maxReq = parseInt(maxRequests, 10);

      // 获取当前窗口内的请求
      const currentData = await this.get(key);
      let timestamps: number[] = [];
      if (currentData) {
        timestamps = JSON.parse(currentData);
      }

      // 移除窗口外的请求
      const windowEnd = windowStartMs + windowSizeMs;
      timestamps = timestamps.filter(ts => ts >= windowStartMs && ts <= windowEnd);

      // 检查是否超限
      if (timestamps.length >= maxReq) {
        return [0, timestamps.length, timestamps[0] || now];
      }

      // 添加当前请求
      timestamps.push(now);
      await this.set(key, JSON.stringify(timestamps), undefined, windowSizeMs);

      return [1, timestamps.length, timestamps[0] || now];
    }
    return null;
  }

  disconnect(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.store.clear();
  }

  private startCleanup(cleanupIntervalMs: number): void {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [key, item] of this.store.entries()) {
        if (item.expiresAt && now > item.expiresAt) {
          this.store.delete(key);
        }
      }
    }, cleanupIntervalMs);

    if ((this.cleanupInterval as any).unref) {
      (this.cleanupInterval as any).unref();
    }
  }
}

// ==================== 滑动窗口限流器 ====================

/**
 * 滑动窗口限流器
 */
export class SlidingWindowLimiter {
  private store: RedisClient | MemoryStore;
  private keyPrefix: string;

  constructor(store: RedisClient | MemoryStore, keyPrefix: string = 'ratelimit:sliding:') {
    this.store = store;
    this.keyPrefix = keyPrefix;
  }

  /**
   * 检查请求是否允许
   * 
   * @param key 限流键 (如：ip:192.168.1.1 或 user:123)
   * @param windowSizeMs 窗口大小 (毫秒)
   * @param maxRequests 窗口内最大请求数
   */
  async checkLimit(
    key: string,
    windowSizeMs: number,
    maxRequests: number
  ): Promise<RateLimitResult> {
    const now = Date.now();
    const fullKey = `${this.keyPrefix}${key}`;
    const windowStart = now - windowSizeMs;

    // 使用 Lua 脚本保证原子性
    const luaScript = `
      local key = KEYS[1]
      local windowStart = tonumber(ARGV[1])
      local windowSize = tonumber(ARGV[2])
      local maxRequests = tonumber(ARGV[3])
      local now = tonumber(ARGV[4])

      -- 移除窗口外的请求
      redis.call('ZREMRANGEBYRANGE', key, '-inf', windowStart)

      -- 计算当前窗口内的请求数
      local currentCount = redis.call('ZCARD', key)

      -- 检查是否超限
      if currentCount >= maxRequests then
        local oldestRequest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
        local resetTime = oldestRequest[2] and (oldestRequest[2] + windowSize) or (now + windowSize)
        return {0, currentCount, resetTime}
      end

      -- 添加当前请求
      redis.call('ZADD', key, now, now .. ':' .. math.random())
      redis.call('EXPIRE', key, math.ceil(windowSize / 1000))

      local newCount = currentCount + 1
      local resetTime = now + windowSize

      return {1, newCount, resetTime}
    `;

    try {
      const result = await this.store.eval(
        luaScript,
        [fullKey],
        [windowStart.toString(), windowSizeMs.toString(), maxRequests.toString(), now.toString()]
      );

      const [allowed, count, resetTime] = result as [number, number, number];
      const remaining = Math.max(0, maxRequests - count);

      return {
        allowed: allowed === 1,
        algorithm: 'sliding-window',
        remaining,
        resetTime: Math.floor(resetTime),
        retryAfter: allowed === 0 ? Math.ceil((resetTime - now) / 1000) * 1000 : undefined,
        currentCount: count,
        metadata: {
          windowStart,
          windowEnd: now + windowSizeMs,
          limitKey: fullKey,
        },
      };
    } catch (error) {
      // 降级处理：如果 Redis 失败，允许请求但记录错误
      console.error('[SlidingWindowLimiter] Redis error:', error);
      return {
        allowed: true,
        algorithm: 'sliding-window',
        remaining: maxRequests,
        resetTime: now + windowSizeMs,
        currentCount: 0,
        metadata: {
          windowStart,
          windowEnd: now + windowSizeMs,
          limitKey: fullKey,
        },
      };
    }
  }

  /**
   * 获取当前窗口状态
   */
  async getStatus(key: string, windowSizeMs: number, maxRequests: number): Promise<RateLimitResult> {
    const now = Date.now();
    const fullKey = `${this.keyPrefix}${key}`;
    const windowStart = now - windowSizeMs;

    try {
      // 获取窗口内的请求数
      const count = await this.store.eval(
        `
        local key = KEYS[1]
        local windowStart = tonumber(ARGV[1])
        redis.call('ZREMRANGEBYRANGE', key, '-inf', windowStart)
        return redis.call('ZCARD', key)
        `,
        [fullKey],
        [windowStart.toString()]
      );

      const currentCount = count as number;
      const remaining = Math.max(0, maxRequests - currentCount);

      return {
        allowed: remaining > 0,
        algorithm: 'sliding-window',
        remaining,
        resetTime: now + windowSizeMs,
        currentCount,
        metadata: {
          windowStart,
          windowEnd: now + windowSizeMs,
          limitKey: fullKey,
        },
      };
    } catch (error) {
      console.error('[SlidingWindowLimiter] Get status error:', error);
      return {
        allowed: true,
        algorithm: 'sliding-window',
        remaining: maxRequests,
        resetTime: now + windowSizeMs,
        currentCount: 0,
        metadata: {
          windowStart,
          windowEnd: now + windowSizeMs,
          limitKey: fullKey,
        },
      };
    }
  }
}

// ==================== 动态规则管理器 ====================

/**
 * 动态规则管理器
 */
export class DynamicRuleManager {
  private rules: Map<string, DynamicRule> = new Map();
  private ruleOrder: string[] = [];

  constructor(initialRules: DynamicRule[] = []) {
    initialRules.forEach(rule => this.addRule(rule));
  }

  /**
   * 添加规则
   */
  addRule(rule: DynamicRule): void {
    if (this.rules.has(rule.id)) {
      // 更新现有规则
      this.rules.set(rule.id, rule);
    } else {
      // 添加新规则
      this.rules.set(rule.id, rule);
      this.ruleOrder.push(rule.id);
      // 按优先级排序
      this.ruleOrder.sort((a, b) => {
        const ruleA = this.rules.get(a)!;
        const ruleB = this.rules.get(b)!;
        return ruleA.priority - ruleB.priority;
      });
    }
  }

  /**
   * 移除规则
   */
  removeRule(ruleId: string): boolean {
    if (this.rules.delete(ruleId)) {
      this.ruleOrder = this.ruleOrder.filter(id => id !== ruleId);
      return true;
    }
    return false;
  }

  /**
   * 更新规则
   */
  updateRule(ruleId: string, updates: Partial<DynamicRule>): boolean {
    const rule = this.rules.get(ruleId);
    if (!rule) return false;

    const updatedRule = { ...rule, ...updates };
    this.rules.set(ruleId, updatedRule);

    // 重新排序
    this.ruleOrder.sort((a, b) => {
      const ruleA = this.rules.get(a)!;
      const ruleB = this.rules.get(b)!;
      return ruleA.priority - ruleB.priority;
    });

    return true;
  }

  /**
   * 启用/禁用规则
   */
  toggleRule(ruleId: string, enabled: boolean): boolean {
    return this.updateRule(ruleId, { enabled });
  }

  /**
   * 匹配规则
   */
  matchRule(req: any): DynamicRule | null {
    const path = req.path || req.url || '';
    const method = req.method || 'GET';
    const userAgent = req.headers?.['user-agent'] || '';

    for (const ruleId of this.ruleOrder) {
      const rule = this.rules.get(ruleId);
      if (!rule || !rule.enabled) continue;

      // 检查路径匹配
      if (!this.matchPath(rule.pathPattern, path)) continue;

      // 检查方法匹配
      if (rule.methods && !rule.methods.includes(method)) continue;

      // 检查用户代理匹配
      if (rule.userAgentPattern && !this.matchPattern(rule.userAgentPattern, userAgent)) continue;

      // 检查自定义条件
      if (rule.customCondition && !rule.customCondition(req)) continue;

      return rule;
    }

    return null;
  }

  /**
   * 获取所有规则
   */
  getAllRules(): DynamicRule[] {
    return this.ruleOrder.map(id => this.rules.get(id)!);
  }

  /**
   * 获取规则
   */
  getRule(ruleId: string): DynamicRule | undefined {
    return this.rules.get(ruleId);
  }

  /**
   * 路径匹配 (支持通配符 * 和 **)
   */
  private matchPath(pattern: string, path: string): boolean {
    // 处理 ** (匹配任意路径)
    if (pattern === '**') return true;

    // 转换为正则表达式
    const regexPattern = pattern
      .replace(/\./g, '\\.')
      .replace(/\*\*/g, '.*')
      .replace(/\*/g, '[^/]*');

    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(path);
  }

  /**
   * 模式匹配 (用于用户代理等)
   */
  private matchPattern(pattern: string, text: string): boolean {
    const regex = new RegExp(pattern, 'i');
    return regex.test(text);
  }
}

// ==================== 高级限流器主类 ====================

/**
 * 高级限流器
 */
export class AdvancedRateLimiter {
  private config: AdvancedRateLimitConfig;
  private store: RedisClient | MemoryStore;
  private slidingWindowLimiter: SlidingWindowLimiter;
  private ruleManager: DynamicRuleManager;
  private stats: RateLimitStats;
  private cleanupInterval?: NodeJS.Timeout;

  constructor(config: AdvancedRateLimitConfig) {
    this.config = {
      ...config,
      verbose: config.verbose ?? false,
      cleanupIntervalMs: config.cleanupIntervalMs ?? 60000,
    };

    // 初始化存储
    if (config.redis) {
      // 注意：实际使用时需要传入 Redis 客户端实例
      // 这里使用 MemoryStore 作为占位符
      console.warn('[AdvancedRateLimiter] Redis config provided but no client instance. Using MemoryStore.');
      this.store = new MemoryStore(this.config.cleanupIntervalMs);
    } else {
      this.store = new MemoryStore(this.config.cleanupIntervalMs);
    }

    this.slidingWindowLimiter = new SlidingWindowLimiter(
      this.store,
      config.redis?.keyPrefix || 'ratelimit:sliding:'
    );

    this.ruleManager = new DynamicRuleManager(config.dynamicRules);

    this.stats = {
      totalRequests: 0,
      blockedRequests: 0,
      ruleStats: new Map(),
      rateLimitHits: 0,
    };

    this.startCleanup();
  }

  /**
   * 处理请求
   */
  async processRequest(req: any): Promise<RateLimitResult> {
    const startTime = Date.now();
    const identifier = this.getIdentifier(req);

    // 1. 检查全局限流
    if (this.config.globalLimit) {
      const globalResult = await this.slidingWindowLimiter.checkLimit(
        `global`,
        this.config.globalLimit.windowSizeMs,
        this.config.globalLimit.maxRequests
      );

      if (!globalResult.allowed) {
        this.stats.blockedRequests++;
        this.stats.rateLimitHits++;
        return {
          ...globalResult,
          ruleId: 'global',
        };
      }
    }

    // 2. 匹配动态规则
    const matchedRule = this.ruleManager.matchRule(req);

    if (matchedRule) {
      // 使用匹配的规则进行限流
      const result = await this.applyRule(matchedRule, identifier, req);
      this.updateStats(matchedRule.id, matchedRule.name, !result.allowed, startTime);
      return {
        ...result,
        ruleId: matchedRule.id,
      };
    }

    // 3. 使用默认配置
    const defaultResult = await this.slidingWindowLimiter.checkLimit(
      identifier,
      this.config.defaultSlidingWindow.windowSizeMs,
      this.config.defaultSlidingWindow.maxRequests
    );

    this.updateStats('default', 'Default', !defaultResult.allowed, startTime);
    return {
      ...defaultResult,
      ruleId: 'default',
    };
  }

  /**
   * 应用规则限流
   */
  private async applyRule(rule: DynamicRule, identifier: string, req: any): Promise<RateLimitResult> {
    const key = `${rule.id}:${identifier}`;

    switch (rule.algorithm) {
      case 'sliding-window':
        if (!rule.slidingWindow) {
          throw new Error(`Rule ${rule.id} missing slidingWindow config`);
        }
        return await this.slidingWindowLimiter.checkLimit(
          key,
          rule.slidingWindow.windowSizeMs,
          rule.slidingWindow.maxRequests
        );

      case 'fixed-window':
        if (!rule.fixedWindow) {
          throw new Error(`Rule ${rule.id} missing fixedWindow config`);
        }
        return await this.slidingWindowLimiter.checkLimit(
          key,
          rule.fixedWindow.windowSizeMs,
          rule.fixedWindow.maxRequests
        );

      case 'token-bucket':
        // TODO: 实现令牌桶算法
        console.warn('[AdvancedRateLimiter] Token bucket algorithm not yet implemented, using sliding window');
        return await this.slidingWindowLimiter.checkLimit(
          key,
          this.config.defaultSlidingWindow.windowSizeMs,
          this.config.defaultSlidingWindow.maxRequests
        );

      case 'leaky-bucket':
        // TODO: 实现漏桶算法
        console.warn('[AdvancedRateLimiter] Leaky bucket algorithm not yet implemented, using sliding window');
        return await this.slidingWindowLimiter.checkLimit(
          key,
          this.config.defaultSlidingWindow.windowSizeMs,
          this.config.defaultSlidingWindow.maxRequests
        );

      default:
        throw new Error(`Unknown algorithm: ${rule.algorithm}`);
    }
  }

  /**
   * 获取请求标识符
   */
  private getIdentifier(req: any): string {
    // 优先使用用户 ID
    const userId = req.user?.id || req.headers?.['x-user-id'] || req.session?.userId;
    if (userId) {
      return `user:${userId}`;
    }

    // 使用 IP 地址
    const ip = req.ip ||
      req.headers?.['x-forwarded-for']?.split(',')[0]?.trim() ||
      req.headers?.['x-real-ip'] ||
      req.socket?.remoteAddress ||
      'unknown';

    return `ip:${ip}`;
  }

  /**
   * 更新统计
   */
  private updateStats(ruleId: string, ruleName: string, blocked: boolean, startTime: number): void {
    this.stats.totalRequests++;
    if (blocked) {
      this.stats.blockedRequests++;
    }

    if (!this.stats.ruleStats.has(ruleId)) {
      this.stats.ruleStats.set(ruleId, {
        ruleId,
        ruleName,
        requestCount: 0,
        blockedCount: 0,
        avgResponseTime: 0,
      });
    }

    const entry = this.stats.ruleStats.get(ruleId)!;
    entry.requestCount++;
    if (blocked) {
      entry.blockedCount++;
    }

    // 更新平均响应时间
    const responseTime = Date.now() - startTime;
    entry.avgResponseTime = (entry.avgResponseTime * (entry.requestCount - 1) + responseTime) / entry.requestCount;
  }

  /**
   * 获取统计
   */
  getStats(): RateLimitStats {
    return { ...this.stats };
  }

  /**
   * 获取规则管理器
   */
  getRuleManager(): DynamicRuleManager {
    return this.ruleManager;
  }

  /**
   * 启动清理任务
   */
  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      // 清理旧统计 (保留 1 小时)
      const cutoff = Date.now() - 3600000;
      // 这里可以添加更多清理逻辑
    }, this.config.cleanupIntervalMs);

    if ((this.cleanupInterval as any).unref) {
      (this.cleanupInterval as any).unref();
    }
  }

  /**
   * 销毁限流器
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    if (this.store instanceof MemoryStore || (this.store as any).disconnect) {
      (this.store as any).disconnect();
    }
  }
}

// ==================== 中间件工厂 ====================

/**
 * 创建高级限流中间件
 * 
 * @param config 限流配置
 * @returns Express/Koa 风格的中间件函数
 */
export function createAdvancedRateLimiter(config: AdvancedRateLimitConfig) {
  const limiter = new AdvancedRateLimiter(config);

  return async (
    req: any,
    res: any,
    next: () => void
  ): Promise<void> => {
    try {
      const result = await limiter.processRequest(req);

      // 添加限流响应头
      res.setHeader('X-RateLimit-Limit', result.currentCount.toString());
      res.setHeader('X-RateLimit-Remaining', result.remaining.toString());
      res.setHeader('X-RateLimit-Reset', result.resetTime.toString());
      res.setHeader('X-RateLimit-Algorithm', result.algorithm);

      if (result.ruleId) {
        res.setHeader('X-RateLimit-Rule', result.ruleId);
      }

      if (result.metadata) {
        res.setHeader('X-RateLimit-Window-Start', result.metadata.windowStart.toString());
        res.setHeader('X-RateLimit-Window-End', result.metadata.windowEnd.toString());
      }

      if (!result.allowed) {
        if (result.retryAfter) {
          res.setHeader('Retry-After', Math.ceil(result.retryAfter / 1000).toString());
        }

        res.statusCode = 429;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({
          error: 'Too Many Requests',
          message: 'Rate limit exceeded',
          algorithm: result.algorithm,
          ruleId: result.ruleId,
          remaining: result.remaining,
          resetTime: result.resetTime,
          retryAfter: result.retryAfter ? Math.ceil(result.retryAfter / 1000) : undefined,
        }));
        return;
      }

      next();
    } catch (error) {
      console.error('[AdvancedRateLimiter] Error:', error);
      // 发生错误时允许请求通过 (fail-open)
      next();
    }
  };
}

// ==================== 预设规则模板 ====================

/**
 * 预定义的动态规则模板
 */
export const presetRules = {
  /** API 限流：100 请求/分钟 */
  api: {
    id: 'api-limit',
    name: 'API Rate Limit',
    pathPattern: '/api/**',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    algorithm: 'sliding-window' as RateLimitAlgorithm,
    slidingWindow: {
      windowSizeMs: 60000, // 1 分钟
      maxRequests: 100,
    },
    priority: 10,
    enabled: true,
  } as DynamicRule,

  /** 登录接口限流：5 请求/分钟 */
  auth: {
    id: 'auth-limit',
    name: 'Authentication Rate Limit',
    pathPattern: '/auth/**',
    methods: ['POST'],
    algorithm: 'sliding-window' as RateLimitAlgorithm,
    slidingWindow: {
      windowSizeMs: 60000, // 1 分钟
      maxRequests: 5,
    },
    priority: 5,
    enabled: true,
  } as DynamicRule,

  /** 文件上传限流：10 请求/小时 */
  upload: {
    id: 'upload-limit',
    name: 'File Upload Rate Limit',
    pathPattern: '/upload/**',
    methods: ['POST'],
    algorithm: 'sliding-window' as RateLimitAlgorithm,
    slidingWindow: {
      windowSizeMs: 3600000, // 1 小时
      maxRequests: 10,
    },
    priority: 8,
    enabled: true,
  } as DynamicRule,

  /** 搜索接口限流：30 请求/分钟 */
  search: {
    id: 'search-limit',
    name: 'Search Rate Limit',
    pathPattern: '/search/**',
    methods: ['GET'],
    algorithm: 'sliding-window' as RateLimitAlgorithm,
    slidingWindow: {
      windowSizeMs: 60000, // 1 分钟
      maxRequests: 30,
    },
    priority: 12,
    enabled: true,
  } as DynamicRule,

  /** Webhook 限流：1000 请求/分钟 */
  webhook: {
    id: 'webhook-limit',
    name: 'Webhook Rate Limit',
    pathPattern: '/webhook/**',
    userAgentPattern: '.*webhook.*',
    algorithm: 'sliding-window' as RateLimitAlgorithm,
    slidingWindow: {
      windowSizeMs: 60000, // 1 分钟
      maxRequests: 1000,
    },
    priority: 20,
    enabled: true,
  } as DynamicRule,
};

/**
 * 预设配置
 */
export const presets = {
  /** 开发环境 */
  development: {
    defaultAlgorithm: 'sliding-window' as RateLimitAlgorithm,
    defaultSlidingWindow: {
      windowSizeMs: 60000,
      maxRequests: 1000,
    },
    dynamicRules: [],
    globalLimit: {
      maxRequests: 10000,
      windowSizeMs: 60000,
    },
    verbose: true,
  } as AdvancedRateLimitConfig,

  /** 生产环境 */
  production: {
    defaultAlgorithm: 'sliding-window' as RateLimitAlgorithm,
    defaultSlidingWindow: {
      windowSizeMs: 60000,
      maxRequests: 100,
    },
    dynamicRules: [
      presetRules.api,
      presetRules.auth,
      presetRules.upload,
      presetRules.search,
    ],
    globalLimit: {
      maxRequests: 5000,
      windowSizeMs: 60000,
    },
    verbose: false,
  } as AdvancedRateLimitConfig,

  /** API 网关 */
  apiGateway: {
    defaultAlgorithm: 'sliding-window' as RateLimitAlgorithm,
    defaultSlidingWindow: {
      windowSizeMs: 60000,
      maxRequests: 60,
    },
    dynamicRules: [
      presetRules.auth,
      presetRules.api,
      presetRules.search,
      presetRules.webhook,
    ],
    globalLimit: {
      maxRequests: 10000,
      windowSizeMs: 60000,
    },
    verbose: false,
  } as AdvancedRateLimitConfig,
};

export default createAdvancedRateLimiter;
