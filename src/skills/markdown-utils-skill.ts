/**
 * Markdown 工具技能 - Markdown Utils Skill (ACE)
 * 
 * 功能:
 * 1. Markdown 解析为 HTML
 * 2. Markdown 生成
 * 3. 提取标题/链接
 * 
 * @author Axon
 * @version 1.0.0
 * @module ACE (Axon Core Engine)
 */

// ============== 类型定义 ==============

/**
 * Markdown 转 HTML 结果
 */
export interface MarkdownToHtmlResult {
  /** HTML 内容 */
  html: string;
  /** 转换耗时 (ms) */
  duration: number;
  /** 字符数 */
  charCount: number;
  /** 错误信息 */
  errors: string[];
}

/**
 * 标题信息
 */
export interface HeadingInfo {
  /** 标题级别 (1-6) */
  level: number;
  /** 标题文本 */
  text: string;
  /** 行号 (从 1 开始) */
  line: number;
  /** 锚点 ID */
  id: string;
}

/**
 * 链接信息
 */
export interface LinkInfo {
  /** 链接文本 */
  text: string;
  /** 链接 URL */
  url: string;
  /** 标题 (可选) */
  title?: string;
  /** 行号 (从 1 开始) */
  line: number;
  /** 是否为图片链接 */
  isImage: boolean;
}

/**
 * 提取结果
 */
export interface ExtractResult {
  /** 标题列表 */
  headings: HeadingInfo[];
  /** 链接列表 */
  links: LinkInfo[];
  /** 提取耗时 (ms) */
  duration: number;
}

/**
 * Markdown 解析选项
 */
export interface ParseOptions {
  /** 是否解析 GFM (GitHub Flavored Markdown) */
  gfm?: boolean;
  /** 是否解析表格 */
  tables?: boolean;
  /** 是否解析删除线 */
  strikethrough?: boolean;
  /** 是否启用自动换行 */
  breaks?: boolean;
}

/**
 * HTML 渲染选项
 */
export interface RenderOptions {
  /** 是否美化输出 (添加缩进和换行) */
  pretty?: boolean;
  /** 缩进字符串 */
  indent?: string;
  /** 是否为标题添加锚点 */
  headingAnchors?: boolean;
}

// ============== Markdown 解析器 ==============

/**
 * Markdown 解析器类
 */
class MarkdownParser {
  private options: Required<ParseOptions>;

  constructor(options: ParseOptions = {}) {
    this.options = {
      gfm: options.gfm ?? true,
      tables: options.tables ?? true,
      strikethrough: options.strikethrough ?? true,
      breaks: options.breaks ?? true,
    };
  }

  /**
   * 解析 Markdown 为 HTML
   */
  parse(markdown: string, renderOptions: RenderOptions = {}): MarkdownToHtmlResult {
    const startTime = performance.now();
    const errors: string[] = [];
    
    try {
      const html = this.parseToHtml(markdown, renderOptions);
      const duration = performance.now() - startTime;
      
      return {
        html,
        duration,
        charCount: html.length,
        errors,
      };
    } catch (error) {
      errors.push(error instanceof Error ? error.message : 'Unknown error');
      return {
        html: '',
        duration: performance.now() - startTime,
        charCount: 0,
        errors,
      };
    }
  }

  /**
   * 核心解析逻辑
   */
  private parseToHtml(markdown: string, options: RenderOptions): string {
    const lines = markdown.split('\n');
    const htmlLines: string[] = [];
    let inCodeBlock = false;
    let codeBlockLang = '';
    let codeBlockContent: string[] = [];
    let inList = false;
    let listType: 'ul' | 'ol' = 'ul';

    const flushCodeBlock = () => {
      if (inCodeBlock) {
        htmlLines.push(`<pre><code class="language-${codeBlockLang}">${this.escapeHtml(codeBlockContent.join('\n'))}</code></pre>`);
        inCodeBlock = false;
        codeBlockLang = '';
        codeBlockContent = [];
      }
    };

    const closeList = () => {
      if (inList) {
        htmlLines.push(listType === 'ul' ? '</ul>' : '</ol>');
        inList = false;
      }
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      // 代码块处理
      if (trimmed.startsWith('```')) {
        if (!inCodeBlock) {
          flushCodeBlock();
          closeList();
          inCodeBlock = true;
          codeBlockLang = trimmed.slice(3).trim() || 'text';
        } else {
          flushCodeBlock();
        }
        continue;
      }

      if (inCodeBlock) {
        codeBlockContent.push(line);
        continue;
      }

      // 空行
      if (trimmed === '') {
        closeList();
        continue;
      }

      // 标题
      const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
      if (headingMatch) {
        closeList();
        const level = headingMatch[1].length;
        const text = this.parseInline(headingMatch[2]);
        const id = this.generateId(headingMatch[2]);
        if (options.headingAnchors) {
          htmlLines.push(`<h${level} id="${id}"><a href="#${id}" class="heading-link">#</a>${text}</h${level}>`);
        } else {
          htmlLines.push(`<h${level}>${text}</h${level}>`);
        }
        continue;
      }

      // 无序列表
      const ulMatch = trimmed.match(/^[-*+]\s+(.+)$/);
      if (ulMatch) {
        if (!inList) {
          listType = 'ul';
          htmlLines.push('<ul>');
          inList = true;
        }
        htmlLines.push(`<li>${this.parseInline(ulMatch[1])}</li>`);
        continue;
      }

      // 有序列表
      const olMatch = trimmed.match(/^\d+\.\s+(.+)$/);
      if (olMatch) {
        if (!inList) {
          listType = 'ol';
          htmlLines.push('<ol>');
          inList = true;
        }
        htmlLines.push(`<li>${this.parseInline(olMatch[1])}</li>`);
        continue;
      }

      // 块引用
      if (trimmed.startsWith('>')) {
        closeList();
        const quoteText = trimmed.slice(1).trim();
        htmlLines.push(`<blockquote>${this.parseInline(quoteText)}</blockquote>`);
        continue;
      }

      // 水平线
      if (/^([-*_]){3,}$/.test(trimmed)) {
        closeList();
        htmlLines.push('<hr>');
        continue;
      }

      // 表格
      if (trimmed.includes('|') && trimmed.startsWith('|')) {
        closeList();
        const cells = trimmed.split('|').filter((_, i, arr) => i > 0 && i < arr.length - 1);
        if (cells.every(cell => /^[\s|:\-]+$/.test(cell.trim()))) {
          continue; // 分隔线行
        }
        const rowHtml = cells.map(cell => `<td>${this.parseInline(cell.trim())}</td>`).join('');
        htmlLines.push(`<tr>${rowHtml}</tr>`);
        continue;
      }

      // 普通段落
      closeList();
      htmlLines.push(`<p>${this.parseInline(trimmed)}</p>`);
    }

    flushCodeBlock();
    closeList();

    const html = options.pretty 
      ? htmlLines.join('\n')
      : htmlLines.join('');

    return html;
  }

  /**
   * 解析行内元素
   */
  private parseInline(text: string): string {
    // 转义 HTML
    text = this.escapeHtml(text);

    // 粗体 **text**
    text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

    // 斜体 *text*
    text = text.replace(/\*(.+?)\*/g, '<em>$1</em>');

    // 删除线 ~~text~~
    if (this.options.strikethrough) {
      text = text.replace(/~~(.+?)~~/g, '<del>$1</del>');
    }

    // 行内代码 `code`
    text = text.replace(/`([^`]+)`/g, '<code>$1</code>');

    // 图片 ![alt](url)
    text = text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1">');

    // 链接 [text](url)
    text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

    // 自动链接
    if (this.options.gfm) {
      text = text.replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1">$1</a>');
    }

    return text;
  }

  /**
   * 生成锚点 ID
   */
  private generateId(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }

  /**
   * HTML 转义
   */
  private escapeHtml(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    return text.replace(/[&<>"']/g, char => map[char]);
  }
}

// ============== Markdown 生成器 ==============

/**
 * Markdown 生成器类
 */
class MarkdownGenerator {
  private indentSize: number;

  constructor(indentSize: number = 2) {
    this.indentSize = indentSize;
  }

  /**
   * 生成标题
   */
  heading(text: string, level: number = 1): string {
    if (level < 1 || level > 6) {
      throw new Error('Heading level must be between 1 and 6');
    }
    return `${'#'.repeat(level)} ${text}`;
  }

  /**
   * 生成段落
   */
  paragraph(text: string): string {
    return text;
  }

  /**
   * 生成粗体
   */
  bold(text: string): string {
    return `**${text}**`;
  }

  /**
   * 生成斜体
   */
  italic(text: string): string {
    return `*${text}*`;
  }

  /**
   * 生成删除线
   */
  strikethrough(text: string): string {
    return `~~${text}~~`;
  }

  /**
   * 生成行内代码
   */
  inlineCode(code: string): string {
    return `\`${code}\``;
  }

  /**
   * 生成代码块
   */
  codeBlock(code: string, language: string = 'text'): string {
    return `\`\`\`${language}\n${code}\n\`\`\``;
  }

  /**
   * 生成链接
   */
  link(text: string, url: string, title?: string): string {
    if (title) {
      return `[${text}](${url} "${title}")`;
    }
    return `[${text}](${url})`;
  }

  /**
   * 生成图片
   */
  image(alt: string, url: string, title?: string): string {
    if (title) {
      return `![${alt}](${url} "${title}")`;
    }
    return `![${alt}](${url})`;
  }

  /**
   * 生成无序列表
   */
  unorderedList(items: string[], marker: '-' | '*' | '+' = '-'): string {
    return items.map(item => `${marker} ${item}`).join('\n');
  }

  /**
   * 生成有序列表
   */
  orderedList(items: string[], start: number = 1): string {
    return items
      .map((item, index) => `${start + index}. ${item}`)
      .join('\n');
  }

  /**
   * 生成块引用
   */
  blockquote(text: string): string {
    return text
      .split('\n')
      .map(line => `> ${line}`)
      .join('\n');
  }

  /**
   * 生成水平线
   */
  horizontalRule(marker: '-' | '*' | '_' = '-'): string {
    return marker.repeat(3);
  }

  /**
   * 生成表格
   */
  table(headers: string[], rows: string[][], align?: ('left' | 'center' | 'right')[]): string {
    const escapePipe = (text: string) => text.replace(/\|/g, '\\|');
    
    const headerRow = `| ${headers.map(escapePipe).join(' | ')} |`;
    
    const alignMarkers = align || headers.map(() => 'left');
    const separator = `| ${alignMarkers.map(a => {
      switch (a) {
        case 'center': return ':---:';
        case 'right': return '---:';
        default: return '---';
      }
    }).join(' | ')} |`;
    
    const dataRows = rows.map(row => 
      `| ${row.map(escapePipe).join(' | ')} |`
    );
    
    return [headerRow, separator, ...dataRows].join('\n');
  }

  /**
   * 生成任务列表
   */
  taskList(tasks: Array<{ text: string; done: boolean }>): string {
    return tasks
      .map(task => `- [${task.done ? 'x' : ' '}] ${task.text}`)
      .join('\n');
  }

  /**
   * 生成完整文档
   */
  document(sections: Array<{
    title?: string;
    level?: number;
    content: string;
  }>): string {
    return sections
      .map(section => {
        const parts: string[] = [];
        if (section.title) {
          parts.push(this.heading(section.title, section.level || 1));
        }
        parts.push(section.content);
        return parts.join('\n\n');
      })
      .join('\n\n');
  }
}

// ============== 提取器 ==============

/**
 * 提取标题和链接
 */
function extractHeadingsAndLinks(markdown: string): ExtractResult {
  const startTime = performance.now();
  const headings: HeadingInfo[] = [];
  const links: LinkInfo[] = [];
  const lines = markdown.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;

    // 提取标题
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const text = headingMatch[2].trim();
      headings.push({
        level,
        text,
        line: lineNum,
        id: text
          .toLowerCase()
          .replace(/[^\w\s-]/g, '')
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-')
          .trim(),
      });
    }

    // 提取链接 (不包括图片)
    Array.from(line.matchAll(/\[([^\]]+)\]\(([^)]+)\)/g)).forEach(match => {
      // 检查是否是图片链接
      const isImage = line.includes(`![${match[1]}](${match[2]})`);
      if (!isImage) {
        links.push({
          text: match[1],
          url: match[2].split('"')[0].trim(), // 移除可能的 title
          title: match[2].includes('"') ? match[2].split('"')[1] : undefined,
          line: lineNum,
          isImage: false,
        });
      }
    });

    // 提取图片链接
    Array.from(line.matchAll(/!\[([^\]]*)\]\(([^)]+)\)/g)).forEach(match => {
      links.push({
        text: match[1],
        url: match[2].split('"')[0].trim(),
        title: match[2].includes('"') ? match[2].split('"')[1] : undefined,
        line: lineNum,
        isImage: true,
      });
    });
  }

  return {
    headings,
    links,
    duration: performance.now() - startTime,
  };
}

// ============== 便捷函数 ==============

const parser = new MarkdownParser();
const generator = new MarkdownGenerator();

/**
 * Markdown 转 HTML
 * 
 * @param markdown Markdown 文本
 * @param parseOptions 解析选项
 * @param renderOptions 渲染选项
 * @returns 转换结果
 */
export function markdownToHtml(
  markdown: string,
  parseOptions: ParseOptions = {},
  renderOptions: RenderOptions = {}
): MarkdownToHtmlResult {
  return parser.parse(markdown, renderOptions);
}

/**
 * 生成 Markdown 标题
 * 
 * @param text 标题文本
 * @param level 标题级别 (1-6)
 * @returns Markdown 标题字符串
 */
export function generateHeading(text: string, level: number = 1): string {
  return generator.heading(text, level);
}

/**
 * 生成 Markdown 代码块
 * 
 * @param code 代码内容
 * @param language 编程语言
 * @returns Markdown 代码块字符串
 */
export function generateCodeBlock(code: string, language: string = 'text'): string {
  return generator.codeBlock(code, language);
}

/**
 * 生成 Markdown 链接
 * 
 * @param text 链接文本
 * @param url 链接地址
 * @param title 链接标题 (可选)
 * @returns Markdown 链接字符串
 */
export function generateLink(text: string, url: string, title?: string): string {
  return generator.link(text, url, title);
}

/**
 * 生成 Markdown 表格
 * 
 * @param headers 表头
 * @param rows 数据行
 * @param align 对齐方式
 * @returns Markdown 表格字符串
 */
export function generateTable(
  headers: string[],
  rows: string[][],
  align?: ('left' | 'center' | 'right')[]
): string {
  return generator.table(headers, rows, align);
}

/**
 * 提取 Markdown 标题
 * 
 * @param markdown Markdown 文本
 * @returns 标题列表
 */
export function extractHeadings(markdown: string): HeadingInfo[] {
  return extractHeadingsAndLinks(markdown).headings;
}

/**
 * 提取 Markdown 链接
 * 
 * @param markdown Markdown 文本
 * @returns 链接列表
 */
export function extractLinks(markdown: string): LinkInfo[] {
  return extractHeadingsAndLinks(markdown).links;
}

/**
 * 提取标题和链接
 * 
 * @param markdown Markdown 文本
 * @returns 提取结果
 */
export function extractAll(markdown: string): ExtractResult {
  return extractHeadingsAndLinks(markdown);
}

/**
 * 生成完整 Markdown 文档
 * 
 * @param sections 文档章节
 * @returns Markdown 文档字符串
 */
export function generateDocument(
  sections: Array<{
    title?: string;
    level?: number;
    content: string;
  }>
): string {
  return generator.document(sections);
}

// ============== 导出类 ==============

export { MarkdownParser, MarkdownGenerator };
