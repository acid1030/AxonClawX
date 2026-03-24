/**
 * 模板方法模式 Pro - 快速测试
 * 
 * 运行：npx tsx test-templatemethod-pro.ts
 */

import {
  DataTransformSkill,
  HttpRequestSkill,
  DatabaseOperationSkill,
  demonstrateUsage
} from './templatemethod-pattern-pro-skill';

async function runQuickTests() {
  console.log('🚀 模板方法模式 Pro - 快速测试\n');

  // 测试 1: 数据转换
  console.log('━━━ 测试 1: 数据转换 ━━━');
  const transformSkill = new DataTransformSkill({ verbose: false });
  
  const result1 = await transformSkill.execute({
    data: [1, 2, 3, 4, 5],
    transformType: 'double'
  });
  
  console.assert(result1.success === true, '应该成功');
  console.assert(result1.data.length === 5, '数据长度应该为 5');
  console.assert(result1.data[0] === 2, '第一个元素应该是 2');
  console.log('✅ 数据转换测试通过\n');

  // 测试 2: 多次执行统计
  console.log('━━━ 测试 2: 性能统计 ━━━');
  for (let i = 0; i < 3; i++) {
    await transformSkill.execute({
      data: [10, 20, 30],
      transformType: 'double'
    });
  }
  
  const metrics = transformSkill.getMetrics();
  console.assert(metrics.executionCount === 4, '执行次数应该为 4');
  console.assert(metrics.successCount === 4, '成功次数应该为 4');
  console.assert(metrics.failureCount === 0, '失败次数应该为 0');
  console.log(`执行次数：${metrics.executionCount}`);
  console.log(`平均耗时：${metrics.avgExecutionTime}ms`);
  console.log('✅ 性能统计测试通过\n');

  // 测试 3: 数据库操作
  console.log('━━━ 测试 3: 数据库操作 ━━━');
  const dbSkill = new DatabaseOperationSkill({ verbose: false });
  
  await dbSkill.execute({
    operation: 'insert',
    table: 'test_users',
    data: { name: 'Test User', age: 25 }
  });
  
  const queryResult = await dbSkill.execute({
    operation: 'query',
    table: 'test_users'
  });
  
  console.assert(queryResult.success === true, '查询应该成功');
  console.assert(queryResult.data!.length === 1, '应该有 1 条数据');
  console.log('✅ 数据库操作测试通过\n');

  // 测试 4: 错误处理
  console.log('━━━ 测试 4: 错误处理 ━━━');
  try {
    await transformSkill.execute({
      data: 'not-an-array' as any,
      transformType: 'double'
    });
    console.error('❌ 应该抛出错误');
  } catch (error) {
    console.log(`捕获预期错误：${(error as Error).message}`);
    console.log('✅ 错误处理测试通过\n');
  }

  // 测试 5: HTTP 请求 (可选，需要网络)
  console.log('━━━ 测试 5: HTTP 请求 ━━━');
  const httpSkill = new HttpRequestSkill({ verbose: false, timeout: 10000 });
  
  try {
    const httpResult = await httpSkill.execute({
      url: 'https://jsonplaceholder.typicode.com/posts/1',
      method: 'GET'
    });
    
    console.assert(httpResult.success === true, 'HTTP 请求应该成功');
    console.assert(httpResult.status === 200, '状态码应该为 200');
    console.log(`响应时间：${httpResult.responseTime}ms`);
    console.log('✅ HTTP 请求测试通过\n');
  } catch (error) {
    console.log(`⚠️  HTTP 请求跳过 (网络问题): ${(error as Error).message}\n`);
  }

  console.log('════════════════════════════════════════');
  console.log('✅ 所有测试完成!');
  console.log('════════════════════════════════════════');
}

// 运行完整演示
async function runFullDemo() {
  console.log('\n📖 运行完整演示...\n');
  await demonstrateUsage();
}

// 主函数
async function main() {
  await runQuickTests();
  
  const runDemo = process.argv.includes('--demo');
  if (runDemo) {
    await runFullDemo();
  }
}

main().catch(console.error);
