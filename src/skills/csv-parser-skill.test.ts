/**
 * CSV 解析技能测试
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  parseCsv,
  stringifyCsv,
  parseCsvFile,
  writeCsvFile,
  parseCsvStream,
  stringifyCsvStream,
  transformCsv,
  mergeCsvFiles
} from './csv-parser-skill';

// 测试数据
const sampleData = [
  { name: '张三', age: '25', city: '北京' },
  { name: '李四', age: '30', city: '上海' },
  { name: '王五', age: '28', city: '广州' }
];

const sampleCsv = `name,age,city
张三，25，北京
李四，30，上海
王五，28，广州`;

const tempDir = path.join(__dirname, '../../test-temp/csv-parser');

// 确保测试目录存在
beforeAll(async () => {
  await fs.promises.mkdir(tempDir, { recursive: true });
});

// 清理测试文件
afterAll(async () => {
  await fs.promises.rm(tempDir, { recursive: true, force: true });
});

describe('parseCsv', () => {
  test('解析简单 CSV', () => {
    const result = parseCsv(sampleCsv);
    
    expect(result.data).toHaveLength(3);
    expect(result.columns).toEqual(['name', 'age', 'city']);
    expect(result.parsedRows).toBe(3);
    expect(result.data[0]).toEqual({ name: '张三', age: '25', city: '北京' });
  });

  test('解析无表头 CSV', () => {
    const csv = `张三，25，北京
李四，30，上海`;
    
    const result = parseCsv(csv, { hasHeader: false });
    
    expect(result.data).toHaveLength(2);
    expect(result.data[0]).toEqual({
      column1: '张三',
      column2: '25',
      column3: '北京'
    });
  });

  test('使用自定义列名', () => {
    const csv = `张三，25，北京`;
    
    const result = parseCsv(csv, {
      hasHeader: false,
      columns: ['name', 'age', 'city']
    });
    
    expect(result.data[0]).toEqual({ name: '张三', age: '25', city: '北京' });
  });

  test('处理带引号的字段', () => {
    const csv = `name,description
"张""三","Hello, ""World"""`;
    
    const result = parseCsv(csv);
    
    expect(result.data[0]).toEqual({
      name: '张"三',
      description: 'Hello, "World"'
    });
  });

  test('跳过空行', () => {
    const csv = `name,age

张三，25
  
李四，30
`;
    
    const result = parseCsv(csv, { skipEmptyLines: true, trim: true });
    
    expect(result.data).toHaveLength(2);
    expect(result.skippedRows).toBeGreaterThan(0);
  });

  test('限制行数', () => {
    const result = parseCsv(sampleCsv, { maxRows: 2 });
    
    expect(result.data).toHaveLength(2);
    expect(result.parsedRows).toBe(2);
  });

  test('自动检测分隔符', () => {
    const csv = `name;age;city
张三;25;北京`;
    
    const result = parseCsv(csv);
    
    expect(result.columns).toEqual(['name', 'age', 'city']);
    expect(result.data[0].name).toBe('张三');
  });

  test('处理错误行', () => {
    const csv = `name,age
张三，25
李四`; // 缺少字段
    
    const result = parseCsv(csv);
    
    expect(result.data).toHaveLength(2);
    expect(result.errors).toBeDefined();
  });
});

describe('stringifyCsv', () => {
  test('生成简单 CSV', () => {
    const csv = stringifyCsv(sampleData);
    
    expect(csv).toContain('name,age,city');
    expect(csv).toContain('张三，25，北京');
    expect(csv).toContain('李四，30，上海');
  });

  test('生成单对象 CSV', () => {
    const csv = stringifyCsv({ name: '张三', age: 25 });
    
    expect(csv).toContain('name,age');
    expect(csv).toContain('张三，25');
  });

  test('指定列顺序', () => {
    const csv = stringifyCsv(sampleData, {
      columns: ['city', 'name', 'age']
    });
    
    const lines = csv.split('\n');
    expect(lines[0]).toBe('city,name,age');
  });

  test('处理空值', () => {
    const data = [{ name: '张三', age: null, city: undefined }];
    const csv = stringifyCsv(data, { nullValue: 'N/A' });
    
    expect(csv).toContain('N/A');
  });

  test('日期格式化', () => {
    const data = [{ name: '张三', birthday: new Date('1990-01-15') }];
    const csv = stringifyCsv(data, { dateFormat: 'YYYY-MM-DD' });
    
    expect(csv).toContain('1990-01-15');
  });

  test('强制引号', () => {
    const data = [{ name: '张三' }];
    const csv = stringifyCsv(data, { forceQuotes: true });
    
    expect(csv).toContain('"name"');
    expect(csv).toContain('"张三"');
  });

  test('不包含表头', () => {
    const csv = stringifyCsv(sampleData, { header: false });
    
    expect(csv).not.toContain('name,age,city');
    expect(csv).toContain('张三，25，北京');
  });
});

describe('文件操作', () => {
  test('写入和读取 CSV 文件', async () => {
    const filePath = path.join(tempDir, 'test-basic.csv');
    
    // 写入
    await writeCsvFile(filePath, sampleData);
    
    // 读取
    const result = await parseCsvFile(filePath);
    
    expect(result.data).toHaveLength(3);
    expect(result.data[0].name).toBe('张三');
  });

  test('使用自定义配置写入文件', async () => {
    const filePath = path.join(tempDir, 'test-config.csv');
    
    await writeCsvFile(filePath, sampleData, {
      delimiter: ';',
      columns: ['name', 'city', 'age']
    });
    
    const content = await fs.promises.readFile(filePath, 'utf-8');
    expect(content).toContain('name;city;age');
  });
});

describe('流式处理', () => {
  test('流式读取文件', async () => {
    const filePath = path.join(tempDir, 'test-stream.csv');
    await writeCsvFile(filePath, sampleData);
    
    const rows: any[] = [];
    
    await parseCsvStream(filePath, {}, {
      onRow: (row) => {
        rows.push(row);
      }
    });
    
    expect(rows).toHaveLength(3);
    expect(rows[0].name).toBe('张三');
  });

  test('流式写入文件', async () => {
    const filePath = path.join(tempDir, 'test-stream-write.csv');
    const { Readable } = require('stream');
    
    const dataStream = Readable.from(sampleData);
    
    await stringifyCsvStream(filePath, dataStream);
    
    const result = await parseCsvFile(filePath);
    expect(result.data).toHaveLength(3);
  });

  test('AsyncIterable 流式写入', async () => {
    const filePath = path.join(tempDir, 'test-async-iter.csv');
    
    async function* generateData() {
      for (let i = 0; i < 5; i++) {
        yield { id: i, name: `用户${i}` };
      }
    }
    
    await stringifyCsvStream(filePath, generateData());
    
    const result = await parseCsvFile(filePath);
    expect(result.data).toHaveLength(5);
  });

  test('流式处理进度回调', async () => {
    const filePath = path.join(tempDir, 'test-progress.csv');
    
    // 创建较大的测试文件
    const largeData = Array.from({ length: 100 }, (_, i) => ({
      id: i,
      name: `用户${i}`,
      email: `user${i}@example.com`
    }));
    
    await writeCsvFile(filePath, largeData);
    
    let progressCalled = false;
    let maxRows = 0;
    
    await parseCsvStream(filePath, {}, {
      onRow: (row) => {
        maxRows = Math.max(maxRows, 1);
      },
      onProgress: (progress) => {
        progressCalled = true;
        expect(progress.processedRows).toBeGreaterThanOrEqual(0);
        expect(progress.elapsed).toBeGreaterThanOrEqual(0);
      }
    });
    
    expect(progressCalled).toBe(true);
  });
});

describe('数据转换', () => {
  test('转换 CSV 数据', async () => {
    const inputPath = path.join(tempDir, 'transform-input.csv');
    const outputPath = path.join(tempDir, 'transform-output.csv');
    
    await writeCsvFile(inputPath, sampleData);
    
    const result = await transformCsv(
      inputPath,
      outputPath,
      (row) => {
        return {
          ...row,
          name: row.name.toUpperCase(),
          age: parseInt(row.age) + 1
        };
      }
    );
    
    expect(result.processed).toBe(3);
    expect(result.skipped).toBe(0);
    
    const output = await parseCsvFile(outputPath);
    expect(output.data[0].name).toBe('张三'.toUpperCase());
    expect(output.data[0].age).toBe('26');
  });

  test('转换时跳过无效行', async () => {
    const inputPath = path.join(tempDir, 'transform-skip-input.csv');
    const outputPath = path.join(tempDir, 'transform-skip-output.csv');
    
    const testData = [
      { name: '有效', age: '25' },
      { name: '', age: '30' }, // 无效
      { name: '另一个', age: '28' }
    ];
    
    await writeCsvFile(inputPath, testData);
    
    const result = await transformCsv(
      inputPath,
      outputPath,
      (row) => {
        if (!row.name || row.name.trim() === '') {
          return null; // 跳过
        }
        return row;
      }
    );
    
    expect(result.processed).toBe(2);
    expect(result.skipped).toBe(1);
  });
});

describe('文件合并', () => {
  test('合并多个 CSV 文件', async () => {
    const file1 = path.join(tempDir, 'merge-1.csv');
    const file2 = path.join(tempDir, 'merge-2.csv');
    const output = path.join(tempDir, 'merge-output.csv');
    
    await writeCsvFile(file1, [
      { name: '用户 1', age: '25' },
      { name: '用户 2', age: '30' }
    ]);
    
    await writeCsvFile(file2, [
      { name: '用户 3', age: '28' },
      { name: '用户 4', age: '35' }
    ]);
    
    await mergeCsvFiles([file1, file2], output);
    
    const result = await parseCsvFile(output);
    expect(result.data).toHaveLength(4);
  });

  test('合并时添加源文件列', async () => {
    const file1 = path.join(tempDir, 'merge-source-1.csv');
    const file2 = path.join(tempDir, 'merge-source-2.csv');
    const output = path.join(tempDir, 'merge-source-output.csv');
    
    await writeCsvFile(file1, [{ name: '用户 1' }]);
    await writeCsvFile(file2, [{ name: '用户 2' }]);
    
    await mergeCsvFiles([file1, file2], output, {
      addSourceColumn: true
    });
    
    const result = await parseCsvFile(output);
    expect(result.data[0]).toHaveProperty('__source');
    expect(result.data[1]).toHaveProperty('__source');
  });
});

describe('边界情况', () => {
  test('处理空数据', () => {
    const csv = stringifyCsv([]);
    expect(csv).toBe('');
  });

  test('处理特殊字符', () => {
    const data = [{ text: 'Hello\nWorld' }];
    const csv = stringifyCsv(data);
    
    expect(csv).toContain('"Hello\nWorld"');
  });

  test('处理 Unicode 字符', () => {
    const data = [
      { emoji: '😀', chinese: '中文', japanese: '日本語' }
    ];
    
    const csv = stringifyCsv(data);
    const result = parseCsv(csv);
    
    expect(result.data[0].emoji).toBe('😀');
    expect(result.data[0].chinese).toBe('中文');
  });

  test('处理超大数字', () => {
    const data = [{ id: '9999999999999999' }];
    const csv = stringifyCsv(data);
    const result = parseCsv(csv);
    
    // 保持字符串形式，避免精度丢失
    expect(result.data[0].id).toBe('9999999999999999');
  });
});

describe('性能测试', () => {
  test('解析大文件性能', async () => {
    const filePath = path.join(tempDir, 'performance-test.csv');
    
    // 生成 10000 行数据
    const largeData = Array.from({ length: 10000 }, (_, i) => ({
      id: i,
      name: `用户${i}`,
      email: `user${i}@example.com`,
      timestamp: new Date().toISOString()
    }));
    
    await writeCsvFile(filePath, largeData);
    
    const startTime = Date.now();
    const result = await parseCsvFile(filePath);
    const duration = Date.now() - startTime;
    
    expect(result.data).toHaveLength(10000);
    expect(duration).toBeLessThan(5000); // 应该在 5 秒内完成
    console.log(`解析 10000 行耗时：${duration}ms`);
  });

  test('流式处理大文件', async () => {
    const filePath = path.join(tempDir, 'stream-performance.csv');
    
    const largeData = Array.from({ length: 10000 }, (_, i) => ({
      id: i,
      value: Math.random()
    }));
    
    await writeCsvFile(filePath, largeData);
    
    let count = 0;
    const startTime = Date.now();
    
    await parseCsvStream(filePath, {}, {
      onRow: () => {
        count++;
      }
    });
    
    const duration = Date.now() - startTime;
    
    expect(count).toBe(10000);
    expect(duration).toBeLessThan(5000);
    console.log(`流式处理 10000 行耗时：${duration}ms`);
  });
});
