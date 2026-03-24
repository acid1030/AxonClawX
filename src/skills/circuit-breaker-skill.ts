/**
 * Circuit Breaker Skill - 熔断保护技能
 * 
 * 功能:
 * 1. 熔断状态管理 (Closed → Open → Half-Open)
 * 2. 自动恢复机制
 * 3. 错误阈值控制
 * 
 * @author Axon
 * @version 1.0.0
 */

// ============================================================================
// 类型定义
// ============================================================================

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerOptions {
  /** 错误阈值 (达到此次数后熔断) */
  failureThreshold?: number;
  /** 熔断持续时间 (毫秒) */
  resetTimeout?: number;
  /** 半开状态最大测试请求数 */
  halfOpenMaxRequests?: number;
  /** 成功计数阈值 (半开状态下成功多少次后恢复) */
  successThreshold?: number;
}

export interface CircuitBreakerStats {
  state: CircuitState;
  failureCount: number;
  successCount: number;
  lastFailureTime?: number;
  lastSuccessTime?: number;
  nextRetryTime?: number;
  totalRequests: number;
  totalFailures: number;
  totalSuccesses: number;
}

export class CircuitBreakerError extends Error {
  constructor(message: string, public readonly state: CircuitState) {
    super(message);
    this.name = 'CircuitBreakerError';
  }
}

// ============================================================================
// 熔断器核心类
// ============================================================================

export class CircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime?: number;
  private lastSuccessTime?: number;
  private halfOpenRequests = 0;
  
  // 统计数据
  private totalRequests = 0;
  private totalFailures = 0;
  private totalSuccesses = 0;

  // 配置
  private readonly failureThreshold: number;
  private readonly resetTimeout: number;
  private readonly halfOpenMaxRequests: number;
  private readonly successThreshold: number;

  // 事件回调
  public onStateChange?: (from: CircuitState, to: CircuitState) => void;
  public onFailure?: (error: Error) => void;
  public onSuccess?: () => void;

  constructor(options: CircuitBreakerOptions = {}) {
    this.failureThreshold = options.failureThreshold ?? 5;
    this.resetTimeout = options.resetTimeout ?? 30000; // 30 秒
    this.halfOpenMaxRequests = options.halfOpenMaxRequests ?? 3;
    this.successThreshold = options.successThreshold ?? 2;
  }

  // ============================================================================
  // 核心方法
  // ============================================================================

  /**
   * 执行受保护的异步操作
   */
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    this.totalRequests++;

    // 检查是否允许请求
    if (!this.canExecute()) {
      throw new CircuitBreakerError(
        `Circuit is ${this.state}. Next retry at ${this.getNextRetryTime()}`,
        this.state
      );
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure(error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * 检查是否可以执行请求
   */
  canExecute(): boolean {
    switch (this.state) {
      case 'CLOSED':
        return true;
      
      case 'OPEN':
        // 检查是否已过恢复时间
        if (Date.now() >= (this.lastFailureTime || 0) + this.resetTimeout) {
          this.transitionTo('HALF_OPEN');
          this.halfOpenRequests = 0;
          return true;
        }
        return false;
      
      case 'HALF_OPEN':
        // 半开状态下限制请求数
        return this.halfOpenRequests < this.halfOpenMaxRequests;
      
      default:
        return false;
    }
  }

  /**
   * 记录成功
   */
  onSuccess(): void {
    this.successCount++;
    this.totalSuccesses++;
    this.lastSuccessTime = Date.now();

    if (this.state === 'HALF_OPEN') {
      this.halfOpenRequests++;
      
      // 半开状态下达到成功阈值 → 恢复
      if (this.successCount >= this.successThreshold) {
        this.transitionTo('CLOSED');
        this.resetCounters();
      }
    } else if (this.state === 'CLOSED') {
      // 连续成功时重置失败计数
      this.failureCount = 0;
    }

    this.onSuccess?.();
  }

  /**
   * 记录失败
   */
  onFailure(error: Error): void {
    this.failureCount++;
    this.totalFailures++;
    this.lastFailureTime = Date.now();
    this.successCount = 0; // 重置成功计数

    if (this.state === 'HALF_OPEN') {
      // 半开状态下失败 → 立即熔断
      this.transitionTo('OPEN');
    } else if (this.state === 'CLOSED') {
      // 闭合状态下达到阈值 → 熔断
      if (this.failureCount >= this.failureThreshold) {
        this.transitionTo('OPEN');
      }
    }

    this.onFailure?.(error);
  }

  // ============================================================================
  // 状态管理
  // ============================================================================

  private transitionTo(newState: CircuitState): void {
    if (this.state === newState) return;

    const oldState = this.state;
    this.state = newState;
    
    console.log(`[CircuitBreaker] State: ${oldState} → ${newState}`);
    this.onStateChange?.(oldState, newState);
  }

  private resetCounters(): void {
    this.failureCount = 0;
    this.successCount = 0;
    this.halfOpenRequests = 0;
  }

  // ============================================================================
  // 查询方法
  // ============================================================================

  getState(): CircuitState {
    // 检查是否需要从 OPEN 转移到 HALF_OPEN
    if (this.state === 'OPEN' && 
        Date.now() >= (this.lastFailureTime || 0) + this.resetTimeout) {
      this.transitionTo('HALF_OPEN');
      this.halfOpenRequests = 0;
    }
    return this.state;
  }

  getStats(): CircuitBreakerStats {
    return {
      state: this.getState(),
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
      nextRetryTime: this.getNextRetryTime(),
      totalRequests: this.totalRequests,
      totalFailures: this.totalFailures,
      totalSuccesses: this.totalSuccesses,
    };
  }

  private getNextRetryTime(): number | undefined {
    if (this.state !== 'OPEN' || !this.lastFailureTime) return undefined;
    return this.lastFailureTime + this.resetTimeout;
  }

  /**
   * 手动重置熔断器
   */
  reset(): void {
    this.transitionTo('CLOSED');
    this.resetCounters();
  }

  /**
   * 手动强制熔断
   */
  forceOpen(): void {
    this.transitionTo('OPEN');
    this.lastFailureTime = Date.now();
  }
}

// ============================================================================
// Skill 封装 (供其他 Agent 调用)
// ============================================================================

export interface CircuitBreakerSkill {
  /** 创建熔断器实例 */
  create(options?: CircuitBreakerOptions): CircuitBreaker;
  
  /** 执行受保护的操作 */
  protect<T>(
    breaker: CircuitBreaker,
    operation: () => Promise<T>,
    fallback?: () => Promise<T>
  ): Promise<T>;
  
  /** 获取状态 */
  getStatus(breaker: CircuitBreaker): CircuitBreakerStats;
  
  /** 重置熔断器 */
  reset(breaker: CircuitBreaker): void;
}

export const circuitBreakerSkill: CircuitBreakerSkill = {
  create(options?: CircuitBreakerOptions): CircuitBreaker {
    return new CircuitBreaker(options);
  },

  async protect<T>(
    breaker: CircuitBreaker,
    operation: () => Promise<T>,
    fallback?: () => Promise<T>
  ): Promise<T> {
    try {
      return await breaker.execute(operation);
    } catch (error) {
      if (fallback) {
        console.log('[CircuitBreaker] Using fallback');
        return fallback();
      }
      throw error;
    }
  },

  getStatus(breaker: CircuitBreaker): CircuitBreakerStats {
    return breaker.getStats();
  },

  reset(breaker: CircuitBreaker): void {
    breaker.reset();
  },
};

// ============================================================================
// 使用示例
// ============================================================================

/**
 * 示例 1: 基础用法
 */
export async function example1_BasicUsage() {
  const breaker = circuitBreakerSkill.create({
    failureThreshold: 3,      // 3 次失败后熔断
    resetTimeout: 10000,      // 10 秒后尝试恢复
    successThreshold: 2,      // 半开状态下 2 次成功后恢复
  });

  // 监听状态变化
  breaker.onStateChange = (from, to) => {
    console.log(`🔌 熔断状态: ${from} → ${to}`);
  };

  // 执行受保护的操作
  try {
    const result = await circuitBreakerSkill.protect(
      breaker,
      async () => {
        // 你的业务逻辑
        const response = await fetch('https://api.example.com/data');
        if (!response.ok) throw new Error('API Error');
        return response.json();
      },
      async () => {
        // 降级方案 (可选)
        return { cached: true, data: [] };
      }
    );
    console.log('✅ 成功:', result);
  } catch (error) {
    console.error('❌ 失败:', error);
  }

  // 查看状态
  const stats = circuitBreakerSkill.getStatus(breaker);
  console.log('📊 状态:', stats);
}

/**
 * 示例 2: API 调用保护
 */
export async function example2_APIProtection() {
  const apiBreaker = circuitBreakerSkill.create({
    failureThreshold: 5,
    resetTimeout: 30000,
  });

  async function callExternalAPI(endpoint: string) {
    return circuitBreakerSkill.protect(
      apiBreaker,
      async () => {
        const res = await fetch(`https://api.external.com/${endpoint}`);
        if (!res.ok) throw new Error(`API Error: ${res.status}`);
        return res.json();
      },
      async () => {
        // 降级：返回缓存数据或默认值
        console.warn(`⚠️ API ${endpoint} 不可用，使用降级方案`);
        return { error: 'Service temporarily unavailable', fallback: true };
      }
    );
  }

  // 使用
  const data = await callExternalAPI('users');
  console.log(data);
}

/**
 * 示例 3: 数据库连接保护
 */
export async function example3_DatabaseProtection() {
  const dbBreaker = circuitBreakerSkill.create({
    failureThreshold: 3,
    resetTimeout: 60000, // 1 分钟
  });

  async function queryDatabase(sql: string) {
    return circuitBreakerSkill.protect(
      dbBreaker,
      async () => {
        // 模拟数据库查询
        const conn = await getDatabaseConnection();
        return conn.query(sql);
      },
      async () => {
        // 降级：返回空结果或缓存
        return [];
      }
    );
  }
}

/**
 * 示例 4: 多实例管理
 */
export class CircuitBreakerManager {
  private breakers = new Map<string, CircuitBreaker>();

  getOrCreate(name: string, options?: CircuitBreakerOptions): CircuitBreaker {
    if (!this.breakers.has(name)) {
      this.breakers.set(name, circuitBreakerSkill.create(options));
    }
    return this.breakers.get(name)!;
  }

  getStatusAll(): Record<string, CircuitBreakerStats> {
    const result: Record<string, CircuitBreakerStats> = {};
    for (const [name, breaker] of this.breakers) {
      result[name] = circuitBreakerSkill.getStatus(breaker);
    }
    return result;
  }

  resetAll(): void {
    for (const breaker of this.breakers.values()) {
      circuitBreakerSkill.reset(breaker);
    }
  }
}

// 导出默认
export default circuitBreakerSkill;
