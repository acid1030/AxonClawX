/**
 * 备份管理工具 - ACE
 * 
 * 提供完整的数据备份解决方案：
 * 1. 自动备份 - 定时自动执行备份任务
 * 2. 增量备份 - 仅备份变化的文件，节省空间
 * 3. 备份恢复 - 从备份点恢复数据
 * 
 * @module BackupManagerSkill
 * @author ACE
 * @version 1.0.0
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { execSync } from 'child_process';

// ============================================
// 类型定义
// ============================================

/**
 * 备份元数据
 */
interface BackupMetadata {
  /** 备份 ID (时间戳) */
  backupId: string;
  /** 备份时间 */
  timestamp: number;
  /** 备份类型 */
  type: 'full' | 'incremental';
  /** 源目录 */
  sourcePath: string;
  /** 备份目录 */
  backupPath: string;
  /** 文件列表 */
  files: FileInfo[];
  /** 总大小 (字节) */
  totalSize: number;
  /** 文件数量 */
  fileCount: number;
  /** 备注 */
  note?: string;
}

/**
 * 文件信息
 */
interface FileInfo {
  /** 相对路径 */
  path: string;
  /** 文件大小 */
  size: number;
  /** 修改时间 */
  mtime: number;
  /** 文件哈希 */
  hash: string;
  /** 是否变更 */
  changed?: boolean;
}

/**
 * 备份配置
 */
interface BackupConfig {
  /** 源目录 */
  sourcePath: string;
  /** 备份存储目录 */
  backupDir: string;
  /** 保留的备份数量 */
  retainCount: number;
  /** 自动备份间隔 (小时) */
  autoBackupInterval?: number;
  /** 是否启用增量备份 */
  enableIncremental: boolean;
  /** 排除的文件模式 */
  excludePatterns: string[];
}

/**
 * 恢复选项
 */
interface RestoreOptions {
  /** 恢复目标目录 (默认为原路径) */
  targetPath?: string;
  /** 是否覆盖现有文件 */
  overwrite: boolean;
  /** 是否验证文件完整性 */
  verify: boolean;
}

// ============================================
// 备份管理器类
// ============================================

export class BackupManager {
  private config: BackupConfig;
  private lastBackupManifest: string;

  constructor(config: Partial<BackupConfig>) {
    this.config = {
      sourcePath: config.sourcePath || process.cwd(),
      backupDir: config.backupDir || path.join(process.cwd(), '.backups'),
      retainCount: config.retainCount || 7,
      autoBackupInterval: config.autoBackupInterval,
      enableIncremental: config.enableIncremental !== false,
      excludePatterns: config.excludePatterns || ['node_modules', '.git', '.backups', '*.log'],
    };

    this.lastBackupManifest = path.join(this.config.backupDir, 'last-manifest.json');
    
    // 确保备份目录存在
    this.ensureDirectory(this.config.backupDir);
  }

  /**
   * 确保目录存在
   */
  private ensureDirectory(dirPath: string): void {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }

  /**
   * 计算文件哈希 (SHA-256)
   */
  private calculateHash(filePath: string): string {
    const content = fs.readFileSync(filePath);
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  /**
   * 检查文件是否应被排除
   */
  private shouldExclude(filePath: string): boolean {
    const relativePath = path.relative(this.config.sourcePath, filePath);
    
    return this.config.excludePatterns.some(pattern => {
      if (pattern.startsWith('*')) {
        // 通配符匹配 (如 *.log)
        const regex = new RegExp(pattern.replace('*', '.*'));
        return regex.test(path.basename(filePath));
      }
      // 目录名匹配
      return relativePath.split(path.sep).includes(pattern);
    });
  }

  /**
   * 扫描源目录获取文件列表
   */
  private scanSourceDirectory(): FileInfo[] {
    const files: FileInfo[] = [];
    
    const scanDir = (dir: string) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (this.shouldExclude(fullPath)) {
          continue;
        }
        
        if (entry.isDirectory()) {
          scanDir(fullPath);
        } else if (entry.isFile()) {
          const stats = fs.statSync(fullPath);
          const relativePath = path.relative(this.config.sourcePath, fullPath);
          
          files.push({
            path: relativePath,
            size: stats.size,
            mtime: stats.mtimeMs,
            hash: this.calculateHash(fullPath),
          });
        }
      }
    };
    
    scanDir(this.config.sourcePath);
    return files;
  }

  /**
   * 加载上次备份的清单
   */
  private loadLastManifest(): FileInfo[] | null {
    if (fs.existsSync(this.lastBackupManifest)) {
      const manifest = JSON.parse(fs.readFileSync(this.lastBackupManifest, 'utf-8'));
      return manifest.files || null;
    }
    return null;
  }

  /**
   * 保存备份清单
   */
  private saveManifest(metadata: BackupMetadata): void {
    const manifestPath = path.join(
      this.config.backupDir,
      `manifest-${metadata.backupId}.json`
    );
    fs.writeFileSync(manifestPath, JSON.stringify(metadata, null, 2));
    fs.writeFileSync(this.lastBackupManifest, JSON.stringify(metadata, null, 2));
  }

  /**
   * 执行全量备份
   */
  private performFullBackup(): BackupMetadata {
    console.log('📦 开始全量备份...');
    
    const backupId = Date.now().toString();
    const backupPath = path.join(this.config.backupDir, `backup-${backupId}`);
    this.ensureDirectory(backupPath);
    
    const files = this.scanSourceDirectory();
    let totalSize = 0;
    let copiedCount = 0;
    
    for (const file of files) {
      const srcPath = path.join(this.config.sourcePath, file.path);
      const dstPath = path.join(backupPath, file.path);
      
      this.ensureDirectory(path.dirname(dstPath));
      fs.copyFileSync(srcPath, dstPath);
      
      totalSize += file.size;
      copiedCount++;
      
      if (copiedCount % 100 === 0) {
        console.log(`   已复制 ${copiedCount}/${files.length} 个文件...`);
      }
    }
    
    const metadata: BackupMetadata = {
      backupId,
      timestamp: Date.now(),
      type: 'full',
      sourcePath: this.config.sourcePath,
      backupPath,
      files,
      totalSize,
      fileCount: files.length,
    };
    
    this.saveManifest(metadata);
    this.cleanupOldBackups();
    
    console.log(`✅ 全量备份完成!`);
    console.log(`   备份 ID: ${backupId}`);
    console.log(`   文件数: ${files.length}`);
    console.log(`   总大小: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
    
    return metadata;
  }

  /**
   * 执行增量备份
   */
  private performIncrementalBackup(): BackupMetadata | null {
    console.log('📦 开始增量备份...');
    
    const lastFiles = this.loadLastManifest();
    if (!lastFiles) {
      console.log('⚠️  未找到上次备份，执行全量备份');
      return this.performFullBackup();
    }
    
    const currentFiles = this.scanSourceDirectory();
    const lastFileMap = new Map(lastFiles.map(f => [f.path, f]));
    
    const changedFiles = currentFiles.filter(file => {
      const lastFile = lastFileMap.get(file.path);
      if (!lastFile) {
        // 新文件
        file.changed = true;
        return true;
      }
      
      // 检查是否变更 (通过哈希或修改时间)
      const isChanged = file.hash !== lastFile.hash || file.mtime !== lastFile.mtime;
      file.changed = isChanged;
      return isChanged;
    });
    
    if (changedFiles.length === 0) {
      console.log('✅ 无变更文件，跳过备份');
      return null;
    }
    
    const backupId = Date.now().toString();
    const backupPath = path.join(this.config.backupDir, `backup-${backupId}`);
    this.ensureDirectory(backupPath);
    
    let totalSize = 0;
    
    // 创建增量备份结构
    const deltaDir = path.join(backupPath, 'delta');
    this.ensureDirectory(deltaDir);
    
    for (const file of changedFiles) {
      const srcPath = path.join(this.config.sourcePath, file.path);
      const dstPath = path.join(deltaDir, file.path);
      
      this.ensureDirectory(path.dirname(dstPath));
      fs.copyFileSync(srcPath, dstPath);
      
      totalSize += file.size;
    }
    
    // 保存完整的文件列表 (包含未变更的文件引用)
    const metadata: BackupMetadata = {
      backupId,
      timestamp: Date.now(),
      type: 'incremental',
      sourcePath: this.config.sourcePath,
      backupPath,
      files: currentFiles,
      totalSize,
      fileCount: changedFiles.length,
      note: `增量备份：${changedFiles.length} 个变更文件`,
    };
    
    this.saveManifest(metadata);
    this.cleanupOldBackups();
    
    console.log(`✅ 增量备份完成!`);
    console.log(`   备份 ID: ${backupId}`);
    console.log(`   变更文件数: ${changedFiles.length}`);
    console.log(`   增量大小: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
    
    return metadata;
  }

  /**
   * 执行备份 (自动选择全量或增量)
   */
  public backup(note?: string): BackupMetadata {
    if (this.config.enableIncremental && fs.existsSync(this.lastBackupManifest)) {
      const result = this.performIncrementalBackup();
      if (result) {
        if (note) result.note = note;
        return result;
      }
      // 无变更时返回 null，创建空备份标记
      return {
        backupId: Date.now().toString(),
        timestamp: Date.now(),
        type: 'incremental',
        sourcePath: this.config.sourcePath,
        backupPath: '',
        files: [],
        totalSize: 0,
        fileCount: 0,
        note: '无变更',
      };
    } else {
      const result = this.performFullBackup();
      if (note) result.note = note;
      return result;
    }
  }

  /**
   * 清理旧备份
   */
  private cleanupOldBackups(): void {
    const backups = this.listBackups();
    
    if (backups.length > this.config.retainCount) {
      const toDelete = backups.slice(0, backups.length - this.config.retainCount);
      
      for (const backup of toDelete) {
        console.log(`🗑️  删除旧备份：${backup.backupId}`);
        if (backup.backupPath && fs.existsSync(backup.backupPath)) {
          fs.rmSync(backup.backupPath, { recursive: true, force: true });
        }
        // 删除对应的 manifest
        const manifestPath = path.join(
          this.config.backupDir,
          `manifest-${backup.backupId}.json`
        );
        if (fs.existsSync(manifestPath)) {
          fs.unlinkSync(manifestPath);
        }
      }
    }
  }

  /**
   * 列出所有备份
   */
  public listBackups(): BackupMetadata[] {
    const manifests = fs
      .readdirSync(this.config.backupDir)
      .filter(f => f.startsWith('manifest-') && f.endsWith('.json'))
      .map(f => {
        const content = fs.readFileSync(path.join(this.config.backupDir, f), 'utf-8');
        return JSON.parse(content) as BackupMetadata;
      })
      .sort((a, b) => a.timestamp - b.timestamp);
    
    return manifests;
  }

  /**
   * 恢复备份
   */
  public restore(backupId: string, options: Partial<RestoreOptions> = {}): void {
    console.log(`🔄 开始恢复备份：${backupId}`);
    
    const opts: RestoreOptions = {
      targetPath: options.targetPath || this.config.sourcePath,
      overwrite: options.overwrite ?? false,
      verify: options.verify ?? true,
    };
    
    // 加载备份清单
    const manifestPath = path.join(
      this.config.backupDir,
      `manifest-${backupId}.json`
    );
    
    if (!fs.existsSync(manifestPath)) {
      throw new Error(`备份不存在：${backupId}`);
    }
    
    const metadata: BackupMetadata = JSON.parse(
      fs.readFileSync(manifestPath, 'utf-8')
    );
    
    console.log(`   备份类型：${metadata.type}`);
    console.log(`   备份时间：${new Date(metadata.timestamp).toLocaleString()}`);
    console.log(`   文件数量：${metadata.fileCount}`);
    
    // 确定恢复源路径
    let sourceBackupPath = metadata.backupPath;
    
    // 如果是增量备份，需要先恢复基础备份
    if (metadata.type === 'incremental') {
      const backups = this.listBackups();
      const lastFullBackup = backups
        .filter(b => b.type === 'full' && b.timestamp < metadata.timestamp)
        .pop();
      
      if (lastFullBackup) {
        console.log(`   基础备份：${lastFullBackup.backupId}`);
        // 恢复基础备份
        this.restore(lastFullBackup.backupId, {
          targetPath: opts.targetPath,
          overwrite: opts.overwrite,
          verify: false, // 基础备份不重复验证
        });
        sourceBackupPath = metadata.backupPath;
      }
    }
    
    // 恢复文件
    let restoredCount = 0;
    let skippedCount = 0;
    
    for (const file of metadata.files) {
      const srcPath = path.join(sourceBackupPath, file.path);
      const dstPath = path.join(opts.targetPath!, file.path);
      
      // 处理增量备份的 delta 目录
      const deltaPath = path.join(sourceBackupPath, 'delta', file.path);
      const actualSrc = fs.existsSync(deltaPath) ? deltaPath : srcPath;
      
      if (!fs.existsSync(actualSrc)) {
        continue;
      }
      
      if (fs.existsSync(dstPath) && !opts.overwrite) {
        skippedCount++;
        continue;
      }
      
      this.ensureDirectory(path.dirname(dstPath));
      fs.copyFileSync(actualSrc, dstPath);
      restoredCount++;
      
      if (opts.verify) {
        const restoredHash = this.calculateHash(dstPath);
        if (restoredHash !== file.hash) {
          console.warn(`⚠️  文件验证失败：${file.path}`);
        }
      }
      
      if (restoredCount % 100 === 0) {
        console.log(`   已恢复 ${restoredCount}/${metadata.files.length} 个文件...`);
      }
    }
    
    console.log(`✅ 恢复完成!`);
    console.log(`   恢复文件数：${restoredCount}`);
    console.log(`   跳过文件数：${skippedCount}`);
  }

  /**
   * 获取备份统计信息
   */
  public getStats(): {
    totalBackups: number;
    totalSize: number;
    lastBackup: BackupMetadata | null;
    firstBackup: BackupMetadata | null;
  } {
    const backups = this.listBackups();
    
    return {
      totalBackups: backups.length,
      totalSize: backups.reduce((sum, b) => sum + b.totalSize, 0),
      lastBackup: backups.length > 0 ? backups[backups.length - 1] : null,
      firstBackup: backups.length > 0 ? backups[0] : null,
    };
  }
}

// ============================================
// 便捷函数
// ============================================

/**
 * 创建备份管理器实例
 */
export function createBackupManager(config: Partial<BackupConfig>): BackupManager {
  return new BackupManager(config);
}

/**
 * 快速备份 (使用默认配置)
 */
export function quickBackup(sourcePath: string, note?: string): BackupMetadata {
  const manager = new BackupManager({ sourcePath });
  return manager.backup(note);
}

/**
 * 快速恢复
 */
export function quickRestore(
  sourcePath: string,
  backupId: string,
  options?: Partial<RestoreOptions>
): void {
  const manager = new BackupManager({ sourcePath });
  manager.restore(backupId, options);
}

// ============================================
// CLI 使用示例
// ============================================

if (require.main === module) {
  console.log('=== 备份管理工具 - ACE ===\n');
  
  // 示例 1: 创建备份管理器
  console.log('1️⃣ 创建备份管理器:');
  const manager = createBackupManager({
    sourcePath: process.cwd(),
    backupDir: path.join(process.cwd(), '.backups'),
    retainCount: 5,
    enableIncremental: true,
    excludePatterns: ['node_modules', '.git', '*.log', 'dist'],
  });
  console.log(`   源目录：${process.cwd()}`);
  console.log(`   备份目录：.backups\n`);
  
  // 示例 2: 执行备份
  console.log('2️⃣ 执行备份:');
  try {
    const backup = manager.backup('自动备份示例');
    console.log(`   备份 ID: ${backup.backupId}`);
    console.log(`   类型：${backup.type}`);
    console.log(`   文件数：${backup.fileCount}`);
    console.log(`   大小：${(backup.totalSize / 1024 / 1024).toFixed(2)} MB\n`);
  } catch (error) {
    console.error(`   备份失败：${error}`);
  }
  
  // 示例 3: 列出备份
  console.log('3️⃣ 列出备份:');
  const backups = manager.listBackups();
  backups.forEach(b => {
    console.log(`   - ${b.backupId} (${b.type}) - ${new Date(b.timestamp).toLocaleString()}`);
  });
  console.log();
  
  // 示例 4: 获取统计
  console.log('4️⃣ 备份统计:');
  const stats = manager.getStats();
  console.log(`   总备份数：${stats.totalBackups}`);
  console.log(`   总大小：${(stats.totalSize / 1024 / 1024).toFixed(2)} MB`);
  if (stats.lastBackup) {
    console.log(`   最后备份：${new Date(stats.lastBackup.timestamp).toLocaleString()}`);
  }
  console.log();
  
  // 示例 5: 恢复备份 (演示用，不实际执行)
  console.log('5️⃣ 恢复备份 (示例代码):');
  console.log('   // 恢复指定备份');
  console.log('   manager.restore(backupId, {');
  console.log('     overwrite: true,');
  console.log('     verify: true');
  console.log('   });');
  console.log();
  
  console.log('✅ 所有示例完成!');
  console.log('\n📖 使用方法:');
  console.log('   import { createBackupManager } from "./backup-manager-skill";');
  console.log('');
  console.log('   const manager = createBackupManager({');
  console.log('     sourcePath: "/path/to/source",');
  console.log('     backupDir: "/path/to/backups",');
  console.log('     retainCount: 7,');
  console.log('     enableIncremental: true');
  console.log('   });');
  console.log('');
  console.log('   // 执行备份');
  console.log('   const backup = manager.backup("备注信息");');
  console.log('');
  console.log('   // 列出备份');
  console.log('   const backups = manager.listBackups();');
  console.log('');
  console.log('   // 恢复备份');
  console.log('   manager.restore(backupId, { overwrite: true });');
}
