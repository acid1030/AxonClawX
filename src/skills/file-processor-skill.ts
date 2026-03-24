/**
 * 文件处理技能 - File Processor Skill
 * 
 * 功能:
 * 1. 文件读取/写入 (支持多种编码)
 * 2. 文件转换 (JSON/YAML/CSV/Markdown 等)
 * 3. 批量处理 (通配符/递归/过滤)
 * 
 * @author Axon
 * @version 1.0.0
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import * as os from 'os';

// ============== 类型定义 ==============

export interface FileProcessorConfig {
  /** 默认编码 */
  defaultEncoding: BufferEncoding;
  /** 是否递归处理子目录 */
  recursive: boolean;
  /** 最大文件大小 (MB) */
  maxFileSizeMB: number;
  /** 临时目录路径 */
  tempDir?: string;
}

export interface ReadOptions {
  /** 文件编码 */
  encoding?: BufferEncoding;
  /** 是否返回 Buffer */
  asBuffer?: boolean;
  /** 读取偏移量 (字节) */
  offset?: number;
  /** 读取长度 (字节) */
  length?: number;
}

export interface WriteOptions {
  /** 文件编码 */
  encoding?: BufferEncoding;
  /** 是否创建备份 */
  backup?: boolean;
  /** 备份后缀 */
  backupSuffix?: string;
  /** 是否创建父目录 */
  createParentDirs?: boolean;
  /** 文件权限模式 */
  mode?: number;
}

export interface FileFilter {
  /** 文件名正则匹配 */
  namePattern?: RegExp;
  /** 文件扩展名 */
  extension?: string | string[];
  /** 最小文件大小 (字节) */
  minSize?: number;
  /** 最大文件大小 (字节) */
  maxSize?: number;
  /** 排除的文件/目录 */
  exclude?: string[];
  /** 仅文件/仅目录 */
  type?: 'file' | 'directory';
  /** 修改时间范围 */
  modifiedAfter?: Date;
  modifiedBefore?: Date;
}

export interface FileInfo {
  /** 完整路径 */
  path: string;
  /** 文件名 */
  name: string;
  /** 扩展名 */
  extension: string;
  /** 文件大小 (字节) */
  size: number;
  /** 创建时间 */
  createdAt: Date;
  /** 修改时间 */
  modifiedAt: Date;
  /** 访问时间 */
  accessedAt: Date;
  /** 是否为目录 */
  isDirectory: boolean;
  /** 是否为文件 */
  isFile: boolean;
  /** 是否为符号链接 */
  isSymbolicLink: boolean;
  /** MD5 哈希 */
  md5?: string;
  /** SHA256 哈希 */
  sha256?: string;
}

export interface BatchResult<T> {
  /** 成功的文件 */
  successful: { path: string; result: T }[];
  /** 失败的文件 */
  failed: { path: string; error: Error }[];
  /** 总计文件数 */
  total: number;
  /** 成功数量 */
  successCount: number;
  /** 失败数量 */
  failedCount: number;
}

export interface ConvertOptions {
  /** 目标格式 */
  format: 'json' | 'yaml' | 'csv' | 'markdown' | 'html' | 'xml' | 'text';
  /** 格式化选项 */
  formatOptions?: {
    /** JSON 缩进空格数 */
    indent?: number;
    /** CSV 分隔符 */
    delimiter?: string;
    /** 是否包含 BOM */
    bom?: boolean;
  };
}

export interface FileContent {
  /** 文件路径 */
  path: string;
  /** 内容 (文本或 Buffer) */
  content: string | Buffer;
  /** 编码 */
  encoding: BufferEncoding;
  /** 文件大小 */
  size: number;
  /** 读取时间 */
  readAt: Date;
}

// ============== 工具函数 ==============

/**
 * 计算文件哈希
 */
function calculateHash(filePath: string, algorithm: 'md5' | 'sha256'): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash(algorithm);
    const stream = fs.createReadStream(filePath);
    
    stream.on('data', (data) => hash.update(data));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
}

/**
 * 确保目录存在
 */
function ensureDir(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * 匹配文件过滤器
 */
function matchesFilter(fileInfo: fs.Dirent, filePath: string, filter?: FileFilter): boolean {
  if (!filter) return true;

  const stat = fs.statSync(filePath);

  // 类型过滤
  if (filter.type === 'file' && !fileInfo.isFile()) return false;
  if (filter.type === 'directory' && !fileInfo.isDirectory()) return false;

  // 名称正则匹配
  if (filter.namePattern && !filter.namePattern.test(fileInfo.name)) return false;

  // 扩展名匹配
  if (filter.extension) {
    const ext = path.extname(fileInfo.name).slice(1).toLowerCase();
    const extensions = Array.isArray(filter.extension) 
      ? filter.extension.map(e => e.toLowerCase())
      : [filter.extension.toLowerCase()];
    if (!extensions.includes(ext)) return false;
  }

  // 大小过滤
  if (filter.minSize !== undefined && stat.size < filter.minSize) return false;
  if (filter.maxSize !== undefined && stat.size > filter.maxSize) return false;

  // 排除项
  if (filter.exclude) {
    for (const exclude of filter.exclude) {
      if (filePath.includes(exclude)) return false;
    }
  }

  // 修改时间过滤
  if (filter.modifiedAfter && stat.mtime < filter.modifiedAfter) return false;
  if (filter.modifiedBefore && stat.mtime > filter.modifiedBefore) return false;

  return true;
}

/**
 * 解析 YAML 字符串 (简单实现)
 */
function parseYAML(content: string): any {
  // 简单 YAML 解析 (仅支持基础结构)
  const result: any = {};
  const lines = content.split('\n');
  let currentKey = '';
  let currentIndent = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const indent = line.search(/\S/);
    const match = trimmed.match(/^(\w+):\s*(.*)$/);

    if (match) {
      currentKey = match[1];
      const value = match[2].trim();
      
      if (value) {
        // 尝试解析值类型
        if (value === 'true') result[currentKey] = true;
        else if (value === 'false') result[currentKey] = false;
        else if (/^\d+$/.test(value)) result[currentKey] = parseInt(value, 10);
        else if (/^\d+\.\d+$/.test(value)) result[currentKey] = parseFloat(value);
        else if (value.startsWith('"') && value.endsWith('"')) {
          result[currentKey] = value.slice(1, -1);
        } else {
          result[currentKey] = value;
        }
      } else {
        result[currentKey] = {};
      }
      currentIndent = indent;
    }
  }

  return result;
}

/**
 * 转换为 YAML 字符串
 */
function toYAML(obj: any, indent: number = 0): string {
  let result = '';
  const prefix = '  '.repeat(indent);

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      result += `${prefix}${key}:\n${toYAML(value, indent + 1)}`;
    } else if (Array.isArray(value)) {
      result += `${prefix}${key}:\n`;
      for (const item of value) {
        if (typeof item === 'object' && item !== null) {
          result += `${prefix}  -\n${toYAML(item, indent + 2)}`;
        } else {
          result += `${prefix}  - ${item}\n`;
        }
      }
    } else if (typeof value === 'string') {
      result += `${prefix}${key}: "${value}"\n`;
    } else {
      result += `${prefix}${key}: ${value}\n`;
    }
  }

  return result;
}

/**
 * 解析 CSV 字符串
 */
function parseCSV(content: string, delimiter: string = ','): any[] {
  const lines = content.trim().split('\n');
  if (lines.length === 0) return [];

  const headers = lines[0].split(delimiter).map(h => h.trim());
  const result = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(delimiter).map(v => v.trim());
    const row: any = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    result.push(row);
  }

  return result;
}

/**
 * 转换为 CSV 字符串
 */
function toCSV(data: any[], delimiter: string = ','): string {
  if (data.length === 0) return '';

  const headers = Object.keys(data[0]);
  const lines = [headers.join(delimiter)];

  for (const row of data) {
    const values = headers.map(h => {
      const val = row[h];
      if (typeof val === 'string' && val.includes(delimiter)) {
        return `"${val}"`;
      }
      return String(val);
    });
    lines.push(values.join(delimiter));
  }

  return lines.join('\n');
}

// ============== 文件处理器类 ==============

/**
 * 文件处理器类
 */
export class FileProcessor {
  private config: FileProcessorConfig;

  constructor(config?: Partial<FileProcessorConfig>) {
    this.config = {
      defaultEncoding: 'utf-8',
      recursive: true,
      maxFileSizeMB: 100,
      tempDir: undefined,
      ...config,
    };
  }

  // ============== 基础文件操作 ==============

  /**
   * 读取文件
   */
  async read(filePath: string, options?: ReadOptions): Promise<FileContent> {
    const opts: ReadOptions = {
      encoding: this.config.defaultEncoding,
      asBuffer: false,
      ...options,
    };

    const stat = fs.statSync(filePath);
    
    // 检查文件大小
    const maxSizeBytes = this.config.maxFileSizeMB * 1024 * 1024;
    if (stat.size > maxSizeBytes) {
      throw new Error(`File too large: ${filePath} (${(stat.size / 1024 / 1024).toFixed(2)}MB > ${this.config.maxFileSizeMB}MB)`);
    }

    let content: string | Buffer;

    if (opts.asBuffer || !opts.encoding) {
      content = fs.readFileSync(filePath);
    } else {
      content = fs.readFileSync(filePath, opts.encoding);
    }

    return {
      path: filePath,
      content,
      encoding: opts.encoding || 'utf-8',
      size: stat.size,
      readAt: new Date(),
    };
  }

  /**
   * 写入文件
   */
  async write(filePath: string, content: string | Buffer, options?: WriteOptions): Promise<void> {
    const opts: WriteOptions = {
      encoding: this.config.defaultEncoding,
      backup: false,
      createParentDirs: true,
      ...options,
    };

    // 创建备份
    if (opts.backup && fs.existsSync(filePath)) {
      const backupPath = `${filePath}${opts.backupSuffix || '.bak'}`;
      fs.copyFileSync(filePath, backupPath);
    }

    // 创建父目录
    if (opts.createParentDirs) {
      const dir = path.dirname(filePath);
      ensureDir(dir);
    }

    // 写入文件
    if (typeof content === 'string') {
      fs.writeFileSync(filePath, content, {
        encoding: opts.encoding,
        mode: opts.mode,
      });
    } else {
      fs.writeFileSync(filePath, content, { mode: opts.mode });
    }
  }

  /**
   * 删除文件
   */
  async delete(filePath: string, recursive: boolean = false): Promise<void> {
    if (recursive) {
      fs.rmSync(filePath, { recursive: true, force: true });
    } else {
      fs.unlinkSync(filePath);
    }
  }

  /**
   * 复制文件
   */
  async copy(sourcePath: string, destPath: string): Promise<void> {
    const destDir = path.dirname(destPath);
    ensureDir(destDir);
    fs.copyFileSync(sourcePath, destPath);
  }

  /**
   * 移动/重命名文件
   */
  async move(sourcePath: string, destPath: string): Promise<void> {
    const destDir = path.dirname(destPath);
    ensureDir(destDir);
    fs.renameSync(sourcePath, destPath);
  }

  /**
   * 获取文件信息
   */
  async info(filePath: string, includeHash: boolean = false): Promise<FileInfo> {
    const stat = fs.statSync(filePath);
    const parsedPath = path.parse(filePath);

    const info: FileInfo = {
      path: filePath,
      name: parsedPath.base,
      extension: parsedPath.ext.slice(1),
      size: stat.size,
      createdAt: stat.birthtime,
      modifiedAt: stat.mtime,
      accessedAt: stat.atime,
      isDirectory: stat.isDirectory(),
      isFile: stat.isFile(),
      isSymbolicLink: stat.isSymbolicLink(),
    };

    if (includeHash && stat.isFile()) {
      info.md5 = await calculateHash(filePath, 'md5');
      info.sha256 = await calculateHash(filePath, 'sha256');
    }

    return info;
  }

  // ============== 批量处理 ==============

  /**
   * 扫描文件
   */
  scanFiles(dirPath: string, filter?: FileFilter): FileInfo[] {
    const results: FileInfo[] = [];

    const scan = (dir: string) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        // 跳过排除项
        if (filter?.exclude?.some(ex => fullPath.includes(ex))) {
          continue;
        }

        if (matchesFilter(entry, fullPath, filter)) {
          if (entry.isFile()) {
            results.push(this.infoSync(fullPath));
          } else if (entry.isDirectory() && this.config.recursive) {
            scan(fullPath);
          }
        }
      }
    };

    scan(dirPath);
    return results;
  }

  /**
   * 同步版本的文件信息获取
   */
  private infoSync(filePath: string): FileInfo {
    const stat = fs.statSync(filePath);
    const parsedPath = path.parse(filePath);

    return {
      path: filePath,
      name: parsedPath.base,
      extension: parsedPath.ext.slice(1),
      size: stat.size,
      createdAt: stat.birthtime,
      modifiedAt: stat.mtime,
      accessedAt: stat.atime,
      isDirectory: stat.isDirectory(),
      isFile: stat.isFile(),
      isSymbolicLink: stat.isSymbolicLink(),
    };
  }

  /**
   * 批量读取文件
   */
  async batchRead(filePaths: string[], options?: ReadOptions): Promise<BatchResult<FileContent>> {
    const results: BatchResult<FileContent> = {
      successful: [],
      failed: [],
      total: filePaths.length,
      successCount: 0,
      failedCount: 0,
    };

    for (const filePath of filePaths) {
      try {
        const content = await this.read(filePath, options);
        results.successful.push({ path: filePath, result: content });
        results.successCount++;
      } catch (error) {
        results.failed.push({ path: filePath, error: error as Error });
        results.failedCount++;
      }
    }

    return results;
  }

  /**
   * 批量写入文件
   */
  async batchWrite(
    files: { path: string; content: string | Buffer }[],
    options?: WriteOptions
  ): Promise<BatchResult<void>> {
    const results: BatchResult<void> = {
      successful: [],
      failed: [],
      total: files.length,
      successCount: 0,
      failedCount: 0,
    };

    for (const file of files) {
      try {
        await this.write(file.path, file.content, options);
        results.successful.push({ path: file.path, result: undefined });
        results.successCount++;
      } catch (error) {
        results.failed.push({ path: file.path, error: error as Error });
        results.failedCount++;
      }
    }

    return results;
  }

  /**
   * 批量处理文件
   */
  async batchProcess<T>(
    dirPath: string,
    processor: (file: FileInfo, content: string | Buffer) => Promise<T>,
    filter?: FileFilter,
    options?: ReadOptions
  ): Promise<BatchResult<T>> {
    const files = this.scanFiles(dirPath, filter);
    const results: BatchResult<T> = {
      successful: [],
      failed: [],
      total: files.length,
      successCount: 0,
      failedCount: 0,
    };

    for (const file of files) {
      try {
        const content = await this.read(file.path, options);
        const result = await processor(file, content.content);
        results.successful.push({ path: file.path, result });
        results.successCount++;
      } catch (error) {
        results.failed.push({ path: file.path, error: error as Error });
        results.failedCount++;
      }
    }

    return results;
  }

  // ============== 文件转换 ==============

  /**
   * 转换文件格式
   */
  async convert(filePath: string, options: ConvertOptions): Promise<string> {
    const fileContent = await this.read(filePath);
    let data: any;

    // 解析源文件
    const ext = path.extname(filePath).slice(1).toLowerCase();
    switch (ext) {
      case 'json':
        data = JSON.parse(fileContent.content as string);
        break;
      case 'yaml':
      case 'yml':
        data = parseYAML(fileContent.content as string);
        break;
      case 'csv':
        data = parseCSV(fileContent.content as string, options.formatOptions?.delimiter);
        break;
      case 'md':
      case 'markdown':
        data = { content: fileContent.content as string };
        break;
      default:
        data = { content: fileContent.content as string };
    }

    // 转换为目标格式
    let output: string;
    switch (options.format) {
      case 'json':
        output = JSON.stringify(data, null, options.formatOptions?.indent ?? 2);
        break;
      case 'yaml':
        output = toYAML(data);
        break;
      case 'csv':
        output = toCSV(Array.isArray(data) ? data : [data], options.formatOptions?.delimiter);
        break;
      case 'markdown':
        output = this.toMarkdown(data);
        break;
      case 'html':
        output = this.toHTML(data);
        break;
      case 'xml':
        output = this.toXML(data);
        break;
      case 'text':
        output = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
        break;
      default:
        throw new Error(`Unsupported format: ${options.format}`);
    }

    // 添加 BOM
    if (options.formatOptions?.bom) {
      output = '\uFEFF' + output;
    }

    return output;
  }

  /**
   * 转换为 Markdown
   */
  private toMarkdown(data: any): string {
    if (typeof data === 'string') return data;
    
    let md = '# Data\n\n';
    for (const [key, value] of Object.entries(data)) {
      md += `## ${key}\n\n${value}\n\n`;
    }
    return md;
  }

  /**
   * 转换为 HTML
   */
  private toHTML(data: any): string {
    if (typeof data === 'string') {
      return `<!DOCTYPE html><html><body><pre>${data}</pre></body></html>`;
    }
    
    let html = '<!DOCTYPE html><html><body><table>\n';
    const keys = Object.keys(data);
    html += '<tr>' + keys.map(k => `<th>${k}</th>`).join('') + '</tr>\n';
    html += '<tr>' + keys.map(k => `<td>${data[k]}</td>`).join('') + '</tr>\n';
    html += '</table></body></html>';
    return html;
  }

  /**
   * 转换为 XML
   */
  private toXML(data: any, rootName: string = 'root'): string {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += `<${rootName}>\n`;
    
    for (const [key, value] of Object.entries(data)) {
      if (typeof value === 'object' && value !== null) {
        xml += `  <${key}>\n${this.toXML(value, key).split('\n').slice(1).join('\n')}`;
      } else {
        xml += `  <${key}>${value}</${key}>\n`;
      }
    }
    
    xml += `</${rootName}>`;
    return xml;
  }

  /**
   * 转换并保存文件
   */
  async convertAndSave(
    sourcePath: string,
    destPath: string,
    options: ConvertOptions,
    writeOptions?: WriteOptions
  ): Promise<void> {
    const content = await this.convert(sourcePath, options);
    await this.write(destPath, content, writeOptions);
  }

  // ============== 实用工具 ==============

  /**
   * 查找文件 (支持通配符)
   */
  findFiles(pattern: string, baseDir: string = '.'): string[] {
    const results: string[] = [];
    const resolvedBase = path.resolve(baseDir);

    const scan = (dir: string) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          if (this.config.recursive && !entry.name.startsWith('.')) {
            scan(fullPath);
          }
        } else if (entry.isFile()) {
          // 简单通配符匹配
          const regex = new RegExp(
            '^' + pattern.replace(/\*/g, '.*').replace(/\?/g, '.') + '$'
          );
          if (regex.test(entry.name)) {
            results.push(fullPath);
          }
        }
      }
    };

    scan(resolvedBase);
    return results;
  }

  /**
   * 创建临时文件
   */
  createTempFile(prefix: string = 'tmp', suffix: string = '', content?: string | Buffer): string {
    const tempDir = this.config.tempDir || fs.mkdtempSync(path.join(os.tmpdir(), 'file-processor-'));
    const fileName = `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}${suffix}`;
    const filePath = path.join(tempDir, fileName);

    if (content !== undefined) {
      this.writeSync(filePath, content);
    }

    return filePath;
  }

  /**
   * 同步写入 (内部使用)
   */
  private writeSync(filePath: string, content: string | Buffer): void {
    const dir = path.dirname(filePath);
    ensureDir(dir);
    fs.writeFileSync(filePath, content);
  }

  /**
   * 清理临时文件
   */
  cleanupTempFiles(): void {
    if (this.config.tempDir && fs.existsSync(this.config.tempDir)) {
      fs.rmSync(this.config.tempDir, { recursive: true, force: true });
    }
  }
}

// ============== 导出便捷函数 ==============

/**
 * 创建文件处理器实例
 */
export function createFileProcessor(config?: Partial<FileProcessorConfig>): FileProcessor {
  return new FileProcessor(config);
}

/**
 * 快速读取文件
 */
export async function readFile(filePath: string, encoding: BufferEncoding = 'utf-8'): Promise<string> {
  const processor = new FileProcessor();
  const result = await processor.read(filePath, { encoding });
  return result.content as string;
}

/**
 * 快速写入文件
 */
export async function writeFile(
  filePath: string,
  content: string | Buffer,
  encoding: BufferEncoding = 'utf-8'
): Promise<void> {
  const processor = new FileProcessor();
  await processor.write(filePath, content, { encoding });
}

/**
 * 快速转换文件
 */
export async function convertFile(
  sourcePath: string,
  destPath: string,
  format: ConvertOptions['format']
): Promise<void> {
  const processor = new FileProcessor();
  await processor.convertAndSave(sourcePath, destPath, { format });
}

/**
 * 批量查找文件
 */
export function findFiles(pattern: string, baseDir: string = '.'): string[] {
  const processor = new FileProcessor();
  return processor.findFiles(pattern, baseDir);
}

// ============== 导出默认 ==============

export default FileProcessor;
