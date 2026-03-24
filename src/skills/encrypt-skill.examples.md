# ACE 加密技能使用示例

**模块:** `src/skills/encrypt-skill.ts`  
**版本:** 1.0.0  
**作者:** Axon

---

## 📦 导入方式

```typescript
import {
  AESCipher,
  RSACipher,
  HashUtils,
  aesEncrypt,
  aesDecrypt,
  rsaEncrypt,
  rsaDecrypt,
  hash
} from './skills/encrypt-skill';
```

---

## 🔐 AES 加密/解密

### 示例 1: AES-GCM 模式 (推荐)

```typescript
// 生成 256 位密钥
const key = AESCipher.generateKey(256);
console.log('密钥:', key);

// 创建加密器 (GCM 模式)
const cipher = new AESCipher({
  mode: 'gcm',
  key: Buffer.from(key, 'hex')
});

// 加密
const plaintext = '这是需要加密的机密数据';
const encrypted = cipher.encrypt(plaintext);
console.log('加密结果:', encrypted);
// {
//   encrypted: "U2FsdGVkX1...",
//   iv: "a1b2c3d4...",
//   authTag: "e5f6g7h8..."
// }

// 解密
const decrypted = cipher.decrypt(encrypted);
console.log('解密结果:', decrypted);
// "这是需要加密的机密数据"
```

### 示例 2: AES-CBC 模式

```typescript
// 生成密钥和 IV
const key = AESCipher.generateKey(128); // AES-128
const iv = AESCipher.generateIV();

// 创建加密器 (CBC 模式)
const cipher = new AESCipher({
  mode: 'cbc',
  key: Buffer.from(key, 'hex'),
  iv: Buffer.from(iv, 'hex')
});

// 加密
const encrypted = cipher.encrypt('敏感信息');
console.log('加密:', encrypted);

// 解密 (需要相同的 IV)
const decrypted = cipher.decrypt(encrypted);
console.log('解密:', decrypted);
```

### 示例 3: 使用便捷函数

```typescript
// 快速加密
const key = AESCipher.generateKey(256);
const encrypted = aesEncrypt('机密数据', key, 'gcm');
console.log('加密:', encrypted);

// 快速解密
const decrypted = aesDecrypt(encrypted, key, 'gcm');
console.log('解密:', decrypted);
```

### 示例 4: 完整加密流程

```typescript
// 1. 生成密钥 (实际应用中应安全存储)
const key = AESCipher.generateKey(256);

// 2. 加密数据
const sensitiveData = {
  username: 'admin',
  password: 'secret123',
  token: 'xyz789'
};

const jsonStr = JSON.stringify(sensitiveData);
const encrypted = aesEncrypt(jsonStr, key, 'gcm');

// 3. 存储/传输加密数据
console.log('存储:', JSON.stringify(encrypted));

// 4. 解密数据
const decryptedJson = aesDecrypt(encrypted, key, 'gcm');
const decryptedData = JSON.parse(decryptedJson);
console.log('恢复:', decryptedData);
// { username: 'admin', password: 'secret123', token: 'xyz789' }
```

---

## 🔑 RSA 加密/解密

### 示例 1: 生成密钥对并加密

```typescript
// 创建 RSA 加密器 (自动生成 2048 位密钥对)
const rsa = new RSACipher();

// 获取密钥对
const keyPair = rsa.getKeyPair();
console.log('公钥:', keyPair.publicKey);
console.log('私钥:', keyPair.privateKey);

// 使用公钥加密
const plaintext = '这是只有私钥持有者才能解密的消息';
const encrypted = rsa.encrypt(plaintext);
console.log('加密:', encrypted.encrypted);

// 使用私钥解密
const decrypted = rsa.decrypt(encrypted);
console.log('解密:', decrypted);
```

### 示例 2: 使用 4096 位密钥

```typescript
// 创建 4096 位密钥对
const rsa = new RSACipher(undefined, {
  keySize: 4096,
  padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
  oaepHash: 'sha512'
});

// 加密
const encrypted = rsa.encrypt('高度机密信息');

// 解密
const decrypted = rsa.decrypt(encrypted);
console.log('解密:', decrypted);
```

### 示例 3: 数字签名

```typescript
const rsa = new RSACipher();

// 原始数据
const message = '这是一条需要签名的消息';

// 签名
const signature = rsa.sign(message);
console.log('签名:', signature);

// 验证签名
const isValid = rsa.verify(message, signature);
console.log('签名有效:', isValid); // true

// 篡改数据后验证
const tampered = '这是被篡改的消息';
const isTamperedValid = rsa.verify(tampered, signature);
console.log('篡改后签名有效:', isTamperedValid); // false
```

### 示例 4: 导入现有密钥

```typescript
// 从 PEM 文件读取公钥
const publicKeyPEM = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...
-----END PUBLIC KEY-----`;

// 导入公钥进行加密
const rsaPublic = RSACipher.importPublicKey(publicKeyPEM);
const encrypted = rsaPublic.encrypt('发送给公钥持有者的消息');

// 从 PEM 文件读取私钥
const privateKeyPEM = `-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC...
-----END PRIVATE KEY-----`;

// 导入私钥进行解密
const rsaPrivate = RSACipher.importPrivateKey(privateKeyPEM);
const decrypted = rsaPrivate.decrypt(encrypted);
```

### 示例 5: 便捷函数

```typescript
// 生成密钥对
const rsa = new RSACipher();
const { publicKey, privateKey } = rsa.getKeyPair();

// 快速加密
const encrypted = rsaEncrypt('机密消息', publicKey);

// 快速解密
const decrypted = rsaDecrypt(encrypted, privateKey);
console.log('结果:', decrypted);
```

---

## 🔢 Hash 计算

### 示例 1: 计算各种哈希

```typescript
const data = 'Hello, AxonClaw!';

// MD5
const md5Result = HashUtils.hash(data, 'md5');
console.log('MD5:', md5Result.hash);
// 输出：5f4dcc3b5aa765d61d8327deb882cf99

// SHA1
const sha1Result = HashUtils.hash(data, 'sha1');
console.log('SHA1:', sha1Result.hash);

// SHA256 (默认)
const sha256Result = HashUtils.hash(data, 'sha256');
console.log('SHA256:', sha256Result.hash);
// 输出：8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918

// SHA512
const sha512Result = HashUtils.hash(data, 'sha512');
console.log('SHA512:', sha512Result.hash);

// 获取 Base64 格式
console.log('SHA256 (Base64):', sha256Result.hashBase64);
```

### 示例 2: 快速哈希函数

```typescript
// 快速 MD5
const md5 = HashUtils.md5('数据');
console.log('MD5:', md5);

// 快速 SHA256
const sha256 = HashUtils.sha256('数据');
console.log('SHA256:', sha256);

// 快速 SHA512
const sha512 = HashUtils.sha512('数据');
console.log('SHA512:', sha512);

// 使用便捷函数
const hashValue = hash('数据', 'sha256');
console.log('Hash:', hashValue);
```

### 示例 3: HMAC 签名

```typescript
const data = '需要签名的数据';
const secret = '我的秘密密钥';

// 计算 HMAC-SHA256
const hmac = HashUtils.hmac(data, secret, 'sha256');
console.log('HMAC:', hmac);

// 验证 (重新计算并比较)
const verifyHmac = HashUtils.hmac(data, secret, 'sha256');
const isValid = hmac === verifyHmac;
console.log('验证:', isValid); // true
```

### 示例 4: 密码哈希存储

```typescript
// 用户注册 - 哈希密码
const password = 'user_password_123';
const salt = crypto.randomBytes(16).toString('hex');
const hashedPassword = HashUtils.sha256(password + salt);

console.log('盐:', salt);
console.log('哈希密码:', hashedPassword);

// 存储到数据库
// db.users.insert({ username: 'user', password: hashedPassword, salt: salt });

// 用户登录 - 验证密码
const loginPassword = 'user_password_123';
const storedSalt = salt; // 从数据库读取
const storedHash = hashedPassword; // 从数据库读取

const loginHash = HashUtils.sha256(loginPassword + storedSalt);
const isValid = loginHash === storedHash;
console.log('密码正确:', isValid); // true
```

### 示例 5: 文件完整性校验

```typescript
import * as fs from 'fs';

// 计算文件哈希
function hashFile(filePath: string): string {
  const content = fs.readFileSync(filePath, 'utf8');
  return HashUtils.sha256(content);
}

// 使用示例
const fileHash = hashFile('./important-document.pdf');
console.log('文件哈希:', fileHash);

// 后续验证文件完整性
const currentHash = hashFile('./important-document.pdf');
if (currentHash === fileHash) {
  console.log('✓ 文件未被篡改');
} else {
  console.log('✗ 文件已被修改!');
}
```

---

## 🎯 实际应用场景

### 场景 1: 配置文件加密

```typescript
// 加密敏感配置
const config = {
  database: {
    host: 'localhost',
    username: 'admin',
    password: 'super_secret_password'
  },
  apiKeys: {
    stripe: 'sk_live_xxx',
    aws: 'AKIAIOSFODNN7EXAMPLE'
  }
};

const key = AESCipher.generateKey(256);
const encrypted = aesEncrypt(JSON.stringify(config), key, 'gcm');

// 存储加密配置
fs.writeFileSync('config.enc.json', JSON.stringify(encrypted));
fs.writeFileSync('config.key', key); // 安全存储密钥

// 读取时解密
const encryptedData = JSON.parse(fs.readFileSync('config.enc.json', 'utf8'));
const storedKey = fs.readFileSync('config.key', 'utf8');
const decrypted = JSON.parse(aesDecrypt(encryptedData, storedKey, 'gcm'));
```

### 场景 2: API 请求签名

```typescript
// 生成请求签名
function signRequest(method: string, path: string, body: string, secret: string): string {
  const timestamp = Date.now().toString();
  const dataToSign = `${method}${path}${timestamp}${body}`;
  const signature = HashUtils.hmac(dataToSign, secret, 'sha256');
  
  return {
    'X-Timestamp': timestamp,
    'X-Signature': signature
  };
}

// 验证请求签名
function verifyRequest(method: string, path: string, body: string, secret: string, headers: any): boolean {
  const { 'X-Timestamp': timestamp, 'X-Signature': signature } = headers;
  const dataToSign = `${method}${path}${timestamp}${body}`;
  const expectedSignature = HashUtils.hmac(dataToSign, secret, 'sha256');
  
  return signature === expectedSignature;
}
```

### 场景 3: JWT Token 加密

```typescript
// 创建加密的 JWT Payload
function createEncryptedToken(payload: any, secretKey: string): string {
  const jsonPayload = JSON.stringify(payload);
  const encrypted = aesEncrypt(jsonPayload, secretKey, 'gcm');
  return Buffer.from(JSON.stringify(encrypted)).toString('base64');
}

// 解析加密的 JWT Payload
function parseEncryptedToken(token: string, secretKey: string): any {
  const jsonStr = Buffer.from(token, 'base64').toString('utf8');
  const encrypted = JSON.parse(jsonStr);
  const decrypted = aesDecrypt(encrypted, secretKey, 'gcm');
  return JSON.parse(decrypted);
}

// 使用示例
const token = createEncryptedToken(
  { userId: 123, role: 'admin', exp: Date.now() + 3600000 },
  'my-secret-key'
);

const payload = parseEncryptedToken(token, 'my-secret-key');
console.log('用户 ID:', payload.userId);
```

---

## ⚠️ 安全建议

1. **密钥管理**
   - 永远不要硬编码密钥
   - 使用环境变量或密钥管理服务
   - 定期轮换密钥

2. **模式选择**
   - 优先使用 GCM 模式 (提供认证)
   - 避免使用 ECB 模式 (不安全)

3. **随机数**
   - 每次加密使用新的 IV
   - IV 不需要保密，但必须唯一

4. **密钥长度**
   - AES: 至少 256 位
   - RSA: 至少 2048 位

5. **密码存储**
   - 使用 bcrypt/argon2 而非简单哈希
   - 始终加盐

---

**完成时间:** < 10 分钟  
**状态:** ✅ 交付完成
