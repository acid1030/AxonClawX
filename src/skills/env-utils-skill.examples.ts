/**
 * 环境变量工具技能 - 使用示例
 * 
 * 展示 env-utils-skill.ts 的各种使用场景
 */

import {
  readEnvFile,
  validateEnvVars,
  loadEnvVars,
  getEnvVar,
  getEnvVars,
} from './env-utils-skill';

// ============================================
// 示例 1: 基础读取
// ============================================

export function example1_basicRead() {
  console.log('=== 示例 1: 基础读取 ===\n');
  
  // 从默认路径读取 .env 文件
  const env = readEnvFile();
  
  console.log('读取到的环境变量:');
  Object.entries(env).slice(0, 10).forEach(([key, value]) => {
    console.log(`  ${key} = ${value}`);
  });
  
  return env;
}

// ============================================
// 示例 2: 从指定路径读取
// ============================================

export function example2_customPath() {
  console.log('\n=== 示例 2: 从指定路径读取 ===\n');
  
  // 从特定路径读取环境文件
  const prodEnv = readEnvFile('./.env.production');
  const devEnv = readEnvFile('./.env.development');
  
  console.log('生产环境变量数:', Object.keys(prodEnv).length);
  console.log('开发环境变量数:', Object.keys(devEnv).length);
  
  return { prodEnv, devEnv };
}

// ============================================
// 示例 3: 验证环境变量
// ============================================

export function example3_validation() {
  console.log('\n=== 示例 3: 验证环境变量 ===\n');
  
  // 定义验证规则
  const schema = {
    DATABASE_URL: {
      type: 'url' as const,
      required: true,
      errorMessage: 'DATABASE_URL 是必填的数据库连接地址',
    },
    DATABASE_PORT: {
      type: 'port' as const,
      default: 5432,
    },
    API_KEY: {
      type: 'string' as const,
      required: true,
      pattern: /^[a-zA-Z0-9]{32}$/,
      errorMessage: 'API_KEY 必须是 32 位字母数字组合',
    },
    DEBUG: {
      type: 'boolean' as const,
      default: false,
    },
    MAX_CONNECTIONS: {
      type: 'number' as const,
      min: 1,
      max: 100,
      default: 10,
    },
    LOG_LEVEL: {
      type: 'string' as const,
      enum: ['debug', 'info', 'warn', 'error'],
      default: 'info',
    },
    ADMIN_EMAIL: {
      type: 'email' as const,
      required: true,
    },
    SERVER_PORT: {
      type: 'port' as const,
      min: 1024,
      max: 65535,
      default: 3000,
    },
  };
  
  // 执行验证
  const result = validateEnvVars(schema);
  
  if (result.success) {
    console.log('✓ 验证通过!');
    console.log('\n验证后的环境变量:');
    Object.entries(result.env).forEach(([key, value]) => {
      console.log(`  ${key}: ${value} (${typeof value})`);
    });
  } else {
    console.log('✗ 验证失败:');
    result.errors.forEach(err => {
      console.log(`  - ${err.variable}: ${err.message} [${err.errorType}]`);
    });
  }
  
  return result;
}

// ============================================
// 示例 4: 加载环境变量到 process.env
// ============================================

export function example4_loadEnv() {
  console.log('\n=== 示例 4: 加载环境变量 ===\n');
  
  // 加载 .env 文件到 process.env
  const loadResult = loadEnvVars({
    envPath: './.env',
    override: false, // 不覆盖已存在的环境变量
  });
  
  if (loadResult.success) {
    console.log('✓ 环境变量加载成功!');
    console.log(`  加载了 ${Object.keys(loadResult.loaded).length} 个变量`);
    
    // 显示部分加载的变量
    console.log('\n加载的变量 (前 5 个):');
    Object.entries(loadResult.loaded).slice(0, 5).forEach(([key, value]) => {
      console.log(`  ${key} = ${value}`);
    });
  } else {
    console.log('✗ 加载失败:', loadResult.error);
  }
  
  return loadResult;
}

// ============================================
// 示例 5: 获取单个环境变量 (带类型转换)
// ============================================

export function example5_getEnvVar() {
  console.log('\n=== 示例 5: 获取单个环境变量 ===\n');
  
  // 获取数字类型
  const port = getEnvVar('PORT', 3000, 'number');
  console.log(`PORT: ${port} (类型：${typeof port})`);
  
  // 获取布尔类型
  const debug = getEnvVar('DEBUG', false, 'boolean');
  console.log(`DEBUG: ${debug} (类型：${typeof debug})`);
  
  // 获取字符串类型 (默认)
  const nodeEnv = getEnvVar('NODE_ENV', 'development');
  console.log(`NODE_ENV: ${nodeEnv} (类型：${typeof nodeEnv})`);
  
  // 获取 URL
  const apiUrl = getEnvVar('API_URL', 'http://localhost:3000');
  console.log(`API_URL: ${apiUrl} (类型：${typeof apiUrl})`);
  
  return { port, debug, nodeEnv, apiUrl };
}

// ============================================
// 示例 6: 批量获取环境变量
// ============================================

export function example6_getEnvVars() {
  console.log('\n=== 示例 6: 批量获取环境变量 ===\n');
  
  // 批量获取多个环境变量
  const vars = getEnvVars([
    'NODE_ENV',
    'PORT',
    'DATABASE_URL',
    'REDIS_HOST',
    'JWT_SECRET',
  ]);
  
  console.log('批量获取结果:');
  Object.entries(vars).forEach(([key, value]) => {
    console.log(`  ${key}: ${value ?? '(未设置)'}`);
  });
  
  return vars;
}

// ============================================
// 示例 7: 实际应用场景 - 应用启动配置
// ============================================

export function example7_appConfig() {
  console.log('\n=== 示例 7: 应用启动配置 ===\n');
  
  // 1. 加载环境变量
  const loadResult = loadEnvVars();
  if (!loadResult.success) {
    console.warn('⚠️  警告：无法加载 .env 文件，使用默认配置');
  }
  
  // 2. 定义配置 schema
  const configSchema = {
    NODE_ENV: {
      type: 'string' as const,
      enum: ['development', 'production', 'test'],
      default: 'development',
    },
    PORT: {
      type: 'port' as const,
      min: 1024,
      max: 65535,
      default: 3000,
    },
    DATABASE_URL: {
      type: 'url' as const,
      required: process.env.NODE_ENV === 'production',
    },
    REDIS_HOST: {
      type: 'string' as const,
      default: 'localhost',
    },
    REDIS_PORT: {
      type: 'port' as const,
      default: 6379,
    },
    JWT_SECRET: {
      type: 'string' as const,
      required: true,
      pattern: /^.{32,}$/,
      errorMessage: 'JWT_SECRET 必须至少 32 个字符',
    },
    CORS_ORIGINS: {
      type: 'string' as const,
      default: '*',
    },
    RATE_LIMIT: {
      type: 'number' as const,
      min: 1,
      max: 1000,
      default: 100,
    },
  };
  
  // 3. 验证配置
  const result = validateEnvVars(configSchema);
  
  if (!result.success) {
    console.error('❌ 配置验证失败，应用无法启动:');
    result.errors.forEach(err => {
      console.error(`  - ${err.variable}: ${err.message}`);
    });
    process.exit(1);
  }
  
  // 4. 使用验证后的配置
  console.log('✓ 配置验证通过!');
  console.log('\n应用配置:');
  console.log(`  环境：${result.env.NODE_ENV}`);
  console.log(`  端口：${result.env.PORT}`);
  console.log(`  数据库：${result.env.DATABASE_URL ? '已配置' : '未配置'}`);
  console.log(`  Redis: ${result.env.REDIS_HOST}:${result.env.REDIS_PORT}`);
  console.log(`  JWT: ${result.env.JWT_SECRET ? '已配置 (已隐藏)' : '未配置'}`);
  console.log(`  CORS: ${result.env.CORS_ORIGINS}`);
  console.log(`  限流：${result.env.RATE_LIMIT} req/min`);
  
  return result.env;
}

// ============================================
// 示例 8: 多环境配置切换
// ============================================

export function example8_multiEnv() {
  console.log('\n=== 示例 8: 多环境配置切换 ===\n');
  
  const environments = ['development', 'staging', 'production'];
  const configs: Record<string, any> = {};
  
  for (const env of environments) {
    const envPath = `./.env.${env}`;
    console.log(`加载 ${env} 环境配置...`);
    
    const envVars = readEnvFile(envPath);
    
    if (Object.keys(envVars).length > 0) {
      configs[env] = {
        loaded: true,
        varCount: Object.keys(envVars).length,
        hasDatabase: !!envVars.DATABASE_URL,
        hasApiKey: !!envVars.API_KEY,
      };
      console.log(`  ✓ 成功加载 ${Object.keys(envVars).length} 个变量`);
    } else {
      configs[env] = {
        loaded: false,
        varCount: 0,
      };
      console.log(`  ⚠️  未找到配置文件`);
    }
  }
  
  return configs;
}

// ============================================
// 示例 9: 敏感信息验证
// ============================================

export function example9_sensitiveData() {
  console.log('\n=== 示例 9: 敏感信息验证 ===\n');
  
  const sensitiveSchema = {
    API_KEY: {
      type: 'string' as const,
      required: true,
      pattern: /^[a-zA-Z0-9]{32,64}$/,
      errorMessage: 'API_KEY 必须是 32-64 位字母数字组合',
    },
    JWT_SECRET: {
      type: 'string' as const,
      required: true,
      validate: (value: string) => value.length >= 32,
      errorMessage: 'JWT_SECRET 必须至少 32 个字符',
    },
    ENCRYPTION_KEY: {
      type: 'string' as const,
      required: true,
      pattern: /^[a-fA-F0-9]{64}$/,
      errorMessage: 'ENCRYPTION_KEY 必须是 64 位十六进制字符串',
    },
  };
  
  const result = validateEnvVars(sensitiveSchema);
  
  if (result.success) {
    console.log('✓ 所有敏感信息验证通过!');
    console.log('  (具体值已隐藏以保护安全)');
  } else {
    console.log('✗ 敏感信息验证失败:');
    result.errors.forEach(err => {
      console.log(`  - ${err.variable}: ${err.message}`);
    });
  }
  
  return result;
}

// ============================================
// 示例 10: 完整的启动脚本
// ============================================

export async function example10_fullStartup() {
  console.log('\n=== 示例 10: 完整的启动脚本 ===\n');
  
  console.log('🚀 应用启动中...\n');
  
  // Step 1: 加载环境变量
  console.log('Step 1: 加载环境变量');
  const loadResult = loadEnvVars();
  if (!loadResult.success) {
    console.log('  ⚠️  使用系统环境变量');
  } else {
    console.log(`  ✓ 加载了 ${Object.keys(loadResult.loaded).length} 个变量`);
  }
  
  // Step 2: 验证必需配置
  console.log('\nStep 2: 验证配置');
  const configSchema = {
    NODE_ENV: { type: 'string' as const, default: 'development' },
    PORT: { type: 'port' as const, default: 3000 },
    DATABASE_URL: { type: 'url' as const, required: true },
    JWT_SECRET: { type: 'string' as const, required: true },
  };
  
  const config = validateEnvVars(configSchema);
  
  if (!config.success) {
    console.error('  ❌ 配置验证失败:');
    config.errors.forEach(err => {
      console.error(`     ${err.variable}: ${err.message}`);
    });
    console.error('\n  请检查 .env 文件配置');
    process.exit(1);
  }
  
  console.log('  ✓ 配置验证通过');
  
  // Step 3: 显示启动信息
  console.log('\nStep 3: 启动信息');
  console.log(`  环境：${config.env.NODE_ENV}`);
  console.log(`  端口：${config.env.PORT}`);
  console.log(`  数据库：已连接`);
  
  console.log('\n✅ 应用启动准备完成!\n');
  
  return config.env;
}

// ============================================
// 主函数 - 运行所有示例
// ============================================

async function runAllExamples() {
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║       环境变量工具技能 - 完整使用示例                    ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');
  
  try {
    example1_basicRead();
    example3_validation();
    example4_loadEnv();
    example5_getEnvVar();
    example6_getEnvVars();
    example7_appConfig();
    example9_sensitiveData();
    
    console.log('\n╔══════════════════════════════════════════════════════════╗');
    console.log('║                  ✅ 所有示例执行完成!                    ║');
    console.log('╚══════════════════════════════════════════════════════════╝\n');
  } catch (error) {
    console.error('❌ 示例执行出错:', error);
    process.exit(1);
  }
}

// 如果直接运行此文件
if (require.main === module) {
  runAllExamples();
}

// 导出所有示例函数
export { runAllExamples };
