/**
 * 极简限流中间件 - Rate Limiter Lite
 * 
 * @author Axon
 * @version 1.0.0
 */

import { Request, Response, NextFunction } from 'express';

export interface RateLimitOptions {
  windowMs: number;  // 时间窗口 (毫秒)
  max: number;       // 最大请求数
}

interface RequestRecord {
  count: number;
  firstRequest: number;
}

const store = new Map<string, RequestRecord>();

/**
 * 创建简单限流中间件
 */
export function rateLimit(options: RateLimitOptions) {
  const { windowMs, max } = options;

  return function rateLimitMiddleware(req: Request, res: Response, next: NextFunction) {
    const key = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();

    let record = store.get(key);

    // 初始化或重置窗口
    if (!record || now - record.firstRequest > windowMs) {
      record = { count: 1, firstRequest: now };
      store.set(key, record);
      next();
      return;
    }

    // 检查是否超限
    if (record.count >= max) {
      const retryAfter = Math.ceil((record.firstRequest + windowMs - now) / 1000);
      res.set('Retry-After', String(retryAfter));
      res.status(429).json({
        error: 'Too Many Requests',
        message: '请求过于频繁，请稍后再试',
        retryAfter
      });
      return;
    }

    // 增加计数
    record.count++;
    next();
  };
}

/**
 * 清理过期记录 (可选，定期调用)
 */
export function cleanupStore(windowMs: number) {
  const now = Date.now();
  for (const [key, record] of store.entries()) {
    if (now - record.firstRequest > windowMs) {
      store.delete(key);
    }
  }
}
