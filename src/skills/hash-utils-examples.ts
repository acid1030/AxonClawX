/**
 * Hash Utils Skill - 使用示例
 * 
 * 演示如何使用 hash-utils-skill.ts 中的各种功能
 */

import {
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
} from './hash-utils-skill';

// ============================================================================
// 示例 1: 基础哈希计算
// ============================================================================

console.log('=== 示例 1: 基础哈希计算 ===\n');

// 默认 SHA256
const result1 = hash('Hello, AxonClaw!');
console.log('SHA256 哈希:');
console.log(`  输入: "Hello, AxonClaw!"`);
console.log(`  哈希: ${result1.hash}`);
console.log(`  算法: ${result1.algorithm}`);
console.log(`  编码: ${result1.encoding}\n`);

// 指定算法 - MD5
const result2 = hash('Hello, AxonClaw!', { algorithm: 'md5' });
console.log('MD5 哈希:');
console.log(`  输入: "Hello, AxonClaw!"`);
console.log(`  哈希: ${result2.hash}`);
console.log(`  算法: ${result2.algorithm}\n`);

// 指定编码 - Base64
const result3 = hash('Hello, AxonClaw!', { encoding: 'base64' });
console.log('SHA256 (Base64 编码):');
console.log(`  输入: "Hello, AxonClaw!"`);
console.log(`  哈希: ${result3.hash}`);
console.log(`  编码: ${result3.encoding}\n`);

// ============================================================================
// 示例 2: 便捷函数
// ============================================================================

console.log('=== 示例 2: 便捷函数 ===\n');

const text = 'The quick brown fox jumps over the lazy dog';

console.log(`输入文本: "${text}"\n`);
console.log(`MD5:    ${md5(text)}`);
console.log(`SHA1:   ${sha1(text)}`);
console.log(`SHA256: ${sha256(text)}`);
console.log(`SHA512: ${sha512(text).substring(0, 64)}... (截断)\n`);

// ============================================================================
// 示例 3: HMAC 签名
// ============================================================================

console.log('=== 示例 3: HMAC 签名 ===\n');

const message = 'Sensitive API Request';
const secretKey = 'my-super-secret-key-2026';

// 默认 HMAC-SHA256
const hmacResult = hmac(message, secretKey);
console.log('HMAC-SHA256 签名:');
console.log(`  消息: "${message}"`);
console.log(`  密钥: "${secretKey}"`);
console.log(`  签名: ${hmacResult.hash}\n`);

// 便捷函数
const signature256 = hmacSHA256(message, secretKey);
const signature512 = hmacSHA512(message, secretKey);

console.log('便捷函数:');
console.log(`  HMAC-SHA256: ${signature256}`);
console.log(`  HMAC-SHA512: ${signature512.substring(0, 64)}... (截断)\n`);

// ============================================================================
// 示例 4: 哈希验证
// ============================================================================

console.log('=== 示例 4: 哈希验证 ===\n');

const originalText = 'Verify this text';
const correctHash = sha256(originalText);
const wrongHash = '0000000000000000000000000000000000000000000000000000000000000000';

// 验证正确的哈希
const verifyResult1 = verifyHash(originalText, correctHash);
console.log('验证正确的哈希:');
console.log(`  输入: "${originalText}"`);
console.log(`  期望哈希: ${correctHash}`);
console.log(`  验证结果: ${verifyResult1.valid ? '✅ 有效' : '❌ 无效'}\n`);

// 验证错误的哈希
const verifyResult2 = verifyHash(originalText, wrongHash);
console.log('验证错误的哈希:');
console.log(`  输入: "${originalText}"`);
console.log(`  期望哈希: ${wrongHash}`);
console.log(`  验证结果: ${verifyResult2.valid ? '✅ 有效' : '❌ 无效'}\n`);

// ============================================================================
// 示例 5: HMAC 签名验证
// ============================================================================

console.log('=== 示例 5: HMAC 签名验证 ===\n');

const apiRequest = 'POST /api/users';
const apiSecret = 'api-secret-key-xyz';
const validSignature = hmacSHA256(apiRequest, apiSecret);

// 验证正确的签名
const hmacVerify1 = verifyHMAC(apiRequest, apiSecret, validSignature);
console.log('验证正确的 HMAC 签名:');
console.log(`  请求: "${apiRequest}"`);
console.log(`  签名: ${validSignature}`);
console.log(`  验证结果: ${hmacVerify1.valid ? '✅ 有效' : '❌ 无效'}\n`);

// 验证错误的签名
const hmacVerify2 = verifyHMAC(apiRequest, apiSecret, 'invalid-signature');
console.log('验证错误的 HMAC 签名:');
console.log(`  请求: "${apiRequest}"`);
console.log(`  签名: invalid-signature`);
console.log(`  验证结果: ${hmacVerify2.valid ? '✅ 有效' : '❌ 无效'}\n`);

// ============================================================================
// 示例 6: 实际应用场景
// ============================================================================

console.log('=== 示例 6: 实际应用场景 ===\n');

// 场景 1: 密码存储 (使用 SHA256 + salt)
console.log('场景 1: 密码哈希存储');
const password = 'user-password-123';
const salt = 'random-salt-value';
const passwordHash = sha256(password + salt);
console.log(`  原始密码: ${password}`);
console.log(`  Salt: ${salt}`);
console.log(`  存储哈希: ${passwordHash}\n`);

// 场景 2: API 请求签名验证
console.log('场景 2: API 请求签名');
const requestData = 'GET /api/data?timestamp=1234567890';
const apiSecretKey = 'my-api-secret';
const requestSignature = hmacSHA256(requestData, apiSecretKey);
console.log(`  请求数据: ${requestData}`);
console.log(`  请求签名: ${requestSignature}`);
console.log(`  验证: ${verifyHMAC(requestData, apiSecretKey, requestSignature).valid ? '✅ 通过' : '❌ 失败'}\n`);

// 场景 3: 文件完整性校验
console.log('场景 3: 文件完整性校验');
console.log(`  计算文件哈希: await hashFile('/path/to/file.zip')`);
console.log(`  与已知哈希对比: verifyHash(fileBuffer, knownHash)\n`);

// 场景 4: 数据防篡改
console.log('场景 4: 数据防篡改');
const data = JSON.stringify({ userId: 123, action: 'transfer', amount: 1000 });
const dataSignature = hmacSHA256(data, 'integrity-key');
console.log(`  数据: ${data}`);
console.log(`  签名: ${dataSignature}`);
console.log(`  接收方验证: verifyHMAC(data, 'integrity-key', signature)\n`);

// ============================================================================
// 示例 7: Buffer 输入
// ============================================================================

console.log('=== 示例 7: Buffer 输入 ===\n');

const buffer = Buffer.from('Binary data example', 'utf8');
const bufferHash = hash(buffer);
console.log('Buffer 哈希:');
console.log(`  输入: Buffer (${buffer.length} bytes)`);
console.log(`  哈希: ${bufferHash.hash}`);
console.log(`  算法: ${bufferHash.algorithm}\n`);

// ============================================================================
// 示例 8: 文件哈希 (需要实际文件)
// ============================================================================

console.log('=== 示例 8: 文件哈希 (异步) ===\n');

// 注意：需要实际文件才能运行
// hashFile('./package.json')
//   .then(result => {
//     console.log('文件哈希:');
//     console.log(`  文件: ./package.json`);
//     console.log(`  算法: ${result.algorithm}`);
//     console.log(`  哈希: ${result.hash}`);
//   })
//   .catch(err => {
//     console.error('文件哈希失败:', err.message);
//   });

console.log('文件哈希示例 (注释状态，需要实际文件):');
console.log(`  await hashFile('./package.json')`);
console.log(`  await hashFile('./package.json', { algorithm: 'md5' })\n`);

// ============================================================================
// 性能提示
// ============================================================================

console.log('=== 性能提示 ===\n');
console.log('1. 对于大量数据，使用流式处理 (hashFile 已实现)');
console.log('2. 验证时使用 secure: true 启用常量时间比较 (默认开启)');
console.log('3. HMAC 比纯哈希更安全，适合 API 签名');
console.log('4. SHA256 是当前推荐的标准算法');
console.log('5. MD5 仅用于兼容性场景，不推荐用于安全用途\n');

console.log('=== 所有示例完成 ===');
