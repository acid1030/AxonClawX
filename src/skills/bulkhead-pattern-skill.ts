/**
 * 舱壁模式工具技能 - KAEL
 * 
 * 提供舱壁模式 (Bulkhead Pattern) 的核心实现，用于系统资源隔离和故障隔离：
 * 1. 舱壁定义 (Bulkhead Definition) - 定义资源隔离边界
 * 2. 资源池隔离 (Resource Pool Isolation) - 独立的资源池管理
 * 3. 故障隔离 (Fault Isolation) - 防止故障传播
 * 
 * @author KAEL
 * @version 1.0.0
 * @since 2026-03-13
 */

// ============================================
// 类型定义
// ============================================

/**
 * 舱壁状态枚举
 */
export enum BulkheadState {
  /** 正常运行 */
  HEALTHY = 'healthy',
  /** 资源受限 */
  CONSTRAINED = 'constrained',
  /** 已打开 (拒绝新请求) */
  OPEN = 'open',
  /** 半开 (测试恢复) */
  HALF_OPEN = 'half_open',
  /** 故障 */
  FAILED = 'failed'
}

/**
 * 资源类型
 */
export type ResourceType = 
  | 'thread'      // 线程池
  | 'connection'  // 数据库/网络连接
  | 'memory'      // 内存配额
  | 'cpu'         // CPU 时间片
  | 'bandwidth'   // 带宽配额
  | 'custom';     // 自定义资源

/**
 * 舱壁配置接口
 */
export interface BulkheadConfig {
  /** 舱壁名称 */
  name: string;
  /** 资源类型 */
  resourceType: ResourceType;
  /** 最大资源数量 */
  maxResources: number;
  /** 最小资源数量 (保留) */
  minResources?: number;
  /** 获取资源超时 (ms) */
  acquireTimeoutMs?: number;
  /** 故障阈值 (连续失败次数) */
  failureThreshold?: number;
  /** 恢复时间 (ms) */
  recoveryTimeMs?: number;
  /** 资源使用率告警阈值 (0-1) */
  warningThreshold?: number;
}

/**
 * 资源许可接口
 */
export interface ResourcePermit {
  /** 许可 ID */
  id: string;
  /** 获取时间戳 */
  acquiredAt: number;
  /** 资源类型 */
  resourceType: ResourceType;
  /** 释放方法 */
  release: () => void;
}

/**
 * 舱壁统计信息
 */
export interface BulkheadMetrics {
  /** 当前状态 */
  state: BulkheadState;
  /** 已用资源数 */
  usedResources: number;
  /** 可用资源数 */
  availableResources: number;
  /** 总资源数 */
  totalResources: number;
  /** 资源使用率 */
  utilizationRate: number;
  /** 等待中的请求数 */
  waitingRequests: number;
  /** 累计失败次数 */
  totalFailures: number;
  /** 累计拒绝次数 */
  totalRejections: number;
  /** 最后故障时间 */
  lastFailureTime?: number;
  /** 最后恢复时间 */
  lastRecoveryTime?: number;
}

/**
 * 舱壁事件类型
 */
export type BulkheadEventType = 
  | 'acquire'        // 获取资源
  | 'release'        // 释放资源
  | 'reject'         // 拒绝请求
  | 'failure'        // 发生故障
  | 'recovery'       // 恢复
  | 'state_change';  // 状态变更

/**
 * 舱壁事件
 */
export interface BulkheadEvent {
  /** 事件类型 */
  type: BulkheadEventType;
  /** 舱壁名称 */
  bulkheadName: string;
  /** 时间戳 */
  timestamp: number;
  /** 事件数据 */
  data?: any;
}

/**
 * 舱壁事件处理器
 */
export type BulkheadEventHandler = (event: BulkheadEvent) => void;

// ============================================
// 1. 舱壁定义 (Bulkhead Definition)
// ============================================

/**
 * 舱壁类 - 核心实现
 * 
 * 提供资源隔离的基本单元，管理资源池的获取和释放
 */
export class Bulkhead {
  /** 舱壁配置 */
  private config: BulkheadConfig;
  /** 当前状态 */
  private state: BulkheadState = BulkheadState.HEALTHY;
  /** 可用资源信号量 */
  private availablePermits: number;
  /** 等待队列 */
  private waitingQueue: Array<{
    resolve: (permit: ResourcePermit) => void;
    reject: (error: Error) => void;
    timeoutId?: NodeJS.Timeout;
  }> = [];
  /** 已分配的许可 */
  private activePermits: Map<string, ResourcePermit> = new Map();
  /** 连续失败计数 */
  private failureCount: number = 0;
  /** 统计信息 */
  private metrics: BulkheadMetrics;
  /** 事件处理器 */
  private eventHandlers: BulkheadEventHandler[] = [];
  /** 恢复定时器 */
  private recoveryTimeoutId?: NodeJS.Timeout;

  constructor(config: BulkheadConfig) {
    this.config = {
      ...config,
      minResources: config.minResources ?? 0,
      acquireTimeoutMs: config.acquireTimeoutMs ?? 5000,
      failureThreshold: config.failureThreshold ?? 5,
      recoveryTimeMs: config.recoveryTimeMs ?? 30000,
      warningThreshold: config.warningThreshold ?? 0.8
    };
    
    this.availablePermits = this.config.maxResources;
    
    this.metrics = {
      state: this.state,
      usedResources: 0,
      availableResources: this.availablePermits,
      totalResources: this.config.maxResources,
      utilizationRate: 0,
      waitingRequests: 0,
      totalFailures: 0,
      totalRejections: 0
    };

    this.emitEvent({
      type: 'state_change',
      bulkheadName: this.config.name,
      timestamp: Date.now(),
      data: { newState: this.state }
    });
  }

  /**
   * 获取资源许可
   * 
   * @param timeoutMs - 可选的超时时间 (覆盖配置)
   * @returns 资源许可 Promise
   * 
   * @example
   * const bulkhead = new Bulkhead({
   *   name: 'db-pool',
   *   resourceType: 'connection',
   *   maxResources: 10
   * });
   * 
   * const permit = await bulkhead.acquire();
   * try {
   *   // 执行数据库操作
   *   await db.query('SELECT * FROM users');
   * } finally {
   *   permit.release();
   * }
   */
  async acquire(timeoutMs?: number): Promise<ResourcePermit> {
    const timeout = timeoutMs ?? this.config.acquireTimeoutMs!;

    // 检查舱壁状态
    if (this.state === BulkheadState.OPEN || this.state === BulkheadState.FAILED) {
      this.metrics.totalRejections++;
      this.emitEvent({
        type: 'reject',
        bulkheadName: this.config.name,
        timestamp: Date.now(),
        data: { reason: `Bulkhead is ${this.state}` }
      });
      throw new BulkheadError(
        `Bulkhead '${this.config.name}' is ${this.state}`,
        'BULKHEAD_OPEN'
      );
    }

    // 如果有可用资源，直接分配
    if (this.availablePermits > 0) {
      return this.allocatePermit();
    }

    // 资源不足，进入等待队列
    return new Promise<ResourcePermit>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        this.removeFromWaitingQueue(timeoutId);
        reject(new BulkheadError(
          `Resource acquisition timeout after ${timeout}ms`,
          'TIMEOUT'
        ));
      }, timeout);

      this.waitingQueue.push({ resolve, reject, timeoutId });
      this.metrics.waitingRequests = this.waitingQueue.length;

      this.emitEvent({
        type: 'acquire',
        bulkheadName: this.config.name,
        timestamp: Date.now(),
        data: { waiting: true, queueLength: this.waitingQueue.length }
      });
    });
  }

  /**
   * 尝试获取资源 (非阻塞)
   * 
   * @returns 成功返回许可，失败返回 null
   */
  tryAcquire(): ResourcePermit | null {
    if (this.state !== BulkheadState.HEALTHY && this.state !== BulkheadState.HALF_OPEN) {
      return null;
    }

    if (this.availablePermits > 0) {
      return this.allocatePermit();
    }

    return null;
  }

  /**
   * 分配许可
   */
  private allocatePermit(): ResourcePermit {
    this.availablePermits--;
    const permitId = `${this.config.name}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const permit: ResourcePermit = {
      id: permitId,
      acquiredAt: Date.now(),
      resourceType: this.config.resourceType,
      release: () => this.releasePermit(permitId)
    };

    this.activePermits.set(permitId, permit);
    this.updateMetrics();
    this.checkWarningThreshold();

    this.emitEvent({
      type: 'acquire',
      bulkheadName: this.config.name,
      timestamp: Date.now(),
      data: { permitId, available: this.availablePermits }
    });

    return permit;
  }

  /**
   * 释放许可
   */
  private releasePermit(permitId: string): void {
    const permit = this.activePermits.get(permitId);
    if (!permit) {
      return; // 已经释放或不存在
    }

    this.activePermits.delete(permitId);
    this.availablePermits++;

    this.updateMetrics();

    this.emitEvent({
      type: 'release',
      bulkheadName: this.config.name,
      timestamp: Date.now(),
      data: { permitId, available: this.availablePermits }
    });

    // 唤醒等待队列中的第一个请求
    if (this.waitingQueue.length > 0 && this.availablePermits > 0) {
      const next = this.waitingQueue.shift()!;
      if (next.timeoutId) {
        clearTimeout(next.timeoutId);
      }
      next.resolve(this.allocatePermit());
      this.metrics.waitingRequests = this.waitingQueue.length;
    }
  }

  /**
   * 记录故障
   */
  recordFailure(): void {
    this.failureCount++;
    this.metrics.totalFailures++;
    this.metrics.lastFailureTime = Date.now();

    this.emitEvent({
      type: 'failure',
      bulkheadName: this.config.name,
      timestamp: Date.now(),
      data: { failureCount: this.failureCount, threshold: this.config.failureThreshold }
    });

    // 检查是否达到故障阈值
    if (this.failureCount >= this.config.failureThreshold!) {
      this.open();
    }
  }

  /**
   * 记录成功
   */
  recordSuccess(): void {
    // 重置失败计数
    if (this.failureCount > 0) {
      this.failureCount = 0;
    }

    // 如果处于半开状态，成功则恢复
    if (this.state === BulkheadState.HALF_OPEN) {
      this.close();
    }
  }

  /**
   * 打开舱壁 (拒绝新请求)
   */
  open(): void {
    if (this.state === BulkheadState.OPEN) {
      return;
    }

    const oldState = this.state;
    this.state = BulkheadState.OPEN;

    // 拒绝所有等待中的请求
    for (const waiter of this.waitingQueue) {
      if (waiter.timeoutId) {
        clearTimeout(waiter.timeoutId);
      }
      waiter.reject(new BulkheadError(
        `Bulkhead '${this.config.name}' opened due to failures`,
        'BULKHEAD_OPEN'
      ));
    }
    this.waitingQueue = [];

    // 设置恢复定时器
    if (this.recoveryTimeoutId) {
      clearTimeout(this.recoveryTimeoutId);
    }
    this.recoveryTimeoutId = setTimeout(() => {
      this.halfOpen();
    }, this.config.recoveryTimeMs!);

    this.updateMetrics();

    this.emitEvent({
      type: 'state_change',
      bulkheadName: this.config.name,
      timestamp: Date.now(),
      data: { oldState, newState: this.state }
    });
  }

  /**
   * 半开舱壁 (测试恢复)
   */
  halfOpen(): void {
    if (this.state !== BulkheadState.OPEN) {
      return;
    }

    const oldState = this.state;
    this.state = BulkheadState.HALF_OPEN;
    this.updateMetrics();

    this.emitEvent({
      type: 'state_change',
      bulkheadName: this.config.name,
      timestamp: Date.now(),
      data: { oldState, newState: this.state }
    });
  }

  /**
   * 关闭舱壁 (恢复正常)
   */
  close(): void {
    if (this.state === BulkheadState.HEALTHY) {
      return;
    }

    const oldState = this.state;
    this.state = BulkheadState.HEALTHY;
    this.failureCount = 0;
    this.metrics.lastRecoveryTime = Date.now();

    if (this.recoveryTimeoutId) {
      clearTimeout(this.recoveryTimeoutId);
      this.recoveryTimeoutId = undefined;
    }

    this.updateMetrics();

    this.emitEvent({
      type: 'recovery',
      bulkheadName: this.config.name,
      timestamp: Date.now()
    });

    this.emitEvent({
      type: 'state_change',
      bulkheadName: this.config.name,
      timestamp: Date.now(),
      data: { oldState, newState: this.state }
    });
  }

  /**
   * 获取当前状态
   */
  getState(): BulkheadState {
    return this.state;
  }

  /**
   * 获取统计信息
   */
  getMetrics(): BulkheadMetrics {
    this.updateMetrics();
    return { ...this.metrics };
  }

  /**
   * 注册事件处理器
   */
  onEvent(handler: BulkheadEventHandler): void {
    this.eventHandlers.push(handler);
  }

  /**
   * 移除事件处理器
   */
  offEvent(handler: BulkheadEventHandler): void {
    const index = this.eventHandlers.indexOf(handler);
    if (index > -1) {
      this.eventHandlers.splice(index, 1);
    }
  }

  /**
   * 从等待队列移除
   */
  private removeFromWaitingQueue(timeoutId: NodeJS.Timeout): void {
    const index = this.waitingQueue.findIndex(w => w.timeoutId === timeoutId);
    if (index > -1) {
      this.waitingQueue.splice(index, 1);
      this.metrics.waitingRequests = this.waitingQueue.length;
    }
  }

  /**
   * 更新统计信息
   */
  private updateMetrics(): void {
    this.metrics.state = this.state;
    this.metrics.usedResources = this.config.maxResources - this.availablePermits;
    this.metrics.availableResources = this.availablePermits;
    this.metrics.utilizationRate = this.metrics.usedResources / this.config.maxResources;
  }

  /**
   * 检查告警阈值
   */
  private checkWarningThreshold(): void {
    const threshold = this.config.warningThreshold!;
    if (this.metrics.utilizationRate >= threshold && this.state === BulkheadState.HEALTHY) {
      this.state = BulkheadState.CONSTRAINED;
      this.updateMetrics();
      
      this.emitEvent({
        type: 'state_change',
        bulkheadName: this.config.name,
        timestamp: Date.now(),
        data: { 
          newState: this.state, 
          utilizationRate: this.metrics.utilizationRate,
          threshold 
        }
      });
    }
  }

  /**
   * 发射事件
   */
  private emitEvent(event: BulkheadEvent): void {
    for (const handler of this.eventHandlers) {
      try {
        handler(event);
      } catch (error) {
        console.error(`[Bulkhead] Event handler error:`, error);
      }
    }
  }
}

// ============================================
// 2. 资源池隔离 (Resource Pool Isolation)
// ============================================

/**
 * 资源池管理器
 * 
 * 管理多个舱壁，实现资源池级别的隔离
 */
export class ResourcePoolManager {
  /** 舱壁注册表 */
  private bulkheads: Map<string, Bulkhead> = new Map();
  /** 资源池配置 */
  private poolConfig: Map<string, string[]> = new Map();
  /** 事件处理器 */
  private eventHandlers: BulkheadEventHandler[] = [];

  /**
   * 创建舱壁
   * 
   * @param config - 舱壁配置
   * @returns 舱壁实例
   * 
   * @example
   * const poolManager = new ResourcePoolManager();
   * 
   * const dbBulkhead = poolManager.createBulkhead({
   *   name: 'database',
   *   resourceType: 'connection',
   *   maxResources: 20,
   *   failureThreshold: 3
   * });
   */
  createBulkhead(config: BulkheadConfig): Bulkhead {
    if (this.bulkheads.has(config.name)) {
      throw new Error(`Bulkhead '${config.name}' already exists`);
    }

    const bulkhead = new Bulkhead(config);
    this.bulkheads.set(config.name, bulkhead);

    // 转发事件
    bulkhead.onEvent((event) => this.emitEvent(event));

    return bulkhead;
  }

  /**
   * 获取舱壁
   */
  getBulkhead(name: string): Bulkhead | undefined {
    return this.bulkheads.get(name);
  }

  /**
   * 创建资源池 (多个舱壁的组合)
   * 
   * @param poolName - 资源池名称
   * @param bulkheadNames - 舱壁名称列表
   * 
   * @example
   * // 创建 API 服务资源池
   * poolManager.createBulkhead({
   *   name: 'api-cpu',
   *   resourceType: 'cpu',
   *   maxResources: 100
   * });
   * poolManager.createBulkhead({
   *   name: 'api-memory',
   *   resourceType: 'memory',
   *   maxResources: 1024 // MB
   * });
   * 
   * poolManager.createResourcePool('api-service', ['api-cpu', 'api-memory']);
   */
  createResourcePool(poolName: string, bulkheadNames: string[]): void {
    // 验证所有舱壁存在
    for (const name of bulkheadNames) {
      if (!this.bulkheads.has(name)) {
        throw new Error(`Bulkhead '${name}' not found`);
      }
    }

    this.poolConfig.set(poolName, bulkheadNames);
  }

  /**
   * 获取资源池中的所有舱壁
   */
  getResourcePool(poolName: string): Bulkhead[] {
    const bulkheadNames = this.poolConfig.get(poolName);
    if (!bulkheadNames) {
      throw new Error(`Resource pool '${poolName}' not found`);
    }

    return bulkheadNames
      .map(name => this.bulkheads.get(name))
      .filter((b): b is Bulkhead => b !== undefined);
  }

  /**
   * 获取所有舱壁的统计信息
   */
  getAllMetrics(): Map<string, BulkheadMetrics> {
    const metrics = new Map<string, BulkheadMetrics>();
    for (const [name, bulkhead] of this.bulkheads) {
      metrics.set(name, bulkhead.getMetrics());
    }
    return metrics;
  }

  /**
   * 获取健康状态异常的舱壁
   */
  getUnhealthyBulkheads(): Bulkhead[] {
    const unhealthy: Bulkhead[] = [];
    for (const bulkhead of this.bulkheads.values()) {
      const state = bulkhead.getState();
      if (state !== BulkheadState.HEALTHY && state !== BulkheadState.CONSTRAINED) {
        unhealthy.push(bulkhead);
      }
    }
    return unhealthy;
  }

  /**
   * 注册事件处理器
   */
  onEvent(handler: BulkheadEventHandler): void {
    this.eventHandlers.push(handler);
  }

  /**
   * 发射事件
   */
  private emitEvent(event: BulkheadEvent): void {
    for (const handler of this.eventHandlers) {
      try {
        handler(event);
      } catch (error) {
        console.error(`[ResourcePoolManager] Event handler error:`, error);
      }
    }
  }
}

// ============================================
// 3. 故障隔离 (Fault Isolation)
// ============================================

/**
 * 舱壁错误类
 */
export class BulkheadError extends Error {
  /** 错误代码 */
  public code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = 'BulkheadError';
    this.code = code;
  }
}

/**
 * 故障隔离器
 * 
 * 提供高级故障隔离功能，包括级联故障预防和自动恢复
 */
export class FaultIsolator {
  /** 资源池管理器 */
  private poolManager: ResourcePoolManager;
  /** 故障传播图 */
  private failurePropagationGraph: Map<string, Set<string>> = new Map();
  /** 隔离策略 */
  private isolationStrategy: 'aggressive' | 'conservative' | 'adaptive';

  constructor(
    poolManager: ResourcePoolManager,
    strategy: 'aggressive' | 'conservative' | 'adaptive' = 'adaptive'
  ) {
    this.poolManager = poolManager;
    this.isolationStrategy = strategy;
  }

  /**
   * 定义故障传播关系
   * 
   * @param source - 源舱壁名称
   * @param targets - 可能受影响的目标舱壁名称列表
   * 
   * @example
   * // 定义：数据库故障会导致缓存和搜索服务故障
   * isolator.defineFailurePropagation('database', ['cache', 'search']);
   */
  defineFailurePropagation(source: string, targets: string[]): void {
    if (!this.failurePropagationGraph.has(source)) {
      this.failurePropagationGraph.set(source, new Set());
    }
    const targetsSet = this.failurePropagationGraph.get(source)!;
    for (const target of targets) {
      targetsSet.add(target);
    }
  }

  /**
   * 隔离故障舱壁
   * 
   * @param bulkheadName - 舱壁名称
   * @param preventCascade - 是否防止级联故障
   * 
   * @example
   * // 隔离故障的数据库舱壁，并防止级联
   * await isolator.isolateFault('database', true);
   */
  async isolateFault(bulkheadName: string, preventCascade: boolean = true): Promise<void> {
    const bulkhead = this.poolManager.getBulkhead(bulkheadName);
    if (!bulkhead) {
      throw new Error(`Bulkhead '${bulkheadName}' not found`);
    }

    // 打开故障舱壁
    bulkhead.open();

    if (preventCascade) {
      // 预防级联故障
      await this.preventCascadeFailure(bulkheadName);
    }

    console.log(`[FaultIsolator] Isolated bulkhead '${bulkheadName}'`);
  }

  /**
   * 预防级联故障
   */
  private async preventCascadeFailure(sourceBulkhead: string): Promise<void> {
    const affectedTargets = this.failurePropagationGraph.get(sourceBulkhead);
    if (!affectedTargets || affectedTargets.size === 0) {
      return;
    }

    console.log(
      `[FaultIsolator] Preventing cascade failure from '${sourceBulkhead}' to:`,
      Array.from(affectedTargets)
    );

    for (const targetName of affectedTargets) {
      const targetBulkhead = this.poolManager.getBulkhead(targetName);
      if (!targetBulkhead) {
        continue;
      }

      const state = targetBulkhead.getState();
      
      // 根据隔离策略采取行动
      switch (this.isolationStrategy) {
        case 'aggressive':
          // 激进策略：立即打开所有受影响的舱壁
          targetBulkhead.open();
          break;

        case 'conservative':
          // 保守策略：仅标记为受限状态
          if (state === BulkheadState.HEALTHY) {
            // 不主动干预，等待自身检测
          }
          break;

        case 'adaptive':
          // 自适应策略：根据资源使用率决定
          const metrics = targetBulkhead.getMetrics();
          if (metrics.utilizationRate > 0.7) {
            // 使用率高，提前打开
            targetBulkhead.open();
          } else if (metrics.utilizationRate > 0.5) {
            // 使用率中等，标记为受限
            // (通过 acquire 操作自然触发)
          }
          break;
      }
    }
  }

  /**
   * 恢复舱壁
   * 
   * @param bulkheadName - 舱壁名称
   */
  recoverBulkhead(bulkheadName: string): void {
    const bulkhead = this.poolManager.getBulkhead(bulkheadName);
    if (!bulkhead) {
      throw new Error(`Bulkhead '${bulkheadName}' not found`);
    }

    bulkhead.close();
    console.log(`[FaultIsolator] Recovered bulkhead '${bulkheadName}'`);
  }

  /**
   * 获取系统健康报告
   */
  getHealthReport(): {
    overall: 'healthy' | 'degraded' | 'critical';
    bulkheads: Array<{
      name: string;
      state: BulkheadState;
      utilizationRate: number;
    }>;
    warnings: string[];
  } {
    const metrics = this.poolManager.getAllMetrics();
    const bulkheadStates: Array<{
      name: string;
      state: BulkheadState;
      utilizationRate: number;
    }> = [];
    const warnings: string[] = [];

    let unhealthyCount = 0;
    let constrainedCount = 0;

    for (const [name, metric] of metrics) {
      bulkheadStates.push({
        name,
        state: metric.state,
        utilizationRate: metric.utilizationRate
      });

      if (metric.state === BulkheadState.OPEN || 
          metric.state === BulkheadState.FAILED ||
          metric.state === BulkheadState.HALF_OPEN) {
        unhealthyCount++;
        warnings.push(`Bulkhead '${name}' is ${metric.state}`);
      }

      if (metric.state === BulkheadState.CONSTRAINED) {
        constrainedCount++;
        warnings.push(`Bulkhead '${name}' is constrained (${(metric.utilizationRate * 100).toFixed(1)}% utilization)`);
      }
    }

    let overall: 'healthy' | 'degraded' | 'critical' = 'healthy';
    if (unhealthyCount > 0) {
      overall = unhealthyCount > 2 ? 'critical' : 'degraded';
    } else if (constrainedCount > 0) {
      overall = 'degraded';
    }

    return {
      overall,
      bulkheads: bulkheadStates,
      warnings
    };
  }
}

// ============================================
// 工厂函数
// ============================================

/**
 * 创建舱壁
 * 
 * @param config - 舱壁配置
 * @returns 舱壁实例
 */
export function createBulkhead(config: BulkheadConfig): Bulkhead {
  return new Bulkhead(config);
}

/**
 * 创建资源池管理器
 * 
 * @returns 资源池管理器实例
 */
export function createResourcePoolManager(): ResourcePoolManager {
  return new ResourcePoolManager();
}

/**
 * 创建故障隔离器
 * 
 * @param poolManager - 资源池管理器
 * @param strategy - 隔离策略
 * @returns 故障隔离器实例
 */
export function createFaultIsolator(
  poolManager: ResourcePoolManager,
  strategy: 'aggressive' | 'conservative' | 'adaptive' = 'adaptive'
): FaultIsolator {
  return new FaultIsolator(poolManager, strategy);
}

// ============================================
// 使用示例 (命令行执行)
// ============================================

if (require.main === module) {
  console.log('=== 舱壁模式工具 - 使用示例 ===\n');

  // ============================================
  // 示例 1: 基础舱壁使用
  // ============================================
  console.log('1️⃣ 基础舱壁 (Basic Bulkhead)');
  console.log('─'.repeat(50));

  const dbBulkhead = createBulkhead({
    name: 'database-pool',
    resourceType: 'connection',
    maxResources: 5,
    acquireTimeoutMs: 2000,
    failureThreshold: 3,
    warningThreshold: 0.6
  });

  // 注册事件监听
  dbBulkhead.onEvent((event) => {
    console.log(`  [Event] ${event.type}: ${JSON.stringify(event.data || {})}`);
  });

  // 模拟并发请求
  async function simulateRequest(id: number) {
    try {
      console.log(`  Request ${id}: Acquiring resource...`);
      const permit = await dbBulkhead.acquire();
      console.log(`  Request ${id}: Resource acquired (${permit.id})`);
      
      // 模拟工作
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // 记录成功
      dbBulkhead.recordSuccess();
      
      // 释放资源
      permit.release();
      console.log(`  Request ${id}: Resource released`);
    } catch (error) {
      console.log(`  Request ${id}: Failed - ${(error as Error).message}`);
      dbBulkhead.recordFailure();
    }
  }

  // 执行 7 个并发请求 (超过资源池大小)
  (async () => {
    await Promise.all(Array.from({ length: 7 }, (_, i) => simulateRequest(i + 1)));
    
    console.log('\n  舱壁统计:', JSON.stringify(dbBulkhead.getMetrics(), null, 2));
    console.log();

    // ============================================
    // 示例 2: 资源池管理
    // ============================================
    console.log('2️⃣ 资源池管理 (Resource Pool Manager)');
    console.log('─'.repeat(50));

    const poolManager = createResourcePoolManager();

    // 创建多个舱壁
    const apiCpu = poolManager.createBulkhead({
      name: 'api-cpu',
      resourceType: 'cpu',
      maxResources: 100
    });

    const apiMemory = poolManager.createBulkhead({
      name: 'api-memory',
      resourceType: 'memory',
      maxResources: 1024
    });

    const dbPool = poolManager.createBulkhead({
      name: 'api-database',
      resourceType: 'connection',
      maxResources: 20
    });

    // 创建资源池
    poolManager.createResourcePool('api-service', ['api-cpu', 'api-memory', 'api-database']);

    console.log('  创建的资源池: api-service');
    console.log('  包含舱壁: api-cpu, api-memory, api-database');

    // 获取资源池
    const apiServicePool = poolManager.getResourcePool('api-service');
    console.log(`  资源池大小: ${apiServicePool.length} 个舱壁`);

    // 获取所有指标
    const allMetrics = poolManager.getAllMetrics();
    console.log('\n  所有舱壁指标:');
    for (const [name, metrics] of allMetrics) {
      console.log(`    ${name}: ${(metrics.utilizationRate * 100).toFixed(1)}% 利用率`);
    }
    console.log();

    // ============================================
    // 示例 3: 故障隔离
    // ============================================
    console.log('3️⃣ 故障隔离 (Fault Isolation)');
    console.log('─'.repeat(50));

    const isolator = createFaultIsolator(poolManager, 'adaptive');

    // 定义故障传播关系
    isolator.defineFailurePropagation('api-database', ['api-cpu', 'api-memory']);
    console.log('  定义故障传播: api-database → [api-cpu, api-memory]');

    // 模拟数据库舱壁故障
    console.log('\n  模拟数据库舱壁故障...');
    for (let i = 0; i < 3; i++) {
      dbPool.recordFailure();
    }

    // 隔离故障
    await isolator.isolateFault('api-database', true);

    // 获取健康报告
    const healthReport = isolator.getHealthReport();
    console.log('\n  系统健康报告:');
    console.log(`    整体状态: ${healthReport.overall}`);
    console.log(`    警告数量: ${healthReport.warnings.length}`);
    for (const warning of healthReport.warnings) {
      console.log(`      ⚠️  ${warning}`);
    }

    // 恢复舱壁
    console.log('\n  恢复数据库舱壁...');
    isolator.recoverBulkhead('api-database');

    const finalReport = isolator.getHealthReport();
    console.log(`  恢复后状态: ${finalReport.overall}`);
    console.log();

    // ============================================
    // 示例 4: 实际场景 - API 服务保护
    // ============================================
    console.log('4️⃣ 实际场景：API 服务保护');
    console.log('─'.repeat(50));

    const apiPoolManager = createResourcePoolManager();
    const apiIsolator = createFaultIsolator(apiPoolManager, 'adaptive');

    // 为不同服务创建独立舱壁
    const userSvcBulkhead = apiPoolManager.createBulkhead({
      name: 'user-service',
      resourceType: 'thread',
      maxResources: 50,
      failureThreshold: 5
    });

    const orderSvcBulkhead = apiPoolManager.createBulkhead({
      name: 'order-service',
      resourceType: 'thread',
      maxResources: 30,
      failureThreshold: 3
    });

    const paymentSvcBulkhead = apiPoolManager.createBulkhead({
      name: 'payment-service',
      resourceType: 'thread',
      maxResources: 20,
      failureThreshold: 2
    });

    // 定义故障传播 (支付故障会影响订单)
    apiIsolator.defineFailurePropagation('payment-service', ['order-service']);

    console.log('  创建微服务舱壁:');
    console.log('    - user-service: 50 线程');
    console.log('    - order-service: 30 线程');
    console.log('    - payment-service: 20 线程');

    // 模拟支付服务高负载
    console.log('\n  模拟支付服务高负载...');
    async function simulatePaymentRequest(id: number) {
      try {
        const permit = await paymentSvcBulkhead.acquire(500);
        await new Promise(resolve => setTimeout(resolve, 50));
        permit.release();
        paymentSvcBulkhead.recordSuccess();
      } catch (error) {
        paymentSvcBulkhead.recordFailure();
      }
    }

    // 大量并发请求
    await Promise.all(Array.from({ length: 30 }, (_, i) => simulatePaymentRequest(i)));

    const paymentMetrics = paymentSvcBulkhead.getMetrics();
    console.log(`  支付服务状态: ${paymentMetrics.state}`);
    console.log(`  失败次数: ${paymentMetrics.totalFailures}`);
    console.log(`  拒绝次数: ${paymentMetrics.totalRejections}`);

    console.log('\n✅ 所有示例执行完成!');
    console.log('\n📋 功能总结:');
    console.log('  • 舱壁定义：Bulkhead 类，管理资源获取/释放');
    console.log('  • 资源池隔离：ResourcePoolManager，多舱壁管理');
    console.log('  • 故障隔离：FaultIsolator，级联故障预防');
    console.log('  • 工厂函数：createBulkhead, createResourcePoolManager, createFaultIsolator');
  })();
}
