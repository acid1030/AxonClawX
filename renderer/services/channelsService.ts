/**
 * Channels Service - Channel 配置 CRUD 操作
 */

import { db } from '../db/database';

export interface Channel {
  id?: number;
  name: string;
  type: string;
  config?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
}

export class ChannelsService {
  /**
   * 创建 Channel
   */
  public static create(channel: Channel): number {
    const insert = db.getDatabase().prepare(`
      INSERT INTO channels (name, type, config, status)
      VALUES (?, ?, ?, ?)
    `);
    const result = insert.run(
      channel.name,
      channel.type,
      channel.config || null,
      channel.status || 'active'
    );
    return result.lastInsertRowid as number;
  }

  /**
   * 查询所有 Channels
   */
  public static findAll(): Channel[] {
    const select = db.getDatabase().prepare('SELECT * FROM channels ORDER BY created_at DESC');
    return select.all() as Channel[];
  }

  /**
   * 根据 ID 查询 Channel
   */
  public static findById(id: number): Channel | undefined {
    const select = db.getDatabase().prepare('SELECT * FROM channels WHERE id = ?');
    return select.get(id) as Channel | undefined;
  }

  /**
   * 根据名称查询 Channel
   */
  public static findByName(name: string): Channel | undefined {
    const select = db.getDatabase().prepare('SELECT * FROM channels WHERE name = ?');
    return select.get(name) as Channel | undefined;
  }

  /**
   * 根据类型查询 Channels
   */
  public static findByType(type: string): Channel[] {
    const select = db.getDatabase().prepare(
      'SELECT * FROM channels WHERE type = ? ORDER BY created_at DESC'
    );
    return select.all(type) as Channel[];
  }

  /**
   * 查询活跃 Channels
   */
  public static findActive(): Channel[] {
    const select = db.getDatabase().prepare(
      "SELECT * FROM channels WHERE status = 'active' ORDER BY created_at DESC"
    );
    return select.all() as Channel[];
  }

  /**
   * 更新 Channel
   */
  public static update(id: number, channel: Partial<Channel>): boolean {
    const fields: string[] = [];
    const values: any[] = [];

    if (channel.name !== undefined) {
      fields.push('name = ?');
      values.push(channel.name);
    }
    if (channel.type !== undefined) {
      fields.push('type = ?');
      values.push(channel.type);
    }
    if (channel.config !== undefined) {
      fields.push('config = ?');
      values.push(channel.config);
    }
    if (channel.status !== undefined) {
      fields.push('status = ?');
      values.push(channel.status);
    }

    if (fields.length === 0) return false;

    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    const update = db.getDatabase().prepare(`
      UPDATE channels SET ${fields.join(', ')} WHERE id = ?
    `);
    const result = update.run(...values);
    return result.changes > 0;
  }

  /**
   * 删除 Channel
   */
  public static delete(id: number): boolean {
    const del = db.getDatabase().prepare('DELETE FROM channels WHERE id = ?');
    const result = del.run(id);
    return result.changes > 0;
  }

  /**
   * 更新 Channel 状态
   */
  public static updateStatus(id: number, status: string): boolean {
    return this.update(id, { status });
  }
}

export default ChannelsService;
