/**
 * 配置验证工具 - ACE Config Validator
 * 
 * 功能:
 * 1. Schema 验证 - 基于 JSON Schema 的配置结构验证
 * 2. 默认值填充 - 根据 Schema 自动填充缺失字段的默认值
 * 3. 环境变量替换 - 支持 ${ENV_VAR} 语法的环境变量插值
 * 
 * 使用示例:
 * ```typescript
 * import { ConfigValidator, ConfigSchema } from './config-validator-skill';
 * 
 * // 定义配置 Schema
 * const configSchema: ConfigSchema = {
 *   type: 'object',
 *   properties: {
 *     server: {
 *       type: 'object',
 *       properties: {
 *         host: { type: 'string', default: 'localhost' },
 *         port: { type: 'number', default: 3000, minimum: 1, maximum: 65535 },
 *         env: { type: 'string', enum: ['development', 'production', 'test'] }
 *       },
 *       required: ['port']
 *     },
 *     database: {
 *       type: 'object',
 *       properties: {
 *         url: { 
 *           type: 'string', 
 *           default: '${DATABASE_URL}',
 *           pattern: '^postgres://.*'
 *         },
 *         poolSize: { type: 'number', default: 10 }
 *       }
 *     },
 *     features: {
 *       type: 'array',
 *       items: { type: 'string' },
 *       default: ['auth', 'logging']
 *     }
 *   }
 * };
 * 
 * // 创建验证器
 * const validator = new ConfigValidator(configSchema);
 * 
 * // 验证配置
 * const config = {
 *   server: {
 *     port: 8080,
 *     env: 'production'
 *   },
 *   database: {
 *     url: '${DATABASE_URL}',
 *     poolSize: 20
 *   }
 * };
 * 
 * // 执行验证 (包含默认值填充和环境变量替换)
 * const result = validator.validate(config, {
 *   fillDefaults: true,
 *   replaceEnv: true,
 *   envPrefix: 'APP_'
 * });
 * 
 * console.log(result.valid); // true/false
 * console.log(result.data);  // 填充后的完整配置
 * console.log(result.errors); // 验证错误列表
 * ```
 * 
 * @version 1.0.0
 * @author Axon
 * @module skills/config-validator
 */

// ============ 类型定义 ============

/** Schema 类型 */
export type SchemaType = 'string' | 'number' | 'boolean' | 'object' | 'array' | 'null';

/** Schema 定义 */
export interface ConfigSchema {
  type?: SchemaType | SchemaType[];
  properties?: Record<string, ConfigSchema>;
  items?: ConfigSchema;
  required?: string[];
  default?: any;
  
  // 验证规则
  minimum?: number;
  maximum?: number;
  exclusiveMinimum?: number;
  exclusiveMaximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  format?: string;
  enum?: any[];
  const?: any;
  
  // 嵌套对象
  additionalProperties?: boolean | ConfigSchema;
}

/** 验证错误 */
export interface ValidationError {
  /** 错误路径 (JSON Pointer) */
  path: string;
  /** 错误信息 */
  message: string;
  /** 错误代码 */
  code: string;
  /** 实际值 */
  actual?: any;
  /** 期望值 */
  expected?: any;
}

/** 验证结果 */
export interface ValidationResult {
  /** 是否通过验证 */
  valid: boolean;
  /** 验证后的数据 (已填充默认值和替换环境变量) */
  data: any;
  /** 错误列表 */
  errors: ValidationError[];
}

/** 验证选项 */
export interface ValidateOptions {
  /** 是否填充默认值 */
  fillDefaults?: boolean;
  /** 是否替换环境变量 */
  replaceEnv?: boolean;
  /** 环境变量前缀 */
  envPrefix?: string;
  /** 是否严格模式 (遇到未知字段报错) */
  strict?: boolean;
  /** 自定义环境变量源 */
  env?: Record<string, string>;
}

/** 环境变量匹配结果 */
interface EnvMatch {
  full: string;
  varName: string;
  defaultValue?: string;
}

// ============ 常量 ============

const ENV_REGEX = /\$\{([^}:]+)(?::-([^}]*))?\}/g;

const TYPE_NAMES: Record<SchemaType, string> = {
  string: '字符串',
  number: '数字',
  boolean: '布尔值',
  object: '对象',
  array: '数组',
  null: '空值'
};

// ============ 工具函数 ============

/**
 * 解析环境变量占位符
 * @param text - 包含 ${VAR} 或 ${VAR:-default} 的文本
 * @returns 匹配结果数组
 */
function parseEnvPlaceholders(text: string): EnvMatch[] {
  const matches: EnvMatch[] = [];
  let match: RegExpExecArray | null;
  
  ENV_REGEX.lastIndex = 0;
  while ((match = ENV_REGEX.exec(text)) !== null) {
    matches.push({
      full: match[0],
      varName: match[1],
      defaultValue: match[2]
    });
  }
  
  return matches;
}

/**
 * 替换字符串中的环境变量
 * @param value - 要处理的值
 * @param env - 环境变量字典
 * @param prefix - 环境变量前缀
 * @returns 替换后的值
 */
function replaceEnvVars(value: any, env: Record<string, string>, prefix: string = ''): any {
  if (typeof value !== 'string') {
    return value;
  }
  
  const matches = parseEnvPlaceholders(value);
  if (matches.length === 0) {
    return value;
  }
  
  let result = value;
  for (const match of matches) {
    const envKey = prefix + match.varName;
    const envValue = env[envKey] ?? env[match.varName];
    const replacement = envValue ?? match.defaultValue ?? match.full;
    result = result.replace(match.full, replacement);
  }
  
  return result;
}

/**
 * 递归替换对象中的所有环境变量
 * @param obj - 要处理的对象
 * @param env - 环境变量字典
 * @param prefix - 环境变量前缀
 * @returns 处理后的对象
 */
function replaceEnvInObject(obj: any, env: Record<string, string>, prefix: string = ''): any {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (typeof obj === 'string') {
    return replaceEnvVars(obj, env, prefix);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => replaceEnvInObject(item, env, prefix));
  }
  
  if (typeof obj === 'object') {
    const result: any = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = replaceEnvInObject(value, env, prefix);
    }
    return result;
  }
  
  return obj;
}

/**
 * 获取值的类型
 * @param value - 要检查的值
 * @returns 类型名称
 */
function getType(value: any): SchemaType {
  if (value === null) {
    return 'null';
  }
  if (Array.isArray(value)) {
    return 'array';
  }
  return typeof value as SchemaType;
}

/**
 * 检查类型是否匹配
 * @param value - 要检查的值
 * @param schemaType - Schema 定义的类型
 * @returns 是否匹配
 */
function checkType(value: any, schemaType: SchemaType | SchemaType[]): boolean {
  const actualType = getType(value);
  
  if (Array.isArray(schemaType)) {
    return schemaType.includes(actualType);
  }
  
  // 特殊处理：integer 是 number 的子集
  if (schemaType === 'integer') {
    return actualType === 'number' && Number.isInteger(value);
  }
  
  return actualType === schemaType;
}

/**
 * 深度合并对象
 * @param target - 目标对象
 * @param source - 源对象
 * @returns 合并后的对象
 */
function deepMerge(target: any, source: any): any {
  if (source === null || source === undefined) {
    return target;
  }
  
  if (target === null || target === undefined) {
    return source;
  }
  
  if (typeof target !== 'object' || typeof source !== 'object') {
    return source;
  }
  
  const result = { ...target };
  
  for (const key of Object.keys(source)) {
    if (key in target) {
      if (typeof target[key] === 'object' && typeof source[key] === 'object') {
        result[key] = deepMerge(target[key], source[key]);
      } else {
        result[key] = source[key];
      }
    } else {
      result[key] = source[key];
    }
  }
  
  return result;
}

/**
 * 从 Schema 提取默认值
 * @param schema - Schema 定义
 * @returns 默认值对象
 */
function extractDefaults(schema: ConfigSchema): any {
  if (schema.default !== undefined) {
    return schema.default;
  }
  
  if (schema.type === 'object' && schema.properties) {
    const defaults: any = {};
    for (const [key, propSchema] of Object.entries(schema.properties)) {
      const defaultValue = extractDefaults(propSchema);
      if (defaultValue !== undefined) {
        defaults[key] = defaultValue;
      }
    }
    return Object.keys(defaults).length > 0 ? defaults : undefined;
  }
  
  if (schema.type === 'array' && schema.items) {
    const itemDefault = extractDefaults(schema.items);
    if (itemDefault !== undefined) {
      return [itemDefault];
    }
  }
  
  return undefined;
}

/**
 * 填充默认值
 * @param data - 原始数据
 * @param schema - Schema 定义
 * @returns 填充后的数据
 */
function fillDefaults(data: any, schema: ConfigSchema): any {
  if (data === null || data === undefined) {
    return extractDefaults(schema);
  }
  
  if (schema.type === 'object' && schema.properties) {
    const result = { ...data };
    
    for (const [key, propSchema] of Object.entries(schema.properties)) {
      if (!(key in result)) {
        const defaultValue = extractDefaults(propSchema);
        if (defaultValue !== undefined) {
          result[key] = defaultValue;
        }
      } else {
        result[key] = fillDefaults(result[key], propSchema);
      }
    }
    
    return result;
  }
  
  if (schema.type === 'array' && schema.items && Array.isArray(data)) {
    return data.map(item => fillDefaults(item, schema.items!));
  }
  
  return data;
}

// ============ 核心类 ============

/**
 * 配置验证器类
 */
export class ConfigValidator {
  private schema: ConfigSchema;
  private errors: ValidationError[];
  
  /**
   * 创建配置验证器
   * @param schema - 配置 Schema
   */
  constructor(schema: ConfigSchema) {
    this.schema = schema;
    this.errors = [];
  }
  
  /**
   * 验证配置
   * @param data - 要验证的配置数据
   * @param options - 验证选项
   * @returns 验证结果
   */
  validate(data: any, options: ValidateOptions = {}): ValidationResult {
    const {
      fillDefaults: shouldFillDefaults = false,
      replaceEnv: shouldReplaceEnv = false,
      envPrefix = '',
      strict = false,
      env = process.env as Record<string, string>
    } = options;
    
    this.errors = [];
    
    // 1. 填充默认值
    let processedData = data;
    if (shouldFillDefaults) {
      processedData = fillDefaults(data, this.schema);
    }
    
    // 2. 替换环境变量
    if (shouldReplaceEnv) {
      processedData = replaceEnvInObject(processedData, env, envPrefix);
    }
    
    // 3. 执行 Schema 验证
    this.validateSchema(processedData, this.schema, '$');
    
    // 4. 严格模式检查未知字段
    if (strict && typeof processedData === 'object' && processedData !== null) {
      this.checkUnknownFields(processedData, this.schema, '$');
    }
    
    return {
      valid: this.errors.length === 0,
      data: processedData,
      errors: this.errors
    };
  }
  
  /**
   * 验证单个值
   * @param value - 要验证的值
   * @param schema - Schema 定义
   * @param path - 当前路径
   */
  private validateSchema(value: any, schema: ConfigSchema, path: string): void {
    // 类型检查
    if (schema.type && !checkType(value, schema.type)) {
      this.addError({
        path,
        message: `类型错误：期望 ${this.formatType(schema.type)}，收到 ${getType(value)}`,
        code: 'TYPE_MISMATCH',
        actual: getType(value),
        expected: this.formatType(schema.type)
      });
      return;
    }
    
    // const 验证
    if (schema.const !== undefined && value !== schema.const) {
      this.addError({
        path,
        message: `值必须为 ${JSON.stringify(schema.const)}`,
        code: 'CONST_MISMATCH',
        actual: value,
        expected: schema.const
      });
    }
    
    // enum 验证
    if (schema.enum && !schema.enum.includes(value)) {
      this.addError({
        path,
        message: `值必须在枚举列表中：${schema.enum.join(', ')}`,
        code: 'ENUM_MISMATCH',
        actual: value,
        expected: schema.enum
      });
    }
    
    // 字符串验证
    if (typeof value === 'string') {
      if (schema.minLength !== undefined && value.length < schema.minLength) {
        this.addError({
          path,
          message: `字符串长度不能少于 ${schema.minLength} 个字符`,
          code: 'MIN_LENGTH',
          actual: value.length,
          expected: schema.minLength
        });
      }
      
      if (schema.maxLength !== undefined && value.length > schema.maxLength) {
        this.addError({
          path,
          message: `字符串长度不能超过 ${schema.maxLength} 个字符`,
          code: 'MAX_LENGTH',
          actual: value.length,
          expected: schema.maxLength
        });
      }
      
      if (schema.pattern) {
        const regex = new RegExp(schema.pattern);
        if (!regex.test(value)) {
          this.addError({
            path,
            message: `字符串不匹配模式：${schema.pattern}`,
            code: 'PATTERN_MISMATCH',
            actual: value,
            expected: schema.pattern
          });
        }
      }
      
      // format 验证
      if (schema.format) {
        this.validateFormat(value, schema.format, path);
      }
    }
    
    // 数字验证
    if (typeof value === 'number') {
      if (schema.minimum !== undefined && value < schema.minimum) {
        this.addError({
          path,
          message: `数值不能小于 ${schema.minimum}`,
          code: 'MINIMUM',
          actual: value,
          expected: schema.minimum
        });
      }
      
      if (schema.maximum !== undefined && value > schema.maximum) {
        this.addError({
          path,
          message: `数值不能大于 ${schema.maximum}`,
          code: 'MAXIMUM',
          actual: value,
          expected: schema.maximum
        });
      }
      
      if (schema.exclusiveMinimum !== undefined && value <= schema.exclusiveMinimum) {
        this.addError({
          path,
          message: `数值必须大于 ${schema.exclusiveMinimum}`,
          code: 'EXCLUSIVE_MINIMUM',
          actual: value,
          expected: schema.exclusiveMinimum
        });
      }
      
      if (schema.exclusiveMaximum !== undefined && value >= schema.exclusiveMaximum) {
        this.addError({
          path,
          message: `数值必须小于 ${schema.exclusiveMaximum}`,
          code: 'EXCLUSIVE_MAXIMUM',
          actual: value,
          expected: schema.exclusiveMaximum
        });
      }
    }
    
    // 数组验证
    if (Array.isArray(value)) {
      if (schema.items) {
        value.forEach((item, index) => {
          this.validateSchema(item, schema.items!, `${path}[${index}]`);
        });
      }
    }
    
    // 对象验证
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      // required 验证
      if (schema.required) {
        for (const requiredField of schema.required) {
          if (!(requiredField in value)) {
            this.addError({
              path: `${path}.${requiredField}`,
              message: `缺少必填字段`,
              code: 'REQUIRED',
              expected: requiredField
            });
          }
        }
      }
      
      // properties 验证
      if (schema.properties) {
        for (const [key, propSchema] of Object.entries(schema.properties)) {
          if (key in value) {
            this.validateSchema(value[key], propSchema, `${path}.${key}`);
          }
        }
      }
    }
  }
  
  /**
   * 验证字符串格式
   * @param value - 字符串值
   * @param format - 格式名称
   * @param path - 路径
   */
  private validateFormat(value: string, format: string, path: string): void {
    const formatPatterns: Record<string, RegExp> = {
      email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      uri: /^https?:\/\/.+/i,
      url: /^https?:\/\/.+/i,
      ipv4: /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/,
      ipv6: /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/,
      date: /^\d{4}-\d{2}-\d{2}$/,
      time: /^\d{2}:\d{2}:\d{2}$/,
      'date-time': /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/,
      uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      hostname: /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z]{2,})+$/
    };
    
    const pattern = formatPatterns[format];
    if (pattern && !pattern.test(value)) {
      this.addError({
        path,
        message: `格式错误：期望 ${format} 格式`,
        code: 'FORMAT_MISMATCH',
        actual: value,
        expected: format
      });
    }
  }
  
  /**
   * 检查未知字段 (严格模式)
   * @param value - 要检查的值
   * @param schema - Schema 定义
   * @param path - 当前路径
   */
  private checkUnknownFields(value: any, schema: ConfigSchema, path: string): void {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      return;
    }
    
    if (!schema.properties) {
      return;
    }
    
    const allowedFields = Object.keys(schema.properties);
    const additionalProps = schema.additionalProperties;
    
    for (const key of Object.keys(value)) {
      if (!allowedFields.includes(key)) {
        if (additionalProps === false) {
          this.addError({
            path: `${path}.${key}`,
            message: `不允许的字段`,
            code: 'UNKNOWN_FIELD',
            actual: key
          });
        } else if (typeof additionalProps === 'object') {
          // 如果有 additionalProperties schema，递归验证
          this.validateSchema(value[key], additionalProps, `${path}.${key}`);
        }
      } else {
        // 递归检查嵌套对象
        this.checkUnknownFields(value[key], schema.properties[key], `${path}.${key}`);
      }
    }
  }
  
  /**
   * 添加错误
   * @param error - 验证错误
   */
  private addError(error: ValidationError): void {
    this.errors.push(error);
  }
  
  /**
   * 格式化类型名称
   * @param type - 类型
   * @returns 格式化的类型名称
   */
  private formatType(type: SchemaType | SchemaType[]): string {
    if (Array.isArray(type)) {
      return type.map(t => TYPE_NAMES[t]).join(' 或 ');
    }
    return TYPE_NAMES[type] || type;
  }
  
  /**
   * 获取 Schema
   * @returns Schema 定义
   */
  getSchema(): ConfigSchema {
    return { ...this.schema };
  }
}

// ============ 快捷函数 ============

/**
 * 快速验证配置
 * @param data - 配置数据
 * @param schema - Schema 定义
 * @param options - 验证选项
 * @returns 验证结果
 */
export function validateConfig(
  data: any,
  schema: ConfigSchema,
  options: ValidateOptions = {}
): ValidationResult {
  const validator = new ConfigValidator(schema);
  return validator.validate(data, options);
}

/**
 * 从文件加载并验证配置
 * @param filePath - 配置文件路径
 * @param schema - Schema 定义
 * @param options - 验证选项
 * @returns 验证结果
 */
export function loadAndValidateConfig(
  filePath: string,
  schema: ConfigSchema,
  options: ValidateOptions = {}
): ValidationResult {
  try {
    const fs = require('fs');
    const path = require('path');
    
    const absolutePath = path.resolve(filePath);
    const content = fs.readFileSync(absolutePath, 'utf-8');
    const ext = path.extname(absolutePath).toLowerCase();
    
    let config: any;
    if (ext === '.json') {
      config = JSON.parse(content);
    } else if (ext === '.yaml' || ext === '.yml') {
      const yaml = require('js-yaml');
      config = yaml.load(content);
    } else {
      throw new Error(`不支持的配置文件格式：${ext}`);
    }
    
    return validateConfig(config, schema, options);
  } catch (error: any) {
    return {
      valid: false,
      data: null,
      errors: [{
        path: '$',
        message: `加载配置文件失败：${error.message}`,
        code: 'FILE_LOAD_ERROR'
      }]
    };
  }
}

/**
 * 创建环境变量替换器
 * @param env - 环境变量字典
 * @param prefix - 环境变量前缀
 * @returns 替换函数
 */
export function createEnvReplacer(
  env: Record<string, string> = process.env as Record<string, string>,
  prefix: string = ''
): (value: any) => any {
  return (value: any) => replaceEnvInObject(value, env, prefix);
}

/**
 * 创建默认值填充器
 * @param schema - Schema 定义
 * @returns 填充函数
 */
export function createDefaultFiller(schema: ConfigSchema): (value: any) => any {
  return (value: any) => fillDefaults(value, schema);
}

// ============ 导出 ============

export default ConfigValidator;
