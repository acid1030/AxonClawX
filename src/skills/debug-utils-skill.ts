/**
 * ACE 调试工具集
 * 
 * 功能:
 * 1. 性能分析 (执行时间、函数性能剖析)
 * 2. 内存监控 (堆内存、对象大小、内存泄漏检测)
 * 3. 调试日志 (分级日志、上下文追踪、日志聚合)
 * 
 * @author ACE
 * @version 1.0.0
 */

// ==================== 类型定义 ====================

export interface PerformanceMetrics {
  functionName: string;
  executionTime: number;
  startTime: number;
  endTime: number;
  memoryBefore: number;
  memoryAfter: number;
  memoryDelta: number;
  callCount: number;
  avgTime: number;
  minTime: number;
  maxTime: number;
}

export interface MemorySnapshot {
  timestamp: number;
  heapUsed: number;
  heapTotal: number;
  external: number;
  arrayBuffers: number;
  rss: number;
  heapUsedPercent: number;
}

export interface MemoryLeakWarning {
  detected: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  growthRate: number;
  snapshots: MemorySnapshot[];
  recommendation: string;
}

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'trace';

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: number;
  context?: Record<string, any>;
  stack?: string;
  duration?: number;
}

export interface DebugSession {
  id: string;
  startTime: number;
  logs: LogEntry[];
  performanceMetrics: Map<string, PerformanceMetrics>;
  memorySnapshots: MemorySnapshot[];
}

// ==================== 全局状态 ====================

const debugSessions: Map<string, DebugSession> = new Map();
const performanceRegistry: Map<string, PerformanceMetrics[]> = new Map();
const logHistory: LogEntry[] = [];
const MAX_LOG_HISTORY = 1000;
const MEMORY_SNAPSHOT_INTERVAL = 5000; // 5 秒

let currentSessionId: string | null = null;
let memoryMonitoring = false;
let memoryInterval: NodeJS.Timeout | null = null;

// ==================== 工具函数 ====================

/**
 * 生成唯一会话 ID
 */
function generateSessionId(): string {
  return `debug_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 获取当前内存使用情况
 */
function getMemoryUsage(): MemorySnapshot {
  const mem = process.memoryUsage();
  return {
    timestamp: Date.now(),
    heapUsed: mem.heapUsed,
    heapTotal: mem.heapTotal,
    external: mem.external || 0,
    arrayBuffers: mem.arrayBuffers || 0,
    rss: mem.rss,
    heapUsedPercent: (mem.heapUsed / mem.heapTotal) * 100,
  };
}

/**
 * 格式化字节数
 */
function formatBytes(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  let unitIndex = 0;
  let size = bytes;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(2)} ${units[unitIndex]}`;
}

/**
 * 获取调用栈
 */
function getStackTrace(): string {
  const obj: any = {};
  Error.captureStackTrace(obj, getStackTrace);
  return obj.stack || '';
}

// ==================== 1. 性能分析 ====================

/**
 * 性能分析装饰器 - 测量函数执行时间
 * 
 * @param functionName 函数名称
 * @param fn 要分析的函数
 * @returns 包装后的函数
 */
export function profile<T extends (...args: any[]) => any>(
  functionName: string,
  fn: T
): T {
  return ((...args: any[]) => {
    const session = getCurrentSession();
    const memoryBefore = process.memoryUsage().heapUsed;
    const startTime = performance.now();
    
    try {
      const result = fn(...args);
      
      // 如果是 Promise，需要特殊处理
      if (result instanceof Promise) {
        return result.then(resolvedResult => {
          const endTime = performance.now();
          const memoryAfter = process.memoryUsage().heapUsed;
          const duration = endTime - startTime;
          
          recordPerformance(functionName, duration, memoryBefore, memoryAfter);
          
          if (session) {
            session.logs.push({
              level: 'debug',
              message: `[PERF] ${functionName} completed in ${duration.toFixed(2)}ms`,
              timestamp: Date.now(),
              duration,
            });
          }
          
          logPerformance(functionName, duration, memoryAfter - memoryBefore);
          
          return resolvedResult;
        });
      }
      
      const endTime = performance.now();
      const memoryAfter = process.memoryUsage().heapUsed;
      const duration = endTime - startTime;
      
      recordPerformance(functionName, duration, memoryBefore, memoryAfter);
      
      if (session) {
        session.logs.push({
          level: 'debug',
          message: `[PERF] ${functionName} completed in ${duration.toFixed(2)}ms`,
          timestamp: Date.now(),
          duration,
        });
      }
      
      logPerformance(functionName, duration, memoryAfter - memoryBefore);
      
      return result;
    } catch (error) {
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      if (session) {
        session.logs.push({
          level: 'error',
          message: `[PERF] ${functionName} failed after ${duration.toFixed(2)}ms`,
          timestamp: Date.now(),
          context: { error: error instanceof Error ? error.message : String(error) },
          duration,
        });
      }
      
      throw error;
    }
  }) as T;
}

/**
 * 记录性能指标
 */
function recordPerformance(
  functionName: string,
  duration: number,
  memoryBefore: number,
  memoryAfter: number
): void {
  const metrics: PerformanceMetrics = {
    functionName,
    executionTime: duration,
    startTime: Date.now(),
    endTime: Date.now(),
    memoryBefore,
    memoryAfter,
    memoryDelta: memoryAfter - memoryBefore,
    callCount: 1,
    avgTime: duration,
    minTime: duration,
    maxTime: duration,
  };
  
  const existingMetrics = performanceRegistry.get(functionName);
  
  if (existingMetrics) {
    existingMetrics.push(metrics);
    
    // 更新统计数据
    const totalCalls = existingMetrics.length;
    const totalTime = existingMetrics.reduce((sum, m) => sum + m.executionTime, 0);
    
    metrics.callCount = totalCalls;
    metrics.avgTime = totalTime / totalCalls;
    metrics.minTime = Math.min(...existingMetrics.map(m => m.executionTime));
    metrics.maxTime = Math.max(...existingMetrics.map(m => m.executionTime));
  } else {
    performanceRegistry.set(functionName, [metrics]);
  }
}

/**
 * 获取性能报告
 */
export function getPerformanceReport(functionName?: string): any {
  if (functionName) {
    const metrics = performanceRegistry.get(functionName);
    if (!metrics || metrics.length === 0) {
      return null;
    }
    
    const latest = metrics[metrics.length - 1];
    return {
      functionName,
      totalCalls: latest.callCount,
      avgTime: latest.avgTime,
      minTime: latest.minTime,
      maxTime: latest.maxTime,
      lastExecutionTime: latest.executionTime,
      avgMemoryDelta: metrics.reduce((sum, m) => sum + m.memoryDelta, 0) / metrics.length,
    };
  }
  
  // 返回所有函数的报告
  const report: Record<string, any> = {};
  performanceRegistry.forEach((metrics, name) => {
    const latest = metrics[metrics.length - 1];
    report[name] = {
      totalCalls: latest.callCount,
      avgTime: latest.avgTime,
      minTime: latest.minTime,
      maxTime: latest.maxTime,
    };
  });
  
  return report;
}

/**
 * 打印性能日志
 */
function logPerformance(functionName: string, duration: number, memoryDelta: number): void {
  const memorySign = memoryDelta > 0 ? '+' : '';
  console.log(
    `⚡ [PERF] ${functionName.padEnd(30)} | ${duration.toFixed(2)}ms | Mem: ${memorySign}${formatBytes(memoryDelta)}`
  );
}

// ==================== 2. 内存监控 ====================

/**
 * 开始内存监控
 * 
 * @param intervalMs 快照间隔 (毫秒)
 */
export function startMemoryMonitoring(intervalMs: number = MEMORY_SNAPSHOT_INTERVAL): void {
  if (memoryMonitoring) {
    console.warn('⚠️  内存监控已在运行');
    return;
  }
  
  memoryMonitoring = true;
  const session = getCurrentSession();
  
  memoryInterval = setInterval(() => {
    const snapshot = getMemoryUsage();
    
    if (session) {
      session.memorySnapshots.push(snapshot);
    }
    
    // 检测内存泄漏
    const leakWarning = detectMemoryLeak();
    if (leakWarning.detected && leakWarning.severity !== 'low') {
      console.warn(`🚨 [MEMORY] 内存泄漏警告: ${leakWarning.recommendation}`);
      
      if (session) {
        session.logs.push({
          level: 'warn',
          message: `[MEMORY] 内存泄漏警告: ${leakWarning.recommendation}`,
          timestamp: Date.now(),
          context: { severity: leakWarning.severity, growthRate: leakWarning.growthRate },
        });
      }
    }
  }, intervalMs);
  
  console.log(`📊 [MEMORY] 开始内存监控 (间隔：${intervalMs}ms)`);
}

/**
 * 停止内存监控
 */
export function stopMemoryMonitoring(): void {
  if (memoryInterval) {
    clearInterval(memoryInterval);
    memoryInterval = null;
  }
  memoryMonitoring = false;
  console.log(`📊 [MEMORY] 停止内存监控`);
}

/**
 * 获取内存快照
 */
export function getMemorySnapshot(): MemorySnapshot {
  const snapshot = getMemoryUsage();
  const session = getCurrentSession();
  
  if (session) {
    session.memorySnapshots.push(snapshot);
  }
  
  return snapshot;
}

/**
 * 检测内存泄漏
 */
function detectMemoryLeak(): MemoryLeakWarning {
  const session = getCurrentSession();
  if (!session || session.memorySnapshots.length < 5) {
    return {
      detected: false,
      severity: 'low',
      growthRate: 0,
      snapshots: [],
      recommendation: '数据不足，无法检测',
    };
  }
  
  const snapshots = session.memorySnapshots.slice(-10);
  const heapValues = snapshots.map(s => s.heapUsed);
  
  // 计算增长趋势
  let growthCount = 0;
  for (let i = 1; i < heapValues.length; i++) {
    if (heapValues[i] > heapValues[i - 1]) {
      growthCount++;
    }
  }
  
  const growthRate = growthCount / (heapValues.length - 1);
  
  // 计算平均增长率
  const totalGrowth = heapValues[heapValues.length - 1] - heapValues[0];
  const avgGrowthPerSnapshot = totalGrowth / (heapValues.length - 1);
  
  // 判断严重程度
  let severity: MemoryLeakWarning['severity'] = 'low';
  let recommendation = '内存使用正常';
  
  if (growthRate > 0.8 && avgGrowthPerSnapshot > 1024 * 1024) { // 持续 80% 增长且每次 > 1MB
    severity = 'critical';
    recommendation = '检测到严重内存泄漏！立即检查对象引用和事件监听器';
  } else if (growthRate > 0.6 && avgGrowthPerSnapshot > 512 * 1024) {
    severity = 'high';
    recommendation = '检测到高度内存泄漏风险，建议检查大型对象和缓存';
  } else if (growthRate > 0.4 && avgGrowthPerSnapshot > 256 * 1024) {
    severity = 'medium';
    recommendation = '检测到中度内存增长，建议监控内存使用趋势';
  }
  
  return {
    detected: severity !== 'low',
    severity,
    growthRate,
    snapshots,
    recommendation,
  };
}

/**
 * 获取内存报告
 */
export function getMemoryReport(): {
  current: MemorySnapshot;
  trend: MemoryLeakWarning;
  history: MemorySnapshot[];
} {
  const current = getMemoryUsage();
  const trend = detectMemoryLeak();
  const session = getCurrentSession();
  
  return {
    current,
    trend,
    history: session?.memorySnapshots || [],
  };
}

/**
 * 打印内存状态
 */
export function printMemoryStatus(): void {
  const snapshot = getMemorySnapshot();
  console.log(`
📊 [MEMORY] 当前内存状态
━━━━━━━━━━━━━━━━━━━━━━
  Heap Used:    ${formatBytes(snapshot.heapUsed)}
  Heap Total:   ${formatBytes(snapshot.heapTotal)}
  External:     ${formatBytes(snapshot.external)}
  RSS:          ${formatBytes(snapshot.rss)}
  Usage:        ${snapshot.heapUsedPercent.toFixed(2)}%
━━━━━━━━━━━━━━━━━━━━━━
  `);
}

// ==================== 3. 调试日志 ====================

/**
 * 创建调试会话
 */
export function createDebugSession(id?: string): DebugSession {
  const sessionId = id || generateSessionId();
  const session: DebugSession = {
    id: sessionId,
    startTime: Date.now(),
    logs: [],
    performanceMetrics: new Map(),
    memorySnapshots: [],
  };
  
  debugSessions.set(sessionId, session);
  currentSessionId = sessionId;
  
  console.log(`🔍 [DEBUG] 创建会话：${sessionId}`);
  return session;
}

/**
 * 获取当前会话
 */
function getCurrentSession(): DebugSession | null {
  if (!currentSessionId) {
    return null;
  }
  return debugSessions.get(currentSessionId) || null;
}

/**
 * 设置当前会话
 */
export function setCurrentSession(sessionId: string): void {
  if (!debugSessions.has(sessionId)) {
    throw new Error(`会话不存在：${sessionId}`);
  }
  currentSessionId = sessionId;
}

/**
 * 记录日志
 */
export function log(
  level: LogLevel,
  message: string,
  context?: Record<string, any>
): void {
  const entry: LogEntry = {
    level,
    message,
    timestamp: Date.now(),
    context,
  };
  
  // 添加堆栈跟踪 (error 和 warn 级别)
  if (level === 'error' || level === 'warn') {
    entry.stack = getStackTrace();
  }
  
  // 添加到历史
  logHistory.push(entry);
  if (logHistory.length > MAX_LOG_HISTORY) {
    logHistory.shift();
  }
  
  // 添加到当前会话
  const session = getCurrentSession();
  if (session) {
    session.logs.push(entry);
  }
  
  // 控制台输出
  const emoji = {
    trace: '🔹',
    debug: '🔷',
    info: 'ℹ️',
    warn: '⚠️',
    error: '❌',
  }[level];
  
  const prefix = `[${level.toUpperCase()}]`;
  console.log(`${emoji} ${prefix} ${message}`);
  
  if (context) {
    console.log('  Context:', JSON.stringify(context, null, 2));
  }
}

/**
 * 快捷日志方法
 */
export const debug = (msg: string, ctx?: any) => log('debug', msg, ctx);
export const info = (msg: string, ctx?: any) => log('info', msg, ctx);
export const warn = (msg: string, ctx?: any) => log('warn', msg, ctx);
export const error = (msg: string, ctx?: any) => log('error', msg, ctx);
export const trace = (msg: string, ctx?: any) => log('trace', msg, ctx);

/**
 * 计时器 - 测量代码块执行时间
 */
export function timer(label: string): {
  end: () => number;
} {
  const start = performance.now();
  const session = getCurrentSession();
  
  return {
    end: () => {
      const duration = performance.now() - start;
      
      if (session) {
        session.logs.push({
          level: 'debug',
          message: `[TIMER] ${label}`,
          timestamp: Date.now(),
          duration,
        });
      }
      
      console.log(`⏱️  [TIMER] ${label.padEnd(30)} | ${duration.toFixed(2)}ms`);
      return duration;
    },
  };
}

/**
 * 获取日志历史
 */
export function getLogHistory(options?: {
  level?: LogLevel;
  limit?: number;
  since?: number;
}): LogEntry[] {
  let filtered = [...logHistory];
  
  if (options?.level) {
    filtered = filtered.filter(log => log.level === options.level);
  }
  
  if (options?.since) {
    filtered = filtered.filter(log => log.timestamp >= options.since!);
  }
  
  if (options?.limit) {
    filtered = filtered.slice(-options.limit);
  }
  
  return filtered;
}

/**
 * 导出会话报告
 */
export function exportSessionReport(sessionId?: string): {
  sessionId: string;
  duration: number;
  logCount: number;
  performanceMetrics: any;
  memoryUsage: {
    start: MemorySnapshot | null;
    end: MemorySnapshot | null;
    peak: MemorySnapshot | null;
  };
  logs: LogEntry[];
} {
  const session = debugSessions.get(sessionId || currentSessionId!);
  
  if (!session) {
    throw new Error('会话不存在');
  }
  
  const duration = Date.now() - session.startTime;
  const memorySnapshots = session.memorySnapshots;
  
  let peakMemory: MemorySnapshot | null = null;
  if (memorySnapshots.length > 0) {
    peakMemory = memorySnapshots.reduce((max, current) => 
      current.heapUsed > max.heapUsed ? current : max
    );
  }
  
  return {
    sessionId: session.id,
    duration,
    logCount: session.logs.length,
    performanceMetrics: getPerformanceReport(),
    memoryUsage: {
      start: memorySnapshots[0] || null,
      end: memorySnapshots[memorySnapshots.length - 1] || null,
      peak: peakMemory,
    },
    logs: session.logs,
  };
}

/**
 * 清理会话
 */
export function clearSession(sessionId?: string): void {
  const targetId = sessionId || currentSessionId;
  if (targetId && debugSessions.has(targetId)) {
    debugSessions.delete(targetId);
    console.log(`🗑️  [DEBUG] 清理会话：${targetId}`);
  }
}

// ==================== 综合调试工具 ====================

/**
 * 开始综合调试会话
 * 
 * @param options 配置选项
 */
export function startDebugSession(options?: {
  id?: string;
  enableMemoryMonitoring?: boolean;
  memoryInterval?: number;
  logLevel?: LogLevel;
}): DebugSession {
  const {
    id,
    enableMemoryMonitoring = true,
    memoryInterval = MEMORY_SNAPSHOT_INTERVAL,
  } = options || {};
  
  const session = createDebugSession(id);
  
  if (enableMemoryMonitoring) {
    startMemoryMonitoring(memoryInterval);
  }
  
  info('调试会话已启动', {
    sessionId: session.id,
    memoryMonitoring: enableMemoryMonitoring,
  });
  
  return session;
}

/**
 * 结束调试会话并生成报告
 */
export function endDebugSession(sessionId?: string): {
  report: any;
  summary: string;
} {
  const targetId = sessionId || currentSessionId;
  
  if (!targetId) {
    throw new Error('没有活动的调试会话');
  }
  
  const report = exportSessionReport(targetId);
  stopMemoryMonitoring();
  
  // 生成摘要
  const summary = generateDebugSummary(report);
  console.log(summary);
  
  clearSession(targetId);
  
  return { report, summary };
}

/**
 * 生成调试摘要
 */
function generateDebugSummary(report: any): string {
  const lines: string[] = [];
  
  lines.push(`📊 调试会话报告`);
  lines.push(`━━━━━━━━━━━━━━━━━━━━━━━━`);
  lines.push(`会话 ID: ${report.sessionId}`);
  lines.push(`持续时间：${(report.duration / 1000).toFixed(2)}s`);
  lines.push(`日志数量：${report.logCount}`);
  lines.push(``);
  lines.push(`【内存使用】`);
  if (report.memoryUsage.start && report.memoryUsage.end) {
    lines.push(`  开始：${formatBytes(report.memoryUsage.start.heapUsed)}`);
    lines.push(`  结束：${formatBytes(report.memoryUsage.end.heapUsed)}`);
    const delta = report.memoryUsage.end.heapUsed - report.memoryUsage.start.heapUsed;
    const sign = delta > 0 ? '+' : '';
    lines.push(`  变化：${sign}${formatBytes(delta)}`);
  }
  if (report.memoryUsage.peak) {
    lines.push(`  峰值：${formatBytes(report.memoryUsage.peak.heapUsed)}`);
  }
  lines.push(``);
  lines.push(`【性能热点】`);
  if (report.performanceMetrics) {
    const metrics = Object.entries(report.performanceMetrics)
      .sort((entryA: any, entryB: any) => entryB[1].avgTime - entryA[1].avgTime)
      .slice(0, 5);
    
    metrics.forEach((entry: [string, any]) => {
      const name = entry[0];
      const data = entry[1];
      lines.push(`  ${name.padEnd(30)} | 调用：${data.totalCalls} | 平均：${data.avgTime.toFixed(2)}ms`);
    });
  }
  lines.push(`━━━━━━━━━━━━━━━━━━━━━━━━`);
  
  return lines.join('\n');
}

// ==================== 导出 ====================

export default {
  // 性能分析
  profile,
  getPerformanceReport,
  timer,
  
  // 内存监控
  startMemoryMonitoring,
  stopMemoryMonitoring,
  getMemorySnapshot,
  getMemoryReport,
  printMemoryStatus,
  
  // 调试日志
  createDebugSession,
  setCurrentSession,
  log,
  debug,
  info,
  warn,
  error,
  trace,
  getLogHistory,
  
  // 会话管理
  startDebugSession,
  endDebugSession,
  exportSessionReport,
  clearSession,
};
