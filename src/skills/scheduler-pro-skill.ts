/**
 * Scheduler Pro Skill - 专业任务调度器
 * 
 * 提供企业级任务调度能力：
 * 1. 任务定义 - 灵活的任务配置与元数据
 * 2. 调度策略 - 多种调度算法 (FIFO/优先级/轮询/速率限制)
 * 3. 执行监控 - 实时状态追踪与性能指标
 * 
 * @author Axon (ACE Professional Scheduler)
 * @version 1.0.0
 * @since 2026-03-13
 */

import { EventEmitter } from 'events';

// ============================================
// 类型定义
// ============================================

/**
 * 任务状态枚举
 */
export enum TaskStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

/**
 * 调度策略类型
 */
export enum SchedulingStrategy {
  FIFO = 'fifo',              // 先进先出
  PRIORITY = 'priority',      // 优先级调度
  ROUND_ROBIN = 'round-robin',// 轮询调度
  RATE_LIMITED = 'rate-limited', // 速率限制
}

/**
 * 任务优先级
 */
export enum TaskPriority {
  LOW = 1,
  NORMAL = 5,
  HIGH = 10,
  CRITICAL = 100,
}

/**
 * 任务执行结果
 */
export interface TaskResult {
  success: boolean;
  data?: any;
  error?: string;
  duration: number; // 执行时长 (ms)
}

/**
 * 任务定义
 */
export interface Task {
  id: string;
  name: string;
  handler: () => Promise<any>;
  priority?: TaskPriority;
  status?: TaskStatus;
  retryCount?: number;
  maxRetries?: number;
  timeout?: number; // 超时时间 (ms)
  tags?: string[];
  metadata?: Record<string, any>;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  result?: TaskResult;
}

/**
 * 调度策略配置
 */
export interface StrategyConfig {
  type: SchedulingStrategy;
  maxConcurrent?: number;      // 最大并发数
  rateLimit?: number;          // 每秒最大任务数 (rate-limited 策略)
  priorityBoost?: boolean;     // 是否启用优先级提升
}

/**
 * 任务执行上下文
 */
export interface ExecutionContext {
  taskId: string;
  attempt: number;
  signal: AbortSignal;
}

/**
 * 调度器统计信息
 */
export interface SchedulerStats {
  totalTasks: number;
  pendingTasks: number;
  runningTasks: number;
  completedTasks: number;
  failedTasks: number;
  cancelledTasks: number;
  avgExecutionTime: number;
  successRate: number;
  throughput: number; // 任务/秒
}

/**
 * 调度器事件
 */
export interface SchedulerEvents {
  'task:added': (task: Task) => void;
  'task:started': (task: Task) => void;
  'task:completed': (task: Task, result: TaskResult) => void;
  'task:failed': (task: Task, error: Error) => void;
  'task:cancelled': (task: Task) => void;
  'task:retry': (task: Task, attempt: number) => void;
  'scheduler:start': () => void;
  'scheduler:stop': () => void;
  'scheduler:error': (error: Error) => void;
}

// ============================================
// 任务队列实现
// ============================================

/**
 * 优先级队列
 */
class PriorityTaskQueue {
  private tasks: Task[] = [];

  enqueue(task: Task): void {
    this.tasks.push(task);
    this.tasks.sort((a, b) => {
      const priorityA = a.priority ?? TaskPriority.NORMAL;
      const priorityB = b.priority ?? TaskPriority.NORMAL;
      return priorityB - priorityA; // 高优先级在前
    });
  }

  dequeue(): Task | undefined {
    return this.tasks.shift();
  }

  peek(): Task | undefined {
    return this.tasks[0];
  }

  isEmpty(): boolean {
    return this.tasks.length === 0;
  }

  size(): number {
    return this.tasks.length;
  }

  clear(): void {
    this.tasks = [];
  }

  toArray(): Task[] {
    return [...this.tasks];
  }
}

// ============================================
// 调度策略实现
// ============================================

/**
 * 调度策略接口
 */
interface ISchedulingStrategy {
  name: SchedulingStrategy;
  selectNext(queue: PriorityTaskQueue, activeCount: number, config: StrategyConfig): Task | null;
}

/**
 * FIFO 策略 - 先进先出
 */
class FIFOStrategy implements ISchedulingStrategy {
  name = SchedulingStrategy.FIFO;

  selectNext(queue: PriorityTaskQueue): Task | null {
    return queue.dequeue() || null;
  }
}

/**
 * 优先级策略 - 高优先级优先
 */
class PriorityStrategy implements ISchedulingStrategy {
  name = SchedulingStrategy.PRIORITY;

  selectNext(queue: PriorityTaskQueue): Task | null {
    return queue.dequeue() || null; // 队列已按优先级排序
  }
}

/**
 * 轮询策略 - 按标签轮询
 */
class RoundRobinStrategy implements ISchedulingStrategy {
  name = SchedulingStrategy.ROUND_ROBIN;
  private lastIndex = 0;

  selectNext(queue: PriorityTaskQueue): Task | null {
    const tasks = queue.toArray();
    if (tasks.length === 0) return null;

    // 简单轮询：按索引选择
    const task = tasks[this.lastIndex % tasks.length];
    this.lastIndex++;
    
    // 从队列中移除选中的任务
    queue.dequeue();
    return task;
  }
}

/**
 * 速率限制策略 - 控制执行频率
 */
class RateLimitedStrategy implements ISchedulingStrategy {
  name = SchedulingStrategy.RATE_LIMITED;
  private lastExecutionTime = 0;
  private minInterval = 0;

  constructor(rateLimit: number) {
    this.minInterval = 1000 / rateLimit; // ms
  }

  selectNext(queue: PriorityTaskQueue, activeCount: number, config: StrategyConfig): Task | null {
    const now = Date.now();
    const timeSinceLast = now - this.lastExecutionTime;

    if (timeSinceLast < this.minInterval) {
      return null; // 速率限制中
    }

    this.lastExecutionTime = now;
    return queue.dequeue() || null;
  }
}

// ============================================
// 主调度器类
// ============================================

export class SchedulerPro extends EventEmitter {
  private queue: PriorityTaskQueue;
  private activeTasks: Map<string, Task>;
  private strategy: ISchedulingStrategy;
  private config: StrategyConfig;
  private running: boolean = false;
  private stats: {
    completed: number;
    failed: number;
    cancelled: number;
    totalExecutionTime: number;
    startTime: number;
  };
  private executionTimers: Map<string, NodeJS.Timeout>;

  constructor(config: StrategyConfig = { type: SchedulingStrategy.PRIORITY, maxConcurrent: 3 }) {
    super();
    this.queue = new PriorityTaskQueue();
    this.activeTasks = new Map();
    this.config = config;
    this.strategy = this.createStrategy(config);
    this.stats = {
      completed: 0,
      failed: 0,
      cancelled: 0,
      totalExecutionTime: 0,
      startTime: Date.now(),
    };
    this.executionTimers = new Map();
  }

  /**
   * 创建调度策略实例
   */
  private createStrategy(config: StrategyConfig): ISchedulingStrategy {
    switch (config.type) {
      case SchedulingStrategy.FIFO:
        return new FIFOStrategy();
      case SchedulingStrategy.PRIORITY:
        return new PriorityStrategy();
      case SchedulingStrategy.ROUND_ROBIN:
        return new RoundRobinStrategy();
      case SchedulingStrategy.RATE_LIMITED:
        return new RateLimitedStrategy(config.rateLimit || 10);
      default:
        return new PriorityStrategy();
    }
  }

  /**
   * 添加任务
   */
  addTask(task: Omit<Task, 'status' | 'createdAt'>): string {
    const fullTask: Task = {
      ...task,
      status: TaskStatus.PENDING,
      createdAt: new Date(),
      retryCount: task.retryCount ?? 0,
      maxRetries: task.maxRetries ?? 3,
    };

    this.queue.enqueue(fullTask);
    this.emit('task:added', fullTask);

    // 如果调度器运行中，尝试执行
    if (this.running) {
      this.tryExecuteNext();
    }

    return fullTask.id;
  }

  /**
   * 尝试执行下一个任务
   */
  private tryExecuteNext(): void {
    if (!this.running) return;

    const maxConcurrent = this.config.maxConcurrent ?? 3;
    if (this.activeTasks.size >= maxConcurrent) return;

    const nextTask = this.strategy.selectNext(
      this.queue,
      this.activeTasks.size,
      this.config
    );

    if (nextTask) {
      this.executeTask(nextTask);
    }
  }

  /**
   * 执行任务
   */
  private async executeTask(task: Task): Promise<void> {
    task.status = TaskStatus.RUNNING;
    task.startedAt = new Date();
    this.activeTasks.set(task.id, task);
    this.emit('task:started', task);

    const startTime = Date.now();
    const abortController = new AbortController();

    // 设置超时
    let timeoutId: NodeJS.Timeout | undefined;
    if (task.timeout) {
      timeoutId = setTimeout(() => {
        abortController.abort();
      }, task.timeout);
      this.executionTimers.set(task.id, timeoutId);
    }

    try {
      const result = await Promise.race([
        task.handler(),
        new Promise<any>((_, reject) => {
          abortController.signal.addEventListener('abort', () => {
            reject(new Error(`Task ${task.id} timed out after ${task.timeout}ms`));
          });
        }),
      ]);

      const duration = Date.now() - startTime;
      task.result = {
        success: true,
        data: result,
        duration,
      };
      task.status = TaskStatus.COMPLETED;
      task.completedAt = new Date();

      this.stats.completed++;
      this.stats.totalExecutionTime += duration;

      this.emit('task:completed', task, task.result);
    } catch (error) {
      const duration = Date.now() - startTime;
      const err = error as Error;

      // 检查是否应该重试
      if (task.retryCount! < task.maxRetries!) {
        task.retryCount!++;
        task.status = TaskStatus.PENDING;
        task.startedAt = undefined;
        
        this.emit('task:retry', task, task.retryCount!);
        this.queue.enqueue(task);
        
        // 立即尝试重新执行
        setImmediate(() => this.tryExecuteNext());
      } else {
        task.result = {
          success: false,
          error: err.message,
          duration,
        };
        task.status = TaskStatus.FAILED;
        task.completedAt = new Date();

        this.stats.failed++;
        this.emit('task:failed', task, err);
      }
    } finally {
      // 清理超时定时器
      if (timeoutId) {
        clearTimeout(timeoutId);
        this.executionTimers.delete(task.id);
      }

      this.activeTasks.delete(task.id);
      
      // 执行下一个任务
      setImmediate(() => this.tryExecuteNext());
    }
  }

  /**
   * 取消任务
   */
  cancelTask(taskId: string): boolean {
    const task = this.activeTasks.get(taskId);
    if (task && task.status === TaskStatus.RUNNING) {
      task.status = TaskStatus.CANCELLED;
      task.completedAt = new Date();
      this.stats.cancelled++;
      this.emit('task:cancelled', task);
      
      // 清理超时定时器
      const timeoutId = this.executionTimers.get(taskId);
      if (timeoutId) {
        clearTimeout(timeoutId);
        this.executionTimers.delete(taskId);
      }
      
      return true;
    }

    // 从队列中移除
    const queueTasks = this.queue.toArray();
    const queuedTask = queueTasks.find(t => t.id === taskId);
    if (queuedTask) {
      queuedTask.status = TaskStatus.CANCELLED;
      queuedTask.completedAt = new Date();
      this.stats.cancelled++;
      this.emit('task:cancelled', queuedTask);
      return true;
    }

    return false;
  }

  /**
   * 获取任务状态
   */
  getTask(taskId: string): Task | undefined {
    return this.activeTasks.get(taskId) || this.queue.toArray().find(t => t.id === taskId);
  }

  /**
   * 启动调度器
   */
  start(): void {
    if (this.running) return;

    this.running = true;
    this.stats.startTime = Date.now();
    this.emit('scheduler:start');

    // 开始执行队列中的任务
    const maxConcurrent = this.config.maxConcurrent ?? 3;
    for (let i = 0; i < maxConcurrent; i++) {
      this.tryExecuteNext();
    }
  }

  /**
   * 停止调度器
   */
  stop(): void {
    if (!this.running) return;

    this.running = false;
    this.emit('scheduler:stop');

    // 清理所有超时定时器
    for (const [taskId, timeoutId] of this.executionTimers.entries()) {
      clearTimeout(timeoutId);
    }
    this.executionTimers.clear();
  }

  /**
   * 清空队列
   */
  clear(): void {
    this.queue.clear();
    this.activeTasks.clear();
    this.executionTimers.clear();
  }

  /**
   * 获取统计信息
   */
  getStats(): SchedulerStats {
    const queueTasks = this.queue.toArray();
    const now = Date.now();
    const uptimeSeconds = (now - this.stats.startTime) / 1000;

    const total = this.stats.completed + this.stats.failed + this.stats.cancelled;
    const successRate = total > 0 ? (this.stats.completed / total) * 100 : 0;
    const avgExecutionTime = this.stats.completed > 0
      ? this.stats.totalExecutionTime / this.stats.completed
      : 0;
    const throughput = uptimeSeconds > 0 ? this.stats.completed / uptimeSeconds : 0;

    return {
      totalTasks: total + queueTasks.length + this.activeTasks.size,
      pendingTasks: queueTasks.length,
      runningTasks: this.activeTasks.size,
      completedTasks: this.stats.completed,
      failedTasks: this.stats.failed,
      cancelledTasks: this.stats.cancelled,
      avgExecutionTime,
      successRate,
      throughput,
    };
  }

  /**
   * 获取所有任务
   */
  getAllTasks(): Task[] {
    return [...this.queue.toArray(), ...Array.from(this.activeTasks.values())];
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<StrategyConfig>): void {
    this.config = { ...this.config, ...config };
    this.strategy = this.createStrategy(this.config);
  }
}

// ============================================
// 便捷工厂函数
// ============================================

/**
 * 创建 FIFO 调度器
 */
export function createFIFOScheduler(maxConcurrent: number = 3): SchedulerPro {
  return new SchedulerPro({
    type: SchedulingStrategy.FIFO,
    maxConcurrent,
  });
}

/**
 * 创建优先级调度器
 */
export function createPriorityScheduler(maxConcurrent: number = 3): SchedulerPro {
  return new SchedulerPro({
    type: SchedulingStrategy.PRIORITY,
    maxConcurrent,
  });
}

/**
 * 创建速率限制调度器
 */
export function createRateLimitedScheduler(rateLimit: number = 10, maxConcurrent: number = 3): SchedulerPro {
  return new SchedulerPro({
    type: SchedulingStrategy.RATE_LIMITED,
    rateLimit,
    maxConcurrent,
  });
}

/**
 * 默认导出单例
 */
export const scheduler = new SchedulerPro();

export default SchedulerPro;
