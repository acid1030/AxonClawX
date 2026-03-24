# 备份恢复工具使用示例

## 📦 快速开始

### 1. 基础备份

```typescript
import { quickBackup, quickRestore } from './backup-utils-skill';

// 全量备份
const result = await quickBackup('/path/to/source', './backups');
console.log('备份成功:', result.success);
console.log('备份 ID:', result.metadata?.id);
console.log('文件大小:', result.metadata?.size);
console.log('文件数量:', result.metadata?.fileCount);
```

### 2. 基础恢复

```typescript
import { quickRestore } from './backup-utils-skill';

// 恢复备份
const result = await quickRestore('./backups/backup_1234567890_abc123');
console.log('恢复成功:', result.success);
console.log('恢复文件数:', result.filesRestored);
console.log('目标路径:', result.targetPath);
```

---

## 🔧 高级用法

### 3. 使用 BackupManager

```typescript
import { createBackupManager } from './backup-utils-skill';

// 创建备份管理器
const manager = createBackupManager('./my-backups');

// 监听事件
manager.on('start', (info) => {
  console.log('开始备份:', info.sourcePath);
});

manager.on('file', (info) => {
  console.log(`处理文件: ${info.file} (${info.processed})`);
});

manager.on('complete', (result) => {
  console.log('备份完成:', result);
});

manager.on('error', (error) => {
  console.error('备份失败:', error);
});

// 执行备份
const result = await manager.backup('/path/to/source');
```

### 4. 增量备份

```typescript
import { createBackupManager } from './backup-utils-skill';

const manager = createBackupManager('./backups');

// 第一次：全量备份
const fullBackup = await manager.backup('/path/to/source', './backups', {
  compress: true,
  verify: true
});

console.log('全量备份 ID:', fullBackup.metadata?.id);

// 第二次：增量备份 (只备份变化的文件)
const incrementalBackup = await manager.incrementalBackup(
  '/path/to/source',
  fullBackup.metadata!.backupPath,  // 基础备份路径
  './backups'
);

console.log('增量备份 ID:', incrementalBackup.metadata?.id);
console.log('跳过未变化文件:', incrementalBackup.filesSkipped);
```

### 5. 带压缩选项的备份

```typescript
import { quickBackup } from './backup-utils-skill';

// 高压缩级别 (更慢但更小)
const result = await quickBackup('/path/to/source', './backups', {
  compress: true,
  compressionLevel: 9,  // 1-9, 9 为最高压缩
  verify: true
});

console.log('压缩比:', result.metadata?.size);
```

### 6. 排除特定文件

```typescript
import { quickBackup } from './backup-utils-skill';

// 排除 node_modules、.git 和日志文件
const result = await quickBackup('/path/to/project', './backups', {
  excludePatterns: [
    'node_modules',
    '\\.git',
    '\\.log$',
    '\\.tmp$',
    'dist'
  ],
  includeHidden: false  // 不包含隐藏文件
});

console.log('跳过的文件:', result.filesSkipped);
```

### 7. 恢复到不同路径

```typescript
import { quickRestore } from './backup-utils-skill';

// 恢复到新路径
const result = await quickRestore('./backups/backup_1234567890_abc123', {
  targetPath: '/path/to/restore',
  overwrite: false,  // 不覆盖现有文件
  verify: true
});

console.log('恢复位置:', result.targetPath);
```

### 8. 增量备份链恢复

```typescript
import { createBackupManager } from './backup-utils-skill';

const manager = createBackupManager();

// 恢复完整备份链
const result = await manager.restore('./backups/backup_full_123', {
  targetPath: '/path/to/restore',
  overwrite: true,
  incrementalChain: [
    './backups/backup_incremental_456',
    './backups/backup_incremental_789'
  ]
});

console.log('应用了', result.filesRestored, '个文件');
```

---

## 📋 管理备份

### 9. 列出所有备份

```typescript
import { createBackupManager } from './backup-utils-skill';

const manager = createBackupManager('./backups');
const backups = manager.listBackups();

backups.forEach(backup => {
  console.log(`备份 ID: ${backup.id}`);
  console.log(`  类型：${backup.type}`);
  console.log(`  时间：${new Date(backup.timestamp).toISOString()}`);
  console.log(`  大小：${backup.size} 字节`);
  console.log(`  文件数：${backup.fileCount}`);
  console.log(`  压缩：${backup.compressed}`);
  console.log('---');
});
```

### 10. 获取备份详情

```typescript
import { createBackupManager } from './backup-utils-skill';

const manager = createBackupManager('./backups');
const details = manager.getBackupDetails('backup_1234567890_abc123');

if (details) {
  console.log('备份详情:', details);
}
```

### 11. 删除备份

```typescript
import { createBackupManager } from './backup-utils-skill';

const manager = createBackupManager('./backups');
const result = manager.deleteBackup('backup_1234567890_abc123');

if (result.success) {
  console.log('备份已删除');
} else {
  console.error('删除失败:', result.error);
}
```

### 12. 清理旧备份

```typescript
import { createBackupManager } from './backup-utils-skill';

const manager = createBackupManager('./backups');

// 删除 30 天前的备份
const cleanup = manager.cleanupOldBackups(30);
console.log(`删除了 ${cleanup.deleted} 个旧备份`);

// 删除 7 天前的备份
const cleanupWeek = manager.cleanupOldBackups(7);
console.log(`删除了 ${cleanupWeek.deleted} 个旧备份`);
```

---

## ✅ 验证备份

### 13. 验证备份完整性

```typescript
import { createBackupManager } from './backup-utils-skill';

const manager = createBackupManager('./backups');

// 验证备份
const verify = manager.verifyBackup('./backups/backup_1234567890_abc123');

if (verify.success) {
  console.log('备份验证通过 ✓');
} else {
  console.error('备份验证失败:', verify.error);
}
```

---

## 🎯 实际场景示例

### 14. 项目自动备份脚本

```typescript
import { createBackupManager } from './backup-utils-skill';
import * as path from 'path';

async function backupProject(projectPath: string) {
  const manager = createBackupManager('./project-backups');
  const projectName = path.basename(projectPath);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  
  console.log(`开始备份项目：${projectName}`);
  
  const result = await manager.backup(projectPath, './project-backups', {
    compress: true,
    compressionLevel: 6,
    excludePatterns: [
      'node_modules',
      '\\.git',
      'dist',
      'build',
      '\\.log$',
      '\\.tmp$',
      '.DS_Store'
    ],
    verify: true
  });
  
  if (result.success) {
    console.log(`✓ 备份完成: ${result.metadata?.id}`);
    console.log(`  文件数：${result.metadata?.fileCount}`);
    console.log(`  大小：${(result.metadata!.size / 1024 / 1024).toFixed(2)} MB`);
    console.log(`  耗时：${result.metadata?.duration} ms`);
  } else {
    console.error('✗ 备份失败:', result.error);
    process.exit(1);
  }
}

// 使用
backupProject('/path/to/my/project');
```

### 15. 定时备份任务

```typescript
import { createBackupManager } from './backup-utils-skill';

async function scheduledBackup() {
  const manager = createBackupManager('./scheduled-backups');
  
  // 每天备份重要数据
  const sources = [
    '/Users/nike/Documents',
    '/Users/nike/Projects',
    '/Users/nike/Photos'
  ];
  
  for (const source of sources) {
    console.log(`备份：${source}`);
    
    const result = await manager.backup(source, './scheduled-backups', {
      compress: true,
      excludePatterns: ['node_modules', '\\.git'],
      verify: true
    });
    
    if (result.success) {
      console.log(`✓ ${source} 备份成功`);
    } else {
      console.error(`✗ ${source} 备份失败:`, result.error);
    }
  }
  
  // 清理 30 天前的备份
  const cleanup = manager.cleanupOldBackups(30);
  console.log(`清理了 ${cleanup.deleted} 个旧备份`);
}

// 每天凌晨 2 点执行
setInterval(scheduledBackup, 24 * 60 * 60 * 1000);
```

### 16. 数据库备份

```typescript
import { createBackupManager } from './backup-utils-skill';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function backupDatabase() {
  const manager = createBackupManager('./db-backups');
  const dbDumpPath = './temp/db_dump.sql';
  
  // 导出数据库
  await execAsync(`pg_dump mydb > ${dbDumpPath}`);
  
  // 备份 SQL 文件
  const result = await manager.backup(dbDumpPath, './db-backups', {
    compress: true,
    compressionLevel: 9
  });
  
  // 清理临时文件
  fs.unlinkSync(dbDumpPath);
  
  if (result.success) {
    console.log('数据库备份成功:', result.metadata?.id);
  }
  
  return result;
}
```

### 17. 配置备份

```typescript
import { createBackupManager } from './backup-utils-skill';

async function backupConfigs() {
  const manager = createBackupManager('./config-backups');
  
  const configPaths = [
    '/etc/nginx/nginx.conf',
    '/etc/redis/redis.conf',
    '/etc/postgresql/postgresql.conf'
  ];
  
  // 创建临时配置目录
  const tempDir = './temp/configs';
  fs.mkdirSync(tempDir, { recursive: true });
  
  // 复制配置文件
  for (const configPath of configPaths) {
    if (fs.existsSync(configPath)) {
      const dest = path.join(tempDir, path.basename(configPath));
      fs.copyFileSync(configPath, dest);
    }
  }
  
  // 备份配置目录
  const result = await manager.backup(tempDir, './config-backups', {
    compress: true
  });
  
  // 清理临时目录
  fs.rmSync(tempDir, { recursive: true, force: true });
  
  return result;
}
```

---

## 📊 事件监听完整示例

```typescript
import { createBackupManager } from './backup-utils-skill';

const manager = createBackupManager('./backups');

// 监听所有事件
manager.on('start', (info) => {
  console.log('📦 开始备份');
  console.log('  源路径:', info.sourcePath);
  console.log('  备份目录:', info.backupDir);
});

manager.on('file', (info) => {
  process.stdout.write(`\r  处理中... ${info.processed} 文件`);
});

manager.on('verifying', (path) => {
  console.log('\n  ✓ 备份完成，正在验证...');
});

manager.on('complete', (result) => {
  console.log('\n✅ 备份成功完成!');
  console.log('  备份 ID:', result.metadata?.id);
  console.log('  总文件:', result.filesProcessed);
  console.log('  跳过:', result.filesSkipped);
  console.log('  大小:', (result.metadata!.size / 1024 / 1024).toFixed(2), 'MB');
  console.log('  耗时:', result.metadata?.duration, 'ms');
  
  if (result.warnings) {
    console.log('  警告:', result.warnings);
  }
});

manager.on('error', (error) => {
  console.error('\n❌ 备份失败:', error);
});

manager.on('warning', (warning) => {
  console.warn('⚠️  警告:', warning);
});

// 执行备份
manager.backup('/path/to/source', './backups', {
  compress: true,
  verify: true
});
```

---

## 📝 API 参考

### BackupOptions

```typescript
interface BackupOptions {
  compress?: boolean;           // 是否压缩 (默认 true)
  compressionLevel?: number;    // 压缩级别 1-9 (默认 6)
  incremental?: boolean;        // 是否增量备份 (默认 false)
  baseBackupPath?: string;      // 基础备份路径
  excludePatterns?: string[];   // 排除的文件模式
  includeHidden?: boolean;      // 包含隐藏文件 (默认 false)
  verify?: boolean;             // 备份后验证 (默认 true)
}
```

### RestoreOptions

```typescript
interface RestoreOptions {
  targetPath?: string;          // 恢复目标路径
  overwrite?: boolean;          // 覆盖现有文件 (默认 false)
  verify?: boolean;             // 恢复后验证 (默认 true)
  incrementalChain?: string[];  // 增量备份链
}
```

### BackupMetadata

```typescript
interface BackupMetadata {
  id: string;                   // 备份 ID
  type: 'full' | 'incremental'; // 备份类型
  timestamp: number;            // 时间戳
  sourcePath: string;           // 源路径
  backupPath: string;           // 备份路径
  size: number;                 // 备份大小 (字节)
  fileCount: number;            // 文件数量
  hash: string;                 // 备份哈希
  compressed: boolean;          // 是否压缩
  baseBackupId?: string;        // 基础备份 ID
  duration: number;             // 备份耗时 (ms)
}
```

---

## 💡 最佳实践

1. **定期备份**: 设置定时任务，每天/每周自动备份
2. **增量备份**: 对大型项目使用增量备份节省空间
3. **验证备份**: 始终启用 `verify: true` 确保备份完整
4. **多版本保留**: 保留多个历史版本以防万一
5. **异地备份**: 将备份复制到不同物理位置
6. **清理旧备份**: 定期清理超过 30 天的旧备份
7. **排除大文件**: 使用 `excludePatterns` 排除不必要的大文件
8. **压缩备份**: 启用压缩节省存储空间

---

**创建时间:** 2026-03-13  
**版本:** 1.0.0  
**作者:** KAEL
