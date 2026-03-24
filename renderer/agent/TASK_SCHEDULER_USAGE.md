# Task Scheduler 使用指南 (精简版)

自动任务再分配调度器 - 监听任务完成，检测空闲 Agent，自动分配新任务。

## 快速开始

### 1. 基础使用

```typescript
import { TaskScheduler, TaskPriority, AgentType } from './task-scheduler';

// 创建调度器实例
const scheduler = new TaskScheduler({
  idleWarningThreshold: 60000,    // 1 分钟后警告
  idleCriticalThreshold: 300000,  // 5 分钟后严重警告
  pollInterval: 5000              // 每 5 秒检查一次
});

// 启动调度器
scheduler.start();
```

### 2. 注册 Agent

```typescript
// 注册 Agent
scheduler.registerAgent({
  id: 'aria-1',
  name: 'ARIA-1',
  type: AgentType.ARIA
});

scheduler.registerAgent({
  id: 'ace-1',
  name: 'ACE-1',
  type: AgentType.ACE
});
```

### 3. 添加任务

```typescript
// 添加单个任务
scheduler.addTask({
  title: '实现登录功能',
  description: '完成用户登录页面的开发',
  priority: TaskPriority.P0,  // P0 最高优先级
  agentType: AgentType.ARIA
});

// 批量添加任务
scheduler.addTasks([
  {
    title: '编写测试用例',
    description: '为登录功能编写单元测试',
    priority: TaskPriority.P1,
    agentType: AgentType.ACE
  },
  {
    title: '优化性能',
    description: '优化页面加载速度',
    priority: TaskPriority.P2
  }
]);
```

### 4. 监听任务完成

```typescript
// 当收到系统消息时，解析并通知调度器
const systemMessage = '[System Message] A subagent task "task-123-abc" just completed';
const parsed = TaskScheduler.parseSystemMessage(systemMessage);

if (parsed) {
  // 通知调度器任务已完成
  scheduler.onTaskCompleted(parsed.taskId, 'aria-1', { success: true });
}
```

### 5. 监听事件

```typescript
// 监听任务分配
scheduler.on('task:assigned', ({ task, agent }) => {
  console.log(`任务 "${task.title}" 已分配给 ${agent.name}`);
});

// 监听任务完成
scheduler.on('task:completed', ({ taskId, agentId, result }) => {
  console.log(`任务 ${taskId} 由 ${agentId} 完成`);
});

// 监听 Agent 空闲警告
scheduler.on('agent:warning', ({ agentId, name, idleTime, message }) => {
  console.warn(`⚠️ ${message}`);
});

// 监听 Agent 严重空闲
scheduler.on('agent:critical', ({ agentId, name, idleTime, message }) => {
  console.error(`🚨 ${message}`);
});
```

### 6. 查询状态

```typescript
// 获取调度器状态
const status = scheduler.getStatus();
console.log(status);
// {
//   totalTasks: 10,
//   pendingTasks: 3,
//   assignedTasks: 2,
//   completedTasks: 5,
//   totalAgents: 4,
//   busyAgents: 2,
//   idleAgents: 2
// }

// 获取所有任务
const tasks = scheduler.getTasks();

// 获取所有 Agent
const agents = scheduler.getAgents();
```

## 完整示例

```typescript
import { TaskScheduler, TaskPriority, AgentType } from './task-scheduler';

async function main() {
  // 1. 创建调度器
  const scheduler = new TaskScheduler();
  
  // 2. 设置事件监听
  scheduler.on('task:assigned', ({ task, agent }) => {
    console.log(`✅ ${task.title} → ${agent.name}`);
  });
  
  scheduler.on('agent:warning', ({ name, message }) => {
    console.warn(`⚠️ ${message}`);
  });
  
  // 3. 启动调度器
  scheduler.start();
  
  // 4. 注册 Agent
  scheduler.registerAgent({ id: 'aria-1', name: 'ARIA-1', type: AgentType.ARIA });
  scheduler.registerAgent({ id: 'aria-2', name: 'ARIA-2', type: AgentType.ARIA });
  scheduler.registerAgent({ id: 'ace-1', name: 'ACE-1', type: AgentType.ACE });
  
  // 5. 添加任务
  scheduler.addTask({
    title: '实现用户注册',
    description: '完成注册页面',
    priority: TaskPriority.P0,
    agentType: AgentType.ARIA
  });
  
  scheduler.addTask({
    title: '编写测试',
    description: '单元测试',
    priority: TaskPriority.P1,
    agentType: AgentType.ACE
  });
  
  // 6. 模拟任务完成 (实际使用时由系统消息触发)
  setTimeout(() => {
    const tasks = scheduler.getTasks();
    const completedTask = tasks.find(t => t.status === 'assigned');
    
    if (completedTask && completedTask.assignedTo) {
      scheduler.onTaskCompleted(completedTask.id, completedTask.assignedTo);
    }
  }, 3000);
  
  // 7. 运行一段时间后停止
  setTimeout(() => {
    scheduler.stop();
    console.log('调度器已停止');
    console.log('最终状态:', scheduler.getStatus());
  }, 10000);
}

main();
```

## 与系统集成

### 监听系统消息

```typescript
// 在你的消息处理逻辑中
function handleSystemMessage(message: string) {
  const parsed = TaskScheduler.parseSystemMessage(message);
  
  if (parsed) {
    // 需要从消息中提取或查找 agentId
    const agentId = extractAgentIdFromContext(message);
    scheduler.onTaskCompleted(parsed.taskId, agentId);
  }
}
```

### 自动任务分配流程

```
1. Agent 完成任务
   ↓
2. 系统发送消息：[System Message] A subagent task "XXX" just completed
   ↓
3. 解析消息，调用 scheduler.onTaskCompleted()
   ↓
4. 调度器释放 Agent (状态变为 IDLE)
   ↓
5. 调度器检查任务队列
   ↓
6. 如果有待分配任务，自动分配给空闲 Agent
   ↓
7. 触发 'task:assigned' 事件
```

## API 参考

### TaskScheduler

| 方法 | 说明 |
|------|------|
| `start()` | 启动调度器 |
| `stop()` | 停止调度器 |
| `addTask(task)` | 添加单个任务 |
| `addTasks(tasks)` | 批量添加任务 |
| `registerAgent(agent)` | 注册 Agent |
| `unregisterAgent(id)` | 注销 Agent |
| `onTaskCompleted(taskId, agentId, result)` | 通知任务完成 |
| `getTasks()` | 获取所有任务 |
| `getAgents()` | 获取所有 Agent |
| `getStatus()` | 获取调度器状态 |
| `parseSystemMessage(msg)` | 解析系统消息 (静态方法) |

### 事件

| 事件 | 说明 |
|------|------|
| `task:assigned` | 任务已分配 |
| `task:completed` | 任务已完成 |
| `task:added` | 任务已添加 |
| `agent:registered` | Agent 已注册 |
| `agent:unregistered` | Agent 已注销 |
| `agent:warning` | Agent 空闲警告 (>1min) |
| `agent:critical` | Agent 空闲严重警告 (>5min) |
| `started` | 调度器已启动 |
| `stopped` | 调度器已停止 |

## 配置选项

```typescript
interface SchedulerConfig {
  idleWarningThreshold: number;    // 空闲警告阈值 (毫秒)，默认 60000
  idleCriticalThreshold: number;   // 空闲严重警告阈值 (毫秒)，默认 300000
  pollInterval: number;            // 轮询间隔 (毫秒)，默认 5000
}
```

## 注意事项

1. **精简版特性**:
   - ✅ 基础任务监听 + 分配
   - ✅ 空闲 Agent 检测
   - ✅ 简单优先级系统 (P0/P1/P2)
   - ❌ 无复杂依赖管理
   - ❌ 无持久化
   - ❌ 无技能匹配

2. **内存管理**: 任务和数据仅保存在内存中，重启后丢失

3. **线程安全**: 单线程环境设计，不适合并发修改

4. **错误处理**: 基础错误返回，建议在外层添加 try-catch
