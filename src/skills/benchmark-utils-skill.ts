/**
 * Benchmark Utils - 性能基准测试工具
 * 
 * 功能:
 * 1. 执行时间测量 (Execution Time Measurement)
 * 2. 内存使用分析 (Memory Usage Analysis)
 * 3. 性能对比 (Performance Comparison)
 * 
 * @author Axon (KAEL Engineering)
 * @version 1.0.0
 * @since 2026-03-13
 */

// ============== 类型定义 ==============

/**
 * 基准测试配置选项
 */
export interface BenchmarkOptions {
  /** 测试名称 */
  name?: string;
  /** 预热次数 (正式测试前执行的次数) */
  warmupIterations?: number;
  /** 正式测试迭代次数 */
  iterations?: number;
  /** 是否收集内存数据 */
  collectMemory?: boolean;
  /** 是否显示详细日志 */
  verbose?: boolean;
  /** 最小采样间隔 (毫秒) */
  minSampleInterval?: number;
}

/**
 * 单次测试结果
 */
export interface BenchmarkResult {
  /** 测试名称 */
  name: string;
  /** 执行时间 (毫秒) */
  duration: number;
  /** 平均执行时间 (毫秒) */
  avgDuration: number;
  /** 最小执行时间 (毫秒) */
  minDuration: number;
  /** 最大执行时间 (毫秒) */
  maxDuration: number;
  /** 标准差 (毫秒) */
  stdDev: number;
  /** 中位数 (毫秒) */
  median: number;
  /** 95 百分位数 (毫秒) */
  p95: number;
  /** 99 百分位数 (毫秒) */
  p99: number;
  /** 总迭代次数 */
  iterations: number;
  /** 每秒操作数 (ops/sec) */
  opsPerSec: number;
  /** 内存使用快照 (如果启用) */
  memory?: MemorySnapshot;
  /** 内存变化 (如果启用) */
  memoryDelta?: MemoryDelta;
  /** 所有采样数据 (毫秒) */
  samples: number[];
  /** 测试时间戳 */
  timestamp: number;
}

/**
 * 内存快照
 */
export interface MemorySnapshot {
  /** 堆内存使用 (MB) */
  heapUsed: number;
  /** 堆内存总量 (MB) */
  heapTotal: number;
  /** RSS 内存 (MB) */
  rss: number;
  /** 外部内存 (MB) */
  external: number;
  /** 堆使用率 (%) */
  heapUsedPercent: number;
}

/**
 * 内存变化量
 */
export interface MemoryDelta {
  /** 堆内存变化 (MB) */
  heapUsedDelta: number;
  /** RSS 变化 (MB) */
  rssDelta: number;
  /** 外部内存变化 (MB) */
  externalDelta: number;
}

/**
 * 性能对比结果
 */
export interface ComparisonResult {
  /** 基准测试 A 的结果 */
  baseline: BenchmarkResult;
  /** 基准测试 B 的结果 */
  candidate: BenchmarkResult;
  /** 性能提升百分比 (正数表示提升，负数表示下降) */
  improvement: number;
  /** 速度倍数 (candidate 是 baseline 的多少倍) */
  speedup: number;
  /** 是否具有统计学显著性 */
  significant: boolean;
  /** 置信度 (0-1) */
  confidence: number;
  /** 对比总结 */
  summary: string;
}

/**
 * 基准测试运行器
 */
export interface BenchmarkRunner {
  /** 运行基准测试 */
  run(fn: () => void | Promise<void>): Promise<BenchmarkResult>;
  /** 比较两个函数 */
  compare(
    baselineFn: () => void | Promise<void>,
    candidateFn: () => void | Promise<void>,
    options?: BenchmarkOptions
  ): Promise<ComparisonResult>;
  /** 获取当前内存快照 */
  getMemorySnapshot(): MemorySnapshot;
  /** 格式化结果为人类可读字符串 */
  formatResult(result: BenchmarkResult): string;
}

// ============== 工具函数 ==============

/**
 * 计算数组平均值
 */
function calculateAverage(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((sum, val) => sum + val, 0) / arr.length;
}

/**
 * 计算数组标准差
 */
function calculateStdDev(arr: number[], avg: number): number {
  if (arr.length < 2) return 0;
  const squareDiffs = arr.map(val => Math.pow(val - avg, 2));
  const avgSquareDiff = calculateAverage(squareDiffs);
  return Math.sqrt(avgSquareDiff);
}

/**
 * 计算百分位数
 */
function calculatePercentile(arr: number[], percentile: number): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const index = (percentile / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower];
  const weight = index - lower;
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

/**
 * 计算中位数
 */
function calculateMedian(arr: number[]): number {
  return calculatePercentile(arr, 50);
}

/**
 * 获取当前内存使用快照
 */
function getMemorySnapshot(): MemorySnapshot {
  const usage = process.memoryUsage();
  const heapUsed = usage.heapUsed / 1024 / 1024;
  const heapTotal = usage.heapTotal / 1024 / 1024;
  const rss = usage.rss / 1024 / 1024;
  const external = usage.external / 1024 / 1024;
  
  return {
    heapUsed,
    heapTotal,
    rss,
    external,
    heapUsedPercent: (heapUsed / heapTotal) * 100,
  };
}

/**
 * 强制垃圾回收 (仅在 Node.js 启动时添加 --expose-gc 时可用)
 */
function forceGarbageCollection(): void {
  // @ts-ignore - global.gc may not exist
  if (typeof global.gc === 'function') {
    // @ts-ignore
    global.gc();
  }
}

// ============== BenchmarkUtils 类 ==============

/**
 * 性能基准测试工具类
 * 
 * 提供精确的性能测量、内存分析和对比功能
 * 
 * @example
 * ```typescript
 * import { BenchmarkUtils } from './benchmark-utils-skill';
 * 
 * const benchmark = new BenchmarkUtils();
 * 
 * // 简单性能测试
 * const result = await benchmark.run(() => {
 *   // 要测试的代码
 *   const arr = [];
 *   for (let i = 0; i < 1000; i++) {
 *     arr.push(i * 2);
 *   }
 * }, {
 *   name: 'Array Push Test',
 *   iterations: 1000,
 *   warmupIterations: 100,
 * });
 * 
 * console.log(benchmark.formatResult(result));
 * ```
 */
export class BenchmarkUtils implements BenchmarkRunner {
  private defaultOptions: Required<BenchmarkOptions> = {
    name: 'Unnamed Benchmark',
    warmupIterations: 10,
    iterations: 100,
    collectMemory: true,
    verbose: false,
    minSampleInterval: 0,
  };

  constructor(private options: BenchmarkOptions = {}) {
    this.defaultOptions = {
      ...this.defaultOptions,
      ...options,
    };
  }

  /**
   * 运行基准测试
   * 
   * @param fn - 要测试的函数
   * @param options - 测试配置 (可选，会合并到构造函数配置)
   * @returns 基准测试结果
   * 
   * @example
   * ```typescript
   * const result = await benchmark.run(() => {
   *   // 同步代码
   *   JSON.stringify({ a: 1, b: 2 });
   * });
   * ```
   * 
   * @example
   * ```typescript
   * // 异步代码
   * const result = await benchmark.run(async () => {
   *   await fetch('https://api.example.com/data');
   * });
   * ```
   */
  async run(
    fn: () => void | Promise<void>,
    options?: BenchmarkOptions
  ): Promise<BenchmarkResult> {
    const config = { ...this.defaultOptions, ...options };
    const samples: number[] = [];
    let memoryBefore: MemorySnapshot | null = null;
    let memoryAfter: MemorySnapshot | null = null;

    if (config.verbose) {
      console.log(`🔍 开始基准测试：${config.name}`);
      console.log(`   迭代次数：${config.iterations}`);
      console.log(`   预热次数：${config.warmupIterations}`);
    }

    // 预热阶段
    if (config.warmupIterations > 0) {
      if (config.verbose) {
        console.log(`   正在预热 (${config.warmupIterations} 次)...`);
      }
      for (let i = 0; i < config.warmupIterations; i++) {
        await Promise.resolve().then(fn);
      }
      if (config.verbose) {
        console.log(`   预热完成`);
      }
    }

    // 收集内存基线
    if (config.collectMemory) {
      forceGarbageCollection();
      await this.sleep(100); // 等待 GC 完成
      memoryBefore = getMemorySnapshot();
    }

    // 正式测试
    if (config.verbose) {
      console.log(`   正在执行测试...`);
    }

    for (let i = 0; i < config.iterations; i++) {
      const startTime = performance.now();
      
      await Promise.resolve().then(fn);
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      samples.push(duration);

      if (config.minSampleInterval > 0) {
        await this.sleep(config.minSampleInterval);
      }
    }

    // 收集内存后数据
    if (config.collectMemory) {
      memoryAfter = getMemorySnapshot();
    }

    // 计算统计数据
    const avgDuration = calculateAverage(samples);
    const minDuration = Math.min(...samples);
    const maxDuration = Math.max(...samples);
    const stdDev = calculateStdDev(samples, avgDuration);
    const median = calculateMedian(samples);
    const p95 = calculatePercentile(samples, 95);
    const p99 = calculatePercentile(samples, 99);
    const totalDuration = samples.reduce((sum, val) => sum + val, 0);
    const opsPerSec = (config.iterations / totalDuration) * 1000;

    const result: BenchmarkResult = {
      name: config.name,
      duration: totalDuration,
      avgDuration,
      minDuration,
      maxDuration,
      stdDev,
      median,
      p95,
      p99,
      iterations: config.iterations,
      opsPerSec,
      memory: memoryAfter || undefined,
      memoryDelta: (memoryBefore && memoryAfter) ? {
        heapUsedDelta: memoryAfter.heapUsed - memoryBefore.heapUsed,
        rssDelta: memoryAfter.rss - memoryBefore.rss,
        externalDelta: memoryAfter.external - memoryBefore.external,
      } : undefined,
      samples,
      timestamp: Date.now(),
    };

    if (config.verbose) {
      console.log(`   测试完成`);
      console.log(this.formatResult(result));
    }

    return result;
  }

  /**
   * 比较两个函数的性能
   * 
   * @param baselineFn - 基准函数 (对照版本)
   * @param candidateFn - 候选函数 (待比较版本)
   * @param options - 测试配置
   * @returns 对比结果
   * 
   * @example
   * ```typescript
   * const comparison = await benchmark.compare(
   *   // 基准：传统 for 循环
   *   () => {
   *     const arr = [];
   *     for (let i = 0; i < 1000; i++) {
   *       arr.push(i * 2);
   *     }
   *   },
   *   // 候选：Array.map
   *   () => {
   *     Array.from({ length: 1000 }).map((_, i) => i * 2);
   *   },
   *   { name: 'Loop vs Map', iterations: 1000 }
   * );
   * 
   * console.log(comparison.summary);
   * ```
   */
  async compare(
    baselineFn: () => void | Promise<void>,
    candidateFn: () => void | Promise<void>,
    options?: BenchmarkOptions
  ): Promise<ComparisonResult> {
    const config = { ...this.defaultOptions, ...options };

    if (config.verbose) {
      console.log(`\n📊 性能对比：${config.name || 'Comparison'}`);
      console.log('='.repeat(60));
    }

    // 运行基准测试
    const baseline = await this.run(baselineFn, {
      ...config,
      name: `${config.name || 'Benchmark'} (Baseline)`,
      verbose: config.verbose,
    });

    // 运行候选测试
    const candidate = await this.run(candidateFn, {
      ...config,
      name: `${config.name || 'Benchmark'} (Candidate)`,
      verbose: config.verbose,
    });

    // 计算性能差异
    const improvement = ((baseline.avgDuration - candidate.avgDuration) / baseline.avgDuration) * 100;
    const speedup = baseline.avgDuration / candidate.avgDuration;

    // 简化的显著性检测 (基于标准差)
    const pooledStdDev = Math.sqrt((baseline.stdDev ** 2 + candidate.stdDev ** 2) / 2);
    const meanDiff = Math.abs(baseline.avgDuration - candidate.avgDuration);
    const significant = meanDiff > (2 * pooledStdDev); // 简单的 2-sigma 规则

    // 简化的置信度计算
    const confidence = Math.min(0.99, 0.5 + (meanDiff / (pooledStdDev || 1)) * 0.25);

    // 生成总结
    let summary: string;
    if (improvement > 0) {
      summary = `✅ 候选方案提升了 ${improvement.toFixed(2)}% 的性能 (速度提升 ${speedup.toFixed(2)}x)`;
    } else if (improvement < 0) {
      summary = `⚠️ 候选方案性能下降了 ${Math.abs(improvement).toFixed(2)}% (速度为基准的 ${speedup.toFixed(2)}x)`;
    } else {
      summary = `➡️ 两个方案性能基本相同`;
    }

    if (significant) {
      summary += ` [统计学显著]`;
    }

    return {
      baseline,
      candidate,
      improvement,
      speedup,
      significant,
      confidence,
      summary,
    };
  }

  /**
   * 获取当前内存快照
   * 
   * @returns 内存使用快照
   * 
   * @example
   * ```typescript
   * const memory = benchmark.getMemorySnapshot();
   * console.log(`堆内存使用：${memory.heapUsed.toFixed(2)} MB`);
   * ```
   */
  getMemorySnapshot(): MemorySnapshot {
    return getMemorySnapshot();
  }

  /**
   * 格式化结果为人类可读的字符串
   * 
   * @param result - 基准测试结果
   * @returns 格式化的字符串
   * 
   * @example
   * ```typescript
   * const result = await benchmark.run(myFunction);
   * console.log(benchmark.formatResult(result));
   * ```
   */
  formatResult(result: BenchmarkResult): string {
    const lines = [
      `📊 基准测试结果：${result.name}`,
      `   平均耗时：${result.avgDuration.toFixed(3)} ms`,
      `   中位数：${result.median.toFixed(3)} ms`,
      `   最小值：${result.minDuration.toFixed(3)} ms`,
      `   最大值：${result.maxDuration.toFixed(3)} ms`,
      `   标准差：${result.stdDev.toFixed(3)} ms`,
      `   P95: ${result.p95.toFixed(3)} ms`,
      `   P99: ${result.p99.toFixed(3)} ms`,
      `   吞吐量：${result.opsPerSec.toFixed(2)} ops/sec`,
      `   迭代次数：${result.iterations}`,
      `   总耗时：${result.duration.toFixed(2)} ms`,
    ];

    if (result.memory) {
      lines.push(
        `   堆内存：${result.memory.heapUsed.toFixed(2)} MB / ${result.memory.heapTotal.toFixed(2)} MB (${result.memory.heapUsedPercent.toFixed(1)}%)`,
        `   RSS 内存：${result.memory.rss.toFixed(2)} MB`,
        `   外部内存：${result.memory.external.toFixed(2)} MB`
      );
    }

    if (result.memoryDelta) {
      const deltaSign = result.memoryDelta.heapUsedDelta >= 0 ? '+' : '';
      lines.push(
        `   内存变化：${deltaSign}${result.memoryDelta.heapUsedDelta.toFixed(2)} MB (堆)`,
        `   RSS 变化：${result.memoryDelta.rssDelta >= 0 ? '+' : ''}${result.memoryDelta.rssDelta.toFixed(2)} MB`
      );
    }

    return lines.join('\n');
  }

  /**
   * 格式化对比结果为人类可读的字符串
   * 
   * @param comparison - 对比结果
   * @returns 格式化的字符串
   * 
   * @example
   * ```typescript
   * const comparison = await benchmark.compare(fn1, fn2);
   * console.log(benchmark.formatComparison(comparison));
   * ```
   */
  formatComparison(comparison: ComparisonResult): string {
    const lines = [
      `\n📊 性能对比报告`,
      `═`.repeat(60),
      ``,
      `基准方案：${comparison.baseline.name}`,
      `  平均耗时：${comparison.baseline.avgDuration.toFixed(3)} ms`,
      `  吞吐量：${comparison.baseline.opsPerSec.toFixed(2)} ops/sec`,
      ``,
      `候选方案：${comparison.candidate.name}`,
      `  平均耗时：${comparison.candidate.avgDuration.toFixed(3)} ms`,
      `  吞吐量：${comparison.candidate.opsPerSec.toFixed(2)} ops/sec`,
      ``,
      `📈 性能分析:`,
      `  提升：${comparison.improvement >= 0 ? '+' : ''}${comparison.improvement.toFixed(2)}%`,
      `  速度倍数：${comparison.speedup.toFixed(2)}x`,
      `  显著性：${comparison.significant ? '✅ 是' : '❌ 否'}`,
      `  置信度：${(comparison.confidence * 100).toFixed(1)}%`,
      ``,
      `💡 总结：${comparison.summary}`,
      `═`.repeat(60),
    ];

    return lines.join('\n');
  }

  /**
   * 辅助函数：休眠指定毫秒
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ============== 快捷导出 ==============

/**
 * 创建基准测试工具的快捷函数
 * 
 * @example
 * ```typescript
 * import { createBenchmark } from './benchmark-utils-skill';
 * 
 * const benchmark = createBenchmark({ iterations: 1000, verbose: true });
 * ```
 */
export function createBenchmark(options?: BenchmarkOptions): BenchmarkUtils {
  return new BenchmarkUtils(options);
}

/**
 * 快速运行单次基准测试的快捷函数
 * 
 * @example
 * ```typescript
 * import { benchmark } from './benchmark-utils-skill';
 * 
 * const result = await benchmark(() => {
 *   // 测试代码
 * }, { name: 'Quick Test' });
 * ```
 */
export async function benchmark(
  fn: () => void | Promise<void>,
  options?: BenchmarkOptions
): Promise<BenchmarkResult> {
  const utils = new BenchmarkUtils(options);
  return utils.run(fn, options);
}

/**
 * 快速比较两个函数的快捷函数
 * 
 * @example
 * ```typescript
 * import { compare } from './benchmark-utils-skill';
 * 
 * const result = await compare(fn1, fn2, { name: 'Comparison' });
 * console.log(result.summary);
 * ```
 */
export async function compare(
  baselineFn: () => void | Promise<void>,
  candidateFn: () => void | Promise<void>,
  options?: BenchmarkOptions
): Promise<ComparisonResult> {
  const utils = new BenchmarkUtils(options);
  return utils.compare(baselineFn, candidateFn, options);
}

/**
 * 获取当前内存快照的快捷函数
 * 
 * @example
 * ```typescript
 * import { getMemory } from './benchmark-utils-skill';
 * 
 * const memory = getMemory();
 * console.log(`堆内存：${memory.heapUsed.toFixed(2)} MB`);
 * ```
 */
export function getMemory(): MemorySnapshot {
  return getMemorySnapshot();
}

// ============== 导出 ==============

export default BenchmarkUtils;
