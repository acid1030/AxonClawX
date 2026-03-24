/**
 * Static Files Middleware
 * 
 * 静态文件托管中间件，支持文件服务、目录列表、缓存控制
 * 
 * @author Axon
 * @version 1.0.0
 */

import * as fs from 'fs';
import * as path from 'path';

export interface StaticFilesConfig {
  /** 静态文件根目录 (绝对路径或相对于 process.cwd()) */
  root: string;
  /** 是否启用目录列表 (默认 false) */
  directoryListing?: boolean;
  /** 缓存控制配置 */
  cache?: CacheConfig;
  /** 文件扩展名映射 (自定义 Content-Type) */
  mimeTypes?: Record<string, string>;
  /** 隐藏文件处理 (默认跳过) */
  hiddenFiles?: boolean;
  /** 默认索引文件 (默认 ['index.html', 'index.htm']) */
  index?: string[];
  /** 是否启用 gzip 预压缩文件 (查找 .gz 后缀) */
  gzip?: boolean;
  /** 路径前缀 (如 '/static'，默认 '/') */
  prefix?: string;
}

export interface CacheConfig {
  /** 是否启用缓存 (默认 true) */
  enabled?: boolean;
  /** 缓存时间 (秒)，默认 31536000 (1 年) */
  maxAge?: number;
  /** 是否启用 ETag (默认 true) */
  etag?: boolean;
  /** 是否启用 Last-Modified (默认 true) */
  lastModified?: boolean;
  /** 可变内容 (如 HTML) 使用较短缓存时间 (秒)，默认 0 */
  immutableMaxAge?: number;
  /** 可变文件扩展名 (默认 ['.html', '.htm']) */
  immutableExtensions?: string[];
}

interface FileStats {
  /** 文件路径 */
  filePath: string;
  /** 文件统计信息 */
  stats: fs.Stats;
  /** 相对路径 */
  relativePath: string;
  /** 是否为索引文件 */
  isIndex?: boolean;
}

interface DirectoryEntry {
  /** 文件名 */
  name: string;
  /** 是否为目录 */
  isDirectory: boolean;
  /** 文件大小 (字节) */
  size?: number;
  /** 最后修改时间 */
  modified: Date;
  /** 相对路径 */
  path: string;
}

/**
 * 默认 MIME 类型映射
 */
const DEFAULT_MIME_TYPES: Record<string, string> = {
  // Text
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.htm': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.svg': 'image/svg+xml; charset=utf-8',
  
  // Images
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.bmp': 'image/bmp',
  '.avif': 'image/avif',
  
  // Fonts
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.eot': 'application/vnd.ms-fontobject',
  
  // Audio
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.m4a': 'audio/mp4',
  
  // Video
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.avi': 'video/x-msvideo',
  '.mov': 'video/quicktime',
  
  // Application
  '.pdf': 'application/pdf',
  '.zip': 'application/zip',
  '.wasm': 'application/wasm',
  '.ics': 'text/calendar; charset=utf-8',
};

/**
 * 获取文件的 Content-Type
 */
function getContentType(filePath: string, customMimeTypes?: Record<string, string>): string {
  const ext = path.extname(filePath).toLowerCase();
  const mimeType = customMimeTypes?.[ext] || DEFAULT_MIME_TYPES[ext];
  return mimeType || 'application/octet-stream';
}

/**
 * 解析大小字符串 (如 '1mb', '100kb') 为字节数
 */
function parseSize(size: number | string): number {
  if (typeof size === 'number') {
    return size;
  }

  const matches = size.match(/^(\d+(?:\.\d+)?)\s*(kb|mb|gb)?$/i);
  if (!matches) {
    throw new Error(`Invalid size format: ${size}`);
  }

  const value = parseFloat(matches[1]);
  const unit = (matches[2] || 'b').toLowerCase();

  switch (unit) {
    case 'kb':
      return value * 1024;
    case 'mb':
      return value * 1024 * 1024;
    case 'gb':
      return value * 1024 * 1024 * 1024;
    default:
      return value;
  }
}

/**
 * 格式化文件大小 (用于目录列表)
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${units[i]}`;
}

/**
 * 格式化日期 (用于目录列表)
 */
function formatDate(date: Date): string {
  return date.toISOString().replace('T', ' ').substring(0, 19);
}

/**
 * 生成目录列表 HTML
 */
function generateDirectoryHtml(
  dirPath: string,
  entries: DirectoryEntry[],
  parentPath?: string
): string {
  const parentLink = parentPath 
    ? `<li><a href="${parentPath}">📁 ..</a></li>` 
    : '';
  
  const items = entries
    .sort((a, b) => {
      // 目录优先
      if (a.isDirectory && !b.isDirectory) return -1;
      if (!a.isDirectory && b.isDirectory) return 1;
      // 按名称排序
      return a.name.localeCompare(b.name);
    })
    .map(entry => {
      const icon = entry.isDirectory ? '📁' : '📄';
      const sizeInfo = entry.isDirectory ? '' : ` <span class="size">(${formatFileSize(entry.size!)})</span>`;
      const dateInfo = ` <span class="date">${formatDate(entry.modified)}</span>`;
      
      return `<li><a href="${entry.path}">${icon} ${entry.name}</a>${sizeInfo}${dateInfo}</li>`;
    })
    .join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Index of ${dirPath}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      max-width: 1200px;
      margin: 40px auto;
      padding: 0 20px;
      background: #f5f5f5;
      color: #333;
    }
    h1 {
      font-size: 24px;
      font-weight: 600;
      color: #1a1a1a;
      border-bottom: 2px solid #e0e0e0;
      padding-bottom: 10px;
    }
    ul {
      list-style: none;
      padding: 0;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    }
    li {
      padding: 12px 16px;
      border-bottom: 1px solid #f0f0f0;
      transition: background 0.15s;
    }
    li:last-child {
      border-bottom: none;
    }
    li:hover {
      background: #f9f9f9;
    }
    a {
      color: #0066cc;
      text-decoration: none;
      font-weight: 500;
    }
    a:hover {
      text-decoration: underline;
    }
    .size {
      color: #888;
      font-size: 13px;
      margin-left: 8px;
    }
    .date {
      color: #aaa;
      font-size: 12px;
      margin-left: 12px;
    }
  </style>
</head>
<body>
  <h1>Index of ${dirPath}</h1>
  <ul>
    ${parentLink}
    ${items}
  </ul>
</body>
</html>`;
}

/**
 * 检查路径是否安全 (防止目录遍历攻击)
 */
function isPathSafe(basePath: string, resolvedPath: string): boolean {
  const normalizedBase = path.normalize(basePath);
  const normalizedResolved = path.normalize(resolvedPath);
  return normalizedResolved.startsWith(normalizedBase);
}

/**
 * 生成 ETag
 */
function generateETag(stats: fs.Stats): string {
  const mtime = stats.mtime.getTime().toString(16);
  const size = stats.size.toString(16);
  return `"${mtime}-${size}"`;
}

/**
 * 解析 If-None-Match 头
 */
function parseIfNoneMatch(header: string): string[] {
  if (!header || header === '*') {
    return [];
  }
  
  return header
    .split(',')
    .map(tag => tag.trim().replace(/^"|"$/g, ''))
    .filter(Boolean);
}

/**
 * 解析 If-Modified-Since 头
 */
function parseIfModifiedSince(header: string): Date | null {
  if (!header) {
    return null;
  }
  
  const date = new Date(header);
  return isNaN(date.getTime()) ? null : date;
}

/**
 * 检查是否应该返回 304 Not Modified
 */
function shouldReturn304(
  req: any,
  stats: fs.Stats,
  etag: string
): boolean {
  // 检查 If-None-Match
  const ifNoneMatch = req.headers['if-none-match'] || req.headers['If-None-Match'];
  if (ifNoneMatch) {
    const etags = parseIfNoneMatch(ifNoneMatch);
    if (etags.includes(etag) || etags.includes('*')) {
      return true;
    }
  }

  // 检查 If-Modified-Since
  const ifModifiedSince = parseIfModifiedSince(
    req.headers['if-modified-since'] || req.headers['If-Modified-Since']
  );
  if (ifModifiedSince && stats.mtime <= ifModifiedSince) {
    return true;
  }

  return false;
}

/**
 * 设置缓存相关响应头
 */
function setCacheHeaders(
  res: any,
  stats: fs.Stats,
  config: CacheConfig,
  isImmutable: boolean
): void {
  if (!config.enabled) {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    return;
  }

  const maxAge = isImmutable ? config.immutableMaxAge : config.maxAge;
  
  // Cache-Control
  const directives = [`public`, `max-age=${maxAge}`];
  if (isImmutable && maxAge > 0) {
    directives.push('immutable');
  }
  res.setHeader('Cache-Control', directives.join(', '));

  // ETag
  if (config.etag) {
    const etag = generateETag(stats);
    res.setHeader('ETag', etag);
  }

  // Last-Modified
  if (config.lastModified) {
    res.setHeader('Last-Modified', stats.mtime.toUTCString());
  }
}

/**
 * 静态文件中间件类
 */
export class StaticFilesMiddleware {
  private config: Required<StaticFilesConfig>;

  constructor(config: StaticFilesConfig) {
    if (!config.root) {
      throw new Error('StaticFilesMiddleware: root directory is required');
    }

    // 解析根目录 (支持相对路径)
    const resolvedRoot = path.isAbsolute(config.root)
      ? config.root
      : path.resolve(process.cwd(), config.root);

    // 验证目录存在
    if (!fs.existsSync(resolvedRoot)) {
      throw new Error(`StaticFilesMiddleware: root directory does not exist: ${resolvedRoot}`);
    }

    const stats = fs.statSync(resolvedRoot);
    if (!stats.isDirectory()) {
      throw new Error(`StaticFilesMiddleware: root is not a directory: ${resolvedRoot}`);
    }

    this.config = {
      root: resolvedRoot,
      directoryListing: config.directoryListing || false,
      cache: {
        enabled: config.cache?.enabled !== false,
        maxAge: config.cache?.maxAge || 31536000, // 1 年
        etag: config.cache?.etag !== false,
        lastModified: config.cache?.lastModified !== false,
        immutableMaxAge: config.cache?.immutableMaxAge || 0,
        immutableExtensions: config.cache?.immutableExtensions || ['.html', '.htm'],
      },
      mimeTypes: config.mimeTypes || {},
      hiddenFiles: config.hiddenFiles || false,
      index: config.index || ['index.html', 'index.htm'],
      gzip: config.gzip || false,
      prefix: config.prefix || '/',
    };
  }

  /**
   * 解析请求路径
   */
  private parseRequestPath(urlPath: string): string | null {
    const { prefix } = this.config;
    
    // 移除前缀
    let relativePath = urlPath;
    if (prefix !== '/' && urlPath.startsWith(prefix)) {
      relativePath = urlPath.slice(prefix.length) || '/';
    }

    // URL 解码
    try {
      relativePath = decodeURIComponent(relativePath);
    } catch {
      return null;
    }

    // 移除查询字符串
    relativePath = relativePath.split('?')[0];

    // 标准化路径
    relativePath = path.normalize(relativePath);

    // 安全检查：防止目录遍历
    if (relativePath.includes('..')) {
      return null;
    }

    return relativePath;
  }

  /**
   * 获取文件信息
   */
  private async getFileStats(requestPath: string): Promise<FileStats | null> {
    const { root, index, hiddenFiles } = this.config;

    // 构建完整路径
    const fullPath = path.join(root, requestPath);

    // 安全检查
    if (!isPathSafe(root, fullPath)) {
      return null;
    }

    // 检查文件/目录是否存在
    let stats: fs.Stats;
    try {
      stats = fs.statSync(fullPath);
    } catch {
      return null;
    }

    // 隐藏文件检查
    const basename = path.basename(fullPath);
    if (!hiddenFiles && basename.startsWith('.')) {
      return null;
    }

    // 如果是目录，查找索引文件
    if (stats.isDirectory()) {
      for (const indexFile of index) {
        const indexPath = path.join(fullPath, indexFile);
        try {
          const indexStats = fs.statSync(indexPath);
          if (indexStats.isFile()) {
            const indexBasename = path.basename(indexPath);
            if (!hiddenFiles && indexBasename.startsWith('.')) {
              continue;
            }
            return {
              filePath: indexPath,
              stats: indexStats,
              relativePath: path.join(requestPath, indexFile),
              isIndex: true,
            };
          }
        } catch {
          continue;
        }
      }

      // 没有找到索引文件
      return null;
    }

    // 是文件
    if (!stats.isFile()) {
      return null;
    }

    return {
      filePath: fullPath,
      stats,
      relativePath: requestPath,
    };
  }

  /**
   * 获取目录列表
   */
  private getDirectoryListing(dirPath: string): DirectoryEntry[] | null {
    const { root, hiddenFiles } = this.config;
    const fullPath = path.join(root, dirPath);

    // 安全检查
    if (!isPathSafe(root, fullPath)) {
      return null;
    }

    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(fullPath, { withFileTypes: true });
    } catch {
      return null;
    }

    const result: DirectoryEntry[] = [];

    for (const entry of entries) {
      // 跳过隐藏文件
      if (!hiddenFiles && entry.name.startsWith('.')) {
        continue;
      }

      const entryPath = path.join(fullPath, entry.name);
      
      // 安全检查
      if (!isPathSafe(root, entryPath)) {
        continue;
      }

      let stats: fs.Stats;
      try {
        stats = fs.statSync(entryPath);
      } catch {
        continue;
      }

      result.push({
        name: entry.name,
        isDirectory: entry.isDirectory(),
        size: stats.isFile() ? stats.size : undefined,
        modified: stats.mtime,
        path: path.posix.join(dirPath, entry.name),
      });
    }

    return result;
  }

  /**
   * 发送文件
   */
  private sendFile(
    req: any,
    res: any,
    fileStats: FileStats
  ): void {
    const { filePath, stats } = fileStats;
    const { cache, gzip } = this.config;

    // 检查 304
    const etag = generateETag(stats);
    if (shouldReturn304(req, stats, etag)) {
      res.statusCode = 304;
      res.end();
      return;
    }

    // 检查是否是不可变文件
    const ext = path.extname(filePath).toLowerCase();
    const isImmutable = cache.immutableExtensions.includes(ext);

    // 设置缓存头
    setCacheHeaders(res, stats, cache, isImmutable);

    // 设置 Content-Type
    const contentType = getContentType(filePath, this.config.mimeTypes);
    res.setHeader('Content-Type', contentType);

    // 设置 Content-Length
    res.setHeader('Content-Length', stats.size.toString());

    // 检查 Accept-Encoding (gzip)
    if (gzip) {
      const acceptEncoding = req.headers['accept-encoding'] || req.headers['Accept-Encoding'] || '';
      if (acceptEncoding.includes('gzip')) {
        const gzPath = `${filePath}.gz`;
        try {
          const gzStats = fs.statSync(gzPath);
          if (gzStats.isFile()) {
            res.setHeader('Content-Encoding', 'gzip');
            res.setHeader('Content-Length', gzStats.size.toString());
            fs.createReadStream(gzPath).pipe(res);
            return;
          }
        } catch {
          // 没有 .gz 文件，使用原文件
        }
      }
    }

    // 发送文件
    fs.createReadStream(filePath).pipe(res);
  }

  /**
   * 发送目录列表
   */
  private sendDirectoryListing(
    req: any,
    res: any,
    dirPath: string
  ): void {
    const entries = this.getDirectoryListing(dirPath);
    
    if (!entries) {
      res.statusCode = 403;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Directory listing not available' }));
      return;
    }

    // 生成 HTML
    const displayPath = dirPath === '/' ? '/' : dirPath;
    const parentPath = dirPath === '/' ? undefined : path.posix.dirname(dirPath);
    const html = generateDirectoryHtml(displayPath, entries, parentPath);

    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    res.end(html);
  }

  /**
   * 中间件处理函数
   */
  public async handle(
    req: any,
    res: any,
    next: (err?: any) => void
  ): Promise<void> {
    try {
      const method = (req.method || 'GET').toUpperCase();
      
      // 仅处理 GET 和 HEAD 请求
      if (method !== 'GET' && method !== 'HEAD') {
        next();
        return;
      }

      // 获取请求路径
      const urlPath = req.url || req.path;
      if (!urlPath) {
        next();
        return;
      }

      // 解析路径
      const requestPath = this.parseRequestPath(urlPath);
      if (requestPath === null) {
        next();
        return;
      }

      // 获取文件信息
      const fileStats = await this.getFileStats(requestPath);

      if (fileStats) {
        // 找到文件
        if (method === 'HEAD') {
          // HEAD 请求：只发送头
          res.statusCode = 200;
          res.setHeader('Content-Type', getContentType(fileStats.filePath, this.config.mimeTypes));
          res.setHeader('Content-Length', fileStats.stats.size.toString());
          res.end();
        } else {
          this.sendFile(req, res, fileStats);
        }
        return;
      }

      // 文件不存在，检查是否启用目录列表
      const dirPath = requestPath;
      const dirFullPath = path.join(this.config.root, dirPath);
      
      if (
        this.config.directoryListing &&
        fs.existsSync(dirFullPath) &&
        fs.statSync(dirFullPath).isDirectory()
      ) {
        this.sendDirectoryListing(req, res, dirPath);
        return;
      }

      // 文件/目录都不存在，交给下一个中间件
      next();
    } catch (error) {
      // 传递错误
      next(error);
    }
  }
}

/**
 * 创建静态文件中间件
 * 
 * @param config 配置
 * @returns Express/Koa 风格的中间件函数
 */
export function createStaticFilesMiddleware(config: StaticFilesConfig) {
  const staticFiles = new StaticFilesMiddleware(config);

  return async (
    req: any,
    res: any,
    next: (err?: any) => void
  ): Promise<void> => {
    await staticFiles.handle(req, res, next);
  };
}

/**
 * 预定义配置模板
 */
export const presets = {
  /** 开发模式：启用目录列表，无缓存 */
  development: (root: string) => ({
    root,
    directoryListing: true,
    cache: {
      enabled: false,
      etag: true,
      lastModified: true,
    },
    hiddenFiles: false,
    gzip: false,
  }) as StaticFilesConfig,

  /** 生产模式：禁用目录列表，强缓存 */
  production: (root: string) => ({
    root,
    directoryListing: false,
    cache: {
      enabled: true,
      maxAge: 31536000, // 1 年
      etag: true,
      lastModified: true,
      immutableMaxAge: 0,
      immutableExtensions: ['.html', '.htm'],
    },
    hiddenFiles: false,
    gzip: true,
  }) as StaticFilesConfig,

  /** SPA 模式：支持前端路由 (所有 404 返回 index.html) */
  spa: (root: string) => ({
    root,
    directoryListing: false,
    cache: {
      enabled: true,
      maxAge: 31536000,
      etag: true,
      lastModified: true,
      immutableMaxAge: 0,
      immutableExtensions: ['.html', '.htm'],
    },
    index: ['index.html'],
    hiddenFiles: false,
    gzip: true,
  }) as StaticFilesConfig,

  /** API 文档模式：短缓存，启用目录列表 */
  docs: (root: string) => ({
    root,
    directoryListing: true,
    cache: {
      enabled: true,
      maxAge: 300, // 5 分钟
      etag: true,
      lastModified: true,
    },
    hiddenFiles: false,
    gzip: true,
  }) as StaticFilesConfig,
};

export default createStaticFilesMiddleware;
