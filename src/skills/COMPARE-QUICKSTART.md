# 🚀 Compare Utils 快速开始

## 安装

无需安装 - 已内置于 `src/skills/compare-utils-skill.ts`

## 导入

```typescript
import { deepEqual, objectDiff, arrayDiff } from '@/skills/compare-utils-skill';
```

## 核心 API

### 1. deepEqual - 深度相等比较

```typescript
deepEqual({ a: 1, b: { c: 2 } }, { a: 1, b: { c: 2 } }); // true
deepEqual([1, 2, 3], [1, 2, 3]); // true
deepEqual(new Date('2024-01-01'), new Date('2024-01-01')); // true
```

**支持类型:** Object, Array, Date, RegExp, Map, Set

### 2. objectDiff - 对象差异比较

```typescript
const diff = objectDiff(
  { a: 1, b: 2 },
  { a: 1, b: 3, c: 4 }
);

// diff = {
//   hasChanges: true,
//   added: { c: 4 },
//   removed: {},
//   modified: { b: { old: 2, new: 3 } }
// }
```

### 3. arrayDiff - 数组差异比较

```typescript
const diff = arrayDiff([1, 2, 3], [1, 3, 4]);

// diff = {
//   hasChanges: true,
//   added: [4],
//   removed: [2],
//   unchanged: [1, 3]
// }
```

### 4. arrayDiffByKey - 对象数组比较

```typescript
const diff = arrayDiffByKey(
  [{ id: 1, name: 'A' }, { id: 2, name: 'B' }],
  [{ id: 1, name: 'A' }, { id: 3, name: 'C' }],
  item => item.id
);
```

## 运行示例

```bash
npx tsx src/skills/compare-utils-examples.ts
```

## 完整文档

查看 `COMPARE-README.md` 获取详细文档。

---

**创建时间:** 2026-03-13  
**任务状态:** ✅ 完成
