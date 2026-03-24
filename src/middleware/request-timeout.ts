/**
 * AxonClaw 请求超时控制中间件 - Request Timeout Middleware
 * 
 * 功能:
 * 1. 可配置超时时间 - 支持全局/路由级超时配置
 * 2. 超时自动终止 - 超时后自动中断请求处理
 * 3. 友好错误响应 - 返回标准化的超时错误信息
 * 
 * @author Axon
 * @version 1.0.0
 */

import { Request, Response, NextFunction } from 'express';
import { AppError } from './error-handler';

// ============ 类型定义 ============

/**
 * 超时错误响应
 */
export interface TimeoutErrorResponse {
  /** 错误代码 */
  code: string;
  /** 错误消息 */
  message: string;
  /** 超时时间 (ms) */
  timeout: number;
  /** 错误发生时间 */
  timestamp: string;
  /** 请求路径 */
  path: string;
  /** 请求方法 */
  method: string;
}

/**
 * 超时中间件配置
 */
export interface TimeoutMiddlewareConfig {
  /** 默认超时时间 (毫秒)，默认 30000ms (30 秒) */
  timeout?: number;
  /** 是否跳过某些路径 */
  skipPaths?: RegExp[];
  /** 自定义错误消息 */
  customMessage?: string;
  /** 是否在超时后继续处理 (默认 false) */
  continueOnTimeout?: boolean;
  /** 是否记录超时日志 */
  logTimeout?: boolean;
}

// ============ 默认配置 ============

const DEFAULT_CONFIG: Required<TimeoutMiddlewareConfig> = {
  timeout: 30000, // 30 秒
  skipPaths: [],
  customMessage: '请求超时，请稍后重试',
  continueOnTimeout: false,
  logTimeout: true,
};

// ============ 超时错误类 ============

/**
 * 请求超时错误
 */
export class TimeoutError extends AppError {
  constructor(
    message: string = 'Request Timeout',
    timeout: number = 30000,
    path?: string,
    method?: string
  ) {
    super(
      message,
      'REQUEST_TIMEOUT',
      408, // HTTP 408 Request Timeout
      'medium',
      true,
      { timeout, path, method }
    );
    
    Object.setPrototypeOf(this, TimeoutError.prototype);
  }
}

// ============ 中间件工厂 ============

/**
 * 创建请求超时控制中间件
 * 
 * @param config - 配置选项
 * @returns Express 中间件函数
 * 
 * @example
 * ```typescript
 * import { requestTimeout } from './middleware/request-timeout';
 * 
 * // 基础用法 - 30 秒超时
 * app.use(requestTimeout());
 * 
 * // 自定义超时时间
 * app.use(requestTimeout({ timeout: 60000 })); // 60 秒
 * 
 * // 跳过健康检查接口
 * app.use(requestTimeout({
 *   timeout: 10000,
 *   skipPaths: [/^\/health/, /^\/ping/]
 * }));
 * 
 * // 路由级超时配置
 * app.get('/slow-operation', requestTimeout({ timeout: 120000 }), handler);
 * ```
 */
export function requestTimeout(config: TimeoutMiddlewareConfig = {}) {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  return function timeoutMiddleware(req: Request, res: Response, next: NextFunction) {
    // 检查是否跳过此路径
    if (cfg.skipPaths.some(pattern => pattern.test(req.path))) {
      return next();
    }

    let timeoutId: NodeJS.Timeout | null = null;
    let isTimedOut = false;

    // 创建超时处理器
    timeoutId = setTimeout(() => {
      isTimedOut = true;

      // 记录超时日志
      if (cfg.logTimeout) {
        console.warn(`[Request Timeout] ${req.method} ${req.path} exceeded ${cfg.timeout}ms`);
      }

      // 如果响应还未发送，发送超时错误
      if (!res.headersSent) {
        const errorResponse: TimeoutErrorResponse = {
          code: 'REQUEST_TIMEOUT',
          message: cfg.customMessage,
          timeout: cfg.timeout,
          timestamp: new Date().toISOString(),
          path: req.path,
          method: req.method,
        };

        res.status(408).json(errorResponse);
      }

      // 如果不允许继续处理，终止请求
      if (!cfg.continueOnTimeout) {
        // 尝试终止响应流
        if (typeof req.socket?.destroy === 'function') {
          req.socket.destroy();
        }
      }
    }, cfg.timeout);

    // 监听响应完成事件，清除超时定时器
    res.on('finish', () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
    });

    res.on('close', () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
    });

    // 添加超时重置方法到 response 对象
    (res as any).resetTimeout = (newTimeout?: number) => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      
      if (newTimeout !== undefined && newTimeout > 0) {
        timeoutId = setTimeout(() => {
          isTimedOut = true;
          
          if (cfg.logTimeout) {
            console.warn(`[Request Timeout] ${req.method} ${req.path} exceeded ${newTimeout}ms`);
          }
          
          if (!res.headersSent) {
            const errorResponse: TimeoutErrorResponse = {
              code: 'REQUEST_TIMEOUT',
              message: cfg.customMessage,
              timeout: newTimeout,
              timestamp: new Date().toISOString(),
              path: req.path,
              method: req.method,
            };
            res.status(408).json(errorResponse);
          }
        }, newTimeout);
      }
    };

    // 添加手动触发超时的方法
    (res as any).triggerTimeout = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      isTimedOut = true;
      
      if (!res.headersSent) {
        const errorResponse: TimeoutErrorResponse = {
          code: 'REQUEST_TIMEOUT',
          message: cfg.customMessage,
          timeout: cfg.timeout,
          timestamp: new Date().toISOString(),
          path: req.path,
          method: req.method,
        };
        res.status(408).json(errorResponse);
      }
    };

    next();
  };
}

// ============ 辅助函数 ============

/**
 * 为特定路由创建超时中间件
 * 
 * @param timeout - 超时时间 (毫秒)
 * @param options - 其他配置
 * @returns Express 中间件
 * 
 * @example
 * ```typescript
 * import { timeoutForRoute } from './middleware/request-timeout';
 * 
 * // 长时操作 - 5 分钟超时
 * app.post('/import', timeoutForRoute(300000), importHandler);
 * 
 * // 快速操作 - 5 秒超时
 * app.get('/search', timeoutForRoute(5000), searchHandler);
 * ```
 */
export function timeoutForRoute(timeout: number, options: Partial<TimeoutMiddlewareConfig> = {}) {
  return requestTimeout({ timeout, ...options });
}

/**
 * 创建无超时限制的中件 (用于需要长时间运行的操作)
 * 
 * @returns Express 中间件
 * 
 * @example
 * ```typescript
 * import { noTimeout } from './middleware/request-timeout';
 * 
 * // 禁用超时 - 用于长时间运行的任务
 * app.post('/batch-process', noTimeout(), batchProcessHandler);
 * ```
 */
export function noTimeout() {
  return requestTimeout({ timeout: 0 }); // 0 表示禁用超时
}

// ============ 导出 ============

export default requestTimeout;
