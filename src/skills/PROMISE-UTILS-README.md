# Promise 异步工具技能 (Promise Utils)

强大的 Promise 异步处理工具集，提供并发控制、重试机制和超时/竞态处理等功能。

## 📦 安装

无需额外依赖，直接使用：

```typescript
import { PromiseUtils } from './skills/promise-utils-skill';
// 或者按需导入
import { 
  mapWithConcurrency, 
  withRetry, 
  withTimeout,
  debounce,
  throttle 
} from './skills/promise-utils-skill';
```

## 🚀 快速开始

### 1. 并发控制

#### 限制并发数量

```typescript
import { mapWithConcurrency, promiseAllLimit } from './skills/promise-utils-skill';

// 基础并发控制
const tasks = [
  () => fetch('/api/users/1'),
  () => fetch('/api/users/2'),
  () => fetch('/api/users/3'),
  () => fetch('/api/users/4'),
  () => fetch('/api/users/5'),
];

const results = await mapWithConcurrency(tasks, { 
  limit: 2, // 最多同时执行 2 个任务
  stopOnError: false, // 失败时不停止
  interval: 100 // 任务间间隔 100ms
});

// 结果包含每个任务的状态
results.forEach(result => {
  if (result.success) {
    console.log(`Task ${result.index} succeeded:`, result.value);
  } else {
    console.error(`Task ${result.index} failed:`, result.error);
  }
});
```

#### 简化版并发 (只返回成功结果)

```typescript
const urls = ['/api/1', '/api/2', '/api/3', '/api/4', '/api/5'];
const successfulResults = await promiseAllLimit(
  urls.map(url => () => fetch(url)),
  3 // 最多 3 个并发
);
```

#### 批处理执行

```typescript
import { processInBatches } from './skills/promise-utils-skill';

const tasks = Array.from({ length: 100 }, (_, i) => 
  () => processItem(i)
);

// 每批 10 个，批次间延迟 1 秒
const results = await processInBatches(
  tasks,
  10, // 每批 10 个
  1000 // 批次间延迟 1 秒
);
```

### 2. 重试机制

#### 基础重试

```typescript
import { withRetry, retryable } from './skills/promise-utils-skill';

// 基础重试：失败后重试 3 次，每次间隔 1 秒
try {
  const result = await withRetry(
    () => fetch('/api/unstable-endpoint'),
    { 
      maxRetries: 3, 
      delay: 1000 
    }
  );
  console.log('Success:', result);
} catch (error) {
  console.error('All retries failed:', error);
}
```

#### 指数退避重试

```typescript
// 指数退避：每次重试延迟翻倍 (1s, 2s, 4s, 8s, 16s...)
const result = await withRetry(
  () => apiCall(),
  { 
    maxRetries: 5,
    delay: 1000,
    exponentialBackoff: true, // 启用指数退避
    maxDelay: 30000, // 最大延迟 30 秒
    onRetry: (attempt, error) => {
      console.log(`Retry attempt ${attempt}: ${error.message}`);
    }
  }
);
```

#### 条件重试

```typescript
// 只在特定错误时重试 (如网络错误、5xx 错误)
const result = await withRetry(
  () => fetchData(),
  {
    maxRetries: 3,
    shouldRetry: (error) => {
      // 只在网络错误或 5xx 错误时重试
      return error.code === 'NETWORK_ERROR' || 
             error.status >= 500;
    }
  }
);
```

#### 安全重试 (不抛异常)

```typescript
// retryable 返回结果对象，而不是抛异常
const result = await retryable(
  () => unstableAPI(),
  { maxRetries: 3 }
);

if (result.success) {
  console.log('Data:', result.data);
} else {
  console.error('Failed after retries:', result.error);
}
```

#### 带抖动的重试 (避免雪崩)

```typescript
import { withRetryJitter } from './skills/promise-utils-skill';

// 添加随机抖动，避免多个客户端同时重试造成雪崩
const result = await withRetryJitter(
  () => apiCall(),
  { maxRetries: 3, delay: 1000 }
);
```

### 3. 超时处理

#### 基础超时

```typescript
import { withTimeout, TimeoutError } from './skills/promise-utils-skill';

try {
  const result = await withTimeout(
    fetch('/api/slow-endpoint'),
    5000, // 5 秒超时
    '请求超时，请稍后重试'
  );
  console.log('Result:', result);
} catch (error) {
  if (error instanceof TimeoutError) {
    console.error('Timeout:', error.message);
  } else {
    console.error('Other error:', error);
  }
}
```

#### Promise 竞态

```typescript
import { raceToSuccess, raceToFirstSuccess } from './skills/promise-utils-skill';

// 多个 Promise 竞态，取最先完成的结果
const result = await raceToSuccess([
  fetch('/api/fast-source'),
  fetch('/api/slow-source'),
]);

// 多个任务竞态，取第一个成功的
const bestResult = await raceToFirstSuccess(
  [
    () => fetchFromCache(),      // 最快，但可能 miss
    () => fetchFromCDN(),        // 较快
    () => fetchFromOrigin(),     // 最慢，但最可靠
  ],
  10000 // 总超时 10 秒
);
```

#### 可取消的 Promise

```typescript
import { cancellable, CancelledError } from './skills/promise-utils-skill';

const { promise, cancel } = cancellable(async (cancelToken) => {
  while (!cancelToken.cancelled) {
    await doWork();
    await sleep(100);
  }
});

// 稍后可以取消
setTimeout(() => {
  cancel(); // 会抛出 CancelledError
}, 5000);

try {
  await promise;
} catch (error) {
  if (error instanceof CancelledError) {
    console.log('Operation was cancelled');
  }
}
```

### 4. 执行控制

#### 延迟执行

```typescript
import { delayExecution } from './skills/promise-utils-skill';

// 延迟 1 秒后执行
const result = await delayExecution(
  () => fetchData(),
  1000
);
```

#### 防抖 (Debounce)

```typescript
import { debounce } from './skills/promise-utils-skill';

// 搜索框防抖：300ms 内只执行最后一次
const debouncedSearch = debounce(
  async (query: string) => {
    const results = await searchAPI(query);
    updateUI(results);
    return results;
  },
  300 // 300ms 防抖
);

// 多次快速调用只会执行最后一次
debouncedSearch('a');
debouncedSearch('ab');
debouncedSearch('abc'); // 只有这个会执行
```

#### 节流 (Throttle)

```typescript
import { throttle } from './skills/promise-utils-skill';

// 滚动处理节流：100ms 内只执行一次
const throttledScroll = throttle(
  async () => {
    const data = await loadMoreData();
    appendToPage(data);
    return data;
  },
  100 // 100ms 节流
);

window.addEventListener('scroll', () => {
  throttledScroll(); // 高频调用，但实际执行频率受限
});
```

### 5. 异步迭代器批处理

```typescript
import { batchAsyncIterable } from './skills/promise-utils-skill';

async function* fetchDataStream() {
  for (let i = 0; i < 100; i++) {
    yield await fetchItem(i);
  }
}

// 批处理异步迭代器
for await (const batch of batchAsyncIterable(fetchDataStream(), 10)) {
  console.log('Processing batch of', batch.length, 'items');
  await processBatch(batch);
}
```

## 📊 完整示例

### 示例 1: 批量 API 调用 (带重试和并发控制)

```typescript
import { 
  mapWithConcurrency, 
  withRetry,
  TimeoutError 
} from './skills/promise-utils-skill';

async function fetchAllUsers(userIds: number[]) {
  const tasks = userIds.map(id => () => 
    withRetry(
      async () => {
        const response = await fetch(`/api/users/${id}`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      },
      {
        maxRetries: 3,
        exponentialBackoff: true,
        shouldRetry: (error) => error.message.includes('5') // 只重试 5xx 错误
      }
    )
  );

  const results = await mapWithConcurrency(tasks, {
    limit: 5, // 最多 5 个并发
    stopOnError: false,
    interval: 100
  });

  return {
    successful: results.filter(r => r.success).map(r => r.value),
    failed: results.filter(r => !r.success).map(r => ({
      userId: userIds[r.index],
      error: r.error
    }))
  };
}

// 使用
const { successful, failed } = await fetchAllUsers([1, 2, 3, 4, 5]);
console.log('Success:', successful.length);
console.log('Failed:', failed.length);
```

### 示例 2: 智能数据加载 (多源竞态)

```typescript
import { raceToFirstSuccess, withTimeout } from './skills/promise-utils-skill';

async function loadUserData(userId: string) {
  try {
    // 多源竞态：哪个快用哪个
    const data = await raceToFirstSuccess(
      [
        // 1. 先尝试缓存 (最快)
        async () => {
          const cached = await getFromCache(userId);
          if (!cached) throw new Error('Cache miss');
          return cached;
        },
        // 2. 再尝试 CDN (较快)
        () => fetch(`/cdn/users/${userId}`).then(r => r.json()),
        // 3. 最后回退到源站 (最慢但可靠)
        () => fetch(`/api/users/${userId}`).then(r => r.json()),
      ],
      10000 // 总超时 10 秒
    );

    // 更新缓存
    await setCache(userId, data);
    
    return data;
  } catch (error) {
    if (error instanceof TimeoutError) {
      throw new Error('数据加载超时');
    }
    throw error;
  }
}
```

### 示例 3: 实时搜索 (防抖 + 超时 + 重试)

```typescript
import { debounce, withTimeout, withRetry } from './skills/promise-utils-skill';

const searchAPI = debounce(
  async (query: string) => {
    try {
      const result = await withTimeout(
        withRetry(
          () => fetch(`/api/search?q=${encodeURIComponent(query)}`)
            .then(r => r.json()),
          { maxRetries: 2, delay: 500 }
        ),
        3000, // 3 秒超时
        '搜索超时'
      );
      return result;
    } catch (error) {
      console.error('Search failed:', error);
      throw error;
    }
  },
  300 // 300ms 防抖
);

// 在搜索框中使用
searchInput.addEventListener('input', (e) => {
  searchAPI(e.target.value).then(updateSearchResults);
});
```

## 🎯 最佳实践

### 1. 并发控制建议

```typescript
// ✅ 推荐：根据资源类型设置合理的并发数
const apiTasks = [...]; // API 调用
await mapWithConcurrency(apiTasks, { limit: 5 }); // API 通常限制 5-10

const fileTasks = [...]; // 文件操作
await mapWithConcurrency(fileTasks, { limit: 2 }); // 文件 I/O 限制更严格

const imageTasks = [...]; // 图片处理
await mapWithConcurrency(imageTasks, { limit: 3 }); // CPU 密集型任务
```

### 2. 重试策略建议

```typescript
// ✅ 推荐：根据错误类型选择重试策略

// 网络波动：指数退避 + 抖动
withRetry(apiCall, {
  maxRetries: 5,
  exponentialBackoff: true,
  // 会自动添加抖动
});

// 临时服务不可用：固定间隔重试
withRetry(apiCall, {
  maxRetries: 3,
  delay: 2000, // 2 秒后重试
  shouldRetry: (error) => error.status === 503
});

// 客户端错误：不重试
withRetry(apiCall, {
  maxRetries: 0, // 4xx 错误不重试
  shouldRetry: (error) => error.status >= 500
});
```

### 3. 超时设置建议

```typescript
// ✅ 推荐：根据操作类型设置超时

// API 调用：5-10 秒
withTimeout(fetch('/api/data'), 5000);

// 文件上传：根据文件大小
const uploadTimeout = fileSize * 2; // 2 秒/MB
withTimeout(uploadFile(file), uploadTimeout);

// 数据库查询：根据复杂度
withTimeout(complexQuery(), 30000); // 30 秒
```

## ⚠️ 注意事项

1. **并发控制**: 不要设置过高的并发数，可能导致资源耗尽
2. **重试机制**: 避免无限重试，始终设置 `maxRetries`
3. **超时处理**: 始终为外部调用设置超时，防止程序挂起
4. **错误处理**: 使用 `retryable` 可以获得更优雅的错误处理
5. **内存泄漏**: 使用 `cancellable` 时确保在组件卸载时取消

## 📝 API 参考

| 函数 | 描述 | 参数 |
|------|------|------|
| `mapWithConcurrency` | 并发限制执行器 | tasks, options |
| `promiseAllLimit` | 简化版并发 (只返回成功) | tasks, limit |
| `processInBatches` | 批处理执行器 | tasks, batchSize, delay |
| `withRetry` | 带重试的执行器 | fn, options |
| `withRetryJitter` | 带抖动的重试 | fn, options |
| `retryable` | 安全重试 (不抛异常) | fn, options |
| `withTimeout` | 带超时的 Promise | promise, timeout, message |
| `raceToSuccess` | Promise 竞态 | promises |
| `raceToFirstSuccess` | 任务竞态 (取第一个成功) | tasks, timeout |
| `cancellable` | 可取消的 Promise | fn |
| `delayExecution` | 延迟执行 | fn, delay |
| `debounce` | 防抖函数 | fn, wait |
| `throttle` | 节流函数 | fn, limit |
| `sleep` | 睡眠/延迟 | ms |

---

**创建时间:** 2026-03-13  
**版本:** 1.0.0  
**作者:** KAEL (AxonClaw)
