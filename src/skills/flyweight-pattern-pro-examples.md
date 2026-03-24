# Flyweight Pattern Pro - 使用指南

**享元模式专业版** - 高级对象池管理、内存优化、智能淘汰策略

---

## 📦 快速开始

### 安装

```bash
# 无需额外依赖，直接使用
import { FlyweightPatternProSkill, FlyweightPool, BaseFlyweight } from './flyweight-pattern-pro-skill';
```

### 基础用法

```typescript
// 1. 创建享元池
const pool = new FlyweightPool<IntrinsicState, ExternalState>({
  maxSize: 1000,
  evictionPolicy: 'LRU',
  factory: async (intrinsic) => new MyFlyweight(intrinsic),
});

// 2. 获取享元
const flyweight = await pool.acquire(intrinsicState);

// 3. 执行操作
await flyweight.operate(externalState);

// 4. 释放回池
pool.release(intrinsicState);

// 或使用便捷方法
await pool.operate(intrinsicState, externalState);
```

---

## 🎯 核心概念

### 内部状态 vs 外部状态

| 类型 | 内部状态 (Intrinsic) | 外部状态 (External) |
|------|---------------------|-------------------|
| **共享性** | 共享 | 不共享 |
| **存储位置** | 享元对象内部 | 客户端代码 |
| **示例** | 字体样式、连接配置 | 字符位置、请求参数 |

### 享元池特性

- ✅ **多级缓存** - Map + WeakRef
- ✅ **智能淘汰** - LRU/LFU/FIFO/TTI
- ✅ **懒加载** - 按需创建
- ✅ **预加载** - 启动时加载常用对象
- ✅ **内存监控** - 实时统计
- ✅ **异步支持** - Promise/async-await

---

## 📚 完整示例

### 示例 1: 文本编辑器样式共享

```typescript
import { BaseFlyweight, FlyweightPool } from './flyweight-pattern-pro-skill';

// 定义内部状态（样式）
type TextStyle = {
  font: string;
  size: number;
  color: string;
};

// 定义外部状态（字符位置）
type CharContext = {
  char: string;
  line: number;
  column: number;
};

// 创建具体享元
class TextFlyweight extends BaseFlyweight<TextStyle, CharContext> {
  async operate(external: CharContext): Promise<void> {
    this.recordAccess();
    console.log(
      `Render "${external.char}" at L${external.line}:C${external.column} ` +
      `using ${this.intrinsic.font} ${this.intrinsic.size}px ${this.intrinsic.color}`
    );
  }
}

// 创建池
const pool = new FlyweightPool<TextStyle, CharContext>({
  maxSize: 50,
  evictionPolicy: 'LRU',
  enableWeakRef: true,
  factory: async (intrinsic) => new TextFlyweight(intrinsic),
});

// 使用：渲染文档
async function renderDocument() {
  const styles: TextStyle[] = [
    { font: 'Arial', size: 12, color: '#000' },
    { font: 'Arial', size: 14, color: '#F00' },
    { font: 'Times', size: 12, color: '#00F' },
  ];
  
  for (let i = 0; i < 10000; i++) {
    const style = styles[i % 3];
    const context: CharContext = {
      char: String.fromCharCode(65 + (i % 26)),
      line: Math.floor(i / 80),
      column: i % 80,
    };
    
    await pool.operate(style, context);
  }
  
  // 查看统计
  const stats = pool.getStats();
  console.log(`命中率：${(stats.hitRate * 100).toFixed(2)}%`);
  console.log(`估算节省：${(stats.estimatedMemorySaved / 1024).toFixed(2)} KB`);
  
  await pool.destroy();
}
```

### 示例 2: 游戏对象池（树木）

```typescript
// 树的类型（内部状态）
type TreeType = {
  model: string;
  texture: string;
  height: number;
};

// 树的实例（外部状态）
type TreeInstance = {
  x: number;
  y: number;
  z: number;
  rotation: number;
  scale: number;
};

class TreeFlyweight extends BaseFlyweight<TreeType, TreeInstance> {
  async operate(external: TreeInstance): Promise<void> {
    this.recordAccess();
    // 渲染树木
    console.log(
      `Render ${this.intrinsic.model} at ` +
      `(${external.x}, ${external.y}, ${external.z}) ` +
      `rotation=${external.rotation}°`
    );
  }
}

// 创建池
const treePool = new FlyweightPool<TreeType, TreeInstance>({
  maxSize: 100,
  evictionPolicy: 'LFU', // 使用频率淘汰
  factory: async (intrinsic) => new TreeFlyweight(intrinsic),
});

// 渲染森林
async function renderForest() {
  const treeTypes: TreeType[] = [
    { model: 'oak.mdl', texture: 'oak.png', height: 5 },
    { model: 'pine.mdl', texture: 'pine.png', height: 8 },
    { model: 'birch.mdl', texture: 'birch.png', height: 6 },
    { model: 'maple.mdl', texture: 'maple.png', height: 7 },
    { model: 'willow.mdl', texture: 'willow.png', height: 4 },
  ];
  
  for (let i = 0; i < 5000; i++) {
    const type = treeTypes[i % 5];
    const instance: TreeInstance = {
      x: Math.random() * 1000,
      y: Math.random() * 1000,
      z: 0,
      rotation: Math.random() * 360,
      scale: 0.8 + Math.random() * 0.4,
    };
    
    await treePool.operate(type, instance);
  }
  
  const stats = treePool.getStats();
  console.log(`缓存树类型：${stats.size}`);
  console.log(`命中率：${(stats.hitRate * 100).toFixed(2)}%`);
  
  await treePool.destroy();
}
```

### 示例 3: HTTP 连接池

```typescript
// 连接配置（内部状态）
type ConnectionConfig = {
  host: string;
  port: number;
  protocol: 'http' | 'https';
  keepAlive: boolean;
};

// 请求参数（外部状态）
type RequestConfig = {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  headers?: Record<string, string>;
  body?: any;
};

class ConnectionFlyweight extends BaseFlyweight<ConnectionConfig, RequestConfig> {
  private connectionId: string;
  
  constructor(intrinsic: ConnectionConfig) {
    super(intrinsic);
    this.connectionId = `conn_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }
  
  async operate(external: RequestConfig): Promise<void> {
    this.recordAccess();
    console.log(`[${this.connectionId}] ${external.method} ${external.path}`);
    
    // 模拟网络请求
    await new Promise(resolve => setTimeout(resolve, 50));
  }
}

// 创建连接池
const connectionPool = new FlyweightPool<ConnectionConfig, RequestConfig>({
  maxSize: 50,
  minSize: 10, // 最小连接数
  idleTimeout: 60000, // 5 分钟空闲超时
  evictionPolicy: 'LRU',
  enableWeakRef: false, // 连接不需要 WeakRef
  factory: async (intrinsic) => new ConnectionFlyweight(intrinsic),
  preloadKeys: [
    { host: 'api.example.com', port: 443, protocol: 'https', keepAlive: true },
    { host: 'cdn.example.com', port: 443, protocol: 'https', keepAlive: true },
  ],
});

// 使用连接池
async function sendRequests() {
  // 预加载常用连接
  await connectionPool.preload();
  
  const endpoints: ConnectionConfig[] = [
    { host: 'api.example.com', port: 443, protocol: 'https', keepAlive: true },
    { host: 'cdn.example.com', port: 443, protocol: 'https', keepAlive: true },
    { host: 'auth.example.com', port: 443, protocol: 'https', keepAlive: true },
  ];
  
  for (let i = 0; i < 1000; i++) {
    const endpoint = endpoints[i % 3];
    const request: RequestConfig = {
      method: i % 2 === 0 ? 'GET' : 'POST',
      path: `/api/resource/${i}`,
      headers: { 'Content-Type': 'application/json' },
    };
    
    await connectionPool.operate(endpoint, request);
  }
  
  const stats = connectionPool.getStats();
  console.log(`活跃连接：${stats.activeCount}`);
  console.log(`平均获取时间：${stats.avgAcquireTime.toFixed(2)} ms`);
  
  await connectionPool.destroy();
}
```

### 示例 4: 数据库查询缓存

```typescript
// 查询模板（内部状态）
type QueryTemplate = {
  sql: string;
  params: any[];
};

// 查询上下文（外部状态）
type QueryContext = {
  userId: string;
  filters?: Record<string, any>;
};

class QueryFlyweight extends BaseFlyweight<QueryTemplate, QueryContext> {
  async operate(external: QueryContext): Promise<void> {
    this.recordAccess();
    console.log(`Executing for ${external.userId}: ${this.intrinsic.sql}`);
    
    // 模拟查询
    await new Promise(resolve => setTimeout(resolve, 10));
  }
}

// 创建查询池
const queryPool = new FlyweightPool<QueryTemplate, QueryContext>({
  maxSize: 500,
  evictionPolicy: 'LFU', // 按使用频率淘汰
  enableWeakRef: true, // 允许 GC 回收不常用查询
  idleTimeout: 300000, // 5 分钟
  factory: async (intrinsic) => new QueryFlyweight(intrinsic),
});

// 执行查询
async function executeQueries() {
  const queries: QueryTemplate[] = [
    { sql: 'SELECT * FROM users WHERE id = ?', params: [1] },
    { sql: 'SELECT * FROM orders WHERE user_id = ?', params: [1] },
    { sql: 'SELECT COUNT(*) FROM products', params: [] },
    { sql: 'SELECT * FROM categories ORDER BY name', params: [] },
    { sql: 'SELECT * FROM reviews WHERE product_id = ?', params: [1] },
  ];
  
  for (let i = 0; i < 10000; i++) {
    const query = queries[i % 5];
    const context: QueryContext = {
      userId: `user_${i % 1000}`,
      filters: { status: 'active' },
    };
    
    await queryPool.operate(query, context);
  }
  
  const stats = queryPool.getStats();
  console.log(`缓存查询数：${stats.size}`);
  console.log(`命中率：${(stats.hitRate * 100).toFixed(2)}%`);
  console.log(`估算节省：${(stats.estimatedMemorySaved / 1024).toFixed(2)} KB`);
  
  await queryPool.destroy();
}
```

---

## ⚙️ 配置选项

### PoolConfig

```typescript
interface PoolConfig {
  /** 最小池大小（预创建对象数） */
  minSize?: number;
  
  /** 最大池大小 */
  maxSize?: number;
  
  /** 空闲超时（毫秒） */
  idleTimeout?: number;
  
  /** 获取超时（毫秒） */
  acquireTimeout?: number;
  
  /** 淘汰策略 */
  evictionPolicy?: 'LRU' | 'LFU' | 'FIFO' | 'TTI';
  
  /** 内存优化级别 */
  memoryLevel?: 'low' | 'balanced' | 'high';
  
  /** 启用 WeakRef（自动垃圾回收） */
  enableWeakRef?: boolean;
  
  /** 预加载键列表 */
  preloadKeys?: any[];
  
  /** 工厂函数 */
  factory?: (intrinsic: any) => Promise<IFlyweight> | IFlyweight;
  
  /** 销毁回调 */
  onDestroy?: (flyweight: IFlyweight) => void;
  
  /** 统计上报间隔（毫秒，0 禁用） */
  statsInterval?: number;
}
```

### 淘汰策略对比

| 策略 | 描述 | 适用场景 |
|------|------|---------|
| **LRU** | 最近最少使用 | 通用场景 |
| **LFU** | 最不经常使用 | 查询缓存 |
| **FIFO** | 先进先出 | 简单队列 |
| **TTI** | 空闲超时 | 连接池 |

---

## 📊 统计信息

### PoolStats

```typescript
interface PoolStats {
  size: number;              // 当前池大小
  activeCount: number;       // 活跃对象数
  idleCount: number;         // 空闲对象数
  hitCount: number;          // 命中次数
  missCount: number;         // 未命中次数
  hitRate: number;           // 命中率 (0-1)
  createCount: number;       // 创建次数
  destroyCount: number;      // 销毁次数
  avgAcquireTime: number;    // 平均获取时间 (ms)
  estimatedMemoryUsage: number;     // 估算内存占用 (字节)
  estimatedMemorySaved: number;     // 估算节省内存 (字节)
}
```

### 获取统计

```typescript
const stats = pool.getStats();
console.log(`命中率：${(stats.hitRate * 100).toFixed(2)}%`);
console.log(`内存节省：${(stats.estimatedMemorySaved / 1024 / 1024).toFixed(2)} MB`);
```

---

## 🎯 最佳实践

### 1. 选择合适的淘汰策略

```typescript
// 文本编辑器 - LRU（最近使用的样式更可能再次使用）
const textPool = new FlyweightPool({ evictionPolicy: 'LRU' });

// 数据库查询 - LFU（常用查询应该保留）
const queryPool = new FlyweightPool({ evictionPolicy: 'LFU' });

// 临时连接 - TTI（空闲连接应该关闭）
const connPool = new FlyweightPool({ evictionPolicy: 'TTI', idleTimeout: 60000 });
```

### 2. 启用 WeakRef 节省内存

```typescript
// 对于大型对象，启用 WeakRef 允许 GC 自动回收
const largeObjectPool = new FlyweightPool({
  enableWeakRef: true,
  maxSize: 1000,
});
```

### 3. 预加载常用对象

```typescript
const pool = new FlyweightPool({
  preloadKeys: [
    // 预加载最常用的配置
    { type: 'default' },
    { type: 'primary' },
  ],
  factory: async (intrinsic) => new MyFlyweight(intrinsic),
});

await pool.preload(); // 启动时加载
```

### 4. 监控统计信息

```typescript
// 定期输出统计
setInterval(() => {
  const stats = pool.getStats();
  console.log('[Pool Stats]', {
    size: stats.size,
    hitRate: (stats.hitRate * 100).toFixed(2) + '%',
    memory: (stats.estimatedMemorySaved / 1024).toFixed(2) + ' KB',
  });
}, 5000);
```

### 5. 正确释放对象

```typescript
// ✅ 正确：使用 operate 方法（自动释放）
await pool.operate(intrinsic, external);

// ✅ 正确：手动获取和释放
const flyweight = await pool.acquire(intrinsic);
try {
  await flyweight.operate(external);
} finally {
  pool.release(intrinsic);
}

// ❌ 错误：忘记释放
const flyweight = await pool.acquire(intrinsic);
await flyweight.operate(external);
// 没有 release，对象会一直占用
```

---

## 🔧 高级用法

### 自定义享元类

```typescript
class MyCustomFlyweight extends BaseFlyweight<MyIntrinsic, MyExternal> {
  private cachedData?: any;
  
  async operate(external: MyExternal): Promise<void> {
    this.recordAccess();
    
    // 懒加载缓存数据
    if (!this.cachedData) {
      this.cachedData = await this.loadExpensiveData();
    }
    
    // 使用缓存数据执行操作
    await this.process(this.cachedData, external);
  }
  
  private async loadExpensiveData(): Promise<any> {
    // 模拟耗时操作
    await new Promise(resolve => setTimeout(resolve, 100));
    return { data: 'expensive' };
  }
  
  protected estimateSize(): number {
    // 自定义内存估算
    return this.cachedData ? JSON.stringify(this.cachedData).length : 0;
  }
}
```

### 批量操作

```typescript
// 批量获取
const intrinsics = [/* ... */];
const flyweights = await pool.acquireBatch(intrinsics);

// 批量操作
await Promise.all(
  flyweights.map((fw, i) => fw.operate(externals[i]))
);

// 批量释放
intrinsics.forEach(intrinsic => pool.release(intrinsic));
```

### 统计上报

```typescript
const pool = new FlyweightPool({
  statsInterval: 5000, // 每 5 秒上报一次
});

// 统计会自动输出到控制台
// [FlyweightPool Stats] { "size": 50, "hitRate": 0.95, ... }
```

---

## ⚠️ 注意事项

1. **内存 vs 性能权衡**
   - 增大 `maxSize` 提高命中率但增加内存占用
   - 启用 `WeakRef` 节省内存但可能增加创建次数

2. **淘汰策略选择**
   - LRU 适合时间局部性场景
   - LFU 适合频率局部性场景
   - TTI 适合资源有限场景

3. **并发安全**
   - 当前实现适合单线程/Node.js 环境
   - 多线程环境需要额外锁机制

4. **工厂函数**
   - 工厂应该是纯函数（相同输入产生相同输出）
   - 避免工厂有副作用

---

## 📈 性能基准

```typescript
// 10000 次操作，5 种类型
// 无池化：创建 10000 个对象
// 享元池：创建 5 个对象，复用 9995 次

// 内存节省：~99.95%
// 性能提升：~50-80%（取决于对象创建成本）
```

---

## 📝 总结

Flyweight Pattern Pro 提供：

✅ **对象共享** - 减少内存占用  
✅ **智能池化** - 自动管理对象生命周期  
✅ **多种淘汰策略** - 适应不同场景  
✅ **内存优化** - WeakRef + 最终化注册表  
✅ **完整统计** - 实时监控性能指标  

适用场景：

- 大量细粒度对象（文本字符、游戏粒子）
- 可复用资源（数据库连接、HTTP 连接）
- 缓存系统（查询缓存、配置缓存）

---

**版本:** 2.0.0 Pro  
**作者:** Axon  
**许可:** MIT
