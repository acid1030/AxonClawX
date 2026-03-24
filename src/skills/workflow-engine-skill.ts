/**
 * 工作流引擎技能 - ACE (Agent Coordination Engine)
 * 
 * 提供工作流编排功能：
 * 1. 流程定义 - 定义工作流结构和节点
 * 2. 节点执行 - 执行工作流中的各个节点
 * 3. 条件分支 - 支持条件判断和分支逻辑
 * 
 * @author Axon
 * @version 1.0.0
 */

// ============================================
// 类型定义
// ============================================

/**
 * 节点类型
 */
export type NodeType = 
  | 'action'      // 执行动作
  | 'condition'   // 条件判断
  | 'parallel'    // 并行执行
  | 'loop'        // 循环
  | 'delay'       // 延迟
  | 'script';     // 执行脚本

/**
 * 节点状态
 */
export type NodeStatus = 
  | 'pending'     // 待执行
  | 'running'     // 执行中
  | 'completed'   // 已完成
  | 'failed'      // 失败
  | 'skipped';    // 已跳过

/**
 * 工作流节点定义
 */
export interface WorkflowNode {
  id: string;
  name: string;
  type: NodeType;
  description?: string;
  
  // 动作节点配置
  action?: string;
  params?: Record<string, any>;
  
  // 条件节点配置
  condition?: (context: WorkflowContext) => boolean;
  trueBranch?: string;  // 条件为真时跳转的节点 ID
  falseBranch?: string; // 条件为假时跳转的节点 ID
  
  // 并行节点配置
  parallelNodes?: string[];
  
  // 循环节点配置
  loopCondition?: (context: WorkflowContext) => boolean;
  loopNodes?: string[];
  
  // 延迟节点配置
  delayMs?: number;
  
  // 脚本节点配置
  script?: (context: WorkflowContext) => Promise<any>;
  
  // 执行配置
  timeoutMs?: number;
  retryCount?: number;
  onError?: 'stop' | 'continue' | 'skip';
  
  // 依赖关系
  dependencies?: string[];
}

/**
 * 工作流定义
 */
export interface WorkflowDefinition {
  id: string;
  name: string;
  description?: string;
  version: string;
  nodes: WorkflowNode[];
  startNode: string;
  metadata?: {
    author?: string;
    createdAt?: string;
    tags?: string[];
  };
}

/**
 * 工作流上下文
 */
export interface WorkflowContext {
  workflowId: string;
  variables: Record<string, any>;
  nodeResults: Record<string, any>;
  startTime: number;
  [key: string]: any;
}

/**
 * 节点执行结果
 */
export interface NodeExecutionResult {
  nodeId: string;
  status: NodeStatus;
  result?: any;
  error?: Error;
  startTime: number;
  endTime?: number;
  duration?: number;
}

/**
 * 工作流执行结果
 */
export interface WorkflowExecutionResult {
  workflowId: string;
  status: 'running' | 'completed' | 'failed' | 'stopped';
  nodeResults: NodeExecutionResult[];
  startTime: number;
  endTime?: number;
  duration?: number;
  error?: Error;
}

// ============================================
// 工作流引擎类
// ============================================

export class WorkflowEngine {
  private workflows: Map<string, WorkflowDefinition> = new Map();
  private runningWorkflows: Map<string, WorkflowExecutionResult> = new Map();

  /**
   * 注册工作流定义
   * 
   * @param definition - 工作流定义
   * @returns 工作流引擎实例 (支持链式调用)
   * 
   * @example
   * engine.registerWorkflow({
   *   id: 'data-pipeline',
   *   name: '数据处理管道',
   *   version: '1.0.0',
   *   nodes: [...],
   *   startNode: 'fetch-data'
   * });
   */
  registerWorkflow(definition: WorkflowDefinition): WorkflowEngine {
    if (this.workflows.has(definition.id)) {
      throw new Error(`工作流已存在: ${definition.id}`);
    }
    
    // 验证工作流定义
    this.validateWorkflow(definition);
    
    this.workflows.set(definition.id, definition);
    return this;
  }

  /**
   * 验证工作流定义
   */
  private validateWorkflow(definition: WorkflowDefinition): void {
    const nodeIds = new Set(definition.nodes.map(n => n.id));
    
    // 检查起始节点是否存在
    if (!nodeIds.has(definition.startNode)) {
      throw new Error(`起始节点不存在: ${definition.startNode}`);
    }
    
    // 检查节点依赖
    for (const node of definition.nodes) {
      if (node.dependencies) {
        for (const dep of node.dependencies) {
          if (!nodeIds.has(dep)) {
            throw new Error(`节点 ${node.id} 依赖不存在的节点: ${dep}`);
          }
        }
      }
      
      // 检查条件分支
      if (node.type === 'condition') {
        if (node.trueBranch && !nodeIds.has(node.trueBranch)) {
          throw new Error(`节点 ${node.id} 的真分支指向不存在的节点: ${node.trueBranch}`);
        }
        if (node.falseBranch && !nodeIds.has(node.falseBranch)) {
          throw new Error(`节点 ${node.id} 的假分支指向不存在的节点: ${node.falseBranch}`);
        }
      }
    }
  }

  /**
   * 执行工作流
   * 
   * @param workflowId - 工作流 ID
   * @param initialVariables - 初始变量
   * @returns 工作流执行结果
   * 
   * @example
   * const result = await engine.execute('data-pipeline', {
   *   sourceUrl: 'https://api.example.com/data',
   *   outputPath: './output'
   * });
   */
  async execute(
    workflowId: string,
    initialVariables: Record<string, any> = {}
  ): Promise<WorkflowExecutionResult> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`工作流不存在: ${workflowId}`);
    }

    const context: WorkflowContext = {
      workflowId,
      variables: { ...initialVariables },
      nodeResults: {},
      startTime: Date.now()
    };

    const result: WorkflowExecutionResult = {
      workflowId,
      status: 'running',
      nodeResults: [],
      startTime: Date.now()
    };

    this.runningWorkflows.set(workflowId, result);

    try {
      await this.executeNode(workflow, workflow.startNode, context, result);
      result.status = 'completed';
    } catch (error) {
      result.status = 'failed';
      result.error = error instanceof Error ? error : new Error(String(error));
    }

    result.endTime = Date.now();
    result.duration = result.endTime - result.startTime;

    this.runningWorkflows.delete(workflowId);
    return result;
  }

  /**
   * 执行单个节点
   */
  private async executeNode(
    workflow: WorkflowDefinition,
    nodeId: string,
    context: WorkflowContext,
    result: WorkflowExecutionResult
  ): Promise<void> {
    const node = workflow.nodes.find(n => n.id === nodeId);
    if (!node) {
      throw new Error(`节点不存在: ${nodeId}`);
    }

    // 检查依赖
    if (node.dependencies) {
      for (const depId of node.dependencies) {
        const depResult = context.nodeResults[depId];
        if (!depResult || depResult.status !== 'completed') {
          throw new Error(`依赖节点未完成: ${depId}`);
        }
      }
    }

    const nodeResult: NodeExecutionResult = {
      nodeId,
      status: 'running',
      startTime: Date.now()
    };

    result.nodeResults.push(nodeResult);

    try {
      // 执行节点
      const output = await this.runNode(node, context);
      
      nodeResult.status = 'completed';
      nodeResult.result = output;
      context.nodeResults[nodeId] = nodeResult;

      // 处理后续节点
      await this.handleNodeCompletion(node, workflow, context, result);
    } catch (error) {
      nodeResult.status = 'failed';
      nodeResult.error = error instanceof Error ? error : new Error(String(error));
      context.nodeResults[nodeId] = nodeResult;

      // 错误处理
      if (node.onError === 'stop') {
        throw error;
      } else if (node.onError === 'skip') {
        // 跳过后续节点
        return;
      }
      // onError === 'continue' 时继续执行
    }

    nodeResult.endTime = Date.now();
    nodeResult.duration = nodeResult.endTime - nodeResult.startTime;
  }

  /**
   * 运行节点逻辑
   */
  private async runNode(node: WorkflowNode, context: WorkflowContext): Promise<any> {
    switch (node.type) {
      case 'action':
        return this.executeAction(node, context);
      
      case 'condition':
        return this.evaluateCondition(node, context);
      
      case 'parallel':
        return this.executeParallel(node, context);
      
      case 'loop':
        return this.executeLoop(node, context);
      
      case 'delay':
        return this.executeDelay(node);
      
      case 'script':
        return this.executeScript(node, context);
      
      default:
        throw new Error(`未知的节点类型: ${node.type}`);
    }
  }

  /**
   * 执行动作节点
   */
  private async executeAction(node: WorkflowNode, context: WorkflowContext): Promise<any> {
    if (!node.action) {
      throw new Error(`动作节点 ${node.id} 未指定 action`);
    }

    // 这里可以集成实际的执行器
    // 目前返回模拟结果
    console.log(`[ACE] 执行动作: ${node.action}`, node.params);
    
    return {
      action: node.action,
      params: node.params,
      timestamp: Date.now()
    };
  }

  /**
   * 评估条件节点
   */
  private async evaluateCondition(node: WorkflowNode, context: WorkflowContext): Promise<boolean> {
    if (!node.condition) {
      throw new Error(`条件节点 ${node.id} 未指定 condition`);
    }

    const result = node.condition(context);
    console.log(`[ACE] 条件评估 ${node.id}: ${result}`);
    
    return result;
  }

  /**
   * 执行并行节点
   */
  private async executeParallel(node: WorkflowNode, context: WorkflowContext): Promise<any[]> {
    if (!node.parallelNodes || node.parallelNodes.length === 0) {
      throw new Error(`并行节点 ${node.id} 未指定 parallelNodes`);
    }

    const workflow = this.workflows.get(context.workflowId);
    if (!workflow) {
      throw new Error(`工作流不存在: ${context.workflowId}`);
    }

    console.log(`[ACE] 并行执行节点: ${node.parallelNodes.join(', ')}`);

    const results = await Promise.all(
      node.parallelNodes.map(nodeId => 
        this.executeNode(workflow, nodeId, context, {
          workflowId: context.workflowId,
          status: 'running',
          nodeResults: [],
          startTime: context.startTime
        } as any)
      )
    );

    return results;
  }

  /**
   * 执行循环节点
   */
  private async executeLoop(node: WorkflowNode, context: WorkflowContext): Promise<any[]> {
    if (!node.loopCondition || !node.loopNodes) {
      throw new Error(`循环节点 ${node.id} 配置不完整`);
    }

    const workflow = this.workflows.get(context.workflowId);
    if (!workflow) {
      throw new Error(`工作流不存在: ${context.workflowId}`);
    }

    const results: any[] = [];
    let iteration = 0;
    const maxIterations = 100; // 防止无限循环

    console.log(`[ACE] 开始循环: ${node.id}`);

    while (node.loopCondition(context) && iteration < maxIterations) {
      console.log(`[ACE] 循环迭代 #${iteration + 1}`);
      
      for (const nodeId of node.loopNodes) {
        await this.executeNode(workflow, nodeId, context, {
          workflowId: context.workflowId,
          status: 'running',
          nodeResults: [],
          startTime: context.startTime
        } as any);
      }
      
      iteration++;
    }

    if (iteration >= maxIterations) {
      console.warn(`[ACE] 循环达到最大迭代次数: ${maxIterations}`);
    }

    return results;
  }

  /**
   * 执行延迟节点
   */
  private async executeDelay(node: WorkflowNode): Promise<void> {
    const delayMs = node.delayMs || 0;
    console.log(`[ACE] 延迟: ${delayMs}ms`);
    
    return new Promise(resolve => setTimeout(resolve, delayMs));
  }

  /**
   * 执行脚本节点
   */
  private async executeScript(node: WorkflowNode, context: WorkflowContext): Promise<any> {
    if (!node.script) {
      throw new Error(`脚本节点 ${node.id} 未指定 script`);
    }

    console.log(`[ACE] 执行脚本: ${node.id}`);
    return await node.script(context);
  }

  /**
   * 处理节点完成后的流程跳转
   */
  private async handleNodeCompletion(
    node: WorkflowNode,
    workflow: WorkflowDefinition,
    context: WorkflowContext,
    result: WorkflowExecutionResult
  ): Promise<void> {
    // 条件节点处理分支
    if (node.type === 'condition') {
      const nodeResult = context.nodeResults[node.id];
      const conditionResult = nodeResult?.result as boolean;
      
      const nextNodeId = conditionResult ? node.trueBranch : node.falseBranch;
      
      if (nextNodeId) {
        await this.executeNode(workflow, nextNodeId, context, result);
      }
      return;
    }

    // 查找后续节点 (通过依赖关系或顺序执行)
    const nextNode = workflow.nodes.find(n => 
      n.dependencies?.includes(node.id)
    );

    if (nextNode && nextNode.id !== node.id) {
      await this.executeNode(workflow, nextNode.id, context, result);
    }
  }

  /**
   * 获取工作流定义
   */
  getWorkflow(workflowId: string): WorkflowDefinition | undefined {
    return this.workflows.get(workflowId);
  }

  /**
   * 获取运行中的工作流
   */
  getRunningWorkflows(): Map<string, WorkflowExecutionResult> {
    return new Map(this.runningWorkflows);
  }

  /**
   * 列出所有注册的工作流
   */
  listWorkflows(): string[] {
    return Array.from(this.workflows.keys());
  }
}

// ============================================
// 便捷函数
// ============================================

/**
 * 创建条件函数
 */
export function createCondition(
  predicate: (context: WorkflowContext) => boolean
): (context: WorkflowContext) => boolean {
  return predicate;
}

/**
 * 创建脚本函数
 */
export function createScript(
  fn: (context: WorkflowContext) => Promise<any>
): (context: WorkflowContext) => Promise<any> {
  return fn;
}

// ============================================
// 使用示例
// ============================================

if (require.main === module) {
  console.log('=== 工作流引擎技能 - 使用示例 ===\n');
  
  const engine = new WorkflowEngine();

  // ============================================
  // 示例 1: 简单线性工作流
  // ============================================
  console.log('1️⃣ 简单线性工作流:\n');
  
  engine.registerWorkflow({
    id: 'simple-pipeline',
    name: '简单数据处理管道',
    version: '1.0.0',
    description: '演示基本的线性工作流执行',
    nodes: [
      {
        id: 'fetch-data',
        name: '获取数据',
        type: 'action',
        action: 'fetch',
        params: { url: 'https://api.example.com/data' }
      },
      {
        id: 'process-data',
        name: '处理数据',
        type: 'action',
        action: 'process',
        params: { format: 'json' },
        dependencies: ['fetch-data']
      },
      {
        id: 'save-result',
        name: '保存结果',
        type: 'action',
        action: 'save',
        params: { path: './output' },
        dependencies: ['process-data']
      }
    ],
    startNode: 'fetch-data'
  });

  console.log('   已注册工作流: simple-pipeline');
  console.log('   节点: fetch-data → process-data → save-result\n');

  // ============================================
  // 示例 2: 条件分支工作流
  // ============================================
  console.log('2️⃣ 条件分支工作流:\n');
  
  engine.registerWorkflow({
    id: 'conditional-workflow',
    name: '条件判断工作流',
    version: '1.0.0',
    description: '演示条件分支逻辑',
    nodes: [
      {
        id: 'check-status',
        name: '检查状态',
        type: 'condition',
        condition: (ctx) => ctx.variables.status === 'active',
        trueBranch: 'process-active',
        falseBranch: 'process-inactive'
      },
      {
        id: 'process-active',
        name: '处理活跃状态',
        type: 'action',
        action: 'processActive',
        dependencies: ['check-status']
      },
      {
        id: 'process-inactive',
        name: '处理非活跃状态',
        type: 'action',
        action: 'processInactive',
        dependencies: ['check-status']
      }
    ],
    startNode: 'check-status'
  });

  console.log('   已注册工作流: conditional-workflow');
  console.log('   逻辑: check-status → (active ? process-active : process-inactive)\n');

  // ============================================
  // 示例 3: 并行执行工作流
  // ============================================
  console.log('3️⃣ 并行执行工作流:\n');
  
  engine.registerWorkflow({
    id: 'parallel-workflow',
    name: '并行处理工作流',
    version: '1.0.0',
    description: '演示并行节点执行',
    nodes: [
      {
        id: 'start',
        name: '开始',
        type: 'action',
        action: 'init'
      },
      {
        id: 'parallel-task',
        name: '并行任务',
        type: 'parallel',
        parallelNodes: ['task-a', 'task-b', 'task-c'],
        dependencies: ['start']
      },
      {
        id: 'task-a',
        name: '任务 A',
        type: 'action',
        action: 'taskA'
      },
      {
        id: 'task-b',
        name: '任务 B',
        type: 'action',
        action: 'taskB'
      },
      {
        id: 'task-c',
        name: '任务 C',
        type: 'action',
        action: 'taskC'
      },
      {
        id: 'aggregate',
        name: '汇总结果',
        type: 'action',
        action: 'aggregate',
        dependencies: ['task-a', 'task-b', 'task-c']
      }
    ],
    startNode: 'start'
  });

  console.log('   已注册工作流: parallel-workflow');
  console.log('   逻辑: start → [task-a || task-b || task-c] → aggregate\n');

  // ============================================
  // 示例 4: 循环工作流
  // ============================================
  console.log('4️⃣ 循环工作流:\n');
  
  engine.registerWorkflow({
    id: 'loop-workflow',
    name: '循环处理工作流',
    version: '1.0.0',
    description: '演示循环节点执行',
    nodes: [
      {
        id: 'init-counter',
        name: '初始化计数器',
        type: 'script',
        script: async (ctx) => {
          ctx.variables.counter = 0;
          return { counter: 0 };
        }
      },
      {
        id: 'loop-node',
        name: '循环处理',
        type: 'loop',
        loopCondition: (ctx) => ctx.variables.counter < 3,
        loopNodes: ['increment', 'process'],
        dependencies: ['init-counter']
      },
      {
        id: 'increment',
        name: '计数器 +1',
        type: 'script',
        script: async (ctx) => {
          ctx.variables.counter++;
          return { counter: ctx.variables.counter };
        }
      },
      {
        id: 'process',
        name: '处理当前项',
        type: 'action',
        action: 'processItem',
        params: { index: '${counter}' }
      },
      {
        id: 'finalize',
        name: '完成处理',
        type: 'action',
        action: 'finalize',
        dependencies: ['loop-node']
      }
    ],
    startNode: 'init-counter'
  });

  console.log('   已注册工作流: loop-workflow');
  console.log('   逻辑: init → loop(counter<3) [increment → process] → finalize\n');

  // ============================================
  // 示例 5: 完整业务场景
  // ============================================
  console.log('5️⃣ 完整业务场景 - 订单处理:\n');
  
  engine.registerWorkflow({
    id: 'order-processing',
    name: '订单处理流程',
    version: '1.0.0',
    description: '完整的订单处理业务流',
    metadata: {
      author: 'Axon',
      createdAt: '2026-03-13',
      tags: ['order', 'ecommerce', 'payment']
    },
    nodes: [
      {
        id: 'validate-order',
        name: '验证订单',
        type: 'action',
        action: 'validateOrder',
        params: { strict: true }
      },
      {
        id: 'check-inventory',
        name: '检查库存',
        type: 'condition',
        condition: (ctx) => ctx.variables.inventoryAvailable === true,
        trueBranch: 'reserve-inventory',
        falseBranch: 'notify-out-of-stock',
        dependencies: ['validate-order']
      },
      {
        id: 'reserve-inventory',
        name: '预留库存',
        type: 'action',
        action: 'reserveInventory',
        dependencies: ['check-inventory']
      },
      {
        id: 'notify-out-of-stock',
        name: '通知缺货',
        type: 'action',
        action: 'sendNotification',
        params: { type: 'out_of_stock' },
        dependencies: ['check-inventory']
      },
      {
        id: 'process-payment',
        name: '处理支付',
        type: 'action',
        action: 'processPayment',
        dependencies: ['reserve-inventory']
      },
      {
        id: 'payment-success',
        name: '支付成功检查',
        type: 'condition',
        condition: (ctx) => {
          const result = ctx.nodeResults['process-payment']?.result;
          return result?.success === true;
        },
        trueBranch: 'create-shipment',
        falseBranch: 'refund-and-notify',
        dependencies: ['process-payment']
      },
      {
        id: 'create-shipment',
        name: '创建发货单',
        type: 'action',
        action: 'createShipment',
        dependencies: ['payment-success']
      },
      {
        id: 'refund-and-notify',
        name: '退款并通知',
        type: 'parallel',
        parallelNodes: ['process-refund', 'send-failure-notify'],
        dependencies: ['payment-success']
      },
      {
        id: 'process-refund',
        name: '处理退款',
        type: 'action',
        action: 'refundPayment'
      },
      {
        id: 'send-failure-notify',
        name: '发送失败通知',
        type: 'action',
        action: 'sendNotification',
        params: { type: 'payment_failed' }
      },
      {
        id: 'complete-order',
        name: '完成订单',
        type: 'action',
        action: 'markOrderComplete',
        dependencies: ['create-shipment']
      }
    ],
    startNode: 'validate-order'
  });

  console.log('   已注册工作流: order-processing');
  console.log('   流程:');
  console.log('   validate-order → check-inventory');
  console.log('     ├─ (有货) → reserve-inventory → process-payment');
  console.log('     │           ├─ (成功) → create-shipment → complete-order');
  console.log('     │           └─ (失败) → [refund + notify]');
  console.log('     └─ (缺货) → notify-out-of-stock\n');

  // ============================================
  // 执行示例
  // ============================================
  console.log('============================================\n');
  console.log('执行工作流示例:\n');
  
  console.log('已注册的工作流:');
  engine.listWorkflows().forEach(id => {
    console.log(`  - ${id}`);
  });
  
  console.log('\n✅ 工作流引擎初始化完成!');
  console.log('💡 提示: 调用 engine.execute(workflowId, variables) 执行工作流');
}
