# Image Utils Skill - 使用示例

**技能文件:** `src/skills/image-utils-skill.ts`  
**版本:** 1.0.0  
**功能:** 图片压缩、格式转换、水印添加

---

## 📦 安装依赖

```bash
yarn add sharp
# 或
npm install sharp
```

---

## 🚀 快速开始

### 1. 导入技能

```typescript
import {
  ImageUtils,
  getImageInfo,
  compressImage,
  convertImage,
  addTextWatermark,
  addImageWatermark,
  batchCompressImages,
  batchAddWatermark
} from './src/skills/image-utils-skill';
```

---

## 📊 功能示例

### 1️⃣ 获取图片信息

```typescript
const info = await getImageInfo('input.jpg');

console.log('图片信息:', {
  格式：info.format,      // 'jpeg'
  宽度：info.width,       // 1920
  高度：info.height,      // 1080
  大小：info.size,        // 524288 (512KB)
  颜色空间：info.space,   // 'srgb'
  透明通道：info.hasAlpha // false
});
```

---

### 2️⃣ 图片压缩

#### 基础压缩 (JPEG 80% 质量)

```typescript
const result = await compressImage('input.jpg', 'output.jpg', {
  quality: 80
});

console.log('压缩结果:', {
  原始大小：result.originalSize,     // 524288
  压缩后大小：result.processedSize,   // 209715
  压缩率：result.compressionRatio,   // 60%
  输出格式：result.format,           // 'jpeg'
});
```

#### PNG 压缩

```typescript
const result = await compressImage('input.png', 'output.png', {
  format: 'png',
  compressionLevel: 9, // 最高压缩级别 (0-9)
  quality: 80
});
```

#### WebP 压缩 (高压缩率)

```typescript
const result = await compressImage('input.jpg', 'output.webp', {
  format: 'webp',
  quality: 75,
  effort: 6 // 最高压缩效率 (0-6)
});

// WebP 通常比 JPEG 小 30-50%
```

#### 批量压缩

```typescript
const inputFiles = [
  'images/photo1.jpg',
  'images/photo2.jpg',
  'images/photo3.jpg'
];

const results = await batchCompressImages(inputFiles, 'output/', {
  format: 'webp',
  quality: 80
});

// 输出目录结构:
// output/
//   ├── photo1.webp
//   ├── photo2.webp
//   └── photo3.webp
```

---

### 3️⃣ 格式转换

#### JPG → PNG

```typescript
const result = await convertImage('input.jpg', 'output.png', 'png');
```

#### PNG → WebP

```typescript
const result = await convertImage('input.png', 'output.webp', 'webp');
```

#### 任意格式 → AVIF (新一代格式)

```typescript
const result = await convertImage('input.jpg', 'output.avif', 'avif');

// AVIF 比 WebP 再小 20-30%，但兼容性较差
```

---

### 4️⃣ 添加文字水印

#### 基础文字水印

```typescript
const result = await addTextWatermark(
  'input.jpg',
  'output.jpg',
  '© 2026 AxonClaw',
  {
    fontSize: 24,
    color: '#ffffff',
    position: 'bottom-right',
    margin: 20,
    opacity: 0.7
  }
);
```

#### 自定义文字样式

```typescript
const result = await addTextWatermark(
  'input.jpg',
  'output.jpg',
  'CONFIDENTIAL',
  {
    fontSize: 48,
    color: '#ff0000',
    fontWeight: 'bold',
    fontFamily: 'Arial',
    position: 'center',
    opacity: 0.3,
    rotation: 45 // 旋转 45 度
  }
);
```

#### 水印位置选项

```typescript
// 所有支持的位置:
const positions: WatermarkPosition[] = [
  'top-left',      // 左上角
  'top-center',    // 顶部居中
  'top-right',     // 右上角
  'left-center',   // 左侧居中
  'center',        // 正中心
  'right-center',  // 右侧居中
  'bottom-left',   // 左下角
  'bottom-center', // 底部居中
  'bottom-right'   // 右下角 (默认)
];
```

---

### 5️⃣ 添加图片水印

#### 基础图片水印

```typescript
const result = await addImageWatermark(
  'input.jpg',
  'output.jpg',
  'logo.png', // 水印图片路径
  {
    width: 100,           // 水印宽度 (像素)
    position: 'bottom-right',
    margin: 10,
    opacity: 0.8
  }
);
```

#### 透明 Logo 水印

```typescript
const result = await addImageWatermark(
  'product.jpg',
  'product-watermarked.jpg',
  'brand-logo.png',
  {
    width: 150,
    height: 50,           // 固定尺寸
    position: 'top-left',
    margin: 20,
    opacity: 0.5,         // 半透明
    rotation: 0
  }
);
```

---

### 6️⃣ 批量添加水印

```typescript
const inputFiles = [
  'photos/img1.jpg',
  'photos/img2.jpg',
  'photos/img3.jpg'
];

// 批量添加文字水印
const results = await batchAddWatermark(inputFiles, 'output/', {
  type: 'text',
  text: '© AxonClaw 2026',
  fontSize: 20,
  color: '#ffffff',
  position: 'bottom-right',
  margin: 15,
  opacity: 0.6
});

// 或批量添加图片水印
const logoResults = await batchAddWatermark(inputFiles, 'output/', {
  type: 'image',
  imagePath: 'assets/logo.png',
  width: 80,
  position: 'bottom-right',
  margin: 10,
  opacity: 0.7
});
```

---

## 🎯 实战场景

### 场景 1: 电商图片优化

```typescript
// 商品图批量处理：转 WebP + 压缩 + 添加品牌水印
async function optimizeProductImages(inputDir: string, outputDir: string) {
  const files = fs.readdirSync(inputDir)
    .filter(f => /\.(jpg|png|jpeg)$/i.test(f))
    .map(f => path.join(inputDir, f));

  // 1. 批量压缩转 WebP
  await batchCompressImages(files, outputDir, {
    format: 'webp',
    quality: 85,
    effort: 4
  });

  // 2. 批量添加水印
  const webpFiles = fs.readdirSync(outputDir)
    .filter(f => f.endsWith('.webp'))
    .map(f => path.join(outputDir, f));

  await batchAddWatermark(webpFiles, outputDir, {
    type: 'image',
    imagePath: 'assets/brand-logo.png',
    width: 100,
    position: 'bottom-right',
    margin: 10,
    opacity: 0.6
  });

  console.log('✅ 商品图优化完成');
}
```

### 场景 2: 社交媒体配图

```typescript
// 为社交媒体图片添加版权水印
async function addSocialMediaWatermark(inputPath: string, outputPath: string) {
  const result = await addTextWatermark(
    inputPath,
    outputPath,
    '@axonclaw_official',
    {
      fontSize: 32,
      color: '#ffffff',
      fontWeight: 'bold',
      position: 'bottom-center',
      margin: 20,
      opacity: 0.8,
      rotation: 0
    }
  );

  console.log(`水印完成，压缩率：${result.compressionRatio.toFixed(2)}%`);
}
```

### 场景 3: 文档截图保护

```typescript
// 为敏感文档截图添加防盗用水印
async function protectDocumentScreenshot(inputPath: string, outputPath: string, userEmail: string) {
  const result = await addTextWatermark(
    inputPath,
    outputPath,
    `CONFIDENTIAL - ${userEmail}`,
    {
      fontSize: 36,
      color: '#ff0000',
      fontWeight: 'bold',
      position: 'center',
      opacity: 0.2,
      rotation: 45 // 对角线水印
    }
  );

  console.log('✅ 文档保护完成');
}
```

---

## 📝 类型定义

```typescript
// 图片格式
type ImageFormat = 'png' | 'jpeg' | 'webp' | 'gif' | 'avif';

// 压缩配置
interface CompressConfig {
  format?: ImageFormat;
  quality?: number;           // 0-100
  compressionLevel?: number;  // PNG: 0-9
  effort?: number;            // WebP/AVIF: 0-6
}

// 水印位置
type WatermarkPosition = 
  | 'top-left' | 'top-center' | 'top-right'
  | 'left-center' | 'center' | 'right-center'
  | 'bottom-left' | 'bottom-center' | 'bottom-right';

// 文字水印配置
interface TextWatermarkConfig {
  type: 'text';
  text: string;
  fontSize?: number;
  color?: string;
  fontWeight?: 'normal' | 'bold' | 'light' | number;
  fontFamily?: string;
  position?: WatermarkPosition;
  margin?: number;
  opacity?: number;
  rotation?: number;
}

// 图片水印配置
interface ImageWatermarkConfig {
  type: 'image';
  imagePath: string;
  width?: number;
  height?: number;
  position?: WatermarkPosition;
  margin?: number;
  opacity?: number;
  rotation?: number;
}

// 处理结果
interface ProcessResult {
  outputPath: string;
  originalSize: number;
  processedSize: number;
  compressionRatio: number;
  format: string;
  width: number;
  height: number;
}
```

---

## ⚠️ 注意事项

1. **Sharp 依赖**: 需要安装 `sharp` 包，首次安装可能需要下载预编译二进制
2. **内存使用**: 处理大图片时注意内存占用，建议单张图片不超过 50MB
3. **格式兼容性**: 
   - JPEG/PNG: 全平台兼容
   - WebP: 现代浏览器支持
   - AVIF: 最新浏览器支持
4. **水印性能**: 批量处理时建议使用异步并发控制

---

## 🎉 完成

**交付物:**
- ✅ `src/skills/image-utils-skill.ts` - 图片处理技能
- ✅ `src/skills/image-utils-skill.examples.md` - 使用示例

**功能清单:**
- ✅ 图片压缩 (支持 JPEG/PNG/WebP/GIF/AVIF)
- ✅ 格式转换 (任意格式互转)
- ✅ 文字水印 (自定义样式/位置/旋转)
- ✅ 图片水印 (支持缩放/透明度/旋转)
- ✅ 批量处理 (批量压缩/批量水印)

**用时:** < 5 分钟
