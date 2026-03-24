/**
 * Router Utils Skill - URL 路由匹配工具
 * 
 * 功能:
 * 1. 路由定义 - 支持动态参数、通配符、可选参数
 * 2. 参数提取 - 从 URL 中提取路由参数
 * 3. 中间件绑定 - 支持路由级中间件链
 * 
 * @module router-utils-skill
 * @version 1.0.0
 */

// ==================== 类型定义 ====================

/**
 * 路由参数类型
 */
export type RouteParamType = 'string' | 'number' | 'boolean' | 'array';

/**
 * 路由参数配置
 */
export interface RouteParamConfig {
  name: string;
  type: RouteParamType;
  required: boolean;
  default?: any;
  validate?: (value: any) => boolean;
}

/**
 * 中间件函数类型
 */
export type MiddlewareFn = (
  ctx: MiddlewareContext,
  next: () => Promise<void>
) => Promise<void>;

/**
 * 中间件上下文
 */
export interface MiddlewareContext {
  params: Record<string, any>;
  query: Record<string, any>;
  path: string;
  method: string;
  data?: any;
}

/**
 * 路由配置
 */
export interface RouteConfig {
  path: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | '*';
  params?: RouteParamConfig[];
  middlewares?: MiddlewareFn[];
  handler?: (ctx: MiddlewareContext) => Promise<any> | any;
  name?: string;
  description?: string;
}

/**
 * 匹配结果
 */
export interface MatchResult {
  matched: boolean;
  route?: RouteConfig;
  params?: Record<string, any>;
  error?: string;
}

// ==================== 路由解析器 ====================

/**
 * 路由解析器类
 */
export class RouterUtils {
  private routes: RouteConfig[] = [];
  private routeMap: Map<string, RouteConfig> = new Map();

  /**
   * 注册路由
   */
  register(config: RouteConfig): RouterUtils {
    const key = `${config.method || '*'}:${config.path}`;
    
    // 解析路径参数
    const params = this.parsePathParams(config.path);
    config.params = [...(config.params || []), ...params];
    
    this.routes.push(config);
    this.routeMap.set(key, config);
    
    return this;
  }

  /**
   * 批量注册路由
   */
  registerAll(configs: RouteConfig[]): RouterUtils {
    configs.forEach(config => this.register(config));
    return this;
  }

  /**
   * 匹配 URL 路径
   */
  match(path: string, method: string = 'GET'): MatchResult {
    // 移除查询字符串
    const cleanPath = path.split('?')[0];
    
    for (const route of this.routes) {
      // 检查方法是否匹配
      if (route.method !== '*' && route.method !== method) {
        continue;
      }

      const params = this.matchPath(route.path, cleanPath);
      
      if (params !== null) {
        // 验证参数
        const validation = this.validateParams(params, route.params || []);
        
        if (!validation.valid) {
          return {
            matched: false,
            error: validation.error
          };
        }

        return {
          matched: true,
          route,
          params: params
        };
      }
    }

    return {
      matched: false,
      error: `No route matches ${method} ${path}`
    };
  }

  /**
   * 执行中间件链
   */
  async executeMiddlewares(
    ctx: MiddlewareContext,
    middlewares: MiddlewareFn[]
  ): Promise<void> {
    let index = -1;

    const dispatch = async (i: number): Promise<void> => {
      if (i <= index) {
        throw new Error('next() called multiple times');
      }
      
      index = i;
      
      if (i >= middlewares.length) {
        return;
      }

      const middleware = middlewares[i];
      await middleware(ctx, () => dispatch(i + 1));
    };

    await dispatch(0);
  }

  /**
   * 生成路由 URL
   */
  generate(routeName: string, params: Record<string, any>): string {
    const route = Array.from(this.routeMap.values()).find(
      r => r.name === routeName
    );

    if (!route) {
      throw new Error(`Route "${routeName}" not found`);
    }

    let path = route.path;
    
    // 替换动态参数
    for (const [key, value] of Object.entries(params)) {
      path = path.replace(`:${key}`, String(value));
      path = path.replace(`:${key}?`, String(value));
    }

    // 移除未替换的可选参数
    path = path.replace(/\/:[^/?]+\/?/g, '');
    
    return path;
  }

  /**
   * 获取所有注册的路由
   */
  getRoutes(): RouteConfig[] {
    return [...this.routes];
  }

  /**
   * 清除所有路由
   */
  clear(): RouterUtils {
    this.routes = [];
    this.routeMap.clear();
    return this;
  }

  // ==================== 私有方法 ====================

  /**
   * 解析路径中的参数定义
   */
  private parsePathParams(path: string): RouteParamConfig[] {
    const params: RouteParamConfig[] = [];
    const paramRegex = /:([a-zA-Z_][a-zA-Z0-9_]*)(\?)?/g;
    let match;

    while ((match = paramRegex.exec(path)) !== null) {
      params.push({
        name: match[1],
        type: 'string',
        required: !match[2] // 没有 ? 就是必需的
      });
    }

    return params;
  }

  /**
   * 匹配路径并提取参数
   */
  private matchPath(pattern: string, path: string): Record<string, any> | null {
    // 转义特殊字符
    let regexPattern = pattern
      .replace(/[.+^${}()|[\]\\]/g, '\\$&')
      .replace(/:([a-zA-Z_][a-zA-Z0-9_]*)(\?)?/g, (match, name, optional) => {
        return optional ? `([^/]+)?` : `([^/]+)`;
      })
      .replace(/\*/g, '(.*)');

    // 添加开始和结束锚点
    regexPattern = `^${regexPattern}$`;
    
    const regex = new RegExp(regexPattern);
    const match = path.match(regex);

    if (!match) {
      return null;
    }

    // 提取参数
    const params: Record<string, any> = {};
    const paramNames = pattern.match(/:([a-zA-Z_][a-zA-Z0-9_]*)(\?)?/g) || [];
    
    paramNames.forEach((param, index) => {
      const name = param.replace(/^:|\?$/g, '');
      const value = match[index + 1];
      
      if (value !== undefined) {
        params[name] = value;
      }
    });

    return params;
  }

  /**
   * 验证参数
   */
  private validateParams(
    params: Record<string, any>,
    paramConfigs: RouteParamConfig[]
  ): { valid: boolean; error?: string } {
    for (const config of paramConfigs) {
      const value = params[config.name];

      // 检查必需参数
      if (config.required && (value === undefined || value === null)) {
        return {
          valid: false,
          error: `Missing required parameter: ${config.name}`
        };
      }

      // 跳过空值的可选参数
      if (value === undefined || value === null) {
        continue;
      }

      // 类型验证
      if (!this.validateType(value, config.type)) {
        return {
          valid: false,
          error: `Parameter "${config.name}" must be of type ${config.type}`
        };
      }

      // 自定义验证
      if (config.validate && !config.validate(value)) {
        return {
          valid: false,
          error: `Parameter "${config.name}" validation failed`
        };
      }
    }

    return { valid: true };
  }

  /**
   * 类型验证
   */
  private validateType(value: any, type: RouteParamType): boolean {
    switch (type) {
      case 'string':
        return typeof value === 'string';
      case 'number':
        return !isNaN(Number(value));
      case 'boolean':
        return ['true', 'false', true, false].includes(value);
      case 'array':
        return Array.isArray(value) || typeof value === 'string';
      default:
        return true;
    }
  }
}

// ==================== 常用中间件 ====================

/**
 * 日志中间件
 */
export const loggingMiddleware: MiddlewareFn = async (ctx, next) => {
  const start = Date.now();
  await next();
  const duration = Date.now() - start;
  console.log(`[${ctx.method}] ${ctx.path} - ${duration}ms`);
};

/**
 * 认证中间件
 */
export const authMiddleware = (
  validateFn: (ctx: MiddlewareContext) => boolean
): MiddlewareFn => {
  return async (ctx, next) => {
    if (!validateFn(ctx)) {
      throw new Error('Unauthorized');
    }
    await next();
  };
};

/**
 * 速率限制中间件
 */
export const rateLimitMiddleware = (
  limit: number,
  windowMs: number
): MiddlewareFn => {
  const requests: Map<string, number[]> = new Map();

  return async (ctx, next) => {
    const key = ctx.path;
    const now = Date.now();
    const windowStart = now - windowMs;

    const userRequests = requests.get(key) || [];
    const recentRequests = userRequests.filter(time => time > windowStart);

    if (recentRequests.length >= limit) {
      throw new Error('Too many requests');
    }

    recentRequests.push(now);
    requests.set(key, recentRequests);

    await next();
  };
};

/**
 * CORS 中间件
 */
export const corsMiddleware = (options: {
  origin?: string;
  methods?: string[];
  headers?: string[];
}): MiddlewareFn => {
  return async (ctx, next) => {
    // CORS 预检请求处理
    if (ctx.method === 'OPTIONS') {
      ctx.data = {
        headers: {
          'Access-Control-Allow-Origin': options.origin || '*',
          'Access-Control-Allow-Methods': options.methods?.join(', ') || 'GET, POST, PUT, DELETE',
          'Access-Control-Allow-Headers': options.headers?.join(', ') || 'Content-Type, Authorization'
        }
      };
      return;
    }

    await next();
  };
};

// ==================== 导出单例 ====================

/**
 * 默认路由器实例
 */
export const router = new RouterUtils();

// ==================== 便捷方法 ====================

/**
 * 创建路由器实例
 */
export function createRouter(): RouterUtils {
  return new RouterUtils();
}

/**
 * 定义路由 (链式调用)
 */
export function defineRoute(path: string): {
  method: (m: RouteConfig['method']) => {
    use: (...middlewares: MiddlewareFn[]) => {
      handler: (h: RouteConfig['handler']) => RouterUtils;
    };
    handler: (h: RouteConfig['handler']) => RouterUtils;
  };
} {
  let config: RouteConfig = { path };

  return {
    method: (method) => ({
      use: (...middlewares) => ({
        handler: (handler) => {
          config.method = method;
          config.middlewares = middlewares;
          config.handler = handler;
          return router.register(config);
        }
      }),
      handler: (handler) => {
        config.method = method;
        config.handler = handler;
        return router.register(config);
      }
    })
  };
}

// ==================== 使用示例 ====================

/**
 * 使用示例代码
 * 
 * @example
 * // 1. 基础使用
 * import { createRouter, loggingMiddleware } from './router-utils-skill';
 * 
 * const router = createRouter();
 * 
 * // 注册路由
 * router.register({
 *   path: '/users/:id',
 *   method: 'GET',
 *   handler: async (ctx) => {
 *     return { userId: ctx.params.id };
 *   }
 * });
 * 
 * // 匹配路由
 * const result = router.match('/users/123', 'GET');
 * if (result.matched) {
 *   console.log(result.params); // { id: '123' }
 * }
 * 
 * @example
 * // 2. 中间件链
 * router.register({
 *   path: '/api/data',
 *   method: 'POST',
 *   middlewares: [
 *     loggingMiddleware,
 *     authMiddleware((ctx) => !!ctx.headers.authorization),
 *     rateLimitMiddleware(100, 60000)
 *   ],
 *   handler: async (ctx) => {
 *     return { success: true };
 *   }
 * });
 * 
 * @example
 * // 3. 链式定义
 * import { defineRoute } from './router-utils-skill';
 * 
 * defineRoute('/posts/:postId/comments/:commentId?')
 *   .method('GET')
 *   .use(loggingMiddleware)
 *   .handler(async (ctx) => {
 *     return {
 *       postId: ctx.params.postId,
 *       commentId: ctx.params.commentId
 *     };
 *   });
 * 
 * @example
 * // 4. 参数验证
 * router.register({
 *   path: '/products/:id',
 *   method: 'GET',
 *   params: [{
 *     name: 'id',
 *     type: 'number',
 *     required: true,
 *     validate: (value) => Number(value) > 0
 *   }],
 *   handler: async (ctx) => {
 *     return { productId: Number(ctx.params.id) };
 *   }
 * });
 * 
 * @example
 * // 5. 生成路由 URL
 * router.register({
 *   path: '/users/:userId/posts/:postId',
 *   method: 'GET',
 *   name: 'userPost'
 * });
 * 
 * const url = router.generate('userPost', {
 *   userId: '123',
 *   postId: '456'
 * });
 * console.log(url); // /users/123/posts/456
 */

export default RouterUtils;
