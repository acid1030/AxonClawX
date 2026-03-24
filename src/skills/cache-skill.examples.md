# Cache Skill - 使用示例

缓存技能提供内存缓存、TTL 过期机制和缓存穿透保护功能。

---

## 📦 快速开始

### 1. 基础使用 (内存缓存)

```typescript
import { createCache } from './skills/cache-skill';

// 创建缓存实例
const cache = createCache({
  type: 'memory',
  defaultTTL: 300, // 5 分钟
  maxSize: 1000,
  enableStats: true,
});

// 设置缓存
cache.set('user:123', { id: 123, name: 'Alice' });

// 获取缓存
const user = cache.get('user:123');
console.log(user); // { id: 123, name: 'Alice' }

// 检查是否存在
if (cache.has('user:123')) {
  console.log('缓存存在');
}

// 删除缓存
cache.delete('user:123');
```

---

### 2. 带 TTL 的缓存

```typescript
// 设置带自定义 TTL 的缓存
cache.set('session:abc', { token: 'xyz' }, { ttl: 60 }); // 1 分钟过期

// 设置带标签的缓存 (用于批量删除)
cache.set('product:456', { name: 'Widget' }, {
  ttl: 300,
  tags: ['products', 'catalog'],
});

// 根据标签批量删除
cache.deleteByTag('products'); // 删除所有标记为 'products' 的缓存
```

---

### 3. 缓存穿透保护

```typescript
import { createProtectedCache } from './skills/cache-skill';

// 创建带布隆过滤器的缓存
const protectedCache = createProtectedCache(1000, 300);

// 自动缓存空值，防止穿透
protectedCache.set('nonexistent:key', null, { cacheNull: true });

// 后续查询会快速返回 null，不会穿透到数据库
const result = protectedCache.get('nonexistent:key'); // null
```

---

### 4. Get Or Set 模式

```typescript
// 异步获取或设置缓存
const user = await cache.getOrSet(
  'user:123',
  async () => {
    // 缓存未命中时执行
    return await db.users.findById(123);
  },
  { ttl: 300, tags: ['users'] }
);
```

---

### 5. Redis 缓存

```typescript
import { createRedisCache } from './skills/cache-skill';

// 创建 Redis 缓存实例
const redisCache = createRedisCache({
  host: 'localhost',
  port: 6379,
  password: 'your-password', // 可选
  db: 0,
  keyPrefix: 'myapp:',
});

// 使用方式与内存缓存相同
await redisCache.set('key', 'value', { ttl: 300 });
const value = await redisCache.get('key');
await redisCache.delete('key');
```

---

### 6. 使用预定义配置

```typescript
import { createCache, presets } from './skills/cache-skill';

// 使用预定义配置
const shortTermCache = createCache(presets.shortTerm); // 1 分钟
const longTermCache = createCache(presets.longTerm);   // 1 小时
const apiCache = createCache(presets.apiResponse);     // 30 秒 API 缓存
const userCache = createCache(presets.userData);       // 用户数据缓存
```

---

### 7. 统计信息监控

```typescript
// 获取缓存统计
const stats = cache.getStats();
console.log(stats);
// {
//   hits: 150,
//   misses: 30,
//   sets: 200,
//   deletes: 20,
//   size: 180,
//   hitRate: 0.833 // 83.3% 命中率
// }
```

---

## 🎯 实际应用场景

### 场景 1: API 响应缓存

```typescript
import { createCache, presets } from './skills/cache-skill';

const apiCache = createCache(presets.apiResponse);

// 中间件示例 (Express)
async function cacheMiddleware(req: any, res: any, next: () => void) {
  const cacheKey = `api:${req.method}:${req.path}`;
  
  const cached = await apiCache.get(cacheKey);
  if (cached) {
    return res.json(cached);
  }

  // 拦截响应
  const originalJson = res.json.bind(res);
  res.json = async (data: any) => {
    await apiCache.set(cacheKey, data, { ttl: 30 });
    return originalJson(data);
  };

  next();
}
```

---

### 场景 2: 用户数据缓存

```typescript
import { createProtectedCache } from './skills/cache-skill';

const userCache = createProtectedCache(500, 600); // 10 分钟

class UserService {
  async getUser(id: string) {
    return await userCache.getOrSet(
      `user:${id}`,
      async () => {
        // 数据库查询
        return await db.users.findById(id);
      },
      { tags: ['users'] }
    );
  }

  async invalidateUser(id: string) {
    await userCache.delete(`user:${id}`);
  }

  async invalidateAllUsers() {
    userCache.deleteByTag('users');
  }
}
```

---

### 场景 3: 会话管理

```typescript
import { createSessionCache } from './skills/cache-skill';

const sessionCache = createSessionCache(1800); // 30 分钟会话

class SessionManager {
  async createSession(userId: string) {
    const sessionId = generateSessionId();
    await sessionCache.set(`session:${sessionId}`, {
      userId,
      createdAt: Date.now(),
    }, { ttl: 1800 });
    return sessionId;
  }

  async getSession(sessionId: string) {
    return await sessionCache.get(`session:${sessionId}`);
  }

  async destroySession(sessionId: string) {
    await sessionCache.delete(`session:${sessionId}`);
  }

  async refreshSession(sessionId: string) {
    const session = await this.getSession(sessionId);
    if (session) {
      await sessionCache.set(`session:${sessionId}`, session, { ttl: 1800 });
    }
  }
}
```

---

### 场景 4: 数据库查询缓存

```typescript
import { createCache } from './skills/cache-skill';

const queryCache = createCache({
  type: 'memory',
  defaultTTL: 300,
  maxSize: 2000,
  penetrationProtection: {
    enableBloomFilter: true,
    cacheNull: true,
    nullCacheTTL: 60,
  },
});

class ProductRepository {
  async findById(id: string) {
    return await queryCache.getOrSet(
      `product:${id}`,
      async () => {
        return await db.products.findOne({ where: { id } });
      },
      { tags: ['products'] }
    );
  }

  async findByCategory(categoryId: string) {
    return await queryCache.getOrSet(
      `products:category:${categoryId}`,
      async () => {
        return await db.products.findMany({
          where: { categoryId },
        });
      },
      { ttl: 60, tags: ['products', `category:${categoryId}`] }
    );
  }

  async invalidateCategory(categoryId: string) {
    await queryCache.deleteByTag(`category:${categoryId}`);
  }
}
```

---

### 场景 5: 限流计数器

```typescript
import { createCache } from './skills/cache-skill';

const rateLimitCache = createCache({
  type: 'memory',
  defaultTTL: 60,
  maxSize: 10000,
});

class RateLimiter {
  async isAllowed(identifier: string, limit: number): Promise<boolean> {
    const key = `ratelimit:${identifier}`;
    let count = await rateLimitCache.get<number>(key) || 0;

    if (count >= limit) {
      return false;
    }

    await rateLimitCache.set(key, count + 1, { ttl: 60 });
    return true;
  }
}
```

---

## ⚙️ 配置选项

### CacheConfig

| 选项 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| type | 'memory' \| 'redis' | 'memory' | 缓存类型 |
| defaultTTL | number | 300 | 默认过期时间 (秒) |
| maxSize | number | 1000 | 最大缓存条目 (仅 memory) |
| redis | RedisConfig | - | Redis 连接配置 |
| penetrationProtection | PenetrationProtectionConfig | - | 穿透保护配置 |
| enableStats | boolean | false | 启用统计 |

### PenetrationProtectionConfig

| 选项 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| enableBloomFilter | boolean | false | 启用布隆过滤器 |
| expectedItems | number | 10000 | 预期元素数量 |
| falsePositiveRate | number | 0.01 | 误判率 |
| nullCacheTTL | number | 60 | 空值缓存 TTL |
| cacheNull | boolean | false | 缓存空值 |

### CacheOptions

| 选项 | 类型 | 说明 |
|------|------|------|
| ttl | number | 自定义 TTL (秒) |
| tags | string[] | 缓存标签 |
| cacheNull | boolean | 是否缓存空值 |
| keyPrefix | string | 自定义键前缀 |

---

## 🔧 最佳实践

### 1. 选择合适的 TTL

```typescript
// 频繁变化的数据 - 短 TTL
cache.set('stock:price:AAPL', price, { ttl: 10 });

// 用户数据 - 中等 TTL
cache.set('user:123', user, { ttl: 600 });

// 配置数据 - 长 TTL
cache.set('app:config', config, { ttl: 3600 });
```

### 2. 使用标签进行批量失效

```typescript
// 设置时添加标签
cache.set('product:1', product, { tags: ['products', 'featured'] });
cache.set('product:2', product, { tags: ['products', 'sale'] });

// 批量失效
cache.deleteByTag('products'); // 所有产品
cache.deleteByTag('featured'); // 仅精选产品
```

### 3. 监控命中率

```typescript
setInterval(() => {
  const stats = cache.getStats();
  console.log(`Hit Rate: ${(stats.hitRate * 100).toFixed(2)}%`);
  
  if (stats.hitRate < 0.5) {
    console.warn('缓存命中率过低，检查缓存策略');
  }
}, 60000);
```

### 4. 防止缓存雪崩

```typescript
// 给 TTL 添加随机偏移
const baseTTL = 300;
const randomTTL = baseTTL + Math.floor(Math.random() * 60);
cache.set('key', value, { ttl: randomTTL });
```

---

## 📊 性能对比

| 操作 | Memory Cache | Redis Cache |
|------|--------------|-------------|
| Set | ~0.001ms | ~1-5ms |
| Get | ~0.001ms | ~1-5ms |
| Delete | ~0.001ms | ~1-3ms |
| 最大容量 | 受内存限制 | 受 Redis 配置限制 |
| 持久化 | ❌ | ✅ |
| 分布式 | ❌ | ✅ |

---

## ⚠️ 注意事项

1. **内存缓存**在进程重启后会丢失
2. **Redis 缓存**需要安装 `ioredis`: `npm install ioredis`
3. **布隆过滤器**有误判率，但不会漏判
4. **空值缓存**会占用内存，谨慎使用
5. **大对象**缓存前考虑序列化开销

---

_Axon Cache Skill v1.0.0_
