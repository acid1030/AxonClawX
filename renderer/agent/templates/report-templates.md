# 📋 汇报模板系统

汇报链系统内置的标准化模板，支持自定义扩展。

---

## 🎯 模板列表

### 1. 任务完成汇报 (task-completion)

**用途:** 任务完成后提交的标准汇报

**模板:**
```markdown
## [{{role}}] 任务汇报

**任务:** {{task}}
**状态:** {{status}}
**耗时:** {{duration}} 分钟
**产出:** {{outputs}}
**问题:** {{issues}}
**下一步:** {{nextSteps}}
```

**变量:**
- `role` - 角色名称 (WORKER/COMMANDER/REVIEWER/SCRIBE)
- `task` - 任务描述
- `status` - 状态 (completed/in-progress/failed)
- `duration` - 耗时 (分钟)
- `outputs` - 产出文件列表
- `issues` - 遇到的问题
- `nextSteps` - 下一步计划

**使用示例:**
```typescript
const report = reportChain.createReport(
  'WORKER',
  'worker-001',
  'miiow',
  {
    task: '实现用户登录功能',
    status: 'completed',
    duration: 45,
    outputs: ['src/auth/login.ts', 'src/auth/login.test.ts'],
    issues: [],
    nextSteps: ['添加忘记密码功能']
  }
);
```

---

### 2. 进度汇报 (progress-update)

**用途:** 定期进度更新 (每 30 分钟/每小时)

**模板:**
```markdown
## [{{role}}] 进度汇报

**任务:** {{task}}
**当前进度:** {{progress}}%
**状态:** {{status}}
**已耗时:** {{duration}} 分钟
**阻塞项:** {{blockers}}
**需要支持:** {{needs}}
**预计完成:** {{eta}}
```

**变量:**
- `progress` - 完成百分比 (0-100)
- `blockers` - 阻塞项
- `needs` - 需要的支持
- `eta` - 预计完成时间

**使用示例:**
```typescript
const report = reportChain.createReport(
  'WORKER',
  'worker-002',
  'bot01',
  {
    task: '数据库迁移',
    status: 'in-progress',
    duration: 120,
    metadata: {
      progress: 60,
      blockers: '等待数据清理',
      needs: '需要 DBA 协助',
      eta: '2026-03-14 18:00'
    }
  }
);

const rendered = reportChain.renderReport(report, 'progress-update');
```

---

### 3. 阻塞预警 (blocker-alert)

**用途:** 遇到严重阻塞时立即上报

**模板:**
```markdown
## [{{role}}] 🚨 阻塞预警

**任务:** {{task}}
**阻塞原因:** {{reason}}
**影响范围:** {{impact}}
**需要帮助:** {{helpNeeded}}
**建议方案:** {{suggestions}}
**紧急程度:** {{priority}}
```

**变量:**
- `reason` - 阻塞原因
- `impact` - 影响范围
- `helpNeeded` - 需要的帮助
- `suggestions` - 建议方案
- `priority` - 紧急程度 (P0/P1/P2/P3)

**使用示例:**
```typescript
const report = reportChain.createReport(
  'WORKER',
  'worker-003',
  'bot02',
  {
    task: '生产环境部署',
    status: 'failed',
    duration: 15,
    priority: 'P0',
    metadata: {
      reason: '服务器 SSH 连接失败',
      impact: '无法部署，影响上线',
      helpNeeded: '需要网络团队开放端口',
      suggestions: '添加 IP 白名单',
      priority: 'P0'
    }
  }
);

const rendered = reportChain.renderReport(report, 'blocker-alert');
```

---

### 4. 每日汇总 (daily-summary)

**用途:** 记录员每日工作总结

**模板:**
```markdown
## [{{role}}] 每日汇总

**日期:** {{date}}
**分队:** {{division}}
**完成的任务:** {{completedTasks}}
**进行中的任务:** {{inProgressTasks}}
**知识沉淀:** {{knowledge}}
**问题与解决:** {{issues}}
**明日计划:** {{plan}}
```

**变量:**
- `date` - 日期
- `division` - 分队名称
- `completedTasks` - 完成的任务数
- `inProgressTasks` - 进行中的任务数
- `knowledge` - 知识沉淀内容
- `issues` - 问题与解决方案
- `plan` - 明日计划

**使用示例:**
```typescript
const report = reportChain.createReport(
  'SCRIBE',
  'scribe-001',
  'miiow',
  {
    task: '2026-03-13 每日汇总',
    status: 'completed',
    duration: 30,
    metadata: {
      date: '2026-03-13',
      division: 'miiow',
      completedTasks: '5',
      inProgressTasks: '2',
      knowledge: '新增 3 篇技术文档',
      issues: 'CI/CD 流水线偶发失败，已修复',
      plan: '继续完善测试覆盖率'
    }
  }
);

const rendered = reportChain.renderReport(report, 'daily-summary');
```

---

## 🔧 自定义模板

### 创建自定义模板

```typescript
import { ReportChain, type ReportTemplate } from './report-chain';

const reportChain = new ReportChain();

// 定义自定义模板
const customTemplate: ReportTemplate = {
  id: 'my-custom-template',
  name: '我的自定义模板',
  description: '用于特定场景的汇报',
  template: `## 自定义汇报

**任务:** {{task}}
**负责人:** {{assignee}}
**状态:** {{status}}
**备注:** {{notes}}
`,
  variables: ['task', 'assignee', 'status', 'notes']
};

// 注册模板
reportChain.registerTemplate(customTemplate);

// 使用模板
const report = reportChain.createReport(
  'WORKER',
  'worker-001',
  'miiow',
  {
    task: '自定义任务',
    status: 'completed',
    duration: 30,
    outputs: [],
    metadata: {
      assignee: '张三',
      notes: '任务顺利完成'
    }
  }
);

const rendered = reportChain.renderReport(report, 'my-custom-template');
```

---

## 📊 状态映射

| 内部状态 | 显示状态 | Emoji |
|---------|---------|-------|
| `completed` | 完成 | ✅ |
| `in-progress` | 进行中 | 🟡 |
| `failed` | 失败 | ❌ |

---

## 🎯 优先级定义

| 优先级 | 说明 | 响应要求 |
|-------|------|---------|
| P0 | 紧急/阻塞 | 立即处理 |
| P1 | 高优先级 | 2 小时内 |
| P2 | 普通优先级 | 24 小时内 |
| P3 | 低优先级 | 本周内 |

---

## 📁 汇报存储结构

```
~/.openclaw/memory/divisions/{division}/shared/reports/
├── 2026-03-13/
│   ├── rpt_1234567890_abc123.md
│   └── rpt_1234567890_abc123.json
├── 2026-03-14/
│   └── ...
└── ...
```

- `.md` 文件：人类可读的汇报内容
- `.json` 文件：机器可读的结构化数据

---

## 🔍 汇报筛选

```typescript
const collector = new ReportCollector();

// 按分队筛选
const miiowReports = collector.filterReports(allReports, {
  divisionId: 'miiow'
});

// 按角色筛选
const workerReports = collector.filterReports(allReports, {
  role: 'WORKER'
});

// 按状态筛选
const completedReports = collector.filterReports(allReports, {
  status: 'completed'
});

// 按时间范围筛选
const thisWeekReports = collector.filterReports(allReports, {
  startTime: new Date('2026-03-11'),
  endTime: new Date('2026-03-17')
});

// 组合筛选
const recentFailedReports = collector.filterReports(allReports, {
  divisionId: 'bot01',
  status: 'failed',
  startTime: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24 小时内
  limit: 10
});
```

---

## 📝 最佳实践

1. **及时汇报** - 任务完成或遇到阻塞立即汇报
2. **信息完整** - 填写所有相关字段，特别是问题和下一步
3. **优先级准确** - 根据实际情况选择正确的优先级
4. **附件完整** - 上传相关产出文件路径
5. **定期汇总** - 记录员每日整理分队工作汇报

---

**版本:** 1.0  
**最后更新:** 2026-03-13  
**维护者:** ACE (Axon Core Engineer)
