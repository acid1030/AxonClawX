/**
 * 数据库迁移工具技能
 * 
 * 功能:
 * 1. 迁移文件生成 - 自动创建带时间戳的迁移文件
 * 2. 迁移执行/回滚 - 按顺序执行迁移或回滚到指定版本
 * 3. 迁移状态追踪 - 记录已执行的迁移历史
 * 
 * @module skills/migrate-utils-skill
 * @example
 * ```typescript
 * import { MigrationManager } from './migrate-utils-skill';
 * 
 * const manager = new MigrationManager({ dbPath: './axonclaw.db' });
 * 
 * // 生成迁移文件
 * await manager.createMigration('add_user_table');
 * 
 * // 执行所有待处理迁移
 * await manager.migrate();
 * 
 * // 回滚最后一次迁移
 * await manager.rollback();
 * 
 * // 查看迁移状态
 * const status = await manager.getStatus();
 * ```
 */

import Database from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// 类型定义
// ============================================================================

/**
 * 迁移记录接口
 */
export interface MigrationRecord {
  id: number;
  name: string;
  executed_at: string;
}

/**
 * 迁移文件接口
 */
export interface MigrationFile {
  name: string;
  path: string;
  timestamp: number;
}

/**
 * 迁移配置接口
 */
export interface MigrationConfig {
  /** 数据库路径 */
  dbPath?: string;
  /** 迁移文件目录 */
  migrationsDir?: string;
  /** 迁移表名 */
  tableName?: string;
}

/**
 * 迁移状态接口
 */
export interface MigrationStatus {
  /** 已执行的迁移 */
  executed: MigrationRecord[];
  /** 待执行的迁移 */
  pending: MigrationFile[];
  /** 数据库版本 */
  currentVersion: string | null;
}

/**
 * 迁移执行结果
 */
export interface MigrationResult {
  /** 是否成功 */
  success: boolean;
  /** 执行的迁移名称列表 */
  migrations: string[];
  /** 错误信息 (如果有) */
  error?: string;
}

// ============================================================================
// MigrationManager 类
// ============================================================================

export class MigrationManager {
  private db: Database.Database;
  private migrationsDir: string;
  private tableName: string;

  constructor(config: MigrationConfig = {}) {
    this.db = new Database(config.dbPath || path.join(process.cwd(), 'axonclaw.db'));
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');

    this.migrationsDir = config.migrationsDir || path.join(process.cwd(), 'migrations');
    this.tableName = config.tableName || 'migrations';

    this.initializeMigrationTable();
  }

  // ============================================================================
  // 初始化
  // ============================================================================

  /**
   * 初始化迁移表
   */
  private initializeMigrationTable(): void {
    const createTable = `
      CREATE TABLE IF NOT EXISTS ${this.tableName} (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        executed_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `;

    this.db.exec(createTable);
    
    const createIndex = `
      CREATE INDEX IF NOT EXISTS idx_migrations_name ON ${this.tableName}(name);
    `;
    
    this.db.exec(createIndex);
  }

  // ============================================================================
  // 迁移文件生成
  // ============================================================================

  /**
   * 创建新的迁移文件
   * @param name - 迁移名称 (将自动生成时间戳前缀)
   * @param upSql - 升级 SQL (可选)
   * @param downSql - 降级 SQL (可选)
   * @returns 迁移文件路径
   * 
   * @example
   * ```typescript
   * // 创建空迁移
   * await manager.createMigration('add_users_table');
   * 
   * // 创建带 SQL 的迁移
   * await manager.createMigration(
   *   'add_email_column',
   *   'ALTER TABLE users ADD COLUMN email TEXT;',
   *   'ALTER TABLE users DROP COLUMN email;'
   * );
   * ```
   */
  async createMigration(
    name: string,
    upSql?: string,
    downSql?: string
  ): Promise<string> {
    const timestamp = Date.now();
    const sanitizedName = name.replace(/[^a-zA-Z0-9_]/g, '_');
    const fileName = `${timestamp}_${sanitizedName}.sql`;
    const filePath = path.join(this.migrationsDir, fileName);

    // 确保迁移目录存在
    if (!fs.existsSync(this.migrationsDir)) {
      fs.mkdirSync(this.migrationsDir, { recursive: true });
    }

    // 生成迁移文件内容
    const content = this.generateMigrationContent(name, upSql, downSql);
    fs.writeFileSync(filePath, content, 'utf-8');

    console.log(`[Migration] 创建迁移文件：${filePath}`);
    return filePath;
  }

  /**
   * 生成迁移文件内容
   */
  private generateMigrationContent(
    name: string,
    upSql?: string,
    downSql?: string
  ): string {
    const lines: string[] = [
      `-- Migration: ${name}`,
      `-- Generated at: ${new Date().toISOString()}`,
      '',
      '-- ====== UP ======',
      upSql || '-- Add your UP migration SQL here',
      ''
    ];

    if (downSql) {
      lines.push('-- ====== DOWN ======');
      lines.push(downSql);
    } else {
      lines.push('-- ====== DOWN ======');
      lines.push('-- Add your DOWN migration SQL here (for rollback)');
    }

    lines.push('');
    return lines.join('\n');
  }

  // ============================================================================
  // 迁移执行
  // ============================================================================

  /**
   * 执行所有待处理的迁移
   * @returns 执行结果
   * 
   * @example
   * ```typescript
   * const result = await manager.migrate();
   * if (result.success) {
   *   console.log(`执行了 ${result.migrations.length} 个迁移`);
   * }
   * ```
   */
  async migrate(): Promise<MigrationResult> {
    const executedMigrations = this.getExecutedMigrations();
    const pendingMigrations = this.getPendingMigrations(executedMigrations);

    if (pendingMigrations.length === 0) {
      console.log('[Migration] 没有待执行的迁移');
      return { success: true, migrations: [] };
    }

    const executed: string[] = [];
    
    try {
      this.db.exec('BEGIN TRANSACTION');

      for (const migration of pendingMigrations) {
        console.log(`[Migration] 执行迁移：${migration.name}`);
        
        const sqlContent = fs.readFileSync(migration.path, 'utf-8');
        const upSql = this.extractUpSql(sqlContent);
        
        this.db.exec(upSql);
        
        // 记录迁移执行
        const insert = this.db.prepare(`
          INSERT INTO ${this.tableName} (name, executed_at)
          VALUES (?, datetime('now'))
        `);
        insert.run(migration.name);
        
        executed.push(migration.name);
      }

      this.db.exec('COMMIT');
      console.log(`[Migration] 成功执行 ${executed.length} 个迁移`);
      
      return { success: true, migrations: executed };
    } catch (error) {
      this.db.exec('ROLLBACK');
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[Migration] 迁移失败：${errorMessage}`);
      
      return { 
        success: false, 
        migrations: executed,
        error: errorMessage 
      };
    }
  }

  /**
   * 执行单个迁移文件
   * @param migrationName - 迁移文件名 (带时间戳前缀)
   * @returns 执行结果
   */
  async migrateSingle(migrationName: string): Promise<MigrationResult> {
    const executedMigrations = this.getExecutedMigrations();
    const executedNames = new Set(executedMigrations.map(m => m.name));

    if (executedNames.has(migrationName)) {
      console.log(`[Migration] 迁移 ${migrationName} 已执行，跳过`);
      return { success: true, migrations: [] };
    }

    const migrationPath = path.join(this.migrationsDir, migrationName);
    if (!fs.existsSync(migrationPath)) {
      return { 
        success: false, 
        migrations: [],
        error: `迁移文件不存在：${migrationName}`
      };
    }

    try {
      this.db.exec('BEGIN TRANSACTION');

      const sqlContent = fs.readFileSync(migrationPath, 'utf-8');
      const upSql = this.extractUpSql(sqlContent);
      
      this.db.exec(upSql);
      
      const insert = this.db.prepare(`
        INSERT INTO ${this.tableName} (name, executed_at)
        VALUES (?, datetime('now'))
      `);
      insert.run(migrationName);

      this.db.exec('COMMIT');
      console.log(`[Migration] 成功执行迁移：${migrationName}`);
      
      return { success: true, migrations: [migrationName] };
    } catch (error) {
      this.db.exec('ROLLBACK');
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[Migration] 迁移失败：${errorMessage}`);
      
      return { 
        success: false, 
        migrations: [],
        error: errorMessage 
      };
    }
  }

  /**
   * 从迁移文件内容中提取 UP SQL
   */
  private extractUpSql(content: string): string {
    const upMatch = content.match(/-- ====== UP ======\s*([\s\S]*?)(?:-- ====== DOWN ======|$)/i);
    if (upMatch) {
      return upMatch[1].trim();
    }
    return content.trim();
  }

  /**
   * 从迁移文件内容中提取 DOWN SQL
   */
  private extractDownSql(content: string): string {
    const downMatch = content.match(/-- ====== DOWN ======\s*([\s\S]*)/i);
    if (downMatch) {
      return downMatch[1].trim();
    }
    return '';
  }

  // ============================================================================
  // 迁移回滚
  // ============================================================================

  /**
   * 回滚最后一次迁移
   * @returns 执行结果
   * 
   * @example
   * ```typescript
   * const result = await manager.rollback();
   * if (result.success) {
   *   console.log(`回滚了 ${result.migrations.length} 个迁移`);
   * }
   * ```
   */
  async rollback(): Promise<MigrationResult> {
    const lastMigration = this.getLastMigration();
    
    if (!lastMigration) {
      console.log('[Migration] 没有可回滚的迁移');
      return { success: true, migrations: [] };
    }

    return await this.rollbackToMigration(lastMigration.name);
  }

  /**
   * 回滚到指定迁移
   * @param targetMigration - 目标迁移名称 (将回滚到此迁移之后的所有迁移)
   * @returns 执行结果
   * 
   * @example
   * ```typescript
   * // 回滚到特定版本
   * await manager.rollbackTo('1234567890_create_users_table');
   * ```
   */
  async rollbackTo(targetMigration: string): Promise<MigrationResult> {
    const executedMigrations = this.getExecutedMigrations();
    const targetIndex = executedMigrations.findIndex(m => m.name === targetMigration);

    if (targetIndex === -1) {
      return { 
        success: false, 
        migrations: [],
        error: `未找到迁移记录：${targetMigration}`
      };
    }

    // 获取需要回滚的迁移 (目标之后的所有迁移)
    const toRollback = executedMigrations.slice(targetIndex + 1).reverse();

    if (toRollback.length === 0) {
      console.log('[Migration] 没有需要回滚的迁移');
      return { success: true, migrations: [] };
    }

    const rolledBack: string[] = [];

    try {
      this.db.exec('BEGIN TRANSACTION');

      for (const migration of toRollback) {
        console.log(`[Migration] 回滚迁移：${migration.name}`);
        
        const migrationPath = path.join(this.migrationsDir, migration.name);
        
        if (fs.existsSync(migrationPath)) {
          const sqlContent = fs.readFileSync(migrationPath, 'utf-8');
          const downSql = this.extractDownSql(sqlContent);
          
          if (downSql) {
            this.db.exec(downSql);
          } else {
            console.warn(`[Migration] 警告：${migration.name} 没有 DOWN SQL，跳过执行`);
          }
        } else {
          console.warn(`[Migration] 警告：迁移文件不存在 ${migration.name}，仅删除记录`);
        }

        // 删除迁移记录
        const del = this.db.prepare(`DELETE FROM ${this.tableName} WHERE name = ?`);
        del.run(migration.name);
        
        rolledBack.push(migration.name);
      }

      this.db.exec('COMMIT');
      console.log(`[Migration] 成功回滚 ${rolledBack.length} 个迁移`);
      
      return { success: true, migrations: rolledBack };
    } catch (error) {
      this.db.exec('ROLLBACK');
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[Migration] 回滚失败：${errorMessage}`);
      
      return { 
        success: false, 
        migrations: rolledBack,
        error: errorMessage 
      };
    }
  }

  /**
   * 回滚单个迁移
   * @param migrationName - 迁移名称
   * @returns 执行结果
   */
  async rollbackSingle(migrationName: string): Promise<MigrationResult> {
    const executedMigrations = this.getExecutedMigrations();
    const migration = executedMigrations.find(m => m.name === migrationName);

    if (!migration) {
      return { 
        success: false, 
        migrations: [],
        error: `迁移未执行：${migrationName}`
      };
    }

    try {
      this.db.exec('BEGIN TRANSACTION');

      const migrationPath = path.join(this.migrationsDir, migrationName);
      
      if (fs.existsSync(migrationPath)) {
        const sqlContent = fs.readFileSync(migrationPath, 'utf-8');
        const downSql = this.extractDownSql(sqlContent);
        
        if (downSql) {
          this.db.exec(downSql);
        } else {
          console.warn(`[Migration] 警告：${migrationName} 没有 DOWN SQL`);
        }
      }

      const del = this.db.prepare(`DELETE FROM ${this.tableName} WHERE name = ?`);
      del.run(migrationName);

      this.db.exec('COMMIT');
      console.log(`[Migration] 成功回滚迁移：${migrationName}`);
      
      return { success: true, migrations: [migrationName] };
    } catch (error) {
      this.db.exec('ROLLBACK');
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[Migration] 回滚失败：${errorMessage}`);
      
      return { 
        success: false, 
        migrations: [],
        error: errorMessage 
      };
    }
  }

  /**
   * 回滚到指定迁移 (包含此迁移)
   * @param migrationName - 要回滚到的迁移名称
   * @returns 执行结果
   */
  private async rollbackToMigration(migrationName: string): Promise<MigrationResult> {
    const executedMigrations = this.getExecutedMigrations();
    const migrationIndex = executedMigrations.findIndex(m => m.name === migrationName);

    if (migrationIndex === -1) {
      return { 
        success: false, 
        migrations: [],
        error: `未找到迁移记录：${migrationName}`
      };
    }

    // 获取需要回滚的迁移 (从最后一个到目标迁移)
    const toRollback = executedMigrations.slice(migrationIndex).reverse();

    if (toRollback.length === 0) {
      console.log('[Migration] 没有需要回滚的迁移');
      return { success: true, migrations: [] };
    }

    const rolledBack: string[] = [];

    try {
      this.db.exec('BEGIN TRANSACTION');

      for (const migration of toRollback) {
        console.log(`[Migration] 回滚迁移：${migration.name}`);
        
        const migrationPath = path.join(this.migrationsDir, migration.name);
        
        if (fs.existsSync(migrationPath)) {
          const sqlContent = fs.readFileSync(migrationPath, 'utf-8');
          const downSql = this.extractDownSql(sqlContent);
          
          if (downSql) {
            this.db.exec(downSql);
          } else {
            console.warn(`[Migration] 警告：${migration.name} 没有 DOWN SQL，跳过执行`);
          }
        } else {
          console.warn(`[Migration] 警告：迁移文件不存在 ${migration.name}，仅删除记录`);
        }

        // 删除迁移记录
        const del = this.db.prepare(`DELETE FROM ${this.tableName} WHERE name = ?`);
        del.run(migration.name);
        
        rolledBack.push(migration.name);
      }

      this.db.exec('COMMIT');
      console.log(`[Migration] 成功回滚 ${rolledBack.length} 个迁移`);
      
      return { success: true, migrations: rolledBack };
    } catch (error) {
      this.db.exec('ROLLBACK');
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[Migration] 回滚失败：${errorMessage}`);
      
      return { 
        success: false, 
        migrations: rolledBack,
        error: errorMessage 
      };
    }
  }

  // ============================================================================
  // 迁移状态追踪
  // ============================================================================

  /**
   * 获取迁移状态
   * @returns 迁移状态信息
   * 
   * @example
   * ```typescript
   * const status = await manager.getStatus();
   * console.log(`当前版本：${status.currentVersion}`);
   * console.log(`待执行迁移：${status.pending.length}`);
   * ```
   */
  async getStatus(): Promise<MigrationStatus> {
    const executedMigrations = this.getExecutedMigrations();
    const pendingMigrations = this.getPendingMigrations(executedMigrations);
    const currentVersion = executedMigrations.length > 0 
      ? executedMigrations[executedMigrations.length - 1].name 
      : null;

    return {
      executed: executedMigrations,
      pending: pendingMigrations,
      currentVersion
    };
  }

  /**
   * 获取已执行的迁移列表
   */
  private getExecutedMigrations(): MigrationRecord[] {
    const select = this.db.prepare(`
      SELECT id, name, executed_at FROM ${this.tableName}
      ORDER BY id ASC
    `);
    return select.all() as MigrationRecord[];
  }

  /**
   * 获取最后一次执行的迁移
   */
  private getLastMigration(): MigrationRecord | null {
    const select = this.db.prepare(`
      SELECT id, name, executed_at FROM ${this.tableName}
      ORDER BY id DESC
      LIMIT 1
    `);
    const row = select.get() as MigrationRecord | undefined;
    return row || null;
  }

  /**
   * 获取待执行的迁移列表
   */
  private getPendingMigrations(executedMigrations: MigrationRecord[]): MigrationFile[] {
    const executedNames = new Set(executedMigrations.map(m => m.name));

    if (!fs.existsSync(this.migrationsDir)) {
      return [];
    }

    const files = fs.readdirSync(this.migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .map(file => {
        const match = file.match(/^(\d+)_/);
        const timestamp = match ? parseInt(match[1], 10) : 0;
        return {
          name: file,
          path: path.join(this.migrationsDir, file),
          timestamp
        };
      })
      .sort((a, b) => a.timestamp - b.timestamp)
      .filter(file => !executedNames.has(file.name));

    return files;
  }

  /**
   * 获取迁移历史
   * @param limit - 限制返回数量
   * @returns 迁移历史记录
   */
  getHistory(limit: number = 10): MigrationRecord[] {
    const select = this.db.prepare(`
      SELECT id, name, executed_at FROM ${this.tableName}
      ORDER BY id DESC
      LIMIT ?
    `);
    return select.all(limit) as MigrationRecord[];
  }

  /**
   * 检查迁移是否已执行
   * @param migrationName - 迁移名称
   * @returns 是否已执行
   */
  isExecuted(migrationName: string): boolean {
    const select = this.db.prepare(`
      SELECT COUNT(*) as count FROM ${this.tableName} WHERE name = ?
    `);
    const result = select.get(migrationName) as { count: number };
    return result.count > 0;
  }

  // ============================================================================
  // 工具方法
  // ============================================================================

  /**
   * 获取数据库连接 (用于高级操作)
   * @returns Database 实例
   */
  getDatabase(): Database.Database {
    return this.db;
  }

  /**
   * 获取迁移目录路径
   * @returns 迁移目录路径
   */
  getMigrationsDir(): string {
    return this.migrationsDir;
  }

  /**
   * 关闭数据库连接
   */
  close(): void {
    this.db.close();
    console.log('[Migration] 数据库连接已关闭');
  }
}

// ============================================================================
// 便捷函数
// ============================================================================

/**
 * 创建迁移管理器实例
 * @param config - 配置选项
 * @returns MigrationManager 实例
 */
export function createMigrationManager(config: MigrationConfig = {}): MigrationManager {
  return new MigrationManager(config);
}

/**
 * 快速执行迁移
 * @param dbPath - 数据库路径
 * @returns 执行结果
 */
export async function quickMigrate(dbPath?: string): Promise<MigrationResult> {
  const manager = new MigrationManager({ dbPath });
  const result = await manager.migrate();
  manager.close();
  return result;
}

/**
 * 快速回滚迁移
 * @param dbPath - 数据库路径
 * @returns 执行结果
 */
export async function quickRollback(dbPath?: string): Promise<MigrationResult> {
  const manager = new MigrationManager({ dbPath });
  const result = await manager.rollback();
  manager.close();
  return result;
}

// ============================================================================
// 默认导出
// ============================================================================

export default MigrationManager;
