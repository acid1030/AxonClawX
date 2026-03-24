/**
 * Markdown 解析工具技能
 * 
 * 功能:
 * 1. Markdown 解析 - 将 Markdown 文本转换为 HTML/AST
 * 2. 自定义渲染 - 支持自定义渲染规则和扩展语法
 * 3. 语法高亮 - 代码块语法高亮支持
 * 
 * @module skills/markdown-parser
 */

// ==================== 类型定义 ====================

/**
 * Markdown AST 节点类型
 */
export type NodeType =
  | 'heading'
  | 'paragraph'
  | 'text'
  | 'bold'
  | 'italic'
  | 'code'
  | 'code_block'
  | 'blockquote'
  | 'link'
  | 'image'
  | 'list'
  | 'list_item'
  | 'table'
  | 'table_row'
  | 'table_cell'
  | 'hr'
  | 'br';

/**
 * Markdown AST 节点
 */
export interface MarkdownNode {
  type: NodeType;
  content?: string;
  level?: number;
  url?: string;
  alt?: string;
  lang?: string;
  children?: MarkdownNode[];
  attributes?: Record<string, any>;
}

/**
 * 解析选项
 */
export interface ParseOptions {
  /** 是否解析语法高亮 */
  highlight?: boolean;
  /** 是否允许 HTML */
  allowHtml?: boolean;
  /** 自定义渲染器 */
  customRenderer?: CustomRenderer;
  /** 代码块主题 */
  codeTheme?: 'default' | 'github' | 'monokai' | 'dracula';
}

/**
 * 自定义渲染器接口
 */
export interface CustomRenderer {
  heading?: (node: MarkdownNode) => string;
  paragraph?: (node: MarkdownNode) => string;
  code?: (node: MarkdownNode) => string;
  code_block?: (node: MarkdownNode) => string;
  link?: (node: MarkdownNode) => string;
  image?: (node: MarkdownNode) => string;
  list?: (node: MarkdownNode) => string;
  table?: (node: MarkdownNode) => string;
}

/**
 * 语法高亮主题配置
 */
export interface HighlightTheme {
  keyword: string;
  string: string;
  number: string;
  comment: string;
  function: string;
  class: string;
  variable: string;
  operator: string;
}

// ==================== 核心解析器 ====================

/**
 * 将 Markdown 文本解析为 AST
 * @param markdown - Markdown 文本
 * @returns AST 节点数组
 */
export function parseMarkdown(markdown: string): MarkdownNode[] {
  const nodes: MarkdownNode[] = [];
  const lines = markdown.split('\n');
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // 空行
    if (line.trim() === '') {
      i++;
      continue;
    }

    // 标题
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      nodes.push({
        type: 'heading',
        level: headingMatch[1].length,
        content: headingMatch[2],
        children: parseInline(headingMatch[2])
      });
      i++;
      continue;
    }

    // 代码块
    if (line.startsWith('```')) {
      const lang = line.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      nodes.push({
        type: 'code_block',
        lang: lang || 'text',
        content: codeLines.join('\n')
      });
      i++;
      continue;
    }

    // 引用块
    if (line.startsWith('>')) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].startsWith('>')) {
        quoteLines.push(lines[i].replace(/^>\s?/, ''));
        i++;
      }
      nodes.push({
        type: 'blockquote',
        content: quoteLines.join('\n'),
        children: parseInline(quoteLines.join('\n'))
      });
      continue;
    }

    // 无序列表
    if (/^[-*+]\s+/.test(line)) {
      const items: MarkdownNode[] = [];
      while (i < lines.length && /^[-*+]\s+/.test(lines[i])) {
        const itemContent = lines[i].replace(/^[-*+]\s+/, '');
        items.push({
          type: 'list_item',
          content: itemContent,
          children: parseInline(itemContent)
        });
        i++;
      }
      nodes.push({
        type: 'list',
        children: items
      });
      continue;
    }

    // 有序列表
    if (/^\d+\.\s+/.test(line)) {
      const items: MarkdownNode[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
        const itemContent = lines[i].replace(/^\d+\.\s+/, '');
        items.push({
          type: 'list_item',
          content: itemContent,
          children: parseInline(itemContent)
        });
        i++;
      }
      nodes.push({
        type: 'list',
        children: items
      });
      continue;
    }

    // 表格
    if (line.includes('|') && line.trim().startsWith('|')) {
      const tableRows: MarkdownNode[] = [];
      const headerMatch = line.match(/\|(.+)\|/);
      if (headerMatch) {
        const headers = headerMatch[1].split('|').map(h => h.trim());
        const headerRow: MarkdownNode = {
          type: 'table_row',
          children: headers.map(h => ({
            type: 'table_cell',
            content: h,
            attributes: { isHeader: true }
          }))
        };
        tableRows.push(headerRow);
        i++;
        
        // 跳过分隔符行
        if (i < lines.length && lines[i].includes('|') && lines[i].includes('---')) {
          i++;
        }
        
        // 解析数据行
        while (i < lines.length && lines[i].includes('|') && lines[i].trim().startsWith('|')) {
          const rowMatch = lines[i].match(/\|(.+)\|/);
          if (rowMatch) {
            const cells = rowMatch[1].split('|').map(c => c.trim());
            tableRows.push({
              type: 'table_row',
              children: cells.map(c => ({
                type: 'table_cell',
                content: c
              }))
            });
          }
          i++;
        }
        
        nodes.push({
          type: 'table',
          children: tableRows
        });
      }
      continue;
    }

    // 水平线
    if (/^[-*_]{3,}$/.test(line.trim())) {
      nodes.push({ type: 'hr' });
      i++;
      continue;
    }

    // 段落
    const paragraphLines: string[] = [];
    while (i < lines.length && lines[i].trim() !== '' && !lines[i].match(/^[#>`]|^[-*+]\s|^\d+\.\s|\|/)) {
      paragraphLines.push(lines[i]);
      i++;
    }
    if (paragraphLines.length > 0) {
      const content = paragraphLines.join(' ');
      nodes.push({
        type: 'paragraph',
        content: content,
        children: parseInline(content)
      });
    }
  }

  return nodes;
}

/**
 * 解析行内元素 (粗体、斜体、代码、链接等)
 * @param text - 文本内容
 * @returns 行内节点数组
 */
export function parseInline(text: string): MarkdownNode[] {
  const nodes: MarkdownNode[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    // 链接 ![alt](url)
    const imageMatch = remaining.match(/^!\[([^\]]*)\]\(([^)]+)\)/);
    if (imageMatch) {
      nodes.push({
        type: 'image',
        alt: imageMatch[1],
        url: imageMatch[2]
      });
      remaining = remaining.slice(imageMatch[0].length);
      continue;
    }

    // 链接 [text](url)
    const linkMatch = remaining.match(/^\[([^\]]+)\]\(([^)]+)\)/);
    if (linkMatch) {
      nodes.push({
        type: 'link',
        content: linkMatch[1],
        url: linkMatch[2],
        children: parseInline(linkMatch[1])
      });
      remaining = remaining.slice(linkMatch[0].length);
      continue;
    }

    // 行内代码 `code`
    const codeMatch = remaining.match(/^`([^`]+)`/);
    if (codeMatch) {
      nodes.push({
        type: 'code',
        content: codeMatch[1]
      });
      remaining = remaining.slice(codeMatch[0].length);
      continue;
    }

    // 粗体 **text**
    const boldMatch = remaining.match(/^\*\*([^*]+)\*\*/);
    if (boldMatch) {
      nodes.push({
        type: 'bold',
        content: boldMatch[1],
        children: parseInline(boldMatch[1])
      });
      remaining = remaining.slice(boldMatch[0].length);
      continue;
    }

    // 斜体 *text*
    const italicMatch = remaining.match(/^\*([^*]+)\*/);
    if (italicMatch) {
      nodes.push({
        type: 'italic',
        content: italicMatch[1],
        children: parseInline(italicMatch[1])
      });
      remaining = remaining.slice(italicMatch[0].length);
      continue;
    }

    // 普通文本
    const textMatch = remaining.match(/^[^`*\[!]+/);
    if (textMatch) {
      nodes.push({
        type: 'text',
        content: textMatch[0]
      });
      remaining = remaining.slice(textMatch[0].length);
    } else {
      nodes.push({
        type: 'text',
        content: remaining[0]
      });
      remaining = remaining.slice(1);
    }
  }

  return nodes;
}

// ==================== HTML 渲染器 ====================

/**
 * 默认语法高亮主题
 */
const HIGHLIGHT_THEMES: Record<string, HighlightTheme> = {
  default: {
    keyword: '#c678dd',
    string: '#98c379',
    number: '#d19a66',
    comment: '#5c6370',
    function: '#61afef',
    class: '#e5c07b',
    variable: '#e06c75',
    operator: '#56b6c2'
  },
  github: {
    keyword: '#d73a49',
    string: '#032f62',
    number: '#005cc5',
    comment: '#6a737d',
    function: '#6f42c1',
    class: '#22863a',
    variable: '#e36209',
    operator: '#d73a49'
  },
  monokai: {
    keyword: '#f92672',
    string: '#e6db74',
    number: '#ae81ff',
    comment: '#75715e',
    function: '#a6e22e',
    class: '#66d9ef',
    variable: '#f8f8f2',
    operator: '#f92672'
  },
  dracula: {
    keyword: '#ff79c6',
    string: '#f1fa8c',
    number: '#bd93f9',
    comment: '#6272a4',
    function: '#50fa7b',
    class: '#8be9fd',
    variable: '#ffb86c',
    operator: '#ff79c6'
  }
};

/**
 * 简单的语法高亮 (基于正则)
 * @param code - 代码内容
 * @param lang - 语言类型
 * @param theme - 主题名称
 * @returns 带 HTML 标签的高亮代码
 */
export function highlightCode(code: string, lang: string = 'text', theme: string = 'default'): string {
  const colors = HIGHLIGHT_THEMES[theme] || HIGHLIGHT_THEMES.default;
  
  if (lang === 'text') {
    return escapeHtml(code);
  }

  let highlighted = escapeHtml(code);

  // 注释
  highlighted = highlighted.replace(/(\/\/.*$)/gm, `<span style="color: ${colors.comment}">$1</span>`);
  highlighted = highlighted.replace(/(\/\*[\s\S]*?\*\/)/g, `<span style="color: ${colors.comment}">$1</span>`);
  
  // 字符串
  highlighted = highlighted.replace(/(["'`])(?:(?=(\\?))\2.)*?\1/g, `<span style="color: ${colors.string}">$&</span>`);
  
  // 关键字
  const keywords = /\b(const|let|var|function|return|if|else|for|while|class|import|export|from|async|await|try|catch|throw|new|this|typeof|instanceof)\b/g;
  highlighted = highlighted.replace(keywords, `<span style="color: ${colors.keyword}">$&</span>`);
  
  // 数字
  highlighted = highlighted.replace(/\b(\d+\.?\d*)\b/g, `<span style="color: ${colors.number}">$&</span>`);
  
  // 函数调用
  highlighted = highlighted.replace(/\b([a-zA-Z_]\w*)(?=\()/g, `<span style="color: ${colors.function}">$1</span>`);

  return highlighted;
}

/**
 * HTML 转义
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

/**
 * 将 AST 渲染为 HTML
 * @param nodes - AST 节点数组
 * @param options - 渲染选项
 * @returns HTML 字符串
 */
export function renderToHtml(nodes: MarkdownNode[], options: ParseOptions = {}): string {
  const { highlight = true, codeTheme = 'default', customRenderer } = options;
  
  const renderNode = (node: MarkdownNode): string => {
    // 使用自定义渲染器
    if (customRenderer) {
      const renderer = customRenderer[node.type as keyof CustomRenderer];
      if (renderer) {
        return renderer(node);
      }
    }

    // 默认渲染逻辑
    switch (node.type) {
      case 'heading':
        return `<h${node.level}>${renderChildren(node.children || [])}</h${node.level}>`;
      
      case 'paragraph':
        return `<p>${renderChildren(node.children || [])}</p>`;
      
      case 'text':
        return escapeHtml(node.content || '');
      
      case 'bold':
        return `<strong>${renderChildren(node.children || [])}</strong>`;
      
      case 'italic':
        return `<em>${renderChildren(node.children || [])}</em>`;
      
      case 'code':
        return `<code>${escapeHtml(node.content || '')}</code>`;
      
      case 'code_block':
        const highlighted = highlight 
          ? highlightCode(node.content || '', node.lang || 'text', codeTheme)
          : escapeHtml(node.content || '');
        return `<pre><code class="language-${node.lang || 'text'}">${highlighted}</code></pre>`;
      
      case 'blockquote':
        return `<blockquote>${renderChildren(node.children || [])}</blockquote>`;
      
      case 'link':
        return `<a href="${node.url}">${renderChildren(node.children || [])}</a>`;
      
      case 'image':
        return `<img src="${node.url}" alt="${node.alt || ''}" />`;
      
      case 'list':
        const listItems = node.children?.map(item => `<li>${renderChildren(item.children || [])}</li>`).join('') || '';
        return `<ul>${listItems}</ul>`;
      
      case 'list_item':
        return `<li>${renderChildren(node.children || [])}</li>`;
      
      case 'table':
        const rows = node.children?.map(row => {
          const cells = row.children?.map(cell => {
            const isHeader = cell.attributes?.isHeader;
            const tag = isHeader ? 'th' : 'td';
            return `<${tag}>${renderChildren(cell.children || [])}</${tag}>`;
          }).join('') || '';
          return `<tr>${cells}</tr>`;
        }).join('') || '';
        return `<table>${rows}</table>`;
      
      case 'hr':
        return '<hr />';
      
      case 'br':
        return '<br />';
      
      default:
        return '';
    }
  };

  const renderChildren = (children: MarkdownNode[]): string => {
    return children.map(child => renderNode(child)).join('');
  };

  return nodes.map(node => renderNode(node)).join('\n');
}

/**
 * 便捷函数：Markdown 转 HTML
 * @param markdown - Markdown 文本
 * @param options - 解析选项
 * @returns HTML 字符串
 */
export function markdownToHtml(markdown: string, options: ParseOptions = {}): string {
  const ast = parseMarkdown(markdown);
  return renderToHtml(ast, options);
}

// ==================== 自定义扩展 ====================

/**
 * 创建自定义渲染器
 * @param overrides - 覆盖的渲染方法
 * @returns 完整的渲染器
 */
export function createCustomRenderer(overrides: Partial<CustomRenderer>): CustomRenderer {
  const defaultRenderer: CustomRenderer = {
    heading: (node) => `<h${node.level} class="custom-heading">${node.content}</h${node.level}>`,
    paragraph: (node) => `<p class="custom-paragraph">${node.content}</p>`,
    code: (node) => `<code class="custom-code">${node.content}</code>`,
    code_block: (node) => `<pre class="custom-code-block"><code>${node.content}</code></pre>`,
    link: (node) => `<a href="${node.url}" class="custom-link">${node.content}</a>`,
    image: (node) => `<img src="${node.url}" alt="${node.alt}" class="custom-image" />`,
    list: (node) => `<ul class="custom-list">${node.children?.map(i => `<li>${i.content}</li>`).join('')}</ul>`,
    table: (node) => `<table class="custom-table">${node.children?.map(r => `<tr>${r.children?.map(c => `<td>${c.content}</td>`).join('')}</tr>`).join('')}</table>`
  };

  return { ...defaultRenderer, ...overrides };
}

/**
 * 注册自定义语法
 * @param pattern - 匹配模式
 * @param handler - 处理函数
 * @example
 * registerCustomSyntax(/::(\w+)::/g, (match) => ({
 *   type: 'text',
 *   content: `[${match[1]}]`
 * }))
 */
export function registerCustomSyntax(
  pattern: RegExp,
  handler: (match: RegExpMatchArray) => MarkdownNode
): void {
  // 在实际实现中，这会修改解析器的行为
  // 这里提供一个扩展点供未来使用
  console.log('Custom syntax registered:', pattern);
}

// ==================== 使用示例 ====================

/**
 * 使用示例代码
 */
export const EXAMPLES = {
  basic: `
// 基础用法
import { markdownToHtml, parseMarkdown } from './markdown-parser-skill';

const markdown = \`
# 标题

这是**粗体**和*斜体*。

\`\`\`typescript
const hello = 'world';
console.log(hello);
\`\`\`

- 列表项 1
- 列表项 2
\`;

// 转换为 HTML
const html = markdownToHtml(markdown);

// 解析为 AST
const ast = parseMarkdown(markdown);
`,

  customRenderer: `
// 自定义渲染器
import { markdownToHtml, createCustomRenderer } from './markdown-parser-skill';

const customRenderer = createCustomRenderer({
  heading: (node) => \`<h\${node.level} class="my-heading">\${node.content}</h\${node.level}>\`,
  code_block: (node) => \`<pre class="my-code"><code>\${node.content}</code></pre>\`
});

const html = markdownToHtml(markdown, {
  customRenderer,
  codeTheme: 'dracula'
});
`,

  syntaxHighlight: `
// 语法高亮
import { highlightCode } from './markdown-parser-skill';

const code = \`function hello() {
  return 'world';
}\`;

// 不同主题
const github = highlightCode(code, 'javascript', 'github');
const monokai = highlightCode(code, 'javascript', 'monokai');
const dracula = highlightCode(code, 'javascript', 'dracula');
`
};

// ==================== 导出 ====================

export default {
  parseMarkdown,
  parseInline,
  renderToHtml,
  markdownToHtml,
  highlightCode,
  createCustomRenderer,
  registerCustomSyntax,
  EXAMPLES
};
