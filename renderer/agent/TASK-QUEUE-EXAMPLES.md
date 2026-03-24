# TaskQueue 使用示例

## 快速开始

```typescript
import { TaskQueue } from './task-queue';

const queue = new TaskQueue();
```

## 基础操作

### 1. 添加任务

```typescript
// 添加一个 P1 优先级的任务
queue.enqueue({
  id: 'task-001',
  label: '处理用户请求',
  priority: 'P1',
  status: 'pending',
  assignedTo: 'worker-A', // 可选
});
```

### 2. 获取下一个任务

```typescript
// 自动按优先级出队 (P0 > P1 > P2)
const nextTask = queue.dequeue();

if (nextTask) {
  console.log(`Processing: ${nextTask.label}`);
  // 任务状态自动变为 'running'
}
```

### 3. 查询任务状态

```typescript
const task = queue.getStatus('task-001');
if (task) {
  console.log(`Status: ${task.status}`);
  console.log(`Priority: ${task.priority}`);
  console.log(`Assigned to: ${task.assignedTo}`);
}
```

### 4. 更新任务状态

```typescript
// 完成任务
queue.updateStatus('task-001', 'done');

// 标记失败
queue.updateStatus('task-002', 'failed', '错误信息');
```

### 5. 列表查询

```typescript
// 获取所有任务
const all = queue.list();

// 按状态过滤
const pending = queue.list({ status: 'pending' });

// 按优先级过滤
const urgent = queue.list({ priority: 'P0' });

// 按执行者过滤
const myTasks = queue.list({ assignedTo: 'worker-A' });

// 组合过滤
const myPendingP0 = queue.list({ 
  status: 'pending', 
  priority: 'P0',
  assignedTo: 'worker-A'
});
```

## 进阶用法

### 任务分配

```typescript
// 分配任务给特定执行者
queue.assign('task-001', 'worker-A');

// 查询某个执行者的所有任务
const workerTasks = queue.list({ assignedTo: 'worker-A' });
```

### 错误处理与重试

```typescript
const task = queue.dequeue();
if (task) {
  try {
    await processTask(task);
    queue.updateStatus(task.id, 'done');
  } catch (error) {
    queue.updateStatus(task.id, 'failed', error.message);
    
    // 重试逻辑
    if (shouldRetry(task)) {
      queue.requeue(task.id);
    }
  }
}
```

### 清理已完成任务

```typescript
// 删除所有已完成/失败的任务
const removedCount = queue.clearCompleted();
console.log(`Cleared ${removedCount} tasks`);
```

### 获取统计信息

```typescript
const stats = queue.getStats();
console.log(stats);
// {
//   total: 10,
//   pending: 3,
//   running: 2,
//   done: 4,
//   failed: 1,
//   byPriority: { P0: 2, P1: 5, P2: 3 }
// }
```

## 优先级说明

- **P0**: 最高优先级 (紧急任务)
- **P1**: 中等优先级 (常规任务)
- **P2**: 最低优先级 (后台任务)

同优先级任务按创建时间 FIFO 排序。

## 任务状态流转

```
pending → running → done
              ↓
            failed → (requeue) → pending
```

## 完整示例

```typescript
import { TaskQueue } from './task-queue';

async function workerLoop(queue: TaskQueue, workerId: string) {
  while (true) {
    // 获取下一个任务
    const task = queue.dequeue();
    if (!task) {
      // 没有任务，等待
      await sleep(1000);
      continue;
    }

    // 分配给自己
    queue.assign(task.id, workerId);

    try {
      // 执行任务
      await executeTask(task);
      queue.updateStatus(task.id, 'done');
      console.log(`✅ Completed: ${task.label}`);
    } catch (error) {
      console.error(`❌ Failed: ${task.label}`, error);
      queue.updateStatus(task.id, 'failed', error.message);
      
      // 可选：自动重试
      // queue.requeue(task.id);
    }
  }
}

// 使用示例
const queue = new TaskQueue();

// 添加一些任务
queue.enqueue({ id: '1', label: '紧急修复', priority: 'P0', status: 'pending' });
queue.enqueue({ id: '2', label: '数据同步', priority: 'P1', status: 'pending' });
queue.enqueue({ id: '3', label: '日志清理', priority: 'P2', status: 'pending' });

// 启动工作线程
workerLoop(queue, 'worker-1');
```

## API 参考

### TaskQueue 类

| 方法 | 参数 | 返回值 | 说明 |
|------|------|--------|------|
| `enqueue(task)` | `Omit<Task, 'createdAt'>` | `Task` | 添加任务 |
| `dequeue()` | - | `Task \| null` | 获取下一个任务 |
| `getStatus(id)` | `string` | `Task \| undefined` | 查询状态 |
| `list(filters?)` | `TaskFilters` | `Task[]` | 列表查询 |
| `updateStatus(id, status, error?)` | `string, Task['status'], string?` | `Task \| null` | 更新状态 |
| `assign(id, worker)` | `string, string` | `Task \| null` | 分配任务 |
| `delete(id)` | `string` | `boolean` | 删除任务 |
| `clearCompleted()` | - | `number` | 清理已完成任务 |
| `requeue(id)` | `string` | `Task \| null` | 重新入队 |
| `getStats()` | - | `Stats` | 获取统计 |

### Task 接口

```typescript
interface Task {
  id: string;
  label: string;
  priority: 'P0' | 'P1' | 'P2';
  status: 'pending' | 'running' | 'done' | 'failed';
  assignedTo?: string;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  error?: string;
}
```

### TaskFilters 接口

```typescript
interface TaskFilters {
  status?: Task['status'];
  priority?: Task['priority'];
  assignedTo?: string;
  label?: string; // 支持子字符串匹配
}
```
