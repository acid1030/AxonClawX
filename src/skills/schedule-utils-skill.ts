/**
 * Schedule Utils Skill - 定时任务调度工具
 * 
 * 功能:
 * 1. Cron 表达式解析与验证
 * 2. 定时任务执行与管理
 * 3. 任务队列管理
 * 
 * @author NOVA
 * @version 1.0.0
 */

// ==================== 类型定义 ====================

export interface CronExpression {
  minute: number[];      // 0-59
  hour: number[];        // 0-23
  dayOfMonth: number[];  // 1-31
  month: number[];       // 1-12
  dayOfWeek: number[];   // 0-6 (0 = Sunday)
}

export interface ScheduledTask {
  id: string;
  name: string;
  cronExpression: string;
  parsedCron: CronExpression;
  handler: () => Promise<void> | void;
  enabled: boolean;
  lastRun?: Date;
  nextRun?: Date;
  runCount: number;
  createdAt: Date;
}

export interface TaskQueueItem {
  taskId: string;
  scheduledTime: Date;
  priority: number;  // 1-10, 1 = highest
  status: 'pending' | 'running' | 'completed' | 'failed';
  retryCount: number;
  maxRetries: number;
}

export interface ScheduleConfig {
  maxConcurrentTasks: number;
  defaultRetryCount: number;
  taskTimeout: number;  // ms
}

// ==================== Cron 解析器 ====================

export class CronParser {
  /**
   * 解析 Cron 表达式
   * 支持标准 5 位 Cron: minute hour dayOfMonth month dayOfWeek
   * 支持特殊字符: * , - /
   */
  static parse(expression: string): CronExpression {
    const parts = expression.trim().split(/\s+/);
    
    if (parts.length !== 5) {
      throw new Error(
        `Invalid cron expression: expected 5 parts, got ${parts.length}. ` +
        `Format: minute hour dayOfMonth month dayOfWeek`
      );
    }

    return {
      minute: this.parseField(parts[0], 0, 59),
      hour: this.parseField(parts[1], 0, 23),
      dayOfMonth: this.parseField(parts[2], 1, 31),
      month: this.parseField(parts[3], 1, 12),
      dayOfWeek: this.parseField(parts[4], 0, 6),
    };
  }

  /**
   * 验证 Cron 表达式是否有效
   */
  static validate(expression: string): boolean {
    try {
      this.parse(expression);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 解析单个 Cron 字段
   */
  private static parseField(field: string, min: number, max: number): number[] {
    const values = new Set<number>();

    // 处理多个值 (逗号分隔)
    const parts = field.split(',');
    
    for (const part of parts) {
      // 处理步长 (e.g., */5, 1-10/2)
      const [range, stepStr] = part.split('/');
      const step = stepStr ? parseInt(stepStr, 10) : 1;

      if (range === '*') {
        // 所有值
        for (let i = min; i <= max; i += step) {
          values.add(i);
        }
      } else if (range.includes('-')) {
        // 范围 (e.g., 1-5)
        const [start, end] = range.split('-').map(Number);
        if (isNaN(start) || isNaN(end) || start < min || end > max) {
          throw new Error(`Invalid range: ${range} (valid: ${min}-${max})`);
        }
        for (let i = start; i <= end; i += step) {
          values.add(i);
        }
      } else {
        // 单个值
        const value = parseInt(range, 10);
        if (isNaN(value) || value < min || value > max) {
          throw new Error(`Invalid value: ${value} (valid: ${min}-${max})`);
        }
        values.add(value);
      }
    }

    if (values.size === 0) {
      throw new Error(`Empty field value: ${field}`);
    }

    return Array.from(values).sort((a, b) => a - b);
  }

  /**
   * 计算下一次执行时间
   */
  static getNextRun(cron: CronExpression, fromDate: Date = new Date()): Date {
    const date = new Date(fromDate);
    date.setSeconds(0, 0); // 重置秒和毫秒
    date.setMinutes(date.getMinutes() + 1); // 从下一分钟开始

    // 最多查找 366 天 (防止死循环)
    const maxIterations = 366 * 24 * 60;
    
    for (let i = 0; i < maxIterations; i++) {
      if (this.matchesDate(cron, date)) {
        return date;
      }
      date.setMinutes(date.getMinutes() + 1);
    }

    throw new Error('Could not find next run time within 366 days');
  }

  /**
   * 检查日期是否匹配 Cron 表达式
   */
  private static matchesDate(cron: CronExpression, date: Date): boolean {
    const minute = date.getMinutes();
    const hour = date.getHours();
    const dayOfMonth = date.getDate();
    const month = date.getMonth() + 1; // JS month is 0-indexed
    const dayOfWeek = date.getDay();

    return (
      cron.minute.includes(minute) &&
      cron.hour.includes(hour) &&
      cron.dayOfMonth.includes(dayOfMonth) &&
      cron.month.includes(month) &&
      cron.dayOfWeek.includes(dayOfWeek)
    );
  }

  /**
   * 将 Cron 表达式转换为人类可读格式
   */
  static toHumanReadable(expression: string): string {
    const cron = this.parse(expression);
    const parts: string[] = [];

    // 分钟
    if (cron.minute.length === 60) {
      parts.push('每分钟');
    } else if (cron.minute.every((v, i, arr) => !i || v === arr[i - 1] + 5)) {
      parts.push(`每 5 分钟`);
    } else {
      parts.push(`在第 ${cron.minute.join(', ')} 分钟`);
    }

    // 小时
    if (cron.hour.length === 24) {
      parts.push('每小时');
    } else {
      parts.push(`在 ${cron.hour.join(', ')} 点`);
    }

    // 日期
    if (cron.dayOfMonth.length < 31) {
      parts.push(`每月 ${cron.dayOfMonth.join(', ')} 日`);
    }

    // 星期
    if (cron.dayOfWeek.length < 7) {
      const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
      parts.push(`每周${cron.dayOfWeek.map(d => weekdays[d]).join('、')}`);
    }

    return parts.join(' ');
  }
}

// ==================== 任务调度器 ====================

export class TaskScheduler {
  private tasks: Map<string, ScheduledTask> = new Map();
  private queue: TaskQueueItem[] = [];
  private timers: Map<string, NodeJS.Timeout> = new Map();
  private config: ScheduleConfig;
  private runningTasks: Set<string> = new Set();

  constructor(config: Partial<ScheduleConfig> = {}) {
    this.config = {
      maxConcurrentTasks: config.maxConcurrentTasks ?? 5,
      defaultRetryCount: config.defaultRetryCount ?? 3,
      taskTimeout: config.taskTimeout ?? 300000, // 5 分钟
    };
  }

  /**
   * 注册定时任务
   */
  register(
    name: string,
    cronExpression: string,
    handler: () => Promise<void> | void
  ): ScheduledTask {
    const id = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const parsedCron = CronParser.parse(cronExpression);
    const nextRun = CronParser.getNextRun(parsedCron);

    const task: ScheduledTask = {
      id,
      name,
      cronExpression,
      parsedCron,
      handler,
      enabled: true,
      nextRun,
      runCount: 0,
      createdAt: new Date(),
    };

    this.tasks.set(id, task);
    this.scheduleTask(task);

    console.log(`[Scheduler] Registered task: ${name} (ID: ${id}), next run: ${nextRun.toISOString()}`);
    return task;
  }

  /**
   * 取消任务
   */
  unregister(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task) return false;

    // 清除定时器
    const timer = this.timers.get(taskId);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(taskId);
    }

    this.tasks.delete(taskId);
    console.log(`[Scheduler] Unregistered task: ${task.name}`);
    return true;
  }

  /**
   * 启用/禁用任务
   */
  setTaskEnabled(taskId: string, enabled: boolean): boolean {
    const task = this.tasks.get(taskId);
    if (!task) return false;

    task.enabled = enabled;
    
    if (enabled) {
      this.scheduleTask(task);
    } else {
      const timer = this.timers.get(taskId);
      if (timer) {
        clearTimeout(timer);
        this.timers.delete(taskId);
      }
    }

    return true;
  }

  /**
   * 立即执行任务
   */
  async runNow(taskId: string): Promise<boolean> {
    const task = this.tasks.get(taskId);
    if (!task) return false;

    console.log(`[Scheduler] Running task immediately: ${task.name}`);
    await this.executeTask(task);
    return true;
  }

  /**
   * 获取所有任务
   */
  getTasks(): ScheduledTask[] {
    return Array.from(this.tasks.values());
  }

  /**
   * 获取任务状态
   */
  getTaskStatus(taskId: string): ScheduledTask | undefined {
    return this.tasks.get(taskId);
  }

  /**
   * 调度任务
   */
  private scheduleTask(task: ScheduledTask): void {
    if (!task.enabled || !task.nextRun) return;

    const timer = this.timers.get(task.id);
    if (timer) {
      clearTimeout(timer);
    }

    const delay = task.nextRun.getTime() - Date.now();
    
    if (delay <= 0) {
      // 立即执行
      this.executeTask(task);
    } else {
      // 设置定时器
      const timeout = setTimeout(() => {
        this.executeTask(task);
      }, delay);

      this.timers.set(task.id, timeout);
    }
  }

  /**
   * 执行任务
   */
  private async executeTask(task: ScheduledTask): Promise<void> {
    if (this.runningTasks.size >= this.config.maxConcurrentTasks) {
      console.log(`[Scheduler] Max concurrent tasks reached, queueing: ${task.name}`);
      this.addToQueue(task);
      return;
    }

    this.runningTasks.add(task.id);
    task.lastRun = new Date();
    task.runCount++;

    console.log(`[Scheduler] Executing task: ${task.name} (run #${task.runCount})`);

    try {
      // 执行任务处理函数
      await Promise.race([
        task.handler(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Task timeout')), this.config.taskTimeout)
        ),
      ]);

      console.log(`[Scheduler] Task completed: ${task.name}`);
    } catch (error) {
      console.error(`[Scheduler] Task failed: ${task.name}`, error);
      await this.handleTaskFailure(task, error as Error);
    } finally {
      this.runningTasks.delete(task.id);
      
      // 计算下次执行时间并重新调度
      task.nextRun = CronParser.getNextRun(task.parsedCron);
      this.scheduleTask(task);
      
      // 处理队列中的下一个任务
      this.processQueue();
    }
  }

  /**
   * 处理任务失败
   */
  private async handleTaskFailure(task: ScheduledTask, error: Error): Promise<void> {
    const queueItem: TaskQueueItem = {
      taskId: task.id,
      scheduledTime: new Date(),
      priority: 5,
      status: 'failed',
      retryCount: 0,
      maxRetries: this.config.defaultRetryCount,
    };

    // 重试逻辑
    if (queueItem.retryCount < queueItem.maxRetries) {
      queueItem.retryCount++;
      queueItem.status = 'pending';
      
      // 指数退避
      const delay = Math.min(1000 * Math.pow(2, queueItem.retryCount), 30000);
      setTimeout(() => {
        this.addToQueue(task, queueItem);
      }, delay);
      
      console.log(`[Scheduler] Retrying task: ${task.name} (attempt ${queueItem.retryCount}/${queueItem.maxRetries})`);
    }
  }

  /**
   * 添加到队列
   */
  private addToQueue(task: ScheduledTask, existingItem?: TaskQueueItem): void {
    const item: TaskQueueItem = existingItem ?? {
      taskId: task.id,
      scheduledTime: new Date(),
      priority: 5,
      status: 'pending',
      retryCount: 0,
      maxRetries: this.config.defaultRetryCount,
    };

    this.queue.push(item);
    this.queue.sort((a, b) => {
      if (a.status !== b.status) {
        return a.status === 'pending' ? -1 : 1;
      }
      return a.priority - b.priority || a.scheduledTime.getTime() - b.scheduledTime.getTime();
    });

    this.processQueue();
  }

  /**
   * 处理队列
   */
  private async processQueue(): Promise<void> {
    while (
      this.queue.length > 0 &&
      this.runningTasks.size < this.config.maxConcurrentTasks
    ) {
      const item = this.queue[0];
      if (item.status !== 'pending') {
        this.queue.shift();
        continue;
      }

      const task = this.tasks.get(item.taskId);
      if (!task) {
        this.queue.shift();
        continue;
      }

      item.status = 'running';
      await this.executeTask(task);
    }
  }

  /**
   * 获取队列状态
   */
  getQueueStatus(): { pending: number; running: number; total: number } {
    return {
      pending: this.queue.filter(i => i.status === 'pending').length,
      running: this.runningTasks.size,
      total: this.queue.length,
    };
  }

  /**
   * 停止所有任务
   */
  stop(): void {
    for (const [id, timer] of this.timers.entries()) {
      clearTimeout(timer);
    }
    this.timers.clear();
    this.runningTasks.clear();
    console.log('[Scheduler] All tasks stopped');
  }
}

// ==================== 快捷函数 ====================

/**
 * 创建并启动调度器
 */
export function createScheduler(config?: Partial<ScheduleConfig>): TaskScheduler {
  return new TaskScheduler(config);
}

/**
 * 验证 Cron 表达式
 */
export function validateCron(expression: string): boolean {
  return CronParser.validate(expression);
}

/**
 * 解析 Cron 表达式
 */
export function parseCron(expression: string): CronExpression {
  return CronParser.parse(expression);
}

/**
 * 获取下次执行时间
 */
export function getNextRun(expression: string, fromDate?: Date): Date {
  const cron = CronParser.parse(expression);
  return CronParser.getNextRun(cron, fromDate);
}

// ==================== 使用示例 ====================

/**
 * 使用示例代码
 * 
 * 示例 1: 基础使用
 * ```typescript
 * import { createScheduler, validateCron } from './schedule-utils-skill';
 * 
 * // 创建调度器
 * const scheduler = createScheduler({
 *   maxConcurrentTasks: 3,
 *   defaultRetryCount: 2,
 *   taskTimeout: 60000,
 * });
 * 
 * // 注册定时任务 - 每分钟执行
 * scheduler.register(
 *   'heartbeat',
 *   '* * * * *',  // 每分钟
 *   async () => {
 *     console.log('Heartbeat executed');
 *     // 执行心跳逻辑
 *   }
 * );
 * 
 * // 注册定时任务 - 每天凌晨 2 点执行
 * scheduler.register(
 *   'daily-backup',
 *   '0 2 * * *',  // 每天 2:00
 *   async () => {
 *     console.log('Daily backup executed');
 *     // 执行备份逻辑
 *   }
 * );
 * 
 * // 注册定时任务 - 每周一上午 9 点执行
 * scheduler.register(
 *   'weekly-report',
 *   '0 9 * * 1',  // 每周一 9:00
 *   async () => {
 *     console.log('Weekly report generated');
 *     // 生成周报
 *   }
 * );
 * 
 * // 验证 Cron 表达式
 * console.log(validateCron('*/5 * * * *'));  // true
 * console.log(validateCron('invalid'));      // false
 * 
 * // 获取下次执行时间
 * const nextRun = getNextRun('0 9 * * 1');
 * console.log('Next weekly report:', nextRun);
 * 
 * // 立即执行任务
 * await scheduler.runNow('heartbeat');
 * 
 * // 获取任务状态
 * const tasks = scheduler.getTasks();
 * console.log('Registered tasks:', tasks.length);
 * 
 * // 禁用任务
 * scheduler.setTaskEnabled('daily-backup', false);
 * 
 * // 取消任务
 * scheduler.unregister('weekly-report');
 * 
 * // 停止所有任务
 * scheduler.stop();
 * ```
 * 
 * 示例 2: 高级用法 - 带错误处理的任务
 * ```typescript
 * const scheduler = createScheduler();
 * 
 * scheduler.register(
 *   'data-sync',
 *   '*/15 * * * *',  // 每 15 分钟
 *   async () => {
 *     try {
 *       // 执行数据同步
 *       await syncData();
 *       console.log('Data sync completed');
 *     } catch (error) {
 *       console.error('Data sync failed:', error);
 *       throw error; // 触发重试机制
 *     }
 *   }
 * );
 * ```
 * 
 * 示例 3: Cron 表达式示例
 * ```typescript
 * // 每分钟的第 0, 15, 30, 45 秒
 * '0,15,30,45 * * * *'
 * 
 * // 每 5 分钟
 * '*/5 * * * *'
 * 
 * // 工作时间 (9:00-18:00) 每小时
 * '0 9-18 * * 1-5'
 * 
 * // 每天凌晨 3:30
 * '30 3 * * *'
 * 
 * // 每月 1 号午夜
 * '0 0 1 * *'
 * 
 * // 每季度第一天
 * '0 0 1 1,4,7,10 *'
 * ```
 */

// 导出所有
export {
  CronParser,
  TaskScheduler,
  CronExpression,
  ScheduledTask,
  TaskQueueItem,
  ScheduleConfig,
};
