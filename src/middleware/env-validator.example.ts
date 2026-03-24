/**
 * EnvValidator 使用示例
 * 
 * 演示如何使用环境变量验证中间件
 */

import { EnvValidator, validateEnv, createEnvMiddleware } from './env-validator';

// ============ 示例 1: 基础使用 ============

async function example1_basic() {
  console.log('=== 示例 1: 基础使用 ===\n');

  const validator = new EnvValidator({
    schema: {
      // 必填项：数据库 URL
      DATABASE_URL: {
        type: 'url',
        required: true,
        errorMessage: '数据库 URL 是必填项，且必须是有效的 URL 格式',
      },

      // 可选项：数据库端口 (有默认值)
      DATABASE_PORT: {
        type: 'port',
        default: 5432,
      },

      // 必填项：API 密钥 (带格式验证)
      API_KEY: {
        type: 'string',
        required: true,
        pattern: /^[a-zA-Z0-9]{32}$/,
        errorMessage: 'API_KEY 必须是 32 位字母数字组合',
      },

      // 可选项：调试模式 (布尔值)
      DEBUG: {
        type: 'boolean',
        default: false,
      },

      // 可选项：最大连接数 (带范围验证)
      MAX_CONNECTIONS: {
        type: 'number',
        min: 1,
        max: 100,
        default: 10,
      },

      // 可选项：日志级别 (枚举值)
      LOG_LEVEL: {
        type: 'string',
        enum: ['debug', 'info', 'warn', 'error'],
        default: 'info',
      },

      // 必填项：管理员邮箱
      ADMIN_EMAIL: {
        type: 'email',
        required: true,
      },
    },
    strict: false, // 非严格模式，验证失败不抛出异常
  });

  const result = await validator.load();

  if (result.success) {
    console.log('✓ 环境变量验证通过');
    console.log('  DATABASE_URL:', result.env.DATABASE_URL);
    console.log('  DATABASE_PORT:', result.env.DATABASE_PORT);
    console.log('  DEBUG:', result.env.DEBUG);
    console.log('  MAX_CONNECTIONS:', result.env.MAX_CONNECTIONS);
    console.log('  LOG_LEVEL:', result.env.LOG_LEVEL);
  } else {
    console.log('✗ 环境变量验证失败:');
    result.errors.forEach((error) => {
      console.log(`  - ${error.variable}: ${error.message}`);
    });
  }
}

// ============ 示例 2: 使用便捷函数 ============

async function example2_convenience() {
  console.log('\n=== 示例 2: 使用便捷函数 ===\n');

  const result = await validateEnv({
    NODE_ENV: {
      type: 'string',
      enum: ['development', 'production', 'test'],
      required: true,
    },
    PORT: {
      type: 'port',
      default: 3000,
    },
    REDIS_URL: {
      type: 'url',
      required: true,
    },
    SESSION_SECRET: {
      type: 'string',
      required: true,
      min: 32,
    },
  });

  if (!result.success) {
    console.error('验证失败:');
    result.errors.forEach((error) => {
      console.error(`  ${error.variable}: ${error.message}`);
    });
    process.exit(1);
  }

  console.log('✓ 验证通过，环境变量已加载到 process.env');
  console.log('  NODE_ENV:', process.env.NODE_ENV);
  console.log('  PORT:', process.env.PORT);
}

// ============ 示例 3: 在 Express 中使用中间件 ============

function example3_express_middleware() {
  console.log('\n=== 示例 3: Express 中间件 ===\n');

  // 注意：需要先安装 express: npm install express @types/express
  // 这里仅展示用法，不实际运行

  /*
  import express from 'express';
  
  const app = express();

  // 在应用启动前验证环境变量
  app.use(createEnvMiddleware({
    DATABASE_URL: { type: 'url', required: true },
    JWT_SECRET: { type: 'string', required: true },
    JWT_EXPIRES_IN: { type: 'string', default: '24h' },
    REDIS_HOST: { type: 'string', required: true },
    REDIS_PORT: { type: 'port', default: 6379 },
  }));

  app.get('/', (req, res) => {
    res.json({ message: '应用正常运行' });
  });

  app.listen(3000, () => {
    console.log('服务器已启动在 http://localhost:3000');
  });
  */

  console.log('Express 中间件示例代码已注释，取消注释即可使用');
}

// ============ 示例 4: 自定义验证函数 ============

async function example4_custom_validation() {
  console.log('\n=== 示例 4: 自定义验证函数 ===\n');

  const result = await validateEnv({
    CUSTOM_API_VERSION: {
      type: 'string',
      required: true,
      validate: (value) => {
        // 自定义验证：必须是 v1, v2, v3 等格式
        return /^v\d+$/.test(value);
      },
      errorMessage: 'API 版本必须是 v1, v2, v3 等格式',
    },
    CUSTOM_TIMEOUT: {
      type: 'number',
      validate: (value) => {
        // 自定义验证：必须是 1000 的倍数
        return value % 1000 === 0;
      },
      errorMessage: '超时时间必须是 1000 的倍数',
    },
  });

  if (result.success) {
    console.log('✓ 自定义验证通过');
  } else {
    console.log('✗ 自定义验证失败:');
    result.errors.forEach((error) => {
      console.log(`  ${error.variable}: ${error.message}`);
    });
  }
}

// ============ 示例 5: 多环境配置 ============

async function example5_multi_environment() {
  console.log('\n=== 示例 5: 多环境配置 ===\n');

  const envFiles = {
    development: '.env.development',
    production: '.env.production',
    test: '.env.test',
  };

  const currentEnv = process.env.NODE_ENV || 'development';
  const envFile = envFiles[currentEnv as keyof typeof envFiles];

  console.log(`当前环境：${currentEnv}`);
  console.log(`配置文件：${envFile}`);

  const validator = new EnvValidator({
    envPath: envFile,
    schema: {
      APP_NAME: {
        type: 'string',
        required: true,
      },
      APP_VERSION: {
        type: 'string',
        required: true,
      },
      // 不同环境可能有不同的配置
      ...(currentEnv === 'production' && {
        SSL_ENABLED: {
          type: 'boolean',
          required: true,
        },
      }),
    },
    strict: false,
  });

  const result = await validator.load();

  if (result.success) {
    console.log('✓ 环境配置加载成功');
  } else {
    console.log('✗ 环境配置验证失败:');
    result.errors.forEach((error) => {
      console.log(`  ${error.variable}: ${error.message}`);
    });
  }
}

// ============ 运行所有示例 ============

async function runAllExamples() {
  console.log('╔════════════════════════════════════════╗');
  console.log('║   EnvValidator 使用示例               ║');
  console.log('╚════════════════════════════════════════╝\n');

  try {
    await example1_basic();
  } catch (error) {
    console.error('示例 1 失败:', error);
  }

  try {
    await example2_convenience();
  } catch (error) {
    console.error('示例 2 失败:', error);
  }

  try {
    example3_express_middleware();
  } catch (error) {
    console.error('示例 3 失败:', error);
  }

  try {
    await example4_custom_validation();
  } catch (error) {
    console.error('示例 4 失败:', error);
  }

  try {
    await example5_multi_environment();
  } catch (error) {
    console.error('示例 5 失败:', error);
  }

  console.log('\n╔════════════════════════════════════════╗');
  console.log('║   所有示例运行完成                    ║');
  console.log('╚════════════════════════════════════════╝');
}

// 如果直接运行此文件
if (require.main === module) {
  runAllExamples().catch(console.error);
}

export { runAllExamples };
