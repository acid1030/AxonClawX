/**
 * 类型定义 - AxonClaw 核心接口
 */

/**
 * 任务类型
 */
export type TaskType = 
  | 'code_generation'
  | 'documentation'
  | 'test_generation'
  | 'deployment'
  | 'analysis';

/**
 * 任务优先级
 */
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';

/**
 * 任务定义
 */
export interface Task {
  type: TaskType;
  description: string;
  priority: TaskPriority;
  metadata?: Record<string, any>;
}

/**
 * 任务执行结果
 */
export interface TaskResult {
  status: 'success' | 'failed' | 'partial';
  message: string;
  data: any | null;
}

/**
 * Agent 接口 - 所有专业 Agent 必须实现
 */
export interface Agent {
  /**
   * 获取 Agent ID
   */
  getId(): string;

  /**
   * 获取 Agent 名称
   */
  getName(): string;

  /**
   * 判断是否能处理该任务
   */
  canHandle(task: Task): boolean;

  /**
   * 执行任务
   */
  execute(task: Task): Promise<TaskResult>;

  /**
   * 获取当前状态
   */
  getStatus(): string;

  /**
   * 清理资源
   */
  cleanup(): Promise<void>;
}

/**
 * Agent 基础类 - 提供通用实现
 */
export abstract class BaseAgent implements Agent {
  protected id: string;
  protected name: string;
  protected status: string = 'idle';

  constructor(id: string, name: string) {
    this.id = id;
    this.name = name;
  }

  getId(): string {
    return this.id;
  }

  getName(): string {
    return this.name;
  }

  getStatus(): string {
    return this.status;
  }

  abstract canHandle(task: Task): boolean;
  abstract execute(task: Task): Promise<TaskResult>;

  async cleanup(): Promise<void> {
    this.status = 'stopped';
  }
}
