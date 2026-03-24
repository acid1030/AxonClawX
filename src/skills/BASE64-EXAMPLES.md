# Base64 Utils 使用示例

## 示例 1: 基础编码解码

```typescript
import { base64Encode, base64Decode } from '@/skills/base64-utils-skill';

// 示例 1.1: 简单字符串编码
const message = 'Hello, AxonClaw!';
const encoded = base64Encode(message);
console.log('Encoded:', encoded);
// 输出：SGVsbG8sIEF4b25DbGF3IQ==

const decoded = base64Decode(encoded);
console.log('Decoded:', decoded);
// 输出：Hello, AxonClaw!

// 示例 1.2: 中文编码
const chinese = '你好，世界！';
const encodedCn = base64Encode(chinese);
console.log('中文编码:', encodedCn);
// 输出：5L2g5aW977yB5LiW55WM77yB

const decodedCn = base64Decode(encodedCn);
console.log('中文解码:', decodedCn);
// 输出：你好，世界！

// 示例 1.3: JSON 对象编码
const user = {
  id: 12345,
  name: 'KAEL',
  role: 'admin',
  permissions: ['read', 'write', 'delete']
};

const encodedJson = base64Encode(JSON.stringify(user));
console.log('JSON 编码:', encodedJson);

const decodedJson = JSON.parse(base64Decode(encodedJson));
console.log('JSON 解码:', decodedJson);
// 输出：{ id: 12345, name: 'KAEL', role: 'admin', permissions: [...] }
```

## 示例 2: URL Safe Base64

```typescript
import { base64UrlEncode, base64UrlDecode } from '@/skills/base64-utils-skill';

// 示例 2.1: 编码包含特殊字符的数据
const specialData = 'a+b/c=d?e&f#g';
const urlSafe = base64UrlEncode(specialData);
console.log('URL Safe:', urlSafe);
// 输出：YStiL2M9ZD9lJmYjZw (无 + / = 字符)

const original = base64UrlDecode(urlSafe);
console.log('还原:', original);
// 输出：a+b/c=d?e&f#g

// 示例 2.2: JWT Token 片段处理
const header = { alg: 'HS256', typ: 'JWT' };
const payload = { sub: '1234567890', name: 'Axon', iat: 1516239022 };

const headerEncoded = base64UrlEncode(JSON.stringify(header));
const payloadEncoded = base64UrlEncode(JSON.stringify(payload));

const jwt = `${headerEncoded}.${payloadEncoded}.signature`;
console.log('JWT:', jwt);
// 输出：eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkF4b24iLCJpYXQiOjE1MTYyMzkwMjJ9.signature

// 示例 2.3: URL 参数安全传输
const searchQuery = {
  q: 'TypeScript + JavaScript',
  filter: 'category/subcategory',
  page: 1
};

const encodedQuery = base64UrlEncode(JSON.stringify(searchQuery));
const url = `https://api.example.com/search?data=${encodedQuery}`;
console.log('完整 URL:', url);
// 可直接用于浏览器或 fetch 请求

// 服务端接收后解码
const decodedQuery = JSON.parse(base64UrlDecode(encodedQuery));
console.log('解析结果:', decodedQuery);
```

## 示例 3: 文件转换

```typescript
import { fileToBase64, fileToBase64DataUrl, base64ToFile, dataUrlToFile } from '@/skills/base64-utils-skill';
import * as path from 'path';

// 示例 3.1: 图片转 Base64 嵌入 HTML
const imagePath = path.join(__dirname, '../assets/logo.png');
const base64Image = fileToBase64(imagePath);
console.log('Base64 图片:', base64Image.substring(0, 50) + '...');

// 示例 3.2: 生成 Data URL 用于前端展示
const dataUrl = fileToBase64DataUrl(imagePath);
console.log('Data URL:', dataUrl.substring(0, 60) + '...');
// 输出：data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...

// 前端使用
const html = `
  <div>
    <h1>公司 Logo</h1>
    <img src="${dataUrl}" alt="Logo" width="200" />
  </div>
`;

// 示例 3.3: Base64 还原为文件
const outputPath = path.join(__dirname, '../output/restored-logo.png');
base64ToFile(base64Image, outputPath);
console.log('文件已还原:', outputPath);

// 示例 3.4: Data URL 还原为文件
const outputPath2 = path.join(__dirname, '../output/restored-logo-2.png');
dataUrlToFile(dataUrl, outputPath2);
console.log('文件已还原:', outputPath2);

// 示例 3.5: 批量转换配置文件
const configFiles = [
  './config/app.json',
  './config/database.json',
  './config/features.json'
];

const configBackup: Record<string, string> = {};

for (const file of configFiles) {
  try {
    configBackup[file] = fileToBase64(file);
    console.log(`✓ 已备份：${file}`);
  } catch (error) {
    console.error(`✗ 备份失败：${file}`, error);
  }
}

// 存储到数据库或远程存储
// await db.collection('configBackups').insertOne({
//   timestamp: Date.now(),
//   configs: configBackup
// });
```

## 示例 4: 批量处理

```typescript
import { batchBase64Encode, batchBase64Decode } from '@/skills/base64-utils-skill';

// 示例 4.1: 批量编码用户消息
const messages = [
  '用户 A: 你好！',
  '用户 B: 早上好',
  '用户 C: 今晚加班吗？',
  '用户 D: 收到请回复',
  '用户 E: 会议取消了'
];

const encodedMessages = batchBase64Encode(messages);
console.log('编码后的消息:', encodedMessages);

// 存储或传输...

// 批量解码
const decodedMessages = batchBase64Decode(encodedMessages);
console.log('还原的消息:', decodedMessages);

// 示例 4.2: 批量处理日志条目
const logEntries = [
  '[INFO] 系统启动',
  '[WARN] 内存使用率 85%',
  '[ERROR] 数据库连接失败',
  '[DEBUG] 请求处理时间：234ms'
];

const encodedLogs = batchBase64Encode(logEntries);
// 发送到远程日志服务...

// 示例 4.3: 处理大量会话数据
const sessionData = Array.from({ length: 100 }, (_, i) => ({
  sessionId: `session_${i}`,
  timestamp: Date.now() - i * 1000,
  action: `action_${i % 10}`
}));

const serialized = sessionData.map(s => JSON.stringify(s));
const encoded = batchBase64Encode(serialized);

// 压缩存储...
```

## 示例 5: 验证工具

```typescript
import { isValidBase64, isValidBase64Url, calculateBase64Size } from '@/skills/base64-utils-skill';

// 示例 5.1: 验证用户上传的数据
function validateUserUpload(input: string): boolean {
  if (!isValidBase64(input)) {
    console.error('无效的 Base64 格式');
    return false;
  }
  
  // 进一步验证解码后的数据
  try {
    const decoded = Buffer.from(input, 'base64');
    if (decoded.length > 10 * 1024 * 1024) { // 限制 10MB
      console.error('数据过大');
      return false;
    }
    return true;
  } catch (error) {
    console.error('解码失败:', error);
    return false;
  }
}

const userInput = 'SGVsbG8sIFdvcmxkIQ==';
if (validateUserUpload(userInput)) {
  console.log('✓ 验证通过');
} else {
  console.log('✗ 验证失败');
}

// 示例 5.2: 验证 URL Token
function validateUrlToken(token: string): boolean {
  if (!isValidBase64Url(token)) {
    return false;
  }
  
  // Token 长度检查
  if (token.length < 10 || token.length > 1000) {
    return false;
  }
  
  return true;
}

const urlToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9';
console.log('Token 有效:', validateUrlToken(urlToken));

// 示例 5.3: 预估存储大小
const originalSize = 1024 * 1024; // 1MB
const base64Size = calculateBase64Size(originalSize);
console.log(`原始大小：${originalSize} 字节`);
console.log(`Base64 大小：${base64Size} 字节`);
console.log(`增加比例：${((base64Size - originalSize) / originalSize * 100).toFixed(2)}%`);
// 输出：增加比例：33.33%

// 示例 5.4: 数据完整性检查
function encodeWithChecksum(data: string): string {
  const encoded = base64Encode(data);
  const checksum = Buffer.from(encoded).length % 100;
  return `${encoded}.${checksum}`;
}

function decodeWithChecksum(encoded: string): string {
  const [base64Data, checksum] = encoded.split('.');
  
  if (!isValidBase64(base64Data)) {
    throw new Error('无效的 Base64 数据');
  }
  
  const actualChecksum = Buffer.from(base64Data).length % 100;
  if (actualChecksum !== parseInt(checksum)) {
    throw new Error('校验和失败，数据可能已损坏');
  }
  
  return base64Decode(base64Data);
}

const secureData = encodeWithChecksum('重要数据');
console.log('带校验和的编码:', secureData);

try {
  const decoded = decodeWithChecksum(secureData);
  console.log('解码成功:', decoded);
} catch (error) {
  console.error('验证失败:', error);
}
```

## 示例 6: 实际应用场景

### 6.1 图片上传预览

```typescript
import { fileToBase64DataUrl } from '@/skills/base64-utils-skill';

// 前端文件上传预览
async function handleImageUpload(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// 或者使用 Node.js
function handleImageUploadNode(filePath: string): string {
  const dataUrl = fileToBase64DataUrl(filePath);
  return dataUrl; // 直接返回给前端显示
}
```

### 6.2 配置文件加密存储

```typescript
import { base64Encode, base64Decode } from '@/skills/base64-utils-skill';
import * as crypto from 'crypto';

// 简单加密 + Base64 编码
function encryptConfig(config: any, secret: string): string {
  const json = JSON.stringify(config);
  const cipher = crypto.createCipher('aes-256-cbc', secret);
  let encrypted = cipher.update(json, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  return encrypted;
}

function decryptConfig(encrypted: string, secret: string): any {
  const decipher = crypto.createDecipher('aes-256-cbc', secret);
  let decrypted = decipher.update(encrypted, 'base64', 'utf8');
  decrypted += decipher.final('utf8');
  return JSON.parse(decrypted);
}

// 使用示例
const config = { apiKey: 'sk-xxx', database: 'mongodb://...' };
const encrypted = encryptConfig(config, 'my-secret-key');
console.log('加密配置:', encrypted);

const decrypted = decryptConfig(encrypted, 'my-secret-key');
console.log('解密配置:', decrypted);
```

### 6.3 跨服务数据传输

```typescript
import { base64UrlEncode, base64UrlDecode } from '@/skills/base64-utils-skill';

// 微服务间安全传输复杂数据
function createServiceRequest(service: string, action: string, data: any): string {
  const request = {
    service,
    action,
    data,
    timestamp: Date.now(),
    requestId: crypto.randomUUID()
  };
  
  return base64UrlEncode(JSON.stringify(request));
}

function parseServiceRequest(encoded: string): any {
  const json = base64UrlDecode(encoded);
  return JSON.parse(json);
}

// 使用示例
const request = createServiceRequest('user-service', 'createUser', {
  username: 'axon',
  email: 'axon@example.com'
});

console.log('服务请求:', request);
// 通过 HTTP/gRPC 发送...

// 服务端接收
const parsed = parseServiceRequest(request);
console.log('解析结果:', parsed);
```

### 6.4 离线数据同步

```typescript
import { batchBase64Encode, batchBase64Decode } from '@/skills/base64-utils-skill';

// 离线数据打包
interface OfflineData {
  type: string;
  data: any;
  timestamp: number;
}

function packOfflineData(items: OfflineData[]): string {
  const serialized = items.map(item => JSON.stringify(item));
  const encoded = batchBase64Encode(serialized);
  return JSON.stringify(encoded);
}

function unpackOfflineData(packed: string): OfflineData[] {
  const encoded: string[] = JSON.parse(packed);
  const decoded = batchBase64Decode(encoded);
  return decoded.map(json => JSON.parse(json));
}

// 使用示例
const offlineItems: OfflineData[] = [
  { type: 'message', data: { text: 'Hello' }, timestamp: Date.now() },
  { type: 'action', data: { action: 'click' }, timestamp: Date.now() },
  { type: 'state', data: { page: 'home' }, timestamp: Date.now() }
];

const packed = packOfflineData(offlineItems);
console.log('打包数据:', packed);

// 存储到 localStorage 或发送到服务端...

// 解包
const unpacked = unpackOfflineData(packed);
console.log('解包数据:', unpacked);
```

---

**最后更新:** 2026-03-13  
**维护者:** KAEL Engineering
