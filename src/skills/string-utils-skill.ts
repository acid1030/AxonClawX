/**
 * String Utilities Skill - NOVA
 * 
 * 字符串处理工具集
 * 功能：格式化、转换、截断、填充
 */

// ==================== 类型定义 ====================

export type CaseType = 'camel' | 'pascal' | 'kebab' | 'snake' | 'constant' | 'title';

export interface TruncateOptions {
  length: number;
  suffix?: string;
  preserveWords?: boolean;
}

export interface PadOptions {
  length: number;
  char?: string;
  position?: 'left' | 'right' | 'both';
}

export interface FormatOptions {
  trim?: boolean;
  collapseSpaces?: boolean;
  removeSpecialChars?: boolean;
}

// ==================== 字符串转换 ====================

/**
 * 转换为驼峰命名 (camelCase)
 * @example "hello-world" → "helloWorld"
 */
export function toCamelCase(str: string): string {
  return str
    .replace(/[-_\s]+(.)?/g, (_, char) => char ? char.toUpperCase() : '')
    .replace(/^[A-Z]/, char => char.toLowerCase());
}

/**
 * 转换为帕斯卡命名 (PascalCase)
 * @example "hello-world" → "HelloWorld"
 */
export function toPascalCase(str: string): string {
  const camel = toCamelCase(str);
  return camel.charAt(0).toUpperCase() + camel.slice(1);
}

/**
 * 转换为短横线命名 (kebab-case)
 * @example "helloWorld" → "hello-world"
 */
export function toKebabCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[_\s]+/g, '-')
    .toLowerCase();
}

/**
 * 转换为下划线命名 (snake_case)
 * @example "helloWorld" → "hello_world"
 */
export function toSnakeCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .replace(/[-\s]+/g, '_')
    .toLowerCase();
}

/**
 * 转换为常量命名 (CONSTANT_CASE)
 * @example "helloWorld" → "HELLO_WORLD"
 */
export function toConstantCase(str: string): string {
  return toSnakeCase(str).toUpperCase();
}

/**
 * 转换为标题命名 (Title Case)
 * @example "hello world" → "Hello World"
 */
export function toTitleCase(str: string): string {
  return str
    .toLowerCase()
    .split(/\s+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * 通用命名转换
 * @param str - 输入字符串
 * @param targetCase - 目标命名格式
 */
export function convertCase(str: string, targetCase: CaseType): string {
  const converters: Record<CaseType, (s: string) => string> = {
    camel: toCamelCase,
    pascal: toPascalCase,
    kebab: toKebabCase,
    snake: toSnakeCase,
    constant: toConstantCase,
    title: toTitleCase,
  };
  return converters[targetCase](str);
}

// ==================== 字符串截断 ====================

/**
 * 截断字符串到指定长度
 * @param str - 输入字符串
 * @param options - 截断选项
 */
export function truncate(str: string, options: number | TruncateOptions): string {
  const config = typeof options === 'number' 
    ? { length: options, suffix: '...', preserveWords: false }
    : { length: options.length, suffix: options.suffix ?? '...', preserveWords: options.preserveWords ?? false };

  if (str.length <= config.length) return str;

  const maxLength = config.length - config.suffix.length;
  if (maxLength <= 0) return config.suffix.slice(0, config.length);

  if (config.preserveWords) {
    const truncated = str.slice(0, maxLength);
    const lastSpace = truncated.lastIndexOf(' ');
    if (lastSpace > 0) {
      return truncated.slice(0, lastSpace) + config.suffix;
    }
    return truncated + config.suffix;
  }

  return str.slice(0, maxLength) + config.suffix;
}

/**
 * 截断到单词边界
 * @param str - 输入字符串
 * @param maxLength - 最大长度
 */
export function truncateToWord(str: string, maxLength: number): string {
  return truncate(str, { length: maxLength, preserveWords: true });
}

/**
 * 截断并添加省略号 (快捷方法)
 * @param str - 输入字符串
 * @param length - 目标长度
 */
export function ellipsis(str: string, length: number): string {
  return truncate(str, { length, suffix: '…' });
}

// ==================== 字符串填充 ====================

/**
 * 填充字符串到指定长度
 * @param str - 输入字符串
 * @param options - 填充选项
 */
export function pad(str: string, options: number | PadOptions): string {
  const config = typeof options === 'number'
    ? { length: options, char: ' ', position: 'left' as const }
    : { length: options.length, char: options.char ?? ' ', position: options.position ?? 'left' };

  if (str.length >= config.length) return str;

  const padLength = config.length - str.length;
  const padString = config.char.repeat(Math.ceil(padLength / config.char.length)).slice(0, padLength);

  switch (config.position) {
    case 'left':
      return padString + str;
    case 'right':
      return str + padString;
    case 'both':
      const leftPad = Math.floor(padLength / 2);
      const rightPad = padLength - leftPad;
      return config.char.repeat(leftPad) + str + config.char.repeat(rightPad);
  }
}

/**
 * 左填充 (快捷方法)
 * @param str - 输入字符串
 * @param length - 目标长度
 * @param char - 填充字符
 */
export function padLeft(str: string, length: number, char = ' '): string {
  return pad(str, { length, char, position: 'left' });
}

/**
 * 右填充 (快捷方法)
 * @param str - 输入字符串
 * @param length - 目标长度
 * @param char - 填充字符
 */
export function padRight(str: string, length: number, char = ' '): string {
  return pad(str, { length, char, position: 'right' });
}

/**
 * 零填充 (用于数字)
 * @param str - 输入字符串
 * @param length - 目标长度
 */
export function padZero(str: string, length: number): string {
  return padLeft(str, length, '0');
}

/**
 * 居中对齐填充
 * @param str - 输入字符串
 * @param length - 目标长度
 * @param char - 填充字符
 */
export function padCenter(str: string, length: number, char = ' '): string {
  return pad(str, { length, char, position: 'both' });
}

// ==================== 字符串格式化 ====================

/**
 * 格式化字符串 (基础清理)
 * @param str - 输入字符串
 * @param options - 格式化选项
 */
export function format(str: string, options: FormatOptions = {}): string {
  let result = str;

  if (options.trim ?? true) {
    result = result.trim();
  }

  if (options.collapseSpaces) {
    result = result.replace(/\s+/g, ' ');
  }

  if (options.removeSpecialChars) {
    result = result.replace(/[^\w\s\u4e00-\u9fa5]/g, '');
  }

  return result;
}

/**
 * 清理空白字符
 * @param str - 输入字符串
 */
export function cleanWhitespace(str: string): string {
  return format(str, { trim: true, collapseSpaces: true });
}

/**
 * 移除特殊字符
 * @param str - 输入字符串
 */
export function removeSpecialChars(str: string): string {
  return format(str, { removeSpecialChars: true });
}

/**
 * 首字母大写
 * @param str - 输入字符串
 */
export function capitalize(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * 首字母小写
 * @param str - 输入字符串
 */
export function decapitalize(str: string): string {
  if (!str) return str;
  return str.charAt(0).toLowerCase() + str.slice(1);
}

/**
 * 反转字符串
 * @param str - 输入字符串
 */
export function reverse(str: string): string {
  return str.split('').reverse().join('');
}

/**
 * 重复字符串
 * @param str - 输入字符串
 * @param times - 重复次数
 */
export function repeat(str: string, times: number): string {
  return str.repeat(times);
}

/**
 * 字符串模板替换
 * @param template - 模板字符串 (使用 {key} 语法)
 * @param data - 替换数据
 */
export function template(template: string, data: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => {
    return key in data ? String(data[key]) : `{${key}}`;
  });
}

// ==================== 使用示例 ====================

/**
 * 使用示例集合
 * 可直接运行测试功能
 */
export function runExamples(): void {
  console.log('=== 字符串工具技能使用示例 ===\n');

  // 1. 命名转换示例
  console.log('【命名转换】');
  const testStr = 'hello_world-test';
  console.log(`原始: "${testStr}"`);
  console.log(`  → camelCase:     "${toCamelCase(testStr)}"`);
  console.log(`  → PascalCase:    "${toPascalCase(testStr)}"`);
  console.log(`  → kebab-case:    "${toKebabCase(testStr)}"`);
  console.log(`  → snake_case:    "${toSnakeCase(testStr)}"`);
  console.log(`  → CONSTANT_CASE: "${toConstantCase(testStr)}"`);
  console.log(`  → Title Case:    "${toTitleCase(testStr)}"`);
  console.log();

  // 2. 截断示例
  console.log('【字符串截断】');
  const longText = '这是一个很长的字符串，用于演示截断功能';
  console.log(`原始: "${longText}" (长度: ${longText.length})`);
  console.log(`  → truncate(10):     "${truncate(longText, 10)}"`);
  console.log(`  → truncate(10, 保留单词): "${truncate(longText, { length: 10, preserveWords: true })}"`);
  console.log(`  → ellipsis(8):      "${ellipsis(longText, 8)}"`);
  console.log();

  // 3. 填充示例
  console.log('【字符串填充】');
  const shortStr = 'ABC';
  console.log(`原始: "${shortStr}"`);
  console.log(`  → padLeft(8):   "${padLeft(shortStr, 8)}"`);
  console.log(`  → padRight(8):  "${padRight(shortStr, 8)}"`);
  console.log(`  → padCenter(8): "${padCenter(shortStr, 8)}"`);
  console.log(`  → padZero(5):   "${padZero('42', 5)}"`);
  console.log();

  // 4. 格式化示例
  console.log('【字符串格式化】');
  const messyStr = '  Hello   World!  @#$  ';
  console.log(`原始: "${messyStr}"`);
  console.log(`  → cleanWhitespace:    "${cleanWhitespace(messyStr)}"`);
  console.log(`  → removeSpecialChars: "${removeSpecialChars(messyStr)}"`);
  console.log(`  → capitalize:         "${capitalize('hello')}"`);
  console.log();

  // 5. 其他工具
  console.log('【其他工具】');
  console.log(`  → reverse("hello"): "${reverse('hello')}"`);
  console.log(`  → repeat("ab", 3):  "${repeat('ab', 3)}"`);
  console.log(`  → template:         "${template('Hello {name}!', { name: 'World' })}"`);
  console.log();

  // 6. 实际应用场景
  console.log('【实际应用场景】');
  console.log('1. API 字段命名转换:');
  console.log(`   "user_name" → camelCase: "${toCamelCase('user_name')}" (用于 JavaScript)`);
  console.log(`   "userName" → CONSTANT:   "${toConstantCase('userName')}" (用于环境变量)`);
  
  console.log('\n2. 显示文本截断:');
  const articleTitle = '2026 年最新技术趋势分析报告：人工智能与量子计算的融合';
  console.log(`   标题: "${articleTitle}"`);
  console.log(`   卡片显示: "${ellipsis(articleTitle, 15)}"`);
  
  console.log('\n3. 数字格式化:');
  console.log(`   订单号: "${padZero('123', 8)}" (补足 8 位)`);
  console.log(`   价格: "${padRight('99.99', 10)}" (右对齐)`);
  
  console.log('\n=== 示例完成 ===');
}

// ==================== 导出 ====================

export default {
  // 命名转换
  toCamelCase,
  toPascalCase,
  toKebabCase,
  toSnakeCase,
  toConstantCase,
  toTitleCase,
  convertCase,
  
  // 截断
  truncate,
  truncateToWord,
  ellipsis,
  
  // 填充
  pad,
  padLeft,
  padRight,
  padCenter,
  padZero,
  
  // 格式化
  format,
  cleanWhitespace,
  removeSpecialChars,
  capitalize,
  decapitalize,
  reverse,
  repeat,
  template,
  
  // 示例
  runExamples,
};
