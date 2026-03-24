# 整洁架构技能 - Clean Architecture Skill

> **整洁架构 (Clean Architecture)** - 可维护、可测试、独立的软件架构实现

## 📖 简介

整洁架构是由 Robert C. Martin (Uncle Bob) 提出的软件架构模式，核心思想是**通过分层和依赖规则实现关注点分离**，使系统独立于框架、UI、数据库和外部机构。

### 核心特性

- ✅ **层次定义** - Entities, Use Cases, Interface Adapters, Frameworks
- ✅ **依赖倒置** - 依赖规则实现，依赖注入容器
- ✅ **用例管理** - 用例注册、执行、编排
- ✅ **可测试性** - 业务逻辑与外部依赖解耦
- ✅ **框架独立** - 不依赖特定框架或库

---

## 🏗️ 架构层次

```
┌─────────────────────────────────────────────────┐
│           Frameworks & Drivers (外层)            │
│  - Web Framework (Express, Fastify)             │
│  - Database (MySQL, MongoDB)                     │
│  - UI (React, Vue)                               │
│  - External APIs                                 │
└─────────────────────────────────────────────────┘
                      ↓ depends on
┌─────────────────────────────────────────────────┐
│         Interface Adapters (接口适配层)           │
│  - Controllers (HTTP, RPC)                       │
│  - Presenters (View Models)                      │
│  - Gateways (Repository Implementations)         │
└─────────────────────────────────────────────────┘
                      ↓ depends on
┌─────────────────────────────────────────────────┐
│            Use Cases (用例层)                    │
│  - Application Business Rules                    │
│  - Orchestrate data flow                         │
│  - Independent of UI/DB/Framework                │
└─────────────────────────────────────────────────┘
                      ↓ depends on
┌─────────────────────────────────────────────────┐
│            Entities (实体层 - 核心)              │
│  - Enterprise Business Rules                     │
│  - Pure business objects                         │
│  - No external dependencies                      │
└─────────────────────────────────────────────────┘
```

### 依赖规则

**外层可以依赖内层，内层不能依赖外层**

```typescript
// ✅ 正确：用例层依赖实体层
class CreateUserUseCase {
  constructor(private userRepository: Repository<User>) {}
}

// ❌ 错误：实体层依赖用例层 (违反依赖规则)
class User {
  // 不应该导入 UseCase
}
```

---

## 🚀 快速开始

### 1. 导入核心组件

```typescript
import {
  UseCaseManager,
  SimpleDIContainer,
  Entity,
  UseCase,
  Repository,
  ArchitectureValidator,
  ArchitectureLayer
} from './clean-arch-skill';
```

### 2. 定义实体 (Entities)

```typescript
// 实体层 - 企业级业务规则，无外部依赖
class Product extends Entity<string> {
  constructor(
    id: string,
    public name: string,
    public price: number,
    public stock: number
  ) {
    super(id);
  }

  validate(): boolean {
    return this.name.length > 0 && this.price > 0 && this.stock >= 0;
  }

  updatePrice(newPrice: number): void {
    if (newPrice <= 0) throw new Error('Price must be positive');
    this.price = newPrice;
    this.markUpdated();
  }

  reduceStock(quantity: number): void {
    if (quantity > this.stock) throw new Error('Insufficient stock');
    this.stock -= quantity;
    this.markUpdated();
  }
}
```

### 3. 定义仓库接口 (依赖倒置)

```typescript
// 用例层定义接口，框架层实现
interface ProductRepository extends Repository<Product> {
  findByName(name: string): Promise<Product | null>;
  findByPriceRange(min: number, max: number): Promise<Product[]>;
}
```

### 4. 实现用例 (Use Cases)

```typescript
// 用例输入/输出类型
interface CreateProductRequest {
  name: string;
  price: number;
  stock: number;
}

interface CreateProductResponse {
  productId: string;
  name: string;
  createdAt: Date;
}

// 用例实现
class CreateProductUseCase implements UseCase<CreateProductRequest, CreateProductResponse> {
  readonly name = 'CreateProduct';
  readonly description = '创建新产品';

  constructor(private productRepository: ProductRepository) {}

  validate(request: CreateProductRequest): boolean {
    return request.name.length > 0 && request.price > 0 && request.stock >= 0;
  }

  async execute(input: UseCaseInput<CreateProductRequest>): Promise<UseCaseOutput<CreateProductResponse>> {
    const { request } = input;
    
    // 业务规则验证
    if (request.price < 0.01) {
      return {
        success: false,
        error: 'Price must be at least 0.01',
        errorCode: 'INVALID_PRICE'
      };
    }

    // 创建实体
    const productId = `prod-${Date.now()}`;
    const product = new Product(productId, request.name, request.price, request.stock);

    // 保存
    await this.productRepository.save(product);

    return {
      success: true,
      data: {
        productId: product.id,
        name: product.name,
        createdAt: product.createdAt
      }
    };
  }
}
```

### 5. 注册和执行用例

```typescript
// 创建用例管理器
const useCaseManager = new UseCaseManager({
  enableLogging: true,
  enablePerformanceMonitoring: true
});

// 注册仓库实现
const productRepo = new InMemoryProductRepository();
useCaseManager.registerService('ProductRepository', productRepo);

// 注册用例
const createProductUseCase = new CreateProductUseCase(productRepo);
useCaseManager.register(createProductUseCase);

// 执行用例
const result = await useCaseManager.execute<CreateProductRequest, CreateProductResponse>(
  'CreateProduct',
  { name: 'Laptop', price: 999.99, stock: 100 }
);

console.log(result);
// { success: true, data: { productId: 'prod-xxx', ... } }
```

---

## 📚 核心组件

### UseCaseManager

用例管理器，负责注册和执行用例。

```typescript
const manager = new UseCaseManager({
  enableLogging: true,                    // 启用日志
  enablePerformanceMonitoring: true,      // 启用性能监控
  enableTransaction: false,               // 启用事务管理
  defaultLogLevel: 'info',                // 日志级别
  container?: DIContainer                 // 自定义 DI 容器
});

// 方法
manager.register(useCase);                // 注册用例
await manager.execute(name, request);     // 执行用例
manager.hasUseCase(name);                 // 检查是否已注册
manager.getRegisteredUseCases();          // 获取所有用例
manager.getExecutionHistory();            // 获取执行历史
```

### SimpleDIContainer

简单依赖注入容器实现。

```typescript
const container = new SimpleDIContainer();

// 注册服务
container.register('UserService', new UserService());
container.registerFactory('Logger', () => new Logger());
container.registerSingleton('Database', () => new Database());

// 解析服务
const userService = container.resolve<UserService>('UserService');

// 检查/移除
container.has('UserService');
container.unregister('UserService');
```

### ArchitectureValidator

架构层次验证器，确保依赖规则。

```typescript
// 验证依赖关系
const valid = ArchitectureValidator.validateDependency(
  ArchitectureLayer.USE_CASES,
  ArchitectureLayer.ENTITIES
); // true

// 检查违规
const result = ArchitectureValidator.checkViolation(
  ArchitectureLayer.ENTITIES,
  ArchitectureLayer.FRAMEWORKS
);
// { valid: false, message: 'Dependency violation: ...' }
```

### Entity

实体基类，所有业务实体继承此类。

```typescript
class Order extends Entity<string> {
  constructor(id: string, public total: number) {
    super(id);
  }

  validate(): boolean {
    return this.total > 0;
  }
}
```

### Repository

数据访问抽象接口。

```typescript
interface Repository<TEntity> {
  findById(id: TEntity['id']): Promise<TEntity | null>;
  save(entity: TEntity): Promise<TEntity>;
  delete(id: TEntity['id']): Promise<boolean>;
  list?(options?: { page?: number; pageSize?: number }): Promise<TEntity[]>;
}
```

---

## 🎯 使用场景

### ✅ 适合使用整洁架构的场景

1. **中大型项目** - 需要清晰的代码组织
2. **长期维护项目** - 需要高可维护性
3. **多团队协作** - 需要明确的边界和契约
4. **测试驱动开发** - 需要高可测试性
5. **技术栈可能变化** - 需要框架独立

### ❌ 不适合使用整洁架构的场景

1. **小型原型项目** - 过度设计
2. **一次性脚本** - 不需要分层
3. **时间极度紧张** - 学习曲线较陡
4. **简单 CRUD 应用** - 可能过于复杂

---

## 📦 依赖倒置实现

### 传统方式 (错误)

```typescript
// ❌ 用例层直接依赖具体实现
class CreateUserUseCase {
  private db = new MySQLDatabase();  // 硬编码依赖
  
  async execute(user: User) {
    await this.db.save(user);
  }
}
```

### 整洁架构方式 (正确)

```typescript
// ✅ 用例层依赖抽象接口
interface UserRepository {
  save(user: User): Promise<void>;
}

class CreateUserUseCase {
  constructor(private repo: UserRepository) {}  // 依赖注入
  
  async execute(user: User) {
    await this.repo.save(user);
  }
}

// 框架层实现接口
class MySQLUserRepository implements UserRepository {
  async save(user: User) {
    // MySQL 实现
  }
}

// 可以轻松替换为其他实现
class MongoUserRepository implements UserRepository {
  async save(user: User) {
    // MongoDB 实现
  }
}
```

---

## 🧪 测试示例

### 单元测试用例 (无需数据库)

```typescript
import { CreateUserUseCase } from './clean-arch-skill';

// Mock 仓库
class MockUserRepository {
  savedUsers: User[] = [];
  
  async save(user: User): Promise<User> {
    this.savedUsers.push(user);
    return user;
  }
  
  async findById(id: string): Promise<User | null> {
    return this.savedUsers.find(u => u.id === id) || null;
  }
}

// 测试
test('CreateUserUseCase should create user successfully', async () => {
  const mockRepo = new MockUserRepository();
  const useCase = new CreateUserUseCase(mockRepo);
  
  const result = await useCase.execute({
    request: { username: 'test', email: 'test@example.com' },
    timestamp: Date.now()
  });
  
  expect(result.success).toBe(true);
  expect(result.data?.username).toBe('test');
  expect(mockRepo.savedUsers.length).toBe(1);
});
```

### 集成测试

```typescript
test('Full flow with UseCaseManager', async () => {
  const manager = new UseCaseManager({ enableLogging: false });
  const repo = new InMemoryUserRepository();
  
  const useCase = new CreateUserUseCase(repo);
  manager.register(useCase);
  
  const result = await manager.execute('CreateUser', {
    username: 'john',
    email: 'john@example.com'
  });
  
  expect(result.success).toBe(true);
});
```

---

## 📊 最佳实践

### 1. 实体设计原则

```typescript
// ✅ 实体包含业务规则
class Order extends Entity {
  cancel(): void {
    if (this.status === 'shipped') {
      throw new Error('Cannot cancel shipped order');
    }
    this.status = 'cancelled';
  }
}

// ❌ 实体只是数据容器
class Order {
  id: string;
  status: string;
  // 没有业务逻辑
}
```

### 2. 用例单一职责

```typescript
// ✅ 每个用例只做一件事
class CreateUserUseCase {}
class DeleteUserUseCase {}
class UpdateUserUseCase {}

// ❌ 一个用例做所有事
class UserUseCase {
  create() {}
  delete() {}
  update() {}
}
```

### 3. 接口隔离

```typescript
// ✅ 小而专注的接口
interface Readable<T> {
  findById(id: string): Promise<T | null>;
}

interface Writable<T> {
  save(entity: T): Promise<void>;
}

class UserRepository implements Readable<User>, Writable<User> {}

// ❌ 大而全的接口
interface Repository {
  findById(); save(); delete(); list(); count(); search(); // ...
}
```

### 4. 依赖注入

```typescript
// ✅ 通过构造函数注入
class OrderService {
  constructor(
    private orderRepo: OrderRepository,
    private paymentService: PaymentService,
    private emailService: EmailService
  ) {}
}

// ❌ 硬编码依赖
class OrderService {
  private orderRepo = new OrderRepository();
  private paymentService = new PaymentService();
}
```

---

## 🔍 常见问题

### Q: 整洁架构和 DDD 有什么区别？

**A:** 整洁架构关注**代码组织**，DDD 关注**业务建模**。两者可以结合使用：

```
DDD (战略设计)          整洁架构
├── 限界上下文    →      分层结构
├── 聚合根        →      Entities
├── 值对象        →      Entities
└── 领域服务      →      Use Cases
```

### Q: 什么时候需要整洁架构？

**A:** 当你的项目满足以下条件时：
- 团队规模 > 3 人
- 预计维护时间 > 6 个月
- 需要高测试覆盖率
- 技术栈可能变化

### Q: 整洁架构会不会过度设计？

**A:** 对于小型项目可能是。评估标准：
- 代码行数 < 5000 → 可能不需要
- 团队 < 3 人 → 可能不需要
- 原型/POC → 不需要

---

## 📈 性能考虑

### 用例执行监控

```typescript
const manager = new UseCaseManager({
  enablePerformanceMonitoring: true
});

// 执行后查看性能
const history = manager.getExecutionHistory();
history.forEach(record => {
  console.log(`${record.useCaseName}: ${record.executionTime}ms`);
});

// 识别慢用例
const slowUseCases = history.filter(r => r.executionTime > 1000);
```

### 优化建议

1. **用例缓存** - 对读用例添加缓存层
2. **批量操作** - 合并多个写操作
3. **异步执行** - 非关键用例异步处理
4. **连接池** - 数据库连接复用

---

## 🛠️ 工具与扩展

### 内置工具类

- `SimpleDIContainer` - 依赖注入容器
- `InMemoryUserRepository` - 内存仓库示例
- `ArchitectureValidator` - 架构验证器

### 可扩展接口

- `Repository<T>` - 可集成各种数据库
- `Service<T>` - 可集成外部服务
- `UseCase<I, O>` - 可扩展业务逻辑

---

## 📄 许可证

MIT License

---

## 👤 作者

**Axon** - 至高意志执行者

---

## 📅 版本历史

- **v1.0.0** (2026-03-13) - 初始版本
  - 层次定义 (Entities, Use Cases, Interface Adapters, Frameworks)
  - 依赖倒置实现
  - 用例管理器
  - 依赖注入容器
  - 架构验证器

---

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

---

**最后更新:** 2026-03-13
