/**
 * Bridge Pattern Skill - 桥接模式技能
 * 
 * 核心原则:
 * 1. 抽象/实现分离 (Abstraction/Implementation Separation)
 * 2. 独立变化 (Independent Variation)
 * 3. 组合使用 (Composable Usage)
 * 
 * @author KAEL
 * @version 1.0.0
 */

// ==================== 实现层接口 (Implementation Interface) ====================

/**
 * 实现层接口 - 定义底层操作
 */
export interface IImplementation {
  /** 执行操作 */
  execute(action: string): Promise<void>;
  /** 获取状态 */
  getStatus(): Promise<string>;
  /** 清理资源 */
  cleanup(): Promise<void>;
}

// ==================== 具体实现类 (Concrete Implementations) ====================

/**
 * 文件系统实现
 */
export class FileSystemImpl implements IImplementation {
  private rootPath: string;

  constructor(rootPath: string = '.') {
    this.rootPath = rootPath;
  }

  async execute(action: string): Promise<void> {
    console.log(`[FileSystem] Executing: ${action} at ${this.rootPath}`);
    // 实际文件系统操作逻辑
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  async getStatus(): Promise<string> {
    return `FileSystem Ready @ ${this.rootPath}`;
  }

  async cleanup(): Promise<void> {
    console.log('[FileSystem] Cleanup complete');
  }
}

/**
 * 网络请求实现
 */
export class NetworkImpl implements IImplementation {
  private baseUrl: string;
  private timeout: number;

  constructor(baseUrl: string, timeout: number = 5000) {
    this.baseUrl = baseUrl;
    this.timeout = timeout;
  }

  async execute(action: string): Promise<void> {
    console.log(`[Network] ${action} -> ${this.baseUrl} (timeout: ${this.timeout}ms)`);
    // 实际网络请求逻辑
    await new Promise(resolve => setTimeout(resolve, this.timeout));
  }

  async getStatus(): Promise<string> {
    return `Network Ready @ ${this.baseUrl}`;
  }

  async cleanup(): Promise<void> {
    console.log('[Network] Connections closed');
  }
}

/**
 * 数据库实现
 */
export class DatabaseImpl implements IImplementation {
  private connectionString: string;

  constructor(connectionString: string) {
    this.connectionString = connectionString;
  }

  async execute(action: string): Promise<void> {
    console.log(`[Database] Executing: ${action}`);
    // 实际数据库操作逻辑
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  async getStatus(): Promise<string> {
    return `Database Connected @ ${this.connectionString}`;
  }

  async cleanup(): Promise<void> {
    console.log('[Database] Connection pool released');
  }
}

// ==================== 抽象层接口 (Abstraction Interface) ====================

/**
 * 抽象层基类 - 持有实现层引用
 */
export abstract class Abstraction {
  protected implementation: IImplementation;

  constructor(implementation: IImplementation) {
    this.implementation = implementation;
  }

  /** 执行业务逻辑 */
  async operate(operation: string): Promise<void> {
    await this.implementation.execute(operation);
  }

  /** 获取状态 */
  async status(): Promise<string> {
    return this.implementation.getStatus();
  }

  /** 清理资源 */
  async dispose(): Promise<void> {
    await this.implementation.cleanup();
  }
}

// ==================== 扩展抽象类 (Refined Abstractions) ====================

/**
 * 数据处理器 - 扩展抽象
 */
export class DataProcessor extends Abstraction {
  async process(data: string): Promise<void> {
    console.log(`[DataProcessor] Processing: ${data}`);
    await this.operate(`PROCESS:${data}`);
  }

  async validate(data: string): Promise<boolean> {
    console.log(`[DataProcessor] Validating: ${data}`);
    await this.operate(`VALIDATE:${data}`);
    return true;
  }
}

/**
 * 任务执行器 - 扩展抽象
 */
export class TaskExecutor extends Abstraction {
  async executeTask(taskName: string, priority: number = 1): Promise<void> {
    console.log(`[TaskExecutor] Executing "${taskName}" (priority: ${priority})`);
    await this.operate(`TASK:${taskName}:P${priority}`);
  }

  async cancelTask(taskName: string): Promise<void> {
    console.log(`[TaskExecutor] Canceling "${taskName}"`);
    await this.operate(`CANCEL:${taskName}`);
  }
}

/**
 * 缓存管理器 - 扩展抽象
 */
export class CacheManager extends Abstraction {
  async get(key: string): Promise<string | null> {
    console.log(`[CacheManager] Getting: ${key}`);
    await this.operate(`GET:${key}`);
    return null;
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    console.log(`[CacheManager] Setting: ${key} = ${value} (ttl: ${ttl}ms)`);
    await this.operate(`SET:${key}:${ttl || '∞'}`);
  }

  async delete(key: string): Promise<void> {
    console.log(`[CacheManager] Deleting: ${key}`);
    await this.operate(`DELETE:${key}`);
  }
}

// ==================== 组合使用示例 (Composition Examples) ====================

/**
 * 使用示例 1: 文件系统 + 数据处理器
 */
export async function example1(): Promise<void> {
  console.log('\n=== 示例 1: 文件系统 + 数据处理器 ===\n');
  
  const fsImpl = new FileSystemImpl('/data');
  const processor = new DataProcessor(fsImpl);
  
  await processor.process('user_data.json');
  await processor.validate('schema.json');
  console.log(await processor.status());
  await processor.dispose();
}

/**
 * 使用示例 2: 网络请求 + 任务执行器
 */
export async function example2(): Promise<void> {
  console.log('\n=== 示例 2: 网络请求 + 任务执行器 ===\n');
  
  const networkImpl = new NetworkImpl('https://api.example.com', 3000);
  const executor = new TaskExecutor(networkImpl);
  
  await executor.executeTask('fetch_users', 3);
  await executor.executeTask('sync_data', 1);
  console.log(await executor.status());
  await executor.dispose();
}

/**
 * 使用示例 3: 数据库 + 缓存管理器
 */
export async function example3(): Promise<void> {
  console.log('\n=== 示例 3: 数据库 + 缓存管理器 ===\n');
  
  const dbImpl = new DatabaseImpl('postgresql://localhost:5432/app');
  const cache = new CacheManager(dbImpl);
  
  await cache.set('user:1', '{"name":"Axon"}', 60000);
  await cache.get('user:1');
  await cache.delete('user:1');
  console.log(await cache.status());
  await cache.dispose();
}

/**
 * 使用示例 4: 动态切换实现 (桥接模式核心优势)
 */
export async function example4(): Promise<void> {
  console.log('\n=== 示例 4: 动态切换实现 ===\n');
  
  // 同一个抽象，不同的实现
  const implementations: IImplementation[] = [
    new FileSystemImpl('/tmp'),
    new NetworkImpl('https://api.test.com'),
    new DatabaseImpl('sqlite://local.db')
  ];

  for (const impl of implementations) {
    const processor = new DataProcessor(impl);
    await processor.process('test_data');
    console.log(await processor.status());
    await processor.dispose();
  }
}

/**
 * 使用示例 5: 组合多个抽象 (高级用法)
 */
export async function example5(): Promise<void> {
  console.log('\n=== 示例 5: 组合多个抽象 ===\n');
  
  const fsImpl = new FileSystemImpl('/workspace');
  
  const processor = new DataProcessor(fsImpl);
  const executor = new TaskExecutor(fsImpl);
  const cache = new CacheManager(fsImpl);
  
  // 并行使用多个抽象
  await Promise.all([
    processor.process('config.json'),
    executor.executeTask('build', 2),
    cache.set('build:status', 'running')
  ]);
  
  console.log('所有操作完成');
  await processor.dispose();
}

// ==================== 导出技能接口 (Skill Export) ====================

/**
 * 桥接模式技能主入口
 */
export const BridgePatternSkill = {
  name: 'bridge-pattern',
  version: '1.0.0',
  description: '桥接模式 - 抽象/实现分离、独立变化、组合使用',
  
  // 核心组件
  interfaces: {
    IImplementation,
    Abstraction
  },
  
  // 实现层
  implementations: {
    FileSystemImpl,
    NetworkImpl,
    DatabaseImpl
  },
  
  // 抽象层
  abstractions: {
    DataProcessor,
    TaskExecutor,
    CacheManager
  },
  
  // 使用示例
  examples: {
    example1,
    example2,
    example3,
    example4,
    example5
  },
  
  /** 运行所有示例 */
  async runAllExamples(): Promise<void> {
    console.log('🌉 桥接模式技能 - 完整示例演示\n');
    await example1();
    await example2();
    await example3();
    await example4();
    await example5();
    console.log('\n✅ 所有示例执行完成');
  }
};

export default BridgePatternSkill;
