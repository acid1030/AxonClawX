/**
 * Report Generator Pro - KAEL 专业报告生成工具
 * 
 * @module report-generator-pro
 * @author KAEL Engineering
 * @version 1.0.0
 * 
 * 功能:
 * 1. 报告模板系统 - 预定义多种报告模板
 * 2. 数据填充引擎 - 自动填充数据到模板
 * 3. 多格式导出 - 支持 Markdown/PDF/HTML/JSON
 */

// ============================================================================
// 类型定义
// ============================================================================

export type ReportFormat = 'markdown' | 'html' | 'pdf' | 'json';

export type ReportTemplateType = 
  | 'technical-design'
  | 'project-report'
  | 'code-review'
  | 'performance-analysis'
  | 'security-audit'
  | 'delivery-report'
  | 'custom';

export interface ReportSection {
  title: string;
  content: string;
  subsections?: ReportSection[];
}

export interface ReportTemplate {
  id: string;
  name: string;
  type: ReportTemplateType;
  description: string;
  sections: ReportSection[];
  metadata?: Record<string, any>;
}

export interface ReportData {
  title: string;
  author: string;
  date: string;
  version?: string;
  sections: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface ReportConfig {
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

export interface GeneratedReport {
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

// ============================================================================
// 报告模板库
// ============================================================================

export const REPORT_TEMPLATES: Record<ReportTemplateType, ReportTemplate> = {
  'technical-design': {
    id: 'tech-design-001',
    name: '技术设计文档',
    type: 'technical-design',
    description: 'RFC/TDD 撰写、架构设计文档、技术方案评审',
    sections: [
      {
        title: '1. 背景与目标',
        content: `## 1.1 背景\n{background}\n\n## 1.2 设计目标\n{goals}`
      },
      {
        title: '2. 架构设计',
        content: `## 2.1 系统架构\n{architecture}\n\n## 2.2 数据流\n{dataFlow}`
      },
      {
        title: '3. 接口设计',
        content: `## 3.1 API 规范\n{apiSpec}\n\n## 3.2 数据模型\n{dataModel}`
      },
      {
        title: '4. 技术选型',
        content: `| 需求 | 方案 | 理由 |\n|------|------|------|\n{techSelection}`
      },
      {
        title: '5. 实施计划',
        content: `## 5.1 里程碑\n{milestones}\n\n## 5.2 风险评估\n{risks}`
      }
    ]
  },

  'project-report': {
    id: 'proj-report-001',
    name: '项目进度报告',
    type: 'project-report',
    description: '项目状态、进度追踪、风险汇报',
    sections: [
      {
        title: '1. 项目概览',
        content: `## 1.1 项目信息\n- **项目名称**: {projectName}\n- **报告周期**: {reportPeriod}\n- **负责人**: {owner}\n\n## 1.2 整体状态\n{overallStatus}`
      },
      {
        title: '2. 本周进展',
        content: `## 2.1 完成事项\n{completedItems}\n\n## 2.2 进行中事项\n{inProgressItems}`
      },
      {
        title: '3. 风险与问题',
        content: `| 风险/问题 | 严重程度 | 影响 | 缓解措施 |\n|-----------|----------|------|----------|\n{risks}`
      },
      {
        title: '4. 下周计划',
        content: `{nextWeekPlan}`
      },
      {
        title: '5. 需要支持',
        content: `{supportNeeded}`
      }
    ]
  },

  'code-review': {
    id: 'code-review-001',
    name: '代码审查报告',
    type: 'code-review',
    description: '代码质量评估、问题发现、改进建议',
    sections: [
      {
        title: '1. 审查概览',
        content: `## 1.1 审查信息\n- **PR/Commit**: {prNumber}\n- **审查人**: {reviewer}\n- **审查日期**: {reviewDate}\n\n## 1.2 审查范围\n{scope}`
      },
      {
        title: '2. 优点',
        content: `{strengths}`
      },
      {
        title: '3. 发现问题',
        content: `### 3.1 严重问题\n{criticalIssues}\n\n### 3.2 一般问题\n{majorIssues}\n\n### 3.3 建议改进\n{suggestions}`
      },
      {
        title: '4. 检查清单',
        content: `- [ ] 逻辑正确性\n- [ ] 错误处理\n- [ ] 边界条件\n- [ ] 性能影响\n- [ ] 安全风险\n- [ ] 测试覆盖\n- [ ] 文档完整`
      },
      {
        title: '5. 审查结论',
        content: `**结论**: {conclusion}\n\n**优先级**: {priority}`
      }
    ]
  },

  'performance-analysis': {
    id: 'perf-analysis-001',
    name: '性能分析报告',
    type: 'performance-analysis',
    description: '性能基准、瓶颈分析、优化建议',
    sections: [
      {
        title: '1. 测试环境',
        content: `## 1.1 硬件配置\n{hardware}\n\n## 1.2 软件环境\n{software}`
      },
      {
        title: '2. 基准测试',
        content: `| 指标 | 基准值 | 当前值 | 变化 |\n|------|--------|--------|------|\n{benchmarks}`
      },
      {
        title: '3. 性能分析',
        content: `## 3.1 瓶颈识别\n{bottlenecks}\n\n## 3.2 热点分析\n{hotspots}`
      },
      {
        title: '4. 优化建议',
        content: `### 4.1 短期优化 (1-2 天)\n{quickWins}\n\n### 4.2 中期优化 (1-2 周)\n{midTerm}\n\n### 4.3 长期优化 (1 月+)\n{longTerm}`
      },
      {
        title: '5. 预期收益',
        content: `{expectedImprovement}`
      }
    ]
  },

  'security-audit': {
    id: 'security-audit-001',
    name: '安全审计报告',
    type: 'security-audit',
    description: '安全漏洞扫描、风险评估、加固建议',
    sections: [
      {
        title: '1. 审计范围',
        content: `## 1.1 审计目标\n{auditGoals}\n\n## 1.2 审计范围\n{scope}`
      },
      {
        title: '2. 发现漏洞',
        content: `| CVE/ID | 严重程度 | 描述 | 影响组件 |\n|--------|----------|------|----------|\n{vulnerabilities}`
      },
      {
        title: '3. 风险评估',
        content: `### 3.1 高风险\n{highRisks}\n\n### 3.2 中风险\n{mediumRisks}\n\n### 3.3 低风险\n{lowRisks}`
      },
      {
        title: '4. 加固建议',
        content: `{recommendations}`
      },
      {
        title: '5. 合规检查',
        content: `- [ ] 密码策略\n- [ ] 访问控制\n- [ ] 数据加密\n- [ ] 日志审计\n- [ ] 安全更新`
      }
    ]
  },

  'delivery-report': {
    id: 'delivery-report-001',
    name: '交付报告',
    type: 'delivery-report',
    description: '功能交付、验收确认、交付清单',
    sections: [
      {
        title: '1. 交付概览',
        content: `## 1.1 交付信息\n- **功能名称**: {featureName}\n- **交付日期**: {deliveryDate}\n- **版本号**: {version}\n\n## 1.2 交付状态\n{deliveryStatus}`
      },
      {
        title: '2. 交付清单',
        content: `### 2.1 代码交付\n{codeDeliverables}\n\n### 2.2 文档交付\n{docDeliverables}\n\n### 2.3 测试交付\n{testDeliverables}`
      },
      {
        title: '3. 验收标准',
        content: `| 标准 | 要求 | 实际 | 状态 |\n|------|------|------|------|\n{acceptanceCriteria}`
      },
      {
        title: '4. 已知问题',
        content: `{knownIssues}`
      },
      {
        title: '5. 后续计划',
        content: `{followUpPlan}`
      }
    ]
  },

  'custom': {
    id: 'custom-001',
    name: '自定义报告',
    type: 'custom',
    description: '用户自定义模板',
    sections: []
  }
};

// ============================================================================
// 报告生成引擎
// ============================================================================

export class ReportGeneratorPro {
  private templates: Map<string, ReportTemplate>;

  constructor() {
    this.templates = new Map();
    this.loadDefaultTemplates();
  }

  /**
   * 加载默认模板
   */
  private loadDefaultTemplates(): void {
    Object.values(REPORT_TEMPLATES).forEach(template => {
      this.templates.set(template.id, template);
    });
  }

  /**
   * 注册自定义模板
   */
  public registerTemplate(template: ReportTemplate): void {
    this.templates.set(template.id, template);
  }

  /**
   * 获取模板
   */
  public getTemplate(templateId: string): ReportTemplate | undefined {
    return this.templates.get(templateId);
  }

  /**
   * 列出所有可用模板
   */
  public listTemplates(): ReportTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * 填充模板数据
   */
  private fillTemplate(template: ReportTemplate, data: ReportData): string {
    let content = `# ${data.title}\n\n`;
    
    // 添加元数据
    content += `**作者**: ${data.author}  \n`;
    content += `**日期**: ${data.date}`;
    if (data.version) {
      content += `  \n**版本**: ${data.version}`;
    }
    content += `\n\n---\n\n`;

    // 填充各章节
    template.sections.forEach((section, index) => {
      content += `${section.title}\n\n`;
      
      let sectionContent = section.content;
      
      // 替换占位符
      Object.entries(data.sections).forEach(([key, value]) => {
        const placeholder = new RegExp(`\\{${key}\\}`, 'g');
        sectionContent = sectionContent.replace(placeholder, String(value));
      });
      
      // 清理未替换的占位符
      sectionContent = sectionContent.replace(/\{[^}]+\}/g, '_待补充_');
      
      content += `${sectionContent}\n\n`;
      
      // 添加子章节
      if (section.subsections) {
        section.subsections.forEach(sub => {
          content += `### ${sub.title}\n\n${sub.content}\n\n`;
        });
      }
    });

    return content;
  }

  /**
   * 生成 Markdown 报告
   */
  public generateMarkdown(config: ReportConfig): string {
    const template = this.templates.get(config.templateId);
    if (!template) {
      throw new Error(`Template not found: ${config.templateId}`);
    }

    return this.fillTemplate(template, config.data);
  }

  /**
   * 生成 HTML 报告
   */
  public generateHTML(config: ReportConfig): string {
    const markdown = this.generateMarkdown(config);
    
    // 简单的 Markdown 转 HTML
    const html = markdown
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/gim, '<em>$1</em>')
      .replace(/\n/gim, '<br>');

    const theme = config.options?.theme || 'professional';
    
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${config.data.title}</title>
  <style>
    :root {
      --bg-primary: ${theme === 'dark' ? '#0a0a0f' : '#ffffff'};
      --text-primary: ${theme === 'dark' ? '#e0e0e0' : '#1a1a1a'};
      --accent: #6366f1;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: var(--bg-primary);
      color: var(--text-primary);
      max-width: 800px;
      margin: 0 auto;
      padding: 40px 20px;
      line-height: 1.6;
    }
    h1, h2, h3 { color: var(--accent); }
    table { border-collapse: collapse; width: 100%; margin: 20px 0; }
    th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
    th { background: var(--accent); color: white; }
  </style>
</head>
<body>
  ${html}
</body>
</html>`;
  }

  /**
   * 生成 JSON 报告
   */
  public generateJSON(config: ReportConfig): string {
    const report = {
      metadata: {
        title: config.data.title,
        author: config.data.author,
        date: config.data.date,
        version: config.data.version,
        template: config.templateId,
        generatedAt: new Date().toISOString()
      },
      sections: config.data.sections,
      customMetadata: config.data.metadata
    };

    return JSON.stringify(report, null, 2);
  }

  /**
   * 生成 PDF 报告 (需要外部工具)
   */
  public async generatePDF(config: ReportConfig): Promise<string> {
    // PDF 生成需要外部工具 (如 puppeteer, pdfkit)
    // 这里返回 HTML，用户可以自行转换
    const html = this.generateHTML(config);
    
    return `<!-- PDF 生成提示 -->
<!-- 使用以下方法将 HTML 转换为 PDF: -->
<!-- 1. puppeteer: await page.pdf({ path: 'report.pdf' }) -->
<!-- 2. 浏览器打印: Ctrl+P → 另存为 PDF -->
<!-- 3. 在线工具: https://www.html2pdf.com/ -->

${html}`;
  }

  /**
   * 生成报告 (主方法)
   */
  public async generate(config: ReportConfig): Promise<GeneratedReport> {
    const startTime = Date.now();
    
    try {
      let content: string;
      
      switch (config.format) {
        case 'markdown':
          content = this.generateMarkdown(config);
          break;
        case 'html':
          content = this.generateHTML(config);
          break;
        case 'json':
          content = this.generateJSON(config);
          break;
        case 'pdf':
          content = await this.generatePDF(config);
          break;
        default:
          throw new Error(`Unsupported format: ${config.format}`);
      }

      const wordCount = content.split(/\s+/).length;
      const sectionCount = Object.keys(config.data.sections).length;

      return {
        success: true,
        format: config.format,
        content,
        outputPath: config.outputPath,
        metadata: {
          generatedAt: new Date().toISOString(),
          templateUsed: config.templateId,
          sectionCount,
          wordCount
        }
      };
    } catch (error) {
      return {
        success: false,
        format: config.format,
        content: '',
        metadata: {
          generatedAt: new Date().toISOString(),
          templateUsed: config.templateId,
          sectionCount: 0,
          wordCount: 0
        }
      };
    }
  }
}

// ============================================================================
// 便捷函数
// ============================================================================

/**
 * 快速生成技术设计文档
 */
export async function generateTechnicalDesign(data: {
  title: string;
  author: string;
  background: string;
  goals: string[];
  architecture: string;
  apiSpec: string;
}): Promise<GeneratedReport> {
  const generator = new ReportGeneratorPro();
  
  const config: ReportConfig = {
    templateId: REPORT_TEMPLATES['technical-design'].id,
    data: {
      title: data.title,
      author: data.author,
      date: new Date().toISOString().split('T')[0],
      sections: {
        background: data.background,
        goals: data.goals.map(g => `- ${g}`).join('\n'),
        architecture: data.architecture,
        apiSpec: data.apiSpec
      }
    },
    format: 'markdown'
  };

  return generator.generate(config);
}

/**
 * 快速生成项目进度报告
 */
export async function generateProjectReport(data: {
  title: string;
  author: string;
  projectName: string;
  reportPeriod: string;
  completedItems: string[];
  inProgressItems: string[];
  risks: Array<{ issue: string; severity: string; impact: string; mitigation: string }>;
}): Promise<GeneratedReport> {
  const generator = new ReportGeneratorPro();
  
  const config: ReportConfig = {
    templateId: REPORT_TEMPLATES['project-report'].id,
    data: {
      title: data.title,
      author: data.author,
      date: new Date().toISOString().split('T')[0],
      sections: {
        projectName: data.projectName,
        reportPeriod: data.reportPeriod,
        owner: data.author,
        completedItems: data.completedItems.map(i => `- ✅ ${i}`).join('\n'),
        inProgressItems: data.inProgressItems.map(i => `- 🔄 ${i}`).join('\n'),
        risks: data.risks.map(r => `| ${r.issue} | ${r.severity} | ${r.impact} | ${r.mitigation} |`).join('\n')
      }
    },
    format: 'markdown'
  };

  return generator.generate(config);
}

/**
 * 快速生成代码审查报告
 */
export async function generateCodeReview(data: {
  prNumber: string;
  reviewer: string;
  scope: string;
  strengths: string[];
  criticalIssues: string[];
  majorIssues: string[];
  suggestions: string[];
  conclusion: 'approved' | 'changes_requested' | 'commented';
}): Promise<GeneratedReport> {
  const generator = new ReportGeneratorPro();
  
  const config: ReportConfig = {
    templateId: REPORT_TEMPLATES['code-review'].id,
    data: {
      title: `代码审查报告 - ${data.prNumber}`,
      author: data.reviewer,
      date: new Date().toISOString().split('T')[0],
      sections: {
        prNumber: data.prNumber,
        reviewer: data.reviewer,
        reviewDate: new Date().toISOString().split('T')[0],
        scope: data.scope,
        strengths: data.strengths.map(s => `- ✅ ${s}`).join('\n'),
        criticalIssues: data.criticalIssues.map(i => `- 🔴 ${i}`).join('\n'),
        majorIssues: data.majorIssues.map(i => `- 🟡 ${i}`).join('\n'),
        suggestions: data.suggestions.map(s => `- 💡 ${s}`).join('\n'),
        conclusion: data.conclusion,
        priority: data.conclusion === 'approved' ? '低' : '高'
      }
    },
    format: 'markdown'
  };

  return generator.generate(config);
}

// ============================================================================
// 使用示例
// ============================================================================

/**
 * 使用示例 1: 生成技术设计文档
 */
export async function exampleTechnicalDesign(): Promise<void> {
  const generator = new ReportGeneratorPro();
  
  const config: ReportConfig = {
    templateId: REPORT_TEMPLATES['technical-design'].id,
    data: {
      title: '用户认证模块技术设计',
      author: 'KAEL',
      date: '2026-03-13',
      version: '1.0.0',
      sections: {
        background: '当前系统缺少统一的用户认证机制，需要实现 JWT + OAuth2.0 方案',
        goals: '- 支持多因素认证\n- 实现单点登录 (SSO)\n- 支持第三方登录',
        architecture: '采用分层架构：Controller → Service → Repository',
        dataFlow: '用户 → API Gateway → Auth Service → Database',
        apiSpec: 'POST /api/auth/login, POST /api/auth/register, GET /api/auth/profile',
        dataModel: 'User: { id, email, passwordHash, createdAt }',
        techSelection: '| 认证 | JWT | 无状态，易扩展 |\n| 加密 | bcrypt | 行业标准 |',
        milestones: 'Week 1: 基础认证 | Week 2: MFA | Week 3: OAuth',
        risks: '| 风险 | 令牌泄露 | 使用 HTTPS + 短有效期 |'
      }
    },
    format: 'markdown',
    options: {
      includeTOC: true,
      theme: 'professional'
    }
  };

  const report = await generator.generate(config);
  console.log('报告生成:', report.success ? '成功' : '失败');
  console.log('字数:', report.metadata.wordCount);
}

/**
 * 使用示例 2: 生成项目进度报告
 */
export async function exampleProjectReport(): Promise<void> {
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
      { issue: '依赖版本冲突', severity: '中', impact: '构建失败', mitigation: '锁定依赖版本' }
    ]
  });

  console.log('项目报告:', report.content);
}

/**
 * 使用示例 3: 生成代码审查报告
 */
export async function exampleCodeReview(): Promise<void> {
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
    conclusion: 'changes_requested'
  });

  console.log('代码审查报告:', report.content);
}

/**
 * 使用示例 4: 自定义模板
 */
export async function exampleCustomTemplate(): Promise<void> {
  const generator = new ReportGeneratorPro();
  
  // 注册自定义模板
  generator.registerTemplate({
    id: 'daily-standup-001',
    name: '每日站会报告',
    type: 'custom',
    description: '每日站会模板',
    sections: [
      {
        title: '昨日完成',
        content: `{yesterday}`
      },
      {
        title: '今日计划',
        content: `{today}`
      },
      {
        title: '阻碍',
        content: `{blockers}`
      }
    ]
  });

  const config: ReportConfig = {
    templateId: 'daily-standup-001',
    data: {
      title: '每日站会 - 2026-03-13',
      author: 'KAEL',
      date: '2026-03-13',
      sections: {
        yesterday: '- 完成报告生成器开发',
        today: '- 代码审查\n- 技术分享准备',
        blockers: '无'
      }
    },
    format: 'markdown'
  };

  const report = await generator.generate(config);
  console.log('站会报告:', report.content);
}

// ============================================================================
// 导出
// ============================================================================

export default ReportGeneratorPro;
