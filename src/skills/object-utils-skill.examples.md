# Object Utils Skill - 使用示例

**对象处理工具技能** - 提供深度克隆/合并、差值/补丁、转换/过滤等功能

---

## 1. 深度克隆 (Deep Clone)

### 基础用法

```typescript
import { deepClone } from './object-utils-skill';

const original = {
  name: 'Axon',
  stats: { str: 100, int: 999 },
  skills: ['fireball', 'lightning']
};

const cloned = deepClone(original);

// 修改克隆对象不影响原对象
cloned.stats.str = 200;
console.log(original.stats.str); // 100
console.log(cloned.stats.str);   // 200
```

### 高级配置

```typescript
// 处理循环引用
const circular: any = { name: 'test' };
circular.self = circular;

const cloned = deepClone(circular, {
  circular: 'reference',  // 'throw' | 'ignore' | 'reference'
  maxDepth: 5,
  cloneSymbols: true
});

// 克隆 Date 和 RegExp
const objWithDate = {
  created: new Date(),
  pattern: /test/gi
};

const cloned = deepClone(objWithDate);
console.log(cloned.created instanceof Date); // true
console.log(cloned.pattern instanceof RegExp); // true
```

---

## 2. 深度合并 (Deep Merge)

### 基础用法

```typescript
import { deepMerge } from './object-utils-skill';

const base = {
  user: { name: 'Axon', level: 99 },
  config: { theme: 'dark' }
};

const override = {
  user: { level: 100, exp: 9999 },
  config: { lang: 'zh' }
};

const merged = deepMerge(base, override);
// {
//   user: { name: 'Axon', level: 100, exp: 9999 },
//   config: { theme: 'dark', lang: 'zh' }
// }
```

### 合并配置

```typescript
import { deepMergeWithConfig } from './object-utils-skill';

// 数组合并
const obj1 = { tags: ['a', 'b'] };
const obj2 = { tags: ['c', 'd'] };

const merged = deepMergeWithConfig(obj1, [obj2], {
  mergeArrays: true,
  arrayStrategy: 'concat'  // 'concat' | 'union' | 'replace'
});
// { tags: ['a', 'b', 'c', 'd'] }

// 忽略特定路径
const merged2 = deepMergeWithConfig(base, [override], {
  ignorePaths: ['user.level']  // 不合并 user.level
});

// 自定义合并函数
const merged3 = deepMergeWithConfig(obj1, [obj2], {
  customMerger: (key, val1, val2) => {
    if (key === 'tags') {
      return [...new Set([...val1, ...val2])]; // 去重合并
    }
    return undefined; // 使用默认逻辑
  }
});
```

---

## 3. 对象差值 (Diff)

### 基础用法

```typescript
import { diff } from './object-utils-skill';

const oldUser = {
  name: 'Axon',
  level: 99,
  skills: ['fireball']
};

const newUser = {
  name: 'Axon',
  level: 100,
  skills: ['fireball', 'lightning'],
  title: 'Archmage'
};

const patches = diff(oldUser, newUser);
// [
//   { op: 'update', path: 'level', oldValue: 99, newValue: 100 },
//   { op: 'update', path: 'skills', oldValue: ['fireball'], newValue: ['fireball', 'lightning'] },
//   { op: 'add', path: 'title', newValue: 'Archmage' }
// ]
```

### 差值配置

```typescript
const patches = diff(oldObj, newObj, {
  ignoreUndefined: true,  // 忽略 undefined 值
  ignoreNull: false,
  compareArrayOrder: false,  // 数组无序比较
  maxDepth: 3
});
```

---

## 4. 应用补丁 (Patch)

### 基础用法

```typescript
import { patch } from './object-utils-skill';

const user = { name: 'Axon', level: 99 };

const patches = [
  { op: 'update', path: 'level', newValue: 100 },
  { op: 'add', path: 'title', newValue: 'Archmage' }
];

const updated = patch(user, patches);
// { name: 'Axon', level: 100, title: 'Archmage' }
```

### 嵌套路径补丁

```typescript
const config = {
  user: { name: 'Axon', settings: { theme: 'dark' } }
};

const patches = [
  { op: 'update', path: 'user.settings.theme', newValue: 'light' },
  { op: 'add', path: 'user.settings.lang', newValue: 'zh' }
];

const updated = patch(config, patches);
// { user: { name: 'Axon', settings: { theme: 'light', lang: 'zh' } } }
```

---

## 5. 对象过滤 (Filter)

### 包含/排除路径

```typescript
import { filterObject } from './object-utils-skill';

const user = {
  name: 'Axon',
  password: 'secret123',
  email: 'axon@example.com',
  settings: {
    theme: 'dark',
    apiKey: 'sk-xxx'
  }
};

// 只包含指定路径
const filtered = filterObject(user, {
  includePaths: ['name', 'email']
});
// { name: 'Axon', email: 'axon@example.com' }

// 排除敏感信息
const safe = filterObject(user, {
  excludePaths: ['password', 'settings.apiKey']
});
// { name: 'Axon', email: 'axon@example.com', settings: { theme: 'dark' } }
```

### 谓词过滤

```typescript
const filtered = filterObject(user, {
  predicate: (value, key, path) => {
    // 只保留字符串类型的值
    return typeof value === 'string';
  }
});

// 递归过滤嵌套对象
const filtered2 = filterObject(user, {
  predicate: (value) => value !== null && value !== undefined,
  recursive: true
});
```

---

## 6. 对象转换 (Transform)

### 键/值转换

```typescript
import { transformObject } from './object-utils-skill';

const obj = { firstName: 'Axon', lastName: 'Core' };

// 键转大写
const transformed = transformObject(obj, {
  keyTransform: (key) => key.toUpperCase()
});
// { FIRSTNAME: 'Axon', LASTNAME: 'Core' }

// 值转字符串
const transformed2 = transformObject(obj, {
  valueTransform: (val) => String(val).toUpperCase()
});
// { firstName: 'AXON', lastName: 'CORE' }

// 组合转换
const transformed3 = transformObject(obj, {
  keyTransform: (key) => key.replace(/([A-Z])/g, '_$1').toLowerCase(),
  valueTransform: (val) => val.trim()
});
// { first_name: 'Axon', last_name: 'Core' }
```

### 嵌套对象转换

```typescript
const nested = {
  user: { name: 'Axon', level: 99 },
  stats: { str: 100, int: 999 }
};

const transformed = transformObject(nested, {
  keyTransform: (key, path) => `${path}.${key}`.toUpperCase(),
  recursive: true,
  maxDepth: 2
});
```

---

## 7. 对象扁平化 (Flatten)

### 基础用法

```typescript
import { flatten } from './object-utils-skill';

const nested = {
  user: {
    name: 'Axon',
    stats: {
      str: 100,
      int: 999
    }
  },
  tags: ['mage', 'archmage']
};

const flat = flatten(nested);
// {
//   'user.name': 'Axon',
//   'user.stats.str': 100,
//   'user.stats.int': 999,
//   'tags.0': 'mage',
//   'tags.1': 'archmage'
// }
```

### 配置选项

```typescript
const flat = flatten(nested, {
  separator: '_',      // 自定义分隔符
  keepArrayIndex: true, // 保留数组索引
  maxDepth: 2          // 最大深度
});
// { 'user_name': 'Axon', 'user_stats': { str: 100, int: 999 }, 'tags.0': 'mage', 'tags.1': 'archmage' }
```

---

## 8. 对象去扁平化 (Unflatten)

```typescript
import { unflatten } from './object-utils-skill';

const flat = {
  'user.name': 'Axon',
  'user.stats.str': 100,
  'user.stats.int': 999,
  'tags.0': 'mage',
  'tags.1': 'archmage'
};

const nested = unflatten(flat);
// {
//   user: {
//     name: 'Axon',
//     stats: { str: 100, int: 999 }
//   },
//   tags: ['mage', 'archmage']
// }
```

---

## 9. 获取所有路径 (Get Paths)

```typescript
import { getPaths } from './object-utils-skill';

const obj = {
  a: 1,
  b: {
    c: 2,
    d: {
      e: 3
    }
  },
  f: [4, 5]
};

const paths = getPaths(obj);
// ['a', 'b.c', 'b.d.e', 'f.0', 'f.1']

// 自定义分隔符
const paths2 = getPaths(obj, '_');
// ['a', 'b_c', 'b_d_e', 'f_0', 'f_1']
```

---

## 10. 综合示例

### 配置管理系统

```typescript
import { deepMerge, diff, patch, filterObject } from './object-utils-skill';

// 默认配置
const defaultConfig = {
  theme: 'dark',
  lang: 'en',
  notifications: {
    email: true,
    push: false
  }
};

// 用户配置
const userConfig = {
  theme: 'light',
  notifications: {
    push: true
  }
};

// 合并配置
const finalConfig = deepMerge(defaultConfig, userConfig);

// 保存配置变更
const patches = diff(defaultConfig, finalConfig);
saveToDatabase({ userId: 1, patches });

// 加载时应用补丁
const loadedConfig = patch(defaultConfig, patches);

// 导出时过滤敏感信息
const exportConfig = filterObject(finalConfig, {
  excludePaths: ['apiKey', 'secret']
});
```

### 表单状态管理

```typescript
import { deepClone, diff, patch } from './object-utils-skill';

// 表单初始状态
const initialFormState = {
  username: '',
  email: '',
  preferences: {
    newsletter: false,
    notifications: true
  }
};

// 当前表单状态
let currentFormState = deepClone(initialFormState);

// 用户修改后
const modifiedState = {
  ...currentFormState,
  username: 'axon',
  email: 'axon@example.com'
};

// 计算变更
const changes = diff(currentFormState, modifiedState);

// 只提交变更
await submitChanges(changes);

// 重置表单
currentFormState = patch(modifiedState, diff(modifiedState, initialFormState));
```

---

## API 速查表

| 函数 | 描述 | 参数 |
|------|------|------|
| `deepClone(obj, config?)` | 深度克隆对象 | CloneConfig |
| `deepMerge(target, ...sources)` | 深度合并对象 | - |
| `deepMergeWithConfig(target, sources, config)` | 带配置的深度合并 | MergeConfig |
| `diff(obj1, obj2, config?)` | 计算对象差值 | DiffConfig |
| `patch(obj, patches)` | 应用补丁到对象 | DiffPatch[] |
| `filterObject(obj, config?)` | 过滤对象属性 | FilterConfig |
| `transformObject(obj, config?)` | 转换对象 | TransformConfig |
| `flatten(obj, config?)` | 扁平化对象 | FlattenConfig |
| `unflatten(obj, config?)` | 去扁平化对象 | UnflattenConfig |
| `getPaths(obj, separator?)` | 获取所有路径 | string |

---

**版本:** 1.0.0  
**作者:** Axon (KAEL)  
**最后更新:** 2026-03-13
