/**
 * 导出管理技能 - Export Manager Skill
 * 
 * 功能:
 * 1. CSV 导出 - 逗号分隔值格式
 * 2. Excel 导出 - XLSX 格式 (使用 xml2js 轻量实现)
 * 3. JSON 导出 - JSON 格式 (支持格式化/压缩)
 * 
 * @author KAEL
 * @version 1.0.0
 */

import * as fs from 'fs';
import * as path from 'path';

// ============== 类型定义 ==============

/**
 * 导出格式枚举
 */
export enum ExportFormat {
  CSV = 'csv',
  EXCEL = 'excel',
  JSON = 'json'
}

/**
 * 导出选项
 */
export interface ExportOptions {
  /** 导出格式 */
  format: ExportFormat;
  /** 输出文件路径 */
  outputPath: string;
  /** CSV/Excel: 列名映射 (可选) */
  columns?: string[];
  /** JSON: 是否格式化 (缩进) */
  pretty?: boolean;
  /** CSV: 分隔符，默认为逗号 */
  delimiter?: string;
  /** CSV/Excel: 是否包含 BOM (用于 Excel 中文支持) */
  includeBOM?: boolean;
  /** 覆盖已存在文件，默认为 true */
  overwrite?: boolean;
}

/**
 * 导出数据 (数组对象或二维数组)
 */
export type ExportData<T = any> = T[] | any[][];

/**
 * 导出结果
 */
export interface ExportResult {
  /** 是否成功 */
  success: boolean;
  /** 输出文件路径 */
  outputPath: string;
  /** 导出记录数 */
  recordCount: number;
  /** 文件大小 (字节) */
  fileSize: number;
  /** 错误信息 (失败时) */
  error?: string;
}

// ============== 工具函数 ==============

/**
 * 确保目录存在
 */
function ensureDirectory(filePath: string): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * 检查文件是否可写入
 */
function canWriteFile(filePath: string, overwrite: boolean): boolean {
  if (fs.existsSync(filePath)) {
    return overwrite;
  }
  return true;
}

/**
 * 获取文件大小
 */
function getFileSize(filePath: string): number {
  try {
    const stats = fs.statSync(filePath);
    return stats.size;
  } catch {
    return 0;
  }
}

/**
 * 转义 CSV 字段值
 */
function escapeCSVField(value: any, delimiter: string): string {
  if (value === null || value === undefined) {
    return '';
  }
  
  const stringValue = String(value);
  
  // 如果包含分隔符、引号或换行，需要转义
  if (stringValue.includes(delimiter) || stringValue.includes('"') || stringValue.includes('\n')) {
    // 双引号转义
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  
  return stringValue;
}

/**
 * 从对象数组中提取键名
 */
function extractKeys<T extends Record<string, any>>(data: T[]): string[] {
  const keys = new Set<string>();
  for (const item of data) {
    if (typeof item === 'object' && item !== null) {
      Object.keys(item).forEach(key => keys.add(key));
    }
  }
  return Array.from(keys);
}

// ============== CSV 导出 ==============

/**
 * 将数据转换为 CSV 格式字符串
 * 
 * @param data 导出数据
 * @param options 导出选项
 * @returns CSV 格式字符串
 */
function convertToCSV<T extends Record<string, any>>(
  data: T[],
  options: { columns?: string[]; delimiter?: string; includeBOM?: boolean }
): string {
  const { columns, delimiter = ',', includeBOM = false } = options;
  
  if (data.length === 0) {
    return includeBOM ? '\uFEFF' : '';
  }
  
  // 确定列名
  const headers = columns || extractKeys(data);
  
  // 构建 CSV 内容
  const lines: string[] = [];
  
  // 添加 BOM (用于 Excel 中文支持)
  if (includeBOM) {
    lines.push('\uFEFF');
  }
  
  // 添加表头
  lines.push(headers.map(h => escapeCSVField(h, delimiter)).join(delimiter));
  
  // 添加数据行
  for (const row of data) {
    const values = headers.map(header => {
      const value = (row as any)[header];
      return escapeCSVField(value, delimiter);
    });
    lines.push(values.join(delimiter));
  }
  
  return lines.join('\n');
}

/**
 * 导出 CSV 文件
 * 
 * @param data 导出数据
 * @param outputPath 输出路径
 * @param options 导出选项
 * @returns 导出结果
 */
export function exportCSV<T extends Record<string, any>>(
  data: T[],
  outputPath: string,
  options: { columns?: string[]; delimiter?: string; includeBOM?: boolean; overwrite?: boolean } = {}
): ExportResult {
  const { overwrite = true } = options;
  
  try {
    // 检查文件是否可写入
    if (!canWriteFile(outputPath, overwrite)) {
      return {
        success: false,
        outputPath,
        recordCount: 0,
        fileSize: 0,
        error: 'File already exists and overwrite is disabled'
      };
    }
    
    // 确保目录存在
    ensureDirectory(outputPath);
    
    // 转换并写入
    const csvContent = convertToCSV(data, options);
    fs.writeFileSync(outputPath, csvContent, 'utf-8');
    
    return {
      success: true,
      outputPath,
      recordCount: data.length,
      fileSize: getFileSize(outputPath)
    };
  } catch (error) {
    return {
      success: false,
      outputPath,
      recordCount: 0,
      fileSize: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// ============== Excel 导出 ==============

/**
 * 将数据转换为简易 XLSX 格式 (XML-based)
 * 注意: 这是简化实现，复杂 Excel 功能建议使用 exceljs 库
 * 
 * @param data 导出数据
 * @param options 导出选项
 * @returns XLSX 格式 Buffer
 */
function convertToExcel<T extends Record<string, any>>(
  data: T[],
  options: { columns?: string[]; includeBOM?: boolean }
): Buffer {
  const { columns, includeBOM = false } = options;
  
  // 确定列名
  const headers = columns || (data.length > 0 ? extractKeys(data) : []);
  
  // 构建 XML 内容 (SpreadsheetML 简化版)
  const xmlParts: string[] = [];
  
  // XML 声明
  xmlParts.push('<?xml version="1.0" encoding="UTF-8"?>');
  xmlParts.push('<?mso-application progid="Excel.Sheet"?>');
  xmlParts.push('<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"');
  xmlParts.push(' xmlns:o="urn:schemas-microsoft-com:office:office"');
  xmlParts.push(' xmlns:x="urn:schemas-microsoft-com:office:excel"');
  xmlParts.push(' xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">');
  
  // 样式
  xmlParts.push('<Styles>');
  xmlParts.push('  <Style ss:ID="Default" ss:Name="Normal">');
  xmlParts.push('    <Alignment ss:Vertical="Bottom"/>');
  xmlParts.push('    <Borders/>');
  xmlParts.push('    <Font/>');
  xmlParts.push('    <Interior/>');
  xmlParts.push('    <NumberFormat/>');
  xmlParts.push('    <Protection/>');
  xmlParts.push('  </Style>');
  xmlParts.push('  <Style ss:ID="sHeader">');
  xmlParts.push('    <Font ss:Bold="1"/>');
  xmlParts.push('    <Interior ss:Color="#CCCCCC" ss:Pattern="Solid"/>');
  xmlParts.push('  </Style>');
  xmlParts.push('</Styles>');
  
  // 工作表
  xmlParts.push('<Worksheet ss:Name="Sheet1">');
  xmlParts.push('  <Table>');
  
  // 定义列
  xmlParts.push(`    <Column ss:Width="100"/>`.repeat(headers.length));
  
  // 表头行
  if (headers.length > 0) {
    xmlParts.push('    <Row ss:StyleID="sHeader">');
    for (const header of headers) {
      xmlParts.push(`      <Cell><Data ss:Type="String">${escapeXML(String(header))}</Data></Cell>`);
    }
    xmlParts.push('    </Row>');
  }
  
  // 数据行
  for (const row of data) {
    xmlParts.push('    <Row>');
    for (const header of headers) {
      const value = (row as any)[header];
      const cellType = getExcelCellType(value);
      const cellValue = value === null || value === undefined ? '' : String(value);
      xmlParts.push(`      <Cell><Data ss:Type="${cellType}">${escapeXML(cellValue)}</Data></Cell>`);
    }
    xmlParts.push('    </Row>');
  }
  
  xmlParts.push('  </Table>');
  xmlParts.push('</Worksheet>');
  xmlParts.push('</Workbook>');
  
  const xmlContent = xmlParts.join('\n');
  
  // 添加 BOM (如果需要)
  const bom = includeBOM ? '\uFEFF' : '';
  return Buffer.from(bom + xmlContent, 'utf-8');
}

/**
 * 获取 Excel 单元格类型
 */
function getExcelCellType(value: any): string {
  if (value === null || value === undefined) {
    return 'String';
  }
  if (typeof value === 'number') {
    return 'Number';
  }
  if (typeof value === 'boolean') {
    return 'Boolean';
  }
  return 'String';
}

/**
 * 转义 XML 特殊字符
 */
function escapeXML(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * 导出 Excel 文件 (XML-based XLSX)
 * 
 * @param data 导出数据
 * @param outputPath 输出路径
 * @param options 导出选项
 * @returns 导出结果
 */
export function exportExcel<T extends Record<string, any>>(
  data: T[],
  outputPath: string,
  options: { columns?: string[]; includeBOM?: boolean; overwrite?: boolean } = {}
): ExportResult {
  const { overwrite = true } = options;
  
  try {
    // 检查文件是否可写入
    if (!canWriteFile(outputPath, overwrite)) {
      return {
        success: false,
        outputPath,
        recordCount: 0,
        fileSize: 0,
        error: 'File already exists and overwrite is disabled'
      };
    }
    
    // 确保目录存在
    ensureDirectory(outputPath);
    
    // 转换并写入
    const excelBuffer = convertToExcel(data, options);
    fs.writeFileSync(outputPath, excelBuffer);
    
    return {
      success: true,
      outputPath,
      recordCount: data.length,
      fileSize: getFileSize(outputPath)
    };
  } catch (error) {
    return {
      success: false,
      outputPath,
      recordCount: 0,
      fileSize: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// ============== JSON 导出 ==============

/**
 * 导出 JSON 文件
 * 
 * @param data 导出数据
 * @param outputPath 输出路径
 * @param options 导出选项
 * @returns 导出结果
 */
export function exportJSON<T>(
  data: T | T[],
  outputPath: string,
  options: { pretty?: boolean; overwrite?: boolean } = {}
): ExportResult {
  const { pretty = true, overwrite = true } = options;
  
  try {
    // 检查文件是否可写入
    if (!canWriteFile(outputPath, overwrite)) {
      return {
        success: false,
        outputPath,
        recordCount: 0,
        fileSize: 0,
        error: 'File already exists and overwrite is disabled'
      };
    }
    
    // 确保目录存在
    ensureDirectory(outputPath);
    
    // 计算记录数
    const recordCount = Array.isArray(data) ? data.length : 1;
    
    // 序列化 JSON
    const jsonContent = pretty
      ? JSON.stringify(data, null, 2)
      : JSON.stringify(data);
    
    // 写入文件
    fs.writeFileSync(outputPath, jsonContent, 'utf-8');
    
    return {
      success: true,
      outputPath,
      recordCount,
      fileSize: getFileSize(outputPath)
    };
  } catch (error) {
    return {
      success: false,
      outputPath,
      recordCount: 0,
      fileSize: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// ============== 统一导出接口 ==============

/**
 * 统一导出函数
 * 
 * @param data 导出数据
 * @param options 导出选项
 * @returns 导出结果
 * 
 * @example
 * exportData(users, { format: ExportFormat.CSV, outputPath: './users.csv' })
 * exportData(users, { format: ExportFormat.EXCEL, outputPath: './users.xlsx' })
 * exportData(users, { format: ExportFormat.JSON, outputPath: './users.json', pretty: true })
 */
export function exportData<T extends Record<string, any> | any[]>(
  data: T,
  options: ExportOptions
): ExportResult {
  const { format, outputPath } = options;
  
  switch (format) {
    case ExportFormat.CSV:
      if (!Array.isArray(data)) {
        return {
          success: false,
          outputPath,
          recordCount: 0,
          fileSize: 0,
          error: 'CSV export requires array data'
        };
      }
      return exportCSV(data, outputPath, options);
    
    case ExportFormat.EXCEL:
      if (!Array.isArray(data)) {
        return {
          success: false,
          outputPath,
          recordCount: 0,
          fileSize: 0,
          error: 'Excel export requires array data'
        };
      }
      return exportExcel(data, outputPath, options);
    
    case ExportFormat.JSON:
      return exportJSON(data, outputPath, options);
    
    default:
      return {
        success: false,
        outputPath,
        recordCount: 0,
        fileSize: 0,
        error: `Unsupported format: ${format}`
      };
  }
}

// ============== 批量导出 ==============

/**
 * 批量导出任务
 */
export interface BatchExportTask<T> {
  /** 任务名称 */
  name: string;
  /** 导出数据 */
  data: T | T[];
  /** 导出格式 */
  format: ExportFormat;
  /** 输出路径 */
  outputPath: string;
  /** 导出选项 */
  options?: Omit<ExportOptions, 'format' | 'outputPath'>;
}

/**
 * 批量导出结果
 */
export interface BatchExportResult {
  /** 总任务数 */
  totalTasks: number;
  /** 成功任务数 */
  successCount: number;
  /** 失败任务数 */
  failureCount: number;
  /** 各任务结果 */
  results: Array<{
    name: string;
    result: ExportResult;
  }>;
}

/**
 * 批量导出
 * 
 * @param tasks 导出任务列表
 * @returns 批量导出结果
 */
export function batchExport<T extends Record<string, any> | any[]>(
  tasks: BatchExportTask<T>[]
): BatchExportResult {
  const results: Array<{ name: string; result: ExportResult }> = [];
  let successCount = 0;
  let failureCount = 0;
  
  for (const task of tasks) {
    const result = exportData(task.data, {
      format: task.format,
      outputPath: task.outputPath,
      ...task.options
    });
    
    results.push({ name: task.name, result });
    
    if (result.success) {
      successCount++;
    } else {
      failureCount++;
    }
  }
  
  return {
    totalTasks: tasks.length,
    successCount,
    failureCount,
    results
  };
}

// ============== 导出默认对象 ==============

export default {
  ExportFormat,
  exportCSV,
  exportExcel,
  exportJSON,
  exportData,
  batchExport
};
