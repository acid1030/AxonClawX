# ZIP Lite Skill - 使用示例

## 安装依赖

```bash
npm install archiver yauzl
# 或
yarn add archiver yauzl
```

## 基础用法

### 1. 压缩单个文件

```typescript
import { compress } from './src/skills/zip-lite-skill';

async function example() {
  const result = await compress('./documents/report.pdf', {
    outputPath: './archives/report.zip',
    overwrite: true,
    level: 6  // 压缩级别 0-9
  });
  
  console.log(`压缩完成: ${result.outputPath}`);
  console.log(`文件大小: ${result.size} bytes`);
  console.log(`文件数量: ${result.filesCount}`);
}
```

### 2. 压缩整个目录

```typescript
import { compress } from './src/skills/zip-lite-skill';

async function example() {
  const result = await compress('./projects/my-app', {
    outputPath: './backups/my-app-backup.zip',
    overwrite: true,
    exclude: ['node_modules', '.git', '*.log']  // 排除的文件/目录
  });
  
  console.log(`目录压缩完成: ${result.filesCount} 个文件`);
}
```

### 3. 解压 ZIP 文件

```typescript
import { decompress } from './src/skills/zip-lite-skill';

async function example() {
  const result = await decompress('./archives/report.zip', {
    outputDir: './extracted',
    overwrite: false  // 不覆盖已存在的文件
  });
  
  console.log(`解压完成: ${result.filesExtracted} 个文件`);
  console.log(`输出目录: ${result.outputDir}`);
}
```

### 4. 批量压缩多个文件

```typescript
import { compressBatch } from './src/skills/zip-lite-skill';

async function example() {
  const files = [
    './docs/readme.md',
    './docs/api.md',
    './docs/guide.md'
  ];
  
  const result = await compressBatch(files, {
    outputPath: './archives/docs-bundle.zip',
    overwrite: true,
    level: 9  // 最高压缩级别
  });
  
  console.log(`批量压缩完成: ${result.filesCount} 个文件`);
}
```

## 实际场景

### 场景 1: 项目备份

```typescript
import { compress } from './src/skills/zip-lite-skill';
import * as path from 'path';

async function backupProject(projectDir: string) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const projectName = path.basename(projectDir);
  const outputPath = `./backups/${projectName}-${timestamp}.zip`;
  
  try {
    const result = await compress(projectDir, {
      outputPath,
      overwrite: true,
      exclude: [
        'node_modules',
        '.git',
        'dist',
        'build',
        '*.log',
        '.env'
      ]
    });
    
    console.log(`✓ 项目备份完成: ${outputPath}`);
    console.log(`  大小：${(result.size / 1024 / 1024).toFixed(2)} MB`);
    console.log(`  文件数：${result.filesCount}`);
    
    return result;
  } catch (error) {
    console.error('✗ 备份失败:', error);
    throw error;
  }
}
```

### 场景 2: 下载资源解压

```typescript
import { decompress } from './src/skills/zip-lite-skill';
import * as fs from 'fs';

async function downloadAndExtract(zipUrl: string, extractDir: string) {
  // 1. 下载 ZIP 文件 (使用 fetch 或 axios)
  const zipPath = './downloads/temp.zip';
  // ... 下载逻辑 ...
  
  try {
    // 2. 解压
    const result = await decompress(zipPath, {
      outputDir: extractDir,
      overwrite: true
    });
    
    console.log(`✓ 资源解压完成`);
    console.log(`  文件数：${result.filesExtracted}`);
    console.log(`  目录：${result.outputDir}`);
    
    // 3. 清理临时文件
    fs.unlinkSync(zipPath);
    
    return result;
  } catch (error) {
    console.error('✗ 解压失败:', error);
    throw error;
  }
}
```

### 场景 3: 日志归档

```typescript
import { compress } from './src/skills/zip-lite-skill';
import * as fs from 'fs';

async function archiveLogs(logsDir: string, daysToKeep: number = 30) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
  
  // 查找旧日志文件
  const oldLogs = fs.readdirSync(logsDir)
    .filter(file => {
      const filePath = path.join(logsDir, file);
      const stats = fs.statSync(filePath);
      return stats.isFile() && 
             file.endsWith('.log') && 
             stats.mtime < cutoffDate;
    });
  
  if (oldLogs.length === 0) {
    console.log('没有需要归档的日志文件');
    return;
  }
  
  // 压缩旧日志
  const timestamp = new Date().toISOString().split('T')[0];
  const archivePath = `./archives/logs-${timestamp}.zip`;
  
  const result = await compressBatch(
    oldLogs.map(file => path.join(logsDir, file)),
    {
      outputPath: archivePath,
      overwrite: true,
      level: 9  // 高压缩比
    }
  );
  
  console.log(`✓ 日志归档完成: ${archivePath}`);
  console.log(`  归档文件：${result.filesCount} 个`);
  console.log(`  压缩后大小：${(result.size / 1024).toFixed(2)} KB`);
  
  // 可选：删除原始日志文件
  // oldLogs.forEach(file => fs.unlinkSync(path.join(logsDir, file)));
}
```

## API 参考

### compress(inputPath, options)

压缩单个文件或目录。

**参数:**
- `inputPath` (string): 要压缩的文件或目录路径
- `options` (CompressionOptions):
  - `outputPath` (string): 输出 ZIP 文件路径 **(必填)**
  - `overwrite` (boolean): 是否覆盖已存在的文件 (默认: false)
  - `level` (number): 压缩级别 0-9 (默认: 6)
  - `exclude` (string[]): 排除的文件/目录模式

**返回:** `Promise<CompressionResult>`
- `outputPath` (string): 输出文件路径
- `size` (number): 压缩后文件大小 (bytes)
- `filesCount` (number): 处理的文件数量

---

### decompress(zipPath, options)

解压 ZIP 文件。

**参数:**
- `zipPath` (string): ZIP 文件路径
- `options` (ExtractionOptions):
  - `outputDir` (string): 解压目标目录 **(必填)**
  - `overwrite` (boolean): 是否覆盖已存在的文件 (默认: false)

**返回:** `Promise<ExtractionResult>`
- `filesExtracted` (number): 解压的文件数量
- `outputDir` (string): 解压目录路径

---

### compressBatch(inputPaths, options)

批量压缩多个文件。

**参数:**
- `inputPaths` (string[]): 要压缩的文件路径数组
- `options`: 同 `compress` 的 options

**返回:** `Promise<CompressionResult>`

---

## 错误处理

```typescript
import { compress, decompress } from './src/skills/zip-lite-skill';

async function safeCompress(inputPath: string, outputPath: string) {
  try {
    const result = await compress(inputPath, {
      outputPath,
      overwrite: true
    });
    return result;
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.error('输入文件不存在');
    } else if (error.code === 'EACCES') {
      console.error('权限不足');
    } else if (error.message.includes('已存在')) {
      console.error('输出文件已存在，请设置 overwrite: true');
    } else {
      console.error('压缩失败:', error.message);
    }
    throw error;
  }
}
```

## 性能提示

1. **压缩级别选择:**
   - `level: 0` - 仅存储，无压缩 (最快)
   - `level: 1-3` - 快速压缩
   - `level: 4-6` - 平衡 (推荐)
   - `level: 7-9` - 最大压缩 (最慢)

2. **大文件处理:**
   - 使用流式处理，不会一次性加载到内存
   - 对于 GB 级文件，建议监控进度

3. **排除不必要的文件:**
   ```typescript
   exclude: ['node_modules', '.git', 'dist', '*.log']
   ```
   可以显著减小 ZIP 文件大小和提高速度

---

**版本:** 1.0.0  
**作者:** Axon  
**许可证:** MIT
