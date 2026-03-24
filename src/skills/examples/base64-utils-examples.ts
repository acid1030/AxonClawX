/**
 * Base64 工具技能 - 使用示例
 * 
 * 运行方式：uv run tsx src/skills/examples/base64-utils-examples.ts
 */

import {
  base64Encode,
  base64Decode,
  base64UrlEncode,
  base64UrlDecode,
  fileToBase64,
  fileToBase64DataUrl,
  base64ToFile,
  batchBase64Encode,
  batchBase64Decode,
  isValidBase64,
  calculateBase64Size,
  Base64Utils,
} from '../base64-utils-skill';

console.log('='.repeat(60));
console.log('🔧 Base64 工具技能 - 使用示例');
console.log('='.repeat(60));

// ==================== 1. 基础 Base64 编码解码 ====================

console.log('\n📌 示例 1: 基础 Base64 编码解码');
console.log('-'.repeat(60));

const originalText = 'Hello, AxonClaw! 你好，世界！';
console.log(`原始文本：${originalText}`);

const encoded = base64Encode(originalText);
console.log(`Base64 编码：${encoded}`);

const decoded = base64Decode(encoded);
console.log(`Base64 解码：${decoded}`);

console.log(`✓ 验证：${decoded === originalText ? '成功' : '失败'}`);

// ==================== 2. URL Safe Base64 ====================

console.log('\n📌 示例 2: URL Safe Base64');
console.log('-'.repeat(60));

const urlText = 'Hello+World/Test=Value';
console.log(`原始文本：${urlText}`);

const urlEncoded = base64UrlEncode(urlText);
console.log(`URL Safe Base64: ${urlEncoded}`);
console.log(`  - 无 + 号：${!urlEncoded.includes('+') ? '✓' : '✗'}`);
console.log(`  - 无 / 号：${!urlEncoded.includes('/') ? '✓' : '✗'}`);
console.log(`  - 无 = 号：${!urlEncoded.includes('=') ? '✓' : '✗'}`);

const urlDecoded = base64UrlDecode(urlEncoded);
console.log(`URL Safe 解码：${urlDecoded}`);
console.log(`✓ 验证：${urlDecoded === urlText ? '成功' : '失败'}`);

// ==================== 3. 使用 Base64Utils 对象 ====================

console.log('\n📌 示例 3: 使用 Base64Utils 对象');
console.log('-'.repeat(60));

const text = 'AxonClaw Base64 Utils';
console.log(`原始文本：${text}`);

const encoded2 = Base64Utils.encode(text);
console.log(`编码：${encoded2}`);

const decoded2 = Base64Utils.decode(encoded2);
console.log(`解码：${decoded2}`);

const urlEncoded2 = Base64Utils.urlEncode(text);
console.log(`URL Safe 编码：${urlEncoded2}`);

// ==================== 4. 批量处理 ====================

console.log('\n📌 示例 4: 批量处理');
console.log('-'.repeat(60));

const texts = ['Axon', 'Claw', 'Base64', '工具'];
console.log(`原始数组：${JSON.stringify(texts)}`);

const encodedBatch = batchBase64Encode(texts);
console.log(`批量编码：${JSON.stringify(encodedBatch)}`);

const decodedBatch = batchBase64Decode(encodedBatch);
console.log(`批量解码：${JSON.stringify(decodedBatch)}`);

console.log(`✓ 验证：${JSON.stringify(decodedBatch) === JSON.stringify(texts) ? '成功' : '失败'}`);

// ==================== 5. 验证和计算 ====================

console.log('\n📌 示例 5: 验证和计算');
console.log('-'.repeat(60));

const testBase64 = 'SGVsbG8gV29ybGQ=';
console.log(`测试字符串：${testBase64}`);
console.log(`是否有效 Base64: ${isValidBase64(testBase64) ? '✓ 是' : '✗ 否'}`);

const testInvalid = 'Invalid!@#Base64';
console.log(`测试字符串：${testInvalid}`);
console.log(`是否有效 Base64: ${isValidBase64(testInvalid) ? '✓ 是' : '✗ 否'}`);

const originalSize = 1024; // 1KB
const base64Size = calculateBase64Size(originalSize);
console.log(`\n原始大小：${originalSize} 字节`);
console.log(`Base64 编码后大小：${base64Size} 字节`);
console.log(`膨胀率：${((base64Size / originalSize - 1) * 100).toFixed(2)}%`);

// ==================== 6. 文件转换示例 (注释掉，需要实际文件) ====================

console.log('\n📌 示例 6: 文件转换 (示例代码)');
console.log('-'.repeat(60));

console.log(`
// 文件转 Base64
const base64 = fileToBase64('./path/to/file.png');
console.log('文件 Base64:', base64);

// 文件转 Data URL (包含 MIME 类型)
const dataUrl = fileToBase64DataUrl('./path/to/image.jpg');
console.log('Data URL:', dataUrl);
// 输出：data:image/jpeg;base64,/9j/4AAQSkZJRg...

// Base64 转文件
base64ToFile(base64, './output/decoded.png');
console.log('文件已保存');

// Data URL 转文件
dataUrlToFile(dataUrl, './output/image.jpg');
console.log('图片已保存');
`);

// ==================== 7. 实际应用场景 ====================

console.log('\n📌 示例 7: 实际应用场景');
console.log('-'.repeat(60));

// 场景 1: JWT Token 中的 Base64Url 编码
console.log('\n场景 1: JWT Token 编码');
const jwtPayload = JSON.stringify({ sub: '1234567890', name: 'Axon', iat: 1516239022 });
const jwtBase64Url = base64UrlEncode(jwtPayload);
console.log(`JWT Payload: ${jwtPayload}`);
console.log(`JWT Base64Url: ${jwtBase64Url}`);

// 场景 2: 图片嵌入 HTML
console.log('\n场景 2: 图片嵌入 HTML');
console.log('<img src="data:image/png;base64,iVBORw0KGgo..." />');

// 场景 3: API 认证
console.log('\n场景 3: Basic Auth 认证');
const credentials = 'username:password';
const authHeader = `Basic ${base64Encode(credentials)}`;
console.log(`Authorization: ${authHeader}`);

// ==================== 完成 ====================

console.log('\n' + '='.repeat(60));
console.log('✅ 所有示例执行完成');
console.log('='.repeat(60));
