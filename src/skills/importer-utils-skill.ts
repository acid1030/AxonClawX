/**
 * 数据导入工具技能
 * 
 * 功能:
 * 1. CSV 解析 (支持自定义分隔符、编码)
 * 2. JSON 解析 (支持嵌套结构、大文件流式处理)
 * 3. Excel 解析 (.xlsx/.xls，需要 xlsx 库)
 * 
 * @module skills/importer-utils
 * 
 * @example
 * ```typescript
 * import { parseCSV, parseJSON, parseExcel } from './importer-utils-skill';
 * 
 * // CSV 解析
 * const csvData = await parseCSV('data.csv', { delimiter: ',', encoding: 'utf-8' });
 * 
 * // JSON 解析
 * const jsonData = await parseJSON('data.json', { nested: true });
 * 
 * // Excel 解析
 * const excelData = await parseExcel('data.xlsx', { sheet: 0 });
 * ```
 */

import * as fs from 'fs';
import * as path from 'path';

// ==================== 类型定义 ====================

/**
 * CSV 解析选项
 */
export interface CSVOptions {
  /** 分隔符，默认 ',' */
  delimiter?: string;
  /** 文件编码，默认 'utf-8' */
  encoding?: BufferEncoding;
  /** 是否包含表头，默认 true */
  hasHeader?: boolean;
  /** 自定义表头 (当 hasHeader=false 时使用) */
  headers?: string[];
  /** 是否跳过空行，默认 true */
  skipEmptyLines?: boolean;
  /** 是否修剪值，默认 true */
  trim?: boolean;
  /** 最大行数 (0 表示无限制)，默认 0 */
  limit?: number;
}

/**
 * JSON 解析选项
 */
export interface JSONOptions {
  /** 是否支持嵌套结构，默认 true */
  nested?: boolean;
  /** 是否使用流式处理 (大文件)，默认 false */
  stream?: boolean;
  /** 文件编码，默认 'utf-8' */
  encoding?: BufferEncoding;
  /** JSON 路径 (提取特定字段)，默认提取全部 */
  jsonPath?: string;
  /** 最大对象数 (流式处理时使用)，默认 0 表示无限制 */
  limit?: number;
}

/**
 * Excel 解析选项
 */
export interface ExcelOptions {
  /** 工作表名称或索引，默认 0 (第一个工作表) */
  sheet?: string | number;
  /** 是否包含表头，默认 true */
  hasHeader?: boolean;
  /** 是否解析所有工作表，默认 false */
  allSheets?: boolean;
  /** 是否将数字转换为字符串，默认 false */
  raw?: boolean;
  /** 最大行数 (0 表示无限制)，默认 0 */
  limit?: number;
}

/**
 * 解析结果
 */
export interface ParseResult<T = any> {
  /** 解析的数据 */
  data: T[];
  /** 总行数 */
  totalRows: number;
  /** 解析的列名 */
  columns: string[];
  /** 解析耗时 (毫秒) */
  duration: number;
  /** 元数据 */
  metadata?: Record<string, any>;
}

/**
 * 解析错误
 */
export class ParseError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly file?: string
  ) {
    super(message);
    this.name = 'ParseError';
  }
}

// ==================== CSV 解析 ====================

/**
 * 解析 CSV 文件
 * 
 * @param filePath - CSV 文件路径
 * @param options - 解析选项
 * @returns 解析结果
 * 
 * @example
 * ```typescript
 * const result = await parseCSV('users.csv');
 * console.log(result.data); // [{name: 'John', age: '30'}, ...]
 * ```
 */
export async function parseCSV(
  filePath: string,
  options: CSVOptions = {}
): Promise<ParseResult> {
  const startTime = Date.now();
  
  const {
    delimiter = ',',
    encoding = 'utf-8',
    hasHeader = true,
    headers,
    skipEmptyLines = true,
    trim = true,
    limit = 0
  } = options;

  try {
    // 检查文件是否存在
    if (!fs.existsSync(filePath)) {
      throw new ParseError(`文件不存在: ${filePath}`, 'FILE_NOT_FOUND', filePath);
    }

    // 读取文件
    const content = fs.readFileSync(filePath, encoding);
    const lines = content.split(/\r?\n/);
    
    // 过滤空行
    const filteredLines = skipEmptyLines
      ? lines.filter(line => line.trim() !== '')
      : lines;

    if (filteredLines.length === 0) {
      return {
        data: [],
        totalRows: 0,
        columns: [],
        duration: Date.now() - startTime,
        metadata: { filePath, delimiter, encoding }
      };
    }

    // 提取表头
    let columnNames: string[];
    let dataStartIndex = 0;

    if (hasHeader) {
      columnNames = parseCSVLine(filteredLines[0], delimiter, trim);
      dataStartIndex = 1;
    } else if (headers) {
      columnNames = headers;
      dataStartIndex = 0;
    } else {
      // 自动生成表头
      const firstLine = parseCSVLine(filteredLines[0], delimiter, trim);
      columnNames = firstLine.map((_, idx) => `column_${idx + 1}`);
      dataStartIndex = 0;
    }

    // 解析数据行
    const data: Record<string, string>[] = [];
    let processedRows = 0;

    for (let i = dataStartIndex; i < filteredLines.length; i++) {
      if (limit > 0 && processedRows >= limit) {
        break;
      }

      const values = parseCSVLine(filteredLines[i], delimiter, trim);
      const row: Record<string, string> = {};

      columnNames.forEach((col, idx) => {
        row[col] = values[idx] ?? '';
      });

      data.push(row);
      processedRows++;
    }

    return {
      data,
      totalRows: processedRows,
      columns: columnNames,
      duration: Date.now() - startTime,
      metadata: { filePath, delimiter, encoding, hasHeader }
    };
  } catch (error) {
    if (error instanceof ParseError) {
      throw error;
    }
    throw new ParseError(
      `CSV 解析失败：${error instanceof Error ? error.message : '未知错误'}`,
      'PARSE_FAILED',
      filePath
    );
  }
}

/**
 * 解析单行 CSV 数据 (处理引号和转义)
 */
function parseCSVLine(line: string, delimiter: string, trim: boolean): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // 转义的双引号
        current += '"';
        i++; // 跳过下一个引号
      } else {
        // 切换引号状态
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      // 分隔符 (不在引号内)
      result.push(trim ? current.trim() : current);
      current = '';
    } else {
      current += char;
    }
  }

  // 添加最后一个字段
  result.push(trim ? current.trim() : current);

  return result;
}

/**
 * 将数据导出为 CSV 格式
 * 
 * @param data - 数据数组
 * @param filePath - 输出文件路径
 * @param options - 导出选项
 * 
 * @example
 * ```typescript
 * await exportToCSV([{name: 'John', age: 30}], 'output.csv');
 * ```
 */
export async function exportToCSV(
  data: Record<string, any>[],
  filePath: string,
  options: {
    delimiter?: string;
    encoding?: BufferEncoding;
    includeHeader?: boolean;
  } = {}
): Promise<void> {
  const {
    delimiter = ',',
    encoding = 'utf-8',
    includeHeader = true
  } = options;

  if (data.length === 0) {
    fs.writeFileSync(filePath, '', encoding);
    return;
  }

  // 提取所有列名
  const columns = Array.from(
    new Set(data.flatMap(obj => Object.keys(obj)))
  );

  const lines: string[] = [];

  // 添加表头
  if (includeHeader) {
    lines.push(columns.map(col => escapeCSVValue(col, delimiter)).join(delimiter));
  }

  // 添加数据行
  for (const row of data) {
    const values = columns.map(col => escapeCSVValue(row[col] ?? '', delimiter));
    lines.push(values.join(delimiter));
  }

  fs.writeFileSync(filePath, lines.join('\n'), encoding);
}

/**
 * 转义 CSV 值
 */
function escapeCSVValue(value: any, delimiter: string): string {
  const str = String(value);
  
  // 如果包含分隔符、引号或换行符，需要用引号包裹
  if (str.includes(delimiter) || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  
  return str;
}

// ==================== JSON 解析 ====================

/**
 * 解析 JSON 文件
 * 
 * @param filePath - JSON 文件路径
 * @param options - 解析选项
 * @returns 解析结果
 * 
 * @example
 * ```typescript
 * const result = await parseJSON('data.json');
 * console.log(result.data); // 解析后的对象数组
 * ```
 */
export async function parseJSON(
  filePath: string,
  options: JSONOptions = {}
): Promise<ParseResult> {
  const startTime = Date.now();
  
  const {
    nested = true,
    stream = false,
    encoding = 'utf-8',
    jsonPath,
    limit = 0
  } = options;

  try {
    // 检查文件是否存在
    if (!fs.existsSync(filePath)) {
      throw new ParseError(`文件不存在：${filePath}`, 'FILE_NOT_FOUND', filePath);
    }

    const stats = fs.statSync(filePath);
    const fileSize = stats.size;

    if (stream || fileSize > 100 * 1024 * 1024) {
      // 大文件使用流式处理
      return parseJSONStream(filePath, { encoding, jsonPath, limit });
    } else {
      // 小文件直接解析
      const content = fs.readFileSync(filePath, encoding);
      const parsed = JSON.parse(content);

      // 处理不同的 JSON 结构
      let dataArray: any[];
      let columns: string[];

      if (Array.isArray(parsed)) {
        dataArray = parsed;
        columns = extractColumns(dataArray, nested);
      } else if (typeof parsed === 'object') {
        if (jsonPath) {
          // 提取指定路径的数据
          const extracted = extractByPath(parsed, jsonPath);
          dataArray = Array.isArray(extracted) ? extracted : [extracted];
        } else {
          // 将对象转换为单元素数组
          dataArray = [parsed];
        }
        columns = extractColumns(dataArray, nested);
      } else {
        dataArray = [parsed];
        columns = ['value'];
      }

      // 应用限制
      if (limit > 0 && dataArray.length > limit) {
        dataArray = dataArray.slice(0, limit);
      }

      return {
        data: dataArray,
        totalRows: dataArray.length,
        columns,
        duration: Date.now() - startTime,
        metadata: { filePath, encoding, fileSize, nested }
      };
    }
  } catch (error) {
    if (error instanceof ParseError) {
      throw error;
    }
    if (error instanceof SyntaxError) {
      throw new ParseError(`JSON 语法错误：${error.message}`, 'INVALID_JSON', filePath);
    }
    throw new ParseError(
      `JSON 解析失败：${error instanceof Error ? error.message : '未知错误'}`,
      'PARSE_FAILED',
      filePath
    );
  }
}

/**
 * 流式解析 JSON 文件 (适用于大文件)
 */
async function parseJSONStream(
  filePath: string,
  options: { encoding?: BufferEncoding; jsonPath?: string; limit?: number }
): Promise<ParseResult> {
  const startTime = Date.now();
  const { encoding = 'utf-8', limit = 0 } = options;

  // 简单流式解析：逐行读取 JSON Lines 格式
  const content = fs.readFileSync(filePath, encoding);
  const lines = content.split(/\r?\n/).filter(line => line.trim() !== '');
  
  const data: any[] = [];
  let processedRows = 0;

  for (const line of lines) {
    if (limit > 0 && processedRows >= limit) {
      break;
    }

    try {
      const parsed = JSON.parse(line);
      data.push(parsed);
      processedRows++;
    } catch (error) {
      // 跳过无效行
      console.warn(`跳过无效的 JSON 行：${line.substring(0, 50)}...`);
    }
  }

  const columns = extractColumns(data, true);

  return {
    data,
    totalRows: processedRows,
    columns,
    duration: Date.now() - startTime,
    metadata: { filePath, encoding, stream: true }
  };
}

/**
 * 从对象数组中提取列名
 */
function extractColumns(data: any[], nested: boolean): string[] {
  const columns = new Set<string>();

  for (const item of data) {
    if (typeof item === 'object' && item !== null) {
      extractKeys(item, columns, nested);
    }
  }

  return Array.from(columns);
}

/**
 * 递归提取对象的键
 */
function extractKeys(obj: any, columns: Set<string>, nested: boolean, prefix = ''): void {
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;

    if (nested && typeof value === 'object' && value !== null && !Array.isArray(value)) {
      extractKeys(value, columns, nested, fullKey);
    } else {
      columns.add(fullKey);
    }
  }
}

/**
 * 根据 JSONPath 提取数据
 */
function extractByPath(obj: any, path: string): any {
  const parts = path.split('.');
  let current = obj;

  for (const part of parts) {
    if (current === null || current === undefined) {
      return undefined;
    }
    current = current[part];
  }

  return current;
}

/**
 * 将数据导出为 JSON 格式
 * 
 * @param data - 数据数组
 * @param filePath - 输出文件路径
 * @param options - 导出选项
 * 
 * @example
 * ```typescript
 * await exportToJSON([{name: 'John', age: 30}], 'output.json', { pretty: true });
 * ```
 */
export async function exportToJSON(
  data: any[],
  filePath: string,
  options: {
    pretty?: boolean;
    encoding?: BufferEncoding;
  } = {}
): Promise<void> {
  const {
    pretty = true,
    encoding = 'utf-8'
  } = options;

  const content = pretty
    ? JSON.stringify(data, null, 2)
    : JSON.stringify(data);

  fs.writeFileSync(filePath, content, encoding);
}

// ==================== Excel 解析 ====================

/**
 * 解析 Excel 文件 (.xlsx / .xls)
 * 
 * 注意：此功能需要安装 `xlsx` 库
 * 安装：npm install xlsx
 * 
 * @param filePath - Excel 文件路径
 * @param options - 解析选项
 * @returns 解析结果
 * 
 * @example
 * ```typescript
 * const result = await parseExcel('data.xlsx', { sheet: 'Sheet1' });
 * console.log(result.data); // 解析后的对象数组
 * ```
 */
export async function parseExcel(
  filePath: string,
  options: ExcelOptions = {}
): Promise<ParseResult | Record<string, ParseResult>> {
  const startTime = Date.now();

  const {
    sheet = 0,
    hasHeader = true,
    allSheets = false,
    raw = false,
    limit = 0
  } = options;

  try {
    // 检查文件是否存在
    if (!fs.existsSync(filePath)) {
      throw new ParseError(`文件不存在：${filePath}`, 'FILE_NOT_FOUND', filePath);
    }

    // 动态导入 xlsx 库
    let XLSX: any;
    try {
      XLSX = require('xlsx');
    } catch (error) {
      throw new ParseError(
        'Excel 解析需要安装 xlsx 库：npm install xlsx',
        'MISSING_DEPENDENCY',
        filePath
      );
    }

    // 读取工作簿
    const workbook = XLSX.readFile(filePath, { raw });
    const stats = fs.statSync(filePath);

    // 解析所有工作表
    if (allSheets) {
      const results: Record<string, ParseResult> = {};

      for (const sheetName of workbook.SheetNames) {
        const worksheet = workbook.Sheets[sheetName];
        const result = parseWorksheet(worksheet, { hasHeader, limit });
        results[sheetName] = {
          ...result,
          duration: Date.now() - startTime,
          metadata: { filePath, sheetName, allSheets: true }
        };
      }

      return results;
    }

    // 解析指定工作表
    let worksheetName: string;

    if (typeof sheet === 'number') {
      if (sheet < 0 || sheet >= workbook.SheetNames.length) {
        throw new ParseError(
          `工作表索引超出范围：${sheet} (共 ${workbook.SheetNames.length} 个工作表)`,
          'INVALID_SHEET_INDEX',
          filePath
        );
      }
      worksheetName = workbook.SheetNames[sheet];
    } else {
      if (!workbook.SheetNames.includes(sheet)) {
        throw new ParseError(
          `工作表不存在：${sheet} (可用：${workbook.SheetNames.join(', ')})`,
          'INVALID_SHEET_NAME',
          filePath
        );
      }
      worksheetName = sheet;
    }

    const worksheet = workbook.Sheets[worksheetName];
    const result = parseWorksheet(worksheet, { hasHeader, limit });

    return {
      ...result,
      duration: Date.now() - startTime,
      metadata: { filePath, sheetName: worksheetName, fileSize: stats.size }
    };
  } catch (error) {
    if (error instanceof ParseError) {
      throw error;
    }
    throw new ParseError(
      `Excel 解析失败：${error instanceof Error ? error.message : '未知错误'}`,
      'PARSE_FAILED',
      filePath
    );
  }
}

/**
 * 解析工作表
 */
function parseWorksheet(
  worksheet: any,
  options: { hasHeader?: boolean; limit?: number }
): Omit<ParseResult, 'duration' | 'metadata'> {
  const { hasHeader = true, limit = 0 } = options;

  // 将工作表转换为 JSON
  const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet, {
    header: hasHeader ? 1 : undefined,
    defval: '',
    raw: false
  });

  if (jsonData.length === 0) {
    return {
      data: [],
      totalRows: 0,
      columns: []
    };
  }

  // 提取表头和数据
  let columns: string[];
  let data: Record<string, any>[];

  if (hasHeader && Array.isArray(jsonData[0])) {
    columns = jsonData[0].map((col: any) => String(col));
    const rawData = jsonData.slice(1);

    data = rawData.map((row: any[]) => {
      const obj: Record<string, any> = {};
      columns.forEach((col, idx) => {
        obj[col] = row[idx] ?? '';
      });
      return obj;
    });
  } else if (Array.isArray(jsonData[0])) {
    // 无表头，自动生成
    const maxCols = Math.max(...jsonData.map((row: any[]) => row.length));
    columns = Array.from({ length: maxCols }, (_, i) => `column_${i + 1}`);

    data = jsonData.map((row: any[]) => {
      const obj: Record<string, any> = {};
      columns.forEach((col, idx) => {
        obj[col] = row[idx] ?? '';
      });
      return obj;
    });
  } else {
    // 已经是对象数组
    data = jsonData;
    columns = Array.from(new Set(data.flatMap(obj => Object.keys(obj))));
  }

  // 应用限制
  if (limit > 0 && data.length > limit) {
    data = data.slice(0, limit);
  }

  return {
    data,
    totalRows: data.length,
    columns
  };
}

// 需要全局 XLSX 引用供 parseWorksheet 使用
let XLSX: any;

/**
 * 将数据导出为 Excel 文件
 * 
 * @param data - 数据数组
 * @param filePath - 输出文件路径
 * @param options - 导出选项
 * 
 * @example
 * ```typescript
 * await exportToExcel([{name: 'John', age: 30}], 'output.xlsx', { sheetName: 'Users' });
 * ```
 */
export async function exportToExcel(
  data: Record<string, any>[],
  filePath: string,
  options: {
    sheetName?: string;
  } = {}
): Promise<void> {
  const { sheetName = 'Sheet1' } = options;

  try {
    const XLSX = require('xlsx');

    // 创建工作表
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

    // 写入文件
    XLSX.writeFile(workbook, filePath);
  } catch (error) {
    if ((error as any).code === 'MODULE_NOT_FOUND') {
      throw new ParseError(
        'Excel 导出需要安装 xlsx 库：npm install xlsx',
        'MISSING_DEPENDENCY'
      );
    }
    throw error;
  }
}

// ==================== 工具函数 ====================

/**
 * 自动检测文件类型并解析
 * 
 * @param filePath - 文件路径
 * @param options - 解析选项
 * @returns 解析结果
 * 
 * @example
 * ```typescript
 * const result = await parseFile('data.csv');
 * const result = await parseFile('data.json');
 * const result = await parseFile('data.xlsx');
 * ```
 */
export async function parseFile(
  filePath: string,
  options: CSVOptions & JSONOptions & ExcelOptions = {}
): Promise<ParseResult | Record<string, ParseResult>> {
  const ext = path.extname(filePath).toLowerCase();

  switch (ext) {
    case '.csv':
    case '.tsv':
      return parseCSV(filePath, {
        delimiter: ext === '.tsv' ? '\t' : ',',
        ...options
      } as CSVOptions);

    case '.json':
    case '.jsonl':
      return parseJSON(filePath, {
        stream: ext === '.jsonl',
        ...options
      } as JSONOptions);

    case '.xlsx':
    case '.xls':
      return parseExcel(filePath, options as ExcelOptions);

    default:
      throw new ParseError(
        `不支持的文件类型：${ext} (支持：.csv, .tsv, .json, .jsonl, .xlsx, .xls)`,
        'UNSUPPORTED_FORMAT',
        filePath
      );
  }
}

/**
 * 获取文件信息
 * 
 * @param filePath - 文件路径
 * @returns 文件信息
 */
export function getFileInfo(filePath: string): {
  exists: boolean;
  size: number;
  ext: string;
  type: string;
} {
  const exists = fs.existsSync(filePath);
  
  if (!exists) {
    return { exists: false, size: 0, ext: '', type: '' };
  }

  const stats = fs.statSync(filePath);
  const ext = path.extname(filePath).toLowerCase();

  let type = 'unknown';
  if (['.csv', '.tsv'].includes(ext)) type = 'csv';
  else if (['.json', '.jsonl'].includes(ext)) type = 'json';
  else if (['.xlsx', '.xls'].includes(ext)) type = 'excel';

  return {
    exists: true,
    size: stats.size,
    ext,
    type
  };
}

/**
 * 验证数据格式
 * 
 * @param data - 要验证的数据
 * @param schema - 数据模式 (列名数组)
 * @returns 验证结果
 * 
 * @example
 * ```typescript
 * const result = validateData(data, ['name', 'email', 'age']);
 * if (!result.valid) {
 *   console.log('缺失列:', result.missingColumns);
 * }
 * ```
 */
export function validateData(
  data: Record<string, any>[],
  schema: string[]
): {
  valid: boolean;
  missingColumns: string[];
  extraColumns: string[];
  rowCount: number;
} {
  if (data.length === 0) {
    return { valid: true, missingColumns: [], extraColumns: [], rowCount: 0 };
  }

  const actualColumns = new Set(Object.keys(data[0]));
  const schemaSet = new Set(schema);

  const missingColumns = schema.filter(col => !actualColumns.has(col));
  const extraColumns = Array.from(actualColumns).filter(col => !schemaSet.has(col));

  return {
    valid: missingColumns.length === 0,
    missingColumns,
    extraColumns,
    rowCount: data.length
  };
}

// ==================== 导出 ====================

export default {
  // CSV
  parseCSV,
  exportToCSV,
  
  // JSON
  parseJSON,
  exportToJSON,
  
  // Excel
  parseExcel,
  exportToExcel,
  
  // 通用
  parseFile,
  getFileInfo,
  validateData,
  
  // 错误类
  ParseError
};
