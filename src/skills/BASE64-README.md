# Base64 Utils Skill

Base64 编解码工具技能，提供完整的 Base64 编码、解码、URL 安全变体和文件转换功能。

## 🚀 快速开始

```typescript
import { Base64Utils, base64Encode, base64Decode } from '@/skills/base64-utils-skill';
```

## 📖 功能清单

### 1. 基础 Base64 编码/解码

```typescript
import { base64Encode, base64Decode, Base64Utils } from '@/skills/base64-utils-skill';

// 编码字符串
const encoded = base64Encode('Hello, World!');
// 输出: 'SGVsbG8sIFdvcmxkIQ=='

// 解码字符串
const decoded = base64Decode('SGVsbG8sIFdvcmxkIQ==');
// 输出: 'Hello, World!'

// 使用工具对象
const encoded2 = Base64Utils.encode('Hello');
const decoded2 = Base64Utils.decode(encoded2);
```

### 2. URL Safe Base64

URL Safe Base64 将 `+` 和 `/` 替换为 `-` 和 `_`，并移除填充符 `=`，适用于 URL 和文件名。

```typescript
import { base64UrlEncode, base64UrlDecode, Base64Utils } from '@/skills/base64-utils-skill';

// URL Safe 编码
const urlSafe = base64UrlEncode('Hello+World/Test');
// 输出: 'SGVsbG8rV29ybGQvVGVzdA' (无填充符，+ 和 / 已替换)

// URL Safe 解码
const original = base64UrlDecode('SGVsbG8rV29ybGQvVGVzdA');
// 输出: 'Hello+World/Test'

// 使用工具对象
const encoded = Base64Utils.urlEncode('data?query=1&foo=bar');
const decoded = Base64Utils.urlDecode(encoded);
```

### 3. 文件 Base64 转换

```typescript
import { fileToBase64, fileToBase64DataUrl, base64ToFile, dataUrlToFile } from '@/skills/base64-utils-skill';

// 文件转 Base64
const base64 = fileToBase64('./image.png');

// 文件转 Data URL (带 MIME 类型)
const dataUrl = fileToBase64DataUrl('./image.png');
// 输出: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...'

// Base64 转文件
base64ToFile(base64, './output.png');

// Data URL 转文件
dataUrlToFile(dataUrl, './output2.png');
```

### 4. 批量处理

```typescript
import { batchBase64Encode, batchBase64Decode } from '@/skills/base64-utils-skill';

// 批量编码
const strings = ['Hello', 'World', 'Test'];
const encoded = batchBase64Encode(strings);
// 输出: ['SGVsbG8=', 'V29ybGQ=', 'VGVzdA==']

// 批量解码
const decoded = batchBase64Decode(encoded);
// 输出: ['Hello', 'World', 'Test']
```

### 5. 验证工具

```typescript
import { isValidBase64, isValidBase64Url, calculateBase64Size } from '@/skills/base64-utils-skill';

// 验证 Base64
isValidBase64('SGVsbG8=');      // true
isValidBase64('Invalid!@#');    // false

// 验证 URL Safe Base64
isValidBase64Url('SGVsbG8rV29ybGQ');  // true
isValidBase64Url('SGVsbG8+V29ybGQ');  // false (包含 +)

// 计算 Base64 编码后大小
calculateBase64Size(1024);  // 1372 字节 (1024 / 3 * 4)
```

## 📋 完整 API 参考

### 基础编码解码

| 函数 | 参数 | 返回值 | 描述 |
|------|------|--------|------|
| `base64Encode` | `string \| Buffer` | `string` | Base64 编码 |
| `base64Decode` | `string` | `string` | Base64 解码为字符串 |
| `base64DecodeToBuffer` | `string` | `Buffer` | Base64 解码为 Buffer |

### URL Safe Base64

| 函数 | 参数 | 返回值 | 描述 |
|------|------|--------|------|
| `base64UrlEncode` | `string \| Buffer` | `string` | URL Safe Base64 编码 |
| `base64UrlDecode` | `string` | `string` | URL Safe Base64 解码为字符串 |
| `base64UrlDecodeToBuffer` | `string` | `Buffer` | URL Safe Base64 解码为 Buffer |

### 文件转换

| 函数 | 参数 | 返回值 | 描述 |
|------|------|--------|------|
| `fileToBase64` | `filePath: string` | `string` | 文件转 Base64 |
| `fileToBase64DataUrl` | `filePath: string` | `string` | 文件转 Data URL (带 MIME 类型) |
| `base64ToFile` | `base64: string, outputPath: string` | `void` | Base64 转文件 |
| `dataUrlToFile` | `dataUrl: string, outputPath: string` | `void` | Data URL 转文件 |

### 批量处理

| 函数 | 参数 | 返回值 | 描述 |
|------|------|--------|------|
| `batchBase64Encode` | `string[]` | `string[]` | 批量编码 |
| `batchBase64Decode` | `string[]` | `string[]` | 批量解码 |

### 工具函数

| 函数 | 参数 | 返回值 | 描述 |
|------|------|--------|------|
| `isValidBase64` | `string` | `boolean` | 验证 Base64 |
| `isValidBase64Url` | `string` | `boolean` | 验证 URL Safe Base64 |
| `calculateBase64Size` | `number` (字节) | `number` | 计算 Base64 编码后大小 |

### Base64Utils 工具对象

```typescript
Base64Utils = {
  // 基础编码解码
  encode: base64Encode,
  decode: base64Decode,
  decodeToBuffer: base64DecodeToBuffer,
  
  // URL Safe
  urlEncode: base64UrlEncode,
  urlDecode: base64UrlDecode,
  urlDecodeToBuffer: base64UrlDecodeToBuffer,
  
  // 文件转换
  fileToBase64,
  fileToBase64DataUrl,
  base64ToFile,
  dataUrlToFile,
  
  // 批量处理
  batchEncode: batchBase64Encode,
  batchDecode: batchBase64Decode,
  
  // 工具函数
  isValid: isValidBase64,
  isValidUrl: isValidBase64Url,
  calculateSize: calculateBase64Size,
};
```

## 💡 使用场景

### JWT Token 处理

```typescript
// JWT Payload 编码 (URL Safe)
const payload = { userId: 123, role: 'admin' };
const payloadBase64 = Base64Utils.urlEncode(JSON.stringify(payload));

// JWT 签名验证
const signature = 'abc123_-xyz';
const signatureBuffer = Base64Utils.urlDecodeToBuffer(signature);
```

### 图片嵌入 HTML

```typescript
// 将图片转换为 Data URL 嵌入 HTML
const imageDataUrl = fileToBase64DataUrl('./logo.png');
const html = `<img src="${imageDataUrl}" alt="Logo" />`;
```

### URL 参数安全传输

```typescript
// 编码复杂数据作为 URL 参数
const data = { query: 'Hello+World/Test', page: 1 };
const encoded = Base64Utils.urlEncode(JSON.stringify(data));
const url = `https://api.example.com/data?payload=${encoded}`;
```

### 文件存储优化

```typescript
// 将小文件存储为 Base64 到数据库
const configBase64 = fileToBase64('./config.json');
// 存储到数据库...

// 读取时还原
base64ToFile(configBase64, './config-restored.json');
```

## ⚠️ 注意事项

1. **文件大小**: Base64 编码会增加约 33% 的数据量，大文件建议直接传输二进制
2. **字符编码**: 默认使用 UTF-8 编码，非 UTF-8 文本需要先转换
3. **URL Safe**: 在 URL、文件名、Cookie 等场景使用 URL Safe 变体
4. **填充符**: URL Safe Base64 默认移除 `=` 填充符，解码时会自动补充

## 📦 依赖

- Node.js Buffer (内置)
- Node.js fs (内置)
- Node.js path (内置)

无需额外 npm 依赖。

## 🧪 测试示例

```typescript
import { describe, it, expect } from 'vitest';
import { Base64Utils } from '@/skills/base64-utils-skill';

describe('Base64Utils', () => {
  it('should encode and decode correctly', () => {
    const original = 'Hello, World!';
    const encoded = Base64Utils.encode(original);
    const decoded = Base64Utils.decode(encoded);
    expect(decoded).toBe(original);
  });

  it('should handle URL Safe encoding', () => {
    const original = 'a+b/c';
    const encoded = Base64Utils.urlEncode(original);
    expect(encoded).not.toContain('+');
    expect(encoded).not.toContain('/');
    expect(Base64Utils.urlDecode(encoded)).toBe(original);
  });

  it('should validate Base64', () => {
    expect(Base64Utils.isValid('SGVsbG8=')).toBe(true);
    expect(Base64Utils.isValid('Invalid!')).toBe(false);
  });
});
```

---

**最后更新:** 2026-03-13  
**维护者:** KAEL Engineering
