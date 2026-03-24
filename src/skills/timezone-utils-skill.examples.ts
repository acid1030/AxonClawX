/**
 * 时区工具使用示例
 * 
 * 演示 TimezoneUtils 的各种用法
 */

import {
  TimezoneUtils,
  TIMEZONES,
  formatDateTime,
  formatRelativeTime,
  formatDuration,
  convertTimezone,
  getTimezoneOffset,
  getTimezoneAbbreviation,
  isValidTimezone,
  getAvailableTimezones,
  isDST,
  getDSTInfo,
  isCurrentDST,
  getTimezoneDifference,
  convertToMultipleTimezones,
  parseDate,
  getCurrentTimeInTimezone,
  getBusinessDays,
  addBusinessDays,
} from './timezone-utils-skill';

// ==================== 基础使用示例 ====================

console.log('=== 时区工具使用示例 ===\n');

// 1. 格式化日期时间
console.log('1. 格式化日期时间');
const now = new Date();

// 默认格式
console.log('默认格式:', formatDateTime(now));

// 自定义格式
console.log('中文格式:', formatDateTime(now, 'Asia/Shanghai', {
  dateFormat: 'YYYY 年 MM 月 DD 日',
  timeFormat: 'HH:mm:ss',
  showTimezone: true
}));

// 12 小时制
console.log('12 小时制:', formatDateTime(now, 'America/New_York', {
  dateFormat: 'MM/DD/YYYY',
  timeFormat: 'hh:mm:ss A',
  showTimezone: true
}));

console.log('');

// 2. 格式化相对时间
console.log('2. 格式化相对时间');
const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

console.log('1 小时前:', formatRelativeTime(oneHourAgo));
console.log('1 天前:', formatRelativeTime(oneDayAgo));
console.log('1 周前:', formatRelativeTime(oneWeekAgo));

console.log('');

// 3. 格式化持续时间
console.log('3. 格式化持续时间');
const duration1 = 1000 * 60 * 60 * 2 + 1000 * 60 * 30; // 2 小时 30 分钟
const duration2 = 1000 * 60 * 60 * 24 * 3 + 1000 * 60 * 60 * 5; // 3 天 5 小时

console.log('简洁格式:', formatDuration(duration1));
console.log('详细格式:', formatDuration(duration1, { verbose: true }));
console.log('长时间:', formatDuration(duration2, { verbose: true }));

console.log('');

// ==================== 时区转换示例 ====================

console.log('=== 时区转换示例 ===\n');

// 4. 时区转换
console.log('4. 时区转换');
const beijingTime = new Date();
const nyTime = convertTimezone(beijingTime, 'Asia/Shanghai', 'America/New_York');
const londonTime = convertTimezone(beijingTime, 'Asia/Shanghai', 'Europe/London');
const tokyoTime = convertTimezone(beijingTime, 'Asia/Shanghai', 'Asia/Tokyo');

console.log('北京时间:', formatDateTime(beijingTime, 'Asia/Shanghai'));
console.log('纽约时间:', formatDateTime(nyTime, 'America/New_York'));
console.log('伦敦时间:', formatDateTime(londonTime, 'Europe/London'));
console.log('东京时间:', formatDateTime(tokyoTime, 'Asia/Tokyo'));

console.log('');

// 5. 获取时区偏移量
console.log('5. 获取时区偏移量');
console.log('北京时区偏移:', getTimezoneOffset('Asia/Shanghai'), '分钟');
console.log('纽约时区偏移:', getTimezoneOffset('America/New_York'), '分钟');
console.log('伦敦时区偏移:', getTimezoneOffset('Europe/London'), '分钟');

console.log('');

// 6. 获取时区缩写
console.log('6. 获取时区缩写');
console.log('北京时区缩写:', getTimezoneAbbreviation('Asia/Shanghai'));
console.log('纽约时区缩写:', getTimezoneAbbreviation('America/New_York'));
console.log('伦敦时区缩写:', getTimezoneAbbreviation('Europe/London'));

console.log('');

// 7. 验证时区
console.log('7. 验证时区');
console.log('Asia/Shanghai 是否有效:', isValidTimezone('Asia/Shanghai'));
console.log('Invalid/Timezone 是否有效:', isValidTimezone('Invalid/Timezone'));

console.log('');

// 8. 获取所有可用时区
console.log('8. 获取所有可用时区 (前 10 个)');
const allTimezones = getAvailableTimezones();
console.log(allTimezones.slice(0, 10));
console.log('总共:', allTimezones.length, '个时区');

console.log('');

// ==================== DST 处理示例 ====================

console.log('=== DST 处理示例 ===\n');

// 9. 检查是否处于夏令时
console.log('9. 检查是否处于夏令时');
console.log('北京当前是否 DST:', isDST('Asia/Shanghai', now));
console.log('纽约当前是否 DST:', isDST('America/New_York', now));
console.log('伦敦当前是否 DST:', isDST('Europe/London', now));

console.log('');

// 10. 获取 DST 信息
console.log('10. 获取 DST 信息');
const dstInfo = getDSTInfo('America/New_York', 2026);
console.log('纽约 2026 年 DST 信息:');
console.log('  是否观察 DST:', dstInfo.isDSTObserved);
console.log('  DST 偏移:', dstInfo.dstOffset, '分钟');
if (dstInfo.dstStart) {
  console.log('  DST 开始:', formatDateTime(dstInfo.dstStart, 'America/New_York'));
}
if (dstInfo.dstEnd) {
  console.log('  DST 结束:', formatDateTime(dstInfo.dstEnd, 'America/New_York'));
}

console.log('');

// 11. 检查当前是否 DST
console.log('11. 检查当前是否 DST');
console.log('系统当前时区是否 DST:', isCurrentDST());
console.log('纽约当前是否 DST:', isCurrentDST('America/New_York'));

console.log('');

// ==================== 高级工具示例 ====================

console.log('=== 高级工具示例 ===\n');

// 12. 计算时区差异
console.log('12. 计算时区差异');
const diff1 = getTimezoneDifference('Asia/Shanghai', 'America/New_York', now);
const diff2 = getTimezoneDifference('Asia/Shanghai', 'Europe/London', now);
const diff3 = getTimezoneDifference('America/New_York', 'Europe/London', now);

console.log('北京 - 纽约时差:', diff1, '小时');
console.log('北京 - 伦敦时差:', diff2, '小时');
console.log('纽约 - 伦敦时差:', diff3, '小时');

console.log('');

// 13. 批量转换时区
console.log('13. 批量转换时区');
const targetTimezones = ['America/New_York', 'Europe/London', 'Asia/Tokyo', 'Australia/Sydney'];
const conversions = convertToMultipleTimezones(now, 'Asia/Shanghai', targetTimezones);

conversions.forEach(item => {
  console.log(`${item.timezone}: ${item.formatted}`);
});

console.log('');

// 14. 解析日期字符串
console.log('14. 解析日期字符串');
const parsed1 = parseDate('2026-03-13 19:30:00');
const parsed2 = parseDate('2026-03-13', 'YYYY-MM-DD');
const parsed3 = parseDate('13/03/2026', 'DD/MM/YYYY');

console.log('自动解析:', formatDateTime(parsed1));
console.log('指定格式解析:', formatDateTime(parsed2));
console.log('欧洲格式解析:', formatDateTime(parsed3));

console.log('');

// 15. 获取指定时区的当前时间
console.log('15. 获取指定时区的当前时间');
console.log('北京当前时间:', formatDateTime(getCurrentTimeInTimezone('Asia/Shanghai'), 'Asia/Shanghai'));
console.log('纽约当前时间:', formatDateTime(getCurrentTimeInTimezone('America/New_York'), 'America/New_York'));
console.log('伦敦当前时间:', formatDateTime(getCurrentTimeInTimezone('Europe/London'), 'Europe/London'));

console.log('');

// 16. 计算工作日
console.log('16. 计算工作日');
const startDate = new Date(2026, 2, 1); // 2026-03-01
const endDate = new Date(2026, 2, 31);  // 2026-03-31
const businessDays = getBusinessDays(startDate, endDate);
console.log(`2026 年 3 月的工作日天数：${businessDays}天`);

console.log('');

// 17. 添加工作日
console.log('17. 添加工作日');
const start = new Date(2026, 2, 13); // 2026-03-13
const after10Days = addBusinessDays(start, 10);
console.log(`从 ${formatDateTime(start, 'Asia/Shanghai', { dateFormat: 'YYYY-MM-DD' })} 开始`);
console.log(`10 个工作日后：${formatDateTime(after10Days, 'Asia/Shanghai', { dateFormat: 'YYYY-MM-DD' })}`);

console.log('');

// ==================== 实际应用场景 ====================

console.log('=== 实际应用场景 ===\n');

// 场景 1: 国际会议安排
console.log('场景 1: 国际会议安排');
const meetingTimeBeijing = new Date(2026, 2, 20, 14, 0, 0); // 北京时间 2026-03-20 14:00
console.log('会议时间 (北京时间):', formatDateTime(meetingTimeBeijing, 'Asia/Shanghai', { showTimezone: true }));

const meetingLocations = [
  { city: '北京', timezone: 'Asia/Shanghai' },
  { city: '纽约', timezone: 'America/New_York' },
  { city: '伦敦', timezone: 'Europe/London' },
  { city: '东京', timezone: 'Asia/Tokyo' },
  { city: '悉尼', timezone: 'Australia/Sydney' },
];

meetingLocations.forEach(location => {
  const localTime = convertTimezone(meetingTimeBeijing, 'Asia/Shanghai', location.timezone);
  console.log(`  ${location.city}: ${formatDateTime(localTime, location.timezone, { timeFormat: 'HH:mm' })}`);
});

console.log('');

// 场景 2: 项目截止日期计算
console.log('场景 2: 项目截止日期计算');
const projectStart = new Date(2026, 2, 13);
const workDaysNeeded = 20;
const deadline = addBusinessDays(projectStart, workDaysNeeded);
console.log(`项目开始：${formatDateTime(projectStart, 'Asia/Shanghai', { dateFormat: 'YYYY-MM-DD' })}`);
console.log(`需要工作日：${workDaysNeeded}天`);
console.log(`预计截止：${formatDateTime(deadline, 'Asia/Shanghai', { dateFormat: 'YYYY-MM-DD' })}`);

console.log('');

// 场景 3: 系统日志时间戳转换
console.log('场景 3: 系统日志时间戳转换');
const logTimestamp = Date.now() - 3600000; // 1 小时前
console.log('原始时间戳:', logTimestamp);
console.log('相对时间:', formatRelativeTime(logTimestamp));
console.log('详细时间:', formatDateTime(logTimestamp, 'Asia/Shanghai'));

console.log('');

// ==================== 使用 TIMEZONES 常量 ====================

console.log('=== 常用时区列表 ===\n');

// 亚洲时区
console.log('亚洲时区:');
Object.entries(TIMEZONES)
  .filter(([tz]) => tz.startsWith('Asia/'))
  .slice(0, 5)
  .forEach(([tz, name]) => {
    console.log(`  ${tz}: ${name}`);
  });

// 欧洲时区
console.log('\n欧洲时区:');
Object.entries(TIMEZONES)
  .filter(([tz]) => tz.startsWith('Europe/'))
  .slice(0, 5)
  .forEach(([tz, name]) => {
    console.log(`  ${tz}: ${name}`);
  });

// 美洲时区
console.log('\n美洲时区:');
Object.entries(TIMEZONES)
  .filter(([tz]) => tz.startsWith('America/'))
  .slice(0, 5)
  .forEach(([tz, name]) => {
    console.log(`  ${tz}: ${name}`);
  });

console.log('\n=== 示例结束 ===');
