/**
 * 数据导入工具使用示例
 * 
 * 运行：npx ts-node src/skills/importer-examples.ts
 */

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
} from './importer-utils-skill';

import * as path from 'path';

// 示例数据目录
const EXAMPLE_DIR = path.join(__dirname, '../../examples/data');

// ==================== CSV 示例 ====================

async function csvExample() {
  console.log('\n=== CSV 解析示例 ===\n');

  // 创建示例 CSV 文件
  const sampleCSV = [
    { name: '张三', age: '25', city: '北京', email: 'zhangsan@example.com' },
    { name: '李四', age: '30', city: '上海', email: 'lisi@example.com' },
    { name: '王五', age: '28', city: '广州', email: 'wangwu@example.com' },
    { name: '赵六', age: '35', city: '深圳', email: 'zhaoliu@example.com' },
    { name: '钱七', age: '22', city: '杭州', email: 'qianqi@example.com' }
  ];

  const csvPath = path.join(EXAMPLE_DIR, 'users.csv');
  await exportToCSV(sampleCSV, csvPath);
  console.log(`✓ 创建示例 CSV: ${csvPath}`);

  // 基础解析
  const result = await parseCSV(csvPath);
  console.log('\n📊 解析结果:');
  console.log('  列名:', result.columns);
  console.log('  行数:', result.totalRows);
  console.log('  耗时:', result.duration, 'ms');
  console.log('  前 3 行数据:');
  result.data.slice(0, 3).forEach((row, i) => {
    console.log(`    ${i + 1}.`, row);
  });

  // 限制行数
  const preview = await parseCSV(csvPath, { limit: 2 });
  console.log('\n📋 预览 (前 2 行):');
  console.log('  行数:', preview.totalRows);

  // 验证数据
  const validation = validateData(result.data, ['name', 'email', 'age']);
  console.log('\n✅ 数据验证:', validation.valid ? '通过' : '失败');
  if (!validation.valid) {
    console.log('  缺失列:', validation.missingColumns);
  }

  return result;
}

// ==================== JSON 示例 ====================

async function jsonExample() {
  console.log('\n=== JSON 解析示例 ===\n');

  // 创建示例 JSON 文件
  const sampleJSON = [
    {
      id: 1,
      name: '张三',
      age: 25,
      address: {
        city: '北京',
        district: '朝阳',
        street: '建国路'
      },
      tags: ['developer', 'frontend']
    },
    {
      id: 2,
      name: '李四',
      age: 30,
      address: {
        city: '上海',
        district: '浦东',
        street: '世纪大道'
      },
      tags: ['designer', 'ui']
    },
    {
      id: 3,
      name: '王五',
      age: 28,
      address: {
        city: '广州',
        district: '天河',
        street: '天河路'
      },
      tags: ['manager', 'product']
    }
  ];

  const jsonPath = path.join(EXAMPLE_DIR, 'users.json');
  await exportToJSON(sampleJSON, jsonPath, { pretty: true });
  console.log(`✓ 创建示例 JSON: ${jsonPath}`);

  // 基础解析
  const result = await parseJSON(jsonPath);
  console.log('\n📊 解析结果:');
  console.log('  列名:', result.columns);
  console.log('  行数:', result.totalRows);
  console.log('  耗时:', result.duration, 'ms');

  // 嵌套结构
  console.log('\n📦 嵌套字段:');
  console.log('  包含嵌套键:', result.columns.some(col => col.includes('.')));

  return result;
}

// ==================== Excel 示例 ====================

async function excelExample() {
  console.log('\n=== Excel 解析示例 ===\n');

  // 创建示例 Excel 文件
  const sampleData = [
    { 姓名：'张三', 年龄：25, 城市：'北京', 邮箱：'zhangsan@example.com' },
    { 姓名：'李四', 年龄：30, 城市：'上海', 邮箱：'lisi@example.com' },
    { 姓名：'王五', 年龄：28, 城市：'广州', 邮箱：'wangwu@example.com' },
    { 姓名：'赵六', 年龄：35, 城市：'深圳', 邮箱：'zhaoliu@example.com' }
  ];

  const excelPath = path.join(EXAMPLE_DIR, 'users.xlsx');
  
  try {
    await exportToExcel(sampleData, excelPath, { sheetName: '用户列表' });
    console.log(`✓ 创建示例 Excel: ${excelPath}`);

    // 基础解析
    const result = await parseExcel(excelPath);
    console.log('\n📊 解析结果:');
    console.log('  工作表:', result.metadata?.sheetName);
    console.log('  列名:', result.columns);
    console.log('  行数:', result.totalRows);
    console.log('  耗时:', result.duration, 'ms');

    return result;
  } catch (error) {
    if (error instanceof ParseError && error.code === 'MISSING_DEPENDENCY') {
      console.log('⚠️  Excel 示例跳过 (需要安装 xlsx 库)');
      console.log('   运行：npm install xlsx');
      return null;
    }
    throw error;
  }
}

// ==================== 自动检测示例 ====================

async function autoDetectExample() {
  console.log('\n=== 自动检测文件类型示例 ===\n');

  const files = [
    path.join(EXAMPLE_DIR, 'users.csv'),
    path.join(EXAMPLE_DIR, 'users.json')
  ];

  for (const filePath of files) {
    const info = getFileInfo(filePath);
    console.log(`\n📁 文件：${path.basename(filePath)}`);
    console.log('  类型:', info.type);
    console.log('  扩展名:', info.ext);
    console.log('  大小:', info.size, 'bytes');

    const result = await parseFile(filePath, { limit: 2 });
    console.log('  预览行数:', result.totalRows);
    console.log('  列名:', result.columns.slice(0, 3).join(', '));
  }
}

// ==================== 数据转换示例 ====================

async function convertExample() {
  console.log('\n=== 数据格式转换示例 ===\n');

  const csvPath = path.join(EXAMPLE_DIR, 'users.csv');
  const jsonPath = path.join(EXAMPLE_DIR, 'output/users.json');
  const excelPath = path.join(EXAMPLE_DIR, 'output/users.xlsx');

  // CSV → JSON
  console.log('🔄 转换：CSV → JSON');
  const csvResult = await parseCSV(csvPath);
  await exportToJSON(csvResult.data, jsonPath);
  console.log('  ✓ 完成:', jsonPath);

  // CSV → Excel
  console.log('🔄 转换：CSV → Excel');
  try {
    await exportToExcel(csvResult.data, excelPath);
    console.log('  ✓ 完成:', excelPath);
  } catch (error) {
    console.log('  ⚠️  跳过 (需要 xlsx 库)');
  }

  // JSON → CSV
  const jsonResult = await parseJSON(jsonPath);
  const csvBackPath = path.join(EXAMPLE_DIR, 'output/users-back.csv');
  await exportToCSV(jsonResult.data, csvBackPath);
  console.log('🔄 转换：JSON → CSV');
  console.log('  ✓ 完成:', csvBackPath);
}

// ==================== 主函数 ====================

async function main() {
  console.log('╔════════════════════════════════════════╗');
  console.log('║   数据导入工具 - 使用示例              ║');
  console.log('╚════════════════════════════════════════╝');

  try {
    // 运行所有示例
    await csvExample();
    await jsonExample();
    await excelExample();
    await autoDetectExample();
    await convertExample();

    console.log('\n╔════════════════════════════════════════╗');
    console.log('║   ✅ 所有示例运行完成！                ║');
    console.log('╚════════════════════════════════════════╝\n');

  } catch (error) {
    console.error('\n❌ 示例运行失败:', error);
    process.exit(1);
  }
}

// 运行示例
if (require.main === module) {
  main();
}

export { csvExample, jsonExample, excelExample, autoDetectExample, convertExample };
