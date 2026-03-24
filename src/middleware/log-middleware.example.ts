/**
 * HTTP 请求日志中间件 - 使用示例
 * 
 * @author KAEL (AxonClaw Engineering)
 * @version 1.0.0
 * 
 * 演示如何使用 log-middleware.ts 的各种功能
 */

import express from 'express';
import { 
  httpLogger, 
  loggerPresets, 
  getPerformanceStats, 
  getPerformanceReport,
  resetPerformanceStats,
  type PerformanceStats 
} from './log-middleware';
import { Logger } from '../logger/logger';

const app = express();

// ============================================
// 示例 1: 基础用法 (最简单)
// ============================================
app.use(httpLogger());

// ============================================
// 示例 2: 使用预设配置 (推荐)
// ============================================

// 根据环境选择配置
if (process.env.NODE_ENV === 'production') {
  // 生产环境：简洁格式，启用性能统计
  app.use(loggerPresets.production());
} else {
  // 开发环境：彩色详细输出，记录慢请求
  app.use(loggerPresets.development());
}

// ============================================
// 示例 3: 自定义配置 (完全控制)
// ============================================
const customLogger = new Logger({
  logDir: './logs/http',
  defaultLevel: 'debug',
  consoleOutput: true,
});

app.use('/api', httpLogger({
  logger: customLogger,
  level: 'debug',
  format: 'detailed',
  skipPaths: [
    /^\/health/,
    /^\/metrics/,
    /^\/favicon.ico/,
    /^\/static\//,
  ],
  includeIp: true,
  includeUserAgent: true,
  includeSize: true,
  enableStats: true,
  statsWindowMs: 60000,        // 1 分钟统计窗口
  logSlowRequests: true,
  slowRequestThresholdMs: 500, // 超过 500ms 视为慢请求
}));

// ============================================
// 示例 4: JSON 格式 (适合日志收集系统)
// ============================================
// 适用于 ELK Stack、Splunk、Datadog 等
app.use('/api/v2', loggerPresets.json());

// ============================================
// 示例 5: 静默模式 (只记录错误)
// ============================================
// 适用于高频接口，避免日志爆炸
app.use('/webhook', loggerPresets.silent());

// ============================================
// 示例 6: 性能监控端点
// ============================================

/**
 * 获取性能统计数据 (JSON)
 */
app.get('/admin/performance', (req, res) => {
  const stats = getPerformanceStats();
  
  if (!stats) {
    return res.status(503).json({ 
      error: 'Performance stats not available',
    });
  }
  
  res.json({
    success: true,
    data: stats,
    timestamp: new Date().toISOString(),
  });
});

/**
 * 获取性能统计报告 (ASCII 表格)
 */
app.get('/admin/performance/report', (req, res) => {
  res.type('text/plain');
  res.send(getPerformanceReport());
});

/**
 * 重置性能统计
 */
app.post('/admin/performance/reset', (req, res) => {
  resetPerformanceStats();
  
  res.json({
    success: true,
    message: 'Performance stats reset successfully',
  });
});

/**
 * 性能监控 Dashboard (HTML)
 */
app.get('/admin/performance/dashboard', (req, res) => {
  const stats = getPerformanceStats();
  
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Performance Dashboard</title>
      <meta http-equiv="refresh" content="5">
      <style>
        body { font-family: monospace; background: #1a1a2e; color: #eee; padding: 20px; }
        .stat { margin: 10px 0; padding: 10px; background: #16213e; border-radius: 5px; }
        .label { color: #6366f1; }
        .value { color: #10b981; font-weight: bold; }
        .warning { color: #f59e0b; }
        .error { color: #ef4444; }
      </style>
    </head>
    <body>
      <h1>📊 HTTP Performance Dashboard</h1>
      <p>Auto-refresh: 5 seconds</p>
      
      ${stats ? `
        <div class="stat">
          <span class="label">Total Requests:</span>
          <span class="value">${stats.totalRequests}</span>
        </div>
        
        <div class="stat">
          <span class="label">Avg Response Time:</span>
          <span class="value ${stats.avgResponseTime > 500 ? 'warning' : ''}">${stats.avgResponseTime}ms</span>
        </div>
        
        <div class="stat">
          <span class="label">P95 Response Time:</span>
          <span class="value ${stats.p95ResponseTime > 1000 ? 'warning' : ''}">${stats.p95ResponseTime}ms</span>
        </div>
        
        <div class="stat">
          <span class="label">P99 Response Time:</span>
          <span class="value ${stats.p99ResponseTime > 2000 ? 'error' : ''}">${stats.p99ResponseTime}ms</span>
        </div>
        
        <div class="stat">
          <span class="label">Requests/Second:</span>
          <span class="value">${stats.requestsPerSecond}</span>
        </div>
        
        <div class="stat">
          <span class="label">Status Codes:</span>
          <ul>
            <li>2xx: <span class="value">${stats.statusCodes['2xx']}</span></li>
            <li>3xx: <span class="value">${stats.statusCodes['3xx']}</span></li>
            <li>4xx: <span class="value">${stats.statusCodes['4xx']}</span></li>
            <li>5xx: <span class="value ${stats.statusCodes['5xx'] > 0 ? 'error' : ''}">${stats.statusCodes['5xx']}</span></li>
          </ul>
        </div>
      ` : '<p class="error">Stats not available</p>'}
      
      <div style="margin-top: 20px;">
        <a href="/admin/performance" style="color: #6366f1;">[JSON]</a>
        <a href="/admin/performance/report" style="color: #6366f1; margin-left: 10px;">[Report]</a>
        <a href="/admin/performance/reset" style="color: #ef4444; margin-left: 10px;">[Reset]</a>
      </div>
    </body>
    </html>
  `);
});

// ============================================
// 示例路由
// ============================================

/**
 * 健康检查端点 (会被跳过日志)
 */
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

/**
 * 模拟快速接口
 */
app.get('/api/users', async (req, res) => {
  // 模拟数据库查询
  await new Promise(resolve => setTimeout(resolve, 50));
  
  res.json({ 
    users: [
      { id: 1, name: 'Alice', email: 'alice@example.com' },
      { id: 2, name: 'Bob', email: 'bob@example.com' },
    ],
    total: 2,
  });
});

/**
 * 模拟慢接口 (会触发慢请求警告)
 */
app.get('/api/slow-endpoint', async (req, res) => {
  // 模拟慢查询
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  res.json({ 
    message: 'This is a slow endpoint',
    delay: 1500,
  });
});

/**
 * 模拟错误接口
 */
app.get('/api/error', (req, res) => {
  // 模拟服务器错误
  res.status(500).json({ 
    error: 'Internal Server Error',
    message: 'Something went wrong',
    timestamp: new Date().toISOString(),
  });
});

/**
 * 模拟未找到
 */
app.get('/api/not-found', (req, res) => {
  res.status(404).json({ 
    error: 'Not Found',
    path: req.path,
  });
});

/**
 * Webhook 端点 (使用静默模式)
 */
app.post('/webhook/github', express.json(), (req, res) => {
  // 处理 GitHub webhook
  console.log('Received webhook:', req.headers['x-github-event']);
  
  // 异步处理
  setImmediate(() => {
    // 处理 webhook 逻辑
  });
  
  res.status(200).json({ received: true });
});

// ============================================
// 定时打印性能统计
// ============================================

setInterval(() => {
  const stats = getPerformanceStats();
  if (stats && stats.totalRequests > 0) {
    console.log('\n' + getPerformanceReport());
  }
}, 300000); // 每 5 分钟打印一次

// ============================================
// 启动服务器
// ============================================

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════╗
║  Server running on port ${PORT}                    ║
║  HTTP logging enabled                            ║
║  Performance stats: enabled                      ║
║                                                  ║
║  Endpoints:                                      ║
║  - GET  /health              (health check)      ║
║  - GET  /api/users           (fast endpoint)     ║
║  - GET  /api/slow-endpoint   (slow endpoint)     ║
║  - GET  /api/error           (error endpoint)    ║
║  - POST /webhook/github      (webhook)           ║
║  - GET  /admin/performance   (stats JSON)        ║
║  - GET  /admin/performance/report (stats text)   ║
║  - GET  /admin/performance/dashboard (HTML UI)   ║
╚══════════════════════════════════════════════════╝
  `);
});

/*
 * ============================================
 * 输出示例
 * ============================================
 * 
 * 开发模式 (colored format):
 * 
 * GET /api/users 200 52.34ms
 * POST /api/login 401 8.12ms
 * GET /api/slow-endpoint 200 1502.45ms
 * [WARN] Slow request detected: GET /api/slow-endpoint took 1502.45ms
 * GET /api/error 500 3.21ms
 * 
 * 详细模式 (detailed format):
 * 
 * [req123-abc] GET /api/users | 200 | 52.34ms | IP: 127.0.0.1 | Req: 0B | Res: 256B
 * [req124-def] GET /api/slow-endpoint | 200 | 1502.45ms | IP: 192.168.1.100 | Req: 0B | Res: 64B
 * 
 * 性能统计报告:
 * 
 * ╔══════════════════════════════════════════════════════════╗
 * ║           HTTP Performance Statistics                    ║
 * ╠══════════════════════════════════════════════════════════╣
 * ║  Total Requests:     1245                                 ║
 * ║  Avg Response Time:  45.23                               ms ║
 * ║  Min Response Time:  2.12                                ms ║
 * ║  Max Response Time:  1502.45                             ms ║
 * ║  P95 Response Time:  125.67                              ms ║
 * ║  P99 Response Time:  345.89                              ms ║
 * ║  Requests/Second:    20.75                                ║
 * ╠══════════════════════════════════════════════════════════╣
 * ║  Status Codes:                                            ║
 * ║    2xx: 1198                                              ║
 * ║    3xx: 12                                                ║
 * ║    4xx: 28                                                ║
 * ║    5xx: 7                                                 ║
 * ╚══════════════════════════════════════════════════════════╝
 * 
 * 
 * ============================================
 * 配置选项说明
 * ============================================
 * 
 * interface LogMiddlewareConfig {
 *   logger?: Logger;              // 自定义 Logger 实例 (默认：getLogger())
 *   level?: LogLevel;             // 日志级别：debug | info | warn | error (默认：info)
 *   skipPaths?: RegExp[];         // 跳过日志记录的路径正则数组
 *   includeIp?: boolean;          // 是否包含客户端 IP (默认：true)
 *   includeUserAgent?: boolean;   // 是否包含 User-Agent (默认：false)
 *   includeSize?: boolean;        // 是否包含请求/响应大小 (默认：true)
 *   format?: 'json' | 'simple' | 'detailed' | 'colored'; // 日志格式 (默认：simple)
 *   enableStats?: boolean;        // 是否启用性能统计 (默认：true)
 *   statsWindowMs?: number;       // 性能统计窗口大小 (ms) (默认：60000)
 *   logSlowRequests?: boolean;    // 是否记录慢请求 (默认：true)
 *   slowRequestThresholdMs?: number; // 慢请求阈值 (ms) (默认：1000)
 * }
 * 
 * 
 * ============================================
 * 性能统计 API
 * ============================================
 * 
 * 1. getPerformanceStats(): PerformanceStats | null
 *    获取当前性能统计对象
 * 
 * 2. getPerformanceReport(): string
 *    获取格式化的 ASCII 表格报告
 * 
 * 3. resetPerformanceStats(): void
 *    重置所有性能统计数据
 * 
 * 
 * ============================================
 * 性能统计数据结构
 * ============================================
 * 
 * interface PerformanceStats {
 *   totalRequests: number;      // 总请求数
 *   avgResponseTime: number;    // 平均响应时间 (ms)
 *   maxResponseTime: number;    // 最慢响应时间 (ms)
 *   minResponseTime: number;    // 最快响应时间 (ms)
 *   p95ResponseTime: number;    // P95 响应时间 (ms)
 *   p99ResponseTime: number;    // P99 响应时间 (ms)
 *   requestsPerSecond: number;  // 每秒请求数 (RPS)
 *   statusCodes: {
 *     '2xx': number;            // 成功请求数
 *     '3xx': number;            // 重定向数
 *     '4xx': number;            // 客户端错误数
 *     '5xx': number;            // 服务器错误数
 *   };
 *   windowStart: number;        // 统计窗口起始时间戳
 * }
 * 
 * 
 * ============================================
 * 预设配置说明
 * ============================================
 * 
 * loggerPresets.production()
 *   - 格式：simple
 *   - 级别：info
 *   - 性能统计：启用
 *   - 慢请求阈值：1000ms
 *   - 适用：生产环境
 * 
 * loggerPresets.development()
 *   - 格式：colored
 *   - 级别：debug
 *   - 性能统计：启用
 *   - 慢请求阈值：500ms
 *   - 包含：IP, User-Agent, 请求/响应大小
 *   - 适用：开发环境
 * 
 * loggerPresets.json()
 *   - 格式：json
 *   - 级别：info
 *   - 性能统计：启用
 *   - 包含：所有字段
 *   - 适用：日志收集系统 (ELK/Splunk)
 * 
 * loggerPresets.silent()
 *   - 格式：simple
 *   - 级别：error
 *   - 性能统计：禁用
 *   - 慢请求：禁用
 *   - 适用：高频接口 (webhook、心跳等)
 * 
 * loggerPresets.verbose()
 *   - 格式：detailed
 *   - 级别：debug
 *   - 性能统计：启用
 *   - 慢请求阈值：100ms
 *   - 包含：所有字段
 *   - 适用：调试模式
 */
