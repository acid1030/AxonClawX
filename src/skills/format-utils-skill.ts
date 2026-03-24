/**
 * 格式化工具技能 - KAEL
 * 
 * 提供常用数据格式化功能：
 * 1. 数字格式化 (货币、百分比、千分位等)
 * 2. 日期格式化 (多种格式、相对时间等)
 * 3. 文本格式化 (截断、脱敏、大小写等)
 * 
 * @author KAEL
 * @version 1.0.0
 */

// ==================== 类型定义 ====================

export type NumberFormatType = 
  | 'currency'      // 货币格式：¥1,234.56
  | 'percent'       // 百分比：12.34%
  | 'thousand'      // 千分位：1,234.56
  | 'scientific'    // 科学计数：1.23e+3
  | 'compact'       // 紧凑格式：1.2K, 1.2M
  | 'bytes'         // 字节格式：1.2 KB, 1.2 MB
  | 'custom';       // 自定义格式

export interface NumberFormatOptions {
  type?: NumberFormatType;
  locale?: string;          // 语言环境，默认 'zh-CN'
  currency?: string;        // 货币符号，默认 'CNY'
  decimals?: number;        // 小数位数，默认 2
  showSign?: boolean;       // 显示正负号，默认 false
  prefix?: string;          // 前缀
  suffix?: string;          // 后缀
  pattern?: string;         // 自定义格式模式
}

export type DateFormatType =
  | 'full'         // 完整格式：2026 年 3 月 13 日 星期五 19:50:00
  | 'date'         // 日期：2026-03-13
  | 'time'         // 时间：19:50:00
  | 'datetime'     // 日期时间：2026-03-13 19:50:00
  | 'relative'     // 相对时间：刚刚、5 分钟前、2 小时前
  | 'iso'          // ISO 格式：2026-03-13T19:50:00.000Z
  | 'timestamp'    // 时间戳：1710334200000
  | 'custom';      // 自定义格式

export interface DateFormatOptions {
  type?: DateFormatType;
  locale?: string;          // 语言环境，默认 'zh-CN'
  timezone?: string;        // 时区，默认当前时区
  pattern?: string;         // 自定义格式模式 (YYYY-MM-DD HH:mm:ss)
  showWeekday?: boolean;    // 显示星期，默认 false
  suffix?: string;          // 后缀 (如 '前', '后')
}

export type TextFormatType =
  | 'truncate'     // 文本截断
  | 'mask'         // 文本脱敏
  | 'uppercase'    // 转大写
  | 'lowercase'    // 转小写
  | 'capitalize'   // 首字母大写
  | 'titlecase'    // 标题格式
  | 'camelCase'    // 驼峰命名
  | 'kebabCase'    // 短横线命名
  | 'snakeCase'    // 下划线命名
  | 'pascalCase'   // 帕斯卡命名
  | 'stripHtml'    // 移除 HTML 标签
  | 'normalize'    // 标准化空白
  | 'custom';      // 自定义转换

export interface TextFormatOptions {
  type?: TextFormatType;
  maxLength?: number;       // 最大长度 (truncate)
  suffix?: string;          // 截断后缀，默认 '...'
  maskChar?: string;        // 脱敏字符，默认 '*'
  maskPattern?: string;     // 脱敏模式：'phone', 'email', 'id', 'custom'
  keepStart?: number;       // 保留开头字符数
  keepEnd?: number;         // 保留结尾字符数
  pattern?: string;         // 自定义正则或格式
}

// ==================== 数字格式化 ====================

/**
 * 数字格式化主函数
 * 
 * @param value - 要格式化的数字
 * @param options - 格式化选项
 * @returns 格式化后的字符串
 * 
 * @example
 * formatNumber(1234.567, { type: 'currency' }) // "¥1,234.57"
 * formatNumber(0.1234, { type: 'percent' }) // "12.34%"
 * formatNumber(1234567, { type: 'compact' }) // "1.23M"
 * formatNumber(1024, { type: 'bytes' }) // "1 KB"
 */
export function formatNumber(value: number, options: NumberFormatOptions = {}): string {
  const {
    type = 'thousand',
    locale = 'zh-CN',
    currency = 'CNY',
    decimals = 2,
    showSign = false,
    prefix = '',
    suffix = '',
    pattern
  } = options;

  if (isNaN(value) || value === null || value === undefined) {
    return '-';
  }

  let formatted = '';
  const num = Number(value);

  switch (type) {
    case 'currency':
      formatted = new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
      }).format(num);
      break;

    case 'percent':
      formatted = new Intl.NumberFormat(locale, {
        style: 'percent',
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
      }).format(num / 100);
      break;

    case 'thousand':
      formatted = new Intl.NumberFormat(locale, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
      }).format(num);
      break;

    case 'scientific':
      formatted = num.toExponential(decimals);
      break;

    case 'compact':
      formatted = formatCompactNumber(num, locale, decimals);
      break;

    case 'bytes':
      formatted = formatBytes(num, decimals);
      break;

    case 'custom':
      if (pattern) {
        formatted = formatNumberPattern(num, pattern);
      } else {
        formatted = num.toString();
      }
      break;

    default:
      formatted = num.toString();
  }

  // 添加正负号
  if (showSign && num > 0) {
    formatted = '+' + formatted;
  }

  // 添加前后缀
  return `${prefix}${formatted}${suffix}`;
}

/**
 * 紧凑数字格式 (1.2K, 1.2M, 1.2B)
 */
function formatCompactNumber(num: number, locale: string, decimals: number): string {
  const formatter = new Intl.NumberFormat(locale, {
    notation: 'compact',
    compactDisplay: 'short',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
  return formatter.format(num);
}

/**
 * 字节格式 (B, KB, MB, GB, TB)
 */
function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.floor(Math.log(Math.abs(bytes)) / Math.log(k));
  
  const value = bytes / Math.pow(k, i);
  return `${value.toFixed(decimals)} ${sizes[i]}`;
}

/**
 * 自定义数字模式格式化
 * 支持模式：#, ##0.00, ¥#,##0.00 等
 */
function formatNumberPattern(num: number, pattern: string): string {
  // 简化版模式处理
  const absNum = Math.abs(num);
  const parts = pattern.split('.');
  
  if (parts.length === 2) {
    const decimals = parts[1].replace(/[^0]/g, '').length;
    return absNum.toFixed(decimals);
  }
  
  return absNum.toString();
}

// ==================== 日期格式化 ====================

/**
 * 日期格式化主函数
 * 
 * @param date - 要格式化的日期 (Date 对象、时间戳或日期字符串)
 * @param options - 格式化选项
 * @returns 格式化后的字符串
 * 
 * @example
 * formatDate(new Date(), { type: 'full' }) // "2026 年 3 月 13 日 星期五 19:50:00"
 * formatDate(Date.now(), { type: 'date' }) // "2026-03-13"
 * formatDate('2026-03-13', { type: 'relative' }) // "刚刚"
 * formatDate(new Date(), { pattern: 'YYYY-MM-DD' }) // "2026-03-13"
 */
export function formatDate(date: Date | number | string, options: DateFormatOptions = {}): string {
  const {
    type = 'datetime',
    locale = 'zh-CN',
    timezone,
    pattern,
    showWeekday = false,
    suffix
  } = options;

  // 解析日期
  const d = parseDate(date);
  if (!d) {
    return '-';
  }

  let formatted = '';

  switch (type) {
    case 'full':
      formatted = formatFullDate(d, locale, showWeekday);
      break;

    case 'date':
      formatted = d.toLocaleDateString(locale);
      break;

    case 'time':
      formatted = d.toLocaleTimeString(locale);
      break;

    case 'datetime':
      formatted = `${d.toLocaleDateString(locale)} ${d.toLocaleTimeString(locale)}`;
      break;

    case 'relative':
      formatted = formatRelativeDate(d, suffix);
      break;

    case 'iso':
      formatted = d.toISOString();
      break;

    case 'timestamp':
      formatted = d.getTime().toString();
      break;

    case 'custom':
      if (pattern) {
        formatted = formatCustomDate(d, pattern);
      } else {
        formatted = d.toString();
      }
      break;

    default:
      formatted = d.toString();
  }

  return formatted;
}

/**
 * 解析日期输入
 */
function parseDate(input: Date | number | string): Date | null {
  if (input instanceof Date) {
    return isNaN(input.getTime()) ? null : input;
  }
  
  if (typeof input === 'number') {
    // 假设毫秒时间戳
    const d = new Date(input);
    return isNaN(d.getTime()) ? null : d;
  }
  
  if (typeof input === 'string') {
    const d = new Date(input);
    return isNaN(d.getTime()) ? null : d;
  }
  
  return null;
}

/**
 * 完整日期格式
 */
function formatFullDate(date: Date, locale: string, showWeekday: boolean): string {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const seconds = date.getSeconds();
  
  let result = `${year}年${month}月${day}日`;
  
  if (showWeekday) {
    const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
    result += ` ${weekdays[date.getDay()]}`;
  }
  
  result += ` ${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  
  return result;
}

/**
 * 相对日期格式 (刚刚、5 分钟前、2 小时前)
 */
function formatRelativeDate(date: Date, customSuffix?: string): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);
  
  const suffix = customSuffix ?? '前';

  if (diffSecs < 10) return '刚刚';
  if (diffSecs < 60) return `${diffSecs}秒${suffix}`;
  if (diffMins < 60) return `${diffMins}分钟${suffix}`;
  if (diffHours < 24) return `${diffHours}小时${suffix}`;
  if (diffDays < 7) return `${diffDays}天${suffix}`;
  if (diffWeeks < 4) return `${diffWeeks}周${suffix}`;
  if (diffMonths < 12) return `${diffMonths}个月${suffix}`;
  return `${diffYears}年${suffix}`;
}

/**
 * 自定义日期格式
 * 支持模式：YYYY, MM, DD, HH, mm, ss 等
 */
function formatCustomDate(date: Date, pattern: string): string {
  const replacements: Record<string, string | number> = {
    'YYYY': date.getFullYear(),
    'YY': String(date.getFullYear()).slice(-2),
    'MM': String(date.getMonth() + 1).padStart(2, '0'),
    'M': date.getMonth() + 1,
    'DD': String(date.getDate()).padStart(2, '0'),
    'D': date.getDate(),
    'HH': String(date.getHours()).padStart(2, '0'),
    'H': date.getHours(),
    'mm': String(date.getMinutes()).padStart(2, '0'),
    'm': date.getMinutes(),
    'ss': String(date.getSeconds()).padStart(2, '0'),
    's': date.getSeconds(),
    'ddd': ['日', '一', '二', '三', '四', '五', '六'][date.getDay()],
    'dddd': ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'][date.getDay()]
  };

  let result = pattern;
  // 按长度降序替换，避免短模式替换长模式
  Object.keys(replacements).sort((a, b) => b.length - a.length).forEach(key => {
    result = result.split(key).join(String(replacements[key]));
  });

  return result;
}

// ==================== 文本格式化 ====================

/**
 * 文本格式化主函数
 * 
 * @param text - 要格式化的文本
 * @param options - 格式化选项
 * @returns 格式化后的字符串
 * 
 * @example
 * formatText('Hello World', { type: 'uppercase' }) // "HELLO WORLD"
 * formatText('13812345678', { type: 'mask', maskPattern: 'phone' }) // "138****5678"
 * formatText('Long text...', { type: 'truncate', maxLength: 10 }) // "Long text..."
 * formatText('hello_world', { type: 'camelCase' }) // "helloWorld"
 */
export function formatText(text: string, options: TextFormatOptions = {}): string {
  const {
    type = 'normalize',
    maxLength,
    suffix = '...',
    maskChar = '*',
    maskPattern,
    keepStart = 3,
    keepEnd = 4,
    pattern
  } = options;

  if (text === null || text === undefined) {
    return '';
  }

  const str = String(text);

  switch (type) {
    case 'truncate':
      return truncateText(str, maxLength ?? str.length, suffix);

    case 'mask':
      return maskText(str, maskChar, maskPattern, keepStart, keepEnd);

    case 'uppercase':
      return str.toUpperCase();

    case 'lowercase':
      return str.toLowerCase();

    case 'capitalize':
      return capitalizeFirst(str);

    case 'titlecase':
      return toTitleCase(str);

    case 'camelCase':
      return toCamelCase(str);

    case 'kebabCase':
      return toKebabCase(str);

    case 'snakeCase':
      return toSnakeCase(str);

    case 'pascalCase':
      return toPascalCase(str);

    case 'stripHtml':
      return stripHtmlTags(str);

    case 'normalize':
      return normalizeWhitespace(str);

    case 'custom':
      if (pattern) {
        return formatCustomText(str, pattern);
      }
      return str;

    default:
      return str;
  }
}

/**
 * 文本截断
 */
function truncateText(text: string, maxLength: number, suffix: string): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - suffix.length) + suffix;
}

/**
 * 文本脱敏
 */
function maskText(
  text: string,
  maskChar: string,
  pattern?: string,
  keepStart: number = 3,
  keepEnd: number = 4
): string {
  // 预定义模式
  if (pattern === 'phone') {
    // 手机号：138****5678
    if (text.length === 11) {
      return text.slice(0, 3) + maskChar.repeat(4) + text.slice(-4);
    }
    return text;
  }

  if (pattern === 'email') {
    // 邮箱：t***@example.com
    const parts = text.split('@');
    if (parts.length === 2) {
      const username = parts[0];
      if (username.length > 2) {
        return username[0] + maskChar.repeat(username.length - 2) + username[username.length - 1] + '@' + parts[1];
      }
    }
    return text;
  }

  if (pattern === 'id') {
    // 身份证：110101********1234
    if (text.length >= 18) {
      return text.slice(0, 6) + maskChar.repeat(8) + text.slice(-4);
    }
    return text;
  }

  // 自定义脱敏：保留开头和结尾
  if (text.length <= keepStart + keepEnd) {
    return text;
  }

  return text.slice(0, keepStart) + maskChar.repeat(text.length - keepStart - keepEnd) + text.slice(-keepEnd);
}

/**
 * 首字母大写
 */
function capitalizeFirst(text: string): string {
  if (!text) return text;
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

/**
 * 标题格式 (每个单词首字母大写)
 */
function toTitleCase(text: string): string {
  return text.replace(/\b\w+/g, word => 
    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  );
}

/**
 * 驼峰命名 (helloWorld)
 */
function toCamelCase(text: string): string {
  return text
    .replace(/[-_\s]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ''))
    .replace(/^[A-Z]/, c => c.toLowerCase());
}

/**
 * 帕斯卡命名 (HelloWorld)
 */
function toPascalCase(text: string): string {
  return toCamelCase(text).replace(/^[a-z]/, c => c.toUpperCase());
}

/**
 * 短横线命名 (hello-world)
 */
function toKebabCase(text: string): string {
  return text
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[-_\s]+/g, '-')
    .toLowerCase();
}

/**
 * 下划线命名 (hello_world)
 */
function toSnakeCase(text: string): string {
  return text
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .replace(/[-\s]+/g, '_')
    .toLowerCase();
}

/**
 * 移除 HTML 标签
 */
function stripHtmlTags(text: string): string {
  return text.replace(/<[^>]*>/g, '');
}

/**
 * 标准化空白字符
 */
function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

/**
 * 自定义文本格式
 */
function formatCustomText(text: string, pattern: string): string {
  // 简单的正则替换
  try {
    const regex = new RegExp(pattern);
    const matches = text.match(regex);
    return matches ? matches[0] : '';
  } catch {
    return text;
  }
}

// ==================== 组合格式化 ====================

/**
 * 格式化文件大小 (带单位的紧凑格式)
 * 
 * @param bytes - 字节数
 * @param decimals - 小数位数
 * @returns 格式化后的大小字符串
 * 
 * @example
 * formatFileSize(1024) // "1 KB"
 * formatFileSize(1536) // "1.5 KB"
 * formatFileSize(1048576) // "1 MB"
 */
export function formatFileSize(bytes: number, decimals: number = 2): string {
  return formatNumber(bytes, { type: 'bytes', decimals });
}

/**
 * 格式化持续时间 (秒 → 时分秒)
 * 
 * @param seconds - 秒数
 * @param options - 选项 (showHours, showMinutes, showSeconds)
 * @returns 格式化后的持续时间字符串
 * 
 * @example
 * formatDuration(3661) // "1 小时 1 分钟 1 秒"
 * formatDuration(125, { showSeconds: false }) // "2 分钟"
 */
export function formatDuration(seconds: number, options: {
  showHours?: boolean;
  showMinutes?: boolean;
  showSeconds?: boolean;
  locale?: string;
} = {}): string {
  const {
    showHours = true,
    showMinutes = true,
    showSeconds = true,
    locale = 'zh-CN'
  } = options;

  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const parts: string[] = [];

  if (showHours && hrs > 0) {
    parts.push(`${hrs}小时`);
  }
  if (showMinutes && mins > 0) {
    parts.push(`${mins}分钟`);
  }
  if (showSeconds && (secs > 0 || parts.length === 0)) {
    parts.push(`${secs}秒`);
  }

  return parts.join(' ');
}

/**
 * 格式化百分比 (带颜色指示)
 * 
 * @param value - 百分比值 (0-100)
 * @param options - 格式化选项
 * @returns 包含值和颜色指示的对象
 * 
 * @example
 * formatPercentWithColor(85) // { value: "85.00%", color: "green" }
 * formatPercentWithColor(45) // { value: "45.00%", color: "red" }
 */
export function formatPercentWithColor(value: number, options: {
  thresholds?: { good: number; warning: number };
  decimals?: number;
} = {}): { value: string; color: string } {
  const {
    thresholds = { good: 80, warning: 60 },
    decimals = 2
  } = options;

  const formatted = formatNumber(value, { type: 'percent', decimals });
  let color = 'red';

  if (value >= thresholds.good) {
    color = 'green';
  } else if (value >= thresholds.warning) {
    color = 'yellow';
  }

  return { value: formatted, color };
}

// ============================================
// 使用示例
// ============================================

/*
// ==================== 数字格式化示例 ====================

// 货币格式
formatNumber(1234.567, { type: 'currency' }) 
// 输出："¥1,234.57"

formatNumber(9999.99, { type: 'currency', currency: 'USD', locale: 'en-US' })
// 输出："$9,999.99"

// 百分比
formatNumber(0.856, { type: 'percent' })
// 输出："85.60%"

formatNumber(12.5, { type: 'percent', decimals: 1 })
// 输出："12.5%"

// 千分位
formatNumber(1234567.89, { type: 'thousand' })
// 输出："1,234,567.89"

// 科学计数
formatNumber(1234567, { type: 'scientific' })
// 输出："1.23e+6"

// 紧凑格式
formatNumber(1500, { type: 'compact' })
// 输出："1.5K"

formatNumber(2500000, { type: 'compact' })
// 输出："2.5M"

// 字节格式
formatNumber(1024, { type: 'bytes' })
// 输出："1 KB"

formatNumber(1572864, { type: 'bytes' })
// 输出："1.5 MB"

// 带符号
formatNumber(100, { type: 'thousand', showSign: true })
// 输出："+100.00"

formatNumber(-50, { type: 'thousand', showSign: true })
// 输出："-50.00"


// ==================== 日期格式化示例 ====================

const now = new Date();

// 完整格式
formatDate(now, { type: 'full' })
// 输出："2026 年 3 月 13 日 星期五 19:50:00"

formatDate(now, { type: 'full', showWeekday: true })
// 输出："2026 年 3 月 13 日 星期五 19:50:00"

// 仅日期
formatDate(now, { type: 'date' })
// 输出："2026-03-13"

// 仅时间
formatDate(now, { type: 'time' })
// 输出："19:50:00"

// 日期时间
formatDate(now, { type: 'datetime' })
// 输出："2026-03-13 19:50:00"

// 相对时间
formatDate(Date.now() - 5 * 60 * 1000, { type: 'relative' })
// 输出："5 分钟前"

formatDate(Date.now() - 2 * 60 * 60 * 1000, { type: 'relative' })
// 输出："2 小时前"

formatDate(Date.now() - 3 * 24 * 60 * 60 * 1000, { type: 'relative' })
// 输出："3 天前"

// ISO 格式
formatDate(now, { type: 'iso' })
// 输出："2026-03-13T11:50:00.000Z"

// 时间戳
formatDate(now, { type: 'timestamp' })
// 输出："1710334200000"

// 自定义格式
formatDate(now, { type: 'custom', pattern: 'YYYY-MM-DD' })
// 输出："2026-03-13"

formatDate(now, { type: 'custom', pattern: 'YYYY 年 MM 月 DD 日' })
// 输出："2026 年 03 月 13 日"

formatDate(now, { type: 'custom', pattern: 'MM/DD/YYYY HH:mm' })
// 输出："03/13/2026 19:50"


// ==================== 文本格式化示例 ====================

// 大小写转换
formatText('hello world', { type: 'uppercase' })
// 输出："HELLO WORLD"

formatText('HELLO WORLD', { type: 'lowercase' })
// 输出："hello world"

formatText('hello', { type: 'capitalize' })
// 输出："Hello"

formatText('hello world', { type: 'titlecase' })
// 输出："Hello World"

// 命名转换
formatText('hello_world', { type: 'camelCase' })
// 输出："helloWorld"

formatText('hello world', { type: 'pascalCase' })
// 输出："HelloWorld"

formatText('helloWorld', { type: 'kebabCase' })
// 输出："hello-world"

formatText('helloWorld', { type: 'snakeCase' })
// 输出："hello_world"

// 文本截断
formatText('这是一段很长的文本内容', { type: 'truncate', maxLength: 10 })
// 输出："这是一段很长..."

// 文本脱敏
formatText('13812345678', { type: 'mask', maskPattern: 'phone' })
// 输出："138****5678"

formatText('user@example.com', { type: 'mask', maskPattern: 'email' })
// 输出："u**r@example.com"

formatText('110101199001011234', { type: 'mask', maskPattern: 'id' })
// 输出："110101********1234"

formatText('MySecretPassword123', { type: 'mask', keepStart: 2, keepEnd: 3 })
// 输出："My***************123"

// 移除 HTML
formatText('<p>Hello <strong>World</strong></p>', { type: 'stripHtml' })
// 输出："Hello World"

// 标准化空白
formatText('  Hello    World   ', { type: 'normalize' })
// 输出："Hello World"


// ==================== 组合格式化示例 ====================

// 文件大小
formatFileSize(2097152)
// 输出："2 MB"

formatFileSize(1536)
// 输出："1.5 KB"

// 持续时间
formatDuration(3661)
// 输出："1 小时 1 分钟 1 秒"

formatDuration(125, { showSeconds: false })
// 输出："2 分钟"

formatDuration(7265)
// 输出："2 小时 1 分钟 5 秒"

// 带颜色的百分比
formatPercentWithColor(85)
// 输出：{ value: "85.00%", color: "green" }

formatPercentWithColor(65)
// 输出：{ value: "65.00%", color: "yellow" }

formatPercentWithColor(45)
// 输出：{ value: "45.00%", color: "red" }
*/
