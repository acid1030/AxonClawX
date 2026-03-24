# 适配器模式专业版 - 使用示例

**文件:** `adapter-pattern-pro-skill.ts`  
**版本:** 2.0.0  
**作者:** KAEL  
**日期:** 2026-03-13

---

## 📋 目录

1. [适配器定义](#1-适配器定义)
2. [接口转换](#2-接口转换)
3. [双向适配](#3-双向适配)
4. [高级适配器](#4-高级适配器)
5. [实战场景](#5-实战场景)

---

## 1. 适配器定义

### 1.1 创建基础适配器

```typescript
import { createAdapter } from './adapter-pattern-pro-skill';

// 字符串大小写转换器
const caseAdapter = createAdapter(
  'CaseAdapter',
  (str: string) => str.toUpperCase(),
  (str: string) => str.toLowerCase()
);

const upper = caseAdapter.adapt('hello');
// 输出: "HELLO"

const lower = caseAdapter.reverse!('HELLO');
// 输出: "hello"
```

### 1.2 创建异步适配器

```typescript
import { createAsyncAdapter } from './adapter-pattern-pro-skill';

// API 响应适配器
const apiAdapter = createAsyncAdapter(
  'ApiAdapter',
  async (url: string) => {
    const response = await fetch(url);
    const data = await response.json();
    return {
      success: response.ok,
      data: data,
      timestamp: new Date().toISOString()
    };
  }
);

const result = await apiAdapter.adapt('https://api.example.com/users');
```

### 1.3 适配器注册中心

```typescript
import { AdapterRegistryImpl, createAdapter } from './adapter-pattern-pro-skill';

const registry = AdapterRegistryImpl.getInstance();

// 注册适配器
registry.register(createAdapter('UpperCase', s => s.toUpperCase()));
registry.register(createAdapter('LowerCase', s => s.toLowerCase()));
registry.register(createAdapter('Trim', s => s.trim()));

// 查找适配器
const adapters = registry.find({ name: 'Case' });

// 获取并使用
const upperAdapter = registry.get<string, string>('UpperCase');
if (upperAdapter) {
  const result = upperAdapter.adapt('hello');
  console.log(result); // "HELLO"
}

// 列出所有适配器
const all = registry.list();
all.forEach(meta => {
  console.log(`${meta.name}: ${meta.inputType} → ${meta.outputType}`);
});
```

---

## 2. 接口转换

### 2.1 简单字段映射

```typescript
import { createInterfaceAdapter } from './adapter-pattern-pro-skill';

// 旧版用户数据
const legacyUser = {
  user_id: 123,
  user_name: 'Alice',
  user_email: 'alice@example.com'
};

// 转换为新版格式
const modernUser = createInterfaceAdapter({
  source: legacyUser,
  mapping: {
    id: 'user_id',
    name: 'user_name',
    email: 'user_email'
  }
});

// 输出: { id: 123, name: 'Alice', email: 'alice@example.com' }
```

### 2.2 使用转换函数

```typescript
const legacyProduct = {
  price_cents: 9999,
  quantity: 5,
  created_at: '2026-03-13T10:00:00Z'
};

const modernProduct = createInterfaceAdapter({
  source: legacyProduct,
  mapping: {
    price: (src) => src.price_cents / 100,
    totalPrice: (src) => (src.price_cents * src.quantity) / 100,
    createdAt: (src) => new Date(src.created_at),
    currency: () => 'CNY' // 常量值
  }
});

// 输出: { price: 99.99, totalPrice: 499.95, createdAt: Date, currency: 'CNY' }
```

### 2.3 批量转换

```typescript
import { batchTransform } from './adapter-pattern-pro-skill';

const legacyUsers = [
  { user_id: 1, user_name: 'Alice', user_email: 'alice@example.com' },
  { user_id: 2, user_name: 'Bob', user_email: 'bob@example.com' },
  { user_id: 3, user_name: 'Carol', user_email: 'carol@example.com' }
];

const modernUsers = batchTransform(legacyUsers, {
  id: 'user_id',
  name: 'user_name',
  email: 'user_email'
});

// 输出: [
//   { id: 1, name: 'Alice', email: 'alice@example.com' },
//   { id: 2, name: 'Bob', email: 'bob@example.com' },
//   { id: 3, name: 'Carol', email: 'carol@example.com' }
// ]
```

### 2.4 深度字段映射

```typescript
import { createDeepAdapter } from './adapter-pattern-pro-skill';

const nestedData = {
  user: {
    profile: {
      firstName: 'Alice',
      lastName: 'Zhang'
    },
    contact: {
      email: 'alice@example.com',
      phone: '+86-138-0000-0000'
    }
  }
};

const flattened = createDeepAdapter(nestedData, {
  fullName: 'user.profile.firstName',
  surname: 'user.profile.lastName',
  emailAddress: 'user.contact.email',
  phoneNumber: 'user.contact.phone'
});

// 输出: {
//   fullName: 'Alice',
//   surname: 'Zhang',
//   emailAddress: 'alice@example.com',
//   phoneNumber: '+86-138-0000-0000'
// }
```

### 2.5 严格模式

```typescript
try {
  const result = createInterfaceAdapter({
    source: { id: 1, name: 'Alice' },
    mapping: {
      id: 'id',
      name: 'name',
      email: 'email' // 源对象中不存在
    },
    strict: true // 开启严格模式
  });
} catch (error) {
  console.error(error.message);
  // 输出: Source field "email" not found in strict mode
}
```

---

## 3. 双向适配

### 3.1 自定义双向适配器

```typescript
import { createBidirectionalAdapter } from './adapter-pattern-pro-skill';

// 温度转换器
const tempAdapter = createBidirectionalAdapter({
  name: 'TemperatureConverter',
  forward: (celsius: { c: number }) => ({
    f: celsius.c * 9/5 + 32
  }),
  reverse: (fahrenheit: { f: number }) => ({
    c: (fahrenheit.f - 32) * 5/9
  })
});

const f = tempAdapter.adapt({ c: 25 });
// 输出: { f: 77 }

const c = tempAdapter.reverse!(f);
// 输出: { c: 25 }
```

### 3.2 JSON 序列化适配器

```typescript
import { createJsonAdapter } from './adapter-pattern-pro-skill';

const jsonAdapter = createJsonAdapter({
  replacer: ['name', 'age'], // 只序列化这些字段
  space: 2 // 缩进
});

const obj = { name: 'Alice', age: 30, secret: 'hidden' };
const json = jsonAdapter.adapt(obj);
// 输出: '{\n  "name": "Alice",\n  "age": 30\n}'

const parsed = jsonAdapter.reverse(json);
// 输出: { name: 'Alice', age: 30 }
```

### 3.3 CSV ↔ JSON 转换

```typescript
import { createFormatAdapter } from './adapter-pattern-pro-skill';

const csvData = `name,age,city
Alice,30,Beijing
Bob,25,Shanghai
Carol,28,Guangzhou`;

const csvJsonAdapter = createFormatAdapter('csv', 'json');

// CSV → JSON
const json = csvJsonAdapter.adapt(csvData);
// 输出: [
//   { name: 'Alice', age: '30', city: 'Beijing' },
//   { name: 'Bob', age: '25', city: 'Shanghai' },
//   { name: 'Carol', age: '28', city: 'Guangzhou' }
// ]

// JSON → CSV
const csv = csvJsonAdapter.reverse(json);
// 输出: "name,age,city\nAlice,30,Beijing\nBob,25,Shanghai\nCarol,28,Guangzhou"
```

### 3.4 使用预定义适配器

```typescript
import {
  stringCaseAdapter,
  numberStringAdapter,
  timestampDateAdapter,
  base64Adapter
} from './adapter-pattern-pro-skill';

// 大小写转换
const upper = stringCaseAdapter.adapt('hello'); // "HELLO"
const lower = stringCaseAdapter.reverse!('HELLO'); // "hello"

// 数字 ↔ 字符串
const str = numberStringAdapter.adapt(42); // "42"
const num = numberStringAdapter.reverse!("42"); // 42

// 时间戳 ↔ 日期
const timestamp = timestampDateAdapter.adapt(new Date()); // 1710324000000
const date = timestampDateAdapter.reverse!(timestamp); // Date 对象

// Base64 编码
const encoded = base64Adapter.adapt('Hello, World!'); // "SGVsbG8sIFdvcmxkIQ=="
const decoded = base64Adapter.reverse!(encoded); // "Hello, World!"
```

---

## 4. 高级适配器

### 4.1 链式适配器

```typescript
import {
  createJsonAdapter,
  createChainedAdapter,
  stringCaseAdapter
} from './adapter-pattern-pro-skill';

const jsonAdapter = createJsonAdapter();

// 对象 → JSON → 大写字符串
const chained = createChainedAdapter({
  name: 'ObjectToUppercaseJson',
  first: jsonAdapter,
  second: stringCaseAdapter
});

const obj = { name: 'Axon', version: '2.0' };
const result = chained.adapt(obj);
// 输出: "{ \"NAME\": \"AXON\", \"VERSION\": \"2.0\" }"
```

### 4.2 缓存适配器

```typescript
import { createAsyncAdapter, createCachedAdapter } from './adapter-pattern-pro-skill';

// 模拟慢速 API 调用
const slowApiAdapter = createAsyncAdapter(
  'SlowApi',
  async (id: number) => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    return { id, name: `User ${id}`, fetchedAt: new Date() };
  }
);

// 添加缓存 (5 分钟 TTL, 最多 100 条)
const cachedApiAdapter = createCachedAdapter({
  adapter: slowApiAdapter,
  ttlMs: 5 * 60 * 1000,
  maxEntries: 100,
  cacheKeyFn: (id) => `user:${id}`
});

// 首次调用 - 1000ms
const user1 = await cachedApiAdapter.adapt(123);

// 第二次调用 - <1ms (缓存命中)
const user1Cached = await cachedApiAdapter.adapt(123);

// 不同参数 - 1000ms
const user2 = await cachedApiAdapter.adapt(456);
```

### 4.3 验证适配器

```typescript
import {
  createAdapter,
  createValidatingAdapter,
  ValidationRule
} from './adapter-pattern-pro-skill';

const paymentAdapter = createAdapter(
  'PaymentAdapter',
  (amount: number) => ({ amount, currency: 'CNY', timestamp: Date.now() })
);

// 定义验证规则
const rules: ValidationRule<number>[] = [
  {
    name: 'positive',
    test: (n) => n > 0,
    message: '金额必须大于 0'
  },
  {
    name: 'maxLimit',
    test: (n) => n <= 1000000,
    message: '金额不能超过 1,000,000'
  },
  {
    name: 'twoDecimals',
    test: (n) => {
      const str = n.toString();
      const decimalPart = str.split('.')[1];
      return !decimalPart || decimalPart.length <= 2;
    },
    message: '金额最多保留两位小数'
  }
];

// 创建验证适配器
const validatingPaymentAdapter = createValidatingAdapter(
  paymentAdapter,
  rules
);

// 有效输入
const payment1 = validatingPaymentAdapter.adapt(99.99);
// 输出: { amount: 99.99, currency: 'CNY', timestamp: ... }

// 无效输入 - 抛出错误
try {
  validatingPaymentAdapter.adapt(-50);
} catch (error) {
  console.error(error.message); // "Validation failed: 金额必须大于 0"
}
```

---

## 5. 实战场景

### 5.1 API 版本迁移

```typescript
import { createInterfaceAdapter, batchTransform } from './adapter-pattern-pro-skill';

// 场景：从 API v1 迁移到 v2

// v1 响应格式
interface UserV1 {
  user_id: number;
  user_name: string;
  user_email: string;
  created_at: string;
  profile: {
    age: number;
    bio: string;
  };
}

// v2 期望格式
interface UserV2 {
  id: number;
  name: string;
  email: string;
  createdAt: Date;
  age: number;
  bio: string;
}

const userV1ToV2 = (v1: UserV1): UserV2 => createInterfaceAdapter({
  source: v1,
  mapping: {
    id: 'user_id',
    name: 'user_name',
    email: 'user_email',
    createdAt: (src) => new Date(src.created_at),
    age: (src) => src.profile.age,
    bio: (src) => src.profile.bio
  }
});

// 批量迁移
const usersV1: UserV1[] = await fetch('/api/v1/users').then(r => r.json());
const usersV2: UserV2[] = batchTransform(usersV1, {
  id: 'user_id',
  name: 'user_name',
  email: 'user_email',
  createdAt: (src) => new Date(src.created_at),
  age: (src) => src.profile.age,
  bio: (src) => src.profile.bio
});
```

### 5.2 数据导入导出

```typescript
import { createFormatAdapter, createJsonAdapter } from './adapter-pattern-pro-skill';

// 场景：Excel 导出为 CSV，然后转换为 JSON 处理

const csvJsonAdapter = createFormatAdapter('csv', 'json');
const jsonAdapter = createJsonAdapter({ space: 2 });

// 导入 CSV
const csvData = await readFile('users.csv', 'utf-8');
const users = csvJsonAdapter.adapt(csvData);

// 数据处理
const processedUsers = users.map((u: any) => ({
  ...u,
  name: u.name.toUpperCase(),
  importedAt: new Date().toISOString()
}));

// 导出为格式化的 JSON
const jsonOutput = jsonAdapter.adapt(processedUsers);
await writeFile('users.json', jsonOutput);
```

### 5.3 第三方服务集成

```typescript
import {
  createAsyncAdapter,
  createBidirectionalAdapter,
  createChainedAdapter,
  createCachedAdapter
} from './adapter-pattern-pro-skill';

// 场景：集成 Stripe 支付服务

// Stripe API 适配器
const stripeAdapter = createAsyncAdapter(
  'StripePaymentAdapter',
  async (paymentData: { amount: number; currency: string; customerId: string }) => {
    // 调用 Stripe API
    const charge = await stripe.charges.create({
      amount: Math.round(paymentData.amount * 100), // Stripe 使用最小单位
      currency: paymentData.currency,
      customer: paymentData.customerId
    });
    
    return {
      success: charge.paid,
      transactionId: charge.id,
      amount: charge.amount / 100,
      timestamp: new Date(charge.created * 1000)
    };
  }
);

// 添加缓存和验证
const validatedStripeAdapter = createValidatingAdapter(
  createCachedAdapter({
    adapter: stripeAdapter,
    ttlMs: 60 * 1000, // 1 分钟缓存
    cacheKeyFn: (data) => `${data.customerId}:${data.amount}`
  }),
  [
    { name: 'positive', test: (d) => d.amount > 0, message: '金额必须为正' },
    { name: 'currency', test: (d) => ['CNY', 'USD', 'EUR'].includes(d.currency), message: '不支持的货币' }
  ]
);

// 使用
const result = await validatedStripeAdapter.adapt({
  amount: 99.99,
  currency: 'CNY',
  customerId: 'cus_123456'
});
```

### 5.4 日志格式统一

```typescript
import { createAdapter, createBidirectionalAdapter } from './adapter-pattern-pro-skill';

// 场景：统一不同服务的日志格式

// 定义标准日志格式
interface StandardLog {
  level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
  message: string;
  timestamp: string;
  service: string;
  metadata?: Record<string, any>;
}

// 服务 A 日志适配器
const serviceALogAdapter = createAdapter(
  'ServiceALogAdapter',
  (raw: { log_level: string; msg: string; ts: number; svc: string }) => ({
    level: raw.log_level.toUpperCase() as StandardLog['level'],
    message: raw.msg,
    timestamp: new Date(raw.ts).toISOString(),
    service: raw.svc
  })
);

// 服务 B 日志适配器
const serviceBLogAdapter = createAdapter(
  'ServiceBLogAdapter',
  (raw: { severity: number; text: string; time: string; source: string }) => ({
    level: raw.severity <= 3 ? 'DEBUG' : raw.severity <= 6 ? 'INFO' : raw.severity <= 9 ? 'WARN' : 'ERROR',
    message: raw.text,
    timestamp: raw.time,
    service: raw.source
  })
);

// 统一处理
const logAdapters = {
  serviceA: serviceALogAdapter,
  serviceB: serviceBLogAdapter
};

function normalizeLog(source: 'serviceA' | 'serviceB', rawLog: any): StandardLog {
  return logAdapters[source].adapt(rawLog);
}
```

### 5.5 配置转换

```typescript
import { createInterfaceAdapter, createDeepAdapter } from './adapter-pattern-pro-skill';

// 场景：将环境变量转换为应用配置

const envConfig = {
  DATABASE_URL: 'postgres://localhost:5432/mydb',
  REDIS_HOST: 'localhost',
  REDIS_PORT: '6379',
  JWT_SECRET: 'my-secret-key',
  JWT_EXPIRY: '3600',
  LOG_LEVEL: 'info'
};

const appConfig = createDeepAdapter(envConfig, {
  database: {
    connectionString: 'DATABASE_URL'
  },
  redis: {
    host: 'REDIS_HOST',
    port: (src: any) => parseInt(src.REDIS_PORT)
  },
  auth: {
    secret: 'JWT_SECRET',
    expirySeconds: (src: any) => parseInt(src.JWT_EXPIRY)
  },
  logging: {
    level: (src: any) => src.LOG_LEVEL.toUpperCase()
  }
});

// 输出:
// {
//   database: { connectionString: 'postgres://localhost:5432/mydb' },
//   redis: { host: 'localhost', port: 6379 },
//   auth: { secret: 'my-secret-key', expirySeconds: 3600 },
//   logging: { level: 'INFO' }
// }
```

---

## 🎯 最佳实践

### 1. 适配器命名

```typescript
// ✅ 好的命名
const userV1ToV2Adapter = createAdapter('UserV1ToV2', ...);
const jsonCsvAdapter = createFormatAdapter('json', 'csv');

// ❌ 避免模糊命名
const adapter1 = createAdapter('Adapter1', ...);
const myAdapter = createAdapter('MyAdapter', ...);
```

### 2. 错误处理

```typescript
// 在适配器中处理错误
const safeAdapter = createAsyncAdapter(
  'SafeApiAdapter',
  async (url: string) => {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      // 转换为标准错误格式
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
);
```

### 3. 性能优化

```typescript
// 对频繁调用的适配器使用缓存
const expensiveAdapter = createCachedAdapter({
  adapter: computeHeavyAdapter,
  ttlMs: 10 * 60 * 1000, // 10 分钟
  maxEntries: 1000,
  cacheKeyFn: (input) => JSON.stringify(input)
});
```

### 4. 类型安全

```typescript
// 明确定义输入输出类型
interface Input { id: number; name: string; }
interface Output { userId: number; userName: string; }

const typedAdapter: IAdapter<Input, Output> = createAdapter(
  'TypedAdapter',
  (input: Input): Output => ({
    userId: input.id,
    userName: input.name
  })
);
```

---

## 📊 性能对比

| 适配器类型 | 首次调用 | 缓存命中 | 适用场景 |
|-----------|---------|---------|---------|
| 基础适配器 | <1ms | N/A | 简单转换 |
| 异步适配器 | 取决于 IO | N/A | API 调用 |
| 缓存适配器 | 取决于源 | <1ms | 重复查询 |
| 链式适配器 | 累加 | 取决于缓存 | 复杂流程 |
| 验证适配器 | +0.1ms | N/A | 数据校验 |

---

## 🔧 调试技巧

```typescript
// 添加日志的适配器包装
function withLogging<TIn, TOut>(
  adapter: IAdapter<TIn, TOut>
): IAdapter<TIn, TOut> {
  return {
    ...adapter,
    adapt: (input) => {
      console.log(`[Adapter:${adapter.name}] Input:`, input);
      const start = Date.now();
      const result = adapter.adapt(input);
      const duration = Date.now() - start;
      console.log(`[Adapter:${adapter.name}] Output:`, result, `(${duration}ms)`);
      return result;
    }
  };
}

// 使用
const loggedAdapter = withLogging(myAdapter);
```

---

**文档版本:** 1.0.0  
**最后更新:** 2026-03-13  
**维护者:** KAEL
