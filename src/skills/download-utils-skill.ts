/**
 * 文件下载工具技能
 * 
 * 功能:
 * 1. 断点续传 - 支持中断后继续下载
 * 2. 多线程下载 - 并发下载提升速度
 * 3. 进度追踪 - 实时下载进度监控
 * 
 * @module skills/download-utils
 */

import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import * as http from 'http';
import { URL } from 'url';

// ==================== 类型定义 ====================

/**
 * 下载任务状态
 */
export enum DownloadStatus {
  PENDING = 'pending',
  DOWNLOADING = 'downloading',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

/**
 * 下载进度信息
 */
export interface DownloadProgress {
  /** 已下载字节数 */
  downloadedBytes: number;
  /** 总字节数 */
  totalBytes: number;
  /** 下载进度百分比 (0-100) */
  percentage: number;
  /** 下载速度 (字节/秒) */
  speedBytesPerSec: number;
  /** 剩余时间 (秒) */
  etaSeconds: number;
  /** 当前状态 */
  status: DownloadStatus;
}

/**
 * 下载任务配置
 */
export interface DownloadOptions {
  /** 目标文件路径 */
  destPath: string;
  /** 并发线程数 (默认 4) */
  threads?: number;
  /** 单个线程最小分片大小 (默认 1MB) */
  minChunkSize?: number;
  /** 重试次数 (默认 3) */
  retries?: number;
  /** 请求超时 (毫秒，默认 30000) */
  timeout?: number;
  /** 进度回调 */
  onProgress?: (progress: DownloadProgress) => void;
  /** 完成回调 */
  onComplete?: () => void;
  /** 错误回调 */
  onError?: (error: Error) => void;
}

/**
 * 下载任务元数据 (用于断点续传)
 */
export interface DownloadMeta {
  /** 文件 URL */
  url: string;
  /** 目标路径 */
  destPath: string;
  /** 总文件大小 */
  totalSize: number;
  /** 已下载大小 */
  downloadedSize: number;
  /** 创建时间戳 */
  createdAt: number;
  /** 最后更新时间戳 */
  updatedAt: number;
  /** 分片信息 */
  chunks: DownloadChunk[];
}

/**
 * 下载分片信息
 */
export interface DownloadChunk {
  /** 分片 ID */
  id: number;
  /** 起始字节 */
  start: number;
  /** 结束字节 */
  end: number;
  /** 已下载字节 */
  downloaded: number;
  /** 分片状态 */
  status: DownloadStatus;
  /** 重试次数 */
  retries: number;
}

/**
 * 下载管理器
 */
export class DownloadManager {
  /** 下载任务元数据 */
  private meta: DownloadMeta | null = null;
  /** 元数据文件路径 */
  private metaPath: string;
  /** 临时文件路径 */
  private tempPath: string;
  /** 配置选项 */
  private options: DownloadOptions;
  /** 当前进度 */
  private progress: DownloadProgress;
  /** 速度采样窗口 */
  private speedSamples: number[] = [];
  /** 最后采样时间 */
  private lastSampleTime: number = 0;
  /** 最后采样字节数 */
  private lastSampleBytes: number = 0;
  /** 是否正在取消 */
  private isCancelling: boolean = false;
  /** 活跃的连接数 */
  private activeConnections: number = 0;

  constructor(url: string, options: DownloadOptions) {
    this.options = {
      threads: 4,
      minChunkSize: 1024 * 1024, // 1MB
      retries: 3,
      timeout: 30000,
      ...options
    };

    this.metaPath = options.destPath + '.download.meta';
    this.tempPath = options.destPath + '.download.part';
    
    this.progress = {
      downloadedBytes: 0,
      totalBytes: 0,
      percentage: 0,
      speedBytesPerSec: 0,
      etaSeconds: 0,
      status: DownloadStatus.PENDING
    };

    // 尝试加载现有的元数据 (断点续传)
    this.loadMeta(url);
  }

  /**
   * 加载元数据 (断点续传)
   */
  private loadMeta(url: string): void {
    try {
      if (fs.existsSync(this.metaPath)) {
        const metaContent = fs.readFileSync(this.metaPath, 'utf-8');
        this.meta = JSON.parse(metaContent);
        
        // 验证 URL 是否匹配
        if (this.meta.url !== url) {
          console.log('[Download] URL 不匹配，重新开始下载');
          this.meta = null;
        } else {
          console.log(`[Download] 发现断点续传数据，已下载 ${this.meta.downloadedSize} 字节`);
        }
      }
    } catch (error) {
      console.warn('[Download] 加载元数据失败:', error);
      this.meta = null;
    }
  }

  /**
   * 保存元数据
   */
  private saveMeta(): void {
    if (!this.meta) return;
    
    this.meta.updatedAt = Date.now();
    fs.writeFileSync(this.metaPath, JSON.stringify(this.meta, null, 2), 'utf-8');
  }

  /**
   * 获取文件大小
   */
  private async getFileSize(url: string): Promise<number> {
    return new Promise((resolve, reject) => {
      const parsedUrl = new URL(url);
      const client = parsedUrl.protocol === 'https:' ? https : http;
      
      const req = client.get(url, { timeout: this.options.timeout }, (res) => {
        if (res.statusCode === 200 || res.statusCode === 206) {
          const contentLength = res.headers['content-length'];
          if (contentLength) {
            resolve(parseInt(contentLength, 10));
          } else {
            reject(new Error('无法获取文件大小'));
          }
        } else {
          reject(new Error(`HTTP 错误: ${res.statusCode}`));
        }
      });

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('请求超时'));
      });
    });
  }

  /**
   * 下载分片
   */
  private async downloadChunk(chunk: DownloadChunk, url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.isCancelling) {
        reject(new Error('下载已取消'));
        return;
      }

      const parsedUrl = new URL(url);
      const client = parsedUrl.protocol === 'https:' ? https : http;
      
      const options: https.RequestOptions = {
        timeout: this.options.timeout,
        headers: {
          'Range': `bytes=${chunk.start + chunk.downloaded}-${chunk.end}`
        }
      };

      const req = client.get(url, options, (res) => {
        if (res.statusCode !== 206 && res.statusCode !== 200) {
          reject(new Error(`分片下载失败: ${res.statusCode}`));
          return;
        }

        const chunks: Buffer[] = [];
        
        res.on('data', (data: Buffer) => {
          chunks.push(data);
          chunk.downloaded += data.length;
          this.updateProgress();
        });

        res.on('end', () => {
          const buffer = Buffer.concat(chunks);
          this.writeChunk(chunk.start + chunk.downloaded - buffer.length, buffer);
          chunk.status = DownloadStatus.COMPLETED;
          this.saveMeta();
          resolve();
        });

        res.on('error', (error) => {
          chunk.status = DownloadStatus.FAILED;
          reject(error);
        });
      });

      req.on('error', (error) => {
        chunk.status = DownloadStatus.FAILED;
        reject(error);
      });

      req.on('timeout', () => {
        req.destroy();
        chunk.status = DownloadStatus.FAILED;
        reject(new Error('分片请求超时'));
      });
    });
  }

  /**
   * 写入分片数据到文件
   */
  private writeChunk(position: number, data: Buffer): void {
    const fd = fs.openSync(this.tempPath, 'r+');
    try {
      fs.writeSync(fd, data, 0, data.length, position);
    } finally {
      fs.closeSync(fd);
    }
  }

  /**
   * 更新下载进度
   */
  private updateProgress(): void {
    if (!this.meta) return;

    const now = Date.now();
    const totalDownloaded = this.meta.chunks.reduce((sum, chunk) => sum + chunk.downloaded, 0);
    
    // 计算速度 (每秒采样)
    if (now - this.lastSampleTime >= 1000) {
      const timeDiff = (now - this.lastSampleTime) / 1000;
      const bytesDiff = totalDownloaded - this.lastSampleBytes;
      const speed = bytesDiff / timeDiff;
      
      this.speedSamples.push(speed);
      if (this.speedSamples.length > 5) {
        this.speedSamples.shift();
      }
      
      this.lastSampleTime = now;
      this.lastSampleBytes = totalDownloaded;
    }

    const avgSpeed = this.speedSamples.length > 0 
      ? this.speedSamples.reduce((a, b) => a + b, 0) / this.speedSamples.length 
      : 0;

    const remainingBytes = this.meta.totalSize - totalDownloaded;
    const eta = avgSpeed > 0 ? remainingBytes / avgSpeed : 0;

    this.progress = {
      downloadedBytes: totalDownloaded,
      totalBytes: this.meta.totalSize,
      percentage: (totalDownloaded / this.meta.totalSize) * 100,
      speedBytesPerSec: avgSpeed,
      etaSeconds: eta,
      status: this.isCancelling ? DownloadStatus.CANCELLED : DownloadStatus.DOWNLOADING
    };

    if (this.options.onProgress) {
      this.options.onProgress(this.progress);
    }
  }

  /**
   * 开始下载
   */
  public async start(): Promise<void> {
    try {
      // 获取文件大小
      let fileSize: number;
      
      if (this.meta) {
        fileSize = this.meta.totalSize;
      } else {
        fileSize = await this.getFileSize(this.options.destPath);
        
        // 初始化元数据
        const numThreads = Math.min(
          this.options.threads || 4,
          Math.floor(fileSize / (this.options.minChunkSize || 1024 * 1024))
        );
        
        const chunkSize = Math.floor(fileSize / numThreads);
        const chunks: DownloadChunk[] = [];
        
        for (let i = 0; i < numThreads; i++) {
          chunks.push({
            id: i,
            start: i * chunkSize,
            end: i === numThreads - 1 ? fileSize - 1 : (i + 1) * chunkSize - 1,
            downloaded: 0,
            status: DownloadStatus.PENDING,
            retries: 0
          });
        }

        this.meta = {
          url: this.options.destPath,
          destPath: this.options.destPath,
          totalSize: fileSize,
          downloadedSize: 0,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          chunks
        };

        // 创建临时文件
        const fd = fs.openSync(this.tempPath, 'w');
        fs.closeSync(fd);
        
        this.saveMeta();
      }

      // 并发下载所有分片
      const downloadPromises = this.meta.chunks.map(chunk => 
        this.downloadWithRetry(chunk, this.options.destPath)
      );

      await Promise.all(downloadPromises);

      // 合并文件
      this.finalizeDownload();

      this.progress.status = DownloadStatus.COMPLETED;
      if (this.options.onProgress) {
        this.options.onProgress(this.progress);
      }
      if (this.options.onComplete) {
        this.options.onComplete();
      }

    } catch (error) {
      this.progress.status = DownloadStatus.FAILED;
      if (this.options.onError) {
        this.options.onError(error as Error);
      }
      throw error;
    }
  }

  /**
   * 带重试的分片下载
   */
  private async downloadWithRetry(chunk: DownloadChunk, url: string): Promise<void> {
    let lastError: Error | null = null;
    
    for (let i = 0; i <= (this.options.retries || 3); i++) {
      try {
        await this.downloadChunk(chunk, url);
        return;
      } catch (error) {
        lastError = error as Error;
        chunk.retries++;
        console.warn(`[Download] 分片 ${chunk.id} 下载失败，重试 ${i + 1}/${this.options.retries}`);
        
        if (i < (this.options.retries || 3)) {
          await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
        }
      }
    }
    
    throw lastError || new Error('分片下载失败');
  }

  /**
   * 完成下载 (合并临时文件)
   */
  private finalizeDownload(): void {
    // 重命名临时文件到目标文件
    fs.renameSync(this.tempPath, this.options.destPath);
    
    // 删除元数据文件
    if (fs.existsSync(this.metaPath)) {
      fs.unlinkSync(this.metaPath);
    }

    console.log(`[Download] 下载完成: ${this.options.destPath}`);
  }

  /**
   * 暂停下载
   */
  public pause(): void {
    this.progress.status = DownloadStatus.PAUSED;
    console.log('[Download] 下载已暂停');
  }

  /**
   * 恢复下载
   */
  public resume(): void {
    if (this.progress.status === DownloadStatus.PAUSED) {
      this.progress.status = DownloadStatus.DOWNLOADING;
      console.log('[Download] 下载已恢复');
    }
  }

  /**
   * 取消下载
   */
  public cancel(): void {
    this.isCancelling = true;
    this.progress.status = DownloadStatus.CANCELLED;
    console.log('[Download] 下载已取消');
  }

  /**
   * 获取当前进度
   */
  public getProgress(): DownloadProgress {
    return { ...this.progress };
  }
}

// ==================== 便捷函数 ====================

/**
 * 下载文件 (带断点续传、多线程、进度追踪)
 * 
 * @param url - 文件 URL
 * @param destPath - 目标路径
 * @param options - 下载选项
 * @returns Promise<void>
 * 
 * @example
 * ```typescript
 * await downloadFile('https://example.com/file.zip', './file.zip', {
 *   threads: 8,
 *   onProgress: (progress) => {
 *     console.log(`进度: ${progress.percentage.toFixed(2)}%`);
 *     console.log(`速度: ${(progress.speedBytesPerSec / 1024 / 1024).toFixed(2)} MB/s`);
 *     console.log(`剩余: ${progress.etaSeconds.toFixed(0)} 秒`);
 *   },
 *   onComplete: () => console.log('下载完成!'),
 *   onError: (error) => console.error('下载失败:', error)
 * });
 * ```
 */
export async function downloadFile(
  url: string,
  destPath: string,
  options: Omit<DownloadOptions, 'destPath'> = {}
): Promise<void> {
  const manager = new DownloadManager(url, { destPath, ...options });
  await manager.start();
}

/**
 * 创建下载管理器实例 (用于更精细的控制)
 * 
 * @param url - 文件 URL
 * @param destPath - 目标路径
 * @param options - 下载选项
 * @returns DownloadManager
 * 
 * @example
 * ```typescript
 * const manager = createDownloadManager('https://example.com/file.zip', './file.zip');
 * 
 * // 启动下载
 * manager.start();
 * 
 * // 暂停
 * manager.pause();
 * 
 * // 恢复
 * manager.resume();
 * 
 * // 取消
 * manager.cancel();
 * 
 * // 获取进度
 * const progress = manager.getProgress();
 * ```
 */
export function createDownloadManager(
  url: string,
  destPath: string,
  options: Omit<DownloadOptions, 'destPath'> = {}
): DownloadManager {
  return new DownloadManager(url, { destPath, ...options });
}

/**
 * 格式化字节数
 * 
 * @param bytes - 字节数
 * @returns 格式化后的字符串 (如 "1.5 MB")
 */
export function formatBytes(bytes: number): string {
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
 * 格式化时间 (秒)
 * 
 * @param seconds - 秒数
 * @returns 格式化后的字符串 (如 "1 分 30 秒")
 */
export function formatTime(seconds: number): string {
  if (seconds < 60) {
    return `${Math.round(seconds)}秒`;
  }
  
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  
  if (mins < 60) {
    return `${mins}分${secs}秒`;
  }
  
  const hours = Math.floor(mins / 60);
  const remainingMins = mins % 60;
  
  return `${hours}小时${remainingMins}分${secs}秒`;
}

// ==================== 默认导出 ====================

export default {
  downloadFile,
  createDownloadManager,
  formatBytes,
  formatTime,
  DownloadStatus
};
