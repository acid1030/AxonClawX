/**
 * Transformer Utils Skill - 数据转换工具
 * 
 * 功能:
 * 1. 对象↔数组转换
 * 2. 数据映射
 * 3. 数据聚合
 * 
 * @module skills/transformer-utils
 * @version 1.0.0
 * @author KAEL
 */

// ============================================================================
// 类型定义
// ============================================================================

export type Primitive = string | number | boolean | null | undefined;

export interface KeyValue<T = any> {
  key: string;
  value: T;
}

export interface TransformOptions {
  /** 是否保留原始引用 */
  mutable?: boolean;
  /** 是否递归处理嵌套对象 */
  deep?: boolean;
  /** 自定义转换函数 */
  transformFn?: (value: any, key?: string) => any;
}

export interface MapOptions {
  /** 字段映射表 */
  fields?: Record<string, string>;
  /** 值转换函数 */
  valueTransform?: (value: any, key: string) => any;
  /** 过滤函数 */
  filter?: (value: any, key: string) => boolean;
}

export interface AggregateOptions {
  /** 分组键函数 */
  groupBy?: (item: any) => string | number;
  /** 聚合函数 */
  aggregate?: (items: any[]) => any;
  /** 是否保留原始数据 */
  keepOriginal?: boolean;
}

// ============================================================================
// 1. 对象↔数组转换
// ============================================================================

/**
 * 对象转数组 (键值对形式)
 * @param obj - 要转换的对象
 * @returns 键值对数组
 * 
 * @example
 * ```ts
 * const obj = { a: 1, b: 2, c: 3 };
 * const arr = objectToArray(obj);
 * // [{ key: 'a', value: 1 }, { key: 'b', value: 2 }, { key: 'c', value: 3 }]
 * ```
 */
export function objectToArray<T = any>(obj: Record<string, T>): KeyValue<T>[] {
  return Object.entries(obj).map(([key, value]) => ({ key, value }));
}

/**
 * 对象转数组 (自定义格式)
 * @param obj - 要转换的对象
 * @param formatFn - 格式化函数
 * @returns 格式化后的数组
 * 
 * @example
 * ```ts
 * const obj = { name: 'Alice', age: 30 };
 * const arr = objectToArrayCustom(obj, (key, value) => `${key}: ${value}`);
 * // ['name: Alice', 'age: 30']
 * ```
 */
export function objectToArrayCustom<T, U>(
  obj: Record<string, T>,
  formatFn: (key: string, value: T) => U
): U[] {
  return Object.entries(obj).map(([key, value]) => formatFn(key, value));
}

/**
 * 对象转数组 (仅值)
 * @param obj - 要转换的对象
 * @returns 值数组
 * 
 * @example
 * ```ts
 * const obj = { a: 1, b: 2, c: 3 };
 * const arr = objectToValues(obj);
 * // [1, 2, 3]
 * ```
 */
export function objectToValues<T>(obj: Record<string, T>): T[] {
  return Object.values(obj);
}

/**
 * 对象转数组 (仅键)
 * @param obj - 要转换的对象
 * @returns 键数组
 * 
 * @example
 * ```ts
 * const obj = { a: 1, b: 2, c: 3 };
 * const arr = objectToKeys(obj);
 * // ['a', 'b', 'c']
 * ```
 */
export function objectToKeys<T>(obj: Record<string, T>): string[] {
  return Object.keys(obj);
}

/**
 * 数组转对象 (键值对数组)
 * @param arr - 键值对数组
 * @returns 转换后的对象
 * 
 * @example
 * ```ts
 * const arr = [{ key: 'a', value: 1 }, { key: 'b', value: 2 }];
 * const obj = arrayToObject(arr);
 * // { a: 1, b: 2 }
 * ```
 */
export function arrayToObject<T = any>(arr: KeyValue<T>[]): Record<string, T> {
  return arr.reduce((obj, { key, value }) => {
    obj[key] = value;
    return obj;
  }, {} as Record<string, T>);
}

/**
 * 数组转对象 (自定义键值提取)
 * @param arr - 要转换的数组
 * @param keyFn - 键提取函数
 * @param valueFn - 值提取函数 (可选，默认返回整个元素)
 * @returns 转换后的对象
 * 
 * @example
 * ```ts
 * const arr = [
 *   { id: 'a', data: 1 },
 *   { id: 'b', data: 2 }
 * ];
 * const obj = arrayToObjectCustom(arr, item => item.id, item => item.data);
 * // { a: 1, b: 2 }
 * ```
 */
export function arrayToObjectCustom<T, K extends string | number | symbol, V = T>(
  arr: T[],
  keyFn: (item: T) => K,
  valueFn?: (item: T) => V
): Record<K, V> {
  const getValue = valueFn ?? ((item: T) => item as unknown as V);
  return arr.reduce((obj, item) => {
    const key = keyFn(item);
    obj[key] = getValue(item);
    return obj;
  }, {} as Record<K, V>);
}

/**
 * 数组转对象 (索引为键)
 * @param arr - 要转换的数组
 * @returns 以索引为键的对象
 * 
 * @example
 * ```ts
 * const arr = ['a', 'b', 'c'];
 * const obj = arrayToIndexedObject(arr);
 * // { 0: 'a', 1: 'b', 2: 'c' }
 * ```
 */
export function arrayToIndexedObject<T>(arr: T[]): Record<number, T> {
  return arr.reduce((obj, item, index) => {
    obj[index] = item;
    return obj;
  }, {} as Record<number, T>);
}

/**
 * 嵌套对象转扁平数组
 * @param obj - 嵌套对象
 * @param separator - 键分隔符，默认 '.'
 * @returns 扁平化的键值对数组
 * 
 * @example
 * ```ts
 * const obj = { a: 1, b: { c: 2, d: { e: 3 } } };
 * const arr = flattenObjectToArray(obj);
 * // [{ key: 'a', value: 1 }, { key: 'b.c', value: 2 }, { key: 'b.d.e', value: 3 }]
 * ```
 */
export function flattenObjectToArray<T = any>(
  obj: Record<string, any>,
  separator: string = '.'
): KeyValue<T>[] {
  const result: KeyValue<T>[] = [];
  
  function flatten(current: any, prefix: string = '') {
    if (typeof current !== 'object' || current === null) {
      result.push({ key: prefix, value: current as T });
      return;
    }
    
    Object.entries(current).forEach(([key, value]) => {
      const newKey = prefix ? `${prefix}${separator}${key}` : key;
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        flatten(value, newKey);
      } else {
        result.push({ key: newKey, value: value as T });
      }
    });
  }
  
  flatten(obj);
  return result;
}

/**
 * 扁平数组转嵌套对象
 * @param arr - 扁平化的键值对数组
 * @param separator - 键分隔符，默认 '.'
 * @returns 嵌套对象
 * 
 * @example
 * ```ts
 * const arr = [
 *   { key: 'a', value: 1 },
 *   { key: 'b.c', value: 2 },
 *   { key: 'b.d.e', value: 3 }
 * ];
 * const obj = unflattenArrayToObject(arr);
 * // { a: 1, b: { c: 2, d: { e: 3 } } }
 * ```
 */
export function unflattenArrayToObject<T = any>(
  arr: KeyValue<T>[],
  separator: string = '.'
): Record<string, any> {
  const result: Record<string, any> = {};
  
  arr.forEach(({ key, value }) => {
    const keys = key.split(separator);
    let current: any = result;
    
    keys.forEach((k, index) => {
      if (index === keys.length - 1) {
        current[k] = value;
      } else {
        if (!(k in current)) {
          current[k] = {};
        }
        current = current[k];
      }
    });
  });
  
  return result;
}

// ============================================================================
// 2. 数据映射
// ============================================================================

/**
 * 对象字段映射
 * @param obj - 源对象
 * @param options - 映射选项
 * @returns 映射后的对象
 * 
 * @example
 * ```ts
 * const obj = { firstName: 'John', lastName: 'Doe', age: 30 };
 * const mapped = mapObject(obj, {
 *   fields: { firstName: 'name', lastName: 'surname' }
 * });
 * // { name: 'John', surname: 'Doe', age: 30 }
 * ```
 */
export function mapObject<T extends Record<string, any>>(
  obj: T,
  options: MapOptions = {}
): Record<string, any> {
  const { fields = {}, valueTransform, filter } = options;
  const result: Record<string, any> = {};
  
  Object.entries(obj).forEach(([key, value]) => {
    // 应用过滤
    if (filter && !filter(value, key)) {
      return;
    }
    
    // 字段重命名
    const newKey = fields[key] || key;
    
    // 值转换
    const newValue = valueTransform ? valueTransform(value, key) : value;
    
    result[newKey] = newValue;
  });
  
  return result;
}

/**
 * 数组映射
 * @param arr - 源数组
 * @param options - 映射选项
 * @returns 映射后的数组
 * 
 * @example
 * ```ts
 * const arr = [
 *   { firstName: 'John', age: 30 },
 *   { firstName: 'Jane', age: 25 }
 * ];
 * const mapped = mapArray(arr, {
 *   fields: { firstName: 'name' },
 *   valueTransform: (value, key) => key === 'age' ? value + 1 : value
 * });
 * // [{ name: 'John', age: 31 }, { name: 'Jane', age: 26 }]
 * ```
 */
export function mapArray<T extends Record<string, any>>(
  arr: T[],
  options: MapOptions = {}
): Record<string, any>[] {
  return arr.map(item => mapObject(item, options));
}

/**
 * 选择性拾取字段
 * @param obj - 源对象
 * @param keys - 要拾取的键数组
 * @returns 包含指定键的新对象
 * 
 * @example
 * ```ts
 * const obj = { a: 1, b: 2, c: 3, d: 4 };
 * const picked = pick(obj, ['a', 'c']);
 * // { a: 1, c: 3 }
 * ```
 */
export function pick<T extends Record<string, any>>(
  obj: T,
  keys: (keyof T)[]
): Partial<T> {
  return keys.reduce((result, key) => {
    if (key in obj) {
      result[key] = obj[key];
    }
    return result;
  }, {} as Partial<T>);
}

/**
 * 选择性省略字段
 * @param obj - 源对象
 * @param keys - 要省略的键数组
 * @returns 不包含指定键的新对象
 * 
 * @example
 * ```ts
 * const obj = { a: 1, b: 2, c: 3, d: 4 };
 * const omitted = omit(obj, ['b', 'd']);
 * // { a: 1, c: 3 }
 * ```
 */
export function omit<T extends Record<string, any>>(
  obj: T,
  keys: (keyof T)[]
): Partial<T> {
  const result: Partial<T> = {};
  const keysSet = new Set(keys);
  
  Object.entries(obj).forEach(([key, value]) => {
    if (!keysSet.has(key as keyof T)) {
      result[key as keyof T] = value;
    }
  });
  
  return result;
}

/**
 * 对象键映射
 * @param obj - 源对象
 * @param mapFn - 键映射函数
 * @returns 键映射后的对象
 * 
 * @example
 * ```ts
 * const obj = { a: 1, b: 2, c: 3 };
 * const mapped = mapKeys(obj, key => key.toUpperCase());
 * // { A: 1, B: 2, C: 3 }
 * ```
 */
export function mapKeys<T>(
  obj: Record<string, T>,
  mapFn: (key: string, value: T) => string
): Record<string, T> {
  return Object.entries(obj).reduce((result, [key, value]) => {
    const newKey = mapFn(key, value);
    result[newKey] = value;
    return result;
  }, {} as Record<string, T>);
}

/**
 * 对象值映射
 * @param obj - 源对象
 * @param mapFn - 值映射函数
 * @returns 值映射后的对象
 * 
 * @example
 * ```ts
 * const obj = { a: 1, b: 2, c: 3 };
 * const mapped = mapValues(obj, value => value * 2);
 * // { a: 2, b: 4, c: 6 }
 * ```
 */
export function mapValues<T, U>(
  obj: Record<string, T>,
  mapFn: (value: T, key: string) => U
): Record<string, U> {
  return Object.entries(obj).reduce((result, [key, value]) => {
    result[key] = mapFn(value, key);
    return result;
  }, {} as Record<string, U>);
}

/**
 * 对象条目映射
 * @param obj - 源对象
 * @param mapFn - 条目映射函数
 * @returns 映射后的对象
 * 
 * @example
 * ```ts
 * const obj = { a: 1, b: 2, c: 3 };
 * const mapped = mapEntries(obj, (key, value) => [key.toUpperCase(), value * 2]);
 * // { A: 2, B: 4, C: 6 }
 * ```
 */
export function mapEntries<T, U>(
  obj: Record<string, T>,
  mapFn: (key: string, value: T) => [string, U]
): Record<string, U> {
  return Object.entries(obj).reduce((result, [key, value]) => {
    const [newKey, newValue] = mapFn(key, value);
    result[newKey] = newValue;
    return result;
  }, {} as Record<string, U>);
}

// ============================================================================
// 3. 数据聚合
// ============================================================================

/**
 * 数组分组聚合
 * @param arr - 要分组的数组
 * @param groupByFn - 分组函数
 * @param aggregateFn - 聚合函数 (可选，默认返回分组数组)
 * @returns 分组后的对象
 * 
 * @example
 * ```ts
 * const arr = [
 *   { category: 'A', value: 10 },
 *   { category: 'B', value: 20 },
 *   { category: 'A', value: 30 }
 * ];
 * const grouped = groupAggregate(arr, item => item.category);
 * // { A: [{ category: 'A', value: 10 }, { category: 'A', value: 30 }], B: [...] }
 * 
 * const summed = groupAggregate(arr, item => item.category, items => 
 *   items.reduce((sum, item) => sum + item.value, 0)
 * );
 * // { A: 40, B: 20 }
 * ```
 */
export function groupAggregate<T, K extends string | number | symbol, R = T[]>(
  arr: T[],
  groupByFn: (item: T) => K,
  aggregateFn?: (items: T[]) => R
): Record<K, R> {
  const groups = arr.reduce((acc, item) => {
    const key = groupByFn(item);
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(item);
    return acc;
  }, {} as Record<K, T[]>);
  
  if (!aggregateFn) {
    return groups as Record<K, R>;
  }
  
  return Object.entries(groups).reduce((result, [key, items]) => {
    result[key as K] = aggregateFn(items as T[]);
    return result;
  }, {} as Record<K, R>);
}

/**
 * 数组求和
 * @param arr - 数组
 * @param valueFn - 值提取函数 (可选，默认直接求和)
 * @returns 总和
 * 
 * @example
 * ```ts
 * const arr = [1, 2, 3, 4, 5];
 * const sum = sumArray(arr);
 * // 15
 * 
 * const objects = [{ value: 10 }, { value: 20 }, { value: 30 }];
 * const sum = sumArray(objects, item => item.value);
 * // 60
 * ```
 */
export function sumArray<T>(arr: T[], valueFn?: (item: T) => number): number {
  const getValue = valueFn ?? ((item: T) => item as unknown as number);
  return arr.reduce((sum, item) => sum + getValue(item), 0);
}

/**
 * 数组平均值
 * @param arr - 数组
 * @param valueFn - 值提取函数 (可选)
 * @returns 平均值
 * 
 * @example
 * ```ts
 * const arr = [1, 2, 3, 4, 5];
 * const avg = averageArray(arr);
 * // 3
 * ```
 */
export function averageArray<T>(arr: T[], valueFn?: (item: T) => number): number {
  if (arr.length === 0) return 0;
  return sumArray(arr, valueFn) / arr.length;
}

/**
 * 数组最大值
 * @param arr - 数组
 * @param valueFn - 值提取函数 (可选)
 * @returns 最大值
 * 
 * @example
 * ```ts
 * const arr = [1, 5, 3, 9, 2];
 * const max = maxArray(arr);
 * // 9
 * ```
 */
export function maxArray<T>(arr: T[], valueFn?: (item: T) => number): T | undefined {
  if (arr.length === 0) return undefined;
  
  const getValue = valueFn ?? ((item: T) => item as unknown as number);
  return arr.reduce((max, item) => (getValue(item) > getValue(max) ? item : max));
}

/**
 * 数组最小值
 * @param arr - 数组
 * @param valueFn - 值提取函数 (可选)
 * @returns 最小值
 * 
 * @example
 * ```ts
 * const arr = [1, 5, 3, 9, 2];
 * const min = minArray(arr);
 * // 1
 * ```
 */
export function minArray<T>(arr: T[], valueFn?: (item: T) => number): T | undefined {
  if (arr.length === 0) return undefined;
  
  const getValue = valueFn ?? ((item: T) => item as unknown as number);
  return arr.reduce((min, item) => (getValue(item) < getValue(min) ? item : min));
}

/**
 * 数组计数
 * @param arr - 数组
 * @param predicate - 条件函数 (可选，默认计算所有元素)
 * @returns 计数
 * 
 * @example
 * ```ts
 * const arr = [1, 2, 3, 4, 5];
 * const count = countArray(arr);
 * // 5
 * 
 * const evenCount = countArray(arr, item => item % 2 === 0);
 * // 2
 * ```
 */
export function countArray<T>(arr: T[], predicate?: (item: T) => boolean): number {
  if (!predicate) return arr.length;
  return arr.filter(predicate).length;
}

/**
 * 频率统计
 * @param arr - 数组
 * @param valueFn - 值提取函数 (可选，默认使用元素本身)
 * @returns 频率统计对象
 * 
 * @example
 * ```ts
 * const arr = ['a', 'b', 'a', 'c', 'b', 'a'];
 * const freq = frequencyCount(arr);
 * // { a: 3, b: 2, c: 1 }
 * ```
 */
export function frequencyCount<T, K extends string | number | symbol>(
  arr: T[],
  valueFn?: (item: T) => K
): Record<K, number> {
  const getValue = valueFn ?? ((item: T) => item as unknown as K);
  
  return arr.reduce((acc, item) => {
    const key = getValue(item);
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {} as Record<K, number>);
}

/**
 * 数据透视表
 * @param arr - 数据数组
 * @param options - 透视选项
 * @returns 透视表对象
 * 
 * @example
 * ```ts
 * const data = [
 *   { region: 'North', product: 'A', sales: 100 },
 *   { region: 'North', product: 'B', sales: 150 },
 *   { region: 'South', product: 'A', sales: 200 },
 *   { region: 'South', product: 'B', sales: 250 }
 * ];
 * const pivot = pivotTable(data, {
 *   rows: 'region',
 *   columns: 'product',
 *   values: 'sales',
 *   aggregator: 'sum'
 * });
 * // {
 * //   North: { A: 100, B: 150 },
 * //   South: { A: 200, B: 250 }
 * // }
 * ```
 */
export function pivotTable<T extends Record<string, any>>(
  arr: T[],
  options: {
    rows: keyof T | ((item: T) => string);
    columns: keyof T | ((item: T) => string);
    values: keyof T | ((item: T) => number);
    aggregator?: 'sum' | 'count' | 'avg' | 'min' | 'max';
  }
): Record<string, Record<string, number>> {
  const { rows, columns, values, aggregator = 'sum' } = options;
  
  const getRowKey = typeof rows === 'function' ? rows : (item: T) => String(item[rows]);
  const getColKey = typeof columns === 'function' ? columns : (item: T) => String(item[columns]);
  const getValue = typeof values === 'function' ? values : (item: T) => Number(item[values]);
  
  const result: Record<string, Record<string, number[]>> = {};
  
  arr.forEach(item => {
    const rowKey = getRowKey(item);
    const colKey = getColKey(item);
    const value = getValue(item);
    
    if (!result[rowKey]) {
      result[rowKey] = {};
    }
    if (!result[rowKey][colKey]) {
      result[rowKey][colKey] = [];
    }
    result[rowKey][colKey].push(value);
  });
  
  // 应用聚合函数
  const aggregate = (values: number[]): number => {
    switch (aggregator) {
      case 'sum':
        return values.reduce((a, b) => a + b, 0);
      case 'count':
        return values.length;
      case 'avg':
        return values.reduce((a, b) => a + b, 0) / values.length;
      case 'min':
        return Math.min(...values);
      case 'max':
        return Math.max(...values);
      default:
        return values.reduce((a, b) => a + b, 0);
    }
  };
  
  return Object.entries(result).reduce((acc, [rowKey, cols]) => {
    acc[rowKey] = Object.entries(cols).reduce((colAcc, [colKey, values]) => {
      colAcc[colKey] = aggregate(values);
      return colAcc;
    }, {} as Record<string, number>);
    return acc;
  }, {} as Record<string, Record<string, number>>);
}

/**
 * 累积聚合
 * @param arr - 数组
 * @param accumulatorFn - 累积函数
 * @param initialValue - 初始值
 * @returns 累积结果数组
 * 
 * @example
 * ```ts
 * const arr = [1, 2, 3, 4, 5];
 * const running = scan(arr, (acc, item) => acc + item, 0);
 * // [1, 3, 6, 10, 15]
 * ```
 */
export function scan<T, U>(
  arr: T[],
  accumulatorFn: (acc: U, item: T, index: number) => U,
  initialValue: U
): U[] {
  const result: U[] = [];
  let acc = initialValue;
  
  arr.forEach((item, index) => {
    acc = accumulatorFn(acc, item, index);
    result.push(acc);
  });
  
  return result;
}

// ============================================================================
// 4. 高级转换工具
// ============================================================================

/**
 * 深度转换
 * @param data - 要转换的数据
 * @param transformFn - 转换函数
 * @param options - 转换选项
 * @returns 转换后的数据
 * 
 * @example
 * ```ts
 * const obj = { a: 1, b: { c: 2, d: { e: 3 } } };
 * const transformed = deepTransform(obj, value => value * 2, { deep: true });
 * // { a: 2, b: { c: 4, d: { e: 6 } } }
 * ```
 */
export function deepTransform<T>(
  data: T,
  transformFn: (value: any) => any,
  options: TransformOptions = {}
): T {
  const { deep = true } = options;
  
  if (data === null || typeof data !== 'object') {
    return transformFn(data);
  }
  
  if (Array.isArray(data)) {
    return data.map(item => {
      if (deep && typeof item === 'object' && item !== null) {
        return deepTransform(item, transformFn, options);
      }
      return transformFn(item);
    }) as unknown as T;
  }
  
  const result: any = {};
  Object.entries(data as Record<string, any>).forEach(([key, value]) => {
    if (deep && typeof value === 'object' && value !== null) {
      result[key] = deepTransform(value, transformFn, options);
    } else {
      result[key] = transformFn(value);
    }
  });
  
  return result;
}

/**
 * 条件转换
 * @param data - 要转换的数据
 * @param conditions - 条件转换规则
 * @returns 转换后的数据
 * 
 * @example
 * ```ts
 * const obj = { age: 25, score: 85 };
 * const transformed = conditionalTransform(obj, [
 *   { test: v => v.age < 18, transform: v => ({ ...v, category: 'minor' }) },
 *   { test: v => v.score >= 80, transform: v => ({ ...v, grade: 'A' }) }
 * ]);
 * // { age: 25, score: 85, grade: 'A' }
 * ```
 */
export function conditionalTransform<T>(
  data: T,
  conditions: Array<{
    test: (value: T) => boolean;
    transform: (value: T) => T;
  }>
): T {
  return conditions.reduce((result, { test, transform }) => {
    if (test(result)) {
      return transform(result);
    }
    return result;
  }, data);
}

/**
 * 管道转换
 * @param data - 要转换的数据
 * @param transforms - 转换函数数组
 * @returns 转换后的数据
 * 
 * @example
 * ```ts
 * const arr = [1, 2, 3, 4, 5];
 * const result = pipeTransform(
 *   arr,
 *   data => data.filter(x => x % 2 === 0),
 *   data => data.map(x => x * 2),
 *   data => data.reduce((sum, x) => sum + x, 0)
 * );
 * // 12 (2*2 + 4*2)
 * ```
 */
export function pipeTransform<T>(
  data: T,
  ...transforms: Array<(value: any) => any>
): any {
  return transforms.reduce((result, transform) => transform(result), data);
}

// ============================================================================
// TransformerUtils 工具类
// ============================================================================

export const TransformerUtils = {
  // 对象↔数组转换
  objectToArray,
  objectToArrayCustom,
  objectToValues,
  objectToKeys,
  arrayToObject,
  arrayToObjectCustom,
  arrayToIndexedObject,
  flattenObjectToArray,
  unflattenArrayToObject,
  
  // 数据映射
  mapObject,
  mapArray,
  pick,
  omit,
  mapKeys,
  mapValues,
  mapEntries,
  
  // 数据聚合
  groupAggregate,
  sumArray,
  averageArray,
  maxArray,
  minArray,
  countArray,
  frequencyCount,
  pivotTable,
  scan,
  
  // 高级转换
  deepTransform,
  conditionalTransform,
  pipeTransform,
};

export default TransformerUtils;
