# 🜏 KAEL Reactive Streams - 使用示例

**版本:** 1.0.0  
**作者:** KAEL Engineering  
**功能:** 流创建 | 操作符链 | 背压处理

---

## 📖 快速开始

### 基础导入

```typescript
import { Stream, fromArray, map, filter, take } from './reactive-streams-skill';
```

---

## 🎯 示例 1: 基础流操作

### 使用 Fluent API

```typescript
// 创建流 → 过滤 → 转换 → 收集
const result = await Stream.from([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
  .filter(x => x % 2 === 0)           // 只保留偶数
  .map(x => x * 10)                   // 乘以 10
  .take(3)                            // 取前 3 个
  .toArray();

console.log(result); // [20, 40, 60]
```

### 使用函数式 API

```typescript
import { fromArray, filter, map, take } from './reactive-streams-skill';

const source = fromArray([1, 2, 3, 4, 5]);
const transformed = take(3)(map(x => x * 2)(filter(x => x > 2)(source)));

const result = [];
for await (const value of transformed) {
  result.push(value);
}

console.log(result); // [6, 8, 10]
```

---

## 🎯 示例 2: 背压处理

### 快生产慢消费场景

```typescript
// 生产者每 10ms 产生一个值
const fastProducer = Stream.interval(10);

// 消费者每 50ms 处理一个值 (带背压控制)
await fastProducer
  .withBackpressure({ bufferSize: 50 })  // 缓冲区大小 50
  .take(100)
  .forEach(async (value) => {
    await sleep(50);  // 模拟慢速处理
    console.log(`Processed: ${value}`);
  });
```

### 批量处理优化

```typescript
// 将流分批次处理 (每批 10 个)
await Stream.range(1, 1000)
  .buffer(10)
  .forEach(async (batch) => {
    console.log(`Processing batch of ${batch.length} items`);
    // 批量插入数据库等操作
    await db.insertBatch(batch);
  });
```

---

## 🎯 示例 3: 操作符链实战

### 数据处理管道

```typescript
// 计算前 100 个数字中所有 3 的倍数的平方和
const sum = await Stream.range(1, 100)
  .filter(x => x % 3 === 0)           // 3 的倍数
  .map(x => x * x)                    // 平方
  .reduce((acc, x) => acc + x, 0)     // 求和
  .first();

console.log(sum); // 9 + 36 + 81 + ... + 9801 = 161832
```

### 滑动窗口分析

```typescript
// 计算移动平均值 (窗口大小 5)
const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

await Stream.from(data)
  .window(5)  // 滑动窗口
  .forEach(window => {
    const avg = window.reduce((a, b) => a + b, 0) / window.length;
    console.log(`Window: ${window}, Avg: ${avg}`);
  });

// 输出:
// Window: [1,2,3,4,5], Avg: 3
// Window: [2,3,4,5,6], Avg: 4
// Window: [3,4,5,6,7], Avg: 5
// ...
```

---

## 🎯 示例 4: 并发控制

### 限制 API 请求并发数

```typescript
const urls = [
  'https://api.example.com/data/1',
  'https://api.example.com/data/2',
  'https://api.example.com/data/3',
  'https://api.example.com/data/4',
  'https://api.example.com/data/5',
];

await Stream.from(urls)
  .concatMap(async (url) => {
    console.log(`Fetching ${url}...`);
    const response = await fetch(url);
    return response.json();
  }, 3)  // 最多 3 个并发请求
  .forEach(data => {
    console.log('Received:', data);
  });
```

### 并行处理文件

```typescript
const files = ['file1.txt', 'file2.txt', 'file3.txt', 'file4.txt'];

await Stream.from(files)
  .concatMap(async (file) => {
    const content = await fs.promises.readFile(file, 'utf-8');
    return { file, content, size: content.length };
  }, 2)  // 最多 2 个文件同时读取
  .forEach(result => {
    console.log(`${result.file}: ${result.size} bytes`);
  });
```

---

## 🎯 示例 5: 错误处理与重试

### 自动重试失败的操作

```typescript
let attemptCount = 0;

const result = await Stream.from([1])
  .flatMap(async () => {
    attemptCount++;
    
    if (attemptCount < 3) {
      throw new Error(`Temporary failure (attempt ${attemptCount})`);
    }
    
    return 'Success!';
  })
  .retry(3)  // 最多重试 3 次
  .first();

console.log(result); // Success!
console.log(`Total attempts: ${attemptCount}`); // 3
```

### 错误降级处理

```typescript
import { catchError } from './reactive-streams-skill';

await Stream.from(['valid-url', 'invalid-url', 'another-valid'])
  .concatMap(async (url) => {
    const response = await fetch(url);
    return response.json();
  })
  .pipe(catchError((error) => {
    console.error('Request failed:', error.message);
    return { error: true, message: 'Using fallback data' };
  }))
  .forEach(data => {
    console.log('Result:', data);
  });
```

---

## 🎯 示例 6: 事件流处理

### 防抖搜索框

```typescript
// 模拟搜索输入事件
const searchInput = new EventEmitter();

await Stream.fromEvent(searchInput, 'input')
  .map(event => event.target.value)
  .debounce(300)  // 300ms 防抖
  .forEach(async (query) => {
    console.log('Searching for:', query);
    const results = await searchAPI(query);
    displayResults(results);
  });
```

### 节流滚动事件

```typescript
const scrollContainer = new EventEmitter();

await Stream.fromEvent(scrollContainer, 'scroll')
  .throttle(100)  // 100ms 节流
  .forEach(({ scrollTop }) => {
    updateProgressBar(scrollTop);
    loadMoreContentIfNeeded(scrollTop);
  });
```

---

## 🎯 示例 7: 流合并与连接

### 合并多个数据源

```typescript
import { merge } from './reactive-streams-skill';

const stream1 = Stream.interval(100).take(5);  // 每 100ms 一个值
const stream2 = Stream.interval(150).take(5);  // 每 150ms 一个值
const stream3 = Stream.interval(200).take(5);  // 每 200ms 一个值

// 合并三个流 (竞争式)
await merge(stream1, stream2, stream3)
  .forEach(value => {
    console.log(`Merged: ${value}`);
  });
```

### 顺序连接多个流

```typescript
import { concat } from './reactive-streams-skill';

const header = Stream.from(['=== Header ===']);
const content = Stream.from(['Line 1', 'Line 2', 'Line 3']);
const footer = Stream.from(['=== Footer ===']);

// 按顺序连接
await concat(header, content, footer)
  .forEach(line => console.log(line));

// 输出:
// === Header ===
// Line 1
// Line 2
// Line 3
// === Footer ===
```

---

## 🎯 示例 8: 实际应用场景

### 实时日志处理

```typescript
// 模拟日志流
const logStream = Stream.interval(100)
  .map(i => ({
    timestamp: Date.now(),
    level: ['info', 'warn', 'error'][Math.floor(Math.random() * 3)],
    message: `Log message ${i}`
  }));

// 处理日志流
await logStream
  .withBackpressure({ bufferSize: 100 })
  .filter(log => log.level === 'error')  // 只处理错误日志
  .buffer(10)  // 每 10 条批量处理
  .forEach(async (batch) => {
    await sendToMonitoringService(batch);
    console.log(`Sent ${batch.length} error logs`);
  });
```

### 数据管道 ETL

```typescript
// ETL 管道：Extract → Transform → Load
await Stream.from(dataSources)
  .concatMap(async (source) => {
    // Extract
    const rawData = await extractFromSource(source);
    return rawData;
  }, 5)
  .map(data => {
    // Transform
    return {
      ...data,
      processedAt: Date.now(),
      normalized: normalize(data)
    };
  })
  .filter(record => isValid(record))
  .buffer(100)
  .forEach(async (batch) => {
    // Load
    await loadToDestination(batch);
    console.log(`Loaded ${batch.length} records`);
  });
```

### WebSocket 消息处理

```typescript
// WebSocket 消息流
const ws = new WebSocket('wss://api.example.com/stream');

await Stream.fromEvent(ws, 'message')
  .map(event => JSON.parse(event.data))
  .filter(msg => msg.type === 'UPDATE')
  .throttle(50)  // 限制更新频率
  .forEach(update => {
    updateUI(update);
  });
```

---

## 📊 API 参考

### 流创建函数

| 函数 | 描述 | 示例 |
|------|------|------|
| `fromArray(items)` | 从数组创建流 | `fromArray([1,2,3])` |
| `fromRange(start, end, step)` | 从范围创建流 | `fromRange(0, 10, 2)` |
| `interval(ms)` | 定时产生无限流 | `interval(1000)` |
| `fromPromise(promise)` | 从 Promise 创建流 | `fromPromise(fetch(url))` |
| `fromEvent(emitter, name)` | 从事件创建流 | `fromEvent(ws, 'message')` |

### 操作符

| 操作符 | 描述 | 示例 |
|--------|------|------|
| `map(fn)` | 转换每个元素 | `map(x => x * 2)` |
| `filter(predicate)` | 过滤元素 | `filter(x => x > 5)` |
| `take(n)` | 取前 N 个 | `take(10)` |
| `skip(n)` | 跳过前 N 个 | `skip(5)` |
| `reduce(fn, initial)` | 聚合 | `reduce((a,b) => a+b, 0)` |
| `flatMap(fn)` | 展平嵌套流 | `flatMap(x => fromArray([x]))` |
| `merge(...streams)` | 合并多个流 | `merge(s1, s2, s3)` |
| `concat(...streams)` | 连接多个流 | `concat(header, content)` |
| `debounce(ms)` | 防抖 | `debounce(300)` |
| `throttle(ms)` | 节流 | `throttle(100)` |
| `retry(n)` | 重试 | `retry(3)` |
| `catchError(handler)` | 错误处理 | `catchError(e => fallback)` |

### 背压控制

| 函数 | 描述 | 示例 |
|------|------|------|
| `withBackpressure(config)` | 添加背压控制 | `withBackpressure({bufferSize: 100})` |
| `buffer(n)` | 批量处理 | `buffer(50)` |
| `window(size, step)` | 滑动窗口 | `window(5, 1)` |
| `concatMap(fn, concurrency)` | 并发控制 | `concatMap(fn, 3)` |

### Stream 类方法

```typescript
Stream.from([1,2,3])
  .filter(x => x > 1)
  .map(x => x * 2)
  .take(5)
  .debounce(100)
  .withBackpressure({ bufferSize: 50 })
  .forEach(x => console.log(x));
```

---

## 🔧 配置选项

### StreamConfig

```typescript
interface StreamConfig {
  bufferSize?: number;    // 缓冲区大小 (默认: 100)
  timeoutMs?: number;     // 超时时间 (毫秒)
  retryCount?: number;    // 重试次数 (默认: 0)
  concurrency?: number;   // 并发度 (默认: 1)
}
```

---

## ⚡ 性能提示

1. **合理使用背压** - 快生产慢消费场景必须使用 `withBackpressure`
2. **批量处理** - 使用 `buffer()` 减少 I/O 操作次数
3. **并发控制** - 使用 `concatMap(fn, concurrency)` 限制并发数
4. **避免内存泄漏** - 确保事件流正确关闭 (使用 `take()` 或手动终止)
5. **操作符顺序** - 先 `filter` 后 `map` 可以减少不必要的转换

---

## 🜏 KAEL Engineering Standard

- ✅ 类型安全 (TypeScript)
- ✅ 背压控制
- ✅ 错误处理
- ✅ 性能优化
- ✅ 链式 API

---

**文档版本:** 1.0.0  
**最后更新:** 2026-03-13
