# ZIP Processor Skill - 使用示例

**版本:** 1.0.0  
**作者:** Axon  
**功能:** ZIP 压缩与解压、流式处理、进度追踪

---

## 📦 快速开始

### 基础压缩

```typescript
import { zip, unzip, zipInfo } from './zip-processor-skill';

// 压缩单个文件
const result = await zip('document.pdf', 'document.zip', {
  overwrite: true,
});

console.log(`压缩完成: ${result.filesCompressed} 个文件`);
console.log(`压缩比: ${result.compressionRatio.toFixed(2)}x`);
```

### 压缩目录

```typescript
// 压缩整个目录
const result = await zip('./src', './src-backup.zip', {
  overwrite: true,
  exclude: ['node_modules', '.git', '*.log'],
  onProgress: (progress) => {
    console.log(`进度：${progress.percentage.toFixed(1)}% (${progress.filesProcessed}/${progress.totalFiles})`);
  },
});

console.log(`原始大小：${(result.originalSize / 1024 / 1024).toFixed(2)} MB`);
console.log(`压缩后：${(result.compressedSize / 1024 / 1024).toFixed(2)} MB`);
```

### 解压文件

```typescript
// 解压到指定目录
const result = await unzip('./archive.zip', './extracted', {
  overwrite: true,
  createParentDirs: true,
  onProgress: (progress) => {
    console.log(`解压：${progress.currentFile} (${progress.percentage.toFixed(1)}%)`);
  },
});

console.log(`解压完成：${result.filesExtracted} 个文件，${result.directoriesCreated} 个目录`);
```

---

## 🔧 高级用法

### 1. 使用类实例 (更多控制)

```typescript
import ZipProcessor from './zip-processor-skill';

const processor = new ZipProcessor({
  compressionLevel: 9,        // 最大压缩
  recursive: true,            // 递归处理子目录
  maxFileSizeMB: 512,         // 最大文件大小
  preservePaths: true,        // 保留目录结构
});

// 压缩多个路径
const result = await processor.compress(
  ['./src', './config', './README.md'],
  {
    outputPath: './backup.zip',
    overwrite: true,
    exclude: ['*.test.ts', 'coverage/'],
    onProgress: (progress) => {
      console.log(`📦 ${progress.currentFile}`);
      console.log(`   ${progress.percentage.toFixed(1)}% 完成`);
    },
  }
);

if (result.success) {
  console.log(`✅ 压缩成功`);
  console.log(`   文件数：${result.filesCompressed}`);
  console.log(`   压缩比：${result.compressionRatio.toFixed(2)}x`);
  console.log(`   耗时：${result.durationMs}ms`);
} else {
  console.error(`❌ 压缩失败：${result.error}`);
}
```

### 2. 查看 ZIP 信息

```typescript
import { zipInfo } from './zip-processor-skill';

const info = await zipInfo('./archive.zip');

console.log(`ZIP 文件：${info.path}`);
console.log(`文件大小：${(info.size / 1024).toFixed(2)} KB`);
console.log(`条目数量：${info.entryCount}`);
console.log(`是否加密：${info.isEncrypted}`);
console.log(`\n文件列表:`);

info.entries.forEach((entry, index) => {
  console.log(`  ${index + 1}. ${entry.name}`);
  console.log(`     大小：${(entry.size / 1024).toFixed(2)} KB`);
  console.log(`     压缩比：${entry.compressionRatio.toFixed(2)}x`);
  console.log(`     类型：${entry.isDirectory ? '目录' : '文件'}`);
});
```

### 3. 流式处理 (大文件)

```typescript
import { zipStream, unzipStream } from './zip-processor-skill';

// 流式压缩 (适合大文件，减少内存占用)
const result = await zipStream(
  './large-dataset',
  './dataset.zip',
  {
    overwrite: true,
    onProgress: (progress) => {
      const mbCompressed = (progress.bytesCompressed / 1024 / 1024).toFixed(2);
      const mbTotal = (progress.totalBytes / 1024 / 1024).toFixed(2);
      console.log(`📊 ${mbCompressed}/${mbTotal} MB (${progress.percentage.toFixed(1)}%)`);
    },
  }
);

// 流式解压
const extractResult = await unzipStream(
  './dataset.zip',
  './restored-data',
  {
    overwrite: true,
    onProgress: (progress) => {
      console.log(`📥 ${progress.currentFile}`);
    },
  }
);
```

### 4. 选择性压缩 (Include/Exclude)

```typescript
import { zip } from './zip-processor-skill';

// 仅压缩 TypeScript 文件
const tsOnly = await zip('./src', './typescript-files.zip', {
  overwrite: true,
  include: ['*.ts', '*.tsx'],
  exclude: ['*.test.ts', '*.spec.ts'],
});

// 排除特定目录和文件
const excludeExample = await zip('./project', './project-clean.zip', {
  overwrite: true,
  exclude: [
    'node_modules',
    '.git',
    'dist',
    'build',
    '*.log',
    '.env',
    'coverage',
  ],
});

console.log(`压缩了 ${tsOnly.filesCompressed} 个 TypeScript 文件`);
```

### 5. 进度追踪与事件监听

```typescript
import ZipProcessor from './zip-processor-skill';

const processor = new ZipProcessor({ compressionLevel: 6 });

// 监听进度事件
processor.on('progress', (data) => {
  console.log(`📈 进度更新：${data.type} - ${data.message}`);
});

// 压缩并追踪进度
const result = await processor.compress('./src', {
  outputPath: './src.zip',
  overwrite: true,
  onProgress: (progress) => {
    // 实时进度条
    const barLength = 40;
    const filledLength = Math.round((barLength * progress.percentage) / 100);
    const bar = '█'.repeat(filledLength) + '░'.repeat(barLength - filledLength);
    console.log(`\r[${bar}] ${progress.percentage.toFixed(1)}%`);
  },
});
```

### 6. 错误处理

```typescript
import { zip, unzip } from './zip-processor-skill';

try {
  const result = await zip('./nonexistent', './output.zip', {
    overwrite: true,
  });

  if (!result.success) {
    console.error(`操作失败：${result.error}`);
    if (result.warnings.length > 0) {
      console.warn(`警告：${result.warnings.join(', ')}`);
    }
  } else {
    console.log('✅ 操作成功');
  }
} catch (error) {
  console.error(`异常：${error instanceof Error ? error.message : error}`);
}
```

### 7. 批量操作

```typescript
import { zip, unzip } from './zip-processor-skill';
import * as fs from 'fs';
import * as path from 'path';

// 批量压缩多个目录
const directories = ['src', 'tests', 'docs'];
const results = await Promise.all(
  directories.map(async (dir) => {
    return zip(`./${dir}`, `./${dir}.zip`, {
      overwrite: true,
    });
  })
);

results.forEach((result, index) => {
  console.log(`${directories[index]}: ${result.filesCompressed} 个文件, 压缩比 ${result.compressionRatio.toFixed(2)}x`);
});

// 批量解压
const zipFiles = fs.readdirSync('.').filter(f => f.endsWith('.zip'));
for (const zipFile of zipFiles) {
  const outputDir = path.basename(zipFile, '.zip');
  const result = await unzip(zipFile, `./extracted/${outputDir}`, {
    overwrite: true,
  });
  console.log(`${zipFile}: ${result.filesExtracted} 个文件`);
}
```

---

## 📊 实际应用场景

### 场景 1: 自动备份

```typescript
import { zip } from './zip-processor-skill';
import * as fs from 'fs';

async function createBackup(sourceDir: string, backupDir: string) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupName = `backup-${timestamp}.zip`;
  const backupPath = path.join(backupDir, backupName);

  console.log(`🔄 开始备份：${sourceDir}`);

  const result = await zip(sourceDir, backupPath, {
    overwrite: true,
    exclude: ['node_modules', '.git', 'dist', '*.log'],
    onProgress: (progress) => {
      console.log(`   ${progress.filesProcessed}/${progress.totalFiles} 文件`);
    },
  });

  if (result.success) {
    console.log(`✅ 备份完成：${backupPath}`);
    console.log(`   大小：${(result.compressedSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   压缩比：${result.compressionRatio.toFixed(2)}x`);
  } else {
    console.error(`❌ 备份失败：${result.error}`);
  }

  return result;
}

// 使用
createBackup('./project', './backups');
```

### 场景 2: 文件分发

```typescript
import { zip, zipInfo } from './zip-processor-skill';

async function prepareDistribution(releaseDir: string, version: string) {
  const outputPath = `./releases/release-${version}.zip`;

  console.log(`📦 准备发布包 v${version}`);

  const result = await zip(releaseDir, outputPath, {
    overwrite: true,
    include: ['dist/**', 'README.md', 'LICENSE'],
    exclude: ['*.map', '*.test.*'],
  });

  if (result.success) {
    const info = await zipInfo(outputPath);
    console.log(`✅ 发布包准备完成`);
    console.log(`   文件数：${info.entryCount}`);
    console.log(`   大小：${(info.size / 1024 / 1024).toFixed(2)} MB`);
  }

  return result;
}
```

### 场景 3: 数据迁移

```typescript
import { zip, unzip } from './zip-processor-skill';

async function migrateData(sourcePath: string, targetPath: string) {
  const tempZip = './temp-migration.zip';

  console.log(`🚀 开始数据迁移：${sourcePath} → ${targetPath}`);

  // 压缩
  console.log(`📦 压缩源数据...`);
  const compressResult = await zip(sourcePath, tempZip, {
    overwrite: true,
    onProgress: (progress) => {
      process.stdout.write(`\r   压缩进度：${progress.percentage.toFixed(1)}%`);
    },
  });

  if (!compressResult.success) {
    throw new Error(`压缩失败：${compressResult.error}`);
  }

  // 解压
  console.log(`\n📥 解压到目标位置...`);
  const extractResult = await unzip(tempZip, targetPath, {
    overwrite: true,
    onProgress: (progress) => {
      process.stdout.write(`\r   解压进度：${progress.percentage.toFixed(1)}%`);
    },
  });

  // 清理临时文件
  fs.unlinkSync(tempZip);

  if (!extractResult.success) {
    throw new Error(`解压失败：${extractResult.error}`);
  }

  console.log(`\n✅ 迁移完成`);
  console.log(`   文件数：${extractResult.filesExtracted}`);
  console.log(`   耗时：${(compressResult.durationMs + extractResult.durationMs) / 1000}s`);
}
```

---

## ⚙️ 配置选项

### ZipProcessorConfig

```typescript
interface ZipProcessorConfig {
  /** 压缩级别 (0-9, 默认 6) */
  compressionLevel: number;
  /** 是否递归处理子目录 */
  recursive: boolean;
  /** 最大文件大小 (MB) */
  maxFileSizeMB: number;
  /** 临时目录路径 */
  tempDir?: string;
  /** 是否保留目录结构 */
  preservePaths: boolean;
  /** 加密密码 (可选) */
  password?: string;
}
```

### CompressionOptions

```typescript
interface CompressionOptions {
  /** 输出 ZIP 文件路径 */
  outputPath: string;
  /** 是否覆盖已存在的文件 */
  overwrite?: boolean;
  /** 压缩级别 (覆盖配置) */
  level?: number;
  /** 排除的文件/目录模式 */
  exclude?: string[];
  /** 仅包含的文件模式 */
  include?: string[];
  /** 进度回调 */
  onProgress?: (progress: CompressionProgress) => void;
}
```

### ExtractionOptions

```typescript
interface ExtractionOptions {
  /** 解压目标目录 */
  outputDir: string;
  /** 是否覆盖已存在的文件 */
  overwrite?: boolean;
  /** 创建父目录 */
  createParentDirs?: boolean;
  /** 保留文件权限 */
  preservePermissions?: boolean;
  /** 解压密码 (如果 ZIP 加密) */
  password?: string;
  /** 进度回调 */
  onProgress?: (progress: ExtractionProgress) => void;
}
```

---

## 🎯 性能优化建议

### 1. 选择合适的压缩级别

```typescript
// 快速压缩 (适合临时文件)
await zip('./temp', './temp.zip', { level: 1 });

// 平衡压缩 (默认推荐)
await zip('./project', './project.zip', { level: 6 });

// 最大压缩 (适合归档)
await zip('./archive', './archive.zip', { level: 9 });
```

### 2. 排除不必要的文件

```typescript
// 排除大型依赖和构建产物
await zip('./project', './source-only.zip', {
  exclude: [
    'node_modules',
    'dist',
    'build',
    '.git',
    '*.log',
    'coverage',
    '.DS_Store',
  ],
});
```

### 3. 使用流式处理大文件

```typescript
// 对于 >100MB 的文件，使用流式处理
await zipStream('./large-dataset', './dataset.zip', {
  onProgress: (progress) => {
    console.log(`${progress.percentage.toFixed(1)}%`);
  },
});
```

---

## 📝 注意事项

1. **内存使用**: 压缩大文件时，考虑使用 `zipStream` 而非 `zip`
2. **路径安全**: 解压时注意路径遍历攻击，生产环境应验证解压路径
3. **文件权限**: Windows 和 Unix 系统的文件权限处理方式不同
4. **字符编码**: 确保文件名使用 UTF-8 编码以避免乱码
5. **并发限制**: 批量操作时注意系统资源，避免同时处理过多文件

---

## 🐛 常见问题

### Q: 如何处理加密的 ZIP 文件？

A: 当前版本支持基础加密，传入 password 参数：

```typescript
const processor = new ZipProcessor({ password: 'secret123' });
await processor.extract('./encrypted.zip', './output', {
  password: 'secret123',
});
```

### Q: 如何保留符号链接？

A: 当前版本会将符号链接解析为实际文件，如需保留符号链接，需要在 `collectDirectoryFiles` 中特殊处理。

### Q: 压缩速度太慢怎么办？

A: 降低压缩级别：

```typescript
await zip('./data', './data.zip', { level: 1 }); // 最快
```

---

**最后更新:** 2026-03-13  
**维护者:** Axon
