# URL 工具技能 (URL Utils)

强大的 URL 处理工具集，提供解析、构建、查询参数处理和安全验证等功能。

## 📦 安装

无需额外依赖，直接使用：

```typescript
import { URLUtils } from './skills/url-utils-skill';
// 或者按需导入
import { parseURL, getQueryParams, validateURLSecurity } from './skills/url-utils-skill';
```

## 🚀 快速开始

### 1. URL 解析

```typescript
import { parseURL, formatURL, parsePathSegments } from './skills/url-utils-skill';

const url = 'https://example.com:8080/path/to/page?query=value#hash';

// 解析 URL
const parsed = parseURL(url);
console.log(parsed);
// {
//   protocol: 'https:',
//   host: 'example.com:8080',
//   hostname: 'example.com',
//   port: '8080',
//   pathname: '/path/to/page',
//   hash: '#hash',
//   search: '?query=value',
//   origin: 'https://example.com:8080',
//   href: 'https://example.com:8080/path/to/page?query=value#hash'
// }

// 格式化 URL
formatURL(url, { removeHash: true, removeTrailingSlash: true });
// 'https://example.com:8080/path/to/page?query=value'

// 解析路径段
parsePathSegments(url);
// ['path', 'to', 'page']
```

### 2. URL 构建

```typescript
import { buildURL, resolveURL } from './skills/url-utils-skill';

// 构建完整 URL
buildURL('https://api.example.com', 'users/123', { 
  include: 'profile',
  fields: 'name,email'
});
// 'https://api.example.com/users/123?include=profile&fields=name,email'

// 相对 URL 转绝对 URL
resolveURL('/path/to/resource', 'https://example.com/base');
// 'https://example.com/path/to/resource'
```

### 3. 查询参数处理

```typescript
import {
  getQueryParams,
  getQueryParam,
  addQueryParams,
  removeQueryParams,
  updateQueryParams,
  serializeQueryParams,
  parseQueryString
} from './skills/url-utils-skill';

const url = 'https://example.com/search?q=test&page=1&sort=desc';

// 获取所有查询参数
getQueryParams(url);
// { q: 'test', page: '1', sort: 'desc' }

// 获取单个参数
getQueryParam(url, 'q'); // 'test'
getQueryParam(url, 'missing', 'default'); // 'default'

// 获取为数字
getQueryParamAsNumber(url, 'page', 1); // 1

// 获取为布尔值
getQueryParamAsBoolean('https://example.com?active=true', 'active'); // true

// 添加参数
addQueryParams(url, { filter: 'new', limit: 10 });
// 'https://example.com/search?q=test&page=1&sort=desc&filter=new&limit=10'

// 替换参数
updateQueryParams(url, { page: '2', sort: 'asc' });
// 'https://example.com/search?q=test&page=2&sort=asc'

// 移除参数
removeQueryParams(url, 'sort', 'filter');
// 'https://example.com/search?q=test&page=1'

// 序列化对象为查询字符串
serializeQueryParams({ name: 'John', age: 30, active: true });
// 'name=John&age=30&active=true'

// 解析查询字符串
parseQueryString('name=John&age=30');
// { name: 'John', age: '30' }
```

### 4. URL 安全验证

```typescript
import {
  validateURLSecurity,
  isSafeURL,
  sanitizeURL,
  isDangerousFileType
} from './skills/url-utils-skill';

// 基础安全检查
isSafeURL('https://example.com'); // true
isSafeURL('javascript:alert(1)'); // false

// 详细安全检查
const result = validateURLSecurity('https://example.com/path', {
  allowedProtocols: ['http:', 'https:'],
  blockedHosts: ['malicious.com', 'spam.net'],
  blockIPAddresses: true,
  blockLocalhost: true,
  blockInternalNetwork: true,
});

console.log(result.safe); // true/false
console.log(result.reason); // 如果不安全，说明原因

// 只允许特定域名
validateURLSecurity('https://api.example.com/v1', {
  allowedHosts: ['example.com', 'api.example.com']
});

// 清理 URL (移除危险参数)
sanitizeURL('https://example.com?redirect=http://evil.com&callback=steal', {
  removeDangerousParams: true,
  maxLength: 1000
});
// 移除了 redirect 和 callback 参数

// 检查危险文件类型
isDangerousFileType('https://example.com/download.exe'); // true
isDangerousFileType('https://example.com/document.pdf'); // false
```

## 📚 API 参考

### URL 解析 (Parsing)

| 函数 | 描述 | 参数 | 返回值 |
|------|------|------|--------|
| `parseURL(url)` | 解析 URL 为对象 | `url: string\|URL` | `ParsedURL` |
| `formatURL(url, opts)` | 格式化 URL | `url: string\|URL`, `options` | `string` |
| `buildURL(base, path, params)` | 构建 URL | `base: string`, `path?: string`, `params?: object` | `string` |
| `parsePathSegments(url)` | 解析路径段 | `url: string\|URL` | `string[]` |
| `resolveURL(rel, base)` | 相对转绝对 | `rel: string`, `base: string` | `string` |

### 查询参数 (Query Params)

| 函数 | 描述 | 参数 | 返回值 |
|------|------|------|--------|
| `getQueryParams(url)` | 获取所有参数 | `url: string\|URL` | `Record<string,string>` |
| `getQueryParam(url, name, default)` | 获取单个参数 | `url`, `name`, `default?` | `string\|null` |
| `getQueryParamAsNumber(url, name, default)` | 获取数字参数 | `url`, `name`, `default?` | `number\|undefined` |
| `getQueryParamAsBoolean(url, name, default)` | 获取布尔参数 | `url`, `name`, `default?` | `boolean\|undefined` |
| `addQueryParams(url, params, opts)` | 添加参数 | `url`, `params`, `opts?` | `string` |
| `removeQueryParams(url, ...names)` | 移除参数 | `url`, `...names` | `string` |
| `updateQueryParams(url, params)` | 更新参数 | `url`, `params` | `string` |
| `serializeQueryParams(params, opts)` | 序列化为字符串 | `params`, `opts?` | `string` |
| `parseQueryString(str)` | 解析查询字符串 | `str: string` | `Record<string,string>` |

### URL 安全 (Security)

| 函数 | 描述 | 参数 | 返回值 |
|------|------|------|--------|
| `validateURLSecurity(url, opts)` | 详细安全检查 | `url`, `options` | `URLSecurityResult` |
| `isSafeURL(url)` | 快速安全检查 | `url: string` | `boolean` |
| `sanitizeURL(url, opts)` | 清理 URL | `url`, `opts?` | `string` |
| `isDangerousFileType(url)` | 检查危险文件类型 | `url` | `boolean` |

### 工具函数 (Utilities)

| 函数 | 描述 | 参数 | 返回值 |
|------|------|------|--------|
| `isValidURL(url)` | 验证 URL 格式 | `url: string` | `boolean` |
| `isAbsoluteURL(url)` | 是否绝对 URL | `url: string` | `boolean` |
| `isRelativeURL(url)` | 是否相对 URL | `url: string` | `boolean` |
| `getDomain(url)` | 获取域名 | `url` | `string` |
| `getTopLevelDomain(url)` | 获取顶级域名 | `url` | `string` |
| `isSameOrigin(url1, url2)` | 是否同源 | `url1`, `url2` | `boolean` |
| `getParentURL(url)` | 获取父路径 URL | `url` | `string` |

### URLUtils 类

面向对象风格的工具类：

```typescript
import { URLUtils } from './skills/url-utils-skill';

const url = new URLUtils('https://example.com/path?query=value');

// 属性访问
url.protocol;      // 'https:'
url.hostname;      // 'example.com'
url.pathname;      // '/path'
url.query;         // { query: 'value' }

// 链式调用
url
  .addParams({ page: '1' })
  .removeParams('query')
  .toString();
// 'https://example.com/path?page=1'

// 安全检查
url.validateSecurity({ blockIPAddresses: true });
url.isSafe();

// 静态方法
URLUtils.build('https://api.example.com', 'users', { id: 123 });
```

## 💡 实际应用场景

### 场景 1: API 请求构建

```typescript
// 构建带分页和过滤的 API 请求
function buildAPIRequest(baseUrl: string, options: {
  page?: number;
  limit?: number;
  filters?: Record<string, any>;
}) {
  const params: Record<string, any> = {};
  
  if (options.page) params.page = options.page;
  if (options.limit) params.limit = options.limit;
  
  if (options.filters) {
    Object.assign(params, options.filters);
  }
  
  return buildURL(baseUrl, undefined, params);
}

// 使用
const apiURL = buildAPIRequest('https://api.example.com/users', {
  page: 2,
  limit: 20,
  filters: { status: 'active', role: 'admin' }
});
// 'https://api.example.com/users?page=2&limit=20&status=active&role=admin'
```

### 场景 2: 重定向 URL 验证

```typescript
// 安全处理用户提供的重定向 URL
function handleRedirect(userProvidedURL: string, defaultURL: string): string {
  const validation = validateURLSecurity(userProvidedURL, {
    allowedProtocols: ['http:', 'https:'],
    blockIPAddresses: true,
    blockInternalNetwork: true,
  });
  
  if (!validation.safe) {
    console.warn('Unsafe redirect URL:', validation.reason);
    return defaultURL;
  }
  
  // 清理潜在危险参数
  return sanitizeURL(userProvidedURL, {
    removeDangerousParams: true,
    maxLength: 1024
  });
}
```

### 场景 3: 外链白名单验证

```typescript
// 验证外链是否在白名单内
function isAllowedExternalLink(url: string, allowedDomains: string[]): boolean {
  if (!isValidURL(url)) return false;
  
  const validation = validateURLSecurity(url, {
    allowedHosts: allowedDomains,
    allowedProtocols: ['http:', 'https:'],
  });
  
  return validation.safe;
}

// 使用
const allowedDomains = ['github.com', 'npmjs.com', 'example.com'];
isAllowedExternalLink('https://github.com/repo', allowedDomains); // true
isAllowedExternalLink('https://malicious.com/attack', allowedDomains); // false
```

### 场景 4: URL 参数提取与分析

```typescript
// 从营销 URL 提取 UTM 参数
function extractUTMParams(url: string) {
  return {
    source: getQueryParam(url, 'utm_source'),
    medium: getQueryParam(url, 'utm_medium'),
    campaign: getQueryParam(url, 'utm_campaign'),
    term: getQueryParam(url, 'utm_term'),
    content: getQueryParam(url, 'utm_content'),
  };
}

// 使用
const utm = extractUTMParams('https://example.com?utm_source=google&utm_medium=cpc&utm_campaign=spring_sale');
// { source: 'google', medium: 'cpc', campaign: 'spring_sale', term: null, content: null }
```

### 场景 5: 文件下载链接验证

```typescript
// 验证下载链接安全性
function validateDownloadLink(url: string): { safe: boolean; reason?: string } {
  // 检查协议
  const protocolCheck = validateURLSecurity(url, {
    allowedProtocols: ['http:', 'https:'],
  });
  
  if (!protocolCheck.safe) {
    return { safe: false, reason: protocolCheck.reason };
  }
  
  // 检查文件类型
  if (isDangerousFileType(url)) {
    return { 
      safe: false, 
      reason: 'Dangerous file type detected' 
    };
  }
  
  return { safe: true };
}
```

## ⚠️ 注意事项

1. **URL 格式**: 所有函数都要求有效的 URL 格式，无效 URL 会抛出异常或返回错误结果
2. **安全性**: `validateURLSecurity` 不会阻止所有攻击，仅作为第一道防线
3. **编码**: 查询参数会自动进行 URL 编码
4. **不可变性**: 所有函数返回新 URL 字符串，不修改原对象
5. **类型安全**: 所有函数都支持 TypeScript 泛型

## 🔒 安全最佳实践

```typescript
// ✅ 推荐：始终验证用户提供的 URL
function processUserURL(userURL: string) {
  const validation = validateURLSecurity(userURL, {
    allowedProtocols: ['http:', 'https:'],
    blockIPAddresses: true,
    blockInternalNetwork: true,
  });
  
  if (!validation.safe) {
    throw new Error(`Unsafe URL: ${validation.reason}`);
  }
  
  return sanitizeURL(validation.parsed.href);
}

// ❌ 避免：直接使用未经验证的 URL
function badExample(userURL: string) {
  // 危险！可能被用于 SSRF 攻击
  return fetch(userURL);
}
```

## 📝 更多示例

查看完整示例文件：[`examples/url-utils-examples.ts`](./examples/url-utils-examples.ts)

## 📄 许可证

MIT
