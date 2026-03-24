/**
 * Skill Integration Examples - 技能集成调用示例
 * 
 * 展示如何使用技能注册表和调用器
 */

import { SkillRegistry, skillRegistry as defaultRegistry } from './skill-registry';
import { SkillInvoker } from './skill-invoker';
import { GitOpsSkill } from './git-ops';

// ============ 示例 1: 手动注册技能 ============

export async function example1_ManualRegistration() {
  console.log('=== 示例 1: 手动注册技能 ===\n');

  // 创建技能注册表
  const registry = new SkillRegistry({
    skillsDir: '/path/to/skills',
    autoScan: false, // 禁用自动扫描
  });

  // 创建技能实例
  const gitOpsSkill = new GitOpsSkill({
    workspaceRoot: '/Users/nike/.openclaw/workspace',
  });

  // 注册技能
  const skill = gitOpsSkill.toSkill();
  registry.register(skill);

  // 创建调用器
  const invoker = new SkillInvoker({
    registry,
    enableLogging: true,
    defaultTimeout: 30000,
  });

  // 调用技能
  console.log('调用 git-ops 的 status 命令...');
  const result = await invoker.invoke('git-ops', 'status');
  
  if (result.success) {
    console.log('仓库状态:', result.data);
  } else {
    console.error('调用失败:', result.error);
  }
}

// ============ 示例 2: 自动扫描技能 ============

export async function example2_AutoScanSkills() {
  console.log('=== 示例 2: 自动扫描技能 ===\n');

  // 创建带自动扫描的注册表
  const registry = new SkillRegistry({
    skillsDir: '/Users/nike/.openclaw/workspace/src/renderer/skills',
    autoScan: true,
  });

  // 自动扫描并注册所有技能
  await registry.scanAndRegister();

  // 获取所有技能列表
  const skills = registry.getSkillSummaries();
  console.log('已注册的技能:');
  skills.forEach(skill => {
    console.log(`  - ${skill.name} v${skill.version} (${skill.commandCount} 个命令)`);
  });

  // 创建调用器
  const invoker = new SkillInvoker({ registry });

  // 调用技能
  const result = await invoker.invoke('git-ops', 'status');
  console.log('调用结果:', result);
}

// ============ 示例 3: 技能调用 ============

export async function example3_SkillInvocation() {
  console.log('=== 示例 3: 技能调用 ===\n');

  const registry = new SkillRegistry({
    skillsDir: '/Users/nike/.openclaw/workspace/src/renderer/skills',
  });
  await registry.scanAndRegister();

  const invoker = new SkillInvoker({
    registry,
    enableLogging: true,
  });

  // 示例 3.1: 调用 git status
  console.log('3.1 调用 git status...');
  const statusResult = await invoker.invoke('git-ops', 'status');
  if (statusResult.success) {
    console.log('当前分支:', (statusResult.data as any)?.branch);
  }

  // 示例 3.2: 调用 git commit
  console.log('\n3.2 调用 git commit...');
  const commitResult = await invoker.invoke('git-ops', 'commit', {
    message: 'feat: add new feature',
    all: true,
  });
  if (commitResult.success) {
    console.log('提交成功:', (commitResult.data as any)?.hash);
  } else {
    console.log('提交失败:', commitResult.error);
  }

  // 示例 3.3: 调用智能提交
  console.log('\n3.3 调用智能提交...');
  const smartCommitResult = await invoker.invoke('git-ops', 'smart-commit', {
    all: true,
  });
  console.log('智能提交结果:', smartCommitResult);
}

// ============ 示例 4: 批量调用 ============

export async function example4_BatchInvocation() {
  console.log('=== 示例 4: 批量调用 ===\n');

  const registry = new SkillRegistry({
    skillsDir: '/Users/nike/.openclaw/workspace/src/renderer/skills',
  });
  await registry.scanAndRegister();

  const invoker = new SkillInvoker({ registry });

  // 批量调用
  const results = await invoker.batchInvoke([
    { skillName: 'git-ops', commandName: 'status' },
    { skillName: 'git-ops', commandName: 'push' },
  ]);

  results.forEach((result, index) => {
    console.log(`调用 ${index + 1}:`, result.success ? '成功' : '失败');
  });
}

// ============ 示例 5: 并行调用 ============

export async function example5_ParallelInvocation() {
  console.log('=== 示例 5: 并行调用 ===\n');

  const registry = new SkillRegistry({
    skillsDir: '/Users/nike/.openclaw/workspace/src/renderer/skills',
  });
  await registry.scanAndRegister();

  const invoker = new SkillInvoker({ registry });

  // 并行调用多个技能
  const results = await invoker.parallelInvoke([
    { skillName: 'git-ops', commandName: 'status' },
    { skillName: 'git-ops', commandName: 'status' }, // 可以同时调用同一个技能
  ]);

  console.log('并行调用完成:', results.length, '个结果');
}

// ============ 示例 6: 技能管理 ============

export async function example6_SkillManagement() {
  console.log('=== 示例 6: 技能管理 ===\n');

  const registry = new SkillRegistry({
    skillsDir: '/Users/nike/.openclaw/workspace/src/renderer/skills',
  });
  await registry.scanAndRegister();

  // 获取技能
  const gitOpsSkill = registry.getSkill('git-ops');
  console.log('技能信息:', gitOpsSkill);

  // 禁用技能
  registry.setSkillEnabled('git-ops', false);
  console.log('技能已禁用');

  // 尝试调用禁用的技能
  const invoker = new SkillInvoker({ registry });
  const result = await invoker.invoke('git-ops', 'status');
  console.log('调用禁用技能结果:', result.error);

  // 重新启用技能
  registry.setSkillEnabled('git-ops', true);
  console.log('技能已重新启用');
}

// ============ 示例 7: 调用统计和日志 ============

export async function example7_InvocationStats() {
  console.log('=== 示例 7: 调用统计和日志 ===\n');

  const registry = new SkillRegistry({
    skillsDir: '/Users/nike/.openclaw/workspace/src/renderer/skills',
  });
  await registry.scanAndRegister();

  const invoker = new SkillInvoker({
    registry,
    enableLogging: true,
    maxLogSize: 100,
  });

  // 执行一些调用
  await invoker.invoke('git-ops', 'status');
  await invoker.invoke('git-ops', 'status');
  await invoker.invoke('git-ops', 'commit', { message: 'test' });

  // 获取统计信息
  const stats = invoker.getStats();
  console.log('调用统计:');
  console.log('  总调用次数:', stats.totalCalls);
  console.log('  成功次数:', stats.successfulCalls);
  console.log('  失败次数:', stats.failedCalls);
  console.log('  成功率:', stats.successRate.toFixed(2) + '%');
  console.log('  平均耗时:', stats.avgDuration.toFixed(2) + 'ms');

  // 获取调用日志
  const logs = invoker.getLogs(5);
  console.log('\n最近 5 条调用日志:');
  logs.forEach((log, i) => {
    console.log(`  ${i + 1}. ${log.skillName}.${log.commandName} - ${log.success ? '成功' : '失败'}`);
  });
}

// ============ 示例 8: 使用默认导出 ============

export async function example8_DefaultExport() {
  console.log('=== 示例 8: 使用默认导出 ===\n');

  // 使用默认导出的 registry
  const registry = defaultRegistry;
  await registry.scanAndRegister();

  // 创建调用器
  const invoker = new SkillInvoker({ registry });

  // 调用技能
  const result = await invoker.invoke('git-ops', 'status');
  console.log('调用结果:', result);
}

// ============ 示例 9: 错误处理 ============

export async function example9_ErrorHandling() {
  console.log('=== 示例 9: 错误处理 ===\n');

  const registry = new SkillRegistry({
    skillsDir: '/Users/nike/.openclaw/workspace/src/renderer/skills',
  });
  await registry.scanAndRegister();

  const invoker = new SkillInvoker({ registry });

  // 调用不存在的技能
  const result1 = await invoker.invoke('non-existent-skill', 'command');
  console.log('调用不存在的技能:', result1.error);

  // 调用不存在的命令
  const result2 = await invoker.invoke('git-ops', 'non-existent-command');
  console.log('调用不存在的命令:', result2.error);

  // 带重试的调用
  const result3 = await invoker.invoke('git-ops', 'status', {}, {
    retries: 3,
    timeout: 5000,
  });
  console.log('带重试的调用:', result3);
}

// ============ 示例 10: 导出技能列表 ============

export async function example10_ExportSkillList() {
  console.log('=== 示例 10: 导出技能列表 ===\n');

  const registry = new SkillRegistry({
    skillsDir: '/Users/nike/.openclaw/workspace/src/renderer/skills',
  });
  await registry.scanAndRegister();

  // 导出为 JSON
  const json = registry.exportToJson();
  console.log('技能列表 JSON:');
  console.log(json);
}

// ============ 运行所有示例 ============

export async function runAllExamples() {
  console.log('========================================');
  console.log('  Skill Integration Examples');
  console.log('========================================\n');

  try {
    await example1_ManualRegistration();
    await example2_AutoScanSkills();
    await example3_SkillInvocation();
    await example4_BatchInvocation();
    await example5_ParallelInvocation();
    await example6_SkillManagement();
    await example7_InvocationStats();
    await example8_DefaultExport();
    await example9_ErrorHandling();
    await example10_ExportSkillList();

    console.log('\n========================================');
    console.log('  所有示例运行完成!');
    console.log('========================================');
  } catch (error) {
    console.error('运行示例时出错:', error);
  }
}

// 如果直接运行此文件
if (require.main === module) {
  runAllExamples();
}
