/**
 * Multiton Pattern Skill - KAEL Engineering
 * 
 * 提供多例模式实现，支持：
 * 1. 键控实例管理 (Key-controlled Instances)
 * 2. 实例池管理 (Instance Pool)
 * 3. 懒加载创建 (Lazy Initialization)
 * 4. 实例复用与回收 (Instance Reuse & Recycling)
 * 
 * 多例模式是单例模式的泛化，允许为不同的键创建不同的实例，
 * 但相同键始终返回同一实例。
 * 
 * @author KAEL
 * @version 1.0.0
 */

// ============================================================================
// 类型定义
// ============================================================================

/**
 * 多例配置选项
 */
export interface MultitonOptions {
  /** 多例名称 */
  name?: string;
  /** 是否启用日志 */
  enableLog?: boolean;
  /** 实例最大空闲时间 (毫秒)，超时自动回收 */
  maxIdleTime?: number;
  /** 是否启用自动回收 */
  enableAutoRecycle?: boolean;
}

/**
 * 实例包装器 - 包含实例及其元数据
 */
export interface InstanceWrapper<T> {
  /** 实例对象 */
  instance: T;
  /** 创建时间戳 */
  createdAt: number;
  /** 最后访问时间戳 */
  lastAccessedAt: number;
  /** 访问计数 */
  accessCount: number;
  /** 是否正在使用中 */
  inUse: boolean;
  /** 最大空闲时间 (毫秒) */
  maxIdleTime?: number;
}

/**
 * 实例池统计信息
 */
export interface PoolStatistics {
  /** 总实例数 */
  totalInstances: number;
  /** 活跃实例数 */
  activeInstances: number;
  /** 空闲实例数 */
  idleInstances: number;
  /** 总访问次数 */
  totalAccesses: number;
  /** 缓存命中次数 */
  cacheHits: number;
  /** 缓存命中率 */
  hitRate: number;
  /** 各键实例分布 */
  instanceDistribution: Record<string, number>;
}

/**
 * 多例注册表 - 存储所有键控实例
 */
const multitonRegistry = new Map<string, InstanceWrapper<any>>();

/**
 * 锁表 - 用于线程安全的锁机制
 */
const lockTable = new Map<string, Promise<any>>();

/**
 * 访问统计表
 */
const statisticsTable = {
  totalAccesses: 0,
  cacheHits: 0,
  keyAccessCounts: new Map<string, number>(),
};

// ============================================================================
// 核心工具函数
// ============================================================================

/**
 * 获取或创建锁
 */
function getLock(key: string): Promise<() => void> {
  if (!lockTable.has(key)) {
    lockTable.set(key, Promise.resolve());
  }
  
  let release: () => void;
  const newLock = new Promise<void>(resolve => {
    release = resolve;
  });
  
  const currentLock = lockTable.get(key)!;
  lockTable.set(key, newLock);
  
  return currentLock.then(() => release!);
}

/**
 * 生成唯一实例 ID
 */
function generateInstanceId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 记录日志 (如果启用)
 */
function log(message: string, enableLog: boolean): void {
  if (enableLog) {
    console.log(`[Multiton] ${message}`);
  }
}

// ============================================================================
// 多例模式核心实现
// ============================================================================

/**
 * 获取或创建多例实例
 * 
 * 这是多例模式的核心方法，为每个唯一的键创建并维护一个实例。
 * 相同键始终返回同一实例，不同键返回不同实例。
 * 
 * @param key 实例标识键
 * @param factory 实例工厂函数
 * @param options 配置选项
 * @returns Promise<T> 多例实例
 * 
 * @example
 * ```typescript
 * // 创建数据库连接多例
 * const db1 = await getOrCreateMultiton('db-primary', () => new Database('primary'));
 * const db2 = await getOrCreateMultiton('db-replica', () => new Database('replica'));
 * const db1Again = await getOrCreateMultiton('db-primary', () => new Database('primary'));
 * 
 * console.log(db1 === db1Again); // true - 相同键返回相同实例
 * console.log(db1 === db2);      // false - 不同键返回不同实例
 * ```
 */
export async function getOrCreateMultiton<T>(
  key: string,
  factory: () => T | Promise<T>,
  options: MultitonOptions = {}
): Promise<T> {
  const {
    name = key,
    enableLog = false,
    maxIdleTime = 0,
    enableAutoRecycle = false,
  } = options;
  
  const now = Date.now();
  
  // 检查实例是否已存在
  if (multitonRegistry.has(key)) {
    const wrapper = multitonRegistry.get(key) as InstanceWrapper<T>;
    
    // 检查是否需要回收
    if (enableAutoRecycle && maxIdleTime > 0) {
      const idleTime = now - wrapper.lastAccessedAt;
      if (idleTime > maxIdleTime && !wrapper.inUse) {
        log(`实例 [${name}] 空闲超时 (${idleTime}ms > ${maxIdleTime}ms)，准备回收`, enableLog);
        multitonRegistry.delete(key);
        // 继续创建新实例
      } else {
        // 返回缓存实例
        wrapper.lastAccessedAt = now;
        wrapper.accessCount++;
        wrapper.inUse = true;
        
        statisticsTable.totalAccesses++;
        statisticsTable.cacheHits++;
        statisticsTable.keyAccessCounts.set(
          key,
          (statisticsTable.keyAccessCounts.get(key) || 0) + 1
        );
        
        log(`实例 [${name}] 命中缓存 (访问次数：${wrapper.accessCount})`, enableLog);
        return wrapper.instance;
      }
    } else {
      // 返回缓存实例
      wrapper.lastAccessedAt = now;
      wrapper.accessCount++;
      wrapper.inUse = true;
      
      statisticsTable.totalAccesses++;
      statisticsTable.cacheHits++;
      statisticsTable.keyAccessCounts.set(
        key,
        (statisticsTable.keyAccessCounts.get(key) || 0) + 1
      );
      
      log(`实例 [${name}] 命中缓存 (访问次数：${wrapper.accessCount})`, enableLog);
      return wrapper.instance;
    }
  }
  
  // 获取锁，确保线程安全
  const release = await getLock(key);
  
  try {
    // 双重检查锁定
    if (multitonRegistry.has(key)) {
      const wrapper = multitonRegistry.get(key) as InstanceWrapper<T>;
      wrapper.lastAccessedAt = now;
      wrapper.accessCount++;
      wrapper.inUse = true;
      
      statisticsTable.totalAccesses++;
      statisticsTable.cacheHits++;
      
      log(`实例 [${name}] 双重检查命中缓存`, enableLog);
      return wrapper.instance;
    }
    
    // 创建新实例
    log(`实例 [${name}] 未命中缓存，创建新实例...`, enableLog);
    
    statisticsTable.totalAccesses++;
    statisticsTable.keyAccessCounts.set(
      key,
      (statisticsTable.keyAccessCounts.get(key) || 0) + 1
    );
    
    const instance = await Promise.resolve(factory());
    
    const wrapper: InstanceWrapper<T> = {
      instance,
      createdAt: now,
      lastAccessedAt: now,
      accessCount: 1,
      inUse: true,
    };
    
    multitonRegistry.set(key, wrapper);
    
    log(`实例 [${name}] 创建成功`, enableLog);
    return instance;
  } finally {
    release();
  }
}

/**
 * 释放实例 (标记为未使用)
 * 
 * 调用此方法标记实例不再被使用，允许自动回收机制工作。
 * 
 * @param key 实例标识键
 * @param options 配置选项
 * 
 * @example
 * ```typescript
 * const db = await getOrCreateMultiton('db-primary', () => new Database());
 * await db.query('SELECT * FROM users');
 * releaseMultiton('db-primary'); // 标记为可回收
 * ```
 */
export function releaseMultiton(key: string, options: MultitonOptions = {}): void {
  const { enableLog = false } = options;
  
  if (multitonRegistry.has(key)) {
    const wrapper = multitonRegistry.get(key);
    wrapper.inUse = false;
    log(`实例 [${key}] 已释放 (访问次数：${wrapper.accessCount})`, enableLog);
  } else {
    log(`实例 [${key}] 不存在，无法释放`, enableLog);
  }
}

/**
 * 删除多例实例
 * 
 * 强制删除指定键的实例，无论是否正在使用。
 * 
 * @param key 实例标识键
 * @param options 配置选项
 * @returns 是否删除成功
 */
export function deleteMultiton(key: string, options: MultitonOptions = {}): boolean {
  const { enableLog = false } = options;
  
  if (multitonRegistry.has(key)) {
    const wrapper = multitonRegistry.get(key);
    multitonRegistry.delete(key);
    log(`实例 [${key}] 已强制删除`, enableLog);
    return true;
  }
  
  log(`实例 [${key}] 不存在`, enableLog);
  return false;
}

/**
 * 清空所有多例实例
 * 
 * 删除注册表中的所有实例。
 * 
 * @param options 配置选项
 */
export function clearAllMultitons(options: MultitonOptions = {}): void {
  const { enableLog = false } = options;
  const count = multitonRegistry.size;
  multitonRegistry.clear();
  log(`已清空所有 ${count} 个实例`, enableLog);
}

/**
 * 获取实例统计信息
 * 
 * @returns 实例池统计信息
 */
export function getMultitonStatistics(): PoolStatistics {
  const totalInstances = multitonRegistry.size;
  let activeInstances = 0;
  let idleInstances = 0;
  const instanceDistribution: Record<string, number> = {};
  
  for (const [key, wrapper] of multitonRegistry.entries()) {
    if (wrapper.inUse) {
      activeInstances++;
    } else {
      idleInstances++;
    }
    
    // 统计实例分布
    const prefix = key.split('-')[0] || key;
    instanceDistribution[prefix] = (instanceDistribution[prefix] || 0) + 1;
  }
  
  const hitRate = statisticsTable.totalAccesses > 0
    ? (statisticsTable.cacheHits / statisticsTable.totalAccesses) * 100
    : 0;
  
  return {
    totalInstances,
    activeInstances,
    idleInstances,
    totalAccesses: statisticsTable.totalAccesses,
    cacheHits: statisticsTable.cacheHits,
    hitRate,
    instanceDistribution,
  };
}

/**
 * 重置统计信息
 */
export function resetStatistics(): void {
  statisticsTable.totalAccesses = 0;
  statisticsTable.cacheHits = 0;
  statisticsTable.keyAccessCounts.clear();
}

// ============================================================================
// 实例池管理
// ============================================================================

/**
 * 实例池配置
 */
export interface InstancePoolConfig<T> {
  /** 池名称 */
  name: string;
  /** 最小实例数 */
  minSize: number;
  /** 最大实例数 */
  maxSize: number;
  /** 实例工厂函数 */
  factory: () => T | Promise<T>;
  /** 实例验证函数 */
  validate?: (instance: T) => boolean | Promise<boolean>;
  /** 实例销毁函数 */
  destroy?: (instance: T) => void | Promise<void>;
  /** 是否启用日志 */
  enableLog?: boolean;
}

/**
 * 实例池类
 * 
 * 提供预创建实例池，支持实例复用、验证和自动扩容。
 */
export class InstancePool<T> {
  private config: InstancePoolConfig<T>;
  private pool: Array<{ instance: T; inUse: boolean; createdAt: number }>;
  private waitQueue: Array<(instance: T) => void>;
  private isDestroyed: boolean = false;

  constructor(config: InstancePoolConfig<T>) {
    this.config = {
      enableLog: false,
      ...config,
    };
    this.pool = [];
    this.waitQueue = [];
    this.isDestroyed = false;
    
    // 初始化池
    this.initializePool();
  }

  private log(message: string): void {
    if (this.config.enableLog) {
      console.log(`[Pool:${this.config.name}] ${message}`);
    }
  }

  /**
   * 初始化实例池
   */
  private async initializePool(): Promise<void> {
    this.log(`初始化池，最小大小：${this.config.minSize}`);
    
    for (let i = 0; i < this.config.minSize; i++) {
      try {
        const instance = await Promise.resolve(this.config.factory());
        this.pool.push({
          instance,
          inUse: false,
          createdAt: Date.now(),
        });
        this.log(`创建实例 ${i + 1}/${this.config.minSize}`);
      } catch (error) {
        this.log(`创建实例失败：${error}`);
      }
    }
  }

  /**
   * 获取实例
   * 
   * 从池中获取一个可用实例，如果没有可用实例且未达到最大大小，则创建新实例。
   * 如果已达到最大大小，则等待直到有实例释放。
   * 
   * @param timeout 超时时间 (毫秒)，默认 30000ms
   * @returns 实例
   */
  async acquire(timeout: number = 30000): Promise<T> {
    if (this.isDestroyed) {
      throw new Error('实例池已销毁');
    }

    // 尝试获取空闲实例
    for (const item of this.pool) {
      if (!item.inUse) {
        // 验证实例
        if (this.config.validate) {
          try {
            const isValid = await Promise.resolve(this.config.validate(item.instance));
            if (!isValid) {
              this.log('实例验证失败，销毁并跳过');
              await this.destroyInstance(item.instance);
              continue;
            }
          } catch (error) {
            this.log(`实例验证异常：${error}`);
            continue;
          }
        }

        item.inUse = true;
        this.log(`获取实例 (池中剩余：${this.getAvailableCount()})`);
        return item.instance;
      }
    }

    // 没有空闲实例，检查是否可以扩容
    if (this.pool.length < this.config.maxSize) {
      this.log('池扩容中...');
      try {
        const instance = await Promise.resolve(this.config.factory());
        const newItem = {
          instance,
          inUse: true,
          createdAt: Date.now(),
        };
        this.pool.push(newItem);
        this.log(`扩容成功，新实例加入 (池大小：${this.pool.length})`);
        return instance;
      } catch (error) {
        this.log(`扩容失败：${error}`);
      }
    }

    // 池已满，等待
    this.log('池已满，加入等待队列');
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        const index = this.waitQueue.indexOf(resolve);
        if (index > -1) {
          this.waitQueue.splice(index, 1);
          reject(new Error('获取实例超时'));
        }
      }, timeout);

      this.waitQueue.push((instance) => {
        clearTimeout(timeoutId);
        resolve(instance);
      });
    });
  }

  /**
   * 释放实例
   * 
   * 将实例归还到池中，供其他请求使用。
   * 
   * @param instance 要释放的实例
   */
  async release(instance: T): Promise<void> {
    const item = this.pool.find(item => item.instance === instance);
    
    if (!item) {
      this.log('警告：释放未知实例');
      return;
    }

    item.inUse = false;
    this.log(`实例已释放 (池中可用：${this.getAvailableCount()})`);

    // 唤醒等待队列
    if (this.waitQueue.length > 0) {
      const resolve = this.waitQueue.shift()!;
      item.inUse = true;
      resolve(instance);
      this.log('唤醒等待队列中的请求');
    }
  }

  /**
   * 获取池统计信息
   */
  getStatistics(): {
    size: number;
    available: number;
    inUse: number;
    waiting: number;
  } {
    const available = this.getAvailableCount();
    return {
      size: this.pool.length,
      available,
      inUse: this.pool.length - available,
      waiting: this.waitQueue.length,
    };
  }

  /**
   * 获取可用实例数
   */
  private getAvailableCount(): number {
    return this.pool.filter(item => !item.inUse).length;
  }

  /**
   * 销毁实例
   */
  private async destroyInstance(instance: T): Promise<void> {
    if (this.config.destroy) {
      try {
        await Promise.resolve(this.config.destroy(instance));
      } catch (error) {
        this.log(`销毁实例失败：${error}`);
      }
    }
    
    const index = this.pool.findIndex(item => item.instance === instance);
    if (index > -1) {
      this.pool.splice(index, 1);
    }
  }

  /**
   * 销毁整个池
   */
  async destroy(): Promise<void> {
    this.log('销毁池中...');
    this.isDestroyed = true;

    for (const item of this.pool) {
      await this.destroyInstance(item.instance);
    }

    this.pool = [];
    this.log('池已销毁');
  }
}

// ============================================================================
// 高级功能
// ============================================================================

/**
 * 创建键控多例管理器
 * 
 * 提供一个更高级的 API，支持命名空间、批量操作等。
 * 
 * @example
 * ```typescript
 * const manager = createMultitonManager({
 *   namespace: 'database',
 *   enableLog: true,
 * });
 * 
 * const db1 = await manager.get('primary', () => new Database('primary'));
 * const db2 = await manager.get('replica', () => new Database('replica'));
 * 
 * console.log(manager.keys()); // ['database-primary', 'database-replica']
 * ```
 */
export function createMultitonManager(options: {
  namespace?: string;
  enableLog?: boolean;
  maxIdleTime?: number;
} = {}) {
  const {
    namespace = '',
    enableLog = false,
    maxIdleTime = 0,
  } = options;

  const makeKey = (key: string): string => {
    return namespace ? `${namespace}-${key}` : key;
  };

  return {
    /**
     * 获取或创建实例
     */
    async get<T>(key: string, factory: () => T | Promise<T>): Promise<T> {
      return getOrCreateMultiton(makeKey(key), factory, {
        name: key,
        enableLog,
        maxIdleTime,
      });
    },

    /**
     * 释放实例
     */
    release(key: string): void {
      releaseMultiton(makeKey(key), { enableLog });
    },

    /**
     * 删除实例
     */
    delete(key: string): boolean {
      return deleteMultiton(makeKey(key), { enableLog });
    },

    /**
     * 获取所有键
     */
    keys(): string[] {
      const prefix = namespace ? `${namespace}-` : '';
      const allKeys = Array.from(multitonRegistry.keys());
      return prefix
        ? allKeys.filter(k => k.startsWith(prefix)).map(k => k.slice(prefix.length))
        : allKeys;
    },

    /**
     * 获取统计信息
     */
    statistics(): PoolStatistics {
      const stats = getMultitonStatistics();
      if (namespace) {
        const prefix = `${namespace}-`;
        const filteredDistribution: Record<string, number> = {};
        
        for (const [key, count] of Object.entries(stats.instanceDistribution)) {
          if (key.startsWith(prefix)) {
            filteredDistribution[key.slice(prefix.length)] = count;
          }
        }
        
        return {
          ...stats,
          instanceDistribution: filteredDistribution,
        };
      }
      return stats;
    },
  };
}

/**
 * 自动回收空闲实例
 * 
 * 启动一个后台任务，定期回收超过最大空闲时间的实例。
 * 
 * @param checkInterval 检查间隔 (毫秒)，默认 60000ms (1 分钟)
 * @returns 停止回收的函数
 */
export function startAutoRecycle(
  checkInterval: number = 60000,
  options: MultitonOptions = {}
): () => void {
  const { enableLog = false } = options;
  
  log(`启动自动回收，检查间隔：${checkInterval}ms`, enableLog);
  
  const intervalId = setInterval(() => {
    const now = Date.now();
    let recycledCount = 0;
    
    for (const [key, wrapper] of multitonRegistry.entries()) {
      if (!wrapper.inUse) {
        const idleTime = now - wrapper.lastAccessedAt;
        const maxIdleTime = wrapper.maxIdleTime ?? 300000; // 默认 5 分钟
        
        if (idleTime > maxIdleTime) {
          multitonRegistry.delete(key);
          recycledCount++;
          log(`自动回收实例 [${key}] (空闲 ${idleTime}ms)`, enableLog);
        }
      }
    }
    
    if (recycledCount > 0) {
      log(`本次回收 ${recycledCount} 个实例`, enableLog);
    }
  }, checkInterval);
  
  // 返回停止函数
  return () => {
    clearInterval(intervalId);
    log('自动回收已停止', enableLog);
  };
}

// ============================================================================
// 导出
// ============================================================================

export default {
  getOrCreateMultiton,
  releaseMultiton,
  deleteMultiton,
  clearAllMultitons,
  getMultitonStatistics,
  resetStatistics,
  InstancePool,
  createMultitonManager,
  startAutoRecycle,
};
