# Storage Manager Skill - 存储管理工具

> 提供类型安全的浏览器存储封装，支持 localStorage、sessionStorage 和 IndexedDB

---

## 📦 功能特性

### ✅ 核心功能

1. **LocalStorage 封装**
   - 带命名空间前缀的键管理
   - 自动序列化/反序列化
   - 支持过期时间
   - 类型安全的泛型 API

2. **SessionStorage 封装**
   - 与 LocalStorage 相同的 API
   - 会话级数据存储
   - 支持过期时间

3. **IndexedDB 封装**
   - 异步 Promise API
   - 支持索引和范围查询
   - 批量操作
   - 事务支持

4. **统一存储管理器**
   - 智能选择最佳存储方式
   - 统一的 API 接口
   - 自动降级处理

---

## 🚀 快速开始

### 安装

无需安装，直接使用：

```typescript
import {
  LocalStorageManager,
  SessionStorageManager,
  IndexedDBManager,
  StorageManager,
  createLocalStorage,
  createSessionStorage,
  createIndexedDB,
} from './src/skills/storage-manager-skill';
```

### 基础使用

#### LocalStorage

```typescript
// 创建管理器
const storage = new LocalStorageManager('myapp');

// 存储数据
storage.set('username', 'Axon');
storage.set('user', { id: 1, name: 'Axon' });

// 获取数据
const username = storage.get<string>('username');
const user = storage.get<{ id: number; name: string }>('user');

// 删除数据
storage.remove('username');

// 检查是否存在
const exists = storage.has('user');

// 清空
storage.clear();
```

#### SessionStorage

```typescript
const session = new SessionStorageManager('session');

session.set('token', 'jwt-123');
const token = session.get('token');
```

#### IndexedDB

```typescript
const db = new IndexedDBManager({
  dbName: 'MyAppDB',
  storeName: 'users',
  keyPath: 'id',
  indexes: [
    { name: 'email', keyPath: 'email', unique: true },
  ],
});

await db.open();
await db.set('1', { id: '1', name: 'Axon', email: 'axon@example.com' });
const user = await db.get('1');
await db.remove('1');
```

---

## 📖 API 文档

### LocalStorageManager

#### 构造函数

```typescript
new LocalStorageManager(prefix?: string, options?: {
  serialize?: (value: any) => string;
  deserialize?: (value: string) => any;
})
```

#### 方法

| 方法 | 参数 | 返回值 | 描述 |
|------|------|--------|------|
| `set` | `key, value, options?` | `void` | 存储值 |
| `get<T>` | `key, defaultValue?` | `T \| null` | 获取值 |
| `remove` | `key` | `void` | 删除值 |
| `has` | `key` | `boolean` | 检查是否存在 |
| `clear` | - | `void` | 清空所有 |
| `keys` | - | `string[]` | 获取所有键 |
| `values` | - | `any[]` | 获取所有值 |
| `entries` | - | `[string, any][]` | 获取所有键值对 |
| `size` | - | `number` | 获取数量 |

#### 存储选项

```typescript
interface StorageOptions {
  expiry?: number;        // 过期时间 (毫秒)
  serialize?: Function;   // 自定义序列化器
  deserialize?: Function; // 自定义反序列化器
}
```

### SessionStorageManager

与 LocalStorageManager 相同的 API。

### IndexedDBManager

#### 构造函数

```typescript
new IndexedDBManager(config: IDBConfig)
```

#### IDBConfig

```typescript
interface IDBConfig {
  dbName: string;           // 数据库名称
  version?: number;         // 数据库版本
  storeName: string;        // 存储对象名称
  keyPath?: string;         // 键路径
  indexes?: IDBIndexConfig[]; // 索引定义
}
```

#### 方法

| 方法 | 参数 | 返回值 | 描述 |
|------|------|--------|------|
| `open` | - | `Promise<IDBDatabase>` | 打开数据库 |
| `close` | - | `void` | 关闭数据库 |
| `set` | `key, value` | `Promise<IDBValidKey>` | 存储值 |
| `get<T>` | `key, defaultValue?` | `Promise<T \| null>` | 获取值 |
| `remove` | `key` | `Promise<void>` | 删除值 |
| `has` | `key` | `Promise<boolean>` | 检查是否存在 |
| `clear` | - | `Promise<void>` | 清空 |
| `keys` | - | `Promise<IDBValidKey[]>` | 获取所有键 |
| `values` | - | `Promise<any[]>` | 获取所有值 |
| `entries` | - | `Promise<[IDBValidKey, any][]>` | 获取所有键值对 |
| `count` | - | `Promise<number>` | 获取数量 |
| `query` | `query?` | `Promise<any[]>` | 查询 |
| `setMany` | `items` | `Promise<void>` | 批量存储 |
| `removeMany` | `keys` | `Promise<void>` | 批量删除 |

#### 查询条件

```typescript
interface IDBQuery {
  indexName?: string;      // 索引名称
  range?: IDBKeyRange;     // 查询范围
  direction?: 'next' | 'prev' | 'nextunique' | 'prevunique';
  limit?: number;          // 限制数量
  offset?: number;         // 跳过数量
}
```

### StorageManager (统一管理器)

```typescript
const storage = new StorageManager('myapp', {
  dbName: 'MyAppDB',
  storeName: 'data',
});

// 访问底层管理器
storage.local.set('key', 'value');      // localStorage
storage.session.set('key', 'value');    // sessionStorage
await storage.db?.set('key', value);    // IndexedDB

// 智能存储 (自动选择最佳方式)
await storage.smartSet('key', value, { persistent: true });
const val = await storage.smartGet('key');
await storage.smartRemove('key');
```

---

## 💡 使用场景

### 1. 用户偏好设置

```typescript
const prefs = createLocalStorage('prefs');

prefs.set('theme', 'dark');
prefs.set('language', 'zh-CN');
prefs.set('notifications', true);

const theme = prefs.get('theme', 'light');
```

### 2. 购物车

```typescript
const cart = createLocalStorage('cart');

cart.set('items', [
  { id: '1', name: '商品 A', price: 99, quantity: 2 },
]);

const items = cart.get('items');
```

### 3. 表单草稿

```typescript
const drafts = createSessionStorage('drafts');

drafts.set('article-form', {
  title: '我的文章',
  content: '内容...',
}, { expiry: Date.now() + 3600000 }); // 1 小时后过期
```

### 4. API 缓存

```typescript
const cache = createLocalStorage('api-cache');

// 缓存 5 分钟
cache.set('users', data, { expiry: Date.now() + 300000 });

const cached = cache.get('users');
```

### 5. 大数据存储

```typescript
const db = createIndexedDB({
  dbName: 'AppDB',
  storeName: 'records',
  keyPath: 'id',
});

await db.set('1', { largeData: new Array(1000000).fill('x') });
```

---

## ⚠️ 注意事项

1. **浏览器环境**: 所有存储 API 仅在浏览器环境中可用
2. **大小限制**: 
   - localStorage: ~5MB
   - sessionStorage: ~5MB
   - IndexedDB: 无硬性限制 (通常 ≥ 50MB)
3. **过期时间**: 过期时间在获取时检查，不会自动删除
4. **序列化**: 默认使用 JSON.stringify/parse，循环引用会报错
5. **异步操作**: IndexedDB 所有操作都是异步的

---

## 📝 完整示例

查看 `storage-manager-skill.examples.ts` 获取完整使用示例。

---

## 🛠️ 开发信息

- **文件**: `src/skills/storage-manager-skill.ts`
- **示例**: `src/skills/storage-manager-skill.examples.ts`
- **类型**: TypeScript
- **依赖**: 无 (纯原生 API 封装)

---

**最后更新**: 2026-03-13  
**维护者**: Axon
