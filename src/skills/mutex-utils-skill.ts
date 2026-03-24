/**
 * 互斥锁工具技能
 * 
 * 功能:
 * 1. Mutex 互斥锁 - 保证同一时间只有一个任务执行
 * 2. Semaphore 信号量 - 控制并发任务数量
 * 3. RWLock 读写锁 - 允许多个读或单个写
 * 
 * @module skills/mutex-utils
 */

// ==================== Mutex 互斥锁 ====================

/**
 * Mutex 互斥锁类
 * 
 * 保证同一时间只有一个异步操作可以执行
 * 适用于保护共享资源、防止竞态条件
 */
export class Mutex {
  private locked: boolean = false;
  private queue: Array<() => void> = [];

  /**
   * 获取锁
   * @returns Promise，解析时获得锁
   */
  async acquire(): Promise<void> {
    return new Promise<void>((resolve) => {
      if (!this.locked) {
        this.locked = true;
        resolve();
      } else {
        this.queue.push(resolve);
      }
    });
  }

  /**
   * 释放锁
   */
  release(): void {
    if (this.queue.length > 0) {
      const next = this.queue.shift();
      if (next) next();
    } else {
      this.locked = false;
    }
  }

  /**
   * 执行受保护的异步操作
   * @param fn - 要执行的异步函数
   * @returns 函数的返回值
   */
  async run<T>(fn: () => Promise<T>): Promise<T> {
    await this.acquire();
    try {
      return await fn();
    } finally {
      this.release();
    }
  }

  /**
   * 尝试获取锁 (非阻塞)
   * @returns 是否成功获取锁
   */
  tryAcquire(): boolean {
    if (!this.locked) {
      this.locked = true;
      return true;
    }
    return false;
  }

  /**
   * 检查锁是否被持有
   * @returns 是否被持有
   */
  isLocked(): boolean {
    return this.locked;
  }

  /**
   * 获取等待队列长度
   * @returns 等待的任务数
   */
  queueLength(): number {
    return this.queue.length;
  }
}

// ==================== Semaphore 信号量 ====================

/**
 * Semaphore 信号量类
 * 
 * 控制同时执行的异步操作数量
 * 适用于限制并发请求、池化资源
 */
export class Semaphore {
  private count: number;
  private maxCount: number;
  private queue: Array<() => void> = [];

  /**
   * 创建信号量
   * @param maxCount - 最大并发数
   */
  constructor(maxCount: number) {
    if (maxCount <= 0) {
      throw new Error('Semaphore count must be positive');
    }
    this.maxCount = maxCount;
    this.count = maxCount;
  }

  /**
   * 获取许可
   * @returns Promise，解析时获得许可
   */
  async acquire(): Promise<void> {
    return new Promise<void>((resolve) => {
      if (this.count > 0) {
        this.count--;
        resolve();
      } else {
        this.queue.push(resolve);
      }
    });
  }

  /**
   * 释放许可
   */
  release(): void {
    if (this.queue.length > 0) {
      const next = this.queue.shift();
      if (next) next();
    } else {
      this.count++;
    }
  }

  /**
   * 执行受限制的异步操作
   * @param fn - 要执行的异步函数
   * @returns 函数的返回值
   */
  async run<T>(fn: () => Promise<T>): Promise<T> {
    await this.acquire();
    try {
      return await fn();
    } finally {
      this.release();
    }
  }

  /**
   * 尝试获取许可 (非阻塞)
   * @returns 是否成功获取许可
   */
  tryAcquire(): boolean {
    if (this.count > 0) {
      this.count--;
      return true;
    }
    return false;
  }

  /**
   * 获取当前可用许可数
   * @returns 可用许可数
   */
  available(): number {
    return this.count;
  }

  /**
   * 获取等待队列长度
   * @returns 等待的任务数
   */
  queueLength(): number {
    return this.queue.length;
  }

  /**
   * 获取最大并发数
   * @returns 最大并发数
   */
  maxConcurrency(): number {
    return this.maxCount;
  }
}

// ==================== RWLock 读写锁 ====================

/**
 * RWLock 读写锁类
 * 
 * 允许多个读者同时读取，但写者独占访问
 * 适用于读多写少的场景
 */
export class RWLock {
  private readers: number = 0;
  private writer: boolean = false;
  private readerQueue: Array<() => void> = [];
  private writerQueue: Array<() => void> = [];
  private pendingWriter: boolean = false;

  /**
   * 获取读锁
   * @returns Promise，解析时获得读锁
   */
  async acquireRead(): Promise<void> {
    return new Promise<void>((resolve) => {
      // 如果有等待的写者，新读者需要等待 (写者优先)
      if (this.writer || this.pendingWriter) {
        this.readerQueue.push(resolve);
      } else {
        this.readers++;
        resolve();
      }
    });
  }

  /**
   * 释放读锁
   */
  releaseRead(): void {
    this.readers--;
    
    // 如果没有读者了，且有等待的写者，唤醒写者
    if (this.readers === 0 && this.writerQueue.length > 0) {
      const nextWriter = this.writerQueue.shift();
      if (nextWriter) {
        this.writer = true;
        nextWriter();
      }
    }
  }

  /**
   * 获取写锁
   * @returns Promise，解析时获得写锁
   */
  async acquireWrite(): Promise<void> {
    return new Promise<void>((resolve) => {
      this.pendingWriter = true;
      
      // 如果有读者或写者，需要等待
      if (this.readers > 0 || this.writer) {
        this.writerQueue.push(resolve);
      } else {
        this.writer = true;
        this.pendingWriter = false;
        resolve();
      }
    });
  }

  /**
   * 释放写锁
   */
  releaseWrite(): void {
    this.writer = false;
    this.pendingWriter = false;
    
    // 优先唤醒等待的写者
    if (this.writerQueue.length > 0) {
      const nextWriter = this.writerQueue.shift();
      if (nextWriter) {
        this.writer = true;
        nextWriter();
      }
    } else {
      // 没有等待的写者，唤醒所有读者
      while (this.readerQueue.length > 0) {
        const nextReader = this.readerQueue.shift();
        if (nextReader) {
          this.readers++;
          nextReader();
        }
      }
    }
  }

  /**
   * 执行读操作
   * @param fn - 要执行的读函数
   * @returns 函数的返回值
   */
  async read<T>(fn: () => Promise<T>): Promise<T> {
    await this.acquireRead();
    try {
      return await fn();
    } finally {
      this.releaseRead();
    }
  }

  /**
   * 执行写操作
   * @param fn - 要执行的写函数
   * @returns 函数的返回值
   */
  async write<T>(fn: () => Promise<T>): Promise<T> {
    await this.acquireWrite();
    try {
      return await fn();
    } finally {
      this.releaseWrite();
    }
  }

  /**
   * 尝试获取读锁 (非阻塞)
   * @returns 是否成功获取读锁
   */
  tryAcquireRead(): boolean {
    if (!this.writer && !this.pendingWriter) {
      this.readers++;
      return true;
    }
    return false;
  }

  /**
   * 尝试获取写锁 (非阻塞)
   * @returns 是否成功获取写锁
   */
  tryAcquireWrite(): boolean {
    if (this.readers === 0 && !this.writer) {
      this.writer = true;
      return true;
    }
    return false;
  }

  /**
   * 获取当前读者数量
   * @returns 读者数
   */
  readerCount(): number {
    return this.readers;
  }

  /**
   * 检查是否有写锁被持有
   * @returns 是否有写锁
   */
  isWriteLocked(): boolean {
    return this.writer;
  }

  /**
   * 获取等待队列信息
   * @returns 等待队列长度
   */
  queueInfo(): { readers: number; writers: number } {
    return {
      readers: this.readerQueue.length,
      writers: this.writerQueue.length,
    };
  }
}

// ==================== 高级工具函数 ====================

/**
 * 创建一个带超时的 Mutex 获取操作
 * @param mutex - Mutex 实例
 * @param timeoutMs - 超时时间 (毫秒)
 * @returns Promise，成功时返回 true，超时返回 false
 */
export async function acquireWithTimeout(
  mutex: Mutex,
  timeoutMs: number
): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    let resolved = false;
    
    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        resolve(false);
      }
    }, timeoutMs);
    
    mutex.acquire().then(() => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
        resolve(true);
      } else {
        mutex.release();
      }
    });
  });
}

/**
 * 创建一个带超时的 Semaphore 获取操作
 * @param semaphore - Semaphore 实例
 * @param timeoutMs - 超时时间 (毫秒)
 * @returns Promise，成功时返回 true，超时返回 false
 */
export async function acquireSemaphoreWithTimeout(
  semaphore: Semaphore,
  timeoutMs: number
): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    let resolved = false;
    
    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        resolve(false);
      }
    }, timeoutMs);
    
    semaphore.acquire().then(() => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
        resolve(true);
      } else {
        semaphore.release();
      }
    });
  });
}

/**
 * 批量执行受信号量限制的任务
 * @param semaphore - Semaphore 实例
 * @param tasks - 任务数组
 * @returns 所有任务的结果
 */
export async function runAllWithSemaphore<T>(
  semaphore: Semaphore,
  tasks: Array<() => Promise<T>>
): Promise<T[]> {
  return Promise.all(tasks.map(task => semaphore.run(task)));
}

/**
 * 创建一个可重入的 Mutex (允许同一任务多次获取)
 */
export class ReentrantMutex {
  private owner: any = null;
  private count: number = 0;
  private queue: Array<() => void> = [];

  /**
   * 获取锁
   * @returns Promise，解析时获得锁
   */
  async acquire(): Promise<void> {
    const currentOwner = this; // Use instance as owner identifier
    
    return new Promise<void>((resolve) => {
      if (this.owner === null || this.owner === currentOwner) {
        this.owner = currentOwner;
        this.count++;
        resolve();
      } else {
        this.queue.push(resolve);
      }
    });
  }

  /**
   * 释放锁
   */
  release(): void {
    if (this.count > 0) {
      this.count--;
      if (this.count === 0) {
        this.owner = null;
        if (this.queue.length > 0) {
          const next = this.queue.shift();
          if (next) next();
        }
      }
    }
  }

  /**
   * 执行受保护的异步操作
   * @param fn - 要执行的异步函数
   * @returns 函数的返回值
   */
  async run<T>(fn: () => Promise<T>): Promise<T> {
    await this.acquire();
    try {
      return await fn();
    } finally {
      this.release();
    }
  }

  /**
   * 获取当前持有层数
   * @returns 持有层数
   */
  holdCount(): number {
    return this.count;
  }
}

// ==================== 导出 ====================

export const MutexUtils = {
  // 核心类
  Mutex,
  Semaphore,
  RWLock,
  
  // 高级工具
  ReentrantMutex,
  acquireWithTimeout,
  acquireSemaphoreWithTimeout,
  runAllWithSemaphore,
};

export default MutexUtils;
