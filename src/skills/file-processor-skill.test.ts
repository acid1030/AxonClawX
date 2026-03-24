/**
 * 文件处理技能测试 - File Processor Skill Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { FileProcessor, createFileProcessor, readFile, writeFile } from './file-processor-skill';

describe('FileProcessor', () => {
  let processor: FileProcessor;
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'file-processor-test-'));
    processor = createFileProcessor({
      defaultEncoding: 'utf-8',
      recursive: true,
      maxFileSizeMB: 10,
      tempDir,
    });
  });

  afterEach(() => {
    processor.cleanupTempFiles();
  });

  describe('基础文件操作', () => {
    it('应该能写入和读取文件', async () => {
      const testPath = path.join(tempDir, 'test.txt');
      const testContent = 'Hello, World!';

      await processor.write(testPath, testContent);
      const result = await processor.read(testPath);

      expect(result.content).toBe(testContent);
      expect(result.size).toBe(testContent.length);
    });

    it('应该能获取文件信息', async () => {
      const testPath = path.join(tempDir, 'info-test.json');
      const testContent = '{"test": true}';

      await processor.write(testPath, testContent);
      const info = await processor.info(testPath, true);

      expect(info.isFile).toBe(true);
      expect(info.extension).toBe('json');
      expect(info.md5).toBeDefined();
      expect(info.sha256).toBeDefined();
    });

    it('应该能复制文件', async () => {
      const sourcePath = path.join(tempDir, 'source.txt');
      const destPath = path.join(tempDir, 'dest.txt');

      await processor.write(sourcePath, 'Copy me!');
      await processor.copy(sourcePath, destPath);

      const destContent = await processor.read(destPath);
      expect(destContent.content).toBe('Copy me!');
    });

    it('应该能移动文件', async () => {
      const sourcePath = path.join(tempDir, 'old.txt');
      const destPath = path.join(tempDir, 'new.txt');

      await processor.write(sourcePath, 'Move me!');
      await processor.move(sourcePath, destPath);

      expect(fs.existsSync(sourcePath)).toBe(false);
      expect(fs.existsSync(destPath)).toBe(true);
    });

    it('应该能删除文件', async () => {
      const testPath = path.join(tempDir, 'delete-me.txt');
      await processor.write(testPath, 'Bye!');

      await processor.delete(testPath);
      expect(fs.existsSync(testPath)).toBe(false);
    });

    it('应该能创建备份', async () => {
      const testPath = path.join(tempDir, 'backup-test.txt');
      await processor.write(testPath, 'Version 1');

      await processor.write(testPath, 'Version 2', { backup: true });

      expect(fs.existsSync(testPath + '.bak')).toBe(true);
      const backupContent = fs.readFileSync(testPath + '.bak', 'utf-8');
      expect(backupContent).toBe('Version 1');
    });
  });

  describe('文件转换', () => {
    it('应该能转换 JSON 到 YAML', async () => {
      const jsonPath = path.join(tempDir, 'data.json');
      const yamlPath = path.join(tempDir, 'data.yaml');
      const testData = { name: 'Test', value: 123 };

      await processor.write(jsonPath, JSON.stringify(testData));
      await processor.convertAndSave(jsonPath, yamlPath, { format: 'yaml' });

      const yamlContent = await processor.read(yamlPath);
      expect(yamlContent.content).toContain('name: "Test"');
      expect(yamlContent.content).toContain('value: 123');
    });

    it('应该能转换 CSV 到 JSON', async () => {
      const csvPath = path.join(tempDir, 'users.csv');
      const jsonPath = path.join(tempDir, 'users.json');
      const csvContent = 'name,email\nAlice,alice@test.com\nBob,bob@test.com';

      await processor.write(csvPath, csvContent);
      await processor.convertAndSave(csvPath, jsonPath, { format: 'json' });

      const jsonContent = await processor.read(jsonPath);
      const data = JSON.parse(jsonContent.content as string);
      expect(data).toHaveLength(2);
      expect(data[0].name).toBe('Alice');
    });

    it('应该能转换 JSON 到 HTML', async () => {
      const jsonPath = path.join(tempDir, 'report.json');
      const htmlPath = path.join(tempDir, 'report.html');

      await processor.write(jsonPath, JSON.stringify({ title: 'Test', value: 42 }));
      await processor.convertAndSave(jsonPath, htmlPath, { format: 'html' });

      const htmlContent = await processor.read(htmlPath);
      expect(htmlContent.content).toContain('<table>');
      expect(htmlContent.content).toContain('<th>title</th>');
    });
  });

  describe('批量处理', () => {
    it('应该能批量读取文件', async () => {
      const files = ['a.txt', 'b.txt', 'c.txt'];
      const paths = files.map(f => path.join(tempDir, f));

      for (const p of paths) {
        await processor.write(p, `Content of ${p}`);
      }

      const results = await processor.batchRead(paths);

      expect(results.successCount).toBe(3);
      expect(results.failedCount).toBe(0);
      expect(results.successful).toHaveLength(3);
    });

    it('应该能批量写入文件', async () => {
      const files = [
        { path: path.join(tempDir, 'x.txt'), content: 'X' },
        { path: path.join(tempDir, 'y.txt'), content: 'Y' },
        { path: path.join(tempDir, 'z.txt'), content: 'Z' },
      ];

      const results = await processor.batchWrite(files);

      expect(results.successCount).toBe(3);
      expect(fs.existsSync(files[0].path)).toBe(true);
    });

    it('应该能扫描文件', () => {
      // 创建测试文件
      fs.writeFileSync(path.join(tempDir, 'test1.ts'), 'const a = 1;');
      fs.writeFileSync(path.join(tempDir, 'test2.ts'), 'const b = 2;');
      fs.writeFileSync(path.join(tempDir, 'test.js'), 'const c = 3;');

      const files = processor.scanFiles(tempDir, { extension: 'ts' });

      expect(files).toHaveLength(2);
      expect(files.every(f => f.extension === 'ts')).toBe(true);
    });

    it('应该能用正则过滤文件名', () => {
      fs.writeFileSync(path.join(tempDir, 'test-001.ts'), '1');
      fs.writeFileSync(path.join(tempDir, 'test-002.ts'), '2');
      fs.writeFileSync(path.join(tempDir, 'prod-001.ts'), '3');

      const files = processor.scanFiles(tempDir, {
        namePattern: /^test-.*\.ts$/,
      });

      expect(files).toHaveLength(2);
    });
  });

  describe('文件查找', () => {
    it('应该能用通配符查找文件', () => {
      fs.writeFileSync(path.join(tempDir, 'config.json'), '{}');
      fs.writeFileSync(path.join(tempDir, 'config.yaml'), '');
      fs.writeFileSync(path.join(tempDir, 'README.md'), '');

      const jsonFiles = processor.findFiles('*.json', tempDir);
      expect(jsonFiles).toHaveLength(1);
      expect(jsonFiles[0]).toContain('config.json');

      const allConfig = processor.findFiles('config.*', tempDir);
      expect(allConfig).toHaveLength(2);
    });
  });

  describe('便捷函数', () => {
    it('应该能用 readFile 快速读取', async () => {
      const testPath = path.join(tempDir, 'quick.txt');
      fs.writeFileSync(testPath, 'Quick read test');

      const content = await readFile(testPath);
      expect(content).toBe('Quick read test');
    });

    it('应该能用 writeFile 快速写入', async () => {
      const testPath = path.join(tempDir, 'quick-write.txt');
      await writeFile(testPath, 'Quick write test');

      const content = fs.readFileSync(testPath, 'utf-8');
      expect(content).toBe('Quick write test');
    });
  });

  describe('错误处理', () => {
    it('应该抛出文件不存在的错误', async () => {
      const nonExistent = path.join(tempDir, 'does-not-exist.txt');

      await expect(processor.read(nonExistent)).rejects.toThrow();
    });

    it('应该抛出文件过大的错误', async () => {
      const largePath = path.join(tempDir, 'large.txt');
      const largeContent = 'x'.repeat(11 * 1024 * 1024); // 11MB

      fs.writeFileSync(largePath, largeContent);

      await expect(processor.read(largePath)).rejects.toThrow('File too large');
    });
  });
});
