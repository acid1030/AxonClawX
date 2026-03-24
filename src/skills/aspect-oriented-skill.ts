/**
 * 面向切面编程 (AOP) 技能 - KAEL
 * 
 * 提供 AOP 编程的核心实现：
 * 1. 切面定义 (Aspect Definition) - 定义横切关注点
 * 2. 通知类型 (Advice Types) - Before/After/Around/Throw
 * 3. 织入机制 (Weaving Mechanism) - 运行时动态织入
 * 
 * @author KAEL
 * @version 1.0.0
 * @since 2026-03-13
 */

// ============================================
// 类型定义
// ============================================

/**
 * 连接点 (Join Point)
 * 程序执行过程中的某个特定点 (如方法调用)
 */
export interface JoinPoint<TArgs extends any[] = any[], TReturn = any> {
  /** 目标对象 */
  target: any;
  /** 方法名 */
  methodName: string;
  /** 方法参数 */
  args: TArgs;
  /** 执行原始方法 */
  proceed: () => TReturn;
  /** 修改参数 */
  setArgs: (newArgs: TArgs) => void;
  /** 获取上下文数据 */
  context: Record<string, any>;
}

/**
 * 通知类型枚举
 */
export enum AdviceType {
  /** 前置通知 - 在方法执行前运行 */
  BEFORE = 'before',
  /** 后置通知 - 在方法执行后运行 (无论是否抛出异常) */
  AFTER = 'after',
  /** 返回通知 - 在方法成功返回后运行 */
  AFTER_RETURNING = 'afterReturning',
  /** 异常通知 - 在方法抛出异常后运行 */
  AFTER_THROWING = 'afterThrowing',
  /** 环绕通知 - 完全包围方法执行 */
  AROUND = 'around'
}

/**
 * 通知接口
 */
export interface Advice<TArgs extends any[] = any[], TReturn = any> {
  /** 通知类型 */
  type: AdviceType;
  /** 通知函数 */
  handler: (joinPoint: JoinPoint<TArgs, TReturn>) => TReturn | void | Promise<TReturn | void>;
  /** 优先级 (数字越小优先级越高) */
  priority?: number;
}

/**
 * 切点 (Pointcut)
 * 定义哪些连接点应该被拦截
 */
export interface Pointcut {
  /** 类名匹配模式 (支持通配符) */
  classPattern?: string;
  /** 方法名匹配模式 (支持通配符) */
  methodPattern?: string;
  /** 自定义匹配函数 */
  matcher?: (target: any, methodName: string) => boolean;
}

/**
 * 切面 (Aspect)
 * 封装横切关注点的模块
 */
export interface Aspect {
  /** 切面名称 */
  name: string;
  /** 切点定义 */
  pointcut: Pointcut;
  /** 通知列表 */
  advices: Advice[];
}

/**
 * AOP 代理配置
 */
export interface AopProxyConfig {
  /** 是否启用调试日志 */
  debug?: boolean;
  /** 默认超时时间 (ms) */
  timeout?: number;
}

/**
 * 织入器 (Weaver)
 * 负责将切面织入到目标对象
 */
export interface Weaver {
  /** 注册切面 */
  registerAspect: (aspect: Aspect) => void;
  /** 创建代理对象 */
  createProxy: <T extends object>(target: T) => T;
  /** 移除切面 */
  removeAspect: (name: string) => void;
  /** 获取所有注册的切面 */
  getAspects: () => Aspect[];
}

// ============================================
// 工具函数
// ============================================

/**
 * 检查字符串是否匹配通配符模式
 * 支持 * (匹配任意字符) 和 ** (匹配任意路径)
 */
function matchesPattern(value: string, pattern: string): boolean {
  if (pattern === '*') return true;
  if (pattern === '**') return true;
  
  // 转义特殊字符，然后替换通配符为正则
  const regexPattern = pattern
    .replace(/\./g, '\\.')
    .replace(/\*\*/g, '.*')
    .replace(/\*/g, '[^.]*');
  
  const regex = new RegExp(`^${regexPattern}$`);
  return regex.test(value);
}

/**
 * 检查目标是否匹配切点
 */
function matchesPointcut(target: any, methodName: string, pointcut: Pointcut): boolean {
  // 检查自定义匹配函数
  if (pointcut.matcher) {
    return pointcut.matcher(target, methodName);
  }
  
  // 检查类名匹配
  if (pointcut.classPattern) {
    const className = target.constructor?.name || target.constructor?.name || 'Object';
    if (!matchesPattern(className, pointcut.classPattern)) {
      return false;
    }
  }
  
  // 检查方法名匹配
  if (pointcut.methodPattern) {
    if (!matchesPattern(methodName, pointcut.methodPattern)) {
      return false;
    }
  }
  
  return true;
}

// ============================================
// 1. 切面定义 (Aspect Definition)
// ============================================

/**
 * 创建切面
 * 
 * @param name - 切面名称
 * @param pointcut - 切点定义
 * @param advices - 通知列表
 * @returns 切面对象
 * 
 * @example
 * const loggingAspect = createAspect('Logging', {
 *   methodPattern: '*'
 * }, [
 *   {
 *     type: AdviceType.BEFORE,
 *     handler: (jp) => console.log(`Calling ${jp.methodName}`)
 *   },
 *   {
 *     type: AdviceType.AFTER_RETURNING,
 *     handler: (jp) => console.log(`${jp.methodName} completed`)
 *   }
 * ]);
 */
export function createAspect(
  name: string,
  pointcut: Pointcut,
  advices: Advice[]
): Aspect {
  return {
    name,
    pointcut,
    advices: advices.sort((a, b) => (a.priority ?? 100) - (b.priority ?? 100))
  };
}

/**
 * 创建前置通知
 */
export function beforeAdvice<TArgs extends any[] = any[]>(
  handler: (joinPoint: JoinPoint<TArgs>) => void | Promise<void>,
  priority?: number
): Advice<TArgs> {
  return {
    type: AdviceType.BEFORE,
    handler: handler as any,
    priority
  };
}

/**
 * 创建后置通知
 */
export function afterAdvice<TArgs extends any[] = any[], TReturn = any>(
  handler: (joinPoint: JoinPoint<TArgs, TReturn>) => void | Promise<void>,
  priority?: number
): Advice<TArgs, TReturn> {
  return {
    type: AdviceType.AFTER,
    handler: handler as any,
    priority
  };
}

/**
 * 创建返回通知
 */
export function afterReturningAdvice<TArgs extends any[] = any[], TReturn = any>(
  handler: (joinPoint: JoinPoint<TArgs, TReturn>, result: TReturn) => void | Promise<void>,
  priority?: number
): Advice<TArgs, TReturn> {
  return {
    type: AdviceType.AFTER_RETURNING,
    handler: ((jp: JoinPoint<TArgs, TReturn>) => {
      const result = jp.context.__result;
      return (handler as any)(jp, result);
    }) as any,
    priority
  };
}

/**
 * 创建异常通知
 */
export function afterThrowingAdvice<TArgs extends any[] = any[]>(
  handler: (joinPoint: JoinPoint<TArgs>, error: any) => void | Promise<void>,
  priority?: number
): Advice<TArgs> {
  return {
    type: AdviceType.AFTER_THROWING,
    handler: ((jp: JoinPoint<TArgs>) => {
      const error = jp.context.__error;
      return (handler as any)(jp, error);
    }) as any,
    priority
  };
}

/**
 * 创建环绕通知
 */
export function aroundAdvice<TArgs extends any[] = any[], TReturn = any>(
  handler: (joinPoint: JoinPoint<TArgs, TReturn>) => TReturn | Promise<TReturn>,
  priority?: number
): Advice<TArgs, TReturn> {
  return {
    type: AdviceType.AROUND,
    handler: handler as any,
    priority
  };
}

// ============================================
// 2. 通知类型实现 (Advice Types Implementation)
// ============================================

/**
 * 执行通知链
 */
async function executeAdviceChain<TArgs extends any[], TReturn>(
  joinPoint: JoinPoint<TArgs, TReturn>,
  advices: Advice<TArgs, TReturn>[],
  originalMethod: () => TReturn
): Promise<TReturn> {
  const { type } = advices[0] || { type: null };
  
  // 分离不同类型的通知
  const beforeAdvices = advices.filter(a => a.type === AdviceType.BEFORE);
  const aroundAdvices = advices.filter(a => a.type === AdviceType.AROUND);
  const afterAdvices = advices.filter(a => a.type === AdviceType.AFTER);
  const afterReturningAdvices = advices.filter(a => a.type === AdviceType.AFTER_RETURNING);
  const afterThrowingAdvices = advices.filter(a => a.type === AdviceType.AFTER_THROWING);
  
  let result: TReturn;
  
  try {
    // 执行前置通知
    for (const advice of beforeAdvices) {
      await Promise.resolve(advice.handler(joinPoint));
    }
    
    // 执行环绕通知 (嵌套执行)
    if (aroundAdvices.length > 0) {
      result = await executeAroundChain(joinPoint, aroundAdvices, originalMethod) as any;
    } else {
      result = originalMethod();
    }
    
    // 存储结果供返回通知使用
    joinPoint.context.__result = result;
    
    // 执行返回通知
    for (const advice of afterReturningAdvices) {
      await Promise.resolve(advice.handler(joinPoint));
    }
    
    return result;
  } catch (error) {
    // 存储错误供异常通知使用
    joinPoint.context.__error = error;
    
    // 执行异常通知
    for (const advice of afterThrowingAdvices) {
      await Promise.resolve(advice.handler(joinPoint));
    }
    
    throw error;
  } finally {
    // 执行后置通知 (无论是否抛出异常)
    for (const advice of afterAdvices) {
      await Promise.resolve(advice.handler(joinPoint));
    }
  }
}

/**
 * 执行环绕通知链
 */
async function executeAroundChain<TArgs extends any[], TReturn>(
  joinPoint: JoinPoint<TArgs, TReturn>,
  aroundAdvices: Advice<TArgs, TReturn>[],
  originalMethod: () => TReturn,
  index: number = 0
): Promise<TReturn> {
  if (index >= aroundAdvices.length) {
    return originalMethod();
  }
  
  const currentAdvice = aroundAdvices[index];
  let proceedCalled = false;
  let proceedResult: TReturn | undefined;
  
  // 创建增强的连接点
  const enhancedJoinPoint: JoinPoint<TArgs, TReturn> = {
    ...joinPoint,
    proceed: () => {
      if (proceedCalled) {
        throw new Error('proceed() can only be called once per around advice');
      }
      proceedCalled = true;
      // 类型断言：我们知道 proceedResult 会在返回前被赋值
      proceedResult = executeAroundChain(joinPoint, aroundAdvices, originalMethod, index + 1) as any;
      return proceedResult as TReturn;
    }
  };
  
  const result = await Promise.resolve(currentAdvice.handler(enhancedJoinPoint));
  
  // 如果没有调用 proceed，返回当前结果
  if (!proceedCalled) {
    return result as TReturn;
  }
  
  return proceedResult as TReturn;
}

// ============================================
// 3. 织入机制 (Weaving Mechanism)
// ============================================

/**
 * 创建 AOP 织入器
 * 
 * @param config - 配置选项
 * @returns 织入器实例
 * 
 * @example
 * const weaver = createWeaver({ debug: true });
 * 
 * // 注册切面
 * weaver.registerAspect(loggingAspect);
 * weaver.registerAspect(performanceAspect);
 * 
 * // 创建代理对象
 * const service = new UserService();
 * const proxiedService = weaver.createProxy(service);
 * 
 * // 现在调用方法会自动应用切面
 * proxiedService.getUser(123);
 */
export function createWeaver(config: AopProxyConfig = {}): Weaver {
  const { debug = false, timeout = 30000 } = config;
  const aspects: Aspect[] = [];
  
  const weaver: Weaver = {
    registerAspect(aspect: Aspect) {
      if (debug) {
        console.log(`[AOP Weaver] Registered aspect: ${aspect.name}`);
      }
      aspects.push(aspect);
    },
    
    removeAspect(name: string) {
      const index = aspects.findIndex(a => a.name === name);
      if (index !== -1) {
        aspects.splice(index, 1);
        if (debug) {
          console.log(`[AOP Weaver] Removed aspect: ${name}`);
        }
      }
    },
    
    getAspects() {
      return [...aspects];
    },
    
    createProxy<T extends object>(target: T): T {
      if (debug) {
        console.log(`[AOP Weaver] Creating proxy for: ${(target as any).constructor?.name || 'Object'}`);
      }
      
      // 创建代理对象
      const proxy = {} as T;
      
      // 获取目标对象的所有方法
      const methodNames = Object.getOwnPropertyNames(Object.getPrototypeOf(target))
        .filter(name => {
          const descriptor = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(target), name);
          return typeof (target as any)[name] === 'function' && 
                 name !== 'constructor' &&
                 descriptor?.writable !== false;
        });
      
      // 为每个方法创建代理
      for (const methodName of methodNames) {
        const originalMethod = (target as any)[methodName].bind(target);
        
        // 查找匹配的切面
        const matchingAdvices: Advice[] = [];
        for (const aspect of aspects) {
          if (matchesPointcut(target, methodName, aspect.pointcut)) {
            matchingAdvices.push(...aspect.advices);
          }
        }
        
        if (matchingAdvices.length === 0) {
          // 没有匹配的切面，直接使用原方法
          (proxy as any)[methodName] = originalMethod;
        } else {
          // 有匹配的切面，创建代理方法
          (proxy as any)[methodName] = async (...args: any[]) => {
            const context: Record<string, any> = {};
            
            const joinPoint: JoinPoint = {
              target,
              methodName,
              args,
              proceed: () => originalMethod(...args),
              setArgs: (newArgs) => {
                args = newArgs;
              },
              context
            };
            
            if (debug) {
              console.log(`[AOP] Executing: ${methodName} with ${args.length} args`);
              console.log(`[AOP] Matched ${matchingAdvices.length} advices`);
            }
            
            // 创建带超时的 Promise
            const executeWithTimeout = Promise.race([
              executeAdviceChain(joinPoint, matchingAdvices, () => originalMethod(...args)),
              new Promise((_, reject) => 
                setTimeout(() => reject(new Error(`AOP timeout for ${methodName}`)), timeout)
              )
            ]);
            
            return executeWithTimeout;
          };
        }
      }
      
      // 复制非方法属性
      for (const key of Object.keys(target as object)) {
        if (typeof (target as any)[key] !== 'function') {
          (proxy as any)[key] = (target as any)[key];
        }
      }
      
      return proxy;
    }
  };
  
  return weaver;
}

// ============================================
// 内置切面
// ============================================

/**
 * 日志切面
 * 自动记录方法调用和结果
 */
export function createLoggingAspect(options: {
  classPattern?: string;
  methodPattern?: string;
  logArgs?: boolean;
  logResult?: boolean;
} = {}): Aspect {
  const {
    classPattern = '*',
    methodPattern = '*',
    logArgs = true,
    logResult = true
  } = options;
  
  return createAspect('Logging', {
    classPattern,
    methodPattern
  }, [
    beforeAdvice((jp) => {
      const argsStr = logArgs ? JSON.stringify(jp.args) : '[args hidden]';
      console.log(`[LOG] → ${jp.methodName}(${argsStr})`);
    }),
    
    afterReturningAdvice((jp, result) => {
      const resultStr = logResult ? JSON.stringify(result) : '[result hidden]';
      console.log(`[LOG] ← ${jp.methodName} returned: ${resultStr}`);
    }, 1),
    
    afterThrowingAdvice((jp, error) => {
      console.error(`[LOG] ✗ ${jp.methodName} threw:`, error);
    }, 1),
    
    afterAdvice((jp) => {
      console.log(`[LOG] • ${jp.methodName} completed`);
    })
  ]);
}

/**
 * 性能监控切面
 * 记录方法执行时间
 */
export function createPerformanceAspect(options: {
  classPattern?: string;
  methodPattern?: string;
  threshold?: number; // ms
} = {}): Aspect {
  const {
    classPattern = '*',
    methodPattern = '*',
    threshold = 100
  } = options;
  
  return createAspect('Performance', {
    classPattern,
    methodPattern
  }, [
    aroundAdvice(async (jp) => {
      const startTime = performance.now();
      try {
        const result = await jp.proceed();
        const duration = performance.now() - startTime;
        
        if (duration > threshold) {
          console.warn(`[PERF] ⚠ ${jp.methodName} took ${duration.toFixed(2)}ms (threshold: ${threshold}ms)`);
        } else {
          console.log(`[PERF] ✓ ${jp.methodName} completed in ${duration.toFixed(2)}ms`);
        }
        
        return result;
      } catch (error) {
        const duration = performance.now() - startTime;
        console.error(`[PERF] ✗ ${jp.methodName} failed after ${duration.toFixed(2)}ms`);
        throw error;
      }
    })
  ]);
}

/**
 * 缓存切面
 * 自动缓存方法返回结果
 */
export function createCacheAspect(options: {
  classPattern?: string;
  methodPattern?: string;
  ttl?: number; // ms
  cacheKeyFn?: (jp: JoinPoint) => string;
} = {}): Aspect {
  const {
    classPattern = '*',
    methodPattern = '*',
    ttl = 60000,
    cacheKeyFn
  } = options;
  
  const cache = new Map<string, { value: any; expiry: number }>();
  
  return createAspect('Cache', {
    classPattern,
    methodPattern
  }, [
    aroundAdvice(async (jp) => {
      const cacheKey = cacheKeyFn 
        ? cacheKeyFn(jp)
        : `${jp.target.constructor?.name || 'Object'}:${jp.methodName}:${JSON.stringify(jp.args)}`;
      
      // 检查缓存
      const cached = cache.get(cacheKey);
      if (cached && cached.expiry > Date.now()) {
        console.log(`[CACHE] ⚡ ${jp.methodName} hit cache`);
        return cached.value;
      }
      
      // 执行原方法
      const result = await jp.proceed();
      
      // 存储缓存
      cache.set(cacheKey, {
        value: result,
        expiry: Date.now() + ttl
      });
      
      console.log(`[CACHE] 💾 ${jp.methodName} cached (TTL: ${ttl}ms)`);
      return result;
    })
  ]);
}

/**
 * 事务切面
 * 自动处理方法事务
 */
export function createTransactionAspect(options: {
  classPattern?: string;
  methodPattern?: string;
  beginTransaction?: () => Promise<void>;
  commitTransaction?: () => Promise<void>;
  rollbackTransaction?: () => Promise<void>;
} = {}): Aspect {
  const {
    classPattern = '*',
    methodPattern = '*',
    beginTransaction = async () => {},
    commitTransaction = async () => {},
    rollbackTransaction = async () => {}
  } = options;
  
  return createAspect('Transaction', {
    classPattern,
    methodPattern
  }, [
    aroundAdvice(async (jp) => {
      await beginTransaction();
      console.log(`[TX] BEGIN transaction for ${jp.methodName}`);
      
      try {
        const result = await jp.proceed();
        await commitTransaction();
        console.log(`[TX] COMMIT transaction for ${jp.methodName}`);
        return result;
      } catch (error) {
        await rollbackTransaction();
        console.error(`[TX] ROLLBACK transaction for ${jp.methodName}`);
        throw error;
      }
    })
  ]);
}

/**
 * 权限验证切面
 * 在方法执行前验证权限
 */
export function createAuthAspect(options: {
  classPattern?: string;
  methodPattern?: string;
  checkPermission?: (jp: JoinPoint) => Promise<boolean>;
  onUnauthorized?: (jp: JoinPoint) => never;
} = {}): Aspect {
  const {
    classPattern = '*',
    methodPattern = '*',
    checkPermission = async () => true,
    onUnauthorized = () => { throw new Error('Unauthorized'); }
  } = options;
  
  return createAspect('Auth', {
    classPattern,
    methodPattern
  }, [
    beforeAdvice(async (jp) => {
      const hasPermission = await checkPermission(jp);
      if (!hasPermission) {
        console.error(`[AUTH] ✗ Access denied to ${jp.methodName}`);
        onUnauthorized(jp);
      }
      console.log(`[AUTH] ✓ Access granted to ${jp.methodName}`);
    }, 0) // 高优先级，最先执行
  ]);
}

// ============================================
// 使用示例 (命令行执行)
// ============================================

async function runExamples() {
  console.log('=== 面向切面编程 (AOP) 技能 - 使用示例 ===\n');
  
  // ============================================
  // 示例类：用户服务
  // ============================================
  class UserService {
    private users = new Map<number, { id: number; name: string; email: string }>([
      [1, { id: 1, name: 'Alice', email: 'alice@example.com' }],
      [2, { id: 2, name: 'Bob', email: 'bob@example.com' }]
    ]);
    
    getUser(id: number) {
      console.log(`  [UserService] Fetching user ${id}...`);
      const user = this.users.get(id);
      if (!user) {
        throw new Error(`User ${id} not found`);
      }
      return user;
    }
    
    createUser(name: string, email: string) {
      console.log(`  [UserService] Creating user: ${name} (${email})...`);
      const id = this.users.size + 1;
      const user = { id, name, email };
      this.users.set(id, user);
      return user;
    }
    
    deleteUser(id: number) {
      console.log(`  [UserService] Deleting user ${id}...`);
      const deleted = this.users.delete(id);
      if (!deleted) {
        throw new Error(`User ${id} not found`);
      }
      return { success: true };
    }
    
    slowMethod() {
      console.log(`  [UserService] Executing slow method...`);
      const start = Date.now();
      while (Date.now() - start < 150) {
        // 模拟耗时操作
      }
      return 'done';
    }
  }
  
  // ============================================
  // 示例 1: 日志切面
  // ============================================
  console.log('1️⃣ 日志切面 (Logging Aspect)');
  console.log('─'.repeat(60));
  
  const weaver1 = createWeaver({ debug: true });
  weaver1.registerAspect(createLoggingAspect({
    methodPattern: 'get*',
    logArgs: true,
    logResult: true
  }));
  
  const userService1 = weaver1.createProxy(new UserService());
  
  console.log('\n调用 getUser(1):');
  (userService1 as any).getUser(1);
  console.log();
  
  // ============================================
  // 示例 2: 性能监控切面
  // ============================================
  console.log('\n2️⃣ 性能监控切面 (Performance Aspect)');
  console.log('─'.repeat(60));
  
  const weaver2 = createWeaver();
  weaver2.registerAspect(createPerformanceAspect({
    methodPattern: '*',
    threshold: 100
  }));
  
  const userService2 = weaver2.createProxy(new UserService());
  
  console.log('\n调用 slowMethod (应该超过阈值):');
  (userService2 as any).slowMethod();
  console.log();
  
  // ============================================
  // 示例 3: 组合多个切面
  // ============================================
  console.log('\n3️⃣ 组合多个切面 (Multiple Aspects)');
  console.log('─'.repeat(60));
  
  const weaver3 = createWeaver({ debug: true });
  
  // 注册多个切面
  weaver3.registerAspect(createLoggingAspect({ methodPattern: '*' }));
  weaver3.registerAspect(createPerformanceAspect({ threshold: 50 }));
  
  const userService3 = weaver3.createProxy(new UserService());
  
  console.log('\n调用 createUser (应用日志 + 性能切面):');
  (userService3 as any).createUser('Charlie', 'charlie@example.com');
  console.log();
  
  // ============================================
  // 示例 4: 自定义切面
  // ============================================
  console.log('\n4️⃣ 自定义切面 (Custom Aspect)');
  console.log('─'.repeat(60));
  
  const validationAspect = createAspect('Validation', {
    methodPattern: 'create*'
  }, [
    beforeAdvice((jp) => {
      const [name, email] = jp.args;
      if (!name || typeof name !== 'string' || name.length < 2) {
        throw new Error('Invalid name');
      }
      if (!email || !email.includes('@')) {
        throw new Error('Invalid email');
      }
      console.log(`  [Validation] ✓ Parameters validated`);
    }, 0)
  ]);
  
  const weaver4 = createWeaver();
  weaver4.registerAspect(validationAspect);
  
  const userService4 = weaver4.createProxy(new UserService());
  
  console.log('\n调用 createUser (带验证):');
  try {
    (userService4 as any).createUser('David', 'david@example.com');
  } catch (e: any) {
    console.log(`  [Error] ${e.message}`);
  }
  console.log();
  
  // ============================================
  // 示例 5: 环绕通知修改参数
  // ============================================
  console.log('\n5️⃣ 环绕通知修改参数 (Around Advice)');
  console.log('─'.repeat(60));
  
  const transformAspect = createAspect('Transform', {
    methodPattern: 'getUser'
  }, [
    aroundAdvice(async (jp) => {
      console.log(`  [Transform] Before: id = ${jp.args[0]}`);
      // 可以修改参数
      jp.setArgs([jp.args[0]]); // 这里可以做参数转换
      const result = await jp.proceed();
      // 可以修改返回值
      const transformed = { ...result, transformed: true };
      console.log(`  [Transform] After: added 'transformed' flag`);
      return transformed;
    })
  ]);
  
  const weaver5 = createWeaver();
  weaver5.registerAspect(transformAspect);
  
  const userService5 = weaver5.createProxy(new UserService());
  
  console.log('\n调用 getUser(1) (带转换):');
  const user = (userService5 as any).getUser(1);
  console.log('  Result:', JSON.stringify(user, null, 2));
  console.log();
  
  // ============================================
  // 示例 6: 异常处理切面
  // ============================================
  console.log('\n6️⃣ 异常处理切面 (Error Handling Aspect)');
  console.log('─'.repeat(60));
  
  const errorHandlingAspect = createAspect('ErrorHandling', {
    methodPattern: 'delete*'
  }, [
    afterThrowingAdvice((jp, error) => {
      console.error(`  [ErrorHandler] Caught error in ${jp.methodName}: ${error.message}`);
      console.error(`  [ErrorHandler] Arguments were:`, jp.args);
      // 可以在这里记录日志、发送告警等
    }, 0)
  ]);
  
  const weaver6 = createWeaver();
  weaver6.registerAspect(errorHandlingAspect);
  
  const userService6 = weaver6.createProxy(new UserService());
  
  console.log('\n调用 deleteUser(999) (不存在的用户):');
  (userService6 as any).deleteUser(999).catch((e: any) => {
    console.log(`  [Caught] ${e.message}`);
  });
  console.log();
  
  // ============================================
  // 总结
  // ============================================
  console.log('\n✅ 所有示例执行完成!');
  console.log();
  console.log('📋 AOP 核心功能:');
  console.log('  • 切面定义：createAspect, createLoggingAspect, createPerformanceAspect, ...');
  console.log('  • 通知类型：beforeAdvice, afterAdvice, aroundAdvice, afterReturningAdvice, afterThrowingAdvice');
  console.log('  • 织入机制：createWeaver, registerAspect, createProxy');
  console.log();
  console.log('🎯 适用场景:');
  console.log('  • 日志记录');
  console.log('  • 性能监控');
  console.log('  • 事务管理');
  console.log('  • 权限验证');
  console.log('  • 缓存处理');
  console.log('  • 异常处理');
  console.log('  • 参数验证');
  console.log('  • 数据转换');
}

if (require.main === module) {
  runExamples().catch(console.error);
}
