/**
 * Factory Pattern Skill - KAEL Engineering
 * 
 * 提供三种工厂模式实现：
 * 1. 工厂方法 (Factory Method)
 * 2. 抽象工厂 (Abstract Factory)
 * 3. 对象池 (Object Pool)
 * 
 * @author KAEL
 * @version 1.0.0
 */

// ============================================================================
// 类型定义
// ============================================================================

export interface IProduct {
  id: string;
  name: string;
  execute(): Promise<void>;
  destroy?(): void;
}

export interface IFactory<T extends IProduct> {
  create(...args: any[]): T;
}

export interface IPoolConfig {
  maxSize: number;
  minSize: number;
  acquireTimeout: number;
  validationInterval: number;
}

export interface IPooledProduct extends IProduct {
  _poolId: string;
  _lastUsed: number;
  _inUse: boolean;
}

// ============================================================================
// 1. 工厂方法模式 (Factory Method Pattern)
// ============================================================================

/**
 * 基础产品类
 */
export abstract class BaseProduct implements IProduct {
  public readonly id: string;
  public readonly name: string;
  protected createdAt: number;

  constructor(name: string) {
    this.id = this.generateId();
    this.name = name;
    this.createdAt = Date.now();
  }

  protected generateId(): string {
    return `${this.constructor.name}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  abstract execute(): Promise<void>;

  destroy?(): void {
    console.log(`[Product] ${this.name} destroyed`);
  }
}

/**
 * 具体产品实现
 */
export class DatabaseConnection extends BaseProduct {
  private connected: boolean = false;

  constructor(config: { host: string; port: number }) {
    super(`DB-${config.host}:${config.port}`);
  }

  async execute(): Promise<void> {
    console.log(`[DB] Connecting to ${this.name}...`);
    await this.sleep(100);
    this.connected = true;
    console.log(`[DB] Connected: ${this.name}`);
  }

  async disconnect(): Promise<void> {
    this.connected = false;
    console.log(`[DB] Disconnected: ${this.name}`);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export class ApiClient extends BaseProduct {
  private baseUrl: string;

  constructor(baseUrl: string) {
    super(`API-${new URL(baseUrl).host}`);
    this.baseUrl = baseUrl;
  }

  async execute(): Promise<void> {
    console.log(`[API] Initializing client for ${this.baseUrl}`);
    await this.sleep(50);
    console.log(`[API] Client ready: ${this.name}`);
  }

  async request(endpoint: string): Promise<any> {
    console.log(`[API] Request: ${endpoint}`);
    return { status: 'ok' };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export class Logger extends BaseProduct {
  private level: string;

  constructor(level: string = 'info') {
    super(`Logger-${level.toUpperCase()}`);
  }

  async execute(): Promise<void> {
    console.log(`[Logger] Initialized with level: ${this.level}`);
  }

  log(message: string): void {
    console.log(`[${this.level.toUpperCase()}] ${message}`);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * 工厂方法 - 基础接口
 */
export abstract class ProductFactory<T extends IProduct> implements IFactory<T> {
  abstract create(...args: any[]): T;

  /**
   * 创建并初始化产品
   */
  async createAndInitialize(...args: any[]): Promise<T> {
    const product = this.create(...args);
    await product.execute();
    return product;
  }
}

/**
 * 具体工厂实现
 */
export class DatabaseFactory extends ProductFactory<DatabaseConnection> {
  create(host: string, port: number = 5432): DatabaseConnection {
    console.log(`[Factory] Creating database connection: ${host}:${port}`);
    return new DatabaseConnection({ host, port });
  }
}

export class ApiClientFactory extends ProductFactory<ApiClient> {
  create(baseUrl: string): ApiClient {
    console.log(`[Factory] Creating API client: ${baseUrl}`);
    return new ApiClient(baseUrl);
  }
}

export class LoggerFactory extends ProductFactory<Logger> {
  create(level: string = 'info'): Logger {
    console.log(`[Factory] Creating logger: ${level}`);
    return new Logger(level);
  }
}

/**
 * 工厂注册表 - 集中管理所有工厂
 */
export class FactoryRegistry {
  private static instance: FactoryRegistry;
  private factories: Map<string, IFactory<any>> = new Map();

  private constructor() {}

  static getInstance(): FactoryRegistry {
    if (!FactoryRegistry.instance) {
      FactoryRegistry.instance = new FactoryRegistry();
    }
    return FactoryRegistry.instance;
  }

  register<T extends IProduct>(name: string, factory: IFactory<T>): void {
    this.factories.set(name, factory);
    console.log(`[Registry] Factory registered: ${name}`);
  }

  getFactory<T extends IProduct>(name: string): IFactory<T> | undefined {
    const factory = this.factories.get(name);
    if (!factory) {
      throw new Error(`Factory not found: ${name}`);
    }
    return factory as IFactory<T>;
  }

  hasFactory(name: string): boolean {
    return this.factories.has(name);
  }

  listFactories(): string[] {
    return Array.from(this.factories.keys());
  }
}

// ============================================================================
// 2. 抽象工厂模式 (Abstract Factory Pattern)
// ============================================================================

/**
 * 产品族接口定义
 */
export interface IDatabaseProduct {
  connect(): Promise<void>;
  query(sql: string): Promise<any>;
  disconnect(): Promise<void>;
}

export interface ICacheProduct {
  get(key: string): Promise<any>;
  set(key: string, value: any, ttl?: number): Promise<void>;
  delete(key: string): Promise<void>;
}

export interface IMessagingProduct {
  publish(topic: string, message: any): Promise<void>;
  subscribe(topic: string, callback: (msg: any) => void): Promise<void>;
  unsubscribe(topic: string): Promise<void>;
}

/**
 * 抽象工厂接口
 */
export interface IInfrastructureFactory {
  createDatabase(): IDatabaseProduct;
  createCache(): ICacheProduct;
  createMessaging(): IMessagingProduct;
  getName(): string;
}

/**
 * PostgreSQL 产品族实现
 */
export class PostgresDatabase implements IDatabaseProduct {
  async connect(): Promise<void> {
    console.log('[Postgres] Connecting to database...');
    await this.sleep(100);
    console.log('[Postgres] Connected');
  }

  async query(sql: string): Promise<any> {
    console.log(`[Postgres] Executing: ${sql}`);
    return { rows: [], rowCount: 0 };
  }

  async disconnect(): Promise<void> {
    console.log('[Postgres] Disconnected');
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export class RedisCache implements ICacheProduct {
  async get(key: string): Promise<any> {
    console.log(`[Redis] GET ${key}`);
    return null;
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    console.log(`[Redis] SET ${key} (TTL: ${ttl || 'none'})`);
  }

  async delete(key: string): Promise<void> {
    console.log(`[Redis] DELETE ${key}`);
  }
}

export class KafkaMessaging implements IMessagingProduct {
  async publish(topic: string, message: any): Promise<void> {
    console.log(`[Kafka] Publishing to ${topic}: ${JSON.stringify(message)}`);
  }

  async subscribe(topic: string, callback: (msg: any) => void): Promise<void> {
    console.log(`[Kafka] Subscribed to ${topic}`);
  }

  async unsubscribe(topic: string): Promise<void> {
    console.log(`[Kafka] Unsubscribed from ${topic}`);
  }
}

/**
 * MongoDB 产品族实现
 */
export class MongoDatabase implements IDatabaseProduct {
  async connect(): Promise<void> {
    console.log('[MongoDB] Connecting to database...');
    await this.sleep(100);
    console.log('[MongoDB] Connected');
  }

  async query(sql: string): Promise<any> {
    console.log(`[MongoDB] Executing: ${sql}`);
    return { documents: [], count: 0 };
  }

  async disconnect(): Promise<void> {
    console.log('[MongoDB] Disconnected');
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export class MemoryCache implements ICacheProduct {
  private store: Map<string, { value: any; expiry?: number }> = new Map();

  async get(key: string): Promise<any> {
    const item = this.store.get(key);
    if (!item || (item.expiry && item.expiry < Date.now())) {
      return null;
    }
    console.log(`[Memory] GET ${key}`);
    return item.value;
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    const expiry = ttl ? Date.now() + ttl : undefined;
    this.store.set(key, { value, expiry });
    console.log(`[Memory] SET ${key} (TTL: ${ttl || 'none'})`);
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
    console.log(`[Memory] DELETE ${key}`);
  }
}

export class RabbitMQMessaging implements IMessagingProduct {
  async publish(topic: string, message: any): Promise<void> {
    console.log(`[RabbitMQ] Publishing to ${topic}: ${JSON.stringify(message)}`);
  }

  async subscribe(topic: string, callback: (msg: any) => void): Promise<void> {
    console.log(`[RabbitMQ] Subscribed to ${topic}`);
  }

  async unsubscribe(topic: string): Promise<void> {
    console.log(`[RabbitMQ] Unsubscribed from ${topic}`);
  }
}

/**
 * 具体抽象工厂实现
 */
export class PostgresFactory implements IInfrastructureFactory {
  getName(): string {
    return 'PostgreSQL Stack';
  }

  createDatabase(): IDatabaseProduct {
    console.log('[AbstractFactory] Creating PostgreSQL database...');
    return new PostgresDatabase();
  }

  createCache(): ICacheProduct {
    console.log('[AbstractFactory] Creating Redis cache...');
    return new RedisCache();
  }

  createMessaging(): IMessagingProduct {
    console.log('[AbstractFactory] Creating Kafka messaging...');
    return new KafkaMessaging();
  }
}

export class MongoFactory implements IInfrastructureFactory {
  getName(): string {
    return 'MongoDB Stack';
  }

  createDatabase(): IDatabaseProduct {
    console.log('[AbstractFactory] Creating MongoDB database...');
    return new MongoDatabase();
  }

  createCache(): ICacheProduct {
    console.log('[AbstractFactory] Creating Memory cache...');
    return new MemoryCache();
  }

  createMessaging(): IMessagingProduct {
    console.log('[AbstractFactory] Creating RabbitMQ messaging...');
    return new RabbitMQMessaging();
  }
}

/**
 * 抽象工厂管理器
 */
export class InfrastructureFactoryManager {
  private static instance: InfrastructureFactoryManager;
  private factories: Map<string, IInfrastructureFactory> = new Map();
  private currentFactory: string | null = null;

  private constructor() {}

  static getInstance(): InfrastructureFactoryManager {
    if (!InfrastructureFactoryManager.instance) {
      InfrastructureFactoryManager.instance = new InfrastructureFactoryManager();
    }
    return InfrastructureFactoryManager.instance;
  }

  register(name: string, factory: IInfrastructureFactory): void {
    this.factories.set(name, factory);
    console.log(`[Manager] Infrastructure factory registered: ${name}`);
  }

  use(name: string): void {
    if (!this.factories.has(name)) {
      throw new Error(`Infrastructure factory not found: ${name}`);
    }
    this.currentFactory = name;
    console.log(`[Manager] Using infrastructure: ${name}`);
  }

  getCurrentFactory(): IInfrastructureFactory {
    if (!this.currentFactory) {
      throw new Error('No infrastructure factory selected');
    }
    const factory = this.factories.get(this.currentFactory);
    if (!factory) {
      throw new Error(`Infrastructure factory not found: ${this.currentFactory}`);
    }
    return factory;
  }

  createInfrastructure(): {
    database: IDatabaseProduct;
    cache: ICacheProduct;
    messaging: IMessagingProduct;
  } {
    const factory = this.getCurrentFactory();
    console.log(`[Manager] Creating full infrastructure stack: ${factory.getName()}`);
    
    return {
      database: factory.createDatabase(),
      cache: factory.createCache(),
      messaging: factory.createMessaging(),
    };
  }

  listFactories(): string[] {
    return Array.from(this.factories.keys());
  }
}

// ============================================================================
// 3. 对象池模式 (Object Pool Pattern)
// ============================================================================

/**
 * 对象池实现
 */
export class ObjectPool<T extends IPooledProduct> {
  private pool: T[] = [];
  private available: Set<T> = new Set();
  private config: IPoolConfig;
  private factory: () => Promise<T>;
  private validationInterval: NodeJS.Timeout | null = null;
  private isClosed: boolean = false;

  constructor(
    factory: () => Promise<T>,
    config: Partial<IPoolConfig> = {}
  ) {
    this.factory = factory;
    this.config = {
      maxSize: config.maxSize || 10,
      minSize: config.minSize || 2,
      acquireTimeout: config.acquireTimeout || 5000,
      validationInterval: config.validationInterval || 30000,
    };

    console.log(`[Pool] Created with config:`, this.config);
  }

  /**
   * 初始化对象池
   */
  async initialize(): Promise<void> {
    console.log(`[Pool] Initializing with minSize: ${this.config.minSize}`);
    
    const initPromises: Promise<T>[] = [];
    for (let i = 0; i < this.config.minSize; i++) {
      initPromises.push(this.createObject());
    }
    
    const objects = await Promise.all(initPromises);
    objects.forEach(obj => this.available.add(obj));
    this.pool.push(...objects);
    
    console.log(`[Pool] Initialized with ${objects.length} objects`);
    
    // 启动定期验证
    this.startValidation();
  }

  /**
   * 创建新对象
   */
  private async createObject(): Promise<T> {
    const obj = await this.factory();
    obj._poolId = `pool-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    obj._lastUsed = Date.now();
    obj._inUse = false;
    console.log(`[Pool] Created object: ${obj._poolId}`);
    return obj;
  }

  /**
   * 获取对象
   */
  async acquire(): Promise<T> {
    if (this.isClosed) {
      throw new Error('Pool is closed');
    }

    // 尝试从可用对象中获取
    for (const obj of this.available) {
      if (this.validate(obj)) {
        this.available.delete(obj);
        obj._inUse = true;
        obj._lastUsed = Date.now();
        console.log(`[Pool] Acquired object: ${obj._poolId}`);
        return obj;
      } else {
        // 对象无效，移除并创建新的
        this.available.delete(obj);
        this.pool = this.pool.filter(o => o !== obj);
        obj.destroy?.();
      }
    }

    // 池中没有可用对象，尝试创建新的
    if (this.pool.length < this.config.maxSize) {
      const newObj = await this.createObject();
      newObj._inUse = true;
      this.pool.push(newObj);
      console.log(`[Pool] Created and acquired new object: ${newObj._poolId}`);
      return newObj;
    }

    // 池已满，等待
    console.log('[Pool] Pool exhausted, waiting...');
    return this.waitForAvailable();
  }

  /**
   * 等待可用对象
   */
  private async waitForAvailable(): Promise<T> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < this.config.acquireTimeout) {
      await this.sleep(100);
      
      for (const obj of this.available) {
        if (this.validate(obj)) {
          this.available.delete(obj);
          obj._inUse = true;
          obj._lastUsed = Date.now();
          return obj;
        }
      }
    }
    
    throw new Error('Timeout waiting for available object');
  }

  /**
   * 释放对象回池
   */
  release(obj: T): void {
    if (!this.pool.includes(obj)) {
      console.warn(`[Pool] Attempted to release unknown object: ${obj._poolId}`);
      return;
    }

    if (this.validate(obj)) {
      obj._inUse = false;
      obj._lastUsed = Date.now();
      this.available.add(obj);
      console.log(`[Pool] Released object: ${obj._poolId}`);
    } else {
      // 对象无效，移除并创建新的
      this.pool = this.pool.filter(o => o !== obj);
      obj.destroy?.();
      console.log(`[Pool] Removed invalid object: ${obj._poolId}`);
      
      // 补充池大小
      if (this.pool.length < this.config.minSize) {
        this.createObject().then(newObj => {
          this.pool.push(newObj);
          this.available.add(newObj);
        });
      }
    }
  }

  /**
   * 验证对象是否有效
   */
  private validate(obj: T): boolean {
    // 基本验证：对象存在且未在使用中
    if (!obj || obj._inUse) {
      return false;
    }

    // 可以添加自定义验证逻辑
    // 例如：检查数据库连接是否仍然有效
    return true;
  }

  /**
   * 启动定期验证
   */
  private startValidation(): void {
    if (this.validationInterval) {
      clearInterval(this.validationInterval);
    }

    this.validationInterval = setInterval(() => {
      if (this.isClosed) {
        this.stopValidation();
        return;
      }

      console.log('[Pool] Running validation...');
      const invalidObjects: T[] = [];

      for (const obj of this.pool) {
        if (!this.validate(obj)) {
          invalidObjects.push(obj);
        }
      }

      invalidObjects.forEach(obj => {
        this.pool = this.pool.filter(o => o !== obj);
        this.available.delete(obj);
        obj.destroy?.();
        console.log(`[Pool] Removed invalid object during validation: ${obj._poolId}`);
      });

      // 补充最小池大小
      while (this.pool.length < this.config.minSize) {
        this.createObject().then(newObj => {
          if (!this.isClosed) {
            this.pool.push(newObj);
            this.available.add(newObj);
          }
        });
      }
    }, this.config.validationInterval);

    console.log(`[Pool] Validation started (interval: ${this.config.validationInterval}ms)`);
  }

  /**
   * 停止定期验证
   */
  private stopValidation(): void {
    if (this.validationInterval) {
      clearInterval(this.validationInterval);
      this.validationInterval = null;
      console.log('[Pool] Validation stopped');
    }
  }

  /**
   * 获取池状态
   */
  getStatus(): {
    total: number;
    available: number;
    inUse: number;
    maxSize: number;
    minSize: number;
  } {
    const inUse = this.pool.filter(obj => obj._inUse).length;
    return {
      total: this.pool.length,
      available: this.available.size,
      inUse,
      maxSize: this.config.maxSize,
      minSize: this.config.minSize,
    };
  }

  /**
   * 关闭对象池
   */
  async close(): Promise<void> {
    console.log('[Pool] Closing pool...');
    this.isClosed = true;
    this.stopValidation();

    const destroyPromises = this.pool.map(obj => {
      obj.destroy?.();
      return Promise.resolve();
    });

    await Promise.all(destroyPromises);
    this.pool = [];
    this.available.clear();

    console.log('[Pool] Pool closed');
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * 可池化对象工厂
 */
export class PooledConnectionFactory {
  private static dbPool: ObjectPool<DatabaseConnection & IPooledProduct> | null = null;

  static async getDatabasePool(config: {
    host: string;
    port: number;
    poolSize?: number;
  }): Promise<ObjectPool<DatabaseConnection & IPooledProduct>> {
    if (!this.dbPool) {
      this.dbPool = new ObjectPool<DatabaseConnection & IPooledProduct>(
        async () => {
          const conn = new DatabaseConnection({ host: config.host, port: config.port });
          await conn.execute();
          return conn as DatabaseConnection & IPooledProduct;
        },
        {
          maxSize: config.poolSize || 10,
          minSize: 2,
          acquireTimeout: 5000,
          validationInterval: 30000,
        }
      );

      await this.dbPool.initialize();
    }

    return this.dbPool;
  }

  static async closeDatabasePool(): Promise<void> {
    if (this.dbPool) {
      await this.dbPool.close();
      this.dbPool = null;
    }
  }
}

// ============================================================================
// 使用示例
// ============================================================================

/**
 * 示例 1: 工厂方法模式
 */
export async function exampleFactoryMethod(): Promise<void> {
  console.log('\n========== 工厂方法模式示例 ==========\n');

  // 创建具体工厂
  const dbFactory = new DatabaseFactory();
  const apiFactory = new ApiClientFactory();
  const loggerFactory = new LoggerFactory();

  // 使用工厂创建产品
  const db = await dbFactory.createAndInitialize('localhost', 5432);
  const api = await apiFactory.createAndInitialize('https://api.example.com');
  const logger = await loggerFactory.createAndInitialize('debug');

  // 使用产品
  logger.log('Application started');
  await api.request('/users');
  await db.disconnect();

  // 使用工厂注册表
  const registry = FactoryRegistry.getInstance();
  registry.register('database', dbFactory);
  registry.register('api', apiFactory);
  registry.register('logger', loggerFactory);

  console.log('\nRegistered factories:', registry.listFactories());

  // 从注册表获取工厂并创建产品
  const dbFactoryFromRegistry = registry.getFactory<DatabaseConnection>('database');
  const db2 = await dbFactoryFromRegistry.createAndInitialize('192.168.1.100', 3306);
  await db2.disconnect();
}

/**
 * 示例 2: 抽象工厂模式
 */
export async function exampleAbstractFactory(): Promise<void> {
  console.log('\n========== 抽象工厂模式示例 ==========\n');

  const manager = InfrastructureFactoryManager.getInstance();

  // 注册基础设施工厂
  manager.register('postgres', new PostgresFactory());
  manager.register('mongo', new MongoFactory());

  console.log('\nAvailable infrastructure stacks:', manager.listFactories());

  // 使用 PostgreSQL 技术栈
  manager.use('postgres');
  const postgresStack = manager.createInfrastructure();
  
  await postgresStack.database.connect();
  await postgresStack.database.query('SELECT * FROM users');
  await postgresStack.cache.set('user:1', { name: 'John' }, 3600);
  await postgresStack.messaging.publish('events', { type: 'user.created' });
  await postgresStack.database.disconnect();

  // 切换到 MongoDB 技术栈
  manager.use('mongo');
  const mongoStack = manager.createInfrastructure();
  
  await mongoStack.database.connect();
  await mongoStack.database.query('{ name: "John" }');
  await mongoStack.cache.set('user:1', { name: 'John' }, 3600);
  await mongoStack.messaging.publish('events', { type: 'user.created' });
  await mongoStack.database.disconnect();
}

/**
 * 示例 3: 对象池模式
 */
export async function exampleObjectPool(): Promise<void> {
  console.log('\n========== 对象池模式示例 ==========\n');

  // 创建数据库连接池
  const pool = new ObjectPool<DatabaseConnection & IPooledProduct>(
    async () => {
      const conn = new DatabaseConnection({ host: 'localhost', port: 5432 });
      await conn.execute();
      return conn as DatabaseConnection & IPooledProduct;
    },
    {
      maxSize: 5,
      minSize: 2,
      acquireTimeout: 5000,
      validationInterval: 10000,
    }
  );

  await pool.initialize();
  console.log('\nPool status:', pool.getStatus());

  // 并发获取连接
  const tasks: Promise<void>[] = [];
  
  for (let i = 0; i < 5; i++) {
    tasks.push((async (taskId: number) => {
      const conn = await pool.acquire();
      console.log(`[Task ${taskId}] Using connection: ${conn._poolId}`);
      
      // 模拟数据库操作
      await conn.execute();
      await new Promise(resolve => setTimeout(resolve, 200));
      
      pool.release(conn);
      console.log(`[Task ${taskId}] Released connection`);
    })(i));
  }

  await Promise.all(tasks);
  console.log('\nFinal pool status:', pool.getStatus());

  // 关闭池
  await pool.close();
}

/**
 * 示例 4: 综合使用所有模式
 */
export async function exampleCombined(): Promise<void> {
  console.log('\n========== 综合示例 ==========\n');

  // 1. 使用抽象工厂创建基础设施
  const manager = InfrastructureFactoryManager.getInstance();
  manager.register('production', new PostgresFactory());
  manager.use('production');
  
  const infra = manager.createInfrastructure();
  await infra.database.connect();

  // 2. 使用对象池管理数据库连接
  const connectionPool = new ObjectPool<DatabaseConnection & IPooledProduct>(
    async () => {
      const conn = new DatabaseConnection({ host: 'localhost', port: 5432 });
      await conn.execute();
      return conn as DatabaseConnection & IPooledProduct;
    },
    { maxSize: 10, minSize: 3 }
  );
  
  await connectionPool.initialize();

  // 3. 使用工厂方法创建其他组件
  const loggerFactory = new LoggerFactory();
  const logger = await loggerFactory.createAndInitialize('info');

  // 4. 注册到工厂注册表
  const registry = FactoryRegistry.getInstance();
  registry.register('connection-pool', {
    create: () => connectionPool,
  });

  logger.log('System initialized with all factory patterns');
  console.log('Pool status:', connectionPool.getStatus());

  // 清理
  await connectionPool.close();
  await infra.database.disconnect();
}

// ============================================================================
// 导出
// ============================================================================

export default {
  // 工厂方法
  BaseProduct,
  DatabaseConnection,
  ApiClient,
  Logger,
  ProductFactory,
  DatabaseFactory,
  ApiClientFactory,
  LoggerFactory,
  FactoryRegistry,
  
  // 抽象工厂
  PostgresFactory,
  MongoFactory,
  InfrastructureFactoryManager,
  
  // 对象池
  ObjectPool,
  PooledConnectionFactory,
  
  // 示例
  exampleFactoryMethod,
  exampleAbstractFactory,
  exampleObjectPool,
  exampleCombined,
};
