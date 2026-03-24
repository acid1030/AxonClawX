/**
 * 统一日志系统
 * 
 * 功能:
 * - 结构化日志 (JSON 格式)
 * - 日志级别 (DEBUG, INFO, WARN, ERROR)
 * - 文件轮转
 * - 日志聚合
 */

import * as fs from 'fs';
import * as path from 'path';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

export interface LogEntry {
  timestamp: string;
  level: string;
  module: string;
  message: string;
  data?: any;
  context?: {
    nodeId?: string;
    taskId?: string;
    sessionId?: string;
  };
}

export interface LoggerConfig {
  logFile: string;
  level: LogLevel;
  maxSize: number;        // 最大文件大小 (bytes)
  maxFiles: number;       // 最大文件数量
  consoleOutput: boolean;
}

const DEFAULT_CONFIG: LoggerConfig = {
  logFile: path.join(process.env.HOME || '', '.openclaw/logs/axonclaw.log'),
  level: LogLevel.INFO,
  maxSize: 10 * 1024 * 1024,  // 10MB
  maxFiles: 5,
  consoleOutput: true
};

export class Logger {
  private config: LoggerConfig;
  private module: string;
  private context: LogEntry['context'] = {};

  constructor(module: string, config?: Partial<LoggerConfig>) {
    this.module = module;
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.ensureLogDirectory();
  }

  private ensureLogDirectory() {
    const logDir = path.dirname(this.config.logFile);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
  }

  private timestamp(): string {
    return new Date().toISOString();
  }

  private formatLevel(level: LogLevel): string {
    return LogLevel[level];
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.config.level;
  }

  private rotateLogs() {
    try {
      if (!fs.existsSync(this.config.logFile)) {
        return;
      }

      const stats = fs.statSync(this.config.logFile);
      if (stats.size < this.config.maxSize) {
        return;
      }

      // 轮转日志文件
      for (let i = this.config.maxFiles - 1; i >= 1; i--) {
        const oldFile = `${this.config.logFile}.${i}`;
        const newFile = `${this.config.logFile}.${i + 1}`;
        
        if (fs.existsSync(oldFile)) {
          if (i === this.config.maxFiles - 1) {
            fs.unlinkSync(oldFile);  // 删除最旧的文件
          } else {
            fs.renameSync(oldFile, newFile);
          }
        }
      }

      // 移动当前日志
      fs.renameSync(this.config.logFile, `${this.config.logFile}.1`);
    } catch (error) {
      console.error('日志轮转失败:', error);
    }
  }

  private write(entry: LogEntry) {
    // 检查是否需要轮转
    this.rotateLogs();

    const line = JSON.stringify(entry) + '\n';
    
    try {
      fs.appendFileSync(this.config.logFile, line);
    } catch (error) {
      console.error('写入日志失败:', error);
    }

    // 控制台输出
    if (this.config.consoleOutput) {
      const color = {
        [LogLevel.DEBUG]: '\x1b[36m',  // Cyan
        [LogLevel.INFO]: '\x1b[32m',   // Green
        [LogLevel.WARN]: '\x1b[33m',   // Yellow
        [LogLevel.ERROR]: '\x1b[31m'   // Red
      }[entry.level === 'DEBUG' ? 0 : entry.level === 'INFO' ? 1 : entry.level === 'WARN' ? 2 : 3];

      const reset = '\x1b[0m';
      console.log(`${color}[${entry.level}]${reset} [${entry.module}] ${entry.message}`, entry.data || '');
    }
  }

  private createEntry(level: LogLevel, message: string, data?: any): LogEntry {
    return {
      timestamp: this.timestamp(),
      level: this.formatLevel(level),
      module: this.module,
      message,
      data,
      context: { ...this.context }
    };
  }

  // 设置上下文
  setContext(context: Partial<LogEntry['context']>) {
    Object.assign(this.context, context);
  }

  // 日志方法
  debug(message: string, data?: any) {
    if (this.shouldLog(LogLevel.DEBUG)) {
      this.write(this.createEntry(LogLevel.DEBUG, message, data));
    }
  }

  info(message: string, data?: any) {
    if (this.shouldLog(LogLevel.INFO)) {
      this.write(this.createEntry(LogLevel.INFO, message, data));
    }
  }

  warn(message: string, data?: any) {
    if (this.shouldLog(LogLevel.WARN)) {
      this.write(this.createEntry(LogLevel.WARN, message, data));
    }
  }

  error(message: string, data?: any) {
    if (this.shouldLog(LogLevel.ERROR)) {
      this.write(this.createEntry(LogLevel.ERROR, message, data));
    }
  }

  // 快捷方法
  task(taskId: string, message: string, data?: any) {
    this.setContext({ taskId });
    this.info(message, data);
  }

  node(nodeId: string, message: string, data?: any) {
    this.setContext({ nodeId });
    this.info(message, data);
  }
}

// 创建全局日志实例
export function createLogger(module: string, config?: Partial<LoggerConfig>): Logger {
  return new Logger(module, config);
}

// 默认导出
export default Logger;
