/**
 * Seeder Utils 使用示例
 * 
 * 演示如何使用数据库种子数据填充工具
 * 
 * @author Axon (KAEL Engineering)
 * @since 2026-03-13
 */

import { 
  SeederUtils, 
  createSeeder, 
  seed, 
  seedFactory,
  DEFAULT_AGENTS,
  DEFAULT_SKILLS,
  createDefaultTask,
} from './seeder-utils-skill';

// ============== 示例 1: 基础用法 ==============

async function example1_basicUsage() {
  console.log('\n=== 示例 1: 基础用法 ===\n');
  
  const seeder = createSeeder({ verbose: true });
  
  // 插入预定义的 Agent 数据
  const result = await seeder.seed({
    name: 'Default Agents',
    records: DEFAULT_AGENTS.map(agent => ({
      table: 'agents',
      data: agent,
    })),
  });
  
  console.log(`✅ 插入 ${result.totalInserted} 条记录`);
}

// ============== 示例 2: 使用工厂函数批量生成 ==============

async function example2_factoryFunction() {
  console.log('\n=== 示例 2: 工厂函数批量生成 ===\n');
  
  const seeder = createSeeder({ verbose: true });
  
  // 生成 100 个测试任务
  const result = await seeder.seedWithFactory(
    'tasks',
    (index) => createDefaultTask(index),
    100,
    { name: 'Test Tasks Batch' }
  );
  
  console.log(`✅ 生成 ${result.totalInserted} 个任务`);
  console.log(`📊 表统计:`, result.tableStats);
}

// ============== 示例 3: 生成关联数据 ==============

async function example3_relatedData() {
  console.log('\n=== 示例 3: 生成关联数据 ===\n');
  
  const seeder = createSeeder({ verbose: true });
  
  // 生成 Agent 和他们的任务
  const result = await seeder.seedWithRelations(
    'agents',
    // 主表工厂函数
    (index) => ({
      name: `Worker Agent ${index + 1}`,
      type: 'worker',
      status: index % 5 === 0 ? 'busy' : 'idle',
    }),
    // 关联配置
    [
      {
        mainTable: 'agents',
        relatedTable: 'tasks',
        foreignKey: 'agent_id',
        generate: (agent, taskIndex) => ({
          title: `${agent.name} - Task ${taskIndex + 1}`,
          description: `自动生成的任务`,
          status: ['pending', 'in_progress', 'completed'][taskIndex % 3],
          priority: ['low', 'medium', 'high'][taskIndex % 3],
        }),
      },
    ],
    10, // 生成 10 个 Agent
    {
      name: 'Agents with Tasks',
      relatedCount: (agentIndex) => 3 + (agentIndex % 3), // 每个 Agent 有 3-5 个任务
    }
  );
  
  console.log(`✅ 生成关联数据完成`);
  console.log(`📊 总记录数：${result.totalInserted}`);
}

// ============== 示例 4: 事务与回滚 ==============

async function example4_transactionAndRollback() {
  console.log('\n=== 示例 4: 事务与回滚 ===\n');
  
  const seeder = createSeeder({ 
    verbose: true, 
    useTransaction: true,
    rollbackLogPath: './rollback-log.json',
  });
  
  // 第一批数据
  await seeder.seed({
    name: 'Batch 1',
    records: [
      { table: 'agents', data: { name: 'Temp Agent 1', type: 'temp', status: 'active' } },
    ],
  });
  
  // 第二批数据
  await seeder.seed({
    name: 'Batch 2',
    records: [
      { table: 'agents', data: { name: 'Temp Agent 2', type: 'temp', status: 'active' } },
    ],
  });
  
  console.log('\n📋 回滚栈信息:');
  console.log(seeder.getRollbackStack());
  
  // 回滚最近一次
  console.log('\n↩️ 回滚最近一批...');
  await seeder.rollback();
  
  // 回滚所有
  console.log('\n↩️ 回滚所有批次...');
  const count = await seeder.rollbackAll();
  console.log(`回滚了 ${count} 个批次`);
}

// ============== 示例 5: 使用快捷函数 ==============

async function example5_helperFunctions() {
  console.log('\n=== 示例 5: 快捷函数 ===\n');
  
  // 使用 seed 快捷函数
  const result1 = await seed({
    name: 'Quick Seed',
    records: [
      { table: 'skills', data: DEFAULT_SKILLS[0] },
      { table: 'skills', data: DEFAULT_SKILLS[1] },
    ],
  }, { verbose: true });
  
  console.log(`✅ 快捷插入：${result1.totalInserted} 条记录`);
  
  // 使用 seedFactory 快捷函数
  const result2 = await seedFactory(
    'tasks',
    (i) => createDefaultTask(i),
    50,
    { name: 'Quick Factory Seed' }
  );
  
  console.log(`✅ 快捷工厂：${result2.totalInserted} 条记录`);
}

// ============== 示例 6: 错误处理 ==============

async function example6_errorHandling() {
  console.log('\n=== 示例 6: 错误处理 ===\n');
  
  const seeder = createSeeder({ 
    verbose: true,
    continueOnError: true, // 遇到错误继续执行
  });
  
  const result = await seeder.seed({
    name: 'Error Handling Test',
    records: [
      { table: 'agents', data: { name: 'Valid Agent', type: 'test', status: 'active' } },
      { table: 'agents', data: { name: 'Duplicate Agent', type: 'test', status: 'active' } },
      // 故意插入重复名称 (UNIQUE 约束会失败)
      { table: 'agents', data: { name: 'Duplicate Agent', type: 'test', status: 'active' } },
    ],
  });
  
  console.log(`\n📊 结果统计:`);
  console.log(`   成功：${result.totalInserted}`);
  console.log(`   失败：${result.failedCount}`);
  console.log(`   错误：`, result.errors);
}

// ============== 示例 7: 清空表 ==============

async function example7_truncate() {
  console.log('\n=== 示例 7: 清空表 ===\n');
  
  const seeder = createSeeder({ verbose: true });
  
  // 清空所有测试数据
  seeder.truncate(['tasks', 'agents', 'skills']);
  
  console.log('✅ 表已清空');
}

// ============== 示例 8: 复杂场景 - 完整测试数据集 ==============

async function example8_fullTestDataset() {
  console.log('\n=== 示例 8: 完整测试数据集 ===\n');
  
  const seeder = createSeeder({ 
    verbose: true, 
    useTransaction: true,
    batchSize: 50,
  });
  
  // 1. 插入所有预定义 Agent
  await seeder.seed({
    name: 'All Default Agents',
    records: DEFAULT_AGENTS.map(agent => ({
      table: 'agents',
      data: agent,
      refId: `agent_${agent.name}`,
    })),
  });
  
  // 2. 插入所有预定义 Skills
  await seeder.seed({
    name: 'All Default Skills',
    records: DEFAULT_SKILLS.map(skill => ({
      table: 'skills',
      data: skill,
      refId: `skill_${skill.name}`,
    })),
  });
  
  // 3. 为每个 Agent 生成任务
  const result = await seeder.seedWithRelations(
    'agents',
    (index) => DEFAULT_AGENTS[index] || { name: `Agent ${index}`, type: 'auto', status: 'active' },
    [
      {
        mainTable: 'agents',
        relatedTable: 'tasks',
        foreignKey: 'agent_id',
        generate: (agent, taskIndex) => ({
          title: `${agent.name} - 任务 ${taskIndex + 1}`,
          description: `为 ${agent.name} 自动生成的测试任务`,
          status: ['pending', 'in_progress', 'completed', 'blocked'][taskIndex % 4],
          priority: ['low', 'medium', 'high', 'critical'][taskIndex % 4],
        }),
      },
    ],
    DEFAULT_AGENTS.length,
    {
      name: 'Complete Test Dataset',
      relatedCount: () => 5, // 每个 Agent 5 个任务
    }
  );
  
  console.log(`\n✅ 完整测试数据集生成完成`);
  console.log(`📊 总记录数：${result.totalInserted}`);
  console.log(`📊 表统计:`, result.tableStats);
}

// ============== 示例 9: 性能测试 - 批量插入性能 ==============

async function example9_performanceTest() {
  console.log('\n=== 示例 9: 性能测试 ===\n');
  
  const seeder = createSeeder({ verbose: false });
  
  // 测试 1000 条记录
  const startTime = performance.now();
  const result = await seeder.seedWithFactory(
    'tasks',
    (i) => ({
      title: `Performance Test Task ${i}`,
      description: `用于性能测试的任务 #${i}`,
      status: 'pending',
      priority: 'medium',
    }),
    1000,
    { name: 'Performance Test' }
  );
  const endTime = performance.now();
  
  console.log(`📊 性能测试结果:`);
  console.log(`   插入记录数：${result.totalInserted}`);
  console.log(`   总耗时：${(endTime - startTime).toFixed(2)}ms`);
  console.log(`   平均每条：${((endTime - startTime) / 1000).toFixed(3)}ms`);
  console.log(`   吞吐量：${(1000 / ((endTime - startTime) / 1000)).toFixed(2)} records/sec`);
}

// ============== 主函数 ==============

async function main() {
  console.log('🌱 Seeder Utils 使用示例\n');
  console.log('═'.repeat(60));
  
  try {
    // 运行所有示例
    await example1_basicUsage();
    await example2_factoryFunction();
    await example3_relatedData();
    await example4_transactionAndRollback();
    await example5_helperFunctions();
    await example6_errorHandling();
    await example8_fullTestDataset();
    await example9_performanceTest();
    
    // 最后清空数据
    await example7_truncate();
    
    console.log('\n✅ 所有示例运行完成!\n');
  } catch (error: any) {
    console.error('\n❌ 示例运行失败:', error.message);
  }
}

// 如果直接运行此文件
if (require.main === module) {
  main();
}

// ============== 导出示例函数 ==============

export {
  example1_basicUsage,
  example2_factoryFunction,
  example3_relatedData,
  example4_transactionAndRollback,
  example5_helperFunctions,
  example6_errorHandling,
  example7_truncate,
  example8_fullTestDataset,
  example9_performanceTest,
  main,
};
