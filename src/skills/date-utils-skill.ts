/**
 * 日期工具技能 - KAEL
 * 
 * 提供常用日期处理功能：
 * 1. 日期格式化
 * 2. 日期计算
 * 3. 相对时间
 */

/**
 * 日期格式化模式
 */
export type DateFormatPattern = 
  | 'YYYY-MM-DD'
  | 'YYYY/MM/DD'
  | 'DD/MM/YYYY'
  | 'MM/DD/YYYY'
  | 'YYYY-MM-DD HH:mm:ss'
  | 'YYYY/MM/DD HH:mm:ss'
  | 'DD/MM/YYYY HH:mm:ss'
  | 'HH:mm:ss'
  | 'HH:mm'
  | 'YYYY-MM'
  | 'YYYY'
  | 'MM-DD'
  | 'MM/DD'
  | 'dddd'
  | 'ddd'
  | 'MMMM YYYY'
  | 'custom';

/**
 * 日期格式化选项
 */
export interface DateFormatOptions {
  /** 格式化模式 */
  pattern?: DateFormatPattern | string;
  /** 语言环境，用于星期和月份名称 */
  locale?: 'zh-CN' | 'en-US' | 'ja-JP' | 'ko-KR';
  /** 时区，默认为本地时区 */
  timezone?: string;
}

/**
 * 日期计算单位
 */
export type DateUnit = 
  | 'millisecond'
  | 'second'
  | 'minute'
  | 'hour'
  | 'day'
  | 'week'
  | 'month'
  | 'year';

/**
 * 日期计算选项
 */
export interface DateCalculationOptions {
  /** 计算单位 */
  unit?: DateUnit;
  /** 是否向上取整 */
  roundUp?: boolean;
}

/**
 * 相对时间选项
 */
export interface RelativeTimeOptions {
  /** 语言环境 */
  locale?: 'zh-CN' | 'en-US' | 'ja-JP' | 'ko-KR';
  /** 是否显示精确时间 */
  precise?: boolean;
  /** 未来时间前缀 */
  futurePrefix?: string;
  /** 过去时间后缀 */
  pastSuffix?: string;
}

/**
 * 星期名称映射 (中文)
 */
const WEEKDAY_ZH = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];

/**
 * 星期名称映射 (英文)
 */
const WEEKDAY_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * 星期简称映射 (中文)
 */
const WEEKDAY_SHORT_ZH = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

/**
 * 星期简称映射 (英文)
 */
const WEEKDAY_SHORT_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * 月份名称映射 (中文)
 */
const MONTH_ZH = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];

/**
 * 月份名称映射 (英文)
 */
const MONTH_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/**
 * 补零函数
 * @param num - 需要补零的数字
 * @returns 补零后的字符串
 */
function padZero(num: number): string {
  return num.toString().padStart(2, '0');
}

/**
 * 获取星期名称
 * @param date - 日期对象
 * @param locale - 语言环境
 * @param short - 是否使用简称
 * @returns 星期名称
 */
function getWeekdayName(date: Date, locale: string = 'zh-CN', short: boolean = false): string {
  const day = date.getDay();
  
  if (locale.startsWith('zh')) {
    return short ? WEEKDAY_SHORT_ZH[day] : WEEKDAY_ZH[day];
  } else if (locale.startsWith('en')) {
    return short ? WEEKDAY_SHORT_EN[day] : WEEKDAY_EN[day];
  } else if (locale.startsWith('ja')) {
    const jaWeekdays = ['日', '月', '火', '水', '木', '金', '土'];
    return jaWeekdays[day];
  } else if (locale.startsWith('ko')) {
    const koWeekdays = ['일', '월', '화', '수', '목', '금', '토'];
    return koWeekdays[day];
  }
  
  return WEEKDAY_ZH[day];
}

/**
 * 获取月份名称
 * @param date - 日期对象
 * @param locale - 语言环境
 * @returns 月份名称
 */
function getMonthName(date: Date, locale: string = 'zh-CN'): string {
  const month = date.getMonth();
  
  if (locale.startsWith('zh')) {
    return MONTH_ZH[month];
  } else if (locale.startsWith('en')) {
    return MONTH_EN[month];
  } else if (locale.startsWith('ja')) {
    return `${month + 1}月`;
  } else if (locale.startsWith('ko')) {
    return `${month + 1}월`;
  }
  
  return MONTH_ZH[month];
}

/**
 * 格式化日期
 * 将日期对象格式化为指定格式的字符串
 * 
 * @param date - 需要格式化的日期，可以是 Date、时间戳或日期字符串
 * @param options - 格式化选项
 * @returns 格式化后的日期字符串
 * 
 * @example
 * formatDate(new Date()) // '2026-03-13'
 * formatDate(new Date(), { pattern: 'YYYY-MM-DD HH:mm:ss' }) // '2026-03-13 19:33:45'
 * formatDate(new Date(), { pattern: 'dddd', locale: 'zh-CN' }) // '星期五'
 * formatDate(1710360825000, { pattern: 'YYYY/MM/DD' }) // '2024/03/13'
 */
export function formatDate(
  date: Date | number | string,
  options: DateFormatOptions = {}
): string {
  const { pattern = 'YYYY-MM-DD', locale = 'zh-CN' } = options;
  
  // 转换为 Date 对象
  const targetDate = normalizeDate(date);
  
  if (isNaN(targetDate.getTime())) {
    throw new Error('Invalid date');
  }
  
  // 处理预定义模式
  if (pattern !== 'custom') {
    return formatWithPattern(targetDate, pattern, locale);
  }
  
  // 自定义模式处理
  return targetDate.toLocaleString(locale);
}

/**
 * 根据模式格式化日期
 */
function formatWithPattern(date: Date, pattern: string, locale: string): string {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const seconds = date.getSeconds();
  const milliseconds = date.getMilliseconds();
  
  let result = pattern;
  
  // 先处理特殊模式（星期、月份），避免被数字替换覆盖
  if (result.includes('MMMM')) {
    result = result.replace('MMMM', getMonthName(date, locale));
  }
  
  if (result.includes('dddd')) {
    result = result.replace('dddd', getWeekdayName(date, locale, false));
  } else if (result.includes('ddd')) {
    result = result.replace('ddd', getWeekdayName(date, locale, true));
  }
  
  // 再处理数字模式
  result = result
    .replace('YYYY', year.toString())
    .replace('YY', year.toString().slice(-2))
    .replace('MM', padZero(month))
    .replace('DD', padZero(day))
    .replace('HH', padZero(hours))
    .replace('hh', padZero(hours % 12 || 12))
    .replace('mm', padZero(minutes))
    .replace('ss', padZero(seconds))
    .replace('SSS', milliseconds.toString().padStart(3, '0'))
    .replace('A', hours >= 12 ? 'PM' : 'AM');
  
  return result;
}

/**
 * 解析日期字符串
 * 将日期字符串解析为 Date 对象
 * 
 * @param dateString - 日期字符串
 * @param format - 日期格式，默认为 'YYYY-MM-DD'
 * @returns Date 对象
 * 
 * @example
 * parseDate('2026-03-13') // Date(2026-03-13)
 * parseDate('13/03/2026', 'DD/MM/YYYY') // Date(2026-03-13)
 * parseDate('2026-03-13 19:33:45', 'YYYY-MM-DD HH:mm:ss') // Date(2026-03-13 19:33:45)
 */
export function parseDate(dateString: string, format: string = 'YYYY-MM-DD'): Date {
  const now = new Date();
  let year = now.getFullYear();
  let month = 0;
  let day = 1;
  let hours = 0;
  let minutes = 0;
  let seconds = 0;
  
  // 简单的模式匹配
  const patterns: { [key: string]: RegExp } = {
    'YYYY-MM-DD': /^(\d{4})-(\d{2})-(\d{2})$/,
    'YYYY/MM/DD': /^(\d{4})\/(\d{2})\/(\d{2})$/,
    'DD/MM/YYYY': /^(\d{2})\/(\d{2})\/(\d{4})$/,
    'MM/DD/YYYY': /^(\d{2})\/(\d{2})\/(\d{4})$/,
    'YYYY-MM-DD HH:mm:ss': /^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2}):(\d{2})$/,
    'YYYY/MM/DD HH:mm:ss': /^(\d{4})\/(\d{2})\/(\d{2})\s+(\d{2}):(\d{2}):(\d{2})$/,
    'HH:mm:ss': /^(\d{2}):(\d{2}):(\d{2})$/,
    'HH:mm': /^(\d{2}):(\d{2})$/,
    'YYYY-MM': /^(\d{4})-(\d{2})$/,
  };
  
  const regex = patterns[format];
  if (!regex) {
    throw new Error(`Unsupported format: ${format}`);
  }
  
  const match = dateString.match(regex);
  if (!match) {
    throw new Error(`Date string does not match format: ${format}`);
  }
  
  // 根据格式提取值
  if (format.includes('YYYY')) {
    year = parseInt(match[1], 10);
    if (format.startsWith('DD')) {
      day = parseInt(match[1], 10);
      month = parseInt(match[2], 10) - 1;
      year = parseInt(match[3], 10);
    } else if (format.startsWith('MM')) {
      month = parseInt(match[1], 10) - 1;
      day = parseInt(match[2], 10);
      year = parseInt(match[3], 10);
    } else {
      month = parseInt(match[2], 10) - 1;
      day = parseInt(match[3], 10);
    }
  }
  
  // 提取时间
  if (format.includes('HH')) {
    const timeMatch = dateString.match(/(\d{2}):(\d{2})(?::(\d{2}))?/);
    if (timeMatch) {
      hours = parseInt(timeMatch[1], 10);
      minutes = parseInt(timeMatch[2], 10);
      if (timeMatch[3]) {
        seconds = parseInt(timeMatch[3], 10);
      }
    }
  }
  
  return new Date(year, month, day, hours, minutes, seconds);
}

/**
 * 日期计算
 * 对日期进行加减运算
 * 
 * @param date - 基准日期
 * @param amount - 要添加的数量（负数表示减少）
 * @param unit - 时间单位
 * @returns 计算后的新日期
 * 
 * @example
 * addDays(new Date('2026-03-13'), 7) // 7 天后的日期
 * addDays(new Date('2026-03-13'), -3) // 3 天前的日期
 * addMonths(new Date('2026-03-13'), 2) // 2 个月后的日期
 * addYears(new Date('2026-03-13'), 1) // 1 年后的日期
 */
export function addDays(date: Date | number | string, amount: number): Date {
  const targetDate = normalizeDate(date);
  const result = new Date(targetDate);
  result.setDate(result.getDate() + amount);
  return result;
}

/**
 * 添加周
 */
export function addWeeks(date: Date | number | string, amount: number): Date {
  return addDays(date, amount * 7);
}

/**
 * 添加月
 * 自动处理月末边界情况
 */
export function addMonths(date: Date | number | string, amount: number): Date {
  const targetDate = normalizeDate(date);
  const result = new Date(targetDate);
  const targetMonth = result.getMonth() + amount;
  
  // 计算目标年份和月份
  result.setFullYear(result.getFullYear() + Math.floor(targetMonth / 12));
  result.setMonth(targetMonth % 12);
  
  // 处理月末边界情况
  const lastDayOfMonth = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();
  if (targetDate.getDate() > lastDayOfMonth) {
    result.setDate(lastDayOfMonth);
  }
  
  return result;
}

/**
 * 添加年
 */
export function addYears(date: Date | number | string, amount: number): Date {
  const targetDate = normalizeDate(date);
  const result = new Date(targetDate);
  result.setFullYear(result.getFullYear() + amount);
  
  // 处理闰年 2 月 29 日的情况
  if (targetDate.getMonth() === 1 && targetDate.getDate() === 29) {
    const lastDayOfMonth = new Date(result.getFullYear(), 2, 0).getDate();
    if (lastDayOfMonth < 29) {
      result.setDate(lastDayOfMonth);
    }
  }
  
  return result;
}

/**
 * 添加小时
 */
export function addHours(date: Date | number | string, amount: number): Date {
  const targetDate = normalizeDate(date);
  const result = new Date(targetDate);
  result.setHours(result.getHours() + amount);
  return result;
}

/**
 * 添加分钟
 */
export function addMinutes(date: Date | number | string, amount: number): Date {
  const targetDate = normalizeDate(date);
  const result = new Date(targetDate);
  result.setMinutes(result.getMinutes() + amount);
  return result;
}

/**
 * 添加秒
 */
export function addSeconds(date: Date | number | string, amount: number): Date {
  const targetDate = normalizeDate(date);
  const result = new Date(targetDate);
  result.setSeconds(result.getSeconds() + amount);
  return result;
}

/**
 * 计算两个日期之间的差异
 * 
 * @param date1 - 第一个日期
 * @param date2 - 第二个日期
 * @param unit - 返回差异的单位
 * @returns 日期差异（date1 - date2）
 * 
 * @example
 * diffInDays(new Date('2026-03-20'), new Date('2026-03-13')) // 7
 * diffInHours(new Date('2026-03-13 19:00'), new Date('2026-03-13 10:00')) // 9
 * diffInMonths(new Date('2026-05-13'), new Date('2026-03-13')) // 2
 */
export function diffInDays(date1: Date | number | string, date2: Date | number | string): number {
  const d1 = normalizeDate(date1);
  const d2 = normalizeDate(date2);
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.floor((d1.getTime() - d2.getTime()) / msPerDay);
}

/**
 * 计算小时差异
 */
export function diffInHours(date1: Date | number | string, date2: Date | number | string): number {
  const d1 = normalizeDate(date1);
  const d2 = normalizeDate(date2);
  const msPerHour = 60 * 60 * 1000;
  return Math.floor((d1.getTime() - d2.getTime()) / msPerHour);
}

/**
 * 计算分钟差异
 */
export function diffInMinutes(date1: Date | number | string, date2: Date | number | string): number {
  const d1 = normalizeDate(date1);
  const d2 = normalizeDate(date2);
  const msPerMinute = 60 * 1000;
  return Math.floor((d1.getTime() - d2.getTime()) / msPerMinute);
}

/**
 * 计算月差异
 * 考虑年份和月份
 */
export function diffInMonths(date1: Date | number | string, date2: Date | number | string): number {
  const d1 = normalizeDate(date1);
  const d2 = normalizeDate(date2);
  return (d1.getFullYear() - d2.getFullYear()) * 12 + (d1.getMonth() - d2.getMonth());
}

/**
 * 计算年差异
 */
export function diffInYears(date1: Date | number | string, date2: Date | number | string): number {
  const d1 = normalizeDate(date1);
  const d2 = normalizeDate(date2);
  return d1.getFullYear() - d2.getFullYear();
}

/**
 * 获取相对时间描述
 * 将日期转换为人类可读的相对时间描述
 * 
 * @param date - 需要转换的日期
 * @param options - 选项
 * @returns 相对时间描述字符串
 * 
 * @example
 * getRelativeTime(new Date(Date.now() - 5 * 60 * 1000)) // '5 分钟前'
 * getRelativeTime(new Date(Date.now() - 2 * 60 * 60 * 1000)) // '2 小时前'
 * getRelativeTime(new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)) // '3 天前'
 * getRelativeTime(new Date(Date.now() + 1 * 24 * 60 * 60 * 1000)) // '1 天后'
 */
export function getRelativeTime(
  date: Date | number | string,
  options: RelativeTimeOptions = {}
): string {
  const { locale = 'zh-CN', precise = false } = options;
  
  const targetDate = normalizeDate(date);
  const now = new Date();
  const diffMs = targetDate.getTime() - now.getTime();
  const diffSeconds = Math.floor(Math.abs(diffMs) / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);
  
  const isFuture = diffMs > 0;
  
  // 中文相对时间
  if (locale.startsWith('zh')) {
    const prefix = options.futurePrefix || '';
    const suffix = options.pastSuffix || '前';
    
    let timeStr: string;
    
    if (diffSeconds < 60) {
      timeStr = '刚刚';
    } else if (diffMinutes < 60) {
      timeStr = `${diffMinutes}分钟`;
    } else if (diffHours < 24) {
      timeStr = `${diffHours}小时`;
    } else if (diffDays < 7) {
      timeStr = `${diffDays}天`;
    } else if (diffWeeks < 4) {
      timeStr = `${diffWeeks}周`;
    } else if (diffMonths < 12) {
      timeStr = `${diffMonths}个月`;
    } else {
      timeStr = `${diffYears}年`;
    }
    
    if (isFuture) {
      return `${prefix}${timeStr}`;
    } else {
      return timeStr === '刚刚' ? timeStr : `${timeStr}${suffix}`;
    }
  }
  
  // 英文相对时间
  if (locale.startsWith('en')) {
    const prefix = options.futurePrefix || 'in ';
    const suffix = options.pastSuffix || ' ago';
    
    let timeStr: string;
    
    if (diffSeconds < 60) {
      timeStr = 'just now';
    } else if (diffMinutes < 60) {
      timeStr = `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''}`;
    } else if (diffHours < 24) {
      timeStr = `${diffHours} hour${diffHours > 1 ? 's' : ''}`;
    } else if (diffDays < 7) {
      timeStr = `${diffDays} day${diffDays > 1 ? 's' : ''}`;
    } else if (diffWeeks < 4) {
      timeStr = `${diffWeeks} week${diffWeeks > 1 ? 's' : ''}`;
    } else if (diffMonths < 12) {
      timeStr = `${diffMonths} month${diffMonths > 1 ? 's' : ''}`;
    } else {
      timeStr = `${diffYears} year${diffYears > 1 ? 's' : ''}`;
    }
    
    if (isFuture) {
      return `${prefix}${timeStr}`;
    } else {
      return timeStr === 'just now' ? timeStr : `${timeStr}${suffix}`;
    }
  }
  
  // 默认中文
  return getRelativeTime(date, { ...options, locale: 'zh-CN' });
}

/**
 * 判断日期是否在今天
 */
export function isToday(date: Date | number | string): boolean {
  const targetDate = normalizeDate(date);
  const now = new Date();
  return (
    targetDate.getDate() === now.getDate() &&
    targetDate.getMonth() === now.getMonth() &&
    targetDate.getFullYear() === now.getFullYear()
  );
}

/**
 * 判断日期是否在昨天
 */
export function isYesterday(date: Date | number | string): boolean {
  const targetDate = normalizeDate(date);
  const yesterday = addDays(new Date(), -1);
  return (
    targetDate.getDate() === yesterday.getDate() &&
    targetDate.getMonth() === yesterday.getMonth() &&
    targetDate.getFullYear() === yesterday.getFullYear()
  );
}

/**
 * 判断日期是否在明天
 */
export function isTomorrow(date: Date | number | string): boolean {
  const targetDate = normalizeDate(date);
  const tomorrow = addDays(new Date(), 1);
  return (
    targetDate.getDate() === tomorrow.getDate() &&
    targetDate.getMonth() === tomorrow.getMonth() &&
    targetDate.getFullYear() === tomorrow.getFullYear()
  );
}

/**
 * 判断是否是闰年
 */
export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
}

/**
 * 获取指定月份的天数
 */
export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/**
 * 获取指定年份的天数
 */
export function getDaysInYear(year: number): number {
  return isLeapYear(year) ? 366 : 365;
}

/**
 * 标准化日期输入
 * 将各种类型的日期输入转换为 Date 对象
 */
function normalizeDate(date: Date | number | string): Date {
  if (date instanceof Date) {
    return new Date(date.getTime());
  }
  
  if (typeof date === 'number') {
    // 判断是时间戳（毫秒）还是秒
    if (date > 1e12) {
      return new Date(date);
    } else {
      return new Date(date * 1000);
    }
  }
  
  if (typeof date === 'string') {
    return new Date(date);
  }
  
  return new Date();
}

/**
 * 获取当前时间戳（毫秒）
 */
export function now(): number {
  return Date.now();
}

/**
 * 获取当前时间戳（秒）
 */
export function nowInSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

// ============================================
// 使用示例
// ============================================

if (require.main === module) {
  console.log('=== 日期工具技能 - 使用示例 ===\n');
  
  const currentDate = new Date();
  
  // 1. 日期格式化示例
  console.log('1️⃣ 日期格式化:');
  console.log(`   默认格式：${formatDate(currentDate)}`);
  console.log(`   完整时间：${formatDate(currentDate, { pattern: 'YYYY-MM-DD HH:mm:ss' })}`);
  console.log(`   中文星期：${formatDate(currentDate, { pattern: 'dddd', locale: 'zh-CN' })}`);
  console.log(`   英文月份：${formatDate(currentDate, { pattern: 'MMMM YYYY', locale: 'en-US' })}`);
  console.log(`   时间戳：${formatDate(1710360825000, { pattern: 'YYYY/MM/DD HH:mm:ss' })}\n`);
  
  // 2. 日期计算示例
  console.log('2️⃣ 日期计算:');
  console.log(`   当前日期：${formatDate(currentDate)}`);
  console.log(`   7 天后：${formatDate(addDays(currentDate, 7))}`);
  console.log(`   3 天前：${formatDate(addDays(currentDate, -3))}`);
  console.log(`   2 个月后：${formatDate(addMonths(currentDate, 2))}`);
  console.log(`   1 年后：${formatDate(addYears(currentDate, 1))}`);
  console.log(`   下周今天：${formatDate(addWeeks(currentDate, 1))}\n`);
  
  // 3. 日期差异示例
  console.log('3️⃣ 日期差异:');
  const future = addDays(currentDate, 30);
  console.log(`   30 天后相差：${diffInDays(future, currentDate)} 天`);
  console.log(`   相差小时：${diffInHours(future, currentDate)} 小时`);
  console.log(`   相差月数：${diffInMonths(addMonths(currentDate, 3), currentDate)} 个月\n`);
  
  // 4. 相对时间示例
  console.log('4️⃣ 相对时间:');
  console.log(`   5 分钟前：${getRelativeTime(addMinutes(currentDate, -5))}`);
  console.log(`   2 小时前：${getRelativeTime(addHours(currentDate, -2))}`);
  console.log(`   3 天前：${getRelativeTime(addDays(currentDate, -3))}`);
  console.log(`   1 周后：${getRelativeTime(addWeeks(currentDate, 1))}`);
  console.log(`   英文相对：${getRelativeTime(addHours(currentDate, -2), { locale: 'en-US' })}\n`);
  
  // 5. 特殊判断示例
  console.log('5️⃣ 特殊判断:');
  console.log(`   今天是闰年吗：${isLeapYear(currentDate.getFullYear())}`);
  console.log(`   2 月天数：${getDaysInMonth(currentDate.getFullYear(), 2)}`);
  console.log(`   今年天数：${getDaysInYear(currentDate.getFullYear())}`);
  console.log(`   当前时间戳：${now()} ms`);
  console.log(`   当前时间戳 (秒)：${nowInSeconds()} s\n`);
  
  // 6. 日期解析示例
  console.log('6️⃣ 日期解析:');
  console.log(`   解析 '2026-03-13': ${formatDate(parseDate('2026-03-13'))}`);
  console.log(`   解析 '13/03/2026': ${formatDate(parseDate('13/03/2026', 'DD/MM/YYYY'))}`);
  console.log(`   解析 '2026-03-13 19:33:45': ${formatDate(parseDate('2026-03-13 19:33:45', 'YYYY-MM-DD HH:mm:ss'), { pattern: 'YYYY-MM-DD HH:mm:ss' })}\n`);
  
  console.log('✅ 所有示例执行完成！');
}
