/**
 * Flyweight Pattern Skill - ACE Framework
 * 
 * 享元模式工具：对象共享、池化、状态分离、内存优化
 * 
 * @author Axon
 * @version 1.0.0
 */

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 类型定义
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * 享元对象接口
 */
interface IFlyweight<TContext = any> {
  /** 操作享元（使用外部状态） */
  operate(context: TContext): void;
  
  /** 获取内部状态哈希（用于缓存键） */
  getIntrinsicStateHash(): string;
}

/**
 * 享元工厂配置
 */
interface FlyweightFactoryConfig {
  /** 最大缓存数量 */
  maxCacheSize?: number;
  /** 启用 LRU 淘汰 */
  enableLRU?: boolean;
  /** 内存优化模式（激进/平衡/保守） */
  memoryOptimization?: 'aggressive' | 'balanced' | 'conservative';
}

/**
 * 享元统计信息
 */
interface FlyweightStats {
  /** 缓存的享元数量 */
  cachedCount: number;
  /** 命中次数 */
  hitCount: number;
  /** 未命中次数 */
  missCount: number;
  /** 命中率 */
  hitRate: number;
  /** 估算内存节省（字节） */
  estimatedMemorySaved: number;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 具体享元实现
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * 基础享元类
 * 
 * 内部状态（共享）：不变的数据
 * 外部状态（不共享）：每次操作传入
 */
class ConcreteFlyweight<TIntrinsic = any, TContext = any> implements IFlyweight<TContext> {
  /** 内部状态（共享） */
  private intrinsicState: TIntrinsic;
  
  /** 创建时间戳 */
  private createdAt: number;
  
  /** 访问计数 */
  private accessCount: number = 0;

  constructor(intrinsicState: TIntrinsic) {
    this.intrinsicState = intrinsicState;
    this.createdAt = Date.now();
  }

  /**
   * 操作享元（使用外部状态）
   */
  operate(context: TContext): void {
    this.accessCount++;
    // 子类实现具体逻辑
    console.log(`[Flyweight] Operating with context:`, context);
  }

  /**
   * 获取内部状态哈希
   */
  getIntrinsicStateHash(): string {
    return JSON.stringify(this.intrinsicState);
  }

  /**
   * 获取访问统计
   */
  getStats(): { accessCount: number; createdAt: number } {
    return {
      accessCount: this.accessCount,
      createdAt: this.createdAt,
    };
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 享元工厂（对象池）
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * 享元工厂类 - 核心对象池实现
 * 
 * 功能：
 * 1. 对象池化 - 缓存和复用享元对象
 * 2. 状态分离 - 内部状态共享，外部状态独立
 * 3. 内存优化 - LRU 淘汰、统计追踪
 */
class FlyweightFactory<TIntrinsic = any, TContext = any> {
  /** 享元缓存池 */
  private flyweights: Map<string, ConcreteFlyweight<TIntrinsic, TContext>> = new Map();
  
  /** 访问顺序队列（LRU） */
  private accessQueue: string[] = [];
  
  /** 配置 */
  private config: Required<FlyweightFactoryConfig>;
  
  /** 统计信息 */
  private stats: FlyweightStats = {
    cachedCount: 0,
    hitCount: 0,
    missCount: 0,
    hitRate: 0,
    estimatedMemorySaved: 0,
  };

  constructor(config: FlyweightFactoryConfig = {}) {
    this.config = {
      maxCacheSize: config.maxCacheSize ?? 1000,
      enableLRU: config.enableLRU ?? true,
      memoryOptimization: config.memoryOptimization ?? 'balanced',
    };
  }

  /**
   * 获取或创建享元
   * 
   * @param intrinsicState 内部状态（用于缓存键）
   * @returns 享元对象
   */
  getFlyweight(intrinsicState: TIntrinsic): ConcreteFlyweight<TIntrinsic, TContext> {
    const key = this.generateKey(intrinsicState);
    
    // 检查缓存
    if (this.flyweights.has(key)) {
      this.stats.hitCount++;
      this.updateLRU(key);
      return this.flyweights.get(key)!;
    }
    
    // 缓存未命中，创建新享元
    this.stats.missCount++;
    const flyweight = new ConcreteFlyweight(intrinsicState);
    
    // 检查是否需要淘汰
    if (this.flyweights.size >= this.config.maxCacheSize) {
      this.evictLRU();
    }
    
    // 存入缓存
    this.flyweights.set(key, flyweight);
    this.accessQueue.push(key);
    this.stats.cachedCount = this.flyweights.size;
    
    // 估算内存节省（假设每个对象平均 1KB）
    this.stats.estimatedMemorySaved = (this.stats.hitCount * 1024);
    
    return flyweight;
  }

  /**
   * 批量获取享元（优化批量操作）
   */
  getFlyweights(states: TIntrinsic[]): ConcreteFlyweight<TIntrinsic, TContext>[] {
    return states.map(state => this.getFlyweight(state));
  }

  /**
   * 执行操作（获取享元并调用 operate）
   */
  operate(intrinsicState: TIntrinsic, context: TContext): void {
    const flyweight = this.getFlyweight(intrinsicState);
    flyweight.operate(context);
  }

  /**
   * 清除缓存
   */
  clear(): void {
    this.flyweights.clear();
    this.accessQueue.clear();
    this.stats.cachedCount = 0;
  }

  /**
   * 获取统计信息
   */
  getStats(): FlyweightStats {
    this.stats.hitRate = 
      this.stats.hitCount / (this.stats.hitCount + this.stats.missCount) || 0;
    return { ...this.stats };
  }

  /**
   * 生成缓存键
   */
  private generateKey(state: TIntrinsic): string {
    return JSON.stringify(state);
  }

  /**
   * 更新 LRU 队列
   */
  private updateLRU(key: string): void {
    if (!this.config.enableLRU) return;
    
    const index = this.accessQueue.indexOf(key);
    if (index > -1) {
      this.accessQueue.splice(index, 1);
    }
    this.accessQueue.push(key);
  }

  /**
   * 淘汰最少使用的享元
   */
  private evictLRU(): void {
    if (this.accessQueue.length === 0) return;
    
    const lruKey = this.accessQueue.shift()!;
    this.flyweights.delete(lruKey);
    this.stats.cachedCount = this.flyweights.size;
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 享元模式技能类
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Flyweight Pattern Skill
 * 
 * 提供享元模式的完整实现，用于：
 * - 大量细粒度对象的共享
 * - 内存优化
 * - 性能提升
 */
export class FlyweightPatternSkill {
  /** 默认工厂实例 */
  private defaultFactory: FlyweightFactory<any, any>;

  constructor(config?: FlyweightFactoryConfig) {
    this.defaultFactory = new FlyweightFactory(config);
  }

  /**
   * 创建新的享元工厂
   */
  createFactory<TIntrinsic, TContext>(
    config?: FlyweightFactoryConfig
  ): FlyweightFactory<TIntrinsic, TContext> {
    return new FlyweightFactory<TIntrinsic, TContext>(config);
  }

  /**
   * 使用默认工厂获取享元
   */
  getFlyweight<TIntrinsic>(intrinsicState: TIntrinsic): ConcreteFlyweight<TIntrinsic, any> {
    return this.defaultFactory.getFlyweight(intrinsicState);
  }

  /**
   * 使用默认工厂执行操作
   */
  operate<TIntrinsic, TContext>(
    intrinsicState: TIntrinsic,
    context: TContext
  ): void {
    this.defaultFactory.operate(intrinsicState, context);
  }

  /**
   * 获取统计信息
   */
  getStats(): FlyweightStats {
    return this.defaultFactory.getStats();
  }

  /**
   * 清除默认工厂缓存
   */
  clear(): void {
    this.defaultFactory.clear();
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 使用示例
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * 示例 1: 文本编辑器字符样式共享
 * 
 * 场景：编辑器中有大量字符，每个字符有样式（字体、大小、颜色）
 * 优化：相同样式的字符共享同一个享元对象
 */
export function exampleTextEditor(): void {
  console.log('\n=== 示例 1: 文本编辑器样式共享 ===\n');
  
  // 定义内部状态（样式）
  type TextStyle = {
    font: string;
    size: number;
    color: string;
  };
  
  // 定义外部状态（字符位置）
  type CharacterContext = {
    char: string;
    position: number;
    line: number;
  };
  
  // 创建工厂
  const factory = new FlyweightFactory<TextStyle, CharacterContext>({
    maxCacheSize: 100,
    enableLRU: true,
  });
  
  // 模拟 10000 个字符
  const styles: TextStyle[] = [
    { font: 'Arial', size: 12, color: '#000000' },
    { font: 'Arial', size: 14, color: '#FF0000' },
    { font: 'Times', size: 12, color: '#0000FF' },
  ];
  
  console.log('创建 10000 个字符，使用 3 种样式...\n');
  
  for (let i = 0; i < 10000; i++) {
    const style = styles[i % 3];
    const context: CharacterContext = {
      char: String.fromCharCode(65 + (i % 26)),
      position: i,
      line: Math.floor(i / 80),
    };
    
    factory.operate(style, context);
  }
  
  // 查看统计
  const stats = factory.getStats();
  console.log('\n📊 统计信息:');
  console.log(`  缓存享元数：${stats.cachedCount}`);
  console.log(`  命中率：${(stats.hitRate * 100).toFixed(2)}%`);
  console.log(`  估算内存节省：${(stats.estimatedMemorySaved / 1024).toFixed(2)} KB`);
}

/**
 * 示例 2: 游戏场景中的树木对象池
 * 
 * 场景：游戏中有大量树木，每棵树有类型（橡树、松树等）
 * 优化：相同类型的树共享模型和纹理
 */
export function exampleGameTrees(): void {
  console.log('\n=== 示例 2: 游戏树木对象池 ===\n');
  
  // 定义内部状态（树的类型）
  type TreeType = {
    model: string;
    texture: string;
    height: number;
  };
  
  // 定义外部状态（树的位置）
  type TreeContext = {
    x: number;
    y: number;
    z: number;
    rotation: number;
  };
  
  // 创建工厂
  const factory = new FlyweightFactory<TreeType, TreeContext>({
    maxCacheSize: 50,
    memoryOptimization: 'aggressive',
  });
  
  // 定义 5 种树类型
  const treeTypes: TreeType[] = [
    { model: 'oak.mdl', texture: 'oak.png', height: 5 },
    { model: 'pine.mdl', texture: 'pine.png', height: 8 },
    { model: 'birch.mdl', texture: 'birch.png', height: 6 },
    { model: 'maple.mdl', texture: 'maple.png', height: 7 },
    { model: 'willow.mdl', texture: 'willow.png', height: 4 },
  ];
  
  console.log('渲染 5000 棵树，使用 5 种类型...\n');
  
  for (let i = 0; i < 5000; i++) {
    const type = treeTypes[i % 5];
    const context: TreeContext = {
      x: Math.random() * 1000,
      y: Math.random() * 1000,
      z: 0,
      rotation: Math.random() * 360,
    };
    
    factory.operate(type, context);
  }
  
  // 查看统计
  const stats = factory.getStats();
  console.log('\n📊 统计信息:');
  console.log(`  缓存享元数：${stats.cachedCount}`);
  console.log(`  命中率：${(stats.hitRate * 100).toFixed(2)}%`);
  console.log(`  估算内存节省：${(stats.estimatedMemorySaved / 1024).toFixed(2)} KB`);
}

/**
 * 示例 3: 网络请求连接池
 * 
 * 场景：大量 API 请求，相同端点的连接可复用
 * 优化：相同配置的 connection 共享
 */
export function exampleConnectionPool(): void {
  console.log('\n=== 示例 3: 网络连接池 ===\n');
  
  // 定义内部状态（连接配置）
  type ConnectionConfig = {
    host: string;
    port: number;
    protocol: 'http' | 'https';
  };
  
  // 定义外部状态（请求参数）
  type RequestContext = {
    path: string;
    method: 'GET' | 'POST';
    body?: any;
  };
  
  // 创建工厂
  const factory = new FlyweightFactory<ConnectionConfig, RequestContext>({
    maxCacheSize: 20,
    enableLRU: true,
  });
  
  // 定义 3 个 API 端点
  const endpoints: ConnectionConfig[] = [
    { host: 'api.example.com', port: 443, protocol: 'https' },
    { host: 'cdn.example.com', port: 443, protocol: 'https' },
    { host: 'auth.example.com', port: 443, protocol: 'https' },
  ];
  
  console.log('发送 1000 个请求，使用 3 个端点...\n');
  
  for (let i = 0; i < 1000; i++) {
    const endpoint = endpoints[i % 3];
    const context: RequestContext = {
      path: `/api/resource/${i}`,
      method: i % 2 === 0 ? 'GET' : 'POST',
      body: i % 2 === 0 ? undefined : { data: i },
    };
    
    factory.operate(endpoint, context);
  }
  
  // 查看统计
  const stats = factory.getStats();
  console.log('\n📊 统计信息:');
  console.log(`  缓存连接数：${stats.cachedCount}`);
  console.log(`  命中率：${(stats.hitRate * 100).toFixed(2)}%`);
  console.log(`  估算内存节省：${(stats.estimatedMemorySaved / 1024).toFixed(2)} KB`);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 导出
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export {
  IFlyweight,
  FlyweightFactoryConfig,
  FlyweightStats,
  ConcreteFlyweight,
  FlyweightFactory,
};

// 默认导出
export default FlyweightPatternSkill;
