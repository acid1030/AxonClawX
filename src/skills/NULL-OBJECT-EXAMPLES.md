# Null Object Pattern - 使用示例

## 📖 概述

空对象模式 (Null Object Pattern) 是一种行为设计模式，用于处理空值检查的复杂性。它提供一个无行为的对象来替代 `null`，从而避免空指针异常和繁琐的空值检查。

## 🎯 核心优势

1. **消除空值检查** - 不需要频繁的 `if (obj !== null)` 判断
2. **默认行为** - 空对象提供安全的默认行为
3. **代码简洁** - 减少条件分支，提高可读性
4. **安全性** - 避免运行时错误

---

## 💡 基础使用示例

### 1. 基本空对象使用

```typescript
import NullObjectSkill, { 
  isNull, 
  safeCall, 
  provideDefault,
  NullObjectRegistry 
} from './src/skills/null-object-skill';

// 创建可能为空的对象
let user: any = null;

// ❌ 传统方式 - 需要频繁检查
if (user !== null && user !== undefined) {
  console.log(user.name);
} else {
  console.log('Anonymous');
}

// ✅ 空对象模式 - 简洁安全
const safeUser = safeCall(user);
console.log(safeUser.getValue() || 'Anonymous');
```

### 2. 空值检查工具

```typescript
import { isNull, isNotNull } from './src/skills/null-object-skill';

// 检查 null/undefined
isNull(null);           // true
isNull(undefined);      // true
isNull({});             // false

// 检查空对象
const nullObj = NullObjectRegistry.getInstance().get();
isNull(nullObj);        // true

// 非空检查
isNotNull({ data: 123 });  // true
isNotNull(null);           // false
```

### 3. 提供默认值

```typescript
import { provideDefault } from './src/skills/null-object-skill';

// 配置对象可能为空
const config = null;
const defaultConfig = { theme: 'dark', lang: 'zh' };

// 安全获取配置
const effectiveConfig = provideDefault(config, defaultConfig);
// 结果：{ theme: 'dark', lang: 'zh' }

// 如果 config 有值则使用 config
const validConfig = { theme: 'light' };
provideDefault(validConfig, defaultConfig);
// 结果：{ theme: 'light' }
```

---

## 🛠️ 专用空对象示例

### 4. 空日志记录器 (Null Logger)

```typescript
import { NullLogger, safeCall } from './src/skills/null-object-skill';

// 场景：某些环境下不需要日志输出
class Application {
  private logger: NullLogger;

  constructor(enableLogging: boolean) {
    // 生产环境使用真实日志，测试环境使用空日志
    this.logger = enableLogging 
      ? new RealLogger() 
      : new NullLogger();
  }

  async processData(data: any) {
    // 无需检查 logger 是否存在
    this.logger.info('开始处理数据', data);
    
    // 处理逻辑...
    
    this.logger.info('数据处理完成');
  }
}

// 使用示例
const app = new Application(false); // 禁用日志
await app.processData({ id: 1 });   // 静默执行，无输出
```

### 5. 空缓存 (Null Cache)

```typescript
import { NullCache } from './src/skills/null-object-skill';

// 场景：缓存功能可选
class DataService {
  private cache: NullCache;

  constructor(useCache: boolean) {
    this.cache = useCache 
      ? new RedisCache() 
      : new NullCache();
  }

  async getData(key: string) {
    // 统一的缓存接口，无需检查
    const cached = this.cache.get(key);
    if (cached) return cached;

    const data = await this.fetchFromDB(key);
    this.cache.set(key, data); // 空缓存静默忽略
    return data;
  }
}
```

### 6. 空用户对象 (Null User)

```typescript
import { NullUser, safeCall } from './src/skills/null-object-skill';

// 场景：未登录用户
function getCurrentUser(): NullUser | RealUser {
  const user = getSessionUser(); // 可能返回 null
  
  if (!user) {
    return new NullUser(); // 返回空用户对象
  }
  
  return user;
}

// 使用
const user = getCurrentUser();
console.log(user.username); // 'anonymous' (空用户默认值)
console.log(user.isNull);   // true
```

### 7. 空通知器 (Null Notifier)

```typescript
import { NullNotifier } from './src/skills/null-object-skill';

// 场景：通知功能可配置
class OrderService {
  private notifier: NullNotifier;

  constructor(enableNotifications: boolean) {
    this.notifier = enableNotifications
      ? new PushNotifier()
      : new NullNotifier();
  }

  async createOrder(order: any) {
    // 创建订单...
    
    // 发送通知 (空通知器静默忽略)
    this.notifier.success('订单创建成功');
  }
}
```

---

## 🔧 高级用法

### 8. 自定义空对象

```typescript
import { NullObjectBase } from './src/skills/null-object-skill';

// 创建自定义空对象
class NullPaymentGateway extends NullObjectBase {
  readonly name = 'NullPaymentGateway';

  async processPayment(amount: number): Promise<any> {
    return {
      success: false,
      transactionId: '',
      message: '支付网关未配置'
    };
  }

  async refund(transactionId: string): Promise<any> {
    return {
      success: false,
      message: '支付网关未配置'
    };
  }
}

// 使用
const gateway = config.paymentEnabled 
  ? new StripeGateway() 
  : new NullPaymentGateway();

// 无需检查，安全调用
const result = await gateway.processPayment(100);
```

### 9. 空对象构建器

```typescript
import { NullObjectBuilder } from './src/skills/null-object-skill';

// 使用构建器创建自定义空对象
const customNullObj = new NullObjectBuilder('MyNullObject')
  .withName('CustomNull')
  .withExecute((...args) => {
    console.log('执行空操作', args);
    return 'default';
  })
  .withGetValue(() => ({ status: 'null' }))
  .build();

// 使用
customNullObj.execute(1, 2, 3);  // 执行自定义空操作
console.log(customNullObj.getValue()); // { status: 'null' }
```

### 10. 空对象注册表

```typescript
import { NullObjectRegistry, NullConfig } from './src/skills/null-object-skill';

// 注册自定义空对象
const registry = NullObjectRegistry.getInstance();
registry.register('config', new NullConfig());
registry.register('user', new NullUser());

// 获取已注册的空对象
const nullConfig = registry.get('config');
const nullUser = registry.get('user');

// 查看已注册的空对象
const names = registry.getRegisteredNames();
// ['default', 'config', 'user']
```

---

## 📊 实际应用场景

### 11. API 客户端容错

```typescript
import { NullObjectBase, safeCall } from './src/skills/null-object-skill';

class NullAPIClient extends NullObjectBase {
  readonly name = 'NullAPIClient';

  async get(url: string): Promise<any> {
    return { data: null, error: 'API 未配置' };
  }

  async post(url: string, data: any): Promise<any> {
    return { data: null, error: 'API 未配置' };
  }
}

// 使用
const apiClient = config.apiEnabled 
  ? new RealAPIClient() 
  : new NullAPIClient();

// 安全调用，无需 try-catch
const response = await apiClient.get('/users');
console.log(response.data); // null (安全)
```

### 12. 策略模式中的空对象

```typescript
import { NullObjectBase } from './src/skills/null-object-skill';

// 空折扣策略
class NullDiscountStrategy extends NullObjectBase {
  readonly name = 'NullDiscountStrategy';

  calculate(price: number): number {
    return price; // 无折扣
  }
}

// 使用
class OrderProcessor {
  private discountStrategy;

  constructor(strategy) {
    this.discountStrategy = strategy || new NullDiscountStrategy();
  }

  process(order) {
    const finalPrice = this.discountStrategy.calculate(order.price);
    // 无需检查策略是否存在
  }
}
```

### 13. 中间件链中的空对象

```typescript
import { NullObjectBase } from './src/skills/null-object-skill';

class NullMiddleware extends NullObjectBase {
  readonly name = 'NullMiddleware';

  async handle(context: any, next: () => Promise<void>): Promise<void> {
    await next(); // 直接传递，不做任何处理
  }
}

// 使用
const middlewares = config.middlewares || [new NullMiddleware()];

// 统一的中间件执行
for (const middleware of middlewares) {
  await middleware.handle(context, next);
}
```

---

## ⚠️ 注意事项

### 何时使用空对象

✅ **适合场景:**
- 需要频繁进行空值检查
- 对象行为可以安全地"什么都不做"
- 希望简化代码逻辑
- 需要默认行为

❌ **不适合场景:**
- 需要区分"无值"和"默认值"
- 空值本身有业务含义
- 需要显式处理缺失情况
- 性能敏感场景 (空对象有创建成本)

### 最佳实践

```typescript
// 1. 明确标识空对象
const nullObj = NullObjectRegistry.getInstance().get();
console.log(nullObj.isNull); // true

// 2. 使用工具函数简化代码
const safeValue = safeCall(maybeNull, customNullObject);

// 3. 避免过度使用
// ❌ 不要为所有东西都创建空对象
// ✅ 只为频繁使用且行为安全的对象创建

// 4. 文档化空对象行为
/**
 * NullLogger - 静默日志记录器
 * 所有日志方法都不产生任何输出
 */
```

---

## 🎯 完整示例

```typescript
import NullObjectSkill, { 
  NullLogger, 
  NullCache, 
  NullNotifier,
  safeCall 
} from './src/skills/null-object-skill';

// 电商订单处理系统
class OrderProcessingSystem {
  private logger: NullLogger;
  private cache: NullCache;
  private notifier: NullNotifier;

  constructor(config: any) {
    // 根据配置选择真实实现或空对象
    this.logger = config.logging ? new RealLogger() : new NullLogger();
    this.cache = config.caching ? new RedisCache() : new NullCache();
    this.notifier = config.notifications ? new EmailNotifier() : new NullNotifier();
  }

  async processOrder(order: any) {
    // 1. 检查缓存 (空缓存安全返回 undefined)
    const cached = this.cache.get(`order:${order.id}`);
    if (cached) return cached;

    // 2. 记录日志 (空日志静默忽略)
    this.logger.info('处理订单', order.id);

    try {
      // 3. 处理订单逻辑
      const result = await this.executeOrder(order);

      // 4. 缓存结果 (空缓存静默忽略)
      this.cache.set(`order:${order.id}`, result);

      // 5. 发送通知 (空通知器静默忽略)
      this.notifier.success(`订单 ${order.id} 处理成功`);

      return result;
    } catch (error) {
      this.logger.error('订单处理失败', error);
      this.notifier.error(`订单 ${order.id} 处理失败`);
      throw error;
    }
  }
}

// 使用示例
const system = new OrderProcessingSystem({
  logging: false,      // 禁用日志
  caching: true,       // 启用缓存
  notifications: false // 禁用通知
});

// 无需担心功能禁用导致的错误
await system.processOrder({ id: 123, items: [...] });
```

---

## 📈 性能对比

```typescript
// ❌ 传统方式 - 多次空值检查
function processUser(user) {
  if (user !== null && user !== undefined) {
    if (user.profile !== null && user.profile !== undefined) {
      if (user.profile.name !== null && user.profile.name !== undefined) {
        return user.profile.name;
      }
    }
  }
  return 'Anonymous';
}

// ✅ 空对象模式 - 简洁安全
function processUser(user) {
  const safeUser = safeCall(user, new NullUser());
  return safeUser.getValue()?.name || 'Anonymous';
}
```

---

## 📚 相关资源

- **设计模式**: Null Object Pattern
- **相关文件**: `src/skills/null-object-skill.ts`
- **作者**: KAEL
- **版本**: 1.0.0

---

_空对象模式让代码更优雅，让空值处理更安全。_
