/**
 * Hexagonal Architecture Skill - 六边形架构工具
 * 
 * 功能:
 * 1. 端口定义 - 定义入站/出站端口接口
 * 2. 适配器实现 - 实现具体端口适配器
 * 3. 核心隔离 - 保持核心业务逻辑独立
 * 
 * @module skills/hexagonal-arch
 * @author KAEL
 * @version 1.0.0
 */

import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// Skill Registry Types (本地定义，避免依赖)
// ============================================================================

/**
 * Skill 接口
 */
export interface Skill {
  /** 技能名称 */
  name: string;
  /** 技能描述 */
  description: string;
  /** 版本号 */
  version: string;
  /** 获取可用命令列表 */
  getCommands?(): Command[];
  /** 执行命令 */
  executeCommand?(args: string[]): Promise<void>;
}

/**
 * Command 接口
 */
export interface Command {
  /** 命令名称 */
  name: string;
  /** 命令描述 */
  description: string;
  /** 命令处理器 */
  handler: (args: string[]) => Promise<void>;
}

// ============================================================================
// 类型定义
// ============================================================================

/**
 * 端口类型
 */
export enum PortType {
  INBOUND = 'inbound',    // 入站端口 (接收外部请求)
  OUTBOUND = 'outbound',  // 出站端口 (调用外部服务)
}

/**
 * 端口元数据
 */
export interface PortMetadata {
  /** 端口名称 */
  name: string;
  /** 端口类型 */
  type: PortType;
  /** 端口描述 */
  description: string;
  /** 方法签名 */
  methods: PortMethod[];
}

/**
 * 端口方法
 */
export interface PortMethod {
  /** 方法名 */
  name: string;
  /** 方法描述 */
  description: string;
  /** 参数列表 */
  parameters: MethodParameter[];
  /** 返回类型 */
  returnType: string;
  /** 是否异步 */
  isAsync: boolean;
}

/**
 * 方法参数
 */
export interface MethodParameter {
  /** 参数名 */
  name: string;
  /** 参数类型 */
  type: string;
  /** 是否可选 */
  optional: boolean;
  /** 参数描述 */
  description?: string;
}

/**
 * 适配器元数据
 */
export interface AdapterMetadata {
  /** 适配器名称 */
  name: string;
  /** 实现的端口 */
  implements: string;
  /** 适配器类型 */
  adapterType: 'primary' | 'secondary';
  /** 依赖项 */
  dependencies: string[];
  /** 配置项 */
  config: Record<string, any>;
}

/**
 * 六边形架构配置
 */
export interface HexagonalConfig {
  /** 核心模块路径 */
  corePath: string;
  /** 端口定义路径 */
  portsPath: string;
  /** 适配器路径 */
  adaptersPath: string;
  /** 是否启用类型检查 */
  enableTypeCheck: boolean;
  /** 是否生成文档 */
  generateDocs: boolean;
}

// ============================================================================
// 核心业务逻辑 (Domain Core)
// ============================================================================

/**
 * 核心业务实体 - 用户
 */
export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 核心业务实体 - 订单
 */
export interface Order {
  id: string;
  userId: string;
  items: OrderItem[];
  totalAmount: number;
  status: OrderStatus;
  createdAt: Date;
}

/**
 * 订单状态
 */
export enum OrderStatus {
  PENDING = 'pending',
  PAID = 'paid',
  SHIPPED = 'shipped',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
}

/**
 * 订单项
 */
export interface OrderItem {
  productId: string;
  quantity: number;
  unitPrice: number;
}

/**
 * 核心业务逻辑 - 用户服务
 */
export interface UserServicePort {
  /** 根据 ID 获取用户 */
  getUserById(id: string): Promise<User | null>;
  /** 根据邮箱获取用户 */
  getUserByEmail(email: string): Promise<User | null>;
  /** 创建新用户 */
  createUser(data: CreateUserDto): Promise<User>;
  /** 更新用户信息 */
  updateUser(id: string, data: UpdateUserDto): Promise<User>;
  /** 删除用户 */
  deleteUser(id: string): Promise<void>;
}

/**
 * 核心业务逻辑 - 订单服务
 */
export interface OrderServicePort {
  /** 根据 ID 获取订单 */
  getOrderById(id: string): Promise<Order | null>;
  /** 获取用户的所有订单 */
  getOrdersByUserId(userId: string): Promise<Order[]>;
  /** 创建新订单 */
  createOrder(userId: string, items: OrderItem[]): Promise<Order>;
  /** 更新订单状态 */
  updateOrderStatus(id: string, status: OrderStatus): Promise<Order>;
  /** 取消订单 */
  cancelOrder(id: string): Promise<void>;
}

/**
 * 数据传输对象 - 创建用户
 */
export interface CreateUserDto {
  email: string;
  name: string;
  password: string;
}

/**
 * 数据传输对象 - 更新用户
 */
export interface UpdateUserDto {
  name?: string;
  email?: string;
}

// ============================================================================
// 入站端口 (Inbound Ports) - 驱动端
// ============================================================================

/**
 * 入站端口 - API 接口
 * 定义外部系统可以调用的接口
 */
export interface ApiPort {
  /** 处理 HTTP 请求 */
  handleRequest(request: HttpRequest): Promise<HttpResponse>;
  /** 处理 WebSocket 消息 */
  handleWebSocket(message: WebSocketMessage): Promise<void>;
  /** 注册路由 */
  registerRoute(method: string, path: string, handler: RequestHandler): void;
}

/**
 * HTTP 请求
 */
export interface HttpRequest {
  method: string;
  path: string;
  headers: Record<string, string>;
  body?: any;
  query?: Record<string, string>;
  params?: Record<string, string>;
}

/**
 * HTTP 响应
 */
export interface HttpResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: any;
}

/**
 * WebSocket 消息
 */
export interface WebSocketMessage {
  type: string;
  payload: any;
  sessionId: string;
}

/**
 * 请求处理器
 */
export type RequestHandler = (req: HttpRequest) => Promise<HttpResponse>;

/**
 * 入站端口 - 命令行接口
 */
export interface CliPort {
  /** 注册命令 */
  registerCommand(name: string, description: string, handler: CommandHandler): void;
  /** 执行命令 */
  executeCommand(args: string[]): Promise<void>;
  /** 显示帮助 */
  showHelp(): void;
}

/**
 * 命令处理器
 */
export type CommandHandler = (args: string[]) => Promise<void>;

// ============================================================================
// 出站端口 (Outbound Ports) - 被驱动端
// ============================================================================

/**
 * 出站端口 - 用户仓储
 * 定义数据访问接口
 */
export interface UserRepositoryPort {
  /** 根据 ID 查找用户 */
  findById(id: string): Promise<User | null>;
  /** 根据邮箱查找用户 */
  findByEmail(email: string): Promise<User | null>;
  /** 保存用户 */
  save(user: User): Promise<User>;
  /** 更新用户 */
  update(user: User): Promise<User>;
  /** 删除用户 */
  delete(id: string): Promise<void>;
  /** 查找所有用户 */
  findAll(): Promise<User[]>;
}

/**
 * 出站端口 - 订单仓储
 */
export interface OrderRepositoryPort {
  /** 根据 ID 查找订单 */
  findById(id: string): Promise<Order | null>;
  /** 根据用户 ID 查找订单 */
  findByUserId(userId: string): Promise<Order[]>;
  /** 保存订单 */
  save(order: Order): Promise<Order>;
  /** 更新订单 */
  update(order: Order): Promise<Order>;
  /** 删除订单 */
  delete(id: string): Promise<void>;
}

/**
 * 出站端口 - 通知服务
 */
export interface NotificationPort {
  /** 发送邮件 */
  sendEmail(to: string, subject: string, body: string): Promise<void>;
  /** 发送短信 */
  sendSms(to: string, message: string): Promise<void>;
  /** 发送推送通知 */
  sendPush(userId: string, title: string, body: string): Promise<void>;
}

/**
 * 出站端口 - 日志服务
 */
export interface LoggerPort {
  /** 记录调试日志 */
  debug(message: string, context?: any): void;
  /** 记录信息日志 */
  info(message: string, context?: any): void;
  /** 记录警告日志 */
  warn(message: string, context?: any): void;
  /** 记录错误日志 */
  error(message: string, context?: any): void;
}

/**
 * 出站端口 - 缓存服务
 */
export interface CachePort {
  /** 获取缓存 */
  get<T>(key: string): Promise<T | null>;
  /** 设置缓存 */
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
  /** 删除缓存 */
  delete(key: string): Promise<void>;
  /** 清除所有缓存 */
  clear(): Promise<void>;
}

// ============================================================================
// 适配器实现 (Adapters)
// ============================================================================

/**
 * 入站适配器 - Express HTTP 适配器
 * 实现 ApiPort 接口
 */
export class ExpressApiAdapter implements ApiPort {
  private routes: Map<string, RequestHandler> = new Map();

  async handleRequest(request: HttpRequest): Promise<HttpResponse> {
    const key = `${request.method}:${request.path}`;
    const handler = this.routes.get(key);
    
    if (!handler) {
      return {
        statusCode: 404,
        headers: { 'Content-Type': 'application/json' },
        body: { error: 'Not Found' },
      };
    }

    try {
      return await handler(request);
    } catch (error) {
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: { error: 'Internal Server Error' },
      };
    }
  }

  async handleWebSocket(message: WebSocketMessage): Promise<void> {
    // WebSocket 处理逻辑
    console.log('WebSocket message:', message);
  }

  registerRoute(method: string, path: string, handler: RequestHandler): void {
    const key = `${method}:${path}`;
    this.routes.set(key, handler);
  }
}

/**
 * 入站适配器 - CLI 适配器
 * 实现 CliPort 接口
 */
export class CliAdapter implements CliPort {
  private commands: Map<string, { description: string; handler: CommandHandler }> = new Map();

  registerCommand(name: string, description: string, handler: CommandHandler): void {
    this.commands.set(name, { description, handler });
  }

  async executeCommand(args: string[]): Promise<void> {
    const [commandName, ...commandArgs] = args;
    const command = this.commands.get(commandName);

    if (!command) {
      console.error(`Unknown command: ${commandName}`);
      this.showHelp();
      return;
    }

    await command.handler(commandArgs);
  }

  showHelp(): void {
    console.log('Available commands:');
    this.commands.forEach((cmd, name) => {
      console.log(`  ${name} - ${cmd.description}`);
    });
  }
}

/**
 * 出站适配器 - SQLite 用户仓储适配器
 * 实现 UserRepositoryPort 接口
 */
export class SqliteUserRepositoryAdapter implements UserRepositoryPort {
  private db: any; // better-sqlite3 Database

  constructor(dbPath: string) {
    // 实际实现中会初始化 SQLite 连接
    console.log('Initializing SQLite connection:', dbPath);
  }

  async findById(id: string): Promise<User | null> {
    // SQLite 查询实现
    console.log('Finding user by ID:', id);
    return null; // 占位实现
  }

  async findByEmail(email: string): Promise<User | null> {
    console.log('Finding user by email:', email);
    return null;
  }

  async save(user: User): Promise<User> {
    console.log('Saving user:', user);
    return user;
  }

  async update(user: User): Promise<User> {
    console.log('Updating user:', user);
    return user;
  }

  async delete(id: string): Promise<void> {
    console.log('Deleting user:', id);
  }

  async findAll(): Promise<User[]> {
    console.log('Finding all users');
    return [];
  }
}

/**
 * 出站适配器 - PostgreSQL 订单仓储适配器
 * 实现 OrderRepositoryPort 接口
 */
export class PostgresOrderRepositoryAdapter implements OrderRepositoryPort {
  private pool: any; // pg Pool

  constructor(connectionString: string) {
    console.log('Initializing PostgreSQL connection');
  }

  async findById(id: string): Promise<Order | null> {
    console.log('Finding order by ID:', id);
    return null;
  }

  async findByUserId(userId: string): Promise<Order[]> {
    console.log('Finding orders by user ID:', userId);
    return [];
  }

  async save(order: Order): Promise<Order> {
    console.log('Saving order:', order);
    return order;
  }

  async update(order: Order): Promise<Order> {
    console.log('Updating order:', order);
    return order;
  }

  async delete(id: string): Promise<void> {
    console.log('Deleting order:', id);
  }
}

/**
 * 出站适配器 - SMTP 邮件通知适配器
 * 实现 NotificationPort 接口
 */
export class SmtpNotificationAdapter implements NotificationPort {
  private transporter: any; // nodemailer transporter

  constructor(config: { host: string; port: number; auth: any }) {
    console.log('Initializing SMTP connection');
  }

  async sendEmail(to: string, subject: string, body: string): Promise<void> {
    console.log('Sending email to:', to);
    // 实际 SMTP 发送逻辑
  }

  async sendSms(to: string, message: string): Promise<void> {
    console.log('Sending SMS to:', to);
    // SMS 服务调用逻辑
  }

  async sendPush(userId: string, title: string, body: string): Promise<void> {
    console.log('Sending push notification to user:', userId);
    // 推送服务调用逻辑
  }
}

/**
 * 出站适配器 - Winston 日志适配器
 * 实现 LoggerPort 接口
 */
export class WinstonLoggerAdapter implements LoggerPort {
  private logger: any; // winston logger

  constructor(config: { level: string; format: string }) {
    console.log('Initializing Winston logger');
  }

  debug(message: string, context?: any): void {
    console.log('[DEBUG]', message, context);
  }

  info(message: string, context?: any): void {
    console.log('[INFO]', message, context);
  }

  warn(message: string, context?: any): void {
    console.log('[WARN]', message, context);
  }

  error(message: string, context?: any): void {
    console.log('[ERROR]', message, context);
  }
}

/**
 * 出站适配器 - Redis 缓存适配器
 * 实现 CachePort 接口
 */
export class RedisCacheAdapter implements CachePort {
  private client: any; // Redis client

  constructor(connectionString: string) {
    console.log('Initializing Redis connection');
  }

  async get<T>(key: string): Promise<T | null> {
    console.log('Getting cache:', key);
    return null;
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    console.log('Setting cache:', key, 'TTL:', ttl);
  }

  async delete(key: string): Promise<void> {
    console.log('Deleting cache:', key);
  }

  async clear(): Promise<void> {
    console.log('Clearing all cache');
  }
}

// ============================================================================
// 核心服务实现 (Core Service Implementation)
// ============================================================================

/**
 * 用户服务实现
 * 使用端口接口，不依赖具体实现
 */
export class UserService implements UserServicePort {
  constructor(
    private userRepository: UserRepositoryPort,
    private notificationService: NotificationPort,
    private logger: LoggerPort,
  ) {}

  async getUserById(id: string): Promise<User | null> {
    this.logger.info('Getting user by ID', { id });
    return await this.userRepository.findById(id);
  }

  async getUserByEmail(email: string): Promise<User | null> {
    this.logger.info('Getting user by email', { email });
    return await this.userRepository.findByEmail(email);
  }

  async createUser(data: CreateUserDto): Promise<User> {
    this.logger.info('Creating new user', { email: data.email });
    
    // 检查邮箱是否已存在
    const existing = await this.userRepository.findByEmail(data.email);
    if (existing) {
      throw new Error('Email already exists');
    }

    // 创建用户实体
    const now = new Date();
    const user: User = {
      id: this.generateId(),
      email: data.email,
      name: data.name,
      createdAt: now,
      updatedAt: now,
    };

    // 保存用户
    const saved = await this.userRepository.save(user);

    // 发送欢迎邮件
    await this.notificationService.sendEmail(
      user.email,
      'Welcome!',
      `Hello ${user.name}, welcome to our platform!`,
    );

    return saved;
  }

  async updateUser(id: string, data: UpdateUserDto): Promise<User> {
    this.logger.info('Updating user', { id, data });

    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new Error('User not found');
    }

    // 更新用户信息
    const updated: User = {
      ...user,
      name: data.name ?? user.name,
      email: data.email ?? user.email,
      updatedAt: new Date(),
    };

    return await this.userRepository.update(updated);
  }

  async deleteUser(id: string): Promise<void> {
    this.logger.info('Deleting user', { id });
    await this.userRepository.delete(id);
  }

  private generateId(): string {
    return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * 订单服务实现
 */
export class OrderService implements OrderServicePort {
  constructor(
    private orderRepository: OrderRepositoryPort,
    private userService: UserServicePort,
    private notificationService: NotificationPort,
    private logger: LoggerPort,
  ) {}

  async getOrderById(id: string): Promise<Order | null> {
    this.logger.info('Getting order by ID', { id });
    return await this.orderRepository.findById(id);
  }

  async getOrdersByUserId(userId: string): Promise<Order[]> {
    this.logger.info('Getting orders by user ID', { userId });
    return await this.orderRepository.findByUserId(userId);
  }

  async createOrder(userId: string, items: OrderItem[]): Promise<Order> {
    this.logger.info('Creating new order', { userId, items });

    // 验证用户存在
    const user = await this.userService.getUserById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // 计算总金额
    const totalAmount = items.reduce(
      (sum, item) => sum + item.unitPrice * item.quantity,
      0,
    );

    // 创建订单实体
    const now = new Date();
    const order: Order = {
      id: this.generateId(),
      userId,
      items,
      totalAmount,
      status: OrderStatus.PENDING,
      createdAt: now,
    };

    // 保存订单
    const saved = await this.orderRepository.save(order);

    // 发送订单确认通知
    await this.notificationService.sendEmail(
      user.email,
      'Order Confirmation',
      `Your order #${order.id} has been created. Total: $${totalAmount}`,
    );

    return saved;
  }

  async updateOrderStatus(id: string, status: OrderStatus): Promise<Order> {
    this.logger.info('Updating order status', { id, status });

    const order = await this.orderRepository.findById(id);
    if (!order) {
      throw new Error('Order not found');
    }

    const updated: Order = {
      ...order,
      status,
    };

    return await this.orderRepository.update(updated);
  }

  async cancelOrder(id: string): Promise<void> {
    this.logger.info('Cancelling order', { id });
    await this.updateOrderStatus(id, OrderStatus.CANCELLED);
  }

  private generateId(): string {
    return `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// ============================================================================
// 六边形架构技能 (Hexagonal Architecture Skill)
// ============================================================================

/**
 * 六边形架构技能
 * 提供端口定义、适配器生成和核心隔离工具
 */
export class HexagonalArchSkill implements Skill {
  name = 'hexagonal-arch';
  description = '六边形架构工具 - 端口定义、适配器实现、核心隔离';
  version = '1.0.0';

  private config: HexagonalConfig;

  constructor(config?: Partial<HexagonalConfig>) {
    this.config = {
      corePath: config?.corePath || './src/core',
      portsPath: config?.portsPath || './src/ports',
      adaptersPath: config?.adaptersPath || './src/adapters',
      enableTypeCheck: config?.enableTypeCheck ?? true,
      generateDocs: config?.generateDocs ?? true,
    };
  }

  getCommands(): Command[] {
    return [
      {
        name: 'create-port',
        description: '创建新的端口定义',
        handler: (args) => this.createPort(args),
      },
      {
        name: 'create-adapter',
        description: '创建新的适配器实现',
        handler: (args) => this.createAdapter(args),
      },
      {
        name: 'generate-core',
        description: '生成核心业务逻辑',
        handler: (args) => this.generateCore(args),
      },
      {
        name: 'validate-arch',
        description: '验证六边形架构合规性',
        handler: (args) => this.validateArchitecture(args),
      },
    ];
  }

  /**
   * 创建端口定义
   */
  async createPort(args: string[]): Promise<void> {
    const [portName, portType] = args;

    if (!portName || !portType) {
      console.error('Usage: create-port <name> <inbound|outbound>');
      return;
    }

    const type = portType.toLowerCase() as PortType;
    if (!Object.values(PortType).includes(type)) {
      console.error('Invalid port type. Use: inbound | outbound');
      return;
    }

    const portContent = this.generatePortFile(portName, type);
    const filePath = path.join(this.config.portsPath, `${portName}-port.ts`);

    this.ensureDirectoryExists(path.dirname(filePath));
    fs.writeFileSync(filePath, portContent, 'utf-8');

    console.log(`✓ Port created: ${filePath}`);
  }

  /**
   * 创建适配器实现
   */
  async createAdapter(args: string[]): Promise<void> {
    const [adapterName, portName, adapterType] = args;

    if (!adapterName || !portName) {
      console.error('Usage: create-adapter <name> <port> <primary|secondary>');
      return;
    }

    const type = (adapterType || 'secondary').toLowerCase() as 'primary' | 'secondary';
    const adapterContent = this.generateAdapterFile(adapterName, portName, type);
    const filePath = path.join(this.config.adaptersPath, `${adapterName}-adapter.ts`);

    this.ensureDirectoryExists(path.dirname(filePath));
    fs.writeFileSync(filePath, adapterContent, 'utf-8');

    console.log(`✓ Adapter created: ${filePath}`);
  }

  /**
   * 生成核心业务逻辑
   */
  async generateCore(args: string[]): Promise<void> {
    const [serviceName] = args;

    if (!serviceName) {
      console.error('Usage: generate-core <service-name>');
      return;
    }

    const coreContent = this.generateCoreFile(serviceName);
    const filePath = path.join(this.config.corePath, `${serviceName}-service.ts`);

    this.ensureDirectoryExists(path.dirname(filePath));
    fs.writeFileSync(filePath, coreContent, 'utf-8');

    console.log(`✓ Core service created: ${filePath}`);
  }

  /**
   * 验证架构合规性
   */
  async validateArchitecture(args: string[]): Promise<void> {
    console.log('Validating hexagonal architecture...');

    const violations: string[] = [];

    // 检查核心层是否依赖外层
    const coreFiles = this.findFiles(this.config.corePath, '.ts');
    for (const file of coreFiles) {
      const content = fs.readFileSync(file, 'utf-8');
      
      // 检查是否直接导入适配器
      if (content.includes('from') && content.includes('adapter')) {
        violations.push(`Core file ${file} should not import adapters`);
      }
    }

    // 检查端口定义是否完整
    const portFiles = this.findFiles(this.config.portsPath, '.ts');
    for (const file of portFiles) {
      const content = fs.readFileSync(file, 'utf-8');
      if (!content.includes('interface') && !content.includes('export')) {
        violations.push(`Port file ${file} should export interfaces`);
      }
    }

    if (violations.length > 0) {
      console.error('❌ Architecture violations found:');
      violations.forEach((v) => console.error(`  - ${v}`));
    } else {
      console.log('✅ No architecture violations found');
    }
  }

  // ============================================================================
  // 辅助方法
  // ============================================================================

  private generatePortFile(name: string, type: PortType): string {
    const pascalName = this.toPascalCase(name);
    const description = type === PortType.INBOUND ? '入站端口' : '出站端口';

    return `/**
 * ${pascalName} 端口
 * ${description}
 * 
 * @module ports/${name}
 * @version 1.0.0
 */

/**
 * ${pascalName} 端口接口
 */
export interface I${pascalName}Port {
  // TODO: 定义端口方法
  // 示例:
  // execute(command: ${pascalName}Command): Promise<${pascalName}Result>;
}

/**
 * ${pascalName} 命令
 */
export interface ${pascalName}Command {
  // TODO: 定义命令属性
}

/**
 * ${pascalName} 结果
 */
export interface ${pascalName}Result {
  // TODO: 定义结果属性
}
`;
  }

  private generateAdapterFile(adapterName: string, portName: string, type: 'primary' | 'secondary'): string {
    const pascalAdapterName = this.toPascalCase(adapterName);
    const pascalPortName = this.toPascalCase(portName);
    const adapterType = type === 'primary' ? '入站适配器' : '出站适配器';

    return `/**
 * ${pascalAdapterName} 适配器
 * ${adapterType}
 * 
 * @module adapters/${adapterName}
 * @version 1.0.0
 */

import { I${pascalPortName}Port } from '../ports/${portName}-port';

/**
 * ${pascalAdapterName} 适配器实现
 */
export class ${pascalAdapterName}Adapter implements I${pascalPortName}Port {
  constructor() {
    // TODO: 初始化适配器依赖
  }

  // TODO: 实现端口方法
  // async execute(command: ${pascalPortName}Command): Promise<${pascalPortName}Result> {
  //   // 适配器实现逻辑
  // }
}
`;
  }

  private generateCoreFile(serviceName: string): string {
    const pascalName = this.toPascalCase(serviceName);

    return `/**
 * ${pascalName} 服务
 * 核心业务逻辑
 * 
 * @module core/${serviceName}
 * @version 1.0.0
 */

import { I${pascalName}Port } from '../ports/${serviceName}-port';
import { LoggerPort } from '../ports/logger-port';

/**
 * ${pascalName} 服务实现
 */
export class ${pascalName}Service implements I${pascalName}Port {
  constructor(
    // TODO: 注入依赖的端口
    // private repository: IRepositoryPort,
    private logger: LoggerPort,
  ) {}

  // TODO: 实现核心业务逻辑
  // async execute(command: ${pascalName}Command): Promise<${pascalName}Result> {
  //   this.logger.info('Executing ${serviceName} command', { command });
  //   // 业务逻辑实现
  // }
}
`;
  }

  private ensureDirectoryExists(dirPath: string): void {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }

  private findFiles(dirPath: string, extension: string): string[] {
    if (!fs.existsSync(dirPath)) {
      return [];
    }

    const files: string[] = [];
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        files.push(...this.findFiles(fullPath, extension));
      } else if (entry.isFile() && entry.name.endsWith(extension)) {
        files.push(fullPath);
      }
    }

    return files;
  }

  private toPascalCase(str: string): string {
    return str
      .split(/[-_]/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join('');
  }
}

// ============================================================================
// 使用示例
// ============================================================================

/**
 * 使用示例 1: 创建端口和适配器
 */
async function example1() {
  const skill = new HexagonalArchSkill({
    corePath: './src/core',
    portsPath: './src/ports',
    adaptersPath: './src/adapters',
  });

  // 创建用户端口
  await skill.createPort(['user', 'inbound']);

  // 创建用户仓储端口
  await skill.createPort(['user-repository', 'outbound']);

  // 创建 Express API 适配器
  await skill.createAdapter(['express-api', 'user', 'primary']);

  // 创建 SQLite 用户仓储适配器
  await skill.createAdapter(['sqlite-user', 'user-repository', 'secondary']);
}

/**
 * 使用示例 2: 依赖注入和核心服务
 */
async function example2() {
  // 创建适配器实例
  const userRepository = new SqliteUserRepositoryAdapter('./data/users.db');
  const notificationService = new SmtpNotificationAdapter({
    host: 'smtp.example.com',
    port: 587,
    auth: { user: 'user', pass: 'pass' },
  });
  const logger = new WinstonLoggerAdapter({ level: 'info', format: 'json' });

  // 注入依赖创建核心服务
  const userService = new UserService(userRepository, notificationService, logger);

  // 使用核心服务
  const user = await userService.createUser({
    email: 'test@example.com',
    name: 'Test User',
    password: 'securepassword',
  });

  console.log('Created user:', user);
}

/**
 * 使用示例 3: 架构验证
 */
async function example3() {
  const skill = new HexagonalArchSkill();
  await skill.validateArchitecture([]);
}

// ============================================================================
// 导出
// ============================================================================

export default HexagonalArchSkill;
