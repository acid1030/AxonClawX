# Faker Utils - 假数据生成工具使用示例

## 📦 快速开始

```typescript
import faker from './faker-utils-skill';
// 或者
import { person, company, product, transaction } from './faker-utils-skill';
```

---

## 👤 人名生成

### 基础用法

```typescript
import faker from './faker-utils-skill';

// 生成随机姓名 (自动中英文)
console.log(faker.name());
// 输出示例："张伟" 或 "James Smith"

// 指定性别
console.log(faker.name('male'));    // "李强" 或 "Robert Johnson"
console.log(faker.name('female'));  // "王芳" 或 "Mary Williams"

// 指定语言环境
console.log(faker.name('random', 'zh'));  // "刘洋"
console.log(faker.name('random', 'en'));  // "Michael Davis"
```

### 单独生成

```typescript
// 只生成姓氏
console.log(faker.surname('zh'));  // "王"
console.log(faker.surname('en'));  // "Smith"

// 只生成名字
console.log(faker.firstName('male', 'zh'));    // "伟"
console.log(faker.firstName('female', 'en'));  // "Jennifer"

// 中文专用
console.log(faker.chineseName('male'));    // "赵磊"
console.log(faker.chineseName('female'));  // "孙丽"

// 英文专用
console.log(faker.englishName('male'));    // "David Brown"
console.log(faker.englishName('female'));  // "Sarah Miller"
```

---

## 📍 地址生成

### 完整地址

```typescript
const addr = faker.address('zh');
console.log(addr);
// 输出示例:
// {
//   street: "朝阳区 和平路 1234 号",
//   city: "北京",
//   state: "北京",
//   zipCode: "100023",
//   country: "中国",
//   full: "朝阳区 和平路 1234 号，北京，北京 100023, 中国"
// }
```

### 单独组件

```typescript
console.log(faker.city());      // "上海" 或 "New York"
console.log(faker.country());   // "中国" 或 "USA"
console.log(faker.zipCode('zh')); // "200030"
console.log(faker.zipCode('en')); // "90210"
```

---

## 📧 联系方式生成

```typescript
// 邮箱
console.log(faker.email());              // "abc123@gmail.com"
console.log(faker.email('张三'));         // "zhang.san@163.com"
console.log(faker.email('John Smith'));  // "john.smith@yahoo.com"

// 电话
console.log(faker.phone('zh'));  // "13812345678"
console.log(faker.phone('en'));  // "(555) 123-4567"
console.log(faker.phone());      // 随机
```

---

## 🏢 公司数据生成

### 完整公司信息

```typescript
const comp = faker.company();
console.log(comp);
// 输出示例:
// {
//   name: "智能 科技 有限公司",
//   industry: "人工智能",
//   catchPhrase: "创新引领未来",
//   bs: "整合核心资源",
//   email: "智能科技有限公司@gmail.com",
//   website: "www.智能科技有限公司.com",
//   phone: "13987654321",
//   address: { ... },
//   employeeCount: 523,
//   foundedYear: 2015
// }
```

### 单独组件

```typescript
console.log(faker.companyName());   // "高端 显示器 Corp"
console.log(faker.industry());      // "金融科技"
console.log(faker.catchPhrase());   // "品质成就卓越"
```

---

## 📦 产品数据生成

### 完整产品信息

```typescript
const prod = faker.product();
console.log(prod);
// 输出示例:
// {
//   name: "智能 手机 X12",
//   category: "电子产品",
//   price: 2999.99,
//   sku: "SKU-ABCD1234",
//   description: "High-quality 智能 手机 x12 designed for modern needs.",
//   stock: 1523,
//   rating: 4.5
// }
```

### 单独组件

```typescript
console.log(faker.productName());      // "专业 耳机 Pro"
console.log(faker.productCategory());  // "美妆"
console.log(faker.price(1000, 5000));  // 3299.50 (指定价格范围)
```

---

## 📅 时间数据生成

```typescript
// 随机日期
console.log(faker.date());
// 输出：2018-07-23T14:30:00.000Z

// 指定范围
const start = new Date(2020, 0, 1);
const end = new Date(2023, 11, 31);
console.log(faker.date(start, end));

// 过去的时间
console.log(faker.past(30));    // 过去 30 天内
console.log(faker.past(365));   // 过去 1 年内

// 未来的时间
console.log(faker.future(30));   // 未来 30 天内
console.log(faker.future(365));  // 未来 1 年内

// 最近
console.log(faker.recent());  // 过去 30 天内

// 时间戳
console.log(faker.timestamp());  // 1678901234567
console.log(faker.timestamp(1609459200000, 1640995199000));  // 指定范围
```

---

## 💰 金融数据生成

### 信用卡信息

```typescript
const card = faker.creditCard();
console.log(card);
// 输出示例:
// {
//   type: "Visa",
//   number: "4532 1234 5678 9012",
//   cvv: "123",
//   expiryDate: "08/28",
//   holderName: "李明"
// }
```

### 银行账户

```typescript
console.log(faker.accountNumber());  // "1234567890"
```

### 交易记录

```typescript
const trans = faker.transaction();
console.log(trans);
// 输出示例:
// {
//   id: "550e8400-e29b-41d4-a716-446655440000",
//   amount: 1299.99,
//   currency: "CNY",
//   type: "debit",
//   date: 2023-06-15T10:30:00.000Z,
//   description: "Payment for 智能 手机 x12",
//   accountNumber: "9876543210"
// }
```

### 货币金额

```typescript
const amt = faker.amount('USD', 100, 1000);
console.log(amt);
// 输出示例:
// {
//   amount: 567.89,
//   currency: "USD",
//   formatted: "$567.89"
// }

console.log(faker.amount('CNY', 1000, 5000));
// { amount: 3299.00, currency: "CNY", formatted: "¥3,299" }

console.log(faker.amount('EUR'));
// { amount: 234.56, currency: "EUR", formatted: "€234.56" }
```

---

## 🧑 完整个人信息

```typescript
const p = faker.person('female', 'zh');
console.log(p);
// 输出示例:
// {
//   firstName: "芳",
//   lastName: "李",
//   fullName: "李芳",
//   gender: "female",
//   email: "li.fang@qq.com",
//   phone: "13812345678",
//   address: {
//     street: "越秀区 中山路 567 号",
//     city: "广州",
//     state: "广东",
//     zipCode: "510030",
//     country: "中国",
//     full: "..."
//   },
//   birthDate: 1995-03-15T00:00:00.000Z,
//   age: 31
// }
```

---

## 🔧 工具函数

```typescript
// 随机整数
console.log(faker.randomInt(1, 100));  // 42

// 随机选择数组元素
const colors = ['红', '绿', '蓝'];
console.log(faker.randomChoice(colors));  // "蓝"

// 随机字符串
console.log(faker.randomString(8));  // "aB3dE9fG"
console.log(faker.randomString(6, '0123456789'));  // "123456"

// UUID
console.log(faker.uuid());  // "550e8400-e29b-41d4-a716-446655440000"
```

---

## 🎯 实际应用场景

### 1. 生成测试用户数据

```typescript
// 生成 10 个测试用户
const users = Array.from({ length: 10 }, (_, i) => ({
  id: i + 1,
  ...faker.person('random', Math.random() > 0.5 ? 'zh' : 'en'),
  createdAt: faker.past(365)
}));

console.table(users);
```

### 2. 生成电商产品列表

```typescript
// 生成 20 个产品
const products = Array.from({ length: 20 }, (_, i) => ({
  id: i + 1,
  ...faker.product(),
  createdAt: faker.date(new Date(2023, 0, 1), new Date(2024, 0, 1))
}));

console.table(products);
```

### 3. 生成公司名录

```typescript
// 生成 15 家公司
const companies = Array.from({ length: 15 }, (_, i) => ({
  id: i + 1,
  ...faker.company(),
  rating: parseFloat((Math.random() * 2 + 3).toFixed(1))
}));

console.table(companies);
```

### 4. 生成银行交易记录

```typescript
// 生成 50 条交易记录
const transactions = Array.from({ length: 50 }, (_, i) => ({
  id: i + 1,
  ...faker.transaction(),
  status: Math.random() > 0.1 ? 'completed' : 'pending'
}));

console.table(transactions);
```

### 5. 生成订单数据

```typescript
interface Order {
  orderId: string;
  customer: ReturnType<typeof faker.person>;
  products: Array<{
    name: string;
    price: number;
    quantity: number;
  }>;
  total: number;
  orderDate: Date;
  shippingAddress: ReturnType<typeof faker.address>;
  status: 'pending' | 'processing' | 'shipped' | 'delivered';
}

const order: Order = {
  orderId: faker.uuid(),
  customer: faker.person(),
  products: Array.from({ length: 3 }, () => ({
    name: faker.productName(),
    price: faker.price(100, 5000),
    quantity: faker.randomInt(1, 5)
  })),
  total: faker.amount('CNY', 500, 20000).amount,
  orderDate: faker.recent(),
  shippingAddress: faker.address('zh'),
  status: ['pending', 'processing', 'shipped', 'delivered'][
    faker.randomInt(0, 3)
  ] as any
};

console.log(order);
```

---

## 📊 性能提示

- ✅ 所有函数都是纯函数，无副作用
- ✅ 使用 `crypto.randomUUID()` 生成 UUID，加密安全
- ✅ 无外部依赖，纯 TypeScript 实现
- ✅ 支持中英文双语环境

---

## ⚠️ 注意事项

1. **仅供测试使用** - 生成的数据为假数据，不可用于真实业务
2. **信用卡信息** - 生成的卡号不符合 Luhn 算法，无法通过真实验证
3. **电话号码** - 可能生成真实存在的号码，请勿用于骚扰
4. **邮箱地址** - 可能巧合匹配真实邮箱，请勿发送真实邮件

---

**生成时间:** 2026-03-13  
**版本:** 1.0.0  
**作者:** Axon (NOVA)
