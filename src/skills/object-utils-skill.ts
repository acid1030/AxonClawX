/**
 * 对象工具技能 - KAEL
 * 
 * 提供常用对象操作功能：
 * 1. 对象克隆 (深克隆/浅克隆)
 * 2. 对象合并 (浅合并/深合并)
 * 3. 对象转换 (键名转换/值转换/过滤)
 */

/**
 * 深克隆选项
 */
export interface CloneOptions {
  /** 是否深克隆，默认为 true */
  deep?: boolean;
  /** 循环引用处理，默认为 'throw' */
  circular?: 'throw' | 'ignore' | 'clone';
}

/**
 * 合并选项
 */
export interface MergeOptions {
  /** 是否深合并，默认为 true */
  deep?: boolean;
  /** 数组处理策略，默认为 'replace' */
  arrayStrategy?: 'replace' | 'merge' | 'concat';
  /** 是否覆盖 undefined 值，默认为 false */
  overwriteUndefined?: boolean;
}

/**
 * 转换选项
 */
export interface TransformOptions {
  /** 键名转换函数 */
  keyTransform?: (key: string) => string;
  /** 值转换函数 */
  valueTransform?: (value: any, key: string) => any;
  /** 过滤函数，返回 false 则排除该属性 */
  filter?: (value: any, key: string) => boolean;
}

/**
 * 对象深克隆
 * 支持循环引用检测、Date、RegExp、Map、Set 等特殊类型
 * 
 * @param obj - 需要克隆的对象
 * @param options - 克隆选项
 * @returns 克隆后的新对象
 * 
 * @example
 * const original = { a: 1, b: { c: 2 } };
 * const cloned = deepClone(original);
 * cloned.b.c = 3;
 * console.log(original.b.c); // 2 (原对象未受影响)
 * 
 * @example
 * // 处理循环引用
 * const circular: any = { a: 1 };
 * circular.self = circular;
 * const cloned = deepClone(circular, { circular: 'ignore' });
 */
export function deepClone<T extends object>(
  obj: T,
  options: CloneOptions = {}
): T {
  const { deep = true, circular = 'throw' } = options;
  const visited = new WeakMap<object, any>();

  function clone(value: any, path: string = ''): any {
    // 处理 null 和 undefined
    if (value === null || value === undefined) {
      return value;
    }

    // 处理基本类型
    if (typeof value !== 'object') {
      return value;
    }

    // 处理 Date
    if (value instanceof Date) {
      return new Date(value.getTime());
    }

    // 处理 RegExp
    if (value instanceof RegExp) {
      return new RegExp(value.source, value.flags);
    }

    // 处理 Map
    if (value instanceof Map) {
      const clonedMap = new Map();
      for (const [k, v] of value.entries()) {
        clonedMap.set(k, deep ? clone(v, `${path}.map[${k}]`) : v);
      }
      return clonedMap;
    }

    // 处理 Set
    if (value instanceof Set) {
      const clonedSet = new Set();
      for (const item of value) {
        clonedSet.add(deep ? clone(item, `${path}.set[]`) : item);
      }
      return clonedSet;
    }

    // 处理数组
    if (Array.isArray(value)) {
      if (visited.has(value)) {
        if (circular === 'throw') {
          throw new Error(`Circular reference detected at path: ${path}`);
        }
        if (circular === 'ignore') {
          return [];
        }
        return visited.get(value);
      }

      const clonedArr: any[] = [];
      visited.set(value, clonedArr);

      for (let i = 0; i < value.length; i++) {
        clonedArr[i] = deep ? clone(value[i], `${path}[${i}]`) : value[i];
      }
      return clonedArr;
    }

    // 处理普通对象
    if (value.constructor === Object) {
      if (visited.has(value)) {
        if (circular === 'throw') {
          throw new Error(`Circular reference detected at path: ${path}`);
        }
        if (circular === 'ignore') {
          return {};
        }
        return visited.get(value);
      }

      const clonedObj: any = {};
      visited.set(value, clonedObj);

      for (const key in value) {
        if (Object.prototype.hasOwnProperty.call(value, key)) {
          clonedObj[key] = deep ? clone(value[key], `${path}.${key}`) : value[key];
        }
      }
      return clonedObj;
    }

    // 其他对象类型返回原引用
    return value;
  }

  return clone(obj) as T;
}

/**
 * 对象浅克隆
 * 只克隆第一层属性，嵌套对象保持引用
 * 
 * @param obj - 需要克隆的对象
 * @returns 克隆后的新对象
 * 
 * @example
 * const original = { a: 1, b: { c: 2 } };
 * const shallow = shallowClone(original);
 * shallow.a = 10;
 * shallow.b.c = 20;
 * console.log(original.a); // 1 (原对象未受影响)
 * console.log(original.b.c); // 20 (嵌套对象受影响)
 */
export function shallowClone<T extends object>(obj: T): T {
  if (Array.isArray(obj)) {
    return [...obj] as T;
  }
  return { ...obj };
}

/**
 * 对象浅合并
 * 将多个对象合并到目标对象，后者覆盖前者
 * 
 * @param target - 目标对象
 * @param sources - 源对象数组
 * @returns 合并后的新对象
 * 
 * @example
 * const base: any = { a: 1, b: 2 };
 * const extra = { b: 3, c: 4 };
 * const merged = shallowMerge(base, extra);
 * // { a: 1, b: 3, c: 4 }
 */
export function shallowMerge<T extends object>(
  target: T,
  ...sources: Partial<T>[]
): T {
  return Object.assign({}, target, ...sources);
}

/**
 * 对象深合并
 * 递归合并嵌套对象，支持数组策略配置
 * 
 * @param target - 目标对象
 * @param sources - 源对象数组
 * @param options - 合并选项
 * @returns 合并后的新对象
 * 
 * @example
 * const base: any = { a: 1, b: { c: 2, d: 3 } };
 * const extra: any = { b: { c: 4, e: 5 }, f: 6 };
 * const merged = deepMerge(base, extra);
 * // { a: 1, b: { c: 4, d: 3, e: 5 }, f: 6 }
 * 
 * @example
 * // 数组合并策略
 * const base = { tags: ['a', 'b'] };
 * const extra = { tags: ['c', 'd'] };
 * deepMerge(base, extra, { arrayStrategy: 'concat' });
 * // { tags: ['a', 'b', 'c', 'd'] }
 */
export function deepMerge<T extends object>(
  target: T,
  ...sources: Partial<T>[]
): T;
export function deepMerge<T extends object>(
  target: T,
  sources: Partial<T>[],
  options?: MergeOptions
): T;
export function deepMerge<T extends object>(
  target: T,
  sources: Partial<T> | Partial<T>[],
  options: MergeOptions = {}
): T {
  const sourceArray = Array.isArray(sources) ? sources : [sources];
  const { deep = true, arrayStrategy = 'replace', overwriteUndefined = false } = options;

  function mergeValues(targetVal: any, sourceVal: any): any {
    // 处理 undefined
    if (sourceVal === undefined && !overwriteUndefined) {
      return targetVal;
    }

    // 如果源值为 null 或非对象，直接返回源值
    if (sourceVal === null || typeof sourceVal !== 'object') {
      return sourceVal;
    }

    // 如果目标值不是对象，返回源值的克隆
    if (targetVal === null || typeof targetVal !== 'object') {
      return deepClone(sourceVal);
    }

    // 数组处理
    if (Array.isArray(sourceVal)) {
      if (Array.isArray(targetVal)) {
        switch (arrayStrategy) {
          case 'merge':
            // 按索引合并
            const maxLength = Math.max(targetVal.length, sourceVal.length);
            const mergedArr: any[] = [];
            for (let i = 0; i < maxLength; i++) {
              if (i < sourceVal.length) {
                mergedArr[i] = i < targetVal.length 
                  ? mergeValues(targetVal[i], sourceVal[i])
                  : sourceVal[i];
              } else {
                mergedArr[i] = targetVal[i];
              }
            }
            return mergedArr;
          case 'concat':
            return [...targetVal, ...sourceVal];
          case 'replace':
          default:
            return deepClone(sourceVal);
        }
      }
      return deepClone(sourceVal);
    }

    // 对象递归合并
    const result: any = deepClone(targetVal);
    for (const key in sourceVal) {
      if (Object.prototype.hasOwnProperty.call(sourceVal, key)) {
        result[key] = mergeValues(result[key], sourceVal[key]);
      }
    }
    return result;
  }

  let result = deepClone(target);
  for (const source of sourceArray) {
    if (source && typeof source === 'object') {
      for (const key in source) {
        if (Object.prototype.hasOwnProperty.call(source, key)) {
          result[key] = mergeValues(result[key], source[key]);
        }
      }
    }
  }

  return result as T;
}

/**
 * 对象转换
 * 支持键名转换、值转换和属性过滤
 * 
 * @param obj - 需要转换的对象
 * @param options - 转换选项
 * @returns 转换后的新对象
 * 
 * @example
 * // 键名转换 (camelCase → snake_case)
 * const obj = { firstName: 'John', lastName: 'Doe' };
 * transform(obj, {
 *   keyTransform: key => key.replace(/[A-Z]/g, m => '_' + m.toLowerCase())
 * });
 * // { first_name: 'John', last_name: 'Doe' }
 * 
 * @example
 * // 值转换 (数字转字符串)
 * const obj = { age: 25, score: 95 };
 * transform(obj, {
 *   valueTransform: (val) => typeof val === 'number' ? String(val) : val
 * });
 * // { age: '25', score: '95' }
 * 
 * @example
 * // 过滤属性 (排除 undefined)
 * const obj = { a: 1, b: undefined, c: 3 };
 * transform(obj, {
 *   filter: (val) => val !== undefined
 * });
 * // { a: 1, c: 3 }
 */
export function transform<T extends object, R extends object = T>(
  obj: T,
  options: TransformOptions = {}
): R {
  const { keyTransform, valueTransform, filter } = options;
  const result: any = {};

  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const value = obj[key];

      // 应用过滤器
      if (filter && !filter(value, key)) {
        continue;
      }

      // 转换键名
      const newKey = keyTransform ? keyTransform(key) : key;

      // 转换值
      const newValue = valueTransform ? valueTransform(value, key) : value;

      result[newKey] = newValue;
    }
  }

  return result as R;
}

/**
 * 对象键名转换为 snake_case
 * 
 * @param obj - 需要转换的对象
 * @returns 转换后的新对象
 * 
 * @example
 * toSnakeCase({ firstName: 'John', lastName: 'Doe' });
 * // { first_name: 'John', last_name: 'Doe' }
 */
export function toSnakeCase<T extends object>(obj: T): any {
  return transform(obj, {
    keyTransform: key => key.replace(/[A-Z]/g, m => '_' + m.toLowerCase())
  });
}

/**
 * 对象键名转换为 camelCase
 * 
 * @param obj - 需要转换的对象
 * @returns 转换后的新对象
 * 
 * @example
 * toCamelCase({ first_name: 'John', last_name: 'Doe' });
 * // { firstName: 'John', lastName: 'Doe' }
 */
export function toCamelCase<T extends object>(obj: T): any {
  return transform(obj, {
    keyTransform: key => key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
  });
}

/**
 * 对象键名转换为 kebab-case
 * 
 * @param obj - 需要转换的对象
 * @returns 转换后的新对象
 * 
 * @example
 * toKebabCase({ firstName: 'John', lastName: 'Doe' });
 * // { 'first-name': 'John', 'last-name': 'Doe' }
 */
export function toKebabCase<T extends object>(obj: T): any {
  return transform(obj, {
    keyTransform: key => key.replace(/[A-Z]/g, m => '-' + m.toLowerCase())
  });
}

/**
 * 对象键名转换为 PascalCase
 * 
 * @param obj - 需要转换的对象
 * @returns 转换后的新对象
 * 
 * @example
 * toPascalCase({ firstName: 'John', lastName: 'Doe' });
 * // { FirstName: 'John', LastName: 'Doe' }
 */
export function toPascalCase<T extends object>(obj: T): any {
  return transform(obj, {
    keyTransform: key => key.charAt(0).toUpperCase() + key.slice(1)
  });
}

/**
 * 对象扁平化
 * 将嵌套对象展平为单层对象，使用点号分隔键名
 * 
 * @param obj - 需要扁平化的对象
 * @param separator - 键名分隔符，默认为 '.'
 * @returns 扁平化后的对象
 * 
 * @example
 * flattenObject({ a: 1, b: { c: 2, d: { e: 3 } } });
 * // { a: 1, 'b.c': 2, 'b.d.e': 3 }
 */
export function flattenObject<T extends object>(obj: T, separator: string = '.'): any {
  const result: any = {};

  function flatten(current: any, prefix: string = '') {
    for (const key in current) {
      if (Object.prototype.hasOwnProperty.call(current, key)) {
        const value = current[key];
        const newKey = prefix ? `${prefix}${separator}${key}` : key;

        if (value && typeof value === 'object' && !Array.isArray(value)) {
          flatten(value, newKey);
        } else {
          result[newKey] = value;
        }
      }
    }
  }

  flatten(obj);
  return result;
}

/**
 * 对象解扁平化
 * 将扁平化的对象恢复为嵌套结构
 * 
 * @param obj - 扁平化的对象
 * @param separator - 键名分隔符，默认为 '.'
 * @returns 解扁平化后的嵌套对象
 * 
 * @example
 * unflattenObject({ a: 1, 'b.c': 2, 'b.d.e': 3 });
 * // { a: 1, b: { c: 2, d: { e: 3 } } }
 */
export function unflattenObject<T extends object>(obj: T, separator: string = '.'): any {
  const result: Record<string, any> = {};

  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const value = obj[key as keyof T];
      const keys = key.split(separator);
      
      let current: any = result;
      for (let i = 0; i < keys.length - 1; i++) {
        const k = keys[i];
        if (!(k in current) || typeof current[k] !== 'object') {
          current[k] = {};
        }
        current = current[k];
      }
      
      current[keys[keys.length - 1]] = value;
    }
  }

  return result;
}

/**
 * 对象差值计算
 * 计算两个对象之间的差异
 * 
 * @param obj1 - 第一个对象
 * @param obj2 - 第二个对象
 * @returns 差异对象 (包含 added, removed, changed)
 * 
 * @example
 * diff({ a: 1, b: 2 }, { b: 3, c: 4 });
 * // { added: { c: 4 }, removed: { a: 1 }, changed: { b: { from: 2, to: 3 } } }
 */
export function diff<T extends object>(obj1: T, obj2: T): {
  added: Partial<T>;
  removed: Partial<T>;
  changed: Partial<Record<keyof T, { from: any; to: any }>>;
} {
  const added: Record<string, any> = {};
  const removed: Record<string, any> = {};
  const changed: Record<string, { from: any; to: any }> = {};

  const keys1 = new Set(Object.keys(obj1));
  const keys2 = new Set(Object.keys(obj2));

  // 查找被移除的键
  for (const key of keys1) {
    if (!keys2.has(key)) {
      removed[key] = obj1[key as keyof T];
    }
  }

  // 查找新增的键
  for (const key of keys2) {
    if (!keys1.has(key)) {
      added[key] = obj2[key as keyof T];
    }
  }

  // 查找变化的键
  for (const key of keys1) {
    if (keys2.has(key)) {
      const val1 = obj1[key as keyof T];
      const val2 = obj2[key as keyof T];
      if (val1 !== val2) {
        changed[key] = { from: val1, to: val2 };
      }
    }
  }

  return { added, removed, changed } as any;
}

/**
 * 对象拾取
 * 从对象中选取指定键
 * 
 * @param obj - 源对象
 * @param keys - 要选取的键数组
 * @returns 包含指定键的新对象
 * 
 * @example
 * pick({ a: 1, b: 2, c: 3 }, ['a', 'c']);
 * // { a: 1, c: 3 }
 */
export function pick<T extends object, K extends keyof T>(
  obj: T,
  keys: K[]
): Pick<T, K> {
  const result: Record<string, any> = {};
  for (const key of keys) {
    if (key in obj) {
      result[key as string] = obj[key];
    }
  }
  return result as Pick<T, K>;
}

/**
 * 对象省略
 * 从对象中排除指定键
 * 
 * @param obj - 源对象
 * @param keys - 要排除的键数组
 * @returns 排除指定键后的新对象
 * 
 * @example
 * omit({ a: 1, b: 2, c: 3 }, ['b']);
 * // { a: 1, c: 3 }
 */
export function omit<T extends object, K extends keyof T>(
  obj: T,
  keys: K[]
): Omit<T, K> {
  const result: Record<string, any> = {};
  const excludeKeys = new Set(keys as string[]);
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key) && !excludeKeys.has(key)) {
      result[key] = obj[key as keyof T];
    }
  }
  return result as Omit<T, K>;
}

// ============================================
// 使用示例
// ============================================

if (require.main === module) {
  console.log('=== 对象工具技能 - 使用示例 ===\n');

  // 1. 对象克隆示例
  console.log('1️⃣ 对象克隆:');
  const original = {
    a: 1,
    b: { c: 2, d: [3, 4] },
    e: new Date('2024-01-01'),
    f: /test/gi
  };
  
  const shallow = shallowClone(original);
  shallow.b.c = 999;
  console.log(`   浅克隆后修改嵌套值:`);
  console.log(`   原对象 b.c: ${original.b.c} (受影响)`);
  console.log(`   克隆对象 b.c: ${shallow.b.c}`);
  
  const deep = deepClone(original);
  deep.b.c = 888;
  console.log(`\n   深克隆后修改嵌套值:`);
  console.log(`   原对象 b.c: ${original.b.c} (未受影响)`);
  console.log(`   克隆对象 b.c: ${deep.b.c}\n`);

  // 2. 对象合并示例
  console.log('2️⃣ 对象合并:');
  const base: any = { a: 1, b: { c: 2, d: 3 }, tags: ['x', 'y'] };
  const extra: any = { b: { c: 4, e: 5 }, f: 6, tags: ['z'] };
  
  const shallowMerged = shallowMerge(base, extra);
  console.log(`   浅合并: ${JSON.stringify(shallowMerged)}`);
  
  const deepMerged = deepMerge(base, extra);
  console.log(`   深合并: ${JSON.stringify(deepMerged)}`);
  
  const concatMerged = deepMerge(base, extra, { arrayStrategy: 'concat' });
  console.log(`   深合并 (数组 concat): ${JSON.stringify(concatMerged)}\n`);

  // 3. 对象转换示例
  console.log('3️⃣ 对象转换:');
  const camelObj = { firstName: 'John', lastName: 'Doe', age: 25 };
  console.log(`   原始对象 (camelCase): ${JSON.stringify(camelObj)}`);
  console.log(`   → snake_case: ${JSON.stringify(toSnakeCase(camelObj))}`);
  console.log(`   → kebab-case: ${JSON.stringify(toKebabCase(camelObj))}`);
  console.log(`   → PascalCase: ${JSON.stringify(toPascalCase(camelObj))}\n`);

  // 4. 对象扁平化示例
  console.log('4️⃣ 对象扁平化:');
  const nested = { a: 1, b: { c: 2, d: { e: 3, f: 4 } }, g: 5 };
  console.log(`   原始对象: ${JSON.stringify(nested)}`);
  const flattened = flattenObject(nested);
  console.log(`   扁平化: ${JSON.stringify(flattened)}`);
  const unflattened = unflattenObject(flattened);
  console.log(`   解扁平化: ${JSON.stringify(unflattened)}\n`);

  // 5. 对象差值示例
  console.log('5️⃣ 对象差值:');
  const obj1: any = { a: 1, b: 2, c: 3 };
  const obj2: any = { b: 20, c: 3, d: 4 };
  const difference = diff(obj1, obj2);
  console.log(`   对象 1: ${JSON.stringify(obj1)}`);
  console.log(`   对象 2: ${JSON.stringify(obj2)}`);
  console.log(`   差异:`);
  console.log(`     新增: ${JSON.stringify(difference.added)}`);
  console.log(`     移除: ${JSON.stringify(difference.removed)}`);
  console.log(`     变更: ${JSON.stringify(difference.changed)}\n`);

  // 6. pick/omit 示例
  console.log('6️⃣ Pick & Omit:');
  const data = { id: 1, name: 'Test', email: 'test@example.com', password: 'secret' };
  console.log(`   原始对象: ${JSON.stringify(data)}`);
  console.log(`   Pick(['id', 'name']): ${JSON.stringify(pick(data, ['id', 'name']))}`);
  console.log(`   Omit(['password', 'email']): ${JSON.stringify(omit(data, ['password', 'email']))}\n`);

  console.log('✅ 所有示例执行完成!');
}
