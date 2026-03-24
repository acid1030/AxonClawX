/**
 * Request ID Middleware - 请求追踪中间件
 * 
 * @author Axon
 * @version 1.0.0
 * 
 * 功能:
 * 1. 为每个请求生成唯一 Request ID
 * 2. 添加到响应头 (X-Request-ID)
 * 3. 日志关联 (通过 context 传递)
 */

import { Request, Response, NextFunction } from 'express';
import { Logger, getLogger } from '../logger/logger';

// ============ 常量定义 ============

/** Request ID 请求头名称 */
export const REQUEST_ID_HEADER = 'x-request-id';

/** Request ID 长度 (字符数) */
export const REQUEST_ID_LENGTH = 32;

// ============ 类型定义 ============

/**
 * 扩展 Express Request 类型，支持 Request ID
 */
export interface RequestWithId extends Request {
  requestId?: string;
}

/**
 * Request ID 中间件配置
 */
export interface RequestIdConfig {
  /** 自定义 Logger 实例 */
  logger?: Logger;
  /** 是否在响应头中返回 Request ID */
  includeInResponse?: boolean;
  /** 是否将 Request ID 附加到日志上下文 */
  attachToLogs?: boolean;
  /** Request ID 生成器函数 */
  generator?: () => string;
}

// ============ 默认配置 ============

const DEFAULT_CONFIG: Required<RequestIdConfig> = {
  logger: getLogger(),
  includeInResponse: true,
  attachToLogs: true,
  generator: generateRequestId,
};

// ============ Request ID 生成器 ============

/**
 * 生成唯一 Request ID
 * 
 * 格式：时间戳 (13 位) + 随机字符串 (19 位)
 * 示例：1710345678901a3f8b2c9d4e5f6g7h8i9j0k
 * 
 * @returns 唯一 Request ID
 */
export function generateRequestId(): string {
  const timestamp = Date.now().toString(36); // 转换为 36 进制，缩短长度
  const random = Math.random().toString(36).substring(2, 15);
  const random2 = Math.random().toString(36).substring(2, 15);
  
  return `${timestamp}${random}${random2}`.toUpperCase();
}

/**
 * 生成带前缀的 Request ID (可用于区分服务)
 * 
 * @param prefix 前缀标识
 * @returns 带前缀的 Request ID
 * 
 * @example
 * generateRequestIdWithPrefix('AXON') // "AXON-1710345678901A3F8B2C9D4E5F6G"
 */
export function generateRequestIdWithPrefix(prefix: string): string {
  const id = generateRequestId().substring(0, 20);
  return `${prefix}-${id}`;
}

// ============ 中间件工厂 ============

/**
 * 创建 Request ID 中间件
 * 
 * @param config - 配置选项
 * @returns Express 中间件函数
 * 
 * @example
 * ```typescript
 * import { requestId } from './middleware/request-id';
 * 
 * // 基础用法
 * app.use(requestId());
 * 
 * // 自定义配置
 * app.use(requestId({
 *   includeInResponse: true,
 *   attachToLogs: true,
 *   generator: () => `req-${Date.now()}`
 * }));
 * ```
 */
export function requestId(config: RequestIdConfig = {}) {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  return function requestIdMiddleware(req: RequestWithId, res: Response, next: NextFunction) {
    // 1. 从请求头获取 Request ID (如果客户端已提供)
    let requestId = req.headers[REQUEST_ID_HEADER] as string | undefined;
    
    // 2. 如果没有，生成新的 Request ID
    if (!requestId) {
      requestId = cfg.generator();
    }

    // 3. 附加到请求对象
    req.requestId = requestId;

    // 4. 添加到响应头
    if (cfg.includeInResponse) {
      res.setHeader(REQUEST_ID_HEADER, requestId);
    }

    // 5. 记录请求开始日志 (带 Request ID)
    if (cfg.attachToLogs) {
      cfg.logger.info('REQUEST-ID', `Request started`, {
        requestId,
        method: req.method,
        path: req.originalUrl || req.url,
        ip: req.ip || req.socket.remoteAddress,
      });
    }

    // 6. 监听响应完成，记录结束日志
    if (cfg.attachToLogs) {
      res.on('finish', () => {
        const duration = Date.now();
        cfg.logger.info('REQUEST-ID', `Request completed`, {
          requestId,
          method: req.method,
          path: req.originalUrl || req.url,
          statusCode: res.statusCode,
          duration: `${duration}ms`,
        });
      });
    }

    next();
  };
}

// ============ 辅助函数 ============

/**
 * 从请求中获取 Request ID
 * 
 * @param req - Express Request 对象
 * @returns Request ID
 * 
 * @example
 * ```typescript
 * app.get('/api/status', (req, res) => {
 *   const requestId = getRequestId(req);
 *   res.json({ requestId, status: 'ok' });
 * });
 * ```
 */
export function getRequestId(req: RequestWithId): string | undefined {
  return req.requestId || req.headers[REQUEST_ID_HEADER] as string;
}

/**
 * 为日志添加 Request ID 上下文
 * 
 * @param logger - Logger 实例
 * @param requestId - Request ID
 * @returns 包装后的 Logger，自动附加 Request ID
 * 
 * @example
 * ```typescript
 * app.use((req, res, next) => {
 *   const loggerWithContext = withRequestId(getLogger(), req.requestId!);
 *   loggerWithContext.info('MY_MODULE', 'Processing request');
 *   next();
 * });
 * ```
 */
export function withRequestId(logger: Logger, requestId: string): Logger {
  return {
    debug: (module: string, message: string, data?: any) => 
      logger.debug(module, message, { ...data, requestId }),
    info: (module: string, message: string, data?: any) => 
      logger.info(module, message, { ...data, requestId }),
    warn: (module: string, message: string, data?: any) => 
      logger.warn(module, message, { ...data, requestId }),
    error: (module: string, message: string, data?: any) => 
      logger.error(module, message, { ...data, requestId }),
  };
}

// ============ 预设配置 ============

/**
 * 预定义的 Request ID 中间件配置
 */
export const presets = {
  /**
   * 生产环境配置
   * - 包含在响应头
   * - 附加到日志
   * - 使用默认生成器
   */
  production: () => requestId({
    includeInResponse: true,
    attachToLogs: true,
  }),

  /**
   * 开发环境配置 (详细日志)
   */
  development: () => requestId({
    includeInResponse: true,
    attachToLogs: true,
  }),

  /**
   * 静默模式 (不记录日志，只生成 ID)
   */
  silent: () => requestId({
    includeInResponse: true,
    attachToLogs: false,
  }),

  /**
   * 自定义前缀 (用于多服务追踪)
   */
  withPrefix: (prefix: string) => requestId({
    includeInResponse: true,
    attachToLogs: true,
    generator: () => generateRequestIdWithPrefix(prefix),
  }),
};

// ============ 导出默认 ============

export default requestId;

// ============ 使用示例 ============

/*
 * ============================================
 * 使用示例 / Usage Examples
 * ============================================
 * 
 * // 1. 基础用法
 * import express from 'express';
 * import { requestId } from './middleware/request-id';
 * 
 * const app = express();
 * app.use(requestId());
 * 
 * app.get('/api/users', (req, res) => {
 *   res.json({ 
 *     users: [],
 *     requestId: req.requestId // 访问 Request ID
 *   });
 * });
 * 
 * 
 * // 2. 自定义配置
 * app.use(requestId({
 *   includeInResponse: true,
 *   attachToLogs: true,
 *   generator: () => `req-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
 * }));
 * 
 * 
 * // 3. 使用预设配置
 * import { presets } from './middleware/request-id';
 * 
 * if (process.env.NODE_ENV === 'production') {
 *   app.use(presets.production());
 * } else {
 *   app.use(presets.development());
 * }
 * 
 * 
 * // 4. 多服务追踪 (带前缀)
 * import { presets } from './middleware/request-id';
 * 
 * // API 服务
 * app.use(presets.withPrefix('API'));
 * 
 * // WebSocket 服务
 * app.use(presets.withPrefix('WS'));
 * 
 * 
 * // 5. 日志关联
 * import { getLogger } from './logger/logger';
 * import { withRequestId } from './middleware/request-id';
 * 
 * app.use((req, res, next) => {
 *   // 创建带 Request ID 上下文的 Logger
 *   const logger = withRequestId(getLogger(), req.requestId!);
 *   
 *   // 所有日志自动包含 Request ID
 *   logger.info('AUTH', 'User authentication started');
 *   logger.info('AUTH', 'User authenticated successfully');
 *   
 *   next();
 * });
 * 
 * 
 * // 6. 完整示例
 * import express from 'express';
 * import { requestId, getRequestId, withRequestId } from './middleware/request-id';
 * import { getLogger } from './logger/logger';
 * 
 * const app = express();
 * const logger = getLogger();
 * 
 * // 使用中间件
 * app.use(requestId());
 * 
 * // 在路由中使用
 * app.get('/api/status', (req, res) => {
 *   const requestId = getRequestId(req);
 *   const contextLogger = withRequestId(logger, requestId!);
 *   
 *   contextLogger.info('STATUS', 'Status check requested');
 *   
 *   res.json({ 
 *     status: 'ok',
 *     requestId,
 *     timestamp: new Date().toISOString()
 *   });
 * });
 * 
 * app.post('/api/data', (req, res) => {
 *   const loggerWithContext = withRequestId(logger, req.requestId!);
 *   
 *   loggerWithContext.info('DATA', 'Processing data');
 *   
 *   // 模拟处理
 *   setTimeout(() => {
 *     loggerWithContext.info('DATA', 'Data processed successfully');
 *     res.json({ success: true, requestId: req.requestId });
 *   }, 100);
 * });
 * 
 * app.listen(3000, () => {
 *   console.log('Server running on port 3000');
 * });
 * 
 * 
 * // 7. 日志输出示例
 * // [2026-03-13 16:34:00] [INFO] [REQUEST-ID] Request started {
 * //   "requestId": "1710345678901A3F8B2C9D4E5F6G7H8I",
 * //   "method": "GET",
 * //   "path": "/api/users",
 * //   "ip": "127.0.0.1"
 * // }
 * //
 * // [2026-03-13 16:34:00] [INFO] [REQUEST-ID] Request completed {
 * //   "requestId": "1710345678901A3F8B2C9D4E5F6G7H8I",
 * //   "method": "GET",
 * //   "path": "/api/users",
 * //   "statusCode": 200,
 * //   "duration": "15ms"
 * // }
 * 
 * 
 * // 8. 客户端传递 Request ID (分布式追踪)
 * // 服务 A 调用服务 B 时，传递 Request ID
 * 
 * // 服务 A
 * const requestId = generateRequestId();
 * await fetch('http://service-b/api/data', {
 *   headers: {
 *     'X-Request-ID': requestId
 *   }
 * });
 * 
 * // 服务 B (自动使用客户端提供的 Request ID)
 * app.use(requestId()); // 会优先使用请求头中的 X-Request-ID
 */
