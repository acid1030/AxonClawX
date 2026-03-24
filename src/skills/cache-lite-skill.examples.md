# Cache Lite - 使用示例

轻量级内存缓存工具，支持 TTL 过期和 LRU 淘汰策略。

---

## 🚀 快速开始

### 基础使用

```typescript
import { CacheLite } from './cache-lite-skill';

// 创建缓存实例
const cache = new CacheLite({ 
  defaultTTL: 60000,  // 默认 1 分钟过期
  maxSize: 100        // 最多 100 条
});

// 设置缓存
cache.set('user:1', { id: 1, name: 'Alice' });

// 获取缓存
const user = cache.get('user:1');
console.log(user); // { id: 1, name: 'Alice' }

// 删除缓存
cache.delete('user:1');

// 检查是否存在
if (cache.has('user:1')) {
  console.log('缓存存在');
}
```

---

## 📖 功能示例

### 1. 设置缓存 (Set)

```typescript
// 使用默认 TTL
cache.set('key', 'value');

// 自定义 TTL (5 分钟)
cache.set('key', 'value', 300000);

// 永不过期
cache.set('key', 'value', 0);

// 缓存对象
cache.set('user:1', {
  id: 1,
  name: 'Alice',
  email: 'alice@example.com'
});

// 缓存数组
cache.set('users', [
  { id: 1, name: 'Alice' },
  { id: 2, name: 'Bob' }
]);
```

### 2. 获取缓存 (Get)

```typescript
// 获取缓存值
const user = cache.get('user:1');

// 类型安全获取
const typedUser = cache.get<{ id: number; name: string }>('user:1');

// 处理缓存未命中
const value = cache.get('key');
if (value === undefined) {
  console.log('缓存未命中，需要从数据源获取');
} else {
  console.log('缓存命中:', value);
}
```

### 3. 删除缓存 (Delete)

```typescript
// 删除单个键
const deleted = cache.delete('user:1');
console.log(deleted); // true 或 false

// 清空所有缓存
cache.clear();
```

### 4. 获取或设置 (GetOrSet)

```typescript
// 异步获取或设置
const user = await cache.getOrSet('user:1', async () => {
  // 这个函数只在缓存未命中时执行
  return await fetchUserFromDatabase(1);
}, 60000); // 缓存 1 分钟

// 简化数据库查询
async function getUser(id: number) {
  return await cache.getOrSet(
    `user:${id}`,
    async () => await db.query('SELECT * FROM users WHERE id = ?', [id]),
    300000 // 5 分钟
  );
}
```

### 5. 统计信息

```typescript
// 获取统计信息
const stats = cache.getStats();
console.log(stats);
// {
//   hits: 50,
//   misses: 10,
//   sets: 100,
//   deletes: 5,
//   size: 85,
//   hitRate: 0.833
// }

// 计算命中率百分比
console.log(`命中率：${(stats.hitRate * 100).toFixed(2)}%`);

// 获取当前缓存数量
console.log(`缓存条目数：${cache.size()}`);

// 获取所有键
console.log(`所有键：${cache.keys()}`);
```

---

## 🎯 预定义配置

```typescript
import { 
  CacheLite,
  createShortTermCache,
  createMediumTermCache,
  createLongTermCache,
  createSessionCache,
  createAPICache
} from './cache-lite-skill';

// 使用预定义配置
const shortCache = createShortTermCache();    // 1 分钟，100 条
const mediumCache = createMediumTermCache();  // 5 分钟，500 条
const longCache = createLongTermCache();      // 1 小时，1000 条
const sessionCache = createSessionCache();    // 30 分钟，10000 条
const apiCache = createAPICache();            // 30 秒，2000 条

// 或者使用 presets 对象
import { presets } from './cache-lite-skill';

const customCache = new CacheLite(presets.longTerm);
```

---

## 💡 实际应用场景

### 场景 1: API 响应缓存

```typescript
class APIClient {
  private cache = createAPICache();

  async fetch(endpoint: string) {
    return await this.cache.getOrSet(
      `api:${endpoint}`,
      async () => {
        const response = await fetch(`https://api.example.com${endpoint}`);
        return await response.json();
      },
      30000 // 30 秒
    );
  }
}

// 使用
const api = new APIClient();
const users = await api.fetch('/users');
```

### 场景 2: 用户会话管理

```typescript
class SessionManager {
  private cache = createSessionCache();

  setSession(userId: string, sessionData: any) {
    this.cache.set(`session:${userId}`, sessionData);
  }

  getSession(userId: string) {
    return this.cache.get(`session:${userId}`);
  }

  invalidateSession(userId: string) {
    this.cache.delete(`session:${userId}`);
  }
}
```

### 场景 3: 数据库查询缓存

```typescript
class UserRepository {
  private cache = createMediumTermCache();

  async findById(id: number) {
    return await this.cache.getOrSet(
      `user:${id}`,
      async () => {
        return await db.query('SELECT * FROM users WHERE id = ?', [id]);
      },
      300000 // 5 分钟
    );
  }

  async invalidate(id: number) {
    this.cache.delete(`user:${id}`);
  }
}
```

### 场景 4: 防抖缓存 (避免重复请求)

```typescript
class RateLimiter {
  private cache = new CacheLite({ defaultTTL: 1000, maxSize: 1000 });

  async execute(key: string, fn: () => Promise<any>) {
    const pending = this.cache.get(`pending:${key}`);
    if (pending) {
      return pending; // 返回正在执行的 Promise
    }

    const promise = fn();
    this.cache.set(`pending:${key}`, promise, 1000);
    
    try {
      return await promise;
    } finally {
      this.cache.delete(`pending:${key}`);
    }
  }
}
```

### 场景 5: 配置缓存

```typescript
class ConfigManager {
  private cache = createLongTermCache();
  private config: any = null;

  async getConfig() {
    return await this.cache.getOrSet('app:config', async () => {
      const response = await fetch('/api/config');
      return await response.json();
    });
  }

  updateConfig(newConfig: any) {
    this.cache.set('app:config', newConfig);
  }
}
```

---

## 🔧 高级用法

### 监控缓存性能

```typescript
class CachedService {
  private cache = createMediumTermCache();
  private checkInterval: NodeJS.Timeout;

  constructor() {
    // 每 30 秒检查一次缓存性能
    this.checkInterval = setInterval(() => {
      const stats = this.cache.getStats();
      console.log(`[Cache Monitor] Hit Rate: ${(stats.hitRate * 100).toFixed(2)}%`);
      
      // 如果命中率过低，可能需要调整 TTL 或 maxSize
      if (stats.hitRate < 0.5) {
        console.warn('[Cache Warning] Low hit rate detected!');
      }
    }, 30000);
  }

  destroy() {
    clearInterval(this.checkInterval);
    this.cache.destroy();
  }
}
```

### 缓存预热

```typescript
async function warmupCache(cache: CacheLite, data: Array<{ key: string; value: any }>) {
  for (const item of data) {
    cache.set(item.key, item.value);
  }
  console.log(`Cache warmed up with ${data.length} entries`);
}

// 使用
const initialData = [
  { key: 'user:1', value: { id: 1, name: 'Alice' } },
  { key: 'user:2', value: { id: 2, name: 'Bob' } },
];
await warmupCache(cache, initialData);
```

### 批量操作

```typescript
class BatchCache {
  private cache = createMediumTermCache();

  setMany(items: Array<{ key: string; value: any; ttl?: number }>) {
    items.forEach(item => {
      this.cache.set(item.key, item.value, item.ttl);
    });
  }

  getMany(keys: string[]) {
    const results: Record<string, any> = {};
    keys.forEach(key => {
      results[key] = this.cache.get(key);
    });
    return results;
  }

  deleteMany(keys: string[]) {
    keys.forEach(key => this.cache.delete(key));
  }
}
```

---

## ⚠️ 注意事项

### 1. TTL 单位是毫秒

```typescript
// ✅ 正确
cache.set('key', 'value', 60000); // 1 分钟

// ❌ 错误 (会变成 1 毫秒)
cache.set('key', 'value', 60);
```

### 2. 缓存值会被引用

```typescript
const obj = { count: 1 };
cache.set('obj', obj);

obj.count = 2; // 缓存中的值也会变成 2!

// 建议：缓存不可变数据或深拷贝
cache.set('obj', { ...obj });
```

### 3. 及时清理资源

```typescript
// 在应用退出或缓存不再需要时
cache.destroy(); // 停止清理定时器
```

### 4. LRU 淘汰机制

```typescript
// 当缓存达到 maxSize 时，最久未使用的条目会被自动删除
const cache = new CacheLite({ maxSize: 100 });

// 访问会更新 lastAccessed 时间
cache.get('key'); // 这个键的访问时间会被更新，更不容易被淘汰
```

---

## 📊 性能建议

| 场景 | 推荐配置 |
|------|----------|
| API 响应缓存 | `defaultTTL: 30000, maxSize: 2000` |
| 用户会话 | `defaultTTL: 1800000, maxSize: 10000` |
| 数据库查询 | `defaultTTL: 300000, maxSize: 500` |
| 配置数据 | `defaultTTL: 3600000, maxSize: 100` |
| 临时计算结果 | `defaultTTL: 60000, maxSize: 1000` |

---

## 🎓 API 参考

### CacheLite 类

| 方法 | 参数 | 返回值 | 描述 |
|------|------|--------|------|
| `set` | `key: string, value: T, ttl?: number` | `void` | 设置缓存 |
| `get` | `key: string` | `T \| undefined` | 获取缓存 |
| `delete` | `key: string` | `boolean` | 删除缓存 |
| `has` | `key: string` | `boolean` | 检查是否存在 |
| `getOrSet` | `key: string, getter: () => Promise<T>, ttl?: number` | `Promise<T>` | 获取或设置 |
| `clear` | - | `void` | 清空所有缓存 |
| `getStats` | - | `CacheStats` | 获取统计信息 |
| `size` | - | `number` | 获取缓存数量 |
| `keys` | - | `string[]` | 获取所有键 |
| `destroy` | - | `void` | 销毁实例 |

### CacheStats 接口

```typescript
interface CacheStats {
  hits: number;      // 命中次数
  misses: number;    // 未命中次数
  sets: number;      // 设置次数
  deletes: number;   // 删除次数
  size: number;      // 当前缓存数量
  hitRate: number;   // 命中率 (0-1)
}
```

---

**创建时间:** 2026-03-13  
**版本:** 1.0.0  
**作者:** Axon
