# 🛠️ 原型模式工具 - KAEL

> 专业级原型模式实现，支持深拷贝/浅拷贝、原型注册表、自定义原型类

**版本:** 1.0.0  
**作者:** KAEL  
**日期:** 2026-03-13

---

## 📋 功能概览

| 功能模块 | 描述 | 核心 API |
|---------|------|---------|
| **原型定义** | 创建可克隆的原型对象 | `PrototypeBase`, `createPrototype`, `createPrototypeFactory` |
| **深/浅拷贝** | 智能对象克隆 | `shallowClone`, `deepClone`, `partialClone`, `mergeClone` |
| **原型注册表** | 全局原型管理 | `PrototypeRegistry`, `globalPrototypeRegistry` |

---

## 🚀 快速开始

### 安装

```bash
# 无需安装，直接导入使用
import { ... } from './src/skills/prototype-pattern-pro-skill';
```

### 基础示例

```typescript
import { createPrototype, deepClone, PrototypeRegistry } from './prototype-pattern-pro-skill';

// 1. 创建原型
const userPrototype = createPrototype('User', {
  id: 0,
  name: 'Anonymous',
  email: '',
  roles: ['user']
});

// 2. 克隆对象
const user1 = userPrototype.clone();
const user2 = userPrototype.clone(true); // 深拷贝

// 3. 使用注册表
const registry = new PrototypeRegistry();
registry.register('User', userPrototype);

const user3 = registry.clone('User');
```

---

## 📖 详细文档

### 1. 原型定义

#### 1.1 简单原型创建

```typescript
import { createPrototype } from './prototype-pattern-pro-skill';

const productPrototype = createPrototype(
  'Product',
  {
    id: 0,
    name: 'Unnamed',
    price: 0,
    stock: 0,
    categories: []
  },
  '产品原型对象'
);

// 克隆
const product1 = productPrototype.clone();
const product2 = productPrototype.clone(true); // 深拷贝

product1.name = 'iPhone 16';
product1.price = 7999;
```

#### 1.2 工厂函数创建

```typescript
import { createPrototypeFactory } from './prototype-pattern-pro-skill';

const configPrototype = createPrototypeFactory('Config', () => ({
  version: '1.0.0',
  features: ['dashboard', 'analytics'],
  limits: {
    maxUsers: 100,
    maxStorage: '10GB'
  },
  createdAt: new Date().toISOString()
}));

// 每次克隆都会调用工厂函数，确保独立实例
const config1 = configPrototype.clone();
const config2 = configPrototype.clone();
```

#### 1.3 自定义原型类

```typescript
import { PrototypeBase, deepClone } from './prototype-pattern-pro-skill';

interface User {
  id: number;
  name: string;
  email: string;
  createdAt: Date;
}

class UserPrototype extends PrototypeBase<User> {
  constructor(
    public id: number = 0,
    public name: string = 'Anonymous',
    public email: string = ''
  ) {
    super('UserPrototype', '自定义用户原型类');
  }
  
  clone(deep: boolean = false): User {
    const user: User = {
      id: this.id,
      name: this.name,
      email: this.email,
      createdAt: new Date()
    };
    
    if (deep) {
      return deepClone(user);
    }
    return user;
  }
}

// 使用
const baseUser = new UserPrototype(1, 'Alice', 'alice@example.com');
const userClone = baseUser.clone(true);
```

---

### 2. 深拷贝/浅拷贝

#### 2.1 浅拷贝

```typescript
import { shallowClone } from './prototype-pattern-pro-skill';

const original = { a: 1, b: { c: 2 } };
const shallow = shallowClone(original);

shallow.b.c = 3;
console.log(original.b.c); // 3 (引用相同，被污染!)
```

#### 2.2 深拷贝

```typescript
import { deepClone } from './prototype-pattern-pro-skill';

const original = {
  a: 1,
  b: { c: 2, d: [3, 4] },
  e: new Date(),
  f: /test/gi,
  g: new Set([1, 2]),
  h: new Map([['key', 'value']])
};

const deep = deepClone(original);
deep.b.c = 999;

console.log(original.b.c); // 2 (完全独立)
```

**深拷贝配置:**

```typescript
const deep = deepClone(obj, {
  maxDepth: 10,           // 最大递归深度
  detectCycles: true,     // 循环引用检测
  excludeFields: ['password', 'token'], // 排除字段
  customCloners: new Map([
    [CustomType, (value) => new CustomType(value.data)]
  ])
});
```

#### 2.3 部分克隆

```typescript
import { partialClone } from './prototype-pattern-pro-skill';

const user = {
  id: 1,
  name: 'Bob',
  email: 'bob@example.com',
  password: 'secret',
  token: 'abc-xyz'
};

// 只克隆安全字段
const safeUser = partialClone(user, ['id', 'name', 'email']);
// 结果：{ id: 1, name: 'Bob', email: 'bob@example.com' }
```

#### 2.4 合并克隆

```typescript
import { mergeClone } from './prototype-pattern-pro-skill';

const baseConfig = { theme: 'light', lang: 'zh', debug: false };
const userConfig = { theme: 'dark', fontSize: 14 };
const envConfig = { debug: true, apiUrl: 'https://api.example.com' };

const merged = mergeClone([baseConfig, userConfig, envConfig], true);
// 结果：{ theme: 'dark', lang: 'zh', debug: true, fontSize: 14, apiUrl: '...' }
```

---

### 3. 原型注册表

#### 3.1 基础使用

```typescript
import { PrototypeRegistry } from './prototype-pattern-pro-skill';

const registry = new PrototypeRegistry();

// 注册原型
const userPrototype = createPrototype('User', { id: 0, name: '' });
const productPrototype = createPrototype('Product', { id: 0, name: '', price: 0 });

registry.register('User', userPrototype, '用户原型');
registry.register('Product', productPrototype, '产品原型');

// 克隆
const user1 = registry.clone('User');
const product1 = registry.clone('Product', true); // 深拷贝

// 查询
const userEntry = registry.get('User');
const hasUser = registry.has('User'); // true

// 注销
registry.unregister('User');
```

#### 3.2 搜索原型

```typescript
const results = registry.search('Product');

console.log('匹配数量:', results.count);
console.log('原型列表:', results.prototypes.map(p => p.name));
console.log('查询条件:', results.query);
```

#### 3.3 统计信息

```typescript
const stats = registry.getStats();

console.log('总原型数:', stats.totalPrototypes);
console.log('总克隆数:', stats.totalClones);
console.log('最常克隆:', stats.topCloned);
// topCloned: [{ name: 'User', count: 15 }, { name: 'Product', count: 10 }, ...]
```

#### 3.4 导出注册表

```typescript
const json = registry.exportAll();
console.log(json);
// [
//   { "name": "User", "description": "用户原型", "registeredAt": "...", "cloneCount": 15 },
//   { "name": "Product", "description": "产品原型", "registeredAt": "...", "cloneCount": 10 }
// ]
```

#### 3.5 全局注册表

```typescript
import { globalPrototypeRegistry } from './prototype-pattern-pro-skill';

// 全应用共享的单例注册表
globalPrototypeRegistry.register('Config', configPrototype);
const config = globalPrototypeRegistry.clone('Config');
```

---

## 💡 使用场景

### 场景 1: 对象池模式

```typescript
// 预创建原型，快速克隆
const enemyPrototype = createPrototype('Enemy', {
  id: 0,
  type: 'soldier',
  hp: 100,
  position: { x: 0, y: 0 },
  state: 'idle'
});

// 游戏循环中快速生成敌人
const enemies = Array.from({ length: 50 }, () => {
  const enemy = enemyPrototype.clone(true);
  enemy.id = generateId();
  enemy.position = { x: randomX(), y: randomY() };
  return enemy;
});
```

### 场景 2: 配置管理

```typescript
// 基于模板创建配置
const defaultConfigPrototype = createPrototypeFactory('DefaultConfig', () => ({
  version: '1.0.0',
  theme: 'light',
  language: 'zh-CN',
  features: {
    dashboard: true,
    analytics: true,
    notifications: false
  },
  limits: {
    maxUsers: 100,
    maxStorage: '10GB'
  }
}));

// 为每个租户创建独立配置
const tenantConfigs = tenants.map((tenant) => {
  const config = defaultConfigPrototype.clone(true);
  config.tenantId = tenant.id;
  config.customSettings = tenant.settings;
  return config;
});
```

### 场景 3: 测试数据生成

```typescript
// 快速生成测试数据
const testUserPrototype = createPrototype('TestUser', {
  id: 0,
  name: 'Test User',
  email: 'test@example.com',
  roles: ['user'],
  createdAt: new Date().toISOString()
});

// 生成 100 个测试用户
const testUsers = Array.from({ length: 100 }, (_, i) => {
  const user = testUserPrototype.clone(true);
  user.id = i + 1;
  user.name = `Test User ${i + 1}`;
  user.email = `test${i + 1}@example.com`;
  return user;
});
```

### 场景 4: 游戏实体克隆

```typescript
class EntityPrototype extends PrototypeBase<Entity> {
  constructor(
    public type: string,
    public props: Record<string, any>
  ) {
    super(`Entity:${type}`, `${type} 实体原型`);
  }
  
  clone(deep: boolean = false): Entity {
    const entity: Entity = {
      id: generateEntityId(),
      type: this.type,
      props: deep ? deepClone(this.props) : { ...this.props },
      createdAt: Date.now()
    };
    return entity;
  }
}

// 注册各种实体原型
registry.register('Entity:Sword', new EntityPrototype('Sword', { damage: 10, durability: 100 }));
registry.register('Entity:Potion', new EntityPrototype('Potion', { heal: 50, stackable: true }));

// 游戏中快速生成实体
const sword = registry.clone('Entity:Sword', true);
const potion = registry.clone('Entity:Potion', true);
```

---

## 🔧 API 参考

### 类型定义

| 类型 | 描述 |
|-----|------|
| `ICloneable<T>` | 可克隆接口 |
| `IPrototype<T>` | 原型对象接口 |
| `DeepCloneConfig` | 深拷贝配置 |
| `PrototypeRegistryEntry<T>` | 注册表条目 |

### 函数/类

| 名称 | 类型 | 描述 |
|-----|------|------|
| `PrototypeBase<T>` | 抽象类 | 原型基类 |
| `createPrototype` | 函数 | 创建简单原型 |
| `createPrototypeFactory` | 函数 | 工厂函数创建原型 |
| `shallowClone` | 函数 | 浅拷贝 |
| `deepClone` | 函数 | 深拷贝 |
| `partialClone` | 函数 | 部分克隆 |
| `mergeClone` | 函数 | 合并克隆 |
| `PrototypeRegistry` | 类 | 原型注册表 |
| `globalPrototypeRegistry` | 实例 | 全局注册表单例 |

---

## ⚠️ 注意事项

1. **循环引用**: `deepClone` 默认启用循环引用检测，使用 `WeakMap` 跟踪已访问对象
2. **性能**: 深拷贝大对象时注意性能，可设置 `maxDepth` 限制递归深度
3. **排除字段**: 使用 `excludeFields` 避免克隆敏感数据 (密码、token 等)
4. **自定义类型**: 对于自定义类，提供 `customCloners` 映射确保正确克隆
5. **线程安全**: 注册表非线程安全，多线程环境需自行加锁

---

## 📝 更新日志

### v1.0.0 (2026-03-13)
- ✅ 初始版本发布
- ✅ 原型定义功能
- ✅ 深/浅拷贝实现
- ✅ 原型注册表
- ✅ 完整文档和示例

---

**🜏 KAEL | 专业原型模式工具**
