# 🚀 Repository Pro Skill - 快速开始指南

## 5 分钟上手

### 1️⃣ 安装与导入

```typescript
import { MemoryRepository, FileSystemRepository, BaseEntity } from './repository-pro-skill';
```

### 2️⃣ 定义实体

```typescript
interface User extends BaseEntity {
  username: string;
  email: string;
  age: number;
  role: 'admin' | 'user';
  isActive: boolean;
}
```

### 3️⃣ 创建仓储

```typescript
// 内存仓储 (测试/临时数据)
const userRepo = new MemoryRepository<User>();

// 文件系统仓储 (持久化)
const userRepo = new FileSystemRepository<User>('users', {
  dataPath: './data',
  enableLogging: true,
});
```

### 4️⃣ CRUD 操作

```typescript
// 创建
const user = await userRepo.create({
  username: 'alice',
  email: 'alice@example.com',
  age: 25,
  role: 'admin',
  isActive: true,
});

// 查找
const found = await userRepo.findById(user.id);
const all = await userRepo.findAll();
const admins = await userRepo.findWhere({ role: 'admin' });

// 更新
await userRepo.update(user.id, { age: 26 });

// 删除
await userRepo.delete(user.id);

// 计数
const count = await userRepo.count();
```

### 5️⃣ 查询构建器

```typescript
// 链式查询
const activeAdmins = await userRepo.query()
  .where({ role: 'admin', isActive: true })
  .orderBy('age', 'desc')
  .limit(10)
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

### 6️⃣ 事件监听

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

## 💡 常用场景

### 场景 1: 产品管理

```typescript
interface Product extends BaseEntity {
  name: string;
  price: number;
  category: string;
  stock: number;
}

const productRepo = new MemoryRepository<Product>();

// 查找价格低于 10000 的电子产品
const cheapElectronics = await productRepo.query()
  .where({ category: 'electronics' })
  .where({ price: 10000 })
  .orderBy('price', 'asc')
  .execute();
```

### 场景 2: 订单系统

```typescript
interface Order extends BaseEntity {
  orderId: string;
  customerId: string;
  total: number;
  status: 'pending' | 'paid' | 'shipped';
}

const orderRepo = new FileSystemRepository<Order>('orders');

// 查找客户的订单
const orders = await orderRepo.query()
  .where({ customerId: 'CUST-001' })
  .orderBy('createdAt', 'desc')
  .execute();
```

### 场景 3: 专用仓储类

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
```

---

## 📊 配置选项

```typescript
const repo = new MemoryRepository<User>({
  backend: 'memory',           // 存储后端：memory | filesystem
  dataPath: './data',          // 文件系统路径
  enableIndex: true,           // 启用索引
  indexFields: ['email'],      // 索引字段
  enableCache: true,           // 启用缓存
  cacheTTL: 60000,            // 缓存 TTL (毫秒)
  enableLogging: true,        // 启用日志
});
```

---

## 🧪 运行示例

```bash
# 运行完整示例
npx ts-node src/skills/repository-pro-skill.examples.ts

# 或在代码中导入
import { runAllExamples } from './repository-pro-skill.examples';
await runAllExamples();
```

---

## 📚 更多文档

- 完整 API: [REPOSITORY-README.md](./REPOSITORY-README.md)
- 示例代码: [repository-pro-skill.examples.ts](./repository-pro-skill.examples.ts)
- 源码: [repository-pro-skill.ts](./repository-pro-skill.ts)

---

**创建时间:** 2026-03-13  
**状态:** ✅ 生产就绪
