/**
 * 数据压缩工具技能
 * 
 * 功能:
 * 1. Gzip 压缩/解压
 * 2. Deflate 压缩/解压
 * 3. Zip 打包/解包
 * 4. 流式压缩
 * 
 * @module compress-utils-skill
 */

import * as zlib from 'zlib';
import * as fs from 'fs';
import * as path from 'path';
import { pipeline } from 'stream/promises';
import { Readable, Writable } from 'stream';
import { createReadStream, createWriteStream } from 'fs';

// ============== 类型定义 ==============

export interface CompressionOptions {
  level?: number;           // 压缩级别 (1-9)
  chunkSize?: number;       // 块大小 (默认 16KB)
  encoding?: BufferEncoding; // 编码格式
}

export interface CompressionResult {
  success: boolean;
  data?: Buffer | string;
  error?: string;
  originalSize: number;
  compressedSize: number;
  ratio: number;
}

// ============== Zip 类型定义 ==============

export interface ZipEntry {
  name: string;           // 文件名（包含路径）
  data: Buffer | string;  // 文件数据
  encoding?: BufferEncoding; // 编码格式（如果是 string）
}

export interface ZipOptions {
  level?: number;           // 压缩级别 (0-9)
  encoding?: BufferEncoding; // 默认编码
}

export interface ZipResult {
  success: boolean;
  data?: Buffer;
  error?: string;
  filesCount?: number;
  totalSize?: number;
  compressedSize?: number;
}

export interface UnzipResult {
  success: boolean;
  files?: Array<{
    name: string;
    data: Buffer;
    size: number;
  }>;
  error?: string;
  filesCount?: number;
}

// ============== Gzip 压缩/解压 ==============

/**
 * Gzip 压缩
 * @param input - 输入数据 (Buffer 或 string)
 * @param options - 压缩选项
 * @returns 压缩结果
 */
export function gzipCompress(
  input: Buffer | string,
  options: CompressionOptions = {}
): CompressionResult {
  try {
    const inputData = Buffer.isBuffer(input) ? input : Buffer.from(input, options.encoding || 'utf-8');
    const level = options.level !== undefined ? options.level : 6; // 默认级别 6
    
    const compressed = zlib.gzipSync(inputData, { level });
    
    return {
      success: true,
      data: compressed,
      originalSize: inputData.length,
      compressedSize: compressed.length,
      ratio: compressed.length / inputData.length
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      originalSize: Buffer.isBuffer(input) ? input.length : Buffer.byteLength(input, options.encoding || 'utf-8'),
      compressedSize: 0,
      ratio: 0
    };
  }
}

/**
 * Gzip 解压
 * @param input - 压缩的 Buffer
 * @param options - 解压选项
 * @returns 解压结果
 */
export function gzipDecompress(
  input: Buffer,
  options: CompressionOptions = {}
): CompressionResult {
  try {
    const decompressed = zlib.gunzipSync(input);
    
    return {
      success: true,
      data: options.encoding ? decompressed.toString(options.encoding) : decompressed,
      originalSize: input.length,
      compressedSize: decompressed.length,
      ratio: input.length / decompressed.length
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      originalSize: input.length,
      compressedSize: 0,
      ratio: 0
    };
  }
}

/**
 * Gzip 压缩文件
 * @param inputPath - 输入文件路径
 * @param outputPath - 输出文件路径 (可选，默认添加 .gz 后缀)
 * @param options - 压缩选项
 * @returns 压缩结果
 */
export async function gzipCompressFile(
  inputPath: string,
  outputPath?: string,
  options: CompressionOptions = {}
): Promise<CompressionResult> {
  try {
    const output = outputPath || `${inputPath}.gz`;
    const level = options.level !== undefined ? options.level : 6;
    
    const inputData = await fs.promises.readFile(inputPath);
    const compressed = zlib.gzipSync(inputData, { level });
    
    await fs.promises.writeFile(output, compressed);
    
    const originalSize = inputData.length;
    const compressedSize = compressed.length;
    
    return {
      success: true,
      data: compressed,
      originalSize,
      compressedSize,
      ratio: compressedSize / originalSize
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      originalSize: 0,
      compressedSize: 0,
      ratio: 0
    };
  }
}

/**
 * Gzip 解压文件
 * @param inputPath - 输入文件路径 (.gz 文件)
 * @param outputPath - 输出文件路径 (可选，默认移除 .gz 后缀)
 * @param options - 解压选项
 * @returns 解压结果
 */
export async function gzipDecompressFile(
  inputPath: string,
  outputPath?: string,
  options: CompressionOptions = {}
): Promise<CompressionResult> {
  try {
    const output = outputPath || inputPath.replace(/\.gz$/, '');
    
    const inputData = await fs.promises.readFile(inputPath);
    const decompressed = zlib.gunzipSync(inputData);
    
    await fs.promises.writeFile(output, decompressed);
    
    const originalSize = inputData.length;
    const compressedSize = decompressed.length;
    
    return {
      success: true,
      data: decompressed,
      originalSize,
      compressedSize,
      ratio: originalSize / compressedSize
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      originalSize: 0,
      compressedSize: 0,
      ratio: 0
    };
  }
}

// ============== Deflate 压缩/解压 ==============

/**
 * Deflate 压缩
 * @param input - 输入数据 (Buffer 或 string)
 * @param options - 压缩选项
 * @returns 压缩结果
 */
export function deflateCompress(
  input: Buffer | string,
  options: CompressionOptions = {}
): CompressionResult {
  try {
    const inputData = Buffer.isBuffer(input) ? input : Buffer.from(input, options.encoding || 'utf-8');
    const level = options.level !== undefined ? options.level : 6;
    
    const compressed = zlib.deflateSync(inputData, { level });
    
    return {
      success: true,
      data: compressed,
      originalSize: inputData.length,
      compressedSize: compressed.length,
      ratio: compressed.length / inputData.length
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      originalSize: Buffer.isBuffer(input) ? input.length : Buffer.byteLength(input, options.encoding || 'utf-8'),
      compressedSize: 0,
      ratio: 0
    };
  }
}

/**
 * Deflate 解压
 * @param input - 压缩的 Buffer
 * @param options - 解压选项
 * @returns 解压结果
 */
export function deflateDecompress(
  input: Buffer,
  options: CompressionOptions = {}
): CompressionResult {
  try {
    const decompressed = zlib.inflateSync(input);
    
    return {
      success: true,
      data: options.encoding ? decompressed.toString(options.encoding) : decompressed,
      originalSize: input.length,
      compressedSize: decompressed.length,
      ratio: input.length / decompressed.length
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      originalSize: input.length,
      compressedSize: 0,
      ratio: 0
    };
  }
}

/**
 * Deflate 压缩文件
 * @param inputPath - 输入文件路径
 * @param outputPath - 输出文件路径 (可选)
 * @param options - 压缩选项
 * @returns 压缩结果
 */
export async function deflateCompressFile(
  inputPath: string,
  outputPath?: string,
  options: CompressionOptions = {}
): Promise<CompressionResult> {
  try {
    const output = outputPath || `${inputPath}.deflate`;
    const level = options.level !== undefined ? options.level : 6;
    
    const inputData = await fs.promises.readFile(inputPath);
    const compressed = zlib.deflateSync(inputData, { level });
    
    await fs.promises.writeFile(output, compressed);
    
    const originalSize = inputData.length;
    const compressedSize = compressed.length;
    
    return {
      success: true,
      data: compressed,
      originalSize,
      compressedSize,
      ratio: compressedSize / originalSize
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      originalSize: 0,
      compressedSize: 0,
      ratio: 0
    };
  }
}

/**
 * Deflate 解压文件
 * @param inputPath - 输入文件路径
 * @param outputPath - 输出文件路径 (可选)
 * @param options - 解压选项
 * @returns 解压结果
 */
export async function deflateDecompressFile(
  inputPath: string,
  outputPath?: string,
  options: CompressionOptions = {}
): Promise<CompressionResult> {
  try {
    const output = outputPath || inputPath.replace(/\.deflate$/, '');
    
    const inputData = await fs.promises.readFile(inputPath);
    const decompressed = zlib.inflateSync(inputData);
    
    await fs.promises.writeFile(output, decompressed);
    
    const originalSize = inputData.length;
    const compressedSize = decompressed.length;
    
    return {
      success: true,
      data: decompressed,
      originalSize,
      compressedSize,
      ratio: originalSize / compressedSize
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      originalSize: 0,
      compressedSize: 0,
      ratio: 0
    };
  }
}

// ============== 流式压缩 ==============

/**
 * 流式 Gzip 压缩
 * @param inputStream - 输入流
 * @param outputStream - 输出流
 * @param options - 压缩选项
 */
export async function gzipStreamCompress(
  inputStream: Readable,
  outputStream: Writable,
  options: CompressionOptions = {}
): Promise<void> {
  const level = options.level !== undefined ? options.level : 6;
  const gzipStream = zlib.createGzip({ level });
  
  await pipeline(inputStream, gzipStream, outputStream);
}

/**
 * 流式 Gzip 解压
 * @param inputStream - 输入流
 * @param outputStream - 输出流
 * @param options - 解压选项
 */
export async function gzipStreamDecompress(
  inputStream: Readable,
  outputStream: Writable,
  options: CompressionOptions = {}
): Promise<void> {
  const gunzipStream = zlib.createGunzip();
  
  await pipeline(inputStream, gunzipStream, outputStream);
}

/**
 * 流式 Deflate 压缩
 * @param inputStream - 输入流
 * @param outputStream - 输出流
 * @param options - 压缩选项
 */
export async function deflateStreamCompress(
  inputStream: Readable,
  outputStream: Writable,
  options: CompressionOptions = {}
): Promise<void> {
  const level = options.level !== undefined ? options.level : 6;
  const deflateStream = zlib.createDeflate({ level });
  
  await pipeline(inputStream, deflateStream, outputStream);
}

/**
 * 流式 Deflate 解压
 * @param inputStream - 输入流
 * @param outputStream - 输出流
 * @param options - 解压选项
 */
export async function deflateStreamDecompress(
  inputStream: Readable,
  outputStream: Writable,
  options: CompressionOptions = {}
): Promise<void> {
  const inflateStream = zlib.createInflate();
  
  await pipeline(inputStream, inflateStream, outputStream);
}

/**
 * 流式压缩文件
 * @param inputPath - 输入文件路径
 * @param outputPath - 输出文件路径
 * @param type - 压缩类型 ('gzip' | 'deflate')
 * @param options - 压缩选项
 */
export async function compressFileStream(
  inputPath: string,
  outputPath: string,
  type: 'gzip' | 'deflate' = 'gzip',
  options: CompressionOptions = {}
): Promise<void> {
  const inputStream = fs.createReadStream(inputPath);
  const outputStream = fs.createWriteStream(outputPath);
  
  if (type === 'gzip') {
    await gzipStreamCompress(inputStream, outputStream, options);
  } else {
    await deflateStreamCompress(inputStream, outputStream, options);
  }
}

/**
 * 流式解压文件
 * @param inputPath - 输入文件路径
 * @param outputPath - 输出文件路径
 * @param type - 压缩类型 ('gzip' | 'deflate')
 * @param options - 解压选项
 */
export async function decompressFileStream(
  inputPath: string,
  outputPath: string,
  type: 'gzip' | 'deflate' = 'gzip',
  options: CompressionOptions = {}
): Promise<void> {
  const inputStream = fs.createReadStream(inputPath);
  const outputStream = fs.createWriteStream(outputPath);
  
  if (type === 'gzip') {
    await gzipStreamDecompress(inputStream, outputStream, options);
  } else {
    await deflateStreamDecompress(inputStream, outputStream, options);
  }
}

// ============== Zip 打包/解包 ==============
// 注意：使用 Node.js 原生 zlib 实现基础 Zip 功能
// 如需完整 Zip 特性（多文件、目录等），建议集成 archiver/jszip 库

/**
 * 创建简单的 Zip 归档（单文件）
 * @param input - 输入数据
 * @param filename - 归档中的文件名
 * @param options - 压缩选项
 * @returns Zip 结果
 */
export function zipCreate(
  input: Buffer | string,
  filename: string = 'file.txt',
  options: ZipOptions = {}
): ZipResult {
  try {
    const inputData = Buffer.isBuffer(input) ? input : Buffer.from(input, options.encoding || 'utf-8');
    const level = options.level !== undefined ? options.level : 6;
    
    // 使用 Deflate 压缩
    const compressed = zlib.deflateSync(inputData, { level });
    
    // 构建简单的 Zip 文件结构（本地文件头 + 压缩数据 + 中央目录）
    const utf8Encoder = new TextEncoder();
    const filenameBytes = utf8Encoder.encode(filename);
    
    // 本地文件头 (30 bytes + filename)
    const localHeader = Buffer.alloc(30 + filenameBytes.length);
    localHeader.writeUInt32LE(0x04034b50, 0);           // 本地文件头签名
    localHeader.writeUInt16LE(20, 4);                    // 需要版本
    localHeader.writeUInt16LE(0x0800, 6);                // 通用标志位 (UTF-8)
    localHeader.writeUInt16LE(8, 8);                     // 压缩方法 (8=Deflate)
    localHeader.writeUInt16LE(0, 10);                    // 最后修改时间
    localHeader.writeUInt16LE(0, 12);                    // 最后修改日期
    localHeader.writeUInt32LE(0, 14);                    // CRC-32 (简化为 0)
    localHeader.writeUInt32LE(compressed.length, 18);    // 压缩后大小
    localHeader.writeUInt32LE(inputData.length, 22);     // 原始大小
    localHeader.writeUInt16LE(filenameBytes.length, 26); // 文件名长度
    localHeader.writeUInt16LE(0, 28);                    // 额外字段长度
    filenameBytes.copy(localHeader, 30);                 // 文件名
    
    // 中央目录文件头 (46 bytes + filename)
    const centralHeader = Buffer.alloc(46 + filenameBytes.length);
    centralHeader.writeUInt32LE(0x02014b50, 0);          // 中央目录头签名
    centralHeader.writeUInt16LE(20, 4);                  // 版本
    centralHeader.writeUInt16LE(20, 6);                  // 需要版本
    centralHeader.writeUInt16LE(0x0800, 8);              // 标志位
    centralHeader.writeUInt16LE(8, 10);                  // 压缩方法
    centralHeader.writeUInt16LE(0, 12);                  // 时间
    centralHeader.writeUInt16LE(0, 14);                  // 日期
    centralHeader.writeUInt32LE(0, 16);                  // CRC-32
    centralHeader.writeUInt32LE(compressed.length, 20);  // 压缩大小
    centralHeader.writeUInt32LE(inputData.length, 24);   // 原始大小
    centralHeader.writeUInt16LE(filenameBytes.length, 28); // 文件名长度
    centralHeader.writeUInt16LE(0, 30);                  // 额外字段长度
    centralHeader.writeUInt16LE(0, 32);                  // 注释长度
    centralHeader.writeUInt16LE(0, 34);                  // 磁盘起始号
    centralHeader.writeUInt16LE(0, 36);                  // 内部属性
    centralHeader.writeUInt32LE(0, 38);                  // 外部属性
    centralHeader.writeUInt32LE(0, 42);                  // 本地头偏移
    filenameBytes.copy(centralHeader, 46);               // 文件名
    
    // 中央目录结束记录 (22 bytes)
    const endRecord = Buffer.alloc(22);
    endRecord.writeUInt32LE(0x06054b50, 0);              // 结束记录签名
    endRecord.writeUInt16LE(0, 4);                       // 磁盘号
    endRecord.writeUInt16LE(0, 6);                       // 中央目录起始磁盘
    endRecord.writeUInt16LE(1, 8);                       // 本磁盘记录数
    endRecord.writeUInt16LE(1, 10);                      // 总记录数
    endRecord.writeUInt32LE(centralHeader.length, 12);   // 中央目录大小
    endRecord.writeUInt32LE(localHeader.length + compressed.length, 16); // 中央目录偏移
    endRecord.writeUInt16LE(0, 20);                      // 注释长度
    
    // 合并所有部分
    const zipBuffer = Buffer.concat([
      localHeader,
      compressed,
      centralHeader,
      endRecord
    ]);
    
    return {
      success: true,
      data: zipBuffer,
      filesCount: 1,
      totalSize: inputData.length,
      compressedSize: zipBuffer.length
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      filesCount: 0,
      totalSize: 0,
      compressedSize: 0
    };
  }
}

/**
 * 解压简单的 Zip 文件（单文件）
 * @param zipData - Zip 数据 Buffer
 * @param options - 解压选项
 * @returns 解压结果
 */
export function zipExtract(
  zipData: Buffer,
  options: ZipOptions = {}
): UnzipResult {
  try {
    // 查找本地文件头签名
    let offset = 0;
    while (offset < zipData.length - 4) {
      if (zipData.readUInt32LE(offset) === 0x04034b50) {
        // 找到本地文件头
        const compressionMethod = zipData.readUInt16LE(offset + 8);
        const compressedSize = zipData.readUInt32LE(offset + 18);
        const uncompressedSize = zipData.readUInt32LE(offset + 22);
        const filenameLength = zipData.readUInt16LE(offset + 26);
        const extraFieldLength = zipData.readUInt16LE(offset + 28);
        
        // 读取文件名
        const filenameBytes = zipData.slice(offset + 30, offset + 30 + filenameLength);
        const filename = new TextDecoder().decode(filenameBytes);
        
        // 读取压缩数据
        const dataStart = offset + 30 + filenameLength + extraFieldLength;
        const compressedData = zipData.slice(dataStart, dataStart + compressedSize);
        
        // 解压
        let decompressed: Buffer;
        if (compressionMethod === 8) { // Deflate
          decompressed = zlib.inflateSync(compressedData);
        } else if (compressionMethod === 0) { // Store (无压缩)
          decompressed = compressedData;
        } else {
          throw new Error(`Unsupported compression method: ${compressionMethod}`);
        }
        
        return {
          success: true,
          files: [{
            name: filename,
            data: decompressed,
            size: decompressed.length
          }],
          filesCount: 1
        };
      }
      offset++;
    }
    
    throw new Error('No valid Zip entry found');
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      filesCount: 0
    };
  }
}

/**
 * 创建 Zip 文件（多文件）
 * @param entries - 文件条目数组
 * @param outputPath - 输出文件路径
 * @param options - 压缩选项
 * @returns Zip 结果
 */
export async function zipCreateFile(
  entries: ZipEntry[],
  outputPath: string,
  options: ZipOptions = {}
): Promise<ZipResult> {
  try {
    const level = options.level !== undefined ? options.level : 6;
    const utf8Encoder = new TextEncoder();
    
    const localHeaders: Buffer[] = [];
    const centralHeaders: Buffer[] = [];
    let offset = 0;
    let totalSize = 0;
    
    for (const entry of entries) {
      const inputData = Buffer.isBuffer(entry.data) ? entry.data : Buffer.from(entry.data, entry.encoding || options.encoding || 'utf-8');
      const filenameBytes = utf8Encoder.encode(entry.name);
      totalSize += inputData.length;
      
      // 压缩
      const compressed = zlib.deflateSync(inputData, { level });
      
      // 本地文件头
      const localHeader = Buffer.alloc(30 + filenameBytes.length);
      localHeader.writeUInt32LE(0x04034b50, 0);
      localHeader.writeUInt16LE(20, 4);
      localHeader.writeUInt16LE(0x0800, 6);
      localHeader.writeUInt16LE(8, 8);
      localHeader.writeUInt16LE(0, 10);
      localHeader.writeUInt16LE(0, 12);
      localHeader.writeUInt32LE(0, 14);
      localHeader.writeUInt32LE(compressed.length, 18);
      localHeader.writeUInt32LE(inputData.length, 22);
      localHeader.writeUInt16LE(filenameBytes.length, 26);
      localHeader.writeUInt16LE(0, 28);
      filenameBytes.copy(localHeader, 30);
      
      localHeaders.push(localHeader);
      localHeaders.push(compressed);
      
      // 中央目录头
      const centralHeader = Buffer.alloc(46 + filenameBytes.length);
      centralHeader.writeUInt32LE(0x02014b50, 0);
      centralHeader.writeUInt16LE(20, 4);
      centralHeader.writeUInt16LE(20, 6);
      centralHeader.writeUInt16LE(0x0800, 8);
      centralHeader.writeUInt16LE(8, 10);
      centralHeader.writeUInt16LE(0, 12);
      centralHeader.writeUInt16LE(0, 14);
      centralHeader.writeUInt32LE(0, 16);
      centralHeader.writeUInt32LE(compressed.length, 20);
      centralHeader.writeUInt32LE(inputData.length, 24);
      centralHeader.writeUInt16LE(filenameBytes.length, 28);
      centralHeader.writeUInt16LE(0, 30);
      centralHeader.writeUInt16LE(0, 32);
      centralHeader.writeUInt16LE(0, 34);
      centralHeader.writeUInt16LE(0, 36);
      centralHeader.writeUInt32LE(0, 38);
      centralHeader.writeUInt32LE(offset, 42);
      filenameBytes.copy(centralHeader, 46);
      
      centralHeaders.push(centralHeader);
      offset += localHeader.length + compressed.length;
    }
    
    // 中央目录
    const centralDirectory = Buffer.concat(centralHeaders);
    
    // 结束记录
    const endRecord = Buffer.alloc(22);
    endRecord.writeUInt32LE(0x06054b50, 0);
    endRecord.writeUInt16LE(0, 4);
    endRecord.writeUInt16LE(0, 6);
    endRecord.writeUInt16LE(entries.length, 8);
    endRecord.writeUInt16LE(entries.length, 10);
    endRecord.writeUInt32LE(centralDirectory.length, 12);
    endRecord.writeUInt32LE(offset, 16);
    endRecord.writeUInt16LE(0, 20);
    
    // 合并所有数据
    const zipBuffer = Buffer.concat([...localHeaders, centralDirectory, endRecord]);
    
    // 写入文件
    await fs.promises.writeFile(outputPath, zipBuffer);
    
    return {
      success: true,
      data: zipBuffer,
      filesCount: entries.length,
      totalSize: totalSize,
      compressedSize: zipBuffer.length
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      filesCount: 0,
      totalSize: 0,
      compressedSize: 0
    };
  }
}

/**
 * 解压 Zip 文件到目录
 * @param zipPath - Zip 文件路径
 * @param outputDir - 输出目录
 * @param options - 解压选项
 * @returns 解压结果
 */
export async function zipExtractFile(
  zipPath: string,
  outputDir: string,
  options: ZipOptions = {}
): Promise<UnzipResult> {
  try {
    const zipData = await fs.promises.readFile(zipPath);
    const result = zipExtract(zipData, options);
    
    if (result.success && result.files) {
      // 确保输出目录存在
      await fs.promises.mkdir(outputDir, { recursive: true });
      
      // 写入所有文件
      for (const file of result.files) {
        const filePath = path.join(outputDir, file.name);
        const dirPath = path.dirname(filePath);
        await fs.promises.mkdir(dirPath, { recursive: true });
        await fs.promises.writeFile(filePath, file.data);
      }
    }
    
    return result;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      filesCount: 0
    };
  }
}

/**
 * 将目录打包为 Zip
 * @param inputDir - 输入目录
 * @param outputPath - 输出 Zip 文件路径
 * @param options - 压缩选项
 * @returns Zip 结果
 */
export async function zipDirectory(
  inputDir: string,
  outputPath: string,
  options: ZipOptions = {}
): Promise<ZipResult> {
  try {
    const entries: ZipEntry[] = [];
    
    // 递归读取目录
    async function readDir(dir: string, baseDir: string) {
      const items = await fs.promises.readdir(dir, { withFileTypes: true });
      
      for (const item of items) {
        const fullPath = path.join(dir, item.name);
        const relativePath = path.relative(baseDir, fullPath);
        
        if (item.isDirectory()) {
          await readDir(fullPath, baseDir);
        } else {
          const data = await fs.promises.readFile(fullPath);
          entries.push({
            name: relativePath,
            data: data
          });
        }
      }
    }
    
    await readDir(inputDir, inputDir);
    
    // 创建 Zip
    return await zipCreateFile(entries, outputPath, options);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      filesCount: 0,
      totalSize: 0,
      compressedSize: 0
    };
  }
}

// ============== 工具函数 ==============

/**
 * 格式化字节大小
 * @param bytes - 字节数
 * @returns 格式化后的大小字符串
 */
export function formatBytes(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let unitIndex = 0;
  let size = bytes;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(2)} ${units[unitIndex]}`;
}

/**
 * 计算压缩率百分比
 * @param ratio - 压缩比率
 * @returns 压缩率百分比字符串
 */
export function formatCompressionRatio(ratio: number): string {
  return `${((1 - ratio) * 100).toFixed(2)}%`;
}

// ============== 导出 ==============

export default {
  // Gzip
  gzipCompress,
  gzipDecompress,
  gzipCompressFile,
  gzipDecompressFile,
  gzipStreamCompress,
  gzipStreamDecompress,
  
  // Deflate
  deflateCompress,
  deflateDecompress,
  deflateCompressFile,
  deflateDecompressFile,
  deflateStreamCompress,
  deflateStreamDecompress,
  
  // Zip
  zipCreate,
  zipExtract,
  zipCreateFile,
  zipExtractFile,
  zipDirectory,
  
  // 流式文件
  compressFileStream,
  decompressFileStream,
  
  // 工具
  formatBytes,
  formatCompressionRatio
};
