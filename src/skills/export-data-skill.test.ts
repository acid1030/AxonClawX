/**
 * 数据导出技能测试
 */

import {
  exportArrayData,
  exportToCSV,
  exportToJSON,
  exportToExcel,
  getTaskStatus,
  getAllTasks,
  cancelTask,
  cleanupTasks,
  type PaginatedDataSource,
} from './export-data-skill';

// 测试数据
const testUsers = [
  { id: 1, name: '张三', email: 'zhangsan@example.com', age: 28, city: '北京' },
  { id: 2, name: '李四', email: 'lisi@example.com', age: 32, city: '上海' },
  { id: 3, name: '王五', email: 'wangwu@example.com', age: 25, city: '广州' },
  { id: 4, name: '赵六', email: 'zhaoliu@example.com', age: 30, city: '深圳' },
  { id: 5, name: '孙七', email: 'sunqi@example.com', age: 27, city: '杭州' },
];

async function runTests() {
  console.log('🧪 开始运行导出技能测试...\n');
  
  // 测试 1: CSV 导出
  console.log('📋 测试 1: CSV 导出');
  try {
    const csvResult = await exportToCSV(testUsers, './test-exports/users.csv');
    console.log('✅ CSV 导出成功');
    console.log(`   任务 ID: ${csvResult.taskId}`);
    console.log(`   记录数：${csvResult.exportedRecords}`);
    console.log(`   耗时：${csvResult.exportTime}ms`);
    console.log(`   文件大小：${csvResult.fileSize} bytes\n`);
  } catch (error) {
    console.error('❌ CSV 导出失败:', error);
  }
  
  // 测试 2: JSON 导出 (指定字段)
  console.log('📋 测试 2: JSON 导出 (指定字段)');
  try {
    const jsonResult = await exportToJSON(testUsers, './test-exports/users_filtered.json', {
      fields: ['id', 'name', 'email'],
    });
    console.log('✅ JSON 导出成功');
    console.log(`   任务 ID: ${jsonResult.taskId}`);
    console.log(`   记录数：${jsonResult.exportedRecords}`);
    console.log(`   耗时：${jsonResult.exportTime}ms\n`);
  } catch (error) {
    console.error('❌ JSON 导出失败:', error);
  }
  
  // 测试 3: Excel 导出
  console.log('📋 测试 3: Excel 导出');
  try {
    const excelResult = await exportToExcel(testUsers, './test-exports/users.xlsx', {
      sheetName: '用户列表',
    });
    console.log('✅ Excel 导出成功');
    console.log(`   任务 ID: ${excelResult.taskId}`);
    console.log(`   记录数：${excelResult.exportedRecords}`);
    console.log(`   耗时：${excelResult.exportTime}ms\n`);
  } catch (error) {
    console.error('❌ Excel 导出失败:', error);
  }
  
  // 测试 4: 带进度回调的导出
  console.log('📋 测试 4: 带进度回调的导出');
  try {
    const progressResult = await exportArrayData(
      { data: testUsers },
      {
        format: 'csv',
        outputPath: './test-exports/users_progress.csv',
        onProgress: (taskId, progress) => {
          console.log(`   进度：${progress.percentage}% (${progress.current}/${progress.total})`);
        },
        onStatusChange: (taskId, status) => {
          console.log(`   状态变更：${status}`);
        },
      }
    );
    console.log('✅ 带进度回调的导出成功');
    console.log(`   任务 ID: ${progressResult.taskId}`);
    console.log(`   记录数：${progressResult.exportedRecords}\n`);
  } catch (error) {
    console.error('❌ 带进度回调的导出失败:', error);
  }
  
  // 测试 5: 分页数据源导出
  console.log('📋 测试 5: 分页数据源导出');
  try {
    const mockDataSource: PaginatedDataSource = {
      async getPage(page: number, pageSize: number) {
        const start = page * pageSize;
        const end = Math.min(start + pageSize, testUsers.length);
        const data = testUsers.slice(start, end);
        
        return {
          data,
          total: testUsers.length,
          hasMore: end < testUsers.length,
        };
      },
    };
    
    const { exportPaginatedData } = await import('./export-data-skill');
    const paginatedResult = await exportPaginatedData(mockDataSource, {
      format: 'csv',
      outputPath: './test-exports/users_paginated.csv',
      pageSize: 2,
      onProgress: (taskId, progress) => {
        console.log(`   分页进度：${progress.percentage}%`);
      },
    });
    console.log('✅ 分页数据源导出成功');
    console.log(`   任务 ID: ${paginatedResult.taskId}`);
    console.log(`   记录数：${paginatedResult.exportedRecords}\n`);
  } catch (error) {
    console.error('❌ 分页数据源导出失败:', error);
  }
  
  // 测试 6: 任务管理
  console.log('📋 测试 6: 任务管理');
  try {
    const allTasks = getAllTasks();
    console.log(`   当前任务数：${allTasks.length}`);
    
    if (allTasks.length > 0) {
      const firstTask = allTasks[0];
      console.log(`   第一个任务状态：${firstTask.status}`);
      console.log(`   第一个任务进度：${firstTask.progress.percentage}%`);
      
      const taskStatus = getTaskStatus(firstTask.id);
      console.log(`   查询任务状态：${taskStatus?.status || 'not found'}`);
    }
    
    const cleaned = cleanupTasks(0); // 清理所有已完成任务
    console.log(`   清理任务数：${cleaned}\n`);
  } catch (error) {
    console.error('❌ 任务管理失败:', error);
  }
  
  console.log('✅ 所有测试完成!\n');
}

// 运行测试
runTests().catch(console.error);
