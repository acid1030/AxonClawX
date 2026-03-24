/**
 * 重试机制工具技能 - Retry Utils Skill
 * 
 * 功能:
 * 1. 自动重试 (Automatic Retry)
 * 2. 指数退避 (Exponential Backoff)
 * 3. 条件重试 (Conditional Retry)
 * 
 * @module skills/retry-utils
 * @author Axon
 * @version 1.0.0
 */

// ==================== 类型定义 ====================

/**
 * 重试策略类型
 */
export type RetryStrategy = 'exponential' | 'linear' | 'fixed';

/**
 * 重试配置选项
 */
export interface RetryOptions {
  /** 最大重试次数，默认 3 */
  maxRetries?: number;
  /** 初始延迟时间 (ms)，默认 1000 */
  initialDelay?: number;
  /** 最大延迟时间 (ms)，默认 30000 */
  maxDelay?: number;
  /** 退避策略，默认 'exponential' */
  strategy?: RetryStrategy;
  /** 退避因子 (用于指数退避)，默认 2 */
  backoffFactor?: number;
  /** 是否添加随机抖动 (Jitter)，默认 true */
  jitter?: boolean;
  /** 重试条件函数 */
  shouldRetry?: (error: any, attempt: number) => boolean | Promise<boolean>;
  /** 每次重试前的回调 */
  onRetry?: (error: any, attempt: number, delay: number) => void | Promise<void>;
  /** 成功后的回调 */
  onSuccess?: (result: any, attempt: number) => void | Promise<void>;
  /** 最终失败后的回调 */
  onFailure?: (error: any, totalAttempts: number) => void | Promise<void>;
  /** 超时时间 (ms)，0 表示无超时 */
  timeout?: number;
}

/**
 * 重试结果
 */
export interface RetryResult<T> {
  /** 是否成功 */
  success: boolean;
  /** 返回结果 (成功时) */
  value?: T;
  /** 错误信息 (失败时) */
  error?: any;
  /** 总尝试次数 */
  attempts: number;
  /** 总耗时 (ms) */
  totalTime: number;
  /** 每次重试的延迟时间数组 */
  delays: number[];
}

/**
 * 重试状态
 */
export interface RetryState {
  /** 当前尝试次数 */
  attempt: number;
  /** 是否应该停止重试 */
  shouldStop: boolean;
  /** 上次错误 */
  lastError?: any;
}

// ==================== 核心重试函数 ====================

/**
 * 计算下次重试延迟时间
 * 
 * @param attempt - 当前尝试次数 (从 1 开始)
 * @param options - 重试配置
 * @returns 延迟时间 (ms)
 */
export function calculateDelay(attempt: number, options: Required<RetryOptions>): number {
  const { strategy, initialDelay, maxDelay, backoffFactor, jitter } = options;
  
  let delay: number;
  
  switch (strategy) {
    case 'exponential':
      // 指数退避：initialDelay * (backoffFactor ^ (attempt - 1))
      delay = initialDelay * Math.pow(backoffFactor, attempt - 1);
      break;
    
    case 'linear':
      // 线性退避：initialDelay * attempt
      delay = initialDelay * attempt;
      break;
    
    case 'fixed':
      // 固定延迟
      delay = initialDelay;
      break;
    
    default:
      delay = initialDelay;
  }
  
  // 限制最大延迟
  delay = Math.min(delay, maxDelay);
  
  // 添加随机抖动 (Jitter) 避免多实例同时重试
  if (jitter) {
    // 在 0.5x ~ 1.5x 之间随机
    const jitterFactor = 0.5 + Math.random();
    delay = delay * jitterFactor;
  }
  
  return Math.round(delay);
}

/**
 * 带超时的 Promise 执行器
 * 
 * @param fn - 要执行的函数
 * @param timeout - 超时时间 (ms)
 * @returns Promise 结果
 */
async function executeWithTimeout<T>(fn: () => Promise<T>, timeout: number): Promise<T> {
  if (timeout <= 0) {
    return fn();
  }
  
  return Promise.race([
    fn(),
    new Promise<T>((_, reject) => 
      setTimeout(() => reject(new Error(`Timeout after ${timeout}ms`)), timeout)
    )
  ]);
}

/**
 * 延迟执行 (Sleep)
 * 
 * @param ms - 延迟毫秒数
 * @returns Promise
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 带重试机制的执行函数
 * 
 * @param fn - 要执行的异步函数
 * @param options - 重试配置选项
 * @returns 重试结果
 * 
 * @example
 * // 基本使用
 * const result = await retry(async () => {
 *   return await fetch('https://api.example.com/data');
 * }, { maxRetries: 3 });
 * 
 * @example
 * // 指数退避 + 抖动
 * const result = await retry(async () => {
 *   return await database.query('SELECT * FROM users');
 * }, {
 *   maxRetries: 5,
 *   strategy: 'exponential',
 *   initialDelay: 1000,
 *   jitter: true
 * });
 * 
 * @example
 * // 条件重试 (只在特定错误时重试)
 * const result = await retry(async () => {
 *   return await externalService.call();
 * }, {
 *   maxRetries: 3,
 *   shouldRetry: (error) => {
 *     // 只在网络错误时重试，业务错误不重试
 *     return error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT';
 *   }
 * });
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<RetryResult<T>> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 30000,
    strategy = 'exponential',
    backoffFactor = 2,
    jitter = true,
    shouldRetry,
    onRetry,
    onSuccess,
    onFailure,
    timeout = 0
  } = options;
  
  const normalizedOptions: Required<RetryOptions> = {
    maxRetries,
    initialDelay,
    maxDelay,
    strategy,
    backoffFactor,
    jitter,
    shouldRetry,
    onRetry,
    onSuccess,
    onFailure,
    timeout
  };
  
  const startTime = Date.now();
  const delays: number[] = [];
  let lastError: any;
  let attempts = 0;
  
  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    attempts = attempt;
    
    try {
      // 执行函数 (带超时)
      const result = await executeWithTimeout(fn, timeout);
      
      // 成功回调
      if (onSuccess) {
        await onSuccess(result, attempt);
      }
      
      const totalTime = Date.now() - startTime;
      
      return {
        success: true,
        value: result,
        attempts,
        totalTime,
        delays
      };
      
    } catch (error) {
      lastError = error;
      
      // 检查是否达到最大重试次数
      if (attempt > maxRetries) {
        break;
      }
      
      // 检查重试条件
      if (shouldRetry) {
        const shouldRetryResult = await shouldRetry(error, attempt);
        if (!shouldRetryResult) {
          break;
        }
      }
      
      // 计算延迟时间
      const delay = calculateDelay(attempt, normalizedOptions);
      delays.push(delay);
      
      // 重试前回调
      if (onRetry) {
        await onRetry(error, attempt, delay);
      }
      
      // 等待后重试
      await sleep(delay);
    }
  }
  
  // 最终失败回调
  if (onFailure) {
    await onFailure(lastError, attempts);
  }
  
  const totalTime = Date.now() - startTime;
  
  return {
    success: false,
    error: lastError,
    attempts,
    totalTime,
    delays
  };
}

// ==================== 便捷重试函数 ====================

/**
 * 快速重试 (使用默认配置)
 * 
 * @param fn - 要执行的函数
 * @param maxRetries - 最大重试次数，默认 3
 * @returns 重试结果
 * 
 * @example
 * const result = await retryQuick(async () => fetch('/api/data'));
 */
export async function retryQuick<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3
): Promise<RetryResult<T>> {
  return retry(fn, { maxRetries });
}

/**
 * 指数退避重试
 * 
 * @param fn - 要执行的函数
 * @param options - 配置选项
 * @returns 重试结果
 * 
 * @example
 * const result = await retryExponential(async () => db.connect(), {
 *   maxRetries: 5,
 *   initialDelay: 500
 * });
 */
export async function retryExponential<T>(
  fn: () => Promise<T>,
  options: Omit<RetryOptions, 'strategy'> = {}
): Promise<RetryResult<T>> {
  return retry(fn, { ...options, strategy: 'exponential' });
}

/**
 * 线性退避重试
 * 
 * @param fn - 要执行的函数
 * @param options - 配置选项
 * @returns 重试结果
 */
export async function retryLinear<T>(
  fn: () => Promise<T>,
  options: Omit<RetryOptions, 'strategy'> = {}
): Promise<RetryResult<T>> {
  return retry(fn, { ...options, strategy: 'linear' });
}

/**
 * 固定延迟重试
 * 
 * @param fn - 要执行的函数
 * @param options - 配置选项
 * @returns 重试结果
 */
export async function retryFixed<T>(
  fn: () => Promise<T>,
  options: Omit<RetryOptions, 'strategy'> = {}
): Promise<RetryResult<T>> {
  return retry(fn, { ...options, strategy: 'fixed' });
}

// ==================== 条件重试 ====================

/**
 * 网络错误重试条件
 * 常见的网络相关错误码
 */
export const NETWORK_ERROR_CODES = [
  'ECONNRESET',
  'ECONNREFUSED',
  'ETIMEDOUT',
  'ENOTFOUND',
  'EAI_AGAIN',
  'EPIPE',
  'UND_ERR_SOCKET'
];

/**
 * 检查错误是否为网络错误
 * 
 * @param error - 错误对象
 * @returns 是否为网络错误
 */
export function isNetworkError(error: any): boolean {
  if (!error) return false;
  
  // 检查错误码
  if (error.code && NETWORK_ERROR_CODES.includes(error.code)) {
    return true;
  }
  
  // 检查错误消息
  const message = (error.message || '').toLowerCase();
  const networkKeywords = [
    'network',
    'connection',
    'timeout',
    'reset',
    'refused',
    'not found',
    'fetch failed',
    'socket hang up'
  ];
  
  return networkKeywords.some(keyword => message.includes(keyword));
}

/**
 * 创建网络错误重试条件
 * 
 * @returns 重试条件函数
 * 
 * @example
 * const result = await retry(async () => fetch('/api'), {
 *   shouldRetry: createNetworkErrorRetryCondition()
 * });
 */
export function createNetworkErrorRetryCondition(): (error: any) => boolean {
  return (error: any) => isNetworkError(error);
}

/**
 * 创建 HTTP 状态码重试条件
 * 
 * @param retryableStatuses - 需要重试的状态码数组，默认 [500, 502, 503, 504]
 * @returns 重试条件函数
 * 
 * @example
 * const result = await retry(async () => fetch('/api'), {
 *   shouldRetry: createHttpStatusCodeRetryCondition([500, 502, 503, 504, 429])
 * });
 */
export function createHttpStatusCodeRetryCondition(
  retryableStatuses: number[] = [500, 502, 503, 504]
): (error: any) => boolean {
  return (error: any) => {
    if (!error) return false;
    
    // 检查 status 属性 (Fetch API, Axios 等)
    if (error.status && retryableStatuses.includes(error.status)) {
      return true;
    }
    
    // 检查 response.status (Axios)
    if (error.response?.status && retryableStatuses.includes(error.response.status)) {
      return true;
    }
    
    // 检查 statusCode (Node.js HTTP)
    if (error.statusCode && retryableStatuses.includes(error.statusCode)) {
      return true;
    }
    
    return false;
  };
}

/**
 * 创建组合重试条件 (多个条件任一满足即重试)
 * 
 * @param conditions - 条件函数数组
 * @returns 组合条件函数
 * 
 * @example
 * const result = await retry(async () => api.call(), {
 *   shouldRetry: createCompositeRetryCondition([
 *     createNetworkErrorRetryCondition(),
 *     createHttpStatusCodeRetryCondition([500, 502, 503, 504, 429])
 *   ])
 * });
 */
export function createCompositeRetryCondition(
  conditions: Array<(error: any, attempt: number) => boolean | Promise<boolean>>
): (error: any, attempt: number) => boolean | Promise<boolean> {
  return async (error: any, attempt: number) => {
    for (const condition of conditions) {
      const result = await condition(error, attempt);
      if (result) return true;
    }
    return false;
  };
}

// ==================== 高级重试功能 ====================

/**
 * 重试断路器 (Circuit Breaker)
 * 当连续失败达到阈值时，暂时停止重试
 */
export interface CircuitBreakerOptions {
  /** 失败阈值，达到后触发断路器，默认 5 */
  failureThreshold?: number;
  /** 断路器打开后的等待时间 (ms)，默认 60000 */
  resetTimeout?: number;
  /** 成功阈值 (半开状态下需要多少次成功), 默认 2 */
  successThreshold?: number;
}

export type CircuitBreakerState = 'closed' | 'open' | 'half-open';

export class CircuitBreaker {
  private state: CircuitBreakerState = 'closed';
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime?: number;
  
  private readonly failureThreshold: number;
  private readonly resetTimeout: number;
  private readonly successThreshold: number;
  
  constructor(options: CircuitBreakerOptions = {}) {
    this.failureThreshold = options.failureThreshold ?? 5;
    this.resetTimeout = options.resetTimeout ?? 60000;
    this.successThreshold = options.successThreshold ?? 2;
  }
  
  /**
   * 记录成功
   */
  onSuccess(): void {
    if (this.state === 'half-open') {
      this.successCount++;
      if (this.successCount >= this.successThreshold) {
        this.state = 'closed';
        this.failureCount = 0;
        this.successCount = 0;
      }
    } else {
      this.failureCount = 0;
    }
  }
  
  /**
   * 记录失败
   */
  onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    if (this.failureCount >= this.failureThreshold) {
      this.state = 'open';
    }
  }
  
  /**
   * 检查是否允许执行
   */
  canExecute(): boolean {
    if (this.state === 'closed') {
      return true;
    }
    
    if (this.state === 'open') {
      // 检查是否已过重置超时
      if (this.lastFailureTime && Date.now() - this.lastFailureTime >= this.resetTimeout) {
        this.state = 'half-open';
        this.successCount = 0;
        return true;
      }
      return false;
    }
    
    // half-open 状态允许执行
    return true;
  }
  
  /**
   * 获取当前状态
   */
  getState(): CircuitBreakerState {
    return this.state;
  }
  
  /**
   * 重置断路器
   */
  reset(): void {
    this.state = 'closed';
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = undefined;
  }
}

/**
 * 带断路器的重试执行
 * 
 * @param fn - 要执行的函数
 * @param breaker - 断路器实例
 * @param options - 重试选项
 * @returns 重试结果
 * 
 * @example
 * const breaker = new CircuitBreaker({ failureThreshold: 5 });
 * const result = await retryWithCircuitBreaker(async () => api.call(), breaker);
 */
export async function retryWithCircuitBreaker<T>(
  fn: () => Promise<T>,
  breaker: CircuitBreaker,
  options: RetryOptions = {}
): Promise<RetryResult<T>> {
  // 检查断路器状态
  if (!breaker.canExecute()) {
    const error = new Error('Circuit breaker is open');
    (error as any).code = 'CIRCUIT_BREAKER_OPEN';
    
    return {
      success: false,
      error,
      attempts: 0,
      totalTime: 0,
      delays: []
    };
  }
  
  const result = await retry(fn, options);
  
  // 更新断路器状态
  if (result.success) {
    breaker.onSuccess();
  } else {
    breaker.onFailure();
  }
  
  return result;
}

// ==================== 工具函数 ====================

/**
 * 格式化重试结果为人类可读字符串
 * 
 * @param result - 重试结果
 * @returns 格式化字符串
 */
export function formatRetryResult(result: RetryResult<any>): string {
  const status = result.success ? '✅ Success' : '❌ Failed';
  const attempts = result.success 
    ? `Succeeded on attempt ${result.attempts}`
    : `Failed after ${result.attempts} attempts`;
  
  let output = `${status} - ${attempts}\n`;
  output += `Total time: ${result.totalTime}ms`;
  
  if (result.delays.length > 0) {
    output += `\nDelays: ${result.delays.join('ms, ')}ms`;
  }
  
  if (!result.success && result.error) {
    const errorMsg = result.error.message || String(result.error);
    output += `\nError: ${errorMsg}`;
  }
  
  return output;
}

/**
 * 创建重试日志记录器
 * 
 * @param logger - 日志函数
 * @returns 重试选项 (包含回调)
 * 
 * @example
 * const logger = (msg: string) => console.log(`[Retry] ${msg}`);
 * const result = await retry(async () => api.call(), {
 *   ...createRetryLogger(logger),
 *   maxRetries: 5
 * });
 */
export function createRetryLogger(logger: (message: string) => void): Partial<RetryOptions> {
  return {
    onRetry: (error, attempt, delay) => {
      const errorMsg = error.message || String(error);
      logger(`Attempt ${attempt} failed: ${errorMsg}. Retrying in ${delay}ms...`);
    },
    onSuccess: (result, attempt) => {
      logger(`Succeeded on attempt ${attempt}`);
    },
    onFailure: (error, totalAttempts) => {
      const errorMsg = error.message || String(error);
      logger(`All ${totalAttempts} attempts failed: ${errorMsg}`);
    }
  };
}

// ==================== 导出 ====================

export default {
  // 核心函数
  retry,
  retryQuick,
  retryExponential,
  retryLinear,
  retryFixed,
  
  // 工具函数
  sleep,
  calculateDelay,
  formatRetryResult,
  createRetryLogger,
  
  // 条件重试
  isNetworkError,
  createNetworkErrorRetryCondition,
  createHttpStatusCodeRetryCondition,
  createCompositeRetryCondition,
  
  // 断路器
  CircuitBreaker,
  retryWithCircuitBreaker,
  
  // 常量
  NETWORK_ERROR_CODES,
  
  // 类型
  type RetryOptions,
  type RetryResult,
  type RetryState,
  type RetryStrategy,
  type CircuitBreakerOptions,
  type CircuitBreakerState
};
