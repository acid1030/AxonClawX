/**
 * 访问者模式使用示例 - ACE
 * 
 * 演示访问者模式的三大核心功能：
 * 1. 访问者定义
 * 2. 元素接受
 * 3. 双重分派
 */

import {
  // 类型
  Visitor,
  IElement,
  VisitorPatternOptions,
  
  // 访问者定义
  createVisitor,
  BaseVisitor,
  CompositeVisitor,
  
  // 元素接受
  BaseElement,
  BaseElementWithReturn,
  ElementCollection,
  
  // 双重分派
  DoubleDispatchScheduler,
  VisitorRegistry,
  VisitorPatternBuilder,
  
  // 内置访问者
  JsonVisitor,
  CloneVisitor,
  ValidationVisitor,
  PrintVisitor,
} from './visitor-pattern-skill';

// ============================================
// 示例 1: 基础访问者模式实现
// ============================================

console.log('='.repeat(60));
console.log('示例 1: 基础访问者模式 - AST 节点遍历');
console.log('='.repeat(60));

// 定义 AST 节点类型
interface ASTNodeMap {
  NumberLiteral: NumberLiteralNode;
  StringLiteral: StringLiteralNode;
  BinaryExpression: BinaryExpressionNode;
}

// 具体元素：数字字面量
class NumberLiteralNode extends BaseElement<any> {
  readonly type = 'NumberLiteral';
  constructor(public value: number, id?: string) {
    super(id);
  }
}

// 具体元素：字符串字面量
class StringLiteralNode extends BaseElement<any> {
  readonly type = 'StringLiteral';
  constructor(public value: string, id?: string) {
    super(id);
  }
}

// 具体元素：二元表达式
class BinaryExpressionNode extends BaseElement<any> {
  readonly type = 'BinaryExpression';
  constructor(
    public operator: string,
    public left: ASTNodeMap[keyof ASTNodeMap],
    public right: ASTNodeMap[keyof ASTNodeMap],
    id?: string
  ) {
    super(id);
  }
}

// 创建访问者：计算表达式值
class EvaluateVisitor extends BaseVisitor<any, number> {
  visit(element: any): number {
    switch (element.type) {
      case 'NumberLiteral':
        return (element as NumberLiteralNode).value;
      
      case 'StringLiteral':
        throw new Error('Cannot evaluate string literal in numeric context');
      
      case 'BinaryExpression': {
        const binExpr = element as BinaryExpressionNode;
        const left = this.visit(binExpr.left);
        const right = this.visit(binExpr.right);
        
        switch (binExpr.operator) {
          case '+': return left + right;
          case '-': return left - right;
          case '*': return left * right;
          case '/': return left / right;
          default: throw new Error(`Unknown operator: ${binExpr.operator}`);
        }
      }
      
      default:
        throw new Error(`Unknown node type: ${(element as any).type}`);
    }
  }
}

// 创建访问者：打印 AST
class PrintASTVisitor extends BaseVisitor<any, void> {
  private indent = 0;
  
  visit(element: any): void {
    const prefix = '  '.repeat(this.indent);
    
    switch (element.type) {
      case 'NumberLiteral':
        console.log(`${prefix}NumberLiteral(${(element as NumberLiteralNode).value})`);
        break;
      
      case 'StringLiteral':
        console.log(`${prefix}StringLiteral("${(element as StringLiteralNode).value}")`);
        break;
      
      case 'BinaryExpression': {
        const binExpr = element as BinaryExpressionNode;
        console.log(`${prefix}BinaryExpression(${binExpr.operator})`);
        this.indent++;
        this.visit(binExpr.left);
        this.visit(binExpr.right);
        this.indent--;
        break;
      }
    }
  }
}

// 创建 AST: (3 + 5) * 2
const ast = new BinaryExpressionNode(
  '*',
  new BinaryExpressionNode('+', new NumberLiteralNode(3), new NumberLiteralNode(5)),
  new NumberLiteralNode(2)
);

// 使用访问者
const evaluateVisitor = new EvaluateVisitor();
const printVisitor = new PrintASTVisitor();

console.log('\n打印 AST:');
ast.accept(printVisitor);

console.log('\n计算结果:');
const result = ast.accept(evaluateVisitor);
console.log(`(3 + 5) * 2 = ${result}`);

// ============================================
// 示例 2: 双重分派调度器
// ============================================

console.log('\n' + '='.repeat(60));
console.log('示例 2: 双重分派调度器');
console.log('='.repeat(60));

// 创建调度器
const scheduler = new DoubleDispatchScheduler({
  debug: true,
  onBeforeVisit: (element, visitor) => {
    console.log(`  → 开始访问：${element.constructor.name}`);
  },
  onAfterVisit: (element, visitor, result) => {
    console.log(`  → 访问完成，结果：${result}`);
  },
});

// 创建多个节点
const nodes = [
  new NumberLiteralNode(10),
  new StringLiteralNode('hello'),
  new NumberLiteralNode(42),
];

// 批量分派
console.log('\n批量访问节点:');
scheduler.dispatchAll(nodes, new PrintVisitor('  '));

// ============================================
// 示例 3: 访问者注册表
// ============================================

console.log('\n' + '='.repeat(60));
console.log('示例 3: 访问者注册表 - 动态注册和查找');
console.log('='.repeat(60));

// 创建注册表
const registry = new VisitorRegistry<ASTNodeMap>();

// 注册不同类型的访问者
registry.register('NumberLiteral', new JsonVisitor());
registry.register('StringLiteral', new JsonVisitor());
registry.register('BinaryExpression', new JsonVisitor());

// 使用注册表
const numberNode = new NumberLiteralNode(123);
const jsonVisitor = registry.get('NumberLiteral');
const json = jsonVisitor.visit(numberNode);
console.log('\nJSON 序列化:', json);

// ============================================
// 示例 4: 组合访问者
// ============================================

console.log('\n' + '='.repeat(60));
console.log('示例 4: 组合访问者 - 一次访问执行多个操作');
console.log('='.repeat(60));

// 创建组合访问者
const compositeVisitor = new CompositeVisitor<any, void>();

compositeVisitor
  .add(new PrintVisitor('[PRINT] '))
  .add({
    visit: (element: any) => {
      console.log('[LOG] Visited:', (element as any).type);
    }
  });

console.log('\n组合访问:');
const testNode = new NumberLiteralNode(999);
testNode.accept(compositeVisitor);

// ============================================
// 示例 5: 验证访问者
// ============================================

console.log('\n' + '='.repeat(60));
console.log('示例 5: 验证访问者 - 数据验证');
console.log('='.repeat(60));

// 定义用户元素
class UserNode extends BaseElementWithReturn<any, any> {
  readonly type = 'User';
  constructor(
    public name: string,
    public email: string,
    public age: number,
    id?: string
  ) {
    super(id);
  }
}

// 创建验证访问者
const validationVisitor = new ValidationVisitor<UserNode>();

validationVisitor
  .addRule(user => {
    if (!user.name || user.name.length < 2) {
      return 'Name must be at least 2 characters';
    }
    return null;
  })
  .addRule(user => {
    if (!user.email.includes('@')) {
      return 'Invalid email format';
    }
    return null;
  })
  .addRule(user => {
    if (user.age < 0 || user.age > 150) {
      return 'Age must be between 0 and 150';
    }
    return null;
  });

// 测试有效用户
const validUser = new UserNode('Alice', 'alice@example.com', 25);
const validResult = validUser.accept(validationVisitor);
console.log('\n有效用户验证:', validResult);

// 测试无效用户
const invalidUser = new UserNode('A', 'invalid-email', -5);
const invalidResult = invalidUser.accept(validationVisitor);
console.log('无效用户验证:', invalidResult);

// ============================================
// 示例 6: 访问者模式构建器
// ============================================

console.log('\n' + '='.repeat(60));
console.log('示例 6: 访问者模式构建器 - 链式 API');
console.log('='.repeat(60));

// 使用构建器创建完整的访问者系统
const { scheduler: builderScheduler, registry: builderRegistry } = new VisitorPatternBuilder<ASTNodeMap>()
  .withOptions({ debug: true })
  .registerVisitor('NumberLiteral', new JsonVisitor())
  .registerVisitor('StringLiteral', new JsonVisitor())
  .registerVisitor('BinaryExpression', new JsonVisitor())
  .build();

console.log('\n使用构建器创建的调度器:');
const testNumber = new NumberLiteralNode(42);
const jsonResult = builderScheduler.dispatch(testNumber, builderRegistry.get('NumberLiteral'));
console.log('结果:', jsonResult);

// ============================================
// 示例 7: 元素集合批量操作
// ============================================

console.log('\n' + '='.repeat(60));
console.log('示例 7: 元素集合 - 批量访问');
console.log('='.repeat(60));

// 创建元素集合
const collection = new ElementCollection<ASTNodeMap[keyof ASTNodeMap]>();

collection
  .add(new NumberLiteralNode(1))
  .add(new StringLiteralNode('test'))
  .add(new NumberLiteralNode(2))
  .add(new StringLiteralNode('example'));

console.log('\n集合中的所有元素:');
collection.acceptAll(new PrintVisitor('  '));

console.log('\n按类型过滤 (NumberLiteral):');
const numberNodes = collection.filterByType('NumberLiteral');
numberNodes.forEach(node => {
  console.log(`  NumberLiteral: ${(node as NumberLiteralNode).value}`);
});

// ============================================
// 示例 8: 克隆访问者 - 深拷贝
// ============================================

console.log('\n' + '='.repeat(60));
console.log('示例 8: 克隆访问者 - 深拷贝元素');
console.log('='.repeat(60));

const originalUser = new UserNode('Bob', 'bob@example.com', 30, 'user_001');
const cloneVisitor = new CloneVisitor<UserNode>();

const clonedUser = originalUser.accept(cloneVisitor);
console.log('\n原始用户:', originalUser);
console.log('克隆用户:', clonedUser);
console.log('是否同一对象:', originalUser === clonedUser);

// 修改克隆对象不影响原始对象
clonedUser.name = 'Cloned Bob';
console.log('\n修改克隆用户后:');
console.log('原始用户:', originalUser.name);
console.log('克隆用户:', clonedUser.name);

// ============================================
// 示例 9: 函数式访问者创建
// ============================================

console.log('\n' + '='.repeat(60));
console.log('示例 9: 函数式访问者 - createVisitor');
console.log('='.repeat(60));

// 使用 createVisitor 快速创建访问者
const transformVisitor = createVisitor({
  visitNumberLiteral: (node: NumberLiteralNode) => {
    return `Number: ${node.value * 2}`;
  },
  visitStringLiteral: (node: StringLiteralNode) => {
    return `String: ${node.value.toUpperCase()}`;
  },
  visitBinaryExpression: (node: BinaryExpressionNode) => {
    return `Expression: ${node.operator}`;
  },
});

console.log('\n函数式访问者转换:');
console.log(transformVisitor.visitNumberLiteral(new NumberLiteralNode(21)));
console.log(transformVisitor.visitStringLiteral(new StringLiteralNode('hello')));

// ============================================
// 示例 10: 实际应用场景 - 代码生成器
// ============================================

console.log('\n' + '='.repeat(60));
console.log('示例 10: 实际应用场景 - TypeScript 代码生成器');
console.log('='.repeat(60));

// 定义代码生成访问者
class CodeGenVisitor extends BaseVisitor<any, string> {
  visit(element: any): string {
    switch (element.type) {
      case 'NumberLiteral':
        return `const value: number = ${(element as NumberLiteralNode).value};`;
      
      case 'StringLiteral':
        return `const text: string = "${(element as StringLiteralNode).value}";`;
      
      case 'BinaryExpression': {
        const binExpr = element as BinaryExpressionNode;
        const left = this.visit(binExpr.left);
        const right = this.visit(binExpr.right);
        return `${left}\n${right}\nconst result = ${this.nodeToExpr(binExpr.left)} ${binExpr.operator} ${this.nodeToExpr(binExpr.right)};`;
      }
      
      default:
        return '// Unknown node';
    }
  }
  
  private nodeToExpr(node: any): string {
    if (node.type === 'NumberLiteral') {
      return String((node as NumberLiteralNode).value);
    } else if (node.type === 'StringLiteral') {
      return `"${(node as StringLiteralNode).value}"`;
    }
    return 'unknown';
  }
}

console.log('\n生成的 TypeScript 代码:');
const codeGenVisitor = new CodeGenVisitor();
const generatedCode = ast.accept(codeGenVisitor);
console.log(generatedCode);

// ============================================
console.log('\n' + '='.repeat(60));
console.log('所有示例执行完成！');
console.log('='.repeat(60));
