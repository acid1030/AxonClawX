# Retry Utils Skill - 使用示例

重试机制工具技能，提供自动重试、指数退避、条件重试等功能。

---

## 📦 导入

```typescript
import retryUtils, {
  retry,
  retryQuick,
  retryExponential,
  retryLinear,
  retryFixed,
  CircuitBreaker,
  isNetworkError,
  createNetworkErrorRetryCondition,
  createHttpStatusCodeRetryCondition,
  createCompositeRetryCondition,
  createRetryLogger,
  formatRetryResult
} from './retry-utils-skill';
```

---

## 🚀 基础使用

### 1. 快速重试 (默认配置)

```typescript
import { retryQuick } from './retry-utils-skill';

// 默认重试 3 次，指数退避
const result = await retryQuick(async () => {
  const response = await fetch('https://api.example.com/data');
  return response.json();
});

if (result.success) {
  console.log('Data:', result.value);
} else {
  console.error('Failed:', result.error);
}
```

### 2. 自定义重试次数

```typescript
import { retry } from './retry-utils-skill';

const result = await retry(async () => {
  return await database.connect();
}, {
  maxRetries: 5  // 最多重试 5 次
});

console.log(`Total attempts: ${result.attempts}`);
console.log(`Total time: ${result.totalTime}ms`);
```

---

## ⏱️ 退避策略

### 3. 指数退避 (Exponential Backoff)

```typescript
import { retryExponential } from './retry-utils-skill';

// 延迟序列：1s, 2s, 4s, 8s, 16s...
const result = await retryExponential(async () => {
  return await externalService.call();
}, {
  maxRetries: 5,
  initialDelay: 1000,  // 初始延迟 1 秒
  maxDelay: 30000,     // 最大延迟 30 秒
  jitter: true         // 添加随机抖动
});
```

### 4. 线性退避 (Linear Backoff)

```typescript
import { retryLinear } from './retry-utils-skill';

// 延迟序列：1s, 2s, 3s, 4s, 5s...
const result = await retryLinear(async () => {
  return await queue.process();
}, {
  maxRetries: 5,
  initialDelay: 1000
});
```

### 5. 固定延迟 (Fixed Delay)

```typescript
import { retryFixed } from './retry-utils-skill';

// 每次延迟固定 2 秒
const result = await retryFixed(async () => {
  return await api.request();
}, {
  maxRetries: 3,
  initialDelay: 2000
});
```

---

## 🎯 条件重试

### 6. 仅在网络错误时重试

```typescript
import { retry, createNetworkErrorRetryCondition } from './retry-utils-skill';

const result = await retry(async () => {
  return await fetch('https://api.example.com/data');
}, {
  maxRetries: 5,
  // 只在网络错误时重试，业务错误不重试
  shouldRetry: createNetworkErrorRetryCondition()
});
```

### 7. 仅在特定 HTTP 状态码时重试

```typescript
import { retry, createHttpStatusCodeRetryCondition } from './retry-utils-skill';

const result = await retry(async () => {
  return await axios.get('/api/data');
}, {
  maxRetries: 3,
  // 只在 5xx 和 429 时重试
  shouldRetry: createHttpStatusCodeRetryCondition([500, 502, 503, 504, 429])
});
```

### 8. 组合重试条件

```typescript
import { 
  retry, 
  createCompositeRetryCondition,
  createNetworkErrorRetryCondition,
  createHttpStatusCodeRetryCondition 
} from './retry-utils-skill';

const result = await retry(async () => {
  return await api.call();
}, {
  maxRetries: 5,
  // 网络错误 OR 5xx 错误时重试
  shouldRetry: createCompositeRetryCondition([
    createNetworkErrorRetryCondition(),
    createHttpStatusCodeRetryCondition([500, 502, 503, 504, 429])
  ])
});
```

### 9. 自定义重试条件

```typescript
import { retry } from './retry-utils-skill';

const result = await retry(async () => {
  const response = await api.call();
  
  // 检查响应是否有效
  if (!response.data) {
    throw new Error('Empty response');
  }
  
  return response;
}, {
  maxRetries: 3,
  // 自定义重试逻辑
  shouldRetry: (error, attempt) => {
    // 空响应时重试，其他错误不重试
    if (error.message === 'Empty response') {
      return true;
    }
    
    // 达到第 3 次尝试时不再重试
    if (attempt >= 3) {
      return false;
    }
    
    // 默认不重试
    return false;
  }
});
```

---

## 📝 日志与回调

### 10. 添加日志记录

```typescript
import { retry, createRetryLogger } from './retry-utils-skill';

const logger = (msg: string) => console.log(`[API Retry] ${msg}`);

const result = await retry(async () => {
  return await fetch('/api/data');
}, {
  maxRetries: 5,
  ...createRetryLogger(logger)
});

// 输出示例:
// [API Retry] Attempt 1 failed: Connection timeout. Retrying in 1000ms...
// [API Retry] Attempt 2 failed: Connection timeout. Retrying in 2000ms...
// [API Retry] Succeeded on attempt 3
```

### 11. 自定义回调

```typescript
import { retry } from './retry-utils-skill';

const result = await retry(async () => {
  return await database.query('SELECT * FROM users');
}, {
  maxRetries: 3,
  
  // 每次重试前执行
  onRetry: async (error, attempt, delay) => {
    console.warn(`Retry ${attempt}: ${error.message}. Waiting ${delay}ms...`);
    
    // 可以发送通知、记录指标等
    await metrics.increment('database.retry.count');
  },
  
  // 成功后执行
  onSuccess: async (result, attempt) => {
    console.log(`Success after ${attempt} attempts`);
    await metrics.record('database.success.latency', Date.now());
  },
  
  // 最终失败后执行
  onFailure: async (error, totalAttempts) => {
    console.error(`Failed after ${totalAttempts} attempts: ${error.message}`);
    await alerting.send('Database connection failed', error);
  }
});
```

---

## 🔌 断路器模式

### 12. 使用断路器防止雪崩

```typescript
import { retryWithCircuitBreaker, CircuitBreaker } from './retry-utils-skill';

// 创建断路器
const breaker = new CircuitBreaker({
  failureThreshold: 5,    // 连续失败 5 次后打开
  resetTimeout: 60000,    // 60 秒后尝试恢复
  successThreshold: 2     // 半开状态下需要 2 次成功才能关闭
});

// 使用断路器进行重试
async function callExternalService() {
  const result = await retryWithCircuitBreaker(
    async () => await externalService.call(),
    breaker,
    {
      maxRetries: 3,
      strategy: 'exponential'
    }
  );
  
  return result;
}

// 检查断路器状态
console.log('Breaker state:', breaker.getState());
// 'closed' | 'open' | 'half-open'
```

### 13. 断路器状态监控

```typescript
import { CircuitBreaker } from './retry-utils-skill';

const breaker = new CircuitBreaker();

// 定期检查断路器状态
setInterval(() => {
  const state = breaker.getState();
  
  if (state === 'open') {
    console.warn('⚠️  Circuit breaker is OPEN - service unavailable');
    // 可以发送告警、降级处理等
  }
}, 5000);
```

---

## ⏰ 超时控制

### 14. 添加超时限制

```typescript
import { retry } from './retry-utils-skill';

const result = await retry(async () => {
  // 这个操作可能会卡住
  return await slowOperation();
}, {
  maxRetries: 3,
  timeout: 5000  // 每次尝试最多 5 秒
});

if (!result.success && result.error?.message.includes('Timeout')) {
  console.error('Operation timed out');
}
```

---

## 📊 结果处理

### 15. 格式化重试结果

```typescript
import { retry, formatRetryResult } from './retry-utils-skill';

const result = await retry(async () => {
  return await api.call();
}, { maxRetries: 3 });

// 格式化为人类可读的字符串
console.log(formatRetryResult(result));

// 输出示例:
// ✅ Success - Succeeded on attempt 3
// Total time: 3245ms
// Delays: 1023ms, 2222ms
```

### 16. 详细结果分析

```typescript
import { retry } from './retry-utils-skill';

const result = await retry(async () => {
  return await fetch('/api/data');
}, { maxRetries: 5 });

// 访问详细结果
console.log('Success:', result.success);
console.log('Value:', result.value);
console.log('Error:', result.error);
console.log('Attempts:', result.attempts);
console.log('Total Time:', result.totalTime, 'ms');
console.log('Delays:', result.delays);

// 计算平均延迟
if (result.delays.length > 0) {
  const avgDelay = result.delays.reduce((a, b) => a + b, 0) / result.delays.length;
  console.log('Average Delay:', Math.round(avgDelay), 'ms');
}
```

---

## 🎯 实际应用场景

### 17. API 请求重试

```typescript
import { retry, createCompositeRetryCondition } from './retry-utils-skill';

async function fetchWithRetry(url: string, options?: RequestInit) {
  const result = await retry(async () => {
    const response = await fetch(url, options);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return response.json();
  }, {
    maxRetries: 5,
    strategy: 'exponential',
    initialDelay: 1000,
    timeout: 10000,
    shouldRetry: createCompositeRetryCondition([
      (error) => error.code === 'ECONNRESET',
      (error) => error.message?.includes('timeout'),
      (error) => {
        const status = error.message?.match(/HTTP (\d+)/)?.[1];
        return status && ['500', '502', '503', '504', '429'].includes(status);
      }
    ])
  });
  
  if (!result.success) {
    throw result.error;
  }
  
  return result.value;
}

// 使用
const data = await fetchWithRetry('https://api.example.com/users');
```

### 18. 数据库连接重试

```typescript
import { retryExponential, createRetryLogger } from './retry-utils-skill';

async function connectToDatabase(connectionString: string) {
  const logger = createRetryLogger(msg => {
    console.log(`[DB] ${msg}`);
  });
  
  const result = await retryExponential(
    async () => {
      return await database.connect(connectionString);
    },
    {
      maxRetries: 10,
      initialDelay: 500,
      maxDelay: 30000,
      ...logger
    }
  );
  
  if (!result.success) {
    throw new Error(`Database connection failed: ${result.error.message}`);
  }
  
  return result.value;
}
```

### 19. 文件上传重试

```typescript
import { retry, isNetworkError } from './retry-utils-skill';

async function uploadFile(file: File, url: string) {
  const result = await retry(async () => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await fetch(url, {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      throw new Error(`Upload failed: ${response.status}`);
    }
    
    return response.json();
  }, {
    maxRetries: 5,
    strategy: 'exponential',
    initialDelay: 2000,
    // 只在网络错误时重试，业务错误不重试
    shouldRetry: (error) => isNetworkError(error)
  });
  
  if (!result.success) {
    throw result.error;
  }
  
  return result.value;
}
```

### 20. 消息队列处理重试

```typescript
import { retryLinear, CircuitBreaker, retryWithCircuitBreaker } from './retry-utils-skill';

const messageBreaker = new CircuitBreaker({
  failureThreshold: 10,
  resetTimeout: 30000
});

async function processMessage(message: Message) {
  const result = await retryWithCircuitBreaker(
    async () => {
      // 处理消息
      await handleMessage(message);
      
      // 确认消息
      await message.ack();
      
      return { processed: true };
    },
    messageBreaker,
    {
      maxRetries: 3,
      strategy: 'linear',
      initialDelay: 1000,
      shouldRetry: (error) => {
        // 临时错误重试，永久错误不重试
        const permanentErrors = ['InvalidMessageFormat', 'ValidationError'];
        return !permanentErrors.includes(error.code);
      }
    }
  );
  
  if (!result.success) {
    // 放入死信队列
    await deadLetterQueue.push(message, result.error);
  }
  
  return result;
}
```

---

## 🧪 测试示例

### 21. 单元测试

```typescript
import { retry, sleep } from './retry-utils-skill';
import { describe, it, expect } from 'vitest';

describe('retry', () => {
  it('should succeed on first try', async () => {
    const result = await retry(async () => 'success');
    
    expect(result.success).toBe(true);
    expect(result.value).toBe('success');
    expect(result.attempts).toBe(1);
  });
  
  it('should retry on failure', async () => {
    let attempts = 0;
    
    const result = await retry(async () => {
      attempts++;
      if (attempts < 3) throw new Error('Temporary error');
      return 'success';
    }, {
      maxRetries: 3,
      strategy: 'fixed',
      initialDelay: 10
    });
    
    expect(result.success).toBe(true);
    expect(result.attempts).toBe(3);
  });
  
  it('should fail after max retries', async () => {
    const result = await retry(async () => {
      throw new Error('Always fails');
    }, {
      maxRetries: 3,
      strategy: 'fixed',
      initialDelay: 10
    });
    
    expect(result.success).toBe(false);
    expect(result.attempts).toBe(4); // 1 initial + 3 retries
  });
  
  it('should respect shouldRetry condition', async () => {
    let attempts = 0;
    
    const result = await retry(async () => {
      attempts++;
      throw new Error('Permanent error');
    }, {
      maxRetries: 3,
      shouldRetry: (error) => error.message !== 'Permanent error'
    });
    
    expect(result.success).toBe(false);
    expect(result.attempts).toBe(1); // Should not retry
  });
});
```

---

## 📈 性能优化建议

### 22. 批量操作重试

```typescript
import { retry, mapWithConcurrency } from './retry-utils-skill';

async function processBatch(items: any[]) {
  // 对每个 item 使用重试机制
  const tasks = items.map(item => () => 
    retry(async () => await processItem(item), {
      maxRetries: 3,
      strategy: 'exponential'
    })
  );
  
  // 并发控制执行
  const results = await mapWithConcurrency(tasks, {
    limit: 5,  // 最多同时处理 5 个
    interval: 100  // 每个任务间隔 100ms
  });
  
  return results;
}
```

### 23. 避免重试风暴

```typescript
import { retry, sleep } from './retry-utils-skill';

// 添加随机抖动，避免多个实例同时重试
const result = await retry(async () => {
  return await api.call();
}, {
  maxRetries: 5,
  strategy: 'exponential',
  jitter: true,  // ✅ 启用抖动
  initialDelay: 1000
});

// 或者手动添加初始随机延迟
await sleep(Math.random() * 1000);
const result = await retry(async () => {
  return await api.call();
});
```

---

## ⚠️ 注意事项

1. **重试不是万能的** - 对于业务逻辑错误（如参数错误、权限不足），不应该重试
2. **合理设置最大重试次数** - 避免无限重试导致资源耗尽
3. **使用抖动 (Jitter)** - 在多实例环境下避免同时重试造成雪崩
4. **监控重试指标** - 记录重试次数、成功率、延迟等指标
5. **结合断路器使用** - 当服务持续失败时，及时熔断避免雪崩
6. **设置超时** - 避免单次尝试无限期等待

---

## 📚 API 参考

### 核心函数

| 函数 | 描述 |
|------|------|
| `retry(fn, options)` | 通用重试函数 |
| `retryQuick(fn, maxRetries)` | 快速重试 (默认配置) |
| `retryExponential(fn, options)` | 指数退避重试 |
| `retryLinear(fn, options)` | 线性退避重试 |
| `retryFixed(fn, options)` | 固定延迟重试 |

### 条件函数

| 函数 | 描述 |
|------|------|
| `isNetworkError(error)` | 检查是否为网络错误 |
| `createNetworkErrorRetryCondition()` | 创建网络错误重试条件 |
| `createHttpStatusCodeRetryCondition(statuses)` | 创建 HTTP 状态码重试条件 |
| `createCompositeRetryCondition(conditions)` | 创建组合重试条件 |

### 断路器

| 类/函数 | 描述 |
|--------|------|
| `CircuitBreaker` | 断路器类 |
| `retryWithCircuitBreaker(fn, breaker, options)` | 带断路器的重试 |

### 工具函数

| 函数 | 描述 |
|------|------|
| `sleep(ms)` | 延迟执行 |
| `calculateDelay(attempt, options)` | 计算延迟时间 |
| `formatRetryResult(result)` | 格式化结果 |
| `createRetryLogger(logger)` | 创建日志记录器 |

---

**Version:** 1.0.0  
**Author:** Axon  
**License:** MIT
