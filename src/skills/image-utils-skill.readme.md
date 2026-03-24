# Image Utils Skill - NOVA 图片处理工具

> 优雅而强大的图片处理技能，支持压缩、格式转换和水印添加

---

## 📦 安装

```bash
yarn add sharp
# 或
npm install sharp
```

---

## 🎯 核心功能

### 1. 图片压缩
- 支持 JPEG/PNG/WebP/GIF/AVIF 格式
- 可调节质量 (0-100)
- 高压缩率算法 (mozjpeg, WebP effort)
- 批量压缩支持

### 2. 格式转换
- 任意格式互转
- 保持元数据
- 支持新一代格式 (WebP, AVIF)

### 3. 水印添加
- **文字水印**: 自定义字体/大小/颜色/位置/旋转
- **图片水印**: 支持缩放/透明度/旋转
- **9 种位置**: 四角 + 四边居中 + 正中心
- **批量水印**: 一次处理多张图片

---

## 🚀 快速开始

```typescript
import {
  compressImage,
  convertImage,
  addTextWatermark,
  addImageWatermark
} from './src/skills/image-utils-skill';

// 1. 压缩图片
await compressImage('input.jpg', 'output.jpg', {
  quality: 80,
  format: 'webp'
});

// 2. 格式转换
await convertImage('input.png', 'output.webp', 'webp');

// 3. 添加文字水印
await addTextWatermark('input.jpg', 'output.jpg', '© 2026', {
  position: 'bottom-right',
  opacity: 0.7
});

// 4. 添加图片水印
await addImageWatermark('input.jpg', 'output.jpg', 'logo.png', {
  width: 100,
  position: 'bottom-right'
});
```

---

## 📖 详细文档

- **使用示例**: [image-utils-skill.examples.md](./image-utils-skill.examples.md)
- **测试脚本**: [image-utils-skill.test.ts](./image-utils-skill.test.ts)
- **源代码**: [image-utils-skill.ts](./image-utils-skill.ts)

---

## 📊 API 参考

### 压缩配置

```typescript
interface CompressConfig {
  format?: 'png' | 'jpeg' | 'webp' | 'gif' | 'avif';
  quality?: number;           // 0-100
  compressionLevel?: number;  // PNG: 0-9
  effort?: number;            // WebP/AVIF: 0-6
}
```

### 水印配置

```typescript
// 文字水印
interface TextWatermarkConfig {
  type: 'text';
  text: string;
  fontSize?: number;
  color?: string;
  position?: WatermarkPosition;
  opacity?: number;
  rotation?: number;
}

// 图片水印
interface ImageWatermarkConfig {
  type: 'image';
  imagePath: string;
  width?: number;
  position?: WatermarkPosition;
  opacity?: number;
}
```

### 支持的水印位置

```typescript
type WatermarkPosition = 
  | 'top-left' | 'top-center' | 'top-right'
  | 'left-center' | 'center' | 'right-center'
  | 'bottom-left' | 'bottom-center' | 'bottom-right';
```

---

## 🎨 使用场景

### 电商图片优化
```typescript
await compressImage('product.jpg', 'product.webp', {
  format: 'webp',
  quality: 85
});
await addImageWatermark('product.webp', 'product-final.webp', 'logo.png');
```

### 社交媒体配图
```typescript
await addTextWatermark('photo.jpg', 'photo-watermarked.jpg', '@username', {
  fontSize: 32,
  position: 'bottom-center',
  opacity: 0.8
});
```

### 文档保护
```typescript
await addTextWatermark('screenshot.png', 'protected.png', 'CONFIDENTIAL', {
  fontSize: 48,
  color: '#ff0000',
  position: 'center',
  opacity: 0.2,
  rotation: 45
});
```

---

## ⚙️ 运行测试

```bash
# 确保有测试图片在 test-assets/images/
npx ts-node src/skills/image-utils-skill.test.ts
```

---

## 📝 注意事项

1. **Sharp 依赖**: 首次安装可能需要下载预编译二进制
2. **内存使用**: 建议单张图片不超过 50MB
3. **格式兼容性**:
   - JPEG/PNG: 全平台兼容
   - WebP: 现代浏览器
   - AVIF: 最新浏览器

---

## 🎉 交付清单

- ✅ `image-utils-skill.ts` - 核心技能文件 (14KB)
- ✅ `image-utils-skill.examples.md` - 详细使用示例 (8.6KB)
- ✅ `image-utils-skill.test.ts` - 快速测试脚本 (3.6KB)
- ✅ `image-utils-skill.readme.md` - 本文件

**总用时:** < 5 分钟  
**状态:** ✅ 完成

---

_Axon 出品 · 优雅而强大_
