/**
 * Benchmark Utils - 使用示例
 * 
 * 演示如何使用性能基准测试工具进行：
 * 1. 执行时间测量
 * 2. 内存使用分析
 * 3. 性能对比
 * 
 * @author Axon (KAEL Engineering)
 * @since 2026-03-13
 */

import {
  BenchmarkUtils,
  createBenchmark,
  benchmark,
  compare,
  getMemory,
} from './benchmark-utils-skill';

// ============================================
// 示例 1: 基础性能测试
// ============================================

async function example1_BasicBenchmark() {
  console.log('\n' + '='.repeat(60));
  console.log('示例 1: 基础性能测试');
  console.log('='.repeat(60) + '\n');

  const benchmark = new BenchmarkUtils({
    name: 'Array Push Performance',
    iterations: 1000,
    warmupIterations: 100,
    verbose: true,
  });

  const result = await benchmark.run(() => {
    const arr: number[] = [];
    for (let i = 0; i < 100; i++) {
      arr.push(i * 2);
    }
  });

  console.log('\n📊 结果摘要:');
  console.log(`   平均耗时：${result.avgDuration.toFixed(3)} ms`);
  console.log(`   吞吐量：${result.opsPerSec.toFixed(2)} ops/sec`);
}

// ============================================
// 示例 2: 异步代码性能测试
// ============================================

async function example2_AsyncBenchmark() {
  console.log('\n' + '='.repeat(60));
  console.log('示例 2: 异步代码性能测试');
  console.log('='.repeat(60) + '\n');

  const benchmark = createBenchmark({
    name: 'Async Fetch Simulation',
    iterations: 100,
    warmupIterations: 10,
    verbose: true,
  });

  // 模拟异步操作
  const result = await benchmark.run(async () => {
    await new Promise(resolve => setTimeout(resolve, 10));
    // 模拟网络请求
    return { data: 'mock' };
  });

  console.log(benchmark.formatResult(result));
}

// ============================================
// 示例 3: 内存使用分析
// ============================================

async function example3_MemoryAnalysis() {
  console.log('\n' + '='.repeat(60));
  console.log('示例 3: 内存使用分析');
  console.log('='.repeat(60) + '\n');

  const benchmark = new BenchmarkUtils({
    name: 'Memory Allocation Test',
    iterations: 500,
    warmupIterations: 50,
    collectMemory: true,
    verbose: true,
  });

  // 测试大量对象创建的内存影响
  const result = await benchmark.run(() => {
    const objects = [];
    for (let i = 0; i < 1000; i++) {
      objects.push({
        id: i,
        name: `Object ${i}`,
        data: new Array(100).fill(Math.random()),
      });
    }
  });

  console.log('\n🧠 内存分析:');
  if (result.memoryDelta) {
    console.log(
      `   堆内存变化：${result.memoryDelta.heapUsedDelta >= 0 ? '+' : ''}${result.memoryDelta.heapUsedDelta.toFixed(2)} MB`
    );
    console.log(
      `   RSS 变化：${result.memoryDelta.rssDelta >= 0 ? '+' : ''}${result.memoryDelta.rssDelta.toFixed(2)} MB`
    );
  }
}

// ============================================
// 示例 4: 性能对比 - 循环 vs Map
// ============================================

async function example4_LoopVsMap() {
  console.log('\n' + '='.repeat(60));
  console.log('示例 4: 性能对比 - For 循环 vs Array.map');
  console.log('='.repeat(60) + '\n');

  const comparison = await compare(
    // 基准：传统 for 循环
    () => {
      const arr: number[] = [];
      for (let i = 0; i < 1000; i++) {
        arr.push(i * 2);
      }
    },
    // 候选：Array.from + map
    () => {
      Array.from({ length: 1000 }).map((_, i) => i * 2);
    },
    {
      name: 'Loop vs Map',
      iterations: 1000,
      warmupIterations: 100,
      verbose: false,
    }
  );

  console.log(comparison.summary);
  console.log(`\n详细对比:`);
  console.log(`  基准方案平均：${comparison.baseline.avgDuration.toFixed(3)} ms`);
  console.log(`  候选方案平均：${comparison.candidate.avgDuration.toFixed(3)} ms`);
  console.log(`  性能提升：${comparison.improvement >= 0 ? '+' : ''}${comparison.improvement.toFixed(2)}%`);
  console.log(`  速度倍数：${comparison.speedup.toFixed(2)}x`);
}

// ============================================
// 示例 5: 性能对比 - 字符串拼接方法
// ============================================

async function example5_StringConcatenation() {
  console.log('\n' + '='.repeat(60));
  console.log('示例 5: 性能对比 - 字符串拼接方法');
  console.log('='.repeat(60) + '\n');

  const benchmark = new BenchmarkUtils({
    name: 'String Concatenation',
    iterations: 500,
    warmupIterations: 50,
    verbose: false,
  });

  // 方法 1: + 操作符
  const result1 = await benchmark.run(() => {
    let str = '';
    for (let i = 0; i < 100; i++) {
      str += `Item ${i}, `;
    }
  });

  // 方法 2: Array.join
  const result2 = await benchmark.run(() => {
    const parts: string[] = [];
    for (let i = 0; i < 100; i++) {
      parts.push(`Item ${i}`);
    }
    const str = parts.join(', ');
  });

  // 方法 3: Template literals
  const result3 = await benchmark.run(() => {
    let str = '';
    for (let i = 0; i < 100; i++) {
      str = `${str}Item ${i}, `;
    }
  });

  console.log('📊 字符串拼接性能对比:');
  console.log(`   + 操作符：     ${result1.avgDuration.toFixed(3)} ms (${result1.opsPerSec.toFixed(0)} ops/sec)`);
  console.log(`   Array.join:    ${result2.avgDuration.toFixed(3)} ms (${result2.opsPerSec.toFixed(0)} ops/sec)`);
  console.log(`   模板字符串：   ${result3.avgDuration.toFixed(3)} ms (${result3.opsPerSec.toFixed(0)} ops/sec)`);

  const best = Math.min(result1.avgDuration, result2.avgDuration, result3.avgDuration);
  const bestMethod =
    best === result1.avgDuration
      ? '+ 操作符'
      : best === result2.avgDuration
        ? 'Array.join'
        : '模板字符串';
  console.log(`\n✅ 最佳方法：${bestMethod}`);
}

// ============================================
// 示例 6: 实时内存监控
// ============================================

async function example6_RealTimeMemory() {
  console.log('\n' + '='.repeat(60));
  console.log('示例 6: 实时内存监控');
  console.log('='.repeat(60) + '\n');

  console.log('初始内存状态:');
  const initial = getMemory();
  console.log(`   堆内存：${initial.heapUsed.toFixed(2)} MB / ${initial.heapTotal.toFixed(2)} MB`);
  console.log(`   RSS: ${initial.rss.toFixed(2)} MB`);
  console.log(`   使用率：${initial.heapUsedPercent.toFixed(1)}%`);

  // 模拟内存密集型操作
  console.log('\n执行内存密集型操作...');
  const largeArray = [];
  for (let i = 0; i < 10000; i++) {
    largeArray.push({
      id: i,
      data: new Array(1000).fill(Math.random()),
      timestamp: Date.now(),
    });
  }

  console.log('\n操作后内存状态:');
  const after = getMemory();
  console.log(`   堆内存：${after.heapUsed.toFixed(2)} MB / ${after.heapTotal.toFixed(2)} MB`);
  console.log(`   RSS: ${after.rss.toFixed(2)} MB`);
  console.log(`   使用率：${after.heapUsedPercent.toFixed(1)}%`);

  console.log('\n内存变化:');
  console.log(`   堆内存：+${(after.heapUsed - initial.heapUsed).toFixed(2)} MB`);
  console.log(`   RSS: +${(after.rss - initial.rss).toFixed(2)} MB`);
}

// ============================================
// 示例 7: 高级统计信息
// ============================================

async function example7_AdvancedStats() {
  console.log('\n' + '='.repeat(60));
  console.log('示例 7: 高级统计信息');
  console.log('='.repeat(60) + '\n');

  const benchmark = new BenchmarkUtils({
    name: 'Statistical Analysis',
    iterations: 1000,
    warmupIterations: 100,
    verbose: false,
  });

  const result = await benchmark.run(() => {
    // 模拟可变性能的操作
    const arr = Array.from({ length: 100 }, () => Math.random());
    arr.sort((a, b) => a - b);
    return arr.reduce((sum, val) => sum + val, 0);
  });

  console.log('📊 详细统计分析:');
  console.log(`   平均值：${result.avgDuration.toFixed(3)} ms`);
  console.log(`   中位数：${result.median.toFixed(3)} ms`);
  console.log(`   标准差：${result.stdDev.toFixed(3)} ms`);
  console.log(`   最小值：${result.minDuration.toFixed(3)} ms`);
  console.log(`   最大值：${result.maxDuration.toFixed(3)} ms`);
  console.log(`   P50:    ${result.median.toFixed(3)} ms`);
  console.log(`   P75:    ${result.samples.sort((a, b) => a - b)[Math.floor(result.samples.length * 0.75)].toFixed(3)} ms`);
  console.log(`   P90:    ${result.samples.sort((a, b) => a - b)[Math.floor(result.samples.length * 0.90)].toFixed(3)} ms`);
  console.log(`   P95:    ${result.p95.toFixed(3)} ms`);
  console.log(`   P99:    ${result.p99.toFixed(3)} ms`);
  console.log(`   P99.9:  ${result.samples.sort((a, b) => a - b)[Math.floor(result.samples.length * 0.999)].toFixed(3)} ms`);
}

// ============================================
// 示例 8: 完整对比报告
// ============================================

async function example8_FullComparisonReport() {
  console.log('\n' + '='.repeat(60));
  console.log('示例 8: 完整性能对比报告');
  console.log('='.repeat(60) + '\n');

  const benchmark = new BenchmarkUtils({
    name: 'Algorithm Comparison',
    iterations: 2000,
    warmupIterations: 200,
    verbose: false,
  });

  // 对比两种排序算法
  const comparison = await benchmark.compare(
    // 基准：冒泡排序 (简化版)
    () => {
      const arr = Array.from({ length: 100 }, () => Math.random());
      for (let i = 0; i < arr.length; i++) {
        for (let j = 0; j < arr.length - i - 1; j++) {
          if (arr[j] > arr[j + 1]) {
            [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]];
          }
        }
      }
    },
    // 候选：原生 sort
    () => {
      const arr = Array.from({ length: 100 }, () => Math.random());
      arr.sort((a, b) => a - b);
    }
  );

  console.log(benchmark.formatComparison(comparison));
}

// ============================================
// 示例 9: 使用快捷函数
// ============================================

async function example9_QuickFunctions() {
  console.log('\n' + '='.repeat(60));
  console.log('示例 9: 使用快捷函数');
  console.log('='.repeat(60) + '\n');

  // 使用 benchmark 快捷函数
  console.log('1. 快速基准测试:');
  const result = await benchmark(
    () => {
      const arr = [1, 2, 3, 4, 5];
      return arr.map(x => x * 2);
    },
    { name: 'Quick Test', iterations: 500 }
  );
  console.log(`   平均耗时：${result.avgDuration.toFixed(3)} ms`);

  // 使用 compare 快捷函数
  console.log('\n2. 快速对比:');
  const comp = await compare(
    () => JSON.stringify({ a: 1, b: 2 }),
    () => JSON.parse(JSON.stringify({ a: 1, b: 2 })),
    { name: 'Stringify vs Parse', iterations: 1000 }
  );
  console.log(`   ${comp.summary}`);
}

// ============================================
// 示例 10: 实际应用场景 - API 响应时间测试
// ============================================

async function example10_APIResponseTime() {
  console.log('\n' + '='.repeat(60));
  console.log('示例 10: 实际应用场景 - API 响应时间模拟');
  console.log('='.repeat(60) + '\n');

  const benchmark = new BenchmarkUtils({
    name: 'API Response Time Simulation',
    iterations: 100,
    warmupIterations: 10,
    collectMemory: true,
    verbose: true,
  });

  // 模拟 API 调用
  const result = await benchmark.run(async () => {
    // 模拟网络延迟 (20-50ms)
    const delay = 20 + Math.random() * 30;
    await new Promise(resolve => setTimeout(resolve, delay));

    // 模拟数据处理
    const data = {
      id: Math.random(),
      timestamp: Date.now(),
      payload: Array.from({ length: 100 }, () => Math.random()),
    };

    return data;
  });

  console.log('\n📡 API 性能指标:');
  console.log(`   平均响应时间：${result.avgDuration.toFixed(2)} ms`);
  console.log(`   P95 响应时间：${result.p95.toFixed(2)} ms`);
  console.log(`   P99 响应时间：${result.p99.toFixed(2)} ms`);
  console.log(`   最大响应时间：${result.maxDuration.toFixed(2)} ms`);
  console.log(`   请求/秒：${result.opsPerSec.toFixed(2)} req/s`);
}

// ============================================
// 运行所有示例
// ============================================

async function runAllExamples() {
  console.log('\n' + '🚀'.repeat(30));
  console.log('Benchmark Utils - 完整示例演示');
  console.log('🚀'.repeat(30) + '\n');

  try {
    await example1_BasicBenchmark();
    await example2_AsyncBenchmark();
    await example3_MemoryAnalysis();
    await example4_LoopVsMap();
    await example5_StringConcatenation();
    await example6_RealTimeMemory();
    await example7_AdvancedStats();
    await example8_FullComparisonReport();
    await example9_QuickFunctions();
    await example10_APIResponseTime();

    console.log('\n' + '✅'.repeat(30));
    console.log('所有示例运行完成!');
    console.log('✅'.repeat(30) + '\n');
  } catch (error) {
    console.error('❌ 示例运行失败:', error);
  }
}

// ============================================
// 导出示例函数 (供外部调用)
// ============================================

export {
  example1_BasicBenchmark,
  example2_AsyncBenchmark,
  example3_MemoryAnalysis,
  example4_LoopVsMap,
  example5_StringConcatenation,
  example6_RealTimeMemory,
  example7_AdvancedStats,
  example8_FullComparisonReport,
  example9_QuickFunctions,
  example10_APIResponseTime,
  runAllExamples,
};

// ============================================
// 如果直接运行此文件
// ============================================

// 取消注释以下行以直接运行所有示例:
// runAllExamples();
