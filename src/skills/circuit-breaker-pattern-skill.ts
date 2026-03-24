/**
 * Circuit Breaker Pattern Skill - 熔断器模式增强版
 * 
 * 容错处理核心实现，基于熔断器模式保护系统免受级联故障影响
 * 
 * 功能:
 * 1. 熔断器定义 - 三态机 (CLOSED/OPEN/HALF_OPEN)
 * 2. 状态管理 - 自动状态转换与监控
 * 3. 故障恢复 - 智能恢复机制与降级策略
 * 
 * 设计模式:
 * - State Pattern (状态模式)
 * - Strategy Pattern (策略模式)
 * - Observer Pattern (观察者模式)
 * 
 * @author Axon
 * @version 2.0.0
 * @category Fault Tolerance
 */

// ============================================================================
// 类型定义
// ============================================================================

/**
 * 熔断器状态
 * - CLOSED: 闭合状态，正常执行请求
 * - OPEN: 断开状态，拒绝所有请求
 * - HALF_OPEN: 半开状态，允许有限请求测试恢复
 */
export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

/**
 * 失败策略类型
 */
export type FailurePolicy = 'COUNT_BASED' | 'PERCENTAGE_BASED' | 'TIME_BASED';

/**
 * 熔断器配置选项
 */
export interface CircuitBreakerConfig {
  /** 熔断器名称 (用于日志和监控) */
  name?: string;
  
  /** 失败阈值 (达到此次数后熔断) */
  failureThreshold?: number;
  
  /** 失败百分比阈值 (0-100) */
  failureRateThreshold?: number;
  
  /** 滑动窗口大小 (用于百分比计算) */
  slidingWindowSize?: number;
  
  /** 熔断持续时间 (毫秒) */
  resetTimeout?: number;
  
  /** 半开状态最大测试请求数 */
  halfOpenMaxRequests?: number;
  
  /** 成功阈值 (半开状态下成功多少次后恢复) */
  successThreshold?: number;
  
  /** 慢调用阈值 (毫秒)，超过此时间视为慢调用 */
  slowCallThreshold?: number;
  
  /** 慢调用是否计入失败 */
  slowCallFailure?: boolean;
  
  /** 失败策略类型 */
  failurePolicy?: FailurePolicy;
  
  /** 自动注册到全局管理器 */
  autoRegister?: boolean;
}

/**
 * 熔断器统计信息
 */
export interface CircuitBreakerStats {
  /** 当前状态 */
  state: CircuitState;
  /** 名称 */
  name: string;
  /** 连续失败次数 */
  failureCount: number;
  /** 连续成功次数 */
  successCount: number;
  /** 最后一次失败时间 */
  lastFailureTime?: number;
  /** 最后一次成功时间 */
  lastSuccessTime?: number;
  /** 下次重试时间 */
  nextRetryTime?: number;
  /** 总请求数 */
  totalRequests: number;
  /** 总失败数 */
  totalFailures: number;
  /** 总成功数 */
  totalSuccesses: number;
  /** 总慢调用数 */
  totalSlowCalls: number;
  /** 失败率 (百分比) */
  failureRate: number;
  /** 运行时长 (毫秒) */
  uptime: number;
}

/**
 * 熔断器事件
 */
export interface CircuitBreakerEvent {
  type: 'STATE_CHANGE' | 'FAILURE' | 'SUCCESS' | 'SLOW_CALL' | 'RESET';
  timestamp: number;
  fromState?: CircuitState;
  toState?: CircuitState;
  error?: Error;
  duration?: number;
}

/**
 * 事件监听器类型
 */
export type CircuitBreakerListener = (event: CircuitBreakerEvent) => void;

// ============================================================================
// 自定义错误类
// ============================================================================

/**
 * 熔断器异常
 */
export class CircuitBreakerError extends Error {
  constructor(
    message: string,
    public readonly state: CircuitState,
    public readonly nextRetryTime?: number
  ) {
    super(message);
    this.name = 'CircuitBreakerError';
  }
}

/**
 * 慢调用异常
 */
export class SlowCallError extends Error {
  constructor(
    message: string,
    public readonly duration: number,
    public readonly threshold: number
  ) {
    super(message);
    this.name = 'SlowCallError';
  }
}

// ============================================================================
// 滑动窗口实现 (用于百分比计算)
// ============================================================================

interface CallResult {
  success: boolean;
  slow: boolean;
  timestamp: number;
}

class SlidingWindow {
  private results: CallResult[] = [];
  private readonly size: number;

  constructor(size: number) {
    this.size = size;
  }

  record(success: boolean, slow: boolean): void {
    this.results.push({ success, slow, timestamp: Date.now() });
    if (this.results.length > this.size) {
      this.results.shift();
    }
  }

  getFailureRate(): number {
    if (this.results.length === 0) return 0;
    const failures = this.results.filter(r => !r.success).length;
    return (failures / this.results.length) * 100;
  }

  getSlowCallRate(): number {
    if (this.results.length === 0) return 0;
    const slowCalls = this.results.filter(r => r.slow).length;
    return (slowCalls / this.results.length) * 100;
  }

  reset(): void {
    this.results = [];
  }
}

// ============================================================================
// 熔断器核心类
// ============================================================================

export class CircuitBreaker {
  // 状态
  private state: CircuitState = 'CLOSED';
  private failureCount = 0;
  private successCount = 0;
  private halfOpenRequests = 0;
  
  // 时间戳
  private lastFailureTime?: number;
  private lastSuccessTime?: number;
  private createdAt: number;
  
  // 统计
  private totalRequests = 0;
  private totalFailures = 0;
  private totalSuccesses = 0;
  private totalSlowCalls = 0;
  
  // 滑动窗口
  private slidingWindow?: SlidingWindow;

  // 配置
  private readonly config: Required<CircuitBreakerConfig>;

  // 事件系统
  private listeners: Map<string, CircuitBreakerListener[]> = new Map();
  private eventHistory: CircuitBreakerEvent[] = [];

  constructor(config: CircuitBreakerConfig = {}) {
    this.createdAt = Date.now();
    this.config = {
      name: config.name ?? 'default',
      failureThreshold: config.failureThreshold ?? 5,
      failureRateThreshold: config.failureRateThreshold ?? 50,
      slidingWindowSize: config.slidingWindowSize ?? 10,
      resetTimeout: config.resetTimeout ?? 30000,
      halfOpenMaxRequests: config.halfOpenMaxRequests ?? 3,
      successThreshold: config.successThreshold ?? 2,
      slowCallThreshold: config.slowCallThreshold ?? 60000,
      slowCallFailure: config.slowCallFailure ?? false,
      failurePolicy: config.failurePolicy ?? 'COUNT_BASED',
      autoRegister: config.autoRegister ?? true,
    };

    // 初始化滑动窗口
    if (this.config.failurePolicy === 'PERCENTAGE_BASED') {
      this.slidingWindow = new SlidingWindow(this.config.slidingWindowSize);
    }

    // 自动注册到全局管理器
    if (this.config.autoRegister) {
      circuitBreakerManager.register(this.config.name, this);
    }

    console.log(`[CircuitBreaker] Created: ${this.config.name}`, this.config);
  }

  // ============================================================================
  // 核心执行方法
  // ============================================================================

  /**
   * 执行受保护的异步操作
   */
  async execute<T>(
    operation: () => Promise<T>,
    fallback?: () => Promise<T>
  ): Promise<T> {
    this.totalRequests++;
    const startTime = Date.now();

    // 检查是否允许请求
    if (!this.canExecute()) {
      const nextRetry = this.getNextRetryTime();
      this.emitEvent({
        type: 'STATE_CHANGE',
        timestamp: Date.now(),
        fromState: this.state,
        toState: this.state,
      });
      
      if (fallback) {
        console.warn(`[CircuitBreaker] ${this.config.name}: Using fallback (state=${this.state})`);
        return fallback();
      }
      
      throw new CircuitBreakerError(
        `Circuit ${this.config.name} is ${this.state}`,
        this.state,
        nextRetry
      );
    }

    if (this.state === 'HALF_OPEN') {
      this.halfOpenRequests++;
    }

    try {
      const result = await operation();
      const duration = Date.now() - startTime;
      
      // 检查是否为慢调用
      const isSlow = this.config.slowCallThreshold && 
                     duration > this.config.slowCallThreshold;
      
      if (isSlow) {
        this.totalSlowCalls++;
        this.handleSlowCall(duration);
      }
      
      this.handleSuccess(duration);
      return result;
      
    } catch (error) {
      const duration = Date.now() - startTime;
      this.handleFailure(error instanceof Error ? error : new Error(String(error)));
      
      if (fallback) {
        console.warn(`[CircuitBreaker] ${this.config.name}: Using fallback after failure`);
        return fallback();
      }
      
      throw error;
    }
  }

  /**
   * 检查是否可以执行请求
   */
  canExecute(): boolean {
    // 强制刷新状态 (检查是否需要从 OPEN 转移到 HALF_OPEN)
    this.getState();

    switch (this.state) {
      case 'CLOSED':
        return true;
      
      case 'OPEN':
        // 检查是否已过恢复时间
        const now = Date.now();
        const retryTime = (this.lastFailureTime || 0) + this.config.resetTimeout;
        if (now >= retryTime) {
          this.transitionTo('HALF_OPEN');
          this.halfOpenRequests = 0;
          return true;
        }
        return false;
      
      case 'HALF_OPEN':
        // 半开状态下限制请求数
        return this.halfOpenRequests < this.config.halfOpenMaxRequests;
      
      default:
        return false;
    }
  }

  // ============================================================================
  // 成功/失败处理
  // ============================================================================

  private handleSuccess(duration: number): void {
    this.successCount++;
    this.totalSuccesses++;
    this.lastSuccessTime = Date.now();

    // 记录到滑动窗口
    if (this.slidingWindow) {
      this.slidingWindow.record(true, duration > (this.config.slowCallThreshold || Infinity));
    }

    if (this.state === 'HALF_OPEN') {
      // 半开状态下达到成功阈值 → 恢复
      if (this.successCount >= this.config.successThreshold) {
        this.transitionTo('CLOSED');
        this.resetCounters();
      }
    } else if (this.state === 'CLOSED') {
      // 连续成功时重置失败计数
      this.failureCount = 0;
    }

    this.emitEvent({
      type: 'SUCCESS',
      timestamp: Date.now(),
      duration,
    });
  }

  private handleFailure(error: Error): void {
    this.failureCount++;
    this.totalFailures++;
    this.lastFailureTime = Date.now();
    this.successCount = 0;

    // 记录到滑动窗口
    if (this.slidingWindow) {
      this.slidingWindow.record(false, false);
    }

    if (this.state === 'HALF_OPEN') {
      // 半开状态下失败 → 立即熔断
      this.transitionTo('OPEN');
    } else if (this.state === 'CLOSED') {
      // 根据策略判断是否需要熔断
      if (this.shouldTrip()) {
        this.transitionTo('OPEN');
      }
    }

    this.emitEvent({
      type: 'FAILURE',
      timestamp: Date.now(),
      error,
    });
  }

  private handleSlowCall(duration: number): void {
    this.emitEvent({
      type: 'SLOW_CALL',
      timestamp: Date.now(),
      duration,
    });

    if (this.config.slowCallFailure && this.state === 'CLOSED') {
      this.failureCount++;
      if (this.shouldTrip()) {
        this.transitionTo('OPEN');
      }
    }
  }

  // ============================================================================
  // 熔断判断逻辑
  // ============================================================================

  private shouldTrip(): boolean {
    switch (this.config.failurePolicy) {
      case 'COUNT_BASED':
        return this.failureCount >= this.config.failureThreshold;
      
      case 'PERCENTAGE_BASED':
        if (!this.slidingWindow) return false;
        return this.slidingWindow.getFailureRate() >= this.config.failureRateThreshold;
      
      case 'TIME_BASED':
        // 基于时间的策略 (例如：1 分钟内失败 N 次)
        // 可根据需要扩展实现
        return false;
      
      default:
        return false;
    }
  }

  // ============================================================================
  // 状态管理
  // ============================================================================

  private transitionTo(newState: CircuitState): void {
    if (this.state === newState) return;

    const oldState = this.state;
    this.state = newState;
    
    console.log(`[CircuitBreaker] ${this.config.name}: ${oldState} → ${newState}`);
    
    this.emitEvent({
      type: 'STATE_CHANGE',
      timestamp: Date.now(),
      fromState: oldState,
      toState: newState,
    });
  }

  private resetCounters(): void {
    this.failureCount = 0;
    this.successCount = 0;
    this.halfOpenRequests = 0;
    this.slidingWindow?.reset();
  }

  // ============================================================================
  // 查询方法
  // ============================================================================

  getState(): CircuitState {
    // 检查是否需要从 OPEN 转移到 HALF_OPEN
    if (this.state === 'OPEN' && 
        Date.now() >= (this.lastFailureTime || 0) + this.config.resetTimeout) {
      this.transitionTo('HALF_OPEN');
      this.halfOpenRequests = 0;
    }
    return this.state;
  }

  getStats(): CircuitBreakerStats {
    const uptime = Date.now() - this.createdAt;
    const failureRate = this.slidingWindow 
      ? this.slidingWindow.getFailureRate()
      : this.totalRequests > 0 
        ? (this.totalFailures / this.totalRequests) * 100 
        : 0;

    return {
      state: this.getState(),
      name: this.config.name,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
      nextRetryTime: this.getNextRetryTime(),
      totalRequests: this.totalRequests,
      totalFailures: this.totalFailures,
      totalSuccesses: this.totalSuccesses,
      totalSlowCalls: this.totalSlowCalls,
      failureRate,
      uptime,
    };
  }

  private getNextRetryTime(): number | undefined {
    if (this.state !== 'OPEN' || !this.lastFailureTime) return undefined;
    return this.lastFailureTime + this.config.resetTimeout;
  }

  /**
   * 手动重置熔断器
   */
  reset(): void {
    const oldState = this.state;
    this.transitionTo('CLOSED');
    this.resetCounters();
    
    this.emitEvent({
      type: 'RESET',
      timestamp: Date.now(),
      fromState: oldState,
      toState: 'CLOSED',
    });
  }

  /**
   * 手动强制熔断
   */
  forceOpen(): void {
    this.transitionTo('OPEN');
    this.lastFailureTime = Date.now();
  }

  /**
   * 强制关闭 (恢复正常)
   */
  forceClose(): void {
    this.transitionTo('CLOSED');
    this.resetCounters();
  }

  // ============================================================================
  // 事件系统
  // ============================================================================

  on(eventType: string, listener: CircuitBreakerListener): void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, []);
    }
    this.listeners.get(eventType)!.push(listener);
  }

  off(eventType: string, listener: CircuitBreakerListener): void {
    const list = this.listeners.get(eventType);
    if (list) {
      const index = list.indexOf(listener);
      if (index > -1) {
        list.splice(index, 1);
      }
    }
  }

  private emitEvent(event: CircuitBreakerEvent): void {
    // 记录事件历史 (保留最近 100 条)
    this.eventHistory.push(event);
    if (this.eventHistory.length > 100) {
      this.eventHistory.shift();
    }

    // 通知监听器
    const list = this.listeners.get(event.type) || [];
    list.forEach(listener => {
      try {
        listener(event);
      } catch (err) {
        console.error(`[CircuitBreaker] Event listener error:`, err);
      }
    });

    // 通用事件监听器
    const allListeners = this.listeners.get('*') || [];
    allListeners.forEach(listener => listener(event));
  }

  getEventHistory(limit = 10): CircuitBreakerEvent[] {
    return this.eventHistory.slice(-limit);
  }
}

// ============================================================================
// 全局熔断器管理器
// ============================================================================

export class CircuitBreakerManager {
  private breakers = new Map<string, CircuitBreaker>();
  private static instance: CircuitBreakerManager;

  static getInstance(): CircuitBreakerManager {
    if (!CircuitBreakerManager.instance) {
      CircuitBreakerManager.instance = new CircuitBreakerManager();
    }
    return CircuitBreakerManager.instance;
  }

  register(name: string, breaker: CircuitBreaker): void {
    if (this.breakers.has(name)) {
      console.warn(`[CircuitBreakerManager] Breaker "${name}" already registered, overwriting`);
    }
    this.breakers.set(name, breaker);
  }

  get(name: string): CircuitBreaker | undefined {
    return this.breakers.get(name);
  }

  getOrCreate(name: string, config?: CircuitBreakerConfig): CircuitBreaker {
    const existing = this.breakers.get(name);
    if (existing) return existing;
    
    const breaker = new CircuitBreaker({ ...config, name, autoRegister: false });
    this.register(name, breaker);
    return breaker;
  }

  getStatusAll(): Record<string, CircuitBreakerStats> {
    const result: Record<string, CircuitBreakerStats> = {};
    for (const [name, breaker] of this.breakers) {
      result[name] = breaker.getStats();
    }
    return result;
  }

  resetAll(): void {
    for (const breaker of this.breakers.values()) {
      breaker.reset();
    }
  }

  reset(name: string): void {
    this.breakers.get(name)?.reset();
  }

  getAllStats(): {
    total: number;
    closed: number;
    open: number;
    halfOpen: number;
    details: Record<string, CircuitBreakerStats>;
  } {
    const details = this.getStatusAll();
    return {
      total: this.breakers.size,
      closed: Object.values(details).filter(s => s.state === 'CLOSED').length,
      open: Object.values(details).filter(s => s.state === 'OPEN').length,
      halfOpen: Object.values(details).filter(s => s.state === 'HALF_OPEN').length,
      details,
    };
  }
}

// 全局管理器实例
const circuitBreakerManager = CircuitBreakerManager.getInstance();

// ============================================================================
// Skill 接口封装
// ============================================================================

export interface CircuitBreakerPatternSkill {
  /** 创建熔断器实例 */
  create(config?: CircuitBreakerConfig): CircuitBreaker;
  
  /** 获取或创建熔断器 */
  getOrCreate(name: string, config?: CircuitBreakerConfig): CircuitBreaker;
  
  /** 执行受保护的操作 (带降级) */
  protect<T>(
    breaker: CircuitBreaker,
    operation: () => Promise<T>,
    fallback?: () => Promise<T>
  ): Promise<T>;
  
  /** 获取状态 */
  getStatus(breaker: CircuitBreaker): CircuitBreakerStats;
  
  /** 获取所有熔断器状态 */
  getAllStatus(): ReturnType<typeof circuitBreakerManager.getAllStats>;
  
  /** 重置熔断器 */
  reset(breaker: CircuitBreaker): void;
  
  /** 重置所有熔断器 */
  resetAll(): void;
  
  /** 获取全局管理器 */
  getManager(): CircuitBreakerManager;
}

export const circuitBreakerPatternSkill: CircuitBreakerPatternSkill = {
  create(config?: CircuitBreakerConfig): CircuitBreaker {
    return new CircuitBreaker(config);
  },

  getOrCreate(name: string, config?: CircuitBreakerConfig): CircuitBreaker {
    return circuitBreakerManager.getOrCreate(name, config);
  },

  async protect<T>(
    breaker: CircuitBreaker,
    operation: () => Promise<T>,
    fallback?: () => Promise<T>
  ): Promise<T> {
    return breaker.execute(operation, fallback);
  },

  getStatus(breaker: CircuitBreaker): CircuitBreakerStats {
    return breaker.getStats();
  },

  getAllStatus(): ReturnType<typeof circuitBreakerManager.getAllStats> {
    return circuitBreakerManager.getAllStats();
  },

  reset(breaker: CircuitBreaker): void {
    breaker.reset();
  },

  resetAll(): void {
    circuitBreakerManager.resetAll();
  },

  getManager(): CircuitBreakerManager {
    return circuitBreakerManager;
  },
};

// ============================================================================
// 使用示例
// ============================================================================

/**
 * 示例 1: 基础用法 - API 调用保护
 */
export async function example1_BasicAPIProtection() {
  console.log('\n=== 示例 1: 基础 API 保护 ===\n');
  
  const apiBreaker = circuitBreakerPatternSkill.create({
    name: 'external-api',
    failureThreshold: 3,
    resetTimeout: 10000,
    successThreshold: 2,
  });

  // 监听状态变化
  apiBreaker.on('STATE_CHANGE', (event) => {
    console.log(`🔌 [${event.timestamp}] 状态变化: ${event.fromState} → ${event.toState}`);
  });

  // 执行受保护的 API 调用
  async function callAPI(endpoint: string) {
    return circuitBreakerPatternSkill.protect(
      apiBreaker,
      async () => {
        // 模拟 API 调用
        console.log(`📡 调用 API: ${endpoint}`);
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // 模拟随机失败
        if (Math.random() < 0.3) {
          throw new Error('API Timeout');
        }
        
        return { data: 'success', endpoint };
      },
      async () => {
        // 降级方案
        console.log('⚠️ 使用降级方案');
        return { data: 'cached', fallback: true };
      }
    );
  }

  // 测试多次调用
  for (let i = 0; i < 5; i++) {
    try {
      const result = await callAPI('/users');
      console.log(`✅ 请求 ${i + 1}:`, result);
    } catch (error) {
      console.error(`❌ 请求 ${i + 1}:`, (error as Error).message);
    }
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  // 查看状态
  const stats = circuitBreakerPatternSkill.getStatus(apiBreaker);
  console.log('\n📊 最终状态:', JSON.stringify(stats, null, 2));
}

/**
 * 示例 2: 百分比策略 - 基于失败率的熔断
 */
export async function example2_PercentageBasedStrategy() {
  console.log('\n=== 示例 2: 百分比策略 ===\n');
  
  const breaker = circuitBreakerPatternSkill.create({
    name: 'percentage-test',
    failurePolicy: 'PERCENTAGE_BASED',
    failureRateThreshold: 50, // 失败率超过 50% 熔断
    slidingWindowSize: 10,    // 滑动窗口大小
    resetTimeout: 5000,
  });

  // 模拟请求
  for (let i = 0; i < 15; i++) {
    try {
      await breaker.execute(async () => {
        // 模拟 60% 失败率
        if (Math.random() < 0.6) {
          throw new Error('Random failure');
        }
        return 'success';
      });
      console.log(`✅ 请求 ${i + 1}: 成功`);
    } catch (error) {
      console.error(`❌ 请求 ${i + 1}:`, (error as Error).message);
    }
    
    const stats = breaker.getStats();
    console.log(`   状态: ${stats.state}, 失败率: ${stats.failureRate.toFixed(1)}%`);
    
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}

/**
 * 示例 3: 慢调用检测
 */
export async function example3_SlowCallDetection() {
  console.log('\n=== 示例 3: 慢调用检测 ===\n');
  
  const breaker = circuitBreakerPatternSkill.create({
    name: 'slow-call-test',
    slowCallThreshold: 500, // 超过 500ms 视为慢调用
    slowCallFailure: true,  // 慢调用计入失败
    failureThreshold: 3,
  });

  breaker.on('SLOW_CALL', (event) => {
    console.log(`🐌 慢调用检测: ${event.duration}ms (阈值：${breaker.getStats().name})`);
  });

  // 模拟不同速度的请求
  const delays = [100, 300, 600, 200, 800, 100, 900];
  
  for (let i = 0; i < delays.length; i++) {
    try {
      await breaker.execute(async () => {
        await new Promise(resolve => setTimeout(resolve, delays[i]));
        return 'done';
      });
      console.log(`✅ 请求 ${i + 1}: ${delays[i]}ms`);
    } catch (error) {
      console.error(`❌ 请求 ${i + 1}:`, (error as Error).message);
    }
  }
}

/**
 * 示例 4: 多实例管理
 */
export async function example4_MultiInstanceManagement() {
  console.log('\n=== 示例 4: 多实例管理 ===\n');
  
  const manager = circuitBreakerPatternSkill.getManager();
  
  // 创建多个熔断器
  const apiBreaker = manager.getOrCreate('api-service', {
    failureThreshold: 5,
    resetTimeout: 30000,
  });
  
  const dbBreaker = manager.getOrCreate('database', {
    failureThreshold: 3,
    resetTimeout: 60000,
  });
  
  const cacheBreaker = manager.getOrCreate('cache', {
    failureThreshold: 10,
    resetTimeout: 15000,
  });

  // 查看所有状态
  const allStats = manager.getAllStats();
  console.log('📊 熔断器概览:');
  console.log(`   总数：${allStats.total}`);
  console.log(`   闭合：${allStats.closed}`);
  console.log(`   断开：${allStats.open}`);
  console.log(`   半开：${allStats.halfOpen}`);
  
  // 重置所有
  // manager.resetAll();
}

/**
 * 示例 5: 数据库连接保护
 */
export async function example5_DatabaseProtection() {
  console.log('\n=== 示例 5: 数据库连接保护 ===\n');
  
  const dbBreaker = circuitBreakerPatternSkill.create({
    name: 'database',
    failureThreshold: 3,
    resetTimeout: 60000,
    failurePolicy: 'COUNT_BASED',
  });

  async function queryDatabase(sql: string) {
    return circuitBreakerPatternSkill.protect(
      dbBreaker,
      async () => {
        // 模拟数据库查询
        console.log(`🗄️  执行 SQL: ${sql}`);
        await new Promise(resolve => setTimeout(resolve, 50));
        
        // 模拟连接失败
        if (Math.random() < 0.2) {
          throw new Error('Database connection failed');
        }
        
        return [{ id: 1, name: 'test' }];
      },
      async () => {
        // 降级：返回缓存或空结果
        console.warn('⚠️ 数据库不可用，返回空结果');
        return [];
      }
    );
  }

  // 测试
  for (let i = 0; i < 5; i++) {
    try {
      const result = await queryDatabase('SELECT * FROM users');
      console.log(`✅ 查询 ${i + 1}:`, result);
    } catch (error) {
      console.error(`❌ 查询 ${i + 1}:`, (error as Error).message);
    }
  }
}

/**
 * 示例 6: 事件监听与监控
 */
export async function example6_EventMonitoring() {
  console.log('\n=== 示例 6: 事件监听与监控 ===\n');
  
  const breaker = circuitBreakerPatternSkill.create({
    name: 'monitored-service',
    failureThreshold: 3,
    resetTimeout: 5000,
  });

  // 监听所有事件
  breaker.on('*', (event) => {
    console.log(`📢 [${event.type}]`, {
      timestamp: new Date(event.timestamp).toISOString(),
      state: event.fromState ? `${event.fromState}→${event.toState}` : undefined,
      error: event.error?.message,
      duration: event.duration ? `${event.duration}ms` : undefined,
    });
  });

  // 模拟操作
  for (let i = 0; i < 8; i++) {
    try {
      await breaker.execute(async () => {
        if (Math.random() < 0.4) throw new Error('Random error');
        return 'ok';
      });
    } catch (error) {
      // 忽略
    }
    await new Promise(resolve => setTimeout(resolve, 300));
  }

  // 查看事件历史
  console.log('\n📜 事件历史:');
  breaker.getEventHistory(5).forEach(event => {
    console.log(`   - ${event.type} @ ${new Date(event.timestamp).toISOString()}`);
  });
}

// ============================================================================
// 导出默认
// ============================================================================

export default circuitBreakerPatternSkill;

/**
 * 快速开始指南:
 * 
 * 1. 导入:
 *    import circuitBreakerPatternSkill from './skills/circuit-breaker-pattern-skill';
 * 
 * 2. 创建熔断器:
 *    const breaker = circuitBreakerPatternSkill.create({
 *      name: 'my-service',
 *      failureThreshold: 5,
 *      resetTimeout: 30000,
 *    });
 * 
 * 3. 保护操作:
 *    const result = await circuitBreakerPatternSkill.protect(
 *      breaker,
 *      async () => riskyOperation(),
 *      async () => fallbackOperation()
 *    );
 * 
 * 4. 监控状态:
 *    const stats = circuitBreakerPatternSkill.getStatus(breaker);
 *    console.log(stats.state); // 'CLOSED' | 'OPEN' | 'HALF_OPEN'
 */
