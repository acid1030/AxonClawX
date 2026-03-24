/**
 * HTML 解析技能 - HTML Parser Skill (ACE)
 * 
 * 功能:
 * 1. HTML 解析与 DOM 树构建
 * 2. CSS 选择器查询 (支持复杂选择器)
 * 3. 数据提取 (文本/属性/HTML)
 * 
 * @author Axon
 * @version 1.0.0
 * @module ACE (Axon Core Engine)
 */

// ============== 类型定义 ==============

/**
 * HTML 节点类型
 */
export type NodeType = 'element' | 'text' | 'comment' | 'document';

/**
 * HTML 节点接口
 */
export interface HTMLNode {
  /** 节点类型 */
  type: NodeType;
  /** 标签名 (仅 element 类型) */
  tagName?: string;
  /** 属性集合 (仅 element 类型) */
  attributes?: Record<string, string>;
  /** 文本内容 (仅 text 类型) */
  textContent?: string;
  /** 子节点 */
  children: HTMLNode[];
  /** 父节点引用 */
  parent?: HTMLNode;
}

/**
 * CSS 选择器查询结果
 */
export interface QueryResult {
  /** 匹配的节点列表 */
  nodes: HTMLNode[];
  /** 匹配数量 */
  count: number;
}

/**
 * 数据提取选项
 */
export interface ExtractOptions {
  /** 提取文本内容 */
  text?: boolean;
  /** 提取 HTML 内容 */
  html?: boolean;
  /** 提取指定属性 */
  attributes?: string[];
  /** 提取所有属性 */
  allAttributes?: boolean;
  /** 是否包含子节点 */
  includeChildren?: boolean;
  /** 是否修剪文本空白 */
  trim?: boolean;
}

/**
 * 提取的数据项
 */
export interface ExtractedData {
  /** 标签名 */
  tagName?: string;
  /** 文本内容 */
  text?: string;
  /** HTML 内容 */
  html?: string;
  /** 属性集合 */
  attributes?: Record<string, string>;
  /** 子节点数据 */
  children?: ExtractedData[];
}

/**
 * 表格数据提取结果
 */
export interface TableData {
  /** 表头 */
  headers: string[];
  /** 数据行 */
  rows: string[][];
  /** 完整数据 (对象数组) */
  data: Record<string, string>[];
}

/**
 * 链接数据
 */
export interface LinkData {
  /** 链接文本 */
  text: string;
  /** 链接地址 */
  href: string;
  /** 链接标题 */
  title?: string;
  /** 是否外部链接 */
  isExternal: boolean;
}

/**
 * 图片数据
 */
export interface ImageData {
  /** 图片地址 */
  src: string;
  /** 替代文本 */
  alt: string;
  /** 图片标题 */
  title?: string;
  /** 宽度 */
  width?: string;
  /** 高度 */
  height?: string;
}

/**
 * HTML 解析器配置
 */
export interface HTMLParserConfig {
  /** 是否保留注释 */
  keepComments?: boolean;
  /** 是否保留空白文本节点 */
  keepWhitespace?: boolean;
  /** 是否自动修复 HTML */
  autoFix?: boolean;
  /** 默认编码 */
  encoding?: string;
}

// ============== HTML 解析器实现 ==============

/**
 * HTML 解析器类
 */
export class HTMLParser {
  private config: HTMLParserConfig;
  private document?: HTMLNode;

  constructor(config: HTMLParserConfig = {}) {
    this.config = {
      keepComments: false,
      keepWhitespace: false,
      autoFix: true,
      encoding: 'utf-8',
      ...config,
    };
  }

  /**
   * 解析 HTML 字符串
   * @param html HTML 字符串
   * @returns 文档根节点
   */
  parse(html: string): HTMLNode {
    const root: HTMLNode = {
      type: 'document',
      children: [],
    };
    this.document = root;

    // 简化的 HTML 解析 (生产环境建议使用 jsdom 或 parse5)
    const cleaned = html.trim();
    this.parseNode(cleaned, root);

    return root;
  }

  /**
   * 递归解析节点
   */
  private parseNode(html: string, parent: HTMLNode): void {
    if (!html) return;

    // 匹配标签正则
    const tagRegex = /<(\/?)([\w-]+)([^>]*?)(\/?)>/g;
    let lastIndex = 0;
    let match;

    while ((match = tagRegex.exec(html)) !== null) {
      const [fullMatch, closingSlash, tagName, attributes, selfClosing] = match;
      const matchIndex = match.index;

      // 处理标签前的文本
      if (matchIndex > lastIndex) {
        const textContent = html.substring(lastIndex, matchIndex);
        if (textContent.trim() || this.config.keepWhitespace) {
          const textNode: HTMLNode = {
            type: 'text',
            textContent,
            children: [],
            parent,
          };
          parent.children.push(textNode);
        }
      }

      // 处理开始标签
      if (!closingSlash) {
        const elementNode: HTMLNode = {
          type: 'element',
          tagName: tagName.toLowerCase(),
          attributes: this.parseAttributes(attributes),
          children: [],
          parent,
        };
        parent.children.push(elementNode);

        // 如果是自闭合标签或 void 元素，不解析子节点
        const voidElements = ['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'];
        if (selfClosing === '/' || voidElements.includes(tagName.toLowerCase())) {
          // void 元素，无子节点
        } else {
          // 查找对应的结束标签
          const closeTagRegex = new RegExp(`</${tagName}\\s*>`, 'i');
          const closeMatch = closeTagRegex.exec(html.substring(tagRegex.lastIndex));
          
          if (closeMatch) {
            const innerHTML = html.substring(tagRegex.lastIndex, tagRegex.lastIndex + closeMatch.index);
            this.parseNode(innerHTML, elementNode);
            tagRegex.lastIndex += closeMatch.index + closeMatch[0].length;
          }
        }
      }

      lastIndex = tagRegex.lastIndex;
    }

    // 处理剩余文本
    if (lastIndex < html.length) {
      const textContent = html.substring(lastIndex);
      if (textContent.trim() || this.config.keepWhitespace) {
        const textNode: HTMLNode = {
          type: 'text',
          textContent,
          children: [],
          parent,
        };
        parent.children.push(textNode);
      }
    }
  }

  /**
   * 解析属性字符串
   */
  private parseAttributes(attrString: string): Record<string, string> {
    const attributes: Record<string, string> = {};
    const attrRegex = /([\w-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
    let match;

    while ((match = attrRegex.exec(attrString)) !== null) {
      const [, name, doubleQuoted, singleQuoted, unquoted] = match;
      attributes[name] = doubleQuoted || singleQuoted || unquoted || '';
    }

    return attributes;
  }

  /**
   * CSS 选择器查询
   * @param selector CSS 选择器
   * @param context 上下文节点 (可选，默认为文档根节点)
   * @returns 查询结果
   */
  querySelectorAll(selector: string, context?: HTMLNode): QueryResult {
    const root = context || this.document;
    if (!root) {
      throw new Error('未找到文档根节点，请先调用 parse()');
    }

    const nodes: HTMLNode[] = [];
    const selectors = selector.split(',').map(s => s.trim());

    for (const sel of selectors) {
      this.matchSelector(root, sel, nodes);
    }

    return {
      nodes,
      count: nodes.length,
    };
  }

  /**
   * 匹配单个选择器
   */
  private matchSelector(node: HTMLNode, selector: string, results: HTMLNode[]): void {
    if (node.type === 'element') {
      if (this.testSelector(node, selector)) {
        results.push(node);
      }
    }

    // 递归子节点
    for (const child of node.children) {
      this.matchSelector(child, selector, results);
    }
  }

  /**
   * 测试节点是否匹配选择器
   */
  private testSelector(node: HTMLNode, selector: string): boolean {
    if (node.type !== 'element' || !node.tagName) return false;

    // 简化版选择器匹配 (支持：标签名、.class、#id、[attr]、[attr=value])
    const parts = selector.split(/(?=[.#\[])/);
    
    for (const part of parts) {
      if (!part) continue;

      if (part.startsWith('.')) {
        // 类选择器
        const className = part.slice(1);
        const nodeClasses = (node.attributes?.class || '').split(/\s+/);
        if (!nodeClasses.includes(className)) return false;
      } else if (part.startsWith('#')) {
        // ID 选择器
        const id = part.slice(1);
        if (node.attributes?.id !== id) return false;
      } else if (part.startsWith('[')) {
        // 属性选择器
        const attrMatch = part.match(/^\[([\w-]+)(?:([*^$|~]?)=(['"]?)(.*?)\3)?\]$/);
        if (attrMatch) {
          const [, attrName, operator, , attrValue] = attrMatch;
          const nodeValue = node.attributes?.[attrName];
          
          if (nodeValue === undefined) return false;
          if (operator && attrValue) {
            switch (operator) {
              case '=': if (nodeValue !== attrValue) return false; break;
              case '*=': if (!nodeValue.includes(attrValue)) return false; break;
              case '^=': if (!nodeValue.startsWith(attrValue)) return false; break;
              case '$=': if (!nodeValue.endsWith(attrValue)) return false; break;
              case '~=': if (!nodeValue.split(/\s+/).includes(attrValue)) return false; break;
            }
          }
        }
      } else {
        // 标签名选择器
        if (part !== '*' && node.tagName !== part.toLowerCase()) return false;
      }
    }

    return true;
  }

  /**
   * 查询单个元素
   */
  querySelector(selector: string, context?: HTMLNode): HTMLNode | null {
    const result = this.querySelectorAll(selector, context);
    return result.count > 0 ? result.nodes[0] : null;
  }

  /**
   * 提取数据
   * @param selector CSS 选择器
   * @param options 提取选项
   * @returns 提取的数据
   */
  extract(selector: string, options: ExtractOptions = {}): ExtractedData[] {
    const result = this.querySelectorAll(selector);
    const extracted: ExtractedData[] = [];

    for (const node of result.nodes) {
      const data: ExtractedData = {};

      if (node.type === 'element') {
        data.tagName = node.tagName;

        if (options.text) {
          data.text = this.getTextContent(node, options.trim !== false);
        }

        if (options.html) {
          data.html = this.getInnerHTML(node);
        }

        if (options.allAttributes && node.attributes) {
          data.attributes = { ...node.attributes };
        } else if (options.attributes && node.attributes) {
          data.attributes = {};
          for (const attr of options.attributes) {
            if (node.attributes[attr] !== undefined) {
              data.attributes[attr] = node.attributes[attr];
            }
          }
        }

        if (options.includeChildren && node.children) {
          data.children = node.children
            .filter(child => child.type === 'element')
            .map(child => this.extractFromNode(child, options));
        }
      }

      extracted.push(data);
    }

    return extracted;
  }

  /**
   * 从节点提取数据
   */
  private extractFromNode(node: HTMLNode, options: ExtractOptions): ExtractedData {
    const data: ExtractedData = {};

    if (node.type === 'element') {
      data.tagName = node.tagName;

      if (options.text) {
        data.text = this.getTextContent(node, options.trim !== false);
      }

      if (options.html) {
        data.html = this.getInnerHTML(node);
      }

      if (options.allAttributes && node.attributes) {
        data.attributes = { ...node.attributes };
      }
    }

    return data;
  }

  /**
   * 获取文本内容
   */
  getTextContent(node: HTMLNode, trim: boolean = true): string {
    if (node.type === 'text') {
      return trim ? node.textContent?.trim() || '' : node.textContent || '';
    }

    const texts: string[] = [];
    for (const child of node.children) {
      texts.push(this.getTextContent(child, trim));
    }

    return texts.join(' ').replace(/\s+/g, ' ');
  }

  /**
   * 获取内部 HTML
   */
  getInnerHTML(node: HTMLNode): string {
    if (node.type === 'text') {
      return node.textContent || '';
    }

    const parts: string[] = [];
    for (const child of node.children) {
      if (child.type === 'element' && child.tagName) {
        const attrs = child.attributes
          ? Object.entries(child.attributes)
              .map(([k, v]) => `${k}="${v}"`)
              .join(' ')
          : '';
        const attrStr = attrs ? ' ' + attrs : '';
        parts.push(`<${child.tagName}${attrStr}>${this.getInnerHTML(child)}</${child.tagName}>`);
      } else if (child.type === 'text') {
        parts.push(child.textContent || '');
      }
    }

    return parts.join('');
  }

  /**
   * 提取表格数据
   * @param selector 表格选择器 (可选)
   * @returns 表格数据
   */
  extractTable(selector: string = 'table'): TableData {
    const tables = this.querySelectorAll(selector);
    if (tables.count === 0) {
      return { headers: [], rows: [], data: [] };
    }

    const table = tables.nodes[0];
    const headers: string[] = [];
    const rows: string[][] = [];

    // 提取表头
    const thNodes = this.querySelectorAll('th', table);
    for (const th of thNodes.nodes) {
      headers.push(this.getTextContent(th));
    }

    // 提取数据行
    const trNodes = this.querySelectorAll('tr', table);
    let isHeaderRow = true;

    for (const tr of trNodes.nodes) {
      const cells: string[] = [];
      const tdNodes = this.querySelectorAll('td, th', tr);
      
      for (const cell of tdNodes.nodes) {
        cells.push(this.getTextContent(cell));
      }

      if (cells.length > 0) {
        if (isHeaderRow && headers.length === 0) {
          headers.push(...cells);
        } else {
          rows.push(cells);
        }
        isHeaderRow = false;
      }
    }

    // 转换为对象数组
    const data: Record<string, string>[] = rows.map(row => {
      const obj: Record<string, string> = {};
      headers.forEach((header, index) => {
        obj[header] = row[index] || '';
      });
      return obj;
    });

    return { headers, rows, data };
  }

  /**
   * 提取所有链接
   * @param selector 链接选择器 (可选)
   * @param baseUrl 基础 URL (用于判断外部链接)
   * @returns 链接数据列表
   */
  extractLinks(selector: string = 'a', baseUrl?: string): LinkData[] {
    const links = this.querySelectorAll(selector);
    const linkData: LinkData[] = [];

    for (const link of links.nodes) {
      if (link.type !== 'element' || link.tagName !== 'a') continue;

      const href = link.attributes?.href || '';
      const text = this.getTextContent(link);
      const title = link.attributes?.title;

      let isExternal = false;
      if (baseUrl && href) {
        try {
          const url = new URL(href, baseUrl);
          const base = new URL(baseUrl);
          isExternal = url.hostname !== base.hostname;
        } catch {
          isExternal = href.startsWith('http');
        }
      }

      linkData.push({ text, href, title, isExternal });
    }

    return linkData;
  }

  /**
   * 提取所有图片
   * @param selector 图片选择器 (可选)
   * @returns 图片数据列表
   */
  extractImages(selector: string = 'img'): ImageData[] {
    const images = this.querySelectorAll(selector);
    const imageData: ImageData[] = [];

    for (const img of images.nodes) {
      if (img.type !== 'element' || img.tagName !== 'img') continue;

      imageData.push({
        src: img.attributes?.src || '',
        alt: img.attributes?.alt || '',
        title: img.attributes?.title,
        width: img.attributes?.width,
        height: img.attributes?.height,
      });
    }

    return imageData;
  }
}

// ============== 便捷函数 ==============

/**
 * 快速解析 HTML
 * @param html HTML 字符串
 * @returns HTML 解析器实例
 */
export function parseHTML(html: string, config?: HTMLParserConfig): HTMLParser {
  const parser = new HTMLParser(config);
  parser.parse(html);
  return parser;
}

/**
 * 快速查询元素
 * @param html HTML 字符串
 * @param selector CSS 选择器
 * @returns 查询结果
 */
export function queryHTML(html: string, selector: string): QueryResult {
  const parser = parseHTML(html);
  return parser.querySelectorAll(selector);
}

/**
 * 快速提取文本
 * @param html HTML 字符串
 * @param selector CSS 选择器
 * @returns 文本内容
 */
export function extractText(html: string, selector: string): string[] {
  const parser = parseHTML(html);
  const result = parser.extract(selector, { text: true });
  return result.map(item => item.text || '');
}

/**
 * 快速提取属性
 * @param html HTML 字符串
 * @param selector CSS 选择器
 * @param attributeName 属性名
 * @returns 属性值列表
 */
export function extractAttribute(html: string, selector: string, attributeName: string): string[] {
  const parser = parseHTML(html);
  const result = parser.extract(selector, { attributes: [attributeName] });
  return result.map(item => item.attributes?.[attributeName] || '');
}

// ============== 导出 ==============

export default HTMLParser;
