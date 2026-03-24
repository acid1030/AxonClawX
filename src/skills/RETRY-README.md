# 🔄 Retry Utils - 重试机制工具

> 自动重试、指数退避、条件重试 - 让失败变得可控

---

## ⚡ 快速开始

```typescript
import { retry } from './retry-utils-skill';

// 最简单的使用方式
const result = await retry(async () => {
  return await fetch('https://api.example.com/data');
}, {
  maxRetries: 3
});

if (result.success) {
  console.log('Data:', result.value);
} else {
  console.error('Failed:', result.error);
}
```

---

## 🎯 核心功能

### 1. 自动重试
- 最大重试次数可配置
- 支持成功/失败回调
- 完整的重试统计信息

### 2. 指数退避
- **指数退避**: 1s → 2s → 4s → 8s...
- **线性退避**: 1s → 2s → 3s → 4s...
- **固定延迟**: 每次都是 2s
- 支持随机抖动 (Jitter) 避免并发冲突

### 3. 条件重试
- 网络错误自动识别
- HTTP 状态码过滤
- 自定义重试条件
- 组合条件支持

### 4. 断路器模式
- 防止服务雪崩
- 自动状态恢复
- 可配置阈值

---

## 📦 安装

无需额外依赖，直接使用:

```typescript
import retryUtils, {
  retry,
  retryExponential,
  CircuitBreaker,
  createNetworkErrorRetryCondition
} from './src/skills/retry-utils-skill';
```

---

## 🚀 使用示例

### 基础重试

```typescript
const result = await retry(async () => {
  return await api.getData();
}, {
  maxRetries: 5,
  strategy: 'exponential',
  initialDelay: 1000
});
```

### 条件重试

```typescript
import { createNetworkErrorRetryCondition } from './retry-utils-skill';

const result = await retry(async () => {
  return await fetch('/api');
}, {
  maxRetries: 3,
  // 只在网络错误时重试
  shouldRetry: createNetworkErrorRetryCondition()
});
```

### 断路器

```typescript
import { retryWithCircuitBreaker, CircuitBreaker } from './retry-utils-skill';

const breaker = new CircuitBreaker({
  failureThreshold: 5,
  resetTimeout: 60000
});

const result = await retryWithCircuitBreaker(
  async () => await externalService.call(),
  breaker
);
```

### 日志记录

```typescript
import { createRetryLogger } from './retry-utils-skill';

const logger = (msg: string) => console.log(`[Retry] ${msg}`);

const result = await retry(async () => {
  return await db.connect();
}, {
  maxRetries: 5,
  ...createRetryLogger(logger)
});
```

---

## 📊 API 概览

### 重试函数

| 函数 | 描述 |
|------|------|
| `retry(fn, options)` | 通用重试函数 |
| `retryQuick(fn, maxRetries)` | 快速重试 (默认配置) |
| `retryExponential(fn, options)` | 指数退避 |
| `retryLinear(fn, options)` | 线性退避 |
| `retryFixed(fn, options)` | 固定延迟 |

### 配置选项

```typescript
interface RetryOptions {
  maxRetries?: number;          // 最大重试次数，默认 3
  initialDelay?: number;        // 初始延迟 (ms)，默认 1000
  maxDelay?: number;            // 最大延迟 (ms)，默认 30000
  strategy?: 'exponential' | 'linear' | 'fixed';
  backoffFactor?: number;       // 退避因子，默认 2
  jitter?: boolean;             // 随机抖动，默认 true
  timeout?: number;             // 超时时间 (ms)
  shouldRetry?: (error, attempt) => boolean;
  onRetry?: (error, attempt, delay) => void;
  onSuccess?: (result, attempt) => void;
  onFailure?: (error, totalAttempts) => void;
}
```

### 重试结果

```typescript
interface RetryResult<T> {
  success: boolean;
  value?: T;                    // 成功时的返回值
  error?: any;                  // 失败时的错误
  attempts: number;             // 总尝试次数
  totalTime: number;            // 总耗时 (ms)
  delays: number[];             // 每次重试的延迟
}
```

---

## 🎯 应用场景

- ✅ API 请求重试
- ✅ 数据库连接
- ✅ 文件上传/下载
- ✅ 消息队列处理
- ✅ 第三方服务调用
- ✅ 网络资源获取

---

## ⚠️ 最佳实践

1. **区分错误类型** - 只对临时错误重试，业务错误不重试
2. **设置合理上限** - 避免无限重试耗尽资源
3. **启用抖动** - 多实例环境避免同时重试
4. **配合断路器** - 服务持续失败时及时熔断
5. **添加超时** - 避免单次尝试无限等待
6. **记录指标** - 监控重试率、成功率

---

## 📚 完整文档

详细使用示例请查看: [`retry-utils-skill.examples.md`](./retry-utils-skill.examples.md)

---

**Version:** 1.0.0  
**Author:** Axon  
**License:** MIT
