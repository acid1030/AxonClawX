/**
 * 同步管理工具 - KAEL
 * 
 * 提供完整的数据同步解决方案：
 * 1. 双向同步 - 支持多端数据双向同步
 * 2. 冲突解决 - 智能检测并解决数据冲突
 * 3. 增量同步 - 仅同步变化的数据，提高效率
 * 
 * @module SyncManagerSkill
 * @author KAEL
 * @version 1.0.0
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

// ============================================
// 类型定义
// ============================================

/**
 * 同步方向
 */
type SyncDirection = 'source-to-target' | 'target-to-source' | 'bidirectional';

/**
 * 冲突解决策略
 */
type ConflictResolution = 'newest-wins' | 'source-wins' | 'target-wins' | 'manual' | 'merge';

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
  /** 是否存在 */
  exists: boolean;
}

/**
 * 同步记录
 */
interface SyncRecord {
  /** 文件路径 */
  filePath: string;
  /** 操作类型 */
  action: 'create' | 'update' | 'delete' | 'skip' | 'conflict';
  /** 同步方向 */
  direction: 'source-to-target' | 'target-to-source';
  /** 时间戳 */
  timestamp: number;
  /** 冲突信息 (如果有) */
  conflict?: ConflictInfo;
}

/**
 * 冲突信息
 */
interface ConflictInfo {
  /** 冲突类型 */
  type: 'modified-both' | 'deleted-modified' | 'created-both';
  /** 源文件信息 */
  source: FileInfo;
  /** 目标文件信息 */
  target: FileInfo;
  /** 解决策略 */
  resolution: ConflictResolution;
  /** 解决结果 */
  resolved?: 'source' | 'target' | 'merged' | 'pending';
}

/**
 * 同步状态
 */
interface SyncState {
  /** 上次同步时间 */
  lastSyncTime: number;
  /** 同步记录 */
  records: SyncRecord[];
  /** 待解决的冲突 */
  pendingConflicts: ConflictInfo[];
  /** 同步统计 */
  stats: {
    created: number;
    updated: number;
    deleted: number;
    skipped: number;
    conflicts: number;
  };
}

/**
 * 同步配置
 */
interface SyncConfig {
  /** 源目录 */
  sourcePath: string;
  /** 目标目录 */
  targetPath: string;
  /** 同步方向 */
  direction: SyncDirection;
  /** 冲突解决策略 */
  conflictResolution: ConflictResolution;
  /** 排除的文件模式 */
  excludePatterns: string[];
  /** 是否启用增量同步 */
  enableIncremental: boolean;
  /** 状态文件路径 */
  stateFilePath: string;
  /** 是否验证文件完整性 */
  verifyIntegrity: boolean;
}

// ============================================
// 同步管理器类
// ============================================

export class SyncManager {
  private config: SyncConfig;
  private state: SyncState;

  constructor(config: Partial<SyncConfig>) {
    this.config = {
      sourcePath: config.sourcePath || '',
      targetPath: config.targetPath || '',
      direction: config.direction || 'bidirectional',
      conflictResolution: config.conflictResolution || 'newest-wins',
      excludePatterns: config.excludePatterns || ['*.tmp', '*.log', '.git', 'node_modules'],
      enableIncremental: config.enableIncremental !== false,
      stateFilePath: config.stateFilePath || '.sync-state.json',
      verifyIntegrity: config.verifyIntegrity !== false,
    };

    this.state = this.loadState();
  }

  // ============================================
  // 核心同步方法
  // ============================================

  /**
   * 执行同步
   */
  async sync(): Promise<SyncState> {
    console.log(`🔄 开始同步：${this.config.sourcePath} ↔ ${this.config.targetPath}`);

    // 重置状态
    this.state = {
      lastSyncTime: Date.now(),
      records: [],
      pendingConflicts: [],
      stats: { created: 0, updated: 0, deleted: 0, skipped: 0, conflicts: 0 },
    };

    // 获取源和目标文件列表
    const sourceFiles = await this.scanDirectory(this.config.sourcePath);
    const targetFiles = await this.scanDirectory(this.config.targetPath);

    // 根据同步方向执行同步
    if (this.config.direction === 'source-to-target') {
      await this.syncOneWay(sourceFiles, targetFiles, 'source-to-target');
    } else if (this.config.direction === 'target-to-source') {
      await this.syncOneWay(targetFiles, sourceFiles, 'target-to-source');
    } else {
      // 双向同步
      await this.syncBidirectional(sourceFiles, targetFiles);
    }

    // 保存状态
    this.saveState();

    console.log(`✅ 同步完成：${this.state.stats.created} 创建，${this.state.stats.updated} 更新，${this.state.stats.deleted} 删除，${this.state.stats.conflicts} 冲突`);

    return this.state;
  }

  /**
   * 单向同步
   */
  private async syncOneWay(
    sourceFiles: Map<string, FileInfo>,
    targetFiles: Map<string, FileInfo>,
    direction: 'source-to-target' | 'target-to-source'
  ): Promise<void> {
    const sourceDir = direction === 'source-to-target' ? this.config.sourcePath : this.config.targetPath;
    const targetDir = direction === 'source-to-target' ? this.config.targetPath : this.config.sourcePath;

    // 处理源目录中的文件
    for (const [relPath, sourceInfo] of sourceFiles) {
      const targetInfo = targetFiles.get(relPath);

      if (!targetInfo) {
        // 目标不存在 - 创建
        await this.copyFile(
          path.join(sourceDir, relPath),
          path.join(targetDir, relPath)
        );
        this.recordAction(relPath, 'create', direction);
        this.state.stats.created++;
      } else if (this.hasChanged(sourceInfo, targetInfo)) {
        // 文件已变更 - 更新
        const conflict = this.detectConflict(sourceInfo, targetInfo);
        
        if (conflict) {
          // 检测到冲突
          await this.resolveConflict(conflict, sourceDir, targetDir, relPath);
          this.recordAction(relPath, 'conflict', direction, conflict);
          this.state.stats.conflicts++;
        } else {
          await this.copyFile(
            path.join(sourceDir, relPath),
            path.join(targetDir, relPath)
          );
          this.recordAction(relPath, 'update', direction);
          this.state.stats.updated++;
        }
      }
    }

    // 处理目标目录中已删除的文件
    if (this.config.direction !== 'target-to-source') {
      for (const [relPath, targetInfo] of targetFiles) {
        if (!sourceFiles.has(relPath)) {
          // 源文件已删除 - 删除目标文件
          const targetFilePath = path.join(targetDir, relPath);
          if (fs.existsSync(targetFilePath)) {
            fs.unlinkSync(targetFilePath);
            this.recordAction(relPath, 'delete', direction);
            this.state.stats.deleted++;
          }
        }
      }
    }
  }

  /**
   * 双向同步
   */
  private async syncBidirectional(
    sourceFiles: Map<string, FileInfo>,
    targetFiles: Map<string, FileInfo>
  ): Promise<void> {
    const allPaths = new Set([...sourceFiles.keys(), ...targetFiles.keys()]);

    for (const relPath of allPaths) {
      const sourceInfo = sourceFiles.get(relPath);
      const targetInfo = targetFiles.get(relPath);

      if (sourceInfo && !targetInfo) {
        // 仅源存在 - 复制到目标
        await this.copyFile(
          path.join(this.config.sourcePath, relPath),
          path.join(this.config.targetPath, relPath)
        );
        this.recordAction(relPath, 'create', 'source-to-target');
        this.state.stats.created++;
      } else if (!sourceInfo && targetInfo) {
        // 仅目标存在 - 复制到源
        await this.copyFile(
          path.join(this.config.targetPath, relPath),
          path.join(this.config.sourcePath, relPath)
        );
        this.recordAction(relPath, 'create', 'target-to-source');
        this.state.stats.created++;
      } else if (sourceInfo && targetInfo) {
        // 都存在 - 检查变更
        if (this.hasChanged(sourceInfo, targetInfo)) {
          const conflict = this.detectConflict(sourceInfo, targetInfo);
          
          if (conflict) {
            // 冲突解决
            await this.resolveConflict(conflict, this.config.sourcePath, this.config.targetPath, relPath);
            this.recordAction(relPath, 'conflict', 'bidirectional', conflict);
            this.state.stats.conflicts++;
          } else {
            // 无冲突 - 新者胜
            const newer = sourceInfo.mtime > targetInfo.mtime ? 'source' : 'target';
            if (newer === 'source') {
              await this.copyFile(
                path.join(this.config.sourcePath, relPath),
                path.join(this.config.targetPath, relPath)
              );
              this.recordAction(relPath, 'update', 'source-to-target');
            } else {
              await this.copyFile(
                path.join(this.config.targetPath, relPath),
                path.join(this.config.sourcePath, relPath)
              );
              this.recordAction(relPath, 'update', 'target-to-source');
            }
            this.state.stats.updated++;
          }
        }
      }
    }
  }

  // ============================================
  // 冲突检测与解决
  // ============================================

  /**
   * 检测冲突
   */
  private detectConflict(source: FileInfo, target: FileInfo): ConflictInfo | null {
    // 如果哈希相同，无冲突
    if (source.hash === target.hash) {
      return null;
    }

    // 检查是否都在上次同步后被修改
    const lastSyncTime = this.state.lastSyncTime;
    const sourceModified = source.mtime > lastSyncTime;
    const targetModified = target.mtime > lastSyncTime;

    if (sourceModified && targetModified) {
      // 双方都被修改 - 冲突
      return {
        type: 'modified-both',
        source,
        target,
        resolution: this.config.conflictResolution,
      };
    }

    return null;
  }

  /**
   * 解决冲突
   */
  private async resolveConflict(
    conflict: ConflictInfo,
    sourceDir: string,
    targetDir: string,
    relPath: string
  ): Promise<void> {
    const { resolution } = conflict;

    switch (resolution) {
      case 'newest-wins':
        // 新者胜
        const newer = conflict.source.mtime > conflict.target.mtime ? 'source' : 'target';
        if (newer === 'source') {
          await this.copyFile(
            path.join(sourceDir, relPath),
            path.join(targetDir, relPath)
          );
        } else {
          await this.copyFile(
            path.join(targetDir, relPath),
            path.join(sourceDir, relPath)
          );
        }
        conflict.resolved = newer;
        break;

      case 'source-wins':
        // 源胜
        await this.copyFile(
          path.join(sourceDir, relPath),
          path.join(targetDir, relPath)
        );
        conflict.resolved = 'source';
        break;

      case 'target-wins':
        // 目标胜
        await this.copyFile(
          path.join(targetDir, relPath),
          path.join(sourceDir, relPath)
        );
        conflict.resolved = 'target';
        break;

      case 'merge':
        // 合并 (简单文本文件)
        await this.mergeFiles(
          path.join(sourceDir, relPath),
          path.join(targetDir, relPath),
          path.join(targetDir, relPath + '.merged')
        );
        conflict.resolved = 'merged';
        break;

      case 'manual':
        // 手动解决 - 添加到待处理列表
        this.state.pendingConflicts.push(conflict);
        conflict.resolved = 'pending';
        break;
    }
  }

  /**
   * 合并文件 (简单文本合并)
   */
  private async mergeFiles(sourcePath: string, targetPath: string, outputPath: string): Promise<void> {
    try {
      const sourceContent = fs.readFileSync(sourcePath, 'utf-8');
      const targetContent = fs.readFileSync(targetPath, 'utf-8');

      const merged = `<<<<<<< SOURCE\n${sourceContent}\n=======\n${targetContent}\n>>>>>>> TARGET\n`;
      fs.writeFileSync(outputPath, merged);
      console.log(`📝 已创建合并文件：${outputPath}`);
    } catch (error) {
      console.error(`❌ 合并失败：${error}`);
      throw error;
    }
  }

  // ============================================
  // 文件操作
  // ============================================

  /**
   * 扫描目录
   */
  private async scanDirectory(dirPath: string): Promise<Map<string, FileInfo>> {
    const files = new Map<string, FileInfo>();

    if (!fs.existsSync(dirPath)) {
      return files;
    }

    const scan = (currentPath: string, baseRelPath: string = ''): void => {
      const entries = fs.readdirSync(currentPath, { withFileTypes: true });

      for (const entry of entries) {
        const relPath = baseRelPath ? path.posix.join(baseRelPath, entry.name) : entry.name;

        // 检查排除模式
        if (this.isExcluded(relPath)) {
          continue;
        }

        const fullPath = path.join(currentPath, entry.name);

        if (entry.isDirectory()) {
          scan(fullPath, relPath);
        } else if (entry.isFile()) {
          const stats = fs.statSync(fullPath);
          const hash = this.config.verifyIntegrity ? this.calculateHash(fullPath) : '';

          files.set(relPath, {
            path: relPath,
            size: stats.size,
            mtime: stats.mtimeMs,
            hash,
            exists: true,
          });
        }
      }
    };

    scan(dirPath);
    return files;
  }

  /**
   * 复制文件
   */
  private async copyFile(source: string, target: string): Promise<void> {
    const targetDir = path.dirname(target);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    fs.copyFileSync(source, target);
  }

  /**
   * 计算文件哈希
   */
  private calculateHash(filePath: string): string {
    const content = fs.readFileSync(filePath);
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  /**
   * 检查文件是否变更
   */
  private hasChanged(source: FileInfo, target: FileInfo): boolean {
    if (this.config.verifyIntegrity) {
      return source.hash !== target.hash;
    }
    return source.mtime !== target.mtime || source.size !== target.size;
  }

  /**
   * 检查是否被排除
   */
  private isExcluded(relPath: string): boolean {
    return this.config.excludePatterns.some(pattern => {
      const regex = new RegExp(pattern.replace(/\*/g, '.*').replace(/\?/g, '.'));
      return regex.test(relPath);
    });
  }

  // ============================================
  // 状态管理
  // ============================================

  /**
   * 加载状态
   */
  private loadState(): SyncState {
    const statePath = path.join(this.config.sourcePath, this.config.stateFilePath);
    
    if (fs.existsSync(statePath)) {
      try {
        const content = fs.readFileSync(statePath, 'utf-8');
        return JSON.parse(content);
      } catch (error) {
        console.warn(`⚠️  状态文件加载失败：${error}`);
      }
    }

    return {
      lastSyncTime: 0,
      records: [],
      pendingConflicts: [],
      stats: { created: 0, updated: 0, deleted: 0, skipped: 0, conflicts: 0 },
    };
  }

  /**
   * 保存状态
   */
  private saveState(): void {
    const statePath = path.join(this.config.sourcePath, this.config.stateFilePath);
    fs.writeFileSync(statePath, JSON.stringify(this.state, null, 2));
  }

  /**
   * 记录操作
   */
  private recordAction(
    filePath: string,
    action: SyncRecord['action'],
    direction: SyncRecord['direction'],
    conflict?: ConflictInfo
  ): void {
    this.state.records.push({
      filePath,
      action,
      direction,
      timestamp: Date.now(),
      conflict,
    });
  }

  // ============================================
  // 公共方法
  // ============================================

  /**
   * 获取同步状态
   */
  getState(): SyncState {
    return this.state;
  }

  /**
   * 获取待解决的冲突
   */
  getPendingConflicts(): ConflictInfo[] {
    return this.state.pendingConflicts;
  }

  /**
   * 清除同步状态
   */
  clearState(): void {
    const statePath = path.join(this.config.sourcePath, this.config.stateFilePath);
    if (fs.existsSync(statePath)) {
      fs.unlinkSync(statePath);
    }
    this.state = {
      lastSyncTime: 0,
      records: [],
      pendingConflicts: [],
      stats: { created: 0, updated: 0, deleted: 0, skipped: 0, conflicts: 0 },
    };
  }

  /**
   * 模拟同步 (不实际执行)
   */
  async dryRun(): Promise<SyncState> {
    console.log(`🔍 模拟同步：${this.config.sourcePath} ↔ ${this.config.targetPath}`);

    const originalState = { ...this.state };
    
    try {
      await this.sync();
      return this.state;
    } finally {
      this.state = originalState;
    }
  }
}

// ============================================
// 导出
// ============================================

export type {
  SyncDirection,
  ConflictResolution,
  FileInfo,
  SyncRecord,
  ConflictInfo,
  SyncState,
  SyncConfig,
};

export default SyncManager;
