/**
 * File Upload Middleware
 * 
 * 实现多文件上传、文件大小限制、文件类型过滤、上传进度跟踪
 * 
 * @author Axon
 * @version 1.0.0
 */

import { IncomingMessage } from 'http';
import { EventEmitter } from 'events';

/**
 * 文件上传配置
 */
export interface FileUploadConfig {
  /** 最大文件大小 (字节)，默认 10MB */
  maxFileSize?: number;
  /** 最大总上传大小 (字节)，默认 50MB */
  maxTotalSize?: number;
  /** 允许的文件类型 (MIME types 或扩展名) */
  allowedTypes?: string[];
  /** 禁止的文件类型 */
  blockedTypes?: string[];
  /** 最大文件数量 */
  maxFiles?: number;
  /** 上传目录 */
  uploadDir?: string;
  /** 是否保留原始文件名 */
  keepOriginalName?: boolean;
  /** 临时文件清理时间 (毫秒)，默认 1 小时 */
  tempFileCleanupMs?: number;
}

/**
 * 上传的文件信息
 */
export interface UploadedFile {
  /** 原始文件名 */
  originalName: string;
  /** 存储文件名 */
  storedName: string;
  /** 文件 MIME 类型 */
  mimeType: string;
  /** 文件大小 (字节) */
  size: number;
  /** 文件路径 */
  path: string;
  /** 字段名 */
  fieldname: string;
  /** 上传时间 */
  uploadedAt: Date;
  /** 文件哈希 (可选) */
  hash?: string;
}

/**
 * 上传进度信息
 */
export interface UploadProgress {
  /** 已上传字节数 */
  uploadedBytes: number;
  /** 总字节数 */
  totalBytes: number;
  /** 上传百分比 (0-100) */
  percentage: number;
  /** 已上传文件数 */
  uploadedFiles: number;
  /** 总文件数 */
  totalFiles: number;
  /** 当前上传的文件 */
  currentFile?: string;
}

/**
 * 上传错误类型
 */
export enum UploadErrorType {
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  TOTAL_SIZE_EXCEEDED = 'TOTAL_SIZE_EXCEEDED',
  INVALID_FILE_TYPE = 'INVALID_FILE_TYPE',
  BLOCKED_FILE_TYPE = 'BLOCKED_FILE_TYPE',
  TOO_MANY_FILES = 'TOO_MANY_FILES',
  NO_FILES_UPLOADED = 'NO_FILES_UPLOADED',
  UPLOAD_FAILED = 'UPLOAD_FAILED',
  DISK_FULL = 'DISK_FULL',
  INVALID_REQUEST = 'INVALID_REQUEST',
}

/**
 * 上传错误
 */
export class UploadError extends Error {
  type: UploadErrorType;
  code: number;

  constructor(type: UploadErrorType, message: string, code: number = 400) {
    super(message);
    this.name = 'UploadError';
    this.type = type;
    this.code = code;
  }
}

/**
 * 上传事件
 */
export interface UploadEvents {
  /** 开始上传 */
  start: (totalBytes: number, totalFiles: number) => void;
  /** 进度更新 */
  progress: (progress: UploadProgress) => void;
  /** 文件上传完成 */
  fileComplete: (file: UploadedFile) => void;
  /** 上传完成 */
  complete: (files: UploadedFile[]) => void;
  /** 上传错误 */
  error: (error: UploadError) => void;
}

/**
 * 上传会话 - 跟踪单个上传请求的状态
 */
export class UploadSession extends EventEmitter {
  private sessionId: string;
  private uploadedBytes = 0;
  private totalBytes = 0;
  private uploadedFiles: UploadedFile[] = [];
  private totalFiles = 0;
  private currentFile: string = '';
  private startTime: number = 0;
  private config: FileUploadConfig;

  constructor(sessionId: string, config: FileUploadConfig) {
    super();
    this.sessionId = sessionId;
    this.config = config;
    this.startTime = Date.now();
  }

  /**
   * 设置总文件数和总大小
   */
  initialize(totalFiles: number, totalBytes: number): void {
    this.totalFiles = totalFiles;
    this.totalBytes = totalBytes;
    this.emit('start', totalBytes, totalFiles);
  }

  /**
   * 更新当前上传的文件
   */
  setCurrentFile(filename: string): void {
    this.currentFile = filename;
  }

  /**
   * 更新上传进度
   */
  updateProgress(uploadedBytes: number): void {
    this.uploadedBytes = uploadedBytes;
    this.emit('progress', this.getProgress());
  }

  /**
   * 添加已完成的文件
   */
  addFile(file: UploadedFile): void {
    this.uploadedFiles.push(file);
    this.emit('fileComplete', file);
  }

  /**
   * 获取当前进度
   */
  getProgress(): UploadProgress {
    return {
      uploadedBytes: this.uploadedBytes,
      totalBytes: this.totalBytes,
      percentage: this.totalBytes > 0 
        ? Math.round((this.uploadedBytes / this.totalBytes) * 100) 
        : 0,
      uploadedFiles: this.uploadedFiles.length,
      totalFiles: this.totalFiles,
      currentFile: this.currentFile || undefined,
    };
  }

  /**
   * 完成上传
   */
  finalize(): UploadedFile[] {
    this.emit('complete', this.uploadedFiles);
    return this.uploadedFiles;
  }

  /**
   * 上传失败
   */
  fail(error: UploadError): void {
    this.emit('error', error);
  }

  /**
   * 获取会话 ID
   */
  getId(): string {
    return this.sessionId;
  }

  /**
   * 获取上传耗时 (毫秒)
   */
  getDuration(): number {
    return Date.now() - this.startTime;
  }
}

/**
 * MIME 类型映射表
 */
const MIME_TYPE_MAP: Record<string, string[]> = {
  // 图片
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/gif': ['.gif'],
  'image/webp': ['.webp'],
  'image/svg+xml': ['.svg'],
  'image/bmp': ['.bmp'],
  
  // 文档
  'application/pdf': ['.pdf'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/vnd.ms-excel': ['.xls'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'text/plain': ['.txt'],
  'text/csv': ['.csv'],
  'application/rtf': ['.rtf'],
  
  // 代码
  'text/html': ['.html', '.htm'],
  'text/css': ['.css'],
  'text/javascript': ['.js'],
  'application/javascript': ['.js', '.mjs'],
  'application/typescript': ['.ts'],
  'application/json': ['.json'],
  'text/xml': ['.xml'],
  'application/xml': ['.xml'],
  'text/markdown': ['.md'],
  
  // 音频
  'audio/mpeg': ['.mp3'],
  'audio/wav': ['.wav'],
  'audio/ogg': ['.ogg'],
  'audio/webm': ['.weba'],
  
  // 视频
  'video/mp4': ['.mp4'],
  'video/webm': ['.webm'],
  'video/ogg': ['.ogv'],
  
  // 压缩
  'application/zip': ['.zip'],
  'application/x-rar-compressed': ['.rar'],
  'application/x-7z-compressed': ['.7z'],
  'application/gzip': ['.gz'],
  'application/x-tar': ['.tar'],
};

/**
 * 文件上传中间件类
 */
export class FileUploadMiddleware {
  private config: Required<FileUploadConfig>;
  private sessions: Map<string, UploadSession> = new Map();

  constructor(config: FileUploadConfig = {}) {
    this.config = {
      maxFileSize: config.maxFileSize ?? 10 * 1024 * 1024, // 10MB
      maxTotalSize: config.maxTotalSize ?? 50 * 1024 * 1024, // 50MB
      allowedTypes: config.allowedTypes ?? [],
      blockedTypes: config.blockedTypes ?? [],
      maxFiles: config.maxFiles ?? 10,
      uploadDir: config.uploadDir ?? './uploads',
      keepOriginalName: config.keepOriginalName ?? false,
      tempFileCleanupMs: config.tempFileCleanupMs ?? 3600000, // 1 小时
    };
  }

  /**
   * 验证文件类型
   */
  private validateFileType(filename: string, mimeType: string): boolean {
    const ext = '.' + filename.split('.').pop()?.toLowerCase();
    
    // 检查黑名单
    if (this.config.blockedTypes.length > 0) {
      if (this.config.blockedTypes.includes(mimeType)) {
        return false;
      }
      if (this.config.blockedTypes.includes(ext)) {
        return false;
      }
    }

    // 如果有白名单，检查白名单
    if (this.config.allowedTypes.length > 0) {
      if (this.config.allowedTypes.includes(mimeType)) {
        return true;
      }
      if (this.config.allowedTypes.includes(ext)) {
        return true;
      }
      // 检查 MIME 类型对应的扩展名
      const allowedExts = this.config.allowedTypes.flatMap(type => 
        MIME_TYPE_MAP[type] || [type]
      );
      if (allowedExts.includes(ext)) {
        return true;
      }
      return false;
    }

    return true;
  }

  /**
   * 生成唯一文件名
   */
  private generateFilename(originalName: string): string {
    if (this.config.keepOriginalName) {
      return originalName;
    }
    
    const ext = originalName.split('.').pop() || '';
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `${timestamp}_${random}${ext ? '.' + ext : ''}`;
  }

  /**
   * 创建上传会话
   */
  createSession(sessionId?: string): UploadSession {
    const id = sessionId || `upload_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const session = new UploadSession(id, this.config);
    this.sessions.set(id, session);
    return session;
  }

  /**
   * 获取上传会话
   */
  getSession(sessionId: string): UploadSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * 清理上传会话
   */
  removeSession(sessionId: string): void {
    this.sessions.delete(sessionId);
  }

  /**
   * 解析 multipart/form-data 请求
   */
  async parseMultipartRequest(
    req: IncomingMessage,
    session: UploadSession
  ): Promise<UploadedFile[]> {
    return new Promise((resolve, reject) => {
      const contentType = req.headers['content-type'];
      
      if (!contentType || !contentType.includes('multipart/form-data')) {
        const error = new UploadError(
          UploadErrorType.INVALID_REQUEST,
          'Content-Type must be multipart/form-data'
        );
        session.fail(error);
        reject(error);
        return;
      }

      // 简单的 multipart 解析器 (生产环境建议使用 busboy/multer)
      const boundary = contentType.split('boundary=')[1];
      if (!boundary) {
        const error = new UploadError(
          UploadErrorType.INVALID_REQUEST,
          'Invalid multipart boundary'
        );
        session.fail(error);
        reject(error);
        return;
      }

      const chunks: Buffer[] = [];
      let totalSize = 0;

      req.on('data', (chunk: Buffer) => {
        totalSize += chunk.length;
        
        // 检查总大小限制
        if (totalSize > this.config.maxTotalSize) {
          const error = new UploadError(
            UploadErrorType.TOTAL_SIZE_EXCEEDED,
            `Total size exceeds limit of ${this.formatSize(this.config.maxTotalSize)}`
          );
          req.destroy();
          session.fail(error);
          reject(error);
          return;
        }

        chunks.push(chunk);
        session.updateProgress(totalSize);
      });

      req.on('end', () => {
        try {
          const buffer = Buffer.concat(chunks);
          const files = this.parseMultipartBuffer(buffer, boundary, session);
          session.finalize();
          resolve(files);
        } catch (error) {
          reject(error);
        }
      });

      req.on('error', (error) => {
        const uploadError = new UploadError(
          UploadErrorType.UPLOAD_FAILED,
          error.message
        );
        session.fail(uploadError);
        reject(uploadError);
      });
    });
  }

  /**
   * 解析 multipart 缓冲区
   */
  private parseMultipartBuffer(
    buffer: Buffer,
    boundary: string,
    session: UploadSession
  ): UploadedFile[] {
    const boundaryBuffer = Buffer.from(`--${boundary}`);
    const files: UploadedFile[] = [];
    
    // 分割 multipart 部分
    const parts = buffer.split(boundaryBuffer);
    let fileCount = 0;

    for (const part of parts) {
      if (part.length < 10) continue; // 跳过空部分

      // 解析 Content-Disposition
      const dispositionMatch = part.toString('utf8').match(/Content-Disposition:.*?filename\*?="?([^";\r\n]+)"?/i);
      if (!dispositionMatch) continue;

      fileCount++;
      
      // 检查文件数量限制
      if (fileCount > this.config.maxFiles) {
        throw new UploadError(
          UploadErrorType.TOO_MANY_FILES,
          `Maximum ${this.config.maxFiles} files allowed`
        );
      }

      const originalName = dispositionMatch[1].trim();
      
      // 解析 Content-Type
      const typeMatch = part.toString('utf8').match(/Content-Type: ([^\r\n]+)/i);
      const mimeType = typeMatch ? typeMatch[1].trim() : 'application/octet-stream';

      // 验证文件类型
      if (!this.validateFileType(originalName, mimeType)) {
        throw new UploadError(
          UploadErrorType.INVALID_FILE_TYPE,
          `File type "${mimeType}" is not allowed`
        );
      }

      // 查找文件数据开始位置 (双 CRLF 后)
      const headerEnd = part.indexOf('\r\n\r\n');
      if (headerEnd === -1) continue;

      const fileData = part.slice(headerEnd + 4);
      // 移除末尾的边界标记
      const cleanData = fileData.toString('utf8').replace(/\r\n--.*$/, '');
      const fileBuffer = Buffer.from(cleanData, 'utf8');

      // 检查文件大小
      if (fileBuffer.length > this.config.maxFileSize) {
        throw new UploadError(
          UploadErrorType.FILE_TOO_LARGE,
          `File "${originalName}" exceeds size limit of ${this.formatSize(this.config.maxFileSize)}`
        );
      }

      const storedName = this.generateFilename(originalName);
      const uploadedFile: UploadedFile = {
        originalName,
        storedName,
        mimeType,
        size: fileBuffer.length,
        path: `${this.config.uploadDir}/${storedName}`,
        fieldname: 'file',
        uploadedAt: new Date(),
      };

      session.setCurrentFile(originalName);
      session.addFile(uploadedFile);
      files.push(uploadedFile);
    }

    if (files.length === 0) {
      throw new UploadError(
        UploadErrorType.NO_FILES_UPLOADED,
        'No files were uploaded'
      );
    }

    return files;
  }

  /**
   * 格式化文件大小
   */
  private formatSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let unitIndex = 0;
    let size = bytes;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(2)} ${units[unitIndex]}`;
  }

  /**
   * 创建 Express/Koa 风格的中间件
   */
  middleware() {
    return async (req: any, res: any, next: () => void): Promise<void> => {
      // 只处理 POST/PUT 请求
      if (!['POST', 'PUT'].includes(req.method)) {
        next();
        return;
      }

      // 只处理包含 /upload 的路径
      if (!req.path.includes('/upload')) {
        next();
        return;
      }

      try {
        const session = this.createSession();
        const files = await this.parseMultipartRequest(req, session);
        
        // 附加文件信息到请求对象
        req.files = files;
        req.uploadSession = session;
        
        next();
      } catch (error) {
        if (error instanceof UploadError) {
          res.statusCode = error.code;
          res.end(JSON.stringify({
            error: error.type,
            message: error.message,
          }));
        } else {
          res.statusCode = 500;
          res.end(JSON.stringify({
            error: 'UPLOAD_FAILED',
            message: error instanceof Error ? error.message : 'Unknown error',
          }));
        }
      }
    };
  }
}

/**
 * 创建文件上传中间件
 */
export function createFileUpload(config: FileUploadConfig = {}): FileUploadMiddleware {
  return new FileUploadMiddleware(config);
}

/**
 * 预定义配置模板
 */
export const presets = {
  /** 图片上传：最大 5MB，仅允许图片 */
  images: {
    maxFileSize: 5 * 1024 * 1024,
    maxTotalSize: 20 * 1024 * 1024,
    maxFiles: 5,
    allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  } as FileUploadConfig,

  /** 文档上传：最大 10MB，允许常见文档格式 */
  documents: {
    maxFileSize: 10 * 1024 * 1024,
    maxTotalSize: 50 * 1024 * 1024,
    maxFiles: 10,
    allowedTypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'text/csv',
    ],
  } as FileUploadConfig,

  /** 视频上传：最大 100MB，允许视频格式 */
  videos: {
    maxFileSize: 100 * 1024 * 1024,
    maxTotalSize: 500 * 1024 * 1024,
    maxFiles: 3,
    allowedTypes: ['video/mp4', 'video/webm'],
  } as FileUploadConfig,

  /** 通用上传：宽松限制 */
  general: {
    maxFileSize: 20 * 1024 * 1024,
    maxTotalSize: 100 * 1024 * 1024,
    maxFiles: 10,
    blockedTypes: ['.exe', '.bat', '.sh', 'application/x-msdownload'],
  } as FileUploadConfig,
};

export default createFileUpload;
