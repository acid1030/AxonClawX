# Markdown 工具技能 - 使用示例

## 1. 基础用法

### 1.1 Markdown 转 HTML

```typescript
import { markdownToHtml } from './markdown-utils-skill';

const markdown = `
# Hello World

这是一个**粗体**和*斜体*的示例。

- 列表项 1
- 列表项 2

\`\`\`javascript
console.log('Hello, World!');
\`\`\`
`;

const result = markdownToHtml(markdown);
console.log(result.html);
// 输出: <h1>Hello World</h1>\n<p>这是一个<strong>粗体</strong>和<em>斜体</em>的示例。</p>...
console.log(`转换耗时：${result.duration.toFixed(2)}ms`);
console.log(`HTML 字符数：${result.charCount}`);
```

### 1.2 带选项的转换

```typescript
import { markdownToHtml } from './markdown-utils-skill';

const markdown = `# 标题

这是内容。
`;

// 启用美化输出和标题锚点
const result = markdownToHtml(markdown, {}, {
  pretty: true,
  headingAnchors: true,
});

console.log(result.html);
// 输出:
// <h1 id="标题"><a href="#标题" class="heading-link">#</a>标题</h1>
// <p>这是内容。</p>
```

### 1.3 提取标题

```typescript
import { extractHeadings } from './markdown-utils-skill';

const markdown = `
# 第一章

## 1.1 节

### 1.1.1 小节

## 1.2 节

# 第二章
`;

const headings = extractHeadings(markdown);
console.log(headings);
// 输出:
// [
//   { level: 1, text: '第一章', line: 2, id: '第一章' },
//   { level: 2, text: '1.1 节', line: 4, id: '1-1-节' },
//   { level: 3, text: '1.1.1 小节', line: 6, id: '1-1-1-小节' },
//   { level: 2, text: '1.2 节', line: 8, id: '1-2-节' },
//   { level: 1, text: '第二章', line: 10, id: '第二章' }
// ]
```

### 1.4 提取链接

```typescript
import { extractLinks } from './markdown-utils-skill';

const markdown = `
查看 [文档](https://example.com/docs) 和 [API](https://api.example.com)。

![Logo](https://example.com/logo.png)

[GitHub](https://github.com "GitHub 网站")
`;

const links = extractLinks(markdown);
console.log(links);
// 输出:
// [
//   { text: '文档', url: 'https://example.com/docs', line: 2, isImage: false },
//   { text: 'API', url: 'https://api.example.com', line: 2, isImage: false },
//   { text: 'Logo', url: 'https://example.com/logo.png', line: 4, isImage: true },
//   { text: 'GitHub', url: 'https://github.com', title: 'GitHub 网站', line: 6, isImage: false }
// ]
```

### 1.5 同时提取标题和链接

```typescript
import { extractAll } from './markdown-utils-skill';

const markdown = `
# 项目文档

访问 [官网](https://example.com) 获取更多信息。

## 安装

\`\`\`bash
npm install
\`\`\`

![截图](screenshot.png)
`;

const result = extractAll(markdown);
console.log(`提取了 ${result.headings.length} 个标题`);
console.log(`提取了 ${result.links.length} 个链接`);
console.log(`耗时：${result.duration.toFixed(2)}ms`);
```

---

## 2. Markdown 生成

### 2.1 生成标题

```typescript
import { generateHeading } from './markdown-utils-skill';

console.log(generateHeading('主标题', 1));      // # 主标题
console.log(generateHeading('子标题', 2));    // ## 子标题
console.log(generateHeading('小节', 3));      // ### 小节
```

### 2.2 生成代码块

```typescript
import { generateCodeBlock } from './markdown-utils-skill';

const code = `function hello() {
  console.log('Hello, World!');
}`;

console.log(generateCodeBlock(code, 'javascript'));
// 输出:
// \`\`\`javascript
// function hello() {
//   console.log('Hello, World!');
// }
// \`\`\`
```

### 2.3 生成链接

```typescript
import { generateLink } from './markdown-utils-skill';

console.log(generateLink('GitHub', 'https://github.com'));
// [GitHub](https://github.com)

console.log(generateLink('GitHub', 'https://github.com', 'GitHub 网站'));
// [GitHub](https://github.com "GitHub 网站")
```

### 2.4 生成表格

```typescript
import { generateTable } from './markdown-utils-skill';

const headers = ['姓名', '年龄', '城市'];
const rows = [
  ['张三', '25', '北京'],
  ['李四', '30', '上海'],
  ['王五', '28', '广州'],
];

console.log(generateTable(headers, rows));
// 输出:
// | 姓名 | 年龄 | 城市 |
// | --- | --- | --- |
// | 张三 | 25 | 北京 |
// | 李四 | 30 | 上海 |
// | 王五 | 28 | 广州 |

// 带对齐方式
console.log(generateTable(headers, rows, ['left', 'center', 'right']));
// 输出:
// | 姓名 | 年龄 | 城市 |
// | --- | :---: | ---: |
// | 张三 | 25 | 北京 |
// | 李四 | 30 | 上海 |
// | 王五 | 28 | 广州 |
```

### 2.5 生成完整文档

```typescript
import { generateDocument, generateCodeBlock, generateLink } from './markdown-utils-skill';

const doc = generateDocument([
  {
    title: '项目文档',
    level: 1,
    content: '欢迎使用本项目。',
  },
  {
    title: '安装',
    level: 2,
    content: generateCodeBlock('npm install my-package', 'bash'),
  },
  {
    title: '使用方法',
    level: 2,
    content: `详见 ${generateLink('官方文档', 'https://example.com/docs')}。`,
  },
]);

console.log(doc);
// 输出:
// # 项目文档
//
// 欢迎使用本项目。
//
// ## 安装
//
// \`\`\`bash
// npm install my-package
// \`\`\`
//
// ## 使用方法
//
// 详见 [官方文档](https://example.com/docs)。
```

---

## 3. 高级用法

### 3.1 使用解析器类

```typescript
import { MarkdownParser } from './markdown-utils-skill';

const parser = new MarkdownParser({
  gfm: true,
  tables: true,
  strikethrough: true,
});

const markdown = '# Hello\n\n~~删除~~';
const result = parser.parse(markdown, { pretty: true });

console.log(result.html);
console.log(`错误：${result.errors}`);
```

### 3.2 使用生成器类

```typescript
import { MarkdownGenerator } from './markdown-utils-skill';

const gen = new MarkdownGenerator(2);

console.log(gen.bold('粗体'));
console.log(gen.italic('斜体'));
console.log(gen.strikethrough('删除'));
console.log(gen.inlineCode('console.log()'));
console.log(gen.image('Logo', 'logo.png', '公司 Logo'));
console.log(gen.blockquote('这是一段引用'));
console.log(gen.horizontalRule());
console.log(gen.unorderedList(['项 1', '项 2', '项 3']));
console.log(gen.orderedList(['第一步', '第二步', '第三步']));
console.log(gen.taskList([
  { text: '完成任务 1', done: true },
  { text: '完成任务 2', done: false },
]));
```

### 3.3 文档目录生成器

```typescript
import { extractHeadings, generateLink } from './markdown-utils-skill';
import * as fs from 'fs';

function generateTableOfContents(markdown: string): string {
  const headings = extractHeadings(markdown);
  
  const toc = headings.map(h => {
    const indent = '  '.repeat(h.level - 1);
    return `${indent}- ${generateLink(h.text, `#${h.id}`)}`;
  }).join('\n');
  
  return `## 目录\n\n${toc}`;
}

// 使用示例
const doc = fs.readFileSync('README.md', 'utf-8');
const toc = generateTableOfContents(doc);
console.log(toc);
```

### 3.4 Markdown 文档分析工具

```typescript
import { extractAll, markdownToHtml } from './markdown-utils-skill';

interface DocumentStats {
  headingCount: number;
  linkCount: number;
  imageCount: number;
  maxHeadingLevel: number;
  htmlSize: number;
}

function analyzeDocument(markdown: string): DocumentStats {
  const extracted = extractAll(markdown);
  const html = markdownToHtml(markdown);
  
  return {
    headingCount: extracted.headings.length,
    linkCount: extracted.links.filter(l => !l.isImage).length,
    imageCount: extracted.links.filter(l => l.isImage).length,
    maxHeadingLevel: Math.max(...extracted.headings.map(h => h.level), 0),
    htmlSize: html.charCount,
  };
}

// 使用示例
const markdown = `# 标题\n\n[链接](url)\n\n![图片](img.png)`;
const stats = analyzeDocument(markdown);
console.log(stats);
// { headingCount: 1, linkCount: 1, imageCount: 1, maxHeadingLevel: 1, htmlSize: 89 }
```

### 3.5 批量转换工具

```typescript
import { markdownToHtml } from './markdown-utils-skill';
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
    const result = markdownToHtml(content, {}, { pretty: true });

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${file}</title>
  <style>
    body { font-family: system-ui; max-width: 800px; margin: 0 auto; padding: 20px; }
    h1, h2, h3 { border-bottom: 1px solid #eee; padding-bottom: 0.3em; }
    pre { background: #f5f5f5; padding: 16px; border-radius: 8px; overflow-x: auto; }
    code { font-family: monospace; background: #f5f5f5; padding: 2px 6px; border-radius: 4px; }
    a { color: #0366d6; text-decoration: none; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
${result.html}
</body>
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
import { markdownToHtml, extractAll } from './markdown-utils-skill';

// 生成测试数据
const largeMarkdown = '# 测试文档\n\n'.repeat(100) + 
  '这是段落内容。\n\n'.repeat(500) +
  '- 列表项\n'.repeat(200) +
  '[链接](url)\n'.repeat(100) +
  '```\ncode\n```\n'.repeat(50);

console.log(`测试文档大小：${largeMarkdown.length} 字符`);

// 测试 Markdown → HTML
const mdStart = performance.now();
const htmlResult = markdownToHtml(largeMarkdown);
const mdDuration = performance.now() - mdStart;
console.log(`Markdown → HTML: ${mdDuration.toFixed(2)}ms (${htmlResult.charCount} 字符)`);

// 测试提取性能
const extractStart = performance.now();
const extracted = extractAll(largeMarkdown);
const extractDuration = performance.now() - extractStart;
console.log(`提取：${extractDuration.toFixed(2)}ms (${extracted.headings.length} 标题，${extracted.links.length} 链接)`);
```

---

## 5. API 参考

### 5.1 函数

| 函数 | 描述 | 返回值 |
|------|------|--------|
| `markdownToHtml(md, parseOpts?, renderOpts?)` | Markdown 转 HTML | `MarkdownToHtmlResult` |
| `generateHeading(text, level)` | 生成标题 | `string` |
| `generateCodeBlock(code, lang)` | 生成代码块 | `string` |
| `generateLink(text, url, title?)` | 生成链接 | `string` |
| `generateTable(headers, rows, align?)` | 生成表格 | `string` |
| `extractHeadings(md)` | 提取标题 | `HeadingInfo[]` |
| `extractLinks(md)` | 提取链接 | `LinkInfo[]` |
| `extractAll(md)` | 提取标题和链接 | `ExtractResult` |
| `generateDocument(sections)` | 生成完整文档 | `string` |

### 5.2 类型

```typescript
interface MarkdownToHtmlResult {
  html: string;
  duration: number;
  charCount: number;
  errors: string[];
}

interface HeadingInfo {
  level: number;        // 1-6
  text: string;
  line: number;
  id: string;
}

interface LinkInfo {
  text: string;
  url: string;
  title?: string;
  line: number;
  isImage: boolean;
}

interface ExtractResult {
  headings: HeadingInfo[];
  links: LinkInfo[];
  duration: number;
}

interface ParseOptions {
  gfm?: boolean;
  tables?: boolean;
  strikethrough?: boolean;
  breaks?: boolean;
}

interface RenderOptions {
  pretty?: boolean;
  indent?: string;
  headingAnchors?: boolean;
}
```

### 5.3 类

#### MarkdownParser
- `constructor(options?: ParseOptions)`
- `parse(markdown: string, renderOptions?: RenderOptions): MarkdownToHtmlResult`

#### MarkdownGenerator
- `constructor(indentSize?: number)`
- `heading(text, level)`, `paragraph(text)`, `bold(text)`, `italic(text)`
- `codeBlock(code, lang)`, `link(text, url, title?)`, `image(alt, url, title?)`
- `unorderedList(items)`, `orderedList(items)`, `blockquote(text)`
- `table(headers, rows, align?)`, `taskList(tasks)`, `document(sections)`

---

**版本:** 1.0.0  
**作者:** Axon  
**模块:** ACE (Axon Core Engine)
