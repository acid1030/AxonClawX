# Visitor Pattern Skill - ACE (Advanced Constructor Engine)

**访问者模式工具** - 用于操作分离、双重分派和可扩展的访问逻辑

---

## 📦 功能特性

### 1. 访问者定义 (Visitor Definition)
- 类型安全的访问者接口
- 支持泛型和多态
- 函数式和类式两种创建方式
- 组合访问者支持

### 2. 元素接受 (Element Accept)
- 统一的元素接口
- 内置 accept 方法实现
- 元素集合批量操作
- 自动 ID 生成

### 3. 双重分派 (Double Dispatch)
- 运行时类型分派
- 调度器模式
- 访问者注册表
- 前后钩子回调

---

## 🚀 快速开始

### 安装

无需安装，直接导入使用:

```typescript
import {
  BaseVisitor,
  BaseElement,
  DoubleDispatchScheduler,
  VisitorRegistry,
} from './src/skills/visitor-pattern-skill';
```

### 基础用法

```typescript
// 1. 定义元素
class NumberNode extends BaseElement<any> {
  readonly type = 'Number';
  constructor(public value: number) {
    super();
  }
}

// 2. 定义访问者
class PrintVisitor extends BaseVisitor<{ Number: NumberNode }, void> {
  visit(element: NumberNode): void {
    console.log(`Number: ${element.value}`);
  }
}

// 3. 使用访问者
const node = new NumberNode(42);
const visitor = new PrintVisitor();
node.accept(visitor);  // 输出：Number: 42
```

---

## 📖 核心 API

### 访问者定义

| 类/函数 | 描述 | 返回值 |
|---------|------|--------|
| `createVisitor(methods)` | 函数式创建访问者 | `Visitor` |
| `BaseVisitor<T, R>` | 访问者基类 | `Visitor` |
| `CompositeVisitor` | 组合访问者 | `Visitor` |

### 元素接受

| 类 | 描述 | 返回值 |
|----|------|--------|
| `BaseElement<TVisitor>` | 元素基类 | `Element` |
| `BaseElementWithReturn` | 带返回值的元素基类 | `Element` |
| `ElementCollection` | 元素集合 | `Collection` |

### 双重分派

| 类 | 描述 | 返回值 |
|----|------|--------|
| `DoubleDispatchScheduler` | 分派调度器 | `Scheduler` |
| `VisitorRegistry` | 访问者注册表 | `Registry` |
| `VisitorPatternBuilder` | 构建器 | `Builder` |

### 内置访问者

| 访问者 | 描述 | 返回值 |
|--------|------|--------|
| `JsonVisitor` | JSON 序列化 | `string` |
| `CloneVisitor` | 深度克隆 | `T` |
| `ValidationVisitor` | 数据验证 | `{valid, errors}` |
| `PrintVisitor` | 格式化打印 | `void` |

---

## 💡 使用示例

### 1. AST 节点遍历

```typescript
// 定义 AST 节点
class NumberLiteralNode extends BaseElement<any> {
  readonly type = 'NumberLiteral';
  constructor(public value: number) {
    super();
  }
}

class BinaryExpressionNode extends BaseElement<any> {
  readonly type = 'BinaryExpression';
  constructor(
    public operator: string,
    public left: any,
    public right: any
  ) {
    super();
  }
}

// 创建计算访问者
class EvaluateVisitor extends BaseVisitor<any, number> {
  visit(element: any): number {
    if (element.type === 'NumberLiteral') {
      return element.value;
    }
    if (element.type === 'BinaryExpression') {
      const left = this.visit(element.left);
      const right = this.visit(element.right);
      switch (element.operator) {
        case '+': return left + right;
        case '-': return left - right;
        case '*': return left * right;
        case '/': return left / right;
      }
    }
    throw new Error('Unknown node type');
  }
}

// 使用
const ast = new BinaryExpressionNode(
  '+',
  new NumberLiteralNode(3),
  new NumberLiteralNode(5)
);

const result = ast.accept(new EvaluateVisitor());
console.log(`3 + 5 = ${result}`);  // 输出：8
```

### 2. 双重分派调度器

```typescript
const scheduler = new DoubleDispatchScheduler({
  debug: true,
  onBeforeVisit: (element, visitor) => {
    console.log('开始访问:', element.constructor.name);
  },
  onAfterVisit: (element, visitor, result) => {
    console.log('访问完成:', result);
  },
});

const node = new NumberLiteralNode(42);
const visitor = new PrintVisitor();

scheduler.dispatch(node, visitor);
```

### 3. 访问者注册表

```typescript
const registry = new VisitorRegistry();

// 注册访问者
registry.register('NumberLiteral', new JsonVisitor());
registry.register('StringLiteral', new JsonVisitor());

// 获取并使用
const visitor = registry.get('NumberLiteral');
const json = visitor.visit(new NumberLiteralNode(123));
console.log(json);  // 输出：{"type":"NumberLiteral","value":123}
```

### 4. 组合访问者

```typescript
const composite = new CompositeVisitor();

composite
  .add(new PrintVisitor('[PRINT] '))
  .add(new JsonVisitor())
  .add({
    visit: (element) => console.log('[LOG]', element)
  });

// 一次访问执行所有操作
node.accept(composite);
```

### 5. 验证访问者

```typescript
const validator = new ValidationVisitor<UserNode>();

validator
  .addRule(user => {
    if (!user.email.includes('@')) {
      return 'Invalid email';
    }
    return null;
  })
  .addRule(user => {
    if (user.age < 18) {
      return 'Must be 18+';
    }
    return null;
  });

const user = new UserNode('Alice', 'alice@example.com', 25);
const result = user.accept(validator);

console.log(result);
// { valid: true, errors: [] }
```

### 6. 元素集合批量操作

```typescript
const collection = new ElementCollection();

collection
  .add(new NumberLiteralNode(1))
  .add(new StringLiteralNode('hello'))
  .add(new NumberLiteralNode(2));

// 批量访问
collection.acceptAll(new PrintVisitor());

// 按类型过滤
const numbers = collection.filterByType('NumberLiteral');
```

### 7. 访问者模式构建器

```typescript
const { scheduler, registry } = new VisitorPatternBuilder()
  .withOptions({ debug: true })
  .registerVisitor('NumberLiteral', new JsonVisitor())
  .registerVisitor('StringLiteral', new JsonVisitor())
  .build();

// 使用构建的系统
const node = new NumberLiteralNode(42);
const result = scheduler.dispatch(node, registry.get('NumberLiteral'));
```

### 8. 代码生成器

```typescript
class CodeGenVisitor extends BaseVisitor<any, string> {
  visit(element: any): string {
    switch (element.type) {
      case 'NumberLiteral':
        return `const value: number = ${element.value};`;
      case 'StringLiteral':
        return `const text: string = "${element.value}";`;
      default:
        return '// Unknown';
    }
  }
}

const code = node.accept(new CodeGenVisitor());
console.log(code);
```

---

## 🎯 最佳实践

### 1. 使用泛型确保类型安全

```typescript
// ✅ 推荐：使用泛型定义访问者
class MyVisitor extends BaseVisitor<MyElementMap, MyReturnType> {
  visit(element: MyElementMap[keyof MyElementMap]): MyReturnType {
    // 类型安全
  }
}

// ⚠️ 避免：使用 any
class MyVisitor extends BaseVisitor<any, any> {
  // 失去类型检查
}
```

### 2. 使用组合访问者复用逻辑

```typescript
// 创建可复用的访问者组合
const loggingVisitor = new CompositeVisitor();
loggingVisitor
  .add(new PrintVisitor())
  .add(new JsonVisitor())
  .add(new ValidationVisitor());

// 在多处使用
element1.accept(loggingVisitor);
element2.accept(loggingVisitor);
```

### 3. 使用注册表管理多个访问者

```typescript
const registry = new VisitorRegistry();

// 集中注册
registry.register('Type1', new Visitor1());
registry.register('Type2', new Visitor2());

// 按需获取
const visitor = registry.get(elementType);
```

### 4. 使用调度器添加横切关注点

```typescript
const scheduler = new DoubleDispatchScheduler({
  onBeforeVisit: (el, vis) => {
    // 日志、监控、权限检查等
  },
  onAfterVisit: (el, vis, result) => {
    // 结果处理、缓存等
  },
});
```

---

## ⚠️ 注意事项

1. **元素类型必须唯一** - `type` 字段用于分派，必须唯一
2. **访问者必须实现所有 visit 方法** - 否则会抛出错误
3. **双重分派有性能开销** - 不适合性能敏感场景
4. **元素集合是浅拷贝** - `getElements()` 返回新数组但元素引用相同

---

## 🎓 设计模式参考

Visitor Pattern (访问者模式) 是 GoF 23 种设计模式之一，属于**行为型模式**。

### 核心思想
- **操作分离** - 将操作从对象结构中分离出来
- **双重分派** - 运行时根据元素类型和访问者类型分派
- **开闭原则** - 易于添加新操作，无需修改元素类

### 适用场景
- 对象结构稳定，但经常添加新操作
- 需要对不同类型的元素执行不同操作
- 访问者需要累积状态
- 算法依赖于对象的具體类

### 优点
- ✅ 符合开闭原则，易于扩展新操作
- ✅ 集中相关操作，便于维护
- ✅ 访问者可以累积状态
- ✅ 打破封装限制，访问内部状态

### 缺点
- ❌ 增加新元素类困难，需要修改所有访问者
- ❌ 破坏封装性
- ❌ 双重分派有性能开销

---

## 📝 运行示例

```bash
cd /Users/nike/.openclaw/workspace
npx ts-node src/skills/visitor-pattern-examples.ts
```

示例包含 10 个完整用例:
1. AST 节点遍历
2. 双重分派调度器
3. 访问者注册表
4. 组合访问者
5. 验证访问者
6. 元素集合批量操作
7. 访问者模式构建器
8. 克隆访问者
9. 函数式访问者
10. 代码生成器

---

**作者:** Axon  
**版本:** 1.0.0  
**最后更新:** 2026-03-13
