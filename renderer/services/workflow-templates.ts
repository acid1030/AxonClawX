/**
 * Workflow Templates - 预设工作流模板
 * 
 * 提供常用的多 Agent 协作工作流模板：
 * - 内容创作工作流
 * - 代码审查工作流
 * - 数据分析工作流
 * - 客服响应工作流
 * - 产品发布工作流
 */

import { WorkflowDefinition } from './agent-orchestrator';

/**
 * 1. 内容创作工作流 (ARIA→ZARA→REX→SCRIBE)
 * 
 * 流程：
 * ARIA (创意策划) → ZARA (内容撰写) → REX (审核优化) → SCRIBE (格式发布)
 */
export const contentCreationWorkflow: WorkflowDefinition = {
  id: 'content-creation',
  name: '内容创作工作流',
  description: '从创意到发布的完整内容创作流程',
  version: '1.0.0',
  agents: [
    {
      id: 'ARIA',
      name: 'ARIA',
      role: '创意策划师',
      description: '负责创意构思和内容规划',
      config: {
        temperature: 0.8,
        maxTokens: 2000,
      },
    },
    {
      id: 'ZARA',
      name: 'ZARA',
      role: '内容撰写师',
      description: '负责将创意转化为具体内容',
      config: {
        temperature: 0.7,
        maxTokens: 4000,
      },
    },
    {
      id: 'REX',
      name: 'REX',
      role: '内容审核师',
      description: '负责内容质量审核和优化建议',
      config: {
        temperature: 0.5,
        maxTokens: 2000,
      },
    },
    {
      id: 'SCRIBE',
      name: 'SCRIBE',
      role: '格式发布师',
      description: '负责格式化和多平台发布',
      config: {
        temperature: 0.3,
        maxTokens: 1000,
      },
    },
  ],
  nodes: [
    {
      id: 'node-aria-brief',
      agentId: 'ARIA',
      name: '创意策划',
      description: '分析需求，生成内容创意和大纲',
      input: {
        fromWorkflow: 'userRequirement',
      },
      output: {
        toWorkflow: 'contentBrief',
      },
      config: {
        prompt: '根据用户需求生成创意大纲',
      },
    },
    {
      id: 'node-zara-draft',
      agentId: 'ZARA',
      name: '内容撰写',
      description: '根据创意大纲撰写初稿',
      input: {
        fromNode: 'node-aria-brief',
      },
      dependencies: ['node-aria-brief'],
      output: {
        toWorkflow: 'contentDraft',
      },
      config: {
        prompt: '根据大纲撰写完整内容',
      },
    },
    {
      id: 'node-rex-review',
      agentId: 'REX',
      name: '审核优化',
      description: '审核内容质量，提出优化建议',
      input: {
        fromNode: 'node-zara-draft',
      },
      dependencies: ['node-zara-draft'],
      output: {
        toWorkflow: 'reviewFeedback',
      },
      config: {
        prompt: '审核内容并提供优化建议',
      },
    },
    {
      id: 'node-scribe-publish',
      agentId: 'SCRIBE',
      name: '格式发布',
      description: '格式化内容并准备发布',
      input: {
        fromNode: 'node-rex-review',
      },
      dependencies: ['node-rex-review'],
      output: {
        toWorkflow: 'publishedContent',
      },
      config: {
        prompt: '格式化内容并生成发布版本',
      },
    },
  ],
  entryNode: 'node-aria-brief',
  exitNode: 'node-scribe-publish',
  config: {
    parallel: false,
    timeout: 600, // 10 分钟
    onError: 'stop',
  },
  metadata: {
    category: 'content',
    tags: ['写作', '创意', '发布'],
    estimatedDuration: '5-10 分钟',
  },
};

/**
 * 2. 代码审查工作流 (ZARA→DANTE→REX→KAEL)
 * 
 * 流程：
 * ZARA (代码生成) → DANTE (静态分析) → REX (代码审查) → KAEL (工程决策)
 */
export const codeReviewWorkflow: WorkflowDefinition = {
  id: 'code-review',
  name: '代码审查工作流',
  description: '自动化代码审查和质量保证流程',
  version: '1.0.0',
  agents: [
    {
      id: 'ZARA',
      name: 'ZARA',
      role: '代码生成师',
      description: '负责代码生成和初步实现',
      config: {
        temperature: 0.3,
        maxTokens: 4000,
      },
    },
    {
      id: 'DANTE',
      name: 'DANTE',
      role: '代码分析专家',
      description: '负责静态代码分析和安全检测',
      config: {
        temperature: 0.2,
        maxTokens: 3000,
      },
    },
    {
      id: 'REX',
      name: 'REX',
      role: '代码审查师',
      description: '负责代码质量和最佳实践审查',
      config: {
        temperature: 0.4,
        maxTokens: 3000,
      },
    },
    {
      id: 'KAEL',
      name: 'KAEL',
      role: '工程总管',
      description: '负责技术决策和架构审核',
      config: {
        temperature: 0.3,
        maxTokens: 2000,
      },
    },
  ],
  nodes: [
    {
      id: 'node-zara-impl',
      agentId: 'ZARA',
      name: '代码实现',
      description: '根据需求生成代码实现',
      input: {
        fromWorkflow: 'codeRequirement',
      },
      output: {
        toWorkflow: 'generatedCode',
      },
    },
    {
      id: 'node-dante-analyze',
      agentId: 'DANTE',
      name: '静态分析',
      description: '执行静态代码分析和安全检测',
      input: {
        fromNode: 'node-zara-impl',
      },
      dependencies: ['node-zara-impl'],
      output: {
        toWorkflow: 'analysisReport',
      },
    },
    {
      id: 'node-rex-review',
      agentId: 'REX',
      name: '代码审查',
      description: '审查代码质量和最佳实践',
      input: {
        fromNode: 'node-dante-analyze',
      },
      dependencies: ['node-dante-analyze'],
      output: {
        toWorkflow: 'reviewComments',
      },
    },
    {
      id: 'node-kael-decision',
      agentId: 'KAEL',
      name: '工程决策',
      description: '做出最终技术决策和合并批准',
      input: {
        fromNode: 'node-rex-review',
      },
      dependencies: ['node-rex-review'],
      output: {
        toWorkflow: 'finalDecision',
      },
    },
  ],
  entryNode: 'node-zara-impl',
  exitNode: 'node-kael-decision',
  config: {
    parallel: false,
    timeout: 900, // 15 分钟
    onError: 'continue',
  },
  metadata: {
    category: 'engineering',
    tags: ['代码', '审查', '质量'],
    estimatedDuration: '10-15 分钟',
  },
};

/**
 * 3. 数据分析工作流 (ECHO→SAGE→ARIA→NEXUS)
 * 
 * 流程：
 * ECHO (数据采集) → SAGE (数据分析) → ARIA (洞察提炼) → NEXUS (战略决策)
 */
export const dataAnalysisWorkflow: WorkflowDefinition = {
  id: 'data-analysis',
  name: '数据分析工作流',
  description: '从数据采集到战略决策的完整分析流程',
  version: '1.0.0',
  agents: [
    {
      id: 'ECHO',
      name: 'ECHO',
      role: '数据采集专家',
      description: '负责数据采集和预处理',
      config: {
        temperature: 0.2,
        maxTokens: 2000,
      },
    },
    {
      id: 'SAGE',
      name: 'SAGE',
      role: '数据分析师',
      description: '负责统计分析和模式识别',
      config: {
        temperature: 0.3,
        maxTokens: 4000,
      },
    },
    {
      id: 'ARIA',
      name: 'ARIA',
      role: '洞察策划师',
      description: '负责从数据中提炼商业洞察',
      config: {
        temperature: 0.6,
        maxTokens: 3000,
      },
    },
    {
      id: 'NEXUS',
      name: 'NEXUS',
      role: '战略执行官',
      description: '负责战略决策和行动建议',
      config: {
        temperature: 0.4,
        maxTokens: 2000,
      },
    },
  ],
  nodes: [
    {
      id: 'node-echo-collect',
      agentId: 'ECHO',
      name: '数据采集',
      description: '采集和预处理数据',
      input: {
        fromWorkflow: 'dataSource',
      },
      output: {
        toWorkflow: 'processedData',
      },
    },
    {
      id: 'node-sage-analyze',
      agentId: 'SAGE',
      name: '数据分析',
      description: '执行统计分析和模式识别',
      input: {
        fromNode: 'node-echo-collect',
      },
      dependencies: ['node-echo-collect'],
      output: {
        toWorkflow: 'analysisResults',
      },
    },
    {
      id: 'node-aria-insights',
      agentId: 'ARIA',
      name: '洞察提炼',
      description: '从分析结果中提炼商业洞察',
      input: {
        fromNode: 'node-sage-analyze',
      },
      dependencies: ['node-sage-analyze'],
      output: {
        toWorkflow: 'businessInsights',
      },
    },
    {
      id: 'node-nexus-strategy',
      agentId: 'NEXUS',
      name: '战略决策',
      description: '基于洞察制定战略决策',
      input: {
        fromNode: 'node-aria-insights',
      },
      dependencies: ['node-aria-insights'],
      output: {
        toWorkflow: 'strategicRecommendations',
      },
    },
  ],
  entryNode: 'node-echo-collect',
  exitNode: 'node-nexus-strategy',
  config: {
    parallel: false,
    timeout: 1200, // 20 分钟
    onError: 'stop',
  },
  metadata: {
    category: 'analytics',
    tags: ['数据', '分析', '战略'],
    estimatedDuration: '15-20 分钟',
  },
};

/**
 * 4. 客服响应工作流 (HAVEN→SAGE→SCRIBE)
 * 
 * 流程：
 * HAVEN (情感分析) → SAGE (问题诊断) → SCRIBE (回复生成)
 */
export const customerSupportWorkflow: WorkflowDefinition = {
  id: 'customer-support',
  name: '客服响应工作流',
  description: '智能客服自动响应流程',
  version: '1.0.0',
  agents: [
    {
      id: 'HAVEN',
      name: 'HAVEN',
      role: '情感分析专家',
      description: '负责情感分析和紧急程度评估',
      config: {
        temperature: 0.3,
        maxTokens: 1000,
      },
    },
    {
      id: 'SAGE',
      name: 'SAGE',
      role: '问题诊断专家',
      description: '负责问题诊断和解决方案匹配',
      config: {
        temperature: 0.4,
        maxTokens: 3000,
      },
    },
    {
      id: 'SCRIBE',
      name: 'SCRIBE',
      role: '回复生成师',
      description: '负责生成个性化回复',
      config: {
        temperature: 0.6,
        maxTokens: 2000,
      },
    },
  ],
  nodes: [
    {
      id: 'node-haven-analyze',
      agentId: 'HAVEN',
      name: '情感分析',
      description: '分析用户情感和紧急程度',
      input: {
        fromWorkflow: 'customerMessage',
      },
      output: {
        toWorkflow: 'sentimentAnalysis',
      },
    },
    {
      id: 'node-sage-diagnose',
      agentId: 'SAGE',
      name: '问题诊断',
      description: '诊断问题并匹配解决方案',
      input: {
        fromNode: 'node-haven-analyze',
      },
      dependencies: ['node-haven-analyze'],
      output: {
        toWorkflow: 'diagnosisResult',
      },
    },
    {
      id: 'node-scribe-respond',
      agentId: 'SCRIBE',
      name: '回复生成',
      description: '生成个性化客服回复',
      input: {
        fromNode: 'node-sage-diagnose',
      },
      dependencies: ['node-sage-diagnose'],
      output: {
        toWorkflow: 'customerResponse',
      },
    },
  ],
  entryNode: 'node-haven-analyze',
  exitNode: 'node-scribe-respond',
  config: {
    parallel: false,
    timeout: 180, // 3 分钟
    onError: 'continue',
  },
  metadata: {
    category: 'support',
    tags: ['客服', '响应', '自动化'],
    estimatedDuration: '1-3 分钟',
  },
};

/**
 * 5. 产品发布工作流 (ARIA→ZARA→MUSE→NOVA)
 * 
 * 流程：
 * ARIA (产品策划) → ZARA (内容创作) → MUSE (视觉设计) → NOVA (增长推广)
 */
export const productLaunchWorkflow: WorkflowDefinition = {
  id: 'product-launch',
  name: '产品发布工作流',
  description: '产品从策划到推广的完整发布流程',
  version: '1.0.0',
  agents: [
    {
      id: 'ARIA',
      name: 'ARIA',
      role: '产品策划师',
      description: '负责产品定位和发布策略',
      config: {
        temperature: 0.7,
        maxTokens: 3000,
      },
    },
    {
      id: 'ZARA',
      name: 'ZARA',
      role: '内容创作师',
      description: '负责发布内容创作',
      config: {
        temperature: 0.6,
        maxTokens: 4000,
      },
    },
    {
      id: 'MUSE',
      name: 'MUSE',
      role: '视觉设计师',
      description: '负责视觉素材设计',
      config: {
        temperature: 0.8,
        maxTokens: 2000,
      },
    },
    {
      id: 'NOVA',
      name: 'NOVA',
      role: '增长引擎',
      description: '负责推广策略和渠道优化',
      config: {
        temperature: 0.5,
        maxTokens: 3000,
      },
    },
  ],
  nodes: [
    {
      id: 'node-aria-strategy',
      agentId: 'ARIA',
      name: '产品策划',
      description: '制定产品发布策略',
      input: {
        fromWorkflow: 'productInfo',
      },
      output: {
        toWorkflow: 'launchStrategy',
      },
    },
    {
      id: 'node-zara-content',
      agentId: 'ZARA',
      name: '内容创作',
      description: '创作发布相关内容',
      input: {
        fromNode: 'node-aria-strategy',
      },
      dependencies: ['node-aria-strategy'],
      output: {
        toWorkflow: 'launchContent',
      },
    },
    {
      id: 'node-muse-design',
      agentId: 'MUSE',
      name: '视觉设计',
      description: '设计视觉素材',
      input: {
        fromNode: 'node-zara-content',
      },
      dependencies: ['node-zara-content'],
      output: {
        toWorkflow: 'visualAssets',
      },
    },
    {
      id: 'node-nova-promote',
      agentId: 'NOVA',
      name: '增长推广',
      description: '制定推广策略和执行计划',
      input: {
        fromNode: 'node-muse-design',
      },
      dependencies: ['node-muse-design'],
      output: {
        toWorkflow: 'promotionPlan',
      },
    },
  ],
  entryNode: 'node-aria-strategy',
  exitNode: 'node-nova-promote',
  config: {
    parallel: false,
    timeout: 1800, // 30 分钟
    onError: 'stop',
  },
  metadata: {
    category: 'product',
    tags: ['产品', '发布', '推广'],
    estimatedDuration: '20-30 分钟',
  },
};

/**
 * 6. 并行研究工作流 (多 Agent 并行研究→综合报告)
 * 
 * 流程：
 * 多个研究 Agent 并行研究 → 结果汇总 → 综合报告
 */
export const parallelResearchWorkflow: WorkflowDefinition = {
  id: 'parallel-research',
  name: '并行研究工作流',
  description: '多 Agent 并行研究并汇总结果',
  version: '1.0.0',
  agents: [
    {
      id: 'RESEARCHER_1',
      name: '研究员 A',
      role: '技术调研',
      description: '负责技术方向调研',
    },
    {
      id: 'RESEARCHER_2',
      name: '研究员 B',
      role: '市场调研',
      description: '负责市场方向调研',
    },
    {
      id: 'RESEARCHER_3',
      name: '研究员 C',
      role: '竞品调研',
      description: '负责竞品方向调研',
    },
    {
      id: 'SAGE',
      name: 'SAGE',
      role: '综合分析专家',
      description: '负责汇总和综合分析',
    },
  ],
  nodes: [
    {
      id: 'node-research-tech',
      agentId: 'RESEARCHER_1',
      name: '技术调研',
      description: '调研技术趋势和方案',
      input: {
        fromWorkflow: 'researchTopic',
      },
      output: {
        toWorkflow: 'techResearch',
      },
    },
    {
      id: 'node-research-market',
      agentId: 'RESEARCHER_2',
      name: '市场调研',
      description: '调研市场规模和机会',
      input: {
        fromWorkflow: 'researchTopic',
      },
      output: {
        toWorkflow: 'marketResearch',
      },
    },
    {
      id: 'node-research-competitor',
      agentId: 'RESEARCHER_3',
      name: '竞品调研',
      description: '调研竞品情况和差异化',
      input: {
        fromWorkflow: 'researchTopic',
      },
      output: {
        toWorkflow: 'competitorResearch',
      },
    },
    {
      id: 'node-sage-synthesize',
      agentId: 'SAGE',
      name: '综合报告',
      description: '汇总所有调研结果并生成综合报告',
      input: {
        fromNode: 'node-research-tech',
      },
      dependencies: ['node-research-tech', 'node-research-market', 'node-research-competitor'],
      output: {
        toWorkflow: 'finalReport',
      },
    },
  ],
  entryNode: 'node-research-tech',
  exitNode: 'node-sage-synthesize',
  config: {
    parallel: true,
    maxConcurrency: 3,
    timeout: 1800, // 30 分钟
    onError: 'continue',
  },
  metadata: {
    category: 'research',
    tags: ['研究', '并行', '综合'],
    estimatedDuration: '20-30 分钟',
  },
};

/**
 * 获取所有预设工作流
 */
export function getAllWorkflowTemplates(): WorkflowDefinition[] {
  return [
    contentCreationWorkflow,
    codeReviewWorkflow,
    dataAnalysisWorkflow,
    customerSupportWorkflow,
    productLaunchWorkflow,
    parallelResearchWorkflow,
  ];
}

/**
 * 根据 ID 获取工作流模板
 */
export function getWorkflowTemplateById(id: string): WorkflowDefinition | undefined {
  const templates = getAllWorkflowTemplates();
  return templates.find(t => t.id === id);
}

/**
 * 根据类别获取工作流模板
 */
export function getWorkflowTemplatesByCategory(category: string): WorkflowDefinition[] {
  const templates = getAllWorkflowTemplates();
  return templates.filter(t => t.metadata?.category === category);
}

// 导出所有工作流
export default {
  contentCreationWorkflow,
  codeReviewWorkflow,
  dataAnalysisWorkflow,
  customerSupportWorkflow,
  productLaunchWorkflow,
  parallelResearchWorkflow,
  getAllWorkflowTemplates,
  getWorkflowTemplateById,
  getWorkflowTemplatesByCategory,
};
