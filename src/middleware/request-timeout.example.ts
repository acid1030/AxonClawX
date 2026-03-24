/**
 * 请求超时中间件使用示例
 * 
 * @author Axon
 * @version 1.0.0
 */

import express, { Request, Response, NextFunction } from 'express';
import { requestTimeout, timeoutForRoute, noTimeout, TimeoutError } from './request-timeout';
import { errorHandler } from './error-handler';

const app = express();

// ============ 示例 1: 全局超时配置 ============

// 所有请求默认 30 秒超时
app.use(requestTimeout());

// ============ 示例 2: 自定义超时时间 ============

// 60 秒超时
app.use(requestTimeout({ timeout: 60000 }));

// ============ 示例 3: 跳过特定路径 ============

// 健康检查接口不设置超时
app.use(requestTimeout({
  timeout: 30000,
  skipPaths: [/^\/health/, /^\/ping/, /^\/metrics/]
}));

// ============ 示例 4: 路由级超时配置 ============

// 快速操作 - 5 秒超时
app.get('/api/search', timeoutForRoute(5000), (req: Request, res: Response) => {
  // 模拟搜索操作
  setTimeout(() => {
    res.json({ results: ['result1', 'result2'] });
  }, 1000);
});

// 长时操作 - 5 分钟超时
app.post('/api/import', timeoutForRoute(300000), (req: Request, res: Response) => {
  // 模拟数据导入
  setTimeout(() => {
    res.json({ imported: 1000, status: 'success' });
  }, 10000);
});

// ============ 示例 5: 禁用超时 ============

// 长时间运行的任务 - 无超时限制
app.post('/api/batch-process', noTimeout(), async (req: Request, res: Response) => {
  // 模拟批处理任务
  try {
    // 可能运行很长时间的批处理
    await new Promise(resolve => setTimeout(resolve, 60000));
    res.json({ processed: true, count: 5000 });
  } catch (error) {
    res.status(500).json({ error: 'Processing failed' });
  }
});

// ============ 示例 6: 动态调整超时 ============

app.get('/api/slow-query', requestTimeout({ timeout: 10000 }), (req: Request, res: Response) => {
  // 根据查询复杂度动态调整超时
  const complexity = req.query.complexity as string;
  
  if (complexity === 'high') {
    // 高复杂度查询 - 延长超时到 60 秒
    (res as any).resetTimeout(60000);
  }
  
  // 模拟查询
  setTimeout(() => {
    res.json({ data: 'query result', complexity });
  }, 5000);
});

// ============ 示例 7: 自定义错误消息 ============

app.use(requestTimeout({
  timeout: 20000,
  customMessage: '服务器响应超时，请检查网络连接或稍后重试',
  logTimeout: true
}));

// ============ 示例 8: 与错误处理中间件配合 ============

// 超时中间件
app.use(requestTimeout({ timeout: 30000 }));

// 路由
app.get('/api/data', (req: Request, res: Response, next: NextFunction) => {
  // 模拟可能超时的操作
  setTimeout(() => {
    try {
      res.json({ data: 'success' });
    } catch (error) {
      next(error);
    }
  }, 35000); // 故意超过 30 秒触发超时
});

// 错误处理中间件 (捕获超时错误)
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof TimeoutError) {
    console.error(`[Timeout Error] ${req.method} ${req.path}`);
    res.status(408).json({
      code: 'REQUEST_TIMEOUT',
      message: '请求处理超时',
      timeout: err.data?.timeout || 30000,
      path: req.path,
      timestamp: new Date().toISOString()
    });
    return;
  }
  
  // 其他错误交给统一错误处理器
  errorHandler(err, req, res, next);
});

// ============ 示例 9: 组合使用多个中间件 ============

import { requestLogger } from './logger';
import { rateLimiter } from './rate-limiter';

// 中间件栈顺序很重要!
app.use(requestLogger());        // 1. 日志记录
app.use(rateLimiter());          // 2. 限流
app.use(requestTimeout());       // 3. 超时控制

app.get('/api/protected', (req: Request, res: Response) => {
  res.json({ message: 'Protected endpoint' });
});

// ============ 示例 10: 手动触发超时 ============

app.post('/api/conditional', requestTimeout({ timeout: 30000 }), (req: Request, res: Response) => {
  const { shouldTimeout } = req.body;
  
  if (shouldTimeout) {
    // 手动触发超时
    (res as any).triggerTimeout();
    return;
  }
  
  res.json({ status: 'completed' });
});

// ============ 启动服务器 ============

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} with timeout middleware`);
});

export default app;
