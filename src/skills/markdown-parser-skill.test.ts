/**
 * Markdown 解析技能测试
 */

import { describe, it, expect } from 'vitest';
import {
  MarkdownParser,
  HTMLRenderer,
  HtmlToMarkdown,
  markdownToHtml,
  htmlToMarkdown,
  parseMarkdown,
} from './markdown-parser-skill';

describe('MarkdownParser', () => {
  it('应解析标题', () => {
    const parser = new MarkdownParser();
    const result = parser.parse('# 标题 1\n\n## 标题 2');
    
    expect(result.ast.children).toBeDefined();
    expect(result.nodeCount).toBeGreaterThan(0);
    expect(result.errors).toHaveLength(0);
  });

  it('应解析段落', () => {
    const parser = new MarkdownParser();
    const result = parser.parse('这是段落内容。');
    
    const firstChild = result.ast.children?.[0];
    expect(firstChild).toBeDefined();
    // 段落可能包含文本子节点或直接有 content
    expect(firstChild?.type === 'paragraph' || firstChild?.type === 'text').toBe(true);
  });

  it('应解析代码块', () => {
    const parser = new MarkdownParser();
    const result = parser.parse('```typescript\nconst x = 1;\n```');
    
    const codeBlock = result.ast.children?.find((n) => n.type === 'code_block');
    expect(codeBlock).toBeDefined();
    expect(codeBlock?.meta?.language).toBe('typescript');
    expect(codeBlock?.content).toBe('const x = 1;');
  });

  it('应解析列表', () => {
    const parser = new MarkdownParser();
    const result = parser.parse('- 项 1\n- 项 2\n- 项 3');
    
    const list = result.ast.children?.find((n) => n.type === 'list');
    expect(list).toBeDefined();
    expect(list?.meta?.ordered).toBe(false);
    expect(list?.children).toHaveLength(3);
  });

  it('应解析有序列表', () => {
    const parser = new MarkdownParser();
    const result = parser.parse('1. 第一项\n2. 第二项');
    
    const list = result.ast.children?.find((n) => n.type === 'list');
    expect(list?.meta?.ordered).toBe(true);
  });

  it('应解析块引用', () => {
    const parser = new MarkdownParser();
    const result = parser.parse('> 引用内容\n> 第二行');
    
    const quote = result.ast.children?.find((n) => n.type === 'blockquote');
    expect(quote).toBeDefined();
    expect(quote?.content).toContain('引用内容');
  });

  it('应解析表格', () => {
    const parser = new MarkdownParser();
    const markdown = `
| 列 1 | 列 2 |
|------|------|
| 值 1 | 值 2 |
| 值 3 | 值 4 |
`.trim();
    
    const result = parser.parse(markdown);
    const table = result.ast.children?.find((n) => n.type === 'table');
    expect(table).toBeDefined();
    expect(table?.children).toHaveLength(3); // 1 header + 2 data rows
  });

  it('应解析行内元素', () => {
    const parser = new MarkdownParser();
    const result = parser.parse('这是**粗体**和*斜体*和`代码`。');
    
    expect(result.nodeCount).toBeGreaterThan(1);
  });

  it('应解析链接', () => {
    const parser = new MarkdownParser();
    const result = parser.parse('[链接文本](https://example.com)');
    
    // 链接可能在 paragraph 的子节点中，或者直接是第一个子节点
    const firstChild = result.ast.children?.[0];
    const linkNode = firstChild?.type === 'paragraph' ? firstChild.children?.[0] : firstChild;
    expect(linkNode?.type).toBe('link');
    expect(linkNode?.meta?.url).toBe('https://example.com');
  });

  it('应解析图片', () => {
    const parser = new MarkdownParser();
    const result = parser.parse('![替代文本](https://example.com/image.png)');
    
    const firstChild = result.ast.children?.[0];
    const imageNode = firstChild?.type === 'paragraph' ? firstChild.children?.[0] : firstChild;
    expect(imageNode?.type).toBe('image');
    expect(imageNode?.meta?.url).toBe('https://example.com/image.png');
  });

  it('应解析水平线', () => {
    const parser = new MarkdownParser();
    const result = parser.parse('---');
    
    const hr = result.ast.children?.find((n) => n.type === 'hr');
    expect(hr).toBeDefined();
  });

  it('应统计节点数', () => {
    const parser = new MarkdownParser();
    const result = parser.parse('# 标题\n\n段落\n\n- 项 1');
    
    expect(result.nodeCount).toBeGreaterThan(3);
  });
});

describe('HTMLRenderer', () => {
  it('应渲染标题为 HTML', () => {
    const parser = new MarkdownParser();
    const renderer = new HTMLRenderer();
    
    const ast = parser.parse('# 标题');
    const html = renderer.render(ast);
    
    expect(html).toContain('<h1>标题</h1>');
  });

  it('应渲染段落为 HTML', () => {
    const parser = new MarkdownParser();
    const renderer = new HTMLRenderer();
    
    const ast = parser.parse('段落内容');
    const html = renderer.render(ast);
    
    expect(html).toContain('<p>段落内容</p>');
  });

  it('应渲染代码块为 HTML', () => {
    const parser = new MarkdownParser();
    const renderer = new HTMLRenderer();
    
    const ast = parser.parse('```javascript\ncode\n```');
    const html = renderer.render(ast);
    
    expect(html).toContain('<pre><code');
    expect(html).toContain('language-javascript');
  });

  it('应渲染列表为 HTML', () => {
    const parser = new MarkdownParser();
    const renderer = new HTMLRenderer();
    
    const ast = parser.parse('- 项 1\n- 项 2');
    const html = renderer.render(ast);
    
    expect(html).toContain('<ul>');
    expect(html).toContain('<li>项 1</li>');
    expect(html).toContain('<li>项 2</li>');
  });

  it('应渲染有序列表为 HTML', () => {
    const parser = new MarkdownParser();
    const renderer = new HTMLRenderer();
    
    const ast = parser.parse('1. 第一项\n2. 第二项');
    const html = renderer.render(ast);
    
    expect(html).toContain('<ol>');
  });

  it('应渲染表格为 HTML', () => {
    const parser = new MarkdownParser();
    const renderer = new HTMLRenderer();
    
    const markdown = `
| 列 1 | 列 2 |
|------|------|
| 值 1 | 值 2 |
`.trim();
    
    const ast = parser.parse(markdown);
    const html = renderer.render(ast);
    
    expect(html).toContain('<table>');
    expect(html).toContain('<th>');
    expect(html).toContain('<td>');
  });

  it('应转义 HTML 特殊字符', () => {
    const parser = new MarkdownParser();
    const renderer = new HTMLRenderer();
    
    const ast = parser.parse('文本 <script>alert("xss")</script>');
    const html = renderer.render(ast);
    
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('应支持自定义渲染器', () => {
    const parser = new MarkdownParser();
    const renderer = new HTMLRenderer();
    
    renderer.registerRenderer({
      nodeType: 'heading',
      render: (node) => `<h${node.meta?.level || 1} class="custom">${node.content}</h${node.meta?.level || 1}>`,
    });
    
    const ast = parser.parse('# 自定义标题');
    const html = renderer.render(ast);
    
    expect(html).toContain('class="custom"');
  });
});

describe('HtmlToMarkdown', () => {
  it('应转换标题为 Markdown', () => {
    const converter = new HtmlToMarkdown();
    const result = converter.convert('<h1>标题</h1>');
    
    expect(result.content).toContain('# 标题');
  });

  it('应转换段落为 Markdown', () => {
    const converter = new HtmlToMarkdown();
    const result = converter.convert('<p>段落内容</p>');
    
    expect(result.content).toContain('段落内容');
  });

  it('应转换粗体为 Markdown', () => {
    const converter = new HtmlToMarkdown();
    const result = converter.convert('<strong>粗体</strong>');
    
    expect(result.content).toContain('**粗体**');
  });

  it('应转换斜体为 Markdown', () => {
    const converter = new HtmlToMarkdown();
    const result = converter.convert('<em>斜体</em>');
    
    expect(result.content).toContain('*斜体*');
  });

  it('应转换代码块为 Markdown', () => {
    const converter = new HtmlToMarkdown();
    const result = converter.convert('<pre><code>code</code></pre>');
    
    expect(result.content).toContain('```');
    expect(result.content).toContain('code');
  });

  it('应转换链接为 Markdown', () => {
    const converter = new HtmlToMarkdown();
    const result = converter.convert('<a href="https://example.com">链接</a>');
    
    expect(result.content).toContain('[链接](https://example.com)');
  });

  it('应转换图片为 Markdown', () => {
    const converter = new HtmlToMarkdown();
    const result = converter.convert('<img src="image.png" alt="图片">');
    
    expect(result.content).toContain('![图片](image.png)');
  });

  it('应转换列表为 Markdown', () => {
    const converter = new HtmlToMarkdown();
    const result = converter.convert('<ul><li>项 1</li><li>项 2</li></ul>');
    
    expect(result.content).toContain('- 项 1');
    expect(result.content).toContain('- 项 2');
  });

  it('应转换有序列表为 Markdown', () => {
    const converter = new HtmlToMarkdown();
    const result = converter.convert('<ol><li>第一项</li><li>第二项</li></ol>');
    
    expect(result.content).toMatch(/\d+\. 第一项/);
    expect(result.content).toMatch(/\d+\. 第二项/);
  });

  it('应返回转换统计信息', () => {
    const converter = new HtmlToMarkdown();
    const result = converter.convert('<p>测试</p>');
    
    expect(result.duration).toBeGreaterThanOrEqual(0);
    expect(result.charCount).toBeGreaterThan(0);
  });
});

describe('便捷函数', () => {
  it('markdownToHtml 应工作', () => {
    const result = markdownToHtml('# 标题\n\n段落');
    
    expect(result.content).toContain('<h1>');
    expect(result.content).toContain('<p>');
    expect(result.duration).toBeGreaterThanOrEqual(0);
  });

  it('htmlToMarkdown 应工作', () => {
    const result = htmlToMarkdown('<h1>标题</h1><p>段落</p>');
    
    expect(result.content).toContain('# 标题');
    expect(result.duration).toBeGreaterThanOrEqual(0);
  });

  it('parseMarkdown 应工作', () => {
    const result = parseMarkdown('# 标题');
    
    expect(result.ast).toBeDefined();
    expect(result.nodeCount).toBeGreaterThan(0);
    expect(result.errors).toHaveLength(0);
  });

  it('应支持解析选项', () => {
    const result = parseMarkdown('# 标题', {
      gfm: true,
      tables: true,
    });
    
    expect(result.ast).toBeDefined();
  });

  it('应支持渲染选项', () => {
    const result = markdownToHtml('# 标题\n\n## 副标题', {}, {
      pretty: true,
      indent: '  ',
    });
    
    // .pretty 模式应该会产生多行输出
    expect(result.content).toContain('\n');
  });
});

describe('性能测试', () => {
  it('应快速解析大文档', () => {
    const largeMarkdown = '# 标题\n\n'.repeat(100) + '段落\n\n'.repeat(500);
    
    const start = performance.now();
    const result = markdownToHtml(largeMarkdown);
    const duration = performance.now() - start;
    
    expect(duration).toBeLessThan(1000); // 应在 1 秒内完成
    expect(result.charCount).toBeGreaterThan(0);
  });

  it('应快速转换大 HTML', () => {
    const largeHtml = '<p>段落</p>'.repeat(500);
    
    const start = performance.now();
    const result = htmlToMarkdown(largeHtml);
    const duration = performance.now() - start;
    
    expect(duration).toBeLessThan(1000);
    expect(result.charCount).toBeGreaterThan(0);
  });
});

describe('边界情况', () => {
  it('应处理空字符串', () => {
    const result = markdownToHtml('');
    expect(result.content).toBeDefined();
  });

  it('应处理仅空白字符', () => {
    const result = markdownToHtml('   \n\n   ');
    expect(result.content).toBeDefined();
  });

  it('应处理嵌套格式', () => {
    const result = markdownToHtml('**粗体*斜体*粗体**');
    expect(result.content).toBeDefined();
  });

  it('应处理特殊字符', () => {
    const result = markdownToHtml('文本 & < > " \'');
    expect(result.content).toContain('&amp;');
    expect(result.content).toContain('&lt;');
  });

  it('应处理混合内容', () => {
    const markdown = `
# 标题

段落 **粗体** *斜体*

- 列表
- 项目

\`\`\`js
code
\`\`\`

> 引用

| 表 | 格 |
|----|----|
| 值 | 值 |
`.trim();
    
    const result = markdownToHtml(markdown);
    expect(result.content).toContain('<h1>');
    expect(result.content).toContain('<p>');
    expect(result.content).toContain('<ul>');
    expect(result.content).toContain('<pre>');
    expect(result.content).toContain('<blockquote>');
    expect(result.content).toContain('<table>');
  });
});
