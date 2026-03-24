/**
 * 负载均衡工具技能 - KAEL
 * 
 * 提供三种经典负载均衡算法：
 * 1. 轮询算法 (Round Robin) - 均匀分配请求
 * 2. 加权轮询算法 (Weighted Round Robin) - 按权重分配
 * 3. 最少连接算法 (Least Connections) - 分配到最空闲的节点
 * 
 * @module load-balancer-skill
 * @author KAEL
 * @version 1.0.0
 */

// ============================================
// 类型定义
// ============================================

/**
 * 服务器节点信息
 */
export interface ServerNode {
  /** 节点唯一标识 */
  id: string;
  /** 节点地址 (IP:Port 或 URL) */
  address: string;
  /** 节点权重 (用于加权轮询，默认 1) */
  weight?: number;
  /** 当前活跃连接数 (用于最少连接算法) */
  activeConnections?: number;
  /** 节点是否健康 */
  healthy?: boolean;
  /** 节点元数据 */
  metadata?: Record<string, any>;
}

/**
 * 负载均衡结果
 */
export interface LoadBalanceResult {
  /** 选中的节点 */
  node: ServerNode | null;
  /** 节点 ID */
  nodeId: string | null;
  /** 节点地址 */
  nodeAddress: string | null;
  /** 使用的算法 */
  algorithm: string;
  /** 时间戳 */
  timestamp: number;
}

/**
 * 轮询配置
 */
export interface RoundRobinOptions {
  /** 健康检查开关 */
  healthCheck?: boolean;
  /** 节点列表 */
  nodes: ServerNode[];
}

/**
 * 加权轮询配置
 */
export interface WeightedRoundRobinOptions {
  /** 健康检查开关 */
  healthCheck?: boolean;
  /** 节点列表 (必须包含 weight) */
  nodes: ServerNode[];
  /** 权重更新间隔 (毫秒) */
  weightUpdateInterval?: number;
}

/**
 * 最少连接配置
 */
export interface LeastConnectionsOptions {
  /** 健康检查开关 */
  healthCheck?: boolean;
  /** 节点列表 */
  nodes: ServerNode[];
  /** 连接数更新间隔 (毫秒) */
  connectionUpdateInterval?: number;
}

// ============================================
// 工具函数
// ============================================

/**
 * 检查节点是否健康可用
 */
function isNodeHealthy(node: ServerNode, healthCheck: boolean = true): boolean {
  if (!healthCheck) return true;
  return node.healthy !== false;
}

/**
 * 获取健康的节点列表
 */
function getHealthyNodes(nodes: ServerNode[], healthCheck: boolean = true): ServerNode[] {
  if (!healthCheck) return nodes;
  return nodes.filter(node => isNodeHealthy(node, healthCheck));
}

// ============================================
// 1. 轮询算法 (Round Robin)
// ============================================

/**
 * 轮询负载均衡器
 * 
 * 算法原理:
 * - 按顺序循环分配请求到每个节点
 * - 每个节点获得均等的请求量
 * - 简单、公平、无状态
 * 
 * 适用场景:
 * - 节点性能相近
 * - 请求处理时间相似
 * - 简单的负载分配需求
 * 
 * @example
 * const lb = new RoundRobinLoadBalancer({
 *   nodes: [
 *     { id: 'node1', address: '192.168.1.1:8080' },
 *     { id: 'node2', address: '192.168.1.2:8080' },
 *     { id: 'node3', address: '192.168.1.3:8080' }
 *   ]
 * });
 * 
 * // 获取下一个节点
 * const result = lb.getNext();
 * console.log(result.nodeAddress); // 192.168.1.1:8080
 * 
 * const result2 = lb.getNext();
 * console.log(result2.nodeAddress); // 192.168.1.2:8080
 */
export class RoundRobinLoadBalancer {
  private nodes: ServerNode[];
  private currentIndex: number = 0;
  private healthCheck: boolean;

  constructor(options: RoundRobinOptions) {
    this.nodes = [...options.nodes];
    this.healthCheck = options.healthCheck ?? true;
  }

  /**
   * 添加节点
   */
  addNode(node: ServerNode): void {
    this.nodes.push(node);
  }

  /**
   * 移除节点
   */
  removeNode(nodeId: string): void {
    this.nodes = this.nodes.filter(n => n.id !== nodeId);
    if (this.currentIndex >= this.nodes.length) {
      this.currentIndex = 0;
    }
  }

  /**
   * 更新节点列表
   */
  updateNodes(nodes: ServerNode[]): void {
    this.nodes = [...nodes];
    this.currentIndex = 0;
  }

  /**
   * 获取下一个节点
   */
  getNext(): LoadBalanceResult {
    const healthyNodes = getHealthyNodes(this.nodes, this.healthCheck);
    
    if (healthyNodes.length === 0) {
      return {
        node: null,
        nodeId: null,
        nodeAddress: null,
        algorithm: 'round-robin',
        timestamp: Date.now()
      };
    }

    const node = healthyNodes[this.currentIndex % healthyNodes.length];
    this.currentIndex = (this.currentIndex + 1) % healthyNodes.length;

    return {
      node,
      nodeId: node.id,
      nodeAddress: node.address,
      algorithm: 'round-robin',
      timestamp: Date.now()
    };
  }

  /**
   * 获取节点数量
   */
  getNodeCount(): number {
    return this.nodes.length;
  }

  /**
   * 获取所有节点
   */
  getNodes(): ServerNode[] {
    return [...this.nodes];
  }

  /**
   * 重置索引
   */
  reset(): void {
    this.currentIndex = 0;
  }
}

// ============================================
// 2. 加权轮询算法 (Weighted Round Robin)
// ============================================

/**
 * 加权轮询负载均衡器
 * 
 * 算法原理:
 * - 每个节点分配一个权重值
 * - 权重越高，获得的请求比例越高
 * - 使用平滑加权算法，避免突发分配
 * 
 * 适用场景:
 * - 节点性能不一致
 * - 需要根据服务器容量分配
 * - 灰度发布/金丝雀发布
 * 
 * @example
 * const lb = new WeightedRoundRobinLoadBalancer({
 *   nodes: [
 *     { id: 'node1', address: '192.168.1.1:8080', weight: 5 },
 *     { id: 'node2', address: '192.168.1.2:8080', weight: 3 },
 *     { id: 'node3', address: '192.168.1.3:8080', weight: 2 }
 *   ]
 * });
 * 
 * // 获取 10 次，权重高的节点会被更多次选中
 * for (let i = 0; i < 10; i++) {
 *   const result = lb.getNext();
 *   console.log(`${result.nodeId}: ${result.nodeAddress}`);
 * }
 */
export class WeightedRoundRobinLoadBalancer {
  private nodes: ServerNode[];
  private currentWeights: Map<string, number> = new Map();
  private healthCheck: boolean;

  constructor(options: WeightedRoundRobinOptions) {
    this.nodes = [...options.nodes];
    this.healthCheck = options.healthCheck ?? true;
    
    // 初始化当前权重
    this.nodes.forEach(node => {
      this.currentWeights.set(node.id, 0);
    });
  }

  /**
   * 添加节点
   */
  addNode(node: ServerNode): void {
    this.nodes.push(node);
    this.currentWeights.set(node.id, 0);
  }

  /**
   * 移除节点
   */
  removeNode(nodeId: string): void {
    this.nodes = this.nodes.filter(n => n.id !== nodeId);
    this.currentWeights.delete(nodeId);
  }

  /**
   * 更新节点权重
   */
  updateWeight(nodeId: string, weight: number): void {
    const node = this.nodes.find(n => n.id === nodeId);
    if (node) {
      node.weight = weight;
    }
  }

  /**
   * 获取下一个节点 (平滑加权轮询)
   */
  getNext(): LoadBalanceResult {
    const healthyNodes = getHealthyNodes(this.nodes, this.healthCheck);
    
    if (healthyNodes.length === 0) {
      return {
        node: null,
        nodeId: null,
        nodeAddress: null,
        algorithm: 'weighted-round-robin',
        timestamp: Date.now()
      };
    }

    let selectedNode: ServerNode | null = null;
    let maxWeight = -1;

    // 平滑加权算法
    // 1. 所有节点的当前权重 += 原始权重
    healthyNodes.forEach(node => {
      const weight = node.weight ?? 1;
      const current = this.currentWeights.get(node.id) ?? 0;
      this.currentWeights.set(node.id, current + weight);
    });

    // 2. 选择当前权重最大的节点
    healthyNodes.forEach(node => {
      const currentWeight = this.currentWeights.get(node.id) ?? 0;
      if (currentWeight > maxWeight) {
        maxWeight = currentWeight;
        selectedNode = node;
      }
    });

    // 3. 选中节点的当前权重 -= 总权重
    if (selectedNode) {
      const totalWeight = healthyNodes.reduce((sum, node) => sum + (node.weight ?? 1), 0);
      const currentWeight = this.currentWeights.get(selectedNode.id) ?? 0;
      this.currentWeights.set(selectedNode.id, currentWeight - totalWeight);
    }

    return selectedNode ? {
      node: selectedNode,
      nodeId: selectedNode.id,
      nodeAddress: selectedNode.address,
      algorithm: 'weighted-round-robin',
      timestamp: Date.now()
    } : {
      node: null,
      nodeId: null,
      nodeAddress: null,
      algorithm: 'weighted-round-robin',
      timestamp: Date.now()
    };
  }

  /**
   * 获取节点权重分布
   */
  getWeightDistribution(): Array<{ id: string; address: string; weight: number }> {
    return this.nodes.map(node => ({
      id: node.id,
      address: node.address,
      weight: node.weight ?? 1
    }));
  }

  /**
   * 获取节点数量
   */
  getNodeCount(): number {
    return this.nodes.length;
  }

  /**
   * 获取所有节点
   */
  getNodes(): ServerNode[] {
    return [...this.nodes];
  }

  /**
   * 重置所有权重
   */
  reset(): void {
    this.nodes.forEach(node => {
      this.currentWeights.set(node.id, 0);
    });
  }
}

// ============================================
// 3. 最少连接算法 (Least Connections)
// ============================================

/**
 * 最少连接负载均衡器
 * 
 * 算法原理:
 * - 追踪每个节点的活跃连接数
 * - 将新请求分配给连接数最少的节点
 * - 动态适应节点负载变化
 * 
 * 适用场景:
 * - 请求处理时间差异大
 * - 长连接场景 (WebSocket, 数据库连接)
 * - 需要动态负载均衡
 * 
 * @example
 * const lb = new LeastConnectionsLoadBalancer({
 *   nodes: [
 *     { id: 'node1', address: '192.168.1.1:8080', activeConnections: 10 },
 *     { id: 'node2', address: '192.168.1.2:8080', activeConnections: 5 },
 *     { id: 'node3', address: '192.168.1.3:8080', activeConnections: 20 }
 *   ]
 * });
 * 
 * // 会选择 node2 (连接数最少)
 * const result = lb.getNext();
 * console.log(result.nodeId); // node2
 * 
 * // 增加连接数
 * lb.incrementConnections('node2');
 * 
 * // 下次选择会避开 node2
 * const result2 = lb.getNext();
 * console.log(result2.nodeId); // node1
 */
export class LeastConnectionsLoadBalancer {
  private nodes: ServerNode[];
  private connectionCounts: Map<string, number> = new Map();
  private healthCheck: boolean;

  constructor(options: LeastConnectionsOptions) {
    this.nodes = [...options.nodes];
    this.healthCheck = options.healthCheck ?? true;
    
    // 初始化连接数
    this.nodes.forEach(node => {
      this.connectionCounts.set(node.id, node.activeConnections ?? 0);
    });
  }

  /**
   * 添加节点
   */
  addNode(node: ServerNode): void {
    this.nodes.push(node);
    this.connectionCounts.set(node.id, node.activeConnections ?? 0);
  }

  /**
   * 移除节点
   */
  removeNode(nodeId: string): void {
    this.nodes = this.nodes.filter(n => n.id !== nodeId);
    this.connectionCounts.delete(nodeId);
  }

  /**
   * 增加节点的连接数
   */
  incrementConnections(nodeId: string, count: number = 1): void {
    const current = this.connectionCounts.get(nodeId) ?? 0;
    this.connectionCounts.set(nodeId, current + count);
    
    // 同步到节点对象
    const node = this.nodes.find(n => n.id === nodeId);
    if (node) {
      node.activeConnections = current + count;
    }
  }

  /**
   * 减少节点的连接数
   */
  decrementConnections(nodeId: string, count: number = 1): void {
    const current = this.connectionCounts.get(nodeId) ?? 0;
    const newCount = Math.max(0, current - count);
    this.connectionCounts.set(nodeId, newCount);
    
    // 同步到节点对象
    const node = this.nodes.find(n => n.id === nodeId);
    if (node) {
      node.activeConnections = newCount;
    }
  }

  /**
   * 更新节点连接数
   */
  updateConnections(nodeId: string, count: number): void {
    this.connectionCounts.set(nodeId, count);
    
    // 同步到节点对象
    const node = this.nodes.find(n => n.id === nodeId);
    if (node) {
      node.activeConnections = count;
    }
  }

  /**
   * 获取下一个节点 (最少连接)
   */
  getNext(): LoadBalanceResult {
    const healthyNodes = getHealthyNodes(this.nodes, this.healthCheck);
    
    if (healthyNodes.length === 0) {
      return {
        node: null,
        nodeId: null,
        nodeAddress: null,
        algorithm: 'least-connections',
        timestamp: Date.now()
      };
    }

    let selectedNode: ServerNode = healthyNodes[0];
    let minConnections = this.connectionCounts.get(selectedNode.id) ?? Infinity;

    healthyNodes.forEach(node => {
      const connections = this.connectionCounts.get(node.id) ?? 0;
      if (connections < minConnections) {
        minConnections = connections;
        selectedNode = node;
      }
    });

    return {
      node: selectedNode,
      nodeId: selectedNode.id,
      nodeAddress: selectedNode.address,
      algorithm: 'least-connections',
      timestamp: Date.now()
    };
  }

  /**
   * 获取连接数分布
   */
  getConnectionDistribution(): Array<{ id: string; address: string; connections: number }> {
    return this.nodes.map(node => ({
      id: node.id,
      address: node.address,
      connections: this.connectionCounts.get(node.id) ?? 0
    }));
  }

  /**
   * 获取节点数量
   */
  getNodeCount(): number {
    return this.nodes.length;
  }

  /**
   * 获取所有节点
   */
  getNodes(): ServerNode[] {
    return [...this.nodes];
  }

  /**
   * 重置所有连接数
   */
  reset(): void {
    this.nodes.forEach(node => {
      this.connectionCounts.set(node.id, 0);
      node.activeConnections = 0;
    });
  }
}

// ============================================
// 工厂函数
// ============================================

/**
 * 创建负载均衡器
 * 
 * @param algorithm 算法类型
 * @param options 配置选项
 * @returns 负载均衡器实例
 * 
 * @example
 * // 创建轮询负载均衡器
 * const lb1 = createLoadBalancer('round-robin', {
 *   nodes: [
 *     { id: 'node1', address: '192.168.1.1:8080' },
 *     { id: 'node2', address: '192.168.1.2:8080' }
 *   ]
 * });
 * 
 * // 创建加权轮询负载均衡器
 * const lb2 = createLoadBalancer('weighted-round-robin', {
 *   nodes: [
 *     { id: 'node1', address: '192.168.1.1:8080', weight: 5 },
 *     { id: 'node2', address: '192.168.1.2:8080', weight: 3 }
 *   ]
 * });
 * 
 * // 创建最少连接负载均衡器
 * const lb3 = createLoadBalancer('least-connections', {
 *   nodes: [
 *     { id: 'node1', address: '192.168.1.1:8080', activeConnections: 10 },
 *     { id: 'node2', address: '192.168.1.2:8080', activeConnections: 5 }
 *   ]
 * });
 */
export function createLoadBalancer(
  algorithm: 'round-robin' | 'weighted-round-robin' | 'least-connections',
  options: RoundRobinOptions | WeightedRoundRobinOptions | LeastConnectionsOptions
): RoundRobinLoadBalancer | WeightedRoundRobinLoadBalancer | LeastConnectionsLoadBalancer {
  switch (algorithm) {
    case 'round-robin':
      return new RoundRobinLoadBalancer(options as RoundRobinOptions);
    case 'weighted-round-robin':
      return new WeightedRoundRobinLoadBalancer(options as WeightedRoundRobinOptions);
    case 'least-connections':
      return new LeastConnectionsLoadBalancer(options as LeastConnectionsOptions);
    default:
      throw new Error(`Unknown algorithm: ${algorithm}`);
  }
}

// ============================================
// 使用示例
// ============================================

/**
 * 使用示例代码
 * 
 * 运行方式：`uv run tsx load-balancer-skill.ts` 或 `node --loader tsx load-balancer-skill.ts`
 */
async function runExamples() {
  console.log('='.repeat(60));
  console.log('🔄 负载均衡工具 - 使用示例');
  console.log('='.repeat(60));
  console.log();

  // ============================================
  // 示例 1: 轮询算法
  // ============================================
  console.log('📍 示例 1: 轮询算法 (Round Robin)');
  console.log('-'.repeat(60));
  
  const rrLb = new RoundRobinLoadBalancer({
    nodes: [
      { id: 'node1', address: '192.168.1.1:8080' },
      { id: 'node2', address: '192.168.1.2:8080' },
      { id: 'node3', address: '192.168.1.3:8080' }
    ]
  });

  console.log('节点列表:');
  rrLb.getNodes().forEach(node => {
    console.log(`  - ${node.id}: ${node.address}`);
  });
  console.log();

  console.log('请求分配 (6 次):');
  for (let i = 0; i < 6; i++) {
    const result = rrLb.getNext();
    console.log(`  请求 ${i + 1}: ${result.nodeId} (${result.nodeAddress})`);
  }
  console.log();

  // ============================================
  // 示例 2: 加权轮询算法
  // ============================================
  console.log('📍 示例 2: 加权轮询算法 (Weighted Round Robin)');
  console.log('-'.repeat(60));
  
  const wrrLb = new WeightedRoundRobinLoadBalancer({
    nodes: [
      { id: 'node1', address: '192.168.1.1:8080', weight: 5 },
      { id: 'node2', address: '192.168.1.2:8080', weight: 3 },
      { id: 'node3', address: '192.168.1.3:8080', weight: 2 }
    ]
  });

  console.log('节点权重分布:');
  wrrLb.getWeightDistribution().forEach(node => {
    console.log(`  - ${node.id}: ${node.address} (权重：${node.weight})`);
  });
  console.log();

  console.log('请求分配 (10 次):');
  const wrrStats = new Map<string, number>();
  for (let i = 0; i < 10; i++) {
    const result = wrrLb.getNext();
    if (result.nodeId) {
      wrrStats.set(result.nodeId, (wrrStats.get(result.nodeId) ?? 0) + 1);
    }
    console.log(`  请求 ${i + 1}: ${result.nodeId} (${result.nodeAddress})`);
  }
  console.log();
  console.log('统计:');
  wrrStats.forEach((count, nodeId) => {
    console.log(`  ${nodeId}: ${count} 次`);
  });
  console.log();

  // ============================================
  // 示例 3: 最少连接算法
  // ============================================
  console.log('📍 示例 3: 最少连接算法 (Least Connections)');
  console.log('-'.repeat(60));
  
  const lcLb = new LeastConnectionsLoadBalancer({
    nodes: [
      { id: 'node1', address: '192.168.1.1:8080', activeConnections: 10 },
      { id: 'node2', address: '192.168.1.2:8080', activeConnections: 5 },
      { id: 'node3', address: '192.168.1.3:8080', activeConnections: 20 }
    ]
  });

  console.log('初始连接数分布:');
  lcLb.getConnectionDistribution().forEach(node => {
    console.log(`  - ${node.id}: ${node.address} (连接数：${node.connections})`);
  });
  console.log();

  console.log('请求分配:');
  const result1 = lcLb.getNext();
  console.log(`  请求 1: ${result1.nodeId} (当前连接数最少)`);
  
  // 模拟增加连接
  lcLb.incrementConnections(result1.nodeId!);
  console.log(`  → ${result1.nodeId} 连接数 +1`);
  
  const result2 = lcLb.getNext();
  console.log(`  请求 2: ${result2.nodeId} (当前连接数最少)`);
  
  lcLb.incrementConnections(result2.nodeId!);
  console.log(`  → ${result2.nodeId} 连接数 +1`);
  
  const result3 = lcLb.getNext();
  console.log(`  请求 3: ${result3.nodeId} (当前连接数最少)`);
  console.log();

  console.log('最终连接数分布:');
  lcLb.getConnectionDistribution().forEach(node => {
    console.log(`  - ${node.id}: ${node.address} (连接数：${node.connections})`);
  });
  console.log();

  // ============================================
  // 示例 4: 工厂函数
  // ============================================
  console.log('📍 示例 4: 工厂函数创建');
  console.log('-'.repeat(60));
  
  const lb1 = createLoadBalancer('round-robin', {
    nodes: [
      { id: 'a1', address: 'server1.example.com' },
      { id: 'a2', address: 'server2.example.com' }
    ]
  });
  console.log(`轮询负载均衡器：${lb1.getNodeCount()} 个节点`);
  
  const lb2 = createLoadBalancer('weighted-round-robin', {
    nodes: [
      { id: 'b1', address: 'server1.example.com', weight: 10 },
      { id: 'b2', address: 'server2.example.com', weight: 5 }
    ]
  });
  console.log(`加权轮询负载均衡器：${lb2.getNodeCount()} 个节点`);
  
  const lb3 = createLoadBalancer('least-connections', {
    nodes: [
      { id: 'c1', address: 'server1.example.com', activeConnections: 100 },
      { id: 'c2', address: 'server2.example.com', activeConnections: 50 }
    ]
  });
  console.log(`最少连接负载均衡器：${lb3.getNodeCount()} 个节点`);
  console.log();

  // ============================================
  // 示例 5: 健康检查
  // ============================================
  console.log('📍 示例 5: 健康检查');
  console.log('-'.repeat(60));
  
  const healthLb = new RoundRobinLoadBalancer({
    healthCheck: true,
    nodes: [
      { id: 'healthy1', address: '192.168.1.1:8080', healthy: true },
      { id: 'unhealthy', address: '192.168.1.2:8080', healthy: false },
      { id: 'healthy2', address: '192.168.1.3:8080', healthy: true }
    ]
  });

  console.log('节点健康状态:');
  healthLb.getNodes().forEach(node => {
    const status = node.healthy ? '✅ 健康' : '❌ 不健康';
    console.log(`  - ${node.id}: ${status}`);
  });
  console.log();

  console.log('请求分配 (只分配到健康节点):');
  for (let i = 0; i < 4; i++) {
    const result = healthLb.getNext();
    console.log(`  请求 ${i + 1}: ${result.nodeId} (${result.nodeAddress})`);
  }
  console.log();

  console.log('='.repeat(60));
  console.log('✅ 所有示例执行完毕');
  console.log('='.repeat(60));
}

// 如果直接运行此文件，执行示例
if (require.main === module) {
  runExamples().catch(console.error);
}

// ============================================
// 导出
// ============================================

export {
  RoundRobinLoadBalancer,
  WeightedRoundRobinLoadBalancer,
  LeastConnectionsLoadBalancer,
  createLoadBalancer,
  type ServerNode,
  type LoadBalanceResult,
  type RoundRobinOptions,
  type WeightedRoundRobinOptions,
  type LeastConnectionsOptions
};
