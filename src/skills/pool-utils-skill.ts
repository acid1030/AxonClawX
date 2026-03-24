/**
 * 连接池工具技能
 * 
 * 功能:
 * 1. 连接创建 - 按需创建新连接
 * 2. 连接复用 - 从池中获取空闲连接
 * 3. 连接回收 - 释放连接回池或销毁
 * 
 * @module skills/pool-utils
 */

// ==================== 类型定义 ====================

/**
 * 连接接口
 * 所有可池化的连接必须实现此接口
 */
export interface Connection<T = any> {
  /** 连接唯一标识 */
  id: string;
  /** 连接创建时间戳 */
  createdAt: number;
  /** 最后使用时间戳 */
  lastUsedAt: number;
  /** 连接是否可用 */
  isAlive: boolean;
  /** 连接实际对象 */
  resource: T;
  /** 使用次数 */
  useCount: number;
}

/**
 * 连接工厂接口
 * 用于创建新连接
 */
export interface ConnectionFactory<T> {
  /** 创建新连接 */
  create(): Promise<T>;
  /** 验证连接是否存活 */
  validate?(resource: T): Promise<boolean>;
  /** 销毁连接 */
  destroy?(resource: T): Promise<void>;
}

/**
 * 连接池配置
 */
export interface PoolConfig {
  /** 最小连接数 (默认: 0) */
  min?: number;
  /** 最大连接数 (默认: 10) */
  max?: number;
  /** 连接空闲超时时间 (毫秒，默认: 5 分钟) */
  idleTimeout?: number;
  /** 连接最大生命周期 (毫秒，默认: 30 分钟) */
  maxLifetime?: number;
  /** 获取连接超时时间 (毫秒，默认: 10 秒) */
  acquireTimeout?: number;
  /** 是否预先创建最小连接数 (默认: false) */
  eagerCreate?: boolean;
}

/**
 * 连接池统计信息
 */
export interface PoolStats {
  /** 池中总连接数 */
  total: number;
  /** 空闲连接数 */
  idle: number;
  /** 正在使用的连接数 */
  active: number;
  /** 等待获取连接的队列长度 */
  waiting: number;
  /** 累计创建的连接数 */
  created: number;
  /** 累计销毁的连接数 */
  destroyed: number;
}

// ==================== 连接池类 ====================

/**
 * 通用连接池
 * 
 * 提供连接的创建、复用、回收功能
 * 支持并发控制、超时处理、健康检查
 * 
 * @template T - 连接资源类型
 * 
 * @example
 * ```typescript
 * // 创建数据库连接池
 * const pool = new ConnectionPool<DatabaseConnection>({
 *   min: 2,
 *   max: 10,
 *   idleTimeout: 300000,
 *   maxLifetime: 1800000
 * });
 * 
 * // 使用连接
 * const conn = await pool.acquire();
 * try {
 *   await conn.query('SELECT * FROM users');
 * } finally {
 *   await pool.release(conn);
 * }
 * 
 * // 或使用自动管理
 * await pool.use(async (conn) => {
 *   await conn.query('SELECT * FROM users');
 * });
 * ```
 */
export class ConnectionPool<T = any> {
  private factory: ConnectionFactory<T>;
  private config: Required<PoolConfig>;
  private idleConnections: Connection<T>[] = [];
  private activeConnections: Map<string, Connection<T>> = new Map();
  private waitQueue: Array<{
    resolve: (conn: Connection<T>) => void;
    reject: (err: Error) => void;
    timeout?: NodeJS.Timeout;
  }> = [];
  private stats: PoolStats = {
    total: 0,
    idle: 0,
    active: 0,
    waiting: 0,
    created: 0,
    destroyed: 0
  };
  private idleCheckTimer?: NodeJS.Timeout;
  private isClosed = false;

  /**
   * 创建连接池
   * @param factory - 连接工厂
   * @param config - 池配置
   */
  constructor(factory: ConnectionFactory<T>, config: PoolConfig = {}) {
    this.factory = factory;
    this.config = {
      min: config.min ?? 0,
      max: config.max ?? 10,
      idleTimeout: config.idleTimeout ?? 300000,
      maxLifetime: config.maxLifetime ?? 1800000,
      acquireTimeout: config.acquireTimeout ?? 10000,
      eagerCreate: config.eagerCreate ?? false
    };

    if (this.config.min < 0 || this.config.max <= 0 || this.config.min > this.config.max) {
      throw new Error('Invalid pool configuration: min/max must be positive and min <= max');
    }

    if (this.config.eagerCreate && this.config.min > 0) {
      this._initializeMinConnections();
    }

    this._startIdleChecker();
  }

  /**
   * 初始化最小连接数
   */
  private async _initializeMinConnections(): Promise<void> {
    const createPromises: Promise<void>[] = [];
    for (let i = 0; i < this.config.min; i++) {
      createPromises.push(this._createConnection());
    }
    await Promise.all(createPromises);
  }

  /**
   * 创建新连接
   */
  private async _createConnection(): Promise<Connection<T>> {
    const resource = await this.factory.create();
    const now = Date.now();
    const connection: Connection<T> = {
      id: this._generateId(),
      createdAt: now,
      lastUsedAt: now,
      isAlive: true,
      resource,
      useCount: 0
    };
    this.stats.created++;
    this.stats.total++;
    return connection;
  }

  /**
   * 生成唯一连接 ID
   */
  private _generateId(): string {
    return `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 启动空闲检查器
   */
  private _startIdleChecker(): void {
    this.idleCheckTimer = setInterval(() => {
      this._checkIdleConnections();
    }, Math.min(this.config.idleTimeout / 2, 30000));
  }

  /**
   * 检查并清理空闲连接
   */
  private _checkIdleConnections(): void {
    const now = Date.now();
    const toRemove: Connection<T>[] = [];

    for (const conn of this.idleConnections) {
      const idleTime = now - conn.lastUsedAt;
      const lifetime = now - conn.createdAt;

      if (idleTime > this.config.idleTimeout || lifetime > this.config.maxLifetime) {
        toRemove.push(conn);
      }
    }

    if (toRemove.length > 0 && this.stats.total - toRemove.length >= this.config.min) {
      for (const conn of toRemove) {
        this._removeConnection(conn);
      }
    }
  }

  /**
   * 移除并销毁连接
   */
  private async _removeConnection(conn: Connection<T>): Promise<void> {
    const index = this.idleConnections.indexOf(conn);
    if (index > -1) {
      this.idleConnections.splice(index, 1);
    }
    this.activeConnections.delete(conn.id);
    this.stats.total--;

    if (this.factory.destroy) {
      try {
        await this.factory.destroy(conn.resource);
      } catch (err) {
        console.error('Error destroying connection:', err);
      }
    }
    this.stats.destroyed++;
  }

  /**
   * 从池中获取连接
   * @returns 连接对象
   */
  async acquire(): Promise<Connection<T>> {
    if (this.isClosed) {
      throw new Error('Pool is closed');
    }

    const now = Date.now();

    // 1. 尝试从空闲池获取
    while (this.idleConnections.length > 0) {
      const conn = this.idleConnections.shift()!;
      
      // 检查连接是否过期
      if (now - conn.createdAt > this.config.maxLifetime) {
        await this._removeConnection(conn);
        continue;
      }

      // 检查连接是否健康
      if (this.factory.validate) {
        const isValid = await this.factory.validate(conn.resource);
        if (!isValid) {
          await this._removeConnection(conn);
          continue;
        }
      }

      // 复用连接
      conn.lastUsedAt = now;
      conn.useCount++;
      this.activeConnections.set(conn.id, conn);
      this.stats.idle--;
      this.stats.active++;
      return conn;
    }

    // 2. 尝试创建新连接
    if (this.stats.total < this.config.max) {
      const conn = await this._createConnection();
      conn.useCount = 1;
      this.activeConnections.set(conn.id, conn);
      this.stats.active++;
      return conn;
    }

    // 3. 等待可用连接
    return new Promise<Connection<T>>((resolve, reject) => {
      const timeout = setTimeout(() => {
        const index = this.waitQueue.findIndex(w => w.resolve === resolve);
        if (index > -1) {
          this.waitQueue.splice(index, 1);
          this.stats.waiting--;
          reject(new Error('Connection pool acquire timeout'));
        }
      }, this.config.acquireTimeout);

      this.waitQueue.push({ resolve, reject, timeout });
      this.stats.waiting++;
    });
  }

  /**
   * 释放连接回池
   * @param conn - 要释放的连接
   */
  async release(conn: Connection<T>): Promise<void> {
    if (this.isClosed) {
      await this._removeConnection(conn);
      return;
    }

    this.activeConnections.delete(conn.id);
    this.stats.active--;

    // 如果有等待者，直接转移连接
    if (this.waitQueue.length > 0) {
      const waiter = this.waitQueue.shift()!;
      if (waiter.timeout) clearTimeout(waiter.timeout);
      
      conn.lastUsedAt = Date.now();
      conn.useCount++;
      this.activeConnections.set(conn.id, conn);
      this.stats.active++;
      waiter.resolve(conn);
      return;
    }

    // 检查连接是否应该被销毁
    const now = Date.now();
    if (now - conn.createdAt > this.config.maxLifetime || !conn.isAlive) {
      await this._removeConnection(conn);
      return;
    }

    // 返回空闲池
    conn.lastUsedAt = now;
    this.idleConnections.push(conn);
    this.stats.idle++;
  }

  /**
   * 使用连接 (自动获取和释放)
   * @param fn - 使用连接的函数
   * @returns 函数返回值
   */
  async use<R>(fn: (conn: Connection<T>) => Promise<R>): Promise<R> {
    const conn = await this.acquire();
    try {
      return await fn(conn);
    } finally {
      await this.release(conn);
    }
  }

  /**
   * 获取池统计信息
   */
  getStats(): PoolStats {
    return { ...this.stats };
  }

  /**
   * 关闭连接池
   * 销毁所有连接
   */
  async close(): Promise<void> {
    this.isClosed = true;
    
    if (this.idleCheckTimer) {
      clearInterval(this.idleCheckTimer);
      this.idleCheckTimer = undefined;
    }

    // 拒绝所有等待者
    for (const waiter of this.waitQueue) {
      if (waiter.timeout) clearTimeout(waiter.timeout);
      waiter.reject(new Error('Pool is closed'));
    }
    this.waitQueue = [];
    this.stats.waiting = 0;

    // 销毁所有连接
    const allConnections = [...this.idleConnections, ...Array.from(this.activeConnections.values())];
    for (const conn of allConnections) {
      await this._removeConnection(conn);
    }
  }

  /**
   * 检查池是否已关闭
   */
  isClosedPool(): boolean {
    return this.isClosed;
  }
}

// ==================== 便捷工厂函数 ====================

/**
 * 创建简单的连接池
 * 
 * @param createFn - 创建连接的函数
 * @param config - 池配置
 * @returns 连接池实例
 * 
 * @example
 * ```typescript
 * const pool = createPool(
 *   async () => new DatabaseConnection(),
 *   { min: 2, max: 10 }
 * );
 * ```
 */
export function createPool<T>(
  createFn: () => Promise<T>,
  config?: PoolConfig
): ConnectionPool<T> {
  return new ConnectionPool<T>(
    { create: createFn },
    config
  );
}

/**
 * 创建带验证的连接池
 * 
 * @param createFn - 创建连接的函数
 * @param validateFn - 验证连接的函数
 * @param config - 池配置
 * @returns 连接池实例
 * 
 * @example
 * ```typescript
 * const pool = createPoolWithValidation(
 *   async () => new DatabaseConnection(),
 *   async (conn) => await conn.ping(),
 *   { min: 2, max: 10 }
 * );
 * ```
 */
export function createPoolWithValidation<T>(
  createFn: () => Promise<T>,
  validateFn: (resource: T) => Promise<boolean>,
  config?: PoolConfig
): ConnectionPool<T> {
  return new ConnectionPool<T>(
    { create: createFn, validate: validateFn },
    config
  );
}

// ==================== 使用示例 ====================

/**
 * 使用示例代码
 * 
 * @example
 * ```typescript
 * import { ConnectionPool, createPool, createPoolWithValidation } from './pool-utils-skill';
 * 
 * // ==================== 示例 1: 数据库连接池 ====================
 * 
 * interface DBConnection {
 *   query(sql: string): Promise<any[]>;
 *   ping(): Promise<boolean>;
 *   close(): Promise<void>;
 * }
 * 
 * const dbPool = createPoolWithValidation<DBConnection>(
 *   async () => {
 *     // 创建数据库连接
 *     const conn = await createDatabaseConnection();
 *     return conn;
 *   },
 *   async (conn) => {
 *     // 验证连接是否存活
 *     return await conn.ping();
 *   },
 *   {
 *     min: 2,
 *     max: 10,
 *     idleTimeout: 300000,    // 5 分钟
 *     maxLifetime: 1800000,   // 30 分钟
 *     acquireTimeout: 10000   // 10 秒
 *   }
 * );
 * 
 * // 使用方式 A: 手动管理
 * const conn = await dbPool.acquire();
 * try {
 *   const results = await conn.resource.query('SELECT * FROM users');
 *   console.log(results);
 * } finally {
 *   await dbPool.release(conn);
 * }
 * 
 * // 使用方式 B: 自动管理 (推荐)
 * const results = await dbPool.use(async (conn) => {
 *   return await conn.resource.query('SELECT * FROM users');
 * });
 * 
 * // 查看池状态
 * console.log(dbPool.getStats());
 * // { total: 3, idle: 2, active: 1, waiting: 0, created: 3, destroyed: 0 }
 * 
 * // 关闭池
 * await dbPool.close();
 * 
 * // ==================== 示例 2: HTTP 客户端池 ====================
 * 
 * const httpPool = createPool(async () => {
 *   return new HttpClient({
 *     baseURL: 'https://api.example.com',
 *     timeout: 5000
 *   });
 * }, {
 *   min: 1,
 *   max: 5,
 *   eagerCreate: true  // 预先创建最小连接数
 * });
 * 
 * const response = await httpPool.use(async (conn) => {
 *   return await conn.resource.get('/users');
 * });
 * 
 * // ==================== 示例 3: WebSocket 连接池 ====================
 * 
 * interface WSConnection {
 *   send(data: string): void;
 *   on(event: string, handler: Function): void;
 *   close(): void;
 * }
 * 
 * const wsPool = new ConnectionPool<WSConnection>({
 *   create: async () => {
 *     return new WebSocket('wss://realtime.example.com');
 *   },
 *   validate: async (ws) => {
 *     return ws.readyState === WebSocket.OPEN;
 *   },
 *   destroy: async (ws) => {
 *     ws.close();
 *   }
 * }, {
 *   min: 1,
 *   max: 3
 * });
 * 
 * await wsPool.use(async (conn) => {
 *   conn.resource.send(JSON.stringify({ type: 'subscribe', channel: 'updates' }));
 * });
 * 
 * // ==================== 示例 4: 自定义资源池 ====================
 * 
 * // 任何可重用的资源都可以使用连接池
 * const fileHandlePool = createPool(async () => {
 *   return await fs.open('/tmp/cache.db', 'r+');
 * }, {
 *   min: 0,
 *   max: 4,
 *   idleTimeout: 60000
 * });
 * 
 * await fileHandlePool.use(async (conn) => {
 *   await fs.read(conn.resource, buffer, 0, buffer.length, 0);
 * });
 * ```
 */
export const examples = `
// 完整示例请参见上方的 JSDoc 注释
// 或查看本文件末尾的 examples 常量
`;
