# 🜏 组合数学工具 - Combo Utils

> 排列组合计算 / 笛卡尔积 / 子集生成

**作者:** Axon  
**创建时间:** 2026-03-13  
**文件:** `src/skills/combo-utils-skill.ts`

---

## 📦 功能概览

| 功能分类 | 函数 | 描述 |
|---------|------|------|
| **基础计算** | `factorial(n)` | 计算阶乘 n! |
| **排列** | `permutation(n, k)` | 计算排列数 P(n, k) |
| | `generatePermutations(items, k)` | 生成所有排列 |
| | `fullPermute(items)` | 生成全排列 |
| **组合** | `combination(n, k)` | 计算组合数 C(n, k) |
| | `generateCombinations(items, k)` | 生成所有组合 |
| **笛卡尔积** | `cartesianProduct2(setA, setB)` | 2 个集合的笛卡尔积 |
| | `cartesianProduct(...sets)` | 多个集合的笛卡尔积 |
| | `cartesianProductWith(combine, ...sets)` | 带自定义组合函数 |
| **子集** | `powerSet(items)` | 生成幂集 (所有子集) |
| | `nonEmptySubsets(items)` | 生成非空子集 |
| | `subsetsOfSize(items, size)` | 生成指定大小的子集 |
| **扩展** | `permutationWithRepetition(n, k)` | 可重复排列 |
| | `combinationWithRepetition(n, k)` | 可重复组合 |

---

## 🚀 快速开始

### 导入

```typescript
import {
  factorial,
  permutation,
  combination,
  generatePermutations,
  generateCombinations,
  cartesianProduct,
  powerSet,
} from './combo-utils-skill';
```

### 基础计算

```typescript
// 阶乘
factorial(5)  // 120

// 排列数 P(5, 3) = 60
permutation(5, 3)

// 组合数 C(5, 3) = 10
combination(5, 3)
```

### 生成排列

```typescript
// 从 [1,2,3] 中选 2 个的排列
generatePermutations([1, 2, 3], 2)
// 结果：[[1,2], [1,3], [2,1], [2,3], [3,1], [3,2]]

// 全排列
fullPermute(['A', 'B', 'C'])
// 结果：[['A','B','C'], ['A','C','B'], ['B','A','C'], ...]
```

### 生成组合

```typescript
// 从 [1,2,3,4] 中选 2 个的组合
generateCombinations([1, 2, 3, 4], 2)
// 结果：[[1,2], [1,3], [1,4], [2,3], [2,4], [3,4]]

// 生成所有大小的组合
generateCombinations([1, 2, 3])
// 结果：[[], [1], [2], [3], [1,2], [1,3], [2,3], [1,2,3]]
```

### 笛卡尔积

```typescript
// 2 个集合
cartesianProduct2(['红', '蓝'], ['大', '小'])
// 结果：[['红','大'], ['红','小'], ['蓝','大'], ['蓝','小']]

// 多个集合
cartesianProduct(['S', 'M'], ['红', '蓝'], ['棉', '麻'])
// 结果：[['S','红','棉'], ['S','红','麻'], ['S','蓝','棉'], ...]

// 带自定义组合函数
cartesianProductWith(
  (items) => `${items[0]}-${items[1]}`,
  ['S', 'M'],
  ['红', '蓝']
)
// 结果：['S-红', 'S-蓝', 'M-红', 'M-蓝']
```

### 子集生成

```typescript
// 幂集 (所有子集)
powerSet([1, 2, 3])
// 结果：[[], [1], [2], [3], [1,2], [1,3], [2,3], [1,2,3]]

// 非空子集
nonEmptySubsets(['A', 'B'])
// 结果：[['A'], ['B'], ['A','B']]

// 指定大小的子集
subsetsOfSize([1, 2, 3, 4], 2)
// 结果：[[1,2], [1,3], [1,4], [2,3], [2,4], [3,4]]
```

---

## 📊 实际应用场景

### 1. 密码组合计算

```typescript
// 4 位数字密码的可能组合数
permutationWithRepetition(10, 4)  // 10000

// 6 位字母密码 (26 个字母)
permutationWithRepetition(26, 6)  // 308,915,776
```

### 2. 比赛排名

```typescript
// 8 支队伍，前三名的排列数
permutation(8, 3)  // 336
```

### 3. 彩票概率

```typescript
// 49 选 6 彩票
const odds = combination(49, 6)
console.log(`中奖概率：1 / ${odds.toLocaleString()}`)
// 中奖概率：1 / 13,983,816
```

### 4. 菜单搭配

```typescript
const mains = ['牛排', '鱼', '鸡']
const sides = ['薯条', '沙拉', '米饭']
const drinks = ['可乐', '果汁', '水']

const menuCombos = cartesianProduct(mains, sides, drinks)
console.log(`共有 ${menuCombos.length} 种搭配方案`)
// 共有 27 种搭配方案
```

### 5. 产品 SKU 生成

```typescript
const sizes = ['S', 'M', 'L', 'XL']
const colors = ['红', '蓝', '黑', '白']
const materials = ['棉', '麻', '丝']

const skus = cartesianProductWith(
  (items) => `${items[0]}-${items[1]}-${items[2]}`,
  sizes,
  colors,
  materials
)
// 结果：['S-红 - 棉', 'S-红 - 麻', 'S-红 - 丝', ...]
// 共 4 × 4 × 3 = 48 个 SKU
```

---

## 🧪 运行示例

```bash
# 进入项目目录
cd /Users/nike/.openclaw/workspace

# 运行示例 (需要 tsx 或 ts-node)
uv run tsx src/skills/combo-utils-examples.ts

# 或使用 Node.js + ts-node
npx ts-node src/skills/combo-utils-examples.ts
```

---

## 📝 API 参考

### factorial(n: number): number

计算阶乘 n!

**参数:**
- `n`: 非负整数

**返回:** n!

**示例:**
```typescript
factorial(5)  // 120
```

---

### permutation(n: number, k: number): number

计算排列数 P(n, k) = n! / (n-k)!

**参数:**
- `n`: 总元素数
- `k`: 选取元素数

**返回:** 排列数

**示例:**
```typescript
permutation(5, 3)  // 60
```

---

### combination(n: number, k: number): number

计算组合数 C(n, k) = n! / (k! * (n-k)!)

**参数:**
- `n`: 总元素数
- `k`: 选取元素数

**返回:** 组合数

**示例:**
```typescript
combination(5, 3)  // 10
```

---

### generatePermutations<T>(items: T[], k?: number): T[][]

生成所有排列

**参数:**
- `items`: 元素数组
- `k`: 选取元素数 (可选，默认为数组长度)

**返回:** 所有排列结果

**示例:**
```typescript
generatePermutations([1, 2, 3], 2)
// [[1,2], [1,3], [2,1], [2,3], [3,1], [3,2]]
```

---

### generateCombinations<T>(items: T[], k?: number): T[][]

生成所有组合

**参数:**
- `items`: 元素数组
- `k`: 选取元素数 (可选，不传则生成所有大小的组合)

**返回:** 所有组合结果

**示例:**
```typescript
generateCombinations([1, 2, 3, 4], 2)
// [[1,2], [1,3], [1,4], [2,3], [2,4], [3,4]]
```

---

### cartesianProduct<T>(...sets: T[][]): T[][]

计算多个集合的笛卡尔积

**参数:**
- `sets`: 多个集合的数组 (可变参数)

**返回:** 笛卡尔积结果

**示例:**
```typescript
cartesianProduct([1, 2], ['a', 'b'])
// [[1,'a'], [1,'b'], [2,'a'], [2,'b']]
```

---

### powerSet<T>(items: T[]): T[][]

生成幂集 (所有子集)

**参数:**
- `items`: 元素数组

**返回:** 所有子集 (包含空集和原集合)

**示例:**
```typescript
powerSet([1, 2])
// [[], [1], [2], [1,2]]
```

---

## ⚠️ 注意事项

1. **性能考虑**: 排列组合的数量会随 n 和 k 快速增长，避免对大数组使用生成函数
2. **内存限制**: `powerSet` 生成 2^n 个子集，n > 20 时慎用
3. **类型安全**: 所有函数都是泛型，支持任意类型的数组

---

## 📚 相关资源

- [组合数学维基百科](https://en.wikipedia.org/wiki/Combinatorics)
- [排列](https://en.wikipedia.org/wiki/Permutation)
- [组合](https://en.wikipedia.org/wiki/Combination)
- [笛卡尔积](https://en.wikipedia.org/wiki/Cartesian_product)

---

**最后更新:** 2026-03-13  
**维护者:** Axon
