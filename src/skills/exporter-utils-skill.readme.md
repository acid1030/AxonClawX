# Exporter Utils Skill - 数据导出工具

**版本:** 1.0.0  
**作者:** Axon  
**创建时间:** 2026-03-13

---

## 📋 功能概览

| 功能 | 状态 | 说明 |
|------|------|------|
| CSV 导出 | ✅ | 支持自定义分隔符、编码、字段选择 |
| Excel 导出 | ✅ | 支持多工作表、样式、Excel XML 格式 |
| PDF 导出 | ⚠️ | 生成 HTML，需 Puppeteer 转换为 PDF |
| 批量导出 | ✅ | 同时导出多种格式 |
| 进度追踪 | 🔜 | 计划中 |
| 流式导出 | 🔜 | 计划中 |

---

## 🚀 快速开始

```typescript
import { exportData, exportToCSV, exportToExcel, exportToPDF } from './exporter-utils-skill';

const data = [
  { name: 'Alice', age: 30, email: 'alice@example.com' },
  { name: 'Bob', age: 25, email: 'bob@example.com' }
];

// CSV 导出
exportToCSV(data, {
  format: 'csv',
  outputPath: './exports/users.csv'
});

// Excel 导出
exportToExcel(data, {
  format: 'xlsx',
  outputPath: './exports/users.xlsx',
  sheetName: 'Users'
});

// PDF 导出
exportToPDF(data, {
  format: 'pdf',
  outputPath: './exports/users.pdf',
  title: 'User Report'
});
```

---

## 📦 API 参考

### 导出函数

| 函数 | 描述 | 返回值 |
|------|------|--------|
| `exportToCSV(data, config)` | 导出为 CSV | `ExportResult` |
| `exportToExcel(data, config)` | 导出为 Excel | `ExportResult` |
| `exportToPDF(data, config)` | 导出为 PDF (HTML) | `ExportResult` |
| `exportData(data, config)` | 通用导出函数 | `ExportResult` |
| `exportBatch(data, configs)` | 批量导出 | `ExportResult[]` |

### ExportResult

```typescript
interface ExportResult {
  success: boolean;      // 是否成功
  outputPath: string;    // 输出文件路径
  recordCount: number;   // 导出记录数
  fileSize: number;      // 文件大小 (字节)
  exportTime: number;    // 导出时间 (毫秒)
  error?: string;        // 错误信息 (如果失败)
}
```

---

## 📖 详细文档

- **使用示例:** [exporter-utils-skill.examples.md](./exporter-utils-skill.examples.md)
- **源码:** [exporter-utils-skill.ts](./exporter-utils-skill.ts)

---

## ⚠️ 注意事项

1. **PDF 导出**: 当前实现生成 HTML 文件，可通过浏览器打印为 PDF 或使用 Puppeteer 自动转换
2. **Excel 格式**: 导出的是 Excel XML 格式，可用 Excel 打开
3. **文件覆盖**: 默认不覆盖已存在文件，需设置 `overwrite: true`
4. **大数据集**: 建议分批导出，避免内存溢出

---

## 🛠️ 依赖

- Node.js 内置模块：`fs`, `path`
- 无需外部依赖

---

## 📝 更新日志

### v1.0.0 (2026-03-13)
- ✅ 初始版本
- ✅ CSV 导出功能
- ✅ Excel 导出功能
- ✅ PDF 导出功能 (HTML 生成)
- ✅ 批量导出功能

---

**任务完成时间:** < 5 分钟 ✅
