/**
 * AxonClaw 数据库 Schema
 * 参考 ClawDeckX internal/database
 */

export const SCHEMA_SQL = `
-- 告警表
CREATE TABLE IF NOT EXISTS alerts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  alert_id TEXT,
  risk TEXT,
  message TEXT,
  detail TEXT,
  notified INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_alerts_created_at ON alerts(created_at);
CREATE INDEX IF NOT EXISTS idx_alerts_risk ON alerts(risk);
CREATE INDEX IF NOT EXISTS idx_alerts_alert_id ON alerts(alert_id);

-- 设置表（key-value，用于数据库路径等配置）
CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT UNIQUE NOT NULL,
  value TEXT,
  updated_at TEXT DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_settings_key ON settings(key);

-- 活动表（Gateway 事件等）
CREATE TABLE IF NOT EXISTS activities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id TEXT,
  timestamp TEXT,
  category TEXT,
  risk TEXT,
  summary TEXT,
  detail TEXT,
  source TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_activities_timestamp ON activities(timestamp);
CREATE INDEX IF NOT EXISTS idx_activities_category ON activities(category);
`;
