/**
 * Global Rate Limiter Middleware
 * 
 * 应用级全局限流中间件，支持：
 * 1. 全局请求限流 (令牌桶算法)
 * 2. IP 黑名单 (永久/临时封禁)
 * 3. 限流统计 (实时监控 + 历史记录)
 * 
 * @author Axon
 * @version 1.0.0
 */

// ==================== 类型定义 ====================

export interface GlobalRateLimitConfig {
  /** 全局桶容量 (最大并发请求数) */
  globalBucketSize: number;
  /** 全局令牌补充速率 (每秒) */
  globalRefillRate: number;
  /** 按 IP 限流：桶容量 */
  ipBucketSize?: number;
  /** 按 IP 限流：补充速率 */
  ipRefillRate?: number;
  /** IP 黑名单检查间隔 (毫秒) */
  blacklistCheckIntervalMs?: number;
  /** 统计信息保留时间 (小时) */
  statsRetentionHours?: number;
  /** 临时封禁时长 (毫秒) */
  temporaryBanDurationMs?: number;
}

export interface IPBlacklistEntry {
  /** IP 地址 */
  ip: string;
  /** 封禁原因 */
  reason: string;
  /** 是否永久封禁 */
  permanent: boolean;
  /** 封禁开始时间 */
  bannedAt: number;
  /** 封禁结束时间 (临时封禁) */
  expiresAt?: number;
  /** 触发封禁的请求次数 */
  violationCount: number;
}

export interface RateLimitStats {
  /** 总请求数 */
  totalRequests: number;
  /** 被拒绝的请求数 */
  blockedRequests: number;
  /** 当前活跃 IP 数 */
  activeIPs: number;
  /** 黑名单中的 IP 数 */
  blacklistedIPs: number;
  /** 限流触发次数 */
  rateLimitHits: number;
  /** 黑名单触发次数 */
  blacklistHits: number;
  /** 时间窗口内的请求分布 (时间戳 -> 请求数) */
  requestDistribution: Map<number, number>;
  /** 各 IP 的请求统计 */
  ipStats: Map<string, IPStatEntry>;
}

export interface IPStatEntry {
  /** IP 地址 */
  ip: string;
  /** 请求总数 */
  requestCount: number;
  /** 被拒绝次数 */
  blockedCount: number;
  /** 首次请求时间 */
  firstSeen: number;
  /** 最后请求时间 */
  lastSeen: number;
  /** 平均响应时间 (毫秒) */
  avgResponseTime?: number;
}

export interface RateLimitResult {
  /** 是否允许请求 */
  allowed: boolean;
  /** 拒绝原因 */
  reason?: 'rate-limit' | 'blacklist' | 'global-limit';
  /** 剩余令牌数 */
  remaining?: number;
  /** 重置时间 */
  resetTime?: number;
  /** 重试等待时间 (毫秒) */
  retryAfter?: number;
  /** IP 黑名单信息 */
  blacklistInfo?: IPBlacklistEntry;
}

interface TokenBucket {
  tokens: number;
  lastRefill: number;
  capacity: number;
  refillRate: number;
}

// ==================== 全局限流器类 ====================

export class GlobalRateLimiter {
  private config: GlobalRateLimitConfig;
  
  // 令牌桶
  private globalBucket: TokenBucket;
  private ipBuckets: Map<string, TokenBucket> = new Map();
  
  // IP 黑名单
  private blacklist: Map<string, IPBlacklistEntry> = new Map();
  private temporaryBlacklist: Map<string, IPBlacklistEntry> = new Map();
  
  // 统计数据
  private stats: RateLimitStats;
  private statsHistory: Array<{ timestamp: number; stats: RateLimitStats }> = [];
  
  // 清理定时器
  private cleanupInterval?: NodeJS.Timeout;
  private statsCleanupInterval?: NodeJS.Timeout;

  constructor(config: GlobalRateLimitConfig) {
    this.config = {
      globalBucketSize: config.globalBucketSize,
      globalRefillRate: config.globalRefillRate,
      ipBucketSize: config.ipBucketSize || config.globalBucketSize / 10,
      ipRefillRate: config.ipRefillRate || config.globalRefillRate / 10,
      blacklistCheckIntervalMs: config.blacklistCheckIntervalMs || 5000,
      statsRetentionHours: config.statsRetentionHours || 24,
      temporaryBanDurationMs: config.temporaryBanDurationMs || 3600000, // 1 小时
    };

    // 初始化全局令牌桶
    this.globalBucket = {
      tokens: this.config.globalBucketSize,
      lastRefill: Date.now(),
      capacity: this.config.globalBucketSize,
      refillRate: this.config.globalRefillRate,
    };

    // 初始化统计数据
    this.stats = this.createInitialStats();

    // 启动清理任务
    this.startCleanupTasks();
  }

  private createInitialStats(): RateLimitStats {
    return {
      totalRequests: 0,
      blockedRequests: 0,
      activeIPs: 0,
      blacklistedIPs: 0,
      rateLimitHits: 0,
      blacklistHits: 0,
      requestDistribution: new Map(),
      ipStats: new Map(),
    };
  }

  // ==================== 核心限流逻辑 ====================

  /**
   * 处理请求
   */
  public processRequest(ip: string, metadata?: any): RateLimitResult {
    const now = Date.now();

    // 1. 检查黑名单
    const blacklistCheck = this.checkBlacklist(ip);
    if (!blacklistCheck.allowed) {
      this.stats.blacklistHits++;
      this.stats.blockedRequests++;
      this.updateIPStats(ip, true, now);
      return blacklistCheck;
    }

    // 2. 检查全局限流
    const globalCheck = this.consumeGlobalBucket();
    if (!globalCheck.allowed) {
      this.stats.rateLimitHits++;
      this.stats.blockedRequests++;
      this.updateIPStats(ip, true, now);
      return {
        allowed: false,
        reason: 'global-limit',
        remaining: globalCheck.remaining,
        resetTime: globalCheck.resetTime,
        retryAfter: globalCheck.retryAfter,
      };
    }

    // 3. 检查 IP 限流 (如果启用)
    if (this.config.ipBucketSize && this.config.ipRefillRate) {
      const ipCheck = this.consumeIPBucket(ip);
      if (!ipCheck.allowed) {
        this.stats.rateLimitHits++;
        this.stats.blockedRequests++;
        this.updateIPStats(ip, true, now);
        
        // 频繁触发限流可能触发临时封禁
        this.checkForTemporaryBan(ip, now);
        
        return {
          allowed: false,
          reason: 'rate-limit',
          remaining: ipCheck.remaining,
          resetTime: ipCheck.resetTime,
          retryAfter: ipCheck.retryAfter,
        };
      }
    }

    // 4. 请求通过
    this.stats.totalRequests++;
    this.updateIPStats(ip, false, now);
    this.updateRequestDistribution(now);

    return {
      allowed: true,
      remaining: Math.floor(this.globalBucket.tokens),
    };
  }

  /**
   * 消费全局令牌桶
   */
  private consumeGlobalBucket(): { allowed: boolean; remaining: number; resetTime: number; retryAfter?: number } {
    const now = Date.now();
    this.refillBucket(this.globalBucket, now);

    const resetTime = now + Math.ceil((this.globalBucket.capacity - this.globalBucket.tokens) / this.globalBucket.refillRate) * 1000;

    if (this.globalBucket.tokens >= 1) {
      this.globalBucket.tokens -= 1;
      return {
        allowed: true,
        remaining: Math.floor(this.globalBucket.tokens),
        resetTime,
      };
    }

    const tokensNeeded = 1 - this.globalBucket.tokens;
    const waitTimeMs = Math.ceil((tokensNeeded / this.globalBucket.refillRate) * 1000);

    return {
      allowed: false,
      remaining: 0,
      resetTime,
      retryAfter: waitTimeMs,
    };
  }

  /**
   * 消费 IP 令牌桶
   */
  private consumeIPBucket(ip: string): { allowed: boolean; remaining: number; resetTime: number; retryAfter?: number } {
    const now = Date.now();
    
    if (!this.ipBuckets.has(ip)) {
      this.ipBuckets.set(ip, {
        tokens: this.config.ipBucketSize!,
        lastRefill: now,
        capacity: this.config.ipBucketSize!,
        refillRate: this.config.ipRefillRate!,
      });
    }

    const bucket = this.ipBuckets.get(ip)!;
    this.refillBucket(bucket, now);

    const resetTime = now + Math.ceil((bucket.capacity - bucket.tokens) / bucket.refillRate) * 1000;

    if (bucket.tokens >= 1) {
      bucket.tokens -= 1;
      return {
        allowed: true,
        remaining: Math.floor(bucket.tokens),
        resetTime,
      };
    }

    const tokensNeeded = 1 - bucket.tokens;
    const waitTimeMs = Math.ceil((tokensNeeded / bucket.refillRate) * 1000);

    return {
      allowed: false,
      remaining: 0,
      resetTime,
      retryAfter: waitTimeMs,
    };
  }

  /**
   * 补充令牌桶
   */
  private refillBucket(bucket: TokenBucket, now: number): void {
    const timePassed = (now - bucket.lastRefill) / 1000;
    const tokensToAdd = timePassed * bucket.refillRate;
    bucket.tokens = Math.min(bucket.capacity, bucket.tokens + tokensToAdd);
    bucket.lastRefill = now;
  }

  // ==================== IP 黑名单管理 ====================

  /**
   * 检查 IP 是否在黑名单中
   */
  private checkBlacklist(ip: string): RateLimitResult {
    const now = Date.now();

    // 检查永久黑名单
    if (this.blacklist.has(ip)) {
      const entry = this.blacklist.get(ip)!;
      return {
        allowed: false,
        reason: 'blacklist',
        blacklistInfo: entry,
      };
    }

    // 检查临时黑名单
    if (this.temporaryBlacklist.has(ip)) {
      const entry = this.temporaryBlacklist.get(ip)!;
      if (entry.expiresAt && now < entry.expiresAt) {
        return {
          allowed: false,
          reason: 'blacklist',
          blacklistInfo: entry,
        };
      } else {
        // 临时封禁已过期，移除
        this.temporaryBlacklist.delete(ip);
      }
    }

    return { allowed: true };
  }

  /**
   * 添加 IP 到黑名单
   */
  public addToBlacklist(ip: string, reason: string, permanent: boolean = false): void {
    const now = Date.now();
    const entry: IPBlacklistEntry = {
      ip,
      reason,
      permanent,
      bannedAt: now,
      violationCount: this.stats.ipStats.get(ip)?.blockedCount || 0,
    };

    if (!permanent) {
      entry.expiresAt = now + this.config.temporaryBanDurationMs!;
      this.temporaryBlacklist.set(ip, entry);
    } else {
      this.blacklist.set(ip, entry);
    }

    this.stats.blacklistedIPs = this.blacklist.size + this.temporaryBlacklist.size;
  }

  /**
   * 从黑名单移除 IP
   */
  public removeFromBlacklist(ip: string): boolean {
    if (this.blacklist.has(ip)) {
      this.blacklist.delete(ip);
      this.stats.blacklistedIPs = this.blacklist.size + this.temporaryBlacklist.size;
      return true;
    }
    
    if (this.temporaryBlacklist.has(ip)) {
      this.temporaryBlacklist.delete(ip);
      this.stats.blacklistedIPs = this.blacklist.size + this.temporaryBlacklist.size;
      return true;
    }

    return false;
  }

  /**
   * 检查是否需要临时封禁 IP
   */
  private checkForTemporaryBan(ip: string, now: number): void {
    const ipStat = this.stats.ipStats.get(ip);
    if (!ipStat) return;

    // 如果短时间内被拒绝超过阈值，触发临时封禁
    const recentBlocks = ipStat.blockedCount;
    const threshold = this.config.ipBucketSize! * 3; // 3 倍桶容量

    if (recentBlocks >= threshold && !this.blacklist.has(ip) && !this.temporaryBlacklist.has(ip)) {
      this.addToBlacklist(ip, `自动封禁：短时间内触发限流 ${recentBlocks} 次`, false);
    }
  }

  /**
   * 获取黑名单列表
   */
  public getBlacklist(): IPBlacklistEntry[] {
    return [...this.blacklist.values(), ...this.temporaryBlacklist.values()];
  }

  // ==================== 统计功能 ====================

  /**
   * 更新 IP 统计
   */
  private updateIPStats(ip: string, blocked: boolean, timestamp: number): void {
    const now = timestamp || Date.now();
    
    if (!this.stats.ipStats.has(ip)) {
      this.stats.ipStats.set(ip, {
        ip,
        requestCount: 0,
        blockedCount: 0,
        firstSeen: now,
        lastSeen: now,
      });
    }

    const entry = this.stats.ipStats.get(ip)!;
    entry.requestCount++;
    if (blocked) {
      entry.blockedCount++;
    }
    entry.lastSeen = now;

    this.stats.activeIPs = this.stats.ipStats.size;
    this.stats.blacklistedIPs = this.blacklist.size + this.temporaryBlacklist.size;
  }

  /**
   * 更新请求分布
   */
  private updateRequestDistribution(timestamp: number): void {
    const windowSize = 60000; // 1 分钟窗口
    const windowKey = Math.floor(timestamp / windowSize) * windowSize;

    const current = this.stats.requestDistribution.get(windowKey) || 0;
    this.stats.requestDistribution.set(windowKey, current + 1);

    // 清理旧数据 (保留 1 小时)
    const cutoff = timestamp - 3600000;
    for (const key of this.stats.requestDistribution.keys()) {
      if (key < cutoff) {
        this.stats.requestDistribution.delete(key);
      }
    }
  }

  /**
   * 获取统计数据
   */
  public getStats(): RateLimitStats {
    return { ...this.stats };
  }

  /**
   * 获取历史统计
   */
  public getStatsHistory(): Array<{ timestamp: number; stats: RateLimitStats }> {
    return [...this.statsHistory];
  }

  /**
   * 重置统计
   */
  public resetStats(): void {
    this.stats = this.createInitialStats();
  }

  // ==================== 清理任务 ====================

  /**
   * 启动清理任务
   */
  private startCleanupTasks(): void {
    // 清理临时黑名单
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [ip, entry] of this.temporaryBlacklist.entries()) {
        if (entry.expiresAt && now >= entry.expiresAt) {
          this.temporaryBlacklist.delete(ip);
        }
      }
      this.stats.blacklistedIPs = this.blacklist.size + this.temporaryBlacklist.size;
    }, this.config.blacklistCheckIntervalMs);

    // 清理历史统计
    const retentionMs = this.config.statsRetentionHours! * 3600000;
    this.statsCleanupInterval = setInterval(() => {
      const now = Date.now();
      const cutoff = now - retentionMs;
      this.statsHistory = this.statsHistory.filter(entry => entry.timestamp > cutoff);
    }, 60000); // 每分钟检查

    // 允许进程退出时清理
    if (this.cleanupInterval.unref) {
      this.cleanupInterval.unref();
    }
    if (this.statsCleanupInterval.unref) {
      this.statsCleanupInterval.unref();
    }
  }

  /**
   * 销毁限流器
   */
  public destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    if (this.statsCleanupInterval) {
      clearInterval(this.statsCleanupInterval);
    }
  }
}

// ==================== 中间件工厂 ====================

/**
 * 创建全局限流中间件
 * 
 * @param config 限流配置
 * @returns Express/Koa 风格的中间件函数
 */
export function createGlobalRateLimiter(config: GlobalRateLimitConfig) {
  const limiter = new GlobalRateLimiter(config);

  return async (
    req: any,
    res: any,
    next: () => void
  ): Promise<void> => {
    const startTime = Date.now();
    
    // 获取 IP 地址
    const ip = req.ip || 
               req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 
               req.headers['x-real-ip'] || 
               req.socket?.remoteAddress || 
               'unknown';

    // 处理请求
    const result = limiter.processRequest(ip, {
      path: req.path,
      method: req.method,
      userAgent: req.headers['user-agent'],
    });

    // 添加限流响应头
    res.setHeader('X-RateLimit-Global-Limit', config.globalBucketSize.toString());
    res.setHeader('X-RateLimit-Global-Remaining', (result.remaining || 0).toString());
    
    if (result.resetTime) {
      res.setHeader('X-RateLimit-Global-Reset', result.resetTime.toString());
    }

    if (!result.allowed) {
      if (result.reason === 'blacklist') {
        res.setHeader('X-Blacklisted', 'true');
        if (result.blacklistInfo) {
          res.setHeader('X-Blacklist-Reason', result.blacklistInfo.reason);
          if (result.blacklistInfo.expiresAt) {
            res.setHeader('X-Blacklist-Expires', result.blacklistInfo.expiresAt.toString());
          }
        }
      }

      if (result.retryAfter) {
        res.setHeader('Retry-After', Math.ceil(result.retryAfter / 1000).toString());
      }

      res.statusCode = 429;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({
        error: result.reason === 'blacklist' ? 'Forbidden' : 'Too Many Requests',
        message: result.reason === 'blacklist' 
          ? `IP ${ip} has been blacklisted: ${result.blacklistInfo?.reason}`
          : 'Rate limit exceeded',
        reason: result.reason,
        retryAfter: result.retryAfter ? Math.ceil(result.retryAfter / 1000) : undefined,
        blacklistInfo: result.blacklistInfo ? {
          reason: result.blacklistInfo.reason,
          permanent: result.blacklistInfo.permanent,
          expiresAt: result.blacklistInfo.expiresAt,
        } : undefined,
      }));
      return;
    }

    // 请求成功，记录响应时间
    const responseTime = Date.now() - startTime;
    const ipStat = limiter.getStats().ipStats.get(ip);
    if (ipStat) {
      ipStat.avgResponseTime = responseTime;
    }

    next();
  };
}

// ==================== 管理 API 辅助函数 ====================

/**
 * 创建限流管理 API 处理器
 */
export function createRateLimitAdminAPI(limiter: GlobalRateLimiter) {
  return {
    /** 获取统计信息 */
    getStats: () => limiter.getStats(),
    
    /** 获取黑名单 */
    getBlacklist: () => limiter.getBlacklist(),
    
    /** 添加 IP 到黑名单 */
    addBlacklist: (ip: string, reason: string, permanent: boolean = false) => {
      limiter.addToBlacklist(ip, reason, permanent);
      return { success: true, ip };
    },
    
    /** 从黑名单移除 IP */
    removeBlacklist: (ip: string) => {
      const removed = limiter.removeFromBlacklist(ip);
      return { success: removed, ip };
    },
    
    /** 重置统计 */
    resetStats: () => {
      limiter.resetStats();
      return { success: true };
    },
  };
}

// ==================== 预设配置 ====================

export const presets = {
  /** 开发环境：宽松限流 */
  development: {
    globalBucketSize: 1000,
    globalRefillRate: 100,
    ipBucketSize: 100,
    ipRefillRate: 10,
  } as GlobalRateLimitConfig,

  /** 生产环境：标准限流 */
  production: {
    globalBucketSize: 500,
    globalRefillRate: 50,
    ipBucketSize: 50,
    ipRefillRate: 5,
  } as GlobalRateLimitConfig,

  /** 高并发场景：激进限流 */
  highTraffic: {
    globalBucketSize: 2000,
    globalRefillRate: 200,
    ipBucketSize: 100,
    ipRefillRate: 10,
  } as GlobalRateLimitConfig,

  /** API 网关：严格限流 */
  apiGateway: {
    globalBucketSize: 100,
    globalRefillRate: 10,
    ipBucketSize: 20,
    ipRefillRate: 2,
    temporaryBanDurationMs: 1800000, // 30 分钟
  } as GlobalRateLimitConfig,
};

export default createGlobalRateLimiter;
