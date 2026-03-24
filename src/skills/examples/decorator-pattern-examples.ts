/**
 * Decorator Pattern Skill - 使用示例
 * 
 * 本文件展示装饰器模式的三大核心功能:
 * 1. 功能装饰 - 为对象/函数添加新功能
 * 2. 链式装饰 - 多个装饰器组合使用
 * 3. 条件装饰 - 基于条件动态应用装饰器
 * 
 * @author Axon
 * @version 1.0.0
 */

import {
  DecoratorManager,
  FunctionDecoratorChain,
  ObjectDecorator,
  BaseFunctionDecorator,
  createLoggerDecorator,
  createCacheDecorator,
  createRetryDecorator,
  createValidateDecorator,
  PerformanceDecorator,
  PermissionDecorator,
  createConditionalDecorator,
  decorateObject,
  decorateFunction,
  decorateIf,
  Decorator,
  FunctionDecorator,
  Decoratable
} from '../decorator-pattern-skill';

// ============================================
// 场景 1: API 客户端增强
// ============================================

/**
 * 场景描述: 为 API 请求函数添加日志、缓存、重试功能
 */
export function scenario1_apiClientEnhancement() {
  console.log('\n=== 场景 1: API 客户端增强 ===\n');

  // 原始 API 调用函数
  const fetchUser = async (userId: string): Promise<{ id: string; name: string }> => {
    console.log(`  📡 Fetching user ${userId} from API...`);
    // 模拟网络延迟
    await new Promise(resolve => setTimeout(resolve, 100));
    return { id: userId, name: `User ${userId}` };
  };

  // 链式装饰：日志 -> 缓存 -> 重试
  const enhancedFetchUser = decorateFunction(
    fetchUser,
    createLoggerDecorator('API'),
    createCacheDecorator(new Map(), 'user-cache'),
    createRetryDecorator(3, 500, 'retry')
  );

  // 使用示例
  console.log('第一次调用 (缓存未命中):');
  enhancedFetchUser('user-001');

  console.log('\n第二次调用 (缓存命中):');
  enhancedFetchUser('user-001');

  console.log('\n调用新用户:');
  enhancedFetchUser('user-002');
}

// ============================================
// 场景 2: 表单验证装饰器
// ============================================

/**
 * 场景描述: 为表单提交函数添加验证、日志、错误处理
 */
export function scenario2_formValidation() {
  console.log('\n=== 场景 2: 表单验证装饰器 ===\n');

  interface FormData {
    email: string;
    password: string;
    age?: number;
  }

  // 原始提交函数
  const submitForm = (data: FormData): boolean => {
    console.log('  ✅ Form submitted:', data);
    return true;
  };

  // 创建验证装饰器
  const validateForm = createValidateDecorator<FormData[], boolean>(
    (data) => {
      const errors: string[] = [];

      if (!data[0]?.email?.includes('@')) {
        errors.push('Invalid email format');
      }

      if (!data[0]?.password || data[0].password.length < 6) {
        errors.push('Password must be at least 6 characters');
      }

      if (data[0]?.age && (data[0].age < 0 || data[0].age > 150)) {
        errors.push('Invalid age');
      }

      if (errors.length > 0) {
        return errors.join('; ');
      }

      return true;
    },
    'form-validator'
  );

  // 装饰后的提交函数
  const validatedSubmit = decorateFunction(
    submitForm,
    validateForm,
    createLoggerDecorator('form-logger')
  );

  // 测试有效数据
  console.log('测试 1: 有效数据');
  validatedSubmit({ email: 'test@example.com', password: '123456', age: 25 });

  // 测试无效数据
  console.log('\n测试 2: 无效数据 (邮箱格式错误)');
  try {
    validatedSubmit({ email: 'invalid-email', password: '123456' });
  } catch (error) {
    console.error('  ❌ Validation failed:', (error as Error).message);
  }

  console.log('\n测试 3: 无效数据 (密码太短)');
  try {
    validatedSubmit({ email: 'test@example.com', password: '123' });
  } catch (error) {
    console.error('  ❌ Validation failed:', (error as Error).message);
  }
}

// ============================================
// 场景 3: 权限控制系统
// ============================================

/**
 * 场景描述: 为管理操作添加基于角色的权限控制
 */
export function scenario3_permissionControl() {
  console.log('\n=== 场景 3: 权限控制系统 ===\n');

  class UserService {
    createUser(data: any): string {
      console.log('  Creating user:', data.name);
      return 'user-' + Date.now();
    }

    deleteUser(userId: string): boolean {
      console.log('  Deleting user:', userId);
      return true;
    }

    updateUser(userId: string, data: any): boolean {
      console.log('  Updating user:', userId, data);
      return true;
    }
  }

  // 模拟用户数据库
  const users = {
    admin: { id: '1', role: 'admin', permissions: ['user:create', 'user:delete', 'user:update'] },
    moderator: { id: '2', role: 'moderator', permissions: ['user:update'] },
    guest: { id: '3', role: 'guest', permissions: [] }
  };

  // 创建权限装饰器
  const permissionDecorator = new PermissionDecorator<UserService>(
    (user: any, permission: string) => {
      console.log(`    🔐 Checking permission: ${permission} for ${user.role}`);
      return user.permissions?.includes(permission);
    },
    'access-control'
  );

  // 配置权限要求
  permissionDecorator.require('createUser', 'user:create');
  permissionDecorator.require('deleteUser', 'user:delete');
  permissionDecorator.require('updateUser', 'user:update');

  // 应用装饰器
  const securedService = decorateObject(new UserService(), permissionDecorator);

  // 测试不同用户的权限
  console.log('测试 1: 管理员创建用户');
  (securedService as any).createUser({ name: 'New User' });

  console.log('\n测试 2: 普通用户尝试删除 (应被拒绝)');
  try {
    (securedService as any).deleteUser('user-123');
  } catch (error) {
    console.error('  🚫 Access denied:', (error as Error).message);
  }

  console.log('\n测试 3: 版主更新用户 (应成功)');
  (securedService as any).updateUser('user-456', { name: 'Updated' });
}

// ============================================
// 场景 4: 性能监控与分析
// ============================================

/**
 * 场景描述: 为关键业务方法添加性能监控
 */
export function scenario4_performanceMonitoring() {
  console.log('\n=== 场景 4: 性能监控与分析 ===\n');

  class DataProcessor {
    processData(data: any[]): any[] {
      // 模拟耗时处理
      const start = Date.now();
      while (Date.now() - start < 50) {}
      return data.map(item => ({ ...item, processed: true }));
    }

    validateData(data: any[]): boolean {
      const start = Date.now();
      while (Date.now() - start < 20) {}
      return data.length > 0;
    }

    saveData(data: any[]): boolean {
      const start = Date.now();
      while (Date.now() - start < 100) {}
      console.log('  💾 Data saved');
      return true;
    }
  }

  // 创建性能监控装饰器
  const perfMonitor = new PerformanceDecorator<DataProcessor>('perf-monitor');

  // 应用装饰器
  const monitoredProcessor = decorateObject(new DataProcessor(), perfMonitor);

  // 执行多次操作以收集性能数据
  console.log('执行性能测试...\n');

  for (let i = 0; i < 3; i++) {
    console.log(`\n--- 第 ${i + 1} 次迭代 ---`);
    const testData = [{ id: i }, { id: i + 1 }];
    
    monitoredProcessor.validateData(testData);
    monitoredProcessor.processData(testData);
    monitoredProcessor.saveData(testData);
  }

  // 获取性能统计 (需要访问装饰器实例)
  console.log('\n📊 性能统计需要通过装饰器实例获取');
}

// ============================================
// 场景 5: 条件装饰 - 环境感知功能
// ============================================

/**
 * 场景描述: 根据环境配置动态启用/禁用功能
 */
export function scenario5_conditionalEnvironment() {
  console.log('\n=== 场景 5: 条件装饰 - 环境感知功能 ===\n');

  // 模拟环境配置
  const config = {
    isDevelopment: true,
    isProduction: false,
    enableLogging: true,
    enableCache: true,
    enableMetrics: false
  };

  const businessLogic = (data: any): any => {
    console.log('  🔧 Executing business logic...');
    return { ...data, processed: true };
  };

  // 创建条件装饰器
  const loggingDecorator = createConditionalDecorator({
    condition: () => config.enableLogging,
    decorator: createLoggerDecorator('env-logger')
  });

  const cacheDecorator = createConditionalDecorator({
    condition: () => config.enableCache,
    decorator: createCacheDecorator(new Map(), 'env-cache')
  });

  // 使用 DecoratorManager 进行条件应用
  const manager = new DecoratorManager<typeof businessLogic>(businessLogic);

  // 根据条件注册装饰器
  if (config.enableLogging) {
    manager.register(loggingDecorator as Decorator<typeof businessLogic>);
  }

  if (config.enableCache) {
    manager.register(cacheDecorator as Decorator<typeof businessLogic>);
  }

  const decoratedFn = manager.applyAll().getResult();

  console.log('调用装饰后的函数:');
  decoratedFn({ id: 1, value: 'test' });

  console.log('\n已应用的装饰器:', manager.getAppliedDecorators());
}

// ============================================
// 场景 6: 自定义装饰器 - 限流器
// ============================================

/**
 * 场景描述: 创建自定义限流装饰器
 */
export function scenario6_customRateLimiter() {
  console.log('\n=== 场景 6: 自定义装饰器 - 限流器 ===\n');

  // 创建限流装饰器工厂
  function createRateLimiterDecorator<P extends any[] = any[], R = any>(
    maxCalls: number,
    windowMs: number,
    name: string = 'rate-limiter'
  ): FunctionDecorator<P, R> {
    const calls: number[] = [];

    return {
      name,
      apply: (fn) => (...args: P): R => {
        const now = Date.now();

        // 清理过期调用记录
        while (calls.length > 0 && calls[0] < now - windowMs) {
          calls.shift();
        }

        // 检查是否超过限制
        if (calls.length >= maxCalls) {
          const waitTime = Math.ceil((calls[0] + windowMs - now) / 1000);
          throw new Error(
            `[${name}] Rate limit exceeded. Try again in ${waitTime}s`
          );
        }

        calls.push(now);
        console.log(`  [${name}] Call ${calls.length}/${maxCalls} in window`);

        return fn(...args);
      }
    };
  }

  // 被限流的 API 函数
  const apiCall = (endpoint: string): string => {
    console.log(`  📡 Calling ${endpoint}`);
    return `Response from ${endpoint}`;
  };

  // 应用限流装饰器 (每秒最多 3 次调用)
  const rateLimitedApi = decorateFunction(
    apiCall,
    createRateLimiterDecorator(3, 1000, 'api-limiter')
  );

  // 测试限流
  console.log('快速调用 5 次 (限制为 3 次/秒):\n');

  for (let i = 1; i <= 5; i++) {
    try {
      console.log(`调用 ${i}:`);
      rateLimitedApi(`/api/endpoint-${i}`);
    } catch (error) {
      console.error(`  🚫 ${error}`);
    }
  }
}

// ============================================
// 场景 7: 装饰器组合 - 完整的数据管道
// ============================================

/**
 * 场景描述: 组合多个装饰器创建完整的数据处理管道
 */
export function scenario7_dataPipeline() {
  console.log('\n=== 场景 7: 装饰器组合 - 完整数据管道 ===\n');

  interface PipelineData {
    id: string;
    value: any;
    timestamp?: number;
    validated?: boolean;
    transformed?: any;
    processed?: boolean;
  }

  // 原始处理函数
  const processPipeline = (data: PipelineData): PipelineData => {
    console.log('  ⚙️  Processing:', data.id);
    return { ...data, processed: true };
  };

  // 创建验证装饰器
  const validateDecorator = createValidateDecorator<PipelineData[], PipelineData>(
    (data) => {
      if (!data[0]?.id) return 'ID is required';
      if (!data[0]?.value) return 'Value is required';
      return true;
    },
    'validator'
  );

  // 创建时间戳装饰器
  const timestampDecorator: FunctionDecorator<PipelineData[], PipelineData> = {
    name: 'timestamp',
    apply: (fn) => (...args) => {
      console.log('  🕐 Adding timestamp');
      const dataWithTimestamp = { ...args[0], timestamp: Date.now() };
      return fn({ ...args[0], timestamp: Date.now() });
    }
  };

  // 创建转换装饰器
  const transformDecorator: FunctionDecorator<PipelineData[], PipelineData> = {
    name: 'transform',
    apply: (fn) => (...args) => {
      console.log('  🔄 Transforming data');
      const transformed = { ...args[0], transformed: args[0].value.toUpperCase?.() || args[0].value };
      return fn(transformed);
    }
  };

  // 创建日志装饰器
  const loggerDecorator = createLoggerDecorator('pipeline');

  // 组合所有装饰器
  const fullPipeline = decorateFunction(
    processPipeline,
    validateDecorator,
    timestampDecorator,
    transformDecorator,
    loggerDecorator,
    createCacheDecorator(new Map(), 'pipeline-cache')
  );

  // 测试管道
  console.log('测试 1: 有效数据');
  fullPipeline({ id: 'pipe-001', value: 'hello world' });

  console.log('\n测试 2: 无效数据 (缺少 ID)');
  try {
    fullPipeline({ value: 'test' } as any);
  } catch (error) {
    console.error('  ❌ Pipeline error:', (error as Error).message);
  }

  console.log('\n测试 3: 缓存命中');
  fullPipeline({ id: 'pipe-001', value: 'hello world' });
}

// ============================================
// 场景 8: 对象装饰 - 可观察模式
// ============================================

/**
 * 场景描述: 为对象添加观察者模式功能
 */
export function scenario8_observablePattern() {
  console.log('\n=== 场景 8: 对象装饰 - 可观察模式 ===\n');

  // 创建观察者装饰器
  class ObservableDecorator<T extends object> extends ObjectDecorator<T> {
    private observers: Map<string, Set<(value: any) => void>> = new Map();

    constructor(name: string = 'observable') {
      super(name);
    }

    /**
     * 订阅属性变化
     */
    observe(property: string, callback: (value: any) => void): this {
      if (!this.observers.has(property)) {
        this.observers.set(property, new Set());
      }
      this.observers.get(property)!.add(callback);
      return this;
    }

    apply(target: T): T {
      const decorated = target as any;
      const self = this;

      Object.keys(decorated).forEach(key => {
        if (typeof decorated[key] === 'function') {
          const originalFn = decorated[key];

          decorated[key] = function (...args: any[]) {
            console.log(`  👁️  Method called: ${key}`, args);
            const result = originalFn.apply(this, args);

            // 通知观察者
            if (self.observers.has(key)) {
              self.observers.get(key)!.forEach(callback => callback(result));
            }

            return result;
          };
        }
      });

      return decorated;
    }
  }

  // 被装饰的服务类
  class CounterService {
    private count: number = 0;

    increment(): number {
      this.count++;
      console.log(`  Counter: ${this.count}`);
      return this.count;
    }

    decrement(): number {
      this.count--;
      console.log(`  Counter: ${this.count}`);
      return this.count;
    }

    reset(): number {
      this.count = 0;
      console.log(`  Counter: ${this.count}`);
      return this.count;
    }
  }

  // 创建可观察装饰器
  const observable = new ObservableDecorator<CounterService>('counter-observer');

  // 应用装饰器
  const observedCounter = decorateObject(new CounterService(), observable);

  // 订阅方法调用
  console.log('订阅 increment 方法:');
  observable.observe('increment', (value) => {
    console.log(`    📢 Observer notified: count is now ${value}`);
  });

  console.log('订阅 reset 方法:');
  observable.observe('reset', (value) => {
    console.log(`    📢 Observer notified: counter reset to ${value}`);
  });

  // 测试
  console.log('\n执行操作:');
  observedCounter.increment();
  observedCounter.increment();
  observedCounter.reset();
}

// ============================================
// 运行所有场景
// ============================================

/**
 * 运行所有示例场景
 */
export function runAllScenarios() {
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║     Decorator Pattern Skill - Complete Examples          ║');
  console.log('║     装饰器模式 - 完整使用示例                             ║');
  console.log('╚══════════════════════════════════════════════════════════╝');

  const scenarios = [
    scenario1_apiClientEnhancement,
    scenario2_formValidation,
    scenario3_permissionControl,
    scenario4_performanceMonitoring,
    scenario5_conditionalEnvironment,
    scenario6_customRateLimiter,
    scenario7_dataPipeline,
    scenario8_observablePattern
  ];

  scenarios.forEach((scenario, index) => {
    console.log(`\n${'─'.repeat(60)}`);
    scenario();
  });

  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║              All Scenarios Completed ✓                   ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');
}

// 导出所有场景
export default {
  runAllScenarios,
  scenario1_apiClientEnhancement,
  scenario2_formValidation,
  scenario3_permissionControl,
  scenario4_performanceMonitoring,
  scenario5_conditionalEnvironment,
  scenario6_customRateLimiter,
  scenario7_dataPipeline,
  scenario8_observablePattern
};

// 如果直接运行此文件
if (require.main === module) {
  runAllScenarios();
}
