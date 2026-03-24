/**
 * Cache Manager Pro Skill - 缓存管理器工具
 * 
 * 功能:
 * 1. 缓存策略 - 配置和管理缓存策略 (TTL/LRU/LFU)
 * 2. 缓存失效 - 手动/自动失效缓存条目
 * 3. 缓存统计 - 命中率/大小/过期统计
 * 
 * @module skills/cache-manager-pro
 * @author ACE
 * @version 1.0.0
 */

import * as fs from 'fs';
import * as path from 'path';
import type { Skill, Command } from './skill-registry';

// ============================================================================
// 类型定义
// ============================================================================

/**
 * 缓存策略类型
 */
export enum CacheStrategy {
  TTL = 'ttl',          // 基于时间过期
  LRU = 'lru',          // 最近最少使用
  LFU = 'lfu',          // 最不经常使用
  FIFO = 'fifo',        // 先进先出
}

/**
 * 缓存条目
 */
export interface CacheEntry<T = unknown> {
  /** 缓存键 */
  key: string;
  /** 缓存值 */
  value: T;
  /** 创建时间戳 (毫秒) */
  createdAt: number;
  /** 最后访问时间戳 */
  lastAccessedAt: number;
  /** 访问次数 */
  accessCount: number;
  /** 过期时间戳 (毫秒), 0 表示永不过期 */
  expiresAt: number;
  /** 元数据 */
  metadata?: Record<string, unknown>;
}

/**
 * 缓存配置
 */
export interface CacheConfig {
  /** 最大缓存条目数 */
  maxEntries: number;
  /** 默认 TTL (秒), 0 表示永不过期 */
  defaultTTL: number;
  /** 缓存策略 */
  strategy: CacheStrategy;
  /** 是否启用统计 */
  enableStats: boolean;
  /** 持久化路径 */
  persistPath?: string;
}

/**
 * 缓存统计
 */
export interface CacheStats {
  /** 总命中次数 */
  hits: number;
  /** 总未命中次数 */
  misses: number;
  /** 命中率 (0-1) */
  hitRate: number;
  /** 当前缓存条目数 */
  size: number;
  /** 最大缓存条目数 */
  maxSize: number;
  /** 过期条目数 */
  expiredCount: number;
  /** 驱逐条目数 */
  evictedCount: number;
  /** 平均访问时间 (毫秒) */
  avgAccessTime: number;
  /** 内存占用 (字节) */
  memoryUsage: number;
}

/**
 * 缓存事件
 */
export interface CacheEvent {
  /** 事件类型 */
  type: 'hit' | 'miss' | 'set' | 'delete' | 'evict' | 'expire';
  /** 缓存键 */
  key: string;
  /** 时间戳 */
  timestamp: number;
  /** 附加数据 */
  data?: unknown;
}

// ============================================================================
// 缓存管理器类
// ============================================================================

export class CacheManager {
  private cache: Map<string, CacheEntry> = new Map();
  private config: CacheConfig;
  private stats: CacheStats;
  private eventListeners: Map<string, Array<(event: CacheEvent) => void>> = new Map();
  private cleanupInterval?: NodeJS.Timeout;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      maxEntries: 1000,
      defaultTTL: 3600, // 1 小时
      strategy: CacheStrategy.LRU,
      enableStats: true,
      ...config,
    };

    this.stats = {
      hits: 0,
      misses: 0,
      hitRate: 0,
      size: 0,
      maxSize: this.config.maxEntries,
      expiredCount: 0,
      evictedCount: 0,
      avgAccessTime: 0,
      memoryUsage: 0,
    };

    // 启动定期清理
    this.startCleanup();
  }

  /**
   * 设置缓存
   */
  set<T>(key: string, value: T, options?: {
    ttl?: number;
    metadata?: Record<string, unknown>;
  }): void {
    const now = Date.now();
    const ttl = options?.ttl ?? this.config.defaultTTL;
    
    const entry: CacheEntry<T> = {
      key,
      value,
      createdAt: now,
      lastAccessedAt: now,
      accessCount: 0,
      expiresAt: ttl > 0 ? now + ttl * 1000 : 0,
      metadata: options?.metadata,
    };

    // 检查是否需要驱逐
    if (this.cache.size >= this.config.maxEntries) {
      this.evict();
    }

    this.cache.set(key, entry as CacheEntry);
    this.updateStats();
    this.emit('set', key, { value });

    // 持久化
    this.persist();
  }

  /**
   * 获取缓存
   */
  get<T>(key: string): T | undefined {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;
    
    if (!entry) {
      this.stats.misses++;
      this.emit('miss', key);
      return undefined;
    }

    // 检查是否过期
    if (entry.expiresAt > 0 && entry.expiresAt < Date.now()) {
      this.cache.delete(key);
      this.stats.expiredCount++;
      this.stats.misses++;
      this.emit('expire', key);
      this.updateStats();
      return undefined;
    }

    // 更新访问信息
    entry.lastAccessedAt = Date.now();
    entry.accessCount++;
    
    this.stats.hits++;
    this.updateStats();
    this.emit('hit', key, { value: entry.value });

    return entry.value;
  }

  /**
   * 删除缓存
   */
  delete(key: string): boolean {
    const existed = this.cache.delete(key);
    if (existed) {
      this.updateStats();
      this.emit('delete', key);
      this.persist();
    }
    return existed;
  }

  /**
   * 清空缓存
   */
  clear(): void {
    this.cache.clear();
    this.updateStats();
    this.persist();
  }

  /**
   * 检查键是否存在
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    
    // 检查是否过期
    if (entry.expiresAt > 0 && entry.expiresAt < Date.now()) {
      this.cache.delete(key);
      this.stats.expiredCount++;
      this.emit('expire', key);
      this.updateStats();
      return false;
    }
    
    return true;
  }

  /**
   * 获取所有键
   */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * 获取所有条目
   */
  entries(): Array<CacheEntry> {
    return Array.from(this.cache.values());
  }

  /**
   * 获取缓存统计
   */
  getStats(): CacheStats {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? this.stats.hits / total : 0;
    this.stats.size = this.cache.size;
    this.stats.memoryUsage = this.calculateMemoryUsage();
    return { ...this.stats };
  }

  /**
   * 手动失效缓存 (支持模式匹配)
   */
  invalidate(pattern: string): number {
    let count = 0;
    const regex = this.patternToRegex(pattern);
    
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
        count++;
        this.emit('delete', key);
      }
    }

    if (count > 0) {
      this.updateStats();
      this.persist();
    }

    return count;
  }

  /**
   * 批量设置缓存
   */
  setBatch<T>(entries: Array<{ key: string; value: T; ttl?: number }>): number {
    let count = 0;
    for (const entry of entries) {
      this.set(entry.key, entry.value, { ttl: entry.ttl });
      count++;
    }
    return count;
  }

  /**
   * 批量获取缓存
   */
  getBatch<T>(keys: string[]): Map<string, T | undefined> {
    const result = new Map<string, T | undefined>();
    for (const key of keys) {
      result.set(key, this.get<T>(key));
    }
    return result;
  }

  /**
   * 注册事件监听器
   */
  on(event: string, callback: (event: CacheEvent) => void): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  /**
   * 移除事件监听器
   */
  off(event: string, callback: (event: CacheEvent) => void): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * 导出缓存到文件
   */
  export(filePath: string): boolean {
    try {
      const data = Array.from(this.cache.values());
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
      return true;
    } catch (error) {
      console.error('[CacheManager] 导出失败:', error);
      return false;
    }
  }

  /**
   * 从文件导入缓存
   */
  import(filePath: string): number {
    try {
      const data = fs.readFileSync(filePath, 'utf-8');
      const entries = JSON.parse(data) as CacheEntry[];
      
      let count = 0;
      for (const entry of entries) {
        // 只导入未过期的条目
        if (entry.expiresAt === 0 || entry.expiresAt > Date.now()) {
          this.cache.set(entry.key, entry);
          count++;
        }
      }
      
      this.updateStats();
      return count;
    } catch (error) {
      console.error('[CacheManager] 导入失败:', error);
      return 0;
    }
  }

  /**
   * 销毁缓存管理器
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.persist();
    this.cache.clear();
  }

  // ============================================================================
  // 私有方法
  // ============================================================================

  /**
   * 驱逐策略
   */
  private evict(): void {
    let keyToDelete: string | null = null;

    switch (this.config.strategy) {
      case CacheStrategy.LRU:
        keyToDelete = this.findLRUKey();
        break;
      case CacheStrategy.LFU:
        keyToDelete = this.findLFUKey();
        break;
      case CacheStrategy.FIFO:
        keyToDelete = this.findFIFOKey();
        break;
      case CacheStrategy.TTL:
      default:
        keyToDelete = this.findExpiredKey() || this.findFIFOKey();
        break;
    }

    if (keyToDelete) {
      this.cache.delete(keyToDelete);
      this.stats.evictedCount++;
      this.emit('evict', keyToDelete);
    }
  }

  /**
   * 查找 LRU 键
   */
  private findLRUKey(): string | null {
    let minTime = Infinity;
    let targetKey: string | null = null;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessedAt < minTime) {
        minTime = entry.lastAccessedAt;
        targetKey = key;
      }
    }

    return targetKey;
  }

  /**
   * 查找 LFU 键
   */
  private findLFUKey(): string | null {
    let minCount = Infinity;
    let targetKey: string | null = null;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.accessCount < minCount) {
        minCount = entry.accessCount;
        targetKey = key;
      }
    }

    return targetKey;
  }

  /**
   * 查找 FIFO 键
   */
  private findFIFOKey(): string | null {
    let minTime = Infinity;
    let targetKey: string | null = null;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.createdAt < minTime) {
        minTime = entry.createdAt;
        targetKey = key;
      }
    }

    return targetKey;
  }

  /**
   * 查找过期键
   */
  private findExpiredKey(): string | null {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt > 0 && entry.expiresAt < now) {
        return key;
      }
    }
    return null;
  }

  /**
   * 启动定期清理
   */
  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      let expiredCount = 0;

      for (const [key, entry] of this.cache.entries()) {
        if (entry.expiresAt > 0 && entry.expiresAt < now) {
          this.cache.delete(key);
          expiredCount++;
          this.emit('expire', key);
        }
      }

      if (expiredCount > 0) {
        this.stats.expiredCount += expiredCount;
        this.updateStats();
        this.persist();
        console.log(`[CacheManager] 清理了 ${expiredCount} 个过期条目`);
      }
    }, 60000); // 每分钟清理一次
  }

  /**
   * 更新统计
   */
  private updateStats(): void {
    this.stats.size = this.cache.size;
    this.stats.memoryUsage = this.calculateMemoryUsage();
  }

  /**
   * 计算内存占用
   */
  private calculateMemoryUsage(): number {
    let total = 0;
    for (const entry of this.cache.values()) {
      total += Buffer.byteLength(JSON.stringify(entry));
    }
    return total;
  }

  /**
   * 持久化缓存
   */
  private persist(): void {
    if (!this.config.persistPath) return;

    try {
      const dir = path.dirname(this.config.persistPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      this.export(this.config.persistPath);
    } catch (error) {
      console.error('[CacheManager] 持久化失败:', error);
    }
  }

  /**
   * 发射事件
   */
  private emit(type: CacheEvent['type'], key: string, data?: unknown): void {
    const event: CacheEvent = {
      type,
      key,
      timestamp: Date.now(),
      data,
    };

    const listeners = this.eventListeners.get(type);
    if (listeners) {
      for (const listener of listeners) {
        try {
          listener(event);
        } catch (error) {
          console.error('[CacheManager] 事件监听器错误:', error);
        }
      }
    }
  }

  /**
   * 模式转正则
   */
  private patternToRegex(pattern: string): RegExp {
    const escaped = pattern
      .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
      .replace(/\*/g, '.*');
    return new RegExp(`^${escaped}$`);
  }
}

// ============================================================================
// Skill 导出
// ============================================================================

const cacheManager = new CacheManager();

export const cacheManagerProSkill: Skill = {
  name: 'cache-manager-pro',
  version: '1.0.0',
  description: '缓存管理器工具 - 支持 TTL/LRU/LFU 策略，提供缓存失效和统计功能',
  commands: [
    {
      name: 'cache.set',
      description: '设置缓存条目',
      parameters: {
        key: 'string (required) - 缓存键',
        value: 'any (required) - 缓存值',
        ttl: 'number (optional) - 过期时间 (秒)',
        metadata: 'object (optional) - 元数据',
      },
      handler: async (key: string, value: unknown, options?: { ttl?: number; metadata?: Record<string, unknown> }) => {
        cacheManager.set(key, value, options);
        return { success: true, key, message: `缓存已设置: ${key}` };
      },
    },
    {
      name: 'cache.get',
      description: '获取缓存条目',
      parameters: {
        key: 'string (required) - 缓存键',
      },
      handler: async (key: string) => {
        const value = cacheManager.get(key);
        return {
          success: value !== undefined,
          key,
          value,
          found: value !== undefined,
        };
      },
    },
    {
      name: 'cache.delete',
      description: '删除缓存条目',
      parameters: {
        key: 'string (required) - 缓存键',
      },
      handler: async (key: string) => {
        const deleted = cacheManager.delete(key);
        return { success: deleted, key, deleted };
      },
    },
    {
      name: 'cache.invalidate',
      description: '批量失效缓存 (支持通配符)',
      parameters: {
        pattern: 'string (required) - 匹配模式 (支持 * 通配符)',
      },
      handler: async (pattern: string) => {
        const count = cacheManager.invalidate(pattern);
        return { success: true, pattern, deletedCount: count };
      },
    },
    {
      name: 'cache.stats',
      description: '获取缓存统计信息',
      parameters: {},
      handler: async () => {
        const stats = cacheManager.getStats();
        return { success: true, stats };
      },
    },
    {
      name: 'cache.clear',
      description: '清空所有缓存',
      parameters: {},
      handler: async () => {
        cacheManager.clear();
        return { success: true, message: '缓存已清空' };
      },
    },
    {
      name: 'cache.keys',
      description: '获取所有缓存键',
      parameters: {},
      handler: async () => {
        const keys = cacheManager.keys();
        return { success: true, keys, count: keys.length };
      },
    },
    {
      name: 'cache.export',
      description: '导出缓存到文件',
      parameters: {
        filePath: 'string (required) - 导出文件路径',
      },
      handler: async (filePath: string) => {
        const success = cacheManager.export(filePath);
        return { success, filePath };
      },
    },
    {
      name: 'cache.import',
      description: '从文件导入缓存',
      parameters: {
        filePath: 'string (required) - 导入文件路径',
      },
      handler: async (filePath: string) => {
        const count = cacheManager.import(filePath);
        return { success: count > 0, importedCount: count, filePath };
      },
    },
    {
      name: 'cache.config',
      description: '获取/设置缓存配置',
      parameters: {
        maxEntries: 'number (optional) - 最大条目数',
        defaultTTL: 'number (optional) - 默认 TTL (秒)',
        strategy: 'string (optional) - 策略 (ttl/lru/lfu/fifo)',
      },
      handler: async (config?: Partial<CacheConfig>) => {
        if (config) {
          Object.assign(cacheManager, { config: { ...cacheManager['config'], ...config } });
          return { success: true, message: '配置已更新', config };
        }
        return { success: true, config: cacheManager['config'] };
      },
    },
  ],
  metadata: {
    author: 'ACE',
    tags: ['cache', 'performance', 'memory'],
    examples: [
      'cache.set user:1001 {name: "Alice"} --ttl 3600',
      'cache.get user:1001',
      'cache.invalidate user:*',
      'cache.stats',
    ],
  },
};

export default cacheManagerProSkill;
