/**
 * 原型模式技能 - KAEL 工程总管
 * 
 * 功能:
 * 1. 深拷贝克隆 (Deep Clone)
 * 2. 浅拷贝克隆 (Shallow Clone)
 * 3. 原型注册 (Prototype Registry)
 * 
 * @module PrototypePatternSkill
 * @author KAEL Engineering
 */

// ============== 类型定义 ==============

/** 原型接口 */
export interface IPrototype<T = any> {
  clone(): T;
  cloneDeep(): T;
}

/** 原型注册表 */
export interface PrototypeRegistry {
  register<T extends IPrototype>(key: string, prototype: T): void;
  get<T extends IPrototype>(key: string): T | null;
  unregister(key: string): boolean;
  has(key: string): boolean;
  keys(): string[];
  clear(): void;
}

/** 克隆选项 */
export interface CloneOptions {
  /** 克隆类型: 'shallow' | 'deep' */
  type: 'shallow' | 'deep';
  /** 排除的键 */
  exclude?: string[];
  /** 自定义转换函数 */
  transform?: (key: string, value: any) => any;
}

// ============== 深拷贝实现 ==============

/**
 * 深拷贝克隆
 * 
 * 处理:
 * - 基本类型 (string, number, boolean, null, undefined)
 * - 对象和数组
 * - Date, RegExp, Map, Set
 * - 循环引用
 * 
 * @param obj 要克隆的对象
 * @param visited 已访问对象映射 (内部使用)
 * @returns 深拷贝后的对象
 */
export function cloneDeep<T>(obj: T, visited = new WeakMap()): T {
  // 基本类型直接返回
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  // 处理循环引用
  if (visited.has(obj)) {
    return visited.get(obj);
  }

  // 处理 Date
  if (obj instanceof Date) {
    return new Date(obj.getTime()) as any;
  }

  // 处理 RegExp
  if (obj instanceof RegExp) {
    return new RegExp(obj.source, obj.flags) as any;
  }

  // 处理 Map
  if (obj instanceof Map) {
    const result = new Map();
    visited.set(obj, result);
    obj.forEach((value, key) => {
      result.set(cloneDeep(key, visited), cloneDeep(value, visited));
    });
    return result as any;
  }

  // 处理 Set
  if (obj instanceof Set) {
    const result = new Set();
    visited.set(obj, result);
    obj.forEach((value) => {
      result.add(cloneDeep(value, visited));
    });
    return result as any;
  }

  // 处理 Array
  if (Array.isArray(obj)) {
    const result: any[] = [];
    visited.set(obj, result);
    obj.forEach((item, index) => {
      result[index] = cloneDeep(item, visited);
    });
    return result as any;
  }

  // 处理普通对象
  const result = Object.create(Object.getPrototypeOf(obj));
  visited.set(obj, result);

  for (const key of Object.keys(obj)) {
    result[key] = cloneDeep(obj[key], visited);
  }

  // 复制 Symbol 键
  for (const key of Object.getOwnPropertySymbols(obj)) {
    if (Object.propertyIsEnumerable.call(obj, key)) {
      result[key] = cloneDeep(obj[key], visited);
    }
  }

  return result;
}

// ============== 浅拷贝实现 ==============

/**
 * 浅拷贝克隆
 * 
 * 处理:
 * - 展开运算符复制第一层
 * - 嵌套对象保持引用
 * 
 * @param obj 要克隆的对象
 * @param options 克隆选项
 * @returns 浅拷贝后的对象
 */
export function cloneShallow<T extends object>(
  obj: T,
  options?: CloneOptions
): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  const { exclude = [], transform } = options || {};

  const result = Array.isArray(obj) ? [...obj] : { ...obj };

  // 排除指定的键
  for (const key of exclude) {
    if (key in result) {
      delete result[key];
    }
  }

  // 应用自定义转换
  if (transform) {
    for (const key of Object.keys(result)) {
      result[key] = transform(key, result[key]);
    }
  }

  return result as T;
}

// ============== 通用克隆函数 ==============

/**
 * 通用克隆函数
 * 
 * @param obj 要克隆的对象
 * @param options 克隆选项
 * @returns 克隆后的对象
 */
export function clone<T extends object>(
  obj: T,
  options: CloneOptions = { type: 'shallow' }
): T {
  if (options.type === 'deep') {
    return cloneDeep(obj);
  }
  return cloneShallow(obj, options);
}

// ============== 原型注册表实现 ==============

/**
 * 原型注册表类
 * 
 * 功能:
 * - 注册原型对象
 * - 通过键获取原型
 * - 克隆已注册的原型
 * - 管理原型生命周期
 */
export class PrototypeRegistryImpl implements PrototypeRegistry {
  private registry: Map<string, IPrototype> = new Map();

  /**
   * 注册原型
   * 
   * @param key 原型键
   * @param prototype 原型对象
   */
  register<T extends IPrototype>(key: string, prototype: T): void {
    if (!key || typeof key !== 'string') {
      throw new Error(`Invalid prototype key: ${key}`);
    }
    if (!prototype || typeof prototype.clone !== 'function') {
      throw new Error(`Invalid prototype: must implement clone() method`);
    }
    this.registry.set(key, prototype);
  }

  /**
   * 获取原型
   * 
   * @param key 原型键
   * @returns 原型对象或 null
   */
  get<T extends IPrototype>(key: string): T | null {
    return (this.registry.get(key) as T) || null;
  }

  /**
   * 注销原型
   * 
   * @param key 原型键
   * @returns 是否成功注销
   */
  unregister(key: string): boolean {
    return this.registry.delete(key);
  }

  /**
   * 检查原型是否存在
   * 
   * @param key 原型键
   * @returns 是否存在
   */
  has(key: string): boolean {
    return this.registry.has(key);
  }

  /**
   * 获取所有原型键
   * 
   * @returns 键数组
   */
  keys(): string[] {
    return Array.from(this.registry.keys());
  }

  /**
   * 清空注册表
   */
  clear(): void {
    this.registry.clear();
  }

  /**
   * 克隆已注册的原型
   * 
   * @param key 原型键
   * @param deep 是否深拷贝
   * @returns 克隆后的对象或 null
   */
  clonePrototype<T>(key: string, deep = false): T | null {
    const prototype = this.get(key);
    if (!prototype) {
      return null;
    }
    return (deep ? prototype.cloneDeep() : prototype.clone()) as T;
  }
}

// ============== 原型基类 ==============

/**
 * 原型基类
 * 
 * 提供默认的 clone 和 cloneDeep 实现
 */
export abstract class PrototypeBase<T> implements IPrototype<T> {
  /**
   * 浅拷贝克隆
   */
  abstract clone(): T;

  /**
   * 深拷贝克隆
   */
  cloneDeep(): T {
    return cloneDeep(this as any);
  }
}

// ============== 使用示例 ==============

/**
 * 示例: 用户对象原型
 */
export class UserPrototype extends PrototypeBase<UserPrototype> {
  constructor(
    public id: string,
    public name: string,
    public email: string,
    public metadata: Record<string, any> = {}
  ) {
    super();
  }

  clone(): UserPrototype {
    return cloneShallow(this);
  }

  override cloneDeep(): UserPrototype {
    return cloneDeep(this);
  }

  withName(name: string): UserPrototype {
    const cloned = this.clone();
    cloned.name = name;
    return cloned;
  }

  withEmail(email: string): UserPrototype {
    const cloned = this.clone();
    cloned.email = email;
    return cloned;
  }
}

/**
 * 示例: 配置对象原型
 */
export class ConfigPrototype extends PrototypeBase<ConfigPrototype> {
  constructor(
    public appName: string,
    public version: string,
    public settings: Map<string, any> = new Map()
  ) {
    super();
  }

  clone(): ConfigPrototype {
    return cloneShallow(this);
  }

  override cloneDeep(): ConfigPrototype {
    return cloneDeep(this);
  }

  withVersion(version: string): ConfigPrototype {
    const cloned = this.cloneDeep();
    cloned.version = version;
    return cloned;
  }

  withSetting(key: string, value: any): ConfigPrototype {
    const cloned = this.cloneDeep();
    cloned.settings.set(key, value);
    return cloned;
  }
}

// ============== 导出 ==============

export default {
  clone,
  cloneDeep,
  cloneShallow,
  PrototypeRegistryImpl,
  PrototypeBase,
  UserPrototype,
  ConfigPrototype,
};
