# 🔌 熔断器技能使用指南

**文件位置:** `src/skills/circuit-breaker-skill.ts`  
**版本:** 1.0.0  
**作者:** Axon

---

## 📋 功能概述

熔断器 (Circuit Breaker) 是一种保护系统免受重复故障影响的设计模式。当某个操作连续失败时，熔断器会"跳闸"，在一段时间内阻止后续请求，给系统恢复的时间。

### 三种状态

```
CLOSED (闭合) ──[失败达到阈值]──> OPEN (打开/熔断)
     ↑                                ↓
     │                        [等待恢复时间]
     │                                ↓
     └────[半开状态成功]──── HALF_OPEN (半开)
```

| 状态 | 行为 | 说明 |
|------|------|------|
| **CLOSED** | 正常执行 | 系统健康，请求正常通过 |
| **OPEN** | 拒绝请求 | 系统故障，立即返回错误 |
| **HALF_OPEN** | 有限测试 | 允许少量请求测试系统是否恢复 |

---

## 🚀 快速开始

### 1. 基础用法

```typescript
import { circuitBreakerSkill } from './skills/circuit-breaker-skill';

// 创建熔断器
const breaker = circuitBreakerSkill.create({
  failureThreshold: 3,      // 3 次失败后熔断
  resetTimeout: 30000,      // 30 秒后尝试恢复
  successThreshold: 2,      // 半开状态下 2 次成功后恢复
});

// 执行受保护的操作
try {
  const result = await circuitBreakerSkill.protect(
    breaker,
    async () => {
      // 你的业务逻辑
      const response = await fetch('https://api.example.com/data');
      if (!response.ok) throw new Error('API Error');
      return response.json();
    },
    // 降级方案 (可选)
    async () => {
      return { cached: true, data: [] };
    }
  );
  console.log('✅ 成功:', result);
} catch (error) {
  console.error('❌ 失败:', error);
}
```

### 2. 状态监听

```typescript
// 监听状态变化
breaker.onStateChange = (from, to) => {
  console.log(`🔌 熔断状态变化：${from} → ${to}`);
  
  if (to === 'OPEN') {
    // 发送告警
    sendAlert('服务熔断，请立即处理!');
  }
};

// 监听失败
breaker.onFailure = (error) => {
  console.error('⚠️ 操作失败:', error.message);
};

// 监听成功
breaker.onSuccess = () => {
  console.log('✅ 操作成功');
};
```

### 3. 查询状态

```typescript
const stats = circuitBreakerSkill.getStatus(breaker);
console.log('📊 熔断器状态:', stats);

// 输出示例:
// {
//   state: 'CLOSED',
//   failureCount: 0,
//   successCount: 5,
//   totalRequests: 100,
//   totalFailures: 3,
//   totalSuccesses: 97,
//   nextRetryTime: undefined
// }
```

---

## 📖 完整示例

### 示例 1: API 调用保护

```typescript
import { circuitBreakerSkill, CircuitBreaker } from './skills/circuit-breaker-skill';

class ApiService {
  private breaker: CircuitBreaker;

  constructor() {
    this.breaker = circuitBreakerSkill.create({
      failureThreshold: 5,      // 5 次失败后熔断
      resetTimeout: 60000,      // 1 分钟后尝试恢复
    });
  }

  async getUser(userId: string) {
    return circuitBreakerSkill.protect(
      this.breaker,
      async () => {
        const res = await fetch(`https://api.example.com/users/${userId}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      },
      async () => {
        // 降级：返回缓存用户数据
        console.warn(`⚠️ 用户服务不可用，返回缓存数据`);
        return this.getCachedUser(userId);
      }
    );
  }

  private async getCachedUser(userId: string) {
    // 从缓存获取
    return { id: userId, name: 'Unknown (Cached)', fallback: true };
  }
}

// 使用
const apiService = new ApiService();
const user = await apiService.getUser('123');
```

### 示例 2: 数据库连接保护

```typescript
import { circuitBreakerSkill } from './skills/circuit-breaker-skill';

class DatabaseService {
  private breaker = circuitBreakerSkill.create({
    failureThreshold: 3,      // 数据库更脆弱，阈值更低
    resetTimeout: 120000,     // 2 分钟恢复时间
    halfOpenMaxRequests: 1,   // 半开状态只允许 1 个测试请求
  });

  async query<T>(sql: string, params?: any[]): Promise<T> {
    return circuitBreakerSkill.protect(
      this.breaker,
      async () => {
        const conn = await this.getConnection();
        const result = await conn.query(sql, params);
        return result as T;
      },
      async () => {
        // 降级：返回空结果
        console.error('❌ 数据库不可用');
        return [] as T;
      }
    );
  }

  private async getConnection() {
    // 获取数据库连接
    return db.pool.getConnection();
  }
}
```

### 示例 3: 多服务熔断器管理

```typescript
import { CircuitBreakerManager } from './skills/circuit-breaker-skill';

// 创建管理器
const manager = new CircuitBreakerManager();

// 为不同服务创建独立的熔断器
const apiBreaker = manager.getOrCreate('external-api', {
  failureThreshold: 5,
  resetTimeout: 30000,
});

const dbBreaker = manager.getOrCreate('database', {
  failureThreshold: 3,
  resetTimeout: 60000,
});

const cacheBreaker = manager.getOrCreate('cache', {
  failureThreshold: 10,
  resetTimeout: 10000,
});

// 查看所有熔断器状态
const allStats = manager.getStatusAll();
console.log('📊 所有服务状态:', allStats);

// 批量重置 (例如：故障恢复后)
manager.resetAll();
```

### 示例 4: 与重试机制结合

```typescript
import { circuitBreakerSkill } from './skills/circuit-breaker-skill';

async function retryWithCircuitBreaker<T>(
  breaker: CircuitBreaker,
  operation: () => Promise<T>,
  maxRetries = 3
): Promise<T> {
  let lastError: Error;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await circuitBreakerSkill.protect(breaker, operation);
    } catch (error) {
      lastError = error as Error;
      console.warn(`⚠️ 重试 ${i + 1}/${maxRetries}: ${error}`);
      
      // 指数退避
      const delay = Math.pow(2, i) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}

// 使用
const result = await retryWithCircuitBreaker(
  breaker,
  async () => {
    return fetch('https://api.example.com/data').then(r => r.json());
  },
  3
);
```

---

## ⚙️ 配置参数

### CircuitBreakerOptions

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `failureThreshold` | number | 5 | 失败次数达到此值后熔断 |
| `resetTimeout` | number | 30000 | 熔断后等待恢复的时间 (毫秒) |
| `halfOpenMaxRequests` | number | 3 | 半开状态允许的最大测试请求数 |
| `successThreshold` | number | 2 | 半开状态下成功多少次后恢复闭合 |

### 推荐配置

| 场景 | failureThreshold | resetTimeout | 说明 |
|------|-----------------|--------------|------|
| **外部 API** | 5 | 30s | 网络波动常见，给足够恢复时间 |
| **数据库** | 3 | 60s | 数据库故障影响大，更早熔断 |
| **缓存服务** | 10 | 10s | 缓存故障影响小，快速恢复 |
| **关键业务** | 2 | 120s | 关键服务，保守策略 |

---

## 🎯 最佳实践

### ✅ 应该做的

1. **为不同服务创建独立熔断器**
   ```typescript
   const apiBreaker = createBreaker('api');
   const dbBreaker = createBreaker('db');
   ```

2. **始终提供降级方案**
   ```typescript
   protect(breaker, operation, fallback); // 提供 fallback
   ```

3. **监控熔断状态**
   ```typescript
   breaker.onStateChange = (from, to) => {
     if (to === 'OPEN') sendAlert();
   };
   ```

4. **根据业务调整参数**
   ```typescript
   // 关键服务：更保守
   { failureThreshold: 2, resetTimeout: 120000 }
   ```

### ❌ 不应该做的

1. **不要捕获所有错误而不记录**
   ```typescript
   // ❌ 错误做法
   try { await operation(); } catch (e) { /* 忽略 */ }
   
   // ✅ 正确做法
   breaker.onFailure = (e) => logError(e);
   ```

2. **不要使用过短的恢复时间**
   ```typescript
   // ❌ 可能引起雪崩
   { resetTimeout: 1000 } // 1 秒太短
   
   // ✅ 给系统足够恢复时间
   { resetTimeout: 30000 } // 30 秒
   ```

3. **不要在全局使用单个熔断器**
   ```typescript
   // ❌ 一个服务故障影响所有
   const globalBreaker = createBreaker();
   
   // ✅ 每个服务独立
   const breakers = new Map();
   ```

---

## 🔍 故障排查

### 问题 1: 熔断器一直处于 OPEN 状态

**原因:** 半开状态下的测试请求仍然失败

**解决:**
```typescript
// 检查失败原因
breaker.onFailure = (error) => {
  console.error('测试请求失败:', error);
};

// 手动重置 (确认问题已解决后)
circuitBreakerSkill.reset(breaker);
```

### 问题 2: 熔断器频繁跳闸

**原因:** 阈值设置过低或系统确实存在故障

**解决:**
```typescript
// 查看统计数据
const stats = breaker.getStats();
console.log('失败率:', stats.totalFailures / stats.totalRequests);

// 调整阈值
const breaker = circuitBreakerSkill.create({
  failureThreshold: 10, // 提高阈值
});
```

### 问题 3: 降级方案从未触发

**原因:** 熔断器从未进入 OPEN 状态

**解决:**
```typescript
// 检查配置
const breaker = circuitBreakerSkill.create({
  failureThreshold: 3, // 降低阈值测试
});

// 手动测试
breaker.forceOpen(); // 强制熔断
```

---

## 📊 监控指标

建议收集以下指标用于监控：

```typescript
// 定期上报
setInterval(() => {
  const stats = breaker.getStats();
  
  metrics.gauge('circuit_breaker.state', stateToNumber(stats.state));
  metrics.gauge('circuit_breaker.failure_rate', stats.totalFailures / stats.totalRequests);
  metrics.gauge('circuit_breaker.failure_count', stats.failureCount);
  
  if (stats.state === 'OPEN') {
    metrics.increment('circuit_breaker.open_count');
  }
}, 10000);
```

---

## 📝 更新日志

- **v1.0.0** (2026-03-13) - 初始版本
  - ✅ 熔断状态管理
  - ✅ 自动恢复机制
  - ✅ 错误阈值控制
  - ✅ 降级方案支持
  - ✅ 状态监听回调

---

**创建者:** Axon  
**最后更新:** 2026-03-13  
**任务状态:** ✅ 完成
