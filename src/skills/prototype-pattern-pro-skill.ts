/**
 * 原型模式工具技能 - KAEL
 * 
 * 提供原型模式的核心实现：
 * 1. 原型定义 (Prototype Definition) - 创建可克隆的原型对象
 * 2. 深拷贝/浅拷贝 (Deep/Shallow Copy) - 智能对象克隆
 * 3. 原型注册表 (Prototype Registry) - 全局原型管理
 * 
 * @author KAEL
 * @version 1.0.0
 * @since 2026-03-13
 */

// ============================================
// 类型定义
// ============================================

/**
 * 可克隆接口
 * 实现此接口的对象必须提供 clone 方法
 */
export interface ICloneable<T = any> {
  /**
   * 克隆自身
   * @param deep - 是否深拷贝 (默认 false)
   */
  clone(deep?: boolean): T;
}

/**
 * 原型对象接口
 * 包含原型名称和克隆能力
 */
export interface IPrototype<T = any> extends ICloneable<T> {
  /** 原型名称 */
  readonly prototypeName: string;
  /** 原型描述 (可选) */
  readonly description?: string;
}

/**
 * 深拷贝配置
 */
export interface DeepCloneConfig {
  /** 最大递归深度 (默认 10) */
  maxDepth?: number;
  /** 循环引用检测 (默认 true) */
  detectCycles?: boolean;
  /** 自定义克隆函数映射 (可选) */
  customCloners?: Map<Function, (value: any) => any>;
  /** 排除的字段名 (可选) */
  excludeFields?: string[];
}

/**
 * 原型注册表条目
 */
export interface PrototypeRegistryEntry<T = any> {
  /** 原型名称 */
  name: string;
  /** 原型实例 */
  prototype: IPrototype<T>;
  /** 注册时间 */
  registeredAt: Date;
  /** 克隆次数统计 */
  cloneCount: number;
  /** 描述 */
  description?: string;
}

/**
 * 原型注册表查询结果
 */
export interface RegistryQueryResult<T = any> {
  /** 匹配的原型列表 */
  prototypes: Array<PrototypeRegistryEntry<T>>;
  /** 查询条件 */
  query: string;
  /** 匹配数量 */
  count: number;
}

// ============================================
// 1. 原型定义 (Prototype Definition)
// ============================================

/**
 * 原型基类
 * 提供基础的克隆实现和原型信息
 * 
 * @example
 * class UserPrototype extends PrototypeBase<User> {
 *   constructor(
 *     public id: number,
 *     public name: string,
 *     public email: string
 *   ) {
 *     super('UserPrototype', '用户原型对象');
 *   }
 *   
 *   clone(deep: boolean = false): User {
 *     if (deep) {
 *       return deepClone(this);
 *     }
 *     return { ...this };
 *   }
 * }
 */
export abstract class PrototypeBase<T = any> implements IPrototype<T> {
  /** 原型名称 */
  readonly prototypeName: string;
  /** 原型描述 */
  readonly description?: string;
  /** 创建时间 */
  readonly createdAt: Date;
  
  /**
   * 创建原型实例
   * @param name - 原型名称
   * @param description - 原型描述
   */
  constructor(name: string, description?: string) {
    this.prototypeName = name;
    this.description = description;
    this.createdAt = new Date();
  }
  
  /**
   * 克隆方法 - 必须由子类实现
   */
  abstract clone(deep?: boolean): T;
  
  /**
   * 获取原型信息
   */
  getPrototypeInfo(): { name: string; description?: string; createdAt: Date } {
    return {
      name: this.prototypeName,
      description: this.description,
      createdAt: this.createdAt
    };
  }
}

/**
 * 创建简单原型对象
 * 适用于不需要复杂逻辑的普通对象
 * 
 * @param name - 原型名称
 * @param template - 模板对象
 * @param description - 描述 (可选)
 * @returns 可克隆的原型对象
 * 
 * @example
 * const userPrototype = createPrototype('User', {
 *   id: 0,
 *   name: 'Anonymous',
 *   email: '',
 *   roles: ['user']
 * });
 * 
 * const user1 = userPrototype.clone();
 * const user2 = userPrototype.clone(true); // 深拷贝
 */
export function createPrototype<T extends object>(
  name: string,
  template: T,
  description?: string
): IPrototype<T> {
  return {
    prototypeName: name,
    description,
    clone(deep: boolean = false): T {
      if (deep) {
        return deepClone(template);
      }
      return { ...template } as T;
    }
  };
}

/**
 * 函数式原型工厂
 * 使用工厂函数创建原型，支持复杂的初始化逻辑
 * 
 * @param name - 原型名称
 * @param factory - 工厂函数，返回原型对象
 * @param description - 描述 (可选)
 * @returns 可克隆的原型对象
 * 
 * @example
 * const configPrototype = createPrototypeFactory('Config', () => ({
 *   version: '1.0.0',
 *   settings: {
 *     theme: 'dark',
 *     language: 'zh-CN',
 *     notifications: true
 *   },
 *   features: ['dashboard', 'analytics']
 * }));
 * 
 * const config1 = configPrototype.clone();
 * const config2 = configPrototype.clone(true);
 */
export function createPrototypeFactory<T extends object>(
  name: string,
  factory: () => T,
  description?: string
): IPrototype<T> {
  const instance = factory();
  
  return {
    prototypeName: name,
    description,
    clone(deep: boolean = false): T {
      const newInstance = factory();
      if (deep) {
        return deepClone(newInstance);
      }
      return { ...newInstance } as T;
    }
  };
}

// ============================================
// 2. 深拷贝/浅拷贝 (Deep/Shallow Copy)
// ============================================

/**
 * 浅拷贝
 * 只复制对象的第一层属性
 * 
 * @param obj - 源对象
 * @returns 浅拷贝结果
 * 
 * @example
 * const original = { a: 1, b: { c: 2 } };
 * const shallow = shallowClone(original);
 * shallow.b.c = 3;
 * console.log(original.b.c); // 3 (引用相同)
 */
export function shallowClone<T extends object>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return [...obj] as T;
  }
  
  return { ...obj } as T;
}

/**
 * 深拷贝
 * 递归复制对象的所有层级
 * 
 * @param obj - 源对象
 * @param config - 深拷贝配置 (可选)
 * @returns 深拷贝结果
 * 
 * @example
 * const original = { a: 1, b: { c: 2, d: [3, 4] } };
 * const deep = deepClone(original);
 * deep.b.c = 3;
 * console.log(original.b.c); // 2 (完全独立)
 */
export function deepClone<T>(obj: T, config: DeepCloneConfig = {}): T {
  const {
    maxDepth = 10,
    detectCycles = true,
    customCloners,
    excludeFields = []
  } = config;
  
  // 循环引用检测
  const seen = detectCycles ? new WeakMap() : null;
  
  function clone(value: any, depth: number = 0): any {
    // 达到最大深度
    if (depth > maxDepth) {
      return value;
    }
    
    // 基本类型直接返回
    if (value === null || typeof value !== 'object') {
      return value;
    }
    
    // 循环引用检测
    if (seen) {
      if (seen.has(value)) {
        return seen.get(value);
      }
    }
    
    // 自定义克隆函数
    if (customCloners) {
      const customCloner = customCloners.get(value.constructor);
      if (customCloner) {
        return customCloner(value);
      }
    }
    
    // Date
    if (value instanceof Date) {
      return new Date(value.getTime());
    }
    
    // RegExp
    if (value instanceof RegExp) {
      return new RegExp(value.source, value.flags);
    }
    
    // Set
    if (value instanceof Set) {
      const newSet = new Set();
      if (seen) seen.set(value, newSet);
      value.forEach((item) => newSet.add(clone(item, depth + 1)));
      return newSet;
    }
    
    // Map
    if (value instanceof Map) {
      const newMap = new Map();
      if (seen) seen.set(value, newMap);
      value.forEach((val, key) => {
        newMap.set(key, clone(val, depth + 1));
      });
      return newMap;
    }
    
    // Array
    if (Array.isArray(value)) {
      const newArray: any[] = [];
      if (seen) seen.set(value, newArray);
      value.forEach((item, index) => {
        newArray[index] = clone(item, depth + 1);
      });
      return newArray;
    }
    
    // 可克隆对象
    if (typeof (value as any).clone === 'function') {
      const cloned = (value as any).clone(true);
      if (seen) seen.set(value, cloned);
      return cloned;
    }
    
    // 普通对象
    const newObj: any = {};
    if (seen) seen.set(value, newObj);
    
    for (const key of Object.keys(value)) {
      if (excludeFields.includes(key)) {
        continue;
      }
      
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (descriptor?.get || descriptor?.set) {
        Object.defineProperty(newObj, key, descriptor);
      } else {
        newObj[key] = clone(value[key], depth + 1);
      }
    }
    
    // 复制原型链
    const proto = Object.getPrototypeOf(value);
    if (proto !== null) {
      Object.setPrototypeOf(newObj, proto);
    }
    
    return newObj;
  }
  
  return clone(obj);
}

/**
 * 结构化克隆 (使用 structuredClone API)
 * 浏览器/Node.js 原生支持的结构化克隆算法
 * 
 * @param value - 要克隆的值
 * @returns 克隆结果
 * 
 * @example
 * const original = { a: 1, b: new Date() };
 * const cloned = structuredCloneSafe(original);
 */
export function structuredCloneSafe<T>(value: T): T {
  if (typeof structuredClone === 'function') {
    return structuredClone(value);
  }
  
  // 降级到深拷贝
  return deepClone(value);
}

/**
 * 部分克隆
 * 只克隆对象的指定字段
 * 
 * @param obj - 源对象
 * @param fields - 要克隆的字段列表
 * @param deep - 是否深拷贝 (默认 false)
 * @returns 部分克隆结果
 * 
 * @example
 * const user = { id: 1, name: 'Alice', email: 'a@example.com', password: 'secret' };
 * const safeUser = partialClone(user, ['id', 'name', 'email']);
 * // 结果：{ id: 1, name: 'Alice', email: 'a@example.com' }
 */
export function partialClone<T extends object>(
  obj: T,
  fields: (keyof T)[],
  deep: boolean = false
): Partial<T> {
  const result: any = {};
  
  for (const field of fields) {
    if (field in obj) {
      result[field] = deep ? deepClone(obj[field]) : obj[field];
    }
  }
  
  return result;
}

/**
 * 合并克隆
 * 将多个对象合并并克隆
 * 
 * @param objects - 对象数组 (后面的会覆盖前面的)
 * @param deep - 是否深拷贝 (默认 false)
 * @returns 合并后的克隆对象
 * 
 * @example
 * const base = { a: 1, b: 2 };
 * const override = { b: 3, c: 4 };
 * const merged = mergeClone([base, override]);
 * // 结果：{ a: 1, b: 3, c: 4 }
 */
export function mergeClone<T extends object>(
  objects: T[],
  deep: boolean = false
): T {
  const merged: any = {};
  
  for (const obj of objects) {
    const source = deep ? deepClone(obj) : { ...obj };
    Object.assign(merged, source);
  }
  
  return merged as T;
}

// ============================================
// 3. 原型注册表 (Prototype Registry)
// ============================================

/**
 * 原型注册表类
 * 提供全局原型的注册、查询、克隆功能
 * 
 * @example
 * const registry = new PrototypeRegistry();
 * 
 * // 注册原型
 * registry.register('User', userPrototype);
 * 
 * // 查询原型
 * const userEntry = registry.get('User');
 * 
 * // 克隆原型
 * const user1 = registry.clone('User');
 * const user2 = registry.clone('User', true); // 深拷贝
 * 
 * // 搜索原型
 * const results = registry.search('User');
 * 
 * // 导出所有原型
 * const all = registry.exportAll();
 */
export class PrototypeRegistry {
  /** 注册表存储 */
  private registry: Map<string, PrototypeRegistryEntry> = new Map();
  /** 创建时间 */
  readonly createdAt: Date = new Date();
  
  /**
   * 注册原型
   * @param name - 原型名称
   * @param prototype - 原型实例
   * @param description - 描述 (可选)
   * @returns 注册表条目
   * 
   * @throws Error 如果名称已存在
   */
  register<T>(
    name: string,
    prototype: IPrototype<T>,
    description?: string
  ): PrototypeRegistryEntry<T> {
    if (this.registry.has(name)) {
      throw new Error(`Prototype "${name}" already registered`);
    }
    
    const entry: PrototypeRegistryEntry<T> = {
      name,
      prototype,
      registeredAt: new Date(),
      cloneCount: 0,
      description: description || prototype.description
    };
    
    this.registry.set(name, entry);
    return entry;
  }
  
  /**
   * 注册或更新原型
   * 如果名称已存在则更新，否则注册
   * @param name - 原型名称
   * @param prototype - 原型实例
   * @param description - 描述 (可选)
   * @returns 注册表条目
   */
  registerOrUpdate<T>(
    name: string,
    prototype: IPrototype<T>,
    description?: string
  ): PrototypeRegistryEntry<T> {
    const existing = this.registry.get(name);
    
    if (existing) {
      existing.prototype = prototype;
      if (description) {
        existing.description = description;
      }
      return existing;
    }
    
    return this.register(name, prototype, description);
  }
  
  /**
   * 获取原型
   * @param name - 原型名称
   * @returns 原型条目，不存在则返回 undefined
   */
  get<T>(name: string): PrototypeRegistryEntry<T> | undefined {
    return this.registry.get(name) as PrototypeRegistryEntry<T> | undefined;
  }
  
  /**
   * 获取或抛出
   * @param name - 原型名称
   * @returns 原型条目
   * @throws Error 如果不存在
   */
  getOrThrow<T>(name: string): PrototypeRegistryEntry<T> {
    const entry = this.get<T>(name);
    if (!entry) {
      throw new Error(`Prototype "${name}" not found`);
    }
    return entry;
  }
  
  /**
   * 克隆原型
   * @param name - 原型名称
   * @param deep - 是否深拷贝 (默认 false)
   * @returns 克隆的对象
   * @throws Error 如果原型不存在
   */
  clone<T>(name: string, deep: boolean = false): T {
    const entry = this.getOrThrow<T>(name);
    entry.cloneCount++;
    return entry.prototype.clone(deep);
  }
  
  /**
   * 尝试克隆
   * @param name - 原型名称
   * @param deep - 是否深拷贝 (默认 false)
   * @returns 克隆结果，失败返回 undefined
   */
  tryClone<T>(name: string, deep: boolean = false): T | undefined {
    const entry = this.get<T>(name);
    if (!entry) {
      return undefined;
    }
    entry.cloneCount++;
    return entry.prototype.clone(deep);
  }
  
  /**
   * 注销原型
   * @param name - 原型名称
   * @returns 是否成功注销
   */
  unregister(name: string): boolean {
    return this.registry.delete(name);
  }
  
  /**
   * 检查原型是否存在
   * @param name - 原型名称
   * @returns 是否存在
   */
  has(name: string): boolean {
    return this.registry.has(name);
  }
  
  /**
   * 搜索原型
   * 支持模糊匹配名称和描述
   * @param query - 搜索关键词
   * @returns 查询结果
   */
  search(query: string): RegistryQueryResult {
    const results: Array<PrototypeRegistryEntry> = [];
    const lowerQuery = query.toLowerCase();
    
    for (const entry of this.registry.values()) {
      const nameMatch = entry.name.toLowerCase().includes(lowerQuery);
      const descMatch = entry.description?.toLowerCase().includes(lowerQuery);
      
      if (nameMatch || descMatch) {
        results.push(entry);
      }
    }
    
    return {
      prototypes: results,
      query,
      count: results.length
    };
  }
  
  /**
   * 获取所有原型
   * @returns 所有注册表条目
   */
  getAll(): Array<PrototypeRegistryEntry> {
    return Array.from(this.registry.values());
  }
  
  /**
   * 获取原型数量
   * @returns 注册的原型数量
   */
  count(): number {
    return this.registry.size;
  }
  
  /**
   * 导出所有原型为 JSON
   * @returns JSON 字符串
   */
  exportAll(): string {
    const data = this.getAll().map((entry) => ({
      name: entry.name,
      description: entry.description,
      registeredAt: entry.registeredAt.toISOString(),
      cloneCount: entry.cloneCount
    }));
    
    return JSON.stringify(data, null, 2);
  }
  
  /**
   * 清空注册表
   */
  clear(): void {
    this.registry.clear();
  }
  
  /**
   * 获取注册表统计信息
   */
  getStats(): {
    totalPrototypes: number;
    totalClones: number;
    createdAt: Date;
    topCloned: Array<{ name: string; count: number }>;
  } {
    const all = this.getAll();
    const totalClones = all.reduce((sum, e) => sum + e.cloneCount, 0);
    
    const topCloned = all
      .sort((a, b) => b.cloneCount - a.cloneCount)
      .slice(0, 5)
      .map((e) => ({ name: e.name, count: e.cloneCount }));
    
    return {
      totalPrototypes: all.length,
      totalClones,
      createdAt: this.createdAt,
      topCloned
    };
  }
}

/**
 * 全局原型注册表实例
 * 单例模式，全应用共享
 */
export const globalPrototypeRegistry = new PrototypeRegistry();

// ============================================
// 使用示例 (命令行执行)
// ============================================

if (require.main === module) {
  console.log('=== 原型模式工具 - 使用示例 ===\n');
  
  // ============================================
  // 示例 1: 原型定义
  // ============================================
  console.log('1️⃣ 原型定义 (Prototype Definition)');
  console.log('─'.repeat(50));
  
  // 使用简单原型创建
  const userPrototype = createPrototype(
    'User',
    {
      id: 0,
      name: 'Anonymous',
      email: '',
      roles: ['user'],
      settings: {
        theme: 'light',
        language: 'zh-CN'
      }
    },
    '用户原型对象'
  );
  
  console.log('原型信息:', {
    name: userPrototype.prototypeName,
    description: userPrototype.description
  });
  
  const user1 = userPrototype.clone();
  const user2 = userPrototype.clone(true); // 深拷贝
  
  user1.name = 'Alice';
  user1.settings.theme = 'dark';
  
  console.log('浅拷贝 - user1:', JSON.stringify(user1, null, 2));
  console.log('深拷贝 - user2:', JSON.stringify(user2, null, 2));
  console.log();
  
  // 使用工厂函数创建
  const configPrototype = createPrototypeFactory('Config', () => ({
    version: '1.0.0',
    features: ['dashboard', 'analytics', 'reports'],
    limits: {
      maxUsers: 100,
      maxStorage: '10GB'
    },
    createdAt: new Date().toISOString()
  }));
  
  const config1 = configPrototype.clone();
  const config2 = configPrototype.clone(true);
  
  console.log('配置原型克隆:');
  console.log('  config1:', JSON.stringify(config1, null, 2));
  console.log();
  
  // ============================================
  // 示例 2: 深拷贝/浅拷贝
  // ============================================
  console.log('2️⃣ 深拷贝/浅拷贝 (Deep/Shallow Copy)');
  console.log('─'.repeat(50));
  
  const original = {
    a: 1,
    b: {
      c: 2,
      d: [3, 4, { e: 5 }]
    },
    f: new Date('2026-03-13'),
    g: /test/gi,
    h: new Set([1, 2, 3]),
    i: new Map([['key', 'value']])
  };
  
  const shallow = shallowClone(original);
  const deep = deepClone(original);
  
  // 修改浅拷贝
  (shallow.b as any).c = 999;
  (shallow.b as any).d[0] = 888;
  
  console.log('浅拷贝测试:');
  console.log('  修改 shallow.b.c 后 original.b.c:', (original.b as any).c, '(被污染了! 应该还是 2 但变成了 999)');
  
  // 重置 original 用于深拷贝测试
  original.b.c = 2;
  
  // 修改深拷贝
  (deep.b as any).c = 777;
  (deep.b as any).d[0] = 666;
  
  console.log('深拷贝测试:');
  console.log('  修改 deep.b.c 后 original.b.c:', (original.b as any).c, '(保持独立! 仍然是 2)');
  console.log();
  
  // 部分克隆示例
  const sensitiveUser = {
    id: 1,
    name: 'Bob',
    email: 'bob@example.com',
    password: 'secret123',
    token: 'abc-xyz-123'
  };
  
  const safeUser = partialClone(sensitiveUser, ['id', 'name', 'email']);
  console.log('部分克隆 (排除敏感字段):');
  console.log('  原始:', Object.keys(sensitiveUser));
  console.log('  安全:', Object.keys(safeUser));
  console.log();
  
  // 合并克隆示例
  const baseConfig = { theme: 'light', lang: 'zh', debug: false };
  const userConfig = { theme: 'dark', fontSize: 14 };
  const merged = mergeClone([baseConfig, userConfig]);
  console.log('合并克隆:', JSON.stringify(merged, null, 2));
  console.log();
  
  // ============================================
  // 示例 3: 原型注册表
  // ============================================
  console.log('3️⃣ 原型注册表 (Prototype Registry)');
  console.log('─'.repeat(50));
  
  const registry = new PrototypeRegistry();
  
  // 注册原型
  const productPrototype = createPrototype('Product', {
    id: 0,
    name: 'Unnamed',
    price: 0,
    stock: 0,
    categories: []
  });
  
  const orderPrototype = createPrototype('Order', {
    id: 0,
    userId: 0,
    items: [],
    total: 0,
    status: 'pending'
  });
  
  registry.register('Product', productPrototype, '产品原型');
  registry.register('Order', orderPrototype, '订单原型');
  
  console.log('已注册原型:', registry.count());
  console.log();
  
  // 克隆原型
  const product1 = registry.clone<any>('Product');
  product1.name = 'iPhone 16';
  product1.price = 7999;
  product1.stock = 100;
  
  const order1 = registry.clone<any>('Order', true);
  order1.userId = 123;
  order1.items = [{ productId: 1, quantity: 2 }];
  order1.total = 15998;
  
  console.log('克隆产品:', JSON.stringify(product1, null, 2));
  console.log('克隆订单:', JSON.stringify(order1, null, 2));
  console.log();
  
  // 搜索原型
  const searchResults = registry.search('Product');
  console.log('搜索结果 "Product":');
  console.log('  匹配数量:', searchResults.count);
  console.log('  原型名称:', searchResults.prototypes.map((p) => p.name));
  console.log();
  
  // 获取统计信息
  const stats = registry.getStats();
  console.log('注册表统计:');
  console.log('  总原型数:', stats.totalPrototypes);
  console.log('  总克隆数:', stats.totalClones);
  console.log('  最常克隆:', stats.topCloned);
  console.log();
  
  // 导出注册表
  console.log('导出注册表:');
  console.log(registry.exportAll());
  console.log();
  
  // ============================================
  // 示例 4: 自定义原型类
  // ============================================
  console.log('4️⃣ 自定义原型类 (Custom Prototype Class)');
  console.log('─'.repeat(50));
  
  interface User {
    id: number;
    name: string;
    email: string;
    createdAt: Date;
  }
  
  class UserPrototype extends PrototypeBase<User> {
    constructor(
      public id: number = 0,
      public name: string = 'Anonymous',
      public email: string = ''
    ) {
      super('UserPrototype', '自定义用户原型类');
    }
    
    clone(deep: boolean = false): User {
      const user: User = {
        id: this.id,
        name: this.name,
        email: this.email,
        createdAt: new Date()
      };
      
      if (deep) {
        return deepClone(user);
      }
      return user;
    }
  }
  
  const baseUser = new UserPrototype(1, 'Charlie', 'charlie@example.com');
  const userClone1 = baseUser.clone();
  const userClone2 = baseUser.clone(true);
  
  console.log('基础用户:', JSON.stringify(baseUser, null, 2));
  console.log('克隆用户 1:', JSON.stringify(userClone1, null, 2));
  console.log('克隆用户 2:', JSON.stringify(userClone2, null, 2));
  console.log();
  
  // ============================================
  // 总结
  // ============================================
  console.log('✅ 所有示例执行完成!');
  console.log();
  console.log('📋 功能总结:');
  console.log('  • 原型定义：PrototypeBase, createPrototype, createPrototypeFactory');
  console.log('  • 深/浅拷贝：shallowClone, deepClone, partialClone, mergeClone');
  console.log('  • 原型注册表：PrototypeRegistry, globalPrototypeRegistry');
  console.log();
  console.log('🚀 使用场景:');
  console.log('  • 对象池模式 - 预创建原型，快速克隆');
  console.log('  • 配置管理 - 基于模板创建配置');
  console.log('  • 测试数据 - 快速生成测试对象');
  console.log('  • 游戏开发 - 实体克隆和实例化');
}
