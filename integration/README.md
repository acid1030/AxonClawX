# 任务队列与调度器集成

AxonClaw 核心组件 - 负责任务队列管理和多 Agent 调度。

## 📦 组件结构

```
src/integration/
├── queue-scheduler.ts    # 核心实现
└── README.md             # 本文档
```

## 🎯 核心功能

### 1. 任务队列 (TaskQueue)
- **优先级队列**: 支持 critical > high > medium > low
- **FIFO 顺序**: 同优先级按创建时间排序
- **状态管理**: pending → processing → completed/failed
- **任务追踪**: 完整的任务生命周期记录

### 2. 调度器 (Scheduler)
- **Agent 管理**: 注册/注销 Agent，跟踪状态 (idle/busy/offline)
- **任务分配**: 自动分配任务给空闲 Agent
- **事件系统**: taskCompleted, taskFailed 事件通知
- **状态监控**: 实时查看 Agent 和任务状态

### 3. 集成层 (QueueSchedulerIntegration)
- **自动调度**: 调度器监听队列，自动出队并分配
- **任务完成回调**: 任务完成后触发下一个任务处理
- **可配置轮询**: 自定义队列检查间隔
- **批量处理**: 支持高并发任务处理

## 🚀 快速开始

### 基础使用

```typescript
import { createQueueSchedulerIntegration } from './integration/queue-scheduler';
import { Task } from './types';

// 1. 创建集成实例
const integration = createQueueSchedulerIntegration();

// 2. 注册 Agent
integration.getScheduler().registerAgent(myAgent);

// 3. 提交任务
integration.submitTask({
  type: 'code_generation',
  description: '创建用户登录 API',
  priority: 'high'
});

// 4. 启动调度器
integration.start(100); // 每 100ms 检查一次队列

// 5. 等待任务完成
await new Promise(resolve => setTimeout(resolve, 1000));

// 6. 停止并清理
integration.stop();
integration.shutdown();
```

### 监听事件

```typescript
// 监听任务完成
integration.getScheduler().on('taskCompleted', (data) => {
  console.log(`任务完成：${data.taskId}`);
  console.log(`执行 Agent: ${data.agentId}`);
  console.log(`结果：${data.result.message}`);
});

// 监听任务失败
integration.getScheduler().on('taskFailed', (data) => {
  console.error(`任务失败：${data.taskId}`);
  console.error(`错误：${data.error.message}`);
});
```

### 手动控制

```typescript
import { TaskQueue, Scheduler } from './integration/queue-scheduler';

// 分别创建队列和调度器
const queue = new TaskQueue();
const scheduler = new Scheduler();

// 手动入队
const taskId = queue.enqueue({
  type: 'code_generation',
  description: '手动任务',
  priority: 'medium'
});

// 手动出队并分配
const nextTask = queue.dequeue();
if (nextTask) {
  const agent = scheduler.getIdleAgent();
  if (agent && agent.canHandle(nextTask.task)) {
    await scheduler.assignTask(agent, nextTask);
    queue.updateTaskStatus(nextTask.id, 'completed');
  }
}
```

## 📊 API 参考

### TaskQueue

| 方法 | 说明 | 返回值 |
|------|------|--------|
| `enqueue(task, priority?)` | 入队任务 | taskId: string |
| `dequeue()` | 出队最高优先级任务 | QueuedTask \| null |
| `getTask(taskId)` | 获取任务 | QueuedTask \| undefined |
| `updateTaskStatus(id, status, result?, agentId?)` | 更新任务状态 | void |
| `getPendingCount()` | 获取待处理任务数 | number |
| `getStatus()` | 获取队列统计 | QueueStatus |
| `getAllTasks()` | 获取所有任务 | QueuedTask[] |
| `clear()` | 清空队列 | void |

### Scheduler

| 方法 | 说明 | 返回值 |
|------|------|--------|
| `registerAgent(agent)` | 注册 Agent | void |
| `unregisterAgent(agentId)` | 注销 Agent | void |
| `getIdleAgent()` | 获取空闲 Agent | Agent \| null |
| `assignTask(agent, queuedTask)` | 分配任务给 Agent | Promise<TaskResult> |
| `setAgentStatus(id, status)` | 设置 Agent 状态 | void |
| `getAgentStatus(id)` | 获取 Agent 状态 | AgentStatus |
| `on(event, callback)` | 注册事件监听 | void |
| `off(event, callback)` | 移除事件监听 | void |
| `getStatus()` | 获取调度器统计 | SchedulerStatus |
| `shutdown()` | 关闭调度器 | void |

### QueueSchedulerIntegration

| 方法 | 说明 | 返回值 |
|------|------|--------|
| `submitTask(task, priority?)` | 提交任务到队列 | taskId: string |
| `start(intervalMs?)` | 启动调度器 | void |
| `stop()` | 停止调度器 | void |
| `getStatus()` | 获取系统状态 | SystemStatus |
| `getQueue()` | 获取队列实例 | TaskQueue |
| `getScheduler()` | 获取调度器实例 | Scheduler |
| `shutdown()` | 关闭整个系统 | void |

## 🏗️ 架构设计

```
┌─────────────────────────────────────────────────────┐
│           QueueSchedulerIntegration                 │
│  ┌──────────────────┐     ┌─────────────────────┐  │
│  │   TaskQueue      │     │     Scheduler       │  │
│  │                  │     │                     │  │
│  │  ┌────────────┐  │     │  ┌───────────────┐  │  │
│  │  │ task-1     │  │     │  │ Agent-1 (idle)│  │  │
│  │  │ task-2     │  │     │  │ Agent-2 (busy)│  │  │
│  │  │ task-3     │  │     │  │ Agent-3 (idle)│  │  │
│  │  └────────────┘  │     │  └───────────────┘  │  │
│  │    Priority Queue│     │   Agent Pool        │  │
│  └──────────────────┘     └─────────────────────┘  │
│           ↓                        ↑                │
│           └────────────────────────┘                │
│              自动调度 (taskCompleted 事件)           │
└─────────────────────────────────────────────────────┘
```

## 🧪 运行测试

```bash
# 运行所有测试
npm test

# 只运行队列调度器测试
npx vitest run test/integration/queue-scheduler.test.ts

# 监视模式
npx vitest test/integration/queue-scheduler.test.ts
```

## 📝 使用示例

查看完整示例：[`examples/queue-scheduler-usage.ts`](../../examples/queue-scheduler-usage.ts)

示例场景:
- ✅ 基础使用
- ✅ 事件监听
- ✅ 手动控制
- ✅ 批量任务处理

## ⚠️ 注意事项

1. **Agent 能力匹配**: 确保 Agent 的 `canHandle()` 方法正确实现
2. **任务类型**: 提交任务时确保有 Agent 能处理该类型
3. **资源清理**: 使用完毕后调用 `shutdown()` 释放资源
4. **错误处理**: 监听 `taskFailed` 事件处理失败任务
5. **并发控制**: 多个 Agent 同时处理时注意状态同步

## 🔧 扩展

### 自定义 Agent

```typescript
import { BaseAgent, Task, TaskResult } from '../types';

class MyCustomAgent extends BaseAgent {
  constructor() {
    super('my-agent', '我的自定义 Agent');
  }

  canHandle(task: Task): boolean {
    return task.type === 'code_generation';
  }

  async execute(task: Task): Promise<TaskResult> {
    // 实现任务逻辑
    return {
      status: 'success',
      message: '任务完成',
      data: { /* 结果数据 */ }
    };
  }
}
```

### 自定义事件

```typescript
// 扩展 Scheduler 添加自定义事件
scheduler.on('taskCompleted', (data) => {
  // 发送通知
  // 记录日志
  // 触发下游任务
});
```

---

**最后更新**: 2026-03-13  
**维护者**: AxonClaw Team
