/**
 * 工厂模式专业工具技能 - KAEL
 * 
 * 提供工厂模式的完整实现：
 * 1. 工厂定义 (Factory Definition) - 简单工厂、工厂方法、抽象工厂
 * 2. 对象创建 (Object Creation) - 参数化创建、配置化创建、动态创建
 * 3. 注册表管理 (Registry Management) - 类型注册、实例缓存、生命周期管理
 * 
 * @author KAEL
 * @version 1.0.0
 * @since 2026-03-13
 */

// ============================================
// 类型定义
// ============================================

/**
 * 可创建对象的构造函数类型
 */
export type Constructor<T = any> = new (...args: any[]) => T;

/**
 * 工厂创建函数类型
 */
export type FactoryFn<T = any> = (...args: any[]) => T;

/**
 * 工厂配置接口
 */
export interface FactoryConfig<T = any> {
  /** 工厂名称 */
  name: string;
  /** 创建函数 */
  create: FactoryFn<T>;
  /** 是否单例 (可选，默认 false) */
  singleton?: boolean;
  /** 生命周期钩子 - 创建后 (可选) */
  onCreated?: (instance: T) => void;
  /** 生命周期钩子 - 销毁前 (可选) */
  onDestroy?: (instance: T) => void;
}

/**
 * 注册表条目
 */
export interface RegistryEntry<T = any> {
  /** 工厂配置 */
  config: FactoryConfig<T>;
  /** 单例实例 (如果启用) */
  instance?: T;
  /** 创建时间 */
  createdAt: number;
  /** 创建次数 */
  createCount: number;
}

/**
 * 工厂注册表接口
 */
export interface IFactoryRegistry {
  /**
   * 注册工厂
   */
  register<T>(config: FactoryConfig<T>): void;
  
  /**
   * 注销工厂
   */
  unregister(name: string): boolean;
  
  /**
   * 获取工厂
   */
  get<T>(name: string): FactoryConfig<T> | undefined;
  
  /**
   * 检查工厂是否存在
   */
  has(name: string): boolean;
  
  /**
   * 列出所有注册的工厂
   */
  list(): string[];
  
  /**
   * 清空所有注册
   */
  clear(): void;
}

/**
 * 对象创建器接口
 */
export interface IObjectCreator {
  /**
   * 创建对象
   */
  create<T>(factoryName: string, ...args: any[]): T;
  
  /**
   * 获取或创建单例
   */
  getSingleton<T>(factoryName: string): T;
  
  /**
   * 销毁实例 (单例或缓存)
   */
  destroy(factoryName: string): boolean;
}

// ============================================
// 1. 工厂定义 (Factory Definition)
// ============================================

/**
 * 简单工厂类
 * 根据类型参数创建不同对象
 * 
 * @example
 * // 定义产品接口
 * interface Shape { draw(): void; }
 * 
 * // 定义具体产品
 * class Circle implements Shape { draw() { console.log('Drawing Circle'); } }
 * class Square implements Shape { draw() { console.log('Drawing Square'); } }
 * 
 * // 使用简单工厂
 * const shapeFactory = new SimpleFactory<Shape>();
 * const circle = shapeFactory.create('circle');
 * const square = shapeFactory.create('square');
 */
export class SimpleFactory<T> {
  private creators: Map<string, FactoryFn<T>> = new Map();
  
  /**
   * 注册创建器
   */
  register(type: string, creator: FactoryFn<T>): void {
    this.creators.set(type, creator);
  }
  
  /**
   * 创建对象
   */
  create(type: string, ...args: any[]): T {
    const creator = this.creators.get(type);
    if (!creator) {
      throw new Error(`Unknown type: ${type}`);
    }
    return creator(...args);
  }
  
  /**
   * 检查类型是否已注册
   */
  has(type: string): boolean {
    return this.creators.has(type);
  }
  
  /**
   * 列出所有已注册类型
   */
  listTypes(): string[] {
    return Array.from(this.creators.keys());
  }
}

/**
 * 工厂方法基类
 * 子类重写 createProduct 方法来实现具体创建逻辑
 * 
 * @example
 * // 定义产品
 * class Button { render() { return 'Button'; } }
 * class MacButton extends Button { render() { return 'MacButton'; } }
 * class WinButton extends Button { render() { return 'WinButton'; } }
 * 
 * // 定义工厂
 * abstract class GUIFactory {
 *   createButton(): Button {
 *     const btn = this.createProduct();
 *     btn.render();
 *     return btn;
 *   }
 *   protected abstract createProduct(): Button;
 * }
 * 
 * class MacFactory extends GUIFactory {
 *   protected createProduct(): Button { return new MacButton(); }
 * }
 * 
 * class WinFactory extends GUIFactory {
 *   protected createProduct(): Button { return new WinButton(); }
 * }
 * 
 * // 使用
 * const macFactory = new MacFactory();
 * const macButton = macFactory.createButton(); // MacButton
 */
export abstract class FactoryMethod<T> {
  /**
   * 工厂方法 - 由子类实现
   */
  protected abstract createProduct(...args: any[]): T;
  
  /**
   * 公共创建接口 - 可包含通用逻辑
   */
  create(...args: any[]): T {
    const product = this.createProduct(...args);
    this.onProductCreated(product);
    return product;
  }
  
  /**
   * 产品创建后钩子 - 可选重写
   */
  protected onProductCreated(product: T): void {
    // 默认空实现
  }
}

/**
 * 抽象工厂接口
 * 创建一系列相关或依赖的对象
 * 
 * @example
 * // 产品族：UI 组件
 * interface Button { render(): void; }
 * interface Checkbox { toggle(): void; }
 * 
 * // 抽象工厂
 * interface IUIFactory {
 *   createButton(): Button;
 *   createCheckbox(): Checkbox;
 * }
 * 
 * // 具体工厂：Mac 风格
 * class MacUIFactory implements IUIFactory {
 *   createButton(): Button { return { render: () => console.log('Mac Button') }; }
 *   createCheckbox(): Checkbox { return { toggle: () => console.log('Mac Checkbox') }; }
 * }
 * 
 * // 具体工厂：Windows 风格
 * class WinUIFactory implements IUIFactory {
 *   createButton(): Button { return { render: () => console.log('Win Button') }; }
 *   createCheckbox(): Checkbox { return { toggle: () => console.log('Win Checkbox') }; }
 * }
 */
export interface IAbstractFactory {
  [key: string]: (...args: any[]) => any;
}

// ============================================
// 2. 对象创建 (Object Creation)
// ============================================

/**
 * 参数化对象创建器
 * 根据配置参数动态创建对象
 * 
 * @example
 * // 创建数据库连接
 * const dbCreator = new ParameterizedCreator();
 * dbCreator.registerFactory('mysql', (config) => {
 *   return new MySQLConnection(config.host, config.port, config.database);
 * });
 * 
 * const db = dbCreator.create('mysql', {
 *   host: 'localhost',
 *   port: 3306,
 *   database: 'myapp'
 * });
 */
export class ParameterizedCreator {
  private factories: Map<string, FactoryFn<any>> = new Map();
  
  /**
   * 注册工厂函数
   */
  registerFactory<T>(name: string, factory: FactoryFn<T>): void {
    this.factories.set(name, factory as FactoryFn<any>);
  }
  
  /**
   * 创建对象 (带参数)
   */
  create<T>(name: string, params: any): T {
    const factory = this.factories.get(name);
    if (!factory) {
      throw new Error(`Factory not registered: ${name}`);
    }
    return factory(params) as T;
  }
  
  /**
   * 批量创建对象
   */
  createBatch<T>(name: string, paramsArray: any[]): T[] {
    return paramsArray.map((params) => this.create<T>(name, params));
  }
}

/**
 * 配置化对象创建器
 * 使用配置文件或对象来创建复杂对象
 * 
 * @example
 * const configCreator = new ConfigurableCreator();
 * 
 * // 注册创建逻辑
 * configCreator.register('userService', (config) => {
 *   return new UserService({
 *     apiUrl: config.api?.url || '/api/users',
 *     timeout: config.api?.timeout || 5000,
 *     cache: config.cache?.enabled ?? true
 *   });
 * });
 * 
 * // 使用配置创建
 * const service = configCreator.create('userService', {
 *   api: { url: 'https://api.example.com', timeout: 10000 },
 *   cache: { enabled: false }
 * });
 */
export class ConfigurableCreator {
  private creators: Map<string, (config: any) => any> = new Map();
  private defaultConfigs: Map<string, any> = new Map();
  
  /**
   * 注册配置化创建器
   */
  register<T>(name: string, creator: (config: any) => T, defaultConfig?: any): void {
    this.creators.set(name, creator);
    if (defaultConfig) {
      this.defaultConfigs.set(name, defaultConfig);
    }
  }
  
  /**
   * 创建对象 (合并默认配置)
   */
  create<T>(name: string, config?: any): T {
    const creator = this.creators.get(name);
    if (!creator) {
      throw new Error(`Creator not registered: ${name}`);
    }
    
    const defaultConfig = this.defaultConfigs.get(name) || {};
    const mergedConfig = this.mergeConfig(defaultConfig, config || {});
    
    return creator(mergedConfig) as T;
  }
  
  /**
   * 深度合并配置
   */
  private mergeConfig(defaults: any, overrides: any): any {
    const result = { ...defaults };
    for (const key in overrides) {
      if (overrides.hasOwnProperty(key)) {
        if (
          typeof overrides[key] === 'object' &&
          overrides[key] !== null &&
          !Array.isArray(overrides[key])
        ) {
          result[key] = this.mergeConfig(defaults[key] || {}, overrides[key]);
        } else {
          result[key] = overrides[key];
        }
      }
    }
    return result;
  }
}

/**
 * 动态对象创建器
 * 运行时根据类型字符串动态创建对象
 * 
 * @example
 * const dynamicCreator = new DynamicCreator();
 * 
 * // 注册类
 * dynamicCreator.registerClass('circle', Circle);
 * dynamicCreator.registerClass('square', Square);
 * 
 * // 动态创建
 * const shape = dynamicCreator.create('circle', { radius: 5 });
 */
export class DynamicCreator {
  private classes: Map<string, Constructor<any>> = new Map();
  
  /**
   * 注册类构造函数
   */
  registerClass<T>(type: string, constructor: Constructor<T>): void {
    this.classes.set(type, constructor);
  }
  
  /**
   * 动态创建实例
   */
  create<T>(type: string, ...args: any[]): T {
    const Constructor = this.classes.get(type);
    if (!Constructor) {
      throw new Error(`Class not registered: ${type}`);
    }
    return new Constructor(...args) as T;
  }
  
  /**
   * 检查类是否已注册
   */
  hasClass(type: string): boolean {
    return this.classes.has(type);
  }
}

// ============================================
// 3. 注册表管理 (Registry Management)
// ============================================

/**
 * 工厂注册表实现
 * 管理所有注册的工厂和它们的生命周期
 */
export class FactoryRegistry implements IFactoryRegistry {
  private registry: Map<string, RegistryEntry<any>> = new Map();
  
  /**
   * 注册工厂
   */
  register<T>(config: FactoryConfig<T>): void {
    if (this.registry.has(config.name)) {
      console.warn(`Factory already registered: ${config.name}, overwriting...`);
    }
    
    this.registry.set(config.name, {
      config,
      createdAt: Date.now(),
      createCount: 0
    });
  }
  
  /**
   * 注销工厂
   */
  unregister(name: string): boolean {
    const entry = this.registry.get(name);
    if (entry) {
      // 调用销毁钩子
      if (entry.instance && entry.config.onDestroy) {
        entry.config.onDestroy(entry.instance);
      }
      return this.registry.delete(name);
    }
    return false;
  }
  
  /**
   * 获取工厂配置
   */
  get<T>(name: string): FactoryConfig<T> | undefined {
    return this.registry.get(name)?.config;
  }
  
  /**
   * 检查工厂是否存在
   */
  has(name: string): boolean {
    return this.registry.has(name);
  }
  
  /**
   * 列出所有注册的工厂名称
   */
  list(): string[] {
    return Array.from(this.registry.keys());
  }
  
  /**
   * 清空所有注册
   */
  clear(): void {
    // 调用所有销毁钩子
    for (const entry of this.registry.values()) {
      if (entry.instance && entry.config.onDestroy) {
        entry.config.onDestroy(entry.instance);
      }
    }
    this.registry.clear();
  }
  
  /**
   * 获取注册表统计信息
   */
  getStats(): {
    total: number;
    singletons: number;
    entries: Array<{
      name: string;
      singleton: boolean;
      createCount: number;
      createdAt: number;
    }>;
  } {
    const entries = Array.from(this.registry.entries()).map(([name, entry]) => ({
      name,
      singleton: entry.config.singleton ?? false,
      createCount: entry.createCount,
      createdAt: entry.createdAt
    }));
    
    return {
      total: this.registry.size,
      singletons: entries.filter((e) => e.singleton).length,
      entries
    };
  }
}

/**
 * 对象创建器实现 (带注册表)
 * 整合工厂注册表和对象创建功能
 */
export class ObjectCreator implements IObjectCreator {
  constructor(private registry: FactoryRegistry = new FactoryRegistry()) {}
  
  /**
   * 注册工厂
   */
  register<T>(config: FactoryConfig<T>): void {
    this.registry.register(config);
  }
  
  /**
   * 创建对象
   */
  create<T>(factoryName: string, ...args: any[]): T {
    const entry = this.registry['registry'].get(factoryName);
    if (!entry) {
      throw new Error(`Factory not found: ${factoryName}`);
    }
    
    const { config } = entry;
    
    // 如果是单例且已存在，直接返回
    if (config.singleton && entry.instance !== undefined) {
      return entry.instance as T;
    }
    
    // 创建新实例
    const instance = config.create(...args) as T;
    
    // 更新统计
    entry.createCount++;
    
    // 调用创建后钩子
    if (config.onCreated) {
      config.onCreated(instance);
    }
    
    // 如果是单例，缓存实例
    if (config.singleton) {
      entry.instance = instance;
    }
    
    return instance;
  }
  
  /**
   * 获取或创建单例
   */
  getSingleton<T>(factoryName: string): T {
    return this.create<T>(factoryName);
  }
  
  /**
   * 销毁实例
   */
  destroy(factoryName: string): boolean {
    const entry = this.registry['registry'].get(factoryName);
    if (!entry) {
      return false;
    }
    
    if (entry.instance && entry.config.onDestroy) {
      entry.config.onDestroy(entry.instance);
    }
    
    entry.instance = undefined;
    return true;
  }
  
  /**
   * 获取注册表
   */
  getRegistry(): FactoryRegistry {
    return this.registry;
  }
}

// ============================================
// 便捷工厂函数
// ============================================

/**
 * 创建简单工厂
 */
export function createSimpleFactory<T>(): SimpleFactory<T> {
  return new SimpleFactory<T>();
}

/**
 * 创建参数化创建器
 */
export function createParameterizedCreator(): ParameterizedCreator {
  return new ParameterizedCreator();
}

/**
 * 创建配置化创建器
 */
export function createConfigurableCreator(): ConfigurableCreator {
  return new ConfigurableCreator();
}

/**
 * 创建动态创建器
 */
export function createDynamicCreator(): DynamicCreator {
  return new DynamicCreator();
}

/**
 * 创建对象创建器 (带注册表)
 */
export function createObjectCreator(): ObjectCreator {
  return new ObjectCreator();
}

/**
 * 创建工厂注册表
 */
export function createFactoryRegistry(): FactoryRegistry {
  return new FactoryRegistry();
}

// ============================================
// 使用示例 (命令行执行)
// ============================================

if (require.main === module) {
  console.log('=== 工厂模式专业工具 - 使用示例 ===\n');
  
  // ============================================
  // 示例 1: 简单工厂
  // ============================================
  console.log('1️⃣ 简单工厂 (Simple Factory)');
  console.log('─'.repeat(50));
  
  // 定义形状接口和产品
  interface Shape {
    name: string;
    area(): number;
  }
  
  class Circle implements Shape {
    constructor(public name: string, private radius: number) {}
    area() { return Math.PI * this.radius ** 2; }
  }
  
  class Square implements Shape {
    constructor(public name: string, private side: number) {}
    area() { return this.side ** 2; }
  }
  
  // 创建简单工厂
  const shapeFactory = createSimpleFactory<Shape>();
  shapeFactory.register('circle', (radius: number) => new Circle('Circle', radius));
  shapeFactory.register('square', (side: number) => new Square('Square', side));
  
  const circle = shapeFactory.create('circle', 5);
  const square = shapeFactory.create('square', 4);
  
  console.log(`Circle (r=5): area = ${circle.area().toFixed(2)}`);
  console.log(`Square (s=4): area = ${square.area()}`);
  console.log('已注册类型:', shapeFactory.listTypes());
  console.log();
  
  // ============================================
  // 示例 2: 工厂方法
  // ============================================
  console.log('2️⃣ 工厂方法 (Factory Method)');
  console.log('─'.repeat(50));
  
  // 定义产品
  class Logger {
    constructor(protected prefix: string) {}
    log(message: string) {
      console.log(`  [${this.prefix}] ${message}`);
    }
  }
  
  class FileLogger extends Logger {
    constructor() { super('FILE'); }
    log(message: string) {
      super.log(`Writing to file: ${message}`);
    }
  }
  
  class ConsoleLogger extends Logger {
    constructor() { super('CONSOLE'); }
    log(message: string) {
      super.log(message);
    }
  }
  
  // 定义工厂
  abstract class LoggerFactory extends FactoryMethod<Logger> {
    createLogger(): Logger {
      return this.create();
    }
  }
  
  class FileLoggerFactory extends LoggerFactory {
    protected createProduct(): Logger {
      return new FileLogger();
    }
  }
  
  class ConsoleLoggerFactory extends LoggerFactory {
    protected createProduct(): Logger {
      return new ConsoleLogger();
    }
  }
  
  // 使用工厂方法
  const fileFactory = new FileLoggerFactory();
  const consoleFactory = new ConsoleLoggerFactory();
  
  const fileLogger = fileFactory.createLogger();
  const consoleLogger = consoleFactory.createLogger();
  
  fileLogger.log('System started');
  consoleLogger.log('User logged in');
  console.log();
  
  // ============================================
  // 示例 3: 参数化创建器
  // ============================================
  console.log('3️⃣ 参数化创建器 (Parameterized Creator)');
  console.log('─'.repeat(50));
  
  interface Database {
    connect(): Promise<void>;
    query(sql: string): any[];
  }
  
  class MySQLDatabase implements Database {
    constructor(private config: { host: string; port: number; database: string }) {}
    async connect() { console.log(`  Connected to MySQL at ${this.config.host}:${this.config.port}`); }
    query(sql: string) { return [{ result: 'mock' }]; }
  }
  
  class PostgreSQLDatabase implements Database {
    constructor(private config: { host: string; port: number; database: string }) {}
    async connect() { console.log(`  Connected to PostgreSQL at ${this.config.host}:${this.config.port}`); }
    query(sql: string) { return [{ result: 'mock' }]; }
  }
  
  const dbCreator = createParameterizedCreator();
  dbCreator.registerFactory<Database>('mysql', (config) => new MySQLDatabase(config));
  dbCreator.registerFactory<Database>('postgresql', (config) => new PostgreSQLDatabase(config));
  
  const mysql = dbCreator.create<Database>('mysql', { host: 'localhost', port: 3306, database: 'app' });
  const postgres = dbCreator.create<Database>('postgresql', { host: 'db.example.com', port: 5432, database: 'analytics' });
  
  console.log('创建数据库连接:');
  mysql.connect();
  postgres.connect();
  console.log();
  
  // ============================================
  // 示例 4: 配置化创建器
  // ============================================
  console.log('4️⃣ 配置化创建器 (Configurable Creator)');
  console.log('─'.repeat(50));
  
  class HTTPClient {
    constructor(
      public baseUrl: string,
      public timeout: number,
      public retries: number
    ) {}
    
    info() {
      console.log(`  HTTPClient: ${this.baseUrl} (timeout: ${this.timeout}ms, retries: ${this.retries})`);
    }
  }
  
  const configCreator = createConfigurableCreator();
  configCreator.register<HTTPClient>(
    'httpClient',
    (config) => new HTTPClient(config.baseUrl, config.timeout, config.retries),
    { baseUrl: '/api', timeout: 5000, retries: 3 }
  );
  
  const defaultClient = configCreator.create<HTTPClient>('httpClient');
  const customClient = configCreator.create<HTTPClient>('httpClient', {
    baseUrl: 'https://api.example.com',
    timeout: 10000
  });
  
  console.log('默认配置客户端:');
  defaultClient.info();
  console.log('自定义配置客户端:');
  customClient.info();
  console.log();
  
  // ============================================
  // 示例 5: 对象创建器 (带注册表和单例)
  // ============================================
  console.log('5️⃣ 对象创建器 + 注册表 (Object Creator + Registry)');
  console.log('─'.repeat(50));
  
  class CacheService {
    private cache = new Map<string, any>();
    constructor(public name: string) {
      console.log(`  Creating CacheService: ${name}`);
    }
    get(key: string) { return this.cache.get(key); }
    set(key: string, value: any) { this.cache.set(key, value); }
  }
  
  const creator = createObjectCreator();
  
  // 注册单例服务
  creator.register<CacheService>({
    name: 'userCache',
    create: () => new CacheService('UserCache'),
    singleton: true,
    onCreated: (instance) => console.log(`  ✓ Created: ${instance.name}`),
    onDestroy: (instance) => console.log(`  ✗ Destroyed: ${instance.name}`)
  });
  
  // 注册非单例服务
  creator.register<CacheService>({
    name: 'sessionCache',
    create: () => new CacheService('SessionCache'),
    singleton: false,
    onCreated: (instance) => console.log(`  ✓ Created: ${instance.name}`)
  });
  
  console.log('创建单例 (userCache):');
  const cache1 = creator.create<CacheService>('userCache');
  const cache2 = creator.create<CacheService>('userCache');
  console.log(`  两次创建是否同一实例：${cache1 === cache2}`);
  
  console.log('\n创建非单例 (sessionCache):');
  const session1 = creator.create<CacheService>('sessionCache');
  const session2 = creator.create<CacheService>('sessionCache');
  console.log(`  两次创建是否同一实例：${session1 === session2}`);
  
  console.log('\n注册表统计:');
  const stats = creator.getRegistry().getStats();
  console.log(`  总工厂数：${stats.total}`);
  console.log(`  单例数：${stats.singletons}`);
  stats.entries.forEach((e) => {
    console.log(`    - ${e.name}: ${e.createCount} 次创建`);
  });
  
  console.log('\n销毁单例:');
  creator.destroy('userCache');
  console.log();
  
  // ============================================
  // 示例 6: 动态创建器
  // ============================================
  console.log('6️⃣ 动态创建器 (Dynamic Creator)');
  console.log('─'.repeat(50));
  
  class Notification {
    constructor(public type: string, public message: string) {}
    send() { console.log(`  Sending ${this.type} notification: ${this.message}`); }
  }
  
  class EmailNotification extends Notification {
    constructor(message: string) { super('email', message); }
    send() { console.log(`  📧 Email: ${this.message}`); }
  }
  
  class SMSNotification extends Notification {
    constructor(message: string) { super('sms', message); }
    send() { console.log(`  📱 SMS: ${this.message}`); }
  }
  
  class PushNotification extends Notification {
    constructor(message: string) { super('push', message); }
    send() { console.log(`  🔔 Push: ${this.message}`); }
  }
  
  const dynamicCreator = createDynamicCreator();
  dynamicCreator.registerClass('email', EmailNotification);
  dynamicCreator.registerClass('sms', SMSNotification);
  dynamicCreator.registerClass('push', PushNotification);
  
  console.log('动态创建通知:');
  const email = dynamicCreator.create<Notification>('email', 'Welcome!');
  const sms = dynamicCreator.create<Notification>('sms', 'Verify code: 1234');
  const push = dynamicCreator.create<Notification>('push', 'New message received');
  
  email.send();
  sms.send();
  push.send();
  console.log();
  
  // ============================================
  // 总结
  // ============================================
  console.log('✅ 所有示例执行完成!');
  console.log();
  console.log('📋 功能总结:');
  console.log('  • 工厂定义：SimpleFactory, FactoryMethod, IAbstractFactory');
  console.log('  • 对象创建：ParameterizedCreator, ConfigurableCreator, DynamicCreator');
  console.log('  • 注册表管理：FactoryRegistry, ObjectCreator');
  console.log('  • 便捷函数：createSimpleFactory, createParameterizedCreator, ...');
  console.log();
  console.log('🎯 适用场景:');
  console.log('  • 需要统一管理对象创建逻辑');
  console.log('  • 需要支持多种产品变体');
  console.log('  • 需要单例/生命周期管理');
  console.log('  • 需要运行时动态创建对象');
}
