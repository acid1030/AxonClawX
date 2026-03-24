# Worker Utils 技能

Web Worker 线程池工具，用于在浏览器环境中实现并行任务处理。

## 🚀 快速开始

```typescript
import { createWorkerPool, createWorkerBlobUrl } from './worker-utils-skill';

// 1. 创建 Worker 脚本
const workerUrl = createWorkerBlobUrl<number, number>(
  (data) => data * data  // 计算平方
);

// 2. 创建线程池
const pool = await createWorkerPool({
  scriptUrl: workerUrl,
  workerCount: 4,
});

// 3. 分发任务
const results = await Promise.all(
  [1, 2, 3, 4, 5].map(n => pool.dispatch(n))
);

console.log(results.map(r => r.result)); // [1, 4, 9, 16, 25]

// 4. 销毁线程池
await pool.destroy();
```

## 📦 核心功能

### 1. Worker 线程池管理

- **自动创建/销毁 Worker**
- **Worker 复用** - 避免频繁创建销毁的开销
- **自动扩缩容** - 根据负载自动调整 Worker 数量
- **错误恢复** - Worker 崩溃后自动重启

```typescript
const pool = await createWorkerPool({
  scriptUrl: '/worker.js',
  workerCount: 4,           // 初始 Worker 数量
  minWorkers: 1,            // 最少保留 Worker 数
  maxWorkers: 8,            // 最多 Worker 数
  autoScale: true,          // 启用自动扩缩容
  idleTimeout: 60000,       // 空闲超时销毁 (ms)
});
```

### 2. 任务分发

- **优先级调度** - 高优先级任务先执行
- **负载均衡** - 自动分配到空闲 Worker
- **批量分发** - 一次性分发多个任务
- **超时控制** - 自动终止超时任务

```typescript
// 单个任务
const result = await pool.dispatch(data, 'task-type', priority);

// 批量任务
const results = await pool.dispatchBatch([data1, data2, data3]);
```

### 3. 结果聚合

- **顺序聚合** - 保持任务执行顺序
- **错误过滤** - 跳过失败的任务
- **结果转换** - 自定义结果格式
- **流式处理** - 边执行边聚合

```typescript
const values = aggregateResults(results, {
  skipErrors: true,
  transform: (r) => r.result,
});
```

## 📖 API 文档

### WorkerPool 类

#### 构造函数

```typescript
new WorkerPool(options: WorkerOptions)
```

**WorkerOptions:**

| 参数 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| `scriptUrl` | `string` | 必填 | Worker 脚本 URL |
| `workerCount` | `number` | `navigator.hardwareConcurrency` | Worker 数量 |
| `maxTasksPerWorker` | `number` | `1` | 单 Worker 最大并发数 |
| `taskTimeout` | `number` | `30000` | 任务超时时间 (ms) |
| `autoScale` | `boolean` | `false` | 是否启用自动扩缩容 |
| `minWorkers` | `number` | `1` | 最小 Worker 数 |
| `maxWorkers` | `number` | `8` | 最大 Worker 数 |
| `idleTimeout` | `number` | `60000` | 空闲超时销毁 (ms) |
| `debug` | `boolean` | `false` | 调试模式 |

#### 方法

```typescript
// 初始化线程池
await pool.initialize();

// 分发单个任务
const result = await pool.dispatch<T, R>(data, type?, priority?);

// 批量分发任务
const results = await pool.dispatchBatch<T, R>(tasks, type?);

// 获取统计信息
const stats = pool.getStats();

// 获取 Worker 状态
const statuses = pool.getWorkerStatuses();

// 等待所有任务完成
await pool.drain(timeout?);

// 销毁线程池
await pool.destroy(force?);
```

### 便捷函数

```typescript
// 创建并初始化线程池
const pool = await createWorkerPool(options);

// 快速执行批量任务 (自动创建/销毁线程池)
const results = await runWorkerTasks(tasks, workerScriptUrl, options);

// 生成 Worker Blob URL
const workerUrl = createWorkerBlobUrl(handler);
const workerUrl = createMultiHandlerWorkerUrl(handlers);

// 聚合结果
const values = aggregateResults(results, options);
```

### ResultAggregator 类

```typescript
// 创建聚合器 (每 100 个结果回调一次)
const aggregator = new ResultAggregator(100, async (batch) => {
  await processBatch(batch);
});

// 添加结果
aggregator.add(result);

// 取出所有结果
const remaining = aggregator.drain();
```

## 🎯 使用场景

### 1. 图像处理

```typescript
const workerUrl = createWorkerBlobUrl<{ imageData: ImageData }, ImageData>(
  async (image) => {
    // 图像滤镜处理
    const data = image.imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      // 灰度化
      const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
      data[i] = data[i + 1] = data[i + 2] = avg;
    }
    return image.imageData;
  }
);

const pool = await createWorkerPool({ scriptUrl: workerUrl, workerCount: 4 });
```

### 2. 数据加密/解密

```typescript
const workerUrl = createWorkerBlobUrl<{ data: string; key: string }, string>(
  async (payload) => {
    // 使用 Web Crypto API
    const encrypted = await crypto.subtle.encrypt(...);
    return btoa(String.fromCharCode(...new Uint8Array(encrypted)));
  }
);
```

### 3. 大量计算

```typescript
const workerUrl = createWorkerBlobUrl<number[], number>(
  (numbers) => {
    // 复杂计算
    return numbers.reduce((sum, n) => sum + Math.sqrt(n), 0);
  }
);
```

### 4. 文件处理

```typescript
const workerUrl = createWorkerBlobUrl<{ file: File }, string>(
  async (fileData) => {
    const text = await fileData.file.text();
    return text.toUpperCase();
  }
);
```

## 📊 性能优化建议

1. **Worker 数量**: 设置为 `navigator.hardwareConcurrency` 或略少
2. **任务粒度**: 避免过小的任务 (通信开销 > 计算时间)
3. **数据传输**: 使用 `Transferable` 对象避免复制
4. **内存管理**: 及时销毁不再使用的 Worker
5. **错误处理**: 设置合理的超时时间

## ⚠️ 注意事项

1. **Worker 限制**: Worker 无法访问 DOM，只能使用部分 Web API
2. **数据序列化**: 传递给 Worker 的数据会被结构化克隆
3. **浏览器兼容**: 需要支持 Web Worker 的浏览器
4. **跨域问题**: Worker 脚本必须同源或使用 CORS

## 📝 完整示例

查看 `worker-utils-examples.ts` 获取更多示例：

- ✅ 基础用法
- ✅ 批量处理
- ✅ 多类型任务
- ✅ 优先级调度
- ✅ 自动扩缩容
- ✅ 流式结果处理
- ✅ 错误处理
- ✅ 实际应用 (图片缩略图、数据加密)

## 🔗 相关文件

- `worker-utils-skill.ts` - 核心实现
- `worker-utils-examples.ts` - 使用示例
- `WORKER-UTILS-README.md` - 本文档
