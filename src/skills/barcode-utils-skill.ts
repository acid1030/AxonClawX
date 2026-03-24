/**
 * 条形码工具技能
 * 
 * 功能:
 * 1. 条形码生成 (支持多种格式)
 * 2. 条形码解析
 * 3. 多格式支持 (EAN-13, UPC, Code 128, QR Code 等)
 * 
 * @module skills/barcode-utils
 */

import * as fs from 'fs';
import * as path from 'path';

// ==================== 类型定义 ====================

/**
 * 支持的条形码格式
 */
export type BarcodeFormat = 
  | 'EAN-13'
  | 'EAN-8'
  | 'UPC-A'
  | 'UPC-E'
  | 'Code-128'
  | 'Code-39'
  | 'Code-93'
  | 'ITF-14'
  | 'Codabar'
  | 'QR'
  | 'DataMatrix'
  | 'PDF417'
  | 'Aztec';

/**
 * 条形码生成选项
 */
export interface BarcodeGenerateOptions {
  /** 条形码格式 */
  format?: BarcodeFormat;
  /** 输出宽度 (像素) */
  width?: number;
  /** 输出高度 (像素) */
  height?: number;
  /** 是否显示文本 */
  showText?: boolean;
  /** 文本位置 (top/bottom) */
  textLocation?: 'top' | 'bottom';
  /** 字体大小 */
  fontSize?: number;
  /** 前景色 (hex) */
  foregroundColor?: string;
  /** 背景色 (hex) */
  backgroundColor?: string;
  /** 输出格式 (png/svg) */
  outputFormat?: 'png' | 'svg';
  /** 边距 (像素) */
  margin?: number;
}

/**
 * 条形码解析结果
 */
export interface BarcodeParseResult {
  /** 是否成功 */
  success: boolean;
  /** 解析出的数据 */
  data?: string;
  /** 条形码格式 */
  format?: string;
  /** 错误信息 */
  error?: string;
}

// ==================== 条形码生成 ====================

/**
 * 生成条形码 (返回 PNG Buffer)
 * 
 * @param data - 要编码的数据
 * @param options - 生成选项
 * @returns PNG 格式的 Buffer
 * 
 * @example
 * ```typescript
 * const buffer = generateBarcode('123456789012', { format: 'EAN-13' });
 * fs.writeFileSync('barcode.png', buffer);
 * ```
 */
export function generateBarcode(data: string, options: BarcodeGenerateOptions = {}): Buffer {
  const {
    format = 'Code-128',
    width = 2,
    height: barHeight = 50,
    showText = true,
    textLocation = 'bottom',
    fontSize = 12,
    foregroundColor = '000000',
    backgroundColor = 'ffffff',
    outputFormat = 'png',
    margin = 10,
  } = options;

  // 映射到 bwip-js 的格式名称
  const formatMap: Record<BarcodeFormat, string> = {
    'EAN-13': 'ean13',
    'EAN-8': 'ean8',
    'UPC-A': 'upca',
    'UPC-E': 'upce',
    'Code-128': 'code128',
    'Code-39': 'code39',
    'Code-93': 'code93',
    'ITF-14': 'itf14',
    'Codabar': 'codabar',
    'QR': 'qrcode',
    'DataMatrix': 'datamatrix',
    'PDF417': 'pdf417',
    'Aztec': 'aztec',
  };

  const bwipFormat = formatMap[format];
  if (!bwipFormat) {
    throw new Error(`不支持的条形码格式：${format}`);
  }

  // 构建 bwip-js 参数
  const bcid = bwipFormat;
  const text = data;
  const scale = width;
  const includetext = showText;
  const textxalign = 'center';
  const textfont = 'Helvetica';
  const textsize = fontSize;
  const forecolor = foregroundColor;
  const backgroundcolor = backgroundColor;
  const padding = margin;

  // 使用 bwip-js 生成条形码
  // 注意：需要安装 bwip-js 包：npm install bwip-js
  try {
    const bwipjs = require('bwip-js');
    
    return bwipjs.toBuffer({
      bcid,
      text,
      scale,
      height: barHeight,
      includetext,
      textxalign,
      textfont,
      textsize,
      forecolor,
      backgroundcolor,
      padding,
    });
  } catch (error) {
    throw new Error(`条形码生成失败：${(error as Error).message}`);
  }
}

/**
 * 生成条形码并保存为文件
 * 
 * @param data - 要编码的数据
 * @param outputPath - 输出文件路径
 * @param options - 生成选项
 * 
 * @example
 * ```typescript
 * generateBarcodeToFile('123456789012', './barcodes/product.png', { format: 'EAN-13' });
 * ```
 */
export function generateBarcodeToFile(
  data: string,
  outputPath: string,
  options: BarcodeGenerateOptions = {}
): void {
  const absolutePath = path.resolve(outputPath);
  const dir = path.dirname(absolutePath);
  
  // 确保目录存在
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  const buffer = generateBarcode(data, options);
  fs.writeFileSync(absolutePath, buffer);
}

/**
 * 生成 SVG 格式的条形码
 * 
 * @param data - 要编码的数据
 * @param options - 生成选项
 * @returns SVG 字符串
 * 
 * @example
 * ```typescript
 * const svg = generateBarcodeSVG('123456789012', { format: 'EAN-13' });
 * fs.writeFileSync('barcode.svg', svg);
 * ```
 */
export function generateBarcodeSVG(data: string, options: BarcodeGenerateOptions = {}): string {
  const {
    format = 'Code-128',
    width = 2,
    height: barHeight = 50,
    showText = true,
    textLocation = 'bottom',
    fontSize = 12,
    foregroundColor = '000000',
    backgroundColor = 'ffffff',
    margin = 10,
  } = options;

  const formatMap: Record<BarcodeFormat, string> = {
    'EAN-13': 'ean13',
    'EAN-8': 'ean8',
    'UPC-A': 'upca',
    'UPC-E': 'upce',
    'Code-128': 'code128',
    'Code-39': 'code39',
    'Code-93': 'code93',
    'ITF-14': 'itf14',
    'Codabar': 'codabar',
    'QR': 'qrcode',
    'DataMatrix': 'datamatrix',
    'PDF417': 'pdf417',
    'Aztec': 'aztec',
  };

  const bwipFormat = formatMap[format];
  if (!bwipFormat) {
    throw new Error(`不支持的条形码格式：${format}`);
  }

  try {
    const bwipjs = require('bwip-js');
    
    return bwipjs.toSVG({
      bcid: bwipFormat,
      text: data,
      scale: width,
      height: barHeight,
      includetext: showText,
      textxalign: 'center',
      textfont: 'Helvetica',
      textsize: fontSize,
      forecolor: foregroundColor,
      backgroundcolor: backgroundColor,
      padding: margin,
    });
  } catch (error) {
    throw new Error(`SVG 条形码生成失败：${(error as Error).message}`);
  }
}

/**
 * 批量生成条形码
 * 
 * @param items - 数据数组 [{data, outputPath}]
 * @param options - 生成选项
 * @returns 生成结果数组
 * 
 * @example
 * ```typescript
 * batchGenerateBarcodes([
 *   { data: '123456789012', outputPath: './barcodes/1.png' },
 *   { data: '987654321098', outputPath: './barcodes/2.png' },
 * ]);
 * ```
 */
export function batchGenerateBarcodes(
  items: Array<{ data: string; outputPath: string }>,
  options: BarcodeGenerateOptions = {}
): Array<{ success: boolean; outputPath?: string; error?: string }> {
  return items.map(item => {
    try {
      generateBarcodeToFile(item.data, item.outputPath, options);
      return { success: true, outputPath: item.outputPath };
    } catch (error) {
      return { 
        success: false, 
        error: (error as Error).message 
      };
    }
  });
}

// ==================== 条形码解析 ====================

/**
 * 解析条形码图片
 * 
 * @param imagePath - 图片路径
 * @returns 解析结果
 * 
 * @example
 * ```typescript
 * const result = parseBarcode('./barcode.png');
 * if (result.success) {
 *   console.log('数据:', result.data);
 *   console.log('格式:', result.format);
 * }
 * ```
 */
export function parseBarcode(imagePath: string): BarcodeParseResult {
  const absolutePath = path.resolve(imagePath);
  
  if (!fs.existsSync(absolutePath)) {
    return {
      success: false,
      error: '文件不存在',
    };
  }

  try {
    // 使用 @types/barcode-reader 和 barcode-reader 包
    // 注意：需要安装：npm install barcode-reader sharp
    const BarcodeReader = require('barcode-reader');
    const sharp = require('sharp');
    
    const reader = new BarcodeReader();
    
    return new Promise((resolve) => {
      reader.decode(absolutePath, (error: Error | null, result: any) => {
        if (error) {
          resolve({
            success: false,
            error: error.message,
          });
          return;
        }
        
        if (result && result.length > 0) {
          resolve({
            success: true,
            data: result[0].text,
            format: result[0].format,
          });
        } else {
          resolve({
            success: false,
            error: '未检测到条形码',
          });
        }
      });
    }) as unknown as BarcodeParseResult;
  } catch (error) {
    return {
      success: false,
      error: `解析失败：${(error as Error).message}`,
    };
  }
}

/**
 * 解析条形码 (同步版本，使用 sharp + zxing)
 * 
 * @param imagePath - 图片路径
 * @returns 解析结果
 */
export function parseBarcodeSync(imagePath: string): BarcodeParseResult {
  const absolutePath = path.resolve(imagePath);
  
  if (!fs.existsSync(absolutePath)) {
    return {
      success: false,
      error: '文件不存在',
    };
  }

  try {
    // 使用 @picocss/pico 或 node-zbar
    // 这里提供一个基于 node-zbar 的实现示例
    const zbar = require('node-zbar');
    
    const result = zbar.scan(absolutePath);
    
    if (result && result.length > 0) {
      return {
        success: true,
        data: result[0].text,
        format: result[0].type,
      };
    } else {
      return {
        success: false,
        error: '未检测到条形码',
      };
    }
  } catch (error) {
    return {
      success: false,
      error: `解析失败：${(error as Error).message}`,
    };
  }
}

/**
 * 批量解析条形码
 * 
 * @param imagePaths - 图片路径数组
 * @returns 解析结果数组
 * 
 * @example
 * ```typescript
 * const results = batchParseBarcodes(['./barcode1.png', './barcode2.png']);
 * results.forEach((result, index) => {
 *   if (result.success) {
 *     console.log(`${index + 1}: ${result.data}`);
 *   }
 * });
 * ```
 */
export function batchParseBarcodes(imagePaths: string[]): BarcodeParseResult[] {
  return imagePaths.map(path => parseBarcode(path));
}

// ==================== 校验码计算 ====================

/**
 * 计算 EAN-13 校验码
 * 
 * @param code - 12 位数字
 * @returns 完整的 13 位 EAN 码
 */
export function calculateEAN13Checksum(code: string): string {
  if (code.length !== 12 || !/^\d+$/.test(code)) {
    throw new Error('EAN-13 需要 12 位数字');
  }

  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(code[i], 10);
    sum += i % 2 === 0 ? digit : digit * 3;
  }

  const checksum = (10 - (sum % 10)) % 10;
  return code + checksum;
}

/**
 * 计算 UPC-A 校验码
 * 
 * @param code - 11 位数字
 * @returns 完整的 12 位 UPC 码
 */
export function calculateUPCAChecksum(code: string): string {
  if (code.length !== 11 || !/^\d+$/.test(code)) {
    throw new Error('UPC-A 需要 11 位数字');
  }

  let sum = 0;
  for (let i = 0; i < 11; i++) {
    const digit = parseInt(code[i], 10);
    sum += i % 2 === 0 ? digit * 3 : digit;
  }

  const checksum = (10 - (sum % 10)) % 10;
  return code + checksum;
}

/**
 * 计算 Code-128 校验码 (自动)
 * Code-128 的校验码由编码库自动处理
 * 
 * @param code - 数据字符串
 * @returns 包含校验码的完整 Code-128 数据
 */
export function calculateCode128Checksum(code: string): string {
  // Code-128 的校验码由编码库自动计算和添加
  // 这里只返回原始数据，实际校验码在生成时自动添加
  return code;
}

/**
 * 验证 EAN-13 校验码
 * 
 * @param code - 13 位 EAN 码
 * @returns 是否有效
 */
export function validateEAN13(code: string): boolean {
  if (code.length !== 13 || !/^\d+$/.test(code)) {
    return false;
  }

  const checksum = parseInt(code[12], 10);
  const sum = code.slice(0, 12).split('').reduce((acc, digit, i) => {
    return acc + parseInt(digit, 10) * (i % 2 === 0 ? 1 : 3);
  }, 0);
  const calculatedChecksum = (10 - (sum % 10)) % 10;

  return checksum === calculatedChecksum;
}

/**
 * 验证 UPC-A 校验码
 * 
 * @param code - 12 位 UPC 码
 * @returns 是否有效
 */
export function validateUPCA(code: string): boolean {
  if (code.length !== 12 || !/^\d+$/.test(code)) {
    return false;
  }

  const checksum = parseInt(code[11], 10);
  const sum = code.slice(0, 11).split('').reduce((acc, digit, i) => {
    return acc + parseInt(digit, 10) * (i % 2 === 0 ? 3 : 1);
  }, 0);
  const calculatedChecksum = (10 - (sum % 10)) % 10;

  return checksum === calculatedChecksum;
}

// ==================== 格式转换 ====================

/**
 * EAN-13 转 UPC-A (如果可能)
 * 
 * @param ean13 - 13 位 EAN 码
 * @returns UPC-A 码或 null
 */
export function ean13ToUPCA(ean13: string): string | null {
  if (!validateEAN13(ean13)) {
    return null;
  }

  // EAN-13 以 0 开头可以转换为 UPC-A
  if (ean13[0] === '0') {
    return ean13.slice(1, 13);
  }

  return null;
}

/**
 * UPC-A 转 EAN-13
 * 
 * @param upca - 12 位 UPC 码
 * @returns 13 位 EAN 码
 */
export function upcaToEAN13(upca: string): string {
  if (!validateUPCA(upca)) {
    throw new Error('无效的 UPC-A 码');
  }

  return '0' + upca;
}

// ==================== 工具函数 ====================

/**
 * 获取支持的条形码格式列表
 * 
 * @returns 格式数组
 */
export function getSupportedFormats(): BarcodeFormat[] {
  return [
    'EAN-13',
    'EAN-8',
    'UPC-A',
    'UPC-E',
    'Code-128',
    'Code-39',
    'Code-93',
    'ITF-14',
    'Codabar',
    'QR',
    'DataMatrix',
    'PDF417',
    'Aztec',
  ];
}

/**
 * 获取格式说明
 * 
 * @param format - 条形码格式
 * @returns 说明信息
 */
export function getFormatDescription(format: BarcodeFormat): string {
  const descriptions: Record<BarcodeFormat, string> = {
    'EAN-13': '国际商品条形码 (13 位数字)',
    'EAN-8': '缩短版商品条形码 (8 位数字)',
    'UPC-A': '美国通用商品代码 (12 位数字)',
    'UPC-E': '缩短版 UPC (6 位数字)',
    'Code-128': '高密度字母数字条形码',
    'Code-39': '字母数字条形码 (工业标准)',
    'Code-93': 'Code-39 的增强版',
    'ITF-14': '包装箱条形码 (14 位数字)',
    'Codabar': '图书馆/血库专用条形码',
    'QR': '二维码 (支持大量数据)',
    'DataMatrix': '小型二维码 (电子产品常用)',
    'PDF417': '堆叠式二维条形码',
    'Aztec': '高效二维码 (交通票务常用)',
  };

  return descriptions[format] || '未知格式';
}

/**
 * 验证数据是否符合指定格式
 * 
 * @param data - 要验证的数据
 * @param format - 条形码格式
 * @returns 是否有效
 */
export function validateDataForFormat(data: string, format: BarcodeFormat): boolean {
  switch (format) {
    case 'EAN-13':
      return /^\d{12}$/.test(data);
    case 'EAN-8':
      return /^\d{7}$/.test(data);
    case 'UPC-A':
      return /^\d{11}$/.test(data);
    case 'UPC-E':
      return /^\d{5,6}$/.test(data);
    case 'Code-128':
      return data.length > 0 && data.length <= 80;
    case 'Code-39':
      return /^[0-9A-Z \-\$.\/\+\%]+$/.test(data);
    case 'Code-93':
      return /^[0-9A-Z \-\$.\/\+\%]+$/.test(data);
    case 'ITF-14':
      return /^\d{13}$/.test(data);
    case 'Codabar':
      return /^[0-9\-\$\:\.\/\+]+$/.test(data);
    case 'QR':
      return data.length <= 4296;
    case 'DataMatrix':
      return data.length <= 3116;
    case 'PDF417':
      return data.length <= 2710;
    case 'Aztec':
      return data.length <= 3832;
    default:
      return false;
  }
}

// ==================== 导出 ====================

export const BarcodeUtils = {
  // 生成
  generate: generateBarcode,
  generateToFile: generateBarcodeToFile,
  generateSVG: generateBarcodeSVG,
  batchGenerate: batchGenerateBarcodes,
  
  // 解析
  parse: parseBarcode,
  parseSync: parseBarcodeSync,
  batchParse: batchParseBarcodes,
  
  // 校验码
  calculateEAN13Checksum,
  calculateUPCAChecksum,
  calculateCode128Checksum,
  validateEAN13,
  validateUPCA,
  
  // 格式转换
  ean13ToUPCA,
  upcaToEAN13,
  
  // 工具
  getSupportedFormats,
  getFormatDescription,
  validateDataForFormat,
};

export default BarcodeUtils;
