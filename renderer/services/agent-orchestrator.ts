/**
 * Agent Orchestrator - 多 Agent 协作编排引擎
 * 
 * 负责：
 * - 工作流定义与解析 (JSON Schema)
 * - 任务分配逻辑
 * - Agent 间通信
 * - 结果合并
 */

import { db } from '../db/database';

// ============ 类型定义 ============

/**
 * Agent 节点定义
 */
export interface WorkflowAgent {
  id: string;           // Agent 唯一标识 (如 ARIA, ZARA, REX 等)
  name: string;         // 显示名称
  role: string;         // 角色描述
  model?: string;       // 使用的模型
  config?: Record<string, any>; // 特定配置
}

/**
 * 任务节点定义
 */
export interface WorkflowNode {
  id: string;                    // 节点唯一标识
  agentId: string;               // 关联的 Agent ID
  name: string;                  // 节点名称
  description?: string;          // 节点描述
  input?: InputMapping;          // 输入映射
  output?: OutputMapping;        // 输出映射
  dependencies?: string[];       // 依赖的节点 ID 列表
  timeout?: number;              // 超时时间 (秒)
  retryCount?: number;           // 重试次数
  config?: Record<string, any>;  // 节点特定配置
}

/**
 * 输入映射 - 定义如何获取输入数据
 */
export interface InputMapping {
  fromWorkflow?: string;         // 从工作流初始输入获取
  fromNode?: string;             // 从指定节点输出获取
  fromAgent?: string;            // 从 Agent 状态获取
  static?: any;                  // 静态值
  transform?: string;            // 转换函数 (JavaScript 表达式)
}

/**
 * 输出映射 - 定义如何处理输出数据
 */
export interface OutputMapping {
  toWorkflow?: string;           // 输出到工作流结果
  toNode?: string[];             // 输出到指定节点
  toAgent?: string;              // 输出到 Agent 状态
  transform?: string;            // 转换函数
}

/**
 * 工作流定义 (JSON Schema)
 */
export interface WorkflowDefinition {
  id: string;                    // 工作流唯一标识
  name: string;                  // 工作流名称
  description?: string;          // 工作流描述
  version: string;               // 版本号
  agents: WorkflowAgent[];       // 参与的 Agent 列表
  nodes: WorkflowNode[];         // 节点列表
  entryNode?: string;            // 入口节点 ID
  exitNode?: string;             // 出口节点 ID
  config?: {
    parallel?: boolean;          // 是否允许并行执行
    maxConcurrency?: number;     // 最大并发数
    timeout?: number;            // 全局超时 (秒)
    onError?: 'stop' | 'continue' | 'rollback'; // 错误处理策略
  };
  metadata?: Record<string, any>; // 元数据
}

/**
 * 节点执行状态
 */
export type NodeStatus = 
  | 'pending'      // 等待执行
  | 'running'      // 执行中
  | 'completed'    // 已完成
  | 'failed'       // 失败
  | 'skipped'      // 已跳过
  | 'timeout';     // 超时

/**
 * 节点执行结果
 */
export interface NodeExecutionResult {
  nodeId: string;
  status: NodeStatus;
  output?: any;
  error?: string;
  startTime?: number;
  endTime?: number;
  duration?: number;
  retryCount?: number;
}

/**
 * 工作流执行状态
 */
export type WorkflowStatus = 
  | 'idle'         // 空闲
  | 'running'      // 执行中
  | 'paused'       // 已暂停
  | 'completed'    // 已完成
  | 'failed'       // 失败
  | 'cancelled';   // 已取消

/**
 * 工作流执行上下文
 */
export interface WorkflowExecutionContext {
  workflowId: string;
  executionId: string;
  startTime: number;
  variables: Record<string, any>;      // 工作流变量
  nodeResults: Record<string, NodeExecutionResult>; // 节点执行结果
  agentStates: Record<string, any>;    // Agent 状态
  currentStep: number;
  totalSteps: number;
}

/**
 * 工作流执行实例
 */
export interface WorkflowExecution {
  id: string;
  workflowId: string;
  status: WorkflowStatus;
  context: WorkflowExecutionContext;
  startTime?: number;
  endTime?: number;
  result?: any;
  error?: string;
}

/**
 * Agent 通信消息
 */
export interface AgentMessage {
  from: string;
  to: string;
  type: 'request' | 'response' | 'event';
  payload: any;
  timestamp: number;
  correlationId?: string;
}

// ============ 工作流编排引擎 ============

export class AgentOrchestrator {
  private static instance: AgentOrchestrator;
  private workflows: Map<string, WorkflowDefinition> = new Map();
  private executions: Map<string, WorkflowExecution> = new Map();
  private messageQueue: AgentMessage[] = [];
  private eventListeners: Map<string, Function[]> = new Map();

  private constructor() {}

  /**
   * 获取单例实例
   */
  public static getInstance(): AgentOrchestrator {
    if (!AgentOrchestrator.instance) {
      AgentOrchestrator.instance = new AgentOrchestrator();
    }
    return AgentOrchestrator.instance;
  }

  // ============ 工作流管理 ============

  /**
   * 注册工作流定义
   */
  public registerWorkflow(workflow: WorkflowDefinition): void {
    this.workflows.set(workflow.id, workflow);
    this.emit('workflow:registered', { workflow });
    console.log(`[Orchestrator] Workflow registered: ${workflow.id} (${workflow.name})`);
  }

  /**
   * 获取工作流定义
   */
  public getWorkflow(workflowId: string): WorkflowDefinition | undefined {
    return this.workflows.get(workflowId);
  }

  /**
   * 获取所有工作流
   */
  public getAllWorkflows(): WorkflowDefinition[] {
    return Array.from(this.workflows.values());
  }

  /**
   * 删除工作流
   */
  public removeWorkflow(workflowId: string): boolean {
    return this.workflows.delete(workflowId);
  }

  // ============ 工作流执行 ============

  /**
   * 启动工作流执行
   */
  public async executeWorkflow(
    workflowId: string,
    initialInput?: any
  ): Promise<WorkflowExecution> {
    const workflow = this.getWorkflow(workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    const executionId = this.generateExecutionId();
    const context: WorkflowExecutionContext = {
      workflowId,
      executionId,
      startTime: Date.now(),
      variables: { ...initialInput },
      nodeResults: {},
      agentStates: {},
      currentStep: 0,
      totalSteps: workflow.nodes.length,
    };

    const execution: WorkflowExecution = {
      id: executionId,
      workflowId,
      status: 'running',
      context,
      startTime: Date.now(),
    };

    this.executions.set(executionId, execution);
    this.emit('workflow:started', { execution });

    // 执行工作流
    try {
      await this.executeNodes(workflow, context);
      execution.status = 'completed';
      execution.result = this.collectWorkflowResult(workflow, context);
      this.emit('workflow:completed', { execution });
    } catch (error) {
      execution.status = 'failed';
      execution.error = error instanceof Error ? error.message : String(error);
      execution.endTime = Date.now();
      this.emit('workflow:failed', { execution, error });
    }

    execution.endTime = Date.now();
    return execution;
  }

  /**
   * 执行所有节点
   */
  private async executeNodes(
    workflow: WorkflowDefinition,
    context: WorkflowExecutionContext
  ): Promise<void> {
    const { nodes, config } = workflow;
    const maxConcurrency = config?.maxConcurrency || 1;
    const isParallel = config?.parallel || false;

    // 拓扑排序确定执行顺序
    const sortedNodes = this.topologicalSort(nodes);

    if (isParallel && maxConcurrency > 1) {
      // 并行执行
      await this.executeNodesParallel(sortedNodes, workflow, context, maxConcurrency);
    } else {
      // 串行执行
      await this.executeNodesSequential(sortedNodes, workflow, context);
    }
  }

  /**
   * 串行执行节点
   */
  private async executeNodesSequential(
    nodes: WorkflowNode[],
    workflow: WorkflowDefinition,
    context: WorkflowExecutionContext
  ): Promise<void> {
    for (const node of nodes) {
      context.currentStep++;
      await this.executeNode(node, workflow, context);
      
      // 检查是否被取消
      const execution = this.executions.get(context.executionId);
      if (execution?.status === 'cancelled') {
        break;
      }
    }
  }

  /**
   * 并行执行节点
   */
  private async executeNodesParallel(
    nodes: WorkflowNode[],
    workflow: WorkflowDefinition,
    context: WorkflowExecutionContext,
    maxConcurrency: number
  ): Promise<void> {
    const pending = [...nodes];
    const running = new Map<string, Promise<void>>();

    while (pending.length > 0 || running.size > 0) {
      // 启动新节点直到达到并发限制
      while (pending.length > 0 && running.size < maxConcurrency) {
        const node = pending[0];
        
        // 检查依赖是否完成
        const dependenciesMet = !node.dependencies || 
          node.dependencies.every(depId => 
            context.nodeResults[depId]?.status === 'completed'
          );

        if (dependenciesMet) {
          pending.shift();
          const promise = this.executeNode(node, workflow, context)
            .finally(() => running.delete(node.id));
          running.set(node.id, promise);
        } else {
          // 依赖未满足，移到队列末尾
          pending.push(pending.shift()!);
        }
      }

      // 等待至少一个节点完成
      if (running.size > 0) {
        await Promise.race(Array.from(running.values()));
      }
    }
  }

  /**
   * 执行单个节点
   */
  private async executeNode(
    node: WorkflowNode,
    workflow: WorkflowDefinition,
    context: WorkflowExecutionContext
  ): Promise<NodeExecutionResult> {
    const result: NodeExecutionResult = {
      nodeId: node.id,
      status: 'running',
      startTime: Date.now(),
    };

    context.nodeResults[node.id] = result;
    this.emit('node:started', { node, context });

    try {
      // 准备输入
      const input = this.prepareInput(node, context);

      // 获取 Agent
      const agent = workflow.agents.find(a => a.id === node.agentId);
      if (!agent) {
        throw new Error(`Agent not found: ${node.agentId}`);
      }

      // 执行 Agent 任务
      const output = await this.invokeAgent(agent, node, input, context);

      // 处理输出
      this.processOutput(node, output, context);

      result.status = 'completed';
      result.output = output;
      result.endTime = Date.now();
      result.duration = result.endTime - result.startTime!;

      this.emit('node:completed', { node, result, context });
    } catch (error) {
      result.status = 'failed';
      result.error = error instanceof Error ? error.message : String(error);
      result.endTime = Date.now();
      result.duration = result.endTime - result.startTime!;

      // 重试逻辑
      const retryCount = node.retryCount || 0;
      if (retryCount > 0 && result.retryCount! < retryCount) {
        result.retryCount = (result.retryCount || 0) + 1;
        this.emit('node:retry', { node, result, context });
        return this.executeNode(node, workflow, context);
      }

      this.emit('node:failed', { node, result, context, error });

      // 错误处理策略
      if (workflow.config?.onError === 'stop') {
        throw error;
      }
    }

    return result;
  }

  /**
   * 准备节点输入
   */
  private prepareInput(
    node: WorkflowNode,
    context: WorkflowExecutionContext
  ): any {
    if (!node.input) {
      return {};
    }

    const input: any = {};

    if (node.input.fromWorkflow) {
      input[node.input.fromWorkflow] = context.variables[node.input.fromWorkflow];
    }

    if (node.input.fromNode) {
      const sourceResult = context.nodeResults[node.input.fromNode];
      if (sourceResult) {
        input.fromNode = sourceResult.output;
      }
    }

    if (node.input.static !== undefined) {
      input.static = node.input.static;
    }

    // 应用转换
    if (node.input.transform) {
      try {
        const transformFn = new Function('input', 'context', `return ${node.input.transform}`);
        return transformFn(input, context);
      } catch (error) {
        console.warn(`[Orchestrator] Transform failed for node ${node.id}:`, error);
      }
    }

    return input;
  }

  /**
   * 调用 Agent 执行任务
   */
  private async invokeAgent(
    agent: WorkflowAgent,
    node: WorkflowNode,
    input: any,
    context: WorkflowExecutionContext
  ): Promise<any> {
    // 发送 Agent 间通信消息
    this.sendAgentMessage({
      from: 'orchestrator',
      to: agent.id,
      type: 'request',
      payload: {
        nodeId: node.id,
        task: node.description,
        input,
        config: node.config,
      },
      timestamp: Date.now(),
    });

    // 模拟 Agent 执行 (实际实现需要调用真实的 Agent 服务)
    // TODO: 集成真实的 Agent 调用逻辑
    const output = await this.simulateAgentExecution(agent, input);

    // 接收 Agent 响应
    this.sendAgentMessage({
      from: agent.id,
      to: 'orchestrator',
      type: 'response',
      payload: { output },
      timestamp: Date.now(),
    });

    return output;
  }

  /**
   * 模拟 Agent 执行 (占位实现)
   */
  private async simulateAgentExecution(
    agent: WorkflowAgent,
    input: any
  ): Promise<any> {
    // 模拟延迟
    await new Promise(resolve => setTimeout(resolve, 100));

    // 返回模拟结果
    return {
      agentId: agent.id,
      agentName: agent.name,
      processedAt: Date.now(),
      input,
    };
  }

  /**
   * 处理节点输出
   */
  private processOutput(
    node: WorkflowNode,
    output: any,
    context: WorkflowExecutionContext
  ): void {
    if (!node.output) {
      return;
    }

    if (node.output.toWorkflow) {
      context.variables[node.output.toWorkflow] = output;
    }

    if (node.output.transform) {
      try {
        const transformFn = new Function('output', 'context', `return ${node.output.transform}`);
        output = transformFn(output, context);
      } catch (error) {
        console.warn(`[Orchestrator] Output transform failed for node ${node.id}:`, error);
      }
    }
  }

  /**
   * 收集工作流结果
   */
  private collectWorkflowResult(
    workflow: WorkflowDefinition,
    context: WorkflowExecutionContext
  ): any {
    const result: any = {
      workflowId: workflow.id,
      executionId: context.executionId,
      completedAt: Date.now(),
      nodes: {},
    };

    // 收集所有节点结果
    for (const [nodeId, nodeResult] of Object.entries(context.nodeResults)) {
      result.nodes[nodeId] = {
        status: nodeResult.status,
        output: nodeResult.output,
        duration: nodeResult.duration,
      };
    }

    // 收集工作流变量
    result.variables = context.variables;

    return result;
  }

  // ============ 工具方法 ============

  /**
   * 拓扑排序节点
   */
  private topologicalSort(nodes: WorkflowNode[]): WorkflowNode[] {
    const sorted: WorkflowNode[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();

    const visit = (node: WorkflowNode) => {
      if (visited.has(node.id)) return;
      if (visiting.has(node.id)) {
        throw new Error(`Circular dependency detected at node: ${node.id}`);
      }

      visiting.add(node.id);

      // 先访问依赖
      if (node.dependencies) {
        for (const depId of node.dependencies) {
          const depNode = nodes.find(n => n.id === depId);
          if (depNode) {
            visit(depNode);
          }
        }
      }

      visiting.delete(node.id);
      visited.add(node.id);
      sorted.push(node);
    };

    for (const node of nodes) {
      visit(node);
    }

    return sorted;
  }

  /**
   * 生成执行 ID
   */
  private generateExecutionId(): string {
    return `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 发送 Agent 间消息
   */
  private sendAgentMessage(message: AgentMessage): void {
    this.messageQueue.push(message);
    this.emit('message:sent', { message });
  }

  /**
   * 获取消息队列
   */
  public getMessageQueue(): AgentMessage[] {
    return [...this.messageQueue];
  }

  /**
   * 清空消息队列
   */
  public clearMessageQueue(): void {
    this.messageQueue = [];
  }

  // ============ 事件系统 ============

  /**
   * 注册事件监听器
   */
  public on(event: string, callback: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  /**
   * 移除事件监听器
   */
  public off(event: string, callback: Function): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * 触发事件
   */
  private emit(event: string, data: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`[Orchestrator] Event listener error for ${event}:`, error);
        }
      });
    }
  }

  // ============ 执行监控 ============

  /**
   * 获取执行实例
   */
  public getExecution(executionId: string): WorkflowExecution | undefined {
    return this.executions.get(executionId);
  }

  /**
   * 获取所有执行实例
   */
  public getAllExecutions(): WorkflowExecution[] {
    return Array.from(this.executions.values());
  }

  /**
   * 获取工作流的所有执行实例
   */
  public getWorkflowExecutions(workflowId: string): WorkflowExecution[] {
    return Array.from(this.executions.values()).filter(e => e.workflowId === workflowId);
  }

  /**
   * 取消执行
   */
  public cancelExecution(executionId: string): boolean {
    const execution = this.executions.get(executionId);
    if (execution && execution.status === 'running') {
      execution.status = 'cancelled';
      execution.endTime = Date.now();
      this.emit('workflow:cancelled', { execution });
      return true;
    }
    return false;
  }

  /**
   * 暂停执行
   */
  public pauseExecution(executionId: string): boolean {
    const execution = this.executions.get(executionId);
    if (execution && execution.status === 'running') {
      execution.status = 'paused';
      this.emit('workflow:paused', { execution });
      return true;
    }
    return false;
  }

  /**
   * 恢复执行
   */
  public resumeExecution(executionId: string): boolean {
    const execution = this.executions.get(executionId);
    if (execution && execution.status === 'paused') {
      execution.status = 'running';
      this.emit('workflow:resumed', { execution });
      return true;
    }
    return false;
  }
}

// 导出单例
export const orchestrator = AgentOrchestrator.getInstance();
export default orchestrator;
