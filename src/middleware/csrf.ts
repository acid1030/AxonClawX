/**
 * CSRF Protection Middleware
 * 
 * 提供 CSRF 攻击防护功能，支持 Token 生成、验证及双重提交 Cookie 模式
 * 
 * @author Axon
 * @version 1.0.0
 */

import * as crypto from 'crypto';

/**
 * CSRF 配置选项
 */
export interface CSRFConfig {
  /** Token 有效期 (毫秒)，默认 3600000 (1 小时) */
  tokenExpiration?: number;
  /** Token 长度 (字节)，默认 32 */
  tokenLength?: number;
  /** Cookie 名称，默认 'csrf_token' */
  cookieName?: string;
  /** Cookie 配置 */
  cookieOptions?: CookieOptions;
  /** 请求头名称，默认 'X-CSRF-Token' */
  headerName?: string;
  /** 是否启用双重提交 Cookie 模式，默认 true */
  doubleSubmitCookie?: boolean;
  /** 排除的路径 (不需要 CSRF 验证) */
  excludePaths?: string[];
  /** 是否仅验证非安全方法 (POST/PUT/DELETE/PATCH)，默认 true */
  validateNonSafeMethodsOnly?: boolean;
}

/**
 * Cookie 配置选项
 */
export interface CookieOptions {
  /** Cookie 路径，默认 '/' */
  path?: string;
  /** Cookie 域名 */
  domain?: string;
  /** 是否仅 HTTPS，默认 true */
  secure?: boolean;
  /** 是否仅 HTTP，默认 true */
  httpOnly?: boolean;
  /** SameSite 策略，默认 'strict' */
  sameSite?: 'strict' | 'lax' | 'none';
  /** Cookie 最大年龄 (秒) */
  maxAge?: number;
}

/**
 * CSRF Token 信息
 */
export interface CSRFTokenInfo {
  /** Token 值 */
  token: string;
  /** 过期时间 (时间戳) */
  expires: number;
  /** 签名 */
  signature: string;
}

/**
 * 请求上下文扩展
 */
export interface CSRFContext {
  /** 当前 CSRF Token */
  csrfToken?: string;
  /** Token 验证状态 */
  csrfValidated?: boolean;
}

/**
 * 安全的 HTTP 方法 (不需要 CSRF 验证)
 */
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * 默认配置
 */
const DEFAULT_CONFIG: Required<CSRFConfig> = {
  tokenExpiration: 3600000, // 1 小时
  tokenLength: 32,
  cookieName: 'csrf_token',
  cookieOptions: {
    path: '/',
    secure: true,
    httpOnly: true,
    sameSite: 'strict',
    maxAge: 3600,
  },
  headerName: 'X-CSRF-Token',
  doubleSubmitCookie: true,
  excludePaths: [],
  validateNonSafeMethodsOnly: true,
};

/**
 * CSRF 防护中间件类
 */
export class CSRFProtection {
  private config: Required<CSRFConfig>;
  private secretKey: string;

  constructor(secretKey: string, config?: CSRFConfig) {
    if (!secretKey || secretKey.length < 16) {
      throw new Error('CSRF secret key must be at least 16 characters');
    }
    
    this.secretKey = secretKey;
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
      cookieOptions: {
        ...DEFAULT_CONFIG.cookieOptions,
        ...config?.cookieOptions,
      },
    };
  }

  /**
   * 生成加密安全的随机 Token
   */
  private generateRandomToken(): string {
    return crypto.randomBytes(this.config.tokenLength).toString('hex');
  }

  /**
   * 创建 Token 签名
   */
  private signToken(token: string, expires: number): string {
    const data = `${token}:${expires}`;
    return crypto.createHmac('sha256', this.secretKey).update(data).digest('hex');
  }

  /**
   * 验证 Token 签名
   */
  private verifyTokenSignature(token: string, expires: number, signature: string): boolean {
    const expectedSignature = this.signToken(token, expires);
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  }

  /**
   * 生成 CSRF Token
   */
  generateToken(): CSRFTokenInfo {
    const token = this.generateRandomToken();
    const expires = Date.now() + this.config.tokenExpiration;
    const signature = this.signToken(token, expires);

    return {
      token: `${token}:${expires}:${signature}`,
      expires,
      signature,
    };
  }

  /**
   * 验证 CSRF Token
   */
  validateToken(token: string): boolean {
    if (!token) {
      return false;
    }

    const parts = token.split(':');
    if (parts.length !== 3) {
      return false;
    }

    const [rawToken, expiresStr, signature] = parts;
    const expires = parseInt(expiresStr, 10);

    // 检查过期
    if (isNaN(expires) || Date.now() > expires) {
      return false;
    }

    // 验证签名
    return this.verifyTokenSignature(rawToken, expires, signature);
  }

  /**
   * 检查路径是否被排除
   */
  private isPathExcluded(path: string): boolean {
    return this.config.excludePaths.some(pattern => {
      if (pattern.endsWith('*')) {
        return path.startsWith(pattern.slice(0, -1));
      }
      return path === pattern;
    });
  }

  /**
   * 设置 CSRF Cookie
   */
  private setCookie(setCookie: (name: string, value: string, options?: CookieOptions) => void, token: string): void {
    const cookieValue = `${token}:${Date.now() + this.config.tokenExpiration}`;
    setCookie(this.config.cookieName, cookieValue, this.config.cookieOptions);
  }

  /**
   * 从 Cookie 获取 Token
   */
  private getTokenFromCookie(getCookie: (name: string) => string | undefined): string | null {
    const cookieValue = getCookie(this.config.cookieName);
    if (!cookieValue) {
      return null;
    }

    const parts = cookieValue.split(':');
    if (parts.length >= 2) {
      return parts[0];
    }
    return null;
  }

  /**
   * 中间件主函数
   * 
   * @param ctx 请求上下文 (需包含 getHeader, getCookie, setCookie 方法)
   * @param next 下一个中间件
   */
  middleware(ctx: {
    method: string;
    path: string;
    getHeader: (name: string) => string | undefined;
    getCookie: (name: string) => string | undefined;
    setCookie: (name: string, value: string, options?: CookieOptions) => void;
  } & CSRFContext, next: () => void): void {
    // 检查是否排除
    if (this.isPathExcluded(ctx.path)) {
      return next();
    }

    // 检查是否仅验证非安全方法
    if (this.config.validateNonSafeMethodsOnly && SAFE_METHODS.has(ctx.method)) {
      // 为 GET 请求生成 Token
      const tokenInfo = this.generateToken();
      ctx.csrfToken = tokenInfo.token;
      this.setCookie(ctx.setCookie, tokenInfo.token);
      return next();
    }

    // 验证非安全方法
    const headerToken = ctx.getHeader(this.config.headerName);
    const cookieToken = this.config.doubleSubmitCookie 
      ? this.getTokenFromCookie(ctx.getCookie) 
      : null;

    // 验证 Header Token
    if (!headerToken || !this.validateToken(headerToken)) {
      ctx.csrfValidated = false;
      throw new CSRFError('Invalid or missing CSRF token in header');
    }

    // 双重提交 Cookie 验证
    if (this.config.doubleSubmitCookie) {
      if (!cookieToken) {
        ctx.csrfValidated = false;
        throw new CSRFError('Missing CSRF token in cookie');
      }

      // 比较 Header 和 Cookie 中的 Token (只比较原始 token 部分)
      const headerTokenRaw = headerToken.split(':')[0];
      if (headerTokenRaw !== cookieToken) {
        ctx.csrfValidated = false;
        throw new CSRFError('CSRF token mismatch between header and cookie');
      }
    }

    // 验证通过
    ctx.csrfValidated = true;
    ctx.csrfToken = headerToken;
    
    // 刷新 Cookie 过期时间
    this.setCookie(ctx.setCookie, headerToken);
    
    next();
  }

  /**
   * 创建 Express 风格中间件
   */
  createExpressMiddleware(): (req: any, res: any, next: () => void) => void {
    return (req: any, res: any, next: () => void) => {
      const ctx = {
        method: req.method,
        path: req.path || req.url,
        getHeader: (name: string) => req.headers[name.toLowerCase()],
        getCookie: (name: string) => {
          const cookies = req.headers.cookie;
          if (!cookies) return undefined;
          const match = cookies.match(new RegExp(`${name}=([^;]+)`));
          return match ? match[1] : undefined;
        },
        setCookie: (name: string, value: string, options?: CookieOptions) => {
          let cookie = `${name}=${value}`;
          if (options?.path) cookie += `; Path=${options.path}`;
          if (options?.domain) cookie += `; Domain=${options.domain}`;
          if (options?.secure) cookie += '; Secure';
          if (options?.httpOnly) cookie += '; HttpOnly';
          if (options?.sameSite) cookie += `; SameSite=${options.sameSite}`;
          if (options?.maxAge) cookie += `; Max-Age=${options.maxAge}`;
          res.setHeader('Set-Cookie', cookie);
        },
      };

      try {
        this.middleware(ctx, next);
        // 将 Token 暴露给响应
        if (ctx.csrfToken) {
          res.setHeader('X-CSRF-Token', ctx.csrfToken.split(':')[0]);
        }
      } catch (error) {
        if (error instanceof CSRFError) {
          res.statusCode = 403;
          res.end(JSON.stringify({
            error: 'CSRF_VALIDATION_FAILED',
            message: error.message,
          }));
        } else {
          next();
        }
      }
    };
  }
}

/**
 * CSRF 验证错误
 */
export class CSRFError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CSRFError';
  }
}

/**
 * 创建 CSRF 中间件实例
 * 
 * @param secretKey 密钥 (至少 16 字符)
 * @param config 配置选项
 * 
 * @example
 * ```typescript
 * import { createCSRFMiddleware } from './middleware/csrf';
 * 
 * const csrf = createCSRFMiddleware('your-secret-key-at-least-16-chars', {
 *   tokenExpiration: 3600000,
 *   cookieName: 'csrf_token',
 *   doubleSubmitCookie: true,
 * });
 * 
 * app.use(csrf.createExpressMiddleware());
 * ```
 */
export function createCSRFMiddleware(secretKey: string, config?: CSRFConfig): CSRFProtection {
  return new CSRFProtection(secretKey, config);
}

export default createCSRFMiddleware;
