# Task Scheduler 使用文档

**版本:** 1.0  
**创建时间:** 2026-03-13  
**作者:** Axon  
**状态:** ✅ 完成

---

## 📋 概述

Task Scheduler 是 AxonClaw 的自动任务再分配调度器，负责：

1. **任务完成监听** - 监听 subagent 任务完成事件
2. **空闲 Agent 检测** - 自动检测并警告空闲 Agent
3. **任务队列管理** - 维护优先级任务队列
4. **智能调度** - 技能匹配 + 负载均衡

---

## 🚀 快速开始

### 1. 基础使用

```typescript
import { TaskScheduler, TaskPriority, AgentType, TaskStatus } from './agent/task-scheduler';

// 创建调度器实例
const scheduler = new TaskScheduler({
  pollInterval: 5000,           // 5 秒轮询一次
  enableSkillMatching: true,    // 启用技能匹配
  enableLoadBalancing: true     // 启用负载均衡
});

// 启动调度器
scheduler.start();
```

### 2. 注册 Agent

```typescript
import { TaskScheduler } from './agent/task-scheduler';

const agent = TaskScheduler.createAgent(
  'aria-1',           // Agent ID
  'ARIA-1',           // 显示名称
  AgentType.ARIA,     // Agent 类型
  ['typescript', 'react'] // 技能标签
);

scheduler.registerAgent(agent);
```

### 3. 添加任务

```typescript
const task = TaskScheduler.createTask(
  '实现用户登录功能',           // 任务标题
  '实现完整的用户登录流程',     // 任务描述
  TaskPriority.P0_CORE,         // 优先级
  AgentType.ARIA,               // 需要的 Agent 类型
  ['task-123'],                 // 依赖的任务 ID (可选)
  30                            // 预计耗时 (分钟)
);

scheduler.addTask(task);
```

### 4. 监听任务完成

```typescript
// 监听系统消息 (来自主 Agent)
process.on('message', (message) => {
  const parsed = TaskScheduler.parseSystemMessage(message);
  if (parsed) {
    // 找到执行该任务的 Agent
    const agent = findAgentByTaskId(parsed.taskId);
    if (agent) {
      scheduler.onTaskCompleted(parsed.taskId, agent.id);
    }
  }
});
```

---

## 📊 核心功能

### 1. 任务完成监听

当收到系统消息 `[System Message] A subagent task "XXX" just completed` 时：

```typescript
// 解析消息
const parsed = TaskScheduler.parseSystemMessage(message);
if (parsed) {
  console.log(`任务 ${parsed.taskId} 已完成`);
  
  // 触发再分配逻辑
  scheduler.onTaskCompleted(parsed.taskId, agentId, result);
}
```

**自动执行:**
- ✅ 更新任务状态为 COMPLETED
- ✅ 标记 Agent 为空闲
- ✅ 触发新任务分配
- ✅ 发出 `task:completed` 事件

---

### 2. 空闲 Agent 检测

调度器自动检测 Agent 空闲状态：

| 状态 | 阈值 | 触发事件 |
|------|------|----------|
| ⚠️ WARNING | > 1 分钟 | `agent:warning` |
| 🚨 CRITICAL | > 5 分钟 | `agent:critical` |
| 💥 ACCIDENT | > 15 分钟 | `agent:accident` |

```typescript
// 监听空闲警告
scheduler.on('agent:warning', ({ agentId, name, idleTime, message }) => {
  console.warn(`警告：${message}`);
  // 可以发送邮件/通知
});

scheduler.on('agent:critical', ({ agentId, name, idleTime, message }) => {
  console.error(`严重：${message}`);
  // 升级通知
});

scheduler.on('agent:accident', ({ agentId, name, idleTime, message }) => {
  console.error(`事故：${message}`);
  // 立即干预
});
```

---

### 3. 任务队列管理

#### 优先级定义

```typescript
enum TaskPriority {
  P0_BLOCKING = 'P0_BLOCKING',    // 阻塞性任务 (最高)
  P0_CORE = 'P0_CORE',            // 核心任务
  P1_IMPORTANT = 'P1_IMPORTANT',  // 重要任务
  P2_OPTIMIZATION = 'P2',         // 优化任务
  P3_OPTIONAL = 'P3'              // 可选任务
}
```

#### 任务依赖

```typescript
// task2 依赖 task1 完成
const task1 = TaskScheduler.createTask('Task 1', '...', TaskPriority.P1_IMPORTANT);
const task2 = TaskScheduler.createTask(
  'Task 2',
  '...',
  TaskPriority.P1_IMPORTANT,
  undefined,
  [task1.id] // 依赖
);

scheduler.addTask(task1);
scheduler.addTask(task2);

// task2 会在 task1 完成后自动分配
```

#### 查询队列状态

```typescript
const status = scheduler.getQueueStatus();
console.log(`待处理任务：${status.total}`);
console.log('各优先级分布:', status.byPriority);
console.log('所有任务:', status.tasks);
```

---

### 4. 调度策略

#### 技能匹配

```typescript
// 指定需要 ARIA 类型的任务
const task = TaskScheduler.createTask(
  '实现功能',
  '需要 React 开发',
  TaskPriority.P1_IMPORTANT,
  AgentType.ARIA  // ← 只会分配给 ARIA 类型的 Agent
);
```

**Agent 类型映射:**
- `ACE` → 测试/审查
- `ARIA` → 实现/开发
- `NOVA` → 内容/增长
- `KAEL` → 工程/架构
- `NEXUS` → 战略/协调
- `AXON` → 至高意志

#### 负载均衡

```typescript
// 启用负载均衡后
const config = {
  enableLoadBalancing: true
};

// 优先分配给完成任务数最少的 Agent
// 避免某些 Agent 过载，某些空闲
```

#### 轮询分配

默认策略：按 Agent 空闲时间排序，最早空闲的优先获得任务。

---

## 📈 监控与统计

### 获取调度器统计

```typescript
const stats = scheduler.getStats();

console.log(`
任务统计:
  - 总任务数：${stats.totalTasks}
  - 待处理：${stats.pendingTasks}
  - 进行中：${stats.inProgressTasks}
  - 已完成：${stats.completedTasks}

Agent 统计:
  - 总 Agent 数：${stats.totalAgents}
  - 忙碌：${stats.busyAgents}
  - 空闲：${stats.idleAgents}
  - 警告：${stats.warningAgents}
  - 严重：${stats.criticalAgents}
`);
```

### 获取 Agent 状态

```typescript
const agents = scheduler.getAgentStatus();

agents.forEach(agent => {
  console.log(`${agent.name}: ${agent.status}`);
  console.log(`  - 当前任务：${agent.currentTaskId || '无'}`);
  console.log(`  - 完成任务数：${agent.completedTasks}`);
  console.log(`  - 最后活跃：${new Date(agent.lastActiveAt).toLocaleString()}`);
});
```

### 获取分配历史

```typescript
const history = scheduler.getAssignmentHistory();

history.forEach(record => {
  console.log(`[${new Date(record.timestamp).toLocaleString()}]`);
  console.log(`  - 任务：${record.taskId}`);
  console.log(`  - Agent: ${record.agentId}`);
  console.log(`  - 成功：${record.success}`);
  if (record.error) {
    console.log(`  - 错误：${record.error}`);
  }
});
```

---

## 🎯 事件系统

### 可用事件

| 事件 | 触发条件 | 数据 |
|------|----------|------|
| `started` | 调度器启动 | - |
| `stopped` | 调度器停止 | - |
| `task:added` | 任务添加到队列 | `Task` |
| `task:assigned` | 任务分配给 Agent | `{ task, agent }` |
| `task:completed` | 任务完成 | `{ taskId, agentId, result }` |
| `agent:registered` | Agent 注册 | `Agent` |
| `agent:unregistered` | Agent 注销 | `agentId` |
| `agent:warning` | Agent 空闲 >1min | `{ agentId, name, idleTime, message }` |
| `agent:critical` | Agent 空闲 >5min | `{ agentId, name, idleTime, message }` |
| `agent:accident` | Agent 空闲 >15min | `{ agentId, name, idleTime, message }` |

### 监听事件

```typescript
scheduler.on('task:assigned', ({ task, agent }) => {
  console.log(`任务 "${task.title}" 已分配给 ${agent.name}`);
});

scheduler.on('agent:critical', ({ name, idleTime }) => {
  // 发送通知
  sendNotification(`${name} 已空闲 ${Math.floor(idleTime / 60000)} 分钟`);
});
```

---

## 🔧 配置选项

```typescript
interface SchedulerConfig {
  idleWarningThreshold: number;    // 警告阈值 (毫秒), 默认 60000
  idleCriticalThreshold: number;   // 严重阈值 (毫秒), 默认 300000
  idleAccidentThreshold: number;   // 事故阈值 (毫秒), 默认 900000
  pollInterval: number;            // 轮询间隔 (毫秒), 默认 5000
  enableSkillMatching: boolean;    // 启用技能匹配, 默认 true
  enableLoadBalancing: boolean;    // 启用负载均衡, 默认 true
}

// 自定义配置
const scheduler = new TaskScheduler({
  pollInterval: 3000,              // 3 秒轮询
  idleWarningThreshold: 30000,     // 30 秒警告
  idleCriticalThreshold: 180000,   // 3 分钟严重
  enableSkillMatching: true,
  enableLoadBalancing: true
});
```

---

## 🧪 单元测试

运行测试：

```bash
cd /Users/nike/.openclaw/workspace
npm test -- task-scheduler.test.ts
```

或运行所有测试：

```bash
npm test
```

### 测试覆盖

- ✅ 生命周期管理 (启动/停止)
- ✅ 任务队列管理 (添加/删除/优先级)
- ✅ Agent 管理 (注册/注销)
- ✅ 任务分配 (成功/失败场景)
- ✅ 任务完成监听
- ✅ 空闲检测 (警告/严重/事故)
- ✅ 技能匹配
- ✅ 负载均衡
- ✅ 任务依赖
- ✅ 统计查询
- ✅ 分配历史

---

## 📝 最佳实践

### 1. 任务粒度

```typescript
// ❌ 不要：任务过大
const badTask = TaskScheduler.createTask(
  '重构整个系统',
  '...',
  TaskPriority.P0_CORE
);

// ✅ 应该：拆分为小任务
const tasks = [
  TaskScheduler.createTask('重构模块 A', '...', TaskPriority.P1_IMPORTANT),
  TaskScheduler.createTask('重构模块 B', '...', TaskPriority.P1_IMPORTANT, undefined, ['task-a']),
  TaskScheduler.createTask('重构模块 C', '...', TaskPriority.P1_IMPORTANT, undefined, ['task-b'])
];
scheduler.addTasks(tasks);
```

### 2. 优先级设置

```typescript
// P0: 阻塞其他任务的核心功能
const p0 = TaskScheduler.createTask('修复登录 Bug', '...', TaskPriority.P0_BLOCKING);

// P1: 重要功能开发
const p1 = TaskScheduler.createTask('实现用户注册', '...', TaskPriority.P1_IMPORTANT);

// P2: 性能优化
const p2 = TaskScheduler.createTask('优化加载速度', '...', TaskPriority.P2_OPTIMIZATION);

// P3: 可选改进
const p3 = TaskScheduler.createTask('更新文档', '...', TaskPriority.P3_OPTIONAL);
```

### 3. Agent 类型匹配

```typescript
// 测试任务 → ACE
const testTask = TaskScheduler.createTask('单元测试', '...', TaskPriority.P1_IMPORTANT, AgentType.ACE);

// 开发任务 → ARIA
const devTask = TaskScheduler.createTask('实现 API', '...', TaskPriority.P1_IMPORTANT, AgentType.ARIA);

// 内容任务 → NOVA
const contentTask = TaskScheduler.createTask('编写文档', '...', TaskPriority.P2_OPTIMIZATION, AgentType.NOVA);
```

### 4. 错误处理

```typescript
scheduler.on('task:assigned', ({ task, agent }) => {
  try {
    // 发送任务给 Agent
    await sendTaskToAgent(agent.id, task);
  } catch (error) {
    console.error('任务分配失败:', error);
    // 重新加入队列
    task.status = TaskStatus.PENDING;
    scheduler.addTask(task);
  }
});
```

---

## 🔍 故障排查

### 问题：任务长时间未分配

**检查清单:**
1. 确认调度器已启动：`scheduler.start()`
2. 检查是否有可用 Agent：`scheduler.getAgentStatus()`
3. 检查任务依赖是否满足
4. 检查 Agent 类型是否匹配

```typescript
const status = scheduler.getQueueStatus();
console.log('待处理任务:', status.total);

const agents = scheduler.getAgentStatus();
const idleAgents = agents.filter(a => a.status === AgentStatus.IDLE);
console.log('空闲 Agent:', idleAgents.length);
```

### 问题：Agent 显示警告但实际在运行

**原因:** Agent 的 `lastActiveAt` 未更新

**解决:** 确保 Agent 在执行任务时定期更新状态：

```typescript
// 在 Agent 执行任务时
scheduler.agentManager.updateStatus(agentId, AgentStatus.BUSY, taskId);
```

### 问题：任务分配顺序不符合预期

**检查:** 优先级设置是否正确

```typescript
// 查看各优先级任务数
const status = scheduler.getQueueStatus();
console.log(status.byPriority);
// 输出：{ P0_BLOCKING: 0, P0_CORE: 2, P1_IMPORTANT: 5, ... }
```

---

## 📚 API 参考

### TaskScheduler 类

#### 构造函数

```typescript
new TaskScheduler(config?: Partial<SchedulerConfig>)
```

#### 方法

| 方法 | 参数 | 返回值 | 描述 |
|------|------|--------|------|
| `start()` | - | void | 启动调度器 |
| `stop()` | - | void | 停止调度器 |
| `addTask(task)` | `Task` | void | 添加任务 |
| `addTasks(tasks)` | `Task[]` | void | 批量添加任务 |
| `assignTask(taskId, agentId)` | `string, string` | `TaskAssignmentResult` | 分配任务 |
| `onTaskCompleted(taskId, agentId, result)` | `string, string, any` | void | 任务完成回调 |
| `registerAgent(agent)` | `Agent` | void | 注册 Agent |
| `unregisterAgent(agentId)` | `string` | boolean | 注销 Agent |
| `getStats()` | - | `SchedulerStats` | 获取统计 |
| `getQueueStatus()` | - | `QueueStatus` | 获取队列状态 |
| `getAgentStatus()` | - | `Agent[]` | 获取 Agent 状态 |
| `getAssignmentHistory()` | - | `TaskAssignmentResult[]` | 获取分配历史 |

#### 静态方法

| 方法 | 描述 |
|------|------|
| `createTask(...)` | 创建任务对象 |
| `createAgent(...)` | 创建 Agent 对象 |
| `parseSystemMessage(msg)` | 解析系统消息 |

---

## 🎓 示例场景

### 场景 1: 自动任务流水线

```typescript
// 创建依赖任务链
const design = TaskScheduler.createTask('设计 API', '...', TaskPriority.P0_CORE, AgentType.NEXUS);
const implement = TaskScheduler.createTask('实现 API', '...', TaskPriority.P0_CORE, AgentType.ARIA, [design.id]);
const test = TaskScheduler.createTask('测试 API', '...', TaskPriority.P1_IMPORTANT, AgentType.ACE, [implement.id]);
const document = TaskScheduler.createTask('编写文档', '...', TaskPriority.P2_OPTIMIZATION, AgentType.NOVA, [test.id]);

scheduler.addTasks([design, implement, test, document]);

// 自动按顺序执行
```

### 场景 2: 多 Agent 协作

```typescript
// 注册多个 Agent
const agents = [
  TaskScheduler.createAgent('aria-1', 'ARIA-1', AgentType.ARIA),
  TaskScheduler.createAgent('aria-2', 'ARIA-2', AgentType.ARIA),
  TaskScheduler.createAgent('ace-1', 'ACE-1', AgentType.ACE)
];

agents.forEach(agent => scheduler.registerAgent(agent));

// 添加多个任务
const tasks = Array(10).fill(null).map((_, i) => 
  TaskScheduler.createTask(`Task ${i}`, '...', TaskPriority.P1_IMPORTANT, AgentType.ARIA)
);

scheduler.addTasks(tasks);

// 自动负载均衡分配
```

### 场景 3: 紧急 Bug 修复

```typescript
// P0 阻塞性任务，立即中断当前工作
const bugFix = TaskScheduler.createTask(
  '修复生产环境 Bug',
  '用户无法登录',
  TaskPriority.P0_BLOCKING,
  AgentType.ARIA
);

scheduler.addTask(bugFix);

// 监听分配
scheduler.on('task:assigned', ({ task, agent }) => {
  if (task.priority === TaskPriority.P0_BLOCKING) {
    // 发送紧急通知
    sendUrgentNotification(`${agent.name} 正在处理紧急 Bug`);
  }
});
```

---

## 📞 支持

**问题反馈:** 提交 Issue 到 AxonClaw 仓库  
**文档更新:** 2026-03-13  
**维护者:** Axon

---

**最后更新:** 2026-03-13 13:45  
**状态:** ✅ 完成
