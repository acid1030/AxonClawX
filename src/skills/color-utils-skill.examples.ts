/**
 * 颜色工具技能使用示例
 * 
 * @module skills/color-utils-examples
 */

import {
  // 颜色解析
  parseHEX,
  parseRGB,
  parseHSL,
  parseColor,
  
  // 颜色转换
  rgbToHex,
  rgbToHsl,
  rgbToHsv,
  hslToRgb,
  hsvToRgb,
  hslToHex,
  hexToHsl,
  
  // 颜色混合
  lerpColor,
  blendColors,
  mixColors,
  
  // 调色板生成
  generateMonochromatic,
  generateComplementary,
  generateTriadic,
  generateSplitComplementary,
  generateAnalogous,
  generateGradient,
  
  // 颜色操作
  adjustLightness,
  adjustSaturation,
  adjustHue,
  lighten,
  darken,
  withAlpha,
  getContrastRatio,
  isLightColor,
  getTextColorForBackground,
  
  // 工具函数
  randomColor,
  formatColor,
  isValidColor,
  
  // 类型
  RGB,
  RGBA,
  HSL,
  HSV,
  BlendMode
} from './color-utils-skill';

// ==================== 示例 1: 颜色格式转换 ====================

console.log('=== 颜色格式转换示例 ===\n');

// 解析不同格式的颜色
const hexColor = parseHEX('#3B82F6');
console.log('HEX #3B82F6 解析:', hexColor);
// 输出：{ r: 59, g: 130, b: 246, a: 1 }

const rgbColor = parseRGB('rgb(59, 130, 246)');
console.log('RGB 解析:', rgbColor);
// 输出：{ r: 59, g: 130, b: 246, a: 1 }

const rgbaColor = parseRGB('rgba(59, 130, 246, 0.5)');
console.log('RGBA 解析:', rgbaColor);
// 输出：{ r: 59, g: 130, b: 246, a: 0.5 }

// 转换为不同格式
console.log('\nRGB 转 HEX:', rgbToHex({ r: 59, g: 130, b: 246 }));
// 输出：#3b82f6

console.log('RGB 转 HSL:', rgbToHsl({ r: 59, g: 130, b: 246 }));
// 输出：{ h: 217, s: 91%, l: 60% }

console.log('RGB 转 HSV:', rgbToHsv({ r: 59, g: 130, b: 246 }));
// 输出：{ h: 217, s: 76%, v: 96% }

console.log('HSL 转 RGB:', hslToRgb({ h: 217, s: 91, l: 60 }));
// 输出：{ r: 59, g: 130, b: 246 }

console.log('HSL 转 HEX:', hslToHex({ h: 217, s: 91, l: 60 }));
// 输出：#3b82f6

console.log('HEX 转 HSL:', hexToHsl('#3B82F6'));
// 输出：{ h: 217, s: 91, l: 60 }

// 通用解析器
console.log('\n通用解析器:');
console.log('解析 HEX:', parseColor('#3B82F6'));
console.log('解析 RGB:', parseColor('rgb(59, 130, 246)'));
console.log('解析 HSL:', parseColor('hsl(217, 91%, 60%)'));

// ==================== 示例 2: 颜色混合 ====================

console.log('\n\n=== 颜色混合示例 ===\n');

// 线性插值混合
console.log('线性插值混合 (蓝色到红色，50%):');
const mixed = lerpColor('#3B82F6', '#EF4444', 0.5);
console.log('结果:', mixed);
console.log('HEX 格式:', rgbToHex(mixed));
// 输出：混合后的紫色

// 不同混合模式
console.log('\n不同混合模式 (蓝色叠加到红色上):');
const blendModes: BlendMode[] = ['normal', 'multiply', 'screen', 'overlay', 'darken', 'lighten'];
blendModes.forEach(mode => {
  const result = blendColors('#EF4444', '#3B82F6', mode, 0.8);
  console.log(`${mode}:`, rgbToHex(result));
});

// 多颜色混合
console.log('\n多颜色混合 (红、绿、蓝等权重):');
const multiMix = mixColors(['#EF4444', '#10B981', '#3B82F6']);
console.log('结果:', rgbToHex(multiMix));

console.log('\n多颜色混合 (带权重):');
const weightedMix = mixColors(
  ['#EF4444', '#10B981', '#3B82F6'],
  [0.6, 0.3, 0.1]  // 红色权重最高
);
console.log('结果:', rgbToHex(weightedMix));

// ==================== 示例 3: 调色板生成 ====================

console.log('\n\n=== 调色板生成示例 ===\n');

const baseColor = '#3B82F6';
console.log('基础颜色:', baseColor);

// 单色调色板
console.log('\n单色调色板 (5 个颜色):');
const monoPalette = generateMonochromatic(baseColor, 5);
monoPalette.forEach((color, i) => {
  console.log(`  ${i + 1}. HSL(${color.h}, ${color.s}%, ${color.l}%) -> ${hslToHex(color)}`);
});

// 互补色
console.log('\n互补色调色板:');
const compPalette = generateComplementary(baseColor);
compPalette.forEach((color, i) => {
  console.log(`  ${i + 1}. HSL(${color.h}, ${color.s}%, ${color.l}%) -> ${hslToHex(color)}`);
});

// 三元色
console.log('\n三元色调色板:');
const triadicPalette = generateTriadic(baseColor);
triadicPalette.forEach((color, i) => {
  console.log(`  ${i + 1}. HSL(${color.h}, ${color.s}%, ${color.l}%) -> ${hslToHex(color)}`);
});

// 分裂互补色
console.log('\n分裂互补色调色板:');
const splitPalette = generateSplitComplementary(baseColor);
splitPalette.forEach((color, i) => {
  console.log(`  ${i + 1}. HSL(${color.h}, ${color.s}%, ${color.l}%) -> ${hslToHex(color)}`);
});

// 类似色
console.log('\n类似色调色板 (5 个颜色，30 度间隔):');
const analogousPalette = generateAnalogous(baseColor, 5, 30);
analogousPalette.forEach((color, i) => {
  console.log(`  ${i + 1}. HSL(${color.h}, ${color.s}%, ${color.l}%) -> ${hslToHex(color)}`);
});

// 渐变色
console.log('\n渐变色 (蓝色到红色，5 步):');
const gradient = generateGradient('#3B82F6', '#EF4444', 5);
gradient.forEach((color, i) => {
  console.log(`  ${i + 1}. ${color}`);
});

// ==================== 示例 4: 颜色操作 ====================

console.log('\n\n=== 颜色操作示例 ===\n');

const color = '#3B82F6';
console.log('原始颜色:', color);

// 调整亮度
console.log('\n调整亮度:');
console.log('  变亮 20%:', lighten(color, 20));
console.log('  变暗 20%:', darken(color, 20));
console.log('  调整 +30:', adjustLightness(color, 30));
console.log('  调整 -30:', adjustLightness(color, -30));

// 调整饱和度
console.log('\n调整饱和度:');
console.log('  增加 30%:', adjustSaturation(color, 30));
console.log('  减少 30%:', adjustSaturation(color, -30));

// 调整色相
console.log('\n调整色相:');
console.log('  旋转 30°:', adjustHue(color, 30));
console.log('  旋转 180°:', adjustHue(color, 180));

// 透明度
console.log('\n透明度:');
console.log('  50% 透明:', withAlpha(color, 0.5));
console.log('  25% 透明:', withAlpha(color, 0.25));

// 对比度
console.log('\n对比度分析:');
console.log('  蓝色 vs 白色:', getContrastRatio('#3B82F6', '#FFFFFF').toFixed(2));
console.log('  蓝色 vs 黑色:', getContrastRatio('#3B82F6', '#000000').toFixed(2));
console.log('  白色 vs 黑色:', getContrastRatio('#FFFFFF', '#000000').toFixed(2));

// 文字颜色建议
console.log('\n文字颜色建议:');
console.log('  白色背景:', getTextColorForBackground('#FFFFFF'));
console.log('  黑色背景:', getTextColorForBackground('#000000'));
console.log('  蓝色背景:', getTextColorForBackground('#3B82F6'));
console.log('  黄色背景:', getTextColorForBackground('#FBBF24'));

// ==================== 示例 5: 工具函数 ====================

console.log('\n\n=== 工具函数示例 ===\n');

// 随机颜色
console.log('随机颜色生成:');
for (let i = 0; i < 5; i++) {
  console.log(`  ${i + 1}. ${randomColor()}`);
}

console.log('\n随机颜色 (低饱和度):');
for (let i = 0; i < 3; i++) {
  console.log(`  ${i + 1}. ${randomColor([20, 40], [60, 80])}`);
}

// 格式化输出
console.log('\n格式化输出:');
const testColor = parseColor('#3B82F6');
console.log('  HEX:', formatColor(testColor, 'hex'));
console.log('  RGB:', formatColor(testColor, 'rgb'));
console.log('  HSL:', formatColor(testColor, 'hsl'));

const transparentColor = { r: 59, g: 130, b: 246, a: 0.5 };
console.log('  RGBA:', formatColor(transparentColor, 'rgb'));
console.log('  HSLA:', formatColor(transparentColor, 'hsl'));

// 颜色验证
console.log('\n颜色验证:');
console.log('  #3B82F6 有效吗？', isValidColor('#3B82F6'));
console.log('  rgb(59,130,246) 有效吗？', isValidColor('rgb(59,130,246)'));
console.log('  invalid 有效吗？', isValidColor('invalid'));
console.log('  hsl(217,91%,60%) 有效吗？', isValidColor('hsl(217,91%,60%)'));

// ==================== 实际应用场景 ====================

console.log('\n\n=== 实际应用场景 ===\n');

// 场景 1: 生成按钮状态颜色
console.log('场景 1: 按钮状态颜色 (基于主色 #3B82F6):');
const primaryColor = '#3B82F6';
console.log('  默认:', primaryColor);
console.log('  悬停:', lighten(primaryColor, 10));
console.log('  按下:', darken(primaryColor, 10));
console.log('  禁用:', withAlpha(primaryColor, 0.5));

// 场景 2: 生成阴影颜色
console.log('\n场景 2: 阴影颜色 (基于主色):');
console.log('  浅阴影:', withAlpha(darken(primaryColor, 20), 0.1));
console.log('  中阴影:', withAlpha(darken(primaryColor, 20), 0.2));
console.log('  深阴影:', withAlpha(darken(primaryColor, 20), 0.3));

// 场景 3: 生成图表配色
console.log('\n场景 3: 图表配色 (三元色方案):');
const chartColors = generateTriadic(primaryColor);
chartColors.forEach((color, i) => {
  console.log(`  系列 ${i + 1}: ${hslToHex(color)}`);
});

// 场景 4: 生成暗黑模式变体
console.log('\n场景 4: 暗黑模式颜色适配:');
const lightBg = '#FFFFFF';
const darkBg = '#1A1A1A';
console.log('  亮色模式背景:', lightBg);
console.log('  暗色模式背景:', darkBg);
console.log('  亮色模式文字:', getTextColorForBackground(lightBg));
console.log('  暗色模式文字:', getTextColorForBackground(darkBg));

// 场景 5: 检查可访问性
console.log('\n场景 5: WCAG 可访问性检查:');
const textColor = '#333333';
const bgColor = '#F0F0F0';
const contrast = getContrastRatio(textColor, bgColor);
console.log(`  文字: ${textColor}, 背景: ${bgColor}`);
console.log(`  对比度: ${contrast.toFixed(2)}:1`);
console.log(`  AA 级标准 (4.5:1): ${contrast >= 4.5 ? '✓ 通过' : '✗ 不通过'}`);
console.log(`  AAA 级标准 (7:1): ${contrast >= 7 ? '✓ 通过' : '✗ 不通过'}`);

// ==================== 完整工作流示例 ====================

console.log('\n\n=== 完整工作流示例：设计系统颜色生成 ===\n');

function generateDesignSystemColors(primaryColor: string) {
  console.log(`基于主色 ${primaryColor} 生成设计系统:\n`);
  
  // 1. 主色系 (单色渐变)
  console.log('1. 主色系 (用于品牌元素):');
  const primaryScale = generateMonochromatic(primaryColor, 5, [30, 90]);
  primaryScale.forEach((color, i) => {
    const hex = hslToHex(color);
    console.log(`   -${i + 1}00: ${hex}`);
  });
  
  // 2. 强调色 (互补色)
  console.log('\n2. 强调色 (用于 CTA 按钮):');
  const [accent] = generateComplementary(primaryColor);
  console.log(`   强调色：${hslToHex(accent)}`);
  
  // 3. 功能色 (成功/警告/错误)
  console.log('\n3. 功能色:');
  const success = '#10B981';
  const warning = '#F59E0B';
  const error = '#EF4444';
  console.log(`   成功：${success}`);
  console.log(`   警告：${warning}`);
  console.log(`   错误：${error}`);
  
  // 4. 渐变色
  console.log('\n4. 背景渐变:');
  const gradientColors = generateGradient(primaryColor, hslToHex(accent), 3);
  console.log(`   linear-gradient(${gradientColors.join(', ')})`);
  
  // 5. 中性色
  console.log('\n5. 中性色 (用于文字/背景):');
  const neutralColors = ['#000000', '#333333', '#666666', '#999999', '#CCCCCC', '#EEEEEE', '#FFFFFF'];
  neutralColors.forEach(color => {
    const text = getTextColorForBackground(color);
    console.log(`   ${color} (文字：${text})`);
  });
}

generateDesignSystemColors('#6366F1');

console.log('\n\n=== 示例完成 ===');
