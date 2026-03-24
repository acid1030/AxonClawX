/**
 * Session 会话管理中间件
 * 
 * 提供内存/Redis 双模式会话管理，支持会话过期、用户状态跟踪
 * 可配置存储后端，自动清理过期会话
 * 
 * @author Axon
 * @version 1.0.0
 */

import * as crypto from 'crypto';

/**
 * 会话数据类型
 */
export interface SessionData {
  /** 会话 ID */
  sessionId: string;
  /** 用户 ID */
  userId?: string;
  /** 用户角色 */
  role?: string;
  /** 用户状态 */
  userStatus?: UserStatus;
  /** 会话数据 (自定义) */
  data: Record<string, any>;
  /** 创建时间 (Unix 时间戳) */
  createdAt: number;
  /** 最后活动时间 (Unix 时间戳) */
  lastActivity: number;
  /** 过期时间 (Unix 时间戳) */
  expiresAt: number;
  /** IP 地址 */
  ip?: string;
  /** User-Agent */
  userAgent?: string;
}

/**
 * 用户状态枚举
 */
export type UserStatus = 
  | 'online'      // 在线
  | 'idle'        // 空闲
  | 'away'        // 离开
  | 'busy'        // 忙碌
  | 'offline';    // 离线

/**
 * Redis 配置
 */
export interface RedisConfig {
  /** Redis 主机 */
  host: string;
  /** Redis 端口 */
  port: number;
  /** Redis 密码 */
  password?: string;
  /** Redis 数据库 */
  db?: number;
  /** 键前缀 */
  keyPrefix?: string;
}

/**
 * 会话中间件配置
 */
export interface SessionConfig {
  /** 存储类型 */
  store: 'memory' | 'redis';
  /** Redis 配置 (仅 redis 模式) */
  redis?: RedisConfig;
  /** 会话过期时间 (毫秒) */
  ttl: number;
  /** 空闲超时时间 (毫秒，可选) */
  idleTimeout?: number;
  /** 会话 ID Cookie 名称 */
  cookieName?: string;
  /** Cookie 配置 */
  cookie?: {
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: 'strict' | 'lax' | 'none';
    path?: string;
    domain?: string;
  };
  /** 自动续期 (每次访问时刷新过期时间) */
  rolling?: boolean;
  /** 清理过期会话的间隔 (毫秒) */
  cleanupInterval?: number;
}

/**
 * 内存存储接口
 */
interface MemoryStore {
  sessions: Map<string, SessionData>;
  cleanupTimer?: NodeJS.Timeout;
}

/**
 * Redis 客户端类型 (动态导入)
 */
interface RedisClient {
  setex(key: string, ttl: number, value: string): Promise<string>;
  get(key: string): Promise<string | null>;
  del(key: string): Promise<number>;
  expire(key: string, ttl: number): Promise<number>;
  ttl(key: string): Promise<number>;
  keys(pattern: string): Promise<string[]>;
  quit(): Promise<void>;
}

/**
 * 会话中间件类
 */
export class SessionMiddleware {
  private config: SessionConfig;
  private memoryStore: MemoryStore | null = null;
  private redisClient: RedisClient | null = null;
  private initialized: boolean = false;

  constructor(config: SessionConfig) {
    this.config = {
      ttl: 24 * 60 * 60 * 1000, // 默认 24 小时
      cookieName: 'sessionId',
      rolling: true,
      cleanupInterval: 10 * 60 * 1000, // 默认 10 分钟清理一次
      ...config,
      cookie: {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        path: '/',
        ...config.cookie,
      },
    };

    if (config.store === 'memory') {
      this.memoryStore = { sessions: new Map() };
    }
  }

  /**
   * 初始化中间件
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    if (this.config.store === 'redis') {
      if (!this.config.redis) {
        throw new Error('Redis configuration is required for redis store');
      }

      try {
        const Redis = require('ioredis');
        this.redisClient = new Redis({
          host: this.config.redis.host || 'localhost',
          port: this.config.redis.port || 6379,
          password: this.config.redis.password,
          db: this.config.redis.db || 0,
        }) as RedisClient;
      } catch (error) {
        throw new Error('Redis client not installed. Run: npm install ioredis');
      }
    }

    // 启动清理定时器
    this.startCleanupTimer();
    this.initialized = true;
  }

  /**
   * 启动清理定时器
   */
  private startCleanupTimer(): void {
    if (this.config.store === 'memory' && this.memoryStore) {
      this.memoryStore.cleanupTimer = setInterval(() => {
        this.cleanupExpiredSessions();
      }, this.config.cleanupInterval);

      // 取消引用，允许进程退出
      this.memoryStore.cleanupTimer.unref();
    }
  }

  /**
   * 清理过期会话
   */
  private async cleanupExpiredSessions(): Promise<void> {
    const now = Date.now();

    if (this.config.store === 'memory' && this.memoryStore) {
      this.memoryStore.sessions.forEach((session, sessionId) => {
        if (now > session.expiresAt) {
          this.memoryStore!.sessions.delete(sessionId);
        }
      });
    } else if (this.config.store === 'redis' && this.redisClient) {
      // Redis 会自动过期，这里可以手动检查
      const prefix = this.config.redis?.keyPrefix || 'session:';
      try {
        const keys = await this.redisClient.keys(`${prefix}*`);
        for (const key of keys) {
          const ttl = await this.redisClient.ttl(key);
          if (ttl <= 0) {
            await this.redisClient.del(key);
          }
        }
      } catch (error) {
        console.error('[Session] Cleanup error:', error);
      }
    }
  }

  /**
   * 生成会话 ID
   */
  private generateSessionId(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * 获取会话键
   */
  private getSessionKey(sessionId: string): string {
    const prefix = this.config.redis?.keyPrefix || 'session:';
    return `${prefix}${sessionId}`;
  }

  /**
   * 从请求中提取会话 ID
   */
  private extractSessionId(req: any): string | null {
    // 从 Cookie 中获取
    const cookieHeader = req.headers?.cookie;
    if (cookieHeader) {
      const cookies = this.parseCookies(cookieHeader);
      if (cookies[this.config.cookieName!]) {
        return cookies[this.config.cookieName!];
      }
    }

    // 从 Header 中获取 (用于 API 调用)
    if (req.headers?.['x-session-id']) {
      return req.headers['x-session-id'];
    }

    return null;
  }

  /**
   * 解析 Cookie
   */
  private parseCookies(cookieHeader: string): Record<string, string> {
    const cookies: Record<string, string> = {};
    const pairs = cookieHeader.split(';');
    for (const pair of pairs) {
      const [key, value] = pair.trim().split('=');
      if (key && value) {
        cookies[key] = decodeURIComponent(value);
      }
    }
    return cookies;
  }

  /**
   * 生成 Set-Cookie Header
   */
  private generateCookieHeader(sessionId: string, expires: Date): string {
    const parts = [`${this.config.cookieName}=${sessionId}`];
    
    if (this.config.cookie?.httpOnly) {
      parts.push('HttpOnly');
    }
    if (this.config.cookie?.secure) {
      parts.push('Secure');
    }
    if (this.config.cookie?.sameSite) {
      parts.push(`SameSite=${this.config.cookie.sameSite}`);
    }
    if (this.config.cookie?.path) {
      parts.push(`Path=${this.config.cookie.path}`);
    }
    if (this.config.cookie?.domain) {
      parts.push(`Domain=${this.config.cookie.domain}`);
    }
    parts.push(`Expires=${expires.toUTCString()}`);

    return parts.join('; ');
  }

  /**
   * 创建新会话
   */
  async createSession(
    userId?: string,
    data?: Record<string, any>,
    req?: any
  ): Promise<SessionData> {
    const sessionId = this.generateSessionId();
    const now = Date.now();
    const ttlSeconds = Math.floor(this.config.ttl / 1000);

    const session: SessionData = {
      sessionId,
      userId,
      role: data?.role,
      userStatus: 'online',
      data: data || {},
      createdAt: now,
      lastActivity: now,
      expiresAt: now + this.config.ttl,
      ip: req?.socket?.remoteAddress || req?.ip,
      userAgent: req?.headers?.['user-agent'],
    };

    if (this.config.store === 'memory' && this.memoryStore) {
      this.memoryStore.sessions.set(sessionId, session);
    } else if (this.config.store === 'redis' && this.redisClient) {
      const key = this.getSessionKey(sessionId);
      await this.redisClient.setex(key, ttlSeconds, JSON.stringify(session));
    }

    return session;
  }

  /**
   * 获取会话
   */
  async getSession(sessionId: string): Promise<SessionData | null> {
    if (!sessionId) return null;

    let session: SessionData | null = null;

    if (this.config.store === 'memory' && this.memoryStore) {
      session = this.memoryStore.sessions.get(sessionId) || null;
    } else if (this.config.store === 'redis' && this.redisClient) {
      const key = this.getSessionKey(sessionId);
      const data = await this.redisClient.get(key);
      if (data) {
        session = JSON.parse(data);
      }
    }

    // 检查是否过期
    if (session && Date.now() > session.expiresAt) {
      await this.destroySession(sessionId);
      return null;
    }

    // 检查空闲超时
    if (session && this.config.idleTimeout) {
      if (Date.now() - session.lastActivity > this.config.idleTimeout) {
        await this.destroySession(sessionId);
        return null;
      }
    }

    // 自动续期
    if (session && this.config.rolling) {
      await this.touchSession(sessionId);
    }

    return session;
  }

  /**
   * 更新会话
   */
  async updateSession(
    sessionId: string,
    updates: Partial<SessionData>
  ): Promise<SessionData | null> {
    const session = await this.getSession(sessionId);
    if (!session) return null;

    const updatedSession = {
      ...session,
      ...updates,
      lastActivity: Date.now(),
    };

    if (this.config.store === 'memory' && this.memoryStore) {
      this.memoryStore.sessions.set(sessionId, updatedSession);
    } else if (this.config.store === 'redis' && this.redisClient) {
      const key = this.getSessionKey(sessionId);
      const ttlSeconds = Math.floor(this.config.ttl / 1000);
      await this.redisClient.setex(key, ttlSeconds, JSON.stringify(updatedSession));
    }

    return updatedSession;
  }

  /**
   * 续期会话 (刷新过期时间)
   */
  async touchSession(sessionId: string): Promise<boolean> {
    const session = await this.getSession(sessionId);
    if (!session) return false;

    const now = Date.now();
    const ttlSeconds = Math.floor(this.config.ttl / 1000);

    session.lastActivity = now;
    session.expiresAt = now + this.config.ttl;

    if (this.config.store === 'memory' && this.memoryStore) {
      this.memoryStore.sessions.set(sessionId, session);
    } else if (this.config.store === 'redis' && this.redisClient) {
      const key = this.getSessionKey(sessionId);
      await this.redisClient.expire(key, ttlSeconds);
      await this.redisClient.setex(key, ttlSeconds, JSON.stringify(session));
    }

    return true;
  }

  /**
   * 销毁会话
   */
  async destroySession(sessionId: string): Promise<boolean> {
    if (this.config.store === 'memory' && this.memoryStore) {
      return this.memoryStore.sessions.delete(sessionId);
    } else if (this.config.store === 'redis' && this.redisClient) {
      const key = this.getSessionKey(sessionId);
      const deleted = await this.redisClient.del(key);
      return deleted > 0;
    }

    return false;
  }

  /**
   * 更新用户状态
   */
  async updateUserStatus(
    sessionId: string,
    status: UserStatus
  ): Promise<SessionData | null> {
    return this.updateSession(sessionId, { userStatus: status });
  }

  /**
   * 获取在线用户数
   */
  async getOnlineUserCount(): Promise<number> {
    if (this.config.store === 'memory' && this.memoryStore) {
      const now = Date.now();
      let count = 0;
      this.memoryStore.sessions.forEach((session) => {
        if (now <= session.expiresAt && session.userStatus === 'online') {
          count++;
        }
      });
      return count;
    } else if (this.config.store === 'redis' && this.redisClient) {
      const prefix = this.config.redis?.keyPrefix || 'session:';
      try {
        const keys = await this.redisClient.keys(`${prefix}*`);
        let count = 0;
        for (const key of keys) {
          const data = await this.redisClient.get(key);
          if (data) {
            const session = JSON.parse(data);
            if (session.userStatus === 'online') {
              count++;
            }
          }
        }
        return count;
      } catch (error) {
        console.error('[Session] Get online count error:', error);
        return 0;
      }
    }

    return 0;
  }

  /**
   * 中间件函数 (用于 Express/Koa 等框架)
   */
  middleware() {
    return async (req: any, res: any, next: () => void) => {
      try {
        // 确保已初始化
        if (!this.initialized) {
          await this.initialize();
        }

        // 获取或创建会话
        let sessionId = this.extractSessionId(req);
        let session = sessionId ? await this.getSession(sessionId) : null;

        // 如果没有有效会话，创建新会话
        if (!session) {
          session = await this.createSession(undefined, {}, req);
          sessionId = session.sessionId;

          // 设置 Cookie
          const expires = new Date(session.expiresAt);
          (res as any).setHeader('Set-Cookie', this.generateCookieHeader(sessionId, expires));
        }

        // 将会话附加到请求对象
        req.session = session;
        req.sessionId = sessionId;

        // 提供会话操作方法
        req.sessionStore = {
          get: (id: string) => this.getSession(id),
          set: (id: string, data: Partial<SessionData>) => this.updateSession(id, data),
          destroy: (id: string) => this.destroySession(id),
          touch: (id: string) => this.touchSession(id),
          updateStatus: (id: string, status: UserStatus) => this.updateUserStatus(id, status),
        };

        next();
      } catch (error) {
        console.error('[Session] Middleware error:', error);
        (next as any)(error);
      }
    };
  }

  /**
   * 关闭中间件，清理资源
   */
  async close(): Promise<void> {
    if (this.memoryStore?.cleanupTimer) {
      clearInterval(this.memoryStore.cleanupTimer);
    }

    if (this.redisClient) {
      await this.redisClient.quit();
      this.redisClient = null;
    }

    this.initialized = false;
  }
}

/**
 * 创建会话中间件实例
 */
export function createSessionMiddleware(config: SessionConfig): SessionMiddleware {
  return new SessionMiddleware(config);
}

export default SessionMiddleware;
