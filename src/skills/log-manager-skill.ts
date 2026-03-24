/**
 * KAEL 日志管理工具
 * 
 * 功能:
 * 1. 日志收集 - 从文件或目录收集日志
 * 2. 日志查询 - 按级别、时间、关键字过滤
 * 3. 日志分析 - 统计、趋势、异常检测
 * 
 * @author KAEL
 * @version 1.0.0
 */

import * as fs from 'fs';
import * as path from 'path';

// ==================== 类型定义 ====================

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  source?: string;
  context?: Record<string, any>;
  raw: string;
}

export interface LogStats {
  total: number;
  byLevel: Record<LogLevel, number>;
  timeRange: {
    start: string;
    end: string;
    durationMs: number;
  };
  errorRate: number;
  avgMessagesPerMinute: number;
}

export interface LogPattern {
  pattern: string;
  count: number;
  percentage: number;
  examples: string[];
}

export interface LogAnalysis {
  stats: LogStats;
  patterns: LogPattern[];
  anomalies: {
    timestamp: string;
    level: LogLevel;
    message: string;
    reason: string;
  }[];
  recommendations: string[];
}

export interface LogQueryOptions {
  level?: LogLevel | LogLevel[];
  startTime?: string;
  endTime?: string;
  keyword?: string;
  limit?: number;
  source?: string;
}

export interface LogCollectOptions {
  recursive?: boolean;
  extensions?: string[];
  maxSizeMB?: number;
  excludePatterns?: string[];
}

// ==================== 日志解析 ====================

/**
 * 解析单行日志
 * 支持格式：[TIMESTAMP] [LEVEL] MESSAGE
 * 或：TIMESTAMP LEVEL MESSAGE
 */
export function parseLogLine(line: string, source?: string): LogEntry | null {
  const trimmed = line.trim();
  if (!trimmed) return null;

  // 尝试匹配标准格式：[2024-01-15 10:30:45] [ERROR] Message
  const standardMatch = trimmed.match(/^\[([^\]]+)\]\s*\[([^\]]+)\]\s*(.*)$/);
  if (standardMatch) {
    const [, timestamp, level, message] = standardMatch;
    return {
      timestamp,
      level: level.toUpperCase() as LogLevel,
      message,
      source,
      raw: trimmed,
    };
  }

  // 尝试匹配 ISO 格式：2024-01-15T10:30:45.123Z ERROR Message
  const isoMatch = trimmed.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z?)\s+(DEBUG|INFO|WARN|WARNING|ERROR|FATAL)\s+(.*)$/i);
  if (isoMatch) {
    const [, timestamp, level, message] = isoMatch;
    return {
      timestamp,
      level: (level.toUpperCase().replace('WARNING', 'WARN')) as LogLevel,
      message,
      source,
      raw: trimmed,
    };
  }

  // 尝试匹配简单格式：2024-01-15 10:30:45 ERROR Message
  const simpleMatch = trimmed.match(/^(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}(?:\.\d+)?)\s+(DEBUG|INFO|WARN|WARNING|ERROR|FATAL)\s+(.*)$/i);
  if (simpleMatch) {
    const [, timestamp, level, message] = simpleMatch;
    return {
      timestamp,
      level: (level.toUpperCase().replace('WARNING', 'WARN')) as LogLevel,
      message,
      source,
      raw: trimmed,
    };
  }

  // 无法解析的日志，返回原始内容
  return {
    timestamp: new Date().toISOString(),
    level: 'INFO',
    message: trimmed,
    source,
    raw: trimmed,
  };
}

// ==================== 1. 日志收集 ====================

/**
 * 从单个文件收集日志
 */
export function collectFromFile(filePath: string): LogEntry[] {
  const entries: LogEntry[] = [];
  
  if (!fs.existsSync(filePath)) {
    throw new Error(`文件不存在：${filePath}`);
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const source = path.basename(filePath);

  lines.forEach(line => {
    const entry = parseLogLine(line, source);
    if (entry) {
      entries.push(entry);
    }
  });

  return entries;
}

/**
 * 从目录收集日志
 */
export function collectFromDirectory(
  dirPath: string,
  options: LogCollectOptions = {}
): LogEntry[] {
  const {
    recursive = true,
    extensions = ['.log', '.txt'],
    maxSizeMB = 100,
    excludePatterns = ['node_modules', '.git', 'dist'],
  } = options;

  const entries: LogEntry[] = [];

  if (!fs.existsSync(dirPath)) {
    throw new Error(`目录不存在：${dirPath}`);
  }

  const files = walkDirectory(dirPath, recursive, extensions, excludePatterns);

  files.forEach(file => {
    try {
      const stats = fs.statSync(file);
      if (stats.size > maxSizeMB * 1024 * 1024) {
        console.warn(`跳过超大文件：${file} (${(stats.size / 1024 / 1024).toFixed(2)}MB)`);
        return;
      }
      const fileEntries = collectFromFile(file);
      entries.push(...fileEntries);
    } catch (error) {
      console.warn(`读取文件失败 ${file}:`, error);
    }
  });

  // 按时间戳排序
  entries.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  return entries;
}

/**
 * 遍历目录获取文件列表
 */
function walkDirectory(
  dir: string,
  recursive: boolean,
  extensions: string[],
  excludePatterns: string[]
): string[] {
  const files: string[] = [];

  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      // 检查排除模式
      if (excludePatterns.some(pattern => entry.name.includes(pattern))) {
        continue;
      }

      if (entry.isDirectory()) {
        if (recursive) {
          files.push(...walkDirectory(fullPath, recursive, extensions, excludePatterns));
        }
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name);
        if (extensions.includes(ext)) {
          files.push(fullPath);
        }
      }
    }
  } catch (error) {
    console.warn(`遍历目录失败 ${dir}:`, error);
  }

  return files;
}

// ==================== 2. 日志查询 ====================

/**
 * 查询日志
 */
export function queryLogs(entries: LogEntry[], options: LogQueryOptions = {}): LogEntry[] {
  let result = [...entries];

  // 按级别过滤
  if (options.level) {
    const levels = Array.isArray(options.level) ? options.level : [options.level];
    result = result.filter(entry => levels.includes(entry.level));
  }

  // 按时间范围过滤
  if (options.startTime) {
    const start = new Date(options.startTime).getTime();
    result = result.filter(entry => new Date(entry.timestamp).getTime() >= start);
  }

  if (options.endTime) {
    const end = new Date(options.endTime).getTime();
    result = result.filter(entry => new Date(entry.timestamp).getTime() <= end);
  }

  // 按关键字过滤
  if (options.keyword) {
    const keyword = options.keyword.toLowerCase();
    result = result.filter(entry => 
      entry.message.toLowerCase().includes(keyword) ||
      entry.raw.toLowerCase().includes(keyword)
    );
  }

  // 按来源过滤
  if (options.source) {
    result = result.filter(entry => entry.source?.includes(options.source!));
  }

  // 限制数量
  if (options.limit && result.length > options.limit) {
    result = result.slice(0, options.limit);
  }

  return result;
}

/**
 * 搜索日志 (支持正则表达式)
 */
export function searchLogs(entries: LogEntry[], pattern: string | RegExp): LogEntry[] {
  const regex = typeof pattern === 'string' ? new RegExp(pattern, 'i') : pattern;
  return entries.filter(entry => regex.test(entry.raw));
}

// ==================== 3. 日志分析 ====================

/**
 * 统计日志
 */
export function analyzeStats(entries: LogEntry[]): LogStats {
  if (entries.length === 0) {
    return {
      total: 0,
      byLevel: { DEBUG: 0, INFO: 0, WARN: 0, ERROR: 0, FATAL: 0 },
      timeRange: { start: '', end: '', durationMs: 0 },
      errorRate: 0,
      avgMessagesPerMinute: 0,
    };
  }

  const byLevel: Record<LogLevel, number> = {
    DEBUG: 0,
    INFO: 0,
    WARN: 0,
    ERROR: 0,
    FATAL: 0,
  };

  entries.forEach(entry => {
    byLevel[entry.level] = (byLevel[entry.level] || 0) + 1;
  });

  const timestamps = entries.map(e => new Date(e.timestamp).getTime());
  const startTime = new Date(Math.min(...timestamps));
  const endTime = new Date(Math.max(...timestamps));
  const durationMs = endTime.getTime() - startTime.getTime();

  const errorCount = byLevel.ERROR + byLevel.FATAL;
  const errorRate = entries.length > 0 ? (errorCount / entries.length) * 100 : 0;

  const durationMinutes = durationMs / 1000 / 60;
  const avgMessagesPerMinute = durationMinutes > 0 ? entries.length / durationMinutes : entries.length;

  return {
    total: entries.length,
    byLevel,
    timeRange: {
      start: startTime.toISOString(),
      end: endTime.toISOString(),
      durationMs,
    },
    errorRate,
    avgMessagesPerMinute,
  };
}

/**
 * 识别日志模式
 */
export function identifyPatterns(entries: LogEntry[], topN: number = 10): LogPattern[] {
  const patternMap = new Map<string, { count: number; examples: string[] }>();

  entries.forEach(entry => {
    // 简化消息以识别模式 (移除数字、时间戳等变量部分)
    const normalized = entry.message
      .replace(/\b\d+\b/g, '<NUM>')
      .replace(/\b[0-9a-f]{8,}\b/gi, '<ID>')
      .replace(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, '<IP>')
      .replace(/\b\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}:\d{2}\b/g, '<TIME>')
      .trim();

    const existing = patternMap.get(normalized) || { count: 0, examples: [] };
    existing.count++;
    if (existing.examples.length < 3) {
      existing.examples.push(entry.message);
    }
    patternMap.set(normalized, existing);
  });

  const patterns: LogPattern[] = [];
  patternMap.forEach((value, pattern) => {
    patterns.push({
      pattern,
      count: value.count,
      percentage: (value.count / entries.length) * 100,
      examples: value.examples,
    });
  });

  patterns.sort((a, b) => b.count - a.count);
  return patterns.slice(0, topN);
}

/**
 * 检测日志异常
 */
export function detectLogAnomalies(entries: LogEntry[]): LogAnalysis['anomalies'] {
  const anomalies: LogAnalysis['anomalies'] = [];

  // 检测错误爆发 (1 分钟内超过 10 个错误)
  const errorEntries = entries.filter(e => e.level === 'ERROR' || e.level === 'FATAL');
  const errorWindows = new Map<string, number>();

  errorEntries.forEach(entry => {
    const windowKey = new Date(entry.timestamp).toISOString().slice(0, 16); // 精确到分钟
    errorWindows.set(windowKey, (errorWindows.get(windowKey) || 0) + 1);
  });

  errorWindows.forEach((count, window) => {
    if (count > 10) {
      anomalies.push({
        timestamp: window,
        level: 'ERROR',
        message: `错误爆发：${count} 个错误在 1 分钟内`,
        reason: 'ERROR_BURST',
      });
    }
  });

  // 检测 FATAL 日志
  entries.filter(e => e.level === 'FATAL').forEach(entry => {
    anomalies.push({
      timestamp: entry.timestamp,
      level: 'FATAL',
      message: entry.message,
      reason: 'FATAL_LOG',
    });
  });

  // 按时间排序
  anomalies.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  return anomalies;
}

/**
 * 生成建议
 */
function generateRecommendations(stats: LogStats, anomalies: LogAnalysis['anomalies']): string[] {
  const recommendations: string[] = [];

  if (stats.errorRate > 5) {
    recommendations.push(`⚠️ 错误率过高 (${stats.errorRate.toFixed(2)}%)，建议检查系统稳定性`);
  }

  if (stats.errorRate > 20) {
    recommendations.push(`🚨 严重错误率 (${stats.errorRate.toFixed(2)}%)，需要立即干预`);
  }

  const fatalCount = anomalies.filter(a => a.reason === 'FATAL_LOG').length;
  if (fatalCount > 0) {
    recommendations.push(`💀 发现 ${fatalCount} 条 FATAL 日志，需要紧急排查`);
  }

  const errorBursts = anomalies.filter(a => a.reason === 'ERROR_BURST').length;
  if (errorBursts > 0) {
    recommendations.push(`⚡ 检测到 ${errorBursts} 次错误爆发，建议检查系统负载`);
  }

  if (stats.avgMessagesPerMinute > 1000) {
    recommendations.push(`📊 日志量过大 (${stats.avgMessagesPerMinute.toFixed(0)} 条/分钟)，考虑降低日志级别`);
  }

  if (recommendations.length === 0) {
    recommendations.push('✅ 系统日志健康，无明显问题');
  }

  return recommendations;
}

/**
 * 完整日志分析
 */
export function analyzeLogs(entries: LogEntry[]): LogAnalysis {
  const stats = analyzeStats(entries);
  const patterns = identifyPatterns(entries);
  const anomalies = detectLogAnomalies(entries);
  const recommendations = generateRecommendations(stats, anomalies);

  return {
    stats,
    patterns,
    anomalies,
    recommendations,
  };
}

// ==================== 工具函数 ====================

/**
 * 格式化日志输出
 */
export function formatLogEntry(entry: LogEntry, colored = false): string {
  const levelColors: Record<LogLevel, string> = {
    DEBUG: '\x1b[36m',  // Cyan
    INFO: '\x1b[32m',   // Green
    WARN: '\x1b[33m',   // Yellow
    ERROR: '\x1b[31m',  // Red
    FATAL: '\x1b[35m',  // Magenta
  };

  const reset = '\x1b[0m';

  if (colored) {
    return `${levelColors[entry.level]}[${entry.level}]${reset} ${entry.timestamp} - ${entry.message}`;
  }

  return `[${entry.level}] ${entry.timestamp} - ${entry.message}`;
}

/**
 * 导出日志为 JSON
 */
export function exportToJSON(entries: LogEntry[], filePath: string): void {
  fs.writeFileSync(filePath, JSON.stringify(entries, null, 2), 'utf-8');
  console.log(`日志已导出到：${filePath}`);
}

/**
 * 导出日志为 CSV
 */
export function exportToCSV(entries: LogEntry[], filePath: string): void {
  const headers = ['timestamp', 'level', 'message', 'source'];
  const csvLines = [headers.join(',')];

  entries.forEach(entry => {
    const row = [
      entry.timestamp,
      entry.level,
      `"${entry.message.replace(/"/g, '""')}"`,
      entry.source || '',
    ];
    csvLines.push(row.join(','));
  });

  fs.writeFileSync(filePath, csvLines.join('\n'), 'utf-8');
  console.log(`日志已导出到：${filePath}`);
}

// ==================== 导出 ====================

export default {
  // 日志收集
  collectFromFile,
  collectFromDirectory,
  parseLogLine,
  
  // 日志查询
  queryLogs,
  searchLogs,
  
  // 日志分析
  analyzeStats,
  identifyPatterns,
  detectLogAnomalies,
  analyzeLogs,
  
  // 工具函数
  formatLogEntry,
  exportToJSON,
  exportToCSV,
};
