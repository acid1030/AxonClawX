/**
 * 数据比较工具技能
 * 
 * 功能:
 * 1. 深度相等比较 (deepEqual)
 * 2. 对象差异比较 (objectDiff)
 * 3. 数组差异比较 (arrayDiff)
 * 
 * @module skills/compare-utils
 */

// ==================== 类型定义 ====================

/**
 * 差异类型
 */
export type DiffType = 'added' | 'removed' | 'modified' | 'unchanged';

/**
 * 单个值的差异
 */
export interface ValueDiff<T> {
  type: DiffType;
  path: string;
  oldValue?: T;
  newValue?: T;
}

/**
 * 对象差异结果
 */
export interface ObjectDiffResult {
  /** 是否有差异 */
  hasChanges: boolean;
  /** 差异详情 */
  diffs: ValueDiff<any>[];
  /** 添加的字段 */
  added: Record<string, any>;
  /** 移除的字段 */
  removed: Record<string, any>;
  /** 修改的字段 */
  modified: Record<string, { old: any; new: any }>;
}

/**
 * 数组差异结果
 */
export interface ArrayDiffResult<T> {
  /** 是否有差异 */
  hasChanges: boolean;
  /** 添加的元素 */
  added: T[];
  /** 移除的元素 */
  removed: T[];
  /** 修改的元素 (索引 -> 差异) */
  modified: Record<number, { old: T; new: T }>;
  /** 未变化的元素 */
  unchanged: T[];
  /** 差异详情 */
  diffs: ValueDiff<T>[];
}

/**
 * 深度比较选项
 */
export interface DeepEqualOptions {
  /** 是否严格比较 (区分类型)，默认 true */
  strict?: boolean;
  /** 是否比较循环引用，默认 false */
  compareCycles?: boolean;
  /** 自定义比较函数 */
  customComparator?: (a: any, b: any) => boolean | null;
}

// ==================== 深度相等比较 ====================

/**
 * 判断值是否为对象 (排除 null 和数组)
 */
function isObject(value: any): value is object {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * 判断值是否为 Date
 */
function isDate(value: any): value is Date {
  return value instanceof Date;
}

/**
 * 判断值是否为 RegExp
 */
function isRegExp(value: any): value is RegExp {
  return value instanceof RegExp;
}

/**
 * 判断值是否为 Map
 */
function isMap(value: any): value is Map<any, any> {
  return value instanceof Map;
}

/**
 * 判断值是否为 Set
 */
function isSet(value: any): value is Set<any> {
  return value instanceof Set;
}

/**
 * 深度相等比较
 * 
 * @param a - 第一个值
 * @param b - 第二个值
 * @param options - 比较选项
 * @returns 是否相等
 * 
 * @example
 * deepEqual({ a: 1, b: { c: 2 } }, { a: 1, b: { c: 2 } }) // true
 * deepEqual([1, 2, 3], [1, 2, 3]) // true
 * deepEqual(new Date('2024-01-01'), new Date('2024-01-01')) // true
 */
export function deepEqual(a: any, b: any, options: DeepEqualOptions = {}): boolean {
  const { strict = true, compareCycles = false, customComparator } = options;
  
  // 自定义比较器优先
  if (customComparator) {
    const result = customComparator(a, b);
    if (result !== null) {
      return result;
    }
  }
  
  // 严格相等或同一引用
  if (a === b) {
    return true;
  }
  
  // 类型不同则不相等
  if (strict && typeof a !== typeof b) {
    return false;
  }
  
  // null/undefined 检查
  if (a == null || b == null) {
    return a === b;
  }
  
  // 原始类型比较
  if (typeof a !== 'object') {
    return strict ? a === b : a == b;
  }
  
  // Date 比较
  if (isDate(a) && isDate(b)) {
    return a.getTime() === b.getTime();
  }
  
  // RegExp 比较
  if (isRegExp(a) && isRegExp(b)) {
    return a.source === b.source && a.flags === b.flags;
  }
  
  // Map 比较
  if (isMap(a) && isMap(b)) {
    if (a.size !== b.size) return false;
    const entriesA = Array.from(a.entries());
    for (const [key, value] of entriesA) {
      if (!b.has(key)) return false;
      if (!deepEqual(value, b.get(key), options)) return false;
    }
    return true;
  }
  
  // Set 比较
  if (isSet(a) && isSet(b)) {
    if (a.size !== b.size) return false;
    const valuesA = Array.from(a);
    for (const value of valuesA) {
      if (!b.has(value)) return false;
    }
    return true;
  }
  
  // 数组比较
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i], options)) return false;
    }
    return true;
  }
  
  // 对象比较
  if (isObject(a) && isObject(b)) {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    
    if (keysA.length !== keysB.length) return false;
    
    for (const key of keysA) {
      if (!Object.prototype.hasOwnProperty.call(b, key)) return false;
      if (!deepEqual(a[key], b[key], options)) return false;
    }
    
    return true;
  }
  
  // 其他情况
  return false;
}

// ==================== 对象差异比较 ====================

/**
 * 比较两个对象的差异
 * 
 * @param oldObj - 旧对象
 * @param newObj - 新对象
 * @param basePath - 基础路径 (用于嵌套对象)
 * @returns 差异结果
 * 
 * @example
 * objectDiff({ a: 1, b: 2 }, { a: 1, b: 3, c: 4 })
 * // {
 * //   hasChanges: true,
 * //   diffs: [
 * //     { type: 'modified', path: 'b', oldValue: 2, newValue: 3 },
 * //     { type: 'added', path: 'c', newValue: 4 }
 * //   ],
 * //   added: { c: 4 },
 * //   removed: {},
 * //   modified: { b: { old: 2, new: 3 } }
 * // }
 */
export function objectDiff(
  oldObj: Record<string, any>,
  newObj: Record<string, any>,
  basePath: string = ''
): ObjectDiffResult {
  const diffs: ValueDiff<any>[] = [];
  const added: Record<string, any> = {};
  const removed: Record<string, any> = {};
  const modified: Record<string, { old: any; new: any }> = {};
  
  const allKeys = Array.from(new Set([...Object.keys(oldObj), ...Object.keys(newObj)]));
  
  for (const key of allKeys) {
    const path = basePath ? `${basePath}.${key}` : key;
    const hasOld = Object.prototype.hasOwnProperty.call(oldObj, key);
    const hasNew = Object.prototype.hasOwnProperty.call(newObj, key);
    
    if (!hasOld && hasNew) {
      // 添加的字段
      diffs.push({ type: 'added', path, newValue: newObj[key] });
      added[key] = newObj[key];
    } else if (hasOld && !hasNew) {
      // 移除的字段
      diffs.push({ type: 'removed', path, oldValue: oldObj[key] });
      removed[key] = oldObj[key];
    } else if (hasOld && hasNew) {
      const oldValue = oldObj[key];
      const newValue = newObj[key];
      
      if (!deepEqual(oldValue, newValue)) {
        // 修改的字段 (如果是对象，递归比较)
        if (isObject(oldValue) && isObject(newValue)) {
          const nestedDiff = objectDiff(oldValue, newValue, path);
          diffs.push(...nestedDiff.diffs);
          
          if (nestedDiff.hasChanges) {
            modified[key] = { old: oldValue, new: newValue };
          }
        } else if (Array.isArray(oldValue) && Array.isArray(newValue)) {
          const arrayDiffResult = arrayDiff(oldValue, newValue, path);
          diffs.push(...arrayDiffResult.diffs);
          
          if (arrayDiffResult.hasChanges) {
            modified[key] = { old: oldValue, new: newValue };
          }
        } else {
          diffs.push({ type: 'modified', path, oldValue, newValue });
          modified[key] = { old: oldValue, new: newValue };
        }
      }
    }
  }
  
  return {
    hasChanges: diffs.length > 0,
    diffs,
    added,
    removed,
    modified,
  };
}

/**
 * 获取对象的扁平化路径值
 */
function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => {
    return current?.[key];
  }, obj);
}

// ==================== 数组差异比较 ====================

/**
 * 比较两个数组的差异
 * 
 * @param oldArr - 旧数组
 * @param newArr - 新数组
 * @param basePath - 基础路径 (用于嵌套数组)
 * @param compareFn - 自定义比较函数 (可选)
 * @returns 差异结果
 * 
 * @example
 * arrayDiff([1, 2, 3], [1, 3, 4])
 * // {
 * //   hasChanges: true,
 * //   added: [4],
 * //   removed: [2],
 * //   modified: {},
 * //   unchanged: [1, 3],
 * //   diffs: [
 * //     { type: 'removed', path: '[1]', oldValue: 2 },
 * //     { type: 'added', path: '[2]', newValue: 4 }
 * //   ]
 * // }
 */
export function arrayDiff<T>(
  oldArr: T[],
  newArr: T[],
  basePath: string = '',
  compareFn?: (a: T, b: T) => boolean
): ArrayDiffResult<T> {
  const diffs: ValueDiff<T>[] = [];
  const added: T[] = [];
  const removed: T[] = [];
  const modified: Record<number, { old: T; new: T }> = {};
  const unchanged: T[] = [];
  
  const comparator = compareFn || ((a, b) => deepEqual(a, b));
  
  // 使用 Map 来追踪匹配情况
  const oldIndices = new Map<number, boolean>();
  const newIndices = new Map<number, boolean>();
  
  // 查找匹配的元素
  for (let i = 0; i < oldArr.length; i++) {
    for (let j = 0; j < newArr.length; j++) {
      if (!oldIndices.get(i) && !newIndices.get(j) && comparator(oldArr[i], newArr[j])) {
        oldIndices.set(i, true);
        newIndices.set(j, true);
        unchanged.push(newArr[j]);
        break;
      }
    }
  }
  
  // 查找移除的元素
  for (let i = 0; i < oldArr.length; i++) {
    if (!oldIndices.get(i)) {
      removed.push(oldArr[i]);
      diffs.push({
        type: 'removed',
        path: basePath ? `${basePath}[${i}]` : `[${i}]`,
        oldValue: oldArr[i],
      });
    }
  }
  
  // 查找添加的元素
  for (let j = 0; j < newArr.length; j++) {
    if (!newIndices.get(j)) {
      added.push(newArr[j]);
      diffs.push({
        type: 'added',
        path: basePath ? `${basePath}[${j}]` : `[${j}]`,
        newValue: newArr[j],
      });
    }
  }
  
  // 检查相同位置的修改
  const minLength = Math.min(oldArr.length, newArr.length);
  for (let i = 0; i < minLength; i++) {
    if (oldIndices.get(i) && newIndices.get(i) && !comparator(oldArr[i], newArr[i])) {
      modified[i] = { old: oldArr[i], new: newArr[i] };
      diffs.push({
        type: 'modified',
        path: basePath ? `${basePath}[${i}]` : `[${i}]`,
        oldValue: oldArr[i],
        newValue: newArr[i],
      });
    }
  }
  
  return {
    hasChanges: added.length > 0 || removed.length > 0 || Object.keys(modified).length > 0,
    added,
    removed,
    modified,
    unchanged,
    diffs,
  };
}

/**
 * 数组差异比较 (基于键值)
 * 
 * 适用于对象数组，通过指定的键来匹配元素
 * 
 * @param oldArr - 旧数组
 * @param newArr - 新数组
 * @param keyFn - 键值函数
 * @returns 差异结果
 * 
 * @example
 * arrayDiffByKey(
 *   [{ id: 1, name: 'A' }, { id: 2, name: 'B' }],
 *   [{ id: 1, name: 'A' }, { id: 3, name: 'C' }],
 *   item => item.id
 * )
 */
export function arrayDiffByKey<T>(
  oldArr: T[],
  newArr: T[],
  keyFn: (item: T) => any
): ArrayDiffResult<T> {
  const keyComparator = (a: T, b: T) => keyFn(a) === keyFn(b);
  return arrayDiff(oldArr, newArr, '', keyComparator);
}

// ==================== 高级比较工具 ====================

/**
 * 深度克隆
 */
function deepClone<T>(value: T): T {
  if (value === null || typeof value !== 'object') {
    return value;
  }
  
  if (Array.isArray(value)) {
    return value.map(item => deepClone(item)) as any;
  }
  
  if (isDate(value)) {
    return new Date(value.getTime()) as any;
  }
  
  if (isRegExp(value)) {
    return new RegExp(value.source, value.flags) as any;
  }
  
  if (isMap(value)) {
    const cloned = new Map();
    const entries = Array.from(value.entries());
    for (const [key, val] of entries) {
      cloned.set(key, deepClone(val));
    }
    return cloned as any;
  }
  
  if (isSet(value)) {
    const cloned = new Set();
    const values = Array.from(value);
    for (const val of values) {
      cloned.add(deepClone(val));
    }
    return cloned as any;
  }
  
  const cloned: any = {};
  for (const key of Object.keys(value)) {
    cloned[key] = deepClone((value as any)[key]);
  }
  return cloned;
}

/**
 * 生成差异报告 (人类可读格式)
 * 
 * @param diffResult - 差异结果
 * @returns 格式化的报告字符串
 */
export function formatDiffReport(diffResult: ObjectDiffResult | ArrayDiffResult<any>): string {
  if (!diffResult.hasChanges) {
    return '✓ 没有差异';
  }
  
  const lines: string[] = [];
  const diffs = 'diffs' in diffResult ? diffResult.diffs : [];
  lines.push(`✗ 发现 ${diffs.length} 处差异:\n`);
  
  for (const diff of diffs) {
    switch (diff.type) {
      case 'added':
        lines.push(`  + ${diff.path}: ${JSON.stringify(diff.newValue)}`);
        break;
      case 'removed':
        lines.push(`  - ${diff.path}: ${JSON.stringify(diff.oldValue)}`);
        break;
      case 'modified':
        lines.push(`  ~ ${diff.path}:`);
        lines.push(`      旧：${JSON.stringify(diff.oldValue)}`);
        lines.push(`      新：${JSON.stringify(diff.newValue)}`);
        break;
    }
  }
  
  return lines.join('\n');
}

/**
 * 比较多个对象
 * 
 * @param objects - 要比较的对象数组
 * @returns 所有对象之间的差异
 */
export function compareMultiple<T extends Record<string, any>>(
  objects: T[]
): { base: T; diffs: ObjectDiffResult[] } {
  if (objects.length < 2) {
    throw new Error('至少需要两个对象进行比较');
  }
  
  const base = objects[0];
  const diffs = objects.slice(1).map(obj => objectDiff(base, obj));
  
  return { base, diffs };
}

/**
 * 查找数组中的重复元素
 * 
 * @param arr - 数组
 * @param keyFn - 键值函数 (可选)
 * @returns 重复的元素
 */
export function findDuplicates<T>(arr: T[], keyFn?: (item: T) => any): T[] {
  const seen = new Map<any, number>();
  const duplicates: T[] = [];
  const addedToResult = new Set<any>();
  
  for (const item of arr) {
    const key = keyFn ? keyFn(item) : item;
    const count = seen.get(key) || 0;
    
    if (count > 0 && !addedToResult.has(key)) {
      duplicates.push(item);
      addedToResult.add(key);
    }
    
    seen.set(key, count + 1);
  }
  
  return duplicates;
}

// ==================== 导出 ====================

export const CompareUtils = {
  // 深度比较
  deepEqual,
  
  // 对象差异
  objectDiff,
  
  // 数组差异
  arrayDiff,
  arrayDiffByKey,
  
  // 高级工具
  formatDiffReport,
  compareMultiple,
  findDuplicates,
  
  // 类型
  DiffType: undefined as unknown as DiffType,
  ValueDiff: undefined as unknown as ValueDiff<any>,
  ObjectDiffResult: undefined as unknown as ObjectDiffResult,
  ArrayDiffResult: undefined as unknown as ArrayDiffResult<any>,
};

export default CompareUtils;
