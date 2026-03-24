/**
 * 导出管理技能 - 使用示例
 * Export Manager Skill - Usage Examples
 * 
 * @author KAEL
 * @version 1.0.0
 */

import {
  ExportFormat,
  exportCSV,
  exportExcel,
  exportJSON,
  exportData,
  batchExport,
  ExportResult
} from './export-manager-skill';

// ============================================
// 示例数据
// ============================================

interface User {
  id: number;
  name: string;
  email: string;
  age: number;
  department: string;
  salary: number;
  joinDate: string;
}

const users: User[] = [
  {
    id: 1,
    name: '张三',
    email: 'zhangsan@example.com',
    age: 28,
    department: '技术部',
    salary: 15000,
    joinDate: '2023-01-15'
  },
  {
    id: 2,
    name: '李四',
    email: 'lisi@example.com',
    age: 32,
    department: '产品部',
    salary: 18000,
    joinDate: '2022-06-20'
  },
  {
    id: 3,
    name: '王五',
    email: 'wangwu@example.com',
    age: 25,
    department: '设计部',
    salary: 12000,
    joinDate: '2023-03-10'
  },
  {
    id: 4,
    name: '赵六',
    email: 'zhaoliu@example.com',
    age: 35,
    department: '技术部',
    salary: 22000,
    joinDate: '2021-09-01'
  }
];

// ============================================
// 示例 1: CSV 导出
// ============================================

/**
 * 基础 CSV 导出
 */
function example1_basicCSV(): void {
  console.log('\n=== 示例 1: 基础 CSV 导出 ===');
  
  const result: ExportResult = exportCSV(users, './exports/users.csv');
  
  if (result.success) {
    console.log(`✓ 导出成功`);
    console.log(`  文件路径：${result.outputPath}`);
    console.log(`  记录数：${result.recordCount}`);
    console.log(`  文件大小：${result.fileSize} bytes`);
  } else {
    console.log(`✗ 导出失败：${result.error}`);
  }
}

/**
 * CSV 导出 - 指定列
 */
function example2_csvWithColumns(): void {
  console.log('\n=== 示例 2: CSV 导出 - 指定列 ===');
  
  const result = exportCSV(users, './exports/users_selected.csv', {
    columns: ['id', 'name', 'email', 'department'],
    includeBOM: true  // Excel 中文支持
  });
  
  if (result.success) {
    console.log(`✓ 导出成功 (仅导出指定列)`);
    console.log(`  文件路径：${result.outputPath}`);
    console.log(`  记录数：${result.recordCount}`);
  }
}

/**
 * CSV 导出 - 自定义分隔符
 */
function example3_csvCustomDelimiter(): void {
  console.log('\n=== 示例 3: CSV 导出 - 自定义分隔符 ===');
  
  const result = exportCSV(users, './exports/users_tab.csv', {
    delimiter: '\t',  // 制表符分隔
    includeBOM: true
  });
  
  if (result.success) {
    console.log(`✓ 导出成功 (制表符分隔)`);
    console.log(`  文件路径：${result.outputPath}`);
  }
}

// ============================================
// 示例 4-6: Excel 导出
// ============================================

/**
 * 基础 Excel 导出
 */
function example4_basicExcel(): void {
  console.log('\n=== 示例 4: 基础 Excel 导出 ===');
  
  const result = exportExcel(users, './exports/users.xlsx', {
    includeBOM: true
  });
  
  if (result.success) {
    console.log(`✓ Excel 导出成功`);
    console.log(`  文件路径：${result.outputPath}`);
    console.log(`  记录数：${result.recordCount}`);
    console.log(`  文件大小：${result.fileSize} bytes`);
  }
}

/**
 * Excel 导出 - 指定列
 */
function example5_excelWithColumns(): void {
  console.log('\n=== 示例 5: Excel 导出 - 指定列 ===');
  
  const result = exportExcel(users, './exports/users_salary.xlsx', {
    columns: ['name', 'department', 'salary', 'joinDate'],
    includeBOM: true
  });
  
  if (result.success) {
    console.log(`✓ Excel 导出成功 (薪资报表)`);
    console.log(`  文件路径：${result.outputPath}`);
  }
}

// ============================================
// 示例 7-9: JSON 导出
// ============================================

/**
 * JSON 导出 - 格式化
 */
function example7_jsonPretty(): void {
  console.log('\n=== 示例 7: JSON 导出 - 格式化 ===');
  
  const result = exportJSON(users, './exports/users.json', {
    pretty: true  // 美化输出，带缩进
  });
  
  if (result.success) {
    console.log(`✓ JSON 导出成功 (格式化)`);
    console.log(`  文件路径：${result.outputPath}`);
    console.log(`  记录数：${result.recordCount}`);
    console.log(`  文件大小：${result.fileSize} bytes`);
  }
}

/**
 * JSON 导出 - 压缩
 */
function example8_jsonMinified(): void {
  console.log('\n=== 示例 8: JSON 导出 - 压缩 ===');
  
  const result = exportJSON(users, './exports/users.min.json', {
    pretty: false  // 压缩输出，无空格
  });
  
  if (result.success) {
    console.log(`✓ JSON 导出成功 (压缩)`);
    console.log(`  文件路径：${result.outputPath}`);
    console.log(`  文件大小：${result.fileSize} bytes`);
  }
}

/**
 * JSON 导出 - 单个对象
 */
function example9_jsonSingleObject(): void {
  console.log('\n=== 示例 9: JSON 导出 - 单个对象 ===');
  
  const config = {
    appName: 'AxonClaw',
    version: '1.0.0',
    environment: 'production',
    features: ['export', 'import', 'sync'],
    timestamp: new Date().toISOString()
  };
  
  const result = exportJSON(config, './exports/config.json', {
    pretty: true
  });
  
  if (result.success) {
    console.log(`✓ 配置导出成功`);
    console.log(`  文件路径：${result.outputPath}`);
  }
}

// ============================================
// 示例 10-12: 统一导出接口
// ============================================

/**
 * 统一导出 - CSV
 */
function example10_unifiedCSV(): void {
  console.log('\n=== 示例 10: 统一导出接口 - CSV ===');
  
  const result = exportData(users, {
    format: ExportFormat.CSV,
    outputPath: './exports/unified_users.csv',
    columns: ['id', 'name', 'email'],
    includeBOM: true
  });
  
  if (result.success) {
    console.log(`✓ 统一导出成功 (CSV)`);
  }
}

/**
 * 统一导出 - Excel
 */
function example11_unifiedExcel(): void {
  console.log('\n=== 示例 11: 统一导出接口 - Excel ===');
  
  const result = exportData(users, {
    format: ExportFormat.EXCEL,
    outputPath: './exports/unified_users.xlsx',
    includeBOM: true
  });
  
  if (result.success) {
    console.log(`✓ 统一导出成功 (Excel)`);
  }
}

/**
 * 统一导出 - JSON
 */
function example12_unifiedJSON(): void {
  console.log('\n=== 示例 12: 统一导出接口 - JSON ===');
  
  const result = exportData(users, {
    format: ExportFormat.JSON,
    outputPath: './exports/unified_users.json',
    pretty: true
  });
  
  if (result.success) {
    console.log(`✓ 统一导出成功 (JSON)`);
  }
}

// ============================================
// 示例 13: 批量导出
// ============================================

/**
 * 批量导出 - 多种格式
 */
function example13_batchExport(): void {
  console.log('\n=== 示例 13: 批量导出 ===');
  
  const tasks = [
    {
      name: '用户 CSV',
      data: users,
      format: ExportFormat.CSV,
      outputPath: './exports/batch_users.csv',
      options: { columns: ['id', 'name', 'email'], includeBOM: true }
    },
    {
      name: '用户 Excel',
      data: users,
      format: ExportFormat.EXCEL,
      outputPath: './exports/batch_users.xlsx',
      options: { includeBOM: true }
    },
    {
      name: '用户 JSON',
      data: users,
      format: ExportFormat.JSON,
      outputPath: './exports/batch_users.json',
      options: { pretty: true }
    },
    {
      name: '技术部员工',
      data: users.filter(u => u.department === '技术部'),
      format: ExportFormat.CSV,
      outputPath: './exports/batch_tech_users.csv',
      options: { includeBOM: true }
    }
  ];
  
  const result = batchExport(tasks);
  
  console.log(`\n批量导出完成:`);
  console.log(`  总任务数：${result.totalTasks}`);
  console.log(`  成功：${result.successCount}`);
  console.log(`  失败：${result.failureCount}`);
  
  result.results.forEach(item => {
    const status = item.result.success ? '✓' : '✗';
    console.log(`  ${status} ${item.name}: ${item.result.outputPath}`);
    if (!item.result.success) {
      console.log(`     错误：${item.result.error}`);
    }
  });
}

// ============================================
// 示例 14: 实际业务场景
// ============================================

/**
 * 业务场景 - 月度报表导出
 */
function example14_monthlyReport(): void {
  console.log('\n=== 示例 14: 业务场景 - 月度报表导出 ===');
  
  const month = new Date().toISOString().slice(0, 7); // YYYY-MM
  
  // 准备报表数据
  const reportData = {
    month,
    generatedAt: new Date().toISOString(),
    totalUsers: users.length,
    averageSalary: Math.round(users.reduce((sum, u) => sum + u.salary, 0) / users.length),
    departments: [...new Set(users.map(u => u.department))],
    employees: users
  };
  
  // 导出报表
  const tasks = [
    {
      name: '员工明细',
      data: users,
      format: ExportFormat.EXCEL,
      outputPath: `./reports/${month}_employees.xlsx`,
      options: { includeBOM: true }
    },
    {
      name: '报表摘要',
      data: reportData,
      format: ExportFormat.JSON,
      outputPath: `./reports/${month}_summary.json`,
      options: { pretty: true }
    }
  ];
  
  const result = batchExport(tasks);
  
  console.log(`月度报表生成完成 (${month})`);
  console.log(`  成功：${result.successCount}/${result.totalTasks}`);
}

// ============================================
// 示例 15: 错误处理
// ============================================

/**
 * 错误处理示例
 */
function example15_errorHandling(): void {
  console.log('\n=== 示例 15: 错误处理 ===');
  
  // 尝试导出到只读目录
  const result = exportCSV(users, '/root/readonly/users.csv', {
    overwrite: false
  });
  
  if (!result.success) {
    console.log(`✓ 捕获预期错误:`);
    console.log(`  错误信息：${result.error}`);
  }
  
  // 尝试覆盖已存在文件 (不允许)
  const result2 = exportJSON(users, './exports/users.json', {
    pretty: true,
    overwrite: false  // 如果文件已存在，将失败
  });
  
  if (!result2.success) {
    console.log(`✓ 文件已存在保护:`);
    console.log(`  错误信息：${result2.error}`);
  }
}

// ============================================
// 运行所有示例
// ============================================

function runAllExamples(): void {
  console.log('╔════════════════════════════════════════╗');
  console.log('║  导出管理技能 - 使用示例               ║');
  console.log('║  Export Manager Skill Examples         ║');
  console.log('╚════════════════════════════════════════╝');
  
  // CSV 示例
  example1_basicCSV();
  example2_csvWithColumns();
  example3_csvCustomDelimiter();
  
  // Excel 示例
  example4_basicExcel();
  example5_excelWithColumns();
  
  // JSON 示例
  example7_jsonPretty();
  example8_jsonMinified();
  example9_jsonSingleObject();
  
  // 统一导出
  example10_unifiedCSV();
  example11_unifiedExcel();
  example12_unifiedJSON();
  
  // 批量导出
  example13_batchExport();
  
  // 业务场景
  example14_monthlyReport();
  
  // 错误处理
  example15_errorHandling();
  
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║  所有示例运行完成 ✓                    ║');
  console.log('╚════════════════════════════════════════╝\n');
}

// ============================================
// 导出示例函数
// ============================================

export {
  example1_basicCSV,
  example2_csvWithColumns,
  example3_csvCustomDelimiter,
  example4_basicExcel,
  example5_excelWithColumns,
  example7_jsonPretty,
  example8_jsonMinified,
  example9_jsonSingleObject,
  example10_unifiedCSV,
  example11_unifiedExcel,
  example12_unifiedJSON,
  example13_batchExport,
  example14_monthlyReport,
  example15_errorHandling,
  runAllExamples
};

// 如果直接运行此文件
if (require.main === module) {
  runAllExamples();
}
