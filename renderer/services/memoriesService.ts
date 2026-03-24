import { db } from '../db/database';

export interface Memory {
  id?: number;
  content: string;
  type?: string;
  importance?: number;
  tags?: string[];
  embedding?: number[];
  metadata?: Record<string, unknown>;
  created_at?: number;
  accessed_at?: number;
  access_count?: number;
}

export class MemoriesService {
  static create(memory: Omit<Memory, 'id' | 'created_at' | 'accessed_at' | 'access_count'>): number {
    const stmt = db.getDatabase().prepare(`
      INSERT INTO memories (content, type, importance, tags, embedding, metadata)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      memory.content,
      memory.type || 'general',
      memory.importance ?? 0.5,
      JSON.stringify(memory.tags || []),
      memory.embedding ? Buffer.from(new Float32Array(memory.embedding)) : null,
      JSON.stringify(memory.metadata || {})
    );

    return result.lastInsertRowid as number;
  }

  static findAll(limit = 100): Memory[] {
    const select = db.getDatabase().prepare(`
      SELECT * FROM memories ORDER BY created_at DESC LIMIT ?
    `);
    const rows = select.all(limit) as any[];
    return rows.map(this.parseRow);
  }

  static findById(id: number): Memory | undefined {
    const select = db.getDatabase().prepare('SELECT * FROM memories WHERE id = ?');
    const row = select.get(id) as any;
    return row ? this.parseRow(row) : undefined;
  }

  static findByType(type: string, limit = 50): Memory[] {
    const select = db.getDatabase().prepare(`
      SELECT * FROM memories WHERE type = ? ORDER BY importance DESC, created_at DESC LIMIT ?
    `);
    const rows = select.all(type, limit) as any[];
    return rows.map(this.parseRow);
  }

  static search(keyword: string, limit = 20): Memory[] {
    const select = db.getDatabase().prepare(`
      SELECT * FROM memories 
      WHERE content LIKE ? 
      ORDER BY importance DESC, created_at DESC 
      LIMIT ?
    `);
    const rows = select.all(`%${keyword}%`, limit) as any[];
    return rows.map(this.parseRow);
  }

  static findImportant(minImportance = 0.7, limit = 50): Memory[] {
    const select = db.getDatabase().prepare(`
      SELECT * FROM memories 
      WHERE importance >= ? 
      ORDER BY importance DESC, created_at DESC 
      LIMIT ?
    `);
    const rows = select.all(minImportance, limit) as any[];
    return rows.map(this.parseRow);
  }

  static update(id: number, updates: Partial<Memory>): boolean {
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.content !== undefined) {
      fields.push('content = ?');
      values.push(updates.content);
    }
    if (updates.type !== undefined) {
      fields.push('type = ?');
      values.push(updates.type);
    }
    if (updates.importance !== undefined) {
      fields.push('importance = ?');
      values.push(updates.importance);
    }
    if (updates.tags !== undefined) {
      fields.push('tags = ?');
      values.push(JSON.stringify(updates.tags));
    }
    if (updates.metadata !== undefined) {
      fields.push('metadata = ?');
      values.push(JSON.stringify(updates.metadata));
    }

    if (fields.length === 0) return false;

    fields.push('accessed_at = ?');
    values.push(Date.now());
    values.push(id);

    const update = db.getDatabase().prepare(`
      UPDATE memories SET ${fields.join(', ')} WHERE id = ?
    `);
    const result = update.run(...values);
    return result.changes > 0;
  }

  static delete(id: number): boolean {
    const del = db.getDatabase().prepare('DELETE FROM memories WHERE id = ?');
    const result = del.run(id);
    return result.changes > 0;
  }

  static deleteByType(type: string): number {
    const del = db.getDatabase().prepare('DELETE FROM memories WHERE type = ?');
    const result = del.run(type);
    return result.changes;
  }

  static clear(): void {
    db.getDatabase().exec('DELETE FROM memories');
  }

  static getStats(): { total: number; byType: Record<string, number>; avgImportance: number } {
    const total = (db.getDatabase().prepare('SELECT COUNT(*) as count FROM memories').get() as any).count;
    const byTypeRows = db.getDatabase().prepare(`
      SELECT type, COUNT(*) as count FROM memories GROUP BY type
    `).all() as any[];
    const byType = Object.fromEntries(byTypeRows.map((r: any) => [r.type, r.count]));
    const avgResult = db.getDatabase().prepare('SELECT AVG(importance) as avg FROM memories').get() as any;
    return { total, byType, avgImportance: avgResult.avg || 0 };
  }

  static recordAccess(id: number): void {
    db.getDatabase().prepare(`
      UPDATE memories SET accessed_at = ?, access_count = access_count + 1 WHERE id = ?
    `).run(Date.now(), id);
  }

  static findRecent(limit = 10): Memory[] {
    const select = db.getDatabase().prepare(`
      SELECT * FROM memories ORDER BY accessed_at DESC LIMIT ?
    `);
    const rows = select.all(limit) as any[];
    return rows.map(this.parseRow);
  }

  static findFrequent(limit = 10): Memory[] {
    const select = db.getDatabase().prepare(`
      SELECT * FROM memories ORDER BY access_count DESC LIMIT ?
    `);
    const rows = select.all(limit) as any[];
    return rows.map(this.parseRow);
  }

  private static parseRow(row: any): Memory {
    return {
      ...row,
      tags: JSON.parse(row.tags || '[]'),
      metadata: JSON.parse(row.metadata || '{}'),
      embedding: row.embedding ? Array.from(new Float32Array(row.embedding)) : undefined,
    };
  }
}
