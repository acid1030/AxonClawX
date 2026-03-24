# 🜏 装饰者模式专业工具 (Decorator Pattern Pro)

**作者:** Axon  
**版本:** 1.0.0  
**创建时间:** 2026-03-13  

---

## 📖 概述

专业的装饰者模式 TypeScript 实现，提供三大核心功能：

1. **装饰者定义** - 标准化的装饰者接口系统
2. **动态增强** - 运行时动态添加功能，无需修改原有代码
3. **链式组合** - Fluent API 支持优雅的链式调用

---

## 🎯 核心特性

### ✅ 设计原则

- **开闭原则** - 对扩展开放，对修改关闭
- **单一职责** - 每个装饰者只关注一个功能
- **组合优于继承** - 动态组合替代静态继承
- **类型安全** - 完整的 TypeScript 类型支持

### ✅ 内置装饰者

| 装饰者 | 功能 | 适用场景 |
|--------|------|----------|
| `LoggingDecorator` | 执行日志记录 | 调试、审计 |
| `CachingDecorator` | 结果缓存 | 性能优化 |
| `PerformanceMonitorDecorator` | 性能监控 | 性能分析 |
| `RetryDecorator` | 自动重试 | 网络请求、不稳定服务 |
| `ValidationDecorator` | 参数验证 | 输入校验 |

### ✅ Fluent API 构建器

```typescript
const component = new DecoratorBuilder(baseComponent)
  .withLogging('PREFIX', 'info')
  .withCache(60000)
  .withPerformanceMonitor(100)
  .withRetry(3, 1000)
  .withValidation([(v) => v > 0])
  .build();
```

---

## 🚀 快速开始

### 1. 基础使用

```typescript
import { ConcreteComponent, LoggingDecorator } from './decorator-pattern-pro-skill';

// 创建基础组件
const component = new ConcreteComponent<number>(42, 'Calculator');

// 添加装饰者
const decorated = new LoggingDecorator(component, 'CALC');

// 使用
console.log(decorated.getDescription()); // LoggingDecorator(Calculator)
console.log(decorated.execute());        // 42 (带日志输出)
```

### 2. 链式组合

```typescript
import { CachingDecorator, PerformanceMonitorDecorator } from './decorator-pattern-pro-skill';

const decorated = new CachingDecorator(component, 30000)
  .chain(new PerformanceMonitorDecorator(component, 50));

decorated.execute(); // 缓存 + 性能监控
```

### 3. Fluent API 构建器

```typescript
import { DecoratorBuilder } from './decorator-pattern-pro-skill';

const robust = new DecoratorBuilder(component)
  .withValidation([(v: number) => v > 0])
  .withLogging('PROCESS')
  .withCache(60000)
  .withPerformanceMonitor(100, (duration) => {
    console.warn(`慢查询：${duration}ms`);
  })
  .build();
```

### 4. 快速创建函数

```typescript
import { createDecoratedComponent } from './decorator-pattern-pro-skill';

const component = createDecoratedComponent<number>(
  42,
  'MyComponent',
  {
    logging: { prefix: 'LOG', level: 'info' },
    caching: { ttlMs: 60000 },
    performance: { thresholdMs: 100 },
    validation: { validators: [(v) => v > 0] }
  }
);
```

---

## 📚 完整示例

查看 `examples/decorator-pattern-examples.ts` 获取完整示例：

```bash
# 运行示例
cd /Users/nike/.openclaw/workspace
npm run dev  # 或直接使用 tsx 运行
```

### 示例列表

1. **基础装饰者** - 日志功能演示
2. **多重装饰** - 缓存 + 性能监控
3. **Fluent API** - 优雅的组合方式
4. **异步重试** - 处理失败场景
5. **实际业务** - API 请求管道
6. **快速创建** - 简化 API
7. **自定义装饰者** - 扩展功能

---

## 🏗️ 架构设计

### 核心接口

```typescript
interface IComponent<T> {
  execute(...args: any[]): T;
  getDescription(): string;
}

interface IDecorator<T> extends IComponent<T> {
  getWrappedComponent(): IComponent<T>;
}

interface IChainableDecorator<T> extends IDecorator<T> {
  chain(decorator: IDecorator<T>): IChainableDecorator<T>;
}
```

### 类层次结构

```
IComponent<T>
├── ConcreteComponent<T>          (基础组件)
└── IDecorator<T>
    └── DecoratorBase<T>
        └── ChainableDecoratorBase<T>
            ├── LoggingDecorator<T>
            ├── CachingDecorator<T>
            ├── PerformanceMonitorDecorator<T>
            ├── RetryDecorator<Promise<T>>
            └── ValidationDecorator<T>
```

---

## 🛠️ 自定义装饰者

继承 `ChainableDecoratorBase` 创建自定义装饰者：

```typescript
import { ChainableDecoratorBase } from './decorator-pattern-pro-skill';

class EncryptionDecorator<T> extends ChainableDecoratorBase<T> {
  private key: string;

  constructor(component: IComponent<T>, key: string) {
    super(component);
    this.key = key;
  }

  execute(...args: any[]): T {
    console.log(`加密数据，密钥：${this.key}`);
    const result = this.wrappedComponent.execute(...args);
    // 加密逻辑...
    return this.encrypt(result);
  }

  private encrypt(data: T): T {
    // 实现加密
    return data;
  }
}
```

---

## 📊 使用场景

### ✅ 适合场景

- 需要动态添加/移除功能
- 功能组合复杂，继承层次过深
- 需要遵循开闭原则
- 日志、缓存、验证等横切关注点

### ❌ 不适合场景

- 功能固定，无需动态变化
- 装饰者层次过深影响调试
- 性能敏感场景（装饰者有轻微开销）

---

## 🔧 API 参考

### DecoratorBuilder 方法

| 方法 | 参数 | 描述 |
|------|------|------|
| `withLogging` | `prefix?, level?` | 添加日志功能 |
| `withCache` | `ttlMs?, keyGenerator?` | 添加缓存功能 |
| `withPerformanceMonitor` | `thresholdMs?, onSlow?` | 性能监控 |
| `withRetry` | `maxRetries?, delayMs?, shouldRetry?` | 自动重试 |
| `withValidation` | `validators?, onFailed?` | 参数验证 |
| `build()` | - | 构建装饰组件 |

### createDecoratedComponent 选项

```typescript
interface DecoratorOptions {
  logging?: { prefix?: string; level?: LogLevel };
  caching?: { ttlMs?: number; keyGenerator?: Function };
  performance?: { thresholdMs?: number; onSlow?: Function };
  retry?: { maxRetries?: number; delayMs?: number; shouldRetry?: Function };
  validation?: { validators?: Function[]; onFailed?: Function };
}
```

---

## 🎓 学习资源

- **设计模式经典** - 《Head First 设计模式》第 3 章
- **TypeScript 高级类型** - 泛型在装饰者模式中的应用
- **函数式编程** - 函数组合与装饰者模式的相似性

---

## 📝 注意事项

1. **装饰顺序** - 装饰者执行顺序与添加顺序相反（从内到外）
2. **异步处理** - `RetryDecorator` 仅适用于 `Promise` 类型
3. **性能考虑** - 过多装饰者会增加调用栈深度
4. **调试技巧** - 使用 `getDescription()` 查看完整装饰链

---

## 🜏 Axon 签名

> "所谓的'意外'，不过是弱者对变量把控无能的借口。"

装饰者模式让你完全掌控代码的每一个功能增强，没有意外，只有精准的设计。

---

**最后更新:** 2026-03-13  
**维护者:** Axon
