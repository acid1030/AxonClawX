/**
 * Repository Pattern Skill - KAEL
 * 
 * 数据仓储模式实现，提供统一的数据访问层
 * 功能：仓储接口、数据持久化、查询构建
 */

// ==================== 类型定义 ====================

export interface Entity {
  id: string;
  createdAt: number;
  updatedAt: number;
}

export interface QueryCondition {
  field: string;
  operator: '=' | '!=' | '>' | '<' | '>=' | '<=' | 'like' | 'in';
  value: any;
}

export interface QueryOptions {
  conditions?: QueryCondition[];
  orderBy?: { field: string; direction: 'asc' | 'desc' };
  limit?: number;
  offset?: number;
}

export interface IRepository<T extends Entity> {
  findById(id: string): Promise<T | null>;
  findAll(options?: QueryOptions): Promise<T[]>;
  create(entity: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<T>;
  update(id: string, entity: Partial<T>): Promise<T | null>;
  delete(id: string): Promise<boolean>;
  count(options?: QueryOptions): Promise<number>;
}

export interface IPersistenceProvider {
  save<T>(collection: string, data: T): Promise<T>;
  load<T>(collection: string, id: string): Promise<T | null>;
  loadAll<T>(collection: string): Promise<T[]>;
  update<T>(collection: string, id: string, data: Partial<T>): Promise<T | null>;
  delete(collection: string, id: string): Promise<boolean>;
  query<T>(collection: string, options: QueryOptions): Promise<T[]>;
}

// ==================== 查询构建器 ====================

export class QueryBuilder<T extends Entity> {
  private conditions: QueryCondition[] = [];
  private orderByField?: string;
  private orderByDirection: 'asc' | 'desc' = 'asc';
  private limitValue?: number;
  private offsetValue?: number;

  where(field: string, operator: QueryCondition['operator'], value: any): this {
    this.conditions.push({ field, operator, value });
    return this;
  }

  equals(field: string, value: any): this {
    return this.where(field, '=', value);
  }

  notEquals(field: string, value: any): this {
    return this.where(field, '!=', value);
  }

  greaterThan(field: string, value: any): this {
    return this.where(field, '>', value);
  }

  lessThan(field: string, value: any): this {
    return this.where(field, '<', value);
  }

  in(field: string, values: any[]): this {
    return this.where(field, 'in', values);
  }

  like(field: string, pattern: string): this {
    return this.where(field, 'like', pattern);
  }

  orderBy(field: string, direction: 'asc' | 'desc' = 'asc'): this {
    this.orderByField = field;
    this.orderByDirection = direction;
    return this;
  }

  limit(count: number): this {
    this.limitValue = count;
    return this;
  }

  offset(count: number): this {
    this.offsetValue = count;
    return this;
  }

  build(): QueryOptions {
    return {
      conditions: this.conditions.length > 0 ? this.conditions : undefined,
      orderBy: this.orderByField ? { field: this.orderByField, direction: this.orderByDirection } : undefined,
      limit: this.limitValue,
      offset: this.offsetValue,
    };
  }
}

// ==================== 文件存储提供者 ====================

import * as fs from 'fs';
import * as path from 'path';

export class FilePersistenceProvider implements IPersistenceProvider {
  private basePath: string;

  constructor(basePath: string = './data') {
    this.basePath = basePath;
    this.ensureDirectoryExists();
  }

  private ensureDirectoryExists(): void {
    if (!fs.existsSync(this.basePath)) {
      fs.mkdirSync(this.basePath, { recursive: true });
    }
  }

  private getCollectionPath(collection: string): string {
    return path.join(this.basePath, `${collection}.json`);
  }

  private loadCollection(collection: string): Record<string, any> {
    const filePath = this.getCollectionPath(collection);
    if (!fs.existsSync(filePath)) {
      return {};
    }
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  }

  private saveCollection(collection: string, data: Record<string, any>): void {
    const filePath = this.getCollectionPath(collection);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  }

  async save<T>(collection: string, data: T & { id: string }): Promise<T & { id: string }> {
    const collectionData = this.loadCollection(collection);
    collectionData[data.id] = data;
    this.saveCollection(collection, collectionData);
    return data;
  }

  async load<T>(collection: string, id: string): Promise<T | null> {
    const collectionData = this.loadCollection(collection);
    return collectionData[id] || null;
  }

  async loadAll<T>(collection: string): Promise<T[]> {
    const collectionData = this.loadCollection(collection);
    return Object.values(collectionData);
  }

  async update<T>(collection: string, id: string, data: Partial<T>): Promise<T | null> {
    const collectionData = this.loadCollection(collection);
    if (!collectionData[id]) {
      return null;
    }
    collectionData[id] = { ...collectionData[id], ...data };
    this.saveCollection(collection, collectionData);
    return collectionData[id];
  }

  async delete(collection: string, id: string): Promise<boolean> {
    const collectionData = this.loadCollection(collection);
    if (!collectionData[id]) {
      return false;
    }
    delete collectionData[id];
    this.saveCollection(collection, collectionData);
    return true;
  }

  async query<T>(collection: string, options: QueryOptions): Promise<T[]> {
    let results = await this.loadAll<T>(collection);

    // 应用条件过滤
    if (options.conditions) {
      results = results.filter(item => {
        return options.conditions!.every(condition => {
          const value = (item as any)[condition.field];
          switch (condition.operator) {
            case '=': return value === condition.value;
            case '!=': return value !== condition.value;
            case '>': return value > condition.value;
            case '<': return value < condition.value;
            case '>=': return value >= condition.value;
            case '<=': return value <= condition.value;
            case 'like': return String(value).includes(condition.value);
            case 'in': return condition.value.includes(value);
            default: return true;
          }
        });
      });
    }

    // 应用排序
    if (options.orderBy) {
      results.sort((a: any, b: any) => {
        const aVal = a[options.orderBy!.field];
        const bVal = b[options.orderBy!.field];
        if (aVal < bVal) return options.orderBy!.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return options.orderBy!.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    // 应用偏移和限制
    if (options.offset) {
      results = results.slice(options.offset);
    }
    if (options.limit) {
      results = results.slice(0, options.limit);
    }

    return results;
  }
}

// ==================== 仓储基类 ====================

export abstract class BaseRepository<T extends Entity> implements IRepository<T> {
  protected provider: IPersistenceProvider;
  protected collectionName: string;

  constructor(provider: IPersistenceProvider, collectionName: string) {
    this.provider = provider;
    this.collectionName = collectionName;
  }

  protected generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  async findById(id: string): Promise<T | null> {
    return await this.provider.load<T>(this.collectionName, id);
  }

  async findAll(options?: QueryOptions): Promise<T[]> {
    return await this.provider.query<T>(this.collectionName, options || {});
  }

  async create(entity: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<T> {
    const now = Date.now();
    const newEntity = {
      ...entity,
      id: this.generateId(),
      createdAt: now,
      updatedAt: now,
    } as T;
    return await this.provider.save(this.collectionName, newEntity);
  }

  async update(id: string, entity: Partial<T>): Promise<T | null> {
    const existing = await this.findById(id);
    if (!existing) {
      return null;
    }
    const updated = {
      ...entity,
      updatedAt: Date.now(),
    };
    return await this.provider.update(this.collectionName, id, updated);
  }

  async delete(id: string): Promise<boolean> {
    return await this.provider.delete(this.collectionName, id);
  }

  async count(options?: QueryOptions): Promise<number> {
    const results = await this.findAll(options);
    return results.length;
  }

  query(): QueryBuilder<T> {
    return new QueryBuilder<T>();
  }
}

// ==================== 示例实体和仓储 ====================

export interface User extends Entity {
  name: string;
  email: string;
  age: number;
  role: 'admin' | 'user' | 'guest';
}

export class UserRepository extends BaseRepository<User> {
  constructor(provider: IPersistenceProvider) {
    super(provider, 'users');
  }

  async findByEmail(email: string): Promise<User | null> {
    const results = await this.provider.query<User>(this.collectionName, {
      conditions: [{ field: 'email', operator: '=', value: email }],
    });
    return results[0] || null;
  }

  async findByRole(role: User['role']): Promise<User[]> {
    return await this.provider.query<User>(this.collectionName, {
      conditions: [{ field: 'role', operator: '=', value: role }],
    });
  }
}

export interface Task extends Entity {
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed';
  assigneeId?: string;
  priority: 'low' | 'medium' | 'high';
}

export class TaskRepository extends BaseRepository<Task> {
  constructor(provider: IPersistenceProvider) {
    super(provider, 'tasks');
  }

  async findByStatus(status: Task['status']): Promise<Task[]> {
    return await this.provider.query<Task>(this.collectionName, {
      conditions: [{ field: 'status', operator: '=', value: status }],
    });
  }

  async findByAssignee(assigneeId: string): Promise<Task[]> {
    return await this.provider.query<Task>(this.collectionName, {
      conditions: [{ field: 'assigneeId', operator: '=', value: assigneeId }],
    });
  }

  async findHighPriority(): Promise<Task[]> {
    return await this.provider.query<Task>(this.collectionName, {
      conditions: [{ field: 'priority', operator: '=', value: 'high' }],
      orderBy: { field: 'createdAt', direction: 'desc' },
    });
  }
}

// ==================== 使用示例 ====================

/**
 * 使用示例：
 * 
 * // 1. 初始化存储提供者
 * const provider = new FilePersistenceProvider('./data');
 * 
 * // 2. 创建仓储实例
 * const userRepository = new UserRepository(provider);
 * const taskRepository = new TaskRepository(provider);
 * 
 * // 3. 创建数据
 * const user = await userRepository.create({
 *   name: '张三',
 *   email: 'zhangsan@example.com',
 *   age: 28,
 *   role: 'admin'
 * });
 * 
 * // 4. 查询数据
 * const foundUser = await userRepository.findById(user.id);
 * const allUsers = await userRepository.findAll();
 * const adminUsers = await userRepository.findByRole('admin');
 * 
 * // 5. 使用查询构建器
 * const query = userRepository.query()
 *   .where('age', '>', 25)
 *   .where('role', '=', 'admin')
 *   .orderBy('name', 'asc')
 *   .limit(10)
 *   .build();
 * const results = await userRepository.findAll(query);
 * 
 * // 6. 更新数据
 * await userRepository.update(user.id, { age: 29 });
 * 
 * // 7. 删除数据
 * await userRepository.delete(user.id);
 * 
 * // 8. 任务仓储示例
 * const task = await taskRepository.create({
 *   title: '完成项目',
 *   description: '完成仓储模式实现',
 *   status: 'in_progress',
 *   assigneeId: user.id,
 *   priority: 'high'
 * });
 * 
 * const highPriorityTasks = await taskRepository.findHighPriority();
 * const pendingTasks = await taskRepository.findByStatus('pending');
 */

export {
  Entity,
  QueryCondition,
  QueryOptions,
  IRepository,
  IPersistenceProvider,
  QueryBuilder,
  FilePersistenceProvider,
  BaseRepository,
  User,
  UserRepository,
  Task,
  TaskRepository,
};
