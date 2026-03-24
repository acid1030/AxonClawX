/**
 * Audit Utils Skill - 审计日志追踪工具
 * 
 * 功能:
 * 1. 审计日志记录 - 记录用户操作、系统事件、安全事件
 * 2. 日志查询 - 支持多维度筛选、分页、排序
 * 3. 审计报告 - 生成审计报告 (JSON/Markdown)
 * 
 * @author Axon (KAEL Engineering)
 * @version 1.0.0
 * @dependencies 无 (纯 Node.js 原生模块)
 */

import * as fs from 'fs';
import * as path from 'path';

// ============== 类型定义 ==============

/** 审计事件类型 */
export type AuditEventType = 
  | 'USER_LOGIN'
  | 'USER_LOGOUT'
  | 'USER_CREATE'
  | 'USER_UPDATE'
  | 'USER_DELETE'
  | 'DATA_ACCESS'
  | 'DATA_CREATE'
  | 'DATA_UPDATE'
  | 'DATA_DELETE'
  | 'CONFIG_CHANGE'
  | 'SYSTEM_START'
  | 'SYSTEM_STOP'
  | 'SECURITY_ALERT'
  | 'PERMISSION_CHANGE'
  | 'FILE_UPLOAD'
  | 'FILE_DOWNLOAD'
  | 'API_CALL'
  | 'CUSTOM';

/** 审计级别 */
export type AuditLevel = 'low' | 'medium' | 'high' | 'critical';

/** 审计日志条目 */
export interface AuditLogEntry {
  /** 唯一标识符 */
  id: string;
  /** ISO 8601 时间戳 */
  timestamp: string;
  /** 事件类型 */
  eventType: AuditEventType;
  /** 审计级别 */
  level: AuditLevel;
  /** 操作用户 ID */
  userId?: string;
  /** 操作用户名 */
  username?: string;
  /** 用户 IP 地址 */
  ipAddress?: string;
  /** 用户代理 */
  userAgent?: string;
  /** 资源类型 (user/data/config/system) */
  resourceType?: string;
  /** 资源 ID */
  resourceId?: string;
  /** 操作描述 */
  action: string;
  /** 操作前状态 (可选) */
  beforeState?: any;
  /** 操作后状态 (可选) */
  afterState?: any;
  /** 附加元数据 */
  metadata?: Record<string, any>;
  /** 操作结果 (success/failure) */
  result: 'success' | 'failure';
  /** 错误信息 (失败时) */
  errorMessage?: string;
  /** 会话 ID */
  sessionId?: string;
  /** 请求 ID */
  requestId?: string;
}

/** 审计配置 */
export interface AuditConfig {
  /** 日志文件目录 (默认: ./audit-logs) */
  logDir?: string;
  /** 单文件最大大小 (默认: 50MB) */
  maxFileSize?: number;
  /** 最多保留的文件数 (默认: 10) */
  maxFiles?: number;
  /** 是否启用异步写入 (默认: true) */
  asyncWrite?: boolean;
  /** 是否压缩旧日志 (默认: false) */
  compressOldLogs?: boolean;
  /** 日志文件名前缀 (默认: 'audit') */
  fileNamePrefix?: string;
  /** 敏感字段加密 (默认: ['password', 'token', 'secret']) */
  sensitiveFields?: string[];
}

/** 日志查询选项 */
export interface AuditQueryOptions {
  /** 按事件类型过滤 */
  eventType?: AuditEventType | AuditEventType[];
  /** 按级别过滤 */
  level?: AuditLevel | AuditLevel[];
  /** 按用户 ID 过滤 */
  userId?: string;
  /** 按用户名过滤 */
  username?: string;
  /** 按资源类型过滤 */
  resourceType?: string;
  /** 按资源 ID 过滤 */
  resourceId?: string;
  /** 按操作结果过滤 */
  result?: 'success' | 'failure';
  /** 开始时间 (ISO 8601) */
  startTime?: string;
  /** 结束时间 (ISO 8601) */
  endTime?: string;
  /** 关键词搜索 (action/metadata) */
  search?: string;
  /** 返回数量限制 */
  limit?: number;
  /** 偏移量 */
  offset?: number;
  /** 排序字段 (默认: 'timestamp') */
  sortBy?: 'timestamp' | 'level' | 'eventType';
  /** 排序方向 (默认: 'desc') */
  sortOrder?: 'asc' | 'desc';
}

/** 审计报告选项 */
export interface AuditReportOptions {
  /** 报告标题 */
  title?: string;
  /** 报告格式 (json/markdown/html) */
  format?: 'json' | 'markdown' | 'html';
  /** 包含统计信息 (默认: true) */
  includeStats?: boolean;
  /** 包含时间范围分析 (默认: true) */
  includeTimeAnalysis?: boolean;
  /** 包含用户活动分析 (默认: true) */
  includeUserAnalysis?: boolean;
  /** 包含安全事件摘要 (默认: true) */
  includeSecuritySummary?: boolean;
  /** 输出文件路径 (可选) */
  outputPath?: string;
}

/** 审计统计 */
export interface AuditStats {
  /** 总日志条目数 */
  totalEntries: number;
  /** 按事件类型统计 */
  byEventType: Record<AuditEventType, number>;
  /** 按级别统计 */
  byLevel: Record<AuditLevel, number>;
  /** 按用户统计 */
  byUser: Record<string, number>;
  /** 按结果统计 */
  byResult: { success: number; failure: number };
  /** 按资源类型统计 */
  byResourceType: Record<string, number>;
  /** 总文件大小 (bytes) */
  totalSize: number;
  /** 时间范围 */
  timeRange: {
    earliest: string;
    latest: string;
  };
}

/** 审计报告 */
export interface AuditReport {
  /** 报告生成时间 */
  generatedAt: string;
  /** 报告标题 */
  title: string;
  /** 统计信息 */
  stats: AuditStats;
  /** 时间分析 */
  timeAnalysis?: {
    /** 按小时分布 */
    byHour: Record<number, number>;
    /** 按天分布 */
    byDay: Record<string, number>;
    /** 高峰期 */
    peakHours: number[];
  };
  /** 用户活动分析 */
  userAnalysis?: {
    /** 活跃用户列表 */
    activeUsers: Array<{
      userId: string;
      username?: string;
      actionCount: number;
      failureRate: number;
    }>;
    /** 异常用户 (高失败率) */
    suspiciousUsers: Array<{
      userId: string;
      username?: string;
      failureRate: number;
      reason: string;
    }>;
  };
  /** 安全事件摘要 */
  securitySummary?: {
    /** 高危事件数 */
    criticalEvents: number;
    /** 高失败率事件 */
    highFailureEvents: Array<{
      eventType: AuditEventType;
      failureRate: number;
      count: number;
    }>;
    /** 最近安全警报 */
    recentAlerts: AuditLogEntry[];
  };
  /** 日志条目 (可选) */
  entries?: AuditLogEntry[];
}

// ============== 默认配置 ==============

const DEFAULT_CONFIG: Required<AuditConfig> = {
  logDir: path.join(process.cwd(), 'audit-logs'),
  maxFileSize: 50 * 1024 * 1024, // 50MB
  maxFiles: 10,
  asyncWrite: true,
  compressOldLogs: false,
  fileNamePrefix: 'audit',
  sensitiveFields: ['password', 'token', 'secret', 'apiKey', 'privateKey'],
};

// ============== 工具函数 ==============

/**
 * 生成唯一 ID
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 深度克隆对象
 */
function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * 脱敏敏感字段
 */
function sanitizeData(data: any, sensitiveFields: string[]): any {
  if (!data || typeof data !== 'object') return data;
  
  const cloned = deepClone(data);
  
  const sanitize = (obj: any) => {
    if (!obj || typeof obj !== 'object') return;
    
    for (const key of Object.keys(obj)) {
      const lowerKey = key.toLowerCase();
      if (sensitiveFields.some(field => lowerKey.includes(field.toLowerCase()))) {
        obj[key] = '[REDACTED]';
      } else if (typeof obj[key] === 'object') {
        sanitize(obj[key]);
      }
    }
  };
  
  sanitize(cloned);
  return cloned;
}

// ============== AuditTracker 类 ==============

export class AuditTracker {
  private config: Required<AuditConfig>;
  private currentFile: string;
  private currentFileSize: number = 0;
  private writeQueue: Array<{ entry: AuditLogEntry; resolve: () => void }> = [];
  private isWriting: boolean = false;

  constructor(config?: AuditConfig) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.ensureLogDir();
    this.currentFile = this.getLogFileName(0);
    this.currentFileSize = this.getFileSize(this.currentFile);
    this.checkRotation();
    
    // 启动异步写入处理器
    if (this.config.asyncWrite) {
      this.processWriteQueue();
    }
  }

  // ============== 核心日志记录方法 ==============

  /**
   * 记录审计事件
   */
  log(event: Partial<AuditLogEntry>): AuditLogEntry {
    const entry: AuditLogEntry = {
      id: generateId(),
      timestamp: new Date().toISOString(),
      eventType: event.eventType || 'CUSTOM',
      level: event.level || 'low',
      userId: event.userId,
      username: event.username,
      ipAddress: event.ipAddress,
      userAgent: event.userAgent,
      resourceType: event.resourceType,
      resourceId: event.resourceId,
      action: event.action || 'Unknown action',
      beforeState: event.beforeState 
        ? sanitizeData(event.beforeState, this.config.sensitiveFields)
        : undefined,
      afterState: event.afterState
        ? sanitizeData(event.afterState, this.config.sensitiveFields)
        : undefined,
      metadata: event.metadata
        ? sanitizeData(event.metadata, this.config.sensitiveFields)
        : undefined,
      result: event.result || 'success',
      errorMessage: event.errorMessage,
      sessionId: event.sessionId,
      requestId: event.requestId,
    };

    const formatted = JSON.stringify(entry) + '\n';

    if (this.config.asyncWrite) {
      // 异步写入
      return new Promise((resolve) => {
        this.writeQueue.push({ entry, resolve });
      }) as any;
    } else {
      // 同步写入
      this.writeToFile(formatted);
      return entry;
    }
  }

  /**
   * 便捷方法：记录用户登录
   */
  logUserLogin(
    userId: string,
    username: string,
    ipAddress: string,
    success: boolean,
    errorMessage?: string
  ): AuditLogEntry {
    return this.log({
      eventType: 'USER_LOGIN',
      level: success ? 'low' : 'medium',
      userId,
      username,
      ipAddress,
      action: `User ${success ? 'logged in' : 'failed to log in'}`,
      result: success ? 'success' : 'failure',
      errorMessage,
    });
  }

  /**
   * 便捷方法：记录用户登出
   */
  logUserLogout(
    userId: string,
    username: string,
    sessionId?: string
  ): AuditLogEntry {
    return this.log({
      eventType: 'USER_LOGOUT',
      level: 'low',
      userId,
      username,
      sessionId,
      action: `User logged out`,
      result: 'success',
    });
  }

  /**
   * 便捷方法：记录数据访问
   */
  logDataAccess(
    userId: string,
    resourceType: string,
    resourceId: string,
    action: string,
    success: boolean
  ): AuditLogEntry {
    return this.log({
      eventType: 'DATA_ACCESS',
      level: success ? 'low' : 'medium',
      userId,
      resourceType,
      resourceId,
      action,
      result: success ? 'success' : 'failure',
    });
  }

  /**
   * 便捷方法：记录配置变更
   */
  logConfigChange(
    userId: string,
    configKey: string,
    beforeValue: any,
    afterValue: any,
    success: boolean
  ): AuditLogEntry {
    return this.log({
      eventType: 'CONFIG_CHANGE',
      level: 'medium',
      userId,
      resourceType: 'config',
      resourceId: configKey,
      action: `Configuration changed: ${configKey}`,
      beforeState: { value: beforeValue },
      afterState: { value: afterValue },
      result: success ? 'success' : 'failure',
    });
  }

  /**
   * 便捷方法：记录安全警报
   */
  logSecurityAlert(
    alertType: string,
    description: string,
    userId?: string,
    ipAddress?: string,
    level: AuditLevel = 'high'
  ): AuditLogEntry {
    return this.log({
      eventType: 'SECURITY_ALERT',
      level,
      userId,
      ipAddress,
      action: `Security alert: ${alertType}`,
      metadata: { alertType, description },
      result: 'success',
    });
  }

  /**
   * 便捷方法：记录 API 调用
   */
  logApiCall(
    userId: string,
    method: string,
    endpoint: string,
    statusCode: number,
    durationMs: number,
    ipAddress?: string
  ): AuditLogEntry {
    return this.log({
      eventType: 'API_CALL',
      level: statusCode >= 400 ? 'medium' : 'low',
      userId,
      ipAddress,
      resourceType: 'api',
      resourceId: endpoint,
      action: `${method} ${endpoint}`,
      metadata: { method, endpoint, statusCode, durationMs },
      result: statusCode < 400 ? 'success' : 'failure',
    });
  }

  // ============== 日志查询方法 ==============

  /**
   * 查询审计日志
   */
  async query(options: AuditQueryOptions = {}): Promise<AuditLogEntry[]> {
    const entries: AuditLogEntry[] = [];
    const logFiles = this.getLogFiles();

    for (const file of logFiles) {
      const content = fs.readFileSync(file, 'utf-8');
      const lines = content.trim().split('\n').filter(line => line.trim());

      for (const line of lines) {
        try {
          const entry: AuditLogEntry = JSON.parse(line);
          
          if (this.matchesFilter(entry, options)) {
            entries.push(entry);
          }
        } catch (e) {
          // 跳过无效的 JSON 行
          continue;
        }
      }
    }

    // 排序
    const sortBy = options.sortBy || 'timestamp';
    const sortOrder = options.sortOrder || 'desc';
    
    entries.sort((a, b) => {
      let comparison = 0;
      
      if (sortBy === 'timestamp') {
        comparison = new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
      } else if (sortBy === 'level') {
        const levelOrder = { low: 0, medium: 1, high: 2, critical: 3 };
        comparison = levelOrder[a.level] - levelOrder[b.level];
      } else if (sortBy === 'eventType') {
        comparison = a.eventType.localeCompare(b.eventType);
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    // 分页
    const offset = options.offset || 0;
    const limit = options.limit || entries.length;
    
    return entries.slice(offset, offset + limit);
  }

  /**
   * 获取审计统计
   */
  async getStats(options: AuditQueryOptions = {}): Promise<AuditStats> {
    const entries = await this.query(options);
    
    const stats: AuditStats = {
      totalEntries: entries.length,
      byEventType: {} as Record<AuditEventType, number>,
      byLevel: { low: 0, medium: 0, high: 0, critical: 0 },
      byUser: {},
      byResult: { success: 0, failure: 0 },
      byResourceType: {},
      totalSize: this.getTotalLogSize(),
      timeRange: {
        earliest: '',
        latest: '',
      },
    };

    if (entries.length === 0) {
      return stats;
    }

    // 初始化事件类型统计
    const eventTypes: AuditEventType[] = [
      'USER_LOGIN', 'USER_LOGOUT', 'USER_CREATE', 'USER_UPDATE', 'USER_DELETE',
      'DATA_ACCESS', 'DATA_CREATE', 'DATA_UPDATE', 'DATA_DELETE',
      'CONFIG_CHANGE', 'SYSTEM_START', 'SYSTEM_STOP',
      'SECURITY_ALERT', 'PERMISSION_CHANGE',
      'FILE_UPLOAD', 'FILE_DOWNLOAD', 'API_CALL', 'CUSTOM'
    ];
    
    for (const type of eventTypes) {
      stats.byEventType[type] = 0;
    }

    // 统计
    let earliest = entries[0].timestamp;
    let latest = entries[0].timestamp;

    for (const entry of entries) {
      // 事件类型
      stats.byEventType[entry.eventType] = (stats.byEventType[entry.eventType] || 0) + 1;
      
      // 级别
      stats.byLevel[entry.level]++;
      
      // 用户
      if (entry.userId) {
        stats.byUser[entry.userId] = (stats.byUser[entry.userId] || 0) + 1;
      }
      
      // 结果
      stats.byResult[entry.result]++;
      
      // 资源类型
      if (entry.resourceType) {
        stats.byResourceType[entry.resourceType] = (stats.byResourceType[entry.resourceType] || 0) + 1;
      }
      
      // 时间范围
      if (entry.timestamp < earliest) earliest = entry.timestamp;
      if (entry.timestamp > latest) latest = entry.timestamp;
    }

    stats.timeRange = { earliest, latest };
    
    return stats;
  }

  // ============== 审计报告方法 ==============

  /**
   * 生成审计报告
   */
  async generateReport(options: AuditReportOptions = {}): Promise<AuditReport> {
    const stats = await this.getStats();
    
    const report: AuditReport = {
      generatedAt: new Date().toISOString(),
      title: options.title || 'Audit Report',
      stats,
    };

    // 时间分析
    if (options.includeTimeAnalysis !== false) {
      report.timeAnalysis = this.generateTimeAnalysis(await this.query());
    }

    // 用户活动分析
    if (options.includeUserAnalysis !== false) {
      report.userAnalysis = this.generateUserAnalysis(await this.query());
    }

    // 安全事件摘要
    if (options.includeSecuritySummary !== false) {
      report.securitySummary = this.generateSecuritySummary(await this.query());
    }

    // 输出到文件
    if (options.outputPath) {
      this.writeReportToFile(report, options.outputPath, options.format || 'json');
    }

    return report;
  }

  /**
   * 导出日志为 JSON
   */
  async exportToJson(options: AuditQueryOptions = {}): Promise<string> {
    const entries = await this.query(options);
    return JSON.stringify(entries, null, 2);
  }

  /**
   * 导出日志为 CSV
   */
  async exportToCsv(options: AuditQueryOptions = {}): Promise<string> {
    const entries = await this.query(options);
    
    const headers = [
      'id', 'timestamp', 'eventType', 'level', 'userId', 'username',
      'ipAddress', 'resourceType', 'resourceId', 'action', 'result', 'errorMessage'
    ];
    
    const lines = [headers.join(',')];
    
    for (const entry of entries) {
      const row = headers.map(header => {
        const value = (entry as any)[header];
        if (value === undefined || value === null) return '';
        const str = String(value).replace(/"/g, '""');
        return str.includes(',') || str.includes('"') || str.includes('\n') ? `"${str}"` : str;
      });
      lines.push(row.join(','));
    }
    
    return lines.join('\n');
  }

  // ============== 私有方法 ==============

  private matchesFilter(entry: AuditLogEntry, options: AuditQueryOptions): boolean {
    // 事件类型过滤
    if (options.eventType) {
      const types = Array.isArray(options.eventType) ? options.eventType : [options.eventType];
      if (!types.includes(entry.eventType)) return false;
    }

    // 级别过滤
    if (options.level) {
      const levels = Array.isArray(options.level) ? options.level : [options.level];
      if (!levels.includes(entry.level)) return false;
    }

    // 用户过滤
    if (options.userId && entry.userId !== options.userId) return false;
    if (options.username && entry.username !== options.username) return false;

    // 资源过滤
    if (options.resourceType && entry.resourceType !== options.resourceType) return false;
    if (options.resourceId && entry.resourceId !== options.resourceId) return false;

    // 结果过滤
    if (options.result && entry.result !== options.result) return false;

    // 时间范围过滤
    if (options.startTime && entry.timestamp < options.startTime) return false;
    if (options.endTime && entry.timestamp > options.endTime) return false;

    // 关键词搜索
    if (options.search) {
      const searchLower = options.search.toLowerCase();
      const searchable = [
        entry.action,
        entry.eventType,
        entry.username,
        entry.resourceType,
        JSON.stringify(entry.metadata),
      ].join(' ').toLowerCase();
      
      if (!searchable.includes(searchLower)) return false;
    }

    return true;
  }

  private generateTimeAnalysis(entries: AuditLogEntry[]): AuditReport['timeAnalysis'] {
    const byHour: Record<number, number> = {};
    const byDay: Record<string, number> = {};
    
    for (let i = 0; i < 24; i++) {
      byHour[i] = 0;
    }

    for (const entry of entries) {
      const date = new Date(entry.timestamp);
      const hour = date.getHours();
      const day = date.toISOString().split('T')[0];
      
      byHour[hour] = (byHour[hour] || 0) + 1;
      byDay[day] = (byDay[day] || 0) + 1;
    }

    // 找出高峰期 (前 3 个小时)
    const peakHours = Object.entries(byHour)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([hour]) => parseInt(hour));

    return { byHour, byDay, peakHours };
  }

  private generateUserAnalysis(entries: AuditLogEntry[]): AuditReport['userAnalysis'] {
    const userStats: Record<string, { 
      username?: string; 
      total: number; 
      failures: number; 
    }> = {};

    for (const entry of entries) {
      if (!entry.userId) continue;
      
      if (!userStats[entry.userId]) {
        userStats[entry.userId] = {
          username: entry.username,
          total: 0,
          failures: 0,
        };
      }
      
      userStats[entry.userId].total++;
      if (entry.result === 'failure') {
        userStats[entry.userId].failures++;
      }
    }

    const activeUsers = Object.entries(userStats)
      .map(([userId, stats]) => ({
        userId,
        username: stats.username,
        actionCount: stats.total,
        failureRate: stats.total > 0 ? stats.failures / stats.total : 0,
      }))
      .sort((a, b) => b.actionCount - a.actionCount);

    const suspiciousUsers = activeUsers
      .filter(user => user.failureRate > 0.3 && user.actionCount >= 5)
      .map(user => ({
        userId: user.userId,
        username: user.username,
        failureRate: user.failureRate,
        reason: `High failure rate (${(user.failureRate * 100).toFixed(1)}%)`,
      }));

    return { activeUsers, suspiciousUsers };
  }

  private generateSecuritySummary(entries: AuditLogEntry[]): AuditReport['securitySummary'] {
    const criticalEvents = entries.filter(e => e.level === 'critical').length;
    
    // 按事件类型统计失败率
    const eventTypeStats: Record<string, { total: number; failures: number }> = {};
    
    for (const entry of entries) {
      if (!eventTypeStats[entry.eventType]) {
        eventTypeStats[entry.eventType] = { total: 0, failures: 0 };
      }
      eventTypeStats[entry.eventType].total++;
      if (entry.result === 'failure') {
        eventTypeStats[entry.eventType].failures++;
      }
    }

    const highFailureEvents = Object.entries(eventTypeStats)
      .filter(([, stats]) => stats.total >= 5 && stats.failures / stats.total > 0.2)
      .map(([eventType, stats]) => ({
        eventType: eventType as AuditEventType,
        failureRate: stats.failures / stats.total,
        count: stats.total,
      }))
      .sort((a, b) => b.failureRate - a.failureRate);

    const recentAlerts = entries
      .filter(e => e.eventType === 'SECURITY_ALERT')
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 10);

    return {
      criticalEvents,
      highFailureEvents,
      recentAlerts,
    };
  }

  private writeReportToFile(report: AuditReport, outputPath: string, format: 'json' | 'markdown' | 'html'): void {
    let content: string;

    if (format === 'json') {
      content = JSON.stringify(report, null, 2);
    } else if (format === 'markdown') {
      content = this.formatReportAsMarkdown(report);
    } else {
      content = this.formatReportAsHtml(report);
    }

    fs.writeFileSync(outputPath, content, 'utf-8');
  }

  private formatReportAsMarkdown(report: AuditReport): string {
    const lines: string[] = [];

    lines.push(`# ${report.title}`);
    lines.push('');
    lines.push(`**生成时间:** ${new Date(report.generatedAt).toLocaleString('zh-CN')}`);
    lines.push('');

    // 统计信息
    lines.push('## 📊 统计概览');
    lines.push('');
    lines.push(`- **总条目数:** ${report.stats.totalEntries}`);
    lines.push(`- **时间范围:** ${report.stats.timeRange.earliest || 'N/A'} - ${report.stats.timeRange.latest || 'N/A'}`);
    lines.push(`- **成功:** ${report.stats.byResult.success} | **失败:** ${report.stats.byResult.failure}`);
    lines.push('');

    // 按级别统计
    lines.push('### 按级别分布');
    lines.push('');
    lines.push('| 级别 | 数量 |');
    lines.push('|------|------|');
    for (const [level, count] of Object.entries(report.stats.byLevel)) {
      if (count > 0) lines.push(`| ${level} | ${count} |`);
    }
    lines.push('');

    // 按事件类型统计
    lines.push('### 按事件类型分布 (Top 10)');
    lines.push('');
    const topEvents = Object.entries(report.stats.byEventType)
      .filter(([, count]) => count > 0)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10);
    
    lines.push('| 事件类型 | 数量 |');
    lines.push('|----------|------|');
    for (const [type, count] of topEvents) {
      lines.push(`| ${type} | ${count} |`);
    }
    lines.push('');

    // 时间分析
    if (report.timeAnalysis) {
      lines.push('## 🕐 时间分析');
      lines.push('');
      lines.push(`**高峰期:** ${report.timeAnalysis.peakHours.map(h => `${h}:00`).join(', ')}`);
      lines.push('');
    }

    // 用户活动
    if (report.userAnalysis) {
      lines.push('## 👥 用户活动');
      lines.push('');
      lines.push('### 活跃用户 (Top 10)');
      lines.push('');
      lines.push('| 用户 ID | 用户名 | 操作数 | 失败率 |');
      lines.push('|--------|--------|--------|--------|');
      for (const user of report.userAnalysis.activeUsers.slice(0, 10)) {
        lines.push(`| ${user.userId} | ${user.username || 'N/A'} | ${user.actionCount} | ${(user.failureRate * 100).toFixed(1)}% |`);
      }
      lines.push('');

      if (report.userAnalysis.suspiciousUsers.length > 0) {
        lines.push('### ⚠️ 可疑用户');
        lines.push('');
        for (const user of report.userAnalysis.suspiciousUsers) {
          lines.push(`- **${user.username || user.userId}:** ${user.reason}`);
        }
        lines.push('');
      }
    }

    // 安全摘要
    if (report.securitySummary) {
      lines.push('## 🔒 安全摘要');
      lines.push('');
      lines.push(`- **危急事件:** ${report.securitySummary.criticalEvents}`);
      lines.push('');

      if (report.securitySummary.highFailureEvents.length > 0) {
        lines.push('### 高失败率事件');
        lines.push('');
        lines.push('| 事件类型 | 失败率 | 总数 |');
        lines.push('|----------|--------|------|');
        for (const event of report.securitySummary.highFailureEvents) {
          lines.push(`| ${event.eventType} | ${(event.failureRate * 100).toFixed(1)}% | ${event.count} |`);
        }
        lines.push('');
      }
    }

    return lines.join('\n');
  }

  private formatReportAsHtml(report: AuditReport): string {
    const md = this.formatReportAsMarkdown(report);
    
    // 简单的 Markdown 转 HTML
    let html = md
      .replace(/^# (.*$)/gm, '<h1>$1</h1>')
      .replace(/^## (.*$)/gm, '<h2>$1</h2>')
      .replace(/^### (.*$)/gm, '<h3>$1</h3>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\| (.*?) \|/g, '<tr><td>$1</td></tr>')
      .replace(/^- (.*$)/gm, '<li>$1</li>')
      .replace(/\n/g, '<br>');

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${report.title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 1200px; margin: 40px auto; padding: 20px; }
    h1 { color: #1a1a2e; border-bottom: 2px solid #6366f1; padding-bottom: 10px; }
    h2 { color: #16213e; margin-top: 30px; }
    table { border-collapse: collapse; width: 100%; margin: 20px 0; }
    td, th { border: 1px solid #ddd; padding: 12px; text-align: left; }
    tr:nth-child(even) { background-color: #f8f9fa; }
    strong { color: #6366f1; }
    li { margin: 8px 0; }
  </style>
</head>
<body>
  ${html}
</body>
</html>`;
  }

  private ensureLogDir(): void {
    if (!fs.existsSync(this.config.logDir)) {
      fs.mkdirSync(this.config.logDir, { recursive: true });
    }
  }

  private getLogFileName(index: number): string {
    return path.join(this.config.logDir, `${this.config.fileNamePrefix}.${index}.log`);
  }

  private getLogFiles(): string[] {
    const files: string[] = [];
    for (let i = 0; i < this.config.maxFiles; i++) {
      const file = this.getLogFileName(i);
      if (fs.existsSync(file)) {
        files.push(file);
      }
    }
    return files;
  }

  private getFileSize(filePath: string): number {
    try {
      return fs.statSync(filePath).size;
    } catch {
      return 0;
    }
  }

  private getTotalLogSize(): number {
    return this.getLogFiles().reduce((total, file) => {
      return total + this.getFileSize(file);
    }, 0);
  }

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

    // 重命名现有文件
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

  private writeToFile(formatted: string): void {
    this.checkRotation();
    fs.appendFileSync(this.currentFile, formatted);
    this.currentFileSize += Buffer.byteLength(formatted, 'utf8');
  }

  private async processWriteQueue(): Promise<void> {
    while (true) {
      if (this.writeQueue.length > 0) {
        const { entry, resolve } = this.writeQueue.shift()!;
        const formatted = JSON.stringify(entry) + '\n';
        this.writeToFile(formatted);
        resolve();
      } else {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
  }
}

// ============== 导出默认实例 ==============

export const auditTracker = new AuditTracker();

export default AuditTracker;
