/**
 * Promise 异步工具技能
 * 
 * 功能:
 * 1. Promise 并发控制 (限制同时执行的任务数量)
 * 2. 重试机制 (指数退避/固定间隔)
 * 3. 超时/竞态处理 (timeout/race)
 * 
 * @module skills/promise-utils
 */

// ==================== 并发控制 ====================

/**
 * 并发限制执行器配置
 */
export interface ConcurrencyOptions {
  /** 最大并发数，默认 5 */
  limit?: number;
  /** 是否在任务失败时立即停止，默认 false */
  stopOnError?: boolean;
  /** 任务间隔时间 (ms)，默认 0 */
  interval?: number;
}

/**
 * 并发任务结果
 */
export interface ConcurrencyResult<T> {
  /** 任务索引 */
  index: number;
  /** 任务结果 */
  value?: T;
  /** 任务错误 */
  error?: any;
  /** 是否成功 */
  success: boolean;
}

/**
 * 并发限制执行器
 * 控制同时执行的 Promise 数量，避免资源耗尽
 * 
 * @param tasks - Promise 任务数组
 * @param options - 并发控制选项
 * @returns 任务结果数组
 * 
 * @example
 * const tasks = [
 *   () => fetch('/api/1'),
 *   () => fetch('/api/2'),
 *   () => fetch('/api/3'),
 * ];
 * const results = await mapWithConcurrency(tasks, { limit: 2 });
 */
export async function mapWithConcurrency<T>(
  tasks: Array<() => Promise<T>>,
  options: ConcurrencyOptions = {}
): Promise<ConcurrencyResult<T>[]> {
  const { limit = 5, stopOnError = false, interval = 0 } = options;
  const results: ConcurrencyResult<T>[] = [];
  let currentIndex = 0;
  let stopped = false;

  async function runTask(index: number): Promise<void> {
    if (stopped) return;

    const taskIndex = currentIndex++;
    if (taskIndex >= tasks.length) return;

    try {
      const value = await tasks[taskIndex]();
      results[taskIndex] = { index: taskIndex, value, success: true };
    } catch (error) {
      results[taskIndex] = { index: taskIndex, error, success: false };
      if (stopOnError) {
        stopped = true;
      }
    }

    // 任务间隔
    if (interval > 0 && taskIndex < tasks.length - 1) {
      await sleep(interval);
    }

    // 继续执行下一个任务
    await runTask(index);
  }

  // 启动初始并发任务
  const initialTasks = Math.min(limit, tasks.length);
  await Promise.all(
    Array.from({ length: initialTasks }, (_, i) => runTask(i))
  );

  return results;
}

/**
 * 并发限制执行器 (简化版，只返回成功的结果)
 * 
 * @param tasks - Promise 任务数组
 * @param limit - 最大并发数，默认 5
 * @returns 成功的结果数组
 * 
 * @example
 * const urls = ['/api/1', '/api/2', '/api/3'];
 * const results = await promiseAllLimit(
 *   urls.map(url => () => fetch(url)),
 *   2
 * );
 */
export async function promiseAllLimit<T>(
  tasks: Array<() => Promise<T>>,
  limit: number = 5
): Promise<T[]> {
  const results = await mapWithConcurrency(tasks, { limit });
  return results.filter(r => r.success).map(r => r.value!);
}

/**
 * 批处理执行器
 * 将任务分批执行，每批完成后等待下一批
 * 
 * @param tasks - Promise 任务数组
 * @param batchSize - 每批任务数量
 * @param delayBetweenBatches - 批次间延迟 (ms)
 * @returns 所有任务结果
 * 
 * @example
 * const results = await processInBatches(
 *   tasks,
 *   10, // 每批 10 个
 *   1000 // 批次间延迟 1 秒
 * );
 */
export async function processInBatches<T>(
  tasks: Array<() => Promise<T>>,
  batchSize: number,
  delayBetweenBatches: number = 0
): Promise<T[]> {
  const results: T[] = [];
  
  for (let i = 0; i < tasks.length; i += batchSize) {
    const batch = tasks.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(task => task()));
    results.push(...batchResults);
    
    if (delayBetweenBatches > 0 && i + batchSize < tasks.length) {
      await sleep(delayBetweenBatches);
    }
  }
  
  return results;
}

// ==================== 重试机制 ====================

/**
 * 重试策略配置
 */
export interface RetryOptions {
  /** 最大重试次数，默认 3 */
  maxRetries?: number;
  /** 重试间隔 (ms)，默认 1000 */
  delay?: number;
  /** 是否使用指数退避，默认 false */
  exponentialBackoff?: boolean;
  /** 最大延迟时间 (ms)，用于指数退避，默认 30000 */
  maxDelay?: number;
  /** 重试条件函数，返回 true 时重试，默认重试所有错误 */
  shouldRetry?: (error: any) => boolean;
  /** 每次重试的回调函数 */
  onRetry?: (attempt: number, error: any) => void;
}

/**
 * 带重试的 Promise 执行器
 * 
 * @param fn - 要执行的异步函数
 * @param options - 重试选项
 * @returns Promise 结果
 * 
 * @example
 * // 基础重试
 * const result = await withRetry(
 *   () => fetch('/api/unstable'),
 *   { maxRetries: 3, delay: 1000 }
 * );
 * 
 * @example
 * // 指数退避重试
 * const result = await withRetry(
 *   () => apiCall(),
 *   { 
 *     maxRetries: 5, 
 *     exponentialBackoff: true,
 *     onRetry: (attempt, error) => console.log(`Retry ${attempt}: ${error}`)
 *   }
 * );
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    delay = 1000,
    exponentialBackoff = false,
    maxDelay = 30000,
    shouldRetry,
    onRetry,
  } = options;

  let lastError: any;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // 检查是否应该重试
      if (shouldRetry && !shouldRetry(error)) {
        throw error;
      }

      // 如果已达到最大重试次数，不再重试
      if (attempt >= maxRetries) {
        break;
      }

      // 调用重试回调
      onRetry?.(attempt + 1, error);

      // 计算延迟时间
      let waitTime = delay;
      if (exponentialBackoff) {
        waitTime = Math.min(delay * Math.pow(2, attempt), maxDelay);
      }

      // 等待后重试
      await sleep(waitTime);
    }
  }

  throw lastError;
}

/**
 * 重试执行器 (带抖动，避免多个客户端同时重试)
 * 
 * @param fn - 要执行的异步函数
 * @param options - 重试选项
 * @returns Promise 结果
 * 
 * @example
 * const result = await withRetryJitter(
 *   () => apiCall(),
 *   { maxRetries: 3, delay: 1000 }
 * );
 */
export async function withRetryJitter<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const { delay = 1000 } = options;

  // 添加 0-25% 的随机抖动
  const jitter = delay * 0.25 * Math.random();
  const adjustedDelay = delay + jitter;

  return withRetry(fn, { ...options, delay: adjustedDelay });
}

/**
 * 可重试的 Promise 包装器
 * 返回一个包含成功/失败状态的对象，而不是抛出异常
 * 
 * @param fn - 要执行的异步函数
 * @param options - 重试选项
 * @returns 包含结果或错误的对象
 * 
 * @example
 * const result = await retryable(
 *   () => fetch('/api/data'),
 *   { maxRetries: 3 }
 * );
 * 
 * if (result.success) {
 *   console.log(result.data);
 * } else {
 *   console.error(result.error);
 * }
 */
export async function retryable<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<{ success: true; data: T } | { success: false; error: any }> {
  try {
    const data = await withRetry(fn, options);
    return { success: true, data };
  } catch (error) {
    return { success: false, error };
  }
}

// ==================== 超时/竞态处理 ====================

/**
 * 带超时的 Promise
 * 
 * @param promise - 要设置超时的 Promise
 * @param timeout - 超时时间 (ms)
 * @param message - 超时错误消息，默认 "Promise timed out"
 * @returns Promise 结果
 * 
 * @throws TimeoutError 当超时时抛出
 * 
 * @example
 * try {
 *   const result = await withTimeout(
 *     fetch('/api/slow'),
 *     5000 // 5 秒超时
 *   );
 * } catch (error) {
 *   if (error instanceof TimeoutError) {
 *     console.error('请求超时');
 *   }
 * }
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeout: number,
  message: string = 'Promise timed out'
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new TimeoutError(message)), timeout)
    ),
  ]);
}

/**
 * 超时错误类
 */
export class TimeoutError extends Error {
  constructor(message: string = 'Promise timed out') {
    super(message);
    this.name = 'TimeoutError';
  }
}

/**
 * 可取消的 Promise
 * 返回一个包含取消函数的对象
 * 
 * @param fn - 异步函数，接收 cancelToken 参数
 * @returns 包含 promise 和 cancel 函数的对象
 * 
 * @example
 * const { promise, cancel } = cancellable(async (cancelToken) => {
 *   while (!cancelToken.cancelled) {
 *     await doWork();
 *     await sleep(100);
 *   }
 * });
 * 
 * // 稍后可以取消
 * cancel();
 */
export function cancellable<T>(
  fn: (cancelToken: { cancelled: boolean }) => Promise<T>
): { promise: Promise<T>; cancel: () => void } {
  const cancelToken = { cancelled: false };
  let cancelFn: () => void = () => {};

  const promise = new Promise<T>((resolve, reject) => {
    cancelFn = async () => {
      cancelToken.cancelled = true;
      reject(new CancelledError('Operation cancelled'));
    };

    fn(cancelToken).then(resolve).catch(reject);
  });

  return { promise, cancel: cancelFn };
}

/**
 * 取消错误类
 */
export class CancelledError extends Error {
  constructor(message: string = 'Operation cancelled') {
    super(message);
    this.name = 'CancelledError';
  }
}

/**
 * Promise 竞态 (取最先完成的结果)
 * 与 Promise.race 不同，这个版本会等待所有 Promise 完成，但只返回最先完成的结果
 * 
 * @param promises - Promise 数组
 * @returns 最先完成的 Promise 结果
 * 
 * @example
 * const result = await raceToSuccess([
 *   fetch('/api/fast'),
 *   fetch('/api/slow'),
 *   fetch('/api/medium'),
 * ]);
 */
export async function raceToSuccess<T>(
  promises: Promise<T>[]
): Promise<T> {
  return Promise.race(promises);
}

/**
 * 竞态执行器 (多个异步源，取第一个成功的结果)
 * 
 * @param tasks - 异步任务数组
 * @param timeout - 可选的总超时时间
 * @returns 第一个成功的结果
 * 
 * @example
 * const result = await raceToFirstSuccess([
 *   () => fetchFromCache(),
 *   () => fetchFromAPI(),
 *   () => fetchFromFallback(),
 * ], 10000);
 */
export async function raceToFirstSuccess<T>(
  tasks: Array<() => Promise<T>>,
  timeout?: number
): Promise<T> {
  const promises = tasks.map(task => task());
  
  if (timeout) {
    return withTimeout(Promise.race(promises), timeout);
  }
  
  return Promise.race(promises);
}

/**
 * 延迟执行 Promise
 * 
 * @param fn - 要延迟执行的异步函数
 * @param delay - 延迟时间 (ms)
 * @returns Promise 结果
 * 
 * @example
 * const result = await delayExecution(
 *   () => fetchData(),
 *   1000 // 延迟 1 秒执行
 * );
 */
export async function delayExecution<T>(
  fn: () => Promise<T>,
  delay: number
): Promise<T> {
  await sleep(delay);
  return fn();
}

/**
 * 防抖执行器
 * 返回一个防抖函数，在指定时间内只执行最后一次
 * 
 * @param fn - 要防抖的异步函数
 * @param wait - 等待时间 (ms)
 * @returns 防抖函数
 * 
 * @example
 * const debouncedSearch = debounce(
 *   (query) => searchAPI(query),
 *   300
 * );
 * 
 * // 多次调用只会执行最后一次
 * debouncedSearch('a');
 * debouncedSearch('ab');
 * debouncedSearch('abc'); // 只有这个会执行
 */
export function debounce<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  wait: number
): (...args: Parameters<T>) => Promise<ReturnType<T>> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let lastResolve: ((value: any) => void) | null = null;

  return function (...args: Parameters<T>): Promise<ReturnType<T>> {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    return new Promise((resolve) => {
      lastResolve = resolve;
      timeoutId = setTimeout(async () => {
        const result = await fn(...args);
        if (lastResolve) {
          lastResolve(result);
        }
      }, wait);
    });
  };
}

/**
 * 节流执行器
 * 返回一个节流函数，在指定时间内只执行一次
 * 
 * @param fn - 要节流的异步函数
 * @param limit - 时间限制 (ms)
 * @returns 节流函数
 * 
 * @example
 * const throttledScroll = throttle(
 *   () => handleScroll(),
 *   100
 * );
 */
export function throttle<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  limit: number
): (...args: Parameters<T>) => Promise<ReturnType<T> | void> {
  let inWait = false;
  let lastArgs: Parameters<T> | null = null;
  let scheduled = false;

  return async function (...args: Parameters<T>): Promise<ReturnType<T> | void> {
    if (inWait) {
      lastArgs = args;
      if (!scheduled) {
        scheduled = true;
        setTimeout(async () => {
          scheduled = false;
          if (lastArgs) {
            await fn(...lastArgs);
            lastArgs = null;
          }
        }, limit);
      }
      return;
    }

    inWait = true;
    const result = await fn(...args);
    setTimeout(() => {
      inWait = false;
    }, limit);
    return result;
  };
}

// ==================== 辅助函数 ====================

/**
 * 睡眠/延迟函数
 * 
 * @param ms - 延迟时间 (ms)
 * @returns Promise
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 立即解析的 Promise
 * 
 * @param value - 要解析的值
 * @returns 已解析的 Promise
 */
export function resolveImmediately<T>(value: T): Promise<T> {
  return Promise.resolve(value);
}

/**
 * 立即拒绝的 Promise
 * 
 * @param reason - 拒绝原因
 * @returns 已拒绝的 Promise
 */
export function rejectImmediately<T = never>(reason?: any): Promise<T> {
  return Promise.reject(reason);
}

/**
 * 异步迭代器批处理
 * 
 * @param asyncIterable - 异步可迭代对象
 * @param batchSize - 批处理大小
 * @returns 批处理后的异步迭代器
 * 
 * @example
 * for await (const batch of batchAsyncIterable(fetchData(), 10)) {
 *   console.log('Batch:', batch);
 * }
 */
export async function* batchAsyncIterable<T>(
  asyncIterable: AsyncIterable<T>,
  batchSize: number
): AsyncGenerator<T[]> {
  let batch: T[] = [];
  
  for await (const item of asyncIterable) {
    batch.push(item);
    if (batch.length >= batchSize) {
      yield batch;
      batch = [];
    }
  }
  
  if (batch.length > 0) {
    yield batch;
  }
}

// ==================== 工具类 ====================

/**
 * Promise 工具类 (将所有函数打包为类)
 */
export class PromiseUtils {
  // 并发控制
  static mapWithConcurrency = mapWithConcurrency;
  static promiseAllLimit = promiseAllLimit;
  static processInBatches = processInBatches;

  // 重试机制
  static withRetry = withRetry;
  static withRetryJitter = withRetryJitter;
  static retryable = retryable;

  // 超时/竞态
  static withTimeout = withTimeout;
  static TimeoutError = TimeoutError;
  static cancellable = cancellable;
  static CancelledError = CancelledError;
  static raceToSuccess = raceToSuccess;
  static raceToFirstSuccess = raceToFirstSuccess;

  // 执行控制
  static delayExecution = delayExecution;
  static debounce = debounce;
  static throttle = throttle;

  // 辅助函数
  static sleep = sleep;
  static resolveImmediately = resolveImmediately;
  static rejectImmediately = rejectImmediately;
  static batchAsyncIterable = batchAsyncIterable;
}

export default PromiseUtils;
