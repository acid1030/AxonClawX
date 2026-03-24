/**
 * AxonClaw 数据库配置
 * 默认 SQLite，路径可配置（环境变量 > 配置文件 > 默认）
 */

import * as path from 'path';
import * as os from 'os';
import { loadBootstrapConfig } from './bootstrap-config';

export type DatabaseDriver = 'sqlite' | 'postgres';

export interface DatabaseConfig {
  driver: DatabaseDriver;
  /** SQLite 文件路径 */
  sqlitePath?: string;
  /** PostgreSQL DSN（driver=postgres 时使用） */
  postgresDsn?: string;
}

const DEFAULT_DATA_DIR = path.join(os.homedir(), '.axonclaw', 'data');
const DEFAULT_SQLITE_PATH = path.join(DEFAULT_DATA_DIR, 'AxonClaw.db');

/**
 * 获取默认数据库配置
 * 优先级：环境变量 AXONCLAW_DB_PATH > ~/.axonclaw/config.json > 默认路径
 */
export function getDefaultConfig(): DatabaseConfig {
  const envPath = process.env.AXONCLAW_DB_PATH;
  if (envPath) {
    return { driver: 'sqlite', sqlitePath: envPath };
  }
  const bootstrap = loadBootstrapConfig();
  if (bootstrap.dbPath) {
    return { driver: 'sqlite', sqlitePath: bootstrap.dbPath };
  }
  return { driver: 'sqlite', sqlitePath: DEFAULT_SQLITE_PATH };
}

/**
 * 获取数据目录（用于创建目录等）
 */
export function getDataDir(): string {
  const cfg = getDefaultConfig();
  const dbPath = cfg.sqlitePath ?? DEFAULT_SQLITE_PATH;
  return path.dirname(dbPath);
}
