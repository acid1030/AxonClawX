/**
 * 身份认证提供工具 - ACE
 * 
 * 提供完整的身份认证功能：
 * 1. JWT 生成/验证
 * 2. OAuth2 流程
 * 3. 会话管理
 * 
 * @author Axon
 * @version 1.0.0
 */

import * as crypto from 'crypto';

// ============================================
// 类型定义
// ============================================

/**
 * JWT Payload 接口
 */
export interface JWTPayload {
  userId: string;
  email?: string;
  roles?: string[];
  permissions?: string[];
  [key: string]: any;
}

/**
 * JWT Header 接口
 */
export interface JWTHeader {
  alg: string;
  typ: string;
}

/**
 * OAuth2 配置接口
 */
export interface OAuth2Config {
  clientId: string;
  clientSecret: string;
  authorizeUrl: string;
  tokenUrl: string;
  redirectUri: string;
  scopes?: string[];
}

/**
 * OAuth2 Token 响应接口
 */
export interface OAuth2TokenResponse {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
  tokenType: string;
  scope?: string;
}

/**
 * 会话数据接口
 */
export interface SessionData {
  sessionId: string;
  userId: string;
  createdAt: number;
  expiresAt: number;
  lastActiveAt: number;
  data: Record<string, any>;
}

/**
 * 会话存储接口
 */
export interface SessionStore {
  get(sessionId: string): Promise<SessionData | null>;
  set(sessionId: string, data: SessionData): Promise<void>;
  delete(sessionId: string): Promise<void>;
  clean(): Promise<void>;
}

// ============================================
// JWT 工具函数
// ============================================

/**
 * Base64URL 编码
 * 将数据转换为 Base64URL 格式 (URL 安全的 Base64)
 * 
 * @param data - 需要编码的数据
 * @returns Base64URL 编码的字符串
 */
function base64UrlEncode(data: string | Buffer): string {
  const base64 = typeof data === 'string' 
    ? Buffer.from(data).toString('base64')
    : data.toString('base64');
  
  return base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Base64URL 解码
 * 将 Base64URL 格式解码为原始数据
 * 
 * @param data - Base64URL 编码的字符串
 * @returns 解码后的字符串
 */
function base64UrlDecode(data: string): string {
  let base64 = data
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  
  // 填充 '='
  while (base64.length % 4) {
    base64 += '=';
  }
  
  return Buffer.from(base64, 'base64').toString('utf-8');
}

/**
 * 生成 JWT Token
 * 使用 HS256 算法签名
 * 
 * @param payload - JWT 负载数据
 * @param secret - 签名密钥
 * @param expiresIn - 过期时间 (秒)，默认 3600 秒 (1 小时)
 * @returns JWT Token 字符串
 * 
 * @example
 * const token = generateJWT(
 *   { userId: '123', email: 'user@example.com', roles: ['admin'] },
 *   'my-secret-key',
 *   3600
 * );
 */
export function generateJWT(
  payload: JWTPayload,
  secret: string,
  expiresIn: number = 3600
): string {
  const header: JWTHeader = {
    alg: 'HS256',
    typ: 'JWT'
  };

  const now = Math.floor(Date.now() / 1000);
  const fullPayload = {
    ...payload,
    iat: now,
    exp: now + expiresIn
  };

  const headerEncoded = base64UrlEncode(JSON.stringify(header));
  const payloadEncoded = base64UrlEncode(JSON.stringify(fullPayload));

  const signatureInput = `${headerEncoded}.${payloadEncoded}`;
  const signature = crypto
    .createHmac('sha256', secret)
    .update(signatureInput)
    .digest('base64url');

  return `${signatureInput}.${signature}`;
}

/**
 * 验证 JWT Token
 * 验证签名并解析 payload
 * 
 * @param token - JWT Token 字符串
 * @param secret - 签名密钥
 * @returns 验证结果和解析的 payload
 * 
 * @example
 * const result = verifyJWT(token, 'my-secret-key');
 * if (result.valid) {
 *   console.log('User ID:', result.payload?.userId);
 * }
 */
export function verifyJWT(
  token: string,
  secret: string
): { valid: boolean; payload?: JWTPayload; error?: string } {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return { valid: false, error: 'Invalid token format' };
    }

    const [headerEncoded, payloadEncoded, signature] = parts;

    // 验证签名
    const signatureInput = `${headerEncoded}.${payloadEncoded}`;
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(signatureInput)
      .digest('base64url');

    if (signature !== expectedSignature) {
      return { valid: false, error: 'Invalid signature' };
    }

    // 解析 payload
    const payload = JSON.parse(base64UrlDecode(payloadEncoded)) as JWTPayload;

    // 检查过期时间
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return { valid: false, error: 'Token expired' };
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
 * 解码 JWT Token (不验证签名)
 * 仅用于查看 token 内容，不验证有效性
 * 
 * @param token - JWT Token 字符串
 * @returns 解码后的 header 和 payload
 * 
 * @example
 * const decoded = decodeJWT(token);
 * console.log('Header:', decoded.header);
 * console.log('Payload:', decoded.payload);
 */
export function decodeJWT(token: string): { 
  header: JWTHeader; 
  payload: JWTPayload;
  signature: string;
} {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid token format');
  }

  return {
    header: JSON.parse(base64UrlDecode(parts[0])),
    payload: JSON.parse(base64UrlDecode(parts[1])),
    signature: parts[2]
  };
}

/**
 * 刷新 JWT Token
 * 基于旧 token 生成新 token (延长有效期)
 * 
 * @param token - 当前 JWT Token
 * @param secret - 签名密钥
 * @param newExpiresIn - 新过期时间 (秒)
 * @returns 新的 JWT Token
 */
export function refreshJWT(
  token: string,
  secret: string,
  newExpiresIn: number = 3600
): string {
  const result = verifyJWT(token, secret);
  if (!result.valid || !result.payload) {
    throw new Error('Cannot refresh invalid token');
  }

  const { iat, exp, ...payloadWithoutTime } = result.payload;
  return generateJWT(payloadWithoutTime, secret, newExpiresIn);
}

// ============================================
// OAuth2 工具函数
// ============================================

/**
 * 生成 OAuth2 授权 URL
 * 用于引导用户到授权页面
 * 
 * @param config - OAuth2 配置
 * @param state - 随机状态字符串 (用于 CSRF 防护)
 * @param scopes - 请求的权限范围 (可选，覆盖配置中的 scopes)
 * @returns 授权 URL
 * 
 * @example
 * const authUrl = generateOAuth2AuthorizeUrl(
 *   {
 *     clientId: 'your-client-id',
 *     authorizeUrl: 'https://provider.com/oauth/authorize',
 *     redirectUri: 'https://yourapp.com/callback'
 *   },
 *   generateState()
 * );
 */
export function generateOAuth2AuthorizeUrl(
  config: OAuth2Config,
  state: string,
  scopes?: string[]
): string {
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: 'code',
    state: state
  });

  if (scopes || config.scopes) {
    params.append('scope', (scopes || config.scopes || []).join(' '));
  }

  return `${config.authorizeUrl}?${params.toString()}`;
}

/**
 * 生成 OAuth2 State
 * 生成随机状态字符串用于 CSRF 防护
 * 
 * @returns 随机 state 字符串
 * 
 * @example
 * const state = generateOAuth2State();
 * // 存储 state 到 session，回调时验证
 */
export function generateOAuth2State(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * 生成 OAuth2 PKCE Code Verifier
 * 生成 PKCE 流程所需的 code verifier
 * 
 * @returns code verifier 字符串
 */
export function generateCodeVerifier(): string {
  return crypto.randomBytes(32).toString('base64url');
}

/**
 * 生成 OAuth2 PKCE Code Challenge
 * 基于 code verifier 生成 code challenge
 * 
 * @param verifier - code verifier
 * @returns code challenge
 */
export function generateCodeChallenge(verifier: string): string {
  const hash = crypto.createHash('sha256').update(verifier).digest('base64url');
  return hash;
}

/**
 * 交换 OAuth2 授权码获取 Token
 * 使用授权码换取访问令牌
 * 
 * @param config - OAuth2 配置
 * @param code - 授权码
 * @param state - 状态字符串 (用于验证)
 * @param storedState - 存储的状态字符串 (用于对比)
 * @returns Token 响应
 * 
 * @example
 * const token = await exchangeOAuth2Code(config, code, state, storedState);
 * console.log('Access Token:', token.accessToken);
 */
export async function exchangeOAuth2Code(
  config: OAuth2Config,
  code: string,
  state: string,
  storedState: string
): Promise<OAuth2TokenResponse> {
  // 验证 state
  if (state !== storedState) {
    throw new Error('Invalid state parameter');
  }

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
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: params.toString()
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token exchange failed: ${error}`);
  }

  return response.json() as Promise<OAuth2TokenResponse>;
}

/**
 * 刷新 OAuth2 Token
 * 使用 refresh token 获取新的 access token
 * 
 * @param config - OAuth2 配置
 * @param refreshToken - 刷新令牌
 * @returns 新的 Token 响应
 */
export async function refreshOAuth2Token(
  config: OAuth2Config,
  refreshToken: string
): Promise<OAuth2TokenResponse> {
  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: config.clientId,
    client_secret: config.clientSecret
  });

  const response = await fetch(config.tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: params.toString()
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token refresh failed: ${error}`);
  }

  return response.json() as Promise<OAuth2TokenResponse>;
}

/**
 * 撤销 OAuth2 Token
 * 撤销访问令牌或刷新令牌
 * 
 * @param revokeUrl - 撤销端点 URL
 * @param token - 需要撤销的 token
 * @param tokenType - token 类型 (access_token 或 refresh_token)
 * @param clientId - 客户端 ID
 * @param clientSecret - 客户端密钥
 */
export async function revokeOAuth2Token(
  revokeUrl: string,
  token: string,
  tokenType: string = 'access_token',
  clientId: string,
  clientSecret: string
): Promise<void> {
  const params = new URLSearchParams({
    token: token,
    token_type_hint: tokenType,
    client_id: clientId,
    client_secret: clientSecret
  });

  const response = await fetch(revokeUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: params.toString()
  });

  if (!response.ok) {
    throw new Error('Token revocation failed');
  }
}

// ============================================
// 会话管理
// ============================================

/**
 * 生成会话 ID
 * 生成安全的随机会话标识符
 * 
 * @returns 会话 ID 字符串
 */
export function generateSessionId(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * 创建会话
 * 创建新的会话记录
 * 
 * @param userId - 用户 ID
 * @param ttl - 会话有效期 (秒)，默认 86400 秒 (24 小时)
 * @param data - 会话附加数据
 * @returns 会话数据
 */
export function createSession(
  userId: string,
  ttl: number = 86400,
  data: Record<string, any> = {}
): SessionData {
  const now = Date.now();
  return {
    sessionId: generateSessionId(),
    userId,
    createdAt: now,
    expiresAt: now + ttl * 1000,
    lastActiveAt: now,
    data
  };
}

/**
 * 验证会话是否有效
 * 检查会话是否过期
 * 
 * @param session - 会话数据
 * @returns 是否有效
 */
export function isSessionValid(session: SessionData): boolean {
  const now = Date.now();
  return session.expiresAt > now;
}

/**
 * 更新会话活跃时间
 * 延长会话有效期
 * 
 * @param session - 会话数据
 * @param ttl - 新的有效期 (秒)
 * @returns 更新后的会话数据
 */
export function touchSession(
  session: SessionData,
  ttl: number = 86400
): SessionData {
  const now = Date.now();
  return {
    ...session,
    lastActiveAt: now,
    expiresAt: now + ttl * 1000
  };
}

/**
 * 内存会话存储 (开发用)
 * 简单的内存存储实现，生产环境应使用 Redis 等持久化存储
 */
export class MemorySessionStore implements SessionStore {
  private sessions: Map<string, SessionData> = new Map();
  private cleanupInterval?: NodeJS.Timeout;

  constructor(cleanupIntervalMs: number = 3600000) {
    // 每小时清理一次过期会话
    this.cleanupInterval = setInterval(() => this.clean(), cleanupIntervalMs);
  }

  async get(sessionId: string): Promise<SessionData | null> {
    const session = this.sessions.get(sessionId);
    if (!session) return null;
    
    if (!isSessionValid(session)) {
      await this.delete(sessionId);
      return null;
    }
    
    return session;
  }

  async set(sessionId: string, data: SessionData): Promise<void> {
    this.sessions.set(sessionId, data);
  }

  async delete(sessionId: string): Promise<void> {
    this.sessions.delete(sessionId);
  }

  async clean(): Promise<void> {
    const now = Date.now();
    for (const [id, session] of this.sessions.entries()) {
      if (session.expiresAt < now) {
        this.sessions.delete(id);
      }
    }
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.sessions.clear();
  }

  size(): number {
    return this.sessions.size;
  }
}

/**
 * 创建基于 Cookie 的会话管理器
 * 提供 Cookie 相关的辅助函数
 */
export const CookieUtils = {
  /**
   * 序列化 Cookie
   * 将 Cookie 数据转换为 Set-Cookie 头格式
   * 
   * @param name - Cookie 名称
   * @param value - Cookie 值
   * @param options - Cookie 选项
   * @returns Set-Cookie 头字符串
   */
  serialize(
    name: string,
    value: string,
    options: {
      maxAge?: number;
      httpOnly?: boolean;
      secure?: boolean;
      sameSite?: 'strict' | 'lax' | 'none';
      path?: string;
      domain?: string;
    } = {}
  ): string {
    let cookie = `${name}=${value}`;

    if (options.maxAge) {
      cookie += `; Max-Age=${options.maxAge}`;
    }

    if (options.httpOnly !== false) {
      cookie += '; HttpOnly';
    }

    if (options.secure) {
      cookie += '; Secure';
    }

    if (options.sameSite) {
      cookie += `; SameSite=${options.sameSite}`;
    }

    if (options.path) {
      cookie += `; Path=${options.path}`;
    }

    if (options.domain) {
      cookie += `; Domain=${options.domain}`;
    }

    return cookie;
  },

  /**
   * 解析 Cookie
   * 从 Cookie 头字符串解析为对象
   * 
   * @param cookieHeader - Cookie 头字符串
   * @returns Cookie 键值对对象
   */
  parse(cookieHeader: string): Record<string, string> {
    const cookies: Record<string, string> = {};
    
    if (!cookieHeader) {
      return cookies;
    }

    const pairs = cookieHeader.split(';');
    for (const pair of pairs) {
      const [name, ...valueParts] = pair.trim().split('=');
      if (name) {
        cookies[name.trim()] = valueParts.join('=').trim();
      }
    }

    return cookies;
  }
};

// ============================================
// 使用示例
// ============================================

if (require.main === module) {
  console.log('=== 身份认证提供工具 - ACE - 使用示例 ===\n');

  // 配置
  const JWT_SECRET = 'your-super-secret-key-change-in-production';
  const OAUTH_CONFIG: OAuth2Config = {
    clientId: 'your-client-id',
    clientSecret: 'your-client-secret',
    authorizeUrl: 'https://github.com/login/oauth/authorize',
    tokenUrl: 'https://github.com/login/oauth/access_token',
    redirectUri: 'https://yourapp.com/auth/callback',
    scopes: ['user:email']
  };

  // ============================================
  // 1. JWT 生成与验证示例
  // ============================================
  console.log('1️⃣ JWT 生成与验证:\n');

  const payload: JWTPayload = {
    userId: 'user-123',
    email: 'user@example.com',
    roles: ['admin', 'user'],
    permissions: ['read', 'write', 'delete']
  };

  const token = generateJWT(payload, JWT_SECRET, 3600);
  console.log(`   生成的 Token: ${token.substring(0, 50)}...`);

  const verifyResult = verifyJWT(token, JWT_SECRET);
  console.log(`   验证结果: ${verifyResult.valid ? '✅ 有效' : '❌ 无效'}`);
  if (verifyResult.valid && verifyResult.payload) {
    console.log(`   用户 ID: ${verifyResult.payload.userId}`);
    console.log(`   邮箱：${verifyResult.payload.email}`);
    console.log(`   角色：${verifyResult.payload.roles?.join(', ')}`);
  }

  // Token 刷新
  const newToken = refreshJWT(token, JWT_SECRET, 7200);
  console.log(`   刷新后的 Token: ${newToken.substring(0, 50)}...`);

  // ============================================
  // 2. OAuth2 流程示例
  // ============================================
  console.log('\n2️⃣ OAuth2 流程:\n');

  const state = generateOAuth2State();
  console.log(`   生成的 State: ${state}`);

  const authUrl = generateOAuth2AuthorizeUrl(OAUTH_CONFIG, state);
  console.log(`   授权 URL: ${authUrl.substring(0, 80)}...`);

  // PKCE 示例
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);
  console.log(`   Code Verifier: ${codeVerifier}`);
  console.log(`   Code Challenge: ${codeChallenge}`);

  // ============================================
  // 3. 会话管理示例
  // ============================================
  console.log('\n3️⃣ 会话管理:\n');

  const sessionStore = new MemorySessionStore();
  
  const session = createSession('user-123', 3600, {
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0...'
  });
  
  console.log(`   会话 ID: ${session.sessionId}`);
  console.log(`   用户 ID: ${session.userId}`);
  console.log(`   创建时间: ${new Date(session.createdAt).toISOString()}`);
  console.log(`   过期时间: ${new Date(session.expiresAt).toISOString()}`);
  console.log(`   会话有效：${isSessionValid(session) ? '✅' : '❌'}`);

  // 存储会话
  sessionStore.set(session.sessionId, session);
  console.log(`   会话已存储，当前会话数：${sessionStore.size()}`);

  // 更新会话活跃时间
  const touchedSession = touchSession(session, 7200);
  console.log(`   会话已更新，新过期时间：${new Date(touchedSession.expiresAt).toISOString()}`);

  // 清理
  sessionStore.destroy();

  // ============================================
  // 4. Cookie 工具示例
  // ============================================
  console.log('\n4️⃣ Cookie 工具:\n');

  const sessionCookie = CookieUtils.serialize('session_id', session.sessionId, {
    maxAge: 86400,
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    path: '/'
  });
  console.log(`   Set-Cookie: ${sessionCookie}`);

  const parsed = CookieUtils.parse('session_id=abc123; user_id=user-123');
  console.log(`   解析结果: ${JSON.stringify(parsed)}`);

  console.log('\n✅ 所有示例执行完成!\n');
}
