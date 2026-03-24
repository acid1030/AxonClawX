# Worker 工具技能 (Worker Utils)

> Worker 线程管理工具集 - Worker 创建、消息通信、线程池管理

## 📦 安装

无需额外安装，直接使用：

```typescript
import {
  WorkerManager,
  ThreadPoolManager,
  createWorkerManager,
  createThreadPool,
  generateTaskId,
  WorkerStatus,
} from '@/skills/worker-utils-skill';
```

## 🚀 快速开始

### 1. Worker 管理器 (单 Worker)

**原理**: 管理单个 Worker 线程的生命周期和消息通信

**适用场景**: 长时间运行的后台任务、CPU 密集型计算

```typescript
import { createWorkerManager, generateTaskId } from '@/skills/worker-utils-skill';
import * as path from 'path';

// 创建 Worker 管理器
const manager = createWorkerManager({
  workerPath: path.join(__dirname, 'my-worker.js'),
  name: 'compute-worker'
});

// 监听事件
manager.on('online', () => console.log('Worker 已上线'));
manager.on('taskComplete', (result) => console.log('任务完成:', result));
manager.on('error', (error) => console.error('错误:', error));

// 创建 Worker
await manager.create();

// 发送任务
const result = await manager.sendTask({
  id: generateTaskId(),
  type: 'compute',
  payload: { numbers: [1, 2, 3, 4, 5] },
  timeoutMs: 5000
});

console.log('结果:', result);

// 终止 Worker
await manager.terminate();
```

### 2. 线程池 (多 Worker)

**原理**: 管理多个 Worker 实例，自动调度和负载均衡

**适用场景**: 批量任务处理、并发计算、任务队列

```typescript
import { createThreadPool, generateTaskId } from '@/skills/worker-utils-skill';
import * as path from 'path';

// 创建线程池
const pool = createThreadPool({
  minWorkers: 2,           // 最小 Worker 数
  maxWorkers: 8,           // 最大 Worker 数
  idleTimeout: 60000,      // 空闲超时 (60 秒)
  taskTimeout: 300000,     // 任务超时 (5 分钟)
  workerPath: path.join(__dirname, 'my-worker.js')
});

// 监听事件
pool.on('initialized', (info) => console.log('线程池已初始化:', info));
pool.on('workerCreated', (info) => console.log('Worker 已创建:', info.workerId));
pool.on('workerDestroyed', (info) => console.log('Worker 已销毁:', info.workerId));
pool.on('error', (err) => console.error('线程池错误:', err));

// 初始化线程池
await pool.initialize();

// 执行多个任务
const tasks = Array.from({ length: 10 }, (_, i) => ({
  id: generateTaskId(`task-${i}`),
  type: 'compute',
  payload: { index: i, data: [1, 2, 3, 4, 5] }
}));

// 并发执行所有任务
const results = await Promise.all(
  tasks.map(task => pool.executeTask(task))
);

console.log('所有任务完成:', results);

// 查看线程池状态
console.log('线程池状态:', pool.getStatus());

// 关闭线程池
await pool.shutdown();
```

### 3. Worker 脚本示例

创建 Worker 脚本文件 (`my-worker.js` 或 `my-worker.ts`):

```typescript
// my-worker.ts
import { parentPort } from 'worker_threads';

if (parentPort) {
  parentPort.on('message', async (message) => {
    const { type, id, task } = message;

    if (type === 'task') {
      try {
        // 处理任务
        const result = await processTask(task);

        // 发送结果
        parentPort.postMessage({
          type: 'result',
          id,
          data: result
        });
      } catch (error) {
        // 发送错误
        parentPort.postMessage({
          type: 'result',
          id,
          error: error.message
        });
      }
    }
  });
}

async function processTask(task: any) {
  switch (task.type) {
    case 'compute':
      // CPU 密集型计算
      return computeHeavy(task.payload);
    
    case 'transform':
      // 数据转换
      return transformData(task.payload);
    
    default:
      throw new Error(`未知任务类型：${task.type}`);
  }
}

function computeHeavy(payload: any) {
  // 示例：计算数组平方和
  return payload.numbers.reduce((sum: number, n: number) => sum + n * n, 0);
}

function transformData(payload: any) {
  // 示例：数据转换
  return payload.data.map((item: any) => item * 2);
}
```

## 📖 API 文档

### WorkerManager

单个 Worker 的生命周期管理

```typescript
class WorkerManager extends EventEmitter {
  // 创建 Worker
  create(): Promise<void>;

  // 发送任务
  sendTask<T>(task: WorkerTask): Promise<WorkerTaskResult<T>>;

  // 终止 Worker
  terminate(): Promise<void>;

  // 获取状态
  getStatus(): WorkerStatus;

  // 检查是否可用
  isAvailable(): boolean;

  // 事件
  on('online', handler: (manager) => void)
  on('taskStart', handler: (task) => void)
  on('taskComplete', handler: (result) => void)
  on('progress', handler: (progress) => void)
  on('error', handler: (error) => void)
  on('stopping', handler: () => void)
  on('stopped', handler: () => void)
  on('exit', handler: (code) => void)
}
```

### ThreadPoolManager

线程池管理

```typescript
class ThreadPoolManager extends EventEmitter {
  // 初始化线程池
  initialize(): Promise<void>;

  // 执行任务
  executeTask<T>(task: WorkerTask): Promise<WorkerTaskResult<T>>;

  // 获取状态
  getStatus(): ThreadPoolStatus;

  // 关闭线程池
  shutdown(): Promise<void>;

  // 事件
  on('initialized', handler: (info) => void)
  on('workerCreated', handler: (info) => void)
  on('workerDestroyed', handler: (info) => void)
  on('workerExit', handler: (info) => void)
  on('error', handler: (err) => void)
  on('shutdown', handler: () => void)
}
```

### WorkerTask

任务定义

```typescript
interface WorkerTask {
  id: string;              // 任务 ID
  type: string;            // 任务类型
  payload: any;            // 任务数据
  priority?: number;       // 优先级 (可选)
  timeoutMs?: number;      // 超时时间 (可选)
  createdAt: number;       // 创建时间
}
```

### WorkerTaskResult

任务结果

```typescript
interface WorkerTaskResult<T> {
  taskId: string;          // 任务 ID
  success: boolean;        // 是否成功
  data?: T;                // 结果数据
  error?: Error;           // 错误信息
  duration: number;        // 执行时长 (ms)
}
```

### WorkerStatus

Worker 状态枚举

```typescript
enum WorkerStatus {
  IDLE = 'idle',           // 空闲
  BUSY = 'busy',           // 忙碌
  STOPPING = 'stopping',   // 停止中
  STOPPED = 'stopped'      // 已停止
}
```

## 🎯 实际应用场景

### 1. 批量图像处理

```typescript
const pool = createThreadPool({
  minWorkers: 4,
  maxWorkers: 8,
  workerPath: path.join(__dirname, 'image-worker.js')
});

await pool.initialize();

const images = await getImagesToProcess();
const tasks = images.map(img => ({
  id: generateTaskId('image'),
  type: 'resize',
  payload: {
    path: img.path,
    width: 800,
    height: 600
  }
}));

const results = await Promise.all(
  tasks.map(task => pool.executeTask(task))
);

await pool.shutdown();
```

### 2. 数据加密/解密

```typescript
const manager = createWorkerManager({
  workerPath: path.join(__dirname, 'crypto-worker.js')
});

await manager.create();

// 加密大文件
const encrypted = await manager.sendTask({
  id: generateTaskId('encrypt'),
  type: 'encrypt',
  payload: {
    data: largeFileBuffer,
    algorithm: 'aes-256-gcm',
    key: encryptionKey
  },
  timeoutMs: 60000
});

await manager.terminate();
```

### 3. 实时数据处理管道

```typescript
const pool = createThreadPool({
  minWorkers: 2,
  maxWorkers: 4,
  workerPath: path.join(__dirname, 'stream-worker.js')
});

await pool.initialize();

// 监听数据流
dataStream.on('data', async (chunk) => {
  try {
    const result = await pool.executeTask({
      id: generateTaskId('stream'),
      type: 'transform',
      payload: { chunk }
    });
    
    outputStream.write(result.data);
  } catch (error) {
    console.error('处理失败:', error);
  }
});
```

### 4. 并行网络请求

```typescript
const pool = createThreadPool({
  minWorkers: 4,
  maxWorkers: 10,
  workerPath: path.join(__dirname, 'fetch-worker.js')
});

await pool.initialize();

const urls = getUrlList();
const tasks = urls.map(url => ({
  id: generateTaskId('fetch'),
  type: 'fetch',
  payload: { url, timeout: 10000 }
}));

const results = await Promise.all(
  tasks.map(task => pool.executeTask(task))
);

// 收集所有成功结果
const successfulResults = results
  .filter(r => r.success)
  .map(r => r.data);

await pool.shutdown();
```

## ⚡ 性能优化建议

### 1. Worker 数量配置

```typescript
// CPU 密集型任务
const pool = createThreadPool({
  minWorkers: os.cpus().length,      // 与 CPU 核心数相同
  maxWorkers: os.cpus().length * 2,  // 最多 2 倍
  // ...
});

// I/O 密集型任务
const pool = createThreadPool({
  minWorkers: 4,                      // 较少 Worker
  maxWorkers: 16,                     // 较多 Worker (I/O 等待时可处理其他任务)
  // ...
});
```

### 2. 任务分块

```typescript
// ❌ 不推荐：单个大任务
await pool.executeTask({
  id: 'big-task',
  type: 'process',
  payload: { data: hugeArray }  // 100 万条数据
});

// ✅ 推荐：分块处理
const chunks = chunk(hugeArray, 10000);  // 分成 100 块
const tasks = chunks.map((chunk, i) => ({
  id: generateTaskId(`chunk-${i}`),
  type: 'process',
  payload: { data: chunk }
}));

const results = await Promise.all(
  tasks.map(task => pool.executeTask(task))
);

// 合并结果
const finalResult = mergeResults(results);
```

### 3. 内存管理

```typescript
// 设置 Worker 内存限制
const manager = createWorkerManager({
  workerPath: './worker.js',
  resourceLimits: {
    maxOldGenerationSizeMb: 512,    // 老生代最大 512MB
    maxYoungGenerationSizeMb: 128,  // 新生代最大 128MB
    stackSizeMb: 16                 // 栈大小 16MB
  }
});
```

### 4. 超时处理

```typescript
// 始终设置任务超时
const result = await pool.executeTask({
  id: generateTaskId(),
  type: 'compute',
  payload: { data },
  timeoutMs: 30000  // 30 秒超时
});

// 处理超时
if (!result.success && result.error?.message.includes('超时')) {
  console.log('任务超时，重试或降级处理');
}
```

## 📝 注意事项

### 1. Worker 脚本要求

- Worker 脚本必须是独立的模块文件
- 不能使用 `require.main === module` 判断
- 通过 `parentPort` 与主线程通信
- 避免使用共享内存 (除非必要)

### 2. 数据传输限制

- 数据通过结构化克隆算法传输
- 不能传输函数、类实例、DOM 节点
- 大对象会触发复制，影响性能
- 考虑使用 `Transferable` 对象 (如 ArrayBuffer)

### 3. 错误处理

```typescript
try {
  const result = await pool.executeTask(task);
  if (!result.success) {
    console.error('任务失败:', result.error);
    // 重试或降级处理
  }
} catch (error) {
  console.error('Worker 异常:', error);
  // 可能需要重建 Worker
}
```

### 4. 资源清理

```typescript
// 始终在程序退出前关闭线程池
process.on('SIGINT', async () => {
  await pool.shutdown();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await pool.shutdown();
  process.exit(0);
});
```

## 🔍 调试技巧

### 1. 启用 Worker 日志

```typescript
const manager = createWorkerManager({
  workerPath: './worker.js',
  execArgv: ['--trace-warnings']  // 启用警告追踪
});
```

### 2. 监控 Worker 状态

```typescript
setInterval(() => {
  const status = pool.getStatus();
  console.log('线程池状态:', {
    总 Worker 数：status.totalWorkers,
    空闲：status.idleWorkers,
    忙碌：status.busyWorkers,
    队列：status.queuedTasks
  });
}, 5000);
```

### 3. 性能分析

```typescript
const tasks = [];
for (let i = 0; i < 100; i++) {
  const start = Date.now();
  const result = await pool.executeTask(task);
  tasks.push({
    duration: Date.now() - start,
    success: result.success
  });
}

const avgDuration = tasks.reduce((sum, t) => sum + t.duration, 0) / tasks.length;
console.log('平均任务时长:', avgDuration, 'ms');
```

## 📚 相关文件

- 源代码：`src/skills/worker-utils-skill.ts`
- Worker 示例：`src/skills/worker-example.ts`

## 🤝 贡献

遵循项目代码规范，确保类型安全和测试覆盖。
