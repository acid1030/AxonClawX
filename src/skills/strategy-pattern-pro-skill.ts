/**
 * Strategy Pattern Pro Skill - Advanced Algorithm Switcher with Composition
 * 
 * 功能:
 * 1. 策略定义 - 定义统一的策略接口和元数据
 * 2. 策略切换 - 支持动态切换、条件切换、链式切换
 * 3. 策略组合 - 支持策略管道、并行执行、策略链
 * 
 * @author Axon (KAEL Engineering)
 * @version 2.0.0
 * @since 2026-03-13
 */

// ============== 核心类型定义 ==============

/**
 * 策略优先级 (用于策略组合)
 */
export enum StrategyPriority {
  LOW = 0,
  NORMAL = 5,
  HIGH = 10,
  CRITICAL = 100
}

/**
 * 策略执行模式
 */
export enum ExecutionMode {
  SINGLE = 'single',           // 单个策略
  PIPELINE = 'pipeline',       // 管道模式 (顺序执行)
  PARALLEL = 'parallel',       // 并行模式
  CHAIN = 'chain',             // 链式模式 (前一个结果作为下一个输入)
  FALLBACK = 'fallback'        // 降级模式 (失败时尝试下一个)
}

/**
 * 策略执行上下文
 */
export interface StrategyContext<T = any> {
  data: T;
  options?: Record<string, any>;
  metadata?: Record<string, any>;
  previousResults?: StrategyResult[];
}

/**
 * 策略执行结果
 */
export interface StrategyResult<T = any> {
  success: boolean;
  data: T;
  strategyName: string;
  executionTime?: number;
  error?: string;
  metadata?: Record<string, any>;
}

/**
 * 策略接口 - 所有算法策略必须实现此接口
 */
export interface IStrategy<TInput = any, TOutput = any> {
  /**
   * 策略名称 (唯一标识)
   */
  readonly name: string;

  /**
   * 策略描述
   */
  readonly description: string;

  /**
   * 策略版本
   */
  readonly version: string;

  /**
   * 策略优先级
   */
  readonly priority?: StrategyPriority;

  /**
   * 策略标签 (用于分类和筛选)
   */
  readonly tags?: string[];

  /**
   * 执行策略
   * @param context 执行上下文
   * @returns 执行结果
   */
  execute(context: StrategyContext<TInput>): Promise<StrategyResult<TOutput>>;

  /**
   * 验证输入是否适合此策略
   * @param context 执行上下文
   * @returns 是否适用
   */
  validate?(context: StrategyContext<TInput>): boolean;

  /**
   * 策略前置处理
   * @param context 执行上下文
   * @returns 处理后的上下文
   */
  beforeExecute?(context: StrategyContext<TInput>): StrategyContext<TInput>;

  /**
   * 策略后置处理
   * @param result 执行结果
   * @returns 处理后的结果
   */
  afterExecute?(result: StrategyResult<TOutput>): StrategyResult<TOutput>;
}

// ============== 策略组合器 ==============

/**
 * 策略组合配置
 */
export interface CompositionConfig {
  mode: ExecutionMode;
  strategies: string[];
  stopOnError?: boolean;
  timeout?: number;
}

/**
 * 策略组合器 - 支持多种组合模式
 */
export class StrategyComposer {
  private registry: StrategyRegistryPro;

  constructor(registry: StrategyRegistryPro) {
    this.registry = registry;
  }

  /**
   * 创建策略管道 (顺序执行，每个策略的输入是前一个的输出)
   * @param strategyNames 策略名称列表
   * @returns 组合策略
   */
  createPipeline<T = any>(strategyNames: string[]): IStrategy<T, T> {
    return new PipelineStrategy(this.registry, strategyNames);
  }

  /**
   * 创建并行策略 (同时执行多个策略，返回所有结果)
   * @param strategyNames 策略名称列表
   * @returns 组合策略
   */
  createParallel<T = any>(strategyNames: string[]): IStrategy<T, StrategyResult<T>[]> {
    return new ParallelStrategy(this.registry, strategyNames);
  }

  /**
   * 创建链式策略 (类似管道，但可动态决定下一个策略)
   * @param strategyNames 策略名称列表
   * @param chainFn 链式决策函数
   * @returns 组合策略
   */
  createChain<T = any>(
    strategyNames: string[],
    chainFn?: (result: StrategyResult<T>, context: StrategyContext<T>) => string | null
  ): IStrategy<T, T> {
    return new ChainStrategy(this.registry, strategyNames, chainFn);
  }

  /**
   * 创建降级策略 (失败时自动尝试下一个)
   * @param strategyNames 策略名称列表 (按优先级排序)
   * @returns 组合策略
   */
  createFallback<T = any>(strategyNames: string[]): IStrategy<T, T> {
    return new FallbackStrategy(this.registry, strategyNames);
  }
}

// ============== 组合策略实现 ==============

/**
 * 管道策略 - 顺序执行，数据流传递
 */
class PipelineStrategy<T = any> implements IStrategy<T, T> {
  readonly name = 'pipeline';
  readonly description = '管道策略 - 顺序执行多个策略';
  readonly version = '1.0.0';
  readonly tags = ['composition', 'pipeline'];

  constructor(
    private registry: StrategyRegistryPro,
    private strategyNames: string[]
  ) {}

  async execute(context: StrategyContext<T>): Promise<StrategyResult<T>> {
    const startTime = Date.now();
    let currentData = context.data;
    const results: StrategyResult[] = [];

    for (const name of this.strategyNames) {
      const strategy = this.registry.getStrategy(name);
      if (!strategy) {
        return {
          success: false,
          data: currentData,
          strategyName: this.name,
          error: `策略 "${name}" 不存在`,
          executionTime: Date.now() - startTime
        };
      }

      const result = await strategy.execute({ ...context, data: currentData });
      results.push(result);

      if (!result.success) {
        return {
          success: false,
          data: currentData,
          strategyName: this.name,
          error: `管道中策略 "${name}" 执行失败: ${result.error}`,
          executionTime: Date.now() - startTime,
          metadata: { pipelineResults: results }
        };
      }

      currentData = result.data;
    }

    return {
      success: true,
      data: currentData,
      strategyName: this.name,
      executionTime: Date.now() - startTime,
      metadata: { pipelineResults: results }
    };
  }
}

/**
 * 并行策略 - 同时执行多个策略
 */
class ParallelStrategy<T = any> implements IStrategy<T, StrategyResult<T>[]> {
  readonly name = 'parallel';
  readonly description = '并行策略 - 同时执行多个策略';
  readonly version = '1.0.0';
  readonly tags = ['composition', 'parallel'];

  constructor(
    private registry: StrategyRegistryPro,
    private strategyNames: string[]
  ) {}

  async execute(context: StrategyContext<T>): Promise<StrategyResult<StrategyResult<T>[]>> {
    const startTime = Date.now();
    const promises = this.strategyNames.map(async (name) => {
      const strategy = this.registry.getStrategy(name);
      if (!strategy) {
        return {
          success: false,
          data: context.data,
          strategyName: name,
          error: `策略 "${name}" 不存在`
        };
      }

      const stratStartTime = Date.now();
      try {
        const result = await strategy.execute(context);
        return { ...result, executionTime: Date.now() - stratStartTime };
      } catch (error) {
        return {
          success: false,
          data: context.data,
          strategyName: name,
          error: error instanceof Error ? error.message : '未知错误',
          executionTime: Date.now() - stratStartTime
        };
      }
    });

    const results = await Promise.all(promises);

    return {
      success: true,
      data: results,
      strategyName: this.name,
      executionTime: Date.now() - startTime,
      metadata: { totalStrategies: results.length, successful: results.filter(r => r.success).length }
    };
  }
}

/**
 * 链式策略 - 可动态决定下一个策略
 */
class ChainStrategy<T = any> implements IStrategy<T, T> {
  readonly name = 'chain';
  readonly description = '链式策略 - 动态决定执行路径';
  readonly version = '1.0.0';
  readonly tags = ['composition', 'chain'];

  constructor(
    private registry: StrategyRegistryPro,
    private strategyNames: string[],
    private chainFn?: (result: StrategyResult<T>, context: StrategyContext<T>) => string | null
  ) {}

  async execute(context: StrategyContext<T>): Promise<StrategyResult<T>> {
    const startTime = Date.now();
    let currentData = context.data;
    const executedChains: string[] = [];

    for (const name of this.strategyNames) {
      if (executedChains.includes(name)) continue;

      const strategy = this.registry.getStrategy(name);
      if (!strategy) {
        return {
          success: false,
          data: currentData,
          strategyName: this.name,
          error: `策略 "${name}" 不存在`,
          executionTime: Date.now() - startTime
        };
      }

      const result = await strategy.execute({ ...context, data: currentData });
      currentData = result.data;
      executedChains.push(name);

      // 使用自定义链式函数决定下一个策略
      if (this.chainFn) {
        const nextStrategy = this.chainFn(result, { ...context, data: currentData });
        if (!nextStrategy) break;
        if (!this.strategyNames.includes(nextStrategy)) {
          return {
            success: false,
            data: currentData,
            strategyName: this.name,
            error: `链式函数返回未知策略: ${nextStrategy}`,
            executionTime: Date.now() - startTime
          };
        }
      }
    }

    return {
      success: true,
      data: currentData,
      strategyName: this.name,
      executionTime: Date.now() - startTime,
      metadata: { executedChains: executedChains }
    };
  }
}

/**
 * 降级策略 - 失败时自动尝试下一个
 */
class FallbackStrategy<T = any> implements IStrategy<T, T> {
  readonly name = 'fallback';
  readonly description = '降级策略 - 失败时尝试下一个策略';
  readonly version = '1.0.0';
  readonly tags = ['composition', 'fallback', 'resilience'];

  constructor(
    private registry: StrategyRegistryPro,
    private strategyNames: string[]
  ) {}

  async execute(context: StrategyContext<T>): Promise<StrategyResult<T>> {
    const startTime = Date.now();
    const attempts: Array<{ name: string; success: boolean; error?: string }> = [];

    for (const name of this.strategyNames) {
      const strategy = this.registry.getStrategy(name);
      if (!strategy) {
        attempts.push({ name, success: false, error: '策略不存在' });
        continue;
      }

      try {
        const result = await strategy.execute(context);
        attempts.push({ name, success: result.success, error: result.error });

        if (result.success) {
          return {
            ...result,
            strategyName: this.name,
            executionTime: Date.now() - startTime,
            metadata: { attempts, successfulStrategy: name }
          };
        }
      } catch (error) {
        attempts.push({
          name,
          success: false,
          error: error instanceof Error ? error.message : '未知错误'
        });
      }
    }

    return {
      success: false,
      data: context.data,
      strategyName: this.name,
      error: `所有 ${this.strategyNames.length} 个策略都执行失败`,
      executionTime: Date.now() - startTime,
      metadata: { attempts }
    };
  }
}

// ============== 增强版策略注册表 ==============

/**
 * 策略元数据
 */
export interface StrategyMeta {
  name: string;
  description: string;
  version: string;
  priority: StrategyPriority;
  tags: string[];
  isActive: boolean;
  executionCount: number;
  lastExecutionTime?: number;
  avgExecutionTime?: number;
}

/**
 * 策略执行统计
 */
export interface StrategyStats {
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  avgExecutionTime: number;
  minExecutionTime: number;
  maxExecutionTime: number;
}

/**
 * 策略注册表 Pro - 单例模式，增强功能
 */
export class StrategyRegistryPro {
  private static instance: StrategyRegistryPro;
  private strategies: Map<string, IStrategy> = new Map();
  private activeStrategy: string | null = null;
  private executionStats: Map<string, StrategyStats> = new Map();
  private composer: StrategyComposer;

  private constructor() {
    this.composer = new StrategyComposer(this);
  }

  /**
   * 获取单例实例
   */
  public static getInstance(): StrategyRegistryPro {
    if (!StrategyRegistryPro.instance) {
      StrategyRegistryPro.instance = new StrategyRegistryPro();
    }
    return StrategyRegistryPro.instance;
  }

  /**
   * 获取策略组合器
   */
  public getComposer(): StrategyComposer {
    return this.composer;
  }

  /**
   * 注册策略
   * @param strategy 策略实例
   * @throws Error 如果策略名已存在
   */
  public register(strategy: IStrategy): void {
    if (this.strategies.has(strategy.name)) {
      throw new Error(`策略 "${strategy.name}" 已注册`);
    }
    this.strategies.set(strategy.name, strategy);
    this.executionStats.set(strategy.name, {
      totalExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      avgExecutionTime: 0,
      minExecutionTime: Infinity,
      maxExecutionTime: 0
    });
    console.log(`[StrategyRegistryPro] 已注册策略: ${strategy.name} v${strategy.version}`);
  }

  /**
   * 注销策略
   * @param name 策略名称
   * @returns 是否成功
   */
  public unregister(name: string): boolean {
    if (this.activeStrategy === name) {
      this.activeStrategy = null;
    }
    this.executionStats.delete(name);
    return this.strategies.delete(name);
  }

  /**
   * 获取策略
   * @param name 策略名称
   * @returns 策略实例或 undefined
   */
  public getStrategy(name: string): IStrategy | undefined {
    return this.strategies.get(name);
  }

  /**
   * 设置活跃策略
   * @param name 策略名称
   * @throws Error 如果策略不存在
   */
  public setActiveStrategy(name: string): void {
    if (!this.strategies.has(name)) {
      throw new Error(`策略 "${name}" 不存在`);
    }
    this.activeStrategy = name;
    console.log(`[StrategyRegistryPro] 活跃策略已切换: ${name}`);
  }

  /**
   * 获取活跃策略
   * @returns 活跃策略名称或 null
   */
  public getActiveStrategy(): string | null {
    return this.activeStrategy;
  }

  /**
   * 根据标签筛选策略
   * @param tag 标签
   * @returns 策略列表
   */
  public getStrategiesByTag(tag: string): IStrategy[] {
    return Array.from(this.strategies.values()).filter(
      s => s.tags?.includes(tag)
    );
  }

  /**
   * 根据优先级排序策略
   * @returns 排序后的策略列表
   */
  public getStrategiesByPriority(): IStrategy[] {
    return Array.from(this.strategies.values()).sort(
      (a, b) => (b.priority ?? StrategyPriority.NORMAL) - (a.priority ?? StrategyPriority.NORMAL)
    );
  }

  /**
   * 执行活跃策略
   * @param context 执行上下文
   * @returns 执行结果
   */
  public async executeActive<T = any>(context: StrategyContext<T>): Promise<StrategyResult<T>> {
    if (!this.activeStrategy) {
      return {
        success: false,
        data: context.data as T,
        strategyName: 'NONE',
        error: '未设置活跃策略'
      };
    }

    return this.executeStrategy(this.activeStrategy, context);
  }

  /**
   * 执行指定策略
   * @param name 策略名称
   * @param context 执行上下文
   * @returns 执行结果
   */
  public async executeStrategy<T = any>(name: string, context: StrategyContext<T>): Promise<StrategyResult<T>> {
    const strategy = this.strategies.get(name);
    if (!strategy) {
      return {
        success: false,
        data: context.data as T,
        strategyName: name,
        error: `策略 "${name}" 不存在`
      };
    }

    // 验证输入
    if (strategy.validate && !strategy.validate(context)) {
      return {
        success: false,
        data: context.data as T,
        strategyName: name,
        error: '输入验证失败'
      };
    }

    // 前置处理
    let processedContext = context;
    if (strategy.beforeExecute) {
      processedContext = strategy.beforeExecute(context);
    }

    // 执行策略
    const startTime = Date.now();
    try {
      let result = await strategy.execute(processedContext);
      const executionTime = Date.now() - startTime;

      // 后置处理
      if (strategy.afterExecute) {
        result = strategy.afterExecute(result);
      }

      // 更新统计
      this.updateStats(name, executionTime, result.success);

      return {
        ...result,
        executionTime
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.updateStats(name, executionTime, false);
      return {
        success: false,
        data: context.data as T,
        strategyName: name,
        executionTime,
        error: error instanceof Error ? error.message : '未知错误'
      };
    }
  }

  /**
   * 更新执行统计
   */
  private updateStats(name: string, executionTime: number, success: boolean): void {
    const stats = this.executionStats.get(name);
    if (!stats) return;

    stats.totalExecutions++;
    if (success) {
      stats.successfulExecutions++;
    } else {
      stats.failedExecutions++;
    }

    // 更新平均执行时间
    stats.avgExecutionTime = (
      (stats.avgExecutionTime * (stats.totalExecutions - 1)) + executionTime
    ) / stats.totalExecutions;

    // 更新最小/最大执行时间
    stats.minExecutionTime = Math.min(stats.minExecutionTime, executionTime);
    stats.maxExecutionTime = Math.max(stats.maxExecutionTime, executionTime);
  }

  /**
   * 获取策略统计
   * @param name 策略名称
   * @returns 统计数据
   */
  public getStats(name: string): StrategyStats | undefined {
    return this.executionStats.get(name);
  }

  /**
   * 获取所有策略统计
   * @returns 所有策略的统计数据
   */
  public getAllStats(): Map<string, StrategyStats> {
    return new Map(this.executionStats);
  }

  /**
   * 列出所有已注册策略 (增强版)
   * @returns 策略元数据列表
   */
  public listStrategies(): StrategyMeta[] {
    return Array.from(this.strategies.values()).map(strategy => {
      const stats = this.executionStats.get(strategy.name);
      return {
        name: strategy.name,
        description: strategy.description,
        version: strategy.version,
        priority: strategy.priority ?? StrategyPriority.NORMAL,
        tags: strategy.tags ?? [],
        isActive: strategy.name === this.activeStrategy,
        executionCount: stats?.totalExecutions ?? 0,
        lastExecutionTime: stats?.avgExecutionTime !== undefined ? stats.avgExecutionTime : undefined,
        avgExecutionTime: stats?.avgExecutionTime
      };
    });
  }

  /**
   * 清空所有策略
   */
  public clear(): void {
    this.strategies.clear();
    this.executionStats.clear();
    this.activeStrategy = null;
    console.log('[StrategyRegistryPro] 已清空所有策略');
  }
}

// ============== 内置策略示例 (增强版) ==============

/**
 * 快速排序策略 (增强版)
 */
export class QuickSortStrategyPro implements IStrategy<number[], number[]> {
  readonly name = 'quick-sort-pro';
  readonly description = '快速排序算法 Pro - 优化版，O(n log n) 平均时间复杂度';
  readonly version = '2.0.0';
  readonly priority = StrategyPriority.HIGH;
  readonly tags = ['sorting', 'fast', 'divide-conquer'];

  validate(context: StrategyContext<number[]>): boolean {
    return Array.isArray(context.data) && context.data.every(x => typeof x === 'number');
  }

  beforeExecute(context: StrategyContext<number[]>): StrategyContext<number[]> {
    return {
      ...context,
      metadata: {
        ...context.metadata,
        beforeSort: { length: context.data.length, sum: context.data.reduce((a, b) => a + b, 0) }
      }
    };
  }

  async execute(context: StrategyContext<number[]>): Promise<StrategyResult<number[]>> {
    const data = [...context.data];
    const sorted = this.quickSort(data);
    return {
      success: true,
      data: sorted,
      strategyName: this.name,
      metadata: { algorithm: 'quick-sort', comparisons: this.comparisonCount }
    };
  }

  afterExecute(result: StrategyResult<number[]>): StrategyResult<number[]> {
    return {
      ...result,
      metadata: {
        ...result.metadata,
        afterSort: { isSorted: this.isSorted(result.data) }
      }
    };
  }

  private comparisonCount = 0;

  private quickSort(arr: number[]): number[] {
    if (arr.length <= 1) return arr;
    this.comparisonCount = 0;
    const pivot = arr[Math.floor(arr.length / 2)];
    const left = arr.filter(x => {
      if (x < pivot) this.comparisonCount++;
      return x < pivot;
    });
    const middle = arr.filter(x => x === pivot);
    const right = arr.filter(x => {
      if (x > pivot) this.comparisonCount++;
      return x > pivot;
    });
    return [...this.quickSort(left), ...middle, ...this.quickSort(right)];
  }

  private isSorted(arr: number[]): boolean {
    for (let i = 1; i < arr.length; i++) {
      if (arr[i] < arr[i - 1]) return false;
    }
    return true;
  }
}

/**
 * 归并排序策略 (增强版)
 */
export class MergeSortStrategyPro implements IStrategy<number[], number[]> {
  readonly name = 'merge-sort-pro';
  readonly description = '归并排序算法 Pro - 稳定排序，O(n log n)';
  readonly version = '2.0.0';
  readonly priority = StrategyPriority.NORMAL;
  readonly tags = ['sorting', 'stable', 'divide-conquer'];

  validate(context: StrategyContext<number[]>): boolean {
    return Array.isArray(context.data);
  }

  async execute(context: StrategyContext<number[]>): Promise<StrategyResult<number[]>> {
    const data = [...context.data as number[]];
    const sorted = this.mergeSort(data);
    return {
      success: true,
      data: sorted,
      strategyName: this.name,
      metadata: { algorithm: 'merge-sort', stable: true }
    };
  }

  private mergeSort(arr: number[]): number[] {
    if (arr.length <= 1) return arr;
    const mid = Math.floor(arr.length / 2);
    const left = this.mergeSort(arr.slice(0, mid));
    const right = this.mergeSort(arr.slice(mid));
    return this.merge(left, right);
  }

  private merge(left: number[], right: number[]): number[] {
    const result: number[] = [];
    let i = 0, j = 0;
    while (i < left.length && j < right.length) {
      if (left[i] <= right[j]) {
        result.push(left[i++]);
      } else {
        result.push(right[j++]);
      }
    }
    return [...result, ...left.slice(i), ...right.slice(j)];
  }
}

/**
 * 数据过滤策略
 */
export class FilterStrategy implements IStrategy<number[], number[]> {
  readonly name = 'filter-even';
  readonly description = '过滤策略 - 只保留偶数';
  readonly version = '1.0.0';
  readonly priority = StrategyPriority.LOW;
  readonly tags = ['filtering', 'transform'];

  validate(context: StrategyContext<number[]>): boolean {
    return Array.isArray(context.data);
  }

  async execute(context: StrategyContext<number[]>): Promise<StrategyResult<number[]>> {
    const data = context.data as number[];
    const filtered = data.filter(x => x % 2 === 0);
    return {
      success: true,
      data: filtered,
      strategyName: this.name,
      metadata: { originalLength: data.length, filteredLength: filtered.length }
    };
  }
}

/**
 * 数据转换策略
 */
export class TransformStrategy implements IStrategy<number[], number[]> {
  readonly name = 'transform-double';
  readonly description = '转换策略 - 将所有数字翻倍';
  readonly version = '1.0.0';
  readonly priority = StrategyPriority.LOW;
  readonly tags = ['transform', 'math'];

  validate(context: StrategyContext<number[]>): boolean {
    return Array.isArray(context.data);
  }

  async execute(context: StrategyContext<number[]>): Promise<StrategyResult<number[]>> {
    const data = context.data as number[];
    const transformed = data.map(x => x * 2);
    return {
      success: true,
      data: transformed,
      strategyName: this.name,
      metadata: { transformation: 'double' }
    };
  }
}

// ============== 使用示例 ==============

/**
 * 使用示例 - 演示策略模式 Pro 的完整功能
 */
export async function demonstrateStrategyPatternPro(): Promise<void> {
  console.log('\n=== 策略模式 Pro 使用示例 ===\n');

  const registry = StrategyRegistryPro.getInstance();
  const composer = registry.getComposer();

  // 1. 注册策略
  console.log('1️⃣ 注册策略...');
  registry.register(new QuickSortStrategyPro());
  registry.register(new MergeSortStrategyPro());
  registry.register(new FilterStrategy());
  registry.register(new TransformStrategy());

  // 2. 列出所有策略
  console.log('\n2️⃣ 已注册策略列表:');
  registry.listStrategies().forEach(s => {
    console.log(`   - ${s.name} (${s.version}) [${s.priority}]`);
    console.log(`     ${s.description}`);
    console.log(`     标签: ${s.tags.join(', ')} | 执行次数: ${s.executionCount}`);
  });

  // 3. 按标签筛选策略
  console.log('\n3️⃣ 筛选 "sorting" 标签的策略:');
  registry.getStrategiesByTag('sorting').forEach(s => {
    console.log(`   - ${s.name}`);
  });

  // 4. 执行单个策略
  console.log('\n4️⃣ 执行 "quick-sort-pro"...');
  const testData = [64, 34, 25, 12, 22, 11, 90];
  console.log(`   原始数据: [${testData.join(', ')}]`);
  
  const result = await registry.executeStrategy('quick-sort-pro', { data: testData });
  console.log(`   排序结果: [${result.data.join(', ')}]`);
  console.log(`   执行时间: ${result.executionTime}ms`);
  console.log(`   元数据:`, JSON.stringify(result.metadata, null, 2));

  // 5. 创建管道策略 (过滤 → 排序)
  console.log('\n5️⃣ 创建管道策略: filter-even → merge-sort-pro');
  const pipeline = composer.createPipeline(['filter-even', 'merge-sort-pro']);
  registry.register(pipeline);
  
  const pipelineResult = await registry.executeStrategy('pipeline', { 
    data: [64, 34, 25, 12, 22, 11, 90, 7, 3] 
  });
  console.log(`   原始数据: [64, 34, 25, 12, 22, 11, 90, 7, 3]`);
  console.log(`   管道结果: [${pipelineResult.data.join(', ')}]`);

  // 6. 创建并行策略
  console.log('\n6️⃣ 创建并行策略: quick-sort-pro vs merge-sort-pro');
  const parallel = composer.createParallel(['quick-sort-pro', 'merge-sort-pro']);
  registry.register(parallel);
  
  const parallelResult = await registry.executeStrategy('parallel', { data: testData });
  console.log(`   并行执行结果:`);
  parallelResult.data.forEach((r, i) => {
    console.log(`     [${i}] ${r.strategyName}: ${r.executionTime}ms, 成功: ${r.success}`);
  });

  // 7. 创建降级策略
  console.log('\n7️⃣ 创建降级策略: quick-sort-pro → merge-sort-pro → bubble-sort (不存在)');
  const fallback = composer.createFallback(['quick-sort-pro', 'merge-sort-pro', 'bubble-sort']);
  registry.register(fallback);
  
  const fallbackResult = await registry.executeStrategy('fallback', { data: testData });
  console.log(`   降级策略结果: 成功策略 = ${(fallbackResult.metadata as any)?.successfulStrategy}`);

  // 8. 查看策略统计
  console.log('\n8️⃣ 策略执行统计:');
  const stats = registry.getStats('quick-sort-pro');
  if (stats) {
    console.log(`   quick-sort-pro:`);
    console.log(`     总执行次数: ${stats.totalExecutions}`);
    console.log(`     成功次数: ${stats.successfulExecutions}`);
    console.log(`     平均执行时间: ${stats.avgExecutionTime.toFixed(2)}ms`);
  }

  // 9. 按优先级排序
  console.log('\n9️⃣ 按优先级排序策略:');
  registry.getStrategiesByPriority().forEach(s => {
    console.log(`   [${s.priority ?? 5}] ${s.name}`);
  });

  console.log('\n=== 示例完成 ===\n');
}

// ============== 导出 ==============

export {
  StrategyRegistryPro,
  StrategyComposer,
  IStrategy,
  StrategyContext,
  StrategyResult,
  StrategyPriority,
  ExecutionMode,
  CompositionConfig,
  QuickSortStrategyPro,
  MergeSortStrategyPro,
  FilterStrategy,
  TransformStrategy
};

// 默认导出
export default {
  StrategyRegistryPro,
  StrategyComposer,
  demonstrateStrategyPatternPro
};
