# Cache Manager Pro - 使用示例

## 快速开始

### 1. 基础缓存操作

```typescript
import { CacheManager, CacheStrategy } from './cache-manager-pro-skill';

// 创建缓存管理器
const cache = new CacheManager({
  maxEntries: 1000,
  defaultTTL: 3600, // 1 小时
  strategy: CacheStrategy.LRU,
  enableStats: true,
});

// 设置缓存
cache.set('user:1001', { name: 'Alice', email: 'alice@example.com' });

// 设置带 TTL 的缓存 (5 分钟)
cache.set('session:abc123', { userId: 1001 }, { ttl: 300 });

// 设置带元数据的缓存
cache.set('product:2001', { name: 'Laptop', price: 999 }, {
  ttl: 7200,
  metadata: { category: 'electronics', tags: ['computer', 'tech'] },
});

// 获取缓存
const user = cache.get('user:1001');
console.log(user); // { name: 'Alice', email: 'alice@example.com' }

// 检查键是否存在
if (cache.has('user:1001')) {
  console.log('用户缓存存在');
}

// 删除缓存
cache.delete('user:1001');
```

### 2. 批量操作

```typescript
// 批量设置
cache.setBatch([
  { key: 'user:1002', value: { name: 'Bob' }, ttl: 3600 },
  { key: 'user:1003', value: { name: 'Charlie' }, ttl: 3600 },
  { key: 'user:1004', value: { name: 'Diana' }, ttl: 3600 },
]);

// 批量获取
const keys = ['user:1002', 'user:1003', 'user:1004'];
const results = cache.getBatch(keys);

results.forEach((value, key) => {
  console.log(`${key}:`, value);
});
```

### 3. 缓存失效

```typescript
// 删除单个键
cache.delete('user:1001');

// 批量失效 (支持通配符)
const deletedCount = cache.invalidate('user:*');
console.log(`删除了 ${deletedCount} 个用户缓存`);

// 失效所有会话缓存
cache.invalidate('session:*');

// 失效特定模式的缓存
cache.invalidate('api:responses:users:*');

// 清空所有缓存
cache.clear();
```

### 4. 缓存统计

```typescript
// 获取统计信息
const stats = cache.getStats();

console.log('缓存统计:', stats);
// {
//   hits: 150,
//   misses: 20,
//   hitRate: 0.88,      // 88% 命中率
//   size: 85,           // 当前条目数
//   maxSize: 1000,      // 最大条目数
//   expiredCount: 5,    // 过期条目数
//   evictedCount: 10,   // 驱逐条目数
//   avgAccessTime: 0.5, // 平均访问时间 (ms)
//   memoryUsage: 45678  // 内存占用 (bytes)
// }

// 计算命中率
console.log(`命中率：${(stats.hitRate * 100).toFixed(2)}%`);

// 监控内存使用
if (stats.memoryUsage > 10 * 1024 * 1024) { // 10MB
  console.warn('缓存内存占用过高!');
}
```

### 5. 缓存策略

```typescript
import { CacheStrategy } from './cache-manager-pro-skill';

// LRU (最近最少使用) - 默认策略
const lruCache = new CacheManager({
  strategy: CacheStrategy.LRU,
  maxEntries: 500,
});

// LFU (最不经常使用)
const lfuCache = new CacheManager({
  strategy: CacheStrategy.LFU,
  maxEntries: 500,
});

// FIFO (先进先出)
const fifoCache = new CacheManager({
  strategy: CacheStrategy.FIFO,
  maxEntries: 500,
});

// TTL (时间过期)
const ttlCache = new CacheManager({
  strategy: CacheStrategy.TTL,
  defaultTTL: 1800, // 30 分钟
});
```

### 6. 事件监听

```typescript
// 监听缓存命中
cache.on('hit', (event) => {
  console.log(`[缓存命中] ${event.key}`, event.data);
});

// 监听缓存未命中
cache.on('miss', (event) => {
  console.log(`[缓存未命中] ${event.key}`);
});

// 监听缓存设置
cache.on('set', (event) => {
  console.log(`[缓存设置] ${event.key}`);
});

// 监听缓存过期
cache.on('expire', (event) => {
  console.log(`[缓存过期] ${event.key}`);
});

// 监听缓存驱逐
cache.on('evict', (event) => {
  console.log(`[缓存驱逐] ${event.key}`);
});

// 移除监听器
const hitListener = (event: any) => console.log(event);
cache.on('hit', hitListener);
cache.off('hit', hitListener);
```

### 7. 持久化

```typescript
// 创建带持久化的缓存
const persistentCache = new CacheManager({
  persistPath: './data/cache.json',
  maxEntries: 1000,
  defaultTTL: 3600,
});

// 导出缓存到文件
cache.export('./backup/cache-backup.json');

// 从文件导入缓存
const importedCount = cache.import('./backup/cache-backup.json');
console.log(`导入了 ${importedCount} 个缓存条目`);

// 销毁时自动持久化
cache.destroy();
```

### 8. 实际应用场景

#### 场景 1: API 响应缓存

```typescript
class APIClient {
  private cache = new CacheManager({
    strategy: CacheStrategy.LRU,
    maxEntries: 500,
    defaultTTL: 300, // 5 分钟
  });

  async fetch<T>(url: string): Promise<T> {
    const cacheKey = `api:${url}`;
    
    // 尝试从缓存获取
    const cached = this.cache.get<T>(cacheKey);
    if (cached) {
      console.log(`[API Cache Hit] ${url}`);
      return cached;
    }

    // 发起实际请求
    console.log(`[API Cache Miss] ${url}`);
    const response = await fetch(url);
    const data = await response.json();

    // 缓存结果
    this.cache.set(cacheKey, data);
    
    return data;
  }

  // 清除特定 API 的缓存
  clearAPICache(apiPrefix: string) {
    return this.cache.invalidate(`api:${apiPrefix}:*`);
  }
}

// 使用
const api = new APIClient();
const users = await api.fetch('/api/users');
```

#### 场景 2: 数据库查询缓存

```typescript
class DatabaseService {
  private queryCache = new CacheManager({
    strategy: CacheStrategy.LFU,
    maxEntries: 1000,
    defaultTTL: 600, // 10 分钟
  });

  async query<T>(sql: string, params?: unknown[]): Promise<T[]> {
    const cacheKey = `db:${sql}:${JSON.stringify(params)}`;
    
    const cached = this.queryCache.get<T[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const result = await this.executeQuery(sql, params);
    this.queryCache.set(cacheKey, result, {
      metadata: { sql, params, timestamp: Date.now() },
    });

    return result;
  }

  // 表更新时失效相关缓存
  invalidateTableCache(tableName: string) {
    return this.queryCache.invalidate(`db:*${tableName}*`);
  }
}
```

#### 场景 3: 用户会话缓存

```typescript
class SessionManager {
  private sessionCache = new CacheManager({
    strategy: CacheStrategy.TTL,
    defaultTTL: 1800, // 30 分钟
    maxEntries: 5000,
  });

  createSession(userId: string): string {
    const sessionId = this.generateSessionId();
    this.sessionCache.set(`session:${sessionId}`, {
      userId,
      createdAt: Date.now(),
      lastActivity: Date.now(),
    });
    return sessionId;
  }

  getSession(sessionId: string) {
    return this.sessionCache.get(`session:${sessionId}`);
  }

  updateSessionActivity(sessionId: string) {
    const session = this.getSession(sessionId);
    if (session) {
      session.lastActivity = Date.now();
      this.sessionCache.set(`session:${sessionId}`, session);
    }
  }

  deleteSession(sessionId: string) {
    return this.sessionCache.delete(`session:${sessionId}`);
  }

  deleteUserSessions(userId: string) {
    return this.sessionCache.invalidate(`session:*:${userId}`);
  }

  private generateSessionId(): string {
    return Math.random().toString(36).substring(2, 15);
  }
}
```

#### 场景 4: 配置缓存

```typescript
class ConfigService {
  private configCache = new CacheManager({
    strategy: CacheStrategy.LRU,
    maxEntries: 100,
    defaultTTL: 0, // 永不过期，手动更新
  });

  async getConfig<T>(key: string, loader: () => Promise<T>): Promise<T> {
    const cached = this.configCache.get<T>(`config:${key}`);
    if (cached) {
      return cached;
    }

    const value = await loader();
    this.configCache.set(`config:${key}`, value);
    return value;
  }

  invalidateConfig(key: string) {
    return this.configCache.delete(`config:${key}`);
  }

  invalidateAllConfigs() {
    return this.configCache.invalidate('config:*');
  }
}
```

### 9. 性能优化建议

```typescript
// 1. 根据访问模式选择策略
// - 读多写少：LFU
// - 时间敏感：TTL
// - 通用场景：LRU (推荐)

// 2. 合理设置 maxEntries
// 根据内存限制：maxEntries = 可用内存 / 平均条目大小
// 例如：100MB / 10KB = 10000 条目

// 3. 监控命中率
const checkCacheHealth = () => {
  const stats = cache.getStats();
  if (stats.hitRate < 0.5) {
    console.warn('缓存命中率过低，考虑调整策略或 TTL');
  }
  if (stats.evictedCount > stats.size * 0.5) {
    console.warn('驱逐过多，考虑增加 maxEntries');
  }
};

// 4. 使用批量操作
// 避免循环中单个设置，使用 setBatch

// 5. 定期导出备份
setInterval(() => {
  cache.export('./backup/cache-backup.json');
}, 3600000); // 每小时
```

### 10. 调试技巧

```typescript
// 查看所有缓存键
console.log('所有缓存键:', cache.keys());

// 查看缓存详情
cache.entries().forEach(entry => {
  console.log(`键：${entry.key}`);
  console.log(`  创建时间：${new Date(entry.createdAt).toISOString()}`);
  console.log(`  最后访问：${new Date(entry.lastAccessedAt).toISOString()}`);
  console.log(`  访问次数：${entry.accessCount}`);
  console.log(`  过期时间：${entry.expiresAt > 0 ? new Date(entry.expiresAt).toISOString() : '永不过期'}`);
});

// 查找大缓存条目
const largeEntries = cache.entries().filter(entry => {
  const size = Buffer.byteLength(JSON.stringify(entry));
  return size > 1024; // 大于 1KB
});
console.log('大缓存条目:', largeEntries);

// 查找即将过期的条目
const soonToExpire = cache.entries().filter(entry => {
  const now = Date.now();
  return entry.expiresAt > 0 && entry.expiresAt < now + 300000; // 5 分钟内
});
console.log('即将过期:', soonToExpire.length);
```

---

## 常见问题

### Q: 如何选择缓存策略？
**A:** 
- **LRU**: 通用场景，假设最近使用的数据更可能再次被使用
- **LFU**: 访问频率差异大的场景，保留最常用的数据
- **TTL**: 时间敏感数据，如 API 响应、临时会话
- **FIFO**: 简单场景，按顺序处理数据

### Q: 缓存命中率低怎么办？
**A:**
1. 增加 `maxEntries`
2. 调整 `defaultTTL`
3. 更换缓存策略 (尝试 LRU → LFU)
4. 检查缓存键设计是否合理

### Q: 内存占用过高？
**A:**
1. 减小 `maxEntries`
2. 缩短 `defaultTTL`
3. 定期调用 `cache.invalidate()` 清理旧数据
4. 使用 `cache.stats().memoryUsage` 监控

### Q: 如何保证缓存持久化？
**A:**
1. 设置 `persistPath` 参数
2. 定期调用 `cache.export()`
3. 应用关闭前调用 `cache.destroy()`
4. 启动时调用 `cache.import()` 恢复

---

## API 参考

### CacheManager 类

| 方法 | 描述 | 参数 | 返回值 |
|------|------|------|--------|
| `set()` | 设置缓存 | key, value, options? | void |
| `get()` | 获取缓存 | key | T \| undefined |
| `delete()` | 删除缓存 | key | boolean |
| `has()` | 检查键存在 | key | boolean |
| `clear()` | 清空缓存 | - | void |
| `keys()` | 获取所有键 | - | string[] |
| `entries()` | 获取所有条目 | - | CacheEntry[] |
| `invalidate()` | 批量失效 | pattern | number |
| `setBatch()` | 批量设置 | entries | number |
| `getBatch()` | 批量获取 | keys | Map |
| `getStats()` | 获取统计 | - | CacheStats |
| `export()` | 导出文件 | filePath | boolean |
| `import()` | 导入文件 | filePath | number |
| `on()` | 监听事件 | event, callback | void |
| `off()` | 移除监听 | event, callback | void |
| `destroy()` | 销毁实例 | - | void |

### 配置选项

```typescript
interface CacheConfig {
  maxEntries: number;      // 最大条目数 (默认：1000)
  defaultTTL: number;      // 默认 TTL 秒 (默认：3600)
  strategy: CacheStrategy; // 缓存策略 (默认：LRU)
  enableStats: boolean;    // 启用统计 (默认：true)
  persistPath?: string;    // 持久化路径 (可选)
}
```

### 缓存策略枚举

```typescript
enum CacheStrategy {
  TTL = 'ttl',   // 时间过期
  LRU = 'lru',   // 最近最少使用
  LFU = 'lfu',   // 最不经常使用
  FIFO = 'fifo', // 先进先出
}
```

---

**版本**: 1.0.0  
**作者**: ACE  
**最后更新**: 2026-03-13
