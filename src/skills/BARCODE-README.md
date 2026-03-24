# 📊 条形码工具技能 (Barcode Utils)

**功能:** 条形码生成、解析、多格式支持  
**位置:** `src/skills/barcode-utils-skill.ts`  
**示例:** `src/skills/barcode-utils-skill.examples.ts`

---

## 🚀 快速开始

### 安装依赖

```bash
npm install bwip-js barcode-reader sharp node-zbar
```

### 基础使用

```typescript
import { BarcodeUtils } from './skills/barcode-utils-skill';

// 生成条形码
const buffer = BarcodeUtils.generate('123456789012', { format: 'EAN-13' });
fs.writeFileSync('barcode.png', buffer);

// 解析条形码
const result = BarcodeUtils.parse('barcode.png');
if (result.success) {
  console.log('数据:', result.data);
  console.log('格式:', result.format);
}
```

---

## 📋 功能清单

### 1. 条形码生成

支持 13 种条形码格式:

| 格式 | 描述 | 适用场景 |
|------|------|----------|
| **EAN-13** | 国际商品条形码 (13 位) | 零售商品 |
| **EAN-8** | 缩短版商品条形码 (8 位) | 小商品 |
| **UPC-A** | 美国通用商品代码 (12 位) | 北美商品 |
| **UPC-E** | 缩短版 UPC (6 位) | 小包装 |
| **Code-128** | 高密度字母数字 | 物流/仓储 |
| **Code-39** | 字母数字 (工业标准) | 工业标签 |
| **Code-93** | Code-39 增强版 | 高密度需求 |
| **ITF-14** | 包装箱条形码 (14 位) | 外箱标识 |
| **Codabar** | 图书馆/血库专用 | 特定行业 |
| **QR** | 二维码 | 营销/支付 |
| **DataMatrix** | 小型二维码 | 电子产品 |
| **PDF417** | 堆叠式二维条形码 | 证件/票据 |
| **Aztec** | 高效二维码 | 交通票务 |

### 2. 条形码解析

- 支持多种格式自动识别
- 同步/异步解析
- 批量解析

### 3. 校验码计算

- EAN-13 校验码计算与验证
- UPC-A 校验码计算与验证
- Code-128 自动校验

### 4. 格式转换

- EAN-13 ↔ UPC-A 互转
- 数据格式验证

---

## 💡 使用示例

### 生成条形码

```typescript
import { generateBarcode, generateBarcodeToFile } from './skills/barcode-utils-skill';

// 基础生成
const buffer = generateBarcode('Hello World');
fs.writeFileSync('barcode.png', buffer);

// 保存到文件
generateBarcodeToFile('123456789012', './product.png', {
  format: 'EAN-13',
  width: 2,
  height: 60,
  showText: true,
});

// 生成 SVG
const svg = generateBarcodeSVG('SVG Barcode', {
  format: 'Code-128',
  foregroundColor: '000000',
});
fs.writeFileSync('barcode.svg', svg);
```

### 自定义样式

```typescript
const options = {
  format: 'Code-128',
  width: 3,           // 缩放倍数
  height: 80,         // 高度 (像素)
  showText: true,     // 显示文本
  textLocation: 'bottom',
  fontSize: 14,
  foregroundColor: '0000ff',  // 前景色 (hex)
  backgroundColor: 'ffff00',  // 背景色 (hex)
  margin: 15,         // 边距
};

const buffer = generateBarcode('Custom Style', options);
```

### 批量生成

```typescript
import { batchGenerateBarcodes } from './skills/barcode-utils-skill';

const products = [
  { data: '123456789012', outputPath: './barcodes/p1.png' },
  { data: '234567890123', outputPath: './barcodes/p2.png' },
  { data: '345678901234', outputPath: './barcodes/p3.png' },
];

const results = batchGenerateBarcodes(products, { format: 'EAN-13' });
results.forEach(r => {
  if (r.success) console.log('✓', r.outputPath);
  else console.log('✗', r.error);
});
```

### 解析条形码

```typescript
import { parseBarcode, batchParseBarcodes } from './skills/barcode-utils-skill';

// 单个解析
const result = parseBarcode('./barcode.png');
if (result.success) {
  console.log('数据:', result.data);
  console.log('格式:', result.format);
} else {
  console.log('失败:', result.error);
}

// 批量解析
const results = batchParseBarcodes(['a.png', 'b.png', 'c.png']);
```

### 校验码计算

```typescript
import {
  calculateEAN13Checksum,
  validateEAN13,
  calculateUPCAChecksum,
  validateUPCA,
} from './skills/barcode-utils-skill';

// EAN-13
const ean13Base = '123456789012';
const ean13Full = calculateEAN13Checksum(ean13Base);
console.log(ean13Full); // 1234567890128
console.log(validateEAN13(ean13Full)); // true

// UPC-A
const upcaBase = '12345678901';
const upcaFull = calculateUPCAChecksum(upcaBase);
console.log(upcaFull); // 123456789012
console.log(validateUPCA(upcaFull)); // true
```

### 格式转换

```typescript
import { ean13ToUPCA, upcaToEAN13 } from './skills/barcode-utils-skill';

// EAN-13 → UPC-A (仅当以 0 开头时)
const ean13 = '0123456789012';
const upca = ean13ToUPCA(ean13); // 123456789012

// UPC-A → EAN-13
const upcaCode = '123456789012';
const ean13Code = upcaToEAN13(upcaCode); // 0123456789012
```

---

## 🎯 实际应用场景

### 电商产品管理

```typescript
const products = [
  { sku: 'PROD-001', ean: '123456789012' },
  { sku: 'PROD-002', ean: '234567890123' },
];

products.forEach(p => {
  generateBarcodeToFile(p.ean, `./labels/${p.sku}.png`, {
    format: 'EAN-13',
    showText: true,
  });
});
```

### 仓库管理

```typescript
const locations = ['A-01-01', 'A-01-02', 'B-02-01'];
locations.forEach(loc => {
  generateBarcodeToFile(loc, `./warehouse/${loc}.png`, {
    format: 'Code-128',
    height: 40,
  });
});
```

### 活动门票

```typescript
const ticketData = JSON.stringify({
  event: 'Tech Conference 2026',
  date: '2026-06-15',
  seat: 'A-123',
});

generateBarcodeToFile(ticketData, './ticket.png', {
  format: 'QR',
  width: 10,
  height: 10,
});
```

### 快递单号

```typescript
const trackingNumbers = ['SF1234567890', 'YT9876543210'];
trackingNumbers.forEach(num => {
  generateBarcodeToFile(num, `./shipping/${num}.png`, {
    format: 'Code-128',
    height: 50,
  });
});
```

---

## 📊 API 参考

### 生成函数

| 函数 | 描述 | 返回值 |
|------|------|--------|
| `generateBarcode(data, options)` | 生成条形码 | `Buffer` |
| `generateBarcodeToFile(data, path, options)` | 生成并保存 | `void` |
| `generateBarcodeSVG(data, options)` | 生成 SVG | `string` |
| `batchGenerateBarcodes(items, options)` | 批量生成 | `Result[]` |

### 解析函数

| 函数 | 描述 | 返回值 |
|------|------|--------|
| `parseBarcode(imagePath)` | 解析条形码 | `ParseResult` |
| `parseBarcodeSync(imagePath)` | 同步解析 | `ParseResult` |
| `batchParseBarcodes(paths)` | 批量解析 | `ParseResult[]` |

### 校验函数

| 函数 | 描述 |
|------|------|
| `calculateEAN13Checksum(code)` | 计算 EAN-13 校验码 |
| `calculateUPCAChecksum(code)` | 计算 UPC-A 校验码 |
| `validateEAN13(code)` | 验证 EAN-13 |
| `validateUPCA(code)` | 验证 UPC-A |

### 工具函数

| 函数 | 描述 |
|------|------|
| `getSupportedFormats()` | 获取支持的格式列表 |
| `getFormatDescription(format)` | 获取格式说明 |
| `validateDataForFormat(data, format)` | 验证数据格式 |
| `ean13ToUPCA(ean13)` | EAN-13 转 UPC-A |
| `upcaToEAN13(upca)` | UPC-A 转 EAN-13 |

---

## ⚙️ 配置选项

### BarcodeGenerateOptions

```typescript
interface BarcodeGenerateOptions {
  format?: BarcodeFormat;        // 条形码格式 (默认：Code-128)
  width?: number;                // 缩放倍数 (默认：2)
  height?: number;               // 高度像素 (默认：50)
  showText?: boolean;            // 显示文本 (默认：true)
  textLocation?: 'top' | 'bottom'; // 文本位置
  fontSize?: number;             // 字体大小 (默认：12)
  foregroundColor?: string;      // 前景色 hex (默认：000000)
  backgroundColor?: string;      // 背景色 hex (默认：ffffff)
  outputFormat?: 'png' | 'svg';  // 输出格式
  margin?: number;               // 边距像素 (默认：10)
}
```

---

## 🧪 运行示例

```bash
# 运行所有示例
npx ts-node src/skills/barcode-utils-skill.examples.ts

# 或编译后运行
tsc src/skills/barcode-utils-skill.examples.ts
node src/skills/barcode-utils-skill.examples.js
```

---

## 📝 注意事项

1. **依赖安装**: 确保安装所有必需的依赖包
2. **目录权限**: 确保有写入条形码文件的权限
3. **图片质量**: 解析成功率取决于图片清晰度
4. **格式限制**: 不同格式有不同的数据长度限制
5. **颜色对比**: 确保前景色和背景色有足够对比度

---

## 🐛 故障排除

### 问题：条形码生成失败

**解决:**
```bash
npm install bwip-js
```

### 问题：解析失败

**解决:**
```bash
npm install barcode-reader sharp node-zbar
```

### 问题：图片模糊

**解决:** 增加 `width` 和 `height` 参数

### 问题：解析不出数据

**解决:**
- 确保图片清晰
- 检查条形码完整性
- 尝试调整对比度

---

## 📚 相关资源

- [bwip-js 文档](https://github.com/metafloor/bwip-js)
- [Barcode Reader](https://github.com/mavidser/barcode-reader)
- [ZXing](https://github.com/zxing/zxing)
- [EAN/UPC 标准](https://www.gs1.org/standards/barcodes)

---

**最后更新:** 2026-03-13  
**版本:** 1.0.0
