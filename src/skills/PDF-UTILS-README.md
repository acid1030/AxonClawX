# PDF 文档处理工具技能

> 📄 功能完整的 PDF 处理工具集 - 生成、合并、拆分、转图片

---

## 📦 安装依赖

```bash
npm install pdfkit pdf-lib pdf2pic puppeteer
```

### 依赖说明

| 包名 | 用途 | 大小 |
|------|------|------|
| `pdfkit` | PDF 生成 (从文本/矢量图形) | ~500KB |
| `pdf-lib` | PDF 合并/拆分/编辑 | ~800KB |
| `pdf2pic` | PDF 转图片 | ~200KB |
| `puppeteer` | HTML 转 PDF (基于 Chromium) | ~200MB |

---

## 🚀 快速开始

### 从文本生成 PDF

```typescript
import { generatePdfFromText } from './pdf-utils-skill';

await generatePdfFromText('Hello World', './output.pdf');
```

### 合并 PDF

```typescript
import { mergePdfs } from './pdf-utils-skill';

await mergePdfs(['file1.pdf', 'file2.pdf'], './merged.pdf');
```

### PDF 转图片

```typescript
import { pdfToImages } from './pdf-utils-skill';

const images = await pdfToImages('./document.pdf', { format: 'png' });
```

---

## 📖 API 文档

### 生成功能

#### `generatePdfFromText(text, outputPath, options?)`

从纯文本生成 PDF 文档。

**参数:**
- `text: string` - 文本内容
- `outputPath: string` - 输出文件路径
- `options?: PdfGenerateOptions` - 生成选项

**选项:**
```typescript
{
  pageSize: 'A4' | 'A3' | 'A5' | 'Letter' | { width, height },
  margins: { top, bottom, left, right }, // 英寸
  fontSize: number,      // 默认 12
  font: string,          // 默认 'Helvetica'
  lineHeight: number,    // 默认 1.5
  addPageNumbers: boolean,
  pageNumberPosition: 'bottom-center' | 'bottom-right' | 'top-center' | 'top-right'
}
```

**示例:**
```typescript
await generatePdfFromText('报告内容...', './report.pdf', {
  pageSize: 'A4',
  fontSize: 14,
  addPageNumbers: true,
});
```

---

#### `generatePdfFromHtml(html, outputPath, options?)`

从 HTML 内容生成 PDF (支持完整 CSS 样式)。

**参数:**
- `html: string` - HTML 内容或文件路径
- `outputPath: string` - 输出文件路径
- `options?: object` - 生成选项

**选项:**
```typescript
{
  isFilePath: boolean,   // html 是否是文件路径，默认 false
  format: 'A4' | 'Letter' | 'Legal',
  printBackground: boolean,
  margin: { top, bottom, left, right } // CSS 单位 (如 '20mm')
}
```

**示例:**
```typescript
const html = '<h1 style="color: blue">标题</h1><p>内容</p>';
await generatePdfFromHtml(html, './styled.pdf', {
  format: 'A4',
  printBackground: true,
});
```

---

### 合并/拆分功能

#### `mergePdfs(pdfPaths, outputPath, options?)`

合并多个 PDF 文件为一个。

**参数:**
- `pdfPaths: string[]` - PDF 文件路径数组
- `outputPath: string` - 输出文件路径

**示例:**
```typescript
await mergePdfs(
  ['cover.pdf', 'chapter1.pdf', 'chapter2.pdf'],
  './book.pdf'
);
```

---

#### `splitPdf(pdfPath, options?)`

将 PDF 拆分为单页文件。

**参数:**
- `pdfPath: string` - PDF 文件路径
- `options?: PdfSplitOptions` - 拆分选项

**选项:**
```typescript
{
  outputDir: string,      // 输出目录，默认 './split'
  filenamePrefix: string, // 文件名前缀，默认 'page-'
  pageRange: string       // 页面范围，如 '1-5' 或 '1,3,5'
}
```

**示例:**
```typescript
const pages = await splitPdf('./document.pdf', {
  outputDir: './pages',
  pageRange: '1-10',
});
// 生成：pages/page-001.pdf, pages/page-002.pdf, ...
```

---

#### `extractPages(pdfPath, pageRange, outputPath)`

提取 PDF 指定页面范围。

**参数:**
- `pdfPath: string` - PDF 文件路径
- `pageRange: string` - 页面范围 (如 '1-3' 或 '1,3,5')
- `outputPath: string` - 输出文件路径

**示例:**
```typescript
await extractPages('./document.pdf', '1,3,5-7', './extracted.pdf');
// 提取第 1、3、5、6、7 页
```

---

### 转图片功能

#### `pdfToImages(pdfPath, options?)`

将 PDF 所有页面转换为图片。

**参数:**
- `pdfPath: string` - PDF 文件路径
- `options?: PdfToImageOptions` - 转换选项

**选项:**
```typescript
{
  outputDir: string,      // 输出目录，默认 './images'
  filenamePrefix: string, // 文件名前缀，默认 'page-'
  format: 'png' | 'jpeg' | 'webp',
  quality: number,        // 0-100，默认 90
  scale: number,          // 缩放倍数，默认 2 (200%)
  dpi: number,            // DPI，默认 144
  pageRange: string       // 页面范围
}
```

**示例:**
```typescript
const images = await pdfToImages('./document.pdf', {
  format: 'png',
  scale: 3,
  dpi: 300,
  pageRange: '1-5',
});
```

---

#### `pdfPageToImage(pdfPath, pageNumber, outputPath, options?)`

将 PDF 特定页面转换为图片。

**参数:**
- `pdfPath: string` - PDF 文件路径
- `pageNumber: number` - 页码 (从 1 开始)
- `outputPath: string` - 输出文件路径
- `options?: object` - 转换选项

**示例:**
```typescript
await pdfPageToImage('./document.pdf', 1, './cover.png', {
  format: 'jpeg',
  quality: 95,
  scale: 4, // 400% 高质量
});
```

---

### 信息查询

#### `getPdfInfo(pdfPath)`

获取 PDF 文件信息。

**返回:**
```typescript
{
  pageCount: number,      // 总页数
  fileSize: number,       // 文件大小 (字节)
  filePath: string,       // 文件路径
  createdAt?: Date,       // 创建时间
  modifiedAt?: Date       // 修改时间
}
```

**示例:**
```typescript
const info = await getPdfInfo('./document.pdf');
console.log(`共 ${info.pageCount} 页，${(info.fileSize / 1024).toFixed(2)} KB`);
```

---

### 批量操作

#### `batchPdfToImages(pdfPaths, options?)`

批量转换多个 PDF 为图片。

**示例:**
```typescript
const allImages = await batchPdfToImages(
  ['file1.pdf', 'file2.pdf', 'file3.pdf'],
  { format: 'png' }
);
// 返回：string[][] (每个 PDF 对应的图片数组)
```

---

#### `batchMergePdfs(groups, outputPaths)`

批量合并多组 PDF。

**示例:**
```typescript
const merged = await batchMergePdfs(
  [
    ['a1.pdf', 'a2.pdf'],  // 第一组
    ['b1.pdf', 'b2.pdf'],  // 第二组
  ],
  ['merged-a.pdf', 'merged-b.pdf']
);
```

---

## 🎯 便捷 API

使用 `PdfUtils` 对象可以更方便地访问所有功能:

```typescript
import { PdfUtils } from './pdf-utils-skill';

// 生成
await PdfUtils.generateFromText('内容', './output.pdf');
await PdfUtils.generateFromHtml('<h1>HTML</h1>', './output.pdf');

// 合并/拆分
await PdfUtils.merge(['a.pdf', 'b.pdf'], './merged.pdf');
await PdfUtils.split('./document.pdf');
await PdfUtils.extractPages('./document.pdf', '1-3', './extracted.pdf');

// 转图片
await PdfUtils.toImages('./document.pdf');
await PdfUtils.pageToImage('./document.pdf', 1, './page1.png');
await PdfUtils.batchToImages(['a.pdf', 'b.pdf']);

// 信息
const info = await PdfUtils.getInfo('./document.pdf');
```

---

## 📝 完整示例

### 生成带样式的报告

```typescript
import { PdfUtils } from './pdf-utils-skill';

async function createReport() {
  // 1. 生成封面
  await PdfUtils.generateFromText(
    `项目周报\n${new Date().toLocaleDateString()}\n\n机密`,
    './cover.pdf',
    { fontSize: 24, addPageNumbers: false }
  );
  
  // 2. 生成内容
  await PdfUtils.generateFromText(
    `本周完成:\n- 功能开发\n- Bug 修复\n- 文档更新`,
    './content.pdf',
    { addPageNumbers: true }
  );
  
  // 3. 合并
  await PdfUtils.merge(['./cover.pdf', './content.pdf'], './report.pdf');
  
  // 4. 生成预览图
  await PdfUtils.pageToImage('./report.pdf', 1, './preview.png');
  
  console.log('报告生成完成!');
}
```

---

## ⚠️ 注意事项

1. **内存使用**: 大文件处理时注意内存占用
2. **中文字体**: 使用 `pdfkit` 时，中文需要加载中文字体文件
3. **HTML 转 PDF**: `puppeteer` 首次运行会下载 Chromium (~170MB)
4. **图片质量**: 高 DPI 转换会显著增加文件大小
5. **文件路径**: 确保输出目录存在或会自动创建

---

## 🐛 常见问题

### Q: 中文显示为方块？
A: `pdfkit` 默认不支持中文，需要加载中文字体:
```typescript
doc.font('./path/to/chinese-font.ttf', fontSize);
```

### Q: HTML 转 PDF 很慢？
A: `puppeteer` 首次启动较慢，可复用 browser 实例:
```typescript
const browser = await puppeteer.launch();
// 多次使用同一个 browser
await browser.close();
```

### Q: 图片质量不够高？
A: 增加 `scale` 和 `dpi` 参数:
```typescript
await pdfToImages('./doc.pdf', { scale: 4, dpi: 300 });
```

---

## 📄 许可证

MIT License

---

**最后更新:** 2026-03-13  
**版本:** 1.0.0
