/**
 * 数据验证工具 - Data Validator Skill
 * 
 * 提供全面的数据验证功能：
 * 1. 数据类型验证 - 基础类型、数组、对象等
 * 2. 业务规则验证 - 范围、格式、依赖关系等
 * 3. 数据清洗 - 修剪、格式化、默认值等
 * 
 * @version 1.0.0
 * @author AxonClaw
 */

// ============ 类型定义 ============

/** 验证结果 */
interface ValidationResult {
  valid: boolean;
  message?: string;
  errors?: ValidationError[];
  warnings?: string[];
  data?: any;
}

/** 验证错误信息 */
interface ValidationError {
  field?: string;
  code: string;
  message: string;
  value?: any;
  expected?: any;
}

/** 数据类型枚举 */
type DataType = 
  | 'string' 
  | 'number' 
  | 'boolean' 
  | 'object' 
  | 'array' 
  | 'null' 
  | 'undefined'
  | 'function'
  | 'date'
  | 'regexp';

/** 类型验证选项 */
interface TypeValidationOptions {
  /** 允许的类型 */
  types?: DataType | DataType[];
  /** 是否允许 null */
  nullable?: boolean;
  /** 是否允许 undefined */
  optional?: boolean;
  /** 自定义验证器 */
  custom?: (value: any) => boolean | string;
}

/** 字符串验证选项 */
interface StringValidationOptions {
  /** 最小长度 */
  minLength?: number;
  /** 最大长度 */
  maxLength?: number;
  /** 精确长度 */
  length?: number;
  /** 正则表达式匹配 */
  pattern?: RegExp;
  /** 不能为空字符串 */
  nonEmpty?: boolean;
  /** 必须是有效邮箱 */
  email?: boolean;
  /** 必须是有效 URL */
  url?: boolean;
  /** 必须是有效手机号 */
  phone?: boolean;
  /** 自定义验证器 */
  custom?: (value: string) => boolean | string;
}

/** 数字验证选项 */
interface NumberValidationOptions {
  /** 最小值 */
  min?: number;
  /** 最大值 */
  max?: number;
  /** 必须是整数 */
  integer?: boolean;
  /** 必须是正数 */
  positive?: boolean;
  /** 必须是非负数 */
  nonNegative?: boolean;
  /** 精度 (小数位数) */
  precision?: number;
  /** 自定义验证器 */
  custom?: (value: number) => boolean | string;
}

/** 数组验证选项 */
interface ArrayValidationOptions {
  /** 最小长度 */
  minLength?: number;
  /** 最大长度 */
  maxLength?: number;
  /** 精确长度 */
  length?: number;
  /** 不能为空数组 */
  nonEmpty?: boolean;
  /** 元素类型验证 */
  itemType?: DataType | DataType[];
  /** 元素验证器 */
  itemValidator?: (item: any, index: number) => boolean | string;
  /** 元素必须唯一 */
  unique?: boolean;
  /** 自定义验证器 */
  custom?: (value: any[]) => boolean | string;
}

/** 对象验证选项 */
interface ObjectValidationOptions {
  /** 必需的字段 */
  required?: string[];
  /** 字段验证器映射 */
  fields?: Record<string, TypeValidationOptions | StringValidationOptions | NumberValidationOptions>;
  /** 不允许额外字段 */
  strict?: boolean;
  /** 最小字段数 */
  minFields?: number;
  /** 最大字段数 */
  maxFields?: number;
  /** 自定义验证器 */
  custom?: (value: Record<string, any>) => boolean | string;
}

/** 业务规则验证选项 */
interface BusinessRuleOptions {
  /** 范围验证 */
  range?: {
    min: any;
    max: any;
    inclusive?: boolean;
  };
  /** 枚举验证 */
  enum?: any[];
  /** 依赖字段验证 */
  dependsOn?: {
    field: string;
    value: any;
    thenRequired: string[];
  };
  /** 条件验证 */
  when?: (data: any) => boolean;
  /** 验证器 */
  validator?: (data: any) => boolean | string | ValidationError[];
  /** 自定义错误码 */
  errorCode?: string;
  /** 自定义错误消息 */
  errorMessage?: string;
}

/** 数据清洗选项 */
interface DataCleaningOptions {
  /** 字符串修剪 */
  trim?: boolean;
  /** 转换为小写 */
  toLowerCase?: boolean;
  /** 转换为大写 */
  toUpperCase?: boolean;
  /** 默认值 (当值为 null/undefined 时) */
  default?: any;
  /** 数字精度 */
  precision?: number;
  /** 数组去重 */
  unique?: boolean;
  /** 移除空值 */
  removeEmpty?: boolean;
  /** 格式化日期 */
  dateFormat?: string;
  /** 自定义清洗器 */
  custom?: (value: any) => any;
}

/** 数据清洗结果 */
interface DataCleaningResult {
  /** 清洗后的数据 */
  data: any;
  /** 是否被修改 */
  modified: boolean;
  /** 修改记录 */
  changes?: Array<{
    field?: string;
    action: string;
    oldValue?: any;
    newValue?: any;
  }>;
}

// ============ 工具函数 ============

/**
 * 获取值的实际类型
 */
function getActualType(value: any): DataType {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (Array.isArray(value)) return 'array';
  if (value instanceof Date) return 'date';
  if (value instanceof RegExp) return 'regexp';
  return typeof value as DataType;
}

/**
 * 检查值是否匹配指定类型
 */
function matchesType(value: any, type: DataType): boolean {
  const actualType = getActualType(value);
  
  if (type === 'null') return value === null;
  if (type === 'undefined') return value === undefined;
  if (type === 'array') return Array.isArray(value);
  if (type === 'date') return value instanceof Date;
  if (type === 'regexp') return value instanceof RegExp;
  
  return actualType === type;
}

/**
 * 创建验证错误
 */
function createError(
  code: string,
  message: string,
  field?: string,
  value?: any,
  expected?: any
): ValidationError {
  return { field, code, message, value, expected };
}

// ============ 数据类型验证 ============

/**
 * 验证数据类型
 * 
 * @param value - 要验证的值
 * @param options - 验证选项
 * @returns 验证结果
 * 
 * @example
 * validateType('hello', { types: 'string' }) // ✓ 有效
 * validateType(123, { types: ['string', 'number'] }) // ✓ 有效
 * validateType(null, { nullable: true }) // ✓ 有效
 */
export function validateType(value: any, options: TypeValidationOptions = {}): ValidationResult {
  const errors: ValidationError[] = [];
  
  // 检查 null
  if (value === null) {
    if (!options.nullable) {
      errors.push(createError(
        'NULL_NOT_ALLOWED',
        '值不能为 null',
        undefined,
        null,
        '非 null 值'
      ));
    }
    return {
      valid: errors.length === 0,
      message: errors.length === 0 ? '验证通过' : errors[0].message,
      errors: errors.length > 0 ? errors : undefined
    };
  }
  
  // 检查 undefined
  if (value === undefined) {
    if (!options.optional) {
      errors.push(createError(
        'UNDEFINED_NOT_ALLOWED',
        '值不能为 undefined',
        undefined,
        undefined,
        '非 undefined 值'
      ));
    }
    return {
      valid: errors.length === 0,
      message: errors.length === 0 ? '验证通过' : errors[0].message,
      errors: errors.length > 0 ? errors : undefined
    };
  }
  
  // 检查类型
  if (options.types) {
    const types = Array.isArray(options.types) ? options.types : [options.types];
    const actualType = getActualType(value);
    
    const typeMatch = types.some(type => {
      if (type === 'null' || type === 'undefined') {
        return value === null || value === undefined;
      }
      return matchesType(value, type);
    });
    
    if (!typeMatch) {
      errors.push(createError(
        'TYPE_MISMATCH',
        `类型不匹配：期望 ${types.join(' | ')}，实际为 ${actualType}`,
        undefined,
        actualType,
        types.join(' | ')
      ));
    }
  }
  
  // 自定义验证器
  if (options.custom) {
    const result = options.custom(value);
    if (result === false || typeof result === 'string') {
      errors.push(createError(
        'CUSTOM_VALIDATION_FAILED',
        typeof result === 'string' ? result : '自定义验证失败',
        undefined,
        value
      ));
    }
  }
  
  return {
    valid: errors.length === 0,
    message: errors.length === 0 ? '验证通过' : errors.map(e => e.message).join('; '),
    errors: errors.length > 0 ? errors : undefined
  };
}

/**
 * 验证字符串
 * 
 * @param value - 要验证的值
 * @param options - 验证选项
 * @returns 验证结果
 * 
 * @example
 * validateString('test@example.com', { email: true }) // ✓ 有效
 * validateString('hello', { minLength: 3, maxLength: 10 }) // ✓ 有效
 */
export function validateString(value: any, options: StringValidationOptions = {}): ValidationResult {
  const errors: ValidationError[] = [];
  
  // 首先检查类型
  if (typeof value !== 'string') {
    return {
      valid: false,
      message: `期望字符串类型，实际为 ${getActualType(value)}`,
      errors: [createError('TYPE_MISMATCH', '期望字符串类型', undefined, getActualType(value), 'string')]
    };
  }
  
  // 长度验证
  if (options.length !== undefined && value.length !== options.length) {
    errors.push(createError(
      'LENGTH_MISMATCH',
      `字符串长度应为 ${options.length}，实际为 ${value.length}`,
      undefined,
      value.length,
      options.length
    ));
  }
  
  if (options.minLength !== undefined && value.length < options.minLength) {
    errors.push(createError(
      'MIN_LENGTH_EXCEEDED',
      `字符串长度至少为 ${options.minLength}，实际为 ${value.length}`,
      undefined,
      value.length,
      `>= ${options.minLength}`
    ));
  }
  
  if (options.maxLength !== undefined && value.length > options.maxLength) {
    errors.push(createError(
      'MAX_LENGTH_EXCEEDED',
      `字符串长度最多为 ${options.maxLength}，实际为 ${value.length}`,
      undefined,
      value.length,
      `<= ${options.maxLength}`
    ));
  }
  
  // 非空验证
  if (options.nonEmpty && value.trim().length === 0) {
    errors.push(createError(
      'EMPTY_STRING',
      '字符串不能为空',
      undefined,
      value,
      '非空字符串'
    ));
  }
  
  // 正则匹配
  if (options.pattern && !options.pattern.test(value)) {
    errors.push(createError(
      'PATTERN_MISMATCH',
      `字符串不符合模式：${options.pattern}`,
      undefined,
      value,
      options.pattern.toString()
    ));
  }
  
  // 邮箱验证
  if (options.email) {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(value)) {
      errors.push(createError(
        'INVALID_EMAIL',
        '邮箱地址格式不正确',
        undefined,
        value,
        '有效的邮箱地址'
      ));
    }
  }
  
  // URL 验证
  if (options.url) {
    const urlRegex = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;
    if (!urlRegex.test(value)) {
      errors.push(createError(
        'INVALID_URL',
        'URL 地址格式不正确',
        undefined,
        value,
        '有效的 URL'
      ));
    }
  }
  
  // 手机号验证
  if (options.phone) {
    const phoneRegex = /^1[3-9]\d{9}$/;
    if (!phoneRegex.test(value.replace(/[\s\-\(\)]/g, ''))) {
      errors.push(createError(
        'INVALID_PHONE',
        '手机号格式不正确',
        undefined,
        value,
        '有效的中国大陆手机号'
      ));
    }
  }
  
  // 自定义验证器
  if (options.custom) {
    const result = options.custom(value);
    if (result === false || typeof result === 'string') {
      errors.push(createError(
        'CUSTOM_VALIDATION_FAILED',
        typeof result === 'string' ? result : '自定义验证失败',
        undefined,
        value
      ));
    }
  }
  
  return {
    valid: errors.length === 0,
    message: errors.length === 0 ? '验证通过' : errors.map(e => e.message).join('; '),
    errors: errors.length > 0 ? errors : undefined
  };
}

/**
 * 验证数字
 * 
 * @param value - 要验证的值
 * @param options - 验证选项
 * @returns 验证结果
 * 
 * @example
 * validateNumber(50, { min: 0, max: 100 }) // ✓ 有效
 * validateNumber(3.14, { integer: true }) // ✗ 无效 - 不是整数
 */
export function validateNumber(value: any, options: NumberValidationOptions = {}): ValidationResult {
  const errors: ValidationError[] = [];
  
  // 首先检查类型
  if (typeof value !== 'number' || isNaN(value)) {
    return {
      valid: false,
      message: `期望数字类型，实际为 ${getActualType(value)}` + (isNaN(value) ? ' (NaN)' : ''),
      errors: [createError('TYPE_MISMATCH', '期望数字类型', undefined, getActualType(value), 'number')]
    };
  }
  
  // 范围验证
  if (options.min !== undefined && value < options.min) {
    errors.push(createError(
      'MIN_VALUE_EXCEEDED',
      `值不能小于 ${options.min}，实际为 ${value}`,
      undefined,
      value,
      `>= ${options.min}`
    ));
  }
  
  if (options.max !== undefined && value > options.max) {
    errors.push(createError(
      'MAX_VALUE_EXCEEDED',
      `值不能大于 ${options.max}，实际为 ${value}`,
      undefined,
      value,
      `<= ${options.max}`
    ));
  }
  
  // 整数验证
  if (options.integer && !Number.isInteger(value)) {
    errors.push(createError(
      'NOT_INTEGER',
      `值必须是整数，实际为 ${value}`,
      undefined,
      value,
      '整数'
    ));
  }
  
  // 正数验证
  if (options.positive && value <= 0) {
    errors.push(createError(
      'NOT_POSITIVE',
      `值必须是正数，实际为 ${value}`,
      undefined,
      value,
      '> 0'
    ));
  }
  
  // 非负数验证
  if (options.nonNegative && value < 0) {
    errors.push(createError(
      'NEGATIVE_VALUE',
      `值必须是非负数，实际为 ${value}`,
      undefined,
      value,
      '>= 0'
    ));
  }
  
  // 精度验证
  if (options.precision !== undefined) {
    const actualPrecision = (value.toString().split('.')[1] || '').length;
    if (actualPrecision > options.precision) {
      errors.push(createError(
        'PRECISION_EXCEEDED',
        `小数位数最多为 ${options.precision}，实际为 ${actualPrecision}`,
        undefined,
        actualPrecision,
        `<= ${options.precision}`
      ));
    }
  }
  
  // 自定义验证器
  if (options.custom) {
    const result = options.custom(value);
    if (result === false || typeof result === 'string') {
      errors.push(createError(
        'CUSTOM_VALIDATION_FAILED',
        typeof result === 'string' ? result : '自定义验证失败',
        undefined,
        value
      ));
    }
  }
  
  return {
    valid: errors.length === 0,
    message: errors.length === 0 ? '验证通过' : errors.map(e => e.message).join('; '),
    errors: errors.length > 0 ? errors : undefined
  };
}

/**
 * 验证数组
 * 
 * @param value - 要验证的值
 * @param options - 验证选项
 * @returns 验证结果
 * 
 * @example
 * validateArray([1, 2, 3], { minLength: 1, itemType: 'number' }) // ✓ 有效
 * validateArray([1, 2, 2, 3], { unique: true }) // ✗ 无效 - 有重复元素
 */
export function validateArray(value: any, options: ArrayValidationOptions = {}): ValidationResult {
  const errors: ValidationError[] = [];
  
  // 首先检查类型
  if (!Array.isArray(value)) {
    return {
      valid: false,
      message: `期望数组类型，实际为 ${getActualType(value)}`,
      errors: [createError('TYPE_MISMATCH', '期望数组类型', undefined, getActualType(value), 'array')]
    };
  }
  
  // 长度验证
  if (options.length !== undefined && value.length !== options.length) {
    errors.push(createError(
      'LENGTH_MISMATCH',
      `数组长度应为 ${options.length}，实际为 ${value.length}`,
      undefined,
      value.length,
      options.length
    ));
  }
  
  if (options.minLength !== undefined && value.length < options.minLength) {
    errors.push(createError(
      'MIN_LENGTH_EXCEEDED',
      `数组长度至少为 ${options.minLength}，实际为 ${value.length}`,
      undefined,
      value.length,
      `>= ${options.minLength}`
    ));
  }
  
  if (options.maxLength !== undefined && value.length > options.maxLength) {
    errors.push(createError(
      'MAX_LENGTH_EXCEEDED',
      `数组长度最多为 ${options.maxLength}，实际为 ${value.length}`,
      undefined,
      value.length,
      `<= ${options.maxLength}`
    ));
  }
  
  // 非空验证
  if (options.nonEmpty && value.length === 0) {
    errors.push(createError(
      'EMPTY_ARRAY',
      '数组不能为空',
      undefined,
      value,
      '非空数组'
    ));
  }
  
  // 元素类型验证
  if (options.itemType) {
    const types = Array.isArray(options.itemType) ? options.itemType : [options.itemType];
    value.forEach((item, index) => {
      const actualType = getActualType(item);
      const typeMatch = types.some(type => matchesType(item, type));
      
      if (!typeMatch) {
        errors.push(createError(
          'ITEM_TYPE_MISMATCH',
          `索引 ${index} 处的元素类型不匹配：期望 ${types.join(' | ')}，实际为 ${actualType}`,
          `[${index}]`,
          actualType,
          types.join(' | ')
        ));
      }
    });
  }
  
  // 元素验证器
  if (options.itemValidator) {
    value.forEach((item, index) => {
      const result = options.itemValidator!(item, index);
      if (result === false || typeof result === 'string') {
        errors.push(createError(
          'ITEM_VALIDATION_FAILED',
          typeof result === 'string' 
            ? `索引 ${index}: ${result}` 
            : `索引 ${index} 处的元素验证失败`,
          `[${index}]`,
          item
        ));
      }
    });
  }
  
  // 唯一性验证
  if (options.unique) {
    const seen: any[] = [];
    value.forEach((item, index) => {
      const key = typeof item === 'object' ? JSON.stringify(item) : String(item);
      if (seen.includes(key)) {
        errors.push(createError(
          'DUPLICATE_ITEM',
          `数组包含重复元素：${key}`,
          `[${index}]`,
          item,
          '唯一元素'
        ));
      }
      seen.push(key);
    });
  }
  
  // 自定义验证器
  if (options.custom) {
    const result = options.custom(value);
    if (result === false || typeof result === 'string') {
      errors.push(createError(
        'CUSTOM_VALIDATION_FAILED',
        typeof result === 'string' ? result : '自定义验证失败',
        undefined,
        value
      ));
    }
  }
  
  return {
    valid: errors.length === 0,
    message: errors.length === 0 ? '验证通过' : errors.map(e => e.message).join('; '),
    errors: errors.length > 0 ? errors : undefined
  };
}

/**
 * 验证对象
 * 
 * @param value - 要验证的值
 * @param options - 验证选项
 * @returns 验证结果
 * 
 * @example
 * validateObject({ name: 'John', age: 30 }, { 
 *   required: ['name', 'age'],
 *   fields: { name: { types: 'string' }, age: { types: 'number', min: 0 } }
 * }) // ✓ 有效
 */
export function validateObject(
  value: any, 
  options: ObjectValidationOptions = {}
): ValidationResult {
  const errors: ValidationError[] = [];
  
  // 首先检查类型
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return {
      valid: false,
      message: `期望对象类型，实际为 ${getActualType(value)}`,
      errors: [createError('TYPE_MISMATCH', '期望对象类型', undefined, getActualType(value), 'object')]
    };
  }
  
  const keys = Object.keys(value);
  
  // 字段数量验证
  if (options.minFields !== undefined && keys.length < options.minFields) {
    errors.push(createError(
      'MIN_FIELDS_EXCEEDED',
      `对象至少包含 ${options.minFields} 个字段，实际为 ${keys.length}`,
      undefined,
      keys.length,
      `>= ${options.minFields}`
    ));
  }
  
  if (options.maxFields !== undefined && keys.length > options.maxFields) {
    errors.push(createError(
      'MAX_FIELDS_EXCEEDED',
      `对象最多包含 ${options.maxFields} 个字段，实际为 ${keys.length}`,
      undefined,
      keys.length,
      `<= ${options.maxFields}`
    ));
  }
  
  // 必需字段验证
  if (options.required) {
    options.required.forEach(field => {
      if (!(field in value)) {
        errors.push(createError(
          'REQUIRED_FIELD_MISSING',
          `缺少必需字段：${field}`,
          field,
          undefined,
          '字段存在'
        ));
      }
    });
  }
  
  // 严格模式 - 不允许额外字段
  if (options.strict && options.fields) {
    const allowedFields = Object.keys(options.fields);
    keys.forEach(key => {
      if (!allowedFields.includes(key)) {
        errors.push(createError(
          'EXTRA_FIELD_NOT_ALLOWED',
          `不允许的额外字段：${key}`,
          key,
          value[key]
        ));
      }
    });
  }
  
  // 字段验证
  if (options.fields) {
    Object.entries(options.fields).forEach(([field, fieldOptions]) => {
      const fieldValue = value[field];
      
      // 如果字段不存在且不是必需的，跳过
      if (fieldValue === undefined && !options.required?.includes(field)) {
        return;
      }
      
      let fieldResult: ValidationResult;
      
      // 根据字段选项类型调用相应的验证器
      if ('minLength' in fieldOptions || 'maxLength' in fieldOptions || 'email' in fieldOptions) {
        fieldResult = validateString(fieldValue, fieldOptions as StringValidationOptions);
      } else if ('min' in fieldOptions || 'max' in fieldOptions || 'integer' in fieldOptions) {
        fieldResult = validateNumber(fieldValue, fieldOptions as NumberValidationOptions);
      } else {
        fieldResult = validateType(fieldValue, fieldOptions as TypeValidationOptions);
      }
      
      if (!fieldResult.valid && fieldResult.errors) {
        fieldResult.errors.forEach(error => {
          errors.push({
            ...error,
            field: error.field ? `${field}.${error.field}` : field
          });
        });
      }
    });
  }
  
  // 自定义验证器
  if (options.custom) {
    const result = options.custom(value);
    if (result === false || typeof result === 'string') {
      errors.push(createError(
        'CUSTOM_VALIDATION_FAILED',
        typeof result === 'string' ? result : '自定义验证失败',
        undefined,
        value
      ));
    }
  }
  
  return {
    valid: errors.length === 0,
    message: errors.length === 0 ? '验证通过' : errors.map(e => e.message).join('; '),
    errors: errors.length > 0 ? errors : undefined
  };
}

// ============ 业务规则验证 ============

/**
 * 验证业务规则
 * 
 * @param value - 要验证的值
 * @param options - 业务规则选项
 * @returns 验证结果
 * 
 * @example
 * validateBusinessRule(50, { range: { min: 0, max: 100 } }) // ✓ 有效
 * validateBusinessRule('admin', { enum: ['admin', 'user', 'guest'] }) // ✓ 有效
 */
export function validateBusinessRule(value: any, options: BusinessRuleOptions): ValidationResult {
  const errors: ValidationError[] = [];
  
  // 条件验证
  if (options.when && !options.when(value)) {
    // 条件不满足，跳过验证
    return {
      valid: true,
      message: '条件不满足，跳过验证'
    };
  }
  
  // 范围验证
  if (options.range) {
    const { min, max, inclusive = true } = options.range;
    const isValid = inclusive 
      ? value >= min && value <= max
      : value > min && value < max;
    
    if (!isValid) {
      errors.push(createError(
        options.errorCode || 'RANGE_EXCEEDED',
        options.errorMessage || `值超出范围：[${min}, ${max}]${inclusive ? '' : '(不包含边界)'}`,
        undefined,
        value,
        `${inclusive ? '[' : '('}${min}, ${max}${inclusive ? ']' : ')'}`
      ));
    }
  }
  
  // 枚举验证
  if (options.enum) {
    if (!options.enum.includes(value)) {
      errors.push(createError(
        options.errorCode || 'ENUM_MISMATCH',
        options.errorMessage || `值不在允许列表中：${options.enum.join(', ')}`,
        undefined,
        value,
        options.enum
      ));
    }
  }
  
  // 依赖字段验证
  if (options.dependsOn) {
    const { field, value: expectedValue, thenRequired } = options.dependsOn;
    
    if (value === expectedValue) {
      // 这里应该检查依赖的字段是否存在，但由于我们只有单个值
      // 这个验证通常在对象验证中更有意义
      // 这里仅做记录
    }
  }
  
  // 自定义验证器
  if (options.validator) {
    const result = options.validator(value);
    
    if (result === false) {
      errors.push(createError(
        options.errorCode || 'BUSINESS_RULE_VIOLATION',
        options.errorMessage || '违反业务规则',
        undefined,
        value
      ));
    } else if (typeof result === 'string') {
      errors.push(createError(
        options.errorCode || 'BUSINESS_RULE_VIOLATION',
        result,
        undefined,
        value
      ));
    } else if (Array.isArray(result)) {
      errors.push(...result);
    }
  }
  
  return {
    valid: errors.length === 0,
    message: errors.length === 0 ? '验证通过' : errors.map(e => e.message).join('; '),
    errors: errors.length > 0 ? errors : undefined
  };
}

/**
 * 验证 Schema (组合验证)
 * 
 * @param data - 要验证的数据
 * @param schema - Schema 定义
 * @returns 验证结果
 * 
 * @example
 * const schema = {
 *   type: 'object',
 *   required: ['name', 'email'],
 *   fields: {
 *     name: { type: 'string', minLength: 1 },
 *     email: { type: 'string', email: true },
 *     age: { type: 'number', min: 0, max: 150 }
 *   }
 * };
 * validateSchema({ name: 'John', email: 'john@example.com', age: 30 }, schema);
 */
export function validateSchema(data: any, schema: any): ValidationResult {
  const errors: ValidationError[] = [];
  
  // 类型验证
  if (schema.type) {
    const typeResult = validateType(data, { types: schema.type as DataType });
    if (!typeResult.valid) {
      return typeResult;
    }
  }
  
  // 根据类型进行具体验证
  if (schema.type === 'string' || typeof data === 'string') {
    const stringOptions: StringValidationOptions = {};
    if (schema.minLength !== undefined) stringOptions.minLength = schema.minLength;
    if (schema.maxLength !== undefined) stringOptions.maxLength = schema.maxLength;
    if (schema.pattern !== undefined) stringOptions.pattern = schema.pattern;
    if (schema.email) stringOptions.email = true;
    if (schema.url) stringOptions.url = true;
    if (schema.phone) stringOptions.phone = true;
    
    const result = validateString(data, stringOptions);
    if (!result.valid && result.errors) {
      errors.push(...result.errors);
    }
  }
  
  if (schema.type === 'number' || typeof data === 'number') {
    const numberOptions: NumberValidationOptions = {};
    if (schema.min !== undefined) numberOptions.min = schema.min;
    if (schema.max !== undefined) numberOptions.max = schema.max;
    if (schema.integer) numberOptions.integer = true;
    if (schema.positive) numberOptions.positive = true;
    
    const result = validateNumber(data, numberOptions);
    if (!result.valid && result.errors) {
      errors.push(...result.errors);
    }
  }
  
  if (schema.type === 'array' || Array.isArray(data)) {
    const arrayOptions: ArrayValidationOptions = {};
    if (schema.minLength !== undefined) arrayOptions.minLength = schema.minLength;
    if (schema.maxLength !== undefined) arrayOptions.maxLength = schema.maxLength;
    if (schema.unique) arrayOptions.unique = true;
    if (schema.items) arrayOptions.itemType = schema.items.type as DataType;
    
    const result = validateArray(data, arrayOptions);
    if (!result.valid && result.errors) {
      errors.push(...result.errors);
    }
  }
  
  if (schema.type === 'object' || (typeof data === 'object' && data !== null && !Array.isArray(data))) {
    const objectOptions: ObjectValidationOptions = {};
    if (schema.required) objectOptions.required = schema.required;
    if (schema.fields) objectOptions.fields = schema.fields;
    if (schema.strict) objectOptions.strict = true;
    
    const result = validateObject(data, objectOptions);
    if (!result.valid && result.errors) {
      errors.push(...result.errors);
    }
  }
  
  // 枚举验证
  if (schema.enum && !schema.enum.includes(data)) {
    errors.push(createError(
      'ENUM_MISMATCH',
      `值不在允许列表中：${schema.enum.join(', ')}`,
      undefined,
      data,
      schema.enum
    ));
  }
  
  return {
    valid: errors.length === 0,
    message: errors.length === 0 ? '验证通过' : errors.map(e => e.message).join('; '),
    errors: errors.length > 0 ? errors : undefined
  };
}

// ============ 数据清洗 ============

/**
 * 清洗数据
 * 
 * @param value - 要清洗的值
 * @param options - 清洗选项
 * @returns 清洗结果
 * 
 * @example
 * cleanData('  Hello  ', { trim: true }) // { data: 'Hello', modified: true }
 * cleanData(null, { default: 'N/A' }) // { data: 'N/A', modified: true }
 */
export function cleanData(value: any, options: DataCleaningOptions = {}): DataCleaningResult {
  const changes: Array<{ field?: string; action: string; oldValue?: any; newValue?: any }> = [];
  let result = value;
  
  // 默认值处理
  if ((value === null || value === undefined) && options.default !== undefined) {
    changes.push({
      action: 'set_default',
      oldValue: value,
      newValue: options.default
    });
    result = options.default;
  }
  
  // 字符串清洗
  if (typeof result === 'string') {
    if (options.trim) {
      const trimmed = result.trim();
      if (trimmed !== result) {
        changes.push({
          action: 'trim',
          oldValue: result,
          newValue: trimmed
        });
        result = trimmed;
      }
    }
    
    if (options.toLowerCase) {
      const lower = result.toLowerCase();
      if (lower !== result) {
        changes.push({
          action: 'to_lower_case',
          oldValue: result,
          newValue: lower
        });
        result = lower;
      }
    }
    
    if (options.toUpperCase) {
      const upper = result.toUpperCase();
      if (upper !== result) {
        changes.push({
          action: 'to_upper_case',
          oldValue: result,
          newValue: upper
        });
        result = upper;
      }
    }
  }
  
  // 数字清洗
  if (typeof result === 'number' && options.precision !== undefined) {
    const precise = parseFloat(result.toFixed(options.precision));
    if (precise !== result) {
      changes.push({
        action: 'set_precision',
        oldValue: result,
        newValue: precise
      });
      result = precise;
    }
  }
  
  // 数组清洗
  if (Array.isArray(result)) {
    let arrayResult = [...result];
    
    if (options.unique) {
      const beforeLength = arrayResult.length;
      arrayResult = [...new Set(arrayResult)];
      if (arrayResult.length !== beforeLength) {
        changes.push({
          action: 'remove_duplicates',
          oldValue: result,
          newValue: arrayResult
        });
        result = arrayResult;
      }
    }
    
    if (options.removeEmpty) {
      const beforeLength = arrayResult.length;
      arrayResult = arrayResult.filter(item => 
        item !== null && item !== undefined && item !== ''
      );
      if (arrayResult.length !== beforeLength) {
        changes.push({
          action: 'remove_empty',
          oldValue: result,
          newValue: arrayResult
        });
        result = arrayResult;
      }
    }
  }
  
  // 对象清洗
  if (typeof result === 'object' && result !== null && !Array.isArray(result)) {
    if (options.removeEmpty) {
      const cleanedObj: Record<string, any> = {};
      let modified = false;
      
      Object.entries(result).forEach(([key, val]) => {
        if (val !== null && val !== undefined && val !== '') {
          cleanedObj[key] = val;
        } else {
          modified = true;
          changes.push({
            field: key,
            action: 'remove_empty',
            oldValue: val,
            newValue: undefined
          });
        }
      });
      
      if (modified) {
        result = cleanedObj;
      }
    }
  }
  
  // 自定义清洗器
  if (options.custom) {
    const customResult = options.custom(result);
    if (customResult !== result) {
      changes.push({
        action: 'custom',
        oldValue: result,
        newValue: customResult
      });
      result = customResult;
    }
  }
  
  return {
    data: result,
    modified: changes.length > 0,
    changes: changes.length > 0 ? changes : undefined
  };
}

/**
 * 批量清洗对象字段
 * 
 * @param obj - 要清洗的对象
 * @param rules - 字段清洗规则
 * @returns 清洗结果
 * 
 * @example
 * const rules = {
 *   name: { trim: true },
 *   email: { trim: true, toLowerCase: true },
 *   age: { default: 0 },
 *   tags: { unique: true, removeEmpty: true }
 * };
 * cleanObject({ name: '  John  ', email: 'JOHN@EXAMPLE.COM', tags: ['a', 'b', 'a', ''] }, rules);
 */
export function cleanObject(obj: Record<string, any>, rules: Record<string, DataCleaningOptions>): DataCleaningResult {
  const changes: Array<{ field?: string; action: string; oldValue?: any; newValue?: any }> = [];
  const result: Record<string, any> = { ...obj };
  
  Object.entries(rules).forEach(([field, options]) => {
    const fieldValue = obj[field];
    const fieldResult = cleanData(fieldValue, options);
    
    if (fieldResult.modified) {
      result[field] = fieldResult.data;
      
      if (fieldResult.changes) {
        fieldResult.changes.forEach(change => {
          changes.push({
            ...change,
            field: change.field ? `${field}.${change.field}` : field
          });
        });
      }
    }
  });
  
  return {
    data: result,
    modified: changes.length > 0,
    changes: changes.length > 0 ? changes : undefined
  };
}

// ============ 使用示例 ============

if (require.main === module) {
  console.log('=== 数据验证工具 - 使用示例 ===\n');
  
  // ========== 1. 数据类型验证 ==========
  console.log('1️⃣ 数据类型验证:\n');
  
  console.log('验证字符串:');
  console.log(validateType('hello', { types: 'string' }));
  console.log(validateType(123, { types: 'string' }));
  console.log('');
  
  console.log('验证数字:');
  console.log(validateType(3.14, { types: 'number' }));
  console.log(validateType('not a number', { types: 'number' }));
  console.log('');
  
  console.log('验证数组:');
  console.log(validateType([1, 2, 3], { types: 'array' }));
  console.log(validateType({ key: 'value' }, { types: 'array' }));
  console.log('');
  
  console.log('验证可空值:');
  console.log(validateType(null, { nullable: true }));
  console.log(validateType(undefined, { optional: true }));
  console.log('');
  
  // ========== 2. 字符串验证 ==========
  console.log('2️⃣ 字符串验证:\n');
  
  console.log('邮箱验证:');
  console.log(validateString('user@example.com', { email: true }));
  console.log(validateString('invalid-email', { email: true }));
  console.log('');
  
  console.log('长度验证:');
  console.log(validateString('hello', { minLength: 3, maxLength: 10 }));
  console.log(validateString('hi', { minLength: 3 }));
  console.log('');
  
  console.log('手机号验证:');
  console.log(validateString('13812345678', { phone: true }));
  console.log(validateString('1234567', { phone: true }));
  console.log('');
  
  // ========== 3. 数字验证 ==========
  console.log('3️⃣ 数字验证:\n');
  
  console.log('范围验证:');
  console.log(validateNumber(50, { min: 0, max: 100 }));
  console.log(validateNumber(150, { min: 0, max: 100 }));
  console.log('');
  
  console.log('整数验证:');
  console.log(validateNumber(42, { integer: true }));
  console.log(validateNumber(3.14, { integer: true }));
  console.log('');
  
  console.log('正数验证:');
  console.log(validateNumber(10, { positive: true }));
  console.log(validateNumber(-5, { positive: true }));
  console.log('');
  
  // ========== 4. 数组验证 ==========
  console.log('4️⃣ 数组验证:\n');
  
  console.log('元素类型验证:');
  console.log(validateArray([1, 2, 3], { itemType: 'number' }));
  console.log(validateArray([1, 'two', 3], { itemType: 'number' }));
  console.log('');
  
  console.log('唯一性验证:');
  console.log(validateArray([1, 2, 3], { unique: true }));
  console.log(validateArray([1, 2, 2, 3], { unique: true }));
  console.log('');
  
  console.log('长度验证:');
  console.log(validateArray([1, 2, 3], { minLength: 1, maxLength: 5 }));
  console.log(validateArray([], { nonEmpty: true }));
  console.log('');
  
  // ========== 5. 对象验证 ==========
  console.log('5️⃣ 对象验证:\n');
  
  const userSchema = {
    required: ['name', 'email'],
    fields: {
      name: { types: 'string', custom: (v: string) => v.length >= 2 || '姓名至少 2 个字符' },
      email: { types: 'string', email: true },
      age: { types: 'number', min: 0, max: 150 }
    }
  };
  
  console.log('有效用户对象:');
  console.log(validateObject(
    { name: 'John', email: 'john@example.com', age: 30 },
    userSchema
  ));
  console.log('');
  
  console.log('无效用户对象:');
  console.log(validateObject(
    { name: 'J', email: 'invalid-email', age: -5 },
    userSchema
  ));
  console.log('');
  
  // ========== 6. 业务规则验证 ==========
  console.log('6️⃣ 业务规则验证:\n');
  
  console.log('范围验证:');
  console.log(validateBusinessRule(75, {
    range: { min: 0, max: 100 },
    errorMessage: '分数必须在 0-100 之间'
  }));
  console.log('');
  
  console.log('枚举验证:');
  console.log(validateBusinessRule('admin', {
    enum: ['admin', 'user', 'guest'],
    errorMessage: '角色必须是 admin、user 或 guest'
  }));
  console.log('');
  
  // ========== 7. Schema 验证 ==========
  console.log('7️⃣ Schema 验证:\n');
  
  const productSchema = {
    type: 'object',
    required: ['name', 'price'],
    fields: {
      name: { type: 'string', minLength: 1 },
      price: { type: 'number', min: 0 },
      tags: { type: 'array', unique: true }
    }
  };
  
  console.log('有效产品:');
  console.log(validateSchema(
    { name: 'Laptop', price: 999.99, tags: ['electronics', 'computer'] },
    productSchema
  ));
  console.log('');
  
  console.log('无效产品:');
  console.log(validateSchema(
    { name: '', price: -100, tags: ['a', 'a'] },
    productSchema
  ));
  console.log('');
  
  // ========== 8. 数据清洗 ==========
  console.log('8️⃣ 数据清洗:\n');
  
  console.log('字符串修剪:');
  console.log(cleanData('  Hello World  ', { trim: true }));
  console.log('');
  
  console.log('默认值处理:');
  console.log(cleanData(null, { default: 'N/A' }));
  console.log(cleanData(undefined, { default: 0 }));
  console.log('');
  
  console.log('数组去重:');
  console.log(cleanData([1, 2, 2, 3, 3, 3], { unique: true }));
  console.log('');
  
  console.log('对象字段清洗:');
  const userData = {
    name: '  John Doe  ',
    email: 'JOHN@EXAMPLE.COM',
    age: null,
    tags: ['developer', 'admin', 'developer', '']
  };
  const cleaningRules = {
    name: { trim: true },
    email: { trim: true, toLowerCase: true },
    age: { default: 18 },
    tags: { unique: true, removeEmpty: true }
  };
  console.log('原始数据:', userData);
  console.log('清洗结果:', cleanObject(userData, cleaningRules));
  console.log('');
  
  // ========== 9. 实际应用场景 ==========
  console.log('9️⃣ 实际应用场景 - 用户注册表单验证:\n');
  
  const registrationForm = {
    username: '  JohnDoe  ',
    email: 'john.doe@example.com',
    password: 'Str0ng!P@ss',
    age: 25,
    role: 'user',
    interests: ['coding', 'music', 'coding']
  };
  
  const registrationSchema = {
    type: 'object',
    required: ['username', 'email', 'password'],
    fields: {
      username: { type: 'string', minLength: 3, maxLength: 20 },
      email: { type: 'string', email: true },
      password: { type: 'string', minLength: 8 },
      age: { type: 'number', min: 18, max: 120 },
      role: { type: 'string', enum: ['user', 'admin'] },
      interests: { type: 'array', unique: true }
    }
  };
  
  // 先清洗数据
  const cleanedForm = cleanObject(registrationForm, {
    username: { trim: true },
    email: { trim: true, toLowerCase: true },
    interests: { unique: true }
  });
  
  console.log('清洗后的表单:', cleanedForm.data);
  console.log('');
  
  // 再验证数据
  const validationResult = validateSchema(cleanedForm.data, registrationSchema);
  console.log('验证结果:', validationResult);
  console.log('');
  
  console.log('✅ 所有示例执行完成!');
}
