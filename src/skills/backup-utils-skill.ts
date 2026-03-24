/**
 * 数据备份恢复工具技能
 * 
 * 功能:
 * 1. 数据备份 (全量/增量)
 * 2. 增量备份 (基于时间戳/哈希)
 * 3. 数据恢复 (全量/增量还原)
 * 
 * @module backup-utils-skill
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import * as zlib from 'zlib';
import { EventEmitter } from 'events';

// ============== 类型定义 ==============

export interface BackupOptions {
  compress?: boolean;           // 是否压缩 (默认 true)
  compressionLevel?: number;    // 压缩级别 1-9 (默认 6)
  incremental?: boolean;        // 是否增量备份 (默认 false)
  baseBackupPath?: string;      // 基础备份路径 (增量备份时使用)
  excludePatterns?: string[];   // 排除的文件模式
  includeHidden?: boolean;      // 包含隐藏文件 (默认 false)
  verify?: boolean;             // 备份后验证 (默认 true)
}

export interface BackupMetadata {
  id: string;                   // 备份 ID
  type: 'full' | 'incremental'; // 备份类型
  timestamp: number;            // 时间戳
  sourcePath: string;           // 源路径
  backupPath: string;           // 备份路径
  size: number;                 // 备份大小 (字节)
  fileCount: number;            // 文件数量
  hash: string;                 // 备份哈希
  compressed: boolean;          // 是否压缩
  baseBackupId?: string;        // 基础备份 ID (增量备份时)
  duration: number;             // 备份耗时 (ms)
}

export interface BackupResult {
  success: boolean;
  metadata?: BackupMetadata;
  error?: string;
  filesProcessed?: number;
  filesSkipped?: number;
  warnings?: string[];
}

export interface RestoreOptions {
  targetPath?: string;          // 恢复目标路径 (默认原路径)
  overwrite?: boolean;          // 覆盖现有文件 (默认 false)
  verify?: boolean;             // 恢复后验证 (默认 true)
  incrementalChain?: string[];  // 增量备份链 (按顺序)
}

export interface RestoreResult {
  success: boolean;
  filesRestored?: number;
  filesSkipped?: number;
  error?: string;
  warnings?: string[];
  targetPath?: string;
}

export interface BackupManifest {
  version: string;
  backups: BackupMetadata[];
  createdAt: number;
  updatedAt: number;
}

export class BackupManager extends EventEmitter {
  private manifestPath: string;
  private manifest: BackupManifest;

  constructor(backupDir: string = './backups') {
    super();
    this.manifestPath = path.join(backupDir, 'manifest.json');
    this.manifest = this.loadManifest();
  }

  private loadManifest(): BackupManifest {
    try {
      if (fs.existsSync(this.manifestPath)) {
        const data = fs.readFileSync(this.manifestPath, 'utf-8');
        return JSON.parse(data);
      }
    } catch (error) {
      this.emit('warning', 'Failed to load manifest, creating new one');
    }
    
    return {
      version: '1.0.0',
      backups: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
  }

  private saveManifest(): void {
    this.manifest.updatedAt = Date.now();
    const dir = path.dirname(this.manifestPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(this.manifestPath, JSON.stringify(this.manifest, null, 2));
  }

  /**
   * 计算文件哈希
   */
  private calculateFileHash(filePath: string): string {
    const data = fs.readFileSync(filePath);
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * 计算目录哈希
   */
  private calculateDirectoryHash(dirPath: string, excludePatterns: string[] = []): string {
    const hashes: string[] = [];
    
    const walk = (dir: string) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        // 检查排除模式
        if (excludePatterns.some(pattern => new RegExp(pattern).test(entry.name))) {
          continue;
        }
        
        if (entry.isDirectory()) {
          walk(fullPath);
        } else if (entry.isFile()) {
          const relativePath = path.relative(dirPath, fullPath);
          const hash = this.calculateFileHash(fullPath);
          hashes.push(`${relativePath}:${hash}`);
        }
      }
    };
    
    walk(dirPath);
    return crypto.createHash('sha256').update(hashes.sort().join('\n')).digest('hex');
  }

  /**
   * 检查文件是否应该被排除
   */
  private shouldExclude(filePath: string, excludePatterns: string[] = []): boolean {
    const fileName = path.basename(filePath);
    return excludePatterns.some(pattern => new RegExp(pattern).test(fileName));
  }

  /**
   * 全量备份
   */
  async backup(
    sourcePath: string,
    backupDir: string = './backups',
    options: BackupOptions = {}
  ): Promise<BackupResult> {
    const startTime = Date.now();
    const warnings: string[] = [];
    
    try {
      this.emit('start', { sourcePath, backupDir, options });
      
      // 验证源路径
      if (!fs.existsSync(sourcePath)) {
        throw new Error(`Source path does not exist: ${sourcePath}`);
      }
      
      // 创建备份目录
      const timestamp = Date.now();
      const backupId = `backup_${timestamp}_${crypto.randomBytes(4).toString('hex')}`;
      const backupPath = path.join(backupDir, backupId);
      
      if (!fs.existsSync(backupPath)) {
        fs.mkdirSync(backupPath, { recursive: true });
      }
      
      // 确定备份类型
      const isIncremental = options.incremental === true && options.baseBackupPath;
      const backupType: 'full' | 'incremental' = isIncremental ? 'incremental' : 'full';
      
      let filesProcessed = 0;
      let filesSkipped = 0;
      let totalSize = 0;
      
      // 递归备份文件
      const backupFile = (src: string, dest: string) => {
        const relativePath = path.relative(sourcePath, src);
        const destPath = path.join(dest, relativePath);
        const destDir = path.dirname(destPath);
        
        if (!fs.existsSync(destDir)) {
          fs.mkdirSync(destDir, { recursive: true });
        }
        
        if (fs.statSync(src).isDirectory()) {
          const entries = fs.readdirSync(src, { withFileTypes: true });
          
          for (const entry of entries) {
            const fullPath = path.join(src, entry.name);
            
            // 检查隐藏文件
            if (!options.includeHidden && entry.name.startsWith('.')) {
              continue;
            }
            
            // 检查排除模式
            if (this.shouldExclude(entry.name, options.excludePatterns || [])) {
              filesSkipped++;
              continue;
            }
            
            backupFile(fullPath, dest);
          }
        } else if (fs.statSync(src).isFile()) {
          // 增量备份：检查文件是否变化
          if (isIncremental && options.baseBackupPath) {
            const baseFilePath = path.join(options.baseBackupPath, relativePath);
            if (fs.existsSync(baseFilePath)) {
              const srcHash = this.calculateFileHash(src);
              const baseHash = this.calculateFileHash(baseFilePath);
              
              if (srcHash === baseHash) {
                filesSkipped++;
                return; // 文件未变化，跳过
              }
            }
          }
          
          // 复制并可选压缩文件
          const fileData = fs.readFileSync(src);
          totalSize += fileData.length;
          
          if (options.compress !== false) {
            const level = options.compressionLevel || 6;
            const compressed = zlib.gzipSync(fileData, { level });
            fs.writeFileSync(destPath + '.gz', compressed);
          } else {
            fs.copyFileSync(src, destPath);
          }
          
          filesProcessed++;
          this.emit('file', { file: relativePath, processed: filesProcessed });
        }
      };
      
      backupFile(sourcePath, backupPath);
      
      // 计算备份哈希
      const backupHash = this.calculateDirectoryHash(backupPath);
      
      // 创建元数据
      const metadata: BackupMetadata = {
        id: backupId,
        type: backupType,
        timestamp,
        sourcePath: path.resolve(sourcePath),
        backupPath: path.resolve(backupPath),
        size: totalSize,
        fileCount: filesProcessed,
        hash: backupHash,
        compressed: options.compress !== false,
        baseBackupId: options.baseBackupPath ? path.basename(options.baseBackupPath) : undefined,
        duration: Date.now() - startTime
      };
      
      // 保存元数据
      fs.writeFileSync(
        path.join(backupPath, '.backup-metadata.json'),
        JSON.stringify(metadata, null, 2)
      );
      
      // 更新 manifest
      this.manifest.backups.push(metadata);
      this.saveManifest();
      
      // 验证备份
      if (options.verify !== false) {
        this.emit('verifying', backupPath);
        const verifyResult = this.verifyBackup(backupPath);
        if (!verifyResult.success) {
          warnings.push(`Verification warning: ${verifyResult.error}`);
        }
      }
      
      const result: BackupResult = {
        success: true,
        metadata,
        filesProcessed,
        filesSkipped,
        warnings: warnings.length > 0 ? warnings : undefined
      };
      
      this.emit('complete', result);
      return result;
      
    } catch (error) {
      const result: BackupResult = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        warnings: warnings.length > 0 ? warnings : undefined
      };
      
      this.emit('error', error);
      return result;
    }
  }

  /**
   * 增量备份
   */
  async incrementalBackup(
    sourcePath: string,
    baseBackupPath: string,
    backupDir: string = './backups',
    options: BackupOptions = {}
  ): Promise<BackupResult> {
    return this.backup(sourcePath, backupDir, {
      ...options,
      incremental: true,
      baseBackupPath
    });
  }

  /**
   * 恢复备份
   */
  async restore(
    backupPath: string,
    options: RestoreOptions = {}
  ): Promise<RestoreResult> {
    try {
      this.emit('start', { backupPath, options });
      
      // 验证备份路径
      if (!fs.existsSync(backupPath)) {
        throw new Error(`Backup path does not exist: ${backupPath}`);
      }
      
      // 加载备份元数据
      const metadataPath = path.join(backupPath, '.backup-metadata.json');
      if (!fs.existsSync(metadataPath)) {
        throw new Error('Backup metadata not found');
      }
      
      const metadata: BackupMetadata = JSON.parse(
        fs.readFileSync(metadataPath, 'utf-8')
      );
      
      // 确定恢复目标路径
      const targetPath = options.targetPath || metadata.sourcePath;
      
      // 创建目标目录
      if (!fs.existsSync(targetPath)) {
        fs.mkdirSync(targetPath, { recursive: true });
      }
      
      let filesRestored = 0;
      let filesSkipped = 0;
      const warnings: string[] = [];
      
      // 递归恢复文件
      const restoreFile = (src: string, dest: string) => {
        const relativePath = path.relative(backupPath, src);
        const destPath = path.join(dest, relativePath.replace(/\.gz$/, ''));
        const destDir = path.dirname(destPath);
        
        if (!fs.existsSync(destDir)) {
          fs.mkdirSync(destDir, { recursive: true });
        }
        
        if (fs.statSync(src).isDirectory()) {
          const entries = fs.readdirSync(src, { withFileTypes: true });
          
          for (const entry of entries) {
            if (!entry.name.startsWith('.')) {
              restoreFile(path.join(src, entry.name), dest);
            }
          }
        } else if (fs.statSync(src).isFile()) {
          // 检查目标文件是否存在
          if (fs.existsSync(destPath)) {
            if (!options.overwrite) {
              filesSkipped++;
              warnings.push(`File exists, skipping: ${relativePath}`);
              return;
            }
          }
          
          // 解压或直接复制
          if (src.endsWith('.gz') && metadata.compressed) {
            const compressed = fs.readFileSync(src);
            const decompressed = zlib.gunzipSync(compressed);
            fs.writeFileSync(destPath, decompressed);
          } else {
            fs.copyFileSync(src, destPath);
          }
          
          filesRestored++;
          this.emit('file', { file: relativePath, restored: filesRestored });
        }
      };
      
      restoreFile(backupPath, targetPath);
      
      // 处理增量备份链
      if (options.incrementalChain && options.incrementalChain.length > 0) {
        this.emit('applying-incremental', options.incrementalChain);
        
        for (const incrementalBackup of options.incrementalChain) {
          this.emit('applying-incremental-backup', incrementalBackup);
          restoreFile(incrementalBackup, targetPath);
        }
      }
      
      // 验证恢复
      if (options.verify !== false) {
        this.emit('verifying', targetPath);
        const currentHash = this.calculateDirectoryHash(targetPath);
        if (currentHash !== metadata.hash) {
          warnings.push('Hash verification failed after restore');
        }
      }
      
      const result: RestoreResult = {
        success: true,
        filesRestored,
        filesSkipped,
        warnings: warnings.length > 0 ? warnings : undefined,
        targetPath
      };
      
      this.emit('complete', result);
      return result;
      
    } catch (error) {
      const result: RestoreResult = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      
      this.emit('error', error);
      return result;
    }
  }

  /**
   * 验证备份
   */
  verifyBackup(backupPath: string): { success: boolean; error?: string } {
    try {
      const metadataPath = path.join(backupPath, '.backup-metadata.json');
      if (!fs.existsSync(metadataPath)) {
        return { success: false, error: 'Metadata file missing' };
      }
      
      const metadata: BackupMetadata = JSON.parse(
        fs.readFileSync(metadataPath, 'utf-8')
      );
      
      // 验证文件可读性
      const walk = (dir: string): boolean => {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        
        for (const entry of entries) {
          if (entry.name.startsWith('.')) continue;
          
          const fullPath = path.join(dir, entry.name);
          
          if (entry.isDirectory()) {
            if (!walk(fullPath)) return false;
          } else if (entry.isFile()) {
            // 尝试读取文件
            fs.readFileSync(fullPath);
            
            // 如果是压缩文件，尝试解压验证
            if (fullPath.endsWith('.gz')) {
              const data = fs.readFileSync(fullPath);
              zlib.gunzipSync(data);
            }
          }
        }
        
        return true;
      };
      
      walk(backupPath);
      
      return { success: true };
      
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * 列出所有备份
   */
  listBackups(): BackupMetadata[] {
    return this.manifest.backups.sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * 获取备份详情
   */
  getBackupDetails(backupId: string): BackupMetadata | undefined {
    return this.manifest.backups.find(b => b.id === backupId);
  }

  /**
   * 删除备份
   */
  deleteBackup(backupId: string): { success: boolean; error?: string } {
    try {
      const backup = this.manifest.backups.find(b => b.id === backupId);
      
      if (!backup) {
        return { success: false, error: 'Backup not found' };
      }
      
      // 删除备份目录
      if (fs.existsSync(backup.backupPath)) {
        fs.rmSync(backup.backupPath, { recursive: true, force: true });
      }
      
      // 从 manifest 移除
      this.manifest.backups = this.manifest.backups.filter(b => b.id !== backupId);
      this.saveManifest();
      
      return { success: true };
      
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * 清理旧备份
   */
  cleanupOldBackups(maxAgeDays: number = 30): { deleted: number; error?: string } {
    try {
      const cutoffTime = Date.now() - (maxAgeDays * 24 * 60 * 60 * 1000);
      let deleted = 0;
      
      const oldBackups = this.manifest.backups.filter(b => b.timestamp < cutoffTime);
      
      for (const backup of oldBackups) {
        const result = this.deleteBackup(backup.id);
        if (result.success) {
          deleted++;
        }
      }
      
      return { deleted };
      
    } catch (error) {
      return {
        deleted: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

// ============== 便捷函数 ==============

/**
 * 快速备份 (全量)
 */
export async function quickBackup(
  sourcePath: string,
  backupDir?: string,
  options?: BackupOptions
): Promise<BackupResult> {
  const manager = new BackupManager(backupDir);
  return manager.backup(sourcePath, backupDir, options);
}

/**
 * 快速恢复
 */
export async function quickRestore(
  backupPath: string,
  options?: RestoreOptions
): Promise<RestoreResult> {
  const manager = new BackupManager();
  return manager.restore(backupPath, options);
}

/**
 * 创建备份管理器
 */
export function createBackupManager(backupDir?: string): BackupManager {
  return new BackupManager(backupDir);
}
