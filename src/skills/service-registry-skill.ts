/**
 * 服务注册中心技能 - Service Registry Skill
 * 
 * 功能:
 * 1. 服务注册 - 服务实例注册到注册中心
 * 2. 服务发现 - 根据服务名查找可用实例
 * 3. 健康检查 - 定期检查服务实例健康状态
 * 
 * @author Axon
 * @version 1.0.0
 */

// ============== 类型定义 ==============

export interface ServiceInstance {
  /** 服务实例 ID */
  id: string;
  /** 服务名称 */
  serviceName: string;
  /** 主机地址 */
  host: string;
  /** 端口号 */
  port: number;
  /** 健康状态 */
  status: 'healthy' | 'unhealthy' | 'unknown';
  /** 注册时间戳 */
  registeredAt: number;
  /** 最后心跳时间 */
  lastHeartbeat: number;
  /** 元数据 */
  metadata?: Record<string, any>;
  /** 权重 (用于负载均衡) */
  weight?: number;
  /** 版本 */
  version?: string;
}

export interface ServiceRegistryConfig {
  /** 健康检查间隔 (毫秒) */
  healthCheckInterval?: number;
  /** 服务超时时间 (毫秒) */
  serviceTimeout?: number;
  /** 是否启用自动健康检查 */
  enableAutoHealthCheck?: boolean;
  /** 健康检查重试次数 */
  healthCheckRetries?: number;
  /** 是否启用日志 */
  enableLogging?: boolean;
}

export interface HealthCheckResult {
  /** 服务实例 ID */
  instanceId: string;
  /** 是否健康 */
  healthy: boolean;
  /** 响应时间 (毫秒) */
  responseTime?: number;
  /** 错误信息 */
  error?: string;
  /** 检查时间戳 */
  checkedAt: number;
}

export interface DiscoveryOptions {
  /** 只返回健康实例 */
  healthyOnly?: boolean;
  /** 负载均衡策略：random | round-robin | weighted */
  loadBalance?: 'random' | 'round-robin' | 'weighted';
  /** 版本过滤 */
  version?: string;
  /** 元数据过滤 */
  metadata?: Record<string, any>;
}

export interface RegistryStats {
  /** 注册服务总数 */
  totalServices: number;
  /** 健康实例数 */
  healthyInstances: number;
  /** 不健康实例数 */
  unhealthyInstances: number;
  /** 总注册实例数 */
  totalInstances: number;
  /** 健康检查次数 */
  healthCheckCount: number;
  /** 最后检查时间 */
  lastHealthCheck?: number;
}

export interface ServiceEvent {
  /** 事件类型 */
  type: 'registered' | 'deregistered' | 'healthy' | 'unhealthy' | 'heartbeat';
  /** 服务实例 */
  instance: ServiceInstance;
  /** 时间戳 */
  timestamp: number;
  /** 附加数据 */
  data?: any;
}

export type ServiceEventListener = (event: ServiceEvent) => void;

// ============== 服务注册中心实现 ==============

/**
 * 服务注册中心类
 */
export class ServiceRegistry {
  private services: Map<string, ServiceInstance[]> = new Map();
  private config: Required<ServiceRegistryConfig>;
  private healthCheckTimers: Map<string, NodeJS.Timeout> = new Map();
  private eventListeners: ServiceEventListener[] = [];
  private roundRobinCounters: Map<string, number> = new Map();
  private stats: RegistryStats = {
    totalServices: 0,
    healthyInstances: 0,
    unhealthyInstances: 0,
    totalInstances: 0,
    healthCheckCount: 0,
  };
  private running: boolean = false;

  constructor(config: ServiceRegistryConfig = {}) {
    this.config = {
      healthCheckInterval: config.healthCheckInterval ?? 5000,
      serviceTimeout: config.serviceTimeout ?? 15000,
      enableAutoHealthCheck: config.enableAutoHealthCheck ?? true,
      healthCheckRetries: config.healthCheckRetries ?? 3,
      enableLogging: config.enableLogging ?? true,
    };
  }

  // ============== 核心功能 ==============

  /**
   * 注册服务实例
   */
  register(instance: Omit<ServiceInstance, 'id' | 'status' | 'registeredAt' | 'lastHeartbeat'>): ServiceInstance {
    const id = this.generateInstanceId(instance.serviceName, instance.host, instance.port);
    const now = Date.now();

    const fullInstance: ServiceInstance = {
      ...instance,
      id,
      status: 'unknown',
      registeredAt: now,
      lastHeartbeat: now,
    };

    // 获取或创建服务实例列表
    let instances = this.services.get(instance.serviceName);
    if (!instances) {
      instances = [];
      this.services.set(instance.serviceName, instances);
    }

    // 检查是否已存在相同实例
    const existingIndex = instances.findIndex(i => i.id === id);
    if (existingIndex !== -1) {
      // 更新现有实例
      instances[existingIndex] = { ...fullInstance, status: instances[existingIndex].status };
      this.log(`服务实例更新：${id}`);
    } else {
      // 添加新实例
      instances.push(fullInstance);
      this.log(`服务实例注册：${id}`);
    }

    // 启动健康检查
    if (this.config.enableAutoHealthCheck && !this.healthCheckTimers.has(id)) {
      this.startHealthCheck(id);
    }

    // 更新统计
    this.updateStats();

    // 触发事件
    this.emitEvent({
      type: 'registered',
      instance: fullInstance,
      timestamp: now,
    });

    return fullInstance;
  }

  /**
   * 注销服务实例
   */
  deregister(serviceName: string, instanceId: string): boolean {
    const instances = this.services.get(serviceName);
    if (!instances) {
      this.log(`服务不存在：${serviceName}`, 'warn');
      return false;
    }

    const index = instances.findIndex(i => i.id === instanceId);
    if (index === -1) {
      this.log(`实例不存在：${instanceId}`, 'warn');
      return false;
    }

    const [removed] = instances.splice(index, 1);
    
    // 停止健康检查
    this.stopHealthCheck(instanceId);

    // 如果服务没有实例了，删除服务
    if (instances.length === 0) {
      this.services.delete(serviceName);
    }

    this.log(`服务实例注销：${instanceId}`);
    this.updateStats();

    // 触发事件
    this.emitEvent({
      type: 'deregistered',
      instance: removed,
      timestamp: Date.now(),
    });

    return true;
  }

  /**
   * 服务发现 - 查找服务实例
   */
  discover(serviceName: string, options: DiscoveryOptions = {}): ServiceInstance[] {
    const instances = this.services.get(serviceName);
    if (!instances || instances.length === 0) {
      this.log(`服务未找到：${serviceName}`, 'warn');
      return [];
    }

    let filtered = instances;

    // 健康过滤
    if (options.healthyOnly !== false) {
      filtered = filtered.filter(i => i.status === 'healthy');
    }

    // 版本过滤
    if (options.version) {
      filtered = filtered.filter(i => i.version === options.version);
    }

    // 元数据过滤
    if (options.metadata) {
      filtered = filtered.filter(i => {
        if (!i.metadata) return false;
        return Object.entries(options.metadata!).every(
          ([key, value]) => i.metadata?.[key] === value
        );
      });
    }

    // 负载均衡选择
    if (options.loadBalance && filtered.length > 0) {
      const selected = this.selectInstance(serviceName, filtered, options.loadBalance);
      return selected ? [selected] : [];
    }

    return filtered;
  }

  /**
   * 获取所有服务
   */
  getAllServices(): string[] {
    return Array.from(this.services.keys());
  }

  /**
   * 获取服务的所有实例
   */
  getServiceInstances(serviceName: string): ServiceInstance[] {
    return this.services.get(serviceName) || [];
  }

  /**
   * 发送心跳
   */
  heartbeat(serviceName: string, instanceId: string): boolean {
    const instances = this.services.get(serviceName);
    if (!instances) return false;

    const instance = instances.find(i => i.id === instanceId);
    if (!instance) return false;

    instance.lastHeartbeat = Date.now();
    
    // 如果之前是不健康状态，现在恢复为健康
    if (instance.status === 'unhealthy') {
      instance.status = 'healthy';
      this.emitEvent({
        type: 'healthy',
        instance,
        timestamp: Date.now(),
      });
    }

    this.emitEvent({
      type: 'heartbeat',
      instance,
      timestamp: Date.now(),
    });

    return true;
  }

  /**
   * 手动健康检查
   */
  async checkHealth(serviceName: string, instanceId: string): Promise<HealthCheckResult> {
    const instances = this.services.get(serviceName);
    const instance = instances?.find(i => i.id === instanceId);

    const now = Date.now();
    const result: HealthCheckResult = {
      instanceId,
      healthy: false,
      checkedAt: now,
    };

    if (!instance) {
      result.error = '实例不存在';
      return result;
    }

    // 检查心跳超时
    const timeSinceHeartbeat = now - instance.lastHeartbeat;
    if (timeSinceHeartbeat > this.config.serviceTimeout) {
      result.error = `心跳超时 (${Math.round(timeSinceHeartbeat / 1000)}s)`;
      if (instance.status !== 'unhealthy') {
        instance.status = 'unhealthy';
        this.emitEvent({ type: 'unhealthy', instance, timestamp: now, data: { reason: 'timeout' } });
      }
      return result;
    }

    // 模拟健康检查 (实际应用中应该是 HTTP/RPC 调用)
    const startTime = Date.now();
    try {
      // 这里应该实现实际的健康检查逻辑
      // 例如：HTTP GET http://host:port/health
      const healthy = await this.performHealthCheck(instance);
      const responseTime = Date.now() - startTime;

      result.healthy = healthy;
      result.responseTime = responseTime;

      if (healthy && instance.status !== 'healthy') {
        instance.status = 'healthy';
        this.emitEvent({ type: 'healthy', instance, timestamp: now });
      } else if (!healthy && instance.status !== 'unhealthy') {
        instance.status = 'unhealthy';
        this.emitEvent({ type: 'unhealthy', instance, timestamp: now, data: { reason: 'check_failed' } });
      }

      this.stats.healthCheckCount++;
      this.updateStats();
    } catch (error) {
      result.error = error instanceof Error ? error.message : '检查失败';
      if (instance.status !== 'unhealthy') {
        instance.status = 'unhealthy';
        this.emitEvent({ type: 'unhealthy', instance, timestamp: now, data: { reason: 'error' } });
      }
    }

    return result;
  }

  /**
   * 启动注册中心
   */
  start(): void {
    if (this.running) {
      this.log('注册中心已在运行', 'warn');
      return;
    }

    this.running = true;
    this.log('服务注册中心启动');

    // 启动所有已注册实例的健康检查
    if (this.config.enableAutoHealthCheck) {
      for (const [serviceName, instances] of this.services) {
        for (const instance of instances) {
          this.startHealthCheck(instance.id);
        }
      }
    }
  }

  /**
   * 停止注册中心
   */
  stop(): void {
    if (!this.running) return;

    this.running = false;

    // 停止所有健康检查
    for (const timer of this.healthCheckTimers.values()) {
      clearInterval(timer);
    }
    this.healthCheckTimers.clear();

    this.log('服务注册中心停止');
  }

  /**
   * 获取统计信息
   */
  getStats(): RegistryStats {
    return { ...this.stats, lastHealthCheck: this.stats.lastHealthCheck };
  }

  /**
   * 订阅事件
   */
  onEvent(listener: ServiceEventListener): () => void {
    this.eventListeners.push(listener);
    return () => {
      const index = this.eventListeners.indexOf(listener);
      if (index !== -1) {
        this.eventListeners.splice(index, 1);
      }
    };
  }

  // ============== 私有方法 ==============

  private generateInstanceId(serviceName: string, host: string, port: number): string {
    return `${serviceName}-${host}-${port}`;
  }

  private startHealthCheck(instanceId: string): void {
    if (this.healthCheckTimers.has(instanceId)) return;

    const timer = setInterval(async () => {
      // 查找实例
      let targetService: string | null = null;
      let targetInstance: ServiceInstance | null = null;

      for (const [serviceName, instances] of this.services) {
        const instance = instances.find(i => i.id === instanceId);
        if (instance) {
          targetService = serviceName;
          targetInstance = instance;
          break;
        }
      }

      if (!targetService || !targetInstance) {
        this.stopHealthCheck(instanceId);
        return;
      }

      // 执行健康检查
      await this.checkHealth(targetService, instanceId);
    }, this.config.healthCheckInterval);

    this.healthCheckTimers.set(instanceId, timer);
  }

  private stopHealthCheck(instanceId: string): void {
    const timer = this.healthCheckTimers.get(instanceId);
    if (timer) {
      clearInterval(timer);
      this.healthCheckTimers.delete(instanceId);
    }
  }

  private selectInstance(
    serviceName: string,
    instances: ServiceInstance[],
    strategy: 'random' | 'round-robin' | 'weighted'
  ): ServiceInstance | null {
    if (instances.length === 0) return null;

    switch (strategy) {
      case 'random':
        return instances[Math.floor(Math.random() * instances.length)];

      case 'round-robin':
        const counter = this.roundRobinCounters.get(serviceName) || 0;
        this.roundRobinCounters.set(serviceName, (counter + 1) % instances.length);
        return instances[counter % instances.length];

      case 'weighted':
        const totalWeight = instances.reduce((sum, i) => sum + (i.weight || 1), 0);
        let random = Math.random() * totalWeight;
        for (const instance of instances) {
          const weight = instance.weight || 1;
          if (random < weight) {
            return instance;
          }
          random -= weight;
        }
        return instances[0];

      default:
        return instances[0];
    }
  }

  private async performHealthCheck(instance: ServiceInstance): Promise<boolean> {
    // 默认实现：检查心跳是否在超时范围内
    const timeSinceHeartbeat = Date.now() - instance.lastHeartbeat;
    return timeSinceHeartbeat < this.config.serviceTimeout;

    // 实际应用中应该实现真实的健康检查
    // 例如：
    // try {
    //   const response = await fetch(`http://${instance.host}:${instance.port}/health`, {
    //     method: 'GET',
    //     timeout: 5000,
    //   });
    //   return response.ok;
    // } catch {
    //   return false;
    // }
  }

  private updateStats(): void {
    let totalInstances = 0;
    let healthyInstances = 0;
    let unhealthyInstances = 0;

    for (const instances of this.services.values()) {
      totalInstances += instances.length;
      healthyInstances += instances.filter(i => i.status === 'healthy').length;
      unhealthyInstances += instances.filter(i => i.status === 'unhealthy').length;
    }

    this.stats = {
      ...this.stats,
      totalServices: this.services.size,
      totalInstances,
      healthyInstances,
      unhealthyInstances,
    };
  }

  private emitEvent(event: ServiceEvent): void {
    for (const listener of this.eventListeners) {
      try {
        listener(event);
      } catch (error) {
        this.log(`事件监听器错误：${error}`, 'error');
      }
    }
  }

  private log(message: string, level: 'info' | 'warn' | 'error' = 'info'): void {
    if (!this.config.enableLogging) return;

    const prefix = '[ServiceRegistry]';
    switch (level) {
      case 'error':
        console.error(`${prefix} [ERROR] ${message}`);
        break;
      case 'warn':
        console.warn(`${prefix} [WARN] ${message}`);
        break;
      default:
        console.log(`${prefix} [INFO] ${message}`);
    }
  }
}

// ============== 导出 ==============

export default ServiceRegistry;
