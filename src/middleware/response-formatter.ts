/**
 * AxonClaw 响应格式化中间件 - Response Formatter Middleware
 * 
 * @author Axon
 * @version 1.0.0
 * 
 * 功能:
 * 1. 统一 JSON 响应结构
 * 2. 成功/错误格式标准化
 * 3. 数据分页封装
 * 
 * @example
 * ```typescript
 * import { responseFormatter, success, error, paginated } from './middleware/response-formatter';
 * 
 * // 全局注册
 * app.use(responseFormatter());
 * 
 * // 成功响应
 * app.get('/users/:id', (req, res) => {
 *   res.json(success({ id: 1, name: 'Axon' }));
 * });
 * 
 * // 带消息的成功响应
 * app.post('/users', (req, res) => {
 *   res.status(201).json(success({ id: 1 }, '用户创建成功'));
 * });
 * 
 * // 错误响应
 * app.get('/users/:id', (req, res) => {
 *   res.status(404).json(error('用户不存在', 'USER_NOT_FOUND'));
 * });
 * 
 * // 分页响应
 * app.get('/users', (req, res) => {
 *   const users = [...]; // 用户列表
 *   const total = 100;
 *   res.json(paginated(users, total, { page: 1, pageSize: 10 }));
 * });
 * ```
 */

import { Request, Response, NextFunction } from 'express';

// ============ 类型定义 ============

/**
 * 统一响应结构
 */
export interface ApiResponse<T = any> {
  /** 是否成功 */
  success: boolean;
  /** 响应数据 */
  data: T;
  /** 消息 (可选) */
  message?: string;
  /** 错误代码 (仅错误时) */
  code?: string;
  /** 时间戳 */
  timestamp: string;
  /** 请求 ID (可选) */
  requestId?: string;
}

/**
 * 成功响应结构
 */
export interface SuccessResponse<T = any> extends ApiResponse<T> {
  success: true;
  data: T;
}

/**
 * 错误响应结构
 */
export interface ErrorResponse extends ApiResponse<null> {
  success: false;
  data: null;
  code: string;
  error?: {
    /** 错误消息 */
    message: string;
    /** 详细错误 (开发环境) */
    details?: any;
    /** 堆栈跟踪 (开发环境) */
    stack?: string;
  };
}

/**
 * 分页元数据
 */
export interface PaginationMeta {
  /** 当前页码 */
  page: number;
  /** 每页数量 */
  pageSize: number;
  /** 总记录数 */
  total: number;
  /** 总页数 */
  totalPages: number;
  /** 是否有下一页 */
  hasNext: boolean;
  /** 是否有上一页 */
  hasPrev: boolean;
}

/**
 * 分页响应结构
 */
export interface PaginatedResponse<T = any> extends ApiResponse<T[]> {
  data: T[];
  pagination: PaginationMeta;
}

/**
 * 分页参数
 */
export interface PaginationParams {
  /** 当前页码 (从 1 开始) */
  page: number;
  /** 每页数量 */
  pageSize: number;
  /** 总记录数 */
  total: number;
}

/**
 * 响应格式化配置
 */
export interface FormatterConfig {
  /** 是否包含请求 ID */
  includeRequestId?: boolean;
  /** 是否在生产环境隐藏详细错误 */
  hideDetailsInProduction?: boolean;
  /** 自定义请求 ID 生成函数 */
  generateRequestId?: () => string;
}

// ============ 默认配置 ============

const DEFAULT_CONFIG: Required<FormatterConfig> = {
  includeRequestId: true,
  hideDetailsInProduction: true,
  generateRequestId: () => `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
};

// ============ 响应构建函数 ============

/**
 * 构建成功响应
 * 
 * @param data - 响应数据
 * @param message - 可选消息
 * @param requestId - 可选请求 ID
 * 
 * @example
 * ```typescript
 * res.json(success({ id: 1, name: 'Axon' }));
 * res.json(success({ id: 1 }, '创建成功'));
 * ```
 */
export function success<T>(data: T, message?: string, requestId?: string): SuccessResponse<T> {
  return {
    success: true,
    data,
    message,
    timestamp: new Date().toISOString(),
    requestId: requestId || generateRequestId(),
  };
}

/**
 * 构建错误响应
 * 
 * @param message - 错误消息
 * @param code - 错误代码
 * @param details - 可选详细信息
 * @param requestId - 可选请求 ID
 * 
 * @example
 * ```typescript
 * res.status(404).json(error('资源不存在', 'RESOURCE_NOT_FOUND'));
 * res.status(500).json(error('服务器错误', 'INTERNAL_ERROR', { stack: err.stack });
 * ```
 */
export function error(
  message: string,
  code: string = 'INTERNAL_ERROR',
  details?: any,
  requestId?: string
): ErrorResponse {
  const isProduction = process.env.NODE_ENV === 'production';
  
  return {
    success: false,
    data: null,
    code,
    message,
    timestamp: new Date().toISOString(),
    requestId: requestId || generateRequestId(),
    error: {
      message,
      ...(isProduction ? {} : { details, stack: details?.stack }),
    },
  };
}

/**
 * 构建分页响应
 * 
 * @param data - 数据数组
 * @param total - 总记录数
 * @param pagination - 分页参数
 * @param message - 可选消息
 * @param requestId - 可选请求 ID
 * 
 * @example
 * ```typescript
 * const users = await getUsers(page, pageSize);
 * const total = await getTotalCount();
 * res.json(paginated(users, total, { page, pageSize, total }));
 * ```
 */
export function paginated<T>(
  data: T[],
  total: number,
  pagination: PaginationParams,
  message?: string,
  requestId?: string
): PaginatedResponse<T> {
  const { page, pageSize } = pagination;
  const totalPages = Math.ceil(total / pageSize);
  
  return {
    success: true,
    data,
    message,
    timestamp: new Date().toISOString(),
    requestId: requestId || generateRequestId(),
    pagination: {
      page,
      pageSize,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  };
}

// ============ 辅助函数 ============

/**
 * 生成请求 ID
 */
function generateRequestId(): string {
  return DEFAULT_CONFIG.generateRequestId();
}

/**
 * 从请求中提取分页参数
 * 
 * @param req - Express 请求对象
 * @param defaultPageSize - 默认每页数量
 * @param maxPageSize - 最大每页数量
 * 
 * @example
 * ```typescript
 * const pagination = extractPagination(req);
 * const users = await getUsers(pagination.page, pagination.pageSize);
 * ```
 */
export function extractPagination(
  req: Request,
  defaultPageSize: number = 10,
  maxPageSize: number = 100
): PaginationParams {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const pageSize = Math.min(
    maxPageSize,
    Math.max(1, parseInt(req.query.pageSize as string) || defaultPageSize)
  );
  
  // 需要从其他地方获取总数，这里只返回页码参数
  // 实际使用时配合 totalCount 一起构建分页响应
  return {
    page,
    pageSize,
    total: 0, // 需要调用方设置
  };
}

// ============ 中间件 ============

/**
 * 响应格式化中间件
 * 
 * 自动标准化所有 JSON 响应，确保统一的响应格式
 * 
 * @param config - 配置选项
 * 
 * @example
 * ```typescript
 * import { responseFormatter } from './middleware/response-formatter';
 * 
 * // 全局注册 (推荐放在路由之前)
 * app.use(responseFormatter());
 * 
 * // 自定义配置
 * app.use(responseFormatter({
 *   includeRequestId: false,
 *   hideDetailsInProduction: true
 * }));
 * ```
 */
export function responseFormatter(config: FormatterConfig = {}) {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  return function formatterMiddleware(req: Request, res: Response, next: NextFunction) {
    // 保存原始的 json 方法
    const originalJson = res.json.bind(res);

    // 重写 json 方法
    res.json = (body: any) => {
      // 如果已经是标准响应格式，直接返回
      if (body && typeof body === 'object' && 'success' in body) {
        return originalJson(body);
      }

      // 如果是错误对象，转换为标准错误格式
      if (body instanceof Error) {
        return originalJson(error(body.message, 'INTERNAL_ERROR', {
          stack: body.stack,
        }));
      }

      // 如果是普通对象，包装为成功响应
      // 注意：这里假设非标准格式的响应都是成功响应
      // 错误情况应该通过 error() 函数或抛出异常来处理
      return originalJson(success(body));
    };

    // 添加便捷方法到 response 对象
    res.success = <T>(data: T, message?: string) => {
      return res.json(success(data, message));
    };

    res.error = (message: string, code?: string, details?: any) => {
      return res.json(error(message, code, details));
    };

    res.paginated = <T>(data: T[], total: number, pagination: PaginationParams, message?: string) => {
      return res.json(paginated(data, total, pagination, message));
    };

    next();
  };
}

// ============ Express Response 扩展 ============

declare global {
  namespace Express {
    interface Response {
      /**
       * 发送成功响应
       */
      success<T>(data: T, message?: string): this;
      
      /**
       * 发送错误响应
       */
      error(message: string, code?: string, details?: any): this;
      
      /**
       * 发送分页响应
       */
      paginated<T>(data: T[], total: number, pagination: PaginationParams, message?: string): this;
    }
  }
}

// ============ 使用示例 ============

/**
 * 完整使用示例
 * 
 * ```typescript
 * import express from 'express';
 * import { responseFormatter, success, error, paginated } from './middleware/response-formatter';
 * 
 * const app = express();
 * 
 * // 1. 注册中间件
 * app.use(responseFormatter());
 * 
 * // 2. 使用便捷方法
 * app.get('/api/users/:id', (req, res) => {
 *   const user = getUserById(req.params.id);
 *   if (!user) {
 *     return res.status(404).error('用户不存在', 'USER_NOT_FOUND');
 *   }
 *   res.success(user, '获取成功');
 * });
 * 
 * // 3. 使用分页
 * app.get('/api/users', (req, res) => {
 *   const page = parseInt(req.query.page as string) || 1;
 *   const pageSize = parseInt(req.query.pageSize as string) || 10;
 *   const users = getUsers(page, pageSize);
 *   const total = getTotalCount();
 *   
 *   res.paginated(users, total, { page, pageSize, total });
 * });
 * 
 * // 4. 直接使用构建函数
 * app.post('/api/users', (req, res) => {
 *   const user = createUser(req.body);
 *   res.status(201).json(success(user, '用户创建成功'));
 * });
 * 
 * // 5. 错误处理中间件配合使用
 * app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
 *   res.status(500).error(err.message, 'INTERNAL_ERROR', { stack: err.stack });
 * });
 * ```
 */
