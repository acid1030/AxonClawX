/**
 * Strategy Pattern Skill - ACE Algorithm Switcher
 * 
 * 功能:
 * 1. 策略定义 - 定义统一的策略接口
 * 2. 策略注册 - 动态注册新策略
 * 3. 动态切换 - 运行时切换算法策略
 * 
 * @author Axon
 * @version 1.0.0
 */

// ============== 策略接口定义 ==============

/**
 * 策略执行上下文
 */
export interface StrategyContext {
  data: any;
  options?: Record<string, any>;
  metadata?: Record<string, any>;
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
}

/**
 * 策略接口 - 所有算法策略必须实现此接口
 */
export interface IStrategy {
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
   * 执行策略
   * @param context 执行上下文
   * @returns 执行结果
   */
  execute(context: StrategyContext): Promise<StrategyResult>;

  /**
   * 验证输入是否适合此策略
   * @param context 执行上下文
   * @returns 是否适用
   */
  validate?(context: StrategyContext): boolean;
}

// ============== 策略注册表 ==============

/**
 * 策略注册表 - 单例模式
 */
export class StrategyRegistry {
  private static instance: StrategyRegistry;
  private strategies: Map<string, IStrategy> = new Map();
  private activeStrategy: string | null = null;

  private constructor() {}

  /**
   * 获取单例实例
   */
  public static getInstance(): StrategyRegistry {
    if (!StrategyRegistry.instance) {
      StrategyRegistry.instance = new StrategyRegistry();
    }
    return StrategyRegistry.instance;
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
    console.log(`[StrategyRegistry] 已注册策略: ${strategy.name} v${strategy.version}`);
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
    console.log(`[StrategyRegistry] 活跃策略已切换: ${name}`);
  }

  /**
   * 获取活跃策略
   * @returns 活跃策略名称或 null
   */
  public getActiveStrategy(): string | null {
    return this.activeStrategy;
  }

  /**
   * 执行活跃策略
   * @param context 执行上下文
   * @returns 执行结果
   */
  public async executeActive(context: StrategyContext): Promise<StrategyResult> {
    if (!this.activeStrategy) {
      return {
        success: false,
        data: null,
        strategyName: 'NONE',
        error: '未设置活跃策略'
      };
    }

    const strategy = this.strategies.get(this.activeStrategy);
    if (!strategy) {
      return {
        success: false,
        data: null,
        strategyName: this.activeStrategy,
        error: '策略不存在'
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
  public async executeStrategy(name: string, context: StrategyContext): Promise<StrategyResult> {
    const strategy = this.strategies.get(name);
    if (!strategy) {
      return {
        success: false,
        data: null,
        strategyName: name,
        error: `策略 "${name}" 不存在`
      };
    }

    // 验证输入
    if (strategy.validate && !strategy.validate(context)) {
      return {
        success: false,
        data: null,
        strategyName: name,
        error: '输入验证失败'
      };
    }

    // 执行策略
    const startTime = Date.now();
    try {
      const result = await strategy.execute(context);
      return {
        ...result,
        executionTime: Date.now() - startTime
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        strategyName: name,
        executionTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : '未知错误'
      };
    }
  }

  /**
   * 列出所有已注册策略
   * @returns 策略信息列表
   */
  public listStrategies(): Array<{ name: string; description: string; version: string; isActive: boolean }> {
    return Array.from(this.strategies.values()).map(strategy => ({
      name: strategy.name,
      description: strategy.description,
      version: strategy.version,
      isActive: strategy.name === this.activeStrategy
    }));
  }

  /**
   * 清空所有策略
   */
  public clear(): void {
    this.strategies.clear();
    this.activeStrategy = null;
    console.log('[StrategyRegistry] 已清空所有策略');
  }
}

// ============== 内置策略示例 ==============

/**
 * 快速排序策略
 */
export class QuickSortStrategy implements IStrategy {
  readonly name = 'quick-sort';
  readonly description = '快速排序算法 - O(n log n) 平均时间复杂度';
  readonly version = '1.0.0';

  validate(context: StrategyContext): boolean {
    return Array.isArray(context.data);
  }

  async execute(context: StrategyContext): Promise<StrategyResult<number[]>> {
    const data = [...context.data as number[]];
    const sorted = this.quickSort(data);
    return {
      success: true,
      data: sorted,
      strategyName: this.name
    };
  }

  private quickSort(arr: number[]): number[] {
    if (arr.length <= 1) return arr;
    const pivot = arr[Math.floor(arr.length / 2)];
    const left = arr.filter(x => x < pivot);
    const middle = arr.filter(x => x === pivot);
    const right = arr.filter(x => x > pivot);
    return [...this.quickSort(left), ...middle, ...this.quickSort(right)];
  }
}

/**
 * 冒泡排序策略
 */
export class BubbleSortStrategy implements IStrategy {
  readonly name = 'bubble-sort';
  readonly description = '冒泡排序算法 - O(n²) 时间复杂度';
  readonly version = '1.0.0';

  validate(context: StrategyContext): boolean {
    return Array.isArray(context.data);
  }

  async execute(context: StrategyContext): Promise<StrategyResult<number[]>> {
    const data = [...context.data as number[]];
    const sorted = this.bubbleSort(data);
    return {
      success: true,
      data: sorted,
      strategyName: this.name
    };
  }

  private bubbleSort(arr: number[]): number[] {
    const n = arr.length;
    for (let i = 0; i < n - 1; i++) {
      for (let j = 0; j < n - i - 1; j++) {
        if (arr[j] > arr[j + 1]) {
          [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]];
        }
      }
    }
    return arr;
  }
}

/**
 * 归并排序策略
 */
export class MergeSortStrategy implements IStrategy {
  readonly name = 'merge-sort';
  readonly description = '归并排序算法 - O(n log n) 稳定排序';
  readonly version = '1.0.0';

  validate(context: StrategyContext): boolean {
    return Array.isArray(context.data);
  }

  async execute(context: StrategyContext): Promise<StrategyResult<number[]>> {
    const data = [...context.data as number[]];
    const sorted = this.mergeSort(data);
    return {
      success: true,
      data: sorted,
      strategyName: this.name
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

// ============== 使用示例 ==============

/**
 * 使用示例 - 演示策略模式的完整流程
 */
export async function demonstrateStrategyPattern(): Promise<void> {
  console.log('\n=== 策略模式使用示例 ===\n');

  const registry = StrategyRegistry.getInstance();

  // 1. 注册策略
  console.log('1️⃣ 注册策略...');
  registry.register(new QuickSortStrategy());
  registry.register(new BubbleSortStrategy());
  registry.register(new MergeSortStrategy());

  // 2. 列出所有策略
  console.log('\n2️⃣ 已注册策略列表:');
  registry.listStrategies().forEach(s => {
    console.log(`   - ${s.name} (${s.version}): ${s.description}${s.isActive ? ' [活跃]' : ''}`);
  });

  // 3. 设置活跃策略
  console.log('\n3️⃣ 设置活跃策略为 "quick-sort"...');
  registry.setActiveStrategy('quick-sort');

  // 4. 执行活跃策略
  console.log('\n4️⃣ 执行活跃策略...');
  const testData = [64, 34, 25, 12, 22, 11, 90];
  console.log(`   原始数据: [${testData.join(', ')}]`);
  
  const result = await registry.executeActive({ data: testData });
  console.log(`   排序结果: [${result.data.join(', ')}]`);
  console.log(`   策略名称: ${result.strategyName}`);
  console.log(`   执行时间: ${result.executionTime}ms`);

  // 5. 动态切换策略
  console.log('\n5️⃣ 动态切换到 "bubble-sort"...');
  registry.setActiveStrategy('bubble-sort');
  
  const result2 = await registry.executeActive({ data: testData });
  console.log(`   排序结果: [${result2.data.join(', ')}]`);
  console.log(`   策略名称: ${result2.strategyName}`);
  console.log(`   执行时间: ${result2.executionTime}ms`);

  // 6. 直接执行指定策略 (不切换活跃策略)
  console.log('\n6️⃣ 直接执行 "merge-sort" (不切换活跃策略)...');
  const result3 = await registry.executeStrategy('merge-sort', { data: testData });
  console.log(`   排序结果: [${result3.data.join(', ')}]`);
  console.log(`   策略名称: ${result3.strategyName}`);
  console.log(`   执行时间: ${result3.executionTime}ms`);

  // 7. 查看当前活跃策略
  console.log('\n7️⃣ 当前活跃策略:', registry.getActiveStrategy());

  console.log('\n=== 示例完成 ===\n');
}

// ============== 导出 ==============

export {
  StrategyRegistry,
  IStrategy,
  StrategyContext,
  StrategyResult,
  QuickSortStrategy,
  BubbleSortStrategy,
  MergeSortStrategy
};

// 默认导出
export default {
  StrategyRegistry,
  demonstrateStrategyPattern
};
