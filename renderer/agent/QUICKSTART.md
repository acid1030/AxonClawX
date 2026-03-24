# 🚀 汇报链系统 - 快速开始指南

**5 分钟上手汇报链系统**

---

## 📦 安装

汇报链系统已集成到 Agent 模块，无需额外安装。

```typescript
import { 
  ReportChain, 
  ReportCollector, 
  AxonDashboard,
  submitReport,
  getDashboardSummary 
} from './agent';
```

---

## ⚡ 30 秒快速提交汇报

```typescript
// 一行代码提交汇报
await submitReport(
  'WORKER',           // 你的角色
  'worker-001',       // 你的 Agent ID
  'miiow',            // 分队 ID
  '实现用户登录',     // 任务
  'completed',        // 状态
  45,                 // 耗时 (分钟)
  ['src/auth.ts'],    // 产出文件
  [],                 // 问题 (可选)
  ['添加测试']        // 下一步 (可选)
);
```

就这么简单！汇报会自动保存到:
```
~/.openclaw/memory/divisions/miiow/shared/reports/2026-03-13/rpt_xxx.md
```

---

## 📊 1 分钟查看仪表板

```typescript
// 获取仪表板摘要
const summary = getDashboardSummary();
console.log(summary);
```

输出:
```markdown
## 🜏 Axon Dashboard Summary

**总汇报数:** 42
**完成率:** 95%
**平均耗时:** 38 分钟

### 状态分布
- ✅ 完成：38
- 🟡 进行中：3
- ❌ 失败：1

### ⚠️ 活跃告警 (1)
- [ERROR] 任务失败：生产环境部署
```

---

## 🎯 完整示例 (3 分钟)

### 场景：完成任务并查看结果

```typescript
import { 
  ReportChain, 
  AxonDashboard 
} from './agent';

// 1. 创建汇报
const reportChain = new ReportChain();

const report = reportChain.createReport(
  'WORKER',
  'worker-001',
  'miiow',
  {
    task: '实现支付接口集成',
    status: 'completed',
    duration: 120,
    outputs: [
      'src/payment/stripe.ts',
      'src/payment/alipay.ts',
      'docs/payment-api.md'
    ],
    issues: ['需要配置 API 密钥'],
    nextSteps: ['添加单元测试', '编写使用文档']
  }
);

// 2. 保存汇报
const savedPath = reportChain.saveReport(report);
console.log(`汇报已保存：${savedPath}`);

// 3. 查看仪表板
const dashboard = new AxonDashboard();
const metrics = dashboard.getMetrics();

console.log(`总汇报数：${metrics.totalReports}`);
console.log(`完成率：${100 - metrics.failureRate}%`);

// 4. 检查告警
if (metrics.alerts.length > 0) {
  console.log(`⚠️ 有 ${metrics.alerts.length} 个活跃告警`);
  for (const alert of metrics.alerts) {
    console.log(`[${alert.type}] ${alert.message}`);
  }
}
```

---

## 📋 常用场景速查

### 任务完成汇报

```typescript
await submitReport(
  'WORKER',
  'worker-001',
  'miiow',
  '完成任务',
  'completed',
  60,
  ['output.txt']
);
```

### 进度汇报

```typescript
const report = reportChain.createReport(
  'WORKER',
  'worker-001',
  'miiow',
  {
    task: '进行中任务',
    status: 'in-progress',
    duration: 90,
    outputs: ['partial.txt'],
    metadata: {
      progress: 60,
      blockers: '等待审核',
      eta: '2026-03-14 18:00'
    }
  }
);

const rendered = reportChain.renderReport(report, 'progress-update');
reportChain.saveReport(report);
```

### 阻塞预警 (紧急)

```typescript
const report = reportChain.createReport(
  'WORKER',
  'worker-001',
  'miiow',
  {
    task: '阻塞的任务',
    status: 'failed',
    duration: 15,
    priority: 'P0',
    metadata: {
      reason: '服务器宕机',
      impact: '无法继续',
      helpNeeded: '需要运维支持',
      priority: 'P0'
    }
  }
);

reportChain.saveReport(report);
// 会自动触发 P0 告警
```

### 收集汇报

```typescript
const collector = new ReportCollector();

// 收集所有汇报
const allReports = collector.collectAllReports();

// 筛选 miiow 分队的汇报
const miiowReports = collector.filterReports(allReports, {
  divisionId: 'miiow',
  limit: 10
});

// 获取某角色的汇报
const workerReports = collector.getReportsByRole(
  'miiow',
  'WORKER',
  20
);
```

### 查看分队状态

```typescript
const dashboard = new AxonDashboard();

// 获取所有分队状态
const divisions = dashboard.getAllDivisionStatuses();

for (const div of divisions) {
  console.log(`${div.divisionId}:`);
  console.log(`  完成：${div.completedTasks}`);
  console.log(`  进行中：${div.activeTasks}`);
  console.log(`  失败：${div.failedTasks}`);
}
```

---

## 🎨 汇报模板

系统内置 4 种模板:

| 模板 ID | 用途 | 使用场景 |
|--------|------|---------|
| `task-completion` | 任务完成 | 默认模板 |
| `progress-update` | 进度汇报 | 定期更新 |
| `blocker-alert` | 阻塞预警 | 紧急问题 |
| `daily-summary` | 每日汇总 | 记录员使用 |

使用模板:

```typescript
// 使用进度模板
const rendered = reportChain.renderReport(report, 'progress-update');

// 使用阻塞预警模板
const rendered = reportChain.renderReport(report, 'blocker-alert');
```

---

## 📁 汇报存储位置

```
~/.openclaw/memory/divisions/
├── {division}/
│   └── shared/
│       └── reports/
│           ├── 2026-03-13/
│           │   ├── rpt_xxx.md      # 人类可读
│           │   └── rpt_xxx.json    # 机器可读
│           └── 2026-03-14/
│               └── ...
```

---

## 🧪 运行示例

```bash
# 运行完整示例
cd /Users/nike/.openclaw/workspace
npx ts-node src/renderer/agent/examples/report-chain-usage.ts

# 运行测试
npm test -- report-chain.test.ts
```

---

## 📖 深入学习

- 📚 [完整文档](./REPORT_CHAIN_README.md)
- 📋 [模板文档](./templates/report-templates.md)
- 💡 [使用示例](./examples/report-chain-usage.ts)

---

## ❓ 常见问题

### Q: 汇报应该多久提交一次？

**A:** 
- 任务完成 → 立即提交
- 遇到阻塞 → 立即提交 (P0/P1)
- 定期进度 → 每 30 分钟或每小时

### Q: 如何选择优先级？

**A:**
- P0: 阻塞/紧急 → 立即处理
- P1: 高优先级 → 2 小时内
- P2: 普通 → 24 小时内
- P3: 低 → 本周内

### Q: 汇报文件在哪里？

**A:** `~/.openclaw/memory/divisions/{division}/shared/reports/{date}/`

### Q: 如何查看某分队的汇报？

**A:**
```typescript
const collector = new ReportCollector();
const reports = collector.getReportsByRole('miiow', 'WORKER', 20);
```

### Q: 如何自定义模板？

**A:**
```typescript
const customTemplate = {
  id: 'my-template',
  name: '我的模板',
  template: '自定义内容：{{task}}',
  variables: ['task']
};

reportChain.registerTemplate(customTemplate);
```

---

## 🎯 下一步

1. ✅ 尝试提交第一个汇报
2. ✅ 查看仪表板
3. ✅ 阅读完整文档
4. ✅ 集成到你的工作流

---

**开始使用吧！** 🚀
