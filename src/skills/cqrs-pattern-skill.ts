/**
 * CQRS 模式技能 - CQRS Pattern Skill
 * 
 * 功能:
 * 1. 命令处理 - 处理写操作 (Command)
 * 2. 查询处理 - 处理读操作 (Query)
 * 3. 读写分离 - 独立的命令和查询模型
 * 
 * @author Axon
 * @version 1.0.0
 */

// ============================================
// 类型定义
// ============================================

/**
 * 命令基类
 */
export interface Command<TPayload = any> {
  /** 命令 ID */
  id: string;
  /** 命令类型 */
  type: string;
  /** 命令载荷 */
  payload: TPayload;
  /** 时间戳 */
  timestamp: number;
  /** 发起者 ID */
  initiatedBy?: string;
  /** 关联 ID (用于追踪) */
  correlationId?: string;
}

/**
 * 命令结果
 */
export interface CommandResult<TResult = any> {
  /** 是否成功 */
  success: boolean;
  /** 结果数据 */
  data?: TResult;
  /** 错误信息 */
  error?: string;
  /** 命令 ID */
  commandId: string;
  /** 执行时间 (ms) */
  executionTime?: number;
}

/**
 * 查询基类
 */
export interface Query<TParams = any> {
  /** 查询 ID */
  id: string;
  /** 查询类型 */
  type: string;
  /** 查询参数 */
  params: TParams;
  /** 时间戳 */
  timestamp: number;
  /** 分页配置 */
  pagination?: {
    page: number;
    pageSize: number;
  };
  /** 排序配置 */
  sorting?: {
    field: string;
    order: 'asc' | 'desc';
  };
}

/**
 * 查询结果
 */
export interface QueryResult<TResult = any> {
  /** 是否成功 */
  success: boolean;
  /** 结果数据 */
  data: TResult;
  /** 错误信息 */
  error?: string;
  /** 查询 ID */
  queryId: string;
  /** 执行时间 (ms) */
  executionTime?: number;
  /** 总记录数 (用于分页) */
  totalCount?: number;
}

/**
 * 命令处理器接口
 */
export interface CommandHandler<TCommand extends Command = Command, TResult = any> {
  /** 处理的命令类型 */
  commandType: string;
  /** 执行命令 */
  execute(command: TCommand): Promise<CommandResult<TResult>>;
  /** 验证命令 */
  validate?(command: TCommand): boolean;
  /** 命令前钩子 */
  beforeExecute?(command: TCommand): Promise<void>;
  /** 命令后钩子 */
  afterExecute?(command: TCommand, result: CommandResult<TResult>): Promise<void>;
}

/**
 * 查询处理器接口
 */
export interface QueryHandler<TQuery extends Query = Query, TResult = any> {
  /** 处理的查询类型 */
  queryType: string;
  /** 执行查询 */
  execute(query: TQuery): Promise<QueryResult<TResult>>;
  /** 验证查询 */
  validate?(query: TQuery): boolean;
  /** 查询前钩子 */
  beforeExecute?(query: TQuery): Promise<void>;
  /** 查询后钩子 */
  afterExecute?(query: TQuery, result: QueryResult<TResult>): Promise<void>;
}

/**
 * 事件总线接口 (用于 CQRS 事件溯源)
 */
export interface EventBus {
  /** 发布事件 */
  publish(event: DomainEvent): Promise<void>;
  /** 订阅事件 */
  subscribe(eventType: string, handler: (event: DomainEvent) => void): void;
  /** 取消订阅 */
  unsubscribe(eventType: string, handler: (event: DomainEvent) => void): void;
}

/**
 * 领域事件
 */
export interface DomainEvent {
  /** 事件 ID */
  id: string;
  /** 事件类型 */
  type: string;
  /** 事件数据 */
  data: any;
  /** 时间戳 */
  timestamp: number;
  /** 聚合根 ID */
  aggregateId: string;
  /** 版本号 */
  version: number;
}

/**
 * 读写数据库接口
 */
export interface ReadDatabase {
  /** 查询数据 */
  query<T>(...args: any[]): Promise<T[]>;
  /** 查询单条数据 */
  queryOne<T>(...args: any[]): Promise<T | null>;
}

export interface WriteDatabase {
  /** 执行写操作 */
  execute(...args: any[]): Promise<number>;
  /** 执行事务 */
  transaction<T>(fn: (db: WriteDatabase) => Promise<T>): Promise<T>;
}

/**
 * CQRS 配置
 */
export interface CQRSConfig {
  /** 是否启用事件溯源 */
  enableEventSourcing?: boolean;
  /** 是否启用读写分离 */
  enableReadWriteSeparation?: boolean;
  /** 命令处理器列表 */
  commandHandlers: CommandHandler[];
  /** 查询处理器列表 */
  queryHandlers: QueryHandler[];
  /** 事件总线 (可选) */
  eventBus?: EventBus;
  /** 写数据库 */
  writeDatabase?: WriteDatabase;
  /** 读数据库 */
  readDatabase?: ReadDatabase;
  /** 是否启用日志 */
  enableLogging?: boolean;
  /** 是否启用性能监控 */
  enablePerformanceMonitoring?: boolean;
}

// ============================================
// CQRS 核心类
// ============================================

/**
 * CQRS 管理器
 */
export class CQRSManager {
  private commandHandlers: Map<string, CommandHandler> = new Map();
  private queryHandlers: Map<string, QueryHandler> = new Map();
  private eventBus?: EventBus;
  private writeDatabase?: WriteDatabase;
  private readDatabase?: ReadDatabase;
  private enableLogging: boolean;
  private enablePerformanceMonitoring: boolean;
  private enableEventSourcing: boolean;

  constructor(config: CQRSConfig) {
    this.enableLogging = config.enableLogging ?? false;
    this.enablePerformanceMonitoring = config.enablePerformanceMonitoring ?? false;
    this.enableEventSourcing = config.enableEventSourcing ?? false;
    this.eventBus = config.eventBus;
    this.writeDatabase = config.writeDatabase;
    this.readDatabase = config.readDatabase;

    // 注册命令处理器
    config.commandHandlers.forEach(handler => {
      this.commandHandlers.set(handler.commandType, handler);
    });

    // 注册查询处理器
    config.queryHandlers.forEach(handler => {
      this.queryHandlers.set(handler.queryType, handler);
    });

    this.log('CQRSManager initialized', {
      commandHandlers: this.commandHandlers.size,
      queryHandlers: this.queryHandlers.size,
      eventSourcing: this.enableEventSourcing,
      readWriteSeparation: !!(this.readDatabase && this.writeDatabase)
    });
  }

  /**
   * 发送命令 (写操作)
   */
  async sendCommand<TCommand extends Command, TResult>(
    command: TCommand
  ): Promise<CommandResult<TResult>> {
    const startTime = Date.now();
    this.log('Command received', { type: command.type, id: command.id });

    const handler = this.commandHandlers.get(command.type);
    if (!handler) {
      const error = `No handler registered for command type: ${command.type}`;
      this.log(error, { command });
      return {
        success: false,
        error,
        commandId: command.id,
        executionTime: Date.now() - startTime
      };
    }

    // 验证命令
    if (handler.validate && !handler.validate(command)) {
      const error = `Command validation failed: ${command.type}`;
      this.log(error, { command });
      return {
        success: false,
        error,
        commandId: command.id,
        executionTime: Date.now() - startTime
      };
    }

    try {
      // 执行前钩子
      if (handler.beforeExecute) {
        await handler.beforeExecute(command);
      }

      // 执行命令
      const result = await handler.execute(command);

      // 执行后钩子
      if (handler.afterExecute) {
        await handler.afterExecute(command, result);
      }

      // 发布领域事件 (如果启用事件溯源)
      if (this.enableEventSourcing && result.success && this.eventBus) {
        await this.publishDomainEvent(command, result);
      }

      const executionTime = Date.now() - startTime;
      this.log('Command executed', { 
        type: command.type, 
        success: result.success,
        executionTime 
      });

      return {
        ...result,
        executionTime
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.log('Command execution failed', { 
        type: command.type, 
        error: errorMessage 
      });

      return {
        success: false,
        error: errorMessage,
        commandId: command.id,
        executionTime: Date.now() - startTime
      };
    }
  }

  /**
   * 执行查询 (读操作)
   */
  async executeQuery<TQuery extends Query, TResult>(
    query: TQuery
  ): Promise<QueryResult<TResult>> {
    const startTime = Date.now();
    this.log('Query received', { type: query.type, id: query.id });

    const handler = this.queryHandlers.get(query.type);
    if (!handler) {
      const error = `No handler registered for query type: ${query.type}`;
      this.log(error, { query });
      return {
        success: false,
        data: null as any,
        error,
        queryId: query.id,
        executionTime: Date.now() - startTime
      };
    }

    // 验证查询
    if (handler.validate && !handler.validate(query)) {
      const error = `Query validation failed: ${query.type}`;
      this.log(error, { query });
      return {
        success: false,
        data: null as any,
        error,
        queryId: query.id,
        executionTime: Date.now() - startTime
      };
    }

    try {
      // 执行前钩子
      if (handler.beforeExecute) {
        await handler.beforeExecute(query);
      }

      // 执行查询
      const result = await handler.execute(query);

      // 执行后钩子
      if (handler.afterExecute) {
        await handler.afterExecute(query, result);
      }

      const executionTime = Date.now() - startTime;
      this.log('Query executed', { 
        type: query.type, 
        success: result.success,
        executionTime 
      });

      return {
        ...result,
        executionTime
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.log('Query execution failed', { 
        type: query.type, 
        error: errorMessage 
      });

      return {
        success: false,
        data: null as any,
        error: errorMessage,
        queryId: query.id,
        executionTime: Date.now() - startTime
      };
    }
  }

  /**
   * 注册命令处理器
   */
  registerCommandHandler(handler: CommandHandler): void {
    this.commandHandlers.set(handler.commandType, handler);
    this.log('Command handler registered', { type: handler.commandType });
  }

  /**
   * 注册查询处理器
   */
  registerQueryHandler(handler: QueryHandler): void {
    this.queryHandlers.set(handler.queryType, handler);
    this.log('Query handler registered', { type: handler.queryType });
  }

  /**
   * 获取命令处理器列表
   */
  getCommandHandlers(): string[] {
    return Array.from(this.commandHandlers.keys());
  }

  /**
   * 获取查询处理器列表
   */
  getQueryHandlers(): string[] {
    return Array.from(this.queryHandlers.keys());
  }

  /**
   * 发布领域事件
   */
  private async publishDomainEvent(
    command: Command,
    result: CommandResult
  ): Promise<void> {
    if (!this.eventBus) return;

    const event: DomainEvent = {
      id: this.generateId(),
      type: `${command.type}.completed`,
      data: {
        command,
        result
      },
      timestamp: Date.now(),
      aggregateId: command.correlationId || command.id,
      version: 1
    };

    await this.eventBus.publish(event);
    this.log('Domain event published', { eventId: event.id, type: event.type });
  }

  /**
   * 生成唯一 ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 日志记录
   */
  private log(message: string, data?: any): void {
    if (!this.enableLogging) return;

    const timestamp = new Date().toISOString();
    console.log(`[CQRS] [${timestamp}] ${message}`, data || '');
  }
}

// ============================================
// 辅助工具类
// ============================================

/**
 * 简单事件总线实现
 */
export class SimpleEventBus implements EventBus {
  private subscribers: Map<string, Set<(event: DomainEvent) => void>> = new Map();

  async publish(event: DomainEvent): Promise<void> {
    const handlers = this.subscribers.get(event.type);
    if (handlers) {
      for (const handler of handlers) {
        try {
          handler(event);
        } catch (error) {
          console.error('[EventBus] Error in event handler:', error);
        }
      }
    }

    // 也发布到通配符订阅者
    const wildcardHandlers = this.subscribers.get('*');
    if (wildcardHandlers) {
      for (const handler of wildcardHandlers) {
        try {
          handler(event);
        } catch (error) {
          console.error('[EventBus] Error in wildcard handler:', error);
        }
      }
    }
  }

  subscribe(eventType: string, handler: (event: DomainEvent) => void): void {
    if (!this.subscribers.has(eventType)) {
      this.subscribers.set(eventType, new Set());
    }
    this.subscribers.get(eventType)!.add(handler);
  }

  unsubscribe(eventType: string, handler: (event: DomainEvent) => void): void {
    const handlers = this.subscribers.get(eventType);
    if (handlers) {
      handlers.delete(handler);
    }
  }
}

/**
 * 内存数据库实现 (用于演示)
 */
export class InMemoryDatabase implements ReadDatabase, WriteDatabase {
  private data: Map<string, any[]> = new Map();

  async query<T>(collection: string, filter?: (item: T) => boolean): Promise<T[]> {
    const collectionData = this.data.get(collection) || [];
    if (!filter) return collectionData as T[];
    return collectionData.filter(filter) as T[];
  }

  async queryOne<T>(collection: string, filter: (item: T) => boolean): Promise<T | null> {
    const results = await this.query<T>(collection, filter);
    return results[0] || null;
  }

  async execute(collection: string, operation: 'insert' | 'update' | 'delete', item: any): Promise<number> {
    if (!this.data.has(collection)) {
      this.data.set(collection, []);
    }

    const collectionData = this.data.get(collection)!;

    switch (operation) {
      case 'insert':
        collectionData.push(item);
        return 1;
      case 'update':
        const index = collectionData.findIndex(i => i.id === item.id);
        if (index !== -1) {
          collectionData[index] = { ...collectionData[index], ...item };
          return 1;
        }
        return 0;
      case 'delete':
        const deleteIndex = collectionData.findIndex(i => i.id === item.id);
        if (deleteIndex !== -1) {
          collectionData.splice(deleteIndex, 1);
          return 1;
        }
        return 0;
    }
  }

  async transaction<T>(fn: (db: InMemoryDatabase) => Promise<T>): Promise<T> {
    // 简单实现，实际生产环境需要更复杂的事务管理
    try {
      return await fn(this);
    } catch (error) {
      throw error;
    }
  }
}

// ============================================
// 示例命令和查询
// ============================================

/**
 * 示例：创建用户命令
 */
export interface CreateUserCommand extends Command {
  type: 'CreateUser';
  payload: {
    username: string;
    email: string;
    password: string;
  };
}

/**
 * 示例：更新用户命令
 */
export interface UpdateUserCommand extends Command {
  type: 'UpdateUser';
  payload: {
    userId: string;
    data: Partial<{
      username: string;
      email: string;
    }>;
  };
}

/**
 * 示例：删除用户命令
 */
export interface DeleteUserCommand extends Command {
  type: 'DeleteUser';
  payload: {
    userId: string;
  };
}

/**
 * 示例：获取用户查询
 */
export interface GetUserQuery extends Query {
  type: 'GetUser';
  params: {
    userId: string;
  };
}

/**
 * 示例：列出用户查询
 */
export interface ListUsersQuery extends Query {
  type: 'ListUsers';
  params: {
    search?: string;
    status?: 'active' | 'inactive';
  };
}

/**
 * 示例：用户数据
 */
export interface UserData {
  id: string;
  username: string;
  email: string;
  status: 'active' | 'inactive';
  createdAt: number;
  updatedAt: number;
}

// ============================================
// 示例处理器
// ============================================

/**
 * 示例：创建用户命令处理器
 */
export class CreateUserHandler implements CommandHandler<CreateUserCommand, UserData> {
  commandType = 'CreateUser';
  private database: InMemoryDatabase;

  constructor(database: InMemoryDatabase) {
    this.database = database;
  }

  validate(command: CreateUserCommand): boolean {
    const { username, email, password } = command.payload;
    return !!(username && email && password && password.length >= 6);
  }

  async beforeExecute(command: CreateUserCommand): Promise<void> {
    // 检查用户名是否已存在
    const existing = await this.database.queryOne<UserData>(
      'users',
      u => u.username === command.payload.username
    );
    if (existing) {
      throw new Error('Username already exists');
    }
  }

  async execute(command: CreateUserCommand): Promise<CommandResult<UserData>> {
    const now = Date.now();
    const user: UserData = {
      id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      username: command.payload.username,
      email: command.payload.email,
      status: 'active',
      createdAt: now,
      updatedAt: now
    };

    await this.database.execute('users', 'insert', user);

    return {
      success: true,
      data: user,
      commandId: command.id
    };
  }

  async afterExecute(command: CreateUserCommand, result: CommandResult<UserData>): Promise<void> {
    if (result.success) {
      console.log(`User created: ${result.data?.username}`);
    }
  }
}

/**
 * 示例：获取用户查询处理器
 */
export class GetUserQueryHandler implements QueryHandler<GetUserQuery, UserData | null> {
  queryType = 'GetUser';
  private database: InMemoryDatabase;

  constructor(database: InMemoryDatabase) {
    this.database = database;
  }

  validate(query: GetUserQuery): boolean {
    return !!query.params.userId;
  }

  async execute(query: GetUserQuery): Promise<QueryResult<UserData | null>> {
    const user = await this.database.queryOne<UserData>(
      'users',
      u => u.id === query.params.userId
    );

    return {
      success: true,
      data: user,
      queryId: query.id
    };
  }
}

/**
 * 示例：列出用户查询处理器
 */
export class ListUsersQueryHandler implements QueryHandler<ListUsersQuery, UserData[]> {
  queryType = 'ListUsers';
  private database: InMemoryDatabase;

  constructor(database: InMemoryDatabase) {
    this.database = database;
  }

  async execute(query: ListUsersQuery): Promise<QueryResult<UserData[]>> {
    let users = await this.database.query<UserData>('users');

    // 应用筛选
    if (query.params.search) {
      const search = query.params.search.toLowerCase();
      users = users.filter(u => 
        u.username.toLowerCase().includes(search) || 
        u.email.toLowerCase().includes(search)
      );
    }

    if (query.params.status) {
      users = users.filter(u => u.status === query.params.status);
    }

    // 应用分页
    if (query.pagination) {
      const start = (query.pagination.page - 1) * query.pagination.pageSize;
      const end = start + query.pagination.pageSize;
      users = users.slice(start, end);
    }

    // 应用排序
    if (query.sorting) {
      const { field, order } = query.sorting;
      users.sort((a, b) => {
        const aVal = a[field as keyof UserData];
        const bVal = b[field as keyof UserData];
        if (aVal < bVal) return order === 'asc' ? -1 : 1;
        if (aVal > bVal) return order === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return {
      success: true,
      data: users,
      queryId: query.id,
      totalCount: users.length
    };
  }
}

// ============================================
// 使用示例
// ============================================

/**
 * 使用示例
 */
export async function demonstrateCQRS(): Promise<void> {
  console.log('=== CQRS Pattern Demonstration ===\n');

  // 1. 创建数据库实例
  const database = new InMemoryDatabase();
  const eventBus = new SimpleEventBus();

  // 2. 创建处理器
  const createUserHandler = new CreateUserHandler(database);
  const getUserQueryHandler = new GetUserQueryHandler(database);
  const listUsersQueryHandler = new ListUsersQueryHandler(database);

  // 3. 创建 CQRS 管理器
  const cqrs = new CQRSManager({
    enableLogging: true,
    enableEventSourcing: true,
    commandHandlers: [createUserHandler],
    queryHandlers: [getUserQueryHandler, listUsersQueryHandler],
    eventBus: eventBus
  });

  // 4. 发送命令 (写操作)
  console.log('\n--- Sending Commands ---');
  
  const createCommand: CreateUserCommand = {
    id: 'cmd-1',
    type: 'CreateUser',
    payload: {
      username: 'john_doe',
      email: 'john@example.com',
      password: 'secure123'
    },
    timestamp: Date.now(),
    correlationId: 'corr-1'
  };

  const createResult = await cqrs.sendCommand(createCommand);
  console.log('Create result:', createResult);

  // 5. 执行查询 (读操作)
  console.log('\n--- Executing Queries ---');

  const getQuery: GetUserQuery = {
    id: 'query-1',
    type: 'GetUser',
    params: {
      userId: (createResult.data as UserData)?.id || ''
    },
    timestamp: Date.now()
  };

  const getResult = await cqrs.executeQuery(getQuery);
  console.log('Get result:', getResult);

  const listQuery: ListUsersQuery = {
    id: 'query-2',
    type: 'ListUsers',
    params: {
      status: 'active'
    },
    pagination: {
      page: 1,
      pageSize: 10
    },
    sorting: {
      field: 'createdAt',
      order: 'desc'
    },
    timestamp: Date.now()
  };

  const listResult = await cqrs.executeQuery(listQuery);
  console.log('List result:', listResult);

  console.log('\n=== Demonstration Complete ===');
}

// 导出默认实例
export default CQRSManager;
