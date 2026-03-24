# ETag 缓存中间件

HTTP 缓存优化中间件，实现 ETag 生成、If-None-Match 验证和 304 Not Modified 响应。

## 功能特性

- ✅ **ETag 生成**: 基于内容哈希 (MD5/SHA1/SHA256) 或自定义生成器
- ✅ **If-None-Match 验证**: 自动解析并验证客户端缓存
- ✅ **304 Not Modified**: 缓存命中时返回 304，节省带宽
- ✅ **灵活配置**: 算法选择、弱验证器、大小限制、方法过滤
- ✅ **统计监控**: 实时跟踪 ETag 生成和缓存命中率

## 快速开始

### 基础用法

```typescript
import { etag } from './middleware/etag';

// 全局启用
app.use(etag());

// 路由级别
app.get('/api/data', etag(), (req, res) => {
  res.json({ data: 'cached response' });
});
```

### 配置选项

```typescript
app.use(etag({
  algorithm: 'sha256',     // 哈希算法：'md5' | 'sha1' | 'sha256'
  weak: true,              // 使用弱验证器 (W/)
  minSize: 1024,           // 最小大小 (字节)，小于此值不生成 ETag
  skipMethods: ['POST'],   // 跳过的 HTTP 方法
  generator: (body) => {   // 自定义 ETag 生成函数
    return `v${body.version}`;
  },
  filter: (req, res) => {  // 自定义过滤函数
    return req.headers['x-no-cache'] === 'true';
  }
}));
```

## API 参考

### `etag(config?: ETagConfig)`

创建 ETag 中间件。

**参数:**
- `config` - 配置对象 (可选)

**配置项:**
| 选项 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `algorithm` | `'md5' \| 'sha1' \| 'sha256'` | `'md5'` | ETag 生成算法 |
| `weak` | `boolean` | `false` | 是否使用弱验证器 |
| `minSize` | `number` | `0` | 最小响应体大小 (字节) |
| `skipMethods` | `string[]` | `['POST','PUT','DELETE','PATCH']` | 跳过的 HTTP 方法 |
| `generator` | `(body: any) => string` | `undefined` | 自定义 ETag 生成函数 |
| `filter` | `(req, res) => boolean` | `undefined` | 自定义过滤函数 |

### `generateETag(content, config?)`

为给定内容生成 ETag。

```typescript
import { generateETag } from './middleware/etag';

const etag = generateETag({ id: 1, name: 'test' });
// 输出："d41d8cd98f00b204e9800998ecf8427e"

const weakEtag = generateETag('content', { weak: true });
// 输出：W/"d41d8cd98f00b204e9800998ecf8427e"
```

### `getETagStats()`

获取 ETag 统计信息。

```typescript
import { getETagStats } from './middleware/etag';

const stats = getETagStats();
// { generated: 100, validated: 75, failed: 25 }
```

### `resetETagStats()`

重置 ETag 统计信息。

## 工作原理

### 1. 响应拦截

中间件拦截 `res.json()` 和 `res.send()` 方法，在发送响应前生成 ETag。

### 2. ETag 生成

```
内容 → 哈希算法 (MD5/SHA1/SHA256) → 格式化 ("hash" 或 W/"hash") → ETag
```

### 3. 缓存验证

```
客户端请求: If-None-Match: "abc123"
           ↓
服务器比较: ETag === If-None-Match ?
           ↓
    匹配 → 304 Not Modified (无响应体)
    不匹配 → 200 OK + 完整响应
```

## 客户端使用示例

### JavaScript (Fetch)

```javascript
// 第一次请求
const response = await fetch('/api/users');
const etag = response.headers.get('ETag');
localStorage.setItem('users-etag', etag);
const data = await response.json();

// 后续请求 (带缓存验证)
const cachedEtag = localStorage.getItem('users-etag');
const response2 = await fetch('/api/users', {
  headers: {
    'If-None-Match': cachedEtag
  }
});

if (response2.status === 304) {
  console.log('使用缓存数据');
  // 使用本地缓存
} else {
  // 更新缓存
  const newEtag = response2.headers.get('ETag');
  localStorage.setItem('users-etag', newEtag);
  const newData = await response2.json();
}
```

### cURL 测试

```bash
# 第一次请求 - 获取 ETag
curl -v http://localhost:3000/api/users
# 响应头：ETag: "d41d8cd98f00b204e9800998ecf8427e"

# 第二次请求 - 带 If-None-Match
curl -v -H 'If-None-Match: "d41d8cd98f00b204e9800998ecf8427e"' http://localhost:3000/api/users
# 响应：HTTP/1.1 304 Not Modified
```

## 最佳实践

### ✅ 推荐

- 对**静态资源**使用 ETag (配置、元数据等)
- 对**不频繁变化**的 API 响应使用 ETag
- 配合 `Cache-Control` 头部使用
- 使用 `sha256` 算法提高安全性

### ❌ 避免

- 对**实时数据**使用 ETag (股票价格、聊天消息等)
- 对**用户特定数据**使用全局 ETag
- 对**小响应**使用 ETag (开销可能超过收益)

## 性能考虑

| 场景 | 建议 |
|------|------|
| 响应 < 1KB | 跳过 ETag (设置 `minSize: 1024`) |
| 高并发 API | 使用 `md5` (更快) |
| 敏感数据 | 使用 `sha256` (更安全) |
| 频繁变化内容 | 使用自定义 `generator` (基于版本号) |

## 相关文件

- 源码：`src/middleware/etag.ts`
- 示例：`src/middleware/etag.example.ts`

---

_Axon · 逻辑化身 · 2026_
