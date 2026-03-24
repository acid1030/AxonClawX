# 🎨 颜色工具技能使用示例

**文件:** `color-utils-skill.examples.md`  
**作者:** Axon (NOVA)  
**版本:** 1.0.0

---

## 📦 导入技能

```typescript
import colorUtils, { 
  convertColor, 
  mixColors, 
  generatePalette,
  hexToRGB,
  rgbToHSL,
  getContrastRatio,
  lighten,
  darken
} from './skills/color-utils-skill';
```

---

## 1️⃣ 颜色格式转换

### 1.1 完整转换 (推荐)

```typescript
// 将任意格式转换为所有格式
const result = convertColor('#6366f1');

console.log(result);
// 输出:
// {
//   hex: '#6366f1',
//   rgb: { r: 99, g: 102, b: 241, a: undefined },
//   hsl: { h: 239, s: 84%, l: 67%, a: undefined },
//   css: {
//     hex: '#6366f1',
//     rgb: 'rgb(99, 102, 241)',
//     hsl: 'hsl(239, 84%, 67%)'
//   }
// }

// 支持 RGB 输入
const fromRGB = convertColor({ r: 255, g: 99, b: 132 });
console.log(fromRGB.hex); // '#ff6384'

// 支持 HSL 输入
const fromHSL = convertColor({ h: 120, s: 100, l: 50 });
console.log(fromHSL.hex); // '#00ff00'
```

### 1.2 单独转换函数

```typescript
// HEX → RGB
const rgb = hexToRGB('#3498db');
console.log(rgb); // { r: 52, g: 152, b: 219 }

// RGB → HEX
const hex = rgbToHEX({ r: 46, g: 204, b: 113 });
console.log(hex); // '#2ecc71'

// RGB → HSL
const hsl = rgbToHSL({ r: 155, g: 89, b: 182 });
console.log(hsl); // { h: 283, s: 39, l: 53 }

// HSL → RGB
const rgb2 = hslToRGB({ h: 200, s: 100, l: 50 });
console.log(rgb2); // { r: 0, g: 191, b: 255 }

// HEX → HSL
const hsl2 = hexToHSL('#e74c3c');
console.log(hsl2); // { h: 6, s: 78, l: 57 }
```

### 1.3 带透明度的颜色

```typescript
// 8 位 HEX (带 Alpha)
const rgba = hexToRGB('#6366f180');
console.log(rgba); 
// { r: 99, g: 102, b: 241, a: 0.5 }

// 转换时保留透明度
const full = convertColor({ r: 255, g: 0, b: 0, a: 0.8 });
console.log(full.css.rgba); // 'rgba(255, 0, 0, 0.8)'
console.log(full.css.hsla); // 'hsla(0, 100%, 50%, 0.8)'
```

---

## 2️⃣ 颜色混合

### 2.1 线性混合 (默认)

```typescript
// 50% 混合蓝色和红色
const mixed = mixColors({
  color1: '#3498db', // 蓝色
  color2: '#e74c3c', // 红色
  ratio: 0.5         // 50% 混合
});

console.log(mixed); // '#9d627d' (紫灰色)

// 25% 混合 (更多 color1)
const mixed2 = mixColors({
  color1: '#ffffff', // 白色
  color2: '#000000', // 黑色
  ratio: 0.25
});

console.log(mixed2); // '#c0c0c0' (浅灰)
```

### 2.2 混合模式

```typescript
// 乘法混合 (变暗)
const multiply = mixColors({
  color1: '#ff6b6b',
  color2: '#4ecdc4',
  ratio: 0.7,
  mode: 'multiply'
});

// 滤色混合 (变亮)
const screen = mixColors({
  color1: '#1a1a2e',
  color2: '#e94560',
  ratio: 0.5,
  mode: 'screen'
});

// 叠加混合 (增强对比)
const overlay = mixColors({
  color1: '#f39c12',
  color2: '#8e44ad',
  ratio: 0.6,
  mode: 'overlay'
});
```

### 2.3 实际应用场景

```typescript
// 生成悬停状态颜色
const baseColor = '#6366f1';
const hoverColor = mixColors({
  color1: baseColor,
  color2: '#ffffff',
  ratio: 0.2 // 20% 白色，使颜色变浅
});

// 生成禁用状态颜色
const disabledColor = mixColors({
  color1: baseColor,
  color2: '#808080',
  ratio: 0.5 // 50% 灰色，使颜色变灰
});

// 渐变中间色
const gradientMiddle = mixColors({
  color1: '#f093fb',
  color2: '#f5576c',
  ratio: 0.5
});
```

---

## 3️⃣ 调色板生成

### 3.1 单色调色板 (Monochromatic)

```typescript
const monoPalette = generatePalette({
  baseColor: '#6366f1',
  type: 'monochromatic',
  count: 5,
  variation: 40 // 亮度变化范围
});

console.log(monoPalette);
// ['#3f3fbf', '#5151d8', '#6366f1', '#7a7fff', '#9299ff']
// 从深到浅的蓝色系
```

**使用场景:** 创建统一、和谐的设计系统

### 3.2 互补色调色板 (Complementary)

```typescript
const compPalette = generatePalette({
  baseColor: '#e74c3c', // 红色
  type: 'complementary',
  count: 4
});

console.log(compPalette);
// ['#e74c3c', '#3ce7e5', '#c0392b', '#2bc9c7']
// 红色 + 青绿色对比
```

**使用场景:** 创建强烈对比，吸引注意力

### 3.3 类似色调色板 (Analogous)

```typescript
const analogPalette = generatePalette({
  baseColor: '#2ecc71', // 绿色
  type: 'analogous',
  count: 5
});

console.log(analogPalette);
// ['#2ecc71', '#2ee752', '#2ebd8f', '#2ea35e', '#2e8f4a']
// 绿色周围的相邻色
```

**使用场景:** 自然、和谐的配色方案

### 3.4 三色调色板 (Triadic)

```typescript
const triadicPalette = generatePalette({
  baseColor: '#3498db', // 蓝色
  type: 'triadic',
  count: 6
});

console.log(triadicPalette);
// ['#3498db', '#db3498', '#98db34', '#2a7ab8', '#b82a7a', '#7ab82a']
// 等边三角形配色
```

**使用场景:** 平衡而丰富的色彩组合

### 3.5 四分色调色板 (Tetradic)

```typescript
const tetradicPalette = generatePalette({
  baseColor: '#f39c12', // 橙色
  type: 'tetradic',
  count: 8
});

console.log(tetradicPalette);
// ['#f39c12', '#12f39c', '#126cf3', '#9c12f3', ...]
// 矩形配色，四种颜色
```

**使用场景:** 复杂、多样的设计

### 3.6 分裂互补色 (Split-Complementary)

```typescript
const splitPalette = generatePalette({
  baseColor: '#9b59b6', // 紫色
  type: 'split-complementary',
  count: 5
});

console.log(splitPalette);
// ['#9b59b6', '#59b68a', '#5986b6', '#7a3d91', '#3d916f']
// 紫色 + 两个相邻的互补色
```

**使用场景:** 对比强烈但比互补色更柔和

---

## 4️⃣ 便捷函数

### 4.1 亮度相关

```typescript
// 获取颜色亮度 (0-1)
const lum = getLuminance('#6366f1');
console.log(lum); // 0.28...

// 判断颜色深浅
console.log(isDark('#000000')); // true
console.log(isDark('#ffffff')); // false

// 自定义阈值
console.log(isDark('#808080', 0.6)); // true (更宽松的阈值)
```

### 4.2 对比度计算 (WCAG)

```typescript
// 计算对比度比例
const ratio = getContrastRatio('#ffffff', '#000000');
console.log(ratio); // 21 (最大对比度)

// 检查是否符合 WCAG AA 标准 (至少 4.5:1)
const isAccessible = ratio >= 4.5;
console.log(isAccessible); // true

// 实际案例
const textOnBackground = getContrastRatio('#333333', '#f5f5f5');
console.log(textOnBackground >= 4.5); // true (可通过)
```

### 4.3 颜色调整

```typescript
const baseColor = '#6366f1';

// 变亮
console.log(lighten(baseColor, 10));  // '#7a7dff'
console.log(lighten(baseColor, 20));  // '#9299ff'

// 变暗
console.log(darken(baseColor, 10));   // '#4c4fc4'
console.log(darken(baseColor, 20));   // '#353797'

// 增加饱和度
console.log(saturate(baseColor, 20)); // '#5558f5'

// 降低饱和度
console.log(desaturate(baseColor, 20)); // '#6e71e6'

// 完全灰度
console.log(grayscale(baseColor));    // '#808080'
```

### 4.4 实际应用：动态主题

```typescript
// 生成完整的主题色系
function generateTheme(baseColor: string) {
  return {
    primary: baseColor,
    primaryLight: lighten(baseColor, 15),
    primaryDark: darken(baseColor, 15),
    primaryMuted: desaturate(baseColor, 30),
    
    // 生成互补色作为强调色
    accent: generatePalette({
      baseColor,
      type: 'complementary',
      count: 2
    })[1],
    
    // 背景色
    background: lighten(baseColor, 45),
    surface: lighten(baseColor, 35),
    
    // 文字颜色 (根据亮度自动选择)
    text: isDark(baseColor) ? '#ffffff' : '#1a1a1a',
    textSecondary: isDark(baseColor) ? '#cccccc' : '#4a4a4a',
  };
}

const theme = generateTheme('#6366f1');
console.log(theme);
```

---

## 5️⃣ 完整示例项目

### 5.1 React 组件中的使用

```tsx
import React from 'react';
import { convertColor, mixColors, generatePalette } from './skills/color-utils-skill';

interface ColorCardProps {
  color: string;
}

const ColorCard: React.FC<ColorCardProps> = ({ color }) => {
  const converted = convertColor(color);
  const palette = generatePalette({
    baseColor: color,
    type: 'monochromatic',
    count: 5
  });
  
  return (
    <div className="color-card">
      <div 
        className="color-preview" 
        style={{ backgroundColor: converted.css.hex }}
      />
      
      <div className="color-info">
        <h3>{converted.css.hex}</h3>
        <p>RGB: {converted.css.rgb}</p>
        <p>HSL: {converted.css.hsl}</p>
      </div>
      
      <div className="palette">
        {palette.map((c, i) => (
          <div 
            key={i} 
            className="palette-swatch"
            style={{ backgroundColor: c }}
          />
        ))}
      </div>
    </div>
  );
};
```

### 5.2 主题切换器

```typescript
import { generatePalette, isDark, getContrastRatio } from './skills/color-utils-skill';

class ThemeManager {
  private baseColor: string;
  
  constructor(baseColor: string) {
    this.baseColor = baseColor;
  }
  
  generateLightTheme() {
    const palette = generatePalette({
      baseColor: this.baseColor,
      type: 'analogous',
      count: 5
    });
    
    return {
      primary: palette[2],
      secondary: palette[1],
      accent: palette[3],
      background: '#ffffff',
      surface: '#f8f9fa',
      text: isDark(this.baseColor) ? '#ffffff' : '#1a1a1a',
      textMuted: '#6c757d',
    };
  }
  
  generateDarkTheme() {
    const palette = generatePalette({
      baseColor: this.baseColor,
      type: 'monochromatic',
      count: 5,
      variation: 30
    });
    
    return {
      primary: palette[3],
      secondary: palette[2],
      accent: palette[4],
      background: '#1a1a2e',
      surface: '#16213e',
      text: '#ffffff',
      textMuted: '#a0a0a0',
    };
  }
  
  validateAccessibility(theme: any): boolean {
    const textContrast = getContrastRatio(theme.text, theme.background);
    const primaryContrast = getContrastRatio(theme.primary, theme.background);
    
    return textContrast >= 4.5 && primaryContrast >= 3;
  }
}

// 使用示例
const themeManager = new ThemeManager('#6366f1');
const lightTheme = themeManager.generateLightTheme();
const darkTheme = themeManager.generateDarkTheme();

console.log('Light theme accessible:', themeManager.validateAccessibility(lightTheme));
console.log('Dark theme accessible:', themeManager.validateAccessibility(darkTheme));
```

### 5.3 渐变生成器

```typescript
import { mixColors } from './skills/color-utils-skill';

function generateGradient(
  startColor: string,
  endColor: string,
  steps: number = 10
): string[] {
  const gradient: string[] = [];
  
  for (let i = 0; i <= steps; i++) {
    const ratio = i / steps;
    const color = mixColors({
      color1: startColor,
      color2: endColor,
      ratio
    });
    gradient.push(color);
  }
  
  return gradient;
}

// 使用示例
const gradient = generateGradient('#f093fb', '#f5576c', 5);
console.log(gradient);
// ['#f093fb', '#f189e8', '#f27fd6', '#f375c3', '#f46bb1', '#f5576c']

// CSS 输出
const cssGradient = `linear-gradient(135deg, ${gradient.join(', ')})`;
console.log(cssGradient);
```

---

## 6️⃣ 性能提示

```typescript
// ✅ 好的做法：缓存转换结果
const colorCache = new Map<string, ColorConversion>();

function getCachedConversion(color: string): ColorConversion {
  if (!colorCache.has(color)) {
    colorCache.set(color, convertColor(color));
  }
  return colorCache.get(color)!;
}

// ✅ 好的做法：批量生成调色板
const palettes = ['#6366f1', '#e74c3c', '#2ecc71'].map(color =>
  generatePalette({ baseColor: color, type: 'complementary', count: 4 })
);

// ❌ 避免：重复转换同一颜色
for (let i = 0; i < 1000; i++) {
  const rgb = hexToRGB('#6366f1'); // 重复计算
}
```

---

## 7️⃣ 错误处理

```typescript
try {
  // 无效 HEX
  hexToRGB('#invalid');
} catch (error) {
  console.error(error.message); // "无效的 HEX 颜色：#invalid"
}

try {
  // 无效 RGB
  rgbToHEX({ r: 300, g: -10, b: 50 });
} catch (error) {
  console.error(error.message); // "无效的 RGB 颜色：..."
}

try {
  // 无效混合比例
  mixColors({
    color1: '#ff0000',
    color2: '#00ff00',
    ratio: 1.5 // 超出 0-1 范围
  });
} catch (error) {
  console.error(error.message); // "混合比例必须在 0-1 之间"
}
```

---

## 📊 API 速查表

| 函数 | 输入 | 输出 | 描述 |
|------|------|------|------|
| `convertColor` | HEX/RGB/HSL | ColorConversion | 完整格式转换 |
| `hexToRGB` | HEX | RGB | HEX → RGB |
| `rgbToHEX` | RGB | HEX | RGB → HEX |
| `rgbToHSL` | RGB | HSL | RGB → HSL |
| `hslToRGB` | HSL | RGB | HSL → RGB |
| `mixColors` | MixConfig | HEX | 颜色混合 |
| `generatePalette` | PaletteConfig | HEX[] | 生成调色板 |
| `getLuminance` | Color | number | 获取亮度 |
| `isDark` | Color | boolean | 判断深浅 |
| `getContrastRatio` | Color, Color | number | 对比度 |
| `lighten` | Color, number | HEX | 变亮 |
| `darken` | Color, number | HEX | 变暗 |
| `saturate` | Color, number | HEX | 增饱和 |
| `desaturate` | Color, number | HEX | 降饱和 |
| `grayscale` | Color | HEX | 灰度化 |

---

**完成时间:** < 8 分钟  
**技能文件:** `src/skills/color-utils-skill.ts`  
**示例文件:** `src/skills/color-utils-skill.examples.md`
