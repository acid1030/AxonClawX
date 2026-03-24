# 舱壁模式工具 - KAEL

> 资源隔离 · 故障隔离 · 系统弹性

---

## 🚀 快速开始

```bash
# 运行示例
npx ts-node src/skills/bulkhead-pattern-skill.ts
```

---

## 📦 核心功能

### 1. 舱壁定义 (Bulkhead Definition)
- 资源获取/释放管理
- 资源池大小控制
- 状态管理 (healthy/constrained/open/half_open/failed)

### 2. 资源池隔离 (Resource Pool Isolation)
- 多舱壁统一管理
- 资源池组织
- 全局指标监控

### 3. 故障隔离 (Fault Isolation)
- 级联故障预防
- 自动恢复机制
- 健康状态报告

---

## 💡 基本用法

```typescript
import { createBulkhead } from './bulkhead-pattern-skill';

// 创建舱壁
const bulkhead = createBulkhead({
  name: 'database',
  resourceType: 'connection',
  maxResources: 20,
  failureThreshold: 5
});

// 使用资源
const permit = await bulkhead.acquire();
try {
  await db.query('SELECT * FROM users');
  bulkhead.recordSuccess();
} catch (error) {
  bulkhead.recordFailure();
  throw error;
} finally {
  permit.release();
}
```

---

## 📁 文件清单

| 文件 | 描述 |
|------|------|
| `bulkhead-pattern-skill.ts` | 核心实现 |
| `bulkhead-pattern-examples.md` | 详细使用示例 |
| `BULKHEAD-README.md` | 本文件 (快速参考) |

---

## 🎯 适用场景

- ✅ 数据库连接池保护
- ✅ 微服务线程池隔离
- ✅ API 限流保护
- ✅ 内存/CPU 配额管理
- ✅ 第三方服务调用保护

---

## 📊 资源类型

- `thread` - 线程池
- `connection` - 数据库/网络连接
- `memory` - 内存配额
- `cpu` - CPU 时间片
- `bandwidth` - 带宽配额
- `custom` - 自定义资源

---

## 🔧 API 速查

### Bulkhead
```typescript
acquire(timeoutMs?)      // 获取资源
tryAcquire()             // 尝试获取 (非阻塞)
recordSuccess()          // 记录成功
recordFailure()          // 记录失败
getState()               // 获取状态
getMetrics()             // 获取指标
onEvent(handler)         // 监听事件
```

### ResourcePoolManager
```typescript
createBulkhead(config)        // 创建舱壁
getBulkhead(name)             // 获取舱壁
createResourcePool(name, [])  // 创建资源池
getResourcePool(name)         // 获取资源池
getAllMetrics()               // 所有指标
getUnhealthyBulkheads()       // 不健康舱壁
```

### FaultIsolator
```typescript
defineFailurePropagation(src, targets)  // 故障传播
isolateFault(name, cascade)             // 隔离故障
recoverBulkhead(name)                   // 恢复舱壁
getHealthReport()                       // 健康报告
```

---

## 📈 舱壁状态

| 状态 | 描述 | 行为 |
|------|------|------|
| `healthy` | 正常运行 | 接受所有请求 |
| `constrained` | 资源受限 | 接受请求，触发告警 |
| `open` | 已打开 | 拒绝所有请求 |
| `half_open` | 半开 | 测试恢复 |
| `failed` | 故障 | 拒绝所有请求 |

---

## 🎓 学习资源

- **详细文档**: `bulkhead-pattern-examples.md`
- **运行示例**: `npx ts-node src/skills/bulkhead-pattern-skill.ts`
- **设计模式**: 舱壁模式 (Bulkhead Pattern)

---

**作者:** KAEL  
**版本:** 1.0.0  
**日期:** 2026-03-13
