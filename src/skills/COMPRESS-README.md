# 数据压缩工具技能 - 使用文档

## 📦 功能概述

提供完整的数据压缩解决方案，支持三种主流压缩格式：

| 功能 | Gzip | Deflate | Zip |
|------|------|---------|-----|
| **字符串压缩** | ✅ | ✅ | ✅ |
| **Buffer 压缩** | ✅ | ✅ | ✅ |
| **文件压缩** | ✅ | ✅ | ✅ |
| **流式压缩** | ✅ | ✅ | ❌ |
| **多文件打包** | ❌ | ❌ | ✅ |
| **目录打包** | ❌ | ❌ | ✅ |

---

## 🚀 快速开始

### 安装依赖

```bash
# 无需额外依赖，使用 Node.js 原生 zlib 模块
```

### 导入模块

```typescript
import {
  // Gzip
  gzipCompress,
  gzipDecompress,
  gzipCompressFile,
  gzipDecompressFile,
  
  // Deflate
  deflateCompress,
  deflateDecompress,
  
  // Zip
  zipCreate,
  zipExtract,
  zipCreateFile,
  zipDirectory,
  zipExtractFile,
  
  // 工具
  formatBytes,
  formatCompressionRatio
} from './compress-utils-skill';
```

---

## 📖 API 参考

### Gzip 压缩/解压

#### `gzipCompress(input, options?)`

压缩字符串或 Buffer。

```typescript
const result = gzipCompress('Hello, World!', { level: 6 });

if (result.success) {
  console.log(`压缩率：${formatCompressionRatio(result.ratio)}`);
  console.log(`压缩数据：${result.data}`); // Buffer
}
```

**参数：**
- `input`: `Buffer | string` - 输入数据
- `options`: `CompressionOptions` (可选)
  - `level`: `number` - 压缩级别 (1-9，默认 6)
  - `encoding`: `BufferEncoding` - 编码格式 (默认 'utf-8')

**返回：** `CompressionResult`
```typescript
{
  success: boolean;
  data?: Buffer | string;
  error?: string;
  originalSize: number;
  compressedSize: number;
  ratio: number;
}
```

---

#### `gzipDecompress(input, options?)`

解压 Gzip 数据。

```typescript
const result = gzipDecompress(compressedBuffer, { encoding: 'utf-8' });

if (result.success) {
  console.log(`解压内容：${result.data}`);
}
```

---

#### `gzipCompressFile(inputPath, outputPath?, options?)`

压缩文件（自动添加 .gz 后缀）。

```typescript
const result = await gzipCompressFile('data.txt', 'data.txt.gz', { level: 9 });

if (result.success) {
  console.log(`文件压缩完成：${formatBytes(result.compressedSize)}`);
}
```

---

#### `gzipDecompressFile(inputPath, outputPath?, options?)`

解压 .gz 文件（自动移除 .gz 后缀）。

```typescript
const result = await gzipDecompressFile('data.txt.gz');
```

---

#### `gzipStreamCompress(inputStream, outputStream, options?)`

流式压缩（适合大文件）。

```typescript
const input = fs.createReadStream('large.txt');
const output = fs.createWriteStream('large.txt.gz');

await gzipStreamCompress(input, output, { level: 6 });
```

---

#### `gzipStreamDecompress(inputStream, outputStream, options?)`

流式解压。

```typescript
const input = fs.createReadStream('large.txt.gz');
const output = fs.createWriteStream('large-restored.txt');

await gzipStreamDecompress(input, output);
```

---

### Deflate 压缩/解压

#### `deflateCompress(input, options?)`

Deflate 压缩（无 Gzip 头）。

```typescript
const result = deflateCompress('Test data', { level: 9 });
```

---

#### `deflateDecompress(input, options?)`

Deflate 解压。

```typescript
const result = deflateDecompress(compressedBuffer, { encoding: 'utf-8' });
```

---

#### `deflateCompressFile(inputPath, outputPath?, options?)`

Deflate 文件压缩。

```typescript
const result = await deflateCompressFile('data.txt', 'data.deflate');
```

---

#### `deflateDecompressFile(inputPath, outputPath?, options?)`

Deflate 文件解压。

```typescript
const result = await deflateDecompressFile('data.deflate');
```

---

### Zip 打包/解包

#### `zipCreate(input, filename?, options?)`

创建单文件 Zip。

```typescript
const zipResult = zipCreate('Hello, World!', 'hello.txt', { level: 6 });

if (zipResult.success && zipResult.data) {
  console.log(`Zip 大小：${formatBytes(zipResult.compressedSize || 0)}`);
  
  // 解压
  const extractResult = zipExtract(zipResult.data);
  if (extractResult.success) {
    console.log(`文件名：${extractResult.files?.[0].name}`);
  }
}
```

**参数：**
- `input`: `Buffer | string` - 文件内容
- `filename`: `string` - Zip 中的文件名 (默认 'file.txt')
- `options`: `ZipOptions`
  - `level`: `number` - 压缩级别 (0-9)
  - `encoding`: `BufferEncoding` - 编码格式

**返回：** `ZipResult`
```typescript
{
  success: boolean;
  data?: Buffer;
  error?: string;
  filesCount?: number;
  totalSize?: number;
  compressedSize?: number;
}
```

---

#### `zipExtract(zipData, options?)`

解压 Zip 数据。

```typescript
const result = zipExtract(zipBuffer);

if (result.success && result.files) {
  for (const file of result.files) {
    console.log(`${file.name}: ${formatBytes(file.size)}`);
    console.log(`内容：${file.data.toString()}`);
  }
}
```

**返回：** `UnzipResult`
```typescript
{
  success: boolean;
  files?: Array<{
    name: string;
    data: Buffer;
    size: number;
  }>;
  error?: string;
  filesCount?: number;
}
```

---

#### `zipCreateFile(entries, outputPath, options?)`

创建多文件 Zip。

```typescript
const entries = [
  { name: 'readme.txt', data: 'Readme content' },
  { name: 'data/config.json', data: JSON.stringify({ key: 'value' }) },
  { name: 'logs/app.log', data: 'Log entries...' }
];

const result = await zipCreateFile(entries, 'archive.zip', { level: 6 });

if (result.success) {
  console.log(`打包完成：${result.filesCount} 个文件`);
  console.log(`压缩率：${formatCompressionRatio((result.compressedSize || 0) / (result.totalSize || 1))}`);
}
```

**参数：**
- `entries`: `ZipEntry[]` - 文件条目数组
  - `name`: `string` - 文件名（可包含路径）
  - `data`: `Buffer | string` - 文件内容
  - `encoding`: `BufferEncoding` (可选)
- `outputPath`: `string` - 输出 Zip 文件路径
- `options`: `ZipOptions` (可选)

---

#### `zipExtractFile(zipPath, outputDir, options?)`

解压 Zip 文件到目录。

```typescript
const result = await zipExtractFile('archive.zip', './extracted');

if (result.success) {
  console.log(`解压完成：${result.filesCount} 个文件`);
}
```

---

#### `zipDirectory(inputDir, outputPath, options?)`

将整个目录打包为 Zip。

```typescript
const result = await zipDirectory('./my-project', './my-project.zip', { level: 9 });

if (result.success) {
  console.log(`目录打包完成：${result.filesCount} 个文件`);
  console.log(`原始大小：${formatBytes(result.totalSize || 0)}`);
  console.log(`压缩后大小：${formatBytes(result.compressedSize || 0)}`);
}
```

---

### 流式压缩（大文件）

#### `compressFileStream(inputPath, outputPath, type, options?)`

流式压缩文件。

```typescript
await compressFileStream('large.txt', 'large.txt.gz', 'gzip', { level: 6 });
// 或
await compressFileStream('large.txt', 'large.deflate', 'deflate', { level: 9 });
```

---

#### `decompressFileStream(inputPath, outputPath, type, options?)`

流式解压文件。

```typescript
await decompressFileStream('large.txt.gz', 'large-restored.txt', 'gzip');
```

---

### 工具函数

#### `formatBytes(bytes)`

格式化字节大小。

```typescript
console.log(formatBytes(1024));        // "1.00 KB"
console.log(formatBytes(1048576));     // "1.00 MB"
console.log(formatBytes(1073741824));  // "1.00 GB"
```

---

#### `formatCompressionRatio(ratio)`

计算压缩率百分比。

```typescript
console.log(formatCompressionRatio(0.3));  // "70.00%"
console.log(formatCompressionRatio(0.5));  // "50.00%"
```

---

## 📝 使用示例

### 示例 1: 字符串压缩

```typescript
import { gzipCompress, gzipDecompress, formatBytes } from './compress-utils-skill';

const originalText = 'Hello, World! This is compression test.';

// 压缩
const compressed = gzipCompress(originalText);
console.log(`原始：${formatBytes(compressed.originalSize)}`);
console.log(`压缩：${formatBytes(compressed.compressedSize)}`);

// 解压
const decompressed = gzipDecompress(compressed.data!, { encoding: 'utf-8' });
console.log(`内容：${decompressed.data}`);
```

---

### 示例 2: 文件批量压缩

```typescript
import { gzipCompressFile } from './compress-utils-skill';
import * as fs from 'fs';

const files = ['file1.txt', 'file2.txt', 'file3.txt'];

for (const file of files) {
  const result = await gzipCompressFile(file);
  if (result.success) {
    console.log(`✓ ${file} → ${file}.gz`);
  }
}
```

---

### 示例 3: 项目打包

```typescript
import { zipDirectory } from './compress-utils-skill';

// 打包整个项目
const result = await zipDirectory('./src', './src-backup.zip', { level: 9 });

if (result.success) {
  console.log(`项目打包完成`);
  console.log(`文件数：${result.filesCount}`);
  console.log(`大小：${formatBytes(result.compressedSize || 0)}`);
}
```

---

### 示例 4: 日志归档

```typescript
import { zipCreateFile, zipExtractFile } from './compress-utils-skill';

// 打包日志文件
const logEntries = [
  { name: 'app.log', data: 'Application logs...' },
  { name: 'error.log', data: 'Error logs...' },
  { name: 'access.log', data: 'Access logs...' }
];

const result = await zipCreateFile(logEntries, 'logs-2024-03-13.zip');

// 需要时解压
await zipExtractFile('logs-2024-03-13.zip', './restored-logs');
```

---

### 示例 5: 大文件传输

```typescript
import { compressFileStream, decompressFileStream } from './compress-utils-skill';

// 发送前压缩
await compressFileStream('video.mp4', 'video.mp4.gz', 'gzip', { level: 1 });

// 接收后解压
await decompressFileStream('video.mp4.gz', 'video-restored.mp4', 'gzip');
```

---

## ⚙️ 配置选项

### 压缩级别对比

| 级别 | 速度 | 压缩率 | 适用场景 |
|------|------|--------|----------|
| 1-3 | 快 | 低 | 实时压缩、大文件 |
| 4-6 | 中 | 中 | 通用场景（默认） |
| 7-9 | 慢 | 高 | 归档、存储优化 |

```typescript
// 快速压缩（低压缩率）
gzipCompress(data, { level: 1 });

// 平衡模式（默认）
gzipCompress(data, { level: 6 });

// 最大压缩（高压缩率）
gzipCompress(data, { level: 9 });
```

---

## 🔍 注意事项

### 1. Zip 格式限制

当前实现使用 Node.js 原生 zlib 构建基础 Zip 格式，适用于：
- ✅ 单文件/多文件打包
- ✅ 简单目录结构
- ✅ 基础 Deflate 压缩

如需高级功能（加密、分卷、AES 等），建议集成专业库：
```bash
npm install archiver jszip
```

---

### 2. 内存使用

- **字符串/Buffer 压缩**：数据加载到内存，适合小文件（<100MB）
- **流式压缩**：逐块处理，适合大文件（>100MB）

```typescript
// 小文件 - 直接压缩
const result = gzipCompress(smallData);

// 大文件 - 流式压缩
await compressFileStream('large.iso', 'large.iso.gz', 'gzip');
```

---

### 3. 错误处理

所有函数返回统一的结果对象，包含 `success` 标志：

```typescript
const result = gzipCompress(data);

if (!result.success) {
  console.error('压缩失败:', result.error);
  // 处理错误
}
```

---

### 4. 编码格式

处理非 UTF-8 数据时，需指定编码：

```typescript
// 中文内容
gzipCompress('中文测试', { encoding: 'utf-8' });

// 二进制数据
gzipCompress(binaryBuffer); // 无需指定编码
```

---

## 📊 性能参考

### 压缩率对比（文本数据）

| 格式 | 压缩级别 | 压缩率 | 速度 |
|------|----------|--------|------|
| Gzip | 6 | ~60% | 快 |
| Deflate | 6 | ~58% | 快 |
| Zip | 6 | ~60% | 中 |

### 压缩率对比（二进制数据）

| 数据类型 | 压缩率 |
|----------|--------|
| 文本文件 | 60-80% |
| JSON/XML | 70-85% |
| 图片 | 0-5% (已压缩) |
| 视频 | 0-2% (已压缩) |
| 可执行文件 | 30-50% |

---

## 🛠️ 故障排除

### 问题 1: "Invalid block type"

**原因：** 尝试用 Gzip 解压 Deflate 数据（或反之）

**解决：** 确保压缩/解压方法匹配
```typescript
// ✓ 正确
const compressed = deflateCompress(data);
const decompressed = deflateDecompress(compressed.data!);

// ✗ 错误
const compressed = deflateCompress(data);
const decompressed = gzipDecompress(compressed.data!); // 会失败
```

---

### 问题 2: Zip 解压后文件名乱码

**原因：** 编码不匹配

**解决：** 确保使用 UTF-8 编码
```typescript
zipCreate(data, '文件名.txt', { encoding: 'utf-8' });
```

---

### 问题 3: 大文件压缩内存溢出

**原因：** 使用同步方法处理大文件

**解决：** 改用流式压缩
```typescript
// ✗ 避免
const largeData = fs.readFileSync('huge.iso');
const result = gzipCompress(largeData);

// ✓ 推荐
await compressFileStream('huge.iso', 'huge.iso.gz', 'gzip');
```

---

## 📚 相关资源

- [Node.js zlib 文档](https://nodejs.org/api/zlib.html)
- [Gzip 格式规范](https://www.rfc-editor.org/rfc/rfc1952)
- [Deflate 格式规范](https://www.rfc-editor.org/rfc/rfc1951)
- [ZIP 文件格式](https://pkware.cachefly.net/webdocs/casestudies/APPNOTE.TXT)

---

## 📄 许可证

MIT License

---

**最后更新：** 2026-03-13  
**版本：** 1.0.0
