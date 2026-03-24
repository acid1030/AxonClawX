/**
 * AxonClaw 数据库连接管理
 * 默认 SQLite，使用 better-sqlite3
 */

import Database from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';
import { getDefaultConfig, getDataDir } from './config';
import { SCHEMA_SQL } from './schema';

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    throw new Error('[Database] Not initialized. Call initDatabase() first.');
  }
  return db;
}

export function isInitialized(): boolean {
  return db !== null;
}

/**
 * 初始化数据库
 * @param config 可选配置，不传则使用默认
 */
export function initDatabase(config?: { sqlitePath?: string }): void {
  if (db) {
    console.log('[Database] Already initialized');
    return;
  }

  const cfg = getDefaultConfig();
  const dbPath = config?.sqlitePath ?? cfg.sqlitePath ?? path.join(getDataDir(), 'AxonClaw.db');

  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  try {
    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    db.exec(SCHEMA_SQL);
    console.log('[Database] Initialized SQLite at', dbPath);
  } catch (err) {
    console.error('[Database] Init failed:', err);
    throw err;
  }
}

/**
 * 关闭数据库连接
 */
export function closeDatabase(): void {
  if (db) {
    try {
      db.close();
    } catch (err) {
      console.error('[Database] Close error:', err);
    }
    db = null;
    console.log('[Database] Closed');
  }
}
