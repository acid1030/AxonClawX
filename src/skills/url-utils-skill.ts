/**
 * URL 工具技能
 * 
 * 功能:
 * 1. URL 解析/格式化
 * 2. 查询参数处理
 * 3. URL 安全验证
 * 
 * @module skills/url-utils
 */

// ==================== URL 解析 ====================

/**
 * URL 解析结果接口
 */
export interface ParsedURL {
  protocol: string;
  host: string;
  hostname: string;
  port?: string;
  pathname: string;
  hash: string;
  search: string;
  origin: string;
  href: string;
}

/**
 * 解析 URL 为结构化对象
 * @param url - URL 字符串或 URL 对象
 * @returns 解析后的 URL 对象
 * @throws Error 当 URL 格式无效时
 */
export function parseURL(url: string | URL): ParsedURL {
  const urlObj = typeof url === 'string' ? new URL(url) : url;
  
  return {
    protocol: urlObj.protocol,
    host: urlObj.host,
    hostname: urlObj.hostname,
    port: urlObj.port || undefined,
    pathname: urlObj.pathname,
    hash: urlObj.hash,
    search: urlObj.search,
    origin: urlObj.origin,
    href: urlObj.href,
  };
}

/**
 * 格式化 URL 对象为字符串
 * @param url - URL 字符串或对象
 * @param options - 格式化选项
 * @returns 格式化后的 URL 字符串
 */
export function formatURL(
  url: string | URL,
  options: {
    removeTrailingSlash?: boolean;
    removeHash?: boolean;
    removeSearch?: boolean;
    normalizeProtocol?: boolean;
  } = {}
): string {
  const urlObj = typeof url === 'string' ? new URL(url) : url;
  const {
    removeTrailingSlash = false,
    removeHash = false,
    removeSearch = false,
    normalizeProtocol = false,
  } = options;

  let result = urlObj.href;

  if (removeHash) {
    result = result.replace(urlObj.hash, '');
  }

  if (removeSearch) {
    result = result.replace(urlObj.search, '');
  }

  if (removeTrailingSlash && result.endsWith('/')) {
    result = result.slice(0, -1);
  }

  if (normalizeProtocol) {
    result = result.replace(/^https?:\/\//, '//');
  }

  return result;
}

/**
 * 构建 URL
 * @param baseUrl - 基础 URL
 * @param path - 路径 (可选)
 * @param params - 查询参数 (可选)
 * @returns 构建后的 URL 字符串
 */
export function buildURL(
  baseUrl: string,
  path?: string,
  params?: Record<string, any>
): string {
  const urlObj = new URL(baseUrl);
  
  if (path) {
    // 确保 path 以 / 开头
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    // 合并 pathname
    urlObj.pathname = urlObj.pathname.replace(/\/$/, '') + normalizedPath;
  }

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        urlObj.searchParams.append(key, String(value));
      }
    });
  }

  return urlObj.href;
}

/**
 * 解析 URL 路径为数组
 * @param url - URL 字符串或对象
 * @returns 路径段数组
 */
export function parsePathSegments(url: string | URL): string[] {
  const urlObj = typeof url === 'string' ? new URL(url) : url;
  return urlObj.pathname
    .split('/')
    .filter(segment => segment.length > 0)
    .map(decodeURIComponent);
}

// ==================== 查询参数处理 ====================

/**
 * 查询参数值类型
 */
export type QueryParamValue = string | number | boolean | null | undefined;

/**
 * 从 URL 提取查询参数为对象
 * @param url - URL 字符串或对象
 * @returns 查询参数对象
 */
export function getQueryParams(url: string | URL): Record<string, string> {
  const urlObj = typeof url === 'string' ? new URL(url) : url;
  const params: Record<string, string> = {};
  
  urlObj.searchParams.forEach((value, key) => {
    params[key] = value;
  });

  return params;
}

/**
 * 获取单个查询参数值
 * @param url - URL 字符串或对象
 * @param paramName - 参数名
 * @param defaultValue - 默认值
 * @returns 参数值或默认值
 */
export function getQueryParam<T extends string = string>(
  url: string | URL,
  paramName: string,
  defaultValue?: T
): string | T | null {
  const urlObj = typeof url === 'string' ? new URL(url) : url;
  const value = urlObj.searchParams.get(paramName);
  return value !== null ? value : (defaultValue ?? null);
}

/**
 * 获取查询参数为数字
 * @param url - URL 字符串或对象
 * @param paramName - 参数名
 * @param defaultValue - 默认值
 * @returns 数字值或默认值
 */
export function getQueryParamAsNumber(
  url: string | URL,
  paramName: string,
  defaultValue?: number
): number | undefined {
  const value = getQueryParam(url, paramName);
  if (value === null) return defaultValue;
  
  const num = Number(value);
  return isNaN(num) ? defaultValue : num;
}

/**
 * 获取查询参数为布尔值
 * @param url - URL 字符串或对象
 * @param paramName - 参数名
 * @param defaultValue - 默认值
 * @returns 布尔值或默认值
 */
export function getQueryParamAsBoolean(
  url: string | URL,
  paramName: string,
  defaultValue?: boolean
): boolean | undefined {
  const value = getQueryParam(url, paramName);
  if (value === null) return defaultValue;
  
  const lower = value.toLowerCase();
  if (['true', '1', 'yes', 'on'].includes(lower)) return true;
  if (['false', '0', 'no', 'off'].includes(lower)) return false;
  
  return defaultValue;
}

/**
 * 添加查询参数到 URL
 * @param url - URL 字符串或对象
 * @param params - 要添加的参数
 * @param options - 选项
 * @returns 新的 URL 字符串
 */
export function addQueryParams(
  url: string | URL,
  params: Record<string, QueryParamValue>,
  options: { replace?: boolean } = {}
): string {
  const urlObj = typeof url === 'string' ? new URL(url) : url;
  const { replace = false } = options;

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null) {
      if (replace) {
        urlObj.searchParams.delete(key);
      }
      return;
    }

    if (replace || !urlObj.searchParams.has(key)) {
      urlObj.searchParams.set(key, String(value));
    } else {
      urlObj.searchParams.append(key, String(value));
    }
  });

  return urlObj.href;
}

/**
 * 从 URL 移除查询参数
 * @param url - URL 字符串或对象
 * @param paramNames - 要移除的参数名 (可多个)
 * @returns 新的 URL 字符串
 */
export function removeQueryParams(
  url: string | URL,
  ...paramNames: string[]
): string {
  const urlObj = typeof url === 'string' ? new URL(url) : url;
  
  paramNames.forEach(name => {
    urlObj.searchParams.delete(name);
  });

  return urlObj.href;
}

/**
 * 更新查询参数
 * @param url - URL 字符串或对象
 * @param params - 要更新的参数
 * @returns 新的 URL 字符串
 */
export function updateQueryParams(
  url: string | URL,
  params: Record<string, QueryParamValue>
): string {
  return addQueryParams(url, params, { replace: true });
}

/**
 * 序列化对象为查询字符串
 * @param params - 参数对象
 * @param options - 序列化选项
 * @returns 查询字符串 (不含 ?)
 */
export function serializeQueryParams(
  params: Record<string, QueryParamValue>,
  options: {
    skipNull?: boolean;
    skipUndefined?: boolean;
    encode?: boolean;
  } = {}
): string {
  const {
    skipNull = true,
    skipUndefined = true,
    encode = true,
  } = options;

  const parts: string[] = [];

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined && skipUndefined) return;
    if (value === null && skipNull) return;

    const encodedKey = encode ? encodeURIComponent(key) : key;
    const encodedValue = encode ? encodeURIComponent(String(value)) : String(value);
    
    parts.push(`${encodedKey}=${encodedValue}`);
  });

  return parts.join('&');
}

/**
 * 解析查询字符串为对象
 * @param queryString - 查询字符串 (可带或不带 ?)
 * @returns 参数对象
 */
export function parseQueryString(queryString: string): Record<string, string> {
  const clean = queryString.startsWith('?') ? queryString.slice(1) : queryString;
  const params: Record<string, string> = {};

  if (!clean) return params;

  clean.split('&').forEach(part => {
    const [key, value = ''] = part.split('=');
    if (key) {
      params[decodeURIComponent(key)] = decodeURIComponent(value);
    }
  });

  return params;
}

// ==================== URL 安全验证 ====================

/**
 * URL 安全验证选项
 */
export interface URLSecurityOptions {
  /** 允许的协议列表，默认 ['http:', 'https:'] */
  allowedProtocols?: string[];
  /** 禁止的主机名列表 */
  blockedHosts?: string[];
  /** 只允许的主机名列表 */
  allowedHosts?: string[];
  /** 是否禁止 IP 地址，默认 false */
  blockIPAddresses?: boolean;
  /** 是否禁止 localhost，默认 false */
  blockLocalhost?: boolean;
  /** 是否禁止内网地址，默认 false */
  blockInternalNetwork?: boolean;
}

/**
 * URL 安全验证结果
 */
export interface URLSecurityResult {
  /** 是否安全 */
  safe: boolean;
  /** 不安全的原因 */
  reason?: string;
  /** 解析后的 URL */
  parsed: ParsedURL;
}

/**
 * 检查是否为 IP 地址
 */
function isIPAddress(hostname: string): boolean {
  // IPv4
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (ipv4Regex.test(hostname)) {
    return true;
  }
  
  // IPv6 (简化检查)
  const ipv6Regex = /^\[?[0-9a-fA-F:]+\]?$/;
  if (ipv6Regex.test(hostname)) {
    return true;
  }

  return false;
}

/**
 * 检查是否为内网地址
 */
function isInternalNetwork(hostname: string): boolean {
  // localhost
  if (hostname === 'localhost' || hostname === 'localhost.localdomain') {
    return true;
  }

  // .local 域名
  if (hostname.endsWith('.local')) {
    return true;
  }

  // 内网 IP 段
  const internalIPPatterns = [
    /^10\./,                          // 10.0.0.0/8
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // 172.16.0.0/12
    /^192\.168\./,                    // 192.168.0.0/16
    /^127\./,                         // 127.0.0.0/8
    /^0\.0\.0\.0/,                    // 0.0.0.0
    /^169\.254\./,                    // 169.254.0.0/16 (link-local)
    /^::1$/,                          // IPv6 localhost
    /^fe80:/,                         // IPv6 link-local
    /^fc00:/,                         // IPv6 unique local
    /^fd00:/,                         // IPv6 unique local
  ];

  return internalIPPatterns.some(pattern => pattern.test(hostname));
}

/**
 * 验证 URL 安全性
 * @param url - URL 字符串或对象
 * @param options - 安全选项
 * @returns 安全验证结果
 */
export function validateURLSecurity(
  url: string | URL,
  options: URLSecurityOptions = {}
): URLSecurityResult {
  const {
    allowedProtocols = ['http:', 'https:'],
    blockedHosts = [],
    allowedHosts,
    blockIPAddresses = false,
    blockLocalhost = false,
    blockInternalNetwork = false,
  } = options;

  let urlObj: URL;
  let parsed: ParsedURL;

  try {
    urlObj = typeof url === 'string' ? new URL(url) : url;
    parsed = parseURL(urlObj);
  } catch (error) {
    return {
      safe: false,
      reason: 'Invalid URL format',
      parsed: {
        protocol: '',
        host: '',
        hostname: '',
        pathname: '',
        hash: '',
        search: '',
        origin: '',
        href: '',
      },
    };
  }

  // 检查协议
  if (!allowedProtocols.includes(parsed.protocol)) {
    return {
      safe: false,
      reason: `Protocol "${parsed.protocol}" is not allowed. Allowed: ${allowedProtocols.join(', ')}`,
      parsed,
    };
  }

  const hostname = parsed.hostname.toLowerCase();

  // 检查禁止的主机
  if (blockedHosts.some(host => hostname === host || hostname.endsWith(`.${host}`))) {
    return {
      safe: false,
      reason: `Host "${hostname}" is blocked`,
      parsed,
    };
  }

  // 检查允许的主机列表
  if (allowedHosts && allowedHosts.length > 0) {
    const isAllowed = allowedHosts.some(
      host => hostname === host || hostname.endsWith(`.${host}`)
    );
    if (!isAllowed) {
      return {
        safe: false,
        reason: `Host "${hostname}" is not in the allowed list`,
        parsed,
      };
    }
  }

  // 检查 IP 地址
  if (blockIPAddresses && isIPAddress(hostname)) {
    return {
      safe: false,
      reason: 'IP addresses are not allowed',
      parsed,
    };
  }

  // 检查 localhost
  if (blockLocalhost && (hostname === 'localhost' || hostname === '127.0.0.1')) {
    return {
      safe: false,
      reason: 'Localhost is not allowed',
      parsed,
    };
  }

  // 检查内网地址
  if (blockInternalNetwork && isInternalNetwork(hostname)) {
    return {
      safe: false,
      reason: 'Internal network addresses are not allowed',
      parsed,
    };
  }

  return {
    safe: true,
    parsed,
  };
}

/**
 * 快速验证 URL 是否为安全的 HTTP/HTTPS URL
 * @param url - URL 字符串
 * @returns 是否安全
 */
export function isSafeURL(url: string): boolean {
  const result = validateURLSecurity(url);
  return result.safe;
}

/**
 * 清理 URL (移除潜在危险参数)
 * @param url - URL 字符串或对象
 * @param options - 清理选项
 * @returns 清理后的 URL 字符串
 */
export function sanitizeURL(
  url: string | URL,
  options: {
    removeDangerousParams?: boolean;
    maxLength?: number;
  } = {}
): string {
  const {
    removeDangerousParams = true,
    maxLength = 2048,
  } = options;

  const urlObj = typeof url === 'string' ? new URL(url) : url;

  // 移除危险参数
  if (removeDangerousParams) {
    const dangerousParams = [
      'callback',
      'jsonp',
      'redirect',
      'redirect_uri',
      'return',
      'returnUrl',
      'return_url',
      'next',
      'continue',
      'dest',
      'destination',
      'redir',
      'redirect_to',
      'goto',
    ];

    dangerousParams.forEach(param => {
      urlObj.searchParams.delete(param);
      urlObj.searchParams.delete(param.toUpperCase());
    });
  }

  let result = urlObj.href;

  // 限制长度
  if (maxLength && result.length > maxLength) {
    result = result.slice(0, maxLength);
  }

  return result;
}

/**
 * 检查 URL 是否指向危险文件类型
 * @param url - URL 字符串或对象
 * @returns 是否危险
 */
export function isDangerousFileType(url: string | URL): boolean {
  const urlObj = typeof url === 'string' ? new URL(url) : url;
  const pathname = urlObj.pathname.toLowerCase();

  const dangerousExtensions = [
    '.exe',
    '.dll',
    '.bat',
    '.cmd',
    '.ps1',
    '.sh',
    '.js',
    '.vbs',
    '.scr',
    '.com',
    '.msi',
    '.jar',
    '.app',
    '.dmg',
    '.pkg',
  ];

  return dangerousExtensions.some(ext => pathname.endsWith(ext));
}

// ==================== 工具函数 ====================

/**
 * 判断是否为有效 URL
 * @param url - 要检查的字符串
 * @returns 是否有效
 */
export function isValidURL(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * 判断是否为绝对 URL
 * @param url - URL 字符串
 * @returns 是否为绝对 URL
 */
export function isAbsoluteURL(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return urlObj.protocol !== '';
  } catch {
    return false;
  }
}

/**
 * 判断是否为相对 URL
 * @param url - URL 字符串
 * @returns 是否为相对 URL
 */
export function isRelativeURL(url: string): boolean {
  return !isAbsoluteURL(url);
}

/**
 * 将相对 URL 转换为绝对 URL
 * @param relativeURL - 相对 URL
 * @param baseURL - 基础 URL
 * @returns 绝对 URL
 */
export function resolveURL(relativeURL: string, baseURL: string): string {
  return new URL(relativeURL, baseURL).href;
}

/**
 * 获取 URL 的域名
 * @param url - URL 字符串或对象
 * @returns 域名
 */
export function getDomain(url: string | URL): string {
  const urlObj = typeof url === 'string' ? new URL(url) : url;
  return urlObj.hostname;
}

/**
 * 获取 URL 的顶级域名
 * @param url - URL 字符串或对象
 * @returns 顶级域名 (例如: example.com)
 */
export function getTopLevelDomain(url: string | URL): string {
  const hostname = getDomain(url);
  const parts = hostname.split('.');
  
  if (parts.length >= 2) {
    return parts.slice(-2).join('.');
  }
  
  return hostname;
}

/**
 * 比较两个 URL 是否同源
 * @param url1 - URL 1
 * @param url2 - URL 2
 * @returns 是否同源
 */
export function isSameOrigin(url1: string | URL, url2: string | URL): boolean {
  const url1Obj = typeof url1 === 'string' ? new URL(url1) : url1;
  const url2Obj = typeof url2 === 'string' ? new URL(url2) : url2;
  
  return (
    url1Obj.protocol === url2Obj.protocol &&
    url1Obj.hostname === url2Obj.hostname &&
    url1Obj.port === url2Obj.port
  );
}

/**
 * 获取 URL 的父路径
 * @param url - URL 字符串或对象
 * @returns 父路径 URL
 */
export function getParentURL(url: string | URL): string {
  const urlObj = typeof url === 'string' ? new URL(url) : url;
  const segments = urlObj.pathname.split('/').filter(s => s.length > 0);
  
  if (segments.length > 0) {
    segments.pop();
    urlObj.pathname = '/' + segments.join('/');
  }
  
  return urlObj.href;
}

// ==================== 导出工具类 ====================

/**
 * URL 工具类 (面向对象风格)
 */
export class URLUtils {
  private url: URL;

  constructor(url: string | URL) {
    this.url = typeof url === 'string' ? new URL(url) : url;
  }

  /**
   * 获取解析后的 URL 对象
   */
  get parsed(): ParsedURL {
    return parseURL(this.url);
  }

  /**
   * 获取协议
   */
  get protocol(): string {
    return this.url.protocol;
  }

  /**
   * 获取主机名
   */
  get hostname(): string {
    return this.url.hostname;
  }

  /**
   * 获取路径名
   */
  get pathname(): string {
    return this.url.pathname;
  }

  /**
   * 获取查询参数对象
   */
  get query(): Record<string, string> {
    return getQueryParams(this.url);
  }

  /**
   * 获取查询参数值
   */
  getQuery(name: string, defaultValue?: string): string | null {
    return getQueryParam(this.url, name, defaultValue);
  }

  /**
   * 获取数字查询参数
   */
  getQueryNumber(name: string, defaultValue?: number): number | undefined {
    return getQueryParamAsNumber(this.url, name, defaultValue);
  }

  /**
   * 获取布尔查询参数
   */
  getQueryBoolean(name: string, defaultValue?: boolean): boolean | undefined {
    return getQueryParamAsBoolean(this.url, name, defaultValue);
  }

  /**
   * 添加查询参数
   */
  addParams(params: Record<string, QueryParamValue>, replace = false): URLUtils {
    this.url = new URL(addQueryParams(this.url, params, { replace }));
    return this;
  }

  /**
   * 移除查询参数
   */
  removeParams(...names: string[]): URLUtils {
    this.url = new URL(removeQueryParams(this.url, ...names));
    return this;
  }

  /**
   * 验证安全性
   */
  validateSecurity(options?: URLSecurityOptions): URLSecurityResult {
    return validateURLSecurity(this.url, options);
  }

  /**
   * 检查是否安全
   */
  isSafe(): boolean {
    return isSafeURL(this.url.href);
  }

  /**
   * 清理 URL
   */
  sanitize(options?: { removeDangerousParams?: boolean; maxLength?: number }): string {
    return sanitizeURL(this.url, options);
  }

  /**
   * 转换为字符串
   */
  toString(): string {
    return this.url.href;
  }

  /**
   * 构建完整 URL
   */
  static build(
    baseUrl: string,
    path?: string,
    params?: Record<string, any>
  ): URLUtils {
    return new URLUtils(buildURL(baseUrl, path, params));
  }
}
