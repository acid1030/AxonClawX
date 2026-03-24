/**
 * KAEL 专业认证提供器工具 (Auth Provider Pro)
 * 
 * 功能:
 * 1. 多认证方式 (JWT, OAuth2, API Key, Basic Auth)
 * 2. Token 管理 (生成/验证/刷新/撤销)
 * 3. 权限验证 (RBAC 角色权限控制)
 * 
 * @author KAEL
 * @version 1.0.0
 * @created 2026-03-13
 */

// ==================== 类型定义 ====================

/**
 * JWT Payload 结构
 */
export interface JWTPayload {
  userId: string;
  email?: string;
  roles?: string[];
  permissions?: string[];
  [key: string]: any;
}

/**
 * Token 信息
 */
export interface TokenInfo {
  token: string;
  expiresAt: number;
  tokenType: 'jwt' | 'access' | 'refresh';
}

/**
 * Token 验证结果
 */
export interface TokenValidationResult {
  valid: boolean;
  payload?: JWTPayload;
  error?: string;
  expired?: boolean;
}

/**
 * OAuth2 配置
 */
export interface OAuth2Config {
  clientId: string;
  clientSecret: string;
  authorizeUrl: string;
  tokenUrl: string;
  redirectUri: string;
  scope?: string[];
  pkce?: boolean;
}

/**
 * API Key 配置
 */
export interface APIKeyConfig {
  key: string;
  name: string;
  permissions?: string[];
  expiresAt?: number;
  metadata?: Record<string, any>;
}

/**
 * 基本认证凭据
 */
export interface BasicAuthCredentials {
  username: string;
  password: string;
}

/**
 * 权限定义
 */
export interface Permission {
  resource: string;
  actions: string[]; // ['read', 'write', 'delete', etc.]
}

/**
 * 角色定义
 */
export interface Role {
  name: string;
  permissions: Permission[];
  inherits?: string[]; // 继承的其他角色
}

/**
 * 权限验证结果
 */
export interface PermissionCheckResult {
  allowed: boolean;
  reason?: string;
  missingPermissions?: string[];
}

/**
 * 认证提供器配置
 */
export interface AuthProviderConfig {
  jwtSecret: string;
  jwtExpiresIn?: number;        // JWT 过期时间 (秒)
  refreshTokenExpiresIn?: number; // 刷新 Token 过期时间 (秒)
  apiKeyHeader?: string;        // API Key 请求头名称
  basicAuthRealm?: string;      // Basic Auth 领域
  roles?: Role[];               // 角色定义
}

/**
 * 认证提供器接口
 */
export interface AuthProvider {
  // JWT 相关
  generateJWT(payload: JWTPayload, expiresIn?: number): string;
  verifyJWT(token: string): TokenValidationResult;
  refreshJWT(token: string, expiresIn?: number): TokenInfo | null;
  revokeJWT(token: string): boolean;
  
  // OAuth2 相关
  generateOAuth2AuthorizeUrl(config: OAuth2Config, state: string): string;
  exchangeOAuth2Code(config: OAuth2Config, code: string, state: string): Promise<TokenInfo>;
  validateOAuth2State(provided: string, stored: string): boolean;
  
  // API Key 相关
  generateAPIKey(config: { name: string; permissions?: string[]; expiresDays?: number }): APIKeyConfig;
  validateAPIKey(key: string, storedKey: APIKeyConfig): boolean;
  checkAPIKeyPermissions(key: APIKeyConfig, resource: string, action: string): PermissionCheckResult;
  
  // Basic Auth 相关
  encodeBasicAuth(credentials: BasicAuthCredentials): string;
  decodeBasicAuth(authHeader: string): BasicAuthCredentials | null;
  validateBasicAuth(authHeader: string, credentials: BasicAuthCredentials): boolean;
  
  // 权限验证
  checkPermission(roles: string[], resource: string, action: string): PermissionCheckResult;
  hasRole(userRoles: string[], requiredRole: string): boolean;
  hasPermission(userRoles: string[], resource: string, action: string): boolean;
  
  // 工具方法
  generateState(): string;
  generateCodeVerifier(): string;
  generateCodeChallenge(verifier: string): Promise<string>;
  hashPassword(password: string, salt?: string): Promise<{ hash: string; salt: string }>;
  verifyPassword(password: string, hash: string, salt: string): Promise<boolean>;
}

// ==================== 工具函数 ====================

/**
 * Base64 URL 编码
 */
function base64UrlEncode(data: string): string {
  return Buffer.from(data)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Base64 URL 解码
 */
function base64UrlDecode(data: string): string {
  const padded = data.replace(/-/g, '+').replace(/_/g, '/');
  const pad = padded.length % 4;
  const paddedData = pad ? padded + '='.repeat(pad) : padded;
  return Buffer.from(paddedData, 'base64').toString('utf-8');
}

/**
 * 生成随机字符串
 */
function generateRandomString(length: number = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  let result = '';
  const randomValues = new Uint8Array(length);
  crypto.getRandomValues(randomValues);
  for (let i = 0; i < length; i++) {
    result += chars[randomValues[i] % chars.length];
  }
  return result;
}

/**
 * SHA256 哈希
 */
async function sha256(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(data));
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * HMAC-SHA256
 */
async function hmacSha256(key: string, data: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyBuffer = encoder.encode(key);
  const dataBuffer = encoder.encode(data);
  
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyBuffer,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, dataBuffer);
  const hashArray = Array.from(new Uint8Array(signature));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// ==================== 认证提供器实现 ====================

class AuthProviderPro implements AuthProvider {
  private config: AuthProviderConfig;
  private revokedTokens: Set<string> = new Set();
  private roleMap: Map<string, Role> = new Map();

  constructor(config: AuthProviderConfig) {
    this.config = {
      jwtSecret: config.jwtSecret,
      jwtExpiresIn: config.jwtExpiresIn || 3600,
      refreshTokenExpiresIn: config.refreshTokenExpiresIn || 604800,
      apiKeyHeader: config.apiKeyHeader || 'X-API-Key',
      basicAuthRealm: config.basicAuthRealm || 'Secure',
      roles: config.roles || []
    };

    // 初始化角色映射
    if (this.config.roles) {
      this.config.roles.forEach(role => {
        this.roleMap.set(role.name, role);
      });
    }
  }

  // ==================== JWT 相关 ====================

  /**
   * 生成 JWT Token
   */
  generateJWT(payload: JWTPayload, expiresIn?: number): string {
    const header = {
      alg: 'HS256',
      typ: 'JWT'
    };

    const now = Math.floor(Date.now() / 1000);
    const jwtPayload = {
      ...payload,
      iat: now,
      exp: now + (expiresIn || this.config.jwtExpiresIn!)
    };

    const headerEncoded = base64UrlEncode(JSON.stringify(header));
    const payloadEncoded = base64UrlEncode(JSON.stringify(jwtPayload));
    const signatureInput = `${headerEncoded}.${payloadEncoded}`;
    
    // 使用 HMAC-SHA256 生成签名
    const signature = this._hmacSha256Sync(this.config.jwtSecret, signatureInput);
    
    return `${signatureInput}.${signature}`;
  }

  /**
   * 验证 JWT Token
   */
  verifyJWT(token: string): TokenValidationResult {
    try {
      // 检查是否被撤销
      if (this.revokedTokens.has(token)) {
        return { valid: false, error: 'Token has been revoked' };
      }

      const parts = token.split('.');
      if (parts.length !== 3) {
        return { valid: false, error: 'Invalid token format' };
      }

      const [headerEncoded, payloadEncoded, signature] = parts;
      
      // 验证签名
      const signatureInput = `${headerEncoded}.${payloadEncoded}`;
      const expectedSignature = this._hmacSha256Sync(this.config.jwtSecret, signatureInput);
      
      if (signature !== expectedSignature) {
        return { valid: false, error: 'Invalid signature' };
      }

      // 解析 payload
      const payload: JWTPayload & { iat?: number; exp?: number } = JSON.parse(base64UrlDecode(payloadEncoded));
      
      // 检查过期时间
      if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
        return { valid: false, error: 'Token expired', expired: true };
      }

      return { valid: true, payload };
    } catch (error) {
      return { 
        valid: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * 刷新 JWT Token
   */
  refreshJWT(token: string, expiresIn?: number): TokenInfo | null {
    const result = this.verifyJWT(token);
    
    if (!result.valid || !result.payload) {
      return null;
    }

    // 生成新 token
    const { iat, exp, ...payloadWithoutTime } = result.payload;
    const newToken = this.generateJWT(payloadWithoutTime, expiresIn);
    
    // 撤销旧 token
    this.revokeJWT(token);

    return {
      token: newToken,
      expiresAt: Date.now() + (expiresIn || this.config.jwtExpiresIn!) * 1000,
      tokenType: 'jwt'
    };
  }

  /**
   * 撤销 JWT Token
   */
  revokeJWT(token: string): boolean {
    this.revokedTokens.add(token);
    return true;
  }

  // ==================== OAuth2 相关 ====================

  /**
   * 生成 OAuth2 授权 URL
   */
  generateOAuth2AuthorizeUrl(config: OAuth2Config, state: string): string {
    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      response_type: 'code',
      state: state
    });

    if (config.scope && config.scope.length > 0) {
      params.append('scope', config.scope.join(' '));
    }

    if (config.pkce) {
      const codeVerifier = this.generateCodeVerifier();
      const codeChallenge = this._generateCodeChallengeSync(codeVerifier);
      params.append('code_challenge', codeChallenge);
      params.append('code_challenge_method', 'S256');
    }

    return `${config.authorizeUrl}?${params.toString()}`;
  }

  /**
   * 交换 OAuth2 授权码
   */
  async exchangeOAuth2Code(config: OAuth2Config, code: string, state: string): Promise<TokenInfo> {
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: config.redirectUri,
      client_id: config.clientId,
      client_secret: config.clientSecret
    });

    const response = await fetch(config.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: params.toString()
    });

    if (!response.ok) {
      throw new Error(`OAuth2 token exchange failed: ${response.statusText}`);
    }

    const data = await response.json();
    
    return {
      token: data.access_token,
      expiresAt: Date.now() + (data.expires_in || 3600) * 1000,
      tokenType: 'access'
    };
  }

  /**
   * 验证 OAuth2 State
   */
  validateOAuth2State(provided: string, stored: string): boolean {
    return provided === stored;
  }

  // ==================== API Key 相关 ====================

  /**
   * 生成 API Key
   */
  generateAPIKey(config: { name: string; permissions?: string[]; expiresDays?: number }): APIKeyConfig {
    const key = `ak_${generateRandomString(32)}`;
    const expiresAt = config.expiresDays 
      ? Date.now() + config.expiresDays * 24 * 60 * 60 * 1000 
      : undefined;

    return {
      key,
      name: config.name,
      permissions: config.permissions || [],
      expiresAt,
      metadata: {
        createdAt: Date.now()
      }
    };
  }

  /**
   * 验证 API Key
   */
  validateAPIKey(key: string, storedKey: APIKeyConfig): boolean {
    if (key !== storedKey.key) {
      return false;
    }

    if (storedKey.expiresAt && Date.now() > storedKey.expiresAt) {
      return false;
    }

    return true;
  }

  /**
   * 检查 API Key 权限
   */
  checkAPIKeyPermissions(key: APIKeyConfig, resource: string, action: string): PermissionCheckResult {
    if (!key.permissions || key.permissions.length === 0) {
      return { allowed: false, reason: 'No permissions assigned' };
    }

    const permissionString = `${resource}:${action}`;
    const hasPermission = key.permissions.some(p => {
      if (p === '*') return true;
      if (p === `${resource}:*`) return true;
      return p === permissionString;
    });

    if (!hasPermission) {
      return {
        allowed: false,
        reason: 'Insufficient permissions',
        missingPermissions: [permissionString]
      };
    }

    return { allowed: true };
  }

  // ==================== Basic Auth 相关 ====================

  /**
   * 编码 Basic Auth 头
   */
  encodeBasicAuth(credentials: BasicAuthCredentials): string {
    const authString = `${credentials.username}:${credentials.password}`;
    return `Basic ${Buffer.from(authString).toString('base64')}`;
  }

  /**
   * 解码 Basic Auth 头
   */
  decodeBasicAuth(authHeader: string): BasicAuthCredentials | null {
    if (!authHeader.startsWith('Basic ')) {
      return null;
    }

    try {
      const authString = Buffer.from(authHeader.slice(6), 'base64').toString('utf-8');
      const [username, ...passwordParts] = authString.split(':');
      const password = passwordParts.join(':');
      
      return { username, password };
    } catch {
      return null;
    }
  }

  /**
   * 验证 Basic Auth
   */
  validateBasicAuth(authHeader: string, credentials: BasicAuthCredentials): boolean {
    const decoded = this.decodeBasicAuth(authHeader);
    
    if (!decoded) {
      return false;
    }

    return decoded.username === credentials.username && 
           decoded.password === credentials.password;
  }

  // ==================== 权限验证 ====================

  /**
   * 检查权限
   */
  checkPermission(roles: string[], resource: string, action: string): PermissionCheckResult {
    const missingPermissions: string[] = [];
    
    for (const roleName of roles) {
      const role = this.roleMap.get(roleName);
      if (!role) continue;

      // 检查角色权限
      for (const permission of role.permissions) {
        if (permission.resource === resource && permission.actions.includes(action)) {
          return { allowed: true };
        }
        
        // 检查通配符
        if (permission.resource === resource && permission.actions.includes('*')) {
          return { allowed: true };
        }
        
        if (permission.resource === '*' && permission.actions.includes(action)) {
          return { allowed: true };
        }
      }

      // 检查继承的角色
      if (role.inherits) {
        const inheritedResult = this.checkPermission(role.inherits, resource, action);
        if (inheritedResult.allowed) {
          return { allowed: true };
        }
      }
    }

    return {
      allowed: false,
      reason: 'Permission denied',
      missingPermissions: [`${resource}:${action}`]
    };
  }

  /**
   * 检查角色
   */
  hasRole(userRoles: string[], requiredRole: string): boolean {
    if (userRoles.includes(requiredRole)) {
      return true;
    }

    // 检查继承
    for (const roleName of userRoles) {
      const role = this.roleMap.get(roleName);
      if (role?.inherits?.includes(requiredRole)) {
        return true;
      }
    }

    return false;
  }

  /**
   * 检查权限 (简化版)
   */
  hasPermission(userRoles: string[], resource: string, action: string): boolean {
    const result = this.checkPermission(userRoles, resource, action);
    return result.allowed;
  }

  // ==================== 工具方法 ====================

  /**
   * 生成 OAuth2 State
   */
  generateState(): string {
    return generateRandomString(32);
  }

  /**
   * 生成 Code Verifier (PKCE)
   */
  generateCodeVerifier(): string {
    return generateRandomString(64);
  }

  /**
   * 生成 Code Challenge (PKCE)
   */
  async generateCodeChallenge(verifier: string): Promise<string> {
    const hash = await sha256(verifier);
    return base64UrlEncode(Buffer.from(hash, 'hex').toString('binary'));
  }

  /**
   * 哈希密码
   */
  async hashPassword(password: string, salt?: string): Promise<{ hash: string; salt: string }> {
    const actualSalt = salt || generateRandomString(16);
    const hash = await sha256(`${password}${actualSalt}`);
    return { hash, salt: actualSalt };
  }

  /**
   * 验证密码
   */
  async verifyPassword(password: string, hash: string, salt: string): Promise<boolean> {
    const result = await this.hashPassword(password, salt);
    return result.hash === hash;
  }

  // ==================== 私有辅助方法 ====================

  /**
   * 同步 HMAC-SHA256 (用于 JWT 签名)
   */
  private _hmacSha256Sync(key: string, data: string): string {
    const crypto = require('crypto');
    return crypto.createHmac('sha256', key).update(data).digest('hex');
  }

  /**
   * 同步生成 Code Challenge
   */
  private _generateCodeChallengeSync(verifier: string): string {
    const crypto = require('crypto');
    const hash = crypto.createHash('sha256').update(verifier).digest('hex');
    return base64UrlEncode(Buffer.from(hash, 'hex').toString('binary'));
  }
}

// ==================== 工厂函数 ====================

/**
 * 创建认证提供器实例
 */
export function createAuthProvider(config: AuthProviderConfig): AuthProvider {
  return new AuthProviderPro(config);
}

/**
 * 预定义角色模板
 */
export const defaultRoles: Role[] = [
  {
    name: 'admin',
    permissions: [
      { resource: '*', actions: ['*'] }
    ]
  },
  {
    name: 'user',
    permissions: [
      { resource: 'profile', actions: ['read', 'write'] },
      { resource: 'posts', actions: ['read', 'write', 'delete'] }
    ]
  },
  {
    name: 'guest',
    permissions: [
      { resource: 'posts', actions: ['read'] },
      { resource: 'public', actions: ['read'] }
    ]
  },
  {
    name: 'moderator',
    permissions: [
      { resource: 'posts', actions: ['read', 'write', 'delete'] },
      { resource: 'comments', actions: ['read', 'write', 'delete'] }
    ],
    inherits: ['user']
  }
];

// ==================== 快速使用函数 (无需实例化) ====================

/**
 * 快速生成 JWT (使用默认配置)
 */
export function generateJWT(
  payload: JWTPayload, 
  secret: string = 'default-secret-key',
  expiresIn: number = 3600
): string {
  const provider = createAuthProvider({ jwtSecret: secret, jwtExpiresIn: expiresIn });
  return provider.generateJWT(payload, expiresIn);
}

/**
 * 快速验证 JWT
 */
export function verifyJWT(token: string, secret: string = 'default-secret-key'): TokenValidationResult {
  const provider = createAuthProvider({ jwtSecret: secret });
  return provider.verifyJWT(token);
}

/**
 * 快速生成 OAuth2 授权 URL
 */
export function generateOAuth2AuthorizeUrl(
  config: OAuth2Config,
  state?: string
): string {
  const provider = createAuthProvider({ jwtSecret: 'temp' });
  const actualState = state || provider.generateState();
  return provider.generateOAuth2AuthorizeUrl(config, actualState);
}

/**
 * 快速生成 API Key
 */
export function generateAPIKey(
  name: string,
  permissions?: string[],
  expiresDays?: number
): APIKeyConfig {
  const provider = createAuthProvider({ jwtSecret: 'temp' });
  return provider.generateAPIKey({ name, permissions, expiresDays });
}

/**
 * 快速哈希密码
 */
export async function hashPassword(password: string): Promise<{ hash: string; salt: string }> {
  const provider = createAuthProvider({ jwtSecret: 'temp' });
  return provider.hashPassword(password);
}

/**
 * 快速验证密码
 */
export async function verifyPassword(
  password: string,
  hash: string,
  salt: string
): Promise<boolean> {
  const provider = createAuthProvider({ jwtSecret: 'temp' });
  return provider.verifyPassword(password, hash, salt);
}

/**
 * 快速检查权限
 */
export function checkPermission(
  roles: string[],
  resource: string,
  action: string,
  customRoles?: Role[]
): PermissionCheckResult {
  const provider = createAuthProvider({ 
    jwtSecret: 'temp',
    roles: customRoles || defaultRoles
  });
  return provider.checkPermission(roles, resource, action);
}

// ==================== 使用示例 (运行时执行) ====================

if (require.main === module) {
  console.log('🔐 KAEL Auth Provider Pro - 使用示例\n');

  // 1. JWT 示例
  console.log('=== 1. JWT 认证 ===');
  const secret = 'my-super-secret-key-12345';
  const token = generateJWT(
    { userId: 'user-123', email: 'user@example.com', roles: ['admin'] },
    secret,
    3600
  );
  console.log('生成的 Token:', token);
  
  const result = verifyJWT(token, secret);
  console.log('验证结果:', result);

  // 2. API Key 示例
  console.log('\n=== 2. API Key 认证 ===');
  const apiKey = generateAPIKey('My App Key', ['posts:read', 'posts:write'], 30);
  console.log('API Key:', apiKey.key);
  console.log('权限:', apiKey.permissions);
  console.log('过期时间:', new Date(apiKey.expiresAt!).toLocaleString());

  // 3. 权限验证示例
  console.log('\n=== 3. 权限验证 ===');
  const permResult1 = checkPermission(['admin'], 'users', 'delete');
  console.log('Admin 删除 users:', permResult1);
  
  const permResult2 = checkPermission(['guest'], 'posts', 'write');
  console.log('Guest 写入 posts:', permResult2);

  // 4. 密码哈希示例
  console.log('\n=== 4. 密码哈希 ===');
  hashPassword('SecurePassword123').then(({ hash, salt }) => {
    console.log('密码哈希:', hash);
    console.log('盐值:', salt);
    
    verifyPassword('SecurePassword123', hash, salt).then(valid => {
      console.log('密码验证:', valid);
    });
  });

  console.log('\n✅ 示例执行完成!');
}
