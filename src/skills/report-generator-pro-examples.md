# Report Generator Pro - 使用示例

**版本:** 1.0.0  
**作者:** KAEL Engineering  
**创建日期:** 2026-03-13

---

## 📦 快速开始

### 安装

```bash
# 无需额外依赖，纯 TypeScript 实现
# 直接导入即可使用
```

### 基础用法

```typescript
import ReportGeneratorPro, { 
  REPORT_TEMPLATES,
  generateTechnicalDesign,
  generateProjectReport,
  generateCodeReview
} from './report-generator-pro-skill';

// 创建生成器实例
const generator = new ReportGeneratorPro();
```

---

## 📋 示例 1: 技术设计文档

```typescript
import { generateTechnicalDesign } from './report-generator-pro-skill';

async function createTechnicalDesign() {
  const report = await generateTechnicalDesign({
    title: '用户认证模块技术设计',
    author: 'KAEL',
    background: '当前系统缺少统一的用户认证机制，需要实现 JWT + OAuth2.0 方案',
    goals: [
      '支持多因素认证',
      '实现单点登录 (SSO)',
      '支持第三方登录'
    ],
    architecture: '采用分层架构：Controller → Service → Repository',
    apiSpec: `
POST /api/auth/login
POST /api/auth/register
GET /api/auth/profile
    `
  });

  console.log('报告内容:', report.content);
  // 保存到文件
  fs.writeFileSync('tech-design.md', report.content);
}
```

**输出示例:**

```markdown
# 用户认证模块技术设计

**作者**: KAEL  
**日期**: 2026-03-13  
**版本**: 1.0.0

---

## 1. 背景与目标

### 1.1 背景
当前系统缺少统一的用户认证机制，需要实现 JWT + OAuth2.0 方案

### 1.2 设计目标
- 支持多因素认证
- 实现单点登录 (SSO)
- 支持第三方登录

## 2. 架构设计

### 2.1 系统架构
采用分层架构：Controller → Service → Repository

...
```

---

## 📋 示例 2: 项目进度报告

```typescript
import { generateProjectReport } from './report-generator-pro-skill';

async function createWeeklyReport() {
  const report = await generateProjectReport({
    title: 'AxonClaw 项目周报',
    author: 'KAEL',
    projectName: 'AxonClaw',
    reportPeriod: '2026-03-06 ~ 2026-03-13',
    completedItems: [
      '完成 Gateway 模块重构',
      '实现 Agent 心跳机制',
      '添加 Channel 适配器'
    ],
    inProgressItems: [
      'Memory 系统优化',
      'UI 组件库开发'
    ],
    risks: [
      { 
        issue: '依赖版本冲突', 
        severity: '中', 
        impact: '构建失败', 
        mitigation: '锁定依赖版本' 
      }
    ]
  });

  console.log('周报内容:', report.content);
}
```

**输出示例:**

```markdown
# AxonClaw 项目周报

**作者**: KAEL  
**日期**: 2026-03-13

---

## 1. 项目概览

### 1.1 项目信息
- **项目名称**: AxonClaw
- **报告周期**: 2026-03-06 ~ 2026-03-13
- **负责人**: KAEL

### 1.2 整体状态
🟢 正常推进

## 2. 本周进展

### 2.1 完成事项
- ✅ 完成 Gateway 模块重构
- ✅ 实现 Agent 心跳机制
- ✅ 添加 Channel 适配器

### 2.2 进行中事项
- 🔄 Memory 系统优化
- 🔄 UI 组件库开发

## 3. 风险与问题

| 风险/问题 | 严重程度 | 影响 | 缓解措施 |
|-----------|----------|------|----------|
| 依赖版本冲突 | 中 | 构建失败 | 锁定依赖版本 |

...
```

---

## 📋 示例 3: 代码审查报告

```typescript
import { generateCodeReview } from './report-generator-pro-skill';

async function createCodeReview() {
  const report = await generateCodeReview({
    prNumber: 'PR-123',
    reviewer: 'KAEL',
    scope: 'src/renderer/components/AgentCard.tsx',
    strengths: [
      '组件结构清晰',
      '类型定义完整',
      '注释充分'
    ],
    criticalIssues: [],
    majorIssues: [
      '缺少错误边界处理',
      '未处理加载状态'
    ],
    suggestions: [
      '添加单元测试',
      '考虑使用 memo 优化性能'
    ],
    conclusion: 'changes_requested' // 'approved' | 'changes_requested' | 'commented'
  });

  console.log('审查报告:', report.content);
}
```

---

## 📋 示例 4: 使用完整 API

```typescript
import ReportGeneratorPro, { REPORT_TEMPLATES, ReportConfig } from './report-generator-pro-skill';

async function advancedUsage() {
  const generator = new ReportGeneratorPro();

  // 1. 查看所有可用模板
  const templates = generator.listTemplates();
  console.log('可用模板:', templates.map(t => t.name));

  // 2. 获取特定模板
  const techDesignTemplate = generator.getTemplate(
    REPORT_TEMPLATES['technical-design'].id
  );

  // 3. 配置报告
  const config: ReportConfig = {
    templateId: REPORT_TEMPLATES['technical-design'].id,
    data: {
      title: '高性能缓存系统设计',
      author: 'KAEL',
      date: '2026-03-13',
      version: '2.0.0',
      sections: {
        background: '当前查询响应时间超过 500ms，需要引入缓存层',
        goals: '- P99 延迟 < 100ms\n- 缓存命中率 > 90%',
        architecture: 'Redis Cluster + Local LRU Cache',
        dataFlow: 'Client → API → Cache Layer → Database',
        apiSpec: 'GET /api/data, POST /api/cache/invalidate',
        dataModel: 'CacheEntry: { key, value, ttl, createdAt }',
        techSelection: '| 缓存 | Redis | 高性能，支持集群 |\n| 序列化 | Protocol Buffers | 紧凑，快速 |',
        milestones: 'Week 1: 基础实现 | Week 2: 性能测试 | Week 3: 上线',
        risks: '| 风险 | 缓存穿透 | 使用布隆过滤器 |'
      }
    },
    format: 'markdown', // 'markdown' | 'html' | 'pdf' | 'json'
    options: {
      includeTOC: true,
      includeHeader: true,
      includeFooter: true,
      theme: 'professional' // 'light' | 'dark' | 'professional'
    }
  };

  // 4. 生成报告
  const report = await generator.generate(config);

  if (report.success) {
    console.log('✅ 报告生成成功');
    console.log('格式:', report.format);
    console.log('字数:', report.metadata.wordCount);
    console.log('章节数:', report.metadata.sectionCount);
    console.log('生成时间:', report.metadata.generatedAt);
    
    // 5. 保存报告
    fs.writeFileSync('cache-system-design.md', report.content);
  } else {
    console.error('❌ 报告生成失败');
  }
}
```

---

## 📋 示例 5: 多格式导出

```typescript
import ReportGeneratorPro, { ReportConfig } from './report-generator-pro-skill';

async function exportMultipleFormats() {
  const generator = new ReportGeneratorPro();

  const baseConfig: ReportConfig = {
    templateId: REPORT_TEMPLATES['project-report'].id,
    data: {
      title: 'Q1 季度报告',
      author: 'KAEL',
      date: '2026-03-13',
      sections: {
        projectName: 'AxonClaw',
        reportPeriod: '2026-Q1',
        owner: 'KAEL',
        completedItems: '- 完成核心功能开发',
        inProgressItems: '- 性能优化',
        risks: '| 风险 | 低 | 小 | 持续监控 |',
        nextWeekPlan: '继续性能优化',
        supportNeeded: '无'
      }
    },
    format: 'markdown'
  };

  // 生成 Markdown
  const mdReport = await generator.generate({ ...baseConfig, format: 'markdown' });
  fs.writeFileSync('report.md', mdReport.content);

  // 生成 HTML
  const htmlReport = await generator.generate({ ...baseConfig, format: 'html' });
  fs.writeFileSync('report.html', htmlReport.content);

  // 生成 JSON
  const jsonReport = await generator.generate({ ...baseConfig, format: 'json' });
  fs.writeFileSync('report.json', jsonReport.content);

  // 生成 PDF (需要额外工具转换)
  const pdfReport = await generator.generate({ ...baseConfig, format: 'pdf' });
  fs.writeFileSync('report.pdf.html', pdfReport.content);
  console.log('提示：使用浏览器打开 report.pdf.html，然后打印为 PDF');
}
```

---

## 📋 示例 6: 自定义模板

```typescript
import ReportGeneratorPro, { ReportTemplate, ReportConfig } from './report-generator-pro-skill';

async function createCustomTemplate() {
  const generator = new ReportGeneratorPro();

  // 注册自定义模板
  const dailyStandupTemplate: ReportTemplate = {
    id: 'daily-standup-001',
    name: '每日站会报告',
    type: 'custom',
    description: '敏捷开发每日站会模板',
    sections: [
      {
        title: '📅 日期',
        content: `{date}`
      },
      {
        title: '✅ 昨日完成',
        content: `{yesterday}`
      },
      {
        title: '🎯 今日计划',
        content: `{today}`
      },
      {
        title: '🚧 阻碍',
        content: `{blockers}`
      },
      {
        title: '📝 备注',
        content: `{notes}`
      }
    ]
  };

  generator.registerTemplate(dailyStandupTemplate);

  // 使用自定义模板
  const config: ReportConfig = {
    templateId: 'daily-standup-001',
    data: {
      title: '每日站会 - 2026-03-13',
      author: 'KAEL',
      date: '2026-03-13',
      sections: {
        yesterday: '- 完成报告生成器开发\n- 代码审查 3 个 PR',
        today: '- 技术分享准备\n- 架构设计评审',
        blockers: '等待设计资源',
        notes: '周五团队建设活动'
      }
    },
    format: 'markdown'
  };

  const report = await generator.generate(config);
  console.log('站会报告:', report.content);
}
```

---

## 📋 示例 7: 批量生成报告

```typescript
import ReportGeneratorPro, { REPORT_TEMPLATES } from './report-generator-pro-skill';

async function batchGenerateReports() {
  const generator = new ReportGeneratorPro();
  
  const projects = [
    { name: 'AxonClaw', owner: 'KAEL', status: '🟢' },
    { name: 'TaskBoard', owner: 'ARIA', status: '🟡' },
    { name: 'Memory', owner: 'NEXUS', status: '🟢' }
  ];

  const reports = await Promise.all(
    projects.map(async (project) => {
      const config = {
        templateId: REPORT_TEMPLATES['project-report'].id,
        data: {
          title: `${project.name} 项目周报`,
          author: project.owner,
          date: '2026-03-13',
          sections: {
            projectName: project.name,
            reportPeriod: '2026-W11',
            owner: project.owner,
            overallStatus: project.status,
            completedItems: '- 本周任务完成',
            inProgressItems: '- 进行中任务',
            risks: '| 无 | 低 | 无 | 无 |',
            nextWeekPlan: '继续推进',
            supportNeeded: '无'
          }
        },
        format: 'markdown' as const
      };

      return generator.generate(config);
    })
  );

  // 保存所有报告
  reports.forEach((report, index) => {
    const filename = `${projects[index].name.toLowerCase()}-report.md`;
    fs.writeFileSync(filename, report.content);
    console.log(`✅ 生成 ${filename}`);
  });
}
```

---

## 🎨 主题配置

```typescript
// 深色主题
const darkThemeConfig: ReportConfig = {
  // ... 其他配置
  options: {
    theme: 'dark'
  }
};

// 浅色主题
const lightThemeConfig: ReportConfig = {
  // ... 其他配置
  options: {
    theme: 'light'
  }
};

// 专业主题 (默认)
const professionalConfig: ReportConfig = {
  // ... 其他配置
  options: {
    theme: 'professional'
  }
};
```

---

## 📊 可用模板列表

| 模板 ID | 名称 | 类型 | 描述 |
|---------|------|------|------|
| `tech-design-001` | 技术设计文档 | technical-design | RFC/TDD/架构设计 |
| `proj-report-001` | 项目进度报告 | project-report | 周报/月报/状态汇报 |
| `code-review-001` | 代码审查报告 | code-review | PR 审查/质量评估 |
| `perf-analysis-001` | 性能分析报告 | performance-analysis | 基准测试/优化建议 |
| `security-audit-001` | 安全审计报告 | security-audit | 漏洞扫描/风险评估 |
| `delivery-report-001` | 交付报告 | delivery-report | 功能交付/验收 |
| `custom-001` | 自定义报告 | custom | 用户自定义 |

---

## 🔧 API 参考

### ReportGeneratorPro 类

#### 构造函数
```typescript
constructor()
```

#### 方法

| 方法 | 参数 | 返回值 | 描述 |
|------|------|--------|------|
| `registerTemplate` | `template: ReportTemplate` | `void` | 注册自定义模板 |
| `getTemplate` | `templateId: string` | `ReportTemplate \| undefined` | 获取模板 |
| `listTemplates` | - | `ReportTemplate[]` | 列出所有模板 |
| `generate` | `config: ReportConfig` | `Promise<GeneratedReport>` | 生成报告 |
| `generateMarkdown` | `config: ReportConfig` | `string` | 生成 Markdown |
| `generateHTML` | `config: ReportConfig` | `string` | 生成 HTML |
| `generateJSON` | `config: ReportConfig` | `string` | 生成 JSON |
| `generatePDF` | `config: ReportConfig` | `Promise<string>` | 生成 PDF (HTML) |

### 类型定义

```typescript
type ReportFormat = 'markdown' | 'html' | 'pdf' | 'json';

type ReportTemplateType = 
  | 'technical-design'
  | 'project-report'
  | 'code-review'
  | 'performance-analysis'
  | 'security-audit'
  | 'delivery-report'
  | 'custom';

interface ReportConfig {
  templateId: string;
  data: ReportData;
  format: ReportFormat;
  outputPath?: string;
  options?: {
    includeTOC?: boolean;
    includeHeader?: boolean;
    includeFooter?: boolean;
    theme?: 'light' | 'dark' | 'professional';
  };
}

interface GeneratedReport {
  success: boolean;
  format: ReportFormat;
  content: string;
  outputPath?: string;
  metadata: {
    generatedAt: string;
    templateUsed: string;
    sectionCount: number;
    wordCount: number;
  };
}
```

---

## ⚡ 最佳实践

### 1. 模板复用
```typescript
// ✅ 好：使用预定义模板
const report = await generateProjectReport({...});

// ❌ 差：每次都写完整配置
const config = { templateId: '...', data: {...}, format: 'markdown' };
```

### 2. 错误处理
```typescript
const report = await generator.generate(config);
if (!report.success) {
  console.error('生成失败，请检查模板 ID 和数据');
}
```

### 3. 文件命名
```typescript
// 使用有意义的文件名
const filename = `${data.title.toLowerCase().replace(/\s+/g, '-')}.md`;
```

### 4. 版本控制
```typescript
// 在元数据中包含版本信息
data: {
  title: '技术设计',
  version: '1.0.0', // 语义化版本
  // ...
}
```

---

## 🐛 常见问题

### Q: 如何添加新模板？
```typescript
generator.registerTemplate({
  id: 'my-template-001',
  name: '我的模板',
  type: 'custom',
  description: '描述',
  sections: [...]
});
```

### Q: 如何自定义样式？
HTML 格式支持自定义 CSS：
```typescript
const html = generator.generateHTML(config);
// 修改返回 HTML 中的 <style> 标签
```

### Q: 如何生成 PDF？
```typescript
// 方法 1: 使用 puppeteer
const report = await generator.generate({ format: 'pdf', ... });
const browser = await puppeteer.launch();
const page = await browser.newPage();
await page.setContent(report.content);
await page.pdf({ path: 'report.pdf' });

// 方法 2: 浏览器打印
const htmlReport = await generator.generate({ format: 'html', ... });
fs.writeFileSync('report.html', htmlReport.content);
// 打开 report.html → Ctrl+P → 另存为 PDF
```

---

## 📝 更新日志

### v1.0.0 (2026-03-13)
- ✅ 初始版本发布
- ✅ 7 种预定义模板
- ✅ 4 种导出格式
- ✅ 自定义模板支持
- ✅ 主题配置

---

**报告生成完成!** 🎉
