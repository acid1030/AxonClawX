# Strategy Pattern Pro Skill - 使用示例

**版本:** 2.0.0  
**作者:** Axon (KAEL Engineering)  
**创建时间:** 2026-03-13

---

## 📋 目录

1. [快速开始](#快速开始)
2. [策略定义](#策略定义)
3. [策略切换](#策略切换)
4. [策略组合](#策略组合)
5. [高级用法](#高级用法)
6. [实战场景](#实战场景)

---

## 🚀 快速开始

### 基础示例

```typescript
import { 
  StrategyRegistryPro, 
  QuickSortStrategyPro,
  StrategyContext 
} from './strategy-pattern-pro-skill';

// 1. 获取注册表实例
const registry = StrategyRegistryPro.getInstance();

// 2. 注册策略
registry.register(new QuickSortStrategyPro());

// 3. 执行策略
const result = await registry.executeStrategy('quick-sort-pro', {
  data: [64, 34, 25, 12, 22, 11, 90]
});

console.log(result);
// {
//   success: true,
//   data: [11, 12, 22, 25, 34, 64, 90],
//   strategyName: 'quick-sort-pro',
//   executionTime: 2,
//   metadata: { algorithm: 'quick-sort', comparisons: 12 }
// }
```

---

## 📖 策略定义

### 创建自定义策略

```typescript
import { 
  IStrategy, 
  StrategyContext, 
  StrategyResult,
  StrategyPriority 
} from './strategy-pattern-pro-skill';

/**
 * 自定义数据验证策略
 */
class DataValidationStrategy implements IStrategy<any, boolean> {
  readonly name = 'data-validation';
  readonly description = '数据验证策略 - 检查数据完整性';
  readonly version = '1.0.0';
  readonly priority = StrategyPriority.HIGH;
  readonly tags = ['validation', 'quality'];

  // 输入验证
  validate(context: StrategyContext<any>): boolean {
    return context.data !== null && context.data !== undefined;
  }

  // 前置处理
  beforeExecute(context: StrategyContext<any>): StrategyContext<any> {
    console.log('开始验证数据...');
    return {
      ...context,
      metadata: {
        ...context.metadata,
        validationStart: Date.now()
      }
    };
  }

  // 执行策略
  async execute(context: StrategyContext<any>): Promise<StrategyResult<boolean>> {
    const data = context.data;
    
    // 验证逻辑
    const isValid = this.performValidation(data);
    
    return {
      success: isValid,
      data: isValid,
      strategyName: this.name,
      metadata: {
        dataType: typeof data,
        isEmpty: data === null || data === undefined
      }
    };
  }

  // 后置处理
  afterExecute(result: StrategyResult<boolean>): StrategyResult<boolean> {
    const duration = Date.now() - (result.metadata?.validationStart as number);
    return {
      ...result,
      metadata: {
        ...result.metadata,
        validationDuration: duration
      }
    };
  }

  private performValidation(data: any): boolean {
    // 实际验证逻辑
    if (Array.isArray(data)) {
      return data.length > 0;
    }
    if (typeof data === 'object') {
      return Object.keys(data).length > 0;
    }
    return data !== null && data !== undefined;
  }
}

// 注册自定义策略
registry.register(new DataValidationStrategy());
```

### 策略元数据

```typescript
// 查看策略信息
const strategies = registry.listStrategies();
strategies.forEach(s => {
  console.log(`名称：${s.name}`);
  console.log(`版本：${s.version}`);
  console.log(`优先级：${s.priority}`);
  console.log(`标签：${s.tags.join(', ')}`);
  console.log(`执行次数：${s.executionCount}`);
  console.log(`平均耗时：${s.avgExecutionTime?.toFixed(2)}ms`);
});
```

---

## 🔄 策略切换

### 设置活跃策略

```typescript
// 设置活跃策略
registry.setActiveStrategy('quick-sort-pro');

// 执行活跃策略
const result = await registry.executeActive({
  data: [5, 2, 8, 1, 9]
});

// 查看当前活跃策略
const activeStrategy = registry.getActiveStrategy();
console.log(`当前活跃策略：${activeStrategy}`);
```

### 动态切换策略

```typescript
// 运行时动态切换
const strategies = ['quick-sort-pro', 'merge-sort-pro'];

for (const strategyName of strategies) {
  registry.setActiveStrategy(strategyName);
  const result = await registry.executeActive({
    data: [64, 34, 25, 12]
  });
  console.log(`${strategyName}: ${result.executionTime}ms`);
}
```

### 条件切换策略

```typescript
// 根据数据特征自动选择策略
function selectOptimalStrategy(data: number[]): string {
  if (data.length < 10) {
    return 'quick-sort-pro'; // 小数据量用快速排序
  } else if (data.length < 1000) {
    return 'merge-sort-pro'; // 中等数据量用归并排序
  } else {
    return 'quick-sort-pro'; // 大数据量用快速排序
  }
}

const optimalStrategy = selectOptimalStrategy(testData);
registry.setActiveStrategy(optimalStrategy);
```

---

## 🔗 策略组合

### 管道模式 (Pipeline)

数据依次通过多个策略处理：

```typescript
import { FilterStrategy, TransformStrategy } from './strategy-pattern-pro-skill';

// 注册基础策略
registry.register(new FilterStrategy());
registry.register(new TransformStrategy());
registry.register(new MergeSortStrategyPro());

// 创建管道：过滤偶数 → 翻倍 → 排序
const composer = registry.getComposer();
const pipeline = composer.createPipeline([
  'filter-even',
  'transform-double',
  'merge-sort-pro'
]);

// 注册管道策略
registry.register(pipeline);

// 执行管道
const result = await registry.executeStrategy('pipeline', {
  data: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
});

console.log(result.data);
// 原始数据：[1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
// 过滤偶数：[2, 4, 6, 8, 10]
// 翻倍：[4, 8, 12, 16, 20]
// 排序：[4, 8, 12, 16, 20]
```

### 并行模式 (Parallel)

同时执行多个策略，比较结果：

```typescript
// 创建并行策略
const parallel = composer.createParallel([
  'quick-sort-pro',
  'merge-sort-pro'
]);

registry.register(parallel);

// 执行并行策略
const result = await registry.executeStrategy('parallel', {
  data: [64, 34, 25, 12, 22, 11, 90, 87, 45, 33]
});

// 比较不同策略的性能
result.data.forEach((r, i) => {
  console.log(`策略 ${i + 1}: ${r.strategyName}`);
  console.log(`  耗时：${r.executionTime}ms`);
  console.log(`  成功：${r.success}`);
  console.log(`  结果：[${r.data.join(', ')}]`);
});
```

### 链式模式 (Chain)

根据前一个策略的结果动态决定下一个策略：

```typescript
// 创建链式策略，带自定义决策函数
const chain = composer.createChain(
  ['data-validation', 'quick-sort-pro', 'merge-sort-pro'],
  (result, context) => {
    // 根据结果决定下一个策略
    if (!result.success) {
      return null; // 停止链式执行
    }
    
    // 如果数据量大于 100，使用归并排序
    const data = context.data as number[];
    if (data.length > 100) {
      return 'merge-sort-pro';
    }
    
    // 否则使用快速排序
    return 'quick-sort-pro';
  }
);

registry.register(chain);
```

### 降级模式 (Fallback)

失败时自动尝试下一个策略：

```typescript
// 创建降级策略：优先使用快速排序，失败则尝试归并排序
const fallback = composer.createFallback([
  'quick-sort-pro',
  'merge-sort-pro',
  'bubble-sort' // 假设这个策略不存在或失败
]);

registry.register(fallback);

// 执行降级策略
const result = await registry.executeStrategy('fallback', {
  data: [5, 3, 8, 1, 9]
});

console.log(`最终成功策略：${(result.metadata as any)?.successfulStrategy}`);
console.log(`尝试历史：`, (result.metadata as any)?.attempts);
```

---

## 🎯 高级用法

### 策略统计与监控

```typescript
// 执行多次后查看统计
for (let i = 0; i < 10; i++) {
  await registry.executeStrategy('quick-sort-pro', {
    data: Array.from({ length: 100 }, () => Math.random() * 1000)
  });
}

// 获取统计数据
const stats = registry.getStats('quick-sort-pro');
console.log('执行统计:', stats);
// {
//   totalExecutions: 10,
//   successfulExecutions: 10,
//   failedExecutions: 0,
//   avgExecutionTime: 1.23,
//   minExecutionTime: 0.8,
//   maxExecutionTime: 2.1
// }

// 获取所有策略统计
const allStats = registry.getAllStats();
allStats.forEach((stats, name) => {
  console.log(`${name}: ${stats.totalExecutions} 次执行`);
});
```

### 按标签筛选策略

```typescript
// 获取所有排序策略
const sortingStrategies = registry.getStrategiesByTag('sorting');
console.log('排序策略:', sortingStrategies.map(s => s.name));

// 获取所有转换策略
const transformStrategies = registry.getStrategiesByTag('transform');
console.log('转换策略:', transformStrategies.map(s => s.name));
```

### 按优先级排序

```typescript
// 获取按优先级排序的策略列表
const prioritized = registry.getStrategiesByPriority();
prioritized.forEach(s => {
  console.log(`[${s.priority}] ${s.name}`);
});
```

### 策略生命周期钩子

```typescript
class AdvancedStrategy implements IStrategy<number[], number[]> {
  readonly name = 'advanced-strategy';
  readonly description = '带完整生命周期的策略';
  readonly version = '1.0.0';
  readonly priority = StrategyPriority.HIGH;
  readonly tags = ['advanced', 'lifecycle'];

  validate(context: StrategyContext<number[]>): boolean {
    console.log('[验证] 检查输入数据...');
    return Array.isArray(context.data);
  }

  beforeExecute(context: StrategyContext<number[]>): StrategyContext<number[]> {
    console.log('[前置] 准备执行环境...');
    return {
      ...context,
      metadata: {
        ...context.metadata,
        startTime: Date.now(),
        inputDataHash: this.hashData(context.data)
      }
    };
  }

  async execute(context: StrategyContext<number[]>): Promise<StrategyResult<number[]>> {
    console.log('[执行] 处理数据...');
    // 实际执行逻辑
    return {
      success: true,
      data: context.data.map(x => x * 2),
      strategyName: this.name
    };
  }

  afterExecute(result: StrategyResult<number[]>): StrategyResult<number[]> {
    console.log('[后置] 清理和验证...');
    const duration = Date.now() - (result.metadata?.startTime as number);
    return {
      ...result,
      metadata: {
        ...result.metadata,
        endTime: Date.now(),
        totalDuration: duration,
        outputDataHash: this.hashData(result.data)
      }
    };
  }

  private hashData(data: number[]): string {
    return data.join(',');
  }
}
```

---

## 💼 实战场景

### 场景 1: 数据清洗管道

```typescript
// 定义数据清洗策略
class RemoveNullsStrategy implements IStrategy<any[], any[]> {
  readonly name = 'remove-nulls';
  readonly description = '移除空值';
  readonly version = '1.0.0';
  readonly tags = ['cleaning', 'data'];

  async execute(context: StrategyContext<any[]>): Promise<StrategyResult<any[]>> {
    const cleaned = context.data.filter(x => x !== null && x !== undefined);
    return {
      success: true,
      data: cleaned,
      strategyName: this.name,
      metadata: { removedCount: context.data.length - cleaned.length }
    };
  }
}

class DeduplicateStrategy implements IStrategy<any[], any[]> {
  readonly name = 'deduplicate';
  readonly description = '去重';
  readonly version = '1.0.0';
  readonly tags = ['cleaning', 'data'];

  async execute(context: StrategyContext<any[]>): Promise<StrategyResult<any[]>> {
    const unique = [...new Set(context.data)];
    return {
      success: true,
      data: unique,
      strategyName: this.name,
      metadata: { removedCount: context.data.length - unique.length }
    };
  }
}

// 创建数据清洗管道
const cleaningPipeline = composer.createPipeline([
  'remove-nulls',
  'deduplicate',
  'quick-sort-pro'
]);

registry.register(new RemoveNullsStrategy());
registry.register(new DeduplicateStrategy());
registry.register(cleaningPipeline);

// 使用
const rawData = [3, 1, null, 2, 3, undefined, 1, 5, 2];
const result = await registry.executeStrategy('pipeline', {
  data: rawData
});

console.log(`原始数据：[${rawData.join(', ')}]`);
console.log(`清洗后：[${result.data.join(', ')}]`);
```

### 场景 2: A/B 测试策略比较

```typescript
// 并行执行多个策略进行 A/B 测试
const abTestStrategies = ['quick-sort-pro', 'merge-sort-pro'];
const parallel = composer.createParallel(abTestStrategies);
registry.register(parallel);

const testData = Array.from({ length: 1000 }, () => Math.random() * 10000);
const result = await registry.executeStrategy('parallel', {
  data: testData
});

// 分析结果
const winner = result.data.reduce((best, current) => {
  return (current.executionTime || 0) < (best.executionTime || 0) ? current : best;
});

console.log(`🏆 获胜策略：${winner.strategyName}`);
console.log(`⏱️  执行时间：${winner.executionTime}ms`);
```

### 场景 3: 弹性降级系统

```typescript
// 创建多级降级策略
const resilientStrategy = composer.createFallback([
  'premium-sort',      // 高级策略 (可能不存在或失败)
  'quick-sort-pro',    // 标准策略
  'merge-sort-pro',    // 备选策略
  'basic-sort'         // 基础策略 (保底)
]);

registry.register(resilientStrategy);

// 即使某些策略失败，系统仍能正常工作
const result = await registry.executeStrategy('fallback', {
  data: [5, 3, 8, 1, 9]
});

if (result.success) {
  console.log(`✅ 成功，使用策略：${(result.metadata as any)?.successfulStrategy}`);
} else {
  console.log(`❌ 所有策略都失败了`);
}
```

### 场景 4: 动态策略路由

```typescript
// 根据数据特征自动选择最优策略
class SmartSortStrategy implements IStrategy<number[], number[]> {
  readonly name = 'smart-sort';
  readonly description = '智能排序 - 自动选择最优算法';
  readonly version = '1.0.0';
  readonly tags = ['sorting', 'smart', 'adaptive'];

  async execute(context: StrategyContext<number[]>): Promise<StrategyResult<number[]>> {
    const data = context.data as number[];
    const registry = StrategyRegistryPro.getInstance();
    
    // 根据数据量选择策略
    let strategyName: string;
    if (data.length < 10) {
      strategyName = 'quick-sort-pro';
    } else if (data.length < 1000) {
      strategyName = 'merge-sort-pro';
    } else {
      strategyName = 'quick-sort-pro';
    }
    
    // 执行选中的策略
    return registry.executeStrategy(strategyName, context);
  }
}

registry.register(new SmartSortStrategy());
```

---

## 📊 性能优化建议

### 1. 策略缓存

```typescript
// 缓存频繁使用的策略结果
const cache = new Map<string, any>();

class CachedStrategy implements IStrategy<string, any> {
  readonly name = 'cached-strategy';
  readonly description = '带缓存的策略';
  readonly version = '1.0.0';

  async execute(context: StrategyContext<string>): Promise<StrategyResult<any>> {
    const cacheKey = JSON.stringify(context.data);
    
    // 检查缓存
    if (cache.has(cacheKey)) {
      return {
        success: true,
        data: cache.get(cacheKey),
        strategyName: this.name,
        metadata: { fromCache: true }
      };
    }
    
    // 执行实际计算
    const result = await this.expensiveComputation(context.data);
    cache.set(cacheKey, result);
    
    return {
      success: true,
      data: result,
      strategyName: this.name,
      metadata: { fromCache: false }
    };
  }

  private async expensiveComputation(data: string): Promise<any> {
    // 模拟耗时计算
    await new Promise(resolve => setTimeout(resolve, 100));
    return data.toUpperCase();
  }
}
```

### 2. 策略预加载

```typescript
// 预加载常用策略
async function preloadStrategies(): Promise<void> {
  const registry = StrategyRegistryPro.getInstance();
  
  // 预热策略 (执行一次以初始化)
  await registry.executeStrategy('quick-sort-pro', {
    data: [1, 2, 3]
  });
  
  console.log('策略预加载完成');
}
```

### 3. 批量执行

```typescript
// 批量执行相同策略
async function batchExecute(
  strategyName: string,
  datasets: any[][]
): Promise<StrategyResult<any[]>[]> {
  const registry = StrategyRegistryPro.getInstance();
  
  const promises = datasets.map(data =>
    registry.executeStrategy(strategyName, { data })
  );
  
  return Promise.all(promises);
}

// 使用
const datasets = [
  [5, 3, 8],
  [1, 9, 2],
  [7, 4, 6]
];

const results = await batchExecute('quick-sort-pro', datasets);
```

---

## 🎓 最佳实践

### 1. 策略命名规范

```typescript
// ✅ 好的命名
class QuickSortStrategyPro {}  // 清晰描述功能
class DataValidationStrategy {} // 明确表达用途

// ❌ 避免的命名
class Strategy1 {}  // 无意义
class MyStrategy {} // 太模糊
```

### 2. 策略单一职责

```typescript
// ✅ 每个策略只做一件事
class FilterEvenNumbersStrategy {}
class SortNumbersStrategy {}
class TransformNumbersStrategy {}

// ❌ 避免一个策略做太多事
class DoEverythingStrategy {} // 违反单一职责
```

### 3. 错误处理

```typescript
async execute(context: StrategyContext<any>): Promise<StrategyResult<any>> {
  try {
    // 执行逻辑
    return {
      success: true,
      data: result,
      strategyName: this.name
    };
  } catch (error) {
    return {
      success: false,
      data: context.data,
      strategyName: this.name,
      error: error instanceof Error ? error.message : '未知错误',
      metadata: { errorType: 'execution_error' }
    };
  }
}
```

### 4. 策略文档化

```typescript
/**
 * 快速排序策略 Pro 版本
 * 
 * @description 优化的快速排序实现，使用三路快排
 * @complexity O(n log n) 平均时间复杂度
 * @stable 否 (不稳定排序)
 * @inPlace 是 (原地排序)
 * @useCase 适用于大多数通用排序场景
 * @avoid 对稳定性有要求的场景
 */
class QuickSortStrategyPro implements IStrategy<number[], number[]> {
  // ...
}
```

---

## 🔧 故障排除

### 常见问题

**Q: 策略注册失败**
```typescript
// 检查策略名是否已存在
try {
  registry.register(new MyStrategy());
} catch (error) {
  console.error('注册失败:', error.message);
  // 先注销再注册
  registry.unregister('my-strategy');
  registry.register(new MyStrategy());
}
```

**Q: 策略执行超时**
```typescript
// 添加超时控制
async function executeWithTimeout(
  strategyName: string,
  context: StrategyContext<any>,
  timeout: number
): Promise<StrategyResult<any>> {
  const registry = StrategyRegistryPro.getInstance();
  
  const promise = registry.executeStrategy(strategyName, context);
  const timeoutPromise = new Promise<StrategyResult<any>>((_, reject) =>
    setTimeout(() => reject(new Error('执行超时')), timeout)
  );
  
  return Promise.race([promise, timeoutPromise]);
}
```

**Q: 策略组合失败**
```typescript
// 检查组合中的策略是否存在
const strategyNames = ['strategy-a', 'strategy-b', 'strategy-c'];
const missing = strategyNames.filter(name => !registry.getStrategy(name));

if (missing.length > 0) {
  console.error('以下策略未注册:', missing);
} else {
  const pipeline = composer.createPipeline(strategyNames);
  registry.register(pipeline);
}
```

---

## 📚 相关资源

- [策略模式设计原则](https://refactoring.guru/design-patterns/strategy)
- [组合模式最佳实践](https://refactoring.guru/design-patterns/composite)
- [KAEL Engineering 代码规范](../kael-engineering/SKILL.md)

---

**最后更新:** 2026-03-13  
**维护者:** Axon (KAEL Engineering)
