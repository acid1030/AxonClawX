/**
 * 缓存管理技能 - 使用示例
 * 
 * 演示 CacheManager 的各种使用场景
 */

import { CacheManager, defaultCache } from './cache-manager-skill';

// ============================================
// 示例 1: 基础缓存操作
// ============================================

function basicUsage() {
  console.log('=== 示例 1: 基础缓存操作 ===\n');
  
  const cache = new CacheManager();
  
  // 设置缓存
  cache.set('user:1', { id: 1, name: 'Axon', email: 'axon@example.com' });
  cache.set('user:2', { id: 2, name: 'KAEL', email: 'kael@example.com' });
  
  // 获取缓存
  const user1 = cache.get('user:1');
  console.log('用户 1:', user1);
  // 输出：{ id: 1, name: 'Axon', email: 'axon@example.com' }
  
  // 检查是否存在
  console.log('用户 2 存在吗？', cache.has('user:2'));
  // 输出：true
  
  // 获取不存在的键
  const user3 = cache.get('user:3');
  console.log('用户 3:', user3);
  // 输出：undefined
  
  console.log('');
}

// ============================================
// 示例 2: 自定义 TTL (生存时间)
// ============================================

function customTTL() {
  console.log('=== 示例 2: 自定义 TTL ===\n');
  
  const cache = new CacheManager({ defaultTTL: 60000 }); // 默认 1 分钟
  
  // 使用默认 TTL
  cache.set('config:app', { version: '1.0.0' });
  
  // 自定义 TTL (5 秒)
  cache.set('temp:data', { value: '临时数据' }, 5000);
  
  console.log('临时数据:', cache.get('temp:data'));
  // 输出：{ value: '临时数据' }
  
  // 等待 6 秒后再次获取 (已过期)
  setTimeout(() => {
    const expired = cache.get('temp:data');
    console.log('6 秒后的临时数据:', expired);
    // 输出：undefined (已过期)
  }, 6000);
  
  console.log('');
}

// ============================================
// 示例 3: 批量操作
// ============================================

function batchOperations() {
  console.log('=== 示例 3: 批量操作 ===\n');
  
  const cache = new CacheManager();
  
  // 批量设置
  cache.setMany([
    ['product:1', { id: 1, name: 'iPhone 15', price: 7999 }],
    ['product:2', { id: 2, name: 'MacBook Pro', price: 14999 }],
    ['product:3', { id: 3, name: 'iPad Pro', price: 6999 }],
  ]);
  
  // 批量获取
  const products = cache.getMany(['product:1', 'product:2', 'product:3']);
  console.log('所有产品:', products);
  // 输出：{ 'product:1': {...}, 'product:2': {...}, 'product:3': {...} }
  
  // 批量删除
  const deleted = cache.deleteMany(['product:1', 'product:2']);
  console.log('删除了', deleted, '个产品');
  // 输出：删除了 2 个产品
  
  console.log('');
}

// ============================================
// 示例 4: 模式匹配删除
// ============================================

function patternDeletion() {
  console.log('=== 示例 4: 模式匹配删除 ===\n');
  
  const cache = new CacheManager();
  
  // 设置多个缓存
  cache.set('user:1:profile', { name: 'User 1' });
  cache.set('user:1:settings', { theme: 'dark' });
  cache.set('user:2:profile', { name: 'User 2' });
  cache.set('user:2:settings', { theme: 'light' });
  cache.set('config:app', { version: '1.0' });
  
  console.log('删除前键列表:', cache.keys());
  // 输出：['user:1:profile', 'user:1:settings', 'user:2:profile', 'user:2:settings', 'config:app']
  
  // 删除所有 user:1 相关的缓存
  const deleted = cache.deleteByPattern('user:1:*');
  console.log('删除了', deleted, '个 user:1 的缓存');
  // 输出：删除了 2 个 user:1 的缓存
  
  console.log('删除后键列表:', cache.keys());
  // 输出：['user:2:profile', 'user:2:settings', 'config:app']
  
  console.log('');
}

// ============================================
// 示例 5: 缓存统计
// ============================================

function cacheStatistics() {
  console.log('=== 示例 5: 缓存统计 ===\n');
  
  const cache = new CacheManager({ maxEntries: 100 });
  
  // 模拟缓存访问
  cache.set('data:1', { value: 1 });
  cache.set('data:2', { value: 2 });
  cache.set('data:3', { value: 3 });
  
  // 多次访问 data:1 和 data:2
  cache.get('data:1');
  cache.get('data:1');
  cache.get('data:1');
  cache.get('data:2');
  cache.get('data:2');
  
  // 访问不存在的键 (miss)
  cache.get('data:999');
  cache.get('data:888');
  
  // 获取统计
  const stats = cache.getStats();
  console.log('缓存统计:');
  console.log('  - 总条目数:', stats.totalKeys);
  console.log('  - 总命中数:', stats.totalHits);
  console.log('  - 总未命中数:', stats.totalMisses);
  console.log('  - 命中率:', stats.hitRate.toFixed(2) + '%');
  console.log('  - 内存使用:', (stats.memoryUsage / 1024).toFixed(2) + ' KB');
  console.log('  - 最旧条目:', stats.oldestEntry ? new Date(stats.oldestEntry).toISOString() : '无');
  console.log('  - 最新条目:', stats.newestEntry ? new Date(stats.newestEntry).toISOString() : '无');
  
  console.log('');
}

// ============================================
// 示例 6: 缓存条目详情
// ============================================

function entryDetails() {
  console.log('=== 示例 6: 缓存条目详情 ===\n');
  
  const cache = new CacheManager();
  cache.set('session:abc123', { userId: 123, token: 'xyz' }, 60000);
  
  // 访问几次
  cache.get('session:abc123');
  cache.get('session:abc123');
  
  // 获取条目详情
  const entry = cache.getEntry('session:abc123');
  if (entry) {
    console.log('会话详情:');
    console.log('  - 键:', entry.key);
    console.log('  - 值:', entry.value);
    console.log('  - 创建时间:', new Date(entry.timestamp).toISOString());
    console.log('  - 年龄:', entry.age + 'ms');
    console.log('  - 访问次数:', entry.hits);
    console.log('  - 过期时间:', entry.expiresAt ? new Date(entry.expiresAt).toISOString() : '永不过期');
    console.log('  - 剩余时间:', entry.expiresAt ? (entry.expiresAt - Date.now()) + 'ms' : '永久');
  }
  
  console.log('');
}

// ============================================
// 示例 7: TTL 刷新
// ============================================

function ttlRefresh() {
  console.log('=== 示例 7: TTL 刷新 ===\n');
  
  const cache = new CacheManager();
  cache.set('temp:key', { data: '临时数据' }, 5000); // 5 秒过期
  
  console.log('设置缓存，5 秒后过期');
  
  // 3 秒后刷新 TTL
  setTimeout(() => {
    const refreshed = cache.refreshTTL('temp:key', 10000); // 刷新为 10 秒
    console.log('刷新 TTL:', refreshed ? '成功' : '失败');
    
    const entry = cache.getEntry('temp:key');
    if (entry) {
      console.log('新的过期时间:', entry.expiresAt ? new Date(entry.expiresAt).toISOString() : '永不过期');
    }
  }, 3000);
  
  console.log('');
}

// ============================================
// 示例 8: 垃圾回收
// ============================================

function garbageCollection() {
  console.log('=== 示例 8: 垃圾回收 ===\n');
  
  const cache = new CacheManager();
  
  // 设置一些短期缓存
  cache.set('temp:1', { data: 1 }, 1000);
  cache.set('temp:2', { data: 2 }, 1000);
  cache.set('temp:3', { data: 3 }, 1000);
  cache.set('permanent:1', { data: 1 }); // 永不过期
  
  console.log('GC 前条目数:', cache.keys().length);
  // 输出：4
  
  // 等待 2 秒
  setTimeout(() => {
    const removed = cache.gc();
    console.log('清理了', removed, '个过期条目');
    // 输出：清理了 3 个过期条目
    
    console.log('GC 后条目数:', cache.keys().length);
    // 输出：1
    console.log('剩余键:', cache.keys());
    // 输出：['permanent:1']
  }, 2000);
  
  console.log('');
}

// ============================================
// 示例 9: 使用默认实例
// ============================================

function defaultInstanceUsage() {
  console.log('=== 示例 9: 使用默认实例 ===\n');
  
  // 在不同模块中使用同一个默认缓存实例
  defaultCache.set('global:counter', 0);
  
  // 其他地方
  const counter: number = (defaultCache.get('global:counter') as number) || 0;
  defaultCache.set('global:counter', counter + 1);
  
  console.log('全局计数器:', defaultCache.get('global:counter'));
  // 输出：1
  
  console.log('');
}

// ============================================
// 示例 10: 实际应用场景 - API 响应缓存
// ============================================

async function apiResponseCaching() {
  console.log('=== 示例 10: API 响应缓存 ===\n');
  
  const cache = new CacheManager({ defaultTTL: 60000 }); // 1 分钟缓存
  
  // 模拟 API 请求函数
  async function fetchUserData(userId: number) {
    const cacheKey = `api:user:${userId}`;
    
    // 尝试从缓存获取
    const cached = cache.get(cacheKey);
    if (cached) {
      console.log(`[缓存命中] 用户 ${userId}`);
      return cached;
    }
    
    console.log(`[缓存未命中] 用户 ${userId}，正在请求 API...`);
    
    // 模拟 API 请求
    const userData = {
      id: userId,
      name: `User ${userId}`,
      email: `user${userId}@example.com`,
      fetchedAt: new Date().toISOString(),
    };
    
    // 缓存结果
    cache.set(cacheKey, userData);
    
    return userData;
  }
  
  // 第一次请求 (未命中)
  const user1 = await fetchUserData(1);
  console.log('用户数据:', user1);
  
  // 第二次请求 (命中缓存)
  const user1Again = await fetchUserData(1);
  console.log('用户数据 (缓存):', user1Again);
  
  // 不同用户 (未命中)
  const user2 = await fetchUserData(2);
  console.log('用户数据:', user2);
  
  console.log('');
}

// ============================================
// 运行所有示例
// ============================================

function runAllExamples() {
  console.log('========================================');
  console.log('  缓存管理技能 - 使用示例大全');
  console.log('========================================\n');
  
  basicUsage();
  customTTL();
  batchOperations();
  patternDeletion();
  cacheStatistics();
  entryDetails();
  ttlRefresh();
  garbageCollection();
  defaultInstanceUsage();
  
  // 异步示例
  apiResponseCaching().then(() => {
    console.log('========================================');
    console.log('  所有示例运行完成!');
    console.log('========================================');
  });
}

// 如果直接运行此文件
if (require.main === module) {
  runAllExamples();
}

// 导出示例函数供测试使用
export {
  basicUsage,
  customTTL,
  batchOperations,
  patternDeletion,
  cacheStatistics,
  entryDetails,
  ttlRefresh,
  garbageCollection,
  defaultInstanceUsage,
  apiResponseCaching,
  runAllExamples,
};
