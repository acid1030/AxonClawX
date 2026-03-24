# Exporter Utils Skill - 使用示例

数据导出工具技能，支持 CSV、Excel、PDF 三种格式导出。

---

## 📦 快速开始

```typescript
import { exportData, exportToCSV, exportToExcel, exportToPDF } from './exporter-utils-skill';

const sampleData = [
  { id: 1, name: 'Alice', age: 30, email: 'alice@example.com', department: 'Engineering' },
  { id: 2, name: 'Bob', age: 25, email: 'bob@example.com', department: 'Marketing' },
  { id: 3, name: 'Charlie', age: 35, email: 'charlie@example.com', department: 'Sales' }
];
```

---

## 1️⃣ CSV 导出

### 基础示例

```typescript
const result = exportToCSV(sampleData, {
  format: 'csv',
  outputPath: './exports/users.csv'
});

console.log(result);
// {
//   success: true,
//   outputPath: './exports/users.csv',
//   recordCount: 3,
//   fileSize: 256,
//   exportTime: 12
// }
```

### 自定义分隔符

```typescript
const result = exportToCSV(sampleData, {
  format: 'csv',
  outputPath: './exports/users.tsv',
  delimiter: '\t',  // Tab 分隔
  includeHeader: true
});
```

### 选择字段

```typescript
const result = exportToCSV(sampleData, {
  format: 'csv',
  outputPath: './exports/users.csv',
  fields: ['name', 'email'],  // 只导出这两个字段
  includeHeader: true
});
```

### 自定义引号字符

```typescript
const result = exportToCSV(sampleData, {
  format: 'csv',
  outputPath: './exports/users.csv',
  quoteChar: "'",  // 使用单引号
  delimiter: ',',
  encoding: 'utf-8'
});
```

### 覆盖已存在文件

```typescript
const result = exportToCSV(sampleData, {
  format: 'csv',
  outputPath: './exports/users.csv',
  overwrite: true  // 允许覆盖
});
```

---

## 2️⃣ Excel 导出

### 基础示例

```typescript
const result = exportToExcel(sampleData, {
  format: 'xlsx',
  outputPath: './exports/users.xlsx',
  sheetName: 'Users'
});

console.log(result);
// {
//   success: true,
//   outputPath: './exports/users.xlsx',
//   recordCount: 3,
//   fileSize: 4096,
//   exportTime: 25
// }
```

### 自定义表头样式

```typescript
const result = exportToExcel(sampleData, {
  format: 'xlsx',
  outputPath: './exports/users.xlsx',
  sheetName: 'Employee List',
  fields: ['name', 'age', 'email', 'department'],
  headerStyle: {
    bold: true,
    backgroundColor: '#4F46E5',  // 靛蓝色背景
    color: '#FFFFFF'              // 白色文字
  }
});
```

### 多工作表导出

```typescript
const result = exportToExcel(sampleData, {
  format: 'xlsx',
  outputPath: './exports/report.xlsx',
  sheets: [
    {
      name: 'Engineering',
      data: sampleData.filter(d => d.department === 'Engineering'),
      fields: ['name', 'email']
    },
    {
      name: 'Marketing',
      data: sampleData.filter(d => d.department === 'Marketing'),
      fields: ['name', 'email']
    },
    {
      name: 'Sales',
      data: sampleData.filter(d => d.department === 'Sales'),
      fields: ['name', 'email']
    }
  ]
});
```

### 自动调整列宽

```typescript
const result = exportToExcel(sampleData, {
  format: 'xlsx',
  outputPath: './exports/users.xlsx',
  autoWidth: true,
  includeBorders: true
});
```

---

## 3️⃣ PDF 导出

### 基础示例

```typescript
const result = exportToPDF(sampleData, {
  format: 'pdf',
  outputPath: './exports/users.pdf',
  title: 'Employee List'
});

console.log(result);
// {
//   success: true,
//   outputPath: './exports/users.html',  // 生成 HTML 文件
//   recordCount: 3,
//   fileSize: 2048,
//   exportTime: 18,
//   error: 'PDF requires puppeteer/pdfkit. HTML generated at: ./exports/users.html'
// }
// 注意：当前实现生成 HTML，可通过浏览器打印为 PDF
```

### 自定义页面设置

```typescript
const result = exportToPDF(sampleData, {
  format: 'pdf',
  outputPath: './exports/report.pdf',
  title: 'Quarterly Report',
  pageSize: 'A4',
  orientation: 'landscape',  // 横向
  margins: {
    top: 20,
    bottom: 20,
    left: 15,
    right: 15
  },
  showPageNumbers: true
});
```

### 自定义表格样式

```typescript
const result = exportToPDF(sampleData, {
  format: 'pdf',
  outputPath: './exports/users.pdf',
  title: 'Employee Directory',
  fields: ['name', 'age', 'email', 'department'],
  tableStyle: {
    headerBackgroundColor: '#10B981',  // 绿色表头
    headerColor: '#FFFFFF',
    rowColors: ['#FFFFFF', '#F0FDF4'],  // 斑马纹
    borderColor: '#D1FAE5'
  },
  fontSize: 11
});
```

### 使用 Puppeteer 生成真实 PDF

```typescript
import { exportToPDF } from './exporter-utils-skill';
import puppeteer from 'puppeteer';

async function generateRealPDF(data: any[], outputPath: string) {
  // 1. 生成 HTML
  const htmlResult = exportToPDF(data, {
    format: 'pdf',
    outputPath: outputPath,
    title: 'Report'
  });
  
  if (!htmlResult.success) {
    throw new Error(htmlResult.error);
  }
  
  // 2. 使用 Puppeteer 转换为 PDF
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  await page.goto(`file://${htmlResult.outputPath}`, {
    waitUntil: 'networkidle0'
  });
  
  await page.pdf({
    path: outputPath,
    format: 'A4',
    printBackground: true
  });
  
  await browser.close();
  
  return { success: true, outputPath };
}
```

---

## 4️⃣ 通用导出函数

### 自动格式选择

```typescript
// CSV
const csvResult = exportData(sampleData, {
  format: 'csv',
  outputPath: './exports/data.csv'
});

// Excel
const excelResult = exportData(sampleData, {
  format: 'xlsx',
  outputPath: './exports/data.xlsx'
});

// PDF
const pdfResult = exportData(sampleData, {
  format: 'pdf',
  outputPath: './exports/data.pdf',
  title: 'Data Report'
});
```

---

## 5️⃣ 批量导出

### 同时导出多种格式

```typescript
import { exportBatch } from './exporter-utils-skill';

const results = exportBatch(sampleData, [
  {
    format: 'csv',
    outputPath: './exports/users.csv',
    fields: ['name', 'email']
  },
  {
    format: 'xlsx',
    outputPath: './exports/users.xlsx',
    sheetName: 'Users',
    headerStyle: {
      bold: true,
      backgroundColor: '#4F46E5',
      color: '#FFFFFF'
    }
  },
  {
    format: 'pdf',
    outputPath: './exports/users.pdf',
    title: 'User Report',
    pageSize: 'A4'
  }
]);

// 检查结果
results.forEach((result, index) => {
  console.log(`Export ${index + 1}:`, result.success ? '✅' : '❌', result.outputPath);
});
```

---

## 6️⃣ 实际应用场景

### 场景 1: 导出用户报告

```typescript
interface User {
  id: number;
  name: string;
  email: string;
  createdAt: string;
  status: 'active' | 'inactive';
}

const users: User[] = await db.users.findAll();

// 导出活跃用户
const activeUsers = users.filter(u => u.status === 'active');

exportToExcel(activeUsers, {
  format: 'xlsx',
  outputPath: './reports/active-users.xlsx',
  sheetName: 'Active Users',
  fields: ['name', 'email', 'createdAt'],
  headerStyle: {
    bold: true,
    backgroundColor: '#10B981',
    color: '#FFFFFF'
  }
});
```

### 场景 2: 导出数据备份

```typescript
async function backupData() {
  const data = await fetchAllData();
  const timestamp = new Date().toISOString().slice(0, 10);
  
  const results = exportBatch(data, [
    {
      format: 'csv',
      outputPath: `./backups/data_${timestamp}.csv`,
      overwrite: true
    },
    {
      format: 'xlsx',
      outputPath: `./backups/data_${timestamp}.xlsx`,
      overwrite: true
    }
  ]);
  
  const allSuccess = results.every(r => r.success);
  console.log(`Backup ${allSuccess ? 'successful' : 'failed'}`);
  
  return allSuccess;
}
```

### 场景 3: 生成 PDF 发票

```typescript
interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

const invoiceItems: InvoiceItem[] = [
  { description: 'Web Development', quantity: 40, unitPrice: 100, total: 4000 },
  { description: 'Design', quantity: 20, unitPrice: 80, total: 1600 }
];

exportToPDF(invoiceItems, {
  format: 'pdf',
  outputPath: './invoices/invoice-001.pdf',
  title: 'Invoice #001',
  fields: ['description', 'quantity', 'unitPrice', 'total'],
  orientation: 'landscape',
  tableStyle: {
    headerBackgroundColor: '#1F2937',
    headerColor: '#FFFFFF',
    rowColors: ['#FFFFFF', '#F9FAFB']
  }
});
```

### 场景 4: 导出数据分析报告

```typescript
async function exportAnalyticsReport(startDate: string, endDate: string) {
  const analytics = await getAnalyticsData(startDate, endDate);
  
  // 导出 CSV (用于进一步分析)
  exportToCSV(analytics, {
    format: 'csv',
    outputPath: './analytics/raw_data.csv',
    delimiter: ','
  });
  
  // 导出 Excel (带格式的报告)
  exportToExcel(analytics, {
    format: 'xlsx',
    outputPath: './analytics/report.xlsx',
    sheetName: 'Analytics',
    headerStyle: {
      bold: true,
      backgroundColor: '#6366F1',
      color: '#FFFFFF'
    }
  });
  
  // 导出 PDF (用于分享)
  exportToPDF(analytics, {
    format: 'pdf',
    outputPath: './analytics/summary.pdf',
    title: `Analytics Report (${startDate} - ${endDate})`,
    orientation: 'landscape'
  });
}
```

---

## 7️⃣ 错误处理

```typescript
try {
  const result = exportToCSV(largeData, {
    format: 'csv',
    outputPath: './exports/large.csv'
  });
  
  if (!result.success) {
    console.error('Export failed:', result.error);
  } else {
    console.log(`Exported ${result.recordCount} records in ${result.exportTime}ms`);
    console.log(`File size: ${(result.fileSize / 1024).toFixed(2)} KB`);
  }
} catch (error) {
  console.error('Unexpected error:', error);
}
```

---

## 8️⃣ 性能优化建议

### 大数据集导出

```typescript
// 分批导出大数据集
async function exportLargeDataset(data: any[], chunkSize: number = 10000) {
  const chunks = [];
  for (let i = 0; i < data.length; i += chunkSize) {
    chunks.push(data.slice(i, i + chunkSize));
  }
  
  const results = [];
  for (let i = 0; i < chunks.length; i++) {
    const result = exportToCSV(chunks[i], {
      format: 'csv',
      outputPath: `./exports/data_part_${i + 1}.csv`,
      includeHeader: i === 0  // 只在第一个文件包含表头
    });
    results.push(result);
  }
  
  return results;
}
```

---

## 📊 API 参考

### 类型定义

```typescript
type ExportFormat = 'csv' | 'excel' | 'xlsx' | 'pdf';

interface ExportResult {
  success: boolean;
  outputPath: string;
  recordCount: number;
  fileSize: number;
  exportTime: number;
  error?: string;
}
```

### 函数签名

```typescript
function exportToCSV(data: any[], config: CSVExportConfig): ExportResult;
function exportToExcel(data: any[], config: ExcelExportConfig): ExportResult;
function exportToPDF(data: any[], config: PDFExportConfig): ExportResult;
function exportData(data: any[], config: ExportConfig): ExportResult;
function exportBatch(data: any[], configs: ExportConfig[]): ExportResult[];
```

---

## ⚠️ 注意事项

1. **PDF 导出**: 当前实现生成 HTML 文件，需要手动通过浏览器打印为 PDF 或使用 Puppeteer 自动转换
2. **Excel 格式**: 导出的是 Excel XML 格式 (.xlsx 扩展名)，可用 Excel 打开
3. **文件覆盖**: 默认不覆盖已存在文件，需设置 `overwrite: true`
4. **大数据集**: 建议分批导出，避免内存溢出
5. **嵌套字段**: 支持点号访问嵌套属性 (如 `'user.name'`)

---

**版本:** 1.0.0  
**作者:** Axon  
**最后更新:** 2026-03-13
