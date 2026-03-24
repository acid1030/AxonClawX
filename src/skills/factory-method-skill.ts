/**
 * 工厂方法工具技能 - KAEL
 * 
 * 提供工厂方法模式的核心实现：
 * 1. 工厂接口 (Factory Interface) - 定义产品创建的标准接口
 * 2. 产品创建 (Product Creation) - 具体产品的实例化逻辑
 * 3. 工厂注册 (Factory Registry) - 工厂的注册与查找机制
 * 
 * @author KAEL
 * @version 1.0.0
 * @since 2026-03-13
 */

// ============================================
// 类型定义
// ============================================

/**
 * 产品基类接口
 * 所有可创建的产品必须实现此接口
 */
export interface IProduct {
  /**
   * 产品类型标识
   */
  readonly productType: string;
  
  /**
   * 产品初始化方法
   */
  initialize?(): void;
  
  /**
   * 产品销毁方法
   */
  destroy?(): void;
}

/**
 * 工厂接口
 * 定义创建产品的标准方法
 */
export interface IFactory<TProduct extends IProduct> {
  /**
   * 创建产品实例
   * @param options - 创建选项
   * @returns 产品实例
   */
  create(options?: any): TProduct;
}

/**
 * 工厂注册信息
 */
export interface FactoryRegistryInfo {
  /** 工厂名称 */
  name: string;
  /** 产品类型 */
  productType: string;
  /** 工厂实例 */
  factory: IFactory<IProduct>;
  /** 注册时间 */
  registeredAt: Date;
}

/**
 * 工厂注册表配置
 */
export interface FactoryRegistryConfig {
  /** 是否允许覆盖已注册的工厂 */
  allowOverride?: boolean;
  /** 是否启用日志 */
  enableLogging?: boolean;
}

// ============================================
// 1. 工厂接口 (Factory Interface)
// ============================================

/**
 * 抽象工厂基类
 * 提供工厂的通用实现框架
 * 
 * @template TProduct - 产品类型
 * 
 * @example
 * class ButtonFactory extends AbstractFactory<ButtonProduct> {
 *   create(options?: ButtonOptions): ButtonProduct {
 *     return new ButtonProduct(options);
 *   }
 * }
 */
export abstract class AbstractFactory<TProduct extends IProduct> implements IFactory<TProduct> {
  /**
   * 工厂名称
   */
  readonly factoryName: string;
  
  /**
   * 产品类型
   */
  readonly productType: string;
  
  constructor(factoryName: string, productType: string) {
    this.factoryName = factoryName;
    this.productType = productType;
  }
  
  /**
   * 创建产品实例 - 必须由子类实现
   */
  abstract create(options?: any): TProduct;
  
  /**
   * 验证创建选项
   * 可在子类中重写以添加自定义验证逻辑
   */
  protected validateOptions(options?: any): boolean {
    return true;
  }
  
  /**
   * 创建前钩子
   * 可在子类中重写以添加初始化逻辑
   */
  protected beforeCreate(options?: any): void {
    // 默认空实现
  }
  
  /**
   * 创建后钩子
   * 可在子类中重写以添加后置处理逻辑
   */
  protected afterCreate(product: TProduct, options?: any): void {
    // 默认空实现
  }
}

// ============================================
// 2. 产品创建 (Product Creation)
// ============================================

/**
 * 通用产品基类
 * 提供产品的基础实现
 * 
 * @example
 * class ButtonProduct extends BaseProduct {
 *   constructor(options: ButtonOptions) {
 *     super('button', options);
 *   }
 *   
 *   click() {
 *     console.log('Button clicked!');
 *   }
 * }
 */
export abstract class BaseProduct implements IProduct {
  readonly productType: string;
  readonly createdAt: Date;
  protected options: any;
  private isInitialized: boolean = false;
  private isDestroyed: boolean = false;
  
  constructor(productType: string, options?: any) {
    this.productType = productType;
    this.createdAt = new Date();
    this.options = options || {};
  }
  
  /**
   * 初始化产品
   */
  initialize(): void {
    if (this.isInitialized) {
      console.warn(`[Product] ${this.productType} already initialized`);
      return;
    }
    
    this.onInitialize();
    this.isInitialized = true;
  }
  
  /**
   * 销毁产品
   */
  destroy(): void {
    if (this.isDestroyed) {
      console.warn(`[Product] ${this.productType} already destroyed`);
      return;
    }
    
    this.onDestroy();
    this.isDestroyed = true;
  }
  
  /**
   * 检查是否已初始化
   */
  isReady(): boolean {
    return this.isInitialized && !this.isDestroyed;
  }
  
  /**
   * 初始化钩子 - 子类实现
   */
  protected onInitialize(): void {
    // 默认空实现
  }
  
  /**
   * 销毁钩子 - 子类实现
   */
  protected onDestroy(): void {
    // 默认空实现
  }
}

/**
 * 简单产品工厂
 * 用于创建无需复杂配置的产品
 * 
 * @template TProduct - 产品类型
 * 
 * @example
 * const factory = new SimpleProductFactory(
 *   'logger',
 *   (options) => new ConsoleLogger(options?.level)
 * );
 * 
 * const logger = factory.create({ level: 'debug' });
 */
export class SimpleProductFactory<TProduct extends IProduct> extends AbstractFactory<TProduct> {
  private createFn: (options?: any) => TProduct;
  
  constructor(
    factoryName: string,
    productType: string,
    createFn: (options?: any) => TProduct
  ) {
    super(factoryName, productType);
    this.createFn = createFn;
  }
  
  create(options?: any): TProduct {
    this.beforeCreate(options);
    const product = this.createFn(options);
    this.afterCreate(product, options);
    return product;
  }
}

/**
 * 配置化产品工厂
 * 支持通过配置文件或对象创建产品
 * 
 * @example
 * const factory = new ConfigurableProductFactory('database', {
 *   mysql: (config) => new MySQLDatabase(config),
 *   postgres: (config) => new PostgresDatabase(config),
 *   mongodb: (config) => new MongoDB(config)
 * });
 * 
 * const db = factory.create({ type: 'mysql', host: 'localhost' });
 */
export class ConfigurableProductFactory<TProduct extends IProduct> extends AbstractFactory<TProduct> {
  private creators: Map<string, (config: any) => TProduct>;
  private defaultType?: string;
  
  constructor(
    factoryName: string,
    productType: string,
    creators: Record<string, (config: any) => TProduct>
  ) {
    super(factoryName, productType);
    this.creators = new Map(Object.entries(creators));
  }
  
  /**
   * 设置默认产品类型
   */
  setDefaultType(type: string): void {
    if (!this.creators.has(type)) {
      throw new Error(`Unknown product type: ${type}`);
    }
    this.defaultType = type;
  }
  
  /**
   * 注册新的产品创建器
   */
  registerCreator(type: string, creator: (config: any) => TProduct): void {
    this.creators.set(type, creator);
  }
  
  create(options?: { type?: string; config?: any }): TProduct {
    const type = options?.type || this.defaultType;
    
    if (!type) {
      throw new Error('No product type specified and no default type set');
    }
    
    const creator = this.creators.get(type);
    if (!creator) {
      throw new Error(`Unknown product type: ${type}. Available types: ${Array.from(this.creators.keys()).join(', ')}`);
    }
    
    this.beforeCreate(options);
    const product = creator(options?.config || {});
    this.afterCreate(product, options);
    return product;
  }
}

// ============================================
// 3. 工厂注册 (Factory Registry)
// ============================================

/**
 * 工厂注册表
 * 管理所有已注册的工厂，提供查找和创建功能
 * 
 * @example
 * const registry = new FactoryRegistry();
 * 
 * // 注册工厂
 * registry.register('button', new ButtonFactory());
 * registry.register('input', new InputFactory());
 * 
 * // 通过名称创建产品
 * const button = registry.create('button', { label: 'Click Me' });
 * 
 * // 查找工厂
 * const factory = registry.get('button');
 */
export class FactoryRegistry {
  private factories: Map<string, FactoryRegistryInfo>;
  private config: FactoryRegistryConfig;
  
  constructor(config?: FactoryRegistryConfig) {
    this.factories = new Map();
    this.config = {
      allowOverride: false,
      enableLogging: true,
      ...config
    };
  }
  
  /**
   * 注册工厂
   * @param name - 工厂名称
   * @param factory - 工厂实例
   * @param productType - 产品类型
   */
  register<TProduct extends IProduct>(
    name: string,
    factory: IFactory<TProduct>,
    productType?: string
  ): void {
    if (this.factories.has(name)) {
      if (!this.config.allowOverride) {
        throw new Error(`Factory '${name}' already registered. Set allowOverride=true to replace.`);
      }
      this.log(`Overriding factory: ${name}`);
    }
    
    const info: FactoryRegistryInfo = {
      name,
      productType: productType || 'unknown',
      factory: factory as IFactory<IProduct>,
      registeredAt: new Date()
    };
    
    this.factories.set(name, info);
    this.log(`Factory registered: ${name} (${info.productType})`);
  }
  
  /**
   * 获取工厂
   * @param name - 工厂名称
   * @returns 工厂实例
   */
  get<TProduct extends IProduct>(name: string): IFactory<TProduct> | undefined {
    const info = this.factories.get(name);
    if (!info) {
      this.log(`Factory not found: ${name}`);
      return undefined;
    }
    return info.factory as IFactory<TProduct>;
  }
  
  /**
   * 通过工厂获取产品
   * @param name - 工厂名称
   * @param options - 创建选项
   * @returns 产品实例
   */
  create<TProduct extends IProduct>(name: string, options?: any): TProduct | undefined {
    const factory = this.get<TProduct>(name);
    if (!factory) {
      this.log(`Cannot create product: factory '${name}' not found`);
      return undefined;
    }
    
    this.log(`Creating product from factory: ${name}`);
    return factory.create(options);
  }
  
  /**
   * 检查工厂是否已注册
   */
  has(name: string): boolean {
    return this.factories.has(name);
  }
  
  /**
   * 注销工厂
   */
  unregister(name: string): boolean {
    const deleted = this.factories.delete(name);
    if (deleted) {
      this.log(`Factory unregistered: ${name}`);
    }
    return deleted;
  }
  
  /**
   * 获取所有已注册的工厂名称
   */
  list(): string[] {
    return Array.from(this.factories.keys());
  }
  
  /**
   * 获取工厂信息
   */
  getInfo(name: string): FactoryRegistryInfo | undefined {
    return this.factories.get(name);
  }
  
  /**
   * 清空所有注册
   */
  clear(): void {
    this.factories.clear();
    this.log('Factory registry cleared');
  }
  
  /**
   * 日志方法
   */
  private log(message: string): void {
    if (this.config.enableLogging) {
      console.log(`[FactoryRegistry] ${message}`);
    }
  }
}

/**
 * 全局工厂注册表实例
 * 单例模式，供全局使用
 */
export const globalFactoryRegistry = new FactoryRegistry({
  allowOverride: true,
  enableLogging: false
});

// ============================================
// 便捷函数
// ============================================

/**
 * 快速注册工厂
 * 
 * @example
 * registerFactory('logger', new LoggerFactory());
 */
export function registerFactory<TProduct extends IProduct>(
  name: string,
  factory: IFactory<TProduct>,
  productType?: string
): void {
  globalFactoryRegistry.register(name, factory, productType);
}

/**
 * 快速创建产品
 * 
 * @example
 * const logger = createProduct<Logger>('logger', { level: 'debug' });
 */
export function createProduct<TProduct extends IProduct>(
  factoryName: string,
  options?: any
): TProduct | undefined {
  return globalFactoryRegistry.create<TProduct>(factoryName, options);
}

/**
 * 快速查找工厂
 * 
 * @example
 * const factory = getFactory<LoggerFactory>('logger');
 */
export function getFactory<TProduct extends IProduct>(
  name: string
): IFactory<TProduct> | undefined {
  return globalFactoryRegistry.get<TProduct>(name);
}

// ============================================
// 使用示例 (命令行执行)
// ============================================

if (require.main === module) {
  console.log('=== 工厂方法工具 - 使用示例 ===\n');
  
  // ============================================
  // 示例 1: 简单产品工厂
  // ============================================
  console.log('1️⃣ 简单产品工厂 (Simple Product Factory)');
  console.log('─'.repeat(50));
  
  // 定义产品
  class ButtonProduct extends BaseProduct {
    private label: string;
    private color: string;
    
    constructor(options: { label: string; color?: string }) {
      super('button', options);
      this.label = options.label;
      this.color = options.color || '#6366f1';
    }
    
    render(): string {
      return `<button style="background:${this.color}">${this.label}</button>`;
    }
    
    protected onInitialize(): void {
      console.log(`  [Button] Initialized: ${this.label}`);
    }
  }
  
  // 创建工厂
  const buttonFactory = new SimpleProductFactory(
    'buttonFactory',
    'button',
    (options) => new ButtonProduct(options as any)
  );
  
  // 创建产品
  const button1 = buttonFactory.create({ label: 'Click Me', color: '#10b981' });
  button1.initialize();
  console.log('  渲染结果:', button1.render());
  console.log();
  
  // ============================================
  // 示例 2: 配置化产品工厂
  // ============================================
  console.log('2️⃣ 配置化产品工厂 (Configurable Product Factory)');
  console.log('─'.repeat(50));
  
  // 定义不同类型的数据库产品
  class MySQLProduct extends BaseProduct {
    constructor(config: { host: string; port: number }) {
      super('mysql', config);
    }
    connect(): string {
      return `Connecting to MySQL at ${this.options.host}:${this.options.port}`;
    }
  }
  
  class PostgresProduct extends BaseProduct {
    constructor(config: { host: string; port: number }) {
      super('postgres', config);
    }
    connect(): string {
      return `Connecting to PostgreSQL at ${this.options.host}:${this.options.port}`;
    }
  }
  
  class MongoDBProduct extends BaseProduct {
    constructor(config: { uri: string }) {
      super('mongodb', config);
    }
    connect(): string {
      return `Connecting to MongoDB at ${this.options.uri}`;
    }
  }
  
  // 创建配置化工厂
  const dbFactory = new ConfigurableProductFactory(
    'databaseFactory',
    'database',
    {
      mysql: (config) => new MySQLProduct(config),
      postgres: (config) => new PostgresProduct(config),
      mongodb: (config) => new MongoDBProduct(config)
    }
  );
  
  // 设置默认类型
  dbFactory.setDefaultType('mysql');
  
  // 创建不同类型的数据库
  const mysqlDB = dbFactory.create({ config: { host: 'localhost', port: 3306 } });
  console.log('  MySQL:', mysqlDB.connect());
  
  const postgresDB = dbFactory.create({ type: 'postgres', config: { host: 'localhost', port: 5432 } });
  console.log('  PostgreSQL:', postgresDB.connect());
  
  const mongoDB = dbFactory.create({ type: 'mongodb', config: { uri: 'mongodb://localhost:27017' } });
  console.log('  MongoDB:', mongoDB.connect());
  console.log();
  
  // ============================================
  // 示例 3: 工厂注册表
  // ============================================
  console.log('3️⃣ 工厂注册表 (Factory Registry)');
  console.log('─'.repeat(50));
  
  // 创建注册表
  const registry = new FactoryRegistry({ enableLogging: true });
  
  // 注册多个工厂
  registry.register('button', buttonFactory, 'button');
  registry.register('database', dbFactory, 'database');
  
  // 添加一个新的日志工厂
  class LoggerProduct extends BaseProduct {
    private level: string;
    
    constructor(options: { level: string }) {
      super('logger', options);
      this.level = options.level || 'info';
    }
    
    log(message: string): void {
      console.log(`  [${this.level.toUpperCase()}] ${message}`);
    }
  }
  
  const loggerFactory = new SimpleProductFactory(
    'loggerFactory',
    'logger',
    (options) => new LoggerProduct(options as any)
  );
  
  registry.register('logger', loggerFactory, 'logger');
  
  // 列出所有工厂
  console.log('  已注册工厂:', registry.list().join(', '));
  console.log();
  
  // 通过注册表创建产品
  const button = registry.create<ButtonProduct>('button', { label: 'Submit', color: '#ef4444' });
  console.log('  从注册表创建按钮:', button?.render());
  
  const logger = registry.create<LoggerProduct>('logger', { level: 'debug' });
  logger?.initialize();
  logger?.log('Factory pattern working correctly!');
  console.log();
  
  // ============================================
  // 示例 4: 全局注册表便捷函数
  // ============================================
  console.log('4️⃣ 全局便捷函数 (Global Helper Functions)');
  console.log('─'.repeat(50));
  
  // 使用全局便捷函数
  registerFactory('globalButton', buttonFactory, 'button');
  registerFactory('globalLogger', loggerFactory, 'logger');
  
  const globalButton = createProduct<ButtonProduct>('globalButton', { 
    label: 'Global Button' 
  });
  console.log('  全局按钮:', globalButton?.render());
  
  const globalLogger = createProduct<LoggerProduct>('globalLogger', { 
    level: 'info' 
  });
  globalLogger?.log('Using global registry!');
  
  console.log('  全局工厂列表:', globalFactoryRegistry.list().join(', '));
  console.log();
  
  // ============================================
  // 示例 5: 工厂方法模式完整场景
  // ============================================
  console.log('5️⃣ 完整场景：UI 组件工厂系统');
  console.log('─'.repeat(50));
  
  // 定义 UI 组件产品
  class InputProduct extends BaseProduct {
    constructor(options: { type: string; placeholder: string }) {
      super('input', options);
    }
    render(): string {
      return `<input type="${this.options.type}" placeholder="${this.options.placeholder}" />`;
    }
  }
  
  class SelectProduct extends BaseProduct {
    constructor(options: { options: string[] }) {
      super('select', options);
    }
    render(): string {
      const opts = this.options.options.map((o: string) => `<option>${o}</option>`).join('');
      return `<select>${opts}</select>`;
    }
  }
  
  // 创建 UI 组件注册表
  const uiRegistry = new FactoryRegistry({ enableLogging: false });
  
  uiRegistry.register('input', new SimpleProductFactory('input', 'input', 
    (opts) => new InputProduct(opts as any)));
  uiRegistry.register('select', new SimpleProductFactory('select', 'select', 
    (opts) => new SelectProduct(opts as any)));
  uiRegistry.register('button', buttonFactory, 'button');
  
  // 批量创建 UI 组件
  const components = [
    uiRegistry.create<InputProduct>('input', { type: 'text', placeholder: 'Enter name' }),
    uiRegistry.create<InputProduct>('input', { type: 'email', placeholder: 'Enter email' }),
    uiRegistry.create<SelectProduct>('select', { options: ['Option 1', 'Option 2', 'Option 3'] }),
    uiRegistry.create<ButtonProduct>('button', { label: 'Submit Form', color: '#6366f1' })
  ];
  
  console.log('  渲染表单组件:');
  components.forEach((comp, i) => {
    console.log(`    ${i + 1}. ${comp?.render()}`);
  });
  console.log();
  
  // ============================================
  // 总结
  // ============================================
  console.log('✅ 所有示例执行完成!');
  console.log();
  console.log('📋 功能总结:');
  console.log('  • 工厂接口：AbstractFactory, IFactory');
  console.log('  • 产品创建：BaseProduct, SimpleProductFactory, ConfigurableProductFactory');
  console.log('  • 工厂注册：FactoryRegistry, globalFactoryRegistry');
  console.log('  • 便捷函数：registerFactory, createProduct, getFactory');
  console.log();
  console.log('💡 使用建议:');
  console.log('  • 简单场景 → SimpleProductFactory');
  console.log('  • 多类型场景 → ConfigurableProductFactory');
  console.log('  • 需要管理多个工厂 → FactoryRegistry');
  console.log('  • 快速使用 → 全局便捷函数');
}
