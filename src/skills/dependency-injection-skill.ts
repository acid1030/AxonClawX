/**
 * 依赖注入容器技能 - ACE (AxonClaw Engine)
 * 
 * 提供完整的依赖注入 (DI) 容器实现：
 * 1. 容器管理 (Container Management) - 注册、解析、生命周期管理
 * 2. 依赖解析 (Dependency Resolution) - 自动解析、循环依赖检测、延迟加载
 * 3. 生命周期 (Lifecycle Management) - Singleton/Transient/Scoped 生命周期
 * 
 * @author ACE (AxonClaw Engine)
 * @version 1.0.0
 * @since 2026-03-13
 */

// ============================================
// 类型定义
// ============================================

/**
 * 服务生命周期类型
 */
export type ServiceLifetime = 
  | 'singleton'  // 单例：整个应用生命周期内只创建一次
  | 'transient'  // 瞬态：每次请求都创建新实例
  | 'scoped';    // 作用域：每个作用域内创建一次

/**
 * 服务描述符
 */
export interface ServiceDescriptor {
  /** 服务标识符 */
  id: string;
  /** 服务类型/构造函数 */
  type: any;
  /** 生命周期类型 */
  lifetime: ServiceLifetime;
  /** 依赖项列表 */
  dependencies: string[];
  /** 工厂函数 (可选) */
  factory?: (container: IContainer) => any;
  /** 实例缓存 (singleton/scoped) */
  instance?: any;
  /** 作用域 ID (scoped) */
  scopeId?: string;
}

/**
 * 容器配置
 */
export interface ContainerConfig {
  /** 是否启用循环依赖检测 */
  detectCircularDependencies?: boolean;
  /** 是否自动解析未注册的服务 */
  autoResolve?: boolean;
  /** 默认生命周期 */
  defaultLifetime?: ServiceLifetime;
  /** 是否记录日志 */
  logging?: boolean;
}

/**
 * 作用域接口
 */
export interface IScope {
  /** 作用域 ID */
  id: string;
  /** 解析服务 */
  resolve<T>(id: string | (new (...args: any[]) => T)): T;
  /** 释放作用域 */
  dispose(): void;
}

/**
 * 容器接口
 */
export interface IContainer {
  /**
   * 注册服务
   */
  register<T>(id: string | (new (...args: any[]) => T), options?: RegisterOptions): IContainer;
  
  /**
   * 注册单例服务
   */
  registerSingleton<T>(id: string | (new (...args: any[]) => T), options?: RegisterOptions): IContainer;
  
  /**
   * 注册瞬态服务
   */
  registerTransient<T>(id: string | (new (...args: any[]) => T), options?: RegisterOptions): IContainer;
  
  /**
   * 注册作用域服务
   */
  registerScoped<T>(id: string | (new (...args: any[]) => T), options?: RegisterOptions): IContainer;
  
  /**
   * 使用工厂函数注册
   */
  registerFactory<T>(id: string, factory: (container: IContainer) => T, options?: RegisterOptions): IContainer;
  
  /**
   * 注册实例
   */
  registerInstance<T>(id: string, instance: T): IContainer;
  
  /**
   * 解析服务
   */
  resolve<T>(id: string | (new (...args: any[]) => T)): T;
  
  /**
   * 尝试解析服务
   */
  tryResolve<T>(id: string | (new (...args: any[]) => T)): T | null;
  
  /**
   * 检查服务是否已注册
   */
  isRegistered(id: string | (new (...args: any[]) => any)): boolean;
  
  /**
   * 创建新的作用域
   */
  createScope(): IScope;
  
  /**
   * 获取所有注册的服务
   */
  getRegisteredServices(): string[];
  
  /**
   * 清理容器
   */
  dispose(): void;
}

/**
 * 注册选项
 */
export interface RegisterOptions {
  /** 生命周期类型 */
  lifetime?: ServiceLifetime;
  /** 依赖项列表 */
  dependencies?: string[];
  /** 服务别名 */
  aliases?: string[];
  /** 服务类型/构造函数 */
  type?: any;
}

/**
 * 依赖注入错误类型
 */
export class DIError extends Error {
  constructor(
    message: string,
    public code: 'NOT_REGISTERED' | 'CIRCULAR_DEPENDENCY' | 'RESOLUTION_FAILED' | 'ALREADY_REGISTERED'
  ) {
    super(message);
    this.name = 'DIError';
  }
}

// ============================================
// 作用域实现
// ============================================

/**
 * 作用域实现类
 */
class Scope implements IScope {
  public id: string;
  private container: Container;
  private scopedInstances: Map<string, any> = new Map();
  private disposed: boolean = false;

  constructor(container: Container) {
    this.container = container;
    this.id = `scope_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  resolve<T>(id: string | (new (...args: any[]) => T)): T {
    if (this.disposed) {
      throw new DIError('Cannot resolve from disposed scope', 'RESOLUTION_FAILED');
    }

    const serviceId = typeof id === 'string' ? id : id.name;
    
    // 检查作用域缓存
    if (this.scopedInstances.has(serviceId)) {
      return this.scopedInstances.get(serviceId);
    }

    // 从父容器解析
    const descriptor = this.container.getServiceDescriptor(serviceId);
    if (!descriptor) {
      throw new DIError(`Service not registered: ${serviceId}`, 'NOT_REGISTERED');
    }

    // 如果是 scoped 生命周期，缓存到作用域
    if (descriptor.lifetime === 'scoped') {
      const instance = (this.container as Container).resolveInstanceInternal(descriptor);
      this.scopedInstances.set(serviceId, instance);
      return instance;
    }

    // 其他生命周期，直接从容器的实例
    return (this.container as Container).resolveInstanceInternal(descriptor);
  }

  dispose(): void {
    if (this.disposed) return;
    
    this.disposed = true;
    this.scopedInstances.clear();
  }
}

// ============================================
// 容器实现
// ============================================

/**
 * 依赖注入容器核心实现
 */
class Container implements IContainer {
  private services: Map<string, ServiceDescriptor> = new Map();
  private aliases: Map<string, string> = new Map();
  private instances: Map<string, any> = new Map();
  private config: Required<ContainerConfig>;
  private resolutionStack: string[] = []; // 用于检测循环依赖
  private parentContainer?: Container;
  private scopes: Set<IScope> = new Set();

  constructor(config: ContainerConfig = {}) {
    this.config = {
      detectCircularDependencies: true,
      autoResolve: false,
      defaultLifetime: 'singleton',
      logging: false,
      ...config
    };
  }

  // ============================================
  // 注册方法
  // ============================================

  register<T>(id: string | (new (...args: any[]) => T), options?: RegisterOptions): IContainer {
    const serviceId = typeof id === 'string' ? id : id.name;
    const type = typeof id === 'string' ? null : id;
    
    const descriptor: ServiceDescriptor = {
      id: serviceId,
      type,
      lifetime: options?.lifetime || this.config.defaultLifetime!,
      dependencies: options?.dependencies || this.extractDependencies(type),
      factory: undefined
    };

    this.registerDescriptor(descriptor, options?.aliases);
    return this;
  }

  registerSingleton<T>(id: string | (new (...args: any[]) => T), options?: RegisterOptions): IContainer {
    return this.register(id, { ...options, lifetime: 'singleton' });
  }

  registerTransient<T>(id: string | (new (...args: any[]) => T), options?: RegisterOptions): IContainer {
    return this.register(id, { ...options, lifetime: 'transient' });
  }

  registerScoped<T>(id: string | (new (...args: any[]) => T), options?: RegisterOptions): IContainer {
    return this.register(id, { ...options, lifetime: 'scoped' });
  }

  registerFactory<T>(id: string, factory: (container: IContainer) => T, options?: RegisterOptions): IContainer {
    const descriptor: ServiceDescriptor = {
      id,
      type: null,
      lifetime: options?.lifetime || this.config.defaultLifetime!,
      dependencies: options?.dependencies || [],
      factory
    };

    this.registerDescriptor(descriptor, options?.aliases);
    return this;
  }

  registerInstance<T>(id: string, instance: T): IContainer {
    const descriptor: ServiceDescriptor = {
      id,
      type: null,
      lifetime: 'singleton',
      dependencies: [],
      instance
    };

    this.services.set(id, descriptor);
    this.instances.set(id, instance);
    
    if (this.config.logging) {
      console.log(`[DI] Registered instance: ${id}`);
    }
    
    return this;
  }

  // ============================================
  // 解析方法
  // ============================================

  resolve<T>(id: string | (new (...args: any[]) => T)): T {
    const serviceId = typeof id === 'string' ? id : id.name;
    const resolvedId = this.aliases.get(serviceId) || serviceId;

    // 循环依赖检测
    if (this.config.detectCircularDependencies) {
      if (this.resolutionStack.includes(resolvedId)) {
        throw new DIError(
          `Circular dependency detected: ${this.resolutionStack.join(' → ')} → ${resolvedId}`,
          'CIRCULAR_DEPENDENCY'
        );
      }
      this.resolutionStack.push(resolvedId);
    }

    try {
      const descriptor = this.getServiceDescriptor(resolvedId);
      if (!descriptor) {
        if (this.config.autoResolve && typeof id !== 'string') {
          // 自动解析未注册的类
          return this.autoResolve(id);
        }
        throw new DIError(`Service not registered: ${resolvedId}`, 'NOT_REGISTERED');
      }

      // 检查实例缓存
      if (descriptor.instance !== undefined) {
        return descriptor.instance;
      }

      if (this.instances.has(resolvedId)) {
        return this.instances.get(resolvedId);
      }

      const instance = this.resolveInstanceInternal(descriptor);
      
      // 单例缓存
      if (descriptor.lifetime === 'singleton') {
        if (descriptor.factory) {
          descriptor.instance = instance;
        } else {
          this.instances.set(resolvedId, instance);
        }
      }

      return instance;
    } finally {
      if (this.config.detectCircularDependencies) {
        this.resolutionStack.pop();
      }
    }
  }

  tryResolve<T>(id: string | (new (...args: any[]) => T)): T | null {
    try {
      return this.resolve(id);
    } catch {
      return null;
    }
  }

  isRegistered(id: string | (new (...args: any[]) => any)): boolean {
    const serviceId = typeof id === 'string' ? id : id.name;
    return this.services.has(serviceId) || this.aliases.has(serviceId);
  }

  createScope(): IScope {
    const scope = new Scope(this);
    this.scopes.add(scope);
    return scope;
  }

  getRegisteredServices(): string[] {
    return Array.from(this.services.keys());
  }

  dispose(): void {
    // 释放所有作用域
    this.scopes.forEach(scope => scope.dispose());
    this.scopes.clear();
    
    // 清理实例
    this.instances.clear();
    this.services.clear();
    this.aliases.clear();
    this.resolutionStack = [];
  }

  // ============================================
  // 内部方法
  // ============================================

  private registerDescriptor(descriptor: ServiceDescriptor, aliases?: string[]): void {
    if (this.services.has(descriptor.id)) {
      throw new DIError(`Service already registered: ${descriptor.id}`, 'ALREADY_REGISTERED');
    }

    this.services.set(descriptor.id, descriptor);

    // 注册别名
    if (aliases) {
      aliases.forEach(alias => {
        this.aliases.set(alias, descriptor.id);
      });
    }

    if (this.config.logging) {
      console.log(`[DI] Registered: ${descriptor.id} (${descriptor.lifetime})`);
    }
  }

  // Internal method for Scope access
  public getServiceDescriptor(id: string): ServiceDescriptor | null {
    return this.services.get(id) || null;
  }

  // Internal method for Scope access
  public resolveInstanceInternal(descriptor: ServiceDescriptor): any {
    // 使用工厂函数
    if (descriptor.factory) {
      return descriptor.factory(this);
    }

    // 使用构造函数
    if (!descriptor.type) {
      throw new DIError(`Service ${descriptor.id} has no type or factory`, 'RESOLUTION_FAILED');
    }

    // 解析依赖
    const dependencies = descriptor.dependencies.map(depId => this.resolve(depId));

    // 创建实例
    try {
      return new descriptor.type(...dependencies);
    } catch (error) {
      throw new DIError(
        `Failed to resolve ${descriptor.id}: ${(error as Error).message}`,
        'RESOLUTION_FAILED'
      );
    }
  }

  private extractDependencies(type: any): string[] {
    if (!type || !type.dependencies) {
      return [];
    }
    return type.dependencies || [];
  }

  private autoResolve<T>(type: (new (...args: any[]) => T)): T {
    const dependencies = this.extractDependencies(type);
    const resolvedDeps = dependencies.map(depId => this.resolve(depId));
    return new type(...resolvedDeps);
  }
}

// ============================================
// 工厂函数
// ============================================

/**
 * 创建新的 DI 容器
 * 
 * @param config - 容器配置
 * @returns DI 容器实例
 * 
 * @example
 * const container = createContainer({
 *   detectCircularDependencies: true,
 *   autoResolve: false,
 *   logging: true
 * });
 */
export function createContainer(config: ContainerConfig = {}): IContainer {
  return new Container(config);
}

/**
 * 创建作用域容器
 * 基于父容器创建一个新的作用域
 * 
 * @param parent - 父容器
 * @returns 作用域
 * 
 * @example
 * const container = createContainer();
 * const scope = createScope(container);
 * const service = scope.resolve('myService');
 * scope.dispose();
 */
export function createScope(parent: IContainer): IScope {
  if (!(parent instanceof Container)) {
    throw new Error('Parent must be a Container instance');
  }
  return parent.createScope();
}

// ============================================
// 装饰器 (TypeScript)
// ============================================

/**
 * 可注入装饰器
 * 标记一个类可以被依赖注入
 * 
 * @example
 * @injectable()
 * class UserService {
 *   constructor(@inject('Database') private db: Database) {}
 * }
 */
export function injectable() {
  return function <T extends new (...args: any[]) => any>(constructor: T) {
    return constructor;
  };
}

/**
 * 注入装饰器
 * 标记构造函数参数需要注入依赖
 * 
 * @param serviceId - 服务标识符
 * 
 * @example
 * class UserController {
 *   constructor(@inject('UserService') private userService: UserService) {}
 * }
 * 
 * @note 需要 TypeScript 配置 experimentalDecorators 和 emitDecoratorMetadata
 */
export function inject(serviceId?: string) {
  return function (target: any, propertyKey: string | symbol, parameterIndex: number) {
    // 简单实现：将依赖信息附加到构造函数
    const dependencies = (target as any).dependencies || [];
    dependencies[parameterIndex] = serviceId || 'unknown';
    (target as any).dependencies = dependencies;
  };
}

// ============================================
// 使用示例
// ============================================

if (require.main === module) {
  console.log('=== 依赖注入容器 - 使用示例 ===\n');

  // ============================================
  // 示例服务类
  // ============================================
  
  class Logger {
    log(message: string) {
      console.log(`[LOG] ${message}`);
    }
  }

  class Database {
    connect() {
      console.log('[DB] Connected to database');
    }
    
    query(sql: string) {
      console.log(`[DB] Executing: ${sql}`);
      return [{ id: 1, name: 'Result' }];
    }
  }

  class UserService {
    constructor(
      private db: Database,
      private logger: Logger
    ) {
      this.db = db;
      this.logger = logger;
    }

    getUser(id: number) {
      this.logger.log(`Fetching user ${id}`);
      return this.db.query(`SELECT * FROM users WHERE id = ${id}`);
    }
  }

  class EmailService {
    constructor(private logger: Logger) {
      this.logger = logger;
    }

    send(to: string, subject: string) {
      this.logger.log(`Sending email to ${to}: ${subject}`);
    }
  }

  // ============================================
  // 示例 1: 基础注册与解析
  // ============================================
  console.log('1️⃣ 基础注册与解析');
  console.log('─'.repeat(50));

  const container = createContainer({ logging: true });

  container
    .registerSingleton('Logger', { type: Logger })
    .registerSingleton('Database', { type: Database })
    .registerTransient('UserService', {
      type: UserService,
      dependencies: ['Database', 'Logger']
    });

  const userService = container.resolve<UserService>('UserService');
  const result = userService.getUser(1);
  console.log('查询结果:', result);
  console.log();

  // ============================================
  // 示例 2: 工厂函数注册
  // ============================================
  console.log('2️⃣ 工厂函数注册');
  console.log('─'.repeat(50));

  const container2 = createContainer();

  container2.registerFactory('Config', (container) => ({
    apiKey: 'secret-key-123',
    apiUrl: 'https://api.example.com',
    timeout: 5000
  }));

  const config = container2.resolve<any>('Config');
  console.log('配置:', config);
  console.log();

  // ============================================
  // 示例 3: 作用域管理
  // ============================================
  console.log('3️⃣ 作用域管理');
  console.log('─'.repeat(50));

  const container3 = createContainer();
  container3.registerScoped('EmailService', {
    type: EmailService,
    dependencies: ['Logger']
  });
  container3.registerSingleton('Logger', { type: Logger });

  // 创建两个作用域
  const scope1 = container3.createScope();
  const scope2 = container3.createScope();

  const email1 = scope1.resolve<EmailService>('EmailService');
  const email2 = scope2.resolve<EmailService>('EmailService');

  console.log('作用域 1 的 EmailService:', email1);
  console.log('作用域 2 的 EmailService:', email2);
  console.log('是否同一实例:', email1 === email2); // false (不同作用域)

  // 同一作用域内是单例
  const email1Again = scope1.resolve<EmailService>('EmailService');
  console.log('作用域 1 再次解析:', email1 === email1Again); // true

  scope1.dispose();
  scope2.dispose();
  console.log();

  // ============================================
  // 示例 4: 循环依赖检测
  // ============================================
  console.log('4️⃣ 循环依赖检测');
  console.log('─'.repeat(50));

  class ServiceA {
    constructor(private serviceB: any) {}
  }

  class ServiceB {
    constructor(private serviceA: any) {}
  }

  const container4 = createContainer({ detectCircularDependencies: true });
  container4.register('ServiceA', { type: ServiceA, dependencies: ['ServiceB'] });
  container4.register('ServiceB', { type: ServiceB, dependencies: ['ServiceA'] });

  try {
    container4.resolve('ServiceA');
  } catch (error) {
    console.log('捕获循环依赖错误:', (error as DIError).message);
  }
  console.log();

  // ============================================
  // 示例 5: 实例注册
  // ============================================
  console.log('5️⃣ 实例注册');
  console.log('─'.repeat(50));

  const container5 = createContainer();
  const existingLogger = new Logger();
  
  container5.registerInstance('Logger', existingLogger);
  const resolvedLogger = container5.resolve<Logger>('Logger');
  
  console.log('实例是否相同:', existingLogger === resolvedLogger); // true
  console.log();

  // ============================================
  // 示例 6: 装饰器用法说明
  // ============================================
  console.log('6️⃣ 装饰器用法 (需要 TypeScript 配置)');
  console.log('─'.repeat(50));
  console.log('装饰器 @injectable() 和 @inject() 需要以下 TypeScript 配置:');
  console.log('  {');
  console.log('    "compilerOptions": {');
  console.log('      "experimentalDecorators": true,');
  console.log('      "emitDecoratorMetadata": true');
  console.log('    }');
  console.log('  }');
  console.log();
  console.log('使用示例:');
  console.log('  @injectable()');
  console.log('  class UserService {');
  console.log('    constructor(@inject("Database") private db: Database) {}');
  console.log('  }');
  console.log();

  // ============================================
  // 示例 7: 生命周期对比
  // ============================================
  console.log('7️⃣ 生命周期对比');
  console.log('─'.repeat(50));

  class Counter {
    public count = 0;
    increment() {
      this.count++;
      return this.count;
    }
  }

  const container7 = createContainer();
  container7.registerSingleton('CounterSingleton', { type: Counter });
  container7.registerTransient('CounterTransient', { type: Counter });

  const c1 = container7.resolve<Counter>('CounterSingleton');
  const c2 = container7.resolve<Counter>('CounterSingleton');
  console.log('Singleton - c1 === c2:', c1 === c2); // true
  console.log('Singleton - c1.count:', c1.increment()); // 1
  console.log('Singleton - c2.count:', c2.increment()); // 2 (同一实例)

  const c3 = container7.resolve<Counter>('CounterTransient');
  const c4 = container7.resolve<Counter>('CounterTransient');
  console.log('Transient - c3 === c4:', c3 === c4); // false
  console.log('Transient - c3.count:', c3.increment()); // 1
  console.log('Transient - c4.count:', c4.increment()); // 1 (不同实例)
  console.log();

  // ============================================
  // 总结
  // ============================================
  console.log('✅ 所有示例执行完成!');
  console.log();
  console.log('📋 功能总结:');
  console.log('  • 容器管理：register, registerSingleton, registerTransient, registerScoped');
  console.log('  • 依赖解析：resolve, tryResolve, isRegistered');
  console.log('  • 生命周期：singleton, transient, scoped');
  console.log('  • 高级特性：工厂函数、实例注册、作用域、循环依赖检测、装饰器');
  console.log();
  console.log('🎯 使用场景:');
  console.log('  • 大型应用模块化开发');
  console.log('  • 单元测试 Mock 注入');
  console.log('  • 微服务依赖管理');
  console.log('  • 插件系统架构');
}
