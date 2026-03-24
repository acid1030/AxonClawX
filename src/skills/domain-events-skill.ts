/**
 * 领域事件技能 - Domain Events Skill
 * 
 * 功能:
 * 1. 事件定义 - 类型安全的事件结构
 * 2. 事件发布 - 发布领域事件到事件总线
 * 3. 事件订阅 - 订阅并处理领域事件
 * 
 * @author Axon (KAEL Engineering)
 * @version 1.0.0
 * @module domain-events
 */

// ==================== 类型定义 ====================

/**
 * 事件元数据
 */
export interface DomainEventMetadata {
  /** 事件发生时间戳 */
  timestamp: number;
  /** 事件来源 (模块/服务名称) */
  source?: string;
  /** 关联 ID (用于追踪相关事件) */
  correlationId?: string;
  /** 因果 ID (触发此事件的上游事件) */
  causationId?: string;
}

/**
 * 领域事件基类
 */
export interface DomainEvent<T = any> {
  /** 事件类型 (命名格式：aggregate.action) */
  type: string;
  /** 事件 payload */
  payload: T;
  /** 事件元数据 */
  metadata: DomainEventMetadata;
}

/**
 * 事件处理器
 */
export type DomainEventHandler<T = any> = (
  event: DomainEvent<T>
) => void | Promise<void>;

/**
 * 事件订阅选项
 */
export interface SubscriptionOptions {
  /** 只触发一次 */
  once?: boolean;
  /** 优先级 (数字越大优先级越高) */
  priority?: number;
  /** 异步处理超时时间 (ms) */
  timeout?: number;
}

/**
 * 事件定义辅助类
 */
export class EventDefinition<T = any> {
  constructor(
    public readonly type: string,
    public readonly description: string,
    public readonly schema?: T
  ) {}

  /**
   * 创建事件实例
   */
  create(payload: T, source?: string, correlationId?: string): DomainEvent<T> {
    return {
      type: this.type,
      payload,
      metadata: {
        timestamp: Date.now(),
        source,
        correlationId: correlationId ?? this.generateId(),
      },
    };
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

// ==================== 领域事件总线 ====================

/**
 * 领域事件总线 - 核心实现
 */
export class DomainEventBus {
  private listeners: Map<string, Array<{
    handler: DomainEventHandler;
    priority: number;
    once: boolean;
    timeout: number;
  }>> = new Map();
  
  private history: DomainEvent[] = [];
  private maxHistory = 1000;
  private definitions: Map<string, EventDefinition> = new Map();

  /**
   * 定义事件类型
   */
  defineEvent<T>(type: string, description: string, schema?: T): EventDefinition<T> {
    const definition = new EventDefinition<T>(type, description, schema);
    this.definitions.set(type, definition);
    return definition;
  }

  /**
   * 获取事件定义
   */
  getDefinition(type: string): EventDefinition | undefined {
    return this.definitions.get(type);
  }

  /**
   * 订阅事件
   */
  subscribe<T>(
    eventType: string,
    handler: DomainEventHandler<T>,
    options: SubscriptionOptions = {}
  ): () => void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, []);
    }

    const listener = {
      handler,
      priority: options.priority ?? 0,
      once: options.once ?? false,
      timeout: options.timeout ?? 5000,
    };

    this.listeners.get(eventType)!.push(listener);
    
    // 按优先级排序 (高优先级在前)
    this.listeners.get(eventType)!.sort((a, b) => b.priority - a.priority);

    // 返回取消订阅函数
    return () => {
      const handlers = this.listeners.get(eventType);
      if (handlers) {
        const index = handlers.findIndex(l => l.handler === handler);
        if (index !== -1) {
          handlers.splice(index, 1);
        }
      }
    };
  }

  /**
   * 订阅事件一次
   */
  subscribeOnce<T>(eventType: string, handler: DomainEventHandler<T>): () => void {
    return this.subscribe(eventType, handler, { once: true });
  }

  /**
   * 发布事件
   */
  async publish<T>(eventType: string, payload: T, source?: string): Promise<void> {
    const event: DomainEvent<T> = {
      type: eventType,
      payload,
      metadata: {
        timestamp: Date.now(),
        source,
        correlationId: this.generateId(),
      },
    };

    // 记录历史
    this.recordHistory(event);

    // 获取处理器
    const handlers = this.listeners.get(eventType);
    if (!handlers || handlers.length === 0) {
      return;
    }

    // 并行执行所有处理器
    const promises = handlers.map(async (listener) => {
      try {
        const result = listener.handler(event);
        if (result instanceof Promise) {
          await Promise.race([
            result,
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error(`Handler timeout: ${eventType}`)), listener.timeout)
            ),
          ]);
        }
        
        // 处理 once 订阅
        if (listener.once) {
          const unsubscribe = this.subscribe(eventType, listener.handler, { once: true });
          unsubscribe();
        }
      } catch (error) {
        console.error(`[DomainEventBus] Error in handler for ${eventType}:`, error);
      }
    });

    await Promise.allSettled(promises);
  }

  /**
   * 批量发布事件
   */
  async publishBatch<T>(events: Array<{ type: string; payload: T; source?: string }>): Promise<void> {
    await Promise.all(events.map(e => this.publish(e.type, e.payload, e.source)));
  }

  /**
   * 获取历史事件
   */
  getHistory(options?: {
    type?: string;
    limit?: number;
    since?: number;
    until?: number;
  }): DomainEvent[] {
    let filtered = [...this.history];

    if (options?.type) {
      filtered = filtered.filter(e => e.type === options.type);
    }

    if (options?.since) {
      filtered = filtered.filter(e => e.metadata.timestamp >= options.since!);
    }

    if (options?.until) {
      filtered = filtered.filter(e => e.metadata.timestamp <= options.until!);
    }

    const limit = options?.limit ?? filtered.length;
    return filtered.slice(-limit);
  }

  /**
   * 清除历史
   */
  clearHistory(type?: string): void {
    if (type) {
      this.history = this.history.filter(e => e.type !== type);
    } else {
      this.history = [];
    }
  }

  /**
   * 等待事件
   */
  waitForEvent<T>(eventType: string, timeout?: number): Promise<DomainEvent<T>> {
    return new Promise((resolve, reject) => {
      const timer = timeout
        ? setTimeout(() => {
            unsubscribe();
            reject(new Error(`Timeout waiting for event: ${eventType}`));
          }, timeout)
        : null;

      const unsubscribe = this.subscribeOnce(eventType, (event: DomainEvent<T>) => {
        if (timer) clearTimeout(timer);
        resolve(event);
      });
    });
  }

  /**
   * 获取监听器数量
   */
  getListenerCount(eventType: string): number {
    return this.listeners.get(eventType)?.length ?? 0;
  }

  /**
   * 获取所有事件类型
   */
  getEventTypes(): string[] {
    return Array.from(this.listeners.keys());
  }

  /**
   * 销毁
   */
  destroy(): void {
    this.listeners.clear();
    this.history = [];
    this.definitions.clear();
  }

  private recordHistory(event: DomainEvent): void {
    this.history.push(event);
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

// ==================== 预定义领域事件 ====================

/**
 * 用户相关事件
 */
export const UserEvents = {
  CREATED: 'user.created',
  UPDATED: 'user.updated',
  DELETED: 'user.deleted',
  LOGGED_IN: 'user.logged_in',
  LOGGED_OUT: 'user.logged_out',
} as const;

/**
 * 任务相关事件
 */
export const TaskEvents = {
  CREATED: 'task.created',
  UPDATED: 'task.updated',
  COMPLETED: 'task.completed',
  FAILED: 'task.failed',
  ASSIGNED: 'task.assigned',
} as const;

/**
 * Agent 相关事件
 */
export const AgentEvents = {
  STARTED: 'agent.started',
  STOPPED: 'agent.stopped',
  TASK_ASSIGNED: 'agent.task_assigned',
  TASK_COMPLETED: 'agent.task_completed',
  ERROR: 'agent.error',
} as const;

// ==================== 全局单例 ====================

let globalEventBus: DomainEventBus | null = null;

/**
 * 获取全局领域事件总线
 */
export function getDomainEventBus(): DomainEventBus {
  if (!globalEventBus) {
    globalEventBus = new DomainEventBus();
  }
  return globalEventBus;
}

/**
 * 重置全局事件总线 (用于测试)
 */
export function resetDomainEventBus(): void {
  if (globalEventBus) {
    globalEventBus.destroy();
    globalEventBus = null;
  }
}

// ==================== 便捷函数 ====================

/**
 * 定义事件
 */
export function defineEvent<T>(type: string, description: string, schema?: T): EventDefinition<T> {
  return getDomainEventBus().defineEvent(type, description, schema);
}

/**
 * 订阅事件
 */
export function subscribe<T>(
  eventType: string,
  handler: DomainEventHandler<T>,
  options?: SubscriptionOptions
): () => void {
  return getDomainEventBus().subscribe(eventType, handler, options);
}

/**
 * 发布事件
 */
export function publish<T>(eventType: string, payload: T, source?: string): Promise<void> {
  return getDomainEventBus().publish(eventType, payload, source);
}

/**
 * 等待事件
 */
export function waitForEvent<T>(eventType: string, timeout?: number): Promise<DomainEvent<T>> {
  return getDomainEventBus().waitForEvent(eventType, timeout);
}

export default DomainEventBus;
