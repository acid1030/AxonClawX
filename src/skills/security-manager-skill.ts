/**
 * 安全管理器技能
 * 
 * 功能:
 * 1. CSP (Content Security Policy) 策略管理
 * 2. CORS (Cross-Origin Resource Sharing) 配置
 * 3. 速率限制 (Rate Limiting)
 * 
 * @module skills/security-manager
 */

import * as crypto from 'crypto';

// ==================== 类型定义 ====================

/**
 * CSP 指令类型
 */
export type CspDirective =
  | 'default-src'
  | 'script-src'
  | 'style-src'
  | 'img-src'
  | 'font-src'
  | 'connect-src'
  | 'frame-src'
  | 'frame-ancestors'
  | 'base-uri'
  | 'form-action'
  | 'object-src'
  | 'media-src'
  | 'worker-src'
  | 'manifest-src'
  | 'upgrade-insecure-requests'
  | 'block-all-mixed-content';

/**
 * CSP 源值类型
 */
export type CspSource =
  | "'self'"
  | "'unsafe-inline'"
  | "'unsafe-eval'"
  | "'none'"
  | "'strict-dynamic'"
  | "'report-sample'"
  | "'wasm-unsafe-eval'"
  | string; // 允许自定义域名

/**
 * CSP 策略配置
 */
export interface CspPolicy {
  directives: Record<CspDirective, CspSource[]>;
  reportUri?: string;
  reportOnly?: boolean;
}

/**
 * CORS 配置选项
 */
export interface CorsOptions {
  /** 允许的源 */
  origin?: string | string[] | ((origin: string) => boolean);
  /** 允许的方法 */
  methods?: string[];
  /** 允许的请求头 */
  allowedHeaders?: string[];
  /** 暴露的响应头 */
  exposedHeaders?: string[];
  /** 是否允许携带凭证 */
  credentials?: boolean;
  /** 预检请求缓存时间 (秒) */
  maxAge?: number;
  /** 是否允许所有源 (开发模式) */
  allowAll?: boolean;
}

/**
 * 速率限制配置
 */
export interface RateLimitConfig {
  /** 时间窗口 (毫秒) */
  windowMs: number;
  /** 时间窗口内最大请求数 */
  maxRequests: number;
  /** 唯一标识符生成函数 */
  keyGenerator?: (request: any) => string;
  /** 超出限制时的处理 */
  onLimitReached?: (key: string, count: number) => void;
  /** 是否跳过某些请求 */
  skip?: (request: any) => boolean;
}

/**
 * 速率限制器实例
 */
export interface RateLimiter {
  /** 检查请求是否允许 */
  check: (key: string) => { allowed: boolean; remaining: number; resetTime: number };
  /** 重置所有限制 */
  reset: () => void;
  /** 重置特定 key 的限制 */
  resetKey: (key: string) => void;
  /** 获取统计信息 */
  getStats: () => { totalKeys: number; blockedKeys: number };
}

// ==================== CSP 策略管理 ====================

/**
 * 预设 CSP 策略模板
 */
export const CSP_TEMPLATES = {
  /** 严格模式 - 适合生产环境 */
  strict: {
    'default-src': ["'self'"],
    'script-src': ["'self'"],
    'style-src': ["'self'"],
    'img-src': ["'self'", 'data:', 'https:'],
    'font-src': ["'self'"],
    'connect-src': ["'self'"],
    'frame-src': ["'none'"],
    'frame-ancestors': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'object-src': ["'none'"],
    'upgrade-insecure-requests': [],
  } as Record<CspDirective, CspSource[]>,

  /** 宽松模式 - 适合开发环境 */
  development: {
    'default-src': ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
    'script-src': ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
    'style-src': ["'self'", "'unsafe-inline'"],
    'img-src': ["'self'", 'data:', 'blob:', 'https:'],
    'font-src': ["'self'", 'data:', 'https://fonts.gstatic.com'],
    'connect-src': ["'self'", 'ws:', 'wss:', 'http://localhost:*', 'https://*'],
    'frame-src': ["'self'"],
    'frame-ancestors': ["'self'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'object-src': ["'none'"],
  } as Record<CspDirective, CspSource[]>,

  /** API 专用 - 无界面服务 */
  api: {
    'default-src': ["'none'"],
    'script-src': ["'none'"],
    'style-src': ["'none'"],
    'img-src': ["'self'"],
    'connect-src': ["'self'"],
    'frame-ancestors': ["'none'"],
    'base-uri': ["'none'"],
    'form-action': ["'none'"],
  } as Record<CspDirective, CspSource[]>,
};

/**
 * 创建 CSP 策略
 * @param template - 预设模板名称或自定义配置
 * @param customDirectives - 自定义指令 (会覆盖模板)
 * @returns CSP 策略对象
 */
export function createCspPolicy(
  template: keyof typeof CSP_TEMPLATES | 'custom' = 'strict',
  customDirectives: Partial<Record<CspDirective, CspSource[]>> = {}
): CspPolicy {
  const baseDirectives = template === 'custom' 
    ? {} as Record<CspDirective, CspSource[]>
    : { ...CSP_TEMPLATES[template] };
  
  // 合并自定义指令
  const directives = { ...baseDirectives, ...customDirectives } as Record<CspDirective, CspSource[]>;
  
  return {
    directives,
    reportOnly: false,
  };
}

/**
 * 添加 CSP 源到指令
 * @param policy - CSP 策略
 * @param directive - 指令名称
 * @param sources - 源值列表
 * @returns 更新后的策略
 */
export function addCspSources(
  policy: CspPolicy,
  directive: CspDirective,
  sources: CspSource[]
): CspPolicy {
  const currentSources = policy.directives[directive] || [];
  const newSources = Array.from(new Set([...currentSources, ...sources]));
  
  return {
    ...policy,
    directives: {
      ...policy.directives,
      [directive]: newSources,
    },
  };
}

/**
 * 移除 CSP 源从指令
 * @param policy - CSP 策略
 * @param directive - 指令名称
 * @param sources - 要移除的源值
 * @returns 更新后的策略
 */
export function removeCspSources(
  policy: CspPolicy,
  directive: CspDirective,
  sources: CspSource[]
): CspPolicy {
  const currentSources = policy.directives[directive] || [];
  const newSources = currentSources.filter(s => !sources.includes(s));
  
  return {
    ...policy,
    directives: {
      ...policy.directives,
      [directive]: newSources,
    },
  };
}

/**
 * 生成 CSP HTTP 头值
 * @param policy - CSP 策略
 * @returns CSP 头字符串
 */
export function generateCspHeader(policy: CspPolicy): string {
  const parts: string[] = [];
  
  for (const [directive, sources] of Object.entries(policy.directives)) {
    if (sources.length === 0) {
      parts.push(directive);
    } else {
      parts.push(`${directive} ${sources.join(' ')}`);
    }
  }
  
  if (policy.reportUri) {
    parts.push(`report-uri ${policy.reportUri}`);
  }
  
  return parts.join('; ');
}

/**
 * 获取 CSP 头名称
 * @param policy - CSP 策略
 * @returns 头名称 (Content-Security-Policy 或 Content-Security-Policy-Report-Only)
 */
export function getCspHeaderName(policy: CspPolicy): string {
  return policy.reportOnly 
    ? 'Content-Security-Policy-Report-Only' 
    : 'Content-Security-Policy';
}

/**
 * 验证 CSP 策略有效性
 * @param policy - CSP 策略
 * @returns 验证结果
 */
export function validateCspPolicy(policy: CspPolicy): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // 检查必需指令
  const requiredDirectives: CspDirective[] = ['default-src', 'script-src', 'style-src'];
  for (const directive of requiredDirectives) {
    if (!policy.directives[directive]) {
      errors.push(`Missing required directive: ${directive}`);
    }
  }
  
  // 检查源值格式
  for (const [directive, sources] of Object.entries(policy.directives)) {
    for (const source of sources) {
      if (source.startsWith("'") && !source.endsWith("'")) {
        errors.push(`Invalid source format in ${directive}: ${source}`);
      }
      if (source.includes(' ') && !source.startsWith("'")) {
        errors.push(`Source cannot contain spaces: ${source}`);
      }
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

// ==================== CORS 配置管理 ====================

/**
 * 预设 CORS 配置模板
 */
export const CORS_TEMPLATES = {
  /** 严格模式 - 仅允许特定源 */
  strict: (allowedOrigins: string[]) => ({
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['X-Request-Id'],
    credentials: false,
    maxAge: 86400, // 24 小时
    allowAll: false,
  }) as CorsOptions,

  /** 宽松模式 - 允许所有源 (仅开发) */
  development: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['*'],
    exposedHeaders: ['*'],
    credentials: true,
    maxAge: 3600, // 1 小时
    allowAll: true,
  } as CorsOptions,

  /** API 网关模式 */
  gateway: {
    origin: ['https://api.example.com', 'https://app.example.com'],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-Request-Id'],
    exposedHeaders: ['X-Request-Id', 'X-RateLimit-Remaining'],
    credentials: true,
    maxAge: 7200, // 2 小时
    allowAll: false,
  } as CorsOptions,
};

/**
 * 创建 CORS 配置
 * @param template - 预设模板名称或自定义配置
 * @param customOptions - 自定义选项
 * @returns CORS 配置对象
 */
export function createCorsConfig(
  template: keyof typeof CORS_TEMPLATES | 'custom' = 'strict',
  customOptions: Partial<CorsOptions> = {}
): CorsOptions {
  let baseConfig: CorsOptions;
  
  if (template === 'custom') {
    baseConfig = {};
  } else if (template === 'strict' && 'origin' in customOptions) {
    baseConfig = CORS_TEMPLATES.strict(customOptions.origin as string[]);
  } else {
    baseConfig = { ...CORS_TEMPLATES[template] };
  }
  
  return { ...baseConfig, ...customOptions };
}

/**
 * 添加允许的源
 * @param config - CORS 配置
 * @param origins - 新的源列表
 * @returns 更新后的配置
 */
export function addCorsOrigins(config: CorsOptions, origins: string[]): CorsOptions {
  if (config.allowAll) {
    return config; // 已经允许所有源
  }
  
  // 只处理数组类型的 origin
  if (!Array.isArray(config.origin) && typeof config.origin !== 'string') {
    return config; // 函数类型不处理
  }
  
  const currentOrigins = Array.isArray(config.origin) ? config.origin : [config.origin || ''].filter(Boolean);
  const newOrigins = Array.from(new Set([...currentOrigins, ...origins]));
  
  return {
    ...config,
    origin: newOrigins.length === 1 ? newOrigins[0] : newOrigins,
  };
}

/**
 * 移除允许的源
 * @param config - CORS 配置
 * @param origins - 要移除的源
 * @returns 更新后的配置
 */
export function removeCorsOrigins(config: CorsOptions, origins: string[]): CorsOptions {
  if (!Array.isArray(config.origin)) {
    return config;
  }
  
  const newOrigins = config.origin.filter(o => !origins.includes(o));
  
  return {
    ...config,
    origin: newOrigins.length === 1 ? newOrigins[0] : newOrigins,
  };
}

/**
 * 验证源是否允许
 * @param config - CORS 配置
 * @param origin - 要验证的源
 * @returns 是否允许
 */
export function isCorsOriginAllowed(config: CorsOptions, origin: string): boolean {
  if (config.allowAll || config.origin === '*') {
    return true;
  }
  
  if (typeof config.origin === 'function') {
    return config.origin(origin);
  }
  
  if (Array.isArray(config.origin)) {
    return config.origin.includes(origin);
  }
  
  if (typeof config.origin === 'string') {
    return config.origin === origin || config.origin === '*';
  }
  
  return false;
}

/**
 * 生成 CORS HTTP 头
 * @param config - CORS 配置
 * @param requestOrigin - 请求源
 * @returns CORS 头对象
 */
export function generateCorsHeaders(config: CorsOptions, requestOrigin?: string): Record<string, string> {
  const headers: Record<string, string> = {};
  
  // Access-Control-Allow-Origin
  if (config.allowAll || config.origin === '*') {
    headers['Access-Control-Allow-Origin'] = '*';
  } else if (typeof config.origin === 'function' && requestOrigin) {
    if (config.origin(requestOrigin)) {
      headers['Access-Control-Allow-Origin'] = requestOrigin;
    }
  } else if (Array.isArray(config.origin)) {
    if (requestOrigin && config.origin.includes(requestOrigin)) {
      headers['Access-Control-Allow-Origin'] = requestOrigin;
    }
  } else if (typeof config.origin === 'string' && config.origin !== '*') {
    headers['Access-Control-Allow-Origin'] = config.origin;
  }
  
  // Access-Control-Allow-Methods
  if (config.methods && config.methods.length > 0) {
    headers['Access-Control-Allow-Methods'] = config.methods.join(', ');
  }
  
  // Access-Control-Allow-Headers
  if (config.allowedHeaders && config.allowedHeaders.length > 0) {
    headers['Access-Control-Allow-Headers'] = config.allowedHeaders.join(', ');
  }
  
  // Access-Control-Expose-Headers
  if (config.exposedHeaders && config.exposedHeaders.length > 0) {
    headers['Access-Control-Expose-Headers'] = config.exposedHeaders.join(', ');
  }
  
  // Access-Control-Allow-Credentials
  if (config.credentials) {
    headers['Access-Control-Allow-Credentials'] = 'true';
  }
  
  // Access-Control-Max-Age
  if (config.maxAge) {
    headers['Access-Control-Max-Age'] = config.maxAge.toString();
  }
  
  return headers;
}

/**
 * 验证 CORS 配置有效性
 * @param config - CORS 配置
 * @returns 验证结果
 */
export function validateCorsConfig(config: CorsOptions): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // 检查凭证与通配源冲突
  if (config.credentials && (config.origin === '*' || config.allowAll)) {
    errors.push('Credentials cannot be used with wildcard origin');
  }
  
  // 检查方法列表
  const validMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'];
  if (config.methods) {
    for (const method of config.methods) {
      if (!validMethods.includes(method.toUpperCase())) {
        errors.push(`Invalid HTTP method: ${method}`);
      }
    }
  }
  
  // 检查 maxAge
  if (config.maxAge !== undefined && (config.maxAge < 0 || config.maxAge > 86400)) {
    errors.push('maxAge must be between 0 and 86400 seconds (24 hours)');
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

// ==================== 速率限制管理 ====================

/**
 * 预设速率限制配置模板
 */
export const RATE_LIMIT_TEMPLATES = {
  /** 严格模式 - 适合登录/注册接口 */
  strict: {
    windowMs: 15 * 60 * 1000, // 15 分钟
    maxRequests: 10,
  },

  /** 标准模式 - 适合一般 API */
  standard: {
    windowMs: 60 * 1000, // 1 分钟
    maxRequests: 100,
  },

  /** 宽松模式 - 适合公开 API */
  generous: {
    windowMs: 60 * 1000, // 1 分钟
    maxRequests: 1000,
  },

  /** 防暴力破解模式 - 适合敏感操作 */
  bruteForceProtection: {
    windowMs: 60 * 60 * 1000, // 1 小时
    maxRequests: 5,
  },
};

/**
 * 创建速率限制器
 * @param config - 速率限制配置
 * @returns 速率限制器实例
 */
export function createRateLimiter(config: RateLimitConfig): RateLimiter {
  // 存储请求记录: Map<key, { count, resetTime }>
  const store = new Map<string, { count: number; resetTime: number }>();
  
  // 清理过期记录的定时器
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    store.forEach((record, key) => {
      if (now > record.resetTime) {
        store.delete(key);
      }
    });
  }, Math.min(config.windowMs, 60000)); // 最多每分钟清理一次
  
  // 防止定时器阻止进程退出
  if (cleanupInterval.unref) {
    cleanupInterval.unref();
  }
  
  return {
    /**
     * 检查请求是否允许
     * @param key - 唯一标识符 (如 IP 地址、用户 ID)
     * @returns 检查结果
     */
    check(key: string): { allowed: boolean; remaining: number; resetTime: number } {
      const now = Date.now();
      const record = store.get(key);
      
      // 没有记录或已过期
      if (!record || now > record.resetTime) {
        store.set(key, {
          count: 1,
          resetTime: now + config.windowMs,
        });
        return {
          allowed: true,
          remaining: config.maxRequests - 1,
          resetTime: now + config.windowMs,
        };
      }
      
      // 检查是否超出限制
      if (record.count >= config.maxRequests) {
        if (config.onLimitReached) {
          config.onLimitReached(key, record.count);
        }
        return {
          allowed: false,
          remaining: 0,
          resetTime: record.resetTime,
        };
      }
      
      // 增加计数
      record.count++;
      store.set(key, record);
      
      return {
        allowed: true,
        remaining: config.maxRequests - record.count,
        resetTime: record.resetTime,
      };
    },
    
    /**
     * 重置所有限制
     */
    reset(): void {
      store.clear();
    },
    
    /**
     * 重置特定 key 的限制
     * @param key - 唯一标识符
     */
    resetKey(key: string): void {
      store.delete(key);
    },
    
    /**
     * 获取统计信息
     */
    getStats(): { totalKeys: number; blockedKeys: number } {
      const now = Date.now();
      let blockedKeys = 0;
      
      store.forEach((record) => {
        if (record.count >= config.maxRequests && now <= record.resetTime) {
          blockedKeys++;
        }
      });
      
      return {
        totalKeys: store.size,
        blockedKeys,
      };
    },
  };
}

/**
 * 创建分层速率限制器 (多个限制同时生效)
 * @param configs - 速率限制配置数组 (按优先级排序)
 * @returns 复合速率限制器
 */
export function createLayeredRateLimiter(configs: RateLimitConfig[]): RateLimiter {
  const limiters = configs.map(createRateLimiter);
  
  return {
    check(key: string): { allowed: boolean; remaining: number; resetTime: number } {
      let minRemaining = Infinity;
      let earliestReset = Infinity;
      let allAllowed = true;
      
      for (const limiter of limiters) {
        const result = limiter.check(key);
        if (!result.allowed) {
          allAllowed = false;
        }
        minRemaining = Math.min(minRemaining, result.remaining);
        earliestReset = Math.min(earliestReset, result.resetTime);
      }
      
      return {
        allowed: allAllowed,
        remaining: minRemaining === Infinity ? 0 : minRemaining,
        resetTime: earliestReset === Infinity ? Date.now() : earliestReset,
      };
    },
    
    reset(): void {
      limiters.forEach(limiter => limiter.reset());
    },
    
    resetKey(key: string): void {
      limiters.forEach(limiter => limiter.resetKey(key));
    },
    
    getStats(): { totalKeys: number; blockedKeys: number } {
      const stats = limiters.map(l => l.getStats());
      return {
        totalKeys: Math.max(...stats.map(s => s.totalKeys)),
        blockedKeys: Math.max(...stats.map(s => s.blockedKeys)),
      };
    },
  };
}

/**
 * 生成速率限制 HTTP 头
 * @param result - 速率限制检查结果
 * @returns 速率限制头对象
 */
export function generateRateLimitHeaders(
  result: { allowed: boolean; remaining: number; resetTime: number }
): Record<string, string> {
  return {
    'X-RateLimit-Limit': (result.remaining + (result.allowed ? 0 : 1)).toString(),
    'X-RateLimit-Remaining': Math.max(0, result.remaining).toString(),
    'X-RateLimit-Reset': Math.ceil(result.resetTime / 1000).toString(),
    ...(result.allowed ? {} : { 'Retry-After': Math.ceil((result.resetTime - Date.now()) / 1000).toString() }),
  };
}

/**
 * 验证速率限制配置有效性
 * @param config - 速率限制配置
 * @returns 验证结果
 */
export function validateRateLimitConfig(config: RateLimitConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (config.windowMs <= 0) {
    errors.push('windowMs must be positive');
  }
  
  if (config.maxRequests <= 0) {
    errors.push('maxRequests must be positive');
  }
  
  if (config.windowMs > 365 * 24 * 60 * 60 * 1000) {
    errors.push('windowMs cannot exceed 1 year');
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

// ==================== 安全工具函数 ====================

/**
 * 生成随机 nonce (用于 CSP)
 * @param length - nonce 长度，默认 16
 * @returns Base64 编码的 nonce
 */
export function generateCspNonce(length: number = 16): string {
  return crypto.randomBytes(length).toString('base64');
}

/**
 * 生成随机 state (用于 OAuth)
 * @param length - state 长度，默认 32
 * @returns 随机 state 字符串
 */
export function generateOAuthState(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * 验证请求来源是否可信
 * @param origin - 请求来源
 * @param allowedOrigins - 允许的源列表
 * @returns 是否可信
 */
export function isOriginTrusted(origin: string | undefined, allowedOrigins: string[]): boolean {
  if (!origin) {
    return false;
  }
  
  try {
    const originUrl = new URL(origin);
    const normalizedOrigin = originUrl.origin;
    return allowedOrigins.some(allowed => {
      if (allowed === '*') {
        return true;
      }
      if (allowed.includes('*')) {
        const pattern = new RegExp('^' + allowed.replace(/\./g, '\\.').replace(/\*/g, '.*') + '$');
        return pattern.test(normalizedOrigin);
      }
      return allowed === normalizedOrigin;
    });
  } catch {
    return false;
  }
}

/**
 * 清理用户输入 (防止 XSS)
 * @param input - 用户输入
 * @returns 清理后的字符串
 */
export function sanitizeInput(input: string): string {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * 验证 Content-Type 是否允许
 * @param contentType - Content-Type 头
 * @param allowedTypes - 允许的 MIME 类型列表
 * @returns 是否允许
 */
export function isContentTypeAllowed(contentType: string, allowedTypes: string[]): boolean {
  if (!contentType) {
    return false;
  }
  
  const normalizedType = contentType.split(';')[0].trim().toLowerCase();
  return allowedTypes.some(allowed => {
    if (allowed === '*/*') {
      return true;
    }
    if (allowed.endsWith('/*')) {
      const prefix = allowed.slice(0, -2);
      return normalizedType.startsWith(prefix + '/');
    }
    return allowed === normalizedType;
  });
}

// ==================== 导出 ====================

export const SecurityManager = {
  // CSP
  createCspPolicy,
  addCspSources,
  removeCspSources,
  generateCspHeader,
  getCspHeaderName,
  validateCspPolicy,
  CSP_TEMPLATES,
  
  // CORS
  createCorsConfig,
  addCorsOrigins,
  removeCorsOrigins,
  isCorsOriginAllowed,
  generateCorsHeaders,
  validateCorsConfig,
  CORS_TEMPLATES,
  
  // Rate Limiting
  createRateLimiter,
  createLayeredRateLimiter,
  generateRateLimitHeaders,
  validateRateLimitConfig,
  RATE_LIMIT_TEMPLATES,
  
  // Tools
  generateCspNonce,
  generateOAuthState,
  isOriginTrusted,
  sanitizeInput,
  isContentTypeAllowed,
};

export default SecurityManager;
