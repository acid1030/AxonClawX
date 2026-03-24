/**
 * Layered Architecture Skill - 快速测试
 */

import {
  layeredArch,
  ArchitectureLayer,
  createModule,
  canDependOn,
  getLayerPriority
} from './layered-arch-skill';

console.log('🧪 Layered Architecture Skill - 快速测试\n');

// 测试 1: 层次查询
console.log('测试 1: 层次查询');
const layers = layeredArch.getAllLayers();
console.log(`  ✅ 获取 ${layers.length} 个层次`);

// 测试 2: 依赖规则
console.log('\n测试 2: 依赖规则检查');
console.log(`  PRESENTATION → BUSINESS: ${canDependOn(ArchitectureLayer.PRESENTATION, ArchitectureLayer.BUSINESS) ? '✅' : '❌'}`);
console.log(`  DOMAIN → BUSINESS: ${canDependOn(ArchitectureLayer.DOMAIN, ArchitectureLayer.BUSINESS) ? '❌' : '✅'} (应禁止)`);

// 测试 3: 模块注册
console.log('\n测试 3: 模块注册');
layeredArch.registerModule(createModule(
  'TestController',
  ArchitectureLayer.PRESENTATION,
  'src/test/TestController.ts',
  ['TestService'],
  ['test']
));
console.log('  ✅ 注册 TestController');

layeredArch.registerModule(createModule(
  'TestService',
  ArchitectureLayer.BUSINESS,
  'src/test/TestService.ts',
  ['TestEntity'],
  ['test']
));
console.log('  ✅ 注册 TestService');

layeredArch.registerModule(createModule(
  'TestEntity',
  ArchitectureLayer.DOMAIN,
  'src/test/TestEntity.ts',
  [],
  ['Test']
));
console.log('  ✅ 注册 TestEntity');

// 测试 4: 依赖验证
console.log('\n测试 4: 依赖验证');
const result = layeredArch.validateDependencies('TestController');
console.log(`  TestController: ${result.valid ? '✅ 通过' : '❌ 失败'}`);

// 测试 5: 整体验证
console.log('\n测试 5: 整体验证');
const overall = layeredArch.validateAllModules();
console.log(`  整体结果：${overall.valid ? '✅ 通过' : '❌ 失败'}`);

// 测试 6: 违规检测
console.log('\n测试 6: 违规检测');
try {
  layeredArch.registerModule(createModule(
    'BadModule',
    ArchitectureLayer.DOMAIN,
    'src/test/BadModule.ts',
    ['TestService'], // 违规：领域层不能依赖业务层
    []
  ));
  
  const badResult = layeredArch.validateDependencies('BadModule');
  console.log(`  BadModule: ${badResult.valid ? '❌ 应失败' : '✅ 正确检测到违规'}`);
  if (!badResult.valid) {
    console.log(`  错误信息：${badResult.errors[0]}`);
  }
} catch (e) {
  console.log('  ✅ 捕获异常');
}

console.log('\n✅ 所有测试完成');
