/**
 * 图片处理工具技能 - Image Utils Skill (NOVA)
 * 
 * 功能:
 * 1. 图片压缩 (质量调整)
 * 2. 格式转换 (PNG/JPG/WebP/GIF/AVIF)
 * 3. 水印添加 (文字/图片水印)
 * 
 * @author Axon
 * @version 1.0.0
 * @module NOVA
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
  /** WebP/AVIF 压缩效率 (0-6, 默认 4) */
  effort?: number;
}

/**
 * 水印位置
 */
export type WatermarkPosition = 
  | 'top-left' 
  | 'top-right' 
  | 'bottom-left' 
  | 'bottom-right' 
  | 'center'
  | 'top-center'
  | 'bottom-center'
  | 'left-center'
  | 'right-center';

/**
 * 文字水印配置
 */
export interface TextWatermarkConfig {
  /** 水印类型 */
  type: 'text';
  /** 水印文字 */
  text: string;
  /** 字体大小 (像素, 默认 24) */
  fontSize?: number;
  /** 字体颜色 (默认白色) */
  color?: string;
  /** 字体粗细 (默认 'bold') */
  fontWeight?: 'normal' | 'bold' | 'light' | number;
  /** 字体家族 (默认 sans-serif) */
  fontFamily?: string;
  /** 位置 (默认 'bottom-right') */
  position?: WatermarkPosition;
  /** 边距 (像素, 默认 10) */
  margin?: number;
  /** 透明度 (0-1, 默认 0.7) */
  opacity?: number;
  /** 旋转角度 (度, 默认 0) */
  rotation?: number;
}

/**
 * 图片水印配置
 */
export interface ImageWatermarkConfig {
  /** 水印类型 */
  type: 'image';
  /** 水印图片路径 */
  imagePath: string;
  /** 水印宽度 (像素, 默认原图宽度) */
  width?: number;
  /** 水印高度 (像素, 默认按比例) */
  height?: number;
  /** 位置 (默认 'bottom-right') */
  position?: WatermarkPosition;
  /** 边距 (像素, 默认 10) */
  margin?: number;
  /** 透明度 (0-1, 默认 0.7) */
  opacity?: number;
  /** 旋转角度 (度, 默认 0) */
  rotation?: number;
}

/**
 * 水印配置
 */
export type WatermarkConfig = TextWatermarkConfig | ImageWatermarkConfig;

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
export class ImageUtils {
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
      case 'gif':
        processor = processor.gif();
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
   * 转换格式
   */
  async convert(outputPath: string, format: ImageFormat): Promise<ProcessResult> {
    return this.compress(outputPath, { format, quality: 100 });
  }

  /**
   * 添加水印
   */
  async addWatermark(outputPath: string, config: WatermarkConfig): Promise<ProcessResult> {
    const originalSize = fs.statSync(this.inputPath).size;
    const baseMetadata = await this.processor.metadata();
    const baseWidth = baseMetadata.width || 0;
    const baseHeight = baseMetadata.height || 0;

    let watermarkBuffer: Buffer;

    // 创建水印
    if (config.type === 'text') {
      watermarkBuffer = await this.createTextWatermark(config, baseWidth, baseHeight);
    } else {
      watermarkBuffer = await this.createImageWatermark(config);
    }

    // 计算水印位置
    const watermarkMetadata = await sharp(watermarkBuffer).metadata();
    const watermarkWidth = watermarkMetadata.width || 0;
    const watermarkHeight = watermarkMetadata.height || 0;
    
    const position = this.calculatePosition(
      config.position || 'bottom-right',
      baseWidth,
      baseHeight,
      watermarkWidth,
      watermarkHeight,
      config.margin || 10
    );

    // 合成水印
    const processor = this.processor.composite([
      {
        input: watermarkBuffer,
        ...position
      }
    ]);

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
   * 创建文字水印
   */
  private async createTextWatermark(
    config: TextWatermarkConfig,
    baseWidth: number,
    baseHeight: number
  ): Promise<Buffer> {
    const fontSize = config.fontSize || 24;
    const color = config.color || '#ffffff';
    const fontWeight = config.fontWeight || 'bold';
    const fontFamily = config.fontFamily || 'sans-serif';
    
    // 创建 SVG 文字水印
    const svgText = `
      <svg width="${baseWidth}" height="${baseHeight}" xmlns="http://www.w3.org/2000/svg">
        <text
          x="50%"
          y="50%"
          font-size="${fontSize}"
          font-weight="${fontWeight}"
          font-family="${fontFamily}"
          fill="${color}"
          text-anchor="middle"
          dominant-baseline="middle"
          transform="rotate(${config.rotation || 0}, ${baseWidth / 2}, ${baseHeight / 2})"
          style="opacity: ${config.opacity || 0.7}"
        >
          ${this.escapeXml(config.text)}
        </text>
      </svg>
    `;

    return Buffer.from(svgText);
  }

  /**
   * 创建图片水印
   */
  private async createImageWatermark(config: ImageWatermarkConfig): Promise<Buffer> {
    if (!fs.existsSync(config.imagePath)) {
      throw new Error(`水印图片不存在：${config.imagePath}`);
    }

    let processor = sharp(config.imagePath);

    // 调整水印尺寸
    if (config.width || config.height) {
      processor = processor.resize({
        width: config.width,
        height: config.height,
        fit: 'contain',
        withoutEnlargement: true
      });
    }

    // 调整透明度 - 先转换为带 alpha 通道的格式
    if (config.opacity !== undefined && config.opacity < 1) {
      processor = processor.ensureAlpha();
    }

    // 旋转
    if (config.rotation) {
      processor = processor.rotate(config.rotation, {
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      });
    }

    return await processor.toBuffer();
  }

  /**
   * 计算水印位置
   */
  private calculatePosition(
    position: WatermarkPosition,
    baseWidth: number,
    baseHeight: number,
    watermarkWidth: number,
    watermarkHeight: number,
    margin: number
  ): { top?: number; left?: number; bottom?: number; right?: number } {
    switch (position) {
      case 'top-left':
        return { top: margin, left: margin };
      case 'top-right':
        return { top: margin, right: margin };
      case 'top-center':
        return { top: margin, left: (baseWidth - watermarkWidth) / 2 };
      case 'bottom-left':
        return { bottom: margin, left: margin };
      case 'bottom-right':
        return { bottom: margin, right: margin };
      case 'bottom-center':
        return { bottom: margin, left: (baseWidth - watermarkWidth) / 2 };
      case 'left-center':
        return { top: (baseHeight - watermarkHeight) / 2, left: margin };
      case 'right-center':
        return { top: (baseHeight - watermarkHeight) / 2, right: margin };
      case 'center':
      default:
        return { top: (baseHeight - watermarkHeight) / 2, left: (baseWidth - watermarkWidth) / 2 };
    }
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

  /**
   * XML 转义
   */
  private escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}

// ============== 便捷函数 ==============

/**
 * 获取图片信息
 */
export async function getImageInfo(inputPath: string): Promise<ImageInfo> {
  const utils = new ImageUtils(inputPath);
  return utils.getInfo();
}

/**
 * 压缩图片
 */
export async function compressImage(
  inputPath: string,
  outputPath: string,
  config: CompressConfig = {}
): Promise<ProcessResult> {
  const utils = new ImageUtils(inputPath);
  return utils.compress(outputPath, config);
}

/**
 * 转换图片格式
 */
export async function convertImage(
  inputPath: string,
  outputPath: string,
  format: ImageFormat
): Promise<ProcessResult> {
  const utils = new ImageUtils(inputPath);
  return utils.convert(outputPath, format);
}

/**
 * 添加文字水印
 */
export async function addTextWatermark(
  inputPath: string,
  outputPath: string,
  text: string,
  config?: Partial<Omit<TextWatermarkConfig, 'type' | 'text'>>
): Promise<ProcessResult> {
  const utils = new ImageUtils(inputPath);
  return utils.addWatermark(outputPath, {
    type: 'text',
    text,
    ...config
  });
}

/**
 * 添加图片水印
 */
export async function addImageWatermark(
  inputPath: string,
  outputPath: string,
  watermarkPath: string,
  config?: Partial<Omit<ImageWatermarkConfig, 'type' | 'imagePath'>>
): Promise<ProcessResult> {
  const utils = new ImageUtils(inputPath);
  return utils.addWatermark(outputPath, {
    type: 'image',
    imagePath: watermarkPath,
    ...config
  });
}

/**
 * 批量压缩图片
 */
export async function batchCompressImages(
  inputPaths: string[],
  outputDir: string,
  config: CompressConfig = {}
): Promise<ProcessResult[]> {
  const results: ProcessResult[] = [];

  for (const inputPath of inputPaths) {
    const fileName = path.basename(inputPath);
    const outputPath = path.join(outputDir, fileName);
    
    try {
      const result = await compressImage(inputPath, outputPath, config);
      results.push(result);
      console.log(`✅ 压缩完成：${inputPath} → ${outputPath}`);
    } catch (error) {
      console.error(`❌ 压缩失败：${inputPath}`, error);
    }
  }

  return results;
}

/**
 * 批量添加水印
 */
export async function batchAddWatermark(
  inputPaths: string[],
  outputDir: string,
  config: WatermarkConfig
): Promise<ProcessResult[]> {
  const results: ProcessResult[] = [];

  for (const inputPath of inputPaths) {
    const fileName = path.basename(inputPath);
    const outputPath = path.join(outputDir, fileName);
    
    try {
      const utils = new ImageUtils(inputPath);
      const result = await utils.addWatermark(outputPath, config);
      results.push(result);
      console.log(`✅ 水印完成：${inputPath} → ${outputPath}`);
    } catch (error) {
      console.error(`❌ 水印失败：${inputPath}`, error);
    }
  }

  return results;
}

// ============== 导出 ==============

export default {
  ImageUtils,
  getImageInfo,
  compressImage,
  convertImage,
  addTextWatermark,
  addImageWatermark,
  batchCompressImages,
  batchAddWatermark
};
