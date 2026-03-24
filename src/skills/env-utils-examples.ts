/**
 * 环境变量工具使用示例
 * 
 * 此文件演示了 env-utils-skill.ts 的各种用法
 */

import {
  parseEnvFile,
  parseEnvContent,
  getEnv,
  getEnvRequired,
  toNumber,
  toBoolean,
  toUrl,
  toEmail,
  toEnum,
  toJson,
  toArray,
  validateEnv,
  loadEnvConfig,
  generateEnvTemplate,
  type EnvValidationRule,
} from './env-utils-skill';

// ==================== 示例 1: 基础解析 ====================

export function example1_basicParse() {
  console.log('=== 示例 1: 基础解析 ===\n');

  // 解析 .env 文件
  const result = parseEnvFile();
  
  console.log('解析结果:', {
    有效配置数: result.validLines,
    总行数：result.totalLines,
    错误数：result.errors.length,
  });

  if (result.errors.length > 0) {
    console.log('解析错误:', result.errors);
  }

  console.log('PORT 值:', result.data.PORT);
  console.log('DEBUG 值:', result.data.DEBUG);
}

// ==================== 示例 2: 解析字符串内容 ====================

export function example2_parseContent() {
  console.log('\n=== 示例 2: 解析字符串内容 ===\n');

  const envContent = `
    # 应用配置
    NODE_ENV=production
    PORT=3000
    DEBUG=false
    
    # 数据库配置
    DATABASE_URL="postgresql://localhost:5432/mydb"
    MAX_CONNECTIONS=20
    
    # 功能开关
    ENABLE_METRICS=true
    ENABLE_HEALTH_CHECK=yes
  `;

  const result = parseEnvContent(envContent);
  
  console.log('解析后的数据:', result.data);
  console.log('有效行数:', result.validLines);
}

// ==================== 示例 3: 读取环境变量 ====================

export function example3_readEnv() {
  console.log('\n=== 示例 3: 读取环境变量 ===\n');

  // 简单读取
  const port = getEnv('PORT', '3000');
  console.log('PORT:', port);

  // 读取必需的环境变量
  try {
    const nodeEnv = getEnvRequired('NODE_ENV', 'NODE_ENV 未设置');
    console.log('NODE_ENV:', nodeEnv);
  } catch (error) {
    console.error('错误:', error instanceof Error ? error.message : error);
  }

  // 检查环境变量是否存在
  if (getEnv('DEBUG')) {
    console.log('调试模式已启用');
  }
}

// ==================== 示例 4: 类型转换 ====================

export function example4_typeConversion() {
  console.log('\n=== 示例 4: 类型转换 ===\n');

  // 转换为数字
  const port = toNumber(process.env.PORT, 3000, { min: 1, max: 65535 });
  console.log('PORT (number):', port, typeof port);

  const timeout = toNumber(process.env.REQUEST_TIMEOUT, 30000, {
    min: 1000,
    max: 60000,
  });
  console.log('REQUEST_TIMEOUT:', timeout);

  // 转换为布尔值
  const debug = toBoolean(process.env.DEBUG, false);
  console.log('DEBUG (boolean):', debug, typeof debug);

  const metrics = toBoolean(process.env.ENABLE_METRICS, false);
  console.log('ENABLE_METRICS:', metrics);

  // 转换为 URL
  const dbUrl = toUrl(
    process.env.DATABASE_URL,
    'postgresql://localhost:5432/default',
    { protocols: ['postgresql', 'mysql', 'mongodb'] }
  );
  console.log('DATABASE_URL:', dbUrl);

  // 转换为邮箱
  const adminEmail = toEmail(process.env.ADMIN_EMAIL, 'admin@example.com');
  console.log('ADMIN_EMAIL:', adminEmail);

  // 转换为枚举
  const nodeEnv = toEnum(
    process.env.NODE_ENV,
    ['development', 'production', 'test'] as const,
    'development'
  );
  console.log('NODE_ENV:', nodeEnv);

  // 转换为 JSON
  const config = toJson(process.env.CONFIG_JSON, { debug: false, verbose: true });
  console.log('CONFIG_JSON:', config);

  // 转换为数组
  const hosts = toArray(process.env.HOSTS, ['localhost'], {
    separator: ',',
    trim: true,
    removeEmpty: true,
  });
  console.log('HOSTS:', hosts);
}

// ==================== 示例 5: 环境变量验证 ====================

export function example5_validation() {
  console.log('\n=== 示例 5: 环境变量验证 ===\n');

  const rules: EnvValidationRule[] = [
    {
      key: 'PORT',
      required: true,
      type: 'number',
      min: 1,
      max: 65535,
      default: '3000',
    },
    {
      key: 'NODE_ENV',
      required: true,
      enum: ['development', 'production', 'test'],
      default: 'development',
    },
    {
      key: 'DATABASE_URL',
      required: true,
      type: 'url',
    },
    {
      key: 'DEBUG',
      type: 'boolean',
      default: 'false',
    },
    {
      key: 'JWT_SECRET',
      required: true,
      type: 'string',
    },
    {
      key: 'ADMIN_EMAIL',
      type: 'email',
      default: 'admin@example.com',
    },
    {
      key: 'LOG_LEVEL',
      type: 'string',
      enum: ['debug', 'info', 'warn', 'error'],
      default: 'info',
    },
  ];

  const result = validateEnv(rules);

  console.log('验证结果:', {
    是否通过：result.valid,
    错误数：result.errors.length,
    警告数：result.warnings.length,
  });

  if (!result.valid) {
    console.log('\n验证错误:');
    result.errors.forEach(err => {
      console.log(`  - ${err.key}: ${err.message}`);
    });
  }

  if (result.warnings.length > 0) {
    console.log('\n警告:');
    result.warnings.forEach(warn => {
      console.log(`  - ${warn.key}: ${warn.message}`);
      if (warn.suggestion) {
        console.log(`    建议：${warn.suggestion}`);
      }
    });
  }

  console.log('\n处理后的值:', result.values);
}

// ==================== 示例 6: 加载配置 ====================

export function example6_loadConfig() {
  console.log('\n=== 示例 6: 加载配置 ===\n');

  try {
    const config = loadEnvConfig([
      {
        key: 'PORT',
        required: true,
        type: 'number',
        default: '3000',
      },
      {
        key: 'NODE_ENV',
        required: true,
        enum: ['development', 'production', 'test'],
      },
      {
        key: 'DEBUG',
        type: 'boolean',
        default: 'false',
      },
      {
        key: 'ENABLE_METRICS',
        type: 'boolean',
        default: 'true',
      },
    ]);

    console.log('加载的配置:', config);
    console.log('PORT (number):', config.PORT, typeof config.PORT);
    console.log('DEBUG (boolean):', config.DEBUG, typeof config.DEBUG);
  } catch (error) {
    console.error('加载配置失败:', error instanceof Error ? error.message : error);
  }
}

// ==================== 示例 7: 生成 .env 模板 ====================

export function example7_generateTemplate() {
  console.log('\n=== 示例 7: 生成 .env 模板 ===\n');

  const rules: EnvValidationRule[] = [
    {
      key: 'NODE_ENV',
      required: true,
      enum: ['development', 'production', 'test'],
      default: 'development',
    },
    {
      key: 'PORT',
      required: true,
      type: 'number',
      min: 1,
      max: 65535,
      default: '3000',
    },
    {
      key: 'DATABASE_URL',
      required: true,
      type: 'url',
      default: 'postgresql://localhost:5432/mydb',
    },
    {
      key: 'JWT_SECRET',
      required: true,
      default: 'your_32_character_or_longer_secret_key',
    },
    {
      key: 'DEBUG',
      type: 'boolean',
      default: 'false',
    },
    {
      key: 'LOG_LEVEL',
      enum: ['debug', 'info', 'warn', 'error'],
      default: 'info',
    },
    {
      key: 'ADMIN_EMAIL',
      type: 'email',
      default: 'admin@example.com',
    },
  ];

  const template = generateEnvTemplate(rules, {
    title: 'AxonClaw 应用配置',
    includeComments: true,
    includeDefaults: true,
  });

  console.log('生成的 .env 模板:\n');
  console.log(template);

  // 实际使用时可以写入文件
  // import * as fs from 'fs';
  // fs.writeFileSync('.env.example', template);
}

// ==================== 示例 8: 实际应用场景 ====================

export function example8_realWorld() {
  console.log('\n=== 示例 8: 实际应用场景 ===\n');

  // 应用配置类
  class AppConfig {
    readonly port: number;
    readonly host: string;
    readonly nodeEnv: 'development' | 'production' | 'test';
    readonly debug: boolean;
    readonly databaseUrl: string;
    readonly jwtSecret: string;
    readonly logLevel: string;

    constructor() {
      // 使用 loadEnvConfig 一次性加载所有配置
      const config = loadEnvConfig(
        [
          {
            key: 'PORT',
            required: true,
            type: 'number',
            min: 1,
            max: 65535,
            default: '3000',
          },
          {
            key: 'HOST',
            required: false,
            default: 'localhost',
          },
          {
            key: 'NODE_ENV',
            required: true,
            enum: ['development', 'production', 'test'],
          },
          {
            key: 'DEBUG',
            type: 'boolean',
            default: 'false',
          },
          {
            key: 'DATABASE_URL',
            required: true,
            type: 'url',
          },
          {
            key: 'JWT_SECRET',
            required: true,
          },
          {
            key: 'LOG_LEVEL',
            enum: ['debug', 'info', 'warn', 'error'],
            default: 'info',
          },
        ],
        { throwOnError: true }
      );

      this.port = config.PORT;
      this.host = config.HOST;
      this.nodeEnv = config.NODE_ENV;
      this.debug = config.DEBUG;
      this.databaseUrl = config.DATABASE_URL;
      this.jwtSecret = config.JWT_SECRET;
      this.logLevel = config.LOG_LEVEL;
    }

    isProduction(): boolean {
      return this.nodeEnv === 'production';
    }

    isDevelopment(): boolean {
      return this.nodeEnv === 'development';
    }
  }

  try {
    const appConfig = new AppConfig();
    
    console.log('应用配置:', {
      端口：appConfig.port,
      主机：appConfig.host,
      环境：appConfig.nodeEnv,
      调试模式：appConfig.debug,
      日志级别：appConfig.logLevel,
      是否生产环境：appConfig.isProduction(),
    });
  } catch (error) {
    console.error('初始化配置失败:', error instanceof Error ? error.message : error);
  }
}

// ==================== 运行所有示例 ====================

export function runAllExamples() {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║     环境变量工具使用示例 (Env Utils Examples)          ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  example1_basicParse();
  example2_parseContent();
  example3_readEnv();
  example4_typeConversion();
  example5_validation();
  example6_loadConfig();
  example7_generateTemplate();
  example8_realWorld();

  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║                  所有示例运行完成                      ║');
  console.log('╚════════════════════════════════════════════════════════╝');
}

// 如果直接运行此文件
if (require.main === module) {
  runAllExamples();
}
