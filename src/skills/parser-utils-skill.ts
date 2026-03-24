/**
 * ACE 数据解析工具
 * 
 * 功能:
 * 1. JSON 解析 (支持嵌套、数组、错误处理)
 * 2. CSV 解析 (支持表头、分隔符配置、引号处理)
 * 3. XML 解析 (支持标签、属性、文本内容)
 * 
 * @author Axon (ACE Subagent)
 * @version 1.0.0
 * @created 2026-03-13
 */

// ==================== 类型定义 ====================

export interface ParseResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  warnings?: string[];
  metadata?: {
    rowCount?: number;
    columnCount?: number;
    parseTime?: number;
  };
}

export interface JSONParseOptions {
  /** 是否允许空值 */
  allowEmpty?: boolean;
  /** 最大嵌套深度 */
  maxDepth?: number;
  /** 是否验证 JSON Schema */
  validate?: boolean;
}

export interface CSVParseOptions {
  /** 列分隔符，默认逗号 */
  delimiter?: string;
  /** 是否有表头，默认 true */
  hasHeader?: boolean;
  /** 引号字符，默认双引号 */
  quoteChar?: string;
  /** 是否去除空格 */
  trim?: boolean;
  /** 是否跳过空行 */
  skipEmptyLines?: boolean;
  /** 自定义列名 (当 hasHeader=false 时使用) */
  columnNames?: string[];
}

export interface XMLParseOptions {
  /** 是否保留属性，默认 true */
  includeAttributes?: boolean;
  /** 是否保留文本内容，默认 true */
  includeText?: boolean;
  /** 是否压缩空节点，默认 false */
  compact?: boolean;
}

export interface CSVRow {
  [key: string]: string | number | boolean | null;
}

export interface XMLNode {
  tag: string;
  attributes?: Record<string, string>;
  children?: XMLNode[];
  text?: string;
}

// ==================== JSON 解析 ====================

/**
 * 解析 JSON 字符串
 * 
 * @param jsonString - JSON 字符串
 * @param options - 解析选项
 * @returns 解析结果
 */
export function parseJSON(jsonString: string, options: JSONParseOptions = {}): ParseResult<any> {
  const startTime = Date.now();
  const warnings: string[] = [];
  
  const {
    allowEmpty = false,
    maxDepth = 100,
    validate = false
  } = options;

  try {
    // 空值检查
    if (!jsonString || jsonString.trim() === '') {
      if (allowEmpty) {
        return {
          success: true,
          data: null,
          warnings: ['Input was empty'],
          metadata: { parseTime: Date.now() - startTime }
        };
      }
      return {
        success: false,
        error: 'Empty JSON input',
        metadata: { parseTime: Date.now() - startTime }
      };
    }

    // 深度检查
    const depth = getJSONDepth(jsonString);
    if (depth > maxDepth) {
      return {
        success: false,
        error: `JSON depth (${depth}) exceeds maximum allowed (${maxDepth})`,
        metadata: { parseTime: Date.now() - startTime }
      };
    }

    // 解析 JSON
    const data = JSON.parse(jsonString);

    // 可选验证
    if (validate && typeof data === 'object' && data !== null) {
      const validation = validateJSONStructure(data);
      if (!validation.valid) {
        warnings.push(...validation.warnings);
      }
    }

    return {
      success: true,
      data,
      warnings: warnings.length > 0 ? warnings : undefined,
      metadata: {
        parseTime: Date.now() - startTime
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown JSON parse error',
      metadata: { parseTime: Date.now() - startTime }
    };
  }
}

/**
 * 计算 JSON 嵌套深度
 */
function getJSONDepth(jsonString: string): number {
  let maxDepth = 0;
  let currentDepth = 0;
  
  for (const char of jsonString) {
    if (char === '{' || char === '[') {
      currentDepth++;
      maxDepth = Math.max(maxDepth, currentDepth);
    } else if (char === '}' || char === ']') {
      currentDepth--;
    }
  }
  
  return maxDepth;
}

/**
 * 验证 JSON 结构
 */
function validateJSONStructure(data: any): { valid: boolean; warnings: string[] } {
  const warnings: string[] = [];
  
  if (Array.isArray(data)) {
    if (data.length === 0) {
      warnings.push('Empty array detected');
    }
  } else if (typeof data === 'object') {
    const keys = Object.keys(data);
    if (keys.length === 0) {
      warnings.push('Empty object detected');
    }
  }
  
  return {
    valid: warnings.length === 0,
    warnings
  };
}

// ==================== CSV 解析 ====================

/**
 * 解析 CSV 字符串
 * 
 * @param csvString - CSV 字符串
 * @param options - 解析选项
 * @returns 解析结果
 */
export function parseCSV(csvString: string, options: CSVParseOptions = {}): ParseResult<CSVRow[]> {
  const startTime = Date.now();
  const warnings: string[] = [];
  
  const {
    delimiter = ',',
    hasHeader = true,
    quoteChar = '"',
    trim = true,
    skipEmptyLines = true,
    columnNames
  } = options;

  try {
    if (!csvString || csvString.trim() === '') {
      return {
        success: false,
        error: 'Empty CSV input',
        metadata: { parseTime: Date.now() - startTime }
      };
    }

    const lines = csvString.split(/\r?\n/);
    const result: CSVRow[] = [];
    
    let headers: string[] = [];
    let startIndex = 0;

    // 处理表头
    if (hasHeader && lines.length > 0) {
      headers = parseCSVLine(lines[0], delimiter, quoteChar, trim);
      startIndex = 1;
    } else if (columnNames) {
      headers = columnNames;
    } else {
      // 自动生成列名
      const firstLine = parseCSVLine(lines[0], delimiter, quoteChar, trim);
      headers = firstLine.map((_, i) => `column_${i}`);
    }

    // 处理数据行
    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i];
      
      // 跳过空行
      if (skipEmptyLines && (!line || line.trim() === '')) {
        continue;
      }

      const values = parseCSVLine(line, delimiter, quoteChar, trim);
      
      // 检查列数匹配
      if (values.length !== headers.length) {
        warnings.push(`Line ${i + 1}: Expected ${headers.length} columns, got ${values.length}`);
      }

      const row: CSVRow = {};
      headers.forEach((header, index) => {
        let value: string | number | boolean | null = values[index] ?? '';
        
        // 类型转换
        if (value === '' || value === null || value === undefined) {
          row[header] = null;
        } else if (value === 'true') {
          row[header] = true;
        } else if (value === 'false') {
          row[header] = false;
        } else if (!isNaN(Number(value)) && value.trim() !== '') {
          row[header] = Number(value);
        } else {
          row[header] = value;
        }
      });

      result.push(row);
    }

    return {
      success: true,
      data: result,
      warnings: warnings.length > 0 ? warnings : undefined,
      metadata: {
        rowCount: result.length,
        columnCount: headers.length,
        parseTime: Date.now() - startTime
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown CSV parse error',
      metadata: { parseTime: Date.now() - startTime }
    };
  }
}

/**
 * 解析单行 CSV
 */
function parseCSVLine(line: string, delimiter: string, quoteChar: string, trim: boolean): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];
    
    if (char === quoteChar) {
      if (inQuotes && nextChar === quoteChar) {
        // 转义的引号
        current += quoteChar;
        i++;
      } else {
        // 切换引号状态
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      // 列分隔符
      result.push(trim ? current.trim() : current);
      current = '';
    } else {
      current += char;
    }
  }
  
  // 添加最后一列
  result.push(trim ? current.trim() : current);
  
  return result;
}

// ==================== XML 解析 ====================

/**
 * 解析 XML 字符串
 * 
 * @param xmlString - XML 字符串
 * @param options - 解析选项
 * @returns 解析结果
 */
export function parseXML(xmlString: string, options: XMLParseOptions = {}): ParseResult<XMLNode | XMLNode[]> {
  const startTime = Date.now();
  const warnings: string[] = [];
  
  const {
    includeAttributes = true,
    includeText = true,
    compact = false
  } = options;

  try {
    if (!xmlString || xmlString.trim() === '') {
      return {
        success: false,
        error: 'Empty XML input',
        metadata: { parseTime: Date.now() - startTime }
      };
    }

    // 检查是否使用 DOMParser (浏览器环境)
    if (typeof DOMParser !== 'undefined') {
      return parseXMLWithDOMParser(xmlString, { includeAttributes, includeText, compact });
    }

    // Node.js 环境 - 使用简单解析器
    return parseXMLSimple(xmlString, { includeAttributes, includeText, compact });
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown XML parse error',
      metadata: { parseTime: Date.now() - startTime }
    };
  }
}

/**
 * 使用 DOMParser 解析 XML (浏览器环境)
 */
function parseXMLWithDOMParser(
  xmlString: string,
  options: Required<XMLParseOptions>
): ParseResult<XMLNode | XMLNode[]> {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlString, 'text/xml');
  
  // 检查解析错误
  const parseError = doc.querySelector('parsererror');
  if (parseError) {
    return {
      success: false,
      error: parseError.textContent || 'XML parsing error',
      metadata: { parseTime: Date.now() - startTime }
    };
  }

  const rootNode = xmlNodeToObject(doc.documentElement, options);
  
  return {
    success: true,
    data: rootNode,
    metadata: { parseTime: Date.now() - startTime }
  };
}

/**
 * 简单 XML 解析器 (Node.js 环境)
 */
function parseXMLSimple(
  xmlString: string,
  options: Required<XMLParseOptions>
): ParseResult<XMLNode | XMLNode[]> {
  // 移除 XML 声明
  const cleaned = xmlString.replace(/<\?xml[^>]*\?>/g, '').trim();
  
  // 提取根节点
  const rootMatch = cleaned.match(/<([a-zA-Z][\w-]*)[^>]*>([\s\S]*)<\/\1>/);
  if (!rootMatch) {
    return {
      success: false,
      error: 'Invalid XML structure: could not find root element',
      metadata: { parseTime: Date.now() - startTime }
    };
  }

  const [, rootTag, rootContent] = rootMatch;
  const rootAttributes = parseXMLAttributes(rootMatch[0]);
  
  const children = parseXMLChildren(rootContent, options);
  
  const rootNode: XMLNode = {
    tag: rootTag,
    ...(options.includeAttributes && Object.keys(rootAttributes).length > 0 && { attributes: rootAttributes }),
    ...(children.length > 0 && { children }),
    ...(options.includeText && rootContent.trim() && !rootContent.trim().startsWith('<') && { text: rootContent.trim() })
  };

  return {
    success: true,
    data: rootNode,
    metadata: { parseTime: Date.now() - startTime }
  };
}

/**
 * 解析 XML 属性
 */
function parseXMLAttributes(tagString: string): Record<string, string> {
  const attributes: Record<string, string> = {};
  const attrRegex = /([a-zA-Z][\w-]*)\s*=\s*["']([^"']*)["']/g;
  let match;
  
  while ((match = attrRegex.exec(tagString)) !== null) {
    attributes[match[1]] = match[2];
  }
  
  return attributes;
}

/**
 * 解析 XML 子节点
 */
function parseXMLChildren(content: string, options: Required<XMLParseOptions>): XMLNode[] {
  const children: XMLNode[] = [];
  const tagRegex = /<([a-zA-Z][\w-]*)([^>]*)>([\s\S]*?)<\/\1>|<([a-zA-Z][\w-]*)([^>]*)\s*\/>/g;
  let match;
  
  while ((match = tagRegex.exec(content)) !== null) {
    if (match[1]) {
      // 有闭合标签的节点
      const [, tag, attrString, innerContent] = match;
      const attributes = parseXMLAttributes(attrString);
      const nodeChildren = parseXMLChildren(innerContent, options);
      
      const node: XMLNode = {
        tag,
        ...(options.includeAttributes && Object.keys(attributes).length > 0 && { attributes }),
        ...(nodeChildren.length > 0 && { children: nodeChildren })
      };
      
      // 处理文本内容
      const textContent = innerContent.replace(/<[^>]*>/g, '').trim();
      if (options.includeText && textContent) {
        node.text = textContent;
      }
      
      children.push(node);
    } else if (match[4]) {
      // 自闭合节点
      const [, , , , tag, attrString] = match;
      const attributes = parseXMLAttributes(attrString);
      
      children.push({
        tag,
        ...(options.includeAttributes && Object.keys(attributes).length > 0 && { attributes })
      });
    }
  }
  
  return children;
}

/**
 * XML 节点转换 (DOMParser 辅助函数)
 */
function xmlNodeToObject(node: Element, options: Required<XMLParseOptions>): XMLNode {
  const result: XMLNode = { tag: node.tagName };
  
  if (options.includeAttributes && node.attributes.length > 0) {
    result.attributes = {};
    for (let i = 0; i < node.attributes.length; i++) {
      const attr = node.attributes[i];
      result.attributes[attr.name] = attr.value;
    }
  }
  
  if (options.includeText) {
    const textNodes = Array.from(node.childNodes).filter(
      n => n.nodeType === Node.TEXT_NODE && n.textContent?.trim()
    );
    if (textNodes.length > 0) {
      result.text = textNodes.map(n => n.textContent?.trim()).filter(Boolean).join(' ');
    }
  }
  
  const childElements = Array.from(node.children);
  if (childElements.length > 0) {
    result.children = childElements.map(child => xmlNodeToObject(child, options));
  }
  
  return result;
}

// ==================== 工具函数 ====================

/**
 * 将对象转换为 JSON 字符串
 */
export function toJSON(data: any, pretty = true): string {
  return pretty ? JSON.stringify(data, null, 2) : JSON.stringify(data);
}

/**
 * 将 CSV 行数组转换为 CSV 字符串
 */
export function toCSV(rows: CSVRow[], options: CSVParseOptions = {}): string {
  const { delimiter = ',', quoteChar = '"', trim = true } = options;
  
  if (rows.length === 0) return '';
  
  const headers = Object.keys(rows[0]);
  const lines: string[] = [];
  
  // 添加表头
  lines.push(headers.map(h => escapeCSVField(h, delimiter, quoteChar)).join(delimiter));
  
  // 添加数据行
  rows.forEach(row => {
    const values = headers.map(h => {
      const value = row[h];
      const stringValue = value === null || value === undefined ? '' : String(value);
      return escapeCSVField(stringValue, delimiter, quoteChar);
    });
    lines.push(values.join(delimiter));
  });
  
  return lines.join('\n');
}

/**
 * 转义 CSV 字段
 */
function escapeCSVField(field: string, delimiter: string, quoteChar: string): string {
  const needsQuotes = field.includes(delimiter) || field.includes(quoteChar) || field.includes('\n');
  
  if (needsQuotes) {
    const escaped = field.replace(new RegExp(quoteChar, 'g'), quoteChar + quoteChar);
    return `${quoteChar}${escaped}${quoteChar}`;
  }
  
  return field;
}

/**
 * 将 XML 节点对象转换为 XML 字符串
 */
export function toXML(node: XMLNode, indent = 0): string {
  const spaces = '  '.repeat(indent);
  let result = `${spaces}<${node.tag}`;
  
  // 添加属性
  if (node.attributes) {
    for (const [key, value] of Object.entries(node.attributes)) {
      result += ` ${key}="${escapeXMLAttr(value)}"`;
    }
  }
  
  // 检查是否有内容
  const hasChildren = node.children && node.children.length > 0;
  const hasText = node.text && node.text.trim() !== '';
  
  if (!hasChildren && !hasText) {
    return result + '/>\n';
  }
  
  result += '>';
  
  if (hasText && !hasChildren) {
    result += `${node.text}</${node.tag}>\n`;
  } else {
    result += '\n';
    if (hasChildren) {
      node.children!.forEach(child => {
        result += toXML(child, indent + 1);
      });
    }
    if (hasText) {
      result += `${spaces}  ${node.text}\n`;
    }
    result += `${spaces}</${node.tag}>\n`;
  }
  
  return result;
}

/**
 * 转义 XML 属性值
 */
function escapeXMLAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// ==================== 导出 ====================

export default {
  parseJSON,
  parseCSV,
  parseXML,
  toJSON,
  toCSV,
  toXML
};
