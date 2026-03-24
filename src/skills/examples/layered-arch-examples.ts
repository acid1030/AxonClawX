/**
 * Layered Architecture Skill - 使用示例
 * 
 * 演示如何使用分层架构工具进行层次定义、依赖规则和跨层调用验证
 */

import {
  layeredArch,
  ArchitectureLayer,
  createModule,
  canDependOn,
  getLayerPriority
} from '../layered-arch-skill';

// ============================================
// 示例 1: 基础层次查询
// ============================================
console.log('=== 示例 1: 基础层次查询 ===\n');

const allLayers = layeredArch.getAllLayers();
allLayers.forEach(layer => {
  console.log(`层次：${layer.name}`);
  console.log(`  描述：${layer.description}`);
  console.log(`  优先级：${layer.priority}`);
  console.log(`  允许依赖：${layer.allowedDependencies.join(', ')}`);
  console.log('');
});

// ============================================
// 示例 2: 跨层调用规则检查
// ============================================
console.log('=== 示例 2: 跨层调用规则检查 ===\n');

const testCases = [
  { from: ArchitectureLayer.PRESENTATION, to: ArchitectureLayer.BUSINESS },
  { from: ArchitectureLayer.PRESENTATION, to: ArchitectureLayer.DOMAIN },
  { from: ArchitectureLayer.BUSINESS, to: ArchitectureLayer.DOMAIN },
  { from: ArchitectureLayer.DOMAIN, to: ArchitectureLayer.INFRASTRUCTURE },
  { from: ArchitectureLayer.INFRASTRUCTURE, to: ArchitectureLayer.BUSINESS }
];

testCases.forEach(({ from, to }) => {
  const allowed = canDependOn(from, to);
  const fromPriority = getLayerPriority(from);
  const toPriority = getLayerPriority(to);
  
  console.log(`${from} → ${to}: ${allowed ? '✅ 允许' : '❌ 禁止'}`);
  console.log(`  优先级：${fromPriority} → ${toPriority}`);
});

console.log('');

// ============================================
// 示例 3: 注册模块
// ============================================
console.log('=== 示例 3: 注册模块 ===\n');

// 表示层模块
layeredArch.registerModule(createModule(
  'UserController',
  ArchitectureLayer.PRESENTATION,
  'src/presentation/controllers/UserController.ts',
  ['UserService', 'CommonUtils'],
  ['createUser', 'getUser', 'deleteUser']
));

layeredArch.registerModule(createModule(
  'UserView',
  ArchitectureLayer.PRESENTATION,
  'src/presentation/views/UserView.tsx',
  ['UserService'],
  ['UserList', 'UserDetail']
));

// 业务层模块
layeredArch.registerModule(createModule(
  'UserService',
  ArchitectureLayer.BUSINESS,
  'src/business/services/UserService.ts',
  ['UserRepository', 'UserEntity', 'Logger'],
  ['createUser', 'updateUser', 'deleteUser', 'findUser']
));

layeredArch.registerModule(createModule(
  'OrderService',
  ArchitectureLayer.BUSINESS,
  'src/business/services/OrderService.ts',
  ['OrderRepository', 'UserRepository', 'OrderEntity'],
  ['createOrder', 'cancelOrder']
));

// 领域层模块
layeredArch.registerModule(createModule(
  'UserEntity',
  ArchitectureLayer.DOMAIN,
  'src/domain/entities/UserEntity.ts',
  ['CommonUtils'],
  ['User', 'UserFactory']
));

layeredArch.registerModule(createModule(
  'OrderEntity',
  ArchitectureLayer.DOMAIN,
  'src/domain/entities/OrderEntity.ts',
  ['CommonUtils'],
  ['Order', 'OrderFactory']
));

// 基础设施层模块
layeredArch.registerModule(createModule(
  'UserRepository',
  ArchitectureLayer.INFRASTRUCTURE,
  'src/infrastructure/repositories/UserRepository.ts',
  ['UserEntity', 'DatabaseClient'],
  ['saveUser', 'findUserById']
));

layeredArch.registerModule(createModule(
  'DatabaseClient',
  ArchitectureLayer.INFRASTRUCTURE,
  'src/infrastructure/database/DatabaseClient.ts',
  ['CommonUtils'],
  ['connect', 'query', 'transaction']
));

// 共享层模块
layeredArch.registerModule(createModule(
  'CommonUtils',
  ArchitectureLayer.SHARED,
  'src/shared/utils/CommonUtils.ts',
  [],
  ['formatDate', 'generateId', 'validateEmail']
));

layeredArch.registerModule(createModule(
  'Logger',
  ArchitectureLayer.SHARED,
  'src/shared/utils/Logger.ts',
  [],
  ['info', 'warn', 'error']
));

console.log('所有模块注册完成\n');

// ============================================
// 示例 4: 验证模块依赖
// ============================================
console.log('=== 示例 4: 验证模块依赖 ===\n');

const modulesToValidate = [
  'UserController',
  'UserService',
  'UserRepository',
  'UserEntity'
];

modulesToValidate.forEach(moduleName => {
  const result = layeredArch.validateDependencies(moduleName);
  console.log(`模块：${moduleName}`);
  console.log(`  验证结果：${result.valid ? '✅ 通过' : '❌ 失败'}`);
  if (!result.valid) {
    console.log(`  错误:`);
    result.errors.forEach(error => console.log(`    - ${error}`));
  }
  console.log('');
});

// ============================================
// 示例 5: 整体验证报告
// ============================================
console.log('=== 示例 5: 整体验证报告 ===\n');

const overallResult = layeredArch.validateAllModules();
console.log(overallResult.report);
console.log('');

// ============================================
// 示例 6: 导出架构图谱
// ============================================
console.log('=== 示例 6: 导出架构图谱 ===\n');

const graph = layeredArch.exportArchitectureGraph();
console.log(graph);
console.log('');

// ============================================
// 示例 7: 违反规则的场景
// ============================================
console.log('=== 示例 7: 违反规则的场景 ===\n');

try {
  // 领域层试图依赖业务层 (违反规则)
  layeredArch.registerModule(createModule(
    'BadEntity',
    ArchitectureLayer.DOMAIN,
    'src/domain/entities/BadEntity.ts',
    ['UserService'], // 错误：领域层不能依赖业务层
    []
  ));

  const badResult = layeredArch.validateDependencies('BadEntity');
  console.log('模块：BadEntity');
  console.log(`验证结果：${badResult.valid ? '✅ 通过' : '❌ 失败'}`);
  if (!badResult.valid) {
    console.log('错误:');
    badResult.errors.forEach(error => console.log(`  - ${error}`));
  }
} catch (error) {
  console.log('捕获异常:', error);
}

console.log('');

// ============================================
// 示例 8: 循环依赖检测
// ============================================
console.log('=== 示例 8: 循环依赖检测 ===\n');

try {
  // 创建循环依赖
  layeredArch.registerModule(createModule(
    'ModuleA',
    ArchitectureLayer.BUSINESS,
    'src/business/ModuleA.ts',
    ['ModuleB'], // A 依赖 B
    []
  ));

  layeredArch.registerModule(createModule(
    'ModuleB',
    ArchitectureLayer.BUSINESS,
    'src/business/ModuleB.ts',
    ['ModuleA'], // B 依赖 A (循环)
    []
  ));

  const cycleResult = layeredArch.validateDependencies('ModuleA');
  console.log('模块：ModuleA');
  console.log(`验证结果：${cycleResult.valid ? '✅ 通过' : '❌ 失败'}`);
  if (!cycleResult.valid) {
    console.log('错误:');
    cycleResult.errors.forEach(error => console.log(`  - ${error}`));
  }
} catch (error) {
  console.log('捕获异常:', error);
}

console.log('');

// ============================================
// 示例 9: 获取跨层调用规则列表
// ============================================
console.log('=== 示例 9: 跨层调用规则列表 ===\n');

const rules = layeredArch.getCrossLayerRules();
rules.forEach(rule => {
  console.log(`${rule.description}`);
});

console.log('');

// ============================================
// 示例 10: 实际项目中的应用
// ============================================
console.log('=== 示例 10: 实际项目中的应用 ===\n');

console.log('场景：在 CI/CD 流程中集成分层架构验证\n');

console.log('步骤 1: 在构建脚本中导入所有模块定义');
console.log('步骤 2: 调用 layeredArch.validateAllModules()');
console.log('步骤 3: 如果验证失败，阻断构建流程');
console.log('步骤 4: 输出详细错误报告，指导开发者修复');
console.log('\n示例代码:');
console.log(`
// ci/validate-architecture.ts
import { layeredArch } from '../src/skills/layered-arch-skill';
import { registerAllModules } from './module-registry';

registerAllModules();

const result = layeredArch.validateAllModules();
console.log(result.report);

if (!result.valid) {
  console.error('❌ 架构验证失败，构建终止');
  process.exit(1);
}

console.log('✅ 架构验证通过，继续构建');
`);

console.log('\n=== 所有示例执行完成 ===');
