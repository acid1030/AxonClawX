/**
 * 🜏 AxonClaw 装饰者模式专业工具 (Decorator Pattern Pro)
 * 
 * 功能:
 * 1. 装饰者定义 - 标准化装饰者接口
 * 2. 动态增强 - 运行时动态添加功能
 * 3. 链式组合 - 支持 Fluent API 链式调用
 * 
 * @author Axon
 * @version 1.0.0
 * @since 2026-03-13
 */

// ============================================================================
// 核心接口定义
// ============================================================================

/**
 * 基础组件接口 - 所有被装饰对象的基接口
 */
export interface IComponent<T = any> {
  execute(...args: any[]): T;
  getDescription(): string;
}

/**
 * 装饰者接口 - 所有装饰者必须实现
 */
export interface IDecorator<T = any> extends IComponent<T> {
  getWrappedComponent(): IComponent<T>;
}

/**
 * 可链式装饰的接口 - 支持 Fluent API
 */
export interface IChainableDecorator<T = any> extends IDecorator<T> {
  chain(decorator: IDecorator<T>): IChainableDecorator<T>;
}

// ============================================================================
// 基础组件实现
// ============================================================================

/**
 * 具体组件 - 被装饰的基础对象
 */
export class ConcreteComponent<T = any> implements IComponent<T> {
  protected value: T;
  protected name: string;

  constructor(value: T, name: string = 'Component') {
    this.value = value;
    this.name = name;
  }

  execute(...args: any[]): T {
    return this.value;
  }

  getDescription(): string {
    return this.name;
  }
}

// ============================================================================
// 装饰者基类
// ============================================================================

/**
 * 装饰者抽象基类 - 提供通用实现
 */
export abstract class DecoratorBase<T = any> implements IDecorator<T> {
  protected wrappedComponent: IComponent<T>;

  constructor(component: IComponent<T>) {
    this.wrappedComponent = component;
  }

  abstract execute(...args: any[]): T;

  getDescription(): string {
    return `${this.constructor.name}(${this.wrappedComponent.getDescription()})`;
  }

  getWrappedComponent(): IComponent<T> {
    return this.wrappedComponent;
  }
}

/**
 * 可链式装饰者基类 - 支持 Fluent API
 */
export abstract class ChainableDecoratorBase<T = any> 
  extends DecoratorBase<T> 
  implements IChainableDecorator<T> {
  
  protected nextDecorator: IDecorator<T> | null = null;

  chain(decorator: IDecorator<T>): IChainableDecorator<T> {
    if (this.nextDecorator === null) {
      this.nextDecorator = decorator;
      return this;
    } else {
      // 递归链式调用
      let current = this.nextDecorator;
      while (current instanceof ChainableDecoratorBase && current.nextDecorator !== null) {
        current = current.nextDecorator;
      }
      if (current instanceof ChainableDecoratorBase) {
        current.nextDecorator = decorator;
      }
      return this;
    }
  }

  getDescription(): string {
    const baseDesc = super.getDescription();
    return this.nextDecorator 
      ? `${baseDesc} -> ${this.nextDecorator.getDescription()}`
      : baseDesc;
  }
}

// ============================================================================
// 具体装饰者实现
// ============================================================================

/**
 * 日志装饰者 - 添加执行日志功能
 */
export class LoggingDecorator<T = any> extends ChainableDecoratorBase<T> {
  private logPrefix: string;
  private logLevel: 'info' | 'warn' | 'error' | 'debug';

  constructor(component: IComponent<T>, logPrefix: string = 'LOG', logLevel: 'info' | 'warn' | 'error' | 'debug' = 'info') {
    super(component);
    this.logPrefix = logPrefix;
    this.logLevel = logLevel;
  }

  execute(...args: any[]): T {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [${this.logLevel.toUpperCase()}] [${this.logPrefix}] Executing: ${this.getDescription()}`);
    
    const result = this.wrappedComponent.execute(...args);
    
    console.log(`[${timestamp}] [${this.logLevel.toUpperCase()}] [${this.logPrefix}] Completed: ${this.getDescription()}`);
    
    if (this.nextDecorator) {
      return this.nextDecorator.execute(...args);
    }
    
    return result;
  }
}

/**
 * 缓存装饰者 - 添加缓存功能
 */
export class CachingDecorator<T = any> extends ChainableDecoratorBase<T> {
  private cache: Map<string, T> = new Map();
  private ttlMs: number;
  private keyGenerator?: (...args: any[]) => string;

  constructor(
    component: IComponent<T>, 
    ttlMs: number = 60000,
    keyGenerator?: (...args: any[]) => string
  ) {
    super(component);
    this.ttlMs = ttlMs;
    this.keyGenerator = keyGenerator;
  }

  execute(...args: any[]): T {
    const cacheKey = this.keyGenerator 
      ? this.keyGenerator(...args)
      : JSON.stringify(args);

    const cached = this.cache.get(cacheKey);
    if (cached !== undefined) {
      console.log(`[CACHE HIT] ${cacheKey}`);
      return cached;
    }

    console.log(`[CACHE MISS] ${cacheKey}`);
    const result = this.wrappedComponent.execute(...args);
    this.cache.set(cacheKey, result);

    // TTL 过期
    setTimeout(() => this.cache.delete(cacheKey), this.ttlMs);

    if (this.nextDecorator) {
      return this.nextDecorator.execute(...args);
    }

    return result;
  }
}

/**
 * 性能监控装饰者 - 添加执行时间统计
 */
export class PerformanceMonitorDecorator<T = any> extends ChainableDecoratorBase<T> {
  private thresholdMs: number;
  private onSlow?: (durationMs: number, description: string) => void;

  constructor(
    component: IComponent<T>,
    thresholdMs: number = 100,
    onSlow?: (durationMs: number, description: string) => void
  ) {
    super(component);
    this.thresholdMs = thresholdMs;
    this.onSlow = onSlow;
  }

  execute(...args: any[]): T {
    const startTime = performance.now();
    const result = this.wrappedComponent.execute(...args);
    const durationMs = performance.now() - startTime;

    if (durationMs > this.thresholdMs) {
      const message = `[PERF WARNING] ${this.getDescription()} took ${durationMs.toFixed(2)}ms (threshold: ${this.thresholdMs}ms)`;
      console.warn(message);
      this.onSlow?.(durationMs, this.getDescription());
    } else {
      console.log(`[PERF] ${this.getDescription()} took ${durationMs.toFixed(2)}ms`);
    }

    if (this.nextDecorator) {
      return this.nextDecorator.execute(...args);
    }

    return result;
  }
}

/**
 * 重试装饰者 - 添加自动重试功能 (仅用于 Promise 类型)
 */
export class RetryDecorator<T = any> extends ChainableDecoratorBase<Promise<T>> {
  private maxRetries: number;
  private delayMs: number;
  private shouldRetry?: (error: Error) => boolean;

  constructor(
    component: IComponent<Promise<T>>,
    maxRetries: number = 3,
    delayMs: number = 1000,
    shouldRetry?: (error: Error) => boolean
  ) {
    super(component);
    this.maxRetries = maxRetries;
    this.delayMs = delayMs;
    this.shouldRetry = shouldRetry;
  }

  async execute(...args: any[]): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.maxRetries + 1; attempt++) {
      try {
        console.log(`[RETRY] Attempt ${attempt}/${this.maxRetries + 1} for ${this.getDescription()}`);
        const result = await this.wrappedComponent.execute(...args);
        
        if (this.nextDecorator) {
          return await (this.nextDecorator as any).execute(...args);
        }
        
        return result;
      } catch (error) {
        lastError = error as Error;
        console.error(`[RETRY ERROR] Attempt ${attempt} failed: ${error}`);
        
        if (attempt <= this.maxRetries) {
          if (this.shouldRetry && !this.shouldRetry(lastError)) {
            throw lastError;
          }
          await this.sleep(this.delayMs);
        }
      }
    }

    throw lastError;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * 验证装饰者 - 添加参数验证功能
 */
export class ValidationDecorator<T = any> extends ChainableDecoratorBase<T> {
  private validators: Array<(...args: any[]) => boolean>;
  private onValidationFailed?: (args: any[]) => void;

  constructor(
    component: IComponent<T>,
    validators: Array<(...args: any[]) => boolean> = [],
    onValidationFailed?: (args: any[]) => void
  ) {
    super(component);
    this.validators = validators;
    this.onValidationFailed = onValidationFailed;
  }

  addValidator(validator: (...args: any[]) => boolean): this {
    this.validators.push(validator);
    return this;
  }

  execute(...args: any[]): T {
    for (const validator of this.validators) {
      if (!validator(...args)) {
        console.error(`[VALIDATION FAILED] ${this.getDescription()}`);
        this.onValidationFailed?.(args);
        throw new Error(`Validation failed for ${this.getDescription()}`);
      }
    }

    console.log(`[VALIDATION PASSED] ${this.getDescription()}`);
    const result = this.wrappedComponent.execute(...args);

    if (this.nextDecorator) {
      return this.nextDecorator.execute(...args);
    }

    return result;
  }
}

// ============================================================================
// 装饰者工厂 - 简化创建流程
// ============================================================================

/**
 * 装饰者构建器 - Fluent API 风格
 */
export class DecoratorBuilder<T = any> {
  private component: IComponent<T>;
  private decorators: Array<(comp: IComponent<T>) => IDecorator<T>> = [];

  constructor(component: IComponent<T>) {
    this.component = component;
  }

  withLogging(logPrefix?: string, logLevel?: 'info' | 'warn' | 'error' | 'debug'): this {
    this.decorators.push(comp => new LoggingDecorator(comp, logPrefix, logLevel));
    return this;
  }

  withCache(ttlMs?: number, keyGenerator?: (...args: any[]) => string): this {
    this.decorators.push(comp => new CachingDecorator(comp, ttlMs, keyGenerator));
    return this;
  }

  withPerformanceMonitor(thresholdMs?: number, onSlow?: (durationMs: number, description: string) => void): this {
    this.decorators.push(comp => new PerformanceMonitorDecorator(comp, thresholdMs, onSlow));
    return this;
  }

  withRetry(maxRetries?: number, delayMs?: number, shouldRetry?: (error: Error) => boolean): this {
    this.decorators.push(comp => new RetryDecorator(comp as IComponent<Promise<any>>, maxRetries, delayMs, shouldRetry) as any);
    return this;
  }

  withValidation(
    validators?: Array<(...args: any[]) => boolean>,
    onValidationFailed?: (args: any[]) => void
  ): this {
    this.decorators.push(comp => new ValidationDecorator(comp, validators, onValidationFailed));
    return this;
  }

  build(): IComponent<T> {
    let result: IComponent<T> = this.component;
    
    // 从内到外装饰
    for (let i = this.decorators.length - 1; i >= 0; i--) {
      result = this.decorators[i](result);
    }
    
    return result;
  }
}

// ============================================================================
// 使用示例
// ============================================================================

/**
 * 示例 1: 基础装饰者使用
 */
export function example1_BasicDecorator() {
  console.log('\n=== 示例 1: 基础装饰者 ===\n');
  
  // 创建基础组件
  const component = new ConcreteComponent<number>(42, 'Calculator');
  console.log('基础组件:', component.getDescription());
  console.log('执行结果:', component.execute());
  
  // 添加日志装饰
  const loggedComponent = new LoggingDecorator(component, 'CALC');
  console.log('装饰后:', loggedComponent.getDescription());
  console.log('执行结果:', loggedComponent.execute());
}

/**
 * 示例 2: 链式装饰者组合
 */
export function example2_ChainedDecorators() {
  console.log('\n=== 示例 2: 链式装饰者 ===\n');
  
  const component = new ConcreteComponent<string>('Hello', 'Greeter');
  
  // 链式组合多个装饰者
  const decorated = new LoggingDecorator(component, 'LOG')
    .chain(new PerformanceMonitorDecorator(component, 50))
    .chain(new CachingDecorator(component, 30000));
  
  console.log('完整装饰链:', decorated.getDescription());
  console.log('第一次执行:', decorated.execute());
  console.log('第二次执行 (缓存):', decorated.execute());
}

/**
 * 示例 3: Fluent API 构建器
 */
export function example3_FluentBuilder() {
  console.log('\n=== 示例 3: Fluent API 构建器 ===\n');
  
  const component = new ConcreteComponent<number>(100, 'DataProcessor');
  
  // 使用构建器快速组合装饰者
  const decorated = new DecoratorBuilder(component)
    .withValidation([
      (value: number) => value > 0,
      (value: number) => value < 1000
    ])
    .withLogging('PROCESS', 'info')
    .withCache(60000)
    .withPerformanceMonitor(100, (duration, desc) => {
      console.warn(`⚠️  慢查询警告: ${desc} 耗时 ${duration}ms`);
    })
    .build();
  
  console.log('最终装饰链:', decorated.getDescription());
  console.log('执行结果:', decorated.execute());
}

/**
 * 示例 4: 异步重试装饰者
 */
export async function example4_AsyncRetry() {
  console.log('\n=== 示例 4: 异步重试 ===\n');
  
  // 模拟可能失败的异步组件
  class AsyncComponent extends ConcreteComponent<Promise<string>> {
    private failureCount = 0;
    private maxFailures: number;

    constructor(maxFailures: number = 2) {
      super(Promise.resolve('Success'), 'AsyncService');
      this.maxFailures = maxFailures;
    }

    async execute(...args: any[]): Promise<string> {
      if (this.failureCount < this.maxFailures) {
        this.failureCount++;
        throw new Error(`Simulated failure ${this.failureCount}`);
      }
      return 'Success after retries!';
    }
  }

  const component = new AsyncComponent(2);
  
  const decorated = new DecoratorBuilder(component)
    .withRetry(3, 500, (error) => {
      console.log(`[RETRY LOGIC] Retrying because: ${error.message}`);
      return true;
    })
    .withLogging('ASYNC')
    .build();
  
  try {
    const result = await decorated.execute();
    console.log('最终结果:', result);
  } catch (error) {
    console.error('重试失败:', error);
  }
}

/**
 * 示例 5: 实际业务场景 - API 请求处理
 */
export function example5_RealWorld_API() {
  console.log('\n=== 示例 5: 实际业务场景 - API 请求处理 ===\n');
  
  // 模拟 API 服务
  class APIService extends ConcreteComponent<Promise<any>> {
    constructor() {
      super(Promise.resolve({ data: 'API Response' }), 'UserAPI');
    }

    async execute(endpoint: string, params?: any): Promise<any> {
      console.log(`📡 请求 API: ${endpoint}`, params);
      return { success: true, endpoint, params, timestamp: Date.now() };
    }
  }

  const apiService = new APIService();
  
  // 构建完整的 API 处理管道
  const robustAPI = new DecoratorBuilder(apiService)
    .withValidation([
      (endpoint: string) => typeof endpoint === 'string' && endpoint.length > 0,
      (endpoint: string, params?: any) => !params || typeof params === 'object'
    ])
    .withLogging('API', 'info')
    .withCache(30000, (endpoint: string, params?: any) => 
      `${endpoint}:${JSON.stringify(params || {})}`
    )
    .withRetry(3, 1000, (error) => {
      // 网络错误时重试
      return error.message.includes('network') || error.message.includes('timeout');
    })
    .withPerformanceMonitor(500, (duration, desc) => {
      console.error(`🐌 API 响应过慢: ${duration}ms`);
    })
    .build();
  
  console.log('API 处理管道:', robustAPI.getDescription());
  
  // 执行 API 请求
  robustAPI.execute('/users', { id: 123 });
  robustAPI.execute('/users', { id: 123 }); // 缓存命中
}

// ============================================================================
// 导出工具函数
// ============================================================================

/**
 * 快速创建装饰组件
 */
export function createDecoratedComponent<T = any>(
  baseValue: T,
  baseName: string = 'Component',
  options: {
    logging?: { prefix?: string; level?: 'info' | 'warn' | 'error' | 'debug' };
    caching?: { ttlMs?: number; keyGenerator?: (...args: any[]) => string };
    performance?: { thresholdMs?: number; onSlow?: (duration: number, desc: string) => void };
    retry?: { maxRetries?: number; delayMs?: number; shouldRetry?: (error: Error) => boolean };
    validation?: { validators?: Array<(...args: any[]) => boolean>; onFailed?: (args: any[]) => void };
  } = {}
): IComponent<T> {
  const component = new ConcreteComponent(baseValue, baseName);
  const builder = new DecoratorBuilder(component);

  if (options.logging) {
    builder.withLogging(options.logging.prefix, options.logging.level);
  }

  if (options.caching) {
    builder.withCache(options.caching.ttlMs, options.caching.keyGenerator);
  }

  if (options.performance) {
    builder.withPerformanceMonitor(options.performance.thresholdMs, options.performance.onSlow);
  }

  if (options.retry) {
    builder.withRetry(options.retry.maxRetries, options.retry.delayMs, options.retry.shouldRetry);
  }

  if (options.validation) {
    builder.withValidation(options.validation.validators, options.validation.onFailed);
  }

  return builder.build();
}

// ============================================================================
// 运行所有示例 (开发时使用)
// ============================================================================

if (require.main === module) {
  (async () => {
    example1_BasicDecorator();
    await new Promise(resolve => setTimeout(resolve, 100));
    
    example2_ChainedDecorators();
    await new Promise(resolve => setTimeout(resolve, 100));
    
    example3_FluentBuilder();
    await new Promise(resolve => setTimeout(resolve, 100));
    
    await example4_AsyncRetry();
    await new Promise(resolve => setTimeout(resolve, 100));
    
    example5_RealWorld_API();
  })();
}
