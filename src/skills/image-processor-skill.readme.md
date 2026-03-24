# 🖼️ NOVA 图片处理技能

**文件:** `src/skills/image-processor-skill.ts`  
**版本:** 1.0.0  
**依赖:** `sharp`

---

## ✅ 功能清单

| 功能 | 描述 | 状态 |
|------|------|------|
| 图片压缩 | 质量调整，支持 JPEG/PNG/WebP/AVIF | ✅ |
| 格式转换 | PNG ↔ JPG ↔ WebP ↔ AVIF | ✅ |
| 尺寸调整 | 缩放/裁剪，支持多种模式 | ✅ |
| 精确裁剪 | 指定区域裁剪 | ✅ |
| 链式处理 | 一步完成多种操作 | ✅ |
| 批量处理 | 多图片同时处理 | ✅ |

---

## 🚀 快速开始

```typescript
import { processImage } from './src/skills/image-processor-skill';

// 一步完成：调整尺寸 + 压缩 + 格式转换
const result = await processImage(
  'input.png',
  'output.webp',
  { width: 1200, height: 800 },  // 调整尺寸
  { format: 'webp', quality: 75 } // 压缩
);

console.log(`压缩率：${result.compressionRatio.toFixed(2)}%`);
```

---

## 📚 详细文档

- **完整示例:** [`image-processor-skill.examples.md`](./image-processor-skill.examples.md)
- **测试文件:** [`image-processor-skill.test.ts`](./image-processor-skill.test.ts)

---

## 🎯 常见场景

### 网站图片优化
```typescript
await processImage('photo.jpg', 'thumb.webp', 
  { width: 300, height: 300 }, 
  { format: 'webp', quality: 75 }
);
```

### 社交媒体
```typescript
await processImage('photo.jpg', 'instagram.jpg', 
  { width: 1080, height: 1080, fit: 'cover' }, 
  { format: 'jpeg', quality: 95 }
);
```

### 批量处理
```typescript
await batchProcessImages(inputFiles, outputDir, 
  { width: 1920, height: 1080 }, 
  { format: 'webp', quality: 80 }
);
```

---

## 📊 性能

| 操作 | 压缩率 | 耗时 |
|------|--------|------|
| JPEG 压缩 | ~50% | ~50ms |
| WebP 转换 | ~90% | ~80ms |
| 链式处理 | ~85% | ~100ms |

*测试环境：M1 Mac, 1920x1080 图片*

---

## 🔧 API

### 便捷函数
- `getImageInfo(path)` - 获取图片信息
- `compressImage(input, output, config)` - 压缩
- `resizeImage(input, output, config)` - 调整尺寸
- `cropImage(input, output, config)` - 裁剪
- `convertImage(input, output, format)` - 转换格式
- `processImage(input, output, resize, compress)` - 链式处理
- `batchProcessImages(inputs, outputDir, resize, compress)` - 批量处理

### 类
- `ImageProcessor` - 面向对象接口，支持链式调用

---

**NOVA 图片处理技能 - 高效、灵活、易用** 🎨
