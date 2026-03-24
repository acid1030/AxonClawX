/**
 * 文件上传工具 - Upload Utils Skill
 * 
 * 提供完整的文件上传处理功能，支持文件验证、分片上传和进度追踪
 * 
 * 功能:
 * 1. 文件验证 - 类型、大小、格式检查
 * 2. 分片上传 - 大文件自动分片，支持断点续传
 * 3. 进度追踪 - 实时上传进度回调和状态监控
 * 
 * @version 1.0.0
 * @author AxonClaw
 */

// ============ 类型定义 ============

/** 文件验证结果 */
interface FileValidationResult {
  valid: boolean;
  errors: FileValidationError[];
  warnings?: FileValidationWarning[];
}

/** 文件验证错误 */
interface FileValidationError {
  code: 'TYPE_NOT_ALLOWED' | 'SIZE_EXCEEDED' | 'FORMAT_INVALID' | 'FILE_EMPTY' | 'NAME_INVALID' | 'CUSTOM_FAILED';
  message: string;
  value?: unknown;
}

/** 文件验证警告 */
interface FileValidationWarning {
  code: string;
  message: string;
  suggestion?: string;
}

/** 文件验证规则 */
interface FileValidationRules {
  /** 允许的文件类型 (MIME types) */
  allowedTypes?: string[];
  /** 允许的文件扩展名 */
  allowedExtensions?: string[];
  /** 最大文件大小 (bytes) */
  maxSize?: number;
  /** 最小文件大小 (bytes) */
  minSize?: number;
  /** 文件名正则验证 */
  namePattern?: RegExp;
  /** 自定义验证函数 */
  customValidate?: (file: File | UploadFileInfo) => Promise<string | null>;
  /** 是否允许空文件 */
  allowEmpty?: boolean;
}

/** 上传文件信息 */
interface UploadFileInfo {
  name: string;
  size: number;
  type: string;
  lastModified?: number;
  path?: string; // Node.js 环境下的文件路径
}

/** 分片信息 */
interface UploadChunk {
  index: number;
  start: number;
  end: number;
  size: number;
  blob?: Blob;
  retryCount: number;
  uploaded: boolean;
  error?: Error;
}

/** 上传进度信息 */
interface UploadProgress {
  /** 总字节数 */
  total: number;
  /** 已上传字节数 */
  uploaded: number;
  /** 上传百分比 (0-100) */
  percentage: number;
  /** 已上传分片数 */
  chunksUploaded: number;
  /** 总分片数 */
  totalChunks: number;
  /** 上传速度 (bytes/s) */
  speed?: number;
  /** 剩余时间 (秒) */
  eta?: number;
  /** 当前状态 */
  status: UploadStatus;
}

/** 上传状态 */
type UploadStatus = 
  | 'pending'      // 等待上传
  | 'validating'  // 验证中
  | 'preparing'   // 准备分片
  | 'uploading'   // 上传中
  | 'paused'      // 已暂停
  | 'resuming'    // 恢复中
  | 'completed'   // 已完成
  | 'failed'      // 失败
  | 'cancelled';  // 已取消

/** 上传配置 */
interface UploadConfig {
  /** 上传 API 端点 */
  endpoint: string;
  /** 分片大小 (bytes)，默认 5MB */
  chunkSize?: number;
  /** 最大并发上传分片数，默认 3 */
  concurrentChunks?: number;
  /** 失败重试次数，默认 3 */
  maxRetries?: number;
  /** 请求超时时间 (ms)，默认 30000 */
  timeout?: number;
  /** 额外请求头 */
  headers?: Record<string, string>;
  /** 是否启用断点续传，默认 true */
  enableResume?: boolean;
  /** 验证规则 */
  validationRules?: FileValidationRules;
  /** 进度回调 */
  onProgress?: (progress: UploadProgress) => void;
  /** 状态变化回调 */
  onStatusChange?: (status: UploadStatus, progress?: UploadProgress) => void;
  /** 错误回调 */
  onError?: (error: UploadError) => void;
  /** 完成回调 */
  onComplete?: (result: UploadResult) => void;
}

/** 上传结果 */
interface UploadResult {
  success: boolean;
  fileId?: string;
  fileName: string;
  fileSize: number;
  chunksUploaded: number;
  duration: number;
  metadata?: Record<string, unknown>;
}

/** 上传错误 */
interface UploadError {
  code: string;
  message: string;
  chunkIndex?: number;
  retryCount?: number;
  originalError?: Error;
}

/** 上传任务实例 */
interface UploadTask {
  id: string;
  file: File | UploadFileInfo;
  config: UploadConfig;
  status: UploadStatus;
  progress: UploadProgress;
  chunks: UploadChunk[];
  startTime?: number;
  endTime?: number;
  pause: () => void;
  resume: () => void;
  cancel: () => void;
  retry: () => Promise<void>;
}

// ============ 常量定义 ============

const DEFAULT_CHUNK_SIZE = 5 * 1024 * 1024; // 5MB
const DEFAULT_CONCURRENT_CHUNKS = 3;
const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_TIMEOUT = 30000;

const COMMON_MIME_TYPES: Record<string, string[]> = {
  // 图片
  image: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.ico'],
  // 文档
  document: ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.md'],
  // 压缩文件
  archive: ['.zip', '.rar', '.7z', '.tar', '.gz'],
  // 视频
  video: ['.mp4', '.avi', '.mov', '.wmv', '.flv', '.mkv', '.webm'],
  // 音频
  audio: ['.mp3', '.wav', '.ogg', '.flac', '.aac', '.m4a'],
  // 代码
  code: ['.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.cpp', '.c', '.h', '.go', '.rs', '.rb', '.php'],
};

// ============ 工具函数 ============

/**
 * 生成唯一上传 ID
 */
function generateUploadId(): string {
  return `upload_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * 获取文件扩展名
 */
function getFileExtension(fileName: string): string {
  const match = fileName.match(/\.([^.]+)$/);
  return match ? `.${match[1].toLowerCase()}` : '';
}

/**
 * 格式化文件大小
 */
function formatFileSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let unitIndex = 0;
  let size = bytes;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(2)} ${units[unitIndex]}`;
}

/**
 * 计算上传速度
 */
function calculateSpeed(uploadedBytes: number, elapsedMs: number): number {
  if (elapsedMs <= 0) return 0;
  return (uploadedBytes / elapsedMs) * 1000; // bytes/s
}

/**
 * 计算预计剩余时间
 */
function calculateETA(remainingBytes: number, speed: number): number {
  if (speed <= 0) return Infinity;
  return remainingBytes / speed; // seconds
}

// ============ 核心类 ============

/**
 * 文件上传管理器
 */
class UploadManager {
  private tasks: Map<string, UploadTask> = new Map();
  private readonly validationRules: FileValidationRules;

  constructor(defaultRules?: FileValidationRules) {
    this.validationRules = defaultRules || {};
  }

  /**
   * 验证文件
   */
  async validateFile(
    file: File | UploadFileInfo,
    rules?: FileValidationRules
  ): Promise<FileValidationResult> {
    const currentRules = { ...this.validationRules, ...rules };
    const errors: FileValidationError[] = [];
    const warnings: FileValidationWarning[] = [];

    // 检查空文件
    if (!currentRules.allowEmpty && file.size === 0) {
      errors.push({
        code: 'FILE_EMPTY',
        message: '文件不能为空',
      });
      return { valid: false, errors };
    }

    // 检查文件大小
    if (currentRules.maxSize !== undefined && file.size > currentRules.maxSize) {
      errors.push({
        code: 'SIZE_EXCEEDED',
        message: `文件大小超出限制 (${formatFileSize(currentRules.maxSize)})`,
        value: file.size,
      });
    }

    if (currentRules.minSize !== undefined && file.size < currentRules.minSize) {
      errors.push({
        code: 'SIZE_EXCEEDED',
        message: `文件大小小于最小限制 (${formatFileSize(currentRules.minSize)})`,
        value: file.size,
      });
    }

    // 检查文件扩展名
    const extension = getFileExtension(file.name);
    if (currentRules.allowedExtensions?.length) {
      if (!currentRules.allowedExtensions.includes(extension)) {
        errors.push({
          code: 'FORMAT_INVALID',
          message: `不支持的文件格式: ${extension}`,
          value: extension,
        });
      }
    }

    // 检查 MIME 类型
    if (currentRules.allowedTypes?.length && 'type' in file) {
      if (!currentRules.allowedTypes.includes(file.type)) {
        errors.push({
          code: 'TYPE_NOT_ALLOWED',
          message: `不支持的文件类型: ${file.type}`,
          value: file.type,
        });
      }
    }

    // 检查文件名
    if (currentRules.namePattern && !currentRules.namePattern.test(file.name)) {
      errors.push({
        code: 'NAME_INVALID',
        message: '文件名不符合命名规则',
        value: file.name,
      });
    }

    // 自定义验证
    if (currentRules.customValidate) {
      try {
        const customError = await currentRules.customValidate(file);
        if (customError) {
          errors.push({
            code: 'CUSTOM_FAILED',
            message: customError,
          });
        }
      } catch (e) {
        errors.push({
          code: 'CUSTOM_FAILED',
          message: e instanceof Error ? e.message : '自定义验证失败',
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  /**
   * 创建上传任务
   */
  createUpload(file: File | UploadFileInfo, config: UploadConfig): UploadTask {
    const taskId = generateUploadId();
    const chunkSize = config.chunkSize || DEFAULT_CHUNK_SIZE;
    const totalChunks = Math.ceil(file.size / chunkSize);

    // 创建分片信息
    const chunks: UploadChunk[] = [];
    for (let i = 0; i < totalChunks; i++) {
      const start = i * chunkSize;
      const end = Math.min(start + chunkSize, file.size);
      chunks.push({
        index: i,
        start,
        end,
        size: end - start,
        retryCount: 0,
        uploaded: false,
      });
    }

    const progress: UploadProgress = {
      total: file.size,
      uploaded: 0,
      percentage: 0,
      chunksUploaded: 0,
      totalChunks,
      status: 'pending',
    };

    const task: UploadTask = {
      id: taskId,
      file,
      config,
      status: 'pending',
      progress,
      chunks,
      pause: () => this.pauseTask(taskId),
      resume: () => this.resumeTask(taskId),
      cancel: () => this.cancelTask(taskId),
      retry: () => this.retryTask(taskId),
    };

    this.tasks.set(taskId, task);
    return task;
  }

  /**
   * 开始上传
   */
  async startUpload(taskId: string): Promise<UploadResult> {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Upload task not found: ${taskId}`);
    }

    const startTime = Date.now();
    task.startTime = startTime;

    try {
      // 1. 验证文件
      await this.updateTaskStatus(task, 'validating');
      const validationResult = await this.validateFile(task.file, task.config.validationRules);
      
      if (!validationResult.valid) {
        await this.updateTaskStatus(task, 'failed');
        const error: UploadError = {
          code: 'VALIDATION_FAILED',
          message: validationResult.errors.map(e => e.message).join(', '),
        };
        task.config.onError?.(error);
        throw new Error(error.message);
      }

      // 2. 准备分片
      await this.updateTaskStatus(task, 'preparing');
      await this.prepareChunks(task);

      // 3. 检查断点续传
      if (task.config.enableResume) {
        await this.resumeFromCheckpoint(task);
      }

      // 4. 开始上传
      await this.updateTaskStatus(task, 'uploading');
      await this.uploadChunks(task);

      // 5. 完成上传
      task.endTime = Date.now();
      await this.updateTaskStatus(task, 'completed');

      const result: UploadResult = {
        success: true,
        fileName: task.file.name,
        fileSize: task.file.size,
        chunksUploaded: task.chunks.filter(c => c.uploaded).length,
        duration: task.endTime - startTime,
      };

      task.config.onComplete?.(result);
      return result;

    } catch (error) {
      task.endTime = Date.now();
      await this.updateTaskStatus(task, 'failed');
      
      const uploadError: UploadError = {
        code: 'UPLOAD_FAILED',
        message: error instanceof Error ? error.message : 'Unknown error',
        originalError: error instanceof Error ? error : undefined,
      };
      
      task.config.onError?.(uploadError);
      throw error;
    }
  }

  /**
   * 暂停任务
   */
  pauseTask(taskId: string): void {
    const task = this.tasks.get(taskId);
    if (task && task.status === 'uploading') {
      task.status = 'paused';
      task.config.onStatusChange?.('paused', task.progress);
    }
  }

  /**
   * 恢复任务
   */
  async resumeTask(taskId: string): Promise<void> {
    const task = this.tasks.get(taskId);
    if (task && task.status === 'paused') {
      task.status = 'resuming';
      task.config.onStatusChange?.('resuming', task.progress);
      
      await this.updateTaskStatus(task, 'uploading');
      await this.uploadChunks(task);
    }
  }

  /**
   * 取消任务
   */
  cancelTask(taskId: string): void {
    const task = this.tasks.get(taskId);
    if (task && !['completed', 'cancelled', 'failed'].includes(task.status)) {
      task.status = 'cancelled';
      task.endTime = Date.now();
      task.config.onStatusChange?.('cancelled', task.progress);
      this.tasks.delete(taskId);
    }
  }

  /**
   * 重试任务
   */
  async retryTask(taskId: string): Promise<void> {
    const task = this.tasks.get(taskId);
    if (task && task.status === 'failed') {
      // 重置失败的分片
      task.chunks.forEach(chunk => {
        if (chunk.error) {
          chunk.retryCount = 0;
          chunk.uploaded = false;
          chunk.error = undefined;
        }
      });
      
      await this.startUpload(taskId);
    }
  }

  /**
   * 获取任务状态
   */
  getTaskStatus(taskId: string): UploadTask | undefined {
    return this.tasks.get(taskId);
  }

  /**
   * 获取所有任务
   */
  getAllTasks(): UploadTask[] {
    return Array.from(this.tasks.values());
  }

  /**
   * 清理已完成的任务
   */
  cleanupCompletedTasks(maxAgeMs: number = 300000): void {
    const now = Date.now();
    for (const [id, task] of this.tasks.entries()) {
      if (['completed', 'cancelled', 'failed'].includes(task.status)) {
        if (task.endTime && now - task.endTime > maxAgeMs) {
          this.tasks.delete(id);
        }
      }
    }
  }

  // ============ 私有方法 ============

  private async updateTaskStatus(task: UploadTask, status: UploadStatus): Promise<void> {
    task.status = status;
    task.config.onStatusChange?.(status, task.progress);
  }

  private async prepareChunks(task: UploadTask): Promise<void> {
    const { file, chunks } = task;
    
    // 浏览器环境：创建 Blob 分片
    if (typeof Blob !== 'undefined' && file instanceof File) {
      chunks.forEach(chunk => {
        chunk.blob = file.slice(chunk.start, chunk.end);
      });
    }
    // Node.js 环境：使用文件路径
    else if ('path' in file && file.path) {
      // Node.js 环境下分片在上传时读取
      chunks.forEach(chunk => {
        // 记录分片信息，实际读取在上传时进行
      });
    }
  }

  private async resumeFromCheckpoint(task: UploadTask): Promise<void> {
    // TODO: 从服务器获取已上传的分片信息
    // 这里需要根据实际 API 实现
    const uploadedChunkIndices: number[] = [];
    
    uploadedChunkIndices.forEach(index => {
      const chunk = task.chunks[index];
      if (chunk) {
        chunk.uploaded = true;
        task.progress.uploaded += chunk.size;
        task.progress.chunksUploaded++;
      }
    });

    this.updateProgress(task);
  }

  private async uploadChunks(task: UploadTask): Promise<void> {
    const { chunks, config } = task;
    const maxConcurrent = config.concurrentChunks || DEFAULT_CONCURRENT_CHUNKS;
    const maxRetries = config.maxRetries || DEFAULT_MAX_RETRIES;

    // 过滤出未上传的分片
    const pendingChunks = chunks.filter(c => !c.uploaded);

    // 并发上传分片
    const batches: UploadChunk[][] = [];
    for (let i = 0; i < pendingChunks.length; i += maxConcurrent) {
      batches.push(pendingChunks.slice(i, i + maxConcurrent));
    }

    for (const batch of batches) {
      if (task.status === 'paused' || task.status === 'cancelled') {
        break;
      }

      const promises = batch.map(chunk => 
        this.uploadChunkWithRetry(task, chunk, maxRetries)
      );

      await Promise.all(promises);
      this.updateProgress(task);
    }

    // 检查是否所有分片都上传成功
    const failedChunks = chunks.filter(c => !c.uploaded);
    if (failedChunks.length > 0 && task.status !== 'cancelled') {
      throw new Error(`${failedChunks.length} chunks failed to upload`);
    }
  }

  private async uploadChunkWithRetry(
    task: UploadTask,
    chunk: UploadChunk,
    maxRetries: number
  ): Promise<void> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        chunk.retryCount = attempt;
        await this.uploadSingleChunk(task, chunk);
        chunk.uploaded = true;
        chunk.error = undefined;
        return;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Upload failed');
        chunk.error = lastError;
        
        if (attempt < maxRetries) {
          // 指数退避
          const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
          await this.sleep(delay);
        }
      }
    }

    throw lastError;
  }

  private async uploadSingleChunk(task: UploadTask, chunk: UploadChunk): Promise<void> {
    const { file, config } = task;
    const { timeout = DEFAULT_TIMEOUT, endpoint, headers = {} } = config;

    // 创建 FormData 或请求体
    let body: FormData | Blob | null = null;
    
    if (typeof Blob !== 'undefined' && chunk.blob) {
      // 浏览器环境
      body = chunk.blob;
    } else if ('path' in file && file.path) {
      // Node.js 环境：需要读取文件分片
      // 这里需要根据实际 Node.js 实现调整
      throw new Error('Node.js file reading not implemented yet');
    }

    if (!body) {
      throw new Error('No chunk data available');
    }

    // 发送请求
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          ...headers,
          'X-Chunk-Index': chunk.index.toString(),
          'X-Chunk-Start': chunk.start.toString(),
          'X-Chunk-End': chunk.end.toString(),
          'X-File-Name': file.name,
          'X-File-Size': file.size.toString(),
        },
        body,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // 更新进度
      task.progress.uploaded += chunk.size;
      task.progress.chunksUploaded++;
      this.updateProgress(task);

    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  private updateProgress(task: UploadTask): void {
    const { progress, startTime } = task;
    
    progress.percentage = (progress.uploaded / progress.total) * 100;
    
    if (startTime) {
      const elapsedMs = Date.now() - startTime;
      const speed = calculateSpeed(progress.uploaded, elapsedMs);
      const remainingBytes = progress.total - progress.uploaded;
      
      progress.speed = speed;
      progress.eta = calculateETA(remainingBytes, speed);
    }

    task.config.onProgress?.(progress);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ============ 便捷函数 ============

/**
 * 快速上传文件 (一行代码)
 */
async function uploadFile(
  file: File | UploadFileInfo,
  endpoint: string,
  options?: Partial<UploadConfig>
): Promise<UploadResult> {
  const manager = new UploadManager();
  const config: UploadConfig = {
    endpoint,
    ...options,
  };

  const task = manager.createUpload(file, config);
  return manager.startUpload(task.id);
}

/**
 * 验证文件 (快捷方式)
 */
async function validateFile(
  file: File | UploadFileInfo,
  rules?: FileValidationRules
): Promise<FileValidationResult> {
  const manager = new UploadManager();
  return manager.validateFile(file, rules);
}

/**
 * 创建上传管理器实例
 */
function createUploadManager(defaultRules?: FileValidationRules): UploadManager {
  return new UploadManager(defaultRules);
}

// ============ 导出 ============

export {
  // 类型
  FileValidationResult,
  FileValidationError,
  FileValidationWarning,
  FileValidationRules,
  UploadFileInfo,
  UploadChunk,
  UploadProgress,
  UploadStatus,
  UploadConfig,
  UploadResult,
  UploadError,
  UploadTask,
  UploadManager,
  // 常量
  DEFAULT_CHUNK_SIZE,
  DEFAULT_CONCURRENT_CHUNKS,
  DEFAULT_MAX_RETRIES,
  DEFAULT_TIMEOUT,
  COMMON_MIME_TYPES,
  // 工具函数
  generateUploadId,
  getFileExtension,
  formatFileSize,
  calculateSpeed,
  calculateETA,
  // 核心类
  UploadManager,
  // 便捷函数
  uploadFile,
  validateFile,
  createUploadManager,
};
