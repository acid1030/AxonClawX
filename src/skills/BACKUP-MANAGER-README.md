# 备份管理工具 - ACE

**版本:** 1.0.0  
**作者:** ACE  
**功能:** 自动备份 | 增量备份 | 备份恢复

---

## 📦 功能特性

### 1. 自动备份
- 支持定时自动执行备份任务
- 可配置备份保留数量
- 自动清理旧备份

### 2. 增量备份
- 智能检测文件变更 (SHA-256 哈希)
- 仅备份变化的文件，节省存储空间
- 自动回退到全量备份 (当无基础备份时)

### 3. 备份恢复
- 支持全量和增量备份恢复
- 文件完整性验证
- 可选择性覆盖现有文件

---

## 🚀 快速开始

### 基础用法

```typescript
import { createBackupManager } from './src/skills/backup-manager-skill';

// 1. 创建备份管理器
const manager = createBackupManager({
  sourcePath: '/path/to/your/project',
  backupDir: '/path/to/backups',
  retainCount: 7,              // 保留 7 个备份
  enableIncremental: true,     // 启用增量备份
  excludePatterns: ['node_modules', '.git', '*.log', 'dist'],
});

// 2. 执行备份
const backup = manager.backup('发布前备份');
console.log(`备份 ID: ${backup.backupId}`);
console.log(`备份类型：${backup.type}`);
console.log(`文件大小：${(backup.totalSize / 1024 / 1024).toFixed(2)} MB`);

// 3. 列出所有备份
const backups = manager.listBackups();
backups.forEach(b => {
  console.log(`${b.backupId} - ${b.type} - ${new Date(b.timestamp).toLocaleString()}`);
});

// 4. 恢复备份
manager.restore('1710345678901', {
  overwrite: true,    // 覆盖现有文件
  verify: true,       // 验证文件完整性
});
```

---

## 📖 API 文档

### BackupManager 类

#### 构造函数

```typescript
new BackupManager(config: Partial<BackupConfig>)
```

**配置参数:**

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `sourcePath` | `string` | `process.cwd()` | 源目录路径 |
| `backupDir` | `string` | `./.backups` | 备份存储目录 |
| `retainCount` | `number` | `7` | 保留的备份数量 |
| `enableIncremental` | `boolean` | `true` | 是否启用增量备份 |
| `excludePatterns` | `string[]` | `['node_modules', ...]` | 排除的文件模式 |

#### 方法

##### `backup(note?: string): BackupMetadata`

执行备份 (自动选择全量或增量)。

**参数:**
- `note` (可选): 备份备注信息

**返回:** `BackupMetadata` 备份元数据

**示例:**
```typescript
const backup = manager.backup('版本发布 v1.2.0');
```

##### `restore(backupId: string, options?: RestoreOptions): void`

恢复指定备份。

**参数:**
- `backupId`: 备份 ID
- `options` (可选): 恢复选项
  - `targetPath`: 恢复目标目录 (默认原路径)
  - `overwrite`: 是否覆盖现有文件 (默认 false)
  - `verify`: 是否验证文件完整性 (默认 true)

**示例:**
```typescript
manager.restore('1710345678901', {
  overwrite: true,
  verify: true
});
```

##### `listBackups(): BackupMetadata[]`

列出所有备份。

**返回:** 按时间排序的备份列表

**示例:**
```typescript
const backups = manager.listBackups();
console.log(`共有 ${backups.length} 个备份`);
```

##### `getStats(): object`

获取备份统计信息。

**返回:**
```typescript
{
  totalBackups: number,      // 总备份数
  totalSize: number,         // 总大小 (字节)
  lastBackup: BackupMetadata | null,
  firstBackup: BackupMetadata | null
}
```

**示例:**
```typescript
const stats = manager.getStats();
console.log(`总备份数：${stats.totalBackups}`);
console.log(`总大小：${(stats.totalSize / 1024 / 1024).toFixed(2)} MB`);
```

---

## 🔧 使用示例

### 示例 1: 项目发布前备份

```typescript
import { createBackupManager } from './src/skills/backup-manager-skill';

const manager = createBackupManager({
  sourcePath: '/Users/nike/projects/my-app',
  backupDir: '/Volumes/Backup/my-app-backups',
  retainCount: 10,
});

// 发布前备份
const backup = manager.backup('Release v2.0.0');
console.log(`✅ 备份完成：${backup.backupId}`);
```

### 示例 2: 定时自动备份

```typescript
import { createBackupManager } from './src/skills/backup-manager-skill';

const manager = createBackupManager({
  sourcePath: '/path/to/project',
  backupDir: '/path/to/backups',
  retainCount: 7,
});

// 每天凌晨 2 点备份
const cron = require('node-cron');
cron.schedule('0 2 * * *', () => {
  console.log('🕐 执行定时备份...');
  const backup = manager.backup('自动备份');
  console.log(`✅ 备份完成：${backup.backupId}`);
});
```

### 示例 3: 恢复误删的文件

```typescript
import { createBackupManager } from './src/skills/backup-manager-skill';

const manager = createBackupManager({
  sourcePath: '/path/to/project',
});

// 列出备份
const backups = manager.listBackups();
console.log('可用备份:');
backups.forEach(b => {
  console.log(`  ${b.backupId} - ${new Date(b.timestamp).toLocaleString()}`);
});

// 恢复特定备份
const targetBackupId = '1710345678901';
console.log(`🔄 恢复备份：${targetBackupId}`);
manager.restore(targetBackupId, {
  overwrite: false,  // 不覆盖现有文件
  verify: true,
});
```

### 示例 4: 备份统计报告

```typescript
import { createBackupManager } from './src/skills/backup-manager-skill';

const manager = createBackupManager({
  sourcePath: '/path/to/project',
});

const stats = manager.getStats();

console.log('📊 备份统计报告');
console.log('================');
console.log(`总备份数：${stats.totalBackups}`);
console.log(`总大小：${(stats.totalSize / 1024 / 1024).toFixed(2)} MB`);
console.log(`首次备份：${stats.firstBackup ? new Date(stats.firstBackup.timestamp).toLocaleString() : '无'}`);
console.log(`最后备份：${stats.lastBackup ? new Date(stats.lastBackup.timestamp).toLocaleString() : '无'}`);
```

---

## 🧪 运行示例

```bash
# 直接运行示例
cd /Users/nike/.openclaw/workspace
npx ts-node src/skills/backup-manager-skill.ts
```

输出示例:
```
=== 备份管理工具 - ACE ===

1️⃣ 创建备份管理器:
   源目录：/Users/nike/.openclaw/workspace
   备份目录：.backups

2️⃣ 执行备份:
   备份 ID: 1710345678901
   类型：full
   文件数：1234
   大小：45.67 MB

3️⃣ 列出备份:
   - 1710345678901 (full) - 2026-03-13 20:09:00

4️⃣ 备份统计:
   总备份数：1
   总大小：45.67 MB
   最后备份：2026-03-13 20:09:00

5️⃣ 恢复备份 (示例代码):
   // 恢复指定备份
   manager.restore(backupId, {
     overwrite: true,
     verify: true
   });

✅ 所有示例完成!
```

---

## ⚙️ 高级配置

### 排除文件模式

支持两种排除模式:

```typescript
const manager = createBackupManager({
  sourcePath: '/path/to/project',
  excludePatterns: [
    'node_modules',      // 排除目录
    '.git',              // 排除目录
    '*.log',             // 通配符匹配
    'dist',              // 排除目录
    '*.tmp',             // 通配符匹配
  ],
});
```

### 自定义备份目录结构

备份目录结构:
```
.backups/
├── backup-1710345678901/    # 备份数据
│   ├── file1.txt
│   ├── subdir/
│   │   └── file2.txt
│   └── delta/               # 增量备份专用
│       └── changed-file.txt
├── manifest-1710345678901.json  # 备份清单
└── last-manifest.json           # 最新清单
```

---

## 🛡️ 安全特性

### 文件完整性验证
- 使用 SHA-256 哈希算法
- 备份时计算文件哈希
- 恢复时验证文件完整性

### 增量备份优化
- 智能检测文件变更
- 仅备份变化的文件
- 节省存储空间和时间

### 自动清理
- 保留指定数量的备份
- 自动删除旧备份
- 防止磁盘空间耗尽

---

## 📝 注意事项

1. **首次备份**: 首次备份始终为全量备份
2. **增量备份**: 需要基础全量备份才能执行
3. **恢复顺序**: 增量备份恢复会自动先恢复基础备份
4. **文件锁定**: 确保备份时文件未被占用
5. **磁盘空间**: 确保备份目录有足够空间

---

## 🐛 故障排除

### 问题 1: 备份失败

**原因:** 源目录不存在或无权限

**解决:**
```typescript
// 检查目录是否存在
const fs = require('fs');
if (!fs.existsSync(sourcePath)) {
  console.error('源目录不存在');
}
```

### 问题 2: 恢复失败

**原因:** 备份 ID 不存在

**解决:**
```typescript
// 先列出可用备份
const backups = manager.listBackups();
console.log('可用备份:', backups.map(b => b.backupId));
```

### 问题 3: 增量备份未执行

**原因:** 无基础全量备份

**解决:** 手动执行一次全量备份
```typescript
// 强制全量备份
const manager = new BackupManager({
  sourcePath: '/path/to/source',
  enableIncremental: false,  // 禁用增量
});
manager.backup();
```

---

## 📄 许可证

MIT License

---

**创建时间:** 2026-03-13  
**最后更新:** 2026-03-13
