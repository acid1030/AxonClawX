/**
 * Flyweight Pattern Pro Skill - ACE Framework
 * 
 * 享元模式专业版：高级对象池管理、内存优化、智能淘汰策略
 * 
 * @author Axon
 * @version 2.0.0 Pro
 * 
 * 核心功能:
 * 1. 享元定义 - 内部/外部状态分离
 * 2. 对象池管理 - 多级缓存、懒加载、预加载
 * 3. 内存优化 - WeakRef、FinalizationRegistry、LRU/LFU 淘汰
 */

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 类型定义
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * 享元对象接口
 */
export interface IFlyweight<TExternal = any> {
  /** 操作享元（使用外部状态） */
  operate(external: TExternal): void | Promise<void>;
  
  /** 获取内部状态哈希 */
  getIntrinsicHash(): string;
  
  /** 获取享元信息 */
  getInfo(): FlyweightInfo;
}

/**
 * 享元信息
 */
export interface FlyweightInfo {
  /** 内部状态哈希 */
  intrinsicHash: string;
  /** 创建时间 */
  createdAt: number;
  /** 最后访问时间 */
  lastAccessedAt: number;
  /** 访问次数 */
  accessCount: number;
  /** 内存占用估算（字节） */
  estimatedSize: number;
}

/**
 * 对象池配置
 */
export interface PoolConfig {
  /** 最小池大小 */
  minSize?: number;
  /** 最大池大小 */
  maxSize?: number;
  /** 空闲超时（ms） */
  idleTimeout?: number;
  /** 获取超时（ms） */
  acquireTimeout?: number;
  /** 淘汰策略 */
  evictionPolicy?: 'LRU' | 'LFU' | 'FIFO' | 'TTI';
  /** 内存优化级别 */
  memoryLevel?: 'low' | 'balanced' | 'high';
  /** 启用 WeakRef（自动垃圾回收） */
  enableWeakRef?: boolean;
  /** 预加载键列表 */
  preloadKeys?: any[];
  /** 工厂函数 */
  factory?: (intrinsic: any) => Promise<IFlyweight> | IFlyweight;
  /** 销毁回调 */
  onDestroy?: (flyweight: IFlyweight) => void;
  /** 统计上报间隔（ms） */
  statsInterval?: number;
}

/**
 * 池统计信息
 */
export interface PoolStats {
  /** 当前池大小 */
  size: number;
  /** 活跃对象数 */
  activeCount: number;
  /** 空闲对象数 */
  idleCount: number;
  /** 命中次数 */
  hitCount: number;
  /** 未命中次数 */
  missCount: number;
  /** 命中率 */
  hitRate: number;
  /** 创建次数 */
  createCount: number;
  /** 销毁次数 */
  destroyCount: number;
  /** 平均获取时间（ms） */
  avgAcquireTime: number;
  /** 估算内存占用（字节） */
  estimatedMemoryUsage: number;
  /** 估算节省内存（字节） */
  estimatedMemorySaved: number;
}

/**
 * 淘汰策略接口
 */
interface EvictionStrategy {
  name: string;
  selectVictim(accessOrder: string[], accessCounts: Map<string, number>): string | null;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 具体享元基类
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * 基础享元类
 * 
 * @template TIntrinsic 内部状态类型
 * @template TExternal 外部状态类型
 */
export abstract class BaseFlyweight<TIntrinsic = any, TExternal = any> implements IFlyweight<TExternal> {
  /** 内部状态（共享） */
  protected readonly intrinsic: TIntrinsic;
  
  /** 创建时间 */
  protected readonly createdAt: number;
  
  /** 最后访问时间 */
  protected lastAccessedAt: number;
  
  /** 访问计数 */
  protected accessCount: number = 0;

  constructor(intrinsic: TIntrinsic) {
    this.intrinsic = intrinsic;
    this.createdAt = Date.now();
    this.lastAccessedAt = Date.now();
  }

  /**
   * 操作享元
   */
  abstract operate(external: TExternal): void | Promise<void>;

  /**
   * 获取内部状态哈希
   */
  getIntrinsicHash(): string {
    return JSON.stringify(this.intrinsic);
  }

  /**
   * 获取享元信息
   */
  getInfo(): FlyweightInfo {
    return {
      intrinsicHash: this.getIntrinsicHash(),
      createdAt: this.createdAt,
      lastAccessedAt: this.lastAccessedAt,
      accessCount: this.accessCount,
      estimatedSize: this.estimateSize(),
    };
  }

  /**
   * 记录访问
   */
  protected recordAccess(): void {
    this.accessCount++;
    this.lastAccessedAt = Date.now();
  }

  /**
   * 估算内存大小（子类可重写）
   */
  protected estimateSize(): number {
    // 默认估算：对象序列化后的大小
    try {
      return new TextEncoder().encode(JSON.stringify(this.intrinsic)).length;
    } catch {
      return 1024; // 默认 1KB
    }
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 淘汰策略实现
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * LRU 淘汰策略（Least Recently Used）
 */
class LRUStrategy implements EvictionStrategy {
  name = 'LRU';
  
  selectVictim(accessOrder: string[]): string | null {
    if (accessOrder.length === 0) return null;
    return accessOrder[0]; // 最早访问的
  }
}

/**
 * LFU 淘汰策略（Least Frequently Used）
 */
class LFUStrategy implements EvictionStrategy {
  name = 'LFU';
  
  selectVictim(_: string[], accessCounts: Map<string, number>): string | null {
    if (accessCounts.size === 0) return null;
    
    let minKey: string | null = null;
    let minCount = Infinity;
    
    for (const [key, count] of accessCounts) {
      if (count < minCount) {
        minCount = count;
        minKey = key;
      }
    }
    
    return minKey;
  }
}

/**
 * FIFO 淘汰策略（First In First Out）
 */
class FIFOStrategy implements EvictionStrategy {
  name = 'FIFO';
  
  selectVictim(accessOrder: string[]): string | null {
    if (accessOrder.length === 0) return null;
    return accessOrder[0];
  }
}

/**
 * TTI 淘汰策略（Time To Idle）
 */
class TTIStrategy implements EvictionStrategy {
  name = 'TTI';
  
  constructor(private idleTimeout: number) {}
  
  selectVictim(accessOrder: string[], _: Map<string, number>, timestamps?: Map<string, number>): string | null {
    if (!timestamps || timestamps.size === 0) return null;
    
    const now = Date.now();
    let victim: string | null = null;
    let maxIdle = 0;
    
    for (const [key, timestamp] of timestamps) {
      const idleTime = now - timestamp;
      if (idleTime > this.idleTimeout && idleTime > maxIdle) {
        maxIdle = idleTime;
        victim = key;
      }
    }
    
    return victim;
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 享元池（对象池）核心实现
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * 享元池类 - 专业级对象池管理
 * 
 * 特性:
 * - 多级缓存（L1: Map, L2: WeakRef）
 * - 智能淘汰（LRU/LFU/FIFO/TTI）
 * - 懒加载/预加载
 * - 内存监控
 * - 异步支持
 */
export class FlyweightPool<TIntrinsic = any, TExternal = any> {
  /** 主缓存（强引用） */
  private cache: Map<string, IFlyweight<TExternal>> = new Map();
  
  /** WeakRef 缓存（允许 GC） */
  private weakCache?: Map<string, WeakRef<IFlyweight<TExternal>>>;
  
  /** 最终化注册表（清理 WeakRef） */
  private finalizationRegistry?: FinalizationRegistry<string>;
  
  /** 访问顺序队列 */
  private accessOrder: string[] = [];
  
  /** 访问计数（LFU） */
  private accessCounts: Map<string, number> = new Map();
  
  /** 最后访问时间（TTI） */
  private lastAccessTime: Map<string, number> = new Map();
  
  /** 活跃对象集合 */
  private activeSet: Set<string> = new Set();
  
  /** 配置 */
  private config: Required<PoolConfig>;
  
  /** 统计信息 */
  private stats: PoolStats = {
    size: 0,
    activeCount: 0,
    idleCount: 0,
    hitCount: 0,
    missCount: 0,
    hitRate: 0,
    createCount: 0,
    destroyCount: 0,
    avgAcquireTime: 0,
    estimatedMemoryUsage: 0,
    estimatedMemorySaved: 0,
  };
  
  /** 总获取时间（用于计算平均） */
  private totalAcquireTime: number = 0;
  
  /** 获取次数 */
  private acquireCount: number = 0;
  
  /** 淘汰策略 */
  private evictionStrategy: EvictionStrategy;
  
  /** 统计上报定时器 */
  private statsTimer?: NodeJS.Timeout;

  constructor(config: PoolConfig = {}) {
    this.config = {
      minSize: config.minSize ?? 0,
      maxSize: config.maxSize ?? 1000,
      idleTimeout: config.idleTimeout ?? 300000, // 5 分钟
      acquireTimeout: config.acquireTimeout ?? 5000,
      evictionPolicy: config.evictionPolicy ?? 'LRU',
      memoryLevel: config.memoryLevel ?? 'balanced',
      enableWeakRef: config.enableWeakRef ?? false,
      preloadKeys: config.preloadKeys ?? [],
      factory: config.factory ?? (async () => {
        throw new Error('No factory provided');
      }),
      onDestroy: config.onDestroy ?? (() => {}),
      statsInterval: config.statsInterval ?? 0,
    };
    
    // 初始化淘汰策略
    this.evictionStrategy = this.createEvictionStrategy();
    
    // 启用 WeakRef（Node.js 14+）
    if (this.config.enableWeakRef && typeof WeakRef !== 'undefined') {
      this.weakCache = new Map();
      this.finalizationRegistry = new FinalizationRegistry((key: string) => {
        this.onGarbageCollected(key);
      });
    }
    
    // 预加载
    if (this.config.preloadKeys.length > 0) {
      this.preload();
    }
    
    // 启动统计上报
    if (this.config.statsInterval > 0) {
      this.startStatsReporting();
    }
  }

  /**
   * 获取或创建享元
   */
  async acquire(intrinsic: TIntrinsic): Promise<IFlyweight<TExternal>> {
    const startTime = Date.now();
    const key = this.generateKey(intrinsic);
    
    // 尝试从缓存获取
    let flyweight = this.getFromCache(key);
    
    if (flyweight) {
      this.stats.hitCount++;
      this.recordAccess(key);
    } else {
      // 缓存未命中，创建新对象
      this.stats.missCount++;
      
      // 检查池大小限制
      if (this.cache.size >= this.config.maxSize) {
        await this.evict();
      }
      
      // 使用工厂创建
      flyweight = await this.config.factory(intrinsic);
      this.cache.set(key, flyweight);
      
      // 设置 WeakRef
      if (this.weakCache && this.finalizationRegistry) {
        this.weakCache.set(key, new WeakRef(flyweight));
        this.finalizationRegistry.register(flyweight, key);
      }
      
      this.stats.createCount++;
      this.recordAccess(key);
    }
    
    // 标记为活跃
    this.activeSet.add(key);
    this.updateStats();
    
    // 记录获取时间
    const acquireTime = Date.now() - startTime;
    this.totalAcquireTime += acquireTime;
    this.acquireCount++;
    this.stats.avgAcquireTime = this.totalAcquireTime / this.acquireCount;
    
    return flyweight;
  }

  /**
   * 释放享元（返回池中）
   */
  release(intrinsic: TIntrinsic): void {
    const key = this.generateKey(intrinsic);
    this.activeSet.delete(key);
    this.updateStats();
    
    // 检查空闲超时清理
    this.checkIdleTimeout();
  }

  /**
   * 批量获取
   */
  async acquireBatch(intrinsics: TIntrinsic[]): Promise<IFlyweight<TExternal>[]> {
    return Promise.all(intrinsics.map(i => this.acquire(i)));
  }

  /**
   * 执行操作（获取 + 操作 + 释放）
   */
  async operate(intrinsic: TIntrinsic, external: TExternal): Promise<void> {
    const flyweight = await this.acquire(intrinsic);
    try {
      await flyweight.operate(external);
    } finally {
      this.release(intrinsic);
    }
  }

  /**
   * 预加载
   */
  async preload(): Promise<void> {
    if (this.config.preloadKeys.length === 0) return;
    
    console.log(`[FlyweightPool] Preloading ${this.config.preloadKeys.length} keys...`);
    
    for (const key of this.config.preloadKeys) {
      try {
        await this.acquire(key);
      } catch (error) {
        console.warn(`[FlyweightPool] Preload failed for key:`, key, error);
      }
    }
    
    console.log(`[FlyweightPool] Preload complete. Cache size: ${this.cache.size}`);
  }

  /**
   * 清除缓存
   */
  async clear(): Promise<void> {
    for (const [key, flyweight] of this.cache) {
      this.config.onDestroy(flyweight);
    }
    
    this.cache.clear();
    this.weakCache?.clear();
    this.accessOrder = [];
    this.accessCounts.clear();
    this.lastAccessTime.clear();
    this.activeSet.clear();
    
    this.stats.destroyCount += this.stats.size;
    this.updateStats();
  }

  /**
   * 获取统计信息
   */
  getStats(): PoolStats {
    this.updateStats();
    return { ...this.stats };
  }

  /**
   * 销毁池
   */
  async destroy(): Promise<void> {
    if (this.statsTimer) {
      clearInterval(this.statsTimer);
    }
    await this.clear();
  }

  /**
   * 生成缓存键
   */
  private generateKey(intrinsic: TIntrinsic): string {
    return JSON.stringify(intrinsic);
  }

  /**
   * 从缓存获取
   */
  private getFromCache(key: string): IFlyweight<TExternal> | null {
    // 优先从强引用缓存获取
    if (this.cache.has(key)) {
      return this.cache.get(key)!;
    }
    
    // 尝试从 WeakRef 缓存获取
    if (this.weakCache) {
      const weakRef = this.weakCache.get(key);
      if (weakRef) {
        const flyweight = weakRef.deref();
        if (flyweight) {
          return flyweight;
        }
        // 已被 GC，从 WeakRef 缓存移除
        this.weakCache.delete(key);
      }
    }
    
    return null;
  }

  /**
   * 记录访问
   */
  private recordAccess(key: string): void {
    // 更新访问顺序
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
    this.accessOrder.push(key);
    
    // 更新访问计数
    this.accessCounts.set(key, (this.accessCounts.get(key) || 0) + 1);
    
    // 更新最后访问时间
    this.lastAccessTime.set(key, Date.now());
  }

  /**
   * 淘汰对象
   */
  private async evict(): Promise<void> {
    let victim: string | null = null;
    
    // 使用配置的淘汰策略
    switch (this.config.evictionPolicy) {
      case 'LRU':
        victim = (this.evictionStrategy as LRUStrategy).selectVictim(this.accessOrder, this.accessCounts);
        break;
      case 'LFU':
        victim = (this.evictionStrategy as LFUStrategy).selectVictim(this.accessOrder, this.accessCounts);
        break;
      case 'FIFO':
        victim = (this.evictionStrategy as FIFOStrategy).selectVictim(this.accessOrder, this.accessCounts);
        break;
      case 'TTI':
        victim = (this.evictionStrategy as TTIStrategy).selectVictim(
          this.accessOrder, 
          this.accessCounts, 
          this.lastAccessTime
        );
        break;
    }
    
    if (victim && !this.activeSet.has(victim)) {
      const flyweight = this.cache.get(victim);
      if (flyweight) {
        this.config.onDestroy(flyweight);
      }
      this.cache.delete(victim);
      this.weakCache?.delete(victim);
      this.accessCounts.delete(victim);
      this.lastAccessTime.delete(victim);
      
      const index = this.accessOrder.indexOf(victim);
      if (index > -1) {
        this.accessOrder.splice(index, 1);
      }
      
      this.stats.destroyCount++;
    }
  }

  /**
   * 检查空闲超时
   */
  private checkIdleTimeout(): void {
    const now = Date.now();
    const victims: string[] = [];
    
    for (const [key, timestamp] of this.lastAccessTime) {
      if (!this.activeSet.has(key) && (now - timestamp) > this.config.idleTimeout) {
        victims.push(key);
      }
    }
    
    for (const key of victims) {
      const flyweight = this.cache.get(key);
      if (flyweight) {
        this.config.onDestroy(flyweight);
      }
      this.cache.delete(key);
      this.stats.destroyCount++;
    }
  }

  /**
   * 更新统计
   */
  private updateStats(): void {
    this.stats.size = this.cache.size;
    this.stats.activeCount = this.activeSet.size;
    this.stats.idleCount = this.stats.size - this.stats.activeCount;
    this.stats.hitRate = 
      this.stats.hitCount / (this.stats.hitCount + this.stats.missCount) || 0;
    
    // 估算内存
    const avgSize = 1024; // 假设每个对象 1KB
    this.stats.estimatedMemoryUsage = this.stats.size * avgSize;
    this.stats.estimatedMemorySaved = this.stats.hitCount * avgSize;
  }

  /**
   * 创建淘汰策略
   */
  private createEvictionStrategy(): EvictionStrategy {
    switch (this.config.evictionPolicy) {
      case 'LRU': return new LRUStrategy();
      case 'LFU': return new LFUStrategy();
      case 'FIFO': return new FIFOStrategy();
      case 'TTI': return new TTIStrategy(this.config.idleTimeout);
      default: return new LRUStrategy();
    }
  }

  /**
   * WeakRef 被 GC 时的回调
   */
  private onGarbageCollected(key: string): void {
    this.cache.delete(key);
    this.weakCache?.delete(key);
    console.log(`[FlyweightPool] Garbage collected:`, key);
  }

  /**
   * 启动统计上报
   */
  private startStatsReporting(): void {
    this.statsTimer = setInterval(() => {
      const stats = this.getStats();
      console.log('[FlyweightPool Stats]', JSON.stringify(stats, null, 2));
    }, this.config.statsInterval);
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 享元模式 Pro 技能类
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Flyweight Pattern Pro Skill
 * 
 * 提供专业级享元模式实现
 */
export class FlyweightPatternProSkill {
  /** 默认池实例 */
  private defaultPool?: FlyweightPool<any, any>;

  constructor(config?: PoolConfig) {
    if (config) {
      this.defaultPool = new FlyweightPool(config);
    }
  }

  /**
   * 创建新的享元池
   */
  createPool<TIntrinsic, TExternal>(
    config?: PoolConfig
  ): FlyweightPool<TIntrinsic, TExternal> {
    return new FlyweightPool<TIntrinsic, TExternal>(config);
  }

  /**
   * 获取默认池
   */
  getDefaultPool(): FlyweightPool<any, any> | undefined {
    return this.defaultPool;
  }

  /**
   * 销毁默认池
   */
  async destroyDefaultPool(): Promise<void> {
    if (this.defaultPool) {
      await this.defaultPool.destroy();
      this.defaultPool = undefined;
    }
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 使用示例
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * 示例 1: 文档编辑器字体共享
 */
export async function exampleDocumentEditor(): Promise<void> {
  console.log('\n=== 示例 1: 文档编辑器字体共享 ===\n');
  
  // 定义字体样式（内部状态）
  type FontStyle = {
    family: string;
    size: number;
    weight: 'normal' | 'bold';
    style: 'normal' | 'italic';
  };
  
  // 定义字符位置（外部状态）
  type CharContext = {
    char: string;
    index: number;
    line: number;
    column: number;
  };
  
  // 创建具体享元
  class FontFlyweight extends BaseFlyweight<FontStyle, CharContext> {
    async operate(external: CharContext): Promise<void> {
      this.recordAccess();
      console.log(`  [Font] Render "${external.char}" at L${external.line}:C${external.column} ` +
        `using ${this.intrinsic.family} ${this.intrinsic.size}px`);
    }
  }
  
  // 创建池
  const pool = new FlyweightPool<FontStyle, CharContext>({
    maxSize: 50,
    evictionPolicy: 'LRU',
    enableWeakRef: true,
    factory: async (intrinsic) => new FontFlyweight(intrinsic),
  });
  
  // 模拟文档（1000 个字符，使用 5 种字体）
  const fonts: FontStyle[] = [
    { family: 'Arial', size: 12, weight: 'normal', style: 'normal' },
    { family: 'Arial', size: 14, weight: 'bold', style: 'normal' },
    { family: 'Times', size: 12, weight: 'normal', style: 'italic' },
    { family: 'Courier', size: 10, weight: 'normal', style: 'normal' },
    { family: 'Helvetica', size: 16, weight: 'bold', style: 'italic' },
  ];
  
  console.log('渲染 1000 个字符...\n');
  
  for (let i = 0; i < 1000; i++) {
    const font = fonts[i % 5];
    const context: CharContext = {
      char: String.fromCharCode(65 + (i % 26)),
      index: i,
      line: Math.floor(i / 80),
      column: i % 80,
    };
    
    await pool.operate(font, context);
  }
  
  // 统计
  const stats = pool.getStats();
  console.log('\n📊 统计:');
  console.log(`  池大小：${stats.size}`);
  console.log(`  命中率：${(stats.hitRate * 100).toFixed(2)}%`);
  console.log(`  创建次数：${stats.createCount}`);
  console.log(`  估算节省：${(stats.estimatedMemorySaved / 1024).toFixed(2)} KB`);
  
  await pool.destroy();
}

/**
 * 示例 2: 游戏粒子系统
 */
export async function exampleParticleSystem(): Promise<void> {
  console.log('\n=== 示例 2: 游戏粒子系统 ===\n');
  
  // 粒子类型（内部状态）
  type ParticleType = {
    texture: string;
    color: string;
    size: number;
    lifetime: number;
  };
  
  // 粒子实例数据（外部状态）
  type ParticleInstance = {
    x: number;
    y: number;
    vx: number;
    vy: number;
    age: number;
  };
  
  // 粒子享元
  class ParticleFlyweight extends BaseFlyweight<ParticleType, ParticleInstance> {
    async operate(external: ParticleInstance): Promise<void> {
      this.recordAccess();
      // 模拟粒子更新
      console.log(`  [Particle] ${this.intrinsic.texture} @ (${external.x.toFixed(1)}, ${external.y.toFixed(1)})`);
    }
  }
  
  // 创建池
  const pool = new FlyweightPool<ParticleType, ParticleInstance>({
    maxSize: 100,
    evictionPolicy: 'LFU',
    factory: async (intrinsic) => new ParticleFlyweight(intrinsic),
  });
  
  // 定义粒子类型
  const particleTypes: ParticleType[] = [
    { texture: 'spark.png', color: '#FFFF00', size: 4, lifetime: 1000 },
    { texture: 'smoke.png', color: '#888888', size: 8, lifetime: 2000 },
    { texture: 'fire.png', color: '#FF4400', size: 6, lifetime: 1500 },
    { texture: 'ice.png', color: '#00FFFF', size: 5, lifetime: 1200 },
  ];
  
  console.log('生成 5000 个粒子...\n');
  
  for (let i = 0; i < 5000; i++) {
    const type = particleTypes[i % 4];
    const instance: ParticleInstance = {
      x: Math.random() * 800,
      y: Math.random() * 600,
      vx: (Math.random() - 0.5) * 10,
      vy: (Math.random() - 0.5) * 10,
      age: 0,
    };
    
    await pool.operate(type, instance);
  }
  
  // 统计
  const stats = pool.getStats();
  console.log('\n📊 统计:');
  console.log(`  池大小：${stats.size}`);
  console.log(`  命中率：${(stats.hitRate * 100).toFixed(2)}%`);
  console.log(`  估算节省：${(stats.estimatedMemorySaved / 1024).toFixed(2)} KB`);
  
  await pool.destroy();
}

/**
 * 示例 3: HTTP 连接池
 */
export async function exampleHTTPConnectionPool(): Promise<void> {
  console.log('\n=== 示例 3: HTTP 连接池 ===\n');
  
  // 连接配置（内部状态）
  type ConnectionConfig = {
    host: string;
    port: number;
    keepAlive: boolean;
  };
  
  // 请求上下文（外部状态）
  type RequestConfig = {
    method: 'GET' | 'POST' | 'PUT' | 'DELETE';
    path: string;
    headers?: Record<string, string>;
    body?: any;
  };
  
  // 连接享元
  class ConnectionFlyweight extends BaseFlyweight<ConnectionConfig, RequestConfig> {
    private connectionId: string;
    
    constructor(intrinsic: ConnectionConfig) {
      super(intrinsic);
      this.connectionId = `conn_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      console.log(`  [Connection] Created ${this.connectionId} to ${intrinsic.host}:${intrinsic.port}`);
    }
    
    async operate(external: RequestConfig): Promise<void> {
      this.recordAccess();
      console.log(`  [Connection] ${this.connectionId} → ${external.method} ${external.path}`);
      // 模拟网络延迟
      await new Promise(resolve => setTimeout(resolve, 10));
    }
  }
  
  // 创建池
  const pool = new FlyweightPool<ConnectionConfig, RequestConfig>({
    maxSize: 20,
    minSize: 5,
    idleTimeout: 60000,
    evictionPolicy: 'LRU',
    factory: async (intrinsic) => new ConnectionFlyweight(intrinsic),
    preloadKeys: [
      { host: 'api.example.com', port: 443, keepAlive: true },
      { host: 'cdn.example.com', port: 443, keepAlive: true },
    ],
  });
  
  // 预加载
  await pool.preload();
  
  // 模拟 100 个请求
  const hosts = [
    { host: 'api.example.com', port: 443, keepAlive: true },
    { host: 'cdn.example.com', port: 443, keepAlive: true },
    { host: 'auth.example.com', port: 443, keepAlive: true },
  ];
  
  console.log('\n发送 100 个请求...\n');
  
  for (let i = 0; i < 100; i++) {
    const config = hosts[i % 3];
    const request: RequestConfig = {
      method: i % 2 === 0 ? 'GET' : 'POST',
      path: `/api/resource/${i}`,
      headers: { 'Content-Type': 'application/json' },
    };
    
    await pool.operate(config, request);
  }
  
  // 统计
  const stats = pool.getStats();
  console.log('\n📊 统计:');
  console.log(`  池大小：${stats.size}`);
  console.log(`  活跃连接：${stats.activeCount}`);
  console.log(`  命中率：${(stats.hitRate * 100).toFixed(2)}%`);
  console.log(`  平均获取时间：${stats.avgAcquireTime.toFixed(2)} ms`);
  
  await pool.destroy();
}

/**
 * 示例 4: 数据库查询缓存
 */
export async function exampleDatabaseQueryCache(): Promise<void> {
  console.log('\n=== 示例 4: 数据库查询缓存 ===\n');
  
  // 查询模板（内部状态）
  type QueryTemplate = {
    sql: string;
    params: any[];
  };
  
  // 查询上下文（外部状态）
  type QueryContext = {
    userId: string;
    timestamp: number;
  };
  
  // 查询享元
  class QueryFlyweight extends BaseFlyweight<QueryTemplate, QueryContext> {
    async operate(external: QueryContext): Promise<void> {
      this.recordAccess();
      console.log(`  [Query] Executing for user ${external.userId}: ${this.intrinsic.sql}`);
      // 模拟查询执行
      await new Promise(resolve => setTimeout(resolve, 5));
    }
  }
  
  // 创建池
  const pool = new FlyweightPool<QueryTemplate, QueryContext>({
    maxSize: 500,
    evictionPolicy: 'LFU',
    enableWeakRef: true,
    factory: async (intrinsic) => new QueryFlyweight(intrinsic),
  });
  
  // 模拟常用查询
  const queries: QueryTemplate[] = [
    { sql: 'SELECT * FROM users WHERE id = ?', params: [1] },
    { sql: 'SELECT * FROM orders WHERE user_id = ?', params: [1] },
    { sql: 'SELECT COUNT(*) FROM products', params: [] },
    { sql: 'SELECT * FROM categories', params: [] },
    { sql: 'SELECT * FROM reviews WHERE product_id = ?', params: [1] },
  ];
  
  console.log('执行 2000 次查询...\n');
  
  for (let i = 0; i < 2000; i++) {
    const query = queries[i % 5];
    const context: QueryContext = {
      userId: `user_${i % 100}`,
      timestamp: Date.now(),
    };
    
    await pool.operate(query, context);
  }
  
  // 统计
  const stats = pool.getStats();
  console.log('\n📊 统计:');
  console.log(`  缓存查询数：${stats.size}`);
  console.log(`  命中率：${(stats.hitRate * 100).toFixed(2)}%`);
  console.log(`  估算节省：${(stats.estimatedMemorySaved / 1024).toFixed(2)} KB`);
  
  await pool.destroy();
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 导出
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export default FlyweightPatternProSkill;
