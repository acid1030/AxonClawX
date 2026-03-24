interface Agent {
  id: string;
  name: string;
  role: string;
  status: 'active' | 'idle' | 'busy' | 'offline';
  currentTask?: string;
  skills: string[];
}

export async function list() {
  console.log('🤖 Agent 状态\n');

  const agents: Agent[] = [
    {
      id: 'agt-001',
      name: 'AXON',
      role: '至高意志',
      status: 'active',
      currentTask: '项目全链路掌控',
      skills: ['axon-supreme', 'axon-orchestrator', 'axon-proactive']
    },
    {
      id: 'agt-002',
      name: 'KAEL',
      role: '工程总管',
      status: 'busy',
      currentTask: 'CLI 工具开发',
      skills: ['kael-engineering', 'technical-design', 'quality-testing']
    },
    {
      id: 'agt-003',
      name: 'NOVA',
      role: '增长引擎',
      status: 'idle',
      skills: ['nova-growth', 'growth-metrics', 'user-research']
    },
    {
      id: 'agt-004',
      name: 'NEXUS',
      role: '战略执行官',
      status: 'idle',
      skills: ['nexus-strategy', 'aria-product']
    },
    {
      id: 'agt-005',
      name: 'CONTENT',
      role: '内容工厂',
      status: 'idle',
      skills: ['content-factory']
    }
  ];

  agents.forEach(agent => {
    const statusIcon = {
      active: '🟢',
      busy: '🟡',
      idle: '⚪',
      offline: '🔴'
    }[agent.status];

    console.log(`${statusIcon} ${agent.name} - ${agent.role}`);
    console.log(`   ID: ${agent.id}`);
    console.log(`   状态：${agent.status.toUpperCase()}`);
    if (agent.currentTask) {
      console.log(`   当前任务：${agent.currentTask}`);
    }
    console.log(`   技能：${agent.skills.join(', ')}`);
    console.log('');
  });

  const summary = {
    active: agents.filter(a => a.status === 'active').length,
    busy: agents.filter(a => a.status === 'busy').length,
    idle: agents.filter(a => a.status === 'idle').length,
    offline: agents.filter(a => a.status === 'offline').length
  };

  console.log(`总计：${agents.length} 个 Agent | 活跃：${summary.active} | 忙碌：${summary.busy} | 空闲：${summary.idle}`);
}
