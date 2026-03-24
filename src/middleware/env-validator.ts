/**
 * EnvValidator - 环境变量加载与验证中间件
 * 
 * 功能:
 * 1. .env 文件加载 (支持多环境)
 * 2. 类型验证 (string/number/boolean/url/email)
 * 3. 必填项检查
 * 4. 默认值支持
 * 
 * @author Axon
 * @version 1.0.0
 */

import * as fs from 'fs';
import * as path from 'path';

// ============ 类型定义 ============

/**
 * 支持的变量类型
 */
export type EnvVarType = 
  | 'string' 
  | 'number' 
  | 'boolean' 
  | 'url' 
  | 'email' 
  | 'port' 
  | 'path';

/**
 * 环境变量验证规则
 */
export interface EnvValidationRule {
  /** 变量类型 */
  type: EnvVarType;
  /** 是否必填 */
  required?: boolean;
  /** 默认值 */
  default?: any;
  /** 最小值 (number/port) */
  min?: number;
  /** 最大值 (number/port) */
  max?: number;
  /** 正则表达式 (string) */
  pattern?: RegExp;
  /** 枚举值 */
  enum?: any[];
  /** 自定义验证函数 */
  validate?: (value: any) => boolean;
  /** 错误提示 */
  errorMessage?: string;
}

/**
 * 环境变量验证器配置
 */
export interface EnvValidatorSchema {
  [key: string]: EnvValidationRule;
}

/**
 * 验证错误信息
 */
export interface EnvValidationError {
  /** 变量名 */
  variable: string;
  /** 错误类型 */
  errorType: 'missing' | 'type' | 'range' | 'pattern' | 'enum' | 'custom';
  /** 错误消息 */
  message: string;
  /** 当前值 */
  value?: any;
}

/**
 * 验证结果
 */
export interface EnvValidationResult {
  /** 是否成功 */
  success: boolean;
  /** 错误列表 */
  errors: EnvValidationError[];
  /** 验证后的环境变量 */
  env: Record<string, any>;
}

/**
 * EnvValidator 配置选项
 */
export interface EnvValidatorOptions {
  /** .env 文件路径 (默认: .env) */
  envPath?: string;
  /** 验证器 schema */
  schema: EnvValidatorSchema;
  /** 是否严格模式 (失败时抛出异常) */
  strict?: boolean;
  /** 是否允许覆盖 process.env */
  overrideEnv?: boolean;
}

// ============ 环境变量验证器类 ============

export class EnvValidator {
  private envPath: string;
  private schema: EnvValidatorSchema;
  private strict: boolean;
  private overrideEnv: boolean;
  private loadedEnv: Record<string, string> = {};

  constructor(options: EnvValidatorOptions) {
    const workspaceRoot = process.env.WORKSPACE_ROOT || process.cwd();
    this.envPath = options.envPath || path.join(workspaceRoot, '.env');
    this.schema = options.schema;
    this.strict = options.strict ?? true;
    this.overrideEnv = options.overrideEnv ?? true;
  }

  /**
   * 加载并验证环境变量
   */
  async load(): Promise<EnvValidationResult> {
    // 1. 加载 .env 文件
    this.loadedEnv = this.loadEnvFile();

    // 2. 合并 process.env (优先级更高)
    const mergedEnv = { ...this.loadedEnv, ...process.env };

    // 3. 验证所有变量
    const errors: EnvValidationError[] = [];
    const validatedEnv: Record<string, any> = {};

    for (const [key, rule] of Object.entries(this.schema)) {
      const value = mergedEnv[key];

      // 检查必填项
      if (rule.required && (value === undefined || value === '')) {
        if (rule.default !== undefined) {
          validatedEnv[key] = rule.default;
        } else {
          errors.push({
            variable: key,
            errorType: 'missing',
            message: rule.errorMessage || `环境变量 ${key} 是必填项`,
          });
        }
        continue;
      }

      // 使用默认值
      if (value === undefined || value === '') {
        if (rule.default !== undefined) {
          validatedEnv[key] = rule.default;
        }
        continue;
      }

      // 类型验证与转换
      const convertedValue = this.convertAndValidate(key, value, rule, errors);
      if (convertedValue !== null) {
        validatedEnv[key] = convertedValue;
      }
    }

    const result: EnvValidationResult = {
      success: errors.length === 0,
      errors,
      env: validatedEnv,
    };

    // 严格模式下抛出异常
    if (this.strict && !result.success) {
      throw new EnvValidationErrorClass(
        `环境变量验证失败：${errors.map(e => e.message).join(', ')}`,
        errors
      );
    }

    // 覆盖 process.env
    if (this.overrideEnv && result.success) {
      for (const [key, value] of Object.entries(validatedEnv)) {
        process.env[key] = String(value);
      }
    }

    return result;
  }

  /**
   * 加载 .env 文件
   */
  private loadEnvFile(): Record<string, string> {
    const env: Record<string, string> = {};

    // 尝试多个可能的路径
    const pathsToTry = [
      this.envPath,
      path.join(process.cwd(), '.env'),
      path.join(__dirname, '../../.env'),
    ];

    let envContent: string | null = null;
    for (const envPath of pathsToTry) {
      if (fs.existsSync(envPath)) {
        envContent = fs.readFileSync(envPath, 'utf-8');
        break;
      }
    }

    if (!envContent) {
      return env;
    }

    // 解析 .env 文件
    const lines = envContent.split('\n');
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // 跳过注释和空行
      if (!trimmedLine || trimmedLine.startsWith('#')) {
        continue;
      }

      // 解析 KEY=VALUE
      const match = trimmedLine.match(/^([^=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        let value = match[2].trim();

        // 移除引号
        if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }

        env[key] = value;
      }
    }

    return env;
  }

  /**
   * 类型转换与验证
   */
  private convertAndValidate(
    key: string,
    value: string,
    rule: EnvValidationRule,
    errors: EnvValidationError[]
  ): any {
    let convertedValue: any = value;

    switch (rule.type) {
      case 'string':
        convertedValue = this.validateString(key, value, rule, errors);
        break;
      case 'number':
        convertedValue = this.validateNumber(key, value, rule, errors);
        break;
      case 'boolean':
        convertedValue = this.validateBoolean(key, value, rule, errors);
        break;
      case 'url':
        convertedValue = this.validateUrl(key, value, rule, errors);
        break;
      case 'email':
        convertedValue = this.validateEmail(key, value, rule, errors);
        break;
      case 'port':
        convertedValue = this.validatePort(key, value, rule, errors);
        break;
      case 'path':
        convertedValue = this.validatePath(key, value, rule, errors);
        break;
    }

    // 枚举验证
    if (rule.enum && !rule.enum.includes(convertedValue)) {
      errors.push({
        variable: key,
        errorType: 'enum',
        message: rule.errorMessage || `环境变量 ${key} 的值必须是 ${rule.enum.join(', ')} 之一`,
        value,
      });
      return null;
    }

    // 自定义验证
    if (rule.validate && !rule.validate(convertedValue)) {
      errors.push({
        variable: key,
        errorType: 'custom',
        message: rule.errorMessage || `环境变量 ${key} 未通过自定义验证`,
        value,
      });
      return null;
    }

    return errors.length > 0 && errors[errors.length - 1].variable === key ? null : convertedValue;
  }

  private validateString(key: string, value: string, rule: EnvValidationRule, errors: EnvValidationError[]): string {
    if (rule.pattern && !rule.pattern.test(value)) {
      errors.push({
        variable: key,
        errorType: 'pattern',
        message: rule.errorMessage || `环境变量 ${key} 的格式不符合要求`,
        value,
      });
      return value;
    }
    return value;
  }

  private validateNumber(key: string, value: string, rule: EnvValidationRule, errors: EnvValidationError[]): number | null {
    const num = Number(value);
    if (isNaN(num)) {
      errors.push({
        variable: key,
        errorType: 'type',
        message: rule.errorMessage || `环境变量 ${key} 必须是数字类型`,
        value,
      });
      return null;
    }

    if (rule.min !== undefined && num < rule.min) {
      errors.push({
        variable: key,
        errorType: 'range',
        message: rule.errorMessage || `环境变量 ${key} 的值不能小于 ${rule.min}`,
        value,
      });
      return null;
    }

    if (rule.max !== undefined && num > rule.max) {
      errors.push({
        variable: key,
        errorType: 'range',
        message: rule.errorMessage || `环境变量 ${key} 的值不能大于 ${rule.max}`,
        value,
      });
      return null;
    }

    return num;
  }

  private validateBoolean(key: string, value: string, rule: EnvValidationRule, errors: EnvValidationError[]): boolean {
    const validValues = ['true', 'false', '1', '0', 'yes', 'no'];
    if (!validValues.includes(value.toLowerCase())) {
      errors.push({
        variable: key,
        errorType: 'type',
        message: rule.errorMessage || `环境变量 ${key} 必须是布尔类型 (true/false)`,
        value,
      });
      return false;
    }
    return ['true', '1', 'yes'].includes(value.toLowerCase());
  }

  private validateUrl(key: string, value: string, rule: EnvValidationRule, errors: EnvValidationError[]): string {
    try {
      new URL(value);
      return value;
    } catch {
      errors.push({
        variable: key,
        errorType: 'type',
        message: rule.errorMessage || `环境变量 ${key} 必须是有效的 URL`,
        value,
      });
      return value;
    }
  }

  private validateEmail(key: string, value: string, rule: EnvValidationRule, errors: EnvValidationError[]): string {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      errors.push({
        variable: key,
        errorType: 'type',
        message: rule.errorMessage || `环境变量 ${key} 必须是有效的邮箱地址`,
        value,
      });
      return value;
    }
    return value;
  }

  private validatePort(key: string, value: string, rule: EnvValidationRule, errors: EnvValidationError[]): number | null {
    const port = Number(value);
    if (isNaN(port) || port < 1 || port > 65535) {
      errors.push({
        variable: key,
        errorType: 'range',
        message: rule.errorMessage || `环境变量 ${key} 必须是有效的端口号 (1-65535)`,
        value,
      });
      return null;
    }
    return port;
  }

  private validatePath(key: string, value: string, rule: EnvValidationRule, errors: EnvValidationError[]): string {
    // 简单的路径验证，可以扩展为检查路径是否存在
    if (value.length === 0) {
      errors.push({
        variable: key,
        errorType: 'type',
        message: rule.errorMessage || `环境变量 ${key} 必须是有效的文件路径`,
        value,
      });
    }
    return value;
  }

  /**
   * 获取已加载的环境变量
   */
  getEnv(): Record<string, any> {
    return this.loadedEnv;
  }

  /**
   * 获取单个环境变量
   */
  get(key: string, defaultValue?: any): any {
    return this.loadedEnv[key] ?? defaultValue;
  }
}

// ============ 自定义错误类 ============

export class EnvValidationErrorClass extends Error {
  errors: EnvValidationError[];

  constructor(message: string, errors: EnvValidationError[]) {
    super(message);
    this.name = 'EnvValidationError';
    this.errors = errors;
  }
}

// ============ 便捷函数 ============

/**
 * 快速验证环境变量
 */
export async function validateEnv(
  schema: EnvValidatorSchema,
  options?: Partial<EnvValidatorOptions>
): Promise<EnvValidationResult> {
  const validator = new EnvValidator({
    schema,
    ...options,
  });
  return await validator.load();
}

/**
 * 创建环境变量验证中间件 (用于 Express/Koa)
 */
export function createEnvMiddleware(schema: EnvValidatorSchema, options?: Partial<EnvValidatorOptions>) {
  return async (req: any, res: any, next: (err?: any) => void) => {
    try {
      const validator = new EnvValidator({
        schema,
        ...options,
      });
      await validator.load();
      next();
    } catch (error) {
      if (error instanceof EnvValidationErrorClass) {
        res.status(500).json({
          error: '环境变量配置错误',
          details: error.errors,
        });
      } else {
        next(error);
      }
    }
  };
}

// ============ 使用示例 ============

/*
// 示例 1: 基础使用
import { EnvValidator } from './middleware/env-validator';

const validator = new EnvValidator({
  schema: {
    DATABASE_URL: {
      type: 'url',
      required: true,
    },
    DATABASE_PORT: {
      type: 'port',
      default: 5432,
    },
    API_KEY: {
      type: 'string',
      required: true,
      pattern: /^[a-zA-Z0-9]{32}$/,
      errorMessage: 'API_KEY 必须是 32 位字母数字组合',
    },
    DEBUG: {
      type: 'boolean',
      default: false,
    },
    MAX_CONNECTIONS: {
      type: 'number',
      min: 1,
      max: 100,
      default: 10,
    },
    LOG_LEVEL: {
      type: 'string',
      enum: ['debug', 'info', 'warn', 'error'],
      default: 'info',
    },
    ADMIN_EMAIL: {
      type: 'email',
      required: true,
    },
  },
  strict: true,
});

await validator.load();

// 示例 2: 使用便捷函数
import { validateEnv } from './middleware/env-validator';

const result = await validateEnv({
  NODE_ENV: { type: 'string', enum: ['development', 'production', 'test'], required: true },
  PORT: { type: 'port', default: 3000 },
});

if (!result.success) {
  console.error('验证失败:', result.errors);
}

// 示例 3: 在 Express 中使用中间件
import express from 'express';
import { createEnvMiddleware } from './middleware/env-validator';

const app = express();

app.use(createEnvMiddleware({
  DATABASE_URL: { type: 'url', required: true },
  JWT_SECRET: { type: 'string', required: true, min: 32 },
}));

// 示例 4: .env 文件格式
// .env
// DATABASE_URL=postgresql://localhost:5432/mydb
// DATABASE_PORT=5432
// API_KEY=abc123def456ghi789jkl012mno345pq
// DEBUG=true
// MAX_CONNECTIONS=20
// LOG_LEVEL=debug
// ADMIN_EMAIL=admin@example.com
*/
