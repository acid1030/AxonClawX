/**
 * Session Manager Skill - ACE 会话管理器
 * 
 * 功能:
 * 1. 会话创建 (Session Creation)
 * 2. 会话验证 (Session Validation)
 * 3. 会话过期 (Session Expiration)
 * 
 * @author ACE
 * @version 1.0.0
 */

// ==================== 类型定义 ====================

export interface Session {
  id: string;
  userId: string;
  createdAt: number;
  expiresAt: number;
  lastAccessedAt: number;
  data: Record<string, any>;
  isValid: boolean;
}

export interface SessionConfig {
  /** 默认会话过期时间 (毫秒), 默认 30 分钟 */
  defaultTTL: number;
  /** 是否自动清理过期会话, 默认 true */
  autoCleanup?: boolean;
  /** 清理间隔 (毫秒), 默认 5 分钟 */
  cleanupInterval?: number;
}

export interface SessionCreateOptions {
  /** 自定义 TTL (毫秒) */
  ttl?: number;
  /** 会话数据 */
  data?: Record<string, any>;
}

export interface SessionValidationResult {
  /** 会话是否有效 */
  isValid: boolean;
  /** 无效原因 */
  reason?: 'expired' | 'not_found' | 'invalid' | null;
  /** 会话数据 (如果有效) */
  session?: Session | null;
}

export interface SessionManager {
  /** 创建新会话 */
  create(userId: string, options?: SessionCreateOptions): Session;
  /** 验证会话 */
  validate(sessionId: string): SessionValidationResult;
  /** 获取会话 */
  get(sessionId: string): Session | null;
  /** 销毁会话 */
  destroy(sessionId: string): boolean;
  /** 刷新会话过期时间 */
  refresh(sessionId: string, ttl?: number): Session | null;
  /** 获取用户的所有会话 */
  listByUser(userId: string): Session[];
  /** 清理过期会话，返回清理数量 */
  cleanup(): number;
  /** 销毁管理器 (停止清理定时器) */
  dispose(): void;
}

// ==================== 工具函数 ====================

/**
 * 生成唯一会话 ID
 */
function generateSessionId(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 15);
  return `sess_${timestamp}_${randomPart}`;
}

/**
 * 检查会话是否过期
 */
function isSessionExpired(session: Session): boolean {
  return Date.now() > session.expiresAt;
}

// ==================== 会话管理器实现 ====================

class SessionManagerImpl implements SessionManager {
  private sessions: Map<string, Session> = new Map();
  private config: SessionConfig;
  private cleanupTimer?: NodeJS.Timeout;

  constructor(config: SessionConfig) {
    this.config = {
      defaultTTL: config.defaultTTL,
      autoCleanup: config.autoCleanup ?? true,
      cleanupInterval: config.cleanupInterval ?? 5 * 60 * 1000,
    };

    // 启动自动清理
    if (this.config.autoCleanup) {
      this.startCleanupTimer();
    }
  }

  /**
   * 创建新会话
   */
  create(userId: string, options?: SessionCreateOptions): Session {
    const now = Date.now();
    const ttl = options?.ttl ?? this.config.defaultTTL;
    
    const session: Session = {
      id: generateSessionId(),
      userId,
      createdAt: now,
      expiresAt: now + ttl,
      lastAccessedAt: now,
      data: options?.data ?? {},
      isValid: true,
    };

    this.sessions.set(session.id, session);
    return session;
  }

  /**
   * 验证会话
   */
  validate(sessionId: string): SessionValidationResult {
    const session = this.sessions.get(sessionId);

    if (!session) {
      return { isValid: false, reason: 'not_found', session: null };
    }

    if (isSessionExpired(session)) {
      session.isValid = false;
      return { isValid: false, reason: 'expired', session: null };
    }

    if (!session.isValid) {
      return { isValid: false, reason: 'invalid', session: null };
    }

    // 更新最后访问时间
    session.lastAccessedAt = Date.now();
    return { isValid: true, reason: null, session };
  }

  /**
   * 获取会话
   */
  get(sessionId: string): Session | null {
    const result = this.validate(sessionId);
    return result.isValid ? result.session! : null;
  }

  /**
   * 销毁会话
   */
  destroy(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.isValid = false;
      return this.sessions.delete(sessionId);
    }
    return false;
  }

  /**
   * 刷新会话过期时间
   */
  refresh(sessionId: string, ttl?: number): Session | null {
    const session = this.sessions.get(sessionId);
    if (!session || isSessionExpired(session)) {
      return null;
    }

    const newTTL = ttl ?? this.config.defaultTTL;
    session.expiresAt = Date.now() + newTTL;
    session.lastAccessedAt = Date.now();
    return session;
  }

  /**
   * 获取用户的所有会话
   */
  listByUser(userId: string): Session[] {
    return Array.from(this.sessions.values()).filter(
      s => s.userId === userId && !isSessionExpired(s)
    );
  }

  /**
   * 清理过期会话
   */
  cleanup(): number {
    let count = 0;
    for (const [id, session] of this.sessions.entries()) {
      if (isSessionExpired(session) || !session.isValid) {
        this.sessions.delete(id);
        count++;
      }
    }
    return count;
  }

  /**
   * 销毁管理器
   */
  dispose(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
    this.sessions.clear();
  }

  /**
   * 启动清理定时器
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      const count = this.cleanup();
      if (count > 0) {
        console.log(`[SessionManager] 清理了 ${count} 个过期会话`);
      }
    }, this.config.cleanupInterval);

    // 允许进程在定时器运行时退出
    if (this.cleanupTimer.unref) {
      this.cleanupTimer.unref();
    }
  }
}

// ==================== 工厂函数 ====================

/**
 * 创建会话管理器
 * 
 * @param config 会话配置
 * @returns SessionManager 实例
 */
export function createSessionManager(config: SessionConfig): SessionManager {
  return new SessionManagerImpl(config);
}

/**
 * 创建默认会话管理器 (30 分钟过期)
 */
export function createDefaultSessionManager(): SessionManager {
  return createSessionManager({
    defaultTTL: 30 * 60 * 1000,  // 30 分钟
    autoCleanup: true,
    cleanupInterval: 5 * 60 * 1000,  // 5 分钟
  });
}

// ==================== 便捷工具函数 ====================

/**
 * 快速创建会话 (使用默认配置)
 */
let defaultManager: SessionManager | null = null;

export function quickCreateSession(
  userId: string,
  options?: SessionCreateOptions
): Session {
  if (!defaultManager) {
    defaultManager = createDefaultSessionManager();
  }
  return defaultManager.create(userId, options);
}

/**
 * 快速验证会话 (使用默认配置)
 */
export function quickValidateSession(
  sessionId: string
): SessionValidationResult {
  if (!defaultManager) {
    defaultManager = createDefaultSessionManager();
  }
  return defaultManager.validate(sessionId);
}

/**
 * 获取默认管理器实例
 */
export function getDefaultManager(): SessionManager | null {
  return defaultManager;
}

/**
 * 重置默认管理器
 */
export function resetDefaultManager(): void {
  if (defaultManager) {
    defaultManager.dispose();
    defaultManager = null;
  }
}

// ==================== 导出 ====================

export {
  Session,
  SessionConfig,
  SessionCreateOptions,
  SessionValidationResult,
  SessionManager,
  isSessionExpired,
  generateSessionId,
};
