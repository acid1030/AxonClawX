interface Task {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  agent: string;
  progress: number;
  createdAt: string;
}

export async function list() {
  console.log('📋 任务队列\n');

  const tasks: Task[] = [
    {
      id: 'tsk-001',
      name: '代码审查 - src/api.ts',
      status: 'running',
      agent: 'KAEL',
      progress: 67,
      createdAt: '2026-03-13 14:15'
    },
    {
      id: 'tsk-002',
      name: '生成测试用例 - user.test.ts',
      status: 'pending',
      agent: 'NOVA',
      progress: 0,
      createdAt: '2026-03-13 14:20'
    },
    {
      id: 'tsk-003',
      name: '文档更新 - API.md',
      status: 'pending',
      agent: 'AXON',
      progress: 0,
      createdAt: '2026-03-13 14:22'
    },
    {
      id: 'tsk-004',
      name: '性能优化 - database.ts',
      status: 'completed',
      agent: 'KAEL',
      progress: 100,
      createdAt: '2026-03-13 13:45'
    }
  ];

  const pending = tasks.filter(t => t.status === 'pending');
  const running = tasks.filter(t => t.status === 'running');
  const completed = tasks.filter(t => t.status === 'completed');

  if (running.length > 0) {
    console.log('━━━ 运行中 ━━━');
    running.forEach(task => {
      const bar = '█'.repeat(Math.floor(task.progress / 10)) + '░'.repeat(10 - Math.floor(task.progress / 10));
      console.log(`  [${task.id}] ${task.name}`);
      console.log(`    Agent: ${task.agent} | 进度：${bar} ${task.progress}%`);
    });
  }

  if (pending.length > 0) {
    console.log('\n━━━ 待处理 ━━━');
    pending.forEach(task => {
      console.log(`  [${task.id}] ${task.name}`);
      console.log(`    Agent: ${task.agent} | 创建时间：${task.createdAt}`);
    });
  }

  if (completed.length > 0) {
    console.log('\n━━━ 最近完成 ━━━');
    completed.slice(0, 3).forEach(task => {
      console.log(`  ✓ [${task.id}] ${task.name}`);
    });
  }

  console.log(`\n总计：${tasks.length} 个任务`);
}
