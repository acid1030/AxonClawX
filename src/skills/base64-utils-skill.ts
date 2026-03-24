/**
 * Base64 工具技能
 * 
 * 功能:
 * 1. Base64 编码/解码
 * 2. URL Safe Base64
 * 3. 文件 Base64 转换
 * 
 * @module skills/base64-utils
 */

// ==================== 基础 Base64 编码解码 ====================

/**
 * Base64 编码
 * @param input - 要编码的字符串或 Buffer
 * @returns Base64 编码后的字符串
 */
export function base64Encode(input: string | Buffer): string {
  if (typeof input === 'string') {
    return Buffer.from(input, 'utf-8').toString('base64');
  }
  return input.toString('base64');
}

/**
 * Base64 解码
 * @param input - Base64 编码的字符串
 * @returns 解码后的字符串
 */
export function base64Decode(input: string): string {
  return Buffer.from(input, 'base64').toString('utf-8');
}

/**
 * Base64 解码为 Buffer
 * @param input - Base64 编码的字符串
 * @returns 解码后的 Buffer
 */
export function base64DecodeToBuffer(input: string): Buffer {
  return Buffer.from(input, 'base64');
}

// ==================== URL Safe Base64 ====================

/**
 * URL Safe Base64 编码
 * 将标准 Base64 中的 + 和 / 替换为 - 和 _，并移除填充符 =
 * @param input - 要编码的字符串或 Buffer
 * @returns URL Safe Base64 编码后的字符串
 */
export function base64UrlEncode(input: string | Buffer): string {
  return base64Encode(input)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * URL Safe Base64 解码
 * 将 URL Safe Base64 中的 - 和 _ 还原为 + 和 /，并补充填充符 =
 * @param input - URL Safe Base64 编码的字符串
 * @returns 解码后的字符串
 */
export function base64UrlDecode(input: string): string {
  // 补充填充符
  let padded = input.replace(/-/g, '+').replace(/_/g, '/');
  while (padded.length % 4 !== 0) {
    padded += '=';
  }
  return base64Decode(padded);
}

/**
 * URL Safe Base64 解码为 Buffer
 * @param input - URL Safe Base64 编码的字符串
 * @returns 解码后的 Buffer
 */
export function base64UrlDecodeToBuffer(input: string): Buffer {
  let padded = input.replace(/-/g, '+').replace(/_/g, '/');
  while (padded.length % 4 !== 0) {
    padded += '=';
  }
  return base64DecodeToBuffer(padded);
}

// ==================== 文件 Base64 转换 ====================

import * as fs from 'fs';
import * as path from 'path';

/**
 * 文件转 Base64
 * @param filePath - 文件路径
 * @returns Base64 编码的字符串
 */
export function fileToBase64(filePath: string): string {
  const absolutePath = path.resolve(filePath);
  const buffer = fs.readFileSync(absolutePath);
  return buffer.toString('base64');
}

/**
 * 文件转 Base64 (带 MIME 类型)
 * @param filePath - 文件路径
 * @returns 包含 MIME 类型的 Data URL 格式
 */
export function fileToBase64DataUrl(filePath: string): string {
  const absolutePath = path.resolve(filePath);
  const buffer = fs.readFileSync(absolutePath);
  const ext = path.extname(absolutePath).toLowerCase();
  
  const mimeTypes: Record<string, string> = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.pdf': 'application/pdf',
    '.txt': 'text/plain',
    '.json': 'application/json',
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.ts': 'application/typescript',
    '.xml': 'application/xml',
    '.csv': 'text/csv',
  };
  
  const mimeType = mimeTypes[ext] || 'application/octet-stream';
  const base64 = buffer.toString('base64');
  
  return `data:${mimeType};base64,${base64}`;
}

/**
 * Base64 转文件
 * @param base64 - Base64 编码的字符串
 * @param outputPath - 输出文件路径
 */
export function base64ToFile(base64: string, outputPath: string): void {
  const absolutePath = path.resolve(outputPath);
  const buffer = base64DecodeToBuffer(base64);
  
  // 确保目录存在
  const dir = path.dirname(absolutePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  fs.writeFileSync(absolutePath, buffer);
}

/**
 * Data URL 转文件
 * @param dataUrl - Data URL 格式 (data:mime;base64,...)
 * @param outputPath - 输出文件路径
 */
export function dataUrlToFile(dataUrl: string, outputPath: string): void {
  const matches = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!matches) {
    throw new Error('Invalid Data URL format');
  }
  
  const base64 = matches[2];
  base64ToFile(base64, outputPath);
}

// ==================== 批量处理 ====================

/**
 * 批量编码字符串数组
 * @param inputs - 字符串数组
 * @returns Base64 编码后的字符串数组
 */
export function batchBase64Encode(inputs: string[]): string[] {
  return inputs.map(input => base64Encode(input));
}

/**
 * 批量解码字符串数组
 * @param inputs - Base64 编码的字符串数组
 * @returns 解码后的字符串数组
 */
export function batchBase64Decode(inputs: string[]): string[] {
  return inputs.map(input => base64Decode(input));
}

// ==================== 工具函数 ====================

/**
 * 判断字符串是否为有效的 Base64
 * @param input - 要检查的字符串
 * @returns 是否有效
 */
export function isValidBase64(input: string): boolean {
  const base64Regex = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
  if (!base64Regex.test(input)) {
    return false;
  }
  
  try {
    Buffer.from(input, 'base64');
    return true;
  } catch {
    return false;
  }
}

/**
 * 判断字符串是否为有效的 URL Safe Base64
 * @param input - 要检查的字符串
 * @returns 是否有效
 */
export function isValidBase64Url(input: string): boolean {
  const base64UrlRegex = /^[A-Za-z0-9_-]+$/;
  return base64UrlRegex.test(input);
}

/**
 * 计算 Base64 编码后的大小
 * @param inputSize - 原始数据大小 (字节)
 * @returns Base64 编码后的大小 (字节)
 */
export function calculateBase64Size(inputSize: number): number {
  return Math.ceil(inputSize / 3) * 4;
}

// ==================== 导出 ====================

export const Base64Utils = {
  // 基础编码解码
  encode: base64Encode,
  decode: base64Decode,
  decodeToBuffer: base64DecodeToBuffer,
  
  // URL Safe
  urlEncode: base64UrlEncode,
  urlDecode: base64UrlDecode,
  urlDecodeToBuffer: base64UrlDecodeToBuffer,
  
  // 文件转换
  fileToBase64,
  fileToBase64DataUrl,
  base64ToFile,
  dataUrlToFile,
  
  // 批量处理
  batchEncode: batchBase64Encode,
  batchDecode: batchBase64Decode,
  
  // 工具函数
  isValid: isValidBase64,
  isValidUrl: isValidBase64Url,
  calculateSize: calculateBase64Size,
};

export default Base64Utils;
