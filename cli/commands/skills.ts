interface Skill {
  name: string;
  description: string;
  category: 'core' | 'growth' | 'engineering' | 'content' | 'memory';
  location: string;
}

export async function list() {
  console.log('🛠️  可用技能\n');

  const skills: Skill[] = [
    {
      name: 'axon-supreme',
      description: 'Axon 至高意志核心技能 - 项目全链路掌控、Agent 军团调度',
      category: 'core'
    },
    {
      name: 'axon-orchestrator',
      description: 'Axon 多 Agent 编排技能 - 派发任务、协调协作、监控执行',
      category: 'core'
    },
    {
      name: 'axon-proactive',
      description: 'Axon 主动代理技能 - 主动监控、预警风险、自主触发',
      category: 'core'
    },
    {
      name: 'kael-engineering',
      description: 'KAEL 工程总管 - 技术架构、代码审查、性能优化',
      category: 'engineering'
    },
    {
      name: 'technical-design',
      description: '技术设计文档 - RFC/TDD 撰写、架构设计、API 规范',
      category: 'engineering'
    },
    {
      name: 'quality-testing',
      description: '质量测试技能 - 测试用例、自动化测试、Bug 报告',
      category: 'engineering'
    },
    {
      name: 'nova-growth',
      description: 'NOVA 增长引擎 - 增长策略、A/B 测试、转化优化',
      category: 'growth'
    },
    {
      name: 'growth-metrics',
      description: '增长与指标技能 - 增长模型、指标定义、漏斗分析',
      category: 'growth'
    },
    {
      name: 'nexus-strategy',
      description: 'NEXUS 战略执行官 - 战略规划、资源分配、风险评估',
      category: 'core'
    },
    {
      name: 'aria-product',
      description: 'ARIA 产品架构师 - 产品规划、用户体验、需求分析',
      category: 'growth'
    },
    {
      name: 'content-factory',
      description: 'AI 内容工厂 - 文章生成、视频脚本、多平台适配',
      category: 'content'
    },
    {
      name: 'chromadb-memory',
      description: '长期记忆 - ChromaDB 存储、语义检索、上下文管理',
      category: 'memory'
    },
    {
      name: 'react-electron',
      description: 'React + Electron 桌面开发 - 主/渲染进程、IPC 通信',
      category: 'engineering'
    },
    {
      name: 'shadcn-ui',
      description: 'shadcn/ui 组件库开发 - 组件定制、主题配置',
      category: 'engineering'
    }
  ];

  const categories = {
    core: '🜏 核心',
    engineering: '⚙️ 工程',
    growth: '📈 增长',
    content: '📝 内容',
    memory: '🧠 记忆'
  };

  const grouped = skills.reduce((acc, skill) => {
    acc[skill.category] = acc[skill.category] || [];
    acc[skill.category].push(skill);
    return acc;
  }, {} as Record<string, Skill[]>);

  Object.entries(grouped).forEach(([category, categorySkills]) => {
    console.log(`━━━ ${categories[category as keyof typeof categories]} ━━━`);
    categorySkills.forEach(skill => {
      console.log(`  • ${skill.name}`);
      console.log(`    ${skill.description}`);
    });
    console.log('');
  });

  console.log(`总计：${skills.length} 个技能`);
}
