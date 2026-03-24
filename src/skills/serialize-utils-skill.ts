/**
 * 序列化工具技能 - ACE
 * 
 * 功能:
 * 1. JSON 序列化/反序列化
 * 2. 循环引用处理
 * 3. 自定义类型序列化
 * 
 * @module SerializeUtils
 */

// ==================== 类型定义 ====================

/**
 * 自定义类型处理器接口
 */
interface CustomTypeHandler {
  typeName: string;
  serialize: (value: any) => any;
  deserialize: (data: any) => any;
  test: (value: any) => boolean;
}

/**
 * 序列化选项
 */
interface SerializeOptions {
  /** 是否处理循环引用 */
  handleCircular?: boolean;
  /** 自定义类型处理器列表 */
  customHandlers?: CustomTypeHandler[];
  /** 缩进空格数 */
  space?: number;
  /** 最大深度 */
  maxDepth?: number;
}

/**
 * 反序列化选项
 */
interface DeserializeOptions {
  /** 自定义类型处理器列表 */
  customHandlers?: CustomTypeHandler[];
}

// ==================== 循环引用处理 ====================

/**
 * 检测对象中是否存在循环引用
 */
function hasCircularReference(obj: any): boolean {
  const seen = new WeakSet();
  
  function detect(value: any): boolean {
    if (value === null || typeof value !== 'object') {
      return false;
    }
    
    if (seen.has(value)) {
      return true;
    }
    
    seen.add(value);
    
    if (Array.isArray(value)) {
      return value.some(item => detect(item));
    }
    
    return Object.values(value).some(val => detect(val));
  }
  
  return detect(obj);
}

/**
 * 移除循环引用，返回安全对象
 */
function removeCircularReferences(obj: any): any {
  const seen = new WeakSet();
  
  function clean(value: any): any {
    if (value === null || typeof value !== 'object') {
      return value;
    }
    
    if (seen.has(value)) {
      return '[Circular Reference]';
    }
    
    seen.add(value);
    
    if (Array.isArray(value)) {
      return value.map(item => clean(item));
    }
    
    const cleaned: any = {};
    for (const key in value) {
      if (Object.prototype.hasOwnProperty.call(value, key)) {
        cleaned[key] = clean(value[key]);
      }
    }
    return cleaned;
  }
  
  return clean(obj);
}

// ==================== 内置自定义类型处理器 ====================

/**
 * Date 类型处理器
 */
const dateHandler: CustomTypeHandler = {
  typeName: 'Date',
  test: (value) => value instanceof Date,
  serialize: (value) => value.toISOString(),
  deserialize: (data) => new Date(data),
};

/**
 * RegExp 类型处理器
 */
const regExpHandler: CustomTypeHandler = {
  typeName: 'RegExp',
  test: (value) => value instanceof RegExp,
  serialize: (value) => ({
    pattern: value.source,
    flags: value.flags,
  }),
  deserialize: (data) => new RegExp(data.pattern, data.flags),
};

/**
 * Map 类型处理器
 */
const mapHandler: CustomTypeHandler = {
  typeName: 'Map',
  test: (value) => value instanceof Map,
  serialize: (value) => Array.from(value.entries()),
  deserialize: (data) => new Map(data),
};

/**
 * Set 类型处理器
 */
const setHandler: CustomTypeHandler = {
  typeName: 'Set',
  test: (value) => value instanceof Set,
  serialize: (value) => Array.from(value),
  deserialize: (data) => new Set(data),
};

/**
 * Error 类型处理器
 */
const errorHandler: CustomTypeHandler = {
  typeName: 'Error',
  test: (value) => value instanceof Error,
  serialize: (value) => ({
    message: value.message,
    name: value.name,
    stack: value.stack,
  }),
  deserialize: (data) => {
    const error = new Error(data.message);
    error.name = data.name;
    error.stack = data.stack;
    return error;
  },
};

/**
 * 内置处理器列表
 */
const builtInHandlers: CustomTypeHandler[] = [
  dateHandler,
  regExpHandler,
  mapHandler,
  setHandler,
  errorHandler,
];

// ==================== 核心序列化函数 ====================

/**
 * 安全的 JSON 序列化
 * 
 * @param data - 要序列化的数据
 * @param options - 序列化选项
 * @returns 序列化后的 JSON 字符串
 */
export function serialize(data: any, options: SerializeOptions = {}): string {
  const {
    handleCircular = true,
    customHandlers = [],
    space = 2,
    maxDepth = 10,
  } = options;
  
  const allHandlers = [...builtInHandlers, ...customHandlers];
  const seen = new WeakMap();
  
  function customStringify(value: any, depth: number = 0): any {
    // 深度检查
    if (depth > maxDepth) {
      return '[Max Depth Exceeded]';
    }
    
    // null 和基本类型
    if (value === null || typeof value !== 'object') {
      return value;
    }
    
    // 循环引用检测
    if (handleCircular) {
      if (seen.has(value)) {
        return { __circular_ref__: seen.get(value) };
      }
      const refId = `ref_${Object.keys(seen).length}`;
      seen.set(value, refId);
    }
    
    // 自定义类型处理
    for (const handler of allHandlers) {
      if (handler.test(value)) {
        return {
          __type__: handler.typeName,
          __data__: handler.serialize(value),
        };
      }
    }
    
    // 数组处理
    if (Array.isArray(value)) {
      return value.map((item, index) => customStringify(item, depth + 1));
    }
    
    // 对象处理
    const result: any = {};
    for (const key in value) {
      if (Object.prototype.hasOwnProperty.call(value, key)) {
        result[key] = customStringify(value[key], depth + 1);
      }
    }
    return result;
  }
  
  const processed = customStringify(data);
  return JSON.stringify(processed, null, space);
}

/**
 * 安全的 JSON 反序列化
 * 
 * @param jsonString - JSON 字符串
 * @param options - 反序列化选项
 * @returns 反序列化后的对象
 */
export function deserialize(jsonString: string, options: DeserializeOptions = {}): any {
  const { customHandlers = [] } = options;
  const allHandlers = [...builtInHandlers, ...customHandlers];
  const refs = new Map<string, any>();
  
  function customParse(value: any): any {
    if (value === null || typeof value !== 'object') {
      return value;
    }
    
    // 处理类型标记
    if (value.__type__ && value.__data__ !== undefined) {
      for (const handler of allHandlers) {
        if (handler.typeName === value.__type__) {
          return handler.deserialize(value.__data__);
        }
      }
      // 未知类型，返回原始数据
      return value.__data__;
    }
    
    // 处理循环引用标记
    if (value.__circular_ref__) {
      return refs.get(value.__circular_ref__);
    }
    
    // 数组处理
    if (Array.isArray(value)) {
      return value.map(item => customParse(item));
    }
    
    // 对象处理
    const result: any = {};
    for (const key in value) {
      if (Object.prototype.hasOwnProperty.call(value, key)) {
        result[key] = customParse(value[key]);
      }
    }
    return result;
  }
  
  const parsed = JSON.parse(jsonString);
  return customParse(parsed);
}

// ==================== 工具函数 ====================

/**
 * 深拷贝对象 (通过序列化/反序列化实现)
 */
export function deepClone<T>(obj: T): T {
  const serialized = serialize(obj, { handleCircular: false });
  return deserialize(serialized);
}

/**
 * 比较两个对象是否相等
 */
export function deepEqual(a: any, b: any): boolean {
  try {
    const serializedA = serialize(a, { handleCircular: false, space: 0 });
    const serializedB = serialize(b, { handleCircular: false, space: 0 });
    return serializedA === serializedB;
  } catch {
    return false;
  }
}

/**
 * 获取对象的深度
 */
export function getDepth(obj: any): number {
  function calculateDepth(value: any, currentDepth: number): number {
    if (value === null || typeof value !== 'object') {
      return currentDepth;
    }
    
    if (Array.isArray(value)) {
      if (value.length === 0) return currentDepth + 1;
      return Math.max(...value.map(item => calculateDepth(item, currentDepth + 1)));
    }
    
    const values = Object.values(value);
    if (values.length === 0) return currentDepth + 1;
    return Math.max(...values.map(val => calculateDepth(val, currentDepth + 1)));
  }
  
  return calculateDepth(obj, 0);
}

// ==================== 使用示例 ====================

/**
 * 使用示例代码
 * 
 * @example
 * ```typescript
 * import { serialize, deserialize, deepClone, deepEqual } from './serialize-utils-skill';
 * 
 * // 1. 基础序列化
 * const obj = { name: 'Axon', value: 42 };
 * const json = serialize(obj);
 * console.log(json);
 * 
 * // 2. 处理循环引用
 * const circular: any = { name: 'root' };
 * circular.self = circular;
 * const safeJson = serialize(circular); // 不会抛出错误
 * console.log(safeJson);
 * 
 * // 3. 自定义类型序列化
 * const complex = {
 *   date: new Date(),
 *   regex: /test/gi,
 *   map: new Map([['key', 'value']]),
 *   set: new Set([1, 2, 3]),
 *   error: new Error('Something went wrong'),
 * };
 * const complexJson = serialize(complex);
 * const restored = deserialize(complexJson);
 * console.log(restored.date instanceof Date); // true
 * console.log(restored.regex instanceof RegExp); // true
 * 
 * // 4. 深拷贝
 * const original = { nested: { value: 1 } };
 * const cloned = deepClone(original);
 * cloned.nested.value = 2;
 * console.log(original.nested.value); // 1 (未被修改)
 * 
 * // 5. 深度比较
 * const obj1 = { a: 1, b: { c: 2 } };
 * const obj2 = { a: 1, b: { c: 2 } };
 * console.log(deepEqual(obj1, obj2)); // true
 * 
 * // 6. 自定义类型处理器
 * class CustomClass {
 *   constructor(public value: string) {}
 * }
 * 
 * const customHandler = {
 *   typeName: 'CustomClass',
 *   test: (v: any) => v instanceof CustomClass,
 *   serialize: (v: CustomClass) => v.value,
 *   deserialize: (data: string) => new CustomClass(data),
 * };
 * 
 * const customObj = { instance: new CustomClass('test') };
 * const customJson = serialize(customObj, { customHandlers: [customHandler] });
 * const restoredCustom = deserialize(customJson, { customHandlers: [customHandler] });
 * console.log(restoredCustom.instance instanceof CustomClass); // true
 * ```
 */

// ==================== 导出 ====================

export type {
  CustomTypeHandler,
  SerializeOptions,
  DeserializeOptions,
};

export {
  hasCircularReference,
  removeCircularReferences,
  builtInHandlers,
  dateHandler,
  regExpHandler,
  mapHandler,
  setHandler,
  errorHandler,
};

// 默认导出
export default {
  serialize,
  deserialize,
  deepClone,
  deepEqual,
  getDepth,
  hasCircularReference,
  removeCircularReferences,
};
