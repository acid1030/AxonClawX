/**
 * ETag 缓存中间件 - ETag Cache Middleware
 * 
 * @author Axon
 * @version 1.0.0
 * 
 * 功能:
 * 1. ETag 生成 (基于内容哈希)
 * 2. If-None-Match 验证
 * 3. 304 Not Modified 响应
 */

import { Request, Response, NextFunction } from 'express';
import * as crypto from 'crypto';

// ============ 类型定义 ============

export interface ETagConfig {
  /** ETag 生成算法 ('md5' | 'sha1' | 'sha256')，默认 'md5' */
  algorithm?: 'md5' | 'sha1' | 'sha256';
  /** 是否启用弱验证器 (W/ 前缀)，默认 false */
  weak?: boolean;
  /** 自定义 ETag 生成函数 */
  generator?: (body: any) => string;
  /** 跳过 ETag 的 HTTP 方法，默认 ['POST', 'PUT', 'DELETE', 'PATCH'] */
  skipMethods?: string[];
  /** 最小响应体大小 (字节)，小于此值不生成 ETag，默认 0 */
  minSize?: number;
  /** 自定义过滤函数 */
  filter?: (req: Request, res: Response) => boolean;
}

export interface ETagStats {
  /** 生成的 ETag 数量 */
  generated: number;
  /** 验证成功的数量 (304) */
  validated: number;
  /** 验证失败的数量 (200) */
  failed: number;
}

// ============ 默认配置 ============

const DEFAULT_CONFIG: Required<Omit<ETagConfig, 'generator' | 'filter'>> & {
  generator?: ETagConfig['generator'];
  filter?: ETagConfig['filter'];
} = {
  algorithm: 'md5',
  weak: false,
  skipMethods: ['POST', 'PUT', 'DELETE', 'PATCH'],
  minSize: 0,
  generator: undefined,
  filter: undefined,
};

// ============ 统计信息 ============

let stats: ETagStats = {
  generated: 0,
  validated: 0,
  failed: 0,
};

/**
 * 获取 ETag 统计信息
 */
export function getETagStats(): ETagStats {
  return { ...stats };
}

/**
 * 重置 ETag 统计信息
 */
export function resetETagStats(): void {
  stats = { generated: 0, validated: 0, failed: 0 };
}

// ============ 工具函数 ============

/**
 * 生成 ETag 哈希值
 */
function generateHash(body: string, algorithm: 'md5' | 'sha1' | 'sha256'): string {
  return crypto.createHash(algorithm).update(body).digest('hex');
}

/**
 * 格式化 ETag (添加引号和弱验证器前缀)
 */
function formatETag(hash: string, weak: boolean): string {
  const prefix = weak ? 'W/' : '';
  return `${prefix}"${hash}"`;
}

/**
 * 解析 If-None-Match 头部
 */
function parseIfNoneMatch(header: string | undefined): string[] {
  if (!header) return [];
  
  // 处理 * 通配符
  if (header.trim() === '*') {
    return ['*'];
  }
  
  // 解析逗号分隔的 ETag 列表
  return header
    .split(',')
    .map(etag => etag.trim())
    .filter(etag => etag.length > 0);
}

/**
 * 比较 ETag (支持弱验证)
 */
function compareETag(etag1: string, etag2: string): boolean {
  // 移除弱验证器前缀进行比较
  const clean1 = etag1.replace(/^W\//, '');
  const clean2 = etag2.replace(/^W\//, '');
  
  return clean1 === clean2;
}

/**
 * 检查 If-None-Match 是否匹配
 */
function isMatch(ifNoneMatch: string[], etag: string): boolean {
  // * 通配符匹配任何 ETag
  if (ifNoneMatch.includes('*')) {
    return true;
  }
  
  // 检查是否有任何 ETag 匹配
  return ifNoneMatch.some(clientEtag => compareETag(clientEtag, etag));
}

// ============ 中间件工厂 ============

/**
 * 创建 ETag 中间件
 * 
 * @param config - 配置选项
 * @returns Express 中间件函数
 * 
 * @example
 * ```typescript
 * import { etag } from './middleware/etag';
 * 
 * // 基础用法
 * app.use(etag());
 * 
 * // 自定义配置
 * app.use(etag({
 *   algorithm: 'sha256',
 *   weak: true,
 *   minSize: 1024
 * }));
 * 
 * // 配合路由使用
 * app.get('/api/data', etag(), (req, res) => {
 *   res.json({ data: '...' });
 * });
 * ```
 */
export function etag(config: ETagConfig = {}): (req: Request, res: Response, next: NextFunction) => void {
  const options = { ...DEFAULT_CONFIG, ...config };
  
  return (req: Request, res: Response, next: NextFunction): void => {
    // 检查是否应该跳过
    if (options.skipMethods.includes(req.method)) {
      return next();
    }
    
    if (options.filter && options.filter(req, res)) {
      return next();
    }
    
    // 保存原始的 res.json 和 res.send 方法
    const originalJson = res.json.bind(res);
    const originalSend = res.send.bind(res);
    
    // 拦截 res.json
    res.json = (body: any): Response => {
      // 如果已经发送了响应，直接返回
      if (res.headersSent) {
        return originalJson(body);
      }
      
      const bodyString = JSON.stringify(body);
      
      // 检查最小大小
      if (bodyString.length < options.minSize) {
        return originalJson(body);
      }
      
      // 生成 ETag
      let etagValue: string;
      if (options.generator) {
        etagValue = formatETag(options.generator(body), options.weak);
      } else {
        const hash = generateHash(bodyString, options.algorithm);
        etagValue = formatETag(hash, options.weak);
      }
      
      // 设置 ETag 头部
      res.set('ETag', etagValue);
      stats.generated++;
      
      // 检查 If-None-Match
      const ifNoneMatch = parseIfNoneMatch(req.get('If-None-Match'));
      
      if (ifNoneMatch.length > 0 && isMatch(ifNoneMatch, etagValue)) {
        // ETag 匹配，返回 304
        stats.validated++;
        res.status(304);
        res.removeHeader('Content-Type');
        res.removeHeader('Content-Length');
        return res.send();
      }
      
      // ETag 不匹配，返回完整响应
      stats.failed++;
      return originalJson(body);
    };
    
    // 拦截 res.send (处理字符串响应)
    res.send = (body?: any): Response => {
      // 如果已经发送了响应，直接返回
      if (res.headersSent) {
        return originalSend(body);
      }
      
      // 只对字符串内容生成 ETag
      if (typeof body !== 'string') {
        return originalSend(body);
      }
      
      // 检查最小大小
      if (body.length < options.minSize) {
        return originalSend(body);
      }
      
      // 生成 ETag
      let etagValue: string;
      if (options.generator) {
        etagValue = formatETag(options.generator(body), options.weak);
      } else {
        const hash = generateHash(body, options.algorithm);
        etagValue = formatETag(hash, options.weak);
      }
      
      // 设置 ETag 头部
      res.set('ETag', etagValue);
      stats.generated++;
      
      // 检查 If-None-Match
      const ifNoneMatch = parseIfNoneMatch(req.get('If-None-Match'));
      
      if (ifNoneMatch.length > 0 && isMatch(ifNoneMatch, etagValue)) {
        // ETag 匹配，返回 304
        stats.validated++;
        res.status(304);
        res.removeHeader('Content-Type');
        res.removeHeader('Content-Length');
        return res.send();
      }
      
      // ETag 不匹配，返回完整响应
      stats.failed++;
      return originalSend(body);
    };
    
    next();
  };
}

// ============ 快捷函数 ============

/**
 * 为给定内容生成 ETag
 * 
 * @param content - 内容 (字符串或对象)
 * @param config - 配置选项
 * @returns ETag 值
 */
export function generateETag(content: string | any, config: ETagConfig = {}): string {
  const options = { ...DEFAULT_CONFIG, ...config };
  const contentString = typeof content === 'string' ? content : JSON.stringify(content);
  
  let hash: string;
  if (options.generator) {
    hash = options.generator(content);
  } else {
    hash = generateHash(contentString, options.algorithm);
  }
  
  return formatETag(hash, options.weak);
}

// ============ 导出 ============

export default etag;
