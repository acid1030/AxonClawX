/**
 * Sessions Service - 会话记录 CRUD 操作
 */

import { db } from '../db/database';

export interface Session {
  id?: number;
  agent_id?: number;
  title?: string;
  status?: string;
  started_at?: string;
  ended_at?: string;
  metadata?: string;
}

export class SessionsService {
  /**
   * 创建 Session
   */
  public static create(session: Session): number {
    const insert = db.getDatabase().prepare(`
      INSERT INTO sessions (agent_id, title, status, metadata)
      VALUES (?, ?, ?, ?)
    `);
    const result = insert.run(
      session.agent_id || null,
      session.title || null,
      session.status || 'active',
      session.metadata || null
    );
    return result.lastInsertRowid as number;
  }

  /**
   * 查询所有 Sessions
   */
  public static findAll(): Session[] {
    const select = db.getDatabase().prepare('SELECT * FROM sessions ORDER BY started_at DESC');
    return select.all() as Session[];
  }

  /**
   * 根据 ID 查询 Session
   */
  public static findById(id: number): Session | undefined {
    const select = db.getDatabase().prepare('SELECT * FROM sessions WHERE id = ?');
    return select.get(id) as Session | undefined;
  }

  /**
   * 根据 Agent ID 查询 Sessions
   */
  public static findByAgentId(agentId: number): Session[] {
    const select = db.getDatabase().prepare(
      'SELECT * FROM sessions WHERE agent_id = ? ORDER BY started_at DESC'
    );
    return select.all(agentId) as Session[];
  }

  /**
   * 查询活跃 Sessions
   */
  public static findActive(): Session[] {
    const select = db.getDatabase().prepare(
      "SELECT * FROM sessions WHERE status = 'active' ORDER BY started_at DESC"
    );
    return select.all() as Session[];
  }

  /**
   * 更新 Session
   */
  public static update(id: number, session: Partial<Session>): boolean {
    const fields: string[] = [];
    const values: any[] = [];

    if (session.agent_id !== undefined) {
      fields.push('agent_id = ?');
      values.push(session.agent_id);
    }
    if (session.title !== undefined) {
      fields.push('title = ?');
      values.push(session.title);
    }
    if (session.status !== undefined) {
      fields.push('status = ?');
      values.push(session.status);
    }
    if (session.metadata !== undefined) {
      fields.push('metadata = ?');
      values.push(session.metadata);
    }
    if (session.ended_at !== undefined) {
      fields.push('ended_at = ?');
      values.push(session.ended_at);
    }

    if (fields.length === 0) return false;

    values.push(id);

    const update = db.getDatabase().prepare(`
      UPDATE sessions SET ${fields.join(', ')} WHERE id = ?
    `);
    const result = update.run(...values);
    return result.changes > 0;
  }

  /**
   * 删除 Session
   */
  public static delete(id: number): boolean {
    const del = db.getDatabase().prepare('DELETE FROM sessions WHERE id = ?');
    const result = del.run(id);
    return result.changes > 0;
  }

  /**
   * 结束 Session
   */
  public static endSession(id: number, endedAt?: string): boolean {
    const ended_at = endedAt || new Date().toISOString();
    return this.update(id, { status: 'ended', ended_at });
  }
}

export default SessionsService;
