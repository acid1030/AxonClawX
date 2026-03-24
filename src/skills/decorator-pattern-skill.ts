/**
 * Decorator Pattern Skill - ACE (Advanced Constructor Engine)
 * 
 * 装饰器模式工具，用于动态增强对象/函数功能。
 * 
 * 功能:
 * 1. 功能装饰 - 为对象/函数添加新功能而不修改原始结构
 * 2. 链式装饰 - 支持多个装饰器链式组合
 * 3. 条件装饰 - 基于条件动态应用装饰器
 * 
 * @author Axon
 * @version 1.0.0
 */

/**
 * 基础装饰器接口
 */
export interface Decorator<T> {
  /** 装饰器名称 */
  name: string;
  /** 应用装饰 */
  apply(target: T): T;
  /** 获取元数据 */
  getMetadata?(): DecoratorMetadata;
}

/**
 * 函数装饰器接口
 */
export interface FunctionDecorator<P extends any[] = any[], R = any> {
  name: string;
  apply(fn: (...args: P) => R): (...args: P) => R;
}

/**
 * 条件装饰器配置
 */
export interface ConditionalDecoratorConfig<T> {
  /** 条件函数 */
  condition: (target: T) => boolean;
  /** 条件满足时应用的装饰器 */
  decorator: Decorator<T>;
  /** 条件不满足时的可选装饰器 */
  elseDecorator?: Decorator<T>;
}

/**
 * 装饰器元数据
 */
export interface DecoratorMetadata {
  /** 装饰器名称 */
  name: string;
  /** 应用时间戳 */
  appliedAt: number;
  /** 装饰器类型 */
  type: 'function' | 'object' | 'class';
}

/**
 * 可装饰对象接口
 */
export interface Decoratable<T = any> {
  /** 获取装饰器元数据列表 */
  getDecorators(): DecoratorMetadata[];
  /** 检查是否已应用某装饰器 */
  hasDecorator(name: string): boolean;
  /** 原始对象引用 */
  readonly original: T;
}

/**
 * 装饰器链结果
 */
export interface ChainResult<T> {
  /** 最终结果 */
  result: T;
  /** 应用的装饰器列表 */
  appliedDecorators: string[];
  /** 跳过的装饰器列表 */
  skippedDecorators: string[];
}

/**
 * 通用对象装饰器基类
 * 
 * @template T - 目标对象类型
 */
export abstract class ObjectDecorator<T extends object = any> implements Decorator<T> {
  readonly name: string;
  protected metadata: DecoratorMetadata;

  constructor(name: string) {
    this.name = name;
    this.metadata = {
      name,
      appliedAt: Date.now(),
      type: 'object'
    };
  }

  abstract apply(target: T): T;

  /**
   * 获取元数据
   */
  getMetadata(): DecoratorMetadata {
    return { ...this.metadata };
  }
}

/**
 * 函数装饰器基类
 * 
 * @template P - 函数参数类型
 * @template R - 函数返回类型
 */
export abstract class BaseFunctionDecorator<P extends any[] = any[], R = any> 
  implements FunctionDecorator<P, R> {
  
  readonly name: string;
  protected metadata: DecoratorMetadata;

  constructor(name: string) {
    this.name = name;
    this.metadata = {
      name,
      appliedAt: Date.now(),
      type: 'function'
    };
  }

  abstract apply(fn: (...args: P) => R): (...args: P) => R;

  getMetadata(): DecoratorMetadata {
    return { ...this.metadata };
  }
}

/**
 * 装饰器管理器 - 核心引擎
 * 
 * @template T - 目标类型
 */
export class DecoratorManager<T extends object = any> {
  private decorators: Map<string, Decorator<T>> = new Map();
  private appliedDecorators: DecoratorMetadata[] = [];
  private target: T;
  private original: T;

  constructor(target: T) {
    this.target = target;
    this.original = target;
  }

  /**
   * 注册装饰器
   */
  register(decorator: Decorator<T>): this {
    this.decorators.set(decorator.name, decorator);
    return this;
  }

  /**
   * 注册多个装饰器
   */
  registerMany(decorators: Decorator<T>[]): this {
    decorators.forEach(d => this.register(d));
    return this;
  }

  /**
   * 应用单个装饰器
   */
  apply(name: string): this {
    const decorator = this.decorators.get(name);
    if (!decorator) {
      throw new Error(`Decorator "${name}" not found`);
    }

    this.target = decorator.apply(this.target);
    this.appliedDecorators.push(this.getDecoratorMetadata(decorator));
    return this;
  }

  /**
   * 应用多个装饰器（按注册顺序）
   */
  applyAll(): this {
    this.decorators.forEach((_, name) => this.apply(name));
    return this;
  }

  /**
   * 条件应用装饰器
   */
  applyIf(name: string, condition: (target: T) => boolean): this {
    if (condition(this.target)) {
      this.apply(name);
    }
    return this;
  }

  /**
   * 链式应用装饰器
   */
  chain(...names: string[]): this {
    names.forEach(name => this.apply(name));
    return this;
  }

  /**
   * 获取结果
   */
  getResult(): T & Decoratable<T> {
    const result = this.target as T & Decoratable<T>;
    
    // 添加装饰器查询方法
    if (!Object.prototype.hasOwnProperty.call(result, 'getDecorators')) {
      Object.defineProperty(result, 'getDecorators', {
        value: () => [...this.appliedDecorators],
        enumerable: false,
        writable: false
      });
    }

    if (!Object.prototype.hasOwnProperty.call(result, 'hasDecorator')) {
      Object.defineProperty(result, 'hasDecorator', {
        value: (name: string) => this.appliedDecorators.some(d => d.name === name),
        enumerable: false,
        writable: false
      });
    }

    if (!Object.prototype.hasOwnProperty.call(result, 'original')) {
      Object.defineProperty(result, 'original', {
        value: this.original,
        enumerable: false,
        writable: false
      });
    }

    return result;
  }

  /**
   * 获取已应用的装饰器列表
   */
  getAppliedDecorators(): string[] {
    return this.appliedDecorators.map(d => d.name);
  }

  /**
   * 获取装饰器元数据
   */
  private getDecoratorMetadata(decorator: Decorator<T>): DecoratorMetadata {
    if (decorator.getMetadata) {
      return decorator.getMetadata();
    }
    return {
      name: decorator.name,
      appliedAt: Date.now(),
      type: 'object'
    };
  }

  /**
   * 重置为目标初始状态
   */
  reset(): this {
    this.target = this.original;
    this.appliedDecorators = [];
    return this;
  }
}

/**
 * 函数装饰器链
 * 
 * @template P - 函数参数类型
 * @template R - 函数返回类型
 */
export class FunctionDecoratorChain<P extends any[] = any[], R = any> {
  private decorators: FunctionDecorator<P, R>[] = [];
  private appliedDecorators: string[] = [];
  private skippedDecorators: string[] = [];

  /**
   * 添加装饰器
   */
  use(decorator: FunctionDecorator<P, R>): this {
    this.decorators.push(decorator);
    return this;
  }

  /**
   * 添加多个装饰器
   */
  useMany(decorators: FunctionDecorator<P, R>[]): this {
    this.decorators.push(...decorators);
    return this;
  }

  /**
   * 应用所有装饰器到函数
   */
  apply(fn: (...args: P) => R): (...args: P) => R {
    let decoratedFn = fn;
    
    this.decorators.forEach(decorator => {
      decoratedFn = decorator.apply(decoratedFn);
      this.appliedDecorators.push(decorator.name);
    });

    return decoratedFn;
  }

  /**
   * 条件应用装饰器
   */
  applyIf(
    fn: (...args: P) => R,
    decorator: FunctionDecorator<P, R>,
    condition: (...args: P) => boolean
  ): (...args: P) => R {
    const wrappedFn = (...args: P): R => {
      if (condition(...args)) {
        this.appliedDecorators.push(decorator.name);
        return decorator.apply(fn)(...args);
      } else {
        this.skippedDecorators.push(decorator.name);
        return fn(...args);
      }
    };

    return wrappedFn;
  }

  /**
   * 获取装饰统计
   */
  getStats(): { applied: string[]; skipped: string[] } {
    return {
      applied: [...this.appliedDecorators],
      skipped: [...this.skippedDecorators]
    };
  }

  /**
   * 重置状态
   */
  reset(): this {
    this.appliedDecorators = [];
    this.skippedDecorators = [];
    return this;
  }
}

/**
 * ========== 内置实用装饰器 ==========
 */

/**
 * 日志装饰器 - 为函数添加日志功能
 */
export function createLoggerDecorator<P extends any[] = any[], R = any>(
  name: string = 'logger'
): FunctionDecorator<P, R> {
  return {
    name,
    apply: (fn) => (...args: P): R => {
      console.log(`[${name}] Calling with args:`, args);
      const start = Date.now();
      const result = fn(...args);
      const duration = Date.now() - start;
      console.log(`[${name}] Returned:`, result, `(${duration}ms)`);
      return result;
    }
  };
}

/**
 * 缓存装饰器 - 为函数添加缓存功能
 */
export function createCacheDecorator<P extends any[] = any[], R = any>(
  cache: Map<string, R> = new Map(),
  name: string = 'cache'
): FunctionDecorator<P, R> {
  return {
    name,
    apply: (fn) => (...args: P): R => {
      const key = JSON.stringify(args);
      if (cache.has(key)) {
        console.log(`[${name}] Cache hit for key:`, key);
        return cache.get(key)!;
      }
      const result = fn(...args);
      cache.set(key, result);
      console.log(`[${name}] Cache miss, stored result for key:`, key);
      return result;
    }
  };
}

/**
 * 重试装饰器 - 为函数添加自动重试功能
 */
export function createRetryDecorator<P extends any[] = any[], R = any>(
  maxRetries: number = 3,
  delayMs: number = 1000,
  name: string = 'retry'
): FunctionDecorator<P, R> {
  return {
    name,
    apply: (fn) => {
      const retryFn = async (...args: P): Promise<R> => {
        let lastError: Error | null = null;
        
        for (let i = 0; i < maxRetries; i++) {
          try {
            return await fn(...args);
          } catch (error) {
            lastError = error as Error;
            console.log(`[${name}] Attempt ${i + 1} failed:`, error);
            
            if (i < maxRetries - 1) {
              await new Promise(resolve => setTimeout(resolve, delayMs));
            }
          }
        }
        
        throw lastError || new Error('Unknown error');
      };

      return retryFn as unknown as (...args: P) => R;
    }
  };
}

/**
 * 验证装饰器 - 为函数添加参数验证
 */
export function createValidateDecorator<P extends any[] = any[], R = any>(
  validator: (...args: P) => boolean | string,
  name: string = 'validate'
): FunctionDecorator<P, R> {
  return {
    name,
    apply: (fn) => (...args: P): R => {
      const result = validator(...args);
      
      if (result === false) {
        throw new Error(`[${name}] Validation failed`);
      }
      
      if (typeof result === 'string') {
        throw new Error(`[${name}] ${result}`);
      }

      return fn(...args);
    }
  };
}

/**
 * 性能监控装饰器 - 为对象添加性能追踪
 */
export class PerformanceDecorator<T extends object> extends ObjectDecorator<T> {
  private timings: Map<string, number[]> = new Map();

  constructor(name: string = 'performance') {
    super(name);
  }

  apply(target: T): T {
    const decorated = target as any;
    const self = this;

    Object.keys(decorated).forEach(key => {
      if (typeof decorated[key] === 'function') {
        const originalFn = decorated[key];
        
        decorated[key] = function (...args: any[]) {
          const start = performance.now();
          const result = originalFn.apply(this, args);
          const duration = performance.now() - start;

          if (!self.timings.has(key)) {
            self.timings.set(key, []);
          }
          self.timings.get(key)!.push(duration);

          console.log(`[${self.name}] ${key} executed in ${duration.toFixed(2)}ms`);
          return result;
        };
      }
    });

    return decorated;
  }

  /**
   * 获取性能统计
   */
  getStats(): Record<string, { count: number; avg: number; min: number; max: number }> {
    const stats: Record<string, any> = {};

    this.timings.forEach((timings, method) => {
      stats[method] = {
        count: timings.length,
        avg: timings.reduce((a, b) => a + b, 0) / timings.length,
        min: Math.min(...timings),
        max: Math.max(...timings)
      };
    });

    return stats;
  }
}

/**
 * 权限检查装饰器 - 为对象方法添加权限控制
 */
export class PermissionDecorator<T extends object> extends ObjectDecorator<T> {
  private permissions: Map<string, Set<string>> = new Map();

  constructor(
    private checkPermission: (user: any, permission: string) => boolean,
    name: string = 'permission'
  ) {
    super(name);
  }

  /**
   * 为方法设置所需权限
   */
  require(method: string, permission: string): this {
    if (!this.permissions.has(method)) {
      this.permissions.set(method, new Set());
    }
    this.permissions.get(method)!.add(permission);
    return this;
  }

  apply(target: T): T {
    const decorated = target as any;
    const self = this;

    Object.keys(decorated).forEach(key => {
      if (typeof decorated[key] === 'function') {
        const originalFn = decorated[key];
        const requiredPermissions = self.permissions.get(key);

        if (requiredPermissions) {
          decorated[key] = function (this: any, ...args: any[]) {
            const user = args[0]; // 假设第一个参数是用户对象
            
            requiredPermissions.forEach((permission) => {
              if (!self.checkPermission(user, permission)) {
                throw new Error(
                  `[${self.name}] Permission denied: ${permission} required for ${key}`
                );
              }
            });

            return originalFn.apply(this, args);
          };
        }
      }
    });

    return decorated;
  }
}

/**
 * ========== 条件装饰器工厂 ==========
 */

/**
 * 创建条件装饰器
 */
export function createConditionalDecorator<T extends object>(
  config: ConditionalDecoratorConfig<T>
): Decorator<T> {
  return {
    name: `conditional-${config.decorator.name}`,
    apply: (target: T): T => {
      if (config.condition(target)) {
        console.log(`[Conditional] Condition met, applying ${config.decorator.name}`);
        return config.decorator.apply(target);
      } else if (config.elseDecorator) {
        console.log(`[Conditional] Condition not met, applying ${config.elseDecorator.name}`);
        return config.elseDecorator.apply(target);
      }
      console.log(`[Conditional] Condition not met, no else decorator`);
      return target;
    }
  };
}

/**
 * ========== 便捷工厂函数 ==========
 */

/**
 * 快速创建对象装饰器链
 */
export function decorateObject<T extends object>(
  target: T,
  ...decorators: Decorator<T>[]
): T & Decoratable<T> {
  const manager = new DecoratorManager<T>(target);
  manager.registerMany(decorators);
  return manager.applyAll().getResult();
}

/**
 * 快速创建函数装饰器链
 */
export function decorateFunction<P extends any[] = any[], R = any>(
  fn: (...args: P) => R,
  ...decorators: FunctionDecorator<P, R>[]
): (...args: P) => R {
  const chain = new FunctionDecoratorChain<P, R>();
  chain.useMany(decorators);
  return chain.apply(fn);
}

/**
 * 条件装饰函数
 */
export function decorateIf<P extends any[] = any[], R = any>(
  fn: (...args: P) => R,
  decorator: FunctionDecorator<P, R>,
  condition: (...args: P) => boolean
): (...args: P) => R {
  const chain = new FunctionDecoratorChain<P, R>();
  return chain.applyIf(fn, decorator, condition);
}

/**
 * ========== 使用示例 ==========
 */

// 示例 1: 函数装饰 - 添加日志和缓存
export function example1_functionDecoration() {
  const expensiveCalculation = (n: number): number => {
    console.log('Calculating...');
    return n * n;
  };

  // 链式装饰：日志 + 缓存
  const decoratedFn = decorateFunction(
    expensiveCalculation,
    createLoggerDecorator(),
    createCacheDecorator()
  );

  console.log('=== Example 1: Function Decoration ===');
  console.log('First call (cache miss):', decoratedFn(5));
  console.log('Second call (cache hit):', decoratedFn(5));

  return decoratedFn;
}

// 示例 2: 条件装饰 - 仅在开发环境添加日志
export function example2_conditionalDecoration() {
  const isDevelopment = true;

  const apiCall = async (url: string): Promise<string> => {
    console.log('Making API call to:', url);
    return `Response from ${url}`;
  };

  const decoratedFn = decorateIf(
    apiCall,
    createLoggerDecorator('dev-logger'),
    () => isDevelopment
  );

  console.log('=== Example 2: Conditional Decoration ===');
  decoratedFn('https://api.example.com/data');

  return decoratedFn;
}

// 示例 3: 对象装饰 - 性能监控
export function example3_objectDecoration() {
  class DataService {
    fetchData(id: string): string {
      // 模拟耗时操作
      const start = Date.now();
      while (Date.now() - start < 100) {}
      return `Data for ${id}`;
    }

    saveData(data: any): boolean {
      const start = Date.now();
      while (Date.now() - start < 50) {}
      return true;
    }
  }

  console.log('=== Example 3: Object Decoration ===');
  const service = new DataService();
  const decoratedService = decorateObject(service, new PerformanceDecorator());

  decoratedService.fetchData('123');
  decoratedService.saveData({ key: 'value' });

  // 获取性能统计
  const perfDecorator = new PerformanceDecorator();
  console.log('Performance stats:', perfDecorator.getStats());

  return decoratedService;
}

// 示例 4: 权限装饰器
export function example4_permissionDecoration() {
  class AdminService {
    deleteUser(user: any, userId: string): boolean {
      console.log(`Deleting user ${userId}`);
      return true;
    }

    createAdmin(user: any, name: string): boolean {
      console.log(`Creating admin ${name}`);
      return true;
    }
  }

  console.log('=== Example 4: Permission Decoration ===');
  const service = new AdminService();
  const permissionDecorator = new PermissionDecorator(
    (user: any, permission: string) => user.permissions?.includes(permission)
  );
  permissionDecorator.require('deleteUser', 'admin:delete');
  permissionDecorator.require('createAdmin', 'admin:create');

  const decoratedService = decorateObject(service, permissionDecorator) as any;

  const adminUser = { name: 'Admin', permissions: ['admin:delete', 'admin:create'] };
  const regularUser = { name: 'User', permissions: [] };

  try {
    decoratedService.deleteUser(adminUser, '123'); // 成功
    decoratedService.deleteUser(regularUser, '456'); // 抛出权限错误
  } catch (error) {
    console.error('Permission error:', (error as Error).message);
  }

  return decoratedService;
}

// 示例 5: 链式装饰组合
export function example5_chainDecoration() {
  const processOrder = (order: any): boolean => {
    console.log('Processing order:', order.id);
    return true;
  };

  console.log('=== Example 5: Chain Decoration ===');
  
  // 组合多个装饰器：验证 -> 日志 -> 缓存 -> 重试
  const fullyDecorated = decorateFunction(
    processOrder,
    createValidateDecorator((order) => 
      order?.id ? true : 'Order ID is required'
    ),
    createLoggerDecorator('order-logger'),
    createCacheDecorator(),
    createRetryDecorator(3, 1000)
  );

  fullyDecorated({ id: 'ORDER-001', items: ['item1', 'item2'] });

  return fullyDecorated;
}

/**
 * 运行所有示例
 */
export function runAllExamples() {
  console.log('\n========================================');
  console.log('  Decorator Pattern Skill - Examples');
  console.log('========================================\n');

  example1_functionDecoration();
  console.log();

  example2_conditionalDecoration();
  console.log();

  example3_objectDecoration();
  console.log();

  example4_permissionDecoration();
  console.log();

  example5_chainDecoration();
  console.log();

  console.log('========================================');
  console.log('  All Examples Completed');
  console.log('========================================\n');
}

// 导出默认
export default {
  DecoratorManager,
  FunctionDecoratorChain,
  ObjectDecorator,
  BaseFunctionDecorator,
  // 内置装饰器
  createLoggerDecorator,
  createCacheDecorator,
  createRetryDecorator,
  createValidateDecorator,
  PerformanceDecorator,
  PermissionDecorator,
  // 条件装饰
  createConditionalDecorator,
  // 便捷函数
  decorateObject,
  decorateFunction,
  decorateIf,
  // 示例
  runAllExamples,
  example1_functionDecoration,
  example2_conditionalDecoration,
  example3_objectDecoration,
  example4_permissionDecoration,
  example5_chainDecoration
};
