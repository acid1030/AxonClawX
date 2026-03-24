# 📊 数据比较工具技能 (Compare Utils)

**模块:** `skills/compare-utils`  
**文件:** `src/skills/compare-utils-skill.ts`

---

## 🎯 功能概览

| 功能 | 函数 | 描述 |
|------|------|------|
| 🔍 深度相等比较 | `deepEqual()` | 递归比较两个值的深度相等性 |
| 📝 对象差异比较 | `objectDiff()` | 找出两个对象之间的所有差异 |
| 📋 数组差异比较 | `arrayDiff()` | 找出两个数组之间的增删改 |
| 🔑 键值数组比较 | `arrayDiffByKey()` | 基于键值函数的数组比较 |
| 📄 差异报告 | `formatDiffReport()` | 生成人类可读的差异报告 |

---

## 📦 导入方式

```typescript
// 命名导入
import { deepEqual, objectDiff, arrayDiff } from '@/skills/compare-utils-skill';

// 或者使用工具集
import CompareUtils from '@/skills/compare-utils-skill';
```

---

## 🔍 深度相等比较 (deepEqual)

### 基础用法

```typescript
import { deepEqual } from '@/skills/compare-utils-skill';

// 对象比较
deepEqual({ a: 1, b: { c: 2 } }, { a: 1, b: { c: 2 } });
// → true

deepEqual({ a: 1, b: 2 }, { a: 1, b: 3 });
// → false

// 数组比较
deepEqual([1, 2, 3], [1, 2, 3]);
// → true

deepEqual([1, [2, 3]], [1, [2, 3]]);
// → true

// Date 比较
deepEqual(new Date('2024-01-01'), new Date('2024-01-01'));
// → true

// RegExp 比较
deepEqual(/abc/gi, /abc/gi);
// → true

// Map/Set 比较
deepEqual(new Map([['a', 1]]), new Map([['a', 1]]));
// → true

deepEqual(new Set([1, 2]), new Set([1, 2]));
// → true
```

### 高级选项

```typescript
// 自定义比较器
deepEqual(
  { value: 100 },
  { value: 100.00 },
  {
    customComparator: (a, b) => {
      // 数字比较时忽略小数位差异
      if (typeof a === 'number' && typeof b === 'number') {
        return Math.abs(a - b) < 0.001;
      }
      return null; // 返回 null 使用默认比较
    }
  }
);
// → true

// 非严格模式 (允许类型转换)
deepEqual('123', 123, { strict: false });
// → true
```

---

## 📝 对象差异比较 (objectDiff)

### 基础用法

```typescript
import { objectDiff } from '@/skills/compare-utils-skill';

const oldUser = {
  id: 1,
  name: 'Alice',
  age: 25,
  email: 'alice@example.com'
};

const newUser = {
  id: 1,
  name: 'Alice',
  age: 26,
  phone: '123-456-7890'
};

const diff = objectDiff(oldUser, newUser);

console.log(diff);
/*
{
  hasChanges: true,
  diffs: [
    { type: 'modified', path: 'age', oldValue: 25, newValue: 26 },
    { type: 'removed', path: 'email', oldValue: 'alice@example.com' },
    { type: 'added', path: 'phone', newValue: '123-456-7890' }
  ],
  added: { phone: '123-456-7890' },
  removed: { email: 'alice@example.com' },
  modified: { age: { old: 25, new: 26 } }
}
*/
```

### 嵌套对象比较

```typescript
const oldConfig = {
  database: {
    host: 'localhost',
    port: 5432,
    credentials: {
      user: 'admin',
      pass: 'secret'
    }
  },
  features: ['auth', 'logging']
};

const newConfig = {
  database: {
    host: 'production.db.com',
    port: 5432,
    credentials: {
      user: 'admin',
      pass: 'new-secret'
    }
  },
  features: ['auth', 'logging', 'metrics']
};

const diff = objectDiff(oldConfig, newConfig);

console.log(diff.diffs);
/*
[
  { type: 'modified', path: 'database.host', oldValue: 'localhost', newValue: 'production.db.com' },
  { type: 'modified', path: 'database.credentials.pass', oldValue: 'secret', newValue: 'new-secret' },
  { type: 'added', path: 'features[2]', newValue: 'metrics' }
]
*/
```

### 生成差异报告

```typescript
import { objectDiff, formatDiffReport } from '@/skills/compare-utils-skill';

const diff = objectDiff(oldConfig, newConfig);
const report = formatDiffReport(diff);

console.log(report);
/*
✗ 发现 3 处差异:

  ~ database.host:
      旧："localhost"
      新："production.db.com"
  ~ database.credentials.pass:
      旧："secret"
      新："new-secret"
  + features[2]: "metrics"
*/
```

---

## 📋 数组差异比较 (arrayDiff)

### 基础用法

```typescript
import { arrayDiff } from '@/skills/compare-utils-skill';

const oldList = [1, 2, 3, 4, 5];
const newList = [1, 3, 4, 6];

const diff = arrayDiff(oldList, newList);

console.log(diff);
/*
{
  hasChanges: true,
  added: [6],
  removed: [2, 5],
  modified: {},
  unchanged: [1, 3, 4],
  diffs: [
    { type: 'removed', path: '[1]', oldValue: 2 },
    { type: 'removed', path: '[4]', oldValue: 5 },
    { type: 'added', path: '[3]', newValue: 6 }
  ]
}
*/
```

### 对象数组比较

```typescript
const oldUsers = [
  { id: 1, name: 'Alice' },
  { id: 2, name: 'Bob' },
  { id: 3, name: 'Charlie' }
];

const newUsers = [
  { id: 1, name: 'Alice' },
  { id: 3, name: 'Charlie Updated' },
  { id: 4, name: 'David' }
];

// 使用自定义比较函数 (基于 id)
const diff = arrayDiff(
  oldUsers,
  newUsers,
  '',
  (a, b) => a.id === b.id
);

console.log(diff);
/*
{
  hasChanges: true,
  added: [{ id: 4, name: 'David' }],
  removed: [{ id: 2, name: 'Bob' }],
  modified: {
    1: {
      old: { id: 3, name: 'Charlie' },
      new: { id: 3, name: 'Charlie Updated' }
    }
  },
  unchanged: [
    { id: 1, name: 'Alice' },
    { id: 3, name: 'Charlie Updated' }
  ]
}
*/
```

### 使用键值函数 (arrayDiffByKey)

```typescript
import { arrayDiffByKey } from '@/skills/compare-utils-skill';

const oldProducts = [
  { sku: 'A001', name: 'Product A', price: 100 },
  { sku: 'A002', name: 'Product B', price: 200 }
];

const newProducts = [
  { sku: 'A001', name: 'Product A', price: 120 },
  { sku: 'A003', name: 'Product C', price: 150 }
];

const diff = arrayDiffByKey(
  oldProducts,
  newProducts,
  product => product.sku
);

console.log(diff);
/*
{
  hasChanges: true,
  added: [{ sku: 'A003', name: 'Product C', price: 150 }],
  removed: [{ sku: 'A002', name: 'Product B', price: 200 }],
  modified: {
    0: {
      old: { sku: 'A001', name: 'Product A', price: 100 },
      new: { sku: 'A001', name: 'Product A', price: 120 }
    }
  }
}
*/
```

---

## 🔧 高级工具

### 比较多个对象

```typescript
import { compareMultiple } from '@/skills/compare-utils-skill';

const versions = [
  { v: '1.0', feature: 'auth' },
  { v: '1.1', feature: 'auth' },
  { v: '1.2', feature: 'auth+2fa' }
];

const result = compareMultiple(versions);

console.log(result.diffs[0]); // v1.0 vs v1.1
console.log(result.diffs[1]); // v1.0 vs v1.2
```

### 查找重复元素

```typescript
import { findDuplicates } from '@/skills/compare-utils-skill';

// 基础用法
const numbers = [1, 2, 2, 3, 3, 3];
const duplicates = findDuplicates(numbers);
// → [2, 3]

// 基于键值
const users = [
  { id: 1, email: 'a@test.com' },
  { id: 2, email: 'b@test.com' },
  { id: 3, email: 'a@test.com' }
];

const duplicateEmails = findDuplicates(users, user => user.email);
// → [{ id: 1, email: 'a@test.com' }, { id: 3, email: 'a@test.com' }]
```

---

## 🎯 实际应用场景

### 1. 配置变更检测

```typescript
function detectConfigChanges(oldConfig: any, newConfig: any) {
  const diff = objectDiff(oldConfig, newConfig);
  
  if (!diff.hasChanges) {
    console.log('✓ 配置无变化');
    return;
  }
  
  console.log('⚠️ 配置变更检测:');
  console.log(formatDiffReport(diff));
  
  // 发送告警
  if (diff.modified['database.host']) {
    sendAlert('数据库主机变更!');
  }
}
```

### 2. 数据同步

```typescript
async function syncData(localData: any[], remoteData: any[]) {
  const diff = arrayDiffByKey(localData, remoteData, item => item.id);
  
  // 添加新数据
  for (const item of diff.added) {
    await db.insert(item);
  }
  
  // 移除已删除的数据
  for (const item of diff.removed) {
    await db.delete(item.id);
  }
  
  // 更新修改的数据
  for (const [index, change] of Object.entries(diff.modified)) {
    await db.update(change.new);
  }
  
  return diff;
}
```

### 3. 表单变更追踪

```typescript
function trackFormChanges(originalForm: any, currentForm: any) {
  const diff = objectDiff(originalForm, currentForm);
  
  const changedFields = Object.keys(diff.modified);
  
  if (changedFields.length > 0) {
    markFormAsDirty(true);
    highlightFields(changedFields);
  }
  
  return diff;
}
```

### 4. API 响应比较

```typescript
function compareApiResponse(before: any, after: any) {
  if (deepEqual(before, after)) {
    console.log('✓ API 响应无变化');
    return null;
  }
  
  const diff = objectDiff(before, after);
  return {
    timestamp: new Date(),
    endpoint: '/api/data',
    changes: diff.diffs.length,
    details: diff
  };
}
```

---

## ⚡ 性能提示

1. **大对象比较**: 对于大型对象，考虑先比较长度或哈希值
2. **数组比较**: 使用 `arrayDiffByKey` 比自定义比较函数更快
3. **深度比较**: 设置合理的递归深度限制
4. **缓存结果**: 对频繁比较的对象缓存比较结果

```typescript
// 优化示例：先比较长度
function optimizedCompare(a: any, b: any) {
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
  }
  if (isObject(a) && isObject(b)) {
    if (Object.keys(a).length !== Object.keys(b).length) return false;
  }
  return deepEqual(a, b);
}
```

---

## 📝 注意事项

1. **循环引用**: 当前实现不支持循环引用的对象比较
2. **函数比较**: 函数始终被认为不相等 (除非是同一引用)
3. **Symbol 键**: Symbol 键不会被比较
4. **性能**: 深度比较的时间复杂度为 O(n)，n 为对象/数组大小

---

## 🧪 测试示例

```typescript
import { describe, it, expect } from 'vitest';
import { deepEqual, objectDiff, arrayDiff } from '@/skills/compare-utils-skill';

describe('CompareUtils', () => {
  it('should compare nested objects', () => {
    expect(deepEqual({ a: { b: 1 } }, { a: { b: 1 } })).toBe(true);
  });
  
  it('should detect object changes', () => {
    const diff = objectDiff({ a: 1 }, { a: 2 });
    expect(diff.hasChanges).toBe(true);
    expect(diff.modified.a).toEqual({ old: 1, new: 2 });
  });
  
  it('should compare arrays', () => {
    const diff = arrayDiff([1, 2], [1, 3]);
    expect(diff.removed).toEqual([2]);
    expect(diff.added).toEqual([3]);
  });
});
```

---

**创建时间:** 2026-03-13  
**版本:** 1.0.0  
**维护者:** Axon
