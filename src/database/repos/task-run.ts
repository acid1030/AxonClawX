import { getDb } from '../db';

export type TaskRunStatus = 'pending' | 'running' | 'completed' | 'failed';
export type TaskRunSource = 'multi-agent' | 'chat' | 'external';

export interface TaskRunRecordEntity {
  localId: string;
  source: TaskRunSource;
  sessionKey: string;
  runId: string | null;
  task: string;
  status: TaskRunStatus;
  createdAt: number;
  updatedAt: number;
  events: unknown[];
  lastSignature?: string;
  agentId?: string;
  result?: string;
  childRunIds?: string[];
}

interface TaskRunRow {
  local_id: string;
  source: string;
  session_key: string;
  run_id: string | null;
  task: string;
  status: string;
  created_at: number;
  updated_at: number;
  events_json: string;
  last_signature: string | null;
  agent_id: string | null;
  result: string | null;
  child_run_ids_json?: string | null;
}

function parseEvents(raw: string): unknown[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function parseChildRunIds(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map((v) => String(v)).filter(Boolean) : [];
  } catch {
    return [];
  }
}

function normalizeStatus(status: string): TaskRunStatus {
  if (status === 'pending' || status === 'running' || status === 'completed' || status === 'failed') return status;
  return 'running';
}

function mapRow(row: TaskRunRow): TaskRunRecordEntity {
  return {
    localId: row.local_id,
    source: (row.source || 'external') as TaskRunSource,
    sessionKey: row.session_key || '',
    runId: row.run_id || null,
    task: row.task || '',
    status: normalizeStatus(row.status),
    createdAt: Number(row.created_at || Date.now()),
    updatedAt: Number(row.updated_at || Date.now()),
    events: parseEvents(row.events_json),
    lastSignature: row.last_signature || undefined,
    agentId: row.agent_id || undefined,
    result: row.result || undefined,
    childRunIds: parseChildRunIds(row.child_run_ids_json),
  };
}

function ensureChildRunIdsColumn(): void {
  const database = getDb();
  const columns = database.prepare(`PRAGMA table_info(task_runs)`).all() as Array<{ name: string }>;
  if (!columns.some((c) => c.name === 'child_run_ids_json')) {
    database.prepare(`ALTER TABLE task_runs ADD COLUMN child_run_ids_json TEXT`).run();
  }
}

export function upsertTaskRun(record: TaskRunRecordEntity): void {
  const database = getDb();
  ensureChildRunIdsColumn();
  const eventsJson = JSON.stringify(Array.isArray(record.events) ? record.events : []);
  const childRunIdsJson = JSON.stringify(Array.isArray(record.childRunIds) ? record.childRunIds : []);
  database.prepare(
    `INSERT INTO task_runs (
      local_id, source, session_key, run_id, task, status,
      created_at, updated_at, events_json, last_signature, agent_id, result, child_run_ids_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(local_id) DO UPDATE SET
      source = excluded.source,
      session_key = excluded.session_key,
      run_id = excluded.run_id,
      task = excluded.task,
      status = excluded.status,
      created_at = excluded.created_at,
      updated_at = excluded.updated_at,
      events_json = excluded.events_json,
      last_signature = excluded.last_signature,
      agent_id = excluded.agent_id,
      result = excluded.result,
      child_run_ids_json = excluded.child_run_ids_json`
  ).run(
    record.localId,
    record.source,
    record.sessionKey,
    record.runId ?? null,
    record.task ?? '',
    record.status,
    record.createdAt,
    record.updatedAt,
    eventsJson,
    record.lastSignature ?? null,
    record.agentId ?? null,
    record.result ?? null,
    childRunIdsJson,
  );
}

export function listTaskRuns(limit = 200, offset = 0): TaskRunRecordEntity[] {
  const database = getDb();
  ensureChildRunIdsColumn();
  const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.min(1000, Math.floor(limit)) : 200;
  const safeOffset = Number.isFinite(offset) && offset > 0 ? Math.floor(offset) : 0;
  const rows = database
    .prepare(
      `SELECT local_id, source, session_key, run_id, task, status, created_at, updated_at, events_json, last_signature, agent_id, result, child_run_ids_json
       FROM task_runs
       ORDER BY updated_at DESC
       LIMIT ? OFFSET ?`
    )
    .all(safeLimit, safeOffset) as TaskRunRow[];
  return rows.map(mapRow);
}

export function deleteTaskRun(localId: string): void {
  const database = getDb();
  database.prepare('DELETE FROM task_runs WHERE local_id = ?').run(localId);
}

export function deleteFinishedTaskRuns(): number {
  const database = getDb();
  const result = database.prepare(`DELETE FROM task_runs WHERE status IN ('completed', 'failed')`).run();
  return Number(result.changes || 0);
}
