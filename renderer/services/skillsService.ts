/**
 * Skills Service - 技能安装 CRUD 操作
 */

import { db } from '../db/database';

export interface Skill {
  id?: number;
  name: string;
  description?: string;
  location?: string;
  enabled?: number;
  installed_at?: string;
}

export class SkillsService {
  /**
   * 安装 Skill
   */
  public static install(skill: Skill): number {
    const insert = db.getDatabase().prepare(`
      INSERT INTO skills (name, description, location, enabled)
      VALUES (?, ?, ?, ?)
    `);
    const result = insert.run(
      skill.name,
      skill.description || null,
      skill.location || null,
      skill.enabled !== undefined ? skill.enabled : 1
    );
    return result.lastInsertRowid as number;
  }

  /**
   * 查询所有 Skills
   */
  public static findAll(): Skill[] {
    const select = db.getDatabase().prepare('SELECT * FROM skills ORDER BY installed_at DESC');
    return select.all() as Skill[];
  }

  /**
   * 查询已启用的 Skills
   */
  public static findEnabled(): Skill[] {
    const select = db.getDatabase().prepare(
      'SELECT * FROM skills WHERE enabled = 1 ORDER BY installed_at DESC'
    );
    return select.all() as Skill[];
  }

  /**
   * 根据 ID 查询 Skill
   */
  public static findById(id: number): Skill | undefined {
    const select = db.getDatabase().prepare('SELECT * FROM skills WHERE id = ?');
    return select.get(id) as Skill | undefined;
  }

  /**
   * 根据名称查询 Skill
   */
  public static findByName(name: string): Skill | undefined {
    const select = db.getDatabase().prepare('SELECT * FROM skills WHERE name = ?');
    return select.get(name) as Skill | undefined;
  }

  /**
   * 更新 Skill
   */
  public static update(id: number, skill: Partial<Skill>): boolean {
    const fields: string[] = [];
    const values: any[] = [];

    if (skill.name !== undefined) {
      fields.push('name = ?');
      values.push(skill.name);
    }
    if (skill.description !== undefined) {
      fields.push('description = ?');
      values.push(skill.description);
    }
    if (skill.location !== undefined) {
      fields.push('location = ?');
      values.push(skill.location);
    }
    if (skill.enabled !== undefined) {
      fields.push('enabled = ?');
      values.push(skill.enabled);
    }

    if (fields.length === 0) return false;

    values.push(id);

    const update = db.getDatabase().prepare(`
      UPDATE skills SET ${fields.join(', ')} WHERE id = ?
    `);
    const result = update.run(...values);
    return result.changes > 0;
  }

  /**
   * 删除 Skill
   */
  public static delete(id: number): boolean {
    const del = db.getDatabase().prepare('DELETE FROM skills WHERE id = ?');
    const result = del.run(id);
    return result.changes > 0;
  }

  /**
   * 启用/禁用 Skill
   */
  public static toggleEnabled(id: number, enabled: boolean): boolean {
    return this.update(id, { enabled: enabled ? 1 : 0 });
  }

  /**
   * 检查 Skill 是否已安装
   */
  public static isInstalled(name: string): boolean {
    const skill = this.findByName(name);
    return skill !== undefined;
  }
}

export default SkillsService;
