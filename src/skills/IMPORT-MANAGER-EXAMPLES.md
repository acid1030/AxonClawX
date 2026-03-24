# 导入管理工具 - 使用示例

## 快速开始

```typescript
import { ImportManager, importCSV, importExcel, importJSON } from './import-manager-skill';

// 方式 1: 使用类实例
const manager = new ImportManager();

// 方式 2: 使用便捷函数
const result = await importCSV('data.csv');
```

---

## 1. CSV 导入

### 基础用法

```typescript
import { ImportManager } from './import-manager-skill';

const manager = new ImportManager();

// 导入标准 CSV
const result = await manager.importCSV('users.csv');

console.log('导入成功:', result.success);
console.log('数据:', result.data);
console.log('列名:', result.columns);
console.log '总行数:', result.totalRows);
console.log('耗时:', result.duration, 'ms');
```

### 自定义分隔符

```typescript
// 使用分号分隔
const result = await manager.importCSV('eu-data.csv', {
  delimiter: ';',
  hasHeader: true
});

// 使用 Tab 分隔
const tsvResult = await manager.importCSV('data.tsv', {
  delimiter: '\t'
});
```

### 指定编码

```typescript
// GBK 编码 (中文 Windows 常见)
const result = await manager.importCSV('chinese-data.csv', {
  encoding: 'gbk',
  hasHeader: true
});

// UTF-8 with BOM
const utf8Result = await manager.importCSV('utf8-bom.csv', {
  encoding: 'utf-8'
});
```

### 自定义表头

```typescript
// 当 CSV 没有表头时
const result = await manager.importCSV('no-header.csv', {
  hasHeader: false,
  headers: ['name', 'age', 'email', 'city']
});
```

### 限制导入行数

```typescript
// 只导入前 100 行
const result = await manager.importCSV('large-file.csv', {
  limit: 100
});

// 预览前 10 行
const preview = await manager.importCSV('data.csv', {
  limit: 10
});
```

### 完整示例

```typescript
import { ImportManager } from './import-manager-skill';

async function importUsers() {
  const manager = new ImportManager();
  
  try {
    const result = await manager.importCSV('users.csv', {
      delimiter: ',',
      encoding: 'utf-8',
      hasHeader: true,
      skipEmptyLines: true,
      trim: true,
      limit: 0 // 无限制
    });

    if (result.success) {
      console.log(`✅ 成功导入 ${result.totalRows} 条记录`);
      console.log(`列名：${result.columns.join(', ')}`);
      console.log(`耗时：${result.duration}ms`);
      console.log(`文件大小：${(result.fileInfo.size / 1024).toFixed(2)} KB`);
      
      // 处理数据
      result.data.forEach((row, index) => {
        console.log(`行 ${index + 1}:`, row);
      });
    } else {
      console.error('❌ 导入失败:', result.error);
    }
  } catch (error) {
    console.error('异常:', error);
  }
}

importUsers();
```

---

## 2. Excel 导入

### 基础用法

```typescript
import { ImportManager } from './import-manager-skill';

const manager = new ImportManager();

// 导入第一个工作表
const result = await manager.importExcel('report.xlsx');

console.log('数据:', result.data);
console.log('列名:', result.columns);
```

### 指定工作表

```typescript
// 通过索引 (0 = 第一个工作表)
const result1 = await manager.importExcel('report.xlsx', {
  sheet: 0
});

// 通过名称
const result2 = await manager.importExcel('report.xlsx', {
  sheet: 'Sales Data'
});
```

### 解析所有工作表

```typescript
const result = await manager.importExcel('multi-sheet.xlsx', {
  allSheets: true
});

// 返回包含所有工作表的数据
console.log('所有工作表:', result.data);
```

### 限制行数

```typescript
// 只导入前 50 行
const result = await manager.importExcel('large-report.xlsx', {
  limit: 50
});
```

### 完整示例

```typescript
import { ImportManager } from './import-manager-skill';

async function importSalesReport() {
  const manager = new ImportManager();
  
  const result = await manager.importExcel('sales-2024.xlsx', {
    sheet: 'Q1',
    hasHeader: true,
    limit: 0
  });

  if (result.success) {
    console.log(`✅ 成功导入 ${result.totalRows} 条销售记录`);
    console.log(`列名：${result.columns.join(', ')}`);
    
    // 计算总和
    const total = result.data.reduce((sum, row) => {
      return sum + (parseFloat(row.amount) || 0);
    }, 0);
    
    console.log(`销售总额：¥${total.toFixed(2)}`);
  } else {
    console.error('❌ 导入失败:', result.error);
  }
}

importSalesReport();
```

---

## 3. JSON 导入

### 基础用法

```typescript
import { ImportManager } from './import-manager-skill';

const manager = new ImportManager();

// 导入 JSON 数组
const result = await manager.importJSON('users.json');

console.log('数据:', result.data);
console.log('列名:', result.columns);
```

### 嵌套结构

```typescript
// 自动处理嵌套对象
const result = await manager.importJSON('config.json', {
  nested: true
});

// 输入：{ "user": { "name": "John", "age": 30 } }
// 输出：[{ user: { name: 'John', age: 30 } }]
```

### 提取特定字段

```typescript
// 从嵌套结构中提取特定路径
const result = await manager.importJSON('api-response.json', {
  jsonPath: 'data.users'
});

// 输入：{ "data": { "users": [{...}, {...}] } }
// 输出：[{...}, {...}] (直接提取 users 数组)
```

### 流式处理大文件

```typescript
// 启用流式处理 (适合大文件)
const result = await manager.importJSON('large-dataset.json', {
  stream: true,
  limit: 1000
});
```

### 限制导入数量

```typescript
// 只导入前 100 个对象
const result = await manager.importJSON('data.json', {
  limit: 100
});
```

### 完整示例

```typescript
import { ImportManager } from './import-manager-skill';

async function importConfig() {
  const manager = new ImportManager();
  
  const result = await manager.importJSON('config.json', {
    nested: true,
    stream: false
  });

  if (result.success) {
    console.log(`✅ 成功导入配置文件`);
    console.log('数据:', JSON.stringify(result.data, null, 2));
  } else {
    console.error('❌ 导入失败:', result.error);
  }
}

async function importApiData() {
  const manager = new ImportManager();
  
  const result = await manager.importJSON('api-response.json', {
    jsonPath: 'data.items',
    limit: 50
  });

  if (result.success) {
    console.log(`✅ 成功导入 ${result.totalRows} 条 API 数据`);
    console.log('字段:', result.columns.join(', '));
    
    // 处理数据
    result.data.forEach(item => {
      console.log('项目:', item.name, '- 价格:', item.price);
    });
  }
}

importConfig();
importApiData();
```

---

## 4. 统计信息

### 查看导入统计

```typescript
import { ImportManager } from './import-manager-skill';

const manager = new ImportManager();

// 执行多次导入
await manager.importCSV('file1.csv');
await manager.importExcel('file2.xlsx');
await manager.importJSON('file3.json');

// 获取统计
const stats = manager.getStats();

console.log('导入统计:');
console.log('- 总导入次数:', stats.totalImports);
console.log('- 成功:', stats.successCount);
console.log('- 失败:', stats.failCount);
console.log('- 总耗时:', stats.totalDuration, 'ms');
console.log('- 平均耗时:', stats.avgDuration.toFixed(2), 'ms');
```

### 重置统计

```typescript
manager.resetStats();
console.log('统计已重置');
```

---

## 5. 错误处理

### 捕获错误

```typescript
import { ImportManager } from './import-manager-skill';

const manager = new ImportManager();

try {
  const result = await manager.importCSV('nonexistent.csv');
  
  if (!result.success) {
    console.error('导入失败:', result.error);
    console.error('文件信息:', result.fileInfo);
  }
} catch (error) {
  console.error('异常:', error.message);
}
```

### 常见错误

```typescript
// 文件不存在
await manager.importCSV('missing.csv');
// Error: 文件不存在：missing.csv

// 不支持的格式
await manager.importExcel('data.txt');
// Error: 不支持的 Excel 格式：.txt

// JSON 解析失败
await manager.importJSON('invalid.json');
// Error: JSON 解析失败：Unexpected token...
```

---

## 6. 批量导入

```typescript
import { ImportManager } from './import-manager-skill';

async function batchImport() {
  const manager = new ImportManager();
  
  const files = [
    { type: 'csv', path: 'users.csv' },
    { type: 'csv', path: 'orders.csv' },
    { type: 'json', path: 'config.json' }
  ];

  const results = [];

  for (const file of files) {
    console.log(`正在导入：${file.path}`);
    
    let result;
    if (file.type === 'csv') {
      result = await manager.importCSV(file.path);
    } else if (file.type === 'json') {
      result = await manager.importJSON(file.path);
    }
    
    results.push({
      file: file.path,
      success: result?.success,
      rows: result?.totalRows
    });
  }

  // 汇总结果
  console.log('\n批量导入完成:');
  results.forEach(r => {
    console.log(`${r.file}: ${r.success ? '✅' : '❌'} ${r.rows} 行`);
  });

  // 显示统计
  const stats = manager.getStats();
  console.log(`\n总计：${stats.successCount}/${stats.totalImports} 成功`);
}

batchImport();
```

---

## 7. 便捷函数

```typescript
import { importCSV, importExcel, importJSON } from './import-manager-skill';

// 快速导入 CSV
const csvResult = await importCSV('data.csv', {
  delimiter: ',',
  limit: 100
});

// 快速导入 Excel
const excelResult = await importExcel('report.xlsx', {
  sheet: 0
});

// 快速导入 JSON
const jsonResult = await importJSON('config.json');

console.log('CSV:', csvResult.totalRows, '行');
console.log('Excel:', excelResult.totalRows, '行');
console.log('JSON:', jsonResult.totalRows, '行');
```

---

## 性能建议

1. **大文件处理**: 使用 `limit` 参数限制导入行数
2. **编码问题**: 明确指定 `encoding` 避免乱码
3. **内存优化**: JSON 大文件启用 `stream: true`
4. **批量操作**: 复用 `ImportManager` 实例获取统计信息

---

## API 参考

### ImportManager 类

| 方法 | 参数 | 返回值 | 描述 |
|------|------|--------|------|
| `importCSV` | `filePath, options` | `Promise<ImportResult>` | 导入 CSV 文件 |
| `importExcel` | `filePath, options` | `Promise<ImportResult>` | 导入 Excel 文件 |
| `importJSON` | `filePath, options` | `Promise<ImportResult>` | 导入 JSON 文件 |
| `getStats` | - | `ImportStats` | 获取导入统计 |
| `resetStats` | - | `void` | 重置统计 |

### 选项接口

#### CSVImportOptions
- `delimiter?: string` - 分隔符 (默认 ',')
- `encoding?: BufferEncoding` - 文件编码 (默认 'utf-8')
- `hasHeader?: boolean` - 是否包含表头 (默认 true)
- `headers?: string[]` - 自定义表头
- `skipEmptyLines?: boolean` - 跳过空行 (默认 true)
- `trim?: boolean` - 修剪值 (默认 true)
- `limit?: number` - 最大行数 (默认 0)

#### ExcelImportOptions
- `sheet?: string | number` - 工作表 (默认 0)
- `hasHeader?: boolean` - 是否包含表头 (默认 true)
- `allSheets?: boolean` - 解析所有工作表 (默认 false)
- `raw?: boolean` - 数字转字符串 (默认 false)
- `limit?: number` - 最大行数 (默认 0)

#### JSONImportOptions
- `nested?: boolean` - 支持嵌套 (默认 true)
- `stream?: boolean` - 流式处理 (默认 false)
- `jsonPath?: string` - JSON 路径
- `limit?: number` - 最大对象数 (默认 0)

### ImportResult 接口

```typescript
interface ImportResult {
  success: boolean;      // 导入状态
  data: any[];          // 导入的数据
  columns: string[];    // 列名
  totalRows: number;    // 总行数
  duration: number;     // 耗时 (ms)
  fileInfo: {
    path: string;       // 文件路径
    size: number;       // 文件大小
    type: string;       // 文件类型
  };
  error?: string;       // 错误信息
}
```

---

**版本:** 1.0.0  
**作者:** Axon  
**最后更新:** 2026-03-13
