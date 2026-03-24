/**
 * Gateway Pattern Skill - API 网关模式
 * 
 * 功能:
 * 1. 路由定义 - 灵活的路由规则配置系统
 * 2. 请求转发 - 基于规则的请求转发到后端服务
 * 3. 网关过滤 - 请求/响应拦截器链式处理
 * 
 * @module gateway-pattern-skill
 * @version 1.0.0
 */

// ==================== 类型定义 ====================

/**
 * HTTP 方法类型
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';

/**
 * 请求头类型
 */
export type Headers = Record<string, string>;

/**
 * 查询参数类型
 */
export type QueryParams = Record<string, string | string[]>;

/**
 * 路由配置
 */
export interface RouteConfig {
  /** 路由 ID */
  id: string;
  /** 匹配路径模式 (支持通配符 * 和参数 :param) */
  path: string;
  /** HTTP 方法 */
  method: HttpMethod | '*';
  /** 目标后端服务 URL */
  target: string;
  /** 是否保留原始路径 */
  preservePath?: boolean;
  /** 路径前缀替换配置 */
  pathRewrite?: { from: string; to: string };
  /** 请求头转换规则 */
  headers?: Headers;
  /** 超时时间 (ms) */
  timeout?: number;
  /** 重试次数 */
  retries?: number;
  /** 优先级 (数字越大优先级越高) */
  priority?: number;
  /** 启用的过滤器 ID 列表 */
  filters?: string[];
  /** 是否启用 */
  enabled?: boolean;
}

/**
 * 过滤器配置
 */
export interface FilterConfig {
  /** 过滤器 ID */
  id: string;
  /** 过滤器名称 */
  name: string;
  /** 过滤器类型 */
  type: 'request' | 'response' | 'both';
  /** 优先级 (数字越大越先执行) */
  priority: number;
  /** 过滤器函数 */
  handler: FilterHandler;
  /** 是否启用 */
  enabled?: boolean;
}

/**
 * 过滤器处理函数
 */
export interface FilterHandler {
  /** 请求过滤器 */
  onRequest?: (context: GatewayContext) => Promise<GatewayContext> | GatewayContext;
  /** 响应过滤器 */
  onResponse?: (context: GatewayContext, response: GatewayResponse) => Promise<GatewayResponse> | GatewayResponse;
}

/**
 * 网关请求上下文
 */
export interface GatewayContext {
  /** 请求 ID */
  requestId: string;
  /** 原始请求 URL */
  url: string;
  /** 路径 */
  path: string;
  /** HTTP 方法 */
  method: HttpMethod;
  /** 请求头 */
  headers: Headers;
  /** 查询参数 */
  query: QueryParams;
  /** 请求体 */
  body?: any;
  /** 匹配的路由配置 */
  route?: RouteConfig;
  /** 开始时间戳 */
  timestamp: number;
  /** 路径参数 */
  pathParams?: Record<string, string>;
  /** 自定义数据 (供过滤器使用) */
  data?: Record<string, any>;
}

/**
 * 网关响应
 */
export interface GatewayResponse {
  /** 请求 ID */
  requestId: string;
  /** HTTP 状态码 */
  statusCode: number;
  /** 响应头 */
  headers: Headers;
  /** 响应体 */
  body: any;
  /** 处理时间 (ms) */
  duration: number;
  /** 错误信息 (如果有) */
  error?: string;
  /** 来源服务 */
  source?: string;
}

/**
 * 网关配置
 */
export interface GatewayOptions {
  /** 默认超时时间 (ms) */
  defaultTimeout?: number;
  /** 默认重试次数 */
  defaultRetries?: number;
  /** 是否记录日志 */
  logging?: boolean;
  /** 日志级别 */
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
}

// ==================== 网关核心类 ====================

/**
 * API 网关类
 */
export class APIGateway {
  private routes: Map<string, RouteConfig> = new Map();
  private filters: Map<string, FilterConfig> = new Map();
  private options: GatewayOptions;

  constructor(options: GatewayOptions = {}) {
    this.options = {
      defaultTimeout: 30000,
      defaultRetries: 0,
      logging: true,
      logLevel: 'info',
      ...options,
    };
  }

  /**
   * 添加路由
   */
  addRoute(config: RouteConfig): APIGateway {
    if (!config.enabled && config.enabled !== undefined) {
      return this;
    }
    this.routes.set(config.id, {
      ...config,
      enabled: true,
      timeout: config.timeout ?? this.options.defaultTimeout,
      retries: config.retries ?? this.options.defaultRetries,
    });
    this.log('debug', `Route added: ${config.id} (${config.method} ${config.path} -> ${config.target})`);
    return this;
  }

  /**
   * 移除路由
   */
  removeRoute(routeId: string): boolean {
    const deleted = this.routes.delete(routeId);
    if (deleted) {
      this.log('debug', `Route removed: ${routeId}`);
    }
    return deleted;
  }

  /**
   * 添加过滤器
   */
  addFilter(config: FilterConfig): APIGateway {
    if (!config.enabled && config.enabled !== undefined) {
      return this;
    }
    this.filters.set(config.id, {
      ...config,
      enabled: true,
    });
    this.log('debug', `Filter added: ${config.id} (${config.type})`);
    return this;
  }

  /**
   * 移除过滤器
   */
  removeFilter(filterId: string): boolean {
    const deleted = this.filters.delete(filterId);
    if (deleted) {
      this.log('debug', `Filter removed: ${filterId}`);
    }
    return deleted;
  }

  /**
   * 匹配路由
   */
  matchRoute(method: HttpMethod, path: string): RouteConfig | undefined {
    const matchedRoutes: RouteConfig[] = [];

    for (const route of this.routes.values()) {
      if (!route.enabled) continue;

      // 匹配方法
      if (route.method !== '*' && route.method !== method) continue;

      // 匹配路径
      if (this.matchPath(route.path, path)) {
        matchedRoutes.push(route);
      }
    }

    // 按优先级排序
    matchedRoutes.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));

    return matchedRoutes[0];
  }

  /**
   * 匹配路径 (支持通配符和参数)
   */
  private matchPath(pattern: string, path: string): boolean {
    // 精确匹配
    if (pattern === path) return true;

    // 通配符匹配
    if (pattern.includes('*')) {
      const regexPattern = pattern
        .replace(/\*/g, '.*')
        .replace(/:\w+/g, '[^/]+');
      const regex = new RegExp(`^${regexPattern}$`);
      return regex.test(path);
    }

    // 参数匹配
    return this.extractPathParams(pattern, path) !== null;
  }

  /**
   * 提取路径参数
   */
  private extractPathParams(pattern: string, path: string): Record<string, string> | null {
    const patternParts = pattern.split('/').filter(Boolean);
    const pathParts = path.split('/').filter(Boolean);

    if (patternParts.length !== pathParts.length) {
      return null;
    }

    const params: Record<string, string> = {};

    for (let i = 0; i < patternParts.length; i++) {
      const patternPart = patternParts[i];
      const pathPart = pathParts[i];

      if (patternPart.startsWith(':')) {
        const paramName = patternPart.substring(1);
        params[paramName] = decodeURIComponent(pathPart);
      } else if (patternPart !== pathPart) {
        return null;
      }
    }

    return params;
  }

  /**
   * 处理请求
   */
  async handleRequest(context: GatewayContext): Promise<GatewayResponse> {
    const startTime = Date.now();
    context.timestamp = startTime;
    context.requestId = context.requestId || this.generateRequestId();

    this.log('info', `Request started: ${context.requestId} ${context.method} ${context.path}`);

    try {
      // 1. 匹配路由
      const route = this.matchRoute(context.method, context.path);
      if (!route) {
        return this.createResponse(context, 404, { error: 'Route not found' }, startTime);
      }

      context.route = route;
      const pathParams = this.extractPathParams(route.path, context.path);
      context.pathParams = pathParams || undefined;

      this.log('debug', `Route matched: ${route.id} -> ${route.target}`);

      // 2. 执行请求过滤器
      context = await this.executeRequestFilters(context, route);

      // 3. 转发请求
      const response = await this.forwardRequest(context, route);

      // 4. 执行响应过滤器
      const filteredResponse = await this.executeResponseFilters(context, response, route);

      // 5. 返回响应
      const finalResponse = this.createResponse(
        context,
        filteredResponse.statusCode,
        filteredResponse.body,
        startTime,
        filteredResponse.headers,
        route.target
      );

      this.log('info', `Request completed: ${context.requestId} ${finalResponse.statusCode} (${finalResponse.duration}ms)`);

      return finalResponse;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.log('error', `Request failed: ${context.requestId} - ${errorMessage}`);

      return this.createResponse(
        context,
        500,
        { error: 'Internal gateway error', message: errorMessage },
        startTime
      );
    }
  }

  /**
   * 执行请求过滤器
   */
  private async executeRequestFilters(
    context: GatewayContext,
    route: RouteConfig
  ): Promise<GatewayContext> {
    const filterIds = route.filters || [];
    const allFilters = Array.from(this.filters.values())
      .filter(f => f.enabled && f.type === 'request' || f.type === 'both')
      .filter(f => filterIds.length === 0 || filterIds.includes(f.id))
      .sort((a, b) => b.priority - a.priority);

    let currentContext = context;

    for (const filter of allFilters) {
      if (filter.handler.onRequest) {
        this.log('debug', `Executing request filter: ${filter.id}`);
        currentContext = await filter.handler.onRequest(currentContext);
      }
    }

    return currentContext;
  }

  /**
   * 执行响应过滤器
   */
  private async executeResponseFilters(
    context: GatewayContext,
    response: GatewayResponse,
    route: RouteConfig
  ): Promise<GatewayResponse> {
    const filterIds = route.filters || [];
    const allFilters = Array.from(this.filters.values())
      .filter(f => f.enabled && f.type === 'response' || f.type === 'both')
      .filter(f => filterIds.length === 0 || filterIds.includes(f.id))
      .sort((a, b) => b.priority - a.priority);

    let currentResponse = response;

    for (const filter of allFilters) {
      if (filter.handler.onResponse) {
        this.log('debug', `Executing response filter: ${filter.id}`);
        currentResponse = await filter.handler.onResponse(context, currentResponse);
      }
    }

    return currentResponse;
  }

  /**
   * 转发请求
   */
  private async forwardRequest(
    context: GatewayContext,
    route: RouteConfig
  ): Promise<GatewayResponse> {
    const targetUrl = this.buildTargetUrl(context, route);

    this.log('debug', `Forwarding to: ${targetUrl}`);

    try {
      const fetchOptions: RequestInit = {
        method: context.method,
        headers: {
          ...context.headers,
          ...route.headers,
        },
        body: context.body ? JSON.stringify(context.body) : undefined,
      };

      const response = await fetch(targetUrl, fetchOptions);
      const responseBody = await response.json().catch(() => null);

      const responseHeaders: Headers = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      return {
        requestId: context.requestId,
        statusCode: response.status,
        headers: responseHeaders,
        body: responseBody,
        duration: 0,
        source: route.target,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Forward request failed';
      return {
        requestId: context.requestId,
        statusCode: 502,
        headers: {},
        body: { error: 'Bad Gateway', message: errorMessage },
        duration: 0,
        source: route.target,
      };
    }
  }

  /**
   * 构建目标 URL
   */
  private buildTargetUrl(context: GatewayContext, route: RouteConfig): string {
    let targetPath = context.path;

    // 路径重写
    if (route.pathRewrite) {
      targetPath = targetPath.replace(
        new RegExp(route.pathRewrite.from),
        route.pathRewrite.to
      );
    } else if (!route.preservePath) {
      // 移除匹配的路由前缀
      const routePath = route.path.replace(/:\w+/g, '[^/]+').replace(/\*/g, '.*');
      targetPath = targetPath.replace(new RegExp(`^${routePath}`), '');
    }

    // 添加查询参数
    const queryString = this.buildQueryString(context.query);
    const fullPath = queryString ? `${targetPath}${queryString}` : targetPath;

    return `${route.target}${fullPath}`;
  }

  /**
   * 构建查询字符串
   */
  private buildQueryString(query: QueryParams): string {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (Array.isArray(value)) {
        value.forEach(v => params.append(key, v));
      } else {
        params.set(key, value as string);
      }
    }
    const str = params.toString();
    return str ? `?${str}` : '';
  }

  /**
   * 创建响应对象
   */
  private createResponse(
    context: GatewayContext,
    statusCode: number,
    body: any,
    startTime: number,
    headers: Headers = {},
    source?: string
  ): GatewayResponse {
    return {
      requestId: context.requestId,
      statusCode,
      headers,
      body,
      duration: Date.now() - startTime,
      source,
    };
  }

  /**
   * 生成请求 ID
   */
  private generateRequestId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `req_${timestamp}_${random}`;
  }

  /**
   * 日志记录
   */
  private log(level: string, message: string): void {
    if (!this.options.logging) return;

    const logLevel = this.options.logLevel || 'info';
    const levels = ['debug', 'info', 'warn', 'error'];
    const currentLevelIndex = levels.indexOf(logLevel);
    const messageLevelIndex = levels.indexOf(level);

    if (messageLevelIndex >= currentLevelIndex) {
      const prefix = `[Gateway][${level.toUpperCase()}]`;
      console.log(`${prefix} ${message}`);
    }
  }

  /**
   * 获取所有路由
   */
  getRoutes(): RouteConfig[] {
    return Array.from(this.routes.values());
  }

  /**
   * 获取所有过滤器
   */
  getFilters(): FilterConfig[] {
    return Array.from(this.filters.values());
  }
}

// ==================== 常用过滤器工厂 ====================

/**
 * 创建认证过滤器
 */
export function createAuthFilter(
  validateToken: (token: string) => Promise<boolean>
): FilterConfig {
  return {
    id: 'auth',
    name: 'Authentication Filter',
    type: 'request',
    priority: 100,
    enabled: true,
    handler: {
      async onRequest(context) {
        const authHeader = context.headers['authorization'] || context.headers['Authorization'];
        
        if (!authHeader) {
          throw new Error('Authorization header required');
        }

        const token = authHeader.startsWith('Bearer ') 
          ? authHeader.substring(7) 
          : authHeader;

        const isValid = await validateToken(token);
        
        if (!isValid) {
          throw new Error('Invalid or expired token');
        }

        return context;
      },
    },
  };
}

/**
 * 创建日志过滤器
 */
export function createLoggingFilter(): FilterConfig {
  return {
    id: 'logging',
    name: 'Logging Filter',
    type: 'both',
    priority: 10,
    enabled: true,
    handler: {
      onRequest(context) {
        console.log(`[Request] ${context.method} ${context.path}`);
        return context;
      },
      onResponse(context, response) {
        console.log(`[Response] ${response.statusCode} (${response.duration}ms)`);
        return response;
      },
    },
  };
}

/**
 * 创建 CORS 过滤器
 */
export function createCorsFilter(allowedOrigins: string[] = ['*']): FilterConfig {
  return {
    id: 'cors',
    name: 'CORS Filter',
    type: 'response',
    priority: 50,
    enabled: true,
    handler: {
      onResponse(context, response) {
        const origin = context.headers['origin'] || context.headers['Origin'] || '';
        const allowed = allowedOrigins.includes('*') || allowedOrigins.includes(origin);

        if (allowed) {
          response.headers['Access-Control-Allow-Origin'] = origin || '*';
          response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, PATCH, OPTIONS';
          response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization';
          response.headers['Access-Control-Allow-Credentials'] = 'true';
        }

        return response;
      },
    },
  };
}

/**
 * 创建限流过滤器
 */
export function createRateLimitFilter(
  limit: number,
  windowMs: number
): FilterConfig {
  const requestCounts: Map<string, { count: number; resetTime: number }> = new Map();

  return {
    id: 'rate-limit',
    name: 'Rate Limit Filter',
    type: 'request',
    priority: 90,
    enabled: true,
    handler: {
      onRequest(context) {
        const ip = context.headers['x-forwarded-for'] || context.headers['X-Forwarded-For'] || 'unknown';
        const now = Date.now();
        const record = requestCounts.get(ip);

        if (!record || now > record.resetTime) {
          requestCounts.set(ip, { count: 1, resetTime: now + windowMs });
        } else {
          record.count++;
          if (record.count > limit) {
            throw new Error(`Rate limit exceeded. Try again in ${Math.ceil((record.resetTime - now) / 1000)}s`);
          }
        }

        return context;
      },
    },
  };
}

/**
 * 创建请求体解析过滤器
 */
export function createBodyParserFilter(): FilterConfig {
  return {
    id: 'body-parser',
    name: 'Body Parser Filter',
    type: 'request',
    priority: 80,
    enabled: true,
    handler: {
      onRequest(context) {
        const contentType = context.headers['content-type'] || context.headers['Content-Type'] || '';
        
        if (contentType.includes('application/json') && typeof context.body === 'string') {
          try {
            context.body = JSON.parse(context.body);
          } catch (e) {
            throw new Error('Invalid JSON body');
          }
        }

        return context;
      },
    },
  };
}

// ==================== 导出 ====================

export default APIGateway;
