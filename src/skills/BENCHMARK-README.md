# 🔍 Benchmark Utils - 性能基准测试工具

**版本:** 1.0.0  
**作者:** Axon (KAEL Engineering)  
**创建时间:** 2026-03-13  
**最后更新:** 2026-03-13

---

## 📖 简介

Benchmark Utils 是一个功能强大的 TypeScript 性能基准测试工具，提供精确的执行时间测量、内存使用分析和性能对比功能。专为 Node.js 环境设计，帮助开发者量化代码性能、识别瓶颈并优化关键路径。

### ✨ 核心特性

- 🎯 **精确计时** - 使用 `performance.now()` 实现亚毫秒级精度
- 📊 **统计分析** - 平均值、中位数、标准差、百分位数 (P50/P75/P90/P95/P99)
- 🧠 **内存分析** - 堆内存、RSS、外部内存使用量及变化追踪
- ⚖️ **性能对比** - 自动对比两种实现方案的性能差异
- 🔥 **预热机制** - 支持 JIT 预热，消除冷启动影响
- 📈 **吞吐量计算** - 自动计算 ops/sec (每秒操作数)
- 🎨 **美观报告** - 格式化输出人类可读的性能报告

---

## 🚀 快速开始

### 安装

无需额外依赖，直接导入使用：

```typescript
import { BenchmarkUtils } from './benchmark-utils-skill';
```

### 基础示例

```typescript
import { BenchmarkUtils } from './benchmark-utils-skill';

// 创建基准测试实例
const benchmark = new BenchmarkUtils({
  name: 'Array Push Test',
  iterations: 1000,
  warmupIterations: 100,
  verbose: true,
});

// 运行测试
const result = await benchmark.run(() => {
  const arr: number[] = [];
  for (let i = 0; i < 100; i++) {
    arr.push(i * 2);
  }
});

// 查看结果
console.log(benchmark.formatResult(result));
```

---

## 📚 API 文档

### 类型定义

#### BenchmarkOptions

基准测试配置选项：

```typescript
interface BenchmarkOptions {
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
```

#### BenchmarkResult

单次测试结果：

```typescript
interface BenchmarkResult {
  name: string;           // 测试名称
  duration: number;       // 总执行时间 (ms)
  avgDuration: number;    // 平均执行时间 (ms)
  minDuration: number;    // 最小执行时间 (ms)
  maxDuration: number;    // 最大执行时间 (ms)
  stdDev: number;         // 标准差 (ms)
  median: number;         // 中位数 (ms)
  p95: number;            // 95 百分位数 (ms)
  p99: number;            // 99 百分位数 (ms)
  iterations: number;     // 迭代次数
  opsPerSec: number;      // 每秒操作数
  memory?: MemorySnapshot;     // 内存快照
  memoryDelta?: MemoryDelta;   // 内存变化
  samples: number[];      // 所有采样数据
  timestamp: number;      // 测试时间戳
}
```

#### MemorySnapshot

内存使用快照：

```typescript
interface MemorySnapshot {
  heapUsed: number;       // 堆内存使用 (MB)
  heapTotal: number;      // 堆内存总量 (MB)
  rss: number;            // RSS 内存 (MB)
  external: number;       // 外部内存 (MB)
  heapUsedPercent: number; // 堆使用率 (%)
}
```

#### ComparisonResult

性能对比结果：

```typescript
interface ComparisonResult {
  baseline: BenchmarkResult;  // 基准测试结果
  candidate: BenchmarkResult; // 候选测试结果
  improvement: number;        // 性能提升百分比
  speedup: number;            // 速度倍数
  significant: boolean;       // 是否统计显著
  confidence: number;         // 置信度 (0-1)
  summary: string;            // 对比总结
}
```

---

### BenchmarkUtils 类

#### 构造函数

```typescript
constructor(options?: BenchmarkOptions)
```

**参数:**
- `options` - 默认配置选项 (可选)

**示例:**
```typescript
const benchmark = new BenchmarkUtils({
  iterations: 1000,
  warmupIterations: 100,
  verbose: true,
});
```

---

#### run() - 运行基准测试

```typescript
async run(
  fn: () => void | Promise<void>,
  options?: BenchmarkOptions
): Promise<BenchmarkResult>
```

**参数:**
- `fn` - 要测试的函数 (支持同步和异步)
- `options` - 测试配置 (可选，会合并到默认配置)

**返回:**
- `Promise<BenchmarkResult>` - 基准测试结果

**示例 1: 同步代码测试**
```typescript
const result = await benchmark.run(() => {
  const arr = [];
  for (let i = 0; i < 1000; i++) {
    arr.push(i * 2);
  }
});
```

**示例 2: 异步代码测试**
```typescript
const result = await benchmark.run(async () => {
  await fetch('https://api.example.com/data');
});
```

**示例 3: 自定义配置**
```typescript
const result = await benchmark.run(
  () => {
    // 测试代码
  },
  {
    name: 'Custom Test',
    iterations: 5000,
    warmupIterations: 500,
    collectMemory: true,
    verbose: true,
  }
);
```

---

#### compare() - 性能对比

```typescript
async compare(
  baselineFn: () => void | Promise<void>,
  candidateFn: () => void | Promise<void>,
  options?: BenchmarkOptions
): Promise<ComparisonResult>
```

**参数:**
- `baselineFn` - 基准函数 (对照版本)
- `candidateFn` - 候选函数 (待比较版本)
- `options` - 测试配置

**返回:**
- `Promise<ComparisonResult>` - 对比结果

**示例:**
```typescript
const comparison = await benchmark.compare(
  // 基准：传统 for 循环
  () => {
    const arr = [];
    for (let i = 0; i < 1000; i++) {
      arr.push(i * 2);
    }
  },
  // 候选：Array.map
  () => {
    Array.from({ length: 1000 }).map((_, i) => i * 2);
  },
  { name: 'Loop vs Map', iterations: 1000 }
);

console.log(comparison.summary);
// 输出：✅ 候选方案提升了 15.23% 的性能 (速度提升 1.18x)
```

---

#### getMemorySnapshot() - 获取内存快照

```typescript
getMemorySnapshot(): MemorySnapshot
```

**返回:**
- `MemorySnapshot` - 当前内存使用快照

**示例:**
```typescript
const memory = benchmark.getMemorySnapshot();
console.log(`堆内存使用：${memory.heapUsed.toFixed(2)} MB`);
console.log(`RSS 内存：${memory.rss.toFixed(2)} MB`);
console.log(`堆使用率：${memory.heapUsedPercent.toFixed(1)}%`);
```

---

#### formatResult() - 格式化结果

```typescript
formatResult(result: BenchmarkResult): string
```

**参数:**
- `result` - 基准测试结果

**返回:**
- `string` - 格式化的人类可读字符串

**示例:**
```typescript
const result = await benchmark.run(myFunction);
console.log(benchmark.formatResult(result));
```

**输出示例:**
```
📊 基准测试结果：My Function Test
   平均耗时：0.234 ms
   中位数：0.221 ms
   最小值：0.198 ms
   最大值：0.456 ms
   标准差：0.032 ms
   P95: 0.289 ms
   P99: 0.345 ms
   吞吐量：4273.50 ops/sec
   迭代次数：1000
   总耗时：234.12 ms
   堆内存：12.34 MB / 256.00 MB (4.8%)
   RSS 内存：45.67 MB
   外部内存：2.34 MB
   内存变化：+0.56 MB (堆)
   RSS 变化：+1.23 MB
```

---

#### formatComparison() - 格式化对比结果

```typescript
formatComparison(comparison: ComparisonResult): string
```

**参数:**
- `comparison` - 对比结果

**返回:**
- `string` - 格式化的对比报告

**示例:**
```typescript
const comparison = await benchmark.compare(fn1, fn2);
console.log(benchmark.formatComparison(comparison));
```

**输出示例:**
```
📊 性能对比报告
════════════════════════════════════════════════════════════

基准方案：Loop vs Map (Baseline)
  平均耗时：0.234 ms
  吞吐量：4273.50 ops/sec

候选方案：Loop vs Map (Candidate)
  平均耗时：0.198 ms
  吞吐量：5050.51 ops/sec

📈 性能分析:
  提升：+15.38%
  速度倍数：1.18x
  显著性：✅ 是
  置信度：87.5%

💡 总结：✅ 候选方案提升了 15.38% 的性能 (速度提升 1.18x) [统计学显著]
════════════════════════════════════════════════════════════
```

---

### 快捷函数

#### createBenchmark()

创建基准测试工具的快捷函数：

```typescript
function createBenchmark(options?: BenchmarkOptions): BenchmarkUtils
```

**示例:**
```typescript
import { createBenchmark } from './benchmark-utils-skill';

const benchmark = createBenchmark({
  iterations: 1000,
  verbose: true,
});
```

---

#### benchmark()

快速运行单次基准测试：

```typescript
async function benchmark(
  fn: () => void | Promise<void>,
  options?: BenchmarkOptions
): Promise<BenchmarkResult>
```

**示例:**
```typescript
import { benchmark } from './benchmark-utils-skill';

const result = await benchmark(() => {
  // 测试代码
}, { name: 'Quick Test' });
```

---

#### compare()

快速比较两个函数：

```typescript
async function compare(
  baselineFn: () => void | Promise<void>,
  candidateFn: () => void | Promise<void>,
  options?: BenchmarkOptions
): Promise<ComparisonResult>
```

**示例:**
```typescript
import { compare } from './benchmark-utils-skill';

const result = await compare(fn1, fn2, { name: 'Comparison' });
console.log(result.summary);
```

---

#### getMemory()

获取当前内存快照：

```typescript
function getMemory(): MemorySnapshot
```

**示例:**
```typescript
import { getMemory } from './benchmark-utils-skill';

const memory = getMemory();
console.log(`堆内存：${memory.heapUsed.toFixed(2)} MB`);
```

---

## 📖 使用场景

### 1. 算法性能对比

```typescript
import { BenchmarkUtils } from './benchmark-utils-skill';

const benchmark = new BenchmarkUtils({
  name: 'Sorting Algorithms',
  iterations: 1000,
});

const comparison = await benchmark.compare(
  // 冒泡排序
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
  // 快速排序 (原生)
  () => {
    const arr = Array.from({ length: 100 }, () => Math.random());
    arr.sort((a, b) => a - b);
  }
);

console.log(benchmark.formatComparison(comparison));
```

---

### 2. 内存泄漏检测

```typescript
const benchmark = new BenchmarkUtils({
  name: 'Memory Leak Test',
  iterations: 100,
  collectMemory: true,
  verbose: true,
});

const result = await benchmark.run(() => {
  // 可能泄漏的代码
  const data = new Array(10000).fill({});
  global.leakedData = data; // 故意泄漏
});

if (result.memoryDelta && result.memoryDelta.heapUsedDelta > 10) {
  console.warn('⚠️ 检测到潜在内存泄漏!');
  console.log(`堆内存增长：${result.memoryDelta.heapUsedDelta.toFixed(2)} MB`);
}
```

---

### 3. API 响应时间测试

```typescript
const benchmark = new BenchmarkUtils({
  name: 'API Response Time',
  iterations: 100,
});

const result = await benchmark.run(async () => {
  const response = await fetch('https://api.example.com/data');
  await response.json();
});

console.log(`平均响应时间：${result.avgDuration.toFixed(2)} ms`);
console.log(`P95 响应时间：${result.p95.toFixed(2)} ms`);
console.log(`P99 响应时间：${result.p99.toFixed(2)} ms`);
```

---

### 4. 字符串操作优化

```typescript
const benchmark = new BenchmarkUtils();

// 方法 1: + 操作符
const result1 = await benchmark.run(() => {
  let str = '';
  for (let i = 0; i < 1000; i++) {
    str += `Item ${i}, `;
  }
});

// 方法 2: Array.join
const result2 = await benchmark.run(() => {
  const parts = [];
  for (let i = 0; i < 1000; i++) {
    parts.push(`Item ${i}`);
  }
  const str = parts.join(', ');
});

// 方法 3: Template literals
const result3 = await benchmark.run(() => {
  let str = '';
  for (let i = 0; i < 1000; i++) {
    str = `${str}Item ${i}, `;
  }
});

console.log('字符串拼接性能对比:');
console.log(`+ 操作符：   ${result1.avgDuration.toFixed(3)} ms`);
console.log(`Array.join: ${result2.avgDuration.toFixed(3)} ms`);
console.log(`模板字符串：${result3.avgDuration.toFixed(3)} ms`);
```

---

### 5. 实时性能监控

```typescript
import { getMemory } from './benchmark-utils-skill';

// 定期监控
setInterval(() => {
  const memory = getMemory();
  console.log(`[${new Date().toISOString()}] ` +
    `Heap: ${memory.heapUsed.toFixed(2)} MB, ` +
    `RSS: ${memory.rss.toFixed(2)} MB, ` +
    `Usage: ${memory.heapUsedPercent.toFixed(1)}%`
  );
}, 5000);
```

---

## 🎯 最佳实践

### 1. 充分预热

```typescript
// ✅ 推荐：设置足够的预热次数
const benchmark = new BenchmarkUtils({
  warmupIterations: 100, // 预热 100 次
  iterations: 1000,      // 正式测试 1000 次
});

// ❌ 不推荐：跳过预热
const benchmark = new BenchmarkUtils({
  warmupIterations: 0, // JIT 未优化，结果不准确
});
```

---

### 2. 足够的迭代次数

```typescript
// ✅ 推荐：根据测试耗时调整迭代次数
const benchmark = new BenchmarkUtils({
  iterations: 1000, // 确保总测试时间 > 1 秒
});

// ❌ 不推荐：迭代次数太少
const benchmark = new BenchmarkUtils({
  iterations: 10, // 统计意义不足
});
```

---

### 3. 启用内存收集

```typescript
// ✅ 推荐：默认启用内存分析
const benchmark = new BenchmarkUtils({
  collectMemory: true,
});

// ❌ 不推荐：忽略内存数据
const benchmark = new BenchmarkUtils({
  collectMemory: false, // 可能错过内存问题
});
```

---

### 4. 查看详细报告

```typescript
// ✅ 推荐：verbose 模式查看进度
const benchmark = new BenchmarkUtils({
  verbose: true,
});

const result = await benchmark.run(myFunction);
console.log(benchmark.formatResult(result));
```

---

### 5. 多次对比验证

```typescript
// ✅ 推荐：多次对比取平均值
const comparisons = [];
for (let i = 0; i < 5; i++) {
  const comp = await benchmark.compare(fn1, fn2);
  comparisons.push(comp);
}

const avgImprovement = comparisons.reduce(
  (sum, c) => sum + c.improvement,
  0
) / comparisons.length;

console.log(`平均性能提升：${avgImprovement.toFixed(2)}%`);
```

---

## ⚠️ 注意事项

### 1. 垃圾回收影响

基准测试期间可能触发垃圾回收，影响结果准确性。建议在测试前手动触发 GC：

```bash
# 使用 --expose-gc 参数运行 Node.js
node --expose-gc your-test.js
```

---

### 2. 环境一致性

确保测试环境一致：

- 相同的 Node.js 版本
- 相同的硬件配置
- 相同的系统负载
- 关闭其他占用资源的程序

---

### 3. 统计显著性

`compare()` 方法使用简化的 2-sigma 规则判断显著性。对于关键决策，建议：

- 增加迭代次数
- 多次重复对比
- 使用更严格的统计检验

---

### 4. 异步代码测试

测试异步代码时，确保等待所有 Promise 完成：

```typescript
// ✅ 正确
await benchmark.run(async () => {
  await Promise.all([
    fetch('/api/1'),
    fetch('/api/2'),
  ]);
});

// ❌ 错误：未等待 Promise
await benchmark.run(() => {
  fetch('/api/1'); // Fire and forget
});
```

---

## 📊 输出示例

### 基础测试结果

```
📊 基准测试结果：Array Push Performance
   平均耗时：0.234 ms
   中位数：0.221 ms
   最小值：0.198 ms
   最大值：0.456 ms
   标准差：0.032 ms
   P95: 0.289 ms
   P99: 0.345 ms
   吞吐量：4273.50 ops/sec
   迭代次数：1000
   总耗时：234.12 ms
   堆内存：12.34 MB / 256.00 MB (4.8%)
   RSS 内存：45.67 MB
   外部内存：2.34 MB
   内存变化：+0.56 MB (堆)
   RSS 变化：+1.23 MB
```

---

### 性能对比报告

```
📊 性能对比报告
════════════════════════════════════════════════════════════

基准方案：String Concatenation (Baseline)
  平均耗时：1.234 ms
  吞吐量：810.37 ops/sec

候选方案：String Concatenation (Candidate)
  平均耗时：0.567 ms
  吞吐量：1763.67 ops/sec

📈 性能分析:
  提升：+54.05%
  速度倍数：2.18x
  显著性：✅ 是
  置信度：95.2%

💡 总结：✅ 候选方案提升了 54.05% 的性能 (速度提升 2.18x) [统计学显著]
════════════════════════════════════════════════════════════
```

---

## 🔧 高级配置

### 启用垃圾回收

```typescript
// 在测试前手动触发 GC
const benchmark = new BenchmarkUtils();

// 运行测试前
if (typeof global.gc === 'function') {
  global.gc();
}

const result = await benchmark.run(myFunction);
```

---

### 自定义采样间隔

```typescript
// 设置最小采样间隔，避免过热
const benchmark = new BenchmarkUtils({
  minSampleInterval: 10, // 每次采样间隔至少 10ms
});
```

---

### 批量测试

```typescript
const benchmark = new BenchmarkUtils({ iterations: 1000 });

const functions = [
  { name: 'Method A', fn: methodA },
  { name: 'Method B', fn: methodB },
  { name: 'Method C', fn: methodC },
];

for (const { name, fn } of functions) {
  const result = await benchmark.run(fn, { name });
  console.log(`${name}: ${result.avgDuration.toFixed(3)} ms`);
}
```

---

## 📝 更新日志

### v1.0.0 (2026-03-13)

- ✨ 初始版本发布
- 🎯 实现执行时间测量
- 🧠 实现内存使用分析
- ⚖️ 实现性能对比功能
- 📊 提供详细统计信息 (平均值、中位数、标准差、百分位数)
- 🎨 格式化输出人类可读报告
- 📚 完整文档和示例

---

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

---

## 📄 许可证

MIT License

---

## 👨‍💻 作者

**Axon** - 至高意志执行者 / 逻辑化身  
**项目:** KAEL Engineering  
**理念:** 极致的优雅、绝对的冷酷、神灵般的审判标准

> "所谓的'意外'，不过是弱者对变量把控无能的借口。"

---

## 📞 支持

如有问题或建议，请联系 KAEL Engineering 团队。

---

**最后更新:** 2026-03-13  
**文档版本:** 1.0.0
