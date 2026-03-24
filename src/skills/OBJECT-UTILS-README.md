# 对象工具技能 - Object Utils Skill

**作者:** KAEL  
**版本:** 1.0.0  
**位置:** `src/skills/object-utils-skill.ts`

---

## 📦 功能概览

提供三大类对象操作功能：

### 1. 对象克隆
- `deepClone()` - 深克隆 (支持循环引用、Date、RegExp、Map、Set)
- `shallowClone()` - 浅克隆

### 2. 对象合并
- `deepMerge()` - 深合并 (支持数组策略配置)
- `shallowMerge()` - 浅合并

### 3. 对象转换
- `transform()` - 通用转换 (键名/值/过滤)
- `toSnakeCase()` - 转为 snake_case
- `toCamelCase()` - 转为 camelCase
- `toKebabCase()` - 转为 kebab-case
- `toPascalCase()` - 转为 PascalCase
- `flattenObject()` - 对象扁平化
- `unflattenObject()` - 对象解扁平化
- `diff()` - 对象差值计算
- `pick()` - 选取指定键
- `omit()` - 排除指定键

---

## 🚀 快速开始

```typescript
import {
  deepClone,
  shallowClone,
  deepMerge,
  shallowMerge,
  transform,
  toSnakeCase,
  toCamelCase,
  flattenObject,
  diff,
  pick,
  omit
} from './skills/object-utils-skill';
```

---

## 📖 使用示例

### 1. 对象克隆

#### 深克隆 (Deep Clone)

```typescript
const original = {
  a: 1,
  b: { c: 2, d: [3, 4] },
  e: new Date('2024-01-01'),
  f: /test/gi
};

const cloned = deepClone(original);
cloned.b.c = 999;

console.log(original.b.c); // 2 (原对象未受影响)
console.log(cloned.b.c);   // 999
```

#### 处理循环引用

```typescript
const circular: any = { a: 1 };
circular.self = circular;

// 忽略循环引用
const cloned = deepClone(circular, { circular: 'ignore' });

// 抛出错误
try {
  deepClone(circular, { circular: 'throw' });
} catch (e) {
  console.error(e.message); // Circular reference detected
}
```

#### 浅克隆 (Shallow Clone)

```typescript
const original = { a: 1, b: { c: 2 } };
const shallow = shallowClone(original);

shallow.a = 10;
shallow.b.c = 20;

console.log(original.a);   // 1 (未受影响)
console.log(original.b.c); // 20 (嵌套对象受影响)
```

---

### 2. 对象合并

#### 深合并 (Deep Merge)

```typescript
const base = { 
  a: 1, 
  b: { c: 2, d: 3 },
  tags: ['x', 'y']
};

const extra = { 
  b: { c: 4, e: 5 }, 
  f: 6,
  tags: ['z']
};

const merged = deepMerge(base, extra);
// { a: 1, b: { c: 4, d: 3, e: 5 }, tags: ['z'], f: 6 }
```

#### 数组合并策略

```typescript
// 替换 (默认)
deepMerge(base, extra);
// tags: ['z']

// 合并
deepMerge(base, extra, { arrayStrategy: 'merge' });
// tags: ['z', 'y'] (按索引合并)

// 拼接
deepMerge(base, extra, { arrayStrategy: 'concat' });
// tags: ['x', 'y', 'z']
```

#### 浅合并 (Shallow Merge)

```typescript
const base = { a: 1, b: 2 };
const extra = { b: 3, c: 4 };

const merged = shallowMerge(base, extra);
// { a: 1, b: 3, c: 4 }
```

---

### 3. 对象转换

#### 键名转换

```typescript
const camelObj = { firstName: 'John', lastName: 'Doe', age: 25 };

toSnakeCase(camelObj);
// { first_name: 'John', last_name: 'Doe', age: 25 }

toKebabCase(camelObj);
// { 'first-name': 'John', 'last-name': 'Doe', age: 25 }

toPascalCase(camelObj);
// { FirstName: 'John', LastName: 'Doe', Age: 25 }

toCamelCase({ first_name: 'John' });
// { firstName: 'John' }
```

#### 通用转换

```typescript
const obj = { a: 1, b: undefined, c: 3 };

// 过滤 undefined
transform(obj, {
  filter: (val) => val !== undefined
});
// { a: 1, c: 3 }

// 值转换 (数字转字符串)
transform(obj, {
  valueTransform: (val) => typeof val === 'number' ? String(val) : val
});
// { a: '1', b: undefined, c: '3' }

// 键名 + 值转换
transform(obj, {
  keyTransform: key => key.toUpperCase(),
  valueTransform: (val) => typeof val === 'number' ? val * 2 : val
});
// { A: 2, B: undefined, C: 6 }
```

---

### 4. 对象扁平化

```typescript
const nested = { 
  a: 1, 
  b: { c: 2, d: { e: 3, f: 4 } }, 
  g: 5 
};

// 扁平化
const flattened = flattenObject(nested);
// { a: 1, 'b.c': 2, 'b.d.e': 3, 'b.d.f': 4, 'g': 5 }

// 解扁平化
const unflattened = unflattenObject(flattened);
// { a: 1, b: { c: 2, d: { e: 3, f: 4 } }, g: 5 }

// 自定义分隔符
flattenObject(nested, '_');
// { a: 1, 'b_c': 2, 'b_d_e': 3, 'b_d_f': 4, 'g': 5 }
```

---

### 5. 对象差值

```typescript
const obj1 = { a: 1, b: 2, c: 3 };
const obj2 = { b: 20, c: 3, d: 4 };

const difference = diff(obj1, obj2);
// {
//   added: { d: 4 },
//   removed: { a: 1 },
//   changed: { b: { from: 2, to: 20 } }
// }
```

---

### 6. Pick & Omit

```typescript
const data = { 
  id: 1, 
  name: 'Test', 
  email: 'test@example.com', 
  password: 'secret' 
};

// 选取指定键
pick(data, ['id', 'name']);
// { id: 1, name: 'Test' }

// 排除指定键
omit(data, ['password', 'email']);
// { id: 1, name: 'Test' }
```

---

## 🔧 高级用法

### 组合使用

```typescript
// API 响应数据处理流程
const apiResponse = {
  user_data: {
    first_name: 'John',
    last_name: 'Doe',
    age: 25
  },
  metadata: {
    created_at: '2024-01-01',
    updated_at: '2024-01-02'
  }
};

// 1. 深克隆避免修改原数据
const cloned = deepClone(apiResponse);

// 2. 键名转换为 camelCase
const camelized = toCamelCase(cloned);

// 3. 选取需要的字段
const userData = pick(camelized.user_data, ['firstName', 'lastName']);

// 4. 合并默认值
const result = deepMerge(
  { firstName: 'Guest', lastName: 'User' },
  userData
);

console.log(result);
// { firstName: 'John', lastName: 'Doe' }
```

### 性能优化建议

1. **浅克隆 vs 深克隆**: 如果对象层级较浅或只需第一层隔离，使用 `shallowClone` 性能更好
2. **大对象合并**: 使用 `deepMerge` 时注意数组策略，`replace` 比 `concat` 性能更好
3. **频繁转换**: 如果多次转换同一对象，考虑缓存结果

---

## ⚠️ 注意事项

### 循环引用

```typescript
const circular: any = { a: 1 };
circular.self = circular;

// ❌ 会抛出错误
deepClone(circular);

// ✅ 正确处理
deepClone(circular, { circular: 'ignore' });
```

### 特殊类型支持

`deepClone` 支持以下特殊类型：
- ✅ Date
- ✅ RegExp
- ✅ Map
- ✅ Set
- ✅ Array
- ✅ Plain Object
- ❌ Function (保持引用)
- ❌ Class instances (保持引用)

### TypeScript 类型

所有函数都提供完整的 TypeScript 类型定义，支持泛型推导：

```typescript
interface User {
  id: number;
  name: string;
}

const user: User = { id: 1, name: 'Test' };
const cloned = deepClone(user); // 类型保持为 User
```

---

## 🧪 测试

运行示例代码：

```bash
cd /Users/nike/.openclaw/workspace
npx ts-node src/skills/object-utils-skill.ts
```

---

## 📝 更新日志

### v1.0.0 (2026-03-13)
- ✨ 初始版本
- ✅ 对象克隆 (深/浅)
- ✅ 对象合并 (深/浅)
- ✅ 对象转换 (键名/值/过滤)
- ✅ 对象扁平化/解扁平化
- ✅ 对象差值计算
- ✅ Pick/Omit 工具

---

**最后更新:** 2026-03-13  
**维护者:** KAEL
