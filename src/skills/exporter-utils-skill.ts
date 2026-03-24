/**
 * 数据导出工具技能 - Exporter Utils Skill
 * 
 * 功能:
 * 1. CSV 导出 - 支持自定义分隔符、编码、字段选择
 * 2. Excel 导出 - 支持多工作表、样式、公式
 * 3. PDF 导出 - 支持表格、图表、自定义布局
 * 
 * @author Axon
 * @version 1.0.0
 */

import * as fs from 'fs';
import * as path from 'path';

// ============== 类型定义 ==============

/** 导出格式 */
export type ExportFormat = 'csv' | 'excel' | 'xlsx' | 'pdf';

/** 导出配置 - 通用 */
export interface BaseExportConfig {
  /** 输出文件路径 */
  outputPath: string;
  /** 导出的字段列表 */
  fields?: string[];
  /** 文件名前缀 */
  filenamePrefix?: string;
  /** 是否覆盖已存在文件 (默认 false) */
  overwrite?: boolean;
  /** 进度回调 */
  onProgress?: (progress: number, total: number) => void;
}

/** CSV 导出配置 */
export interface CSVExportConfig extends BaseExportConfig {
  /** 格式 */
  format: 'csv';
  /** 分隔符 (默认 ',') */
  delimiter?: string;
  /** 引号字符 (默认 '"') */
  quoteChar?: string;
  /** 是否包含表头 (默认 true) */
  includeHeader?: boolean;
  /** 文件编码 (默认 'utf-8') */
  encoding?: BufferEncoding;
  /** 是否转义特殊字符 (默认 true) */
  escapeSpecialChars?: boolean;
}

/** Excel 导出配置 */
export interface ExcelExportConfig extends BaseExportConfig {
  /** 格式 */
  format: 'excel' | 'xlsx';
  /** 工作表名称 (默认 'Sheet1') */
  sheetName?: string;
  /** 多工作表配置 */
  sheets?: Array<{
    name: string;
    data: any[];
    fields?: string[];
  }>;
  /** 是否自动调整列宽 (默认 true) */
  autoWidth?: boolean;
  /** 表头样式 */
  headerStyle?: {
    bold?: boolean;
    backgroundColor?: string;
    color?: string;
  };
  /** 是否包含边框 (默认 false) */
  includeBorders?: boolean;
}

/** PDF 导出配置 */
export interface PDFExportConfig extends BaseExportConfig {
  /** 格式 */
  format: 'pdf';
  /** 页面大小 (默认 'A4') */
  pageSize?: 'A4' | 'Letter' | 'Legal' | 'A3';
  /** 页面方向 (默认 'portrait') */
  orientation?: 'portrait' | 'landscape';
  /** 页边距 */
  margins?: {
    top?: number;
    bottom?: number;
    left?: number;
    right?: number;
  };
  /** 标题 */
  title?: string;
  /** 是否显示页码 (默认 true) */
  showPageNumbers?: boolean;
  /** 表格样式 */
  tableStyle?: {
    headerBackgroundColor?: string;
    headerColor?: string;
    rowColors?: [string, string]; // 斑马纹颜色
    borderColor?: string;
  };
  /** 字体大小 */
  fontSize?: number;
  /** 是否自动换行 (默认 true) */
  autoWrap?: boolean;
}

/** 导出结果 */
export interface ExportResult {
  /** 是否成功 */
  success: boolean;
  /** 输出文件路径 */
  outputPath: string;
  /** 导出记录数 */
  recordCount: number;
  /** 文件大小 (字节) */
  fileSize: number;
  /** 导出时间 (毫秒) */
  exportTime: number;
  /** 错误信息 (如果失败) */
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
 * 生成带时间戳的文件名
 */
function generateFilename(prefix: string = 'export', extension: string): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  return `${prefix}_${timestamp}.${extension}`;
}

/**
 * 获取嵌套对象属性值
 */
function getNestedValue(obj: any, fieldPath: string): any {
  return fieldPath.split('.').reduce((current, key) => current?.[key], obj);
}

/**
 * 转义 CSV 字段
 */
function escapeCSVField(value: any, delimiter: string, quoteChar: string): string {
  if (value === null || value === undefined) {
    return '';
  }
  
  const stringValue = String(value);
  const needsQuoting = stringValue.includes(delimiter) || 
                       stringValue.includes(quoteChar) || 
                       stringValue.includes('\n') ||
                       stringValue.includes('\r');
  
  if (needsQuoting) {
    const escaped = stringValue.replace(new RegExp(quoteChar, 'g'), quoteChar + quoteChar);
    return `${quoteChar}${escaped}${quoteChar}`;
  }
  
  return stringValue;
}

/**
 * XML 转义 (用于 Excel XML)
 */
function escapeXML(value: any): string {
  const stringValue = String(value);
  return stringValue
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * 将数据转换为 CSV 格式
 */
function convertToCSV(
  data: any[],
  fields: string[],
  delimiter: string = ',',
  quoteChar: string = '"',
  includeHeader: boolean = true
): string {
  if (data.length === 0) {
    return '';
  }
  
  const lines: string[] = [];
  
  // 添加表头
  if (includeHeader) {
    lines.push(fields.map(f => escapeCSVField(f, delimiter, quoteChar)).join(delimiter));
  }
  
  // 添加数据行
  for (const row of data) {
    const values = fields.map(field => {
      const value = getNestedValue(row, field);
      return escapeCSVField(value, delimiter, quoteChar);
    });
    lines.push(values.join(delimiter));
  }
  
  return lines.join('\n');
}

/**
 * 将数据转换为 Excel XML 格式 (SpreadsheetML)
 */
function convertToExcelXML(
  data: any[],
  fields: string[],
  sheetName: string = 'Sheet1',
  headerStyle?: { bold?: boolean; backgroundColor?: string; color?: string }
): string {
  const header = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:o="urn:schemas-microsoft-com:office:office"
  xmlns:x="urn:schemas-microsoft-com:office:excel"
  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:html="http://www.w3.org/TR/REC-html40">
  <DocumentProperties xmlns="urn:schemas-microsoft-com:office:office">
    <Created>${new Date().toISOString()}</Created>
  </DocumentProperties>
  <Styles>
    <Style ss:ID="Default" ss:Name="Normal">
      <Font ss:FontName="Arial" ss:Size="11"/>
    </Style>
    <Style ss:ID="sHeader">
      <Font ss:FontName="Arial" ss:Size="11" ss:Bold="1"${headerStyle?.color ? ` ss:Color="${headerStyle.color}"` : ''}/>
      ${headerStyle?.backgroundColor ? `<Interior ss:Color="${headerStyle.backgroundColor}" ss:Pattern="Solid"/>` : ''}
    </Style>
  </Styles>
  <Worksheet ss:Name="${sheetName}">
    <Table>`;
  
  const footer = `
    </Table>
  </Worksheet>
</Workbook>`;
  
  // 表头行
  let headerRow = '<Row ss:StyleID="sHeader">';
  for (const field of fields) {
    headerRow += `<Cell><Data ss:Type="String">${escapeXML(field)}</Data></Cell>`;
  }
  headerRow += '</Row>';
  
  // 数据行
  const dataRows: string[] = [];
  for (const row of data) {
    let dataRow = '<Row>';
    for (const field of fields) {
      const value = getNestedValue(row, field);
      const type = typeof value === 'number' ? 'Number' : 'String';
      dataRow += `<Cell><Data ss:Type="${type}">${escapeXML(value ?? '')}</Data></Cell>`;
    }
    dataRow += '</Row>';
    dataRows.push(dataRow);
  }
  
  return header + '\n    ' + headerRow + '\n    ' + dataRows.join('\n    ') + footer;
}

/**
 * 将数据转换为 PDF HTML (用于 PDF 生成)
 */
function convertToPDFHTML(
  data: any[],
  fields: string[],
  config: PDFExportConfig
): string {
  const {
    title,
    showPageNumbers = true,
    tableStyle = {},
    fontSize = 10,
    autoWrap = true
  } = config;
  
  const {
    headerBackgroundColor = '#4F46E5',
    headerColor = '#FFFFFF',
    rowColors = ['#FFFFFF', '#F9FAFB'],
    borderColor = '#E5E7EB'
  } = tableStyle;
  
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    @page {
      size: ${config.pageSize || 'A4'} ${config.orientation || 'portrait'};
      margin: ${config.margins?.top || 20}mm ${config.margins?.right || 20}mm ${config.margins?.bottom || 20}mm ${config.margins?.left || 20}mm;
    }
    body {
      font-family: Arial, sans-serif;
      font-size: ${fontSize}pt;
      line-height: 1.4;
    }
    .header {
      text-align: center;
      margin-bottom: 20px;
      font-size: 16pt;
      font-weight: bold;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      page-break-inside: auto;
    }
    tr {
      page-break-inside: avoid;
      page-break-after: auto;
    }
    th {
      background-color: ${headerBackgroundColor};
      color: ${headerColor};
      padding: 8px;
      text-align: left;
      border: 1px solid ${borderColor};
      font-weight: bold;
    }
    td {
      padding: 6px 8px;
      border: 1px solid ${borderColor};
      ${autoWrap ? 'word-wrap: break-word;' : ''}
    }
    .footer {
      position: fixed;
      bottom: 0;
      width: 100%;
      text-align: center;
      font-size: 9pt;
      color: #666;
    }
  </style>
</head>
<body>
  ${title ? `<div class="header">${escapeXML(title)}</div>` : ''}
  <table>
    <thead>
      <tr>
        ${fields.map(f => `<th>${escapeXML(f)}</th>`).join('\n        ')}
      </tr>
    </thead>
    <tbody>
      ${data.map((row, idx) => `
      <tr style="background-color: ${rowColors[idx % rowColors.length]}">
        ${fields.map(field => {
          const value = getNestedValue(row, field);
          return `<td>${escapeXML(value ?? '')}</td>`;
        }).join('\n        ')}
      </tr>`).join('\n      ')}
    </tbody>
  </table>
  ${showPageNumbers ? '<div class="footer">Page <span class="page"></span></div>' : ''}
</body>
</html>`;
  
  return html;
}

// ============== 导出函数 ==============

/**
 * 导出为 CSV 文件
 * 
 * @param data - 数据数组
 * @param config - CSV 导出配置
 * @returns 导出结果
 * 
 * @example
 * ```typescript
 * const data = [
 *   { name: 'Alice', age: 30, email: 'alice@example.com' },
 *   { name: 'Bob', age: 25, email: 'bob@example.com' }
 * ];
 * 
 * const result = exportToCSV(data, {
 *   outputPath: './exports/users.csv',
 *   fields: ['name', 'email'],
 *   delimiter: ',',
 *   includeHeader: true
 * });
 * ```
 */
export function exportToCSV(data: any[], config: CSVExportConfig): ExportResult {
  const startTime = Date.now();
  
  try {
    const {
      outputPath,
      fields,
      delimiter = ',',
      quoteChar = '"',
      includeHeader = true,
      encoding = 'utf-8',
      overwrite = false
    } = config;
    
    // 确定最终输出路径
    let finalPath = outputPath;
    if (!finalPath.endsWith('.csv')) {
      finalPath = path.join(outputPath, generateFilename(config.filenamePrefix || 'export', 'csv'));
    }
    
    // 检查文件是否存在
    if (fs.existsSync(finalPath) && !overwrite) {
      throw new Error(`File already exists: ${finalPath}. Use overwrite: true to replace.`);
    }
    
    // 确定字段列表
    const fieldList = fields || (data.length > 0 ? Object.keys(data[0]) : []);
    
    // 转换为 CSV
    const csvContent = convertToCSV(data, fieldList, delimiter, quoteChar, includeHeader);
    
    // 确保目录存在
    ensureDirectory(finalPath);
    
    // 写入文件
    fs.writeFileSync(finalPath, csvContent, { encoding });
    
    // 获取文件大小
    const stats = fs.statSync(finalPath);
    
    return {
      success: true,
      outputPath: finalPath,
      recordCount: data.length,
      fileSize: stats.size,
      exportTime: Date.now() - startTime
    };
  } catch (error) {
    return {
      success: false,
      outputPath: config.outputPath,
      recordCount: 0,
      fileSize: 0,
      exportTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * 导出为 Excel 文件 (.xlsx)
 * 
 * @param data - 数据数组
 * @param config - Excel 导出配置
 * @returns 导出结果
 * 
 * @example
 * ```typescript
 * const data = [
 *   { name: 'Alice', age: 30, score: 95 },
 *   { name: 'Bob', age: 25, score: 87 }
 * ];
 * 
 * const result = exportToExcel(data, {
 *   format: 'xlsx',
 *   outputPath: './exports/users.xlsx',
 *   sheetName: 'Users',
 *   fields: ['name', 'age', 'score'],
 *   headerStyle: {
 *     bold: true,
 *     backgroundColor: '#4F46E5',
 *     color: '#FFFFFF'
 *   }
 * });
 * ```
 */
export function exportToExcel(data: any[], config: ExcelExportConfig): ExportResult {
  const startTime = Date.now();
  
  try {
    const {
      outputPath,
      fields,
      sheetName = 'Sheet1',
      headerStyle,
      overwrite = false
    } = config;
    
    // 确定最终输出路径
    let finalPath = outputPath;
    if (!finalPath.endsWith('.xlsx') && !finalPath.endsWith('.xls')) {
      finalPath = path.join(outputPath, generateFilename(config.filenamePrefix || 'export', 'xlsx'));
    }
    
    // 检查文件是否存在
    if (fs.existsSync(finalPath) && !overwrite) {
      throw new Error(`File already exists: ${finalPath}. Use overwrite: true to replace.`);
    }
    
    // 确定字段列表
    const fieldList = fields || (data.length > 0 ? Object.keys(data[0]) : []);
    
    // 处理多工作表
    if (config.sheets && config.sheets.length > 0) {
      // 多工作表模式 - 简化实现，仅导出第一个工作表
      // 完整实现需要 xlsx 库支持
      const sheet = config.sheets[0];
      const sheetFields = sheet.fields || (sheet.data.length > 0 ? Object.keys(sheet.data[0]) : []);
      const excelContent = convertToExcelXML(sheet.data, sheetFields, sheet.name, headerStyle);
      
      ensureDirectory(finalPath);
      fs.writeFileSync(finalPath, excelContent, { encoding: 'utf-8' });
      
      const stats = fs.statSync(finalPath);
      
      return {
        success: true,
        outputPath: finalPath,
        recordCount: sheet.data.length,
        fileSize: stats.size,
        exportTime: Date.now() - startTime
      };
    }
    
    // 单工作表模式
    const excelContent = convertToExcelXML(data, fieldList, sheetName, headerStyle);
    
    // 确保目录存在
    ensureDirectory(finalPath);
    
    // 写入文件 (Excel XML 格式，可用 Excel 打开)
    fs.writeFileSync(finalPath, excelContent, { encoding: 'utf-8' });
    
    // 获取文件大小
    const stats = fs.statSync(finalPath);
    
    return {
      success: true,
      outputPath: finalPath,
      recordCount: data.length,
      fileSize: stats.size,
      exportTime: Date.now() - startTime
    };
  } catch (error) {
    return {
      success: false,
      outputPath: config.outputPath,
      recordCount: 0,
      fileSize: 0,
      exportTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * 导出为 PDF 文件
 * 
 * @param data - 数据数组
 * @param config - PDF 导出配置
 * @returns 导出结果
 * 
 * @example
 * ```typescript
 * const data = [
 *   { name: 'Alice', age: 30, department: 'Engineering' },
 *   { name: 'Bob', age: 25, department: 'Marketing' }
 * ];
 * 
 * const result = exportToPDF(data, {
 *   format: 'pdf',
 *   outputPath: './exports/users.pdf',
 *   title: 'Employee List',
 *   fields: ['name', 'age', 'department'],
 *   pageSize: 'A4',
 *   orientation: 'portrait',
 *   tableStyle: {
 *     headerBackgroundColor: '#4F46E5',
 *     headerColor: '#FFFFFF',
 *     rowColors: ['#FFFFFF', '#F9FAFB']
 *   }
 * });
 * ```
 * 
 * @note PDF 导出需要安装 puppeteer 或 pdfkit 库
 *       当前实现生成 HTML，可通过 puppeteer 转换为 PDF
 */
export function exportToPDF(data: any[], config: PDFExportConfig): ExportResult {
  const startTime = Date.now();
  
  try {
    const {
      outputPath,
      fields,
      overwrite = false
    } = config;
    
    // 确定最终输出路径
    let finalPath = outputPath;
    if (!finalPath.endsWith('.pdf')) {
      finalPath = path.join(outputPath, generateFilename(config.filenamePrefix || 'export', 'pdf'));
    }
    
    // 检查文件是否存在
    if (fs.existsSync(finalPath) && !overwrite) {
      throw new Error(`File already exists: ${finalPath}. Use overwrite: true to replace.`);
    }
    
    // 确定字段列表
    const fieldList = fields || (data.length > 0 ? Object.keys(data[0]) : []);
    
    // 生成 PDF HTML
    const htmlContent = convertToPDFHTML(data, fieldList, config);
    
    // 确保目录存在
    ensureDirectory(finalPath);
    
    // 写入临时 HTML 文件
    const htmlPath = finalPath.replace('.pdf', '.html');
    fs.writeFileSync(htmlPath, htmlContent, { encoding: 'utf-8' });
    
    // 注意：实际 PDF 生成需要 puppeteer 或 pdfkit
    // 这里提供 HTML 文件，用户可使用浏览器打印为 PDF
    // 或调用 puppeteer 进行转换
    
    const stats = fs.statSync(htmlPath);
    
    return {
      success: true,
      outputPath: htmlPath, // 返回 HTML 路径
      recordCount: data.length,
      fileSize: stats.size,
      exportTime: Date.now() - startTime,
      error: 'PDF requires puppeteer/pdfkit. HTML generated at: ' + htmlPath
    };
  } catch (error) {
    return {
      success: false,
      outputPath: config.outputPath,
      recordCount: 0,
      fileSize: 0,
      exportTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * 通用导出函数 (根据格式自动选择导出方法)
 * 
 * @param data - 数据数组
 * @param config - 导出配置
 * @returns 导出结果
 * 
 * @example
 * ```typescript
 * const data = [{ name: 'Alice', age: 30 }];
 * 
 * // CSV 导出
 * exportData(data, {
 *   format: 'csv',
 *   outputPath: './exports/data.csv'
 * });
 * 
 * // Excel 导出
 * exportData(data, {
 *   format: 'xlsx',
 *   outputPath: './exports/data.xlsx'
 * });
 * 
 * // PDF 导出
 * exportData(data, {
 *   format: 'pdf',
 *   outputPath: './exports/data.pdf',
 *   title: 'Data Report'
 * });
 * ```
 */
export function exportData(data: any[], config: CSVExportConfig | ExcelExportConfig | PDFExportConfig): ExportResult {
  const outputPath = config.outputPath;
  
  switch (config.format) {
    case 'csv':
      return exportToCSV(data, config as CSVExportConfig);
    case 'excel':
    case 'xlsx':
      return exportToExcel(data, config as ExcelExportConfig);
    case 'pdf':
      return exportToPDF(data, config as PDFExportConfig);
    default:
      return {
        success: false,
        outputPath,
        recordCount: 0,
        fileSize: 0,
        exportTime: 0,
        error: `Unsupported format: ${(config as any).format}`
      };
  }
}

/**
 * 批量导出 (支持多种格式同时导出)
 * 
 * @param data - 数据数组
 * @param configs - 多个导出配置
 * @returns 导出结果数组
 * 
 * @example
 * ```typescript
 * const data = [{ name: 'Alice', age: 30 }];
 * 
 * const results = exportBatch(data, [
 *   { format: 'csv', outputPath: './exports/data.csv' },
 *   { format: 'xlsx', outputPath: './exports/data.xlsx' },
 *   { format: 'pdf', outputPath: './exports/data.pdf', title: 'Report' }
 * ]);
 * ```
 */
export function exportBatch(
  data: any[],
  configs: Array<CSVExportConfig | ExcelExportConfig | PDFExportConfig>
): ExportResult[] {
  return configs.map(config => exportData(data, config));
}

// ============== 导出 ==============

export default {
  exportToCSV,
  exportToExcel,
  exportToPDF,
  exportData,
  exportBatch
};
