# QR Utils Skill - 使用示例

**作者:** KAEL (via Axon)  
**版本:** 1.0.0  
**功能:** 二维码生成、解析、自定义样式

---

## 📦 安装依赖

首次使用前，确保安装 Python 依赖:

```bash
# 二维码生成库
uv pip install qrcode[pil]

# 二维码解析库
uv pip install opencv-python pyzbar

# macOS 还需要安装 zbar 系统库
brew install zbar
```

---

## 🚀 快速开始

### 1. 基础二维码生成

```typescript
import { generateQR } from './src/skills/qr-utils-skill';

// 生成简单二维码
const qrPath = await generateQR('https://example.com');
console.log('二维码已生成:', qrPath);
// 输出: /tmp/qr-codes/qr-1710331200000.png

// 自定义尺寸和颜色
const customQr = await generateQR('Hello World', {
  size: 512,
  color: {
    dark: '#6366f1',  // 靛蓝色前景
    light: '#ffffff'  // 白色背景
  },
  errorCorrection: 'H',  // 高容错率
  margin: 4
});
```

### 2. 带 Logo 的二维码

```typescript
import { generateQRWithLogo } from './src/skills/qr-utils-skill';

const logoQrPath = await generateQRWithLogo(
  'https://example.com',
  './assets/company-logo.png',  // Logo 文件路径
  {
    size: 512,
    errorCorrection: 'H',  // Logo 需要高容错率
    color: {
      dark: '#000000',
      light: '#ffffff'
    }
  }
);
```

### 3. 二维码解析

```typescript
import { parseQR } from './src/skills/qr-utils-skill';

// 从文件解析
const result = await parseQR('./qr-code.png');

if (result.success) {
  console.log('二维码内容:', result.data);
  console.log('格式类型:', result.format);
  // 输出示例:
  // 二维码内容: https://example.com
  // 格式类型: QRCODE
} else {
  console.error('解析失败:', result.error);
}

// 从 Base64 解析
const base64Data = 'data:image/png;base64,iVBORw0KGgoAAAANS...';
const base64Result = await parseQRFromBase64(base64Data);
console.log('解析结果:', base64Result.data);
```

### 4. 渐变彩色二维码

```typescript
import { generateGradientQR } from './src/skills/qr-utils-skill';

const gradientPath = await generateGradientQR(
  'https://example.com',
  [
    '#6366f1',  // 靛蓝
    '#8b5cf6',  // 紫色
    '#ec4899'   // 粉红
  ],
  {
    size: 512,
    errorCorrection: 'H'
  }
);
```

### 5. SVG 矢量二维码

```typescript
import { generateQRSVG } from './src/skills/qr-utils-skill';
import { writeFileSync } from 'fs';

// 生成 SVG 字符串
const svg = await generateQRSVG('https://example.com', {
  size: 512,
  color: {
    dark: '#1a1a2e',
    light: '#ffffff'
  }
});

// 保存为文件
writeFileSync('./qrcode.svg', svg);
```

### 6. 批量生成

```typescript
import { generateQRBulk } from './src/skills/qr-utils-skill';

const qrPaths = await generateQRBulk(
  [
    { data: 'https://site1.com', outputPath: './qr1.png' },
    { data: 'https://site2.com', outputPath: './qr2.png' },
    { data: 'https://site3.com' }  // 不指定路径则生成到临时目录
  ],
  {
    size: 256,
    color: { dark: '#000000', light: '#ffffff' }
  }
);

console.log('生成的二维码:', qrPaths);
// 输出: ['./qr1.png', './qr2.png', '/tmp/qr-codes/qr-xxx.png']
```

### 7. 验证二维码

```typescript
import { generateQR, verifyQR } from './src/skills/qr-utils-skill';

// 生成二维码
const originalData = 'https://example.com';
const qrPath = await generateQR(originalData);

// 验证生成是否正确
const verification = await verifyQR(originalData, qrPath);

if (verification.valid && verification.match) {
  console.log('✅ 二维码验证通过');
} else {
  console.log('❌ 二维码验证失败');
}
```

---

## 📊 完整示例项目

### 示例 1: 生成产品二维码卡片

```typescript
import { generateQRWithLogo } from './src/skills/qr-utils-skill';

interface Product {
  id: string;
  name: string;
  price: number;
  url: string;
}

async function generateProductQRCards(products: Product[]) {
  const results = [];
  
  for (const product of products) {
    const qrPath = await generateQRWithLogo(
      product.url,
      './assets/brand-logo.png',
      {
        size: 512,
        errorCorrection: 'H',
        color: {
          dark: '#1a1a2e',
          light: '#ffffff'
        }
      }
    );
    
    results.push({
      productId: product.id,
      productName: product.name,
      qrPath,
      price: product.price
    });
  }
  
  return results;
}

// 使用
const products = [
  { id: 'P001', name: '产品 A', price: 99.99, url: 'https://shop.com/p1' },
  { id: 'P002', name: '产品 B', price: 199.99, url: 'https://shop.com/p2' }
];

const qrCards = await generateProductQRCards(products);
console.log('产品二维码卡片已生成:', qrCards);
```

### 示例 2: WiFi 二维码生成器

```typescript
import { generateQR } from './src/skills/qr-utils-skill';

/**
 * 生成 WiFi 连接二维码
 * 
 * @param ssid WiFi 名称
 * @param password WiFi 密码
 * @param encryption 加密类型 (WPA/WEP/nopass)
 * @param hidden 是否隐藏网络
 */
async function generateWiFiQR(
  ssid: string,
  password: string,
  encryption: 'WPA' | 'WEP' | 'nopass' = 'WPA',
  hidden: boolean = false
) {
  // WiFi 二维码格式: WIFI:T:WPA;S:MyNetwork;P:MyPassword;H:false;;
  const wifiData = `WIFI:T:${encryption};S:${ssid};P:${password};H:${hidden};;`;
  
  return await generateQR(wifiData, {
    size: 512,
    color: {
      dark: '#10b981',  // 绿色
      light: '#ffffff'
    },
    errorCorrection: 'M'
  });
}

// 使用
const wifiQR = await generateWiFiQR(
  'MyHomeWiFi',
  'SuperSecretPassword123',
  'WPA',
  false
);
console.log('WiFi 二维码已生成:', wifiQR);
// 手机扫描后可直接连接 WiFi
```

### 示例 3: vCard 联系人名片

```typescript
import { generateQR } from './src/skills/qr-utils-skill';

interface Contact {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  organization?: string;
  title?: string;
  url?: string;
}

function formatVCard(contact: Contact): string {
  const lines = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `N:${contact.lastName};${contact.firstName};;;`,
    `FN:${contact.firstName} ${contact.lastName}`,
    `TEL:${contact.phone}`,
    `EMAIL:${contact.email}`
  ];
  
  if (contact.organization) {
    lines.push(`ORG:${contact.organization}`);
  }
  
  if (contact.title) {
    lines.push(`TITLE:${contact.title}`);
  }
  
  if (contact.url) {
    lines.push(`URL:${contact.url}`);
  }
  
  lines.push('END:VCARD');
  
  return lines.join('\n');
}

async function generateContactQR(contact: Contact) {
  const vCardData = formatVCard(contact);
  
  return await generateQR(vCardData, {
    size: 512,
    color: {
      dark: '#6366f1',
      light: '#ffffff'
    }
  });
}

// 使用
const contact: Contact = {
  firstName: 'John',
  lastName: 'Doe',
  phone: '+86-138-0000-0000',
  email: 'john.doe@example.com',
  organization: 'Example Corp',
  title: 'CEO',
  url: 'https://example.com'
};

const contactQR = await generateContactQR(contact);
console.log('联系人名片二维码已生成:', contactQR);
// 手机扫描后可直接保存联系人
```

### 示例 4: 二维码解析批处理

```typescript
import { parseQR } from './src/skills/qr-utils-skill';
import { readdirSync } from 'fs';
import { join } from 'path';

async function batchParseQR(directory: string) {
  const files = readdirSync(directory);
  const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp'];
  
  const results = [];
  
  for (const file of files) {
    const ext = file.toLowerCase().slice(-4);
    if (imageExtensions.includes(ext) || file.endsWith('.png')) {
      const filePath = join(directory, file);
      const result = await parseQR(filePath);
      
      results.push({
        filename: file,
        success: result.success,
        data: result.data,
        format: result.format,
        error: result.error
      });
    }
  }
  
  return results;
}

// 使用
const qrResults = await batchParseQR('./qr-codes-folder');

console.log('批量解析结果:');
qrResults.forEach(r => {
  if (r.success) {
    console.log(`✅ ${r.filename}: ${r.data}`);
  } else {
    console.log(`❌ ${r.filename}: ${r.error}`);
  }
});
```

---

## ⚙️ API 参考

### generateQR(data, options?)

生成基础二维码

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| data | string | ✅ | - | 要编码的数据 |
| options.outputPath | string | ❌ | - | 输出文件路径 |
| options.size | number | ❌ | 256 | 二维码尺寸 (像素) |
| options.errorCorrection | 'L'\\|'M'\\|'Q'\\|'H' | ❌ | 'M' | 容错率级别 |
| options.color.dark | string | ❌ | '#000000' | 前景色 |
| options.color.light | string | ❌ | '#ffffff' | 背景色 |
| options.margin | number | ❌ | 4 | 边距 (模块数) |
| options.returnBase64 | boolean | ❌ | false | 是否返回 base64 |

**返回值:** `Promise<string>` - 文件路径或 base64 字符串

---

### generateQRWithLogo(data, logoPath, options?)

生成带 Logo 的二维码

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| data | string | ✅ | 要编码的数据 |
| logoPath | string | ✅ | Logo 图片路径 |
| options | QRGenerateOptions | ❌ | 同 generateQR |

**注意:** Logo 需要高容错率 (建议使用 'H')

---

### parseQR(imagePath)

解析二维码图像

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| imagePath | string | ✅ | 二维码图片路径 |

**返回值:** `Promise<QRParseResult>`

```typescript
interface QRParseResult {
  success: boolean;
  data?: string;      // 解析出的数据
  error?: string;     // 错误信息
  format?: string;    // 二维码格式类型
}
```

---

### generateGradientQR(data, colors, options?)

生成渐变彩色二维码

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| data | string | ✅ | 要编码的数据 |
| colors | string[] | ✅ | 渐变色数组 (至少 2 个) |
| options | QRGenerateOptions | ❌ | 生成选项 |

---

### generateQRSVG(data, options?)

生成 SVG 矢量二维码

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| data | string | ✅ | 要编码的数据 |
| options | QRGenerateOptions | ❌ | 生成选项 |

**返回值:** `Promise<string>` - SVG 字符串

---

### verifyQR(data, qrPath)

验证二维码内容

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| data | string | ✅ | 原始数据 |
| qrPath | string | ✅ | 二维码文件路径 |

**返回值:** `Promise<{ valid: boolean; match: boolean }>`

---

## 🎨 容错率级别说明

| 级别 | 容错能力 | 适用场景 |
|------|---------|---------|
| L (Low) | 7% | 简单二维码，无 Logo |
| M (Medium) | 15% | 常规使用 (默认) |
| Q (Quartile) | 25% | 需要部分遮挡 |
| H (High) | 30% | 带 Logo、复杂背景 |

---

## ⚠️ 注意事项

1. **依赖安装:** 首次使用前确保安装所有 Python 依赖
2. **Logo 尺寸:** Logo 不宜超过二维码的 1/5，否则影响识别
3. **颜色对比:** 前景色和背景色需要足够对比度
4. **最小尺寸:** 建议不小于 200x200 像素
5. **文件格式:** 支持 PNG、JPEG、SVG 等格式

---

## 📝 更新日志

### v1.0.0 (2026-03-13)
- ✅ 基础二维码生成
- ✅ 带 Logo 二维码
- ✅ 二维码解析
- ✅ 渐变彩色二维码
- ✅ SVG 矢量图
- ✅ 批量生成
- ✅ 验证功能

---

**交付完成!** 🎉
