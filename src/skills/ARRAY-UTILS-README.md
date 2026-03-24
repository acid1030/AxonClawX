# 数组工具技能 (Array Utils)

强大的数组处理工具集，提供去重、扁平化、分组、分块、查找和排序等功能。

## 📦 安装

无需额外依赖，直接使用：

```typescript
import { ArrayUtils } from './skills/array-utils-skill';
// 或者按需导入
import { unique, flatten, groupBy, chunk } from './skills/array-utils-skill';
```

## 🚀 快速开始

### 1. 数组去重

```typescript
import { unique, uniqueBy, uniqueByJson } from './skills/array-utils-skill';

// 基础去重
const numbers = [1, 2, 2, 3, 3, 3, 4];
unique(numbers); // [1, 2, 3, 4]

// 按条件去重
const users = [
  { id: 1, name: 'Alice' },
  { id: 2, name: 'Bob' },
  { id: 1, name: 'Alice2' }, // 重复 ID
];
uniqueBy(users, user => user.id); // 保留第一个出现的每个 ID

// JSON 序列化去重 (适用于完全相同的对象)
const items = [{ name: 'Apple' }, { name: 'Apple' }];
uniqueByJson(items); // [{ name: 'Apple' }]
```

### 2. 数组扁平化

```typescript
import { flatten, flattenDeep, flatMap } from './skills/array-utils-skill';

// 指定深度扁平化
const nested = [1, [2, 3], [4, [5, 6]]];
flatten(nested, 1); // [1, 2, 3, 4, [5, 6]]

// 完全扁平化
flattenDeep(nested); // [1, 2, 3, 4, 5, 6]

// flatMap: 扁平化并映射
const sentences = ['Hello World', 'Foo Bar'];
flatMap(sentences, s => s.split(' ')); // ['Hello', 'World', 'Foo', 'Bar']
```

### 3. 数组分组

```typescript
import { groupBy, groupByObject, partition } from './skills/array-utils-skill';

// 按属性分组 (返回 Map)
const products = [
  { name: 'Laptop', category: 'Electronics' },
  { name: 'Desk', category: 'Furniture' },
];
const grouped = groupBy(products, p => p.category);
// Map { 'Electronics' => [...], 'Furniture' => [...] }

// 按属性分组 (返回对象)
const groupedObj = groupByObject(products, p => p.category);
// { Electronics: [...], Furniture: [...] }

// 分区: 按条件分成两组
const ages = [15, 23, 17, 42];
const [adults, minors] = partition(ages, age => age >= 18);
// adults: [23, 42], minors: [15, 17]
```

### 4. 数组分块

```typescript
import { chunk, chunkByCount, chunkBy } from './skills/array-utils-skill';

// 固定大小分块
const data = [1, 2, 3, 4, 5, 6, 7, 8, 9];
chunk(data, 3); // [[1,2,3], [4,5,6], [7,8,9]]

// 固定数量分块
chunkByCount(data, 4); // [[1,2,3], [4,5,6], [7,8], [9]]

// 按条件分块
const sequence = [1, 2, 10, 11, 20, 21];
chunkBy(sequence, (item, i) => item >= 10 && i > 0);
// [[1, 2], [10, 11], [20, 21]]
```

### 5. 数组查找

```typescript
import { findBy, findAll, some, every } from './skills/array-utils-skill';

const inventory = [
  { id: 1, name: 'Widget', stock: 100 },
  { id: 2, name: 'Gadget', stock: 0 },
];

// 查找单个元素
findBy(inventory, item => item.stock === 0); // { id: 2, ... }

// 查找所有匹配
findAll(inventory, item => item.stock < 60); // [{ id: 2, ... }]

// 检查条件
some(inventory, item => item.stock === 0); // true
every(inventory, item => item.stock > 0); // false
```

### 6. 数组排序

```typescript
import { 
  sortNumbersAsc, 
  sortNumbersDesc, 
  sortByKey 
} from './skills/array-utils-skill';

// 数字排序
const scores = [85, 92, 78, 90];
sortNumbersAsc(scores); // [78, 85, 90, 92]
sortNumbersDesc(scores); // [92, 90, 85, 78]

// 对象数组排序
const employees = [
  { name: 'Alice', salary: 50000 },
  { name: 'Bob', salary: 75000 },
];
sortByKey(employees, e => e.salary); // 按薪资升序
sortByKey(employees, e => e.salary, false); // 按薪资降序
```

### 7. 高级工具

```typescript
import { 
  shuffle, 
  take, 
  intersection, 
  union, 
  difference 
} from './skills/array-utils-skill';

// 洗牌
shuffle(['A', 'K', 'Q']); // 随机打乱

// 取前 N 个
take([1, 2, 3, 4, 5], 3); // [1, 2, 3]

// 集合运算
const A = [1, 2, 3, 4];
const B = [3, 4, 5, 6];
intersection(A, B); // [3, 4] - 交集
union(A, B); // [1,2,3,4,5,6] - 并集
difference(A, B); // [1, 2] - 差集
```

## 📚 API 参考

### 去重 (Deduplication)

| 函数 | 描述 | 参数 | 返回值 |
|------|------|------|--------|
| `unique<T>(arr)` | 基础去重 (Set) | `arr: T[]` | `T[]` |
| `uniqueBy<T>(arr, keyFn)` | 按条件去重 | `arr: T[]`, `keyFn: (T) => any` | `T[]` |
| `uniqueByJson<T>(arr)` | JSON 序列化去重 | `arr: T[]` | `T[]` |

### 扁平化 (Flattening)

| 函数 | 描述 | 参数 | 返回值 |
|------|------|------|--------|
| `flatten<T>(arr, depth)` | 指定深度扁平化 | `arr: any[]`, `depth: number` | `T[]` |
| `flattenDeep<T>(arr)` | 完全扁平化 | `arr: any[]` | `T[]` |
| `flatMap<T, U>(arr, mapFn)` | 扁平化并映射 | `arr: T[]`, `mapFn: (T) => U\|U[]` | `U[]` |

### 分组 (Grouping)

| 函数 | 描述 | 参数 | 返回值 |
|------|------|------|--------|
| `groupBy<T, K>(arr, keyFn)` | 分组 (Map) | `arr: T[]`, `keyFn: (T) => K` | `Map<K, T[]>` |
| `groupByObject<T, K>(arr, keyFn)` | 分组 (对象) | `arr: T[]`, `keyFn: (T) => K` | `Record<K, T[]>` |
| `partition<T>(arr, predicate)` | 分区 | `arr: T[]`, `predicate: (T) => bool` | `[T[], T[]]` |

### 分块 (Chunking)

| 函数 | 描述 | 参数 | 返回值 |
|------|------|------|--------|
| `chunk<T>(arr, size)` | 固定大小分块 | `arr: T[]`, `size: number` | `T[][]` |
| `chunkByCount<T>(arr, count)` | 固定数量分块 | `arr: T[]`, `count: number` | `T[][]` |
| `chunkBy<T>(arr, predicate)` | 按条件分块 | `arr: T[]`, `predicate: (T,i) => bool` | `T[][]` |

### 查找 (Searching)

| 函数 | 描述 | 参数 | 返回值 |
|------|------|------|--------|
| `findIndex<T>(arr, value)` | 查找索引 | `arr: T[]`, `value: T` | `number` |
| `findIndexBy<T>(arr, predicate)` | 按条件查找索引 | `arr: T[]`, `predicate: (T) => bool` | `number` |
| `findBy<T>(arr, predicate)` | 按条件查找 | `arr: T[]`, `predicate: (T) => bool` | `T\|undefined` |
| `findAll<T>(arr, predicate)` | 查找所有匹配 | `arr: T[]`, `predicate: (T) => bool` | `T[]` |
| `some<T>(arr, predicate)` | 是否有满足条件的 | `arr: T[]`, `predicate: (T) => bool` | `boolean` |
| `every<T>(arr, predicate)` | 是否都满足条件 | `arr: T[]`, `predicate: (T) => bool` | `boolean` |

### 排序 (Sorting)

| 函数 | 描述 | 参数 | 返回值 |
|------|------|------|--------|
| `sortAsc<T>(arr)` | 升序排序 | `arr: T[]` | `T[]` |
| `sortDesc<T>(arr)` | 降序排序 | `arr: T[]` | `T[]` |
| `sortBy<T>(arr, compareFn)` | 自定义排序 | `arr: T[]`, `compareFn: (T,T) => number` | `T[]` |
| `sortByKey<T>(arr, keyFn, asc)` | 按属性排序 | `arr: T[]`, `keyFn: (T) => any`, `asc: bool` | `T[]` |
| `sortNumbersAsc(arr)` | 数字升序 | `arr: number[]` | `number[]` |
| `sortNumbersDesc(arr)` | 数字降序 | `arr: number[]` | `number[]` |
| `sortStringsAsc(arr, locale)` | 字符串升序 | `arr: string[]`, `locale: string` | `string[]` |
| `sortStringsDesc(arr, locale)` | 字符串降序 | `arr: string[]`, `locale: string` | `string[]` |

### 高级工具 (Advanced)

| 函数 | 描述 | 参数 | 返回值 |
|------|------|------|--------|
| `shuffle<T>(arr)` | 随机洗牌 | `arr: T[]` | `T[]` |
| `take<T>(arr, n)` | 取前 N 个 | `arr: T[]`, `n: number` | `T[]` |
| `takeRight<T>(arr, n)` | 取后 N 个 | `arr: T[]`, `n: number` | `T[]` |
| `drop<T>(arr, n)` | 移除前 N 个 | `arr: T[]`, `n: number` | `T[]` |
| `dropRight<T>(arr, n)` | 移除后 N 个 | `arr: T[]`, `n: number` | `T[]` |
| `intersection<T>(arr1, arr2)` | 交集 | `arr1: T[]`, `arr2: T[]` | `T[]` |
| `union<T>(arr1, arr2)` | 并集 | `arr1: T[]`, `arr2: T[]` | `T[]` |
| `difference<T>(arr1, arr2)` | 差集 | `arr1: T[]`, `arr2: T[]` | `T[]` |
| `uniqueAndSort<T>(arr)` | 去重并排序 | `arr: T[]` | `T[]` |

## 💡 实际应用场景

### 场景 1: 处理 API 数据

```typescript
// 提取所有标签并去重
const apiResponse = [
  { id: 1, tags: ['tech', 'news'] },
  { id: 2, tags: ['sports'] },
  { id: 3, tags: ['tech', 'science'] },
];

const allTags = flatMap(apiResponse, item => item.tags);
const uniqueTags = unique(allTags);
// ['tech', 'news', 'sports', 'science']
```

### 场景 2: 分页处理

```typescript
// 100 条数据分 10 页
const allData = Array.from({ length: 100 }, (_, i) => i + 1);
const pages = chunk(allData, 10);
const page1 = pages[0]; // 第 1 页
const page2 = pages[1]; // 第 2 页
```

### 场景 3: 数据聚合

```typescript
// 按类别分组并计算总额
const sales = [
  { product: 'A', category: 'Electronics', amount: 1000 },
  { product: 'B', category: 'Electronics', amount: 1500 },
  { product: 'C', category: 'Furniture', amount: 800 },
];

const byCategory = groupByObject(sales, s => s.category);
for (const [category, items] of Object.entries(byCategory)) {
  const total = items.reduce((sum, item) => sum + item.amount, 0);
  console.log(`${category}: $${total}`);
}
```

### 场景 4: 数据过滤和排序

```typescript
// 找出高价值订单并排序
const highValue = findAll(sales, s => s.amount >= 1000);
const sorted = sortByKey(highValue, s => s.amount, false);
```

## ⚠️ 注意事项

1. **不可变性**: 所有函数都返回新数组，不修改原数组
2. **性能**: 大数据集时注意 `uniqueByJson` 的 JSON 序列化开销
3. **类型安全**: 所有函数都支持 TypeScript 泛型
4. **空值处理**: 传入 `null` 或 `undefined` 会抛出错误

## 📝 更多示例

查看完整示例文件：[`examples/array-utils-examples.ts`](./examples/array-utils-examples.ts)

## 📄 许可证

MIT
