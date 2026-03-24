# PDF Lite Skill 使用示例

## 安装依赖

```bash
npm install pdf-parse
# 或
pnpm add pdf-parse
```

## 基础用法

### 1. 读取 PDF 信息

```typescript
import { readPDFInfo } from './pdf-lite-skill';

async function showPDFInfo() {
  const info = await readPDFInfo('./document.pdf');
  
  console.log('📄 PDF 信息:');
  console.log(`   总页数：${info.totalPages}`);
  console.log(`   文件大小：${(info.fileSize / 1024).toFixed(2)} KB`);
  console.log(`   PDF 版本：${info.version || '未知'}`);
  console.log(`   文件路径：${info.filePath}`);
}
```

### 2. 提取 PDF 文本

```typescript
import { extractText } from './pdf-lite-skill';

async function extractPDFText() {
  const result = await extractText('./document.pdf', {
    splitByPage: true  // 按页分割
  });
  
  console.log('📝 提取的文本:');
  console.log(`   字符数：${result.text.length}`);
  console.log(`   总页数：${result.info.totalPages}`);
  console.log('\n--- 前 500 字符 ---');
  console.log(result.text.substring(0, 500));
}
```

### 3. 批量处理多个 PDF

```typescript
import { extractTextBatch } from './pdf-lite-skill';

async function processMultiplePDFs() {
  const files = [
    './report-2024.pdf',
    './report-2025.pdf',
    './summary.pdf'
  ];
  
  const results = await extractTextBatch(files);
  
  console.log('📊 批量处理结果:');
  results.forEach(item => {
    if ('result' in item) {
      console.log(`✅ ${item.filePath}: ${item.result.text.length} 字符`);
    } else {
      console.log(`❌ ${item.filePath}: ${item.error}`);
    }
  });
}
```

## 实际场景

### 场景 1: PDF 内容搜索

```typescript
import { extractText } from './pdf-lite-skill';

async function searchInPDF(filePath: string, keyword: string) {
  const result = await extractText(filePath);
  const text = result.text.toLowerCase();
  const searchKeyword = keyword.toLowerCase();
  
  const occurrences = text.split(searchKeyword).length - 1;
  
  if (occurrences > 0) {
    console.log(`找到 "${keyword}" ${occurrences} 次`);
    
    // 显示第一次出现的位置
    const index = text.indexOf(searchKeyword);
    const context = result.text.substring(
      Math.max(0, index - 50),
      Math.min(result.text.length, index + keyword.length + 50)
    );
    console.log(`上下文：...${context}...`);
  } else {
    console.log(`未找到 "${keyword}"`);
  }
}
```

### 场景 2: PDF 内容摘要

```typescript
import { extractText } from './pdf-lite-skill';

async function summarizePDF(filePath: string, maxChars: number = 1000) {
  const result = await extractText(filePath);
  
  console.log(`📄 文件：${filePath}`);
  console.log(`📊 总页数：${result.info.totalPages}`);
  console.log(`📝 总字符：${result.text.length}`);
  
  if (result.text.length > maxChars) {
    console.log(`\n📋 摘要 (前 ${maxChars} 字符):`);
    console.log(result.text.substring(0, maxChars) + '...');
  } else {
    console.log('\n📋 完整内容:');
    console.log(result.text);
  }
}
```

### 场景 3: 验证 PDF 文件

```typescript
import { readPDFInfo } from './pdf-lite-skill';

async function validatePDF(filePath: string, minPages: number = 1) {
  try {
    const info = await readPDFInfo(filePath);
    
    if (info.totalPages < minPages) {
      console.log(`❌ 页数不足：${info.totalPages} < ${minPages}`);
      return false;
    }
    
    if (info.fileSize === 0) {
      console.log('❌ 文件为空');
      return false;
    }
    
    console.log('✅ PDF 验证通过');
    console.log(`   页数：${info.totalPages}`);
    console.log(`   大小：${(info.fileSize / 1024).toFixed(2)} KB`);
    return true;
  } catch (error) {
    console.log(`❌ 验证失败：${(error as Error).message}`);
    return false;
  }
}
```

## API 参考

### `readPDFInfo(filePath: string): Promise<PDFInfo>`

读取 PDF 文件基本信息。

**参数:**
- `filePath`: PDF 文件路径

**返回:**
```typescript
interface PDFInfo {
  totalPages: number;    // 总页数
  version?: string;      // PDF 版本
  fileSize: number;      // 文件大小 (bytes)
  filePath: string;      // 绝对路径
}
```

### `extractText(filePath: string, options?: object): Promise<ExtractedText>`

提取 PDF 文本内容。

**参数:**
- `filePath`: PDF 文件路径
- `options`: 
  - `splitByPage?: boolean` - 是否按页分割
  - `pageRange?: { start: number; end: number }` - 页码范围 (1-indexed)

**返回:**
```typescript
interface ExtractedText {
  text: string;      // 提取的文本
  pages: string[];   // 按页分割的文本
  info: PDFInfo;     // PDF 基本信息
}
```

### `extractTextBatch(filePaths: string[]): Promise<Array>`

批量提取多个 PDF 的文本。

**参数:**
- `filePaths`: PDF 文件路径数组

**返回:**
```typescript
Array<
  { filePath: string; result: ExtractedText } |  // 成功
  { filePath: string; error: string }            // 失败
>
```

## 错误处理

```typescript
import { extractText } from './pdf-lite-skill';

async function safeExtract(filePath: string) {
  try {
    const result = await extractText(filePath);
    return { success: true, data: result };
  } catch (error) {
    return { 
      success: false, 
      error: (error as Error).message 
    };
  }
}

// 常见错误:
// - "PDF 文件不存在：xxx"
// - "文件不是 PDF 格式：xxx"
// - "PDF 文件为空：xxx"
// - "提取 PDF 文本失败：xxx"
```

## 性能提示

1. **大文件处理**: 对于超过 10MB 的 PDF，建议使用流式处理
2. **批量操作**: 使用 `extractTextBatch` 进行批量处理，自动处理错误
3. **内存优化**: 处理完成后及时释放引用，避免内存泄漏

---

**文件大小**: ~4.7KB  
**依赖**: pdf-parse  
**作者**: Axon
