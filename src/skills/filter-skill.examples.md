# 🔍 数据过滤技能 - 使用示例

**版本:** 1.0.0  
**作者:** Axon

---

## 📋 目录

1. [基础用法](#基础用法)
2. [多条件过滤](#多条件过滤)
3. [模糊匹配](#模糊匹配)
4. [范围过滤](#范围过滤)
5. [高级用法](#高级用法)
6. [性能优化](#性能优化)

---

## 基础用法

### 1. 导入技能

```typescript
import { FilterSkill, createFilter, quickFilter } from './filter-skill';

// 方式 1: 使用工厂函数
const filter = createFilter();

// 方式 2: 直接实例化
const filter = new FilterSkill({
  defaultLogic: 'AND',
  defaultFuzzyThreshold: 0.6,
  enableCache: true,
});
```

### 2. 简单等于过滤

```typescript
const users = [
  { id: 1, name: 'Alice', age: 25, city: 'Beijing' },
  { id: 2, name: 'Bob', age: 30, city: 'Shanghai' },
  { id: 3, name: 'Charlie', age: 25, city: 'Beijing' },
];

// 过滤年龄为 25 的用户
const result = filter.filter(users, [
  { field: 'age', operator: 'eq', value: 25 }
]);

console.log(result.data);
// [{ id: 1, name: 'Alice', age: 25, city: 'Beijing' },
//  { id: 3, name: 'Charlie', age: 25, city: 'Beijing' }]
```

### 3. 使用便捷函数

```typescript
// 快速过滤
const beijingUsers = quickFilter(users, 'city', 'eq', 'Beijing');
```

---

## 多条件过滤

### 1. AND 逻辑 (默认)

```typescript
// 年龄 25 且 城市在北京
const result = filter.filter(users, [
  { field: 'age', operator: 'eq', value: 25 },
  { field: 'city', operator: 'eq', value: 'Beijing' }
]);
// 返回：Alice 和 Charlie
```

### 2. OR 逻辑

```typescript
const result = filter.filter(users, [
  filter.group('OR', [
    { field: 'age', operator: 'eq', value: 25 },
    { field: 'city', operator: 'eq', value: 'Shanghai' }
  ])
]);
// 返回：Alice, Bob, Charlie (年龄 25 或 城市在上海)
```

### 3. 嵌套组合

```typescript
// (年龄 25 且 城市在北京) 或 (年龄 30 且 城市在上海)
const result = filter.filter(users, [
  filter.group('OR', [
    filter.group('AND', [
      { field: 'age', operator: 'eq', value: 25 },
      { field: 'city', operator: 'eq', value: 'Beijing' }
    ]),
    filter.group('AND', [
      { field: 'age', operator: 'eq', value: 30 },
      { field: 'city', operator: 'eq', value: 'Shanghai' }
    ])
  ])
]);
```

### 4. 使用 condition 辅助函数

```typescript
const result = filter.filter(users, [
  filter.condition('age', 'gte', 25),
  filter.condition('city', 'contains', 'Bei')
]);
```

---

## 模糊匹配

### 1. 基础模糊匹配

```typescript
const products = [
  { id: 1, name: 'iPhone 15 Pro Max', price: 9999 },
  { id: 2, name: 'iPhone 14', price: 6999 },
  { id: 3, name: 'Samsung Galaxy S23', price: 7999 },
  { id: 4, name: 'Xiaomi 13 Pro', price: 4999 },
];

// 搜索 "iphone" (自动匹配相似度 >= 0.6 的结果)
const result = filter.filter(products, [
  { field: 'name', operator: 'fuzzy', value: 'iphone' }
]);
// 返回：iPhone 15 Pro Max, iPhone 14
```

### 2. 自定义阈值

```typescript
// 更高精度 (阈值 0.8)
const result = filter.filter(products, [
  { field: 'name', operator: 'fuzzy', value: 'iphone', threshold: 0.8 }
]);
// 只返回完全匹配的结果
```

### 3. 实际应用场景

```typescript
// 用户搜索商品，允许拼写错误
const searchQuery = 'iphon'; // 用户少打了一个 'e'
const result = filter.filter(products, [
  { field: 'name', operator: 'fuzzy', value: searchQuery, threshold: 0.7 }
]);
// 仍然能匹配到 iPhone 产品
```

---

## 范围过滤

### 1. 数值范围

```typescript
const orders = [
  { id: 1, amount: 100, status: 'completed' },
  { id: 2, amount: 500, status: 'pending' },
  { id: 3, amount: 1000, status: 'completed' },
  { id: 4, amount: 2000, status: 'completed' },
];

// 金额在 500-1500 之间
const result = filter.filter(orders, [
  { field: 'amount', operator: 'between', value: [500, 1500] }
]);
// 返回：订单 2 和 3
```

### 2. 比较操作符

```typescript
// 金额大于等于 1000
const result = filter.filter(orders, [
  { field: 'amount', operator: 'gte', value: 1000 }
]);

// 金额小于 500
const result = filter.filter(orders, [
  { field: 'amount', operator: 'lt', value: 500 }
]);
```

### 3. 日期范围

```typescript
const events = [
  { id: 1, name: '会议', date: new Date('2026-03-01') },
  { id: 2, name: '聚会', date: new Date('2026-03-15') },
  { id: 3, name: '演讲', date: new Date('2026-04-01') },
];

// 3 月份的事件
const result = filter.filter(events, [
  { field: 'date', operator: 'between', value: [
    new Date('2026-03-01'),
    new Date('2026-03-31')
  ]}
]);
```

### 4. IN 操作符

```typescript
// 状态为 completed 或 pending
const result = filter.filter(orders, [
  { field: 'status', operator: 'in', value: ['completed', 'pending'] }
]);
```

---

## 高级用法

### 1. 字符串匹配

```typescript
const articles = [
  { id: 1, title: 'React Hooks 完全指南', tags: ['react', 'hooks'] },
  { id: 2, title: 'TypeScript 进阶技巧', tags: ['typescript'] },
  { id: 3, title: 'React 性能优化', tags: ['react', 'performance'] },
];

// 标题包含 "React"
filter.filter(articles, [
  { field: 'title', operator: 'contains', value: 'React' }
]);

// 标题以 "React" 开头
filter.filter(articles, [
  { field: 'title', operator: 'startsWith', value: 'React' }
]);

// 标题以 "指南" 结尾
filter.filter(articles, [
  { field: 'title', operator: 'endsWith', value: '指南' }
]);

// 不区分大小写包含
filter.filter(articles, [
  { field: 'title', operator: 'icontains', value: 'react' }
]);
```

### 2. 正则表达式

```typescript
// 匹配邮箱格式
const users = [
  { email: 'test@example.com' },
  { email: 'invalid-email' },
  { email: 'user@domain.org' },
];

filter.filter(users, [
  { field: 'email', operator: 'regex', value: '^[\\w-\\.]+@([\\w-]+\\.)+[\\w-]{2,4}$' }
]);
```

### 3. 嵌套字段

```typescript
const employees = [
  { 
    id: 1, 
    name: 'Alice',
    department: { name: 'Engineering', level: 3 }
  },
  { 
    id: 2, 
    name: 'Bob',
    department: { name: 'Sales', level: 2 }
  },
];

// 使用点号访问嵌套字段
filter.filter(employees, [
  { field: 'department.level', operator: 'gte', value: 3 }
]);
```

### 4. 字段存在性检查

```typescript
// 只返回有 phone 字段的记录
filter.filter(users, [
  { field: 'phone', operator: 'exists', value: true }
]);
```

### 5. 取反操作

```typescript
// 城市不是北京
filter.filter(users, [
  { field: 'city', operator: 'eq', value: 'Beijing', not: true }
]);
```

### 6. 排序和分页

```typescript
const result = filter.filter(users, [
  { field: 'age', operator: 'gte', value: 18 }
], {
  sortBy: 'age',
  sortOrder: 'desc',
  limit: 10,
  offset: 0
});
```

### 7. 自定义过滤器

```typescript
const result = filter.filter(products, [
  { field: 'price', operator: 'gte', value: 1000 }
], {
  customFilter: (item) => {
    // 自定义逻辑：价格必须是偶数
    return item.price % 2 === 0;
  }
});
```

### 8. 字段分析

```typescript
const stats = filter.analyzeFields(users);

console.log(stats);
// [
//   { field: 'id', type: 'number', nonNullCount: 100, uniqueCount: 100, min: 1, max: 100, avg: 50.5 },
//   { field: 'name', type: 'string', nonNullCount: 100, uniqueCount: 95 },
//   { field: 'age', type: 'number', nonNullCount: 100, uniqueCount: 30, min: 18, max: 65, avg: 35.2 },
//   { field: 'city', type: 'string', nonNullCount: 98, uniqueCount: 10 }
// ]
```

---

## 性能优化

### 1. 启用缓存

```typescript
const filter = createFilter({
  enableCache: true,
  cacheSize: 100, // LRU 缓存大小
});

// 相同的查询会直接从缓存返回
const result1 = filter.filter(data, conditions);
const result2 = filter.filter(data, conditions); // 命中缓存，执行时间 ≈ 0
```

### 2. 清除缓存

```typescript
// 数据更新后清除缓存
filter.clearCache();
```

### 3. 批量过滤

```typescript
// 一次性应用多个条件，避免多次遍历
const result = filter.filter(data, [
  { field: 'status', operator: 'eq', value: 'active' },
  { field: 'score', operator: 'gte', value: 80 },
  { field: 'category', operator: 'in', value: ['A', 'B'] }
]);
```

### 4. 使用索引 (未来扩展)

```typescript
// 对于大数据集，可以预先建立索引
// (当前版本不支持，预留接口)
```

---

## 完整示例

### 电商商品搜索

```typescript
import { createFilter } from './filter-skill';

const filter = createFilter();

const products = [
  { 
    id: 1, 
    name: 'iPhone 15 Pro', 
    price: 8999, 
    category: 'electronics',
    brand: 'Apple',
    rating: 4.8,
    inStock: true,
    tags: ['5G', 'OLED', 'A17']
  },
  // ... 更多商品
];

// 复杂搜索场景
const searchParams = {
  keyword: 'iphone',           // 关键词 (模糊匹配)
  minPrice: 5000,              // 最低价格
  maxPrice: 10000,             // 最高价格
  category: 'electronics',     // 分类
  minRating: 4.5,              // 最低评分
  inStock: true,               // 仅现货
};

const result = filter.filter(products, [
  filter.group('AND', [
    // 关键词模糊匹配
    { field: 'name', operator: 'fuzzy', value: searchParams.keyword, threshold: 0.6 },
    
    // 价格范围
    { field: 'price', operator: 'between', value: [searchParams.minPrice, searchParams.maxPrice] },
    
    // 分类匹配
    { field: 'category', operator: 'eq', value: searchParams.category },
    
    // 评分要求
    { field: 'rating', operator: 'gte', value: searchParams.minRating },
    
    // 库存状态
    { field: 'inStock', operator: 'eq', value: searchParams.inStock },
  ])
], {
  sortBy: 'rating',
  sortOrder: 'desc',
  limit: 20,
  offset: 0,
});

console.log(`找到 ${result.filteredTotal} 个商品，返回 ${result.data.length} 个`);
console.log(`执行时间：${result.executionTime.toFixed(2)}ms`);
```

### 用户数据分析

```typescript
import { createFilter } from './filter-skill';

const filter = createFilter();

const users = [
  { 
    id: 1, 
    name: '张三',
    age: 28,
    city: '北京',
    registerDate: new Date('2025-01-15'),
    lastLogin: new Date('2026-03-10'),
    totalOrders: 15,
    totalSpent: 5000,
    vipLevel: 2,
  },
  // ... 更多用户
];

// 分析高价值用户
const vipUsers = filter.filter(users, [
  { field: 'vipLevel', operator: 'gte', value: 2 },
  { field: 'totalSpent', operator: 'gte', value: 3000 },
  { field: 'totalOrders', operator: 'gte', value: 10 },
], {
  sortBy: 'totalSpent',
  sortOrder: 'desc',
});

// 分析字段分布
const stats = filter.analyzeFields(users);
console.log('用户数据概览:', stats);

// 找出最近活跃的用户 (最近 7 天登录)
const sevenDaysAgo = new Date();
sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

const activeUsers = filter.filter(users, [
  { field: 'lastLogin', operator: 'gte', value: sevenDaysAgo },
]);

console.log(`活跃用户：${activeUsers.filteredTotal} / ${users.length}`);
```

---

## API 参考

### FilterSkill 类

| 方法 | 参数 | 返回值 | 描述 |
|------|------|--------|------|
| `filter` | `data, conditions, options` | `FilterResult` | 执行过滤 |
| `condition` | `field, operator, value, options` | `FilterCondition` | 创建条件 |
| `group` | `logic, conditions` | `FilterGroup` | 创建组合 |
| `analyzeFields` | `data` | `FieldStats[]` | 字段分析 |
| `clearCache` | - | `void` | 清除缓存 |

### 操作符列表

| 操作符 | 描述 | 示例 |
|--------|------|------|
| `eq` | 等于 | `{ field: 'age', operator: 'eq', value: 25 }` |
| `neq` | 不等于 | `{ field: 'status', operator: 'neq', value: 'deleted' }` |
| `gt` | 大于 | `{ field: 'price', operator: 'gt', value: 100 }` |
| `gte` | 大于等于 | `{ field: 'score', operator: 'gte', value: 60 }` |
| `lt` | 小于 | `{ field: 'age', operator: 'lt', value: 18 }` |
| `lte` | 小于等于 | `{ field: 'level', operator: 'lte', value: 5 }` |
| `in` | 包含在 | `{ field: 'status', operator: 'in', value: ['active', 'pending'] }` |
| `nin` | 不包含在 | `{ field: 'type', operator: 'nin', value: ['spam'] }` |
| `contains` | 包含 | `{ field: 'name', operator: 'contains', value: 'test' }` |
| `icontains` | 包含 (不区分大小写) | `{ field: 'email', operator: 'icontains', value: 'GMAIL' }` |
| `startsWith` | 开头 | `{ field: 'code', operator: 'startsWith', value: 'CN' }` |
| `endsWith` | 结尾 | `{ field: 'file', operator: 'endsWith', value: '.ts' }` |
| `regex` | 正则 | `{ field: 'phone', operator: 'regex', value: '^1[3-9]\\d{9}$' }` |
| `fuzzy` | 模糊匹配 | `{ field: 'name', operator: 'fuzzy', value: 'aple', threshold: 0.7 }` |
| `between` | 范围 | `{ field: 'age', operator: 'between', value: [18, 65] }` |
| `exists` | 存在 | `{ field: 'phone', operator: 'exists', value: true }` |

---

**最后更新:** 2026-03-13  
**维护者:** Axon
