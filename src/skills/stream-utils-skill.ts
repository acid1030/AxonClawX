/**
 * Stream Utils Skill - NOVA
 * 
 * Node.js 流处理工具集
 * 功能：流读取/写入、流转换/管道、背压处理
 * 
 * @author NOVA
 * @version 1.0.0
 */

import {
  Readable,
  Writable,
  Transform,
  pipeline,
  finished,
} from 'node:stream';
import { createReadStream, createWriteStream, stat } from 'node:fs';
import { createGzip, createGunzip } from 'node:zlib';
import { createInterface } from 'node:readline';
import { promisify } from 'node:util';
import { createHash } from 'node:crypto';

const pipelineAsync = promisify(pipeline);
const finishedAsync = promisify(finished);

// ============ 类型定义 ============

export interface StreamOptions {
  /** 高水位标记 (默认 16KB) */
  highWaterMark?: number;
  /** 编码 (默认 utf8) */
  encoding?: BufferEncoding;
  /** 超时时间 (毫秒) */
  timeout?: number;
}

export interface TransformOptions {
  /** 转换函数 */
  transform?: (chunk: any, encoding: BufferEncoding, callback: Function) => void;
  /** 刷新函数 */
  flush?: (callback: Function) => void;
  /** 对象模式 */
  objectMode?: boolean;
}

export interface BackpressureOptions {
  /** 重试延迟 (毫秒) */
  retryDelay?: number;
  /** 最大重试次数 */
  maxRetries?: number;
  /** 是否记录日志 */
  logging?: boolean;
}

// ============ 流读取 ============

/**
 * 读取文件流
 * @param filePath 文件路径
 * @param options 选项
 * @returns Readable 流
 */
export function createFileReadable(
  filePath: string,
  options: StreamOptions = {}
): Readable {
  return createReadStream(filePath, {
    highWaterMark: options.highWaterMark || 16 * 1024,
    encoding: options.encoding || 'utf8',
  });
}

/**
 * 读取 JSON 流 (逐行解析)
 * @param filePath JSONL 文件路径
 * @returns AsyncIterable 解析后的对象
 */
export async function* readJsonLines(
  filePath: string
): AsyncIterableIterator<any> {
  const stream = createReadStream(filePath, { encoding: 'utf8' });
  const rl = createInterface({
    input: stream,
    crlfDelay: Infinity,
  });

  try {
    for await (const line of rl) {
      if (line.trim()) {
        yield JSON.parse(line);
      }
    }
  } finally {
    rl.close();
  }
}

/**
 * 分块读取大文件
 * @param filePath 文件路径
 * @param chunkSize 块大小 (字节)
 * @returns AsyncIterable 文件块
 */
export async function* readInChunks(
  filePath: string,
  chunkSize: number = 64 * 1024
): AsyncIterableIterator<Buffer> {
  const stream = createReadStream(filePath, { highWaterMark: chunkSize });
  
  for await (const chunk of stream) {
    yield chunk;
  }
}

// ============ 流写入 ============

/**
 * 创建文件写入流
 * @param filePath 文件路径
 * @param options 选项
 * @returns Writable 流
 */
export function createFileWritable(
  filePath: string,
  options: StreamOptions = {}
): Writable {
  return createWriteStream(filePath, {
    highWaterMark: options.highWaterMark || 16 * 1024,
    encoding: options.encoding || 'utf8',
  });
}

/**
 * 安全写入文件 (带原子性保证)
 * @param filePath 目标文件路径
 * @param data 数据
 * @param options 选项
 */
export async function safeWriteFile(
  filePath: string,
  data: string | Buffer,
  options: StreamOptions = {}
): Promise<void> {
  const tempPath = `${filePath}.tmp.${Date.now()}`;
  
  try {
    await pipelineAsync(
      Readable.from(data),
      createFileWritable(tempPath, options)
    );
    
    // 原子性替换
    const fs = await import('node:fs/promises');
    await fs.rename(tempPath, filePath);
  } catch (error) {
    // 清理临时文件
    const fs = await import('node:fs/promises');
    await fs.unlink(tempPath).catch(() => {});
    throw error;
  }
}

/**
 * 写入 JSONL 文件
 * @param filePath 输出文件路径
 * @param records 记录数组
 */
export async function writeJsonLines(
  filePath: string,
  records: any[]
): Promise<void> {
  const stream = createFileWritable(filePath);
  
  try {
    for (const record of records) {
      const line = JSON.stringify(record) + '\n';
      const canContinue = stream.write(line);
      
      // 背压处理
      if (!canContinue) {
        await new Promise<void>((resolve) => {
          stream.once('drain', resolve);
        });
      }
    }
    
    stream.end();
    await finishedAsync(stream);
  } catch (error) {
    stream.destroy(error as Error);
    throw error;
  }
}

// ============ 流转换 ============

/**
 * 创建转换流
 * @param transform 转换函数
 * @param options 选项
 * @returns Transform 流
 */
export function createTransformStream(
  transform: (chunk: any, encoding: BufferEncoding, callback: Function) => void,
  options: TransformOptions = {}
): Transform {
  return new Transform({
    transform,
    flush: options.flush,
    objectMode: options.objectMode || false,
    highWaterMark: 16 * 1024,
  });
}

/**
 * 创建过滤器流
 * @param predicate 过滤函数
 * @returns Transform 流
 */
export function createFilterStream<T>(
  predicate: (item: T) => boolean
): Transform {
  return new Transform({
    objectMode: true,
    transform(chunk: T, _encoding, callback) {
      if (predicate(chunk)) {
        callback(null, chunk);
      } else {
        callback();
      }
    },
  });
}

/**
 * 创建映射流
 * @param mapFn 映射函数
 * @returns Transform 流
 */
export function createMapStream<T, U>(
  mapFn: (item: T) => U
): Transform {
  return new Transform({
    objectMode: true,
    transform(chunk: T, _encoding, callback) {
      try {
        callback(null, mapFn(chunk));
      } catch (error) {
        callback(error as Error);
      }
    },
  });
}

/**
 * 创建压缩流
 * @returns Transform 流 (gzip)
 */
export function createCompressStream(): Transform {
  return createGzip();
}

/**
 * 创建解压流
 * @returns Transform 流 (gunzip)
 */
export function createDecompressStream(): Transform {
  return createGunzip();
}

/**
 * 创建哈希计算流
 * @param algorithm 哈希算法 (默认 sha256)
 * @returns Transform 流
 */
export function createHashStream(algorithm: string = 'sha256'): Transform {
  const hash = createHash(algorithm);
  let data = Buffer.alloc(0);
  
  return new Transform({
    transform(chunk: Buffer, _encoding, callback) {
      hash.update(chunk);
      data = Buffer.concat([data, chunk]);
      callback(null, chunk);
    },
    flush(callback) {
      (this as any).hashResult = hash.digest('hex');
      callback();
    },
  });
}

// ============ 管道操作 ============

/**
 * 创建文件处理管道
 * @param inputPath 输入文件
 * @param outputPath 输出文件
 * @param transforms 转换流数组
 */
export async function createFilePipeline(
  inputPath: string,
  outputPath: string,
  transforms: Transform[] = []
): Promise<void> {
  return new Promise((resolve, reject) => {
    const streams = [
      createReadStream(inputPath),
      ...transforms,
      createWriteStream(outputPath),
    ];
    
    pipeline(streams, (error) => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });
}

/**
 * 创建异步迭代器管道
 * @param source 源迭代器
 * @param operations 操作数组
 * @returns 处理后的迭代器
 */
export async function* pipeAsync<T>(
  source: AsyncIterable<T>,
  ...operations: Array<(input: AsyncIterable<any>) => AsyncIterable<any>>
): AsyncIterableIterator<any> {
  let current = source;
  
  for (const op of operations) {
    current = op(current);
  }
  
  for await (const item of current) {
    yield item;
  }
}

/**
 * 过滤操作 (用于 pipeAsync)
 */
export function filterOp<T>(predicate: (item: T) => boolean) {
  return async function* (source: AsyncIterable<T>): AsyncIterableIterator<T> {
    for await (const item of source) {
      if (predicate(item)) {
        yield item;
      }
    }
  };
}

/**
 * 映射操作 (用于 pipeAsync)
 */
export function mapOp<T, U>(mapFn: (item: T) => U) {
  return async function* (source: AsyncIterable<T>): AsyncIterableIterator<U> {
    for await (const item of source) {
      yield mapFn(item);
    }
  };
}

/**
 * 限流操作 (用于 pipeAsync)
 */
export function takeOp<T>(limit: number) {
  return async function* (source: AsyncIterable<T>): AsyncIterableIterator<T> {
    let count = 0;
    for await (const item of source) {
      if (count >= limit) break;
      yield item;
      count++;
    }
  };
}

// ============ 背压处理 ============

/**
 * 带背压处理的写入
 * @param stream 写入流
 * @param chunks 数据块数组
 * @param options 选项
 */
export async function writeWithBackpressure(
  stream: Writable,
  chunks: Array<string | Buffer>,
  options: BackpressureOptions = {}
): Promise<void> {
  const {
    retryDelay = 100,
    maxRetries = 3,
    logging = false,
  } = options;
  
  for (let i = 0; i < chunks.length; i++) {
    let retries = 0;
    
    while (retries < maxRetries) {
      const canContinue = stream.write(chunks[i]);
      
      if (canContinue) {
        break;
      }
      
      // 触发背压，等待 drain
      if (logging) {
        console.log(`[Backpressure] Waiting for drain at chunk ${i + 1}/${chunks.length}`);
      }
      
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Backpressure timeout'));
        }, 30000);
        
        stream.once('drain', () => {
          clearTimeout(timeout);
          resolve();
        });
        
        stream.once('error', (error) => {
          clearTimeout(timeout);
          reject(error);
        });
      });
      
      retries++;
    }
    
    if (retries >= maxRetries) {
      throw new Error(`Max retries exceeded at chunk ${i + 1}`);
    }
  }
  
  stream.end();
  await finishedAsync(stream);
}

/**
 * 带背压处理的流复制
 * @param readable 可读流
 * @param writable 可写流
 * @param options 选项
 */
export async function copyStreamWithBackpressure(
  readable: Readable,
  writable: Writable,
  options: BackpressureOptions = {}
): Promise<void> {
  const { logging = false } = options;
  let bytesCopied = 0;
  
  return new Promise((resolve, reject) => {
    readable.on('data', (chunk) => {
      bytesCopied += chunk.length;
      
      const canContinue = writable.write(chunk);
      if (!canContinue) {
        if (logging) {
          console.log(`[Backpressure] Paused at ${bytesCopied} bytes`);
        }
        readable.pause();
      }
    });
    
    writable.on('drain', () => {
      if (logging) {
        console.log(`[Backpressure] Resumed at ${bytesCopied} bytes`);
      }
      readable.resume();
    });
    
    readable.on('end', () => {
      writable.end();
    });
    
    readable.on('error', reject);
    writable.on('error', reject);
    
    finished(writable, (error) => {
      if (error) {
        reject(error);
      } else {
        if (logging) {
          console.log(`[Backpressure] Copy complete: ${bytesCopied} bytes`);
        }
        resolve();
      }
    });
  });
}

/**
 * 带超时和重试的流处理
 * @param fn 处理函数
 * @param options 选项
 */
export async function withStreamTimeout<T>(
  fn: () => Promise<T>,
  timeoutMs: number = 30000
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`Stream operation timed out after ${timeoutMs}ms`));
    }, timeoutMs);
    
    fn()
      .then((result) => {
        clearTimeout(timeout);
        resolve(result);
      })
      .catch((error) => {
        clearTimeout(timeout);
        reject(error);
      });
  });
}

// ============ 工具函数 ============

/**
 * 将流转换为数组
 * @param stream 可读流
 * @returns 数组
 */
export async function streamToArray<T>(stream: Readable): Promise<T[]> {
  const chunks: T[] = [];
  
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  
  return chunks;
}

/**
 * 将流转换为字符串
 * @param stream 可读流
 * @param encoding 编码
 * @returns 字符串
 */
export async function streamToString(
  stream: Readable,
  encoding: BufferEncoding = 'utf8'
): Promise<string> {
  const chunks: Buffer[] = [];
  
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, encoding));
  }
  
  return Buffer.concat(chunks).toString(encoding);
}

/**
 * 获取文件大小
 * @param filePath 文件路径
 * @returns 文件大小 (字节)
 */
export async function getFileSize(filePath: string): Promise<number> {
  const stats = await promisify(stat)(filePath);
  return stats.size;
}

/**
 * 批处理流数据
 * @param stream 可读流
 * @param batchSize 批次大小
 * @returns 批次数组
 */
export async function* batchStream<T>(
  stream: Readable,
  batchSize: number = 100
): AsyncIterableIterator<T[]> {
  let batch: T[] = [];
  
  for await (const chunk of stream) {
    batch.push(chunk);
    
    if (batch.length >= batchSize) {
      yield batch;
      batch = [];
    }
  }
  
  if (batch.length > 0) {
    yield batch;
  }
}

// ============ 导出技能注册 ============

export const streamUtilsSkill = {
  name: 'stream-utils',
  version: '1.0.0',
  description: 'Node.js 流处理工具集',
  functions: {
    // 读取
    createFileReadable,
    readJsonLines,
    readInChunks,
    // 写入
    createFileWritable,
    safeWriteFile,
    writeJsonLines,
    // 转换
    createTransformStream,
    createFilterStream,
    createMapStream,
    createCompressStream,
    createDecompressStream,
    createHashStream,
    // 管道
    createFilePipeline,
    pipeAsync,
    filterOp,
    mapOp,
    takeOp,
    // 背压
    writeWithBackpressure,
    copyStreamWithBackpressure,
    withStreamTimeout,
    // 工具
    streamToArray,
    streamToString,
    getFileSize,
    batchStream,
  },
};

export default streamUtilsSkill;
