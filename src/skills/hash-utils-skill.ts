/**
 * Hash Utils Skill - ACE
 * 
 * 哈希计算工具集
 * 功能：MD5/SHA1/SHA256 哈希、HMAC 签名、哈希验证
 * 
 * @author Axon
 * @version 1.0.0
 */

import * as crypto from 'crypto';

// ============================================================================
// 类型定义
// ============================================================================

export type HashAlgorithm = 'md5' | 'sha1' | 'sha256' | 'sha512';

export interface HashOptions {
  algorithm?: HashAlgorithm;
  encoding?: 'hex' | 'base64';
}

export interface HMACOptions {
  algorithm?: HashAlgorithm;
  encoding?: 'hex' | 'base64';
}

export interface HashResult {
  algorithm: string;
  hash: string;
  encoding: string;
  inputLength: number;
  timestamp: number;
}

export interface VerificationResult {
  valid: boolean;
  expected: string;
  actual: string;
  algorithm: string;
}

// ============================================================================
// 核心函数
// ============================================================================

/**
 * 计算字符串或 Buffer 的哈希值
 * 
 * @param input - 输入数据 (string 或 Buffer)
 * @param options - 哈希选项
 * @returns HashResult 包含算法、哈希值、编码等信息
 * 
 * @example
 * ```typescript
 * // 默认 SHA256
 * const result = hash('Hello, World!');
 * console.log(result.hash); // '7f83b165...'
 * 
 * // 指定算法
 * const md5Result = hash('Hello, World!', { algorithm: 'md5' });
 * console.log(md5Result.hash); // '65a8e27d...'
 * 
 * // Base64 编码
 * const base64Result = hash('Hello, World!', { encoding: 'base64' });
 * console.log(base64Result.hash); // 'f4OxZX...'
 * ```
 */
export function hash(
  input: string | Buffer,
  options: HashOptions = {}
): HashResult {
  const {
    algorithm = 'sha256',
    encoding = 'hex'
  } = options;

  const hash = crypto.createHash(algorithm);
  
  // 处理输入
  if (typeof input === 'string') {
    hash.update(input, 'utf8');
  } else {
    hash.update(input);
  }

  const hashValue = hash.digest(encoding);

  return {
    algorithm,
    hash: hashValue,
    encoding,
    inputLength: typeof input === 'string' ? input.length : input.length,
    timestamp: Date.now()
  };
}

/**
 * 计算 HMAC 签名
 * 
 * @param input - 输入数据
 * @param secret - 密钥
 * @param options - HMAC 选项
 * @returns HashResult 包含算法、签名、编码等信息
 * 
 * @example
 * ```typescript
 * // 默认 HMAC-SHA256
 * const signature = hmac('Hello, World!', 'my-secret-key');
 * console.log(signature.hash); // '9a8b7c6d...'
 * 
 * // 指定算法
 * const hmacSHA512 = hmac('Hello, World!', 'my-secret-key', { algorithm: 'sha512' });
 * 
 * // Base64 编码
 * const base64Sig = hmac('Hello, World!', 'my-secret-key', { encoding: 'base64' });
 * ```
 */
export function hmac(
  input: string | Buffer,
  secret: string | Buffer,
  options: HMACOptions = {}
): HashResult {
  const {
    algorithm = 'sha256',
    encoding = 'hex'
  } = options;

  const hmac = crypto.createHmac(algorithm, secret);
  
  // 处理输入
  if (typeof input === 'string') {
    hmac.update(input, 'utf8');
  } else {
    hmac.update(input);
  }

  const signature = hmac.digest(encoding);

  return {
    algorithm: `hmac-${algorithm}`,
    hash: signature,
    encoding,
    inputLength: typeof input === 'string' ? input.length : input.length,
    timestamp: Date.now()
  };
}

/**
 * 验证哈希值是否匹配
 * 
 * @param input - 原始输入数据
 * @param expectedHash - 期望的哈希值
 * @param options - 验证选项
 * @returns VerificationResult 包含验证结果、实际哈希值等
 * 
 * @example
 * ```typescript
 * // 基本验证
 * const result = verifyHash('Hello, World!', '7f83b165...');
 * console.log(result.valid); // true 或 false
 * 
 * // 指定算法
 * const md5Result = verifyHash('Hello, World!', '65a8e27d...', { algorithm: 'md5' });
 * 
 * // 常量时间比较 (防时序攻击)
 * const secureResult = verifyHash('sensitive-data', 'abc123...', { secure: true });
 * ```
 */
export function verifyHash(
  input: string | Buffer,
  expectedHash: string,
  options: HashOptions & { secure?: boolean } = {}
): VerificationResult {
  const {
    algorithm = 'sha256',
    encoding = 'hex',
    secure = true
  } = options;

  const actualResult = hash(input, { algorithm, encoding });
  const actualHash = actualResult.hash;

  // 常量时间比较，防止时序攻击
  let isValid: boolean;
  if (secure) {
    isValid = crypto.timingSafeEqual(
      Buffer.from(expectedHash, encoding),
      Buffer.from(actualHash, encoding)
    );
  } else {
    isValid = expectedHash === actualHash;
  }

  return {
    valid: isValid,
    expected: expectedHash,
    actual: actualHash,
    algorithm
  };
}

/**
 * 验证 HMAC 签名
 * 
 * @param input - 原始输入数据
 * @param secret - 密钥
 * @param expectedSignature - 期望的签名
 * @param options - 验证选项
 * @returns VerificationResult 包含验证结果
 * 
 * @example
 * ```typescript
 * // 验证 HMAC 签名
 * const isValid = verifyHMAC('Hello, World!', 'my-secret-key', '9a8b7c6d...');
 * console.log(isValid.valid); // true 或 false
 * ```
 */
export function verifyHMAC(
  input: string | Buffer,
  secret: string | Buffer,
  expectedSignature: string,
  options: HMACOptions = {}
): VerificationResult {
  const {
    algorithm = 'sha256',
    encoding = 'hex'
  } = options;

  const actualResult = hmac(input, secret, { algorithm, encoding });
  const actualSignature = actualResult.hash;

  // 常量时间比较
  const isValid = crypto.timingSafeEqual(
    Buffer.from(expectedSignature, encoding),
    Buffer.from(actualSignature, encoding)
  );

  return {
    valid: isValid,
    expected: expectedSignature,
    actual: actualSignature,
    algorithm: `hmac-${algorithm}`
  };
}

// ============================================================================
// 便捷函数
// ============================================================================

/**
 * 快速计算 MD5 哈希
 */
export function md5(input: string | Buffer): string {
  return hash(input, { algorithm: 'md5' }).hash;
}

/**
 * 快速计算 SHA1 哈希
 */
export function sha1(input: string | Buffer): string {
  return hash(input, { algorithm: 'sha1' }).hash;
}

/**
 * 快速计算 SHA256 哈希
 */
export function sha256(input: string | Buffer): string {
  return hash(input, { algorithm: 'sha256' }).hash;
}

/**
 * 快速计算 SHA512 哈希
 */
export function sha512(input: string | Buffer): string {
  return hash(input, { algorithm: 'sha512' }).hash;
}

/**
 * 快速计算 HMAC-SHA256 签名
 */
export function hmacSHA256(input: string | Buffer, secret: string | Buffer): string {
  return hmac(input, secret, { algorithm: 'sha256' }).hash;
}

/**
 * 快速计算 HMAC-SHA512 签名
 */
export function hmacSHA512(input: string | Buffer, secret: string | Buffer): string {
  return hmac(input, secret, { algorithm: 'sha512' }).hash;
}

// ============================================================================
// 文件哈希 (可选功能)
// ============================================================================

/**
 * 计算文件的哈希值
 * 
 * @param filePath - 文件路径
 * @param options - 哈希选项
 * @returns Promise<HashResult> 异步返回哈希结果
 * 
 * @example
 * ```typescript
 * // 计算文件 SHA256
 * const result = await hashFile('/path/to/file.txt');
 * console.log(result.hash);
 * 
 * // 计算文件 MD5
 * const md5Result = await hashFile('/path/to/file.txt', { algorithm: 'md5' });
 * ```
 */
export async function hashFile(
  filePath: string,
  options: HashOptions = {}
): Promise<HashResult> {
  const {
    algorithm = 'sha256',
    encoding = 'hex'
  } = options;

  return new Promise((resolve, reject) => {
    const hash = crypto.createHash(algorithm);
    const stream = require('fs').createReadStream(filePath);

    stream.on('data', (data: Buffer) => {
      hash.update(data);
    });

    stream.on('end', () => {
      const hashValue = hash.digest(encoding);
      resolve({
        algorithm,
        hash: hashValue,
        encoding,
        inputLength: -1, // 文件长度未知
        timestamp: Date.now()
      });
    });

    stream.on('error', (err: Error) => {
      reject(err);
    });
  });
}

// ============================================================================
// 导出
// ============================================================================

export default {
  hash,
  hmac,
  verifyHash,
  verifyHMAC,
  md5,
  sha1,
  sha256,
  sha512,
  hmacSHA256,
  hmacSHA512,
  hashFile
};
