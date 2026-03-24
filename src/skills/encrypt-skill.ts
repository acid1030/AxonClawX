/**
 * 加密技能 - Encrypt Skill (ACE)
 * 
 * 功能:
 * 1. AES 加密/解密 (支持 CBC/GCM 模式)
 * 2. RSA 加密/解密 (支持 OAEP 填充)
 * 3. Hash 计算 (支持 MD5/SHA1/SHA256/SHA512)
 * 
 * @author Axon
 * @version 1.0.0
 * @module ACE (Axon Crypto Engine)
 */

import * as crypto from 'crypto';

// ============== 类型定义 ==============

/**
 * AES 加密模式
 */
export type AESMode = 'cbc' | 'gcm' | 'ecb';

/**
 * Hash 算法类型
 */
export type HashAlgorithm = 'md5' | 'sha1' | 'sha256' | 'sha512';

/**
 * AES 加密配置
 */
export interface AESConfig {
  /** 加密模式 */
  mode: AESMode;
  /** 密钥 (16/24/32 字节对应 AES-128/192/256) */
  key: string | Buffer;
  /** 初始化向量 (CBC/GCM 模式需要) */
  iv?: string | Buffer;
  /** 认证标签长度 (仅 GCM 模式) */
  authTagLength?: number;
}

/**
 * RSA 密钥对
 */
export interface RSAKeyPair {
  /** 私钥 (PEM 格式) */
  privateKey: string;
  /** 公钥 (PEM 格式) */
  publicKey: string;
}

/**
 * RSA 加密配置
 */
export interface RSAConfig {
  /** 密钥长度 (2048/4096) */
  keySize?: number;
  /** 填充方案 */
  padding?: number;
  /** OAEP 哈希算法 */
  oaepHash?: string;
}

/**
 * 加密结果 (AES)
 */
export interface AESEncryptResult {
  /** 加密后的数据 (Base64) */
  encrypted: string;
  /** 初始化向量 (Base64, CBC/GCM 模式) */
  iv?: string;
  /** 认证标签 (Base64, GCM 模式) */
  authTag?: string;
}

/**
 * 加密结果 (RSA)
 */
export interface RSAEncryptResult {
  /** 加密后的数据 (Base64) */
  encrypted: string;
}

/**
 * Hash 结果
 */
export interface HashResult {
  /** 原始数据 */
  input: string;
  /** 哈希算法 */
  algorithm: HashAlgorithm;
  /** 哈希值 (十六进制) */
  hash: string;
  /** 哈希值 (Base64) */
  hashBase64: string;
}

// ============== AES 加密解密 ==============

/**
 * AES 加密类
 */
export class AESCipher {
  private config: AESConfig;

  constructor(config: AESConfig) {
    this.validateConfig(config);
    this.config = config;
  }

  /**
   * 验证配置
   */
  private validateConfig(config: AESConfig): void {
    // 处理 hex 字符串密钥
    const keyBuffer = Buffer.isBuffer(config.key) 
      ? config.key 
      : Buffer.from(config.key, 'hex');
    
    if (![16, 24, 32].includes(keyBuffer.length)) {
      throw new Error('AES 密钥长度必须为 16/24/32 字节 (对应 AES-128/192/256)');
    }

    if (config.mode === 'cbc' || config.mode === 'gcm') {
      if (!config.iv) {
        throw new Error(`${config.mode.toUpperCase()} 模式需要初始化向量 (IV)`);
      }
      // 处理 hex 字符串 IV
      const ivBuffer = Buffer.isBuffer(config.iv) 
        ? config.iv 
        : Buffer.from(config.iv, 'hex');
      if (ivBuffer.length !== 16) {
        throw new Error('IV 长度必须为 16 字节');
      }
    }
  }

  /**
   * AES 加密
   */
  encrypt(plaintext: string): AESEncryptResult {
    const key = Buffer.isBuffer(this.config.key) ? this.config.key : Buffer.from(this.config.key, 'hex');
    const mode = this.config.mode;
    
    let iv: Buffer | undefined;
    if (this.config.iv) {
      iv = Buffer.isBuffer(this.config.iv) ? this.config.iv : Buffer.from(this.config.iv, 'hex');
    }

    let cipher: crypto.Cipher;
    let authTag: Buffer | undefined;

    if (mode === 'gcm') {
      const authTagLength = this.config.authTagLength || 16;
      cipher = crypto.createCipheriv(`aes-${key.length * 8}-${mode}`, key, iv!, {
        authTagLength
      });
      const encrypted = Buffer.concat([
        cipher.update(plaintext, 'utf8'),
        cipher.final()
      ]);
      authTag = cipher.getAuthTag();
      
      return {
        encrypted: encrypted.toString('base64'),
        iv: iv!.toString('hex'),
        authTag: authTag.toString('hex')
      };
    } else {
      // CBC or ECB
      if (mode === 'cbc') {
        cipher = crypto.createCipheriv(`aes-${key.length * 8}-${mode}`, key, iv!);
      } else {
        cipher = crypto.createCipher(`aes-${key.length * 8}-${mode}`, key);
      }
      
      const encrypted = Buffer.concat([
        cipher.update(plaintext, 'utf8'),
        cipher.final()
      ]);
      
      return {
        encrypted: encrypted.toString('base64'),
        iv: iv ? iv.toString('hex') : undefined
      };
    }
  }

  /**
   * AES 解密
   */
  decrypt(encryptedData: AESEncryptResult): string {
    const key = Buffer.isBuffer(this.config.key) ? this.config.key : Buffer.from(this.config.key, 'hex');
    const mode = this.config.mode;
    
    const encryptedBuffer = Buffer.from(encryptedData.encrypted, 'base64');
    let iv: Buffer | undefined;
    
    if (encryptedData.iv) {
      iv = Buffer.from(encryptedData.iv, 'hex');
    }

    let decipher: crypto.Decipher;

    if (mode === 'gcm') {
      if (!encryptedData.authTag) {
        throw new Error('GCM 模式需要认证标签');
      }
      const authTag = Buffer.from(encryptedData.authTag, 'hex');
      decipher = crypto.createDecipheriv(`aes-${key.length * 8}-${mode}`, key, iv!);
      decipher.setAuthTag(authTag);
    } else if (mode === 'cbc') {
      decipher = crypto.createDecipheriv(`aes-${key.length * 8}-${mode}`, key, iv!);
    } else {
      decipher = crypto.createDecipher(`aes-${key.length * 8}-${mode}`, key);
    }

    const decrypted = Buffer.concat([
      decipher.update(encryptedBuffer),
      decipher.final()
    ]);

    return decrypted.toString('utf8');
  }

  /**
   * 生成随机密钥
   */
  static generateKey(size: 128 | 192 | 256 = 256): string {
    return crypto.randomBytes(size / 8).toString('hex');
  }

  /**
   * 生成随机 IV
   */
  static generateIV(): string {
    return crypto.randomBytes(16).toString('hex');
  }
}

// ============== RSA 加密解密 ==============

/**
 * RSA 加密类
 */
export class RSACipher {
  private keyPair: RSAKeyPair;
  private config: RSAConfig;

  constructor(keyPair?: RSAKeyPair, config?: RSAConfig) {
    this.config = config || {};
    
    if (keyPair) {
      this.keyPair = keyPair;
    } else {
      this.keyPair = this.generateKeyPair(this.config.keySize || 2048);
    }
  }

  /**
   * 生成 RSA 密钥对
   */
  private generateKeyPair(keySize: number): RSAKeyPair {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: keySize,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem'
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem'
      }
    });

    return {
      publicKey,
      privateKey
    };
  }

  /**
   * RSA 加密 (使用公钥)
   */
  encrypt(plaintext: string): RSAEncryptResult {
    const publicKey = this.keyPair.publicKey;
    const padding = this.config.padding || crypto.constants.RSA_PKCS1_OAEP_PADDING;
    const oaepHash = this.config.oaepHash || 'sha256';

    const buffer = Buffer.from(plaintext, 'utf8');
    const encrypted = crypto.publicEncrypt(
      {
        key: publicKey,
        padding,
        oaepHash
      },
      buffer
    );

    return {
      encrypted: encrypted.toString('base64')
    };
  }

  /**
   * RSA 解密 (使用私钥)
   */
  decrypt(encryptedData: RSAEncryptResult): string {
    const privateKey = this.keyPair.privateKey;
    const padding = this.config.padding || crypto.constants.RSA_PKCS1_OAEP_PADDING;
    const oaepHash = this.config.oaepHash || 'sha256';

    const encryptedBuffer = Buffer.from(encryptedData.encrypted, 'base64');
    const decrypted = crypto.privateDecrypt(
      {
        key: privateKey,
        padding,
        oaepHash
      },
      encryptedBuffer
    );

    return decrypted.toString('utf8');
  }

  /**
   * 数字签名
   */
  sign(data: string): string {
    const privateKey = this.keyPair.privateKey;
    const sign = crypto.createSign('SHA256');
    sign.update(data, 'utf8');
    sign.end();
    
    const signature = sign.sign(privateKey, 'base64');
    return signature;
  }

  /**
   * 验证签名
   */
  verify(data: string, signature: string): boolean {
    const publicKey = this.keyPair.publicKey;
    const verify = crypto.createVerify('SHA256');
    verify.update(data, 'utf8');
    verify.end();
    
    return verify.verify(publicKey, signature, 'base64');
  }

  /**
   * 获取密钥对
   */
  getKeyPair(): RSAKeyPair {
    return this.keyPair;
  }

  /**
   * 从 PEM 导入公钥
   */
  static importPublicKey(pem: string): RSACipher {
    return new RSACipher({ publicKey: pem, privateKey: '' });
  }

  /**
   * 从 PEM 导入私钥
   */
  static importPrivateKey(pem: string): RSACipher {
    return new RSACipher({ publicKey: '', privateKey: pem });
  }
}

// ============== Hash 计算 ==============

/**
 * Hash 工具类
 */
export class HashUtils {
  /**
   * 计算哈希值
   */
  static hash(data: string, algorithm: HashAlgorithm = 'sha256'): HashResult {
    const hash = crypto.createHash(algorithm);
    hash.update(data, 'utf8');
    
    const digest = hash.digest();
    
    return {
      input: data,
      algorithm,
      hash: digest.toString('hex'),
      hashBase64: digest.toString('base64')
    };
  }

  /**
   * HMAC 哈希
   */
  static hmac(data: string, secret: string, algorithm: HashAlgorithm = 'sha256'): string {
    const hmac = crypto.createHmac(algorithm, secret);
    hmac.update(data, 'utf8');
    return hmac.digest('hex');
  }

  /**
   * 快速 MD5
   */
  static md5(data: string): string {
    return this.hash(data, 'md5').hash;
  }

  /**
   * 快速 SHA256
   */
  static sha256(data: string): string {
    return this.hash(data, 'sha256').hash;
  }

  /**
   * 快速 SHA512
   */
  static sha512(data: string): string {
    return this.hash(data, 'sha512').hash;
  }
}

// ============== 便捷函数 ==============

/**
 * AES 加密 (便捷函数)
 */
export function aesEncrypt(plaintext: string, key: string, mode: AESMode = 'gcm'): AESEncryptResult {
  let iv: string | undefined;
  
  if (mode === 'cbc' || mode === 'gcm') {
    iv = AESCipher.generateIV();
  }

  const cipher = new AESCipher({
    mode,
    key: key, // key is already hex string
    iv: iv
  });

  return cipher.encrypt(plaintext);
}

/**
 * AES 解密 (便捷函数)
 */
export function aesDecrypt(encryptedData: AESEncryptResult, key: string, mode: AESMode = 'gcm'): string {
  const cipher = new AESCipher({
    mode,
    key: key, // key is already hex string
    iv: encryptedData.iv || undefined
  });

  return cipher.decrypt(encryptedData);
}

/**
 * RSA 加密 (便捷函数)
 */
export function rsaEncrypt(plaintext: string, publicKey: string): RSAEncryptResult {
  const cipher = new RSACipher({ publicKey, privateKey: '' });
  return cipher.encrypt(plaintext);
}

/**
 * RSA 解密 (便捷函数)
 */
export function rsaDecrypt(encryptedData: RSAEncryptResult, privateKey: string): string {
  const cipher = new RSACipher({ publicKey: '', privateKey });
  return cipher.decrypt(encryptedData);
}

/**
 * Hash 计算 (便捷函数)
 */
export function hash(data: string, algorithm: HashAlgorithm = 'sha256'): string {
  return HashUtils.hash(data, algorithm).hash;
}

// ============== 导出 ==============

export default {
  AESCipher,
  RSACipher,
  HashUtils,
  aesEncrypt,
  aesDecrypt,
  rsaEncrypt,
  rsaDecrypt,
  hash
};
