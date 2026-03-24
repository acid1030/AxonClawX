/**
 * 钩子系统技能 - Hook System Skill - KAEL
 * 
 * 功能:
 * 1. 钩子注册 - 支持同步/异步钩子，带优先级
 * 2. 钩子触发 - 顺序执行，支持中断
 * 3. 钩子优先级 - 数字越大优先级越高
 * 
 * @author Axon/KAEL
 * @version 1.0.0
 */

// ============== 类型定义 ==============

/**
 * 钩子处理函数类型
 */
export type HookHandler<T = any, R = any> = (data: T, context: HookContext) => R | Promise<R>;

/**
 * 钩子上下文
 */
export interface HookContext {
  /** 钩子名称 */
  hookName: string;
  /** 执行时间戳 */
  timestamp: number;
  /** 当前执行的钩子索引 */
  currentIndex: number;
  /** 总钩子数 */
  totalHooks: number;
  /** 是否应该中断执行 */
  shouldAbort: boolean;
  /** 自定义元数据 */
  meta?: Record<string, any>;
}

/**
 * 钩子注册选项
 */
export interface HookOptions {
  /** 优先级 (数字越大越先执行，默认 0) */
  priority?: number;
  /** 钩子描述 */
  description?: string;
  /** 是否只执行一次 */
  once?: boolean;
  /** 钩子超时时间 (毫秒) */
  timeout?: number;
  /** 是否允许中断后续钩子 */
  canAbort?: boolean;
}

/**
 * 钩子信息
 */
export interface HookInfo {
  /** 钩子 ID */
  id: string;
  /** 钩子名称 */
  name: string;
  /** 优先级 */
  priority: number;
  /** 描述 */
  description?: string;
  /** 是否只执行一次 */
  once: boolean;
  /** 已执行次数 */
  executedCount: number;
  /** 注册时问 */
  registeredAt: number;
}

/**
 * 钩子执行结果
 */
export interface HookExecutionResult<T = any> {
  /** 是否成功 */
  success: boolean;
  /** 最终数据 */
  data: T;
  /** 所有钩子的返回值 */
  results: any[];
  /** 执行时间 (毫秒) */
  executionTime: number;
  /** 是否被中断 */
  aborted: boolean;
  /** 错误信息 (如果有) */
  error?: string;
}

/**
 * 钩子执行统计
 */
export interface HookStats {
  /** 总钩子数 */
  totalHooks: number;
  /** 总注册钩子 ID 数 */
  totalRegisteredHooks: number;
  /** 总执行次数 */
  totalExecutions: number;
  /** 各钩子的执行次数 */
  executionMap: Record<string, number>;
}

interface RegisteredHook {
  id: string;
  name: string;
  handler: HookHandler;
  priority: number;
  description?: string;
  once: boolean;
  timeout?: number;
  canAbort: boolean;
  executedCount: number;
  registeredAt: number;
  executed: boolean; // 用于 once 钩子
}

// ============== 钩子系统实现 ==============

/**
 * 钩子系统类
 */
export class HookSystem {
  private hooks: Map<string, RegisteredHook[]> = new Map();
  private stats: HookStats = {
    totalHooks: 0,
    totalRegisteredHooks: 0,
    totalExecutions: 0,
    executionMap: {},
  };
  private hookIdCounter: number = 0;

  /**
   * 注册钩子
   * @param hookName 钩子名称
   * @param handler 钩子处理函数
   * @param options 钩子选项
   * @returns 钩子 ID (用于取消注册)
   */
  register<T = any, R = any>(
    hookName: string,
    handler: HookHandler<T, R>,
    options: HookOptions = {}
  ): string {
    const hookId = `hook_${++this.hookIdCounter}_${Date.now()}`;
    
    const registeredHook: RegisteredHook = {
      id: hookId,
      name: hookName,
      handler,
      priority: options.priority ?? 0,
      description: options.description,
      once: options.once ?? false,
      timeout: options.timeout,
      canAbort: options.canAbort ?? false,
      executedCount: 0,
      registeredAt: Date.now(),
      executed: false,
    };

    if (!this.hooks.has(hookName)) {
      this.hooks.set(hookName, []);
      this.stats.totalHooks++;
    }

    const hookList = this.hooks.get(hookName)!;
    hookList.push(registeredHook);
    // 按优先级降序排序 (优先级高的先执行)
    hookList.sort((a, b) => b.priority - a.priority);
    
    this.stats.totalRegisteredHooks++;
    this.stats.executionMap[hookName] = (this.stats.executionMap[hookName] || 0) + 1;

    return hookId;
  }

  /**
   * 取消注册钩子
   * @param hookName 钩子名称
   * @param hookId 钩子 ID (不传则取消该钩子名称下的所有钩子)
   */
  unregister(hookName: string, hookId?: string): void {
    if (!this.hooks.has(hookName)) {
      return;
    }

    const hookList = this.hooks.get(hookName)!;
    
    if (hookId) {
      const index = hookList.findIndex(h => h.id === hookId);
      if (index !== -1) {
        hookList.splice(index, 1);
        this.stats.totalRegisteredHooks--;
      }
    } else {
      this.stats.totalRegisteredHooks -= hookList.length;
      hookList.length = 0;
    }

    if (hookList.length === 0) {
      this.hooks.delete(hookName);
      this.stats.totalHooks--;
      delete this.stats.executionMap[hookName];
    }
  }

  /**
   * 触发钩子
   * @param hookName 钩子名称
   * @param data 初始数据
   * @param context 上下文元数据
   * @returns 执行结果
   */
  async execute<T = any>(
    hookName: string,
    data: T,
    context: { meta?: Record<string, any> } = {}
  ): Promise<HookExecutionResult<T>> {
    const startTime = Date.now();
    const hookList = this.hooks.get(hookName) || [];
    const results: any[] = [];
    let currentData = data;
    let aborted = false;
    let error: string | undefined;

    this.stats.totalExecutions++;

    const hookContext: HookContext = {
      hookName,
      timestamp: startTime,
      currentIndex: 0,
      totalHooks: hookList.length,
      shouldAbort: false,
      meta: context.meta,
    };

    try {
      for (let i = 0; i < hookList.length; i++) {
        const hook = hookList[i];
        
        // 跳过已执行的 once 钩子
        if (hook.once && hook.executed) {
          continue;
        }

        hookContext.currentIndex = i;

        // 检查是否应该中断
        if (hookContext.shouldAbort) {
          aborted = true;
          break;
        }

        const executeHook = async () => {
          const result = await hook.handler(currentData, hookContext);
          if (result !== undefined && result !== null) {
            currentData = result;
          }
          return result;
        };

        let result: any;
        if (hook.timeout) {
          result = await Promise.race([
            executeHook(),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error(`Hook timeout after ${hook.timeout}ms`)), hook.timeout)
            ),
          ]);
        } else {
          result = await executeHook();
        }

        results.push(result);
        hook.executedCount++;
        hook.executed = true;

        // 检查是否需要中断
        if (hook.canAbort && hookContext.shouldAbort) {
          aborted = true;
          break;
        }
      }
    } catch (err: any) {
      error = err.message || String(err);
      console.error(`[HookSystem] Error executing hook "${hookName}":`, err);
    }

    // 清理 once 钩子
    this.cleanupOnceHooks(hookName);

    const executionTime = Date.now() - startTime;

    return {
      success: !error,
      data: currentData,
      results,
      executionTime,
      aborted,
      error,
    };
  }

  /**
   * 同步触发钩子 (不等待异步处理)
   * @param hookName 钩子名称
   * @param data 初始数据
   * @param context 上下文元数据
   */
  executeSync<T = any>(
    hookName: string,
    data: T,
    context: { meta?: Record<string, any> } = {}
  ): HookExecutionResult<T> {
    const startTime = Date.now();
    const hookList = this.hooks.get(hookName) || [];
    const results: any[] = [];
    let currentData = data;
    let aborted = false;
    let error: string | undefined;

    this.stats.totalExecutions++;

    const hookContext: HookContext = {
      hookName,
      timestamp: startTime,
      currentIndex: 0,
      totalHooks: hookList.length,
      shouldAbort: false,
      meta: context.meta,
    };

    try {
      for (let i = 0; i < hookList.length; i++) {
        const hook = hookList[i];
        
        if (hook.once && hook.executed) {
          continue;
        }

        hookContext.currentIndex = i;

        if (hookContext.shouldAbort) {
          aborted = true;
          break;
        }

        try {
          const result = hook.handler(currentData, hookContext);
          if (result instanceof Promise) {
            console.warn(`[HookSystem] Sync execute called but handler is async for "${hookName}"`);
          }
          if (result !== undefined && result !== null) {
            currentData = result;
          }
          results.push(result);
          hook.executedCount++;
          hook.executed = true;

          if (hook.canAbort && hookContext.shouldAbort) {
            aborted = true;
            break;
          }
        } catch (err: any) {
          error = err.message || String(err);
          console.error(`[HookSystem] Error in sync hook "${hookName}":`, err);
          break;
        }
      }
    } catch (err: any) {
      error = err.message || String(err);
    }

    this.cleanupOnceHooks(hookName);
    const executionTime = Date.now() - startTime;

    return {
      success: !error,
      data: currentData,
      results,
      executionTime,
      aborted,
      error,
    };
  }

  /**
   * 获取指定钩子名称的所有钩子信息
   */
  getHooks(hookName: string): HookInfo[] {
    const hookList = this.hooks.get(hookName) || [];
    return hookList.map(hook => ({
      id: hook.id,
      name: hook.name,
      priority: hook.priority,
      description: hook.description,
      once: hook.once,
      executedCount: hook.executedCount,
      registeredAt: hook.registeredAt,
    }));
  }

  /**
   * 获取所有钩子名称
   */
  getHookNames(): string[] {
    return Array.from(this.hooks.keys());
  }

  /**
   * 获取钩子数量
   */
  getHookCount(hookName?: string): number {
    if (hookName) {
      return this.hooks.get(hookName)?.length || 0;
    }
    return this.stats.totalHooks;
  }

  /**
   * 获取统计信息
   */
  getStats(): HookStats {
    return { ...this.stats };
  }

  /**
   * 清空所有钩子
   */
  clear(): void {
    this.hooks.clear();
    this.stats = {
      totalHooks: 0,
      totalRegisteredHooks: 0,
      totalExecutions: 0,
      executionMap: {},
    };
  }

  /**
   * 中断钩子执行 (在钩子处理函数中调用 context.abort())
   */
  abort(context: HookContext): void {
    context.shouldAbort = true;
  }

  // ============== 私有方法 ==============

  /**
   * 清理 once 钩子
   */
  private cleanupOnceHooks(hookName: string): void {
    const hookList = this.hooks.get(hookName);
    if (!hookList) return;

    const beforeCount = hookList.length;
    const remainingHooks = hookList.filter(hook => !hook.once || !hook.executed);
    
    if (remainingHooks.length < beforeCount) {
      this.hooks.set(hookName, remainingHooks);
      this.stats.totalRegisteredHooks -= (beforeCount - remainingHooks.length);
      
      if (remainingHooks.length === 0) {
        this.hooks.delete(hookName);
        this.stats.totalHooks--;
        delete this.stats.executionMap[hookName];
      }
    }
  }
}

// ============== 便捷工厂函数 ==============

/**
 * 创建钩子系统实例
 */
export function createHookSystem(): HookSystem {
  return new HookSystem();
}

/**
 * 单例钩子系统 (全局共享)
 */
let globalHookSystem: HookSystem | null = null;

export function getGlobalHookSystem(): HookSystem {
  if (!globalHookSystem) {
    globalHookSystem = new HookSystem();
  }
  return globalHookSystem;
}

// ============== 使用示例 ==============

/*
// ============================================
// 钩子系统技能 - 使用示例
// ============================================

import { createHookSystem, getGlobalHookSystem } from './hook-system-skill';

// 示例 1: 基础钩子注册与触发
console.log('=== 示例 1: 基础用法 ===');
const hookSystem = createHookSystem();

// 注册钩子
hookSystem.register('user:beforeSave', (data) => {
  console.log('验证用户数据:', data);
  data.validated = true;
  return data;
}, { priority: 10, description: '验证用户数据' });

hookSystem.register('user:beforeSave', (data) => {
  console.log('加密密码:', data.password);
  data.password = '***encrypted***';
  return data;
}, { priority: 5, description: '加密密码' });

// 触发钩子
const userData = { username: 'Alice', password: '123456' };
const result = await hookSystem.execute('user:beforeSave', userData);
console.log('最终数据:', result.data);
console.log('执行时间:', result.executionTime, 'ms');

// 示例 2: 优先级控制
console.log('\n=== 示例 2: 优先级控制 ===');
const prioritySystem = createHookSystem();

prioritySystem.register('order:process', () => {
  console.log('  [优先级 0] 普通处理');
  return { step: 'normal' };
}, { priority: 0 });

prioritySystem.register('order:process', () => {
  console.log('  [优先级 10] 高优先级处理');
  return { step: 'high' };
}, { priority: 10 });

prioritySystem.register('order:process', () => {
  console.log('  [优先级 5] 中优先级处理');
  return { step: 'medium' };
}, { priority: 5 });

await prioritySystem.execute('order:process', {});
// 输出顺序：高优先级 -> 中优先级 -> 普通

// 示例 3: 一次性钩子
console.log('\n=== 示例 3: 一次性钩子 ===');
const onceSystem = createHookSystem();

onceSystem.register('app:init', () => {
  console.log('  应用初始化 (只执行一次)');
  return { initialized: true };
}, { once: true });

await onceSystem.execute('app:init', {});
await onceSystem.execute('app:init', {}); // 这次不会触发
await onceSystem.execute('app:init', {}); // 这次也不会触发

// 示例 4: 中断执行
console.log('\n=== 示例 4: 中断执行 ===');
const abortSystem = createHookSystem();

abortSystem.register('request:validate', (data, context) => {
  console.log('  验证请求...');
  if (!data.valid) {
    console.log('  验证失败，中断后续钩子');
    abortSystem.abort(context);
  }
  return data;
}, { priority: 10, canAbort: true });

abortSystem.register('request:process', (data) => {
  console.log('  处理请求...');
  return data;
}, { priority: 5 });

await abortSystem.execute('request:validate', { valid: false });
console.log('执行被中断');

// 示例 5: 超时控制
console.log('\n=== 示例 5: 超时控制 ===');
const timeoutSystem = createHookSystem();

timeoutSystem.register('slow:task', async (data) => {
  console.log('  开始慢任务...');
  await new Promise(resolve => setTimeout(resolve, 200));
  console.log('  慢任务完成');
  return data;
}, { timeout: 100 }); // 100ms 超时

const timeoutResult = await timeoutSystem.execute('slow:task', {});
console.log('执行结果:', timeoutResult.success ? '成功' : '失败');
if (timeoutResult.error) {
  console.log('错误信息:', timeoutResult.error);
}

// 示例 6: 全局单例
console.log('\n=== 示例 6: 全局单例 ===');
const global1 = getGlobalHookSystem();
const global2 = getGlobalHookSystem();
console.log('全局单例:', global1 === global2); // true

global1.register('global:event', (data) => {
  console.log('  全局事件:', data);
});

await global2.execute('global:event', { message: 'Hello' });

// 示例 7: 钩子统计
console.log('\n=== 示例 7: 统计信息 ===');
const statsSystem = createHookSystem();

statsSystem.register('test:hook1', () => {}, { description: '测试钩子 1' });
statsSystem.register('test:hook1', () => {}, { description: '测试钩子 2' });
statsSystem.register('test:hook2', () => {}, { description: '测试钩子 3' });

console.log('钩子名称:', statsSystem.getHookNames());
console.log('钩子数量:', statsSystem.getHookCount());
console.log('统计信息:', statsSystem.getStats());

// 示例 8: 取消注册
console.log('\n=== 示例 8: 取消注册 ===');
const unregisterSystem = createHookSystem();

const hookId = unregisterSystem.register('temp:hook', () => {
  console.log('  临时钩子');
});

console.log('注册后钩子数:', unregisterSystem.getHookCount('temp:hook'));
unregisterSystem.unregister('temp:hook', hookId);
console.log('取消注册后钩子数:', unregisterSystem.getHookCount('temp:hook'));

// 取消所有
unregisterSystem.register('temp:hook', () => {});
unregisterSystem.register('temp:hook', () => {});
unregisterSystem.unregister('temp:hook'); // 取消所有
console.log('全部取消后钩子数:', unregisterSystem.getHookCount('temp:hook'));

// ============================================
// 实际应用场景
// ============================================

// 场景 1: Web 请求中间件
/*
const requestHooks = createHookSystem();

// 认证中间件
requestHooks.register('request:before', async (req, ctx) => {
  const token = req.headers.authorization;
  if (!token) {
    ctx.shouldAbort = true;
    throw new Error('Unauthorized');
  }
  req.user = await verifyToken(token);
  return req;
}, { priority: 100 });

// 日志中间件
requestHooks.register('request:before', (req) => {
  console.log(`${req.method} ${req.path}`);
  return req;
}, { priority: 50 });

// 使用
await requestHooks.execute('request:before', request);
*/

// 场景 2: 数据管道处理
/*
const dataPipeline = createHookSystem();

dataPipeline.register('data:transform', (data) => {
  return data.map(item => ({ ...item, processed: true }));
}, { priority: 10 });

dataPipeline.register('data:validate', (data) => {
  const valid = data.every(item => item.id);
  if (!valid) throw new Error('Invalid data');
  return data;
}, { priority: 20 });

dataPipeline.register('data:enrich', async (data) => {
  return Promise.all(data.map(async item => ({
    ...item,
    extra: await fetchExtraData(item.id)
  })));
}, { priority: 5 });

// 使用
const result = await dataPipeline.execute('data:transform', rawData);
*/

// 场景 3: 生命周期钩子
/*
const lifecycle = createHookSystem();

lifecycle.register('app:beforeStart', () => {
  console.log('应用启动前准备...');
});

lifecycle.register('app:afterStart', () => {
  console.log('应用已启动');
});

lifecycle.register('app:beforeStop', () => {
  console.log('应用停止前清理...');
});

// 使用
await lifecycle.execute('app:beforeStart', {});
await startApplication();
await lifecycle.execute('app:afterStart', {});
*/

export default HookSystem;
