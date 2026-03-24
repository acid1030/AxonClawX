# Stream Utils Skill - ACE 流式处理工具

**版本:** 1.0.0  
**作者:** NOVA  
**最后更新:** 2026-03-13

---

## 📋 概述

Node.js 流处理工具集，提供流式读取、流式转换、流式合并等功能，支持背压处理和异步迭代器管道。

---

## 🚀 核心功能

### 1. 流式读取 (Stream Reading)

| 函数 | 描述 | 示例 |
|------|------|------|
| `createFileReadable` | 创建文件读取流 | `createFileReadable('./input.txt')` |
| `readJsonLines` | 逐行读取 JSONL 文件 | `for await (const obj of readJsonLines('./data.jsonl'))` |
| `readInChunks` | 分块读取大文件 | `for await (const chunk of readInChunks('./large.bin', 64*1024))` |

### 2. 流式写入 (Stream Writing)

| 函数 | 描述 | 示例 |
|------|------|------|
| `createFileWritable` | 创建文件写入流 | `createFileWritable('./output.txt')` |
| `safeWriteFile` | 原子性安全写入 | `await safeWriteFile('./config.json', data)` |
| `writeJsonLines` | 写入 JSONL 文件 | `await writeJsonLines('./data.jsonl', records)` |
| `writeWithBackpressure` | 带背压处理的写入 | `await writeWithBackpressure(stream, chunks)` |

### 3. 流式转换 (Stream Transformation)

| 函数 | 描述 | 示例 |
|------|------|------|
| `createTransformStream` | 创建自定义转换流 | `createTransformStream((chunk, enc, cb) => {...})` |
| `createFilterStream` | 创建过滤器流 | `createFilterStream(item => item.value > 10)` |
| `createMapStream` | 创建映射流 | `createMapStream(item => item * 2)` |
| `createCompressStream` | 创建 Gzip 压缩流 | `createCompressStream()` |
| `createDecompressStream` | 创建 Gzip 解压流 | `createDecompressStream()` |
| `createHashStream` | 创建哈希计算流 | `createHashStream('sha256')` |

### 4. 流式合并/管道 (Stream Piping)

| 函数 | 描述 | 示例 |
|------|------|------|
| `createFilePipeline` | 创建文件处理管道 | `await createFilePipeline(input, output, [transform1, transform2])` |
| `pipeAsync` | 异步迭代器管道 | `await pipeAsync(source, filterOp(...), mapOp(...))` |
| `filterOp` | 过滤操作 (用于 pipeAsync) | `filterOp(item => item.active)` |
| `mapOp` | 映射操作 (用于 pipeAsync) | `mapOp(item => item.name)` |
| `takeOp` | 限流操作 (用于 pipeAsync) | `takeOp(10)` |

### 5. 背压处理 (Backpressure Handling)

| 函数 | 描述 | 示例 |
|------|------|------|
| `copyStreamWithBackpressure` | 带背压的流复制 | `await copyStreamWithBackpressure(readable, writable)` |
| `withStreamTimeout` | 带超时的流处理 | `await withStreamTimeout(fn, 5000)` |

### 6. 工具函数 (Utilities)

| 函数 | 描述 | 示例 |
|------|------|------|
| `streamToArray` | 流转数组 | `await streamToArray(stream)` |
| `streamToString` | 流转字符串 | `await streamToString(stream, 'utf8')` |
| `getFileSize` | 获取文件大小 | `await getFileSize('./file.txt')` |
| `batchStream` | 批处理流数据 | `for await (const batch of batchStream(stream, 100))` |

---

## 💡 使用示例

### 示例 1: 基础文件读写

```typescript
import { createFileReadable, createFileWritable } from './stream-utils-skill';

// 读取文件
const readable = createFileReadable('./input.txt', {
  encoding: 'utf8',
  highWaterMark: 8 * 1024,
});

// 写入文件
const writable = createFileWritable('./output.txt');

// 管道连接
readable.pipe(writable);
```

### 示例 2: JSONL 文件处理

```typescript
import { readJsonLines, writeJsonLines } from './stream-utils-skill';

// 写入 JSONL
const records = [
  { id: 1, name: 'Alice', age: 25 },
  { id: 2, name: 'Bob', age: 30 },
];

await writeJsonLines('./users.jsonl', records);

// 读取 JSONL
for await (const user of readJsonLines('./users.jsonl')) {
  console.log(user.name);
}
```

### 示例 3: 流转换 (过滤 + 映射)

```typescript
import { Readable } from 'node:stream';
import { createFilterStream, createMapStream, createFileWritable } from './stream-utils-skill';

const source = Readable.from([
  { id: 1, value: 10 },
  { id: 2, value: 20 },
  { id: 3, value: 30 },
]);

const filter = createFilterStream(item => item.value >= 20);
const mapper = createMapStream(item => `ID:${item.id} = ${item.value * 2}`);
const output = createFileWritable('./output.txt', { encoding: 'utf8' });

source.pipe(filter).pipe(mapper).pipe(output);
```

### 示例 4: 异步迭代器管道

```typescript
import { pipeAsync, filterOp, mapOp, takeOp } from './stream-utils-skill';

async function* dataSource() {
  for (let i = 1; i <= 100; i++) {
    yield { id: i, value: i * 10 };
  }
}

const result = await pipeAsync(
  dataSource(),
  filterOp(item => item.id % 2 === 0),
  mapOp(item => `[${item.id}] ${item.value}`),
  takeOp(10)
);

for await (const item of result) {
  console.log(item);
}
```

### 示例 5: 大文件分块读取

```typescript
import { readInChunks } from './stream-utils-skill';

let totalBytes = 0;
for await (const chunk of readInChunks('./large-file.bin', 64 * 1024)) {
  totalBytes += chunk.length;
  console.log(`读取 ${chunk.length} 字节`);
}
console.log(`总计 ${totalBytes} 字节`);
```

### 示例 6: 文件压缩管道

```typescript
import { createFilePipeline, createCompressStream, createDecompressStream } from './stream-utils-skill';

// 压缩
await createFilePipeline(
  './input.txt',
  './input.txt.gz',
  [createCompressStream()]
);

// 解压
await createFilePipeline(
  './input.txt.gz',
  './output.txt',
  [createDecompressStream()]
);
```

### 示例 7: 批处理流数据

```typescript
import { Readable } from 'node:stream';
import { batchStream } from './stream-utils-skill';

const source = Readable.from(
  Array.from({ length: 1000 }, (_, i) => ({ id: i + 1 }))
);

for await (const batch of batchStream<{ id: number }>(source, 100)) {
  console.log(`处理批次：${batch.length} 条记录`);
  // 批量处理...
}
```

### 示例 8: 带背压处理的写入

```typescript
import { createFileWritable, writeWithBackpressure } from './stream-utils-skill';

const writable = createFileWritable('./output.txt', { encoding: 'utf8' });
const chunks = Array.from({ length: 10000 }, (_, i) => `Line ${i}\n`);

await writeWithBackpressure(writable, chunks, {
  retryDelay: 100,
  maxRetries: 3,
  logging: true,
});
```

---

## 🔧 配置选项

### StreamOptions

```typescript
interface StreamOptions {
  highWaterMark?: number;  // 高水位标记 (默认 16KB)
  encoding?: BufferEncoding; // 编码 (默认 utf8)
  timeout?: number;        // 超时时间 (毫秒)
}
```

### TransformOptions

```typescript
interface TransformOptions {
  transform?: (chunk: any, encoding: BufferEncoding, callback: Function) => void;
  flush?: (callback: Function) => void;
  objectMode?: boolean;
}
```

### BackpressureOptions

```typescript
interface BackpressureOptions {
  retryDelay?: number;   // 重试延迟 (毫秒)
  maxRetries?: number;   // 最大重试次数
  logging?: boolean;     // 是否记录日志
}
```

---

## 📦 文件清单

```
src/skills/
├── stream-utils-skill.ts      # 核心工具实现
├── stream-utils-examples.ts   # 使用示例
└── STREAM-README.md           # 本文档
```

---

## 🧪 运行示例

```bash
cd /Users/nike/.openclaw/workspace
npx ts-node src/skills/stream-utils-examples.ts
```

---

## ⚠️ 注意事项

1. **背压处理**: 大量数据写入时务必使用 `writeWithBackpressure` 或监听 `drain` 事件
2. **错误处理**: 流操作应使用 `try-catch` 或 `.on('error')` 捕获错误
3. **资源清理**: 使用 `finished` 或 `pipeline` 确保流正确关闭
4. **内存管理**: 大文件处理优先使用流式 API，避免一次性加载到内存

---

## 📚 相关资源

- [Node.js Stream API 文档](https://nodejs.org/api/stream.html)
- [Stream Handbook](https://github.com/substack/stream-handbook)
- [Node.js 异步迭代器](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/AsyncIterable)

---

**交付状态:** ✅ 完成  
**交付时间:** 5 分钟内  
**测试状态:** TypeScript 编译通过
