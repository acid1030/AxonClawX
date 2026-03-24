/**
 * 审计日志中间件测试
 */

import { AuditLogger, createAuditMiddleware, auditLogger } from './audit-log';
import * as fs from 'fs';
import * as path from 'path';

// 模拟 Express 请求/响应对象
function createMockReq(overrides?: any) {
  return {
    method: 'GET',
    url: '/api/test',
    path: '/api/test',
    headers: {
      'user-agent': 'Mozilla/5.0',
      'x-user-id': 'user-123',
      'x-session-id': 'session-456'
    },
    body: {},
    user: { id: 'user-123' },
    session: { id: 'session-456' },
    ip: '192.168.1.100',
    ...overrides
  };
}

function createMockRes(overrides?: any) {
  const res: any = {
    statusCode: 200,
    locals: {},
    end: jest.fn(),
    ...overrides
  };
  return res;
}

describe('AuditLogger', () => {
  let logger: AuditLogger;
  const testLogPath = './test-logs/audit';

  beforeEach(() => {
    // 清理测试日志目录
    if (fs.existsSync(testLogPath)) {
      fs.rmSync(testLogPath, { recursive: true });
    }

    logger = new AuditLogger({
      logPath: testLogPath,
      enableConsole: false,
      retentionDays: 1
    });
  });

  afterEach(() => {
    // 清理测试日志
    if (fs.existsSync(testLogPath)) {
      fs.rmSync(testLogPath, { recursive: true });
    }
  });

  describe('基础日志记录', () => {
    test('应该记录自定义日志', () => {
      const entry = logger.log({
        level: 'info',
        eventType: 'user_action',
        userId: 'user-123',
        description: '测试操作'
      });

      expect(entry.id).toBeDefined();
      expect(entry.timestamp).toBeDefined();
      expect(entry.level).toBe('info');
      expect(entry.userId).toBe('user-123');
      expect(entry.description).toBe('测试操作');
    });

    test('应该生成唯一 ID', () => {
      const entry1 = logger.log({
        level: 'info',
        eventType: 'system_event',
        description: 'Event 1'
      });

      const entry2 = logger.log({
        level: 'info',
        eventType: 'system_event',
        description: 'Event 2'
      });

      expect(entry1.id).not.toBe(entry2.id);
    });
  });

  describe('敏感数据脱敏', () => {
    test('应该脱敏敏感字段', () => {
      const req = createMockReq({
        body: {
          username: 'admin',
          password: 'secret123',
          token: 'abc123xyz'
        }
      });

      logger.logRequest(req);
      const logs = logger.getRecentLogs(1);
      const log = logs[0];

      expect(log.requestBody?.username).toBe('admin');
      expect(log.requestBody?.password).toBe('[REDACTED]');
      expect(log.requestBody?.token).toBe('[REDACTED]');
    });

    test('应该脱敏嵌套对象中的敏感字段', () => {
      const req = createMockReq({
        body: {
          user: {
            name: 'John',
            password: 'secret'
          },
          auth: {
            token: 'xyz123'
          }
        }
      });

      logger.logRequest(req);
      const logs = logger.getRecentLogs(1);
      const log = logs[0];

      expect(log.requestBody?.user.password).toBe('[REDACTED]');
      expect(log.requestBody?.auth.token).toBe('[REDACTED]');
    });
  });

  describe('请求/响应日志', () => {
    test('应该记录请求开始', () => {
      const req = createMockReq({
        method: 'POST',
        path: '/api/users'
      });

      const requestId = logger.logRequest(req);

      expect(requestId).toBeDefined();
      const logs = logger.getRecentLogs(1);
      const log = logs[0];

      expect(log.eventType).toBe('request');
      expect(log.method).toBe('POST');
      expect(log.path).toBe('/api/users');
    });

    test('应该记录请求结束', () => {
      const req = createMockReq();
      const res = createMockRes({ statusCode: 200 });
      const requestId = logger.logRequest(req);

      logger.logResponse(req, res, 45, requestId);

      const logs = logger.getRecentLogs(2);
      const responseLog = logs[1];

      expect(responseLog.eventType).toBe('response');
      expect(responseLog.statusCode).toBe(200);
      expect(responseLog.duration).toBe(45);
    });

    test('应该记录错误响应', () => {
      const req = createMockReq();
      const res = createMockRes({ statusCode: 500 });
      const requestId = logger.logRequest(req);

      logger.logResponse(req, res, 100, requestId);

      const logs = logger.getRecentLogs(2);
      const responseLog = logs[1];

      expect(responseLog.level).toBe('error');
    });
  });

  describe('用户操作追踪', () => {
    test('应该记录用户登录', () => {
      logger.logLogin('user-123', true, '192.168.1.100');

      const logs = logger.getRecentLogs(1);
      const log = logs[0];

      expect(log.eventType).toBe('user_login');
      expect(log.userId).toBe('user-123');
      expect(log.ip).toBe('192.168.1.100');
    });

    test('应该记录失败登录', () => {
      logger.logLogin('user-123', false, '192.168.1.100');

      const logs = logger.getRecentLogs(1);
      const log = logs[0];

      expect(log.level).toBe('warn');
      expect(log.alertReason).toBe('登录失败');
    });

    test('应该记录用户登出', () => {
      logger.logLogout('user-123', '192.168.1.100');

      const logs = logger.getRecentLogs(1);
      const log = logs[0];

      expect(log.eventType).toBe('user_logout');
    });

    test('应该记录用户操作', () => {
      logger.logUserAction(
        'user-123',
        'create_post',
        '创建新文章',
        { postId: 'post-456' }
      );

      const logs = logger.getRecentLogs(1);
      const log = logs[0];

      expect(log.eventType).toBe('user_action');
      expect(log.metadata?.postId).toBe('post-456');
    });
  });

  describe('数据访问审计', () => {
    test('应该记录数据读取', () => {
      logger.logDataAccess('user-123', 'user', 'user-456', 'read');

      const logs = logger.getRecentLogs(1);
      const log = logs[0];

      expect(log.eventType).toBe('data_access');
      expect(log.metadata?.resourceType).toBe('user');
      expect(log.metadata?.resourceId).toBe('user-456');
    });

    test('应该记录数据修改', () => {
      logger.logDataAccess('user-123', 'user', 'user-456', 'write');

      const logs = logger.getRecentLogs(1);
      const log = logs[0];

      expect(log.eventType).toBe('data_modify');
    });

    test('应该记录数据删除并触发告警', () => {
      logger.logDataAccess('user-123', 'user', 'user-456', 'delete');

      const logs = logger.getRecentLogs(1);
      const log = logs[0];

      expect(log.eventType).toBe('data_delete');
      expect(log.level).toBe('warn');
      expect(log.alertReason).toBe('数据删除操作');
    });
  });

  describe('敏感操作告警', () => {
    test('应该记录配置变更并触发告警', () => {
      logger.logConfigChange(
        'admin-123',
        'max_upload_size',
        10 * 1024 * 1024,
        20 * 1024 * 1024
      );

      const logs = logger.getRecentLogs(1);
      const log = logs[0];

      expect(log.eventType).toBe('config_change');
      expect(log.level).toBe('warn');
      expect(log.alertReason).toBe('系统配置变更');
    });

    test('应该记录权限变更并触发告警', () => {
      logger.logPermissionChange(
        'admin-123',
        'user-456',
        'admin_access',
        true
      );

      const logs = logger.getRecentLogs(1);
      const log = logs[0];

      expect(log.eventType).toBe('permission_change');
      expect(log.level).toBe('alert');
      expect(log.alertReason).toBe('权限变更操作');
    });

    test('应该检测敏感路径并触发告警', () => {
      const req = createMockReq({
        path: '/api/admin/users/123'
      });
      const res = createMockRes({ statusCode: 200 });
      
      logger.logRequest(req);
      logger.logResponse(req, res, 50, 'test-id');

      const logs = logger.getRecentLogs(2);
      const alertLog = logs.find(l => l.level === 'alert');

      expect(alertLog).toBeDefined();
      expect(alertLog?.alertReason).toBe('敏感操作成功执行');
    });
  });

  describe('错误记录', () => {
    test('应该记录错误', () => {
      const error = new Error('Test error');
      const req = createMockReq();

      logger.logError(error, req);

      const logs = logger.getRecentLogs(1);
      const log = logs[0];

      expect(log.level).toBe('error');
      expect(log.eventType).toBe('error');
      expect(log.description).toBe('Test error');
      expect(log.metadata?.stack).toBeDefined();
    });

    test('应该记录不带请求的错误', () => {
      const error = new Error('System error');

      logger.logError(error);

      const logs = logger.getRecentLogs(1);
      const log = logs[0];

      expect(log.level).toBe('error');
      expect(log.description).toBe('System error');
    });
  });

  describe('日志查询', () => {
    test('应该获取最近的日志', () => {
      logger.log({ level: 'info', eventType: 'system_event', description: '1' });
      logger.log({ level: 'info', eventType: 'system_event', description: '2' });
      logger.log({ level: 'info', eventType: 'system_event', description: '3' });

      const logs = logger.getRecentLogs(2);

      expect(logs.length).toBe(2);
      expect(logs[0].description).toBe('2');
      expect(logs[1].description).toBe('3');
    });

    test('应该按事件类型查询', () => {
      logger.log({ level: 'info', eventType: 'user_login', description: 'Login' });
      logger.log({ level: 'info', eventType: 'user_logout', description: 'Logout' });
      logger.log({ level: 'info', eventType: 'user_login', description: 'Login 2' });

      const logs = logger.queryLogs({ eventType: 'user_login' });

      expect(logs.length).toBe(2);
    });

    test('应该按用户 ID 查询', () => {
      logger.log({ level: 'info', eventType: 'user_action', userId: 'user-1' });
      logger.log({ level: 'info', eventType: 'user_action', userId: 'user-2' });
      logger.log({ level: 'info', eventType: 'user_action', userId: 'user-1' });

      const logs = logger.queryLogs({ userId: 'user-1' });

      expect(logs.length).toBe(2);
    });

    test('应该按日志级别查询', () => {
      logger.log({ level: 'info', eventType: 'system_event' });
      logger.log({ level: 'error', eventType: 'error' });
      logger.log({ level: 'alert', eventType: 'security_alert' });

      const logs = logger.queryLogs({ level: 'error' });

      expect(logs.length).toBe(1);
      expect(logs[0].level).toBe('error');
    });

    test('应该按时间范围查询', () => {
      const now = new Date();
      const past = new Date(now.getTime() - 10000);
      const future = new Date(now.getTime() + 10000);

      logger.log({ level: 'info', eventType: 'system_event' });

      const logs = logger.queryLogs({
        startTime: past.toISOString(),
        endTime: future.toISOString()
      });

      expect(logs.length).toBeGreaterThan(0);
    });

    test('应该按敏感性查询', () => {
      logger.log({ level: 'info', eventType: 'system_event', isSensitive: false });
      logger.log({ level: 'warn', eventType: 'data_delete', isSensitive: true });
      logger.log({ level: 'info', eventType: 'user_action', isSensitive: false });

      const sensitiveLogs = logger.queryLogs({ isSensitive: true });

      expect(sensitiveLogs.length).toBe(1);
      expect(sensitiveLogs[0].isSensitive).toBe(true);
    });
  });

  describe('事件发射', () => {
    test('应该发射日志事件', () => {
      const onLog = jest.fn();
      logger.on('log', onLog);

      logger.log({
        level: 'info',
        eventType: 'system_event',
        description: 'Test'
      });

      expect(onLog).toHaveBeenCalled();
      expect(onLog).toHaveBeenCalledWith(expect.objectContaining({
        level: 'info',
        description: 'Test'
      }));
    });

    test('应该发射告警事件', () => {
      const onAlert = jest.fn();
      logger = new AuditLogger({
        logPath: testLogPath,
        enableConsole: false,
        onAlert
      });

      logger.log({
        level: 'alert',
        eventType: 'security_alert',
        description: 'Alert!'
      });

      expect(onAlert).toHaveBeenCalled();
    });
  });

  describe('中间件集成', () => {
    test('应该创建中间件', () => {
      const middleware = createAuditMiddleware({
        logPath: testLogPath,
        enableConsole: false
      });

      expect(typeof middleware).toBe('function');
      expect(typeof middleware.logEvent).toBe('function');
      expect(typeof middleware.getRecentLogs).toBe('function');
      expect(typeof middleware.cleanup).toBe('function');
    });

    test('中间件应该记录请求和响应', () => {
      const middleware = createAuditMiddleware({
        logPath: testLogPath,
        enableConsole: false
      });

      const req = createMockReq();
      const res = createMockRes();
      const next = jest.fn();

      middleware(req as any, res as any, next);

      // 模拟响应结束
      res.end();

      expect(next).toHaveBeenCalled();
      expect(res.end).toHaveBeenCalled();

      const logs = logger.getRecentLogs(2);
      expect(logs.some(l => l.eventType === 'request')).toBe(true);
      expect(logs.some(l => l.eventType === 'response')).toBe(true);
    });
  });

  describe('日志清理', () => {
    test('应该清理旧日志', () => {
      // 创建测试日志文件
      const logFile = path.join(testLogPath, 'audit-2020-01-01.log');
      fs.mkdirSync(testLogPath, { recursive: true });
      fs.writeFileSync(logFile, 'test content');

      // 修改文件时间为 60 天前
      const oldTime = new Date();
      oldTime.setDate(oldTime.getDate() - 60);
      fs.utimesSync(logFile, oldTime, oldTime);

      // 执行清理
      logger.cleanup();

      // 旧日志应该被删除
      expect(fs.existsSync(logFile)).toBe(false);
    });
  });
});

describe('auditLogger 单例', () => {
  test('应该导出单例', () => {
    expect(auditLogger).toBeInstanceOf(AuditLogger);
  });
});
