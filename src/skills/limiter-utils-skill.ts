/**
 * 限流器工具技能
 * 
 * 功能:
 * 1. 并发数限制 - 控制同时执行的任务数量
 * 2. 请求队列 - 自动排队等待执行的任务
 * 3. 优先级调度 - 支持高优先级任务插队
 * 
 * @module skills/limiter-utils
 */

// ==================== 类型定义 ====================

/**
 * 任务优先级
 */
export type Priority = 'low' | 'normal' | 'high' | 'critical';

/**
 * 任务状态
 */
export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

/**
 * 任务接口
 */
export interface Task<T = any> {
  id: string;
  priority: Priority;
  status: TaskStatus;
  execute: () => Promise<T>;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  result?: T;
  error?: Error;
}

/**
 * 限流器配置
 */
export interface LimiterOptions {
  /** 最大并发数，默认 5 */
  concurrency: number;
  /** 队列最大长度，默认 1000 */
  maxQueueSize: number;
  /** 任务超时时间 (ms)，默认 30000 */
  timeout: number;
  /** 是否自动重试失败任务，默认 false */
  autoRetry: boolean;
  /** 重试次数，默认 3 */
  retryCount: number;
  /** 重试延迟 (ms)，默认 1000 */
  retryDelay: number;
}

/**
 * 任务执行结果
 */
export interface TaskResult<T = any> {
  taskId: string;
  status: TaskStatus;
  result?: T;
  error?: Error;
  duration: number;
  priority: Priority;
}

/**
 * 限流器统计信息
 */
export interface LimiterStats {
  /** 当前运行任务数 */
  running: number;
  /** 等待中任务数 */
  pending: number;
  /** 已完成任务数 */
  completed: number;
  /** 失败任务数 */
  failed: number;
  /** 已取消任务数 */
  cancelled: number;
  /** 队列平均等待时间 (ms) */
  avgWaitTime: number;
  /** 任务平均执行时间 (ms) */
  avgExecTime: number;
}

// ==================== 优先级映射 ====================

const PRIORITY_MAP: Record<Priority, number> = {
  critical: 4,
  high: 3,
  normal: 2,
  low: 1,
};

// ==================== 限流器类 ====================

/**
 * 并发限流器
 * 
 * 特性:
 * - 可配置的并发数限制
 * - 自动请求队列管理
 * - 优先级调度 (高优先级可插队)
 * - 任务超时控制
 * - 自动重试机制
 * - 实时统计监控
 */
export class ConcurrencyLimiter {
  private concurrency: number;
  private maxQueueSize: number;
  private timeout: number;
  private autoRetry: boolean;
  private retryCount: number;
  private retryDelay: number;

  private runningTasks: Map<string, Task> = new Map();
  private pendingQueue: Task[] = [];
  
  private completedCount = 0;
  private failedCount = 0;
  private cancelledCount = 0;
  
  private totalWaitTime = 0;
  private totalExecTime = 0;
  private processedCount = 0;

  private isProcessing = false;
  private abortControllers: Map<string, AbortController> = new Map();

  constructor(options: Partial<LimiterOptions> = {}) {
    this.concurrency = options.concurrency ?? 5;
    this.maxQueueSize = options.maxQueueSize ?? 1000;
    this.timeout = options.timeout ?? 30000;
    this.autoRetry = options.autoRetry ?? false;
    this.retryCount = options.retryCount ?? 3;
    this.retryDelay = options.retryDelay ?? 1000;

    if (this.concurrency < 1) {
      throw new Error('并发数必须大于 0');
    }
    if (this.maxQueueSize < 1) {
      throw new Error('队列最大长度必须大于 0');
    }
  }

  /**
   * 生成唯一任务 ID
   */
  private generateTaskId(): string {
    return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 添加任务到队列
   * 
   * @param execute - 任务执行函数
   * @param priority - 优先级，默认 'normal'
   * @returns 任务 ID
   */
  public async add<T>(
    execute: () => Promise<T>,
    priority: Priority = 'normal'
  ): Promise<TaskResult<T>> {
    const taskId = this.generateTaskId();
    
    if (this.pendingQueue.length >= this.maxQueueSize) {
      throw new Error(`队列已满 (最大长度：${this.maxQueueSize})`);
    }

    const task: Task<T> = {
      id: taskId,
      priority,
      status: 'pending',
      execute,
      createdAt: Date.now(),
    };

    return new Promise((resolve, reject) => {
      this.pendingQueue.push(task);
      this.sortQueue();
      this.processQueue();

      // 轮询任务结果
      const checkInterval = setInterval(() => {
        if (task.status === 'completed') {
          clearInterval(checkInterval);
          resolve({
            taskId: task.id,
            status: task.status,
            result: task.result,
            duration: (task.completedAt ?? Date.now()) - (task.startedAt ?? task.createdAt),
            priority: task.priority,
          });
        } else if (task.status === 'failed') {
          clearInterval(checkInterval);
          resolve({
            taskId: task.id,
            status: task.status,
            error: task.error,
            duration: (task.completedAt ?? Date.now()) - (task.startedAt ?? task.createdAt),
            priority: task.priority,
          });
        } else if (task.status === 'cancelled') {
          clearInterval(checkInterval);
          reject(new Error('任务已取消'));
        }
      }, 10);
    });
  }

  /**
   * 批量添加任务
   * 
   * @param tasks - 任务函数数组
   * @param priority - 优先级，默认 'normal'
   * @returns 所有任务的结果
   */
  public async addBatch<T>(
    tasks: Array<() => Promise<T>>,
    priority: Priority = 'normal'
  ): Promise<TaskResult<T>[]> {
    const promises = tasks.map(task => this.add(task, priority));
    return Promise.all(promises);
  }

  /**
   * 取消任务
   * 
   * @param taskId - 任务 ID
   * @returns 是否成功取消
   */
  public cancel(taskId: string): boolean {
    // 检查是否在等待队列中
    const pendingIndex = this.pendingQueue.findIndex(t => t.id === taskId);
    if (pendingIndex !== -1) {
      this.pendingQueue.splice(pendingIndex, 1);
      const task = this.pendingQueue[pendingIndex];
      if (task) {
        task.status = 'cancelled';
        task.completedAt = Date.now();
        this.cancelledCount++;
      }
      return true;
    }

    // 检查是否在运行中
    const runningTask = this.runningTasks.get(taskId);
    if (runningTask) {
      const controller = this.abortControllers.get(taskId);
      if (controller) {
        controller.abort();
      }
      runningTask.status = 'cancelled';
      runningTask.completedAt = Date.now();
      this.runningTasks.delete(taskId);
      this.abortControllers.delete(taskId);
      this.cancelledCount++;
      this.processQueue();
      return true;
    }

    return false;
  }

  /**
   * 取消所有任务
   */
  public cancelAll(): void {
    this.pendingQueue.forEach(task => {
      task.status = 'cancelled';
      task.completedAt = Date.now();
      this.cancelledCount++;
    });
    this.pendingQueue = [];

    this.runningTasks.forEach((task, taskId) => {
      const controller = this.abortControllers.get(taskId);
      if (controller) {
        controller.abort();
      }
      task.status = 'cancelled';
      task.completedAt = Date.now();
      this.cancelledCount++;
    });
    this.runningTasks.clear();
    this.abortControllers.clear();
  }

  /**
   * 获取统计信息
   */
  public getStats(): LimiterStats {
    const avgWaitTime = this.processedCount > 0 
      ? this.totalWaitTime / this.processedCount 
      : 0;
    const avgExecTime = this.processedCount > 0 
      ? this.totalExecTime / this.processedCount 
      : 0;

    return {
      running: this.runningTasks.size,
      pending: this.pendingQueue.length,
      completed: this.completedCount,
      failed: this.failedCount,
      cancelled: this.cancelledCount,
      avgWaitTime,
      avgExecTime,
    };
  }

  /**
   * 重置统计信息
   */
  public resetStats(): void {
    this.completedCount = 0;
    this.failedCount = 0;
    this.cancelledCount = 0;
    this.totalWaitTime = 0;
    this.totalExecTime = 0;
    this.processedCount = 0;
  }

  /**
   * 获取当前并发数
   */
  public getConcurrency(): number {
    return this.concurrency;
  }

  /**
   * 设置并发数
   */
  public setConcurrency(concurrency: number): void {
    if (concurrency < 1) {
      throw new Error('并发数必须大于 0');
    }
    this.concurrency = concurrency;
    this.processQueue();
  }

  /**
   * 清空队列
   */
  public clearQueue(): void {
    this.pendingQueue.forEach(task => {
      task.status = 'cancelled';
      task.completedAt = Date.now();
      this.cancelledCount++;
    });
    this.pendingQueue = [];
  }

  /**
   * 按优先级排序队列
   */
  private sortQueue(): void {
    this.pendingQueue.sort((a, b) => {
      // 首先按优先级排序
      const priorityDiff = PRIORITY_MAP[b.priority] - PRIORITY_MAP[a.priority];
      if (priorityDiff !== 0) {
        return priorityDiff;
      }
      // 优先级相同时按创建时间排序 (FIFO)
      return a.createdAt - b.createdAt;
    });
  }

  /**
   * 处理队列
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing) {
      return;
    }

    this.isProcessing = true;

    try {
      while (
        this.runningTasks.size < this.concurrency &&
        this.pendingQueue.length > 0
      ) {
        const task = this.pendingQueue.shift();
        if (!task) break;

        this.runningTasks.set(task.id, task);
        this.executeTask(task);
      }
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * 执行单个任务
   */
  private async executeTask<T>(task: Task<T>): Promise<void> {
    const controller = new AbortController();
    this.abortControllers.set(task.id, controller);

    task.status = 'running';
    task.startedAt = Date.now();

    // 计算等待时间
    const waitTime = task.startedAt - task.createdAt;
    this.totalWaitTime += waitTime;

    try {
      // 设置超时
      const timeoutPromise = new Promise<never>((_, reject) => {
        const timeoutId = setTimeout(() => {
          controller.abort();
          reject(new Error(`任务超时 (${this.timeout}ms)`));
        }, this.timeout);

        controller.signal.addEventListener('abort', () => {
          clearTimeout(timeoutId);
        });
      });

      const result = await Promise.race([
        task.execute(),
        timeoutPromise,
      ]);

      task.result = result;
      task.status = 'completed';
      task.completedAt = Date.now();
      this.completedCount++;

      const execTime = task.completedAt - task.startedAt;
      this.totalExecTime += execTime;
      this.processedCount++;
    } catch (error) {
      task.error = error as Error;
      
      // 自动重试逻辑
      if (this.autoRetry && this.shouldRetry(task)) {
        task.status = 'pending';
        task.startedAt = undefined;
        task.completedAt = undefined;
        
        // 延迟后重新加入队列
        setTimeout(() => {
          this.pendingQueue.push(task);
          this.sortQueue();
          this.processQueue();
        }, this.retryDelay);
      } else {
        task.status = 'failed';
        task.completedAt = Date.now();
        this.failedCount++;
        this.processedCount++;
      }
    } finally {
      this.runningTasks.delete(task.id);
      this.abortControllers.delete(task.id);
      this.processQueue();
    }
  }

  /**
   * 判断是否应该重试
   */
  private shouldRetry<T>(task: Task<T>): boolean {
    // 检查重试次数 (通过错误消息判断)
    if (!task.error) return true;
    
    const retryMatch = task.error.message.match(/重试次数：(\d+)/);
    const currentRetry = retryMatch ? parseInt(retryMatch[1]) : 0;
    
    return currentRetry < this.retryCount;
  }
}

// ==================== 便捷函数 ====================

/**
 * 创建限流器实例
 * 
 * @param concurrency - 最大并发数，默认 5
 * @returns 限流器实例
 */
export function createLimiter(concurrency: number = 5): ConcurrencyLimiter {
  return new ConcurrencyLimiter({ concurrency });
}

/**
 * 批量执行任务 (带并发限制)
 * 
 * @param tasks - 任务函数数组
 * @param concurrency - 最大并发数，默认 5
 * @returns 所有任务的结果
 */
export async function executeWithConcurrency<T>(
  tasks: Array<() => Promise<T>>,
  concurrency: number = 5
): Promise<T[]> {
  const limiter = new ConcurrencyLimiter({ concurrency });
  const results = await limiter.addBatch(tasks);
  return results.map(r => {
    if (r.status === 'failed') {
      throw r.error;
    }
    return r.result as T;
  });
}

/**
 * 带优先级的批量执行
 * 
 * @param taskGroups - 任务组 { priority: tasks }
 * @param concurrency - 最大并发数，默认 5
 * @returns 所有任务的结果
 */
export async function executeWithPriority<T>(
  taskGroups: Record<Priority, Array<() => Promise<T>>>,
  concurrency: number = 5
): Promise<TaskResult<T>[]> {
  const limiter = new ConcurrencyLimiter({ concurrency });
  const allPromises: Promise<TaskResult<T>>[] = [];

  // 按优先级添加任务 (critical -> high -> normal -> low)
  const priorities: Priority[] = ['critical', 'high', 'normal', 'low'];
  
  for (const priority of priorities) {
    const tasks = taskGroups[priority] || [];
    for (const task of tasks) {
      allPromises.push(limiter.add(task, priority));
    }
  }

  return Promise.all(allPromises);
}

// ==================== 使用示例 ====================

/**
 * 使用示例代码
 * 
 * @example
 * // 基础用法
 * const limiter = new ConcurrencyLimiter({ concurrency: 3 });
 * 
 * const result = await limiter.add(async () => {
 *   return await fetchData();
 * });
 * 
 * @example
 * // 优先级调度
 * const limiter = new ConcurrencyLimiter({ concurrency: 2 });
 * 
 * // 普通任务
 * limiter.add(() => task1(), 'normal');
 * limiter.add(() => task2(), 'normal');
 * 
 * // 高优先级任务 (会插队)
 * limiter.add(() => urgentTask(), 'critical');
 * 
 * @example
 * // 批量执行
 * const tasks = [
 *   () => fetchUrl('https://api1.com'),
 *   () => fetchUrl('https://api2.com'),
 *   () => fetchUrl('https://api3.com'),
 * ];
 * 
 * const results = await limiter.addBatch(tasks, 'high');
 * 
 * @example
 * // 任务取消
 * const taskId = await limiter.add(() => longRunningTask());
 * 
 * // 取消任务
 * limiter.cancel(taskId);
 * 
 * @example
 * // 统计监控
 * const stats = limiter.getStats();
 * console.log(`运行中：${stats.running}, 等待中：${stats.pending}`);
 */
export const examples = {
  basic: async () => {
    const limiter = new ConcurrencyLimiter({ concurrency: 3 });
    
    const results = await Promise.all([
      limiter.add(() => Promise.resolve('Task 1')),
      limiter.add(() => Promise.resolve('Task 2')),
      limiter.add(() => Promise.resolve('Task 3')),
      limiter.add(() => Promise.resolve('Task 4')),
      limiter.add(() => Promise.resolve('Task 5')),
    ]);
    
    return results;
  },

  priority: async () => {
    const limiter = new ConcurrencyLimiter({ concurrency: 2 });
    
    // 添加低优先级任务
    limiter.add(() => sleep(1000).then(() => 'Low 1'), 'low');
    limiter.add(() => sleep(1000).then(() => 'Low 2'), 'low');
    
    // 添加高优先级任务 (会插队)
    const urgent = await limiter.add(() => sleep(500).then(() => 'URGENT'), 'critical');
    
    return urgent;
  },

  batch: async () => {
    const limiter = new ConcurrencyLimiter({ concurrency: 5 });
    
    const tasks = Array.from({ length: 10 }, (_, i) => 
      () => sleep(100).then(() => `Result ${i}`)
    );
    
    const results = await limiter.addBatch(tasks);
    return results;
  },

  cancellation: async () => {
    const limiter = new ConcurrencyLimiter({ concurrency: 2 });
    
    const taskId = await limiter.add(() => sleep(10000).then(() => 'Done'));
    
    // 立即取消
    limiter.cancel(taskId);
    
    return 'Cancelled';
  },

  stats: async () => {
    const limiter = new ConcurrencyLimiter({ concurrency: 3 });
    
    // 添加一些任务
    await Promise.all([
      limiter.add(() => sleep(100).then(() => '1')),
      limiter.add(() => sleep(100).then(() => '2')),
      limiter.add(() => sleep(100).then(() => '3')),
    ]);
    
    const stats = limiter.getStats();
    return stats;
  },
};

// ==================== 辅助函数 ====================

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export default ConcurrencyLimiter;
