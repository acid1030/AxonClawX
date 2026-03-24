/**
 * 服务发现模式工具技能 - ACE
 * 
 * 提供服务注册与发现的核心实现：
 * 1. 服务注册 (Service Registration) - 将服务信息注册到注册中心
 * 2. 服务发现 (Service Discovery) - 从注册中心查找可用服务
 * 3. 健康检查 (Health Check) - 定期检查服务健康状态
 * 
 * @author ACE
 * @version 1.0.0
 * @since 2026-03-13
 */

// ============================================
// 类型定义
// ============================================

/**
 * 服务元数据
 */
export interface ServiceMetadata {
  /** 服务唯一标识 */
  id: string;
  /** 服务名称 */
  name: string;
  /** 服务版本 */
  version?: string;
  /** 服务标签 (用于分类/筛选) */
  tags?: string[];
  /** 自定义元数据 */
  metadata?: Record<string, any>;
}

/**
 * 服务实例信息
 */
export interface ServiceInstance extends ServiceMetadata {
  /** 主机地址 */
  host: string;
  /** 端口号 */
  port: number;
  /** 协议 (http/https/grpc/tcp) */
  protocol?: 'http' | 'https' | 'grpc' | 'tcp';
  /** 健康状态 */
  healthy: boolean;
  /** 最后心跳时间 */
  lastHeartbeat: number;
  /** 注册时间 */
  registeredAt: number;
  /** 权重 (用于负载均衡) */
  weight?: number;
}

/**
 * 服务注册配置
 */
export interface ServiceRegistrationConfig {
  /** 服务名称 */
  name: string;
  /** 主机地址 */
  host: string;
  /** 端口号 */
  port: number;
  /** 服务版本 (可选) */
  version?: string;
  /** 服务标签 (可选) */
  tags?: string[];
  /** 自定义元数据 (可选) */
  metadata?: Record<string, any>;
  /** 协议类型 (可选) */
  protocol?: 'http' | 'https' | 'grpc' | 'tcp';
  /** 权重 (可选，默认 1) */
  weight?: number;
  /** 健康检查间隔 (毫秒，可选) */
  healthCheckInterval?: number;
}

/**
 * 服务发现查询条件
 */
export interface ServiceDiscoveryQuery {
  /** 服务名称 (必填) */
  name: string;
  /** 标签筛选 (可选) */
  tags?: string[];
  /** 只返回健康实例 (可选，默认 true) */
  healthyOnly?: boolean;
  /** 负载均衡策略 (可选) */
  loadBalanceStrategy?: 'random' | 'round-robin' | 'weighted' | 'least-connections';
}

/**
 * 服务发现结果
 */
export interface ServiceDiscoveryResult {
  /** 查询的服务名称 */
  serviceName: string;
  /** 可用实例列表 */
  instances: ServiceInstance[];
  /** 选中的实例 (如果使用了负载均衡) */
  selectedInstance?: ServiceInstance;
  /** 查询时间戳 */
  timestamp: number;
}

/**
 * 健康检查结果
 */
export interface HealthCheckResult {
  /** 服务实例 ID */
  instanceId: string;
  /** 是否健康 */
  healthy: boolean;
  /** 响应时间 (毫秒) */
  responseTime?: number;
  /** 错误信息 (如果不健康) */
  error?: string;
  /** 检查时间戳 */
  timestamp: number;
}

/**
 * 服务注册中心接口
 */
export interface IServiceRegistry {
  /**
   * 注册服务
   */
  register(config: ServiceRegistrationConfig): Promise<ServiceInstance>;
  
  /**
   * 注销服务
   */
  deregister(serviceId: string): Promise<void>;
  
  /**
   * 更新服务心跳
   */
  heartbeat(serviceId: string): Promise<void>;
  
  /**
   * 发现服务
   */
  discover(query: ServiceDiscoveryQuery): Promise<ServiceDiscoveryResult>;
  
  /**
   * 获取所有服务
   */
  getAllServices(): Promise<ServiceInstance[]>;
  
  /**
   * 健康检查
   */
  healthCheck(serviceId: string): Promise<HealthCheckResult>;
  
  /**
   * 启动健康检查监控
   */
  startHealthMonitoring(): void;
  
  /**
   * 停止健康检查监控
   */
  stopHealthMonitoring(): void;
}

// ============================================
// 服务注册中心实现
// ============================================

/**
 * 内存服务注册中心
 * 适用于单机/开发环境，生产环境应使用分布式注册中心 (如 Consul/Etcd/Zookeeper)
 */
export class InMemoryServiceRegistry implements IServiceRegistry {
  /** 服务存储 Map<serviceId, ServiceInstance> */
  private services: Map<string, ServiceInstance> = new Map();
  
  /** 健康检查定时器 */
  private healthCheckTimer?: NodeJS.Timeout;
  
  /** 默认健康检查间隔 (30 秒) */
  private defaultHealthCheckInterval = 30000;
  
  /** 轮询索引 (用于 round-robin) */
  private roundRobinIndex = 0;
  
  /**
   * 生成服务 ID
   */
  private generateServiceId(name: string, host: string, port: number): string {
    return `${name}-${host}-${port}-${Date.now()}`;
  }
  
  /**
   * 注册服务
   */
  async register(config: ServiceRegistrationConfig): Promise<ServiceInstance> {
    const now = Date.now();
    const serviceId = this.generateServiceId(config.name, config.host, config.port);
    
    const instance: ServiceInstance = {
      id: serviceId,
      name: config.name,
      version: config.version || '1.0.0',
      tags: config.tags || [],
      metadata: config.metadata || {},
      host: config.host,
      port: config.port,
      protocol: config.protocol || 'http',
      healthy: true,
      lastHeartbeat: now,
      registeredAt: now,
      weight: config.weight || 1
    };
    
    this.services.set(serviceId, instance);
    
    console.log(`[ServiceRegistry] 服务注册成功: ${serviceId}`);
    return instance;
  }
  
  /**
   * 注销服务
   */
  async deregister(serviceId: string): Promise<void> {
    const deleted = this.services.delete(serviceId);
    if (deleted) {
      console.log(`[ServiceRegistry] 服务注销成功：${serviceId}`);
    } else {
      console.warn(`[ServiceRegistry] 服务不存在，无法注销：${serviceId}`);
    }
  }
  
  /**
   * 更新服务心跳
   */
  async heartbeat(serviceId: string): Promise<void> {
    const service = this.services.get(serviceId);
    if (service) {
      service.lastHeartbeat = Date.now();
      service.healthy = true;
      console.log(`[ServiceRegistry] 心跳更新：${serviceId}`);
    } else {
      console.warn(`[ServiceRegistry] 服务不存在，无法更新心跳：${serviceId}`);
    }
  }
  
  /**
   * 发现服务
   */
  async discover(query: ServiceDiscoveryQuery): Promise<ServiceDiscoveryResult> {
    const now = Date.now();
    
    // 筛选服务
    let instances = Array.from(this.services.values()).filter(
      (instance) => instance.name === query.name
    );
    
    // 标签筛选
    if (query.tags && query.tags.length > 0) {
      instances = instances.filter((instance) =>
        query.tags!.every((tag) => instance.tags?.includes(tag))
      );
    }
    
    // 健康筛选
    if (query.healthyOnly !== false) {
      instances = instances.filter((instance) => instance.healthy);
    }
    
    // 负载均衡选择
    let selectedInstance: ServiceInstance | undefined;
    if (instances.length > 0) {
      const strategy = query.loadBalanceStrategy || 'random';
      selectedInstance = this.selectInstance(instances, strategy);
    }
    
    const result: ServiceDiscoveryResult = {
      serviceName: query.name,
      instances,
      selectedInstance,
      timestamp: now
    };
    
    console.log(`[ServiceRegistry] 服务发现：${query.name}, 找到 ${instances.length} 个实例`);
    return result;
  }
  
  /**
   * 负载均衡策略实现
   */
  private selectInstance(
    instances: ServiceInstance[],
    strategy: string
  ): ServiceInstance {
    switch (strategy) {
      case 'random':
        return instances[Math.floor(Math.random() * instances.length)];
      
      case 'round-robin':
        this.roundRobinIndex = (this.roundRobinIndex + 1) % instances.length;
        return instances[this.roundRobinIndex];
      
      case 'weighted':
        // 权重随机算法
        const totalWeight = instances.reduce((sum, inst) => sum + (inst.weight || 1), 0);
        let random = Math.random() * totalWeight;
        for (const instance of instances) {
          random -= instance.weight || 1;
          if (random <= 0) return instance;
        }
        return instances[instances.length - 1];
      
      case 'least-connections':
        // 简化实现：随机选择 (实际需要跟踪连接数)
        return instances[Math.floor(Math.random() * instances.length)];
      
      default:
        return instances[0];
    }
  }
  
  /**
   * 获取所有服务
   */
  async getAllServices(): Promise<ServiceInstance[]> {
    return Array.from(this.services.values());
  }
  
  /**
   * 健康检查
   */
  async healthCheck(serviceId: string): Promise<HealthCheckResult> {
    const service = this.services.get(serviceId);
    const now = Date.now();
    
    if (!service) {
      return {
        instanceId: serviceId,
        healthy: false,
        error: 'Service not found',
        timestamp: now
      };
    }
    
    // 模拟健康检查 (实际应调用服务健康端点)
    const startTime = Date.now();
    let healthy = true;
    let error: string | undefined;
    
    try {
      // 检查心跳是否超时 (超过 90 秒未心跳视为不健康)
      const heartbeatAge = now - service.lastHeartbeat;
      if (heartbeatAge > 90000) {
        healthy = false;
        error = 'Heartbeat timeout';
      }
      
      // 模拟 HTTP 健康检查端点调用
      // 实际实现应使用 fetch/axios 调用 /health 端点
      await this.simulateHealthEndpoint(service);
    } catch (e: any) {
      healthy = false;
      error = e.message || 'Health check failed';
    }
    
    const responseTime = Date.now() - startTime;
    
    // 更新服务健康状态
    service.healthy = healthy;
    
    const result: HealthCheckResult = {
      instanceId: serviceId,
      healthy,
      responseTime,
      error,
      timestamp: now
    };
    
    if (!healthy) {
      console.warn(`[ServiceRegistry] 健康检查失败：${serviceId}, 原因：${error}`);
    }
    
    return result;
  }
  
  /**
   * 模拟健康检查端点调用
   */
  private async simulateHealthEndpoint(service: ServiceInstance): Promise<void> {
    // 实际实现应替换为真实的 HTTP 请求
    // 例如：await fetch(`http://${service.host}:${service.port}/health`)
    return new Promise((resolve) => {
      // 模拟网络延迟 (10-100ms)
      const delay = 10 + Math.random() * 90;
      setTimeout(resolve, delay);
    });
  }
  
  /**
   * 启动健康检查监控
   */
  startHealthMonitoring(): void {
    if (this.healthCheckTimer) {
      console.warn('[ServiceRegistry] 健康检查监控已在运行');
      return;
    }
    
    console.log('[ServiceRegistry] 启动健康检查监控...');
    
    this.healthCheckTimer = setInterval(async () => {
      const services = Array.from(this.services.values());
      
      for (const service of services) {
        try {
          await this.healthCheck(service.id);
        } catch (e: any) {
          console.error(`[ServiceRegistry] 健康检查异常：${service.id}, ${e.message}`);
        }
      }
    }, this.defaultHealthCheckInterval);
  }
  
  /**
   * 停止健康检查监控
   */
  stopHealthMonitoring(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = undefined;
      console.log('[ServiceRegistry] 健康检查监控已停止');
    }
  }
  
  /**
   * 获取注册中心状态
   */
  getStatus(): {
    totalServices: number;
    healthyServices: number;
    unhealthyServices: number;
  } {
    const services = Array.from(this.services.values());
    return {
      totalServices: services.length,
      healthyServices: services.filter((s) => s.healthy).length,
      unhealthyServices: services.filter((s) => !s.healthy).length
    };
  }
}

// ============================================
// 便捷工具函数
// ============================================

/**
 * 创建服务注册中心实例
 */
export function createServiceRegistry(): InMemoryServiceRegistry {
  return new InMemoryServiceRegistry();
}

/**
 * 构建服务 URL
 */
export function buildServiceUrl(instance: ServiceInstance): string {
  const { protocol, host, port } = instance;
  const defaultPort = protocol === 'https' || protocol === 'grpc' ? 443 : 80;
  
  if (port === defaultPort) {
    return `${protocol}://${host}`;
  }
  
  return `${protocol}://${host}:${port}`;
}

/**
 * 批量注册服务
 */
export async function batchRegisterServices(
  registry: IServiceRegistry,
  configs: ServiceRegistrationConfig[]
): Promise<ServiceInstance[]> {
  const instances: ServiceInstance[] = [];
  
  for (const config of configs) {
    try {
      const instance = await registry.register(config);
      instances.push(instance);
    } catch (e: any) {
      console.error(`[ServiceRegistry] 批量注册失败：${config.name}, ${e.message}`);
    }
  }
  
  return instances;
}

/**
 * 服务发现并调用 (简化版)
 */
export async function discoverAndCall(
  registry: IServiceRegistry,
  serviceName: string,
  endpoint: string,
  options?: {
    method?: string;
    body?: any;
    headers?: Record<string, string>;
  }
): Promise<any> {
  const result = await registry.discover({
    name: serviceName,
    healthyOnly: true,
    loadBalanceStrategy: 'round-robin'
  });
  
  if (!result.selectedInstance) {
    throw new Error(`No available instances for service: ${serviceName}`);
  }
  
  const url = `${buildServiceUrl(result.selectedInstance)}${endpoint}`;
  
  // 实际实现应使用 fetch/axios
  console.log(`[ServiceRegistry] 调用服务：${url}`);
  return { url, instance: result.selectedInstance };
}

// ============================================
// 使用示例 (命令行执行)
// ============================================

if (require.main === module) {
  (async () => {
    console.log('=== 服务发现模式工具 - 使用示例 ===\n');
    
    // ============================================
    // 示例 1: 服务注册
    // ============================================
    console.log('1️⃣ 服务注册 (Service Registration)');
    console.log('─'.repeat(50));
    
    const registry = createServiceRegistry();
    
    // 注册用户服务
    const userService = await registry.register({
    name: 'user-service',
    host: '192.168.1.100',
    port: 8080,
    version: '2.1.0',
    tags: ['api', 'user', 'auth'],
    metadata: { team: 'platform', owner: 'alice' },
    protocol: 'http',
    weight: 10
  });
  
  // 注册订单服务
  const orderService = await registry.register({
    name: 'order-service',
    host: '192.168.1.101',
    port: 8081,
    version: '1.5.2',
    tags: ['api', 'order'],
    protocol: 'https',
    weight: 5
  });
  
  // 注册支付服务 (多个实例)
  const paymentService1 = await registry.register({
    name: 'payment-service',
    host: '192.168.1.102',
    port: 8082,
    version: '3.0.0',
    tags: ['api', 'payment', 'critical'],
    protocol: 'http',
    weight: 8
  });
  
  const paymentService2 = await registry.register({
    name: 'payment-service',
    host: '192.168.1.103',
    port: 8082,
    version: '3.0.0',
    tags: ['api', 'payment', 'critical'],
    protocol: 'http',
    weight: 8
  });
  
  console.log('注册服务列表:');
  console.log(`  • ${userService.id} (${userService.name} v${userService.version})`);
  console.log(`  • ${orderService.id} (${orderService.name} v${orderService.version})`);
  console.log(`  • ${paymentService1.id} (${paymentService1.name} v${paymentService1.version})`);
  console.log(`  • ${paymentService2.id} (${paymentService2.name} v${paymentService2.version})`);
  console.log();
  
  // ============================================
  // 示例 2: 服务发现
  // ============================================
  console.log('2️⃣ 服务发现 (Service Discovery)');
  console.log('─'.repeat(50));
  
  // 发现支付服务 (随机负载均衡)
  const paymentDiscovery = await registry.discover({
    name: 'payment-service',
    healthyOnly: true,
    loadBalanceStrategy: 'random'
  });
  
  console.log(`发现服务：${paymentDiscovery.serviceName}`);
  console.log(`  可用实例数：${paymentDiscovery.instances.length}`);
  console.log(`  选中实例：${paymentDiscovery.selectedInstance?.id}`);
  console.log(`  实例地址：${buildServiceUrl(paymentDiscovery.selectedInstance!)}`);
  console.log();
  
  // 发现用户服务 (轮询负载均衡)
  const userDiscovery1 = await registry.discover({
    name: 'user-service',
    loadBalanceStrategy: 'round-robin'
  });
  
  const userDiscovery2 = await registry.discover({
    name: 'user-service',
    loadBalanceStrategy: 'round-robin'
  });
  
  console.log('轮询负载均衡演示:');
  console.log(`  第 1 次请求 → ${userDiscovery1.selectedInstance?.host}`);
  console.log(`  第 2 次请求 → ${userDiscovery2.selectedInstance?.host}`);
  console.log();
  
  // 标签筛选
  const apiServices = await registry.discover({
    name: 'payment-service',
    tags: ['critical'],
    healthyOnly: true
  });
  
  console.log(`标签筛选 [critical]: ${apiServices.instances.length} 个实例`);
  console.log();
  
  // ============================================
  // 示例 3: 健康检查
  // ============================================
  console.log('3️⃣ 健康检查 (Health Check)');
  console.log('─'.repeat(50));
  
  // 手动健康检查
  const healthResult = await registry.healthCheck(userService.id);
  console.log(`健康检查结果:`);
  console.log(`  服务 ID: ${healthResult.instanceId}`);
  console.log(`  状态：${healthResult.healthy ? '✅ 健康' : '❌ 不健康'}`);
  console.log(`  响应时间：${healthResult.responseTime}ms`);
  console.log();
  
  // 获取注册中心状态
  const status = registry.getStatus();
  console.log('注册中心状态:');
  console.log(`  总服务数：${status.totalServices}`);
  console.log(`  健康服务：${status.healthyServices}`);
  console.log(`  不健康服务：${status.unhealthyServices}`);
  console.log();
  
  // 模拟心跳更新
  await registry.heartbeat(userService.id);
  console.log(`心跳更新：${userService.id}`);
  console.log();
  
  // ============================================
  // 示例 4: 服务 URL 构建
  // ============================================
  console.log('4️⃣ 服务 URL 构建');
  console.log('─'.repeat(50));
  
  console.log('构建服务 URL:');
  console.log(`  HTTP: ${buildServiceUrl(userService)}`);
  console.log(`  HTTPS: ${buildServiceUrl(orderService)}`);
  console.log();
  
  // ============================================
  // 示例 5: 批量注册
  // ============================================
  console.log('5️⃣ 批量注册服务');
  console.log('─'.repeat(50));
  
  const batchConfigs: ServiceRegistrationConfig[] = [
    {
      name: 'notification-service',
      host: '192.168.1.110',
      port: 8090,
      tags: ['async', 'notification']
    },
    {
      name: 'analytics-service',
      host: '192.168.1.111',
      port: 8091,
      tags: ['analytics', 'batch']
    }
  ];
  
  const batchInstances = await batchRegisterServices(registry, batchConfigs);
  console.log(`批量注册完成：${batchInstances.length} 个服务`);
  batchInstances.forEach((inst) => {
    console.log(`  • ${inst.name} @ ${inst.host}:${inst.port}`);
  });
  console.log();
  
  // ============================================
  // 示例 6: 健康检查监控
  // ============================================
  console.log('6️⃣ 健康检查监控');
  console.log('─'.repeat(50));
  
  console.log('启动健康检查监控 (每 30 秒检查一次)...');
  registry.startHealthMonitoring();
  
  // 等待 2 秒后停止 (演示用)
  setTimeout(() => {
    registry.stopHealthMonitoring();
    console.log();
    
    // ============================================
    // 示例 7: 服务注销
    // ============================================
    console.log('7️⃣ 服务注销');
    console.log('─'.repeat(50));
    
    registry.deregister(paymentService2.id);
    console.log();
    
    // 最终状态
    const finalStatus = registry.getStatus();
    console.log('最终注册中心状态:');
    console.log(`  总服务数：${finalStatus.totalServices}`);
    console.log(`  健康服务：${finalStatus.healthyServices}`);
    console.log();
    
    // ============================================
    // 总结
    // ============================================
    console.log('✅ 所有示例执行完成!');
    console.log();
    console.log('📋 功能总结:');
    console.log('  • 服务注册：register(), batchRegisterServices()');
    console.log('  • 服务发现：discover() (支持随机/轮询/权重负载均衡)');
    console.log('  • 健康检查：healthCheck(), startHealthMonitoring()');
    console.log('  • 工具函数：buildServiceUrl(), discoverAndCall()');
    console.log();
    console.log('🚀 生产环境建议:');
    console.log('  • 使用分布式注册中心 (Consul/Etcd/Zookeeper)');
    console.log('  • 实现真实 HTTP 健康检查端点调用');
    console.log('  • 添加服务预热和优雅下线机制');
    console.log('  • 集成链路追踪和监控告警');
  }, 2000);
  })();
}
