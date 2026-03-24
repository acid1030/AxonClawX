# Request ID 中间件

请求追踪中间件，为每个 HTTP 请求生成唯一标识符，支持日志关联和分布式追踪。

## 功能特性

- ✅ **唯一 Request ID 生成** - 为每个请求生成 32 位唯一标识符
- ✅ **响应头注入** - 自动添加 `X-Request-ID` 响应头
- ✅ **日志关联** - 将所有日志与 Request ID 绑定，便于追踪
- ✅ **客户端 ID 支持** - 优先使用客户端提供的 Request ID
- ✅ **多服务追踪** - 支持自定义前缀，适用于微服务架构
- ✅ **分布式追踪** - 在服务间传递 Request ID

## 快速开始

### 基础用法

```typescript
import express from 'express';
import { requestId, getRequestId } from './middleware/request-id';

const app = express();

// 使用中间件
app.use(requestId());

app.get('/api/status', (req, res) => {
  res.json({ 
    status: 'ok',
    requestId: getRequestId(req)
  });
});

app.listen(3000);
```

### 响应示例

```json
{
  "status": "ok",
  "requestId": "1710345678901A3F8B2C9D4E5F6G7H8I"
}
```

响应头:
```
X-Request-ID: 1710345678901A3F8B2C9D4E5F6G7H8I
```

## 配置选项

```typescript
app.use(requestId({
  includeInResponse: true,    // 是否在响应头中返回 Request ID
  attachToLogs: true,         // 是否将 Request ID 附加到日志
  generator: () => string,    // 自定义 Request ID 生成器
}));
```

## 预设配置

```typescript
import { presets } from './middleware/request-id';

// 生产环境
app.use(presets.production());

// 开发环境
app.use(presets.development());

// 静默模式 (不记录日志)
app.use(presets.silent());

// 带前缀 (多服务追踪)
app.use(presets.withPrefix('API'));
```

## 日志关联

使用 `withRequestId` 将 Request ID 绑定到所有日志:

```typescript
import { requestId, getRequestId, withRequestId } from './middleware/request-id';
import { getLogger } from './logger/logger';

const app = express();
const logger = getLogger();

app.use(requestId());

app.post('/api/data', (req, res) => {
  const requestId = getRequestId(req)!;
  const contextLogger = withRequestId(logger, requestId);
  
  // 所有日志自动包含 Request ID
  contextLogger.info('DATA', 'Processing request');
  contextLogger.info('DATA', 'Validation passed');
  contextLogger.info('DATA', 'Saving to database');
  
  res.json({ success: true, requestId });
});
```

### 日志输出示例

```
[2026-03-13 16:34:00] [INFO] [REQUEST-ID] Request started {
  "requestId": "1710345678901A3F8B2C9D4E5F6G7H8I",
  "method": "POST",
  "path": "/api/data",
  "ip": "127.0.0.1"
}

[2026-03-13 16:34:00] [INFO] [DATA] Processing request {
  "requestId": "1710345678901A3F8B2C9D4E5F6G7H8I"
}

[2026-03-13 16:34:00] [INFO] [DATA] Validation passed {
  "requestId": "1710345678901A3F8B2C9D4E5F6G7H8I"
}

[2026-03-13 16:34:00] [INFO] [REQUEST-ID] Request completed {
  "requestId": "1710345678901A3F8B2C9D4E5F6G7H8I",
  "method": "POST",
  "path": "/api/data",
  "statusCode": 200,
  "duration": "15ms"
}
```

## 分布式追踪

在服务间传递 Request ID:

```typescript
// 服务 A
app.get('/api/process', async (req, res) => {
  const requestId = getRequestId(req)!;
  
  // 调用服务 B 时传递 Request ID
  const response = await fetch('http://service-b:3001/api/process', {
    headers: {
      'X-Request-ID': requestId
    }
  });
  
  res.json({ result: await response.json() });
});

// 服务 B (自动使用客户端提供的 Request ID)
app.use(requestId());
```

## 自定义 Request ID 生成器

```typescript
// 使用 UUID 格式
app.use(requestId({
  generator: () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
}));

// 使用时间戳 + 随机数
app.use(requestId({
  generator: () => `req-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}));

// 使用带前缀的格式
import { generateRequestIdWithPrefix } from './middleware/request-id';

app.use(requestId({
  generator: () => generateRequestIdWithPrefix('AXON')
}));
// 输出：AXON-1710345678901A3F8B2C
```

## API 参考

### 函数

| 函数 | 描述 |
|------|------|
| `requestId(config?)` | 创建 Request ID 中间件 |
| `getRequestId(req)` | 从请求中获取 Request ID |
| `withRequestId(logger, id)` | 为 Logger 添加 Request ID 上下文 |
| `generateRequestId()` | 生成唯一 Request ID |
| `generateRequestIdWithPrefix(prefix)` | 生成带前缀的 Request ID |

### 常量

| 常量 | 值 | 描述 |
|------|-----|------|
| `REQUEST_ID_HEADER` | `'x-request-id'` | Request ID 请求头名称 |
| `REQUEST_ID_LENGTH` | `32` | Request ID 长度 |

### 预设

| 预设 | 描述 |
|------|------|
| `presets.production()` | 生产环境配置 |
| `presets.development()` | 开发环境配置 |
| `presets.silent()` | 静默模式 (不记录日志) |
| `presets.withPrefix(prefix)` | 带前缀的配置 |

## 最佳实践

### 1. 中间件顺序

```typescript
// ✅ 正确：Request ID 中间件在最前面
app.use(requestId());      // 第一个
app.use(cors());
app.use(bodyParser());
app.use(logger());

// ❌ 错误：Request ID 在 logger 之后
app.use(logger());         // logger 无法获取 Request ID
app.use(requestId());
```

### 2. 错误处理

```typescript
app.use((err, req, res, next) => {
  const requestId = getRequestId(req);
  
  logger.error('ERROR', err.message, {
    requestId,
    stack: err.stack
  });
  
  res.status(500).json({
    error: 'Internal server error',
    requestId,  // 返回 Request ID 便于追踪
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});
```

### 3. 微服务架构

```typescript
// API Gateway
app.use(presets.withPrefix('GATEWAY'));

// 用户服务
app.use(presets.withPrefix('USER'));

// 订单服务
app.use(presets.withPrefix('ORDER'));

// 支付服务
app.use(presets.withPrefix('PAYMENT'));
```

### 4. 日志查询

通过 Request ID 快速定位问题:

```typescript
// 查询特定请求的所有日志
const logs = logger.query({
  search: '1710345678901A3F8B2C9D4E5F6G7H8I'
});

// 查询特定时间段内包含 Request ID 的日志
const logs = logger.query({
  search: '1710345678901A3F8B2C9D4E5F6G7H8I',
  startTime: '2026-03-13T16:00:00Z',
  endTime: '2026-03-13T17:00:00Z'
});
```

## 完整示例

查看 `request-id.example.ts` 获取完整使用示例，包括:

- 基础用法
- 自定义配置
- 预设配置
- 多服务追踪
- 日志关联
- 分布式追踪
- 自定义生成器
- 测试示例

## 故障排查

### Request ID 未出现在响应头

检查配置:
```typescript
app.use(requestId({ includeInResponse: true }));
```

### 日志中没有 Request ID

检查配置:
```typescript
app.use(requestId({ attachToLogs: true }));
```

确保使用 `withRequestId`:
```typescript
const logger = withRequestId(getLogger(), req.requestId!);
```

### Request ID 格式不符合预期

使用自定义生成器:
```typescript
app.use(requestId({
  generator: () => `custom-${Date.now()}`
}));
```

## 相关文件

- `src/middleware/request-id.ts` - 中间件实现
- `src/middleware/request-id.example.ts` - 使用示例
- `src/logger/logger.ts` - 日志系统

---

**Author:** Axon  
**Version:** 1.0.0  
**License:** MIT
