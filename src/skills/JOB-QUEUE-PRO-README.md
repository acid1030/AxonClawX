# Job Queue Pro Skill - 专业任务队列管理工具

**版本:** 1.0.0  
**作者:** Axon (KAEL Engineering)  
**依赖:** 无 (纯 TypeScript 实现)

---

## 📋 功能概览

### 1. 任务队列
- ✅ 先进先出 (FIFO) + 优先级混合调度
- ✅ 支持批量添加任务
- ✅ 任务取消功能
- ✅ 队列清空功能

### 2. 优先级调度
- ✅ P0-P3 四级优先级 (P0: Critical > P1: High > P2: Medium > P3: Low)
- ✅ 紧急任务插队
- ✅ 可配置优先级权重
- ✅ 自动队列排序

### 3. 重试机制
- ✅ 可配置重试次数
- ✅ 三种退避策略:
  - `fixed`: 固定间隔
  - `linear`: 线性增长
  - `exponential`: 指数增长 (默认)
- ✅ 可配置基础延迟和最大延迟
- ✅ 任务超时控制
- ✅ 失败回调 (通过事件系统)

### 4. 高级特性
- ✅ 并发控制 (可配置并发任务数)
- ✅ 任务执行间隔控制
- ✅ 事件系统 (created/started/completed/failed/retrying/cancelled)
- ✅ 队列统计信息
- ✅ 任务状态追踪 (pending/running/completed/failed/retrying/cancelled)

---

## 🚀 快速开始

### 导入

```typescript
import { createJobQueue, JobQueuePro } from './src/skills/job-queue-pro-skill';
```

### 基础用法

```typescript
// 创建队列
const queue = createJobQueue();

// 添加任务
queue.enqueue(
  { 
    data: { userId: 123, action: 'send_email' } 
  },
  async (data, attempt) => {
    console.log(`执行任务 (尝试 ${attempt}):`, data);
    await sendEmail(data.userId, data.action);
    return { success: true };
  }
);
```

---

## 📖 详细用法

### 1. 优先级调度

```typescript
// P0 - 紧急任务 (立即执行)
queue.enqueue(
  {
    data: { type: 'critical_alert' },
    priority: 'P0',
    isEmergency: true,
    description: '系统告警',
  },
  async (data) => {
    await sendAlert(data);
  }
);

// P1 - 高优先级
queue.enqueue(
  {
    data: { report: 'daily_sales' },
    priority: 'P1',
    description: '日报生成',
  },
  async (data) => {
    await generateReport(data.report);
  }
);

// P2 - 中等优先级 (默认)
queue.enqueue(
  { data: { task: 'cleanup' } },
  async (data) => {
    await cleanup(data.task);
  }
);

// P3 - 低优先级
queue.enqueue(
  {
    data: { task: 'archive' },
    priority: 'P3',
  },
  async (data) => {
    await archive(data.task);
  }
);
```

### 2. 重试机制

```typescript
// 配置重试：指数退避 (默认)
queue.enqueue(
  {
    data: { url: 'https://api.example.com/data' },
    maxRetries: 5,
    backoffStrategy: 'exponential', // 默认策略
    backoffBaseDelay: 1000,         // 基础延迟 1 秒
    backoffMaxDelay: 30000,         // 最大延迟 30 秒
    timeout: 30000,                 // 任务超时 30 秒
  },
  async (data, attempt) => {
    const response = await fetch(data.url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return response.json();
  }
);

// 固定间隔重试
queue.enqueue(
  {
    data: { task: 'sync_data' },
    maxRetries: 3,
    backoffStrategy: 'fixed',
    backoffBaseDelay: 5000, // 每次重试间隔 5 秒
  },
  async (data, attempt) => {
    await syncData(data.task);
  }
);

// 线性增长重试
queue.enqueue(
  {
    data: { task: 'process_batch' },
    maxRetries: 4,
    backoffStrategy: 'linear',
    backoffBaseDelay: 2000, // 第 1 次 2 秒，第 2 次 4 秒，第 3 次 6 秒...
  },
  async (data, attempt) => {
    await processBatch(data.task);
  }
);
```

### 3. 批量添加任务

```typescript
const tasks = [
  { data: { id: 1, type: 'email' }, priority: 'P1' as Priority },
  { data: { id: 2, type: 'sms' }, priority: 'P2' as Priority },
  { data: { id: 3, type: 'push' }, priority: 'P2' as Priority },
  { data: { id: 4, type: 'webhook' }, priority: 'P3' as Priority },
];

queue.enqueueBatch(tasks, async (data) => {
  switch (data.type) {
    case 'email':
      await sendEmail(data.id);
      break;
    case 'sms':
      await sendSms(data.id);
      break;
    case 'push':
      await sendPush(data.id);
      break;
    case 'webhook':
      await triggerWebhook(data.id);
      break;
  }
  return { processed: data.id };
});
```

### 4. 事件监听

```typescript
// 监听所有事件
queue.onEvent((event) => {
  console.log(`[${event.type}] 任务 ${event.task.id}`);
  
  switch (event.type) {
    case 'created':
      console.log(`  优先级：${event.task.priority}`);
      console.log(`  描述：${event.task.description}`);
      break;
      
    case 'started':
      console.log(`  开始时间：${new Date(event.task.startedAt!).toISOString()}`);
      console.log(`  尝试次数：${event.task.retryCount + 1}`);
      break;
      
    case 'completed':
      console.log(`  结果:`, event.task.result);
      console.log(`  执行时间：${event.task.completedAt! - event.task.startedAt!}ms`);
      break;
      
    case 'failed':
      console.log(`  错误：${event.task.error}`);
      console.log(`  总重试次数：${event.task.retryCount}`);
      break;
      
    case 'retrying':
      console.log(`  第 ${event.task.retryCount} 次重试`);
      console.log(`  下次重试时间：${new Date(event.task.nextRetryAt!).toISOString()}`);
      break;
      
    case 'cancelled':
      console.log(`  任务已取消`);
      break;
  }
});

// 只监听完成事件
queue.onEvent((event) => {
  if (event.type === 'completed') {
    console.log(`✅ 任务完成：${event.task.id}`, event.task.result);
  }
});

// 移除事件监听器
const listener = (event) => console.log(event);
queue.onEvent(listener);
// ...
queue.offEvent(listener);
```

### 5. 并发控制

```typescript
// 创建并发队列
const concurrentQueue = createJobQueue({
  concurrency: 5,           // 同时执行 5 个任务
  executionInterval: 100,   // 任务启动间隔 100ms
  maxQueueSize: 500,
});

// 添加大量任务
for (let i = 0; i < 100; i++) {
  concurrentQueue.enqueue(
    { data: { index: i } },
    async (data) => {
      await processItem(data.index);
    }
  );
}

// 最多同时执行 5 个任务，其余在队列中等待
```

### 6. 队列管理

```typescript
// 获取任务
const task = queue.getTask('job-1234567890-1');
if (task) {
  console.log('任务状态:', task.status);
  console.log('任务优先级:', task.priority);
}

// 获取所有任务
const allTasks = queue.getAllTasks();

// 获取指定状态的任务
const pendingTasks = queue.getTasksByStatus('pending');
const runningTasks = queue.getTasksByStatus('running');
const failedTasks = queue.getTasksByStatus('failed');

// 获取指定优先级的任务
const p0Tasks = queue.getTasksByPriority('P0');

// 获取所有紧急任务
const emergencyTasks = queue.getEmergencyTasks();

// 取消任务
const cancelled = queue.cancelTask('job-1234567890-1');
console.log('取消成功:', cancelled);

// 清空队列 (不影响运行中的任务)
queue.clear();

// 获取队列大小
console.log('队列长度:', queue.size());
console.log('运行中:', queue.runningCount());
console.log('是否为空:', queue.isEmpty());
```

### 7. 队列统计

```typescript
const stats = queue.getStats();

console.log('=== 队列统计 ===');
console.log('总任务数:', stats.totalSize);
console.log('按优先级:', stats.byPriority);
// { P0: 2, P1: 5, P2: 10, P3: 3 }
console.log('按状态:', stats.byStatus);
// { pending: 8, running: 3, completed: 5, failed: 2, retrying: 1, cancelled: 1 }
console.log('紧急任务:', stats.emergencyCount);
console.log('最早任务:', stats.oldestTaskTime);
console.log('最新任务:', stats.newestTaskTime);
console.log('累计完成:', stats.totalCompleted);
console.log('累计失败:', stats.totalFailed);
console.log('累计重试:', stats.totalRetries);
console.log('平均执行时间:', stats.avgExecutionTime, 'ms');
```

### 8. 等待队列完成

```typescript
// 等待所有任务完成 (无限等待)
await queue.waitForCompletion();
console.log('所有任务完成!');

// 等待所有任务完成 (最多等待 60 秒)
try {
  await queue.waitForCompletion(60000);
  console.log('所有任务在 60 秒内完成!');
} catch (error) {
  console.error('等待超时:', error);
}
```

### 9. 暂停/恢复处理

```typescript
// 暂停队列处理
queue.pause();

// 添加任务 (会加入队列但不会执行)
queue.enqueue({ data: { task: 'delayed' } }, async (data) => {
  await process(data);
});

// 恢复队列处理
queue.resume();
// 队列开始执行暂停期间添加的任务
```

### 10. 自定义配置

```typescript
const customQueue = createJobQueue({
  // 队列配置
  maxQueueSize: 500,              // 最大队列长度
  
  // 默认优先级
  defaultPriority: 'P1',          // 默认高优先级
  
  // 默认重试配置
  defaultMaxRetries: 5,           // 默认重试 5 次
  defaultBackoffStrategy: 'linear', // 线性退避
  defaultBackoffBaseDelay: 2000,  // 基础延迟 2 秒
  defaultBackoffMaxDelay: 60000,  // 最大延迟 60 秒
  
  // 并发控制
  concurrency: 3,                 // 同时执行 3 个任务
  executionInterval: 50,          // 任务间隔 50ms
  
  // 紧急插队
  allowEmergencyInsert: true,     // 允许紧急任务插队
});
```

---

## 🎯 实战场景

### 场景 1: API 请求重试

```typescript
const apiQueue = createJobQueue({
  maxRetries: 5,
  backoffStrategy: 'exponential',
  backoffBaseDelay: 1000,
  timeout: 30000,
});

// 添加 API 请求任务
apiQueue.enqueue(
  {
    data: { 
      method: 'GET',
      url: 'https://api.example.com/users',
      headers: { 'Authorization': 'Bearer token' }
    },
    priority: 'P1',
    description: '获取用户列表',
  },
  async (data, attempt) => {
    console.log(`API 请求 (尝试 ${attempt}): ${data.url}`);
    
    const response = await fetch(data.url, {
      method: data.method,
      headers: data.headers,
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return response.json();
  }
);
```

### 场景 2: 邮件发送队列

```typescript
const emailQueue = createJobQueue({
  concurrency: 10,  // 同时发送 10 封邮件
  defaultPriority: 'P2',
  maxRetries: 3,
});

// 批量添加邮件发送任务
const emails = [
  { to: 'user1@example.com', subject: '欢迎', body: '...' },
  { to: 'user2@example.com', subject: '通知', body: '...' },
  // ... 更多邮件
];

emailQueue.enqueueBatch(
  emails.map(email => ({
    data: email,
    priority: email.subject.includes('紧急') ? 'P0' : 'P2' as Priority,
    description: `发送邮件给 ${email.to}`,
  })),
  async (data) => {
    await sendEmail({
      to: data.to,
      subject: data.subject,
      body: data.body,
    });
    return { sent: data.to };
  }
);
```

### 场景 3: 文件处理流水线

```typescript
const fileQueue = createJobQueue({
  concurrency: 5,
  maxRetries: 2,
  backoffStrategy: 'linear',
});

// 文件处理任务
fileQueue.enqueue(
  {
    data: { 
      filePath: '/uploads/document.pdf',
      operations: ['resize', 'compress', 'watermark']
    },
    priority: 'P1',
    timeout: 120000, // 2 分钟超时
  },
  async (data, attempt) => {
    let file = await loadFile(data.filePath);
    
    for (const op of data.operations) {
      switch (op) {
        case 'resize':
          file = await resizeImage(file, 1920, 1080);
          break;
        case 'compress':
          file = await compressImage(file, 0.8);
          break;
        case 'watermark':
          file = await addWatermark(file, '© 2026');
          break;
      }
    }
    
    await saveFile(file, '/processed/document.png');
    return { processed: data.filePath };
  }
);
```

### 场景 4: 数据同步任务

```typescript
const syncQueue = createJobQueue({
  concurrency: 3,
  maxRetries: 5,
  backoffStrategy: 'exponential',
  backoffBaseDelay: 5000, // 5 秒基础延迟
});

// 数据库同步任务
syncQueue.enqueue(
  {
    data: {
      source: 'mysql://primary',
      target: 'postgres://replica',
      tables: ['users', 'orders', 'products'],
    },
    priority: 'P0',
    description: '紧急数据同步',
    isEmergency: true,
  },
  async (data, attempt) => {
    console.log(`同步尝试 ${attempt}: ${data.source} → ${data.target}`);
    
    for (const table of data.tables) {
      const rows = await readFromSource(data.source, table);
      await writeToTarget(data.target, table, rows);
    }
    
    return { synced: data.tables.length };
  }
);
```

### 场景 5: 定时任务调度

```typescript
const cronQueue = createJobQueue({
  concurrency: 1,
  executionInterval: 1000, // 1 秒间隔
});

// 模拟 cron 任务
setInterval(() => {
  cronQueue.enqueue(
    {
      data: { type: 'heartbeat', timestamp: Date.now() },
      priority: 'P3',
      description: '心跳检测',
    },
    async (data) => {
      await reportHeartbeat(data);
    }
  );
}, 60000); // 每分钟添加一个心跳任务
```

---

## 📊 类型定义

### Priority (优先级)

```typescript
type Priority = 'P0' | 'P1' | 'P2' | 'P3';
```

- `P0`: Critical - 紧急任务，立即执行
- `P1`: High - 高优先级任务
- `P2`: Medium - 中等优先级任务 (默认)
- `P3`: Low - 低优先级任务

### TaskStatus (任务状态)

```typescript
type TaskStatus = 
  | 'pending'      // 等待执行
  | 'running'      // 正在执行
  | 'completed'    // 已完成
  | 'failed'       // 失败
  | 'retrying'     // 重试中
  | 'cancelled';   // 已取消
```

### BackoffStrategy (退避策略)

```typescript
type BackoffStrategy = 
  | 'fixed'        // 固定间隔
  | 'linear'       // 线性增长
  | 'exponential'; // 指数增长 (默认)
```

### TaskConfig (任务配置)

```typescript
interface TaskConfig<T = any> {
  data: T;                          // 任务数据
  priority?: Priority;              // 优先级 (默认: P2)
  isEmergency?: boolean;            // 是否紧急插队 (默认: false)
  description?: string;             // 任务描述
  timeout?: number;                 // 超时时间 (毫秒)
  maxRetries?: number;              // 最大重试次数 (默认: 3)
  backoffStrategy?: BackoffStrategy;// 退避策略 (默认: exponential)
  backoffBaseDelay?: number;        // 基础延迟 (默认: 1000ms)
  backoffMaxDelay?: number;         // 最大延迟 (默认: 30000ms)
  metadata?: Record<string, any>;   // 元数据
}
```

### QueueConfig (队列配置)

```typescript
interface QueueConfig {
  maxQueueSize: number;             // 最大队列长度 (默认: 1000)
  defaultPriority: Priority;        // 默认优先级 (默认: P2)
  defaultMaxRetries: number;        // 默认重试次数 (默认: 3)
  defaultBackoffStrategy: BackoffStrategy; // 默认退避策略 (默认: exponential)
  defaultBackoffBaseDelay: number;  // 默认基础延迟 (默认: 1000ms)
  defaultBackoffMaxDelay: number;   // 默认最大延迟 (默认: 30000ms)
  allowEmergencyInsert: boolean;    // 允许紧急插队 (默认: true)
  concurrency: number;              // 并发数 (默认: 1)
  executionInterval: number;        // 执行间隔 (默认: 0)
}
```

---

## ⚠️ 注意事项

1. **内存管理**: 队列会保存所有任务的历史记录，长时间运行的应用应定期清理已完成/失败的任务
2. **并发控制**: 高并发可能导致资源竞争，根据系统能力合理设置 `concurrency`
3. **重试策略**: 过多的重试可能导致雪崩效应，建议配合熔断器使用
4. **超时设置**: 为长时间运行的任务设置合理的 `timeout`，避免任务卡死
5. **事件监听**: 事件监听器中的错误不会影响队列运行，但应妥善处理避免内存泄漏

---

## 🎯 最佳实践

1. **为关键任务设置 P0 优先级和紧急标志**
2. **外部 API 调用配置指数退避重试**
3. **批量任务使用批量添加 API**
4. **生产环境添加完整的事件监听和日志记录**
5. **定期监控队列统计信息，及时发现异常**

---

## 🔧 扩展建议

- 集成持久化存储 (Redis/数据库)
- 添加任务依赖关系支持
- 实现任务优先级动态调整
- 添加队列监控和告警
- 集成分布式队列支持

---

**最后更新:** 2026-03-13  
**维护者:** Axon (KAEL Engineering)
