# PDF Processor Skill - 使用示例

## 📦 安装依赖

```bash
npm install pdf-lib pdf-parse --save
```

---

## 1️⃣ PDF 文本提取

### 基础用法

```typescript
import { extractTextFromPDF, PDFProcessor } from './pdf-processor-skill';

// 方法 1: 使用快捷函数
const result = await extractTextFromPDF('./document.pdf', {
  preserveNewlines: true,
  extractMetadata: true,
});

console.log('提取的文本:', result.text);
console.log('总页数:', result.metadata?.totalPages);
console.log('作者:', result.metadata?.author);
```

### 按页提取

```typescript
const processor = new PDFProcessor();

// 获取页面信息
const pages = await processor.getPageInfo('./document.pdf');
pages.forEach(page => {
  console.log(`第${page.pageNumber}页: ${page.width}x${page.height}px`);
});

// 提取指定页码范围
const extracted = await processor.extractText('./document.pdf', {
  pageRange: { start: 1, end: 5 },
  splitByPage: true,
  extractMetadata: true,
});

console.log('按页分割:', extracted.pages);
```

### 完整元数据提取

```typescript
const result = await processor.extractText('./report.pdf', {
  extractMetadata: true,
  preserveNewlines: true,
});

if (result.metadata) {
  console.log('=== PDF 元数据 ===');
  console.log('标题:', result.metadata.title);
  console.log('作者:', result.metadata.author);
  console.log('主题:', result.metadata.subject);
  console.log('关键词:', result.metadata.keywords);
  console.log('创建日期:', result.metadata.creationDate);
  console.log('修改日期:', result.metadata.modificationDate);
  console.log('总页数:', result.metadata.totalPages);
  console.log('PDF 版本:', result.metadata.pdfVersion);
}
```

---

## 2️⃣ PDF 生成

### 从文本创建 PDF

```typescript
import { createPDFFromText, PDFProcessor } from './pdf-processor-skill';

const processor = new PDFProcessor();

// 基础用法
await processor.createFromText(
  'Hello, World!\n这是一份测试文档。',
  './output.pdf',
  {
    fontSize: 14,
    font: 'helvetica',
    margin: 50,
    pageSize: 'A4',
  }
);

// 带格式的文本
await processor.createFromText(
  `项目报告
  
  日期：2026-03-13
  作者：Axon
  
  ## 概述
  这是一个自动生成的 PDF 文档示例。
  
  ## 内容
  - 第一点
  - 第二点
  - 第三点`,
  './report.pdf',
  {
    fontSize: 12,
    font: 'times',
    margin: 60,
    pageSize: 'A4',
    lineHeight: 1.5,
    textColor: { r: 0, g: 0, b: 0 },
  }
);
```

### 从图片创建 PDF

```typescript
const processor = new PDFProcessor();

// 单张图片
await processor.createFromImages(
  ['./image.png'],
  './single-image.pdf',
  {
    pageSize: 'A4',
    margin: 50,
  }
);

// 多张图片 (每页一张)
await processor.createFromImages(
  ['./photo1.jpg', './photo2.jpg', './photo3.png'],
  './photo-album.pdf',
  {
    pageSize: 'Letter',
  }
);
```

### 自定义配置

```typescript
const processor = new PDFProcessor({
  defaultFont: 'courier',
  defaultFontSize: 11,
  defaultPageSize: 'Legal',
  defaultMargin: 40,
});

await processor.createFromText(
  '使用自定义配置的 PDF 文档...',
  './custom.pdf'
);
```

---

## 3️⃣ PDF 合并

### 基础合并

```typescript
import { mergePDFs, PDFProcessor } from './pdf-processor-skill';

const processor = new PDFProcessor();

// 合并多个 PDF
const outputPath = await processor.mergePDFs(
  ['./doc1.pdf', './doc2.pdf', './doc3.pdf'],
  {
    outputPath: './merged.pdf',
    cleanup: false,
    addBookmarks: false,
  }
);

console.log('合并完成:', outputPath);
```

### 使用快捷函数

```typescript
import { mergePDFs } from './pdf-processor-skill';

const mergedPath = await mergePDFs(
  ['./chapter1.pdf', './chapter2.pdf', './chapter3.pdf'],
  './complete-book.pdf',
  {
    addBookmarks: true,
    bookmarkPrefix: 'Chapter',
  }
);
```

---

## 4️⃣ PDF 拆分

### 按页数拆分

```typescript
import { splitPDF, PDFProcessor } from './pdf-processor-skill';

const processor = new PDFProcessor();

// 每 5 页拆分为一个文件
const result = await processor.splitPDF('./large-document.pdf', {
  outputDir: './output/splits',
  filenamePrefix: 'document',
  pagesPerFile: 5,
});

console.log('拆分完成:');
console.log('总文件数:', result.totalFiles);
console.log('文件列表:', result.files);
```

### 按指定范围拆分

```typescript
const result = await processor.splitPDF('./report.pdf', {
  outputDir: './output/sections',
  filenamePrefix: 'section',
  ranges: [
    { start: 1, end: 10 },   // 第 1-10 页
    { start: 11, end: 20 },  // 第 11-20 页
    { start: 21, end: 30 },  // 第 21-30 页
  ],
});
```

### 提取指定页面

```typescript
// 提取第 1、3、5 页为新 PDF
const extractedPath = await processor.extractPages(
  './original.pdf',
  [1, 3, 5],
  './extracted.pdf'
);

console.log('提取完成:', extractedPath);
```

---

## 5️⃣ 综合示例

### 文档处理工作流

```typescript
import { PDFProcessor, extractTextFromPDF, mergePDFs } from './pdf-processor-skill';
import * as fs from 'fs';
import * as path from 'path';

async function processDocumentWorkflow() {
  const processor = new PDFProcessor();
  
  // 1. 提取原始文档内容
  console.log('📄 提取文档内容...');
  const source = await extractTextFromPDF('./source.pdf', {
    extractMetadata: true,
  });
  
  console.log(`文档：${source.metadata?.title}`);
  console.log(`作者：${source.metadata?.author}`);
  console.log(`页数：${source.metadata?.totalPages}`);
  
  // 2. 创建摘要文档
  console.log('\n📝 创建摘要...');
  const summary = source.text.substring(0, 1000) + '...';
  await processor.createFromText(
    `文档摘要\n\n${summary}`,
    './summary.pdf',
    {
      fontSize: 12,
      font: 'helvetica',
      pageSize: 'A4',
    }
  );
  
  // 3. 拆分原文档
  console.log('\n✂️ 拆分文档...');
  const splitResult = await processor.splitPDF('./source.pdf', {
    outputDir: './chapters',
    filenamePrefix: 'chapter',
    pagesPerFile: 10,
  });
  
  console.log(`拆分为 ${splitResult.totalFiles} 个文件`);
  
  // 4. 合并摘要和第一章
  console.log('\n🔗 合并文档...');
  const mergedPath = await mergePDFs(
    ['./summary.pdf', splitResult.files[0]],
    './final-output.pdf'
  );
  
  console.log('\n✅ 工作流完成!');
  console.log('输出文件:', mergedPath);
}

// 执行工作流
processDocumentWorkflow().catch(console.error);
```

### 批量处理多个 PDF

```typescript
import { PDFProcessor } from './pdf-processor-skill';
import * as fs from 'fs';
import * as path from 'path';

async function batchProcessPDFs(inputDir: string, outputDir: string) {
  const processor = new PDFProcessor();
  
  // 确保输出目录存在
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // 获取所有 PDF 文件
  const files = fs.readdirSync(inputDir)
    .filter(file => file.toLowerCase().endsWith('.pdf'));
  
  console.log(`发现 ${files.length} 个 PDF 文件`);
  
  // 处理每个文件
  for (const file of files) {
    const inputPath = path.join(inputDir, file);
    const outputName = path.basename(file, '.pdf');
    
    try {
      // 提取文本
      const extracted = await processor.extractText(inputPath, {
        extractMetadata: true,
      });
      
      // 保存元数据
      const metadataPath = path.join(outputDir, `${outputName}_metadata.json`);
      fs.writeFileSync(metadataPath, JSON.stringify(extracted.metadata, null, 2));
      
      // 保存文本
      const textPath = path.join(outputDir, `${outputName}.txt`);
      fs.writeFileSync(textPath, extracted.text);
      
      console.log(`✅ 处理完成：${file}`);
    } catch (error) {
      console.error(`❌ 处理失败：${file}`, error);
    }
  }
  
  console.log('\n🎉 批量处理完成!');
}

// 使用示例
batchProcessPDFs('./input-pdfs', './output-texts').catch(console.error);
```

---

## 6️⃣ 错误处理

```typescript
import { PDFProcessor } from './pdf-processor-skill';

const processor = new PDFProcessor();

async function safeExtract(filePath: string) {
  try {
    // 检查文件是否存在
    if (!fs.existsSync(filePath)) {
      throw new Error(`文件不存在：${filePath}`);
    }
    
    const result = await processor.extractText(filePath);
    return result;
  } catch (error) {
    if (error instanceof Error) {
      console.error('PDF 处理错误:', error.message);
    }
    throw error;
  }
}

// 使用
safeExtract('./document.pdf').catch(console.error);
```

---

## 7️⃣ 性能优化

### 大文件处理

```typescript
import { PDFProcessor } from './pdf-processor-skill';

// 使用流式处理大文件
async function processLargePDF(filePath: string) {
  const processor = new PDFProcessor({
    tempDir: '/tmp/pdf-processing', // 指定临时目录
  });
  
  // 分批次处理
  const pageInfo = await processor.getPageInfo(filePath);
  const batchSize = 10;
  
  for (let i = 0; i < pageInfo.length; i += batchSize) {
    const batch = pageInfo.slice(i, i + batchSize);
    console.log(`处理批次：${i / batchSize + 1}`);
    
    // 处理当前批次...
  }
}
```

---

## 📋 API 速查

### PDFProcessor 类

| 方法 | 描述 | 返回值 |
|------|------|--------|
| `extractText(filePath, options)` | 提取 PDF 文本 | `Promise<ExtractedText>` |
| `getPageInfo(filePath)` | 获取页面信息 | `Promise<PDFPageInfo[]>` |
| `createFromText(text, outputPath, options)` | 从文本创建 PDF | `Promise<string>` |
| `createFromImages(imagePaths, outputPath, options)` | 从图片创建 PDF | `Promise<string>` |
| `mergePDFs(inputPaths, options)` | 合并 PDF | `Promise<string>` |
| `splitPDF(inputPath, options)` | 拆分 PDF | `Promise<SplitResult>` |
| `extractPages(inputPath, pageNumbers, outputPath)` | 提取指定页面 | `Promise<string>` |

### 快捷函数

| 函数 | 描述 |
|------|------|
| `extractTextFromPDF(filePath, options)` | 提取文本 |
| `createPDFFromText(text, outputPath, options)` | 创建 PDF |
| `mergePDFs(inputPaths, outputPath, options)` | 合并 PDF |
| `splitPDF(inputPath, outputDir, options)` | 拆分 PDF |

---

**版本:** 1.0.0  
**作者:** Axon  
**最后更新:** 2026-03-13
