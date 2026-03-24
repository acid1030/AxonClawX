/**
 * Config Utils Skill 使用示例
 * 
 * 演示如何使用配置管理工具 (ACE) 进行:
 * 1. 配置加载
 * 2. 配置验证
 * 3. 配置热更新
 */

import {
  ConfigManager,
  ConfigValidator,
  loadConfig,
  validateConfig,
  mergeConfigs,
  applyEnvOverrides
} from './config-utils-skill';

// ============ 示例 1: 基础配置加载 ============

async function example1_basicLoad() {
  console.log('=== 示例 1: 基础配置加载 ===\n');

  // 简单加载配置文件
  const config = loadConfig('./config/default.yaml');
  console.log('加载的配置:', config);

  // 获取特定值
  const port = config['port'] || 3000;
  console.log('服务端口:', port);
}

// ============ 示例 2: 带验证的配置管理 ============

async function example2_validation() {
  console.log('\n=== 示例 2: 带验证的配置管理 ===\n');

  // 定义验证器
  const validator: ConfigValidator = {
    'server.port': {
      type: 'number',
      required: true,
      min: 1,
      max: 65535
    },
    'server.host': {
      type: 'string',
      required: true,
      pattern: /^[\w\.\-]+$/
    },
    'database.url': {
      type: 'string',
      required: true,
      validate: (value) => value.startsWith('postgres://') || value.startsWith('mysql://')
    },
    'logging.level': {
      type: 'string',
      enum: ['debug', 'info', 'warn', 'error']
    },
    'cache.enabled': {
      type: 'boolean',
      default: true
    },
    'cache.ttl': {
      type: 'number',
      min: 0,
      max: 86400
    }
  };

  // 创建配置管理器
  const manager = new ConfigManager({
    configPath: './config/app.yaml',
    validator,
    envPrefix: 'MYAPP_',
    enableHotReload: true
  });

  try {
    await manager.load();
    console.log('✓ 配置加载并验证通过');

    // 获取配置值
    const port = manager.get('server.port', 3000);
    const host = manager.get('server.host', 'localhost');
    const logLevel = manager.get('logging.level', 'info');

    console.log(`服务地址：http://${host}:${port}`);
    console.log(`日志级别：${logLevel}`);
  } catch (error) {
    console.error('✗ 配置验证失败:', error);
  }
}

// ============ 示例 3: 配置热更新监听 ============

async function example3_hotReload() {
  console.log('\n=== 示例 3: 配置热更新监听 ===\n');

  const validator: ConfigValidator = {
    'feature.newUI': { type: 'boolean' },
    'feature.betaFeatures': { type: 'boolean' },
    'api.rateLimit': { type: 'number', min: 0 }
  };

  const manager = new ConfigManager({
    configPath: './config/features.yaml',
    validator,
    enableHotReload: true
  });

  // 监听配置变更
  manager.onChange((event) => {
    console.log(`[配置变更] ${event.key}:`, {
      旧值: event.oldValue,
      新值: event.newValue,
      时间: new Date(event.timestamp).toISOString()
    });
  });

  await manager.load();
  console.log('✓ 热重载已启用，监听配置变更...');

  // 模拟运行 (实际应用中会持续运行)
  setTimeout(() => {
    console.log('当前功能开关:', {
      newUI: manager.get('feature.newUI'),
      betaFeatures: manager.get('feature.betaFeatures')
    });
  }, 5000);
}

// ============ 示例 4: 环境变量覆盖 ============

async function example4_envOverrides() {
  console.log('\n=== 示例 4: 环境变量覆盖 ===\n');

  // 设置环境变量 (实际在 shell 中设置)
  process.env['MYAPP_SERVER_PORT'] = '8080';
  process.env['MYAPP_DATABASE_URL'] = 'postgres://prod-db:5432/app';
  process.env['MYAPP_LOGGING_LEVEL'] = 'warn';

  const baseConfig = {
    server: {
      port: 3000,
      host: 'localhost'
    },
    database: {
      url: 'postgres://localhost:5432/dev',
      pool: 10
    },
    logging: {
      level: 'debug',
      format: 'json'
    }
  };

  // 应用环境变量覆盖
  const withEnv = applyEnvOverrides(baseConfig, 'MYAPP_');

  console.log('基础配置:', baseConfig);
  console.log('环境变量覆盖后:', withEnv);
  console.log('✓ 端口从 3000 变为:', withEnv.server?.port);
  console.log('✓ 日志级别从 debug 变为:', withEnv.logging?.level);
}

// ============ 示例 5: 配置合并 ============

async function example5_configMerge() {
  console.log('\n=== 示例 5: 配置合并 ===\n');

  const defaultConfig = {
    server: {
      port: 3000,
      host: 'localhost',
      timeout: 30000
    },
    database: {
      url: 'postgres://localhost/db',
      pool: 10,
      ssl: false
    },
    features: {
      cache: true,
      logging: true
    }
  };

  const productionOverrides = {
    server: {
      host: '0.0.0.0',
      timeout: 60000
    },
    database: {
      url: 'postgres://prod-cluster/db',
      pool: 50,
      ssl: true
    },
    features: {
      logging: false
    }
  };

  const merged = mergeConfigs(defaultConfig, productionOverrides);

  console.log('合并后的生产配置:', merged);
  console.log('✓ 端口保持不变:', merged.server?.port);
  console.log('✓ 主机已覆盖:', merged.server?.host);
  console.log('✓ 连接池已扩大:', merged.database?.pool);
}

// ============ 示例 6: 手动验证配置 ============

async function example6_manualValidation() {
  console.log('\n=== 示例 6: 手动验证配置 ===\n');

  const config = {
    api: {
      key: 'sk-123456',
      timeout: 5000
    },
    retry: {
      attempts: 3,
      delay: 1000
    }
  };

  const validator: ConfigValidator = {
    'api.key': {
      type: 'string',
      required: true,
      min: 10,
      pattern: /^sk-\w+$/
    },
    'api.timeout': {
      type: 'number',
      min: 1000,
      max: 30000
    },
    'retry.attempts': {
      type: 'number',
      min: 1,
      max: 10
    },
    'retry.delay': {
      type: 'number',
      min: 100
    }
  };

  const errors = validateConfig(config, validator);

  if (errors.length === 0) {
    console.log('✓ 配置验证通过');
  } else {
    console.log('✗ 配置验证失败:');
    errors.forEach(err => {
      console.log(`  - ${err.path}: ${err.message}`);
    });
  }
}

// ============ 示例 7: 完整应用场景 ============

async function example7_fullApp() {
  console.log('\n=== 示例 7: 完整应用场景 ===\n');

  // 1. 定义应用配置验证器
  const appValidator: ConfigValidator = {
    'app.name': { type: 'string', required: true },
    'app.version': { type: 'string', required: true, pattern: /^\d+\.\d+\.\d+$/ },
    'app.env': { type: 'string', enum: ['development', 'staging', 'production'] },
    
    'server.port': { type: 'number', required: true, min: 1, max: 65535 },
    'server.host': { type: 'string', default: '0.0.0.0' },
    'server.cors': { type: 'boolean', default: true },
    
    'database.host': { type: 'string', required: true },
    'database.port': { type: 'number', default: 5432 },
    'database.name': { type: 'string', required: true },
    'database.user': { type: 'string', required: true },
    'database.password': { type: 'string', required: true },
    
    'redis.url': { type: 'string' },
    'redis.ttl': { type: 'number', default: 3600 },
    
    'logging.level': { type: 'string', enum: ['debug', 'info', 'warn', 'error'], default: 'info' },
    'logging.format': { type: 'string', enum: ['json', 'text'], default: 'json' },
    
    'features.auth': { type: 'boolean', default: true },
    'features.rateLimit': { type: 'boolean', default: true },
    'features.metrics': { type: 'boolean', default: true }
  };

  // 2. 创建配置管理器
  const configManager = new ConfigManager({
    configPath: './config/app.yaml',
    validator: appValidator,
    envPrefix: 'APP_',
    enableHotReload: true
  });

  // 3. 监听关键配置变更
  configManager.onChange((event) => {
    if (event.key.startsWith('logging')) {
      console.log(`[日志配置变更] ${event.key} = ${event.newValue}`);
      // 这里可以动态调整日志级别
    }
    
    if (event.key.startsWith('features')) {
      console.log(`[功能开关变更] ${event.key} = ${event.newValue}`);
      // 这里可以动态启用/禁用功能
    }
  });

  // 4. 加载配置
  try {
    await configManager.load();
    console.log('✓ 应用配置初始化完成');

    // 5. 使用配置
    const appConfig = {
      name: configManager.get('app.name'),
      version: configManager.get('app.version'),
      env: configManager.get('app.env'),
      
      server: {
        port: configManager.get('server.port'),
        host: configManager.get('server.host'),
        cors: configManager.get('server.cors')
      },
      
      database: {
        host: configManager.get('database.host'),
        port: configManager.get('database.port'),
        name: configManager.get('database.name'),
        user: configManager.get('database.user'),
        password: configManager.get('database.password')
      },
      
      logging: {
        level: configManager.get('logging.level'),
        format: configManager.get('logging.format')
      },
      
      features: {
        auth: configManager.get('features.auth'),
        rateLimit: configManager.get('features.rateLimit'),
        metrics: configManager.get('features.metrics')
      }
    };

    console.log('\n应用配置摘要:', JSON.stringify(appConfig, null, 2));
    
    // 6. 在应用关闭时清理
    process.on('SIGINT', () => {
      configManager.close();
      console.log('\n✓ 配置管理器已关闭');
      process.exit(0);
    });

  } catch (error) {
    console.error('✗ 应用配置初始化失败:', error);
    process.exit(1);
  }
}

// ============ 运行示例 ============

async function runExamples() {
  console.log('╔════════════════════════════════════════╗');
  console.log('║  Config Utils Skill 使用示例           ║');
  console.log('║  ACE - Application Configuration Engine ║');
  console.log('╚════════════════════════════════════════╝\n');

  // 取消注释以运行对应示例
  // await example1_basicLoad();
  // await example2_validation();
  // await example3_hotReload();
  // await example4_envOverrides();
  // await example5_configMerge();
  // await example6_manualValidation();
  await example7_fullApp();
}

// 如果直接运行此文件
if (require.main === module) {
  runExamples().catch(console.error);
}

export { runExamples };
