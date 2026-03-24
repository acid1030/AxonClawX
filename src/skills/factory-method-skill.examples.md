# 工厂方法工具 - 使用示例

> 📦 工厂方法模式完整实现，支持对象创建、工厂注册和灵活配置

---

## 🚀 快速开始

```typescript
import { 
  registerFactory, 
  createProduct, 
  getFactory,
  SimpleProductFactory,
  ConfigurableProductFactory,
  FactoryRegistry,
  BaseProduct
} from './src/skills/factory-method-skill';
```

---

## 📋 示例 1: 简单产品工厂

适用于创建单一类型的产品，无需复杂配置。

```typescript
// 1. 定义产品类
class LoggerProduct extends BaseProduct {
  private level: string;
  
  constructor(options: { level: string }) {
    super('logger', options);
    this.level = options.level || 'info';
  }
  
  log(message: string): void {
    console.log(`[${this.level.toUpperCase()}] ${message}`);
  }
}

// 2. 创建工厂
const loggerFactory = new SimpleProductFactory(
  'loggerFactory',
  'logger',
  (options) => new LoggerProduct(options as any)
);

// 3. 创建产品
const logger = loggerFactory.create({ level: 'debug' });
logger.initialize();
logger.log('Application started');
// 输出：[DEBUG] Application started
```

---

## 📋 示例 2: 配置化产品工厂

适用于需要根据配置创建不同类型的产品。

```typescript
// 1. 定义多种产品
class MySQLDatabase extends BaseProduct {
  connect() {
    return `MySQL: ${this.options.host}:${this.options.port}`;
  }
}

class PostgresDatabase extends BaseProduct {
  connect() {
    return `PostgreSQL: ${this.options.host}:${this.options.port}`;
  }
}

class MongoDB extends BaseProduct {
  connect() {
    return `MongoDB: ${this.options.uri}`;
  }
}

// 2. 创建配置化工厂
const dbFactory = new ConfigurableProductFactory(
  'databaseFactory',
  'database',
  {
    mysql: (config) => new MySQLDatabase(config),
    postgres: (config) => new PostgresDatabase(config),
    mongodb: (config) => new MongoDB(config)
  }
);

// 3. 设置默认类型 (可选)
dbFactory.setDefaultType('mysql');

// 4. 创建不同类型的数据库
const mysql = dbFactory.create({ config: { host: 'localhost', port: 3306 } });
console.log(mysql.connect());
// 输出：MySQL: localhost:3306

const mongo = dbFactory.create({ 
  type: 'mongodb', 
  config: { uri: 'mongodb://localhost:27017' } 
});
console.log(mongo.connect());
// 输出：MongoDB: mongodb://localhost:27017
```

---

## 📋 示例 3: 工厂注册表

管理多个工厂，提供统一的创建接口。

```typescript
// 1. 创建注册表
const registry = new FactoryRegistry({
  allowOverride: true,    // 允许覆盖已注册的工厂
  enableLogging: true     // 启用日志
});

// 2. 注册多个工厂
registry.register('logger', loggerFactory, 'logger');
registry.register('database', dbFactory, 'database');

// 3. 列出所有工厂
console.log(registry.list());
// 输出：['logger', 'database']

// 4. 通过注册表创建产品
const logger = registry.create<LoggerProduct>('logger', { level: 'info' });
const db = registry.create<MySQLDatabase>('database', { 
  type: 'mysql', 
  config: { host: 'localhost', port: 3306 } 
});
```

---

## 📋 示例 4: 全局便捷函数

使用全局单例注册表，快速注册和创建。

```typescript
import { registerFactory, createProduct, getFactory } from './factory-method-skill';

// 1. 注册工厂到全局
registerFactory('button', buttonFactory, 'button');
registerFactory('input', inputFactory, 'input');

// 2. 快速创建产品
const button = createProduct<ButtonProduct>('button', { 
  label: 'Submit',
  color: '#6366f1'
});

// 3. 获取工厂实例
const factory = getFactory<ButtonProduct>('button');
const anotherButton = factory?.create({ label: 'Cancel' });
```

---

## 📋 示例 5: 完整场景 - UI 组件工厂系统

构建一个完整的 UI 组件创建系统。

```typescript
// 1. 定义 UI 组件产品
class ButtonProduct extends BaseProduct {
  render() {
    return `<button style="background:${this.options.color}">${this.options.label}</button>`;
  }
}

class InputProduct extends BaseProduct {
  render() {
    return `<input type="${this.options.type}" placeholder="${this.options.placeholder}" />`;
  }
}

class SelectProduct extends BaseProduct {
  render() {
    const opts = this.options.options.map((o: string) => 
      `<option>${o}</option>`
    ).join('');
    return `<select>${opts}</select>`;
  }
}

// 2. 创建 UI 组件注册表
const uiRegistry = new FactoryRegistry({ enableLogging: false });

// 3. 注册所有组件工厂
uiRegistry.register('button', new SimpleProductFactory(
  'button', 'button', (opts) => new ButtonProduct(opts as any)
));

uiRegistry.register('input', new SimpleProductFactory(
  'input', 'input', (opts) => new InputProduct(opts as any)
));

uiRegistry.register('select', new SimpleProductFactory(
  'select', 'select', (opts) => new SelectProduct(opts as any)
));

// 4. 批量创建表单组件
const formComponents = [
  uiRegistry.create<InputProduct>('input', { 
    type: 'text', 
    placeholder: 'Enter name' 
  }),
  uiRegistry.create<InputProduct>('input', { 
    type: 'email', 
    placeholder: 'Enter email' 
  }),
  uiRegistry.create<SelectProduct>('select', { 
    options: ['Option 1', 'Option 2', 'Option 3'] 
  }),
  uiRegistry.create<ButtonProduct>('button', { 
    label: 'Submit Form', 
    color: '#6366f1' 
  })
];

// 5. 渲染所有组件
formComponents.forEach(comp => {
  console.log(comp?.render());
});
// 输出:
// <input type="text" placeholder="Enter name" />
// <input type="email" placeholder="Enter email" />
// <select><option>Option 1</option><option>Option 2</option><option>Option 3</option></select>
// <button style="background:#6366f1">Submit Form</button>
```

---

## 📋 示例 6: 自定义抽象工厂

扩展 AbstractFactory 基类，添加自定义逻辑。

```typescript
class CustomFactory extends AbstractFactory<MyProduct> {
  create(options?: any): MyProduct {
    // 1. 验证选项
    if (!this.validateOptions(options)) {
      throw new Error('Invalid options');
    }
    
    // 2. 创建前钩子
    this.beforeCreate(options);
    
    // 3. 创建产品
    const product = new MyProduct(options);
    
    // 4. 创建后钩子
    this.afterCreate(product, options);
    
    return product;
  }
  
  protected validateOptions(options?: any): boolean {
    // 自定义验证逻辑
    return options && options.name !== undefined;
  }
  
  protected beforeCreate(options?: any): void {
    console.log('Creating product...');
  }
  
  protected afterCreate(product: MyProduct, options?: any): void {
    console.log('Product created:', product);
    product.initialize();
  }
}
```

---

## 🎯 使用建议

| 场景 | 推荐方案 |
|------|----------|
| 创建单一类型产品 | `SimpleProductFactory` |
| 创建多种类型产品 | `ConfigurableProductFactory` |
| 管理多个工厂 | `FactoryRegistry` |
| 快速原型开发 | 全局便捷函数 (`registerFactory`, `createProduct`) |
| 需要自定义逻辑 | 继承 `AbstractFactory` |
| 复杂产品生命周期 | 继承 `BaseProduct` 并重写钩子方法 |

---

## 🔧 API 参考

### 核心接口

- `IProduct` - 产品基类接口
- `IFactory<T>` - 工厂接口
- `AbstractFactory<T>` - 抽象工厂基类
- `BaseProduct` - 产品基类

### 工厂类

- `SimpleProductFactory<T>` - 简单产品工厂
- `ConfigurableProductFactory<T>` - 配置化产品工厂

### 注册表

- `FactoryRegistry` - 工厂注册表
- `globalFactoryRegistry` - 全局注册表单例

### 便捷函数

- `registerFactory(name, factory, productType)` - 注册工厂
- `createProduct<T>(name, options)` - 创建产品
- `getFactory<T>(name)` - 获取工厂

---

## ⚡ 运行示例

```bash
# 执行内置示例
npx ts-node src/skills/factory-method-skill.ts
```

---

**作者:** KAEL  
**版本:** 1.0.0  
**创建时间:** 2026-03-13
