/**
 * 整洁架构技能 - 使用示例
 * 
 * 本文件演示如何使用 Clean Architecture Skill
 * 包含完整的使用场景和最佳实践
 * 
 * @author Axon
 * @version 1.0.0
 */

import {
  UseCaseManager,
  SimpleDIContainer,
  Entity,
  UseCase,
  UseCaseInput,
  UseCaseOutput,
  Repository,
  ArchitectureValidator,
  ArchitectureLayer,
  User,
  CreateUserUseCase,
  GetUserUseCase,
  CreateUserRequest,
  CreateUserResponse,
  GetUserRequest,
  GetUserResponse,
  InMemoryUserRepository
} from './clean-arch-skill';

// ============================================
// 示例 1: 基础使用 - 创建和获取用户
// ============================================

async function example1_BasicUsage() {
  console.log('\n=== 示例 1: 基础使用 ===\n');

  // 1. 创建仓库实现
  const userRepository = new InMemoryUserRepository();

  // 2. 创建用例
  const createUserUseCase = new CreateUserUseCase(userRepository);
  const getUserUseCase = new GetUserUseCase(userRepository);

  // 3. 创建用例管理器
  const useCaseManager = new UseCaseManager({
    enableLogging: true,
    enablePerformanceMonitoring: true
  });

  // 4. 注册用例
  useCaseManager.register(createUserUseCase);
  useCaseManager.register(getUserUseCase);

  // 5. 执行用例 - 创建用户
  console.log('创建用户...');
  const createResult = await useCaseManager.execute<CreateUserRequest, CreateUserResponse>(
    'CreateUser',
    {
      username: 'john_doe',
      email: 'john@example.com',
      role: 'user'
    }
  );

  if (createResult.success && createResult.data) {
    console.log('✅ 用户创建成功:', createResult.data);

    // 6. 执行用例 - 获取用户
    console.log('\n获取用户...');
    const getResult = await useCaseManager.execute<GetUserRequest, GetUserResponse>(
      'GetUser',
      { userId: createResult.data.userId }
    );

    if (getResult.success && getResult.data?.user) {
      console.log('✅ 用户信息:', getResult.data.user);
    }
  }

  // 7. 查看执行历史
  console.log('\n执行历史:');
  const history = useCaseManager.getExecutionHistory();
  history.forEach(record => {
    console.log(`- ${record.useCaseName}: ${record.success ? '✅' : '❌'} ${record.executionTime}ms`);
  });
}

// ============================================
// 示例 2: 自定义实体和用例
// ============================================

// 定义订单实体
class Order extends Entity<string> {
  constructor(
    id: string,
    public userId: string,
    public items: OrderItem[],
    public status: 'pending' | 'paid' | 'shipped' | 'cancelled' = 'pending'
  ) {
    super(id);
  }

  validate(): boolean {
    if (this.items.length === 0) return false;
    if (!['pending', 'paid', 'shipped', 'cancelled'].includes(this.status)) return false;
    return this.items.every(item => item.quantity > 0 && item.price > 0);
  }

  getTotalAmount(): number {
    return this.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }

  cancel(): void {
    if (this.status === 'shipped') {
      throw new Error('Cannot cancel shipped order');
    }
    this.status = 'cancelled';
    this.markUpdated();
  }

  markAsPaid(): void {
    if (this.status !== 'pending') {
      throw new Error('Only pending orders can be marked as paid');
    }
    this.status = 'paid';
    this.markUpdated();
  }
}

interface OrderItem {
  productId: string;
  name: string;
  quantity: number;
  price: number;
}

// 定义订单仓库接口
interface OrderRepository extends Repository<Order> {
  findByUserId(userId: string): Promise<Order[]>;
  findByStatus(status: Order['status']): Promise<Order[]>;
}

// 内存订单仓库实现
class InMemoryOrderRepository implements OrderRepository {
  private storage: Map<string, Order> = new Map();

  async findById(id: string): Promise<Order | null> {
    return this.storage.get(id) || null;
  }

  async save(entity: Order): Promise<Order> {
    this.storage.set(entity.id, entity);
    return entity;
  }

  async delete(id: string): Promise<boolean> {
    return this.storage.delete(id);
  }

  async findByUserId(userId: string): Promise<Order[]> {
    return Array.from(this.storage.values()).filter(order => order.userId === userId);
  }

  async findByStatus(status: Order['status']): Promise<Order[]> {
    return Array.from(this.storage.values()).filter(order => order.status === status);
  }

  async list(options?: { page?: number; pageSize?: number }): Promise<Order[]> {
    const orders = Array.from(this.storage.values());
    if (!options) return orders;
    
    const page = options.page || 1;
    const pageSize = options.pageSize || 10;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    
    return orders.slice(start, end);
  }
}

// 创建订单用例
interface CreateOrderRequest {
  userId: string;
  items: OrderItem[];
}

interface CreateOrderResponse {
  orderId: string;
  totalAmount: number;
  status: string;
  createdAt: Date;
}

class CreateOrderUseCase implements UseCase<CreateOrderRequest, CreateOrderResponse> {
  readonly name = 'CreateOrder';
  readonly description = '创建新订单';

  constructor(private orderRepository: OrderRepository) {}

  validate(request: CreateOrderRequest): boolean {
    if (!request.userId) return false;
    if (!request.items || request.items.length === 0) return false;
    return request.items.every(item => item.quantity > 0 && item.price > 0);
  }

  async execute(
    input: UseCaseInput<CreateOrderRequest>
  ): Promise<UseCaseOutput<CreateOrderResponse>> {
    const startTime = Date.now();
    const { request } = input;

    try {
      // 业务规则：订单至少有一个商品
      if (request.items.length === 0) {
        return {
          success: false,
          error: 'Order must have at least one item',
          errorCode: 'EMPTY_ORDER'
        };
      }

      // 业务规则：验证每个商品
      for (const item of request.items) {
        if (item.quantity <= 0) {
          return {
            success: false,
            error: `Invalid quantity for item: ${item.name}`,
            errorCode: 'INVALID_QUANTITY'
          };
        }
        if (item.price <= 0) {
          return {
            success: false,
            error: `Invalid price for item: ${item.name}`,
            errorCode: 'INVALID_PRICE'
          };
        }
      }

      // 创建订单
      const orderId = `order-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const order = new Order(orderId, request.userId, request.items);

      // 验证实体
      if (!order.validate()) {
        return {
          success: false,
          error: 'Order validation failed',
          errorCode: 'VALIDATION_ERROR'
        };
      }

      // 保存订单
      const savedOrder = await this.orderRepository.save(order);

      return {
        success: true,
        data: {
          orderId: savedOrder.id,
          totalAmount: savedOrder.getTotalAmount(),
          status: savedOrder.status,
          createdAt: savedOrder.createdAt
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

async function example2_CustomEntityAndUseCase() {
  console.log('\n=== 示例 2: 自定义实体和用例 ===\n');

  // 创建仓库
  const orderRepository = new InMemoryOrderRepository();

  // 创建用例
  const createOrderUseCase = new CreateOrderUseCase(orderRepository);

  // 创建管理器并注册
  const useCaseManager = new UseCaseManager({ enableLogging: true });
  useCaseManager.register(createOrderUseCase);

  // 执行用例
  console.log('创建订单...');
  const result = await useCaseManager.execute<CreateOrderRequest, CreateOrderResponse>(
    'CreateOrder',
    {
      userId: 'user-123',
      items: [
        { productId: 'prod-1', name: 'Laptop', quantity: 1, price: 999.99 },
        { productId: 'prod-2', name: 'Mouse', quantity: 2, price: 29.99 }
      ]
    }
  );

  if (result.success && result.data) {
    console.log('✅ 订单创建成功:', result.data);
    console.log(`总金额：¥${result.data.totalAmount.toFixed(2)}`);
  } else {
    console.log('❌ 订单创建失败:', result.error);
  }
}

// ============================================
// 示例 3: 依赖注入和容器
// ============================================

interface Logger {
  log(message: string): void;
  error(message: string): void;
}

class ConsoleLogger implements Logger {
  log(message: string): void {
    console.log(`[LOG] ${message}`);
  }

  error(message: string): void {
    console.error(`[ERROR] ${message}`);
  }
}

interface EmailService {
  send(to: string, subject: string, body: string): Promise<boolean>;
}

class MockEmailService implements EmailService {
  async send(to: string, subject: string, body: string): Promise<boolean> {
    console.log(`[Email] To: ${to}, Subject: ${subject}`);
    return true;
  }
}

// 使用依赖注入的用例
class RegisterUserUseCase implements UseCase<CreateUserRequest, CreateUserResponse> {
  readonly name = 'RegisterUser';
  readonly description = '注册用户并发送欢迎邮件';

  constructor(
    private userRepository: Repository<User>,
    private logger: Logger,
    private emailService: EmailService
  ) {}

  async execute(
    input: UseCaseInput<CreateUserRequest>
  ): Promise<UseCaseOutput<CreateUserResponse>> {
    const startTime = Date.now();
    const { request } = input;

    try {
      this.logger.log(`Registering user: ${request.username}`);

      // 创建用户
      const userId = `user-${Date.now()}`;
      const user = new User(userId, request.username, request.email, request.role || 'user');

      if (!user.validate()) {
        throw new Error('User validation failed');
      }

      await this.userRepository.save(user);

      // 发送欢迎邮件
      await this.emailService.send(
        request.email,
        'Welcome!',
        `Hello ${request.username}, welcome to our platform!`
      );

      this.logger.log(`User registered successfully: ${userId}`);

      return {
        success: true,
        data: {
          userId: user.id,
          username: user.username,
          email: user.email,
          createdAt: user.createdAt
        },
        executionTime: Date.now() - startTime
      };
    } catch (error) {
      this.logger.error(`Registration failed: ${error instanceof Error ? error.message : 'Unknown'}`);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        errorCode: 'EXECUTION_ERROR',
        executionTime: Date.now() - startTime
      };
    }
  }
}

async function example3_DependencyInjection() {
  console.log('\n=== 示例 3: 依赖注入和容器 ===\n');

  // 创建 DI 容器
  const container = new SimpleDIContainer();

  // 注册服务
  container.register<Logger>('Logger', new ConsoleLogger());
  container.register<EmailService>('EmailService', new MockEmailService());
  container.register<Repository<User>>('UserRepository', new InMemoryUserRepository());

  // 从容器解析服务
  const logger = container.resolve<Logger>('Logger');
  const emailService = container.resolve<EmailService>('EmailService');
  const userRepository = container.resolve<Repository<User>>('UserRepository');

  // 创建用例 (依赖自动注入)
  const registerUseCase = new RegisterUserUseCase(userRepository, logger, emailService);

  // 创建管理器并使用容器的容器
  const useCaseManager = new UseCaseManager({
    enableLogging: true,
    container
  });

  useCaseManager.register(registerUseCase);

  // 执行
  const result = await useCaseManager.execute<CreateUserRequest, CreateUserResponse>(
    'RegisterUser',
    {
      username: 'alice',
      email: 'alice@example.com',
      role: 'user'
    }
  );

  if (result.success) {
    console.log('✅ 用户注册成功:', result.data);
  }
}

// ============================================
// 示例 4: 架构验证
// ============================================

async function example4_ArchitectureValidation() {
  console.log('\n=== 示例 4: 架构验证 ===\n');

  // 验证合法的依赖关系
  const validDep = ArchitectureValidator.validateDependency(
    ArchitectureLayer.USE_CASES,
    ArchitectureLayer.ENTITIES
  );
  console.log(`USE_CASES → ENTITIES: ${validDep ? '✅ 合法' : '❌ 非法'}`);

  // 验证非法的依赖关系
  const invalidDep = ArchitectureValidator.validateDependency(
    ArchitectureLayer.ENTITIES,
    ArchitectureLayer.FRAMEWORKS
  );
  console.log(`ENTITIES → FRAMEWORKS: ${invalidDep ? '✅ 合法' : '❌ 非法 (预期)'}`);

  // 检查违规详情
  const violation = ArchitectureValidator.checkViolation(
    ArchitectureLayer.ENTITIES,
    ArchitectureLayer.FRAMEWORKS
  );
  console.log('\n违规详情:', violation);

  // 获取允许的依赖列表
  const allowed = ArchitectureValidator.getAllowedDependencies(ArchitectureLayer.USE_CASES);
  console.log('\nUSE_CASES 允许依赖的层次:', allowed);
}

// ============================================
// 示例 5: 错误处理和验证
// ============================================

async function example5_ErrorHandling() {
  console.log('\n=== 示例 5: 错误处理和验证 ===\n');

  const userRepository = new InMemoryUserRepository();
  const createUserUseCase = new CreateUserUseCase(userRepository);
  const useCaseManager = new UseCaseManager({ enableLogging: true });

  useCaseManager.register(createUserUseCase);

  // 测试 1: 有效的请求
  console.log('测试 1: 有效请求');
  const result1 = await useCaseManager.execute<CreateUserRequest, CreateUserResponse>(
    'CreateUser',
    { username: 'valid_user', email: 'valid@example.com' }
  );
  console.log(result1.success ? '✅ 成功' : '❌ 失败');

  // 测试 2: 用户名太短
  console.log('\n测试 2: 用户名太短');
  const result2 = await useCaseManager.execute<CreateUserRequest, CreateUserResponse>(
    'CreateUser',
    { username: 'ab', email: 'test@example.com' }
  );
  console.log(`❌ 失败: ${result2.error}`);

  // 测试 3: 邮箱格式错误
  console.log('\n测试 3: 邮箱格式错误');
  const result3 = await useCaseManager.execute<CreateUserRequest, CreateUserResponse>(
    'CreateUser',
    { username: 'test_user', email: 'invalid-email' }
  );
  console.log(`❌ 失败: ${result3.error}`);

  // 测试 4: 不存在的用例
  console.log('\n测试 4: 不存在的用例');
  const result4 = await useCaseManager.execute('NonExistentUseCase', {});
  console.log(`❌ 失败: ${result4.errorCode} - ${result4.error}`);
}

// ============================================
// 示例 6: 性能监控
// ============================================

async function example6_PerformanceMonitoring() {
  console.log('\n=== 示例 6: 性能监控 ===\n');

  const useCaseManager = new UseCaseManager({
    enableLogging: true,
    enablePerformanceMonitoring: true
  });

  const userRepository = new InMemoryUserRepository();
  useCaseManager.register(new CreateUserUseCase(userRepository));

  // 批量执行
  const promises: Promise<any>[] = [];
  for (let i = 0; i < 5; i++) {
    promises.push(
      useCaseManager.execute<CreateUserRequest, CreateUserResponse>('CreateUser', {
        username: `user_${i}`,
        email: `user${i}@example.com`
      })
    );
  }

  await Promise.all(promises);

  // 分析性能
  const history = useCaseManager.getExecutionHistory();
  const avgTime = history.reduce((sum, r) => sum + r.executionTime, 0) / history.length;
  const maxTime = Math.max(...history.map(r => r.executionTime));
  const minTime = Math.min(...history.map(r => r.executionTime));

  console.log('\n性能统计:');
  console.log(`- 执行次数：${history.length}`);
  console.log(`- 平均时间：${avgTime.toFixed(2)}ms`);
  console.log(`- 最长时间：${maxTime}ms`);
  console.log(`- 最短时间：${minTime}ms`);
}

// ============================================
// 主函数 - 运行所有示例
// ============================================

async function main() {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║       整洁架构技能 - 使用示例                          ║');
  console.log('║       Clean Architecture Skill Examples                ║');
  console.log('╚════════════════════════════════════════════════════════╝');

  try {
    await example1_BasicUsage();
    await example2_CustomEntityAndUseCase();
    await example3_DependencyInjection();
    await example4_ArchitectureValidation();
    await example5_ErrorHandling();
    await example6_PerformanceMonitoring();

    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║                  所有示例运行完成 ✅                    ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');
  } catch (error) {
    console.error('❌ 示例运行失败:', error);
  }
}

// 运行示例
main();
