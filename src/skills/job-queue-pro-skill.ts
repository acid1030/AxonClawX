/**
 * Job Queue Pro Skill - 专业任务队列管理工具
 * 
 * @version 1.0.0
 * @author Axon (KAEL Engineering)
 * @description 支持任务队列、优先级调度、重试机制的专业队列系统
 * 
 * 核心功能:
 * 1. 任务队列 - 先进先出 + 优先级混合调度
 * 2. 优先级调度 - P0-P3 四级优先级 + 紧急插队
 * 3. 重试机制 - 可配置重试次数、退避策略、失败回调
 * 
 * 依赖：无 (纯 TypeScript 实现)
 */

// ==================== 类型定义 ====================

/**
 * 任务优先级
 */
export type Priority = 'P0' | 'P1' | 'P2' | 'P3';

/**
 * 任务状态
 */
export type TaskStatus = 
  | 'pending'      // 等待执行
  | 'running'      // 正在执行
  | 'completed'    // 已完成
  | 'failed'       // 失败
  | 'retrying'     // 重试中
  | 'cancelled';   // 已取消

/**
 * 重试退避策略
 */
export type BackoffStrategy = 
  | 'fixed'        // 固定间隔
  | 'linear'       // 线性增长
  | 'exponential'; // 指数增长

/**
 * 任务执行函数类型
 */
export type TaskExecutor<T = any, R = any> = (data: T, attempt: number) => Promise<R>;

/**
 * 任务配置
 */
export interface TaskConfig<T = any> {
  /** 任务数据 */
  data: T;
  /** 优先级 (默认: P2) */
  priority?: Priority;
  /** 是否紧急插队 (默认: false) */
  isEmergency?: boolean;
  /** 任务描述 */
  description?: string;
  /** 任务超时时间 (毫秒，0 表示无限制) */
  timeout?: number;
  /** 最大重试次数 (默认: 3) */
  maxRetries?: number;
  /** 重试退避策略 (默认: exponential) */
  backoffStrategy?: BackoffStrategy;
  /** 重试基础延迟 (毫秒，默认: 1000) */
  backoffBaseDelay?: number;
  /** 重试最大延迟 (毫秒，默认: 30000) */
  backoffMaxDelay?: number;
  /** 任务元数据 */
  metadata?: Record<string, any>;
}

/**
 * 任务实例
 */
export interface Task<T = any, R = any> {
  /** 任务唯一标识 */
  id: string;
  /** 任务状态 */
  status: TaskStatus;
  /** 任务优先级 */
  priority: Priority;
  /** 任务数据 */
  data: T;
  /** 执行结果 */
  result?: R;
  /** 错误信息 */
  error?: string;
  /** 创建时间戳 */
  createdAt: number;
  /** 开始执行时间戳 */
  startedAt?: number;
  /** 完成时间戳 */
  completedAt?: number;
  /** 是否为紧急插队任务 */
  isEmergency: boolean;
  /** 任务描述 */
  description?: string;
  /** 当前重试次数 */
  retryCount: number;
  /** 最大重试次数 */
  maxRetries: number;
  /** 重试退避策略 */
  backoffStrategy: BackoffStrategy;
  /** 重试基础延迟 */
  backoffBaseDelay: number;
  /** 重试最大延迟 */
  backoffMaxDelay: number;
  /** 下次重试时间 */
  nextRetryAt?: number;
  /** 任务超时时间 */
  timeout?: number;
  /** 任务元数据 */
  metadata?: Record<string, any>;
  /** 执行器 (内部使用) */
  _executor?: TaskExecutor<T, R>;
}

/**
 * 队列配置
 */
export interface QueueConfig {
  /** 最大队列长度 (默认: 1000) */
  maxQueueSize: number;
  /** 默认优先级 (默认: P2) */
  defaultPriority: Priority;
  /** 默认最大重试次数 (默认: 3) */
  defaultMaxRetries: number;
  /** 默认退避策略 (默认: exponential) */
  defaultBackoffStrategy: BackoffStrategy;
  /** 默认退避基础延迟 (默认: 1000ms) */
  defaultBackoffBaseDelay: number;
  /** 默认退避最大延迟 (默认: 30000ms) */
  defaultBackoffMaxDelay: number;
  /** 是否允许紧急插队 (默认: true) */
  allowEmergencyInsert: boolean;
  /** 并发执行任务数 (默认: 1) */
  concurrency: number;
  /** 任务执行间隔 (毫秒，默认: 0) */
  executionInterval: number;
}

/**
 * 队列统计信息
 */
export interface QueueStats {
  /** 队列总长度 */
  totalSize: number;
  /** 各优先级任务数量 */
  byPriority: Record<Priority, number>;
  /** 各状态任务数量 */
  byStatus: Record<TaskStatus, number>;
  /** 紧急任务数量 */
  emergencyCount: number;
  /** 最早任务时间 */
  oldestTaskTime: number | null;
  /** 最新任务时间 */
  newestTaskTime: number | null;
  /** 累计完成任务数 */
  totalCompleted: number;
  /** 累计失败任务数 */
  totalFailed: number;
  /** 累计重试次数 */
  totalRetries: number;
  /** 平均执行时间 (毫秒) */
  avgExecutionTime: number;
}

/**
 * 任务事件
 */
export interface TaskEvent<T = any, R = any> {
  /** 事件类型 */
  type: 'created' | 'started' | 'completed' | 'failed' | 'retrying' | 'cancelled';
  /** 任务实例 */
  task: Task<T, R>;
  /** 事件时间戳 */
  timestamp: number;
}

/**
 * 任务事件监听器
 */
export type TaskEventListener<T = any, R = any> = (event: TaskEvent<T, R>) => void;

// ==================== 默认配置 ====================

const DEFAULT_QUEUE_CONFIG: QueueConfig = {
  maxQueueSize: 1000,
  defaultPriority: 'P2',
  defaultMaxRetries: 3,
  defaultBackoffStrategy: 'exponential',
  defaultBackoffBaseDelay: 1000,
  defaultBackoffMaxDelay: 30000,
  allowEmergencyInsert: true,
  concurrency: 1,
  executionInterval: 0,
};

const PRIORITY_WEIGHTS: Record<Priority, number> = {
  P0: 4,
  P1: 3,
  P2: 2,
  P3: 1,
};

// ==================== JobQueuePro 类 ====================

/**
 * 专业任务队列类
 * 
 * 特性:
 * - 支持 P0-P3 四个优先级
 * - 支持紧急任务插队
 * - 自动重试机制 (可配置退避策略)
 * - 并发控制
 * - 任务超时控制
 * - 事件系统
 * - 队列统计
 */
export class JobQueuePro<T = any, R = any> {
  private queue: Task<T, R>[] = [];
  private runningTasks: Map<string, Task<T, R>> = new Map();
  private config: QueueConfig;
  private taskCounter: number = 0;
  private totalCompleted: number = 0;
  private totalFailed: number = 0;
  private totalRetries: number = 0;
  private executionTimes: number[] = [];
  private eventListeners: TaskEventListener<T, R>[] = [];
  private isProcessing: boolean = false;
  private processTimer?: NodeJS.Timeout;

  constructor(config?: Partial<QueueConfig>) {
    this.config = { ...DEFAULT_QUEUE_CONFIG, ...config };
  }

  // ==================== 内部方法 ====================

  /**
   * 生成唯一任务 ID
   */
  private generateTaskId(): string {
    this.taskCounter++;
    return `job-${Date.now()}-${this.taskCounter}`;
  }

  /**
   * 获取优先级权重
   */
  private getPriorityWeight(priority: Priority): number {
    return PRIORITY_WEIGHTS[priority];
  }

  /**
   * 计算任务排序分数 (分数越高，优先级越高)
   */
  private calculateTaskScore(task: Task<T, R>): number {
    const priorityWeight = this.getPriorityWeight(task.priority);
    const timeBonus = task.isEmergency ? 1000 : 0;
    const retryPenalty = task.retryCount * 10; // 重试次数越多，优先级略降
    return priorityWeight * 100 + timeBonus - task.createdAt - retryPenalty;
  }

  /**
   * 查找任务应该插入的位置
   */
  private findInsertPosition(task: Task<T, R>): number {
    const score = this.calculateTaskScore(task);
    
    for (let i = 0; i < this.queue.length; i++) {
      const existingScore = this.calculateTaskScore(this.queue[i]);
      if (score > existingScore) {
        return i;
      }
    }
    
    return this.queue.length;
  }

  /**
   * 计算下次重试延迟
   */
  private calculateBackoffDelay(task: Task<T, R>): number {
    const { backoffStrategy, backoffBaseDelay, backoffMaxDelay, retryCount } = task;
    
    let delay: number;
    
    switch (backoffStrategy) {
      case 'fixed':
        delay = backoffBaseDelay;
        break;
      case 'linear':
        delay = backoffBaseDelay * (retryCount + 1);
        break;
      case 'exponential':
      default:
        delay = backoffBaseDelay * Math.pow(2, retryCount);
        break;
    }
    
    return Math.min(delay, backoffMaxDelay);
  }

  /**
   * 触发事件
   */
  private emitEvent(type: TaskEvent['type'], task: Task<T, R>): void {
    const event: TaskEvent<T, R> = {
      type,
      task,
      timestamp: Date.now(),
    };
    
    for (const listener of this.eventListeners) {
      try {
        listener(event);
      } catch (error) {
        console.error('[JobQueuePro] Event listener error:', error);
      }
    }
  }

  /**
   * 执行单个任务
   */
  private async executeTask(task: Task<T, R>, executor: TaskExecutor<T, R>): Promise<void> {
    task.status = 'running';
    task.startedAt = Date.now();
    this.runningTasks.set(task.id, task);
    this.emitEvent('started', task);

    let timeoutTimer: NodeJS.Timeout | undefined;
    const startTime = Date.now();

    try {
      // 设置超时
      if (task.timeout && task.timeout > 0) {
        timeoutTimer = setTimeout(() => {
          throw new Error(`Task timeout after ${task.timeout}ms`);
        }, task.timeout);
      }

      const result = await executor(task.data, task.retryCount + 1);
      
      if (timeoutTimer) {
        clearTimeout(timeoutTimer);
      }

      task.status = 'completed';
      task.result = result;
      task.completedAt = Date.now();
      this.totalCompleted++;
      
      const executionTime = task.completedAt - startTime;
      this.executionTimes.push(executionTime);
      if (this.executionTimes.length > 100) {
        this.executionTimes.shift(); // 保留最近 100 次
      }

      this.emitEvent('completed', task);
    } catch (error) {
      if (timeoutTimer) {
        clearTimeout(timeoutTimer);
      }

      const errorMessage = error instanceof Error ? error.message : String(error);
      task.error = errorMessage;

      // 检查是否需要重试
      if (task.retryCount < task.maxRetries) {
        task.retryCount++;
        this.totalRetries++;
        task.status = 'retrying';
        const delay = this.calculateBackoffDelay(task);
        task.nextRetryAt = Date.now() + delay;
        
        this.emitEvent('retrying', task);
        
        // 延迟后重新加入队列
        setTimeout(() => {
          task.status = 'pending';
          task.nextRetryAt = undefined;
          this.queue.push(task);
          this.sortQueue();
          this.startProcessing();
        }, delay);
      } else {
        task.status = 'failed';
        task.completedAt = Date.now();
        this.totalFailed++;
        this.emitEvent('failed', task);
      }
    } finally {
      this.runningTasks.delete(task.id);
      if (timeoutTimer) {
        clearTimeout(timeoutTimer);
      }
    }
  }

  /**
   * 对队列进行排序
   */
  private sortQueue(): void {
    this.queue.sort((a, b) => {
      return this.calculateTaskScore(b) - this.calculateTaskScore(a);
    });
  }

  /**
   * 开始处理队列
   */
  private async startProcessing(): Promise<void> {
    if (this.isProcessing) {
      return;
    }

    this.isProcessing = true;

    const processNext = async () => {
      while (
        this.runningTasks.size < this.config.concurrency &&
        this.queue.length > 0
      ) {
        // 检查是否有任务可以执行 (包括重试任务)
        const readyTaskIndex = this.queue.findIndex(
          task => task.status === 'pending' && (!task.nextRetryAt || task.nextRetryAt <= Date.now())
        );

        if (readyTaskIndex === -1) {
          break;
        }

        const task = this.queue.splice(readyTaskIndex, 1)[0];
        const executor = task._executor;

        if (executor) {
          this.executeTask(task, executor).catch(console.error);
        }
      }

      // 如果还有任务在运行或等待，继续处理
      if (this.runningTasks.size > 0 || this.queue.length > 0) {
        if (this.config.executionInterval > 0) {
          this.processTimer = setTimeout(processNext, this.config.executionInterval);
        } else {
          setImmediate(processNext);
        }
      } else {
        this.isProcessing = false;
      }
    };

    processNext();
  }

  // ==================== 公共方法 ====================

  /**
   * 添加任务到队列
   * 
   * @param config 任务配置
   * @param executor 任务执行函数
   * @returns 添加的任务
   */
  enqueue(config: TaskConfig<T>, executor: TaskExecutor<T, R>): Task<T, R> {
    // 检查队列是否已满
    if (this.queue.length + this.runningTasks.size >= this.config.maxQueueSize) {
      throw new Error(`队列已满，最大容量：${this.config.maxQueueSize}`);
    }

    // 检查是否允许紧急插队
    if (config.isEmergency && !this.config.allowEmergencyInsert) {
      throw new Error('紧急任务插队已被禁用');
    }

    const task: Task<T, R> = {
      id: this.generateTaskId(),
      status: 'pending',
      priority: config.priority || this.config.defaultPriority,
      data: config.data,
      createdAt: Date.now(),
      isEmergency: config.isEmergency || false,
      description: config.description,
      retryCount: 0,
      maxRetries: config.maxRetries ?? this.config.defaultMaxRetries,
      backoffStrategy: config.backoffStrategy || this.config.defaultBackoffStrategy,
      backoffBaseDelay: config.backoffBaseDelay || this.config.defaultBackoffBaseDelay,
      backoffMaxDelay: config.backoffMaxDelay || this.config.defaultBackoffMaxDelay,
      timeout: config.timeout,
      metadata: config.metadata,
      _executor: executor,
    };

    // 找到合适的插入位置
    const position = this.findInsertPosition(task);
    this.queue.splice(position, 0, task);

    this.emitEvent('created', task);
    this.startProcessing();

    return task;
  }

  /**
   * 批量添加任务
   * 
   * @param configs 任务配置数组
   * @param executor 任务执行函数
   * @returns 添加的任务数组
   */
  enqueueBatch(configs: Array<TaskConfig<T>>, executor: TaskExecutor<T, R>): Task<T, R>[] {
    return configs.map(config => this.enqueue(config, executor));
  }

  /**
   * 取消任务
   * 
   * @param taskId 任务 ID
   * @returns 是否成功取消
   */
  cancelTask(taskId: string): boolean {
    // 检查是否在队列中
    const queueIndex = this.queue.findIndex(task => task.id === taskId);
    if (queueIndex !== -1) {
      this.queue.splice(queueIndex, 1);
      const task = this.queue[queueIndex];
      task.status = 'cancelled';
      this.emitEvent('cancelled', task);
      return true;
    }

    // 检查是否正在运行
    const runningTask = this.runningTasks.get(taskId);
    if (runningTask) {
      runningTask.status = 'cancelled';
      this.emitEvent('cancelled', runningTask);
      return true;
    }

    return false;
  }

  /**
   * 获取任务
   * 
   * @param taskId 任务 ID
   * @returns 任务实例，不存在则返回 undefined
   */
  getTask(taskId: string): Task<T, R> | undefined {
    const queueTask = this.queue.find(task => task.id === taskId);
    if (queueTask) {
      return queueTask;
    }
    return this.runningTasks.get(taskId);
  }

  /**
   * 获取队列中所有任务
   * 
   * @returns 任务数组
   */
  getAllTasks(): Task<T, R>[] {
    return [...this.queue, ...Array.from(this.runningTasks.values())];
  }

  /**
   * 获取指定状态的任务
   * 
   * @param status 任务状态
   * @returns 任务数组
   */
  getTasksByStatus(status: TaskStatus): Task<T, R>[] {
    return this.getAllTasks().filter(task => task.status === status);
  }

  /**
   * 获取指定优先级的任务
   * 
   * @param priority 优先级
   * @returns 任务数组
   */
  getTasksByPriority(priority: Priority): Task<T, R>[] {
    return this.getAllTasks().filter(task => task.priority === priority);
  }

  /**
   * 获取所有紧急任务
   * 
   * @returns 紧急任务数组
   */
  getEmergencyTasks(): Task<T, R>[] {
    return this.getAllTasks().filter(task => task.isEmergency);
  }

  /**
   * 获取队列大小
   * 
   * @returns 队列中的任务数量 (不包括正在运行的)
   */
  size(): number {
    return this.queue.length;
  }

  /**
   * 获取运行中的任务数量
   * 
   * @returns 运行中的任务数量
   */
  runningCount(): number {
    return this.runningTasks.size;
  }

  /**
   * 检查队列是否为空
   * 
   * @returns 是否为空
   */
  isEmpty(): boolean {
    return this.queue.length === 0 && this.runningTasks.size === 0;
  }

  /**
   * 清空队列 (只清空等待中的任务，不影响运行中的)
   */
  clear(): void {
    this.queue.forEach(task => {
      task.status = 'cancelled';
      this.emitEvent('cancelled', task);
    });
    this.queue = [];
  }

  /**
   * 添加事件监听器
   * 
   * @param listener 事件监听函数
   */
  onEvent(listener: TaskEventListener<T, R>): void {
    this.eventListeners.push(listener);
  }

  /**
   * 移除事件监听器
   * 
   * @param listener 事件监听函数
   */
  offEvent(listener: TaskEventListener<T, R>): void {
    const index = this.eventListeners.indexOf(listener);
    if (index !== -1) {
      this.eventListeners.splice(index, 1);
    }
  }

  /**
   * 获取队列统计信息
   * 
   * @returns 统计信息
   */
  getStats(): QueueStats {
    const allTasks = this.getAllTasks();
    
    const byPriority: Record<Priority, number> = {
      P0: 0,
      P1: 0,
      P2: 0,
      P3: 0,
    };

    const byStatus: Record<TaskStatus, number> = {
      pending: 0,
      running: 0,
      completed: 0,
      failed: 0,
      retrying: 0,
      cancelled: 0,
    };

    let emergencyCount = 0;
    let oldestTaskTime: number | null = null;
    let newestTaskTime: number | null = null;

    for (const task of allTasks) {
      byPriority[task.priority]++;
      byStatus[task.status]++;
      if (task.isEmergency) {
        emergencyCount++;
      }
      if (oldestTaskTime === null || task.createdAt < oldestTaskTime) {
        oldestTaskTime = task.createdAt;
      }
      if (newestTaskTime === null || task.createdAt > newestTaskTime) {
        newestTaskTime = task.createdAt;
      }
    }

    const avgExecutionTime = this.executionTimes.length > 0
      ? this.executionTimes.reduce((a, b) => a + b, 0) / this.executionTimes.length
      : 0;

    return {
      totalSize: allTasks.length,
      byPriority,
      byStatus,
      emergencyCount,
      oldestTaskTime,
      newestTaskTime,
      totalCompleted: this.totalCompleted,
      totalFailed: this.totalFailed,
      totalRetries: this.totalRetries,
      avgExecutionTime,
    };
  }

  /**
   * 更新配置
   * 
   * @param newConfig 新配置
   */
  updateConfig(newConfig: Partial<QueueConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * 获取当前配置
   * 
   * @returns 当前配置
   */
  getConfig(): QueueConfig {
    return { ...this.config };
  }

  /**
   * 暂停处理
   */
  pause(): void {
    if (this.processTimer) {
      clearTimeout(this.processTimer);
      this.processTimer = undefined;
    }
    this.isProcessing = false;
  }

  /**
   * 恢复处理
   */
  resume(): void {
    if (!this.isProcessing) {
      this.startProcessing();
    }
  }

  /**
   * 等待队列完成
   * 
   * @param timeout 超时时间 (毫秒，0 表示无限等待)
   * @returns Promise，队列完成时 resolve
   */
  waitForCompletion(timeout: number = 0): Promise<void> {
    return new Promise((resolve, reject) => {
      const checkCompletion = () => {
        if (this.queue.length === 0 && this.runningTasks.size === 0) {
          resolve();
          return;
        }

        if (timeout > 0) {
          setTimeout(() => {
            reject(new Error('等待超时'));
          }, timeout);
        }
      };

      this.onEvent((event) => {
        if (event.type === 'completed' || event.type === 'failed') {
          checkCompletion();
        }
      });

      checkCompletion();
    });
  }
}

// ==================== 工厂函数 ====================

/**
 * 创建专业任务队列的工厂函数
 * 
 * @param config 配置选项
 * @returns 任务队列实例
 */
export function createJobQueue<T = any, R = any>(config?: Partial<QueueConfig>): JobQueuePro<T, R> {
  return new JobQueuePro<T, R>(config);
}

export default JobQueuePro;

// ==================== 使用示例 ====================

/*
// 示例 1: 基础用法
import { createJobQueue } from './src/skills/job-queue-pro-skill';

const queue = createJobQueue();

// 添加任务
queue.enqueue(
  { data: { userId: 123, action: 'send_email' } },
  async (data, attempt) => {
    console.log(`执行任务 (尝试 ${attempt}):`, data);
    // 模拟异步操作
    await new Promise(resolve => setTimeout(resolve, 1000));
    return { success: true };
  }
);

// 示例 2: 高优先级紧急任务
queue.enqueue(
  {
    data: { type: 'critical_alert' },
    priority: 'P0',
    isEmergency: true,
    description: '紧急告警',
  },
  async (data) => {
    // 立即处理紧急告警
    await sendAlert(data);
  }
);

// 示例 3: 配置重试机制
queue.enqueue(
  {
    data: { url: 'https://api.example.com/data' },
    maxRetries: 5,
    backoffStrategy: 'exponential',
    backoffBaseDelay: 1000,
    timeout: 30000,
  },
  async (data, attempt) => {
    const response = await fetch(data.url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return response.json();
  }
);

// 示例 4: 批量添加任务
const tasks = [
  { data: { id: 1 }, priority: 'P1' as Priority },
  { data: { id: 2 }, priority: 'P2' as Priority },
  { data: { id: 3 }, priority: 'P3' as Priority },
];

queue.enqueueBatch(tasks, async (data) => {
  await processItem(data);
});

// 示例 5: 监听任务事件
queue.onEvent((event) => {
  switch (event.type) {
    case 'created':
      console.log(`任务创建：${event.task.id}`);
      break;
    case 'started':
      console.log(`任务开始：${event.task.id}`);
      break;
    case 'completed':
      console.log(`任务完成：${event.task.id}, 结果:`, event.task.result);
      break;
    case 'failed':
      console.log(`任务失败：${event.task.id}, 错误:`, event.task.error);
      break;
    case 'retrying':
      console.log(`任务重试：${event.task.id}, 第${event.task.retryCount}次`);
      break;
  }
});

// 示例 6: 查看队列统计
const stats = queue.getStats();
console.log('队列统计:', stats);
// {
//   totalSize: 10,
//   byPriority: { P0: 2, P1: 3, P2: 4, P3: 1 },
//   byStatus: { pending: 5, running: 2, completed: 3, failed: 0, retrying: 0, cancelled: 0 },
//   emergencyCount: 2,
//   totalCompleted: 15,
//   totalFailed: 2,
//   totalRetries: 5,
//   avgExecutionTime: 1234,
// }

// 示例 7: 取消任务
queue.cancelTask('job-1234567890-1');

// 示例 8: 并发控制
const concurrentQueue = createJobQueue({
  concurrency: 5, // 同时执行 5 个任务
  executionInterval: 100, // 任务间隔 100ms
});

// 示例 9: 等待所有任务完成
await queue.waitForCompletion(60000); // 最多等待 60 秒
console.log('所有任务完成!');

// 示例 10: 自定义配置
const customQueue = createJobQueue({
  maxQueueSize: 500,
  defaultPriority: 'P1',
  defaultMaxRetries: 5,
  defaultBackoffStrategy: 'linear',
  defaultBackoffBaseDelay: 2000,
  defaultBackoffMaxDelay: 60000,
  concurrency: 3,
});
*/
