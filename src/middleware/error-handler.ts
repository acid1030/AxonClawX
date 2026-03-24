/**
 * AxonClaw 统一错误处理中间件
 * 
 * 功能:
 * 1. 全局错误捕获 - 捕获同步/异步错误
 * 2. 错误日志记录 - 自动记录到日志系统
 * 3. 友好错误响应 - 统一的错误响应格式
 * 
 * @author Axon
 * @version 1.0.0
 */

import { Logger, getLogger } from '../logger/logger';

// ============ 错误类型定义 ============

/**
 * 错误严重程度
 */
export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

/**
 * 标准错误响应格式
 */
export interface ErrorResponse {
  /** 错误代码 */
  code: string;
  /** 错误消息 (对用户友好) */
  message: string;
  /** 错误详情 (开发环境显示) */
  details?: any;
  /** 错误严重程度 */
  severity: ErrorSeverity;
  /** 错误发生时间 */
  timestamp: string;
  /** 请求 ID (用于追踪) */
  requestId?: string;
  /** 建议的操作 */
  suggestion?: string;
}

/**
 * 应用级错误类 - 所有业务错误应继承此类
 */
export class AppError extends Error {
  /** 错误代码 */
  public readonly code: string;
  /** HTTP 状态码 */
  public readonly statusCode: number;
  /** 错误严重程度 */
  public readonly severity: ErrorSeverity;
  /** 是否公开错误详情 */
  public readonly isOperational: boolean;
  /** 额外数据 */
  public readonly data?: any;

  constructor(
    message: string,
    code: string = 'INTERNAL_ERROR',
    statusCode: number = 500,
    severity: ErrorSeverity = 'medium',
    isOperational: boolean = true,
    data?: any
  ) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.severity = severity;
    this.isOperational = isOperational;
    this.data = data;
    
    // 保持正确的原型链
    Object.setPrototypeOf(this, AppError.prototype);
    
    // 捕获堆栈跟踪
    Error.captureStackTrace(this, this.constructor);
  }
}

// ============ 预定义错误类型 ============

/**
 * 400 - 请求错误
 */
export class BadRequestError extends AppError {
  constructor(
    message: string = '请求参数错误',
    code: string = 'BAD_REQUEST',
    data?: any
  ) {
    super(message, code, 400, 'low', true, data);
  }
}

/**
 * 401 - 未授权
 */
export class UnauthorizedError extends AppError {
  constructor(
    message: string = '未授权访问',
    code: string = 'UNAUTHORIZED',
    data?: any
  ) {
    super(message, code, 401, 'medium', true, data);
  }
}

/**
 * 403 - 禁止访问
 */
export class ForbiddenError extends AppError {
  constructor(
    message: string = '禁止访问',
    code: string = 'FORBIDDEN',
    data?: any
  ) {
    super(message, code, 403, 'medium', true, data);
  }
}

/**
 * 404 - 资源不存在
 */
export class NotFoundError extends AppError {
  constructor(
    message: string = '资源不存在',
    code: string = 'NOT_FOUND',
    data?: any
  ) {
    super(message, code, 404, 'low', true, data);
  }
}

/**
 * 409 - 冲突
 */
export class ConflictError extends AppError {
  constructor(
    message: string = '资源冲突',
    code: string = 'CONFLICT',
    data?: any
  ) {
    super(message, code, 409, 'medium', true, data);
  }
}

/**
 * 422 - 验证失败
 */
export class ValidationError extends AppError {
  constructor(
    message: string = '数据验证失败',
    code: string = 'VALIDATION_ERROR',
    data?: any
  ) {
    super(message, code, 422, 'low', true, data);
  }
}

/**
 * 429 - 请求过多
 */
export class TooManyRequestsError extends AppError {
  constructor(
    message: string = '请求过于频繁',
    code: string = 'TOO_MANY_REQUESTS',
    data?: any
  ) {
    super(message, code, 429, 'medium', true, data);
  }
}

/**
 * 500 - 内部错误
 */
export class InternalError extends AppError {
  constructor(
    message: string = '服务器内部错误',
    code: string = 'INTERNAL_ERROR',
    data?: any
  ) {
    super(message, code, 500, 'high', false, data);
  }
}

/**
 * 502 - 网关错误
 */
export class GatewayError extends AppError {
  constructor(
    message: string = '网关错误',
    code: string = 'GATEWAY_ERROR',
    data?: any
  ) {
    super(message, code, 502, 'critical', false, data);
  }
}

/**
 * 503 - 服务不可用
 */
export class ServiceUnavailableError extends AppError {
  constructor(
    message: string = '服务暂时不可用',
    code: string = 'SERVICE_UNAVAILABLE',
    data?: any
  ) {
    super(message, code, 503, 'critical', false, data);
  }
}

// ============ 错误映射表 ============

/**
 * 错误代码到用户友好消息的映射
 */
const ERROR_MESSAGE_MAP: Record<string, string> = {
  BAD_REQUEST: '请求参数有误，请检查后重试',
  UNAUTHORIZED: '请先登录后再操作',
  FORBIDDEN: '您没有权限执行此操作',
  NOT_FOUND: '请求的资源不存在',
  CONFLICT: '操作冲突，请刷新后重试',
  VALIDATION_ERROR: '数据格式不正确，请检查输入',
  TOO_MANY_REQUESTS: '操作过于频繁，请稍后再试',
  INTERNAL_ERROR: '服务器开小差了，请稍后重试',
  GATEWAY_ERROR: '服务连接失败，请稍后重试',
  SERVICE_UNAVAILABLE: '服务暂时不可用，请稍后重试',
};

/**
 * 错误代码到建议操作的映射
 */
const ERROR_SUGGESTION_MAP: Record<string, string> = {
  BAD_REQUEST: '检查请求参数是否正确',
  UNAUTHORIZED: '请重新登录或联系管理员',
  FORBIDDEN: '联系管理员申请权限',
  NOT_FOUND: '检查 URL 是否正确或资源是否已被删除',
  CONFLICT: '刷新页面后重新操作',
  VALIDATION_ERROR: '根据错误提示修正数据格式',
  TOO_MANY_REQUESTS: '等待 30 秒后重试',
  INTERNAL_ERROR: '如问题持续，请联系技术支持',
  GATEWAY_ERROR: '检查网络连接或稍后重试',
  SERVICE_UNAVAILABLE: '关注系统公告或联系管理员',
};

// ============ 错误中间件 ============

/**
 * 错误处理中间件配置
 */
export interface ErrorHandlerConfig {
  /** 是否显示详细错误信息 (生产环境应关闭) */
  showDetails: boolean;
  /** 日志记录器 */
  logger?: Logger;
  /** 自定义错误处理器 */
  customHandlers?: Record<string, (error: any, req: any, res: any, next: any) => void>;
  /** 忽略的错误列表 (不记录日志) */
  ignoreErrors?: string[];
  /** 错误报告回调 */
  onReport?: (error: AppError, context: ErrorContext) => void;
}

/**
 * 错误上下文
 */
export interface ErrorContext {
  /** 请求 ID */
  requestId: string;
  /** 请求方法 */
  method: string;
  /** 请求路径 */
  path: string;
  /** 用户 ID (如果有) */
  userId?: string;
  /** IP 地址 */
  ip?: string;
  /** 用户代理 */
  userAgent?: string;
}

/**
 * 创建错误处理中间件
 * 
 * @param config 配置选项
 * @returns Express/Koa 风格的错误处理中间件
 */
export function createErrorHandler(config: Partial<ErrorHandlerConfig> = {}) {
  const logger = config.logger || getLogger();
  const showDetails = config.showDetails ?? process.env.NODE_ENV !== 'production';
  const ignoreErrors = config.ignoreErrors || [];

  return async (
    error: any,
    req: any,
    res: any,
    next: any
  ): Promise<void> => {
    // 生成请求 ID
    const requestId = req.requestId || req.headers['x-request-id'] || generateRequestId();
    
    // 构建错误上下文
    const context: ErrorContext = {
      requestId,
      method: req.method || 'UNKNOWN',
      path: req.path || req.url || 'UNKNOWN',
      userId: req.user?.id || req.headers['x-user-id'],
      ip: req.ip || req.headers['x-forwarded-for'] || req.socket?.remoteAddress,
      userAgent: req.headers['user-agent'],
    };

    // 检查是否应忽略此错误
    if (ignoreErrors.includes(error.code) || ignoreErrors.includes(error.name)) {
      next(error);
      return;
    }

    // 记录错误日志
    logError(logger, error, context);

    // 调用自定义报告回调
    if (config.onReport && error instanceof AppError) {
      try {
        config.onReport(error, context);
      } catch (reportError) {
        logger.error('error-handler', '错误报告回调失败', reportError);
      }
    }

    // 构建错误响应
    const response = buildErrorResponse(error, showDetails, requestId);

    // 发送响应
    res.statusCode = error.statusCode || 500;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('X-Request-ID', requestId);
    res.end(JSON.stringify(response));
  };
}

/**
 * 异步处理器包装器 - 自动捕获 async/await 错误
 * 
 * @param fn 异步处理函数
 * @returns 包装后的函数
 */
export function asyncHandler(fn: Function) {
  return (req: any, res: any, next: any) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * 捕获未处理的 Promise 拒绝
 */
export function setupUnhandledRejectionHandler(config?: Partial<ErrorHandlerConfig>): void {
  const logger = config?.logger || getLogger();

  process.on('unhandledRejection', (reason, promise) => {
    const error = reason instanceof Error ? reason : new Error(String(reason));
    
    logger.error(
      'error-handler',
      '未处理的 Promise 拒绝',
      {
        error: error.message,
        stack: error.stack,
        promise: String(promise),
      }
    );

    // 可选：发送告警
    if (config?.onReport) {
      const appError = error instanceof AppError ? error : new InternalError(error.message);
      config.onReport(appError, {
        requestId: generateRequestId(),
        method: 'UNHANDLED_REJECTION',
        path: 'PROCESS',
      });
    }
  });
}

/**
 * 捕获未处理的异常
 */
export function setupUncaughtExceptionHandler(config?: Partial<ErrorHandlerConfig>): void {
  const logger = config?.logger || getLogger();

  process.on('uncaughtException', (error) => {
    logger.error(
      'error-handler',
      '未捕获的异常',
      {
        error: error.message,
        stack: error.stack,
      }
    );

    // 可选：发送告警
    if (config?.onReport) {
      const appError = error instanceof AppError ? error : new InternalError(error.message);
      config.onReport(appError, {
        requestId: generateRequestId(),
        method: 'UNCAUGHT_EXCEPTION',
        path: 'PROCESS',
      });
    }

    // 优雅退出 (可选)
    // process.exit(1);
  });
}

// ============ 辅助函数 ============

/**
 * 生成请求 ID
 */
function generateRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 记录错误日志
 */
function logError(logger: Logger, error: any, context: ErrorContext): void {
  const logData = {
    code: error.code || 'UNKNOWN',
    message: error.message,
    stack: error.stack,
    context,
    data: error.data,
  };

  // 根据严重程度选择日志级别
  const severity = error.severity || 'medium';
  
  if (severity === 'critical' || severity === 'high') {
    logger.error('error-handler', `严重错误: ${error.message}`, logData);
  } else if (severity === 'medium') {
    logger.warn('error-handler', `中等错误: ${error.message}`, logData);
  } else {
    logger.info('error-handler', `轻微错误: ${error.message}`, logData);
  }
}

/**
 * 构建错误响应
 */
function buildErrorResponse(error: any, showDetails: boolean, requestId: string): ErrorResponse {
  const code = error.code || 'INTERNAL_ERROR';
  const isOperational = error.isOperational !== false;

  // 用户友好的消息
  const message = isOperational
    ? (ERROR_MESSAGE_MAP[code] || error.message || '发生错误')
    : '服务器内部错误，请稍后重试';

  // 构建响应
  const response: ErrorResponse = {
    code,
    message,
    severity: error.severity || 'medium',
    timestamp: new Date().toISOString(),
    requestId,
  };

  // 开发环境或操作错误显示详情
  if (showDetails && isOperational) {
    response.details = {
      originalMessage: error.message,
      stack: error.stack,
      data: error.data,
    };
  }

  // 添加建议操作
  const suggestion = ERROR_SUGGESTION_MAP[code];
  if (suggestion) {
    response.suggestion = suggestion;
  }

  return response;
}

// ============ 便捷函数 ============

/**
 * 快速抛出错误
 */
export function throwError(
  message: string,
  code: string = 'INTERNAL_ERROR',
  statusCode: number = 500
): never {
  throw new AppError(message, code, statusCode);
}

/**
 * 断言函数 - 条件不满足时抛出错误
 */
export function assert(
  condition: boolean,
  message: string,
  code: string = 'BAD_REQUEST',
  statusCode: number = 400
): void {
  if (!condition) {
    throw new AppError(message, code, statusCode);
  }
}

/**
 * 验证函数 - 验证数据并抛出验证错误
 */
export function validate(
  data: any,
  rules: Record<string, (value: any) => boolean>,
  messages?: Record<string, string>
): void {
  for (const [field, rule] of Object.entries(rules)) {
    if (!rule(data?.[field])) {
      throw new ValidationError(
        messages?.[field] || `${field} 验证失败`,
        'VALIDATION_ERROR',
        { field, value: data?.[field] }
      );
    }
  }
}

// ============ 导出 ============

export default createErrorHandler;
