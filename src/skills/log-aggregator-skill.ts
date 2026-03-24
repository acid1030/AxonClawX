/**
 * Log Aggregator Skill - ACE 日志聚合工具
 * 
 * 功能:
 * 1. 日志收集 - 从多个源收集日志
 * 2. 日志聚合 - 合并和整理日志数据
 * 3. 日志查询 - 支持多维度搜索和过滤
 * 
 * 交付物:
 * - src/skills/log-aggregator-skill.ts
 * - 使用示例
 */

// ============== 日志级别定义 ==============
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4,
}

// ============== 日志来源 ==============
export enum LogSource {
  CONSOLE = 'console',
  FILE = 'file',
  NETWORK = 'network',
  DATABASE = 'database',
  AGENT = 'agent',
  SYSTEM = 'system',
}

// ============== 日志条目 ==============
export interface LogEntry {
  id: string;                    // 唯一标识
  timestamp: number;             // 时间戳 (ms)
  level: LogLevel;               // 日志级别
  source: LogSource;             // 日志来源
  module: string;                // 模块名称
  message: string;               // 日志消息
  data?: any;                    // 附加数据
  context?: Record<string, any>; // 上下文信息
}

// ============== 查询条件 ==============
export interface LogQuery {
  level?: LogLevel;              // 日志级别
  source?: LogSource;            // 日志来源
  module?: string;               // 模块名称
  startTime?: number;            // 开始时间
  endTime?: number;              // 结束时间
  keyword?: string;              // 关键词搜索
  limit?: number;                // 返回数量限制
  offset?: number;               // 偏移量
}

// ============== 聚合统计 ==============
export interface LogStats {
  total: number;                 // 总日志数
  byLevel: Record<string, number>;    // 按级别统计
  bySource: Record<string, number>;   // 按来源统计
  byModule: Record<string, number>;   // 按模块统计
  timeRange: {
    start: number;
    end: number;
  };
}

// ============== 日志收集器 ==============
export class LogCollector {
  private entries: LogEntry[] = [];
  private maxEntries: number = 10000; // 最大存储条目数
  private listeners: ((entry: LogEntry) => void)[] = [];

  constructor(maxEntries: number = 10000) {
    this.maxEntries = maxEntries;
  }

  /**
   * 收集日志条目
   */
  collect(entry: Omit<LogEntry, 'id' | 'timestamp'>): LogEntry {
    const logEntry: LogEntry = {
      ...entry,
      id: this.generateId(),
      timestamp: Date.now(),
    };

    this.entries.push(logEntry);
    
    // 超出限制时移除最旧的日志
    if (this.entries.length > this.maxEntries) {
      this.entries.shift();
    }

    // 通知监听器
    this.notifyListeners(logEntry);

    return logEntry;
  }

  /**
   * 批量收集日志
   */
  collectBatch(entries: Omit<LogEntry, 'id' | 'timestamp'>[]): LogEntry[] {
    return entries.map(entry => this.collect(entry));
  }

  /**
   * 从文件收集日志
   */
  collectFromFile(filePath: string, options?: { source?: LogSource; module?: string }): LogEntry[] {
    // 模拟文件读取 (实际使用需要 fs 模块)
    console.log(`[LogCollector] Reading from file: ${filePath}`);
    
    const source = options?.source ?? LogSource.FILE;
    const module = options?.module ?? 'file-reader';

    // 示例：解析日志文件
    const mockEntries: Omit<LogEntry, 'id' | 'timestamp'>[] = [
      {
        level: LogLevel.INFO,
        source,
        module,
        message: `File loaded: ${filePath}`,
      },
    ];

    return this.collectBatch(mockEntries);
  }

  /**
   * 从网络端点收集日志
   */
  collectFromNetwork(url: string, options?: { source?: LogSource; module?: string }): Promise<LogEntry[]> {
    // 模拟网络请求 (实际使用需要 fetch/http 模块)
    console.log(`[LogCollector] Fetching from: ${url}`);
    
    const source = options?.source ?? LogSource.NETWORK;
    const module = options?.module ?? 'network-reader';

    const mockEntries: Omit<LogEntry, 'id' | 'timestamp'>[] = [
      {
        level: LogLevel.INFO,
        source,
        module,
        message: `Network data fetched from: ${url}`,
      },
    ];

    return Promise.resolve(this.collectBatch(mockEntries));
  }

  /**
   * 添加监听器
   */
  onLog(listener: (entry: LogEntry) => void): void {
    this.listeners.push(listener);
  }

  /**
   * 移除监听器
   */
  offLog(listener: (entry: LogEntry) => void): void {
    const index = this.listeners.indexOf(listener);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  /**
   * 获取所有日志
   */
  getEntries(): LogEntry[] {
    return [...this.entries];
  }

  /**
   * 清空日志
   */
  clear(): void {
    this.entries = [];
  }

  private generateId(): string {
    return `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private notifyListeners(entry: LogEntry): void {
    this.listeners.forEach(listener => {
      try {
        listener(entry);
      } catch (error) {
        console.error('[LogCollector] Listener error:', error);
      }
    });
  }
}

// ============== 日志聚合器 ==============
export class LogAggregator {
  private collectors: Map<string, LogCollector> = new Map();
  private unifiedEntries: LogEntry[] = [];

  /**
   * 注册日志收集器
   */
  registerCollector(name: string, collector: LogCollector): void {
    this.collectors.set(name, collector);
    
    // 监听新收集器的日志
    collector.onLog(entry => {
      this.unifiedEntries.push(entry);
      this.maintainLimit();
    });
  }

  /**
   * 获取聚合后的日志
   */
  getAggregatedLogs(query?: LogQuery): LogEntry[] {
    let logs = [...this.unifiedEntries];

    // 应用过滤条件
    if (query) {
      logs = this.applyFilters(logs, query);
    }

    // 按时间排序 (最新的在前)
    logs.sort((a, b) => b.timestamp - a.timestamp);

    // 应用分页
    if (query?.limit) {
      const offset = query.offset ?? 0;
      logs = logs.slice(offset, offset + query.limit);
    }

    return logs;
  }

  /**
   * 获取统计信息
   */
  getStats(query?: LogQuery): LogStats {
    const logs = query ? this.getAggregatedLogs(query) : this.getAggregatedLogs();

    const stats: LogStats = {
      total: logs.length,
      byLevel: {},
      bySource: {},
      byModule: {},
      timeRange: {
        start: logs.length > 0 ? logs[logs.length - 1].timestamp : 0,
        end: logs.length > 0 ? logs[0].timestamp : 0,
      },
    };

    logs.forEach(log => {
      // 按级别统计
      const levelKey = LogLevel[log.level];
      stats.byLevel[levelKey] = (stats.byLevel[levelKey] ?? 0) + 1;

      // 按来源统计
      stats.bySource[log.source] = (stats.bySource[log.source] ?? 0) + 1;

      // 按模块统计
      stats.byModule[log.module] = (stats.byModule[log.module] ?? 0) + 1;
    });

    return stats;
  }

  /**
   * 按时间窗口聚合
   */
  aggregateByTimeWindow(windowMs: number = 60000): Map<number, LogEntry[]> {
    const windows = new Map<number, LogEntry[]>();
    
    this.unifiedEntries.forEach(log => {
      const windowStart = Math.floor(log.timestamp / windowMs) * windowMs;
      
      if (!windows.has(windowStart)) {
        windows.set(windowStart, []);
      }
      
      windows.get(windowStart)!.push(log);
    });

    return windows;
  }

  /**
   * 按模块聚合
   */
  aggregateByModule(): Map<string, LogEntry[]> {
    const modules = new Map<string, LogEntry[]>();

    this.unifiedEntries.forEach(log => {
      if (!modules.has(log.module)) {
        modules.set(log.module, []);
      }
      
      modules.get(log.module)!.push(log);
    });

    return modules;
  }

  private applyFilters(logs: LogEntry[], query: LogQuery): LogEntry[] {
    return logs.filter(log => {
      if (query.level !== undefined && log.level !== query.level) {
        return false;
      }
      if (query.source !== undefined && log.source !== query.source) {
        return false;
      }
      if (query.module !== undefined && log.module !== query.module) {
        return false;
      }
      if (query.startTime !== undefined && log.timestamp < query.startTime) {
        return false;
      }
      if (query.endTime !== undefined && log.timestamp > query.endTime) {
        return false;
      }
      if (query.keyword !== undefined) {
        const keyword = query.keyword.toLowerCase();
        const match = log.message.toLowerCase().includes(keyword) ||
                     (log.data && JSON.stringify(log.data).toLowerCase().includes(keyword));
        if (!match) return false;
      }
      return true;
    });
  }

  private maintainLimit(): void {
    const maxEntries = 50000; // 聚合日志最大数量
    if (this.unifiedEntries.length > maxEntries) {
      this.unifiedEntries = this.unifiedEntries.slice(-maxEntries);
    }
  }
}

// ============== 日志查询器 ==============
export class LogSearcher {
  private aggregator: LogAggregator;

  constructor(aggregator: LogAggregator) {
    this.aggregator = aggregator;
  }

  /**
   * 关键词搜索
   */
  search(keyword: string, options?: { caseSensitive?: boolean; limit?: number }): LogEntry[] {
    const logs = this.aggregator.getAggregatedLogs();
    const caseSensitive = options?.caseSensitive ?? false;
    const limit = options?.limit ?? 100;

    const results = logs.filter(log => {
      const message = caseSensitive ? log.message : log.message.toLowerCase();
      const searchKeyword = caseSensitive ? keyword : keyword.toLowerCase();
      
      if (message.includes(searchKeyword)) {
        return true;
      }

      if (log.data) {
        const dataStr = caseSensitive 
          ? JSON.stringify(log.data) 
          : JSON.stringify(log.data).toLowerCase();
        if (dataStr.includes(searchKeyword)) {
          return true;
        }
      }

      return false;
    });

    return results.slice(0, limit);
  }

  /**
   * 正则表达式搜索
   */
  searchByRegex(pattern: RegExp, limit: number = 100): LogEntry[] {
    const logs = this.aggregator.getAggregatedLogs();
    
    const results = logs.filter(log => {
      if (pattern.test(log.message)) {
        return true;
      }

      if (log.data) {
        const dataStr = JSON.stringify(log.data);
        if (pattern.test(dataStr)) {
          return true;
        }
      }

      return false;
    });

    return results.slice(0, limit);
  }

  /**
   * 按级别过滤
   */
  filterByLevel(level: LogLevel, minLevel: boolean = true): LogEntry[] {
    const logs = this.aggregator.getAggregatedLogs();
    
    if (minLevel) {
      return logs.filter(log => log.level >= level);
    } else {
      return logs.filter(log => log.level === level);
    }
  }

  /**
   * 按时间范围过滤
   */
  filterByTimeRange(start: number, end: number): LogEntry[] {
    const query: LogQuery = {
      startTime: start,
      endTime: end,
    };
    return this.aggregator.getAggregatedLogs(query);
  }

  /**
   * 获取错误日志
   */
  getErrors(): LogEntry[] {
    return this.filterByLevel(LogLevel.ERROR, true);
  }

  /**
   * 获取警告日志
   */
  getWarnings(): LogEntry[] {
    return this.filterByLevel(LogLevel.WARN, true);
  }
}

// ============== 日志导出器 ==============
export class LogExporter {
  /**
   * 导出为 JSON
   */
  exportToJson(logs: LogEntry[]): string {
    return JSON.stringify(logs, null, 2);
  }

  /**
   * 导出为 CSV
   */
  exportToCsv(logs: LogEntry[]): string {
    const headers = ['ID', 'Timestamp', 'Level', 'Source', 'Module', 'Message'];
    const rows = logs.map(log => [
      log.id,
      new Date(log.timestamp).toISOString(),
      LogLevel[log.level],
      log.source,
      log.module,
      `"${log.message.replace(/"/g, '""')}"`,
    ]);

    return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
  }

  /**
   * 导出为文本
   */
  exportToText(logs: LogEntry[]): string {
    return logs.map(log => {
      const timestamp = new Date(log.timestamp).toISOString();
      const level = LogLevel[log.level];
      return `[${timestamp}] [${level}] [${log.module}] ${log.message}`;
    }).join('\n');
  }
}

// ============== 使用示例 ==============
/**
 * 示例 1: 基础使用
 */
export function example1_BasicUsage() {
  // 创建收集器
  const collector = new LogCollector();

  // 收集日志
  collector.collect({
    level: LogLevel.INFO,
    source: LogSource.AGENT,
    module: 'TaskExecutor',
    message: 'Task started',
    data: { taskId: '123' },
  });

  collector.collect({
    level: LogLevel.ERROR,
    source: LogSource.AGENT,
    module: 'TaskExecutor',
    message: 'Task failed',
    data: { error: 'Timeout' },
  });

  // 获取日志
  const logs = collector.getEntries();
  console.log(`Collected ${logs.length} logs`);
}

/**
 * 示例 2: 聚合多个收集器
 */
export function example2_AggregateMultipleCollectors() {
  const aggregator = new LogAggregator();

  // 创建多个收集器
  const agentCollector = new LogCollector();
  const systemCollector = new LogCollector();

  // 注册收集器
  aggregator.registerCollector('agent', agentCollector);
  aggregator.registerCollector('system', systemCollector);

  // 收集日志
  agentCollector.collect({
    level: LogLevel.INFO,
    source: LogSource.AGENT,
    module: 'Agent1',
    message: 'Agent initialized',
  });

  systemCollector.collect({
    level: LogLevel.WARN,
    source: LogSource.SYSTEM,
    module: 'Memory',
    message: 'High memory usage',
    data: { usage: '85%' },
  });

  // 获取聚合日志
  const allLogs = aggregator.getAggregatedLogs();
  console.log(`Aggregated ${allLogs.length} logs`);

  // 获取统计
  const stats = aggregator.getStats();
  console.log('Stats:', stats);
}

/**
 * 示例 3: 查询和过滤
 */
export function example3_QueryAndFilter() {
  const aggregator = new LogAggregator();
  const collector = new LogCollector();
  aggregator.registerCollector('main', collector);

  // 收集一些日志
  collector.collectBatch([
    { level: LogLevel.DEBUG, source: LogSource.CONSOLE, module: 'App', message: 'Debug message' },
    { level: LogLevel.INFO, source: LogSource.CONSOLE, module: 'App', message: 'Info message' },
    { level: LogLevel.WARN, source: LogSource.CONSOLE, module: 'Database', message: 'Slow query' },
    { level: LogLevel.ERROR, source: LogSource.CONSOLE, module: 'Database', message: 'Connection failed' },
  ]);

  // 创建查询器
  const searcher = new LogSearcher(aggregator);

  // 关键词搜索
  const results = searcher.search('message');
  console.log(`Found ${results.length} logs matching "message"`);

  // 按级别过滤
  const errors = searcher.getErrors();
  console.log(`Found ${errors.length} errors`);

  // 按时间范围查询
  const now = Date.now();
  const lastHour = now - 3600000;
  const recentLogs = searcher.filterByTimeRange(lastHour, now);
  console.log(`Found ${recentLogs.length} logs in the last hour`);
}

/**
 * 示例 4: 导出日志
 */
export function example4_ExportLogs() {
  const aggregator = new LogAggregator();
  const collector = new LogCollector();
  aggregator.registerCollector('main', collector);

  // 收集日志
  collector.collect({
    level: LogLevel.INFO,
    source: LogSource.AGENT,
    module: 'Test',
    message: 'Test log entry',
  });

  const logs = aggregator.getAggregatedLogs();
  const exporter = new LogExporter();

  // 导出为不同格式
  const json = exporter.exportToJson(logs);
  const csv = exporter.exportToCsv(logs);
  const text = exporter.exportToText(logs);

  console.log('JSON:', json);
  console.log('CSV:', csv);
  console.log('Text:', text);
}

/**
 * 示例 5: 实时监控
 */
export function example5_RealTimeMonitoring() {
  const collector = new LogCollector();

  // 添加监听器实现实时监控
  collector.onLog(entry => {
    if (entry.level >= LogLevel.ERROR) {
      console.error('🚨 ERROR DETECTED:', entry.message);
      // 可以触发告警、发送通知等
    }
  });

  // 模拟日志收集
  collector.collect({
    level: LogLevel.ERROR,
    source: LogSource.SYSTEM,
    module: 'Monitor',
    message: 'Critical error detected!',
  });
}

// ============== 导出默认对象 ==============
export default {
  LogLevel,
  LogSource,
  LogCollector,
  LogAggregator,
  LogSearcher,
  LogExporter,
};
