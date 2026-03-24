/**
 * Task Scheduler - 自动任务再分配调度器 (精简版)
 * 
 * 核心功能:
 * 1. 任务完成监听 - 监听 subagent task completed 消息
 * 2. 空闲 Agent 检测 - 检测 idle >1min 警告，>5min 严重
 * 3. 自动分配 - 从任务队列获取下一个任务分配给空闲 Agent
 * 
 * @author Axon
 * @version 2.0 (精简版)
 * @created 2026-03-13
 */

import { EventEmitter } from 'events';

// ==================== 类型定义 ====================

export enum TaskPriority {
  P0 = 'P0',      // 最高优先级
  P1 = 'P1',      // 普通优先级
  P2 = 'P2'       // 低优先级
}

export enum AgentType {
  ACE = 'ACE',
  ARIA = 'ARIA',
  NOVA = 'NOVA',
  KAEL = 'KAEL',
  NEXUS = 'NEXUS',
  AXON = 'AXON'
}

export enum AgentStatus {
  BUSY = 'busy',
  IDLE = 'idle',
  WARNING = 'warning',    // idle > 1min
  CRITICAL = 'critical'   // idle > 5min
}

export interface Task {
  id: string;
  title: string;
  description: string;
  priority: TaskPriority;
  assignedTo?: string;
  status: 'pending' | 'assigned' | 'completed';
  createdAt: number;
  result?: any;
}

export interface Agent {
  id: string;
  name: string;
  type: AgentType;
  status: AgentStatus;
  currentTaskId?: string;
  lastActiveAt: number;
  completedTasks: number;
}

export interface SchedulerConfig {
  idleWarningThreshold: number;    // 毫秒，默认 60000 (1min)
  idleCriticalThreshold: number;   // 毫秒，默认 300000 (5min)
  pollInterval: number;            // 毫秒，默认 5000 (5s)
}

// ==================== 任务调度器 ====================

export class TaskScheduler extends EventEmitter {
  private tasks: Map<string, Task> = new Map();
  private agents: Map<string, Agent> = new Map();
  private config: SchedulerConfig;
  private pollTimer?: NodeJS.Timeout;
  private isRunning: boolean = false;

  constructor(config?: Partial<SchedulerConfig>) {
    super();
    
    this.config = {
      idleWarningThreshold: 60000,    // 1min
      idleCriticalThreshold: 300000,  // 5min
      pollInterval: 5000,             // 5s
      ...config
    };
  }

  // ==================== 生命周期 ====================

  /**
   * 启动调度器
   */
  start(): void {
    if (this.isRunning) return;

    this.isRunning = true;
    this.startPolling();
    this.emit('started');
    console.log('[TaskScheduler] 调度器已启动');
  }

  /**
   * 停止调度器
   */
  stop(): void {
    if (!this.isRunning) return;

    this.isRunning = false;
    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
      this.pollTimer = undefined;
    }
    this.emit('stopped');
    console.log('[TaskScheduler] 调度器已停止');
  }

  /**
   * 启动轮询
   */
  private startPolling(): void {
    const poll = () => {
      if (!this.isRunning) return;
      this.checkAndAssignTasks();
      this.checkIdleAgents();
      this.pollTimer = setTimeout(poll, this.config.pollInterval);
    };
    poll();
  }

  // ==================== 核心功能 ====================

  /**
   * 监听任务完成事件
   * 当收到 [System Message] A subagent task "XXX" just completed 时调用
   */
  onTaskCompleted(taskId: string, agentId: string, result?: any): void {
    console.log(`[TaskScheduler] 任务完成：${taskId} by ${agentId}`);
    
    // 1. 更新任务状态
    const task = this.tasks.get(taskId);
    if (task) {
      task.status = 'completed';
      task.result = result;
    }
    
    // 2. 释放 Agent
    const agent = this.agents.get(agentId);
    if (agent) {
      agent.currentTaskId = undefined;
      agent.status = AgentStatus.IDLE;
      agent.lastActiveAt = Date.now();
      agent.completedTasks++;
    }
    
    // 3. 触发事件
    this.emit('task:completed', { taskId, agentId, result });
    
    // 4. 立即尝试分配新任务
    this.checkAndAssignTasks();
  }

  /**
   * 检查并分配任务
   */
  private checkAndAssignTasks(): void {
    // 获取空闲 Agent
    const idleAgents = this.getIdleAgents();
    if (idleAgents.length === 0) return;

    // 获取待分配任务 (按优先级排序)
    const pendingTasks = this.getPendingTasks();
    if (pendingTasks.length === 0) return;

    // 为每个空闲 Agent 分配任务
    for (const agent of idleAgents) {
      const task = pendingTasks.shift();
      if (!task) break;
      this.assignTask(task.id, agent.id);
    }
  }

  /**
   * 检查空闲 Agent 状态
   */
  private checkIdleAgents(): void {
    const now = Date.now();

    for (const agent of this.agents.values()) {
      if (agent.status === AgentStatus.BUSY) continue;

      const idleTime = now - agent.lastActiveAt;
      
      if (idleTime > this.config.idleCriticalThreshold) {
        if (agent.status !== AgentStatus.CRITICAL) {
          agent.status = AgentStatus.CRITICAL;
          this.emit('agent:critical', {
            agentId: agent.id,
            name: agent.name,
            idleTime,
            message: `Agent ${agent.name} 已空闲超过 5 分钟 (严重)`
          });
        }
      } else if (idleTime > this.config.idleWarningThreshold) {
        if (agent.status !== AgentStatus.WARNING) {
          agent.status = AgentStatus.WARNING;
          this.emit('agent:warning', {
            agentId: agent.id,
            name: agent.name,
            idleTime,
            message: `Agent ${agent.name} 已空闲超过 1 分钟`
          });
        }
      }
    }
  }

  /**
   * 分配任务给 Agent
   */
  assignTask(taskId: string, agentId: string): { success: boolean; error?: string } {
    const task = this.tasks.get(taskId);
    const agent = this.agents.get(agentId);

    if (!task) {
      return { success: false, error: `任务不存在：${taskId}` };
    }

    if (!agent) {
      return { success: false, error: `Agent 不存在：${agentId}` };
    }

    // 更新任务状态
    task.status = 'assigned';
    task.assignedTo = agentId;

    // 更新 Agent 状态
    agent.status = AgentStatus.BUSY;
    agent.currentTaskId = taskId;
    agent.lastActiveAt = Date.now();

    this.emit('task:assigned', { task, agent });
    console.log(`[TaskScheduler] 任务分配：${task.title} → ${agent.name}`);
    
    return { success: true };
  }

  // ==================== 任务管理 ====================

  /**
   * 添加任务到队列
   */
  addTask(task: Omit<Task, 'id' | 'status' | 'createdAt'>): Task {
    const newTask: Task = {
      ...task,
      id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      status: 'pending',
      createdAt: Date.now()
    };
    
    this.tasks.set(newTask.id, newTask);
    this.emit('task:added', newTask);
    console.log(`[TaskScheduler] 任务已添加：${newTask.title} (${newTask.priority})`);
    
    // 立即尝试分配
    if (this.isRunning) {
      this.checkAndAssignTasks();
    }
    
    return newTask;
  }

  /**
   * 批量添加任务
   */
  addTasks(tasks: Array<Omit<Task, 'id' | 'status' | 'createdAt'>>): Task[] {
    return tasks.map(task => this.addTask(task));
  }

  /**
   * 获取待分配任务 (按优先级排序)
   */
  private getPendingTasks(): Task[] {
    const pending = Array.from(this.tasks.values())
      .filter(t => t.status === 'pending');
    
    // 按优先级排序 (P0 > P1 > P2)
    const priorityOrder = { P0: 0, P1: 1, P2: 2 };
    pending.sort((a, b) => {
      const diff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (diff !== 0) return diff;
      return a.createdAt - b.createdAt;
    });
    
    return pending;
  }

  // ==================== Agent 管理 ====================

  /**
   * 注册 Agent
   */
  registerAgent(agent: Omit<Agent, 'status' | 'lastActiveAt' | 'completedTasks'>): Agent {
    const newAgent: Agent = {
      ...agent,
      status: AgentStatus.IDLE,
      lastActiveAt: Date.now(),
      completedTasks: 0
    };
    
    this.agents.set(newAgent.id, newAgent);
    this.emit('agent:registered', newAgent);
    console.log(`[TaskScheduler] Agent 已注册：${newAgent.name} (${newAgent.type})`);
    
    // 立即尝试分配
    if (this.isRunning) {
      this.checkAndAssignTasks();
    }
    
    return newAgent;
  }

  /**
   * 注销 Agent
   */
  unregisterAgent(agentId: string): boolean {
    const success = this.agents.delete(agentId);
    if (success) {
      this.emit('agent:unregistered', agentId);
      console.log(`[TaskScheduler] Agent 已注销：${agentId}`);
    }
    return success;
  }

  /**
   * 获取空闲 Agent
   */
  private getIdleAgents(): Agent[] {
    return Array.from(this.agents.values()).filter(
      a => a.status === AgentStatus.IDLE || 
           a.status === AgentStatus.WARNING || 
           a.status === AgentStatus.CRITICAL
    );
  }

  // ==================== 查询接口 ====================

  /**
   * 获取所有任务
   */
  getTasks(): Task[] {
    return Array.from(this.tasks.values());
  }

  /**
   * 获取所有 Agent
   */
  getAgents(): Agent[] {
    return Array.from(this.agents.values());
  }

  /**
   * 获取调度器状态
   */
  getStatus(): { 
    totalTasks: number;
    pendingTasks: number;
    assignedTasks: number;
    completedTasks: number;
    totalAgents: number;
    busyAgents: number;
    idleAgents: number;
  } {
    const tasks = this.getTasks();
    const agents = this.getAgents();
    
    return {
      totalTasks: tasks.length,
      pendingTasks: tasks.filter(t => t.status === 'pending').length,
      assignedTasks: tasks.filter(t => t.status === 'assigned').length,
      completedTasks: tasks.filter(t => t.status === 'completed').length,
      totalAgents: agents.length,
      busyAgents: agents.filter(a => a.status === AgentStatus.BUSY).length,
      idleAgents: agents.filter(a => 
        a.status === AgentStatus.IDLE || 
        a.status === AgentStatus.WARNING || 
        a.status === AgentStatus.CRITICAL
      ).length
    };
  }

  // ==================== 工具方法 ====================

  /**
   * 解析系统消息
   * 解析 [System Message] A subagent task "XXX" just completed
   */
  static parseSystemMessage(message: string): { taskId: string; agentId?: string } | null {
    const match = message.match(/\[System Message\] A subagent task "([^"]+)" just completed/);
    if (match) {
      return { taskId: match[1] };
    }
    return null;
  }

  /**
   * 创建任务 (辅助函数)
   */
  static createTask(
    title: string,
    description: string,
    priority: TaskPriority = TaskPriority.P1,
    agentType?: AgentType
  ): Omit<Task, 'id' | 'status' | 'createdAt'> {
    return { title, description, priority, agentType };
  }

  /**
   * 创建 Agent (辅助函数)
   */
  static createAgent(
    id: string,
    name: string,
    type: AgentType
  ): Omit<Agent, 'status' | 'lastActiveAt' | 'completedTasks'> {
    return { id, name, type };
  }
}

// ==================== 导出默认实例 ====================

export const scheduler = new TaskScheduler();

export default TaskScheduler;
