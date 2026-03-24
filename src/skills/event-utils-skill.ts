/**
 * ACE 事件总线工具
 * 
 * 功能:
 * 1. 事件发布/订阅 (Pub/Sub)
 * 2. 事件监听 (一次性/持久化)
 * 3. 事件触发 (同步/异步)
 * 
 * @author Axon
 * @version 1.0.0
 */

// ==================== 类型定义 ====================

/**
 * 事件回调函数类型
 */
export type EventCallback<T = any> = (data: T, eventName: string) => void | Promise<void>;

/**
 * 事件监听器配置
 */
export interface EventListenerConfig {
  once?: boolean;        // 是否只触发一次
  priority?: number;     // 优先级 (数字越大越先执行)
  id?: string;          // 监听器 ID (用于移除)
}

/**
 * 监听器内部表示
 */
interface InternalListener<T = any> {
  callback: EventCallback<T>;
  config: EventListenerConfig;
  createdAt: number;
}

/**
 * 事件总线接口
 */
export interface EventBus {
  on: <T = any>(eventName: string, callback: EventCallback<T>, config?: EventListenerConfig) => string;
  off: (eventName: string, listenerId?: string) => boolean;
  emit: <T = any>(eventName: string, data?: T) => Promise<boolean>;
  once: <T = any>(eventName: string, callback: EventCallback<T>) => string;
  removeAllListeners: (eventName?: string) => number;
  listenerCount: (eventName: string) => number;
  eventNames: () => string[];
}

/**
 * 事件历史记录
 */
export interface EventHistory {
  eventName: string;
  data: any;
  timestamp: number;
  emitterId?: string;
}

// ==================== 事件总线类 ====================

/**
 * ACE 事件总线实现
 * 
 * 特性:
 * - 支持通配符事件匹配 (* 和 **)
 * - 支持优先级排序
 * - 支持异步回调
 * - 支持事件历史追踪
 * - 线程安全 (基于 JavaScript 单线程)
 */
export class ACEEventBus implements EventBus {
  private listeners: Map<string, Map<string, InternalListener>> = new Map();
  private history: EventHistory[] = [];
  private maxHistory: number = 100;
  private emitterId: string;

  constructor(emitterId?: string) {
    this.emitterId = emitterId || `emitter-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 1. 订阅事件
   * 
   * @param eventName 事件名称 (支持通配符 * 和 **)
   * @param callback 回调函数
   * @param config 配置选项
   * @returns 监听器 ID
   * 
   * @example
   * ```ts
   * // 普通订阅
   * const id = eventBus.on('user.login', (data) => {
   *   console.log('User logged in:', data);
   * });
   * 
   * // 带优先级订阅
   * eventBus.on('user.login', handler, { priority: 10 });
   * 
   * // 通配符订阅 (匹配单层)
   * eventBus.on('user.*', (data, eventName) => {
   *   console.log(`Event ${eventName} triggered`);
   * });
   * 
   * // 通配符订阅 (匹配多层)
   * eventBus.on('**', (data, eventName) => {
   *   console.log(`All events: ${eventName}`);
   * });
   * ```
   */
  on<T = any>(eventName: string, callback: EventCallback<T>, config: EventListenerConfig = {}): string {
    const listenerId = config.id || `listener-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const listener: InternalListener<T> = {
      callback,
      config: {
        once: config.once || false,
        priority: config.priority || 0,
        id: listenerId,
      },
      createdAt: Date.now(),
    };

    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, new Map());
    }
    
    this.listeners.get(eventName)!.set(listenerId, listener);
    
    return listenerId;
  }

  /**
   * 取消订阅
   * 
   * @param eventName 事件名称
   * @param listenerId 监听器 ID (不传则移除该事件所有监听器)
   * @returns 是否成功移除
   * 
   * @example
   * ```ts
   * // 移除特定监听器
   * eventBus.off('user.login', listenerId);
   * 
   * // 移除事件的所有监听器
   * eventBus.off('user.login');
   * ```
   */
  off(eventName: string, listenerId?: string): boolean {
    if (!this.listeners.has(eventName)) {
      return false;
    }

    if (listenerId) {
      return this.listeners.get(eventName)!.delete(listenerId);
    } else {
      return this.listeners.delete(eventName);
    }
  }

  /**
   * 2. 触发事件
   * 
   * @param eventName 事件名称
   * @param data 事件数据
   * @returns 是否至少有一个监听器被执行
   * 
   * @example
   * ```ts
   * // 同步触发
   * await eventBus.emit('user.login', { userId: 123, username: 'axon' });
   * 
   * // 触发无数据事件
   * await eventBus.emit('system.ready');
   * ```
   */
  async emit<T = any>(eventName: string, data?: T): Promise<boolean> {
    const executedListeners: string[] = [];
    const listenersToExecute: Array<{ 
      eventName: string; 
      listenerId: string; 
      listener: InternalListener<T>;
    }> = [];

    // 收集所有匹配的监听器 (包括通配符)
    for (const [pattern, listeners] of this.listeners.entries()) {
      if (this.matchesPattern(eventName, pattern)) {
        for (const [listenerId, listener] of listeners.entries()) {
          listenersToExecute.push({
            eventName: pattern,
            listenerId,
            listener,
          });
        }
      }
    }

    // 按优先级排序
    listenersToExecute.sort((a, b) => {
      return (b.listener.config.priority || 0) - (a.listener.config.priority || 0);
    });

    // 执行监听器
    for (const { eventName: pattern, listenerId, listener } of listenersToExecute) {
      try {
        await listener.callback(data as T, eventName);
        executedListeners.push(listenerId);

        // 如果是一次性监听器，移除它
        if (listener.config.once) {
          this.listeners.get(pattern)?.delete(listenerId);
        }
      } catch (error) {
        console.error(`[ACE Event Bus] Error in listener ${listenerId} for event ${eventName}:`, error);
      }
    }

    // 记录事件历史
    this.recordHistory(eventName, data);

    return executedListeners.length > 0;
  }

  /**
   * 3. 一次性监听
   * 
   * @param eventName 事件名称
   * @param callback 回调函数
   * @returns 监听器 ID
   * 
   * @example
   * ```ts
   * eventBus.once('system.shutdown', () => {
   *   console.log('System shutting down...');
   * });
   * ```
   */
  once<T = any>(eventName: string, callback: EventCallback<T>): string {
    return this.on(eventName, callback, { once: true });
  }

  /**
   * 移除所有监听器
   * 
   * @param eventName 事件名称 (不传则移除所有事件)
   * @returns 移除的监听器数量
   */
  removeAllListeners(eventName?: string): number {
    let count = 0;

    if (eventName) {
      const listeners = this.listeners.get(eventName);
      if (listeners) {
        count = listeners.size;
        this.listeners.delete(eventName);
      }
    } else {
      for (const listeners of this.listeners.values()) {
        count += listeners.size;
      }
      this.listeners.clear();
    }

    return count;
  }

  /**
   * 获取事件的监听器数量
   * 
   * @param eventName 事件名称
   * @returns 监听器数量
   */
  listenerCount(eventName: string): number {
    let count = 0;
    
    for (const [pattern, listeners] of this.listeners.entries()) {
      if (this.matchesPattern(eventName, pattern)) {
        count += listeners.size;
      }
    }
    
    return count;
  }

  /**
   * 获取所有已注册的事件名称
   * 
   * @returns 事件名称数组
   */
  eventNames(): string[] {
    return Array.from(this.listeners.keys());
  }

  /**
   * 获取事件历史
   * 
   * @param eventName 事件名称 (可选，过滤特定事件)
   * @param limit 限制数量 (默认 10)
   * @returns 事件历史记录
   */
  getHistory(eventName?: string, limit: number = 10): EventHistory[] {
    let history = this.history;
    
    if (eventName) {
      history = history.filter(h => h.eventName === eventName);
    }
    
    return history.slice(-limit);
  }

  /**
   * 清空事件历史
   */
  clearHistory(): void {
    this.history = [];
  }

  /**
   * 获取 emitter ID
   */
  getEmitterId(): string {
    return this.emitterId;
  }

  // ==================== 私有方法 ====================

  /**
   * 检查事件名称是否匹配模式
   * 
   * 支持:
   * - 精确匹配: 'user.login' === 'user.login'
   * - 单层通配符: 'user.*' 匹配 'user.login', 'user.logout'
   * - 多层通配符: '**' 或 '**.error' 匹配任意层级
   */
  private matchesPattern(eventName: string, pattern: string): boolean {
    if (pattern === '**') {
      return true;
    }

    if (pattern === eventName) {
      return true;
    }

    // 处理 ** 通配符 (匹配任意层级)
    if (pattern.includes('**')) {
      const regex = new RegExp('^' + pattern.replace(/\*\*/g, '.*').replace(/\*/g, '[^.]*') + '$');
      return regex.test(eventName);
    }

    // 处理 * 通配符 (匹配单层)
    if (pattern.includes('*')) {
      const patternParts = pattern.split('.');
      const eventParts = eventName.split('.');

      if (patternParts.length !== eventParts.length) {
        return false;
      }

      for (let i = 0; i < patternParts.length; i++) {
        if (patternParts[i] !== '*' && patternParts[i] !== eventParts[i]) {
          return false;
        }
      }

      return true;
    }

    return false;
  }

  /**
   * 记录事件历史
   */
  private recordHistory(eventName: string, data: any): void {
    this.history.push({
      eventName,
      data,
      timestamp: Date.now(),
      emitterId: this.emitterId,
    });

    // 限制历史记录数量
    if (this.history.length > this.maxHistory) {
      this.history = this.history.slice(-this.maxHistory);
    }
  }
}

// ==================== 工具函数 ====================

/**
 * 创建事件总线实例
 * 
 * @param emitterId 可选的 emitter 标识
 * @returns 事件总线实例
 * 
 * @example
 * ```ts
 * const eventBus = createEventBus('my-app');
 * ```
 */
export function createEventBus(emitterId?: string): ACEEventBus {
  return new ACEEventBus(emitterId);
}

/**
 * 创建全局单例事件总线
 */
export const globalEventBus = createEventBus('global');

// ==================== 导出 ====================

export default {
  ACEEventBus,
  createEventBus,
  globalEventBus,
};
