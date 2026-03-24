# 数据转换技能使用示例 - Transform Skill Examples

**版本:** 1.0.0  
**作者:** Axon  
**文件:** `src/skills/transform-skill.ts`

---

## 📋 目录

1. [对象映射](#1-对象映射)
2. [数组转换](#2-数组转换)
3. [数据格式化](#3-数据格式化)
4. [复合转换](#4-复合转换)
5. [实际场景](#5-实际场景)

---

## 1. 对象映射

### 1.1 基础字段映射

```typescript
import { transformObject } from './transform-skill';

// 源数据 (API 响应)
const apiResponse = {
  user_id: 123,
  user_name: 'axon',
  email_addr: 'axon@example.com',
  created_ts: 1704067200000
};

// 映射到前端格式
const user = transformObject(apiResponse, {
  fields: [
    { from: 'user_id', to: 'userId' },
    { from: 'user_name', to: 'username' },
    { from: 'email_addr', to: 'email' },
    { from: 'created_ts', to: 'createdAt', transform: (ts) => new Date(ts) }
  ]
});

console.log(user);
// {
//   userId: 123,
//   username: 'axon',
//   email: 'axon@example.com',
//   createdAt: Date(2024-01-01)
// }
```

### 1.2 嵌套字段提取

```typescript
import { transformObject } from './transform-skill';

const order = {
  id: 'ORD-001',
  customer: {
    name: 'Alice',
    contact: {
      phone: '123-456-7890',
      email: 'alice@example.com'
    }
  },
  items: [
    { product: 'Laptop', qty: 1 },
    { product: 'Mouse', qty: 2 }
  ]
};

const summary = transformObject(order, {
  fields: [
    { from: 'id', to: 'orderId' },
    { from: 'customer.name', to: 'customerName' },
    { from: 'customer.contact.phone', to: 'phone' },
    { from: 'items', to: 'itemCount', transform: (items) => items.length }
  ]
});

console.log(summary);
// {
//   orderId: 'ORD-001',
//   customerName: 'Alice',
//   phone: '123-456-7890',
//   itemCount: 2
// }
```

### 1.3 批量对象映射

```typescript
import { transformObjects } from './transform-skill';

const apiUsers = [
  { user_id: 1, user_name: 'axon', role: 'admin' },
  { user_id: 2, user_name: 'bob', role: 'user' },
  { user_id: 3, user_name: 'eve', role: 'user' }
];

const users = transformObjects(apiUsers, {
  fields: [
    { from: 'user_id', to: 'id' },
    { from: 'user_name', to: 'name' },
    { from: 'role', to: 'role' }
  ]
});

console.log(users);
// [
//   { id: 1, name: 'axon', role: 'admin' },
//   { id: 2, name: 'bob', role: 'user' },
//   { id: 3, name: 'eve', role: 'user' }
// ]
```

### 1.4 保留未映射字段 + 默认值

```typescript
import { transformObject } from './transform-skill';

const data = {
  id: 1,
  name: 'axon',
  extra: 'keep me',
  metadata: { version: '1.0' }
};

const result = transformObject(data, {
  fields: [
    { from: 'id', to: 'userId' },
    { from: 'name', to: 'username' }
  ],
  keepUnmapped: true,  // 保留 extra 和 metadata
  defaults: {
    status: 'active'  // 如果源数据没有 status，使用默认值
  }
});

console.log(result);
// {
//   userId: 1,
//   username: 'axon',
//   extra: 'keep me',
//   metadata: { version: '1.0' },
//   status: 'active'
// }
```

---

## 2. 数组转换

### 2.1 数组过滤

```typescript
import { filterArray } from './transform-skill';

const users = [
  { id: 1, name: 'axon', age: 25, active: true },
  { id: 2, name: 'bob', age: 17, active: true },
  { id: 3, name: 'eve', age: 30, active: false }
];

// 过滤成年且活跃的用户
const adults = filterArray(users, {
  predicate: (user) => user.age >= 18 && user.active
});

console.log(adults);
// [{ id: 1, name: 'axon', age: 25, active: true }]
```

### 2.2 数组映射

```typescript
import { mapArray } from './transform-skill';

const users = [
  { id: 1, name: 'axon', email: 'axon@example.com' },
  { id: 2, name: 'bob', email: 'bob@example.com' }
];

// 提取 ID 列表
const ids = mapArray(users, (user) => user.id);
console.log(ids);  // [1, 2]

// 转换为选择器选项
const options = mapArray(users, (user) => ({
  label: user.name,
  value: user.id
}));
console.log(options);
// [{ label: 'axon', value: 1 }, { label: 'bob', value: 2 }]
```

### 2.3 数组分组

```typescript
import { groupArray } from './transform-skill';

const users = [
  { id: 1, name: 'axon', role: 'admin' },
  { id: 2, name: 'bob', role: 'user' },
  { id: 3, name: 'eve', role: 'admin' },
  { id: 4, name: 'charlie', role: 'user' }
];

// 按角色分组
const byRole = groupArray(users, { key: 'role' });
console.log(byRole);
// {
//   admin: [{ id: 1, ... }, { id: 3, ... }],
//   user: [{ id: 2, ... }, { id: 4, ... }]
// }

// 使用函数作为分组键
const byFirstLetter = groupArray(users, {
  key: (user) => user.name.charAt(0).toUpperCase()
});
console.log(byFirstLetter);
// { A: [...], B: [...], E: [...], C: [...] }
```

### 2.4 数组排序

```typescript
import { sortArray } from './transform-skill';

const users = [
  { id: 1, name: 'axon', createdAt: '2024-03-01' },
  { id: 2, name: 'bob', createdAt: '2024-01-15' },
  { id: 3, name: 'eve', createdAt: '2024-02-20' }
];

// 按创建时间升序
const sortedAsc = sortArray(users, { field: 'createdAt', order: 'asc' });

// 按创建时间降序
const sortedDesc = sortArray(users, { field: 'createdAt', order: 'desc' });

// 自定义比较函数
const sortedByName = sortArray(users, {
  field: 'name',
  order: 'asc',
  compare: (a, b) => a.name.localeCompare(b.name)
});
```

### 2.5 数组去重

```typescript
import { uniqueArray } from './transform-skill';

const users = [
  { id: 1, name: 'axon' },
  { id: 1, name: 'axon-duplicate' },
  { id: 2, name: 'bob' },
  { id: 1, name: 'axon-another' }
];

// 按 ID 去重 (保留第一个)
const unique = uniqueArray(users, 'id');
console.log(unique);
// [{ id: 1, name: 'axon' }, { id: 2, name: 'bob' }]
```

### 2.6 数组分块

```typescript
import { chunkArray } from './transform-skill';

const items = [1, 2, 3, 4, 5, 6, 7, 8, 9];

// 分成每块 3 个
const chunks = chunkArray(items, 3);
console.log(chunks);
// [[1, 2, 3], [4, 5, 6], [7, 8, 9]]

// 用于分页处理
const pageSize = 10;
const pages = chunkArray(largeArray, pageSize);
```

---

## 3. 数据格式化

### 3.1 日期格式化

```typescript
import { formatDate } from './transform-skill';

const now = new Date('2024-03-13 16:47:00');

// 常用格式
formatDate(now, { format: 'YYYY-MM-DD' });        // '2024-03-13'
formatDate(now, { format: 'YYYY/MM/DD' });        // '2024/03/13'
formatDate(now, { format: 'DD/MM/YYYY' });        // '13/03/2024'
formatDate(now, { format: 'MM/DD/YYYY' });        // '03/13/2024'
formatDate(now, { format: 'YYYY-MM-DD HH:mm:ss' });// '2024-03-13 16:47:00'
formatDate(now, { format: 'ISO' });               // '2024-03-13T16:47:00.000Z'
formatDate(now, { format: 'timestamp' });         // '1710347220000'

// 处理时间戳
formatDate(1710347220000, { format: 'YYYY-MM-DD' });  // '2024-03-13'

// 处理日期字符串
formatDate('2024-03-13', { format: 'YYYY-MM-DD' });   // '2024-03-13'
```

### 3.2 数字格式化

```typescript
import { formatNumber } from './transform-skill';

const num = 1234567.89;

// 基础格式化
formatNumber(num, { decimals: 2 });                    // '1234567.89'
formatNumber(num, { decimals: 0 });                    // '1234568'

// 千位分隔符
formatNumber(num, { decimals: 2, thousandsSeparator: ',' });  // '1,234,567.89'
formatNumber(num, { decimals: 2, thousandsSeparator: ' ' });  // '1 234 567.89'

// 自定义小数点
formatNumber(num, { decimals: 2, decimalSeparator: ',' });    // '1234567,89'

// 前缀和后缀
formatNumber(num, { decimals: 2, prefix: '$' });       // '$1234567.89'
formatNumber(num, { decimals: 2, suffix: ' kg' });     // '1234567.89 kg'
formatNumber(num, { 
  decimals: 2, 
  thousandsSeparator: ',', 
  prefix: '$' 
});                                                     // '$1,234,567.89'
```

### 3.3 字符串格式化

```typescript
import { formatString } from './transform-skill';

const text = '  Hello World  ';

// 修剪空白
formatString(text, { trim: true });           // 'Hello World'

// 大小写转换
formatString('hello', { uppercase: true });   // 'HELLO'
formatString('HELLO', { lowercase: true });   // 'hello'
formatString('hello', { capitalize: true });  // 'Hello'

// 长度限制
formatString('This is a long text', { 
  maxLength: 10, 
  ellipsis: '...' 
});                                           // 'This is a ...'

// 组合使用
formatString('  hello world  ', { 
  trim: true, 
  uppercase: true 
});                                           // 'HELLO WORLD'
```

### 3.4 货币格式化

```typescript
import { formatCurrency } from './transform-skill';

const amount = 1234.56;

// 不同货币
formatCurrency(amount, 'USD', 'en-US');  // '$1,234.56'
formatCurrency(amount, 'EUR', 'de-DE');  // '1.234,56 €'
formatCurrency(amount, 'CNY', 'zh-CN');  // '¥1,234.56'
formatCurrency(amount, 'JPY', 'ja-JP');  // '¥1,235'
formatCurrency(amount, 'GBP', 'en-GB');  // '£1,234.56'
```

### 3.5 百分比格式化

```typescript
import { formatPercentage } from './transform-skill';

// 小数格式 (0-1)
formatPercentage(0.856);           // '85.6%'
formatPercentage(0.856, 0);        // '86%'
formatPercentage(0.856, 2);        // '85.60%'

// 整数格式 (0-100)
formatPercentage(85.6, 1, false);  // '85.6%'
formatPercentage(85.6, 0, false);  // '86%'
```

---

## 4. 复合转换

### 4.1 管道转换

```typescript
import { pipeTransform, filterArray, sortArray, mapArray } from './transform-skill';

const users = [
  { id: 1, name: 'axon', age: 25, active: true, score: 95 },
  { id: 2, name: 'bob', age: 17, active: true, score: 80 },
  { id: 3, name: 'eve', age: 30, active: false, score: 90 },
  { id: 4, name: 'charlie', age: 22, active: true, score: 85 }
];

// 链式转换：过滤 → 排序 → 映射
const result = pipeTransform(
  users,
  (data) => filterArray(data, { predicate: (u) => u.active && u.age >= 18 }),
  (data) => sortArray(data, { field: 'score', order: 'desc' }),
  (data) => mapArray(data, (u) => ({ 
    id: u.id, 
    name: u.name, 
    score: u.score 
  }))
);

console.log(result);
// [
//   { id: 1, name: 'axon', score: 95 },
//   { id: 4, name: 'charlie', score: 85 }
// ]
```

### 4.2 条件转换

```typescript
import { conditionalTransform } from './transform-skill';

const data = 'This is a very long text that needs to be truncated';

// 条件截断
const result = conditionalTransform(
  data,
  (text) => text.length > 50,
  (text) => text.slice(0, 50) + '...',
  (text) => text  // 保持不变
);

console.log(result);
// 'This is a very long text that needs to be trunca...'
```

---

## 5. 实际场景

### 5.1 API 响应转换

```typescript
import { transformObjects, formatDate, formatCurrency } from './transform-skill';

// 原始 API 响应
const apiOrders = [
  {
    order_id: 'ORD-001',
    customer_name: 'Alice',
    total_cents: 123456,
    created_at: '2024-03-13T10:30:00Z',
    status: 'pending'
  },
  {
    order_id: 'ORD-002',
    customer_name: 'Bob',
    total_cents: 78900,
    created_at: '2024-03-12T15:45:00Z',
    status: 'completed'
  }
];

// 转换为前端展示格式
const orders = transformObjects(apiOrders, {
  fields: [
    { from: 'order_id', to: 'orderId' },
    { from: 'customer_name', to: 'customer' },
    { 
      from: 'total_cents', 
      to: 'total', 
      transform: (cents) => formatCurrency(cents / 100, 'USD', 'en-US')
    },
    { 
      from: 'created_at', 
      to: 'date', 
      transform: (iso) => formatDate(iso, { format: 'YYYY-MM-DD HH:mm' })
    },
    { from: 'status', to: 'status' }
  ]
});

console.log(orders);
// [
//   {
//     orderId: 'ORD-001',
//     customer: 'Alice',
//     total: '$1,234.56',
//     date: '2024-03-13 10:30',
//     status: 'pending'
//   },
//   {
//     orderId: 'ORD-002',
//     customer: 'Bob',
//     total: '$789.00',
//     date: '2024-03-12 15:45',
//     status: 'completed'
//   }
// ]
```

### 5.2 表格数据处理

```typescript
import { pipeTransform, filterArray, sortArray, uniqueArray, mapArray } from './transform-skill';

// 原始数据
const rawData = [
  { id: 1, dept: 'Engineering', salary: 80000 },
  { id: 2, dept: 'Engineering', salary: 90000 },
  { id: 3, dept: 'Sales', salary: 60000 },
  { id: 4, dept: 'Engineering', salary: 85000 },
  { id: 5, dept: 'Sales', salary: 65000 }
];

// 计算各部门平均薪资
const deptStats = pipeTransform(
  rawData,
  (data) => uniqueArray(data, 'dept'),  // 去重 (这里示例用，实际需要分组聚合)
  (data) => sortArray(data, { field: 'dept', order: 'asc' }),
  (data) => mapArray(data, (item) => ({
    department: item.dept,
    avgSalary: formatNumber(item.salary / 1000, { decimals: 1, suffix: 'k' })
  }))
);
```

### 5.3 表单数据验证前处理

```typescript
import { transformObject, formatString } from './transform-skill';

const formData = {
  username: '  Axon  ',
  email: 'AXON@EXAMPLE.COM',
  bio: 'This is a very long biography that exceeds the maximum allowed length...'
};

const cleanedData = transformObject(formData, {
  fields: [
    { 
      from: 'username', 
      to: 'username', 
      transform: (v) => formatString(v, { trim: true, lowercase: true })
    },
    { 
      from: 'email', 
      to: 'email', 
      transform: (v) => formatString(v, { trim: true, lowercase: true })
    },
    { 
      from: 'bio', 
      to: 'bio', 
      transform: (v) => formatString(v, { trim: true, maxLength: 100, ellipsis: '...' })
    }
  ]
});

console.log(cleanedData);
// {
//   username: 'axon',
//   email: 'axon@example.com',
//   bio: 'This is a very long biography that exceeds the maximum allowed l...'
// }
```

### 5.4 图表数据准备

```typescript
import { pipeTransform, groupArray, mapArray } from './transform-skill';

const salesData = [
  { date: '2024-01', region: 'North', amount: 10000 },
  { date: '2024-01', region: 'South', amount: 15000 },
  { date: '2024-02', region: 'North', amount: 12000 },
  { date: '2024-02', region: 'South', amount: 18000 },
  { date: '2024-03', region: 'North', amount: 11000 },
  { date: '2024-03', region: 'South', amount: 16000 }
];

// 按月份分组并计算总额
const monthlyData = pipeTransform(
  salesData,
  (data) => groupArray(data, { key: 'date' }),
  (grouped) => mapArray(Object.entries(grouped), ([date, items]) => ({
    month: date,
    total: items.reduce((sum, item) => sum + item.amount, 0),
    count: items.length
  }))
);

console.log(monthlyData);
// [
//   { month: '2024-01', total: 25000, count: 2 },
//   { month: '2024-02', total: 30000, count: 2 },
//   { month: '2024-03', total: 27000, count: 2 }
// ]
```

---

## 🎯 最佳实践

### 1. 组合使用

```typescript
// ✅ 推荐：使用管道组合多个转换
const result = pipeTransform(
  data,
  (d) => filterArray(d, { predicate: isValid }),
  (d) => sortArray(d, { field: 'createdAt', order: 'desc' }),
  (d) => mapArray(d, transformItem)
);

// ❌ 不推荐：嵌套调用
const result = mapArray(
  sortArray(
    filterArray(data, { predicate: isValid }),
    { field: 'createdAt', order: 'desc' }
  ),
  transformItem
);
```

### 2. 类型安全

```typescript
// ✅ 推荐：使用泛型确保类型安全
interface User {
  id: number;
  name: string;
}

interface UserDTO {
  userId: number;
  username: string;
}

const users = transformObjects<User, UserDTO>(apiUsers, config);
```

### 3. 性能考虑

```typescript
// ✅ 大数据集：避免重复遍历
const processed = pipeTransform(
  largeArray,
  (d) => filterArray(d, { predicate: expensiveCheck }),
  (d) => mapArray(d, transform)
);

// ❌ 不推荐：多次遍历
const filtered = filterArray(largeArray, { predicate: expensiveCheck });
const mapped = mapArray(filtered, transform);
const sorted = sortArray(mapped, config);
```

---

**完成时间:** 10 分钟  
**技能文件:** `src/skills/transform-skill.ts`  
**示例文件:** `src/skills/transform-skill.examples.md`
