/**
 * HTTP 请求处理器工具技能 - Handler Utils Skill
 * 
 * 功能:
 * 1. 请求解析 (Request Parsing)
 * 2. 响应构建 (Response Building)
 * 3. 错误处理 (Error Handling)
 * 
 * @module skills/handler-utils
 * @author Axon
 * @version 1.0.0
 */

import { IncomingMessage, ServerResponse } from 'http';
import { URL } from 'url';

// ==================== 类型定义 ====================

/**
 * HTTP 请求方法
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';

/**
 * 请求内容类型
 */
export type ContentType = 
  | 'application/json'
  | 'application/x-www-form-urlencoded'
  | 'multipart/form-data'
  | 'text/plain'
  | 'text/html'
  | 'application/xml'
  | 'text/xml'
  | 'application/octet-stream';

/**
 * 请求体解析结果
 */
export interface ParsedBody {
  /** 解析后的数据 */
  data: any;
  /** 内容类型 */
  contentType?: string;
  /** 原始内容 */
  raw?: Buffer;
  /** 解析错误 */
  error?: any;
}

/**
 * 解析后的请求对象
 */
export interface ParsedRequest<T = any> {
  /** HTTP 方法 */
  method: HttpMethod;
  /** 请求路径 */
  path: string;
  /** 查询参数 */
  query: Record<string, string | string[]>;
  /** 请求头 */
  headers: Record<string, string | string[]>;
  /** 请求体 */
  body: T;
  /** 原始请求对象 */
  original: IncomingMessage;
  /** 请求 URL 对象 */
  url: URL;
  /** 客户端 IP 地址 */
  ip?: string;
  /** 时间戳 */
  timestamp: number;
}

/**
 * HTTP 响应状态码
 */
export type StatusCode = 
  | 200  // OK
  | 201  // Created
  | 204  // No Content
  | 301  // Moved Permanently
  | 302  // Found
  | 304  // Not Modified
  | 400  // Bad Request
  | 401  // Unauthorized
  | 403  // Forbidden
  | 404  // Not Found
  | 405  // Method Not Allowed
  | 408  // Request Timeout
  | 409  // Conflict
  | 415  // Unsupported Media Type
  | 422  // Unprocessable Entity
  | 429  // Too Many Requests
  | 500  // Internal Server Error
  | 502  // Bad Gateway
  | 503  // Service Unavailable
  | 504  // Gateway Timeout;

/**
 * 响应头类型
 */
export interface ResponseHeaders {
  [key: string]: string | number | boolean | undefined;
  'Content-Type'?: string;
  'Content-Length'?: number;
  'Cache-Control'?: string;
  'Access-Control-Allow-Origin'?: string;
  'Access-Control-Allow-Methods'?: string;
  'Access-Control-Allow-Headers'?: string;
  'X-Request-Id'?: string;
  'X-Response-Time'?: number;
}

/**
 * 响应选项
 */
export interface ResponseOptions {
  /** 状态码，默认 200 */
  status?: StatusCode;
  /** 响应头 */
  headers?: ResponseHeaders;
  /** 内容类型，默认 'application/json' */
  contentType?: ContentType;
  /** 是否启用 CORS，默认 false */
  cors?: boolean;
  /** CORS 配置 */
  corsOptions?: CorsOptions;
  /** 是否压缩响应，默认 false */
  compress?: boolean;
  /** 缓存控制 */
  cache?: CacheOptions;
}

/**
 * CORS 配置选项
 */
export interface CorsOptions {
  /** 允许的源，默认 '*' */
  origin?: string | string[];
  /** 允许的方法，默认 'GET, POST, PUT, DELETE, PATCH, OPTIONS' */
  methods?: string;
  /** 允许的头，默认 'Content-Type, Authorization' */
  allowedHeaders?: string;
  /** 是否允许凭证，默认 false */
  credentials?: boolean;
  /** 预检请求缓存时间 (秒)，默认 86400 */
  maxAge?: number;
}

/**
 * 缓存控制选项
 */
export interface CacheOptions {
  /** 是否缓存，默认 true */
  enabled?: boolean;
  /** 缓存时间 (秒)，默认 3600 */
  maxAge?: number;
  /** 是否私有缓存，默认 false */
  private?: boolean;
  /** ETag 值 */
  etag?: string;
  /** 最后修改时间 */
  lastModified?: Date;
}

/**
 * 错误响应对象
 */
export interface ErrorResponse {
  /** 错误码 */
  code: string;
  /** 错误消息 */
  message: string;
  /** 错误详情 */
  details?: any;
  /** 堆栈跟踪 (仅开发环境) */
  stack?: string;
  /** 请求 ID */
  requestId?: string;
  /** 时间戳 */
  timestamp: number;
  /** 路径 */
  path: string;
  /** 方法 */
  method: string;
}

/**
 * 成功响应对象
 */
export interface SuccessResponse<T = any> {
  /** 成功标志 */
  success: true;
  /** 返回数据 */
  data: T;
  /** 消息 */
  message?: string;
  /** 请求 ID */
  requestId?: string;
  /** 时间戳 */
  timestamp: number;
  /** 分页信息 (可选) */
  pagination?: PaginationInfo;
}

/**
 * 分页信息
 */
export interface PaginationInfo {
  /** 当前页码 */
  page: number;
  /** 每页数量 */
  pageSize: number;
  /** 总数量 */
  total: number;
  /** 总页数 */
  totalPages: number;
  /** 是否有下一页 */
  hasNext: boolean;
  /** 是否有上一页 */
  hasPrev: boolean;
}

/**
 * API 响应统一类型
 */
export type ApiResponse<T = any> = SuccessResponse<T> | ErrorResponse;

// ==================== 请求解析 ====================

/**
 * 解析 HTTP 请求
 * 
 * @param req - Node.js IncomingMessage 对象
 * @param options - 解析选项
 * @returns 解析后的请求对象
 * 
 * @example
 * const parsed = await parseRequest(req);
 * console.log(parsed.method, parsed.path, parsed.body);
 */
export async function parseRequest<T = any>(
  req: IncomingMessage,
  options: ParseRequestOptions = {}
): Promise<ParsedRequest<T>> {
  const {
    maxBodySize = 10 * 1024 * 1024, // 10MB
    parseBody = true,
    parseQuery = true
  } = options;
  
  const startTime = Date.now();
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  
  // 解析查询参数
  const query = parseQuery ? parseQueryParams(url.searchParams) : {};
  
  // 解析请求头
  const headers = parseHeaders(req.headers);
  
  // 获取客户端 IP
  const ip = getClientIp(req);
  
  // 解析请求体
  let body: T = {} as T;
  if (parseBody && ['POST', 'PUT', 'PATCH'].includes(req.method || '')) {
    body = await parseBodyData(req, headers['content-type'] as string, maxBodySize) as T;
  }
  
  return {
    method: (req.method as HttpMethod) || 'GET',
    path: url.pathname,
    query,
    headers,
    body,
    original: req,
    url,
    ip,
    timestamp: startTime
  };
}

/**
 * 解析请求选项
 */
export interface ParseRequestOptions {
  /** 最大请求体大小 (字节)，默认 10MB */
  maxBodySize?: number;
  /** 是否解析请求体，默认 true */
  parseBody?: boolean;
  /** 是否解析查询参数，默认 true */
  parseQuery?: boolean;
}

/**
 * 解析查询参数
 */
function parseQueryParams(searchParams: URLSearchParams): Record<string, string | string[]> {
  const query: Record<string, string | string[]> = {};
  
  for (const [key, value] of searchParams.entries()) {
    const existing = query[key];
    if (existing) {
      // 已存在则转为数组
      if (Array.isArray(existing)) {
        existing.push(value);
      } else {
        query[key] = [existing, value];
      }
    } else {
      query[key] = value;
    }
  }
  
  return query;
}

/**
 * 解析请求头
 */
function parseHeaders(headers: IncomingMessage['headers']): Record<string, string | string[]> {
  const result: Record<string, string | string[]> = {};
  
  for (const [key, value] of Object.entries(headers)) {
    if (value !== undefined) {
      result[key.toLowerCase()] = Array.isArray(value) ? value : value;
    }
  }
  
  return result;
}

/**
 * 获取客户端 IP 地址
 */
function getClientIp(req: IncomingMessage): string {
  // 检查代理头
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  
  const realIp = req.headers['x-real-ip'];
  if (typeof realIp === 'string') {
    return realIp;
  }
  
  // 回退到 socket IP
  return req.socket?.remoteAddress || '127.0.0.1';
}

/**
 * 解析请求体数据
 */
async function parseBodyData(
  req: IncomingMessage,
  contentType: string | undefined,
  maxBodySize: number
): Promise<any> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let totalSize = 0;
    
    req.on('data', (chunk: Buffer) => {
      totalSize += chunk.length;
      
      // 检查大小限制
      if (totalSize > maxBodySize) {
        req.destroy();
        reject(new Error(`Request body too large (max: ${maxBodySize} bytes)`));
        return;
      }
      
      chunks.push(chunk);
    });
    
    req.on('end', () => {
      const rawData = Buffer.concat(chunks);
      
      // 空内容
      if (rawData.length === 0) {
        resolve({});
        return;
      }
      
      try {
        // 根据内容类型解析
        if (contentType?.includes('application/json')) {
          resolve(JSON.parse(rawData.toString('utf8')));
        } else if (contentType?.includes('application/x-www-form-urlencoded')) {
          const params = new URLSearchParams(rawData.toString('utf8'));
          const data: Record<string, any> = {};
          for (const [key, value] of params.entries()) {
            data[key] = value;
          }
          resolve(data);
        } else if (contentType?.includes('text/')) {
          resolve(rawData.toString('utf8'));
        } else {
          // 其他类型返回原始 Buffer
          resolve({ raw: rawData });
        }
      } catch (error) {
        reject(new Error(`Failed to parse request body: ${(error as Error).message}`));
      }
    });
    
    req.on('error', (error) => {
      reject(error);
    });
  });
}

// ==================== 响应构建 ====================

/**
 * 构建成功响应
 * 
 * @param data - 响应数据
 * @param options - 响应选项
 * @returns 成功响应对象
 * 
 * @example
 * const response = buildSuccessResponse({ users: [...] });
 */
export function buildSuccessResponse<T = any>(
  data: T,
  options: {
    message?: string;
    requestId?: string;
    pagination?: PaginationInfo;
  } = {}
): SuccessResponse<T> {
  return {
    success: true,
    data,
    message: options.message,
    requestId: options.requestId || generateRequestId(),
    timestamp: Date.now(),
    pagination: options.pagination
  };
}

/**
 * 构建错误响应
 * 
 * @param code - 错误码
 * @param message - 错误消息
 * @param options - 额外选项
 * @returns 错误响应对象
 * 
 * @example
 * const error = buildErrorResponse('VALIDATION_ERROR', 'Invalid email format');
 */
export function buildErrorResponse(
  code: string,
  message: string,
  options: {
    details?: any;
    requestId?: string;
    path?: string;
    method?: string;
    includeStack?: boolean;
  } = {}
): ErrorResponse {
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  return {
    code,
    message,
    details: options.details,
    stack: isDevelopment && options.includeStack ? new Error(message).stack : undefined,
    requestId: options.requestId || generateRequestId(),
    timestamp: Date.now(),
    path: options.path || '',
    method: options.method || ''
  };
}

/**
 * 发送 HTTP 响应
 * 
 * @param res - Node.js ServerResponse 对象
 * @param data - 响应数据
 * @param options - 响应选项
 * 
 * @example
 * sendResponse(res, { users: [...] }, { status: 200 });
 */
export function sendResponse<T = any>(
  res: ServerResponse,
  data: T,
  options: ResponseOptions = {}
): void {
  const {
    status = 200,
    headers = {},
    contentType = 'application/json',
    cors = false,
    corsOptions,
    compress = false,
    cache
  } = options;
  
  const startTime = Date.now();
  
  // 设置状态码
  res.statusCode = status;
  
  // 设置内容类型
  res.setHeader('Content-Type', contentType);
  
  // 添加 CORS 头
  if (cors) {
    addCorsHeaders(res, corsOptions);
  }
  
  // 添加缓存控制头
  if (cache) {
    addCacheHeaders(res, cache);
  }
  
  // 添加响应时间头
  const responseTime = Date.now() - startTime;
  res.setHeader('X-Response-Time', `${responseTime}ms`);
  
  // 添加请求 ID 头
  if (!headers['X-Request-Id']) {
    res.setHeader('X-Request-Id', generateRequestId());
  }
  
  // 设置其他头
  for (const [key, value] of Object.entries(headers)) {
    if (value !== undefined) {
      res.setHeader(key, value.toString());
    }
  }
  
  // 序列化数据
  const body = typeof data === 'string' ? data : JSON.stringify(data);
  
  // 设置内容长度
  res.setHeader('Content-Length', Buffer.byteLength(body, 'utf8'));
  
  // 发送响应
  res.end(body);
}

/**
 * 发送 JSON 响应 (便捷方法)
 * 
 * @param res - ServerResponse 对象
 * @param data - 响应数据
 * @param status - 状态码
 * 
 * @example
 * sendJson(res, { success: true });
 */
export function sendJson<T = any>(
  res: ServerResponse,
  data: T,
  status: StatusCode = 200
): void {
  sendResponse(res, data, { status, contentType: 'application/json' });
}

/**
 * 发送错误响应 (便捷方法)
 * 
 * @param res - ServerResponse 对象
 * @param error - 错误对象或消息
 * @param status - 状态码
 * 
 * @example
 * sendError(res, 'Not found', 404);
 */
export function sendError(
  res: ServerResponse,
  error: string | Error | ErrorResponse,
  status: StatusCode = 500
): void {
  let errorResponse: ErrorResponse;
  
  if (typeof error === 'string') {
    errorResponse = buildErrorResponse('INTERNAL_ERROR', error);
  } else if (error instanceof Error) {
    errorResponse = buildErrorResponse('INTERNAL_ERROR', error.message);
  } else {
    errorResponse = error;
  }
  
  sendResponse(res, errorResponse, { 
    status, 
    contentType: 'application/json' 
  });
}

/**
 * 添加 CORS 头
 */
function addCorsHeaders(res: ServerResponse, options: CorsOptions = {}): void {
  const {
    origin = '*',
    methods = 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
    allowedHeaders = 'Content-Type, Authorization, X-Request-Id',
    credentials = false,
    maxAge = 86400
  } = options;
  
  const originValue = Array.isArray(origin) ? origin[0] : origin;
  
  res.setHeader('Access-Control-Allow-Origin', originValue);
  res.setHeader('Access-Control-Allow-Methods', methods);
  res.setHeader('Access-Control-Allow-Headers', allowedHeaders);
  
  if (credentials) {
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  
  res.setHeader('Access-Control-Max-Age', maxAge.toString());
}

/**
 * 添加缓存控制头
 */
function addCacheHeaders(res: ServerResponse, options: CacheOptions = {}): void {
  const {
    enabled = true,
    maxAge = 3600,
    private: isPrivate = false,
    etag,
    lastModified
  } = options;
  
  if (!enabled) {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    return;
  }
  
  const visibility = isPrivate ? 'private' : 'public';
  res.setHeader('Cache-Control', `${visibility}, max-age=${maxAge}`);
  
  if (etag) {
    res.setHeader('ETag', etag);
  }
  
  if (lastModified) {
    res.setHeader('Last-Modified', lastModified.toUTCString());
  }
}

/**
 * 生成请求 ID
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// ==================== 错误处理 ====================

/**
 * 错误类型枚举
 */
export enum ErrorType {
  VALIDATION = 'VALIDATION_ERROR',
  AUTHENTICATION = 'AUTHENTICATION_ERROR',
  AUTHORIZATION = 'AUTHORIZATION_ERROR',
  NOT_FOUND = 'NOT_FOUND_ERROR',
  CONFLICT = 'CONFLICT_ERROR',
  RATE_LIMIT = 'RATE_LIMIT_ERROR',
  TIMEOUT = 'TIMEOUT_ERROR',
  INTERNAL = 'INTERNAL_ERROR',
  BAD_REQUEST = 'BAD_REQUEST_ERROR',
  UNSUPPORTED_MEDIA = 'UNSUPPORTED_MEDIA_ERROR'
}

/**
 * HTTP 错误类
 */
export class HttpError extends Error {
  /** 错误码 */
  public readonly code: string;
  /** HTTP 状态码 */
  public readonly status: StatusCode;
  /** 错误类型 */
  public readonly type: ErrorType;
  /** 错误详情 */
  public readonly details?: any;
  
  constructor(
    message: string,
    status: StatusCode = 500,
    code?: string,
    type?: ErrorType,
    details?: any
  ) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.code = code || `HTTP_${status}`;
    this.type = type || ErrorType.INTERNAL;
    this.details = details;
    
    // 保持正确的堆栈跟踪
    Error.captureStackTrace(this, HttpError);
  }
  
  /**
   * 转换为错误响应对象
   */
  toResponse(requestId?: string, path?: string, method?: string): ErrorResponse {
    return buildErrorResponse(this.code, this.message, {
      details: this.details,
      requestId,
      path,
      method,
      includeStack: true
    });
  }
}

/**
 * 创建验证错误
 */
export function createValidationError(message: string, details?: any): HttpError {
  return new HttpError(message, 400, 'VALIDATION_ERROR', ErrorType.VALIDATION, details);
}

/**
 * 创建认证错误
 */
export function createAuthenticationError(message: string = 'Authentication required'): HttpError {
  return new HttpError(message, 401, 'AUTHENTICATION_ERROR', ErrorType.AUTHENTICATION);
}

/**
 * 创建授权错误
 */
export function createAuthorizationError(message: string = 'Access denied'): HttpError {
  return new HttpError(message, 403, 'AUTHORIZATION_ERROR', ErrorType.AUTHORIZATION);
}

/**
 * 创建未找到错误
 */
export function createNotFoundError(resource: string = 'Resource'): HttpError {
  return new HttpError(`${resource} not found`, 404, 'NOT_FOUND_ERROR', ErrorType.NOT_FOUND);
}

/**
 * 创建冲突错误
 */
export function createConflictError(message: string = 'Resource conflict'): HttpError {
  return new HttpError(message, 409, 'CONFLICT_ERROR', ErrorType.CONFLICT);
}

/**
 * 创建速率限制错误
 */
export function createRateLimitError(retryAfter?: number): HttpError {
  const error = new HttpError('Too many requests', 429, 'RATE_LIMIT_ERROR', ErrorType.RATE_LIMIT);
  if (retryAfter) {
    error.details = { retryAfter };
  }
  return error;
}

/**
 * 创建超时错误
 */
export function createTimeoutError(message: string = 'Request timeout'): HttpError {
  return new HttpError(message, 408, 'TIMEOUT_ERROR', ErrorType.TIMEOUT);
}

/**
 * 创建内部错误
 */
export function createInternalError(message: string = 'Internal server error'): HttpError {
  return new HttpError(message, 500, 'INTERNAL_ERROR', ErrorType.INTERNAL);
}

/**
 * 异步错误处理包装器
 * 
 * @param fn - 异步函数
 * @param errorHandler - 错误处理函数
 * @returns 包装后的函数
 * 
 * @example
 * const handler = withErrorHandler(async (req, res) => {
 *   const data = await fetchData();
 *   sendJson(res, data);
 * }, (error, req, res) => {
 *   sendError(res, error, 500);
 * });
 */
export function withErrorHandler<T extends any[], R = any>(
  fn: (...args: T) => Promise<R>,
  errorHandler: (error: Error, ...args: T) => void | Promise<void>
): (...args: T) => Promise<R | void> {
  return async (...args: T) => {
    try {
      return await fn(...args);
    } catch (error) {
      await errorHandler(error as Error, ...args);
    }
  };
}

/**
 * 创建请求处理器中间件
 * 
 * @param handlers - 处理器函数数组
 * @returns 组合处理器
 * 
 * @example
 * const handler = createHandler(
 *   authenticate,
 *   validateRequest,
 *   async (req, res) => {
 *     sendJson(res, { success: true });
 *   }
 * );
 */
export function createHandler(
  ...handlers: Array<(req: ParsedRequest, res: ServerResponse) => void | Promise<void>>
): (req: ParsedRequest, res: ServerResponse) => Promise<void> {
  return async (req: ParsedRequest, res: ServerResponse) => {
    for (const handler of handlers) {
      await handler(req, res);
      
      // 如果响应已结束，停止执行后续处理器
      if (res.writableEnded) {
        return;
      }
    }
  };
}

/**
 * 路由匹配器
 */
export interface RouteMatcher {
  /** HTTP 方法 */
  method: HttpMethod | '*';
  /** 路径模式 (支持参数 :id) */
  path: string | RegExp;
  /** 处理器 */
  handler: (req: ParsedRequest, res: ServerResponse) => void | Promise<void>;
}

/**
 * 创建简单路由器
 * 
 * @example
 * const router = createRouter([
 *   { method: 'GET', path: '/users', handler: getUsers },
 *   { method: 'POST', path: '/users', handler: createUser },
 *   { method: 'GET', path: /^\/users\/(\d+)$/, handler: getUserById }
 * ]);
 * 
 * // 在 HTTP 服务器中使用
 * http.createServer(async (req, res) => {
 *   const parsed = await parseRequest(req);
 *   await router(parsed, res);
 * });
 */
export function createRouter(
  routes: RouteMatcher[]
): (req: ParsedRequest, res: ServerResponse) => Promise<void> {
  return async (req: ParsedRequest, res: ServerResponse) => {
    for (const route of routes) {
      // 检查方法匹配
      if (route.method !== '*' && route.method !== req.method) {
        continue;
      }
      
      // 检查路径匹配
      let pathMatch = false;
      if (route.path instanceof RegExp) {
        pathMatch = route.path.test(req.path);
      } else {
        pathMatch = matchPath(route.path, req.path);
      }
      
      if (pathMatch) {
        try {
          await route.handler(req, res);
          return;
        } catch (error) {
          if (error instanceof HttpError) {
            sendError(res, error.toResponse(undefined, req.path, req.method), error.status);
          } else {
            sendError(res, error as Error, 500);
          }
          return;
        }
      }
    }
    
    // 未找到路由
    sendError(res, createNotFoundError('Route'), 404);
  };
}

/**
 * 路径匹配 (支持 :param 参数)
 */
function matchPath(pattern: string, path: string): boolean {
  if (pattern === path) {
    return true;
  }
  
  // 处理参数化路径 /users/:id
  const patternParts = pattern.split('/');
  const pathParts = path.split('/');
  
  if (patternParts.length !== pathParts.length) {
    return false;
  }
  
  for (let i = 0; i < patternParts.length; i++) {
    const patternPart = patternParts[i];
    const pathPart = pathParts[i];
    
    // 参数匹配 (以 : 开头)
    if (patternPart.startsWith(':')) {
      continue;
    }
    
    // 普通部分必须完全匹配
    if (patternPart !== pathPart) {
      return false;
    }
  }
  
  return true;
}

/**
 * 从参数化路径中提取参数
 * 
 * @param pattern - 路径模式 (如 /users/:id)
 * @param path - 实际路径 (如 /users/123)
 * @returns 参数对象
 * 
 * @example
 * const params = extractPathParams('/users/:id/posts/:postId', '/users/123/posts/456');
 * // { id: '123', postId: '456' }
 */
export function extractPathParams(pattern: string, path: string): Record<string, string> {
  const params: Record<string, string> = {};
  const patternParts = pattern.split('/');
  const pathParts = path.split('/');
  
  for (let i = 0; i < patternParts.length; i++) {
    const patternPart = patternParts[i];
    const pathPart = pathParts[i];
    
    if (patternPart.startsWith(':')) {
      const paramName = patternPart.substring(1);
      params[paramName] = pathPart;
    }
  }
  
  return params;
}

// ==================== 验证工具 ====================

/**
 * 请求验证器
 */
export interface Validator<T = any> {
  /** 验证函数 */
  validate: (data: any) => { valid: boolean; errors: string[]; data?: T };
}

/**
 * 创建请求体验证器
 * 
 * @param schema - 验证规则
 * @returns 验证器
 * 
 * @example
 * const validator = createBodyValidator({
 *   required: ['email', 'password'],
 *   types: {
 *     email: 'string',
 *     password: 'string',
 *     age: 'number'
 *   },
 *   custom: {
 *     email: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
 *   }
 * });
 * 
 * const result = validator.validate(req.body);
 * if (!result.valid) {
 *   throw createValidationError('Invalid request', result.errors);
 * }
 */
export function createBodyValidator<T = any>(schema: ValidationSchema): Validator<T> {
  return {
    validate: (data: any) => {
      const errors: string[] = [];
      
      // 检查必填字段
      if (schema.required) {
        for (const field of schema.required) {
          if (data[field] === undefined || data[field] === null) {
            errors.push(`Field '${field}' is required`);
          }
        }
      }
      
      // 检查类型
      if (schema.types) {
        for (const [field, expectedType] of Object.entries(schema.types)) {
          if (data[field] !== undefined && data[field] !== null) {
            const actualType = typeof data[field];
            if (expectedType === 'array') {
              if (!Array.isArray(data[field])) {
                errors.push(`Field '${field}' must be an array`);
              }
            } else if (actualType !== expectedType) {
              errors.push(`Field '${field}' must be of type ${expectedType}`);
            }
          }
        }
      }
      
      // 执行自定义验证
      if (schema.custom) {
        for (const [field, validator] of Object.entries(schema.custom)) {
          if (data[field] !== undefined) {
            const result = validator(data[field], data);
            if (!result.valid) {
              errors.push(result.message || `Field '${field}' validation failed`);
            }
          }
        }
      }
      
      return {
        valid: errors.length === 0,
        errors,
        data: errors.length === 0 ? data as T : undefined
      };
    }
  };
}

/**
 * 验证模式
 */
export interface ValidationSchema {
  /** 必填字段 */
  required?: string[];
  /** 字段类型映射 */
  types?: Record<string, 'string' | 'number' | 'boolean' | 'object' | 'array'>;
  /** 自定义验证函数 */
  custom?: Record<string, (value: any, data: any) => { valid: boolean; message?: string }>;
  /** 最小值 (用于数字) */
  min?: Record<string, number>;
  /** 最大值 (用于数字) */
  max?: Record<string, number>;
  /** 最小长度 (用于字符串/数组) */
  minLength?: Record<string, number>;
  /** 最大长度 (用于字符串/数组) */
  maxLength?: Record<string, number>;
  /** 正则匹配 (用于字符串) */
  pattern?: Record<string, RegExp>;
}

// ==================== 工具函数 ====================

/**
 * 格式化字节数为人类可读
 */
export function formatBytes(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let unitIndex = 0;
  let size = bytes;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(2)} ${units[unitIndex]}`;
}

/**
 * 计算响应大小
 */
export function calculateResponseSize(data: any): number {
  const json = typeof data === 'string' ? data : JSON.stringify(data);
  return Buffer.byteLength(json, 'utf8');
}

/**
 * 检查请求是否接受指定内容类型
 */
export function acceptsContentType(req: ParsedRequest, contentType: string): boolean {
  const acceptHeader = req.headers['accept'] as string;
  if (!acceptHeader) return true;
  
  return acceptHeader.includes(contentType) || acceptHeader.includes('*/*');
}

/**
 * 记录请求日志
 */
export function logRequest(req: ParsedRequest, res: ServerResponse, startTime: number): void {
  const duration = Date.now() - startTime;
  const status = res.statusCode;
  const method = req.method;
  const path = req.path;
  const ip = req.ip;
  
  const color = status >= 500 ? '\x1b[31m' : status >= 400 ? '\x1b[33m' : '\x1b[32m';
  const reset = '\x1b[0m';
  
  console.log(`${color}[${method}]${reset} ${path} ${status} ${duration}ms - ${ip}`);
}

// ==================== 导出 ====================

export default {
  // 请求解析
  parseRequest,
  
  // 响应构建
  buildSuccessResponse,
  buildErrorResponse,
  sendResponse,
  sendJson,
  sendError,
  
  // 错误处理
  HttpError,
  ErrorType,
  createValidationError,
  createAuthenticationError,
  createAuthorizationError,
  createNotFoundError,
  createConflictError,
  createRateLimitError,
  createTimeoutError,
  createInternalError,
  
  // 处理器工具
  withErrorHandler,
  createHandler,
  createRouter,
  extractPathParams,
  
  // 验证
  createBodyValidator,
  
  // 工具函数
  formatBytes,
  calculateResponseSize,
  acceptsContentType,
  logRequest,
  
  // 类型
  type HttpMethod,
  type ContentType,
  type ParsedBody,
  type ParsedRequest,
  type StatusCode,
  type ResponseHeaders,
  type ResponseOptions,
  type CorsOptions,
  type CacheOptions,
  type ErrorResponse,
  type SuccessResponse,
  type ApiResponse,
  type PaginationInfo,
  type ParseRequestOptions,
  type Validator,
  type ValidationSchema,
  type RouteMatcher
};
