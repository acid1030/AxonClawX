# 🏛️ Repository Pro Skill - 专业仓储模式

**版本:** 1.0.0  
**作者:** Axon (KAEL Engineering)  
**类型:** 数据持久化 / 仓储模式 / 查询构建器

---

## 📋 概述

Repository Pro Skill 提供了**企业级仓储模式实现**，支持泛型仓储、多种存储后端和链式查询构建器。

### 核心特性

- ✅ **泛型仓储接口** - 类型安全的 CRUD 操作
- ✅ **多存储后端** - Memory / FileSystem / Database (可扩展)
- ✅ **链式查询构建器** - 流畅的 API 设计
- ✅ **事件系统** - create/update/delete 事件监听
- ✅ **索引支持** - 可选字段索引加速查询
- ✅ **缓存机制** - 内置内存缓存提升性能
- ✅ **日志系统** - 可选的操作日志

---

## 🚀 快速开始

### 1. 基础使用

```typescript
import { MemoryRepository, BaseEntity } from './repository-pro-skill';

// 定义实体
interface User extends BaseEntity {
  username: string;
  email: string;
  age: number;
}

// 创建仓储
const userRepo = new MemoryRepository<User>();

// CRUD 操作
const user = await userRepo.create({
  username: 'alice',
  email: 'alice@example.com',
  age: 25,
});

const found = await userRepo.findById(user.id);
await userRepo.update(user.id, { age: 26 });
await userRepo.delete(user.id);
```

### 2. 查询构建器

```typescript
// 链式查询
const users = await userRepo.query()
  .where({ age: 25 })
  .orderBy('username', 'asc')
  .limit(10)
  .offset(0)
  .execute();

// 单个结果
const admin = await userRepo.query()
  .where({ role: 'admin' })
  .executeOne();

// 计数
const count = await userRepo.query()
  .where({ isActive: true })
  .count();
```

### 3. 事件监听

```typescript
userRepo.on('create', (user) => {
  console.log(`User created: ${user.username}`);
});

userRepo.on('update', (user) => {
  console.log(`User updated: ${user.username}`);
});

userRepo.on('delete', (user) => {
  console.log(`User deleted: ${user.username}`);
});
```

---

## 📦 API 参考

### IRepository<T, K>

仓储基础接口:

| 方法 | 描述 | 返回 |
|------|------|------|
| `findById(id)` | 根据 ID 查找 | `Promise<T \| null>` |
| `findAll()` | 查找所有 | `Promise<T[]>` |
| `findWhere(condition)` | 条件查找 | `Promise<T[]>` |
| `findOne(condition)` | 查找单个 | `Promise<T \| null>` |
| `create(data)` | 创建实体 | `Promise<T>` |
| `update(id, data)` | 更新实体 | `Promise<T \| null>` |
| `delete(id)` | 删除实体 | `Promise<boolean>` |
| `exists(id)` | 是否存在 | `Promise<boolean>` |
| `count()` | 计数 | `Promise<number>` |
| `clear()` | 清空仓储 | `Promise<void>` |
| `query()` | 创建查询构建器 | `IQueryBuilder<T>` |

### IQueryBuilder<T>

查询构建器接口:

| 方法 | 描述 | 返回 |
|------|------|------|
| `where(condition)` | 添加条件 | `this` |
| `orderBy(field, direction)` | 排序 | `this` |
| `limit(count)` | 限制数量 | `this` |
| `offset(count)` | 偏移量 | `this` |
| `execute()` | 执行查询 | `Promise<T[]>` |
| `executeOne()` | 执行查询 (单个) | `Promise<T \| null>` |
| `count()` | 计数 | `Promise<number>` |

### RepositoryConfig

仓储配置:

```typescript
interface RepositoryConfig {
  backend?: 'memory' | 'filesystem' | 'database';
  dataPath?: string;        // 文件系统路径
  enableIndex?: boolean;    // 启用索引
  indexFields?: string[];   // 索引字段
  enableCache?: boolean;    // 启用缓存
  cacheTTL?: number;        // 缓存 TTL (毫秒)
  enableLogging?: boolean;  // 启用日志
}
```

---

## 🏗️ 实现类

### MemoryRepository

**内存仓储** - 数据存储在内存中，适用于:
- 单元测试
- 临时数据
- 缓存层

```typescript
const repo = new MemoryRepository<User>();
```

### FileSystemRepository

**文件系统仓储** - 数据持久化到 JSON 文件，适用于:
- 小型应用
- 配置存储
- 本地数据持久化

```typescript
const repo = new FileSystemRepository<User>('users', {
  backend: 'filesystem',
  dataPath: './data',
  enableLogging: true,
});
```

### 自定义仓储

继承 `BaseRepository` 创建自定义仓储:

```typescript
class DatabaseRepository<T extends BaseEntity> extends BaseRepository<T> {
  private db: Database;

  constructor(config: RepositoryConfig) {
    super(config);
    this.db = connectToDatabase();
  }

  protected async initialize(): Promise<void> {
    // 初始化数据库连接
  }

  protected async persist(data: Map<K, T>): Promise<void> {
    // 持久化到数据库
  }

  protected async load(): Promise<Map<K, T>> {
    // 从数据库加载
  }
}
```

---

## 💡 使用示例

### 示例 1: 产品管理

```typescript
interface Product extends BaseEntity {
  name: string;
  price: number;
  category: string;
  stock: number;
}

const productRepo = new MemoryRepository<Product>();

// 创建产品
const product = await productRepo.create({
  name: 'MacBook Pro',
  price: 14999,
  category: 'electronics',
  stock: 50,
});

// 查询电子产品
const electronics = await productRepo.query()
  .where({ category: 'electronics' })
  .orderBy('price', 'desc')
  .limit(10)
  .execute();

// 库存不足的产品
const lowStock = await productRepo.query()
  .where({ stock: 10 })
  .execute();
```

### 示例 2: 订单系统

```typescript
interface Order extends BaseEntity {
  orderId: string;
  customerId: string;
  total: number;
  status: 'pending' | 'paid' | 'shipped' | 'delivered';
}

const orderRepo = new FileSystemRepository<Order>('orders', {
  dataPath: './data',
});

// 创建订单
const order = await orderRepo.create({
  orderId: 'ORD-20260313-001',
  customerId: 'CUST-001',
  total: 15999,
  status: 'pending',
});

// 更新状态
await orderRepo.update(order.id, { status: 'paid' });

// 查找客户订单
const customerOrders = await orderRepo.query()
  .where({ customerId: 'CUST-001' })
  .orderBy('createdAt', 'desc')
  .execute();
```

### 示例 3: 专用仓储类

```typescript
class UserRepository extends MemoryRepository<User> {
  async findByEmail(email: string) {
    return this.findOne({ email });
  }

  async findActiveUsers() {
    return this.query()
      .where({ isActive: true })
      .execute();
  }

  async deactivateUser(id: string) {
    return this.update(id, { isActive: false });
  }
}

// 使用
const userRepo = new UserRepository();
const user = await userRepo.findByEmail('alice@example.com');
const activeUsers = await userRepo.findActiveUsers();
```

---

## 🔧 高级功能

### 索引优化

```typescript
const repo = new MemoryRepository<User>({
  enableIndex: true,
  indexFields: ['email', 'username'],
});
```

### 缓存配置

```typescript
const repo = new MemoryRepository<User>({
  enableCache: true,
  cacheTTL: 60000, // 60 秒
});
```

### 事务性操作

```typescript
async function transferStock(fromId: string, toId: string, amount: number) {
  const fromProduct = await productRepo.findById(fromId);
  const toProduct = await productRepo.findById(toId);

  if (!fromProduct || !toProduct || fromProduct.stock < amount) {
    throw new Error('Invalid transfer');
  }

  await productRepo.update(fromId, { stock: fromProduct.stock - amount });
  await productRepo.update(toId, { stock: toProduct.stock + amount });
}
```

---

## 📊 性能建议

| 场景 | 推荐后端 | 配置建议 |
|------|----------|----------|
| 单元测试 | Memory | 默认配置 |
| 临时数据 | Memory | enableCache=true |
| 小型应用 | FileSystem | dataPath='./data' |
| 高频查询 | Memory + Index | enableIndex=true, indexFields=[...] |
| 大数据量 | 自定义 Database | 实现分页查询 |

---

## 🧪 测试

```typescript
import { MemoryRepository } from './repository-pro-skill';

describe('UserRepository', () => {
  let repo: MemoryRepository<User>;

  beforeEach(() => {
    repo = new MemoryRepository<User>();
  });

  it('should create user', async () => {
    const user = await repo.create({
      username: 'test',
      email: 'test@example.com',
      age: 25,
    });
    
    expect(user.id).toBeDefined();
    expect(user.username).toBe('test');
  });

  it('should find by id', async () => {
    const user = await repo.create({
      username: 'test',
      email: 'test@example.com',
      age: 25,
    });
    
    const found = await repo.findById(user.id);
    expect(found?.id).toBe(user.id);
  });

  it('should update user', async () => {
    const user = await repo.create({
      username: 'test',
      email: 'test@example.com',
      age: 25,
    });
    
    await repo.update(user.id, { age: 26 });
    const updated = await repo.findById(user.id);
    expect(updated?.age).toBe(26);
  });
});
```

---

## 📝 最佳实践

1. **为每个实体创建专用仓储类**
   - 继承 BaseRepository
   - 添加实体特定的查询方法

2. **使用查询构建器进行复杂查询**
   - 链式调用提高可读性
   - 避免手动过滤数组

3. **合理使用缓存**
   - 读多写少的场景启用缓存
   - 设置合适的 TTL

4. **事件驱动架构**
   - 使用事件监听器解耦业务逻辑
   - 实现审计日志、通知等功能

5. **错误处理**
   - 捕获并记录仓储操作异常
   - 提供友好的错误信息

---

## 🔄 扩展后端

实现新的存储后端:

```typescript
class RedisRepository<T extends BaseEntity> extends BaseRepository<T> {
  private redis: RedisClient;

  constructor(config: RepositoryConfig) {
    super(config);
    this.redis = new RedisClient();
  }

  protected async initialize(): Promise<void> {
    await this.redis.connect();
  }

  protected async persist(data: Map<K, T>): Promise<void> {
    const pipeline = this.redis.pipeline();
    data.forEach((entity, id) => {
      pipeline.set(`entity:${id}`, JSON.stringify(entity));
    });
    await pipeline.exec();
  }

  protected async load(): Promise<Map<K, T>> {
    const keys = await this.redis.keys('entity:*');
    const map = new Map<K, T>();
    
    for (const key of keys) {
      const value = await this.redis.get(key);
      if (value) {
        const entity = JSON.parse(value) as T;
        map.set(entity.id as K, entity);
      }
    }
    
    return map;
  }
}
```

---

## 📄 许可证

MIT License - Axon (KAEL Engineering)

---

## 🎯 运行示例

```bash
# 运行示例代码
npx ts-node src/skills/repository-pro-skill.examples.ts

# 或在 TypeScript 项目中导入
import { runAllExamples } from './repository-pro-skill.examples';
runAllExamples();
```

---

**创建时间:** 2026-03-13  
**最后更新:** 2026-03-13  
**状态:** ✅ 生产就绪
