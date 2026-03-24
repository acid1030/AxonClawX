/**
 * Security Utils Skill - NOVA
 * 
 * 安全相关工具函数集合
 * - XSS 过滤
 * - CSRF Token 生成
 * - 敏感数据脱敏
 * 
 * @author AxonClaw Security Team
 * @version 1.0.0
 */

// ==================== XSS 过滤 ====================

/**
 * XSS 危险标签和属性黑名单
 */
const XSS_DANGEROUS_PATTERNS = {
  tags: ['script', 'iframe', 'object', 'embed', 'form', 'input', 'button', 'textarea', 'select', 'style', 'link', 'meta'],
  attributes: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur', 'onchange', 'onsubmit', 'onreset', 'onselect', 'onkeydown', 'onkeyup', 'onkeypress'],
  protocols: ['javascript:', 'data:', 'vbscript:']
};

/**
 * XSS 过滤选项
 */
export interface XSSFilterOptions {
  /** 是否允许 HTML 标签 (默认 false) */
  allowHTML?: boolean;
  /** 自定义允许的标签列表 */
  allowedTags?: string[];
  /** 是否移除注释 (默认 true) */
  removeComments?: boolean;
  /** 是否解码 HTML 实体 (默认 false) */
  decodeEntities?: boolean;
}

/**
 * XSS 过滤主函数
 * 
 * @param input - 需要过滤的字符串
 * @param options - 过滤选项
 * @returns 过滤后的安全字符串
 * 
 * @example
 * ```typescript
 * // 基础用法 - 完全转义
 * const safe = filterXSS('<script>alert("XSS")</script>');
 * // 输出: "&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;"
 * 
 * // 允许部分 HTML 标签
 * const safe = filterXSS('<p>Hello <b>World</b></p>', { allowHTML: true, allowedTags: ['p', 'b', 'i'] });
 * // 输出: "<p>Hello <b>World</b></p>"
 * 
 * // 移除危险属性
 * const safe = filterXSS('<img src="x" onerror="alert(1)">', { allowHTML: true });
 * // 输出: "<img src=\"x\">"
 * ```
 */
export function filterXSS(input: string, options: XSSFilterOptions = {}): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  const {
    allowHTML = false,
    allowedTags = ['p', 'br', 'b', 'i', 'u', 'strong', 'em', 'a', 'ul', 'ol', 'li', 'div', 'span'],
    removeComments = true,
    decodeEntities = false
  } = options;

  let result = input;

  // 1. 移除 HTML 注释
  if (removeComments) {
    result = result.replace(/<!--[\s\S]*?-->/g, '');
  }

  // 2. 如果完全不允许 HTML，直接转义所有特殊字符
  if (!allowHTML) {
    return escapeHTML(result);
  }

  // 3. 允许 HTML 时，移除危险标签和属性
  result = sanitizeHTML(result, allowedTags);

  // 4. 可选：解码 HTML 实体
  if (decodeEntities) {
    result = decodeHTMLEntities(result);
  }

  return result;
}

/**
 * 转义 HTML 特殊字符
 */
function escapeHTML(str: string): string {
  const escapeMap: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
    '`': '&#x60;',
    '=': '&#x3D;'
  };

  return str.replace(/[&<>"'`=\/]/g, (char) => escapeMap[char]);
}

/**
 * 清理 HTML，移除危险标签和属性
 */
function sanitizeHTML(html: string, allowedTags: string[]): string {
  let result = html;

  // 移除危险标签
  const dangerousTags = XSS_DANGEROUS_PATTERNS.tags.filter(tag => !allowedTags.includes(tag));
  dangerousTags.forEach(tag => {
    const tagRegex = new RegExp(`<${tag}[^>]*>|</${tag}>`, 'gi');
    result = result.replace(tagRegex, '');
  });

  // 移除危险属性
  XSS_DANGEROUS_PATTERNS.attributes.forEach(attr => {
    const attrRegex = new RegExp(`\\s*${attr}\\s*=\\s*["'][^"']*["']`, 'gi');
    result = result.replace(attrRegex, '');
    const attrRegex2 = new RegExp(`\\s*${attr}\\s*=\\s*[^\\s>]+`, 'gi');
    result = result.replace(attrRegex2, '');
  });

  // 移除危险协议
  XSS_DANGEROUS_PATTERNS.protocols.forEach(protocol => {
    const protocolRegex = new RegExp(`${protocol}`, 'gi');
    result = result.replace(protocolRegex, '#');
  });

  return result;
}

/**
 * 解码 HTML 实体
 */
function decodeHTMLEntities(str: string): string {
  const entities: Record<string, string> = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#x27;': "'",
    '&#x2F;': '/',
    '&#x60;': '`',
    '&#x3D;': '='
  };

  return str.replace(/&[^;]+;/g, (entity) => entities[entity] || entity);
}

// ==================== CSRF Token 生成 ====================

/**
 * CSRF Token 生成选项
 */
export interface CSRFTokenOptions {
  /** Token 长度 (字节数，默认 32) */
  length?: number;
  /** 是否使用 URL 安全字符 (默认 true) */
  urlSafe?: boolean;
  /** 是否添加前缀 (默认 true) */
  addPrefix?: boolean;
}

/**
 * 生成 CSRF Token
 * 
 * @param options - 生成选项
 * @returns CSRF Token 字符串
 * 
 * @example
 * ```typescript
 * // 基础用法
 * const token = generateCSRFToken();
 * // 输出: "csrf_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6"
 * 
 * // 自定义长度
 * const token = generateCSRFToken({ length: 64 });
 * // 输出: "csrf_..." (更长的 token)
 * 
 * // 不使用前缀
 * const token = generateCSRFToken({ addPrefix: false });
 * // 输出: "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6"
 * ```
 */
export function generateCSRFToken(options: CSRFTokenOptions = {}): string {
  const {
    length = 32,
    urlSafe = true,
    addPrefix = true
  } = options;

  // 生成随机字节
  const bytes = new Uint8Array(length);
  
  // 使用 crypto API 生成加密安全的随机数
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    // 降级方案 (Node.js 环境)
    for (let i = 0; i < length; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }

  // 转换为十六进制或 Base64
  let token: string;
  if (urlSafe) {
    // Base64 URL 安全编码
    token = btoa(String.fromCharCode(...bytes))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  } else {
    // 十六进制编码
    token = Array.from(bytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  return addPrefix ? `csrf_${token}` : token;
}

/**
 * 验证 CSRF Token
 * 
 * @param token - 待验证的 token
 * @param expectedToken - 期望的 token
 * @returns 是否匹配
 * 
 * @example
 * ```typescript
 * const isValid = validateCSRFToken(userToken, storedToken);
 * ```
 */
export function validateCSRFToken(token: string, expectedToken: string): boolean {
  if (!token || !expectedToken) {
    return false;
  }

  // 使用恒定时间比较防止时序攻击
  return constantTimeCompare(token, expectedToken);
}

/**
 * 恒定时间字符串比较 (防止时序攻击)
 */
function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}

// ==================== 敏感数据脱敏 ====================

/**
 * 脱敏类型枚举
 */
export enum MaskType {
  /** 手机号 */
  PHONE = 'phone',
  /** 邮箱 */
  EMAIL = 'email',
  /** 身份证号 */
  ID_CARD = 'id_card',
  /** 银行卡号 */
  BANK_CARD = 'bank_card',
  /** 姓名 */
  NAME = 'name',
  /** 地址 */
  ADDRESS = 'address',
  /** 自定义 */
  CUSTOM = 'custom'
}

/**
 * 脱敏选项
 */
export interface MaskOptions {
  /** 脱敏类型 */
  type?: MaskType;
  /** 保留前面字符数 (默认 3) */
  keepPrefix?: number;
  /** 保留后面字符数 (默认 4) */
  keepSuffix?: number;
  /** 脱敏字符 (默认 *) */
  maskChar?: string;
  /** 自定义脱敏规则函数 */
  customMask?: (value: string) => string;
}

/**
 * 敏感数据脱敏主函数
 * 
 * @param data - 需要脱敏的数据
 * @param options - 脱敏选项
 * @returns 脱敏后的字符串
 * 
 * @example
 * ```typescript
 * // 手机号脱敏
 * const masked = maskSensitiveData('13812345678', { type: MaskType.PHONE });
 * // 输出: "138****5678"
 * 
 * // 邮箱脱敏
 * const masked = maskSensitiveData('test@example.com', { type: MaskType.EMAIL });
 * // 输出: "t**@example.com"
 * 
 * // 自定义脱敏
 * const masked = maskSensitiveData('1234567890', { 
 *   type: MaskType.CUSTOM,
 *   customMask: (val) => val.replace(/\d/g, '*')
 * });
 * // 输出: "**********"
 * ```
 */
export function maskSensitiveData(data: string, options: MaskOptions = {}): string {
  if (!data || typeof data !== 'string') {
    return '';
  }

  const {
    type = MaskType.CUSTOM,
    keepPrefix = 3,
    keepSuffix = 4,
    maskChar = '*',
    customMask
  } = options;

  // 使用自定义脱敏规则
  if (type === MaskType.CUSTOM && customMask) {
    return customMask(data);
  }

  // 根据类型选择脱敏策略
  switch (type) {
    case MaskType.PHONE:
      return maskPhone(data, maskChar);
    case MaskType.EMAIL:
      return maskEmail(data, keepPrefix, maskChar);
    case MaskType.ID_CARD:
      return maskIDCard(data, keepPrefix, keepSuffix, maskChar);
    case MaskType.BANK_CARD:
      return maskBankCard(data, keepPrefix, keepSuffix, maskChar);
    case MaskType.NAME:
      return maskName(data, maskChar);
    case MaskType.ADDRESS:
      return maskAddress(data, keepPrefix, keepSuffix, maskChar);
    default:
      return maskDefault(data, keepPrefix, keepSuffix, maskChar);
  }
}

/**
 * 手机号脱敏
 */
function maskPhone(phone: string, maskChar: string): string {
  // 移除所有非数字字符
  const cleaned = phone.replace(/\D/g, '');
  
  if (cleaned.length !== 11) {
    return cleaned;
  }

  // 格式：前 3 位 + 4 个脱敏字符 + 后 4 位
  return `${cleaned.substring(0, 3)}${maskChar.repeat(4)}${cleaned.substring(7)}`;
}

/**
 * 邮箱脱敏
 */
function maskEmail(email: string, keepPrefix: number, maskChar: string): string {
  const parts = email.split('@');
  if (parts.length !== 2) {
    return email;
  }

  const [username, domain] = parts;
  const maskedUsername = username.length <= keepPrefix
    ? username
    : `${username.substring(0, keepPrefix)}${maskChar.repeat(username.length - keepPrefix)}`;

  return `${maskedUsername}@${domain}`;
}

/**
 * 身份证号脱敏
 */
function maskIDCard(idCard: string, keepPrefix: number, keepSuffix: number, maskChar: string): string {
  const cleaned = idCard.replace(/\s/g, '');
  
  if (cleaned.length < 15) {
    return cleaned;
  }

  const prefix = cleaned.substring(0, keepPrefix);
  const suffix = cleaned.substring(cleaned.length - keepSuffix);
  const middleLength = cleaned.length - keepPrefix - keepSuffix;

  return `${prefix}${maskChar.repeat(middleLength)}${suffix}`;
}

/**
 * 银行卡号脱敏
 */
function maskBankCard(cardNumber: string, keepPrefix: number, keepSuffix: number, maskChar: string): string {
  const cleaned = cardNumber.replace(/\s/g, '');
  
  if (cleaned.length < 13) {
    return cleaned;
  }

  const prefix = cleaned.substring(0, keepPrefix);
  const suffix = cleaned.substring(cleaned.length - keepSuffix);
  const middleLength = cleaned.length - keepPrefix - keepSuffix;

  return `${prefix}${maskChar.repeat(middleLength)}${suffix}`;
}

/**
 * 姓名脱敏
 */
function maskName(name: string, maskChar: string): string {
  if (name.length <= 1) {
    return name;
  }

  if (name.length === 2) {
    return `${name[0]}${maskChar}`;
  }

  // 3 字及以上：保留首尾
  return `${name[0]}${maskChar.repeat(name.length - 2)}${name[name.length - 1]}`;
}

/**
 * 地址脱敏
 */
function maskAddress(address: string, keepPrefix: number, keepSuffix: number, maskChar: string): string {
  if (address.length <= keepPrefix + keepSuffix) {
    return address;
  }

  const prefix = address.substring(0, keepPrefix);
  const suffix = address.substring(address.length - keepSuffix);
  const middleLength = address.length - keepPrefix - keepSuffix;

  return `${prefix}${maskChar.repeat(middleLength)}${suffix}`;
}

/**
 * 默认脱敏策略
 */
function maskDefault(data: string, keepPrefix: number, keepSuffix: number, maskChar: string): string {
  if (data.length <= keepPrefix + keepSuffix) {
    return data;
  }

  const prefix = data.substring(0, keepPrefix);
  const suffix = data.substring(data.length - keepSuffix);
  const middleLength = data.length - keepPrefix - keepSuffix;

  return `${prefix}${maskChar.repeat(middleLength)}${suffix}`;
}

/**
 * 批量脱敏对象中的敏感字段
 * 
 * @param obj - 需要脱敏的对象
 * @param fields - 需要脱敏的字段配置
 * @returns 脱敏后的新对象
 * 
 * @example
 * ```typescript
 * const user = {
 *   name: '张三',
 *   phone: '13812345678',
 *   email: 'zhangsan@example.com',
 *   idCard: '110101199001011234'
 * };
 * 
 * const masked = maskObjectFields(user, {
 *   name: { type: MaskType.NAME },
 *   phone: { type: MaskType.PHONE },
 *   email: { type: MaskType.EMAIL },
 *   idCard: { type: MaskType.ID_CARD }
 * });
 * ```
 */
export function maskObjectFields<T extends Record<string, any>>(
  obj: T,
  fields: Record<keyof T, MaskOptions>
): T {
  const result = { ...obj };

  for (const [field, options] of Object.entries(fields)) {
    if (field in result && typeof result[field] === 'string') {
      result[field] = maskSensitiveData(result[field], options);
    }
  }

  return result;
}

// ==================== 导出 ====================

export default {
  // XSS 过滤
  filterXSS,
  escapeHTML,
  sanitizeHTML,
  
  // CSRF Token
  generateCSRFToken,
  validateCSRFToken,
  
  // 敏感数据脱敏
  maskSensitiveData,
  maskObjectFields,
  MaskType
};
