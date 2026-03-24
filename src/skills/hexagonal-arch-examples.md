# 六边形架构工具使用示例

**文件**: `hexagonal-arch-skill.ts`  
**作者**: KAEL  
**版本**: 1.0.0

---

## 快速开始

### 1. 基础使用

```typescript
import { HexagonalArchSkill } from './skills/hexagonal-arch-skill';

// 创建技能实例
const skill = new HexagonalArchSkill({
  corePath: './src/core',
  portsPath: './src/ports',
  adaptersPath: './src/adapters',
  enableTypeCheck: true,
  generateDocs: true,
});

// 执行命令
await skill.executeCommand(['create-port', 'user', 'inbound']);
```

---

## 示例 1: 创建端口定义

### 创建入站端口 (Inbound Port)

```bash
# CLI 方式
npx ts-node src/skills/hexagonal-arch-skill.ts create-port user inbound
```

```typescript
// TypeScript 方式
await skill.createPort(['user', 'inbound']);
```

**生成文件**: `src/ports/user-port.ts`

```typescript
/**
 * User 端口
 * 入站端口
 * 
 * @module ports/user
 * @version 1.0.0
 */

/**
 * User 端口接口
 */
export interface IUserPort {
  // TODO: 定义端口方法
  // 示例:
  // execute(command: UserCommand): Promise<UserResult>;
}

/**
 * User 命令
 */
export interface UserCommand {
  // TODO: 定义命令属性
}

/**
 * User 结果
 */
export interface UserResult {
  // TODO: 定义结果属性
}
```

### 创建出站端口 (Outbound Port)

```typescript
// 创建用户仓储端口
await skill.createPort(['user-repository', 'outbound']);

// 创建通知端口
await skill.createPort(['notification', 'outbound']);

// 创建日志端口
await skill.createPort(['logger', 'outbound']);
```

---

## 示例 2: 创建适配器实现

### 创建入站适配器 (Primary Adapter)

```typescript
// 创建 Express API 适配器
await skill.createAdapter(['express-api', 'user', 'primary']);
```

**生成文件**: `src/adapters/express-api-adapter.ts`

```typescript
/**
 * ExpressApi 适配器
 * 入站适配器
 * 
 * @module adapters/express-api
 * @version 1.0.0
 */

import { IUserPort } from '../ports/user-port';

/**
 * ExpressApi 适配器实现
 */
export class ExpressApiAdapter implements IUserPort {
  constructor() {
    // TODO: 初始化适配器依赖
  }

  // TODO: 实现端口方法
}
```

### 创建出站适配器 (Secondary Adapter)

```typescript
// 创建 SQLite 用户仓储适配器
await skill.createAdapter(['sqlite-user', 'user-repository', 'secondary']);

// 创建 SMTP 通知适配器
await skill.createAdapter(['smtp-notification', 'notification', 'secondary']);

// 创建 Winston 日志适配器
await skill.createAdapter(['winston-logger', 'logger', 'secondary']);
```

---

## 示例 3: 生成核心业务逻辑

```typescript
// 生成用户服务核心
await skill.generateCore(['user']);

// 生成订单服务核心
await skill.generateCore(['order']);

// 生成支付服务核心
await skill.generateCore(['payment']);
```

**生成文件**: `src/core/user-service.ts`

```typescript
/**
 * User 服务
 * 核心业务逻辑
 * 
 * @module core/user
 * @version 1.0.0
 */

import { IUserPort } from '../ports/user-port';
import { LoggerPort } from '../ports/logger-port';

/**
 * User 服务实现
 */
export class UserService implements IUserPort {
  constructor(
    // TODO: 注入依赖的端口
    // private repository: IRepositoryPort,
    private logger: LoggerPort,
  ) {}

  // TODO: 实现核心业务逻辑
}
```

---

## 示例 4: 架构验证

```typescript
// 验证六边形架构合规性
await skill.validateArchitecture([]);
```

**输出示例**:

```
Validating hexagonal architecture...
✅ No architecture violations found
```

或

```
Validating hexagonal architecture...
❌ Architecture violations found:
  - Core file src/core/user-service.ts should not import adapters
  - Port file src/ports/user-port.ts should export interfaces
```

---

## 示例 5: 完整依赖注入

```typescript
import {
  UserService,
  OrderService,
  SqliteUserRepositoryAdapter,
  PostgresOrderRepositoryAdapter,
  SmtpNotificationAdapter,
  WinstonLoggerAdapter,
} from './skills/hexagonal-arch-skill';

// 1. 创建适配器实例 (外层)
const userRepository = new SqliteUserRepositoryAdapter('./data/users.db');
const orderRepository = new PostgresOrderRepositoryAdapter('postgresql://localhost/orders');
const notificationService = new SmtpNotificationAdapter({
  host: 'smtp.example.com',
  port: 587,
  auth: { user: 'user', pass: 'pass' },
});
const logger = new WinstonLoggerAdapter({ level: 'info', format: 'json' });

// 2. 创建核心服务 (内层) - 依赖注入
const userService = new UserService(userRepository, notificationService, logger);
const orderService = new OrderService(orderRepository, userService, notificationService, logger);

// 3. 使用核心服务 - 不关心具体实现
async function main() {
  // 创建用户
  const user = await userService.createUser({
    email: 'test@example.com',
    name: 'Test User',
    password: 'securepassword',
  });

  // 创建订单
  const order = await orderService.createOrder(user.id, [
    { productId: 'prod_1', quantity: 2, unitPrice: 99.99 },
    { productId: 'prod_2', quantity: 1, unitPrice: 199.99 },
  ]);

  console.log('Created order:', order);
}
```

---

## 示例 6: 适配器切换 (无需修改核心逻辑)

```typescript
// 场景 1: 开发环境 - 使用 SQLite + 控制台日志
const devUserRepository = new SqliteUserRepositoryAdapter('./dev/users.db');
const devLogger = new ConsoleLoggerAdapter();
const devUserService = new UserService(devUserRepository, devLogger);

// 场景 2: 生产环境 - 使用 PostgreSQL + Winston 日志
const prodUserRepository = new PostgresUserRepositoryAdapter('postgresql://prod/users');
const prodLogger = new WinstonLoggerAdapter({ level: 'warn', format: 'json' });
const prodUserService = new UserService(prodUserRepository, prodLogger);

// 场景 3: 测试环境 - 使用内存仓储 + Mock 日志
const testUserRepository = new InMemoryUserRepositoryAdapter();
const testLogger = new MockLoggerAdapter();
const testUserService = new UserService(testUserRepository, testLogger);

// ✅ 核心业务逻辑完全相同，只是更换了适配器
```

---

## 示例 7: 端口定义最佳实践

```typescript
// ✅ 好的端口设计 - 面向业务

// 用户服务端口
export interface UserServicePort {
  getUserById(id: string): Promise<User | null>;
  createUser(data: CreateUserDto): Promise<User>;
  updateUser(id: string, data: UpdateUserDto): Promise<User>;
  deleteUser(id: string): Promise<void>;
}

// 订单服务端口
export interface OrderServicePort {
  createOrder(userId: string, items: OrderItem[]): Promise<Order>;
  cancelOrder(orderId: string): Promise<void>;
  getOrderStatus(orderId: string): Promise<OrderStatus>;
}

// ❌ 不好的端口设计 - 面向技术实现

// 不要这样设计:
export interface BadPort {
  saveToDatabase(data: any): Promise<void>;  // 暴露实现细节
  callExternalApi(url: string): Promise<any>; // 暴露技术细节
}
```

---

## 示例 8: 核心业务规则保护

```typescript
// 核心服务内部 - 保护业务规则
export class OrderService implements OrderServicePort {
  async cancelOrder(orderId: string): Promise<void> {
    const order = await this.orderRepository.findById(orderId);
    
    // ✅ 核心业务规则：只有待支付订单可以取消
    if (order.status !== OrderStatus.PENDING) {
      throw new BusinessRuleError('Only pending orders can be cancelled');
    }

    // ✅ 核心业务规则：订单创建后 30 分钟内可取消
    const now = new Date();
    const timeDiff = now.getTime() - order.createdAt.getTime();
    if (timeDiff > 30 * 60 * 1000) {
      throw new BusinessRuleError('Orders can only be cancelled within 30 minutes');
    }

    // 执行取消
    await this.orderRepository.update({
      ...order,
      status: OrderStatus.CANCELLED,
    });

    // 发送通知 (通过端口，不依赖具体实现)
    await this.notificationService.sendEmail(
      order.user.email,
      'Order Cancelled',
      `Your order #${order.id} has been cancelled.`,
    );
  }
}
```

---

## 目录结构示例

```
axonclaw/
├── src/
│   ├── core/                      # 核心层 (Domain Core)
│   │   ├── user-service.ts        # 用户服务实现
│   │   ├── order-service.ts       # 订单服务实现
│   │   └── payment-service.ts     # 支付服务实现
│   │
│   ├── ports/                     # 端口层 (Ports)
│   │   ├── inbound/
│   │   │   ├── api-port.ts        # API 端口
│   │   │   └── cli-port.ts        # CLI 端口
│   │   └── outbound/
│   │       ├── user-repository-port.ts    # 用户仓储端口
│   │       ├── order-repository-port.ts   # 订单仓储端口
│   │       ├── notification-port.ts       # 通知端口
│   │       └── logger-port.ts             # 日志端口
│   │
│   └── adapters/                  # 适配器层 (Adapters)
│       ├── primary/
│       │   ├── express-api-adapter.ts     # Express API 适配器
│       │   └── cli-adapter.ts             # CLI 适配器
│       └── secondary/
│           ├── sqlite-user-repository-adapter.ts
│           ├── postgres-order-repository-adapter.ts
│           ├── smtp-notification-adapter.ts
│           ├── redis-cache-adapter.ts
│           └── winston-logger-adapter.ts
│
└── tests/
    ├── core/                      # 核心层测试 (无需 Mock)
    ├── adapters/                  # 适配器层测试
    └── integration/               # 集成测试
```

---

## 依赖关系图

```
┌─────────────────────────────────────────────────────────┐
│                     External World                       │
│  (HTTP Requests, CLI Commands, Databases, APIs, etc.)   │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                   Primary Adapters                       │
│  (Express API Adapter, CLI Adapter, WebSocket Adapter)  │
│              实现入站端口 (Inbound Ports)                │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                    Inbound Ports                         │
│         (定义外部系统可以调用的接口)                      │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                   Application Core                       │
│     (UserService, OrderService, PaymentService)         │
│            核心业务逻辑 - 不依赖外层                     │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                   Outbound Ports                         │
│        (定义核心层需要的外部服务接口)                     │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                  Secondary Adapters                      │
│  (SQLite Adapter, PostgreSQL Adapter, SMTP Adapter)     │
│             实现出站端口 (Outbound Ports)                │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                     External World                       │
│         (Databases, Email Services, Cache, etc.)        │
└─────────────────────────────────────────────────────────┘
```

---

## 测试策略

### 核心层测试 (无需 Mock)

```typescript
import { UserService } from '../core/user-service';
import { InMemoryUserRepository } from './in-memory-user-repository';
import { MockNotificationService } from './mock-notification-service';

describe('UserService', () => {
  it('should create user successfully', async () => {
    // 使用内存仓储和 Mock 服务 - 快速、隔离
    const userRepository = new InMemoryUserRepository();
    const notificationService = new MockNotificationService();
    const userService = new UserService(userRepository, notificationService);

    const user = await userService.createUser({
      email: 'test@example.com',
      name: 'Test',
      password: 'pass',
    });

    expect(user.email).toBe('test@example.com');
    expect(notificationService.sentEmails.length).toBe(1);
  });
});
```

### 适配器层测试

```typescript
import { SqliteUserRepositoryAdapter } from '../adapters/sqlite-user-adapter';

describe('SqliteUserRepositoryAdapter', () => {
  let adapter: SqliteUserRepositoryAdapter;

  beforeEach(() => {
    adapter = new SqliteUserRepositoryAdapter(':memory:');
  });

  it('should save and find user', async () => {
    const user = await adapter.save({
      id: 'user_1',
      email: 'test@example.com',
      name: 'Test',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const found = await adapter.findById(user.id);
    expect(found).toEqual(user);
  });
});
```

---

## 常见问题 FAQ

### Q: 为什么要用六边形架构？

**A**: 
- ✅ **核心业务逻辑独立** - 不依赖框架、数据库、UI
- ✅ **易于测试** - 核心层可以独立测试，无需 Mock 外部依赖
- ✅ **易于维护** - 更换技术栈不影响核心逻辑
- ✅ **易于扩展** - 新增适配器无需修改核心代码

### Q: 什么时候需要六边形架构？

**A**:
- ✅ 业务逻辑复杂，需要长期维护
- ✅ 可能需要更换技术栈 (数据库、框架等)
- ✅ 需要高测试覆盖率
- ❌ 简单 CRUD 应用，快速原型

### Q: 如何避免过度设计？

**A**:
- 从简单开始，逐步演进
- 只在必要时创建端口和适配器
- 核心层保持精简，只包含业务规则
- 不要为未来可能的需求提前设计

---

## 参考资源

- **原始论文**: Alistair Cockburn - Hexagonal Architecture (2005)
- **相关模式**: Clean Architecture, DDD, Ports & Adapters
- **推荐书籍**: 《实现领域驱动设计》、《整洁架构之道》

---

**最后更新**: 2026-03-13  
**维护者**: KAEL
