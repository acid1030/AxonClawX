# 备份恢复工具 - Backup Utils

数据备份与恢复工具，支持全量备份、增量备份和数据恢复。

## 🚀 快速开始

```typescript
import { quickBackup, quickRestore } from './backup-utils-skill';

// 备份
const backup = await quickBackup('/path/to/source', './backups');

// 恢复
const restore = await quickRestore(backup.metadata!.backupPath);
```

## ✨ 核心功能

### 1. 全量备份
```typescript
const result = await quickBackup('/path/to/source', './backups', {
  compress: true,              // 启用压缩
  compressionLevel: 6,         // 压缩级别 1-9
  verify: true                 // 备份后验证
});
```

### 2. 增量备份
```typescript
const manager = createBackupManager('./backups');

// 全量备份
const full = await manager.backup('/source', './backups');

// 增量备份 (只备份变化的文件)
const incremental = await manager.incrementalBackup(
  '/source',
  full.metadata!.backupPath,
  './backups'
);
```

### 3. 数据恢复
```typescript
await quickRestore('./backups/backup_xxx', {
  targetPath: '/path/to/restore',
  overwrite: true
});
```

### 4. 备份管理
```typescript
const manager = createBackupManager('./backups');

// 列出所有备份
const backups = manager.listBackups();

// 删除备份
manager.deleteBackup('backup_id');

// 清理旧备份 (30 天前)
manager.cleanupOldBackups(30);

// 验证备份
manager.verifyBackup('./backups/backup_xxx');
```

## 📦 安装

无需额外依赖，使用 Node.js 原生模块:
- `fs` - 文件系统
- `path` - 路径处理
- `crypto` - 哈希计算
- `zlib` - 压缩/解压
- `events` - 事件发射器

## 🔧 选项配置

### BackupOptions
- `compress?: boolean` - 是否压缩 (默认 true)
- `compressionLevel?: number` - 压缩级别 1-9 (默认 6)
- `incremental?: boolean` - 是否增量备份 (默认 false)
- `baseBackupPath?: string` - 基础备份路径
- `excludePatterns?: string[]` - 排除的文件模式
- `includeHidden?: boolean` - 包含隐藏文件 (默认 false)
- `verify?: boolean` - 备份后验证 (默认 true)

### RestoreOptions
- `targetPath?: string` - 恢复目标路径 (默认原路径)
- `overwrite?: boolean` - 覆盖现有文件 (默认 false)
- `verify?: boolean` - 恢复后验证 (默认 true)
- `incrementalChain?: string[]` - 增量备份链

## 📊 事件监听

```typescript
const manager = createBackupManager();

manager.on('start', (info) => console.log('开始备份', info));
manager.on('file', (info) => console.log('处理文件', info.file));
manager.on('complete', (result) => console.log('备份完成', result));
manager.on('error', (error) => console.error('备份失败', error));
```

## 📝 完整示例

详见 [`backup-utils-skill.examples.md`](./backup-utils-skill.examples.md)

## 💡 最佳实践

1. ✅ 定期自动备份
2. ✅ 使用增量备份节省空间
3. ✅ 始终启用验证
4. ✅ 保留多个历史版本
5. ✅ 定期清理旧备份 (30 天+)
6. ✅ 排除不必要的大文件

## 📄 许可证

MIT

---

**版本:** 1.0.0  
**创建时间:** 2026-03-13  
**作者:** KAEL
