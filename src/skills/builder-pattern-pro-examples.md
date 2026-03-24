# Builder Pattern Pro - 使用示例

**版本:** 1.0.0  
**作者:** Axon  
**创建时间:** 2026-03-13

---

## 📖 目录

1. [快速开始](#快速开始)
2. [基础用法](#基础用法)
3. [高级功能](#高级功能)
4. [实战场景](#实战场景)
5. [最佳实践](#最佳实践)

---

## 🚀 快速开始

### 安装

```typescript
import {
  createBuilder,
  createApiResponseBuilder,
  createQueryBuilder,
  AdvancedBuilder,
} from './builder-pattern-pro-skill';
```

### 最简单的例子

```typescript
// 定义对象原型
const userPrototype = {
  id: 0,
  name: '',
  email: '',
};

// 创建构建者并使用
const user = createBuilder(userPrototype)
  .set('id', 1)
  .set('name', '张三')
  .set('email', 'zhangsan@example.com')
  .build();

console.log(user);
// 输出：{ id: 1, name: '张三', email: 'zhangsan@example.com' }
```

---

## 📚 基础用法

### 1. 链式调用

```typescript
interface Product {
  id: number;
  name: string;
  price: number;
  description: string;
  inStock: boolean;
}

const productPrototype: Product = {
  id: 0,
  name: '',
  price: 0,
  description: '',
  inStock: true,
};

const product = createBuilder(productPrototype)
  .set('id', 101)
  .set('name', 'iPhone 15 Pro')
  .set('price', 7999)
  .set('description', '最新款苹果手机')
  .set('inStock', true)
  .build();
```

### 2. 批量设置字段

```typescript
const user = createBuilder(userPrototype)
  .setMany({
    id: 2,
    name: '李四',
    email: 'lisi@example.com',
  })
  .build();
```

### 3. 构建者重置

```typescript
const builder = createBuilder(userPrototype);

const user1 = builder
  .set('id', 1)
  .set('name', '用户 1')
  .build();

// 重置构建者
builder.reset();

const user2 = builder
  .set('id', 2)
  .set('name', '用户 2')
  .build();
```

### 4. 构建者克隆

```typescript
const baseBuilder = createBuilder(userPrototype)
  .set('email', 'default@example.com');

// 克隆构建者
const builder1 = baseBuilder.clone().set('id', 1).set('name', '用户 1');
const builder2 = baseBuilder.clone().set('id', 2).set('name', '用户 2');

const user1 = builder1.build();
const user2 = builder2.build();
```

---

## 🔥 高级功能

### 1. 验证器

```typescript
interface Order {
  orderId: string;
  amount: number;
  status: string;
  items: string[];
}

const orderPrototype: Order = {
  orderId: '',
  amount: 0,
  status: 'pending',
  items: [],
};

const order = createBuilder(orderPrototype, { strict: true })
  .set('orderId', 'ORD-20260313-001')
  .set('amount', 299.99)
  .set('status', 'paid')
  .set('items', ['商品 A', '商品 B'])
  
  // 添加验证器
  .addValidator((obj) => {
    if (!obj.orderId.startsWith('ORD-')) {
      throw new Error('订单号格式错误');
    }
    return true;
  })
  
  .addValidator((obj) => {
    if (obj.amount <= 0) {
      throw new Error('订单金额必须大于 0');
    }
    return true;
  })
  
  .addValidator((obj) => {
    if (obj.items.length === 0) {
      throw new Error('订单必须包含商品');
    }
    return true;
  })
  
  .build();
```

### 2. 转换器

```typescript
const product = createBuilder(productPrototype)
  .set('id', 1)
  .set('name', 'MacBook Pro')
  .set('price', 14999)
  .set('description', '高性能笔记本')
  
  // 添加转换器 - 自动添加税费
  .addTransformer((obj) => {
    if (obj.price) {
      obj.price = obj.price * 1.13; // 13% 增值税
    }
    return obj;
  })
  
  // 添加转换器 - 自动格式化描述
  .addTransformer((obj) => {
    if (obj.description) {
      obj.description = `[新品] ${obj.description}`;
    }
    return obj;
  })
  
  .build();

console.log(product.price); // 16948.67 (含税)
console.log(product.description); // "[新品] 高性能笔记本"
```

### 3. 调试模式

```typescript
const builder = createBuilder(userPrototype, {
  debug: true,  // 开启调试日志
});

const user = builder
  .set('id', 1)
  .set('name', '测试用户')
  .build();

// 查看构建日志
const logs = builder.getLogs();
console.log(logs);
// 输出:
// [2026-03-13T13:00:00.000Z] AdvancedBuilder initialized for Object
// [2026-03-13T13:00:00.001Z] Set id = 1
// [2026-03-13T13:00:00.002Z] Set name = "测试用户"
// [2026-03-13T13:00:00.003Z] Building product...
// [2026-03-13T13:00:00.004Z] Product built successfully: Object
```

### 4. 不可变模式

```typescript
const user = createBuilder(userPrototype, {
  immutable: true,  // 构建后对象不可修改
})
  .set('id', 1)
  .set('name', '不可变用户')
  .build();

// 尝试修改会失败
// user.name = '新名字'; // TypeError: Cannot assign to read only property
```

---

## 🎯 实战场景

### 场景 1: API 响应构建

```typescript
import { createApiResponseBuilder } from './builder-pattern-pro-skill';

interface UserData {
  id: number;
  name: string;
  email: string;
}

// 成功响应
const successResponse = createApiResponseBuilder<UserData>()
  .setData({
    id: 1,
    name: '张三',
    email: 'zhangsan@example.com',
  })
  .setRequestId('req-abc123')
  .build();

console.log(successResponse);
// {
//   success: true,
//   data: { id: 1, name: '张三', email: 'zhangsan@example.com' },
//   timestamp: 1710338400000,
//   requestId: 'req-abc123'
// }

// 错误响应
const errorResponse = createApiResponseBuilder<UserData>()
  .setError('用户不存在')
  .setRequestId('req-def456')
  .build();

console.log(errorResponse);
// {
//   success: false,
//   error: '用户不存在',
//   timestamp: 1710338400000,
//   requestId: 'req-def456'
// }
```

### 场景 2: SQL 查询构建

```typescript
import { createQueryBuilder } from './builder-pattern-pro-skill';

// 简单查询
const query1 = createQueryBuilder()
  .select(['id', 'name', 'email'])
  .from('users')
  .where('age > ?', 18)
  .build();

console.log(query1.sql);
// SELECT id, name, email FROM users WHERE age > ?

// 复杂查询
const query2 = createQueryBuilder()
  .select(['u.id', 'u.name', 'COUNT(o.id) as orderCount'])
  .from('users u')
  .where('u.status = ?', 'active')
  .where('u.created_at >= ?', '2026-01-01')
  .orderBy('orderCount', 'DESC')
  .limit(10)
  .offset(0)
  .build();

console.log(query2.sql);
// SELECT u.id, u.name, COUNT(o.id) as orderCount 
// FROM users u 
// WHERE u.status = ? AND u.created_at >= ? 
// ORDER BY orderCount DESC 
// LIMIT 10 OFFSET 0

console.log(query2.params);
// ['active', '2026-01-01']
```

### 场景 3: 复杂嵌套对象构建

```typescript
interface Address {
  street: string;
  city: string;
  province: string;
  zipCode: string;
}

interface Contact {
  phone: string;
  email: string;
  wechat?: string;
}

interface Employee {
  id: number;
  name: string;
  department: string;
  position: string;
  address: Address;
  contact: Contact;
  skills: string[];
  joinDate: Date;
}

// 创建子对象构建者
const addressBuilder = createBuilder<Address>({
  street: '',
  city: '',
  province: '',
  zipCode: '',
});

const contactBuilder = createBuilder<Contact>({
  phone: '',
  email: '',
  wechat: '',
});

// 构建子对象
const address = addressBuilder
  .set('street', '科技路 88 号')
  .set('city', '深圳市')
  .set('province', '广东省')
  .set('zipCode', '518000')
  .build();

const contact = contactBuilder
  .set('phone', '13800138000')
  .set('email', 'wangwu@company.com')
  .set('wechat', 'wangwu123')
  .build();

// 构建主对象
const employee = createBuilder<Employee>({
  id: 0,
  name: '',
  department: '',
  position: '',
  address: {} as Address,
  contact: {} as Contact,
  skills: [],
  joinDate: new Date(),
})
  .set('id', 1001)
  .set('name', '王五')
  .set('department', '技术部')
  .set('position', '高级开发工程师')
  .set('address', address)
  .set('contact', contact)
  .set('skills', ['TypeScript', 'React', 'Node.js'])
  .set('joinDate', new Date('2024-01-01'))
  .build();

console.log(employee);
```

### 场景 4: 配置对象构建

```typescript
interface ServerConfig {
  host: string;
  port: number;
  protocol: 'http' | 'https';
  timeout: number;
  retries: number;
  headers: Record<string, string>;
}

const defaultConfig: ServerConfig = {
  host: 'localhost',
  port: 3000,
  protocol: 'http',
  timeout: 5000,
  retries: 3,
  headers: {},
};

// 开发环境配置
const devConfig = createBuilder(defaultConfig)
  .set('host', 'localhost')
  .set('port', 3000)
  .set('timeout', 10000)
  .set('headers', { 'X-Env': 'development' })
  .build();

// 生产环境配置
const prodConfig = createBuilder(defaultConfig)
  .set('host', 'api.example.com')
  .set('port', 443)
  .set('protocol', 'https')
  .set('timeout', 30000)
  .set('retries', 5)
  .addValidator((obj) => {
    if (obj.protocol === 'https' && obj.port !== 443) {
      console.warn('HTTPS 通常使用 443 端口');
    }
    return true;
  })
  .build();
```

### 场景 5: 测试数据生成

```typescript
// 批量生成测试用户
function generateTestUsers(count: number) {
  const userPrototype = {
    id: 0,
    name: '',
    email: '',
    age: 0,
    isActive: true,
  };

  const users = [];
  
  for (let i = 1; i <= count; i++) {
    const user = createBuilder(userPrototype)
      .set('id', i)
      .set('name', `测试用户${i}`)
      .set('email', `test${i}@example.com`)
      .set('age', 20 + (i % 30))
      .set('isActive', i % 2 === 0)
      .build();
    
    users.push(user);
  }
  
  return users;
}

const testUsers = generateTestUsers(100);
console.log(`生成了 ${testUsers.length} 个测试用户`);
```

---

## 💡 最佳实践

### 1. 使用 TypeScript 接口定义原型

```typescript
// ✅ 推荐
interface User {
  id: number;
  name: string;
  email: string;
}

const userPrototype: User = {
  id: 0,
  name: '',
  email: '',
};

// ❌ 不推荐
const userPrototype = {
  id: 0,
  name: '',
  email: '',
}; // 缺少类型约束
```

### 2. 合理设置构建选项

```typescript
// 生产环境：开启严格验证
const builder = createBuilder(prototype, {
  strict: true,
  validate: true,
  immutable: true,
});

// 开发环境：开启调试
const devBuilder = createBuilder(prototype, {
  debug: true,
  validate: false, // 开发时跳过验证加速
});
```

### 3. 组合使用验证器和转换器

```typescript
const order = createBuilder(orderPrototype)
  // 先设置基础数据
  .set('amount', 100)
  
  // 添加验证
  .addValidator((obj) => obj.amount > 0)
  
  // 添加转换 (自动计算税费)
  .addTransformer((obj) => ({
    ...obj,
    amount: obj.amount * 1.13,
  }))
  
  .build();
```

### 4. 复用构建者模板

```typescript
// 创建基础构建者模板
function createBaseUserBuilder() {
  return createBuilder(userPrototype)
    .set('isActive', true)
    .set('email', 'default@example.com');
}

// 基于模板创建具体用户
const user1 = createBaseUserBuilder()
  .set('id', 1)
  .set('name', '用户 1')
  .build();

const user2 = createBaseUserBuilder()
  .set('id', 2)
  .set('name', '用户 2')
  .build();
```

### 5. 错误处理

```typescript
try {
  const product = createBuilder(productPrototype, { strict: true })
    .set('name', '') // 空名称
    .addValidator((obj) => {
      if (!obj.name) {
        throw new Error('产品名称不能为空');
      }
      return true;
    })
    .build();
} catch (error) {
  console.error('构建失败:', error.message);
  // 处理错误...
}
```

---

## 📊 API 参考

### 基础方法

| 方法 | 描述 | 返回值 |
|------|------|--------|
| `set(key, value)` | 设置单个字段 | `this` (链式) |
| `setMany(fields)` | 批量设置字段 | `this` (链式) |
| `build()` | 构建最终对象 | `T` |
| `reset()` | 重置构建状态 | `void` |
| `clone()` | 克隆构建者 | `Builder<T>` |

### 高级方法

| 方法 | 描述 | 返回值 |
|------|------|--------|
| `addValidator(fn)` | 添加验证器 | `this` (链式) |
| `addTransformer(fn)` | 添加转换器 | `this` (链式) |
| `getLogs()` | 获取构建日志 | `string[]` |
| `clearLogs()` | 清空日志 | `void` |

### 构建选项

| 选项 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| `strict` | `boolean` | `false` | 严格模式，验证失败抛出异常 |
| `immutable` | `boolean` | `false` | 不可变模式，构建后冻结对象 |
| `validate` | `boolean` | `true` | 自动验证 |
| `debug` | `boolean` | `false` | 调试模式，输出日志 |

---

## 🎓 总结

Builder Pattern Pro 提供了：

✅ **链式调用** - 优雅的 API 设计  
✅ **类型安全** - 完整的 TypeScript 支持  
✅ **灵活验证** - 自定义验证器  
✅ **数据转换** - 自动数据处理  
✅ **调试支持** - 构建过程可追溯  
✅ **不可变模式** - 安全的对象构建  

适用于：
- API 响应构建
- 数据库查询构建
- 配置对象管理
- 测试数据生成
- 复杂对象组装

---

**最后更新:** 2026-03-13  
**维护者:** Axon
