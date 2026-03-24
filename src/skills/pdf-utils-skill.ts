/**
 * PDF 文档处理工具技能
 * 
 * 功能:
 * 1. PDF 生成 - 从文本/HTML 创建 PDF
 * 2. PDF 合并/拆分 - 合并多个 PDF 或拆分 PDF 为单页
 * 3. PDF 转图片 - 将 PDF 页面转换为图片
 * 
 * @module skills/pdf-utils
 * 
 * @dependencies
 * - pdfkit: PDF 生成
 * - pdf-lib: PDF 合并/拆分/编辑
 * - pdf2pic: PDF 转图片
 * 
 * @example
 * ```bash
 * npm install pdfkit pdf-lib pdf2pic
 * ```
 */

import * as fs from 'fs';
import * as path from 'path';

// ==================== 类型定义 ====================

/**
 * PDF 页面尺寸选项
 */
export type PageSize = 
  | 'A4' 
  | 'A3' 
  | 'A5' 
  | 'Letter' 
  | 'Legal' 
  | 'Tabloid'
  | { width: number; height: number };

/**
 * PDF 生成选项
 */
export interface PdfGenerateOptions {
  /** 页面尺寸，默认 A4 */
  pageSize?: PageSize;
  /** 页边距 (英寸)，默认 { top: 1, bottom: 1, left: 1, right: 1 } */
  margins?: {
    top?: number;
    bottom?: number;
    left?: number;
    right?: number;
  };
  /** 字体大小，默认 12 */
  fontSize?: number;
  /** 字体名称，默认 Helvetica */
  font?: string;
  /** 行高，默认 1.5 */
  lineHeight?: number;
  /** 是否添加页码，默认 false */
  addPageNumbers?: boolean;
  /** 页码位置，默认 'bottom-center' */
  pageNumberPosition?: 'bottom-center' | 'bottom-right' | 'top-center' | 'top-right';
}

/**
 * PDF 合并选项
 */
export interface PdfMergeOptions {
  /** 输出文件路径 */
  outputPath: string;
  /** 是否删除临时文件，默认 true */
  cleanup?: boolean;
}

/**
 * PDF 拆分选项
 */
export interface PdfSplitOptions {
  /** 输出目录，默认当前目录下的 split 文件夹 */
  outputDir?: string;
  /** 文件名前缀，默认 'page-' */
  filenamePrefix?: string;
  /** 页面范围，例如 '1-5' 或 '1,3,5'，默认全部 */
  pageRange?: string;
}

/**
 * PDF 转图片选项
 */
export interface PdfToImageOptions {
  /** 输出目录，默认当前目录下的 images 文件夹 */
  outputDir?: string;
  /** 文件名前缀，默认 'page-' */
  filenamePrefix?: string;
  /** 图片格式，默认 'png' */
  format?: 'png' | 'jpeg' | 'webp';
  /** 图片质量 (0-100)，仅 jpeg/webp 有效，默认 90 */
  quality?: number;
  /** 缩放倍数，默认 2 (200%) */
  scale?: number;
  /** DPI，默认 144 */
  dpi?: number;
  /** 页面范围，例如 '1-5' 或 '1,3,5'，默认全部 */
  pageRange?: string;
}

/**
 * PDF 信息
 */
export interface PdfInfo {
  /** 总页数 */
  pageCount: number;
  /** 文件大小 (字节) */
  fileSize: number;
  /** 文件路径 */
  filePath: string;
  /** 创建时间 */
  createdAt?: Date;
  /** 修改时间 */
  modifiedAt?: Date;
}

// ==================== PDF 生成 ====================

/**
 * 从文本生成 PDF
 * 
 * @param text - 文本内容
 * @param outputPath - 输出文件路径
 * @param options - 生成选项
 * @returns 生成的 PDF 文件路径
 * 
 * @example
 * ```typescript
 * await generatePdfFromText('Hello World', './output.pdf');
 * ```
 */
export async function generatePdfFromText(
  text: string,
  outputPath: string,
  options: PdfGenerateOptions = {}
): Promise<string> {
  try {
    const PDFDocument = (await import('pdfkit')).default;
    
    const {
      pageSize = 'A4',
      margins = { top: 1, bottom: 1, left: 1, right: 1 },
      fontSize = 12,
      font = 'Helvetica',
      lineHeight = 1.5,
      addPageNumbers = false,
      pageNumberPosition = 'bottom-center',
    } = options;

    const doc = new PDFDocument({
      size: pageSize as any,
      margins: {
        top: margins.top || 72,
        bottom: margins.bottom || 72,
        left: margins.left || 72,
        right: margins.right || 72,
      },
    });

    // 确保输出目录存在
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // 写入文件
    const writeStream = fs.createWriteStream(outputPath);
    doc.pipe(writeStream);

    // 设置字体和大小
    doc.font(font, fontSize);

    // 处理文本 (支持简单的换行)
    const lines = text.split('\n');
    let currentPage = 1;

    lines.forEach((line, index) => {
      // 添加页码
      if (addPageNumbers) {
        addPageNumber(doc, currentPage, pageNumberPosition);
      }

      // 检查是否需要新页
      if (index > 0 && doc.y + fontSize * lineHeight > doc.page.height - doc.page.margins.bottom) {
        doc.addPage();
        currentPage++;
        if (addPageNumbers) {
          addPageNumber(doc, currentPage, pageNumberPosition);
        }
      }

      // 写入文本
      doc.text(line, {
        lineGap: fontSize * (lineHeight - 1),
        align: 'left',
      });
    });

    doc.end();

    // 等待写入完成
    await new Promise<void>((resolve, reject) => {
      writeStream.on('finish', resolve);
      writeStream.on('error', reject);
    });

    return outputPath;
  } catch (error) {
    throw new Error(`PDF 生成失败：${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * 从 HTML 生成 PDF (需要 puppeteer)
 * 
 * @param html - HTML 内容或文件路径
 * @param outputPath - 输出文件路径
 * @param options - 生成选项
 * @returns 生成的 PDF 文件路径
 * 
 * @example
 * ```typescript
 * await generatePdfFromHtml('<h1>Hello</h1>', './output.pdf');
 * await generatePdfFromHtml('./template.html', './output.pdf');
 * ```
 */
export async function generatePdfFromHtml(
  html: string,
  outputPath: string,
  options: {
    /** 是否是文件路径，默认 false */
    isFilePath?: boolean;
    /** 页面格式，默认 'A4' */
    format?: 'A4' | 'Letter' | 'Legal';
    /** 是否打印背景图形，默认 true */
    printBackground?: boolean;
    /** 页边距 */
    margin?: {
      top?: string;
      bottom?: string;
      left?: string;
      right?: string;
    };
  } = {}
): Promise<string> {
  try {
    const puppeteer = await import('puppeteer');
    
    const {
      isFilePath = false,
      format = 'A4',
      printBackground = true,
      margin = { top: '20mm', bottom: '20mm', left: '20mm', right: '20mm' },
    } = options;

    // 确保输出目录存在
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    try {
      const page = await browser.newPage();

      // 加载 HTML 内容
      if (isFilePath) {
        const htmlContent = fs.readFileSync(html, 'utf-8');
        await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
      } else {
        await page.setContent(html, { waitUntil: 'networkidle0' });
      }

      // 生成 PDF
      await page.pdf({
        path: outputPath,
        format,
        printBackground,
        margin: {
          top: margin.top || '20mm',
          bottom: margin.bottom || '20mm',
          left: margin.left || '20mm',
          right: margin.right || '20mm',
        },
      });

      return outputPath;
    } finally {
      await browser.close();
    }
  } catch (error) {
    throw new Error(`PDF 生成失败：${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * 添加页码
 */
function addPageNumber(
  doc: any,
  pageNumber: number,
  position: 'bottom-center' | 'bottom-right' | 'top-center' | 'top-right'
): void {
  const { width, height } = doc.page;
  const { top, bottom, left, right } = doc.page.margins;
  const fontSize = 10;

  doc.fontSize(fontSize).fillColor('#666666');

  switch (position) {
    case 'bottom-center':
      doc.text(
        pageNumber.toString(),
        (width - left - right) / 2 + left,
        height - bottom + 10,
        { align: 'center' }
      );
      break;
    case 'bottom-right':
      doc.text(
        pageNumber.toString(),
        width - right,
        height - bottom + 10,
        { align: 'right' }
      );
      break;
    case 'top-center':
      doc.text(
        pageNumber.toString(),
        (width - left - right) / 2 + left,
        top - 20,
        { align: 'center' }
      );
      break;
    case 'top-right':
      doc.text(
        pageNumber.toString(),
        width - right,
        top - 20,
        { align: 'right' }
      );
      break;
  }
}

// ==================== PDF 合并 ====================

/**
 * 合并多个 PDF 文件
 * 
 * @param pdfPaths - PDF 文件路径数组
 * @param outputPath - 输出文件路径
 * @param options - 合并选项
 * @returns 合并后的 PDF 文件路径
 * 
 * @example
 * ```typescript
 * await mergePdfs(['file1.pdf', 'file2.pdf'], './merged.pdf');
 * ```
 */
export async function mergePdfs(
  pdfPaths: string[],
  outputPath: string,
  options: PdfMergeOptions = {} as PdfMergeOptions
): Promise<string> {
  try {
    const { PDFDocument } = await import('pdf-lib');
    
    if (pdfPaths.length === 0) {
      throw new Error('至少需要一个 PDF 文件');
    }

    // 验证所有文件存在
    pdfPaths.forEach(pdfPath => {
      if (!fs.existsSync(pdfPath)) {
        throw new Error(`文件不存在：${pdfPath}`);
      }
    });

    // 创建新的 PDF 文档
    const mergedPdf = await PDFDocument.create();

    // 依次合并每个 PDF
    for (const pdfPath of pdfPaths) {
      const pdfBytes = fs.readFileSync(pdfPath);
      const pdf = await PDFDocument.load(pdfBytes);
      const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
      copiedPages.forEach(page => mergedPdf.addPage(page));
    }

    // 确保输出目录存在
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // 保存合并后的 PDF
    const mergedPdfBytes = await mergedPdf.save();
    fs.writeFileSync(outputPath, mergedPdfBytes);

    return outputPath;
  } catch (error) {
    throw new Error(`PDF 合并失败：${error instanceof Error ? error.message : String(error)}`);
  }
}

// ==================== PDF 拆分 ====================

/**
 * 拆分 PDF 为单页文件
 * 
 * @param pdfPath - PDF 文件路径
 * @param options - 拆分选项
 * @returns 生成的 PDF 文件路径数组
 * 
 * @example
 * ```typescript
 * const pages = await splitPdf('./document.pdf', { outputDir: './pages' });
 * ```
 */
export async function splitPdf(
  pdfPath: string,
  options: PdfSplitOptions = {}
): Promise<string[]> {
  try {
    const { PDFDocument } = await import('pdf-lib');
    
    if (!fs.existsSync(pdfPath)) {
      throw new Error(`文件不存在：${pdfPath}`);
    }

    const {
      outputDir = path.join(path.dirname(pdfPath), 'split'),
      filenamePrefix = 'page-',
      pageRange,
    } = options;

    // 创建输出目录
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // 加载 PDF
    const pdfBytes = fs.readFileSync(pdfPath);
    const pdf = await PDFDocument.load(pdfBytes);
    const totalPages = pdf.getPageCount();

    // 解析页面范围
    const pagesToSplit = parsePageRange(pageRange, totalPages);

    const outputPaths: string[] = [];

    // 拆分每一页
    for (const pageNum of pagesToSplit) {
      const newPdf = await PDFDocument.create();
      const [copiedPage] = await newPdf.copyPages(pdf, [pageNum - 1]);
      newPdf.addPage(copiedPage);

      const outputPath = path.join(
        outputDir,
        `${filenamePrefix}${String(pageNum).padStart(3, '0')}.pdf`
      );

      const pdfBytes = await newPdf.save();
      fs.writeFileSync(outputPath, pdfBytes);
      outputPaths.push(outputPath);
    }

    return outputPaths;
  } catch (error) {
    throw new Error(`PDF 拆分失败：${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * 提取 PDF 指定页面范围
 * 
 * @param pdfPath - PDF 文件路径
 * @param pageRange - 页面范围，例如 '1-5' 或 '1,3,5'
 * @param outputPath - 输出文件路径
 * @returns 提取后的 PDF 文件路径
 * 
 * @example
 * ```typescript
 * await extractPages('./document.pdf', '1-3', './extracted.pdf');
 * await extractPages('./document.pdf', '1,3,5', './extracted.pdf');
 * ```
 */
export async function extractPages(
  pdfPath: string,
  pageRange: string,
  outputPath: string
): Promise<string> {
  try {
    const { PDFDocument } = await import('pdf-lib');
    
    if (!fs.existsSync(pdfPath)) {
      throw new Error(`文件不存在：${pdfPath}`);
    }

    // 加载 PDF
    const pdfBytes = fs.readFileSync(pdfPath);
    const pdf = await PDFDocument.load(pdfBytes);
    const totalPages = pdf.getPageCount();

    // 解析页面范围
    const pagesToExtract = parsePageRange(pageRange, totalPages);

    // 创建新 PDF
    const newPdf = await PDFDocument.create();
    const copiedPages = await newPdf.copyPages(pdf, pagesToExtract.map(p => p - 1));
    copiedPages.forEach(page => newPdf.addPage(page));

    // 确保输出目录存在
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // 保存
    const pdfBytes = await newPdf.save();
    fs.writeFileSync(outputPath, pdfBytes);

    return outputPath;
  } catch (error) {
    throw new Error(`PDF 页面提取失败：${error instanceof Error ? error.message : String(error)}`);
  }
}

// ==================== PDF 转图片 ====================

/**
 * 将 PDF 转换为图片
 * 
 * @param pdfPath - PDF 文件路径
 * @param options - 转换选项
 * @returns 生成的图片文件路径数组
 * 
 * @example
 * ```typescript
 * const images = await pdfToImages('./document.pdf', { format: 'png', scale: 2 });
 * ```
 */
export async function pdfToImages(
  pdfPath: string,
  options: PdfToImageOptions = {}
): Promise<string[]> {
  try {
    const { fromBuffer } = await import('pdf2pic');
    
    if (!fs.existsSync(pdfPath)) {
      throw new Error(`文件不存在：${pdfPath}`);
    }

    const {
      outputDir = path.join(path.dirname(pdfPath), 'images'),
      filenamePrefix = 'page-',
      format = 'png',
      quality = 90,
      scale = 2,
      dpi = 144,
      pageRange,
    } = options;

    // 创建输出目录
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // 读取 PDF 文件
    const pdfBytes = fs.readFileSync(pdfPath);

    // 创建转换器
    const convert = fromBuffer(pdfBytes, {
      density: dpi,
      saveFilename: filenamePrefix,
      savePath: outputDir,
      format,
      quality,
      width: 800 * scale,
      height: 1200 * scale,
    });

    // 获取总页数 (通过尝试转换)
    const totalPages = await getPageCount(pdfPath);

    // 解析页面范围
    const pagesToConvert = parsePageRange(pageRange, totalPages);

    const outputPaths: string[] = [];

    // 转换每一页
    for (const pageNum of pagesToConvert) {
      const result = await convert(pageNum, {
        format,
        quality,
      });

      if (result && result.path) {
        // 重命名文件以包含页码
        const ext = path.extname(result.path);
        const newFilename = `${filenamePrefix}${String(pageNum).padStart(3, '0')}${ext}`;
        const newPath = path.join(outputDir, newFilename);

        if (result.path !== newPath) {
          fs.renameSync(result.path, newPath);
        }

        outputPaths.push(newPath);
      }
    }

    return outputPaths;
  } catch (error) {
    throw new Error(`PDF 转图片失败：${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * 将 PDF 特定页面转换为图片
 * 
 * @param pdfPath - PDF 文件路径
 * @param pageNumber - 页码 (从 1 开始)
 * @param outputPath - 输出文件路径
 * @param options - 转换选项
 * @returns 生成的图片文件路径
 * 
 * @example
 * ```typescript
 * const imagePath = await pdfPageToImage('./document.pdf', 1, './page1.png');
 * ```
 */
export async function pdfPageToImage(
  pdfPath: string,
  pageNumber: number,
  outputPath: string,
  options: {
    format?: 'png' | 'jpeg' | 'webp';
    quality?: number;
    scale?: number;
    dpi?: number;
  } = {}
): Promise<string> {
  try {
    const { fromBuffer } = await import('pdf2pic');
    
    if (!fs.existsSync(pdfPath)) {
      throw new Error(`文件不存在：${pdfPath}`);
    }

    const {
      format = 'png',
      quality = 90,
      scale = 2,
      dpi = 144,
    } = options;

    // 读取 PDF 文件
    const pdfBytes = fs.readFileSync(pdfPath);

    // 创建转换器
    const convert = fromBuffer(pdfBytes, {
      density: dpi,
      format,
      quality,
      width: 800 * scale,
      height: 1200 * scale,
    });

    // 转换指定页面
    const result = await convert(pageNumber, {
      format,
      quality,
    });

    if (!result || !result.path) {
      throw new Error('转换失败');
    }

    // 确保输出目录存在
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // 移动/重命名文件
    if (result.path !== outputPath) {
      fs.renameSync(result.path, outputPath);
    }

    return outputPath;
  } catch (error) {
    throw new Error(`PDF 页面转图片失败：${error instanceof Error ? error.message : String(error)}`);
  }
}

// ==================== PDF 信息 ====================

/**
 * 获取 PDF 文件信息
 * 
 * @param pdfPath - PDF 文件路径
 * @returns PDF 信息
 * 
 * @example
 * ```typescript
 * const info = await getPdfInfo('./document.pdf');
 * console.log(`总页数：${info.pageCount}`);
 * ```
 */
export async function getPdfInfo(pdfPath: string): Promise<PdfInfo> {
  try {
    const { PDFDocument } = await import('pdf-lib');
    
    if (!fs.existsSync(pdfPath)) {
      throw new Error(`文件不存在：${pdfPath}`);
    }

    const pdfBytes = fs.readFileSync(pdfPath);
    const pdf = await PDFDocument.load(pdfBytes);
    const stats = fs.statSync(pdfPath);

    return {
      pageCount: pdf.getPageCount(),
      fileSize: stats.size,
      filePath: pdfPath,
      createdAt: stats.birthtime,
      modifiedAt: stats.mtime,
    };
  } catch (error) {
    throw new Error(`获取 PDF 信息失败：${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * 获取 PDF 总页数
 */
async function getPageCount(pdfPath: string): Promise<number> {
  const info = await getPdfInfo(pdfPath);
  return info.pageCount;
}

// ==================== 工具函数 ====================

/**
 * 解析页面范围字符串
 * 
 * @param pageRange - 页面范围字符串，例如 '1-5' 或 '1,3,5'
 * @param totalPages - 总页数
 * @returns 页码数组
 */
function parsePageRange(pageRange: string | undefined, totalPages: number): number[] {
  if (!pageRange) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const pages = new Set<number>();

  // 处理逗号分隔的列表
  const parts = pageRange.split(',');

  for (const part of parts) {
    const trimmed = part.trim();

    // 处理范围 (例如 '1-5')
    if (trimmed.includes('-')) {
      const [start, end] = trimmed.split('-').map(s => parseInt(s.trim(), 10));
      if (!isNaN(start) && !isNaN(end)) {
        for (let i = Math.max(1, start); i <= Math.min(totalPages, end); i++) {
          pages.add(i);
        }
      }
    } else {
      // 处理单个页码
      const pageNum = parseInt(trimmed, 10);
      if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
        pages.add(pageNum);
      }
    }
  }

  return Array.from(pages).sort((a, b) => a - b);
}

// ==================== 批量操作 ====================

/**
 * 批量转换多个 PDF 为图片
 * 
 * @param pdfPaths - PDF 文件路径数组
 * @param options - 转换选项
 * @returns 每个 PDF 对应的图片路径数组 (二维数组)
 * 
 * @example
 * ```typescript
 * const allImages = await batchPdfToImages(['file1.pdf', 'file2.pdf']);
 * ```
 */
export async function batchPdfToImages(
  pdfPaths: string[],
  options: PdfToImageOptions = {}
): Promise<string[][]> {
  const results: string[][] = [];

  for (const pdfPath of pdfPaths) {
    const images = await pdfToImages(pdfPath, options);
    results.push(images);
  }

  return results;
}

/**
 * 批量合并多组 PDF
 * 
 * @param groups - PDF 文件路径数组的数组 (每组会被合并成一个 PDF)
 * @param outputPaths - 输出文件路径数组
 * @returns 合并后的 PDF 文件路径数组
 * 
 * @example
 * ```typescript
 * const merged = await batchMergePdfs(
 *   [['a1.pdf', 'a2.pdf'], ['b1.pdf', 'b2.pdf']],
 *   ['merged-a.pdf', 'merged-b.pdf']
 * );
 * ```
 */
export async function batchMergePdfs(
  groups: string[][],
  outputPaths: string[]
): Promise<string[]> {
  if (groups.length !== outputPaths.length) {
    throw new Error('groups 和 outputPaths 长度必须一致');
  }

  const results: string[] = [];

  for (let i = 0; i < groups.length; i++) {
    const merged = await mergePdfs(groups[i], outputPaths[i]);
    results.push(merged);
  }

  return results;
}

// ==================== 导出 ====================

export const PdfUtils = {
  // 生成
  generateFromText: generatePdfFromText,
  generateFromHtml: generatePdfFromHtml,
  
  // 合并/拆分
  merge: mergePdfs,
  split: splitPdf,
  extractPages,
  
  // 转图片
  toImages: pdfToImages,
  pageToImage: pdfPageToImage,
  batchToImages: batchPdfToImages,
  
  // 批量操作
  batchMerge: batchMergePdfs,
  
  // 信息
  getInfo: getPdfInfo,
  getPageCount,
};

export default PdfUtils;
