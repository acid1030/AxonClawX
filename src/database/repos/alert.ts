/**
 * 告警 Repository
 * 参考 ClawDeckX internal/database/repo_alert.go
 */

import { getDb } from '../db';

export interface Alert {
  id: number;
  alert_id: string;
  risk: string;
  message: string;
  detail: string;
  notified: number;
  created_at: string;
}

export interface AlertFilter {
  page?: number;
  page_size?: number;
  risk?: string;
  start_time?: string;
  end_time?: string;
}

export interface AlertInsert {
  alert_id?: string;
  risk: string;
  message: string;
  detail?: string;
}

export function createAlert(alert: AlertInsert): number {
  const database = getDb();
  const stmt = database.prepare(
    `INSERT INTO alerts (alert_id, risk, message, detail) VALUES (?, ?, ?, ?)`
  );
  const result = stmt.run(
    alert.alert_id ?? '',
    alert.risk,
    alert.message,
    alert.detail ?? ''
  );
  return result.lastInsertRowid as number;
}

export function listAlerts(filter: AlertFilter = {}): { list: Alert[]; total: number } {
  const database = getDb();
  const page = filter.page ?? 1;
  const pageSize = filter.page_size ?? 20;
  const offset = (page - 1) * pageSize;

  let whereClause = '';
  const params: (string | number)[] = [];

  if (filter.risk) {
    whereClause += ' AND risk = ?';
    params.push(filter.risk);
  }
  if (filter.start_time) {
    whereClause += ' AND created_at >= ?';
    params.push(filter.start_time);
  }
  if (filter.end_time) {
    whereClause += ' AND created_at <= ?';
    params.push(filter.end_time);
  }

  const where = whereClause ? `WHERE ${whereClause.slice(5)}` : '';

  const countStmt = database.prepare(`SELECT COUNT(*) as c FROM alerts ${where}`);
  const countRow = countStmt.get(...params) as { c: number };
  const total = countRow?.c ?? 0;

  const listStmt = database.prepare(
    `SELECT id, alert_id, risk, message, detail, notified, created_at FROM alerts ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`
  );
  const rows = listStmt.all(...params, pageSize, offset) as Alert[];

  return { list: rows, total };
}

export function recentAlerts(limit: number): Alert[] {
  const database = getDb();
  const stmt = database.prepare(
    `SELECT id, alert_id, risk, message, detail, notified, created_at FROM alerts ORDER BY created_at DESC LIMIT ?`
  );
  return stmt.all(limit) as Alert[];
}

export function markAlertNotified(id: number): void {
  const database = getDb();
  database.prepare('UPDATE alerts SET notified = 1 WHERE id = ?').run(id);
}

export function markAllAlertsNotified(): void {
  const database = getDb();
  database.prepare('UPDATE alerts SET notified = 1').run();
}

export function countUnreadAlerts(): number {
  const database = getDb();
  const row = database.prepare('SELECT COUNT(*) as c FROM alerts WHERE notified = 0').get() as {
    c: number;
  };
  return row?.c ?? 0;
}

/** 告警汇总统计（ClawDeckX 风格：高/中、1h/24h） */
export function alertSummaryStats(): {
  high: number;
  medium: number;
  count1h: number;
  count24h: number;
} {
  const database = getDb();
  const now = new Date();
  const ts24h = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const ts1h = new Date(now.getTime() - 60 * 60 * 1000).toISOString();

  const highRow = database.prepare('SELECT COUNT(*) as c FROM alerts WHERE risk = ?').get('critical') as { c: number };
  const mediumRow = database.prepare('SELECT COUNT(*) as c FROM alerts WHERE risk = ?').get('warning') as { c: number };
  const count1hRow = database.prepare('SELECT COUNT(*) as c FROM alerts WHERE created_at >= ?').get(ts1h) as { c: number };
  const count24hRow = database.prepare('SELECT COUNT(*) as c FROM alerts WHERE created_at >= ?').get(ts24h) as { c: number };

  return {
    high: highRow?.c ?? 0,
    medium: mediumRow?.c ?? 0,
    count1h: count1hRow?.c ?? 0,
    count24h: count24hRow?.c ?? 0,
  };
}
