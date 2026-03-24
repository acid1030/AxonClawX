/**
 * 缓存管理技能 - Axon
 * 
 * 提供高效的内存缓存管理功能：
 * 1. 内存缓存 - 支持 TTL 和最大容量限制
 * 2. 缓存失效 - 支持单个/批量/全局失效
 * 3. 缓存统计 - 命中率、使用量等指标
 */

// ============================================
// 类型定义
// ============================================

interface CacheEntry<T> {
  value: T;
  timestamp: number;
  ttl?: number; // 生存时间 (毫秒)
  hits: number; // 访问次数
  age?: number; // 缓存年龄 (毫秒)
  expiresAt?: number | null; // 过期时间戳
}

interface CacheStats {
  totalKeys: number;
  totalHits: number;
  totalMisses: number;
  hitRate: number;
  memoryUsage: number;
  oldestEntry: number | null;
  newestEntry: number | null;
}

interface CacheOptions {
  maxEntries?: number; // 最大缓存条目数，默认 1000
  defaultTTL?: number; // 默认 TTL (毫秒)，默认 5 分钟
}

// ============================================
// 缓存管理器类
// ============================================

export class CacheManager {
  private cache: Map<string, CacheEntry<any>>;
  private options: Required<CacheOptions>;
  private totalMisses: number = 0;

  constructor(options: CacheOptions = {}) {
    this.cache = new Map();
    this.options = {
      maxEntries: options.maxEntries ?? 1000,
      defaultTTL: options.defaultTTL ?? 5 * 60 * 1000, // 5 分钟
    };
  }

  /**
   * 获取缓存值
   * 
   * @param key - 缓存键
   * @returns 缓存值，如果不存在或已过期则返回 undefined
   * 
   * @example
   * cache.get('user:123')
   */
  get<T>(key: string): T | undefined {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.totalMisses++;
      return undefined;
    }

    // 检查是否过期
    if (entry.ttl && Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      this.totalMisses++;
      return undefined;
    }

    // 更新访问次数
    entry.hits++;
    return entry.value as T;
  }

  /**
   * 设置缓存值
   * 
   * @param key - 缓存键
   * @param value - 缓存值
   * @param ttl - 可选的生存时间 (毫秒)，使用默认值如果未指定
   * @returns this (支持链式调用)
   * 
   * @example
   * cache.set('user:123', { name: 'Axon' }, 60000)
   * cache.set('config', { theme: 'dark' }) // 使用默认 TTL
   */
  set<T>(key: string, value: T, ttl?: number): this {
    // 如果缓存已满，移除最旧的条目
    if (this.cache.size >= this.options.maxEntries && !this.cache.has(key)) {
      this.evictOldest();
    }

    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      ttl: ttl ?? this.options.defaultTTL,
      hits: 0,
    });

    return this;
  }

  /**
   * 删除缓存
   * 
   * @param key - 缓存键
   * @returns 是否删除成功
   * 
   * @example
   * cache.delete('user:123')
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * 批量删除缓存
   * 
   * @param keys - 缓存键数组
   * @returns 删除的数量
   * 
   * @example
   * cache.deleteMany(['user:123', 'user:456'])
   */
  deleteMany(keys: string[]): number {
    let count = 0;
    keys.forEach(key => {
      if (this.cache.delete(key)) {
        count++;
      }
    });
    return count;
  }

  /**
   * 删除匹配模式的缓存
   * 
   * @param pattern - 键模式 (支持 * 通配符)
   * @returns 删除的数量
   * 
   * @example
   * cache.deleteByPattern('user:*') // 删除所有 user: 开头的缓存
   */
  deleteByPattern(pattern: string): number {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    let count = 0;
    
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
        count++;
      }
    }
    
    return count;
  }

  /**
   * 清空所有缓存
   * 
   * @example
   * cache.clear()
   */
  clear(): void {
    this.cache.clear();
    this.totalMisses = 0;
  }

  /**
   * 检查缓存是否存在且未过期
   * 
   * @param key - 缓存键
   * @returns 是否存在
   * 
   * @example
   * cache.has('user:123')
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    if (entry.ttl && Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * 获取缓存统计信息
   * 
   * @returns 统计数据
   * 
   * @example
   * const stats = cache.getStats()
   * console.log(`命中率：${stats.hitRate.toFixed(2)}%`)
   */
  getStats(): CacheStats {
    const totalHits = Array.from(this.cache.values()).reduce((sum, entry) => sum + entry.hits, 0);
    const totalRequests = totalHits + this.totalMisses;
    
    let oldestEntry: number | null = null;
    let newestEntry: number | null = null;

    for (const entry of this.cache.values()) {
      if (oldestEntry === null || entry.timestamp < oldestEntry) {
        oldestEntry = entry.timestamp;
      }
      if (newestEntry === null || entry.timestamp > newestEntry) {
        newestEntry = entry.timestamp;
      }
    }

    // 估算内存使用 (简单估算)
    const memoryUsage = Array.from(this.cache.entries()).reduce((sum, [key, entry]) => {
      return sum + key.length + JSON.stringify(entry.value).length;
    }, 0);

    return {
      totalKeys: this.cache.size,
      totalHits,
      totalMisses: this.totalMisses,
      hitRate: totalRequests > 0 ? (totalHits / totalRequests) * 100 : 0,
      memoryUsage,
      oldestEntry,
      newestEntry,
    };
  }

  /**
   * 获取所有缓存键
   * 
   * @returns 键数组
   * 
   * @example
   * cache.keys() // ['user:123', 'config', ...]
   */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * 获取所有缓存值
   * 
   * @returns 值数组
   * 
   * @example
   * cache.values() // [{...}, {...}, ...]
   */
  values(): any[] {
    return Array.from(this.cache.values()).map(entry => entry.value);
  }

  /**
   * 获取所有缓存条目
   * 
   * @returns 键值对数组
   * 
   * @example
   * cache.entries() // [['user:123', {...}], ...]
   */
  entries(): [string, any][] {
    return Array.from(this.cache.entries()).map(([key, entry]) => [key, entry.value]);
  }

  /**
   * 手动触发垃圾回收 (移除过期条目)
   * 
   * @returns 移除的数量
   * 
   * @example
   * cache.gc()
   */
  gc(): number {
    const now = Date.now();
    let count = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.ttl && now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
        count++;
      }
    }

    return count;
  }

  /**
   * 更新缓存条目的 TTL
   * 
   * @param key - 缓存键
   * @param ttl - 新的 TTL (毫秒)
   * @returns 是否更新成功
   * 
   * @example
   * cache.refreshTTL('user:123', 120000) // 延长到 2 分钟
   */
  refreshTTL(key: string, ttl: number): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    entry.timestamp = Date.now();
    entry.ttl = ttl;
    return true;
  }

  /**
   * 获取缓存条目详情
   * 
   * @param key - 缓存键
   * @returns 条目详情或 undefined
   * 
   * @example
   * cache.getEntry('user:123')
   */
  getEntry<T>(key: string): (CacheEntry<T> & { key: string; age: number; expiresAt: number | null }) | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;

    return {
      ...entry,
      key,
      age: Date.now() - entry.timestamp,
      expiresAt: entry.ttl ? entry.timestamp + entry.ttl : null,
    };
  }

  /**
   * 批量获取缓存值
   * 
   * @param keys - 缓存键数组
   * @returns 键值对对象 (只包含存在的键)
   * 
   * @example
   * cache.getMany(['user:123', 'user:456']) // { 'user:123': {...}, 'user:456': {...} }
   */
  getMany<T>(keys: string[]): Record<string, T> {
    const result: Record<string, T> = {};
    
    keys.forEach(key => {
      const value = this.get<T>(key);
      if (value !== undefined) {
        result[key] = value;
      }
    });

    return result;
  }

  /**
   * 批量设置缓存值
   * 
   * @param entries - 键值对数组
   * @param ttl - 可选的生存时间
   * @returns this (支持链式调用)
   * 
   * @example
   * cache.setMany([
   *   ['user:123', { name: 'Axon' }],
   *   ['user:456', { name: 'KAEL' }]
   * ], 60000)
   */
  setMany<T>(entries: [string, T][], ttl?: number): this {
    entries.forEach(([key, value]) => {
      this.set(key, value, ttl);
    });
    return this;
  }

  // ============================================
  // 私有方法
  // ============================================

  /**
   * 移除最旧的缓存条目
   */
  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTime: number = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }
}

// ============================================
// 导出单例实例 (可选)
// ============================================

export const defaultCache = new CacheManager();

// ============================================
// 使用示例
// ============================================

/*
// 1. 基础使用
import { CacheManager } from './cache-manager-skill';

const cache = new CacheManager({
  maxEntries: 500,
  defaultTTL: 10 * 60 * 1000, // 10 分钟
});

// 设置缓存
cache.set('user:123', { id: 123, name: 'Axon', role: 'admin' });

// 获取缓存
const user = cache.get('user:123');
console.log(user); // { id: 123, name: 'Axon', role: 'admin' }

// 检查是否存在
if (cache.has('user:123')) {
  console.log('缓存存在');
}

// 删除缓存
cache.delete('user:123');


// 2. 自定义 TTL
cache.set('session:abc', { token: 'xyz' }, 5 * 60 * 1000); // 5 分钟后过期


// 3. 批量操作
cache.setMany([
  ['config:theme', 'dark'],
  ['config:language', 'zh-CN'],
  ['config:timezone', 'Asia/Shanghai'],
]);

const configs = cache.getMany(['config:theme', 'config:language']);
console.log(configs);


// 4. 模式删除
cache.deleteByPattern('user:*'); // 删除所有 user: 开头的缓存


// 5. 查看统计
const stats = cache.getStats();
console.log(`缓存命中率：${stats.hitRate.toFixed(2)}%`);
console.log(`缓存条目数：${stats.totalKeys}`);
console.log(`内存使用：${(stats.memoryUsage / 1024).toFixed(2)} KB`);


// 6. 刷新 TTL
cache.refreshTTL('session:abc', 30 * 60 * 1000); // 延长到 30 分钟


// 7. 获取条目详情
const entry = cache.getEntry('user:123');
if (entry) {
  console.log(`创建时间：${new Date(entry.timestamp).toISOString()}`);
  console.log(`访问次数：${entry.hits}`);
  console.log(`剩余时间：${entry.expiresAt ? entry.expiresAt - Date.now() : '永久'}ms`);
}


// 8. 手动垃圾回收
const removed = cache.gc();
console.log(`清理了 ${removed} 个过期条目`);


// 9. 清空缓存
cache.clear();


// 10. 使用默认实例
import { defaultCache } from './cache-manager-skill';

defaultCache.set('global:counter', 42);
const counter = defaultCache.get('global:counter');
*/
