/**
 * HTTP 请求日志中间件 - 使用示例
 * 
 * @author Axon
 * @version 1.0.0
 */

import express from 'express';
import { requestLogger, httpLogger } from './logger';
import { Logger } from '../logger/logger';

const app = express();

// ============================================
// 示例 1: 基础用法
// ============================================
app.use(requestLogger());

// ============================================
// 示例 2: 自定义配置
// ============================================
app.use('/api', requestLogger({
  level: 'debug',
  format: 'detailed',
  skipPaths: [/^\/health/, /^\/metrics/, /^\/favicon.ico/],
  includeIp: true,
  includeUserAgent: true,
  includeContentLength: true,
}));

// ============================================
// 示例 3: 使用预设配置 (推荐)
// ============================================

// 生产环境 - 简洁格式
if (process.env.NODE_ENV === 'production') {
  app.use(httpLogger.production());
} else {
  // 开发环境 - 详细格式
  app.use(httpLogger.development());
}

// ============================================
// 示例 4: JSON 格式输出 (适合日志收集系统)
// ============================================
// app.use(httpLogger.json());

// ============================================
// 示例 5: 静默模式 (只记录错误)
// ============================================
// app.use(httpLogger.silent());

// ============================================
// 示例 6: 自定义 Logger 实例
// ============================================
const customLogger = new Logger({
  logDir: './custom-logs',
  defaultLevel: 'debug',
  consoleOutput: true,
});

app.use('/admin', requestLogger({
  logger: customLogger,
  level: 'debug',
  format: 'detailed',
}));

// ============================================
// 示例路由
// ============================================

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/users', (req, res) => {
  res.json({ 
    users: [
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' },
    ] 
  });
});

app.post('/api/login', (req, res) => {
  // 模拟登录失败
  res.status(401).json({ 
    error: 'Invalid credentials' 
  });
});

app.get('/api/error', (req, res) => {
  // 模拟服务器错误
  res.status(500).json({ 
    error: 'Something went wrong' 
  });
});

// ============================================
// 启动服务器
// ============================================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log('HTTP request logging enabled');
});

/*
 * ============================================
 * 输出示例
 * ============================================
 * 
 * 开发模式 (detailed format):
 * [2026-03-13 16:23:00] [DEBUG] [HTTP] GET /api/users | 200 | 12.45ms | IP: 127.0.0.1 | Size: 256B | UA: Mozilla/5.0...
 * [2026-03-13 16:23:01] [WARN] [HTTP] POST /api/login | 401 | 5.23ms | IP: 192.168.1.100 | UA: Mozilla/5.0...
 * [2026-03-13 16:23:02] [ERROR] [HTTP] GET /api/error | 500 | 102.34ms | IP: 127.0.0.1 | Size: 45B | UA: Mozilla/5.0...
 * 
 * 生产模式 (simple format):
 * [2026-03-13 16:23:00] [INFO] [HTTP] GET /api/users 200 12.45ms
 * [2026-03-13 16:23:01] [WARN] [HTTP] POST /api/login 401 5.23ms
 * [2026-03-13 16:23:02] [ERROR] [HTTP] GET /api/error 500 102.34ms
 * 
 * JSON 格式:
 * {"method":"GET","path":"/api/users","statusCode":200,"responseTime":12.45,"ip":"127.0.0.1","contentLength":256}
 * 
 * 
 * ============================================
 * 配置选项说明
 * ============================================
 * 
 * interface LoggerMiddlewareConfig {
 *   logger?: Logger;           // 自定义 Logger 实例 (默认使用 getLogger())
 *   level?: LogLevel;          // 日志级别：debug | info | warn | error (默认：info)
 *   skipPaths?: RegExp[];      // 跳过日志记录的路径正则数组
 *   includeIp?: boolean;       // 是否包含客户端 IP (默认：true)
 *   includeUserAgent?: boolean;// 是否包含 User-Agent (默认：false)
 *   includeContentLength?: boolean; // 是否包含响应大小 (默认：true)
 *   format?: 'json' | 'simple' | 'detailed'; // 日志格式 (默认：simple)
 * }
 * 
 * 
 * ============================================
 * 日志级别自动选择
 * ============================================
 * 
 * - 5xx 错误 → error 级别
 * - 4xx 错误 → warn 级别
 * - 其他   → 配置的级别
 * 
 * 这意味着即使配置 level: 'info',500 错误也会被记录为 error 级别。
 */
