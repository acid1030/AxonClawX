/**
 * Null Object Pattern Skill - 空对象模式工具
 * 
 * 功能:
 * 1. 空对象定义 - 定义安全的空对象实现
 * 2. 默认行为 - 提供无害的默认行为
 * 3. 空值检查 - 简化空值处理逻辑
 * 
 * @author KAEL
 * @version 1.0.0
 */

// ============== 空对象接口定义 ==============

/**
 * 可空对象接口 - 所有可空对象必须实现此接口
 */
export interface INullableObject {
  /**
   * 是否为空对象
   */
  readonly isNull: boolean;

  /**
   * 对象名称
   */
  readonly name: string;

  /**
   * 执行操作 (空对象返回默认值)
   */
  execute?(...args: any[]): any;

  /**
   * 获取值 (空对象返回 undefined 或默认值)
   */
  getValue?(): any;

  /**
   * 设置值 (空对象静默失败)
   */
  setValue?(value: any): void;
}

/**
 * 空对象工厂接口
 */
export interface INullObjectFactory<T extends INullableObject> {
  /**
   * 创建空对象实例
   */
  createNull(): T;

  /**
   * 判断是否为空对象
   */
  isNullObject(obj: any): obj is T;
}

// ============== 基础空对象实现 ==============

/**
 * 基础空对象类 - 提供通用的空对象实现
 */
export abstract class NullObjectBase implements INullableObject {
  readonly isNull: boolean = true;
  readonly name: string = 'NullObject';

  /**
   * 执行操作 - 空对象返回 undefined
   */
  execute(...args: any[]): any {
    // 静默执行，不产生副作用
    return undefined;
  }

  /**
   * 获取值 - 空对象返回 undefined
   */
  getValue(): any {
    return undefined;
  }

  /**
   * 设置值 - 空对象静默失败
   */
  setValue(value: any): void {
    // 静默忽略，不产生副作用
  }

  /**
   * 转换为字符串
   */
  toString(): string {
    return `[NullObject: ${this.name}]`;
  }

  /**
   * JSON 序列化
   */
  toJSON(): any {
    return { isNull: true, name: this.name };
  }
}

// ============== 空对象注册表 ==============

/**
 * 空对象注册表 - 管理全局空对象实例
 */
export class NullObjectRegistry {
  private static instance: NullObjectRegistry;
  private nullObjects: Map<string, INullableObject> = new Map();

  private constructor() {
    // 注册默认空对象
    this.register('default', new DefaultNullObject());
  }

  /**
   * 获取单例实例
   */
  public static getInstance(): NullObjectRegistry {
    if (!NullObjectRegistry.instance) {
      NullObjectRegistry.instance = new NullObjectRegistry();
    }
    return NullObjectRegistry.instance;
  }

  /**
   * 注册空对象
   * @param name 空对象名称
   * @param nullObject 空对象实例
   */
  public register(name: string, nullObject: INullableObject): void {
    this.nullObjects.set(name, nullObject);
  }

  /**
   * 获取空对象
   * @param name 空对象名称
   * @returns 空对象实例，不存在返回默认空对象
   */
  public get(name: string = 'default'): INullableObject {
    return this.nullObjects.get(name) || this.get('default');
  }

  /**
   * 判断是否为已注册的空对象
   * @param obj 对象
   * @returns 是否为空对象
   */
  public isNullObject(obj: any): boolean {
    if (!obj || typeof obj !== 'object') {
      return false;
    }
    return obj.isNull === true;
  }

  /**
   * 获取所有已注册的空对象名称
   */
  public getRegisteredNames(): string[] {
    return Array.from(this.nullObjects.keys());
  }
}

// ============== 默认空对象实现 ==============

/**
 * 默认空对象 - 通用的空对象实现
 */
export class DefaultNullObject extends NullObjectBase {
  readonly name: string = 'DefaultNullObject';

  constructor() {
    super();
  }
}

// ============== 空对象工具函数 ==============

/**
 * 安全调用 - 如果对象为空则使用空对象
 * @param obj 可能为空的对象
 * @param nullObject 空对象实例
 * @returns 安全对象
 */
export function safeCall<T extends INullableObject>(
  obj: T | null | undefined,
  nullObject?: T
): T {
  if (obj === null || obj === undefined) {
    return nullObject || (NullObjectRegistry.getInstance().get() as T);
  }
  return obj;
}

/**
 * 空值检查 - 判断对象是否为空
 * @param obj 待检查对象
 * @returns 是否为空
 */
export function isNull(obj: any): boolean {
  if (obj === null || obj === undefined) {
    return true;
  }
  if (typeof obj === 'object' && 'isNull' in obj) {
    return obj.isNull === true;
  }
  return false;
}

/**
 * 非空检查 - 判断对象是否有效
 * @param obj 待检查对象
 * @returns 是否有效
 */
export function isNotNull(obj: any): boolean {
  return !isNull(obj);
}

/**
 * 提供默认值 - 如果对象为空则返回默认值
 * @param obj 可能为空的对象
 * @param defaultValue 默认值
 * @returns 对象值或默认值
 */
export function provideDefault<T>(obj: T | null | undefined, defaultValue: T): T {
  if (isNull(obj)) {
    return defaultValue;
  }
  return obj;
}

/**
 * 空对象转换 - 将 null/undefined 转换为空对象
 * @param obj 可能为空的对象
 * @param nullObject 空对象实例
 * @returns 空对象或原对象
 */
export function toNullObject<T extends INullableObject>(
  obj: T | null | undefined,
  nullObject: T
): T {
  return isNull(obj) ? nullObject : obj;
}

// ============== 专用空对象实现 ==============

/**
 * 空用户对象
 */
export class NullUser extends NullObjectBase {
  readonly name: string = 'NullUser';
  readonly id: string = '';
  readonly email: string = '';
  readonly username: string = 'anonymous';

  getValue(): any {
    return {
      id: this.id,
      email: this.email,
      username: this.username,
      isNull: this.isNull
    };
  }
}

/**
 * 空配置对象
 */
export class NullConfig extends NullObjectBase {
  readonly name: string = 'NullConfig';

  getValue(): any {
    return {};
  }

  setValue(value: any): void {
    // 静默忽略
  }
}

/**
 * 空日志记录器
 */
export class NullLogger extends NullObjectBase {
  readonly name: string = 'NullLogger';

  log(...args: any[]): void {
    // 静默忽略
  }

  info(...args: any[]): void {
    // 静默忽略
  }

  warn(...args: any[]): void {
    // 静默忽略
  }

  error(...args: any[]): void {
    // 静默忽略
  }

  debug(...args: any[]): void {
    // 静默忽略
  }
}

/**
 * 空缓存
 */
export class NullCache extends NullObjectBase {
  readonly name: string = 'NullCache';

  get(key: string): any {
    return undefined;
  }

  set(key: string, value: any): void {
    // 静默忽略
  }

  delete(key: string): boolean {
    return false;
  }

  has(key: string): boolean {
    return false;
  }

  clear(): void {
    // 静默忽略
  }
}

/**
 * 空通知器
 */
export class NullNotifier extends NullObjectBase {
  readonly name: string = 'NullNotifier';

  notify(message: string): void {
    // 静默忽略
  }

  success(message: string): void {
    // 静默忽略
  }

  error(message: string): void {
    // 静默忽略
  }

  warning(message: string): void {
    // 静默忽略
  }
}

// ============== 空对象构建器 ==============

/**
 * 空对象构建器 - 链式 API 创建空对象
 */
export class NullObjectBuilder<T extends INullableObject> {
  private props: Partial<T> = {} as Partial<T>;

  constructor(private baseName: string = 'CustomNullObject') {
    (this.props as any).isNull = true;
    (this.props as any).name = baseName;
  }

  withName(name: string): this {
    (this.props as any).name = name;
    return this;
  }

  withExecute(fn: (...args: any[]) => any): this {
    (this.props as any).execute = fn;
    return this;
  }

  withGetValue(fn: () => any): this {
    (this.props as any).getValue = fn;
    return this;
  }

  withSetValue(fn: (value: any) => void): this {
    (this.props as any).setValue = fn;
    return this;
  }

  build(): T {
    const baseNull = Object.create(NullObjectBase.prototype);
    NullObjectBase.call(baseNull);
    return Object.assign(baseNull, this.props) as T;
  }
}

// ============== 导出 ==============

export default {
  // 基础类
  NullObjectBase,
  DefaultNullObject,

  // 注册表
  NullObjectRegistry,

  // 工具函数
  safeCall,
  isNull,
  isNotNull,
  provideDefault,
  toNullObject,

  // 专用空对象
  NullUser,
  NullConfig,
  NullLogger,
  NullCache,
  NullNotifier,

  // 构建器
  NullObjectBuilder
};
