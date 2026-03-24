# 工厂模式使用示例

本文档展示如何使用 `factory-pattern-skill.ts` 中实现的三种工厂模式。

## 安装与导入

```typescript
import FactorySkill, {
  // 工厂方法
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
  
  // 示例函数
  exampleFactoryMethod,
  exampleAbstractFactory,
  exampleObjectPool,
} from './src/skills/factory-pattern-skill';
```

---

## 1. 工厂方法模式 (Factory Method)

### 基础用法

```typescript
// 创建工厂实例
const dbFactory = new DatabaseFactory();
const apiFactory = new ApiClientFactory();
const loggerFactory = new LoggerFactory();

// 创建并初始化产品
const db = await dbFactory.createAndInitialize('localhost', 5432);
const api = await apiFactory.createAndInitialize('https://api.example.com');
const logger = await loggerFactory.createAndInitialize('debug');

// 使用产品
logger.log('Application started');
await api.request('/users');
await db.disconnect();
```

### 使用工厂注册表

```typescript
// 获取单例注册表
const registry = FactoryRegistry.getInstance();

// 注册工厂
registry.register('database', new DatabaseFactory());
registry.register('api', new ApiClientFactory());
registry.register('logger', new LoggerFactory());

// 查询已注册的工厂
console.log('Available factories:', registry.listFactories());
// 输出: ['database', 'api', 'logger']

// 从注册表获取工厂并创建产品
const dbFactory = registry.getFactory<DatabaseConnection>('database');
const db = await dbFactory.createAndInitialize('192.168.1.100', 3306);
```

### 自定义产品与工厂

```typescript
// 创建自定义产品
class EmailService extends BaseProduct {
  constructor(smtpHost: string) {
    super(`Email-${smtpHost}`);
  }

  async execute(): Promise<void> {
    console.log(`[Email] Connecting to SMTP server...`);
    await this.sleep(100);
    console.log(`[Email] Connected: ${this.name}`);
  }

  async send(to: string, subject: string, body: string): Promise<void> {
    console.log(`[Email] Sending to ${to}: ${subject}`);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// 创建对应工厂
class EmailServiceFactory extends ProductFactory<EmailService> {
  create(smtpHost: string): EmailService {
    console.log(`[Factory] Creating email service: ${smtpHost}`);
    return new EmailService(smtpHost);
  }
}

// 使用
const emailFactory = new EmailServiceFactory();
const email = await emailFactory.createAndInitialize('smtp.gmail.com');
await email.send('user@example.com', 'Hello', 'Test email');
```

---

## 2. 抽象工厂模式 (Abstract Factory)

### 基础用法

```typescript
// 获取管理器单例
const manager = InfrastructureFactoryManager.getInstance();

// 注册基础设施工厂
manager.register('postgres', new PostgresFactory());
manager.register('mongo', new MongoFactory());

// 选择技术栈
manager.use('postgres');

// 创建完整的基础设施栈
const infra = manager.createInfrastructure();
// 返回: { database, cache, messaging }

// 使用基础设施
await infra.database.connect();
await infra.database.query('SELECT * FROM users');
await infra.cache.set('user:1', { name: 'John' }, 3600);
await infra.messaging.publish('events', { type: 'user.created' });
await infra.database.disconnect();
```

### 切换技术栈

```typescript
// 使用 PostgreSQL 技术栈
manager.use('postgres');
const postgresStack = manager.createInfrastructure();
// 包含: PostgresDatabase + RedisCache + KafkaMessaging

// 切换到 MongoDB 技术栈
manager.use('mongo');
const mongoStack = manager.createInfrastructure();
// 包含: MongoDatabase + MemoryCache + RabbitMQMessaging
```

### 自定义技术栈

```typescript
// 定义自定义产品族
class CustomDatabase implements IDatabaseProduct {
  async connect(): Promise<void> { /* ... */ }
  async query(sql: string): Promise<any> { /* ... */ }
  async disconnect(): Promise<void> { /* ... */ }
}

class CustomCache implements ICacheProduct {
  async get(key: string): Promise<any> { /* ... */ }
  async set(key: string, value: any): Promise<void> { /* ... */ }
  async delete(key: string): Promise<void> { /* ... */ }
}

class CustomMessaging implements IMessagingProduct {
  async publish(topic: string, message: any): Promise<void> { /* ... */ }
  async subscribe(topic: string, callback: any): Promise<void> { /* ... */ }
  async unsubscribe(topic: string): Promise<void> { /* ... */ }
}

// 创建自定义工厂
class CustomFactory implements IInfrastructureFactory {
  getName(): string {
    return 'Custom Stack';
  }

  createDatabase(): IDatabaseProduct {
    return new CustomDatabase();
  }

  createCache(): ICacheProduct {
    return new CustomCache();
  }

  createMessaging(): IMessagingProduct {
    return new CustomMessaging();
  }
}

// 注册并使用
manager.register('custom', new CustomFactory());
manager.use('custom');
const customStack = manager.createInfrastructure();
```

---

## 3. 对象池模式 (Object Pool)

### 基础用法

```typescript
// 创建对象池
const pool = new ObjectPool<DatabaseConnection & IPooledProduct>(
  // 对象工厂函数
  async () => {
    const conn = new DatabaseConnection({ host: 'localhost', port: 5432 });
    await conn.execute();
    return conn as DatabaseConnection & IPooledProduct;
  },
  // 池配置
  {
    maxSize: 10,        // 最大对象数
    minSize: 3,         // 最小对象数
    acquireTimeout: 5000, // 获取超时 (ms)
    validationInterval: 30000, // 验证间隔 (ms)
  }
);

// 初始化池
await pool.initialize();

// 查看池状态
console.log(pool.getStatus());
// 输出: { total: 3, available: 3, inUse: 0, maxSize: 10, minSize: 3 }

// 获取对象
const conn1 = await pool.acquire();
console.log('Acquired:', conn1._poolId);

// 使用对象
await conn1.execute();

// 释放对象回池
pool.release(conn1);

// 关闭池
await pool.close();
```

### 并发使用

```typescript
// 创建任务并发执行
const tasks: Promise<void>[] = [];

for (let i = 0; i < 10; i++) {
  tasks.push((async (taskId: number) => {
    // 从池中获取连接
    const conn = await pool.acquire();
    console.log(`[Task ${taskId}] Using: ${conn._poolId}`);
    
    try {
      // 执行数据库操作
      await conn.execute();
      await new Promise(resolve => setTimeout(resolve, 100));
    } finally {
      // 确保释放连接
      pool.release(conn);
      console.log(`[Task ${taskId}] Released`);
    }
  })(i));
}

// 等待所有任务完成
await Promise.all(tasks);

// 查看最终状态
console.log('Final status:', pool.getStatus());
```

### 使用预定义连接池

```typescript
// 获取数据库连接池
const pool = await PooledConnectionFactory.getDatabasePool({
  host: 'localhost',
  port: 5432,
  poolSize: 10,
});

// 使用池
const conn = await pool.acquire();
await conn.execute();
pool.release(conn);

// 关闭池
await PooledConnectionFactory.closeDatabasePool();
```

### 自定义验证逻辑

```typescript
class ValidatedObjectPool extends ObjectPool<DatabaseConnection & IPooledProduct> {
  protected validate(obj: DatabaseConnection & IPooledProduct): boolean {
    // 基础验证
    if (!super.validate(obj)) {
      return false;
    }

    // 自定义验证：检查连接是否仍然有效
    // 这里可以添加实际的连接健康检查逻辑
    return true;
  }
}

const pool = new ValidatedObjectPool(
  async () => { /* ... */ },
  { /* ... */ }
);
```

---

## 4. 综合示例

### 完整应用场景

```typescript
async function initializeApplication(): Promise<void> {
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

  logger.log('System initialized');
  
  return async function cleanup() {
    await connectionPool.close();
    await infra.database.disconnect();
    logger.log('System shutdown');
  };
}

// 使用
const cleanup = await initializeApplication();
// ... 应用运行 ...
await cleanup();
```

---

## 5. 运行示例

可以直接运行内置的示例函数：

```typescript
import {
  exampleFactoryMethod,
  exampleAbstractFactory,
  exampleObjectPool,
  exampleCombined,
} from './src/skills/factory-pattern-skill';

// 运行各个示例
await exampleFactoryMethod();
await exampleAbstractFactory();
await exampleObjectPool();
await exampleCombined();
```

---

## 最佳实践

### 1. 工厂方法模式
- ✅ 适用于创建单一类型的对象
- ✅ 需要集中控制对象创建逻辑
- ✅ 希望解耦对象创建和使用
- ❌ 不适用于创建复杂对象族

### 2. 抽象工厂模式
- ✅ 适用于创建相关对象族
- ✅ 需要切换整个技术栈
- ✅ 保证产品族的一致性
- ❌ 增加系统复杂度

### 3. 对象池模式
- ✅ 适用于昂贵对象的重复使用
- ✅ 高并发场景
- ✅ 需要控制资源数量
- ❌ 增加内存占用
- ❌ 需要管理对象生命周期

### 通用建议

```typescript
// ✅ 好的实践：使用 try-finally 确保资源释放
const conn = await pool.acquire();
try {
  await conn.execute();
} finally {
  pool.release(conn);
}

// ✅ 好的实践：应用关闭时清理资源
await pool.close();
await manager.getCurrentFactory().createDatabase().disconnect();

// ❌ 避免：获取对象后不释放
const conn = await pool.acquire();
await conn.execute();
// 忘记 release - 会导致池耗尽!

// ❌ 避免：在池关闭后继续使用
await pool.close();
const conn = await pool.acquire(); // 抛出错误!
```

---

## 性能考虑

### 对象池大小配置

```typescript
// 低负载应用
const smallPool = new ObjectPool(factory, {
  maxSize: 5,
  minSize: 2,
});

// 高并发应用
const largePool = new ObjectPool(factory, {
  maxSize: 50,
  minSize: 10,
  acquireTimeout: 10000, // 更长的超时
});

// 监控池状态
setInterval(() => {
  const status = pool.getStatus();
  console.log(`Pool: ${status.inUse}/${status.total} in use`);
  
  if (status.inUse / status.total > 0.8) {
    console.warn('Pool usage high, consider increasing maxSize');
  }
}, 5000);
```

---

## 故障排除

### 常见问题

**Q: 池耗尽错误 (Pool exhausted)**
```typescript
// 解决方案 1: 增加 maxSize
const pool = new ObjectPool(factory, { maxSize: 20 });

// 解决方案 2: 确保释放对象
try {
  const obj = await pool.acquire();
  // ...
} finally {
  pool.release(obj);
}

// 解决方案 3: 增加 acquireTimeout
const pool = new ObjectPool(factory, { acquireTimeout: 10000 });
```

**Q: 对象验证失败**
```typescript
// 自定义验证逻辑
class MyPool extends ObjectPool<MyObject> {
  protected validate(obj: MyObject): boolean {
    // 添加健康检查
    return obj.isConnected() && !obj.isExpired();
  }
}
```

**Q: 内存泄漏**
```typescript
// 确保应用关闭时清理
process.on('SIGINT', async () => {
  await pool.close();
  process.exit(0);
});
```

---

## 总结

工厂模式提供了强大的对象创建和管理机制：

- **工厂方法**: 简单灵活，适合单一对象创建
- **抽象工厂**: 适合创建相关对象族，支持技术栈切换
- **对象池**: 优化资源使用，适合高并发场景

根据具体场景选择合适的模式，或组合使用以获得最佳效果。
