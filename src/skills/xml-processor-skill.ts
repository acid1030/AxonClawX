/**
 * XML 处理技能 - XML Processor Skill (ACE)
 * 
 * 功能:
 * 1. XML 解析为 JSON
 * 2. JSON 转 XML
 * 3. XPath 查询
 * 
 * @author Axon
 * @version 1.0.0
 * @module ACE (Axon Content Engine)
 */

import * as xmldom from 'xmldom';
import xpath from 'xpath';

// ============== 类型定义 ==============

/**
 * XML 解析配置
 */
export interface XMLParseConfig {
  /** 是否保留属性前缀 */
  attrPrefix?: string;
  /** 是否保留文本节点键名 */
  textKey?: string;
  /** 是否忽略空文本节点 */
  ignoreEmptyText?: boolean;
  /** 是否将属性放在特定键下 */
  attrsKey?: string;
}

/**
 * XML 生成配置
 */
export interface XMLGenerateConfig {
  /** 缩进字符串 */
  indent?: string;
  /** 是否包含 XML 声明 */
  xmlDecl?: boolean;
  /** 属性前缀 (解析时使用的) */
  attrPrefix?: string;
  /** 文本节点键名 (解析时使用的) */
  textKey?: string;
  /** 属性键名 (解析时使用的) */
  attrsKey?: string;
}

/**
 * XML 解析结果
 */
export interface XMLParseResult {
  /** 解析后的 JSON 对象 */
  data: any;
  /** 解析是否成功 */
  success: boolean;
  /** 错误信息 (如果有) */
  error?: string;
}

/**
 * XML 生成结果
 */
export interface XMLGenerateResult {
  /** 生成的 XML 字符串 */
  xml: string;
  /** 生成是否成功 */
  success: boolean;
  /** 错误信息 (如果有) */
  error?: string;
}

/**
 * XPath 查询结果
 */
export interface XPathQueryResult {
  /** 查询结果数组 */
  nodes: any[];
  /** 查询是否成功 */
  success: boolean;
  /** 错误信息 (如果有) */
  error?: string;
}

// ============== XML 解析器 ==============

/**
 * XML 解析类
 */
export class XMLParser {
  private config: Required<XMLParseConfig>;

  constructor(config: XMLParseConfig = {}) {
    this.config = {
      attrPrefix: config.attrPrefix ?? '@',
      textKey: config.textKey ?? '#text',
      ignoreEmptyText: config.ignoreEmptyText ?? true,
      attrsKey: config.attrsKey ?? '@attrs'
    };
  }

  /**
   * 解析 XML 字符串为 JSON
   */
  parse(xmlString: string): XMLParseResult {
    try {
      const parser = new xmldom.DOMParser();
      const doc = parser.parseFromString(xmlString, 'text/xml');
      
      // 检查解析错误
      const parseErrors = doc.getElementsByTagName('parsererror');
      if (parseErrors.length > 0) {
        return {
          data: null,
          success: false,
          error: parseErrors[0].textContent || 'XML 解析失败'
        };
      }

      const result = this.nodeToJson(doc.documentElement);
      return {
        data: result,
        success: true
      };
    } catch (error) {
      return {
        data: null,
        success: false,
        error: error instanceof Error ? error.message : '未知错误'
      };
    }
  }

  /**
   * 将 XML 节点转换为 JSON
   */
  private nodeToJson(node: any): any {
    const result: any = {};

    // 处理属性
    if (node.attributes && node.attributes.length > 0) {
      const attrs: any = {};
      for (let i = 0; i < node.attributes.length; i++) {
        const attr = node.attributes[i];
        attrs[attr.name] = this.parseValue(attr.value);
      }
      result[this.config.attrsKey] = attrs;
    }

    // 处理子节点
    if (node.childNodes && node.childNodes.length > 0) {
      const children: any = {};
      
      for (let i = 0; i < node.childNodes.length; i++) {
        const child = node.childNodes[i];
        
        // 跳过空文本节点
        if (child.nodeType === 3) { // Text node
          const text = child.nodeValue.trim();
          if (text && !this.config.ignoreEmptyText) {
            children[this.config.textKey] = this.parseValue(text);
          } else if (text) {
            children[this.config.textKey] = this.parseValue(text);
          }
          continue;
        }
        
        // 处理元素节点
        if (child.nodeType === 1) { // Element node
          const childData = this.nodeToJson(child);
          
          if (children[child.nodeName]) {
            // 如果已存在，转换为数组
            if (!Array.isArray(children[child.nodeName])) {
              children[child.nodeName] = [children[child.nodeName]];
            }
            children[child.nodeName].push(childData);
          } else {
            children[child.nodeName] = childData;
          }
        }
      }

      // 合并属性和子节点
      if (Object.keys(children).length > 0) {
        Object.assign(result, children);
      }
    }

    // 如果没有子节点和属性，直接返回文本值
    if (Object.keys(result).length === 0) {
      const text = node.textContent?.trim();
      return text ? this.parseValue(text) : '';
    }

    return result;
  }

  /**
   * 解析值 (尝试转换为数字/布尔值)
   */
  private parseValue(value: string): any {
    // 尝试转换为数字
    if (/^-?\d+(\.\d+)?$/.test(value)) {
      return Number(value);
    }
    
    // 尝试转换为布尔值
    if (value.toLowerCase() === 'true') return true;
    if (value.toLowerCase() === 'false') return false;
    
    // 返回字符串
    return value;
  }
}

// ============== XML 生成器 ==============

/**
 * XML 生成类
 */
export class XMLGenerator {
  private config: Required<XMLGenerateConfig>;

  constructor(config: XMLGenerateConfig = {}) {
    this.config = {
      indent: config.indent ?? '  ',
      xmlDecl: config.xmlDecl ?? true,
      attrPrefix: config.attrPrefix ?? '@',
      textKey: config.textKey ?? '#text',
      attrsKey: config.attrsKey ?? '@attrs'
    };
  }

  /**
   * 从 JSON 生成 XML 字符串
   */
  generate(data: any, rootName: string = 'root'): XMLGenerateResult {
    try {
      let xml = '';
      
      // 添加 XML 声明
      if (this.config.xmlDecl) {
        xml += '<?xml version="1.0" encoding="UTF-8"?>\n';
      }
      
      // 生成根元素
      xml += this.jsonToNode(data, rootName, 0);
      
      return {
        xml,
        success: true
      };
    } catch (error) {
      return {
        xml: '',
        success: false,
        error: error instanceof Error ? error.message : '未知错误'
      };
    }
  }

  /**
   * 将 JSON 对象转换为 XML 节点
   */
  private jsonToNode(data: any, nodeName: string, indentLevel: number): string {
    const indent = this.config.indent.repeat(indentLevel);
    const nextIndent = this.config.indent.repeat(indentLevel + 1);
    
    let xml = `${indent}<${nodeName}`;
    
    // 处理属性
    if (data && typeof data === 'object' && data[this.config.attrsKey]) {
      const attrs = data[this.config.attrsKey];
      for (const [key, value] of Object.entries(attrs)) {
        xml += ` ${key}="${this.escapeXml(String(value))}"`;
      }
    }
    
    // 处理内容
    const content = this.getNodeContent(data);
    
    if (content === '' || content === null || content === undefined) {
      xml += '/>\n';
    } else {
      xml += '>\n';
      xml += content;
      xml += `${indent}</${nodeName}>\n`;
    }
    
    return xml;
  }

  /**
   * 获取节点内容
   */
  private getNodeContent(data: any): string {
    if (!data || typeof data !== 'object') {
      return this.escapeXml(String(data ?? ''));
    }
    
    let content = '';
    
    // 处理文本节点
    if (data[this.config.textKey] !== undefined) {
      content += this.escapeXml(String(data[this.config.textKey]));
    }
    
    // 处理子元素
    for (const [key, value] of Object.entries(data)) {
      // 跳过特殊键
      if (key === this.config.attrsKey || key === this.config.textKey) {
        continue;
      }
      
      if (Array.isArray(value)) {
        // 数组 - 生成多个同名节点
        for (const item of value) {
          content += this.jsonToNode(item, key, 1);
        }
      } else if (typeof value === 'object') {
        // 对象 - 生成子节点
        content += this.jsonToNode(value, key, 1);
      } else {
        // 基本类型 - 生成带文本值的节点
        content += `${this.config.indent}<${key}>${this.escapeXml(String(value))}</${key}>\n`;
      }
    }
    
    return content;
  }

  /**
   * XML 转义
   */
  private escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}

// ============== XPath 查询器 ==============

/**
 * XPath 查询类
 */
export class XPathQuery {
  private doc: any;

  constructor(xmlString: string) {
    const parser = new xmldom.DOMParser();
    this.doc = parser.parseFromString(xmlString, 'text/xml');
  }

  /**
   * 执行 XPath 查询
   */
  query(xpath: string): XPathQueryResult {
    try {
      const nodes = xpath.select(xpath, this.doc);
      
      const results = nodes.map((node: any) => {
        if (node.nodeType === 1) { // Element node
          return this.elementToObject(node);
        } else if (node.nodeType === 2) { // Attribute node
          return node.nodeValue;
        } else if (node.nodeType === 3) { // Text node
          return node.nodeValue?.trim();
        }
        return node;
      });
      
      return {
        nodes: results,
        success: true
      };
    } catch (error) {
      return {
        nodes: [],
        success: false,
        error: error instanceof Error ? error.message : '未知错误'
      };
    }
  }

  /**
   * 查询单个节点
   */
  queryOne(xpath: string): any {
    const result = this.query(xpath);
    if (result.success && result.nodes.length > 0) {
      return result.nodes[0];
    }
    return null;
  }

  /**
   * 将 XML 元素转换为对象
   */
  private elementToObject(element: any): any {
    const result: any = {};
    
    // 添加标签名
    result.tagName = element.nodeName;
    
    // 添加属性
    if (element.attributes && element.attributes.length > 0) {
      result.attributes = {};
      for (let i = 0; i < element.attributes.length; i++) {
        const attr = element.attributes[i];
        result.attributes[attr.name] = attr.value;
      }
    }
    
    // 添加文本内容
    if (element.childNodes && element.childNodes.length > 0) {
      const texts: string[] = [];
      for (let i = 0; i < element.childNodes.length; i++) {
        const child = element.childNodes[i];
        if (child.nodeType === 3) { // Text node
          const text = child.nodeValue?.trim();
          if (text) texts.push(text);
        }
      }
      if (texts.length > 0) {
        result.textContent = texts.join(' ');
      }
    }
    
    return result;
  }
}

// ============== 便捷函数 ==============

/**
 * XML 转 JSON (便捷函数)
 */
export function xmlToJson(xmlString: string, config?: XMLParseConfig): any {
  const parser = new XMLParser(config);
  const result = parser.parse(xmlString);
  
  if (!result.success) {
    throw new Error(result.error);
  }
  
  return result.data;
}

/**
 * JSON 转 XML (便捷函数)
 */
export function jsonToXml(data: any, rootName?: string, config?: XMLGenerateConfig): string {
  const generator = new XMLGenerator(config);
  const result = generator.generate(data, rootName);
  
  if (!result.success) {
    throw new Error(result.error);
  }
  
  return result.xml;
}

/**
 * XPath 查询 (便捷函数)
 */
export function xpathQuery(xmlString: string, xpath: string): any[] {
  const query = new XPathQuery(xmlString);
  const result = query.query(xpath);
  
  if (!result.success) {
    throw new Error(result.error);
  }
  
  return result.nodes;
}

/**
 * XPath 查询单个节点 (便捷函数)
 */
export function xpathQueryOne(xmlString: string, xpath: string): any {
  const query = new XPathQuery(xmlString);
  return query.queryOne(xpath);
}

// ============== 导出 ==============

export default {
  XMLParser,
  XMLGenerator,
  XPathQuery,
  xmlToJson,
  jsonToXml,
  xpathQuery,
  xpathQueryOne
};
