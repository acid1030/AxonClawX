/**
 * Gzip 压缩响应中间件 - Compression Middleware
 * 
 * @author Axon
 * @version 1.0.0
 * 
 * 功能:
 * 1. Gzip/Deflate 压缩
 * 2. 可配置阈值 (最小压缩大小)
 * 3. 内容类型过滤
 */

import { Request, Response, NextFunction } from 'express';
import * as zlib from 'zlib';

// ============ 类型定义 ============

export type CompressionAlgorithm = 'gzip' | 'deflate' | 'br';

export interface CompressionConfig {
  /** 压缩算法 (默认 gzip) */
  algorithm?: CompressionAlgorithm;
  /** 最小压缩阈值 (字节)，小于此值不压缩 (默认 1024 = 1KB) */
  threshold?: number;
  /** 要压缩的内容类型 (默认压缩常见文本类型) */
  contentTypes?: RegExp[];
  /** 压缩级别 (1-9，默认 6) */
  level?: number;
  /** 是否跳过已压缩的响应 */
  skipIfAlreadyCompressed?: boolean;
  /** 自定义过滤函数 */
  filter?: (req: Request, res: Response) => boolean;
}

export interface CompressionStats {
  /** 原始大小 */
  originalSize: number;
  /** 压缩后大小 */
  compressedSize: number;
  /** 压缩率 */
  ratio: number;
  /** 使用的算法 */
  algorithm: string;
}

// ============ 默认配置 ============

const DEFAULT_CONTENT_TYPES: RegExp[] = [
  /text\//i,
  /application\/json/i,
  /application\/javascript/i,
  /application\/x-javascript/i,
  /application\/xml/i,
  /application\/rss\+xml/i,
  /application\/atom\+xml/i,
  /image\/svg\+xml/i,
  /font\//i,
];

const DEFAULT_CONFIG: Required<Omit<CompressionConfig, 'filter'>> & {
  filter?: CompressionConfig['filter'];
} = {
  algorithm: 'gzip',
  threshold: 1024, // 1KB
  contentTypes: DEFAULT_CONTENT_TYPES,
  level: 6,
  skipIfAlreadyCompressed: true,
  filter: undefined,
};

// ============ 中间件工厂 ============

/**
 * 创建压缩中间件
 * 
 * @param config - 配置选项
 * @returns Express 中间件函数
 * 
 * @example
 * ```typescript
 * import { compression } from './middleware/compression';
 * 
 * // 基础用法
 * app.use(compression());
 * 
 * // 自定义配置
 * app.use(compression({
 *   threshold: 2048, // 2KB 以上才压缩
 *   level: 9, // 最大压缩
 *   contentTypes: [/text\//, /application\/json/]
 * }));
 * ```
 */
export function compression(config: CompressionConfig = {}) {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  return function compressionMiddleware(req: Request, res: Response, next: NextFunction) {
    // 保存原始的 write 和 end 方法
    const originalWrite = res.write;
    const originalEnd = res.end;

    // 临时存储响应数据
    let chunks: Buffer[] = [];
    let totalLength = 0;
    let isCompressed = false;
    let isEnded = false;

    // 检查是否应该压缩
    function shouldCompress(): boolean {
      // 自定义过滤器
      if (cfg.filter && !cfg.filter(req, res)) {
        return false;
      }

      // 检查 Accept-Encoding
      const acceptEncoding = req.headers['accept-encoding'] || '';
      const supportsGzip = acceptEncoding.includes('gzip');
      const supportsDeflate = acceptEncoding.includes('deflate');

      if (!supportsGzip && !supportsDeflate) {
        return false;
      }

      // 检查是否已压缩
      if (cfg.skipIfAlreadyCompressed) {
        const contentEncoding = res.getHeader('Content-Encoding');
        if (contentEncoding) {
          return false;
        }
      }

      // 检查内容类型
      const contentType = res.getHeader('Content-Type') || '';
      const contentTypeStr = Array.isArray(contentType) 
        ? contentType.join(';') 
        : String(contentType);

      if (contentTypeStr && !matchesContentType(contentTypeStr, cfg.contentTypes)) {
        return false;
      }

      return true;
    }

    // 重写 write 方法
    res.write = function (...args: any[]): boolean {
      if (isEnded) {
        return originalWrite.apply(res, args);
      }

      const chunk = args[0];
      if (chunk) {
        const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk));
        chunks.push(buffer);
        totalLength += buffer.length;
      }

      // 如果是最后一个 chunk (没有 callback 或 callback 是最后一个参数)
      // 不立即返回，等待 end 调用
      return true;
    };

    // 重写 end 方法
    res.end = function (...args: any[]): Response {
      if (isEnded) {
        return originalEnd.apply(res, args);
      }

      isEnded = true;

      // 处理最后一个 chunk
      if (args.length > 0 && args[0] !== undefined) {
        const chunk = args[0];
        const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk));
        chunks.push(buffer);
        totalLength += buffer.length;
      }

      // 判断是否压缩
      if (shouldCompress() && totalLength >= cfg.threshold) {
        // 选择压缩算法
        const acceptEncoding = req.headers['accept-encoding'] || '';
        const algorithm = acceptEncoding.includes('gzip') && cfg.algorithm === 'gzip' 
          ? 'gzip' 
          : 'deflate';

        // 合并所有 chunk
        const data = Buffer.concat(chunks, totalLength);

        // 执行压缩
        compressData(data, algorithm, cfg.level, (err, compressed) => {
          if (err || !compressed) {
            // 压缩失败，发送原始数据
            res.removeHeader('Content-Encoding');
            res.setHeader('Content-Length', totalLength.toString());
            chunks.forEach(chunk => originalWrite.call(res, chunk));
            originalEnd.call(res);
            return;
          }

          // 设置压缩头
          res.setHeader('Content-Encoding', algorithm);
          res.setHeader('Content-Length', compressed.length.toString());
          res.setHeader('Vary', 'Accept-Encoding');

          // 记录压缩统计 (可选)
          const stats: CompressionStats = {
            originalSize: totalLength,
            compressedSize: compressed.length,
            ratio: (1 - compressed.length / totalLength) * 100,
            algorithm,
          };
          res.setHeader('X-Compression-Stats', JSON.stringify(stats));

          // 发送压缩数据
          originalWrite.call(res, compressed);
          originalEnd.call(res);
        });
      } else {
        // 不压缩，发送原始数据
        if (totalLength > 0) {
          res.setHeader('Content-Length', totalLength.toString());
          chunks.forEach(chunk => originalWrite.call(res, chunk));
        }
        return originalEnd.call(res);
      }

      // 返回 this 以支持链式调用
      return res;
    };

    next();
  };
}

// ============ 辅助函数 ============

/**
 * 检查内容类型是否匹配
 */
function matchesContentType(contentType: string, patterns: RegExp[]): boolean {
  // 移除 charset 等参数
  const type = contentType.split(';')[0].trim();
  return patterns.some(pattern => pattern.test(type));
}

/**
 * 压缩数据
 */
function compressData(
  data: Buffer,
  algorithm: string,
  level: number,
  callback: (err: Error | null, result?: Buffer) => void
): void {
  const options: zlib.CompressOptions = { level };

  if (algorithm === 'gzip') {
    zlib.gzip(data, options, callback);
  } else if (algorithm === 'deflate') {
    zlib.deflate(data, options, callback);
  } else {
    // 默认使用 gzip
    zlib.gzip(data, options, callback);
  }
}

// ============ 便捷函数 ============

/**
 * 快速创建常用配置的压缩中间件
 */
export const compress = {
  /**
   * 生产环境配置 (高压缩率，1KB 阈值)
   */
  production: () => compression({
    algorithm: 'gzip',
    threshold: 1024,
    level: 9,
    skipIfAlreadyCompressed: true,
  }),

  /**
   * 开发环境配置 (低压缩级别，快速)
   */
  development: () => compression({
    algorithm: 'gzip',
    threshold: 2048,
    level: 1,
    skipIfAlreadyCompressed: false,
  }),

  /**
   * 激进模式 (512B 阈值，最大压缩)
   */
  aggressive: () => compression({
    algorithm: 'gzip',
    threshold: 512,
    level: 9,
    skipIfAlreadyCompressed: true,
  }),

  /**
   * 仅 JSON (只压缩 JSON 响应)
   */
  jsonOnly: () => compression({
    algorithm: 'gzip',
    threshold: 1024,
    level: 6,
    contentTypes: [/application\/json/i],
  }),

  /**
   * 文本专用 (只压缩文本类型)
   */
  textOnly: () => compression({
    algorithm: 'gzip',
    threshold: 1024,
    level: 6,
    contentTypes: [/text\//i],
  }),
};

// ============ 使用示例 ============

/*
 * ============================================
 * 使用示例 / Usage Examples
 * ============================================
 * 
 * // 1. 基础用法
 * import express from 'express';
 * import { compression } from './middleware/compression';
 * 
 * const app = express();
 * app.use(compression());
 * 
 * 
 * // 2. 自定义配置
 * app.use(compression({
 *   threshold: 2048, // 2KB 以上才压缩
 *   level: 9, // 最大压缩级别
 *   contentTypes: [/text\//, /application\/json/, /application\/javascript/]
 * }));
 * 
 * 
 * // 3. 使用预设配置
 * import { compress } from './middleware/compression';
 * 
 * // 生产环境
 * if (process.env.NODE_ENV === 'production') {
 *   app.use(compress.production());
 * } else {
 *   app.use(compress.development());
 * }
 * 
 * 
 * // 4. 仅压缩 JSON 响应
 * app.use(compress.jsonOnly());
 * 
 * 
 * // 5. 激进压缩模式 (适合带宽敏感场景)
 * app.use(compress.aggressive());
 * 
 * 
 * // 6. 自定义过滤器
 * app.use(compression({
 *   threshold: 1024,
 *   filter: (req, res) => {
 *     // 跳过 /health 端点
 *     if (req.path === '/health') {
 *       return false;
 *     }
 *     // 跳过特定用户代理
 *     const ua = req.headers['user-agent'] || '';
 *     if (ua.includes('curl')) {
 *       return false;
 *     }
 *     return true;
 *   }
 * }));
 * 
 * 
 * // 7. 完整示例
 * import express from 'express';
 * import { compression, compress } from './middleware/compression';
 * 
 * const app = express();
 * 
 * // 在其他中间件之后，路由之前使用
 * app.use(express.json());
 * app.use(express.text());
 * app.use(compress.production());
 * 
 * // 路由
 * app.get('/api/data', (req, res) => {
 *   res.json({ 
 *     message: 'This response will be compressed if > 1KB',
 *     data: Array(100).fill({ item: 'test data for compression' })
 *   });
 * });
 * 
 * app.get('/api/small', (req, res) => {
 *   res.json({ status: 'ok' }); // 太小，不会压缩
 * });
 * 
 * app.get('/health', (req, res) => {
 *   res.json({ status: 'healthy' }); // 被过滤器跳过
 * });
 * 
 * app.listen(3000, () => {
 *   console.log('Server running on port 3000 with compression enabled');
 * });
 * 
 * 
 * // 8. 查看压缩统计
 * // 响应头会包含 X-Compression-Stats:
 * // {"originalSize":5432,"compressedSize":1234,"ratio":77.28,"algorithm":"gzip"}
 * 
 * 
 * 注意事项:
 * 1. 压缩中间件应该在响应数据生成之前注册 (在路由之前)
 * 2. 应该在 body-parser 等中间件之后使用，以便正确获取响应数据
 * 3. 对于已经压缩的内容 (如图片、视频)，会自动跳过
 * 4. 压缩会增加 CPU 使用，但能显著减少带宽
 * 5. 建议阈值设置在 1KB 左右，太小的文件压缩收益低
 */

export default compression;
