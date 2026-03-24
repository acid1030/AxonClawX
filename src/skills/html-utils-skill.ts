/**
 * HTML 工具技能 - HTML Utils Skill (ACE)
 * 
 * 功能:
 * 1. HTML 解析 - 将 HTML 字符串解析为可操作的 DOM 树
 * 2. DOM 操作 - 查询、遍历、修改节点
 * 3. HTML 生成 - 从数据结构生成 HTML
 * 
 * @author Axon
 * @version 1.0.0
 * @module ACE (Axon Core Engine)
 */

// ============== 类型定义 ==============

/**
 * HTML 节点类型
 */
export type HTMLNodeType = 'element' | 'text' | 'comment' | 'document';

/**
 * HTML 节点接口
 */
export interface HTMLNode {
  /** 节点类型 */
  type: HTMLNodeType;
  /** 标签名 (仅 element 类型) */
  tagName?: string;
  /** 属性集合 (仅 element 类型) */
  attributes?: Record<string, string>;
  /** 文本内容 (仅 text 类型) */
  textContent?: string;
  /** 注释内容 (仅 comment 类型) */
  commentContent?: string;
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
  /** 链接 URL */
  href: string;
  /** 链接标题 */
  title?: string;
}

/**
 * 图片数据
 */
export interface ImageData {
  /** 图片 URL */
  src: string;
  /** 替代文本 */
  alt?: string;
  /** 图片标题 */
  title?: string;
}

/**
 * HTML 生成选项
 */
export interface GenerateOptions {
  /** 是否格式化输出 (缩进) */
  pretty?: boolean;
  /** 缩进字符串 */
  indent?: string;
  /** 是否包含 DOCTYPE */
  includeDoctype?: boolean;
  /** 是否自闭合空标签 */
  selfCloseEmpty?: boolean;
}

/**
 * DOM 操作结果
 */
export interface DOMOperationResult {
  /** 是否成功 */
  success: boolean;
  /** 受影响的节点数 */
  affectedCount: number;
  /** 错误信息 (如果有) */
  error?: string;
}

// ============== 空标签列表 ==============

const VOID_ELEMENTS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
  'link', 'meta', 'param', 'source', 'track', 'wbr'
]);

// ============== HTML 解析器 ==============

/**
 * HTML 解析器类
 */
export class HTMLParser {
  private html: string;
  private position: number;

  constructor(html: string) {
    this.html = html;
    this.position = 0;
  }

  /**
   * 解析 HTML 字符串
   */
  parse(): HTMLNode {
    const document: HTMLNode = {
      type: 'document',
      children: []
    };

    this.parseNodes(document);
    return document;
  }

  private parseNodes(parent: HTMLNode): void {
    while (this.position < this.html.length) {
      const char = this.html[this.position];

      if (char === '<') {
        if (this.html[this.position + 1] === '/') {
          // 结束标签
          return;
        } else if (this.html[this.position + 1] === '!') {
          // 注释或 DOCTYPE
          if (this.html.slice(this.position, this.position + 4) === '<!--') {
            const comment = this.parseComment();
            if (comment) parent.children.push(comment);
          } else if (this.html.slice(this.position, this.position + 9).toUpperCase() === '<!DOCTYPE') {
            this.parseDoctype();
          } else {
            this.position++;
          }
        } else {
          // 开始标签
          const element = this.parseElement();
          if (element) parent.children.push(element);
        }
      } else {
        // 文本节点
        const text = this.parseText();
        if (text && text.textContent?.trim()) {
          parent.children.push(text);
        }
      }
    }
  }

  private parseElement(): HTMLNode | null {
    if (this.html[this.position] !== '<') return null;

    this.position++; // 跳过 <

    // 解析标签名
    const tagName = this.parseTagName();
    if (!tagName) return null;

    const element: HTMLNode = {
      type: 'element',
      tagName: tagName.toLowerCase(),
      attributes: {},
      children: []
    };

    // 解析属性
    this.parseAttributes(element);

    // 跳过 >
    if (this.html[this.position] === '>') {
      this.position++;
    } else if (this.html[this.position] === '/' && this.html[this.position + 1] === '>') {
      // 自闭合标签
      this.position += 2;
      return element;
    }

    // 检查是否是空标签
    if (VOID_ELEMENTS.has(element.tagName!)) {
      return element;
    }

    // 解析子节点
    this.parseNodes(element);

    // 解析结束标签
    this.parseEndTag(tagName);

    return element;
  }

  private parseTagName(): string {
    let tagName = '';
    while (this.position < this.html.length) {
      const char = this.html[this.position];
      if (/[\s>\/]/.test(char)) break;
      tagName += char;
      this.position++;
    }
    return tagName;
  }

  private parseAttributes(element: HTMLNode): void {
    while (this.position < this.html.length) {
      // 跳过空白
      while (this.position < this.html.length && /\s/.test(this.html[this.position])) {
        this.position++;
      }

      const char = this.html[this.position];
      if (char === '>' || char === '/') break;

      // 解析属性名
      let attrName = '';
      while (this.position < this.html.length) {
        const c = this.html[this.position];
        if (/[\s=]/.test(c)) break;
        attrName += c;
        this.position++;
      }

      if (!attrName) break;

      // 跳过 = 前的空白
      while (this.position < this.html.length && /\s/.test(this.html[this.position])) {
        this.position++;
      }

      let attrValue = '';

      // 检查是否有 =
      if (this.html[this.position] === '=') {
        this.position++; // 跳过 =

        // 跳过 = 后的空白
        while (this.position < this.html.length && /\s/.test(this.html[this.position])) {
          this.position++;
        }

        // 解析属性值
        const quote = this.html[this.position];
        if (quote === '"' || quote === "'") {
          this.position++; // 跳过开引号
          while (this.position < this.html.length && this.html[this.position] !== quote) {
            attrValue += this.html[this.position];
            this.position++;
          }
          this.position++; // 跳过闭引号
        } else {
          // 无引号的属性值
          while (this.position < this.html.length && !/[\s>]/.test(this.html[this.position])) {
            attrValue += this.html[this.position];
            this.position++;
          }
        }
      }

      if (attrName) {
        element.attributes![attrName] = attrValue;
      }
    }
  }

  private parseEndTag(expectedTag: string): void {
    while (this.position < this.html.length) {
      if (this.html[this.position] === '<' && this.html[this.position + 1] === '/') {
        this.position += 2;
        let tagName = '';
        while (this.position < this.html.length && this.html[this.position] !== '>') {
          if (!/\s/.test(this.html[this.position])) {
            tagName += this.html[this.position];
          }
          this.position++;
        }
        this.position++; // 跳过 >
        if (tagName.toLowerCase() === expectedTag.toLowerCase()) {
          return;
        }
      } else {
        this.position++;
      }
    }
  }

  private parseText(): HTMLNode | null {
    let text = '';
    while (this.position < this.html.length && this.html[this.position] !== '<') {
      text += this.html[this.position];
      this.position++;
    }
    
    if (!text) return null;
    
    return {
      type: 'text',
      textContent: text,
      children: []
    };
  }

  private parseComment(): HTMLNode | null {
    if (this.html.slice(this.position, this.position + 4) !== '<!--') return null;

    this.position += 4; // 跳过 <!--
    let comment = '';

    while (this.position < this.html.length) {
      if (this.html[this.position] === '-' && this.html.slice(this.position, this.position + 3) === '-->') {
        this.position += 3; // 跳过 -->
        break;
      }
      comment += this.html[this.position];
      this.position++;
    }

    return {
      type: 'comment',
      commentContent: comment,
      children: []
    };
  }

  private parseDoctype(): void {
    while (this.position < this.html.length && this.html[this.position] !== '>') {
      this.position++;
    }
    this.position++; // 跳过 >
  }
}

// ============== 主工具类 ==============

export class HTMLUtils {
  /**
   * 解析 HTML 字符串为 DOM 树
   */
  static parse(html: string): HTMLNode {
    const parser = new HTMLParser(html);
    return parser.parse();
  }

  /**
   * 将 DOM 树序列化为 HTML 字符串
   */
  static stringify(node: HTMLNode, options: GenerateOptions = {}): string {
    const {
      pretty = false,
      indent = '  ',
      includeDoctype = false,
      selfCloseEmpty = true
    } = options;

    let html = '';
    
    if (includeDoctype && node.type === 'document') {
      html += '<!DOCTYPE html>\n';
    }

    html += this.nodeToString(node, {
      pretty,
      indent,
      selfCloseEmpty,
      level: 0
    });

    return html;
  }

  private static nodeToString(
    node: HTMLNode,
    options: { pretty: boolean; indent: string; selfCloseEmpty: boolean; level: number }
  ): string {
    const { pretty, indent, selfCloseEmpty, level } = options;
    const indentation = pretty ? indent.repeat(level) : '';

    switch (node.type) {
      case 'document':
        return node.children.map(child => this.nodeToString(child, { ...options, level })).join('');

      case 'element': {
        const tagName = node.tagName || 'unknown';
        let attrs = '';
        
        if (node.attributes) {
          attrs = Object.entries(node.attributes)
            .map(([key, value]) => ` ${key}="${this.escapeHtml(value)}"`)
            .join('');
        }

        const isEmpty = node.children.length === 0;
        const isVoid = VOID_ELEMENTS.has(tagName);

        if (isEmpty && (isVoid || selfCloseEmpty)) {
          return `${indentation}<${tagName}${attrs}${isVoid ? '' : ' /'}>\n`;
        }

        const children = node.children
          .map(child => this.nodeToString(child, { ...options, level: level + 1 }))
          .join('');

        return `${indentation}<${tagName}${attrs}>\n${children}${indentation}</${tagName}>\n`;
      }

      case 'text':
        return `${indentation}${this.escapeHtml(node.textContent || '')}\n`;

      case 'comment':
        return `${indentation}<!--${node.commentContent || ''}-->\n`;

      default:
        return '';
    }
  }

  /**
   * CSS 选择器查询
   */
  static query(node: HTMLNode, selector: string): QueryResult {
    const nodes: HTMLNode[] = [];
    this.queryRecursive(node, selector, nodes);
    return { nodes, count: nodes.length };
  }

  private static queryRecursive(node: HTMLNode, selector: string, results: HTMLNode[]): void {
    if (node.type === 'element' && this.matchesSelector(node, selector)) {
      results.push(node);
    }

    node.children.forEach(child => this.queryRecursive(child, selector, results));
  }

  private static matchesSelector(node: HTMLNode, selector: string): boolean {
    if (node.type !== 'element') return false;

    // 简单选择器解析
    const parts = selector.split(/(?=[.#])/);
    
    for (const part of parts) {
      if (!part) continue;

      if (part.startsWith('#')) {
        // ID 选择器
        const id = part.slice(1);
        if (node.attributes?.id !== id) return false;
      } else if (part.startsWith('.')) {
        // 类选择器
        const className = part.slice(1);
        const classList = (node.attributes?.class || '').split(/\s+/);
        if (!classList.includes(className)) return false;
      } else {
        // 标签选择器
        if (part !== '*' && node.tagName !== part.toLowerCase()) return false;
      }
    }

    return true;
  }

  /**
   * 提取节点数据
   */
  static extract(node: HTMLNode, options: ExtractOptions = {}): ExtractedData {
    const {
      text = true,
      html = false,
      attributes,
      allAttributes = false,
      includeChildren = false,
      trim = true
    } = options;

    const data: ExtractedData = {};

    if (node.type === 'element') {
      data.tagName = node.tagName;

      if (allAttributes && node.attributes) {
        data.attributes = { ...node.attributes };
      } else if (attributes && node.attributes) {
        data.attributes = {};
        attributes.forEach(attr => {
          if (node.attributes?.[attr] !== undefined) {
            data.attributes![attr] = node.attributes![attr];
          }
        });
      }
    }

    if (text) {
      data.text = this.getTextContent(node, trim);
    }

    if (html && node.type === 'element') {
      data.html = this.stringify(node, { pretty: false, selfCloseEmpty: true });
    }

    if (includeChildren && node.children) {
      data.children = node.children.map(child => this.extract(child, options));
    }

    return data;
  }

  private static getTextContent(node: HTMLNode, trim: boolean = true): string {
    if (node.type === 'text') {
      return trim ? (node.textContent || '').trim() : (node.textContent || '');
    }

    if (node.type === 'comment') {
      return '';
    }

    return node.children
      .map(child => this.getTextContent(child, trim))
      .filter(t => t)
      .join(' ');
  }

  /**
   * 遍历 DOM 树
   */
  static traverse(node: HTMLNode, callback: (node: HTMLNode, depth: number) => void | boolean): void {
    this.traverseRecursive(node, callback, 0);
  }

  private static traverseRecursive(
    node: HTMLNode,
    callback: (node: HTMLNode, depth: number) => void | boolean,
    depth: number
  ): void {
    const result = callback(node, depth);
    
    if (result !== false && node.children) {
      node.children.forEach(child => this.traverseRecursive(child, callback, depth + 1));
    }
  }

  /**
   * 提取表格数据
   */
  static extractTable(node: HTMLNode): TableData | null {
    if (node.type !== 'element' || node.tagName !== 'table') {
      // 查找 table 元素
      const result = this.query(node, 'table');
      if (result.count === 0) return null;
      node = result.nodes[0];
    }

    const headers: string[] = [];
    const rows: string[][] = [];
    const data: Record<string, string>[] = [];

    // 提取表头
    const headerResult = this.query(node, 'thead th, thead td, tr:first-child th, tr:first-child td');
    headerResult.nodes.forEach(n => {
      if (n.type === 'element') {
        headers.push(this.getTextContent(n, true));
      }
    });

    // 提取数据行
    const rowResults = this.query(node, 'tbody tr, table tr');
    rowResults.nodes.forEach((row, index) => {
      if (row.type !== 'element') return;
      
      // 跳过表头行
      if (index === 0 && headers.length > 0) return;

      const rowData: string[] = [];
      const rowObj: Record<string, string> = {};

      row.children.forEach(cell => {
        if (cell.type === 'element' && (cell.tagName === 'td' || cell.tagName === 'th')) {
          const text = this.getTextContent(cell, true);
          rowData.push(text);
        }
      });

      if (rowData.length > 0) {
        rows.push(rowData);

        // 创建对象
        if (headers.length > 0) {
          headers.forEach((header, i) => {
            rowObj[header] = rowData[i] || '';
          });
          data.push(rowObj);
        }
      }
    });

    return { headers, rows, data };
  }

  /**
   * 提取所有链接
   */
  static extractLinks(node: HTMLNode): LinkData[] {
    const links: LinkData[] = [];
    const result = this.query(node, 'a');

    result.nodes.forEach(n => {
      if (n.type === 'element' && n.attributes?.href) {
        links.push({
          text: this.getTextContent(n, true),
          href: n.attributes.href,
          title: n.attributes.title
        });
      }
    });

    return links;
  }

  /**
   * 提取所有图片
   */
  static extractImages(node: HTMLNode): ImageData[] {
    const images: ImageData[] = [];
    const result = this.query(node, 'img');

    result.nodes.forEach(n => {
      if (n.type === 'element' && n.attributes?.src) {
        images.push({
          src: n.attributes.src,
          alt: n.attributes.alt,
          title: n.attributes.title
        });
      }
    });

    return images;
  }

  /**
   * 创建 HTML 元素
   */
  static createElement(tagName: string, attributes?: Record<string, string>): HTMLNode {
    return {
      type: 'element',
      tagName: tagName.toLowerCase(),
      attributes: attributes || {},
      children: []
    };
  }

  /**
   * 创建文本节点
   */
  static createText(content: string): HTMLNode {
    return {
      type: 'text',
      textContent: content,
      children: []
    };
  }

  /**
   * 添加子节点
   */
  static appendChild(parent: HTMLNode, child: HTMLNode): DOMOperationResult {
    if (!parent.children) {
      parent.children = [];
    }
    parent.children.push(child);
    child.parent = parent;

    return {
      success: true,
      affectedCount: 1
    };
  }

  /**
   * 移除子节点
   */
  static removeChild(parent: HTMLNode, child: HTMLNode): DOMOperationResult {
    if (!parent.children) {
      return { success: false, affectedCount: 0 };
    }

    const index = parent.children.indexOf(child);
    if (index === -1) {
      return { success: false, affectedCount: 0 };
    }

    parent.children.splice(index, 1);
    child.parent = undefined;

    return {
      success: true,
      affectedCount: 1
    };
  }

  /**
   * 设置属性
   */
  static setAttribute(node: HTMLNode, name: string, value: string): DOMOperationResult {
    if (node.type !== 'element') {
      return { success: false, affectedCount: 0, error: '只能为元素节点设置属性' };
    }

    if (!node.attributes) {
      node.attributes = {};
    }

    node.attributes[name] = value;

    return {
      success: true,
      affectedCount: 1
    };
  }

  /**
   * 获取属性
   */
  static getAttribute(node: HTMLNode, name: string): string | undefined {
    if (node.type !== 'element' || !node.attributes) {
      return undefined;
    }

    return node.attributes[name];
  }

  /**
   * 移除属性
   */
  static removeAttribute(node: HTMLNode, name: string): DOMOperationResult {
    if (node.type !== 'element' || !node.attributes) {
      return { success: false, affectedCount: 0 };
    }

    if (!(name in node.attributes)) {
      return { success: false, affectedCount: 0 };
    }

    delete node.attributes[name];

    return {
      success: true,
      affectedCount: 1
    };
  }

  /**
   * 查找父节点
   */
  static findParent(node: HTMLNode, selector?: string): HTMLNode | null {
    let current = node.parent;

    while (current) {
      if (!selector || this.matchesSelector(current, selector)) {
        return current;
      }
      current = current.parent;
    }

    return null;
  }

  /**
   * HTML 转义
   */
  static escapeHtml(text: string): string {
    const escapeMap: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    };

    return text.replace(/[&<>"']/g, char => escapeMap[char]);
  }

  /**
   * HTML 反转义
   */
  static unescapeHtml(text: string): string {
    const unescapeMap: Record<string, string> = {
      '&amp;': '&',
      '&lt;': '<',
      '&gt;': '>',
      '&quot;': '"',
      '&#39;': "'"
    };

    return text.replace(/&amp;|&lt;|&gt;|&quot;|&#39;/g, match => unescapeMap[match]);
  }

  /**
   * 生成简单 HTML 文档
   */
  static createDocument(
    title: string,
    body: HTMLNode[],
    options: { headContent?: HTMLNode[]; includeStyles?: boolean; includeScripts?: boolean } = {}
  ): string {
    const doc: HTMLNode = {
      type: 'document',
      children: []
    };

    const html: HTMLNode = {
      type: 'element',
      tagName: 'html',
      attributes: { lang: 'zh-CN' },
      children: []
    };

    // Head
    const head: HTMLNode = {
      type: 'element',
      tagName: 'head',
      children: [
        this.createElement('meta', { charset: 'UTF-8' }),
        this.createElement('meta', { name: 'viewport', content: 'width=device-width, initial-scale=1.0' }),
        this.createElement('title'),
      ]
    };
    head.children[2].children.push(this.createText(title));

    if (options.headContent) {
      head.children.push(...options.headContent);
    }

    if (options.includeStyles) {
      head.children.push(this.createElement('style'));
    }

    html.children.push(head);

    // Body
    const bodyEl: HTMLNode = {
      type: 'element',
      tagName: 'body',
      children: body
    };

    if (options.includeScripts) {
      bodyEl.children.push(this.createElement('script'));
    }

    html.children.push(bodyEl);
    doc.children.push(html);

    return this.stringify(doc, { pretty: true, includeDoctype: true });
  }
}

// ============== 便捷函数 ==============

/**
 * 解析 HTML
 */
export function parseHTML(html: string): HTMLNode {
  return HTMLUtils.parse(html);
}

/**
 * 序列化 DOM 为 HTML
 */
export function stringifyHTML(node: HTMLNode, options?: GenerateOptions): string {
  return HTMLUtils.stringify(node, options);
}

/**
 * 查询节点
 */
export function query(node: HTMLNode, selector: string): HTMLNode[] {
  return HTMLUtils.query(node, selector).nodes;
}

/**
 * 提取文本
 */
export function extractText(node: HTMLNode): string {
  return HTMLUtils.getTextContent(node, true);
}

/**
 * 创建元素
 */
export function h(tagName: string, attributes?: Record<string, string>, children?: HTMLNode[]): HTMLNode {
  const element = HTMLUtils.createElement(tagName, attributes);
  if (children) {
    children.forEach(child => HTMLUtils.appendChild(element, child));
  }
  return element;
}

/**
 * 创建文本
 */
export function t(content: string): HTMLNode {
  return HTMLUtils.createText(content);
}

/**
 * 生成 HTML 文档
 */
export function createHTMLDocument(
  title: string,
  body: HTMLNode[],
  options?: { headContent?: HTMLNode[]; includeStyles?: boolean; includeScripts?: boolean }
): string {
  return HTMLUtils.createDocument(title, body, options);
}

// ============== 导出 ==============

export default HTMLUtils;
