/**
 * PDF Lite Skill - 精简版 PDF 处理
 * 
 * 功能:
 * 1. PDF 文本提取
 * 2. PDF 信息读取
 * 
 * @author Axon
 * @version 1.0.0
 * @dependencies pdf-parse
 */

import * as fs from 'fs';
import * as path from 'path';
import pdfParse = require('pdf-parse');

// ============== 类型定义 ==============

export interface PDFInfo {
  /** 总页数 */
  totalPages: number;
  /** PDF 版本 */
  version?: string;
  /** 文件大小 (bytes) */
  fileSize: number;
  /** 文件路径 */
  filePath: string;
}

export interface ExtractedText {
  /** 提取的文本内容 */
  text: string;
  /** 按页分割的文本 */
  pages: string[];
  /** PDF 基本信息 */
  info: PDFInfo;
}

export interface PDFParseResult {
  text: string;
  numpages: number;
  info: {
    Title?: string;
    Author?: string;
    Subject?: string;
    Keywords?: string;
    Creator?: string;
    Producer?: string;
    CreationDate?: string;
    ModDate?: string;
  };
  metadata?: any;
  version?: string;
}

// ============== 核心功能 ==============

/**
 * 验证 PDF 文件是否存在且可读
 */
function validatePDF(filePath: string): void {
  if (!fs.existsSync(filePath)) {
    throw new Error(`PDF 文件不存在：${filePath}`);
  }
  
  const ext = path.extname(filePath).toLowerCase();
  if (ext !== '.pdf') {
    throw new Error(`文件不是 PDF 格式：${filePath}`);
  }
  
  const stats = fs.statSync(filePath);
  if (stats.size === 0) {
    throw new Error(`PDF 文件为空：${filePath}`);
  }
}

/**
 * 读取 PDF 文件信息
 * 
 * @param filePath PDF 文件路径
 * @returns PDF 基本信息
 */
export async function readPDFInfo(filePath: string): Promise<PDFInfo> {
  validatePDF(filePath);
  
  const absolutePath = path.resolve(filePath);
  const dataBuffer = fs.readFileSync(absolutePath);
  
  try {
    const data: PDFParseResult = await pdfParse(dataBuffer);
    
    return {
      totalPages: data.numpages,
      version: data.version,
      fileSize: fs.statSync(absolutePath).size,
      filePath: absolutePath
    };
  } catch (error) {
    throw new Error(`读取 PDF 信息失败：${(error as Error).message}`);
  }
}

/**
 * 提取 PDF 文本内容
 * 
 * @param filePath PDF 文件路径
 * @param options 提取选项
 * @returns 提取的文本和元数据
 */
export async function extractText(
  filePath: string,
  options: {
    /** 是否按页分割返回 */
    splitByPage?: boolean;
    /** 指定页码范围 (1-indexed) */
    pageRange?: { start: number; end: number };
  } = {}
): Promise<ExtractedText> {
  validatePDF(filePath);
  
  const absolutePath = path.resolve(filePath);
  const dataBuffer = fs.readFileSync(absolutePath);
  
  try {
    const data: PDFParseResult = await pdfParse(dataBuffer);
    
    // 处理页码范围
    let pages: string[] = [];
    if (options.splitByPage) {
      // pdf-parse 不直接支持按页分割，需要手动处理
      // 这里简化处理：返回完整文本，按页分割需要更复杂的逻辑
      pages = [data.text];
    }
    
    // 如果指定了页码范围，进行过滤 (简化实现)
    let text = data.text;
    if (options.pageRange) {
      const { start, end } = options.pageRange;
      if (start < 1 || end > data.numpages || start > end) {
        throw new Error(`无效的页码范围：${start}-${end} (总页数：${data.numpages})`);
      }
      // 注意：pdf-parse 不支持精确的页码范围提取
      // 这里仅做标记，实际使用需要更复杂的处理
      console.warn(`注意：当前实现不支持精确的页码范围提取，将返回全文`);
    }
    
    return {
      text,
      pages: pages.length > 0 ? pages : [text],
      info: {
        totalPages: data.numpages,
        version: data.version,
        fileSize: fs.statSync(absolutePath).size,
        filePath: absolutePath
      }
    };
  } catch (error) {
    throw new Error(`提取 PDF 文本失败：${(error as Error).message}`);
  }
}

/**
 * 批量提取多个 PDF 的文本
 * 
 * @param filePaths PDF 文件路径数组
 * @returns 提取结果数组
 */
export async function extractTextBatch(
  filePaths: string[]
): Promise<Array<{ filePath: string; result: ExtractedText } | { filePath: string; error: string }>> {
  const results = [];
  
  for (const filePath of filePaths) {
    try {
      const result = await extractText(filePath);
      results.push({ filePath, result });
    } catch (error) {
      results.push({ 
        filePath, 
        error: (error as Error).message 
      });
    }
  }
  
  return results;
}

// ============== 导出 ==============

export default {
  readPDFInfo,
  extractText,
  extractTextBatch
};
