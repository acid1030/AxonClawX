# 🔧 ACE 数据解析工具

**版本:** 1.0.0  
**作者:** Axon (ACE Subagent)  
**创建时间:** 2026-03-13  
**交付时间:** 5 分钟

---

## 📋 功能概览

| 功能 | 描述 | 状态 |
|------|------|------|
| **JSON 解析** | 支持嵌套、数组、错误处理、深度检查 | ✅ |
| **CSV 解析** | 支持表头、分隔符配置、引号处理、类型转换 | ✅ |
| **XML 解析** | 支持标签、属性、文本内容、自闭合标签 | ✅ |
| **格式转换** | JSON ↔ CSV ↔ XML 互转 | ✅ |

---

## 🚀 快速开始

### 安装

无需安装，直接使用：

```typescript
import { parseJSON, parseCSV, parseXML } from './parser-utils-skill';
```

### 基础用法

#### JSON 解析

```typescript
import { parseJSON } from './parser-utils-skill';

const result = parseJSON('{"name": "Axon", "version": "1.0"}');

if (result.success) {
  console.log(result.data); // { name: 'Axon', version: '1.0' }
} else {
  console.error(result.error);
}
```

#### CSV 解析

```typescript
import { parseCSV } from './parser-utils-skill';

const csv = `name,age,city
Axon,30,Beijing
KAEL,28,Shanghai`;

const result = parseCSV(csv);

if (result.success && result.data) {
  console.log(result.data);
  // [{ name: 'Axon', age: 30, city: 'Beijing' }, ...]
  console.log(`行数：${result.metadata?.rowCount}`);
  console.log(`列数：${result.metadata?.columnCount}`);
}
```

#### XML 解析

```typescript
import { parseXML } from './parser-utils-skill';

const xml = `
  <project name="AxonClaw">
    <module name="parser">
      <feature>JSON</feature>
      <feature>CSV</feature>
    </module>
  </project>
`;

const result = parseXML(xml);

if (result.success && result.data) {
  console.log(result.data);
  /*
  {
    tag: 'project',
    attributes: { name: 'AxonClaw' },
    children: [
      {
        tag: 'module',
        attributes: { name: 'parser' },
        children: [
          { tag: 'feature', text: 'JSON' },
          { tag: 'feature', text: 'CSV' }
        ]
      }
    ]
  }
  */
}
```

---

## 📖 API 文档

### parseJSON

```typescript
function parseJSON(jsonString: string, options?: JSONParseOptions): ParseResult<any>
```

**参数:**

| 参数 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| jsonString | string | - | JSON 字符串 |
| options.allowEmpty | boolean | false | 是否允许空值 |
| options.maxDepth | number | 100 | 最大嵌套深度 |
| options.validate | boolean | false | 是否验证结构 |

**返回:**

```typescript
interface ParseResult {
  success: boolean;
  data?: any;
  error?: string;
  warnings?: string[];
  metadata?: { parseTime?: number };
}
```

---

### parseCSV

```typescript
function parseCSV(csvString: string, options?: CSVParseOptions): ParseResult<CSVRow[]>
```

**参数:**

| 参数 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| csvString | string | - | CSV 字符串 |
| options.delimiter | string | ',' | 列分隔符 |
| options.hasHeader | boolean | true | 是否有表头 |
| options.quoteChar | string | '"' | 引号字符 |
| options.trim | boolean | true | 是否去除空格 |
| options.skipEmptyLines | boolean | true | 是否跳过空行 |
| options.columnNames | string[] | - | 自定义列名 |

**返回:**

```typescript
interface ParseResult {
  success: boolean;
  data?: CSVRow[];
  error?: string;
  warnings?: string[];
  metadata?: { rowCount?: number; columnCount?: number; parseTime?: number };
}

interface CSVRow {
  [key: string]: string | number | boolean | null;
}
```

---

### parseXML

```typescript
function parseXML(xmlString: string, options?: XMLParseOptions): ParseResult<XMLNode | XMLNode[]>
```

**参数:**

| 参数 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| xmlString | string | - | XML 字符串 |
| options.includeAttributes | boolean | true | 是否保留属性 |
| options.includeText | boolean | true | 是否保留文本 |
| options.compact | boolean | false | 是否压缩空节点 |

**返回:**

```typescript
interface ParseResult {
  success: boolean;
  data?: XMLNode | XMLNode[];
  error?: string;
  warnings?: string[];
  metadata?: { parseTime?: number };
}

interface XMLNode {
  tag: string;
  attributes?: Record<string, string>;
  children?: XMLNode[];
  text?: string;
}
```

---

### 转换工具

```typescript
// JSON 对象 → 字符串
function toJSON(data: any, pretty?: boolean): string;

// CSV 数组 → 字符串
function toCSV(rows: CSVRow[], options?: CSVParseOptions): string;

// XML 节点 → 字符串
function toXML(node: XMLNode, indent?: number): string;
```

---

## 💡 使用场景

### 1. 配置文件解析

```typescript
const config = parseJSON(configFile);
if (config.success) {
  initializeApp(config.data);
}
```

### 2. 数据导入

```typescript
const users = parseCSV(userImportFile, {
  delimiter: ';',
  hasHeader: true
});
```

### 3. API 响应处理

```typescript
const response = await fetch('/api/data');
const text = await response.text();
const result = parseJSON(text);

if (result.success) {
  renderData(result.data);
} else {
  showError(result.error);
}
```

### 4. 格式转换

```typescript
// JSON → CSV
const jsonData = parseJSON(jsonFile);
const csvOutput = toCSV(jsonData.data);

// CSV → JSON
const csvData = parseCSV(csvFile);
const jsonOutput = toJSON(csvData.data);
```

---

## ⚠️ 注意事项

1. **性能**: 大文件解析会消耗更多内存，建议分块处理
2. **深度限制**: JSON 默认最大深度 100，可配置
3. **编码**: 确保输入为 UTF-8 编码
4. **错误处理**: 始终检查 `result.success`
5. **XML 环境**: 浏览器使用 DOMParser，Node.js 使用简单解析器

---

## 🧪 测试

运行示例文件:

```bash
cd /Users/nike/.openclaw/workspace/src/skills
npx ts-node parser-utils-skill.examples.ts
```

或导入示例函数:

```typescript
import { runAllExamples } from './parser-utils-skill.examples';
runAllExamples();
```

---

## 📁 文件结构

```
src/skills/
├── parser-utils-skill.ts          # 核心解析工具
├── parser-utils-skill.examples.ts # 使用示例
└── PARSER-README.md               # 本文档
```

---

## 🎯 交付清单

- [x] `src/skills/parser-utils-skill.ts` - 核心工具 (15.6 KB)
- [x] `src/skills/parser-utils-skill.examples.ts` - 使用示例 (8.2 KB)
- [x] `src/skills/PARSER-README.md` - 文档
- [x] JSON 解析功能
- [x] CSV 解析功能
- [x] XML 解析功能
- [x] 格式转换工具
- [x] 完整类型定义
- [x] 错误处理
- [x] 使用示例 (14 个)

---

**交付完成时间:** 5 分钟内  
**交付状态:** ✅ 完成
