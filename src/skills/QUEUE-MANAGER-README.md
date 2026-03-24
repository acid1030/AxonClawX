# Queue Manager - 消息队列管理工具

**版本:** 1.0.0  
**作者:** Axon (KAEL Subagent)  
**交付时间:** 2026-03-13

---

## 📦 功能概述

提供三种类型的内存队列：

1. **内存队列 (FIFO)** - 先进先出的基础队列
2. **优先级队列** - 按优先级排序，相同优先级保持稳定
3. **延迟队列** - 支持延迟执行，自动触发回调

---

## 🚀 快速开始

### 安装

无需安装，直接使用：

```typescript
import {
  MemoryQueue,
  PriorityQueue,
  DelayQueue,
  QueueManager,
} from './src/skills/queue-manager-skill';
```

### 基础用法

#### 1. 内存队列 (FIFO)

```typescript
const queue = new MemoryQueue<string>({
  name: 'tasks',
  maxSize: 100,
});

// 入队
queue.enqueue('Task 1');
queue.enqueue('Task 2');

// 出队
const task = queue.dequeue();

// 统计
const stats = queue.getStats();
```

#### 2. 优先级队列

```typescript
const priorityQueue = new PriorityQueue<Task>({
  name: 'urgent-tasks',
});

// 入队 (优先级数字越小越优先)
priorityQueue.enqueue(task1, 1); // 高优先级
priorityQueue.enqueue(task2, 5); // 普通优先级
priorityQueue.enqueue(task3, 3); // 中等优先级

// 出队 (按优先级顺序)
const urgent = priorityQueue.dequeue();
```

#### 3. 延迟队列

```typescript
const delayQueue = new DelayQueue<ScheduledTask>({
  name: 'scheduled-tasks',
  checkInterval: 1000, // 每秒检查
});

// 延迟执行 (5 秒后)
delayQueue.enqueueDelayed(task, 5000);

// 启动自动处理
delayQueue.start(async (task) => {
  await executeTask(task);
});

// 停止
delayQueue.stop();
```

---

## 📚 API 文档

### MemoryQueue<T>

基础内存队列类。

#### 构造函数

```typescript
new MemoryQueue<T>(options?: QueueOptions)
```

**Options:**
- `name?: string` - 队列名称
- `maxSize?: number` - 最大长度 (0 表示无限制)

#### 方法

| 方法 | 描述 | 返回值 |
|------|------|--------|
| `enqueue(item: T)` | 入队 | `boolean` 是否成功 |
| `dequeue()` | 出队 | `T \| undefined` |
| `peek()` | 查看队首 | `T \| undefined` |
| `clear()` | 清空队列 | `void` |
| `size` | 队列长度 | `number` |
| `isEmpty()` | 是否为空 | `boolean` |
| `getStats()` | 统计信息 | `QueueStats` |
| `toArray()` | 转为数组 | `T[]` |

---

### PriorityQueue<T>

优先级队列类，继承自 MemoryQueue。

#### 构造函数

```typescript
new PriorityQueue<T>(options?: QueueOptions)
```

#### 方法

| 方法 | 描述 | 返回值 |
|------|------|--------|
| `enqueue(data: T, priority: number)` | 入队 (带优先级) | `boolean` |
| `dequeue()` | 出队 (最高优先级) | `PriorityItem<T> \| undefined` |
| `peek()` | 查看队首 | `PriorityItem<T> \| undefined` |
| `toArray()` | 按优先级排序 | `PriorityItem<T>[]` |

**PriorityItem 结构:**
```typescript
interface PriorityItem<T> {
  data: T;           // 数据
  priority: number;  // 优先级
  timestamp: number; // 时间戳
  id: string;        // 唯一 ID
}
```

**注意:** 优先级数字越小，优先级越高。相同优先级按入队顺序排序。

---

### DelayQueue<T>

延迟队列类，继承自 MemoryQueue。

#### 构造函数

```typescript
new DelayQueue<T>(options?: DelayQueueOptions)
```

**Options:**
- `name?: string` - 队列名称
- `maxSize?: number` - 最大长度
- `checkInterval?: number` - 检查间隔 (毫秒，默认 1000)

#### 方法

| 方法 | 描述 | 返回值 |
|------|------|--------|
| `enqueueDelayed(data: T, delayMs: number)` | 延迟入队 | `boolean` |
| `enqueue(data: T)` | 立即入队 | `boolean` |
| `dequeue()` | 出队 (仅已到期) | `DelayItem<T> \| undefined` |
| `peek()` | 查看最早到期 | `DelayItem<T> \| undefined` |
| `getReadyItems()` | 获取已到期 | `DelayItem<T>[]` |
| `getPendingItems()` | 获取未到期 | `DelayItem<T>[]` |
| `start(callback)` | 启动自动处理 | `void` |
| `stop()` | 停止自动处理 | `void` |
| `getNextDelay()` | 下次延迟时间 | `number` |

**DelayItem 结构:**
```typescript
interface DelayItem<T> {
  data: T;          // 数据
  executeAt: number; // 执行时间戳
  id: string;       // 唯一 ID
}
```

---

### QueueManager

统一管理多个队列。

#### 构造函数

```typescript
new QueueManager(options?: QueueManagerOptions)
```

**Options:**
- `defaultType?: 'fifo' | 'priority' | 'delay'` - 默认队列类型
- `delayCheckInterval?: number` - 延迟队列检查间隔

#### 方法

| 方法 | 描述 | 返回值 |
|------|------|--------|
| `createQueue<T>(name, type?, maxSize?)` | 创建队列 | 队列实例 |
| `getQueue<T>(name)` | 获取队列 | 队列实例 \| undefined |
| `deleteQueue(name)` | 删除队列 | `boolean` |
| `listQueues()` | 列出所有队列 | `QueueInfo[]` |
| `getStats()` | 全局统计 | `GlobalStats` |
| `clearAll()` | 清空所有队列 | `void` |

---

## 📊 统计信息

### QueueStats

```typescript
interface QueueStats {
  enqueues: number;   // 入队次数
  dequeues: number;   // 出队次数
  size: number;       // 当前长度
  peakSize: number;   // 峰值长度
  dropped: number;    // 丢弃次数 (超出 maxSize)
}
```

---

## 🎯 使用场景

### 1. 任务调度系统

```typescript
const taskQueue = new PriorityQueue<Task>();

// 添加任务
taskQueue.enqueue(criticalBug, 1);
taskQueue.enqueue(feature, 5);
taskQueue.enqueue(docs, 7);

// 按优先级处理
while (!taskQueue.isEmpty()) {
  const task = taskQueue.dequeue();
  await processTask(task);
}
```

### 2. 消息通知系统

```typescript
const notificationQueue = new MemoryQueue<Notification>({
  maxSize: 1000,
});

// 批量发送
notificationQueue.enqueue(welcomeEmail);
notificationQueue.enqueue(passwordReset);

// 异步处理
setInterval(async () => {
  const notification = notificationQueue.dequeue();
  if (notification) {
    await sendNotification(notification);
  }
}, 100);
```

### 3. 定时任务系统

```typescript
const scheduler = new DelayQueue<ScheduledJob>({
  checkInterval: 1000,
});

// 调度任务
scheduler.enqueueDelayed(dailyBackup, 86400000); // 24 小时后
scheduler.enqueueDelayed(hourlySync, 3600000);   // 1 小时后

// 自动执行
scheduler.start(async (job) => {
  await job.execute();
});
```

### 4. 请求限流

```typescript
const rateLimitQueue = new MemoryQueue<Request>({
  maxSize: 100,
});

// 添加请求
const accepted = rateLimitQueue.enqueue(request);
if (!accepted) {
  // 队列已满，返回 429
  return response.status(429).send('Too Many Requests');
}
```

---

## ⚠️ 注意事项

1. **内存限制** - 所有队列都在内存中，不适合持久化存储
2. **单进程** - 队列数据不跨进程共享
3. **优先级队列性能** - 出队操作 O(n)，适合中小规模队列
4. **延迟队列精度** - 实际执行时间可能有 checkInterval 的误差
5. **错误处理** - 自动处理回调中的错误会被捕获并打印，不会中断队列

---

## 🔧 扩展建议

### 1. 添加持久化

```typescript
class PersistentQueue<T> extends MemoryQueue<T> {
  async save() {
    await fs.writeFile('queue.json', JSON.stringify(this.toArray()));
  }
  
  async load() {
    const data = await fs.readFile('queue.json');
    data.forEach(item => this.enqueue(item));
  }
}
```

### 2. 添加重试机制

```typescript
class RetryQueue<T> extends DelayQueue<T> {
  private retryCounts = new Map<string, number>();
  
  async enqueueWithRetry(item: T, maxRetries: number, delayMs: number) {
    const id = generateId();
    this.retryCounts.set(id, maxRetries);
    return this.enqueueDelayed({ ...item, id }, delayMs);
  }
}
```

### 3. 添加监控

```typescript
class MonitoredQueue<T> extends MemoryQueue<T> {
  onEnqueue?: (item: T) => void;
  onDequeue?: (item: T) => void;
  
  enqueue(item: T) {
    const result = super.enqueue(item);
    this.onEnqueue?.(item);
    return result;
  }
}
```

---

## 📝 示例代码

完整示例请查看: `queue-manager-skill.examples.ts`

---

## ✅ 交付清单

- [x] `src/skills/queue-manager-skill.ts` - 核心实现
- [x] `src/skills/queue-manager-skill.examples.ts` - 使用示例
- [x] `src/skills/QUEUE-MANAGER-README.md` - 本文档

---

**交付完成时间:** 5 分钟内  
**执行者:** KAEL Subagent
