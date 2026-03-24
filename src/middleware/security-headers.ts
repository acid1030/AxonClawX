/**
 * HTTP 安全头中间件 - Security Headers Middleware
 * 
 * @author Axon
 * @version 1.0.0
 * 
 * 功能:
 * 1. Content-Security-Policy (CSP) - 防止 XSS 攻击
 * 2. X-Frame-Options - 防止点击劫持
 * 3. X-Content-Type-Options - 防止 MIME 类型嗅探
 * 4. Strict-Transport-Security (HSTS) - 强制 HTTPS
 */

import { Request, Response, NextFunction } from 'express';

// ============ 类型定义 ============

export interface CSPConfig {
  /** 默认来源 */
  defaultSrc?: string[];
  /** 脚本来源 */
  scriptSrc?: string[];
  /** 样式来源 */
  styleSrc?: string[];
  /** 图片来源 */
  imgSrc?: string[];
  /** 字体来源 */
  fontSrc?: string[];
  /** 连接来源 */
  connectSrc?: string[];
  /** 媒体来源 */
  mediaSrc?: string[];
  /** 对象来源 */
  objectSrc?: string[];
  /** 基础 URI */
  baseUri?: string[];
  /** 表单动作 */
  formAction?: string[];
  /** 框架来源 */
  frameSrc?: string[];
  /** 升级不安全请求 */
  upgradeInsecureRequests?: boolean;
  /** 阻止混合内容 */
  blockAllMixedContent?: boolean;
  /** 报告 URI */
  reportUri?: string;
}

export interface SecurityHeadersConfig {
  /** Content-Security-Policy 配置 */
  contentSecurityPolicy?: CSPConfig | false;
  /** X-Frame-Options 配置 */
  xFrameOptions?: 'DENY' | 'SAMEORIGIN' | { allowFrom: string } | false;
  /** X-Content-Type-Options 配置 */
  xContentTypeOptions?: boolean;
  /** Strict-Transport-Security 配置 */
  strictTransportSecurity?: HSTSConfig | false;
  /** X-XSS-Protection (已废弃，但部分浏览器仍支持) */
  xXSSProtection?: boolean;
  /** Referrer-Policy */
  referrerPolicy?: ReferrerPolicy;
  /** Permissions-Policy */
  permissionsPolicy?: PermissionsPolicyConfig;
}

export interface HSTSConfig {
  /** max-age 值 (秒) */
  maxAge?: number;
  /** 是否包含子域名 */
  includeSubDomains?: boolean;
  /** 是否允许预加载 */
  preload?: boolean;
}

export type ReferrerPolicy = 
  | 'no-referrer'
  | 'no-referrer-when-downgrade'
  | 'origin'
  | 'origin-when-cross-origin'
  | 'same-origin'
  | 'strict-origin'
  | 'strict-origin-when-cross-origin'
  | 'unsafe-url';

export interface PermissionsPolicyConfig {
  /** 摄像头权限 */
  camera?: string[];
  /** 麦克风权限 */
  microphone?: string[];
  /** 地理位置权限 */
  geolocation?: string[];
  /** 支付权限 */
  payment?: string[];
  /** USB 权限 */
  usb?: string[];
  /** 全屏权限 */
  fullscreen?: string[];
  /** 剪贴板权限 */
  clipboardWrite?: string[];
}

// ============ 默认配置 ============

const DEFAULT_CSP: CSPConfig = {
  defaultSrc: ["'self'"],
  scriptSrc: ["'self'"],
  styleSrc: ["'self'", "'unsafe-inline'"],
  imgSrc: ["'self'", 'data:', 'https:'],
  fontSrc: ["'self'", 'https:', 'data:'],
  connectSrc: ["'self'"],
  objectSrc: ["'none'"],
  baseUri: ["'self'"],
  formAction: ["'self'"],
  upgradeInsecureRequests: true,
};

const DEFAULT_HSTS: HSTSConfig = {
  maxAge: 31536000, // 1 年
  includeSubDomains: true,
  preload: true,
};

const DEFAULT_CONFIG: Required<SecurityHeadersConfig> = {
  contentSecurityPolicy: DEFAULT_CSP,
  xFrameOptions: 'DENY',
  xContentTypeOptions: true,
  strictTransportSecurity: DEFAULT_HSTS,
  xXSSProtection: false,
  referrerPolicy: 'strict-origin-when-cross-origin',
  permissionsPolicy: {},
};

// ============ 辅助函数 ============

/**
 * 构建 CSP 字符串
 */
function buildCSPString(config: CSPConfig): string {
  const directives: string[] = [];

  if (config.defaultSrc) {
    directives.push(`default-src ${config.defaultSrc.join(' ')}`);
  }
  if (config.scriptSrc) {
    directives.push(`script-src ${config.scriptSrc.join(' ')}`);
  }
  if (config.styleSrc) {
    directives.push(`style-src ${config.styleSrc.join(' ')}`);
  }
  if (config.imgSrc) {
    directives.push(`img-src ${config.imgSrc.join(' ')}`);
  }
  if (config.fontSrc) {
    directives.push(`font-src ${config.fontSrc.join(' ')}`);
  }
  if (config.connectSrc) {
    directives.push(`connect-src ${config.connectSrc.join(' ')}`);
  }
  if (config.mediaSrc) {
    directives.push(`media-src ${config.mediaSrc.join(' ')}`);
  }
  if (config.objectSrc) {
    directives.push(`object-src ${config.objectSrc.join(' ')}`);
  }
  if (config.baseUri) {
    directives.push(`base-uri ${config.baseUri.join(' ')}`);
  }
  if (config.formAction) {
    directives.push(`form-action ${config.formAction.join(' ')}`);
  }
  if (config.frameSrc) {
    directives.push(`frame-src ${config.frameSrc.join(' ')}`);
  }
  if (config.upgradeInsecureRequests) {
    directives.push('upgrade-insecure-requests');
  }
  if (config.blockAllMixedContent) {
    directives.push('block-all-mixed-content');
  }
  if (config.reportUri) {
    directives.push(`report-uri ${config.reportUri}`);
  }

  return directives.join('; ');
}

/**
 * 构建 X-Frame-Options 值
 */
function buildXFrameOptions(config: SecurityHeadersConfig['xFrameOptions']): string {
  if (!config || config === false) {
    return '';
  }
  
  if (typeof config === 'string') {
    return config;
  }
  
  if ('allowFrom' in config) {
    return `ALLOW-FROM ${config.allowFrom}`;
  }
  
  return 'DENY';
}

/**
 * 构建 HSTS 字符串
 */
function buildHSTSString(config: HSTSConfig): string {
  const parts: string[] = [`max-age=${config.maxAge}`];
  
  if (config.includeSubDomains) {
    parts.push('includeSubDomains');
  }
  
  if (config.preload) {
    parts.push('preload');
  }
  
  return parts.join('; ');
}

/**
 * 构建 Permissions-Policy 字符串
 */
function buildPermissionsPolicy(config: PermissionsPolicyConfig): string {
  const directives: string[] = [];
  
  const mapping: Record<keyof PermissionsPolicyConfig, string> = {
    camera: 'camera',
    microphone: 'microphone',
    geolocation: 'geolocation',
    payment: 'payment',
    usb: 'usb',
    fullscreen: 'fullscreen',
    clipboardWrite: 'clipboard-write',
  };
  
  (Object.keys(config) as Array<keyof PermissionsPolicyConfig>).forEach(key => {
    const policyName = mapping[key];
    const allowList = config[key];
    if (allowList && allowList.length > 0) {
      directives.push(`${policyName}=(${allowList.join(' ')})`);
    } else {
      directives.push(`${policyName}=()`);
    }
  });
  
  return directives.join(', ');
}

// ============ 中间件工厂 ============

/**
 * 创建安全头中间件
 * 
 * @param config 配置选项
 * @returns Express 中间件函数
 * 
 * @example
 * ```typescript
 * import { securityHeaders } from './middleware/security-headers';
 * 
 * // 使用默认配置
 * app.use(securityHeaders());
 * 
 * // 自定义配置
 * app.use(securityHeaders({
 *   xFrameOptions: 'SAMEORIGIN',
 *   contentSecurityPolicy: {
 *     defaultSrc: ["'self'"],
 *     scriptSrc: ["'self'", 'https://cdn.example.com'],
 *   },
 *   strictTransportSecurity: {
 *     maxAge: 31536000,
 *     includeSubDomains: true,
 *   }
 * }));
 * ```
 */
export function securityHeaders(config: SecurityHeadersConfig = {}) {
  const mergedConfig: Required<SecurityHeadersConfig> = {
    ...DEFAULT_CONFIG,
    ...config,
  };

  return (req: Request, res: Response, next: NextFunction) => {
    // 1. Content-Security-Policy
    if (mergedConfig.contentSecurityPolicy !== false) {
      const cspString = buildCSPString(mergedConfig.contentSecurityPolicy || DEFAULT_CSP);
      res.setHeader('Content-Security-Policy', cspString);
    }

    // 2. X-Frame-Options
    if (mergedConfig.xFrameOptions !== false) {
      const xFrameValue = buildXFrameOptions(mergedConfig.xFrameOptions);
      if (xFrameValue) {
        res.setHeader('X-Frame-Options', xFrameValue);
      }
    }

    // 3. X-Content-Type-Options
    if (mergedConfig.xContentTypeOptions) {
      res.setHeader('X-Content-Type-Options', 'nosniff');
    }

    // 4. Strict-Transport-Security (仅对 HTTPS 请求设置)
    if (mergedConfig.strictTransportSecurity !== false) {
      const isHTTPS = req.secure || req.headers['x-forwarded-proto'] === 'https';
      if (isHTTPS) {
        const hstsString = buildHSTSString(mergedConfig.strictTransportSecurity || DEFAULT_HSTS);
        res.setHeader('Strict-Transport-Security', hstsString);
      }
    }

    // 5. X-XSS-Protection (可选，已废弃)
    if (mergedConfig.xXSSProtection) {
      res.setHeader('X-XSS-Protection', '1; mode=block');
    }

    // 6. Referrer-Policy
    if (mergedConfig.referrerPolicy) {
      res.setHeader('Referrer-Policy', mergedConfig.referrerPolicy);
    }

    // 7. Permissions-Policy (可选)
    if (mergedConfig.permissionsPolicy && Object.keys(mergedConfig.permissionsPolicy).length > 0) {
      const permissionsPolicyString = buildPermissionsPolicy(mergedConfig.permissionsPolicy);
      if (permissionsPolicyString) {
        res.setHeader('Permissions-Policy', permissionsPolicyString);
      }
    }

    next();
  };
}

// ============ 预设配置 ============

/**
 * 严格安全配置 - 适用于高安全需求场景
 */
export const strictSecurityConfig: SecurityHeadersConfig = {
  contentSecurityPolicy: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'"],
    styleSrc: ["'self'"],
    imgSrc: ["'self'"],
    fontSrc: ["'self'"],
    connectSrc: ["'self'"],
    objectSrc: ["'none'"],
    baseUri: ["'none'"],
    formAction: ["'self'"],
    upgradeInsecureRequests: true,
    blockAllMixedContent: true,
  },
  xFrameOptions: 'DENY',
  xContentTypeOptions: true,
  strictTransportSecurity: {
    maxAge: 63072000, // 2 年
    includeSubDomains: true,
    preload: true,
  },
  referrerPolicy: 'no-referrer',
  permissionsPolicy: {
    camera: [],
    microphone: [],
    geolocation: [],
    payment: [],
    usb: [],
  },
};

/**
 * 宽松安全配置 - 适用于开发环境或需要嵌入第三方资源的场景
 */
export const relaxedSecurityConfig: SecurityHeadersConfig = {
  contentSecurityPolicy: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
    styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
    imgSrc: ["'self'", 'data:', 'https:', 'http:'],
    fontSrc: ["'self'", 'https:', 'data:'],
    connectSrc: ["'self'", 'https://api.example.com'],
    objectSrc: ["'none'"],
    baseUri: ["'self'"],
    formAction: ["'self'"],
  },
  xFrameOptions: 'SAMEORIGIN',
  xContentTypeOptions: true,
  strictTransportSecurity: {
    maxAge: 31536000,
    includeSubDomains: false,
    preload: false,
  },
  referrerPolicy: 'strict-origin-when-cross-origin',
};

/**
 * API 专用配置 - 适用于纯 API 服务
 */
export const apiSecurityConfig: SecurityHeadersConfig = {
  contentSecurityPolicy: false, // API 不需要 CSP
  xFrameOptions: 'DENY',
  xContentTypeOptions: true,
  strictTransportSecurity: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  referrerPolicy: 'no-referrer',
  permissionsPolicy: {
    camera: [],
    microphone: [],
    geolocation: [],
  },
};

// ============ 导出 ============

export default securityHeaders;
