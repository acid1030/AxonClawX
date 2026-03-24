/**
 * ETag 中间件使用示例 - ETag Middleware Examples
 * 
 * @author Axon
 * @version 1.0.0
 */

import express, { Request, Response } from 'express';
import { etag, generateETag, getETagStats } from './etag';

const app = express();

// ============ 示例 1: 基础用法 ============

/**
 * 最简单的用法 - 全局启用 ETag
 */
app.use(etag());

app.get('/api/users', (req: Request, res: Response) => {
  res.json({
    users: [
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' }
    ]
  });
  // 自动添加 ETag 头部
  // 客户端下次请求时带上 If-None-Match，匹配则返回 304
});

// ============ 示例 2: 自定义配置 ============

/**
 * 使用 SHA256 算法 + 弱验证器 + 最小大小限制
 */
app.use('/api/large', etag({
  algorithm: 'sha256',      // 更安全的哈希算法
  weak: true,                // 使用弱验证器 (W/)
  minSize: 1024,             // 小于 1KB 不生成 ETag
  skipMethods: ['POST', 'PUT', 'DELETE', 'PATCH']
}));

app.get('/api/large/data', (req: Request, res: Response) => {
  res.json({
    data: 'Large dataset...',
    timestamp: Date.now()
  });
});

// ============ 示例 3: 自定义 ETag 生成器 ============

/**
 * 使用业务逻辑生成 ETag (例如基于版本号)
 */
app.use('/api/versioned', etag({
  generator: (body: any) => {
    // 基于版本号生成 ETag
    if (body.version) {
      return `v${body.version}`;
    }
    // 回退到内容哈希
    return generateETag(body, { algorithm: 'md5' });
  }
}));

app.get('/api/versioned/config', (req: Request, res: Response) => {
  res.json({
    version: 42,
    settings: { theme: 'dark', lang: 'zh-CN' }
  });
});

// ============ 示例 4: 路由级别使用 ============

/**
 * 只对特定路由启用 ETag
 */
app.get('/api/cached-resource', etag(), (req: Request, res: Response) => {
  res.json({
    resource: 'This response is cached with ETag',
    generated: new Date().toISOString()
  });
});

app.get('/api/realtime-data', (req: Request, res: Response) => {
  // 不使用 ETag - 实时数据
  res.json({
    data: 'Real-time data, no caching',
    timestamp: Date.now()
  });
});

// ============ 示例 5: 条件过滤 ============

/**
 * 根据请求条件动态决定是否使用 ETag
 */
app.use(etag({
  filter: (req, res) => {
    // 管理员请求不缓存
    if (req.headers['x-admin'] === 'true') {
      return true; // 跳过 ETag
    }
    // 强制刷新不缓存
    if (req.query.refresh === 'true') {
      return true; // 跳过 ETag
    }
    return false; // 使用 ETag
  }
}));

app.get('/api/admin/data', (req: Request, res: Response) => {
  res.json({
    adminData: 'Sensitive data, no caching for admins'
  });
});

// ============ 示例 6: 静态文件 ETag ============

/**
 * 为静态文件生成 ETag
 */
app.get('/static/*', etag({ algorithm: 'sha256' }), (req: Request, res: Response) => {
  // 模拟静态文件内容
  const fileContent = 'Static file content...';
  res.type('text/plain').send(fileContent);
});

// ============ 示例 7: 监控统计 ============

/**
 * 查看 ETag 统计信息
 */
app.get('/api/etag-stats', (req: Request, res: Response) => {
  const stats = getETagStats();
  const hitRate = stats.validated / (stats.validated + stats.failed) * 100;
  
  res.json({
    ...stats,
    hitRate: `${hitRate.toFixed(2)}%`,
    total: stats.validated + stats.failed
  });
});

// ============ 示例 8: 客户端使用示例 ============

/**
 * 客户端如何使用 ETag (伪代码)
 * 
 * // 第一次请求
 * fetch('/api/users')
 *   .then(res => {
 *     const etag = res.headers.get('ETag');
 *     localStorage.setItem('users-etag', etag);
 *     return res.json();
 *   });
 * 
 * // 后续请求
 * const etag = localStorage.getItem('users-etag');
 * fetch('/api/users', {
 *   headers: {
 *     'If-None-Match': etag
 *   }
 * })
 * .then(res => {
 *   if (res.status === 304) {
 *     // 使用缓存数据
 *     console.log('Using cached data');
 *   } else {
 *     // 更新缓存
 *     const newEtag = res.headers.get('ETag');
 *     localStorage.setItem('users-etag', newEtag);
 *     return res.json();
 *   }
 * });
 */

// ============ 启动服务器 ============

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🜏 ETag Server running on port ${PORT}`);
  console.log(`   Test: curl -v http://localhost:${PORT}/api/users`);
  console.log(`   With cache: curl -v -H 'If-None-Match: "abc123"' http://localhost:${PORT}/api/users`);
  console.log(`   Stats: http://localhost:${PORT}/api/etag-stats`);
});

export default app;
