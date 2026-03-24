/**
 * 加密工具技能 - KAEL
 * 
 * 提供常用加密解密功能：
 * 1. AES 加密/解密
 * 2. RSA 加密/解密
 * 3. 密钥生成
 * 
 * @module crypto-utils
 */

import * as crypto from 'crypto';

// ============================================
// AES 加密解密
// ============================================

/**
 * AES 加密配置选项
 */
export interface AESOptions {
  /** 密钥 (16/24/32 字节，对应 AES-128/192/256) */
  key: string | Buffer;
  /** 初始化向量 (16 字节)，可选，不提供则自动生成 */
  iv?: string | Buffer;
  /** 加密模式，默认 'aes-256-cbc' */
  algorithm?: string;
  /** 输入编码，默认 'utf8' */
  inputEncoding?: string;
  /** 输出编码，默认 'hex' */
  outputEncoding?: 'hex' | 'base64';
}

/**
 * AES 解密配置选项
 */
export interface AESDecryptOptions {
  /** 密钥 (16/24/32 字节) */
  key: string | Buffer;
  /** 初始化向量 (16 字节)，可选，从密文中提取 */
  iv?: string | Buffer;
  /** 加密模式，默认 'aes-256-cbc' */
  algorithm?: string;
  /** 输入编码，默认 'hex' */
  inputEncoding?: 'hex' | 'base64';
  /** 输出编码，默认 'utf8' */
  outputEncoding?: string;
}

/**
 * AES 加密
 * 
 * @param plaintext - 明文
 * @param options - 加密配置
 * @returns 密文 (hex 或 base64 编码)
 * 
 * @example
 * const encrypted = aesEncrypt('Hello World', { key: 'my-secret-key-1234567890123456' });
 * const encryptedBase64 = aesEncrypt('Hello World', { 
 *   key: 'my-secret-key-1234567890123456',
 *   outputEncoding: 'base64'
 * });
 */
export function aesEncrypt(plaintext: string, options: AESOptions): string {
  const {
    key,
    iv,
    algorithm = 'aes-256-cbc',
    inputEncoding = 'utf8',
    outputEncoding = 'hex',
  } = options;
  
  // 处理密钥：如果密钥长度不足，使用 SHA-256 哈希
  const keyBuffer = typeof key === 'string' 
    ? Buffer.from(key.length === 32 ? key : crypto.createHash('sha256').update(key).digest())
    : key;
  
  // 验证密钥长度
  const keySize = algorithm.includes('256') ? 32 : algorithm.includes('192') ? 24 : 16;
  if (keyBuffer.length !== keySize) {
    throw new Error(`Key must be ${keySize} bytes for ${algorithm}`);
  }
  
  // 生成或使用提供的 IV
  const ivBuffer = iv 
    ? (typeof iv === 'string' ? Buffer.from(iv, 'hex') : iv)
    : crypto.randomBytes(16);
  
  if (ivBuffer.length !== 16) {
    throw new Error('IV must be 16 bytes');
  }
  
  // 创建加密器
  const cipher = crypto.createCipheriv(algorithm, keyBuffer, ivBuffer);
  
  // 加密数据
  const encryptedBuffer = Buffer.concat([
    cipher.update(plaintext, inputEncoding as BufferEncoding),
    cipher.final()
  ]);
  
  // 返回 IV + 密文 (以便解密时使用)
  const ivHex = ivBuffer.toString('hex');
  const encryptedData = outputEncoding === 'base64' 
    ? encryptedBuffer.toString('base64')
    : encryptedBuffer.toString('hex');
  
  return `${ivHex}:${encryptedData}`;
}

/**
 * AES 解密
 * 
 * @param ciphertext - 密文 (格式：iv:encryptedData)
 * @param options - 解密配置
 * @returns 明文
 * 
 * @example
 * const decrypted = aesDecrypt('iv:encryptedData', { key: 'my-secret-key-1234567890123456' });
 */
export function aesDecrypt(ciphertext: string, options: AESDecryptOptions): string {
  const {
    key,
    algorithm = 'aes-256-cbc',
    inputEncoding = 'hex',
    outputEncoding = 'utf8',
  } = options;
  
  // 分离 IV 和密文
  const parts = ciphertext.split(':');
  if (parts.length !== 2) {
    throw new Error('Invalid ciphertext format. Expected "iv:encryptedData"');
  }
  
  const ivHex = parts[0];
  const encryptedData = parts[1];
  
  // 处理密钥
  const keyBuffer = typeof key === 'string'
    ? Buffer.from(key.length === 32 ? key : crypto.createHash('sha256').update(key).digest())
    : key;
  
  const keySize = algorithm.includes('256') ? 32 : algorithm.includes('192') ? 24 : 16;
  if (keyBuffer.length !== keySize) {
    throw new Error(`Key must be ${keySize} bytes for ${algorithm}`);
  }
  
  // 解析 IV
  const ivBuffer = Buffer.from(ivHex, 'hex');
  
  // 创建解密器
  const decipher = crypto.createDecipheriv(algorithm, keyBuffer, ivBuffer);
  
  // 解密数据
  const decryptedBuffer = Buffer.concat([
    decipher.update(encryptedData, inputEncoding as BufferEncoding),
    decipher.final()
  ]);
  
  return decryptedBuffer.toString(outputEncoding as BufferEncoding);
}

// ============================================
// RSA 加密解密
// ============================================

/**
 * RSA 密钥对
 */
export interface RSAKeyPair {
  /** 公钥 (PEM 格式) */
  publicKey: string;
  /** 私钥 (PEM 格式) */
  privateKey: string;
}

/**
 * RSA 密钥生成选项
 */
export interface RSAKeyGenOptions {
  /** 密钥长度，默认 2048 */
  modulusLength?: number;
  /** 公钥指数，默认 65537 */
  publicExponent?: number;
  /** 哈希算法，默认 'sha256' */
  hashAlgorithm?: string;
  /** 密钥对名称标识，可选 */
  name?: string;
}

/**
 * 生成 RSA 密钥对
 * 
 * @param options - 密钥生成选项
 * @returns RSA 密钥对 (PEM 格式)
 * 
 * @example
 * const keyPair = generateRSAKeyPair();
 * console.log(keyPair.publicKey);  // -----BEGIN PUBLIC KEY-----
 * console.log(keyPair.privateKey); // -----BEGIN PRIVATE KEY-----
 * 
 * @example
 * const keyPair = generateRSAKeyPair({ modulusLength: 4096 });
 */
export function generateRSAKeyPair(options: RSAKeyGenOptions = {}): RSAKeyPair {
  const {
    modulusLength = 2048,
    publicExponent = 65537,
    hashAlgorithm = 'sha256',
  } = options;
  
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength,
    publicExponent,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem',
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem',
    },
  });
  
  return { publicKey, privateKey };
}

/**
 * RSA 加密选项
 */
export interface RSAEncryptOptions {
  /** 公钥 (PEM 格式) */
  publicKey: string;
  /** 填充模式，默认 'pkcs1' */
  padding?: number;
  /** 输入编码，默认 'utf8' */
  inputEncoding?: string;
  /** 输出编码，默认 'base64' */
  outputEncoding?: 'base64' | 'hex';
}

/**
 * RSA 加密 (使用公钥)
 * 
 * @param plaintext - 明文
 * @param options - 加密选项
 * @returns 密文
 * 
 * @example
 * const keyPair = generateRSAKeyPair();
 * const encrypted = rsaEncrypt('Secret message', { publicKey: keyPair.publicKey });
 */
export function rsaEncrypt(plaintext: string, options: RSAEncryptOptions): string {
  const {
    publicKey,
    padding = crypto.constants.RSA_PKCS1_OAEP_PADDING,
    inputEncoding = 'utf8',
    outputEncoding = 'base64',
  } = options;
  
  const buffer = Buffer.from(plaintext, inputEncoding as BufferEncoding);
  const encrypted = crypto.publicEncrypt(
    {
      key: publicKey,
      padding,
    },
    buffer
  );
  
  return encrypted.toString(outputEncoding);
}

/**
 * RSA 解密选项
 */
export interface RSADecryptOptions {
  /** 私钥 (PEM 格式) */
  privateKey: string;
  /** 填充模式，默认 'pkcs1' */
  padding?: number;
  /** 输入编码，默认 'base64' */
  inputEncoding?: 'base64' | 'hex';
  /** 输出编码，默认 'utf8' */
  outputEncoding?: string;
}

/**
 * RSA 解密 (使用私钥)
 * 
 * @param ciphertext - 密文
 * @param options - 解密选项
 * @returns 明文
 * 
 * @example
 * const decrypted = rsaDecrypt(encrypted, { privateKey: keyPair.privateKey });
 */
export function rsaDecrypt(ciphertext: string, options: RSADecryptOptions): string {
  const {
    privateKey,
    padding = crypto.constants.RSA_PKCS1_OAEP_PADDING,
    inputEncoding = 'base64',
    outputEncoding = 'utf8',
  } = options;
  
  const buffer = Buffer.from(ciphertext, inputEncoding as BufferEncoding);
  const decrypted = crypto.privateDecrypt(
    {
      key: privateKey,
      padding,
    },
    buffer
  );
  
  return decrypted.toString(outputEncoding as BufferEncoding);
}

/**
 * RSA 签名选项
 */
export interface RSASignOptions {
  /** 私钥 (PEM 格式) */
  privateKey: string;
  /** 哈希算法，默认 'sha256' */
  algorithm?: string;
  /** 输入编码，默认 'utf8' */
  inputEncoding?: string;
  /** 输出编码，默认 'base64' */
  outputEncoding?: 'base64' | 'hex';
}

/**
 * RSA 数字签名
 * 
 * @param data - 需要签名的数据
 * @param options - 签名选项
 * @returns 签名
 * 
 * @example
 * const signature = rsaSign('Important document', { privateKey: keyPair.privateKey });
 */
export function rsaSign(data: string, options: RSASignOptions): string {
  const {
    privateKey,
    algorithm = 'sha256',
    inputEncoding = 'utf8',
    outputEncoding = 'base64',
  } = options;
  
  const sign = crypto.createSign(algorithm);
  sign.update(data, inputEncoding as BufferEncoding);
  sign.end();
  
  const signature = sign.sign(privateKey, outputEncoding);
  return signature;
}

/**
 * RSA 签名验证选项
 */
export interface RSAVerifyOptions {
  /** 公钥 (PEM 格式) */
  publicKey: string;
  /** 哈希算法，默认 'sha256' */
  algorithm?: string;
  /** 签名编码，默认 'base64' */
  signatureEncoding?: 'base64' | 'hex';
}

/**
 * RSA 签名验证
 * 
 * @param data - 原始数据
 * @param signature - 签名
 * @param options - 验证选项
 * @returns 验证结果
 * 
 * @example
 * const isValid = rsaVerify('Important document', signature, { publicKey: keyPair.publicKey });
 */
export function rsaVerify(
  data: string,
  signature: string,
  options: RSAVerifyOptions
): boolean {
  const {
    publicKey,
    algorithm = 'sha256',
    signatureEncoding = 'base64',
  } = options;
  
  const verify = crypto.createVerify(algorithm);
  verify.update(data, 'utf8');
  verify.end();
  
  return verify.verify(publicKey, signature, signatureEncoding);
}

// ============================================
// 密钥派生工具
// ============================================

/**
 * 从密码派生密钥 (PBKDF2)
 * 
 * @param password - 密码
 * @param salt - 盐值 (随机字符串)
 * @param iterations - 迭代次数，默认 100000
 * @param keyLength - 密钥长度 (字节)，默认 32
 * @param digest - 哈希算法，默认 'sha256'
 * @returns 派生的密钥 (hex 编码)
 * 
 * @example
 * const salt = crypto.randomBytes(16).toString('hex');
 * const key = deriveKey('my-password', salt);
 */
export function deriveKey(
  password: string,
  salt: string,
  iterations: number = 100000,
  keyLength: number = 32,
  digest: string = 'sha256'
): string {
  return crypto.pbkdf2Sync(password, salt, iterations, keyLength, digest).toString('hex');
}

/**
 * 生成随机盐值
 * 
 * @param length - 盐值长度 (字节)，默认 16
 * @param encoding - 编码方式，默认 'hex'
 * @returns 随机盐值
 * 
 * @example
 * const salt = generateSalt();
 * const saltBase64 = generateSalt(16, 'base64');
 */
export function generateSalt(length: number = 16, encoding: 'hex' | 'base64' = 'hex'): string {
  return crypto.randomBytes(length).toString(encoding);
}

// ============================================
// 使用示例
// ============================================

if (require.main === module) {
  console.log('=== 加密工具技能 - 使用示例 ===\n');
  
  // ============================================
  // 1. AES 加密解密示例
  // ============================================
  console.log('1️⃣  AES 加密解密:');
  console.log('─'.repeat(60));
  
  const aesKey = 'my-super-secret-key-1234567890123456'; // 32 字节
  const aesPlaintext = 'Hello, this is a secret message! 🔐';
  
  console.log(`   明文：${aesPlaintext}`);
  
  // AES 加密
  const aesEncrypted = aesEncrypt(aesPlaintext, { key: aesKey });
  console.log(`   密文：${aesEncrypted}`);
  
  // AES 解密
  const aesDecrypted = aesDecrypt(aesEncrypted, { key: aesKey } as AESDecryptOptions);
  console.log(`   解密：${aesDecrypted}`);
  console.log(`   ✅ 验证：${aesDecrypted === aesPlaintext ? '成功' : '失败'}\n`);
  
  // ============================================
  // 2. RSA 密钥生成示例
  // ============================================
  console.log('2️⃣  RSA 密钥生成:');
  console.log('─'.repeat(60));
  
  const rsaKeyPair = generateRSAKeyPair({ modulusLength: 2048 });
  console.log('   公钥 (前 50 字符):', rsaKeyPair.publicKey.substring(0, 50) + '...');
  console.log('   私钥 (前 50 字符):', rsaKeyPair.privateKey.substring(0, 50) + '...\n');
  
  // ============================================
  // 3. RSA 加密解密示例
  // ============================================
  console.log('3️⃣  RSA 加密解密:');
  console.log('─'.repeat(60));
  
  const rsaPlaintext = 'Top secret RSA message! 🗝️';
  console.log(`   明文：${rsaPlaintext}`);
  
  // RSA 加密 (使用公钥)
  const rsaEncrypted = rsaEncrypt(rsaPlaintext, { publicKey: rsaKeyPair.publicKey });
  console.log(`   密文：${rsaEncrypted.substring(0, 50)}...`);
  
  // RSA 解密 (使用私钥)
  const rsaDecrypted = rsaDecrypt(rsaEncrypted, { privateKey: rsaKeyPair.privateKey });
  console.log(`   解密：${rsaDecrypted}`);
  console.log(`   ✅ 验证：${rsaDecrypted === rsaPlaintext ? '成功' : '失败'}\n`);
  
  // ============================================
  // 4. RSA 数字签名示例
  // ============================================
  console.log('4️⃣  RSA 数字签名:');
  console.log('─'.repeat(60));
  
  const document = 'This is an important document that needs signing.';
  console.log(`   文档：${document}`);
  
  // 签名
  const signature = rsaSign(document, { privateKey: rsaKeyPair.privateKey });
  console.log(`   签名：${signature.substring(0, 50)}...`);
  
  // 验证
  const isValid = rsaVerify(document, signature, { publicKey: rsaKeyPair.publicKey });
  console.log(`   验证：${isValid ? '✅ 签名有效' : '❌ 签名无效'}`);
  
  // 验证篡改后的文档
  const tamperedDoc = 'This document has been tampered with!';
  const isTamperedValid = rsaVerify(tamperedDoc, signature, { publicKey: rsaKeyPair.publicKey });
  console.log(`   篡改验证：${isTamperedValid ? '❌ 错误通过' : '✅ 正确拒绝'}\n`);
  
  // ============================================
  // 5. 密钥派生示例
  // ============================================
  console.log('5️⃣  密钥派生 (PBKDF2):');
  console.log('─'.repeat(60));
  
  const password = 'my-secure-password-123';
  const salt = generateSalt();
  console.log(`   密码：${password}`);
  console.log(`   盐值：${salt}`);
  
  const derivedKey = deriveKey(password, salt);
  console.log(`   派生密钥：${derivedKey}`);
  
  // 验证相同密码 + 盐值生成相同密钥
  const derivedKey2 = deriveKey(password, salt);
  console.log(`   ✅ 一致性验证：${derivedKey === derivedKey2 ? '成功' : '失败'}\n`);
  
  // ============================================
  // 6. 实际应用场景示例
  // ============================================
  console.log('6️⃣  实际应用场景:');
  console.log('─'.repeat(60));
  
  // 场景 1: 安全存储密码
  console.log('   场景 1: 安全密码存储');
  const userPassword = 'user-password-123';
  const userSalt = generateSalt();
  const storedKey = deriveKey(userPassword, userSalt);
  console.log(`   存储：salt=${userSalt}, key=${storedKey.substring(0, 32)}...`);
  
  // 验证密码
  const loginPassword = 'user-password-123';
  const loginKey = deriveKey(loginPassword, userSalt);
  console.log(`   登录验证：${storedKey === loginKey ? '✅ 密码正确' : '❌ 密码错误'}\n`);
  
  // 场景 2: 混合加密 (RSA + AES)
  console.log('   场景 2: 混合加密系统 (推荐)');
  console.log('   - 使用 RSA 加密 AES 密钥');
  console.log('   - 使用 AES 加密实际数据');
  
  const sessionKey = generateSalt(32); // 32 字节 AES 密钥
  const encryptedSessionKey = rsaEncrypt(sessionKey, { publicKey: rsaKeyPair.publicKey });
  console.log(`   AES 密钥 (加密后): ${encryptedSessionKey.substring(0, 40)}...`);
  
  const sensitiveData = 'Credit card: 1234-5678-9012-3456';
  const encryptedData = aesEncrypt(sensitiveData, { key: sessionKey });
  console.log(`   数据 (加密后): ${encryptedData.substring(0, 40)}...`);
  console.log('   ✅ 混合加密完成\n');
  
  console.log('✅ 所有示例执行完成!');
  console.log('\n💡 提示: 生产环境请使用更长的密钥和更安全的密钥管理方案');
}
