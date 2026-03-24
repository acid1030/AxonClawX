/**
 * 策略模式使用示例
 * 
 * 演示如何在实际项目中使用 ACE 策略切换系统
 * 
 * @author Axon
 */

import {
  StrategyRegistry,
  IStrategy,
  StrategyContext,
  StrategyResult
} from './strategy-pattern-skill';

// ============== 自定义策略示例 ==============

/**
 * 自定义策略：数据过滤策略
 */
class FilterEvenStrategy implements IStrategy {
  readonly name = 'filter-even';
  readonly description = '过滤偶数，只保留奇数';
  readonly version = '1.0.0';

  validate(context: StrategyContext): boolean {
    return Array.isArray(context.data);
  }

  async execute(context: StrategyContext): Promise<StrategyResult<number[]>> {
    const data = context.data as number[];
    const filtered = data.filter(n => n % 2 !== 0);
    return {
      success: true,
      data: filtered,
      strategyName: this.name
    };
  }
}

/**
 * 自定义策略：数据转换策略 (平方)
 */
class SquareTransformStrategy implements IStrategy {
  readonly name = 'square-transform';
  readonly description = '将每个数字转换为平方值';
  readonly version = '1.0.0';

  validate(context: StrategyContext): boolean {
    return Array.isArray(context.data);
  }

  async execute(context: StrategyContext): Promise<StrategyResult<number[]>> {
    const data = context.data as number[];
    const transformed = data.map(n => n * n);
    return {
      success: true,
      data: transformed,
      strategyName: this.name
    };
  }
}

/**
 * 自定义策略：统计分析策略
 */
class StatisticsStrategy implements IStrategy {
  readonly name = 'statistics';
  readonly description = '计算数据的统计信息 (平均值、最大值、最小值)';
  readonly version = '1.0.0';

  validate(context: StrategyContext): boolean {
    return Array.isArray(context.data) && context.data.length > 0;
  }

  async execute(context: StrategyContext): Promise<StrategyResult<{
    average: number;
    max: number;
    min: number;
    count: number;
  }>> {
    const data = context.data as number[];
    const sum = data.reduce((a, b) => a + b, 0);
    return {
      success: true,
      data: {
        average: sum / data.length,
        max: Math.max(...data),
        min: Math.min(...data),
        count: data.length
      },
      strategyName: this.name
    };
  }
}

// ============== 实际使用场景 ==============

/**
 * 场景 1: 数据处理流水线
 * 
 * 根据不同业务需求动态切换处理策略
 */
async function dataProcessingPipeline(): Promise<void> {
  console.log('\n=== 场景 1: 数据处理流水线 ===\n');

  const registry = StrategyRegistry.getInstance();
  const testData = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  console.log('原始数据:', testData);

  // 注册自定义策略
  registry.register(new FilterEvenStrategy());
  registry.register(new SquareTransformStrategy());
  registry.register(new StatisticsStrategy());

  // 场景 1.1: 过滤偶数
  console.log('\n1.1 过滤偶数:');
  const filterResult = await registry.executeStrategy('filter-even', { data: testData });
  console.log('   结果:', filterResult.data);

  // 场景 1.2: 平方转换
  console.log('\n1.2 平方转换:');
  const squareResult = await registry.executeStrategy('square-transform', { data: testData });
  console.log('   结果:', squareResult.data);

  // 场景 1.3: 统计分析
  console.log('\n1.3 统计分析:');
  const statsResult = await registry.executeStrategy('statistics', { data: testData });
  console.log('   结果:', statsResult.data);

  // 清理
  registry.unregister('filter-even');
  registry.unregister('square-transform');
  registry.unregister('statistics');
}

/**
 * 场景 2: A/B 测试策略切换
 * 
 * 在不同算法之间快速切换进行性能对比
 */
async function abTesting(): Promise<void> {
  console.log('\n=== 场景 2: A/B 测试策略切换 ===\n');

  const registry = StrategyRegistry.getInstance();
  const testData = Array.from({ length: 1000 }, () => Math.floor(Math.random() * 10000));

  console.log(`测试数据量：${testData.length} 个随机数\n`);

  // 注册排序策略
  registry.register(new (await import('./strategy-pattern-skill')).QuickSortStrategy());
  registry.register(new (await import('./strategy-pattern-skill')).BubbleSortStrategy());
  registry.register(new (await import('./strategy-pattern-skill')).MergeSortStrategy());

  // 对比不同策略的性能
  const strategies = ['quick-sort', 'bubble-sort', 'merge-sort'];
  
  for (const strategyName of strategies) {
    console.log(`执行策略：${strategyName}`);
    const result = await registry.executeStrategy(strategyName, { data: [...testData] });
    console.log(`   执行时间：${result.executionTime}ms`);
    console.log(`   是否成功：${result.success}`);
    console.log('');
  }

  // 清理
  registry.unregister('quick-sort');
  registry.unregister('bubble-sort');
  registry.unregister('merge-sort');
}

/**
 * 场景 3: 运行时动态配置
 * 
 * 根据用户配置或环境变化动态切换策略
 */
async function runtimeConfiguration(): Promise<void> {
  console.log('\n=== 场景 3: 运行时动态配置 ===\n');

  const registry = StrategyRegistry.getInstance();

  // 模拟用户配置
  const userConfig = {
    algorithm: 'quick-sort',
    autoSwitch: true
  };

  console.log('用户配置:', userConfig);

  // 注册策略
  registry.register(new (await import('./strategy-pattern-skill')).QuickSortStrategy());
  registry.register(new (await import('./strategy-pattern-skill')).BubbleSortStrategy());

  // 根据配置设置活跃策略
  registry.setActiveStrategy(userConfig.algorithm);
  console.log('活跃策略已设置为:', registry.getActiveStrategy());

  // 执行
  const testData = [5, 2, 8, 1, 9];
  const result = await registry.executeActive({ data: testData });
  console.log('执行结果:', result.data);

  // 运行时切换配置
  console.log('\n运行时切换配置...');
  registry.setActiveStrategy('bubble-sort');
  const result2 = await registry.executeActive({ data: testData });
  console.log('新策略执行结果:', result2.data);

  // 清理
  registry.unregister('quick-sort');
  registry.unregister('bubble-sort');
}

// ============== 主函数 ==============

async function main(): Promise<void> {
  console.log('╔════════════════════════════════════════╗');
  console.log('║     ACE 策略模式使用示例               ║');
  console.log('╚════════════════════════════════════════╝');

  await dataProcessingPipeline();
  await abTesting();
  await runtimeConfiguration();

  console.log('\n╔════════════════════════════════════════╗');
  console.log('║     所有示例执行完成                   ║');
  console.log('╚════════════════════════════════════════╝\n');
}

// 运行示例
main().catch(console.error);
