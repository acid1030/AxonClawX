/**
 * 数据验证技能 - Validation Skill
 * 
 * 功能:
 * 1. Schema 验证 - 基于 JSON Schema 的数据结构验证
 * 2. 自定义验证规则 - 支持业务逻辑验证
 * 3. 错误消息格式化 - 友好的错误提示
 */

// ============ 类型定义 ============

/** 验证错误信息 */
interface ValidationError {
  field: string;
  message: string;
  code: string;
  value?: unknown;
}

/** 验证结果 */
interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  data?: unknown;
}

/** Schema 字段定义 */
interface SchemaField {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'null';
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  enum?: unknown[];
  items?: SchemaField;
  properties?: Record<string, SchemaField>;
  customRules?: CustomRule[];
}

/** 自定义验证规则 */
interface CustomRule {
  name: string;
  validator: (value: unknown, data: Record<string, unknown>) => boolean | string;
  message: string;
}

/** Schema 定义 */
interface Schema {
  fields: Record<string, SchemaField>;
  strict?: boolean;
}

// ============ 验证器类 ============

class DataValidator {
  private schema: Schema;
  private customRules: Map<string, CustomRule> = new Map();

  constructor(schema: Schema) {
    this.schema = schema;
  }

  /**
   * 注册自定义验证规则
   */
  registerRule(name: string, rule: CustomRule): void {
    this.customRules.set(name, rule);
  }

  /**
   * 验证数据
   */
  validate(data: Record<string, unknown>): ValidationResult {
    const errors: ValidationError[] = [];

    // 检查是否允许额外字段
    if (this.schema.strict) {
      const allowedFields = Object.keys(this.schema.fields);
      const actualFields = Object.keys(data);
      
      for (const field of actualFields) {
        if (!allowedFields.includes(field)) {
          errors.push({
            field,
            message: `不允许的字段：${field}`,
            code: 'UNKNOWN_FIELD',
            value: data[field]
          });
        }
      }
    }

    // 验证每个字段
    for (const [fieldName, fieldDef] of Object.entries(this.schema.fields)) {
      const value = data[fieldName];
      
      // 必填检查
      if (fieldDef.required && (value === undefined || value === null)) {
        errors.push({
          field: fieldName,
          message: `${fieldName} 是必填字段`,
          code: 'REQUIRED',
          value
        });
        continue;
      }

      // 如果值不存在且非必填，跳过
      if (value === undefined || value === null) {
        continue;
      }

      // 类型检查
      if (!this.checkType(value, fieldDef.type)) {
        errors.push({
          field: fieldName,
          message: `${fieldName} 类型错误，期望 ${fieldDef.type}，实际 ${this.getType(value)}`,
          code: 'TYPE_MISMATCH',
          value
        });
        continue;
      }

      // 字符串验证
      if (fieldDef.type === 'string' && typeof value === 'string') {
        if (fieldDef.minLength !== undefined && value.length < fieldDef.minLength) {
          errors.push({
            field: fieldName,
            message: `${fieldName} 长度不能少于 ${fieldDef.minLength} 个字符`,
            code: 'MIN_LENGTH',
            value
          });
        }
        if (fieldDef.maxLength !== undefined && value.length > fieldDef.maxLength) {
          errors.push({
            field: fieldName,
            message: `${fieldName} 长度不能超过 ${fieldDef.maxLength} 个字符`,
            code: 'MAX_LENGTH',
            value
          });
        }
        if (fieldDef.pattern && !fieldDef.pattern.test(value)) {
          errors.push({
            field: fieldName,
            message: `${fieldName} 格式不正确`,
            code: 'PATTERN_MISMATCH',
            value
          });
        }
      }

      // 数字验证
      if (fieldDef.type === 'number' && typeof value === 'number') {
        if (fieldDef.min !== undefined && value < fieldDef.min) {
          errors.push({
            field: fieldName,
            message: `${fieldName} 不能小于 ${fieldDef.min}`,
            code: 'MIN_VALUE',
            value
          });
        }
        if (fieldDef.max !== undefined && value > fieldDef.max) {
          errors.push({
            field: fieldName,
            message: `${fieldName} 不能大于 ${fieldDef.max}`,
            code: 'MAX_VALUE',
            value
          });
        }
      }

      // 枚举验证
      if (fieldDef.enum && !fieldDef.enum.includes(value)) {
        errors.push({
          field: fieldName,
          message: `${fieldName} 必须是以下值之一：${fieldDef.enum.join(', ')}`,
          code: 'ENUM_MISMATCH',
          value
        });
      }

      // 数组验证
      if (fieldDef.type === 'array' && Array.isArray(value) && fieldDef.items) {
        value.forEach((item, index) => {
          const itemResult = this.validateField(item, fieldDef.items!, `${fieldName}[${index}]`);
          errors.push(...itemResult);
        });
      }

      // 对象验证
      if (fieldDef.type === 'object' && typeof value === 'object' && fieldDef.properties) {
        const nestedSchema: Schema = { fields: fieldDef.properties };
        const nestedValidator = new DataValidator(nestedSchema);
        const nestedResult = nestedValidator.validate(value as Record<string, unknown>);
        
        nestedResult.errors.forEach(err => {
          errors.push({
            ...err,
            field: `${fieldName}.${err.field}`
          });
        });
      }

      // 自定义规则验证
      if (fieldDef.customRules) {
        for (const rule of fieldDef.customRules) {
          const result = rule.validator(value, data);
          if (result !== true) {
            errors.push({
              field: fieldName,
              message: typeof result === 'string' ? result : rule.message,
              code: `CUSTOM_${rule.name.toUpperCase()}`,
              value
            });
          }
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      data: errors.length === 0 ? data : undefined
    };
  }

  /**
   * 验证单个字段
   */
  private validateField(value: unknown, fieldDef: SchemaField, fieldName: string): ValidationError[] {
    const errors: ValidationError[] = [];

    // 必填检查
    if (fieldDef.required && (value === undefined || value === null)) {
      errors.push({
        field: fieldName,
        message: `${fieldName} 是必填字段`,
        code: 'REQUIRED',
        value
      });
      return errors;
    }

    if (value === undefined || value === null) {
      return errors;
    }

    // 类型检查
    if (!this.checkType(value, fieldDef.type)) {
      errors.push({
        field: fieldName,
        message: `${fieldName} 类型错误，期望 ${fieldDef.type}，实际 ${this.getType(value)}`,
        code: 'TYPE_MISMATCH',
        value
      });
      return errors;
    }

    // 字符串验证
    if (fieldDef.type === 'string' && typeof value === 'string') {
      if (fieldDef.minLength !== undefined && value.length < fieldDef.minLength) {
        errors.push({
          field: fieldName,
          message: `${fieldName} 长度不能少于 ${fieldDef.minLength} 个字符`,
          code: 'MIN_LENGTH',
          value
        });
      }
      if (fieldDef.maxLength !== undefined && value.length > fieldDef.maxLength) {
        errors.push({
          field: fieldName,
          message: `${fieldName} 长度不能超过 ${fieldDef.maxLength} 个字符`,
          code: 'MAX_LENGTH',
          value
        });
      }
    }

    // 自定义规则
    if (fieldDef.customRules) {
      for (const rule of fieldDef.customRules) {
        const result = rule.validator(value, {});
        if (result !== true) {
          errors.push({
            field: fieldName,
            message: typeof result === 'string' ? result : rule.message,
            code: `CUSTOM_${rule.name.toUpperCase()}`,
            value
          });
        }
      }
    }

    return errors;
  }

  /**
   * 检查类型
   */
  private checkType(value: unknown, expectedType: string): boolean {
    const actualType = this.getType(value);
    
    if (expectedType === 'null') {
      return value === null;
    }
    
    if (expectedType === 'array') {
      return Array.isArray(value);
    }
    
    if (expectedType === 'object') {
      return typeof value === 'object' && value !== null && !Array.isArray(value);
    }
    
    return actualType === expectedType;
  }

  /**
   * 获取实际类型
   */
  private getType(value: unknown): string {
    if (value === null) return 'null';
    if (Array.isArray(value)) return 'array';
    return typeof value;
  }
}

// ============ 错误消息格式化器 ============

class ErrorFormatter {
  /**
   * 格式化验证错误为友好消息
   */
  static format(errors: ValidationError[], options: FormatOptions = {}): string {
    const { 
      prefix = '验证失败：\n',
      format = 'list',
      includeCode = false,
      includeValue = false
    } = options;

    if (errors.length === 0) {
      return '验证通过 ✓';
    }

    switch (format) {
      case 'list':
        return this.formatAsList(errors, prefix, includeCode, includeValue);
      case 'inline':
        return this.formatAsInline(errors, includeCode);
      case 'json':
        return JSON.stringify({ errors }, null, 2);
      case 'summary':
        return this.formatAsSummary(errors);
      default:
        return this.formatAsList(errors, prefix, includeCode, includeValue);
    }
  }

  private static formatAsList(
    errors: ValidationError[], 
    prefix: string, 
    includeCode: boolean, 
    includeValue: boolean
  ): string {
    return prefix + errors.map(err => {
      let line = `• ${err.field}: ${err.message}`;
      if (includeCode) line += ` [${err.code}]`;
      if (includeValue && err.value !== undefined) {
        line += ` (当前值：${this.stringifyValue(err.value)})`;
      }
      return line;
    }).join('\n');
  }

  private static formatAsInline(errors: ValidationError[], includeCode: boolean): string {
    return errors.map(err => {
      let msg = `${err.field}: ${err.message}`;
      if (includeCode) msg += ` [${err.code}]`;
      return msg;
    }).join('; ');
  }

  private static formatAsSummary(errors: ValidationError[]): string {
    const byField = new Map<string, number>();
    errors.forEach(err => {
      const rootField = err.field.split('.')[0];
      byField.set(rootField, (byField.get(rootField) || 0) + 1);
    });

    const summary = Array.from(byField.entries())
      .map(([field, count]) => `${field} (${count}个问题)`)
      .join(', ');

    return `验证失败：共 ${errors.length} 个错误 - ${summary}`;
  }

  private static stringifyValue(value: unknown): string {
    if (typeof value === 'string') {
      return `"${value.length > 50 ? value.substring(0, 50) + '...' : value}"`;
    }
    return String(value);
  }
}

interface FormatOptions {
  prefix?: string;
  format?: 'list' | 'inline' | 'json' | 'summary';
  includeCode?: boolean;
  includeValue?: boolean;
}

// ============ 预定义规则 ============

const PredefinedRules = {
  /** 邮箱验证 */
  email: {
    name: 'email',
    validator: (value: unknown) => {
      if (typeof value !== 'string') return false;
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(value) || '请输入有效的邮箱地址';
    },
    message: '请输入有效的邮箱地址'
  },

  /** 手机号验证 (中国大陆) */
  phone: {
    name: 'phone',
    validator: (value: unknown) => {
      if (typeof value !== 'string') return false;
      const phoneRegex = /^1[3-9]\d{9}$/;
      return phoneRegex.test(value) || '请输入有效的手机号码';
    },
    message: '请输入有效的手机号码'
  },

  /** 身份证验证 (中国大陆) */
  idCard: {
    name: 'idCard',
    validator: (value: unknown) => {
      if (typeof value !== 'string') return false;
      const idCardRegex = /^[1-9]\d{5}(18|19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\d{3}[\dXx]$/;
      return idCardRegex.test(value) || '请输入有效的身份证号码';
    },
    message: '请输入有效的身份证号码'
  },

  /** URL 验证 */
  url: {
    name: 'url',
    validator: (value: unknown) => {
      if (typeof value !== 'string') return false;
      try {
        new URL(value);
        return true;
      } catch {
        return '请输入有效的 URL 地址';
      }
    },
    message: '请输入有效的 URL 地址'
  },

  /** 密码强度验证 */
  passwordStrength: {
    name: 'passwordStrength',
    validator: (value: unknown) => {
      if (typeof value !== 'string') return false;
      if (value.length < 8) return '密码长度至少 8 位';
      if (!/[A-Z]/.test(value)) return '密码必须包含大写字母';
      if (!/[a-z]/.test(value)) return '密码必须包含小写字母';
      if (!/[0-9]/.test(value)) return '密码必须包含数字';
      return true;
    },
    message: '密码强度不足'
  },

  /** 年龄范围验证 */
  ageRange: (min: number, max: number) => ({
    name: 'ageRange',
    validator: (value: unknown) => {
      if (typeof value !== 'number') return false;
      if (value < min || value > max) return `年龄必须在 ${min}-${max} 岁之间`;
      return true;
    },
    message: `年龄必须在 ${min}-${max} 岁之间`
  }),

  /** 字段依赖验证 */
  dependsOn: (fieldName: string, condition: (value: unknown, dependencyValue: unknown) => boolean | string, message: string) => ({
    name: 'dependsOn',
    validator: (value: unknown, data: Record<string, unknown>) => {
      const dependencyValue = data[fieldName];
      const result = condition(value, dependencyValue);
      return result === true ? true : (typeof result === 'string' ? result : message);
    },
    message
  })
};

// ============ 导出 ============

export {
  DataValidator,
  ErrorFormatter,
  PredefinedRules,
  type Schema,
  type SchemaField,
  type CustomRule,
  type ValidationError,
  type ValidationResult,
  type FormatOptions
};

// ============ 工厂函数 ============

/**
 * 创建验证器
 */
function createValidator(schema: Schema): DataValidator {
  return new DataValidator(schema);
}

/**
 * 快速验证
 */
function validate(data: Record<string, unknown>, schema: Schema): ValidationResult {
  const validator = createValidator(schema);
  return validator.validate(data);
}

/**
 * 验证并抛出异常
 */
function validateOrThrow(data: Record<string, unknown>, schema: Schema): void {
  const result = validate(data, schema);
  if (!result.valid) {
    throw new ValidationException(result.errors);
  }
}

class ValidationException extends Error {
  constructor(public errors: ValidationError[]) {
    super(`验证失败：${errors.length} 个错误`);
    this.name = 'ValidationException';
  }

  format(options?: FormatOptions): string {
    return ErrorFormatter.format(this.errors, options);
  }
}

export { createValidator, validate, validateOrThrow, ValidationException };
