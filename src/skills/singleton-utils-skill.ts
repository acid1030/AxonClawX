/**
 * Singleton Utils Skill - KAEL Engineering
 * 
 * 提供单例模式创建工具，支持懒汉/饿汉模式和线程安全
 * 
 * @author KAEL
 * @version 1.0.0
 */

/**
 * 单例配置选项
 */
export interface SingletonOptions {
  /** 单例名称 */
  name?: string;
  /** 是否启用日志 */
  enableLog?: boolean;
}

/**
 * 单例注册表 - 存储所有单例实例
 */
const singletonRegistry = new Map<string, any>();

/**
 * 锁表 - 用于线程安全的锁机制
 */
const lockTable = new Map<string, Promise<any>>();

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
 * 饿汉式单例创建 (Eager Initialization)
 * 在类加载时就创建实例，线程安全
 * 
 * @param key 单例标识键
 * @param factory 实例工厂函数
 * @param options 配置选项
 * @returns 单例实例
 */
export function createEagerSingleton<T>(
  key: string,
  factory: () => T,
  options: SingletonOptions = {}
): T {
  const { name = key, enableLog = false } = options;
  
  if (singletonRegistry.has(key)) {
    if (enableLog) {
      console.log(`[Singleton:${name}] 实例已存在，返回缓存实例`);
    }
    return singletonRegistry.get(key);
  }
  
  if (enableLog) {
    console.log(`[Singleton:${name}] 创建饿汉式单例...`);
  }
  
  const instance = factory();
  singletonRegistry.set(key, instance);
  
  if (enableLog) {
    console.log(`[Singleton:${name}] 实例创建成功`);
  }
  
  return instance;
}

/**
 * 懒汉式单例创建 (Lazy Initialization)
 * 在首次访问时创建实例，支持线程安全
 * 
 * @param key 单例标识键
 * @param factory 实例工厂函数
 * @param options 配置选项
 * @param threadSafe 是否启用线程安全 (默认 true)
 * @returns Promise<T> 单例实例
 */
export async function createLazySingleton<T>(
  key: string,
  factory: () => T | Promise<T>,
  options: SingletonOptions = {},
  threadSafe: boolean = true
): Promise<T> {
  const { name = key, enableLog = false } = options;
  
  // 检查是否已存在实例
  if (singletonRegistry.has(key)) {
    if (enableLog) {
      console.log(`[Singleton:${name}] 实例已存在，返回缓存实例`);
    }
    return singletonRegistry.get(key);
  }
  
  if (threadSafe) {
    // 线程安全模式 - 使用锁机制
    if (enableLog) {
      console.log(`[Singleton:${name}] 获取线程锁...`);
    }
    
    const release = await getLock(key);
    
    try {
      // 双重检查锁定 (Double-Checked Locking)
      if (singletonRegistry.has(key)) {
        if (enableLog) {
          console.log(`[Singleton:${name}] 双重检查：实例已存在`);
        }
        return singletonRegistry.get(key);
      }
      
      if (enableLog) {
        console.log(`[Singleton:${name}] 创建懒汉式单例 (线程安全)...`);
      }
      
      const instance = await Promise.resolve(factory());
      singletonRegistry.set(key, instance);
      
      if (enableLog) {
        console.log(`[Singleton:${name}] 实例创建成功`);
      }
      
      return instance;
    } finally {
      release();
    }
  } else {
    // 非线程安全模式
    if (enableLog) {
      console.log(`[Singleton:${name}] 创建懒汉式单例 (非线程安全)...`);
    }
    
    const instance = await Promise.resolve(factory());
    singletonRegistry.set(key, instance);
    
    if (enableLog) {
      console.log(`[Singleton:${name}] 实例创建成功`);
    }
    
    return instance;
  }
}

/**
 * 获取已存在的单例实例
 * 
 * @param key 单例标识键
 * @returns 单例实例或 undefined
 */
export function getSingleton<T>(key: string): T | undefined {
  return singletonRegistry.get(key);
}

/**
 * 检查单例是否存在
 * 
 * @param key 单例标识键
 * @returns boolean
 */
export function hasSingleton(key: string): boolean {
  return singletonRegistry.has(key);
}

/**
 * 删除单例实例 (用于测试或重置)
 * 
 * @param key 单例标识键
 * @returns boolean 是否删除成功
 */
export function deleteSingleton(key: string): boolean {
  const existed = singletonRegistry.has(key);
  singletonRegistry.delete(key);
  lockTable.delete(key);
  return existed;
}

/**
 * 清空所有单例 (用于测试或重置)
 */
export function clearAllSingletons(): void {
  const count = singletonRegistry.size;
  singletonRegistry.clear();
  lockTable.clear();
  console.log(`[Singleton] 已清空所有 ${count} 个单例实例`);
}

/**
 * 获取所有已注册的单例键
 * 
 * @returns string[] 单例键列表
 */
export function getSingletonKeys(): string[] {
  return Array.from(singletonRegistry.keys());
}

/**
 * 获取单例统计信息
 * 
 * @returns 统计信息对象
 */
export function getSingletonStats(): {
  count: number;
  keys: string[];
  locks: number;
} {
  return {
    count: singletonRegistry.size,
    keys: getSingletonKeys(),
    locks: lockTable.size,
  };
}

/**
 * 装饰器工厂 - 类级别的单例装饰器
 * 
 * @param options 配置选项
 * @returns 类装饰器
 */
export function Singleton(options: SingletonOptions = {}) {
  return function <T extends { new (...args: any[]): {} }>(constructor: T) {
    const className = options.name || constructor.name;
    let instance: InstanceType<T> | null = null;
    let lock: Promise<any> | null = null;
    
    return class extends constructor {
      constructor(...args: any[]) {
        if (instance) {
          console.warn(`[Singleton:${className}] 实例已存在，忽略新实例创建`);
          return instance;
        }
        
        super(...args);
        instance = this as InstanceType<T>;
        
        if (options.enableLog) {
          console.log(`[Singleton:${className}] 单例实例创建成功`);
        }
      }
      
      /**
       * 获取单例实例 (异步，线程安全)
       */
      static async getInstance(...args: any[]): Promise<InstanceType<T>> {
        if (instance) {
          return instance;
        }
        
        // 获取锁
        if (!lock) {
          lock = Promise.resolve();
        }
        
        const currentLock = lock;
        let release: () => void;
        lock = new Promise<void>(resolve => {
          release = resolve;
        });
        
        await currentLock;
        
        if (instance) {
          release!();
          return instance;
        }
        
        // @ts-ignore - 动态创建实例
        instance = new constructor(...args);
        release!();
        
        return instance;
      }
      
      /**
       * 重置单例实例 (用于测试)
       */
      static resetInstance(): void {
        instance = null;
        lock = null;
        if (options.enableLog) {
          console.log(`[Singleton:${className}] 实例已重置`);
        }
      }
    };
  };
}

/**
 * 使用示例
 */
export namespace SingletonExamples {
  /**
   * 示例 1: 饿汉式单例
   */
  export function eagerExample() {
    interface DatabaseConfig {
      host: string;
      port: number;
      name: string;
    }
    
    const dbConfig = createEagerSingleton<DatabaseConfig>(
      'database-config',
      () => ({
        host: 'localhost',
        port: 5432,
        name: 'mydb',
      }),
      { enableLog: true }
    );
    
    return dbConfig;
  }
  
  /**
   * 示例 2: 懒汉式单例 (线程安全)
   */
  export async function lazyExample() {
    class Logger {
      private logs: string[] = [];
      
      log(message: string): void {
        this.logs.push(`[${new Date().toISOString()}] ${message}`);
      }
      
      getLogs(): string[] {
        return [...this.logs];
      }
    }
    
    const logger = await createLazySingleton(
      'global-logger',
      () => new Logger(),
      { enableLog: true },
      true // 线程安全
    );
    
    logger.log('应用启动');
    return logger;
  }
  
  /**
   * 示例 3: 装饰器方式
   */
  export function decoratorExample() {
    @Singleton({ name: 'ConfigManager', enableLog: true })
    class ConfigManager {
      private config: Map<string, any> = new Map();
      
      set(key: string, value: any): void {
        this.config.set(key, value);
      }
      
      get(key: string): any {
        return this.config.get(key);
      }
    }
    
    return ConfigManager;
  }
  
  /**
   * 示例 4: 并发访问测试
   */
  export async function concurrencyTest() {
    let creationCount = 0;
    
    const factory = () => {
      creationCount++;
      return { id: Date.now(), createdAt: new Date() };
    };
    
    // 模拟 10 个并发请求
    const promises = Array.from({ length: 10 }, () =>
      createLazySingleton('concurrent-test', factory, {}, true)
    );
    
    const results = await Promise.all(promises);
    
    console.log(`[ConcurrencyTest] 工厂调用次数：${creationCount}`);
    console.log(`[ConcurrencyTest] 所有实例是否相同：${results.every(r => r === results[0])}`);
    
    return {
      creationCount,
      allSame: results.every(r => r === results[0]),
      results,
    };
  }
}

export default {
  createEagerSingleton,
  createLazySingleton,
  getSingleton,
  hasSingleton,
  deleteSingleton,
  clearAllSingletons,
  getSingletonKeys,
  getSingletonStats,
  Singleton,
  SingletonExamples,
};
