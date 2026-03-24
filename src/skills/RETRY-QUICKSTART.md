# Retry Utils - Quick Start Examples

快速重试工具使用示例。5 分钟上手！

---

## 📦 安装导入

```typescript
import retryUtils, {
  retry,
  retryExponential,
  CircuitBreaker,
  createNetworkErrorRetryCondition
} from './src/skills/retry-utils-skill';
```

---

## 🚀 5 个核心示例

### 1️⃣ 基础重试 (3 次)

```typescript
const result = await retry(async () => {
  return await fetch('https://api.example.com/data');
});

if (result.success) {
  console.log('Data:', result.value);
} else {
  console.error('Failed:', result.error);
}
```

### 2️⃣ 指数退避 (推荐)

```typescript
const result = await retryExponential(async () => {
  return await database.connect();
}, {
  maxRetries: 5,
  initialDelay: 1000,  // 1s → 2s → 4s → 8s → 16s
  jitter: true         // 添加随机抖动
});
```

### 3️⃣ 条件重试 (仅网络错误)

```typescript
const result = await retry(async () => {
  return await api.call();
}, {
  maxRetries: 5,
  shouldRetry: createNetworkErrorRetryCondition()
  // 只在网络错误时重试，业务错误不重试
});
```

### 4️⃣ 添加日志

```typescript
const result = await retry(async () => {
  return await fetch('/api');
}, {
  maxRetries: 3,
  onRetry: (error, attempt, delay) => {
    console.warn(`Retry ${attempt}: ${error.message}. Wait ${delay}ms`);
  }
});
```

### 5️⃣ 断路器保护

```typescript
const breaker = new CircuitBreaker({
  failureThreshold: 5,   // 连续失败 5 次熔断
  resetTimeout: 60000    // 60 秒后恢复
});

const result = await retryUtils.retryWithCircuitBreaker(
  async () => await externalService.call(),
  breaker
);
```

---

## ⚙️ 配置选项

```typescript
interface RetryOptions {
  maxRetries?: number;           // 最大重试次数 (默认 3)
  initialDelay?: number;         // 初始延迟 ms (默认 1000)
  maxDelay?: number;             // 最大延迟 ms (默认 30000)
  strategy?: 'exponential' | 'linear' | 'fixed';  // 退避策略
  backoffFactor?: number;        // 退避因子 (默认 2)
  jitter?: boolean;              // 随机抖动 (默认 true)
  timeout?: number;              // 超时 ms (0 无限制)
  shouldRetry?: (error, attempt) => boolean;  // 重试条件
  onRetry?: (error, attempt, delay) => void;  // 重试回调
  onSuccess?: (result, attempt) => void;      // 成功回调
  onFailure?: (error, attempts) => void;      // 失败回调
}
```

---

## 📊 退避策略对比

| 策略 | 延迟序列 (ms) | 适用场景 |
|------|-------------|---------|
| **exponential** | 1000, 2000, 4000, 8000... | 大多数场景 ✅ |
| **linear** | 1000, 2000, 3000, 4000... | 可预测的重试 |
| **fixed** | 1000, 1000, 1000, 1000... | 测试/简单场景 |

---

## 🎯 实际场景

### API 请求
```typescript
const data = await retryExponential(
  async () => (await fetch('/api/users')).json(),
  { maxRetries: 5, timeout: 10000 }
);
```

### 数据库连接
```typescript
const conn = await retry(
  async () => await db.connect(connectionString),
  { maxRetries: 10, initialDelay: 500 }
);
```

### 文件上传
```typescript
const result = await retry(
  async () => await uploadFile(file),
  { 
    maxRetries: 5,
    shouldRetry: (e) => e.message.includes('network')
  }
);
```

---

## ⚠️ 注意事项

1. ✅ **启用 Jitter** - 避免多实例同时重试
2. ✅ **设置超时** - 避免无限等待
3. ✅ **条件重试** - 业务错误不要重试
4. ✅ **使用断路器** - 服务雪崩时及时熔断
5. ❌ **不要无限重试** - 始终设置 maxRetries

---

## 📚 完整文档

- 主文件：`src/skills/retry-utils-skill.ts`
- 详细示例：`src/skills/retry-utils-skill.examples.md`
- 单元测试：`src/skills/retry-utils-skill.test.ts`

---

**完成时间:** < 5 分钟  
**版本:** 1.0.0  
**作者:** Axon (KAEL Subagent)
