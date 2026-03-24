/**
 * PDF Processor Skill - 测试文件
 * 
 * @author Axon
 * @version 1.0.0
 */

import * as fs from 'fs';
import * as path from 'path';
import { PDFProcessor, extractTextFromPDF, createPDFFromText, mergePDFs, splitPDF } from './pdf-processor-skill';

describe('PDFProcessor', () => {
  let processor: PDFProcessor;
  const testDir = path.join(__dirname, '../../test-output/pdf-processor');
  
  beforeAll(() => {
    // 创建测试输出目录
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    processor = new PDFProcessor();
  });

  afterAll(() => {
    // 清理测试文件 (可选)
    // fs.rmSync(testDir, { recursive: true, force: true });
  });

  describe('文本提取', () => {
    it('应该成功提取 PDF 文本', async () => {
      // 创建一个测试 PDF
      const testPdfPath = path.join(testDir, 'test-extract.pdf');
      await processor.createFromText(
        'Hello, World! 这是一个测试文档。',
        testPdfPath
      );

      // 提取文本
      const result = await processor.extractText(testPdfPath, {
        extractMetadata: true,
        preserveNewlines: true,
      });

      expect(result.text).toBeDefined();
      expect(result.metadata?.totalPages).toBe(1);
      expect(result.filePath).toBe(testPdfPath);
    });

    it('应该获取页面信息', async () => {
      const testPdfPath = path.join(testDir, 'test-pages.pdf');
      await processor.createFromText('Test', testPdfPath);

      const pages = await processor.getPageInfo(testPdfPath);

      expect(pages).toHaveLength(1);
      expect(pages[0].pageNumber).toBe(1);
      expect(pages[0].width).toBeGreaterThan(0);
      expect(pages[0].height).toBeGreaterThan(0);
    });

    it('应该处理不存在的文件', async () => {
      await expect(processor.extractText('./nonexistent.pdf'))
        .rejects.toThrow('PDF file not found');
    });
  });

  describe('PDF 生成', () => {
    it('应该从文本创建 PDF', async () => {
      const outputPath = path.join(testDir, 'test-create.pdf');
      const text = 'Test content for PDF generation.';

      const resultPath = await processor.createFromText(text, outputPath, {
        fontSize: 12,
        font: 'helvetica',
        pageSize: 'A4',
      });

      expect(resultPath).toBe(outputPath);
      expect(fs.existsSync(resultPath)).toBe(true);

      // 验证文件大小
      const stats = fs.statSync(resultPath);
      expect(stats.size).toBeGreaterThan(0);
    });

    it('应该使用自定义配置创建 PDF', async () => {
      const customProcessor = new PDFProcessor({
        defaultFont: 'courier',
        defaultFontSize: 14,
        defaultPageSize: 'Letter',
        defaultMargin: 60,
      });

      const outputPath = path.join(testDir, 'test-custom.pdf');
      const resultPath = await customProcessor.createFromText(
        'Custom configuration test',
        outputPath
      );

      expect(fs.existsSync(resultPath)).toBe(true);
    });

    it('应该处理长文本自动换行', async () => {
      const outputPath = path.join(testDir, 'test-wrap.pdf');
      const longText = 'This is a very long text that should automatically wrap to multiple lines when the PDF is generated. '.repeat(10);

      const resultPath = await processor.createFromText(longText, outputPath);

      expect(fs.existsSync(resultPath)).toBe(true);
    });
  });

  describe('PDF 合并', () => {
    it('应该合并多个 PDF 文件', async () => {
      // 创建测试 PDF
      const pdf1 = path.join(testDir, 'merge-1.pdf');
      const pdf2 = path.join(testDir, 'merge-2.pdf');
      const pdf3 = path.join(testDir, 'merge-3.pdf');

      await processor.createFromText('Document 1', pdf1);
      await processor.createFromText('Document 2', pdf2);
      await processor.createFromText('Document 3', pdf3);

      // 合并
      const outputPath = path.join(testDir, 'merged.pdf');
      const resultPath = await processor.mergePDFs([pdf1, pdf2, pdf3], {
        outputPath,
      });

      expect(fs.existsSync(resultPath)).toBe(true);

      // 验证合并后的页数
      const pageInfo = await processor.getPageInfo(resultPath);
      expect(pageInfo).toHaveLength(3);
    });

    it('应该处理空文件列表', async () => {
      const outputPath = path.join(testDir, 'merged-empty.pdf');
      
      await expect(
        processor.mergePDFs([], { outputPath })
      ).rejects.toThrow('No input PDF files provided');
    });

    it('应该处理不存在的文件', async () => {
      const outputPath = path.join(testDir, 'merged-error.pdf');
      
      await expect(
        processor.mergePDFs(['./nonexistent.pdf'], { outputPath })
      ).rejects.toThrow('PDF file not found');
    });
  });

  describe('PDF 拆分', () => {
    it('应该按页数拆分 PDF', async () => {
      // 创建多页 PDF
      const sourcePath = path.join(testDir, 'split-source.pdf');
      await processor.createFromText('Page 1\n'.repeat(10), sourcePath);

      const outputDir = path.join(testDir, 'split-output');
      
      const result = await processor.splitPDF(sourcePath, {
        outputDir,
        filenamePrefix: 'split',
        pagesPerFile: 3,
      });

      expect(result.totalFiles).toBeGreaterThan(0);
      expect(result.files).toHaveLength(result.totalFiles);

      // 验证每个文件都存在
      result.files.forEach(file => {
        expect(fs.existsSync(file)).toBe(true);
      });
    });

    it('应该按指定范围拆分 PDF', async () => {
      const sourcePath = path.join(testDir, 'split-ranges.pdf');
      await processor.createFromText('Content', sourcePath);

      const outputDir = path.join(testDir, 'split-ranges-output');
      
      const result = await processor.splitPDF(sourcePath, {
        outputDir,
        ranges: [
          { start: 1, end: 1 },
          { start: 1, end: 1 },
        ],
      });

      expect(result.totalFiles).toBe(2);
    });

    it('应该提取指定页面', async () => {
      const sourcePath = path.join(testDir, 'extract-pages-source.pdf');
      await processor.createFromText('Page 1\nPage 2\nPage 3\nPage 4\nPage 5', sourcePath);

      const outputPath = path.join(testDir, 'extracted.pdf');
      const resultPath = await processor.extractPages(sourcePath, [1, 3, 5], outputPath);

      expect(fs.existsSync(resultPath)).toBe(true);

      const pageInfo = await processor.getPageInfo(resultPath);
      expect(pageInfo).toHaveLength(3);
    });
  });

  describe('快捷函数', () => {
    it('应该使用 extractTextFromPDF', async () => {
      const testPdfPath = path.join(testDir, 'quick-extract.pdf');
      await processor.createFromText('Quick test', testPdfPath);

      const result = await extractTextFromPDF(testPdfPath);
      expect(result.text).toBeDefined();
    });

    it('应该使用 createPDFFromText', async () => {
      const outputPath = path.join(testDir, 'quick-create.pdf');
      const resultPath = await createPDFFromText('Quick create test', outputPath);

      expect(fs.existsSync(resultPath)).toBe(true);
    });

    it('应该使用 mergePDFs', async () => {
      const pdf1 = path.join(testDir, 'quick-1.pdf');
      const pdf2 = path.join(testDir, 'quick-2.pdf');
      
      await processor.createFromText('Doc 1', pdf1);
      await processor.createFromText('Doc 2', pdf2);

      const outputPath = path.join(testDir, 'quick-merged.pdf');
      const resultPath = await mergePDFs([pdf1, pdf2], outputPath);

      expect(fs.existsSync(resultPath)).toBe(true);
    });

    it('应该使用 splitPDF', async () => {
      const sourcePath = path.join(testDir, 'quick-split.pdf');
      await processor.createFromText('Content', sourcePath);

      const outputDir = path.join(testDir, 'quick-split-output');
      const result = await splitPDF(sourcePath, outputDir);

      expect(result.totalFiles).toBeGreaterThan(0);
    });
  });

  describe('边界情况', () => {
    it('应该处理空文本', async () => {
      const outputPath = path.join(testDir, 'empty.pdf');
      const resultPath = await processor.createFromText('', outputPath);

      expect(fs.existsSync(resultPath)).toBe(true);
    });

    it('应该处理特殊字符', async () => {
      const outputPath = path.join(testDir, 'special-chars.pdf');
      const text = 'Special: @#$%^&*()_+-=[]{}|;:\'",.<>?/`~中文日本語';
      
      const resultPath = await processor.createFromText(text, outputPath);
      expect(fs.existsSync(resultPath)).toBe(true);
    });

    it('应该处理超长文本', async () => {
      const outputPath = path.join(testDir, 'long-text.pdf');
      const longText = 'A'.repeat(10000);
      
      const resultPath = await processor.createFromText(longText, outputPath);
      expect(fs.existsSync(resultPath)).toBe(true);
    });
  });
});

describe('PDFProcessor 配置', () => {
  it('应该使用默认配置', () => {
    const processor = new PDFProcessor();
    
    // 验证默认配置
    expect(processor).toBeDefined();
  });

  it('应该使用自定义配置', () => {
    const processor = new PDFProcessor({
      defaultFont: 'times',
      defaultFontSize: 16,
      defaultPageSize: 'Legal',
      defaultMargin: 72,
    });
    
    expect(processor).toBeDefined();
  });
});
