# Cache Manager Pro Skill

## 概述

**Cache Manager Pro** 是一个功能完整的缓存管理工具，为 AxonClaw 项目提供高性能的缓存解决方案。

## 核心功能

### 1. 缓存策略 🎯
- **TTL** - 基于时间过期
- **LRU** - 最近最少使用
- **LFU** - 最不经常使用
- **FIFO** - 先进先出

### 2. 缓存失效 🔄
- 单条删除
- 批量失效 (支持通配符)
- 自动过期清理
- 手动清空

### 3. 缓存统计 📊
- 命中率分析
- 内存占用监控
- 过期/驱逐统计
- 性能指标追踪

## 文件清单

```
src/skills/
├── cache-manager-pro-skill.ts      # 核心实现 (726 行)
├── cache-manager-pro-examples.md   # 使用示例 (495 行)
├── cache-manager-pro.test.ts       # 单元测试
└── CACHE-MANAGER-README.md         # 本文件
```

## 快速开始

```typescript
import { CacheManager, CacheStrategy } from './cache-manager-pro-skill';

// 创建缓存实例
const cache = new CacheManager({
  maxEntries: 1000,
  defaultTTL: 3600,
  strategy: CacheStrategy.LRU,
});

// 设置缓存
cache.set('user:1001', { name: 'Alice' });

// 获取缓存
const user = cache.get('user:1001');

// 查看统计
const stats = cache.getStats();
console.log(`命中率：${stats.hitRate * 100}%`);
```

## 使用 Skill 命令

```bash
# 设置缓存
cache.set user:1001 '{"name":"Alice"}' --ttl 3600

# 获取缓存
cache.get user:1001

# 批量失效
cache.invalidate 'user:*'

# 查看统计
cache.stats

# 清空缓存
cache.clear
```

## 应用场景

### ✅ API 响应缓存
```typescript
const apiCache = new CacheManager({
  strategy: CacheStrategy.LRU,
  defaultTTL: 300, // 5 分钟
});
```

### ✅ 数据库查询缓存
```typescript
const queryCache = new CacheManager({
  strategy: CacheStrategy.LFU,
  defaultTTL: 600, // 10 分钟
});
```

### ✅ 用户会话缓存
```typescript
const sessionCache = new CacheManager({
  strategy: CacheStrategy.TTL,
  defaultTTL: 1800, // 30 分钟
});
```

### ✅ 配置缓存
```typescript
const configCache = new CacheManager({
  strategy: CacheStrategy.LRU,
  defaultTTL: 0, // 永不过期
});
```

## 性能指标

| 指标 | 目标值 | 说明 |
|------|--------|------|
| 命中率 | > 80% | 缓存效率 |
| 访问时间 | < 1ms | 单次访问延迟 |
| 内存占用 | < 100MB | 根据配置调整 |
| 驱逐率 | < 10% | 缓存稳定性 |

## 最佳实践

1. **选择合适的策略**
   - 通用场景 → LRU
   - 频率差异大 → LFU
   - 时间敏感 → TTL

2. **合理设置参数**
   ```typescript
   // 根据内存计算
   maxEntries = 可用内存 / 平均条目大小
   ```

3. **监控统计信息**
   ```typescript
   const stats = cache.getStats();
   if (stats.hitRate < 0.5) {
     // 调整策略或 TTL
   }
   ```

4. **定期持久化**
   ```typescript
   setInterval(() => {
     cache.export('./backup/cache.json');
   }, 3600000);
   ```

## 事件系统

```typescript
// 监听各种缓存事件
cache.on('hit', (event) => console.log('命中:', event.key));
cache.on('miss', (event) => console.log('未命中:', event.key));
cache.on('set', (event) => console.log('设置:', event.key));
cache.on('delete', (event) => console.log('删除:', event.key));
cache.on('evict', (event) => console.log('驱逐:', event.key));
cache.on('expire', (event) => console.log('过期:', event.key));
```

## 测试

运行单元测试：
```bash
npm test -- cache-manager-pro
```

## 参考资料

- [使用示例](./cache-manager-pro-examples.md) - 详细使用指南
- [源代码](./cache-manager-pro-skill.ts) - 完整实现
- [测试文件](./cache-manager-pro.test.ts) - 单元测试

## 版本历史

- **v1.0.0** (2026-03-13) - 初始版本
  - ✅ 基础缓存操作
  - ✅ 4 种驱逐策略
  - ✅ 批量操作
  - ✅ 事件系统
  - ✅ 持久化支持
  - ✅ 统计分析

## 作者

**ACE** - AxonClaw Engineering

## 许可证

MIT
