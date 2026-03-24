/**
 * Queue Manager - 消息队列管理工具
 * 
 * 功能:
 * 1. 内存队列 (FIFO)
 * 2. 优先级队列 (Priority Queue)
 * 3. 延迟队列 (Delay Queue)
 * 
 * @author Axon (KAEL Subagent)
 * @version 1.0.0
 */

// ============== 类型定义 ==============

export interface QueueOptions {
  /** 队列名称 */
  name?: string;
  /** 最大队列长度，0 表示无限制 */
  maxSize?: number;
}

export interface PriorityItem<T> {
  /** 数据 */
  data: T;
  /** 优先级 (数字越小优先级越高) */
  priority: number;
  /** 创建时间戳 */
  timestamp: number;
  /** 唯一 ID */
  id: string;
}

export interface DelayItem<T> {
  /** 数据 */
  data: T;
  /** 延迟执行时间戳 */
  executeAt: number;
  /** 唯一 ID */
  id: string;
}

export interface QueueStats {
  /** 入队次数 */
  enqueues: number;
  /** 出队次数 */
  dequeues: number;
  /** 当前队列长度 */
  size: number;
  /** 峰值长度 */
  peakSize: number;
  /** 丢弃次数 (超出 maxSize) */
  dropped: number;
}

export interface DelayQueueOptions extends QueueOptions {
  /** 检查延迟队列的时间间隔 (毫秒) */
  checkInterval?: number;
}

// ============== 工具函数 ==============

/**
 * 生成唯一 ID
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// ============== 基础内存队列 ==============

/**
 * 基础内存队列 (FIFO)
 * 
 * @example
 * ```typescript
 * const queue = new MemoryQueue({ name: 'tasks', maxSize: 100 });
 * 
 * // 入队
 * queue.enqueue('task1');
 * queue.enqueue('task2');
 * 
 * // 出队
 * const task = queue.dequeue();
 * 
 * // 查看队列长度
 * console.log(queue.size);
 * 
 * // 获取统计信息
 * const stats = queue.getStats();
 * ```
 */
export class MemoryQueue<T> {
  protected queue: T[] = [];
  protected options: Required<QueueOptions>;
  protected stats: QueueStats = {
    enqueues: 0,
    dequeues: 0,
    size: 0,
    peakSize: 0,
    dropped: 0,
  };

  constructor(options: QueueOptions = {}) {
    this.options = {
      name: options.name ?? 'default',
      maxSize: options.maxSize ?? 0,
    };
  }

  /**
   * 入队
   * 
   * @param item - 要入队的项目
   * @returns 是否成功入队
   */
  enqueue(item: T): boolean {
    // 检查队列是否已满
    if (this.options.maxSize > 0 && this.queue.length >= this.options.maxSize) {
      this.stats.dropped++;
      return false;
    }

    this.queue.push(item);
    this.stats.enqueues++;
    this.stats.size = this.queue.length;
    
    if (this.stats.size > this.stats.peakSize) {
      this.stats.peakSize = this.stats.size;
    }

    return true;
  }

  /**
   * 出队
   * 
   * @returns 出队的项目，队列为空时返回 undefined
   */
  dequeue(): T | undefined {
    const item = this.queue.shift();
    
    if (item !== undefined) {
      this.stats.dequeues++;
      this.stats.size = this.queue.length;
    }

    return item;
  }

  /**
   * 查看队首元素 (不出队)
   * 
   * @returns 队首元素，队列为空时返回 undefined
   */
  peek(): T | undefined {
    return this.queue[0];
  }

  /**
   * 清空队列
   */
  clear(): void {
    this.queue = [];
    this.stats.size = 0;
  }

  /**
   * 获取队列长度
   */
  get size(): number {
    return this.queue.length;
  }

  /**
   * 判断队列是否为空
   */
  isEmpty(): boolean {
    return this.queue.length === 0;
  }

  /**
   * 获取统计信息
   */
  getStats(): QueueStats {
    return { ...this.stats };
  }

  /**
   * 获取队列所有元素 (用于调试)
   */
  toArray(): T[] {
    return [...this.queue];
  }
}

// ============== 优先级队列 ==============

export interface PriorityItemWithIndex<T> extends PriorityItem<T> {
  /** 插入顺序索引 (用于稳定排序) */
  index: number;
}

/**
 * 优先级队列
 * 
 * 优先级数字越小，优先级越高。相同优先级按入队顺序排序。
 * 
 * @example
 * ```typescript
 * const priorityQueue = new PriorityQueue<Task>({ name: 'urgent-tasks' });
 * 
 * // 添加不同优先级的任务
 * priorityQueue.enqueue({ id: 1, name: 'Normal task' }, 5);
 * priorityQueue.enqueue({ id: 2, name: 'Urgent task' }, 1);
 * priorityQueue.enqueue({ id: 3, name: 'High priority' }, 3);
 * 
 * // 出队 (按优先级顺序)
 * const urgent = priorityQueue.dequeue(); // 返回 id=2 的任务
 * const high = priorityQueue.dequeue();   // 返回 id=3 的任务
 * const normal = priorityQueue.dequeue(); // 返回 id=1 的任务
 * 
 * // 查看队首
 * const next = priorityQueue.peek();
 * 
 * // 按优先级查看队列
 * const items = priorityQueue.toArray();
 * ```
 */
export class PriorityQueue<T> extends MemoryQueue<PriorityItem<T>> {
  private insertIndex: number = 0;

  /**
   * 入队 (带优先级)
   * 
   * @param data - 要入队的数据
   * @param priority - 优先级 (数字越小优先级越高，默认 5)
   * @returns 是否成功入队
   */
  enqueue(data: T, priority: number = 5): boolean {
    const item: PriorityItemWithIndex<T> = {
      data,
      priority,
      timestamp: Date.now(),
      id: generateId(),
      index: this.insertIndex++,
    };

    // 检查队列是否已满
    if (this.options.maxSize > 0 && this.queue.length >= this.options.maxSize) {
      this.stats.dropped++;
      return false;
    }

    this.queue.push(item as any);
    this.stats.enqueues++;
    this.stats.size = this.queue.length;
    
    if (this.stats.size > this.stats.peakSize) {
      this.stats.peakSize = this.stats.size;
    }

    return true;
  }

  /**
   * 出队 (按优先级)
   * 
   * @returns 优先级最高的项目
   */
  dequeue(): PriorityItem<T> | undefined {
    if (this.queue.length === 0) {
      return undefined;
    }

    // 找到优先级最高的项目 (优先级数字最小，相同则按插入顺序)
    let highestIndex = 0;
    for (let i = 1; i < this.queue.length; i++) {
      const current = this.queue[i] as PriorityItemWithIndex<T>;
      const highest = this.queue[highestIndex] as PriorityItemWithIndex<T>;
      
      if (current.priority < highest.priority || 
          (current.priority === highest.priority && current.index < highest.index)) {
        highestIndex = i;
      }
    }

    const item = this.queue.splice(highestIndex, 1)[0];
    
    if (item) {
      this.stats.dequeues++;
      this.stats.size = this.queue.length;
    }

    return item as PriorityItem<T>;
  }

  /**
   * 查看队首元素 (不出队)
   * 
   * @returns 优先级最高的项目
   */
  peek(): PriorityItem<T> | undefined {
    if (this.queue.length === 0) {
      return undefined;
    }

    let highestIndex = 0;
    for (let i = 1; i < this.queue.length; i++) {
      const current = this.queue[i] as PriorityItemWithIndex<T>;
      const highest = this.queue[highestIndex] as PriorityItemWithIndex<T>;
      
      if (current.priority < highest.priority || 
          (current.priority === highest.priority && current.index < highest.index)) {
        highestIndex = i;
      }
    }

    return this.queue[highestIndex] as PriorityItem<T>;
  }

  /**
   * 获取所有项目 (按优先级排序)
   */
  toArray(): PriorityItem<T>[] {
    return [...this.queue].sort((a, b) => {
      const aItem = a as PriorityItemWithIndex<T>;
      const bItem = b as PriorityItemWithIndex<T>;
      
      if (aItem.priority !== bItem.priority) {
        return aItem.priority - bItem.priority;
      }
      return aItem.index - bItem.index;
    }) as PriorityItem<T>[];
  }
}

// ============== 延迟队列 ==============

export type DelayQueueCallback<T> = (item: T) => void | Promise<void>;

/**
 * 延迟队列
 * 
 * 项目会在指定的延迟时间后变得可消费。
 * 
 * @example
 * ```typescript
 * const delayQueue = new DelayQueue<Task>({ 
 *   name: 'scheduled-tasks',
 *   checkInterval: 1000 // 每秒检查一次
 * });
 * 
 * // 启动自动处理
 * delayQueue.start(async (task) => {
 *   console.log('Executing task:', task);
 *   await executeTask(task);
 * });
 * 
 * // 添加延迟任务 (5 秒后执行)
 * delayQueue.enqueueDelayed({ id: 1, name: 'Task 1' }, 5000);
 * 
 * // 添加延迟任务 (1 分钟后执行)
 * delayQueue.enqueueDelayed({ id: 2, name: 'Task 2' }, 60000);
 * 
 * // 立即添加 (无延迟)
 * delayQueue.enqueue({ id: 3, name: 'Task 3' });
 * 
 * // 停止自动处理
 * delayQueue.stop();
 * ```
 */
export class DelayQueue<T> extends MemoryQueue<DelayItem<T>> {
  private checkInterval?: NodeJS.Timeout;
  private callback?: DelayQueueCallback<T>;
  private options: Required<DelayQueueOptions>;

  constructor(options: DelayQueueOptions = {}) {
    super(options);
    this.options = {
      name: options.name ?? 'delay-queue',
      maxSize: options.maxSize ?? 0,
      checkInterval: options.checkInterval ?? 1000,
    };
  }

  /**
   * 入队 (带延迟)
   * 
   * @param data - 要入队的数据
   * @param delayMs - 延迟时间 (毫秒)
   * @returns 是否成功入队
   */
  enqueueDelayed(data: T, delayMs: number): boolean {
    const item: DelayItem<T> = {
      data,
      executeAt: Date.now() + delayMs,
      id: generateId(),
    };

    // 检查队列是否已满
    if (this.options.maxSize > 0 && this.queue.length >= this.options.maxSize) {
      this.stats.dropped++;
      return false;
    }

    this.queue.push(item);
    this.stats.enqueues++;
    this.stats.size = this.queue.length;
    
    if (this.stats.size > this.stats.peakSize) {
      this.stats.peakSize = this.stats.size;
    }

    return true;
  }

  /**
   * 入队 (立即执行，无延迟)
   */
  enqueue(data: T): boolean {
    return this.enqueueDelayed(data, 0);
  }

  /**
   * 出队 (仅返回已到期的项目)
   * 
   * @returns 已到期的项目，如果没有则返回 undefined
   */
  dequeue(): DelayItem<T> | undefined {
    const now = Date.now();
    const index = this.queue.findIndex(item => item.executeAt <= now);

    if (index === -1) {
      return undefined;
    }

    const item = this.queue.splice(index, 1)[0];
    
    if (item) {
      this.stats.dequeues++;
      this.stats.size = this.queue.length;
    }

    return item;
  }

  /**
   * 获取下一个即将到期的项目 (不出队)
   * 
   * @returns 最早到期的项目
   */
  peek(): DelayItem<T> | undefined {
    if (this.queue.length === 0) {
      return undefined;
    }

    // 找到最早到期的项目
    let earliestIndex = 0;
    for (let i = 1; i < this.queue.length; i++) {
      if (this.queue[i].executeAt < this.queue[earliestIndex].executeAt) {
        earliestIndex = i;
      }
    }

    return this.queue[earliestIndex];
  }

  /**
   * 获取所有已到期的项目
   */
  getReadyItems(): DelayItem<T>[] {
    const now = Date.now();
    return this.queue.filter(item => item.executeAt <= now);
  }

  /**
   * 获取所有未到期项目
   */
  getPendingItems(): DelayItem<T>[] {
    const now = Date.now();
    return this.queue.filter(item => item.executeAt > now);
  }

  /**
   * 启动自动处理
   * 
   * @param callback - 项目到期时的回调函数
   */
  start(callback: DelayQueueCallback<T>): void {
    this.callback = callback;
    
    this.checkInterval = setInterval(async () => {
      const readyItems = this.getReadyItems();
      
      for (const item of readyItems) {
        const dequeued = this.dequeue();
        if (dequeued && this.callback) {
          try {
            await this.callback(dequeued.data);
          } catch (error) {
            console.error(`[DelayQueue:${this.options.name}] Error processing item:`, error);
          }
        }
      }
    }, this.options.checkInterval);
  }

  /**
   * 停止自动处理
   */
  stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = undefined;
    }
    this.callback = undefined;
  }

  /**
   * 获取下一个项目的剩余延迟时间
   * 
   * @returns 剩余毫秒数，队列为空时返回 0
   */
  getNextDelay(): number {
    const next = this.peek();
    if (!next) {
      return 0;
    }
    return Math.max(0, next.executeAt - Date.now());
  }

  /**
   * 清空队列
   */
  clear(): void {
    super.clear();
    this.stop();
  }
}

// ============== 队列管理器 (统一管理) ==============

export interface QueueManagerOptions {
  /** 默认队列类型 */
  defaultType?: 'fifo' | 'priority' | 'delay';
  /** 延迟队列检查间隔 */
  delayCheckInterval?: number;
}

export type QueueType = 'fifo' | 'priority' | 'delay';

/**
 * 队列管理器 - 统一管理多种队列
 * 
 * @example
 * ```typescript
 * const manager = new QueueManager();
 * 
 * // 创建不同类型的队列
 * const fifoQueue = manager.createQueue<string>('tasks', 'fifo');
 * const priorityQueue = manager.createQueue<Task>('urgent', 'priority');
 * const delayQueue = manager.createQueue<Task>('scheduled', 'delay');
 * 
 * // 获取队列
 * const tasks = manager.getQueue<string>('tasks');
 * 
 * // 删除队列
 * manager.deleteQueue('old-queue');
 * 
 * // 列出所有队列
 * const queues = manager.listQueues();
 * 
 * // 获取全局统计
 * const stats = manager.getStats();
 * ```
 */
export class QueueManager {
  private queues: Map<string, {
    type: QueueType;
    queue: MemoryQueue<any> | PriorityQueue<any> | DelayQueue<any>;
  }> = new Map();
  private options: Required<QueueManagerOptions>;

  constructor(options: QueueManagerOptions = {}) {
    this.options = {
      defaultType: options.defaultType ?? 'fifo',
      delayCheckInterval: options.delayCheckInterval ?? 1000,
    };
  }

  /**
   * 创建队列
   * 
   * @param name - 队列名称
   * @param type - 队列类型 (可选)
   * @param maxSize - 最大长度 (可选)
   * @returns 创建的队列实例
   */
  createQueue<T>(
    name: string,
    type: QueueType = this.options.defaultType,
    maxSize?: number
  ): MemoryQueue<T> | PriorityQueue<T> | DelayQueue<T> {
    if (this.queues.has(name)) {
      throw new Error(`Queue "${name}" already exists`);
    }

    let queue: MemoryQueue<T> | PriorityQueue<T> | DelayQueue<T>;

    switch (type) {
      case 'fifo':
        queue = new MemoryQueue<T>({ name, maxSize });
        break;
      case 'priority':
        queue = new PriorityQueue<T>({ name, maxSize });
        break;
      case 'delay':
        queue = new DelayQueue<T>({ name, maxSize, checkInterval: this.options.delayCheckInterval });
        break;
    }

    this.queues.set(name, { type, queue });
    return queue;
  }

  /**
   * 获取队列
   * 
   * @param name - 队列名称
   * @returns 队列实例，不存在时返回 undefined
   */
  getQueue<T>(name: string): MemoryQueue<T> | PriorityQueue<T> | DelayQueue<T> | undefined {
    return this.queues.get(name)?.queue as any;
  }

  /**
   * 删除队列
   * 
   * @param name - 队列名称
   * @returns 是否成功删除
   */
  deleteQueue(name: string): boolean {
    const queueData = this.queues.get(name);
    if (!queueData) {
      return false;
    }

    // 如果是延迟队列，先停止
    if (queueData.type === 'delay') {
      (queueData.queue as DelayQueue<any>).stop();
    }

    return this.queues.delete(name);
  }

  /**
   * 列出所有队列
   * 
   * @returns 队列信息列表
   */
  listQueues(): Array<{
    name: string;
    type: QueueType;
    size: number;
  }> {
    return Array.from(this.queues.entries()).map(([name, data]) => ({
      name,
      type: data.type,
      size: data.queue.size,
    }));
  }

  /**
   * 获取全局统计信息
   */
  getStats(): {
    totalQueues: number;
    totalItems: number;
    queues: Array<{
      name: string;
      type: QueueType;
      stats: QueueStats;
    }>;
  } {
    const queues = Array.from(this.queues.entries()).map(([name, data]) => ({
      name,
      type: data.type,
      stats: data.queue.getStats(),
    }));

    return {
      totalQueues: this.queues.size,
      totalItems: queues.reduce((sum, q) => sum + q.stats.size, 0),
      queues,
    };
  }

  /**
   * 清空所有队列
   */
  clearAll(): void {
    for (const [name, data] of this.queues.entries()) {
      if (data.type === 'delay') {
        (data.queue as DelayQueue<any>).stop();
      }
      data.queue.clear();
    }
  }
}

// ============== 导出 ==============

export {
  MemoryQueue,
  PriorityQueue,
  DelayQueue,
  QueueManager,
};

export type {
  QueueOptions,
  PriorityItem,
  DelayItem,
  QueueStats,
  DelayQueueOptions,
  DelayQueueCallback,
  QueueManagerOptions,
  QueueType,
};
