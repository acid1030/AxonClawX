/**
 * Body Parser Middleware
 * 
 * 请求体解析中间件，支持 JSON 和 URL-encoded 格式，可配置大小限制
 * 
 * @author Axon
 * @version 1.0.0
 */

export interface BodyParserConfig {
  /** JSON 解析配置 */
  json?: JSONConfig;
  /** URL-encoded 解析配置 */
  urlencoded?: UrlEncodedConfig;
  /** 是否启用解析 */
  enabled?: boolean;
}

export interface JSONConfig {
  /** 最大请求体大小 (默认 100kb) */
  limit?: number | string;
  /** 是否严格模式 (仅允许对象和数组) */
  strict?: boolean;
  /** 自定义类型验证函数 */
  type?: (req: any) => boolean;
  /** 字符编码 (默认 utf-8) */
  encoding?: string;
}

export interface UrlEncodedConfig {
  /** 最大请求体大小 (默认 100kb) */
  limit?: number | string;
  /** 是否扩展解析 (支持嵌套对象) */
  extended?: boolean;
  /** 字符编码 (默认 utf-8) */
  encoding?: string;
  /** 数组参数长度限制 */
  arrayLimit?: number;
  /** 参数深度限制 */
  depth?: number;
  /** 允许的参数数量 */
  parameterLimit?: number;
}

interface ParsedBody {
  /** 解析后的数据 */
  data?: any;
  /** 解析错误 */
  error?: Error;
  /** 原始内容 */
  raw?: Buffer;
}

/**
 * 解析大小字符串 (如 '100kb', '1mb') 为字节数
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
 * 读取请求体
 */
async function readBody(
  req: any,
  limit: number,
  encoding: string = 'utf-8'
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;

    req.on('data', (chunk: Buffer) => {
      size += chunk.length;
      
      // 超过限制
      if (size > limit) {
        const error = new Error('Request entity too large');
        (error as any).status = 413;
        (error as any).type = 'entity.too.large';
        reject(error);
        return;
      }

      chunks.push(chunk);
    });

    req.on('end', () => {
      resolve(Buffer.concat(chunks));
    });

    req.on('error', (err: Error) => {
      reject(err);
    });
  });
}

/**
 * 解析 JSON
 */
function parseJSON(raw: Buffer, strict: boolean = true): any {
  const text = raw.toString('utf-8');
  
  if (!text.trim()) {
    return undefined;
  }

  try {
    const data = JSON.parse(text);

    // 严格模式：仅允许对象和数组
    if (strict) {
      const type = typeof data;
      if (type !== 'object' || data === null) {
        throw new Error('JSON parse error: only objects and arrays allowed in strict mode');
      }
    }

    return data;
  } catch (error) {
    const parseError = new Error(`JSON parse error: ${(error as Error).message}`);
    (parseError as any).status = 400;
    (parseError as any).type = 'entity.parse.failed';
    throw parseError;
  }
}

/**
 * 解析 URL-encoded
 */
function parseUrlEncoded(raw: Buffer, config: UrlEncodedConfig): any {
  const text = raw.toString((config.encoding || 'utf-8') as BufferEncoding);
  
  if (!text.trim()) {
    return {};
  }

  try {
    if (config.extended) {
      // 扩展模式：支持嵌套对象
      return parseExtended(text, config);
    } else {
      // 简单模式：仅支持扁平键值对
      return parseSimple(text);
    }
  } catch (error) {
    const parseError = new Error(`URL-encoded parse error: ${(error as Error).message}`);
    (parseError as any).status = 400;
    (parseError as any).type = 'entity.parse.failed';
    throw parseError;
  }
}

/**
 * 简单 URL-encoded 解析
 */
function parseSimple(text: string): Record<string, string> {
  const result: Record<string, string> = {};
  const pairs = text.split('&');

  for (const pair of pairs) {
    if (!pair) continue;

    const [key, value = ''] = pair.split('=');
    const decodedKey = decodeURIComponent(key.replace(/\+/g, ' '));
    const decodedValue = decodeURIComponent(value.replace(/\+/g, ' '));

    result[decodedKey] = decodedValue;
  }

  return result;
}

/**
 * 扩展 URL-encoded 解析 (支持嵌套)
 */
function parseExtended(text: string, config: UrlEncodedConfig): any {
  const result: any = {};
  const pairs = text.split('&');
  let paramCount = 0;

  for (const pair of pairs) {
    if (!pair) continue;
    
    paramCount++;
    if (config.parameterLimit && paramCount > config.parameterLimit) {
      throw new Error('Too many parameters');
    }

    const [key, value = ''] = pair.split('=');
    const decodedKey = decodeURIComponent(key.replace(/\+/g, ' '));
    const decodedValue = decodeURIComponent(value.replace(/\+/g, ' '));

    setNestedValue(result, decodedKey, decodedValue, config);
  }

  return result;
}

/**
 * 设置嵌套值 (支持 a[b][c]=value 语法)
 */
function setNestedValue(
  obj: any,
  key: string,
  value: string,
  config: UrlEncodedConfig,
  depth: number = 0
): void {
  if (depth > (config.depth || 5)) {
    throw new Error('Too deep nesting');
  }

  // 匹配数组语法 a[0]=value 或 a[]=value
  const arrayMatch = key.match(/^([^\]]+)\[(\d*|)\]$/);
  if (arrayMatch) {
    const baseKey = arrayMatch[1];
    const index = arrayMatch[2];

    if (!obj[baseKey]) {
      obj[baseKey] = [];
    }

    if (!Array.isArray(obj[baseKey])) {
      obj[baseKey] = [];
    }

    if (index === '') {
      // a[]=value 形式：追加到数组
      obj[baseKey].push(value);
      if (config.arrayLimit && obj[baseKey].length > config.arrayLimit) {
        throw new Error('Too many array elements');
      }
    } else {
      // a[0]=value 形式：指定索引
      const idx = parseInt(index, 10);
      if (config.arrayLimit && idx > config.arrayLimit) {
        throw new Error('Array index out of limit');
      }
      obj[baseKey][idx] = value;
    }
    return;
  }

  // 匹配嵌套对象语法 a[b]=value 或 a[b][c]=value
  const nestedMatch = key.match(/^([^\]]+)\[(.+)\]$/);
  if (nestedMatch) {
    const baseKey = nestedMatch[1];
    const nestedKey = nestedMatch[2];

    if (!obj[baseKey]) {
      obj[baseKey] = {};
    }

    if (typeof obj[baseKey] !== 'object' || Array.isArray(obj[baseKey])) {
      obj[baseKey] = {};
    }

    setNestedValue(obj[baseKey], nestedKey, value, config, depth + 1);
    return;
  }

  // 普通键值对
  obj[key] = value;
}

/**
 * 检查 Content-Type 是否匹配
 */
function isContentType(req: any, type: string): boolean {
  const contentType = req.headers['content-type'] || req.headers['Content-Type'];
  if (!contentType) {
    return false;
  }

  return contentType.includes(type);
}

/**
 * Body Parser 中间件类
 */
export class BodyParserMiddleware {
  private config: Required<BodyParserConfig>;

  constructor(config: BodyParserConfig = {}) {
    this.config = {
      enabled: config.enabled !== false,
      json: {
        limit: config.json?.limit || '100kb',
        strict: config.json?.strict !== false,
        type: config.json?.type,
        encoding: config.json?.encoding || 'utf-8',
      },
      urlencoded: {
        limit: config.urlencoded?.limit || '100kb',
        extended: config.urlencoded?.extended !== false,
        encoding: config.urlencoded?.encoding || 'utf-8',
        arrayLimit: config.urlencoded?.arrayLimit || 20,
        depth: config.urlencoded?.depth || 5,
        parameterLimit: config.urlencoded?.parameterLimit || 1000,
      },
    };
  }

  /**
   * 中间件处理函数
   */
  public async handle(
    req: any,
    res: any,
    next: (err?: any) => void
  ): Promise<void> {
    if (!this.config.enabled) {
      next();
      return;
    }

    // 跳过 GET/HEAD 请求
    const method = (req.method || 'GET').toUpperCase();
    if (method === 'GET' || method === 'HEAD') {
      next();
      return;
    }

    try {
      // JSON 解析
      if (isContentType(req, 'application/json')) {
        await this.parseJson(req);
        next();
        return;
      }

      // URL-encoded 解析
      if (isContentType(req, 'application/x-www-form-urlencoded')) {
        await this.parseUrlEncoded(req);
        next();
        return;
      }

      // 不匹配的 Content-Type，跳过
      next();
    } catch (error) {
      // 传递错误给错误处理中间件
      next(error);
    }
  }

  /**
   * 解析 JSON
   */
  private async parseJson(req: any): Promise<void> {
    const { limit, strict, encoding } = this.config.json;
    const limitBytes = parseSize(limit);

    const raw = await readBody(req, limitBytes, encoding);
    
    if (raw.length === 0) {
      req.body = undefined;
      return;
    }

    const data = parseJSON(raw, strict);
    req.body = data;
    req.rawBody = raw;
  }

  /**
   * 解析 URL-encoded
   */
  private async parseUrlEncoded(req: any): Promise<void> {
    const { limit, extended, encoding, arrayLimit, depth, parameterLimit } = this.config.urlencoded;
    const limitBytes = parseSize(limit);

    const raw = await readBody(req, limitBytes, encoding);
    
    if (raw.length === 0) {
      req.body = {};
      return;
    }

    const data = parseUrlEncoded(raw, {
      extended,
      encoding,
      arrayLimit,
      depth,
      parameterLimit,
    });
    
    req.body = data;
    req.rawBody = raw;
  }
}

/**
 * 创建 Body Parser 中间件
 * 
 * @param config 配置
 * @returns Express/Koa 风格的中间件函数
 */
export function createBodyParserMiddleware(config: BodyParserConfig = {}) {
  const parser = new BodyParserMiddleware(config);

  return async (
    req: any,
    res: any,
    next: (err?: any) => void
  ): Promise<void> => {
    await parser.handle(req, res, next);
  };
}

/**
 * 创建独立的 JSON 解析中间件
 */
export function createJsonMiddleware(config: JSONConfig = {}) {
  return async (
    req: any,
    res: any,
    next: (err?: any) => void
  ): Promise<void> => {
    if (!isContentType(req, 'application/json')) {
      next();
      return;
    }

    try {
      const { limit = '100kb', strict = true, encoding = 'utf-8' } = config;
      const limitBytes = parseSize(limit);
      const raw = await readBody(req, limitBytes, encoding);
      
      if (raw.length === 0) {
        req.body = undefined;
      } else {
        req.body = parseJSON(raw, strict);
        req.rawBody = raw;
      }
      
      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * 创建独立的 URL-encoded 解析中间件
 */
export function createUrlEncodedMiddleware(config: UrlEncodedConfig = {}) {
  return async (
    req: any,
    res: any,
    next: (err?: any) => void
  ): Promise<void> => {
    if (!isContentType(req, 'application/x-www-form-urlencoded')) {
      next();
      return;
    }

    try {
      const {
        limit = '100kb',
        extended = true,
        encoding = 'utf-8',
        arrayLimit = 20,
        depth = 5,
        parameterLimit = 1000,
      } = config;
      
      const limitBytes = parseSize(limit);
      const raw = await readBody(req, limitBytes, encoding);
      
      if (raw.length === 0) {
        req.body = {};
      } else {
        req.body = parseUrlEncoded(raw, {
          extended,
          encoding,
          arrayLimit,
          depth,
          parameterLimit,
        });
        req.rawBody = raw;
      }
      
      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * 预定义配置模板
 */
export const presets = {
  /** 宽松模式：大尺寸限制，支持嵌套 */
  loose: {
    json: {
      limit: '10mb',
      strict: false,
    },
    urlencoded: {
      limit: '10mb',
      extended: true,
      depth: 10,
    },
  } as BodyParserConfig,

  /** 标准模式：默认配置 */
  standard: {
    json: {
      limit: '100kb',
      strict: true,
    },
    urlencoded: {
      limit: '100kb',
      extended: true,
    },
  } as BodyParserConfig,

  /** 严格模式：小尺寸限制，严格 JSON */
  strict: {
    json: {
      limit: '10kb',
      strict: true,
    },
    urlencoded: {
      limit: '10kb',
      extended: false,
      parameterLimit: 100,
    },
  } as BodyParserConfig,

  /** API 模式：仅 JSON，适中限制 */
  api: {
    json: {
      limit: '1mb',
      strict: true,
    },
    urlencoded: {
      enabled: false,
    },
  } as BodyParserConfig,

  /** 表单模式：仅 URL-encoded */
  form: {
    json: {
      enabled: false,
    },
    urlencoded: {
      limit: '1mb',
      extended: true,
    },
  } as BodyParserConfig,
};

export default createBodyParserMiddleware;
