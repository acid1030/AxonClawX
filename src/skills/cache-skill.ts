/**
 * 缓存技能 - Cache Skill
 * 
 * 功能:
 * 1. 内存缓存 (支持 Redis 可选)
 * 2. TTL 过期机制
 * 3. 缓存穿透保护 (布隆过滤器 + 空值缓存)
 * 
 * @author Axon
 * @version 1.0.0
 */

// ============== 类型定义 ==============

export interface CacheConfig {
  /** 缓存类型：memory | redis */
  type: 'memory' | 'redis';
  /** 默认 TTL (秒) */
  defaultTTL: number;
  /** 最大缓存条目数 (仅 memory 模式) */
  maxSize?: number;
  /** Redis 连接配置 (仅 redis 模式) */
  redis?: RedisConfig;
  /** 缓存穿透保护配置 */
  penetrationProtection?: PenetrationProtectionConfig;
  /** 是否启用统计 */
  enableStats?: boolean;
}

export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db?: number;
  keyPrefix?: string;
}

export interface PenetrationProtectionConfig {
  /** 启用布隆过滤器 */
  enableBloomFilter?: boolean;
  /** 布隆过滤器预期元素数量 */
  expectedItems?: number;
  /** 布隆过滤器误判率 */
  falsePositiveRate?: number;
  /** 空值缓存 TTL (秒) */
  nullCacheTTL?: number;
  /** 缓存空值 */
  cacheNull?: boolean;
}

export interface CacheOptions {
  /** 自定义 TTL (秒) */
  ttl?: number;
  /** 缓存标签 (用于批量删除) */
  tags?: string[];
  /** 是否缓存空值 */
  cacheNull?: boolean;
  /** 自定义键前缀 */
  keyPrefix?: string;
}

export interface CacheStats {
  /** 命中次数 */
  hits: number;
  /** 未命中次数 */
  misses: number;
  /** 设置次数 */
  sets: number;
  /** 删除次数 */
  deletes: number;
  /** 当前缓存数量 */
  size: number;
  /** 命中率 */
  hitRate: number;
}

interface CacheEntry<T> {
  value: T;
  expireAt: number;
  tags: string[];
  createdAt: number;
}

interface BloomFilter {
  bits: boolean[];
  numHashes: number;
  size: number;
}

// ============== 内存缓存实现 ==============

/**
 * 内存缓存类
 */
export class MemoryCache {
  private store: Map<string, CacheEntry<any>> = new Map();
  private config: CacheConfig;
  private bloomFilter?: BloomFilter;
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    size: 0,
    hitRate: 0,
  };
  private cleanupInterval?: NodeJS.Timeout;

  constructor(config: CacheConfig) {
    this.config = config;
    this.initBloomFilter();
    this.startCleanup();
  }

  /**
   * 初始化布隆过滤器
   */
  private initBloomFilter(): void {
    const protection = this.config.penetrationProtection;
    if (!protection?.enableBloomFilter) return;

    const expectedItems = protection.expectedItems || 10000;
    const falsePositiveRate = protection.falsePositiveRate || 0.01;

    // 计算布隆过滤器大小和哈希函数数量
    const size = Math.ceil(-(expectedItems * Math.log(falsePositiveRate)) / (Math.log(2) ** 2));
    const numHashes = Math.round((size / expectedItems) * Math.log(2));

    this.bloomFilter = {
      bits: new Array(size).fill(false),
      numHashes,
      size,
    };
  }

  /**
   * 布隆过滤器哈希函数
   */
  private hash(key: string, seed: number): number {
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
      hash = ((hash << 5) - hash + key.charCodeAt(i) + seed * 7) | 0;
    }
    return Math.abs(hash % this.bloomFilter!.size);
  }

  /**
   * 添加到布隆过滤器
   */
  private addToBloomFilter(key: string): void {
    if (!this.bloomFilter) return;

    for (let i = 0; i < this.bloomFilter.numHashes; i++) {
      const index = this.hash(key, i);
      this.bloomFilter.bits[index] = true;
    }
  }

  /**
   * 检查布隆过滤器
   */
  private mightContain(key: string): boolean {
    if (!this.bloomFilter) return true;

    for (let i = 0; i < this.bloomFilter.numHashes; i++) {
      const index = this.hash(key, i);
      if (!this.bloomFilter.bits[index]) return false;
    }
    return true;
  }

  /**
   * 生成缓存键
   */
  private generateKey(key: string, prefix?: string): string {
    return prefix ? `${prefix}:${key}` : key;
  }

  /**
   * 设置缓存
   */
  public set<T>(key: string, value: T, options?: CacheOptions): void {
    const fullKey = this.generateKey(key, options?.keyPrefix);
    const ttl = (options?.ttl ?? this.config.defaultTTL) * 1000;
    const tags = options?.tags || [];

    // 检查是否需要缓存空值
    if (value === null || value === undefined) {
      if (options?.cacheNull ?? this.config.penetrationProtection?.cacheNull) {
        // 缓存空值
      } else {
        return;
      }
    }

    const entry: CacheEntry<T> = {
      value,
      expireAt: Date.now() + ttl,
      tags,
      createdAt: Date.now(),
    };

    // 检查大小限制
    if (this.config.maxSize && this.store.size >= this.config.maxSize) {
      this.evictOldest();
    }

    this.store.set(fullKey, entry);
    this.addToBloomFilter(fullKey);
    
    this.stats.sets++;
    this.stats.size = this.store.size;
  }

  /**
   * 获取缓存
   */
  public get<T>(key: string, options?: CacheOptions): T | null {
    const fullKey = this.generateKey(key, options?.keyPrefix);

    // 布隆过滤器检查 (穿透保护)
    if (!this.mightContain(fullKey)) {
      this.stats.misses++;
      this.updateHitRate();
      return null;
    }

    const entry = this.store.get(fullKey);

    if (!entry) {
      this.stats.misses++;
      this.updateHitRate();
      return null;
    }

    // 检查是否过期
    if (Date.now() > entry.expireAt) {
      this.store.delete(fullKey);
      this.stats.misses++;
      this.stats.size = this.store.size;
      this.updateHitRate();
      return null;
    }

    this.stats.hits++;
    this.updateHitRate();
    return entry.value as T;
  }

  /**
   * 删除缓存
   */
  public delete(key: string, options?: CacheOptions): boolean {
    const fullKey = this.generateKey(key, options?.keyPrefix);
    const deleted = this.store.delete(fullKey);
    
    if (deleted) {
      this.stats.deletes++;
      this.stats.size = this.store.size;
    }
    
    return deleted;
  }

  /**
   * 根据标签批量删除
   */
  public deleteByTag(tag: string): number {
    let deleted = 0;
    const keysToDelete: string[] = [];
    
    this.store.forEach((entry, key) => {
      if (entry.tags.includes(tag)) {
        keysToDelete.push(key);
      }
    });
    
    keysToDelete.forEach(key => {
      this.store.delete(key);
      deleted++;
    });
    
    this.stats.deletes += deleted;
    this.stats.size = this.store.size;
    return deleted;
  }

  /**
   * 检查键是否存在
   */
  public has(key: string, options?: CacheOptions): boolean {
    const fullKey = this.generateKey(key, options?.keyPrefix);
    const entry = this.store.get(fullKey);

    if (!entry) return false;
    if (Date.now() > entry.expireAt) {
      this.store.delete(fullKey);
      this.stats.size = this.store.size;
      return false;
    }

    return true;
  }

  /**
   * 获取或设置 (带回调)
   */
  public async getOrSet<T>(
    key: string,
    getter: () => Promise<T>,
    options?: CacheOptions
  ): Promise<T> {
    const cached = this.get<T>(key, options);
    if (cached !== null) {
      return cached;
    }

    const value = await getter();
    this.set(key, value, options);
    return value;
  }

  /**
   * 清空所有缓存
   */
  public clear(): void {
    this.store.clear();
    this.stats.deletes += this.stats.size;
    this.stats.size = 0;
  }

  /**
   * 获取统计信息
   */
  public getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * 更新命中率
   */
  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? this.stats.hits / total : 0;
  }

  /**
   * 淘汰最旧的条目
   */
  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    this.store.forEach((entry, key) => {
      if (entry.createdAt < oldestTime) {
        oldestTime = entry.createdAt;
        oldestKey = key;
      }
    });

    if (oldestKey) {
      this.store.delete(oldestKey);
    }
  }

  /**
   * 启动清理定时器
   */
  private startCleanup(): void {
    const cleanupIntervalMs = Math.min(this.config.defaultTTL * 1000, 60000);
    
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      let deleted = 0;

      this.store.forEach((entry, key) => {
        if (now > entry.expireAt) {
          this.store.delete(key);
          deleted++;
        }
      });

      if (deleted > 0) {
        this.stats.size = this.store.size;
      }
    }, cleanupIntervalMs);

    if (this.cleanupInterval.unref) {
      this.cleanupInterval.unref();
    }
  }

  /**
   * 销毁缓存实例
   */
  public destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }
}

// ============== Redis 缓存实现 ==============

/**
 * Redis 缓存类
 */
export class RedisCache {
  private redis: any;
  private config: CacheConfig;
  private keyPrefix: string;
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    size: 0,
    hitRate: 0,
  };

  constructor(config: CacheConfig) {
    this.config = config;
    this.keyPrefix = config.redis?.keyPrefix || 'cache:';
    
    // 动态导入 redis 客户端
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const Redis = require('ioredis');
      this.redis = new Redis({
        host: config.redis?.host || 'localhost',
        port: config.redis?.port || 6379,
        password: config.redis?.password,
        db: config.redis?.db || 0,
      });
    } catch (e) {
      throw new Error('Redis client not installed. Run: npm install ioredis');
    }
  }

  /**
   * 生成缓存键
   */
  private generateKey(key: string, prefix?: string): string {
    return prefix ? `${this.keyPrefix}${prefix}:${key}` : `${this.keyPrefix}${key}`;
  }

  /**
   * 设置缓存
   */
  public async set<T>(key: string, value: T, options?: CacheOptions): Promise<void> {
    const fullKey = this.generateKey(key, options?.keyPrefix);
    const ttl = options?.ttl ?? this.config.defaultTTL;

    // 检查是否需要缓存空值
    if (value === null || value === undefined) {
      if (options?.cacheNull ?? this.config.penetrationProtection?.cacheNull) {
        await this.redis.setex(fullKey, ttl, JSON.stringify({ __NULL__: true }));
      } else {
        return;
      }
    } else {
      await this.redis.setex(fullKey, ttl, JSON.stringify(value));
    }

    // 处理标签
    if (options?.tags) {
      for (const tag of options.tags) {
        await this.redis.sadd(`${this.keyPrefix}tag:${tag}`, fullKey);
        await this.redis.expire(`${this.keyPrefix}tag:${tag}`, ttl);
      }
    }

    this.stats.sets++;
  }

  /**
   * 获取缓存
   */
  public async get<T>(key: string, options?: CacheOptions): Promise<T | null> {
    const fullKey = this.generateKey(key, options?.keyPrefix);
    const data = await this.redis.get(fullKey);

    if (!data) {
      this.stats.misses++;
      this.updateHitRate();
      return null;
    }

    const parsed = JSON.parse(data);
    
    // 检查是否是空值标记
    if (parsed && (parsed as any).__NULL__) {
      this.stats.hits++;
      this.updateHitRate();
      return null as T;
    }

    this.stats.hits++;
    this.updateHitRate();
    return parsed as T;
  }

  /**
   * 删除缓存
   */
  public async delete(key: string, options?: CacheOptions): Promise<boolean> {
    const fullKey = this.generateKey(key, options?.keyPrefix);
    const deleted = await this.redis.del(fullKey);
    
    if (deleted) {
      this.stats.deletes++;
    }
    
    return deleted > 0;
  }

  /**
   * 根据标签批量删除
   */
  public async deleteByTag(tag: string): Promise<number> {
    const tagKey = `${this.keyPrefix}tag:${tag}`;
    const keys = await this.redis.smembers(tagKey);
    
    if (keys.length === 0) return 0;

    const deleted = await this.redis.del(...keys);
    await this.redis.del(tagKey);
    
    this.stats.deletes += deleted;
    return deleted;
  }

  /**
   * 检查键是否存在
   */
  public async has(key: string, options?: CacheOptions): Promise<boolean> {
    const fullKey = this.generateKey(key, options?.keyPrefix);
    const exists = await this.redis.exists(fullKey);
    return exists > 0;
  }

  /**
   * 获取或设置 (带回调)
   */
  public async getOrSet<T>(
    key: string,
    getter: () => Promise<T>,
    options?: CacheOptions
  ): Promise<T> {
    const cached = await this.get<T>(key, options);
    if (cached !== null) {
      return cached;
    }

    const value = await getter();
    await this.set(key, value, options);
    return value;
  }

  /**
   * 清空所有缓存
   */
  public async clear(): Promise<void> {
    const keys = await this.redis.keys(`${this.keyPrefix}*`);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
    this.stats.deletes += this.stats.size;
    this.stats.size = 0;
  }

  /**
   * 获取统计信息
   */
  public getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * 更新命中率
   */
  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? this.stats.hits / total : 0;
  }

  /**
   * 销毁缓存实例
   */
  public async destroy(): Promise<void> {
    if (this.redis) {
      await this.redis.quit();
    }
  }
}

// ============== 缓存工厂 ==============

/**
 * 创建缓存实例
 */
export function createCache(config: CacheConfig): MemoryCache | RedisCache {
  if (config.type === 'redis') {
    return new RedisCache(config);
  }
  return new MemoryCache(config);
}

// ============== 预定义配置模板 ==============

/**
 * 预定义缓存配置
 */
export const presets = {
  /** 默认内存缓存 */
  default: {
    type: 'memory' as const,
    defaultTTL: 300, // 5 分钟
    maxSize: 1000,
    enableStats: true,
  } as CacheConfig,

  /** 短期缓存 */
  shortTerm: {
    type: 'memory' as const,
    defaultTTL: 60, // 1 分钟
    maxSize: 500,
    enableStats: true,
  } as CacheConfig,

  /** 长期缓存 */
  longTerm: {
    type: 'memory' as const,
    defaultTTL: 3600, // 1 小时
    maxSize: 5000,
    enableStats: true,
  } as CacheConfig,

  /** Redis 缓存 */
  redis: {
    type: 'redis' as const,
    defaultTTL: 300,
    redis: {
      host: 'localhost',
      port: 6379,
      keyPrefix: 'app:',
    },
    enableStats: true,
  } as CacheConfig,

  /** 带穿透保护的缓存 */
  withPenetrationProtection: {
    type: 'memory' as const,
    defaultTTL: 300,
    maxSize: 1000,
    penetrationProtection: {
      enableBloomFilter: true,
      expectedItems: 10000,
      falsePositiveRate: 0.01,
      nullCacheTTL: 60,
      cacheNull: true,
    },
    enableStats: true,
  } as CacheConfig,

  /** API 响应缓存 */
  apiResponse: {
    type: 'memory' as const,
    defaultTTL: 30, // 30 秒
    maxSize: 2000,
    penetrationProtection: {
      cacheNull: true,
      nullCacheTTL: 10,
    },
    enableStats: true,
  } as CacheConfig,

  /** 用户数据缓存 */
  userData: {
    type: 'memory' as const,
    defaultTTL: 600, // 10 分钟
    maxSize: 500,
    penetrationProtection: {
      enableBloomFilter: true,
      expectedItems: 1000,
      cacheNull: true,
    },
    enableStats: true,
  } as CacheConfig,
};

// ============== 快捷创建函数 ==============

/**
 * 创建带穿透保护的内存缓存
 */
export function createProtectedCache(maxSize: number = 1000, defaultTTL: number = 300) {
  return createCache({
    type: 'memory',
    defaultTTL,
    maxSize,
    penetrationProtection: {
      enableBloomFilter: true,
      expectedItems: maxSize * 10,
      falsePositiveRate: 0.01,
      cacheNull: true,
      nullCacheTTL: 60,
    },
    enableStats: true,
  });
}

/**
 * 创建 Redis 缓存
 */
export function createRedisCache(redisConfig: Partial<RedisConfig> = {}) {
  return createCache({
    type: 'redis',
    defaultTTL: 300,
    redis: {
      host: 'localhost',
      port: 6379,
      ...redisConfig,
    },
    enableStats: true,
  });
}

/**
 * 创建会话缓存
 */
export function createSessionCache(ttl: number = 1800) {
  return createCache({
    type: 'memory',
    defaultTTL: ttl,
    maxSize: 10000,
    penetrationProtection: {
      cacheNull: false,
    },
    enableStats: true,
  });
}

// ============== 导出默认 ==============

export default createCache;
