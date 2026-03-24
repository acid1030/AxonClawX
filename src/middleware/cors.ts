/**
 * CORS (Cross-Origin Resource Sharing) Middleware
 * 
 * 跨域资源共享中间件，支持可配置来源、凭证传递、预检请求缓存
 * 
 * @author Axon
 * @version 1.0.0
 */

export interface CORSConfig {
  /** 允许的来源 (支持字符串、数组、正则、函数) */
  origin?: CORSOrigin | CORSOrigin[];
  /** 允许的方法 */
  methods?: HTTPMethod[];
  /** 允许的请求头 */
  allowedHeaders?: string[];
  /** 暴露的响应头 (客户端可访问的) */
  exposedHeaders?: string[];
  /** 是否允许携带凭证 (cookies/authorization headers) */
  credentials?: boolean;
  /** 预检请求缓存时间 (秒) */
  maxAge?: number;
  /** 是否处理 OPTIONS 预检请求 */
  handlePreflight?: boolean;
  /** 自定义来源验证函数 */
  originValidator?: (origin: string | undefined) => boolean | Promise<boolean>;
}

export type CORSOrigin = string | RegExp | ((origin: string | undefined) => boolean);

export type HTTPMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';

interface CORSResult {
  /** 是否允许跨域 */
  allowed: boolean;
  /** 允许的来源 */
  origin?: string;
  /** 拒绝原因 */
  reason?: string;
}

/**
 * CORS 中间件类
 */
export class CORSMiddleware {
  private config: Required<Omit<CORSConfig, 'originValidator'>> & {
    originValidator?: CORSConfig['originValidator'];
  };

  constructor(config: CORSConfig = {}) {
    this.config = {
      origin: config.origin || '*',
      methods: config.methods || ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: config.allowedHeaders || ['Content-Type', 'Authorization', 'X-Requested-With'],
      exposedHeaders: config.exposedHeaders || [],
      credentials: config.credentials || false,
      maxAge: config.maxAge || 86400, // 24 小时
      handlePreflight: config.handlePreflight !== false,
      originValidator: config.originValidator,
    };
  }

  /**
   * 验证来源是否合法
   */
  private async validateOrigin(requestOrigin: string | undefined): Promise<CORSResult> {
    const { origin, originValidator } = this.config;

    // 没有来源 (同源请求或非浏览器请求)
    if (!requestOrigin) {
      return { allowed: true, origin: undefined };
    }

    // 自定义验证函数优先
    if (originValidator) {
      try {
        const isValid = await originValidator(requestOrigin);
        if (isValid) {
          return { allowed: true, origin: requestOrigin };
        }
        return { 
          allowed: false, 
          origin: requestOrigin, 
          reason: 'Origin rejected by custom validator' 
        };
      } catch (error) {
        return { 
          allowed: false, 
          origin: requestOrigin, 
          reason: 'Origin validation error' 
        };
      }
    }

    // 通配符 * (不允许携带凭证)
    if (origin === '*') {
      return { allowed: true, origin: '*' };
    }

    // 数组形式
    if (Array.isArray(origin)) {
      for (const allowed of origin) {
        if (this.matchOrigin(requestOrigin, allowed)) {
          return { allowed: true, origin: requestOrigin };
        }
      }
      return { 
        allowed: false, 
        origin: requestOrigin, 
        reason: `Origin not in allowed list: ${origin.join(', ')}` 
      };
    }

    // 单个来源
    if (this.matchOrigin(requestOrigin, origin)) {
      return { allowed: true, origin: requestOrigin };
    }

    return { 
      allowed: false, 
      origin: requestOrigin, 
      reason: `Origin not allowed: ${origin}` 
    };
  }

  /**
   * 匹配来源 (支持字符串和正则)
   */
  private matchOrigin(requestOrigin: string, allowed: CORSOrigin): boolean {
    if (typeof allowed === 'string') {
      return requestOrigin === allowed;
    }
    if (allowed instanceof RegExp) {
      return allowed.test(requestOrigin);
    }
    if (typeof allowed === 'function') {
      return allowed(requestOrigin);
    }
    return false;
  }

  /**
   * 设置 CORS 响应头
   */
  private setCorsHeaders(
    res: any,
    result: CORSResult,
    isPreflight: boolean = false
  ): void {
    if (!result.allowed) {
      return;
    }

    const { methods, allowedHeaders, exposedHeaders, credentials, maxAge } = this.config;

    // Access-Control-Allow-Origin
    if (result.origin === '*') {
      res.setHeader('Access-Control-Allow-Origin', '*');
    } else if (result.origin) {
      res.setHeader('Access-Control-Allow-Origin', result.origin);
      // 动态来源时需要设置 Vary 头
      res.setHeader('Vary', 'Origin');
    }

    // Access-Control-Allow-Credentials
    if (credentials && result.origin !== '*') {
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    }

    // 预检请求特有头
    if (isPreflight) {
      // Access-Control-Allow-Methods
      res.setHeader('Access-Control-Allow-Methods', methods.join(', '));

      // Access-Control-Allow-Headers
      if (allowedHeaders.length > 0) {
        res.setHeader('Access-Control-Allow-Headers', allowedHeaders.join(', '));
      }

      // Access-Control-Max-Age (预检缓存时间)
      if (maxAge) {
        res.setHeader('Access-Control-Max-Age', maxAge.toString());
      }
    }

    // Access-Control-Expose-Headers (始终设置)
    if (exposedHeaders.length > 0) {
      res.setHeader('Access-Control-Expose-Headers', exposedHeaders.join(', '));
    }
  }

  /**
   * 中间件处理函数
   */
  public async handle(
    req: any,
    res: any,
    next: () => void
  ): Promise<void> {
    const requestOrigin = req.headers?.origin || req.headers?.['Origin'];
    const method = (req.method || 'GET').toUpperCase();

    // 验证来源
    const result = await this.validateOrigin(requestOrigin);

    // 设置 CORS 头 (即使是同源请求也设置，保持一致性)
    this.setCorsHeaders(res, result, false);

    // 来源验证失败
    if (!result.allowed) {
      // 同源请求或无来源时允许通过
      if (!requestOrigin) {
        next();
        return;
      }

      // 跨域请求被拒绝
      res.statusCode = 403;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({
        error: 'CORS Error',
        message: result.reason,
        origin: result.origin,
      }));
      return;
    }

    // 处理 OPTIONS 预检请求
    if (method === 'OPTIONS' && this.config.handlePreflight) {
      this.setCorsHeaders(res, result, true);
      res.statusCode = 204; // No Content
      res.end();
      return;
    }

    next();
  }
}

/**
 * 创建 CORS 中间件
 * 
 * @param config CORS 配置
 * @returns Express/Koa 风格的中间件函数
 */
export function createCorsMiddleware(config: CORSConfig = {}) {
  const cors = new CORSMiddleware(config);

  return async (
    req: any,
    res: any,
    next: () => void
  ): Promise<void> => {
    await cors.handle(req, res, next);
  };
}

/**
 * 预定义的 CORS 配置模板
 */
export const presets = {
  /** 开放模式：允许所有来源 (不允许凭证) */
  open: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: false,
    maxAge: 86400,
  } as CORSConfig,

  /** 标准模式：允许指定来源，支持凭证 */
  standard: {
    origin: ['https://example.com', 'https://app.example.com'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['X-Custom-Header'],
    credentials: true,
    maxAge: 3600,
  } as CORSConfig,

  /** 严格模式：仅允许单个来源 */
  strict: {
    origin: 'https://trusted-domain.com',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type'],
    credentials: true,
    maxAge: 1800,
  } as CORSConfig,

  /** API 模式：支持正则匹配子域名 */
  api: {
    origin: /^https:\/\/[a-z0-9-]+\.example\.com$/,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
    exposedHeaders: ['X-RateLimit-Remaining'],
    credentials: false,
    maxAge: 86400,
  } as CORSConfig,

  /** 开发模式：允许本地所有端口 */
  development: {
    origin: [/^https?:\/\/localhost(:\d+)?$/, /^https?:\/\/127\.0\.0\.1(:\d+)?$/],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
    credentials: true,
    maxAge: 600,
  } as CORSConfig,
};

/**
 * 创建带自定义验证函数的 CORS 中间件
 */
export function createCorsWithValidator(
  validator: (origin: string | undefined) => boolean | Promise<boolean>,
  baseConfig: Omit<CORSConfig, 'originValidator'> = {}
) {
  return createCorsMiddleware({
    ...baseConfig,
    originValidator: validator,
  });
}

export default createCorsMiddleware;
