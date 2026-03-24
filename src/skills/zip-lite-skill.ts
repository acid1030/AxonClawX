/**
 * ZIP Lite Skill - 精简版 ZIP 压缩/解压
 * 
 * 功能:
 * 1. 文件/目录压缩为 ZIP
 * 2. ZIP 解压到指定目录
 * 
 * @author Axon
 * @version 1.0.0
 * @dependencies archiver, yauzl (需安装: npm install archiver yauzl)
 */

import * as fs from 'fs';
import * as path from 'path';
import archiver from 'archiver';
import yauzl from 'yauzl';

// ============== 类型定义 ==============

export interface CompressionOptions {
  /** 输出 ZIP 文件路径 */
  outputPath: string;
  /** 是否覆盖已存在的文件 */
  overwrite?: boolean;
  /** 压缩级别 (0-9, 默认 6) */
  level?: number;
  /** 排除的文件/目录模式 */
  exclude?: string[];
}

export interface ExtractionOptions {
  /** 解压目标目录 */
  outputDir: string;
  /** 是否覆盖已存在的文件 */
  overwrite?: boolean;
}

export interface CompressionResult {
  /** 输出 ZIP 文件路径 */
  outputPath: string;
  /** 压缩后文件大小 (bytes) */
  size: number;
  /** 处理的文件数量 */
  filesCount: number;
}

export interface ExtractionResult {
  /** 解压的文件数量 */
  filesExtracted: number;
  /** 解压目录路径 */
  outputDir: string;
}

// ============== 辅助函数 ==============

/**
 * 验证输入路径是否存在
 */
function validateInput(inputPath: string): void {
  if (!fs.existsSync(inputPath)) {
    throw new Error(`输入路径不存在：${inputPath}`);
  }
}

/**
 * 确保输出目录存在
 */
function ensureOutputDir(outputPath: string): void {
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * 确保解压目录存在
 */
function ensureExtractionDir(outputDir: string): void {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
}

// ============== 核心功能 ==============

/**
 * 压缩文件或目录为 ZIP
 * 
 * @param inputPath 要压缩的文件或目录路径
 * @param options 压缩选项
 * @returns 压缩结果
 */
export async function compress(
  inputPath: string,
  options: CompressionOptions
): Promise<CompressionResult> {
  validateInput(inputPath);
  ensureOutputDir(options.outputPath);
  
  // 检查输出文件是否已存在
  if (fs.existsSync(options.outputPath) && !options.overwrite) {
    throw new Error(`输出文件已存在：${options.outputPath} (使用 overwrite: true 覆盖)`);
  }
  
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(options.outputPath);
    const archive = archiver('zip', {
      zlib: { level: options.level ?? 6 }
    });
    
    let filesCount = 0;
    
    // 监听完成事件
    output.on('close', () => {
      resolve({
        outputPath: options.outputPath,
        size: archive.pointer(),
        filesCount
      });
    });
    
    // 监听错误
    archive.on('error', (err) => {
      reject(err);
    });
    
    // 监听文件添加
    archive.on('entry', () => {
      filesCount++;
    });
    
    // 连接输出流
    archive.pipe(output);
    
    // 添加文件或目录
    const absolutePath = path.resolve(inputPath);
    const stats = fs.statSync(absolutePath);
    
    if (stats.isFile()) {
      archive.file(absolutePath, { name: path.basename(inputPath) });
    } else if (stats.isDirectory()) {
      // 处理排除模式
      const globPatterns = options.exclude?.map(pattern => `!${pattern}`) || [];
      archive.directory(absolutePath, false, {
        // 自定义文件过滤
        filter: (filepath) => {
          const relativePath = path.relative(absolutePath, filepath);
          if (options.exclude) {
            return !options.exclude.some(pattern => 
              relativePath.includes(pattern) || path.basename(relativePath).includes(pattern)
            );
          }
          return true;
        }
      });
    }
    
    // 完成压缩
    archive.finalize();
  });
}

/**
 * 解压 ZIP 文件到指定目录
 * 
 * @param zipPath ZIP 文件路径
 * @param options 解压选项
 * @returns 解压结果
 */
export async function decompress(
  zipPath: string,
  options: ExtractionOptions
): Promise<ExtractionResult> {
  validateInput(zipPath);
  ensureExtractionDir(options.outputDir);
  
  const absoluteZipPath = path.resolve(zipPath);
  const absoluteOutputDir = path.resolve(options.outputDir);
  
  // 验证 ZIP 文件扩展名
  if (path.extname(absoluteZipPath).toLowerCase() !== '.zip') {
    throw new Error(`文件不是 ZIP 格式：${zipPath}`);
  }
  
  return new Promise((resolve, reject) => {
    yauzl.open(absoluteZipPath, { lazyEntries: true }, (err, zipfile) => {
      if (err) {
        reject(err);
        return;
      }
      
      let filesExtracted = 0;
      const totalEntries = zipfile.entryCount;
      
      zipfile.on('entry', (entry) => {
        const entryPath = path.join(absoluteOutputDir, entry.fileName);
        
        // 跳过目录条目 (会在创建文件时自动创建)
        if (/\/$/.test(entry.fileName)) {
          fs.mkdirSync(entryPath, { recursive: true });
          zipfile.readEntry();
          return;
        }
        
        // 确保父目录存在
        const entryDir = path.dirname(entryPath);
        if (!fs.existsSync(entryDir)) {
          fs.mkdirSync(entryDir, { recursive: true });
        }
        
        // 检查文件是否已存在
        if (fs.existsSync(entryPath) && !options.overwrite) {
          console.warn(`跳过已存在文件：${entryPath} (使用 overwrite: true 覆盖)`);
          zipfile.readEntry();
          return;
        }
        
        // 解压文件
        zipfile.openReadStream(entry, (err, readStream) => {
          if (err) {
            reject(err);
            return;
          }
          
          const writeStream = fs.createWriteStream(entryPath);
          
          readStream.on('end', () => {
            filesExtracted++;
            zipfile.readEntry();
          });
          
          readStream.pipe(writeStream);
        });
      });
      
      zipfile.on('end', () => {
        resolve({
          filesExtracted,
          outputDir: absoluteOutputDir
        });
      });
      
      zipfile.on('error', reject);
      
      // 开始读取第一个条目
      zipfile.readEntry();
    });
  });
}

/**
 * 批量压缩多个文件
 * 
 * @param inputPaths 要压缩的文件路径数组
 * @param options 压缩选项
 * @returns 压缩结果
 */
export async function compressBatch(
  inputPaths: string[],
  options: CompressionOptions
): Promise<CompressionResult> {
  ensureOutputDir(options.outputPath);
  
  if (fs.existsSync(options.outputPath) && !options.overwrite) {
    throw new Error(`输出文件已存在：${options.outputPath} (使用 overwrite: true 覆盖)`);
  }
  
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(options.outputPath);
    const archive = archiver('zip', {
      zlib: { level: options.level ?? 6 }
    });
    
    let filesCount = 0;
    
    output.on('close', () => {
      resolve({
        outputPath: options.outputPath,
        size: archive.pointer(),
        filesCount
      });
    });
    
    archive.on('error', reject);
    archive.on('entry', () => filesCount++);
    archive.pipe(output);
    
    // 添加所有文件
    inputPaths.forEach(inputPath => {
      validateInput(inputPath);
      const absolutePath = path.resolve(inputPath);
      archive.file(absolutePath, { name: path.basename(inputPath) });
    });
    
    archive.finalize();
  });
}

// ============== 导出 ==============

export default {
  compress,
  decompress,
  compressBatch
};
