/**
 * 责任链模式工具技能 - KAEL
 * 
 * 提供责任链模式的核心实现：
 * 1. 处理器链 (Handler Chain) - 构建可动态组合的请求处理器链
 * 2. 请求传递 (Request Passing) - 沿链条传递请求，每个处理器可选择处理或跳过
 * 3. 动态组合 (Dynamic Composition) - 运行时动态添加/移除/重排处理器
 * 
 * @author KAEL
 * @version 1.0.0
 * @since 2026-03-13
 */

// ============================================
// 类型定义
// ============================================

/**
 * 请求对象接口
 */
export interface IRequest {
  /** 请求类型 */
  type: string;
  /** 请求数据 */
  data: any;
  /** 请求元数据 */
  metadata?: Record<string, any>;
  /** 是否已被处理 */
  handled?: boolean;
  /** 处理结果 */
  result?: any;
}

/**
 * 处理器接口 - 所有处理器必须实现
 */
export interface IHandler {
  /**
   * 处理器名称 (用于调试和日志)
   */
  name: string;
  
  /**
   * 优先级 (数字越小优先级越高，可选)
   */
  priority?: number;
  
  /**
   * 是否可选 (跳过时不报错，可选)
   */
  optional?: boolean;
  
  /**
   * 判断是否能处理该请求
   * @param request - 请求对象
   * @returns 是否能处理
   */
  canHandle(request: IRequest): boolean;
  
  /**
   * 处理请求
   * @param request - 请求对象
   * @param next - 调用下一个处理器的函数
   * @returns 处理结果
   */
  handle(request: IRequest, next: () => any): any;
}

/**
 * 处理器配置
 */
export interface HandlerConfig {
  /** 处理器名称 */
  name: string;
  /** 优先级 (数字越小优先级越高) */
  priority?: number;
  /** 是否可选 (跳过时不报错) */
  optional?: boolean;
}

/**
 * 责任链配置
 */
export interface ChainConfig {
  /** 链名称 */
  name: string;
  /** 默认处理器 (当没有处理器处理时使用) */
  defaultHandler?: IHandler;
  /** 是否短路 (第一个处理器处理后即停止) */
  shortCircuit?: boolean;
  /** 错误处理函数 */
  onError?: (error: Error, request: IRequest) => any;
}

/**
 * 责任链接口
 */
export interface IChain {
  /**
   * 添加处理器到链尾
   */
  add(handler: IHandler): IChain;
  
  /**
   * 添加处理器到指定位置
   */
  addAt(index: number, handler: IHandler): IChain;
  
  /**
   * 添加处理器到链头
   */
  addFirst(handler: IHandler): IChain;
  
  /**
   * 移除处理器
   */
  remove(handler: IHandler): IChain;
  
  /**
   * 移除所有处理器
   */
  clear(): IChain;
  
  /**
   * 获取处理器列表
   */
  getHandlers(): IHandler[];
  
  /**
   * 执行请求
   */
  execute(request: IRequest): any;
  
  /**
   * 异步执行请求
   */
  executeAsync(request: IRequest): Promise<any>;
}

// ============================================
// 1. 基础处理器实现
// ============================================

/**
 * 抽象处理器基类
 * 提供通用的处理器实现框架
 */
export abstract class BaseHandler implements IHandler {
  public readonly name: string;
  public readonly priority: number;
  public readonly optional: boolean;
  
  constructor(config: HandlerConfig) {
    this.name = config.name;
    this.priority = config.priority ?? 100;
    this.optional = config.optional ?? false;
  }
  
  abstract canHandle(request: IRequest): boolean;
  abstract handle(request: IRequest, next: () => any): any;
  
  /**
   * 日志方法 (可被子类重写)
   */
  protected log(message: string, ...args: any[]): void {
    console.log(`[${this.name}] ${message}`, ...args);
  }
  
  /**
   * 错误日志方法
   */
  protected logError(message: string, ...args: any[]): void {
    console.error(`[${this.name}] ${message}`, ...args);
  }
}

/**
 * 日志处理器示例
 * 记录请求的进入和离开
 */
export class LoggingHandler extends BaseHandler {
  constructor() {
    super({ name: 'LoggingHandler', priority: 1 });
  }
  
  canHandle(request: IRequest): boolean {
    return true; // 所有请求都记录日志
  }
  
  handle(request: IRequest, next: () => any): any {
    this.log(`→ 请求进入: ${request.type}`, request.data);
    const result = next();
    this.log(`← 请求离开: ${request.type}`, request.result ?? result);
    return result;
  }
}

/**
 * 验证处理器示例
 * 验证请求数据的合法性
 */
export class ValidationHandler extends BaseHandler {
  private validators: Array<(request: IRequest) => boolean>;
  
  constructor(validators: Array<(request: IRequest) => boolean> = []) {
    super({ name: 'ValidationHandler', priority: 10 });
    this.validators = validators;
  }
  
  addValidator(validator: (request: IRequest) => boolean): this {
    this.validators.push(validator);
    return this;
  }
  
  canHandle(request: IRequest): boolean {
    return !request.handled;
  }
  
  handle(request: IRequest, next: () => any): any {
    for (const validator of this.validators) {
      if (!validator(request)) {
        const error = new Error(`验证失败：${request.type}`);
        if (this.optional) {
          this.logError('验证失败 (可选)，继续执行');
          return next();
        }
        throw error;
      }
    }
    this.log('验证通过');
    return next();
  }
}

/**
 * 缓存处理器示例
 * 检查并返回缓存结果
 */
export class CacheHandler extends BaseHandler {
  private cache: Map<string, any>;
  private ttlMs: number;
  
  constructor(ttlMs: number = 60000) {
    super({ name: 'CacheHandler', priority: 5 });
    this.cache = new Map();
    this.ttlMs = ttlMs;
  }
  
  canHandle(request: IRequest): boolean {
    return request.type !== 'WRITE'; // 写请求不缓存
  }
  
  handle(request: IRequest, next: () => any): any {
    const cacheKey = this.getCacheKey(request);
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.ttlMs) {
      this.log('缓存命中', cacheKey);
      request.result = cached.data;
      request.handled = true;
      return cached.data;
    }
    
    this.log('缓存未命中，执行请求', cacheKey);
    const result = next();
    
    if (!request.handled && result !== undefined) {
      this.cache.set(cacheKey, {
        data: result,
        timestamp: Date.now()
      });
    }
    
    return result;
  }
  
  private getCacheKey(request: IRequest): string {
    return `${request.type}:${JSON.stringify(request.data)}`;
  }
  
  clear(): void {
    this.cache.clear();
    this.log('缓存已清空');
  }
}

/**
 * 认证处理器示例
 * 验证请求的认证信息
 */
export class AuthHandler extends BaseHandler {
  private tokenValidator: (token: string) => boolean;
  
  constructor(tokenValidator: (token: string) => boolean) {
    super({ name: 'AuthHandler', priority: 2 });
    this.tokenValidator = tokenValidator;
  }
  
  canHandle(request: IRequest): boolean {
    return request.metadata?.requiresAuth !== false;
  }
  
  handle(request: IRequest, next: () => any): any {
    const token = request.metadata?.token;
    
    if (!token) {
      if (this.optional) {
        this.log('无 token (可选)，继续执行');
        return next();
      }
      throw new Error('缺少认证 token');
    }
    
    if (!this.tokenValidator(token)) {
      throw new Error('认证失败：无效的 token');
    }
    
    this.log('认证成功');
    return next();
  }
}

// ============================================
// 2. 责任链实现
// ============================================

/**
 * 责任链核心实现
 */
export class ChainOfResponsibility implements IChain {
  private handlers: IHandler[] = [];
  private config: ChainConfig;
  
  constructor(config: ChainConfig) {
    this.config = {
      name: config.name,
      shortCircuit: config.shortCircuit ?? false,
      onError: config.onError
    };
  }
  
  add(handler: IHandler): IChain {
    this.handlers.push(handler);
    this.sortByPriority();
    return this;
  }
  
  addAt(index: number, handler: IHandler): IChain {
    this.handlers.splice(index, 0, handler);
    return this;
  }
  
  addFirst(handler: IHandler): IChain {
    this.handlers.unshift(handler);
    return this;
  }
  
  remove(handler: IHandler): IChain {
    const index = this.handlers.indexOf(handler);
    if (index > -1) {
      this.handlers.splice(index, 1);
    }
    return this;
  }
  
  clear(): IChain {
    this.handlers = [];
    return this;
  }
  
  getHandlers(): IHandler[] {
    return [...this.handlers];
  }
  
  execute(request: IRequest): any {
    let index = 0;
    
    const next = (): any => {
      if (index >= this.handlers.length) {
        // 所有处理器都已执行
        if (this.config.defaultHandler) {
          return this.config.defaultHandler.handle(request, () => undefined);
        }
        return undefined;
      }
      
      const handler = this.handlers[index++];
      
      try {
        if (handler.canHandle(request)) {
          const result = handler.handle(request, next);
          
          if (this.config.shortCircuit && request.handled) {
            return result;
          }
          
          return result;
        }
        
        return next();
      } catch (error) {
        if (handler.optional) {
          console.warn(`[${handler.name}] 处理器失败 (可选)，跳过`);
          return next();
        }
        
        if (this.config.onError) {
          return this.config.onError(error as Error, request);
        }
        
        throw error;
      }
    };
    
    return next();
  }
  
  async executeAsync(request: IRequest): Promise<any> {
    let index = 0;
    
    const next = async (): Promise<any> => {
      if (index >= this.handlers.length) {
        if (this.config.defaultHandler) {
          return Promise.resolve(this.config.defaultHandler.handle(request, () => undefined));
        }
        return undefined;
      }
      
      const handler = this.handlers[index++];
      
      try {
        if (handler.canHandle(request)) {
          const result = await Promise.resolve(handler.handle(request, next));
          
          if (this.config.shortCircuit && request.handled) {
            return result;
          }
          
          return result;
        }
        
        return next();
      } catch (error) {
        if (handler.optional) {
          console.warn(`[${handler.name}] 处理器失败 (可选)，跳过`);
          return next();
        }
        
        if (this.config.onError) {
          return Promise.resolve(this.config.onError(error as Error, request));
        }
        
        throw error;
      }
    };
    
    return next();
  }
  
  private sortByPriority(): void {
    this.handlers.sort((a, b) => {
      const priorityA = (a as any).priority ?? 100;
      const priorityB = (b as any).priority ?? 100;
      return priorityA - priorityB;
    });
  }
}

// ============================================
// 3. 链构建器 (Fluent API)
// ============================================

/**
 * 责任链构建器
 * 提供流畅的 API 来构建责任链
 */
export class ChainBuilder {
  private config: ChainConfig;
  private handlers: IHandler[] = [];
  
  constructor(name: string) {
    this.config = { name };
  }
  
  /**
   * 设置默认处理器
   */
  withDefault(handler: IHandler): this {
    this.config.defaultHandler = handler;
    return this;
  }
  
  /**
   * 启用短路模式
   */
  withShortCircuit(): this {
    this.config.shortCircuit = true;
    return this;
  }
  
  /**
   * 设置错误处理器
   */
  withErrorHandler(handler: (error: Error, request: IRequest) => any): this {
    this.config.onError = handler;
    return this;
  }
  
  /**
   * 添加处理器
   */
  use(handler: IHandler): this {
    this.handlers.push(handler);
    return this;
  }
  
  /**
   * 添加多个处理器
   */
  useMany(handlers: IHandler[]): this {
    this.handlers.push(...handlers);
    return this;
  }
  
  /**
   * 构建责任链
   */
  build(): ChainOfResponsibility {
    const chain = new ChainOfResponsibility(this.config);
    this.handlers.forEach((h) => chain.add(h));
    return chain;
  }
}

/**
 * 创建责任链构建器
 * @param name - 链名称
 * @returns 构建器实例
 * 
 * @example
 * const chain = createChain('API Request')
 *   .use(new LoggingHandler())
 *   .use(new AuthHandler(validateToken))
 *   .use(new ValidationHandler([isValid]))
 *   .use(new CacheHandler(60000))
 *   .build();
 */
export function createChain(name: string): ChainBuilder {
  return new ChainBuilder(name);
}

// ============================================
// 4. 动态组合工具
// ============================================

/**
 * 处理器组合器
 * 动态组合多个处理器为一个
 */
export class HandlerCompositor {
  /**
   * 串行组合 - 按顺序执行所有处理器
   */
  static serial(...handlers: IHandler[]): IHandler {
    return {
      name: `Serial[${handlers.map((h) => h.name).join('→')}]`,
      
      canHandle(request: IRequest): boolean {
        return handlers.some((h) => h.canHandle(request));
      },
      
      handle(request: IRequest, next: () => any): any {
        let currentIndex = 0;
        
        const executeNext = (): any => {
          if (currentIndex >= handlers.length) {
            return next();
          }
          
          const handler = handlers[currentIndex++];
          
          if (handler.canHandle(request)) {
            return handler.handle(request, executeNext);
          }
          
          return executeNext();
        };
        
        return executeNext();
      }
    };
  }
  
  /**
   * 并行组合 - 同时执行所有处理器，返回第一个成功结果
   */
  static parallel(...handlers: IHandler[]): IHandler {
    return {
      name: `Parallel[${handlers.map((h) => h.name).join('|')}]`,
      
      canHandle(request: IRequest): boolean {
        return handlers.some((h) => h.canHandle(request));
      },
      
      handle(request: IRequest, next: () => any): any {
        const results: any[] = [];
        let completed = 0;
        
        for (const handler of handlers) {
          if (handler.canHandle(request)) {
            try {
              const result = handler.handle(request, () => undefined);
              results.push(result);
            } catch (error) {
              console.warn(`[${handler.name}] 并行执行失败`, error);
            }
          }
          completed++;
        }
        
        if (results.length === 0) {
          return next();
        }
        
        // 返回第一个非 undefined 结果
        return results.find((r) => r !== undefined) ?? next();
      }
    };
  }
  
  /**
   * 条件组合 - 根据条件选择处理器
   */
  static conditional(
    condition: (request: IRequest) => boolean,
    trueHandler: IHandler,
    falseHandler?: IHandler
  ): IHandler {
    return {
      name: `Conditional[${trueHandler.name}${falseHandler ? `|${falseHandler.name}` : ''}]`,
      
      canHandle(request: IRequest): boolean {
        return condition(request) ? trueHandler.canHandle(request) : (falseHandler?.canHandle(request) ?? false);
      },
      
      handle(request: IRequest, next: () => any): any {
        const handler = condition(request) ? trueHandler : falseHandler;
        
        if (!handler) {
          return next();
        }
        
        return handler.handle(request, next);
      }
    };
  }
  
  /**
   * 重试组合 - 失败时自动重试
   */
  static retry(handler: IHandler, maxRetries: number = 3): IHandler {
    return {
      name: `Retry[${handler.name}×${maxRetries}]`,
      
      canHandle(request: IRequest): boolean {
        return handler.canHandle(request);
      },
      
      handle(request: IRequest, next: () => any): any {
        let attempts = 0;
        
        const tryHandle = (): any => {
          try {
            return handler.handle(request, next);
          } catch (error) {
            attempts++;
            
            if (attempts < maxRetries) {
              console.warn(`[${handler.name}] 重试 ${attempts}/${maxRetries}`);
              return tryHandle();
            }
            
            throw error;
          }
        };
        
        return tryHandle();
      }
    };
  }
}

// ============================================
// 使用示例 (命令行执行)
// ============================================

if (require.main === module) {
  console.log('=== 责任链模式工具 - 使用示例 ===\n');
  
  // ============================================
  // 示例 1: 基础责任链
  // ============================================
  console.log('1️⃣ 基础责任链 (Basic Chain)');
  console.log('─'.repeat(50));
  
  const basicChain = createChain('BasicRequest')
    .use(new LoggingHandler())
    .use({
      name: 'SimpleHandler',
      canHandle: (req) => req.type === 'GET',
      handle: (req, next) => {
        console.log(`  [SimpleHandler] 处理 GET 请求: ${req.data}`);
        req.result = { data: req.data, timestamp: Date.now() };
        req.handled = true;
        return req.result;
      }
    })
    .build();
  
  const getRequest: IRequest = {
    type: 'GET',
    data: '/api/users',
    metadata: { id: 1 }
  };
  
  const result = basicChain.execute(getRequest);
  console.log('执行结果:', JSON.stringify(result, null, 2));
  console.log();
  
  // ============================================
  // 示例 2: 完整 API 请求链
  // ============================================
  console.log('2️⃣ 完整 API 请求链 (Full API Chain)');
  console.log('─'.repeat(50));
  
  // 模拟 token 验证
  const validateToken = (token: string): boolean => {
    return token === 'valid-token-123';
  };
  
  // 模拟数据验证
  const validateRequest = (req: IRequest): boolean => {
    return req.data !== null && req.data !== undefined;
  };
  
  const apiChain = createChain('API Request')
    .use(new LoggingHandler())
    .use(new AuthHandler(validateToken))
    .use(
      new ValidationHandler([validateRequest]).addValidator((req) => {
        if (req.type === 'POST' && !req.data) {
          throw new Error('POST 请求必须有数据');
        }
        return true;
      })
    )
    .use(new CacheHandler(60000))
    .withErrorHandler((error, req) => {
      console.error('  [ErrorHandler] 捕获错误:', error.message);
      return { error: error.message, handled: true };
    })
    .build();
  
  // 测试场景 1: 有效请求
  console.log('场景 1: 有效请求');
  const validRequest: IRequest = {
    type: 'GET',
    data: { query: 'users' },
    metadata: { token: 'valid-token-123', requiresAuth: true }
  };
  
  const apiResult = apiChain.execute(validRequest);
  console.log('API 结果:', JSON.stringify(apiResult, null, 2));
  console.log();
  
  // 测试场景 2: 无效 token
  console.log('场景 2: 无效 token');
  const invalidAuthRequest: IRequest = {
    type: 'GET',
    data: { query: 'users' },
    metadata: { token: 'invalid-token', requiresAuth: true }
  };
  
  const authErrorResult = apiChain.execute(invalidAuthRequest);
  console.log('认证错误结果:', JSON.stringify(authErrorResult, null, 2));
  console.log();
  
  // ============================================
  // 示例 3: 动态组合
  // ============================================
  console.log('3️⃣ 动态组合 (Dynamic Composition)');
  console.log('─'.repeat(50));
  
  // 创建多个处理器
  const handler1: IHandler = {
    name: 'Handler1',
    canHandle: (req) => req.type === 'TYPE1',
    handle: (req, next) => {
      console.log('  [Handler1] 处理 TYPE1');
      return { handler: 'Handler1', data: req.data };
    }
  };
  
  const handler2: IHandler = {
    name: 'Handler2',
    canHandle: (req) => req.type === 'TYPE2',
    handle: (req, next) => {
      console.log('  [Handler2] 处理 TYPE2');
      return { handler: 'Handler2', data: req.data };
    }
  };
  
  const handler3: IHandler = {
    name: 'Handler3',
    canHandle: () => true,
    handle: (req, next) => {
      console.log('  [Handler3] 默认处理');
      return { handler: 'Handler3', data: req.data, default: true };
    }
  };
  
  // 串行组合
  const serialHandler = HandlerCompositor.serial(handler1, handler2, handler3);
  const serialChain = createChain('SerialChain')
    .use(serialHandler)
    .build();
  
  console.log('串行组合 - TYPE1 请求:');
  serialChain.execute({ type: 'TYPE1', data: 'test1' });
  
  console.log('串行组合 - TYPE2 请求:');
  serialChain.execute({ type: 'TYPE2', data: 'test2' });
  
  console.log('串行组合 - TYPE3 请求 (默认):');
  serialChain.execute({ type: 'TYPE3', data: 'test3' });
  console.log();
  
  // 条件组合
  console.log('条件组合:');
  const conditionalHandler = HandlerCompositor.conditional(
    (req) => req.data?.priority === 'high',
    {
      name: 'HighPriorityHandler',
      canHandle: () => true,
      handle: (req, next) => {
        console.log('  [HighPriorityHandler] 高优先级处理');
        return { priority: 'high', data: req.data };
      }
    },
    {
      name: 'NormalHandler',
      canHandle: () => true,
      handle: (req, next) => {
        console.log('  [NormalHandler] 普通处理');
        return { priority: 'normal', data: req.data };
      }
    }
  );
  
  const conditionalChain = createChain('ConditionalChain')
    .use(conditionalHandler)
    .build();
  
  conditionalChain.execute({ type: 'TEST', data: { priority: 'high', value: 1 } });
  conditionalChain.execute({ type: 'TEST', data: { priority: 'low', value: 2 } });
  console.log();
  
  // 重试组合
  console.log('重试组合:');
  let attemptCount = 0;
  const flakyHandler: IHandler = {
    name: 'FlakyHandler',
    canHandle: () => true,
    handle: (req, next) => {
      attemptCount++;
      if (attemptCount < 3) {
        throw new Error(`失败 ${attemptCount}`);
      }
      console.log(`  [FlakyHandler] 第 ${attemptCount} 次尝试成功`);
      return { success: true, attempts: attemptCount };
    }
  };
  
  const retryHandler = HandlerCompositor.retry(flakyHandler, 5);
  const retryChain = createChain('RetryChain')
    .use(retryHandler)
    .build();
  
  const retryResult = retryChain.execute({ type: 'TEST', data: {} });
  console.log('重试结果:', JSON.stringify(retryResult, null, 2));
  console.log();
  
  // ============================================
  // 示例 4: 运行时动态修改链
  // ============================================
  console.log('4️⃣ 运行时动态修改 (Runtime Modification)');
  console.log('─'.repeat(50));
  
  const dynamicChain = createChain('DynamicChain')
    .use(new LoggingHandler())
    .use({
      name: 'InitialHandler',
      canHandle: () => true,
      handle: (req, next) => {
        console.log('  [InitialHandler] 初始处理器');
        return next();
      }
    })
    .build();
  
  console.log('初始处理器列表:');
  dynamicChain.getHandlers().forEach((h, i) => {
    console.log(`  ${i + 1}. ${h.name}`);
  });
  
  // 动态添加处理器
  const newHandler: IHandler = {
    name: 'DynamicHandler',
    canHandle: () => true,
    handle: (req, next) => {
      console.log('  [DynamicHandler] 动态添加的处理器');
      return next();
    }
  };
  
  dynamicChain.add(newHandler);
  
  console.log('\n添加处理器后:');
  dynamicChain.getHandlers().forEach((h, i) => {
    console.log(`  ${i + 1}. ${h.name}`);
  });
  
  console.log('\n执行动态链:');
  dynamicChain.execute({ type: 'TEST', data: {} });
  
  // 移除处理器
  dynamicChain.remove(newHandler);
  
  console.log('\n移除处理器后:');
  dynamicChain.getHandlers().forEach((h, i) => {
    console.log(`  ${i + 1}. ${h.name}`);
  });
  console.log();
  
  // ============================================
  // 示例 5: 短路模式
  // ============================================
  console.log('5️⃣ 短路模式 (Short Circuit)');
  console.log('─'.repeat(50));
  
  const shortCircuitChain = createChain('ShortCircuitChain')
    .withShortCircuit()
    .use(new LoggingHandler())
    .use({
      name: 'FastHandler',
      canHandle: (req) => req.data?.fast === true,
      handle: (req, next) => {
        console.log('  [FastHandler] 快速处理，短路返回');
        req.result = { fast: true };
        req.handled = true;
        return req.result;
      }
    })
    .use({
      name: 'SlowHandler',
      canHandle: () => true,
      handle: (req, next) => {
        console.log('  [SlowHandler] 慢速处理 (不应执行)');
        return { slow: true };
      }
    })
    .build();
  
  console.log('快速请求 (应短路):');
  shortCircuitChain.execute({ type: 'TEST', data: { fast: true } });
  
  console.log('\n普通请求 (应继续):');
  shortCircuitChain.execute({ type: 'TEST', data: { fast: false } });
  console.log();
  
  // ============================================
  // 总结
  // ============================================
  console.log('✅ 所有示例执行完成!');
  console.log();
  console.log('📋 功能总结:');
  console.log('  • 处理器链：BaseHandler, ChainOfResponsibility');
  console.log('  • 请求传递：IHandler.handle(request, next)');
  console.log('  • 动态组合：HandlerCompositor (serial/parallel/conditional/retry)');
  console.log('  • 链构建器：createChain().use().build()');
  console.log('  • 运行时修改：add/remove/clear/getHandlers');
  console.log();
  console.log('🎯 适用场景:');
  console.log('  • API 请求处理管道');
  console.log('  • 事件处理系统');
  console.log('  • 数据验证流水线');
  console.log('  • 中间件系统');
  console.log('  • 插件架构');
}
