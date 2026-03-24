/**
 * 事件发射器技能 - Event Emitter Skill
 * 
 * 功能:
 * 1. 事件订阅/取消订阅
 * 2. 事件发射 (支持同步/异步)
 * 3. 一次性监听 (once)
 * 4. 支持通配符匹配
 * 
 * @author Axon
 * @version 1.0.0
 */

// ============== 类型定义 ==============

export type EventHandler<T = any> = (data: T, eventName: string) => void | Promise<void>;

export interface EventOptions {
  /** 是否异步执行 */
  async?: boolean;
  /** 事件超时时间 (毫秒) */
  timeout?: number;
  /** 是否捕获错误 */
  captureErrors?: boolean;
}

export interface EmitterStats {
  /** 总事件数 */
  totalEvents: number;
  /** 总监听器数 */
  totalListeners: number;
  /** 已发射事件数 */
  emittedCount: number;
  /** 事件映射 */
  eventMap: Record<string, number>;
}

interface ListenerEntry {
  handler: EventHandler;
  once: boolean;
  priority: number;
}

interface ListenerMap {
  [eventName: string]: ListenerEntry[];
}

// ============== 事件发射器实现 ==============

/**
 * 事件发射器类
 */
export class EventEmitter {
  private listeners: ListenerMap = {};
  private stats: EmitterStats = {
    totalEvents: 0,
    totalListeners: 0,
    emittedCount: 0,
    eventMap: {},
  };
  private maxListeners: number = 100;
  private wildcard: boolean = true;

  constructor(options?: { maxListeners?: number; wildcard?: boolean }) {
    if (options?.maxListeners) {
      this.maxListeners = options.maxListeners;
    }
    if (options?.wildcard !== undefined) {
      this.wildcard = options.wildcard;
    }
  }

  /**
   * 订阅事件
   * @param eventName 事件名称 (支持通配符 *)
   * @param handler 事件处理函数
   * @param priority 优先级 (数字越大越先执行，默认 0)
   * @returns 取消订阅函数
   */
  on(eventName: string, handler: EventHandler, priority: number = 0): () => void {
    if (!this.listeners[eventName]) {
      this.listeners[eventName] = [];
      this.stats.totalEvents++;
    }

    if (this.listeners[eventName].length >= this.maxListeners) {
      console.warn(`[EventEmitter] Max listeners (${this.maxListeners}) exceeded for event "${eventName}"`);
    }

    const entry: ListenerEntry = { handler, once: false, priority };
    this.listeners[eventName].push(entry);
    this.listeners[eventName].sort((a, b) => b.priority - a.priority);
    this.stats.totalListeners++;
    this.stats.eventMap[eventName] = this.listeners[eventName].length;

    // 返回取消订阅函数
    return () => this.off(eventName, handler);
  }

  /**
   * 一次性监听事件 (触发后自动取消)
   * @param eventName 事件名称
   * @param handler 事件处理函数
   * @param priority 优先级
   * @returns 取消监听函数
   */
  once(eventName: string, handler: EventHandler, priority: number = 0): () => void {
    if (!this.listeners[eventName]) {
      this.listeners[eventName] = [];
      this.stats.totalEvents++;
    }

    const entry: ListenerEntry = { handler, once: true, priority };
    this.listeners[eventName].push(entry);
    this.listeners[eventName].sort((a, b) => b.priority - a.priority);
    this.stats.totalListeners++;
    this.stats.eventMap[eventName] = this.listeners[eventName].length;

    // 返回取消监听函数
    return () => this.off(eventName, handler);
  }

  /**
   * 取消订阅事件
   * @param eventName 事件名称
   * @param handler 事件处理函数
   */
  off(eventName: string, handler?: EventHandler): void {
    if (!this.listeners[eventName]) {
      return;
    }

    if (handler) {
      this.listeners[eventName] = this.listeners[eventName].filter(
        (entry) => entry.handler !== handler
      );
    } else {
      this.listeners[eventName] = [];
    }

    if (this.listeners[eventName].length === 0) {
      delete this.listeners[eventName];
      this.stats.totalEvents--;
      delete this.stats.eventMap[eventName];
    }
    this.stats.totalListeners = this.getAllListenerCount();
  }

  /**
   * 发射事件
   * @param eventName 事件名称
   * @param data 事件数据
   * @param options 发射选项
   */
  async emit<T = any>(eventName: string, data?: T, options?: EventOptions): Promise<void> {
    const asyncMode = options?.async ?? true;
    const captureErrors = options?.captureErrors ?? true;
    const timeout = options?.timeout;

    const matchingListeners = this.getMatchingListeners(eventName);
    
    if (matchingListeners.length === 0) {
      return;
    }

    this.stats.emittedCount++;

    const executeHandler = async (entry: ListenerEntry) => {
      try {
        const result = entry.handler(data, eventName);
        if (result instanceof Promise) {
          await result;
        }
      } catch (error) {
        if (captureErrors) {
          console.error(`[EventEmitter] Error in handler for "${eventName}":`, error);
        } else {
          throw error;
        }
      }
    };

    if (asyncMode) {
      const promises = matchingListeners.map(async (entry) => {
        const promise = executeHandler(entry);
        if (timeout) {
          return Promise.race([
            promise,
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error(`Timeout after ${timeout}ms`)), timeout)
            ),
          ]);
        }
        return promise;
      });

      await Promise.allSettled(promises);
    } else {
      for (const entry of matchingListeners) {
        await executeHandler(entry);
      }
    }

    // 清理 once 监听器
    this.cleanupOnceListeners(eventName);
  }

  /**
   * 同步发射事件 (不等待异步处理)
   * @param eventName 事件名称
   * @param data 事件数据
   */
  emitSync<T = any>(eventName: string, data?: T): void {
    const matchingListeners = this.getMatchingListeners(eventName);
    
    for (const entry of matchingListeners) {
      try {
        const result = entry.handler(data, eventName);
        if (result instanceof Promise) {
          console.warn(`[EventEmitter] Sync emit called but handler is async for "${eventName}"`);
        }
      } catch (error) {
        console.error(`[EventEmitter] Error in sync handler for "${eventName}":`, error);
      }
    }

    this.cleanupOnceListeners(eventName);
    this.stats.emittedCount++;
  }

  /**
   * 移除所有监听器
   * @param eventName 可选，指定事件名称，不传则清空所有
   */
  removeAllListeners(eventName?: string): void {
    if (eventName) {
      if (this.listeners[eventName]) {
        this.stats.totalListeners -= this.listeners[eventName].length;
        this.stats.totalEvents--;
        delete this.listeners[eventName];
        delete this.stats.eventMap[eventName];
      }
    } else {
      this.listeners = {};
      this.stats.totalEvents = 0;
      this.stats.totalListeners = 0;
      this.stats.eventMap = {};
    }
  }

  /**
   * 获取指定事件的监听器数量
   * @param eventName 事件名称
   */
  listenerCount(eventName: string): number {
    return this.listeners[eventName]?.length || 0;
  }

  /**
   * 获取所有事件名称
   */
  eventNames(): string[] {
    return Object.keys(this.listeners);
  }

  /**
   * 获取发射器统计信息
   */
  getStats(): EmitterStats {
    return { ...this.stats };
  }

  /**
   * 设置最大监听器数量
   */
  setMaxListeners(n: number): void {
    this.maxListeners = n;
  }

  // ============== 私有方法 ==============

  /**
   * 获取匹配事件名称的监听器 (支持通配符)
   */
  private getMatchingListeners(eventName: string): ListenerEntry[] {
    const result: ListenerEntry[] = [];

    // 精确匹配
    if (this.listeners[eventName]) {
      result.push(...this.listeners[eventName]);
    }

    // 通配符匹配 (如果启用)
    if (this.wildcard) {
      for (const [pattern, listeners] of Object.entries(this.listeners)) {
        if (pattern.includes('*') && this.matchesPattern(eventName, pattern)) {
          result.push(...listeners);
        }
      }
    }

    return result;
  }

  /**
   * 检查事件名称是否匹配模式
   */
  private matchesPattern(eventName: string, pattern: string): boolean {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    return regex.test(eventName);
  }

  /**
   * 清理 once 监听器
   */
  private cleanupOnceListeners(eventName: string): void {
    if (!this.listeners[eventName]) {
      return;
    }

    const beforeCount = this.listeners[eventName].length;
    this.listeners[eventName] = this.listeners[eventName].filter((entry) => !entry.once);
    const removedCount = beforeCount - this.listeners[eventName].length;

    if (removedCount > 0) {
      this.stats.totalListeners -= removedCount;
      if (this.listeners[eventName].length === 0) {
        delete this.listeners[eventName];
        this.stats.totalEvents--;
        delete this.stats.eventMap[eventName];
      } else {
        this.stats.eventMap[eventName] = this.listeners[eventName].length;
      }
    }
  }

  /**
   * 获取所有监听器总数
   */
  private getAllListenerCount(): number {
    return Object.values(this.listeners).reduce((sum, arr) => sum + arr.length, 0);
  }
}

// ============== 便捷工厂函数 ==============

/**
 * 创建事件发射器实例
 */
export function createEventEmitter(options?: { maxListeners?: number; wildcard?: boolean }): EventEmitter {
  return new EventEmitter(options);
}

/**
 * 单例事件发射器 (全局共享)
 */
let globalEmitter: EventEmitter | null = null;

export function getGlobalEmitter(): EventEmitter {
  if (!globalEmitter) {
    globalEmitter = new EventEmitter();
  }
  return globalEmitter;
}

// ============== 使用示例 ==============

/*
// 示例 1: 基础用法
const emitter = createEventEmitter();

// 订阅事件
const unsubscribe = emitter.on('user:login', (data) => {
  console.log(`用户 ${data.username} 登录了`);
});

// 发射事件
await emitter.emit('user:login', { username: 'Alice', timestamp: Date.now() });

// 取消订阅
unsubscribe();

// 示例 2: 一次性监听
emitter.once('task:complete', (result) => {
  console.log('任务完成:', result);
});

// 触发后自动取消
await emitter.emit('task:complete', { success: true });
await emitter.emit('task:complete', { success: false }); // 这次不会触发

// 示例 3: 通配符匹配
emitter.on('user:*', (data, eventName) => {
  console.log(`用户事件 ${eventName}:`, data);
});

await emitter.emit('user:login', { username: 'Bob' });
await emitter.emit('user:logout', { username: 'Bob' });

// 示例 4: 优先级
emitter.on('order:created', () => console.log('低优先级'), 0);
emitter.on('order:created', () => console.log('高优先级'), 10);
// 输出顺序：高优先级 -> 低优先级

// 示例 5: 异步处理
emitter.on('data:process', async (data) => {
  await new Promise(resolve => setTimeout(resolve, 100));
  console.log('处理完成:', data);
});

await emitter.emit('data:process', { id: 1 }, { timeout: 500 });

// 示例 6: 全局单例
const globalEmitter = getGlobalEmitter();
globalEmitter.on('global:event', (data) => console.log(data));
*/

export default EventEmitter;
