/**
 * JWT Authentication Middleware
 * 
 * 提供 JWT 令牌验证、刷新、权限检查功能
 * 支持 RS256/HS256 算法，可配置多密钥轮换
 * 
 * @author Axon
 * @version 1.0.0
 */

import * as crypto from 'crypto';

/**
 * JWT Header 类型
 */
export interface JWTHeader {
  alg: string;
  typ: string;
  kid?: string;
}

/**
 * JWT Payload 类型
 */
export interface JWTPayload {
  /** 主题 (用户 ID) */
  sub: string;
  /** 签发者 */
  iss?: string;
  /** 受众 */
  aud?: string | string[];
  /** 过期时间 (Unix 时间戳) */
  exp: number;
  /** 生效时间 (Unix 时间戳) */
  nbf?: number;
  /** 签发时间 (Unix 时间戳) */
  iat: number;
  /** JWT ID (唯一标识) */
  jti?: string;
  /** 自定义字段 */
  [key: string]: any;
}

/**
 * 权限定义
 */
export interface Permission {
  /** 资源标识 */
  resource: string;
  /** 操作类型 */
  actions: string[];
}

/**
 * 用户上下文 (验证通过后注入)
 */
export interface AuthContext {
  /** 用户 ID */
  userId: string;
  /** 用户角色 */
  role?: string;
  /** 用户权限 */
  permissions?: Permission[];
  /** JWT Payload 原始数据 */
  payload: JWTPayload;
}

/**
 * 密钥配置
 */
export interface KeyConfig {
  /** 密钥 ID (用于轮换) */
  kid: string;
  /** 密钥内容 (Base64 或 PEM) */
  key: string;
  /** 密钥类型 */
  type: 'HS256' | 'HS384' | 'HS512' | 'RS256' | 'RS384' | 'RS512';
  /** 是否为主密钥 (用于签名) */
  primary?: boolean;
}

/**
 * 认证中间件配置
 */
export interface AuthConfig {
  /** 密钥配置 (支持多密钥轮换) */
  keys: KeyConfig[];
  /** 签发者 */
  issuer?: string;
  /** 受众 */
  audience?: string | string[];
  /** 时钟容差 (毫秒，用于处理时钟漂移) */
  clockToleranceMs?: number;
  /** 是否忽略过期 (用于刷新令牌) */
  ignoreExpiration?: boolean;
  /** Token 所在 Header */
  tokenHeader?: string;
  /** Token 前缀 */
  tokenPrefix?: string;
  /** 是否启用权限检查 */
  enablePermissions?: boolean;
}

/**
 * Token 刷新结果
 */
export interface TokenRefreshResult {
  /** 是否成功 */
  success: boolean;
  /** 新 Token */
  token?: string;
  /** 过期时间 */
  expiresAt?: number;
  /** 错误信息 */
  error?: string;
}

/**
 * 权限检查结果
 */
export interface PermissionCheckResult {
  /** 是否通过 */
  allowed: boolean;
  /** 拒绝原因 */
  reason?: string;
}

/**
 * Base64URL 编码
 */
function base64UrlEncode(buffer: Buffer): string {
  return buffer.toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

/**
 * Base64URL 解码
 */
function base64UrlDecode(str: string): Buffer {
  const padding = '='.repeat((4 - (str.length % 4)) % 4);
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/') + padding;
  return Buffer.from(base64, 'base64');
}

/**
 * 创建 JWT 签名
 * 
 * @param payload JWT Payload
 * @param keyConfig 密钥配置
 * @param expiresIn 过期时间 (秒)
 * @returns JWT Token
 */
export function signJWT(
  payload: Partial<JWTPayload>,
  keyConfig: KeyConfig,
  expiresIn: number = 3600
): string {
  const now = Math.floor(Date.now() / 1000);
  
  const fullPayload: JWTPayload = {
    sub: payload.sub!,
    iss: payload.iss,
    aud: payload.aud,
    exp: now + expiresIn,
    nbf: payload.nbf,
    iat: now,
    jti: payload.jti || crypto.randomUUID(),
    ...payload,
  };

  const header: JWTHeader = {
    alg: keyConfig.type,
    typ: 'JWT',
    kid: keyConfig.kid,
  };

  const headerB64 = base64UrlEncode(Buffer.from(JSON.stringify(header)));
  const payloadB64 = base64UrlEncode(Buffer.from(JSON.stringify(fullPayload)));

  const signingInput = `${headerB64}.${payloadB64}`;
  
  let signature: string;
  
  if (keyConfig.type.startsWith('HS')) {
    // HMAC 签名
    const key = Buffer.from(keyConfig.key, 'base64');
    const hash = crypto.createHmac(keyConfig.type.toLowerCase(), key).update(signingInput);
    signature = base64UrlEncode(hash.digest());
  } else if (keyConfig.type.startsWith('RS')) {
    // RSA 签名
    const privateKey = keyConfig.key.includes('-----BEGIN') 
      ? keyConfig.key 
      : Buffer.from(keyConfig.key, 'base64').toString('utf-8');
    
    const sign = crypto.createSign(keyConfig.type);
    sign.update(signingInput);
    signature = base64UrlEncode(sign.sign(privateKey));
  } else {
    throw new Error(`Unsupported algorithm: ${keyConfig.type}`);
  }

  return `${signingInput}.${signature}`;
}

/**
 * 验证 JWT Token
 * 
 * @param token JWT Token
 * @param config 认证配置
 * @returns 验证后的 Payload
 */
export function verifyJWT(token: string, config: AuthConfig): JWTPayload {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new AuthError('INVALID_TOKEN', 'Invalid JWT format');
  }

  const [headerB64, payloadB64, signature] = parts;

  // 解码 Header
  let header: JWTHeader;
  try {
    header = JSON.parse(base64UrlDecode(headerB64).toString('utf-8'));
  } catch {
    throw new AuthError('INVALID_TOKEN', 'Invalid JWT header');
  }

  // 解码 Payload
  let payload: JWTPayload;
  try {
    payload = JSON.parse(base64UrlDecode(payloadB64).toString('utf-8'));
  } catch {
    throw new AuthError('INVALID_TOKEN', 'Invalid JWT payload');
  }

  // 验证签名
  const signingInput = `${headerB64}.${payloadB64}`;
  const keyConfig = config.keys.find(k => k.kid === header.kid) || config.keys.find(k => k.primary);
  
  if (!keyConfig) {
    throw new AuthError('INVALID_KEY', 'No valid key found for verification');
  }

  let validSignature = false;
  
  if (keyConfig.type.startsWith('HS')) {
    const key = Buffer.from(keyConfig.key, 'base64');
    const expectedSig = crypto.createHmac(keyConfig.type.toLowerCase(), key).update(signingInput).digest();
    const actualSig = base64UrlDecode(signature);
    validSignature = crypto.timingSafeEqual(expectedSig, actualSig);
  } else if (keyConfig.type.startsWith('RS')) {
    const publicKey = keyConfig.key.includes('-----BEGIN')
      ? keyConfig.key
      : Buffer.from(keyConfig.key, 'base64').toString('utf-8');
    
    const verify = crypto.createVerify(keyConfig.type);
    verify.update(signingInput);
    validSignature = verify.verify(publicKey, base64UrlDecode(signature));
  }

  if (!validSignature) {
    throw new AuthError('SIGNATURE_INVALID', 'JWT signature verification failed');
  }

  // 验证过期时间
  const now = Math.floor(Date.now() / 1000);
  const tolerance = (config.clockToleranceMs || 0) / 1000;

  if (!config.ignoreExpiration) {
    if (payload.exp && now > payload.exp + tolerance) {
      throw new AuthError('TOKEN_EXPIRED', 'Token has expired', payload.exp * 1000);
    }

    if (payload.nbf && now < payload.nbf - tolerance) {
      throw new AuthError('TOKEN_NOT_ACTIVE', 'Token is not yet active');
    }
  }

  // 验证签发者
  if (config.issuer && payload.iss !== config.issuer) {
    throw new AuthError('INVALID_ISSUER', `Expected issuer ${config.issuer}, got ${payload.iss}`);
  }

  // 验证受众
  if (config.audience) {
    const audiences = Array.isArray(config.audience) ? config.audience : [config.audience];
    const payloadAud = Array.isArray(payload.aud) ? payload.aud : [payload.aud].filter(Boolean);
    
    if (!payloadAud.some(aud => audiences.includes(aud))) {
      throw new AuthError('INVALID_AUDIENCE', 'Token audience does not match');
    }
  }

  return payload;
}

/**
 * 刷新 Token
 * 
 * @param currentToken 当前 Token
 * @param config 认证配置
 * @param newExpiresIn 新 Token 过期时间 (秒)
 * @returns 刷新结果
 */
export function refreshToken(
  currentToken: string,
  config: AuthConfig,
  newExpiresIn: number = 3600
): TokenRefreshResult {
  try {
    // 允许过期 token 用于刷新
    const payload = verifyJWT(currentToken, { ...config, ignoreExpiration: true });
    
    // 检查是否在刷新窗口内 (过期后 24 小时内可刷新)
    const now = Math.floor(Date.now() / 1000);
    const refreshWindow = 24 * 3600; // 24 小时
    
    if (payload.exp && now > payload.exp + refreshWindow) {
      return {
        success: false,
        error: 'Refresh window expired',
      };
    }

    // 创建新 Token
    const primarykey = config.keys.find(k => k.primary) || config.keys[0];
    
    if (!primarykey) {
      return {
        success: false,
        error: 'No primary key available for signing',
      };
    }

    // 保留原 payload 的关键信息，更新过期时间
    const newPayload: Partial<JWTPayload> = {
      sub: payload.sub,
      iss: payload.iss,
      aud: payload.aud,
      role: payload.role,
      permissions: payload.permissions,
    };

    const newToken = signJWT(newPayload, primarykey, newExpiresIn);

    return {
      success: true,
      token: newToken,
      expiresAt: Date.now() + newExpiresIn * 1000,
    };
  } catch (error) {
    if (error instanceof AuthError && error.code !== 'TOKEN_EXPIRED') {
      return {
        success: false,
        error: error.message,
      };
    }
    
    // 其他错误 (如签名无效)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Token refresh failed',
    };
  }
}

/**
 * 检查权限
 * 
 * @param context 用户上下文
 * @param resource 资源标识
 * @param action 操作类型
 * @returns 权限检查结果
 */
export function checkPermission(
  context: AuthContext,
  resource: string,
  action: string
): PermissionCheckResult {
  if (!context.permissions || context.permissions.length === 0) {
    return {
      allowed: false,
      reason: 'No permissions defined',
    };
  }

  // 检查超级管理员
  if (context.role === 'admin' || context.role === 'superadmin') {
    return { allowed: true };
  }

  // 查找匹配的权限
  const permission = context.permissions.find(p => {
    // 支持通配符匹配
    const resourceMatch = p.resource === resource || p.resource === '*';
    const actionMatch = p.actions.includes(action) || p.actions.includes('*');
    return resourceMatch && actionMatch;
  });

  if (permission) {
    return { allowed: true };
  }

  return {
    allowed: false,
    reason: `Permission denied: ${action} on ${resource}`,
  };
}

/**
 * 认证错误类
 */
export class AuthError extends Error {
  constructor(
    public code: string,
    message: string,
    public expiredAt?: number
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

/**
 * 创建 JWT 认证中间件
 * 
 * @param config 认证配置
 * @returns Express/Koa 风格的中间件函数
 */
export function createAuthMiddleware(config: AuthConfig) {
  return async (
    req: any,
    res: any,
    next: () => void
  ): Promise<void> => {
    try {
      // 从 Header 获取 Token
      const headerName = config.tokenHeader || 'authorization';
      const tokenPrefix = config.tokenPrefix || 'Bearer ';
      
      let authHeader = req.headers[headerName] || req.headers[headerName.toLowerCase()];
      
      if (!authHeader) {
        res.statusCode = 401;
        res.setHeader('WWW-Authenticate', 'Bearer');
        res.end(JSON.stringify({
          error: 'UNAUTHORIZED',
          message: 'Authentication required',
        }));
        return;
      }

      // 移除 Token 前缀
      let token = authHeader;
      if (token.startsWith(tokenPrefix)) {
        token = token.slice(tokenPrefix.length);
      }

      // 验证 Token
      const payload = verifyJWT(token, config);

      // 构建用户上下文
      const authContext: AuthContext = {
        userId: payload.sub,
        role: payload.role,
        permissions: payload.permissions,
        payload,
      };

      // 注入到请求对象
      req.user = authContext;
      req.authContext = authContext;

      next();
    } catch (error) {
      if (error instanceof AuthError) {
        res.statusCode = error.code === 'TOKEN_EXPIRED' ? 401 : 403;
        res.setHeader('WWW-Authenticate', 'Bearer');
        res.end(JSON.stringify({
          error: error.code,
          message: error.message,
          expiredAt: error.expiredAt,
        }));
      } else {
        res.statusCode = 500;
        res.end(JSON.stringify({
          error: 'INTERNAL_ERROR',
          message: 'Authentication service error',
        }));
      }
    }
  };
}

/**
 * 创建权限检查中间件
 * 
 * @param requiredPermissions 所需权限列表
 * @returns 中间件函数
 */
export function createPermissionMiddleware(requiredPermissions: Array<{ resource: string; action: string }>) {
  return async (
    req: any,
    res: any,
    next: () => void
  ): Promise<void> => {
    const context: AuthContext | undefined = req.user || req.authContext;

    if (!context) {
      res.statusCode = 401;
      res.end(JSON.stringify({
        error: 'UNAUTHORIZED',
        message: 'Authentication required before authorization',
      }));
      return;
    }

    // 检查所有必需的权限
    for (const perm of requiredPermissions) {
      const result = checkPermission(context, perm.resource, perm.action);
      
      if (!result.allowed) {
        res.statusCode = 403;
        res.end(JSON.stringify({
          error: 'FORBIDDEN',
          message: result.reason,
          required: perm,
        }));
        return;
      }
    }

    next();
  };
}

/**
 * 生成密钥对 (用于 RS256)
 */
export function generateRSAKeyPair() {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem',
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem',
    },
  });

  return { publicKey, privateKey };
}

/**
 * 生成 HMAC 密钥 (用于 HS256)
 */
export function generateHMACKey(length: number = 32): string {
  return crypto.randomBytes(length).toString('base64');
}

/**
 * 预定义配置模板
 */
export const presets = {
  /** 开发环境配置 (HS256) */
  development: (secret?: string): AuthConfig => ({
    keys: [
      {
        kid: 'dev-key-1',
        key: secret || generateHMACKey(),
        type: 'HS256',
        primary: true,
      },
    ],
    clockToleranceMs: 60000, // 1 分钟容差
  }),

  /** 生产环境配置 (RS256) */
  production: (publicKey: string, privateKey: string): AuthConfig => ({
    keys: [
      {
        kid: 'prod-key-1',
        key: privateKey,
        type: 'RS256',
        primary: true,
      },
      {
        kid: 'prod-key-1-pub',
        key: publicKey,
        type: 'RS256',
      },
    ],
    clockToleranceMs: 30000, // 30 秒容差
  }),

  /** 多密钥轮换配置 */
  rotation: (keys: KeyConfig[]): AuthConfig => ({
    keys,
    clockToleranceMs: 30000,
  }),
};

/**
 * 提取 Token (工具函数)
 */
export function extractToken(req: any, headerName = 'authorization', prefix = 'Bearer '): string | null {
  let authHeader = req.headers[headerName] || req.headers[headerName.toLowerCase()];
  
  if (!authHeader) {
    return null;
  }

  if (authHeader.startsWith(prefix)) {
    authHeader = authHeader.slice(prefix.length);
  }

  return authHeader;
}

export default createAuthMiddleware;
