/**
 * AxonClaw 数据库 Schema
 * 参考 AxonClawX internal/database
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

-- 任务执行记录（任务中心）
CREATE TABLE IF NOT EXISTS task_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  local_id TEXT UNIQUE NOT NULL,
  source TEXT NOT NULL,
  session_key TEXT NOT NULL,
  run_id TEXT,
  task TEXT,
  status TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  events_json TEXT NOT NULL,
  last_signature TEXT,
  agent_id TEXT,
  result TEXT,
  child_run_ids_json TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_task_runs_local_id ON task_runs(local_id);
CREATE INDEX IF NOT EXISTS idx_task_runs_updated_at ON task_runs(updated_at);
CREATE INDEX IF NOT EXISTS idx_task_runs_status ON task_runs(status);
CREATE INDEX IF NOT EXISTS idx_task_runs_run_id ON task_runs(run_id);
CREATE INDEX IF NOT EXISTS idx_task_runs_session_key ON task_runs(session_key);
`;
