/**
 * Benchmark Utils - 单元测试
 * 
 * 测试覆盖:
 * 1. 基础性能测量
 * 2. 内存分析
 * 3. 性能对比
 * 4. 统计计算
 * 5. 格式化输出
 * 
 * @author Axon (KAEL Engineering)
 * @since 2026-03-13
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  BenchmarkUtils,
  createBenchmark,
  benchmark,
  compare,
  getMemory,
} from './benchmark-utils-skill';
import type { BenchmarkResult, ComparisonResult } from './benchmark-utils-skill';

describe('BenchmarkUtils', () => {
  let benchmark: BenchmarkUtils;

  beforeEach(() => {
    benchmark = new BenchmarkUtils({
      name: 'Test Benchmark',
      iterations: 100,
      warmupIterations: 10,
      verbose: false,
    });
  });

  describe('构造函数', () => {
    it('应该使用默认配置创建实例', () => {
      const bm = new BenchmarkUtils();
      expect(bm).toBeDefined();
    });

    it('应该接受自定义配置', () => {
      const bm = new BenchmarkUtils({
        name: 'Custom Test',
        iterations: 50,
        warmupIterations: 5,
        collectMemory: false,
        verbose: true,
      });
      expect(bm).toBeDefined();
    });
  });

  describe('run() - 基础性能测试', () => {
    it('应该测量同步函数的执行时间', async () => {
      const result = await benchmark.run(() => {
        const arr: number[] = [];
        for (let i = 0; i < 100; i++) {
          arr.push(i * 2);
        }
      });

      expect(result).toBeDefined();
      expect(result.name).toBe('Test Benchmark');
      expect(result.iterations).toBe(100);
      expect(result.avgDuration).toBeGreaterThan(0);
      expect(result.duration).toBeGreaterThan(0);
      expect(result.samples).toHaveLength(100);
    });

    it('应该测量异步函数的执行时间', async () => {
      const result = await benchmark.run(async () => {
        await new Promise(resolve => setTimeout(resolve, 1));
      });

      expect(result).toBeDefined();
      expect(result.avgDuration).toBeGreaterThanOrEqual(1);
    });

    it('应该计算正确的统计数据', async () => {
      const result = await benchmark.run(() => {
        Math.random();
      });

      expect(result.minDuration).toBeLessThanOrEqual(result.avgDuration);
      expect(result.maxDuration).toBeGreaterThanOrEqual(result.avgDuration);
      expect(result.median).toBeGreaterThanOrEqual(result.minDuration);
      expect(result.median).toBeLessThanOrEqual(result.maxDuration);
      expect(result.p95).toBeGreaterThanOrEqual(result.median);
      expect(result.p99).toBeGreaterThanOrEqual(result.p95);
    });

    it('应该计算吞吐量 (ops/sec)', async () => {
      const result = await benchmark.run(() => {
        const x = 1 + 1;
      });

      expect(result.opsPerSec).toBeGreaterThan(0);
    });

    it('应该收集内存数据 (当 enabled)', async () => {
      const bm = new BenchmarkUtils({
        iterations: 10,
        warmupIterations: 0,
        collectMemory: true,
      });

      const result = await bm.run(() => {
        const arr = new Array(1000).fill(0);
      });

      expect(result.memory).toBeDefined();
      expect(result.memoryDelta).toBeDefined();
      expect(result.memory!.heapUsed).toBeGreaterThan(0);
      expect(result.memory!.rss).toBeGreaterThan(0);
    });

    it('应该不收集内存数据 (当 disabled)', async () => {
      const bm = new BenchmarkUtils({
        iterations: 10,
        warmupIterations: 0,
        collectMemory: false,
      });

      const result = await bm.run(() => {
        const arr = new Array(1000).fill(0);
      });

      expect(result.memory).toBeUndefined();
      expect(result.memoryDelta).toBeUndefined();
    });

    it('应该执行预热', async () => {
      let warmupCount = 0;
      let testCount = 0;

      const bm = new BenchmarkUtils({
        iterations: 10,
        warmupIterations: 5,
      });

      await bm.run(() => {
        testCount++;
      });

      // 预热 + 正式测试
      expect(testCount).toBe(15);
    });

    it('应该允许自定义配置覆盖默认配置', async () => {
      const result = await benchmark.run(
        () => {
          Math.random();
        },
        {
          name: 'Override Test',
          iterations: 50,
        }
      );

      expect(result.name).toBe('Override Test');
      expect(result.iterations).toBe(50);
      expect(result.samples).toHaveLength(50);
    });
  });

  describe('compare() - 性能对比', () => {
    it('应该比较两个函数的性能', async () => {
      const comparison = await benchmark.compare(
        () => {
          const arr = [];
          for (let i = 0; i < 100; i++) arr.push(i);
        },
        () => {
          const arr = Array.from({ length: 100 }, (_, i) => i);
        }
      );

      expect(comparison).toBeDefined();
      expect(comparison.baseline).toBeDefined();
      expect(comparison.candidate).toBeDefined();
      expect(typeof comparison.improvement).toBe('number');
      expect(typeof comparison.speedup).toBe('number');
      expect(typeof comparison.significant).toBe('boolean');
      expect(typeof comparison.confidence).toBe('number');
      expect(typeof comparison.summary).toBe('string');
    });

    it('应该计算正确的性能提升百分比', async () => {
      const comparison = await benchmark.compare(
        () => {
          // 较慢的实现
          let sum = 0;
          for (let i = 0; i < 1000; i++) sum += i;
        },
        () => {
          // 较快的实现
          const sum = (999 * 1000) / 2;
        }
      );

      // 候选应该更快，improvement 应该为正
      expect(comparison.candidate.avgDuration).toBeLessThan(
        comparison.baseline.avgDuration
      );
      expect(comparison.improvement).toBeGreaterThan(0);
      expect(comparison.speedup).toBeGreaterThan(1);
    });

    it('应该生成有意义的总结', async () => {
      const comparison = await benchmark.compare(
        () => Math.random(),
        () => Math.random() * 2
      );

      expect(comparison.summary).toBeDefined();
      expect(comparison.summary.length).toBeGreaterThan(0);
    });
  });

  describe('getMemorySnapshot()', () => {
    it('应该返回当前内存快照', () => {
      const memory = benchmark.getMemorySnapshot();

      expect(memory).toBeDefined();
      expect(memory.heapUsed).toBeGreaterThan(0);
      expect(memory.heapTotal).toBeGreaterThan(0);
      expect(memory.rss).toBeGreaterThan(0);
      expect(memory.external).toBeGreaterThanOrEqual(0);
      expect(memory.heapUsedPercent).toBeGreaterThan(0);
      expect(memory.heapUsedPercent).toBeLessThanOrEqual(100);
    });

    it('应该返回合理的内存值', () => {
      const memory = benchmark.getMemorySnapshot();

      // 堆使用应该小于堆总量
      expect(memory.heapUsed).toBeLessThanOrEqual(memory.heapTotal);

      // RSS 通常大于堆总量
      expect(memory.rss).toBeGreaterThanOrEqual(memory.heapTotal);
    });
  });

  describe('formatResult()', () => {
    it('应该格式化结果为字符串', async () => {
      const result = await benchmark.run(() => Math.random());
      const formatted = benchmark.formatResult(result);

      expect(typeof formatted).toBe('string');
      expect(formatted).toContain('📊');
      expect(formatted).toContain(result.name);
      expect(formatted).toContain(result.avgDuration.toFixed(3));
    });

    it('应该包含所有统计信息', async () => {
      const result = await benchmark.run(() => Math.random());
      const formatted = benchmark.formatResult(result);

      expect(formatted).toContain('平均耗时');
      expect(formatted).toContain('中位数');
      expect(formatted).toContain('标准差');
      expect(formatted).toContain('P95');
      expect(formatted).toContain('P99');
      expect(formatted).toContain('吞吐量');
    });

    it('应该包含内存信息 (当收集)', async () => {
      const bm = new BenchmarkUtils({
        iterations: 10,
        collectMemory: true,
      });

      const result = await bm.run(() => new Array(1000).fill(0));
      const formatted = bm.formatResult(result);

      expect(formatted).toContain('堆内存');
      expect(formatted).toContain('RSS');
    });
  });

  describe('formatComparison()', () => {
    it('应该格式化对比结果为字符串', async () => {
      const comparison = await benchmark.compare(
        () => Math.random(),
        () => Math.random()
      );

      const formatted = benchmark.formatComparison(comparison);

      expect(typeof formatted).toBe('string');
      expect(formatted).toContain('📊 性能对比报告');
      expect(formatted).toContain('基准方案');
      expect(formatted).toContain('候选方案');
      expect(formatted).toContain('性能分析');
      expect(formatted).toContain('总结');
    });
  });
});

describe('快捷函数', () => {
  describe('createBenchmark()', () => {
    it('应该创建 BenchmarkUtils 实例', () => {
      const bm = createBenchmark({ iterations: 50 });
      expect(bm).toBeInstanceOf(BenchmarkUtils);
    });
  });

  describe('benchmark()', () => {
    it('应该运行基准测试', async () => {
      const result = await benchmark(() => Math.random(), {
        iterations: 10,
      });

      expect(result).toBeDefined();
      expect(result.avgDuration).toBeGreaterThan(0);
    });
  });

  describe('compare()', () => {
    it('应该比较两个函数', async () => {
      const comparison = await compare(
        () => Math.random(),
        () => Math.random() * 2,
        { iterations: 10 }
      );

      expect(comparison).toBeDefined();
      expect(comparison.summary).toBeDefined();
    });
  });

  describe('getMemory()', () => {
    it('应该获取内存快照', () => {
      const memory = getMemory();

      expect(memory).toBeDefined();
      expect(memory.heapUsed).toBeGreaterThan(0);
    });
  });
});

describe('统计计算', () => {
  it('应该处理极端的性能波动', async () => {
    const bm = new BenchmarkUtils({
      iterations: 100,
      warmupIterations: 0,
    });

    let callCount = 0;
    const result = await bm.run(() => {
      callCount++;
      // 模拟性能波动
      if (callCount % 10 === 0) {
        const start = performance.now();
        while (performance.now() - start < 10) {
          // 故意延迟
        }
      }
    });

    expect(result.stdDev).toBeGreaterThan(0);
    expect(result.p99).toBeGreaterThanOrEqual(result.p95);
  });

  it('应该处理快速函数', async () => {
    const bm = new BenchmarkUtils({
      iterations: 1000,
      warmupIterations: 100,
    });

    const result = await bm.run(() => 1 + 1);

    expect(result.avgDuration).toBeGreaterThanOrEqual(0);
    expect(result.opsPerSec).toBeGreaterThan(0);
  });

  it('应该处理慢速函数', async () => {
    const bm = new BenchmarkUtils({
      iterations: 10,
      warmupIterations: 0,
    });

    const result = await bm.run(async () => {
      await new Promise(resolve => setTimeout(resolve, 50));
    });

    expect(result.avgDuration).toBeGreaterThanOrEqual(50);
    expect(result.duration).toBeGreaterThanOrEqual(500);
  });
});

describe('边缘情况', () => {
  it('应该处理零迭代次数', async () => {
    const bm = new BenchmarkUtils({
      iterations: 0,
      warmupIterations: 0,
    });

    const result = await bm.run(() => Math.random());

    expect(result.iterations).toBe(0);
    expect(result.samples).toHaveLength(0);
    expect(result.avgDuration).toBe(0);
  });

  it('应该处理抛出错误的函数', async () => {
    const bm = new BenchmarkUtils({
      iterations: 10,
    });

    await expect(
      bm.run(() => {
        throw new Error('Test error');
      })
    ).rejects.toThrow('Test error');
  });

  it('应该处理异步错误', async () => {
    const bm = new BenchmarkUtils({
      iterations: 10,
    });

    await expect(
      bm.run(async () => {
        await Promise.reject(new Error('Async error'));
      })
    ).rejects.toThrow('Async error');
  });
});

describe('性能测试', () => {
  it('应该在合理时间内完成测试', async () => {
    const bm = new BenchmarkUtils({
      iterations: 100,
      warmupIterations: 10,
    });

    const startTime = Date.now();

    await bm.run(() => {
      const arr = Array.from({ length: 100 }, () => Math.random());
      arr.sort((a, b) => a - b);
    });

    const duration = Date.now() - startTime;

    // 应该在 10 秒内完成
    expect(duration).toBeLessThan(10000);
  });
});
