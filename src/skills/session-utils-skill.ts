/**
 * NOVA 用户会话管理工具
 * 
 * 功能:
 * 1. 会话创建/销毁
 * 2. 会话存储 (内存 + 可选持久化)
 * 3. 会话过期 (TTL 自动清理)
 * 
 * @author NOVA
 * @version 1.0.0
 */

// ==================== 类型定义 ====================

export interface SessionData {
  id: string;
  userId: string;
  createdAt: number;
  lastAccessedAt: number;
  expiresAt: number;
  data: Record<string, any>;
  metadata?: {
    userAgent?: string;
    ip?: string;
    tags?: string[];
  };
}

export interface SessionConfig {
  defaultTTL: number;           // 默认过期时间 (毫秒)
  maxSessionsPerUser?: number;  // 每用户最大会话数
  cleanupInterval?: number;     // 清理间隔 (毫秒)
  persistPath?: string;         // 持久化路径 (可选)
}

export interface SessionStore {
  get(sessionId: string): SessionData | null;
  set(sessionId: string, session: SessionData): void;
  delete(sessionId: string): boolean;
  list(filter?: { userId?: string; active?: boolean }): SessionData[];
  clear(): void;
}

export interface SessionManager {
  create(userId: string, options?: SessionCreateOptions): SessionData;
  destroy(sessionId: string): boolean;
  get(sessionId: string): SessionData | null;
  update(sessionId: string, data: Partial<SessionData['data']>): SessionData | null;
  refresh(sessionId: string, ttl?: number): SessionData | null;
  list(filter?: { userId?: string; active?: boolean }): SessionData[];
  cleanup(): number;
  dispose(): void;
}

export interface SessionCreateOptions {
  ttl?: number;
  data?: Record<string, any>;
  metadata?: SessionData['metadata'];
}

export interface SessionStats {
  totalSessions: number;
  activeSessions: number;
  expiredSessions: number;
  sessionsByUser: Record<string, number>;
  avgSessionDuration: number;
}

// ==================== 内存存储实现 ====================

class MemorySessionStore implements SessionStore {
  private store: Map<string, SessionData> = new Map();

  get(sessionId: string): SessionData | null {
    return this.store.get(sessionId) || null;
  }

  set(sessionId: string, session: SessionData): void {
    this.store.set(sessionId, session);
  }

  delete(sessionId: string): boolean {
    return this.store.delete(sessionId);
  }

  list(filter?: { userId?: string; active?: boolean }): SessionData[] {
    const sessions = Array.from(this.store.values());
    
    if (!filter) return sessions;
    
    return sessions.filter(session => {
      if (filter.userId && session.userId !== filter.userId) {
        return false;
      }
      if (filter.active !== undefined) {
        const isActive = Date.now() < session.expiresAt;
        return isActive === filter.active;
      }
      return true;
    });
  }

  clear(): void {
    this.store.clear();
  }

  getSize(): number {
    return this.store.size;
  }
}

// ==================== 会话管理器 ====================

class SessionManagerImpl implements SessionManager {
  private store: SessionStore;
  private config: Required<SessionConfig>;
  private cleanupTimer?: NodeJS.Timeout;
  private eventListeners: Map<string, Array<(session: SessionData) => void>> = new Map();

  constructor(config: SessionConfig, store?: SessionStore) {
    this.store = store || new MemorySessionStore();
    this.config = {
      defaultTTL: config.defaultTTL,
      maxSessionsPerUser: config.maxSessionsPerUser ?? 10,
      cleanupInterval: config.cleanupInterval ?? 60000,
      persistPath: config.persistPath ?? '',
    };

    this.startCleanupTimer();
  }

  /**
   * 1. 创建会话
   */
  create(userId: string, options?: SessionCreateOptions): SessionData {
    const now = Date.now();
    const ttl = options?.ttl ?? this.config.defaultTTL;
    
    // 检查用户会话数限制
    const userSessions = this.store.list({ userId });
    if (userSessions.length >= (this.config.maxSessionsPerUser ?? Infinity)) {
      // 删除最旧的会话
      const oldest = userSessions.sort((a, b) => a.createdAt - b.createdAt)[0];
      if (oldest) {
        this.destroy(oldest.id);
      }
    }

    const sessionId = this.generateSessionId();
    const session: SessionData = {
      id: sessionId,
      userId,
      createdAt: now,
      lastAccessedAt: now,
      expiresAt: now + ttl,
      data: options?.data ?? {},
      metadata: options?.metadata,
    };

    this.store.set(sessionId, session);
    this.emit('create', session);

    return session;
  }

  /**
   * 2. 销毁会话
   */
  destroy(sessionId: string): boolean {
    const session = this.store.get(sessionId);
    if (session) {
      this.store.delete(sessionId);
      this.emit('destroy', session);
      return true;
    }
    return false;
  }

  /**
   * 3. 获取会话
   */
  get(sessionId: string): SessionData | null {
    const session = this.store.get(sessionId);
    
    if (!session) {
      return null;
    }

    // 检查是否过期
    if (Date.now() >= session.expiresAt) {
      this.destroy(sessionId);
      return null;
    }

    // 更新最后访问时间
    session.lastAccessedAt = Date.now();
    this.store.set(sessionId, session);

    return session;
  }

  /**
   * 4. 更新会话数据
   */
  update(sessionId: string, data: Partial<SessionData['data']>): SessionData | null {
    const session = this.get(sessionId);
    
    if (!session) {
      return null;
    }

    session.data = { ...session.data, ...data };
    this.store.set(sessionId, session);
    this.emit('update', session);

    return session;
  }

  /**
   * 5. 刷新会话过期时间
   */
  refresh(sessionId: string, ttl?: number): SessionData | null {
    const session = this.store.get(sessionId);
    
    if (!session) {
      return null;
    }

    const newTTL = ttl ?? this.config.defaultTTL;
    session.expiresAt = Date.now() + newTTL;
    session.lastAccessedAt = Date.now();
    this.store.set(sessionId, session);
    this.emit('refresh', session);

    return session;
  }

  /**
   * 6. 列出会话
   */
  list(filter?: { userId?: string; active?: boolean }): SessionData[] {
    return this.store.list(filter);
  }

  /**
   * 7. 清理过期会话
   */
  cleanup(): number {
    const sessions = this.store.list();
    const now = Date.now();
    let cleaned = 0;

    sessions.forEach(session => {
      if (now >= session.expiresAt) {
        this.destroy(session.id);
        cleaned++;
      }
    });

    return cleaned;
  }

  /**
   * 8. 获取统计信息
   */
  getStats(): SessionStats {
    const sessions = this.store.list();
    const now = Date.now();
    const activeSessions = sessions.filter(s => now < s.expiresAt);
    const expiredSessions = sessions.filter(s => now >= s.expiresAt);
    
    const sessionsByUser: Record<string, number> = {};
    let totalDuration = 0;

    sessions.forEach(session => {
      sessionsByUser[session.userId] = (sessionsByUser[session.userId] || 0) + 1;
      totalDuration += session.lastAccessedAt - session.createdAt;
    });

    return {
      totalSessions: sessions.length,
      activeSessions: activeSessions.length,
      expiredSessions: expiredSessions.length,
      sessionsByUser,
      avgSessionDuration: sessions.length > 0 ? totalDuration / sessions.length : 0,
    };
  }

  /**
   * 9. 注册事件监听器
   */
  on(event: 'create' | 'destroy' | 'update' | 'refresh' | 'expire', callback: (session: SessionData) => void): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  /**
   * 10. 销毁管理器
   */
  dispose(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
    this.store.clear();
    this.eventListeners.clear();
  }

  // ==================== 私有方法 ====================

  private generateSessionId(): string {
    const timestamp = Date.now().toString(36);
    const randomPart = Math.random().toString(36).substring(2, 15);
    return `sess_${timestamp}_${randomPart}`;
  }

  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      const cleaned = this.cleanup();
      if (cleaned > 0) {
        // 可以在这里添加日志
      }
    }, this.config.cleanupInterval);

    // 确保定时器不会阻止进程退出
    if (this.cleanupTimer.unref) {
      this.cleanupTimer.unref();
    }
  }

  private emit(event: string, session: SessionData): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(session);
        } catch (error) {
          // 忽略监听器错误
        }
      });
    }
  }
}

// ==================== 工厂函数 ====================

/**
 * 创建会话管理器实例
 * 
 * @param config 会话配置
 * @returns SessionManager 实例
 */
export function createSessionManager(config: SessionConfig): SessionManager {
  return new SessionManagerImpl(config);
}

/**
 * 创建会话管理器并导出便捷方法
 */
export function createSessionUtils(config: SessionConfig) {
  const manager = createSessionManager(config);

  return {
    /**
     * 创建新会话
     */
    createSession: (userId: string, options?: SessionCreateOptions) => 
      manager.create(userId, options),

    /**
     * 销毁会话
     */
    destroySession: (sessionId: string) => 
      manager.destroy(sessionId),

    /**
     * 获取会话
     */
    getSession: (sessionId: string) => 
      manager.get(sessionId),

    /**
     * 更新会话数据
     */
    updateSession: (sessionId: string, data: Partial<SessionData['data']>) => 
      manager.update(sessionId, data),

    /**
     * 刷新会话
     */
    refreshSession: (sessionId: string, ttl?: number) => 
      manager.refresh(sessionId, ttl),

    /**
     * 列出会话
     */
    listSessions: (filter?: { userId?: string; active?: boolean }) => 
      manager.list(filter),

    /**
     * 清理过期会话
     */
    cleanupSessions: () => 
      manager.cleanup(),

    /**
     * 获取统计信息
     */
    getSessionStats: () => 
      (manager as SessionManagerImpl).getStats(),

    /**
     * 注册事件监听
     */
    onSessionEvent: (event: string, callback: (session: SessionData) => void) => 
      (manager as SessionManagerImpl).on(event as any, callback),

    /**
     * 销毁管理器
     */
    dispose: () => 
      manager.dispose(),
  };
}

// ==================== 默认导出 ====================

export default {
  createSessionManager,
  createSessionUtils,
};
