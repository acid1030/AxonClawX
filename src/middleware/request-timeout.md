# 请求超时中间件 - Request Timeout Middleware

## 概述

请求超时控制中间件用于防止请求无限期挂起，确保系统资源的合理使用。

## 功能特性

1. **可配置超时时间** - 支持全局/路由级超时配置
2. **超时自动终止** - 超时后自动中断请求处理
3. **友好错误响应** - 返回标准化的超时错误信息 (HTTP 408)

## 安装使用

```typescript
import { requestTimeout, timeoutForRoute, noTimeout } from './middleware/request-timeout';
```

## API 参考

### `requestTimeout(config?)`

创建超时中间件。

**参数:**
- `config.timeout` - 超时时间 (毫秒)，默认 30000ms (30 秒)
- `config.skipPaths` - 跳过超时的路径正则数组
- `config.customMessage` - 自定义错误消息
- `config.continueOnTimeout` - 超时后是否继续处理，默认 false
- `config.logTimeout` - 是否记录超时日志，默认 true

**示例:**
```typescript
// 全局 30 秒超时
app.use(requestTimeout());

// 自定义 60 秒超时
app.use(requestTimeout({ timeout: 60000 }));

// 跳过健康检查
app.use(requestTimeout({
  timeout: 30000,
  skipPaths: [/^\/health/]
}));
```

### `timeoutForRoute(timeout, options?)`

为特定路由创建超时中间件。

**参数:**
- `timeout` - 超时时间 (毫秒)
- `options` - 其他配置选项

**示例:**
```typescript
// 快速操作 - 5 秒超时
app.get('/search', timeoutForRoute(5000), handler);

// 长时操作 - 5 分钟超时
app.post('/import', timeoutForRoute(300000), handler);
```

### `noTimeout()`

创建无超时限制的中间件。

**示例:**
```typescript
// 长时间运行的批处理任务
app.post('/batch-process', noTimeout(), handler);
```

## 响应对象扩展

中间件为 `res` 对象添加了两个方法:

### `res.resetTimeout(newTimeout)`

重置当前请求的超时时间。

**示例:**
```typescript
app.get('/query', requestTimeout({ timeout: 10000 }), (req, res) => {
  // 根据查询复杂度动态调整超时
  if (req.query.complexity === 'high') {
    (res as any).resetTimeout(60000); // 延长到 60 秒
  }
  // ...
});
```

### `res.triggerTimeout()`

手动触发超时。

**示例:**
```typescript
app.post('/conditional', requestTimeout(), (req, res) => {
  if (someCondition) {
    (res as any).triggerTimeout(); // 立即触发超时
  }
});
```

## 错误响应格式

超时后返回 HTTP 408 状态码:

```json
{
  "code": "REQUEST_TIMEOUT",
  "message": "请求超时，请稍后重试",
  "timeout": 30000,
  "timestamp": "2026-03-13T08:29:00.000Z",
  "path": "/api/data",
  "method": "GET"
}
```

## 最佳实践

### 1. 中间件顺序

```typescript
app.use(requestLogger());     // 日志
app.use(rateLimiter());       // 限流
app.use(requestTimeout());    // 超时控制
app.use(errorHandler());      // 错误处理
```

### 2. 路由级超时

```typescript
// 默认超时
app.use(requestTimeout({ timeout: 30000 }));

// 特殊路由覆盖
app.post('/import', timeoutForRoute(300000), importHandler);
app.get('/health', noTimeout(), healthHandler);
```

### 3. 超时时间建议

| 操作类型 | 建议超时 |
|---------|---------|
| 简单查询 | 5-10 秒 |
| 普通 API | 30 秒 |
| 文件上传 | 60-120 秒 |
| 数据导入 | 5-10 分钟 |
| 批处理 | 无限制 (noTimeout) |

### 4. 错误处理

```typescript
import { TimeoutError } from './request-timeout';

app.use((err, req, res, next) => {
  if (err instanceof TimeoutError) {
    // 专门处理超时错误
    res.status(408).json({
      code: 'REQUEST_TIMEOUT',
      message: '请求处理超时'
    });
    return;
  }
  next(err);
});
```

## 注意事项

1. **超时时间设置** - 不要设置过短的超时时间，避免正常请求被误杀
2. **资源清理** - 超时后确保清理数据库连接、文件句柄等资源
3. **客户端超时** - 服务端超时时间应略大于客户端超时时间
4. **异步操作** - 确保异步操作在超时后能够正确终止

## 相关文件

- `request-timeout.ts` - 中间件实现
- `request-timeout.example.ts` - 使用示例
- `error-handler.ts` - 错误处理中间件
