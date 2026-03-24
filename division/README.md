# 分队任务执行系统

## 概述

分队任务执行器负责：
1. **接收 Axon 指令** - 分队从编排器接收任务
2. **执行任务并记录** - 执行任务并记录执行过程和结果
3. **自动发送汇报** - 任务完成后自动向 Axon 发送汇报

## 核心 API

### 函数式 API (推荐)

```typescript
import { executeDivisionTask, Task } from './division/task-executor';

const task: Task = {
  type: 'code_generation',
  description: '生成用户认证模块',
  priority: 'high'
};

const result = await executeDivisionTask('alpha-division', task);
```

### 类式 API (高级用法)

```typescript
import { DivisionTaskExecutor, ConsoleReportChannel } from './division/task-executor';

const executor = new DivisionTaskExecutor({
  channel: new ConsoleReportChannel(),
  timeoutMs: 30000,
  retryCount: 3
});

const result = await executor.executeDivisionTask('alpha-division', task);
```

## 自定义汇报渠道

实现 `ReportChannel` 接口来创建自定义汇报渠道：

```typescript
import { ReportChannel, TaskReport } from './division/task-executor';

class DiscordReportChannel implements ReportChannel {
  async submit(report: TaskReport): Promise<boolean> {
    // 发送到 Discord webhook
    await fetch(DISCORD_WEBHOOK_URL, {
      method: 'POST',
      body: JSON.stringify({
        content: `分队 ${report.division} 完成任务：${report.result.status}`
      })
    });
    return true;
  }
}
```

## 汇报数据结构

```typescript
interface TaskReport {
  division: string;        // 分队标识
  task: Task;              // 任务定义
  result: TaskResult;      // 执行结果
  timestamp: number;       // 时间戳
  executionTimeMs: number; // 执行耗时
}
```

## 完整示例

```typescript
import { 
  executeDivisionTask, 
  DivisionTaskExecutor,
  Task 
} from './division/task-executor';

// 示例 1: 简单任务执行
async function runSimpleTask() {
  const task: Task = {
    type: 'code_generation',
    description: '实现用户登录功能',
    priority: 'high',
    metadata: { module: 'auth' }
  };

  const result = await executeDivisionTask('alpha-squad', task);
  console.log(result);
}

// 示例 2: 批量任务
async function runBatchTasks() {
  const tasks: Task[] = [
    { type: 'code_generation', description: '实现登录', priority: 'high' },
    { type: 'test_generation', description: '编写测试', priority: 'medium' },
    { type: 'documentation', description: '更新文档', priority: 'low' }
  ];

  const executor = new DivisionTaskExecutor({ channel: new ConsoleReportChannel() });

  for (const task of tasks) {
    await executor.executeDivisionTask('beta-squad', task);
  }
}

// 示例 3: 自定义汇报
async function runWithCustomReport() {
  class SlackReportChannel implements ReportChannel {
    async submit(report: TaskReport): Promise<boolean> {
      // 发送到 Slack
      console.log(`Slack: ${report.division} - ${report.result.status}`);
      return true;
    }
  }

  const task: Task = {
    type: 'deployment',
    description: '部署到生产环境',
    priority: 'critical'
  };

  await executeDivisionTask('ops-squad', task, new SlackReportChannel());
}
```

## 集成到 Axon 系统

```typescript
// src/index.ts
import { DivisionTaskExecutor } from './division/task-executor';
import { AgentOrchestrator } from './orchestrator';

const orchestrator = new AgentOrchestrator();
const executor = new DivisionTaskExecutor({ channel: new ConsoleReportChannel() });

// Axon 下达指令
async function axonCommand(division: string, task: Task) {
  const result = await executor.executeDivisionTask(division, task);
  return result;
}
```

## 文件结构

```
src/division/
├── task-executor.ts    # 核心实现
├── README.md           # 本文档
└── index.ts            # 导出 (可选)
```

## 测试

```bash
# 运行测试
npm test -- division

# 或手动测试
npx ts-node src/division/task-executor.ts
```
