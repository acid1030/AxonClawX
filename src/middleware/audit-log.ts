/**
 * AxonClaw 审计日志中间件
 * 
 * 功能:
 * 1. 请求/响应日志记录
 * 2. 用户操作追踪
 * 3. 敏感操作告警
 * 
 * @module middleware/audit-log
 */

import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';

// ==================== 类型定义 ====================

export interface AuditLogEntry {
  /** 日志 ID */
  id: string;
  /** 时间戳 */
  timestamp: string;
  /** 日志级别 */
  level: 'info' | 'warn' | 'error' | 'alert';
  /** 事件类型 */
  eventType: AuditEventType;
  /** 用户标识 */
  userId?: string;
  /** 会话标识 */
  sessionId?: string;
  /** 请求方法 */
  method?: string;
  /** 请求路径 */
  path?: string;
  /** 请求体 (脱敏) */
  requestBody?: any;
  /** 响应状态码 */
  statusCode?: number;
  /** 响应体 (脱敏) */
  responseBody?: any;
  /** 执行时长 (ms) */
  duration?: number;
  /** IP 地址 */
  ip?: string;
  /** 用户代理 */
  userAgent?: string;
  /** 操作描述 */
  description?: string;
  /** 元数据 */
  metadata?: Record<string, any>;
  /** 是否敏感操作 */
  isSensitive?: boolean;
  /** 告警原因 */
  alertReason?: string;
}

export type AuditEventType =
  | 'request'
  | 'response'
  | 'user_login'
  | 'user_logout'
  | 'user_action'
  | 'data_access'
  | 'data_modify'
  | 'data_delete'
  | 'permission_change'
  | 'config_change'
  | 'system_event'
  | 'security_alert'
  | 'error';

export interface AuditLogConfig {
  /** 日志文件路径 */
  logPath: string;
  /** 最大日志文件大小 (MB) */
  maxFileSize: number;
  /** 日志保留天数 */
  retentionDays: number;
  /** 是否启用控制台输出 */
  enableConsole: boolean;
  /** 是否记录请求体 */
  logRequestBody: boolean;
  /** 是否记录响应体 */
  logResponseBody: boolean;
  /** 敏感字段列表 (自动脱敏) */
  sensitiveFields: string[];
  /** 敏感操作路径模式 */
  sensitivePaths: RegExp[];
  /** 告警回调 */
  onAlert?: (entry: AuditLogEntry) => void;
}

export interface AuditLogMiddleware {
  /** Express 中间件函数 */
  (req: any, res: any, next: () => void): void;
  /** 记录自定义事件 */
  logEvent: (event: Omit<AuditLogEntry, 'id' | 'timestamp'>) => void;
  /** 获取最近的日志 */
  getRecentLogs: (limit?: number) => AuditLogEntry[];
  /** 清理旧日志 */
  cleanup: () => void;
}

// ==================== 默认配置 ====================

const DEFAULT_CONFIG: AuditLogConfig = {
  logPath: './logs/audit',
  maxFileSize: 100, // 100MB
  retentionDays: 30,
  enableConsole: process.env.NODE_ENV !== 'production',
  logRequestBody: true,
  logResponseBody: false,
  sensitiveFields: [
    'password',
    'token',
    'secret',
    'key',
    'authorization',
    'cookie',
    'session',
    'credit_card',
    'ssn',
    'id_card'
  ],
  sensitivePaths: [
    /\/admin\//,
    /\/api\/users\/\d+$/,
    /\/api\/permissions/,
    /\/api\/config/,
    /\/api\/delete/,
    /\/api\/remove/
  ]
};

// ==================== 工具函数 ====================

/**
 * 生成唯一 ID
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 获取 ISO 时间戳
 */
function getTimestamp(): string {
  return new Date().toISOString();
}

/**
 * 脱敏敏感字段
 */
function sanitizeData(data: any, sensitiveFields: string[]): any {
  if (!data || typeof data !== 'object') return data;

  const sanitized = Array.isArray(data) ? [] : {};
  
  for (const key in data) {
    if (data.hasOwnProperty(key)) {
      const lowerKey = key.toLowerCase();
      const isSensitive = sensitiveFields.some(field => 
        lowerKey.includes(field.toLowerCase())
      );

      if (isSensitive) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof data[key] === 'object') {
        sanitized[key] = sanitizeData(data[key], sensitiveFields);
      } else {
        sanitized[key] = data[key];
      }
    }
  }

  return sanitized;
}

/**
 * 检查路径是否敏感
 */
function isSensitivePath(path: string, patterns: RegExp[]): boolean {
  return patterns.some(pattern => pattern.test(path));
}

/**
 * 获取客户端 IP
 */
function getClientIP(req: any): string {
  return req.ip || 
         req.headers['x-forwarded-for'] || 
         req.headers['x-real-ip'] || 
         'unknown';
}

/**
 * 格式化日志条目
 */
function formatLogEntry(entry: AuditLogEntry): string {
  return JSON.stringify(entry, null, 2);
}

// ==================== 审计日志类 ====================

export class AuditLogger extends EventEmitter {
  private config: AuditLogConfig;
  private recentLogs: AuditLogEntry[] = [];
  private maxRecentLogs = 1000;

  constructor(config: Partial<AuditLogConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.ensureLogDirectory();
  }

  /**
   * 确保日志目录存在
   */
  private ensureLogDirectory(): void {
    const dir = path.dirname(this.config.logPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  /**
   * 获取日志文件路径 (按日期分片)
   */
  private getLogFilePath(): string {
    const date = new Date().toISOString().split('T')[0];
    return path.join(this.config.logPath, `audit-${date}.log`);
  }

  /**
   * 写入日志
   */
  private writeLog(entry: AuditLogEntry): void {
    // 添加到内存缓存
    this.recentLogs.push(entry);
    if (this.recentLogs.length > this.maxRecentLogs) {
      this.recentLogs.shift();
    }

    // 写入文件
    const logFile = this.getLogFilePath();
    const logLine = formatLogEntry(entry) + '\n';

    try {
      fs.appendFileSync(logFile, logLine, 'utf8');
      
      // 检查文件大小
      this.checkFileSize(logFile);
    } catch (error) {
      console.error('[AuditLogger] Failed to write log:', error);
    }

    // 控制台输出
    if (this.config.enableConsole) {
      this.printToConsole(entry);
    }

    // 触发告警
    if (entry.level === 'alert' && this.config.onAlert) {
      this.config.onAlert(entry);
    }

    this.emit('log', entry);
  }

  /**
   * 检查文件大小并轮转
   */
  private checkFileSize(logFile: string): void {
    try {
      const stats = fs.statSync(logFile);
      const sizeMB = stats.size / (1024 * 1024);

      if (sizeMB > this.config.maxFileSize) {
        this.rotateLogFile(logFile);
      }
    } catch (error) {
      // 忽略错误
    }
  }

  /**
   * 轮转日志文件
   */
  private rotateLogFile(logFile: string): void {
    const timestamp = Date.now();
    const rotatedFile = `${logFile}.${timestamp}.bak`;
    
    try {
      fs.renameSync(logFile, rotatedFile);
      console.log('[AuditLogger] Log file rotated:', rotatedFile);
    } catch (error) {
      console.error('[AuditLogger] Failed to rotate log file:', error);
    }
  }

  /**
   * 控制台输出
   */
  private printToConsole(entry: AuditLogEntry): void {
    const color = this.getLogLevelColor(entry.level);
    const icon = this.getLogLevelIcon(entry.level);
    
    console.log(
      `${icon} [${entry.timestamp}] ${color}${entry.level.toUpperCase()}${'\x1b[0m'}`,
      `- ${entry.eventType}`,
      entry.description ? `: ${entry.description}` : ''
    );

    if (entry.alertReason) {
      console.warn(`  ⚠️  告警原因：${entry.alertReason}`);
    }
  }

  /**
   * 获取日志级别颜色
   */
  private getLogLevelColor(level: string): string {
    const colors: Record<string, string> = {
      info: '\x1b[36m',    // 青色
      warn: '\x1b[33m',    // 黄色
      error: '\x1b[31m',   // 红色
      alert: '\x1b[35m'    // 紫色
    };
    return colors[level] || '\x1b[0m';
  }

  /**
   * 获取日志级别图标
   */
  private getLogLevelIcon(level: string): string {
    const icons: Record<string, string> = {
      info: 'ℹ️',
      warn: '⚠️',
      error: '❌',
      alert: '🚨'
    };
    return icons[level] || '📝';
  }

  /**
   * 记录日志条目
   */
  log(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): AuditLogEntry {
    const fullEntry: AuditLogEntry = {
      id: generateId(),
      timestamp: getTimestamp(),
      ...entry
    };

    this.writeLog(fullEntry);
    return fullEntry;
  }

  /**
   * 记录请求开始
   */
  logRequest(req: any): string {
    const entry = this.log({
      level: 'info',
      eventType: 'request',
      method: req.method,
      path: req.path || req.url,
      ip: getClientIP(req),
      userAgent: req.headers['user-agent'],
      userId: req.user?.id || req.headers['x-user-id'],
      sessionId: req.session?.id || req.headers['x-session-id'],
      requestBody: this.config.logRequestBody 
        ? sanitizeData(req.body, this.config.sensitiveFields) 
        : undefined,
      isSensitive: isSensitivePath(req.path || req.url, this.config.sensitivePaths),
      description: `${req.method} ${req.path || req.url}`
    });

    return entry.id;
  }

  /**
   * 记录请求结束
   */
  logResponse(
    req: any,
    res: any,
    duration: number,
    requestId: string
  ): void {
    const isSensitive = isSensitivePath(req.path || req.url, this.config.sensitivePaths);
    
    this.log({
      level: res.statusCode >= 400 ? 'error' : 'info',
      eventType: 'response',
      method: req.method,
      path: req.path || req.url,
      statusCode: res.statusCode,
      duration,
      ip: getClientIP(req),
      userId: req.user?.id || req.headers['x-user-id'],
      sessionId: req.session?.id || req.headers['x-session-id'],
      responseBody: this.config.logResponseBody && res.statusCode < 400
        ? sanitizeData(res.locals?.responseData || res.body, this.config.sensitiveFields)
        : undefined,
      isSensitive,
      description: `${req.method} ${req.path || req.url} - ${res.statusCode} (${duration}ms)`,
      metadata: { requestId }
    });

    // 敏感操作告警
    if (isSensitive && res.statusCode >= 200 && res.statusCode < 300) {
      this.log({
        level: 'alert',
        eventType: 'security_alert',
        method: req.method,
        path: req.path || req.url,
        statusCode: res.statusCode,
        userId: req.user?.id || req.headers['x-user-id'],
        ip: getClientIP(req),
        isSensitive: true,
        alertReason: '敏感操作成功执行',
        description: `敏感操作告警：${req.method} ${req.path || req.url}`
      });
    }
  }

  /**
   * 记录错误
   */
  logError(error: Error, req?: any, metadata?: Record<string, any>): void {
    this.log({
      level: 'error',
      eventType: 'error',
      description: error.message,
      userId: req?.user?.id,
      sessionId: req?.session?.id,
      method: req?.method,
      path: req?.path || req?.url,
      ip: req ? getClientIP(req) : undefined,
      metadata: {
        ...metadata,
        stack: error.stack,
        name: error.name
      }
    });
  }

  /**
   * 记录用户操作
   */
  logUserAction(
    userId: string,
    action: string,
    description: string,
    metadata?: Record<string, any>
  ): void {
    const isSensitive = this.config.sensitivePaths.some(pattern => 
      pattern.test(action)
    );

    this.log({
      level: isSensitive ? 'warn' : 'info',
      eventType: 'user_action',
      userId,
      description,
      isSensitive,
      metadata,
      alertReason: isSensitive ? '敏感用户操作' : undefined
    });
  }

  /**
   * 记录登录事件
   */
  logLogin(userId: string, success: boolean, ip: string, metadata?: Record<string, any>): void {
    this.log({
      level: success ? 'info' : 'warn',
      eventType: 'user_login',
      userId,
      ip,
      description: success ? `用户登录成功` : `用户登录失败`,
      metadata,
      alertReason: !success ? '登录失败' : undefined
    });
  }

  /**
   * 记录登出事件
   */
  logLogout(userId: string, ip: string): void {
    this.log({
      level: 'info',
      eventType: 'user_logout',
      userId,
      ip,
      description: '用户登出'
    });
  }

  /**
   * 记录数据访问
   */
  logDataAccess(
    userId: string,
    resourceType: string,
    resourceId: string,
    action: 'read' | 'write' | 'delete'
  ): void {
    const eventType: AuditEventType = 
      action === 'read' ? 'data_access' :
      action === 'write' ? 'data_modify' : 'data_delete';

    this.log({
      level: action === 'delete' ? 'warn' : 'info',
      eventType,
      userId,
      description: `${action.toUpperCase()} ${resourceType}/${resourceId}`,
      isSensitive: action === 'delete',
      metadata: { resourceType, resourceId, action },
      alertReason: action === 'delete' ? '数据删除操作' : undefined
    });
  }

  /**
   * 记录配置变更
   */
  logConfigChange(
    userId: string,
    configKey: string,
    oldValue: any,
    newValue: any
  ): void {
    this.log({
      level: 'warn',
      eventType: 'config_change',
      userId,
      description: `配置变更：${configKey}`,
      isSensitive: true,
      metadata: {
        configKey,
        oldValue: sanitizeData(oldValue, this.config.sensitiveFields),
        newValue: sanitizeData(newValue, this.config.sensitiveFields)
      },
      alertReason: '系统配置变更'
    });
  }

  /**
   * 记录权限变更
   */
  logPermissionChange(
    userId: string,
    targetUserId: string,
    permission: string,
    granted: boolean
  ): void {
    this.log({
      level: 'alert',
      eventType: 'permission_change',
      userId,
      description: `权限变更：${targetUserId} - ${permission} ${granted ? '授予' : '撤销'}`,
      isSensitive: true,
      alertReason: '权限变更操作',
      metadata: { targetUserId, permission, granted }
    });
  }

  /**
   * 获取最近的日志
   */
  getRecentLogs(limit: number = 100): AuditLogEntry[] {
    return this.recentLogs.slice(-limit);
  }

  /**
   * 查询日志
   */
  queryLogs(filters: {
    eventType?: AuditEventType;
    userId?: string;
    level?: AuditLogEntry['level'];
    startTime?: string;
    endTime?: string;
    isSensitive?: boolean;
  }): AuditLogEntry[] {
    return this.recentLogs.filter(entry => {
      if (filters.eventType && entry.eventType !== filters.eventType) return false;
      if (filters.userId && entry.userId !== filters.userId) return false;
      if (filters.level && entry.level !== filters.level) return false;
      if (filters.startTime && entry.timestamp < filters.startTime) return false;
      if (filters.endTime && entry.timestamp > filters.endTime) return false;
      if (filters.isSensitive !== undefined && entry.isSensitive !== filters.isSensitive) return false;
      return true;
    });
  }

  /**
   * 清理旧日志
   */
  cleanup(): void {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.config.retentionDays);

      const files = fs.readdirSync(this.config.logPath);
      
      for (const file of files) {
        if (!file.endsWith('.log') && !file.endsWith('.bak')) continue;

        const filePath = path.join(this.config.logPath, file);
        const stats = fs.statSync(filePath);
        
        if (stats.mtime < cutoffDate) {
          fs.unlinkSync(filePath);
          console.log('[AuditLogger] Deleted old log file:', file);
        }
      }
    } catch (error) {
      console.error('[AuditLogger] Cleanup failed:', error);
    }
  }
}

// ==================== Express 中间件 ====================

/**
 * 创建审计日志中间件
 */
export function createAuditMiddleware(
  config: Partial<AuditLogConfig> = {}
): AuditLogMiddleware {
  const logger = new AuditLogger(config);

  const middleware = (req: any, res: any, next: () => void) => {
    const startTime = Date.now();
    const requestId = logger.logRequest(req);

    // 包装 res.end 以捕获响应
    const originalEnd = res.end;
    res.end = function (...args: any[]) {
      const duration = Date.now() - startTime;
      
      logger.logResponse(req, res, duration, requestId);
      
      return originalEnd.apply(res, args);
    };

    next();
  };

  // 附加方法
  middleware.logEvent = (event: Omit<AuditLogEntry, 'id' | 'timestamp'>) => {
    logger.log(event);
  };

  middleware.getRecentLogs = (limit?: number) => {
    return logger.getRecentLogs(limit);
  };

  middleware.cleanup = () => {
    logger.cleanup();
  };

  return middleware;
}

// ==================== 导出单例 ====================

export const auditLogger = new AuditLogger();
export const auditMiddleware = createAuditMiddleware();

// ==================== 使用示例 ====================

/*
// ==================== 基础用法 ====================

import express from 'express';
import { auditMiddleware, auditLogger } from './middleware/audit-log';

const app = express();

// 1. 使用中间件
app.use(auditMiddleware);

// 2. 记录自定义事件
app.post('/api/users', (req, res) => {
  // ... 业务逻辑
  
  auditLogger.logUserAction(
    req.user.id,
    'create_user',
    `创建新用户：${req.body.username}`
  );
  
  res.json({ success: true });
});

// 3. 记录敏感操作
app.delete('/api/users/:id', (req, res) => {
  auditLogger.logDataAccess(
    req.user.id,
    'user',
    req.params.id,
    'delete'
  );
  
  // ... 删除逻辑
  res.json({ success: true });
});

// 4. 记录配置变更
app.put('/api/config', (req, res) => {
  auditLogger.logConfigChange(
    req.user.id,
    req.body.key,
    oldValue,
    req.body.value
  );
  
  res.json({ success: true });
});

// 5. 记录权限变更
app.post('/api/permissions', (req, res) => {
  auditLogger.logPermissionChange(
    req.user.id,
    req.body.targetUserId,
    req.body.permission,
    req.body.granted
  );
  
  res.json({ success: true });
});

// 6. 设置告警回调
auditLogger.on('log', (entry) => {
  if (entry.level === 'alert') {
    // 发送告警通知
    sendAlert(entry);
  }
});

// 7. 查询日志
const sensitiveLogs = auditLogger.queryLogs({
  isSensitive: true,
  startTime: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
});

// 8. 定期清理
setInterval(() => {
  auditLogger.cleanup();
}, 24 * 60 * 60 * 1000); // 每天清理一次

// ==================== 自定义配置 ====================

const customMiddleware = createAuditMiddleware({
  logPath: './custom-logs/audit',
  maxFileSize: 50, // 50MB
  retentionDays: 60,
  enableConsole: true,
  logRequestBody: false, // 不记录请求体
  logResponseBody: true, // 记录响应体
  sensitiveFields: ['password', 'token', 'api_key'],
  onAlert: (entry) => {
    // 自定义告警处理
    console.error('🚨 AUDIT ALERT:', entry);
    // 发送邮件、Slack 通知等
  }
});

// ==================== WebSocket 审计 ====================

import { WebSocket } from 'ws';

const wss = new WebSocket.Server({ port: 8080 });

wss.on('connection', (ws, req) => {
  auditLogger.log({
    level: 'info',
    eventType: 'user_action',
    description: 'WebSocket 连接建立',
    ip: getClientIP(req),
    metadata: { url: req.url }
  });

  ws.on('message', (data) => {
    auditLogger.log({
      level: 'info',
      eventType: 'user_action',
      description: 'WebSocket 消息接收',
      metadata: { dataLength: data.length }
    });
  });
});

// ==================== 错误处理 ====================

app.use((err: Error, req: any, res: any, next: any) => {
  auditLogger.logError(err, req, {
    route: req.path,
    method: req.method
  });
  
  res.status(500).json({ error: 'Internal Server Error' });
});

// ==================== 登录/登出审计 ====================

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  
  // 验证逻辑
  const success = validateUser(username, password);
  
  auditLogger.logLogin(
    username,
    success,
    getClientIP(req),
    { userAgent: req.headers['user-agent'] }
  );
  
  if (success) {
    res.json({ token: generateToken(username) });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

app.post('/api/logout', (req, res) => {
  auditLogger.logLogout(
    req.user.id,
    getClientIP(req)
  );
  
  res.json({ success: true });
});
*/

export default auditMiddleware;
