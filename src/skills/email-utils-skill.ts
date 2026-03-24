/**
 * Email Utils Skill - 邮箱验证处理工具
 * 
 * 功能:
 * 1. 邮箱格式验证
 * 2. MX 记录检查
 * 3. 临时邮箱检测
 * 
 * @module email-utils-skill
 */

import { dns } from 'node:dns';
import { promisify } from 'node:util';

const dnsResolveMx = promisify(dns.resolveMx);

// ============================================================================
// 类型定义
// ============================================================================

export interface EmailValidationResult {
  /** 邮箱地址 */
  email: string;
  /** 格式是否有效 */
  formatValid: boolean;
  /** MX 记录是否存在 */
  mxExists?: boolean;
  /** MX 记录详情 */
  mxRecords?: MxRecord[];
  /** 是否为临时邮箱 */
  isDisposable?: boolean;
  /** 验证时间戳 */
  timestamp: number;
  /** 错误信息 (如有) */
  error?: string;
}

export interface MxRecord {
  /** 邮件服务器优先级 */
  priority: number;
  /** 邮件服务器地址 */
  exchange: string;
}

export interface DisposableEmailDomain {
  /** 域名 */
  domain: string;
  /** 是否已知临时邮箱域名 */
  isDisposable: boolean;
  /** 来源 */
  source?: string;
}

// ============================================================================
// 临时邮箱域名库 (部分常见域名)
// ============================================================================

const DISPOSABLE_DOMAINS = new Set([
  // 10 分钟邮箱
  '10minutemail.com',
  '10minutemail.co.za',
  '10minutemail.de',
  '10minutemail.it',
  // Guerrilla Mail
  'guerrillamail.com',
  'guerrillamail.biz',
  'guerrillamail.de',
  'guerrillamail.net',
  'guerrillamail.org',
  'guerrillamailblock.com',
  'sharklasers.com',
  // Mailinator
  'mailinator.com',
  'mailinator.net',
  'mailinator.org',
  'mailinator2.com',
  'sogetthis.com',
  'spam4.me',
  // Temp Mail
  'tempmail.com',
  'temp-mail.org',
  'tempmail.net',
  'throwaway.email',
  'throwawaymail.com',
  // YOPmail
  'yopmail.com',
  'yopmail.fr',
  'yopmail.net',
  'cool.fr.nf',
  'jetable.org',
  'nospam.4wardbeing.com',
  // 其他常见临时邮箱
  'disposableemailaddresses.com',
  'emailondeck.com',
  'fakeinbox.com',
  'getnada.com',
  'harakirimail.com',
  'incognitomail.org',
  'maildrop.cc',
  'mailnesia.com',
  'mytrashmail.com',
  'spamgourmet.com',
  'tempinbox.com',
  'trashmail.com',
  'mailcatch.com',
  'mailsac.com',
  'mohmal.com',
  'tempail.com',
  '20minutemail.com',
  'emailtemporario.com.br',
  'mintemail.com',
  'mailtemp.info',
  'fakemailgenerator.com',
  'dispostable.com',
  'tempmailo.com',
  'mailtemporaire.com',
  'jetable.com',
  'getairmail.com',
  'armyspy.com',
  'cuvox.de',
  'dayrep.com',
  'einrot.com',
  'fleckens.hu',
  'gustr.com',
  'jourrapide.com',
  'rhyta.com',
  'superrito.com',
  'teleworm.us',
]);

// ============================================================================
// 邮箱格式验证正则表达式
// ============================================================================

/**
 * RFC 5322 兼容的邮箱格式正则
 * 支持:
 * - 标准格式：user@domain.com
 * - 带点格式：user.name@domain.com
 * - 带加号格式：user+tag@domain.com
 * - 下划线/连字符：user_name@domain-name.com
 * - 国际域名 (基础支持)
 */
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

/**
 * 简化版邮箱格式正则 (更严格)
 * 适用于大多数实际场景
 */
const EMAIL_REGEX_STRICT = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

// ============================================================================
// 核心功能函数
// ============================================================================

/**
 * 1. 邮箱格式验证
 * 
 * 验证邮箱地址是否符合标准格式
 * 
 * @param email - 待验证的邮箱地址
 * @param options - 验证选项
 * @param options.strict - 是否使用严格模式 (默认 false)
 * @returns 验证结果 { valid: boolean, reason?: string }
 * 
 * @example
 * ```typescript
 * const result = validateEmailFormat('test@example.com');
 * // { valid: true }
 * 
 * const result2 = validateEmailFormat('invalid-email');
 * // { valid: false, reason: '邮箱格式不正确' }
 * ```
 */
export function validateEmailFormat(
  email: string,
  options: { strict?: boolean } = {}
): { valid: boolean; reason?: string } {
  if (!email || typeof email !== 'string') {
    return { valid: false, reason: '邮箱地址不能为空' };
  }

  // 去除首尾空格
  const trimmed = email.trim();

  // 检查长度
  if (trimmed.length > 254) {
    return { valid: false, reason: '邮箱地址过长 (最大 254 字符)' };
  }

  // 检查基本结构
  if (!trimmed.includes('@')) {
    return { valid: false, reason: '邮箱必须包含 @ 符号' };
  }

  const parts = trimmed.split('@');
  if (parts.length !== 2) {
    return { valid: false, reason: '邮箱只能包含一个 @ 符号' };
  }

  const [local, domain] = parts;

  // 验证本地部分
  if (!local || local.length > 64) {
    return { valid: false, reason: '邮箱用户名部分无效' };
  }

  if (local.startsWith('.') || local.endsWith('.')) {
    return { valid: false, reason: '邮箱用户名不能以点号开头或结尾' };
  }

  if (local.includes('..')) {
    return { valid: false, reason: '邮箱用户名不能包含连续的点号' };
  }

  // 验证域名部分
  if (!domain || domain.length === 0) {
    return { valid: false, reason: '邮箱域名部分无效' };
  }

  if (domain.startsWith('.') || domain.endsWith('.')) {
    return { valid: false, reason: '域名不能以点号开头或结尾' };
  }

  if (!domain.includes('.')) {
    return { valid: false, reason: '域名必须包含顶级域 (如 .com)' };
  }

  // 使用正则表达式验证
  const regex = options.strict ? EMAIL_REGEX_STRICT : EMAIL_REGEX;
  if (!regex.test(trimmed)) {
    return { valid: false, reason: '邮箱格式不符合标准' };
  }

  return { valid: true };
}

/**
 * 2. MX 记录检查
 * 
 * 检查邮箱域名是否存在有效的 MX 记录
 * 
 * @param email - 邮箱地址或域名
 * @param options - 查询选项
 * @param options.timeout - 超时时间 (毫秒，默认 5000)
 * @returns MX 记录查询结果
 * 
 * @example
 * ```typescript
 * // 检查完整邮箱
 * const result = await checkMxRecords('test@gmail.com');
 * 
 * // 检查域名
 * const result2 = await checkMxRecords('example.com');
 * 
 * // 自定义超时
 * const result3 = await checkMxRecords('test@example.com', { timeout: 10000 });
 * ```
 */
export async function checkMxRecords(
  email: string,
  options: { timeout?: number } = {}
): Promise<{ exists: boolean; records?: MxRecord[]; error?: string }> {
  const timeout = options.timeout || 5000;

  try {
    // 提取域名
    let domain = email.trim();
    if (email.includes('@')) {
      domain = email.split('@')[1];
    }

    // 验证域名格式
    const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    if (!domainRegex.test(domain)) {
      return { exists: false, error: '域名格式不正确' };
    }

    // 设置超时
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      // 查询 MX 记录
      const records = await dnsResolveMx(domain);
      clearTimeout(timeoutId);

      if (records && records.length > 0) {
        return {
          exists: true,
          records: records.map((r) => ({
            priority: r.priority,
            exchange: r.exchange,
          })),
        };
      } else {
        return { exists: false, error: '未找到 MX 记录' };
      }
    } catch (dnsError) {
      clearTimeout(timeoutId);
      const errorMessage = dnsError instanceof Error ? dnsError.message : 'DNS 查询失败';
      return { exists: false, error: errorMessage };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '未知错误';
    return { exists: false, error: errorMessage };
  }
}

/**
 * 3. 临时邮箱检测
 * 
 * 检测邮箱是否为已知的临时/一次性邮箱
 * 
 * @param email - 邮箱地址
 * @returns 检测结果
 * 
 * @example
 * ```typescript
 * const result = isDisposableEmail('test@mailinator.com');
 * // { isDisposable: true, domain: 'mailinator.com' }
 * 
 * const result2 = isDisposableEmail('test@gmail.com');
 * // { isDisposable: false, domain: 'gmail.com' }
 * ```
 */
export function isDisposableEmail(email: string): {
  isDisposable: boolean;
  domain?: string;
  confidence?: 'high' | 'medium' | 'low';
} {
  if (!email || typeof email !== 'string') {
    return { isDisposable: false, confidence: 'low' };
  }

  // 提取域名并转为小写
  const domain = email.trim().toLowerCase().split('@')[1];

  if (!domain) {
    return { isDisposable: false, confidence: 'low' };
  }

  // 直接匹配已知临时邮箱域名
  if (DISPOSABLE_DOMAINS.has(domain)) {
    return {
      isDisposable: true,
      domain,
      confidence: 'high',
    };
  }

  // 检查常见临时邮箱模式
  const disposablePatterns = [
    /\.temp\./i,
    /\.tmp\./i,
    /\.fake\./i,
    /\.spam\./i,
    /\.trash\./i,
    /\.throwaway\./i,
    /\.disposable\./i,
    /\.test\./i,
    /\.demo\./i,
    /\.sample\./i,
  ];

  for (const pattern of disposablePatterns) {
    if (pattern.test(domain)) {
      return {
        isDisposable: true,
        domain,
        confidence: 'medium',
      };
    }
  }

  // 检查域名是否包含可疑关键词
  const suspiciousKeywords = [
    'temp',
    'tmp',
    'fake',
    'spam',
    'trash',
    'throwaway',
    'disposable',
    'test',
    'demo',
    'sample',
    'mock',
    'dummy',
  ];

  const hasSuspiciousKeyword = suspiciousKeywords.some((keyword) =>
    domain.includes(keyword)
  );

  if (hasSuspiciousKeyword) {
    return {
      isDisposable: true,
      domain,
      confidence: 'low',
    };
  }

  return {
    isDisposable: false,
    domain,
    confidence: 'high',
  };
}

/**
 * 完整邮箱验证
 * 
 * 执行所有三项验证：格式、MX 记录、临时邮箱检测
 * 
 * @param email - 邮箱地址
 * @param options - 验证选项
 * @param options.checkMx - 是否检查 MX 记录 (默认 true)
 * @param options.checkDisposable - 是否检查临时邮箱 (默认 true)
 * @param options.strict - 是否使用严格格式验证 (默认 false)
 * @param options.timeout - MX 查询超时 (默认 5000ms)
 * @returns 完整验证结果
 * 
 * @example
 * ```typescript
 * const result = await validateEmail('test@example.com');
 * // {
 * //   email: 'test@example.com',
 * //   formatValid: true,
 * //   mxExists: true,
 * //   mxRecords: [...],
 * //   isDisposable: false,
 * //   timestamp: 1234567890
 * // }
 * ```
 */
export async function validateEmail(
  email: string,
  options: {
    checkMx?: boolean;
    checkDisposable?: boolean;
    strict?: boolean;
    timeout?: number;
  } = {}
): Promise<EmailValidationResult> {
  const result: EmailValidationResult = {
    email,
    formatValid: false,
    timestamp: Date.now(),
  };

  // 1. 格式验证
  const formatResult = validateEmailFormat(email, { strict: options.strict });
  result.formatValid = formatResult.valid;

  if (!formatResult.valid) {
    result.error = formatResult.reason;
    return result;
  }

  // 2. MX 记录检查 (可选)
  if (options.checkMx !== false) {
    const mxResult = await checkMxRecords(email, { timeout: options.timeout });
    result.mxExists = mxResult.exists;
    result.mxRecords = mxResult.records;

    if (!mxResult.exists && mxResult.error) {
      result.error = mxResult.error;
    }
  }

  // 3. 临时邮箱检测 (可选)
  if (options.checkDisposable !== false) {
    const disposableResult = isDisposableEmail(email);
    result.isDisposable = disposableResult.isDisposable;
  }

  return result;
}

/**
 * 批量邮箱验证
 * 
 * 同时验证多个邮箱地址
 * 
 * @param emails - 邮箱地址数组
 * @param options - 验证选项
 * @returns 验证结果数组
 * 
 * @example
 * ```typescript
 * const results = await validateEmails(['a@example.com', 'b@test.com']);
 * ```
 */
export async function validateEmails(
  emails: string[],
  options?: {
    checkMx?: boolean;
    checkDisposable?: boolean;
    strict?: boolean;
    timeout?: number;
    concurrency?: number;
  }
): Promise<EmailValidationResult[]> {
  const concurrency = options?.concurrency || 5;
  const results: EmailValidationResult[] = [];

  // 分批处理
  for (let i = 0; i < emails.length; i += concurrency) {
    const batch = emails.slice(i, i + concurrency);
    const batchResults = await Promise.all(
      batch.map((email) => validateEmail(email, options))
    );
    results.push(...batchResults);
  }

  return results;
}

/**
 * 添加自定义临时邮箱域名
 * 
 * @param domains - 域名数组
 * 
 * @example
 * ```typescript
 * addDisposableDomains(['custom-temp.com', 'another-temp.org']);
 * ```
 */
export function addDisposableDomains(domains: string[]): void {
  domains.forEach((domain) => {
    DISPOSABLE_DOMAINS.add(domain.toLowerCase());
  });
}

/**
 * 移除临时邮箱域名
 * 
 * @param domains - 域名数组
 * 
 * @example
 * ```typescript
 * removeDisposableDomains(['custom-temp.com']);
 * ```
 */
export function removeDisposableDomains(domains: string[]): void {
  domains.forEach((domain) => {
    DISPOSABLE_DOMAINS.delete(domain.toLowerCase());
  });
}

/**
 * 获取临时邮箱域名库大小
 * 
 * @returns 域名数量
 */
export function getDisposableDomainCount(): number {
  return DISPOSABLE_DOMAINS.size;
}

/**
 * 检查域名是否在临时邮箱库中
 * 
 * @param domain - 域名
 * @returns 是否存在
 */
export function hasDisposableDomain(domain: string): boolean {
  return DISPOSABLE_DOMAINS.has(domain.toLowerCase());
}

// ============================================================================
// 导出默认对象
// ============================================================================

export default {
  validateEmailFormat,
  checkMxRecords,
  isDisposableEmail,
  validateEmail,
  validateEmails,
  addDisposableDomains,
  removeDisposableDomains,
  getDisposableDomainCount,
  hasDisposableDomain,
};
