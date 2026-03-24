/**
 * 输入验证技能 - Validate Input Skill
 * 
 * 功能:
 * 1. 邮箱/手机/身份证验证
 * 2. 密码强度检查
 * 3. 自定义验证规则
 * 
 * 使用示例:
 * ```typescript
 * import { InputValidator, ValidationRules, PasswordStrength } from './validate-input-skill';
 * 
 * // 邮箱验证
 * const emailResult = InputValidator.validateEmail('test@example.com');
 * console.log(emailResult); // { valid: true, value: 'test@example.com' }
 * 
 * // 手机验证
 * const phoneResult = InputValidator.validatePhone('13812345678');
 * 
 * // 身份证验证
 * const idResult = InputValidator.validateIdCard('110101199001011234');
 * 
 * // 密码强度检查
 * const pwdResult = InputValidator.checkPasswordStrength('MyP@ssw0rd123');
 * console.log(pwdResult.level); // 'strong'
 * console.log(pwdResult.score); // 4
 * 
 * // 自定义规则
 * const customValidator = new InputValidator({
 *   username: { required: true, minLength: 3, maxLength: 20 },
 *   email: { required: true, rule: 'email' },
 *   phone: { rule: 'phone' }
 * });
 * 
 * const result = customValidator.validate({
 *   username: 'john',
 *   email: 'john@example.com',
 *   phone: '13812345678'
 * });
 * ```
 */

// ============ 类型定义 ============

/** 验证错误 */
interface InputValidationError {
  field: string;
  message: string;
  code: string;
  value?: unknown;
}

/** 验证结果 */
interface InputValidationResult {
  valid: boolean;
  errors: InputValidationError[];
  data?: Record<string, unknown>;
}

/** 密码强度等级 */
type PasswordStrengthLevel = 'weak' | 'medium' | 'strong' | 'very-strong';

/** 密码强度检查结果 */
interface PasswordStrengthResult {
  valid: boolean;
  level: PasswordStrengthLevel;
  score: number;
  checks: {
    minLength: boolean;
    hasUppercase: boolean;
    hasLowercase: boolean;
    hasNumber: boolean;
    hasSpecial: boolean;
  };
  suggestions: string[];
}

/** 字段验证规则 */
interface FieldRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  rule?: 'email' | 'phone' | 'idCard' | 'url' | 'custom';
  customValidator?: (value: unknown) => boolean | string;
  message?: string;
}

/** 验证规则配置 */
interface ValidationRulesConfig {
  [field: string]: FieldRule;
}

// ============ 验证规则实现 ============

const ValidationRules = {
  /** 邮箱验证正则 */
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  
  /** 中国大陆手机号正则 */
  phone: /^1[3-9]\d{9}$/,
  
  /** 中国大陆身份证正则 (18 位) */
  idCard: /^[1-9]\d{5}(18|19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\d{3}[\dXx]$/,
  
  /** URL 正则 */
  url: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/,
  
  /**
   * 验证邮箱
   */
  validateEmail(value: string): { valid: boolean; message?: string } {
    if (typeof value !== 'string') {
      return { valid: false, message: '邮箱必须是字符串' };
    }
    if (!this.email.test(value)) {
      return { valid: false, message: '请输入有效的邮箱地址' };
    }
    return { valid: true };
  },
  
  /**
   * 验证手机号 (中国大陆)
   */
  validatePhone(value: string): { valid: boolean; message?: string } {
    if (typeof value !== 'string') {
      return { valid: false, message: '手机号必须是字符串' };
    }
    if (!this.phone.test(value)) {
      return { valid: false, message: '请输入有效的中国大陆手机号码' };
    }
    return { valid: true };
  },
  
  /**
   * 验证身份证 (中国大陆)
   */
  validateIdCard(value: string): { valid: boolean; message?: string } {
    if (typeof value !== 'string') {
      return { valid: false, message: '身份证号必须是字符串' };
    }
    if (!this.idCard.test(value)) {
      return { valid: false, message: '请输入有效的中国大陆身份证号码' };
    }
    
    // 校验码验证
    const checkCode = this.calculateIdCardCheckCode(value.substring(0, 17));
    const actualCheckCode = value[17].toUpperCase();
    
    if (checkCode !== actualCheckCode && !(checkCode === 'X' && actualCheckCode === 'X')) {
      return { valid: false, message: '身份证号码校验码错误' };
    }
    
    return { valid: true };
  },
  
  /**
   * 计算身份证校验码
   */
  calculateIdCardCheckCode(body: string): string {
    const factors = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2];
    const checkCodes = ['1', '0', 'X', '9', '8', '7', '6', '5', '4', '3', '2'];
    
    let sum = 0;
    for (let i = 0; i < 17; i++) {
      sum += parseInt(body[i]) * factors[i];
    }
    
    return checkCodes[sum % 11];
  },
  
  /**
   * 验证 URL
   */
  validateUrl(value: string): { valid: boolean; message?: string } {
    if (typeof value !== 'string') {
      return { valid: false, message: 'URL 必须是字符串' };
    }
    if (!this.url.test(value)) {
      return { valid: false, message: '请输入有效的 URL 地址' };
    }
    try {
      new URL(value);
      return { valid: true };
    } catch {
      return { valid: false, message: 'URL 格式不正确' };
    }
  }
};

// ============ 密码强度检查器 ============

const PasswordStrength = {
  /** 最小长度要求 */
  minLength: 8,
  
  /**
   * 检查密码强度
   */
  check(password: string): PasswordStrengthResult {
    const checks = {
      minLength: password.length >= this.minLength,
      hasUppercase: /[A-Z]/.test(password),
      hasLowercase: /[a-z]/.test(password),
      hasNumber: /[0-9]/.test(password),
      hasSpecial: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
    };
    
    // 计算分数 (0-5)
    let score = 0;
    if (checks.minLength) score++;
    if (password.length >= 12) score++;
    if (checks.hasUppercase && checks.hasLowercase) score++;
    if (checks.hasNumber) score++;
    if (checks.hasSpecial) score++;
    
    // 确定等级
    let level: PasswordStrengthLevel;
    if (score <= 1) level = 'weak';
    else if (score <= 2) level = 'medium';
    else if (score <= 4) level = 'strong';
    else level = 'very-strong';
    
    // 生成建议
    const suggestions: string[] = [];
    if (!checks.minLength) suggestions.push('密码长度至少 8 位');
    if (!checks.hasUppercase) suggestions.push('添加大写字母');
    if (!checks.hasLowercase) suggestions.push('添加小写字母');
    if (!checks.hasNumber) suggestions.push('添加数字');
    if (!checks.hasSpecial) suggestions.push('添加特殊字符 (!@#$%^&*)');
    
    return {
      valid: score >= 3,
      level,
      score,
      checks,
      suggestions
    };
  },
  
  /**
   * 验证密码是否符合要求
   */
  validate(password: string, options: PasswordOptions = {}): { valid: boolean; message?: string } {
    const {
      minLength = 8,
      requireUppercase = true,
      requireLowercase = true,
      requireNumber = true,
      requireSpecial = false
    } = options;
    
    if (password.length < minLength) {
      return { valid: false, message: `密码长度至少 ${minLength} 位` };
    }
    
    if (requireUppercase && !/[A-Z]/.test(password)) {
      return { valid: false, message: '密码必须包含大写字母' };
    }
    
    if (requireLowercase && !/[a-z]/.test(password)) {
      return { valid: false, message: '密码必须包含小写字母' };
    }
    
    if (requireNumber && !/[0-9]/.test(password)) {
      return { valid: false, message: '密码必须包含数字' };
    }
    
    if (requireSpecial && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      return { valid: false, message: '密码必须包含特殊字符' };
    }
    
    return { valid: true };
  }
};

interface PasswordOptions {
  minLength?: number;
  requireUppercase?: boolean;
  requireLowercase?: boolean;
  requireNumber?: boolean;
  requireSpecial?: boolean;
}

// ============ 输入验证器类 ============

class InputValidator {
  private rules: ValidationRulesConfig;
  
  constructor(rules: ValidationRulesConfig = {}) {
    this.rules = rules;
  }
  
  /**
   * 验证单个邮箱
   */
  static validateEmail(email: string): { valid: boolean; value?: string; message?: string } {
    const result = ValidationRules.validateEmail(email);
    return {
      valid: result.valid,
      value: result.valid ? email : undefined,
      message: result.message
    };
  }
  
  /**
   * 验证单个手机号
   */
  static validatePhone(phone: string): { valid: boolean; value?: string; message?: string } {
    const result = ValidationRules.validatePhone(phone);
    return {
      valid: result.valid,
      value: result.valid ? phone : undefined,
      message: result.message
    };
  }
  
  /**
   * 验证单个身份证
   */
  static validateIdCard(idCard: string): { valid: boolean; value?: string; message?: string } {
    const result = ValidationRules.validateIdCard(idCard);
    return {
      valid: result.valid,
      value: result.valid ? idCard : undefined,
      message: result.message
    };
  }
  
  /**
   * 检查密码强度
   */
  static checkPasswordStrength(password: string): PasswordStrengthResult {
    return PasswordStrength.check(password);
  }
  
  /**
   * 验证密码
   */
  static validatePassword(password: string, options?: PasswordOptions): { valid: boolean; message?: string } {
    return PasswordStrength.validate(password, options);
  }
  
  /**
   * 验证表单数据
   */
  validate(data: Record<string, unknown>): InputValidationResult {
    const errors: InputValidationError[] = [];
    
    for (const [field, rule] of Object.entries(this.rules)) {
      const value = data[field];
      
      // 必填检查
      if (rule.required && (value === undefined || value === null || value === '')) {
        errors.push({
          field,
          message: rule.message || `${field} 是必填项`,
          code: 'REQUIRED',
          value
        });
        continue;
      }
      
      // 如果值不存在且非必填，跳过
      if (value === undefined || value === null || value === '') {
        continue;
      }
      
      // 长度检查
      if (typeof value === 'string') {
        if (rule.minLength !== undefined && value.length < rule.minLength) {
          errors.push({
            field,
            message: rule.message || `${field} 长度不能少于 ${rule.minLength} 个字符`,
            code: 'MIN_LENGTH',
            value
          });
          continue;
        }
        
        if (rule.maxLength !== undefined && value.length > rule.maxLength) {
          errors.push({
            field,
            message: rule.message || `${field} 长度不能超过 ${rule.maxLength} 个字符`,
            code: 'MAX_LENGTH',
            value
          });
          continue;
        }
      }
      
      // 预定义规则检查
      if (typeof value === 'string') {
        let ruleResult: { valid: boolean; message?: string };
        
        switch (rule.rule) {
          case 'email':
            ruleResult = ValidationRules.validateEmail(value);
            break;
          case 'phone':
            ruleResult = ValidationRules.validatePhone(value);
            break;
          case 'idCard':
            ruleResult = ValidationRules.validateIdCard(value);
            break;
          case 'url':
            ruleResult = ValidationRules.validateUrl(value);
            break;
          default:
            ruleResult = { valid: true };
        }
        
        if (!ruleResult.valid) {
          errors.push({
            field,
            message: rule.message || ruleResult.message || `${field} 格式不正确`,
            code: 'INVALID_FORMAT',
            value
          });
          continue;
        }
      }
      
      // 正则表达式检查
      if (rule.pattern && typeof value === 'string' && !rule.pattern.test(value)) {
        errors.push({
          field,
          message: rule.message || `${field} 格式不正确`,
          code: 'PATTERN_MISMATCH',
          value
        });
        continue;
      }
      
      // 自定义验证器
      if (rule.customValidator) {
        const customResult = rule.customValidator(value);
        if (customResult !== true) {
          errors.push({
            field,
            message: rule.message || (typeof customResult === 'string' ? customResult : `${field} 验证失败`),
            code: 'CUSTOM_VALIDATION_FAILED',
            value
          });
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
   * 添加规则
   */
  addRule(field: string, rule: FieldRule): void {
    this.rules[field] = rule;
  }
  
  /**
   * 移除规则
   */
  removeRule(field: string): void {
    delete this.rules[field];
  }
}

// ============ 便捷函数 ============

/**
 * 快速验证邮箱
 */
function validateEmail(email: string): boolean {
  return InputValidator.validateEmail(email).valid;
}

/**
 * 快速验证手机号
 */
function validatePhone(phone: string): boolean {
  return InputValidator.validatePhone(phone).valid;
}

/**
 * 快速验证身份证
 */
function validateIdCard(idCard: string): boolean {
  return InputValidator.validateIdCard(idCard).valid;
}

/**
 * 快速检查密码强度
 */
function checkPasswordStrength(password: string): PasswordStrengthLevel {
  return InputValidator.checkPasswordStrength(password).level;
}

/**
 * 创建验证器实例
 */
function createValidator(rules: ValidationRulesConfig): InputValidator {
  return new InputValidator(rules);
}

/**
 * 快速验证表单数据
 */
function validateInput(
  data: Record<string, unknown>,
  rules: ValidationRulesConfig
): InputValidationResult {
  const validator = createValidator(rules);
  return validator.validate(data);
}

// ============ 导出 ============

export {
  InputValidator,
  ValidationRules,
  PasswordStrength,
  type InputValidationError,
  type InputValidationResult,
  type PasswordStrengthLevel,
  type PasswordStrengthResult,
  type FieldRule,
  type ValidationRulesConfig,
  type PasswordOptions,
  validateEmail,
  validatePhone,
  validateIdCard,
  checkPasswordStrength,
  createValidator,
  validateInput
};
