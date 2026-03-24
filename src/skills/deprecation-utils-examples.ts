/**
 * Deprecation Utils - 使用示例
 * 
 * 本文件展示 deprecation-utils-skill.ts 的各种使用场景
 */

import {
  registerDeprecation,
  warnDeprecated,
  configureDeprecation,
  addVersionTrack,
  generateMigrationReport,
  checkMigrationRequired,
  DeprecationError,
} from './deprecation-utils-skill';

// ============================================
// 示例 1: 基本弃用警告
// ============================================

export function example1BasicUsage() {
  console.log('\n=== 示例 1: 基本弃用警告 ===\n');

  // 注册弃用
  registerDeprecation({
    name: 'legacyApiClient',
    deprecatedSince: '2.0.0',
    removalVersion: '3.0.0',
    replacement: 'modernApiClient',
    migrationGuide: 'https://docs.example.com/migrate-to-v3',
    notes: '旧客户端不支持 HTTP/2 和自动重试',
  });

  // 在代码中使用
  function createClient() {
    warnDeprecated('legacyApiClient');
    // return new LegacyApiClient();
  }

  createClient();
  // 输出:
  // ⚠️  DEPRECATION WARNING: "legacyApiClient"
  //    Deprecated since: v2.0.0
  //    Removal version: v3.0.0
  //    Replacement: modernApiClient
  //    Migration Guide: https://docs.example.com/migrate-to-v3
  //    Notes: 旧客户端不支持 HTTP/2 和自动重试
}

// ============================================
// 示例 2: 版本追踪
// ============================================

export function example2VersionTracking() {
  console.log('\n=== 示例 2: 版本追踪 ===\n');

  // 添加版本记录
  addVersionTrack({
    version: '2.0.0',
    releaseDate: '2026-03-01',
    deprecations: ['legacyApiClient', 'oldAuthMethod'],
    removals: ['v1Endpoint'],
    breakingChanges: ['认证机制从 Basic 改为 Bearer'],
  });

  addVersionTrack({
    version: '3.0.0',
    releaseDate: '2026-06-01',
    deprecations: ['websocketV1'],
    removals: ['legacyApiClient', 'oldAuthMethod'],
    breakingChanges: ['移除所有 v1 API'],
  });

  // 生成迁移报告
  const report = generateMigrationReport();
  console.log(report);
}

// ============================================
// 示例 3: 配置管理
// ============================================

export function example3Configuration() {
  console.log('\n=== 示例 3: 配置管理 ===\n');

  // 生产环境禁用警告
  configureDeprecation({ enabled: false });
  warnDeprecated('someDeprecatedFunc'); // 不会输出警告

  // 恢复启用
  configureDeprecation({ enabled: true });

  // 设置为错误级别 (抛出异常)
  registerDeprecation({
    name: 'criticalFunc',
    deprecatedSince: '1.0.0',
    removalVersion: '2.0.0',
    replacement: 'safeFunc',
    level: 'error',
  });

  try {
    warnDeprecated('criticalFunc');
  } catch (error) {
    if (error instanceof DeprecationError) {
      console.log('捕获到弃用错误:', error.message);
      console.log('迁移到:', error.deprecationInfo.replacement);
    }
  }

  // 显示堆栈跟踪 (调试用)
  configureDeprecation({ showStackTrace: true });

  // 自定义日志函数
  const customLogger: string[] = [];
  configureDeprecation({
    logger: (msg) => customLogger.push(msg),
  });

  registerDeprecation({
    name: 'testFunc',
    deprecatedSince: '1.0.0',
    removalVersion: '2.0.0',
    replacement: 'newFunc',
  });

  warnDeprecated('testFunc');
  console.log('自定义日志记录:', customLogger);
}

// ============================================
// 示例 4: 检查迁移需求
// ============================================

export function example4MigrationCheck() {
  console.log('\n=== 示例 4: 检查迁移需求 ===\n');

  // 注册多个弃用
  registerDeprecation({
    name: 'api.v1.users',
    deprecatedSince: '2.0.0',
    removalVersion: '3.0.0',
    replacement: 'api.v2.users',
  });

  registerDeprecation({
    name: 'api.v1.posts',
    deprecatedSince: '2.0.0',
    removalVersion: '3.0.0',
    replacement: 'api.v2.posts',
  });

  registerDeprecation({
    name: 'legacyAuth',
    deprecatedSince: '1.5.0',
    removalVersion: '2.5.0',
    replacement: 'modernAuth',
  });

  // 检查升级到 2.5.0 需要迁移什么
  const for250 = checkMigrationRequired('2.5.0');
  console.log('\n升级到 v2.5.0 需要迁移:');
  for250.forEach((item) => console.log(`  - ${item.name} → ${item.replacement}`));

  // 检查升级到 3.0.0 需要迁移什么
  const for300 = checkMigrationRequired('3.0.0');
  console.log('\n升级到 v3.0.0 需要迁移:');
  for300.forEach((item) => console.log(`  - ${item.name} → ${item.replacement}`));
}

// ============================================
// 示例 5: 装饰器模式 (TypeScript 实验性功能)
// ============================================

// 注意：装饰器需要 TypeScript 配置启用 experimentalDecorators
// tsconfig.json: { "compilerOptions": { "experimentalDecorators": true } }

/*
function Deprecated(info: DeprecationInfo) {
  registerDeprecation(info);

  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = function (...args: any[]) {
      warnDeprecated(info.name);
      return originalMethod.apply(this, args);
    };

    return descriptor;
  };
}

class LegacyService {
  @Deprecated({
    name: 'LegacyService.fetchData',
    deprecatedSince: '2.0.0',
    removalVersion: '3.0.0',
    replacement: 'DataService.query',
  })
  fetchData() {
    return { data: 'old' };
  }
}
*/

export function example5Decorator() {
  console.log('\n=== 示例 5: 装饰器模式 ===\n');
  console.log('装饰器代码已注释，需要启用 TypeScript experimentalDecorators');
  console.log('详见 deprecation-utils-skill.ts 中的 JSDoc 注释');
}

// ============================================
// 示例 6: 包装旧 API
// ============================================

// 注册弃用
registerDeprecation({
  name: 'createLegacyConnection',
  deprecatedSince: '2.0.0',
  removalVersion: '3.0.0',
  replacement: 'createConnection',
});

// 包装旧函数
export function createLegacyConnection(config: any) {
  warnDeprecated('createLegacyConnection');
  // 调用新实现
  return createConnection({ ...config, legacy: true });
}

// 新函数
export function createConnection(config: any & { legacy?: boolean }) {
  if (config.legacy) {
    console.log('使用兼容模式创建连接...');
  } else {
    console.log('使用新模式创建连接...');
  }
  return { connected: true, legacy: config.legacy || false };
}

export function example6Wrapper() {
  console.log('\n=== 示例 6: 包装旧 API ===\n');

  // 旧代码继续使用
  const legacyConn = createLegacyConnection({ timeout: 5000 });
  console.log('旧连接:', legacyConn);

  // 新代码使用新 API
  const newConn = createConnection({ timeout: 5000 });
  console.log('新连接:', newConn);
}

// ============================================
// 示例 7: 批量注册
// ============================================

export function example7BatchRegistration() {
  console.log('\n=== 示例 7: 批量注册 ===\n');

  const deprecations = [
    {
      name: 'api.v1.users',
      deprecatedSince: '2.0.0',
      removalVersion: '3.0.0',
      replacement: 'api.v2.users',
    },
    {
      name: 'api.v1.posts',
      deprecatedSince: '2.0.0',
      removalVersion: '3.0.0',
      replacement: 'api.v2.posts',
    },
    {
      name: 'api.v1.comments',
      deprecatedSince: '2.0.0',
      removalVersion: '3.0.0',
      replacement: 'api.v2.comments',
    },
    {
      name: 'legacyAuth',
      deprecatedSince: '1.8.0',
      removalVersion: '2.5.0',
      replacement: 'modernAuth',
    },
  ];

  deprecations.forEach((dep) => registerDeprecation(dep));

  console.log(`已批量注册 ${deprecations.length} 个弃用功能`);

  // 获取所有弃用
  const all = checkMigrationRequired('3.0.0');
  console.log(`v3.0.0 需要迁移 ${all.length} 个功能`);
}

// ============================================
// 示例 8: 条件警告
// ============================================

export function example8ConditionalWarning() {
  console.log('\n=== 示例 8: 条件警告 ===\n');

  // 模拟不同环境
  const environments = ['development', 'production', 'test'] as const;

  environments.forEach((env) => {
    console.log(`\n环境：${env}`);

    if (env === 'production') {
      configureDeprecation({ enabled: false });
    } else if (env === 'development') {
      configureDeprecation({ showStackTrace: true });
    } else if (env === 'test') {
      configureDeprecation({
        logger: (msg) => console.log(`[TEST LOG] ${msg}`),
      });
    }

    registerDeprecation({
      name: `testFunc_${env}`,
      deprecatedSince: '1.0.0',
      removalVersion: '2.0.0',
      replacement: 'newFunc',
    });

    warnDeprecated(`testFunc_${env}`);
  });

  // 重置配置
  configureDeprecation({ enabled: true, showStackTrace: false });
}

// ============================================
// 示例 9: 获取弃用信息
// ============================================

export function example9GetInfo() {
  console.log('\n=== 示例 9: 获取弃用信息 ===\n');

  registerDeprecation({
    name: 'exampleFunc',
    deprecatedSince: '2.0.0',
    removalVersion: '3.0.0',
    replacement: 'newFunc',
    migrationGuide: 'https://docs.example.com/migration',
    notes: '重要提示：新函数性能提升 10 倍',
  });

  // 获取单个弃用信息
  const info = checkMigrationRequired('3.0.0')[0];
  if (info) {
    console.log('功能名称:', info.name);
    console.log('弃用版本:', info.deprecatedSince);
    console.log('移除版本:', info.removalVersion);
    console.log('替代方案:', info.replacement);
    console.log('迁移指南:', info.migrationGuide);
    console.log('备注:', info.notes);
  }

  // 获取所有弃用
  const all = getAllDeprecations();
  console.log(`\n共有 ${all.length} 个弃用功能`);
}

// 辅助函数 (从主模块导入)
function getAllDeprecations() {
  // 这里简化处理，实际应从主模块导入
  return checkMigrationRequired('999.0.0');
}

// ============================================
// 运行所有示例
// ============================================

export function runAllExamples() {
  console.log('🚀 开始运行所有示例...\n');

  try {
    example1BasicUsage();
  } catch (e) {
    console.error('示例 1 失败:', e);
  }

  try {
    example2VersionTracking();
  } catch (e) {
    console.error('示例 2 失败:', e);
  }

  try {
    example3Configuration();
  } catch (e) {
    console.error('示例 3 失败:', e);
  }

  try {
    example4MigrationCheck();
  } catch (e) {
    console.error('示例 4 失败:', e);
  }

  try {
    example5Decorator();
  } catch (e) {
    console.error('示例 5 失败:', e);
  }

  try {
    example6Wrapper();
  } catch (e) {
    console.error('示例 6 失败:', e);
  }

  try {
    example7BatchRegistration();
  } catch (e) {
    console.error('示例 7 失败:', e);
  }

  try {
    example8ConditionalWarning();
  } catch (e) {
    console.error('示例 8 失败:', e);
  }

  try {
    example9GetInfo();
  } catch (e) {
    console.error('示例 9 失败:', e);
  }

  console.log('\n✅ 所有示例运行完成!\n');
}

// 如果直接运行此文件
if (require.main === module) {
  runAllExamples();
}
