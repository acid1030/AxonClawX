# ACE 加密技能 - Encrypt Skill

**模块:** `src/skills/encrypt-skill.ts`  
**版本:** 1.0.0  
**作者:** Axon  
**状态:** ✅ 完成

---

## 📦 功能概览

| 功能 | 描述 | 支持算法 |
|------|------|----------|
| **AES 加密/解密** | 对称加密，适合大数据 | CBC / GCM / ECB |
| **RSA 加密/解密** | 非对称加密，适合密钥交换 | OAEP / PKCS1 |
| **Hash 计算** | 单向哈希，适合完整性校验 | MD5 / SHA1 / SHA256 / SHA512 |
| **HMAC 签名** | 消息认证码 | 所有 Hash 算法 |
| **数字签名** | RSA 签名验证 | SHA256 |

---

## 🚀 快速开始

### 安装

无需额外依赖，使用 Node.js 原生 `crypto` 模块。

### 导入

```typescript
import {
  AESCipher,
  RSACipher,
  HashUtils,
  aesEncrypt,
  aesDecrypt
} from './skills/encrypt-skill';
```

---

## 📖 使用示例

### AES 加密 (推荐 GCM 模式)

```typescript
// 生成密钥
const key = AESCipher.generateKey(256);

// 加密
const encrypted = aesEncrypt('机密数据', key, 'gcm');
// { encrypted: "...", iv: "...", authTag: "..." }

// 解密
const decrypted = aesDecrypt(encrypted, key, 'gcm');
// "机密数据"
```

### RSA 加密

```typescript
// 生成密钥对
const rsa = new RSACipher();
const { publicKey, privateKey } = rsa.getKeyPair();

// 加密
const encrypted = rsa.encrypt('只有私钥能解密的消息');

// 解密
const decrypted = rsa.decrypt(encrypted);
```

### Hash 计算

```typescript
// SHA256
const hash = HashUtils.sha256('数据');
// "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824"

// HMAC
const hmac = HashUtils.hmac('数据', '密钥', 'sha256');
```

---

## 📁 文件清单

| 文件 | 描述 |
|------|------|
| `encrypt-skill.ts` | 核心实现 |
| `encrypt-skill.test.ts` | 单元测试 (24 个测试) |
| `encrypt-skill.examples.md` | 详细使用示例 |
| `ENCRYPT-README.md` | 本文档 |

---

## ✅ 测试覆盖

```bash
npm test -- src/skills/encrypt-skill.test.ts
```

**测试结果:** 24/24 通过 ✓

- AES-GCM 加密解密
- AES-CBC 加密解密
- AES 密钥生成 (128/192/256 位)
- RSA 加密解密 (2048/4096 位)
- RSA 数字签名验证
- Hash 计算 (MD5/SHA1/SHA256/SHA512)
- HMAC 签名
- 集成场景测试

---

## 🔒 安全建议

1. **密钥管理**
   - 使用环境变量存储密钥
   - 定期轮换密钥
   - 不要硬编码密钥

2. **模式选择**
   - ✅ 推荐：GCM (提供认证)
   - ⚠️ 可用：CBC (需要 MAC)
   - ❌ 避免：ECB (不安全)

3. **密钥长度**
   - AES: 256 位
   - RSA: 2048 位或更高

---

## 📊 API 参考

### AESCipher

```typescript
class AESCipher {
  constructor(config: AESConfig)
  encrypt(plaintext: string): AESEncryptResult
  decrypt(encryptedData: AESEncryptResult): string
  static generateKey(size: 128|192|256): string
  static generateIV(): string
}
```

### RSACipher

```typescript
class RSACipher {
  constructor(keyPair?: RSAKeyPair, config?: RSAConfig)
  encrypt(plaintext: string): RSAEncryptResult
  decrypt(encryptedData: RSAEncryptResult): string
  sign(data: string): string
  verify(data: string, signature: string): boolean
  getKeyPair(): RSAKeyPair
}
```

### HashUtils

```typescript
class HashUtils {
  static hash(data: string, algorithm: HashAlgorithm): HashResult
  static hmac(data: string, secret: string, algorithm: HashAlgorithm): string
  static md5(data: string): string
  static sha256(data: string): string
  static sha512(data: string): string
}
```

---

## 🎯 应用场景

- ✅ 配置文件加密
- ✅ 密码哈希存储
- ✅ API 请求签名
- ✅ 文件完整性校验
- ✅ JWT Token 加密
- ✅ 敏感数据传输

---

**交付时间:** < 10 分钟  
**交付状态:** ✅ 完成
