# 数据导入工具使用示例

本文件展示如何使用 `importer-utils-skill.ts` 进行数据导入解析。

---

## 📦 安装依赖

Excel 解析需要安装 `xlsx` 库：

```bash
npm install xlsx
# 或
yarn add xlsx
# 或
pnpm add xlsx
```

CSV 和 JSON 解析使用 Node.js 原生模块，无需额外依赖。

---

## 🔧 导入模块

```typescript
import {
  parseCSV,
  parseJSON,
  parseExcel,
  parseFile,
  exportToCSV,
  exportToJSON,
  exportToExcel,
  getFileInfo,
  validateData,
  ParseError
} from './src/skills/importer-utils-skill';
```

---

## 📊 CSV 解析示例

### 基础用法

```typescript
// 解析标准 CSV 文件
const result = await parseCSV('data/users.csv');

console.log('数据:', result.data);
// 输出：[{name: '张三', age: '25', city: '北京'}, ...]
console.log('列名:', result.columns);
// 输出：['name', 'age', 'city']
console.log('总行数:', result.totalRows);
console.log('解析耗时:', result.duration, 'ms');
```

### 自定义分隔符 (TSV)

```typescript
const result = await parseCSV('data/users.tsv', {
  delimiter: '\t',  // 制表符分隔
  encoding: 'utf-8'
});
```

### 无表头文件

```typescript
const result = await parseCSV('data/raw.csv', {
  hasHeader: false,
  headers: ['id', 'name', 'email', 'phone']  // 自定义表头
});
```

### 限制行数 (预览)

```typescript
// 只读取前 100 行进行预览
const result = await parseCSV('data/large.csv', {
  limit: 100
});
```

### 处理引号和转义

```typescript
// 自动处理包含逗号、引号的字段
// 示例 CSV: "Smith, John","30","New York, NY"
const result = await parseCSV('data/quoted.csv');
// 正确解析为：{name: 'Smith, John', age: '30', city: 'New York, NY'}
```

### 导出为 CSV

```typescript
const data = [
  { name: '张三', age: 25, city: '北京' },
  { name: '李四', age: 30, city: '上海' },
  { name: '王五', age: 28, city: '广州' }
];

await exportToCSV(data, 'output/users.csv', {
  delimiter: ',',
  encoding: 'utf-8',
  includeHeader: true
});
```

---

## 📄 JSON 解析示例

### 基础用法

```typescript
// 解析 JSON 数组文件
const result = await parseJSON('data/users.json');

console.log('数据:', result.data);
// 输出：[{name: '张三', age: 25, city: '北京'}, ...]
console.log('列名:', result.columns);
```

### 解析嵌套 JSON

```typescript
// 自动提取嵌套对象的键
const data = [
  {
    name: '张三',
    address: {
      city: '北京',
      district: '朝阳'
    }
  }
];

await exportToJSON(data, 'temp.json');
const result = await parseJSON('temp.json', { nested: true });

console.log('列名:', result.columns);
// 输出：['name', 'address.city', 'address.district']
```

### 提取特定路径的数据

```typescript
// JSON 结构：{ users: [{name: '张三'}, ...], total: 100 }
const result = await parseJSON('data/api-response.json', {
  jsonPath: 'users'  // 提取 users 数组
});
```

### 流式处理大文件 (JSON Lines)

```typescript
// 适用于 .jsonl 文件或超大 JSON 数组
const result = await parseJSON('data/large.jsonl', {
  stream: true,
  limit: 10000  // 限制处理行数
});
```

### 导出为 JSON

```typescript
const data = [
  { name: '张三', age: 25, city: '北京' },
  { name: '李四', age: 30, city: '上海' }
];

// 格式化输出
await exportToJSON(data, 'output/users.json', {
  pretty: true,  // 美化格式
  encoding: 'utf-8'
});

// 紧凑输出 (最小化)
await exportToJSON(data, 'output/users.min.json', {
  pretty: false
});
```

---

## 📗 Excel 解析示例

### 基础用法

```typescript
// 解析第一个工作表
const result = await parseExcel('data/users.xlsx');

console.log('数据:', result.data);
console.log('工作表:', result.metadata?.sheetName);
```

### 指定工作表

```typescript
// 按名称
const result = await parseExcel('data/users.xlsx', {
  sheet: '用户列表'
});

// 按索引 (0 = 第一个工作表)
const result = await parseExcel('data/users.xlsx', {
  sheet: 1  // 第二个工作表
});
```

### 解析所有工作表

```typescript
const results = await parseExcel('data/users.xlsx', {
  allSheets: true
});

// 输出：{ 'Sheet1': ParseResult, 'Sheet2': ParseResult, ... }
for (const [sheetName, result] of Object.entries(results)) {
  console.log(`${sheetName}: ${result.totalRows} 行`);
}
```

### 保留原始数据类型

```typescript
// 默认会将数字、日期转换为字符串
// 设置 raw: true 保留原始类型
const result = await parseExcel('data/financial.xlsx', {
  raw: true  // 数字保持为 number，日期保持为 Date
});
```

### 导出为 Excel

```typescript
const data = [
  { name: '张三', age: 25, city: '北京' },
  { name: '李四', age: 30, city: '上海' },
  { name: '王五', age: 28, city: '广州' }
];

await exportToExcel(data, 'output/users.xlsx', {
  sheetName: '用户数据'
});
```

---

## 🔄 自动检测文件类型

```typescript
// 根据文件扩展名自动选择解析器
const result = await parseFile('data/users.csv');
const result = await parseFile('data/users.json');
const result = await parseFile('data/users.xlsx');

// 统一处理
async function importData(filePath: string) {
  try {
    const result = await parseFile(filePath);
    console.log(`成功导入 ${result.totalRows} 行数据`);
    return result.data;
  } catch (error) {
    if (error instanceof ParseError) {
      console.error(`解析失败 [${error.code}]: ${error.message}`);
    } else {
      console.error('未知错误:', error);
    }
  }
}
```

---

## 🔍 文件信息检测

```typescript
const info = getFileInfo('data/users.csv');

console.log('是否存在:', info.exists);
console.log('文件大小:', info.size, 'bytes');
console.log('扩展名:', info.ext);
console.log('类型:', info.type);  // 'csv' | 'json' | 'excel' | 'unknown'
```

---

## ✅ 数据验证

```typescript
const data = await parseCSV('data/users.csv');

// 验证数据是否包含必需的列
const validation = validateData(data.data, ['name', 'email', 'age']);

if (!validation.valid) {
  console.error('数据验证失败:');
  console.error('缺失列:', validation.missingColumns);
  console.error('多余列:', validation.extraColumns);
  console.error('数据行数:', validation.rowCount);
} else {
  console.log('✓ 数据验证通过');
}
```

---

## 🛡️ 错误处理

```typescript
try {
  const result = await parseCSV('data/missing.csv');
} catch (error) {
  if (error instanceof ParseError) {
    switch (error.code) {
      case 'FILE_NOT_FOUND':
        console.error('文件不存在:', error.file);
        break;
      case 'INVALID_JSON':
        console.error('JSON 格式错误');
        break;
      case 'MISSING_DEPENDENCY':
        console.error('需要安装依赖：npm install xlsx');
        break;
      case 'UNSUPPORTED_FORMAT':
        console.error('不支持的文件格式');
        break;
      default:
        console.error('解析失败:', error.message);
    }
  } else {
    console.error('未知错误:', error);
  }
}
```

---

## 🚀 实际应用场景

### 场景 1: 批量导入用户数据

```typescript
async function importUsers(filePath: string) {
  // 1. 检查文件
  const info = getFileInfo(filePath);
  if (!info.exists) {
    throw new Error('文件不存在');
  }

  // 2. 解析数据
  const result = await parseFile(filePath);
  console.log(`解析了 ${result.totalRows} 行数据`);

  // 3. 验证数据
  const validation = validateData(result.data, ['name', 'email', 'phone']);
  if (!validation.valid) {
    throw new Error(`数据不完整，缺失列：${validation.missingColumns.join(', ')}`);
  }

  // 4. 处理数据 (转换类型、清洗等)
  const users = result.data.map(row => ({
    name: row.name.trim(),
    email: row.email.toLowerCase().trim(),
    phone: row.phone.replace(/\D/g, '')
  }));

  // 5. 导入数据库 (示例)
  // await db.users.insertMany(users);

  return {
    success: true,
    imported: users.length,
    columns: result.columns,
    duration: result.duration
  };
}
```

### 场景 2: 数据格式转换

```typescript
async function convertFile(
  inputPath: string,
  outputPath: string,
  targetFormat: 'csv' | 'json' | 'excel'
) {
  // 1. 解析源文件
  const result = await parseFile(inputPath);
  
  // 2. 导出为目标格式
  switch (targetFormat) {
    case 'csv':
      await exportToCSV(result.data, outputPath);
      break;
    case 'json':
      await exportToJSON(result.data, outputPath);
      break;
    case 'excel':
      await exportToExcel(result.data, outputPath);
      break;
  }

  console.log(`转换完成：${inputPath} → ${outputPath}`);
  return result.totalRows;
}

// 使用示例
const rows = await convertFile('data/users.xlsx', 'output/users.json', 'json');
console.log(`转换了 ${rows} 行数据`);
```

### 场景 3: 数据预览 (限制行数)

```typescript
async function previewFile(filePath: string, limit: number = 10) {
  const result = await parseFile(filePath, { limit });
  
  return {
    columns: result.columns,
    preview: result.data,
    totalRows: result.totalRows,
    hasMore: result.totalRows === limit
  };
}

// 使用示例
const preview = await previewFile('data/large.csv', 5);
console.log('列名:', preview.columns);
console.log('前 5 行:', preview.preview);
console.log('总行数:', preview.totalRows);
```

### 场景 4: 多文件合并

```typescript
async function mergeFiles(filePaths: string[], outputPath: string) {
  const allData: Record<string, any>[] = [];
  let totalColumns = new Set<string>();

  for (const filePath of filePaths) {
    const result = await parseFile(filePath);
    allData.push(...result.data);
    result.columns.forEach(col => totalColumns.add(col));
    console.log(`已加载：${filePath} (${result.totalRows} 行)`);
  }

  await exportToCSV(allData, outputPath);
  
  return {
    totalRows: allData.length,
    columns: Array.from(totalColumns),
    files: filePaths.length
  };
}

// 使用示例
const merged = await mergeFiles(
  ['data/q1.csv', 'data/q2.csv', 'data/q3.csv', 'data/q4.csv'],
  'output/year-summary.csv'
);
console.log(`合并完成：${merged.totalRows} 行，${merged.columns.length} 列`);
```

---

## 📝 注意事项

1. **编码问题**: 默认使用 UTF-8，如遇乱码请指定正确的编码
   ```typescript
   await parseCSV('data/gbk.csv', { encoding: 'gbk' });
   ```

2. **大文件处理**: 超过 100MB 的 JSON 文件会自动使用流式处理

3. **Excel 依赖**: Excel 解析需要安装 `xlsx` 库

4. **内存使用**: 解析超大文件时建议使用 `limit` 参数限制行数

5. **数据类型**: CSV 解析结果全部为字符串，需要自行转换类型
   ```typescript
   const users = result.data.map(row => ({
     ...row,
     age: parseInt(row.age, 10),
     score: parseFloat(row.score)
   }));
   ```

---

## 📚 API 参考

### parseCSV(filePath, options?)

| 选项 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| delimiter | string | `','` | 分隔符 |
| encoding | string | `'utf-8'` | 文件编码 |
| hasHeader | boolean | `true` | 是否包含表头 |
| headers | string[] | `undefined` | 自定义表头 |
| skipEmptyLines | boolean | `true` | 跳过空行 |
| trim | boolean | `true` | 修剪值 |
| limit | number | `0` | 最大行数 (0=无限制) |

### parseJSON(filePath, options?)

| 选项 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| nested | boolean | `true` | 支持嵌套结构 |
| stream | boolean | `false` | 流式处理 |
| encoding | string | `'utf-8'` | 文件编码 |
| jsonPath | string | `undefined` | JSON 路径 |
| limit | number | `0` | 最大对象数 |

### parseExcel(filePath, options?)

| 选项 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| sheet | string \| number | `0` | 工作表名称或索引 |
| hasHeader | boolean | `true` | 是否包含表头 |
| allSheets | boolean | `false` | 解析所有工作表 |
| raw | boolean | `false` | 保留原始类型 |
| limit | number | `0` | 最大行数 |

### ParseResult

```typescript
interface ParseResult {
  data: any[];           // 解析的数据
  totalRows: number;     // 总行数
  columns: string[];     // 列名
  duration: number;      // 解析耗时 (ms)
  metadata?: object;     // 元数据
}
```

---

**最后更新:** 2026-03-13  
**版本:** 1.0.0
