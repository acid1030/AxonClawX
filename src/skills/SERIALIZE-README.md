# 序列化工具 - Serialize Utils

**ACE 技能模块** | 完成时间：2026-03-13

---

## 🎯 功能概览

| 功能 | 描述 | 状态 |
|------|------|------|
| **对象序列化** | JSON 序列化/反序列化 | ✅ |
| **深度克隆** | 通过序列化实现深拷贝 | ✅ |
| **循环引用处理** | 检测并安全处理循环引用 | ✅ |
| **内置类型支持** | Date, RegExp, Map, Set, Error | ✅ |
| **自定义类型** | 可扩展的自定义类型处理器 | ✅ |
| **深度限制** | 防止无限递归的最大深度控制 | ✅ |

---

## 📦 核心 API

### 序列化

```typescript
import { serialize, deserialize, deepClone, deepEqual } from './serialize-utils-skill';

// 基础序列化
const json = serialize(obj, {
  handleCircular: true,  // 处理循环引用
  space: 2,              // 缩进空格数
  maxDepth: 10,          // 最大深度
  customHandlers: [],    // 自定义类型处理器
});

// 反序列化
const obj = deserialize(json, {
  customHandlers: [],  // 自定义类型处理器
});
```

### 深度克隆

```typescript
const cloned = deepClone(original);
```

### 深度比较

```typescript
const equal = deepEqual(obj1, obj2);
```

### 循环引用检测

```typescript
const hasCircular = hasCircularReference(obj);
const cleaned = removeCircularReferences(obj);
```

### 深度计算

```typescript
const depth = getDepth(obj);
```

---

## 🔧 内置类型支持

以下类型会自动被正确序列化和还原：

- ✅ `Date` - ISO 字符串格式
- ✅ `RegExp` - 保留 pattern 和 flags
- ✅ `Map` - 转换为 entries 数组
- ✅ `Set` - 转换为普通数组
- ✅ `Error` - 保留 message, name, stack

---

## 🎨 自定义类型处理器

```typescript
class Vector3 {
  constructor(public x: number, public y: number, public z: number) {}
}

const vector3Handler: CustomTypeHandler = {
  typeName: 'Vector3',
  test: (v) => v instanceof Vector3,
  serialize: (v) => ({ x: v.x, y: v.y, z: v.z }),
  deserialize: (data) => new Vector3(data.x, data.y, data.z),
};

const json = serialize(obj, { customHandlers: [vector3Handler] });
const restored = deserialize(json, { customHandlers: [vector3Handler] });
```

---

## 📖 使用示例

运行示例文件查看完整演示：

```bash
cd src/skills
npx tsx serialize-utils-examples.ts
```

示例涵盖：
1. 基础序列化
2. 循环引用处理
3. 内置类型序列化
4. 深拷贝
5. 深度比较
6. 深度计算
7. 自定义类型处理器
8. 序列化选项
9. 实际应用场景

---

## 📁 文件位置

- **主文件**: `src/skills/serialize-utils-skill.ts`
- **示例文件**: `src/skills/serialize-utils-examples.ts`
- **本文档**: `src/skills/SERIALIZE-README.md`

---

## ⚡ 快速开始

```typescript
import { serialize, deserialize, deepClone } from './serialize-utils-skill';

// 1. 序列化包含复杂类型的对象
const data = {
  user: 'Axon',
  timestamp: new Date(),
  settings: new Map([['theme', 'dark']]),
};

const json = serialize(data);

// 2. 反序列化 (类型自动恢复)
const restored = deserialize(json);
console.log(restored.timestamp instanceof Date); // true

// 3. 深拷贝
const cloned = deepClone(data);
```

---

## 🛡️ 安全特性

- ✅ 循环引用检测与处理
- ✅ 最大深度限制 (防止栈溢出)
- ✅ WeakMap/WeakSet 内存管理 (自动 GC)
- ✅ 类型安全 (TypeScript 支持)

---

**状态**: ✅ 已完成并测试通过  
**测试**: 运行 `serialize-utils-examples.ts` 验证所有功能
