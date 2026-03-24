/**
 * 数据过滤技能 - Filter Skill
 * 
 * 功能:
 * 1. 多条件过滤 - 支持 AND/OR 逻辑组合多个过滤条件
 * 2. 模糊匹配 - 支持字符串模糊搜索和相似度匹配
 * 3. 范围过滤 - 支持数值、日期等范围比较
 * 
 * @author Axon
 * @version 1.0.0
 */

// ============== 类型定义 ==============

/** 逻辑操作符 */
export type LogicalOperator = 'AND' | 'OR';

/** 比较操作符 */
export type ComparisonOperator = 
  | 'eq'      // 等于
  | 'neq'     // 不等于
  | 'gt'      // 大于
  | 'gte'     // 大于等于
  | 'lt'      // 小于
  | 'lte'     // 小于等于
  | 'in'      // 包含在数组中
  | 'nin'     // 不包含在数组中
  | 'contains'    // 包含字符串
  | 'icontains'   // 包含字符串 (不区分大小写)
  | 'startsWith'  // 以...开头
  | 'endsWith'    // 以...结尾
  | 'regex'       // 正则匹配
  | 'fuzzy'       // 模糊匹配
  | 'between'     // 在范围内
  | 'exists';     // 字段存在

/** 单个过滤条件 */
export interface FilterCondition {
  /** 字段名 */
  field: string;
  /** 操作符 */
  operator: ComparisonOperator;
  /** 比较值 */
  value: any;
  /** 模糊匹配阈值 (0-1, 仅 fuzzy 操作符使用) */
  threshold?: number;
  /** 是否取反 */
  not?: boolean;
}

/** 组合过滤条件 */
export interface FilterGroup {
  /** 逻辑操作符 */
  logic: LogicalOperator;
  /** 子条件列表 */
  conditions: (FilterCondition | FilterGroup)[];
}

/** 过滤配置 */
export interface FilterConfig {
  /** 默认逻辑操作符 */
  defaultLogic: LogicalOperator;
  /** 模糊匹配默认阈值 */
  defaultFuzzyThreshold: number;
  /** 是否启用缓存 */
  enableCache: boolean;
  /** 缓存大小 */
  cacheSize: number;
}

/** 过滤选项 */
export interface FilterOptions {
  /** 逻辑操作符 */
  logic?: LogicalOperator;
  /** 最大返回结果数 */
  limit?: number;
  /** 跳过结果数 */
  offset?: number;
  /** 排序字段 */
  sortBy?: string;
  /** 排序方向 */
  sortOrder?: 'asc' | 'desc';
  /** 自定义过滤函数 */
  customFilter?: (item: any) => boolean;
}

/** 过滤结果 */
export interface FilterResult<T = any> {
  /** 过滤后的数据 */
  data: T[];
  /** 原始数据总数 */
  total: number;
  /** 过滤后数据总数 */
  filteredTotal: number;
  /** 是否达到上限 */
  hasMore: boolean;
  /** 应用的过滤条件 */
  appliedFilters: FilterGroup;
  /** 执行时间 (毫秒) */
  executionTime: number;
}

/** 字段统计信息 */
export interface FieldStats {
  /** 字段名 */
  field: string;
  /** 数据类型 */
  type: string;
  /** 非空值数量 */
  nonNullCount: number;
  /** 唯一值数量 */
  uniqueCount: number;
  /** 最小值 (数值类型) */
  min?: number;
  /** 最大值 (数值类型) */
  max?: number;
  /** 平均值 (数值类型) */
  avg?: number;
}

// ============== 缓存实现 ==============

class LRUCache<K, V> {
  private cache: Map<K, V>;
  private maxSize: number;

  constructor(maxSize: number) {
    this.cache = new Map();
    this.maxSize = maxSize;
  }

  get(key: K): V | undefined {
    const value = this.cache.get(key);
    if (value !== undefined) {
      this.cache.delete(key);
      this.cache.set(key, value);
    }
    return value;
  }

  set(key: K, value: V): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, value);
  }

  clear(): void {
    this.cache.clear();
  }
}

// ============== 核心过滤类 ==============

export class FilterSkill {
  private config: FilterConfig;
  private cache: LRUCache<string, any[]> | null;

  constructor(config?: Partial<FilterConfig>) {
    this.config = {
      defaultLogic: 'AND',
      defaultFuzzyThreshold: 0.6,
      enableCache: true,
      cacheSize: 100,
      ...config,
    };

    this.cache = this.config.enableCache 
      ? new LRUCache(this.config.cacheSize) 
      : null;
  }

  /**
   * 执行过滤
   * 
   * @param data - 待过滤的数据数组
   * @param conditions - 过滤条件
   * @param options - 过滤选项
   * @returns 过滤结果
   */
  filter<T extends Record<string, any>>(
    data: T[],
    conditions: (FilterCondition | FilterGroup)[],
    options?: FilterOptions
  ): FilterResult<T> {
    const startTime = performance.now();
    const total = data.length;

    // 生成缓存键
    const cacheKey = this.generateCacheKey(data, conditions, options);
    if (this.cache) {
      const cached = this.cache.get(cacheKey);
      if (cached) {
        return {
          data: cached,
          total,
          filteredTotal: cached.length,
          hasMore: false,
          appliedFilters: this.buildFilterGroup(conditions),
          executionTime: 0,
        };
      }
    }

    // 构建过滤组
    const filterGroup = this.buildFilterGroup(conditions);

    // 执行过滤
    let filtered = data.filter(item => 
      this.evaluateCondition(item, filterGroup)
    );

    // 应用自定义过滤器
    if (options?.customFilter) {
      filtered = filtered.filter(options.customFilter);
    }

    // 排序
    if (options?.sortBy) {
      filtered.sort((a, b) => {
        const aVal = a[options.sortBy!];
        const bVal = b[options.sortBy!];
        
        if (aVal === bVal) return 0;
        if (aVal === null || aVal === undefined) return 1;
        if (bVal === null || bVal === undefined) return -1;

        const comparison = aVal < bVal ? -1 : 1;
        return options.sortOrder === 'desc' ? -comparison : comparison;
      });
    }

    // 分页
    const offset = options?.offset || 0;
    const limit = options?.limit || filtered.length;
    const hasMore = offset + limit < filtered.length;
    const paginated = filtered.slice(offset, offset + limit);

    // 缓存结果
    if (this.cache) {
      this.cache.set(cacheKey, paginated);
    }

    const executionTime = performance.now() - startTime;

    return {
      data: paginated,
      total,
      filteredTotal: filtered.length,
      hasMore,
      appliedFilters: filterGroup,
      executionTime,
    };
  }

  /**
   * 创建单个过滤条件
   */
  condition(
    field: string,
    operator: ComparisonOperator,
    value: any,
    options?: { threshold?: number; not?: boolean }
  ): FilterCondition {
    return {
      field,
      operator,
      value,
      threshold: options?.threshold,
      not: options?.not,
    };
  }

  /**
   * 创建组合过滤条件
   */
  group(
    logic: LogicalOperator,
    conditions: (FilterCondition | FilterGroup)[]
  ): FilterGroup {
    return { logic, conditions };
  }

  /**
   * 分析字段统计信息
   */
  analyzeFields<T extends Record<string, any>>(data: T[]): FieldStats[] {
    if (data.length === 0) return [];

    const fields = new Set<string>();
    data.forEach(item => Object.keys(item).forEach(key => fields.add(key)));

    const stats: FieldStats[] = [];

    fields.forEach(field => {
      const values = data.map(item => item[field]).filter(v => v !== null && v !== undefined);
      const uniqueValues = new Set(values);
      
      const stat: FieldStats = {
        field,
        type: this.inferType(values),
        nonNullCount: values.length,
        uniqueCount: uniqueValues.size,
      };

      // 数值类型统计
      if (stat.type === 'number') {
        const numValues = values as number[];
        stat.min = Math.min(...numValues);
        stat.max = Math.max(...numValues);
        stat.avg = numValues.reduce((a, b) => a + b, 0) / numValues.length;
      }

      stats.push(stat);
    });

    return stats;
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.cache?.clear();
  }

  // ============== 私有方法 ==============

  /**
   * 构建过滤组
   */
  private buildFilterGroup(conditions: (FilterCondition | FilterGroup)[]): FilterGroup {
    if (conditions.length === 0) {
      return this.group('AND', []);
    }
    if (conditions.length === 1 && 'logic' in conditions[0]) {
      return conditions[0] as FilterGroup;
    }
    return this.group(this.config.defaultLogic, conditions);
  }

  /**
   * 评估条件
   */
  private evaluateCondition(item: any, group: FilterGroup): boolean {
    if (group.conditions.length === 0) return true;

    const results = group.conditions.map(condition => {
      if ('logic' in condition) {
        return this.evaluateCondition(item, condition as FilterGroup);
      }
      return this.evaluateSingleCondition(item, condition as FilterCondition);
    });

    if (group.logic === 'AND') {
      return results.every(r => r);
    } else {
      return results.some(r => r);
    }
  }

  /**
   * 评估单个条件
   */
  private evaluateSingleCondition(item: any, condition: FilterCondition): boolean {
    const value = this.getNestedValue(item, condition.field);
    const { operator, value: compareValue, threshold, not } = condition;

    let result: boolean;

    switch (operator) {
      case 'eq':
        result = value === compareValue;
        break;
      case 'neq':
        result = value !== compareValue;
        break;
      case 'gt':
        result = value > compareValue;
        break;
      case 'gte':
        result = value >= compareValue;
        break;
      case 'lt':
        result = value < compareValue;
        break;
      case 'lte':
        result = value <= compareValue;
        break;
      case 'in':
        result = Array.isArray(compareValue) && compareValue.includes(value);
        break;
      case 'nin':
        result = !Array.isArray(compareValue) || !compareValue.includes(value);
        break;
      case 'contains':
        result = typeof value === 'string' && value.includes(String(compareValue));
        break;
      case 'icontains':
        result = typeof value === 'string' && 
                 value.toLowerCase().includes(String(compareValue).toLowerCase());
        break;
      case 'startsWith':
        result = typeof value === 'string' && value.startsWith(String(compareValue));
        break;
      case 'endsWith':
        result = typeof value === 'string' && value.endsWith(String(compareValue));
        break;
      case 'regex':
        result = typeof value === 'string' && new RegExp(compareValue).test(value);
        break;
      case 'fuzzy':
        result = this.fuzzyMatch(value, compareValue, threshold);
        break;
      case 'between':
        result = Array.isArray(compareValue) && 
                 compareValue.length === 2 &&
                 value >= compareValue[0] && 
                 value <= compareValue[1];
        break;
      case 'exists':
        result = value !== null && value !== undefined;
        break;
      default:
        result = false;
    }

    return not ? !result : result;
  }

  /**
   * 模糊匹配
   */
  private fuzzyMatch(value: any, pattern: string, threshold?: number): boolean {
    if (typeof value !== 'string') return false;
    
    const actualThreshold = threshold ?? this.config.defaultFuzzyThreshold;
    const similarity = this.calculateSimilarity(value.toLowerCase(), pattern.toLowerCase());
    
    return similarity >= actualThreshold;
  }

  /**
   * 计算相似度 (Levenshtein 距离)
   */
  private calculateSimilarity(s1: string, s2: string): number {
    if (s1 === s2) return 1;
    if (s1.length === 0 || s2.length === 0) return 0;

    const matrix: number[][] = [];

    for (let i = 0; i <= s2.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= s1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= s2.length; i++) {
      for (let j = 1; j <= s1.length; j++) {
        if (s2.charAt(i - 1) === s1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    const maxLen = Math.max(s1.length, s2.length);
    return 1 - matrix[s2.length][s1.length] / maxLen;
  }

  /**
   * 获取嵌套值 (支持 a.b.c 路径)
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {
      return current?.[key];
    }, obj);
  }

  /**
   * 推断类型
   */
  private inferType(values: any[]): string {
    if (values.length === 0) return 'unknown';
    
    const sample = values[0];
    if (typeof sample === 'number') return 'number';
    if (typeof sample === 'boolean') return 'boolean';
    if (sample instanceof Date) return 'date';
    if (Array.isArray(sample)) return 'array';
    if (typeof sample === 'object') return 'object';
    return 'string';
  }

  /**
   * 生成缓存键
   */
  private generateCacheKey(
    data: any[],
    conditions: any[],
    options?: FilterOptions
  ): string {
    const hash = (str: string) => {
      let h = 0;
      for (let i = 0; i < str.length; i++) {
        h = ((h << 5) - h) + str.charCodeAt(i);
        h |= 0;
      }
      return Math.abs(h).toString(36);
    };

    const dataKey = `${data.length}-${hash(JSON.stringify(conditions))}`;
    const optionsKey = options ? hash(JSON.stringify(options)) : 'none';
    
    return `filter:${dataKey}:${optionsKey}`;
  }
}

// ============== 便捷工厂函数 ==============

/**
 * 创建过滤技能实例
 */
export function createFilter(config?: Partial<FilterConfig>): FilterSkill {
  return new FilterSkill(config);
}

/**
 * 快速过滤 (单条件)
 */
export function quickFilter<T extends Record<string, any>>(
  data: T[],
  field: string,
  operator: ComparisonOperator,
  value: any
): T[] {
  const filter = createFilter();
  const result = filter.filter(data, [
    { field, operator, value }
  ]);
  return result.data;
}

// ============== 导出 ==============

export default FilterSkill;
