/**
 * 加密技能测试 - Encrypt Skill Tests
 */

import { describe, it, expect, test } from 'vitest';
import {
  AESCipher,
  RSACipher,
  HashUtils,
  aesEncrypt,
  aesDecrypt,
  rsaEncrypt,
  rsaDecrypt,
  hash
} from './encrypt-skill';

describe('ACE 加密技能测试', () => {
  // ============== AES 测试 ==============

  describe('AESCipher', () => {
    test('AES-GCM 加密解密', () => {
      const key = AESCipher.generateKey(256);
      const iv = AESCipher.generateIV();
      
      const cipher = new AESCipher({
        mode: 'gcm',
        key: Buffer.from(key, 'hex'),
        iv: Buffer.from(iv, 'hex')
      });

      const plaintext = '测试数据 - AES-GCM 模式';
      const encrypted = cipher.encrypt(plaintext);
      const decrypted = cipher.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
      expect(encrypted.iv).toBeDefined();
      expect(encrypted.authTag).toBeDefined();
    });

    test('AES-CBC 加密解密', () => {
      const key = AESCipher.generateKey(128);
      const iv = AESCipher.generateIV();

      const cipher = new AESCipher({
        mode: 'cbc',
        key: Buffer.from(key, 'hex'),
        iv: Buffer.from(iv, 'hex')
      });

      const plaintext = '测试数据 - AES-CBC 模式';
      const encrypted = cipher.encrypt(plaintext);
      const decrypted = cipher.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
      expect(encrypted.iv).toBeDefined();
    });

    test('AES-256 密钥生成', () => {
      const key = AESCipher.generateKey(256);
      expect(key.length).toBe(64); // 256 bits = 64 hex chars
    });

    test('AES-128 密钥生成', () => {
      const key = AESCipher.generateKey(128);
      expect(key.length).toBe(32); // 128 bits = 32 hex chars
    });

    test('IV 生成', () => {
      const iv1 = AESCipher.generateIV();
      const iv2 = AESCipher.generateIV();
      
      expect(iv1.length).toBe(32); // 16 bytes = 32 hex chars
      expect(iv1).not.toBe(iv2); // 每次生成不同的 IV
    });

    test('无效密钥长度抛出错误', () => {
      expect(() => {
        new AESCipher({
          mode: 'gcm',
          key: Buffer.from('invalid_key', 'utf8') // 不是 16/24/32 字节
        });
      }).toThrow();
    });

    test('GCM 模式缺少 IV 抛出错误', () => {
      expect(() => {
        new AESCipher({
          mode: 'gcm',
          key: AESCipher.generateKey(256)
          // 缺少 IV
        });
      }).toThrow();
    });
  });

  // ============== 便捷函数测试 ==============

  describe('AES 便捷函数', () => {
    test('aesEncrypt 和 aesDecrypt', () => {
      const key = AESCipher.generateKey(256);
      const plaintext = '便捷函数测试';

      const encrypted = aesEncrypt(plaintext, key, 'gcm');
      const decrypted = aesDecrypt(encrypted, key, 'gcm');

      expect(decrypted).toBe(plaintext);
    });
  });

  // ============== RSA 测试 ==============

  describe('RSACipher', () => {
    test('RSA 密钥对生成', () => {
      const rsa = new RSACipher();
      const keyPair = rsa.getKeyPair();

      expect(keyPair.publicKey).toContain('-----BEGIN PUBLIC KEY-----');
      expect(keyPair.privateKey).toContain('-----BEGIN PRIVATE KEY-----');
    });

    test('RSA 加密解密 (2048 位)', () => {
      const rsa = new RSACipher(undefined, { keySize: 2048 });
      
      const plaintext = 'RSA 测试数据 - 2048 位密钥';
      const encrypted = rsa.encrypt(plaintext);
      const decrypted = rsa.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    test('RSA 加密解密 (4096 位)', () => {
      const rsa = new RSACipher(undefined, { keySize: 4096 });
      
      const plaintext = 'RSA 测试数据 - 4096 位密钥';
      const encrypted = rsa.encrypt(plaintext);
      const decrypted = rsa.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    test('RSA 数字签名', () => {
      const rsa = new RSACipher();
      
      const message = '需要签名的消息';
      const signature = rsa.sign(message);
      const isValid = rsa.verify(message, signature);

      expect(signature).toBeDefined();
      expect(signature.length).toBeGreaterThan(0);
      expect(isValid).toBe(true);
    });

    test('RSA 签名验证 - 篡改检测', () => {
      const rsa = new RSACipher();
      
      const message = '原始消息';
      const signature = rsa.sign(message);
      
      // 篡改消息后验证
      const tamperedMessage = '被篡改的消息';
      const isTamperedValid = rsa.verify(tamperedMessage, signature);

      expect(isTamperedValid).toBe(false);
    });

    test('RSA 便捷函数', () => {
      const rsa = new RSACipher();
      const { publicKey, privateKey } = rsa.getKeyPair();

      const plaintext = '便捷函数测试';
      const encrypted = rsaEncrypt(plaintext, publicKey);
      const decrypted = rsaDecrypt(encrypted, privateKey);

      expect(decrypted).toBe(plaintext);
    });
  });

  // ============== Hash 测试 ==============

  describe('HashUtils', () => {
    test('MD5 哈希', () => {
      const result = HashUtils.hash('hello', 'md5');
      expect(result.algorithm).toBe('md5');
      expect(result.hash).toBe('5d41402abc4b2a76b9719d911017c592');
      expect(result.hashBase64).toBeDefined();
    });

    test('SHA256 哈希', () => {
      const result = HashUtils.hash('hello', 'sha256');
      expect(result.algorithm).toBe('sha256');
      expect(result.hash).toBe('2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824');
    });

    test('SHA512 哈希', () => {
      const result = HashUtils.hash('hello', 'sha512');
      expect(result.algorithm).toBe('sha512');
      expect(result.hash.length).toBe(128); // 512 bits = 128 hex chars
    });

    test('快速哈希函数', () => {
      expect(HashUtils.md5('test')).toBe(HashUtils.hash('test', 'md5').hash);
      expect(HashUtils.sha256('test')).toBe(HashUtils.hash('test', 'sha256').hash);
      expect(HashUtils.sha512('test')).toBe(HashUtils.hash('test', 'sha512').hash);
    });

    test('HMAC 签名', () => {
      const data = '需要签名的数据';
      const secret = '密钥';

      const hmac1 = HashUtils.hmac(data, secret, 'sha256');
      const hmac2 = HashUtils.hmac(data, secret, 'sha256');

      expect(hmac1).toBe(hmac2); // 相同输入产生相同输出
      expect(hmac1.length).toBe(64); // SHA256 = 64 hex chars
    });

    test('HMAC - 不同密钥产生不同签名', () => {
      const data = '相同数据';
      
      const hmac1 = HashUtils.hmac(data, '密钥 1', 'sha256');
      const hmac2 = HashUtils.hmac(data, '密钥 2', 'sha256');

      expect(hmac1).not.toBe(hmac2);
    });

    test('便捷 hash 函数', () => {
      const result = hash('test data', 'sha256');
      expect(result).toBe(HashUtils.sha256('test data'));
    });
  });

  // ============== 集成测试 ==============

  describe('集成场景', () => {
    test('加密配置对象', () => {
      const config = {
        database: {
          host: 'localhost',
          password: 'secret'
        }
      };

      const key = AESCipher.generateKey(256);
      const encrypted = aesEncrypt(JSON.stringify(config), key, 'gcm');
      const decrypted = JSON.parse(aesDecrypt(encrypted, key, 'gcm'));

      expect(decrypted.database.password).toBe('secret');
    });

    test('密码哈希存储验证', () => {
      const password = 'user_password_123';
      const salt = 'random_salt_value';
      
      const hashed = HashUtils.sha256(password + salt);
      
      // 模拟登录验证
      const loginHash = HashUtils.sha256('user_password_123' + salt);
      expect(loginHash).toBe(hashed);

      // 错误密码
      const wrongHash = HashUtils.sha256('wrong_password' + salt);
      expect(wrongHash).not.toBe(hashed);
    });

    test('RSA + AES 混合加密', () => {
      // 生成 RSA 密钥对
      const rsa = new RSACipher();
      const { publicKey, privateKey } = rsa.getKeyPair();

      // 生成 AES 密钥
      const aesKey = AESCipher.generateKey(256);

      // 用 RSA 加密 AES 密钥
      const encryptedKey = rsaEncrypt(aesKey, publicKey);

      // 用 AES 加密数据
      const data = '高度机密的数据';
      const encryptedData = aesEncrypt(data, aesKey, 'gcm');

      // 解密：先用 RSA 解密 AES 密钥
      const decryptedKey = rsaDecrypt(encryptedKey, privateKey);

      // 再用 AES 解密数据
      const decryptedData = aesDecrypt(encryptedData, decryptedKey, 'gcm');

      expect(decryptedData).toBe(data);
    });
  });
});
