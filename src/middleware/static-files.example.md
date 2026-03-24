# Static Files Middleware - Usage Examples

静态文件托管中间件使用示例

---

## 基础用法

### 1. 最简单的静态文件服务

```typescript
import { createStaticFilesMiddleware } from './middleware/static-files';

// 创建中间件
const staticFiles = createStaticFilesMiddleware({
  root: './public',
});

// 在服务器中使用
app.use(staticFiles);
```

访问 `http://localhost:3000/style.css` → 返回 `./public/style.css`

---

### 2. 带路径前缀

```typescript
const staticFiles = createStaticFilesMiddleware({
  root: './assets',
  prefix: '/static',
});

app.use(staticFiles);
```

访问 `http://localhost:3000/static/images/logo.png` → 返回 `./assets/images/logo.png`

---

### 3. 启用目录列表

```typescript
const staticFiles = createStaticFilesMiddleware({
  root: './downloads',
  directoryListing: true,
});

app.use(staticFiles);
```

访问 `http://localhost:3000/` → 显示目录列表 HTML 页面

---

### 4. 自定义缓存控制

```typescript
const staticFiles = createStaticFilesMiddleware({
  root: './dist',
  cache: {
    enabled: true,
    maxAge: 31536000, // 1 年
    etag: true,
    lastModified: true,
    immutableMaxAge: 0, // HTML 文件不缓存
    immutableExtensions: ['.html', '.htm'],
  },
});

app.use(staticFiles);
```

---

### 5. 自定义 MIME 类型

```typescript
const staticFiles = createStaticFilesMiddleware({
  root: './files',
  mimeTypes: {
    '.custom': 'application/x-custom-type',
    '.wasm': 'application/wasm',
  },
});

app.use(staticFiles);
```

---

### 6. 启用 Gzip 预压缩

```typescript
const staticFiles = createStaticFilesMiddleware({
  root: './public',
  gzip: true,
});

app.use(staticFiles);
```

如果请求 `style.css` 且客户端支持 gzip，会自动查找并发送 `style.css.gz`

---

## 预定义配置模板

### 开发模式

```typescript
import { presets } from './middleware/static-files';

const staticFiles = createStaticFilesMiddleware(
  presets.development('./public')
);
```

**特点:**
- ✅ 启用目录列表
- ❌ 禁用缓存
- ✅ 启用 ETag
- ❌ 禁用 Gzip

---

### 生产模式

```typescript
const staticFiles = createStaticFilesMiddleware(
  presets.production('./dist')
);
```

**特点:**
- ❌ 禁用目录列表
- ✅ 强缓存 (1 年)
- ✅ 启用 ETag
- ✅ 启用 Gzip

---

### SPA 模式 (单页应用)

```typescript
const staticFiles = createStaticFilesMiddleware(
  presets.spa('./dist')
);
```

**特点:**
- ❌ 禁用目录列表
- ✅ 强缓存
- ✅ 支持前端路由 (404 时返回 index.html)
- ✅ 启用 Gzip

---

### API 文档模式

```typescript
const staticFiles = createStaticFilesMiddleware(
  presets.docs('./docs')
);
```

**特点:**
- ✅ 启用目录列表
- ✅ 短缓存 (5 分钟)
- ✅ 启用 Gzip

---

## 完整服务器示例

### Express 风格

```typescript
import { createServer } from 'http';
import { createStaticFilesMiddleware } from './middleware/static-files';

const staticFiles = createStaticFilesMiddleware({
  root: './public',
  prefix: '/assets',
  cache: {
    enabled: true,
    maxAge: 86400, // 1 天
  },
  directoryListing: false,
});

const server = createServer(async (req, res) => {
  await staticFiles(req, res, () => {
    res.statusCode = 404;
    res.end('Not Found');
  });
});

server.listen(3000, () => {
  console.log('Server running at http://localhost:3000');
});
```

---

### Koa 风格

```typescript
import Koa from 'koa';
import { createStaticFilesMiddleware } from './middleware/static-files';

const app = new Koa();

const staticFiles = createStaticFilesMiddleware({
  root: './public',
  cache: {
    enabled: true,
    maxAge: 31536000,
  },
  gzip: true,
});

app.use(staticFiles);

app.listen(3000);
```

---

### Node.js 原生 HTTP

```typescript
import { createServer } from 'http';
import { createStaticFilesMiddleware } from './middleware/static-files';

const staticFiles = createStaticFilesMiddleware({
  root: './static',
  directoryListing: true,
});

const server = createServer((req, res) => {
  staticFiles(req, res, () => {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'text/plain');
    res.end('404 Not Found');
  });
});

server.listen(8080, () => {
  console.log('Server running at http://localhost:8080');
});
```

---

## 高级用法

### 1. 多个静态文件目录

```typescript
const publicFiles = createStaticFilesMiddleware({
  root: './public',
  prefix: '/',
});

const assetsFiles = createStaticFilesMiddleware({
  root: './node_modules/some-package/dist',
  prefix: '/vendor',
});

app.use(publicFiles);
app.use(assetsFiles);
```

---

### 2. 条件缓存控制

```typescript
const staticFiles = createStaticFilesMiddleware({
  root: './dist',
  cache: {
    enabled: true,
    maxAge: 31536000,
    immutableMaxAge: 604800, // 7 天
    immutableExtensions: ['.html', '.htm', '.json'],
  },
});
```

HTML 和 JSON 文件缓存 7 天，其他文件缓存 1 年

---

### 3. 允许隐藏文件

```typescript
const staticFiles = createStaticFilesMiddleware({
  root: './config',
  hiddenFiles: true, // 允许访问 .htaccess, .gitignore 等
});
```

⚠️ **注意:** 生产环境慎用!

---

### 4. 自定义索引文件

```typescript
const staticFiles = createStaticFilesMiddleware({
  root: './site',
  index: ['index.html', 'index.htm', 'default.html'],
});
```

按顺序查找索引文件

---

## 安全特性

### 1. 目录遍历防护

中间件自动阻止 `../` 路径遍历攻击:

```typescript
// 请求 /static/../../../etc/passwd
// → 被拦截，返回 404
```

### 2. 隐藏文件保护

默认不服务以 `.` 开头的文件:

```typescript
// 请求 /.env, /.git/config
// → 返回 404
```

### 3. 路径验证

所有解析后的路径都会验证是否在 root 目录内:

```typescript
// 确保解析后的路径不会跳出 root 目录
```

---

## 性能优化建议

### 1. 生产环境配置

```typescript
const staticFiles = createStaticFilesMiddleware({
  root: './dist',
  cache: {
    enabled: true,
    maxAge: 31536000, // 1 年
    etag: true,
  },
  gzip: true, // 预压缩文件
  directoryListing: false,
});
```

### 2. 使用 CDN

```typescript
// 为静态资源设置 CDN 头
const staticFiles = createStaticFilesMiddleware({
  root: './cdn',
  cache: {
    enabled: true,
    maxAge: 31536000,
  },
});

// 添加额外的 CDN 头
app.use((req, res, next) => {
  if (req.path.startsWith('/cdn/')) {
    res.setHeader('CDN-Cache-Control', 'public, max-age=31536000');
  }
  next();
});
```

### 3. 版本化文件名

```bash
# 构建时使用哈希文件名
style.a1b2c3d4.css
app.e5f6g7h8.js
```

```typescript
// 可以安全地设置长期缓存
const staticFiles = createStaticFilesMiddleware({
  root: './dist',
  cache: {
    enabled: true,
    maxAge: 31536000,
    immutableMaxAge: 31536000, // 所有文件都不可变
    immutableExtensions: ['.css', '.js', '.png', '.jpg'], // 所有扩展名
  },
});
```

---

## API 参考

### StaticFilesConfig

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `root` | `string` | **必填** | 静态文件根目录 |
| `directoryListing` | `boolean` | `false` | 是否启用目录列表 |
| `cache` | `CacheConfig` | - | 缓存控制配置 |
| `mimeTypes` | `Record<string, string>` | - | 自定义 MIME 类型 |
| `hiddenFiles` | `boolean` | `false` | 是否允许隐藏文件 |
| `index` | `string[]` | `['index.html', 'index.htm']` | 默认索引文件 |
| `gzip` | `boolean` | `false` | 是否启用 Gzip 预压缩 |
| `prefix` | `string` | `'/'` | 路径前缀 |

### CacheConfig

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `enabled` | `boolean` | `true` | 是否启用缓存 |
| `maxAge` | `number` | `31536000` | 缓存时间 (秒) |
| `etag` | `boolean` | `true` | 是否启用 ETag |
| `lastModified` | `boolean` | `true` | 是否启用 Last-Modified |
| `immutableMaxAge` | `number` | `0` | 可变文件缓存时间 |
| `immutableExtensions` | `string[]` | `['.html', '.htm']` | 可变文件扩展名 |

---

## 故障排除

### 1. 文件返回 404

**检查项:**
- root 目录路径是否正确
- 文件是否存在
- 路径前缀是否匹配
- 是否是隐藏文件 (默认不允许)

### 2. 缓存不生效

**检查项:**
- `cache.enabled` 是否为 `true`
- 浏览器是否强制刷新 (Ctrl+F5)
- 中间代理是否覆盖缓存头

### 3. 目录列表不显示

**检查项:**
- `directoryListing` 是否为 `true`
- 请求路径是否是目录
- 目录是否有读取权限

---

## 支持的文件类型

默认支持的 MIME 类型:

- **文本:** txt, md, html, htm, css, js, json, xml, svg
- **图片:** jpg, jpeg, png, gif, webp, ico, bmp, avif
- **字体:** woff, woff2, ttf, otf, eot
- **音频:** mp3, wav, ogg, m4a
- **视频:** mp4, webm, avi, mov
- **应用:** pdf, zip, wasm, ics

可通过 `mimeTypes` 配置自定义扩展。
