/**
 * Markdown 解析工具 - 使用示例
 * 
 * 演示如何使用 markdown-parser-skill 进行:
 * 1. 基础 Markdown 解析
 * 2. 自定义渲染
 * 3. 语法高亮
 */

import {
  parseMarkdown,
  markdownToHtml,
  highlightCode,
  createCustomRenderer,
  ParseOptions
} from './markdown-parser-skill';

// ==================== 示例 1: 基础解析 ====================

function exampleBasic() {
  console.log('=== 示例 1: 基础 Markdown 解析 ===\n');

  const markdown = `
# 欢迎使用 Markdown 解析器

这是一个**功能强大**的解析器，支持*斜体*、\`行内代码\`等语法。

## 特性

- ✅ Markdown 解析
- ✅ 自定义渲染
- ✅ 语法高亮

## 代码示例

\`\`\`typescript
function greet(name: string): string {
  return \`Hello, \${name}!\`;
}

console.log(greet('World'));
\`\`\`

> 这是一个引用块

| 功能 | 状态 |
|------|------|
| 解析 | ✅ |
| 渲染 | ✅ |
| 高亮 | ✅ |
`;

  // 解析为 AST
  const ast = parseMarkdown(markdown);
  console.log('AST 节点数量:', ast.length);
  console.log('AST 结构:', JSON.stringify(ast, null, 2));

  // 转换为 HTML
  const html = markdownToHtml(markdown);
  console.log('\n生成的 HTML:');
  console.log(html);
}

// ==================== 示例 2: 自定义渲染器 ====================

function exampleCustomRenderer() {
  console.log('\n=== 示例 2: 自定义渲染器 ===\n');

  const markdown = `
# 自定义标题

这是一段普通文本。

\`\`\`javascript
const x = 10;
\`\`\`
`;

  // 创建自定义渲染器
  const customRenderer = createCustomRenderer({
    heading: (node) => `
      <h${node.level} class="custom-heading" data-level="${node.level}">
        <span class="icon">#</span>
        ${node.content}
      </h${node.level}>
    `,
    paragraph: (node) => `<p class="custom-paragraph">${node.content}</p>`,
    code_block: (node) => `
      <div class="code-container">
        <div class="code-header">
          <span class="lang">${node.lang || 'text'}</span>
          <button class="copy">复制</button>
        </div>
        <pre class="custom-code-block"><code>${node.content}</code></pre>
      </div>
    `,
    list: (node) => `<ul class="custom-list styled">${node.children?.map(i => `<li>${i.content}</li>`).join('')}</ul>`
  });

  const options: ParseOptions = {
    customRenderer,
    highlight: true,
    codeTheme: 'dracula'
  };

  const html = markdownToHtml(markdown, options);
  console.log('自定义渲染 HTML:');
  console.log(html);
}

// ==================== 示例 3: 语法高亮 ====================

function exampleSyntaxHighlight() {
  console.log('\n=== 示例 3: 语法高亮 ===\n');

  const codeExamples = {
    typescript: `
function calculateTotal(items: Array<{ price: number; quantity: number }>): number {
  return items.reduce((total, item) => {
    return total + (item.price * item.quantity);
  }, 0);
}

// 使用示例
const cart = [
  { price: 10.99, quantity: 2 },
  { price: 5.49, quantity: 3 }
];

console.log(calculateTotal(cart));
`,
    python: `
class DataProcessor:
    def __init__(self, data: list):
        self.data = data
    
    def process(self) -> dict:
        """处理数据并返回结果"""
        result = {}
        for item in self.data:
            key = item.get('category')
            if key not in result:
                result[key] = []
            result[key].append(item)
        return result

# 使用示例
processor = DataProcessor(data)
output = processor.process()
`,
    rust: `
fn fibonacci(n: u32) -> u64 {
    match n {
        0 => 0,
        1 => 1,
        _ => {
            let mut a = 0;
            let mut b = 1;
            for _ in 2..=n {
                let temp = a + b;
                a = b;
                b = temp;
            }
            b
        }
    }
}

fn main() {
    println!("Fibonacci(10) = {}", fibonacci(10));
}
`
  };

  // 不同主题的高亮效果
  const themes = ['default', 'github', 'monokai', 'dracula'] as const;

  for (const [lang, code] of Object.entries(codeExamples)) {
    console.log(`\n--- ${lang.toUpperCase()} ---`);
    
    for (const theme of themes) {
      const highlighted = highlightCode(code.trim(), lang, theme);
      console.log(`\n[${theme.toUpperCase()}]`);
      console.log(highlighted.substring(0, 200) + '...');
    }
  }
}

// ==================== 示例 4: 完整文档渲染 ====================

function exampleFullDocument() {
  console.log('\n=== 示例 4: 完整文档渲染 ===\n');

  const readme = `
# Project Documentation

## Installation

\`\`\`bash
npm install my-awesome-package
\`\`\`

## Usage

\`\`\`typescript
import { createServer } from 'my-awesome-package';

const server = createServer({
  port: 3000,
  host: 'localhost'
});

server.start();
\`\`\`

## API Reference

### createServer(options)

| Parameter | Type | Description |
|-----------|------|-------------|
| port | number | 服务器端口 |
| host | string | 服务器地址 |
| timeout | number | 超时时间 (ms) |

### server.start()

启动服务器。

### server.stop()

停止服务器。

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## License

MIT License
`;

  const html = markdownToHtml(readme, {
    highlight: true,
    codeTheme: 'github',
    customRenderer: createCustomRenderer({
      heading: (node) => `<h${node.level} id="${node.content?.toLowerCase().replace(/\s+/g, '-')}">${node.content}</h${node.level}>`,
      table: (node) => `<table class="api-table">${node.children?.map(r => `<tr>${r.children?.map(c => `<${c.attributes?.isHeader ? 'th' : 'td'}>${c.content}</${c.attributes?.isHeader ? 'th' : 'td'}>`).join('')}</tr>`).join('')}</table>`
    })
  });

  console.log('完整文档 HTML (前 500 字符):');
  console.log(html.substring(0, 500) + '...');
}

// ==================== 示例 5: 性能测试 ====================

function examplePerformance() {
  console.log('\n=== 示例 5: 性能测试 ===\n');

  const largeMarkdown = Array(100).fill(`
# Section

Lorem ipsum dolor sit amet, consectetur adipiscing elit.

\`\`\`typescript
const x = Math.random();
console.log(x);
\`\`\`

- Item 1
- Item 2
- Item 3
`).join('\n');

  const startTime = performance.now();
  const ast = parseMarkdown(largeMarkdown);
  const parseTime = performance.now() - startTime;

  const renderStart = performance.now();
  const html = markdownToHtml(largeMarkdown);
  const renderTime = performance.now() - renderStart;

  console.log(`文档大小: ${largeMarkdown.length} 字符`);
  console.log(`AST 节点数: ${ast.length}`);
  console.log(`解析时间: ${parseTime.toFixed(2)}ms`);
  console.log(`渲染时间: ${renderTime.toFixed(2)}ms`);
  console.log(`总时间: ${(parseTime + renderTime).toFixed(2)}ms`);
  console.log(`HTML 大小: ${html.length} 字符`);
}

// ==================== 运行所有示例 ====================

function runAllExamples() {
  console.log('🚀 Markdown Parser Skill - 使用示例\n');
  console.log('=' .repeat(50));

  exampleBasic();
  exampleCustomRenderer();
  exampleSyntaxHighlight();
  exampleFullDocument();
  examplePerformance();

  console.log('\n' + '='.repeat(50));
  console.log('✅ 所有示例运行完成!');
}

// 导出示例函数
export {
  exampleBasic,
  exampleCustomRenderer,
  exampleSyntaxHighlight,
  exampleFullDocument,
  examplePerformance,
  runAllExamples
};

// 如果直接运行此文件
if (require.main === module) {
  runAllExamples();
}
