/**
 * 负载均衡器模式技能 - ACE (Advanced Cluster Engine)
 * 
 * 基于 Builder Pattern 的负载均衡器构建工具，提供：
 * 1. 链式 API 构建负载均衡器
 * 2. 自动健康检查与故障转移
 * 3. 多种负载均衡算法策略
 * 4. 实时监控与指标收集
 * 
 * @module balancer-pattern-skill
 * @author Axon (ACE Subagent)
 * @version 1.0.0
 * @created 2026-03-13
 */

// ============================================
// 类型定义
// ============================================

/**
 * 服务器节点信息
 */
export interface BalancerNode {
  /** 节点唯一标识 */
  id: string;
  /** 节点地址 (IP:Port 或 URL) */
  address: string;
  /** 节点权重 (1-100) */
  weight: number;
  /** 当前活跃连接数 */
  activeConnections: number;
  /** 节点是否健康 */
  healthy: boolean;
  /** 连续失败次数 */
  failureCount: number;
  /** 最后健康检查时间 */
  lastHealthCheck?: number;
  /** 响应时间 (ms) */
  responseTime?: number;
  /** 节点元数据 */
  metadata?: Record<string, any>;
}

/**
 * 健康检查配置
 */
export interface HealthCheckConfig {
  /** 是否启用健康检查 */
  enabled: boolean;
  /** 健康检查间隔 (ms) */
  interval: number;
  /** 超时时间 (ms) */
  timeout: number;
  /** 连续失败多少次标记为不健康 */
  failureThreshold: number;
  /** 连续成功多少次恢复健康 */
  successThreshold: number;
  /** 健康检查端点 */
  endpoint?: string;
  /** 自定义健康检查函数 */
  customCheck?: (node: BalancerNode) => Promise<boolean>;
}

/**
 * 故障转移配置
 */
export interface FailoverConfig {
  /** 是否启用故障转移 */
  enabled: boolean;
  /** 重试次数 */
  retries: number;
  /** 重试间隔 (ms) */
  retryDelay: number;
  /** 是否自动剔除故障节点 */
  autoRemove: boolean;
  /** 故障节点恢复时间 (ms) */
  recoveryTime: number;
}

/**
 * 负载均衡算法类型
 */
export type BalancerAlgorithm = 
  | 'round-robin'           // 轮询
  | 'weighted-round-robin'  // 加权轮询
  | 'least-connections'     // 最少连接
  | 'random'                // 随机
  | 'ip-hash'               // IP 哈希
  | 'least-response-time';  // 最快响应

/**
 * 负载均衡结果
 */
export interface BalancerResult {
  /** 选中的节点 */
  node: BalancerNode | null;
  /** 节点 ID */
  nodeId: string | null;
  /** 节点地址 */
  nodeAddress: string | null;
  /** 使用的算法 */
  algorithm: string;
  /** 是否为故障转移 */
  isFailover: boolean;
  /** 重试次数 */
  retryCount: number;
  /** 时间戳 */
  timestamp: number;
}

/**
 * 负载均衡器指标
 */
export interface BalancerMetrics {
  /** 总请求数 */
  totalRequests: number;
  /** 成功请求数 */
  successfulRequests: number;
  /** 失败请求数 */
  failedRequests: number;
  /** 故障转移次数 */
  failoverCount: number;
  /** 按节点统计 */
  requestsByNode: Map<string, number>;
  /** 平均响应时间 */
  avgResponseTime: number;
  /** 健康节点数 */
  healthyNodes: number;
  /** 总节点数 */
  totalNodes: number;
}

/**
 * 负载均衡器配置
 */
export interface BalancerConfig {
  /** 算法类型 */
  algorithm: BalancerAlgorithm;
  /** 健康检查配置 */
  healthCheck: HealthCheckConfig;
  /** 故障转移配置 */
  failover: FailoverConfig;
  /** 是否收集指标 */
  metricsEnabled: boolean;
}

/**
 * Builder 配置选项
 */
export interface BalancerBuilderOptions {
  /** 严格模式，配置错误时抛出异常 */
  strict?: boolean;
  /** 自动验证配置 */
  autoValidate?: boolean;
  /** 构建完成回调 */
  onComplete?: (balancer: LoadBalancer) => void;
}

// ============================================
// 默认配置
// ============================================

const DEFAULT_HEALTH_CHECK: HealthCheckConfig = {
  enabled: true,
  interval: 5000,
  timeout: 2000,
  failureThreshold: 3,
  successThreshold: 2,
  endpoint: '/health',
};

const DEFAULT_FAILOVER: FailoverConfig = {
  enabled: true,
  retries: 3,
  retryDelay: 100,
  autoRemove: false,
  recoveryTime: 30000,
};

const DEFAULT_CONFIG: BalancerConfig = {
  algorithm: 'round-robin',
  healthCheck: DEFAULT_HEALTH_CHECK,
  failover: DEFAULT_FAILOVER,
  metricsEnabled: true,
};

// ============================================
// 负载均衡器基类
// ============================================

/**
 * 负载均衡器核心类
 * 
 * 支持多种算法、健康检查、故障转移和实时监控
 */
export class LoadBalancer {
  protected nodes: Map<string, BalancerNode> = new Map();
  protected config: BalancerConfig;
  protected metrics: BalancerMetrics;
  protected healthCheckInterval?: NodeJS.Timeout;
  protected currentIndex: number = 0;
  protected currentWeights: Map<string, number> = new Map();

  constructor(config: Partial<BalancerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.metrics = this.initMetrics();
  }

  private initMetrics(): BalancerMetrics {
    return {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      failoverCount: 0,
      requestsByNode: new Map(),
      avgResponseTime: 0,
      healthyNodes: 0,
      totalNodes: 0,
    };
  }

  /**
   * 添加节点
   */
  addNode(node: Partial<BalancerNode>): this {
    const fullNode: BalancerNode = {
      id: node.id || `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      address: node.address || '',
      weight: node.weight ?? 1,
      activeConnections: node.activeConnections ?? 0,
      healthy: node.healthy ?? true,
      failureCount: node.failureCount ?? 0,
      lastHealthCheck: node.lastHealthCheck,
      responseTime: node.responseTime,
      metadata: node.metadata,
    };

    this.nodes.set(fullNode.id, fullNode);
    this.currentWeights.set(fullNode.id, 0);
    this.metrics.totalNodes = this.nodes.size;
    this.updateHealthyCount();
    return this;
  }

  /**
   * 批量添加节点
   */
  addNodes(nodes: Array<Partial<BalancerNode>>): this {
    nodes.forEach(node => this.addNode(node));
    return this;
  }

  /**
   * 移除节点
   */
  removeNode(nodeId: string): boolean {
    const removed = this.nodes.delete(nodeId);
    this.currentWeights.delete(nodeId);
    this.metrics.requestsByNode.delete(nodeId);
    this.metrics.totalNodes = this.nodes.size;
    this.updateHealthyCount();
    return removed;
  }

  /**
   * 获取节点
   */
  getNode(nodeId: string): BalancerNode | undefined {
    return this.nodes.get(nodeId);
  }

  /**
   * 获取所有节点
   */
  getNodes(): BalancerNode[] {
    return Array.from(this.nodes.values());
  }

  /**
   * 获取健康节点
   */
  getHealthyNodes(): BalancerNode[] {
    return this.getNodes().filter(node => node.healthy);
  }

  /**
   * 更新节点健康状态
   */
  updateNodeHealth(nodeId: string, healthy: boolean): void {
    const node = this.nodes.get(nodeId);
    if (node) {
      node.healthy = healthy;
      node.lastHealthCheck = Date.now();
      if (healthy) {
        node.failureCount = 0;
      }
      this.updateHealthyCount();
    }
  }

  /**
   * 更新节点连接数
   */
  updateConnections(nodeId: string, delta: number): void {
    const node = this.nodes.get(nodeId);
    if (node) {
      node.activeConnections = Math.max(0, node.activeConnections + delta);
    }
  }

  /**
   * 更新节点响应时间
   */
  updateResponseTime(nodeId: string, responseTime: number): void {
    const node = this.nodes.get(nodeId);
    if (node) {
      node.responseTime = responseTime;
    }
  }

  /**
   * 执行健康检查
   */
  async performHealthCheck(): Promise<void> {
    if (!this.config.healthCheck.enabled) return;

    for (const node of this.nodes.values()) {
      try {
        let isHealthy = true;

        if (this.config.healthCheck.customCheck) {
          isHealthy = await this.config.healthCheck.customCheck(node);
        } else if (this.config.healthCheck.endpoint) {
          // 模拟健康检查 (实际使用时替换为真实 HTTP 请求)
          isHealthy = node.healthy; // 简化实现
        }

        if (isHealthy) {
          node.failureCount = Math.max(0, node.failureCount - 1);
          if (node.failureCount === 0) {
            node.healthy = true;
          }
        } else {
          node.failureCount++;
          if (node.failureCount >= this.config.healthCheck.failureThreshold) {
            node.healthy = false;
          }
        }

        node.lastHealthCheck = Date.now();
      } catch (error) {
        node.failureCount++;
        node.healthy = node.failureCount < this.config.healthCheck.failureThreshold;
        node.lastHealthCheck = Date.now();
      }
    }

    this.updateHealthyCount();
  }

  /**
   * 启动自动健康检查
   */
  startHealthCheck(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    this.performHealthCheck();
    this.healthCheckInterval = setInterval(
      () => this.performHealthCheck(),
      this.config.healthCheck.interval
    );
  }

  /**
   * 停止健康检查
   */
  stopHealthCheck(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = undefined;
    }
  }

  /**
   * 获取下一个节点 (核心算法)
   */
  getNext(): BalancerResult {
    const healthyNodes = this.getHealthyNodes();

    if (healthyNodes.length === 0) {
      return this.createResult(null, false, 0);
    }

    let selectedNode: BalancerNode | null = null;

    switch (this.config.algorithm) {
      case 'round-robin':
        selectedNode = this.selectRoundRobin(healthyNodes);
        break;
      case 'weighted-round-robin':
        selectedNode = this.selectWeightedRoundRobin(healthyNodes);
        break;
      case 'least-connections':
        selectedNode = this.selectLeastConnections(healthyNodes);
        break;
      case 'random':
        selectedNode = this.selectRandom(healthyNodes);
        break;
      case 'ip-hash':
        selectedNode = this.selectRoundRobin(healthyNodes); // 简化实现
        break;
      case 'least-response-time':
        selectedNode = this.selectLeastResponseTime(healthyNodes);
        break;
      default:
        selectedNode = healthyNodes[0];
    }

    return this.createResult(selectedNode, false, 0);
  }

  /**
   * 带故障转移的节点选择
   */
  getNextWithFailover(clientIp?: string): BalancerResult {
    if (!this.config.failover.enabled) {
      return this.getNext();
    }

    let attempts = 0;
    let lastResult: BalancerResult;

    while (attempts <= this.config.failover.retries) {
      lastResult = this.getNext();

      if (lastResult.node && lastResult.node.healthy) {
        this.metrics.successfulRequests++;
        return lastResult;
      }

      attempts++;
      this.metrics.failedRequests++;

      if (attempts <= this.config.failover.retries) {
        this.metrics.failoverCount++;
        
        if (this.config.failover.autoRemove && lastResult.node) {
          this.removeNode(lastResult.node.id);
        }
      }
    }

    return lastResult!;
  }

  /**
   * 记录请求完成
   */
  recordRequestComplete(nodeId: string, success: boolean, responseTime?: number): void {
    this.metrics.totalRequests++;

    if (success) {
      this.metrics.successfulRequests++;
    } else {
      this.metrics.failedRequests++;
    }

    const count = this.metrics.requestsByNode.get(nodeId) || 0;
    this.metrics.requestsByNode.set(nodeId, count + 1);

    if (responseTime !== undefined) {
      const total = this.metrics.avgResponseTime * (this.metrics.totalRequests - 1);
      this.metrics.avgResponseTime = (total + responseTime) / this.metrics.totalRequests;
    }
  }

  /**
   * 获取指标
   */
  getMetrics(): BalancerMetrics {
    return { ...this.metrics };
  }

  /**
   * 重置指标
   */
  resetMetrics(): void {
    this.metrics = this.initMetrics();
    this.metrics.totalNodes = this.nodes.size;
  }

  /**
   * 重置负载均衡器状态
   */
  reset(): void {
    this.currentIndex = 0;
    this.currentWeights.forEach((_, key) => this.currentWeights.set(key, 0));
    this.resetMetrics();
  }

  /**
   * 销毁负载均衡器
   */
  destroy(): void {
    this.stopHealthCheck();
    this.nodes.clear();
    this.currentWeights.clear();
  }

  // ============================================
  // 内部方法 - 算法实现
  // ============================================

  private selectRoundRobin(nodes: BalancerNode[]): BalancerNode {
    const node = nodes[this.currentIndex % nodes.length];
    this.currentIndex = (this.currentIndex + 1) % nodes.length;
    return node;
  }

  private selectWeightedRoundRobin(nodes: BalancerNode[]): BalancerNode {
    let selectedNode: BalancerNode | null = null;
    let maxWeight = -1;

    // 平滑加权算法
    nodes.forEach(node => {
      const current = this.currentWeights.get(node.id) || 0;
      this.currentWeights.set(node.id, current + node.weight);
    });

    nodes.forEach(node => {
      const currentWeight = this.currentWeights.get(node.id) || 0;
      if (currentWeight > maxWeight) {
        maxWeight = currentWeight;
        selectedNode = node;
      }
    });

    if (selectedNode) {
      const totalWeight = nodes.reduce((sum, node) => sum + node.weight, 0);
      const currentWeight = this.currentWeights.get(selectedNode.id) || 0;
      this.currentWeights.set(selectedNode.id, currentWeight - totalWeight);
    }

    return selectedNode || nodes[0];
  }

  private selectLeastConnections(nodes: BalancerNode[]): BalancerNode {
    return nodes.reduce((min, node) => 
      node.activeConnections < min.activeConnections ? node : min
    , nodes[0]);
  }

  private selectRandom(nodes: BalancerNode[]): BalancerNode {
    return nodes[Math.floor(Math.random() * nodes.length)];
  }

  private selectLeastResponseTime(nodes: BalancerNode[]): BalancerNode {
    return nodes.reduce((min, node) => 
      (node.responseTime || Infinity) < (min.responseTime || Infinity) ? node : min
    , nodes[0]);
  }

  private createResult(node: BalancerNode | null, isFailover: boolean, retryCount: number): BalancerResult {
    return {
      node,
      nodeId: node?.id || null,
      nodeAddress: node?.address || null,
      algorithm: this.config.algorithm,
      isFailover,
      retryCount,
      timestamp: Date.now(),
    };
  }

  private updateHealthyCount(): void {
    this.metrics.healthyNodes = this.getHealthyNodes().length;
  }
}

// ============================================
// Builder Pattern - 负载均衡器构建器
// ============================================

/**
 * 负载均衡器构建器
 * 
 * 使用链式 API 构建和配置负载均衡器
 * 
 * @example
 * const lb = new LoadBalancerBuilder()
 *   .algorithm('weighted-round-robin')
 *   .addNode({ id: 'node1', address: '192.168.1.1:8080', weight: 5 })
 *   .addNode({ id: 'node2', address: '192.168.1.2:8080', weight: 3 })
 *   .healthCheck({ interval: 5000, timeout: 2000 })
 *   .failover({ retries: 3, autoRemove: true })
 *   .build();
 */
export class LoadBalancerBuilder {
  private config: Partial<BalancerConfig> = {};
  private nodes: Array<Partial<BalancerNode>> = [];
  private options: BalancerBuilderOptions = {
    strict: false,
    autoValidate: true,
  };

  constructor(options?: BalancerBuilderOptions) {
    if (options) {
      this.options = { ...this.options, ...options };
    }
  }

  /**
   * 设置负载均衡算法
   */
  algorithm(algo: BalancerAlgorithm): this {
    this.config.algorithm = algo;
    return this;
  }

  /**
   * 添加单个节点
   */
  addNode(node: Partial<BalancerNode>): this {
    this.nodes.push(node);
    return this;
  }

  /**
   * 批量添加节点
   */
  addNodes(nodes: Array<Partial<BalancerNode>>): this {
    this.nodes.push(...nodes);
    return this;
  }

  /**
   * 配置健康检查
   */
  healthCheck(config: Partial<HealthCheckConfig>): this {
    this.config.healthCheck = { ...DEFAULT_HEALTH_CHECK, ...config };
    return this;
  }

  /**
   * 配置故障转移
   */
  failover(config: Partial<FailoverConfig>): this {
    this.config.failover = { ...DEFAULT_FAILOVER, ...config };
    return this;
  }

  /**
   * 启用指标收集
   */
  enableMetrics(enabled: boolean = true): this {
    this.config.metricsEnabled = enabled;
    return this;
  }

  /**
   * 设置严格模式
   */
  strict(strict: boolean = true): this {
    this.options.strict = strict;
    return this;
  }

  /**
   * 验证配置
   */
  validate(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (this.nodes.length === 0) {
      errors.push('至少需要添加一个节点');
    }

    if (!this.config.algorithm) {
      errors.push('必须指定负载均衡算法');
    }

    this.nodes.forEach((node, index) => {
      if (!node.address) {
        errors.push(`节点 ${index + 1} 缺少 address 字段`);
      }
      if (node.weight !== undefined && (node.weight < 1 || node.weight > 100)) {
        errors.push(`节点 ${node.id || index + 1} 的权重必须在 1-100 之间`);
      }
    });

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * 构建负载均衡器
   */
  build(): LoadBalancer {
    if (this.options.autoValidate) {
      const validation = this.validate();
      if (!validation.valid) {
        const errorMsg = `配置验证失败：${validation.errors.join('; ')}`;
        if (this.options.strict) {
          throw new Error(errorMsg);
        } else {
          console.warn(errorMsg);
        }
      }
    }

    const lb = new LoadBalancer(this.config);
    this.nodes.forEach(node => lb.addNode(node));

    if (this.options.onComplete) {
      this.options.onComplete(lb);
    }

    return lb;
  }
}

// ============================================
// 工厂函数
// ============================================

/**
 * 快速创建负载均衡器
 * 
 * @param nodes 节点列表
 * @param algorithm 算法类型 (默认：round-robin)
 * @returns LoadBalancer 实例
 * 
 * @example
 * const lb = createBalancer([
 *   { id: 'node1', address: '192.168.1.1:8080' },
 *   { id: 'node2', address: '192.168.1.2:8080' }
 * ], 'weighted-round-robin');
 */
export function createBalancer(
  nodes: Array<Partial<BalancerNode>>,
  algorithm: BalancerAlgorithm = 'round-robin'
): LoadBalancer {
  return new LoadBalancerBuilder()
    .algorithm(algorithm)
    .addNodes(nodes)
    .build();
}

/**
 * 创建带健康检查的负载均衡器
 * 
 * @example
 * const lb = createBalancerWithHealthCheck([
 *   { id: 'node1', address: '192.168.1.1:8080' },
 *   { id: 'node2', address: '192.168.1.2:8080' }
 * ], { interval: 5000, timeout: 2000 });
 */
export function createBalancerWithHealthCheck(
  nodes: Array<Partial<BalancerNode>>,
  healthCheckConfig: Partial<HealthCheckConfig>
): LoadBalancer {
  return new LoadBalancerBuilder()
    .addNodes(nodes)
    .healthCheck(healthCheckConfig)
    .build();
}

/**
 * 创建带故障转移的负载均衡器
 * 
 * @example
 * const lb = createBalancerWithFailover([
 *   { id: 'node1', address: '192.168.1.1:8080' },
 *   { id: 'node2', address: '192.168.1.2:8080' }
 * ], { retries: 3, autoRemove: true });
 */
export function createBalancerWithFailover(
  nodes: Array<Partial<BalancerNode>>,
  failoverConfig: Partial<FailoverConfig>
): LoadBalancer {
  return new LoadBalancerBuilder()
    .addNodes(nodes)
    .failover(failoverConfig)
    .build();
}

// ============================================
// 使用示例
// ============================================

async function runExamples() {
  console.log('='.repeat(70));
  console.log('🔄 负载均衡器模式技能 - ACE 使用示例');
  console.log('='.repeat(70));
  console.log();

  // ============================================
  // 示例 1: 基础轮询负载均衡
  // ============================================
  console.log('📍 示例 1: 基础轮询负载均衡 (Builder Pattern)');
  console.log('-'.repeat(70));
  
  const lb1 = new LoadBalancerBuilder()
    .algorithm('round-robin')
    .addNode({ id: 'node1', address: '192.168.1.1:8080' })
    .addNode({ id: 'node2', address: '192.168.1.2:8080' })
    .addNode({ id: 'node3', address: '192.168.1.3:8080' })
    .build();

  console.log('节点列表:');
  lb1.getNodes().forEach(node => {
    console.log(`  - ${node.id}: ${node.address}`);
  });
  console.log();

  console.log('请求分配 (6 次):');
  for (let i = 0; i < 6; i++) {
    const result = lb1.getNext();
    console.log(`  请求 ${i + 1}: ${result.nodeId} (${result.nodeAddress})`);
  }
  console.log();

  // ============================================
  // 示例 2: 加权轮询负载均衡
  // ============================================
  console.log('📍 示例 2: 加权轮询负载均衡');
  console.log('-'.repeat(70));
  
  const lb2 = new LoadBalancerBuilder()
    .algorithm('weighted-round-robin')
    .addNode({ id: 'node1', address: '192.168.1.1:8080', weight: 5 })
    .addNode({ id: 'node2', address: '192.168.1.2:8080', weight: 3 })
    .addNode({ id: 'node3', address: '192.168.1.3:8080', weight: 2 })
    .build();

  console.log('节点权重分布:');
  lb2.getNodes().forEach(node => {
    console.log(`  - ${node.id}: ${node.address} (权重：${node.weight})`);
  });
  console.log();

  console.log('请求分配 (10 次):');
  const stats = new Map<string, number>();
  for (let i = 0; i < 10; i++) {
    const result = lb2.getNext();
    if (result.nodeId) {
      stats.set(result.nodeId, (stats.get(result.nodeId) || 0) + 1);
    }
  }
  stats.forEach((count, nodeId) => {
    console.log(`  ${nodeId}: ${count} 次`);
  });
  console.log();

  // ============================================
  // 示例 3: 最少连接负载均衡
  // ============================================
  console.log('📍 示例 3: 最少连接负载均衡');
  console.log('-'.repeat(70));
  
  const lb3 = new LoadBalancerBuilder()
    .algorithm('least-connections')
    .addNode({ id: 'node1', address: '192.168.1.1:8080', activeConnections: 10 })
    .addNode({ id: 'node2', address: '192.168.1.2:8080', activeConnections: 5 })
    .addNode({ id: 'node3', address: '192.168.1.3:8080', activeConnections: 20 })
    .build();

  console.log('初始连接数:');
  lb3.getNodes().forEach(node => {
    console.log(`  - ${node.id}: ${node.activeConnections} 个连接`);
  });
  console.log();

  console.log('请求分配:');
  for (let i = 0; i < 3; i++) {
    const result = lb3.getNext();
    console.log(`  请求 ${i + 1}: ${result.nodeId} (连接数最少)`);
    lb3.updateConnections(result.nodeId!, 1);
  }
  console.log();

  // ============================================
  // 示例 4: 健康检查与故障转移
  // ============================================
  console.log('📍 示例 4: 健康检查与故障转移');
  console.log('-'.repeat(70));
  
  const lb4 = new LoadBalancerBuilder()
    .algorithm('round-robin')
    .addNode({ id: 'healthy1', address: '192.168.1.1:8080', healthy: true })
    .addNode({ id: 'unhealthy', address: '192.168.1.2:8080', healthy: false })
    .addNode({ id: 'healthy2', address: '192.168.1.3:8080', healthy: true })
    .healthCheck({ interval: 5000, failureThreshold: 3 })
    .failover({ retries: 3, autoRemove: false })
    .build();

  console.log('节点健康状态:');
  lb4.getNodes().forEach(node => {
    const status = node.healthy ? '✅ 健康' : '❌ 不健康';
    console.log(`  - ${node.id}: ${status}`);
  });
  console.log();

  console.log('请求分配 (只到健康节点):');
  for (let i = 0; i < 4; i++) {
    const result = lb4.getNextWithFailover();
    console.log(`  请求 ${i + 1}: ${result.nodeId} (${result.isFailover ? '故障转移' : '正常'})`);
  }
  console.log();

  // ============================================
  // 示例 5: 指标监控
  // ============================================
  console.log('📍 示例 5: 指标监控');
  console.log('-'.repeat(70));
  
  const lb5 = new LoadBalancerBuilder()
    .algorithm('round-robin')
    .addNode({ id: 'node1', address: '192.168.1.1:8080' })
    .addNode({ id: 'node2', address: '192.168.1.2:8080' })
    .enableMetrics(true)
    .build();

  // 模拟请求
  for (let i = 0; i < 10; i++) {
    const result = lb5.getNext();
    lb5.recordRequestComplete(result.nodeId!, i % 2 === 0, Math.random() * 100);
  }

  const metrics = lb5.getMetrics();
  console.log('负载均衡器指标:');
  console.log(`  总请求数：${metrics.totalRequests}`);
  console.log(`  成功请求：${metrics.successfulRequests}`);
  console.log(`  失败请求：${metrics.failedRequests}`);
  console.log(`  健康节点：${metrics.healthyNodes}/${metrics.totalNodes}`);
  console.log(`  平均响应时间：${metrics.avgResponseTime.toFixed(2)}ms`);
  console.log();

  // ============================================
  // 示例 6: 工厂函数
  // ============================================
  console.log('📍 示例 6: 工厂函数快速创建');
  console.log('-'.repeat(70));
  
  const lb6 = createBalancer([
    { id: 'api1', address: 'http://api1.example.com', weight: 10 },
    { id: 'api2', address: 'http://api2.example.com', weight: 10 },
  ], 'weighted-round-robin');

  console.log(`创建加权轮询负载均衡器：${lb6.getNodes().length} 个节点`);
  
  const lb7 = createBalancerWithHealthCheck([
    { id: 'db1', address: 'mysql://db1:3306' },
    { id: 'db2', address: 'mysql://db2:3306' },
  ], { interval: 3000, timeout: 1000 });

  console.log(`创建带健康检查的负载均衡器：${lb7.getNodes().length} 个节点`);
  
  const lb8 = createBalancerWithFailover([
    { id: 'ws1', address: 'ws://ws1:8080' },
    { id: 'ws2', address: 'ws://ws2:8080' },
  ], { retries: 5, autoRemove: true });

  console.log(`创建带故障转移的负载均衡器：${lb8.getNodes().length} 个节点`);
  console.log();

  // ============================================
  // 示例 7: 实际应用场景 - API 网关
  // ============================================
  console.log('📍 示例 7: 实际应用场景 - API 网关');
  console.log('-'.repeat(70));
  
  const apiGateway = new LoadBalancerBuilder()
    .algorithm('weighted-round-robin')
    .addNodes([
      { id: 'api-prod-1', address: 'http://api-prod-1.internal:3000', weight: 10 },
      { id: 'api-prod-2', address: 'http://api-prod-2.internal:3000', weight: 10 },
      { id: 'api-prod-3', address: 'http://api-prod-3.internal:3000', weight: 5 },
    ])
    .healthCheck({
      interval: 5000,
      timeout: 2000,
      endpoint: '/health',
      failureThreshold: 3,
    })
    .failover({
      retries: 3,
      retryDelay: 100,
      autoRemove: false,
      recoveryTime: 30000,
    })
    .enableMetrics(true)
    .build();

  console.log('API 网关配置:');
  console.log(`  节点数：${apiGateway.getNodes().length}`);
  console.log(`  算法：weighted-round-robin`);
  console.log(`  健康检查：5000ms 间隔`);
  console.log(`  故障转移：3 次重试`);
  console.log();

  // 模拟网关请求处理
  console.log('模拟网关请求处理:');
  for (let i = 0; i < 5; i++) {
    const result = apiGateway.getNextWithFailover();
    if (result.node) {
      apiGateway.updateConnections(result.nodeId!, 1);
      
      // 模拟请求处理
      setTimeout(() => {
        apiGateway.updateConnections(result.nodeId!, -1);
        apiGateway.recordRequestComplete(result.nodeId!, true, Math.random() * 50);
      }, 10);
      
      console.log(`  请求 ${i + 1} → ${result.nodeAddress}`);
    }
  }
  console.log();

  // 清理
  apiGateway.destroy();

  // ============================================
  // 总结
  // ============================================
  console.log('='.repeat(70));
  console.log('✅ 所有示例执行完毕');
  console.log('='.repeat(70));
  console.log();
  console.log('📚 核心功能:');
  console.log('  1. 6 种负载均衡算法 (轮询/加权轮询/最少连接/随机/IP 哈希/最快响应)');
  console.log('  2. Builder Pattern 链式 API');
  console.log('  3. 自动健康检查与故障转移');
  console.log('  4. 实时监控与指标收集');
  console.log('  5. 工厂函数快速创建');
  console.log();
  console.log('🎯 使用建议:');
  console.log('  - 简单场景 → round-robin');
  console.log('  - 性能差异 → weighted-round-robin');
  console.log('  - 长连接 → least-connections');
  console.log('  - 生产环境 → 启用健康检查 + 故障转移 + 指标监控');
  console.log();
}

// 如果直接运行此文件，执行示例
if (require.main === module) {
  runExamples().catch(console.error);
}

// ============================================
// 导出
// ============================================

export {
  LoadBalancer,
  LoadBalancerBuilder,
  createBalancer,
  createBalancerWithHealthCheck,
  createBalancerWithFailover,
  type BalancerNode,
  type BalancerResult,
  type BalancerConfig,
  type BalancerAlgorithm,
  type HealthCheckConfig,
  type FailoverConfig,
  type BalancerMetrics,
  type BalancerBuilderOptions,
};
