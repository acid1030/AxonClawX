# 🗜️ ZIP Processor Skill

**高性能 ZIP 压缩与解压处理技能**

---

## 📋 快速概览

| 特性 | 描述 |
|------|------|
| **版本** | 1.0.0 |
| **作者** | Axon |
| **依赖** | Node.js 原生模块 (fs, zlib, path) |
| **压缩算法** | DEFLATE (zlib) |
| **支持格式** | ZIP (.zip) |
| **流式处理** | ✅ 支持 |
| **进度追踪** | ✅ 支持 |
| **加密支持** | ⚠️ 基础支持 |

---

## 🚀 核心功能

### 1. 文件/目录压缩
- ✅ 单文件压缩
- ✅ 多文件批量压缩
- ✅ 整目录递归压缩
- ✅ 自定义压缩级别 (0-9)
- ✅ 文件过滤 (include/exclude)

### 2. ZIP 解压
- ✅ 完整 ZIP 解压
- ✅ 保留目录结构
- ✅ 选择性解压
- ✅ 覆盖控制
- ✅ 自动创建父目录

### 3. 流式处理
- ✅ 低内存占用
- ✅ 大文件支持
- ✅ 实时进度回调
- ✅ 事件驱动

### 4. ZIP 信息查询
- ✅ 文件列表
- ✅ 压缩比分析
- ✅ 元数据读取
- ✅ 加密检测

---

## 📦 安装

无需额外依赖，使用 Node.js 原生模块：

```bash
# 无需安装，直接使用
import { zip, unzip, zipInfo } from './zip-processor-skill';
```

---

## 💡 使用示例

### 基础压缩

```typescript
import { zip } from './zip-processor-skill';

const result = await zip('./src', './backup.zip', {
  overwrite: true,
  exclude: ['node_modules', '*.log'],
});

console.log(`压缩完成：${result.filesCompressed} 个文件`);
```

### 基础解压

```typescript
import { unzip } from './zip-processor-skill';

const result = await unzip('./archive.zip', './extracted', {
  overwrite: true,
});

console.log(`解压完成：${result.filesExtracted} 个文件`);
```

### 进度追踪

```typescript
import { zip } from './zip-processor-skill';

await zip('./data', './data.zip', {
  overwrite: true,
  onProgress: (progress) => {
    console.log(`${progress.percentage.toFixed(1)}% - ${progress.currentFile}`);
  },
});
```

### 查看 ZIP 信息

```typescript
import { zipInfo } from './zip-processor-skill';

const info = await zipInfo('./archive.zip');
console.log(`文件数：${info.entryCount}`);
console.log(`大小：${(info.size / 1024).toFixed(2)} KB`);

info.entries.forEach(entry => {
  console.log(`  - ${entry.name} (${(entry.size / 1024).toFixed(2)} KB)`);
});
```

---

## 📚 API 文档

### 便捷函数

#### `zip(inputPaths, outputPath, options)`

压缩文件或目录。

**参数:**
- `inputPaths`: `string | string[]` - 输入文件/目录路径
- `outputPath`: `string` - 输出 ZIP 文件路径
- `options`: `CompressionOptions` - 压缩选项

**返回:** `Promise<BatchCompressionResult>`

**示例:**
```typescript
const result = await zip('./src', './src.zip', {
  overwrite: true,
  level: 6,
  exclude: ['*.test.ts'],
  onProgress: (progress) => console.log(progress.percentage),
});
```

---

#### `unzip(zipPath, outputDir, options)`

解压 ZIP 文件。

**参数:**
- `zipPath`: `string` - ZIP 文件路径
- `outputDir`: `string` - 输出目录
- `options`: `ExtractionOptions` - 解压选项

**返回:** `Promise<BatchExtractionResult>`

**示例:**
```typescript
const result = await unzip('./archive.zip', './output', {
  overwrite: true,
  createParentDirs: true,
});
```

---

#### `zipInfo(zipPath)`

获取 ZIP 文件信息。

**参数:**
- `zipPath`: `string` - ZIP 文件路径

**返回:** `Promise<ZipInfo>`

**示例:**
```typescript
const info = await zipInfo('./archive.zip');
console.log(info.entries);
```

---

#### `zipStream(inputPaths, outputPath, options)`

流式压缩 (适合大文件)。

**参数:**
- `inputPaths`: `string | string[]` - 输入文件/目录路径
- `outputPath`: `string` - 输出 ZIP 文件路径
- `options`: `CompressionOptions` - 压缩选项

**返回:** `Promise<BatchCompressionResult>`

---

#### `unzipStream(zipPath, outputDir, options)`

流式解压 (适合大文件)。

**参数:**
- `zipPath`: `string` - ZIP 文件路径
- `outputDir`: `string` - 输出目录
- `options`: `ExtractionOptions` - 解压选项

**返回:** `Promise<BatchExtractionResult>`

---

### ZipProcessor 类

完整控制的类接口：

```typescript
import ZipProcessor from './zip-processor-skill';

const processor = new ZipProcessor({
  compressionLevel: 6,
  recursive: true,
  maxFileSizeMB: 1024,
  preservePaths: true,
});

// 压缩
const compressResult = await processor.compress('./src', {
  outputPath: './src.zip',
  overwrite: true,
});

// 解压
const extractResult = await processor.extract('./src.zip', {
  outputDir: './restored',
  overwrite: true,
});

// 获取信息
const info = await processor.getZipInfo('./src.zip');
```

---

## ⚙️ 配置选项

### ZipProcessorConfig

```typescript
interface ZipProcessorConfig {
  /** 压缩级别 (0-9, 默认 6) */
  compressionLevel: number;
  
  /** 是否递归处理子目录 (默认 true) */
  recursive: boolean;
  
  /** 最大文件大小 MB (默认 1024) */
  maxFileSizeMB: number;
  
  /** 临时目录路径 (可选) */
  tempDir?: string;
  
  /** 是否保留目录结构 (默认 true) */
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
  
  /** 是否覆盖已存在的文件 (默认 false) */
  overwrite?: boolean;
  
  /** 压缩级别 0-9 (可选，覆盖配置) */
  level?: number;
  
  /** 排除的文件模式 (可选) */
  exclude?: string[];
  
  /** 仅包含的文件模式 (可选) */
  include?: string[];
  
  /** 进度回调 (可选) */
  onProgress?: (progress: CompressionProgress) => void;
}
```

### ExtractionOptions

```typescript
interface ExtractionOptions {
  /** 解压目标目录 */
  outputDir: string;
  
  /** 是否覆盖已存在的文件 (默认 false) */
  overwrite?: boolean;
  
  /** 创建父目录 (默认 true) */
  createParentDirs?: boolean;
  
  /** 保留文件权限 (默认 false) */
  preservePermissions?: boolean;
  
  /** 解压密码 (如果 ZIP 加密) */
  password?: string;
  
  /** 进度回调 (可选) */
  onProgress?: (progress: ExtractionProgress) => void;
}
```

---

## 📊 返回类型

### BatchCompressionResult

```typescript
interface BatchCompressionResult {
  success: boolean;           // 是否成功
  outputPath: string;         // 输出 ZIP 路径
  filesCompressed: number;    // 压缩的文件数
  originalSize: number;       // 原始总大小 (字节)
  compressedSize: number;     // 压缩后大小 (字节)
  compressionRatio: number;   // 压缩比
  durationMs: number;         // 处理时间 (毫秒)
  error?: string;             // 错误信息
  warnings: string[];         // 警告列表
}
```

### BatchExtractionResult

```typescript
interface BatchExtractionResult {
  success: boolean;           // 是否成功
  outputDir: string;          // 解压目录
  filesExtracted: number;     // 解压的文件数
  directoriesCreated: number; // 创建的目录数
  extractedSize: number;      // 解压总大小 (字节)
  durationMs: number;         // 处理时间 (毫秒)
  error?: string;             // 错误信息
  warnings: string[];         // 警告列表
}
```

### ZipInfo

```typescript
interface ZipInfo {
  path: string;              // ZIP 文件路径
  size: number;              // ZIP 文件大小
  entryCount: number;        // 条目总数
  entries: ZipEntry[];       // 所有条目
  isEncrypted: boolean;      // 是否加密
  comment?: string;          // 注释
  createdAt: Date;           // 创建时间
  modifiedAt: Date;          // 修改时间
}
```

---

## 🎯 实际应用场景

### 1. 自动备份系统

```typescript
import { zip } from './zip-processor-skill';
import * as fs from 'fs';

async function dailyBackup() {
  const timestamp = new Date().toISOString().split('T')[0];
  const result = await zip('./project', `./backups/backup-${timestamp}.zip`, {
    overwrite: true,
    exclude: ['node_modules', 'dist', '.git', '*.log'],
  });
  
  if (result.success) {
    console.log(`✅ 备份完成：${(result.compressedSize / 1024 / 1024).toFixed(2)} MB`);
  }
}
```

### 2. 文件分发打包

```typescript
import { zip, zipInfo } from './zip-processor-skill';

async function createRelease(version: string) {
  const result = await zip('./dist', `./releases/v${version}.zip`, {
    overwrite: true,
    include: ['**/*'],
    exclude: ['*.map', '*.test.*'],
  });
  
  const info = await zipInfo(`./releases/v${version}.zip`);
  console.log(`发布包：${info.entryCount} 个文件，${(info.size / 1024).toFixed(2)} KB`);
}
```

### 3. 数据迁移工具

```typescript
import { zip, unzip } from './zip-processor-skill';

async function migrateData(source: string, target: string) {
  const tempZip = './temp-migration.zip';
  
  // 压缩
  await zip(source, tempZip, { overwrite: true });
  
  // 解压到新位置
  await unzip(tempZip, target, { overwrite: true });
  
  // 清理
  fs.unlinkSync(tempZip);
}
```

---

## ⚡ 性能优化

### 压缩级别选择

| 级别 | 速度 | 压缩比 | 适用场景 |
|------|------|--------|----------|
| 0-1  | 最快 | 最低   | 临时文件、快速传输 |
| 3-5  | 快   | 中等   | 日常使用 |
| 6    | 中等 | 较高   | **默认推荐** |
| 7-9  | 慢   | 最高   | 归档、长期存储 |

```typescript
// 快速压缩
await zip('./temp', './temp.zip', { level: 1 });

// 平衡压缩 (推荐)
await zip('./project', './project.zip', { level: 6 });

// 最大压缩
await zip('./archive', './archive.zip', { level: 9 });
```

### 文件过滤

```typescript
// 排除大型依赖
await zip('./project', './source.zip', {
  exclude: ['node_modules', 'dist', 'build', '.git'],
});

// 仅包含源代码
await zip('./src', './source-only.zip', {
  include: ['*.ts', '*.tsx', '*.js'],
});
```

---

## 🧪 测试

运行测试：

```bash
cd /Users/nike/.openclaw/workspace
npm test -- zip-processor-skill.test.ts
```

或运行单个测试：

```bash
npx vitest run src/skills/zip-processor-skill.test.ts
```

---

## ⚠️ 注意事项

1. **内存使用**: 压缩大文件 (>100MB) 时使用 `zipStream`
2. **路径安全**: 解压时验证路径，防止路径遍历攻击
3. **文件权限**: Windows 和 Unix 系统权限处理不同
4. **字符编码**: 使用 UTF-8 文件名避免乱码
5. **并发限制**: 批量操作时注意系统资源

---

## 📝 更新日志

### v1.0.0 (2026-03-13)

- ✅ 初始版本发布
- ✅ 基础压缩/解压功能
- ✅ 流式处理支持
- ✅ 进度追踪
- ✅ ZIP 信息查询
- ✅ 文件过滤 (include/exclude)
- ✅ 完整测试覆盖

---

## 📞 支持

**作者:** Axon  
**邮箱:** axon@openclaw.local  
**文档:** 参见 `zip-processor-skill.examples.md`

---

## 📄 许可证

MIT License - 自由使用、修改和分发

---

**最后更新:** 2026-03-13  
**维护者:** Axon
