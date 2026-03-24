# 🔄 适配器模式工具技能 - 使用指南

**位置:** `src/skills/adapter-pattern-skill.ts`  
**作者:** KAEL  
**版本:** 1.0.0  
**创建时间:** 2026-03-13

---

## 📋 功能概览

| 功能 | 描述 | 核心 API | 状态 |
|------|------|----------|------|
| **接口转换** | 将旧接口转换为新接口格式 | `createInterfaceAdapter` | ✅ |
| **批量转换** | 批量转换对象数组 | `batchTransform` | ✅ |
| **双向适配** | 支持正反向转换 | `createBidirectionalAdapter` | ✅ |
| **JSON 适配** | 对象 ↔ JSON 字符串 | `createJsonAdapter` | ✅ |
| **格式转换** | CSV/JSON/XML互转 | `createFormatAdapter` | ✅ |
| **类适配器** | 类级别接口适配 | `LoggerClassAdapter` | ✅ |
| **通用工厂** | 自定义类适配器 | `createClassAdapter` | ✅ |

---

## 🚀 快速开始

### 1. 接口转换 (Interface Adapter)

#### 基础用法

```typescript
import { createInterfaceAdapter } from './src/skills/adapter-pattern-skill';

// 场景：将旧版 API 响应转换为新版格式
const legacyResponse = {
  user_id: 123,
  user_name: 'Alice',
  user_email: 'alice@example.com'
};

const newFormat = createInterfaceAdapter({
  source: legacyResponse,
  mapping: {
    id: 'user_id',
    name: 'user_name',
    email: 'user_email'
  }
});

console.log(newFormat);
// 输出：{ id: 123, name: 'Alice', email: 'alice@example.com' }
```

#### 使用转换函数

```typescript
const product = { price: 100, quantity: 5 };

const transformed = createInterfaceAdapter({
  source: product,
  mapping: {
    // 使用函数进行计算
    total: (p) => p.price * p.quantity,
    // 使用函数进行格式化
    formattedPrice: (p) => `$${p.price.toFixed(2)}`,
    // 直接映射字段
    available: (p) => p.quantity > 0
  }
});

console.log(transformed);
// 输出：{ total: 500, formattedPrice: '$100.00', available: true }
```

#### 批量转换

```typescript
import { batchTransform } from './src/skills/adapter-pattern-skill';

const legacyUsers = [
  { user_id: 1, user_name: 'Bob' },
  { user_id: 2, user_name: 'Carol' },
  { user_id: 3, user_name: 'David' }
];

const newUsers = batchTransform(legacyUsers, {
  id: 'user_id',
  name: 'user_name'
});

console.log(newUsers);
// 输出：[
//   { id: 1, name: 'Bob' },
//   { id: 2, name: 'Carol' },
//   { id: 3, name: 'David' }
// ]
```

---

### 2. 双向适配 (Bidirectional Adapter)

#### 自定义双向适配器

```typescript
import { createBidirectionalAdapter } from './src/skills/adapter-pattern-skill';

// 温度转换器 (摄氏度 ↔ 华氏度)
const tempAdapter = createBidirectionalAdapter({
  forward: (celsius: { celsius: number }) => ({
    fahrenheit: celsius.celsius * 9/5 + 32
  }),
  reverse: (fahrenheit: { fahrenheit: number }) => ({
    celsius: (fahrenheit.fahrenheit - 32) * 5/9
  })
});

// 正向转换
const f = tempAdapter.adapt({ celsius: 25 });
console.log(f); // { fahrenheit: 77 }

// 反向转换
const c = tempAdapter.reverse!(f);
console.log(c); // { celsius: 25 }
```

#### JSON 双向适配器

```typescript
import { createJsonAdapter } from './src/skills/adapter-pattern-skill';

const jsonAdapter = createJsonAdapter();

const obj = { name: 'Axon', version: '1.0' };

// 对象 → JSON
const jsonStr = jsonAdapter.adapt(obj);
console.log(jsonStr); // '{"name":"Axon","version":"1.0"}'

// JSON → 对象
const parsed = jsonAdapter.reverse!(jsonStr);
console.log(parsed); // { name: 'Axon', version: '1.0' }
```

#### 格式转换 (CSV ↔ JSON)

```typescript
import { createFormatAdapter } from './src/skills/adapter-pattern-skill';

// CSV → JSON
const csvToJson = createFormatAdapter('csv', 'json');

const csvData = 'name,age,city\nAlice,30,Beijing\nBob,25,Shanghai';
const jsonData = csvToJson.adapt(csvData);

console.log(jsonData);
// [
//   { name: 'Alice', age: '30', city: 'Beijing' },
//   { name: 'Bob', age: '25', city: 'Shanghai' }
// ]

// JSON → CSV
const jsonToCsv = createFormatAdapter('json', 'csv');
const csvBack = jsonToCsv.adapt(jsonData);

console.log(csvBack);
// name,age,city
// Alice,30,Beijing
// Bob,25,Shanghai
```

---

### 3. 类适配器 (Class Adapter)

#### 内置日志适配器

```typescript
import { LoggerClassAdapter, ILegacyLogger } from './src/skills/adapter-pattern-skill';

// 旧版日志服务
const legacyLogger: ILegacyLogger = {
  logMessage: (msg) => console.log(`[LOG] ${msg}`),
  logErrorLegacy: (err) => console.error(`[ERROR] ${err}`),
  logWarningLegacy: (warn) => console.warn(`[WARN] ${warn}`)
};

// 创建适配器
const adapter = new LoggerClassAdapter(legacyLogger);
const newLogger = adapter.instance;

// 使用新版接口调用旧版服务
newLogger.info('System started');      // 内部调用 logMessage
newLogger.error('Database failed');    // 内部调用 logErrorLegacy
newLogger.warn('Low memory');          // 内部调用 logWarningLegacy
```

#### 通用类适配器工厂

```typescript
import { createClassAdapter } from './src/skills/adapter-pattern-skill';

// 旧版支付服务
const legacyPayment = {
  processPayment: (amount: number) => `Payment processed: $${amount}`,
  returnPayment: (id: string) => `Payment returned: ${id}`
};

// 创建适配器
const paymentAdapter = createClassAdapter(
  legacyPayment,
  // 正向适配：旧版 → 新版
  (legacy) => ({
    pay: (amount: number) => legacy.processPayment(amount),
    refund: (id: string) => legacy.returnPayment(id)
  }),
  // 反向适配：新版 → 旧版 (可选)
  (modern) => ({
    processPayment: (amount: number) => modern.pay(amount),
    returnPayment: (id: string) => modern.refund(id)
  })
);

// 使用新版接口
console.log(paymentAdapter.instance.pay(100));
// 输出：Payment processed: $100

// 反向调用
console.log(paymentAdapter.reverse!(paymentAdapter.instance).processPayment(200));
// 输出：Payment processed: $200
```

---

## 🎯 实际应用场景

### 场景 1: API 版本迁移

```typescript
// 旧版 API v1 响应
interface UserV1 {
  user_id: number;
  user_name: string;
  user_email: string;
  created_at: string;
}

// 新版 API v2 响应
interface UserV2 {
  id: number;
  name: string;
  email: string;
  createdAt: Date;
  displayName: string;
}

function migrateUserV1ToV2(v1: UserV1): UserV2 {
  return createInterfaceAdapter({
    source: v1,
    mapping: {
      id: 'user_id',
      name: 'user_name',
      email: 'user_email',
      createdAt: (src) => new Date(src.created_at),
      displayName: (src) => src.user_name.toUpperCase()
    }
  });
}
```

### 场景 2: 第三方服务集成

```typescript
// Stripe 支付响应
interface StripeResponse {
  id: string;
  amount: number; // 分为单位
  currency: string;
  status: string;
}

// 内部支付响应格式
interface PaymentResponse {
  transactionId: string;
  amount: number; // 元为单位
  currency: string;
  success: boolean;
}

const stripeAdapter = createInterfaceAdapter<StripeResponse, PaymentResponse>({
  source: stripeResponse,
  mapping: {
    transactionId: 'id',
    amount: (s) => s.amount / 100, // 分转元
    currency: 'currency',
    success: (s) => s.status === 'succeeded'
  }
});
```

### 场景 3: 数据导入导出

```typescript
// 从 CSV 导入用户数据
const csvData = `username,email,signup_date
alice,alice@example.com,2026-01-01
bob,bob@example.com,2026-01-02`;

const csvToJson = createFormatAdapter('csv', 'json');
const users = csvToJson.adapt(csvData);

// 转换为内部格式
const internalUsers = batchTransform(users, {
  id: (u) => Date.now().toString(), // 生成 ID
  name: 'username',
  email: 'email',
  registeredAt: (u) => new Date(u.signup_date)
});
```

---

## 📊 API 参考

### 接口转换

| 函数 | 参数 | 返回值 | 描述 |
|------|------|--------|------|
| `createInterfaceAdapter` | `InterfaceTransformConfig` | `TTarget` | 单个对象接口转换 |
| `batchTransform` | `items: TSource[]`, `mapping` | `TTarget[]` | 批量对象转换 |

### 双向适配

| 函数 | 参数 | 返回值 | 描述 |
|------|------|--------|------|
| `createBidirectionalAdapter` | `BidirectionalConfig` | `IAdapter` | 自定义双向适配器 |
| `createJsonAdapter` | 无 | `IAdapter<T, string>` | JSON 序列化/反序列化 |
| `createFormatAdapter` | `fromFormat`, `toFormat` | `IAdapter` | 格式转换 (CSV/JSON/XML) |

### 类适配器

| 类/函数 | 参数 | 返回值 | 描述 |
|---------|------|--------|------|
| `LoggerClassAdapter` | `ILegacyLogger` | `INewLogger` | 日志服务适配器 |
| `createClassAdapter` | `legacy`, `adaptFn`, `reverseFn?` | `Adapter` | 通用类适配器工厂 |

---

## ⚠️ 注意事项

1. **类型安全**: 所有函数都使用 TypeScript 泛型，确保编译时类型检查
2. **性能**: 批量转换比单个转换更高效，推荐用于数组处理
3. **错误处理**: 格式转换不支持的格式会抛出异常，建议添加 try-catch
4. **循环引用**: JSON 适配器不支持循环引用对象
5. **大文件**: CSV 转换适合小文件，大文件建议使用流式处理

---

## 🧪 测试

运行内置示例:

```bash
cd /Users/nike/.openclaw/workspace
npx ts-node src/skills/adapter-pattern-skill.ts
```

或编译后运行:

```bash
npx tsc src/skills/adapter-pattern-skill.ts --outDir dist
node dist/adapter-pattern-skill.js
```

---

## 📝 更新日志

### v1.0.0 (2026-03-13)
- ✅ 初始版本发布
- ✅ 接口转换功能
- ✅ 双向适配功能
- ✅ 类适配器功能
- ✅ 完整文档和示例

---

**作者:** KAEL  
**维护:** AxonClaw 工程团队
