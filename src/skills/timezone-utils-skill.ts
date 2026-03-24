/**
 * 时区工具技能
 * 
 * 功能:
 * 1. 时区转换
 * 2. 时间格式化
 * 3. DST (夏令时) 处理
 * 
 * @module skills/timezone-utils
 */

// ==================== 时区数据 ====================

/**
 * 常见时区列表
 */
export const TIMEZONES = {
  // 亚洲
  'Asia/Shanghai': '中国标准时间 (CST)',
  'Asia/Tokyo': '日本标准时间 (JST)',
  'Asia/Seoul': '韩国标准时间 (KST)',
  'Asia/Singapore': '新加坡标准时间 (SGT)',
  'Asia/Hong_Kong': '香港标准时间 (HKT)',
  'Asia/Taipei': '台北标准时间 (CST)',
  'Asia/Bangkok': '泰国标准时间 (ICT)',
  'Asia/Jakarta': '印度尼西亚西部时间 (WIB)',
  'Asia/Manila': '菲律宾标准时间 (PST)',
  'Asia/Kuala_Lumpur': '马来西亚标准时间 (MYT)',
  'Asia/Dubai': '海湾标准时间 (GST)',
  'Asia/Kolkata': '印度标准时间 (IST)',
  'Asia/Karachi': '巴基斯坦标准时间 (PKT)',
  'Asia/Dhaka': '孟加拉国标准时间 (BST)',
  'Asia/Yekaterinburg': '叶卡捷琳堡时间 (YEKT)',
  'Asia/Omsk': '鄂木斯克时间 (OMST)',
  'Asia/Krasnoyarsk': '克拉斯诺亚尔斯克时间 (KRAT)',
  'Asia/Irkutsk': '伊尔库茨克时间 (IRKT)',
  'Asia/Yakutsk': '雅库茨克时间 (YAKT)',
  'Asia/Vladivostok': '符拉迪沃斯托克时间 (VLAT)',
  'Asia/Magadan': '马加丹时间 (MAGT)',
  'Asia/Kamchatka': '堪察加时间 (PETT)',
  
  // 欧洲
  'Europe/London': '格林威治标准时间 (GMT)',
  'Europe/Paris': '中欧时间 (CET)',
  'Europe/Berlin': '中欧时间 (CET)',
  'Europe/Rome': '中欧时间 (CET)',
  'Europe/Madrid': '中欧时间 (CET)',
  'Europe/Amsterdam': '中欧时间 (CET)',
  'Europe/Brussels': '中欧时间 (CET)',
  'Europe/Vienna': '中欧时间 (CET)',
  'Europe/Stockholm': '中欧时间 (CET)',
  'Europe/Oslo': '中欧时间 (CET)',
  'Europe/Copenhagen': '中欧时间 (CET)',
  'Europe/Helsinki': '东欧时间 (EET)',
  'Europe/Athens': '东欧时间 (EET)',
  'Europe/Istanbul': '土耳其时间 (TRT)',
  'Europe/Moscow': '莫斯科标准时间 (MSK)',
  'Europe/Kaliningrad': '加里宁格勒时间 (EET)',
  'Europe/Samara': '萨马拉时间 (SAMT)',
  
  // 美洲
  'America/New_York': '美国东部时间 (ET)',
  'America/Chicago': '美国中部时间 (CT)',
  'America/Denver': '美国山地时间 (MT)',
  'America/Los_Angeles': '美国太平洋时间 (PT)',
  'America/Anchorage': '阿拉斯加标准时间 (AKST)',
  'America/Honolulu': '夏威夷 - 阿留申标准时间 (HST)',
  'America/Toronto': '东部标准时间 (EST)',
  'America/Vancouver': '太平洋标准时间 (PST)',
  'America/Montreal': '东部标准时间 (EST)',
  'America/Mexico_City': '墨西哥中部时间 (CST)',
  'America/Sao_Paulo': '巴西利亚时间 (BRT)',
  'America/Argentina/Buenos_Aires': '阿根廷时间 (ART)',
  'America/Bogota': '哥伦比亚时间 (COT)',
  'America/Lima': '秘鲁时间 (PET)',
  'America/Santiago': '智利标准时间 (CLT)',
  
  // 大洋洲
  'Australia/Sydney': '澳大利亚东部标准时间 (AEST)',
  'Australia/Melbourne': '澳大利亚东部标准时间 (AEST)',
  'Australia/Brisbane': '澳大利亚东部标准时间 (AEST)',
  'Australia/Perth': '澳大利亚西部标准时间 (AWST)',
  'Australia/Adelaide': '澳大利亚中部标准时间 (ACST)',
  'Australia/Darwin': '澳大利亚中部标准时间 (ACST)',
  'Australia/Hobart': '澳大利亚东部标准时间 (AEST)',
  'Pacific/Auckland': '新西兰标准时间 (NZST)',
  'Pacific/Fiji': '斐济时间 (FJT)',
  'Pacific/Guam': '查莫罗标准时间 (ChST)',
  'Pacific/Port_Moresby': '巴布亚新几内亚时间 (PGT)',
  
  // 非洲
  'Africa/Cairo': '埃及标准时间 (EET)',
  'Africa/Johannesburg': '南非标准时间 (SAST)',
  'Africa/Lagos': '西非时间 (WAT)',
  'Africa/Nairobi': '东非时间 (EAT)',
  'Africa/Casablanca': '摩洛哥标准时间 (WET)',
  'Africa/Addis_Ababa': '东非时间 (EAT)',
  'Africa/Accra': '格林威治标准时间 (GMT)',
  'Africa/Algiers': '中欧时间 (CET)',
  'Africa/Tunis': '中欧时间 (CET)',
  'Africa/Khartoum': '中非时间 (CAT)',
  'Africa/Kampala': '东非时间 (EAT)',
  'Africa/Dar_es_Salaam': '东非时间 (EAT)',
  'Africa/Lusaka': '中非时间 (CAT)',
  'Africa/Harare': '中非时间 (CAT)',
  'Africa/Maputo': '中非时间 (CAT)',
  'Africa/Gaborone': '中非时间 (CAT)',
  'Africa/Windhoek': '中非时间 (CAT)',
  'Africa/Luanda': '西非时间 (WAT)',
  'Africa/Douala': '西非时间 (WAT)',
  'Africa/Abidjan': '格林威治标准时间 (GMT)',
  'Africa/Dakar': '格林威治标准时间 (GMT)',
  'Africa/Bamako': '格林威治标准时间 (GMT)',
  'Africa/Freetown': '格林威治标准时间 (GMT)',
  'Africa/Monrovia': '格林威治标准时间 (GMT)',
  'Africa/Conakry': '格林威治标准时间 (GMT)',
  'Africa/Banjul': '格林威治标准时间 (GMT)',
  'Africa/Bissau': '格林威治标准时间 (GMT)',
  'Africa/Nouakchott': '格林威治标准时间 (GMT)',
  'Africa/Niamey': '西非时间 (WAT)',
  'Africa/Ouagadougou': '格林威治标准时间 (GMT)',
  'Africa/Lome': '格林威治标准时间 (GMT)',
  'Africa/Cotonou': '西非时间 (WAT)',
  'Africa/Porto-Novo': '西非时间 (WAT)',
  'Africa/Libreville': '西非时间 (WAT)',
  'Africa/Malabo': '西非时间 (WAT)',
  'Africa/Sao_Tome': '格林威治标准时间 (GMT)',
  'Africa/Kinshasa': '西非时间 (WAT)',
  'Africa/Brazzaville': '西非时间 (WAT)',
  'Africa/Bangui': '西非时间 (WAT)',
  'Africa/Yaounde': '西非时间 (WAT)',
  'Africa/Ndjamena': '西非时间 (WAT)',
  'Africa/Niamey': '西非时间 (WAT)',
  'Africa/Timbuktu': '格林威治标准时间 (GMT)',
  'Africa/Djibouti': '东非时间 (EAT)',
  'Africa/Mogadishu': '东非时间 (EAT)',
  'Africa/Kigali': '中非时间 (CAT)',
  'Africa/Bujumbura': '中非时间 (CAT)',
  'Africa/Mbabane': '南非标准时间 (SAST)',
  'Africa/Maseru': '南非标准时间 (SAST)',
  'Africa/Blantyre': '中非时间 (CAT)',
  'Africa/Lubumbashi': '中非时间 (CAT)',
  'Africa/Kigali': '中非时间 (CAT)',
  'Africa/Bujumbura': '中非时间 (CAT)',
  'Africa/Mbabane': '南非标准时间 (SAST)',
  'Africa/Maseru': '南非标准时间 (SAST)',
  'Africa/Blantyre': '中非时间 (CAT)',
  'Africa/Lubumbashi': '中非时间 (CAT)',
} as const;

export type Timezone = keyof typeof TIMEZONES;

// ==================== 时间格式化 ====================

/**
 * 格式化选项
 */
export interface FormatOptions {
  /** 日期格式 */
  dateFormat?: 'YYYY-MM-DD' | 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY 年 MM 月 DD 日';
  /** 时间格式 */
  timeFormat?: 'HH:mm:ss' | 'hh:mm:ss A' | 'HH:mm';
  /** 是否显示时区 */
  showTimezone?: boolean;
  /** 语言环境 */
  locale?: string;
}

/**
 * 格式化日期时间
 * @param date - 日期对象或时间戳
 * @param timezone - 时区，默认当前系统时区
 * @param options - 格式化选项
 * @returns 格式化后的字符串
 */
export function formatDateTime(
  date: Date | number,
  timezone?: string,
  options: FormatOptions = {}
): string {
  const d = typeof date === 'number' ? new Date(date) : date;
  
  const {
    dateFormat = 'YYYY-MM-DD',
    timeFormat = 'HH:mm:ss',
    showTimezone = false,
    locale = 'zh-CN'
  } = options;
  
  // 使用 Intl.DateTimeFormat 获取指定时区的日期组件
  const timeZone = timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
  
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  
  const parts = formatter.formatToParts(d);
  const partValues: Record<string, string> = {};
  parts.forEach(part => {
    partValues[part.type] = part.value;
  });
  
  const year = partValues.year;
  const month = partValues.month;
  const day = partValues.day;
  const hours = partValues.hour;
  const minutes = partValues.minute;
  const seconds = partValues.second;
  
  // 格式化日期
  let dateStr = dateFormat;
  dateStr = dateStr.replace('YYYY', String(year));
  dateStr = dateStr.replace('MM', month);
  dateStr = dateStr.replace('DD', day);
  
  // 格式化时间
  let timeStr = timeFormat;
  let displayHours = parseInt(hours);
  
  if (timeFormat.includes('A')) {
    // 12 小时制
    const ampm = displayHours >= 12 ? 'PM' : 'AM';
    displayHours = displayHours % 12 || 12;
    timeStr = timeStr.replace('hh', String(displayHours).padStart(2, '0'));
    timeStr = timeStr.replace('A', ampm);
  } else {
    // 24 小时制
    timeStr = timeStr.replace('HH', hours);
  }
  
  timeStr = timeStr.replace('mm', minutes);
  timeStr = timeStr.replace('ss', seconds);
  
  // 组合结果
  let result = `${dateStr} ${timeStr}`;
  
  if (showTimezone && timezone) {
    const tzName = TIMEZONES[timezone as Timezone] || timezone;
    result += ` (${tzName})`;
  }
  
  return result;
}

/**
 * 格式化相对时间 (如 "3 小时前")
 * @param date - 日期对象或时间戳
 * @param locale - 语言环境
 * @returns 相对时间字符串
 */
export function formatRelativeTime(date: Date | number, locale: string = 'zh-CN'): string {
  const d = typeof date === 'number' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);
  
  if (diffSecs < 60) {
    return locale === 'zh-CN' ? '刚刚' : 'just now';
  } else if (diffMins < 60) {
    return locale === 'zh-CN' ? `${diffMins}分钟前` : `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  } else if (diffHours < 24) {
    return locale === 'zh-CN' ? `${diffHours}小时前` : `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  } else if (diffDays < 7) {
    return locale === 'zh-CN' ? `${diffDays}天前` : `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  } else if (diffWeeks < 4) {
    return locale === 'zh-CN' ? `${diffWeeks}周前` : `${diffWeeks} week${diffWeeks > 1 ? 's' : ''} ago`;
  } else if (diffMonths < 12) {
    return locale === 'zh-CN' ? `${diffMonths}个月前` : `${diffMonths} month${diffMonths > 1 ? 's' : ''} ago`;
  } else {
    return locale === 'zh-CN' ? `${diffYears}年前` : `${diffYears} year${diffYears > 1 ? 's' : ''} ago`;
  }
}

/**
 * 格式化持续时间 (如 "2 小时 30 分钟")
 * @param ms - 毫秒数
 * @param options - 格式化选项
 * @returns 格式化后的字符串
 */
export function formatDuration(ms: number, options: { verbose?: boolean } = {}): string {
  const { verbose = false } = options;
  
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  const remainingHours = hours % 24;
  const remainingMinutes = minutes % 60;
  const remainingSeconds = seconds % 60;
  
  const parts: string[] = [];
  
  if (days > 0) {
    parts.push(verbose ? `${days}天` : `${days}d`);
  }
  if (remainingHours > 0) {
    parts.push(verbose ? `${remainingHours}小时` : `${remainingHours}h`);
  }
  if (remainingMinutes > 0) {
    parts.push(verbose ? `${remainingMinutes}分钟` : `${remainingMinutes}m`);
  }
  if (remainingSeconds > 0 || parts.length === 0) {
    parts.push(verbose ? `${remainingSeconds}秒` : `${remainingSeconds}s`);
  }
  
  return parts.join(' ');
}

// ==================== 时区转换 ====================

/**
 * 时区转换
 * @param date - 日期对象或时间戳
 * @param fromTimezone - 源时区
 * @param toTimezone - 目标时区
 * @returns 转换后的 Date 对象
 */
export function convertTimezone(
  date: Date | number,
  fromTimezone: string,
  toTimezone: string
): Date {
  const d = typeof date === 'number' ? new Date(date) : date;
  
  // 获取源时区的本地时间字符串
  const fromTimeStr = d.toLocaleString('en-US', { timeZone: fromTimezone });
  
  // 解析源时区时间为 UTC 时间戳
  const fromDate = new Date(fromTimeStr);
  
  // 获取源时区相对于 UTC 的偏移
  const fromOffset = getTimezoneOffset(fromTimezone, d);
  
  // 获取目标时区相对于 UTC 的偏移
  const toOffset = getTimezoneOffset(toTimezone, d);
  
  // 计算时差 (分钟)
  const diffMinutes = toOffset - fromOffset;
  
  // 应用时差
  return new Date(d.getTime() + diffMinutes * 60 * 1000);
}

/**
 * 获取时区偏移量 (分钟)
 * @param timezone - 时区
 * @param date - 日期对象，用于计算 DST
 * @returns 偏移量 (分钟)
 */
export function getTimezoneOffset(timezone: string, date: Date = new Date()): number {
  const dateStr = date.toLocaleString('en-US', { timeZone: timezone });
  const localDate = new Date(dateStr);
  const utcDate = new Date(dateStr.toLocaleString('en-US', { timeZone: 'UTC' }));
  
  return (utcDate.getTime() - localDate.getTime()) / (1000 * 60);
}

/**
 * 获取时区缩写 (如 CST, EST, PST)
 * @param timezone - 时区
 * @param date - 日期对象，用于计算 DST
 * @returns 时区缩写
 */
export function getTimezoneAbbreviation(timezone: string, date: Date = new Date()): string {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    timeZoneName: 'short'
  });
  
  const parts = formatter.formatToParts(date);
  const tzPart = parts.find(part => part.type === 'timeZoneName');
  return tzPart?.value || '';
}

/**
 * 检查时区是否有效
 * @param timezone - 时区字符串
 * @returns 是否有效
 */
export function isValidTimezone(timezone: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone });
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * 获取所有可用时区列表
 * @returns 时区数组
 */
export function getAvailableTimezones(): string[] {
  return Intl.supportedValuesOf('timeZone');
}

// ==================== DST (夏令时) 处理 ====================

/**
 * 检查指定时区在指定日期是否处于夏令时
 * @param timezone - 时区
 * @param date - 日期对象
 * @returns 是否处于夏令时
 */
export function isDST(timezone: string, date: Date = new Date()): boolean {
  const jan = new Date(date.getFullYear(), 0, 1);
  const jul = new Date(date.getFullYear(), 6, 1);
  
  const janOffset = getTimezoneOffset(timezone, jan);
  const julOffset = getTimezoneOffset(timezone, jul);
  const currentOffset = getTimezoneOffset(timezone, date);
  
  // 北半球：夏季偏移更小 (因为夏令时提前一小时)
  // 南半球：夏季偏移更大
  const maxOffset = Math.max(janOffset, julOffset);
  return currentOffset !== maxOffset;
}

/**
 * 获取指定时区的 DST 信息
 * @param timezone - 时区
 * @param year - 年份
 * @returns DST 信息
 */
export function getDSTInfo(timezone: string, year: number = new Date().getFullYear()): {
  isDSTObserved: boolean;
  dstStart?: Date;
  dstEnd?: Date;
  dstOffset: number;
} {
  // 检查该时区是否观察 DST
  const jan = new Date(year, 0, 1);
  const jul = new Date(year, 6, 1);
  
  const janOffset = getTimezoneOffset(timezone, jan);
  const julOffset = getTimezoneOffset(timezone, jul);
  
  const isDSTObserved = janOffset !== julOffset;
  const dstOffset = Math.abs(janOffset - julOffset);
  
  if (!isDSTObserved) {
    return { isDSTObserved: false, dstOffset: 0 };
  }
  
  // 查找 DST 开始和结束日期 (简化版本)
  let dstStart: Date | undefined;
  let dstEnd: Date | undefined;
  
  // 北半球通常 3-4 月开始，10-11 月结束
  // 南半球通常 9-10 月开始，3-4 月结束
  const isNorthernHemisphere = janOffset > julOffset;
  
  if (isNorthernHemisphere) {
    // 北半球
    for (let month = 2; month < 5; month++) {
      for (let day = 1; day <= 31; day++) {
        const date = new Date(year, month, day);
        if (date.getMonth() !== month) break;
        
        const isDSTOnDate = isDST(timezone, date);
        const wasDSTPrevDay = day > 1 ? isDST(timezone, new Date(year, month, day - 1)) : false;
        
        if (isDSTOnDate && !wasDSTPrevDay) {
          dstStart = date;
          break;
        }
      }
      if (dstStart) break;
    }
    
    for (let month = 9; month < 12; month++) {
      for (let day = 1; day <= 31; day++) {
        const date = new Date(year, month, day);
        if (date.getMonth() !== month) break;
        
        const isDSTOnDate = isDST(timezone, date);
        const wasDSTPrevDay = day > 1 ? isDST(timezone, new Date(year, month, day - 1)) : false;
        
        if (!isDSTOnDate && wasDSTPrevDay) {
          dstEnd = date;
          break;
        }
      }
      if (dstEnd) break;
    }
  } else {
    // 南半球
    for (let month = 8; month < 11; month++) {
      for (let day = 1; day <= 31; day++) {
        const date = new Date(year, month, day);
        if (date.getMonth() !== month) break;
        
        const isDSTOnDate = isDST(timezone, date);
        const wasDSTPrevDay = day > 1 ? isDST(timezone, new Date(year, month, day - 1)) : false;
        
        if (isDSTOnDate && !wasDSTPrevDay) {
          dstStart = date;
          break;
        }
      }
      if (dstStart) break;
    }
    
    for (let month = 2; month < 5; month++) {
      for (let day = 1; day <= 31; day++) {
        const date = new Date(year, month, day);
        if (date.getMonth() !== month) break;
        
        const isDSTOnDate = isDST(timezone, date);
        const wasDSTPrevDay = day > 1 ? isDST(timezone, new Date(year, month, day - 1)) : false;
        
        if (!isDSTOnDate && wasDSTPrevDay) {
          dstEnd = date;
          break;
        }
      }
      if (dstEnd) break;
    }
  }
  
  return {
    isDSTObserved: true,
    dstStart,
    dstEnd,
    dstOffset
  };
}

/**
 * 获取当前时区是否处于 DST
 * @param timezone - 时区，默认当前系统时区
 * @returns 是否处于 DST
 */
export function isCurrentDST(timezone?: string): boolean {
  const tz = timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
  return isDST(tz, new Date());
}

// ==================== 高级工具函数 ====================

/**
 * 计算两个时区之间的时差 (小时)
 * @param timezone1 - 第一个时区
 * @param timezone2 - 第二个时区
 * @param date - 日期对象，用于计算 DST
 * @returns 时差 (小时)
 */
export function getTimezoneDifference(
  timezone1: string,
  timezone2: string,
  date: Date = new Date()
): number {
  const offset1 = getTimezoneOffset(timezone1, date);
  const offset2 = getTimezoneOffset(timezone2, date);
  
  return (offset2 - offset1) / 60;
}

/**
 * 批量转换时区
 * @param date - 日期对象或时间戳
 * @param fromTimezone - 源时区
 * @param toTimezones - 目标时区数组
 * @returns 转换结果数组
 */
export function convertToMultipleTimezones(
  date: Date | number,
  fromTimezone: string,
  toTimezones: string[]
): Array<{ timezone: string; date: Date; formatted: string }> {
  const d = typeof date === 'number' ? new Date(date) : date;
  
  return toTimezones.map(tz => {
    const converted = convertTimezone(d, fromTimezone, tz);
    return {
      timezone: tz,
      date: converted,
      formatted: formatDateTime(converted, tz)
    };
  });
}

/**
 * 解析日期字符串
 * @param dateStr - 日期字符串
 * @param format - 期望的格式
 * @returns Date 对象
 */
export function parseDate(dateStr: string, format?: string): Date {
  // 简单实现，支持常见格式
  if (!format) {
    // 尝试自动解析
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      throw new Error(`无法解析日期字符串：${dateStr}`);
    }
    return date;
  }
  
  // 根据格式解析
  const parts: Record<string, string> = {};
  const regex = format
    .replace('YYYY', '(?<year>\\d{4})')
    .replace('MM', '(?<month>\\d{2})')
    .replace('DD', '(?<day>\\d{2})')
    .replace('HH', '(?<hour>\\d{2})')
    .replace('mm', '(?<minute>\\d{2})')
    .replace('ss', '(?<second>\\d{2})');
  
  const match = dateStr.match(new RegExp(`^${regex}$`));
  if (!match || !match.groups) {
    throw new Error(`日期格式不匹配：期望 ${format}, 实际 ${dateStr}`);
  }
  
  const year = parseInt(match.groups.year || new Date().getFullYear().toString());
  const month = parseInt(match.groups.month || '1') - 1;
  const day = parseInt(match.groups.day || '1');
  const hour = parseInt(match.groups.hour || '0');
  const minute = parseInt(match.groups.minute || '0');
  const second = parseInt(match.groups.second || '0');
  
  return new Date(year, month, day, hour, minute, second);
}

/**
 * 获取指定时区的当前时间
 * @param timezone - 时区
 * @returns Date 对象
 */
export function getCurrentTimeInTimezone(timezone: string): Date {
  const now = new Date();
  const timeStr = now.toLocaleString('en-US', { timeZone: timezone });
  return new Date(timeStr);
}

/**
 * 计算工作日 (排除周末)
 * @param startDate - 开始日期
 * @param endDate - 结束日期
 * @returns 工作日天数
 */
export function getBusinessDays(startDate: Date, endDate: Date): number {
  let count = 0;
  const current = new Date(startDate);
  const end = new Date(endDate);
  
  while (current <= end) {
    const day = current.getDay();
    if (day !== 0 && day !== 6) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }
  
  return count;
}

/**
 * 添加工作日
 * @param date - 开始日期
 * @param days - 要添加的工作日天数
 * @returns 新的 Date 对象
 */
export function addBusinessDays(date: Date, days: number): Date {
  const result = new Date(date);
  let remaining = days;
  
  while (remaining > 0) {
    result.setDate(result.getDate() + 1);
    const day = result.getDay();
    if (day !== 0 && day !== 6) {
      remaining--;
    }
  }
  
  return result;
}

// ==================== 导出 ====================

export const TimezoneUtils = {
  // 常量
  TIMEZONES,
  
  // 格式化
  formatDateTime,
  formatRelativeTime,
  formatDuration,
  
  // 时区转换
  convertTimezone,
  getTimezoneOffset,
  getTimezoneAbbreviation,
  isValidTimezone,
  getAvailableTimezones,
  
  // DST 处理
  isDST,
  getDSTInfo,
  isCurrentDST,
  
  // 高级工具
  getTimezoneDifference,
  convertToMultipleTimezones,
  parseDate,
  getCurrentTimeInTimezone,
  getBusinessDays,
  addBusinessDays,
};

export default TimezoneUtils;
