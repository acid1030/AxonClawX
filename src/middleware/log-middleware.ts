/**
 * HTTP 请求日志中间件 - Log Middleware
 * 
 * @author KAEL (AxonClaw Engineering)
 * @version 1.0.0
 * 
 * 功能:
 * 1. 请求/响应日志记录
 * 2. 性能统计 (响应时间、吞吐量)
 * 3. 日志分级 (debug/info/warn/error)
 * 4. 性能指标聚合
 */

import { Request, Response, NextFunction } from 'express';
import { Logger, getLogger, LogLevel } from '../logger/logger';

// ============ 类型定义 ============

/**
 * 请求日志数据结构
 */
export interface RequestLogData {
  /** 请求 ID */
  requestId: string;
  /** HTTP 方法 */
  method: string;
  /** 请求路径 */
  path: string;
  /** 完整 URL */
  url: string;
  /** 响应状态码 */
  statusCode: number;
  /** 响应时间 (ms) */
  responseTime: number;
  /** 客户端 IP */
  ip?: string;
  /** User-Agent */
  userAgent?: string;
  /** 请求体大小 (bytes) */
  requestSize?: number;
  /** 响应体大小 (bytes) */
  responseSize?: number;
  /** 时间戳 */
  timestamp: string;
}

/**
 * 性能统计数据
 */
export interface PerformanceStats {
  /** 总请求数 */
  totalRequests: number;
  /** 平均响应时间 (ms) */
  avgResponseTime: number;
  /** 最慢响应时间 (ms) */
  maxResponseTime: number;
  /** 最快响应时间 (ms) */
  minResponseTime: number;
  /** P95 响应时间 (ms) */
  p95ResponseTime: number;
  /** P99 响应时间 (ms) */
  p99ResponseTime: number;
  /** 每秒请求数 (RPS) */
  requestsPerSecond: number;
  /** 按状态码分类 */
  statusCodes: {
    '2xx': number;
    '3xx': number;
    '4xx': number;
    '5xx': number;
  };
  /** 统计时间窗口起始时间 */
  windowStart: number;
}

/**
 * 中间件配置选项
 */
export interface LogMiddlewareConfig {
  /** Logger 实例 */
  logger?: Logger;
  /** 日志级别 */
  level?: LogLevel;
  /** 跳过日志记录的路径 */
  skipPaths?: RegExp[];
  /** 是否记录客户端 IP */
  includeIp?: boolean;
  /** 是否记录 User-Agent */
  includeUserAgent?: boolean;
  /** 是否记录请求/响应大小 */
  includeSize?: boolean;
  /** 日志格式 */
  format?: 'json' | 'simple' | 'detailed' | 'colored';
  /** 是否启用性能统计 */
  enableStats?: boolean;
  /** 性能统计窗口大小 (ms) */
  statsWindowMs?: number;
  /** 是否自动记录慢请求 */
  logSlowRequests?: boolean;
  /** 慢请求阈值 (ms) */
  slowRequestThresholdMs?: number;
}

/**
 * 性能跟踪器 - 用于聚合性能指标
 */
class PerformanceTracker {
  private responseTimes: number[] = [];
  private requestCount: number = 0;
  private statusCodes = { '2xx': 0, '3xx': 0, '4xx': 0, '5xx': 0 };
  private windowStart: number = Date.now();
  private windowSizeMs: number;

  constructor(windowSizeMs: number = 60000) {
    this.windowSizeMs = windowSizeMs;
  }

  /**
   * 记录一次请求的性能数据
   */
  record(responseTime: number, statusCode: number): void {
    const now = Date.now();
    
    // 如果超出时间窗口，重置统计
    if (now - this.windowStart > this.windowSizeMs) {
      this.reset();
      this.windowStart = now;
    }

    this.responseTimes.push(responseTime);
    this.requestCount++;
    this.statusCodes[this.getStatusCodeCategory(statusCode)]++;
  }

  /**
   * 获取当前性能统计
   */
  getStats(): PerformanceStats {
    if (this.responseTimes.length === 0) {
      return this.getEmptyStats();
    }

    const sorted = [...this.responseTimes].sort((a, b) => a - b);
    const total = sorted.reduce((sum, t) => sum + t, 0);
    const avg = total / sorted.length;
    const now = Date.now();
    const durationSec = Math.max((now - this.windowStart) / 1000, 1);

    return {
      totalRequests: this.requestCount,
      avgResponseTime: Math.round(avg * 100) / 100,
      maxResponseTime: sorted[sorted.length - 1],
      minResponseTime: sorted[0],
      p95ResponseTime: this.getPercentile(sorted, 95),
      p99ResponseTime: this.getPercentile(sorted, 99),
      requestsPerSecond: Math.round((this.requestCount / durationSec) * 100) / 100,
      statusCodes: { ...this.statusCodes },
      windowStart: this.windowStart,
    };
  }

  /**
   * 重置统计数据
   */
  reset(): void {
    this.responseTimes = [];
    this.requestCount = 0;
    this.statusCodes = { '2xx': 0, '3xx': 0, '4xx': 0, '5xx': 0 };
  }

  private getStatusCodeCategory(statusCode: number): keyof PerformanceStats['statusCodes'] {
    if (statusCode >= 200 && statusCode < 300) return '2xx';
    if (statusCode >= 300 && statusCode < 400) return '3xx';
    if (statusCode >= 400 && statusCode < 500) return '4xx';
    return '5xx';
  }

  private getPercentile(sorted: number[], percentile: number): number {
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  private getEmptyStats(): PerformanceStats {
    return {
      totalRequests: 0,
      avgResponseTime: 0,
      maxResponseTime: 0,
      minResponseTime: 0,
      p95ResponseTime: 0,
      p99ResponseTime: 0,
      requestsPerSecond: 0,
      statusCodes: { '2xx': 0, '3xx': 0, '4xx': 0, '5xx': 0 },
      windowStart: this.windowStart,
    };
  }
}

// ============ 默认配置 ============

const DEFAULT_CONFIG: Required<LogMiddlewareConfig> = {
  logger: getLogger(),
  level: 'info',
  skipPaths: [],
  includeIp: true,
  includeUserAgent: false,
  includeSize: true,
  format: 'simple',
  enableStats: true,
  statsWindowMs: 60000, // 1 分钟
  logSlowRequests: true,
  slowRequestThresholdMs: 1000, // 1 秒
};

// ============ 全局性能跟踪器 ============

let globalPerformanceTracker: PerformanceTracker | null = null;

/**
 * 获取全局性能跟踪器
 */
function getPerformanceTracker(config: Required<LogMiddlewareConfig>): PerformanceTracker {
  if (!config.enableStats) {
    throw new Error('Performance stats is disabled');
  }

  if (!globalPerformanceTracker) {
    globalPerformanceTracker = new PerformanceTracker(config.statsWindowMs);
  }

  return globalPerformanceTracker;
}

/**
 * 获取当前性能统计
 */
export function getPerformanceStats(): PerformanceStats | null {
  if (!globalPerformanceTracker) {
    return null;
  }
  return globalPerformanceTracker.getStats();
}

/**
 * 重置性能统计
 */
export function resetPerformanceStats(): void {
  if (globalPerformanceTracker) {
    globalPerformanceTracker.reset();
  }
}

// ============ 中间件工厂 ============

/**
 * 创建 HTTP 请求日志中间件
 * 
 * @param config - 配置选项
 * @returns Express 中间件函数
 * 
 * @example
 * ```typescript
 * import { httpLogger } from './middleware/log-middleware';
 * 
 * // 基础用法
 * app.use(httpLogger());
 * 
 * // 自定义配置
 * app.use(httpLogger({
 *   level: 'debug',
 *   format: 'detailed',
 *   enableStats: true,
 *   logSlowRequests: true,
 *   slowRequestThresholdMs: 500
 * }));
 * ```
 */
export function httpLogger(config: LogMiddlewareConfig = {}) {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const tracker = cfg.enableStats ? getPerformanceTracker(cfg) : null;

  return function loggerMiddleware(req: Request, res: Response, next: NextFunction) {
    const startTime = Date.now();
    const startHrTime = process.hrtime.bigint();
    
    // 生成请求 ID
    const requestId = generateRequestId(req);
    (req as any).requestId = requestId;

    // 监听响应完成事件
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      const durationHr = Number(process.hrtime.bigint() - startHrTime) / 1e6;
      const responseTime = Math.round(durationHr * 100) / 100;

      // 检查是否跳过日志
      if (shouldSkip(req.path, cfg.skipPaths)) {
        return;
      }

      // 构建日志数据
      const logData: RequestLogData = {
        requestId,
        method: req.method,
        path: req.originalUrl || req.url,
        url: `${req.protocol}://${req.get('host')}${req.originalUrl}`,
        statusCode: res.statusCode,
        responseTime,
        timestamp: new Date().toISOString(),
      };

      // 可选字段
      if (cfg.includeIp) {
        logData.ip = req.ip || req.socket.remoteAddress || 'unknown';
      }
      if (cfg.includeUserAgent) {
        logData.userAgent = req.get('user-agent');
      }
      if (cfg.includeSize) {
        const contentLength = req.get('content-length');
        if (contentLength) {
          logData.requestSize = parseInt(contentLength, 10);
        }
        const responseLength = res.get('content-length');
        if (responseLength) {
          logData.responseSize = parseInt(responseLength, 10);
        }
      }

      // 根据状态码选择日志级别
      const level = getLogLevelByStatus(res.statusCode, cfg.level);

      // 记录日志
      logRequest(cfg.logger, level, logData, cfg.format);

      // 记录慢请求
      if (cfg.logSlowRequests && responseTime > cfg.slowRequestThresholdMs) {
        cfg.logger.warn(
          'HTTP',
          `Slow request detected: ${logData.method} ${logData.path} took ${responseTime}ms`,
          { ...logData, threshold: cfg.slowRequestThresholdMs }
        );
      }

      // 更新性能统计
      if (tracker) {
        tracker.record(responseTime, res.statusCode);
      }
    });

    next();
  };
}

// ============ 辅助函数 ============

/**
 * 生成请求 ID
 */
function generateRequestId(req: Request): string {
  const existing = req.headers['x-request-id'] as string;
  if (existing) {
    return existing;
  }
  
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `${timestamp}-${random}`;
}

/**
 * 检查是否应该跳过日志记录
 */
function shouldSkip(path: string, skipPaths: RegExp[]): boolean {
  return skipPaths.some(pattern => pattern.test(path));
}

/**
 * 根据状态码确定日志级别
 */
function getLogLevelByStatus(statusCode: number, baseLevel: LogLevel): LogLevel {
  // 5xx 错误使用 error 级别
  if (statusCode >= 500) {
    return 'error';
  }
  
  // 4xx 错误使用 warn 级别
  if (statusCode >= 400) {
    return 'warn';
  }

  // 其他使用配置的级别
  return baseLevel;
}

/**
 * 格式化并记录日志
 */
function logRequest(
  logger: Logger,
  level: LogLevel,
  data: RequestLogData,
  format: 'json' | 'simple' | 'detailed' | 'colored'
): void {
  const message = formatMessage(data, format);
  
  switch (level) {
    case 'debug':
      logger.debug('HTTP', message, data);
      break;
    case 'info':
      logger.info('HTTP', message, data);
      break;
    case 'warn':
      logger.warn('HTTP', message, data);
      break;
    case 'error':
      logger.error('HTTP', message, data);
      break;
  }
}

/**
 * 格式化日志消息
 */
function formatMessage(
  data: RequestLogData,
  format: 'json' | 'simple' | 'detailed' | 'colored'
): string {
  const statusColor = getStatusColor(data.statusCode);
  
  switch (format) {
    case 'simple':
      return `${data.method} ${data.path} ${data.statusCode} ${data.responseTime}ms`;

    case 'detailed':
      const parts = [
        `[${data.requestId}]`,
        `${data.method} ${data.path}`,
        `${statusColor}${data.statusCode}\x1b[0m`,
        `${data.responseTime}ms`,
      ];
      
      if (data.ip) parts.push(`IP: ${data.ip}`);
      if (data.requestSize) parts.push(`Req: ${formatBytes(data.requestSize)}`);
      if (data.responseSize) parts.push(`Res: ${formatBytes(data.responseSize)}`);
      if (data.userAgent) parts.push(`UA: ${truncate(data.userAgent, 50)}`);
      
      return parts.join(' | ');

    case 'colored':
      const methodColor = getMethodColor(data.method);
      return `${methodColor}${data.method}\x1b[0m ${data.path} ${statusColor}${data.statusCode}\x1b[0m ${colorizeTime(data.responseTime)}`;

    case 'json':
    default:
      return JSON.stringify(data);
  }
}

/**
 * 获取状态码颜色
 */
function getStatusColor(statusCode: number): string {
  if (statusCode >= 500) return '\x1b[31m'; // Red
  if (statusCode >= 400) return '\x1b[33m'; // Yellow
  if (statusCode >= 300) return '\x1b[36m'; // Cyan
  return '\x1b[32m'; // Green
}

/**
 * 获取请求方法颜色
 */
function getMethodColor(method: string): string {
  switch (method) {
    case 'GET': return '\x1b[34m'; // Blue
    case 'POST': return '\x1b[32m'; // Green
    case 'PUT': return '\x1b[33m'; // Yellow
    case 'DELETE': return '\x1b[31m'; // Red
    default: return '\x1b[37m'; // White
  }
}

/**
 * 根据响应时间着色
 */
function colorizeTime(ms: number): string {
  if (ms > 1000) return `\x1b[31m${ms}ms\x1b[0m`;
  if (ms > 500) return `\x1b[33m${ms}ms\x1b[0m`;
  return `\x1b[32m${ms}ms\x1b[0m`;
}

/**
 * 格式化字节数
 */
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

/**
 * 截断字符串
 */
function truncate(str: string | undefined, maxLen: number): string {
  if (!str) return '';
  if (str.length <= maxLen) return str;
  return str.substring(0, maxLen - 3) + '...';
}

// ============ 便捷预设 ============

/**
 * 预设配置
 */
export const loggerPresets = {
  /**
   * 生产环境配置 (简洁格式，只记录 info 及以上)
   */
  production: () => httpLogger({
    level: 'info',
    format: 'simple',
    includeIp: true,
    includeUserAgent: false,
    enableStats: true,
    logSlowRequests: true,
    slowRequestThresholdMs: 1000,
  }),

  /**
   * 开发环境配置 (详细格式，记录 debug 级别)
   */
  development: () => httpLogger({
    level: 'debug',
    format: 'colored',
    includeIp: true,
    includeUserAgent: true,
    includeSize: true,
    enableStats: true,
    logSlowRequests: true,
    slowRequestThresholdMs: 500,
  }),

  /**
   * JSON 格式 (适合日志收集系统如 ELK/Splunk)
   */
  json: () => httpLogger({
    level: 'info',
    format: 'json',
    includeIp: true,
    includeUserAgent: true,
    includeSize: true,
    enableStats: true,
  }),

  /**
   * 静默模式 (只记录错误)
   */
  silent: () => httpLogger({
    level: 'error',
    format: 'simple',
    enableStats: false,
    logSlowRequests: false,
  }),

  /**
   * 详细调试模式 (包含所有信息)
   */
  verbose: () => httpLogger({
    level: 'debug',
    format: 'detailed',
    includeIp: true,
    includeUserAgent: true,
    includeSize: true,
    enableStats: true,
    logSlowRequests: true,
    slowRequestThresholdMs: 100,
  }),
};

// ============ 性能统计 API ============

/**
 * 获取格式化的性能统计报告
 */
export function getPerformanceReport(): string {
  const stats = getPerformanceStats();
  
  if (!stats) {
    return 'Performance stats not available';
  }

  const lines = [
    '╔══════════════════════════════════════════════════════════╗',
    '║           HTTP Performance Statistics                    ║',
    '╠══════════════════════════════════════════════════════════╣',
    `║  Total Requests:     ${String(stats.totalRequests).padEnd(36)} ║`,
    `║  Avg Response Time:  ${String(stats.avgResponseTime).padEnd(35)}ms ║`,
    `║  Min Response Time:  ${String(stats.minResponseTime).padEnd(35)}ms ║`,
    `║  Max Response Time:  ${String(stats.maxResponseTime).padEnd(35)}ms ║`,
    `║  P95 Response Time:  ${String(stats.p95ResponseTime).padEnd(35)}ms ║`,
    `║  P99 Response Time:  ${String(stats.p99ResponseTime).padEnd(35)}ms ║`,
    `║  Requests/Second:    ${String(stats.requestsPerSecond).padEnd(36)} ║`,
    '╠══════════════════════════════════════════════════════════╣',
    `║  Status Codes:                                            ║`,
    `║    2xx: ${String(stats.statusCodes['2xx']).padEnd(49)} ║`,
    `║    3xx: ${String(stats.statusCodes['3xx']).padEnd(49)} ║`,
    `║    4xx: ${String(stats.statusCodes['4xx']).padEnd(49)} ║`,
    `║    5xx: ${String(stats.statusCodes['5xx']).padEnd(49)} ║`,
    '╚══════════════════════════════════════════════════════════╝',
  ];

  return lines.join('\n');
}

// ============ 导出 ============

export default httpLogger;

/*
 * ============================================
 * 使用示例 / Usage Examples
 * ============================================
 * 
 * // 1. 基础用法
 * import express from 'express';
 * import { httpLogger } from './middleware/log-middleware';
 * 
 * const app = express();
 * app.use(httpLogger());
 * 
 * 
 * // 2. 使用预设配置
 * import { loggerPresets } from './middleware/log-middleware';
 * 
 * if (process.env.NODE_ENV === 'production') {
 *   app.use(loggerPresets.production());
 * } else {
 *   app.use(loggerPresets.development());
 * }
 * 
 * 
 * // 3. 自定义配置
 * app.use(httpLogger({
 *   level: 'debug',
 *   format: 'detailed',
 *   skipPaths: [/^\/health/, /^\/metrics/, /^\/favicon.ico/],
 *   includeIp: true,
 *   includeUserAgent: true,
 *   enableStats: true,
 *   statsWindowMs: 60000,
 *   logSlowRequests: true,
 *   slowRequestThresholdMs: 500,
 * }));
 * 
 * 
 * // 4. JSON 格式输出 (适合 ELK/Splunk)
 * app.use(loggerPresets.json());
 * 
 * 
 * // 5. 获取性能统计
 * import { getPerformanceStats, getPerformanceReport, resetPerformanceStats } from './middleware/log-middleware';
 * 
 * // 在管理路由中暴露性能数据
 * app.get('/admin/performance', (req, res) => {
 *   res.json(getPerformanceStats());
 * });
 * 
 * // 或者获取格式化报告
 * app.get('/admin/performance/report', (req, res) => {
 *   res.type('text');
 *   res.send(getPerformanceReport());
 * });
 * 
 * // 重置统计
 * app.post('/admin/performance/reset', (req, res) => {
 *   resetPerformanceStats();
 *   res.json({ success: true });
 * });
 * 
 * 
 * // 6. 完整示例
 * import express from 'express';
 * import { httpLogger, loggerPresets, getPerformanceStats } from './middleware/log-middleware';
 * 
 * const app = express();
 * 
 * // 使用开发环境配置
 * app.use(loggerPresets.development());
 * 
 * // 健康检查端点 (跳过日志)
 * app.get('/health', (req, res) => {
 *   res.json({ status: 'ok' });
 * });
 * 
 * // API 路由
 * app.get('/api/users', async (req, res) => {
 *   // 模拟数据库查询
 *   await new Promise(resolve => setTimeout(resolve, 50));
 *   res.json({ users: [] });
 * });
 * 
 * // 性能监控端点
 * app.get('/metrics', (req, res) => {
 *   res.json(getPerformanceStats());
 * });
 * 
 * app.listen(3000, () => {
 *   console.log('Server running on port 3000');
 * });
 * 
 * 
 * ============================================
 * 输出示例
 * ============================================
 * 
 * 开发模式 (colored format):
 * GET /api/users 200 12.45ms
 * POST /api/login 401 5.23ms
 * GET /api/error 500 102.34ms
 * 
 * 详细模式 (detailed format):
 * [req123-abc] GET /api/users | 200 | 12.45ms | IP: 127.0.0.1 | Req: 256B | Res: 1.2KB
 * 
 * 生产模式 (simple format):
 * GET /api/users 200 12.45ms
 * 
 * JSON 格式:
 * {"requestId":"req123-abc","method":"GET","path":"/api/users","statusCode":200,"responseTime":12.45,"ip":"127.0.0.1"}
 * 
 * 
 * ============================================
 * 配置选项说明
 * ============================================
 * 
 * interface LogMiddlewareConfig {
 *   logger?: Logger;              // 自定义 Logger 实例
 *   level?: LogLevel;             // 日志级别：debug | info | warn | error
 *   skipPaths?: RegExp[];         // 跳过日志的路径正则
 *   includeIp?: boolean;          // 是否包含 IP
 *   includeUserAgent?: boolean;   // 是否包含 User-Agent
 *   includeSize?: boolean;        // 是否包含请求/响应大小
 *   format?: 'json' | 'simple' | 'detailed' | 'colored'; // 日志格式
 *   enableStats?: boolean;        // 是否启用性能统计
 *   statsWindowMs?: number;       // 统计窗口大小 (ms)
 *   logSlowRequests?: boolean;    // 是否记录慢请求
 *   slowRequestThresholdMs?: number; // 慢请求阈值 (ms)
 * }
 * 
 * 
 * ============================================
 * 性能统计接口
 * ============================================
 * 
 * - getPerformanceStats(): 获取当前性能统计对象
 * - getPerformanceReport(): 获取格式化的性能报告 (ASCII 表格)
 * - resetPerformanceStats(): 重置性能统计
 * 
 * 
 * ============================================
 * 日志级别自动选择
 * ============================================
 * 
 * - 5xx 错误 → error 级别 (红色)
 * - 4xx 错误 → warn 级别 (黄色)
 * - 3xx 重定向 → info 级别 (青色)
 * - 2xx 成功 → info 级别 (绿色)
 * 
 * 慢请求会额外记录一条 warn 级别日志。
 */
