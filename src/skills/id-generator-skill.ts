/**
 * ID Generator Skill - ACE
 * 
 * 唯一 ID 生成器
 * 
 * 功能:
 * 1. UUID 生成 - 标准 UUID v4
 * 2. 短 ID 生成 - Base62 编码短 ID
 * 3. 订单号生成 - 时间戳 + 随机数订单号
 * 
 * @version 1.0.0
 * @author Axon
 */

// ============================================================================
// 工具函数
// ============================================================================

/**
 * Base62 字符集 (用于短 ID 生成)
 */
const BASE62_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

/**
 * 生成随机整数 (min <= x < max)
 */
function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min)) + min;
}

// ============================================================================
// UUID 生成器
// ============================================================================

/**
 * 生成 UUID v4
 * 
 * @returns 标准 UUID 格式字符串 (xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx)
 * 
 * @example
 * generateUUID() 
 * // => "550e8400-e29b-41d4-a716-446655440000"
 */
export function generateUUID(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  
  // 设置版本为 4
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  // 设置变体为 RFC4122
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  
  const hex = Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

// ============================================================================
// 短 ID 生成器
// ============================================================================

/**
 * 生成短 ID (Base62 编码)
 * 
 * @param length ID 长度 (默认 8, 范围 4-16)
 * @param prefix 可选前缀
 * @returns Base62 编码短 ID
 * 
 * @example
 * generateShortId()           // => "aB3xK9mN"
 * generateShortId(12)         // => "xK9mNaB3xK9m"
 * generateShortId(8, "usr_")  // => "usr_aB3xK9mN"
 */
export function generateShortId(length: number = 8, prefix: string = ''): string {
  // 限制长度范围
  const safeLength = Math.max(4, Math.min(16, length));
  
  let id = '';
  for (let i = 0; i < safeLength; i++) {
    id += BASE62_CHARS[randomInt(0, BASE62_CHARS.length)];
  }
  
  return prefix + id;
}

/**
 * 生成唯一短 ID (带时间戳混合)
 * 
 * @param length ID 长度 (默认 10)
 * @returns 时间戳 + 随机数混合短 ID
 * 
 * @example
 * generateUniqueShortId()  // => "kL8mN2pQ4r"
 */
export function generateUniqueShortId(length: number = 10): string {
  const timestamp = Date.now().toString(36);
  const randomPart = generateShortId(length - timestamp.length);
  return timestamp + randomPart;
}

// ============================================================================
// 订单号生成器
// ============================================================================

/**
 * 订单号格式配置
 */
interface OrderNumberOptions {
  /** 前缀 (如 "ORD", "PAY") */
  prefix?: string;
  /** 时间戳格式: "YYYYMMDD" | "YYMMDD" | "none" */
  dateFormat?: 'YYYYMMDD' | 'YYMMDD' | 'none';
  /** 随机数位数 (默认 8) */
  randomLength?: number;
  /** 是否包含校验位 */
  includeCheckDigit?: boolean;
  /** 分隔符 (默认 "-") */
  separator?: string;
}

/**
 * 生成订单号
 * 
 * @param options 配置选项
 * @returns 格式化订单号
 * 
 * @example
 * generateOrderNumber() 
 * // => "ORD-20260313-8472639"
 * 
 * generateOrderNumber({ prefix: 'PAY', dateFormat: 'YYMMDD', randomLength: 6 })
 * // => "PAY-260313-847263"
 * 
 * generateOrderNumber({ prefix: 'ORD', separator: '_', includeCheckDigit: true })
 * // => "ORD_20260313_8472639_5"
 */
export function generateOrderNumber(options: OrderNumberOptions = {}): string {
  const {
    prefix = 'ORD',
    dateFormat = 'YYYYMMDD',
    randomLength = 8,
    includeCheckDigit = false,
    separator = '-'
  } = options;
  
  const parts: string[] = [];
  
  // 添加前缀
  if (prefix) {
    parts.push(prefix);
  }
  
  // 添加日期
  if (dateFormat !== 'none') {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    
    const dateStr = dateFormat === 'YYYYMMDD' 
      ? `${year}${month}${day}`
      : `${String(year).slice(-2)}${month}${day}`;
    
    parts.push(dateStr);
  }
  
  // 添加随机数
  const randomPart = Array.from({ length: randomLength })
    .map(() => randomInt(0, 10))
    .join('');
  parts.push(randomPart);
  
  // 添加校验位
  if (includeCheckDigit) {
    const checkDigit = calculateLuhnCheckDigit(parts.join(''));
    parts.push(String(checkDigit));
  }
  
  return parts.join(separator);
}

/**
 * 计算 Luhn 校验位
 */
function calculateLuhnCheckDigit(input: string): number {
  let sum = 0;
  let shouldDouble = true;
  
  for (let i = input.length - 1; i >= 0; i--) {
    let digit = parseInt(input[i], 10);
    
    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    
    sum += digit;
    shouldDouble = !shouldDouble;
  }
  
  return (10 - (sum % 10)) % 10;
}

// ============================================================================
// 批量生成器
// ============================================================================

/**
 * 批量生成 ID
 * 
 * @param generator 生成函数
 * @param count 生成数量
 * @param ensureUnique 是否确保唯一性 (默认 true)
 * @returns ID 数组
 * 
 * @example
 * batchGenerate(generateUUID, 5)
 * // => [uuid1, uuid2, uuid3, uuid4, uuid5]
 * 
 * batchGenerate(() => generateShortId(6), 10)
 * // => [shortId1, shortId2, ...]
 */
export function batchGenerate<T>(
  generator: () => T,
  count: number,
  ensureUnique: boolean = true
): T[] {
  const ids: T[] = [];
  const seen = new Set<string>();
  
  let attempts = 0;
  const maxAttempts = count * 10;
  
  while (ids.length < count && attempts < maxAttempts) {
    const id = generator();
    
    if (ensureUnique) {
      const idStr = String(id);
      if (!seen.has(idStr)) {
        seen.add(idStr);
        ids.push(id);
      }
    } else {
      ids.push(id);
    }
    
    attempts++;
  }
  
  if (ids.length < count) {
    throw new Error(
      `Failed to generate ${count} unique IDs after ${maxAttempts} attempts. ` +
      'Consider increasing ID length or reducing count.'
    );
  }
  
  return ids;
}

// ============================================================================
// 导出
// ============================================================================

export default {
  generateUUID,
  generateShortId,
  generateUniqueShortId,
  generateOrderNumber,
  batchGenerate,
};
