/**
 * CSV 解析技能 - CSV Parser Skill
 * 
 * 功能:
 * 1. CSV 解析为 JSON - 支持多种分隔符和编码
 * 2. JSON 转 CSV - 自动处理嵌套结构和特殊字符
 * 3. 大数据流式处理 - 支持流式读取和写入，内存优化
 * 
 * @author Axon
 * @version 1.0.0
 */

import * as fs from 'fs';
import * as path from 'path';
import { Readable, Writable } from 'stream';

// ============== 类型定义 ==============

/** CSV 解析配置 */
export interface CsvParseConfig {
  /** 分隔符 (默认 ',') */
  delimiter?: string;
  /** 引号字符 (默认 '"') */
  quote?: string;
  /** 转义字符 (默认 '"') */
  escape?: string;
  /** 是否包含表头 (默认 true) */
  hasHeader?: boolean;
  /** 文件编码 (默认 'utf-8') */
  encoding?: BufferEncoding;
  /** 是否跳过空行 (默认 true) */
  skipEmptyLines?: boolean;
  /** 是否去除首尾空格 (默认 true) */
  trim?: boolean;
  /** 自定义列名 (覆盖表头) */
  columns?: string[];
  /** 最大行数限制 (0 = 无限制) */
  maxRows?: number;
}

/** CSV 生成配置 */
export interface CsvStringifyConfig {
  /** 分隔符 (默认 ',') */
  delimiter?: string;
  /** 引号字符 (默认 '"') */
  quote?: string;
  /** 是否包含表头 (默认 true) */
  header?: boolean;
  /** 列顺序 */
  columns?: string[];
  /** 日期格式 */
  dateFormat?: string;
  /** 数字格式 */
  numberFormat?: 'string' | 'number';
  /** 空值处理 */
  nullValue?: string;
  /** 是否强制引号 */
  forceQuotes?: boolean;
}

/** CSV 行数据 */
export type CsvRow = Record<string, any>;

/** CSV 解析结果 */
export interface CsvParseResult {
  /** 解析的数据 */
  data: CsvRow[];
  /** 列名 */
  columns: string[];
  /** 总行数 */
  totalRows: number;
  /** 解析的行数 */
  parsedRows: number;
  /** 跳过的行数 */
  skippedRows: number;
  /** 错误信息 */
  errors: ParseError[];
  /** 解析耗时 (毫秒) */
  duration: number;
}

/** 解析错误 */
export interface ParseError {
  /** 行号 */
  line: number;
  /** 错误信息 */
  message: string;
  /** 原始内容 */
  raw?: string;
}

/** 流式解析进度 */
export interface StreamProgress {
  /** 已处理行数 */
  processedRows: number;
  /** 总行数 (如果已知) */
  totalRows?: number;
  /** 完成百分比 */
  percentage: number;
  /** 开始时间 */
  startTime: number;
  /** 已耗时 (毫秒) */
  elapsed: number;
}

/** 流式解析回调 */
export interface StreamCallbacks {
  /** 每行数据处理回调 */
  onRow?: (row: CsvRow, lineNum: number) => void | Promise<void>;
  /** 进度回调 */
  onProgress?: (progress: StreamProgress) => void;
  /** 完成回调 */
  onComplete?: (result: { totalRows: number; duration: number }) => void;
  /** 错误回调 */
  onError?: (error: Error) => void;
}

// ============== 工具函数 ==============

/**
 * 转义 CSV 字段
 */
function escapeField(value: any, config: CsvStringifyConfig): string {
  const { delimiter, quote, forceQuotes, nullValue } = config;
  
  // 处理空值
  if (value === null || value === undefined) {
    return nullValue ?? '';
  }
  
  // 处理日期
  if (value instanceof Date) {
    value = config.dateFormat 
      ? formatDate(value, config.dateFormat)
      : value.toISOString();
  }
  
  // 处理对象和数组
  if (typeof value === 'object') {
    value = JSON.stringify(value);
  }
  
  // 转换为字符串
  const str = String(value);
  
  // 检查是否需要引号
  const needsQuotes = forceQuotes || 
    str.includes(delimiter ?? ',') ||
    str.includes(quote ?? '"') ||
    str.includes('\n') ||
    str.includes('\r');
  
  if (!needsQuotes) {
    return str;
  }
  
  // 转义引号
  const escapedQuote = quote ?? '"';
  const escaped = str.replace(new RegExp(escapedQuote, 'g'), escapedQuote + escapedQuote);
  
  return `${escapedQuote}${escaped}${escapedQuote}`;
}

/**
 * 格式化日期
 */
function formatDate(date: Date, format: string): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  
  return format
    .replace('YYYY', String(year))
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hours)
    .replace('mm', minutes)
    .replace('ss', seconds);
}

/**
 * 解析 CSV 行
 */
function parseLine(line: string, config: CsvParseConfig): string[] {
  const { delimiter = ',', quote = '"', escape = '"' } = config;
  const fields: string[] = [];
  let currentField = '';
  let inQuotes = false;
  let i = 0;
  
  while (i < line.length) {
    const char = line[i];
    const nextChar = line[i + 1];
    
    if (inQuotes) {
      if (char === escape && nextChar === quote) {
        // 转义的引号
        currentField += quote;
        i += 2;
      } else if (char === quote) {
        // 结束引号
        inQuotes = false;
        i++;
      } else {
        currentField += char;
        i++;
      }
    } else {
      if (char === quote) {
        // 开始引号
        inQuotes = true;
        i++;
      } else if (char === delimiter) {
        // 字段分隔符
        fields.push(config.trim ? currentField.trim() : currentField);
        currentField = '';
        i++;
      } else {
        currentField += char;
        i++;
      }
    }
  }
  
  // 添加最后一个字段
  fields.push(config.trim ? currentField.trim() : currentField);
  
  return fields;
}

/**
 * 检测 CSV 分隔符
 */
function detectDelimiter(line: string): string {
  const delimiters = [',', ';', '\t', '|'];
  const counts = delimiters.map(d => ({
    delimiter: d,
    count: (line.match(new RegExp(`\\${d}`, 'g')) || []).length
  }));
  
  counts.sort((a, b) => b.count - a.count);
  return counts[0].count > 0 ? counts[0].delimiter : ',';
}

// ============== 核心功能 ==============

/**
 * 解析 CSV 字符串为 JSON
 * 
 * @param csvString CSV 字符串
 * @param config 解析配置
 * @returns 解析结果
 */
export function parseCsv(csvString: string, config: CsvParseConfig = {}): CsvParseResult {
  const startTime = Date.now();
  const {
    delimiter,
    hasHeader = true,
    skipEmptyLines = true,
    columns: customColumns,
    maxRows = 0
  } = config;
  
  const lines = csvString.split(/\r?\n/);
  const data: CsvRow[] = [];
  const errors: ParseError[] = [];
  let columns: string[] = [];
  let skippedRows = 0;
  let parsedRows = 0;
  
  // 自动检测分隔符
  const effectiveDelimiter = delimiter || detectDelimiter(lines[0] || '');
  const effectiveConfig = { ...config, delimiter: effectiveDelimiter };
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;
    
    // 跳过空行
    if (skipEmptyLines && (!line || line.trim() === '')) {
      skippedRows++;
      continue;
    }
    
    // 处理表头
    if (i === 0 && hasHeader) {
      columns = parseLine(line, effectiveConfig);
      continue;
    }
    
    // 检查行数限制
    if (maxRows > 0 && parsedRows >= maxRows) {
      break;
    }
    
    try {
      const fields = parseLine(line, effectiveConfig);
      
      // 使用自定义列名或表头
      const rowColumns = customColumns || (i === 0 && !hasHeader ? fields : columns);
      
      // 如果是第一行且没有表头，使用字段作为列名
      if (i === 0 && !hasHeader && !customColumns) {
        columns = fields.map((_, idx) => `column${idx + 1}`);
      }
      
      // 构建行对象
      const row: CsvRow = {};
      for (let j = 0; j < fields.length; j++) {
        const colName = rowColumns[j] || `column${j + 1}`;
        row[colName] = fields[j];
      }
      
      data.push(row);
      parsedRows++;
    } catch (error) {
      errors.push({
        line: lineNum,
        message: error instanceof Error ? error.message : 'Unknown error',
        raw: line
      });
      skippedRows++;
    }
  }
  
  return {
    data,
    columns: customColumns || columns,
    totalRows: lines.length,
    parsedRows,
    skippedRows,
    errors,
    duration: Date.now() - startTime
  };
}

/**
 * JSON 转 CSV 字符串
 * 
 * @param data JSON 数据 (数组或对象)
 * @param config 生成配置
 * @returns CSV 字符串
 */
export function stringifyCsv(data: CsvRow[] | Record<string, any>, config: CsvStringifyConfig = {}): string {
  const {
    delimiter = ',',
    quote = '"',
    header = true,
    columns: customColumns
  } = config;
  
  // 转换为数组
  const rows = Array.isArray(data) ? data : [data];
  
  if (rows.length === 0) {
    return '';
  }
  
  // 确定列名
  let columns = customColumns;
  if (!columns) {
    const allKeys = new Set<string>();
    rows.forEach(row => {
      Object.keys(row).forEach(key => allKeys.add(key));
    });
    columns = Array.from(allKeys);
  }
  
  const lines: string[] = [];
  
  // 添加表头
  if (header) {
    const headerLine = columns
      .map(col => escapeField(col, config))
      .join(delimiter);
    lines.push(headerLine);
  }
  
  // 添加数据行
  rows.forEach(row => {
    const line = columns
      .map(col => escapeField(row[col], config))
      .join(delimiter);
    lines.push(line);
  });
  
  return lines.join('\n');
}

/**
 * 从文件流式读取 CSV
 * 
 * @param filePath 文件路径
 * @param config 解析配置
 * @param callbacks 回调函数
 */
export async function parseCsvStream(
  filePath: string,
  config: CsvParseConfig = {},
  callbacks: StreamCallbacks = {}
): Promise<void> {
  const { onRow, onProgress, onComplete, onError } = callbacks;
  const startTime = Date.now();
  
  return new Promise((resolve, reject) => {
    const readStream = fs.createReadStream(filePath, {
      encoding: config.encoding || 'utf-8'
    });
    
    let buffer = '';
    let lineNum = 0;
    let processedRows = 0;
    let columns: string[] = [];
    let totalRows = 0;
    let headersParsed = false;
    
    readStream.on('data', (chunk: string) => {
      buffer += chunk;
      const lines = buffer.split(/\r?\n/);
      
      // 保留最后一行 (可能不完整)
      buffer = lines.pop() || '';
      
      for (const line of lines) {
        lineNum++;
        
        // 跳过空行
        if (config.skipEmptyLines !== false && (!line || line.trim() === '')) {
          continue;
        }
        
        // 处理表头
        if (!headersParsed) {
          if (config.hasHeader !== false) {
            columns = parseLine(line, config);
            if (config.columns) {
              columns = config.columns;
            }
          } else {
            // 无表头，生成默认列名
            const tempFields = parseLine(line, config);
            columns = tempFields.map((_, idx) => `column${idx + 1}`);
          }
          headersParsed = true;
          continue;
        }
        
        // 解析数据行
        try {
          const fields = parseLine(line, config);
          const row: CsvRow = {};
          
          for (let i = 0; i < fields.length; i++) {
            row[columns[i] || `column${i + 1}`] = fields[i];
          }
          
          processedRows++;
          
          // 调用行回调
          if (onRow) {
            const result = onRow(row, lineNum);
            if (result instanceof Promise) {
              result.catch(err => {
                console.error('Error in onRow callback:', err);
              });
            }
          }
        } catch (error) {
          if (onError) {
            onError(error instanceof Error ? error : new Error(String(error)));
          }
        }
      }
      
      // 进度回调
      if (onProgress) {
        onProgress({
          processedRows,
          totalRows: totalRows || undefined,
          percentage: totalRows > 0 ? (processedRows / totalRows) * 100 : 0,
          startTime,
          elapsed: Date.now() - startTime
        });
      }
    });
    
    readStream.on('end', () => {
      // 处理最后一行
      if (buffer && buffer.trim()) {
        lineNum++;
        try {
          const fields = parseLine(buffer, config);
          const row: CsvRow = {};
          for (let i = 0; i < fields.length; i++) {
            row[columns[i] || `column${i + 1}`] = fields[i];
          }
          processedRows++;
          
          if (onRow) {
            const result = onRow(row, lineNum);
            if (result instanceof Promise) {
              result.catch(err => {
                console.error('Error in onRow callback:', err);
              });
            }
          }
        } catch (error) {
          if (onError) {
            onError(error instanceof Error ? error : new Error(String(error)));
          }
        }
      }
      
      // 完成回调
      if (onComplete) {
        onComplete({
          totalRows: processedRows,
          duration: Date.now() - startTime
        });
      }
      
      resolve();
    });
    
    readStream.on('error', (error) => {
      if (onError) {
        onError(error);
      }
      reject(error);
    });
  });
}

/**
 * 流式写入 CSV 文件
 * 
 * @param filePath 文件路径
 * @param dataStream 数据流
 * @param config 生成配置
 */
export async function stringifyCsvStream(
  filePath: string,
  dataStream: Readable | AsyncIterable<CsvRow>,
  config: CsvStringifyConfig = {}
): Promise<void> {
  const {
    delimiter = ',',
    header = true,
    columns: customColumns
  } = config;
  
  return new Promise((resolve, reject) => {
    const writeStream = fs.createWriteStream(filePath, {
      encoding: config.encoding || 'utf-8' as BufferEncoding
    });
    
    let columns: string[] | null = null;
    let headerWritten = false;
    
    const writeRow = (row: CsvRow): Promise<void> => {
      return new Promise((resolveWrite, rejectWrite) => {
        // 确定列名
        if (!columns) {
          columns = customColumns || Object.keys(row);
        }
        
        // 写入表头
        if (header && !headerWritten) {
          const headerLine = columns
            .map(col => escapeField(col, config))
            .join(delimiter);
          
          if (!writeStream.write(headerLine + '\n')) {
            writeStream.once('drain', () => resolveWrite());
            return;
          }
          headerWritten = true;
        }
        
        // 写入数据行
        const line = columns
          .map(col => escapeField(row[col], config))
          .join(delimiter);
        
        if (!writeStream.write(line + '\n')) {
          writeStream.once('drain', () => resolveWrite());
        } else {
          resolveWrite();
        }
      });
    };
    
    // 处理数据流
    if (Symbol.asyncIterator in dataStream) {
      // AsyncIterable
      (async () => {
        try {
          for await (const row of dataStream as AsyncIterable<CsvRow>) {
            await writeRow(row);
          }
          writeStream.end();
          resolve();
        } catch (error) {
          writeStream.destroy(error as Error);
          reject(error);
        }
      })();
    } else {
      // Readable stream
      const readable = dataStream as Readable;
      
      readable.on('data', async (chunk: any) => {
        try {
          await writeRow(chunk);
        } catch (error) {
          writeStream.destroy(error as Error);
          reject(error);
        }
      });
      
      readable.on('end', () => {
        writeStream.end();
        resolve();
      });
      
      readable.on('error', (error) => {
        writeStream.destroy(error);
        reject(error);
      });
    }
    
    writeStream.on('error', reject);
  });
}

/**
 * 批量解析 CSV 文件 (适合中等大小文件)
 * 
 * @param filePath 文件路径
 * @param config 解析配置
 * @returns 解析结果
 */
export async function parseCsvFile(filePath: string, config: CsvParseConfig = {}): Promise<CsvParseResult> {
  const content = await fs.promises.readFile(filePath, {
    encoding: config.encoding || 'utf-8'
  });
  
  return parseCsv(content, config);
}

/**
 * 将 JSON 数据写入 CSV 文件
 * 
 * @param filePath 文件路径
 * @param data JSON 数据
 * @param config 生成配置
 */
export async function writeCsvFile(
  filePath: string,
  data: CsvRow[] | Record<string, any>,
  config: CsvStringifyConfig = {}
): Promise<void> {
  const csv = stringifyCsv(data, config);
  await fs.promises.writeFile(filePath, csv, {
    encoding: config.encoding || 'utf-8' as BufferEncoding
  });
}

/**
 * 转换 CSV 文件
 * 
 * @param inputPath 输入文件路径
 * @param outputPath 输出文件路径
 * @param transform 转换函数
 * @param parseConfig 解析配置
 * @param stringifyConfig 生成配置
 */
export async function transformCsv(
  inputPath: string,
  outputPath: string,
  transform: (row: CsvRow) => CsvRow | null,
  parseConfig: CsvParseConfig = {},
  stringifyConfig: CsvStringifyConfig = {}
): Promise<{ processed: number; skipped: number }> {
  let processed = 0;
  let skipped = 0;
  const rows: CsvRow[] = [];
  
  // 流式读取并转换
  await parseCsvStream(inputPath, parseConfig, {
    onRow: (row) => {
      const transformed = transform(row);
      if (transformed !== null) {
        rows.push(transformed);
        processed++;
      } else {
        skipped++;
      }
    }
  });
  
  // 写入输出文件
  await writeCsvFile(outputPath, rows, stringifyConfig);
  
  return { processed, skipped };
}

/**
 * 合并多个 CSV 文件
 * 
 * @param inputPaths 输入文件路径数组
 * @param outputPath 输出文件路径
 * @param config 配置
 */
export async function mergeCsvFiles(
  inputPaths: string[],
  outputPath: string,
  config: {
    parseConfig?: CsvParseConfig;
    stringifyConfig?: CsvStringifyConfig;
    addSourceColumn?: boolean;
  } = {}
): Promise<void> {
  const { parseConfig = {}, stringifyConfig = {}, addSourceColumn = false } = config;
  const allRows: CsvRow[] = [];
  let globalColumns: string[] = [];
  
  for (const inputPath of inputPaths) {
    const result = await parseCsvFile(inputPath, parseConfig);
    
    // 更新全局列名
    result.columns.forEach(col => {
      if (!globalColumns.includes(col)) {
        globalColumns.push(col);
      }
    });
    
    // 添加源文件列
    if (addSourceColumn) {
      result.data.forEach(row => {
        row.__source = path.basename(inputPath);
      });
    }
    
    allRows.push(...result.data);
  }
  
  // 写入合并后的文件
  await writeCsvFile(outputPath, allRows, {
    ...stringifyConfig,
    columns: globalColumns
  });
}

// ============== 导出 ==============

export default {
  parseCsv,
  stringifyCsv,
  parseCsvStream,
  stringifyCsvStream,
  parseCsvFile,
  writeCsvFile,
  transformCsv,
  mergeCsvFiles
};
