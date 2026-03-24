/**
 * Messages Service - 消息历史 CRUD 操作
 */

import { db } from '../db/database';

export interface Message {
  id?: number;
  session_id: number;
  role: string;
  content: string;
  timestamp?: string;
  metadata?: string;
}

export class MessagesService {
  /**
   * 创建 Message
   */
  public static create(message: Message): number {
    const insert = db.getDatabase().prepare(`
      INSERT INTO messages (session_id, role, content, metadata)
      VALUES (?, ?, ?, ?)
    `);
    const result = insert.run(
      message.session_id,
      message.role,
      message.content,
      message.metadata || null
    );
    return result.lastInsertRowid as number;
  }

  /**
   * 批量创建 Messages
   */
  public static createMany(messages: Message[]): number[] {
    const insert = db.getDatabase().prepare(`
      INSERT INTO messages (session_id, role, content, metadata)
      VALUES (?, ?, ?, ?)
    `);
    const ids: number[] = [];
    
    const transaction = db.getDatabase().transaction((msgs: Message[]) => {
      for (const msg of msgs) {
        const result = insert.run(
          msg.session_id,
          msg.role,
          msg.content,
          msg.metadata || null
        );
        ids.push(result.lastInsertRowid as number);
      }
    });
    
    transaction(messages);
    return ids;
  }

  /**
   * 根据 Session ID 查询 Messages
   */
  public static findBySessionId(sessionId: number): Message[] {
    const select = db.getDatabase().prepare(
      'SELECT * FROM messages WHERE session_id = ? ORDER BY timestamp ASC'
    );
    return select.all(sessionId) as Message[];
  }

  /**
   * 根据 ID 查询 Message
   */
  public static findById(id: number): Message | undefined {
    const select = db.getDatabase().prepare('SELECT * FROM messages WHERE id = ?');
    return select.get(id) as Message | undefined;
  }

  /**
   * 查询最近 Messages
   */
  public static findRecent(limit: number = 50): Message[] {
    const select = db.getDatabase().prepare(
      'SELECT * FROM messages ORDER BY timestamp DESC LIMIT ?'
    );
    return select.all(limit) as Message[];
  }

  /**
   * 查询 Session 的最近 Messages
   */
  public static findRecentBySession(sessionId: number, limit: number = 50): Message[] {
    const select = db.getDatabase().prepare(
      'SELECT * FROM messages WHERE session_id = ? ORDER BY timestamp DESC LIMIT ?'
    );
    return select.all(sessionId, limit) as Message[];
  }

  /**
   * 更新 Message
   */
  public static update(id: number, message: Partial<Message>): boolean {
    const fields: string[] = [];
    const values: any[] = [];

    if (message.role !== undefined) {
      fields.push('role = ?');
      values.push(message.role);
    }
    if (message.content !== undefined) {
      fields.push('content = ?');
      values.push(message.content);
    }
    if (message.metadata !== undefined) {
      fields.push('metadata = ?');
      values.push(message.metadata);
    }

    if (fields.length === 0) return false;

    values.push(id);

    const update = db.getDatabase().prepare(`
      UPDATE messages SET ${fields.join(', ')} WHERE id = ?
    `);
    const result = update.run(...values);
    return result.changes > 0;
  }

  /**
   * 删除 Message
   */
  public static delete(id: number): boolean {
    const del = db.getDatabase().prepare('DELETE FROM messages WHERE id = ?');
    const result = del.run(id);
    return result.changes > 0;
  }

  /**
   * 删除 Session 的所有 Messages
   */
  public static deleteBySessionId(sessionId: number): boolean {
    const del = db.getDatabase().prepare('DELETE FROM messages WHERE session_id = ?');
    const result = del.run(sessionId);
    return result.changes > 0;
  }

  /**
   * 统计 Session 的消息数量
   */
  public static countBySessionId(sessionId: number): number {
    const select = db.getDatabase().prepare(
      'SELECT COUNT(*) as count FROM messages WHERE session_id = ?'
    );
    const result = select.get(sessionId) as { count: number };
    return result.count;
  }
}

export default MessagesService;
