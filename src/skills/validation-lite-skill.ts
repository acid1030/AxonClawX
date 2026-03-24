/**
 * 数据验证工具 - Validation Lite Skill
 * 
 * 轻量级数据验证工具，提供常用的数据验证功能
 * 
 * 功能:
 * 1. 邮箱/手机/URL 验证
 * 2. 身份证/信用卡验证
 * 3. 密码强度检查
 * 
 * @version 1.0.0
 * @author AxonClaw
 */

// ============ 类型定义 ============

/** 验证结果 */
interface ValidationLiteResult {
  valid: boolean;
  message?: string;
  details?: ValidationLiteDetails;
}

/** 验证详细信息 */
interface ValidationLiteDetails {
  format?: boolean;
  strength?: 'weak' | 'medium' | 'strong';
  score?: number;
  issues?: string[];
  suggestions?: string[];
}

/** 密码强度等级 */
type PasswordStrength = 'weak' | 'medium' | 'strong';

/** 身份证信息 */
interface ChineseIDInfo {
  valid: boolean;
  province?: string;
  city?: string;
  district?: string;
  birthDate?: string;
  gender?: 'male' | 'female';
  age?: number;
}

/** 信用卡信息 */
interface CreditCardInfo {
  valid: boolean;
  type?: string;
  brand?: string;
  last4?: string;
}

// ============ 正则表达式 ============

const PATTERNS = {
  // 邮箱验证 (RFC 5322 简化版)
  email: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  
  // 中国大陆手机号
  phoneCN: /^1[3-9]\d{9}$/,
  
  // 国际手机号 (简化版)
  phoneIntl: /^\+?[1-9]\d{6,14}$/,
  
  // URL 验证
  url: /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/,
  
  // 中国大陆身份证 (18 位)
  idCardCN: /^[1-9]\d{5}(18|19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\d{3}[\dXx]$/,
  
  // 信用卡号 (通用格式)
  creditCard: /^\d{13,19}$/,
  
  // IPv4 地址
  ipv4: /^(\d{1,3}\.){3}\d{1,3}$/,
  
  // IPv6 地址 (简化版)
  ipv6: /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/
};

// 信用卡卡号前缀规则
const CREDIT_CARD_PATTERNS: Record<string, RegExp> = {
  visa: /^4[0-9]{12}(?:[0-9]{3})?$/,
  mastercard: /^5[1-5][0-9]{14}$|^2(2[2-9][0-9]{12}|[3-6][0-9]{13}|7[01][0-9]{12}|720[0-9]{12})$/,
  amex: /^3[47][0-9]{13}$/,
  discover: /^6(?:011|5[0-9]{2})[0-9]{12}$/,
  jcb: /^(?:2131|1800|35\d{3})\d{11}$/,
  diners: /^3(?:0[0-5]|[68][0-9])[0-9]{11}$/
};

// 中国大陆身份证省份代码
const PROVINCE_CODES: Record<string, string> = {
  '11': '北京市', '12': '天津市', '13': '河北省', '14': '山西省',
  '15': '内蒙古自治区', '21': '辽宁省', '22': '吉林省', '23': '黑龙江省',
  '31': '上海市', '32': '江苏省', '33': '浙江省', '34': '安徽省',
  '35': '福建省', '36': '江西省', '37': '山东省', '41': '河南省',
  '42': '湖北省', '43': '湖南省', '44': '广东省', '45': '广西壮族自治区',
  '46': '海南省', '50': '重庆市', '51': '四川省', '52': '贵州省',
  '53': '云南省', '54': '西藏自治区', '61': '陕西省', '62': '甘肃省',
  '63': '青海省', '64': '宁夏回族自治区', '65': '新疆维吾尔自治区',
  '71': '台湾省', '81': '香港特别行政区', '82': '澳门特别行政区',
  '91': '国外'
};

// ============ 基础验证函数 ============

/**
 * 验证邮箱地址
 * @param email 邮箱地址
 * @returns 验证结果
 */
export function validateEmail(email: string): ValidationLiteResult {
  if (!email || typeof email !== 'string') {
    return {
      valid: false,
      message: '邮箱地址不能为空',
      details: { issues: ['邮箱地址为空'] }
    };
  }

  const trimmed = email.trim();
  
  if (trimmed.length > 254) {
    return {
      valid: false,
      message: '邮箱地址过长 (最大 254 个字符)',
      details: { issues: ['邮箱地址超过 254 个字符'] }
    };
  }

  if (!PATTERNS.email.test(trimmed)) {
    return {
      valid: false,
      message: '邮箱地址格式不正确',
      details: { 
        issues: ['邮箱格式不符合标准'],
        suggestions: ['检查是否包含@符号', '检查域名是否正确']
      }
    };
  }

  const [local, domain] = trimmed.split('@');
  
  if (!local || local.length > 64) {
    return {
      valid: false,
      message: '邮箱用户名部分过长',
      details: { issues: ['@符号前部分超过 64 个字符'] }
    };
  }

  if (local.startsWith('.') || local.endsWith('.')) {
    return {
      valid: false,
      message: '邮箱用户名不能以点号开头或结尾',
      details: { issues: ['用户名以点号开头或结尾'] }
    };
  }

  return {
    valid: true,
    message: '邮箱地址格式正确'
  };
}

/**
 * 验证手机号码
 * @param phone 手机号码
 * @param options 验证选项
 * @returns 验证结果
 */
export function validatePhone(
  phone: string, 
  options: { region?: 'CN' | 'intl' } = {}
): ValidationLiteResult {
  if (!phone || typeof phone !== 'string') {
    return {
      valid: false,
      message: '手机号码不能为空',
      details: { issues: ['手机号码为空'] }
    };
  }

  const cleaned = phone.replace(/[\s\-\(\)]/g, '');
  const region = options.region || 'CN';

  if (region === 'CN') {
    if (!PATTERNS.phoneCN.test(cleaned)) {
      return {
        valid: false,
        message: '中国大陆手机号格式不正确',
        details: {
          issues: ['不符合中国大陆手机号格式'],
          suggestions: ['中国大陆手机号为 11 位，以 1 开头']
        }
      };
    }
  } else {
    if (!PATTERNS.phoneIntl.test(cleaned)) {
      return {
        valid: false,
        message: '国际手机号格式不正确',
        details: {
          issues: ['不符合国际手机号格式'],
          suggestions: ['国际手机号应包含国家代码']
        }
      };
    }
  }

  return {
    valid: true,
    message: region === 'CN' ? '中国大陆手机号格式正确' : '国际手机号格式正确'
  };
}

/**
 * 验证 URL 地址
 * @param url URL 地址
 * @param options 验证选项
 * @returns 验证结果
 */
export function validateUrl(
  url: string, 
  options: { requireProtocol?: boolean } = {}
): ValidationLiteResult {
  if (!url || typeof url !== 'string') {
    return {
      valid: false,
      message: 'URL 地址不能为空',
      details: { issues: ['URL 为空'] }
    };
  }

  const trimmed = url.trim();

  if (trimmed.length > 2048) {
    return {
      valid: false,
      message: 'URL 地址过长 (最大 2048 个字符)',
      details: { issues: ['URL 超过 2048 个字符'] }
    };
  }

  if (options.requireProtocol && !/^(https?:\/\/)/i.test(trimmed)) {
    return {
      valid: false,
      message: 'URL 必须包含协议 (http:// 或 https://)',
      details: {
        issues: ['缺少协议前缀'],
        suggestions: ['在 URL 前添加 https://']
      }
    };
  }

  if (!PATTERNS.url.test(trimmed)) {
    return {
      valid: false,
      message: 'URL 格式不正确',
      details: {
        issues: ['URL 格式不符合标准'],
        suggestions: ['检查域名和路径格式']
      }
    };
  }

  return {
    valid: true,
    message: 'URL 地址格式正确'
  };
}

// ============ 身份证验证 ============

/**
 * 验证中国大陆身份证号码
 * @param idCard 身份证号码
 * @returns 验证结果及详细信息
 */
export function validateChineseID(idCard: string): ValidationLiteResult & { info?: ChineseIDInfo } {
  if (!idCard || typeof idCard !== 'string') {
    return {
      valid: false,
      message: '身份证号码不能为空',
      details: { issues: ['身份证号码为空'] }
    };
  }

  const cleaned = idCard.trim().toUpperCase();

  if (cleaned.length !== 18) {
    return {
      valid: false,
      message: '身份证号码长度不正确 (应为 18 位)',
      details: { 
        issues: [`当前长度：${cleaned.length}位，应为 18 位`],
        suggestions: ['检查是否遗漏数字']
      }
    };
  }

  if (!PATTERNS.idCardCN.test(cleaned)) {
    return {
      valid: false,
      message: '身份证号码格式不正确',
      details: { issues: ['不符合身份证编码规则'] }
    };
  }

  // 验证校验码
  const checkCode = calculateIDCheckCode(cleaned.substring(0, 17));
  if (checkCode !== cleaned[17]) {
    return {
      valid: false,
      message: '身份证号码校验码错误',
      details: { 
        issues: ['校验码不正确，可能是输入错误'],
        suggestions: ['重新核对身份证号码']
      }
    };
  }

  // 提取信息
  const provinceCode = cleaned.substring(0, 2);
  const birthYear = parseInt(cleaned.substring(6, 10));
  const birthMonth = cleaned.substring(10, 12);
  const birthDay = cleaned.substring(12, 14);
  const genderCode = parseInt(cleaned.substring(16, 17));

  const birthDate = `${birthYear}-${birthMonth}-${birthDay}`;
  const gender = genderCode % 2 === 1 ? 'male' : 'female';
  
  const today = new Date();
  const birth = new Date(birthYear, parseInt(birthMonth) - 1, parseInt(birthDay));
  const age = today.getFullYear() - birth.getFullYear() - 
    (today < new Date(today.getFullYear(), birth.getMonth(), birth.getDate()) ? 1 : 0);

  return {
    valid: true,
    message: '身份证号码有效',
    info: {
      valid: true,
      province: PROVINCE_CODES[provinceCode] || '未知',
      birthDate,
      gender,
      age
    }
  };
}

/**
 * 计算身份证校验码
 */
function calculateIDCheckCode(body: string): string {
  const factors = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2];
  const checkCodes = ['1', '0', 'X', '9', '8', '7', '6', '5', '4', '3', '2'];
  
  let sum = 0;
  for (let i = 0; i < 17; i++) {
    sum += parseInt(body[i]) * factors[i];
  }
  
  return checkCodes[sum % 11];
}

// ============ 信用卡验证 ============

/**
 * 验证信用卡号码
 * @param cardNumber 信用卡号
 * @returns 验证结果及详细信息
 */
export function validateCreditCard(cardNumber: string): ValidationLiteResult & { info?: CreditCardInfo } {
  if (!cardNumber || typeof cardNumber !== 'string') {
    return {
      valid: false,
      message: '信用卡号不能为空',
      details: { issues: ['信用卡号为空'] }
    };
  }

  const cleaned = cardNumber.replace(/[\s\-]/g, '');

  if (!PATTERNS.creditCard.test(cleaned)) {
    return {
      valid: false,
      message: '信用卡号格式不正确',
      details: { 
        issues: ['信用卡号应为 13-19 位数字'],
        suggestions: ['检查是否包含非数字字符']
      }
    };
  }

  // Luhn 算法验证
  if (!luhnCheck(cleaned)) {
    return {
      valid: false,
      message: '信用卡号未通过 Luhn 算法验证',
      details: { 
        issues: ['卡号校验失败，可能是输入错误'],
        suggestions: ['重新核对信用卡号']
      }
    };
  }

  // 识别卡类型
  let cardType = 'unknown';
  let cardBrand = '未知';

  for (const [type, pattern] of Object.entries(CREDIT_CARD_PATTERNS)) {
    if (pattern.test(cleaned)) {
      cardType = type;
      cardBrand = getCardBrand(type);
      break;
    }
  }

  return {
    valid: true,
    message: '信用卡号有效',
    info: {
      valid: true,
      type: cardType,
      brand: cardBrand,
      last4: cleaned.substring(cleaned.length - 4)
    }
  };
}

/**
 * Luhn 算法验证
 */
function luhnCheck(cardNumber: string): boolean {
  let sum = 0;
  let isEven = false;

  for (let i = cardNumber.length - 1; i >= 0; i--) {
    let digit = parseInt(cardNumber[i]);

    if (isEven) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }

    sum += digit;
    isEven = !isEven;
  }

  return sum % 10 === 0;
}

/**
 * 获取信用卡品牌名称
 */
function getCardBrand(type: string): string {
  const brands: Record<string, string> = {
    visa: 'Visa',
    mastercard: 'MasterCard',
    amex: 'American Express',
    discover: 'Discover',
    jcb: 'JCB',
    diners: 'Diners Club',
    unknown: '未知'
  };
  return brands[type] || '未知';
}

// ============ 密码强度检查 ============

/**
 * 检查密码强度
 * @param password 密码
 * @returns 验证结果及强度信息
 */
export function checkPasswordStrength(password: string): ValidationLiteResult & { strength?: PasswordStrength; score?: number } {
  if (!password || typeof password !== 'string') {
    return {
      valid: false,
      message: '密码不能为空',
      details: { 
        issues: ['密码为空'],
        suggestions: ['请输入密码']
      }
    };
  }

  if (password.length < 6) {
    return {
      valid: false,
      message: '密码长度至少为 6 位',
      details: {
        strength: 'weak',
        score: 0,
        issues: ['密码长度不足 6 位'],
        suggestions: ['增加密码长度至 8 位以上']
      }
    };
  }

  const issues: string[] = [];
  const suggestions: string[] = [];
  let score = 0;

  // 长度评分 (0-30 分)
  if (password.length >= 8) score += 10;
  if (password.length >= 12) score += 10;
  if (password.length >= 16) score += 10;

  // 字符类型评分 (0-40 分)
  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasDigit = /\d/.test(password);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  const typeCount = [hasLower, hasUpper, hasDigit, hasSpecial].filter(Boolean).length;
  score += typeCount * 10;

  if (!hasLower) {
    issues.push('缺少小写字母');
    suggestions.push('添加小写字母 (a-z)');
  }
  if (!hasUpper) {
    issues.push('缺少大写字母');
    suggestions.push('添加大写字母 (A-Z)');
  }
  if (!hasDigit) {
    issues.push('缺少数字');
    suggestions.push('添加数字 (0-9)');
  }
  if (!hasSpecial) {
    issues.push('缺少特殊字符');
    suggestions.push('添加特殊字符 (!@#$%^&* 等)');
  }

  // 模式检测 (扣分项)
  if (/(.)\1{2,}/.test(password)) {
    score -= 10;
    issues.push('包含重复字符序列');
    suggestions.push('避免连续重复字符 (如 aaa, 111)');
  }

  if (/^(abc|123|qwerty)/i.test(password) || /(abc|123|qwerty)$/i.test(password)) {
    score -= 15;
    issues.push('包含常见模式');
    suggestions.push('避免使用常见序列 (如 abc, 123, qwerty)');
  }

  // 常见密码检测
  const commonPasswords = ['password', '123456', '12345678', 'qwerty', 'admin', 'letmein', 'welcome'];
  if (commonPasswords.some(p => password.toLowerCase().includes(p))) {
    score -= 20;
    issues.push('包含常见密码');
    suggestions.push('避免使用常见密码组合');
  }

  // 确保分数在 0-100 范围内
  score = Math.max(0, Math.min(100, score));

  // 确定强度等级
  let strength: PasswordStrength;
  if (score < 40) {
    strength = 'weak';
  } else if (score < 70) {
    strength = 'medium';
  } else {
    strength = 'strong';
  }

  const valid = strength !== 'weak' && password.length >= 8;

  return {
    valid,
    message: valid 
      ? (strength === 'strong' ? '密码强度强' : '密码强度中等')
      : '密码强度弱',
    strength,
    score,
    details: {
      strength,
      score,
      issues: issues.length > 0 ? issues : undefined,
      suggestions: suggestions.length > 0 ? suggestions : undefined
    }
  };
}

// ============ 批量验证工具 ============

/**
 * 批量验证多个值
 * @param validators 验证器数组
 * @returns 验证结果数组
 */
export function batchValidate(validators: Array<() => ValidationLiteResult>): ValidationLiteResult[] {
  return validators.map(validator => validator());
}

/**
 * 验证所有值 (全部通过才返回 true)
 * @param validators 验证器数组
 * @returns 总体验证结果
 */
export function validateAll(validators: Array<() => ValidationLiteResult>): ValidationLiteResult {
  const results = batchValidate(validators);
  const allValid = results.every(r => r.valid);
  
  if (allValid) {
    return {
      valid: true,
      message: '所有验证通过'
    };
  }

  const allIssues = results
    .filter(r => !r.valid)
    .flatMap(r => r.details?.issues || []);

  return {
    valid: false,
    message: `验证失败：${allIssues.length} 个问题`,
    details: {
      issues: allIssues
    }
  };
}

// ============ 导出 ============

export type {
  ValidationLiteResult,
  ValidationLiteDetails,
  PasswordStrength,
  ChineseIDInfo,
  CreditCardInfo
};

// 注意：函数已在上文中使用 export 关键字导出，此处仅需导出 PATTERNS 常量
export { PATTERNS };
