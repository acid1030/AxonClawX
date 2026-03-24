# 🔤 字体工具技能 - Font Utilities Skill

字体操作工具集，支持字体加载、格式转换和子集生成。

---

## 📦 安装依赖

```bash
# 安装 Python 字体处理库
uv pip install fonttools brotli
```

---

## 🚀 快速开始

### 1. 字体加载

```typescript
import { loadFont, loadFontFromUrl } from './font-utils-skill';

// 从本地文件加载
const fontInfo = await loadFont('./fonts/Roboto-Regular.ttf');
console.log(`字体家族：${fontInfo.family}`);
console.log(`字形数量：${fontInfo.glyphCount}`);

// 从 URL 加载
const localPath = await loadFontFromUrl(
  'https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Me5WZK.woff2',
  './downloads/roboto.woff2'
);
```

### 2. 字体转换

```typescript
import { convertFont, batchConvert } from './font-utils-skill';

// 单文件转换
await convertFont('./input.ttf', './output.woff2', {
  quality: 'high',
  compress: true
});

// 批量转换
const outputPaths = await batchConvert(
  './fonts/myfont.ttf',
  './output/webfonts',
  ['woff', 'woff2']
);
// 输出:
// - ./output/webfonts/myfont.woff
// - ./output/webfonts/myfont.woff2
```

### 3. 字体子集

```typescript
import { createSubset, createWebOptimizedSubset } from './font-utils-skill';

// 提取特定字符
const result = await createSubset('./fonts/full.ttf', './fonts/subset.ttf', {
  characters: '你好世界欢迎使用',
  optimize: true,
  preserveKerning: true
});

console.log(`压缩率：${result.reduction}%`);
console.log(`字符数：${result.characterCount}`);

// 为网页创建优化子集
await createWebOptimizedSubset('./fonts/full.ttf', './web/fonts', 'zh');
```

---

## 📚 API 参考

### 字体加载

#### `loadFont(fontPath, options?)`
加载字体文件并返回详细信息。

**参数:**
- `fontPath` (string): 字体文件路径
- `options` (FontLoadOptions): 加载选项

**返回:** `Promise<FontInfo>`

**FontInfo 结构:**
```typescript
{
  family: string;          // 字体家族名
  subfamily: string;       // 子家族 (Regular, Bold 等)
  fullName: string;        // 全名
  version: string;         // 版本号
  postscriptName: string;  // PostScript 名
  unitsPerEm: number;      // 单位/EM
  glyphCount: number;      // 字形数量
  boundingBox: {           // 边界框
    xMin: number;
    yMin: number;
    xMax: number;
    yMax: number;
  };
  hasColor: boolean;       // 是否为彩色字体
  isFixedPitch: boolean;   // 是否为等宽字体
}
```

#### `loadFontFromUrl(url, outputPath?)`
从 URL 下载字体文件。

**参数:**
- `url` (string): 字体文件 URL
- `outputPath` (string, optional): 本地保存路径

**返回:** `Promise<string>` (本地文件路径)

---

### 字体转换

#### `convertFont(inputPath, outputPath, options?)`
转换字体格式。

**参数:**
- `inputPath` (string): 输入文件路径
- `outputPath` (string): 输出文件路径
- `options` (FontConversionOptions): 转换选项
  - `quality` ('low' | 'medium' | 'high'): 质量等级
  - `compress` (boolean): 是否压缩
  - `keepMetadata` (boolean): 保留元数据

**支持格式:** TTF, OTF, WOFF, WOFF2

#### `batchConvert(inputPath, outputDir, formats?)`
批量转换为多种格式。

**参数:**
- `inputPath` (string): 输入文件路径
- `outputDir` (string): 输出目录
- `formats` (string[]): 目标格式数组

**返回:** `Promise<string[]>` (输出文件路径数组)

---

### 字体子集

#### `createSubset(inputPath, outputPath, options?)`
创建字体子集。

**参数:**
- `inputPath` (string): 输入文件路径
- `outputPath` (string): 输出文件路径
- `options` (SubsetOptions): 子集选项
  - `characters` (string): 要提取的字符
  - `characterFile` (string): 字符文件路径
  - `preserveKerning` (boolean): 保留字距调整
  - `optimize` (boolean): 优化输出

**返回:** `Promise<{ originalSize, subsetSize, reduction, characterCount }>`

#### `createWebOptimizedSubset(inputPath, outputDir, language?)`
为网页创建优化的字体子集。

**参数:**
- `inputPath` (string): 输入文件路径
- `outputDir` (string): 输出目录
- `language` ('zh' | 'en' | 'ja' | 'ko'): 目标语言

**返回:** `Promise<string>` (输出文件路径)

---

### 字体分析

#### `analyzeFontRanges(fontPath)`
分析字体支持的字符范围。

**参数:**
- `fontPath` (string): 字体文件路径

**返回:** `Promise<{ totalGlyphs, unicodeRanges, scripts, hasChinese, hasJapanese, hasKorean, hasEmoji }>`

#### `validateFont(fontPath)`
验证字体文件完整性。

**参数:**
- `fontPath` (string): 字体文件路径

**返回:** `Promise<{ valid, errors, warnings }>`

---

### 工具函数

#### `getFontFileInfo(fontPath)`
获取字体文件基本信息。

**返回:**
```typescript
{
  path: string;      // 绝对路径
  size: number;      // 文件大小 (bytes)
  format: string;    // 格式名称
  modified: Date;    // 修改时间
}
```

---

## 💡 使用场景

### 场景 1: 网页字体优化

```typescript
// 为中文字站创建优化字体
const commonChars = '的是一不了人在有中到大这为主生国以会经要时到用后而然家么她他个们多';

await createSubset('./fonts/NotoSansSC-Regular.ttf', './web/fonts/chinese.woff2', {
  characters: commonChars,
  optimize: true
});

// 原始文件：4.5 MB
// 子集文件：~50 KB (压缩率 99%)
```

### 场景 2: 多格式支持

```typescript
// 为不同浏览器准备多种格式
await batchConvert('./fonts/myfont.ttf', './dist/fonts', [
  'woff2',  // 现代浏览器
  'woff',   // 旧版浏览器
  'ttf'     // 备用
]);
```

### 场景 3: 字体兼容性检查

```typescript
// 验证字体文件
const validation = await validateFont('./fonts/custom.ttf');

if (!validation.valid) {
  console.error('字体文件有问题:');
  validation.errors.forEach(e => console.error(`  - ${e}`));
}

// 分析字符支持
const ranges = await analyzeFontRanges('./fonts/custom.ttf');
console.log(`支持中文：${ranges.hasChinese ? '✓' : '✗'}`);
console.log(`支持 Emoji: ${ranges.hasEmoji ? '✓' : '✗'}`);
```

---

## 🔧 运行示例

```bash
# 运行完整示例
uv run tsx src/skills/font-utils-skill.examples.ts
```

---

## ⚠️ 注意事项

1. **依赖安装**: 必须先安装 `fonttools` 和 `brotli`
2. **文件格式**: 支持 TTF, OTF, WOFF, WOFF2
3. **中文字体**: 中文字体文件较大，建议使用子集功能
4. **性能**: 大字体文件处理可能需要数秒

---

## 📊 性能参考

| 操作 | 输入大小 | 输出大小 | 耗时 |
|------|---------|---------|------|
| TTF → WOFF2 | 4.5 MB | 1.8 MB | ~2s |
| 全量 → 子集 (100 字) | 4.5 MB | 50 KB | ~3s |
| 批量转换 (3 格式) | 4.5 MB | 3.2 MB | ~5s |

---

## 📝 更新日志

- **v1.0.0** (2026-03-13): 初始版本
  - ✅ 字体加载
  - ✅ 格式转换
  - ✅ 子集生成
  - ✅ 字体分析
  - ✅ 完整性验证

---

## 🤝 贡献

遇到问题或需要新功能？请提交 Issue 或 PR。
