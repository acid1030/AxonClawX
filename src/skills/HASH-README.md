# Hash Utils Skill - ACE

**哈希计算工具集** - 提供 MD5/SHA 哈希、HMAC 签名和哈希验证功能

---

## 🚀 快速开始

```typescript
import { hash, hmac, verifyHash, sha256, md5 } from './hash-utils-skill';

// 基础哈希
const result = hash('Hello, World!');
console.log(result.hash); // SHA256 哈希值

// 便捷函数
const md5Hash = md5('Hello, World!');
const sha256Hash = sha256('Hello, World!');

// HMAC 签名
const signature = hmac('API Request', 'secret-key');

// 验证哈希
const isValid = verifyHash('Hello, World!', expectedHash);
```

---

## 📦 功能清单

### 1. 哈希计算

| 函数 | 描述 | 示例 |
|------|------|------|
| `hash()` | 通用哈希函数 | `hash('text', {algorithm: 'sha256'})` |
| `md5()` | MD5 哈希 (快速) | `md5('text')` |
| `sha1()` | SHA1 哈希 | `sha1('text')` |
| `sha256()` | SHA256 哈希 (推荐) | `sha256('text')` |
| `sha512()` | SHA512 哈希 | `sha512('text')` |
| `hashFile()` | 文件哈希 (异步) | `await hashFile('/path/to/file')` |

### 2. HMAC 签名

| 函数 | 描述 | 示例 |
|------|------|------|
| `hmac()` | 通用 HMAC | `hmac('data', 'secret', {algorithm: 'sha256'})` |
| `hmacSHA256()` | HMAC-SHA256 | `hmacSHA256('data', 'secret')` |
| `hmacSHA512()` | HMAC-SHA512 | `hmacSHA512('data', 'secret')` |

### 3. 哈希验证

| 函数 | 描述 | 示例 |
|------|------|------|
| `verifyHash()` | 验证哈希值 | `verifyHash('text', expectedHash)` |
| `verifyHMAC()` | 验证 HMAC 签名 | `verifyHMAC('data', 'secret', signature)` |

---

## 💡 使用示例

### 基础哈希

```typescript
import { hash, sha256, md5 } from './hash-utils-skill';

// 默认 SHA256
const result = hash('Hello, AxonClaw!');
console.log(result);
// {
//   algorithm: 'sha256',
//   hash: '7f83b1657ff1fc53b92dc18148a1d65dfa1350f...',
//   encoding: 'hex',
//   inputLength: 16,
//   timestamp: 1710337200000
// }

// 指定算法
const md5Result = hash('Hello', { algorithm: 'md5' });
console.log(md5Result.hash); // '8b1a9953c4611296a827abf8c47804d7'

// Base64 编码
const base64Result = hash('Hello', { encoding: 'base64' });
console.log(base64Result.hash); // 'pE9Lz+... (Base64)'
```

### HMAC 签名

```typescript
import { hmac, hmacSHA256, verifyHMAC } from './hash-utils-skill';

// API 请求签名
const message = 'POST /api/users';
const secret = 'my-api-secret-key';

const signature = hmacSHA256(message, secret);
console.log(`签名：${signature}`);

// 验证签名
const isValid = verifyHMAC(message, secret, signature);
console.log(`验证结果：${isValid.valid}`); // true
```

### 密码存储

```typescript
import { sha256 } from './hash-utils-skill';

// 加盐哈希密码
const password = 'user-password-123';
const salt = 'random-salt-value';
const passwordHash = sha256(password + salt);

// 存储到数据库
// users = [{ passwordHash, salt }]
```

### 文件完整性校验

```typescript
import { hashFile, verifyHash } from './hash-utils-skill';
import * as fs from 'fs';

// 计算文件哈希
const fileHash = await hashFile('./download.zip');
console.log(`文件 SHA256: ${fileHash.hash}`);

// 验证文件完整性
const fileBuffer = fs.readFileSync('./download.zip');
const knownHash = 'abc123...'; // 官方提供的哈希
const result = verifyHash(fileBuffer, knownHash);
console.log(`文件完整：${result.valid}`);
```

---

## 🔧 API 参考

### hash(input, options?)

计算输入数据的哈希值

**参数:**
- `input`: `string | Buffer` - 输入数据
- `options`: `HashOptions` (可选)
  - `algorithm`: `'md5' | 'sha1' | 'sha256' | 'sha512'` (默认: `'sha256'`)
  - `encoding`: `'hex' | 'base64'` (默认: `'hex'`)

**返回:** `HashResult`
```typescript
{
  algorithm: string;
  hash: string;
  encoding: string;
  inputLength: number;
  timestamp: number;
}
```

---

### hmac(input, secret, options?)

计算 HMAC 签名

**参数:**
- `input`: `string | Buffer` - 输入数据
- `secret`: `string | Buffer` - 密钥
- `options`: `HMACOptions` (可选)
  - `algorithm`: `'md5' | 'sha1' | 'sha256' | 'sha512'` (默认: `'sha256'`)
  - `encoding`: `'hex' | 'base64'` (默认: `'hex'`)

**返回:** `HashResult`

---

### verifyHash(input, expectedHash, options?)

验证哈希值是否匹配

**参数:**
- `input`: `string | Buffer` - 原始输入
- `expectedHash`: `string` - 期望的哈希值
- `options`: `HashOptions & { secure?: boolean }` (可选)
  - `secure`: `boolean` - 启用常量时间比较 (默认: `true`)

**返回:** `VerificationResult`
```typescript
{
  valid: boolean;
  expected: string;
  actual: string;
  algorithm: string;
}
```

---

### verifyHMAC(input, secret, expectedSignature, options?)

验证 HMAC 签名

**参数:**
- `input`: `string | Buffer` - 原始输入
- `secret`: `string | Buffer` - 密钥
- `expectedSignature`: `string` - 期望的签名
- `options`: `HMACOptions` (可选)

**返回:** `VerificationResult`

---

### hashFile(filePath, options?)

异步计算文件哈希

**参数:**
- `filePath`: `string` - 文件路径
- `options`: `HashOptions` (可选)

**返回:** `Promise<HashResult>`

---

## 🛡️ 安全特性

1. **常量时间比较**: `verifyHash` 和 `verifyHMAC` 默认使用 `crypto.timingSafeEqual` 防止时序攻击
2. **HMAC 签名**: 比纯哈希更安全，适合 API 认证
3. **SHA256 推荐**: 默认使用 SHA256，平衡安全性和性能

---

## ⚠️ 注意事项

- ❌ **MD5/SHA1**: 仅用于兼容性，不推荐用于安全场景
- ✅ **SHA256/SHA512**: 推荐用于密码存储和签名
- ✅ **HMAC**: 推荐用于 API 请求签名
- ⚠️ **密码存储**: 建议使用专门的密码哈希库 (如 bcrypt、argon2)

---

## 📊 性能对比

| 算法 | 速度 | 安全性 | 推荐场景 |
|------|------|--------|----------|
| MD5 | ⚡⚡⚡ | ❌ | 校验和、兼容性 |
| SHA1 | ⚡⚡ | ⚠️ | 遗留系统 |
| SHA256 | ⚡ | ✅ | 通用场景 |
| SHA512 | ⚡ | ✅✅ | 高安全需求 |

---

## 📝 完整示例

查看 [`hash-utils-examples.ts`](./hash-utils-examples.ts) 获取完整使用示例。

---

**版本:** 1.0.0  
**作者:** Axon  
**最后更新:** 2026-03-13
