/**
 * 数据导出技能 - Export Data Skill
 * 
 * 功能:
 * 1. CSV/JSON/Excel 导出 - 支持多种格式的数据导出
 * 2. 大数据分页导出 - 支持分页处理大数据集
 * 3. 导出进度追踪 - 实时追踪导出进度和状态
 * 
 * @author Axon
 * @version 1.0.0
 */

import * as fs from 'fs';
import * as path from 'path';

// ============== 类型定义 ==============

/** 导出格式 */
export type ExportFormat = 'csv' | 'json' | 'excel' | 'xlsx';

/** 导出状态 */
export type ExportStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';

/** 导出进度信息 */
export interface ExportProgress {
  /** 当前已处理条数 */
  current: number;
  /** 总条数 */
  total: number;
  /** 完成百分比 (0-100) */
  percentage: number;
  /** 开始时间 */
  startTime: number;
  /** 预计剩余时间 (秒) */
  estimatedRemainingSeconds?: number;
  /** 当前处理项的描述 */
  currentItem?: string;
}

/** 导出任务信息 */
export interface ExportTask {
  /** 任务 ID */
  id: string;
  /** 导出格式 */
  format: ExportFormat;
  /** 导出状态 */
  status: ExportStatus;
  /** 导出进度 */
  progress: ExportProgress;
  /** 输出文件路径 */
  outputPath?: string;
  /** 错误信息 (如果失败) */
  error?: string;
  /** 创建时间 */
  createdAt: number;
  /** 完成时间 */
  completedAt?: number;
  /** 总条数 */
  totalRecords: number;
  /** 导出的字段列表 */
  fields: string[];
  /** 进度回调函数 */
  onProgress?: (taskId: string, progress: ExportProgress) => void;
  /** 状态变更回调函数 */
  onStatusChange?: (taskId: string, status: ExportStatus) => void;
}

/** 导出配置 */
export interface ExportConfig {
  /** 导出格式 */
  format: ExportFormat;
  /** 输出文件路径 */
  outputPath: string;
  /** 分页大小 (默认 1000) */
  pageSize?: number;
  /** 导出的字段列表 (默认全部) */
  fields?: string[];
  /** CSV 分隔符 (默认 ',') */
  csvDelimiter?: string;
  /** 是否包含表头 (默认 true) */
  includeHeader?: boolean;
  /** Excel 工作表名称 (默认 'Sheet1') */
  sheetName?: string;
  /** 是否压缩 (仅 excel 格式) */
  compress?: boolean;
  /** 进度回调函数 */
  onProgress?: (taskId: string, progress: ExportProgress) => void;
  /** 状态变更回调函数 */
  onStatusChange?: (taskId: string, status: ExportStatus) => void;
}

/** 导出结果 */
export interface ExportResult {
  /** 任务 ID */
  taskId: string;
  /** 导出状态 */
  status: ExportStatus;
  /** 输出文件路径 */
  outputPath?: string;
  /** 导出记录数 */
  exportedRecords: number;
  /** 导出时间 (毫秒) */
  exportTime: number;
  /** 文件大小 (字节) */
  fileSize?: number;
  /** 错误信息 (如果失败) */
  error?: string;
}

/** 分页数据源 */
export interface PaginatedDataSource<T = any> {
  /** 获取单页数据 */
  getPage: (page: number, pageSize: number) => Promise<{
    data: T[];
    total: number;
    hasMore: boolean;
  }>;
  /** 获取总记录数 (可选，如不提供则通过第一页推断) */
  getTotalCount?: () => Promise<number>;
}

/** 数组数据源 (简化版) */
export interface ArrayDataSource<T = any> {
  /** 数据数组 */
  data: T[];
}

// ============== 工具函数 ==============

/**
 * 生成唯一任务 ID
 */
function generateTaskId(): string {
  return `export_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 格式化数字 (添加千位分隔符)
 */
function formatNumber(num: number): string {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * 计算预计剩余时间
 */
function calculateEstimatedTime(progress: ExportProgress): number | undefined {
  const elapsed = (Date.now() - progress.startTime) / 1000;
  if (progress.current === 0 || elapsed === 0) return undefined;
  
  const rate = progress.current / elapsed; // 条/秒
  const remaining = progress.total - progress.current;
  return Math.ceil(remaining / rate);
}

/**
 * 转义 CSV 字段
 */
function escapeCSVField(value: any, delimiter: string): string {
  if (value === null || value === undefined) {
    return '';
  }
  
  const stringValue = String(value);
  
  // 如果包含分隔符、引号或换行，需要转义
  if (stringValue.includes(delimiter) || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  
  return stringValue;
}

/**
 * 将数据转换为 CSV 格式
 */
function convertToCSV(data: any[], fields: string[], delimiter: string = ',', includeHeader: boolean = true): string {
  if (data.length === 0) {
    return '';
  }
  
  const lines: string[] = [];
  
  // 添加表头
  if (includeHeader) {
    lines.push(fields.map(f => escapeCSVField(f, delimiter)).join(delimiter));
  }
  
  // 添加数据行
  for (const row of data) {
    const values = fields.map(field => {
      // 支持嵌套字段 (如 'user.name')
      const value = field.split('.').reduce((obj, key) => obj?.[key], row);
      return escapeCSVField(value, delimiter);
    });
    lines.push(values.join(delimiter));
  }
  
  return lines.join('\n');
}

/**
 * 将数据转换为 JSON 格式
 */
function convertToJSON(data: any[], fields?: string[]): string {
  let output = data;
  
  // 如果指定了字段，只导出这些字段
  if (fields && fields.length > 0) {
    output = data.map(row => {
      const filtered: any = {};
      for (const field of fields) {
        const value = field.split('.').reduce((obj, key) => obj?.[key], row);
        if (value !== undefined) {
          filtered[field] = value;
        }
      }
      return filtered;
    });
  }
  
  return JSON.stringify(output, null, 2);
}

/**
 * 将数据转换为 Excel 格式 (简单实现，不依赖外部库)
 * 注意：这是简化版，生产环境建议使用 xlsx 库
 */
function convertToExcelXML(data: any[], fields: string[], sheetName: string = 'Sheet1'): string {
  // Excel XML 格式 (SpreadsheetML)
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
  <Worksheet ss:Name="${sheetName}">
    <Table>`;
  
  const footer = `
    </Table>
  </Worksheet>
</Workbook>`;
  
  // 表头行
  let headerRow = '<Row>';
  for (const field of fields) {
    headerRow += `<Cell><Data ss:Type="String">${escapeXML(field)}</Data></Cell>`;
  }
  headerRow += '</Row>';
  
  // 数据行
  const dataRows: string[] = [];
  for (const row of data) {
    let dataRow = '<Row>';
    for (const field of fields) {
      const value = field.split('.').reduce((obj, key) => obj?.[key], row);
      const type = typeof value === 'number' ? 'Number' : 'String';
      dataRow += `<Cell><Data ss:Type="${type}">${escapeXML(value ?? '')}</Data></Cell>`;
    }
    dataRow += '</Row>';
    dataRows.push(dataRow);
  }
  
  return header + '\n    ' + headerRow + '\n    ' + dataRows.join('\n    ') + footer;
}

/**
 * XML 转义
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
 * 确保目录存在
 */
function ensureDirectory(filePath: string): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// ============== 任务管理 ==============

/** 导出任务存储 */
const exportTasks = new Map<string, ExportTask>();

/**
 * 创建导出任务
 */
function createTask(config: ExportConfig, totalRecords: number): ExportTask {
  const taskId = generateTaskId();
  const now = Date.now();
  
  const task: ExportTask = {
    id: taskId,
    format: config.format,
    status: 'pending',
    progress: {
      current: 0,
      total: totalRecords,
      percentage: 0,
      startTime: now,
    },
    createdAt: now,
    totalRecords,
    fields: config.fields || [],
    onProgress: config.onProgress,
    onStatusChange: config.onStatusChange,
  };
  
  exportTasks.set(taskId, task);
  return task;
}

/**
 * 获取任务
 */
function getTask(taskId: string): ExportTask | undefined {
  return exportTasks.get(taskId);
}

/**
 * 更新任务状态
 */
function updateTaskStatus(taskId: string, status: ExportStatus, error?: string): void {
  const task = exportTasks.get(taskId);
  if (!task) return;
  
  task.status = status;
  if (error) {
    task.error = error;
  }
  if (status === 'completed' || status === 'failed' || status === 'cancelled') {
    task.completedAt = Date.now();
  }
  
  // 触发回调
  if (task.onStatusChange) {
    task.onStatusChange(taskId, status);
  }
}

/**
 * 更新任务进度
 */
function updateTaskProgress(taskId: string, current: number, currentItem?: string): void {
  const task = exportTasks.get(taskId);
  if (!task) return;
  
  const progress = task.progress;
  progress.current = current;
  progress.percentage = Math.min(100, Math.round((current / progress.total) * 100));
  progress.estimatedRemainingSeconds = calculateEstimatedTime(progress);
  progress.currentItem = currentItem;
  
  // 触发回调
  if (task.onProgress) {
    task.onProgress(taskId, progress);
  }
}

// ============== 核心导出功能 ==============

/**
 * 导出数组数据
 */
export async function exportArrayData<T extends object = any>(
  dataSource: ArrayDataSource<T>,
  config: ExportConfig
): Promise<ExportResult> {
  const startTime = Date.now();
  const { data } = dataSource;
  const totalRecords = data.length;
  
  // 确定字段
  let fields = config.fields || [];
  if (fields.length === 0 && totalRecords > 0) {
    fields = Object.keys(data[0]);
  }
  
  // 创建任务
  const task = createTask(config, totalRecords);
  
  try {
    // 更新状态为处理中
    updateTaskStatus(task.id, 'processing');
    
    // 分页处理
    const pageSize = config.pageSize || 1000;
    const allData: T[] = [];
    
    for (let i = 0; i < totalRecords; i += pageSize) {
      const chunk = data.slice(i, i + pageSize);
      allData.push(...chunk);
      
      // 更新进度
      updateTaskProgress(task.id, Math.min(i + pageSize, totalRecords));
      
      // 模拟异步，避免阻塞
      await new Promise(resolve => setTimeout(resolve, 0));
    }
    
    // 转换数据
    let content: string;
    switch (config.format) {
      case 'csv':
        content = convertToCSV(allData, fields, config.csvDelimiter || ',', config.includeHeader !== false);
        break;
      case 'json':
        content = convertToJSON(allData, fields);
        break;
      case 'excel':
      case 'xlsx':
        content = convertToExcelXML(allData, fields, config.sheetName || 'Sheet1');
        break;
      default:
        throw new Error(`不支持的导出格式：${config.format}`);
    }
    
    // 确保目录存在
    ensureDirectory(config.outputPath);
    
    // 写入文件
    fs.writeFileSync(config.outputPath, content, 'utf-8');
    
    // 获取文件大小
    const fileSize = fs.statSync(config.outputPath).size;
    
    // 更新任务状态
    updateTaskStatus(task.id, 'completed');
    task.outputPath = config.outputPath;
    
    const exportTime = Date.now() - startTime;
    
    return {
      taskId: task.id,
      status: 'completed',
      outputPath: config.outputPath,
      exportedRecords: totalRecords,
      exportTime,
      fileSize,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    updateTaskStatus(task.id, 'failed', errorMessage);
    
    return {
      taskId: task.id,
      status: 'failed',
      exportedRecords: 0,
      exportTime: Date.now() - startTime,
      error: errorMessage,
    };
  }
}

/**
 * 导出分页数据源 (大数据集)
 */
export async function exportPaginatedData<T extends object = any>(
  dataSource: PaginatedDataSource<T>,
  config: ExportConfig
): Promise<ExportResult> {
  const startTime = Date.now();
  
  // 获取总记录数
  let totalRecords: number;
  if (dataSource.getTotalCount) {
    totalRecords = await dataSource.getTotalCount();
  } else {
    // 通过第一页推断
    const firstPage = await dataSource.getPage(0, config.pageSize || 1000);
    totalRecords = firstPage.total;
  }
  
  // 确定字段
  let fields = config.fields || [];
  if (fields.length === 0) {
    const firstPage = await dataSource.getPage(0, 1);
    if (firstPage.data.length > 0) {
      fields = Object.keys(firstPage.data[0]);
    }
  }
  
  // 创建任务
  const task = createTask(config, totalRecords);
  
  // 临时文件存储
  const tempDir = path.dirname(config.outputPath);
  const tempFileName = `temp_${task.id}`;
  const tempFilePath = path.join(tempDir, tempFileName);
  
  try {
    // 更新状态为处理中
    updateTaskStatus(task.id, 'processing');
    
    // 确保目录存在
    ensureDirectory(config.outputPath);
    
    // 初始化文件
    let isHeaderWritten = false;
    
    // 分页获取数据
    let page = 0;
    let exportedCount = 0;
    let hasMore = true;
    const pageSize = config.pageSize || 1000;
    
    // 根据格式选择写入方式
    const format = config.format;
    
    while (hasMore) {
      const result = await dataSource.getPage(page, pageSize);
      const { data, hasMore: more } = result;
      hasMore = more;
      
      if (data.length > 0) {
        // 转换当前页数据
        let content: string;
        
        switch (format) {
          case 'csv':
            content = convertToCSV(data, fields, config.csvDelimiter || ',', !isHeaderWritten && config.includeHeader !== false);
            isHeaderWritten = true;
            break;
          case 'json':
            // JSON 需要特殊处理，先收集所有数据
            content = convertToJSON(data, fields);
            break;
          case 'excel':
          case 'xlsx':
            content = convertToExcelXML(data, fields, config.sheetName || 'Sheet1');
            break;
          default:
            throw new Error(`不支持的导出格式：${format}`);
        }
        
        // 追加写入文件
        if (format === 'csv' || format === 'excel' || format === 'xlsx') {
          if (exportedCount === 0 && format !== 'csv') {
            fs.writeFileSync(tempFilePath, content, 'utf-8');
          } else {
            fs.appendFileSync(tempFilePath, '\n' + content, 'utf-8');
          }
        }
        
        exportedCount += data.length;
        
        // 更新进度
        updateTaskProgress(task.id, exportedCount);
      }
      
      page++;
      
      // 避免阻塞
      await new Promise(resolve => setTimeout(resolve, 0));
    }
    
    // 对于 JSON 格式，需要重新处理
    if (format === 'json') {
      // 重新获取所有数据 (简化实现，生产环境应使用流式 JSON)
      const allData: T[] = [];
      page = 0;
      hasMore = true;
      
      while (hasMore) {
        const result = await dataSource.getPage(page, pageSize);
        allData.push(...result.data);
        hasMore = result.hasMore;
        page++;
      }
      
      const jsonContent = convertToJSON(allData, fields);
      fs.writeFileSync(config.outputPath, jsonContent, 'utf-8');
      
      // 清理临时文件
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
    } else {
      // 移动临时文件到目标位置
      fs.renameSync(tempFilePath, config.outputPath);
    }
    
    // 获取文件大小
    const fileSize = fs.statSync(config.outputPath).size;
    
    // 更新任务状态
    updateTaskStatus(task.id, 'completed');
    task.outputPath = config.outputPath;
    
    const exportTime = Date.now() - startTime;
    
    return {
      taskId: task.id,
      status: 'completed',
      outputPath: config.outputPath,
      exportedRecords: exportedCount,
      exportTime,
      fileSize,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    updateTaskStatus(task.id, 'failed', errorMessage);
    
    // 清理临时文件
    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }
    
    return {
      taskId: task.id,
      status: 'failed',
      exportedRecords: 0,
      exportTime: Date.now() - startTime,
      error: errorMessage,
    };
  }
}

/**
 * 获取任务状态
 */
export function getTaskStatus(taskId: string): ExportTask | undefined {
  return getTask(taskId);
}

/**
 * 获取所有任务
 */
export function getAllTasks(): ExportTask[] {
  return Array.from(exportTasks.values());
}

/**
 * 取消任务
 */
export function cancelTask(taskId: string): boolean {
  const task = getTask(taskId);
  if (!task || task.status !== 'processing' && task.status !== 'pending') {
    return false;
  }
  
  updateTaskStatus(taskId, 'cancelled');
  return true;
}

/**
 * 清理已完成的任务
 */
export function cleanupTasks(maxAgeHours: number = 24): number {
  const now = Date.now();
  const maxAge = maxAgeHours * 60 * 60 * 1000;
  let cleaned = 0;
  
  const taskIds = Array.from(exportTasks.keys());
  for (const taskId of taskIds) {
    const task = exportTasks.get(taskId);
    if (task && task.completedAt && (now - task.completedAt) > maxAge) {
      exportTasks.delete(taskId);
      cleaned++;
    }
  }
  
  return cleaned;
}

// ============== 便捷导出函数 ==============

/**
 * 快速导出为 CSV
 */
export async function exportToCSV<T extends object = any>(
  data: T[],
  outputPath: string,
  options?: Partial<ExportConfig>
): Promise<ExportResult> {
  return exportArrayData(
    { data },
    {
      format: 'csv',
      outputPath,
      ...options,
    }
  );
}

/**
 * 快速导出为 JSON
 */
export async function exportToJSON<T extends object = any>(
  data: T[],
  outputPath: string,
  options?: Partial<ExportConfig>
): Promise<ExportResult> {
  return exportArrayData(
    { data },
    {
      format: 'json',
      outputPath,
      ...options,
    }
  );
}

/**
 * 快速导出为 Excel
 */
export async function exportToExcel<T extends object = any>(
  data: T[],
  outputPath: string,
  options?: Partial<ExportConfig>
): Promise<ExportResult> {
  return exportArrayData(
    { data },
    {
      format: 'excel',
      outputPath,
      ...options,
    }
  );
}

// ============== 导出默认对象 ==============

export default {
  exportArrayData,
  exportPaginatedData,
  getTaskStatus,
  getAllTasks,
  cancelTask,
  cleanupTasks,
  exportToCSV,
  exportToJSON,
  exportToExcel,
};
