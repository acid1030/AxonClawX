# 🚦 限流器工具技能 (Limiter Utils)

**并发控制 · 请求队列 · 优先级调度**

---

## 📋 目录

- [功能特性](#-功能特性)
- [快速开始](#-快速开始)
- [API 文档](#-api-文档)
- [使用示例](#-使用示例)
- [高级用法](#-高级用法)
- [性能基准](#-性能基准)

---

## ✨ 功能特性

### 1. 并发数限制
- 可配置最大并发任务数
- 自动排队超出并发限制的任务
- 动态调整并发数 (运行时)

### 2. 请求队列
- FIFO 队列管理
- 自动任务调度
- 队列长度限制保护

### 3. 优先级调度
- 4 级优先级：`critical` > `high` > `normal` > `low`
- 高优先级任务可插队
- 同优先级按创建时间排序

### 4. 任务管理
- 任务超时控制
- 自动重试机制
- 任务取消功能
- 实时状态追踪

### 5. 统计监控
- 运行中/等待中/已完成任务数
- 平均等待时间/执行时间
- 失败/取消任务统计

---

## 🚀 快速开始

### 安装
无需安装，直接使用：
```typescript
import { ConcurrencyLimiter } from './src/skills/limiter-utils-skill';
```

### 基础用法
```typescript
const limiter = new ConcurrencyLimiter({ 
  concurrency: 3  // 最多同时执行 3 个任务
});

// 添加任务
const result = await limiter.add(async () => {
  return await fetchData();
});

console.log(result); // { taskId, status, result, duration, priority }
```

---

## 📖 API 文档

### ConcurrencyLimiter

#### 构造函数
```typescript
new ConcurrencyLimiter(options?: LimiterOptions)
```

**配置项:**
| 选项 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| `concurrency` | number | 5 | 最大并发数 |
| `maxQueueSize` | number | 1000 | 队列最大长度 |
| `timeout` | number | 30000 | 任务超时时间 (ms) |
| `autoRetry` | boolean | false | 是否自动重试失败任务 |
| `retryCount` | number | 3 | 重试次数 |
| `retryDelay` | number | 1000 | 重试延迟 (ms) |

#### 核心方法

##### `add(execute, priority?)`
添加单个任务到队列

```typescript
add<T>(
  execute: () => Promise<T>,
  priority: Priority = 'normal'
): Promise<TaskResult<T>>
```

**参数:**
- `execute`: 任务执行函数
- `priority`: 优先级 (`'low' | 'normal' | 'high' | 'critical'`)

**返回:** `TaskResult<T>`
```typescript
{
  taskId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  result?: T;
  error?: Error;
  duration: number;
  priority: Priority;
}
```

##### `addBatch(tasks, priority?)`
批量添加任务

```typescript
addBatch<T>(
  tasks: Array<() => Promise<T>>,
  priority: Priority = 'normal'
): Promise<TaskResult<T>[]>
```

##### `cancel(taskId)`
取消任务

```typescript
cancel(taskId: string): boolean
```

##### `cancelAll()`
取消所有任务

```typescript
cancelAll(): void
```

##### `getStats()`
获取统计信息

```typescript
getStats(): LimiterStats
```

**返回:**
```typescript
{
  running: number;      // 当前运行任务数
  pending: number;      // 等待中任务数
  completed: number;    // 已完成任务数
  failed: number;       // 失败任务数
  cancelled: number;    // 已取消任务数
  avgWaitTime: number;  // 队列平均等待时间 (ms)
  avgExecTime: number;  // 任务平均执行时间 (ms)
}
```

##### `setConcurrency(concurrency)`
动态设置并发数

```typescript
setConcurrency(concurrency: number): void
```

##### `clearQueue()`
清空等待队列

```typescript
clearQueue(): void
```

---

### 便捷函数

#### `createLimiter(concurrency?)`
快速创建限流器实例

```typescript
const limiter = createLimiter(3); // 等同于 new ConcurrencyLimiter({ concurrency: 3 })
```

#### `executeWithConcurrency(tasks, concurrency?)`
批量执行任务 (带并发限制)

```typescript
const results = await executeWithConcurrency(
  [
    () => fetchUrl('https://api1.com'),
    () => fetchUrl('https://api2.com'),
    () => fetchUrl('https://api3.com'),
  ],
  2  // 最多 2 个并发
);
```

#### `executeWithPriority(taskGroups, concurrency?)`
带优先级的批量执行

```typescript
const results = await executeWithPriority(
  {
    critical: [() => urgentTask1(), () => urgentTask2()],
    high: [() => importantTask()],
    normal: [() => normalTask1(), () => normalTask2()],
    low: [() => backgroundTask()],
  },
  3
);
```

---

## 💡 使用示例

### 示例 1: 基础并发控制
```typescript
import { ConcurrencyLimiter } from './src/skills/limiter-utils-skill';

const limiter = new ConcurrencyLimiter({ concurrency: 3 });

// 创建 10 个任务
const tasks = Array.from({ length: 10 }, (_, i) => 
  () => fetch(`https://api.example.com/data/${i}`)
    .then(res => res.json())
);

// 所有任务会自动排队，最多 3 个并发执行
const results = await Promise.all(
  tasks.map(task => limiter.add(task))
);

console.log(`完成 ${results.length} 个任务`);
```

### 示例 2: 优先级调度
```typescript
const limiter = new ConcurrencyLimiter({ concurrency: 2 });

// 添加普通任务
limiter.add(() => processOrder('order-1'), 'normal');
limiter.add(() => processOrder('order-2'), 'normal');

// 添加紧急任务 (会插队到最前面)
const urgentResult = await limiter.add(
  () => processOrder('VIP-ORDER'), 
  'critical'
);

console.log('紧急订单先完成:', urgentResult);
```

### 示例 3: 任务超时控制
```typescript
const limiter = new ConcurrencyLimiter({ 
  concurrency: 3,
  timeout: 5000  // 5 秒超时
});

try {
  const result = await limiter.add(async () => {
    // 模拟长时间运行的任务
    await sleep(10000);
    return 'done';
  });
} catch (error) {
  console.error('任务超时:', error.message);
}
```

### 示例 4: 自动重试机制
```typescript
const limiter = new ConcurrencyLimiter({
  concurrency: 3,
  autoRetry: true,      // 启用自动重试
  retryCount: 3,        // 最多重试 3 次
  retryDelay: 1000,     // 每次重试间隔 1 秒
});

const result = await limiter.add(async () => {
  const response = await fetch('https://flaky-api.com/data');
  if (!response.ok) {
    throw new Error('API 调用失败');
  }
  return response.json();
});
```

### 示例 5: 任务取消
```typescript
const limiter = new ConcurrencyLimiter({ concurrency: 2 });

// 添加长时间任务
const taskId = await limiter.add(async () => {
  await sleep(30000);
  return 'completed';
});

// 2 秒后取消任务
setTimeout(() => {
  const cancelled = limiter.cancel(taskId);
  console.log('任务已取消:', cancelled);
}, 2000);
```

### 示例 6: 实时监控
```typescript
const limiter = new ConcurrencyLimiter({ concurrency: 5 });

// 添加一批任务
for (let i = 0; i < 20; i++) {
  limiter.add(() => simulateWork(i));
}

// 定时打印统计信息
const interval = setInterval(() => {
  const stats = limiter.getStats();
  console.log(`
    运行中：${stats.running}
    等待中：${stats.pending}
    已完成：${stats.completed}
    失败：${stats.failed}
    平均等待：${stats.avgWaitTime.toFixed(0)}ms
    平均执行：${stats.avgExecTime.toFixed(0)}ms
  `);
  
  if (stats.pending === 0 && stats.running === 0) {
    clearInterval(interval);
  }
}, 500);
```

### 示例 7: 批量执行工具函数
```typescript
import { executeWithConcurrency } from './src/skills/limiter-utils-skill';

// 抓取 100 个网页，最多 10 个并发
const urls = Array.from({ length: 100 }, (_, i) => 
  `https://example.com/page/${i}`
);

const results = await executeWithConcurrency(
  urls.map(url => () => fetch(url).then(r => r.text())),
  10  // 10 个并发
);

console.log(`成功抓取 ${results.length} 个页面`);
```

### 示例 8: 优先级批处理
```typescript
import { executeWithPriority } from './src/skills/limiter-utils-skill';

const results = await executeWithPriority(
  {
    // 紧急任务 (立即执行)
    critical: [
      () => sendAlert('系统告警'),
      () => notifyAdmin('管理员通知'),
    ],
    // 重要任务 (优先执行)
    high: [
      () => processPayment('订单-123'),
      () => updateInventory('商品-456'),
    ],
    // 普通任务 (正常执行)
    normal: [
      () => sendEmail('用户-1'),
      () => sendEmail('用户-2'),
      () => sendEmail('用户-3'),
    ],
    // 后台任务 (空闲时执行)
    low: [
      () => cleanupTempFiles(),
      () => generateReport(),
    ],
  },
  3  // 3 个并发
);
```

---

## 🎯 高级用法

### 动态调整并发数
```typescript
const limiter = new ConcurrencyLimiter({ concurrency: 2 });

// 运行时增加到 5 个并发
limiter.setConcurrency(5);

// 高峰期降低到 3 个并发
limiter.setConcurrency(3);
```

### 任务链式调用
```typescript
const limiter = new ConcurrencyLimiter({ concurrency: 3 });

// 任务依赖链
const task1 = await limiter.add(() => fetchInitialData());
const task2 = await limiter.add(() => processData(task1.result));
const task3 = await limiter.add(() => saveResults(task2.result));
```

### 结合 AbortController
```typescript
const limiter = new ConcurrencyLimiter({ concurrency: 3 });

const result = await limiter.add(async () => {
  const controller = new AbortController();
  
  const response = await fetch('https://api.example.com/data', {
    signal: controller.signal
  });
  
  // 可以根据条件主动取消
  if (someCondition) {
    controller.abort();
  }
  
  return response.json();
});
```

### 自定义错误处理
```typescript
const limiter = new ConcurrencyLimiter({ 
  concurrency: 3,
  autoRetry: true,
  retryCount: 3,
});

const results = await Promise.all(
  tasks.map(async task => {
    try {
      return await limiter.add(task, 'normal');
    } catch (error) {
      console.error('任务失败:', error);
      return { status: 'failed', error };
    }
  })
);
```

---

## 📊 性能基准

### 并发性能测试
```typescript
import { ConcurrencyLimiter } from './src/skills/limiter-utils-skill';

async function benchmark() {
  const taskCount = 100;
  const concurrencyLevels = [1, 3, 5, 10, 20];
  
  for (const concurrency of concurrencyLevels) {
    const limiter = new ConcurrencyLimiter({ concurrency });
    
    const start = Date.now();
    
    await Promise.all(
      Array.from({ length: taskCount }, () =>
        limiter.add(() => sleep(100))
      )
    );
    
    const duration = Date.now() - start;
    console.log(`并发数 ${concurrency}: ${duration}ms`);
  }
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
```

**典型结果:**
```
并发数 1:  10000ms (串行执行)
并发数 3:  3400ms
并发数 5:  2100ms
并发数 10: 1100ms
并发数 20: 600ms
```

### 优先级调度测试
```typescript
async function testPriority() {
  const limiter = new ConcurrencyLimiter({ concurrency: 1 });
  
  // 先添加低优先级任务
  limiter.add(() => sleep(1000).then(() => 'low'), 'low');
  limiter.add(() => sleep(1000).then(() => 'low'), 'low');
  
  // 后添加高优先级任务 (会插队)
  const start = Date.now();
  const result = await limiter.add(
    () => sleep(100).then(() => 'HIGH PRIORITY'), 
    'critical'
  );
  
  console.log(`高优先级任务完成时间：${Date.now() - start}ms`);
  console.log(`结果：${result.result}`);
}
```

**输出:**
```
高优先级任务完成时间：100ms
结果：HIGH PRIORITY
```

---

## ⚠️ 注意事项

### 1. 内存泄漏预防
```typescript
// ❌ 错误：任务无限堆积
const limiter = new ConcurrencyLimiter({ concurrency: 3 });
setInterval(() => {
  limiter.add(() => longTask()); // 任务堆积
}, 10);

// ✅ 正确：限制队列长度
const limiter = new ConcurrencyLimiter({ 
  concurrency: 3,
  maxQueueSize: 100  // 最多 100 个等待任务
});
```

### 2. 错误处理
```typescript
// ❌ 错误：忽略错误
limiter.add(() => riskyOperation());

// ✅ 正确：捕获错误
try {
  const result = await limiter.add(() => riskyOperation());
  if (result.status === 'failed') {
    console.error('任务失败:', result.error);
  }
} catch (error) {
  console.error('异常:', error);
}
```

### 3. 资源清理
```typescript
// 使用完成后清理
const limiter = new ConcurrencyLimiter({ concurrency: 5 });

// ... 使用限流器 ...

// 取消所有任务并释放资源
limiter.cancelAll();
```

---

## 🎓 最佳实践

### 1. 选择合适的并发数
- **CPU 密集型任务**: 并发数 = CPU 核心数
- **IO 密集型任务**: 并发数 = CPU 核心数 × 2~10
- **网络请求**: 并发数 = 10~50 (根据服务器限制)

### 2. 合理设置超时
```typescript
const limiter = new ConcurrencyLimiter({
  timeout: 30000,  // 30 秒超时 (根据任务类型调整)
});
```

### 3. 使用优先级
```typescript
// 用户请求 > 后台任务
limiter.add(() => handleUserRequest(), 'high');
limiter.add(() => backgroundJob(), 'low');
```

### 4. 监控统计信息
```typescript
// 定期检查限流器状态
setInterval(() => {
  const stats = limiter.getStats();
  if (stats.pending > 100) {
    console.warn('队列积压:', stats.pending);
  }
}, 5000);
```

---

## 📝 更新日志

### v1.0.0 (2026-03-13)
- ✨ 初始版本发布
- ✅ 并发数限制
- ✅ 请求队列管理
- ✅ 优先级调度
- ✅ 任务超时控制
- ✅ 自动重试机制
- ✅ 任务取消功能
- ✅ 实时统计监控

---

## 🤝 贡献

欢迎提交 Issue 和 Pull Request!

---

## 📄 许可证

MIT License
