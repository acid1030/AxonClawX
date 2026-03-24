/**
 * Scheduler Utils Skill - ACE 任务调度器
 * 
 * 功能:
 * 1. 定时任务 - 支持 Cron 表达式和延迟执行
 * 2. 任务队列 - 优先级队列、并发控制
 * 3. 任务取消 - 支持运行中任务取消
 * 
 * @author ACE
 * @version 1.0.0
 */

// ==================== 类型定义 ====================

export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface TaskOptions {
  id?: string;
  name?: string;
  priority?: number;      // 1-10, 1 = highest
  timeout?: number;       // ms
  retries?: number;
  delay?: number;         // ms (延迟执行)
  cron?: string;          // Cron 表达式 (定时任务)
  tags?: string[];
}

export interface Task {
  id: string;
  name: string;
  handler: () => Promise<void>;
  options: TaskOptions;
  status: TaskStatus;
  priority: number;
  createdAt: number;
  scheduledAt?: number;
  startedAt?: number;
  completedAt?: number;
  retryCount: number;
  error?: Error;
  result?: unknown;
  cancelToken?: CancellationToken;
}

export interface QueueStats {
  pending: number;
  running: number;
  completed: number;
  failed: number;
  cancelled: number;
  total: number;
}

// ==================== 取消令牌 ====================

export class CancellationToken {
  private _cancelled = false;
  private listeners: Array<() => void> = [];

  get cancelled(): boolean {
    return this._cancelled;
  }

  cancel(): void {
    if (this._cancelled) return;
    this._cancelled = true;
    this.listeners.forEach(fn => fn());
  }

  onCancel(callback: () => void): void {
    if (this._cancelled) {
      callback();
    } else {
      this.listeners.push(callback);
    }
  }

  static create(): CancellationToken {
    return new CancellationToken();
  }
}

// ==================== Cron 解析器 (简化版) ====================

export class CronParser {
  static parse(expression: string): { minute: number[]; hour: number[]; dayOfMonth: number[]; month: number[]; dayOfWeek: number[] } {
    const parts = expression.trim().split(/\s+/);
    if (parts.length !== 5) {
      throw new Error(`Invalid cron: expected 5 parts, got ${parts.length}`);
    }

    const parseField = (field: string, min: number, max: number): number[] => {
      const values = new Set<number>();
      for (const part of field.split(',')) {
        const [range, stepStr] = part.split('/');
        const step = stepStr ? parseInt(stepStr, 10) : 1;

        if (range === '*') {
          for (let i = min; i <= max; i += step) values.add(i);
        } else if (range.includes('-')) {
          const [start, end] = range.split('-').map(Number);
          for (let i = start; i <= end; i += step) values.add(i);
        } else {
          values.add(parseInt(range, 10));
        }
      }
      return Array.from(values).sort((a, b) => a - b);
    };

    return {
      minute: parseField(parts[0], 0, 59),
      hour: parseField(parts[1], 0, 23),
      dayOfMonth: parseField(parts[2], 1, 31),
      month: parseField(parts[3], 1, 12),
      dayOfWeek: parseField(parts[4], 0, 6),
    };
  }

  static getNextRun(cron: string, fromDate: Date = new Date()): Date {
    const parsed = this.parse(cron);
    const date = new Date(fromDate);
    date.setSeconds(0, 0);
    date.setMinutes(date.getMinutes() + 1);

    for (let i = 0; i < 366 * 24 * 60; i++) {
      if (
        parsed.minute.includes(date.getMinutes()) &&
        parsed.hour.includes(date.getHours()) &&
        parsed.dayOfMonth.includes(date.getDate()) &&
        parsed.month.includes(date.getMonth() + 1) &&
        parsed.dayOfWeek.includes(date.getDay())
      ) {
        return date;
      }
      date.setMinutes(date.getMinutes() + 1);
    }
    throw new Error('Could not find next run time');
  }

  static validate(expression: string): boolean {
    try {
      this.parse(expression);
      return true;
    } catch {
      return false;
    }
  }
}

// ==================== 任务调度器 ====================

export class Scheduler {
  private tasks: Map<string, Task> = new Map();
  private queue: Task[] = [];
  private timers: Map<string, NodeJS.Timeout> = new Map();
  private runningTasks: Set<string> = new Set();
  private maxConcurrent: number;
  private stats: { completed: number; failed: number; cancelled: number } = { completed: 0, failed: 0, cancelled: 0 };

  constructor(options: { maxConcurrent?: number } = {}) {
    this.maxConcurrent = options.maxConcurrent ?? 5;
  }

  /**
   * 添加任务到队列
   */
  add(handler: () => Promise<void>, options: TaskOptions = {}): Task {
    const id = options.id ?? `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const cancelToken = CancellationToken.create();
    
    const task: Task = {
      id,
      name: options.name ?? `Task ${id}`,
      handler,
      options,
      status: 'pending',
      priority: options.priority ?? 5,
      createdAt: Date.now(),
      scheduledAt: options.delay ? Date.now() + options.delay : undefined,
      retryCount: 0,
      cancelToken,
    };

    this.tasks.set(id, task);

    if (options.cron) {
      // 定时任务
      this.scheduleCronTask(task, options.cron);
    } else if (options.delay) {
      // 延迟任务
      this.scheduleDelayedTask(task, options.delay);
    } else {
      // 立即执行
      this.queue.push(task);
      this.processQueue();
    }

    return task;
  }

  /**
   * 取消任务
   */
  cancel(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task || task.status === 'completed' || task.status === 'cancelled') return false;

    // 取消运行中的任务
    if (task.status === 'running' && task.cancelToken) {
      task.cancelToken.cancel();
    }

    // 清除定时器
    const timer = this.timers.get(taskId);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(taskId);
    }

    // 从队列移除
    const queueIndex = this.queue.findIndex(t => t.id === taskId);
    if (queueIndex > -1) {
      this.queue.splice(queueIndex, 1);
    }

    task.status = 'cancelled';
    task.completedAt = Date.now();
    this.stats.cancelled++;

    console.log(`[Scheduler] Cancelled task: ${task.name} (${taskId})`);
    return true;
  }

  /**
   * 取消所有任务
   */
  cancelAll(): void {
    for (const task of this.tasks.values()) {
      this.cancel(task.id);
    }
  }

  /**
   * 获取任务
   */
  getTask(taskId: string): Task | undefined {
    return this.tasks.get(taskId);
  }

  /**
   * 获取所有任务
   */
  getTasks(): Task[] {
    return Array.from(this.tasks.values());
  }

  /**
   * 获取按状态过滤的任务
   */
  getTasksByStatus(status: TaskStatus): Task[] {
    return this.getTasks().filter(t => t.status === status);
  }

  /**
   * 获取队列统计
   */
  getStats(): QueueStats {
    const tasks = this.getTasks();
    return {
      pending: tasks.filter(t => t.status === 'pending').length,
      running: tasks.filter(t => t.status === 'running').length,
      completed: this.stats.completed,
      failed: this.stats.failed,
      cancelled: this.stats.cancelled,
      total: tasks.length,
    };
  }

  /**
   * 等待任务完成
   */
  async waitForTask(taskId: string, timeout?: number): Promise<Task> {
    const task = this.tasks.get(taskId);
    if (!task) throw new Error(`Task not found: ${taskId}`);

    const startTime = Date.now();
    while (task.status === 'pending' || task.status === 'running') {
      if (timeout && Date.now() - startTime > timeout) {
        throw new Error(`Timeout waiting for task: ${taskId}`);
      }
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    return task;
  }

  /**
   * 等待所有任务完成
   */
  async waitForAll(timeout?: number): Promise<void> {
    const startTime = Date.now();
    while (this.runningTasks.size > 0 || this.queue.length > 0) {
      if (timeout && Date.now() - startTime > timeout) {
        throw new Error('Timeout waiting for all tasks');
      }
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }

  /**
   * 清空已完成/失败/取消的任务
   */
  clearFinished(): number {
    const finishedTasks = this.getTasks().filter(
      t => t.status === 'completed' || t.status === 'failed' || t.status === 'cancelled'
    );
    finishedTasks.forEach(task => {
      this.tasks.delete(task.id);
      const queueIndex = this.queue.findIndex(t => t.id === task.id);
      if (queueIndex > -1) this.queue.splice(queueIndex, 1);
    });
    return finishedTasks.length;
  }

  /**
   * 停止调度器
   */
  stop(): void {
    this.cancelAll();
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    this.timers.clear();
    console.log('[Scheduler] Stopped');
  }

  // ==================== 私有方法 ====================

  private scheduleCronTask(task: Task, cron: string): void {
    const scheduleNext = () => {
      if (task.status === 'cancelled') return;
      try {
        const nextRun = CronParser.getNextRun(cron);
        const delay = nextRun.getTime() - Date.now();
        
        task.scheduledAt = nextRun.getTime();
        console.log(`[Scheduler] Scheduled cron task "${task.name}" for ${nextRun.toISOString()}`);

        const timer = setTimeout(() => {
          this.executeTask(task);
        }, delay);

        this.timers.set(task.id, timer);
      } catch (error) {
        console.error(`[Scheduler] Failed to schedule cron task: ${task.name}`, error);
      }
    };

    scheduleNext();
  }

  private scheduleDelayedTask(task: Task, delay: number): void {
    task.scheduledAt = Date.now() + delay;
    console.log(`[Scheduler] Scheduled delayed task "${task.name}" in ${delay}ms`);

    const timer = setTimeout(() => {
      this.queue.push(task);
      this.processQueue();
    }, delay);

    this.timers.set(task.id, timer);
  }

  private async processQueue(): Promise<void> {
    while (this.queue.length > 0 && this.runningTasks.size < this.maxConcurrent) {
      // 按优先级排序
      this.queue.sort((a, b) => {
        if (a.priority !== b.priority) return a.priority - b.priority;
        return a.createdAt - b.createdAt;
      });

      const task = this.queue.shift();
      if (task && task.status === 'pending') {
        this.executeTask(task);
      }
    }
  }

  private async executeTask(task: Task): Promise<void> {
    if (task.status === 'cancelled') return;

    this.runningTasks.add(task.id);
    task.status = 'running';
    task.startedAt = Date.now();

    console.log(`[Scheduler] Executing task: ${task.name} (${task.id})`);

    try {
      const timeout = task.options.timeout ?? 300000; // 5 分钟默认超时
      
      await Promise.race([
        task.handler(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Task timeout')), timeout)
        ),
        new Promise((_, reject) =>
          task.cancelToken?.onCancel(() => reject(new Error('Task cancelled')))
        ),
      ]);

      task.status = 'completed';
      task.completedAt = Date.now();
      this.stats.completed++;
      console.log(`[Scheduler] Task completed: ${task.name}`);
    } catch (error) {
      task.error = error as Error;
      
      // 重试逻辑
      const maxRetries = task.options.retries ?? 0;
      if (task.retryCount < maxRetries && task.status !== 'cancelled') {
        task.retryCount++;
        task.status = 'pending';
        const delay = Math.min(1000 * Math.pow(2, task.retryCount), 30000);
        console.log(`[Scheduler] Retrying task: ${task.name} (attempt ${task.retryCount}/${maxRetries})`);
        setTimeout(() => {
          this.queue.push(task);
          this.processQueue();
        }, delay);
      } else {
        task.status = 'failed';
        task.completedAt = Date.now();
        this.stats.failed++;
        console.error(`[Scheduler] Task failed: ${task.name}`, error);
      }
    } finally {
      this.runningTasks.delete(task.id);
      this.processQueue();
    }
  }
}

// ==================== 快捷函数 ====================

export function createScheduler(options?: { maxConcurrent?: number }): Scheduler {
  return new Scheduler(options);
}

export function validateCron(expression: string): boolean {
  return CronParser.validate(expression);
}

export function getNextCronRun(expression: string, fromDate?: Date): Date {
  return CronParser.getNextRun(expression, fromDate);
}

// ==================== 使用示例 ====================

/**
 * 使用示例
 * 
 * 示例 1: 基础任务队列
 * ```typescript
 * import { createScheduler } from './scheduler-utils-skill';
 * 
 * const scheduler = createScheduler({ maxConcurrent: 3 });
 * 
 * // 添加任务
 * const task1 = scheduler.add(async () => {
 *   console.log('Task 1 executed');
 *   await new Promise(r => setTimeout(r, 1000));
 * });
 * 
 * const task2 = scheduler.add(async () => {
 *   console.log('Task 2 executed');
 * }, { priority: 1, timeout: 5000 });
 * 
 * // 等待任务完成
 * await scheduler.waitForTask(task1.id);
 * 
 * // 查看统计
 * console.log(scheduler.getStats());
 * ```
 * 
 * 示例 2: 定时任务 (Cron)
 * ```typescript
 * const scheduler = createScheduler();
 * 
 * // 每分钟执行
 * scheduler.add(async () => {
 *   console.log('Heartbeat');
 * }, { cron: '* * * * *', name: 'heartbeat' });
 * 
 * // 每天凌晨 2 点执行
 * scheduler.add(async () => {
 *   console.log('Daily backup');
 * }, { cron: '0 2 * * *', name: 'backup' });
 * 
 * // 验证 Cron
 * console.log(validateCron('*/5 * * * *')); // true
 * ```
 * 
 * 示例 3: 延迟任务
 * ```typescript
 * const scheduler = createScheduler();
 * 
 * // 5 秒后执行
 * scheduler.add(async () => {
 *   console.log('Delayed task');
 * }, { delay: 5000, name: 'delayed' });
 * ```
 * 
 * 示例 4: 任务取消
 * ```typescript
 * const scheduler = createScheduler();
 * 
 * const task = scheduler.add(async () => {
 *   for (let i = 0; i < 10; i++) {
 *     console.log(`Step ${i}`);
 *     await new Promise(r => setTimeout(r, 1000));
 *   }
 * }, { name: 'long-running' });
 * 
 * // 2 秒后取消
 * setTimeout(() => {
 *   scheduler.cancel(task.id);
 *   console.log('Task cancelled');
 * }, 2000);
 * ```
 * 
 * 示例 5: 优先级队列
 * ```typescript
 * const scheduler = createScheduler({ maxConcurrent: 1 });
 * 
 * // 低优先级
 * scheduler.add(async () => console.log('Low'), { priority: 10, name: 'low' });
 * scheduler.add(async () => console.log('Low 2'), { priority: 10, name: 'low2' });
 * 
 * // 高优先级 (会先执行)
 * scheduler.add(async () => console.log('High'), { priority: 1, name: 'high' });
 * 
 * // 输出顺序：High, Low, Low2
 * await scheduler.waitForAll();
 * ```
 * 
 * 示例 6: 重试机制
 * ```typescript
 * const scheduler = createScheduler();
 * 
 * scheduler.add(async () => {
 *   console.log('Attempting...');
 *   throw new Error('Failed');
 * }, { retries: 3, name: 'retry-task' });
 * 
 * // 会自动重试 3 次，使用指数退避
 * ```
 * 
 * 示例 7: 批量任务管理
 * ```typescript
 * const scheduler = createScheduler({ maxConcurrent: 5 });
 * 
 * // 添加 100 个任务
 * for (let i = 0; i < 100; i++) {
 *   scheduler.add(async () => {
 *     await processData(i);
 *   }, { name: `process-${i}` });
 * }
 * 
 * // 等待所有完成
 * await scheduler.waitForAll(60000); // 60 秒超时
 * 
 * // 清理已完成任务
 * scheduler.clearFinished();
 * 
 * // 查看剩余任务
 * console.log(scheduler.getStats());
 * ```
 * 
 * 示例 8: 使用取消令牌
 * ```typescript
 * const scheduler = createScheduler();
 * 
 * const task = scheduler.add(async () => {
 *   const token = task.cancelToken;
 *   
 *   for (let i = 0; i < 100; i++) {
 *     if (token?.cancelled) {
 *       console.log('Cancelled, cleaning up...');
 *       return;
 *     }
 *     await processItem(i);
 *   }
 * }, { name: 'cancellable' });
 * 
 * // 稍后取消
 * scheduler.cancel(task.id);
 * ```
 */

export { CancellationToken, CronParser };
export default Scheduler;
