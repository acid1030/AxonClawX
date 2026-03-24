# Iterator Pattern Skill - 使用示例

**创建时间:** 2026-03-13  
**作者:** KAEL  
**功能:** 迭代器模式工具 - 集合遍历

---

## 📋 目录

1. [基础用法](#基础用法)
2. [迭代器接口](#迭代器接口)
3. [聚合接口](#聚合接口)
4. [自定义遍历](#自定义遍历)
5. [高级功能](#高级功能)
6. [实际场景](#实际场景)

---

## 🚀 基础用法

### 1. 导入技能

```typescript
import {
  IteratorPatternSkill,
  ArrayAggregate,
  ArrayIterator,
  IteratorUtils
} from './src/skills/iterator-pattern-skill';

// 创建技能实例
const iteratorSkill = new IteratorPatternSkill();
```

### 2. 创建聚合并遍历

```typescript
// 创建数组聚合
const numbers = [1, 2, 3, 4, 5];
iteratorSkill.createArrayAggregate('numbers', numbers);

// 遍历聚合
iteratorSkill.forEach('numbers', (item, index) => {
  console.log(`[${index}] ${item}`);
});
// 输出:
// [0] 1
// [1] 2
// [2] 3
// [3] 4
// [4] 5
```

---

## 🔧 迭代器接口

### 1. 基础迭代器

```typescript
// 创建迭代器
const iterator = iteratorSkill.createIterator<number>('numbers');

if (iterator) {
  // 遍历
  while (iterator.hasNext()) {
    const value = iterator.next();
    console.log(value); // 1, 2, 3, 4, 5
  }

  // 获取状态
  console.log('当前位置:', iterator.getIndex());
  console.log('剩余元素:', iterator.remaining());

  // 重置
  iterator.reset();
  console.log('重置后位置:', iterator.getIndex()); // 0
}
```

### 2. 反向迭代器

```typescript
// 创建反向迭代器
const reverseIterator = iteratorSkill.createReverseIterator<number>('numbers');

if (reverseIterator) {
  while (reverseIterator.hasNext()) {
    const value = reverseIterator.next();
    console.log(value); // 5, 4, 3, 2, 1
  }

  // 前向操作
  if (reverseIterator.hasPrevious()) {
    const prev = reverseIterator.previous();
    console.log('前一个元素:', prev);
  }
}
```

### 3. 过滤迭代器

```typescript
// 创建过滤迭代器 (只遍历偶数)
const filterIterator = iteratorSkill.createFilterIterator<number>(
  'numbers',
  (item) => item % 2 === 0
);

if (filterIterator) {
  while (filterIterator.hasNext()) {
    const value = filterIterator.next();
    console.log(value); // 2, 4
  }

  // 动态修改过滤条件
  filterIterator.setFilter((item) => item > 3);
  while (filterIterator.hasNext()) {
    const value = filterIterator.next();
    console.log(value); // 4, 5
  }

  // 清除过滤
  filterIterator.clearFilter();
}
```

---

## 📦 聚合接口

### 1. 数组聚合

```typescript
// 创建数组聚合
const fruits = ['apple', 'banana', 'cherry'];
iteratorSkill.createArrayAggregate('fruits', fruits);

// 获取聚合信息
console.log('大小:', iteratorSkill.size('fruits')); // 3
console.log('数组:', iteratorSkill.toArray('fruits')); // ['apple', 'banana', 'cherry']
console.log('索引 1:', iteratorSkill.getAggregate('fruits')?.get(1)); // 'banana'
```

### 2. 链表聚合

```typescript
// 创建链表聚合
iteratorSkill.createLinkedListAggregate<number>('linkedNumbers');
const linkedAggregate = iteratorSkill.getAggregate<number>('linkedNumbers');

if (linkedAggregate instanceof LinkedListAggregate) {
  linkedAggregate.add(10);
  linkedAggregate.add(20);
  linkedAggregate.add(30);

  console.log('链表大小:', linkedAggregate.size()); // 3
  console.log('索引 1:', linkedAggregate.get(1)); // 20
  console.log('转数组:', linkedAggregate.toArray()); // [10, 20, 30]
}
```

### 3. 聚合管理

```typescript
// 列出所有聚合
console.log('聚合列表:', iteratorSkill.listAggregates());

// 删除聚合
iteratorSkill.deleteAggregate('fruits');

// 清空所有
iteratorSkill.clear();
```

---

## 🎯 自定义遍历

### 1. 使用选项创建迭代器

```typescript
const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
iteratorSkill.createArrayAggregate('data', data);

// 反向遍历
const reverseIter = iteratorSkill.createCustomIterator('data', {
  reverse: true
});

// 过滤遍历 (只取偶数)
const filterIter = iteratorSkill.createCustomIterator('data', {
  filter: (x) => x % 2 === 0
});

// 转换遍历 (每个元素乘以 2)
const transformIter = iteratorSkill.createCustomIterator('data', {
  transform: (x) => x * 2
});

// 组合选项 (反向 + 过滤 + 转换)
const customIter = iteratorSkill.createCustomIterator('data', {
  reverse: true,
  filter: (x) => x > 5,
  transform: (x) => x * 10
});
// 结果：100, 90, 80, 70, 60
```

### 2. 范围遍历

```typescript
// 指定起始和结束索引
const rangeIter = iteratorSkill.createCustomIterator('data', {
  startIndex: 2,
  endIndex: 7
});
// 遍历索引 2-6 的元素

// 指定步长
const stepIter = iteratorSkill.createCustomIterator('data', {
  step: 2
});
// 每隔一个元素遍历
```

### 3. 使用 IteratorUtils

```typescript
const aggregate = new ArrayAggregate([1, 2, 3, 4, 5]);

// 创建带选项的迭代器
const iterator = IteratorUtils.createIterator(aggregate.toArray(), {
  reverse: true,
  filter: (x) => x % 2 !== 0,
  transform: (x) => x * 2
});
```

---

## ⚡ 高级功能

### 1. 映射操作

```typescript
const users = [
  { id: 1, name: 'Alice', age: 25 },
  { id: 2, name: 'Bob', age: 30 },
  { id: 3, name: 'Charlie', age: 35 }
];
iteratorSkill.createArrayAggregate('users', users);

// 提取所有名字
const names = iteratorSkill.map('users', (user) => user.name);
console.log(names); // ['Alice', 'Bob', 'Charlie']

// 提取所有年龄
const ages = iteratorSkill.map('users', (user) => user.age);
console.log(ages); // [25, 30, 35]
```

### 2. 过滤操作

```typescript
// 过滤年龄大于 28 的用户
const olderUsers = iteratorSkill.filter('users', (user) => user.age > 28);
console.log(olderUsers);
// [{ id: 2, name: 'Bob', age: 30 }, { id: 3, name: 'Charlie', age: 35 }]
```

### 3. 查找操作

```typescript
// 查找第一个用户
const firstUser = iteratorSkill.find('users', (user) => user.id === 1);
console.log(firstUser); // { id: 1, name: 'Alice', age: 25 }

// 检查所有用户是否成年
const allAdults = iteratorSkill.every('users', (user) => user.age >= 18);
console.log(allAdults); // true

// 检查是否有用户年龄大于 30
const hasOldUser = iteratorSkill.some('users', (user) => user.age > 30);
console.log(hasOldUser); // true
```

### 4. 限制操作

```typescript
// 获取前 3 个元素
const first3 = iteratorSkill.take('users', 3);

// 跳过前 2 个元素
const skip2 = iteratorSkill.skip('users', 2);
```

### 5. 收集操作

```typescript
const iterator = iteratorSkill.createIterator<number>('numbers');
if (iterator) {
  // 收集所有元素
  const all = iteratorSkill.collect(iterator);
  console.log(all); // [1, 2, 3, 4, 5]
}
```

---

## 🌟 实际场景

### 场景 1: 数据处理管道

```typescript
const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
iteratorSkill.createArrayAggregate('pipeline', numbers);

// 数据处理管道：过滤偶数 → 平方 → 取前 3 个
const evenSquares = iteratorSkill
  .filter('pipeline', (n) => n % 2 === 0)
  ?.map((n) => n * n)
  .slice(0, 3);

console.log(evenSquares); // [4, 16, 36]
```

### 场景 2: 分页遍历

```typescript
const allItems = Array.from({ length: 100 }, (_, i) => i + 1);
iteratorSkill.createArrayAggregate('items', allItems);

// 分页函数
function getPage(page: number, pageSize: number) {
  const skip = (page - 1) * pageSize;
  return iteratorSkill.skip('items', skip)
    ?.slice(0, pageSize);
}

console.log('第 1 页:', getPage(1, 10)); // [1-10]
console.log('第 2 页:', getPage(2, 10)); // [11-20]
```

### 场景 3: 条件统计

```typescript
const products = [
  { name: 'A', price: 100, stock: 50 },
  { name: 'B', price: 200, stock: 0 },
  { name: 'C', price: 150, stock: 30 },
  { name: 'D', price: 300, stock: 10 }
];
iteratorSkill.createArrayAggregate('products', products);

// 有库存的产品数量
const inStockCount = iteratorSkill.filter('products', (p) => p.stock > 0)?.length;

// 平均价格
const totalPrice = iteratorSkill.map('products', (p) => p.price)
  .reduce((sum, price) => sum + price, 0);
const avgPrice = totalPrice / products.length;

// 最贵产品
const mostExpensive = iteratorSkill.find('products', (p) =>
  p.price === Math.max(...products.map((x) => x.price))
);

console.log('有库存:', inStockCount); // 3
console.log('平均价格:', avgPrice); // 187.5
console.log('最贵产品:', mostExpensive); // { name: 'D', price: 300, stock: 10 }
```

### 场景 4: 树形结构遍历

```typescript
// 使用链表聚合模拟树形遍历
const treeAggregate = new LinkedListAggregate<string>();
treeAggregate.add('root');
treeAggregate.add('child1');
treeAggregate.add('child2');
treeAggregate.add('child3');

const treeIterator = treeAggregate.createIterator();
while (treeIterator.hasNext()) {
  console.log(treeIterator.next());
}
```

### 场景 5: 流式数据处理

```typescript
const logs = [
  { level: 'INFO', message: 'Started' },
  { level: 'ERROR', message: 'Failed' },
  { level: 'WARN', message: 'Slow' },
  { level: 'ERROR', message: 'Timeout' },
  { level: 'INFO', message: 'Retried' }
];
iteratorSkill.createArrayAggregate('logs', logs);

// 只处理错误日志
const errorLogs = iteratorSkill.filter('logs', (log) => log.level === 'ERROR');
console.log('错误日志:', errorLogs);

// 检查是否有错误
const hasErrors = iteratorSkill.some('logs', (log) => log.level === 'ERROR');
console.log('有错误:', hasErrors); // true

// 所有日志是否都是 INFO
const allInfo = iteratorSkill.every('logs', (log) => log.level === 'INFO');
console.log('全是 INFO:', allInfo); // false
```

---

## 📊 API 参考

### IteratorPatternSkill 类

| 方法 | 参数 | 返回值 | 描述 |
|------|------|--------|------|
| `createArrayAggregate` | `name, collection` | `boolean` | 创建数组聚合 |
| `createLinkedListAggregate` | `name` | `boolean` | 创建链表聚合 |
| `getAggregate` | `name` | `Aggregate<T> \| null` | 获取聚合 |
| `deleteAggregate` | `name` | `boolean` | 删除聚合 |
| `listAggregates` | - | `string[]` | 列出所有聚合 |
| `createIterator` | `aggregateName` | `Iterator<T> \| null` | 创建迭代器 |
| `createReverseIterator` | `aggregateName` | `ReverseIterator<T> \| null` | 创建反向迭代器 |
| `createFilterIterator` | `aggregateName, predicate` | `FilterIterator<T> \| null` | 创建过滤迭代器 |
| `createCustomIterator` | `aggregateName, options` | `Iterator<any> \| null` | 创建自定义迭代器 |
| `forEach` | `aggregateName, callback` | `boolean` | 遍历执行回调 |
| `map` | `aggregateName, transformFn` | `R[] \| null` | 映射 |
| `filter` | `aggregateName, predicate` | `T[] \| null` | 过滤 |
| `find` | `aggregateName, predicate` | `T \| null` | 查找 |
| `every` | `aggregateName, predicate` | `boolean \| null` | 全匹配检查 |
| `some` | `aggregateName, predicate` | `boolean \| null` | 存在检查 |
| `take` | `aggregateName, count` | `T[] \| null` | 取前 N 个 |
| `skip` | `aggregateName, count` | `T[] \| null` | 跳过前 N 个 |
| `collect` | `iterator` | `T[]` | 收集迭代器结果 |
| `size` | `aggregateName` | `number \| null` | 获取大小 |
| `toArray` | `aggregateName` | `T[] \| null` | 转数组 |
| `clear` | - | `void` | 清空所有 |

### IteratorUtils 工具类

| 方法 | 描述 |
|------|------|
| `createIterator` | 创建带选项的迭代器 |
| `forEach` | 遍历聚合 |
| `map` | 映射聚合 |
| `filter` | 过滤聚合 |
| `find` | 查找元素 |
| `every` | 全匹配检查 |
| `some` | 存在检查 |
| `collect` | 收集结果 |
| `take` | 限制数量 |
| `skip` | 跳过元素 |

---

## 🎨 设计模式说明

### Iterator (迭代器)
- 提供统一的集合遍历接口
- 隐藏底层数据结构细节
- 支持多种遍历方式 (正向/反向/过滤)

### Aggregate (聚合)
- 定义创建迭代器的接口
- 封装集合内部结构
- 提供集合操作方法

### ConcreteIterator (具体迭代器)
- `ArrayIterator`: 数组正向遍历
- `ReverseArrayIterator`: 数组反向遍历
- `FilterArrayIterator`: 条件过滤遍历
- `TransformIterator`: 数据转换遍历
- `LinkedListIterator`: 链表遍历

### ConcreteAggregate (具体聚合)
- `ArrayAggregate`: 数组聚合
- `LinkedListAggregate`: 链表聚合

---

## ✅ 最佳实践

1. **优先使用高级方法**: `map`, `filter`, `find` 比手动迭代更简洁
2. **及时释放资源**: 使用完毕后调用 `clear()` 清空聚合
3. **组合使用选项**: `reverse + filter + transform` 可以创建强大的自定义遍历
4. **注意性能**: 大型集合使用过滤迭代器避免创建中间数组
5. **类型安全**: 使用 TypeScript 泛型确保类型正确

---

**完成时间:** 5 分钟  
**状态:** ✅ 交付
