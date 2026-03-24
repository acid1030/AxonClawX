/**
 * 集群管理工具技能 - ACE
 * 
 * 功能:
 * 1. 集群节点管理 - 节点注册、状态监控、健康检查
 * 2. 负载均衡 - 轮询、加权、最少连接数策略
 * 3. 故障转移 - 自动检测、故障节点隔离、请求重定向
 * 
 * @module skills/cluster-utils
 */

// ==================== 类型定义 ====================

/**
 * 节点状态枚举
 */
enum NodeStatus {
  HEALTHY = 'healthy',
  UNHEALTHY = 'unhealthy',
  DEGRADED = 'degraded',
  OFFLINE = 'offline',
}

/**
 * 负载均衡策略
 */
enum LoadBalanceStrategy {
  ROUND_ROBIN = 'round-robin',
  WEIGHTED = 'weighted',
  LEAST_CONNECTIONS = 'least-connections',
  IP_HASH = 'ip-hash',
}

/**
 * 集群节点信息
 */
interface ClusterNode {
  id: string;
  name: string;
  host: string;
  port: number;
  weight?: number; // 用于加权负载均衡
  status: NodeStatus;
  activeConnections: number;
  totalRequests: number;
  failedRequests: number;
  lastHealthCheck?: number;
  metadata?: Record<string, any>;
}

/**
 * 健康检查配置
 */
interface HealthCheckConfig {
  enabled: boolean;
  interval: number; // 检查间隔 (毫秒)
  timeout: number; // 超时时间 (毫秒)
  unhealthyThreshold: number; // 连续失败多少次标记为不健康
  healthyThreshold: number; // 连续成功多少次恢复健康
}

/**
 * 集群配置
 */
interface ClusterConfig {
  name: string;
  strategy: LoadBalanceStrategy;
  healthCheck: HealthCheckConfig;
  stickySessions?: boolean; // 是否启用会话粘滞
  maxRetries?: number; // 最大重试次数
}

/**
 * 集群统计信息
 */
interface ClusterStats {
  totalNodes: number;
  healthyNodes: number;
  unhealthyNodes: number;
  totalRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  requestsPerNode: Record<string, number>;
}

/**
 * 请求上下文
 */
interface RequestContext {
  clientId?: string;
  ip?: string;
  path?: string;
  method?: string;
  timestamp: number;
}

// ==================== 集群管理类 ====================

/**
 * 集群管理器
 * 
 * 特性:
 * - 多节点管理
 * - 多种负载均衡策略
 * - 自动健康检查
 * - 故障转移
 */
class ClusterManager {
  private config: Required<ClusterConfig>;
  private nodes: Map<string, ClusterNode>;
  private roundRobinIndex: number = 0;
  private stickySessions: Map<string, string>; // clientId -> nodeId
  private healthCheckTimers: Map<string, NodeJS.Timeout>;
  private stats: ClusterStats;

  constructor(config: ClusterConfig) {
    this.config = {
      name: config.name,
      strategy: config.strategy,
      healthCheck: {
        enabled: config.healthCheck?.enabled ?? true,
        interval: config.healthCheck?.interval ?? 10000,
        timeout: config.healthCheck?.timeout ?? 5000,
        unhealthyThreshold: config.healthCheck?.unhealthyThreshold ?? 3,
        healthyThreshold: config.healthCheck?.healthyThreshold ?? 2,
      },
      stickySessions: config.stickySessions ?? false,
      maxRetries: config.maxRetries ?? 3,
    };

    this.nodes = new Map();
    this.stickySessions = new Map();
    this.healthCheckTimers = new Map();
    this.stats = {
      totalNodes: 0,
      healthyNodes: 0,
      unhealthyNodes: 0,
      totalRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      requestsPerNode: {},
    };
  }

  // ==================== 节点管理 ====================

  /**
   * 添加节点
   */
  addNode(node: Omit<ClusterNode, 'status' | 'activeConnections' | 'totalRequests' | 'failedRequests'>): ClusterNode {
    const newNode: ClusterNode = {
      ...node,
      status: NodeStatus.HEALTHY,
      activeConnections: 0,
      totalRequests: 0,
      failedRequests: 0,
      weight: node.weight ?? 1,
    };

    this.nodes.set(node.id, newNode);
    this.stats.totalNodes++;
    this.stats.healthyNodes++;

    // 启动健康检查
    if (this.config.healthCheck.enabled) {
      this.startHealthCheck(node.id);
    }

    return newNode;
  }

  /**
   * 移除节点
   */
  removeNode(nodeId: string): boolean {
    const node = this.nodes.get(nodeId);
    if (!node) return false;

    // 停止健康检查
    this.stopHealthCheck(nodeId);

    // 清除相关会话粘滞
    for (const [clientId, id] of Array.from(this.stickySessions.entries())) {
      if (id === nodeId) {
        this.stickySessions.delete(clientId);
      }
    }

    this.nodes.delete(nodeId);
    this.stats.totalNodes--;
    if (node.status === NodeStatus.HEALTHY) {
      this.stats.healthyNodes--;
    } else {
      this.stats.unhealthyNodes--;
    }

    return true;
  }

  /**
   * 更新节点状态
   */
  updateNodeStatus(nodeId: string, status: NodeStatus): boolean {
    const node = this.nodes.get(nodeId);
    if (!node) return false;

    const oldStatus = node.status;
    node.status = status;
    node.lastHealthCheck = Date.now();

    // 更新统计
    if (oldStatus === NodeStatus.HEALTHY && status !== NodeStatus.HEALTHY) {
      this.stats.healthyNodes--;
      this.stats.unhealthyNodes++;
    } else if (oldStatus !== NodeStatus.HEALTHY && status === NodeStatus.HEALTHY) {
      this.stats.healthyNodes++;
      this.stats.unhealthyNodes--;
    }

    return true;
  }

  /**
   * 获取节点
   */
  getNode(nodeId: string): ClusterNode | undefined {
    return this.nodes.get(nodeId);
  }

  /**
   * 获取所有节点
   */
  getAllNodes(): ClusterNode[] {
    return Array.from(this.nodes.values());
  }

  /**
   * 获取健康节点
   */
  getHealthyNodes(): ClusterNode[] {
    return Array.from(this.nodes.values()).filter(
      (node) => node.status === NodeStatus.HEALTHY || node.status === NodeStatus.DEGRADED
    );
  }

  // ==================== 负载均衡 ====================

  /**
   * 选择下一个节点
   */
  selectNode(context: RequestContext = { timestamp: Date.now() }): ClusterNode | null {
    const healthyNodes = this.getHealthyNodes();
    if (healthyNodes.length === 0) {
      return null;
    }

    let selectedNode: ClusterNode | null = null;

    switch (this.config.strategy) {
      case LoadBalanceStrategy.ROUND_ROBIN:
        selectedNode = this.selectRoundRobin(healthyNodes);
        break;
      case LoadBalanceStrategy.WEIGHTED:
        selectedNode = this.selectWeighted(healthyNodes);
        break;
      case LoadBalanceStrategy.LEAST_CONNECTIONS:
        selectedNode = this.selectLeastConnections(healthyNodes);
        break;
      case LoadBalanceStrategy.IP_HASH:
        selectedNode = this.selectIPHash(healthyNodes, context.ip);
        break;
    }

    if (selectedNode) {
      // 更新会话粘滞
      if (this.config.stickySessions && context.clientId) {
        this.stickySessions.set(context.clientId, selectedNode.id);
      }

      // 更新统计
      selectedNode.activeConnections++;
      selectedNode.totalRequests++;
      this.stats.totalRequests++;
      this.stats.requestsPerNode[selectedNode.id] = (this.stats.requestsPerNode[selectedNode.id] || 0) + 1;
    }

    return selectedNode;
  }

  /**
   * 轮询策略
   */
  private selectRoundRobin(nodes: ClusterNode[]): ClusterNode {
    this.roundRobinIndex = (this.roundRobinIndex + 1) % nodes.length;
    return nodes[this.roundRobinIndex];
  }

  /**
   * 加权策略
   */
  private selectWeighted(nodes: ClusterNode[]): ClusterNode {
    const totalWeight = nodes.reduce((sum, node) => sum + (node.weight || 1), 0);
    let random = Math.random() * totalWeight;

    for (const node of nodes) {
      const weight = node.weight || 1;
      if (random < weight) {
        return node;
      }
      random -= weight;
    }

    return nodes[0];
  }

  /**
   * 最少连接数策略
   */
  private selectLeastConnections(nodes: ClusterNode[]): ClusterNode {
    return nodes.reduce((min, node) =>
      node.activeConnections < min.activeConnections ? node : min
    );
  }

  /**
   * IP 哈希策略
   */
  private selectIPHash(nodes: ClusterNode[], ip?: string): ClusterNode {
    if (!ip) {
      return this.selectRoundRobin(nodes);
    }

    const hash = this.hashIP(ip);
    const index = hash % nodes.length;
    return nodes[index];
  }

  /**
   * IP 地址哈希
   */
  private hashIP(ip: string): number {
    return ip.split('.').reduce((hash, octet) => {
      return ((hash << 5) + hash) + parseInt(octet, 10);
    }, 0);
  }

  /**
   * 获取会话粘滞节点
   */
  getStickyNode(clientId: string): ClusterNode | null {
    if (!this.config.stickySessions || !clientId) {
      return null;
    }

    const nodeId = this.stickySessions.get(clientId);
    if (!nodeId) {
      return null;
    }

    const node = this.nodes.get(nodeId);
    if (!node || node.status !== NodeStatus.HEALTHY) {
      // 节点不健康，清除粘滞
      this.stickySessions.delete(clientId);
      return null;
    }

    return node;
  }

  // ==================== 健康检查 ====================

  /**
   * 启动健康检查
   */
  private startHealthCheck(nodeId: string): void {
    const node = this.nodes.get(nodeId);
    if (!node) return;

    const interval = this.config.healthCheck.interval;
    
    const timer = setInterval(async () => {
      const healthy = await this.performHealthCheck(node);
      
      if (!healthy) {
        node.failedRequests++;
        const consecutiveFailures = this.getConsecutiveFailures(node);
        
        if (consecutiveFailures >= this.config.healthCheck.unhealthyThreshold) {
          this.updateNodeStatus(nodeId, NodeStatus.UNHEALTHY);
          console.warn(`[Cluster] Node ${node.name} marked as unhealthy`);
        }
      } else {
        const consecutiveSuccesses = this.getConsecutiveSuccesses(node);
        
        if (node.status === NodeStatus.UNHEALTHY && 
            consecutiveSuccesses >= this.config.healthCheck.healthyThreshold) {
          this.updateNodeStatus(nodeId, NodeStatus.HEALTHY);
          console.log(`[Cluster] Node ${node.name} recovered`);
        }
      }
      
      node.lastHealthCheck = Date.now();
    }, interval);

    this.healthCheckTimers.set(nodeId, timer);
  }

  /**
   * 停止健康检查
   */
  private stopHealthCheck(nodeId: string): void {
    const timer = this.healthCheckTimers.get(nodeId);
    if (timer) {
      clearInterval(timer);
      this.healthCheckTimers.delete(nodeId);
    }
  }

  /**
   * 执行健康检查 (需要子类实现具体检查逻辑)
   */
  protected async performHealthCheck(node: ClusterNode): Promise<boolean> {
    // 默认实现：模拟健康检查
    // 实际使用时应覆盖此方法，实现真实的 HTTP/TCP 检查
    return Promise.resolve(node.status !== NodeStatus.OFFLINE);
  }

  /**
   * 获取连续失败次数 (简化实现)
   */
  private getConsecutiveFailures(node: ClusterNode): number {
    return node.failedRequests;
  }

  /**
   * 获取连续成功次数 (简化实现)
   */
  private getConsecutiveSuccesses(node: ClusterNode): number {
    return node.totalRequests - node.failedRequests;
  }

  // ==================== 故障转移 ====================

  /**
   * 请求失败处理 (故障转移)
   */
  async handleRequestFailure(
    nodeId: string,
    context: RequestContext,
    retryCount: number = 0
  ): Promise<ClusterNode | null> {
    const node = this.nodes.get(nodeId);
    if (!node) return null;

    node.failedRequests++;
    node.activeConnections = Math.max(0, node.activeConnections - 1);

    // 检查是否需要故障转移
    if (retryCount < (this.config.maxRetries || 3)) {
      // 临时标记节点为降级
      if (node.status === NodeStatus.HEALTHY) {
        this.updateNodeStatus(nodeId, NodeStatus.DEGRADED);
      }

      // 选择新节点重试
      const newNode = this.selectNode(context);
      if (newNode && newNode.id !== nodeId) {
        console.log(`[Cluster] Failover from ${node.name} to ${newNode.name}`);
        return newNode;
      }
    } else {
      // 超过最大重试次数，标记为不健康
      this.updateNodeStatus(nodeId, NodeStatus.UNHEALTHY);
      this.stats.failedRequests++;
    }

    return null;
  }

  /**
   * 请求成功处理
   */
  handleRequestSuccess(nodeId: string, responseTime?: number): void {
    const node = this.nodes.get(nodeId);
    if (!node) return;

    node.activeConnections = Math.max(0, node.activeConnections - 1);

    // 如果是降级状态，恢复为健康
    if (node.status === NodeStatus.DEGRADED) {
      this.updateNodeStatus(nodeId, NodeStatus.HEALTHY);
    }

    // 更新平均响应时间
    if (responseTime !== undefined) {
      const totalRequests = this.stats.totalRequests;
      const currentAvg = this.stats.averageResponseTime;
      this.stats.averageResponseTime = 
        ((currentAvg * (totalRequests - 1)) + responseTime) / totalRequests;
    }
  }

  // ==================== 统计信息 ====================

  /**
   * 获取集群统计
   */
  getStats(): ClusterStats {
    return { ...this.stats };
  }

  /**
   * 获取节点统计
   */
  getNodeStats(nodeId: string): Partial<ClusterNode> | null {
    const node = this.nodes.get(nodeId);
    if (!node) return null;

    return {
      id: node.id,
      name: node.name,
      status: node.status,
      activeConnections: node.activeConnections,
      totalRequests: node.totalRequests,
      failedRequests: node.failedRequests,
      lastHealthCheck: node.lastHealthCheck,
    };
  }

  /**
   * 重置统计
   */
  resetStats(): void {
    this.stats = {
      totalNodes: this.nodes.size,
      healthyNodes: this.getHealthyNodes().length,
      unhealthyNodes: this.stats.unhealthyNodes,
      totalRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      requestsPerNode: {},
    };

    for (const node of Array.from(this.nodes.values())) {
      node.totalRequests = 0;
      node.failedRequests = 0;
    }
  }

  // ==================== 清理 ====================

  /**
   * 销毁集群管理器
   */
  destroy(): void {
    // 停止所有健康检查
    for (const [nodeId] of Array.from(this.healthCheckTimers.keys())) {
      this.stopHealthCheck(nodeId);
    }

    this.nodes.clear();
    this.stickySessions.clear();
    this.healthCheckTimers.clear();
  }
}

// ==================== 导出 ====================

export {
  NodeStatus,
  LoadBalanceStrategy,
  ClusterManager,
};

export type {
  ClusterNode,
  ClusterConfig,
  HealthCheckConfig,
  ClusterStats,
  RequestContext,
};

// ==================== 使用示例 ====================

/**
 * 使用示例 1: 基础集群管理
 */
/*
import { ClusterManager, NodeStatus, LoadBalanceStrategy } from './cluster-utils-skill';

// 创建集群管理器
const cluster = new ClusterManager({
  name: 'api-cluster',
  strategy: LoadBalanceStrategy.ROUND_ROBIN,
  healthCheck: {
    enabled: true,
    interval: 10000,
    timeout: 5000,
    unhealthyThreshold: 3,
    healthyThreshold: 2,
  },
  stickySessions: true,
});

// 添加节点
cluster.addNode({
  id: 'node-1',
  name: 'API Server 1',
  host: '192.168.1.10',
  port: 8080,
  weight: 2,
});

cluster.addNode({
  id: 'node-2',
  name: 'API Server 2',
  host: '192.168.1.11',
  port: 8080,
  weight: 1,
});

// 选择节点处理请求
const node = cluster.selectNode({
  clientId: 'user-123',
  ip: '192.168.1.100',
  path: '/api/data',
  method: 'GET',
  timestamp: Date.now(),
});

if (node) {
  console.log(`Selected node: ${node.name} (${node.host}:${node.port})`);
}
*/

/**
 * 使用示例 2: 自定义健康检查
 */
/*
import * as http from 'http';

class HTTPClusterManager extends ClusterManager {
  protected async performHealthCheck(node: ClusterNode): Promise<boolean> {
    return new Promise((resolve) => {
      const req = http.get(
        `http://${node.host}:${node.port}/health`,
        { timeout: this.config.healthCheck.timeout },
        (res) => {
          resolve(res.statusCode === 200);
        }
      );

      req.on('error', () => resolve(false));
      req.on('timeout', () => {
        req.destroy();
        resolve(false);
      });
    });
  }
}

const httpCluster = new HTTPClusterManager({
  name: 'http-cluster',
  strategy: LoadBalanceStrategy.LEAST_CONNECTIONS,
  healthCheck: {
    enabled: true,
    interval: 5000,
    timeout: 3000,
    unhealthyThreshold: 2,
    healthyThreshold: 2,
  },
});
*/

/**
 * 使用示例 3: 故障转移处理
 */
/*
async function handleRequest(cluster: ClusterManager, request: any) {
  const context = {
    clientId: request.userId,
    ip: request.clientIP,
    path: request.path,
    method: request.method,
    timestamp: Date.now(),
  };

  let node = cluster.selectNode(context);
  let retryCount = 0;

  while (node) {
    try {
      const startTime = Date.now();
      
      // 发送请求到节点
      const response = await sendRequestToNode(node, request);
      
      const responseTime = Date.now() - startTime;
      cluster.handleRequestSuccess(node.id, responseTime);
      
      return response;
    } catch (error) {
      node = await cluster.handleRequestFailure(node.id, context, retryCount);
      retryCount++;
      
      if (!node) {
        throw new Error('All nodes unavailable');
      }
    }
  }

  throw new Error('No healthy nodes available');
}
*/

/**
 * 使用示例 4: 监控集群状态
 */
/*
function monitorCluster(cluster: ClusterManager) {
  setInterval(() => {
    const stats = cluster.getStats();
    
    console.log('=== Cluster Stats ===');
    console.log(`Total Nodes: ${stats.totalNodes}`);
    console.log(`Healthy: ${stats.healthyNodes}`);
    console.log(`Unhealthy: ${stats.unhealthyNodes}`);
    console.log(`Total Requests: ${stats.totalRequests}`);
    console.log(`Failed Requests: ${stats.failedRequests}`);
    console.log(`Avg Response Time: ${stats.averageResponseTime.toFixed(2)}ms`);
    console.log('');
    
    // 节点详情
    cluster.getAllNodes().forEach(node => {
      console.log(`${node.name}: ${node.status} (${node.activeConnections} active)`);
    });
    console.log('====================\n');
  }, 30000);
}
*/
