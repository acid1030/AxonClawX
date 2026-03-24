# 同步管理工具 (SyncManager) - 使用示例

**作者:** KAEL  
**版本:** 1.0.0  
**功能:** 双向同步 | 冲突解决 | 增量同步

---

## 📦 快速开始

### 基础用法

```typescript
import { SyncManager } from './src/skills/sync-manager-skill';

// 创建同步管理器
const sync = new SyncManager({
  sourcePath: '/path/to/source',
  targetPath: '/path/to/target',
  direction: 'bidirectional', // 双向同步
  conflictResolution: 'newest-wins', // 新者胜
});

// 执行同步
const result = await sync.sync();
console.log('同步完成:', result.stats);
```

---

## 🎯 使用场景示例

### 1️⃣ 单向同步 (源 → 目标)

```typescript
const sync = new SyncManager({
  sourcePath: './local-project',
  targetPath: './backup-folder',
  direction: 'source-to-target', // 仅从源到目标
  conflictResolution: 'source-wins', // 源文件优先
  enableIncremental: true, // 启用增量同步
});

await sync.sync();
```

**适用场景:**
- 备份本地项目到外部硬盘
- 部署代码到服务器
- 单向数据分发

---

### 2️⃣ 双向同步 (多设备同步)

```typescript
const sync = new SyncManager({
  sourcePath: './device-A/docs',
  targetPath: './device-B/docs',
  direction: 'bidirectional', // 双向同步
  conflictResolution: 'newest-wins', // 最新修改优先
  verifyIntegrity: true, // 验证文件完整性 (SHA-256)
});

const result = await sync.sync();

console.log(`
  创建：${result.stats.created}
  更新：${result.stats.updated}
  删除：${result.stats.deleted}
  冲突：${result.stats.conflicts}
`);
```

**适用场景:**
- 笔记本电脑与台式机文件同步
- 多用户协作文件夹
- 跨设备文档同步

---

### 3️⃣ 冲突解决策略

```typescript
// 策略 1: 新者胜 (默认)
const sync1 = new SyncManager({
  sourcePath: './folder-a',
  targetPath: './folder-b',
  conflictResolution: 'newest-wins',
});

// 策略 2: 源文件优先
const sync2 = new SyncManager({
  sourcePath: './folder-a',
  targetPath: './folder-b',
  conflictResolution: 'source-wins',
});

// 策略 3: 目标文件优先
const sync3 = new SyncManager({
  sourcePath: './folder-a',
  targetPath: './folder-b',
  conflictResolution: 'target-wins',
});

// 策略 4: 手动解决 (冲突文件会添加到待处理列表)
const sync4 = new SyncManager({
  sourcePath: './folder-a',
  targetPath: './folder-b',
  conflictResolution: 'manual',
});

const result = await sync4.sync();
const conflicts = sync4.getPendingConflicts();

conflicts.forEach(conflict => {
  console.log(`冲突文件：${conflict.source.path}`);
  console.log(`源修改时间：${new Date(conflict.source.mtime)}`);
  console.log(`目标修改时间：${new Date(conflict.target.mtime)}`);
});

// 策略 5: 自动合并 (仅文本文件)
const sync5 = new SyncManager({
  sourcePath: './folder-a',
  targetPath: './folder-b',
  conflictResolution: 'merge',
});
```

---

### 4️⃣ 增量同步

```typescript
const sync = new SyncManager({
  sourcePath: './large-dataset',
  targetPath: './backup-drive',
  enableIncremental: true, // 启用增量同步
  verifyIntegrity: true, // 使用哈希验证，确保准确性
  excludePatterns: ['*.tmp', '*.log', '.git', 'node_modules', '*.swp'],
});

console.log('开始增量同步...');
const result = await sync.sync();

// 查看同步记录
result.records.forEach(record => {
  console.log(`${record.action.toUpperCase()}: ${record.filePath}`);
});
```

**增量同步特点:**
- 仅同步变更的文件
- 自动记录上次同步时间
- 支持文件哈希验证
- 可配置排除模式

---

### 5️⃣ 排除特定文件

```typescript
const sync = new SyncManager({
  sourcePath: './project',
  targetPath: './backup',
  excludePatterns: [
    '*.tmp',           // 临时文件
    '*.log',           // 日志文件
    '.git',            // Git 目录
    'node_modules',    // NPM 依赖
    '*.swp',           // Vim 交换文件
    '.DS_Store',       // macOS 系统文件
    'Thumbs.db',       // Windows 缩略图
    '*.bak',           // 备份文件
    'dist',            // 构建输出目录
    'coverage',        // 测试覆盖率报告
  ],
});

await sync.sync();
```

---

### 6️⃣ 模拟同步 (Dry Run)

```typescript
const sync = new SyncManager({
  sourcePath: './source',
  targetPath: './target',
  direction: 'bidirectional',
});

// 先模拟同步，查看会发生什么
console.log('🔍 模拟同步...');
const dryRunResult = await sync.dryRun();

console.log('如果执行同步，将会:');
console.log(`  创建 ${dryRunResult.stats.created} 个文件`);
console.log(`  更新 ${dryRunResult.stats.updated} 个文件`);
console.log(`  删除 ${dryRunResult.stats.deleted} 个文件`);
console.log(`  遇到 ${dryRunResult.stats.conflicts} 个冲突`);

// 确认无误后，执行实际同步
console.log('\n✅ 开始实际同步...');
const actualResult = await sync.sync();
```

---

### 7️⃣ 手动解决冲突

```typescript
const sync = new SyncManager({
  sourcePath: './team-a/docs',
  targetPath: './team-b/docs',
  conflictResolution: 'manual', // 手动解决冲突
});

const result = await sync.sync();

// 获取所有待解决的冲突
const pendingConflicts = sync.getPendingConflicts();

if (pendingConflicts.length > 0) {
  console.log(`⚠️  发现 ${pendingConflicts.length} 个冲突需要手动解决:`);
  
  pendingConflicts.forEach((conflict, index) => {
    console.log(`\n[${index + 1}] ${conflict.source.path}`);
    console.log(`    源文件大小：${conflict.source.size} bytes`);
    console.log(`    源文件修改：${new Date(conflict.source.mtime)}`);
    console.log(`    目标文件大小：${conflict.target.size} bytes`);
    console.log(`    目标文件修改：${new Date(conflict.target.mtime)}`);
  });
  
  // 手动解决冲突 (示例：选择源文件)
  // 需要自定义解决逻辑
}
```

---

### 8️⃣ 文件完整性验证

```typescript
const sync = new SyncManager({
  sourcePath: './critical-data',
  targetPath: './secure-backup',
  verifyIntegrity: true, // 启用 SHA-256 哈希验证
  enableIncremental: true,
});

console.log('开始高完整性同步...');
const result = await sync.sync();

// 哈希验证确保文件内容完全一致
// 而不仅仅是修改时间或大小
```

---

### 9️⃣ 同步状态管理

```typescript
const sync = new SyncManager({
  sourcePath: './project',
  targetPath: './backup',
  stateFilePath: '.sync-state.json', // 自定义状态文件路径
});

// 执行同步
await sync.sync();

// 查看当前状态
const state = sync.getState();
console.log('上次同步时间:', new Date(state.lastSyncTime));
console.log('同步记录数:', state.records.length);
console.log('待解决冲突:', state.pendingConflicts.length);

// 清除同步状态 (重新全量同步)
sync.clearState();
console.log('同步状态已清除');
```

---

### 🔟 定时自动同步

```typescript
import { SyncManager } from './src/skills/sync-manager-skill';

const sync = new SyncManager({
  sourcePath: './work-docs',
  targetPath: '/Volumes/ExternalDrive/backup',
  direction: 'source-to-target',
  conflictResolution: 'newest-wins',
  excludePatterns: ['*.tmp', '.git'],
});

// 每小时自动同步
const interval = 60 * 60 * 1000; // 1 小时

console.log('启动自动同步 (每小时一次)...');
setInterval(async () => {
  try {
    console.log(`\n[${new Date().toISOString()}] 开始自动同步...`);
    const result = await sync.sync();
    console.log(`✅ 同步完成：${result.stats.updated} 个文件更新`);
  } catch (error) {
    console.error('❌ 同步失败:', error);
  }
}, interval);
```

---

## 📊 完整示例：团队协作文件夹同步

```typescript
import { SyncManager, ConflictInfo } from './src/skills/sync-manager-skill';
import * as fs from 'fs';
import * as path from 'path';

/**
 * 团队协作同步管理器
 */
class TeamSyncManager {
  private sync: SyncManager;
  private reportPath: string;

  constructor(teamFolder: string, backupFolder: string) {
    this.sync = new SyncManager({
      sourcePath: teamFolder,
      targetPath: backupFolder,
      direction: 'bidirectional',
      conflictResolution: 'manual', // 团队冲突需要手动解决
      enableIncremental: true,
      verifyIntegrity: true,
      excludePatterns: ['*.tmp', '.git', 'node_modules', '.DS_Store'],
      stateFilePath: '.team-sync-state.json',
    });

    this.reportPath = path.join(teamFolder, 'sync-report.md');
  }

  /**
   * 执行同步并生成报告
   */
  async syncAndReport(): Promise<void> {
    console.log('🚀 开始团队文件夹同步...\n');

    const result = await this.sync.sync();
    const conflicts = this.sync.getPendingConflicts();

    // 生成同步报告
    const report = this.generateReport(result, conflicts);
    fs.writeFileSync(this.reportPath, report);

    console.log(`\n📄 同步报告已保存：${this.reportPath}`);

    // 如果有冲突，通知团队成员
    if (conflicts.length > 0) {
      console.log(`\n⚠️  发现 ${conflicts.length} 个冲突，需要团队成员协调解决！`);
      this.notifyConflicts(conflicts);
    }
  }

  /**
   * 生成同步报告
   */
  private generateReport(result: any, conflicts: ConflictInfo[]): string {
    const timestamp = new Date().toISOString();

    return `# 团队同步报告

**同步时间:** ${timestamp}

## 📊 统计

| 操作 | 数量 |
|------|------|
| 创建 | ${result.stats.created} |
| 更新 | ${result.stats.updated} |
| 删除 | ${result.stats.deleted} |
| 跳过 | ${result.stats.skipped} |
| 冲突 | ${result.stats.conflicts} |

## ⚠️ 待解决冲突

${conflicts.length > 0 
  ? conflicts.map(c => `### ${c.source.path}
- **源文件修改:** ${new Date(c.source.mtime).toLocaleString()}
- **目标文件修改:** ${new Date(c.target.mtime).toLocaleString()}
- **解决状态:** ${c.resolved || '待处理'}
`).join('\n')
  : '无冲突 ✅'
}

---
*此报告由 KAEL SyncManager 自动生成*
`;
  }

  /**
   * 通知冲突 (示例：写入通知文件)
   */
  private notifyConflicts(conflicts: ConflictInfo[]): void {
    const noticePath = path.join(
      this.sync.getState().records[0]?.filePath 
        ? path.dirname(this.sync.getState().records[0].filePath)
        : '.',
      'CONFLICTS_NOTICE.md'
    );

    const notice = `# ⚠️  文件冲突通知

发现以下文件存在冲突，需要团队成员协调解决：

${conflicts.map((c, i) => `${i + 1}. **${c.source.path}**`).join('\n')}

请相关负责人尽快确认使用哪个版本。
`;

    fs.writeFileSync(noticePath, notice);
  }
}

// 使用示例
const teamSync = new TeamSyncManager(
  './team-shared-folder',
  '/Volumes/NAS/team-backup'
);

teamSync.syncAndReport().catch(console.error);
```

---

## 🎨 API 参考

### SyncManager 构造函数参数

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `sourcePath` | string | 必填 | 源目录路径 |
| `targetPath` | string | 必填 | 目标目录路径 |
| `direction` | `'source-to-target' \| 'target-to-source' \| 'bidirectional'` | `'bidirectional'` | 同步方向 |
| `conflictResolution` | `'newest-wins' \| 'source-wins' \| 'target-wins' \| 'manual' \| 'merge'` | `'newest-wins'` | 冲突解决策略 |
| `excludePatterns` | string[] | `['*.tmp', '*.log', '.git', 'node_modules']` | 排除的文件模式 |
| `enableIncremental` | boolean | `true` | 是否启用增量同步 |
| `stateFilePath` | string | `'.sync-state.json'` | 状态文件路径 |
| `verifyIntegrity` | boolean | `true` | 是否验证文件完整性 (SHA-256) |

### 方法

| 方法 | 返回值 | 说明 |
|------|--------|------|
| `sync()` | `Promise<SyncState>` | 执行同步 |
| `dryRun()` | `Promise<SyncState>` | 模拟同步 (不实际执行) |
| `getState()` | `SyncState` | 获取同步状态 |
| `getPendingConflicts()` | `ConflictInfo[]` | 获取待解决的冲突 |
| `clearState()` | `void` | 清除同步状态 |

---

## 💡 最佳实践

### 1. 首次同步前先 Dry Run
```typescript
const result = await sync.dryRun();
console.log('将要同步的文件:', result.stats);
// 确认后再执行实际同步
await sync.sync();
```

### 2. 重要数据使用手动解决策略
```typescript
const sync = new SyncManager({
  conflictResolution: 'manual', // 重要数据手动确认
});
```

### 3. 定期清除状态进行全量验证
```typescript
// 每月进行一次全量验证
if (shouldFullVerify()) {
  sync.clearState();
}
await sync.sync();
```

### 4. 排除不必要的文件
```typescript
excludePatterns: [
  '*.tmp', '*.log', '.git', 
  'node_modules', '.DS_Store',
  'dist', 'build', 'coverage'
]
```

### 5. 启用完整性验证
```typescript
verifyIntegrity: true // 使用 SHA-256 确保文件一致
```

---

## 🐛 故障排除

### 问题：同步后文件不一致

**解决方案:**
```typescript
const sync = new SyncManager({
  verifyIntegrity: true, // 启用哈希验证
});
sync.clearState(); // 清除状态
await sync.sync(); // 重新同步
```

### 问题：冲突太多

**解决方案:**
```typescript
const sync = new SyncManager({
  conflictResolution: 'newest-wins', // 自动解决
});
```

### 问题：同步速度慢

**解决方案:**
```typescript
const sync = new SyncManager({
  enableIncremental: true, // 增量同步
  verifyIntegrity: false, // 关闭哈希验证 (仅用时间戳)
  excludePatterns: ['node_modules', '.git'], // 排除大目录
});
```

---

**最后更新:** 2026-03-13  
**维护者:** KAEL - 技术架构首席
