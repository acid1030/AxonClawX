# 文件处理技能使用示例 - File Processor Skill Examples

## 📖 概述

文件处理技能提供强大的文件操作能力：
- ✅ 文件读取/写入 (支持多种编码)
- ✅ 文件转换 (JSON/YAML/CSV/Markdown/HTML/XML)
- ✅ 批量处理 (通配符/递归/过滤)
- ✅ 文件信息管理 (哈希/统计)

---

## 🚀 快速开始

### 1. 基础文件操作

```typescript
import { FileProcessor, createFileProcessor } from './file-processor-skill';

// 创建处理器实例
const processor = createFileProcessor({
  defaultEncoding: 'utf-8',
  recursive: true,
  maxFileSizeMB: 50,
});

// 读取文件
const content = await processor.read('./config.json');
console.log(content.content); // 文件内容
console.log(content.size);    // 文件大小

// 写入文件
await processor.write('./output.txt', 'Hello, World!', {
  encoding: 'utf-8',
  backup: true,           // 创建备份
  createParentDirs: true, // 自动创建父目录
});

// 获取文件信息
const info = await processor.info('./config.json', true);
console.log(info.size);      // 文件大小
console.log(info.md5);       // MD5 哈希
console.log(info.sha256);    // SHA256 哈希

// 删除文件
await processor.delete('./temp.txt');

// 复制文件
await processor.copy('./source.txt', './backup/source.txt');

// 移动/重命名文件
await processor.move('./old-name.txt', './new-name.txt');
```

---

### 2. 文件转换

```typescript
// JSON → YAML
await processor.convertAndSave('./data.json', './data.yaml', {
  format: 'yaml',
  formatOptions: {
    indent: 2,
  },
});

// CSV → JSON
await processor.convertAndSave('./users.csv', './users.json', {
  format: 'json',
  formatOptions: {
    delimiter: ',',
  },
});

// JSON → HTML
await processor.convertAndSave('./report.json', './report.html', {
  format: 'html',
});

// YAML → XML
await processor.convertAndSave('./config.yaml', './config.xml', {
  format: 'xml',
});

// 仅转换 (不保存)
const yamlContent = await processor.convert('./data.json', {
  format: 'yaml',
});
console.log(yamlContent); // YAML 格式字符串
```

---

### 3. 批量处理

```typescript
// 扫描文件
const files = processor.scanFiles('./src', {
  extension: 'ts',
  minSize: 1024,          // 最小 1KB
  exclude: ['node_modules', 'dist'],
});

console.log(`找到 ${files.length} 个 TypeScript 文件`);

// 批量读取
const configFiles = ['./config.json', './package.json', './tsconfig.json'];
const results = await processor.batchRead(configFiles);

console.log(`成功：${results.successCount}, 失败：${results.failedCount}`);

for (const success of results.successful) {
  console.log(`${success.path}: ${success.result.size} bytes`);
}

// 批量写入
const filesToWrite = [
  { path: './dist/a.txt', content: 'Content A' },
  { path: './dist/b.txt', content: 'Content B' },
  { path: './dist/c.txt', content: 'Content C' },
];

const writeResults = await processor.batchWrite(filesToWrite);
console.log(`写入成功：${writeResults.successCount} 个文件`);

// 批量处理 (带处理器函数)
const processResults = await processor.batchProcess(
  './logs',
  async (file, content) => {
    // 统计每行的字符数
    const lines = (content as string).split('\n');
    return {
      fileName: file.name,
      lineCount: lines.length,
      totalChars: lines.reduce((sum, line) => sum + line.length, 0),
    };
  },
  {
    extension: 'log',
    modifiedAfter: new Date('2026-03-01'),
  }
);

for (const result of processResults.successful) {
  console.log(`${result.result.fileName}: ${result.result.lineCount} 行`);
}
```

---

### 4. 文件查找 (通配符)

```typescript
// 查找所有 TypeScript 文件
const tsFiles = processor.findFiles('*.ts', './src');
console.log(tsFiles);

// 查找所有测试文件
const testFiles = processor.findFiles('*.test.ts', './src');

// 查找所有配置文件
const configFiles = processor.findFiles('config.*', '.');
// 匹配：config.json, config.yaml, config.ts 等

// 查找所有日志文件
const logFiles = processor.findFiles('*.log', './logs');
```

---

### 5. 高级过滤

```typescript
// 复杂过滤条件
const filteredFiles = processor.scanFiles('./project', {
  namePattern: /^test-.*\.ts$/,  // 正则匹配文件名
  extension: ['ts', 'tsx'],       // 多个扩展名
  minSize: 1024,                  // 最小 1KB
  maxSize: 1024 * 1024,           // 最大 1MB
  exclude: ['node_modules', '.git', 'dist'],
  type: 'file',                   // 仅文件
  modifiedAfter: new Date('2026-01-01'),
  modifiedBefore: new Date('2026-03-31'),
});

console.log(`找到 ${filteredFiles.length} 个匹配的文件`);

for (const file of filteredFiles) {
  console.log(`${file.path} - ${file.size} bytes`);
}
```

---

### 6. 临时文件处理

```typescript
// 创建临时文件
const tempPath = processor.createTempFile('export', '.csv', 'data,content\n1,2\n');
console.log(`临时文件：${tempPath}`);

// 使用临时文件...
const tempContent = await processor.read(tempPath);
console.log(tempContent.content);

// 清理所有临时文件
processor.cleanupTempFiles();
```

---

### 7. 便捷函数

```typescript
import { readFile, writeFile, convertFile, findFiles } from './file-processor-skill';

// 快速读取
const content = await readFile('./config.json');

// 快速写入
await writeFile('./output.txt', 'Hello!');

// 快速转换
await convertFile('./data.json', './data.yaml', 'yaml');

// 快速查找
const files = findFiles('*.md', './docs');
```

---

## 📊 实际应用场景

### 场景 1: 批量转换配置文件

```typescript
// 将所有 YAML 配置转换为 JSON
const yamlFiles = processor.findFiles('*.yaml', './config');

for (const yamlFile of yamlFiles) {
  const jsonPath = yamlFile.replace('.yaml', '.json');
  await processor.convertAndSave(yamlFile, jsonPath, { format: 'json' });
  console.log(`转换：${yamlFile} → ${jsonPath}`);
}
```

---

### 场景 2: 日志文件分析

```typescript
// 分析所有日志文件
const analysis = await processor.batchProcess(
  './logs/2026-03',
  async (file, content) => {
    const lines = (content as string).split('\n');
    const errorCount = lines.filter(line => line.includes('ERROR')).length;
    const warnCount = lines.filter(line => line.includes('WARN')).length;
    
    return {
      fileName: file.name,
      totalLines: lines.length,
      errors: errorCount,
      warnings: warnCount,
      date: file.modifiedAt,
    };
  },
  { extension: 'log' }
);

// 输出统计
console.log('=== 日志分析 ===');
for (const result of analysis.successful) {
  const r = result.result;
  console.log(`${r.fileName}: ${r.errors} 错误，${r.warnings} 警告`);
}
```

---

### 场景 3: 批量添加文件头

```typescript
// 为所有 TypeScript 文件添加许可证头
const LICENSE_HEADER = `/**
 * Licensed under MIT License
 * Copyright (c) 2026 Axon
 */

`;

const tsFiles = processor.scanFiles('./src', {
  extension: 'ts',
  exclude: ['node_modules'],
});

for (const file of tsFiles) {
  const content = await processor.read(file.path);
  const newContent = LICENSE_HEADER + (content.content as string);
  await processor.write(file.path, newContent, { backup: true });
  console.log(`添加许可证头：${file.path}`);
}
```

---

### 场景 4: 数据导出 (多格式)

```typescript
// 将数据导出为多种格式
const data = {
  users: [
    { id: 1, name: 'Alice', email: 'alice@example.com' },
    { id: 2, name: 'Bob', email: 'bob@example.com' },
  ],
  exportDate: new Date().toISOString(),
};

// 导出为 JSON
await processor.write('./exports/data.json', JSON.stringify(data, null, 2));

// 导出为 CSV
const csvContent = processor.toCSV(data.users);
await processor.write('./exports/users.csv', csvContent);

// 导出为 YAML
const yamlContent = processor.toYAML(data);
await processor.write('./exports/data.yaml', yamlContent);

// 导出为 HTML 报告
const htmlContent = processor.toHTML(data);
await processor.write('./exports/report.html', htmlContent);

console.log('数据导出完成！');
```

---

### 场景 5: 文件去重 (基于哈希)

```typescript
// 查找重复文件
const allFiles = processor.scanFiles('./backup', { type: 'file' });
const hashMap = new Map<string, string[]>();

for (const file of allFiles) {
  const info = await processor.info(file.path, true);
  const hash = info.md5!;
  
  if (!hashMap.has(hash)) {
    hashMap.set(hash, []);
  }
  hashMap.get(hash)!.push(file.path);
}

// 输出重复文件
console.log('=== 重复文件 ===');
for (const [hash, paths] of hashMap.entries()) {
  if (paths.length > 1) {
    console.log(`MD5: ${hash}`);
    paths.forEach(p => console.log(`  - ${p}`));
  }
}
```

---

## ⚙️ 配置选项

### FileProcessorConfig

```typescript
interface FileProcessorConfig {
  /** 默认编码 (默认：'utf-8') */
  defaultEncoding: BufferEncoding;
  
  /** 是否递归处理子目录 (默认：true) */
  recursive: boolean;
  
  /** 最大文件大小 MB (默认：100) */
  maxFileSizeMB: number;
  
  /** 临时目录路径 (可选) */
  tempDir?: string;
}
```

### ReadOptions

```typescript
interface ReadOptions {
  encoding?: BufferEncoding;  // 文件编码
  asBuffer?: boolean;          // 返回 Buffer 而非字符串
  offset?: number;             // 读取偏移量 (字节)
  length?: number;             // 读取长度 (字节)
}
```

### WriteOptions

```typescript
interface WriteOptions {
  encoding?: BufferEncoding;   // 文件编码
  backup?: boolean;            // 创建备份
  backupSuffix?: string;       // 备份后缀 (默认：'.bak')
  createParentDirs?: boolean;  // 自动创建父目录
  mode?: number;               // 文件权限模式
}
```

### FileFilter

```typescript
interface FileFilter {
  namePattern?: RegExp;        // 文件名正则
  extension?: string | string[]; // 扩展名
  minSize?: number;            // 最小大小 (字节)
  maxSize?: number;            // 最大大小 (字节)
  exclude?: string[];          // 排除路径
  type?: 'file' | 'directory'; // 类型过滤
  modifiedAfter?: Date;        // 修改时间之后
  modifiedBefore?: Date;       // 修改时间之前
}
```

---

## 🎯 最佳实践

### 1. 错误处理

```typescript
try {
  const content = await processor.read('./important.json');
  // 处理内容...
} catch (error) {
  if (error.code === 'ENOENT') {
    console.error('文件不存在');
  } else if (error.code === 'EACCES') {
    console.error('权限不足');
  } else {
    console.error('读取失败:', error.message);
  }
}
```

### 2. 大文件处理

```typescript
// 使用流式处理大文件
const largeFile = await processor.read('./huge.log', {
  encoding: 'utf-8',
});

// 分块处理
const chunks = largeFile.content.split('\n');
for (let i = 0; i < chunks.length; i += 1000) {
  const batch = chunks.slice(i, i + 1000);
  // 处理批次...
}
```

### 3. 备份策略

```typescript
// 重要文件操作前创建带时间戳的备份
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
await processor.write('./config.json', newConfig, {
  backup: true,
  backupSuffix: `.bak.${timestamp}`,
});
```

### 4. 批量操作性能优化

```typescript
// 限制并发数量
async function batchWithConcurrency<T>(
  items: string[],
  processor: (item: string) => Promise<T>,
  concurrency: number = 5
): Promise<T[]> {
  const results: T[] = [];
  const queues = items.map(() => processor(items.shift()!));
  
  while (queues.length > 0) {
    const done = await Promise.all(queues.slice(0, concurrency));
    results.push(...done);
    queues.splice(0, concurrency);
  }
  
  return results;
}
```

---

## 📝 注意事项

1. **文件大小限制**: 默认 100MB，可通过配置调整
2. **编码兼容性**: 确保使用正确的编码读取非 UTF-8 文件
3. **权限问题**: 确保有读写目标目录的权限
4. **路径安全**: 使用 `path.join()` 避免路径注入攻击
5. **临时文件清理**: 使用 `cleanupTempFiles()` 定期清理

---

## 🔧 扩展建议

```typescript
// 添加自定义转换格式
class CustomFileProcessor extends FileProcessor {
  async convertToCustom(filePath: string): Promise<string> {
    const content = await this.read(filePath);
    // 自定义转换逻辑...
    return customFormat;
  }
}
```

---

**创建时间:** 2026-03-13  
**版本:** 1.0.0  
**作者:** Axon
