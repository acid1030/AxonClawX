/**
 * Logger Lite Skill - 精简版日志记录工具
 * 
 * 功能:
 * 1. 多级别日志 (debug/info/warn/error)
 * 2. 日志格式化 (JSON + 彩色控制台)
 * 3. 文件输出 (自动轮转)
 * 
 * @author Axon (KAEL Engineering)
 * @version 1.0.0
 * @dependencies 无 (纯 Node.js 原生模块)
 */

import * as fs from 'fs';
import * as path from 'path';

// ============== 类型定义 ==============

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  /** ISO 8601 时间戳 */
  timestamp: string;
  /** 日志级别 */
  level: LogLevel;
  /** 模块/组件名称 */
  module: string;
  /** 日志消息 */
  message: string;
  /** 附加数据 (可选) */
  data?: any;
  /** 错误堆栈 (可选) */
  trace?: string;
}

export interface LoggerLiteConfig {
  /** 日志文件目录 (默认: ./logs) */
  logDir?: string;
  /** 单文件最大大小 (默认: 10MB) */
  maxFileSize?: number;
  /** 最多保留的文件数 (默认: 5) */
  maxFiles?: number;
  /** 默认日志级别 (默认: 'info') */
  defaultLevel?: LogLevel;
  /** 是否输出到控制台 (默认: true) */
  consoleOutput?: boolean;
  /** 日志文件名前缀 (默认: 'app') */
  fileNamePrefix?: string;
}

export interface LogQueryOptions {
  /** 按级别过滤 */
  level?: LogLevel | LogLevel[];
  /** 按模块过滤 */
  module?: string;
  /** 开始时间 (ISO 8601) */
  startTime?: string;
  /** 结束时间 (ISO 8601) */
  endTime?: string;
  /** 关键词搜索 */
  search?: string;
  /** 返回数量限制 */
  limit?: number;
  /** 偏移量 */
  offset?: number;
}

export interface LoggerStats {
  /** 总日志条目数 */
  totalEntries: number;
  /** 按级别统计 */
  byLevel: Record<LogLevel, number>;
  /** 按模块统计 */
  byModule: Record<string, number>;
  /** 总文件大小 (bytes) */
  totalSize: number;
}

// ============== 日志级别优先级 ==============

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

// ============== ANSI 颜色代码 ==============

const ANSI_COLORS = {
  debug: '\x1b[36m',   // 青色
  info: '\x1b[32m',    // 绿色
  warn: '\x1b[33m',    // 黄色
  error: '\x1b[31m',   // 红色
  reset: '\x1b[0m',
};

// ============== 默认配置 ==============

const DEFAULT_CONFIG: Required<LoggerLiteConfig> = {
  logDir: path.join(process.cwd(), 'logs'),
  maxFileSize: 10 * 1024 * 1024, // 10MB
  maxFiles: 5,
  defaultLevel: 'info',
  consoleOutput: true,
  fileNamePrefix: 'app',
};

// ============== LoggerLite 类 ==============

export class LoggerLite {
  private config: Required<LoggerLiteConfig>;
  private currentFile: string;
  private currentFileSize: number = 0;

  constructor(config?: LoggerLiteConfig) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.ensureLogDir();
    this.currentFile = this.getLogFileName(0);
    this.currentFileSize = this.getFileSize(this.currentFile);
    this.checkRotation();
  }

  // ============== 核心日志方法 ==============

  /**
   * 记录 DEBUG 级别日志
   */
  debug(module: string, message: string, data?: any): void {
    this.log('debug', module, message, data);
  }

  /**
   * 记录 INFO 级别日志
   */
  info(module: string, message: string, data?: any): void {
    this.log('info', module, message, data);
  }

  /**
   * 记录 WARN 级别日志
   */
  warn(module: string, message: string, data?: any): void {
    this.log('warn', module, message, data);
  }

  /**
   * 记录 ERROR 级别日志
   */
  error(module: string, message: string, data?: any): void {
    this.log('error', module, message, data);
  }

  // ============== 私有方法 ==============

  private log(level: LogLevel, module: string, message: string, data?: any): void {
    // 检查日志级别
    if (LOG_LEVEL_PRIORITY[level] < LOG_LEVEL_PRIORITY[this.config.defaultLevel]) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      module,
      message,
      data,
      trace: data instanceof Error ? data.stack : undefined,
    };

    const formatted = this.formatLog(entry);

    // 写入文件
    this.writeToFile(formatted);

    // 输出到控制台
    if (this.config.consoleOutput) {
      this.writeToConsole(entry);
    }
  }

  private formatLog(entry: LogEntry): string {
    return JSON.stringify(entry) + '\n';
  }

  private writeToFile(formatted: string): void {
    this.checkRotation();
    
    fs.appendFileSync(this.currentFile, formatted);
    this.currentFileSize += Buffer.byteLength(formatted, 'utf8');
  }

  private writeToConsole(entry: LogEntry): void {
    const color = ANSI_COLORS[entry.level];
    const timestamp = new Date(entry.timestamp).toLocaleString('zh-CN');
    
    console.log(
      `${color}[${timestamp}]${ANSI_COLORS.reset} [${entry.level.toUpperCase()}] [${entry.module}] ${entry.message}`
    );
    
    if (entry.data !== undefined) {
      console.log(color, entry.data, ANSI_COLORS.reset);
    }
  }

  // ============== 日志文件轮转 ==============

  private checkRotation(): void {
    if (this.currentFileSize >= this.config.maxFileSize) {
      this.rotateFiles();
    }
  }

  private rotateFiles(): void {
    // 删除最旧的文件
    const oldestFile = this.getLogFileName(this.config.maxFiles - 1);
    if (fs.existsSync(oldestFile)) {
      fs.unlinkSync(oldestFile);
    }

    // 重命名现有文件 (从后往前)
    for (let i = this.config.maxFiles - 2; i >= 0; i--) {
      const oldPath = this.getLogFileName(i);
      const newPath = this.getLogFileName(i + 1);
      
      if (fs.existsSync(oldPath)) {
        fs.renameSync(oldPath, newPath);
      }
    }

    // 当前文件重命名为 .1
    const currentPath = this.getLogFileName(0);
    if (fs.existsSync(currentPath)) {
      const newPath = this.getLogFileName(1);
      fs.renameSync(currentPath, newPath);
    }

    // 重置当前文件
    this.currentFile = this.getLogFileName(0);
    this.currentFileSize = 0;
  }

  private getLogFileName(index: number): string {
    return path.join(this.config.logDir, `${this.config.fileNamePrefix}.${index}.log`);
  }

  private getFileSize(filePath: string): number {
    try {
      return fs.statSync(filePath).size;
    } catch {
      return 0;
    }
  }

  private ensureLogDir(): void {
    if (!fs.existsSync(this.config.logDir)) {
      fs.mkdirSync(this.config.logDir, { recursive: true });
    }
  }

  // ============== 日志查询 API ==============

  /**
   * 查询日志条目
   */
  query(options: LogQueryOptions = {}): LogEntry[] {
    const results: LogEntry[] = [];
    const logFiles = this.getLogFiles();

    for (const file of logFiles) {
      const content = fs.readFileSync(file, 'utf-8');
      const lines = content.trim().split('\n');

      for (const line of lines) {
        if (!line.trim()) continue;

        try {
          const entry: LogEntry = JSON.parse(line);

          if (this.matchesFilter(entry, options)) {
            results.push(entry);
          }
        } catch {
          // 跳过无效的 JSON 行
          continue;
        }
      }
    }

    // 排序 (最新的在前)
    results.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    // 分页
    const offset = options.offset || 0;
    const limit = options.limit || 100;
    return results.slice(offset, offset + limit);
  }

  private matchesFilter(entry: LogEntry, options: LogQueryOptions): boolean {
    // 级别过滤
    if (options.level) {
      const levels = Array.isArray(options.level) ? options.level : [options.level];
      if (!levels.includes(entry.level)) {
        return false;
      }
    }

    // 模块过滤
    if (options.module && !entry.module.includes(options.module)) {
      return false;
    }

    // 时间范围过滤
    if (options.startTime && new Date(entry.timestamp) < new Date(options.startTime)) {
      return false;
    }
    if (options.endTime && new Date(entry.timestamp) > new Date(options.endTime)) {
      return false;
    }

    // 关键词搜索
    if (options.search) {
      const searchLower = options.search.toLowerCase();
      const messageMatch = entry.message.toLowerCase().includes(searchLower);
      const moduleMatch = entry.module.toLowerCase().includes(searchLower);
      const dataMatch = entry.data ? JSON.stringify(entry.data).toLowerCase().includes(searchLower) : false;
      
      if (!messageMatch && !moduleMatch && !dataMatch) {
        return false;
      }
    }

    return true;
  }

  private getLogFiles(): string[] {
    const files: string[] = [];
    
    for (let i = 0; i < this.config.maxFiles; i++) {
      const filePath = this.getLogFileName(i);
      if (fs.existsSync(filePath)) {
        files.push(filePath);
      }
    }

    return files;
  }

  // ============== 统计信息 ==============

  /**
   * 获取日志统计信息
   */
  getStats(): LoggerStats {
    const stats: LoggerStats = {
      totalEntries: 0,
      byLevel: { debug: 0, info: 0, warn: 0, error: 0 },
      byModule: {},
      totalSize: 0,
    };

    const logFiles = this.getLogFiles();
    
    for (const file of logFiles) {
      stats.totalSize += this.getFileSize(file);
      
      const content = fs.readFileSync(file, 'utf-8');
      const lines = content.trim().split('\n');

      for (const line of lines) {
        if (!line.trim()) continue;

        try {
          const entry: LogEntry = JSON.parse(line);
          stats.totalEntries++;
          stats.byLevel[entry.level]++;
          stats.byModule[entry.module] = (stats.byModule[entry.module] || 0) + 1;
        } catch {
          continue;
        }
      }
    }

    return stats;
  }

  // ============== 工具方法 ==============

  /**
   * 清空所有日志文件
   */
  clear(): void {
    const logFiles = this.getLogFiles();
    for (const file of logFiles) {
      fs.unlinkSync(file);
    }
    this.currentFileSize = 0;
  }

  /**
   * 导出日志为 JSONL 格式
   */
  export(options?: LogQueryOptions): string {
    const entries = this.query(options);
    return entries.map(e => JSON.stringify(e)).join('\n');
  }

  /**
   * 获取当前日志文件路径
   */
  getCurrentLogPath(): string {
    return this.currentFile;
  }

  /**
   * 获取日志目录路径
   */
  getLogDir(): string {
    return this.config.logDir;
  }
}

// ============== 单例模式 ==============

let defaultLogger: LoggerLite | null = null;

/**
 * 获取默认日志记录器实例
 */
export function getLogger(config?: LoggerLiteConfig): LoggerLite {
  if (!defaultLogger) {
    defaultLogger = new LoggerLite(config);
  }
  return defaultLogger;
}

/**
 * 重置默认日志记录器
 */
export function resetLogger(): void {
  defaultLogger = null;
}

// ============== 便捷函数 ==============

export const debug = (module: string, message: string, data?: any) => 
  getLogger().debug(module, message, data);

export const info = (module: string, message: string, data?: any) => 
  getLogger().info(module, message, data);

export const warn = (module: string, message: string, data?: any) => 
  getLogger().warn(module, message, data);

export const error = (module: string, message: string, data?: any) => 
  getLogger().error(module, message, data);

export const query = (options?: LogQueryOptions) => 
  getLogger().query(options);

export const getStats = () => 
  getLogger().getStats();

// ============== 导出默认对象 ==============

export default {
  LoggerLite,
  getLogger,
  resetLogger,
  debug,
  info,
  warn,
  error,
  query,
  getStats,
};
