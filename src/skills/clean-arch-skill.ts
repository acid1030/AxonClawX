/**
 * 整洁架构技能 - Clean Architecture Skill
 * 
 * 功能:
 * 1. 层次定义 - Entities, Use Cases, Interface Adapters, Frameworks
 * 2. 依赖倒置 - 依赖规则实现，依赖注入容器
 * 3. 用例管理 - 用例注册、执行、编排
 * 
 * @author Axon
 * @version 1.0.0
 * @see https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html
 */

// ============================================
// 类型定义
// ============================================

/**
 * 整洁架构层次枚举
 */
export enum ArchitectureLayer {
  /** 实体层 - 企业级业务规则 */
  ENTITIES = 'entities',
  /** 用例层 - 应用级业务规则 */
  USE_CASES = 'use_cases',
  /** 接口适配层 - 控制器/网关/Presenter */
  INTERFACE_ADAPTERS = 'interface_adapters',
  /** 框架层 - 外部接口/数据库/UI */
  FRAMEWORKS = 'frameworks'
}

/**
 * 依赖规则：外层可以依赖内层，内层不能依赖外层
 */
export const DEPENDENCY_RULE: Record<ArchitectureLayer, ArchitectureLayer[]> = {
  [ArchitectureLayer.ENTITIES]: [],
  [ArchitectureLayer.USE_CASES]: [ArchitectureLayer.ENTITIES],
  [ArchitectureLayer.INTERFACE_ADAPTERS]: [ArchitectureLayer.USE_CASES, ArchitectureLayer.ENTITIES],
  [ArchitectureLayer.FRAMEWORKS]: [
    ArchitectureLayer.INTERFACE_ADAPTERS,
    ArchitectureLayer.USE_CASES,
    ArchitectureLayer.ENTITIES
  ]
};

/**
 * 实体基类 - 企业级业务规则
 */
export abstract class Entity<TId = string> {
  readonly id: TId;
  readonly createdAt: Date;
  updatedAt: Date;

  constructor(id: TId) {
    this.id = id;
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }

  abstract validate(): boolean;

  protected markUpdated(): void {
    this.updatedAt = new Date();
  }
}

/**
 * 用例输入边界
 */
export interface UseCaseInput<TRequest> {
  request: TRequest;
  requestId?: string;
  initiatedBy?: string;
}

/**
 * 用例输出边界
 */
export interface UseCaseOutput<TResponse> {
  success: boolean;
  data?: TResponse;
  error?: string;
  errorCode?: string;
  executionTime?: number;
}

/**
 * 用例接口
 */
export interface UseCase<TRequest, TResponse> {
  readonly name: string;
  readonly description: string;
  execute(input: UseCaseInput<TRequest>): Promise<UseCaseOutput<TResponse>>;
  validate?(request: TRequest): boolean;
  beforeExecute?(input: UseCaseInput<TRequest>): Promise<void>;
  afterExecute?(output: UseCaseOutput<TResponse>): Promise<void>;
}

/**
 * 仓库接口 - 数据访问抽象
 */
export interface Repository<TEntity extends Entity> {
  findById(id: TEntity['id']): Promise<TEntity | null>;
  save(entity: TEntity): Promise<TEntity>;
  delete(id: TEntity['id']): Promise<boolean>;
  list?(options?: { page?: number; pageSize?: number }): Promise<TEntity[]>;
}

/**
 * 服务接口
 */
export interface Service<TService> {
  readonly name: string;
  getInstance(): TService;
  isAvailable(): Promise<boolean>;
}

/**
 * 依赖注入容器接口
 */
export interface DIContainer {
  register<T>(token: string, implementation: T): void;
  resolve<T>(token: string): T;
  has(token: string): boolean;
  unregister(token: string): void;
}

/**
 * 用例执行上下文
 */
export interface UseCaseContext {
  useCaseName: string;
  startTime: number;
  services: Map<string, any>;
  transactionId?: string;
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
}

/**
 * 用例管理器配置
 */
export interface UseCaseManagerConfig {
  enableLogging?: boolean;
  enablePerformanceMonitoring?: boolean;
  enableTransaction?: boolean;
  defaultLogLevel?: 'debug' | 'info' | 'warn' | 'error';
  container?: DIContainer;
}

// ============================================
// 核心实现
// ============================================

/**
 * 简单依赖注入容器
 */
export class SimpleDIContainer implements DIContainer {
  private registry: Map<string, any> = new Map();

  register<T>(token: string, implementation: T): void {
    this.registry.set(token, implementation);
  }

  resolve<T>(token: string): T {
    const impl = this.registry.get(token);
    if (!impl) throw new Error(`Service not found: ${token}`);
    return impl as T;
  }

  has(token: string): boolean {
    return this.registry.has(token);
  }

  unregister(token: string): void {
    this.registry.delete(token);
  }

  registerFactory<T>(token: string, factory: () => T): void {
    this.register(token, factory());
  }

  registerSingleton<T>(token: string, factory: () => T): void {
    let instance: T | null = null;
    this.register(token, { getInstance: () => instance || (instance = factory()) });
  }

  clear(): void {
    this.registry.clear();
  }

  getTokens(): string[] {
    return Array.from(this.registry.keys());
  }
}

/**
 * 用例执行结果
 */
export interface UseCaseExecutionResult {
  useCaseName: string;
  success: boolean;
  output?: UseCaseOutput<any>;
  executionTime: number;
  error?: string;
}

/**
 * 用例管理器
 */
export class UseCaseManager {
  private useCases: Map<string, UseCase<any, any>> = new Map();
  private config: UseCaseManagerConfig;
  private container: DIContainer;
  private executionHistory: UseCaseExecutionResult[] = [];

  constructor(config: UseCaseManagerConfig = {}) {
    this.config = {
      enableLogging: true,
      enablePerformanceMonitoring: true,
      enableTransaction: false,
      defaultLogLevel: 'info',
      ...config
    };
    this.container = config.container || new SimpleDIContainer();
  }

  register<TRequest, TResponse>(useCase: UseCase<TRequest, TResponse>): void {
    if (this.useCases.has(useCase.name)) {
      this.log('warn', `Use case "${useCase.name}" already registered. Overwriting.`);
    }
    this.useCases.set(useCase.name, useCase);
    this.log('info', `Use case "${useCase.name}" registered.`);
  }

  async execute<TRequest, TResponse>(
    useCaseName: string,
    request: TRequest,
    context?: Partial<UseCaseContext>
  ): Promise<UseCaseOutput<TResponse>> {
    const startTime = Date.now();
    const useCase = this.useCases.get(useCaseName) as UseCase<TRequest, TResponse>;

    if (!useCase) {
      const error = `Use case "${useCaseName}" not found`;
      this.log('error', error);
      return { success: false, error, errorCode: 'USE_CASE_NOT_FOUND', executionTime: Date.now() - startTime };
    }

    const input: UseCaseInput<TRequest> = {
      request,
      requestId: context?.transactionId || this.generateId(),
      initiatedBy: context?.transactionId
    };

    try {
      if (useCase.beforeExecute) await useCase.beforeExecute(input);
      if (useCase.validate && !useCase.validate(request)) throw new Error('Input validation failed');

      const output = await useCase.execute(input);

      if (useCase.afterExecute) await useCase.afterExecute(output);

      this.executionHistory.push({
        useCaseName,
        success: output.success,
        output,
        executionTime: Date.now() - startTime
      });

      this.log('info', `Use case "${useCaseName}" executed in ${Date.now() - startTime}ms`);
      return output;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.log('error', `Use case "${useCaseName}" failed: ${errorMessage}`);

      this.executionHistory.push({
        useCaseName,
        success: false,
        executionTime: Date.now() - startTime,
        error: errorMessage
      });

      return {
        success: false,
        error: errorMessage,
        errorCode: 'EXECUTION_ERROR',
        executionTime: Date.now() - startTime
      };
    }
  }

  getRegisteredUseCases(): string[] {
    return Array.from(this.useCases.keys());
  }

  hasUseCase(useCaseName: string): boolean {
    return this.useCases.has(useCaseName);
  }

  getExecutionHistory(limit: number = 100): UseCaseExecutionResult[] {
    return this.executionHistory.slice(-limit);
  }

  clearExecutionHistory(): void {
    this.executionHistory = [];
  }

  registerService<T>(token: string, service: T): void {
    this.container.register(token, service);
  }

  resolveService<T>(token: string): T {
    return this.container.resolve<T>(token);
  }

  private log(level: string, message: string): void {
    if (!this.config.enableLogging) return;
    const logLevel = this.config.defaultLogLevel || 'info';
    const levels = ['debug', 'info', 'warn', 'error'];
    if (levels.indexOf(level) >= levels.indexOf(logLevel)) {
      console.log(`[${new Date().toISOString()}] [CleanArch] [${level.toUpperCase()}] ${message}`);
    }
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * 架构验证器
 */
export class ArchitectureValidator {
  static validateDependency(fromLayer: ArchitectureLayer, toLayer: ArchitectureLayer): boolean {
    const allowed = DEPENDENCY_RULE[toLayer];
    return allowed.includes(fromLayer) || fromLayer === toLayer;
  }

  static getAllowedDependencies(layer: ArchitectureLayer): ArchitectureLayer[] {
    return DEPENDENCY_RULE[layer];
  }

  static checkViolation(fromLayer: ArchitectureLayer, toLayer: ArchitectureLayer): { valid: boolean; message?: string } {
    if (this.validateDependency(fromLayer, toLayer)) return { valid: true };
    return {
      valid: false,
      message: `Dependency violation: ${fromLayer} cannot depend on ${toLayer}. Allowed: ${DEPENDENCY_RULE[toLayer].join(', ')}`
    };
  }
}

// ============================================
// 示例实体
// ============================================

/**
 * 用户实体
 */
export class User extends Entity<string> {
  constructor(
    id: string,
    public username: string,
    public email: string,
    public role: 'admin' | 'user' | 'guest' = 'user'
  ) {
    super(id);
  }

  validate(): boolean {
    if (!this.username || this.username.length < 3) return false;
    if (!this.email || !this.email.includes('@')) return false;
    if (!['admin', 'user', 'guest'].includes(this.role)) return false;
    return true;
  }

  updateEmail(newEmail: string): void {
    this.email = newEmail;
    this.markUpdated();
  }

  updateRole(newRole: 'admin' | 'user' | 'guest'): void {
    this.role = newRole;
    this.markUpdated();
  }
}

// ============================================
// 示例用例
// ============================================

export interface CreateUserRequest {
  username: string;
  email: string;
  role?: 'admin' | 'user' | 'guest';
}

export interface CreateUserResponse {
  userId: string;
  username: string;
  email: string;
  createdAt: Date;
}

export interface GetUserRequest {
  userId: string;
}

export interface GetUserResponse {
  user: {
    id: string;
    username: string;
    email: string;
    role: string;
    createdAt: Date;
    updatedAt: Date;
  } | null;
}

/**
 * 创建用户用例
 */
export class CreateUserUseCase implements UseCase<CreateUserRequest, CreateUserResponse> {
  readonly name = 'CreateUser';
  readonly description = '创建新用户';

  constructor(private userRepository: Repository<User>) {}

  validate(request: CreateUserRequest): boolean {
    if (!request.username || request.username.length < 3) return false;
    if (!request.email || !request.email.includes('@')) return false;
    return true;
  }

  async execute(input: UseCaseInput<CreateUserRequest>): Promise<UseCaseOutput<CreateUserResponse>> {
    const startTime = Date.now();
    const { request } = input;

    try {
      const userId = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const user = new User(userId, request.username, request.email, request.role || 'user');

      if (!user.validate()) {
        return { success: false, error: 'User validation failed', errorCode: 'VALIDATION_ERROR', executionTime: Date.now() - startTime };
      }

      const savedUser = await this.userRepository.save(user);

      return {
        success: true,
        data: { userId: savedUser.id, username: savedUser.username, email: savedUser.email, createdAt: savedUser.createdAt },
        executionTime: Date.now() - startTime
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        errorCode: 'EXECUTION_ERROR',
        executionTime: Date.now() - startTime
      };
    }
  }
}

/**
 * 获取用户用例
 */
export class GetUserUseCase implements UseCase<GetUserRequest, GetUserResponse> {
  readonly name = 'GetUser';
  readonly description = '获取用户信息';

  constructor(private userRepository: Repository<User>) {}

  async execute(input: UseCaseInput<GetUserRequest>): Promise<UseCaseOutput<GetUserResponse>> {
    const startTime = Date.now();
    const { request } = input;

    try {
      const user = await this.userRepository.findById(request.userId);

      return {
        success: true,
        data: {
          user: user ? {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt
          } : null
        },
        executionTime: Date.now() - startTime
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        errorCode: 'EXECUTION_ERROR',
        executionTime: Date.now() - startTime
      };
    }
  }
}

// ============================================
// 示例仓库
// ============================================

/**
 * 内存用户仓库
 */
export class InMemoryUserRepository implements Repository<User> {
  private storage: Map<string, User> = new Map();

  async findById(id: string): Promise<User | null> {
    return this.storage.get(id) || null;
  }

  async save(entity: User): Promise<User> {
    this.storage.set(entity.id, entity);
    return entity;
  }

  async delete(id: string): Promise<boolean> {
    return this.storage.delete(id);
  }

  async list(options?: { page?: number; pageSize?: number }): Promise<User[]> {
    const users = Array.from(this.storage.values());
    if (!options) return users;
    const page = options.page || 1;
    const pageSize = options.pageSize || 10;
    const start = (page - 1) * pageSize;
    return users.slice(start, start + pageSize);
  }

  clear(): void {
    this.storage.clear();
  }
}
