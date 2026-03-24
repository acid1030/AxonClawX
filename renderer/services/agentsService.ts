/**
 * Agents Service - Agent 配置 CRUD 操作
 */

import { db } from '../db/database';

export interface Agent {
  id?: number;
  name: string;
  type: string;
  model?: string;
  status?: string;
  config?: string;
  created_at?: string;
  updated_at?: string;
}

export class AgentsService {
  /**
   * 创建 Agent
   */
  public static create(agent: Agent): number {
    const insert = db.getDatabase().prepare(`
      INSERT INTO agents (name, type, model, status, config)
      VALUES (?, ?, ?, ?, ?)
    `);
    const result = insert.run(
      agent.name,
      agent.type,
      agent.model || null,
      agent.status || 'inactive',
      agent.config || null
    );
    return result.lastInsertRowid as number;
  }

  /**
   * 查询所有 Agents
   */
  public static findAll(): Agent[] {
    const select = db.getDatabase().prepare('SELECT * FROM agents ORDER BY created_at DESC');
    return select.all() as Agent[];
  }

  /**
   * 根据 ID 查询 Agent
   */
  public static findById(id: number): Agent | undefined {
    const select = db.getDatabase().prepare('SELECT * FROM agents WHERE id = ?');
    return select.get(id) as Agent | undefined;
  }

  /**
   * 根据名称查询 Agent
   */
  public static findByName(name: string): Agent | undefined {
    const select = db.getDatabase().prepare('SELECT * FROM agents WHERE name = ?');
    return select.get(name) as Agent | undefined;
  }

  /**
   * 更新 Agent
   */
  public static update(id: number, agent: Partial<Agent>): boolean {
    const fields: string[] = [];
    const values: any[] = [];

    if (agent.name !== undefined) {
      fields.push('name = ?');
      values.push(agent.name);
    }
    if (agent.type !== undefined) {
      fields.push('type = ?');
      values.push(agent.type);
    }
    if (agent.model !== undefined) {
      fields.push('model = ?');
      values.push(agent.model);
    }
    if (agent.status !== undefined) {
      fields.push('status = ?');
      values.push(agent.status);
    }
    if (agent.config !== undefined) {
      fields.push('config = ?');
      values.push(agent.config);
    }

    if (fields.length === 0) return false;

    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    const update = db.getDatabase().prepare(`
      UPDATE agents SET ${fields.join(', ')} WHERE id = ?
    `);
    const result = update.run(...values);
    return result.changes > 0;
  }

  /**
   * 删除 Agent
   */
  public static delete(id: number): boolean {
    const del = db.getDatabase().prepare('DELETE FROM agents WHERE id = ?');
    const result = del.run(id);
    return result.changes > 0;
  }

  /**
   * 更新 Agent 状态
   */
  public static updateStatus(id: number, status: string): boolean {
    return this.update(id, { status });
  }
}

export default AgentsService;
