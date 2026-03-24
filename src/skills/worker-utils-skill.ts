/**
 * Worker 工具技能 - KAEL
 * 
 * 提供 Worker 线程相关功能：
 * 1. Worker 创建与管理
 * 2. 消息通信 (postMessage/receive)
 * 3. 线程池管理 (创建/调度/销毁)
 */

import { Worker } from 'worker_threads';
import * as path from 'path';
import { EventEmitter } from 'events';

// ============================================
// 类型定义
// ============================================

/**
 * Worker 任务
 */
export interface WorkerTask {
  id: string;
  type: string;
  payload: any;
  priority?: number;
  timeoutMs?: number;
  createdAt: number;
}

/**
 * Worker 任务结果
 */
export interface WorkerTaskResult<T = any> {
  taskId: string;
  success: boolean;
  data?: T;
  error?: Error;
  duration: number;
}

/**
 * Worker 配置
 */
export interface WorkerOptions {
  /** Worker 脚本路径 */
  workerPath: string;
  /** Worker 名称 */
  name?: string;
  /** 是否启用 stderr 输出 */
  execArgv?: string[];
  /** 环境变量 */
  env?: Record<string, string>;
  /** 资源限制 */
  resourceLimits?: {
    maxOldGenerationSizeMb?: number;
    maxYoungGenerationSizeMb?: number;
    stackSizeMb?: number;
  };
}

/**
 * 线程池配置
 */
export interface ThreadPoolOptions {
  /** 最小 Worker 数量 */
  minWorkers?: number;
  /** 最大 Worker 数量 */
  maxWorkers?: number;
  /** Worker 空闲超时时间 (ms) */
  idleTimeout?: number;
  /** 任务超时时间 (ms) */
  taskTimeout?: number;
  /** Worker 脚本路径 */
  workerPath: string;
}

/**
 * Worker 状态
 */
export enum WorkerStatus {
  IDLE = 'idle',
  BUSY = 'busy',
  STOPPING = 'stopping',
  STOPPED = 'stopped'
}

/**
 * Worker 实例
 */
export interface WorkerInstance {
  id: string;
  worker: Worker;
  status: WorkerStatus;
  currentTaskId?: string;
  createdAt: number;
  lastActiveAt: number;
  taskCount: number;
}

// ============================================
// Worker 管理器
// ============================================

/**
 * Worker 管理器 - 单个 Worker 的生命周期管理
 */
export class WorkerManager extends EventEmitter {
  private worker: Worker | null = null;
  private options: WorkerOptions;
  private status: WorkerStatus = WorkerStatus.STOPPED;
  private pendingCallbacks: Map<string, {
    resolve: (result: any) => void;
    reject: (error: Error) => void;
    timeout?: NodeJS.Timeout;
  }> = new Map();
  private messageId: number = 0;

  constructor(options: WorkerOptions) {
    super();
    this.options = options;
  }

  /**
   * 创建 Worker
   */
  async create(): Promise<void> {
    if (this.worker) {
      throw new Error('Worker 已存在');
    }

    return new Promise((resolve, reject) => {
      try {
        this.worker = new Worker(this.options.workerPath, {
          execArgv: this.options.execArgv,
          env: this.options.env,
          resourceLimits: this.options.resourceLimits,
        });

        this.worker.on('online', () => {
          this.status = WorkerStatus.IDLE;
          this.emit('online', this);
          resolve();
        });

        this.worker.on('message', (message) => {
          this.handleMessage(message);
        });

        this.worker.on('error', (error) => {
          this.status = WorkerStatus.STOPPED;
          this.emit('error', error);
          this.rejectAllPending(error);
        });

        this.worker.on('exit', (code) => {
          this.status = WorkerStatus.STOPPED;
          this.worker = null;
          this.emit('exit', code);
          this.rejectAllPending(new Error(`Worker 已退出，代码：${code}`));
        });

        this.worker.on('messageerror', (error) => {
          this.emit('messageerror', error);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * 处理 Worker 消息
   */
  private handleMessage(message: any) {
    const { type, id, data, error } = message;

    if (type === 'result' && id) {
      const callback = this.pendingCallbacks.get(id);
      if (callback) {
        this.pendingCallbacks.delete(id);
        if (callback.timeout) {
          clearTimeout(callback.timeout);
        }

        if (error) {
          callback.reject(new Error(error));
        } else {
          callback.resolve(data);
        }

        this.status = WorkerStatus.IDLE;
        this.emit('taskComplete', { taskId: id, success: !error, data });
      }
    } else if (type === 'progress') {
      this.emit('progress', { id, data });
    }
  }

  /**
   * 拒绝所有待处理的任务
   */
  private rejectAllPending(error: Error) {
    for (const [id, callback] of this.pendingCallbacks.entries()) {
      if (callback.timeout) {
        clearTimeout(callback.timeout);
      }
      callback.reject(error);
    }
    this.pendingCallbacks.clear();
  }

  /**
   * 发送任务到 Worker
   */
  async sendTask<T = any>(task: WorkerTask): Promise<WorkerTaskResult<T>> {
    if (!this.worker || this.status !== WorkerStatus.IDLE) {
      throw new Error('Worker 不可用');
    }

    return new Promise((resolve, reject) => {
      const messageId = `${Date.now()}-${++this.messageId}`;
      const startTime = Date.now();

      this.status = WorkerStatus.BUSY;
      this.emit('taskStart', task);

      // 设置超时
      const timeout = task.timeoutMs ? setTimeout(() => {
        this.pendingCallbacks.delete(messageId);
        reject(new Error(`任务超时 (${task.timeoutMs}ms)`));
      }, task.timeoutMs) : undefined;

      this.pendingCallbacks.set(messageId, {
        resolve: (data: T) => {
          resolve({
            taskId: task.id,
            success: true,
            data,
            duration: Date.now() - startTime
          });
        },
        reject,
        timeout
      });

      this.worker!.postMessage({
        type: 'task',
        id: messageId,
        task
      });
    });
  }

  /**
   * 终止 Worker
   */
  async terminate(): Promise<void> {
    if (!this.worker) {
      return;
    }

    this.status = WorkerStatus.STOPPING;
    this.emit('stopping');

    // 拒绝所有待处理的任务
    this.rejectAllPending(new Error('Worker 已终止'));

    return new Promise((resolve, reject) => {
      this.worker!.terminate((err) => {
        if (err) {
          reject(err);
        } else {
          this.worker = null;
          this.status = WorkerStatus.STOPPED;
          this.emit('stopped');
          resolve();
        }
      });
    });
  }

  /**
   * 获取 Worker 状态
   */
  getStatus(): WorkerStatus {
    return this.status;
  }

  /**
   * 检查 Worker 是否可用
   */
  isAvailable(): boolean {
    return this.status === WorkerStatus.IDLE && this.worker !== null;
  }
}

// ============================================
// 线程池管理器
// ============================================

/**
 * 线程池管理器 - 管理多个 Worker 实例
 */
export class ThreadPoolManager extends EventEmitter {
  private workers: Map<string, WorkerInstance> = new Map();
  private taskQueue: Array<{
    task: WorkerTask;
    resolve: (result: WorkerTaskResult) => void;
    reject: (error: Error) => void;
  }> = [];
  private options: ThreadPoolOptions;
  private isShuttingDown: boolean = false;
  private idleCheckInterval?: NodeJS.Timeout;

  constructor(options: ThreadPoolOptions) {
    super();
    this.options = {
      minWorkers: options.minWorkers || 2,
      maxWorkers: options.maxWorkers || 8,
      idleTimeout: options.idleTimeout || 60000,
      taskTimeout: options.taskTimeout || 300000,
      workerPath: options.workerPath
    };
  }

  /**
   * 初始化线程池
   */
  async initialize(): Promise<void> {
    const initPromises: Promise<void>[] = [];

    for (let i = 0; i < this.options.minWorkers!; i++) {
      initPromises.push(this.createWorker());
    }

    await Promise.all(initPromises);
    this.startIdleCheck();

    this.emit('initialized', {
      minWorkers: this.options.minWorkers,
      maxWorkers: this.options.maxWorkers
    });
  }

  /**
   * 创建 Worker
   */
  private async createWorker(): Promise<string> {
    if (this.workers.size >= this.options.maxWorkers!) {
      throw new Error('已达到最大 Worker 数量');
    }

    const workerId = `worker-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const manager = new WorkerManager({
      workerPath: this.options.workerPath,
      name: workerId
    });

    await manager.create();

    const workerInstance: WorkerInstance = {
      id: workerId,
      worker: (manager as any).worker,
      status: WorkerStatus.IDLE,
      createdAt: Date.now(),
      lastActiveAt: Date.now(),
      taskCount: 0
    };

    // 监听 Worker 事件
    manager.on('taskComplete', () => {
      workerInstance.taskCount++;
      workerInstance.lastActiveAt = Date.now();
      this.processQueue();
    });

    manager.on('exit', () => {
      this.workers.delete(workerId);
      if (!this.isShuttingDown) {
        this.emit('workerExit', { workerId });
        // 自动重建 Worker
        if (this.workers.size < this.options.minWorkers!) {
          this.createWorker().catch(err => {
            this.emit('error', { error: err, workerId });
          });
        }
      }
    });

    this.workers.set(workerId, workerInstance);
    this.emit('workerCreated', { workerId });

    return workerId;
  }

  /**
   * 启动空闲检查
   */
  private startIdleCheck() {
    this.idleCheckInterval = setInterval(() => {
      const now = Date.now();
      const excessWorkers = this.workers.size - this.options.minWorkers!;

      if (excessWorkers > 0) {
        for (const [workerId, instance] of this.workers.entries()) {
          if (instance.status === WorkerStatus.IDLE &&
              now - instance.lastActiveAt > this.options.idleTimeout!) {
            this.destroyWorker(workerId).catch(err => {
              this.emit('error', { error: err, workerId });
            });
          }
        }
      }
    }, 10000);
  }

  /**
   * 销毁 Worker
   */
  private async destroyWorker(workerId: string): Promise<void> {
    const instance = this.workers.get(workerId);
    if (!instance) {
      return;
    }

    const manager = new WorkerManager({
      workerPath: this.options.workerPath,
      name: workerId
    });
    (manager as any).worker = instance.worker;

    await manager.terminate();
    this.workers.delete(workerId);
    this.emit('workerDestroyed', { workerId });
  }

  /**
   * 执行任务
   */
  async executeTask<T = any>(task: WorkerTask): Promise<WorkerTaskResult<T>> {
    if (this.isShuttingDown) {
      throw new Error('线程池正在关闭');
    }

    return new Promise((resolve, reject) => {
      this.taskQueue.push({ task, resolve, reject });
      this.processQueue();
    });
  }

  /**
   * 处理任务队列
   */
  private processQueue() {
    if (this.taskQueue.length === 0) {
      return;
    }

    // 查找空闲 Worker
    for (const [workerId, instance] of this.workers.entries()) {
      if (instance.status === WorkerStatus.IDLE) {
        const { task, resolve, reject } = this.taskQueue.shift()!;
        this.executeTaskOnWorker(workerId, task, resolve, reject);
        return;
      }
    }

    // 没有空闲 Worker，尝试创建新的
    if (this.workers.size < this.options.maxWorkers!) {
      this.createWorker()
        .then((workerId) => {
          const { task, resolve, reject } = this.taskQueue.shift()!;
          this.executeTaskOnWorker(workerId, task, resolve, reject);
        })
        .catch((err) => {
          const { reject } = this.taskQueue.shift()!;
          reject(err);
        });
    }
  }

  /**
   * 在 Worker 上执行任务
   */
  private async executeTaskOnWorker(
    workerId: string,
    task: WorkerTask,
    resolve: (result: WorkerTaskResult) => void,
    reject: (error: Error) => void
  ) {
    const instance = this.workers.get(workerId);
    if (!instance) {
      reject(new Error('Worker 不存在'));
      return;
    }

    const manager = new WorkerManager({
      workerPath: this.options.workerPath,
      name: workerId
    });
    (manager as any).worker = instance.worker;

    instance.status = WorkerStatus.BUSY;
    instance.currentTaskId = task.id;

    manager.sendTask(task)
      .then((result) => {
        instance.status = WorkerStatus.IDLE;
        instance.currentTaskId = undefined;
        resolve(result);
      })
      .catch((error) => {
        instance.status = WorkerStatus.IDLE;
        instance.currentTaskId = undefined;
        reject(error);
      });
  }

  /**
   * 获取线程池状态
   */
  getStatus() {
    const workers = Array.from(this.workers.values()).map(w => ({
      id: w.id,
      status: w.status,
      taskCount: w.taskCount,
      uptime: Date.now() - w.createdAt
    }));

    return {
      totalWorkers: this.workers.size,
      idleWorkers: workers.filter(w => w.status === WorkerStatus.IDLE).length,
      busyWorkers: workers.filter(w => w.status === WorkerStatus.BUSY).length,
      queuedTasks: this.taskQueue.length,
      workers
    };
  }

  /**
   * 关闭线程池
   */
  async shutdown(): Promise<void> {
    this.isShuttingDown = true;

    if (this.idleCheckInterval) {
      clearInterval(this.idleCheckInterval);
    }

    // 拒绝所有待处理的任务
    for (const { reject } of this.taskQueue) {
      reject(new Error('线程池已关闭'));
    }
    this.taskQueue = [];

    // 终止所有 Worker
    const terminatePromises: Promise<void>[] = [];
    for (const workerId of this.workers.keys()) {
      terminatePromises.push(this.destroyWorker(workerId));
    }

    await Promise.all(terminatePromises);
    this.emit('shutdown');
  }
}

// ============================================
// 辅助函数
// ============================================

/**
 * 创建 Worker 管理器
 */
export function createWorkerManager(options: WorkerOptions): WorkerManager {
  return new WorkerManager(options);
}

/**
 * 创建线程池
 */
export function createThreadPool(options: ThreadPoolOptions): ThreadPoolManager {
  return new ThreadPoolManager(options);
}

/**
 * 生成任务 ID
 */
export function generateTaskId(prefix: string = 'task'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// ============================================
// 使用示例
// ============================================

if (require.main === module) {
  console.log('=== Worker 工具技能 - 使用示例 ===\n');

  // 示例 1: 创建 Worker 管理器
  console.log('1️⃣ Worker 管理器示例:');
  console.log(`
  const manager = createWorkerManager({
    workerPath: path.join(__dirname, 'my-worker.js'),
    name: 'my-worker'
  });

  await manager.create();
  
  const result = await manager.sendTask({
    id: generateTaskId(),
    type: 'compute',
    payload: { data: [1, 2, 3, 4, 5] },
    timeoutMs: 5000
  });

  await manager.terminate();
  `);

  // 示例 2: 创建线程池
  console.log('2️⃣ 线程池示例:');
  console.log(`
  const pool = createThreadPool({
    minWorkers: 2,
    maxWorkers: 8,
    idleTimeout: 60000,
    taskTimeout: 300000,
    workerPath: path.join(__dirname, 'my-worker.js')
  });

  await pool.initialize();

  // 执行多个任务
  const tasks = Array.from({ length: 10 }, (_, i) => ({
    id: generateTaskId(),
    type: 'compute',
    payload: { index: i }
  }));

  const results = await Promise.all(
    tasks.map(task => pool.executeTask(task))
  );

  console.log('线程池状态:', pool.getStatus());

  await pool.shutdown();
  `);

  // 示例 3: 事件监听
  console.log('3️⃣ 事件监听示例:');
  console.log(`
  const manager = createWorkerManager({
    workerPath: path.join(__dirname, 'my-worker.js')
  });

  manager.on('online', () => console.log('Worker 已上线'));
  manager.on('taskStart', (task) => console.log('任务开始:', task.id));
  manager.on('taskComplete', (result) => console.log('任务完成:', result));
  manager.on('error', (error) => console.error('Worker 错误:', error));
  manager.on('stopped', () => console.log('Worker 已停止'));

  await manager.create();
  `);

  console.log('\n✅ 所有示例展示完成!');
  console.log('\n📝 提示: 实际使用时需要创建对应的 Worker 脚本文件');
}
