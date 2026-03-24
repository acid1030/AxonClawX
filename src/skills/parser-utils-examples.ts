/**
 * Parser Utils Skill - 使用示例
 * 
 * 演示词法分析、语法分析和 AST 生成的完整流程
 */

import { tokenize, parse, parseToAST, generate, traverse } from './parser-utils-skill';

// ============== 示例 1: 词法分析 ==============

console.log('=== 示例 1: 词法分析 ===\n');

const code1 = `
const x = 42;
let y = "hello";
function add(a, b) {
  return a + b;
}
`;

const tokens = tokenize(code1);
console.log('Tokens:');
tokens.forEach((token, i) => {
  console.log(`  ${i}: ${token.type.padEnd(15)} "${token.value}" (L${token.line}:C${token.column})`);
});

// ============== 示例 2: 语法分析 ==============

console.log('\n\n=== 示例 2: 语法分析 ===\n');

const code2 = `
const x = 10;
const y = 20;
const sum = x + y;
`;

const result = parse(code2);

if (result.success) {
  console.log('✓ 解析成功!');
  console.log(`  Token 数量：${result.tokens?.length}`);
  console.log(`  AST 节点类型：${result.ast?.type}`);
  console.log(`  语句数量：${result.ast?.body.length}`);
} else {
  console.log('✗ 解析失败!');
  console.log(`  错误：${result.error?.message}`);
  console.log(`  位置：L${result.error?.line}:C${result.error?.column}`);
}

// ============== 示例 3: AST 生成 ==============

console.log('\n\n=== 示例 3: AST 生成 ===\n');

const code3 = `
function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

const result = fibonacci(10);
console.log(result);
`;

const ast = parseToAST(code3);

// 打印 AST 结构 (简化版)
function printAST(node: any, indent = 0): void {
  const prefix = '  '.repeat(indent);
  console.log(`${prefix}${node.type}`);
  
  if (node.name) console.log(`${prefix}  name: ${node.name}`);
  if (node.value !== undefined && typeof node.value !== 'object') {
    console.log(`${prefix}  value: ${node.value}`);
  }
  if (node.operator) console.log(`${prefix}  operator: ${node.operator}`);
  
  if (node.body) {
    if (Array.isArray(node.body)) {
      node.body.forEach((child: any) => printAST(child, indent + 1));
    } else {
      console.log(`${prefix}  body:`);
      printAST(node.body, indent + 2);
    }
  }
  
  if (node.declarations) {
    node.declarations.forEach((decl: any) => printAST(decl, indent + 1));
  }
  
  if (node.expression) {
    if (typeof node.expression === 'object') {
      printAST(node.expression, indent + 1);
    }
  }
}

printAST(ast);

// ============== 示例 4: AST 转代码 ==============

console.log('\n\n=== 示例 4: AST 转代码 ===\n');

const code4 = `
const x = 5;
const y = 10;
const sum = x + y;
`;

const ast4 = parseToAST(code4);
const generated = generate(ast4);

console.log('原始代码:');
console.log(code4);
console.log('生成代码:');
console.log(generated);

// ============== 示例 5: AST 遍历 ==============

console.log('\n\n=== 示例 5: AST 遍历 ===\n');

const code5 = `
const a = 1;
const b = 2;
const c = a + b;
const d = c * 2;
`;

const ast5 = parseToAST(code5);

// 查找所有标识符
const identifiers: string[] = [];
traverse(ast5, {
  enter(node) {
    if (node.type === 'Identifier') {
      identifiers.push((node as any).name);
    }
  }
});

console.log('找到的标识符:', identifiers);

// 查找所有字面量
const literals: any[] = [];
traverse(ast5, {
  enter(node) {
    if (node.type === 'Literal') {
      literals.push((node as any).value);
    }
  }
});

console.log('找到的字面量:', literals);

// ============== 示例 6: 复杂表达式 ==============

console.log('\n\n=== 示例 6: 复杂表达式 ===\n');

const code6 = `
const result = (a + b) * (c - d) / 2;
const obj = {
  name: "test",
  value: 42,
  nested: {
    x: 1,
    y: 2
  }
};
const arr = [1, 2, 3, 4, 5];
const sum = arr.reduce((acc, val) => acc + val, 0);
`;

const ast6 = parseToAST(code6);
console.log('✓ 复杂表达式解析成功');
console.log(`  语句数量：${ast6.body.length}`);

// ============== 示例 7: 错误处理 ==============

console.log('\n\n=== 示例 7: 错误处理 ===\n');

const invalidCode = `
const x = ;
`;

const errorResult = parse(invalidCode);

if (!errorResult.success) {
  console.log('✓ 捕获到语法错误:');
  console.log(`  类型：${errorResult.error?.type}`);
  console.log(`  消息：${errorResult.error?.message}`);
  console.log(`  位置：L${errorResult.error?.line}:C${errorResult.error?.column}`);
}

// ============== 示例 8: 自定义关键字 ==============

console.log('\n\n=== 示例 8: 自定义关键字 ===\n');

const customCode = `
myfunc x = 10;
process y = 20;
`;

const customTokens = tokenize(customCode, {
  keywords: ['myfunc', 'process', 'var', 'let', 'const']
});

console.log('自定义关键字 Token 化:');
customTokens.forEach((token, i) => {
  if (token.type !== 'EOF') {
    console.log(`  ${i}: ${token.type.padEnd(15)} "${token.value}"`);
  }
});

// ============== 示例 9: 箭头函数 ==============

console.log('\n\n=== 示例 9: 箭头函数 ===\n');

const arrowCode = `
const add = (a, b) => a + b;
const multiply = (a, b) => {
  return a * b;
};
const square = x => x * x;
`;

const arrowAST = parseToAST(arrowCode);
console.log('✓ 箭头函数解析成功');
console.log(`  语句数量：${arrowAST.body.length}`);

// ============== 示例 10: 实际应用场景 ==============

console.log('\n\n=== 示例 10: 实际应用场景 - 代码分析 ===\n');

const analysisCode = `
function calculateTotal(items) {
  let total = 0;
  for (let i = 0; i < items.length; i++) {
    total += items[i].price;
  }
  return total;
}

const items = [
  { name: "Apple", price: 1.5 },
  { name: "Banana", price: 0.8 }
];

const total = calculateTotal(items);
`;

const analysisAST = parseToAST(analysisCode);

// 统计函数数量
let functionCount = 0;
traverse(analysisAST, {
  enter(node) {
    if (node.type === 'FunctionDeclaration' || node.type === 'FunctionExpression') {
      functionCount++;
    }
  }
});

// 统计变量声明数量
let variableCount = 0;
traverse(analysisAST, {
  enter(node) {
    if (node.type === 'VariableDeclaration') {
      variableCount++;
    }
  }
});

console.log('代码分析报告:');
console.log(`  函数数量：${functionCount}`);
console.log(`  变量声明数量：${variableCount}`);
console.log(`  总语句数量：${analysisAST.body.length}`);

console.log('\n\n=== 所有示例完成 ===');
