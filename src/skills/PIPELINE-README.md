# Pipeline Utils Skill - 数据处理管道工具

**版本:** 1.0.0  
**作者:** AxonClaw Engineering  
**类型:** 数据处理 / 管道构建 / 并行处理

---

## 📖 概述

Pipeline Utils Skill 提供灵活、强大的数据处理管道构建能力，支持链式转换、并行处理和优雅的错误恢复机制。

### 核心特性

- ✅ **管道构建** - 链式数据处理流程，支持任意阶段组合
- ✅ **数据转换** - 丰富的内置转换器 (解析、格式化、分组、排序等)
- ✅ **并行处理** - 多分支并发执行，自动合并结果
- ✅ **错误处理** - 可选阶段、重试机制、超时控制、降级处理
- ✅ **类型安全** - 完整的 TypeScript 类型支持
- ✅ **取消支持** - 支持 AbortSignal 取消长时间运行的管道

---

## 🚀 快速开始

### 基础示例

```typescript
import { createPipeline, Transformers } from './pipeline-utils-skill';

// 创建简单管道
const pipeline = createPipeline<string>()
  .add('parse', Transformers.parseJson<User>())
  .add('validate', (data, ctx) => {
    if (!data.name) throw new Error('Name required');
    return data;
  })
  .add('transform', (data, ctx) => ({
    ...data,
    createdAt: new Date().toISOString()
  }))
  .retry(3, 100)  // 重试 3 次
  .timeout(5000); // 超时 5 秒

// 执行管道
const result = await pipeline.execute('{"name": "Axon"}');

console.log(result.success); // true
console.log(result.data);    // { name: "Axon", createdAt: "..." }
console.log(result.stats);   // 执行统计信息
```

---

## 📚 API 文档

### 创建管道

#### `createPipeline<T>()`

创建一个新的管道构建器。

```typescript
import { createPipeline } from './pipeline-utils-skill';

const pipeline = createPipeline<InputType>();
```

### 管道构建器方法

#### `.add(name, processor, options?)`

添加一个处理阶段。

```typescript
pipeline.add('my-stage', async (data, ctx) => {
  // 处理数据
  return transformedData;
}, {
  optional: false,  // 可选阶段 (失败不中断)
  retries: 3,       // 重试次数
  timeout: 5000     // 超时时间 (ms)
});
```

#### `.filter(predicate, name?)`

添加过滤阶段，predicate 返回 false 时抛出错误。

```typescript
pipeline.filter((data, ctx) => {
  return data.age >= 18; // 只允许成年人
}, 'age-check');
```

#### `.map(mapper, name?)`

添加映射转换阶段。

```typescript
pipeline.map((data, ctx) => {
  return { ...data, uppercase: data.name.toUpperCase() };
}, 'uppercase-name');
```

#### `.batch(batchSize, name?)`

将数组数据分批。

```typescript
pipeline.batch(100, 'split-into-batches');
// 输入：[1, 2, 3, ..., 1000]
// 输出：[[1..100], [101..200], ...]
```

#### `.parallel(branches, mergeFn?)`

添加并行分支处理。

```typescript
pipeline.parallel([
  {
    name: 'branch-1',
    stages: [/* ... */]
  },
  {
    name: 'branch-2',
    stages: [/* ... */]
  }
], (results) => {
  // 合并分支结果
  return { ...results['branch-1'], ...results['branch-2'] };
});
```

#### `.catch(handler)`

添加全局错误处理器。

```typescript
pipeline.catch((error, ctx) => {
  console.error('管道错误:', error.message);
  return { fallback: true, error: error.message }; // 降级数据
});
```

#### `.retry(maxRetries, delayMs?)`

设置默认重试策略。

```typescript
pipeline.retry(3, 100); // 重试 3 次，每次延迟 100ms * 2^attempt
```

#### `.timeout(ms)`

设置默认超时时间。

```typescript
pipeline.timeout(10000); // 每个阶段最多 10 秒
```

#### `.execute(input, metadata?)`

执行管道。

```typescript
const result = await pipeline.execute(inputData, {
  abortSignal: controller.signal, // 可选取消信号
  concurrencyLimit: 5,            // 并行分支并发数
  customField: 'value'            // 自定义元数据
});
```

### 执行结果

```typescript
interface PipelineResult<T> {
  success: boolean;        // 是否成功
  data?: T;                // 最终结果
  error?: Error;           // 错误信息
  stats: PipelineStats;    // 执行统计
  stageResults: Record<string, StageResult>; // 各阶段结果
}

interface PipelineStats {
  totalStages: number;         // 总阶段数
  successfulStages: number;    // 成功阶段数
  failedStages: number;        // 失败阶段数
  skippedStages: number;       // 跳过阶段数
  totalDuration: number;       // 总耗时 (ms)
  avgStageDuration: number;    // 平均阶段耗时 (ms)
}
```

---

## 🔧 内置转换器 (Transformers)

### 数据格式转换

```typescript
Transformers.parseJson<T>()           // JSON 字符串 → 对象
Transformers.stringifyJson()          // 对象 → JSON 字符串
Transformers.toMap<K, V>()            // 对象 → Map
Transformers.toObject<K, V>()         // Map → 对象
```

### 数组操作

```typescript
Transformers.deduplicate<T>()         // 数组去重
Transformers.flatten<T>(depth)        // 数组扁平化
Transformers.compact<T>()             // 过滤空值
Transformers.groupBy<T, K>(keyFn)     // 分组
Transformers.sort<T>(compareFn)       // 排序
Transformers.limit<T>(maxCount)       // 限制数量
Transformers.paginate<T>(page, size)  // 分页
Transformers.batch(batchSize)         // 分批
```

### 对象操作

```typescript
Transformers.transformKeys(fn)        // 转换对象键名
```

---

## ✅ 内置验证器 (Validators)

```typescript
Validators.required<T>()              // 非空验证
Validators.isArray()                  // 数组验证
Validators.isObject()                 // 对象验证
Validators.isString()                 // 字符串验证
Validators.isNumber()                 // 数字验证
Validators.minLength(min)             // 最小长度
Validators.maxLength(max)             // 最大长度
Validators.inRange(min, max)          // 数值范围
Validators.matches(pattern)           // 正则匹配
Validators.custom(predicate)          // 自定义验证
```

---

## 📖 使用场景

### 1. ETL 数据处理

```typescript
const etlPipeline = createPipeline<RawData[]>()
  .add('extract', extractFromSource)
  .add('clean', Transformers.compact())
  .add('transform', transformData)
  .add('validate', validateSchema)
  .add('load', saveToDatabase);

const result = await etlPipeline.execute(rawData);
```

### 2. API 数据聚合

```typescript
const result = await createParallelPipeline({
  name: 'aggregate-user-data',
  input: { userId: 123 },
  branches: [
    { name: 'profile', stages: [{ name: 'fetch', processor: fetchProfile }] },
    { name: 'orders', stages: [{ name: 'fetch', processor: fetchOrders }] },
    { name: 'preferences', stages: [{ name: 'fetch', processor: fetchPrefs }] }
  ],
  mergeFn: (results) => ({
    user: results.profile,
    orders: results.orders,
    preferences: results.preferences
  })
});
```

### 3. 请求验证管道

```typescript
const validateRequest = createPipeline<Request>()
  .filter(Validators.required(), 'required')
  .filter(validateAuth, 'auth')
  .filter(validateBody, 'body')
  .filter(validateHeaders, 'headers')
  .catch((error, ctx) => {
    return { valid: false, error: error.message };
  });
```

### 4. 文件处理管道

```typescript
const filePipeline = createPipeline<File>()
  .add('read', readFile)
  .add('parse', parseFile)
  .add('validate', validateContent)
  .add('transform', transformData)
  .add('write', writeFile)
  .retry(3, 1000)
  .timeout(30000);
```

---

## 🎯 高级用法

### 管道组合

```typescript
// 创建可复用的管道片段
const validationPipeline = createPipeline<any>()
  .filter(Validators.required())
  .filter(Validators.isObject());

const transformationPipeline = createPipeline<any>()
  .map(addTimestamp)
  .map(addMetadata);

// 组合管道
const fullPipeline = validationPipeline
  .add('business-logic', processBusinessLogic)
  .add('transform', transformationPipeline.stages[0]!.processor);
```

### 取消执行

```typescript
const controller = new AbortController();

// 5 秒后取消
setTimeout(() => controller.abort(), 5000);

const result = await pipeline.execute(data, {
  abortSignal: controller.signal
});

if (!result.success && result.error?.message.includes('aborted')) {
  console.log('管道执行被取消');
}
```

### 条件阶段

```typescript
// 可选阶段 - 失败不中断管道
pipeline.add('optional-enrichment', async (data) => {
  // 可能失败的外部 API 调用
  return await fetchExtraData(data);
}, { optional: true });

// 即使这个阶段失败，管道仍会继续执行
```

---

## 📊 性能建议

1. **批处理大数据** - 使用 `.batch()` 分批处理大量数据
2. **并行分支** - 使用 `.parallel()` 并发执行独立任务
3. **合理超时** - 为外部调用设置合适的超时时间
4. **重试策略** - 为不稳定操作配置指数退避重试
5. **监控统计** - 通过 `result.stats` 监控管道性能

---

## 📝 完整示例

查看 `pipeline-utils-examples.ts` 获取完整示例：

- ✅ 基础数据处理管道
- ✅ 并行管道 (多数据源聚合)
- ✅ ETL 转换链
- ✅ 错误处理与降级
- ✅ 可选阶段
- ✅ 批处理
- ✅ 数据验证
- ✅ 管道组合
- ✅ 取消执行

运行示例：

```bash
cd /Users/nike/.openclaw/workspace/src/skills
npx ts-node pipeline-utils-examples.ts
```

---

## 🛠️ 故障排除

### 管道执行失败

检查 `result.stageResults` 查看哪个阶段失败：

```typescript
const result = await pipeline.execute(data);
if (!result.success) {
  Object.entries(result.stageResults).forEach(([name, stage]) => {
    if (!stage.success) {
      console.error(`阶段 ${name} 失败:`, stage.error);
    }
  });
}
```

### 性能问题

查看执行统计：

```typescript
console.log('总耗时:', result.stats.totalDuration, 'ms');
console.log('平均阶段耗时:', result.stats.avgStageDuration, 'ms');

// 找出最慢的阶段
const slowestStage = Object.entries(result.stageResults)
  .sort((a, b) => b[1].duration - a[1].duration)[0];
console.log('最慢阶段:', slowestStage[0], slowestStage[1].duration, 'ms');
```

---

## 📄 许可证

MIT License - AxonClaw Engineering
