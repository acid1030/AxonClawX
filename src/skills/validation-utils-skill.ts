/**
 * Validation Utils Skill - 数据验证工具
 * 
 * 功能:
 * 1. 表单验证 - 字段级验证、跨字段验证、异步验证
 * 2. Schema 验证 - JSON Schema 兼容、自定义 Schema、嵌套验证
 * 3. 自定义规则 - 规则组合、条件验证、动态规则
 * 
 * @author Axon (KAEL Engineering)
 * @version 1.0.0
 * @dependencies 无 (纯 TypeScript，无外部依赖)
 */

// ============== 类型定义 ==============

/** 验证结果 */
export interface ValidationResult {
  /** 是否通过验证 */
  valid: boolean;
  /** 错误信息列表 */
  errors: ValidationError[];
  /** 验证通过的数据 (可能经过转换/清理) */
  data?: any;
  /** 警告信息 (非阻塞) */
  warnings?: string[];
}

/** 验证错误 */
export interface ValidationError {
  /** 错误字段路径 (支持嵌套，如 'user.email') */
  field: string;
  /** 错误类型 */
  type: string;
  /** 错误消息 */
  message: string;
  /** 实际值 */
  value?: any;
  /** 期望值/规则 */
  expected?: any;
  /** 错误参数 */
  params?: Record<string, any>;
}

/** 基础验证规则 */
export interface ValidationRule {
  /** 规则名称 */
  name: string;
  /** 验证函数 */
  validator: (value: any, context?: ValidationContext) => boolean | string | Promise<boolean | string>;
  /** 错误消息 (支持 {value}, {expected} 占位符) */
  message: string;
  /** 规则参数 */
  params?: any;
  /** 是否跳过空值 (默认: false) */
  skipEmpty?: boolean;
  /** 验证级别 (error/warning) */
  level?: 'error' | 'warning';
}

/** 验证上下文 */
export interface ValidationContext {
  /** 完整表单数据 */
  formData: Record<string, any>;
  /** 当前字段名 */
  fieldName: string;
  /** 其他已验证字段的结果 */
  validatedFields: Record<string, any>;
  /** 自定义元数据 */
  metadata?: Record<string, any>;
}

/** 字段验证配置 */
export interface FieldValidationConfig {
  /** 字段名称 */
  field: string;
  /** 显示名称 (用于错误消息) */
  label?: string;
  /** 验证规则列表 */
  rules: ValidationRule[];
  /** 是否必填 (默认: false) */
  required?: boolean;
  /** 默认值 */
  defaultValue?: any;
  /** 值转换函数 */
  transform?: (value: any) => any;
  /** 依赖的其他字段 */
  dependsOn?: string[];
}

/** Schema 类型定义 */
export type SchemaType = 
  | 'string'
  | 'number'
  | 'integer'
  | 'boolean'
  | 'array'
  | 'object'
  | 'null'
  | 'date'
  | 'email'
  | 'url'
  | 'phone'
  | 'uuid';

/** Schema 字段配置 */
export interface SchemaFieldConfig {
  /** 字段类型 */
  type: SchemaType | SchemaType[];
  /** 字段描述 */
  description?: string;
  /** 是否必填 */
  required?: boolean;
  /** 默认值 */
  default?: any;
  /** 枚举值 (可选) */
  enum?: any[];
  /** 最小值 (number/string/array) */
  min?: number;
  /** 最大值 (number/string/array) */
  max?: number;
  /** 正则表达式 (string) */
  pattern?: string | RegExp;
  /** 嵌套 Schema (object) */
  properties?: Record<string, SchemaFieldConfig>;
  /** 数组项 Schema (array) */
  items?: SchemaFieldConfig;
  /** 自定义验证规则 */
  customRules?: ValidationRule[];
  /** 是否允许为空 */
  nullable?: boolean;
  /** 是否只读 */
  readonly?: boolean;
  /** 是否隐藏 */
  hidden?: boolean;
}

/** Schema 配置 */
export interface SchemaConfig {
  /** Schema 名称 */
  name: string;
  /** Schema 版本 */
  version?: string;
  /** 字段定义 */
  fields: Record<string, SchemaFieldConfig>;
  /** 是否允许额外字段 (默认: false) */
  allowAdditionalFields?: boolean;
  /** 自定义验证规则 (跨字段) */
  customRules?: ValidationRule[];
  /** 严格模式 (默认: true) */
  strict?: boolean;
}

/** 表单验证配置 */
export interface FormValidationConfig {
  /** 表单名称 */
  name: string;
  /** 字段验证配置 */
  fields: FieldValidationConfig[];
  /** 验证模式 (all/firstError) */
  mode?: 'all' | 'firstError';
  /** 是否实时验证 (默认: false) */
  realtime?: boolean;
  /** 验证触发事件 (blur/change/submit) */
  validateOn?: ('blur' | 'change' | 'submit')[];
  /** 自定义错误消息 */
  customMessages?: Record<string, string>;
}

// ============== 内置验证规则 ==============

/** 内置规则工厂 */
export const BuiltInRules = {
  /** 必填 */
  required: (): ValidationRule => ({
    name: 'required',
    validator: (value) => {
      if (value === null || value === undefined) return false;
      if (typeof value === 'string') return value.trim() !== '';
      if (Array.isArray(value)) return value.length > 0;
      return true;
    },
    message: '{field} 是必填项',
    level: 'error',
  }),

  /** 邮箱验证 */
  email: (): ValidationRule => ({
    name: 'email',
    validator: (value) => {
      if (!value) return true;
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(value);
    },
    message: '{field} 必须是有效的邮箱地址',
    skipEmpty: true,
    level: 'error',
  }),

  /** 手机号验证 (中国) */
  phone: (): ValidationRule => ({
    name: 'phone',
    validator: (value) => {
      if (!value) return true;
      const phoneRegex = /^1[3-9]\d{9}$/;
      return phoneRegex.test(value);
    },
    message: '{field} 必须是有效的手机号',
    skipEmpty: true,
    level: 'error',
  }),

  /** URL 验证 */
  url: (): ValidationRule => ({
    name: 'url',
    validator: (value) => {
      if (!value) return true;
      try {
        new URL(value);
        return true;
      } catch {
        return false;
      }
    },
    message: '{field} 必须是有效的 URL',
    skipEmpty: true,
    level: 'error',
  }),

  /** 最小长度 */
  minLength: (min: number): ValidationRule => ({
    name: 'minLength',
    validator: (value) => {
      if (!value) return true;
      return String(value).length >= min;
    },
    message: `{field} 长度不能少于 ${min} 个字符`,
    params: { min },
    skipEmpty: true,
    level: 'error',
  }),

  /** 最大长度 */
  maxLength: (max: number): ValidationRule => ({
    name: 'maxLength',
    validator: (value) => {
      if (!value) return true;
      return String(value).length <= max;
    },
    message: `{field} 长度不能超过 ${max} 个字符`,
    params: { max },
    skipEmpty: true,
    level: 'error',
  }),

  /** 最小值 */
  minValue: (min: number): ValidationRule => ({
    name: 'minValue',
    validator: (value) => {
      if (value === null || value === undefined) return true;
      return Number(value) >= min;
    },
    message: `{field} 不能小于 ${min}`,
    params: { min },
    skipEmpty: true,
    level: 'error',
  }),

  /** 最大值 */
  maxValue: (max: number): ValidationRule => ({
    name: 'maxValue',
    validator: (value) => {
      if (value === null || value === undefined) return true;
      return Number(value) <= max;
    },
    message: `{field} 不能大于 ${max}`,
    params: { max },
    skipEmpty: true,
    level: 'error',
  }),

  /** 正则表达式 */
  pattern: (regex: RegExp | string, message: string): ValidationRule => ({
    name: 'pattern',
    validator: (value) => {
      if (!value) return true;
      const re = typeof regex === 'string' ? new RegExp(regex) : regex;
      return re.test(value);
    },
    message,
    params: { pattern: regex },
    skipEmpty: true,
    level: 'error',
  }),

  /** 枚举值 */
  enum: (values: any[]): ValidationRule => ({
    name: 'enum',
    validator: (value) => {
      if (!value) return true;
      return values.includes(value);
    },
    message: `{field} 必须是以下值之一：${values.join(', ')}`,
    params: { values },
    skipEmpty: true,
    level: 'error',
  }),

  /** 自定义函数 */
  custom: (
    validator: (value: any, context?: ValidationContext) => boolean | string,
    message: string
  ): ValidationRule => ({
    name: 'custom',
    validator,
    message,
    level: 'error',
  }),

  /** 异步验证 */
  async: (
    validator: (value: any, context?: ValidationContext) => Promise<boolean | string>,
    message: string
  ): ValidationRule => ({
    name: 'async',
    validator,
    message,
    level: 'error',
  }),

  /** 字段匹配 */
  matchesField: (targetField: string): ValidationRule => ({
    name: 'matchesField',
    validator: (value, context) => {
      if (!value) return true;
      const targetValue = context?.formData[targetField];
      return value === targetValue;
    },
    message: `{field} 必须与 ${targetField} 一致`,
    params: { targetField },
    skipEmpty: true,
    level: 'error',
  }),

  /** 条件验证 */
  when: (
    condition: (formData: Record<string, any>) => boolean,
    rules: ValidationRule[]
  ): ValidationRule => ({
    name: 'when',
    validator: (value, context) => {
      if (!condition(context?.formData || {})) return true;
      for (const rule of rules) {
        const result = rule.validator(value, context);
        if (result === false || typeof result === 'string') {
          return result;
        }
      }
      return true;
    },
    message: '条件验证失败',
    params: { rules },
    level: 'error',
  }),
};

// ============== 验证器类 ==============

/** 表单验证器 */
export class FormValidator {
  private config: FormValidationConfig;
  private fieldConfigs: Map<string, FieldValidationConfig>;

  constructor(config: FormValidationConfig) {
    this.config = {
      mode: 'all',
      validateOn: ['submit'],
      ...config,
    };
    this.fieldConfigs = new Map(
      config.fields.map((f) => [f.field, f])
    );
  }

  /**
   * 验证单个字段
   */
  async validateField(
    fieldName: string,
    value: any,
    formData: Record<string, any>
  ): Promise<ValidationResult> {
    const fieldConfig = this.fieldConfigs.get(fieldName);
    if (!fieldConfig) {
      return {
        valid: true,
        errors: [],
        data: value,
      };
    }

    const errors: ValidationError[] = [];
    const context: ValidationContext = {
      formData,
      fieldName,
      validatedFields: {},
    };

    // 应用值转换
    let transformedValue = value;
    if (fieldConfig.transform) {
      transformedValue = fieldConfig.transform(value);
    }

    // 必填检查
    if (fieldConfig.required) {
      const requiredRule = BuiltInRules.required();
      const isValid = requiredRule.validator(transformedValue);
      if (!isValid) {
        errors.push({
          field: fieldName,
          type: 'required',
          message: requiredRule.message.replace('{field}', fieldConfig.label || fieldName),
          value: transformedValue,
        });
      }
    }

    // 执行验证规则
    if (errors.length === 0 || !fieldConfig.required) {
      for (const rule of fieldConfig.rules) {
        if (rule.skipEmpty && (transformedValue === null || transformedValue === undefined || transformedValue === '')) {
          continue;
        }

        try {
          const result = await Promise.resolve(rule.validator(transformedValue, context));
          if (result === false || typeof result === 'string') {
            errors.push({
              field: fieldName,
              type: rule.name,
              message: typeof result === 'string' ? result : rule.message.replace('{field}', fieldConfig.label || fieldName),
              value: transformedValue,
              expected: rule.params,
            });

            if (this.config.mode === 'firstError') {
              break;
            }
          }
        } catch (error) {
          errors.push({
            field: fieldName,
            type: 'error',
            message: error instanceof Error ? error.message : '验证失败',
            value: transformedValue,
          });
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      data: transformedValue,
    };
  }

  /**
   * 验证整个表单
   */
  async validate(formData: Record<string, any>): Promise<ValidationResult> {
    const allErrors: ValidationError[] = [];
    const validatedData: Record<string, any> = {};

    // 验证每个字段
    for (const fieldConfig of this.config.fields) {
      const value = formData[fieldConfig.field];
      const result = await this.validateField(fieldConfig.field, value, formData);

      if (!result.valid) {
        allErrors.push(...result.errors);
        if (this.config.mode === 'firstError' && allErrors.length > 0) {
          break;
        }
      }

      validatedData[fieldConfig.field] = result.data ?? fieldConfig.defaultValue;
    }

    return {
      valid: allErrors.length === 0,
      errors: allErrors,
      data: validatedData,
    };
  }

  /**
   * 获取字段配置
   */
  getFieldConfig(fieldName: string): FieldValidationConfig | undefined {
    return this.fieldConfigs.get(fieldName);
  }

  /**
   * 添加字段验证规则
   */
  addField(field: FieldValidationConfig): void {
    this.fieldConfigs.set(field.field, field);
    const existingIndex = this.config.fields.findIndex((f) => f.field === field.field);
    if (existingIndex >= 0) {
      this.config.fields[existingIndex] = field;
    } else {
      this.config.fields.push(field);
    }
  }

  /**
   * 移除字段验证规则
   */
  removeField(fieldName: string): void {
    this.fieldConfigs.delete(fieldName);
    this.config.fields = this.config.fields.filter((f) => f.field !== fieldName);
  }
}

/** Schema 验证器 */
export class SchemaValidator {
  private schema: SchemaConfig;

  constructor(schema: SchemaConfig) {
    this.schema = {
      strict: true,
      allowAdditionalFields: false,
      ...schema,
    };
  }

  /**
   * 验证数据是否符合 Schema
   */
  async validate(data: Record<string, any>): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const validatedData: Record<string, any> = {};

    // 检查额外字段
    if (!this.schema.allowAdditionalFields && this.schema.strict) {
      const allowedFields = new Set(Object.keys(this.schema.fields));
      for (const key of Object.keys(data)) {
        if (!allowedFields.has(key)) {
          errors.push({
            field: key,
            type: 'additionalProperty',
            message: `不允许的字段：${key}`,
            value: data[key],
          });
        }
      }
    }

    // 验证每个字段
    for (const [fieldName, fieldConfig] of Object.entries(this.schema.fields)) {
      const value = data[fieldName];

      // 必填检查
      if (fieldConfig.required && (value === null || value === undefined)) {
        errors.push({
          field: fieldName,
          type: 'required',
          message: `${fieldName} 是必填项`,
          value: null,
        });
        continue;
      }

      // 跳过空值
      if (value === null || value === undefined) {
        if (fieldConfig.nullable || !fieldConfig.required) {
          validatedData[fieldName] = fieldConfig.default ?? null;
          continue;
        }
      }

      // 类型检查
      const typeError = this.validateType(fieldName, value, fieldConfig.type);
      if (typeError) {
        errors.push(typeError);
        continue;
      }

      // 枚举检查
      if (fieldConfig.enum && !fieldConfig.enum.includes(value)) {
        errors.push({
          field: fieldName,
          type: 'enum',
          message: `${fieldName} 必须是以下值之一：${fieldConfig.enum.join(', ')}`,
          value,
          expected: fieldConfig.enum,
        });
        continue;
      }

      // 范围检查
      if (fieldConfig.min !== undefined) {
        const minError = this.validateMin(fieldName, value, fieldConfig.min, fieldConfig.type);
        if (minError) errors.push(minError);
      }

      if (fieldConfig.max !== undefined) {
        const maxError = this.validateMax(fieldName, value, fieldConfig.max, fieldConfig.type);
        if (maxError) errors.push(maxError);
      }

      // 正则检查
      if (fieldConfig.pattern && typeof value === 'string') {
        const regex = typeof fieldConfig.pattern === 'string' 
          ? new RegExp(fieldConfig.pattern) 
          : fieldConfig.pattern;
        if (!regex.test(value)) {
          errors.push({
            field: fieldName,
            type: 'pattern',
            message: `${fieldName} 格式不正确`,
            value,
            expected: fieldConfig.pattern,
          });
        }
      }

      // 嵌套对象验证
      if (fieldConfig.type === 'object' && fieldConfig.properties) {
        const nestedValidator = new SchemaValidator({
          name: `${this.schema.name}.${fieldName}`,
          fields: fieldConfig.properties,
        });
        const nestedResult = await nestedValidator.validate(value);
        if (!nestedResult.valid) {
          errors.push(...nestedResult.errors.map((e) => ({
            ...e,
            field: `${fieldName}.${e.field}`,
          })));
        }
      }

      // 数组项验证
      if (fieldConfig.type === 'array' && fieldConfig.items && Array.isArray(value)) {
        for (let i = 0; i < value.length; i++) {
          const itemValidator = new SchemaValidator({
            name: `${this.schema.name}.${fieldName}[${i}]`,
            fields: { item: fieldConfig.items! },
          });
          const itemResult = await itemValidator.validate({ item: value[i] });
          if (!itemResult.valid) {
            errors.push(...itemResult.errors.map((e) => ({
              ...e,
              field: `${fieldName}[${i}]`,
            })));
          }
        }
      }

      // 自定义规则
      if (fieldConfig.customRules) {
        for (const rule of fieldConfig.customRules) {
          const result = await Promise.resolve(rule.validator(value));
          if (result === false || typeof result === 'string') {
            errors.push({
              field: fieldName,
              type: rule.name,
              message: typeof result === 'string' ? result : rule.message,
              value,
            });
          }
        }
      }

      validatedData[fieldName] = value ?? fieldConfig.default;
    }

    // Schema 级自定义规则
    if (this.schema.customRules) {
      const context: ValidationContext = {
        formData: data,
        fieldName: '_schema',
        validatedFields: validatedData,
      };
      for (const rule of this.schema.customRules) {
        const result = await Promise.resolve(rule.validator(data, context));
        if (result === false || typeof result === 'string') {
          errors.push({
            field: '_schema',
            type: rule.name,
            message: typeof result === 'string' ? result : rule.message,
            value: data,
          });
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      data: validatedData,
    };
  }

  /**
   * 类型验证
   */
  private validateType(
    fieldName: string,
    value: any,
    expectedTypes: SchemaType | SchemaType[]
  ): ValidationError | null {
    const types = Array.isArray(expectedTypes) ? expectedTypes : [expectedTypes];
    
    for (const type of types) {
      if (this.checkType(value, type)) {
        return null;
      }
    }

    return {
      field: fieldName,
      type: 'type',
      message: `${fieldName} 类型错误，期望：${types.join(' | ')}`,
      value,
      expected: types,
    };
  }

  /**
   * 检查单个类型
   */
  private checkType(value: any, type: SchemaType): boolean {
    switch (type) {
      case 'string':
        return typeof value === 'string';
      case 'number':
        return typeof value === 'number' && !isNaN(value);
      case 'integer':
        return typeof value === 'number' && Number.isInteger(value);
      case 'boolean':
        return typeof value === 'boolean';
      case 'array':
        return Array.isArray(value);
      case 'object':
        return typeof value === 'object' && value !== null && !Array.isArray(value);
      case 'null':
        return value === null;
      case 'date':
        return value instanceof Date || (typeof value === 'string' && !isNaN(Date.parse(value)));
      case 'email':
        return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
      case 'url':
        return typeof value === 'string' && (() => { try { new URL(value); return true; } catch { return false; } })();
      case 'phone':
        return typeof value === 'string' && /^1[3-9]\d{9}$/.test(value);
      case 'uuid':
        return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
      default:
        return false;
    }
  }

  /**
   * 最小值验证
   */
  private validateMin(
    fieldName: string,
    value: any,
    min: number,
    type: SchemaType | SchemaType[]
  ): ValidationError | null {
    if (value === null || value === undefined) return null;

    const isArray = Array.isArray(value);
    const isString = typeof value === 'string';
    const isNumber = typeof value === 'number';

    if (isArray && value.length < min) {
      return {
        field: fieldName,
        type: 'minItems',
        message: `${fieldName} 至少需要 ${min} 项`,
        value,
        expected: { min },
      };
    }

    if (isString && value.length < min) {
      return {
        field: fieldName,
        type: 'minLength',
        message: `${fieldName} 长度不能少于 ${min} 个字符`,
        value,
        expected: { min },
      };
    }

    if (isNumber && value < min) {
      return {
        field: fieldName,
        type: 'minimum',
        message: `${fieldName} 不能小于 ${min}`,
        value,
        expected: { min },
      };
    }

    return null;
  }

  /**
   * 最大值验证
   */
  private validateMax(
    fieldName: string,
    value: any,
    max: number,
    type: SchemaType | SchemaType[]
  ): ValidationError | null {
    if (value === null || value === undefined) return null;

    const isArray = Array.isArray(value);
    const isString = typeof value === 'string';
    const isNumber = typeof value === 'number';

    if (isArray && value.length > max) {
      return {
        field: fieldName,
        type: 'maxItems',
        message: `${fieldName} 不能超过 ${max} 项`,
        value,
        expected: { max },
      };
    }

    if (isString && value.length > max) {
      return {
        field: fieldName,
        type: 'maxLength',
        message: `${fieldName} 长度不能超过 ${max} 个字符`,
        value,
        expected: { max },
      };
    }

    if (isNumber && value > max) {
      return {
        field: fieldName,
        type: 'maximum',
        message: `${fieldName} 不能大于 ${max}`,
        value,
        expected: { max },
      };
    }

    return null;
  }

  /**
   * 获取 Schema 信息
   */
  getSchema(): SchemaConfig {
    return this.schema;
  }
}

// ============== 工具函数 ==============

/**
 * 创建表单验证器
 */
export function createFormValidator(config: FormValidationConfig): FormValidator {
  return new FormValidator(config);
}

/**
 * 创建 Schema 验证器
 */
export function createSchemaValidator(schema: SchemaConfig): SchemaValidator {
  return new SchemaValidator(schema);
}

/**
 * 快速验证 (简单场景)
 */
export async function validate(
  data: Record<string, any>,
  rules: Record<string, ValidationRule[]>
): Promise<ValidationResult> {
  const validator = createFormValidator({
    name: 'quick',
    fields: Object.entries(rules).map(([field, ruleSet]) => ({
      field,
      rules: ruleSet,
    })),
  });
  return validator.validate(data);
}

/**
 * 组合多个验证规则
 */
export function combineRules(...rules: ValidationRule[]): ValidationRule {
  return {
    name: 'combined',
    validator: async (value, context) => {
      for (const rule of rules) {
        const result = await Promise.resolve(rule.validator(value, context));
        if (result === false || typeof result === 'string') {
          return result;
        }
      }
      return true;
    },
    message: '验证失败',
  };
}

// ============== 导出 ==============
// 所有类型和类已通过 inline export 导出
