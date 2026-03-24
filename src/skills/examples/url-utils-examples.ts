/**
 * URL 工具技能使用示例
 * 
 * 本文件展示 url-utils-skill.ts 的各种实际应用场景
 */

import {
  parseURL,
  formatURL,
  buildURL,
  parsePathSegments,
  getQueryParams,
  getQueryParam,
  getQueryParamAsNumber,
  getQueryParamAsBoolean,
  addQueryParams,
  removeQueryParams,
  updateQueryParams,
  serializeQueryParams,
  parseQueryString,
  validateURLSecurity,
  isSafeURL,
  sanitizeURL,
  isDangerousFileType,
  isValidURL,
  isAbsoluteURL,
  resolveURL,
  getDomain,
  getTopLevelDomain,
  isSameOrigin,
  getParentURL,
  URLUtils,
} from './url-utils-skill';

// ==================== 示例 1: URL 解析与构建 ====================

console.log('=== 示例 1: URL 解析与构建 ===\n');

const complexURL = 'https://api.example.com:8080/v1/users/123?include=profile&fields=name,email#section1';

// 解析 URL
const parsed = parseURL(complexURL);
console.log('解析结果:');
console.log('  Protocol:', parsed.protocol);
console.log('  Hostname:', parsed.hostname);
console.log('  Port:', parsed.port);
console.log('  Pathname:', parsed.pathname);
console.log('  Origin:', parsed.origin);
console.log();

// 构建 URL
const builtURL = buildURL(
  'https://api.example.com',
  'v1/users',
  { id: 123, include: 'profile', verbose: true }
);
console.log('构建的 URL:', builtURL);
console.log();

// 解析路径段
const segments = parsePathSegments(complexURL);
console.log('路径段:', segments);
console.log();

// 格式化 URL
const formatted = formatURL(complexURL, {
  removeHash: true,
  removeTrailingSlash: true,
});
console.log('格式化后:', formatted);
console.log();

// ==================== 示例 2: 查询参数处理 ====================

console.log('=== 示例 2: 查询参数处理 ===\n');

const searchURL = 'https://shop.example.com/products?category=electronics&page=2&limit=20&sort=price_desc&in_stock=true';

// 获取所有参数
const allParams = getQueryParams(searchURL);
console.log('所有参数:', allParams);
console.log();

// 获取单个参数
const category = getQueryParam(searchURL, 'category');
console.log('Category:', category);

// 获取数字参数
const page = getQueryParamAsNumber(searchURL, 'page', 1);
console.log('Page:', page);

const limit = getQueryParamAsNumber(searchURL, 'limit', 10);
console.log('Limit:', limit);

// 获取布尔参数
const inStock = getQueryParamAsBoolean(searchURL, 'in_stock');
console.log('In Stock:', inStock);

// 添加参数
const withFilters = addQueryParams(searchURL, {
  min_price: 100,
  max_price: 1000,
  brand: 'Apple',
});
console.log('添加参数后:', withFilters);
console.log();

// 更新参数
const updated = updateQueryParams(searchURL, {
  page: 3,
  sort: 'name_asc',
});
console.log('更新参数后:', updated);
console.log();

// 移除参数
const removed = removeQueryParams(searchURL, 'sort', 'limit');
console.log('移除参数后:', removed);
console.log();

// 序列化参数
const serialized = serializeQueryParams({
  name: 'John Doe',
  age: 30,
  active: true,
  tags: ['admin', 'user'],
});
console.log('序列化:', serialized);
console.log();

// 解析查询字符串
const parsedQS = parseQueryString('foo=bar&baz=qux&num=42');
console.log('解析查询字符串:', parsedQS);
console.log();

// ==================== 示例 3: URL 安全验证 ====================

console.log('=== 示例 3: URL 安全验证 ===\n');

// 测试各种 URL 的安全性
const testURLs = [
  'https://example.com',
  'http://192.168.1.1/admin',
  'http://localhost:3000',
  'javascript:alert("XSS")',
  'file:///etc/passwd',
  'https://10.0.0.1/internal',
  'https://malicious.com/download.exe',
];

testURLs.forEach(url => {
  const safe = isSafeURL(url);
  console.log(`${safe ? '✅' : '❌'} ${url}`);
  
  if (!safe) {
    const validation = validateURLSecurity(url);
    console.log(`   原因：${validation.reason}`);
  }
});
console.log();

// 详细安全检查
console.log('详细安全检查:');
const detailedCheck = validateURLSecurity('https://api.example.com/v1', {
  allowedProtocols: ['http:', 'https:'],
  blockedHosts: ['blocked.com', 'spam.net'],
  allowedHosts: ['example.com', 'api.example.com'],
  blockIPAddresses: true,
  blockLocalhost: true,
  blockInternalNetwork: true,
});
console.log('  安全:', detailedCheck.safe);
if (!detailedCheck.safe) {
  console.log('  原因:', detailedCheck.reason);
}
console.log();

// 清理 URL
const dirtyURL = 'https://example.com/page?redirect=http://evil.com&callback=steal&token=abc123';
const cleaned = sanitizeURL(dirtyURL, {
  removeDangerousParams: true,
  maxLength: 100,
});
console.log('清理前:', dirtyURL);
console.log('清理后:', cleaned);
console.log();

// 检查危险文件类型
const fileURLs = [
  'https://example.com/document.pdf',
  'https://example.com/download.exe',
  'https://example.com/script.js',
  'https://example.com/image.png',
];

console.log('文件类型检查:');
fileURLs.forEach(url => {
  const dangerous = isDangerousFileType(url);
  console.log(`${dangerous ? '⚠️' : '✅'} ${url}`);
});
console.log();

// ==================== 示例 4: 实用工具函数 ====================

console.log('=== 示例 4: 实用工具函数 ===\n');

// 验证 URL 格式
console.log('URL 格式验证:');
console.log('  https://example.com:', isValidURL('https://example.com'));
console.log('  not-a-url:', isValidURL('not-a-url'));
console.log('  /relative/path:', isValidURL('/relative/path'));
console.log();

// 绝对/相对 URL 判断
console.log('绝对/相对 URL:');
console.log('  https://example.com:', isAbsoluteURL('https://example.com') ? '绝对' : '相对');
console.log('  /path/to/resource:', isAbsoluteURL('/path/to/resource') ? '绝对' : '相对');
console.log('  ../parent:', isAbsoluteURL('../parent') ? '绝对' : '相对');
console.log();

// 相对 URL 转绝对
console.log('相对转绝对:');
console.log('  /api/users + https://example.com/v1:', resolveURL('/api/users', 'https://example.com/v1'));
console.log('  ../sibling + https://example.com/a/b:', resolveURL('../sibling', 'https://example.com/a/b'));
console.log();

// 获取域名
console.log('域名提取:');
console.log('  https://sub.example.com/path:', getDomain('https://sub.example.com/path'));
console.log('  顶级域名:', getTopLevelDomain('https://sub.example.com/path'));
console.log();

// 同源检查
console.log('同源检查:');
console.log('  https://example.com vs https://example.com/path:', 
  isSameOrigin('https://example.com', 'https://example.com/path'));
console.log('  https://example.com vs http://example.com:', 
  isSameOrigin('https://example.com', 'http://example.com'));
console.log('  https://example.com:8080 vs https://example.com:', 
  isSameOrigin('https://example.com:8080', 'https://example.com'));
console.log();

// 获取父路径
console.log('父路径:');
console.log('  https://example.com/a/b/c:', getParentURL('https://example.com/a/b/c'));
console.log('  https://example.com/a/b/c/d/e:', getParentURL('https://example.com/a/b/c/d/e'));
console.log();

// ==================== 示例 5: URLUtils 类使用 ====================

console.log('=== 示例 5: URLUtils 类使用 ===\n');

// 创建 URL 工具实例
const urlUtils = new URLUtils('https://api.example.com/v1/users');

console.log('初始 URL:', urlUtils.toString());
console.log('Protocol:', urlUtils.protocol);
console.log('Hostname:', urlUtils.hostname);
console.log('Pathname:', urlUtils.pathname);
console.log();

// 链式调用
const chained = urlUtils
  .addParams({ page: '1', limit: '20' })
  .addParams({ filter: 'active' })
  .removeParams('filter')
  .toString();

console.log('链式调用后:', chained);
console.log();

// 获取查询参数
console.log('查询参数:', urlUtils.query);
console.log('Page 参数:', urlUtils.getQuery('page'));
console.log('Limit 参数 (数字):', urlUtils.getQueryNumber('limit'));
console.log();

// 安全检查
const security = urlUtils.validateSecurity({
  allowedProtocols: ['http:', 'https:'],
  blockIPAddresses: true,
});
console.log('安全检查:', security.safe ? '通过 ✅' : '失败 ❌');
console.log();

// 静态方法构建
const built = URLUtils
  .build('https://api.example.com', 'v2/posts', { 
    include: 'author,comments',
    page: 1 
  })
  .toString();

console.log('静态构建:', built);
console.log();

// ==================== 示例 6: 实际应用场景 ====================

console.log('=== 示例 6: 实际应用场景 ===\n');

// 场景 1: API 请求构建器
function buildAPIRequest(
  baseUrl: string,
  endpoint: string,
  options: {
    page?: number;
    limit?: number;
    filters?: Record<string, any>;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }
): string {
  const params: Record<string, any> = {};

  if (options.page) params.page = options.page;
  if (options.limit) params.limit = options.limit;
  if (options.sortBy) params.sort = options.sortBy;
  if (options.sortOrder) params.order = options.sortOrder;

  if (options.filters) {
    Object.assign(params, options.filters);
  }

  return buildURL(baseUrl, endpoint, params);
}

const apiRequest = buildAPIRequest('https://api.example.com', 'users', {
  page: 2,
  limit: 50,
  sortBy: 'created_at',
  sortOrder: 'desc',
  filters: {
    status: 'active',
    role: 'admin',
    verified: true,
  },
});
console.log('API 请求 URL:', apiRequest);
console.log();

// 场景 2: 安全重定向处理
function handleRedirect(
  userProvidedURL: string,
  defaultURL: string
): string {
  const validation = validateURLSecurity(userProvidedURL, {
    allowedProtocols: ['http:', 'https:'],
    blockIPAddresses: true,
    blockInternalNetwork: true,
    blockLocalhost: true,
  });

  if (!validation.safe) {
    console.warn(`⚠️  不安全重定向：${validation.reason}`);
    return defaultURL;
  }

  return sanitizeURL(validation.parsed.href, {
    removeDangerousParams: true,
    maxLength: 1024,
  });
}

const redirect1 = handleRedirect('https://example.com/dashboard', 'https://example.com/home');
console.log('安全重定向 1:', redirect1);

const redirect2 = handleRedirect('http://192.168.1.1/admin', 'https://example.com/home');
console.log('安全重定向 2 (被阻止):', redirect2);
console.log();

// 场景 3: UTM 参数提取
function extractUTMParams(url: string) {
  return {
    source: getQueryParam(url, 'utm_source'),
    medium: getQueryParam(url, 'utm_medium'),
    campaign: getQueryParam(url, 'utm_campaign'),
    term: getQueryParam(url, 'utm_term'),
    content: getQueryParam(url, 'utm_content'),
  };
}

const marketingURL = 'https://example.com/landing?utm_source=google&utm_medium=cpc&utm_campaign=spring_sale&utm_term=shoes&utm_content=ad1';
const utm = extractUTMParams(marketingURL);
console.log('UTM 参数:', utm);
console.log();

// 场景 4: 外链白名单验证
function isAllowedExternalLink(url: string, allowedDomains: string[]): boolean {
  if (!isValidURL(url)) return false;

  const validation = validateURLSecurity(url, {
    allowedHosts: allowedDomains,
    allowedProtocols: ['http:', 'https:'],
  });

  return validation.safe;
}

const allowedDomains = ['github.com', 'npmjs.com', 'example.com', 'twitter.com'];
const testLinks = [
  'https://github.com/repo',
  'https://npmjs.com/package/express',
  'https://malicious.com/phishing',
  'javascript:alert(1)',
];

console.log('外链白名单验证:');
testLinks.forEach(link => {
  const allowed = isAllowedExternalLink(link, allowedDomains);
  console.log(`  ${allowed ? '✅' : '❌'} ${link}`);
});
console.log();

console.log('=== 所有示例完成 ===');
