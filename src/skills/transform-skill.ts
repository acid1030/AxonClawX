/**
 * 数据转换技能 - Transform Skill
 * 
 * 功能:
 * 1. 对象映射 - 字段重命名、嵌套提取、值转换
 * 2. 数组转换 - 过滤、映射、分组、排序
 * 3. 数据格式化 - 日期、数字、字符串格式化
 * 
 * @author Axon
 * @version 1.0.0
 */

// ============== 类型定义 ==============

/**
 * 字段映射配置
 */
export interface FieldMapping {
  /** 源字段名 */
  from: string;
  /** 目标字段名 */
  to: string;
  /** 值转换函数 (可选) */
  transform?: (value: any, item: any) => any;
}

/**
 * 对象映射配置
 */
export interface ObjectMapConfig {
  /** 字段映射列表 */
  fields: FieldMapping[];
  /** 是否保留未映射的字段 */
  keepUnmapped?: boolean;
  /** 默认值 (当源字段不存在时) */
  defaults?: Record<string, any>;
}

/**
 * 数组过滤配置
 */
export interface ArrayFilterConfig {
  /** 过滤函数 */
  predicate: (item: any, index: number, array: any[]) => boolean;
}

/**
 * 数组分组配置
 */
export interface ArrayGroupConfig {
  /** 分组键 (字段名或函数) */
  key: string | ((item: any) => any);
  /** 是否保持原始顺序 */
  preserveOrder?: boolean;
}

/**
 * 数组排序配置
 */
export interface ArraySortConfig {
  /** 排序字段 */
  field: string;
  /** 排序方向 */
  order: 'asc' | 'desc';
  /** 自定义比较函数 (可选) */
  compare?: (a: any, b: any) => number;
}

/**
 * 日期格式化选项
 */
export interface DateFormatOptions {
  /** 格式模板 */
  format?: 'YYYY-MM-DD' | 'YYYY/MM/DD' | 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD HH:mm:ss' | 'ISO' | 'timestamp';
  /** 时区 */
  timezone?: string;
  /** 语言环境 */
  locale?: string;
}

/**
 * 数字格式化选项
 */
export interface NumberFormatOptions {
  /** 小数位数 */
  decimals?: number;
  /** 千位分隔符 */
  thousandsSeparator?: string;
  /** 小数点符号 */
  decimalSeparator?: string;
  /** 前缀 (如货币符号) */
  prefix?: string;
  /** 后缀 */
  suffix?: string;
}

/**
 * 字符串格式化选项
 */
export interface StringFormatOptions {
  /** 转换为大写 */
  uppercase?: boolean;
  /** 转换为小写 */
  lowercase?: boolean;
  /** 首字母大写 */
  capitalize?: boolean;
  /** 修剪空白 */
  trim?: boolean;
  /** 最大长度 */
  maxLength?: number;
  /** 省略号文本 */
  ellipsis?: string;
}

// ============== 对象映射 ==============

/**
 * 对象字段映射
 * 
 * @param source - 源对象
 * @param config - 映射配置
 * @returns 映射后的对象
 * 
 * @example
 * ```typescript
 * const user = { id: 1, user_name: 'axon', created_at: '2024-01-01' };
 * const mapped = transformObject(user, {
 *   fields: [
 *     { from: 'id', to: 'userId' },
 *     { from: 'user_name', to: 'username' },
 *     { from: 'created_at', to: 'createdAt', transform: (v) => new Date(v) }
 *   ]
 * });
 * // { userId: 1, username: 'axon', createdAt: Date }
 * ```
 */
export function transformObject<T = any, R = any>(
  source: T,
  config: ObjectMapConfig
): R {
  const result: any = {};

  // 处理字段映射
  for (const mapping of config.fields) {
    const value = getNestedValue(source as any, mapping.from);
    
    if (value === undefined) {
      // 使用默认值或跳过
      if (config.defaults && mapping.to in config.defaults) {
        result[mapping.to] = config.defaults[mapping.to];
      }
      continue;
    }

    // 应用转换函数
    result[mapping.to] = mapping.transform 
      ? mapping.transform(value, source) 
      : value;
  }

  // 保留未映射的字段
  if (config.keepUnmapped) {
    const mappedKeys = new Set(config.fields.map(f => f.from));
    for (const [key, value] of Object.entries(source as any)) {
      if (!mappedKeys.has(key)) {
        result[key] = value;
      }
    }
  }

  return result as R;
}

/**
 * 批量对象映射
 * 
 * @param sources - 源对象数组
 * @param config - 映射配置
 * @returns 映射后的对象数组
 */
export function transformObjects<T = any, R = any>(
  sources: T[],
  config: ObjectMapConfig
): R[] {
  return sources.map(source => transformObject<T, R>(source, config));
}

/**
 * 提取嵌套值 (支持点号路径)
 */
function getNestedValue(obj: any, path: string): any {
  const keys = path.split('.');
  let value = obj;
  
  for (const key of keys) {
    if (value === null || value === undefined) {
      return undefined;
    }
    value = value[key];
  }
  
  return value;
}

// ============== 数组转换 ==============

/**
 * 数组过滤
 * 
 * @param array - 源数组
 * @param config - 过滤配置
 * @returns 过滤后的数组
 * 
 * @example
 * ```typescript
 * const users = [{ age: 18 }, { age: 25 }, { age: 30 }];
 * const adults = filterArray(users, {
 *   predicate: (u) => u.age >= 18
 * });
 * ```
 */
export function filterArray<T>(
  array: T[],
  config: ArrayFilterConfig
): T[] {
  return array.filter(config.predicate);
}

/**
 * 数组映射
 * 
 * @param array - 源数组
 * @param transform - 转换函数
 * @returns 映射后的数组
 * 
 * @example
 * ```typescript
 * const users = [{ id: 1, name: 'axon' }];
 * const ids = mapArray(users, (u) => u.id);
 * // [1]
 * ```
 */
export function mapArray<T, R>(
  array: T[],
  transform: (item: T, index: number, array: T[]) => R
): R[] {
  return array.map(transform);
}

/**
 * 数组分组
 * 
 * @param array - 源数组
 * @param config - 分组配置
 * @returns 分组后的对象 (键 -> 数组)
 * 
 * @example
 * ```typescript
 * const users = [
 *   { role: 'admin', name: 'axon' },
 *   { role: 'user', name: 'bob' },
 *   { role: 'admin', name: 'eve' }
 * ];
 * const grouped = groupArray(users, { key: 'role' });
 * // { admin: [{...}, {...}], user: [{...}] }
 * ```
 */
export function groupArray<T>(
  array: T[],
  config: ArrayGroupConfig
): Record<string, T[]> {
  const result: Record<string, T[]> = {};
  
  for (const item of array) {
    const key = typeof config.key === 'function'
      ? String(config.key(item))
      : String(getNestedValue(item, config.key as string));
    
    if (!result[key]) {
      result[key] = [];
    }
    result[key].push(item);
  }
  
  return result;
}

/**
 * 数组排序
 * 
 * @param array - 源数组
 * @param config - 排序配置
 * @returns 排序后的数组 (不修改原数组)
 * 
 * @example
 * ```typescript
 * const users = [{ age: 30 }, { age: 18 }, { age: 25 }];
 * const sorted = sortArray(users, { field: 'age', order: 'asc' });
 * // [{ age: 18 }, { age: 25 }, { age: 30 }]
 * ```
 */
export function sortArray<T>(
  array: T[],
  config: ArraySortConfig
): T[] {
  const sorted = [...array];
  
  if (config.compare) {
    return sorted.sort(config.compare);
  }
  
  return sorted.sort((a, b) => {
    const aVal = getNestedValue(a, config.field);
    const bVal = getNestedValue(b, config.field);
    
    if (aVal === bVal) return 0;
    if (aVal === null || aVal === undefined) return 1;
    if (bVal === null || bVal === undefined) return -1;
    
    const comparison = aVal < bVal ? -1 : 1;
    return config.order === 'desc' ? -comparison : comparison;
  });
}

/**
 * 数组去重
 * 
 * @param array - 源数组
 * @param key - 去重键 (字段名或函数)
 * @returns 去重后的数组
 * 
 * @example
 * ```typescript
 * const users = [{ id: 1 }, { id: 1 }, { id: 2 }];
 * const unique = uniqueArray(users, 'id');
 * // [{ id: 1 }, { id: 2 }]
 * ```
 */
export function uniqueArray<T>(
  array: T[],
  key: string | ((item: T) => any)
): T[] {
  const seen = new Set<any>();
  
  return array.filter(item => {
    const keyValue = typeof key === 'function'
      ? key(item)
      : getNestedValue(item, key);
    
    if (seen.has(keyValue)) {
      return false;
    }
    seen.add(keyValue);
    return true;
  });
}

/**
 * 数组扁平化
 * 
 * @param array - 嵌套数组
 * @param depth - 扁平化深度
 * @returns 扁平化后的数组
 */
export function flattenArray<T>(
  array: any[],
  depth: number = 1
): T[] {
  return array.flat(depth);
}

/**
 * 数组分块
 * 
 * @param array - 源数组
 * @param size - 每块大小
 * @returns 分块后的二维数组
 * 
 * @example
 * ```typescript
 * const nums = [1, 2, 3, 4, 5];
 * const chunks = chunkArray(nums, 2);
 * // [[1, 2], [3, 4], [5]]
 * ```
 */
export function chunkArray<T>(
  array: T[],
  size: number
): T[][] {
  const result: T[][] = [];
  
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  
  return result;
}

// ============== 数据格式化 ==============

/**
 * 日期格式化
 * 
 * @param date - 日期 (Date 对象、时间戳或日期字符串)
 * @param options - 格式化选项
 * @returns 格式化后的字符串
 * 
 * @example
 * ```typescript
 * formatDate(new Date('2024-01-15'), { format: 'YYYY-MM-DD' });
 * // '2024-01-15'
 * 
 * formatDate(new Date(), { format: 'YYYY-MM-DD HH:mm:ss' });
 * // '2024-01-15 14:30:00'
 * ```
 */
export function formatDate(
  date: Date | number | string,
  options: DateFormatOptions = {}
): string {
  const d = new Date(date);
  
  if (isNaN(d.getTime())) {
    return 'Invalid Date';
  }
  
  // 处理时区
  if (options.timezone) {
    const tzOffset = d.toLocaleString('en-US', { timeZone: options.timezone });
    d.setTime(new Date(tzOffset).getTime());
  }
  
  // 格式映射
  if (options.format === 'ISO') {
    return d.toISOString();
  }
  
  if (options.format === 'timestamp') {
    return String(d.getTime());
  }
  
  const format = options.format || 'YYYY-MM-DD';
  
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  
  return format
    .replace('YYYY', String(year))
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hours)
    .replace('mm', minutes)
    .replace('ss', seconds);
}

/**
 * 数字格式化
 * 
 * @param num - 数字
 * @param options - 格式化选项
 * @returns 格式化后的字符串
 * 
 * @example
 * ```typescript
 * formatNumber(1234567.89, { decimals: 2, thousandsSeparator: ',' });
 * // '1,234,567.89'
 * 
 * formatNumber(100, { prefix: '$', decimals: 2 });
 * // '$100.00'
 * ```
 */
export function formatNumber(
  num: number,
  options: NumberFormatOptions = {}
): string {
  if (isNaN(num)) {
    return 'NaN';
  }
  
  const {
    decimals = 0,
    thousandsSeparator = '',
    decimalSeparator = '.',
    prefix = '',
    suffix = ''
  } = options;
  
  // 四舍五入
  const fixed = num.toFixed(decimals);
  const [intPart, decPart] = fixed.split('.');
  
  // 添加千位分隔符
  const formattedInt = thousandsSeparator
    ? intPart.replace(/\B(?=(\d{3})+(?!\d))/g, thousandsSeparator)
    : intPart;
  
  // 组合结果
  let result = formattedInt;
  if (decimals > 0 && decPart) {
    result += decimalSeparator + decPart;
  }
  
  return prefix + result + suffix;
}

/**
 * 字符串格式化
 * 
 * @param str - 源字符串
 * @param options - 格式化选项
 * @returns 格式化后的字符串
 * 
 * @example
 * ```typescript
 * formatString('  hello world  ', { trim: true, uppercase: true });
 * // 'HELLO WORLD'
 * 
 * formatString('hello world', { capitalize: true });
 * // 'Hello world'
 * 
 * formatString('very long text', { maxLength: 10, ellipsis: '...' });
 * // 'very lon...'
 * ```
 */
export function formatString(
  str: string,
  options: StringFormatOptions = {}
): string {
  if (typeof str !== 'string') {
    return String(str);
  }
  
  let result = str;
  
  if (options.trim) {
    result = result.trim();
  }
  
  if (options.uppercase) {
    result = result.toUpperCase();
  } else if (options.lowercase) {
    result = result.toLowerCase();
  } else if (options.capitalize) {
    result = result.charAt(0).toUpperCase() + result.slice(1);
  }
  
  if (options.maxLength && result.length > options.maxLength) {
    result = result.slice(0, options.maxLength) + (options.ellipsis || '');
  }
  
  return result;
}

/**
 * 货币格式化 (便捷函数)
 * 
 * @param amount - 金额
 * @param currency - 货币代码 (USD, EUR, CNY 等)
 * @param locale - 语言环境
 * @returns 格式化后的货币字符串
 * 
 * @example
 * ```typescript
 * formatCurrency(1234.56, 'USD', 'en-US');
 * // '$1,234.56'
 * 
 * formatCurrency(1234.56, 'CNY', 'zh-CN');
 * // '¥1,234.56'
 * ```
 */
export function formatCurrency(
  amount: number,
  currency: string = 'USD',
  locale: string = 'en-US'
): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency
    }).format(amount);
  } catch {
    // Fallback to simple format
    return formatNumber(amount, {
      decimals: 2,
      thousandsSeparator: ',',
      prefix: currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency === 'CNY' ? '¥' : ''
    });
  }
}

/**
 * 百分比格式化
 * 
 * @param value - 值 (0-1 或 0-100)
 * @param decimals - 小数位数
 * @param isDecimal - 是否为小数格式 (0-1)
 * @returns 格式化后的百分比字符串
 * 
 * @example
 * ```typescript
 * formatPercentage(0.856);
 * // '85.6%'
 * 
 * formatPercentage(85.6, 0, false);
 * // '86%'
 * ```
 */
export function formatPercentage(
  value: number,
  decimals: number = 1,
  isDecimal: boolean = true
): string {
  const num = isDecimal ? value * 100 : value;
  return formatNumber(num, { decimals }) + '%';
}

// ============== 复合转换 ==============

/**
 * 管道转换 (组合多个转换)
 * 
 * @param data - 源数据
 * @param transforms - 转换函数数组
 * @returns 转换后的数据
 * 
 * @example
 * ```typescript
 * const result = pipeTransform(
 *   users,
 *   (data) => filterArray(data, { predicate: u => u.active }),
 *   (data) => sortArray(data, { field: 'createdAt', order: 'desc' }),
 *   (data) => mapArray(data, u => ({ id: u.id, name: u.name }))
 * );
 * ```
 */
export function pipeTransform<T>(
  data: T,
  ...transforms: Array<(input: any) => any>
): any {
  return transforms.reduce((acc, transform) => transform(acc), data);
}

/**
 * 条件转换
 * 
 * @param data - 源数据
 * @param condition - 条件函数
 * @param transform - 转换函数 (条件为真时执行)
 * @param alternative - 替代函数 (条件为假时执行，可选)
 * @returns 转换后的数据
 * 
 * @example
 * ```typescript
 * const result = conditionalTransform(
 *   data,
 *   (d) => d.length > 100,
 *   (d) => d.slice(0, 100),
 *   (d) => d  // 保持不变
 * );
 * ```
 */
export function conditionalTransform<T, R = T>(
  data: T,
  condition: (data: T) => boolean,
  transform: (data: T) => R,
  alternative?: (data: T) => R
): R {
  if (condition(data)) {
    return transform(data);
  }
  return alternative ? alternative(data) : (data as unknown as R);
}

// ============== 导出 ==============

export default {
  // 对象映射
  transformObject,
  transformObjects,
  
  // 数组转换
  filterArray,
  mapArray,
  groupArray,
  sortArray,
  uniqueArray,
  flattenArray,
  chunkArray,
  
  // 数据格式化
  formatDate,
  formatNumber,
  formatString,
  formatCurrency,
  formatPercentage,
  
  // 复合转换
  pipeTransform,
  conditionalTransform
};
