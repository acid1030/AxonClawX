/**
 * HTTP 请求日志中间件 - Request Logger Middleware
 * 
 * @author Axon
 * @version 1.0.0
 * 
 * 功能:
 * 1. 记录请求方法/路径/状态码
 * 2. 记录响应时间
 * 3. 可配置日志级别
 */

import { Request, Response, NextFunction } from 'express';
import { Logger, getLogger, LogLevel } from '../logger/logger';

// ============ 类型定义 ============

export interface RequestLogData {
  method: string;
  path: string;
  statusCode: number;
  responseTime: number;
  ip?: string;
  userAgent?: string;
  contentLength?: number;
}

export interface LoggerMiddlewareConfig {
  logger?: Logger;
  level?: LogLevel;
  skipPaths?: RegExp[];
  includeIp?: boolean;
  includeUserAgent?: boolean;
  includeContentLength?: boolean;
  format?: 'json' | 'simple' | 'detailed';
}

// ============ 默认配置 ============

const DEFAULT_CONFIG: Required<LoggerMiddlewareConfig> = {
  logger: getLogger(),
  level: 'info',
  skipPaths: [],
  includeIp: true,
  includeUserAgent: false,
  includeContentLength: true,
  format: 'simple',
};

// ============ 中间件工厂 ============

/**
 * 创建 HTTP 请求日志中间件
 * 
 * @param config - 配置选项
 * @returns Express 中间件函数
 * 
 * @example
 * ```typescript
 * import { requestLogger } from './middleware/logger';
 * 
 * // 基础用法
 * app.use(requestLogger());
 * 
 * // 自定义配置
 * app.use(requestLogger({
 *   level: 'debug',
 *   format: 'detailed',
 *   skipPaths: [/^\/health/, /^\/metrics/]
 * }));
 * ```
 */
export function requestLogger(config: LoggerMiddlewareConfig = {}) {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  return function loggerMiddleware(req: Request, res: Response, next: NextFunction) {
    const startTime = Date.now();
    const startHrTime = process.hrtime.bigint();

    // 监听响应完成事件
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      const durationHr = Number(process.hrtime.bigint() - startHrTime) / 1e6;

      // 检查是否跳过日志
      if (shouldSkip(req.path, cfg.skipPaths)) {
        return;
      }

      // 构建日志数据
      const logData: RequestLogData = {
        method: req.method,
        path: req.originalUrl || req.url,
        statusCode: res.statusCode,
        responseTime: Math.round(durationHr * 100) / 100, // 保留 2 位小数
      };

      // 可选字段
      if (cfg.includeIp) {
        logData.ip = req.ip || req.socket.remoteAddress || 'unknown';
      }
      if (cfg.includeUserAgent) {
        logData.userAgent = req.get('user-agent');
      }
      if (cfg.includeContentLength) {
        const contentLength = res.get('content-length');
        if (contentLength) {
          logData.contentLength = parseInt(contentLength, 10);
        }
      }

      // 根据状态码选择日志级别
      const level = getLogLevelByStatus(res.statusCode, cfg.level);

      // 记录日志
      logRequest(cfg.logger, level, logData, duration, cfg.format);
    });

    next();
  };
}

// ============ 辅助函数 ============

/**
 * 检查是否应该跳过日志记录
 */
function shouldSkip(path: string, skipPaths: RegExp[]): boolean {
  return skipPaths.some(pattern => pattern.test(path));
}

/**
 * 根据状态码确定日志级别
 */
function getLogLevelByStatus(statusCode: number, baseLevel: LogLevel): LogLevel {
  // 5xx 错误使用 error 级别
  if (statusCode >= 500) {
    return 'error';
  }
  
  // 4xx 错误使用 warn 级别
  if (statusCode >= 400) {
    return 'warn';
  }

  // 其他使用配置的级别
  return baseLevel;
}

/**
 * 格式化并记录日志
 */
function logRequest(
  logger: Logger,
  level: LogLevel,
  data: RequestLogData,
  duration: number,
  format: 'json' | 'simple' | 'detailed'
): void {
  const message = formatMessage(data, duration, format);
  
  switch (level) {
    case 'debug':
      logger.debug('HTTP', message, data);
      break;
    case 'info':
      logger.info('HTTP', message, data);
      break;
    case 'warn':
      logger.warn('HTTP', message, data);
      break;
    case 'error':
      logger.error('HTTP', message, data);
      break;
  }
}

/**
 * 格式化日志消息
 */
function formatMessage(
  data: RequestLogData,
  duration: number,
  format: 'json' | 'simple' | 'detailed'
): string {
  switch (format) {
    case 'simple':
      return `${data.method} ${data.path} ${data.statusCode} ${data.responseTime}ms`;

    case 'detailed':
      const parts = [
        `${data.method} ${data.path}`,
        `${data.statusCode}`,
        `${data.responseTime}ms`,
      ];
      
      if (data.ip) parts.push(`IP: ${data.ip}`);
      if (data.contentLength) parts.push(`Size: ${data.contentLength}B`);
      if (data.userAgent) parts.push(`UA: ${data.userAgent}`);
      
      return parts.join(' | ');

    case 'json':
    default:
      return JSON.stringify(data);
  }
}

// ============ 便捷函数 ============

/**
 * 快速创建常用配置的日志中间件
 */
export const httpLogger = {
  /**
   * 生产环境配置 (简洁格式，只记录 info 及以上)
   */
  production: () => requestLogger({
    level: 'info',
    format: 'simple',
    includeIp: true,
    includeUserAgent: false,
  }),

  /**
   * 开发环境配置 (详细格式，记录 debug 级别)
   */
  development: () => requestLogger({
    level: 'debug',
    format: 'detailed',
    includeIp: true,
    includeUserAgent: true,
    includeContentLength: true,
  }),

  /**
   * JSON 格式 (适合日志收集系统)
   */
  json: () => requestLogger({
    level: 'info',
    format: 'json',
    includeIp: true,
    includeUserAgent: true,
    includeContentLength: true,
  }),

  /**
   * 静默模式 (只记录错误)
   */
  silent: () => requestLogger({
    level: 'error',
    format: 'simple',
  }),
};

// ============ 使用示例 ============

/*
 * ============================================
 * 使用示例 / Usage Examples
 * ============================================
 * 
 * // 1. 基础用法
 * import express from 'express';
 * import { requestLogger } from './middleware/logger';
 * 
 * const app = express();
 * app.use(requestLogger());
 * 
 * 
 * // 2. 自定义配置
 * app.use(requestLogger({
 *   level: 'debug',
 *   format: 'detailed',
 *   skipPaths: [/^\/health/, /^\/metrics/, /^\/favicon.ico/]
 * }));
 * 
 * 
 * // 3. 使用预设配置
 * import { httpLogger } from './middleware/logger';
 * 
 * // 生产环境
 * if (process.env.NODE_ENV === 'production') {
 *   app.use(httpLogger.production());
 * } else {
 *   app.use(httpLogger.development());
 * }
 * 
 * 
 * // 4. JSON 格式输出 (适合 ELK/Splunk)
 * app.use(httpLogger.json());
 * 
 * 
 * // 5. 只记录错误
 * app.use(httpLogger.silent());
 * 
 * 
 * // 6. 自定义 Logger 实例
 * import { Logger } from './logger/logger';
 * 
 * const customLogger = new Logger({
 *   logDir: './custom-logs',
 *   defaultLevel: 'debug'
 * });
 * 
 * app.use(requestLogger({
 *   logger: customLogger,
 *   level: 'debug'
 * }));
 * 
 * 
 * // 7. 完整示例
 * import express from 'express';
 * import { requestLogger, httpLogger } from './middleware/logger';
 * 
 * const app = express();
 * 
 * // 在路由之前使用中间件
 * app.use(httpLogger.development());
 * 
 * app.get('/health', (req, res) => {
 *   res.json({ status: 'ok' });
 * });
 * 
 * app.get('/api/users', (req, res) => {
 *   res.json({ users: [] });
 * });
 * 
 * app.listen(3000, () => {
 *   console.log('Server running on port 3000');
 * });
 * 
 * 
 * 输出示例:
 * [2026-03-13 16:23:00] [INFO] [HTTP] GET /api/users 200 12.45ms | IP: 127.0.0.1 | Size: 256B
 * [2026-03-13 16:23:01] [WARN] [HTTP] POST /api/login 401 5.23ms | IP: 192.168.1.100
 * [2026-03-13 16:23:02] [ERROR] [HTTP] GET /api/crash 500 102.34ms | IP: 127.0.0.1
 */

export default requestLogger;
