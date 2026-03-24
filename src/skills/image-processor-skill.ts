/**
 * 图片处理技能 - Image Processor Skill (NOVA)
 * 
 * 功能:
 * 1. 图片压缩 (质量调整)
 * 2. 格式转换 (PNG/JPG/WebP)
 * 3. 尺寸调整 (缩放/裁剪)
 * 
 * @author Axon
 * @version 1.0.0
 * @module NOVA (NOVA Visual Assistant)
 */

import sharp = require('sharp');
import * as fs from 'fs';
import * as path from 'path';

// ============== 类型定义 ==============

/**
 * 图片格式
 */
export type ImageFormat = 'png' | 'jpeg' | 'webp' | 'gif' | 'avif';

/**
 * 压缩配置
 */
export interface CompressConfig {
  /** 输出格式 */
  format?: ImageFormat;
  /** 质量 (0-100, 默认 80) */
  quality?: number;
  /** PNG 压缩级别 (0-9, 默认 6) */
  compressionLevel?: number;
  /** WebP 压缩效率 (默认 true) */
  effort?: number;
}

/**
 * 尺寸调整配置
 */
export interface ResizeConfig {
  /** 目标宽度 (像素) */
  width?: number;
  /** 目标高度 (像素) */
  height?: number;
  /** 保持宽高比 (默认 true) */
  maintainAspectRatio?: boolean;
  /** 裁剪模式 */
  fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
  /** 裁剪位置 */
  position?: 'center' | 'top' | 'bottom' | 'left' | 'right' | 'top left' | 'top right' | 'bottom left' | 'bottom right';
}

/**
 * 裁剪配置
 */
export interface CropConfig {
  /** 裁剪区域宽度 (像素) */
  width: number;
  /** 裁剪区域高度 (像素) */
  height: number;
  /** 裁剪区域左上角 X 坐标 */
  left: number;
  /** 裁剪区域左上角 Y 坐标 */
  top: number;
}

/**
 * 图片信息
 */
export interface ImageInfo {
  /** 文件路径 */
  path: string;
  /** 格式 */
  format: string;
  /** 宽度 (像素) */
  width: number;
  /** 高度 (像素) */
  height: number;
  /** 文件大小 (字节) */
  size: number;
  /** 颜色空间 */
  space?: string;
  /** 是否有 alpha 通道 */
  hasAlpha?: boolean;
}

/**
 * 处理结果
 */
export interface ProcessResult {
  /** 输出文件路径 */
  outputPath: string;
  /** 原始文件大小 (字节) */
  originalSize: number;
  /** 处理后文件大小 (字节) */
  processedSize: number;
  /** 压缩率 (%) */
  compressionRatio: number;
  /** 输出格式 */
  format: string;
  /** 输出宽度 */
  width: number;
  /** 输出高度 */
  height: number;
}

// ============== 图片处理类 ==============

/**
 * 图片处理器
 */
export class ImageProcessor {
  private inputPath: string;
  private processor: sharp.Sharp;

  constructor(inputPath: string) {
    if (!fs.existsSync(inputPath)) {
      throw new Error(`文件不存在：${inputPath}`);
    }
    
    this.inputPath = inputPath;
    this.processor = sharp(inputPath);
  }

  /**
   * 获取图片信息
   */
  async getInfo(): Promise<ImageInfo> {
    const metadata = await this.processor.metadata();
    const stats = fs.statSync(this.inputPath);

    return {
      path: this.inputPath,
      format: metadata.format || 'unknown',
      width: metadata.width || 0,
      height: metadata.height || 0,
      size: stats.size,
      space: metadata.space,
      hasAlpha: metadata.hasAlpha
    };
  }

  /**
   * 压缩图片
   */
  async compress(outputPath: string, config: CompressConfig = {}): Promise<ProcessResult> {
    const originalSize = fs.statSync(this.inputPath).size;
    const format = config.format || this.getFormatFromPath(outputPath);
    
    let processor = this.processor;

    // 应用格式转换和压缩
    switch (format) {
      case 'jpeg':
        processor = processor.jpeg({
          quality: config.quality || 80,
          progressive: true,
          mozjpeg: true
        });
        break;
      case 'png':
        processor = processor.png({
          compressionLevel: config.compressionLevel ?? 6,
          adaptiveFiltering: true
        });
        break;
      case 'webp':
        processor = processor.webp({
          quality: config.quality || 80,
          effort: config.effort ?? 4
        });
        break;
      case 'avif':
        processor = processor.avif({
          quality: config.quality || 80,
          effort: config.effort ?? 4
        });
        break;
      default:
        throw new Error(`不支持的格式：${format}`);
    }

    // 确保输出目录存在
    this.ensureDirectory(outputPath);

    // 处理并保存
    await processor.toFile(outputPath);

    const processedSize = fs.statSync(outputPath).size;
    const metadata = await sharp(outputPath).metadata();

    return {
      outputPath,
      originalSize,
      processedSize,
      compressionRatio: ((originalSize - processedSize) / originalSize) * 100,
      format: format,
      width: metadata.width || 0,
      height: metadata.height || 0
    };
  }

  /**
   * 调整尺寸
   */
  async resize(outputPath: string, config: ResizeConfig): Promise<ProcessResult> {
    const originalSize = fs.statSync(this.inputPath).size;
    
    let processor = this.processor;

    // 调整尺寸
    if (config.width || config.height) {
      processor = processor.resize({
        width: config.width,
        height: config.height,
        fit: config.fit || 'cover',
        position: config.position || 'center',
        withoutEnlargement: true,
        withoutReduction: false
      });
    }

    // 确保输出目录存在
    this.ensureDirectory(outputPath);

    // 处理并保存
    await processor.toFile(outputPath);

    const processedSize = fs.statSync(outputPath).size;
    const metadata = await sharp(outputPath).metadata();

    return {
      outputPath,
      originalSize,
      processedSize,
      compressionRatio: ((originalSize - processedSize) / originalSize) * 100,
      format: metadata.format || 'unknown',
      width: metadata.width || 0,
      height: metadata.height || 0
    };
  }

  /**
   * 裁剪图片
   */
  async crop(outputPath: string, config: CropConfig): Promise<ProcessResult> {
    const originalSize = fs.statSync(this.inputPath).size;

    const processor = this.processor.extract({
      left: config.left,
      top: config.top,
      width: config.width,
      height: config.height
    });

    // 确保输出目录存在
    this.ensureDirectory(outputPath);

    // 处理并保存
    await processor.toFile(outputPath);

    const processedSize = fs.statSync(outputPath).size;
    const metadata = await sharp(outputPath).metadata();

    return {
      outputPath,
      originalSize,
      processedSize,
      compressionRatio: ((originalSize - processedSize) / originalSize) * 100,
      format: metadata.format || 'unknown',
      width: metadata.width || 0,
      height: metadata.height || 0
    };
  }

  /**
   * 转换格式
   */
  async convert(outputPath: string, format: ImageFormat): Promise<ProcessResult> {
    return this.compress(outputPath, { format, quality: 100 });
  }

  /**
   * 链式处理 (压缩 + 调整尺寸)
   */
  async process(
    outputPath: string,
    resizeConfig?: ResizeConfig,
    compressConfig?: CompressConfig
  ): Promise<ProcessResult> {
    const originalSize = fs.statSync(this.inputPath).size;
    const format = compressConfig?.format || this.getFormatFromPath(outputPath);
    
    let processor = this.processor;

    // 先调整尺寸
    if (resizeConfig && (resizeConfig.width || resizeConfig.height)) {
      processor = processor.resize({
        width: resizeConfig.width,
        height: resizeConfig.height,
        fit: resizeConfig.fit || 'cover',
        position: resizeConfig.position || 'center',
        withoutEnlargement: true
      });
    }

    // 再压缩/转换格式
    switch (format) {
      case 'jpeg':
        processor = processor.jpeg({
          quality: compressConfig?.quality || 80,
          progressive: true,
          mozjpeg: true
        });
        break;
      case 'png':
        processor = processor.png({
          compressionLevel: compressConfig?.compressionLevel ?? 6
        });
        break;
      case 'webp':
        processor = processor.webp({
          quality: compressConfig?.quality || 80,
          effort: compressConfig?.effort ?? 4
        });
        break;
      case 'avif':
        processor = processor.avif({
          quality: compressConfig?.quality || 80,
          effort: compressConfig?.effort ?? 4
        });
        break;
      default:
        throw new Error(`不支持的格式：${format}`);
    }

    // 确保输出目录存在
    this.ensureDirectory(outputPath);

    // 处理并保存
    await processor.toFile(outputPath);

    const processedSize = fs.statSync(outputPath).size;
    const metadata = await sharp(outputPath).metadata();

    return {
      outputPath,
      originalSize,
      processedSize,
      compressionRatio: ((originalSize - processedSize) / originalSize) * 100,
      format: format,
      width: metadata.width || 0,
      height: metadata.height || 0
    };
  }

  /**
   * 从文件路径推断格式
   */
  private getFormatFromPath(filePath: string): ImageFormat {
    const ext = path.extname(filePath).toLowerCase().slice(1);
    if (['jpg', 'jpeg'].includes(ext)) return 'jpeg';
    if (['png'].includes(ext)) return 'png';
    if (['webp'].includes(ext)) return 'webp';
    if (['gif'].includes(ext)) return 'gif';
    if (['avif'].includes(ext)) return 'avif';
    return 'jpeg'; // 默认
  }

  /**
   * 确保目录存在
   */
  private ensureDirectory(filePath: string): void {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
}

// ============== 便捷函数 ==============

/**
 * 获取图片信息 (便捷函数)
 */
export async function getImageInfo(inputPath: string): Promise<ImageInfo> {
  const processor = new ImageProcessor(inputPath);
  return processor.getInfo();
}

/**
 * 压缩图片 (便捷函数)
 */
export async function compressImage(
  inputPath: string,
  outputPath: string,
  config: CompressConfig = {}
): Promise<ProcessResult> {
  const processor = new ImageProcessor(inputPath);
  return processor.compress(outputPath, config);
}

/**
 * 调整图片尺寸 (便捷函数)
 */
export async function resizeImage(
  inputPath: string,
  outputPath: string,
  config: ResizeConfig
): Promise<ProcessResult> {
  const processor = new ImageProcessor(inputPath);
  return processor.resize(outputPath, config);
}

/**
 * 裁剪图片 (便捷函数)
 */
export async function cropImage(
  inputPath: string,
  outputPath: string,
  config: CropConfig
): Promise<ProcessResult> {
  const processor = new ImageProcessor(inputPath);
  return processor.crop(outputPath, config);
}

/**
 * 转换图片格式 (便捷函数)
 */
export async function convertImage(
  inputPath: string,
  outputPath: string,
  format: ImageFormat
): Promise<ProcessResult> {
  const processor = new ImageProcessor(inputPath);
  return processor.convert(outputPath, format);
}

/**
 * 链式处理图片 (便捷函数)
 */
export async function processImage(
  inputPath: string,
  outputPath: string,
  resizeConfig?: ResizeConfig,
  compressConfig?: CompressConfig
): Promise<ProcessResult> {
  const processor = new ImageProcessor(inputPath);
  return processor.process(outputPath, resizeConfig, compressConfig);
}

/**
 * 批量处理图片
 */
export async function batchProcessImages(
  inputPaths: string[],
  outputDir: string,
  resizeConfig?: ResizeConfig,
  compressConfig?: CompressConfig
): Promise<ProcessResult[]> {
  const results: ProcessResult[] = [];

  for (const inputPath of inputPaths) {
    const fileName = path.basename(inputPath);
    const outputPath = path.join(outputDir, fileName);
    
    try {
      const result = await processImage(inputPath, outputPath, resizeConfig, compressConfig);
      results.push(result);
      console.log(`✅ 处理完成：${inputPath} → ${outputPath}`);
    } catch (error) {
      console.error(`❌ 处理失败：${inputPath}`, error);
      results.push({
        outputPath: '',
        originalSize: 0,
        processedSize: 0,
        compressionRatio: 0,
        format: '',
        width: 0,
        height: 0
      });
    }
  }

  return results;
}

// ============== 导出 ==============

export default {
  ImageProcessor,
  getImageInfo,
  compressImage,
  resizeImage,
  cropImage,
  convertImage,
  processImage,
  batchProcessImages
};
