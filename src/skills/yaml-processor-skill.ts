/**
 * YAML 处理技能 - YAML Processor Skill
 * 
 * 功能:
 * 1. YAML 解析为 JSON - 支持多种 YAML 特性 (锚点、合并、标签等)
 * 2. JSON 转 YAML - 可配置的缩进和格式
 * 3. 配置文件验证 - Schema 验证和结构检查
 * 
 * @author Axon
 * @version 1.0.0
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

// ============== 类型定义 ==============

/** YAML 解析配置 */
export interface YamlParseConfig {
  /** 文件编码 (默认 'utf-8') */
  encoding?: BufferEncoding;
  /** 是否解析 JSON 兼容内容 (默认 true) */
  json?: boolean;
  /** 是否合并序列 (默认 true) */
  merge?: boolean;
  /** 是否允许重复键 (默认 false) */
  allowDuplicateKeys?: boolean;
  /** 自定义 Schema */
  schema?: yaml.Schema;
  /** 是否跟踪引用 (默认 false) */
  trackReferences?: boolean;
}

/** YAML 生成配置 */
export interface YamlStringifyConfig {
  /** 缩进空格数 (默认 2) */
  indent?: number;
  /** 列表项缩进 (默认 2) */
  indentLevel?: number;
  /** 行宽 (默认 80, 0 = 不换行) */
  lineWidth?: number;
  /** 是否使用流式样式 (默认 false) */
  flowLevel?: number;
  /** 是否强制引号 (默认 false) */
  forceQuotes?: boolean;
  /** 日期格式 (默认 ISO) */
  dateFormat?: string;
  /** 是否排序键 (默认 false) */
  sortKeys?: boolean | ((a: string, b: string) => number);
  /** 缩进字符串 (默认 '  ') */
  quotingType?: "'" | '"';
  /** 是否跳过隐式 false (默认 false) */
  skipInvalid?: boolean;
  /** 是否替换不可替换的值 (默认 false) */
  replaceInvalid?: boolean;
}

/** 验证规则 */
export interface ValidationRule {
  /** 字段路径 (支持嵌套，如 'database.host') */
  path: string;
  /** 期望类型 */
  type: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'null';
  /** 是否必填 (默认 false) */
  required?: boolean;
  /** 最小值 (数字/字符串长度) */
  min?: number;
  /** 最大值 (数字/字符串长度) */
  max?: number;
  /** 枚举值 */
  enum?: any[];
  /** 正则匹配 (字符串) */
  pattern?: string;
  /** 自定义验证函数 */
  validate?: (value: any) => boolean;
  /** 错误消息 */
  message?: string;
}

/** 验证 Schema */
export interface ValidationSchema {
  /** Schema 名称 */
  name?: string;
  /** 验证规则列表 */
  rules: ValidationRule[];
  /** 是否允许额外字段 (默认 true) */
  allowUnknown?: boolean;
  /** 严格模式 (默认 false) */
  strict?: boolean;
}

/** 验证结果 */
export interface ValidationResult {
  /** 是否通过验证 */
  valid: boolean;
  /** 错误列表 */
  errors: ValidationError[];
  /** 警告列表 */
  warnings: ValidationWarning[];
  /** 验证的字段数 */
  validatedFields: number;
  /** 验证耗时 (毫秒) */
  duration: number;
}

/** 验证错误 */
export interface ValidationError {
  /** 字段路径 */
  path: string;
  /** 错误类型 */
  type: 'required' | 'type' | 'range' | 'pattern' | 'enum' | 'custom';
  /** 错误消息 */
  message: string;
  /** 实际值 */
  actual?: any;
  /** 期望值 */
  expected?: any;
}

/** 验证警告 */
export interface ValidationWarning {
  /** 字段路径 */
  path: string;
  /** 警告类型 */
  type: 'deprecated' | 'suggestion' | 'info';
  /** 警告消息 */
  message: string;
}

/** YAML 解析结果 */
export interface YamlParseResult {
  /** 解析的数据 */
  data: any;
  /** 解析的文档数 (支持多文档 YAML) */
  documentCount: number;
  /** 解析耗时 (毫秒) */
  duration: number;
  /** 错误信息 */
  errors: ParseError[];
}

/** 解析错误 */
export interface ParseError {
  /** 错误类型 */
  type: 'syntax' | 'type' | 'reference' | 'schema';
  /** 错误消息 */
  message: string;
  /** 行号 */
  line?: number;
  /** 列号 */
  column?: number;
  /** 标记信息 */
  mark?: yaml.Mark;
}

/** 处理统计 */
export interface ProcessingStats {
  /** 处理的文件数 */
  filesProcessed: number;
  /** 总解析时间 (毫秒) */
  totalParseTime: number;
  /** 总验证时间 (毫秒) */
  totalValidationTime: number;
  /** 缓存命中数 */
  cacheHits: number;
  /** 缓存未命中数 */
  cacheMisses: number;
}

// ============== 核心功能 ==============

/**
 * 解析 YAML 字符串为 JSON
 * 
 * @param content YAML 内容字符串
 * @param config 解析配置
 * @returns 解析结果
 */
export function parseYaml(content: string, config: YamlParseConfig = {}): YamlParseResult {
  const startTime = Date.now();
  const errors: ParseError[] = [];
  
  try {
    const options: yaml.LoadOptions = {
      json: config.json ?? true,
      schema: config.schema || yaml.DEFAULT_SCHEMA,
      onWarning: (warning: any) => {
        errors.push({
          type: 'schema',
          message: warning.message,
        });
      },
    };

    // 处理重复键
    if (!config.allowDuplicateKeys) {
      options.onWarning = (warning: any) => {
        errors.push({
          type: 'schema',
          message: warning.message,
        });
      };
    }

    const data = yaml.load(content, options);
    
    return {
      data: data || {},
      documentCount: 1,
      duration: Date.now() - startTime,
      errors,
    };
  } catch (error) {
    const yamlError = error as yaml.YAMLException;
    errors.push({
      type: yamlError.reason?.includes('syntax') ? 'syntax' : 'type',
      message: yamlError.message,
      line: yamlError.mark?.line,
      column: yamlError.mark?.column,
      mark: yamlError.mark,
    });

    return {
      data: null,
      documentCount: 0,
      duration: Date.now() - startTime,
      errors,
    };
  }
}

/**
 * 从文件解析 YAML
 * 
 * @param filePath 文件路径
 * @param config 解析配置
 * @returns 解析结果
 */
export function parseYamlFile(filePath: string, config: YamlParseConfig = {}): YamlParseResult {
  const absolutePath = path.resolve(filePath);
  
  if (!fs.existsSync(absolutePath)) {
    return {
      data: null,
      documentCount: 0,
      duration: 0,
      errors: [{
        type: 'syntax',
        message: `File not found: ${absolutePath}`,
      }],
    };
  }

  try {
    const content = fs.readFileSync(absolutePath, {
      encoding: config.encoding || 'utf-8',
    });
    
    return parseYaml(content, config);
  } catch (error) {
    const err = error as Error;
    return {
      data: null,
      documentCount: 0,
      duration: 0,
      errors: [{
        type: 'syntax',
        message: `Failed to read file: ${err.message}`,
      }],
    };
  }
}

/**
 * 将 JSON 转换为 YAML 字符串
 * 
 * @param data JSON 数据
 * @param config 生成配置
 * @returns YAML 字符串
 */
export function stringifyYaml(data: any, config: YamlStringifyConfig = {}): string {
  const options: yaml.DumpOptions = {
    indent: config.indent ?? 2,
    lineWidth: config.lineWidth ?? 80,
    flowLevel: config.flowLevel ?? -1,
    forceQuotes: config.forceQuotes ?? false,
    sortKeys: config.sortKeys ?? false,
    quotingType: config.quotingType ?? '"',
    skipInvalid: config.skipInvalid ?? false,
  };

  return yaml.dump(data, options);
}

/**
 * 将数据保存为 YAML 文件
 * 
 * @param filePath 文件路径
 * @param data 数据
 * @param config 生成配置
 * @returns 是否成功
 */
export function saveYamlFile(filePath: string, data: any, config: YamlStringifyConfig = {}): boolean {
  const absolutePath = path.resolve(filePath);
  const dir = path.dirname(absolutePath);

  try {
    // 确保目录存在
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const yamlContent = stringifyYaml(data, config);
    fs.writeFileSync(absolutePath, yamlContent, 'utf-8');
    return true;
  } catch (error) {
    console.error('Failed to save YAML file:', error);
    return false;
  }
}

/**
 * 验证 YAML 数据结构
 * 
 * @param data 待验证的数据
 * @param schema 验证 Schema
 * @returns 验证结果
 */
export function validateYaml(data: any, schema: ValidationSchema): ValidationResult {
  const startTime = Date.now();
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  let validatedFields = 0;

  const getNestedValue = (obj: any, path: string): any => {
    return path.split('.').reduce((acc, part) => {
      return acc && acc[part] !== undefined ? acc[part] : undefined;
    }, obj);
  };

  const getType = (value: any): string => {
    if (value === null) return 'null';
    if (Array.isArray(value)) return 'array';
    return typeof value;
  };

  for (const rule of schema.rules) {
    validatedFields++;
    const value = getNestedValue(data, rule.path);
    const actualType = getType(value);

    // 检查必填
    if (rule.required && (value === undefined || value === null)) {
      errors.push({
        path: rule.path,
        type: 'required',
        message: rule.message || `Field '${rule.path}' is required`,
        expected: 'present',
        actual: 'missing',
      });
      continue;
    }

    // 如果值不存在且非必填，跳过后续验证
    if (value === undefined || value === null) {
      continue;
    }

    // 检查类型
    if (rule.type && actualType !== rule.type) {
      errors.push({
        path: rule.path,
        type: 'type',
        message: rule.message || `Field '${rule.path}' must be of type ${rule.type}`,
        expected: rule.type,
        actual: actualType,
      });
      continue;
    }

    // 检查最小值
    if (rule.min !== undefined) {
      const checkValue = rule.type === 'string' ? (value as string).length : value;
      if (typeof checkValue === 'number' && checkValue < rule.min) {
        errors.push({
          path: rule.path,
          type: 'range',
          message: rule.message || `Field '${rule.path}' must be >= ${rule.min}`,
          expected: `>= ${rule.min}`,
          actual: checkValue,
        });
      }
    }

    // 检查最大值
    if (rule.max !== undefined) {
      const checkValue = rule.type === 'string' ? (value as string).length : value;
      if (typeof checkValue === 'number' && checkValue > rule.max) {
        errors.push({
          path: rule.path,
          type: 'range',
          message: rule.message || `Field '${rule.path}' must be <= ${rule.max}`,
          expected: `<= ${rule.max}`,
          actual: checkValue,
        });
      }
    }

    // 检查枚举
    if (rule.enum && !rule.enum.includes(value)) {
      errors.push({
        path: rule.path,
        type: 'enum',
        message: rule.message || `Field '${rule.path}' must be one of: ${rule.enum.join(', ')}`,
        expected: rule.enum,
        actual: value,
      });
    }

    // 检查正则
    if (rule.pattern && rule.type === 'string') {
      const regex = new RegExp(rule.pattern);
      if (!regex.test(value as string)) {
        errors.push({
          path: rule.path,
          type: 'pattern',
          message: rule.message || `Field '${rule.path}' does not match pattern ${rule.pattern}`,
          expected: rule.pattern,
          actual: value,
        });
      }
    }

    // 自定义验证
    if (rule.validate && !rule.validate(value)) {
      errors.push({
        path: rule.path,
        type: 'custom',
        message: rule.message || `Field '${rule.path}' failed custom validation`,
        actual: value,
      });
    }
  }

  // 严格模式：检查未知字段
  if (schema.strict && !schema.allowUnknown) {
    const checkUnknownFields = (obj: any, prefix: string = '') => {
      if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
        for (const key of Object.keys(obj)) {
          const fullPath = prefix ? `${prefix}.${key}` : key;
          const hasRule = schema.rules.some(r => r.path === fullPath || r.path.startsWith(`${fullPath}.`));
          
          if (!hasRule) {
            warnings.push({
              path: fullPath,
              type: 'info',
              message: `Unknown field '${fullPath}'`,
            });
          }
          
          checkUnknownFields(obj[key], fullPath);
        }
      }
    };
    
    checkUnknownFields(data);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    validatedFields,
    duration: Date.now() - startTime,
  };
}

/**
 * 验证 YAML 文件
 * 
 * @param filePath 文件路径
 * @param schema 验证 Schema
 * @param parseConfig 解析配置
 * @returns 验证结果
 */
export function validateYamlFile(
  filePath: string,
  schema: ValidationSchema,
  parseConfig: YamlParseConfig = {}
): ValidationResult {
  const parseResult = parseYamlFile(filePath, parseConfig);
  
  if (parseResult.errors.length > 0 || parseResult.data === null) {
    return {
      valid: false,
      errors: parseResult.errors.map(e => ({
        path: '',
        type: 'type' as const,
        message: e.message,
      })),
      warnings: [],
      validatedFields: 0,
      duration: parseResult.duration,
    };
  }

  return validateYaml(parseResult.data, schema);
}

/**
 * 比较两个 YAML 配置
 * 
 * @param config1 配置 1
 * @param config2 配置 2
 * @returns 差异报告
 */
export function compareYamlConfigs(config1: any, config2: any): {
  added: string[];
  removed: string[];
  modified: string[];
  unchanged: string[];
} {
  const added: string[] = [];
  const removed: string[] = [];
  const modified: string[] = [];
  const unchanged: string[] = [];

  const flatten = (obj: any, prefix: string = ''): Record<string, any> => {
    const result: Record<string, any> = {};
    
    if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
      for (const key of Object.keys(obj)) {
        const newKey = prefix ? `${prefix}.${key}` : key;
        if (obj[key] && typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
          Object.assign(result, flatten(obj[key], newKey));
        } else {
          result[newKey] = obj[key];
        }
      }
    }
    
    return result;
  };

  const flat1 = flatten(config1);
  const flat2 = flatten(config2);

  const allKeys = new Set([...Object.keys(flat1), ...Object.keys(flat2)]);

  for (const key of allKeys) {
    const in1 = key in flat1;
    const in2 = key in flat2;

    if (in1 && !in2) {
      removed.push(key);
    } else if (!in1 && in2) {
      added.push(key);
    } else if (JSON.stringify(flat1[key]) !== JSON.stringify(flat2[key])) {
      modified.push(key);
    } else {
      unchanged.push(key);
    }
  }

  return { added, removed, modified, unchanged };
}

/**
 * 合并多个 YAML 配置
 * 
 * @param configs 配置数组 (后面的覆盖前面的)
 * @returns 合并后的配置
 */
export function mergeYamlConfigs(...configs: any[]): any {
  const merge = (target: any, source: any): any => {
    if (!source) return target;
    if (!target) return source;

    const result = { ...target };

    for (const key of Object.keys(source)) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = merge(result[key], source[key]);
      } else {
        result[key] = source[key];
      }
    }

    return result;
  };

  return configs.reduce((acc, config) => merge(acc, config), {});
}

// ============== 预定义 Schema ==============

/** 通用配置文件 Schema */
export const COMMON_CONFIG_SCHEMA: ValidationSchema = {
  name: 'Common Config',
  rules: [
    {
      path: 'name',
      type: 'string',
      required: true,
      min: 1,
      max: 100,
    },
    {
      path: 'version',
      type: 'string',
      required: true,
      pattern: '^\\d+\\.\\d+\\.\\d+$',
      message: 'Version must be in semver format (e.g., 1.0.0)',
    },
    {
      path: 'enabled',
      type: 'boolean',
      required: false,
    },
  ],
  allowUnknown: true,
};

/** 数据库配置 Schema */
export const DATABASE_CONFIG_SCHEMA: ValidationSchema = {
  name: 'Database Config',
  rules: [
    {
      path: 'database.host',
      type: 'string',
      required: true,
      pattern: '^[a-zA-Z0-9.-]+$',
    },
    {
      path: 'database.port',
      type: 'number',
      required: true,
      min: 1,
      max: 65535,
    },
    {
      path: 'database.username',
      type: 'string',
      required: true,
      min: 1,
    },
    {
      path: 'database.password',
      type: 'string',
      required: true,
      min: 8,
    },
    {
      path: 'database.name',
      type: 'string',
      required: true,
    },
    {
      path: 'database.poolSize',
      type: 'number',
      required: false,
      min: 1,
      max: 100,
    },
  ],
  allowUnknown: true,
};

/** API 配置 Schema */
export const API_CONFIG_SCHEMA: ValidationSchema = {
  name: 'API Config',
  rules: [
    {
      path: 'api.baseUrl',
      type: 'string',
      required: true,
      pattern: '^https?://',
    },
    {
      path: 'api.timeout',
      type: 'number',
      required: false,
      min: 1000,
      max: 300000,
    },
    {
      path: 'api.retries',
      type: 'number',
      required: false,
      min: 0,
      max: 10,
    },
    {
      path: 'api.rateLimit',
      type: 'number',
      required: false,
      min: 1,
    },
  ],
  allowUnknown: true,
};

// ============== 工具函数 ==============

/**
 * 获取 YAML 文件的统计信息
 */
export function getYamlStats(filePath: string): {
  fileSize: number;
  lineCount: number;
  keyCount: number;
  depth: number;
} {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  
  let keyCount = 0;
  let maxDepth = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      keyCount++;
      const depth = line.search(/\S|$/);
      maxDepth = Math.max(maxDepth, depth);
    }
  }

  return {
    fileSize: fs.statSync(filePath).size,
    lineCount: lines.length,
    keyCount,
    depth: maxDepth / 2, // 假设 2 空格缩进
  };
}

/**
 * 格式化 YAML (重新格式化现有 YAML 文件)
 */
export function formatYamlFile(filePath: string, config: YamlStringifyConfig = {}): boolean {
  try {
    const parseResult = parseYamlFile(filePath);
    
    if (parseResult.errors.length > 0 || parseResult.data === null) {
      return false;
    }

    return saveYamlFile(filePath, parseResult.data, config);
  } catch (error) {
    console.error('Failed to format YAML file:', error);
    return false;
  }
}

// ============== 导出 ==============

export default {
  parseYaml,
  parseYamlFile,
  stringifyYaml,
  saveYamlFile,
  validateYaml,
  validateYamlFile,
  compareYamlConfigs,
  mergeYamlConfigs,
  formatYamlFile,
  getYamlStats,
  // 预定义 Schema
  COMMON_CONFIG_SCHEMA,
  DATABASE_CONFIG_SCHEMA,
  API_CONFIG_SCHEMA,
};
