# 🔐 加密工具技能 - KAEL

**位置:** `src/skills/crypto-utils-skill.ts`  
**作者:** KAEL  
**版本:** 1.0.0

---

## 📋 功能概览

| 功能 | 描述 | 状态 |
|------|------|------|
| **AES 加密/解密** | 支持 AES-128/192/256-CBC 模式 | ✅ |
| **RSA 加密/解密** | 支持 2048/4096 位密钥 | ✅ |
| **RSA 签名/验证** | 数字签名与验证 | ✅ |
| **密钥生成** | RSA 密钥对生成 | ✅ |
| **密钥派生** | PBKDF2 密钥派生 | ✅ |
| **盐值生成** | 加密安全随机盐值 | ✅ |

---

## 🚀 快速开始

### 1. AES 加密解密

```typescript
import { aesEncrypt, aesDecrypt } from './src/skills/crypto-utils-skill';

// 加密
const plaintext = 'Hello, World!';
const key = 'my-secret-key-1234567890123456'; // 32 字节 = AES-256

const encrypted = aesEncrypt(plaintext, { key });
console.log('密文:', encrypted);
// 输出：iv:encryptedData (格式)

// 解密
const decrypted = aesDecrypt(encrypted, { key });
console.log('明文:', decrypted);
// 输出：Hello, World!
```

### 2. RSA 密钥生成

```typescript
import { generateRSAKeyPair } from './src/skills/crypto-utils-skill';

// 生成 2048 位密钥对
const keyPair = generateRSAKeyPair();
console.log('公钥:', keyPair.publicKey);
console.log('私钥:', keyPair.privateKey);

// 生成 4096 位密钥对 (更安全)
const strongKeyPair = generateRSAKeyPair({ modulusLength: 4096 });
```

### 3. RSA 加密解密

```typescript
import { rsaEncrypt, rsaDecrypt, generateRSAKeyPair } from './src/skills/crypto-utils-skill';

const keyPair = generateRSAKeyPair();
const message = 'Top secret message!';

// 使用公钥加密
const encrypted = rsaEncrypt(message, { 
  publicKey: keyPair.publicKey 
});

// 使用私钥解密
const decrypted = rsaDecrypt(encrypted, { 
  privateKey: keyPair.privateKey 
});

console.log('解密结果:', decrypted);
```

### 4. RSA 数字签名

```typescript
import { rsaSign, rsaVerify, generateRSAKeyPair } from './src/skills/crypto-utils-skill';

const keyPair = generateRSAKeyPair();
const document = 'This is an important contract.';

// 使用私钥签名
const signature = rsaSign(document, { 
  privateKey: keyPair.privateKey 
});

// 使用公钥验证
const isValid = rsaVerify(document, signature, { 
  publicKey: keyPair.publicKey 
});

console.log('签名有效:', isValid); // true

// 验证篡改后的文档
const tamperedDoc = 'This document has been changed!';
const isTamperedValid = rsaVerify(tamperedDoc, signature, { 
  publicKey: keyPair.publicKey 
});

console.log('篡改验证:', isTamperedValid); // false
```

### 5. 密钥派生 (PBKDF2)

```typescript
import { deriveKey, generateSalt } from './src/skills/crypto-utils-skill';

const password = 'user-password-123';
const salt = generateSalt(); // 生成随机盐值

// 从密码派生密钥
const derivedKey = deriveKey(password, salt);
console.log('派生密钥:', derivedKey);

// 验证密码 (登录场景)
const loginKey = deriveKey('user-password-123', salt);
const isMatch = derivedKey === loginKey;
console.log('密码匹配:', isMatch); // true
```

---

## 📖 API 参考

### AES 加密

```typescript
function aesEncrypt(plaintext: string, options: AESOptions): string
```

**参数:**
- `plaintext` - 明文字符串
- `options.key` - 密钥 (16/24/32 字节，对应 AES-128/192/256)
- `options.iv` - 初始化向量 (可选，自动生成)
- `options.algorithm` - 加密算法 (默认：'aes-256-cbc')
- `options.outputEncoding` - 输出编码 ('hex' | 'base64', 默认：'hex')

**返回:** 密文 (格式：`iv:encryptedData`)

---

### AES 解密

```typescript
function aesDecrypt(ciphertext: string, options: AESDecryptOptions): string
```

**参数:**
- `ciphertext` - 密文 (格式：`iv:encryptedData`)
- `options.key` - 密钥 (必须与加密时相同)
- `options.algorithm` - 加密算法 (默认：'aes-256-cbc')

**返回:** 明文字符串

---

### RSA 密钥生成

```typescript
function generateRSAKeyPair(options?: RSAKeyGenOptions): RSAKeyPair
```

**参数:**
- `options.modulusLength` - 密钥长度 (2048 | 4096, 默认：2048)
- `options.publicExponent` - 公钥指数 (默认：65537)

**返回:** 
```typescript
{
  publicKey: string;  // PEM 格式公钥
  privateKey: string; // PEM 格式私钥
}
```

---

### RSA 加密

```typescript
function rsaEncrypt(plaintext: string, options: RSAEncryptOptions): string
```

**参数:**
- `plaintext` - 明文
- `options.publicKey` - 公钥 (PEM 格式)
- `options.outputEncoding` - 输出编码 ('base64' | 'hex', 默认：'base64')

**返回:** 密文

---

### RSA 解密

```typescript
function rsaDecrypt(ciphertext: string, options: RSADecryptOptions): string
```

**参数:**
- `ciphertext` - 密文
- `options.privateKey` - 私钥 (PEM 格式)

**返回:** 明文

---

### RSA 签名

```typescript
function rsaSign(data: string, options: RSASignOptions): string
```

**参数:**
- `data` - 需要签名的数据
- `options.privateKey` - 私钥 (PEM 格式)
- `options.algorithm` - 哈希算法 (默认：'sha256')

**返回:** 签名 (base64 编码)

---

### RSA 签名验证

```typescript
function rsaVerify(data: string, signature: string, options: RSAVerifyOptions): boolean
```

**参数:**
- `data` - 原始数据
- `signature` - 签名
- `options.publicKey` - 公钥 (PEM 格式)
- `options.algorithm` - 哈希算法 (默认：'sha256')

**返回:** 验证结果 (true | false)

---

### 密钥派生

```typescript
function deriveKey(
  password: string,
  salt: string,
  iterations?: number,
  keyLength?: number,
  digest?: string
): string
```

**参数:**
- `password` - 密码
- `salt` - 盐值 (使用 `generateSalt()` 生成)
- `iterations` - 迭代次数 (默认：100000)
- `keyLength` - 密钥长度 (默认：32)
- `digest` - 哈希算法 (默认：'sha256')

**返回:** 派生密钥 (hex 编码)

---

### 盐值生成

```typescript
function generateSalt(length?: number, encoding?: 'hex' | 'base64'): string
```

**参数:**
- `length` - 盐值长度 (字节，默认：16)
- `encoding` - 编码方式 (默认：'hex')

**返回:** 随机盐值

---

## 🎯 实际应用场景

### 场景 1: 用户密码安全存储

```typescript
import { deriveKey, generateSalt } from './src/skills/crypto-utils-skill';

// 注册：存储密码
const password = 'user-password-123';
const salt = generateSalt();
const hashedKey = deriveKey(password, salt, 100000, 32, 'sha256');

// 存储到数据库
database.save('users', { 
  username: 'john',
  salt: salt,
  passwordHash: hashedKey 
});

// 登录：验证密码
const loginPassword = 'user-password-123';
const loginKey = deriveKey(loginPassword, salt, 100000, 32, 'sha256');

if (loginKey === storedHash) {
  console.log('登录成功!');
} else {
  console.log('密码错误!');
}
```

---

### 场景 2: 混合加密系统 (推荐)

```typescript
import { 
  generateRSAKeyPair, 
  rsaEncrypt, 
  rsaDecrypt,
  aesEncrypt, 
  aesDecrypt 
} from './src/skills/crypto-utils-skill';

// 1. 生成 RSA 密钥对
const keyPair = generateRSAKeyPair();

// 2. 生成随机 AES 会话密钥
const sessionKey = generateSalt(32); // 32 字节

// 3. 使用 RSA 加密 AES 密钥
const encryptedSessionKey = rsaEncrypt(sessionKey, { 
  publicKey: keyPair.publicKey 
});

// 4. 使用 AES 加密敏感数据
const sensitiveData = 'Credit card: 1234-5678-9012-3456';
const encryptedData = aesEncrypt(sensitiveData, { 
  key: sessionKey 
});

// 5. 存储/传输
const payload = {
  encryptedSessionKey, // RSA 加密的 AES 密钥
  encryptedData        // AES 加密的数据
};

// 6. 解密流程
const decryptedSessionKey = rsaDecrypt(payload.encryptedSessionKey, {
  privateKey: keyPair.privateKey
});

const decryptedData = aesDecrypt(payload.encryptedData, {
  key: decryptedSessionKey
});

console.log('解密结果:', decryptedData);
```

---

### 场景 3: 文件加密存储

```typescript
import { aesEncrypt, aesDecrypt } from './src/skills/crypto-utils-skill';
import * as fs from 'fs';

// 加密文件
function encryptFile(inputPath: string, outputPath: string, password: string) {
  const content = fs.readFileSync(inputPath, 'utf8');
  const encrypted = aesEncrypt(content, { key: password });
  fs.writeFileSync(outputPath, encrypted);
  console.log('文件加密完成!');
}

// 解密文件
function decryptFile(inputPath: string, outputPath: string, password: string) {
  const encrypted = fs.readFileSync(inputPath, 'utf8');
  const decrypted = aesDecrypt(encrypted, { key: password });
  fs.writeFileSync(outputPath, decrypted);
  console.log('文件解密完成!');
}

// 使用示例
encryptFile('secret.txt', 'secret.encrypted', 'my-password');
decryptFile('secret.encrypted', 'secret.decrypted', 'my-password');
```

---

### 场景 4: API 请求签名验证

```typescript
import { rsaSign, rsaVerify, generateRSAKeyPair } from './src/skills/crypto-utils-skill';

// 服务端生成密钥对
const keyPair = generateRSAKeyPair();

// 服务端将公钥分发给客户端
const publicKey = keyPair.publicKey;

// 客户端请求 API
function makeApiRequest(endpoint: string, data: any, privateKey: string) {
  const payload = JSON.stringify({
    endpoint,
    data,
    timestamp: Date.now()
  });
  
  // 生成签名
  const signature = rsaSign(payload, { privateKey });
  
  return {
    payload,
    signature
  };
}

// 服务端验证请求
function verifyApiRequest(payload: string, signature: string, clientPublicKey: string) {
  const isValid = rsaVerify(payload, signature, { 
    publicKey: clientPublicKey 
  });
  
  if (!isValid) {
    throw new Error('签名验证失败!');
  }
  
  return JSON.parse(payload);
}
```

---

## ⚠️ 安全建议

### ✅ 推荐做法

1. **密钥长度**
   - AES: 使用 256 位 (32 字节) 密钥
   - RSA: 使用 4096 位密钥 (最低 2048 位)

2. **密钥管理**
   - 不要硬编码密钥在代码中
   - 使用环境变量或密钥管理服务 (KMS)
   - 定期轮换密钥

3. **密码存储**
   - 使用 PBKDF2 至少 100,000 次迭代
   - 每个密码使用唯一盐值
   - 考虑使用 Argon2 或 bcrypt

4. **混合加密**
   - 使用 RSA 加密 AES 密钥
   - 使用 AES 加密实际数据
   - 结合两者优势

### ❌ 避免做法

1. **不要使用弱密钥**
   ```typescript
   // ❌ 错误：密钥太短
   const key = '123456';
   
   // ✅ 正确：使用足够长度的密钥
   const key = generateSalt(32);
   ```

2. **不要重复使用 IV**
   ```typescript
   // ❌ 错误：固定 IV
   const iv = '0000000000000000';
   
   // ✅ 正确：每次加密生成随机 IV
   // (aesEncrypt 自动处理)
   ```

3. **不要明文存储密码**
   ```typescript
   // ❌ 错误：明文存储
   database.save('password', 'user123');
   
   // ✅ 正确：哈希存储
   const salt = generateSalt();
   const hash = deriveKey('user123', salt);
   database.save('passwordHash', hash);
   database.save('salt', salt);
   ```

---

## 🧪 运行测试

```bash
cd /Users/nike/.openclaw/workspace
npx ts-node src/skills/crypto-utils-skill.ts
```

**预期输出:**
```
=== 加密工具技能 - 使用示例 ===

1️⃣  AES 加密解密:
   明文：Hello, this is a secret message! 🔐
   密文：iv:encryptedData
   解密：Hello, this is a secret message! 🔐
   ✅ 验证：成功

2️⃣  RSA 密钥生成:
   公钥：-----BEGIN PUBLIC KEY-----...
   私钥：-----BEGIN PRIVATE KEY-----...

3️⃣  RSA 加密解密:
   ✅ 验证：成功

4️⃣  RSA 数字签名:
   ✅ 签名有效
   ✅ 正确拒绝

5️⃣  密钥派生 (PBKDF2):
   ✅ 一致性验证：成功

6️⃣  实际应用场景:
   ✅ 混合加密完成

✅ 所有示例执行完成!
```

---

## 📝 更新日志

### v1.0.0 (2026-03-13)
- ✅ 初始版本
- ✅ AES-256-CBC 加密/解密
- ✅ RSA-2048/4096 加密/解密
- ✅ RSA 数字签名/验证
- ✅ PBKDF2 密钥派生
- ✅ 随机盐值生成

---

## 📞 联系

**作者:** KAEL  
**项目:** AxonClaw  
**技能路径:** `src/skills/crypto-utils-skill.ts`

---

_**安全无小事，加密需谨慎。**_ 🔐
