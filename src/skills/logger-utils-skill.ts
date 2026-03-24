/**
 * Logger Utils Skill - ACE 日志工具
 * 
 * 功能:
 * 1. 日志级别 (DEBUG, INFO, WARN, ERROR, FATAL)
 * 2. 日志格式化 (时间戳、级别、模块、消息)
 * 3. 日志输出 (控制台、文件)
 */

// ============== 日志级别定义 ==============
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4,
}

// ============== 日志配置 ==============
export interface LoggerConfig {
  level: LogLevel;           // 最低日志级别
  module?: string;           // 模块名称
  outputFile?: string;       // 输出文件路径 (可选)
  colorful?: boolean;        // 是否启用彩色输出
  timestamp?: boolean;       // 是否显示时间戳
}

// ============== 日志条目 ==============
export interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  module: string;
  message: string;
  data?: any;
}

// ============== 颜色代码 (ANSI) ==============
const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  DEBUG: '\x1b[36m',      // 青色
  INFO: '\x1b[32m',       // 绿色
  WARN: '\x1b[33m',       // 黄色
  ERROR: '\x1b[31m',      // 红色
  FATAL: '\x1b[35m',      // 紫色
  module: '\x1b[34m',     // 蓝色
  timestamp: '\x1b[90m',  // 灰色
};

// ============== 日志工具类 ==============
export class Logger {
  private config: LoggerConfig;
  private writeStream: any = null;

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      level: config.level ?? LogLevel.INFO,
      module: config.module ?? 'DEFAULT',
      outputFile: config.outputFile,
      colorful: config.colorful ?? true,
      timestamp: config.timestamp ?? true,
    };

    // 初始化文件输出流 (如果指定了文件)
    if (this.config.outputFile) {
      this.initFileOutput();
    }
  }

  // 初始化文件输出
  private initFileOutput() {
    // 注意：实际使用中需要 Node.js 的 fs 模块
    // 这里提供接口，具体实现根据运行环境调整
    console.log(`[Logger] Output file configured: ${this.config.outputFile}`);
  }

  // 格式化时间戳
  private formatTimestamp(date: Date): string {
    return date.toISOString().replace('T', ' ').substring(0, 23);
  }

  // 获取级别名称
  private getLevelName(level: LogLevel): string {
    return LogLevel[level];
  }

  // 格式化日志消息
  private formatLog(entry: LogEntry): string {
    const { timestamp, level, module, message, data } = entry;
    
    let output = '';

    // 时间戳
    if (this.config.timestamp) {
      const ts = this.formatTimestamp(timestamp);
      output += this.colorize(ts, 'timestamp') + ' ';
    }

    // 日志级别
    const levelName = this.getLevelName(level);
    output += this.colorize(`[${levelName}]`, levelName) + ' ';

    // 模块名称
    output += this.colorize(`[${module}]`, 'module') + ' ';

    // 消息内容
    output += message;

    // 附加数据
    if (data !== undefined) {
      output += ' ' + JSON.stringify(data);
    }

    return output;
  }

  // 彩色输出
  private colorize(text: string, colorKey: string): string {
    if (!this.config.colorful) {
      return text;
    }
    const color = (COLORS as any)[colorKey];
    return color ? `${color}${text}${COLORS.reset}` : text;
  }

  // 核心日志方法
  private log(level: LogLevel, message: string, data?: any): void {
    // 检查日志级别
    if (level < this.config.level) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      module: this.config.module || 'DEFAULT',
      message,
      data,
    };

    const formatted = this.formatLog(entry);

    // 输出到控制台
    switch (level) {
      case LogLevel.DEBUG:
      case LogLevel.INFO:
        console.log(formatted);
        break;
      case LogLevel.WARN:
        console.warn(formatted);
        break;
      case LogLevel.ERROR:
      case LogLevel.FATAL:
        console.error(formatted);
        break;
    }

    // 输出到文件 (如果配置了)
    if (this.config.outputFile) {
      this.writeToFile(formatted);
    }
  }

  // 写入文件
  private writeToFile(message: string): void {
    // 实际实现需要 fs.appendFileSync
    // 这里提供接口占位
    // fs.appendFileSync(this.config.outputFile!, message + '\n');
  }

  // ============== 公开 API ==============
  
  debug(message: string, data?: any): void {
    this.log(LogLevel.DEBUG, message, data);
  }

  info(message: string, data?: any): void {
    this.log(LogLevel.INFO, message, data);
  }

  warn(message: string, data?: any): void {
    this.log(LogLevel.WARN, message, data);
  }

  error(message: string, data?: any): void {
    this.log(LogLevel.ERROR, message, data);
  }

  fatal(message: string, data?: any): void {
    this.log(LogLevel.FATAL, message, data);
  }

  // 创建子日志器 (不同模块)
  child(module: string): Logger {
    return new Logger({
      ...this.config,
      module,
    });
  }

  // 设置日志级别
  setLevel(level: LogLevel): void {
    this.config.level = level;
  }
}

// ============== 快捷工厂函数 ==============
export function createLogger(config?: Partial<LoggerConfig>): Logger {
  return new Logger(config);
}

// ============== 默认导出 ==============
export default Logger;
