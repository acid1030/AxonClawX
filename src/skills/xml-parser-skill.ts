/**
 * XML Parser Skill - ACE
 * 
 * 功能:
 * 1. XML 解析 - 将 XML 字符串解析为可操作的对象
 * 2. XPath 查询 - 支持 XPath 表达式查询 XML 节点
 * 3. XML 生成 - 从对象生成 XML 字符串
 * 
 * @module xml-parser-skill
 * @version 1.0.0
 */

// ============================================================================
// 类型定义
// ============================================================================

export interface XmlNode {
  tagName: string;
  attributes: Record<string, string>;
  children: XmlNode[];
  text?: string;
}

export interface XmlParseOptions {
  /** 是否保留空白文本节点 */
  preserveWhitespace?: boolean;
  /** 是否解析属性 */
  parseAttributes?: boolean;
}

export interface XmlGenerateOptions {
  /** 缩进空格数 */
  indent?: number;
  /** 是否格式化输出 */
  pretty?: boolean;
  /** XML 声明 */
  xmlDeclaration?: boolean;
}

export interface XPathResult {
  nodes: XmlNode[];
  values: string[];
}

// ============================================================================
// XML 解析器
// ============================================================================

/**
 * 解析 XML 字符串为 XmlNode 对象
 * 
 * @param xmlString - XML 字符串
 * @param options - 解析选项
 * @returns 解析后的 XmlNode 对象
 * 
 * @example
 * ```typescript
 * const xml = '<root><item id="1">Hello</item></root>';
 * const parsed = parseXml(xml);
 * // { tagName: 'root', children: [{ tagName: 'item', attributes: { id: '1' }, text: 'Hello' }] }
 * ```
 */
export function parseXml(xmlString: string, options: XmlParseOptions = {}): XmlNode {
  const { preserveWhitespace = false, parseAttributes = true } = options;
  
  // 移除 XML 声明
  const cleaned = xmlString.replace(/<\?xml[^>]*\?>/g, '').trim();
  
  // 使用 DOMParser (浏览器环境) 或手动解析 (Node.js 环境)
  if (typeof DOMParser !== 'undefined') {
    return parseWithDomParser(cleaned, preserveWhitespace, parseAttributes);
  } else {
    return parseManually(cleaned, preserveWhitespace, parseAttributes);
  }
}

/**
 * 使用 DOMParser 解析 XML (浏览器环境)
 */
function parseWithDomParser(xmlString: string, preserveWhitespace: boolean, parseAttributes: boolean): XmlNode {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlString, 'text/xml');
  
  // 检查解析错误
  const parseError = doc.querySelector('parsererror');
  if (parseError) {
    throw new Error(`XML 解析错误：${parseError.textContent}`);
  }
  
  return convertDomNode(doc.documentElement, preserveWhitespace, parseAttributes);
}

/**
 * 手动解析 XML (Node.js 环境)
 */
function parseManually(xmlString: string, preserveWhitespace: boolean, parseAttributes: boolean): XmlNode {
  let pos = 0;
  
  function skipWhitespace() {
    while (pos < xmlString.length && /\s/.test(xmlString[pos])) pos++;
  }
  
  function parseTagName(): string {
    const start = pos;
    while (pos < xmlString.length && /[a-zA-Z0-9_:-]/.test(xmlString[pos])) pos++;
    return xmlString.slice(start, pos);
  }
  
  function parseAttributes(): Record<string, string> {
    const attrs: Record<string, string> = {};
    skipWhitespace();
    
    while (pos < xmlString.length && xmlString[pos] !== '>' && xmlString[pos] !== '/') {
      const name = parseTagName();
      if (!name) break;
      
      skipWhitespace();
      if (xmlString[pos] === '=') {
        pos++; // skip '='
        skipWhitespace();
        const quote = xmlString[pos];
        if (quote === '"' || quote === "'") {
          pos++; // skip opening quote
          const valueStart = pos;
          while (pos < xmlString.length && xmlString[pos] !== quote) pos++;
          attrs[name] = xmlString.slice(valueStart, pos);
          pos++; // skip closing quote
        }
      }
      skipWhitespace();
    }
    
    return attrs;
  }
  
  function parseNode(): XmlNode | null {
    skipWhitespace();
    
    if (pos >= xmlString.length || xmlString[pos] !== '<') {
      return null;
    }
    
    // 检查是否为结束标签
    if (xmlString[pos + 1] === '/') {
      return null;
    }
    
    // 检查是否为注释
    if (xmlString.slice(pos, pos + 4) === '<!--') {
      const endComment = xmlString.indexOf('-->', pos);
      if (endComment === -1) throw new Error('未闭合的注释');
      pos = endComment + 3;
      return parseNode();
    }
    
    // 检查是否为 CDATA
    if (xmlString.slice(pos, pos + 9) === '<![CDATA[') {
      const endCdata = xmlString.indexOf(']]>', pos);
      if (endCdata === -1) throw new Error('未闭合的 CDATA');
      const text = xmlString.slice(pos + 9, endCdata);
      pos = endCdata + 3;
      return { tagName: '#cdata', attributes: {}, children: [], text };
    }
    
    pos++; // skip '<'
    const tagName = parseTagName();
    const attributes = parseAttributes();
    
    // 自闭合标签
    if (xmlString[pos] === '/') {
      pos += 2; // skip '/>'
      return { tagName, attributes, children: [] };
    }
    
    pos++; // skip '>'
    
    const children: XmlNode[] = [];
    let text = '';
    
    while (pos < xmlString.length) {
      skipWhitespace();
      
      if (xmlString.slice(pos, pos + 2) === '</') {
        // 结束标签
        pos += 2;
        parseTagName(); // skip closing tag name
        skipWhitespace();
        pos++; // skip '>'
        break;
      } else if (xmlString[pos] === '<') {
        const child = parseNode();
        if (child) {
          if (text && !preserveWhitespace) {
            text = text.trim();
          }
          if (text) {
            children.push({ tagName: '#text', attributes: {}, children: [], text });
            text = '';
          }
          children.push(child);
        }
      } else {
        text += xmlString[pos];
        pos++;
      }
    }
    
    if (text && !preserveWhitespace) {
      text = text.trim();
    }
    
    return { tagName, attributes, children, text: text || undefined };
  }
  
  const root = parseNode();
  if (!root) throw new Error('无效的 XML 文档');
  
  return root;
}

/**
 * 转换 DOM 节点为 XmlNode
 */
function convertDomNode(node: Element | Node, preserveWhitespace: boolean, parseAttributes: boolean): XmlNode {
  if (node.nodeType === 3) { // Text node
    const text = node.textContent || '';
    return {
      tagName: '#text',
      attributes: {},
      children: [],
      text: preserveWhitespace ? text : text.trim()
    };
  }
  
  const element = node as Element;
  const children: XmlNode[] = [];
  let textContent = '';
  
  for (const child of Array.from(element.childNodes)) {
    const childNode = convertDomNode(child, preserveWhitespace, parseAttributes);
    if (childNode.tagName === '#text') {
      textContent += childNode.text || '';
    } else {
      children.push(childNode);
    }
  }
  
  const attributes: Record<string, string> = {};
  if (parseAttributes) {
    for (const attr of Array.from(element.attributes)) {
      attributes[attr.name] = attr.value;
    }
  }
  
  return {
    tagName: element.tagName,
    attributes,
    children,
    text: textContent.trim() || undefined
  };
}

// ============================================================================
// XPath 查询
// ============================================================================

/**
 * 使用 XPath 表达式查询 XML 节点
 * 
 * @param root - XML 根节点
 * @param xpath - XPath 表达式
 * @returns 查询结果
 * 
 * @example
 * ```typescript
 * const xml = '<root><item id="1"><name>Item 1</name></item></root>';
 * const parsed = parseXml(xml);
 * const result = xpathQuery(parsed, '//item[@id="1"]/name');
 * // { nodes: [...], values: ['Item 1'] }
 * ```
 */
export function xpathQuery(root: XmlNode, xpath: string): XPathResult {
  const nodes: XmlNode[] = [];
  const values: string[] = [];
  
  // 简化的 XPath 解析器
  const result = evaluateXPath(root, xpath);
  
  function collectResults(node: XmlNode) {
    nodes.push(node);
    if (node.text) {
      values.push(node.text);
    } else if (node.children.length === 0) {
      values.push('');
    }
  }
  
  if (Array.isArray(result)) {
    result.forEach(collectResults);
  } else if (result) {
    collectResults(result);
  }
  
  return { nodes, values };
}

/**
 * 评估 XPath 表达式
 */
function evaluateXPath(node: XmlNode, xpath: string): XmlNode | XmlNode[] | null {
  xpath = xpath.trim();
  
  // 空路径返回当前节点
  if (!xpath) return node;
  
  // 绝对路径
  if (xpath.startsWith('/')) {
    if (xpath.startsWith('//')) {
      //  descendant-or-self
      return evaluateDescendants(node, xpath.slice(2));
    }
    // 从根节点开始
    return evaluateXPath(node, xpath.slice(1));
  }
  
  // 分割路径
  const parts = xpath.split('/');
  const [current, ...rest] = parts;
  
  if (!current) {
    return rest.length ? evaluateXPath(node, rest.join('/')) : node;
  }
  
  // 解析当前步骤
  const step = parseXPathStep(current);
  const matches = findMatchingNodes(node, step);
  
  if (rest.length === 0) {
    return matches;
  }
  
  // 继续评估剩余路径
  const remaining = rest.join('/');
  const results: XmlNode[] = [];
  
  if (Array.isArray(matches)) {
    for (const match of matches) {
      const result = evaluateXPath(match, remaining);
      if (result) {
        if (Array.isArray(result)) {
          results.push(...result);
        } else {
          results.push(result);
        }
      }
    }
  }
  
  return results.length ? results : null;
}

/**
 * 解析 XPath 步骤
 */
function parseXPathStep(step: string): { tagName?: string; predicates: string[] } {
  const predicates: string[] = [];
  let tagName = step;
  
  // 提取谓词
  const predicateRegex = /\[([^\]]+)\]/g;
  let match;
  while ((match = predicateRegex.exec(step)) !== null) {
    predicates.push(match[1]);
    tagName = tagName.replace(match[0], '');
  }
  
  return { tagName: tagName || undefined, predicates };
}

/**
 * 查找匹配的节点
 */
function findMatchingNodes(node: XmlNode, step: { tagName?: string; predicates: string[] }): XmlNode | XmlNode[] {
  const { tagName, predicates } = step;
  const matches: XmlNode[] = [];
  
  // 检查当前节点
  if (!tagName || tagName === '*' || tagName === node.tagName) {
    if (checkPredicates(node, predicates)) {
      matches.push(node);
    }
  }
  
  // 检查子节点
  for (const child of node.children) {
    if (!tagName || tagName === '*' || tagName === child.tagName) {
      if (checkPredicates(child, predicates)) {
        matches.push(child);
      }
    }
  }
  
  return matches.length === 1 ? matches[0] : matches;
}

/**
 * 检查谓词条件
 */
function checkPredicates(node: XmlNode, predicates: string[]): boolean {
  for (const predicate of predicates) {
    if (!evaluatePredicate(node, predicate)) {
      return false;
    }
  }
  return true;
}

/**
 * 评估单个谓词
 */
function evaluatePredicate(node: XmlNode, predicate: string): boolean {
  predicate = predicate.trim();
  
  // 属性选择器 [@attr]
  if (predicate.startsWith('@')) {
    const attrName = predicate.slice(1);
    const eqIndex = attrName.indexOf('=');
    if (eqIndex === -1) {
      return attrName in node.attributes;
    }
    const name = attrName.slice(0, eqIndex);
    let value = attrName.slice(eqIndex + 1);
    value = value.replace(/^["']|["']$/g, '');
    return node.attributes[name] === value;
  }
  
  // 文本选择器 [text()='...']
  const textMatch = predicate.match(/text\(\)\s*=\s*["'](.*)["']/);
  if (textMatch) {
    return node.text === textMatch[1];
  }
  
  // 位置选择器 [1], [last()]
  if (predicate === 'last()') {
    return true; // 简化处理
  }
  
  const posMatch = predicate.match(/^\d+$/);
  if (posMatch) {
    return true; // 简化处理
  }
  
  return true;
}

/**
 * 评估后代节点
 */
function evaluateDescendants(node: XmlNode, xpath: string): XmlNode[] {
  const results: XmlNode[] = [];
  
  function search(current: XmlNode) {
    const result = evaluateXPath(current, xpath);
    if (result) {
      if (Array.isArray(result)) {
        results.push(...result);
      } else {
        results.push(result);
      }
    }
    
    for (const child of current.children) {
      search(child);
    }
  }
  
  search(node);
  return results;
}

// ============================================================================
// XML 生成器
// ============================================================================

/**
 * 从 XmlNode 生成 XML 字符串
 * 
 * @param node - XML 节点
 * @param options - 生成选项
 * @returns XML 字符串
 * 
 * @example
 * ```typescript
 * const node: XmlNode = {
 *   tagName: 'root',
 *   attributes: { version: '1.0' },
 *   children: [{ tagName: 'item', attributes: { id: '1' }, text: 'Hello' }]
 * };
 * const xml = generateXml(node, { pretty: true, indent: 2 });
 * // <?xml version="1.0"?>\n<root version="1.0">\n  <item id="1">Hello</item>\n</root>
 * ```
 */
export function generateXml(node: XmlNode, options: XmlGenerateOptions = {}): string {
  const { indent = 2, pretty = false, xmlDeclaration = true } = options;
  
  let result = '';
  
  if (xmlDeclaration) {
    result += '<?xml version="1.0" encoding="UTF-8"?>\n';
  }
  
  result += serializeNode(node, 0, indent, pretty);
  
  return result;
}

/**
 * 序列化节点为 XML 字符串
 */
function serializeNode(node: XmlNode, depth: number, indent: number, pretty: boolean): string {
  if (node.tagName === '#text') {
    return escapeXmlText(node.text || '');
  }
  
  if (node.tagName === '#cdata') {
    return `<![CDATA[${node.text || ''}]]>`;
  }
  
  const indentStr = pretty ? ' '.repeat(depth * indent) : '';
  const lineBreak = pretty ? '\n' : '';
  
  let result = `${indentStr}<${node.tagName}`;
  
  // 添加属性
  for (const [key, value] of Object.entries(node.attributes)) {
    result += ` ${key}="${escapeXmlAttribute(value)}"`;
  }
  
  // 处理子节点和文本
  if (node.children.length === 0 && !node.text) {
    result += `/>${lineBreak}`;
  } else {
    result += '>';
    
    if (node.text) {
      result += escapeXmlText(node.text);
    }
    
    for (const child of node.children) {
      result += serializeNode(child, depth + 1, indent, pretty);
    }
    
    result += `${indentStr}</${node.tagName}>${lineBreak}`;
  }
  
  return result;
}

/**
 * 转义 XML 文本内容
 */
function escapeXmlText(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * 转义 XML 属性值
 */
function escapeXmlAttribute(value: string): string {
  return escapeXmlText(value)
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// ============================================================================
// 便捷函数
// ============================================================================

/**
 * 从 XML 字符串中提取单个值
 * 
 * @param xmlString - XML 字符串
 * @param xpath - XPath 表达式
 * @returns 第一个匹配的值，未找到返回 null
 */
export function extractValue(xmlString: string, xpath: string): string | null {
  const root = parseXml(xmlString);
  const result = xpathQuery(root, xpath);
  return result.values[0] || null;
}

/**
 * 从 XML 字符串中提取所有值
 * 
 * @param xmlString - XML 字符串
 * @param xpath - XPath 表达式
 * @returns 所有匹配的值
 */
export function extractAllValues(xmlString: string, xpath: string): string[] {
  const root = parseXml(xmlString);
  const result = xpathQuery(root, xpath);
  return result.values;
}

/**
 * 创建 XML 节点
 * 
 * @param tagName - 标签名
 * @param attributes - 属性
 * @param children - 子节点
 * @param text - 文本内容
 * @returns XmlNode 对象
 */
export function createXmlNode(
  tagName: string,
  attributes: Record<string, string> = {},
  children: XmlNode[] = [],
  text?: string
): XmlNode {
  return { tagName, attributes, children, text };
}

/**
 * 将对象转换为 XML
 * 
 * @param obj - JavaScript 对象
 * @param rootTagName - 根标签名
 * @returns XML 字符串
 * 
 * @example
 * ```typescript
 * const obj = { name: 'John', age: 30 };
 * const xml = objectToXml(obj, 'person');
 * // <?xml version="1.0" encoding="UTF-8"?>\n<person>\n  <name>John</name>\n  <age>30</age>\n</person>
 * ```
 */
export function objectToXml(obj: Record<string, any>, rootTagName: string = 'root'): string {
  function convert(value: any, tagName: string): XmlNode {
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      const children = Object.entries(value).map(([key, val]) => convert(val, key));
      return { tagName, attributes: {}, children };
    } else if (Array.isArray(value)) {
      const children = value.map((item, index) => convert(item, tagName.slice(0, -1) || 'item'));
      return { tagName, attributes: {}, children };
    } else {
      return { tagName, attributes: {}, children: [], text: String(value) };
    }
  }
  
  const root = convert(obj, rootTagName);
  return generateXml(root);
}

// ============================================================================
// 导出
// ============================================================================

export default {
  parseXml,
  xpathQuery,
  generateXml,
  extractValue,
  extractAllValues,
  createXmlNode,
  objectToXml
};
