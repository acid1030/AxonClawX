/**
 * 表单字段验证工具 - Validator Utils Skill
 * 
 * 提供全面的表单字段验证功能，支持必填、格式验证和自定义规则
 * 
 * 功能:
 * 1. 必填验证 - 检查字段是否存在且非空
 * 2. 格式验证 - 邮箱、手机、URL、身份证等常用格式
 * 3. 自定义规则 - 支持自定义验证函数和规则链
 * 
 * @version 1.0.0
 * @author AxonClaw
 */

// ============ 类型定义 ============

/** 验证结果 */
interface ValidatorResult {
  valid: boolean;
  errors: ValidationError[];
  warnings?: ValidatorWarning[];
}

/** 验证错误信息 */
interface ValidationError {
  field: string;
  code: string;
  message: string;
  value?: unknown;
  rule?: string;
}

/** 验证警告信息 */
interface ValidatorWarning {
  field: string;
  code: string;
  message: string;
  suggestion?: string;
}

/** 字段验证规则 */
interface FieldRule {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'email' | 'phone' | 'url' | 'idCard' | 'date';
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  enum?: unknown[];
  custom?: (value: unknown, field: string, data: Record<string, unknown>) => string | null;
  trim?: boolean;
  transform?: (value: unknown) => unknown;
}

/** 表单验证 Schema */
interface ValidatorSchema {
  fields: Record<string, FieldRule>;
  strict?: boolean;
  allowUnknown?: boolean;
}

/** 验证器实例 */
interface ValidatorInstance {
  validate: (data: Record<string, unknown>) => ValidatorResult;
  validateField: (field: string, value: unknown, data: Record<string, unknown>) => ValidationError[];
  addRule: (field: string, rule: FieldRule) => void;
  removeRule: (field: string) => void;
}

// ============ 预定义正则表达式 ============

const PATTERNS = {
  // 邮箱验证 (RFC 5322 简化版)
  email: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  
  // 中国大陆手机号
  phoneCN: /^1[3-9]\d{9}$/,
  
  // 国际手机号
  phoneIntl: /^\+?[1-9]\d{6,14}$/,
  
  // URL 验证
  url: /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/,
  
  // 中国大陆身份证 (18 位)
  idCardCN: /^[1-9]\d{5}(18|19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\d{3}[\dXx]$/,
  
  // IPv4 地址
  ipv4: /^(\d{1,3}\.){3}\d{1,3}$/,
  
  // 十六进制颜色
  hexColor: /^#?([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/,
  
  // 用户名 (字母开头，允许字母数字下划线)
  username: /^[a-zA-Z][a-zA-Z0-9_]{2,19}$/,
  
  // 密码强度 (至少包含大小写字母和数字)
  passwordStrong: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/,
  passwordMedium: /^(?=.*[a-zA-Z])(?=.*\d)[a-zA-Z\d]{6,}$/,
  
  // 日期格式 (YYYY-MM-DD)
  date: /^\d{4}-\d{2}-\d{2}$/,
  
  // 时间格式 (HH:MM:SS)
  time: /^\d{2}:\d{2}:\d{2}$/,
  
  // 日期时间格式
  dateTime: /^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}$/
};

// ============ 错误消息模板 ============

const ERROR_MESSAGES: Record<string, string> = {
  required: '字段 {field} 是必填项',
  type: '字段 {field} 的类型必须是 {type}',
  minLength: '字段 {field} 的长度不能少于 {min} 个字符',
  maxLength: '字段 {field} 的长度不能超过 {max} 个字符',
  min: '字段 {field} 的值不能小于 {min}',
  max: '字段 {field} 的值不能大于 {max}',
  pattern: '字段 {field} 的格式不正确',
  enum: '字段 {field} 的值必须在以下范围内：{enum}',
  email: '字段 {field} 必须是有效的邮箱地址',
  phone: '字段 {field} 必须是有效的手机号码',
  url: '字段 {field} 必须是有效的 URL 地址',
  idCard: '字段 {field} 必须是有效的身份证号',
  date: '字段 {field} 必须是有效的日期格式 (YYYY-MM-DD)',
  time: '字段 {field} 必须是有效的时间格式 (HH:MM:SS)',
  dateTime: '字段 {field} 必须是有效的日期时间格式',
  ipv4: '字段 {field} 必须是有效的 IPv4 地址',
  hexColor: '字段 {field} 必须是有效的十六进制颜色代码',
  username: '字段 {field} 必须是有效的用户名 (字母开头，3-20 位字母数字下划线)',
  passwordWeak: '密码强度太弱，建议包含大小写字母和数字，至少 8 位',
  custom: '字段 {field} 未通过自定义验证：{rule}'
};

// ============ 工具函数 ============

/**
 * 检查值是否为空
 */
function isEmpty(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
}

/**
 * 获取值的类型
 */
function getType(value: unknown): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value;
}

/**
 * 格式化错误消息
 */
function formatMessage(template: string, params: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => {
    return String(params[key] ?? '');
  });
}

/**
 * 验证邮箱格式
 */
function validateEmail(value: string): boolean {
  return PATTERNS.email.test(value);
}

/**
 * 验证手机号格式
 */
function validatePhone(value: string, intl: boolean = false): boolean {
  return intl ? PATTERNS.phoneIntl.test(value) : PATTERNS.phoneCN.test(value);
}

/**
 * 验证 URL 格式
 */
function validateURL(value: string): boolean {
  return PATTERNS.url.test(value);
}

/**
 * 验证身份证号 (中国大陆)
 */
function validateIDCard(value: string): boolean {
  if (!PATTERNS.idCardCN.test(value)) return false;
  
  // 验证校验码
  const weights = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2];
  const checkCodes = ['1', '0', 'X', '9', '8', '7', '6', '5', '4', '3', '2'];
  
  const sum = value.slice(0, 17).split('').reduce((acc, digit, idx) => {
    return acc + parseInt(digit) * weights[idx];
  }, 0);
  
  const checkCode = checkCodes[sum % 11];
  return checkCode === value.charAt(17).toUpperCase();
}

/**
 * 验证日期格式
 */
function validateDate(value: string): boolean {
  if (!PATTERNS.date.test(value)) return false;
  
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && 
         date.getMonth() === month - 1 && 
         date.getDate() === day;
}

/**
 * 验证时间格式
 */
function validateTime(value: string): boolean {
  if (!PATTERNS.time.test(value)) return false;
  
  const [hours, minutes, seconds] = value.split(':').map(Number);
  return hours >= 0 && hours <= 23 &&
         minutes >= 0 && minutes <= 59 &&
         seconds >= 0 && seconds <= 59;
}

/**
 * 验证 IPv4 地址
 */
function validateIPv4(value: string): boolean {
  if (!PATTERNS.ipv4.test(value)) return false;
  
  return value.split('.').every(part => {
    const num = parseInt(part);
    return num >= 0 && num <= 255;
  });
}

/**
 * 检查密码强度
 */
function checkPasswordStrength(password: string): 'weak' | 'medium' | 'strong' {
  if (PATTERNS.passwordStrong.test(password)) return 'strong';
  if (PATTERNS.passwordMedium.test(password)) return 'medium';
  return 'weak';
}

// ============ 核心验证器 ============

/**
 * 创建表单验证器
 */
function createValidator(schema: ValidatorSchema): ValidatorInstance {
  const rules = { ...schema.fields };
  
  /**
   * 验证单个字段
   */
  function validateField(
    field: string,
    value: unknown,
    data: Record<string, unknown>
  ): ValidationError[] {
    const errors: ValidationError[] = [];
    const rule = rules[field];
    
    if (!rule) {
      if (!schema.allowUnknown) {
        errors.push({
          field,
          code: 'unknown_field',
          message: `未知字段：${field}`
        });
      }
      return errors;
    }
    
    // 应用转换函数
    if (rule.transform && value !== undefined && value !== null) {
      value = rule.transform(value);
    }
    
    // 必填验证
    if (rule.required && isEmpty(value)) {
      errors.push({
        field,
        code: 'required',
        message: formatMessage(ERROR_MESSAGES.required, { field }),
        value,
        rule: 'required'
      });
      return errors; // 必填失败，不再继续验证
    }
    
    // 如果值为空且非必填，跳过后续验证
    if (isEmpty(value)) {
      return errors;
    }
    
    // 类型验证
    const actualType = getType(value);
    if (rule.type !== actualType) {
      // 特殊类型验证 (email, phone 等本质是 string)
      const specialTypes = ['email', 'phone', 'url', 'idCard', 'date', 'time', 'dateTime'];
      if (rule.type === 'string' && actualType === 'string') {
        // 类型匹配，继续格式验证
      } else if (specialTypes.includes(rule.type) && actualType === 'string') {
        // 特殊类型，继续格式验证
      } else {
        errors.push({
          field,
          code: 'type',
          message: formatMessage(ERROR_MESSAGES.type, { field, type: rule.type }),
          value,
          rule: 'type'
        });
        return errors;
      }
    }
    
    // 字符串长度验证
    if (typeof value === 'string') {
      const strValue = rule.trim ? value.trim() : value;
      
      if (rule.minLength !== undefined && strValue.length < rule.minLength) {
        errors.push({
          field,
          code: 'minLength',
          message: formatMessage(ERROR_MESSAGES.minLength, { field, min: rule.minLength }),
          value,
          rule: 'minLength'
        });
      }
      
      if (rule.maxLength !== undefined && strValue.length > rule.maxLength) {
        errors.push({
          field,
          code: 'maxLength',
          message: formatMessage(ERROR_MESSAGES.maxLength, { field, max: rule.maxLength }),
          value,
          rule: 'maxLength'
        });
      }
      
      // 格式验证
      if (rule.type === 'email' && !validateEmail(strValue)) {
        errors.push({
          field,
          code: 'email',
          message: formatMessage(ERROR_MESSAGES.email, { field }),
          value,
          rule: 'email'
        });
      }
      
      if (rule.type === 'phone' && !validatePhone(strValue)) {
        errors.push({
          field,
          code: 'phone',
          message: formatMessage(ERROR_MESSAGES.phone, { field }),
          value,
          rule: 'phone'
        });
      }
      
      if (rule.type === 'url' && !validateURL(strValue)) {
        errors.push({
          field,
          code: 'url',
          message: formatMessage(ERROR_MESSAGES.url, { field }),
          value,
          rule: 'url'
        });
      }
      
      if (rule.type === 'idCard' && !validateIDCard(strValue)) {
        errors.push({
          field,
          code: 'idCard',
          message: formatMessage(ERROR_MESSAGES.idCard, { field }),
          value,
          rule: 'idCard'
        });
      }
      
      if (rule.type === 'date' && !validateDate(strValue)) {
        errors.push({
          field,
          code: 'date',
          message: formatMessage(ERROR_MESSAGES.date, { field }),
          value,
          rule: 'date'
        });
      }
      
      if (rule.type === 'time' && !validateTime(strValue)) {
        errors.push({
          field,
          code: 'time',
          message: formatMessage(ERROR_MESSAGES.time, { field }),
          value,
          rule: 'time'
        });
      }
      
      if (rule.type === 'dateTime' && !validateDate(strValue.split(' ')[0])) {
        errors.push({
          field,
          code: 'dateTime',
          message: formatMessage(ERROR_MESSAGES.dateTime, { field }),
          value,
          rule: 'dateTime'
        });
      }
      
      // 正则表达式验证
      if (rule.pattern && !rule.pattern.test(strValue)) {
        errors.push({
          field,
          code: 'pattern',
          message: formatMessage(ERROR_MESSAGES.pattern, { field }),
          value,
          rule: 'pattern'
        });
      }
    }
    
    // 数字范围验证
    if (typeof value === 'number') {
      if (rule.min !== undefined && value < rule.min) {
        errors.push({
          field,
          code: 'min',
          message: formatMessage(ERROR_MESSAGES.min, { field, min: rule.min }),
          value,
          rule: 'min'
        });
      }
      
      if (rule.max !== undefined && value > rule.max) {
        errors.push({
          field,
          code: 'max',
          message: formatMessage(ERROR_MESSAGES.max, { field, max: rule.max }),
          value,
          rule: 'max'
        });
      }
    }
    
    // 枚举验证
    if (rule.enum && !rule.enum.includes(value)) {
      errors.push({
        field,
        code: 'enum',
        message: formatMessage(ERROR_MESSAGES.enum, { 
          field, 
          enum: rule.enum.join(', ') 
        }),
        value,
        rule: 'enum'
      });
    }
    
    // 自定义验证
    if (rule.custom) {
      const customError = rule.custom(value, field, data);
      if (customError) {
        errors.push({
          field,
          code: 'custom',
          message: formatMessage(ERROR_MESSAGES.custom, { field, rule: customError }),
          value,
          rule: 'custom'
        });
      }
    }
    
    return errors;
  }
  
  /**
   * 验证整个表单数据
   */
  function validate(data: Record<string, unknown>): ValidatorResult {
    const allErrors: ValidationError[] = [];
    const warnings: ValidatorWarning[] = [];
    
    // 验证所有定义的字段
    for (const [field, rule] of Object.entries(rules)) {
      const errors = validateField(field, data[field], data);
      allErrors.push(...errors);
    }
    
    // 严格模式下，检查是否有未定义的字段
    if (schema.strict) {
      for (const field of Object.keys(data)) {
        if (!rules[field]) {
          allErrors.push({
            field,
            code: 'unknown_field',
            message: `未知字段：${field}`,
            value: data[field]
          });
        }
      }
    }
    
    return {
      valid: allErrors.length === 0,
      errors: allErrors,
      warnings: warnings.length > 0 ? warnings : undefined
    };
  }
  
  /**
   * 添加字段规则
   */
  function addRule(field: string, rule: FieldRule): void {
    rules[field] = rule;
  }
  
  /**
   * 移除字段规则
   */
  function removeRule(field: string): void {
    delete rules[field];
  }
  
  return {
    validate,
    validateField,
    addRule,
    removeRule
  };
}

/**
 * 快速验证单个字段
 */
function validateField(
  field: string,
  value: unknown,
  rule: FieldRule
): { valid: boolean; errors: ValidationError[] } {
  const schema: ValidatorSchema = {
    fields: { [field]: rule }
  };
  
  const validator = createValidator(schema);
  const errors = validator.validateField(field, value, { [field]: value });
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * 快速验证多个字段
 */
function validate(
  data: Record<string, unknown>,
  schema: ValidatorSchema
): ValidatorResult {
  const validator = createValidator(schema);
  return validator.validate(data);
}

/**
 * 验证并抛出异常
 */
function validateOrThrow(
  data: Record<string, unknown>,
  schema: ValidatorSchema
): void {
  const result = validate(data, schema);
  
  if (!result.valid) {
    const errorMessages = result.errors.map(e => e.message).join('; ');
    throw new Error(`表单验证失败：${errorMessages}`);
  }
}

// ============ 预定义规则模板 ============

const PredefinedRules = {
  /** 邮箱字段 */
  email: (required: boolean = true): FieldRule => ({
    type: 'email',
    required,
    maxLength: 255
  }),
  
  /** 手机号字段 (中国大陆) */
  phoneCN: (required: boolean = true): FieldRule => ({
    type: 'phone',
    required,
    length: 11
  }),
  
  /** URL 字段 */
  url: (required: boolean = false): FieldRule => ({
    type: 'url',
    required,
    maxLength: 2048
  }),
  
  /** 身份证字段 */
  idCard: (required: boolean = false): FieldRule => ({
    type: 'idCard',
    required,
    length: 18
  }),
  
  /** 用户名字段 */
  username: (required: boolean = true): FieldRule => ({
    type: 'string',
    required,
    minLength: 3,
    maxLength: 20,
    pattern: PATTERNS.username
  }),
  
  /** 密码字段 (强) */
  passwordStrong: (required: boolean = true): FieldRule => ({
    type: 'string',
    required,
    minLength: 8,
    maxLength: 64,
    custom: (value) => {
      if (typeof value !== 'string') return '类型错误';
      const strength = checkPasswordStrength(value);
      if (strength === 'weak') return '密码强度太弱';
      return null;
    }
  }),
  
  /** 密码字段 (中) */
  passwordMedium: (required: boolean = true): FieldRule => ({
    type: 'string',
    required,
    minLength: 6,
    maxLength: 64,
    custom: (value) => {
      if (typeof value !== 'string') return '类型错误';
      const strength = checkPasswordStrength(value);
      if (strength === 'weak') return '密码强度太弱';
      return null;
    }
  }),
  
  /** 日期字段 */
  date: (required: boolean = false): FieldRule => ({
    type: 'date',
    required
  }),
  
  /** 整数字段 */
  integer: (min?: number, max?: number): FieldRule => ({
    type: 'number',
    min,
    max,
    custom: (value) => {
      if (typeof value !== 'number') return '类型错误';
      if (!Number.isInteger(value)) return '必须是整数';
      return null;
    }
  }),
  
  /** 百分比字段 (0-100) */
  percentage: (): FieldRule => ({
    type: 'number',
    min: 0,
    max: 100
  }),
  
  /** 颜色字段 (十六进制) */
  hexColor: (required: boolean = false): FieldRule => ({
    type: 'string',
    required,
    pattern: PATTERNS.hexColor
  }),
  
  /** IPv4 地址字段 */
  ipv4: (required: boolean = false): FieldRule => ({
    type: 'string',
    required,
    pattern: PATTERNS.ipv4
  })
};

// ============ 导出 ============

export {
  // 核心函数
  createValidator,
  validate,
  validateField,
  validateOrThrow,
  
  // 预定义规则
  PredefinedRules,
  
  // 工具函数
  isEmpty,
  getType,
  validateEmail,
  validatePhone,
  validateURL,
  validateIDCard,
  validateDate,
  validateTime,
  validateIPv4,
  checkPasswordStrength,
  
  // 类型
  type ValidatorResult,
  type ValidationError,
  type ValidatorWarning,
  type FieldRule,
  type ValidatorSchema,
  type ValidatorInstance
};
