# Agent Monitor 配置文档

**版本:** 1.0  
**创建时间:** 2026-03-13  
**作者:** Axon (via NOVA)  
**状态:** ✅ 完成

---

## 📋 概述

Agent Monitor 是 AxonClaw 的 Agent 状态监控系统，提供：

1. **状态检测** - 每 30 秒检查 Agent 活跃/空闲/超时/失败状态
2. **空闲阈值告警** - 三级告警机制 (警告/严重/事故)
3. **性能指标** - Token 使用量、任务完成时间、成功率统计
4. **自动优化** - 识别低效任务、建议任务拆分、推荐模型选择

---

## 🚀 快速开始

### 1. 基础使用

```typescript
import { agentMonitor, AgentStateMonitor } from './agent/agent-monitor';

// 创建监控实例
const monitor = new AgentStateMonitor({
  thresholds: {
    warningThreshold: 60000,     // 1 分钟警告
    criticalThreshold: 300000,   // 5 分钟严重
    accidentThreshold: 900000,   // 15 分钟事故
    checkInterval: 30000         // 30 秒检查一次
  },
  enableAutoTerminate: true,     // 自动杀掉事故 Agent
  enableMetrics: true,           // 收集性能指标
  enableOptimization: true       // 启用自动优化
});

// 启动监控
monitor.start();
```

### 2. 注册 Agent

```typescript
import { TaskScheduler } from './agent/task-scheduler';

const agent = TaskScheduler.createAgent(
  'aria-1',
  'ARIA-1',
  AgentType.ARIA
);

// 注册到调度器
scheduler.registerAgent(agent);

// 注册到监控器
monitor.registerAgent(agent);
```

### 3. 监听告警

```typescript
// 监听所有告警
monitor.on('alert', (alert) => {
  console.log(`[${alert.level}] ${alert.message}`);
});

// 监听特定级别告警
monitor.on('alert:warning', (alert) => {
  console.warn(`⚠️ 警告：${alert.message}`);
});

monitor.on('alert:critical', (alert) => {
  console.error(`🚨 严重：${alert.message}`);
  // 通知 Axon
  notifyAxon(alert);
});

monitor.on('alert:accident', (alert) => {
  console.error(`💥 事故：${alert.message}`);
  // Agent 已被自动杀掉
});

// 监听 Agent 终止
monitor.on('agent:terminated', ({ agentId, alert }) => {
  console.log(`Agent ${agentId} 已被终止`);
});
```

---

## 📊 核心功能

### 1. 状态检测

**检测频率:** 每 30 秒自动检查一次

**状态类型:**

| 状态 | 说明 | 触发条件 |
|------|------|----------|
| `active` | 活跃 | Agent 正在执行任务 |
| `idle` | 空闲 | Agent 无任务但在线 |
| `timeout` | 超时 | Agent 超过阈值无响应 |
| `failed` | 失败 | 任务执行失败 |
| `terminated` | 已终止 | 因事故被自动杀掉 |

**状态变化历史:**

```typescript
const history = monitor.getStatusHistory('aria-1', 20);

history.forEach(change => {
  console.log(`[${new Date(change.timestamp).toLocaleString()}]`);
  console.log(`  ${change.fromStatus} → ${change.toStatus}`);
  console.log(`  原因：${change.reason}`);
});
```

---

### 2. 空闲阈值告警

#### 告警级别

| 级别 | 阈值 | 动作 | Emoji |
|------|------|------|-------|
| 🟡 WARNING | > 1min | 记录日志 | ⚠️ |
| 🟠 CRITICAL | > 5min | 通知 Axon | 🚨 |
| 🔴 ACCIDENT | > 15min | 自动杀掉 | 💥 |

#### 告警配置

```typescript
const monitor = new AgentStateMonitor({
  thresholds: {
    warningThreshold: 60000,     // 1 分钟 (毫秒)
    criticalThreshold: 300000,   // 5 分钟
    accidentThreshold: 900000,   // 15 分钟
    checkInterval: 30000         // 30 秒检查一次
  }
});
```

#### 告警事件

```typescript
interface AlertEvent {
  level: AlertLevel;           // 告警级别
  agentId: string;             // Agent ID
  agentName: string;           // Agent 名称
  message: string;             // 告警消息
  idleTime: number;            // 空闲时间 (毫秒)
  timestamp: number;           // 时间戳
  action?: string;             // 采取的行动
}
```

#### 处理告警

```typescript
// 警告处理
monitor.on('alert:warning', ({ agentId, agentName, idleTime }) => {
  console.warn(`Agent ${agentName} 已空闲 ${Math.floor(idleTime / 60000)} 分钟`);
  // 可以记录日志或发送轻量通知
});

// 严重处理
monitor.on('alert:critical', ({ agentId, agentName, idleTime }) => {
  console.error(`Agent ${agentName} 已空闲 ${Math.floor(idleTime / 60000)} 分钟 (严重)`);
  
  // 通知 Axon
  sendNotificationToAxon({
    type: 'agent_critical',
    agentId,
    agentName,
    idleTime
  });
});

// 事故处理
monitor.on('alert:accident', ({ agentId, agentName, idleTime }) => {
  console.error(`Agent ${agentName} 已空闲 ${Math.floor(idleTime / 60000)} 分钟 (事故)`);
  
  // Agent 已被自动杀掉
  // 记录事故报告
  logAccident({
    agentId,
    agentName,
    idleTime,
    timestamp: Date.now(),
    action: '自动终止'
  });
});
```

---

### 3. 性能指标

#### 指标类型

```typescript
interface PerformanceMetrics {
  agentId: string;
  tokenUsage: number;            // Token 使用量
  taskCount: number;             // 完成任务数
  avgTaskDuration: number;       // 平均任务完成时间 (毫秒)
  successRate: number;           // 成功率 (0-1)
  efficiency: number;            // 效率分数 (0-100)
  lastTaskDuration: number;      // 上次任务耗时
  peakTokenUsage: number;        // 峰值 Token 使用
  avgTokensPerTask: number;      // 平均每任务 Token
}
```

#### 更新指标

```typescript
// 任务完成时更新
monitor.onTaskCompleted(
  'aria-1',           // Agent ID
  'task-123',         // 任务 ID
  180000,             // 耗时 (毫秒)
  2500,               // Token 使用量
  true                // 是否成功
);

// 手动更新指标
monitor.updateMetrics('aria-1', {
  tokenUsage: 5000,
  efficiency: 85
});
```

#### 获取指标

```typescript
const data = monitor.getAgentMonitorData('aria-1');

if (data) {
  console.log(`Agent: ${data.name}`);
  console.log(`状态：${data.status}`);
  console.log(`完成任务数：${data.metrics.taskCount}`);
  console.log(`成功率：${(data.metrics.successRate * 100).toFixed(2)}%`);
  console.log(`效率分数：${data.metrics.efficiency.toFixed(2)}`);
  console.log(`平均耗时：${(data.metrics.avgTaskDuration / 1000).toFixed(2)}秒`);
  console.log(`Token 使用：${data.metrics.tokenUsage}`);
}
```

---

### 4. 自动优化

#### 任务效率分析

```typescript
const analysis = monitor.analyzeTaskEfficiency(
  'task-123',         // 任务 ID
  120000,             // 预计耗时 (毫秒)
  180000,             // 实际耗时 (毫秒)
  2500                // Token 使用量
);

console.log(`效率比：${analysis.efficiencyRatio.toFixed(2)}`);
console.log(`是否高效：${analysis.isEfficient}`);
console.log('优化建议:');
analysis.suggestions.forEach(s => console.log(`  - ${s}`));
```

**输出示例:**
```
效率比：1.50
是否高效：false
优化建议:
  - 任务耗时远超预期，考虑拆分为更小的子任务
  - Token 使用量较高，检查是否有冗余的上下文或提示词
```

#### 识别低效任务

```typescript
const inefficientTasks = monitor.identifyInefficientTasks(1.5);

inefficientTasks.forEach(task => {
  console.log(`任务 ${task.taskId}:`);
  console.log(`  效率比：${task.efficiencyRatio.toFixed(2)}`);
  console.log(`  建议:`);
  task.suggestions.forEach(s => console.log(`    - ${s}`));
});
```

#### 模型推荐

```typescript
// 简单编码任务
const rec1 = monitor.recommendModel('coding', 'low');
console.log(rec1);
// { recommendedModel: 'qwen2.5-coder:7b', expectedImprovement: 20, ... }

// 复杂写作任务
const rec2 = monitor.recommendModel('writing', 'high');
console.log(rec2);
// { recommendedModel: 'qwen2.5:72b', expectedImprovement: 35, ... }

// 中等分析任务
const rec3 = monitor.recommendModel('analysis', 'medium');
console.log(rec3);
// { recommendedModel: 'qwen2.5:32b', expectedImprovement: 20, ... }
```

**模型推荐表:**

| 任务类型 | 复杂度 | 推荐模型 | 预期提升 |
|----------|--------|----------|----------|
| coding | low | qwen2.5-coder:7b | 20% |
| coding | medium | qwen2.5-coder:32b | 15% |
| coding | high | qwen2.5-coder:32b | 25% |
| writing | low | qwen2.5:7b | 30% |
| writing | medium | qwen2.5:14b | 20% |
| writing | high | qwen2.5:72b | 35% |
| analysis | low | qwen2.5:14b | 15% |
| analysis | medium | qwen2.5:32b | 20% |
| analysis | high | qwen2.5:72b | 30% |

---

## 📈 监控仪表板

### 获取仪表板数据

```typescript
const dashboard = monitor.getDashboardData();

console.log('=== Agent 状态概览 ===');
console.log(`总 Agent 数：${dashboard.summary.totalAgents}`);
console.log(`活跃：${dashboard.summary.activeAgents}`);
console.log(`空闲：${dashboard.summary.idleAgents}`);
console.log(`超时：${dashboard.summary.timeoutAgents}`);
console.log(`失败：${dashboard.summary.failedAgents}`);
console.log(`已终止：${dashboard.summary.terminatedAgents}`);

console.log('\n=== 告警统计 ===');
console.log(`警告：${dashboard.alerts.warnings}`);
console.log(`严重：${dashboard.alerts.criticals}`);
console.log(`事故：${dashboard.alerts.accidents}`);

console.log('\n=== 性能指标 ===');
console.log(`平均成功率：${(dashboard.performance.avgSuccessRate * 100).toFixed(2)}%`);
console.log(`平均效率：${dashboard.performance.avgEfficiency.toFixed(2)}`);
console.log(`总 Token 使用：${dashboard.performance.totalTokensUsed}`);
console.log(`总完成任务：${dashboard.performance.totalTasksCompleted}`);

console.log('\n=== 最近告警 ===');
dashboard.alerts.recent.forEach(alert => {
  console.log(`[${alert.level}] ${alert.agentName}: ${alert.message}`);
});
```

### 仪表板数据结构

```typescript
interface DashboardData {
  summary: {
    totalAgents: number;
    activeAgents: number;
    idleAgents: number;
    timeoutAgents: number;
    failedAgents: number;
    terminatedAgents: number;
  };
  alerts: {
    warnings: number;
    criticals: number;
    accidents: number;
    recent: AlertEvent[];
  };
  performance: {
    avgSuccessRate: number;
    avgEfficiency: number;
    totalTokensUsed: number;
    totalTasksCompleted: number;
  };
  agents: AgentMonitorData[];
}
```

---

## 🔧 配置选项

### 完整配置

```typescript
interface MonitorConfig {
  thresholds: {
    warningThreshold: number;      // 警告阈值 (毫秒), 默认 60000
    criticalThreshold: number;     // 严重阈值 (毫秒), 默认 300000
    accidentThreshold: number;     // 事故阈值 (毫秒), 默认 900000
    checkInterval: number;         // 检查间隔 (毫秒), 默认 30000
  };
  enableAutoTerminate: boolean;    // 自动终止事故 Agent, 默认 true
  enableMetrics: boolean;          // 启用性能指标, 默认 true
  enableOptimization: boolean;     // 启用自动优化, 默认 true
  historyLimit: number;            // 历史记录保留条数, 默认 100
}
```

### 自定义配置示例

```typescript
// 严格模式 - 更快触发告警
const strictMonitor = new AgentStateMonitor({
  thresholds: {
    warningThreshold: 30000,       // 30 秒警告
    criticalThreshold: 120000,     // 2 分钟严重
    accidentThreshold: 300000,     // 5 分钟事故
    checkInterval: 15000           // 15 秒检查一次
  },
  enableAutoTerminate: true
});

// 宽松模式 - 适合长时间任务
const relaxedMonitor = new AgentStateMonitor({
  thresholds: {
    warningThreshold: 120000,      // 2 分钟警告
    criticalThreshold: 600000,     // 10 分钟严重
    accidentThreshold: 1800000,    // 30 分钟事故
    checkInterval: 60000           // 1 分钟检查一次
  },
  enableAutoTerminate: false       // 不自动终止
});
```

---

## 🎯 与 TaskScheduler 集成

### 完整集成示例

```typescript
import { TaskScheduler, AgentType, TaskPriority } from './agent/task-scheduler';
import { AgentStateMonitor } from './agent/agent-monitor';

// 创建调度器和监控器
const scheduler = new TaskScheduler({
  pollInterval: 5000,
  enableSkillMatching: true,
  enableLoadBalancing: true
});

const monitor = new AgentStateMonitor({
  thresholds: {
    warningThreshold: 60000,
    criticalThreshold: 300000,
    accidentThreshold: 900000,
    checkInterval: 30000
  },
  enableAutoTerminate: true,
  enableMetrics: true,
  enableOptimization: true
});

// 启动
scheduler.start();
monitor.start();

// 注册 Agent
const agent = TaskScheduler.createAgent('aria-1', 'ARIA-1', AgentType.ARIA);
scheduler.registerAgent(agent);
monitor.registerAgent(agent);

// 同步状态更新
scheduler.on('task:assigned', ({ task, agent }) => {
  monitor.updateAgentStatus(agent.id, AgentStatus.BUSY, task.id);
});

scheduler.on('task:completed', ({ taskId, agentId, result }) => {
  // 更新监控状态
  monitor.updateAgentStatus(agentId, AgentStatus.IDLE);
  
  // 记录性能指标
  monitor.onTaskCompleted(
    agentId,
    taskId,
    result.duration,
    result.tokenUsage,
    result.success
  );
});

// 监听告警并处理
monitor.on('alert:critical', ({ agentId, agentName, idleTime }) => {
  console.error(`严重告警：${agentName} 已空闲 ${Math.floor(idleTime / 60000)} 分钟`);
  
  // 检查是否有待分配任务
  const queueStatus = scheduler.getQueueStatus();
  if (queueStatus.total > 0) {
    console.log(`有待分配任务，尝试分配给 ${agentName}`);
    // 触发任务分配
  }
});

monitor.on('agent:terminated', ({ agentId, alert }) => {
  console.log(`Agent ${agentId} 已被终止`);
  
  // 从调度器注销
  scheduler.unregisterAgent(agentId);
  
  // 记录事故
  logAccident(alert);
});
```

---

## 🧪 使用场景

### 场景 1: 实时监控所有 Agent

```typescript
// 每 5 分钟输出一次状态
setInterval(() => {
  const dashboard = monitor.getDashboardData();
  
  console.log('\n=== Agent 监控报告 ===');
  console.log(`时间：${new Date().toLocaleString()}`);
  console.log(`活跃 Agent: ${dashboard.summary.activeAgents}/${dashboard.summary.totalAgents}`);
  console.log(`告警：⚠️${dashboard.alerts.warnings} 🚨${dashboard.alerts.criticals} 💥${dashboard.alerts.accidents}`);
  console.log(`平均效率：${dashboard.performance.avgEfficiency.toFixed(1)}`);
  
  dashboard.agents.forEach(agent => {
    console.log(`\n${agent.name} (${agent.status}):`);
    console.log(`  空闲时间：${(agent.idleTime / 1000).toFixed(0)}秒`);
    console.log(`  完成任务：${agent.metrics.taskCount}`);
    console.log(`  成功率：${(agent.metrics.successRate * 100).toFixed(1)}%`);
  });
}, 300000);
```

### 场景 2: 自动优化低效任务

```typescript
// 每小时分析一次
setInterval(() => {
  const inefficientTasks = monitor.identifyInefficientTasks(1.5);
  
  if (inefficientTasks.length > 0) {
    console.log(`\n发现 ${inefficientTasks.length} 个低效任务:`);
    
    inefficientTasks.forEach(task => {
      console.log(`\n任务 ${task.taskId}:`);
      console.log(`  效率比：${task.efficiencyRatio.toFixed(2)}`);
      
      // 推荐模型
      const rec = monitor.recommendModel('coding', 'medium');
      console.log(`  推荐模型：${rec.recommendedModel}`);
      console.log(`  预期提升：${rec.expectedImprovement}%`);
      
      // 建议任务拆分
      if (task.efficiencyRatio > 2.0) {
        console.log(`  ⚠️ 建议拆分为 ${Math.ceil(task.efficiencyRatio)} 个小任务`);
      }
    });
  }
}, 3600000);
```

### 场景 3: 告警通知集成

```typescript
// 集成消息通知
monitor.on('alert:critical', async (alert) => {
  await sendDiscordMessage({
    channel: 'agent-monitoring',
    embed: {
      title: '🚨 Agent 严重告警',
      color: 0xFFA500,
      fields: [
        { name: 'Agent', value: alert.agentName, inline: true },
        { name: '空闲时间', value: `${Math.floor(alert.idleTime / 60000)}分钟`, inline: true },
        { name: '时间', value: new Date(alert.timestamp).toLocaleString(), inline: true }
      ]
    }
  });
});

monitor.on('alert:accident', async (alert) => {
  await sendDiscordMessage({
    channel: 'agent-monitoring',
    embed: {
      title: '💥 Agent 事故',
      color: 0xFF0000,
      fields: [
        { name: 'Agent', value: alert.agentName, inline: true },
        { name: '空闲时间', value: `${Math.floor(alert.idleTime / 60000)}分钟`, inline: true },
        { name: '行动', value: '已自动终止', inline: true },
        { name: '消息', value: alert.message }
      ]
    }
  });
  
  // 通知 Axon
  await notifyAxon({
    type: 'agent_accident',
    agentId: alert.agentId,
    action: 'terminated'
  });
});
```

---

## 📊 API 参考

### AgentStateMonitor 类

#### 构造函数

```typescript
new AgentStateMonitor(config?: Partial<MonitorConfig>)
```

#### 方法

| 方法 | 参数 | 返回值 | 描述 |
|------|------|--------|------|
| `start()` | - | void | 启动监控 |
| `stop()` | - | void | 停止监控 |
| `registerAgent(agent)` | `Agent` | void | 注册 Agent |
| `unregisterAgent(agentId)` | `string` | boolean | 注销 Agent |
| `updateAgentStatus(agentId, status, taskId?)` | `string, AgentStatus, string?` | void | 更新状态 |
| `updateMetrics(agentId, metrics)` | `string, Partial<PerformanceMetrics>` | void | 更新指标 |
| `onTaskCompleted(agentId, taskId, duration, tokens, success)` | `string, string, number, number, boolean` | void | 任务完成 |
| `getDashboardData()` | - | `DashboardData` | 获取仪表板数据 |
| `getAgentMonitorData(agentId)` | `string` | `AgentMonitorData?` | 获取 Agent 数据 |
| `getAlerts(limit?)` | `number` | `AlertEvent[]` | 获取告警 |
| `getStatusHistory(agentId?, limit?)` | `string?, number` | `StatusChangeHistory[]` | 获取历史 |
| `analyzeTaskEfficiency(taskId, estimated, actual, tokens)` | `string, number, number, number` | `TaskEfficiencyAnalysis` | 分析效率 |
| `recommendModel(taskType, complexity)` | `string, 'low'/'medium'/'high'` | `ModelRecommendation` | 推荐模型 |
| `identifyInefficientTasks(threshold?)` | `number` | `TaskEfficiencyAnalysis[]` | 识别低效任务 |

#### 事件

| 事件 | 数据 | 描述 |
|------|------|------|
| `alert` | `AlertEvent` | 所有告警 |
| `alert:warning` | `AlertEvent` | 警告级别 |
| `alert:critical` | `AlertEvent` | 严重级别 |
| `alert:accident` | `AlertEvent` | 事故级别 |
| `agent:terminated` | `{ agentId, alert }` | Agent 被终止 |
| `notify:axon` | `AlertEvent` | 通知 Axon |

---

## 🔍 故障排查

### 问题：告警不触发

**检查清单:**
1. 确认监控已启动：`monitor.start()`
2. 确认 Agent 已注册：`monitor.registerAgent(agent)`
3. 检查阈值配置是否合理
4. 确认 Agent 状态已更新

```typescript
const data = monitor.getAgentMonitorData('aria-1');
console.log('当前状态:', data?.status);
console.log('空闲时间:', data?.idleTime);
console.log('最后活跃:', new Date(data?.lastActiveAt || 0).toLocaleString());
```

### 问题：性能指标不准确

**原因:** 未调用 `onTaskCompleted` 更新指标

**解决:**

```typescript
// 在任务完成时调用
scheduler.on('task:completed', ({ taskId, agentId, result }) => {
  monitor.onTaskCompleted(
    agentId,
    taskId,
    result.duration || 0,
    result.tokenUsage || 0,
    result.success !== false
  );
});
```

### 问题：Agent 被意外终止

**原因:** 事故阈值设置过短

**解决:** 调整配置

```typescript
const monitor = new AgentStateMonitor({
  thresholds: {
    accidentThreshold: 1800000,  // 改为 30 分钟
    enableAutoTerminate: false   // 或禁用自动终止
  }
});
```

---

## 📝 最佳实践

### 1. 合理设置阈值

```typescript
// 开发环境 - 宽松
const devMonitor = new AgentStateMonitor({
  thresholds: {
    warningThreshold: 120000,    // 2 分钟
    criticalThreshold: 600000,   // 10 分钟
    accidentThreshold: 1800000   // 30 分钟
  }
});

// 生产环境 - 严格
const prodMonitor = new AgentStateMonitor({
  thresholds: {
    warningThreshold: 30000,     // 30 秒
    criticalThreshold: 180000,   // 3 分钟
    accidentThreshold: 600000    // 10 分钟
  },
  enableAutoTerminate: true
});
```

### 2. 定期清理已终止 Agent

```typescript
setInterval(() => {
  const dashboard = monitor.getDashboardData();
  
  dashboard.agents
    .filter(a => a.status === MonitorAgentStatus.TERMINATED)
    .forEach(agent => {
      monitor.unregisterAgent(agent.id);
      console.log(`已清理已终止 Agent: ${agent.id}`);
    });
}, 3600000); // 每小时
```

### 3. 记录性能趋势

```typescript
const performanceHistory: DashboardData[] = [];

setInterval(() => {
  performanceHistory.push(monitor.getDashboardData());
  
  // 保留最近 24 小时数据 (每 5 分钟一次)
  if (performanceHistory.length > 288) {
    performanceHistory.shift();
  }
}, 300000);
```

### 4. 生成日报

```typescript
function generateDailyReport(): string {
  const dashboard = monitor.getDashboardData();
  const history = monitor.getStatusHistory();
  
  return `
# Agent 监控日报 ${new Date().toLocaleDateString()}

## 概览
- 总 Agent 数：${dashboard.summary.totalAgents}
- 活跃 Agent: ${dashboard.summary.activeAgents}
- 平均效率：${dashboard.performance.avgEfficiency.toFixed(1)}%
- 平均成功率：${(dashboard.performance.avgSuccessRate * 100).toFixed(1)}%

## 告警统计
- 警告：${dashboard.alerts.warnings}
- 严重：${dashboard.alerts.criticals}
- 事故：${dashboard.alerts.accidents}

## 性能
- 总完成任务：${dashboard.performance.totalTasksCompleted}
- 总 Token 使用：${dashboard.performance.totalTokensUsed}
  `.trim();
}
```

---

## 📞 支持

**问题反馈:** 提交 Issue 到 AxonClaw 仓库  
**文档更新:** 2026-03-13  
**维护者:** Axon (via NOVA)

---

**最后更新:** 2026-03-13 13:51  
**状态:** ✅ 完成
