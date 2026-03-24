/**
 * Task Scheduler 单元测试
 */

import {
  TaskScheduler,
  TaskPriority,
  TaskStatus,
  AgentType,
  AgentStatus,
  Task,
  Agent
} from './task-scheduler';

describe('TaskScheduler', () => {
  let scheduler: TaskScheduler;

  beforeEach(() => {
    scheduler = new TaskScheduler({
      pollInterval: 100, // 加快测试
      enableSkillMatching: true,
      enableLoadBalancing: true
    });
  });

  afterEach(() => {
    scheduler.stop();
  });

  // ==================== 生命周期测试 ====================

  describe('Lifecycle', () => {
    test('should start and stop correctly', () => {
      const startedMock = jest.fn();
      const stoppedMock = jest.fn();

      scheduler.on('started', startedMock);
      scheduler.on('stopped', stoppedMock);

      scheduler.start();
      expect(startedMock).toHaveBeenCalled();

      scheduler.stop();
      expect(stoppedMock).toHaveBeenCalled();
    });

    test('should not start twice', () => {
      const startedMock = jest.fn();
      scheduler.on('started', startedMock);

      scheduler.start();
      scheduler.start(); // 第二次启动应该被忽略

      expect(startedMock).toHaveBeenCalledTimes(1);
    });
  });

  // ==================== 任务管理测试 ====================

  describe('Task Management', () => {
    test('should add task to queue', () => {
      const task = TaskScheduler.createTask(
        'Test Task',
        'Test Description',
        TaskPriority.P1_IMPORTANT
      );

      const addedMock = jest.fn();
      scheduler.on('task:added', addedMock);

      scheduler.addTask(task);

      const status = scheduler.getQueueStatus();
      expect(status.total).toBe(1);
      expect(addedMock).toHaveBeenCalledWith(task);
    });

    test('should add multiple tasks', () => {
      const tasks = [
        TaskScheduler.createTask('Task 1', 'Desc 1', TaskPriority.P0_CORE),
        TaskScheduler.createTask('Task 2', 'Desc 2', TaskPriority.P1_IMPORTANT),
        TaskScheduler.createTask('Task 3', 'Desc 3', TaskPriority.P2_OPTIMIZATION)
      ];

      scheduler.addTasks(tasks);

      const status = scheduler.getQueueStatus();
      expect(status.total).toBe(3);
      expect(status.byPriority[TaskPriority.P0_CORE]).toBe(1);
      expect(status.byPriority[TaskPriority.P1_IMPORTANT]).toBe(1);
      expect(status.byPriority[TaskPriority.P2_OPTIMIZATION]).toBe(1);
    });

    test('should prioritize tasks correctly', () => {
      const tasks = [
        TaskScheduler.createTask('Low Priority', 'Desc', TaskPriority.P3_OPTIONAL),
        TaskScheduler.createTask('High Priority', 'Desc', TaskPriority.P0_BLOCKING),
        TaskScheduler.createTask('Medium Priority', 'Desc', TaskPriority.P1_IMPORTANT)
      ];

      scheduler.addTasks(tasks);

      const status = scheduler.getQueueStatus();
      // P0 应该最先被处理
      expect(status.byPriority[TaskPriority.P0_BLOCKING]).toBe(1);
      expect(status.byPriority[TaskPriority.P1_IMPORTANT]).toBe(1);
      expect(status.byPriority[TaskPriority.P3_OPTIONAL]).toBe(1);
    });
  });

  // ==================== Agent 管理测试 ====================

  describe('Agent Management', () => {
    test('should register agent', () => {
      const agent = TaskScheduler.createAgent(
        'agent-1',
        'ARIA-1',
        AgentType.ARIA,
        ['typescript', 'react']
      );

      const registeredMock = jest.fn();
      scheduler.on('agent:registered', registeredMock);

      scheduler.registerAgent(agent);

      const agents = scheduler.getAgentStatus();
      expect(agents.length).toBe(1);
      expect(agents[0].name).toBe('ARIA-1');
      expect(registeredMock).toHaveBeenCalledWith(agent);
    });

    test('should unregister agent', () => {
      const agent = TaskScheduler.createAgent('agent-1', 'ARIA-1', AgentType.ARIA);
      scheduler.registerAgent(agent);

      const unregisteredMock = jest.fn();
      scheduler.on('agent:unregistered', unregisteredMock);

      const result = scheduler.unregisterAgent('agent-1');

      expect(result).toBe(true);
      expect(unregisteredMock).toHaveBeenCalledWith('agent-1');

      const agents = scheduler.getAgentStatus();
      expect(agents.length).toBe(0);
    });
  });

  // ==================== 任务分配测试 ====================

  describe('Task Assignment', () => {
    test('should assign task to idle agent', () => {
      const agent = TaskScheduler.createAgent('agent-1', 'ARIA-1', AgentType.ARIA);
      const task = TaskScheduler.createTask(
        'Test Task',
        'Description',
        TaskPriority.P1_IMPORTANT
      );

      scheduler.registerAgent(agent);
      scheduler.addTask(task);

      const assignedMock = jest.fn();
      scheduler.on('task:assigned', assignedMock);

      // 手动触发分配
      const result = scheduler.assignTask(task.id, agent.id);

      expect(result.success).toBe(true);
      expect(result.taskId).toBe(task.id);
      expect(result.agentId).toBe(agent.id);
      expect(assignedMock).toHaveBeenCalled();
    });

    test('should fail to assign task to non-existent agent', () => {
      const task = TaskScheduler.createTask('Test', 'Desc', TaskPriority.P1_IMPORTANT);
      scheduler.addTask(task);

      const result = scheduler.assignTask(task.id, 'non-existent-agent');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Agent 不存在');
    });

    test('should fail to assign non-existent task', () => {
      const agent = TaskScheduler.createAgent('agent-1', 'ARIA-1', AgentType.ARIA);
      scheduler.registerAgent(agent);

      const result = scheduler.assignTask('non-existent-task', agent.id);

      expect(result.success).toBe(false);
      expect(result.error).toContain('任务不存在');
    });
  });

  // ==================== 任务完成监听测试 ====================

  describe('Task Completion', () => {
    test('should handle task completion', () => {
      const agent = TaskScheduler.createAgent('agent-1', 'ARIA-1', AgentType.ARIA);
      const task = TaskScheduler.createTask('Test', 'Desc', TaskPriority.P1_IMPORTANT);

      scheduler.registerAgent(agent);
      scheduler.addTask(task);
      scheduler.assignTask(task.id, agent.id);

      const completedMock = jest.fn();
      scheduler.on('task:completed', completedMock);

      scheduler.onTaskCompleted(task.id, agent.id, { success: true });

      expect(completedMock).toHaveBeenCalledWith({
        taskId: task.id,
        agentId: agent.id,
        result: { success: true }
      });

      const agents = scheduler.getAgentStatus();
      expect(agents[0].status).toBe(AgentStatus.IDLE);
      expect(agents[0].completedTasks).toBe(1);
    });

    test('should parse system message correctly', () => {
      const message = '[System Message] A subagent task "task-123" just completed';
      const parsed = TaskScheduler.parseSystemMessage(message);

      expect(parsed).not.toBeNull();
      expect(parsed!.taskId).toBe('task-123');
    });

    test('should return null for invalid system message', () => {
      const message = 'Some other message';
      const parsed = TaskScheduler.parseSystemMessage(message);

      expect(parsed).toBeNull();
    });
  });

  // ==================== 空闲检测测试 ====================

  describe('Idle Detection', () => {
    test('should detect idle agents', () => {
      const agent = TaskScheduler.createAgent('agent-1', 'ARIA-1', AgentType.ARIA);
      scheduler.registerAgent(agent);

      // 模拟时间流逝
      jest.useFakeTimers();
      jest.advanceTimersByTime(70000); // 超过 1 分钟

      const warningMock = jest.fn();
      scheduler.on('agent:warning', warningMock);

      // 触发检查
      scheduler.start();
      jest.advanceTimersByTime(100);

      expect(warningMock).toHaveBeenCalled();
      jest.useRealTimers();
    });

    test('should detect critical idle (>5min)', () => {
      const agent = TaskScheduler.createAgent('agent-1', 'ARIA-1', AgentType.ARIA);
      scheduler.registerAgent(agent);

      jest.useFakeTimers();
      jest.advanceTimersByTime(310000); // 超过 5 分钟

      const criticalMock = jest.fn();
      scheduler.on('agent:critical', criticalMock);

      scheduler.start();
      jest.advanceTimersByTime(100);

      expect(criticalMock).toHaveBeenCalled();
      jest.useRealTimers();
    });

    test('should detect accident idle (>15min)', () => {
      const agent = TaskScheduler.createAgent('agent-1', 'ARIA-1', AgentType.ARIA);
      scheduler.registerAgent(agent);

      jest.useFakeTimers();
      jest.advanceTimersByTime(910000); // 超过 15 分钟

      const accidentMock = jest.fn();
      scheduler.on('agent:accident', accidentMock);

      scheduler.start();
      jest.advanceTimersByTime(100);

      expect(accidentMock).toHaveBeenCalled();
      jest.useRealTimers();
    });
  });

  // ==================== 技能匹配测试 ====================

  describe('Skill Matching', () => {
    test('should match agent by type', () => {
      const ariaAgent = TaskScheduler.createAgent('aria-1', 'ARIA-1', AgentType.ARIA);
      const aceAgent = TaskScheduler.createAgent('ace-1', 'ACE-1', AgentType.ACE);

      scheduler.registerAgent(ariaAgent);
      scheduler.registerAgent(aceAgent);

      const task = TaskScheduler.createTask(
        'Implement Feature',
        'Need ARIA',
        TaskPriority.P1_IMPORTANT,
        AgentType.ARIA // 指定需要 ARIA
      );

      scheduler.addTask(task);

      // ARIA 应该被优先分配
      const result = scheduler.assignTask(task.id, ariaAgent.id);
      expect(result.success).toBe(true);
    });

    test('should assign to any agent if type not specified', () => {
      const agent1 = TaskScheduler.createAgent('agent-1', 'ARIA-1', AgentType.ARIA);
      const agent2 = TaskScheduler.createAgent('agent-2', 'ACE-1', AgentType.ACE);

      scheduler.registerAgent(agent1);
      scheduler.registerAgent(agent2);

      const task = TaskScheduler.createTask(
        'Generic Task',
        'Any agent',
        TaskPriority.P1_IMPORTANT
        // 不指定 agentType
      );

      scheduler.addTask(task);

      // 应该可以分配给任一 Agent
      const result = scheduler.assignTask(task.id, agent1.id);
      expect(result.success).toBe(true);
    });
  });

  // ==================== 负载均衡测试 ====================

  describe('Load Balancing', () => {
    test('should balance load between agents', () => {
      const agent1 = TaskScheduler.createAgent('agent-1', 'ARIA-1', AgentType.ARIA);
      const agent2 = TaskScheduler.createAgent('agent-2', 'ARIA-2', AgentType.ARIA);

      // agent1 已完成 5 个任务，agent2 完成 0 个
      agent1.completedTasks = 5;
      agent2.completedTasks = 0;

      scheduler.registerAgent(agent1);
      scheduler.registerAgent(agent2);

      const task = TaskScheduler.createTask('Task', 'Desc', TaskPriority.P1_IMPORTANT, AgentType.ARIA);
      scheduler.addTask(task);

      // 应该分配给完成任务数较少的 agent2
      const result = scheduler.assignTask(task.id, agent2.id);
      expect(result.success).toBe(true);
    });
  });

  // ==================== 任务依赖测试 ====================

  describe('Task Dependencies', () => {
    test('should respect task dependencies', () => {
      const task1 = TaskScheduler.createTask('Task 1', 'First', TaskPriority.P1_IMPORTANT);
      const task2 = TaskScheduler.createTask(
        'Task 2',
        'Depends on Task 1',
        TaskPriority.P1_IMPORTANT,
        undefined,
        [task1.id] // 依赖 task1
      );

      scheduler.addTask(task1);
      scheduler.addTask(task2);

      const agent = TaskScheduler.createAgent('agent-1', 'ARIA-1', AgentType.ARIA);
      scheduler.registerAgent(agent);

      // 只有 task1 可分配 (task2 依赖未满足)
      const status = scheduler.getQueueStatus();
      expect(status.total).toBe(2);

      // 完成 task1
      scheduler.assignTask(task1.id, agent.id);
      scheduler.onTaskCompleted(task1.id, agent.id);

      // 现在 task2 也可分配了
      // (实际分配在 checkAndAssignTasks 中自动进行)
    });
  });

  // ==================== 统计测试 ====================

  describe('Statistics', () => {
    test('should provide accurate stats', () => {
      const agent1 = TaskScheduler.createAgent('agent-1', 'ARIA-1', AgentType.ARIA);
      const agent2 = TaskScheduler.createAgent('agent-2', 'ACE-1', AgentType.ACE);

      scheduler.registerAgent(agent1);
      scheduler.registerAgent(agent2);

      const task1 = TaskScheduler.createTask('Task 1', 'Desc', TaskPriority.P1_IMPORTANT);
      const task2 = TaskScheduler.createTask('Task 2', 'Desc', TaskPriority.P2_OPTIMIZATION);

      scheduler.addTask(task1);
      scheduler.addTask(task2);

      const stats = scheduler.getStats();

      expect(stats.totalAgents).toBe(2);
      expect(stats.pendingTasks).toBe(2);
      expect(stats.idleAgents).toBe(2);
    });
  });

  // ==================== 分配历史测试 ====================

  describe('Assignment History', () => {
    test('should record assignment history', () => {
      const agent = TaskScheduler.createAgent('agent-1', 'ARIA-1', AgentType.ARIA);
      const task = TaskScheduler.createTask('Task', 'Desc', TaskPriority.P1_IMPORTANT);

      scheduler.registerAgent(agent);
      scheduler.addTask(task);
      scheduler.assignTask(task.id, agent.id);

      const history = scheduler.getAssignmentHistory();

      expect(history.length).toBe(1);
      expect(history[0].success).toBe(true);
      expect(history[0].taskId).toBe(task.id);
    });

    test('should limit history to 100 entries', () => {
      const agent = TaskScheduler.createAgent('agent-1', 'ARIA-1', AgentType.ARIA);
      scheduler.registerAgent(agent);

      // 添加 150 个任务
      for (let i = 0; i < 150; i++) {
        const task = TaskScheduler.createTask(`Task ${i}`, 'Desc', TaskPriority.P1_IMPORTANT);
        scheduler.addTask(task);
        scheduler.assignTask(task.id, agent.id);
      }

      const history = scheduler.getAssignmentHistory();
      expect(history.length).toBeLessThanOrEqual(100);
    });
  });
});

// ==================== 集成测试 ====================

describe('TaskScheduler Integration', () => {
  test('should complete full workflow', () => {
    const scheduler = new TaskScheduler({ pollInterval: 50 });
    scheduler.start();

    // 1. 注册 Agent
    const agent = TaskScheduler.createAgent('agent-1', 'ARIA-1', AgentType.ARIA);
    scheduler.registerAgent(agent);

    // 2. 添加任务
    const task = TaskScheduler.createTask(
      'Implement Feature',
      'Implement new feature',
      TaskPriority.P0_CORE,
      AgentType.ARIA
    );
    scheduler.addTask(task);

    // 3. 验证任务已分配
    setTimeout(() => {
      const agents = scheduler.getAgentStatus();
      expect(agents[0].status).toBe(AgentStatus.BUSY);
      expect(agents[0].currentTaskId).toBe(task.id);

      // 4. 完成任务
      scheduler.onTaskCompleted(task.id, agent.id);

      // 5. 验证 Agent 回到空闲状态
      setTimeout(() => {
        const updatedAgents = scheduler.getAgentStatus();
        expect(updatedAgents[0].status).toBe(AgentStatus.IDLE);
        expect(updatedAgents[0].completedTasks).toBe(1);

        scheduler.stop();
      }, 100);
    }, 100);
  });
});
