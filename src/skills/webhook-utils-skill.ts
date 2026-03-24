/**
 * Webhook Utils Skill - 增强版 Webhook 工具
 * 
 * 功能:
 * 1. Webhook 发送 (支持多种 HTTP 方法)
 * 2. 签名验证 (HMAC-SHA256/SHA512)
 * 3. 重试机制 (指数退避 + 抖动)
 * 4. 请求队列管理
 * 5. 速率限制
 * 6. 事件日志
 * 
 * @author Axon (NOVA Subagent)
 * @version 1.0.0
 * @created 2026-03-13
 */

import * as crypto from 'crypto';

// ============== 类型定义 ==============

/**
 * HTTP 方法类型
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';

/**
 * 签名算法类型
 */
export type SignatureAlgorithm = 'sha256' | 'sha512';

/**
 * Webhook 配置接口
 */
export interface WebhookConfig {
  /** Webhook URL */
  url: string;
  /** HTTP 方法 */
  method?: HttpMethod;
  /** 请求头 */
  headers?: Record<string, string>;
  /** 签名密钥 */
  secret?: string;
  /** 签名算法 */
  signatureAlgorithm?: SignatureAlgorithm;
  /** 签名头名称 */
  signatureHeader?: string;
  /** 超时时间 (毫秒) */
  timeout?: number;
  /** 重试配置 */
  retry?: RetryConfig;
  /** 速率限制配置 */
  rateLimit?: RateLimitConfig;
  /** 是否启用日志 */
  enableLogging?: boolean;
}

/**
 * 重试配置接口
 */
export interface RetryConfig {
  /** 最大重试次数 */
  maxRetries: number;
  /** 初始延迟 (毫秒) */
  initialDelay?: number;
  /** 最大延迟 (毫秒) */
  maxDelay?: number;
  /** 退避因子 */
  backoffFactor?: number;
  /** 是否启用抖动 (Jitter) */
  enableJitter?: boolean;
  /** 抖动范围 (0-1) */
  jitterRange?: number;
  /** 触发重试的 HTTP 状态码 */
  retryStatusCodes?: number[];
}

/**
 * 速率限制配置接口
 */
export interface RateLimitConfig {
  /** 时间窗口 (毫秒) */
  windowMs: number;
  /** 窗口内最大请求数 */
  maxRequests: number;
}

/**
 * Webhook 载荷接口
 */
export interface WebhookPayload {
  /** 事件类型 */
  event: string;
  /** 时间戳 */
  timestamp: number;
  /** 数据内容 */
  data: any;
  /** 唯一 ID */
  id?: string;
  /** 来源 */
  source?: string;
  /** 版本 */
  version?: string;
}

/**
 * Webhook 结果接口
 */
export interface WebhookResult {
  /** 是否成功 */
  success: boolean;
  /** HTTP 状态码 */
  statusCode?: number;
  /** 响应数据 */
  responseData?: any;
  /** 响应头 */
  responseHeaders?: Record<string, string>;
  /** 错误信息 */
  error?: string;
  /** 重试次数 */
  retries?: number;
  /** 总耗时 (毫秒) */
  duration?: number;
  /** 请求 ID */
  requestId?: string;
}

/**
 * 签名验证结果接口
 */
export interface SignatureVerification {
  /** 验证是否通过 */
  valid: boolean;
  /** 接收到的签名 */
  receivedSignature?: string;
  /** 计算出的签名 */
  computedSignature?: string;
  /** 使用的算法 */
  algorithm?: SignatureAlgorithm;
  /** 错误信息 */
  error?: string;
}

/**
 * Webhook 日志条目
 */
export interface WebhookLogEntry {
  /** 时间戳 */
  timestamp: number;
  /** 事件类型 */
  eventType: 'send' | 'retry' | 'success' | 'failure' | 'rate_limit';
  /** URL */
  url: string;
  /** 请求 ID */
  requestId: string;
  /** HTTP 状态码 */
  statusCode?: number;
  /** 错误信息 */
  error?: string;
  /** 耗时 (毫秒) */
  duration?: number;
  /** 重试次数 */
  retries?: number;
}

/**
 * 队列任务接口
 */
export interface QueueTask {
  /** 任务 ID */
  id: string;
  /** 载荷 */
  payload: WebhookPayload;
  /** 优先级 (数字越小优先级越高) */
  priority: number;
  /** 创建时间 */
  createdAt: number;
  /** 重试次数 */
  retryCount: number;
}

// ============== 默认配置 ==============

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 30000,
  backoffFactor: 2,
  enableJitter: true,
  jitterRange: 0.2,
  retryStatusCodes: [408, 429, 500, 502, 503, 504],
};

const DEFAULT_RATE_LIMIT_CONFIG: RateLimitConfig = {
  windowMs: 60000, // 1 分钟
  maxRequests: 100,
};

const DEFAULT_TIMEOUT = 10000;
const DEFAULT_SIGNATURE_HEADER = 'X-Webhook-Signature';
const DEFAULT_SIGNATURE_ALGORITHM: SignatureAlgorithm = 'sha256';

// ============== 工具函数 ==============

/**
 * 生成随机 ID
 */
function generateRequestId(): string {
  return crypto.randomUUID();
}

/**
 * 生成 HMAC 签名
 */
export function generateSignature(
  payload: string,
  secret: string,
  algorithm: SignatureAlgorithm = 'sha256'
): string {
  const hmac = crypto.createHmac(algorithm, secret);
  hmac.update(payload);
  return hmac.digest('hex');
}

/**
 * 验证 HMAC 签名 (时序安全比较)
 */
export function verifySignature(
  payload: string,
  signature: string,
  secret: string,
  algorithm: SignatureAlgorithm = 'sha256'
): SignatureVerification {
  try {
    const computedSignature = generateSignature(payload, secret, algorithm);
    
    // 时序安全比较，防止定时攻击
    const receivedBuffer = Buffer.from(signature, 'hex');
    const computedBuffer = Buffer.from(computedSignature, 'hex');
    
    if (receivedBuffer.length !== computedBuffer.length) {
      return {
        valid: false,
        receivedSignature: signature,
        computedSignature: computedSignature,
        algorithm,
        error: 'Signature length mismatch',
      };
    }
    
    const valid = crypto.timingSafeEqual(receivedBuffer, computedBuffer);
    
    return {
      valid,
      receivedSignature: signature,
      computedSignature: computedSignature,
      algorithm,
    };
  } catch (error) {
    return {
      valid: false,
      receivedSignature: signature,
      algorithm,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * 从请求中验证签名
 */
export function verifyWebhookSignature(
  body: any,
  signatureHeader: string | undefined,
  secret: string,
  algorithm: SignatureAlgorithm = 'sha256'
): SignatureVerification {
  if (!signatureHeader) {
    return {
      valid: false,
      algorithm,
      error: 'No signature header provided',
    };
  }

  if (!secret) {
    return {
      valid: false,
      algorithm,
      error: 'No secret configured',
    };
  }

  const payload = typeof body === 'string' ? body : JSON.stringify(body);
  return verifySignature(payload, signatureHeader, secret, algorithm);
}

/**
 * 计算重试延迟 (指数退避 + 抖动)
 */
function calculateRetryDelay(
  attempt: number,
  config: RetryConfig
): number {
  const {
    initialDelay = 1000,
    maxDelay = 30000,
    backoffFactor = 2,
    enableJitter = true,
    jitterRange = 0.2,
  } = config;
  
  // 指数退避
  const baseDelay = initialDelay * Math.pow(backoffFactor, attempt);
  
  // 添加抖动 (防止雪崩效应)
  let delay = baseDelay;
  if (enableJitter) {
    const jitter = baseDelay * jitterRange * (Math.random() * 2 - 1);
    delay = baseDelay + jitter;
  }
  
  return Math.min(Math.max(delay, 0), maxDelay);
}

/**
 * 检查是否需要重试
 */
function shouldRetry(
  statusCode: number | undefined,
  config: RetryConfig
): boolean {
  if (statusCode === undefined) return true; // 网络错误
  const { retryStatusCodes = DEFAULT_RETRY_CONFIG.retryStatusCodes! } = config;
  return retryStatusCodes.includes(statusCode);
}

// ============== 速率限制器类 ==============

/**
 * 速率限制器
 */
export class RateLimiter {
  private config: RateLimitConfig;
  private requests: number[] = [];

  constructor(config: RateLimitConfig) {
    this.config = config;
  }

  /**
   * 检查是否允许请求
   */
  check(): { allowed: boolean; retryAfter?: number } {
    const now = Date.now();
    const windowStart = now - this.config.windowMs;
    
    // 清理过期请求
    this.requests = this.requests.filter(time => time > windowStart);
    
    if (this.requests.length >= this.config.maxRequests) {
      // 计算需要等待的时间
      const oldestRequest = this.requests[0];
      const retryAfter = (oldestRequest + this.config.windowMs) - now;
      return {
        allowed: false,
        retryAfter: Math.max(retryAfter, 0),
      };
    }
    
    return { allowed: true };
  }

  /**
   * 记录一次请求
   */
  record(): void {
    this.requests.push(Date.now());
  }

  /**
   * 获取当前请求数
   */
  getRequestCount(): number {
    const now = Date.now();
    const windowStart = now - this.config.windowMs;
    return this.requests.filter(time => time > windowStart).length;
  }

  /**
   * 重置计数器
   */
  reset(): void {
    this.requests = [];
  }
}

// ============== 请求队列类 ==============

/**
 * Webhook 请求队列 (优先级队列)
 */
export class WebhookQueue {
  private tasks: QueueTask[] = [];
  private processing: boolean = false;
  private maxConcurrency: number;
  private activeCount: number = 0;

  constructor(maxConcurrency: number = 5) {
    this.maxConcurrency = maxConcurrency;
  }

  /**
   * 添加任务到队列
   */
  enqueue(
    payload: WebhookPayload,
    priority: number = 5
  ): string {
    const task: QueueTask = {
      id: generateRequestId(),
      payload,
      priority,
      createdAt: Date.now(),
      retryCount: 0,
    };
    
    this.tasks.push(task);
    this.tasks.sort((a, b) => {
      // 优先级高的在前，同优先级按创建时间排序
      if (a.priority !== b.priority) return a.priority - b.priority;
      return a.createdAt - b.createdAt;
    });
    
    this.processQueue();
    return task.id;
  }

  /**
   * 处理队列
   */
  private async processQueue(): Promise<void> {
    if (this.processing || this.tasks.length === 0) return;
    if (this.activeCount >= this.maxConcurrency) return;

    this.processing = true;

    while (this.tasks.length > 0 && this.activeCount < this.maxConcurrency) {
      const task = this.tasks.shift();
      if (!task) break;

      this.activeCount++;
      
      // 异步处理任务
      this.processTask(task).finally(() => {
        this.activeCount--;
        this.processQueue();
      });
    }

    this.processing = false;
  }

  /**
   * 处理单个任务 (由使用者实现)
   */
  private async processTask(task: QueueTask): Promise<void> {
    // 这个方法应该由使用者重写或传入处理函数
    console.log(`Processing task ${task.id} with priority ${task.priority}`);
  }

  /**
   * 设置任务处理器
   */
  setHandler(handler: (task: QueueTask) => Promise<void>): void {
    this.processTask = handler;
  }

  /**
   * 获取队列长度
   */
  get length(): number {
    return this.tasks.length;
  }

  /**
   * 清空队列
   */
  clear(): void {
    this.tasks = [];
  }

  /**
   * 获取队列状态
   */
  getStatus(): {
    pending: number;
    active: number;
    maxConcurrency: number;
  } {
    return {
      pending: this.tasks.length,
      active: this.activeCount,
      maxConcurrency: this.maxConcurrency,
    };
  }
}

// ============== Webhook 发送器类 ==============

/**
 * Webhook 发送器类
 */
export class WebhookSender {
  private config: WebhookConfig;
  private retryConfig: RetryConfig;
  private rateLimiter?: RateLimiter;
  private logs: WebhookLogEntry[] = [];
  private maxLogs: number = 1000;

  constructor(config: WebhookConfig) {
    this.config = config;
    this.retryConfig = { ...DEFAULT_RETRY_CONFIG, ...config.retry };
    
    if (config.rateLimit) {
      this.rateLimiter = new RateLimiter(config.rateLimit);
    }
  }

  /**
   * 发送 Webhook
   */
  async send(payload: WebhookPayload): Promise<WebhookResult> {
    const requestId = generateRequestId();
    const startTime = Date.now();
    let lastError: Error | undefined;
    let retries = 0;

    // 检查速率限制
    if (this.rateLimiter) {
      const rateCheck = this.rateLimiter.check();
      if (!rateCheck.allowed) {
        const result: WebhookResult = {
          success: false,
          error: `Rate limit exceeded. Retry after ${rateCheck.retryAfter}ms`,
          requestId,
          duration: Date.now() - startTime,
        };
        this.log({
          eventType: 'rate_limit',
          url: this.config.url,
          requestId,
          error: result.error,
          duration: result.duration,
        });
        return result;
      }
      this.rateLimiter.record();
    }

    // 准备请求体
    const body = JSON.stringify(payload);
    
    // 准备请求头
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'AxonClaw-Webhook/1.0',
      'X-Request-ID': requestId,
      ...this.config.headers,
    };

    // 添加签名
    if (this.config.secret) {
      const algorithm = this.config.signatureAlgorithm || DEFAULT_SIGNATURE_ALGORITHM;
      const signature = generateSignature(body, this.config.secret, algorithm);
      const signatureHeader = this.config.signatureHeader || DEFAULT_SIGNATURE_HEADER;
      headers[signatureHeader] = signature;
    }

    // 重试循环
    for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        // 如果不是第一次尝试，等待延迟
        if (attempt > 0) {
          const delay = calculateRetryDelay(attempt - 1, this.retryConfig);
          await this.sleep(delay);
          retries = attempt;
          
          this.log({
            eventType: 'retry',
            url: this.config.url,
            requestId,
            retries: attempt,
          });
        }

        const response = await this.makeRequest(
          this.config.url,
          this.config.method || 'POST',
          headers,
          body
        );

        const duration = Date.now() - startTime;

        // 记录发送事件
        this.log({
          eventType: 'send',
          url: this.config.url,
          requestId,
          statusCode: response.status,
          duration,
          retries: attempt,
        });

        // 检查响应状态
        if (response.ok) {
          const responseData = await this.parseResponse(response);
          const responseHeaders: Record<string, string> = {};
          response.headers.forEach((value, key) => {
            responseHeaders[key] = value;
          });

          const result: WebhookResult = {
            success: true,
            statusCode: response.status,
            responseData,
            responseHeaders,
            retries: attempt,
            duration,
            requestId,
          };
          
          this.log({
            eventType: 'success',
            url: this.config.url,
            requestId,
            statusCode: response.status,
            duration,
            retries: attempt,
          });
          
          return result;
        }

        // 检查是否需要重试
        if (shouldRetry(response.status, this.retryConfig)) {
          lastError = new Error(`HTTP ${response.status}: ${response.statusText}`);
          continue;
        }

        // 不需要重试的错误
        const result: WebhookResult = {
          success: false,
          statusCode: response.status,
          error: `HTTP ${response.status}: ${response.statusText}`,
          retries: attempt,
          duration: Date.now() - startTime,
          requestId,
        };
        
        this.log({
          eventType: 'failure',
          url: this.config.url,
          requestId,
          statusCode: response.status,
          error: result.error,
          duration: result.duration,
          retries: attempt,
        });
        
        return result;

      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        retries = attempt;

        // 如果是最后一次尝试，直接返回失败
        if (attempt === this.retryConfig.maxRetries) {
          const duration = Date.now() - startTime;
          const result: WebhookResult = {
            success: false,
            error: lastError.message,
            retries: attempt,
            duration,
            requestId,
          };
          
          this.log({
            eventType: 'failure',
            url: this.config.url,
            requestId,
            error: result.error,
            duration,
            retries: attempt,
          });
          
          return result;
        }
      }
    }

    // 所有重试都失败
    const duration = Date.now() - startTime;
    const result: WebhookResult = {
      success: false,
      error: lastError?.message || 'All retries exhausted',
      retries,
      duration,
      requestId,
    };
    
    this.log({
      eventType: 'failure',
      url: this.config.url,
      requestId,
      error: result.error,
      duration,
      retries,
    });
    
    return result;
  }

  /**
   * 发起 HTTP 请求
   */
  private async makeRequest(
    url: string,
    method: string,
    headers: Record<string, string>,
    body: string
  ): Promise<Response> {
    const controller = new AbortController();
    const timeout = this.config.timeout || DEFAULT_TIMEOUT;
    
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS' ? body : undefined,
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * 解析响应
   */
  private async parseResponse(response: Response): Promise<any> {
    const contentType = response.headers.get('content-type');
    
    if (contentType?.includes('application/json')) {
      try {
        return await response.json();
      } catch {
        return response.text();
      }
    }
    
    return response.text();
  }

  /**
   * 延迟等待
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 记录日志
   */
  private log(entry: Omit<WebhookLogEntry, 'timestamp'>): void {
    if (!this.config.enableLogging) return;
    
    const logEntry: WebhookLogEntry = {
      timestamp: Date.now(),
      ...entry,
    };
    
    this.logs.push(logEntry);
    
    // 限制日志数量
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }
  }

  /**
   * 获取日志
   */
  getLogs(limit: number = 100): WebhookLogEntry[] {
    return this.logs.slice(-limit);
  }

  /**
   * 清空日志
   */
  clearLogs(): void {
    this.logs = [];
  }

  /**
   * 获取速率限制器状态
   */
  getRateLimitStatus(): { current: number; max: number; windowMs: number } | null {
    if (!this.rateLimiter) return null;
    
    return {
      current: this.rateLimiter.getRequestCount(),
      max: this.rateLimiter['config'].maxRequests,
      windowMs: this.rateLimiter['config'].windowMs,
    };
  }
}

// ============== 便捷函数 ==============

/**
 * 快速发送 Webhook (一次性使用)
 */
export async function sendWebhook(
  url: string,
  payload: WebhookPayload,
  options?: Partial<WebhookConfig>
): Promise<WebhookResult> {
  const config: WebhookConfig = {
    url,
    ...options,
  };
  
  const sender = new WebhookSender(config);
  return sender.send(payload);
}

/**
 * 批量发送 Webhook
 */
export async function sendWebhooks(
  configs: Array<{ url: string; payload: WebhookPayload; options?: Partial<WebhookConfig> }>,
  concurrency: number = 5
): Promise<WebhookResult[]> {
  const results: WebhookResult[] = [];
  const activePromises: Promise<void>[] = [];
  
  for (const config of configs) {
    const promise = (async () => {
      const result = await sendWebhook(config.url, config.payload, config.options);
      results.push(result);
    })();
    
    activePromises.push(promise);
    
    if (activePromises.length >= concurrency) {
      await Promise.race(activePromises.map(p => p.then(() => undefined)));
      const completedIndex = activePromises.findIndex(p => 
        (p as any).status === 'fulfilled' || (p as any).status === 'rejected'
      );
      if (completedIndex !== -1) {
        activePromises.splice(completedIndex, 1);
      }
    }
  }
  
  await Promise.all(activePromises);
  return results;
}

/**
 * 创建标准 Webhook 载荷
 */
export function createWebhookPayload(
  event: string,
  data: any,
  options?: {
    id?: string;
    source?: string;
    version?: string;
  }
): WebhookPayload {
  return {
    event,
    timestamp: Date.now(),
    data,
    id: options?.id || crypto.randomUUID(),
    source: options?.source,
    version: options?.version || '1.0',
  };
}

/**
 * 测试 Webhook 端点
 */
export async function testWebhookEndpoint(
  url: string,
  options?: {
    method?: HttpMethod;
    timeout?: number;
  }
): Promise<{
  reachable: boolean;
  statusCode?: number;
  responseTime?: number;
  error?: string;
}> {
  const startTime = Date.now();
  
  try {
    const controller = new AbortController();
    const timeout = options?.timeout || 5000;
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    const response = await fetch(url, {
      method: options?.method || 'GET',
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    return {
      reachable: response.ok,
      statusCode: response.status,
      responseTime: Date.now() - startTime,
    };
  } catch (error) {
    return {
      reachable: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ============== 导出 ==============

export default {
  WebhookSender,
  WebhookQueue,
  RateLimiter,
  sendWebhook,
  sendWebhooks,
  createWebhookPayload,
  verifySignature,
  verifyWebhookSignature,
  generateSignature,
  testWebhookEndpoint,
};
