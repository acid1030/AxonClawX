# Markdown 解析技能 - 使用示例

## 1. 基础用法

### 1.1 Markdown 转 HTML

```typescript
import { markdownToHtml } from './markdown-parser-skill';

const markdown = `
# 标题

这是一个**粗体**和*斜体*的示例。

- 列表项 1
- 列表项 2

\`\`\`javascript
console.log('Hello, World!');
\`\`\`
`;

const result = markdownToHtml(markdown);
console.log(result.content);
// 输出: <h1>标题</h1>\n<p>这是一个<strong>粗体</strong>和<em>斜体</em>的示例。</p>...
console.log(`转换耗时：${result.duration.toFixed(2)}ms`);
```

### 1.2 HTML 转 Markdown

```typescript
import { htmlToMarkdown } from './markdown-parser-skill';

const html = `
<h1>标题</h1>
<p>这是一个<strong>粗体</strong>和<em>斜体</em>的示例。</p>
<ul>
  <li>列表项 1</li>
  <li>列表项 2</li>
</ul>
<pre><code class="language-javascript">console.log('Hello, World!');</code></pre>
`;

const result = htmlToMarkdown(html);
console.log(result.content);
// 输出: # 标题\n\n这是一个**粗体**和*斜体*的示例。\n\n- 列表项 1\n- 列表项 2\n\n```javascript\n...
```

### 1.3 解析为 AST

```typescript
import { parseMarkdown } from './markdown-parser-skill';

const markdown = `
# 主标题

## 子标题

段落内容。

> 引用内容

- 项目 1
- 项目 2
`;

const result = parseMarkdown(markdown);
console.log(`解析了 ${result.nodeCount} 个节点`);
console.log(JSON.stringify(result.ast, null, 2));

if (result.errors.length > 0) {
  console.error('解析错误:', result.errors);
}
```

---

## 2. 高级用法

### 2.1 自定义渲染器

```typescript
import { MarkdownParser, HTMLRenderer, CustomRenderer } from './markdown-parser-skill';

// 创建自定义代码块渲染器
const codeBlockRenderer: CustomRenderer = {
  nodeType: 'code_block',
  render: (node, options) => {
    const lang = node.meta?.language || 'text';
    const code = node.content || '';
    return `<div class="code-block" data-lang="${lang}">
      <div class="code-header">${lang}</div>
      <pre><code>${code}</code></pre>
    </div>`;
  },
};

// 创建解析器和渲染器
const parser = new MarkdownParser();
const renderer = new HTMLRenderer();

// 注册自定义渲染器
renderer.registerRenderer(codeBlockRenderer);

// 解析并渲染
const markdown = `\`\`\`typescript
const hello = 'world';
\`\`\``;

const ast = parser.parse(markdown);
const html = renderer.render(ast);
console.log(html);
```

### 2.2 自定义标题渲染器 (添加锚点)

```typescript
import { HTMLRenderer, CustomRenderer } from './markdown-parser-skill';

const headingRenderer: CustomRenderer = {
  nodeType: 'heading',
  render: (node) => {
    const level = node.meta?.level || 1;
    const content = node.content || '';
    const id = content.toLowerCase().replace(/\s+/g, '-');
    return `<h${level} id="${id}">
      <a href="#${id}" class="heading-link">#</a>
      ${content}
    </h${level}>`;
  },
};

const renderer = new HTMLRenderer();
renderer.registerRenderer(headingRenderer);
```

### 2.3 自定义列表渲染器 (添加图标)

```typescript
import { HTMLRenderer, CustomRenderer } from './markdown-parser-skill';

const listRenderer: CustomRenderer = {
  nodeType: ['list', 'list_item'],
  render: (node, options) => {
    if (node.type === 'list') {
      const tag = node.meta?.ordered ? 'ol' : 'ul';
      const items = node.children
        ?.map((item) => renderer.renderNode(item, 1))
        .join('\n');
      return `<${tag} class="custom-list">\n${items}\n</${tag}>`;
    }
    
    if (node.type === 'list_item') {
      return `  <li class="list-item">✨ ${node.content}</li>`;
    }
    
    return '';
  },
};

const renderer = new HTMLRenderer();
renderer.registerRenderer(listRenderer);
```

---

## 3. 完整示例

### 3.1 文档转换器

```typescript
import { markdownToHtml, htmlToMarkdown } from './markdown-parser-skill';
import * as fs from 'fs';

// 读取 Markdown 文件
const mdContent = fs.readFileSync('document.md', 'utf-8');

// 转换为 HTML
const htmlResult = markdownToHtml(mdContent, {
  gfm: true,
  tables: true,
  strikethrough: true,
}, {
  pretty: true,
  indent: '  ',
});

// 包装为完整 HTML 文档
const fullHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>文档</title>
  <style>
    body { font-family: system-ui; max-width: 800px; margin: 0 auto; padding: 20px; }
    pre { background: #f5f5f5; padding: 16px; border-radius: 8px; }
    code { font-family: monospace; }
  </style>
</head>
<body>
  ${htmlResult.content}
</body>
</html>
`;

// 保存 HTML 文件
fs.writeFileSync('document.html', fullHtml);
console.log(`转换完成！HTML 大小：${htmlResult.charCount} 字符`);
```

### 3.2 Markdown 编辑器预览

```typescript
import { MarkdownParser, HTMLRenderer } from './markdown-parser-skill';

class MarkdownEditor {
  private parser: MarkdownParser;
  private renderer: HTMLRenderer;

  constructor() {
    this.parser = new MarkdownParser({
      gfm: true,
      tables: true,
      breaks: true,
    });
    
    this.renderer = new HTMLRenderer({
      pretty: false,
    });
    
    this.setupCustomRenderers();
  }

  private setupCustomRenderers() {
    // 添加任务列表支持
    this.renderer.registerRenderer({
      nodeType: 'list_item',
      render: (node) => {
        const content = node.content || '';
        if (content.startsWith('[ ] ')) {
          return `<li><input type="checkbox" disabled> ${content.slice(4)}</li>`;
        }
        if (content.startsWith('[x] ')) {
          return `<li><input type="checkbox" disabled checked> ${content.slice(4)}</li>`;
        }
        return `<li>${content}</li>`;
      },
    });
  }

  preview(markdown: string): string {
    const ast = this.parser.parse(markdown);
    return this.renderer.render(ast);
  }

  getStats(markdown: string) {
    const ast = this.parser.parse(markdown);
    return {
      nodeCount: ast.nodeCount,
      charCount: markdown.length,
      errors: ast.errors,
    };
  }
}

// 使用示例
const editor = new MarkdownEditor();
const preview = editor.preview('# Hello\n\n- [ ] 任务 1\n- [x] 任务 2');
console.log(preview);
```

### 3.3 批量转换工具

```typescript
import { markdownToHtml } from './markdown-parser-skill';
import * as fs from 'fs';
import * as path from 'path';

async function convertDirectory(inputDir: string, outputDir: string) {
  const files = fs.readdirSync(inputDir);
  const mdFiles = files.filter(f => f.endsWith('.md'));

  console.log(`找到 ${mdFiles.length} 个 Markdown 文件`);

  for (const file of mdFiles) {
    const inputPath = path.join(inputDir, file);
    const outputPath = path.join(outputDir, file.replace('.md', '.html'));

    const content = fs.readFileSync(inputPath, 'utf-8');
    const result = markdownToHtml(content);

    const html = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>${file}</title></head>
<body>${result.content}</body>
</html>`;

    fs.writeFileSync(outputPath, html);
    console.log(`✓ ${file} → ${path.basename(outputPath)} (${result.duration.toFixed(2)}ms)`);
  }
}

// 使用
convertDirectory('./docs', './dist');
```

---

## 4. 性能测试

```typescript
import { markdownToHtml, htmlToMarkdown, parseMarkdown } from './markdown-parser-skill';

// 生成测试数据
const largeMarkdown = '# 测试文档\n\n'.repeat(100) + 
  '这是段落内容。\n\n'.repeat(500) +
  '- 列表项\n'.repeat(200) +
  '```\ncode\n```\n'.repeat(50);

console.log(`测试文档大小：${largeMarkdown.length} 字符`);

// 测试 Markdown → HTML
const mdStart = performance.now();
const htmlResult = markdownToHtml(largeMarkdown);
const mdDuration = performance.now() - mdStart;
console.log(`Markdown → HTML: ${mdDuration.toFixed(2)}ms (${htmlResult.charCount} 字符)`);

// 测试 HTML → Markdown
const htmlStart = performance.now();
const mdResult = htmlToMarkdown(htmlResult.content);
const htmlDuration = performance.now() - htmlStart;
console.log(`HTML → Markdown: ${htmlDuration.toFixed(2)}ms (${mdResult.charCount} 字符)`);

// 测试解析性能
const parseStart = performance.now();
const ast = parseMarkdown(largeMarkdown);
const parseDuration = performance.now() - parseStart;
console.log(`解析 AST: ${parseDuration.toFixed(2)}ms (${ast.nodeCount} 节点)`);
```

---

## 5. 支持的 Markdown 语法

### 5.1 块级元素

| 语法 | 示例 | 支持 |
|------|------|------|
| 标题 | `# H1` 到 `###### H6` | ✅ |
| 段落 | 普通文本 | ✅ |
| 代码块 | ` ```language ` | ✅ |
| 块引用 | `> 引用` | ✅ |
| 无序列表 | `- 项` / `* 项` / `+ 项` | ✅ |
| 有序列表 | `1. 项` | ✅ |
| 表格 | `| 列 |` | ✅ |
| 水平线 | `---` / `***` | ✅ |
| 任务列表 | `- [ ] 任务` | ⚠️ 需自定义渲染器 |

### 5.2 行内元素

| 语法 | 示例 | 支持 |
|------|------|------|
| 粗体 | `**文本**` | ✅ |
| 斜体 | `*文本*` | ✅ |
| 删除线 | `~~文本~~` | ✅ |
| 行内代码 | `` `代码` `` | ✅ |
| 链接 | `[文本](url)` | ✅ |
| 图片 | `![alt](url)` | ✅ |
| 自动链接 | `<https://...>` | ✅ |

---

## 6. API 参考

### 6.1 类

#### MarkdownParser
- `constructor(options?: ParseOptions)`
- `parse(markdown: string): ParseResult`
- `registerRenderer(renderer: CustomRenderer): void`

#### HTMLRenderer
- `constructor(options?: RenderOptions)`
- `render(ast: MarkdownNode): string`
- `registerRenderer(renderer: CustomRenderer): void`

#### HtmlToMarkdown
- `constructor(options?: HtmlToMdOptions)`
- `convert(html: string): ConvertResult`

### 6.2 函数

- `markdownToHtml(markdown, parseOptions?, renderOptions?): ConvertResult`
- `htmlToMarkdown(html, options?): ConvertResult`
- `parseMarkdown(markdown, options?): ParseResult`
- `renderAstToHtml(ast, options?): string`

### 6.3 类型

```typescript
interface ParseOptions {
  gfm?: boolean;
  tables?: boolean;
  strikethrough?: boolean;
  tasklists?: boolean;
  breaks?: boolean;
  html?: boolean;
}

interface RenderOptions {
  pretty?: boolean;
  indent?: string;
  keepWhitespace?: boolean;
}

interface HtmlToMdOptions {
  gfm?: boolean;
  strong?: '**' | '__';
  em?: '*' | '_';
  codeFence?: '```' | '~~~';
  bullet?: '-' | '*' | '+';
}
```

---

**版本:** 1.0.0  
**作者:** Axon  
**模块:** ACE (Axon Core Engine)
