/**
 * SQLite 连接池管理模块
 * 
 * 功能:
 * 1. 连接池管理 - 维护固定数量的数据库连接
 * 2. 自动重连 - 检测连接失效并自动重建
 * 3. 查询超时 - 防止长时间阻塞的查询
 * 
 * @author KAEL
 * @version 1.0.0
 */

import Database, { Database as DatabaseType } from 'better-sqlite3';
import * as path from 'path';

// ==================== 类型定义 ====================

export interface PoolConfig {
  /** 数据库文件路径 */
  dbPath?: string;
  /** 连接池大小 (默认: 10) */
  poolSize?: number;
  /** 获取连接超时时间 ms (默认: 5000) */
  acquireTimeout?: number;
  /** 查询超时时间 ms (默认: 30000) */
  queryTimeout?: number;
  /** 连接健康检查间隔 ms (默认: 60000) */
  healthCheckInterval?: number;
  /** 连接最大空闲时间 ms (默认: 300000 = 5 分钟) */
  idleTimeout?: number;
  /** 是否启用 WAL 模式 (默认: true) */
  enableWAL?: boolean;
  /** 是否启用外键约束 (默认: true) */
  enableForeignKeys?: boolean;
}

export interface PoolStats {
  /** 池子总大小 */
  totalSize: number;
  /** 可用连接数 */
  available: number;
  /** 正在使用的连接数 */
  inUse: number;
  /** 等待获取连接的队列长度 */
  waiting: number;
  /** 累计创建的连接总数 */
  totalCreated: number;
  /** 累计关闭的连接总数 */
  totalClosed: number;
  /** 累计查询超时次数 */
  queryTimeouts: number;
  /** 累计重连次数 */
  reconnections: number;
}

export interface QueryOptions {
  /** 自定义超时时间 ms */
  timeout?: number;
  /** 事务模式 */
  transaction?: boolean;
}

// ==================== 错误类定义 ====================

export class PoolError extends Error {
  constructor(
    message: string,
    public code: 'POOL_EXHAUSTED' | 'CONNECTION_LOST' | 'QUERY_TIMEOUT' | 'POOL_CLOSED'
  ) {
    super(message);
    this.name = 'PoolError';
  }
}

// ==================== 连接包装器 ====================

class PooledConnection {
  public db: Database.Database;
  public lastUsed: number = Date.now();
  public inUse: boolean = false;
  public id: number;
  private healthCheckInterval?: NodeJS.Timeout;

  constructor(id: number, dbPath: string, config: PoolConfig) {
    this.id = id;
    this.db = new Database(dbPath);
    
    // 配置数据库
    if (config.enableWAL !== false) {
      this.db.pragma('journal_mode = WAL');
    }
    if (config.enableForeignKeys !== false) {
      this.db.pragma('foreign_keys = ON');
    }
    
    // 设置繁忙超时
    this.db.pragma('busy_timeout = 5000');
    
    this.startHealthCheck(config.healthCheckInterval || 60000);
  }

  private startHealthCheck(interval: number) {
    this.healthCheckInterval = setInterval(() => {
      try {
        this.db.prepare('SELECT 1').get();
        this.lastUsed = Date.now();
      } catch (error) {
        console.error(`[DB-Pool] Connection ${this.id} health check failed:`, error);
      }
    }, interval);
    
    // 不阻止进程退出
    this.healthCheckInterval.unref();
  }

  public isHealthy(): boolean {
    try {
      this.db.prepare('SELECT 1').get();
      return true;
    } catch {
      return false;
    }
  }

  public close(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    try {
      this.db.close();
    } catch (error) {
      console.error(`[DB-Pool] Error closing connection ${this.id}:`, error);
    }
  }
}

// ==================== 连接池主类 ====================

export class DatabasePool {
  private connections: PooledConnection[] = [];
  private availableConnections: PooledConnection[] = [];
  private waitQueue: Array<{
    resolve: (conn: PooledConnection) => void;
    reject: (error: Error) => void;
    timeout: NodeJS.Timeout;
  }> = [];
  
  private config: Required<PoolConfig>;
  private totalCreated = 0;
  private totalClosed = 0;
  private queryTimeouts = 0;
  private reconnections = 0;
  private isClosed = false;
  private idleCheckInterval?: NodeJS.Timeout;

  constructor(config: PoolConfig = {}) {
    this.config = {
      dbPath: config.dbPath || path.join(process.cwd(), 'axonclaw.db'),
      poolSize: config.poolSize || 10,
      acquireTimeout: config.acquireTimeout || 5000,
      queryTimeout: config.queryTimeout || 30000,
      healthCheckInterval: config.healthCheckInterval || 60000,
      idleTimeout: config.idleTimeout || 300000,
      enableWAL: config.enableWAL !== false,
      enableForeignKeys: config.enableForeignKeys !== false,
    };

    this.initializePool();
    this.startIdleCheck();
    
    console.log(`[DB-Pool] Initialized with ${this.config.poolSize} connections`);
  }

  // ==================== 初始化 ====================

  private initializePool(): void {
    for (let i = 0; i < this.config.poolSize; i++) {
      this.createConnection(i);
    }
  }

  private createConnection(id: number): PooledConnection {
    const conn = new PooledConnection(id, this.config.dbPath, this.config);
    this.connections.push(conn);
    this.availableConnections.push(conn);
    this.totalCreated++;
    return conn;
  }

  private startIdleCheck(): void {
    this.idleCheckInterval = setInterval(() => {
      const now = Date.now();
      for (const conn of this.availableConnections) {
        if (now - conn.lastUsed > this.config.idleTimeout) {
          // 连接空闲超时，重建
          conn.close();
          this.totalClosed++;
          this.availableConnections = this.availableConnections.filter(c => c !== conn);
          this.connections = this.connections.filter(c => c !== conn);
          this.createConnection(conn.id);
        }
      }
    }, Math.min(this.config.idleTimeout / 2, 60000));
    
    this.idleCheckInterval.unref();
  }

  // ==================== 连接获取/释放 ====================

  public async getConnection(): Promise<PooledConnection> {
    if (this.isClosed) {
      throw new PoolError('Connection pool is closed', 'POOL_CLOSED');
    }

    // 尝试从可用列表获取
    while (this.availableConnections.length > 0) {
      const conn = this.availableConnections.shift()!;
      
      // 检查连接健康状态
      if (!conn.isHealthy()) {
        console.log(`[DB-Pool] Connection ${conn.id} unhealthy, reconnecting...`);
        conn.close();
        this.totalClosed++;
        this.reconnections++;
        const newConn = this.createConnection(conn.id);
        this.connections = this.connections.filter(c => c !== conn);
        return newConn;
      }
      
      conn.inUse = true;
      conn.lastUsed = Date.now();
      return conn;
    }

    // 没有可用连接，等待
    return new Promise<PooledConnection>((resolve, reject) => {
      const timeout = setTimeout(() => {
        // 从队列中移除
        this.waitQueue = this.waitQueue.filter(item => item.timeout !== timeout);
        reject(new PoolError('Timeout waiting for available connection', 'POOL_EXHAUSTED'));
      }, this.config.acquireTimeout);

      this.waitQueue.push({ resolve, reject, timeout });
    });
  }

  public releaseConnection(conn: PooledConnection): void {
    if (this.isClosed) {
      conn.close();
      return;
    }

    conn.inUse = false;
    conn.lastUsed = Date.now();

    // 如果有等待的请求，直接分配
    if (this.waitQueue.length > 0) {
      const waiter = this.waitQueue.shift()!;
      clearTimeout(waiter.timeout);
      conn.inUse = true;
      waiter.resolve(conn);
      return;
    }

    // 放回可用池
    if (!this.availableConnections.includes(conn)) {
      this.availableConnections.push(conn);
    }
  }

  // ==================== 查询执行 ====================

  public async query<T = any>(
    sql: string,
    params?: any[],
    options: QueryOptions = {}
  ): Promise<T[]> {
    const conn = await this.getConnection();
    const timeout = options.timeout || this.config.queryTimeout;

    try {
      return await this.executeWithTimeout(conn, sql, params, timeout);
    } catch (error) {
      if (error instanceof PoolError && error.code === 'QUERY_TIMEOUT') {
        this.queryTimeouts++;
      }
      throw error;
    } finally {
      this.releaseConnection(conn);
    }
  }

  private executeWithTimeout<T = any>(
    conn: PooledConnection,
    sql: string,
    params: any[] = [],
    timeout: number
  ): Promise<T[]> {
    return new Promise((resolve, reject) => {
      let completed = false;

      const timer = setTimeout(() => {
        if (!completed) {
          completed = true;
          reject(new PoolError(`Query timeout after ${timeout}ms`, 'QUERY_TIMEOUT'));
        }
      }, timeout);

      try {
        const stmt = conn.db.prepare(sql);
        let result: any;

        // 判断查询类型
        const upperSql = sql.trim().toUpperCase();
        if (upperSql.startsWith('SELECT')) {
          result = params.length > 0 ? stmt.all(...params) : stmt.all();
        } else if (upperSql.startsWith('INSERT')) {
          const info = params.length > 0 ? stmt.run(...params) : stmt.run();
          result = { lastInsertRowid: info.lastInsertRowid, changes: info.changes };
        } else if (upperSql.startsWith('UPDATE') || upperSql.startsWith('DELETE')) {
          const info = params.length > 0 ? stmt.run(...params) : stmt.run();
          result = { changes: info.changes };
        } else {
          // 其他语句
          params.length > 0 ? stmt.run(...params) : stmt.run();
          result = [];
        }

        completed = true;
        clearTimeout(timer);
        resolve(result);
      } catch (error) {
        if (!completed) {
          completed = true;
          clearTimeout(timer);
        }
        reject(error);
      }
    });
  }

  public async queryOne<T = any>(
    sql: string,
    params?: any[],
    options: QueryOptions = {}
  ): Promise<T | undefined> {
    const results = await this.query<T>(sql, params, options);
    return results[0];
  }

  public async execute(
    sql: string,
    params?: any[],
    options: QueryOptions = {}
  ): Promise<{ changes: number; lastInsertRowid?: number }> {
    const conn = await this.getConnection();
    const timeout = options.timeout || this.config.queryTimeout;

    try {
      return await this.executeWithTimeout(conn, sql, params, timeout) as any;
    } finally {
      this.releaseConnection(conn);
    }
  }

  // ==================== 事务支持 ====================

  public async transaction<T>(
    fn: (db: Database.Database) => Promise<T>,
    options: QueryOptions = {}
  ): Promise<T> {
    const conn = await this.getConnection();
    const timeout = options.timeout || this.config.queryTimeout;

    try {
      // 开始事务
      await this.executeWithTimeout(conn, 'BEGIN IMMEDIATE', [], timeout);
      
      const result = await fn(conn.db);
      
      // 提交事务
      await this.executeWithTimeout(conn, 'COMMIT', [], timeout);
      
      return result;
    } catch (error) {
      // 回滚事务
      try {
        await this.executeWithTimeout(conn, 'ROLLBACK', [], timeout);
      } catch (rollbackError) {
        console.error('[DB-Pool] Rollback failed:', rollbackError);
      }
      throw error;
    } finally {
      this.releaseConnection(conn);
    }
  }

  // ==================== 统计信息 ====================

  public getStats(): PoolStats {
    return {
      totalSize: this.config.poolSize,
      available: this.availableConnections.length,
      inUse: this.connections.filter(c => c.inUse).length,
      waiting: this.waitQueue.length,
      totalCreated: this.totalCreated,
      totalClosed: this.totalClosed,
      queryTimeouts: this.queryTimeouts,
      reconnections: this.reconnections,
    };
  }

  // ==================== 清理 ====================

  public async close(): Promise<void> {
    this.isClosed = true;
    
    // 拒绝所有等待的请求
    for (const waiter of this.waitQueue) {
      clearTimeout(waiter.timeout);
      waiter.reject(new PoolError('Connection pool is closing', 'POOL_CLOSED'));
    }
    this.waitQueue = [];

    // 关闭所有连接
    for (const conn of this.connections) {
      conn.close();
    }
    this.connections = [];
    this.availableConnections = [];

    if (this.idleCheckInterval) {
      clearInterval(this.idleCheckInterval);
    }

    console.log('[DB-Pool] Closed');
  }
}

// ==================== 单例模式 ====================

let globalPool: DatabasePool | undefined;

export function getPool(config?: PoolConfig): DatabasePool {
  if (!globalPool) {
    globalPool = new DatabasePool(config);
  }
  return globalPool;
}

export function resetPool(): void {
  if (globalPool) {
    globalPool.close();
    globalPool = undefined;
  }
}

// ==================== 便捷函数 ====================

export async function query<T = any>(
  sql: string,
  params?: any[],
  options?: QueryOptions
): Promise<T[]> {
  return getPool().query(sql, params, options);
}

export async function queryOne<T = any>(
  sql: string,
  params?: any[],
  options?: QueryOptions
): Promise<T | undefined> {
  return getPool().queryOne(sql, params, options);
}

export async function execute(
  sql: string,
  params?: any[],
  options?: QueryOptions
): Promise<{ changes: number; lastInsertRowid?: number }> {
  return getPool().execute(sql, params, options);
}

export async function transaction<T>(
  fn: (db: Database.Database) => Promise<T>,
  options?: QueryOptions
): Promise<T> {
  return getPool().transaction(fn, options);
}

export default getPool;
