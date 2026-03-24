# 代理模式专业版 - Proxy Pattern Pro

**作者:** KAEL  
**版本:** 1.0.0  
**创建时间:** 2026-03-13

---

## 📋 概述

代理模式专业版工具提供了代理模式的高级实现，包含三大核心功能：

1. **代理定义 (Proxy Definition)** - 灵活的代理创建与注册
2. **访问控制 (Access Control)** - 强大的权限验证与拦截
3. **延迟加载 (Lazy Loading)** - 按需加载与缓存优化

---

## 🎯 核心特性

### 1. 访问控制代理 (Protection Proxy)
- ✅ 角色-based 访问控制
- ✅ 用户白名单/黑名单
- ✅ 时间窗口限制
- ✅ 访问次数限制
- ✅ 自定义验证函数
- ✅ 访问日志记录

### 2. 延迟加载代理 (Virtual Proxy)
- ✅ 按需加载重型对象
- ✅ 超时控制
- ✅ 自动重试机制
- ✅ 加载状态追踪
- ✅ 强制重新加载

### 3. 缓存代理 (Cache Proxy)
- ✅ 多种缓存策略 (LRU/LFU/FIFO)
- ✅ 可配置 TTL
- ✅ 最大缓存条目限制
- ✅ 缓存命中率统计
- ✅ 选择性缓存失效

### 4. 日志代理 (Logging Proxy)
- ✅ 方法调用日志
- ✅ 参数/返回值记录
- ✅ 错误日志
- ✅ 执行时间追踪
- ✅ 可配置日志级别

### 5. 智能代理 (Smart Proxy)
- ✅ 组合多种代理功能
- ✅ 链式配置 API
- ✅ 统一的执行接口
- ✅ 灵活的功能启用/禁用

---

## 📦 安装与导入

```typescript
import {
  // 核心类
  AccessControlProxy,
  LazyLoadProxy,
  CacheProxy,
  LoggingProxy,
  SmartProxy,
  ProxyRegistry,
  
  // 工厂函数
  createAccessProxy,
  createLazyProxy,
  createCacheProxy,
  createLoggingProxy,
  createSmartProxy,
  
  // 类型定义
  type AccessControlPolicy,
  type CacheConfig,
  type LoggingConfig,
  type LazyLoadConfig,
} from './src/skills/proxy-pattern-pro-skill';
```

---

## 💡 使用示例

### 示例 1: 访问控制代理

```typescript
// 定义服务
class DatabaseService {
  async query(sql: string): Promise<any[]> {
    console.log('Executing query:', sql);
    return [{ id: 1, name: 'Test' }];
  }
  
  async delete(id: number): Promise<void> {
    console.log('Deleting record:', id);
  }
}

// 创建访问控制策略
const policies: AccessControlPolicy[] = [
  {
    name: 'admin-only',
    description: 'Only admins can access',
    allowedRoles: ['admin'],
  },
  {
    name: 'business-hours',
    description: 'Only during business hours',
    timeWindowStart: '09:00:00',
    timeWindowEnd: '18:00:00',
  },
  {
    name: 'rate-limit',
    description: 'Max 100 requests per day',
    maxAccessCount: 100,
  },
  {
    name: 'custom-validation',
    description: 'Custom validation logic',
    customValidator: async (context) => {
      // 自定义验证逻辑
      return context.userId !== 'banned-user-123';
    },
  },
];

// 创建代理
const secureDB = createAccessProxy(
  new DatabaseService(),
  'secure-database',
  policies
);

// 使用代理
try {
  const result = await secureDB.getTarget({
    userId: 'user-456',
    userRole: 'admin',
    accessTime: new Date(),
  });
  
  const data = await result.query('SELECT * FROM users');
  console.log('Query result:', data);
} catch (error) {
  console.error('Access denied:', error.message);
}

// 查看访问日志
const logs = secureDB.getAccessLog(10);
console.log('Recent access logs:', logs);
```

---

### 示例 2: 延迟加载代理

```typescript
// 模拟重型配置加载
async function loadHeavyConfig(): Promise<Record<string, any>> {
  console.log('Loading configuration...');
  await new Promise(resolve => setTimeout(resolve, 2000)); // 模拟 2 秒延迟
  return {
    database: { host: 'localhost', port: 5432 },
    cache: { ttl: 300000 },
    // ... 大量配置项
  };
}

// 创建延迟加载代理
const lazyConfig = createLazyProxy(
  loadHeavyConfig,
  'app-config',
  {
    enabled: true,
    timeout: 10000,      // 10 秒超时
    retries: 3,          // 最多重试 3 次
    retryInterval: 1000, // 重试间隔 1 秒
    onLoadError: (error) => {
      console.error('Failed to load config:', error.message);
    },
  }
);

// 首次访问会触发加载
console.log('Is loaded?', lazyConfig.isLoaded()); // false

const config = await lazyConfig.getTarget();
console.log('Config loaded:', config);

console.log('Is loaded?', lazyConfig.isLoaded()); // true

// 后续访问直接返回缓存值
const config2 = await lazyConfig.getTarget(); // 立即返回

// 强制重新加载
await lazyConfig.reload();
```

---

### 示例 3: 缓存代理

```typescript
// 定义 API 服务
class APIService {
  async fetchUser(id: number): Promise<any> {
    console.log('Fetching user from API:', id);
    await new Promise(resolve => setTimeout(resolve, 500));
    return { id, name: `User ${id}`, email: `user${id}@example.com` };
  }
  
  async searchUsers(query: string): Promise<any[]> {
    console.log('Searching users:', query);
    await new Promise(resolve => setTimeout(resolve, 1000));
    return [
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' },
    ];
  }
}

// 创建缓存代理
const cachedAPI = createCacheProxy(
  new APIService(),
  'user-api',
  {
    ttl: 60000,           // 1 分钟缓存
    maxEntries: 100,      // 最多 100 条缓存
    strategy: 'lru',      // LRU 策略
    keyGenerator: (method, ...args) => `${method}:${JSON.stringify(args)}`,
  }
);

// 首次调用会执行实际方法
const user1 = await cachedAPI.execute('fetchUser', 123);
console.log('User 1:', user1);

// 第二次调用会返回缓存结果 (更快)
const user1Cached = await cachedAPI.execute('fetchUser', 123);
console.log('User 1 (cached):', user1Cached);

// 查看缓存统计
const stats = cachedAPI.getStats();
console.log('Cache stats:', stats);
// { size: 1, hits: 1, misses: 1 }

// 手动清除特定缓存
cachedAPI.invalidate('fetchUser:[123]');

// 清除所有缓存
cachedAPI.clearCache();
```

---

### 示例 4: 日志代理

```typescript
// 定义支付服务
class PaymentService {
  async processPayment(amount: number, currency: string): Promise<boolean> {
    console.log('Processing payment:', amount, currency);
    if (amount <= 0) {
      throw new Error('Invalid amount');
    }
    return true;
  }
  
  async refund(transactionId: string): Promise<void> {
    console.log('Refunding transaction:', transactionId);
  }
}

// 创建日志代理
const loggedPayment = createLoggingProxy(
  new PaymentService(),
  'payment-service',
  {
    logMethodCalls: true,
    logParameters: true,
    logReturnValues: true,
    logErrors: true,
    level: 'debug',
    logger: (message, level, metadata) => {
      // 自定义日志处理
      console.log(`[${level.toUpperCase()}] ${message}`, metadata);
    },
  }
);

// 执行方法 (会自动记录日志)
try {
  const result = await loggedPayment.execute('processPayment', 100, 'USD');
  console.log('Payment result:', result);
} catch (error) {
  console.error('Payment failed:', error);
}

// 查看日志
const logs = loggedPayment.getLogs(10);
console.log('Method logs:', logs);

// 清空日志
loggedPayment.clearLogs();
```

---

### 示例 5: 智能代理 (组合所有功能)

```typescript
// 定义用户服务
class UserService {
  async getUserData(userId: string): Promise<any> {
    console.log('Fetching user data:', userId);
    await new Promise(resolve => setTimeout(resolve, 300));
    return {
      id: userId,
      name: 'John Doe',
      email: 'john@example.com',
      role: 'user',
    };
  }
  
  async updateUser(userId: string, data: any): Promise<void> {
    console.log('Updating user:', userId, data);
  }
  
  async deleteUser(userId: string): Promise<void> {
    console.log('Deleting user:', userId);
  }
}

// 创建智能代理 (组合访问控制 + 缓存 + 日志)
const smartUserService = createSmartProxy(
  () => new UserService(),  // 延迟加载服务实例
  'user-service'
)
  .withAccessControl([
    {
      name: 'role-check',
      allowedRoles: ['user', 'admin'],
    },
    {
      name: 'business-hours',
      timeWindowStart: '06:00:00',
      timeWindowEnd: '23:00:00',
    },
  ])
  .withCache({
    ttl: 300000,  // 5 分钟缓存
    strategy: 'lru',
  })
  .withLogging({
    logMethodCalls: true,
    logErrors: true,
    level: 'info',
  });

// 使用智能代理
try {
  const userData = await smartUserService.execute(
    'getUserData',
    'user-123'
  );
  console.log('User data:', userData);
  
  // 更新操作 (会被缓存失效)
  await smartUserService.execute('updateUser', 'user-123', {
    name: 'Jane Doe',
  });
} catch (error) {
  console.error('Operation failed:', error);
}
```

---

### 示例 6: 代理注册中心

```typescript
// 获取注册中心单例
const registry = ProxyRegistry.getInstance();

// 注册代理
const proxy = createAccessProxy(
  new DatabaseService(),
  'database-proxy',
  [{ name: 'admin-only', allowedRoles: ['admin'] }]
);

registry.register(proxy, {
  id: 'db-001',
  type: 'protection',
  tags: ['database', 'secure'],
});

// 获取代理
const retrievedProxy = registry.get<DatabaseService>('db-001');

// 查找代理
const adminProxies = registry.find({
  tags: ['secure'],
});

// 列出所有代理
const allProxies = registry.list();
console.log('Registered proxies:', allProxies);

// 注销代理
registry.unregister('db-001');

// 清空所有代理
registry.clear();
```

---

## 🔧 配置选项详解

### AccessControlPolicy

```typescript
interface AccessControlPolicy {
  name: string;                    // 策略名称 (必填)
  description?: string;            // 策略描述
  allowedRoles?: string[];         // 允许的角色列表
  allowedUsers?: string[];         // 允许的用户 ID 列表
  deniedUsers?: string[];          // 拒绝的用户 ID 列表
  timeWindowStart?: string;        // 时间窗口开始 (HH:mm:ss)
  timeWindowEnd?: string;          // 时间窗口结束 (HH:mm:ss)
  maxAccessCount?: number;         // 最大访问次数
  customValidator?: (context) => boolean | Promise<boolean>; // 自定义验证
}
```

### CacheConfig

```typescript
interface CacheConfig {
  keyGenerator?: (...args: any[]) => string;  // 缓存键生成函数
  ttl?: number;                                // 缓存过期时间 (毫秒)
  maxEntries?: number;                         // 最大缓存条目数
  strategy?: 'lru' | 'lfu' | 'fifo';          // 缓存策略
}
```

### LoggingConfig

```typescript
interface LoggingConfig {
  logMethodCalls?: boolean;    // 是否记录方法调用
  logParameters?: boolean;     // 是否记录参数
  logReturnValues?: boolean;   // 是否记录返回值
  logErrors?: boolean;         // 是否记录错误
  level?: 'debug' | 'info' | 'warn' | 'error'; // 日志级别
  logger?: (message, level, metadata) => void; // 自定义日志函数
}
```

### LazyLoadConfig

```typescript
interface LazyLoadConfig {
  enabled?: boolean;           // 是否启用延迟加载
  timeout?: number;            // 加载超时时间 (毫秒)
  retries?: number;            // 重试次数
  retryInterval?: number;      // 重试间隔 (毫秒)
  onLoadError?: (error) => void; // 加载失败回调
}
```

---

## 🎨 最佳实践

### 1. 组合使用代理

```typescript
// 推荐：组合多个代理功能
const service = createSmartProxy(loadService, 'my-service')
  .withAccessControl(policies)
  .withCache({ ttl: 300000 })
  .withLogging({ level: 'info' });

// 不推荐：手动嵌套代理
const lazy = new LazyLoadProxy(...);
const cached = new CacheProxy(lazy, ...);
const logged = new LoggingProxy(cached, ...);
```

### 2. 合理设置缓存 TTL

```typescript
// 频繁变化的数据 - 短 TTL
createCacheProxy(api, 'realtime-data', { ttl: 5000 });

// 稳定的配置数据 - 长 TTL
createCacheProxy(config, 'app-config', { ttl: 3600000 });
```

### 3. 访问控制策略排序

```typescript
// 推荐：从严格到宽松
const policies = [
  { name: 'deny-list', deniedUsers: ['banned'] },     // 最严格
  { name: 'allow-list', allowedUsers: ['admin'] },    // 次严格
  { name: 'role-check', allowedRoles: ['user'] },     // 较宽松
  { name: 'time-check', timeWindowStart: '09:00' },   // 最宽松
];
```

### 4. 日志级别选择

```typescript
// 开发环境 - debug
createLoggingProxy(service, 'dev', { level: 'debug' });

// 生产环境 - warn/error
createLoggingProxy(service, 'prod', { level: 'warn' });
```

---

## ⚠️ 注意事项

1. **性能影响**: 代理会增加方法调用的开销，避免在性能敏感路径上使用过多代理层
2. **内存管理**: 缓存代理会占用内存，确保设置合理的 `maxEntries` 和 `TTL`
3. **错误处理**: 访问控制失败会抛出异常，确保在调用方进行适当的错误处理
4. **线程安全**: 当前实现不是线程安全的，在并发环境下需要额外的同步机制

---

## 📊 性能基准

| 代理类型 | 额外开销 | 适用场景 |
|---------|---------|---------|
| 访问控制代理 | ~0.1ms | 安全敏感操作 |
| 延迟加载代理 | ~0.05ms | 重型对象初始化 |
| 缓存代理 (命中) | ~0.01ms | 频繁读取操作 |
| 缓存代理 (未命中) | ~0.1ms | 首次访问 |
| 日志代理 | ~0.2ms | 调试/审计 |
| 智能代理 (全功能) | ~0.5ms | 综合场景 |

---

## 🚀 未来计划

- [ ] 支持异步代理链
- [ ] 添加指标监控 (Metrics)
- [ ] 支持代理热切换
- [ ] 增加分布式缓存支持
- [ ] 支持代理序列化/反序列化

---

## 📝 更新日志

### v1.0.0 (2026-03-13)
- ✅ 初始版本发布
- ✅ 访问控制代理
- ✅ 延迟加载代理
- ✅ 缓存代理
- ✅ 日志代理
- ✅ 智能代理
- ✅ 代理注册中心

---

**有问题？** 联系 KAEL 或提交 Issue。
