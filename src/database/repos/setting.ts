/**
 * 设置 Repository
 * 用于存储数据库路径等可配置项（后续启动配置）
 */

import { getDb } from '../db';

export function getSetting(key: string): string | null {
  const database = getDb();
  const row = database.prepare('SELECT value FROM settings WHERE key = ?').get(key) as {
    value: string | null;
  } | undefined;
  return row?.value ?? null;
}

export function setSetting(key: string, value: string): void {
  const database = getDb();
  database
    .prepare(
      `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
       ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = datetime('now')`
    )
    .run(key, value, value);
}

export function getAllSettings(): Record<string, string> {
  const database = getDb();
  const rows = database.prepare('SELECT key, value FROM settings').all() as Array<{
    key: string;
    value: string;
  }>;
  const result: Record<string, string> = {};
  for (const r of rows) {
    result[r.key] = r.value;
  }
  return result;
}
