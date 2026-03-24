/**
 * UUID 工具技能
 * 
 * 功能:
 * 1. UUID v4 生成
 * 2. 短 ID 生成 (基于时间戳 + 随机数)
 * 3. 订单号生成 (时间戳 + 随机数 + 校验位)
 */

/**
 * 生成 UUID v4
 * 格式: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
 * 
 * @returns UUID v4 字符串
 */
export function generateUUIDv4(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * 生成短 ID
 * 基于时间戳 + 随机数，转换为 base36 编码
 * 格式: 10 位字母数字组合
 * 
 * @param length ID 长度 (默认 10)
 * @returns 短 ID 字符串
 */
export function generateShortId(length: number = 10): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 2 + length);
  return (timestamp + randomPart).substring(0, length).toUpperCase();
}

/**
 * 生成订单号
 * 格式: YYYYMMDDHHMMSS + 6 位随机数 + 1 位校验码
 * 总长度: 21 位
 * 
 * @param prefix 订单号前缀 (可选，如 "ORD")
 * @returns 订单号字符串
 */
export function generateOrderNumber(prefix?: string): string {
  const now = new Date();
  const timestamp = now
    .toISOString()
    .replace(/[-:T.]/g, '')
    .substring(0, 14); // YYYYMMDDHHMMSS
  
  const randomPart = Math.floor(Math.random() * 1000000)
    .toString()
    .padStart(6, '0');
  
  // 生成校验码 (Luhn 算法简化版)
  const checkDigit = generateCheckDigit(timestamp + randomPart);
  
  const orderNumber = `${timestamp}${randomPart}${checkDigit}`;
  
  return prefix ? `${prefix}-${orderNumber}` : orderNumber;
}

/**
 * 生成校验位 (Luhn 算法简化版)
 * 
 * @param str 输入字符串
 * @returns 校验位数字 (0-9)
 */
function generateCheckDigit(str: string): string {
  let sum = 0;
  for (let i = 0; i < str.length; i++) {
    const digit = parseInt(str[i], 10) || 0;
    sum += i % 2 === 0 ? digit : digit * 2 % 9;
  }
  return ((10 - (sum % 10)) % 10).toString();
}

/**
 * 批量生成 UUID
 * 
 * @param count 生成数量
 * @returns UUID 数组
 */
export function generateUUIDBatch(count: number): string[] {
  return Array.from({ length: count }, () => generateUUIDv4());
}

/**
 * 批量生成短 ID
 * 
 * @param count 生成数量
 * @param length ID 长度
 * @returns 短 ID 数组
 */
export function generateShortIdBatch(count: number, length: number = 10): string[] {
  return Array.from({ length: count }, () => generateShortId(length));
}

/**
 * 批量生成订单号
 * 
 * @param count 生成数量
 * @param prefix 订单号前缀
 * @returns 订单号数组
 */
export function generateOrderNumberBatch(count: number, prefix?: string): string[] {
  return Array.from({ length: count }, () => generateOrderNumber(prefix));
}

// ============ 使用示例 ============

/**
 * 使用示例代码
 * 
 * ```typescript
 * import {
 *   generateUUIDv4,
 *   generateShortId,
 *   generateOrderNumber,
 *   generateUUIDBatch,
 *   generateShortIdBatch,
 *   generateOrderNumberBatch
 * } from './uuid-utils-skill';
 * 
 * // 1. 生成单个 UUID v4
 * const uuid = generateUUIDv4();
 * console.log(uuid); // 输出: "550e8400-e29b-41d4-a716-446655440000"
 * 
 * // 2. 生成短 ID (10 位)
 * const shortId = generateShortId();
 * console.log(shortId); // 输出: "K3M9X2P7L5"
 * 
 * // 3. 生成短 ID (自定义长度)
 * const shortId8 = generateShortId(8);
 * console.log(shortId8); // 输出: "M7X9P2K5"
 * 
 * // 4. 生成订单号
 * const orderNum = generateOrderNumber();
 * console.log(orderNum); // 输出: "202603131930451234567"
 * 
 * // 5. 生成带前缀的订单号
 * const orderNumWithPrefix = generateOrderNumber('ORD');
 * console.log(orderNumWithPrefix); // 输出: "ORD-202603131930451234567"
 * 
 * // 6. 批量生成 UUID
 * const uuids = generateUUIDBatch(5);
 * console.log(uuids); // 输出: 5 个 UUID 的数组
 * 
 * // 7. 批量生成短 ID
 * const shortIds = generateShortIdBatch(10, 12);
 * console.log(shortIds); // 输出: 10 个 12 位短 ID 的数组
 * 
 * // 8. 批量生成订单号
 * const orderNumbers = generateOrderNumberBatch(3, 'SO');
 * console.log(orderNumbers); // 输出: 3 个带 "SO" 前缀的订单号
 * ```
 */

// 导出所有函数
export default {
  generateUUIDv4,
  generateShortId,
  generateOrderNumber,
  generateUUIDBatch,
  generateShortIdBatch,
  generateOrderNumberBatch,
};
