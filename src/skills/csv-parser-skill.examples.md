# CSV 解析技能使用示例

## 📋 目录

1. [基础解析](#基础解析)
2. [基础生成](#基础生成)
3. [高级配置](#高级配置)
4. [流式处理](#流式处理)
5. [文件操作](#文件操作)
6. [数据转换](#数据转换)
7. [文件合并](#文件合并)
8. [性能优化](#性能优化)

---

## 基础解析

### 简单 CSV 解析

```typescript
import { parseCsv } from './csv-parser-skill';

const csv = `name,age,city
张三，25，北京
李四，30，上海
王五，28，广州`;

const result = parseCsv(csv);

console.log(result.data);
// [
//   { name: '张三', age: '25', city: '北京' },
//   { name: '李四', age: '30', city: '上海' },
//   { name: '王五', age: '28', city: '广州' }
// ]

console.log(result.columns); // ['name', 'age', 'city']
console.log(result.parsedRows); // 3
console.log(result.duration); // 解析耗时 (毫秒)
```

### 无表头 CSV

```typescript
const csv = `张三，25，北京
李四，30，上海
王五，28，广州`;

const result = parseCsv(csv, { hasHeader: false });

console.log(result.data);
// [
//   { column1: '张三', column2: '25', column3: '北京' },
//   { column1: '李四', column2: '30', column3: '上海' },
//   { column1: '王五', column2: '28', column3: '广州' }
// ]
```

### 自定义列名

```typescript
const csv = `张三，25，北京
李四，30，上海`;

const result = parseCsv(csv, {
  hasHeader: false,
  columns: ['name', 'age', 'city']
});

console.log(result.data);
// [
//   { name: '张三', age: '25', city: '北京' },
//   { name: '李四', age: '30', city: '上海' }
// ]
```

---

## 基础生成

### 简单 JSON 转 CSV

```typescript
import { stringifyCsv } from './csv-parser-skill';

const data = [
  { name: '张三', age: 25, city: '北京' },
  { name: '李四', age: 30, city: '上海' },
  { name: '王五', age: 28, city: '广州' }
];

const csv = stringifyCsv(data);

console.log(csv);
// name,age,city
// 张三，25，北京
// 李四，30，上海
// 王五，28，广州
```

### 单对象转 CSV

```typescript
const data = { name: '张三', age: 25, city: '北京' };

const csv = stringifyCsv(data);

console.log(csv);
// name,age,city
// 张三，25，北京
```

### 指定列顺序

```typescript
const data = [
  { name: '张三', age: 25, city: '北京', email: 'zhangsan@example.com' }
];

const csv = stringifyCsv(data, {
  columns: ['name', 'email', 'age', 'city']
});

console.log(csv);
// name,email,age,city
// 张三，zhangsan@example.com,25，北京
```

---

## 高级配置

### 自定义分隔符

```typescript
// 使用分号分隔
const csv = stringifyCsv(data, { delimiter: ';' });

// 使用 Tab 分隔
const tsv = stringifyCsv(data, { delimiter: '\t' });

// 解析分号分隔的 CSV
const result = parseCsv(csv, { delimiter: ';' });
```

### 引号和转义

```typescript
const data = [
  { name: '张"三', description: 'Hello, "World"' }
];

const csv = stringifyCsv(data, {
  quote: '"',
  forceQuotes: true // 强制所有字段加引号
});

console.log(csv);
// name,description
// "张""三","Hello, ""World"""
```

### 空值处理

```typescript
const data = [
  { name: '张三', age: null, city: undefined }
];

const csv = stringifyCsv(data, {
  nullValue: 'N/A'
});

console.log(csv);
// name,age,city
// 张三，N/A,N/A
```

### 日期格式化

```typescript
const data = [
  { name: '张三', birthday: new Date('1990-01-15') }
];

const csv = stringifyCsv(data, {
  dateFormat: 'YYYY-MM-DD'
});

console.log(csv);
// name,birthday
// 张三，1990-01-15
```

### 行数限制

```typescript
// 只解析前 100 行
const result = parseCsv(largeCsv, {
  maxRows: 100
});

console.log(result.parsedRows); // 最多 100
```

### 跳过空行和修剪空格

```typescript
const csv = `name,age

张三，25
  
李四，30
`;

const result = parseCsv(csv, {
  skipEmptyLines: true,
  trim: true
});

console.log(result.data);
// [
//   { name: '张三', age: '25' },
//   { name: '李四', age: '30' }
// ]
```

---

## 流式处理

### 流式读取大文件

```typescript
import { parseCsvStream } from './csv-parser-skill';

async function processLargeFile() {
  let count = 0;
  
  await parseCsvStream('large-data.csv', {}, {
    onRow: (row, lineNum) => {
      count++;
      console.log(`处理第 ${lineNum} 行:`, row);
      
      // 可以执行数据库插入、API 调用等
      // await database.insert(row);
    },
    onProgress: (progress) => {
      console.log(`进度：${progress.percentage.toFixed(2)}%`);
      console.log(`已处理：${progress.processedRows} 行`);
      console.log(`耗时：${progress.elapsed}ms`);
    },
    onComplete: (result) => {
      console.log(`完成！总计 ${result.totalRows} 行，耗时 ${result.duration}ms`);
    },
    onError: (error) => {
      console.error('解析错误:', error);
    }
  });
  
  console.log(`总共处理 ${count} 行`);
}
```

### 流式写入大文件

```typescript
import { stringifyCsvStream } from './csv-parser-skill';
import { Readable } from 'stream';

async function writeLargeFile() {
  // 从数据库或其他来源创建数据流
  const dataStream = Readable.from([
    { name: '用户 1', age: 25, city: '北京' },
    { name: '用户 2', age: 30, city: '上海' },
    // ... 更多数据
  ]);
  
  await stringifyCsvStream('output.csv', dataStream, {
    header: true,
    columns: ['name', 'age', 'city']
  });
  
  console.log('文件写入完成');
}
```

### AsyncIterable 流式写入

```typescript
async function* generateData() {
  for (let i = 0; i < 1000000; i++) {
    yield {
      id: i,
      name: `用户${i}`,
      timestamp: new Date().toISOString()
    };
  }
}

async function writeGeneratedData() {
  await stringifyCsvStream('generated.csv', generateData(), {
    columns: ['id', 'name', 'timestamp']
  });
}
```

---

## 文件操作

### 读取 CSV 文件

```typescript
import { parseCsvFile } from './csv-parser-skill';

async function readCsvFile() {
  const result = await parseCsvFile('data.csv', {
    encoding: 'utf-8',
    hasHeader: true,
    trim: true
  });
  
  console.log(`解析了 ${result.parsedRows} 行数据`);
  console.log('数据:', result.data);
  
  if (result.errors.length > 0) {
    console.warn('解析错误:', result.errors);
  }
}
```

### 写入 CSV 文件

```typescript
import { writeCsvFile } from './csv-parser-skill';

async function writeCsvFile() {
  const data = [
    { name: '张三', age: 25, city: '北京' },
    { name: '李四', age: 30, city: '上海' }
  ];
  
  await writeCsvFile('output.csv', data, {
    encoding: 'utf-8',
    header: true,
    columns: ['name', 'age', 'city']
  });
  
  console.log('文件写入成功');
}
```

### 自动创建目录

```typescript
import * as fs from 'fs';
import * as path from 'path';
import { writeCsvFile } from './csv-parser-skill';

async function writeCsvWithDirs() {
  const outputPath = 'reports/2024/03/data.csv';
  
  // 创建父目录
  await fs.promises.mkdir(path.dirname(outputPath), { recursive: true });
  
  await writeCsvFile(outputPath, data);
}
```

---

## 数据转换

### 转换 CSV 数据

```typescript
import { transformCsv } from './csv-parser-skill';

async function transformData() {
  const result = await transformCsv(
    'input.csv',
    'output.csv',
    (row) => {
      // 数据清洗和转换
      if (!row.name) {
        return null; // 跳过无效行
      }
      
      return {
        ...row,
        name: row.name.trim(),
        age: parseInt(row.age) || 0,
        upperName: row.name.toUpperCase()
      };
    },
    { trim: true }, // 解析配置
    { header: true } // 生成配置
  );
  
  console.log(`处理 ${result.processed} 行，跳过 ${result.skipped} 行`);
}
```

### 复杂转换示例

```typescript
async function complexTransform() {
  await transformCsv(
    'sales.csv',
    'sales-summary.csv',
    (row) => {
      // 计算总价
      const quantity = parseInt(row.quantity) || 0;
      const price = parseFloat(row.price) || 0;
      const total = quantity * price;
      
      // 添加计算字段
      return {
        ...row,
        total: total.toFixed(2),
        category: row.category || 'Uncategorized',
        processedAt: new Date().toISOString()
      };
    }
  );
}
```

---

## 文件合并

### 合并多个 CSV 文件

```typescript
import { mergeCsvFiles } from './csv-parser-skill';

async function mergeFiles() {
  await mergeCsvFiles(
    [
      'data/january.csv',
      'data/february.csv',
      'data/march.csv'
    ],
    'data/q1-summary.csv',
    {
      addSourceColumn: true, // 添加源文件名列
      stringifyConfig: {
        header: true
      }
    }
  );
  
  console.log('文件合并完成');
}
```

### 合并并去重

```typescript
async function mergeAndDeduplicate() {
  const allRows: any[] = [];
  const seen = new Set<string>();
  
  // 先合并
  await mergeCsvFiles(
    ['file1.csv', 'file2.csv', 'file3.csv'],
    'temp-merged.csv'
  );
  
  // 读取并去重
  const result = await parseCsvFile('temp-merged.csv');
  
  result.data.forEach(row => {
    const key = `${row.id}-${row.name}`;
    if (!seen.has(key)) {
      seen.add(key);
      allRows.push(row);
    }
  });
  
  // 写入去重后的文件
  await writeCsvFile('final.csv', allRows);
}
```

---

## 性能优化

### 处理超大文件 (GB 级别)

```typescript
import { parseCsvStream } from './csv-parser-skill';

async function processGiganticFile() {
  const batchSize = 1000;
  let batch: any[] = [];
  let totalProcessed = 0;
  
  await parseCsvStream('huge-file.csv', {}, {
    onRow: async (row) => {
      batch.push(row);
      
      // 批量处理
      if (batch.length >= batchSize) {
        await processBatch(batch);
        totalProcessed += batch.length;
        batch = [];
        
        console.log(`已处理 ${totalProcessed} 行`);
      }
    },
    onComplete: async () => {
      // 处理剩余数据
      if (batch.length > 0) {
        await processBatch(batch);
      }
      console.log(`全部完成！总计 ${totalProcessed + batch.length} 行`);
    }
  });
}

async function processBatch(batch: any[]) {
  // 批量插入数据库、调用 API 等
  // await database.insertMany(batch);
}
```

### 并行处理

```typescript
async function parallelProcessing() {
  const files = ['file1.csv', 'file2.csv', 'file3.csv', 'file4.csv'];
  
  // 并行处理多个文件
  const promises = files.map(file => 
    parseCsvStream(file, {}, {
      onRow: (row) => processRow(row),
      onComplete: (result) => {
        console.log(`${file}: ${result.totalRows} 行`);
      }
    })
  );
  
  await Promise.all(promises);
}
```

### 内存优化技巧

```typescript
// ❌ 避免：一次性加载整个文件
const result = await parseCsvFile('huge.csv'); // 可能内存溢出

// ✅ 推荐：使用流式处理
await parseCsvStream('huge.csv', {}, {
  onRow: (row) => {
    // 逐行处理，立即释放内存
    processAndDiscard(row);
  }
});

// ✅ 推荐：分批处理
const batches: any[][] = [];
let currentBatch: any[] = [];

await parseCsvStream('large.csv', {}, {
  onRow: (row) => {
    currentBatch.push(row);
    if (currentBatch.length >= 10000) {
      batches.push([...currentBatch]);
      currentBatch = [];
    }
  }
});
```

---

## 完整示例

### 数据导入管道

```typescript
import { parseCsvStream, writeCsvFile } from './csv-parser-skill';

interface UserData {
  id: string;
  name: string;
  email: string;
  age: number;
  createdAt: Date;
}

async function importUserData(inputFile: string, outputFile: string) {
  const validUsers: UserData[] = [];
  const errors: any[] = [];
  
  console.log('开始导入用户数据...');
  
  await parseCsvStream(inputFile, { trim: true }, {
    onRow: (row, lineNum) => {
      try {
        // 数据验证
        if (!row.email || !row.email.includes('@')) {
          throw new Error('无效的邮箱');
        }
        
        const age = parseInt(row.age);
        if (isNaN(age) || age < 0 || age > 150) {
          throw new Error('无效的年龄');
        }
        
        // 数据转换
        const user: UserData = {
          id: generateId(),
          name: row.name?.trim() || 'Unknown',
          email: row.email.toLowerCase().trim(),
          age,
          createdAt: new Date()
        };
        
        validUsers.push(user);
        
      } catch (error) {
        errors.push({
          line: lineNum,
          error: error instanceof Error ? error.message : 'Unknown error',
          data: row
        });
      }
    },
    onProgress: (progress) => {
      if (progress.processedRows % 1000 === 0) {
        console.log(`进度：${progress.processedRows} 行`);
      }
    },
    onComplete: async (result) => {
      console.log(`\n导入完成:`);
      console.log(`- 有效用户：${validUsers.length}`);
      console.log(`- 错误记录：${errors.length}`);
      console.log(`- 总耗时：${result.duration}ms`);
      
      // 写入有效数据
      await writeCsvFile(outputFile, validUsers);
      console.log(`- 输出文件：${outputFile}`);
      
      // 写入错误日志
      if (errors.length > 0) {
        await writeCsvFile(
          outputFile.replace('.csv', '-errors.csv'),
          errors,
          { columns: ['line', 'error', 'data'] }
        );
      }
    }
  });
}

function generateId(): string {
  return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// 使用
importUserData('users-import.csv', 'users-valid.csv');
```

---

## API 参考

### parseCsv

```typescript
function parseCsv(csvString: string, config?: CsvParseConfig): CsvParseResult
```

**配置选项:**
- `delimiter?: string` - 分隔符 (默认 ',')
- `quote?: string` - 引号字符 (默认 '"')
- `escape?: string` - 转义字符 (默认 '"')
- `hasHeader?: boolean` - 是否包含表头 (默认 true)
- `encoding?: BufferEncoding` - 文件编码 (默认 'utf-8')
- `skipEmptyLines?: boolean` - 跳过空行 (默认 true)
- `trim?: boolean` - 去除首尾空格 (默认 true)
- `columns?: string[]` - 自定义列名
- `maxRows?: number` - 最大行数限制

### stringifyCsv

```typescript
function stringifyCsv(data: CsvRow[] | Record<string, any>, config?: CsvStringifyConfig): string
```

**配置选项:**
- `delimiter?: string` - 分隔符 (默认 ',')
- `quote?: string` - 引号字符 (默认 '"')
- `header?: boolean` - 是否包含表头 (默认 true)
- `columns?: string[]` - 列顺序
- `dateFormat?: string` - 日期格式
- `numberFormat?: 'string' | 'number'` - 数字格式
- `nullValue?: string` - 空值替换
- `forceQuotes?: boolean` - 强制引号

### parseCsvStream

```typescript
async function parseCsvStream(
  filePath: string,
  config?: CsvParseConfig,
  callbacks?: StreamCallbacks
): Promise<void>
```

**回调函数:**
- `onRow?: (row, lineNum) => void | Promise<void>` - 每行处理
- `onProgress?: (progress) => void` - 进度更新
- `onComplete?: (result) => void` - 完成回调
- `onError?: (error) => void` - 错误处理

### stringifyCsvStream

```typescript
async function stringifyCsvStream(
  filePath: string,
  dataStream: Readable | AsyncIterable<CsvRow>,
  config?: CsvStringifyConfig
): Promise<void>
```

---

**版本:** 1.0.0  
**作者:** Axon  
**最后更新:** 2026-03-13
