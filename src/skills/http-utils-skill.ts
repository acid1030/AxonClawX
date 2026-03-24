/**
 * HTTP 工具技能 - HTTP Utils Skill
 * 
 * 功能:
 * 1. HTTP 请求封装
 * 2. 请求拦截
 * 3. 响应处理
 * 
 * @author Axon
 * @version 1.0.0
 */

// ==================== 类型定义 ====================

export interface HttpRequestConfig {
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
  retry?: number;
  retryDelay?: number;
}

export interface HttpResponse<T = any> {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  data: T;
  ok: boolean;
  time: number;
}

export interface RequestInterceptor {
  name: string;
  priority?: number;
  onRequest: (config: HttpRequestConfig) => HttpRequestConfig | Promise<HttpRequestConfig>;
}

export interface ResponseInterceptor {
  name: string;
  priority?: number;
  onResponse: <T>(response: HttpResponse<T>) => HttpResponse<T> | Promise<HttpResponse<T>>;
  onError?: (error: Error) => Error | Promise<Error>;
}

// ==================== 请求拦截器管理器 ====================

class InterceptorManager {
  private requestInterceptors: RequestInterceptor[] = [];
  private responseInterceptors: ResponseInterceptor[] = [];

  addRequestInterceptor(interceptor: RequestInterceptor) {
    this.requestInterceptors.push(interceptor);
    this.requestInterceptors.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
  }

  addResponseInterceptor(interceptor: ResponseInterceptor) {
    this.responseInterceptors.push(interceptor);
    this.responseInterceptors.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
  }

  async applyRequestInterceptors(config: HttpRequestConfig): Promise<HttpRequestConfig> {
    let currentConfig = config;
    for (const interceptor of this.requestInterceptors) {
      currentConfig = await interceptor.onRequest(currentConfig);
    }
    return currentConfig;
  }

  async applyResponseInterceptors<T>(response: HttpResponse<T>): Promise<HttpResponse<T>> {
    let currentResponse = response;
    for (const interceptor of this.responseInterceptors) {
      currentResponse = await interceptor.onResponse(currentResponse);
    }
    return currentResponse;
  }
}

// ==================== HTTP 客户端 ====================

export class HttpClient {
  private baseUrl: string = '';
  private defaultHeaders: Record<string, string> = {};
  private defaultTimeout: number = 30000;
  private interceptorManager = new InterceptorManager();

  constructor(baseUrl?: string, defaultHeaders?: Record<string, string>) {
    if (baseUrl) this.baseUrl = baseUrl;
    if (defaultHeaders) this.defaultHeaders = defaultHeaders;
  }

  /**
   * 添加请求拦截器
   */
  useRequestInterceptor(interceptor: RequestInterceptor) {
    this.interceptorManager.addRequestInterceptor(interceptor);
    return this;
  }

  /**
   * 添加响应拦截器
   */
  useResponseInterceptor(interceptor: ResponseInterceptor) {
    this.interceptorManager.addResponseInterceptor(interceptor);
    return this;
  }

  /**
   * 设置默认超时
   */
  setTimeout(timeout: number) {
    this.defaultTimeout = timeout;
    return this;
  }

  /**
   * 设置默认请求头
   */
  setDefaultHeaders(headers: Record<string, string>) {
    this.defaultHeaders = { ...this.defaultHeaders, ...headers };
    return this;
  }

  /**
   * 设置 Base URL
   */
  setBaseUrl(baseUrl: string) {
    this.baseUrl = baseUrl;
    return this;
  }

  /**
   * 通用请求方法
   */
  async request<T = any>(config: HttpRequestConfig): Promise<HttpResponse<T>> {
    const startTime = Date.now();
    const fullUrl = config.url.startsWith('http') 
      ? config.url 
      : `${this.baseUrl}${config.url}`;

    // 应用请求拦截器
    let finalConfig = await this.interceptorManager.applyRequestInterceptors({
      method: 'GET',
      timeout: this.defaultTimeout,
      retry: 0,
      retryDelay: 1000,
      headers: { ...this.defaultHeaders },
      ...config,
    });

    // 执行请求
    let lastError: Error | null = null;
    for (let attempt = 0; attempt <= (finalConfig.retry ?? 0); attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), finalConfig.timeout ?? this.defaultTimeout);

        const fetchOptions: RequestInit = {
          method: finalConfig.method,
          headers: finalConfig.headers,
          signal: controller.signal,
        };

        if (finalConfig.body && finalConfig.method !== 'GET') {
          fetchOptions.body = typeof finalConfig.body === 'string'
            ? finalConfig.body
            : JSON.stringify(finalConfig.body);
          if (!finalConfig.headers?.['Content-Type']) {
            (fetchOptions.headers as Record<string, string>)['Content-Type'] = 'application/json';
          }
        }

        const response = await fetch(fullUrl, fetchOptions);
        clearTimeout(timeoutId);

        const responseHeaders: Record<string, string> = {};
        response.headers.forEach((value, key) => {
          responseHeaders[key] = value;
        });

        let data: any;
        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          data = await response.json();
        } else if (contentType.includes('text/')) {
          data = await response.text();
        } else {
          data = await response.blob();
        }

        const httpResponse: HttpResponse<T> = {
          status: response.status,
          statusText: response.statusText,
          headers: responseHeaders,
          data: data as T,
          ok: response.ok,
          time: Date.now() - startTime,
        };

        // 应用响应拦截器
        return await this.interceptorManager.applyResponseInterceptors(httpResponse);
      } catch (error) {
        lastError = error as Error;
        if (attempt < (finalConfig.retry ?? 0)) {
          await new Promise(resolve => setTimeout(resolve, finalConfig.retryDelay ?? 1000));
        }
      }
    }

    throw lastError || new Error('Request failed');
  }

  /**
   * GET 请求
   */
  async get<T = any>(url: string, config?: Partial<HttpRequestConfig>): Promise<HttpResponse<T>> {
    return this.request<T>({ ...config, url, method: 'GET' });
  }

  /**
   * POST 请求
   */
  async post<T = any>(url: string, body?: any, config?: Partial<HttpRequestConfig>): Promise<HttpResponse<T>> {
    return this.request<T>({ ...config, url, method: 'POST', body });
  }

  /**
   * PUT 请求
   */
  async put<T = any>(url: string, body?: any, config?: Partial<HttpRequestConfig>): Promise<HttpResponse<T>> {
    return this.request<T>({ ...config, url, method: 'PUT', body });
  }

  /**
   * DELETE 请求
   */
  async delete<T = any>(url: string, config?: Partial<HttpRequestConfig>): Promise<HttpResponse<T>> {
    return this.request<T>({ ...config, url, method: 'DELETE' });
  }

  /**
   * PATCH 请求
   */
  async patch<T = any>(url: string, body?: any, config?: Partial<HttpRequestConfig>): Promise<HttpResponse<T>> {
    return this.request<T>({ ...config, url, method: 'PATCH', body });
  }
}

// ==================== 内置拦截器 ====================

/**
 * 日志拦截器 - 记录所有请求和响应
 */
export function createLoggingInterceptor(): { request: RequestInterceptor, response: ResponseInterceptor } {
  return {
    request: {
      name: 'logger-request',
      priority: 100,
      onRequest: (config) => {
        console.log(`[HTTP] ${config.method} ${config.url}`);
        if (config.body) {
          console.log('[HTTP] Body:', JSON.stringify(config.body, null, 2));
        }
        return config;
      },
    },
    response: {
      name: 'logger-response',
      priority: 100,
      onResponse: (response) => {
        console.log(`[HTTP] ${response.status} ${response.statusText} (${response.time}ms)`);
        return response;
      },
      onError: (error) => {
        console.error('[HTTP] Error:', error.message);
        return error;
      },
    },
  };
}

/**
 * 认证拦截器 - 自动添加 Token
 */
export function createAuthInterceptor(tokenGetter: () => string | Promise<string>): RequestInterceptor {
  return {
    name: 'auth',
    priority: 50,
    onRequest: async (config) => {
      const token = await tokenGetter();
      return {
        ...config,
        headers: {
          ...config.headers,
          'Authorization': `Bearer ${token}`,
        },
      };
    },
  };
}

/**
 * 错误处理拦截器 - 统一处理错误
 */
export function createErrorHandlingInterceptor(
  onError?: (error: Error, response?: HttpResponse) => void
): ResponseInterceptor {
  return {
    name: 'error-handler',
    priority: 0,
    onResponse: (response) => {
      if (!response.ok && onError) {
        onError(new Error(`HTTP ${response.status}: ${response.statusText}`), response);
      }
      return response;
    },
    onError: (error) => {
      if (onError) onError(error);
      return error;
    },
  };
}

/**
 * 缓存拦截器 - 简单内存缓存
 */
export function createCacheInterceptor(ttlMs: number = 5 * 60 * 1000): { request: RequestInterceptor, response: ResponseInterceptor } {
  const cache = new Map<string, { data: any, timestamp: number }>();

  return {
    request: {
      name: 'cache-request',
      priority: 200,
      onRequest: (config) => {
        if (config.method === 'GET') {
          const cached = cache.get(config.url);
          if (cached && Date.now() - cached.timestamp < ttlMs) {
            throw { __cached: true, data: cached.data };
          }
        }
        return config;
      },
    },
    response: {
      name: 'cache-response',
      priority: 200,
      onResponse: (response) => {
        if (response.ok && response.status === 200) {
          cache.set(response.headers['x-request-url'] || '', {
            data: response.data,
            timestamp: Date.now(),
          });
        }
        return response;
      },
    },
  };
}

// ==================== 导出单例 ====================

export const http = new HttpClient();

// ==================== 使用示例 ====================

/*
// 示例 1: 基础使用
import { http } from './http-utils-skill';

const response = await http.get('https://api.example.com/users');
console.log(response.data);

// 示例 2: 带认证的请求
import { http, createAuthInterceptor } from './http-utils-skill';

http.useRequestInterceptor(
  createAuthInterceptor(() => 'your-jwt-token')
);

const response = await http.post('/users', { name: 'Axon' });

// 示例 3: 带日志和错误处理
import { http, createLoggingInterceptor, createErrorHandlingInterceptor } from './http-utils-skill';

const { request: logRequest, response: logResponse } = createLoggingInterceptor();
http.useRequestInterceptor(logRequest);
http.useResponseInterceptor(logResponse);
http.useResponseInterceptor(
  createErrorHandlingInterceptor((error) => {
    console.error('请求失败:', error.message);
  })
);

// 示例 4: 自定义客户端
import { HttpClient } from './http-utils-skill';

const apiClient = new HttpClient('https://api.example.com', {
  'X-API-Key': 'your-api-key',
});

const response = await apiClient.get('/users', {
  timeout: 5000,
  retry: 3,
  retryDelay: 1000,
});

// 示例 5: 完整拦截器链
import { http, createCacheInterceptor } from './http-utils-skill';

const { request: cacheRequest, response: cacheResponse } = createCacheInterceptor(60000);
http.useRequestInterceptor(cacheRequest);
http.useResponseInterceptor(cacheResponse);

// 现在 GET 请求会被缓存 60 秒
*/
