/**
 * Webhook 技能 - Webhook Skill
 * 
 * 功能:
 * 1. Webhook 发送
 * 2. 重试机制 (指数退避)
 * 3. 签名验证 (HMAC-SHA256)
 * 
 * @author Axon
 * @version 1.0.0
 */

import * as crypto from 'crypto';

// ============== 类型定义 ==============

export interface WebhookConfig {
  /** Webhook URL */
  url: string;
  /** HTTP 方法 */
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  /** 请求头 */
  headers?: Record<string, string>;
  /** 签名密钥 (用于生成 HMAC 签名) */
  secret?: string;
  /** 签名头名称 */
  signatureHeader?: string;
  /** 超时时间 (毫秒) */
  timeout?: number;
  /** 重试配置 */
  retry?: RetryConfig;
}

export interface RetryConfig {
  /** 最大重试次数 */
  maxRetries: number;
  /** 初始延迟 (毫秒) */
  initialDelay?: number;
  /** 最大延迟 (毫秒) */
  maxDelay?: number;
  /** 退避因子 (用于指数退避) */
  backoffFactor?: number;
  /** 重试的 HTTP 状态码 */
  retryStatusCodes?: number[];
}

export interface WebhookPayload {
  /** 事件类型 */
  event: string;
  /** 时间戳 */
  timestamp: number;
  /** 数据内容 */
  data: any;
  /** 唯一 ID */
  id?: string;
}

export interface WebhookResult {
  /** 是否成功 */
  success: boolean;
  /** HTTP 状态码 */
  statusCode?: number;
  /** 响应数据 */
  responseData?: any;
  /** 错误信息 */
  error?: string;
  /** 重试次数 */
  retries?: number;
  /** 总耗时 (毫秒) */
  duration?: number;
}

export interface SignatureVerification {
  /** 验证是否通过 */
  valid: boolean;
  /** 接收到的签名 */
  receivedSignature?: string;
  /** 计算出的签名 */
  computedSignature?: string;
  /** 错误信息 */
  error?: string;
}

// ============== 默认配置 ==============

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 30000,
  backoffFactor: 2,
  retryStatusCodes: [408, 429, 500, 502, 503, 504],
};

const DEFAULT_TIMEOUT = 10000;
const DEFAULT_SIGNATURE_HEADER = 'X-Webhook-Signature';

// ============== 工具函数 ==============

/**
 * 生成 HMAC-SHA256 签名
 */
export function generateSignature(payload: string, secret: string): string {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payload);
  return hmac.digest('hex');
}

/**
 * 验证 HMAC 签名
 */
export function verifySignature(
  payload: string,
  signature: string,
  secret: string
): SignatureVerification {
  try {
    const computedSignature = generateSignature(payload, secret);
    const valid = crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(computedSignature, 'hex')
    );
    
    return {
      valid,
      receivedSignature: signature,
      computedSignature: computedSignature,
    };
  } catch (error) {
    return {
      valid: false,
      receivedSignature: signature,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * 从请求中提取并验证签名
 */
export function verifyWebhookSignature(
  body: any,
  signatureHeader: string | undefined,
  secret: string
): SignatureVerification {
  if (!signatureHeader) {
    return {
      valid: false,
      error: 'No signature header provided',
    };
  }

  if (!secret) {
    return {
      valid: false,
      error: 'No secret configured',
    };
  }

  const payload = typeof body === 'string' ? body : JSON.stringify(body);
  return verifySignature(payload, signatureHeader, secret);
}

/**
 * 计算重试延迟 (指数退避)
 */
function calculateRetryDelay(
  attempt: number,
  config: RetryConfig
): number {
  const { initialDelay = 1000, maxDelay = 30000, backoffFactor = 2 } = config;
  const delay = initialDelay * Math.pow(backoffFactor, attempt);
  return Math.min(delay, maxDelay);
}

/**
 * 检查是否需要重试
 */
function shouldRetry(statusCode: number | undefined, config: RetryConfig): boolean {
  if (statusCode === undefined) return true; // 网络错误等
  const { retryStatusCodes = DEFAULT_RETRY_CONFIG.retryStatusCodes! } = config;
  return retryStatusCodes.includes(statusCode);
}

// ============== Webhook 发送器类 ==============

/**
 * Webhook 发送器类
 */
export class WebhookSender {
  private config: WebhookConfig;
  private retryConfig: RetryConfig;

  constructor(config: WebhookConfig) {
    this.config = config;
    this.retryConfig = { ...DEFAULT_RETRY_CONFIG, ...config.retry };
  }

  /**
   * 发送 Webhook
   */
  async send(payload: WebhookPayload): Promise<WebhookResult> {
    const startTime = Date.now();
    let lastError: Error | undefined;
    let retries = 0;

    // 准备请求体
    const body = JSON.stringify(payload);
    
    // 准备请求头
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'AxonClaw-Webhook/1.0',
      ...this.config.headers,
    };

    // 添加签名
    if (this.config.secret) {
      const signature = generateSignature(body, this.config.secret);
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
        }

        const response = await this.makeRequest(
          this.config.url,
          this.config.method || 'POST',
          headers,
          body
        );

        const duration = Date.now() - startTime;

        // 检查响应状态
        if (response.ok) {
          const responseData = await this.parseResponse(response);
          return {
            success: true,
            statusCode: response.status,
            responseData,
            retries: attempt,
            duration,
          };
        }

        // 检查是否需要重试
        if (shouldRetry(response.status, this.retryConfig)) {
          lastError = new Error(`HTTP ${response.status}: ${response.statusText}`);
          retries = attempt;
          continue;
        }

        // 不需要重试的错误
        return {
          success: false,
          statusCode: response.status,
          error: `HTTP ${response.status}: ${response.statusText}`,
          retries: attempt,
          duration: Date.now() - startTime,
        };

      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        retries = attempt;

        // 如果是最后一次尝试，直接返回失败
        if (attempt === this.retryConfig.maxRetries) {
          return {
            success: false,
            error: lastError.message,
            retries: attempt,
            duration: Date.now() - startTime,
          };
        }
      }
    }

    // 所有重试都失败
    const duration = Date.now() - startTime;
    return {
      success: false,
      error: lastError?.message || 'All retries exhausted',
      retries,
      duration,
    };
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
        body: method !== 'GET' ? body : undefined,
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
      return response.json();
    }
    
    return response.text();
  }

  /**
   * 延迟等待
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
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
 * 创建带签名的 Webhook 载荷
 */
export function createWebhookPayload(
  event: string,
  data: any,
  id?: string
): WebhookPayload {
  return {
    event,
    timestamp: Date.now(),
    data,
    id: id || crypto.randomUUID(),
  };
}

// ============== 导出 ==============

export default {
  WebhookSender,
  sendWebhook,
  createWebhookPayload,
  verifySignature,
  verifyWebhookSignature,
  generateSignature,
};
