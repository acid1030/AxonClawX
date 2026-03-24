# PDF Processor Skill

PDF 处理技能 - 提供完整的 PDF 读取、生成、合并/拆分功能。

---

## 📦 安装

```bash
npm install pdf-lib pdf-parse --save
```

---

## 🚀 快速开始

### 1. 提取 PDF 文本

```typescript
import { extractTextFromPDF } from './pdf-processor-skill';

const result = await extractTextFromPDF('./document.pdf', {
  extractMetadata: true,
});

console.log(result.text);        // 文本内容
console.log(result.metadata);    // 元数据 (作者、页数等)
```

### 2. 创建 PDF

```typescript
import { createPDFFromText } from './pdf-processor-skill';

await createPDFFromText(
  'Hello, World!',
  './output.pdf',
  { fontSize: 14, font: 'helvetica' }
);
```

### 3. 合并 PDF

```typescript
import { mergePDFs } from './pdf-processor-skill';

await mergePDFs(
  ['./doc1.pdf', './doc2.pdf'],
  './merged.pdf'
);
```

### 4. 拆分 PDF

```typescript
import { splitPDF } from './pdf-processor-skill';

const result = await splitPDF('./large.pdf', './output', {
  pagesPerFile: 5,
});

console.log(result.files);  // 拆分后的文件列表
```

---

## 📖 完整文档

- [使用示例](./pdf-processor-skill.examples.md)
- [测试文件](./pdf-processor-skill.test.ts)
- [源代码](./pdf-processor-skill.ts)

---

## 🔧 API 概览

### 类：PDFProcessor

| 方法 | 描述 |
|------|------|
| `extractText(filePath, options)` | 从 PDF 提取文本 |
| `getPageInfo(filePath)` | 获取页面信息 |
| `createFromText(text, outputPath, options)` | 从文本创建 PDF |
| `createFromImages(imagePaths, outputPath, options)` | 从图片创建 PDF |
| `mergePDFs(inputPaths, options)` | 合并多个 PDF |
| `splitPDF(inputPath, options)` | 拆分 PDF |
| `extractPages(inputPath, pageNumbers, outputPath)` | 提取指定页面 |

### 快捷函数

- `extractTextFromPDF()` - 提取文本
- `createPDFFromText()` - 创建 PDF
- `mergePDFs()` - 合并 PDF
- `splitPDF()` - 拆分 PDF

---

## 📝 类型定义

```typescript
interface ExtractTextOptions {
  preserveNewlines?: boolean;
  extractMetadata?: boolean;
  pageRange?: { start: number; end: number };
  splitByPage?: boolean;
}

interface CreatePDFOptions {
  fontSize?: number;
  font?: 'helvetica' | 'times' | 'courier';
  margin?: number;
  pageSize?: 'A4' | 'Letter' | 'Legal' | 'Tabloid';
  textColor?: { r: number; g: number; b: number };
}

interface MergePDFOptions {
  outputPath: string;
  addBookmarks?: boolean;
}

interface SplitPDFOptions {
  outputDir: string;
  filenamePrefix?: string;
  pagesPerFile?: number;
  ranges?: Array<{ start: number; end: number }>;
}
```

---

## ⚠️ 注意事项

1. **文件路径**: 所有路径支持相对路径和绝对路径
2. **编码**: PDF 文本提取可能受原始 PDF 编码影响
3. **字体**: 仅支持标准字体 (Helvetica, Times, Courier 等)
4. **中文支持**: 中文文本可能需要嵌入字体 (高级功能)
5. **大文件**: 处理大文件时建议分批处理

---

## 🧪 运行测试

```bash
npm test -- pdf-processor-skill.test.ts
```

---

## 📄 许可证

MIT License

---

**版本:** 1.0.0  
**作者:** Axon  
**创建日期:** 2026-03-13
