/**
 * User Preferences Service - 用户偏好 CRUD 操作
 */

import { db } from '../db/database';

export interface UserPreference {
  id?: number;
  key: string;
  value: string;
  category?: string;
  updated_at?: string;
}

export class UserPreferencesService {
  /**
   * 设置偏好
   */
  public static set(preference: UserPreference): number {
    const insert = db.getDatabase().prepare(`
      INSERT OR REPLACE INTO user_preferences (key, value, category)
      VALUES (?, ?, ?)
    `);
    const result = insert.run(
      preference.key,
      preference.value,
      preference.category || null
    );
    return result.lastInsertRowid as number;
  }

  /**
   * 查询所有偏好
   */
  public static findAll(): UserPreference[] {
    const select = db.getDatabase().prepare(
      'SELECT * FROM user_preferences ORDER BY updated_at DESC'
    );
    return select.all() as UserPreference[];
  }

  /**
   * 根据 Key 查询偏好
   */
  public static findByKey(key: string): UserPreference | undefined {
    const select = db.getDatabase().prepare(
      'SELECT * FROM user_preferences WHERE key = ?'
    );
    return select.get(key) as UserPreference | undefined;
  }

  /**
   * 根据分类查询偏好
   */
  public static findByCategory(category: string): UserPreference[] {
    const select = db.getDatabase().prepare(
      'SELECT * FROM user_preferences WHERE category = ? ORDER BY updated_at DESC'
    );
    return select.all(category) as UserPreference[];
  }

  /**
   * 获取偏好值
   */
  public static getValue(key: string): string | undefined {
    const preference = this.findByKey(key);
    return preference?.value;
  }

  /**
   * 更新偏好
   */
  public static update(key: string, value: string, category?: string): boolean {
    const preference = this.findByKey(key);
    if (!preference) {
      return false;
    }

    const update = db.getDatabase().prepare(`
      UPDATE user_preferences 
      SET value = ?, category = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE key = ?
    `);
    const result = update.run(
      value,
      category || preference.category,
      key
    );
    return result.changes > 0;
  }

  /**
   * 删除偏好
   */
  public static delete(key: string): boolean {
    const del = db.getDatabase().prepare(
      'DELETE FROM user_preferences WHERE key = ?'
    );
    const result = del.run(key);
    return result.changes > 0;
  }

  /**
   * 批量设置偏好
   */
  public static setMany(preferences: UserPreference[]): void {
    const insert = db.getDatabase().prepare(`
      INSERT OR REPLACE INTO user_preferences (key, value, category)
      VALUES (?, ?, ?)
    `);

    const transaction = db.getDatabase().transaction((prefs: UserPreference[]) => {
      for (const pref of prefs) {
        insert.run(pref.key, pref.value, pref.category || null);
      }
    });

    transaction(preferences);
  }
}

export default UserPreferencesService;
