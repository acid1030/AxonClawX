/**
 * 任务队列与调度器集成 - AxonClaw 核心组件
 * 
 * 功能:
 * 1. 任务队列 → 调度器监听
 * 2. 自动出队 → 分配给空闲 Agent
 * 3. 任务完成 → 更新队列状态
 */

import { Agent, Task, TaskResult, TaskPriority } from '../types';

/**
 * 队列中的任务项
 */
interface QueuedTask {
  id: string;
  task: Task;
  priority: TaskPriority;
  createdAt: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  agentId?: string;
  result?: TaskResult;
}

/**
 * 任务队列 - 优先级队列实现
 */
export class TaskQueue {
  private queue: QueuedTask[] = [];
  private taskIdCounter: number = 0;

  /**
   * 入队任务
   */
  enqueue(task: Task, priority?: TaskPriority): string {
    const id = `task-${++this.taskIdCounter}`;
    const queuedTask: QueuedTask = {
      id,
      task,
      priority: priority || task.priority || 'medium',
      createdAt: Date.now(),
      status: 'pending'
    };

    this.queue.push(queuedTask);
    this.sortByPriority();
    
    console.log(`  ⟡ 任务入队：${id} [${queuedTask.priority}] ${task.description}`);
    return id;
  }

  /**
   * 出队任务 (获取最高优先级的待处理任务)
   */
  dequeue(): QueuedTask | null {
    const pendingIndex = this.queue.findIndex(t => t.status === 'pending');
    if (pendingIndex === -1) return null;

    const task = this.queue[pendingIndex];
    task.status = 'processing';
    
    console.log(`  ⟡ 任务出队：${task.id}`);
    return task;
  }

  /**
   * 更新任务状态
   */
  updateTaskStatus(taskId: string, status: QueuedTask['status'], result?: TaskResult, agentId?: string): void {
    const task = this.queue.find(t => t.id === taskId);
    if (!task) {
      console.warn(`  ⚠ 未找到任务：${taskId}`);
      return;
    }

    task.status = status;
    if (result) task.result = result;
    if (agentId) task.agentId = agentId;

    console.log(`  ⟡ 任务状态更新：${taskId} → ${status}`);
  }

  /**
   * 获取任务
   */
  getTask(taskId: string): QueuedTask | undefined {
    return this.queue.find(t => t.id === taskId);
  }

  /**
   * 获取所有任务
   */
  getAllTasks(): QueuedTask[] {
    return [...this.queue];
  }

  /**
   * 获取待处理任务数量
   */
  getPendingCount(): number {
    return this.queue.filter(t => t.status === 'pending').length;
  }

  /**
   * 获取队列状态
   */
  getStatus(): {
    total: number;
    pending: number;
    processing: number;
    completed: number;
    failed: number;
  } {
    return {
      total: this.queue.length,
      pending: this.queue.filter(t => t.status === 'pending').length,
      processing: this.queue.filter(t => t.status === 'processing').length,
      completed: this.queue.filter(t => t.status === 'completed').length,
      failed: this.queue.filter(t => t.status === 'failed').length
    };
  }

  /**
   * 按优先级排序队列
   */
  private sortByPriority(): void {
    const priorityOrder: Record<TaskPriority, number> = {
      critical: 0,
      high: 1,
      medium: 2,
      low: 3
    };

    this.queue.sort((a, b) => {
      // 先按优先级排序
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      
      // 同优先级按创建时间排序 (FIFO)
      return a.createdAt - b.createdAt;
    });
  }

  /**
   * 清空队列
   */
  clear(): void {
    this.queue = [];
    this.taskIdCounter = 0;
  }
}

/**
 * 调度器 - 负责任务分配和 Agent 管理
 */
export class Scheduler {
  private agents: Map<string, Agent> = new Map();
  private agentStatus: Map<string, 'idle' | 'busy' | 'offline'> = new Map();
  private eventListeners: Map<string, Set<Function>> = new Map();
  private processingTasks: Set<string> = new Set();

  /**
   * 注册 Agent
   */
  registerAgent(agent: Agent): void {
    this.agents.set(agent.getId(), agent);
    this.agentStatus.set(agent.getId(), 'idle');
    console.log(`  ↳ 注册 Agent: ${agent.getName()} (${agent.getId()})`);
  }

  /**
   * 注销 Agent
   */
  unregisterAgent(agentId: string): void {
    this.agents.delete(agentId);
    this.agentStatus.delete(agentId);
    console.log(`  ↳ 注销 Agent: ${agentId}`);
  }

  /**
   * 获取空闲 Agent
   */
  getIdleAgent(): Agent | null {
    for (const [agentId, agent] of this.agents.entries()) {
      const status = this.agentStatus.get(agentId);
      if (status === 'idle') {
        return agent;
      }
    }
    return null;
  }

  /**
   * 设置 Agent 状态
   */
  setAgentStatus(agentId: string, status: 'idle' | 'busy' | 'offline'): void {
    this.agentStatus.set(agentId, status);
  }

  /**
   * 获取 Agent 状态
   */
  getAgentStatus(agentId: string): 'idle' | 'busy' | 'offline' | 'unknown' {
    return this.agentStatus.get(agentId) || 'unknown';
  }

  /**
   * 分配任务给 Agent
   */
  async assignTask(agent: Agent, queuedTask: QueuedTask): Promise<TaskResult> {
    const agentId = agent.getId();
    this.setAgentStatus(agentId, 'busy');
    this.processingTasks.add(queuedTask.id);

    console.log(`    → 分配任务给：${agent.getName()} (${agentId})`);

    try {
      const result = await agent.execute(queuedTask.task);
      
      // 先触发事件，再更新状态
      this.emit('taskCompleted', { taskId: queuedTask.id, result, agentId });
      
      this.setAgentStatus(agentId, 'idle');
      this.processingTasks.delete(queuedTask.id);
      
      return result;
    } catch (error) {
      const errorResult: TaskResult = {
        status: 'failed',
        message: error instanceof Error ? error.message : '未知错误',
        data: null
      };
      
      // 先触发事件，再更新状态
      this.emit('taskFailed', { taskId: queuedTask.id, error: errorResult, agentId });
      
      this.setAgentStatus(agentId, 'idle');
      this.processingTasks.delete(queuedTask.id);
      
      return errorResult;
    }
  }

  /**
   * 注册事件监听器
   */
  on(event: string, callback: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(callback);
  }

  /**
   * 移除事件监听器
   */
  off(event: string, callback: Function): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.delete(callback);
    }
  }

  /**
   * 触发事件
   */
  private emit(event: string, data?: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => callback(data));
    }
  }

  /**
   * 获取调度器状态
   */
  getStatus(): {
    totalAgents: number;
    idleAgents: number;
    busyAgents: number;
    processingTasks: number;
  } {
    let idle = 0, busy = 0;
    for (const status of this.agentStatus.values()) {
      if (status === 'idle') idle++;
      else if (status === 'busy') busy++;
    }

    return {
      totalAgents: this.agents.size,
      idleAgents: idle,
      busyAgents: busy,
      processingTasks: this.processingTasks.size
    };
  }

  /**
   * 关闭调度器
   */
  shutdown(): void {
    this.agents.clear();
    this.agentStatus.clear();
    this.eventListeners.clear();
    this.processingTasks.clear();
  }
}

/**
 * 队列调度器集成 - 连接任务队列和调度器
 */
export class QueueSchedulerIntegration {
  private queue: TaskQueue;
  private scheduler: Scheduler;
  private isRunning: boolean = false;
  private processInterval: NodeJS.Timeout | null = null;

  constructor(queue: TaskQueue, scheduler: Scheduler) {
    this.queue = queue;
    this.scheduler = scheduler;
    
    // 设置调度器监听队列
    this.scheduler.on('taskCompleted', () => {
      const next = this.queue.dequeue();
      if (next) {
        this.processTask(next);
      }
    });
  }

  /**
   * 处理单个任务
   */
  private async processTask(queuedTask: QueuedTask): Promise<void> {
    const agent = this.scheduler.getIdleAgent();
    
    if (!agent) {
      console.log(`  ⚠ 无空闲 Agent，任务 ${queuedTask.id} 等待中...`);
      this.queue.updateTaskStatus(queuedTask.id, 'pending');
      return;
    }

    // 检查 Agent 是否能处理该任务
    if (!agent.canHandle(queuedTask.task)) {
      console.log(`  ⚠ Agent ${agent.getName()} 无法处理任务类型 ${queuedTask.task.type}`);
      this.queue.updateTaskStatus(queuedTask.id, 'pending');
      return;
    }

    this.queue.updateTaskStatus(queuedTask.id, 'processing', undefined, agent.getId());
    const result = await this.scheduler.assignTask(agent, queuedTask);
    
    // 任务完成后更新队列状态
    this.queue.updateTaskStatus(
      queuedTask.id,
      result.status === 'success' ? 'completed' : 'failed',
      result
    );
  }

  /**
   * 启动调度器
   */
  start(processIntervalMs: number = 1000): void {
    if (this.isRunning) {
      console.warn('  ⚠ 调度器已在运行中');
      return;
    }

    this.isRunning = true;
    console.log('  ⟡ 调度器启动，轮询间隔：' + processIntervalMs + 'ms');

    // 定期处理队列中的任务
    this.processInterval = setInterval(async () => {
      if (!this.isRunning) return;

      const queuedTask = this.queue.dequeue();
      if (queuedTask) {
        await this.processTask(queuedTask);
      }
    }, processIntervalMs);
  }

  /**
   * 停止调度器
   */
  stop(): void {
    this.isRunning = false;
    
    if (this.processInterval) {
      clearInterval(this.processInterval);
      this.processInterval = null;
    }
    
    console.log('  ⟡ 调度器已停止');
  }

  /**
   * 提交任务到队列
   */
  submitTask(task: Task, priority?: TaskPriority): string {
    return this.queue.enqueue(task, priority);
  }

  /**
   * 获取系统状态
   */
  getStatus(): {
    queue: ReturnType<TaskQueue['getStatus']>;
    scheduler: ReturnType<Scheduler['getStatus']>;
    isRunning: boolean;
  } {
    return {
      queue: this.queue.getStatus(),
      scheduler: this.scheduler.getStatus(),
      isRunning: this.isRunning
    };
  }

  /**
   * 获取队列实例
   */
  getQueue(): TaskQueue {
    return this.queue;
  }

  /**
   * 获取调度器实例
   */
  getScheduler(): Scheduler {
    return this.scheduler;
  }

  /**
   * 关闭集成系统
   */
  shutdown(): void {
    this.stop();
    this.scheduler.shutdown();
    this.queue.clear();
  }
}

/**
 * 创建队列调度器集成实例的工厂函数
 */
export function createQueueSchedulerIntegration(): QueueSchedulerIntegration {
  const queue = new TaskQueue();
  const scheduler = new Scheduler();
  return new QueueSchedulerIntegration(queue, scheduler);
}

// 导出类型
export type { QueuedTask };
