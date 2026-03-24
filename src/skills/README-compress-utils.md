# 数据压缩工具技能

> 提供 Gzip/Deflate 压缩解压功能，支持同步、异步和流式处理

## 📦 安装

无需额外依赖，使用 Node.js 内置 `zlib` 模块。

## 🚀 快速开始

```typescript
import {
  gzipCompress,
  gzipDecompress,
  gzipCompressFile,
  gzipDecompressFile
} from './compress-utils-skill';

// 压缩字符串
const result = gzipCompress('Hello, World!');
console.log(`压缩率：${(1 - result.ratio) * 100}%`);

// 解压
const original = gzipDecompress(result.data as Buffer, { encoding: 'utf-8' });
```

## 📖 API 文档

### Gzip 压缩/解压

#### `gzipCompress(input, options?)`
压缩数据（同步）

**参数:**
- `input`: `Buffer | string` - 输入数据
- `options`: `CompressionOptions` (可选)
  - `level`: `number` (1-9) - 压缩级别，默认 6
  - `encoding`: `BufferEncoding` - 字符串编码，默认 'utf-8'

**返回:** `CompressionResult`
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

**示例:**
```typescript
const result = gzipCompress('Hello', { level: 9 });
if (result.success) {
  console.log(`压缩率：${(1 - result.ratio) * 100}%`);
}
```

---

#### `gzipDecompress(input, options?)`
解压数据（同步）

**参数:**
- `input`: `Buffer` - 压缩的 Buffer
- `options`: `CompressionOptions` (可选)
  - `encoding`: `BufferEncoding` - 输出编码

**返回:** `CompressionResult`

**示例:**
```typescript
const result = gzipDecompress(compressedBuffer, { encoding: 'utf-8' });
console.log(result.data); // 解压后的字符串
```

---

#### `gzipCompressFile(inputPath, outputPath?, options?)`
压缩文件（异步）

**参数:**
- `inputPath`: `string` - 输入文件路径
- `outputPath`: `string` (可选) - 输出路径，默认添加 `.gz` 后缀
- `options`: `CompressionOptions` (可选)

**返回:** `Promise<CompressionResult>`

**示例:**
```typescript
const result = await gzipCompressFile('data.txt', 'data.txt.gz');
console.log(`节省空间：${formatBytes(result.originalSize - result.compressedSize)}`);
```

---

#### `gzipDecompressFile(inputPath, outputPath?, options?)`
解压文件（异步）

**参数:**
- `inputPath`: `string` - `.gz` 文件路径
- `outputPath`: `string` (可选) - 输出路径，默认移除 `.gz` 后缀

**返回:** `Promise<CompressionResult>`

**示例:**
```typescript
const result = await gzipDecompressFile('data.txt.gz');
```

---

### Deflate 压缩/解压

API 与 Gzip 类似，函数名前缀为 `deflate`：

- `deflateCompress(input, options?)` - 压缩
- `deflateDecompress(input, options?)` - 解压
- `deflateCompressFile(inputPath, outputPath?, options?)` - 压缩文件
- `deflateDecompressFile(inputPath, outputPath?, options?)` - 解压文件

**示例:**
```typescript
const result = deflateCompress('Hello');
const restored = deflateDecompress(result.data as Buffer, { encoding: 'utf-8' });
```

---

### 流式压缩

适合处理大文件，内存占用低。

#### `gzipStreamCompress(inputStream, outputStream, options?)`
流式 Gzip 压缩

**参数:**
- `inputStream`: `Readable` - 输入流
- `outputStream`: `Writable` - 输出流
- `options`: `CompressionOptions` (可选)

**示例:**
```typescript
import { createReadStream, createWriteStream } from 'fs';
import { gzipStreamCompress } from './compress-utils-skill';

const input = createReadStream('large-file.txt');
const output = createWriteStream('large-file.txt.gz');

await gzipStreamCompress(input, output, { level: 6 });
```

---

#### `gzipStreamDecompress(inputStream, outputStream, options?)`
流式 Gzip 解压

**示例:**
```typescript
const input = createReadStream('large-file.txt.gz');
const output = createWriteStream('restored.txt');

await gzipStreamDecompress(input, output);
```

---

#### `compressFileStream(inputPath, outputPath, type, options?)`
便捷的文件流式压缩

**参数:**
- `inputPath`: `string` - 输入文件
- `outputPath`: `string` - 输出文件
- `type`: `'gzip' | 'deflate'` - 压缩类型
- `options`: `CompressionOptions` (可选)

**示例:**
```typescript
await compressFileStream('data.txt', 'data.txt.gz', 'gzip', { level: 9 });
```

---

#### `decompressFileStream(inputPath, outputPath, type, options?)`
便捷的文件流式解压

**示例:**
```typescript
await decompressFileStream('data.txt.gz', 'data.txt', 'gzip');
```

---

### 工具函数

#### `formatBytes(bytes)`
格式化字节大小

**示例:**
```typescript
formatBytes(1024);        // "1.00 KB"
formatBytes(1048576);     // "1.00 MB"
formatBytes(1073741824);  // "1.00 GB"
```

---

#### `formatCompressionRatio(ratio)`
格式化压缩率

**示例:**
```typescript
formatCompressionRatio(0.3);  // "70.00%" (压缩了 70%)
formatCompressionRatio(0.5);  // "50.00%"
```

---

## 📊 压缩级别说明

| 级别 | 速度 | 压缩率 | 适用场景 |
|------|------|--------|----------|
| 1-3  | 快   | 低     | 实时压缩、网络传输 |
| 4-6  | 中   | 中     | 通用场景（默认） |
| 7-9  | 慢   | 高     | 归档存储、大文件 |

---

## 🔍 Gzip vs Deflate

| 特性 | Gzip | Deflate |
|------|------|---------|
| 格式 | 包含文件头 | 原始压缩数据 |
| 兼容性 | 更广泛 | 较窄 |
| 用途 | 文件压缩、HTTP | 内部数据传输 |
| 推荐 | ✅ 首选 | 特定场景 |

---

## 🎯 使用场景

### 1. 日志文件归档
```typescript
await gzipCompressFile('app.log', 'app.log.2026-03-13.gz');
```

### 2. API 响应压缩
```typescript
const compressed = gzipCompress(JSON.stringify(data));
res.setHeader('Content-Encoding', 'gzip');
res.send(compressed.data);
```

### 3. 大文件传输
```typescript
await compressFileStream('backup.sql', 'backup.sql.gz', 'gzip', { level: 9 });
// 传输 compressed 文件
await decompressFileStream('backup.sql.gz', 'backup.sql', 'gzip');
```

### 4. 内存数据缓存
```typescript
const cache = new Map<string, Buffer>();

// 存储
const compressed = gzipCompress(largeData);
cache.set('key', compressed.data as Buffer);

// 读取
const cached = cache.get('key');
const original = gzipDecompress(cached!, { encoding: 'utf-8' });
```

---

## ⚠️ 注意事项

1. **错误处理**: 始终检查 `result.success`
2. **内存使用**: 大文件使用流式 API
3. **编码**: 字符串压缩时指定正确的 encoding
4. **文件覆盖**: 压缩文件时注意输出路径，避免覆盖原文件

---

## 🧪 运行示例

```bash
# 运行所有示例
cd src/skills
npx ts-node compress-utils-skill.examples.ts
```

---

## 📝 许可证

MIT
