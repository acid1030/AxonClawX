/** 与 AxonClawX 界面一致的中文标题与描述（覆盖 metadata 英文） */
export interface MultiAgentTemplateZhLabel {
  name: string;
  description: string;
  workflowDescription?: string;
  agents?: Record<string, { name?: string; role?: string }>;
  workflowSteps?: string[];
  examples?: string[];
}

export const MULTI_AGENT_TEMPLATE_ZH: Record<string, MultiAgentTemplateZhLabel> = {
  'content-factory': {
    name: '内容工厂',
    description: '研究、写作、编辑、发布的端到端内容生产流水线',
    workflowDescription: '四阶段内容生产流水线',
    agents: {
      researcher: { name: '研究员', role: '信息收集与分析' },
      writer: { name: '写作员', role: '撰写初稿' },
      editor: { name: '编辑', role: '审校与优化内容' },
      publisher: { name: '发布员', role: '排版与分发' },
    },
    workflowSteps: [
      '调研主题并整理简报',
      '基于调研撰写初稿',
      '审校并优化内容',
      '排版并发布',
    ],
    examples: [
      '创建一篇关于 2026 年 AI 趋势的博客文章',
      '制作一份效率技巧主题的电子简报',
      '撰写并发布产品发布公告',
    ],
  },
  'research-team': {
    name: '研究团队',
    description: '由首席研究员、分析师和评审员组成的协作研究团队',
    workflowDescription: '并行研究与批判评审流程',
    agents: {
      'lead-researcher': { name: '首席研究员', role: '统筹研究并综合结论' },
      'data-analyst': { name: '数据分析师', role: '分析数据并发现模式' },
      'domain-expert': { name: '领域专家', role: '提供专业领域知识' },
      critic: { name: '批判评审员', role: '质疑假设并验证结论' },
    },
    workflowSteps: [
      '定义研究范围',
      '并行开展分析',
      '审阅并挑战研究结论',
      '综合产出最终报告',
    ],
    examples: [
      '研究 AI 对医疗行业的影响',
      '分析电动车市场趋势',
      '调研远程办公的最佳实践',
    ],
  },
  'devops-team': {
    name: 'DevOps 团队',
    description: '自动化事件响应和基础设施管理团队',
    workflowDescription: '事件驱动的故障响应流程',
    agents: {
      monitor: { name: '监控员', role: '监测系统并发现异常' },
      responder: { name: '响应员', role: '快速分诊与初步修复' },
      engineer: { name: 'SRE 工程师', role: '深度排障与修复' },
      communicator: { name: '沟通员', role: '同步进展给相关方' },
    },
    workflowSteps: [
      '发现问题并触发告警',
      '分诊并进行初步响应',
      '修复问题并同步沟通',
      '进行事故复盘',
    ],
    examples: [
      '处理服务器宕机',
      '响应 CPU 高负载告警',
      '处理安全事件',
    ],
  },
  'customer-support': {
    name: '客户支持团队',
    description: '分级客户支持与工单路由、升级处理',
    workflowDescription: '分层支持与升级路由',
    agents: {
      greeter: { name: '接待员', role: '初次接待与路由分流' },
      specialist: { name: '支持专员', role: '处理常见问题' },
      supervisor: { name: '主管', role: '处理升级问题' },
    },
    workflowSteps: [
      '接待用户并分类请求',
      '处理问题或升级',
      '处理升级问题',
    ],
    examples: [
      '协助客户处理账单问题',
      '排查产品使用故障',
      '处理服务投诉',
    ],
  },
  'data-pipeline': {
    name: '数据管道',
    description: '采集、清洗、分析与报表的自动化数据流水线',
    workflowDescription: '包含分析阶段的 ETL 流程',
    agents: {
      collector: { name: '采集员', role: '从多来源采集数据' },
      processor: { name: '处理员', role: '清洗并转换数据' },
      analyzer: { name: '分析员', role: '分析数据并提炼洞察' },
      reporter: { name: '报告员', role: '生成报表与可视化' },
    },
    workflowSteps: [
      '从数据源采集数据',
      '清洗并转换数据',
      '分析数据并提炼洞察',
      '生成分析报告',
    ],
    examples: [
      '分析每周销售数据',
      '生成月度绩效报告',
      '处理并分析用户行为数据',
    ],
  },
};
