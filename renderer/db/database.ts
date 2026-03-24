/**
 * AxonClaw SQLite Database Layer
 * 数据库初始化与表结构定义
 */

import Database from 'better-sqlite3';
import path from 'path';

export class AxonDatabase {
  private db: Database.Database;
  private static instance: AxonDatabase;

  private constructor(dbPath?: string) {
    const defaultPath = path.join(process.cwd(), 'axonclaw.db');
    this.db = new Database(dbPath || defaultPath);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
  }

  /**
   * 获取单例实例
   */
  public static getInstance(dbPath?: string): AxonDatabase {
    if (!AxonDatabase.instance) {
      AxonDatabase.instance = new AxonDatabase(dbPath);
      AxonDatabase.instance.initializeTables();
    }
    return AxonDatabase.instance;
  }

  /**
   * 获取数据库实例
   */
  public getDatabase(): Database.Database {
    return this.db;
  }

  /**
   * 初始化所有数据表
   */
  private initializeTables(): void {
    this.createAgentsTable();
    this.createSessionsTable();
    this.createMessagesTable();
    this.createChannelsTable();
    this.createSkillsTable();
    this.createUserPreferencesTable();
    this.createMemoriesTable();
  }

  /**
   * 创建 agents 表 - Agent 配置
   */
  private createAgentsTable(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS agents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        type TEXT NOT NULL DEFAULT 'general',
        model TEXT,
        status TEXT DEFAULT 'inactive',
        config TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('[DB] agents table initialized');
  }

  /**
   * 创建 sessions 表 - 会话记录
   */
  private createSessionsTable(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        agent_id INTEGER,
        title TEXT,
        status TEXT DEFAULT 'active',
        started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        ended_at DATETIME,
        metadata TEXT,
        FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE SET NULL
      )
    `);
    console.log('[DB] sessions table initialized');
  }

  /**
   * 创建 messages 表 - 消息历史
   */
  private createMessagesTable(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id INTEGER NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        metadata TEXT,
        FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
      )
    `);
    console.log('[DB] messages table initialized');
  }

  /**
   * 创建 channels 表 - Channel 配置
   */
  private createChannelsTable(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS channels (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        type TEXT NOT NULL,
        config TEXT,
        status TEXT DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('[DB] channels table initialized');
  }

  /**
   * 创建 skills 表 - 技能安装
   */
  private createSkillsTable(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS skills (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        description TEXT,
        location TEXT,
        enabled INTEGER DEFAULT 1,
        installed_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('[DB] skills table initialized');
  }

  /**
   * 创建 user_preferences 表 - 用户偏好
   */
  private createUserPreferencesTable(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS user_preferences (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key TEXT NOT NULL UNIQUE,
        value TEXT NOT NULL,
        category TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('[DB] user_preferences table initialized');
  }

  private createMemoriesTable(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS memories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        content TEXT NOT NULL,
        type TEXT DEFAULT 'general',
        importance REAL DEFAULT 0.5,
        tags TEXT DEFAULT '[]',
        embedding BLOB,
        metadata TEXT DEFAULT '{}',
        created_at INTEGER DEFAULT (strftime('%s', 'now')),
        accessed_at INTEGER DEFAULT (strftime('%s', 'now')),
        access_count INTEGER DEFAULT 0
      );
      CREATE INDEX IF NOT EXISTS idx_memories_type ON memories(type);
      CREATE INDEX IF NOT EXISTS idx_memories_importance ON memories(importance DESC);
      CREATE INDEX IF NOT EXISTS idx_memories_created ON memories(created_at DESC);
    `);
    console.log('[DB] memories table initialized');
  }

  /**
   * 关闭数据库连接
   */
  public close(): void {
    this.db.close();
  }
}

// 导出单例
export const db = AxonDatabase.getInstance();
export default db;
