/**
 * 颜色工具技能
 * 
 * 功能:
 * 1. 颜色格式转换 (HEX, RGB, HSL, HSV)
 * 2. 颜色混合 (线性插值、叠加、正片叠底)
 * 3. 调色板生成 (单色、互补、三元、分裂互补)
 * 
 * @module skills/color-utils
 */

// ==================== 类型定义 ====================

/** RGB 颜色对象 */
export interface RGB {
  r: number; // 0-255
  g: number; // 0-255
  b: number; // 0-255
}

/** RGBA 颜色对象 */
export interface RGBA extends RGB {
  a: number; // 0-1
}

/** HSL 颜色对象 */
export interface HSL {
  h: number; // 0-360
  s: number; // 0-100
  l: number; // 0-100
}

/** HSLA 颜色对象 */
export interface HSLA extends HSL {
  a: number; // 0-1
}

/** HSV 颜色对象 */
export interface HSV {
  h: number; // 0-360
  s: number; // 0-100
  v: number; // 0-100
}

/** 颜色混合模式 */
export type BlendMode = 
  | 'normal'      // 正常
  | 'multiply'    // 正片叠底
  | 'screen'      // 滤色
  | 'overlay'     // 叠加
  | 'darken'      // 变暗
  | 'lighten'     // 变亮
  | 'average'     // 平均
  | 'difference'; // 差值

// ==================== 颜色解析 ====================

/**
 * 解析 HEX 颜色
 * @param hex - HEX 颜色字符串 (#RGB, #RRGGBB, #RRGGBBAA)
 * @returns RGBA 对象
 */
export function parseHEX(hex: string): RGBA {
  hex = hex.replace(/^#/, '');
  
  if (hex.length === 3) {
    const r = parseInt(hex[0] + hex[0], 16);
    const g = parseInt(hex[1] + hex[1], 16);
    const b = parseInt(hex[2] + hex[2], 16);
    return { r, g, b, a: 1 };
  }
  
  if (hex.length === 4) {
    const r = parseInt(hex[0] + hex[0], 16);
    const g = parseInt(hex[1] + hex[1], 16);
    const b = parseInt(hex[2] + hex[2], 16);
    const a = parseInt(hex[3] + hex[3], 16) / 255;
    return { r, g, b, a };
  }
  
  if (hex.length === 6) {
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    return { r, g, b, a: 1 };
  }
  
  if (hex.length === 8) {
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    const a = parseInt(hex.slice(6, 8), 16) / 255;
    return { r, g, b, a };
  }
  
  throw new Error(`Invalid HEX color: ${hex}`);
}

/**
 * 解析 RGB/RGBA 字符串
 * @param str - RGB/RGBA 字符串 (rgb(255,0,0) 或 rgba(255,0,0,0.5))
 * @returns RGBA 对象
 */
export function parseRGB(str: string): RGBA {
  const match = str.match(/rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+))?\s*\)/i);
  if (!match) {
    throw new Error(`Invalid RGB color: ${str}`);
  }
  
  return {
    r: parseInt(match[1]),
    g: parseInt(match[2]),
    b: parseInt(match[3]),
    a: match[4] !== undefined ? parseFloat(match[4]) : 1
  };
}

/**
 * 解析 HSL/HSLA 字符串
 * @param str - HSL/HSLA 字符串
 * @returns HSLA 对象
 */
export function parseHSL(str: string): HSLA {
  const match = str.match(/hsla?\s*\(\s*([\d.]+)\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%\s*(?:,\s*([\d.]+))?\s*\)/i);
  if (!match) {
    throw new Error(`Invalid HSL color: ${str}`);
  }
  
  return {
    h: parseFloat(match[1]),
    s: parseFloat(match[2]),
    l: parseFloat(match[3]),
    a: match[4] !== undefined ? parseFloat(match[4]) : 1
  };
}

/**
 * 通用颜色解析器
 * @param color - 任意格式的颜色字符串
 * @returns RGBA 对象
 */
export function parseColor(color: string): RGBA {
  color = color.trim().toLowerCase();
  
  if (color.startsWith('#')) {
    return parseHEX(color);
  }
  
  if (color.startsWith('rgb')) {
    return parseRGB(color);
  }
  
  if (color.startsWith('hsl')) {
    const hsla = parseHSL(color);
    const rgb = hslToRgb(hsla);
    return { ...rgb, a: hsla.a };
  }
  
  throw new Error(`Unsupported color format: ${color}`);
}

// ==================== 颜色转换 ====================

/**
 * RGB 转 HEX
 * @param rgb - RGB 对象
 * @param includeAlpha - 是否包含 Alpha 通道
 * @returns HEX 字符串
 */
export function rgbToHex(rgb: RGB | RGBA, includeAlpha: boolean = false): string {
  const toHex = (n: number) => n.toString(16).padStart(2, '0');
  let hex = `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`;
  
  if (includeAlpha && 'a' in rgb) {
    hex += toHex(Math.round(rgb.a * 255));
  }
  
  return hex;
}

/**
 * RGB 转 HSL
 * @param rgb - RGB 对象
 * @returns HSL 对象
 */
export function rgbToHsl(rgb: RGB): HSL {
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  
  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100)
  };
}

/**
 * RGB 转 HSV
 * @param rgb - RGB 对象
 * @returns HSV 对象
 */
export function rgbToHsv(rgb: RGB): HSV {
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const v = max;
  const d = max - min;
  let h = 0;
  const s = max === 0 ? 0 : d / max;
  
  if (max !== min) {
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  
  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    v: Math.round(v * 100)
  };
}

/**
 * HSL 转 RGB
 * @param hsl - HSL 对象
 * @returns RGB 对象
 */
export function hslToRgb(hsl: HSL): RGB {
  const h = hsl.h / 360;
  const s = hsl.s / 100;
  const l = hsl.l / 100;
  
  if (s === 0) {
    const val = Math.round(l * 255);
    return { r: val, g: val, b: val };
  }
  
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1/6) return p + (q - p) * 6 * t;
    if (t < 1/2) return q;
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
    return p;
  };
  
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  
  return {
    r: Math.round(hue2rgb(p, q, h + 1/3) * 255),
    g: Math.round(hue2rgb(p, q, h) * 255),
    b: Math.round(hue2rgb(p, q, h - 1/3) * 255)
  };
}

/**
 * HSV 转 RGB
 * @param hsv - HSV 对象
 * @returns RGB 对象
 */
export function hsvToRgb(hsv: HSV): RGB {
  const h = hsv.h / 360;
  const s = hsv.s / 100;
  const v = hsv.v / 100;
  
  const i = Math.floor(h * 6);
  const f = h * 6 - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);
  
  let r = 0, g = 0, b = 0;
  switch (i % 6) {
    case 0: r = v; g = t; b = p; break;
    case 1: r = q; g = v; b = p; break;
    case 2: r = p; g = v; b = t; break;
    case 3: r = p; g = q; b = v; break;
    case 4: r = t; g = p; b = v; break;
    case 5: r = v; g = p; b = q; break;
  }
  
  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255)
  };
}

/**
 * HSL 转 HEX
 * @param hsl - HSL 对象
 * @returns HEX 字符串
 */
export function hslToHex(hsl: HSL): string {
  return rgbToHex(hslToRgb(hsl));
}

/**
 * HEX 转 HSL
 * @param hex - HEX 字符串
 * @returns HSL 对象
 */
export function hexToHsl(hex: string): HSL {
  return rgbToHsl(parseHEX(hex));
}

// ==================== 颜色混合 ====================

/**
 * 线性插值混合两个颜色
 * @param color1 - 颜色 1
 * @param color2 - 颜色 2
 * @param factor - 混合因子 (0-1)，0 为 color1，1 为 color2
 * @returns 混合后的 RGBA 颜色
 */
export function lerpColor(color1: string, color2: string, factor: number): RGBA {
  factor = Math.max(0, Math.min(1, factor));
  
  const c1 = parseColor(color1);
  const c2 = parseColor(color2);
  
  return {
    r: Math.round(c1.r + (c2.r - c1.r) * factor),
    g: Math.round(c1.g + (c2.g - c1.g) * factor),
    b: Math.round(c1.b + (c2.b - c1.b) * factor),
    a: c1.a + (c2.a - c1.a) * factor
  };
}

/**
 * 根据混合模式混合两个颜色
 * @param color1 - 底层颜色
 * @param color2 - 顶层颜色
 * @param mode - 混合模式
 * @param opacity - 不透明度 (0-1)
 * @returns 混合后的 RGBA 颜色
 */
export function blendColors(
  color1: string,
  color2: string,
  mode: BlendMode = 'normal',
  opacity: number = 1
): RGBA {
  const c1 = parseColor(color1);
  const c2 = parseColor(color2);
  
  const blend = (v1: number, v2: number, mode: BlendMode): number => {
    v1 = v1 / 255;
    v2 = v2 / 255;
    let result = 0;
    
    switch (mode) {
      case 'normal':
        result = v2;
        break;
      case 'multiply':
        result = v1 * v2;
        break;
      case 'screen':
        result = 1 - (1 - v1) * (1 - v2);
        break;
      case 'overlay':
        result = v1 < 0.5 ? 2 * v1 * v2 : 1 - 2 * (1 - v1) * (1 - v2);
        break;
      case 'darken':
        result = Math.min(v1, v2);
        break;
      case 'lighten':
        result = Math.max(v1, v2);
        break;
      case 'average':
        result = (v1 + v2) / 2;
        break;
      case 'difference':
        result = Math.abs(v1 - v2);
        break;
    }
    
    return Math.round(result * 255);
  };
  
  const alpha = c2.a * opacity;
  
  return {
    r: Math.round(c1.r * (1 - alpha) + blend(c1.r, c2.r, mode) * alpha),
    g: Math.round(c1.g * (1 - alpha) + blend(c1.g, c2.g, mode) * alpha),
    b: Math.round(c1.b * (1 - alpha) + blend(c1.b, c2.b, mode) * alpha),
    a: Math.min(1, c1.a + alpha)
  };
}

/**
 * 混合多个颜色 (平均)
 * @param colors - 颜色数组
 * @param weights - 权重数组 (可选，默认等权重)
 * @returns 混合后的 RGBA 颜色
 */
export function mixColors(colors: string[], weights?: number[]): RGBA {
  if (colors.length === 0) {
    throw new Error('Colors array cannot be empty');
  }
  
  if (weights && weights.length !== colors.length) {
    throw new Error('Weights length must match colors length');
  }
  
  const w = weights || colors.map(() => 1 / colors.length);
  const totalWeight = w.reduce((a, b) => a + b, 0);
  
  const normalizedWeights = w.map(weight => weight / totalWeight);
  
  let r = 0, g = 0, b = 0, a = 0;
  
  colors.forEach((color, i) => {
    const c = parseColor(color);
    const weight = normalizedWeights[i];
    r += c.r * weight;
    g += c.g * weight;
    b += c.b * weight;
    a += c.a * weight;
  });
  
  return {
    r: Math.round(r),
    g: Math.round(g),
    b: Math.round(b),
    a: a / colors.length
  };
}

// ==================== 调色板生成 ====================

/**
 * 生成单色调色板
 * @param baseColor - 基础颜色
 * @param count - 生成的颜色数量
 * @param lightnessRange - 亮度范围 [min, max]
 * @returns 颜色数组 (HSL 格式)
 */
export function generateMonochromatic(
  baseColor: string,
  count: number = 5,
  lightnessRange: [number, number] = [20, 90]
): HSL[] {
  const hsl = rgbToHsl(parseColor(baseColor));
  const colors: HSL[] = [];
  
  for (let i = 0; i < count; i++) {
    const ratio = count === 1 ? 0.5 : i / (count - 1);
    const l = lightnessRange[0] + (lightnessRange[1] - lightnessRange[0]) * ratio;
    
    colors.push({
      h: hsl.h,
      s: hsl.s,
      l: Math.round(l)
    });
  }
  
  return colors;
}

/**
 * 生成互补色调色板
 * @param baseColor - 基础颜色
 * @returns 包含基础色和互补色的数组
 */
export function generateComplementary(baseColor: string): HSL[] {
  const hsl = rgbToHsl(parseColor(baseColor));
  
  return [
    hsl,
    {
      h: (hsl.h + 180) % 360,
      s: hsl.s,
      l: hsl.l
    }
  ];
}

/**
 * 生成三元色调色板
 * @param baseColor - 基础颜色
 * @returns 三个等距颜色的数组
 */
export function generateTriadic(baseColor: string): HSL[] {
  const hsl = rgbToHsl(parseColor(baseColor));
  
  return [
    hsl,
    {
      h: (hsl.h + 120) % 360,
      s: hsl.s,
      l: hsl.l
    },
    {
      h: (hsl.h + 240) % 360,
      s: hsl.s,
      l: hsl.l
    }
  ];
}

/**
 * 生成分裂互补色调色板
 * @param baseColor - 基础颜色
 * @returns 三个颜色的数组
 */
export function generateSplitComplementary(baseColor: string): HSL[] {
  const hsl = rgbToHsl(parseColor(baseColor));
  
  return [
    hsl,
    {
      h: (hsl.h + 150) % 360,
      s: hsl.s,
      l: hsl.l
    },
    {
      h: (hsl.h + 210) % 360,
      s: hsl.s,
      l: hsl.l
    }
  ];
}

/**
 * 生成类似色调色板
 * @param baseColor - 基础颜色
 * @param count - 生成的颜色数量 (3-5)
 * @param angle - 色相角度间隔 (默认 30 度)
 * @returns 颜色数组
 */
export function generateAnalogous(
  baseColor: string,
  count: number = 3,
  angle: number = 30
): HSL[] {
  const hsl = rgbToHsl(parseColor(baseColor));
  const colors: HSL[] = [];
  
  const startOffset = -Math.floor((count - 1) / 2) * angle;
  
  for (let i = 0; i < count; i++) {
    colors.push({
      h: (hsl.h + startOffset + i * angle + 360) % 360,
      s: hsl.s,
      l: hsl.l
    });
  }
  
  return colors;
}

/**
 * 生成渐变色
 * @param startColor - 起始颜色
 * @param endColor - 结束颜色
 * @param steps - 步数 (包含首尾)
 * @returns 颜色数组 (HEX 格式)
 */
export function generateGradient(
  startColor: string,
  endColor: string,
  steps: number = 5
): string[] {
  const colors: string[] = [];
  
  for (let i = 0; i < steps; i++) {
    const factor = steps === 1 ? 0.5 : i / (steps - 1);
    const color = lerpColor(startColor, endColor, factor);
    colors.push(rgbToHex(color));
  }
  
  return colors;
}

// ==================== 颜色操作 ====================

/**
 * 调整颜色亮度
 * @param color - 颜色
 * @param amount - 调整量 (-100 到 100)
 * @returns 调整后的 HEX 颜色
 */
export function adjustLightness(color: string, amount: number): string {
  const hsl = rgbToHsl(parseColor(color));
  hsl.l = Math.max(0, Math.min(100, hsl.l + amount));
  return hslToHex(hsl);
}

/**
 * 调整颜色饱和度
 * @param color - 颜色
 * @param amount - 调整量 (-100 到 100)
 * @returns 调整后的 HEX 颜色
 */
export function adjustSaturation(color: string, amount: number): string {
  const hsl = rgbToHsl(parseColor(color));
  hsl.s = Math.max(0, Math.min(100, hsl.s + amount));
  return hslToHex(hsl);
}

/**
 * 调整色相
 * @param color - 颜色
 * @param amount - 调整角度 (0-360)
 * @returns 调整后的 HEX 颜色
 */
export function adjustHue(color: string, amount: number): string {
  const hsl = rgbToHsl(parseColor(color));
  hsl.h = (hsl.h + amount + 360) % 360;
  return hslToHex(hsl);
}

/**
 * 使颜色变亮
 * @param color - 颜色
 * @param percentage - 百分比 (0-100)
 * @returns 变亮后的 HEX 颜色
 */
export function lighten(color: string, percentage: number): string {
  return adjustLightness(color, percentage);
}

/**
 * 使颜色变暗
 * @param color - 颜色
 * @param percentage - 百分比 (0-100)
 * @returns 变暗后的 HEX 颜色
 */
export function darken(color: string, percentage: number): string {
  return adjustLightness(color, -percentage);
}

/**
 * 获取颜色的透明度版本
 * @param color - 颜色
 * @param alpha - 透明度 (0-1)
 * @returns RGBA 字符串
 */
export function withAlpha(color: string, alpha: number): string {
  const rgba = parseColor(color);
  rgba.a = Math.max(0, Math.min(1, alpha));
  return `rgba(${rgba.r}, ${rgba.g}, ${rgba.b}, ${rgba.a.toFixed(2)})`;
}

/**
 * 计算两个颜色的对比度 (WCAG)
 * @param color1 - 颜色 1
 * @param color2 - 颜色 2
 * @returns 对比度比值 (1-21)
 */
export function getContrastRatio(color1: string, color2: string): number {
  const getLuminance = (color: string): number => {
    const rgb = parseColor(color);
    const [r, g, b] = [rgb.r, rgb.g, rgb.b].map(v => {
      v = v / 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  
  const l1 = getLuminance(color1);
  const l2 = getLuminance(color2);
  
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * 判断颜色是否为浅色
 * @param color - 颜色
 * @returns 是否为浅色
 */
export function isLightColor(color: string): boolean {
  const rgb = parseColor(color);
  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
  return luminance > 0.5;
}

/**
 * 获取适合的文字颜色 (黑或白)
 * @param backgroundColor - 背景颜色
 * @returns 适合的文字颜色 (#000000 或 #FFFFFF)
 */
export function getTextColorForBackground(backgroundColor: string): string {
  return isLightColor(backgroundColor) ? '#000000' : '#FFFFFF';
}

// ==================== 工具函数 ====================

/**
 * 随机生成颜色
 * @param saturation - 饱和度范围 (可选)
 * @param lightness - 亮度范围 (可选)
 * @returns 随机 HEX 颜色
 */
export function randomColor(
  saturation: [number, number] = [50, 100],
  lightness: [number, number] = [40, 70]
): string {
  const h = Math.floor(Math.random() * 360);
  const s = saturation[0] + Math.floor(Math.random() * (saturation[1] - saturation[0]));
  const l = lightness[0] + Math.floor(Math.random() * (lightness[1] - lightness[0]));
  
  return hslToHex({ h, s, l });
}

/**
 * 格式化颜色对象为 CSS 字符串
 * @param color - RGBA 或 RGB 对象
 * @param format - 输出格式 (hex, rgb, hsl)
 * @returns CSS 颜色字符串
 */
export function formatColor(color: RGBA | RGB, format: 'hex' | 'rgb' | 'hsl' = 'hex'): string {
  const rgba: RGBA = 'a' in color ? color as RGBA : { ...(color as RGB), a: 1 };
  switch (format) {
    case 'hex':
      return rgbToHex(rgba, rgba.a < 1);
    case 'rgb':
      if (rgba.a < 1) {
        return `rgba(${rgba.r}, ${rgba.g}, ${rgba.b}, ${rgba.a.toFixed(2)})`;
      }
      return `rgb(${rgba.r}, ${rgba.g}, ${rgba.b})`;
    case 'hsl': {
      const hsl = rgbToHsl(rgba);
      if (rgba.a < 1) {
        return `hsla(${hsl.h}, ${hsl.s}%, ${hsl.l}%, ${rgba.a.toFixed(2)})`;
      }
      return `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`;
    }
    default:
      return rgbToHex(rgba);
  }
}

/**
 * 验证颜色字符串是否有效
 * @param color - 颜色字符串
 * @returns 是否有效
 */
export function isValidColor(color: string): boolean {
  try {
    parseColor(color);
    return true;
  } catch {
    return false;
  }
}
