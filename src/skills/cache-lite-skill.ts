/**
 * Cache Lite - 轻量级内存缓存工具
 * 
 * 功能:
 * 1. 内存缓存 (get/set/delete)
 * 2. TTL 过期机制
 * 3. LRU 淘汰策略
 * 
 * @author Axon
 * @version 1.0.0
 */

// ============== 类型定义 ==============

export interface CacheLiteOptions {
  /** 默认 TTL (毫秒)，0 表示永不过期 */
  defaultTTL?: number;
  /** 最大缓存条目数，0 表示无限制 */
  maxSize?: number;
}

interface CacheEntry<T> {
  value: T;
  expireAt: number;
  lastAccessed: number;
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
  /** 命中率 (0-1) */
  hitRate: number;
}

// ============== CacheLite 类 ==============

/**
 * 轻量级内存缓存类
 * 
 * @example
 * ```typescript
 * // 创建缓存实例
 * const cache = new CacheLite({ defaultTTL: 60000, maxSize: 100 });
 * 
 * // 设置缓存
 * cache.set('user:1', { id: 1, name: 'Alice' });
 * 
 * // 获取缓存
 * const user = cache.get('user:1');
 * 
 * // 删除缓存
 * cache.delete('user:1');
 * 
 * // 获取统计信息
 * const stats = cache.getStats();
 * ```
 */
export class CacheLite {
  private store: Map<string, CacheEntry<any>> = new Map();
  private options: Required<CacheLiteOptions>;
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    size: 0,
    hitRate: 0,
  };
  private cleanupInterval?: NodeJS.Timeout;

  constructor(options: CacheLiteOptions = {}) {
    this.options = {
      defaultTTL: options.defaultTTL ?? 0,
      maxSize: options.maxSize ?? 0,
    };
    this.startCleanup();
  }

  /**
   * 设置缓存
   * 
   * @param key - 缓存键
   * @param value - 缓存值
   * @param ttl - 自定义 TTL (毫秒)，覆盖默认值
   * 
   * @example
   * ```typescript
   * // 使用默认 TTL
   * cache.set('key', 'value');
   * 
   * // 自定义 TTL (1 分钟)
   * cache.set('key', 'value', 60000);
   * 
   * // 永不过期
   * cache.set('key', 'value', 0);
   * ```
   */
  set<T>(key: string, value: T, ttl?: number): void {
    const now = Date.now();
    const effectiveTTL = ttl ?? this.options.defaultTTL;
    
    const entry: CacheEntry<T> = {
      value,
      expireAt: effectiveTTL > 0 ? now + effectiveTTL : Infinity,
      lastAccessed: now,
    };

    // 检查是否需要 LRU 淘汰
    if (this.options.maxSize > 0 && this.store.size >= this.options.maxSize && !this.store.has(key)) {
      this.evictLRU();
    }

    this.store.set(key, entry);
    this.stats.sets++;
    this.stats.size = this.store.size;
  }

  /**
   * 获取缓存
   * 
   * @param key - 缓存键
   * @returns 缓存值，不存在或已过期返回 undefined
   * 
   * @example
   * ```typescript
   * const value = cache.get('key');
   * if (value !== undefined) {
   *   console.log('Cache hit:', value);
   * } else {
   *   console.log('Cache miss');
   * }
   * ```
   */
  get<T>(key: string): T | undefined {
    const entry = this.store.get(key);

    if (!entry) {
      this.stats.misses++;
      this.updateHitRate();
      return undefined;
    }

    // 检查是否过期
    if (Date.now() > entry.expireAt) {
      this.store.delete(key);
      this.stats.misses++;
      this.stats.size = this.store.size;
      this.updateHitRate();
      return undefined;
    }

    // 更新最后访问时间 (LRU 关键)
    entry.lastAccessed = Date.now();
    this.stats.hits++;
    this.updateHitRate();
    return entry.value as T;
  }

  /**
   * 删除缓存
   * 
   * @param key - 缓存键
   * @returns 是否成功删除
   * 
   * @example
   * ```typescript
   * const deleted = cache.delete('key');
   * console.log(deleted ? 'Deleted' : 'Not found');
   * ```
   */
  delete(key: string): boolean {
    const deleted = this.store.delete(key);
    if (deleted) {
      this.stats.deletes++;
      this.stats.size = this.store.size;
    }
    return deleted;
  }

  /**
   * 检查键是否存在 (未过期)
   * 
   * @param key - 缓存键
   * 
   * @example
   * ```typescript
   * if (cache.has('key')) {
   *   console.log('Key exists');
   * }
   * ```
   */
  has(key: string): boolean {
    const entry = this.store.get(key);
    if (!entry) return false;
    
    if (Date.now() > entry.expireAt) {
      this.store.delete(key);
      this.stats.size = this.store.size;
      return false;
    }
    
    return true;
  }

  /**
   * 获取或设置 (带异步回调)
   * 
   * @param key - 缓存键
   * @param getter - 获取值的异步函数
   * @param ttl - 自定义 TTL (毫秒)
   * 
   * @example
   * ```typescript
   * const user = await cache.getOrSet('user:1', async () => {
   *   return await fetchUserFromDB(1);
   * }, 60000);
   * ```
   */
  async getOrSet<T>(
    key: string,
    getter: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== undefined) {
      return cached;
    }

    const value = await getter();
    this.set(key, value, ttl);
    return value;
  }

  /**
   * 清空所有缓存
   * 
   * @example
   * ```typescript
   * cache.clear();
   * console.log('Cache cleared');
   * ```
   */
  clear(): void {
    this.store.clear();
    this.stats.size = 0;
  }

  /**
   * 获取统计信息
   * 
   * @example
   * ```typescript
   * const stats = cache.getStats();
   * console.log(`Hit rate: ${(stats.hitRate * 100).toFixed(2)}%`);
   * ```
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * 获取当前缓存数量
   * 
   * @example
   * ```typescript
   * console.log(`Cache size: ${cache.size()}`);
   * ```
   */
  size(): number {
    return this.store.size;
  }

  /**
   * 获取所有键
   * 
   * @example
   * ```typescript
   * const keys = cache.keys();
   * ```
   */
  keys(): string[] {
    return Array.from(this.store.keys());
  }

  /**
   * 销毁缓存实例 (清理定时器)
   * 
   * @example
   * ```typescript
   * cache.destroy();
   * ```
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }

  /**
   * 更新命中率统计
   */
  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? this.stats.hits / total : 0;
  }

  /**
   * LRU 淘汰：删除最久未使用的条目
   */
  private evictLRU(): void {
    let lruKey: string | null = null;
    let lruTime = Infinity;

    this.store.forEach((entry, key) => {
      if (entry.lastAccessed < lruTime) {
        lruTime = entry.lastAccessed;
        lruKey = key;
      }
    });

    if (lruKey) {
      this.store.delete(lruKey);
    }
  }

  /**
   * 启动清理定时器 (清理过期条目)
   */
  private startCleanup(): void {
    // 每 10 秒清理一次过期条目
    const cleanupIntervalMs = 10000;
    
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

    // 允许 Node.js 在无其他任务时退出
    if (this.cleanupInterval.unref) {
      this.cleanupInterval.unref();
    }
  }
}

// ============== 预定义配置模板 ==============

/**
 * 预定义缓存配置
 */
export const presets = {
  /** 短期缓存 (1 分钟，最大 100 条) */
  shortTerm: {
    defaultTTL: 60000,
    maxSize: 100,
  } as CacheLiteOptions,

  /** 中期缓存 (5 分钟，最大 500 条) */
  mediumTerm: {
    defaultTTL: 300000,
    maxSize: 500,
  } as CacheLiteOptions,

  /** 长期缓存 (1 小时，最大 1000 条) */
  longTerm: {
    defaultTTL: 3600000,
    maxSize: 1000,
  } as CacheLiteOptions,

  /** 会话缓存 (30 分钟，最大 10000 条) */
  session: {
    defaultTTL: 1800000,
    maxSize: 10000,
  } as CacheLiteOptions,

  /** API 响应缓存 (30 秒，最大 2000 条) */
  apiResponse: {
    defaultTTL: 30000,
    maxSize: 2000,
  } as CacheLiteOptions,

  /** 无限制缓存 (仅手动删除) */
  unlimited: {
    defaultTTL: 0,
    maxSize: 0,
  } as CacheLiteOptions,
};

// ============== 快捷创建函数 ==============

/**
 * 创建短期缓存
 */
export function createShortTermCache() {
  return new CacheLite(presets.shortTerm);
}

/**
 * 创建中期缓存
 */
export function createMediumTermCache() {
  return new CacheLite(presets.mediumTerm);
}

/**
 * 创建长期缓存
 */
export function createLongTermCache() {
  return new CacheLite(presets.longTerm);
}

/**
 * 创建会话缓存
 */
export function createSessionCache() {
  return new CacheLite(presets.session);
}

/**
 * 创建 API 响应缓存
 */
export function createAPICache() {
  return new CacheLite(presets.apiResponse);
}

// ============== 导出默认 ==============

export default CacheLite;
