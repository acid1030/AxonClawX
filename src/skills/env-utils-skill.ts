/**
 * 环境变量工具技能 - ACE
 * 
 * 提供环境变量管理功能：
 * 1. 环境变量读取 - 从 .env 文件或 process.env 读取变量
 * 2. 环境变量验证 - 验证变量类型、必填项、范围等
 * 3. 环境变量加载 - 加载 .env 文件到 process.env
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
 * 环境变量加载选项
 */
export interface EnvLoadOptions {
  /** .env 文件路径 */
  envPath?: string;
  /** 是否覆盖现有环境变量 */
  override?: boolean;
  /** 是否抛出异常 */
  throwOnError?: boolean;
}

// ============ 核心功能 ============

/**
 * 1. 环境变量读取
 * 从 .env 文件读取环境变量
 * 
 * @param envPath - .env 文件路径，默认为当前工作目录的 .env
 * @returns 解析后的环境变量对象
 * 
 * @example
 * const env = readEnvFile();
 * console.log(env.DATABASE_URL);
 * 
 * @example
 * const env = readEnvFile('./config/.env.prod');
 * console.log(env.API_KEY);
 */
export function readEnvFile(envPath?: string): Record<string, string> {
  const env: Record<string, string> = {};
  
  // 确定文件路径
  const workspaceRoot = process.env.WORKSPACE_ROOT || process.cwd();
  const filePath = envPath || path.join(workspaceRoot, '.env');
  
  // 检查文件是否存在
  if (!fs.existsSync(filePath)) {
    // 尝试其他常见路径
    const fallbackPaths = [
      path.join(process.cwd(), '.env'),
      path.join(__dirname, '../../.env'),
      path.join(__dirname, '../../../.env'),
    ];
    
    let found = false;
    for (const fallbackPath of fallbackPaths) {
      if (fs.existsSync(fallbackPath)) {
        return parseEnvFile(fallbackPath);
      }
    }
    
    return env;
  }
  
  return parseEnvFile(filePath);
}

/**
 * 解析 .env 文件
 */
function parseEnvFile(filePath: string): Record<string, string> {
  const env: Record<string, string> = {};
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  
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
 * 2. 环境变量验证
 * 验证环境变量是否符合指定的规则
 * 
 * @param schema - 验证规则 schema
 * @param source - 环境变量来源，默认为 process.env
 * @returns 验证结果
 * 
 * @example
 * const result = validateEnvVars({
 *   DATABASE_URL: { type: 'url', required: true },
 *   PORT: { type: 'port', default: 3000 },
 *   DEBUG: { type: 'boolean', default: false },
 * });
 * 
 * if (!result.success) {
 *   console.error('验证失败:', result.errors);
 * }
 */
export function validateEnvVars(
  schema: EnvValidatorSchema,
  source: Record<string, any> = process.env
): EnvValidationResult {
  const errors: EnvValidationError[] = [];
  const validatedEnv: Record<string, any> = {};
  
  for (const [key, rule] of Object.entries(schema)) {
    const value = source[key];
    
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
    const convertedValue = convertAndValidate(key, value, rule, errors);
    if (convertedValue !== null) {
      validatedEnv[key] = convertedValue;
    }
  }
  
  return {
    success: errors.length === 0,
    errors,
    env: validatedEnv,
  };
}

/**
 * 类型转换与验证
 */
function convertAndValidate(
  key: string,
  value: string,
  rule: EnvValidationRule,
  errors: EnvValidationError[]
): any {
  let convertedValue: any = value;
  
  switch (rule.type) {
    case 'string':
      convertedValue = validateString(key, value, rule, errors);
      break;
    case 'number':
      convertedValue = validateNumber(key, value, rule, errors);
      break;
    case 'boolean':
      convertedValue = validateBoolean(key, value, rule, errors);
      break;
    case 'url':
      convertedValue = validateUrl(key, value, rule, errors);
      break;
    case 'email':
      convertedValue = validateEmail(key, value, rule, errors);
      break;
    case 'port':
      convertedValue = validatePort(key, value, rule, errors);
      break;
    case 'path':
      convertedValue = validatePath(key, value, rule, errors);
      break;
  }
  
  // 检查是否已添加错误
  const hasError = errors.some(e => e.variable === key);
  if (hasError) {
    return null;
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
  
  return convertedValue;
}

function validateString(key: string, value: string, rule: EnvValidationRule, errors: EnvValidationError[]): string {
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

function validateNumber(key: string, value: string, rule: EnvValidationRule, errors: EnvValidationError[]): number | null {
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

function validateBoolean(key: string, value: string, rule: EnvValidationRule, errors: EnvValidationError[]): boolean {
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

function validateUrl(key: string, value: string, rule: EnvValidationRule, errors: EnvValidationError[]): string {
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

function validateEmail(key: string, value: string, rule: EnvValidationRule, errors: EnvValidationError[]): string {
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

function validatePort(key: string, value: string, rule: EnvValidationRule, errors: EnvValidationError[]): number | null {
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

function validatePath(key: string, value: string, rule: EnvValidationRule, errors: EnvValidationError[]): string {
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
 * 3. 环境变量加载
 * 将 .env 文件加载到 process.env 中
 * 
 * @param options - 加载选项
 * @returns 加载结果
 * 
 * @example
 * const result = loadEnvVars({
 *   envPath: './.env.production',
 *   override: true,
 * });
 * 
 * console.log('加载成功:', result.success);
 * console.log('加载的变量数:', Object.keys(result.loaded).length);
 */
export function loadEnvVars(options?: EnvLoadOptions): {
  success: boolean;
  loaded: Record<string, string>;
  error?: string;
} {
  try {
    const workspaceRoot = process.env.WORKSPACE_ROOT || process.cwd();
    const envPath = options?.envPath || path.join(workspaceRoot, '.env');
    const override = options?.override ?? false;
    
    // 读取 .env 文件
    const env = readEnvFile(envPath);
    
    if (Object.keys(env).length === 0) {
      return {
        success: false,
        loaded: {},
        error: `未找到 .env 文件：${envPath}`,
      };
    }
    
    // 加载到 process.env
    for (const [key, value] of Object.entries(env)) {
      if (override || process.env[key] === undefined) {
        process.env[key] = value;
      }
    }
    
    return {
      success: true,
      loaded: env,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      loaded: {},
      error: errorMessage,
    };
  }
}

/**
 * 获取单个环境变量 (带类型转换)
 * 
 * @param key - 环境变量名
 * @param defaultValue - 默认值
 * @param type - 目标类型，默认为 string
 * @returns 转换后的值
 * 
 * @example
 * const port = getEnvVar('PORT', 3000, 'number');
 * const debug = getEnvVar('DEBUG', false, 'boolean');
 * const url = getEnvVar('API_URL', 'http://localhost:3000', 'url');
 */
export function getEnvVar<T = string>(
  key: string,
  defaultValue?: T,
  type: EnvVarType = 'string' as any
): T {
  const value = process.env[key];
  
  if (value === undefined || value === '') {
    return defaultValue as T;
  }
  
  switch (type) {
    case 'number':
      return Number(value) as any as T;
    case 'boolean':
      return ['true', '1', 'yes'].includes(value.toLowerCase()) as any as T;
    case 'string':
    default:
      return value as any as T;
  }
}

/**
 * 批量获取环境变量
 * 
 * @param keys - 环境变量名列表
 * @returns 包含所有请求变量的对象
 * 
 * @example
 * const { DATABASE_URL, PORT, DEBUG } = getEnvVars(['DATABASE_URL', 'PORT', 'DEBUG']);
 */
export function getEnvVars(keys: string[]): Record<string, string | undefined> {
  const result: Record<string, string | undefined> = {};
  for (const key of keys) {
    result[key] = process.env[key];
  }
  return result;
}

// ============================================
// 使用示例
// ============================================

if (require.main === module) {
  console.log('=== 环境变量工具技能 - 使用示例 ===\n');
  
  // 1. 读取环境变量
  console.log('1️⃣ 环境变量读取:');
  const env = readEnvFile();
  if (Object.keys(env).length > 0) {
    console.log(`   读取到 ${Object.keys(env).length} 个环境变量`);
    console.log('   前 5 个变量:');
    Object.entries(env).slice(0, 5).forEach(([key, value]) => {
      console.log(`     ${key}=${value}`);
    });
  } else {
    console.log('   未找到 .env 文件');
  }
  console.log();
  
  // 2. 验证环境变量
  console.log('2️⃣ 环境变量验证:');
  const validationResult = validateEnvVars({
    TEST_STRING: {
      type: 'string',
      default: 'default_value',
    },
    TEST_NUMBER: {
      type: 'number',
      min: 0,
      max: 100,
      default: 50,
    },
    TEST_BOOLEAN: {
      type: 'boolean',
      default: true,
    },
    TEST_PORT: {
      type: 'port',
      default: 8080,
    },
    TEST_URL: {
      type: 'url',
      default: 'https://example.com',
    },
  });
  
  if (validationResult.success) {
    console.log('   ✓ 验证通过');
    console.log('   验证后的变量:');
    Object.entries(validationResult.env).forEach(([key, value]) => {
      console.log(`     ${key}: ${value} (${typeof value})`);
    });
  } else {
    console.log('   ✗ 验证失败:');
    validationResult.errors.forEach(err => {
      console.log(`     ${err.variable}: ${err.message}`);
    });
  }
  console.log();
  
  // 3. 加载环境变量
  console.log('3️⃣ 环境变量加载:');
  const loadResult = loadEnvVars({ override: false });
  if (loadResult.success) {
    console.log(`   ✓ 成功加载 ${Object.keys(loadResult.loaded).length} 个变量`);
  } else {
    console.log(`   ✗ 加载失败: ${loadResult.error}`);
  }
  console.log();
  
  // 4. 获取单个变量
  console.log('4️⃣ 获取单个环境变量:');
  const port = getEnvVar('PORT', 3000, 'number');
  const debug = getEnvVar('DEBUG', false, 'boolean');
  console.log(`   PORT: ${port} (number)`);
  console.log(`   DEBUG: ${debug} (boolean)`);
  console.log();
  
  // 5. 批量获取变量
  console.log('5️⃣ 批量获取环境变量:');
  const vars = getEnvVars(['NODE_ENV', 'PORT', 'DEBUG']);
  Object.entries(vars).forEach(([key, value]) => {
    console.log(`   ${key}: ${value ?? '(undefined)'}`);
  });
  console.log();
  
  console.log('✅ 所有示例执行完成!');
}
