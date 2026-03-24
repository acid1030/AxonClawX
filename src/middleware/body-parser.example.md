# Body Parser Middleware - 使用示例

## 快速开始

### 基础用法

```typescript
import { createBodyParserMiddleware } from './middleware/body-parser';

// 创建中间件 (使用默认配置)
const bodyParser = createBodyParserMiddleware();

// 在 HTTP 服务器中使用
import http from 'http';

const server = http.createServer(async (req, res) => {
  // 执行中间件
  await bodyParser(req, res, () => {
    // 解析完成后访问 req.body
    console.log('Parsed body:', req.body);
    res.end(JSON.stringify({ received: req.body }));
  });
});

server.listen(3000);
```

---

## 配置选项

### JSON 解析配置

```typescript
import { createBodyParserMiddleware } from './middleware/body-parser';

const bodyParser = createBodyParserMiddleware({
  json: {
    limit: '1mb',           // 最大请求体大小 (支持 kb/mb/gb)
    strict: true,           // 严格模式：仅允许对象和数组
    encoding: 'utf-8',      // 字符编码
  },
});
```

### URL-encoded 解析配置

```typescript
const bodyParser = createBodyParserMiddleware({
  urlencoded: {
    limit: '1mb',           // 最大请求体大小
    extended: true,         // 扩展模式：支持嵌套对象
    encoding: 'utf-8',      // 字符编码
    arrayLimit: 20,         // 数组长度限制
    depth: 5,               // 嵌套深度限制
    parameterLimit: 1000,   // 参数数量限制
  },
});
```

### 完整配置示例

```typescript
const bodyParser = createBodyParserMiddleware({
  enabled: true,            // 是否启用
  json: {
    limit: '500kb',
    strict: true,
    encoding: 'utf-8',
  },
  urlencoded: {
    limit: '500kb',
    extended: true,
    encoding: 'utf-8',
    arrayLimit: 50,
    depth: 10,
    parameterLimit: 500,
  },
});
```

---

## 预定义配置模板

```typescript
import { createBodyParserMiddleware, presets } from './middleware/body-parser';

// 宽松模式：大尺寸限制，支持深度嵌套
const looseParser = createBodyParserMiddleware(presets.loose);

// 标准模式：默认配置
const standardParser = createBodyParserMiddleware(presets.standard);

// 严格模式：小尺寸限制，严格 JSON 验证
const strictParser = createBodyParserMiddleware(presets.strict);

// API 模式：仅 JSON 解析
const apiParser = createBodyParserMiddleware(presets.api);

// 表单模式：仅 URL-encoded 解析
const formParser = createBodyParserMiddleware(presets.form);
```

---

## 独立中间件

### 仅 JSON 解析

```typescript
import { createJsonMiddleware } from './middleware/body-parser';

const jsonParser = createJsonMiddleware({
  limit: '1mb',
  strict: true,
});

// 使用
app.use(jsonParser);
```

### 仅 URL-encoded 解析

```typescript
import { createUrlEncodedMiddleware } from './middleware/body-parser';

const urlencodedParser = createUrlEncodedMiddleware({
  limit: '1mb',
  extended: true,
});

// 使用
app.use(urlencodedParser);
```

---

## 完整 HTTP 服务器示例

```typescript
import http from 'http';
import { createBodyParserMiddleware } from './middleware/body-parser';

// 创建中间件
const bodyParser = createBodyParserMiddleware({
  json: { limit: '1mb', strict: true },
  urlencoded: { limit: '1mb', extended: true },
});

const server = http.createServer(async (req, res) => {
  // 设置 CORS (可选)
  res.setHeader('Content-Type', 'application/json');

  try {
    // 执行 body parser 中间件
    await bodyParser(req, res, async () => {
      // 路由处理
      if (req.method === 'POST' && req.url === '/api/users') {
        // 访问解析后的请求体
        const { name, email } = req.body;
        
        res.statusCode = 200;
        res.end(JSON.stringify({
          success: true,
          data: { id: 1, name, email },
        }));
        return;
      }

      if (req.method === 'POST' && req.url === '/api/login') {
        const { username, password } = req.body;
        
        // 处理登录逻辑...
        res.statusCode = 200;
        res.end(JSON.stringify({
          success: true,
          token: 'jwt-token-here',
        }));
        return;
      }

      // 404
      res.statusCode = 404;
      res.end(JSON.stringify({ error: 'Not found' }));
    });
  } catch (error) {
    // 错误处理
    if ((error as any).status === 413) {
      res.statusCode = 413;
      res.end(JSON.stringify({ error: 'Request entity too large' }));
    } else if ((error as any).status === 400) {
      res.statusCode = 400;
      res.end(JSON.stringify({ error: 'Invalid request body' }));
    } else {
      res.statusCode = 500;
      res.end(JSON.stringify({ error: 'Internal server error' }));
    }
  }
});

server.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});
```

---

## 测试示例

### 发送 JSON 请求

```bash
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"name":"John","email":"john@example.com"}'
```

### 发送 URL-encoded 请求

```bash
curl -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=john&password=secret123"
```

### 发送嵌套表单数据

```bash
curl -X POST http://localhost:3000/api/data \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "user[name]=John&user[age]=30&tags[]=js&tags[]=ts"
```

---

## 错误处理

### 请求体过大 (413)

```typescript
// 配置限制
const bodyParser = createBodyParserMiddleware({
  json: { limit: '10kb' },  // 超过 10kb 会抛出错误
});

// 错误处理
try {
  await bodyParser(req, res, next);
} catch (error) {
  if ((error as any).status === 413) {
    console.error('Request too large:', (error as any).type);
  }
}
```

### JSON 解析失败 (400)

```typescript
// 发送无效的 JSON 会抛出 400 错误
curl -X POST http://localhost:3000/api \
  -H "Content-Type: application/json" \
  -d '{invalid json}'

// 响应：400 Bad Request
```

### 严格模式限制

```typescript
// 严格模式下，原始值 (字符串/数字) 会被拒绝
const strictParser = createBodyParserMiddleware({
  json: { strict: true },  // 仅允许 {} 或 []
});

// 以下会被拒绝：
// "just a string"
// 123
// null

// 以下允许：
// {"key": "value"}
// [1, 2, 3]
```

---

## 与 Express/Koa 集成

### Express

```typescript
import express from 'express';
import { createBodyParserMiddleware } from './middleware/body-parser';

const app = express();
const bodyParser = createBodyParserMiddleware();

// 作为中间件使用
app.use(bodyParser);

app.post('/api/users', (req, res) => {
  res.json({ received: req.body });
});
```

### Koa

```typescript
import Koa from 'koa';
import { createBodyParserMiddleware } from './middleware/body-parser';

const app = new Koa();
const bodyParser = createBodyParserMiddleware();

app.use(async (ctx, next) => {
  await bodyParser(ctx.req, ctx.res, next);
});

app.use(async (ctx) => {
  ctx.body = { received: ctx.request.body };
});
```

---

## 性能优化建议

1. **合理设置大小限制**：根据实际需求设置 `limit`，避免过大导致内存问题
2. **使用严格模式**：生产环境建议开启 `strict: true` 防止意外数据
3. **限制嵌套深度**：`depth: 5` 通常足够，防止深度嵌套攻击
4. **限制参数数量**：`parameterLimit: 1000` 防止参数洪水攻击
5. **仅启用需要的解析器**：纯 API 服务可以禁用 `urlencoded`

---

## API 参考

### BodyParserConfig

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| enabled | boolean | true | 是否启用解析 |
| json | JSONConfig | - | JSON 解析配置 |
| urlencoded | UrlEncodedConfig | - | URL-encoded 解析配置 |

### JSONConfig

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| limit | number \| string | '100kb' | 最大请求体大小 |
| strict | boolean | true | 严格模式 (仅对象/数组) |
| encoding | string | 'utf-8' | 字符编码 |
| type | function | - | 自定义类型验证 |

### UrlEncodedConfig

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| limit | number \| string | '100kb' | 最大请求体大小 |
| extended | boolean | true | 扩展模式 (支持嵌套) |
| encoding | string | 'utf-8' | 字符编码 |
| arrayLimit | number | 20 | 数组长度限制 |
| depth | number | 5 | 嵌套深度限制 |
| parameterLimit | number | 1000 | 参数数量限制 |

---

**Author:** Axon  
**Version:** 1.0.0
