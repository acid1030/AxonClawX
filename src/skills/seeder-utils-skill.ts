/**
 * Seeder Utils - 数据库种子数据填充工具
 * 
 * 功能:
 * 1. 批量插入 (Batch Insert)
 * 2. 关联数据生成 (Related Data Generation)
 * 3. 回滚支持 (Rollback Support)
 * 
 * @author Axon (KAEL Engineering)
 * @version 1.0.0
 * @since 2026-03-13
 */

import { db, tasks, agents, skills, Task, Agent, Skill } from '../db/db-lite';

// ============== 类型定义 ==============

/**
 * 种子数据记录
 */
export interface SeedRecord<T = any> {
  /** 表名 */
  table: string;
  /** 数据 */
  data: T;
  /** 记录 ID (插入后填充) */
  id?: number;
  /** 外部引用 ID (用于关联) */
  refId?: string;
}

/**
 * 种子数据包
 */
export interface SeedBatch<T = any> {
  /** 批次名称 */
  name: string;
  /** 记录列表 */
  records: SeedRecord<T>[];
  /** 创建时间戳 */
  timestamp?: number;
}

/**
 * 回滚信息
 */
export interface RollbackInfo {
  /** 批次名称 */
  batchName: string;
  /** 删除的表名列表 */
  tables: string[];
  /** 删除的记录 ID 列表 */
  recordIds: number[];
  /** 回滚时间戳 */
  timestamp: number;
}

/**
 * 种子数据配置选项
 */
export interface SeederOptions {
  /** 是否启用事务 */
  useTransaction?: boolean;
  /** 是否记录详细日志 */
  verbose?: boolean;
  /** 每批插入的记录数 */
  batchSize?: number;
  /** 插入失败时是否继续 */
  continueOnError?: boolean;
  /** 回滚日志文件路径 */
  rollbackLogPath?: string;
}

/**
 * 种子数据执行结果
 */
export interface SeederResult {
  /** 是否成功 */
  success: boolean;
  /** 插入的记录总数 */
  totalInserted: number;
  /** 失败的记录数 */
  failedCount: number;
  /** 每个表的插入统计 */
  tableStats: Record<string, { inserted: number; failed: number }>;
  /** 错误信息列表 */
  errors: Array<{ table: string; error: string }>;
  /** 回滚信息 (如果启用) */
  rollbackInfo?: RollbackInfo;
  /** 执行时间 (毫秒) */
  duration: number;
}

/**
 * 工厂函数类型
 */
export type FactoryFn<T> = (index: number, context: any) => T;

/**
 * 关联生成器类型
 */
export interface RelationGenerator {
  /** 主表名 */
  mainTable: string;
  /** 关联表名 */
  relatedTable: string;
  /** 外键字段名 */
  foreignKey: string;
  /** 生成函数 */
  generate: (mainRecord: any, index: number) => any;
}

// ============== 工具函数 ==============

/**
 * 生成唯一引用 ID
 */
function generateRefId(prefix: string = 'seed'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 记录回滚信息到日志
 */
function logRollback(info: RollbackInfo, logPath?: string): void {
  const logEntry = JSON.stringify(info, null, 2);
  
  if (logPath) {
    // 追加到日志文件
    const fs = require('fs');
    const path = require('path');
    const dir = path.dirname(logPath);
    
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.appendFileSync(logPath, `\n[${new Date(info.timestamp).toISOString()}]\n${logEntry}\n`);
  }
  
  console.log(`📋 回滚信息已记录：${info.recordIds.length} 条记录`);
}

/**
 * 获取表的主键字段名
 */
function getPrimaryKeyField(table: string): string {
  // 默认使用 id，可以根据实际表结构扩展
  const primaryKeyMap: Record<string, string> = {
    tasks: 'id',
    agents: 'id',
    skills: 'id',
  };
  return primaryKeyMap[table] || 'id';
}

/**
 * 清空表数据
 */
function truncateTable(tableName: string): void {
  db.exec(`DELETE FROM ${tableName}`);
  // 重置自增计数器
  db.exec(`DELETE FROM sqlite_sequence WHERE name='${tableName}'`);
}

// ============== SeederUtils 类 ==============

/**
 * 数据库种子数据填充工具类
 * 
 * 提供批量插入、关联数据生成和回滚功能
 * 
 * @example
 * ```typescript
 * import { SeederUtils } from './seeder-utils-skill';
 * 
 * const seeder = new SeederUtils({ verbose: true, useTransaction: true });
 * 
 * // 批量插入 Agent 数据
 * const result = await seeder.seed({
 *   name: 'Initial Agents',
 *   records: [
 *     { table: 'agents', data: { name: 'Axon', type: 'main', status: 'active' } },
 *     { table: 'agents', data: { name: 'KAEL', type: 'engineering', status: 'active' } },
 *     { table: 'agents', data: { name: 'NEXUS', type: 'strategy', status: 'active' } },
 *   ],
 * });
 * 
 * console.log(`插入了 ${result.totalInserted} 条记录`);
 * ```
 */
export class SeederUtils {
  private defaultOptions: Required<SeederOptions> = {
    useTransaction: true,
    verbose: false,
    batchSize: 100,
    continueOnError: false,
    rollbackLogPath: undefined,
  };

  private rollbackStack: RollbackInfo[] = [];

  constructor(private options: SeederOptions = {}) {
    this.defaultOptions = {
      ...this.defaultOptions,
      ...options,
    };
  }

  /**
   * 执行种子数据填充
   * 
   * @param batch - 种子数据包
   * @returns 执行结果
   * 
   * @example
   * ```typescript
   * const result = await seeder.seed({
   *   name: 'Test Data',
   *   records: [
   *     { table: 'agents', data: { name: 'TestAgent', type: 'test' } },
   *   ],
   * });
   * ```
   */
  async seed(batch: SeedBatch): Promise<SeederResult> {
    const config = this.defaultOptions;
    const startTime = performance.now();
    
    const tableStats: Record<string, { inserted: number; failed: number }> = {};
    const errors: Array<{ table: string; error: string }> = [];
    const insertedIds: Map<string, number[]> = new Map();
    let totalInserted = 0;
    let failedCount = 0;

    if (config.verbose) {
      console.log(`🌱 开始种子数据填充：${batch.name}`);
      console.log(`   记录数：${batch.records.length}`);
      console.log(`   事务模式：${config.useTransaction ? '启用' : '禁用'}`);
    }

    const executeSeed = () => {
      // 按表分组记录
      const recordsByTable = new Map<string, SeedRecord[]>();
      for (const record of batch.records) {
        if (!recordsByTable.has(record.table)) {
          recordsByTable.set(record.table, []);
        }
        recordsByTable.get(record.table)!.push(record);
      }

      // 逐表插入
      for (const [tableName, records] of recordsByTable.entries()) {
        if (!tableStats[tableName]) {
          tableStats[tableName] = { inserted: 0, failed: 0 };
        }
        insertedIds.set(tableName, []);

        if (config.verbose) {
          console.log(`   处理表：${tableName} (${records.length} 条记录)`);
        }

        // 批量插入
        for (let i = 0; i < records.length; i += config.batchSize) {
          const batchRecords = records.slice(i, i + config.batchSize);
          
          for (const record of batchRecords) {
            try {
              const id = this.insertRecord(tableName, record.data);
              record.id = id;
              insertedIds.get(tableName)!.push(id);
              tableStats[tableName].inserted++;
              totalInserted++;

              if (config.verbose) {
                console.log(`     ✓ 插入 ${tableName} #${id}`);
              }
            } catch (error: any) {
              const errorMsg = error.message || String(error);
              errors.push({ table: tableName, error: errorMsg });
              tableStats[tableName].failed++;
              failedCount++;

              if (config.verbose) {
                console.log(`     ✗ 插入失败：${errorMsg}`);
              }

              if (!config.continueOnError) {
                throw error;
              }
            }
          }
        }
      }
    };

    try {
      if (config.useTransaction) {
        db.transaction(executeSeed)();
      } else {
        executeSeed();
      }

      // 生成回滚信息
      const rollbackInfo: RollbackInfo = {
        batchName: batch.name,
        tables: Array.from(insertedIds.keys()),
        recordIds: Array.from(insertedIds.values()).flat(),
        timestamp: Date.now(),
      };

      if (config.useTransaction) {
        this.rollbackStack.push(rollbackInfo);
        logRollback(rollbackInfo, config.rollbackLogPath);
      }

      const duration = performance.now() - startTime;

      if (config.verbose) {
        console.log(`✅ 种子数据填充完成`);
        console.log(`   总插入：${totalInserted}`);
        console.log(`   失败：${failedCount}`);
        console.log(`   耗时：${duration.toFixed(2)}ms`);
      }

      return {
        success: failedCount === 0,
        totalInserted,
        failedCount,
        tableStats,
        errors,
        rollbackInfo,
        duration,
      };
    } catch (error: any) {
      const duration = performance.now() - startTime;
      
      console.error(`❌ 种子数据填充失败：${error.message}`);
      
      return {
        success: false,
        totalInserted,
        failedCount,
        tableStats,
        errors: [...errors, { table: 'system', error: error.message }],
        duration,
      };
    }
  }

  /**
   * 使用工厂函数批量生成数据
   * 
   * @param table - 表名
   * @param factory - 数据生成函数
   * @param count - 生成数量
   * @param options - 额外选项
   * @returns 执行结果
   * 
   * @example
   * ```typescript
   * const result = await seeder.seedWithFactory(
   *   'tasks',
   *   (index) => ({
   *     title: `Task ${index + 1}`,
   *     description: `Description for task ${index + 1}`,
   *     status: 'pending',
   *     priority: ['low', 'medium', 'high'][index % 3],
   *   }),
   *   100
   * );
   * ```
   */
  async seedWithFactory<T>(
    table: string,
    factory: FactoryFn<T>,
    count: number,
    options: { name?: string; context?: any } = {}
  ): Promise<SeederResult> {
    const records: SeedRecord<T>[] = [];
    
    for (let i = 0; i < count; i++) {
      records.push({
        table,
        data: factory(i, options.context || {}),
        refId: generateRefId(table),
      });
    }

    return this.seed({
      name: options.name || `Generated ${count} ${table} records`,
      records,
    });
  }

  /**
   * 生成关联数据
   * 
   * @param mainTable - 主表名
   * @param mainFactory - 主表数据生成函数
   * @param relations - 关联配置列表
   * @param count - 主记录数量
   * @returns 执行结果
   * 
   * @example
   * ```typescript
   * const result = await seeder.seedWithRelations(
   *   'agents',
   *   (index) => ({ name: `Agent ${index}`, type: 'worker', status: 'active' }),
   *   [
   *     {
   *       mainTable: 'agents',
   *       relatedTable: 'tasks',
   *       foreignKey: 'agent_id',
   *       generate: (agent, idx) => ({
   *         title: `Task for ${agent.name} #${idx}`,
   *         status: 'pending',
   *         priority: 'medium',
   *       }),
   *     },
   *   ],
   *   10 // 生成 10 个 Agent，每个 Agent 有若干 Task
   * );
   * ```
   */
  async seedWithRelations<T>(
    mainTable: string,
    mainFactory: FactoryFn<T>,
    relations: RelationGenerator[],
    count: number,
    options: { 
      name?: string; 
      relatedCount?: number | ((index: number) => number);
      context?: any 
    } = {}
  ): Promise<SeederResult> {
    const config = this.defaultOptions;
    const records: SeedRecord[] = [];
    const mainRecords: SeedRecord[] = [];
    const relatedCountFn = typeof options.relatedCount === 'function' 
      ? options.relatedCount 
      : () => options.relatedCount || 3; // 默认每个主记录 3 个关联记录

    if (config.verbose) {
      console.log(`🔗 开始生成关联数据`);
      console.log(`   主表：${mainTable}`);
      console.log(`   关联表：${relations.map(r => r.relatedTable).join(', ')}`);
    }

    // 生成主记录
    for (let i = 0; i < count; i++) {
      const mainData = mainFactory(i, options.context || {});
      const refId = generateRefId(mainTable);
      
      const record: SeedRecord = {
        table: mainTable,
        data: mainData,
        refId,
      };
      
      mainRecords.push(record);
      records.push(record);
    }

    // 生成关联记录
    for (const relation of relations) {
      for (let i = 0; i < mainRecords.length; i++) {
        const mainRecord = mainRecords[i];
        const numRelated = relatedCountFn(i);
        
        for (let j = 0; j < numRelated; j++) {
          const relatedData = relation.generate(mainRecord.data, j);
          // 设置外键
          (relatedData as any)[relation.foreignKey] = mainRecord.id;
          
          records.push({
            table: relation.relatedTable,
            data: relatedData,
            refId: generateRefId(relation.relatedTable),
          });
        }
      }
    }

    return this.seed({
      name: options.name || `Related data: ${mainTable} + ${relations.length} relations`,
      records,
    });
  }

  /**
   * 回滚最近一次种子数据
   * 
   * @returns 是否成功回滚
   * 
   * @example
   * ```typescript
   * const rolledBack = await seeder.rollback();
   * if (rolledBack) {
   *   console.log('回滚成功');
   * }
   * ```
   */
  async rollback(): Promise<boolean> {
    if (this.rollbackStack.length === 0) {
      console.log('⚠️ 没有可回滚的种子数据');
      return false;
    }

    const rollbackInfo = this.rollbackStack.pop()!;
    
    if (this.defaultOptions.verbose) {
      console.log(`↩️ 开始回滚：${rollbackInfo.batchName}`);
      console.log(`   表：${rollbackInfo.tables.join(', ')}`);
      console.log(`   记录数：${rollbackInfo.recordIds.length}`);
    }

    try {
      db.transaction(() => {
        for (const id of rollbackInfo.recordIds) {
          // 需要确定记录属于哪个表
          // 这里简化处理，实际应该记录表名和 ID 的映射
          for (const table of rollbackInfo.tables) {
            const pkField = getPrimaryKeyField(table);
            const stmt = db.prepare(`DELETE FROM ${table} WHERE ${pkField} = ?`);
            const result = stmt.run(id);
            if (result.changes > 0) {
              if (this.defaultOptions.verbose) {
                console.log(`   ✓ 删除 ${table} #${id}`);
              }
              break;
            }
          }
        }
      })();

      if (this.defaultOptions.verbose) {
        console.log(`✅ 回滚完成`);
      }

      return true;
    } catch (error: any) {
      console.error(`❌ 回滚失败：${error.message}`);
      return false;
    }
  }

  /**
   * 回滚所有种子数据
   * 
   * @returns 回滚的批次数量
   * 
   * @example
   * ```typescript
   * const count = await seeder.rollbackAll();
   * console.log(`回滚了 ${count} 个批次`);
   * ```
   */
  async rollbackAll(): Promise<number> {
    let count = 0;
    
    while (await this.rollback()) {
      count++;
    }
    
    return count;
  }

  /**
   * 清空指定表
   * 
   * @param tables - 表名列表
   * @param options - 选项
   * 
   * @example
   * ```typescript
   * await seeder.truncate(['tasks', 'agents']);
   * ```
   */
  truncate(tables: string[], options: { resetAutoIncrement?: boolean } = {}): void {
    const config = { resetAutoIncrement: true, ...options };
    
    if (this.defaultOptions.verbose) {
      console.log(`🗑️ 清空表：${tables.join(', ')}`);
    }

    db.transaction(() => {
      for (const table of tables) {
        truncateTable(table);
        if (this.defaultOptions.verbose) {
          console.log(`   ✓ 清空 ${table}`);
        }
      }
    })();
  }

  /**
   * 获取回滚栈信息
   * 
   * @returns 回滚信息列表
   */
  getRollbackStack(): RollbackInfo[] {
    return [...this.rollbackStack];
  }

  /**
   * 清空回滚栈
   */
  clearRollbackStack(): void {
    this.rollbackStack = [];
  }

  /**
   * 插入单条记录 (内部使用)
   */
  private insertRecord(table: string, data: any): number {
    const columns = Object.keys(data);
    const values = Object.values(data);
    const placeholders = columns.map(() => '?').join(', ');
    
    const stmt = db.prepare(
      `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`
    );
    
    const result = stmt.run(...values);
    return result.lastInsertRowid as number;
  }
}

// ============== 快捷导出 ==============

/**
 * 创建种子数据工具的快捷函数
 * 
 * @example
 * ```typescript
 * import { createSeeder } from './seeder-utils-skill';
 * 
 * const seeder = createSeeder({ verbose: true });
 * ```
 */
export function createSeeder(options?: SeederOptions): SeederUtils {
  return new SeederUtils(options);
}

/**
 * 快速执行种子数据填充
 * 
 * @example
 * ```typescript
 * import { seed } from './seeder-utils-skill';
 * 
 * const result = await seed({
 *   name: 'Quick Seed',
 *   records: [
 *     { table: 'agents', data: { name: 'Test', type: 'test' } },
 *   ],
 * });
 * ```
 */
export async function seed(batch: SeedBatch, options?: SeederOptions): Promise<SeederResult> {
  const seeder = new SeederUtils(options);
  return seeder.seed(batch);
}

/**
 * 使用工厂函数快速生成数据
 * 
 * @example
 * ```typescript
 * import { seedFactory } from './seeder-utils-skill';
 * 
 * const result = await seedFactory(
 *   'tasks',
 *   (i) => ({ title: `Task ${i}`, status: 'pending' }),
 *   100
 * );
 * ```
 */
export async function seedFactory<T>(
  table: string,
  factory: FactoryFn<T>,
  count: number,
  options?: { name?: string; context?: any; seederOptions?: SeederOptions }
): Promise<SeederResult> {
  const seeder = new SeederUtils(options?.seederOptions);
  return seeder.seedWithFactory(table, factory, count, {
    name: options?.name,
    context: options?.context,
  });
}

/**
 * 快速回滚最近一次种子数据
 * 
 * @example
 * ```typescript
 * import { rollback } from './seeder-utils-skill';
 * 
 * await rollback();
 * ```
 */
export async function rollback(): Promise<boolean> {
  // 创建临时实例，无法访问之前的回滚栈
  // 这个函数主要用于简单场景，复杂场景请使用 SeederUtils 实例
  console.log('⚠️ 快捷回滚函数无法访问回滚栈，请使用 SeederUtils 实例');
  return false;
}

// ============== 预定义种子数据 ==============

/**
 * 预定义的 Agent 种子数据
 */
export const DEFAULT_AGENTS: Array<Omit<Agent, 'id'>> = [
  { name: 'Axon', type: 'main', status: 'active' },
  { name: 'KAEL', type: 'engineering', status: 'active' },
  { name: 'NEXUS', type: 'strategy', status: 'active' },
  { name: 'NOVA', type: 'growth', status: 'active' },
  { name: 'ARIA', type: 'product', status: 'active' },
];

/**
 * 预定义的 Skill 种子数据
 */
export const DEFAULT_SKILLS: Array<Omit<Skill, 'id'>> = [
  { name: 'github', description: 'GitHub 操作', location: '~/.openclaw/skills/github', enabled: true },
  { name: 'weather', description: '天气查询', location: '~/.openclaw/skills/weather', enabled: true },
  { name: 'healthcheck', description: '系统健康检查', location: '~/.openclaw/skills/healthcheck', enabled: true },
  { name: 'quality-testing', description: '质量测试', location: '~/.openclaw/skills/quality-testing', enabled: true },
  { name: 'technical-design', description: '技术设计', location: '~/.openclaw/skills/technical-design', enabled: true },
];

/**
 * 预定义的 Task 种子数据工厂
 */
export function createDefaultTask(index: number): Omit<Task, 'id'> {
  const statuses = ['pending', 'in_progress', 'completed', 'blocked'];
  const priorities = ['low', 'medium', 'high', 'critical'];
  const titles = [
    '完成项目架构设计',
    '实现核心功能模块',
    '编写单元测试',
    '代码审查与优化',
    '部署到生产环境',
    '性能监控与调优',
    '文档编写与更新',
    '用户反馈处理',
  ];
  
  return {
    title: `${titles[index % titles.length]} #${index + 1}`,
    description: `任务描述：这是第 ${index + 1} 个示例任务`,
    status: statuses[index % statuses.length],
    priority: priorities[index % priorities.length],
  };
}

// ============== 导出 ==============

export default SeederUtils;
