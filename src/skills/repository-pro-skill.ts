/**
 * 专业仓储模式技能 - Repository Pro Skill
 * 
 * 功能:
 * 1. 仓储定义 - 泛型仓储接口与实现
 * 2. 数据持久化 - 支持多种存储后端 (Memory/FileSystem/Database)
 * 3. 查询构建器 - 链式查询构建与执行
 * 
 * @author Axon (KAEL Engineering)
 * @version 1.0.0
 */

// ============== 类型定义 ==============

/**
 * 实体基类 - 所有仓储实体必须继承
 */
export interface BaseEntity {
  /** 唯一标识符 */
  id: string;
  /** 创建时间 */
  createdAt: number;
  /** 更新时间 */
  updatedAt: number;
}

/**
 * 仓储接口 - 泛型定义
 */
export interface IRepository<T extends BaseEntity, K = string> {
  /**
   * 根据 ID 查找实体
   */
  findById(id: K): Promise<T | null>;

  /**
   * 查找所有实体
   */
  findAll(): Promise<T[]>;

  /**
   * 根据条件查找
   */
  findWhere(condition: Partial<T>): Promise<T[]>;

  /**
   * 查找单个 (第一个匹配)
   */
  findOne(condition: Partial<T>): Promise<T | null>;

  /**
   * 创建实体
   */
  create(data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<T>;

  /**
   * 更新实体
   */
  update(id: K, data: Partial<T>): Promise<T | null>;

  /**
   * 删除实体
   */
  delete(id: K): Promise<boolean>;

  /**
   * 是否存在
   */
  exists(id: K): Promise<boolean>;

  /**
   * 计数
   */
  count(): Promise<number>;

  /**
   * 清空仓储
   */
  clear(): Promise<void>;
}

/**
 * 查询构建器接口
 */
export interface IQueryBuilder<T extends BaseEntity> {
  /**
   * WHERE 条件
   */
  where(condition: Partial<T>): this;

  /**
   * ORDER BY 排序
   */
  orderBy<K extends keyof T>(field: K, direction?: 'asc' | 'desc'): this;

  /**
   * LIMIT 限制
   */
  limit(count: number): this;

  /**
   * OFFSET 偏移
   */
  offset(count: number): this;

  /**
   * 执行查询并返回所有结果
   */
  execute(): Promise<T[]>;

  /**
   * 执行查询并返回单个结果
   */
  executeOne(): Promise<T | null>;

  /**
   * 计数
   */
  count(): Promise<number>;
}

/**
 * 存储后端类型
 */
export type StorageBackend = 'memory' | 'filesystem' | 'database';

/**
 * 仓储配置
 */
export interface RepositoryConfig {
  /** 存储后端类型 */
  backend?: StorageBackend;
  /** 文件系统路径 (仅 filesystem 后端) */
  dataPath?: string;
  /** 是否启用索引 */
  enableIndex?: boolean;
  /** 索引字段 */
  indexFields?: string[];
  /** 是否启用缓存 */
  enableCache?: boolean;
  /** 缓存 TTL (毫秒) */
  cacheTTL?: number;
  /** 是否启用日志 */
  enableLogging?: boolean;
}

/**
 * 索引定义
 */
export interface IndexDefinition {
  /** 字段名 */
  field: string;
  /** 索引类型 */
  type: 'hash' | 'tree' | 'fulltext';
  /** 是否唯一 */
  unique?: boolean;
}

// ============== 查询构建器实现 ==============

/**
 * 查询构建器类 - 链式查询构建
 */
export class QueryBuilder<T extends BaseEntity> implements IQueryBuilder<T> {
  private repository: BaseRepository<T, any>;
  private conditions: Partial<T> = {};
  private orderField?: keyof T;
  private orderDirection: 'asc' | 'desc' = 'asc';
  private limitCount?: number;
  private offsetCount: number = 0;

  constructor(repository: BaseRepository<T, any>) {
    this.repository = repository;
  }

  where(condition: Partial<T>): this {
    this.conditions = { ...this.conditions, ...condition };
    return this;
  }

  orderBy<K extends keyof T>(field: K, direction: 'asc' | 'desc' = 'asc'): this {
    this.orderField = field;
    this.orderDirection = direction;
    return this;
  }

  limit(count: number): this {
    this.limitCount = count;
    return this;
  }

  offset(count: number): this {
    this.offsetCount = count;
    return this;
  }

  async execute(): Promise<T[]> {
    return this.repository.queryExecute({
      conditions: this.conditions,
      orderBy: this.orderField ? { field: this.orderField, direction: this.orderDirection } : undefined,
      limit: this.limitCount,
      offset: this.offsetCount,
    });
  }

  async executeOne(): Promise<T | null> {
    const results = await this.limit(1).execute();
    return results.length > 0 ? results[0] : null;
  }

  async count(): Promise<number> {
    return this.repository.countWhere(this.conditions);
  }
}

// ============== 仓储基类实现 ==============

/**
 * 仓储基类 - 提供通用实现
 */
export abstract class BaseRepository<T extends BaseEntity, K = string> implements IRepository<T, K> {
  protected config: Required<RepositoryConfig>;
  protected cache: Map<K, T> = new Map();
  protected indexes: Map<string, Map<any, K[]>> = new Map();
  protected eventListeners: Map<string, ((entity: T) => void)[]> = new Map();

  constructor(config: RepositoryConfig = {}) {
    this.config = {
      backend: config.backend ?? 'memory',
      dataPath: config.dataPath ?? './data',
      enableIndex: config.enableIndex ?? false,
      indexFields: config.indexFields ?? [],
      enableCache: config.enableCache ?? true,
      cacheTTL: config.cacheTTL ?? 60000,
      enableLogging: config.enableLogging ?? false,
    };

    this.initialize();
  }

  /**
   * 初始化仓储
   */
  protected abstract initialize(): Promise<void>;

  /**
   * 持久化数据
   */
  protected abstract persist(data: Map<K, T>): Promise<void>;

  /**
   * 加载数据
   */
  protected abstract load(): Promise<Map<K, T>>;

  /**
   * 生成唯一 ID
   */
  protected generateId(): K {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}` as K;
  }

  /**
   * 日志输出
   */
  protected log(message: string, data?: any): void {
    if (this.config.enableLogging) {
      console.log(`[Repository] ${message}`, data ? data : '');
    }
  }

  /**
   * 更新索引
   */
  protected updateIndexes(entity: T, operation: 'add' | 'remove'): void {
    if (!this.config.enableIndex) return;

    this.config.indexFields.forEach(field => {
      const index = this.indexes.get(field) || new Map();
      const value = (entity as any)[field];

      if (operation === 'add') {
        const ids = index.get(value) || [];
        ids.push(entity.id as K);
        index.set(value, ids);
      } else {
        const ids = index.get(value) || [];
        index.set(value, ids.filter((id: K) => id !== entity.id));
      }

      this.indexes.set(field, index);
    });
  }

  /**
   * 触发事件
   */
  protected emitEvent(event: string, entity: T): void {
    const listeners = this.eventListeners.get(event) || [];
    listeners.forEach(listener => listener(entity));
  }

  // ============== 核心方法实现 ==============

  async findById(id: K): Promise<T | null> {
    this.log('findById', { id });

    // 检查缓存
    if (this.config.enableCache && this.cache.has(id)) {
      return this.cache.get(id) || null;
    }

    const data = await this.load();
    const entity = data.get(id) || null;

    if (entity && this.config.enableCache) {
      this.cache.set(id, entity);
    }

    return entity;
  }

  async findAll(): Promise<T[]> {
    this.log('findAll');
    const data = await this.load();
    return Array.from(data.values());
  }

  async findWhere(condition: Partial<T>): Promise<T[]> {
    this.log('findWhere', { condition });
    const data = await this.load();
    
    return Array.from(data.values()).filter(entity => {
      return Object.entries(condition).every(([key, value]) => {
        return (entity as any)[key] === value;
      });
    });
  }

  async findOne(condition: Partial<T>): Promise<T | null> {
    this.log('findOne', { condition });
    const results = await this.findWhere(condition);
    return results.length > 0 ? results[0] : null;
  }

  async create(data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<T> {
    const now = Date.now();
    const entity = {
      ...data,
      id: this.generateId(),
      createdAt: now,
      updatedAt: now,
    } as unknown as T;

    this.log('create', { id: entity.id });

    const storage = await this.load();
    storage.set(entity.id as K, entity);
    await this.persist(storage);

    if (this.config.enableCache) {
      this.cache.set(entity.id as K, entity);
    }

    this.updateIndexes(entity, 'add');
    this.emitEvent('create', entity);

    return entity;
  }

  async update(id: K, data: Partial<T>): Promise<T | null> {
    this.log('update', { id, data });

    const storage = await this.load();
    const existing = storage.get(id);

    if (!existing) {
      return null;
    }

    const updated = {
      ...existing,
      ...data,
      updatedAt: Date.now(),
    } as T;

    storage.set(id, updated);
    await this.persist(storage);

    if (this.config.enableCache) {
      this.cache.set(id, updated);
    }

    this.updateIndexes(existing, 'remove');
    this.updateIndexes(updated, 'add');
    this.emitEvent('update', updated);

    return updated;
  }

  async delete(id: K): Promise<boolean> {
    this.log('delete', { id });

    const storage = await this.load();
    const entity = storage.get(id);

    if (!entity) {
      return false;
    }

    storage.delete(id);
    await this.persist(storage);

    if (this.config.enableCache) {
      this.cache.delete(id);
    }

    this.updateIndexes(entity, 'remove');
    this.emitEvent('delete', entity);

    return true;
  }

  async exists(id: K): Promise<boolean> {
    const entity = await this.findById(id);
    return entity !== null;
  }

  async count(): Promise<number> {
    const data = await this.load();
    return data.size;
  }

  async countWhere(condition: Partial<T>): Promise<number> {
    const results = await this.findWhere(condition);
    return results.length;
  }

  async clear(): Promise<void> {
    this.log('clear');
    const empty = new Map<K, T>();
    await this.persist(empty);
    this.cache.clear();
    this.indexes.clear();
  }

  /**
   * 创建查询构建器
   */
  query(): QueryBuilder<T> {
    return new QueryBuilder<T>(this);
  }

  /**
   * 执行查询 (供 QueryBuilder 使用)
   */
  async queryExecute(options: {
    conditions: Partial<T>;
    orderBy?: { field: keyof T; direction: 'asc' | 'desc' };
    limit?: number;
    offset?: number;
  }): Promise<T[]> {
    let results = await this.findWhere(options.conditions);

    // 排序
    if (options.orderBy) {
      results.sort((a, b) => {
        const aVal = a[options.orderBy!.field];
        const bVal = b[options.orderBy!.field];
        const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
        return options.orderBy!.direction === 'asc' ? cmp : -cmp;
      });
    }

    // 偏移
    if (options.offset) {
      results = results.slice(options.offset);
    }

    // 限制
    if (options.limit) {
      results = results.slice(0, options.limit);
    }

    return results;
  }

  /**
   * 注册事件监听器
   */
  on(event: 'create' | 'update' | 'delete', listener: (entity: T) => void): void {
    const listeners = this.eventListeners.get(event) || [];
    listeners.push(listener);
    this.eventListeners.set(event, listeners);
  }

  /**
   * 移除事件监听器
   */
  off(event: 'create' | 'update' | 'delete', listener: (entity: T) => void): void {
    const listeners = this.eventListeners.get(event) || [];
    this.eventListeners.set(event, listeners.filter(l => l !== listener));
  }
}

// ============== 内存仓储实现 ==============

/**
 * 内存仓储 - 适用于测试和临时数据
 */
export class MemoryRepository<T extends BaseEntity, K = string> extends BaseRepository<T, K> {
  private memoryData: Map<K, T> = new Map();

  protected async initialize(): Promise<void> {
    this.log('MemoryRepository initialized');
  }

  protected async persist(data: Map<K, T>): Promise<void> {
    this.memoryData = new Map(data);
  }

  protected async load(): Promise<Map<K, T>> {
    return new Map(this.memoryData);
  }

  /**
   * 手动设置数据 (用于测试)
   */
  setTestData(data: T[]): void {
    data.forEach(item => {
      this.memoryData.set(item.id as K, item);
    });
  }
}

// ============== 文件系统仓储实现 ==============

import * as fs from 'fs';
import * as path from 'path';

/**
 * 文件系统仓储 - 数据持久化到 JSON 文件
 */
export class FileSystemRepository<T extends BaseEntity, K = string> extends BaseRepository<T, K> {
  private filePath: string;

  constructor(entityName: string, config: RepositoryConfig = {}) {
    super(config);
    this.filePath = path.join(config.dataPath || './data', `${entityName}.json`);
    
    // 确保目录存在
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  protected async initialize(): Promise<void> {
    this.log('FileSystemRepository initialized', { path: this.filePath });
  }

  protected async persist(data: Map<K, T>): Promise<void> {
    const jsonData = JSON.stringify(Array.from(data.entries()), null, 2);
    fs.writeFileSync(this.filePath, jsonData, 'utf-8');
    this.log('Data persisted to file');
  }

  protected async load(): Promise<Map<K, T>> {
    if (!fs.existsSync(this.filePath)) {
      return new Map<K, T>();
    }

    try {
      const content = fs.readFileSync(this.filePath, 'utf-8');
      const entries = JSON.parse(content) as [K, T][];
      return new Map(entries);
    } catch (error) {
      this.log('Failed to load data', { error });
      return new Map<K, T>();
    }
  }
}

// ============== 使用示例 ==============

/**
 * 示例实体 - User
 */
export interface User extends BaseEntity {
  username: string;
  email: string;
  age: number;
  role: 'admin' | 'user' | 'guest';
  isActive: boolean;
}

/**
 * 示例：仓储使用
 */
export async function repositoryExamples(): Promise<void> {
  console.log('=== Repository Pro Skill Examples ===\n');

  // 1. 创建内存仓储
  const userRepository = new MemoryRepository<User>();

  // 2. 注册事件监听器
  userRepository.on('create', (user) => {
    console.log(`[Event] User created: ${user.username}`);
  });

  userRepository.on('update', (user) => {
    console.log(`[Event] User updated: ${user.username}`);
  });

  // 3. 创建用户
  console.log('1. 创建用户:');
  const user1 = await userRepository.create({
    username: 'alice',
    email: 'alice@example.com',
    age: 25,
    role: 'admin',
    isActive: true,
  });
  console.log(`   Created: ${user1.username} (ID: ${user1.id})\n`);

  const user2 = await userRepository.create({
    username: 'bob',
    email: 'bob@example.com',
    age: 30,
    role: 'user',
    isActive: true,
  });
  console.log(`   Created: ${user2.username} (ID: ${user2.id})\n`);

  const user3 = await userRepository.create({
    username: 'charlie',
    email: 'charlie@example.com',
    age: 28,
    role: 'user',
    isActive: false,
  });
  console.log(`   Created: ${user3.username} (ID: ${user3.id})\n`);

  // 4. 查询构建器 - 链式查询
  console.log('2. 查询构建器示例:');
  
  const activeUsers = await userRepository.query()
    .where({ isActive: true })
    .orderBy('age', 'desc')
    .limit(10)
    .execute();
  console.log(`   Active users: ${activeUsers.map(u => u.username).join(', ')}\n`);

  const adminUser = await userRepository.query()
    .where({ role: 'admin' })
    .executeOne();
  console.log(`   Admin user: ${adminUser?.username}\n`);

  const count = await userRepository.query()
    .where({ role: 'user' })
    .count();
  console.log(`   User count: ${count}\n`);

  // 5. 更新用户
  console.log('3. 更新用户:');
  const updated = await userRepository.update(user2.id as string, {
    age: 31,
    role: 'admin',
  });
  console.log(`   Updated ${updated?.username}: age=${updated?.age}, role=${updated?.role}\n`);

  // 6. 删除用户
  console.log('4. 删除用户:');
  const deleted = await userRepository.delete(user3.id as string);
  console.log(`   Deleted: ${deleted}\n`);

  // 7. 查找所有
  console.log('5. 查找所有用户:');
  const allUsers = await userRepository.findAll();
  allUsers.forEach(u => {
    console.log(`   - ${u.username} (${u.email}) - ${u.role}`);
  });

  console.log('\n=== Examples Complete ===');
}
