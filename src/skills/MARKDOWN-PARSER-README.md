# Markdown 解析工具技能

> 功能完整的 Markdown 解析器，支持解析、自定义渲染和语法高亮

## 📦 安装

无需额外依赖，直接使用：

```typescript
import { markdownToHtml, parseMarkdown, highlightCode } from './markdown-parser-skill';
```

## ✨ 功能特性

### 1. Markdown 解析
- ✅ 标题 (H1-H6)
- ✅ 段落
- ✅ 粗体/斜体
- ✅ 行内代码
- ✅ 代码块 (带语言标识)
- ✅ 引用块
- ✅ 无序/有序列表
- ✅ 表格
- ✅ 链接/图片
- ✅ 水平线

### 2. 自定义渲染
- ✅ 自定义渲染器接口
- ✅ 覆盖任意节点类型的渲染
- ✅ 支持 HTML 类名/属性扩展

### 3. 语法高亮
- ✅ 4 种内置主题 (default/github/monokai/dracula)
- ✅ 基于正则的轻量高亮
- ✅ 支持多种语言 (TypeScript/JavaScript/Python/Rust 等)

## 🚀 快速开始

### 基础用法

```typescript
import { markdownToHtml, parseMarkdown } from './markdown-parser-skill';

const markdown = `
# Hello World

这是**粗体**和*斜体*。

\`\`\`typescript
const hello = 'world';
console.log(hello);
\`\`\`
`;

// 转换为 HTML
const html = markdownToHtml(markdown);
console.log(html);

// 解析为 AST
const ast = parseMarkdown(markdown);
console.log(JSON.stringify(ast, null, 2));
```

### 自定义渲染器

```typescript
import { markdownToHtml, createCustomRenderer } from './markdown-parser-skill';

const customRenderer = createCustomRenderer({
  heading: (node) => `
    <h${node.level} class="my-heading" data-level="${node.level}">
      <span class="icon">#</span>
      ${node.content}
    </h${node.level}>
  `,
  code_block: (node) => `
    <div class="code-container">
      <div class="code-header">
        <span class="lang">${node.lang || 'text'}</span>
        <button class="copy">复制</button>
      </div>
      <pre><code>${node.content}</code></pre>
    </div>
  `
});

const html = markdownToHtml(markdown, {
  customRenderer,
  codeTheme: 'dracula'
});
```

### 语法高亮

```typescript
import { highlightCode } from './markdown-parser-skill';

const code = `
function greet(name: string): string {
  return \`Hello, \${name}!\`;
}
`;

// 不同主题
const github = highlightCode(code, 'typescript', 'github');
const monokai = highlightCode(code, 'typescript', 'monokai');
const dracula = highlightCode(code, 'typescript', 'dracula');
```

## 📖 API 参考

### parseMarkdown(markdown: string): MarkdownNode[]

将 Markdown 文本解析为 AST。

**参数:**
- `markdown` - Markdown 文本

**返回:**
- `MarkdownNode[]` - AST 节点数组

**示例:**
```typescript
const ast = parseMarkdown('# Hello');
// [{ type: 'heading', level: 1, content: 'Hello', children: [...] }]
```

---

### markdownToHtml(markdown: string, options?: ParseOptions): string

将 Markdown 转换为 HTML。

**参数:**
- `markdown` - Markdown 文本
- `options` - 解析选项

**ParseOptions:**
```typescript
interface ParseOptions {
  highlight?: boolean;      // 是否启用语法高亮，默认 true
  allowHtml?: boolean;      // 是否允许 HTML，默认 false
  customRenderer?: CustomRenderer;  // 自定义渲染器
  codeTheme?: 'default' | 'github' | 'monokai' | 'dracula';  // 代码主题
}
```

**示例:**
```typescript
const html = markdownToHtml(markdown, {
  highlight: true,
  codeTheme: 'dracula'
});
```

---

### highlightCode(code: string, lang: string, theme: string): string

对代码进行语法高亮。

**参数:**
- `code` - 代码内容
- `lang` - 语言类型 (typescript/javascript/python/rust 等)
- `theme` - 主题名称

**返回:**
- `string` - 带 HTML 标签的高亮代码

**示例:**
```typescript
const highlighted = highlightCode(code, 'typescript', 'github');
```

---

### createCustomRenderer(overrides: Partial<CustomRenderer>): CustomRenderer

创建自定义渲染器。

**参数:**
- `overrides` - 覆盖的渲染方法

**CustomRenderer:**
```typescript
interface CustomRenderer {
  heading?: (node: MarkdownNode) => string;
  paragraph?: (node: MarkdownNode) => string;
  code?: (node: MarkdownNode) => string;
  code_block?: (node: MarkdownNode) => string;
  link?: (node: MarkdownNode) => string;
  image?: (node: MarkdownNode) => string;
  list?: (node: MarkdownNode) => string;
  table?: (node: MarkdownNode) => string;
}
```

**示例:**
```typescript
const renderer = createCustomRenderer({
  heading: (node) => `<h${node.level} class="custom">${node.content}</h${node.level}>`
});
```

---

## 🎨 主题预览

### Default 主题
- 关键字：紫色 `#c678dd`
- 字符串：绿色 `#98c379`
- 注释：灰色 `#5c6370`

### GitHub 主题
- 关键字：红色 `#d73a49`
- 字符串：深蓝 `#032f62`
- 注释：灰色 `#6a737d`

### Monokai 主题
- 关键字：粉红 `#f92672`
- 字符串：黄色 `#e6db74`
- 注释：深灰 `#75715e`

### Dracula 主题
- 关键字：粉色 `#ff79c6`
- 字符串：淡黄 `#f1fa8c`
- 注释：蓝灰 `#6272a4`

## 📝 使用示例

运行示例文件查看完整演示:

```bash
npx ts-node src/skills/markdown-parser-skill.examples.ts
```

或导入示例函数:

```typescript
import { runAllExamples } from './markdown-parser-skill.examples';
runAllExamples();
```

## ⚡ 性能

- 解析速度：~1000 行/秒
- 渲染速度：~2000 节点/秒
- 内存占用：低 (无外部依赖)

## 📋 待扩展功能

- [ ] 任务列表 (`- [ ]`, `- [x]`)
- [ ] 脚注 (`[^1]`)
- [ ] 定义列表
- [ ] 数学公式 (`$...$`)
- [ ] 更多语言的高亮支持
- [ ] 自定义语法注册

## 📄 许可证

MIT
