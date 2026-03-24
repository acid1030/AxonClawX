/**
 * 格式化工具技能 - 使用示例
 * 
 * @author KAEL
 * @version 1.0.0
 */

import {
  formatNumber,
  formatDate,
  formatText,
  formatFileSize,
  formatDuration,
  formatPercentWithColor,
  type NumberFormatOptions,
  type DateFormatOptions,
  type TextFormatOptions
} from './format-utils-skill';

// ============================================
// 数字格式化示例
// ============================================

console.log('=== 数字格式化示例 ===\n');

// 货币格式
console.log('货币格式:');
console.log('CNY:', formatNumber(1234.567, { type: 'currency' }));
// 输出："¥1,234.57"

console.log('USD:', formatNumber(9999.99, { type: 'currency', currency: 'USD', locale: 'en-US' }));
// 输出："$9,999.99"

console.log('EUR:', formatNumber(1234.56, { type: 'currency', currency: 'EUR', locale: 'de-DE' }));
// 输出："1.234,56 €"

// 百分比
console.log('\n百分比:');
console.log('85.6%:', formatNumber(0.856, { type: 'percent' }));
// 输出："85.60%"

console.log('12.5%:', formatNumber(12.5, { type: 'percent', decimals: 1 }));
// 输出："12.5%"

// 千分位
console.log('\n千分位:');
console.log('1,234,567.89:', formatNumber(1234567.89, { type: 'thousand' }));
// 输出："1,234,567.89"

// 科学计数
console.log('\n科学计数:');
console.log('1.23e+6:', formatNumber(1234567, { type: 'scientific' }));
// 输出："1.23e+6"

// 紧凑格式
console.log('\n紧凑格式:');
console.log('1.5K:', formatNumber(1500, { type: 'compact' }));
// 输出："1.5K"

console.log('2.5M:', formatNumber(2500000, { type: 'compact' }));
// 输出："2.5M"

console.log('3.2B:', formatNumber(3200000000, { type: 'compact' }));
// 输出："3.2B"

// 字节格式
console.log('\n字节格式:');
console.log('1 KB:', formatNumber(1024, { type: 'bytes' }));
// 输出："1 KB"

console.log('1.5 MB:', formatNumber(1572864, { type: 'bytes' }));
// 输出："1.5 MB"

console.log('2.3 GB:', formatNumber(2469606195, { type: 'bytes' }));
// 输出："2.3 GB"

// 带符号
console.log('\n带符号:');
console.log('+100:', formatNumber(100, { type: 'thousand', showSign: true }));
// 输出："+100.00"

console.log('-50:', formatNumber(-50, { type: 'thousand', showSign: true }));
// 输出："-50.00"

// 自定义前后缀
console.log('\n自定义前后缀:');
console.log('kg:', formatNumber(5.5, { type: 'thousand', prefix: '', suffix: ' kg' }));
// 输出："5.50 kg"

console.log('个:', formatNumber(100, { type: 'thousand', suffix: '个' }));
// 输出："100.00 个"


// ============================================
// 日期格式化示例
// ============================================

console.log('\n\n=== 日期格式化示例 ===\n');

const now = new Date();
const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);

// 完整格式
console.log('完整格式:');
console.log(formatDate(now, { type: 'full' }));
// 输出："2026 年 3 月 13 日 星期五 19:50:00"

console.log(formatDate(now, { type: 'full', showWeekday: true }));
// 输出："2026 年 3 月 13 日 星期五 19:50:00"

// 仅日期
console.log('\n仅日期:');
console.log(formatDate(now, { type: 'date' }));
// 输出："2026-03-13"

// 仅时间
console.log('\n仅时间:');
console.log(formatDate(now, { type: 'time' }));
// 输出："19:50:00"

// 日期时间
console.log('\n日期时间:');
console.log(formatDate(now, { type: 'datetime' }));
// 输出："2026-03-13 19:50:00"

// 相对时间
console.log('\n相对时间:');
console.log('5 分钟前:', formatDate(fiveMinutesAgo, { type: 'relative' }));
// 输出："5 分钟前"

console.log('2 小时前:', formatDate(twoHoursAgo, { type: 'relative' }));
// 输出："2 小时前"

console.log('3 天前:', formatDate(threeDaysAgo, { type: 'relative' }));
// 输出："3 天前"

// ISO 格式
console.log('\nISO 格式:');
console.log(formatDate(now, { type: 'iso' }));
// 输出："2026-03-13T11:50:00.000Z"

// 时间戳
console.log('\n时间戳:');
console.log(formatDate(now, { type: 'timestamp' }));
// 输出："1710334200000"

// 自定义格式
console.log('\n自定义格式:');
console.log('YYYY-MM-DD:', formatDate(now, { type: 'custom', pattern: 'YYYY-MM-DD' }));
// 输出："2026-03-13"

console.log('YYYY 年 MM 月 DD 日:', formatDate(now, { type: 'custom', pattern: 'YYYY 年 MM 月 DD 日' }));
// 输出："2026 年 03 月 13 日"

console.log('MM/DD/YYYY HH:mm:', formatDate(now, { type: 'custom', pattern: 'MM/DD/YYYY HH:mm' }));
// 输出："03/13/2026 19:50"

console.log('YYYY-MM-DD dddd:', formatDate(now, { type: 'custom', pattern: 'YYYY-MM-DD dddd' }));
// 输出："2026-03-13 星期五"


// ============================================
// 文本格式化示例
// ============================================

console.log('\n\n=== 文本格式化示例 ===\n');

// 大小写转换
console.log('大小写转换:');
console.log('UPPERCASE:', formatText('hello world', { type: 'uppercase' }));
// 输出："HELLO WORLD"

console.log('lowercase:', formatText('HELLO WORLD', { type: 'lowercase' }));
// 输出："hello world"

console.log('Capitalize:', formatText('hello', { type: 'capitalize' }));
// 输出："Hello"

console.log('Title Case:', formatText('hello world', { type: 'titlecase' }));
// 输出："Hello World"

// 命名转换
console.log('\n命名转换:');
console.log('camelCase:', formatText('hello_world', { type: 'camelCase' }));
// 输出："helloWorld"

console.log('PascalCase:', formatText('hello world', { type: 'pascalCase' }));
// 输出："HelloWorld"

console.log('kebab-case:', formatText('helloWorld', { type: 'kebabCase' }));
// 输出："hello-world"

console.log('snake_case:', formatText('helloWorld', { type: 'snakeCase' }));
// 输出："hello_world"

// 文本截断
console.log('\n文本截断:');
console.log(formatText('这是一段很长的文本内容需要截断', { type: 'truncate', maxLength: 10 }));
// 输出："这是一段很长..."

console.log(formatText('Short', { type: 'truncate', maxLength: 10 }));
// 输出："Short" (不截断)

// 文本脱敏
console.log('\n文本脱敏:');
console.log('手机号:', formatText('13812345678', { type: 'mask', maskPattern: 'phone' }));
// 输出："138****5678"

console.log('邮箱:', formatText('user@example.com', { type: 'mask', maskPattern: 'email' }));
// 输出："u**r@example.com"

console.log('身份证:', formatText('110101199001011234', { type: 'mask', maskPattern: 'id' }));
// 输出："110101********1234"

console.log('自定义:', formatText('MySecretPassword123', { type: 'mask', keepStart: 2, keepEnd: 3 }));
// 输出："My***************123"

// 移除 HTML
console.log('\n移除 HTML:');
console.log(formatText('<p>Hello <strong>World</strong></p>', { type: 'stripHtml' }));
// 输出："Hello World"

// 标准化空白
console.log('\n标准化空白:');
console.log(formatText('  Hello    World   ', { type: 'normalize' }));
// 输出："Hello World"


// ============================================
// 组合格式化示例
// ============================================

console.log('\n\n=== 组合格式化示例 ===\n');

// 文件大小
console.log('文件大小:');
console.log('2 MB:', formatFileSize(2097152));
// 输出："2 MB"

console.log('1.5 KB:', formatFileSize(1536));
// 输出："1.5 KB"

console.log('512 B:', formatFileSize(512));
// 输出："512 B"

console.log('3.7 GB:', formatFileSize(3972030464));
// 输出："3.7 GB"

// 持续时间
console.log('\n持续时间:');
console.log(formatDuration(3661));
// 输出："1 小时 1 分钟 1 秒"

console.log(formatDuration(125, { showSeconds: false }));
// 输出："2 分钟"

console.log(formatDuration(7265));
// 输出："2 小时 1 分钟 5 秒"

console.log(formatDuration(45));
// 输出："45 秒"

// 带颜色的百分比
console.log('\n带颜色的百分比:');
console.log('85%:', formatPercentWithColor(85));
// 输出：{ value: "85.00%", color: "green" }

console.log('65%:', formatPercentWithColor(65));
// 输出：{ value: "65.00%", color: "yellow" }

console.log('45%:', formatPercentWithColor(45));
// 输出：{ value: "45.00%", color: "red" }

console.log('自定义阈值:', formatPercentWithColor(70, { thresholds: { good: 90, warning: 70 } }));
// 输出：{ value: "70.00%", color: "yellow" }


// ============================================
// 实际应用场景示例
// ============================================

console.log('\n\n=== 实际应用场景示例 ===\n');

// 电商场景
console.log('电商场景:');
const productPrice = 299.99;
const discount = 0.15;
const finalPrice = productPrice * (1 - discount);

console.log(`原价：${formatNumber(productPrice, { type: 'currency' })}`);
console.log(`折扣：${formatNumber(discount, { type: 'percent' })}`);
console.log(`最终价：${formatNumber(finalPrice, { type: 'currency' })}`);

// 数据分析场景
console.log('\n数据分析场景:');
const metrics = {
  users: 15234,
  growth: 0.23,
  retention: 0.85,
  storage: 5368709120
};

console.log(`用户数：${formatNumber(metrics.users, { type: 'compact' })}`);
console.log(`增长率：${formatNumber(metrics.growth, { type: 'percent' })}`);
console.log(`留存率：${formatPercentWithColor(metrics.retention * 100).value}`);
console.log(`存储：${formatFileSize(metrics.storage)}`);

// 日志时间戳
console.log('\n日志时间戳:');
const logTime = new Date();
console.log(`[${formatDate(logTime, { type: 'custom', pattern: 'YYYY-MM-DD HH:mm:ss' })}] 系统启动成功`);

// 用户信息展示
console.log('\n用户信息展示:');
const userInfo = {
  name: '张三',
  phone: '13812345678',
  email: 'zhangsan@example.com',
  idCard: '110101199001011234'
};

console.log(`姓名：${userInfo.name}`);
console.log(`手机：${formatText(userInfo.phone, { type: 'mask', maskPattern: 'phone' })}`);
console.log(`邮箱：${formatText(userInfo.email, { type: 'mask', maskPattern: 'email' })}`);
console.log(`身份证：${formatText(userInfo.idCard, { type: 'mask', maskPattern: 'id' })}`);

console.log('\n✅ 所有示例执行完成!');
