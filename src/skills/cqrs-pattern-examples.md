# CQRS Pattern Skill - 使用示例

## 📋 目录

1. [快速开始](#快速开始)
2. [基础用法](#基础用法)
3. [高级用法](#高级用法)
4. [最佳实践](#最佳实践)

---

## 快速开始

### 1. 导入模块

```typescript
import {
  CQRSManager,
  SimpleEventBus,
  InMemoryDatabase,
  Command,
  Query,
  CommandHandler,
  QueryHandler
} from './src/skills/cqrs-pattern-skill';
```

### 2. 创建基础设施

```typescript
// 创建数据库实例
const database = new InMemoryDatabase();

// 创建事件总线 (可选，用于事件溯源)
const eventBus = new SimpleEventBus();

// 订阅事件
eventBus.subscribe('*', (event) => {
  console.log('Event:', event.type, event.data);
});
```

### 3. 定义命令和查询

```typescript
// 命令示例
interface CreateUserCommand extends Command {
  type: 'CreateUser';
  payload: {
    username: string;
    email: string;
    password: string;
  };
}

// 查询示例
interface GetUserQuery extends Query {
  type: 'GetUser';
  params: {
    userId: string;
  };
}
```

### 4. 实现处理器

```typescript
// 命令处理器
class CreateUserHandler implements CommandHandler<CreateUserCommand> {
  commandType = 'CreateUser';

  async execute(command: CreateUserCommand) {
    // 处理创建用户逻辑
    const user = await database.create('users', command.payload);
    
    return {
      success: true,
      data: user,
      commandId: command.id
    };
  }
}

// 查询处理器
class GetUserQueryHandler implements QueryHandler<GetUserQuery> {
  queryType = 'GetUser';

  async execute(query: GetUserQuery) {
    // 处理查询用户逻辑
    const user = await database.queryOne('users', u => u.id === query.params.userId);
    
    return {
      success: true,
      data: user,
      queryId: query.id
    };
  }
}
```

### 5. 配置并使用 CQRS

```typescript
// 创建 CQRS 管理器
const cqrs = new CQRSManager({
  enableLogging: true,
  enableEventSourcing: true,
  commandHandlers: [new CreateUserHandler()],
  queryHandlers: [new GetUserQueryHandler()],
  eventBus: eventBus
});

// 发送命令
const result = await cqrs.sendCommand({
  id: 'cmd-1',
  type: 'CreateUser',
  payload: { username: 'john', email: 'john@example.com', password: '123456' },
  timestamp: Date.now()
});

// 执行查询
const user = await cqrs.executeQuery({
  id: 'query-1',
  type: 'GetUser',
  params: { userId: result.data.id },
  timestamp: Date.now()
});
```

---

## 基础用法

### 命令处理 (写操作)

```typescript
// 定义订单相关命令
interface CreateOrderCommand extends Command {
  type: 'CreateOrder';
  payload: {
    userId: string;
    items: Array<{
      productId: string;
      quantity: number;
      price: number;
    }>;
    shippingAddress: string;
  };
}

interface CancelOrderCommand extends Command {
  type: 'CancelOrder';
  payload: {
    orderId: string;
    reason: string;
  };
}

// 创建订单处理器
class CreateOrderHandler implements CommandHandler<CreateOrderCommand> {
  commandType = 'CreateOrder';

  validate(command: CreateOrderCommand): boolean {
    return (
      command.payload.userId !== '' &&
      command.payload.items.length > 0 &&
      command.payload.shippingAddress !== ''
    );
  }

  async beforeExecute(command: CreateOrderCommand): Promise<void> {
    // 验证库存
    for (const item of command.payload.items) {
      const stock = await checkStock(item.productId);
      if (stock < item.quantity) {
        throw new Error(`Insufficient stock for product ${item.productId}`);
      }
    }
  }

  async execute(command: CreateOrderCommand) {
    const order = {
      id: generateOrderId(),
      userId: command.payload.userId,
      items: command.payload.items,
      status: 'pending',
      createdAt: Date.now()
    };

    await database.execute('orders', 'insert', order);

    // 扣减库存
    for (const item of command.payload.items) {
      await updateStock(item.productId, -item.quantity);
    }

    return { success: true, data: order, commandId: command.id };
  }

  async afterExecute(command: CreateOrderCommand, result: any): Promise<void> {
    if (result.success) {
      await sendNotification(command.payload.userId, 'Order created successfully');
    }
  }
}
```

### 查询处理 (读操作)

```typescript
// 定义订单查询
interface GetOrderQuery extends Query {
  type: 'GetOrder';
  params: {
    orderId: string;
  };
}

interface ListOrdersQuery extends Query {
  type: 'ListOrders';
  params: {
    userId?: string;
    status?: 'pending' | 'completed' | 'cancelled';
    dateFrom?: number;
    dateTo?: number;
  };
}

// 获取订单处理器
class GetOrderQueryHandler implements QueryHandler<GetOrderQuery> {
  queryType = 'GetOrder';

  async execute(query: GetOrderQuery) {
    const order = await database.queryOne(
      'orders_read_model',
      o => o.id === query.params.orderId
    );

    if (!order) {
      return {
        success: false,
        data: null,
        error: 'Order not found',
        queryId: query.id
      };
    }

    // 加载订单项
    const items = await database.query(
      'order_items_read_model',
      i => i.orderId === query.params.orderId
    );

    return {
      success: true,
      data: { ...order, items },
      queryId: query.id
    };
  }
}

// 列出订单处理器
class ListOrdersQueryHandler implements QueryHandler<ListOrdersQuery> {
  queryType = 'ListOrders';

  async execute(query: ListOrdersQuery) {
    let orders = await database.query('orders_read_model');

    // 应用筛选
    if (query.params.userId) {
      orders = orders.filter(o => o.userId === query.params.userId);
    }

    if (query.params.status) {
      orders = orders.filter(o => o.status === query.params.status);
    }

    if (query.params.dateFrom) {
      orders = orders.filter(o => o.createdAt >= query.params.dateFrom!);
    }

    if (query.params.dateTo) {
      orders = orders.filter(o => o.createdAt <= query.params.dateTo!);
    }

    // 应用分页
    const total = orders.length;
    if (query.pagination) {
      const start = (query.pagination.page - 1) * query.pagination.pageSize;
      const end = start + query.pagination.pageSize;
      orders = orders.slice(start, end);
    }

    // 应用排序
    if (query.sorting) {
      const { field, order } = query.sorting;
      orders.sort((a, b) => {
        const aVal = a[field];
        const bVal = b[field];
        return order === 'asc' ? aVal - bVal : bVal - aVal;
      });
    }

    return {
      success: true,
      data: orders,
      queryId: query.id,
      totalCount: total
    };
  }
}
```

---

## 高级用法

### 读写分离

```typescript
// 配置独立的读写数据库
const writeDatabase = new PostgreSQLDatabase({
  host: 'write-db.example.com',
  port: 5432,
  database: 'app_write'
});

const readDatabase = new PostgreSQLDatabase({
  host: 'read-db.example.com',
  port: 5432,
  database: 'app_read'
});

const cqrs = new CQRSManager({
  enableReadWriteSeparation: true,
  writeDatabase: writeDatabase,
  readDatabase: readDatabase,
  commandHandlers: [/* ... */],
  queryHandlers: [/* ... */]
});
```

### 事件溯源

```typescript
// 创建事件存储
class EventStore implements EventBus {
  private events: DomainEvent[] = [];

  async publish(event: DomainEvent): Promise<void> {
    this.events.push(event);
    // 持久化到事件存储数据库
    await saveEvent(event);
  }

  subscribe(eventType: string, handler: (event: DomainEvent) => void): void {
    // 订阅新事件
    eventSubscribers.on(eventType, handler);

    // 重放历史事件
    this.events
      .filter(e => e.type === eventType || eventType === '*')
      .forEach(handler);
  }

  unsubscribe(eventType: string, handler: (event: DomainEvent) => void): void {
    eventSubscribers.off(eventType, handler);
  }

  // 获取聚合根的所有事件
  async getEventsForAggregate(aggregateId: string): Promise<DomainEvent[]> {
    return this.events.filter(e => e.aggregateId === aggregateId);
  }
}

// 使用事件溯源
const eventStore = new EventStore();

const cqrs = new CQRSManager({
  enableEventSourcing: true,
  eventBus: eventStore,
  commandHandlers: [/* ... */],
  queryHandlers: [/* ... */]
});

// 订阅领域事件
eventStore.subscribe('OrderCreated', (event) => {
  console.log('Order created:', event.data);
  // 更新读模型
  updateOrderReadModel(event.data);
});
```

### 事务处理

```typescript
class TransferFundsHandler implements CommandHandler<TransferFundsCommand> {
  commandType = 'TransferFunds';

  async execute(command: TransferFundsCommand) {
    const { fromAccountId, toAccountId, amount } = command.payload;

    // 使用事务确保一致性
    await writeDatabase.transaction(async (db) => {
      // 检查余额
      const fromAccount = await db.queryOne(
        'SELECT * FROM accounts WHERE id = ?',
        [fromAccountId]
      );

      if (fromAccount.balance < amount) {
        throw new Error('Insufficient funds');
      }

      // 扣款
      await db.execute(
        'UPDATE accounts SET balance = balance - ? WHERE id = ?',
        [amount, fromAccountId]
      );

      // 收款
      await db.execute(
        'UPDATE accounts SET balance = balance + ? WHERE id = ?',
        [amount, toAccountId]
      );

      // 记录交易
      await db.execute(
        'INSERT INTO transactions (from_id, to_id, amount, created_at) VALUES (?, ?, ?, ?)',
        [fromAccountId, toAccountId, amount, Date.now()]
      );
    });

    return { success: true, commandId: command.id };
  }
}
```

### 性能监控

```typescript
// 启用性能监控
const cqrs = new CQRSManager({
  enableLogging: true,
  enablePerformanceMonitoring: true,
  commandHandlers: [/* ... */],
  queryHandlers: [/* ... */]
});

// 监控命令执行时间
cqrs.sendCommand(command).then(result => {
  if (result.executionTime && result.executionTime > 1000) {
    console.warn(`Slow command detected: ${command.type} took ${result.executionTime}ms`);
  }
});

// 监控查询执行时间
cqrs.executeQuery(query).then(result => {
  if (result.executionTime && result.executionTime > 500) {
    console.warn(`Slow query detected: ${query.type} took ${result.executionTime}ms`);
  }
});
```

---

## 最佳实践

### 1. 命令命名规范

```typescript
// ✅ 好的命名 - 使用动词 + 名词
type CreateUserCommand
type UpdateUserProfileCommand
type DeleteUserAccountCommand
type PlaceOrderCommand
type CancelOrderCommand

// ❌ 不好的命名
type UserCommand          // 太模糊
type CreateCommand        // 缺少名词
type UserCreationCommand  // 名词形式，不够直接
```

### 2. 查询命名规范

```typescript
// ✅ 好的命名 - 使用名词或 Get/List
type GetUserQuery
type ListUsersQuery
type SearchProductsQuery
type GetOrderDetailsQuery

// ❌ 不好的命名
type FetchUserQuery       // Fetch 不够明确
type QueryUsersQuery      // 重复
type FindUserQuery        // Find 语义模糊
```

### 3. 命令验证

```typescript
class CreateUserHandler implements CommandHandler<CreateUserCommand> {
  validate(command: CreateUserCommand): boolean {
    const { username, email, password } = command.payload;

    // 必填字段检查
    if (!username || !email || !password) {
      return false;
    }

    // 格式检查
    if (username.length < 3 || username.length > 50) {
      return false;
    }

    if (!isValidEmail(email)) {
      return false;
    }

    if (password.length < 8) {
      return false;
    }

    return true;
  }
}
```

### 4. 错误处理

```typescript
class OrderCommandHandler implements CommandHandler<CreateOrderCommand> {
  async execute(command: CreateOrderCommand) {
    try {
      // 业务逻辑
      const order = await createOrder(command.payload);
      
      return {
        success: true,
        data: order,
        commandId: command.id
      };
    } catch (error) {
      // 记录错误
      logger.error('Failed to create order', { 
        command, 
        error: error instanceof Error ? error.message : error 
      });

      // 返回友好的错误信息
      return {
        success: false,
        error: this.mapErrorToUserMessage(error),
        commandId: command.id
      };
    }
  }

  private mapErrorToUserMessage(error: any): string {
    if (error instanceof ValidationError) {
      return 'Invalid input data';
    }
    if (error instanceof NotFoundError) {
      return 'Resource not found';
    }
    if (error instanceof ConflictError) {
      return 'Resource already exists';
    }
    return 'An unexpected error occurred';
  }
}
```

### 5. 读模型优化

```typescript
// 为查询优化的读模型
interface OrderReadModel {
  id: string;
  userId: string;
  status: string;
  totalAmount: number;
  itemCount: number;
  createdAt: number;
  
  // 预计算字段，避免 JOIN
  userName: string;
  userEmail: string;
  shippingAddress: string;
  
  // 索引字段
  statusUpdatedAt: number;
}

// 使用物化视图
class OrderReadModelUpdater {
  @Subscribe('OrderCreated')
  async onOrderCreated(event: DomainEvent) {
    const order = event.data;
    
    // 更新读模型
    await readDatabase.execute(`
      INSERT INTO orders_read_model (
        id, user_id, status, total_amount, item_count, 
        user_name, user_email, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      order.id,
      order.userId,
      order.status,
      order.totalAmount,
      order.items.length,
      order.userName,
      order.userEmail,
      order.createdAt
    ]);
  }
}
```

### 6. 幂等性处理

```typescript
class IdempotentCommandHandler implements CommandHandler<CreatePaymentCommand> {
  private processedCommands = new Set<string>();

  async execute(command: CreatePaymentCommand) {
    // 检查命令是否已处理
    if (this.processedCommands.has(command.id)) {
      return {
        success: true,
        data: { message: 'Command already processed' },
        commandId: command.id,
        idempotent: true
      };
    }

    // 处理命令
    const result = await this.processPayment(command.payload);

    // 标记为已处理
    this.processedCommands.add(command.id);

    return {
      success: true,
      data: result,
      commandId: command.id
    };
  }
}
```

---

## 完整示例：电商订单系统

```typescript
import { CQRSManager, SimpleEventBus, Command, Query } from './cqrs-pattern-skill';

// ============ 命令定义 ============

interface AddToCartCommand extends Command {
  type: 'AddToCart';
  payload: {
    userId: string;
    productId: string;
    quantity: number;
  };
}

interface CheckoutCommand extends Command {
  type: 'Checkout';
  payload: {
    userId: string;
    shippingAddress: string;
    paymentMethod: string;
  };
}

// ============ 查询定义 ============

interface GetCartQuery extends Query {
  type: 'GetCart';
  params: {
    userId: string;
  };
}

interface GetOrderQuery extends Query {
  type: 'GetOrder';
  params: {
    orderId: string;
  };
}

// ============ 命令处理器 ============

class AddToCartHandler implements CommandHandler<AddToCartCommand> {
  commandType = 'AddToCart';

  async execute(command: AddToCartCommand) {
    const { userId, productId, quantity } = command.payload;

    // 检查库存
    const product = await getProduct(productId);
    if (product.stock < quantity) {
      return {
        success: false,
        error: 'Insufficient stock',
        commandId: command.id
      };
    }

    // 添加到购物车
    await addToCart(userId, productId, quantity);

    return {
      success: true,
      data: { message: 'Added to cart' },
      commandId: command.id
    };
  }
}

class CheckoutHandler implements CommandHandler<CheckoutCommand> {
  commandType = 'Checkout';

  async execute(command: CheckoutCommand) {
    const { userId, shippingAddress, paymentMethod } = command.payload;

    // 获取购物车
    const cart = await getCart(userId);
    if (cart.items.length === 0) {
      return {
        success: false,
        error: 'Cart is empty',
        commandId: command.id
      };
    }

    // 创建订单
    const order = await createOrder({
      userId,
      items: cart.items,
      shippingAddress,
      paymentMethod
    });

    // 清空购物车
    await clearCart(userId);

    return {
      success: true,
      data: { orderId: order.id },
      commandId: command.id
    };
  }
}

// ============ 查询处理器 ============

class GetCartQueryHandler implements QueryHandler<GetCartQuery> {
  queryType = 'GetCart';

  async execute(query: GetCartQuery) {
    const cart = await getCart(query.params.userId);
    
    return {
      success: true,
      data: cart,
      queryId: query.id
    };
  }
}

class GetOrderQueryHandler implements QueryHandler<GetOrderQuery> {
  queryType = 'GetOrder';

  async execute(query: GetOrderQuery) {
    const order = await getOrder(query.params.orderId);
    
    if (!order) {
      return {
        success: false,
        data: null,
        error: 'Order not found',
        queryId: query.id
      };
    }

    return {
      success: true,
      data: order,
      queryId: query.id
    };
  }
}

// ============ 使用示例 ============

async function main() {
  // 创建 CQRS 管理器
  const cqrs = new CQRSManager({
    enableLogging: true,
    commandHandlers: [
      new AddToCartHandler(),
      new CheckoutHandler()
    ],
    queryHandlers: [
      new GetCartQueryHandler(),
      new GetOrderQueryHandler()
    ]
  });

  // 添加商品到购物车
  const addToCartResult = await cqrs.sendCommand<AddToCartCommand>({
    id: 'cmd-1',
    type: 'AddToCart',
    payload: {
      userId: 'user-123',
      productId: 'product-456',
      quantity: 2
    },
    timestamp: Date.now()
  });

  console.log('Add to cart:', addToCartResult);

  // 查看购物车
  const cart = await cqrs.executeQuery<GetCartQuery>({
    id: 'query-1',
    type: 'GetCart',
    params: { userId: 'user-123' },
    timestamp: Date.now()
  });

  console.log('Cart:', cart);

  // 结账
  const checkoutResult = await cqrs.sendCommand<CheckoutCommand>({
    id: 'cmd-2',
    type: 'Checkout',
    payload: {
      userId: 'user-123',
      shippingAddress: '123 Main St',
      paymentMethod: 'credit_card'
    },
    timestamp: Date.now()
  });

  console.log('Checkout:', checkoutResult);

  // 查看订单
  if (checkoutResult.success) {
    const order = await cqrs.executeQuery<GetOrderQuery>({
      id: 'query-2',
      type: 'GetOrder',
      params: { orderId: checkoutResult.data.orderId },
      timestamp: Date.now()
    });

    console.log('Order:', order);
  }
}

main();
```

---

## 总结

CQRS 模式的核心优势：

✅ **读写分离** - 独立的读模型和写模型，可独立优化  
✅ **可扩展性** - 读库和写库可独立扩展  
✅ **性能优化** - 查询可针对读模型优化，无需复杂 JOIN  
✅ **事件溯源** - 天然支持事件溯源，便于审计和回溯  
✅ **清晰职责** - 命令和查询职责分离，代码更清晰  

⚠️ **注意事项**：
- 增加系统复杂度
- 需要处理数据一致性问题
- 适合读多写少的场景
- 小型项目可能过度设计

---

**版本:** 1.0.0  
**作者:** Axon  
**最后更新:** 2026-03-13
