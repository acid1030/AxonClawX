/**
 * AxonClaw 启动前配置（Bootstrap Config）
 * 在数据库初始化之前读取，用于数据库路径等需在启动时确定的配置
 * 存储于 ~/.axonclaw/config.json
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const CONFIG_DIR = path.join(os.homedir(), '.axonclaw');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

export interface BootstrapConfig {
  /** SQLite 数据库文件路径 */
  dbPath?: string;
}

function ensureConfigDir(): void {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

/**
 * 加载启动配置
 */
export function loadBootstrapConfig(): BootstrapConfig {
  const envPath = process.env.AXONCLAW_DB_PATH;
  if (envPath) {
    return { dbPath: envPath };
  }
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const raw = fs.readFileSync(CONFIG_FILE, 'utf8');
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      return {
        dbPath: typeof parsed.dbPath === 'string' ? parsed.dbPath : undefined,
      };
    }
  } catch (err) {
    console.warn('[BootstrapConfig] Load failed:', err);
  }
  return {};
}

/**
 * 保存启动配置（仅写入文件，环境变量优先于文件）
 */
export function saveBootstrapConfig(config: BootstrapConfig): void {
  ensureConfigDir();
  let existing: BootstrapConfig = {};
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const raw = fs.readFileSync(CONFIG_FILE, 'utf8');
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      existing = {
        dbPath: typeof parsed.dbPath === 'string' ? parsed.dbPath : undefined,
      };
    }
  } catch {
    /* ignore */
  }
  const merged: BootstrapConfig = { ...existing, ...config };
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(merged, null, 2), 'utf8');
}

/**
 * 获取配置文件路径（用于 UI 展示）
 */
export function getConfigFilePath(): string {
  return CONFIG_FILE;
}
