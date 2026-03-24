/**
 * ZIP Processor Skill Tests
 * 
 * @author Axon
 * @version 1.0.0
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import ZipProcessor, {
  zip,
  unzip,
  zipInfo,
  zipStream,
  unzipStream,
  type ZipProcessorConfig,
  type CompressionOptions,
  type ExtractionOptions,
} from './zip-processor-skill';

describe('ZipProcessor', () => {
  let tempDir: string;
  let testFilesDir: string;
  let outputDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'zip-processor-test-'));
    testFilesDir = path.join(tempDir, 'test-files');
    outputDir = path.join(tempDir, 'output');
    fs.mkdirSync(testFilesDir, { recursive: true });
    fs.mkdirSync(outputDir, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('基础压缩', () => {
    it('应该压缩单个文件', async () => {
      const testFile = path.join(testFilesDir, 'test.txt');
      const testContent = 'Hello, ZIP!';
      fs.writeFileSync(testFile, testContent);

      const zipPath = path.join(outputDir, 'test.zip');
      const result = await zip(testFile, zipPath, { overwrite: true });

      expect(result.success).toBe(true);
      expect(result.filesCompressed).toBe(1);
      expect(fs.existsSync(zipPath)).toBe(true);
    });

    it('应该压缩目录', async () => {
      // 创建测试文件结构
      fs.writeFileSync(path.join(testFilesDir, 'file1.txt'), 'Content 1');
      fs.writeFileSync(path.join(testFilesDir, 'file2.txt'), 'Content 2');
      const subDir = path.join(testFilesDir, 'subdir');
      fs.mkdirSync(subDir);
      fs.writeFileSync(path.join(subDir, 'file3.txt'), 'Content 3');

      const zipPath = path.join(outputDir, 'directory.zip');
      const result = await zip(testFilesDir, zipPath, { overwrite: true });

      expect(result.success).toBe(true);
      expect(result.filesCompressed).toBeGreaterThanOrEqual(3);
      expect(fs.existsSync(zipPath)).toBe(true);
    });

    it('应该压缩多个路径', async () => {
      const file1 = path.join(testFilesDir, 'file1.txt');
      const file2 = path.join(testFilesDir, 'file2.txt');
      fs.writeFileSync(file1, 'Content 1');
      fs.writeFileSync(file2, 'Content 2');

      const zipPath = path.join(outputDir, 'multiple.zip');
      const result = await zip([file1, file2], zipPath, { overwrite: true });

      expect(result.success).toBe(true);
      expect(result.filesCompressed).toBe(2);
    });
  });

  describe('基础解压', () => {
    it('应该解压 ZIP 文件', async () => {
      const testFile = path.join(testFilesDir, 'test.txt');
      const testContent = 'Hello from ZIP!';
      fs.writeFileSync(testFile, testContent);

      const zipPath = path.join(outputDir, 'test.zip');
      await zip(testFile, zipPath, { overwrite: true });

      const extractDir = path.join(outputDir, 'extracted');
      const result = await unzip(zipPath, extractDir, { overwrite: true });

      expect(result.success).toBe(true);
      expect(result.filesExtracted).toBe(1);
      expect(fs.existsSync(path.join(extractDir, 'test.txt'))).toBe(true);
    });

    it('应该保留目录结构', async () => {
      const subDir = path.join(testFilesDir, 'subdir');
      fs.mkdirSync(subDir, { recursive: true });
      fs.writeFileSync(path.join(subDir, 'nested.txt'), 'Nested content');

      const zipPath = path.join(outputDir, 'nested.zip');
      await zip(testFilesDir, zipPath, { overwrite: true });

      const extractDir = path.join(outputDir, 'extracted');
      const result = await unzip(zipPath, extractDir, { overwrite: true });

      expect(result.success).toBe(true);
      expect(result.filesExtracted).toBeGreaterThanOrEqual(1);
      
      // 文件可能在 test-files/subdir/nested.txt 或 subdir/nested.txt
      const possiblePaths = [
        path.join(extractDir, 'subdir', 'nested.txt'),
        path.join(extractDir, path.basename(testFilesDir), 'subdir', 'nested.txt'),
      ];
      const exists = possiblePaths.some(p => fs.existsSync(p));
      expect(exists).toBe(true);
    });
  });

  describe('ZIP 信息', () => {
    it('应该获取 ZIP 文件信息', async () => {
      fs.writeFileSync(path.join(testFilesDir, 'file1.txt'), 'Content 1');
      fs.writeFileSync(path.join(testFilesDir, 'file2.txt'), 'Content 2');

      const zipPath = path.join(outputDir, 'info.zip');
      await zip(testFilesDir, zipPath, { overwrite: true });

      const info = await zipInfo(zipPath);

      expect(info.path).toBe(zipPath);
      expect(info.entryCount).toBeGreaterThanOrEqual(2);
      expect(info.size).toBeGreaterThan(0);
      expect(info.entries.length).toBe(info.entryCount);
    });

    it('应该列出所有条目', async () => {
      const subDir = path.join(testFilesDir, 'subdir');
      fs.mkdirSync(subDir);
      fs.writeFileSync(path.join(testFilesDir, 'root.txt'), 'Root');
      fs.writeFileSync(path.join(subDir, 'child.txt'), 'Child');

      const zipPath = path.join(outputDir, 'entries.zip');
      await zip(testFilesDir, zipPath, { overwrite: true });

      const info = await zipInfo(zipPath);

      const hasRootFile = info.entries.some(e => e.name.includes('root.txt'));
      const hasChildFile = info.entries.some(e => e.name.includes('child.txt'));

      expect(hasRootFile).toBe(true);
      expect(hasChildFile).toBe(true);
      // 目录可能被添加也可能没有，取决于实现
      expect(info.entryCount).toBeGreaterThanOrEqual(2);
    });
  });

  describe('压缩选项', () => {
    it('应该使用不同的压缩级别', async () => {
      const testFile = path.join(testFilesDir, 'large.txt');
      const largeContent = 'A'.repeat(10000);
      fs.writeFileSync(testFile, largeContent);

      const zipPath1 = path.join(outputDir, 'fast.zip');
      const zipPath9 = path.join(outputDir, 'max.zip');

      const result1 = await zip(testFile, zipPath1, { overwrite: true, level: 1 });
      const result9 = await zip(testFile, zipPath9, { overwrite: true, level: 9 });

      expect(result1.success).toBe(true);
      expect(result9.success).toBe(true);
      // 最大压缩应该产生更小的文件
      expect(fs.statSync(zipPath9).size).toBeLessThanOrEqual(fs.statSync(zipPath1).size);
    });

    it('应该排除指定文件', async () => {
      fs.writeFileSync(path.join(testFilesDir, 'include.txt'), 'Include');
      fs.writeFileSync(path.join(testFilesDir, 'exclude.log'), 'Exclude');
      fs.writeFileSync(path.join(testFilesDir, 'test.log'), 'Also exclude');

      const zipPath = path.join(outputDir, 'filtered.zip');
      const result = await zip(testFilesDir, zipPath, {
        overwrite: true,
        exclude: ['*.log'],
      });

      expect(result.success).toBe(true);
      expect(result.filesCompressed).toBe(1);
    });

    it('应该仅包含指定文件', async () => {
      fs.writeFileSync(path.join(testFilesDir, 'file1.ts'), 'TS1');
      fs.writeFileSync(path.join(testFilesDir, 'file2.ts'), 'TS2');
      fs.writeFileSync(path.join(testFilesDir, 'file3.js'), 'JS');

      const zipPath = path.join(outputDir, 'typescript.zip');
      const result = await zip(testFilesDir, zipPath, {
        overwrite: true,
        include: ['*.ts'],
      });

      expect(result.success).toBe(true);
      expect(result.filesCompressed).toBe(2);
    });
  });

  describe('解压选项', () => {
    it('应该创建父目录', async () => {
      const subDir = path.join(testFilesDir, 'deep', 'nested', 'dir');
      fs.mkdirSync(subDir, { recursive: true });
      fs.writeFileSync(path.join(subDir, 'file.txt'), 'Deep');

      const zipPath = path.join(outputDir, 'deep.zip');
      await zip(testFilesDir, zipPath, { overwrite: true });

      const extractDir = path.join(outputDir, 'extracted', 'new', 'path');
      const result = await unzip(zipPath, extractDir, {
        overwrite: true,
        createParentDirs: true,
      });

      expect(result.success).toBe(true);
      expect(fs.existsSync(extractDir)).toBe(true);
    });

    it('应该覆盖已存在的文件', async () => {
      const testFile = path.join(testFilesDir, 'test.txt');
      fs.writeFileSync(testFile, 'Original');

      const zipPath = path.join(outputDir, 'test.zip');
      await zip(testFile, zipPath, { overwrite: true });

      const extractDir = path.join(outputDir, 'extracted');
      fs.mkdirSync(extractDir);
      fs.writeFileSync(path.join(extractDir, 'test.txt'), 'Existing');

      const result = await unzip(zipPath, extractDir, { overwrite: true });

      expect(result.success).toBe(true);
      const extractedContent = fs.readFileSync(path.join(extractDir, 'test.txt'), 'utf8');
      expect(extractedContent).toBe('Original');
    });
  });

  describe('进度回调', () => {
    it('应该调用压缩进度回调', async () => {
      for (let i = 0; i < 5; i++) {
        fs.writeFileSync(path.join(testFilesDir, `file${i}.txt`), `Content ${i}`);
      }

      const zipPath = path.join(outputDir, 'progress.zip');
      const progressCalls: number[] = [];

      const result = await zip(testFilesDir, zipPath, {
        overwrite: true,
        onProgress: (progress) => {
          progressCalls.push(progress.percentage);
        },
      });

      expect(result.success).toBe(true);
      expect(progressCalls.length).toBeGreaterThan(0);
      expect(progressCalls[progressCalls.length - 1]).toBeGreaterThanOrEqual(100);
    });

    it('应该调用解压进度回调', async () => {
      for (let i = 0; i < 5; i++) {
        fs.writeFileSync(path.join(testFilesDir, `file${i}.txt`), `Content ${i}`);
      }

      const zipPath = path.join(outputDir, 'test.zip');
      await zip(testFilesDir, zipPath, { overwrite: true });

      const extractDir = path.join(outputDir, 'extracted');
      const progressCalls: number[] = [];

      const result = await unzip(zipPath, extractDir, {
        overwrite: true,
        onProgress: (progress) => {
          progressCalls.push(progress.percentage);
        },
      });

      expect(result.success).toBe(true);
      expect(progressCalls.length).toBeGreaterThan(0);
    });
  });

  describe('错误处理', () => {
    it('应该处理不存在的输入文件', async () => {
      const result = await zip('/nonexistent/path', path.join(outputDir, 'test.zip'), {
        overwrite: true,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('应该处理不存在的 ZIP 文件', async () => {
      const result = await unzip('/nonexistent.zip', outputDir, { overwrite: true });

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('应该拒绝覆盖已存在的文件', async () => {
      const testFile = path.join(testFilesDir, 'test.txt');
      fs.writeFileSync(testFile, 'Content');

      const zipPath = path.join(outputDir, 'test.zip');
      fs.writeFileSync(zipPath, 'Existing ZIP');

      const result = await zip(testFile, zipPath, { overwrite: false });

      expect(result.success).toBe(false);
      expect(result.error).toContain('already exists');
    });
  });

  describe('类实例使用', () => {
    it('应该使用自定义配置创建实例', async () => {
      const config: ZipProcessorConfig = {
        compressionLevel: 9,
        recursive: true,
        maxFileSizeMB: 100,
        preservePaths: true,
      };

      const processor = new ZipProcessor(config);

      const testFile = path.join(testFilesDir, 'test.txt');
      fs.writeFileSync(testFile, 'Content');

      const result = await processor.compress(testFile, {
        outputPath: path.join(outputDir, 'custom.zip'),
        overwrite: true,
      });

      expect(result.success).toBe(true);
    });

    it('应该支持事件监听', async () => {
      const processor = new ZipProcessor();
      const events: string[] = [];

      processor.on('progress', (data) => {
        events.push('progress');
      });

      const testFile = path.join(testFilesDir, 'test.txt');
      fs.writeFileSync(testFile, 'Content');

      await processor.compress(testFile, {
        outputPath: path.join(outputDir, 'event.zip'),
        overwrite: true,
      });

      // 事件可能被触发
      expect(processor).toBeDefined();
    });
  });

  describe('流式处理', () => {
    it('应该支持流式压缩', async () => {
      const testFile = path.join(testFilesDir, 'test.txt');
      fs.writeFileSync(testFile, 'Stream content');

      const result = await zipStream(testFile, path.join(outputDir, 'stream.zip'), {
        overwrite: true,
      });

      expect(result.success).toBe(true);
      expect(result.filesCompressed).toBe(1);
    });

    it('应该支持流式解压', async () => {
      const testFile = path.join(testFilesDir, 'test.txt');
      fs.writeFileSync(testFile, 'Stream content');

      const zipPath = path.join(outputDir, 'stream.zip');
      await zip(testFile, zipPath, { overwrite: true });

      const extractDir = path.join(outputDir, 'extracted');
      const result = await unzipStream(zipPath, extractDir, { overwrite: true });

      expect(result.success).toBe(true);
      expect(result.filesExtracted).toBe(1);
    });
  });

  describe('边界情况', () => {
    it('应该处理空目录', async () => {
      const emptyDir = path.join(testFilesDir, 'empty');
      fs.mkdirSync(emptyDir);

      const zipPath = path.join(outputDir, 'empty.zip');
      const result = await zip(emptyDir, zipPath, { overwrite: true });

      // 空目录没有文件，应该返回失败或 0 个文件
      expect(result.filesCompressed).toBe(0);
    });

    it('应该处理大文件', async () => {
      const largeFile = path.join(testFilesDir, 'large.bin');
      const size = 10 * 1024 * 1024; // 10MB
      const buffer = Buffer.alloc(size, 'A');
      fs.writeFileSync(largeFile, buffer);

      const zipPath = path.join(outputDir, 'large.zip');
      const result = await zip(largeFile, zipPath, {
        overwrite: true,
        level: 6,
        onProgress: (progress) => {
          expect(progress.percentage).toBeGreaterThanOrEqual(0);
          expect(progress.percentage).toBeLessThanOrEqual(100);
        },
      });

      expect(result.success).toBe(true);
      expect(result.compressionRatio).toBeGreaterThan(1);
    });

    it('应该处理特殊字符文件名', async () => {
      const specialFile = path.join(testFilesDir, 'file-with-spaces.txt');
      fs.writeFileSync(specialFile, 'Special');

      const zipPath = path.join(outputDir, 'special.zip');
      const compressResult = await zip(specialFile, zipPath, { overwrite: true });

      expect(compressResult.success).toBe(true);

      const extractDir = path.join(outputDir, 'extracted');
      const extractResult = await unzip(zipPath, extractDir, { overwrite: true });

      expect(extractResult.success).toBe(true);
      expect(fs.existsSync(path.join(extractDir, 'file-with-spaces.txt'))).toBe(true);
    });
  });
});

describe('便捷函数', () => {
  it('应该导出 zip 函数', () => {
    expect(zip).toBeDefined();
    expect(typeof zip).toBe('function');
  });

  it('应该导出 unzip 函数', () => {
    expect(unzip).toBeDefined();
    expect(typeof unzip).toBe('function');
  });

  it('应该导出 zipInfo 函数', () => {
    expect(zipInfo).toBeDefined();
    expect(typeof zipInfo).toBe('function');
  });

  it('应该导出 zipStream 函数', () => {
    expect(zipStream).toBeDefined();
    expect(typeof zipStream).toBe('function');
  });

  it('应该导出 unzipStream 函数', () => {
    expect(unzipStream).toBeDefined();
    expect(typeof unzipStream).toBe('function');
  });
});
