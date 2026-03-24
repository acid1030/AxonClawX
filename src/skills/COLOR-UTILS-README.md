# 🎨 颜色工具技能 (Color Utils)

KAEL 颜色空间转换工具 - 提供完整的颜色格式转换、混合和调色板生成功能。

## 📦 功能概览

### 1. 颜色格式转换
- ✅ HEX ↔ RGB ↔ HSL ↔ HSV 互转
- ✅ 支持 RGBA/HSLA 透明度
- ✅ 通用颜色解析器
- ✅ 颜色格式验证

### 2. 颜色混合
- ✅ 线性插值混合 (Lerp)
- ✅ 8 种混合模式 (Normal, Multiply, Screen, Overlay 等)
- ✅ 多颜色加权混合
- ✅ 透明度混合

### 3. 调色板生成
- ✅ 单色调色板 (Monochromatic)
- ✅ 互补色 (Complementary)
- ✅ 三元色 (Triadic)
- ✅ 分裂互补色 (Split Complementary)
- ✅ 类似色 (Analogous)
- ✅ 渐变色 (Gradient)

### 4. 颜色操作
- ✅ 亮度调整 (Lighten/Darken)
- ✅ 饱和度调整
- ✅ 色相旋转
- ✅ 透明度设置
- ✅ WCAG 对比度计算
- ✅ 文字颜色自动选择

## 🚀 快速开始

```typescript
import {
  parseColor,
  rgbToHex,
  rgbToHsl,
  lerpColor,
  generateComplementary,
  lighten,
  getContrastRatio
} from './color-utils-skill';

// 1. 颜色解析
const color = parseColor('#3B82F6');
// { r: 59, g: 130, b: 246, a: 1 }

// 2. 格式转换
rgbToHex({ r: 59, g: 130, b: 246 });        // '#3b82f6'
rgbToHsl({ r: 59, g: 130, b: 246 });        // { h: 217, s: 91, l: 60 }
hslToHex({ h: 217, s: 91, l: 60 });         // '#3b82f6'

// 3. 颜色混合
lerpColor('#3B82F6', '#EF4444', 0.5);       // 50% 混合
blendColors('#EF4444', '#3B82F6', 'multiply', 0.8);  // 正片叠底

// 4. 生成调色板
generateComplementary('#3B82F6');           // 互补色
generateTriadic('#3B82F6');                 // 三元色
generateGradient('#3B82F6', '#EF4444', 5);  // 5 步渐变

// 5. 颜色调整
lighten('#3B82F6', 20);                     // 变亮 20%
darken('#3B82F6', 20);                      // 变暗 20%
adjustHue('#3B82F6', 30);                   // 旋转 30°

// 6. 可访问性
getContrastRatio('#333', '#FFF');           // 对比度：12.63:1
getTextColorForBackground('#F0F0F0');       // '#000000'
```

## 📖 API 参考

### 颜色解析

| 函数 | 描述 | 示例 |
|------|------|------|
| `parseHEX(hex)` | 解析 HEX 颜色 | `parseHEX('#3B82F6')` |
| `parseRGB(str)` | 解析 RGB/RGBA | `parseRGB('rgb(59,130,246)')` |
| `parseHSL(str)` | 解析 HSL/HSLA | `parseHSL('hsl(217,91%,60%)')` |
| `parseColor(color)` | 通用解析器 | `parseColor('#3B82F6')` |
| `isValidColor(color)` | 验证颜色 | `isValidColor('#3B82F6')` |

### 颜色转换

| 函数 | 描述 | 示例 |
|------|------|------|
| `rgbToHex(rgb)` | RGB → HEX | `rgbToHex({r:59,g:130,b:246})` |
| `rgbToHsl(rgb)` | RGB → HSL | `rgbToHsl({r:59,g:130,b:246})` |
| `rgbToHsv(rgb)` | RGB → HSV | `rgbToHsv({r:59,g:130,b:246})` |
| `hslToRgb(hsl)` | HSL → RGB | `hslToRgb({h:217,s:91,l:60})` |
| `hsvToRgb(hsv)` | HSV → RGB | `hsvToRgb({h:217,s:76,v:96})` |
| `hslToHex(hsl)` | HSL → HEX | `hslToHex({h:217,s:91,l:60})` |
| `hexToHsl(hex)` | HEX → HSL | `hexToHsl('#3B82F6')` |

### 颜色混合

| 函数 | 描述 | 示例 |
|------|------|------|
| `lerpColor(c1, c2, factor)` | 线性插值 (0-1) | `lerpColor('#3B82F6', '#EF4444', 0.5)` |
| `blendColors(c1, c2, mode, opacity)` | 混合模式 | `blendColors('#EF4444', '#3B82F6', 'multiply')` |
| `mixColors(colors, weights)` | 多颜色混合 | `mixColors(['#F00','#0F0','#00F'], [0.6,0.3,0.1])` |

**支持的混合模式:**
- `normal` - 正常
- `multiply` - 正片叠底
- `screen` - 滤色
- `overlay` - 叠加
- `darken` - 变暗
- `lighten` - 变亮
- `average` - 平均
- `difference` - 差值

### 调色板生成

| 函数 | 描述 | 示例 |
|------|------|------|
| `generateMonochromatic(color, count, range)` | 单色 | `generateMonochromatic('#3B82F6', 5)` |
| `generateComplementary(color)` | 互补色 | `generateComplementary('#3B82F6')` |
| `generateTriadic(color)` | 三元色 | `generateTriadic('#3B82F6')` |
| `generateSplitComplementary(color)` | 分裂互补 | `generateSplitComplementary('#3B82F6')` |
| `generateAnalogous(color, count, angle)` | 类似色 | `generateAnalogous('#3B82F6', 5, 30)` |
| `generateGradient(start, end, steps)` | 渐变 | `generateGradient('#3B82F6', '#EF4444', 5)` |

### 颜色操作

| 函数 | 描述 | 示例 |
|------|------|------|
| `adjustLightness(color, amount)` | 调整亮度 (-100~100) | `adjustLightness('#3B82F6', 20)` |
| `adjustSaturation(color, amount)` | 调整饱和度 (-100~100) | `adjustSaturation('#3B82F6', -30)` |
| `adjustHue(color, amount)` | 调整色相 (0-360) | `adjustHue('#3B82F6', 180)` |
| `lighten(color, percent)` | 变亮 | `lighten('#3B82F6', 20)` |
| `darken(color, percent)` | 变暗 | `darken('#3B82F6', 20)` |
| `withAlpha(color, alpha)` | 设置透明度 | `withAlpha('#3B82F6', 0.5)` |

### 工具函数

| 函数 | 描述 | 示例 |
|------|------|------|
| `getContrastRatio(c1, c2)` | WCAG 对比度 | `getContrastRatio('#333', '#FFF')` |
| `isLightColor(color)` | 判断浅色 | `isLightColor('#F0F0F0')` |
| `getTextColorForBackground(bg)` | 文字颜色建议 | `getTextColorForBackground('#FFF')` |
| `randomColor(sat, light)` | 随机颜色 | `randomColor([50,100], [40,70])` |
| `formatColor(color, format)` | 格式化输出 | `formatColor(rgba, 'hsl')` |

## 💡 实际应用场景

### 1. 设计系统颜色生成

```typescript
const primary = '#6366F1';

// 生成主色系
const primaryScale = generateMonochromatic(primary, 5, [30, 90]);
// 输出：5 个不同亮度的靛蓝色

// 生成强调色
const [accent] = generateComplementary(primary);
// 输出：互补的黄色调

// 生成按钮状态
const buttonColors = {
  default: primary,
  hover: lighten(primary, 10),
  active: darken(primary, 10),
  disabled: withAlpha(primary, 0.5)
};
```

### 2. 图表配色方案

```typescript
// 三元色方案 - 适合 3 个数据系列
const chartColors = generateTriadic('#3B82F6');
// ['#3B82F6', '#F63B82', '#82F63B']

// 类似色方案 - 和谐渐变
const analogousColors = generateAnalogous('#3B82F6', 5, 30);
```

### 3. 可访问性检查

```typescript
// 检查文字和背景对比度
const contrast = getContrastRatio('#757575', '#FFFFFF');
if (contrast >= 4.5) {
  console.log('✓ 符合 WCAG AA 标准');
}
if (contrast >= 7) {
  console.log('✓ 符合 WCAG AAA 标准');
}

// 自动选择文字颜色
const textColor = getTextColorForBackground('#F5F5F5');
// 输出：'#000000' (黑色文字)
```

### 4. 暗黑模式适配

```typescript
function adaptForDarkMode(lightColor: string) {
  // 暗黑模式下降低亮度
  const darkColor = darken(lightColor, 20);
  // 增加饱和度以保持视觉冲击
  const vibrantColor = adjustSaturation(darkColor, 10);
  return vibrantColor;
}
```

### 5. 阴影生成

```typescript
const shadowColor = '#3B82F6';

const shadows = {
  sm: withAlpha(darken(shadowColor, 20), 0.1),
  md: withAlpha(darken(shadowColor, 20), 0.2),
  lg: withAlpha(darken(shadowColor, 20), 0.3),
  xl: withAlpha(darken(shadowColor, 20), 0.4)
};
```

## 🎯 性能特点

- ✅ **零依赖** - 纯 TypeScript 实现，无需外部库
- ✅ **类型安全** - 完整的 TypeScript 类型定义
- ✅ **高性能** - 优化的颜色计算算法
- ✅ **Tree-shakable** - 按需导入，减小打包体积

## 📝 注意事项

1. **颜色格式**: 所有 HEX 颜色输出为小写 (如 `#3b82f6`)
2. **数值范围**: 
   - RGB: 0-255
   - HSL: H(0-360), S(0-100), L(0-100)
   - Alpha: 0-1
3. **色相环绕**: 色相调整自动处理 360° 环绕
4. **边界处理**: 所有调整函数自动限制在有效范围内

## 🔗 相关文件

- 主文件：`src/skills/color-utils-skill.ts`
- 示例：`src/skills/color-utils-skill.examples.ts`
- 文档：`src/skills/COLOR-UTILS-README.md`

---

**创建时间:** 2026-03-13  
**版本:** 1.0.0  
**作者:** KAEL
