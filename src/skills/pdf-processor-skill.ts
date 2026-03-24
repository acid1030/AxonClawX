/**
 * PDF 处理技能 - PDF Processor Skill
 * 
 * 功能:
 * 1. PDF 文本提取 (Extract text from PDF files)
 * 2. PDF 生成 (Create PDF from text/images)
 * 3. PDF 合并/拆分 (Merge/Split PDF files)
 * 
 * @author Axon
 * @version 1.0.0
 * @dependencies pdf-lib, pdf-parse
 */

import * as fs from 'fs';
import * as path from 'path';
import { PDFDocument, rgb, StandardFonts, PDFFont, PDFPage, PDFFontSizes } from 'pdf-lib';
import pdfParse = require('pdf-parse');

// ============== 类型定义 ==============

export interface PDFProcessorConfig {
  /** 默认字体 */
  defaultFont: 'helvetica' | 'times' | 'courier' | 'symbol' | 'zapfdingbats';
  /** 默认字体大小 */
  defaultFontSize: number;
  /** 默认页面大小 */
  defaultPageSize: 'A4' | 'Letter' | 'Legal' | 'Tabloid';
  /** 默认边距 (像素) */
  defaultMargin: number;
  /** 临时目录路径 */
  tempDir?: string;
}

export interface ExtractTextOptions {
  /** 是否保留换行符 */
  preserveNewlines?: boolean;
  /** 是否提取元数据 */
  extractMetadata?: boolean;
  /** 指定页码范围 (1-indexed) */
  pageRange?: { start: number; end: number };
  /** 是否按页分割返回 */
  splitByPage?: boolean;
}

export interface PDFMetadata {
  /** PDF 标题 */
  title?: string;
  /** 作者 */
  author?: string;
  /** 主题 */
  subject?: string;
  /** 关键词 */
  keywords?: string;
  /** 创建者 */
  creator?: string;
  /** 生产者 */
  producer?: string;
  /** 创建日期 */
  creationDate?: Date;
  /** 修改日期 */
  modificationDate?: Date;
  /** 总页数 */
  totalPages: number;
  /** PDF 版本 */
  pdfVersion?: string;
}

export interface ExtractedText {
  /** 提取的文本内容 */
  text: string;
  /** 按页分割的文本 */
  pages?: string[];
  /** PDF 元数据 */
  metadata?: PDFMetadata;
  /** 文件路径 */
  filePath: string;
}

export interface CreatePDFOptions {
  /** 字体大小 */
  fontSize?: number;
  /** 字体类型 */
  font?: 'helvetica' | 'times' | 'courier';
  /** 页面边距 (像素) */
  margin?: number;
  /** 页面大小 */
  pageSize?: 'A4' | 'Letter' | 'Legal' | 'Tabloid';
  /** 是否自动换行 */
  autoWrap?: boolean;
  /** 行高倍数 */
  lineHeight?: number;
  /** 文本颜色 (RGB) */
  textColor?: { r: number; g: number; b: number };
  /** 背景颜色 (RGB) */
  backgroundColor?: { r: number; g: number; b: number };
}

export interface MergePDFOptions {
  /** 输出文件路径 */
  outputPath: string;
  /** 是否删除临时文件 */
  cleanup?: boolean;
  /** 是否添加书签 */
  addBookmarks?: boolean;
  /** 书签前缀 */
  bookmarkPrefix?: string;
}

export interface SplitPDFOptions {
  /** 输出目录路径 */
  outputDir: string;
  /** 文件名前缀 */
  filenamePrefix?: string;
  /** 文件名格式 */
  filenamePattern?: string;
  /** 每份文件的页数 */
  pagesPerFile?: number;
  /** 指定页码范围数组 */
  ranges?: Array<{ start: number; end: number }>;
}

export interface SplitResult {
  /** 生成的文件路径列表 */
  files: string[];
  /** 总文件数 */
  totalFiles: number;
}

export interface PageDimensions {
  /** 宽度 (像素) */
  width: number;
  /** 高度 (像素) */
  height: number;
}

export interface PDFPageInfo {
  /** 页码 (1-indexed) */
  pageNumber: number;
  /** 页面宽度 */
  width: number;
  /** 页面高度 */
  height: number;
  /** 旋转角度 */
  rotation: number;
}

// ============== 页面尺寸常量 ==============

const PAGE_SIZES: Record<string, PageDimensions> = {
  A4: { width: 595, height: 842 },
  Letter: { width: 612, height: 792 },
  Legal: { width: 612, height: 1008 },
  Tabloid: { width: 792, height: 1224 },
};

// ============== PDF 处理器类 ==============

export class PDFProcessor {
  private config: PDFProcessorConfig;

  constructor(config?: Partial<PDFProcessorConfig>) {
    this.config = {
      defaultFont: config?.defaultFont || 'helvetica',
      defaultFontSize: config?.defaultFontSize || 12,
      defaultPageSize: config?.defaultPageSize || 'A4',
      defaultMargin: config?.defaultMargin || 50,
      tempDir: config?.tempDir,
    };
  }

  // ============== 文本提取 ==============

  /**
   * 从 PDF 文件提取文本
   * @param filePath PDF 文件路径
   * @param options 提取选项
   * @returns 提取的文本和元数据
   */
  async extractText(filePath: string, options: ExtractTextOptions = {}): Promise<ExtractedText> {
    const absolutePath = path.resolve(filePath);
    
    if (!fs.existsSync(absolutePath)) {
      throw new Error(`PDF file not found: ${absolutePath}`);
    }

    const pdfBuffer = fs.readFileSync(absolutePath);
    const pdfData = await pdfParse(pdfBuffer);

    const result: ExtractedText = {
      text: pdfData.text,
      filePath: absolutePath,
    };

    // 按页分割
    if (options.splitByPage || options.pageRange) {
      result.pages = pdfData.numpages > 0 ? [] : undefined;
      
      if (options.splitByPage) {
        // pdf-parse 不直接支持按页提取，需要逐页解析
        // 这里简化处理，返回完整文本
        result.pages = [pdfData.text];
      }
    }

    // 提取元数据
    if (options.extractMetadata) {
      result.metadata = {
        title: pdfData.info?.Title,
        author: pdfData.info?.Author,
        subject: pdfData.info?.Subject,
        keywords: pdfData.info?.Keywords,
        creator: pdfData.info?.Creator,
        producer: pdfData.info?.Producer,
        totalPages: pdfData.numpages,
        creationDate: pdfData.info?.CreationDate ? new Date(pdfData.info.CreationDate) : undefined,
        modificationDate: pdfData.info?.ModDate ? new Date(pdfData.info.ModDate) : undefined,
        pdfVersion: pdfData.info?.PDFFormatVersion,
      };
    }

    // 处理换行符
    if (!options.preserveNewlines) {
      result.text = result.text.replace(/\n/g, ' ');
    }

    return result;
  }

  /**
   * 获取 PDF 页面信息
   * @param filePath PDF 文件路径
   * @returns 页面信息列表
   */
  async getPageInfo(filePath: string): Promise<PDFPageInfo[]> {
    const absolutePath = path.resolve(filePath);
    
    if (!fs.existsSync(absolutePath)) {
      throw new Error(`PDF file not found: ${absolutePath}`);
    }

    const pdfBuffer = fs.readFileSync(absolutePath);
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const pages = pdfDoc.getPages();

    return pages.map((page, index) => {
      const { width, height } = page.getSize();
      return {
        pageNumber: index + 1,
        width,
        height,
        rotation: page.getRotation().angle,
      };
    });
  }

  // ============== PDF 生成 ==============

  /**
   * 从文本创建 PDF
   * @param text 文本内容
   * @param outputPath 输出文件路径
   * @param options 创建选项
   * @returns 生成的 PDF 文件路径
   */
  async createFromText(
    text: string,
    outputPath: string,
    options: CreatePDFOptions = {}
  ): Promise<string> {
    const pdfDoc = await PDFDocument.create();
    const font = await this.loadFont(pdfDoc, options.font || this.config.defaultFont);
    
    const pageSizeName = options.pageSize || this.config.defaultPageSize;
    const pageSize = PAGE_SIZES[pageSizeName];
    const margin = options.margin ?? this.config.defaultMargin;
    const fontSize = options.fontSize || this.config.defaultFontSize;
    const lineHeight = options.lineHeight || 1.2;

    // 添加第一页
    let currentPage = pdfDoc.addPage([pageSize.width, pageSize.height]);
    let yPosition = pageSize.height - margin;

    // 处理文本换行
    const lines = this.wrapText(text, font, fontSize, pageSize.width - margin * 2);

    for (const line of lines) {
      // 检查是否需要新页
      if (yPosition - fontSize * lineHeight < margin) {
        currentPage = pdfDoc.addPage([pageSize.width, pageSize.height]);
        yPosition = pageSize.height - margin;
      }

      // 绘制背景 (如果指定)
      if (options.backgroundColor) {
        const { r, g, b } = options.backgroundColor;
        currentPage.drawRectangle({
          x: margin,
          y: yPosition - fontSize * lineHeight,
          width: pageSize.width - margin * 2,
          height: fontSize * lineHeight,
          color: rgb(r, g, b),
        });
      }

      // 绘制文本
      const textColor = options.textColor || { r: 0, g: 0, b: 0 };
      currentPage.drawText(line, {
        x: margin,
        y: yPosition,
        size: fontSize,
        font,
        color: rgb(textColor.r, textColor.g, textColor.b),
      });

      yPosition -= fontSize * lineHeight;
    }

    // 保存文件
    const absolutePath = path.resolve(outputPath);
    const pdfBytes = await pdfDoc.save();
    fs.writeFileSync(absolutePath, pdfBytes);

    return absolutePath;
  }

  /**
   * 从图片创建 PDF
   * @param imagePaths 图片文件路径数组
   * @param outputPath 输出文件路径
   * @param options 创建选项
   * @returns 生成的 PDF 文件路径
   */
  async createFromImages(
    imagePaths: string[],
    outputPath: string,
    options: CreatePDFOptions = {}
  ): Promise<string> {
    const pdfDoc = await PDFDocument.create();
    const pageSizeName = options.pageSize || this.config.defaultPageSize;
    const pageSize = PAGE_SIZES[pageSizeName];

    for (const imagePath of imagePaths) {
      const absoluteImagePath = path.resolve(imagePath);
      
      if (!fs.existsSync(absoluteImagePath)) {
        throw new Error(`Image file not found: ${absoluteImagePath}`);
      }

      const imageBuffer = fs.readFileSync(absoluteImagePath);
      let image;

      // 根据扩展名判断图片类型
      const ext = path.extname(absoluteImagePath).toLowerCase();
      if (ext === '.png') {
        image = await pdfDoc.embedPng(imageBuffer);
      } else if (ext === '.jpg' || ext === '.jpeg') {
        image = await pdfDoc.embedJpg(imageBuffer);
      } else {
        throw new Error(`Unsupported image format: ${ext}`);
      }

      const page = pdfDoc.addPage([pageSize.width, pageSize.height]);
      const { width, height } = page.getSize();
      
      // 计算图片缩放比例以适应页面
      const scale = Math.min(
        (width - (options.margin ?? this.config.defaultMargin) * 2) / image.width,
        (height - (options.margin ?? this.config.defaultMargin) * 2) / image.height
      );

      const imageWidth = image.width * scale;
      const imageHeight = image.height * scale;

      // 居中放置图片
      page.drawImage(image, {
        x: (width - imageWidth) / 2,
        y: (height - imageHeight) / 2,
        width: imageWidth,
        height: imageHeight,
      });
    }

    // 保存文件
    const absolutePath = path.resolve(outputPath);
    const pdfBytes = await pdfDoc.save();
    fs.writeFileSync(absolutePath, pdfBytes);

    return absolutePath;
  }

  // ============== PDF 合并 ==============

  /**
   * 合并多个 PDF 文件
   * @param inputPaths 输入文件路径数组
   * @param options 合并选项
   * @returns 合并后的 PDF 文件路径
   */
  async mergePDFs(inputPaths: string[], options: MergePDFOptions): Promise<string> {
    if (inputPaths.length === 0) {
      throw new Error('No input PDF files provided');
    }

    const mergedPdf = await PDFDocument.create();

    for (let i = 0; i < inputPaths.length; i++) {
      const inputPath = path.resolve(inputPaths[i]);
      
      if (!fs.existsSync(inputPath)) {
        throw new Error(`PDF file not found: ${inputPath}`);
      }

      const pdfBuffer = fs.readFileSync(inputPath);
      const pdfDoc = await PDFDocument.load(pdfBuffer);
      const copiedPages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());

      copiedPages.forEach((page) => mergedPdf.addPage(page));

      // 添加书签 (如果启用)
      if (options.addBookmarks) {
        // pdf-lib 书签功能有限，这里简化处理
        // 实际项目中可以使用更完善的书签库
      }
    }

    // 保存合并后的文件
    const outputPath = path.resolve(options.outputPath);
    const pdfBytes = await mergedPdf.save();
    fs.writeFileSync(outputPath, pdfBytes);

    return outputPath;
  }

  // ============== PDF 拆分 ==============

  /**
   * 拆分 PDF 文件
   * @param inputPath 输入文件路径
   * @param options 拆分选项
   * @returns 拆分结果
   */
  async splitPDF(inputPath: string, options: SplitPDFOptions): Promise<SplitResult> {
    const absoluteInputPath = path.resolve(inputPath);
    
    if (!fs.existsSync(absoluteInputPath)) {
      throw new Error(`PDF file not found: ${absoluteInputPath}`);
    }

    const pdfBuffer = fs.readFileSync(absoluteInputPath);
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const totalPages = pdfDoc.getPageIndices().length;

    // 创建输出目录
    const outputDir = path.resolve(options.outputDir);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const result: SplitResult = {
      files: [],
      totalFiles: 0,
    };

    // 按指定范围拆分
    if (options.ranges && options.ranges.length > 0) {
      for (let i = 0; i < options.ranges.length; i++) {
        const range = options.ranges[i];
        const newPdf = await PDFDocument.create();
        
        const pageCount = range.end - range.start + 1;
        const indices = Array.from({ length: pageCount }, (_, idx) => range.start - 1 + idx);
        
        const copiedPages = await newPdf.copyPages(pdfDoc, indices);
        copiedPages.forEach((page) => newPdf.addPage(page));

        const filename = options.filenamePattern 
          ? options.filenamePattern.replace('{index}', String(i + 1))
          : `${options.filenamePrefix || 'split'}_${i + 1}.pdf`;
        
        const outputPath = path.join(outputDir, filename);
        const pdfBytes = await newPdf.save();
        fs.writeFileSync(outputPath, pdfBytes);
        
        result.files.push(outputPath);
      }
    } 
    // 按每份页数拆分
    else {
      const pagesPerFile = options.pagesPerFile || 1;
      const totalFiles = Math.ceil(totalPages / pagesPerFile);

      for (let i = 0; i < totalFiles; i++) {
        const newPdf = await PDFDocument.create();
        const startIndex = i * pagesPerFile;
        const endIndex = Math.min(startIndex + pagesPerFile, totalPages);
        
        const indices = Array.from({ length: endIndex - startIndex }, (_, idx) => startIndex + idx);
        
        const copiedPages = await newPdf.copyPages(pdfDoc, indices);
        copiedPages.forEach((page) => newPdf.addPage(page));

        const filename = `${options.filenamePrefix || 'split'}_${i + 1}.pdf`;
        const outputPath = path.join(outputDir, filename);
        const pdfBytes = await newPdf.save();
        fs.writeFileSync(outputPath, pdfBytes);
        
        result.files.push(outputPath);
      }
    }

    result.totalFiles = result.files.length;
    return result;
  }

  /**
   * 提取指定页面为新 PDF
   * @param inputPath 输入文件路径
   * @param pageNumbers 页码数组 (1-indexed)
   * @param outputPath 输出文件路径
   * @returns 生成的 PDF 文件路径
   */
  async extractPages(inputPath: string, pageNumbers: number[], outputPath: string): Promise<string> {
    const absoluteInputPath = path.resolve(inputPath);
    
    if (!fs.existsSync(absoluteInputPath)) {
      throw new Error(`PDF file not found: ${absoluteInputPath}`);
    }

    const pdfBuffer = fs.readFileSync(absoluteInputPath);
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const newPdf = await PDFDocument.create();

    // 转换为 0-indexed
    const indices = pageNumbers.map((num) => num - 1);
    const copiedPages = await newPdf.copyPages(pdfDoc, indices);
    copiedPages.forEach((page) => newPdf.addPage(page));

    const absoluteOutputPath = path.resolve(outputPath);
    const pdfBytes = await newPdf.save();
    fs.writeFileSync(absoluteOutputPath, pdfBytes);

    return absoluteOutputPath;
  }

  // ============== 工具方法 ==============

  /**
   * 加载字体
   */
  private async loadFont(pdfDoc: PDFDocument, fontName: string): Promise<PDFFont> {
    const fontMap: Record<string, any> = {
      helvetica: StandardFonts.Helvetica,
      times: StandardFonts.TimesRoman,
      courier: StandardFonts.Courier,
      symbol: StandardFonts.Symbol,
      zapfdingbats: StandardFonts.ZapfDingbats,
    };

    return pdfDoc.embedFont(fontMap[fontName] || StandardFonts.Helvetica);
  }

  /**
   * 文本自动换行
   */
  private wrapText(text: string, font: PDFFont, fontSize: number, maxWidth: number): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const testWidth = font.widthOfTextAtSize(testLine, fontSize);

      if (testWidth <= maxWidth) {
        currentLine = testLine;
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      }
    }

    if (currentLine) lines.push(currentLine);
    return lines;
  }

  /**
   * 获取临时目录路径
   */
  private getTempDir(): string {
    return this.config.tempDir || path.join(require('os').tmpdir(), 'pdf-processor');
  }
}

// ============== 快捷函数 ==============

/**
 * 从 PDF 提取文本 (快捷函数)
 */
export async function extractTextFromPDF(
  filePath: string,
  options?: ExtractTextOptions
): Promise<ExtractedText> {
  const processor = new PDFProcessor();
  return processor.extractText(filePath, options);
}

/**
 * 从文本创建 PDF (快捷函数)
 */
export async function createPDFFromText(
  text: string,
  outputPath: string,
  options?: CreatePDFOptions
): Promise<string> {
  const processor = new PDFProcessor();
  return processor.createFromText(text, outputPath, options);
}

/**
 * 合并 PDF 文件 (快捷函数)
 */
export async function mergePDFs(
  inputPaths: string[],
  outputPath: string,
  options?: Omit<MergePDFOptions, 'outputPath'>
): Promise<string> {
  const processor = new PDFProcessor();
  return processor.mergePDFs(inputPaths, { outputPath, ...options });
}

/**
 * 拆分 PDF 文件 (快捷函数)
 */
export async function splitPDF(
  inputPath: string,
  outputDir: string,
  options?: Omit<SplitPDFOptions, 'outputDir'>
): Promise<SplitResult> {
  const processor = new PDFProcessor();
  return processor.splitPDF(inputPath, { outputDir, ...options });
}

export default PDFProcessor;
