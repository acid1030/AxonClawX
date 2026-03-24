/**
 * SQL 查询构建器技能 - Query Builder Skill
 * 
 * 功能:
 * 1. SELECT/INSERT/UPDATE/DELETE 语句构建
 * 2. WHERE 条件构建 (支持多种操作符)
 * 3. JOIN/LIMIT/OFFSET 子句
 * 4. 参数化查询支持
 * 
 * @author Axon (KAEL)
 * @version 1.0.0
 */

// ============== 类型定义 ==============

/** SQL 操作类型 */
export type QueryType = 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE';

/** WHERE 条件操作符 */
export type WhereOperator = 
  | '='        // 等于
  | '!='       // 不等于
  | '<>'       // 不等于 (SQL 标准)
  | '>'        // 大于
  | '>='       // 大于等于
  | '<'        // 小于
  | '<='       // 小于等于
  | 'LIKE'     // 模糊匹配
  | 'NOT LIKE' // 不匹配
  | 'IN'       // 在集合中
  | 'NOT IN'   // 不在集合中
  | 'IS'       // IS NULL/IS TRUE 等
  | 'IS NOT'   // IS NOT NULL/IS NOT TRUE 等
  | 'BETWEEN'  // 在范围内
  | 'EXISTS'   // 存在子查询
  | 'REGEXP'   // 正则匹配;

/** JOIN 类型 */
export type JoinType = 
  | 'INNER'    // 内连接
  | 'LEFT'     // 左连接
  | 'RIGHT'    // 右连接
  | 'FULL'     // 全连接
  | 'CROSS';   // 交叉连接

/** 排序方向 */
export type OrderDirection = 'ASC' | 'DESC';

/** 字段配置 */
export interface FieldConfig {
  /** 字段名 */
  name: string;
  /** 表别名 (可选) */
  table?: string;
  /** 别名 (可选) */
  alias?: string;
  /** 聚合函数 (可选) */
  aggregate?: 'COUNT' | 'SUM' | 'AVG' | 'MAX' | 'MIN';
}

/** WHERE 条件配置 */
export interface WhereCondition {
  /** 字段名 */
  field: string;
  /** 操作符 */
  operator: WhereOperator;
  /** 值 (对于 IS/IS NOT 可以为 null) */
  value?: any;
  /** 第二个值 (用于 BETWEEN) */
  value2?: any;
  /** 逻辑运算符 (默认 AND) */
  logical?: 'AND' | 'OR';
  /** 子查询 (用于 EXISTS) */
  subQuery?: string;
}

/** JOIN 配置 */
export interface JoinConfig {
  /** 表名 */
  table: string;
  /** JOIN 类型 */
  type?: JoinType;
  /** 连接条件 */
  on: string;
  /** 表别名 (可选) */
  alias?: string;
}

/** ORDER BY 配置 */
export interface OrderConfig {
  /** 字段名 */
  field: string;
  /** 排序方向 */
  direction?: OrderDirection;
}

/** SELECT 查询配置 */
export interface SelectConfig {
  /** 查询的字段 (默认 ['*']) */
  fields?: (string | FieldConfig)[];
  /** 表名 */
  table: string;
  /** 表别名 (可选) */
  alias?: string;
  /** WHERE 条件 */
  where?: WhereCondition[];
  /** JOIN 配置 */
  joins?: JoinConfig[];
  /** ORDER BY 配置 */
  orderBy?: OrderConfig[];
  /** LIMIT 数量 */
  limit?: number;
  /** OFFSET 偏移 */
  offset?: number;
  /** DISTINCT (默认 false) */
  distinct?: boolean;
  /** GROUP BY 字段 */
  groupBy?: string[];
  /** HAVING 条件 */
  having?: WhereCondition[];
}

/** INSERT 查询配置 */
export interface InsertConfig {
  /** 表名 */
  table: string;
  /** 字段名数组 */
  fields?: string[];
  /** 值数组 (单行) */
  values?: any[];
  /** 值数组数组 (多行) */
  valuesMulti?: any[][];
  /** 对象数组 (多行便捷方式) */
  data?: Record<string, any>[];
  /** SELECT 子句 (INSERT INTO ... SELECT) */
  selectQuery?: string;
}

/** UPDATE 查询配置 */
export interface UpdateConfig {
  /** 表名 */
  table: string;
  /** 要更新的字段和值 */
  set: Record<string, any>;
  /** WHERE 条件 */
  where?: WhereCondition[];
}

/** DELETE 查询配置 */
export interface DeleteConfig {
  /** 表名 */
  table: string;
  /** WHERE 条件 */
  where?: WhereCondition[];
}

/** 查询结果 */
export interface QueryResult {
  /** 生成的 SQL 语句 */
  sql: string;
  /** 参数化查询的参数值 */
  params: any[];
  /** 查询类型 */
  type: QueryType;
}

// ============== 工具函数 ==============

/**
 * 转义标识符 (表名、字段名)
 */
function escapeIdentifier(identifier: string): string {
  // 如果已经包含引号，直接返回
  if (identifier.startsWith('"') && identifier.endsWith('"')) {
    return identifier;
  }
  if (identifier.startsWith('`') && identifier.endsWith('`')) {
    return identifier;
  }
  if (identifier.startsWith('[') && identifier.endsWith(']')) {
    return identifier;
  }
  
  // 使用双引号转义 (标准 SQL)
  return `"${identifier.replace(/"/g, '""')}"`;
}

/**
 * 转义字段名 (支持表别名.字段名)
 */
function escapeField(field: string | FieldConfig): string {
  if (typeof field === 'string') {
    if (field === '*') return '*';
    if (field.includes('.')) {
      const parts = field.split('.');
      return `${escapeIdentifier(parts[0])}.${escapeIdentifier(parts[1])}`;
    }
    return escapeIdentifier(field);
  }
  
  // FieldConfig 对象
  let result = field.name;
  if (field.table) {
    result = `${field.table}.${result}`;
  }
  
  if (field.aggregate) {
    result = `${field.aggregate}(${result})`;
  }
  
  if (field.alias) {
    result = `${result} AS ${escapeIdentifier(field.alias)}`;
  }
  
  return result;
}

/**
 * 构建 WHERE 子句
 */
function buildWhereClause(conditions: WhereCondition[], params: any[]): string {
  if (!conditions || conditions.length === 0) {
    return '';
  }
  
  const clauses: string[] = [];
  
  for (let i = 0; i < conditions.length; i++) {
    const cond = conditions[i];
    const logical = i > 0 ? (cond.logical || 'AND') : '';
    
    let clause = '';
    const field = escapeIdentifier(cond.field);
    
    switch (cond.operator) {
      case 'IS':
      case 'IS NOT':
        clause = `${field} ${cond.operator} ${cond.value}`;
        break;
      
      case 'IN':
      case 'NOT IN':
        if (Array.isArray(cond.value)) {
          const placeholders = cond.value.map(() => '?').join(', ');
          clause = `${field} ${cond.operator} (${placeholders})`;
          params.push(...cond.value);
        } else if (typeof cond.value === 'string') {
          // 子查询
          clause = `${field} ${cond.operator} (${cond.value})`;
        }
        break;
      
      case 'BETWEEN':
        clause = `${field} BETWEEN ? AND ?`;
        params.push(cond.value, cond.value2);
        break;
      
      case 'EXISTS':
        clause = `${cond.operator} (${cond.subQuery})`;
        break;
      
      case 'LIKE':
      case 'NOT LIKE':
      case 'REGEXP':
        clause = `${field} ${cond.operator} ?`;
        params.push(cond.value);
        break;
      
      default:
        clause = `${field} ${cond.operator} ?`;
        params.push(cond.value);
    }
    
    if (logical) {
      clauses.push(`${logical} ${clause}`);
    } else {
      clauses.push(clause);
    }
  }
  
  return `WHERE ${clauses.join(' ')}`;
}

/**
 * 构建 JOIN 子句
 */
function buildJoinClause(joins: JoinConfig[]): string {
  if (!joins || joins.length === 0) {
    return '';
  }
  
  return joins.map(join => {
    const type = join.type || 'INNER';
    const table = join.alias 
      ? `${escapeIdentifier(join.table)} ${escapeIdentifier(join.alias)}`
      : escapeIdentifier(join.table);
    return `${type} JOIN ${table} ON ${join.on}`;
  }).join(' ');
}

/**
 * 构建 ORDER BY 子句
 */
function buildOrderByClause(orderBy: OrderConfig[]): string {
  if (!orderBy || orderBy.length === 0) {
    return '';
  }
  
  const clauses = orderBy.map(order => {
    const field = escapeIdentifier(order.field);
    const dir = order.direction || 'ASC';
    return `${field} ${dir}`;
  });
  
  return `ORDER BY ${clauses.join(', ')}`;
}

/**
 * 构建 GROUP BY 子句
 */
function buildGroupByClause(groupBy: string[]): string {
  if (!groupBy || groupBy.length === 0) {
    return '';
  }
  
  return `GROUP BY ${groupBy.map(f => escapeIdentifier(f)).join(', ')}`;
}

/**
 * 构建 HAVING 子句
 */
function buildHavingClause(conditions: WhereCondition[], params: any[]): string {
  if (!conditions || conditions.length === 0) {
    return '';
  }
  
  const whereClause = buildWhereClause(conditions, params);
  return whereClause.replace('WHERE', 'HAVING');
}

// ============== SELECT 查询构建 ==============

/**
 * 构建 SELECT 查询
 */
export function buildSelect(config: SelectConfig): QueryResult {
  const params: any[] = [];
  
  // 构建 SELECT 字段
  const fields = config.fields || ['*'];
  const fieldStrings = fields.map(f => {
    if (typeof f === 'string') {
      return f === '*' ? '*' : escapeIdentifier(f);
    }
    return escapeField(f);
  });
  
  const selectClause = config.distinct 
    ? `SELECT DISTINCT ${fieldStrings.join(', ')}`
    : `SELECT ${fieldStrings.join(', ')}`;
  
  // 构建 FROM 子句
  const fromTable = config.alias
    ? `${escapeIdentifier(config.table)} ${escapeIdentifier(config.alias)}`
    : escapeIdentifier(config.table);
  
  // 构建 JOIN 子句
  const joinClause = buildJoinClause(config.joins || []);
  
  // 构建 WHERE 子句
  const whereClause = buildWhereClause(config.where || [], params);
  
  // 构建 GROUP BY 子句
  const groupByClause = buildGroupByClause(config.groupBy);
  
  // 构建 HAVING 子句
  const havingClause = buildHavingClause(config.having || [], params);
  
  // 构建 ORDER BY 子句
  const orderByClause = buildOrderByClause(config.orderBy || []);
  
  // 构建 LIMIT 和 OFFSET
  let limitClause = '';
  if (config.limit !== undefined) {
    limitClause = `LIMIT ${config.limit}`;
    if (config.offset !== undefined) {
      limitClause += ` OFFSET ${config.offset}`;
    }
  }
  
  // 组合完整查询
  const sql = [
    selectClause,
    `FROM ${fromTable}`,
    joinClause,
    whereClause,
    groupByClause,
    havingClause,
    orderByClause,
    limitClause
  ].filter(Boolean).join('\n');
  
  return {
    sql,
    params,
    type: 'SELECT'
  };
}

/**
 * 快速 SELECT (便捷函数)
 */
export function select(
  table: string,
  fields?: string[],
  where?: Record<string, any>
): QueryResult {
  const whereConditions: WhereCondition[] = [];
  const params: any[] = [];
  
  if (where) {
    for (const [field, value] of Object.entries(where)) {
      whereConditions.push({
        field,
        operator: value === null ? 'IS' : '=',
        value: value === null ? 'NULL' : value
      });
    }
  }
  
  return buildSelect({
    table,
    fields,
    where: whereConditions
  });
}

// ============== INSERT 查询构建 ==============

/**
 * 构建 INSERT 查询
 */
export function buildInsert(config: InsertConfig): QueryResult {
  const params: any[] = [];
  
  // INSERT INTO ... SELECT 模式
  if (config.selectQuery) {
    return {
      sql: `INSERT INTO ${escapeIdentifier(config.table)}\n${config.selectQuery}`,
      params: [],
      type: 'INSERT'
    };
  }
  
  // 多行插入 (data 模式)
  if (config.data && config.data.length > 0) {
    const fields = Object.keys(config.data[0]);
    const valueRows = config.data.map(row => {
      return fields.map(field => {
        params.push(row[field]);
        return '?';
      }).join(', ');
    });
    
    return {
      sql: `INSERT INTO ${escapeIdentifier(config.table)}\n(${fields.map(f => escapeIdentifier(f)).join(', ')})\nVALUES\n${valueRows.map(r => `(${r})`).join(',\n')}`,
      params,
      type: 'INSERT'
    };
  }
  
  // 多行插入 (valuesMulti 模式)
  if (config.valuesMulti && config.valuesMulti.length > 0) {
    const fields = config.fields || [];
    const valueRows = config.valuesMulti.map(values => {
      values.forEach(v => params.push(v));
      return values.map(() => '?').join(', ');
    });
    
    return {
      sql: `INSERT INTO ${escapeIdentifier(config.table)}\n(${fields.map(f => escapeIdentifier(f)).join(', ')})\nVALUES\n${valueRows.map(r => `(${r})`).join(',\n')}`,
      params,
      type: 'INSERT'
    };
  }
  
  // 单行插入 (values 模式)
  if (config.values && config.values.length > 0) {
    const fields = config.fields || [];
    config.values.forEach(v => params.push(v));
    
    return {
      sql: `INSERT INTO ${escapeIdentifier(config.table)}\n(${fields.map(f => escapeIdentifier(f)).join(', ')})\nVALUES (${config.values.map(() => '?').join(', ')})`,
      params,
      type: 'INSERT'
    };
  }
  
  throw new Error('INSERT 配置必须包含 values、valuesMulti、data 或 selectQuery');
}

/**
 * 快速 INSERT (便捷函数)
 */
export function insert(table: string, data: Record<string, any>): QueryResult {
  return buildInsert({
    table,
    data: [data]
  });
}

// ============== UPDATE 查询构建 ==============

/**
 * 构建 UPDATE 查询
 */
export function buildUpdate(config: UpdateConfig): QueryResult {
  const params: any[] = [];
  
  // 构建 SET 子句
  const setClauses: string[] = [];
  for (const [field, value] of Object.entries(config.set)) {
    setClauses.push(`${escapeIdentifier(field)} = ?`);
    params.push(value);
  }
  
  // 构建 WHERE 子句
  const whereParams: any[] = [];
  const whereClause = buildWhereClause(config.where || [], whereParams);
  
  return {
    sql: `UPDATE ${escapeIdentifier(config.table)}\nSET ${setClauses.join(', ')}\n${whereClause}`,
    params: [...params, ...whereParams],
    type: 'UPDATE'
  };
}

/**
 * 快速 UPDATE (便捷函数)
 */
export function update(
  table: string,
  set: Record<string, any>,
  where?: Record<string, any>
): QueryResult {
  const whereConditions: WhereCondition[] = [];
  
  if (where) {
    for (const [field, value] of Object.entries(where)) {
      whereConditions.push({
        field,
        operator: value === null ? 'IS' : '=',
        value: value === null ? 'NULL' : value
      });
    }
  }
  
  return buildUpdate({
    table,
    set,
    where: whereConditions
  });
}

// ============== DELETE 查询构建 ==============

/**
 * 构建 DELETE 查询
 */
export function buildDelete(config: DeleteConfig): QueryResult {
  const params: any[] = [];
  
  // 构建 WHERE 子句
  const whereClause = buildWhereClause(config.where || [], params);
  
  return {
    sql: `DELETE FROM ${escapeIdentifier(config.table)}\n${whereClause}`,
    params,
    type: 'DELETE'
  };
}

/**
 * 快速 DELETE (便捷函数)
 */
export function del(table: string, where?: Record<string, any>): QueryResult {
  const whereConditions: WhereCondition[] = [];
  
  if (where) {
    for (const [field, value] of Object.entries(where)) {
      whereConditions.push({
        field,
        operator: value === null ? 'IS' : '=',
        value: value === null ? 'NULL' : value
      });
    }
  }
  
  return buildDelete({
    table,
    where: whereConditions
  });
}

// ============== WHERE 条件构建器 ==============

/**
 * 创建等于条件
 */
export function eq(field: string, value: any): WhereCondition {
  return {
    field,
    operator: value === null ? 'IS' : '=',
    value: value === null ? 'NULL' : value
  };
}

/**
 * 创建不等于条件
 */
export function neq(field: string, value: any): WhereCondition {
  return {
    field,
    operator: value === null ? 'IS NOT' : '!=',
    value: value === null ? 'NULL' : value
  };
}

/**
 * 创建大于条件
 */
export function gt(field: string, value: any): WhereCondition {
  return { field, operator: '>', value };
}

/**
 * 创建大于等于条件
 */
export function gte(field: string, value: any): WhereCondition {
  return { field, operator: '>=', value };
}

/**
 * 创建小于条件
 */
export function lt(field: string, value: any): WhereCondition {
  return { field, operator: '<', value };
}

/**
 * 创建小于等于条件
 */
export function lte(field: string, value: any): WhereCondition {
  return { field, operator: '<=', value };
}

/**
 * 创建 LIKE 条件
 */
export function like(field: string, pattern: string): WhereCondition {
  return { field, operator: 'LIKE', value: pattern };
}

/**
 * 创建 IN 条件
 */
export function inList(field: string, values: any[]): WhereCondition {
  return { field, operator: 'IN', value: values };
}

/**
 * 创建 NOT IN 条件
 */
export function notIn(field: string, values: any[]): WhereCondition {
  return { field, operator: 'NOT IN', value: values };
}

/**
 * 创建 BETWEEN 条件
 */
export function between(field: string, min: any, max: any): WhereCondition {
  return { field, operator: 'BETWEEN', value: min, value2: max };
}

/**
 * 创建 IS NULL 条件
 */
export function isNull(field: string): WhereCondition {
  return { field, operator: 'IS', value: 'NULL' };
}

/**
 * 创建 IS NOT NULL 条件
 */
export function isNotNull(field: string): WhereCondition {
  return { field, operator: 'IS NOT', value: 'NULL' };
}

/**
 * 创建 EXISTS 条件
 */
export function exists(subQuery: string): WhereCondition {
  return { field: '', operator: 'EXISTS', subQuery };
}

/**
 * 创建 AND 连接的条件
 */
export function and(condition: WhereCondition): WhereCondition {
  return { ...condition, logical: 'AND' };
}

/**
 * 创建 OR 连接的条件
 */
export function or(condition: WhereCondition): WhereCondition {
  return { ...condition, logical: 'OR' };
}

// ============== JOIN 构建器 ==============

/**
 * 创建 INNER JOIN
 */
export function innerJoin(table: string, on: string, alias?: string): JoinConfig {
  return { table, type: 'INNER', on, alias };
}

/**
 * 创建 LEFT JOIN
 */
export function leftJoin(table: string, on: string, alias?: string): JoinConfig {
  return { table, type: 'LEFT', on, alias };
}

/**
 * 创建 RIGHT JOIN
 */
export function rightJoin(table: string, on: string, alias?: string): JoinConfig {
  return { table, type: 'RIGHT', on, alias };
}

/**
 * 创建 FULL JOIN
 */
export function fullJoin(table: string, on: string, alias?: string): JoinConfig {
  return { table, type: 'FULL', on, alias };
}

// ============== ORDER BY 构建器 ==============

/**
 * 创建升序排序
 */
export function asc(field: string): OrderConfig {
  return { field, direction: 'ASC' };
}

/**
 * 创建降序排序
 */
export function desc(field: string): OrderConfig {
  return { field, direction: 'DESC' };
}

// ============== 高级功能 ==============

/**
 * 构建 UNION 查询
 */
export function union(queries: QueryResult[], all = false): QueryResult {
  if (queries.length < 2) {
    throw new Error('UNION 至少需要两个查询');
  }
  
  const operator = all ? 'UNION ALL' : 'UNION';
  const sql = queries.map(q => q.sql).join(`\n${operator}\n`);
  
  // 合并所有参数
  const params = queries.flatMap(q => q.params);
  
  return {
    sql,
    params,
    type: 'SELECT'
  };
}

/**
 * 构建子查询字段
 */
export function subQueryField(subQuery: string, alias: string): FieldConfig {
  return {
    name: `(${subQuery})`,
    alias
  };
}

/**
 * 构建 CASE WHEN 表达式
 */
export function caseWhen(
  conditions: Array<{ when: WhereCondition; then: any }>,
  elseValue?: any
): string {
  const cases = conditions.map(c => {
    const whenClause = buildWhereClause([c.when], []);
    return `WHEN ${whenClause.replace('WHERE ', '')} THEN ?`;
  });
  
  const elseClause = elseValue !== undefined ? `ELSE ?` : '';
  
  return `CASE ${cases.join(' ')} ${elseClause} END`;
}

/**
 * 参数化查询执行辅助
 */
export function prepareQuery(query: QueryResult): {
  sql: string;
  params: any[];
  /** 将参数替换回 SQL (用于调试) */
  toDebugSql: () => string;
} {
  return {
    sql: query.sql,
    params: query.params,
    toDebugSql: () => {
      let debugSql = query.sql;
      let paramIndex = 0;
      
      debugSql = debugSql.replace(/\?/g, (match) => {
        const param = query.params[paramIndex++];
        if (param === null) return 'NULL';
        if (typeof param === 'string') return `'${param.replace(/'/g, "''")}'`;
        if (typeof param === 'boolean') return param ? 'TRUE' : 'FALSE';
        if (param instanceof Date) return `'${param.toISOString()}'`;
        return String(param);
      });
      
      return debugSql;
    }
  };
}

/**
 * 验证 SQL 注入风险 (基础检查)
 */
export function validateQuery(sql: string): {
  valid: boolean;
  warnings: string[];
} {
  const warnings: string[] = [];
  const upperSql = sql.toUpperCase();
  
  // 检查危险关键字
  const dangerousPatterns = [
    { pattern: /;\s*DROP/i, warning: '包含 DROP 语句' },
    { pattern: /;\s*DELETE/i, warning: '包含 DELETE 语句' },
    { pattern: /;\s*UPDATE/i, warning: '包含 UPDATE 语句' },
    { pattern: /;\s*INSERT/i, warning: '包含 INSERT 语句' },
    { pattern: /--/, warning: '包含 SQL 注释' },
    { pattern: /\/\*/, warning: '包含 SQL 块注释' },
    { pattern: /EXEC\s*\(/i, warning: '包含 EXEC 调用' },
    { pattern: /xp_/i, warning: '包含扩展存储过程' }
  ];
  
  for (const { pattern, warning } of dangerousPatterns) {
    if (pattern.test(sql)) {
      warnings.push(warning);
    }
  }
  
  return {
    valid: warnings.length === 0,
    warnings
  };
}

// ============== 导出 ==============

export default {
  // 主要构建函数
  buildSelect,
  buildInsert,
  buildUpdate,
  buildDelete,
  
  // 便捷函数
  select,
  insert,
  update,
  del,
  
  // WHERE 条件构建器
  eq,
  neq,
  gt,
  gte,
  lt,
  lte,
  like,
  inList,
  notIn,
  between,
  isNull,
  isNotNull,
  exists,
  and,
  or,
  
  // JOIN 构建器
  innerJoin,
  leftJoin,
  rightJoin,
  fullJoin,
  
  // ORDER BY 构建器
  asc,
  desc,
  
  // 高级功能
  union,
  subQueryField,
  caseWhen,
  prepareQuery,
  validateQuery
};
