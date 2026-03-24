/**
 * JSON Schema 验证工具 - Schema Utils Skill
 * 
 * 功能:
 * 1. Schema 定义与解析
 * 2. 数据验证
 * 3. 错误报告与定位
 * 
 * 使用示例:
 * ```typescript
 * import { SchemaValidator, ValidationError, SchemaType } from './schema-utils-skill';
 * 
 * // 定义 Schema
 * const userSchema = {
 *   type: 'object',
 *   required: ['name', 'email'],
 *   properties: {
 *     name: { type: 'string', minLength: 1, maxLength: 50 },
 *     email: { type: 'string', format: 'email' },
 *     age: { type: 'number', minimum: 0, maximum: 150 },
 *     tags: { type: 'array', items: { type: 'string' } },
 *     address: {
 *       type: 'object',
 *       properties: {
 *         city: { type: 'string' },
 *         zip: { type: 'string', pattern: '^\\d{5,6}$' }
 *       }
 *     }
 *   }
 * };
 * 
 * // 创建验证器
 * const validator = new SchemaValidator(userSchema);
 * 
 * // 验证数据
 * const userData = {
 *   name: 'John',
 *   email: 'john@example.com',
 *   age: 25,
 *   tags: ['developer', 'admin']
 * };
 * 
 * const result = validator.validate(userData);
 * console.log(result.valid); // true
 * console.log(result.errors); // []
 * 
 * // 错误处理
 * const invalidData = { name: '', email: 'invalid' };
 * const invalidResult = validator.validate(invalidData);
 * console.log(invalidResult.valid); // false
 * console.log(invalidResult.errors);
 * // [
 * //   {
 * //     path: '$.name',
 * //     message: 'String length must be at least 1',
 * //     code: 'MIN_LENGTH',
 * //     value: ''
 * //   },
 * //   {
 * //     path: '$.email',
 * //     message: 'Invalid email format',
 * //     code: 'FORMAT_MISMATCH',
 * //     value: 'invalid'
 * //   }
 * // ]
 * 
 * // 自定义错误消息
 * const validatorWithMessages = new SchemaValidator(userSchema, {
 *   messages: {
 *     REQUIRED: '字段 {field} 是必填的',
 *     TYPE_MISMATCH: '字段 {field} 类型错误，期望 {expected}，收到 {actual}'
 *   }
 * });
 * ```
 * 
 * @version 1.0.0
 * @author AxonClaw
 */

// ============ 类型定义 ============

/** JSON Schema 类型 */
type SchemaType = 'string' | 'number' | 'integer' | 'boolean' | 'object' | 'array' | 'null';

/** JSON Schema 定义 */
interface SchemaDefinition {
  type?: SchemaType | SchemaType[];
  required?: string[];
  properties?: Record<string, SchemaDefinition>;
  items?: SchemaDefinition | SchemaDefinition[];
  additionalProperties?: boolean | SchemaDefinition;
  pattern?: string;
  format?: string;
  minLength?: number;
  maxLength?: number;
  minimum?: number;
  maximum?: number;
  exclusiveMinimum?: number;
  exclusiveMaximum?: number;
  enum?: unknown[];
  const?: unknown;
  default?: unknown;
  description?: string;
  title?: string;
  examples?: unknown[];
  oneOf?: SchemaDefinition[];
  anyOf?: SchemaDefinition[];
  allOf?: SchemaDefinition[];
  not?: SchemaDefinition;
  if?: SchemaDefinition;
  then?: SchemaDefinition;
  else?: SchemaDefinition;
}

/** 验证错误 */
interface ValidationError {
  /** 错误路径 (JSON Pointer 格式) */
  path: string;
  /** 错误消息 */
  message: string;
  /** 错误代码 */
  code: string;
  /** 实际值 */
  value?: unknown;
  /** 期望值/类型 */
  expected?: unknown;
  /** 子错误 (用于嵌套对象/数组) */
  errors?: ValidationError[];
}

/** 验证结果 */
interface ValidationResult {
  /** 是否通过验证 */
  valid: boolean;
  /** 错误列表 */
  errors: ValidationError[];
  /** 验证通过时的数据 (可能包含默认值填充) */
  data?: unknown;
  /** 验证元信息 */
  meta?: {
    schemaVersion?: string;
    validatedAt?: string;
    duration?: number;
  };
}

/** 验证器配置 */
interface ValidatorConfig {
  /** 自定义错误消息模板 */
  messages?: Record<string, string>;
  /** 是否允许额外属性 */
  allowAdditionalProperties?: boolean;
  /** 是否填充默认值 */
  fillDefaults?: boolean;
  /** 是否严格模式 (禁用类型转换) */
  strict?: boolean;
  /** 最大嵌套深度 */
  maxDepth?: number;
  /** 自定义格式验证器 */
  customFormats?: Record<string, (value: string) => boolean>;
  /** 语言环境 */
  locale?: 'zh' | 'en';
}

/** 错误消息模板 */
const DEFAULT_MESSAGES: Record<string, string> = {
  REQUIRED: '字段 {field} 是必填的',
  TYPE_MISMATCH: '字段 {field} 类型错误，期望 {expected}，收到 {actual}',
  MIN_LENGTH: '字符串长度必须至少为 {min}，当前为 {actual}',
  MAX_LENGTH: '字符串长度不能超过 {max}，当前为 {actual}',
  MINIMUM: '值必须大于等于 {min}，当前为 {actual}',
  MAXIMUM: '值必须小于等于 {max}，当前为 {actual}',
  EXCLUSIVE_MINIMUM: '值必须大于 {min}，当前为 {actual}',
  EXCLUSIVE_MAXIMUM: '值必须小于 {max}，当前为 {actual}',
  PATTERN_MISMATCH: '值不符合模式 {pattern}',
  FORMAT_MISMATCH: '值不符合格式 {format}',
  ENUM_MISMATCH: '值必须是以下之一：{enum}',
  CONST_MISMATCH: '值必须等于 {const}',
  MIN_ITEMS: '数组长度必须至少为 {min}，当前为 {actual}',
  MAX_ITEMS: '数组长度不能超过 {max}，当前为 {actual}',
  UNIQUE_ITEMS: '数组项必须唯一',
  ADDITIONAL_PROPERTIES: '不允许额外属性 {property}',
  ONE_OF: '值必须恰好匹配一个 schema',
  ANY_OF: '值必须匹配至少一个 schema',
  ALL_OF: '值必须匹配所有 schema',
  NOT: '值不能匹配 schema',
  IF_THEN_ELSE: '条件验证失败',
  CIRCULAR_REF: '检测到循环引用',
  MAX_DEPTH: '嵌套深度超过限制 {max}'
};

/** 中文错误消息 */
const ZH_MESSAGES: Record<string, string> = {
  REQUIRED: '字段 {field} 是必填的',
  TYPE_MISMATCH: '字段 {field} 类型错误，期望 {expected}，收到 {actual}',
  MIN_LENGTH: '字符串长度必须至少为 {min}，当前为 {actual}',
  MAX_LENGTH: '字符串长度不能超过 {max}，当前为 {actual}',
  MINIMUM: '值必须大于等于 {min}，当前为 {actual}',
  MAXIMUM: '值必须小于等于 {max}，当前为 {actual}',
  EXCLUSIVE_MINIMUM: '值必须大于 {min}，当前为 {actual}',
  EXCLUSIVE_MAXIMUM: '值必须小于 {max}，当前为 {actual}',
  PATTERN_MISMATCH: '值不符合模式 {pattern}',
  FORMAT_MISMATCH: '值不符合格式 {format}',
  ENUM_MISMATCH: '值必须是以下之一：{enum}',
  CONST_MISMATCH: '值必须等于 {const}',
  MIN_ITEMS: '数组长度必须至少为 {min}，当前为 {actual}',
  MAX_ITEMS: '数组长度不能超过 {max}，当前为 {actual}',
  UNIQUE_ITEMS: '数组项必须唯一',
  ADDITIONAL_PROPERTIES: '不允许额外属性 {property}',
  ONE_OF: '值必须恰好匹配一个 schema',
  ANY_OF: '值必须匹配至少一个 schema',
  ALL_OF: '值必须匹配所有 schema',
  NOT: '值不能匹配 schema',
  IF_THEN_ELSE: '条件验证失败',
  CIRCULAR_REF: '检测到循环引用',
  MAX_DEPTH: '嵌套深度超过限制 {max}'
};

/** 英文错误消息 */
const EN_MESSAGES: Record<string, string> = {
  REQUIRED: 'Field {field} is required',
  TYPE_MISMATCH: 'Field {field} type mismatch, expected {expected}, got {actual}',
  MIN_LENGTH: 'String length must be at least {min}, got {actual}',
  MAX_LENGTH: 'String length must not exceed {max}, got {actual}',
  MINIMUM: 'Value must be >= {min}, got {actual}',
  MAXIMUM: 'Value must be <= {max}, got {actual}',
  EXCLUSIVE_MINIMUM: 'Value must be > {min}, got {actual}',
  EXCLUSIVE_MAXIMUM: 'Value must be < {max}, got {actual}',
  PATTERN_MISMATCH: 'Value does not match pattern {pattern}',
  FORMAT_MISMATCH: 'Value does not match format {format}',
  ENUM_MISMATCH: 'Value must be one of: {enum}',
  CONST_MISMATCH: 'Value must equal {const}',
  MIN_ITEMS: 'Array length must be at least {min}, got {actual}',
  MAX_ITEMS: 'Array length must not exceed {max}, got {actual}',
  UNIQUE_ITEMS: 'Array items must be unique',
  ADDITIONAL_PROPERTIES: 'Additional property {property} is not allowed',
  ONE_OF: 'Value must match exactly one schema',
  ANY_OF: 'Value must match at least one schema',
  ALL_OF: 'Value must match all schemas',
  NOT: 'Value must not match schema',
  IF_THEN_ELSE: 'Conditional validation failed',
  CIRCULAR_REF: 'Circular reference detected',
  MAX_DEPTH: 'Nesting depth exceeds limit {max}'
};

// ============ 格式验证器 ============

/** 内置格式验证器 */
const FORMAT_VALIDATORS: Record<string, (value: string) => boolean> = {
  email: (value) => /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(value),
  
  uri: (value) => /^https?:\/\/[\w\-._~:/?#\[\]@!$&'()*+,;=%]+$/.test(value),
  
  url: (value) => /^https?:\/\/[\w\-._~:/?#\[\]@!$&'()*+,;=%]+$/.test(value),
  
  'uri-reference': (value) => /^([a-z][a-z0-9+\-.]*:)?\/?\/?[^#\s]*$/i.test(value),
  
  ipv4: (value) => /^(\d{1,3}\.){3}\d{1,3}$/.test(value) && 
    value.split('.').every(octet => {
      const num = parseInt(octet, 10);
      return num >= 0 && num <= 255;
    }),
  
  ipv6: (value) => /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::1$|^::$/.test(value),
  
  hostname: (value) => /^([a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/.test(value),
  
  uuid: (value) => /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(value),
  
  'date-time': (value) => !isNaN(Date.parse(value)) && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value),
  
  date: (value) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !isNaN(Date.parse(value)),
  
  time: (value) => /^\d{2}:\d{2}:\d{2}(.\d+)?(Z|[+-]\d{2}:\d{2})?$/.test(value),
  
  duration: (value) => /^P(?!$)(\d+Y)?(\d+M)?(\d+D)?(T(?=\d)(\d+H)?(\d+M)?(\d+S)?)?$/.test(value),
  
  'json-pointer': (value) => /^((\/([^~\/]|~[01])*)*)$/.test(value),
  
  'relative-json-pointer': (value) => /^(0|[1-9]\d*)(#|((\/([^~\/]|~[01])*)*))$/.test(value),
  
  regex: (value) => {
    try {
      new RegExp(value);
      return true;
    } catch {
      return false;
    }
  },
  
  base64: (value) => /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value),
  
  byte: (value) => /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value),
  
  binary: (value) => /^[\\x00-\\xFF]+$/.test(value),
  
  phone: (value) => /^\+?[1-9]\d{6,14}$/.test(value),
  
  'phone-cn': (value) => /^1[3-9]\d{9}$/.test(value),
  
  'id-card-cn': (value) => /^[1-9]\d{5}(18|19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\d{3}[\dXx]$/.test(value),
  
  creditcard: (value) => /^\d{13,19}$/.test(value)
};

// ============ 工具函数 ============

/**
 * 获取值的类型
 */
function getType(value: unknown): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value;
}

/**
 * 将 JSON Pointer 路径转换为可读格式
 */
function formatPath(path: string): string {
  if (path === '$') return 'root';
  return path.replace(/^\$\./, '').replace(/\[(\d+)\]/g, '[$1]');
}

/**
 * 替换消息模板中的变量
 */
function interpolateMessage(template: string, vars: Record<string, unknown>): string {
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    const value = vars[key];
    if (value === undefined) return match;
    if (Array.isArray(value)) return value.join(', ');
    return String(value);
  });
}

/**
 * 深度比较两个值是否相等
 */
function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (a === null || b === null) return false;
  if (typeof a !== 'object') return false;
  
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  
  if (Array.isArray(a)) {
    if (a.length !== b.length) return false;
    return a.every((item, i) => deepEqual(item, (b as unknown[])[i]));
  }
  
  const keysA = Object.keys(a as object);
  const keysB = Object.keys(b as object);
  if (keysA.length !== keysB.length) return false;
  
  return keysA.every(key => 
    Object.prototype.hasOwnProperty.call(b, key) && 
    deepEqual((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key])
  );
}

/**
 * 检查值是否为整数
 */
function isInteger(value: unknown): boolean {
  return typeof value === 'number' && Number.isInteger(value);
}

// ============ SchemaValidator 类 ============

export class SchemaValidator {
  private schema: SchemaDefinition;
  private config: Required<ValidatorConfig>;
  private compiledPatternCache: Map<string, RegExp>;
  
  /**
   * 创建 Schema 验证器
   * @param schema JSON Schema 定义
   * @param config 验证器配置
   */
  constructor(schema: SchemaDefinition, config: ValidatorConfig = {}) {
    this.schema = schema;
    this.config = {
      messages: config.messages || {},
      allowAdditionalProperties: config.allowAdditionalProperties ?? true,
      fillDefaults: config.fillDefaults ?? false,
      strict: config.strict ?? false,
      maxDepth: config.maxDepth ?? 50,
      customFormats: config.customFormats || {},
      locale: config.locale || 'zh'
    };
    this.compiledPatternCache = new Map();
    
    // 合并消息模板
    const baseMessages = this.config.locale === 'zh' ? ZH_MESSAGES : EN_MESSAGES;
    this.config.messages = { ...baseMessages, ...this.config.messages };
  }
  
  /**
   * 验证数据
   * @param data 待验证的数据
   * @returns 验证结果
   */
  validate(data: unknown): ValidationResult {
    const startTime = Date.now();
    const errors: ValidationError[] = [];
    
    try {
      const validatedData = this.validateValue(data, this.schema, '$', errors);
      
      return {
        valid: errors.length === 0,
        errors,
        data: validatedData,
        meta: {
          schemaVersion: 'draft-07',
          validatedAt: new Date().toISOString(),
          duration: Date.now() - startTime
        }
      };
    } catch (error) {
      return {
        valid: false,
        errors: [{
          path: '$',
          message: error instanceof Error ? error.message : 'Unknown validation error',
          code: 'VALIDATION_ERROR'
        }],
        meta: {
          schemaVersion: 'draft-07',
          validatedAt: new Date().toISOString(),
          duration: Date.now() - startTime
        }
      };
    }
  }
  
  /**
   * 验证单个值
   */
  private validateValue(
    value: unknown,
    schema: SchemaDefinition,
    path: string,
    errors: ValidationError[],
    depth = 0
  ): unknown {
    if (depth > this.config.maxDepth) {
      errors.push({
        path,
        message: this.getMessage('MAX_DEPTH', { max: this.config.maxDepth }),
        code: 'MAX_DEPTH'
      });
      return value;
    }
    
    let validatedValue = value;
    
    // 类型检查
    if (schema.type) {
      const types = Array.isArray(schema.type) ? schema.type : [schema.type];
      const actualType = getType(value);
      
      const typeMatch = types.some(type => {
        if (type === 'integer') return isInteger(value);
        if (type === 'array') return Array.isArray(value);
        if (type === 'null') return value === null;
        return actualType === type;
      });
      
      if (!typeMatch && !this.config.strict) {
        // 非严格模式下尝试类型转换
        validatedValue = this.coerceType(value, types[0]);
      } else if (!typeMatch) {
        errors.push({
          path,
          message: this.getMessage('TYPE_MISMATCH', {
            field: formatPath(path),
            expected: types.join(' | '),
            actual: actualType
          }),
          code: 'TYPE_MISMATCH',
          value,
          expected: types
        });
        return value;
      }
    }
    
    // const 验证
    if (schema.const !== undefined) {
      if (!deepEqual(value, schema.const)) {
        errors.push({
          path,
          message: this.getMessage('CONST_MISMATCH', { const: JSON.stringify(schema.const) }),
          code: 'CONST_MISMATCH',
          value,
          expected: schema.const
        });
      }
    }
    
    // enum 验证
    if (schema.enum) {
      if (!schema.enum.some(e => deepEqual(value, e))) {
        errors.push({
          path,
          message: this.getMessage('ENUM_MISMATCH', { enum: schema.enum.map(e => JSON.stringify(e)).join(' | ') }),
          code: 'ENUM_MISMATCH',
          value,
          expected: schema.enum
        });
      }
    }
    
    // 根据类型进行特定验证
    const valueType = getType(validatedValue);
    
    if (valueType === 'string') {
      validatedValue = this.validateString(validatedValue as string, schema, path, errors);
    } else if (valueType === 'number' || valueType === 'integer') {
      validatedValue = this.validateNumber(validatedValue as number, schema, path, errors);
    } else if (valueType === 'array') {
      validatedValue = this.validateArray(validatedValue as unknown[], schema, path, errors, depth);
    } else if (valueType === 'object') {
      validatedValue = this.validateObject(validatedValue as Record<string, unknown>, schema, path, errors, depth);
    }
    
    // 组合 schema 验证
    if (schema.oneOf) {
      this.validateOneOf(value, schema.oneOf, path, errors, depth);
    }
    
    if (schema.anyOf) {
      this.validateAnyOf(value, schema.anyOf, path, errors, depth);
    }
    
    if (schema.allOf) {
      this.validateAllOf(value, schema.allOf, path, errors, depth);
    }
    
    if (schema.not) {
      this.validateNot(value, schema.not, path, errors, depth);
    }
    
    if (schema.if) {
      this.validateIfThenElse(value, schema, path, errors, depth);
    }
    
    return validatedValue;
  }
  
  /**
   * 字符串验证
   */
  private validateString(
    value: string,
    schema: SchemaDefinition,
    path: string,
    errors: ValidationError[]
  ): string {
    // minLength
    if (schema.minLength !== undefined && value.length < schema.minLength) {
      errors.push({
        path,
        message: this.getMessage('MIN_LENGTH', { min: schema.minLength, actual: value.length }),
        code: 'MIN_LENGTH',
        value,
        expected: `>= ${schema.minLength}`
      });
    }
    
    // maxLength
    if (schema.maxLength !== undefined && value.length > schema.maxLength) {
      errors.push({
        path,
        message: this.getMessage('MAX_LENGTH', { max: schema.maxLength, actual: value.length }),
        code: 'MAX_LENGTH',
        value,
        expected: `<= ${schema.maxLength}`
      });
    }
    
    // pattern
    if (schema.pattern) {
      let regex = this.compiledPatternCache.get(schema.pattern);
      if (!regex) {
        try {
          regex = new RegExp(schema.pattern);
          this.compiledPatternCache.set(schema.pattern, regex);
        } catch {
          errors.push({
            path,
            message: `Invalid pattern: ${schema.pattern}`,
            code: 'INVALID_PATTERN'
          });
        }
      }
      if (regex && !regex.test(value)) {
        errors.push({
          path,
          message: this.getMessage('PATTERN_MISMATCH', { pattern: schema.pattern }),
          code: 'PATTERN_MISMATCH',
          value
        });
      }
    }
    
    // format
    if (schema.format) {
      const formatValidator = 
        this.config.customFormats[schema.format] || 
        FORMAT_VALIDATORS[schema.format];
      
      if (formatValidator && !formatValidator(value)) {
        errors.push({
          path,
          message: this.getMessage('FORMAT_MISMATCH', { format: schema.format }),
          code: 'FORMAT_MISMATCH',
          value
        });
      }
    }
    
    return value;
  }
  
  /**
   * 数字验证
   */
  private validateNumber(
    value: number,
    schema: SchemaDefinition,
    path: string,
    errors: ValidationError[]
  ): number {
    // minimum
    if (schema.minimum !== undefined && value < schema.minimum) {
      errors.push({
        path,
        message: this.getMessage('MINIMUM', { min: schema.minimum, actual: value }),
        code: 'MINIMUM',
        value,
        expected: `>= ${schema.minimum}`
      });
    }
    
    // maximum
    if (schema.maximum !== undefined && value > schema.maximum) {
      errors.push({
        path,
        message: this.getMessage('MAXIMUM', { max: schema.maximum, actual: value }),
        code: 'MAXIMUM',
        value,
        expected: `<= ${schema.maximum}`
      });
    }
    
    // exclusiveMinimum
    if (schema.exclusiveMinimum !== undefined && value <= schema.exclusiveMinimum) {
      errors.push({
        path,
        message: this.getMessage('EXCLUSIVE_MINIMUM', { min: schema.exclusiveMinimum, actual: value }),
        code: 'EXCLUSIVE_MINIMUM',
        value,
        expected: `> ${schema.exclusiveMinimum}`
      });
    }
    
    // exclusiveMaximum
    if (schema.exclusiveMaximum !== undefined && value >= schema.exclusiveMaximum) {
      errors.push({
        path,
        message: this.getMessage('EXCLUSIVE_MAXIMUM', { max: schema.exclusiveMaximum, actual: value }),
        code: 'EXCLUSIVE_MAXIMUM',
        value,
        expected: `< ${schema.exclusiveMaximum}`
      });
    }
    
    return value;
  }
  
  /**
   * 数组验证
   */
  private validateArray(
    value: unknown[],
    schema: SchemaDefinition,
    path: string,
    errors: ValidationError[],
    depth: number
  ): unknown[] {
    const validatedArray: unknown[] = [];
    
    // items 验证
    if (schema.items) {
      const itemsSchema = Array.isArray(schema.items) ? schema.items : [schema.items];
      
      value.forEach((item, index) => {
        const itemPath = `${path}[${index}]`;
        const itemSchema = itemsSchema[Math.min(index, itemsSchema.length - 1)];
        const validatedItem = this.validateValue(item, itemSchema, itemPath, errors, depth + 1);
        validatedArray.push(validatedItem);
      });
    } else {
      validatedArray.push(...value);
    }
    
    return validatedArray;
  }
  
  /**
   * 对象验证
   */
  private validateObject(
    value: Record<string, unknown>,
    schema: SchemaDefinition,
    path: string,
    errors: ValidationError[],
    depth: number
  ): Record<string, unknown> {
    const validatedObject: Record<string, unknown> = {};
    
    // required 验证
    if (schema.required) {
      schema.required.forEach(field => {
        if (!(field in value)) {
          errors.push({
            path: `${path}.${field}`,
            message: this.getMessage('REQUIRED', { field }),
            code: 'REQUIRED'
          });
        }
      });
    }
    
    // properties 验证
    if (schema.properties) {
      Object.entries(schema.properties).forEach(([key, propSchema]) => {
        if (key in value) {
          validatedObject[key] = this.validateValue(
            value[key],
            propSchema,
            `${path}.${key}`,
            errors,
            depth + 1
          );
        } else if (propSchema.default !== undefined && this.config.fillDefaults) {
          validatedObject[key] = propSchema.default;
        }
      });
    }
    
    // additionalProperties 验证
    if (!this.config.allowAdditionalProperties && schema.additionalProperties === false) {
      const allowedKeys = schema.properties ? Object.keys(schema.properties) : [];
      Object.keys(value).forEach(key => {
        if (!allowedKeys.includes(key)) {
          errors.push({
            path: `${path}.${key}`,
            message: this.getMessage('ADDITIONAL_PROPERTIES', { property: key }),
            code: 'ADDITIONAL_PROPERTIES',
            value: value[key]
          });
        }
      });
    } else if (schema.additionalProperties && typeof schema.additionalProperties === 'object') {
      const allowedKeys = schema.properties ? Object.keys(schema.properties) : [];
      Object.keys(value).forEach(key => {
        if (!allowedKeys.includes(key)) {
          validatedObject[key] = this.validateValue(
            value[key],
            schema.additionalProperties as SchemaDefinition,
            `${path}.${key}`,
            errors,
            depth + 1
          );
        }
      });
    }
    
    // 复制已验证的属性
    Object.assign(validatedObject, value);
    
    return validatedObject;
  }
  
  /**
   * oneOf 验证
   */
  private validateOneOf(
    value: unknown,
    schemas: SchemaDefinition[],
    path: string,
    errors: ValidationError[],
    depth: number
  ): void {
    const matchCount = schemas.filter(schema => {
      const subErrors: ValidationError[] = [];
      this.validateValue(value, schema, path, subErrors, depth + 1);
      return subErrors.length === 0;
    }).length;
    
    if (matchCount !== 1) {
      errors.push({
        path,
        message: this.getMessage('ONE_OF'),
        code: 'ONE_OF',
        value,
        expected: `exactly 1 match, got ${matchCount}`
      });
    }
  }
  
  /**
   * anyOf 验证
   */
  private validateAnyOf(
    value: unknown,
    schemas: SchemaDefinition[],
    path: string,
    errors: ValidationError[],
    depth: number
  ): void {
    const matchCount = schemas.filter(schema => {
      const subErrors: ValidationError[] = [];
      this.validateValue(value, schema, path, subErrors, depth + 1);
      return subErrors.length === 0;
    }).length;
    
    if (matchCount === 0) {
      errors.push({
        path,
        message: this.getMessage('ANY_OF'),
        code: 'ANY_OF',
        value
      });
    }
  }
  
  /**
   * allOf 验证
   */
  private validateAllOf(
    value: unknown,
    schemas: SchemaDefinition[],
    path: string,
    errors: ValidationError[],
    depth: number
  ): void {
    schemas.forEach(schema => {
      this.validateValue(value, schema, path, errors, depth + 1);
    });
  }
  
  /**
   * not 验证
   */
  private validateNot(
    value: unknown,
    schema: SchemaDefinition,
    path: string,
    errors: ValidationError[],
    depth: number
  ): void {
    const subErrors: ValidationError[] = [];
    this.validateValue(value, schema, path, subErrors, depth + 1);
    
    if (subErrors.length === 0) {
      errors.push({
        path,
        message: this.getMessage('NOT'),
        code: 'NOT',
        value
      });
    }
  }
  
  /**
   * if/then/else 验证
   */
  private validateIfThenElse(
    value: unknown,
    schema: SchemaDefinition,
    path: string,
    errors: ValidationError[],
    depth: number
  ): void {
    const ifErrors: ValidationError[] = [];
    this.validateValue(value, schema.if!, path, ifErrors, depth + 1);
    
    const conditionMet = ifErrors.length === 0;
    const nextSchema = conditionMet ? schema.then : schema.else;
    
    if (nextSchema) {
      this.validateValue(value, nextSchema, path, errors, depth + 1);
    }
  }
  
  /**
   * 类型转换 (非严格模式)
   */
  private coerceType(value: unknown, targetType: string): unknown {
    if (value === null || value === undefined) return value;
    
    switch (targetType) {
      case 'string':
        return String(value);
      case 'number':
        return Number(value);
      case 'integer':
        return Number.isInteger(Number(value)) ? Number(value) : value;
      case 'boolean':
        if (typeof value === 'string') {
          return value.toLowerCase() === 'true' || value === '1';
        }
        return Boolean(value);
      case 'array':
        return [value];
      default:
        return value;
    }
  }
  
  /**
   * 获取错误消息
   */
  private getMessage(code: string, vars: Record<string, unknown> = {}): string {
    const template = this.config.messages[code] || `Validation error: ${code}`;
    return interpolateMessage(template, vars);
  }
  
  /**
   * 添加自定义格式验证器
   */
  addFormat(name: string, validator: (value: string) => boolean): void {
    this.config.customFormats[name] = validator;
  }
  
  /**
   * 更新配置
   */
  updateConfig(config: Partial<ValidatorConfig>): void {
    this.config = { ...this.config, ...config };
    
    if (config.messages) {
      const baseMessages = this.config.locale === 'zh' ? ZH_MESSAGES : EN_MESSAGES;
      this.config.messages = { ...baseMessages, ...config.messages };
    }
  }
}

// ============ 快捷验证函数 ============

/**
 * 快速验证数据是否符合 Schema
 * @param data 待验证的数据
 * @param schema JSON Schema 定义
 * @returns 是否有效
 */
export function isValid(data: unknown, schema: SchemaDefinition): boolean {
  const validator = new SchemaValidator(schema);
  return validator.validate(data).valid;
}

/**
 * 验证并返回错误列表
 * @param data 待验证的数据
 * @param schema JSON Schema 定义
 * @returns 错误列表
 */
export function validate(data: unknown, schema: SchemaDefinition): ValidationError[] {
  const validator = new SchemaValidator(schema);
  return validator.validate(data).errors;
}

/**
 * 验证并抛出异常 (如果失败)
 * @param data 待验证的数据
 * @param schema JSON Schema 定义
 * @throws ValidationError 如果验证失败
 */
export function assertValid(data: unknown, schema: SchemaDefinition): void {
  const validator = new SchemaValidator(schema);
  const result = validator.validate(data);
  
  if (!result.valid) {
    throw new SchemaValidationError(result.errors);
  }
}

// ============ 异常类 ============

/**
 * Schema 验证异常
 */
export class SchemaValidationError extends Error {
  errors: ValidationError[];
  
  constructor(errors: ValidationError[]) {
    const message = errors.map(e => `${e.path}: ${e.message}`).join('; ');
    super(message);
    this.name = 'SchemaValidationError';
    this.errors = errors;
  }
  
  /**
   * 格式化为可读的错误报告
   */
  formatReport(): string {
    const lines = ['Validation Failed:', ''];
    
    this.errors.forEach((error, index) => {
      lines.push(`${index + 1}. ${error.path}`);
      lines.push(`   Code: ${error.code}`);
      lines.push(`   Message: ${error.message}`);
      if (error.value !== undefined) {
        lines.push(`   Value: ${JSON.stringify(error.value)}`);
      }
      if (error.expected !== undefined) {
        lines.push(`   Expected: ${JSON.stringify(error.expected)}`);
      }
      lines.push('');
    });
    
    return lines.join('\n');
  }
}

// ============ 导出类型 ============

export type {
  SchemaDefinition,
  SchemaType,
  ValidationError,
  ValidationResult,
  ValidatorConfig
};

export {
  FORMAT_VALIDATORS,
  DEFAULT_MESSAGES,
  ZH_MESSAGES,
  EN_MESSAGES
};
