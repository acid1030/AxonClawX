/**
 * 手机号工具技能使用示例
 * 
 * @file phone-utils-examples.ts
 * @description 演示 phone-utils-skill.ts 的各种用法
 */

import {
  validatePhone,
  validateCNMobile,
  queryPhoneLocation,
  formatPhone,
  formatPhones,
  normalizePhone,
  maskPhone,
  getCarrier,
  cleanPhone,
  isVirtualCarrier,
  getPrefixInfo,
} from './phone-utils-skill';

// ==================== 1. 手机号验证 ====================

console.log('=== 手机号验证示例 ===\n');

// 1.1 综合验证 (自动识别地区)
const testPhones = [
  '13800138000',           // 中国大陆
  '+86 138 0013 8000',     // 带国家代码和空格
  '138-0013-8000',         // 带横线
  '0912345678',            // 台湾
  '+852 9123 4567',        // 香港
  '66123456',              // 澳门
  '+1 234 567 8900',       // 美国
];

testPhones.forEach(phone => {
  const result = validatePhone(phone);
  console.log(`手机号：${phone}`);
  console.log(`  是否有效：${result.isValid}`);
  console.log(`  地区：${result.region || 'N/A'}`);
  console.log(`  类型：${result.type || 'N/A'}`);
  if (!result.isValid) {
    console.log(`  错误：${result.error}`);
  }
  console.log('');
});

// 1.2 单独验证中国大陆手机号
console.log('=== 中国大陆手机号验证 ===\n');
const cnResult = validateCNMobile('13800138000');
console.log('13800138000:', cnResult);

const invalidResult = validateCNMobile('12345678901');
console.log('12345678901:', invalidResult);

// ==================== 2. 归属地查询 ====================

console.log('\n=== 归属地查询示例 ===\n');

const locationPhones = [
  '13800138000',  // 北京
  '13912345678',  // 江苏
  '15012345678',  // 北京
  '18612345678',  // 北京
  '17012345678',  // 虚拟运营商
];

locationPhones.forEach(phone => {
  const location = queryPhoneLocation(phone);
  console.log(`手机号：${phone}`);
  console.log(`  省份：${location.province || 'N/A'}`);
  console.log(`  城市：${location.city || 'N/A'}`);
  console.log(`  运营商：${location.carrier || 'N/A'}`);
  console.log(`  号段：${location.prefix || 'N/A'}`);
  console.log('');
});

// 2.1 快速获取运营商
console.log('=== 运营商查询 ===\n');
const carriers = [
  '13800138000',  // 中国移动
  '13012345678',  // 中国联通
  '13312345678',  // 中国电信
  '19212345678',  // 中国广电
];

carriers.forEach(phone => {
  const carrier = getCarrier(phone);
  console.log(`${phone}: ${carrier}`);
});

// ==================== 3. 格式化输出 ====================

console.log('\n=== 格式化输出示例 ===\n');

const formatPhones = [
  '13800138000',
  '13912345678',
  '15012345678',
];

// 3.1 默认格式 (XXX XXXX XXXX)
console.log('默认格式:');
formatPhones.forEach(phone => {
  console.log(`  ${phone} -> ${formatPhone(phone)}`);
});

// 3.2 自定义分隔符
console.log('\n自定义分隔符 (-):');
formatPhones.forEach(phone => {
  console.log(`  ${phone} -> ${formatPhone(phone, { separator: '-' })}`);
});

// 3.3 使用模板
console.log('\n使用模板 (XXX-XXXX-XXXX):');
formatPhones.forEach(phone => {
  console.log(`  ${phone} -> ${formatPhone(phone, { template: 'XXX-XXXX-XXXX' })}`);
});

// 3.4 带国家代码
console.log('\n带国家代码:');
formatPhones.forEach(phone => {
  console.log(`  ${phone} -> ${formatPhone(phone, { withCountryCode: true })}`);
});

// 3.5 批量格式化
console.log('\n批量格式化:');
const formatted = formatPhones(formatPhones, { separator: '-' });
console.log(formatted);

// ==================== 4. 其他实用功能 ====================

console.log('\n=== 其他实用功能 ===\n');

// 4.1 清理手机号
console.log('清理手机号:');
const messyPhones = [
  '138 0013 8000',
  '138-0013-8000',
  '138.0013.8000',
  '(138) 0013-8000',
];
messyPhones.forEach(phone => {
  console.log(`  "${phone}" -> "${cleanPhone(phone)}"`);
});

// 4.2 标准化手机号
console.log('\n标准化手机号:');
const normalizeExamples = [
  '+86 138 0013 8000',
  '138-0013-8000',
  '0086-138-0013-8000',
];
normalizeExamples.forEach(phone => {
  console.log(`  "${phone}" -> "${normalizePhone(phone)}"`);
});

// 4.3 脱敏手机号
console.log('\n脱敏手机号:');
const maskExamples = [
  '13800138000',
  '+86 138 0013 8000',
  '13912345678',
];
maskExamples.forEach(phone => {
  console.log(`  ${phone} -> ${maskPhone(phone)}`);
  console.log(`  ${phone} -> ${maskPhone(phone, '*', 3)}`); // 显示最后 3 位
});

// 4.4 判断虚拟运营商
console.log('\n判断虚拟运营商:');
const virtualCheck = [
  '17012345678',
  '17112345678',
  '13800138000',
];
virtualCheck.forEach(phone => {
  console.log(`  ${phone}: ${isVirtualCarrier(phone) ? '是' : '否'}`);
});

// 4.5 获取号段信息
console.log('\n获取号段信息:');
const prefixExamples = [
  '13800138000',
  '19212345678',
  '17012345678',
];
prefixExamples.forEach(phone => {
  const info = getPrefixInfo(phone);
  if (info) {
    console.log(`  ${phone}: 号段 ${info.prefix}, 运营商 ${info.carrier}`);
  }
});

// ==================== 5. 实际应用场景 ====================

console.log('\n=== 实际应用场景 ===\n');

// 5.1 表单验证
console.log('场景 1: 表单验证');
function validatePhoneForm(input: string): { valid: boolean; message: string } {
  const result = validatePhone(input);
  if (!result.isValid) {
    return { valid: false, message: result.error || '手机号格式错误' };
  }
  
  const location = queryPhoneLocation(input);
  const carrier = getCarrier(input);
  
  return {
    valid: true,
    message: `✓ ${carrier} (${location.province || '未知'})`
  };
}

const formTests = ['13800138000', '123456', '19212345678'];
formTests.forEach(input => {
  const validation = validatePhoneForm(input);
  console.log(`  ${input}: ${validation.message}`);
});

// 5.2 用户信息展示
console.log('\n场景 2: 用户信息展示 (脱敏)');
const users = [
  { name: '张三', phone: '13800138000' },
  { name: '李四', phone: '13912345678' },
  { name: '王五', phone: '18612345678' },
];

users.forEach(user => {
  console.log(`  ${user.name}: ${maskPhone(user.phone)} (${getCarrier(user.phone)})`);
});

// 5.3 数据导入清洗
console.log('\n场景 3: 数据导入清洗');
const importedPhones = [
  '138 0013 8000',
  '139-1234-5678',
  '+86 150 1234 5678',
  '186.1234.5678',
];

const cleaned = importedPhones.map(phone => ({
  original: phone,
  cleaned: cleanPhone(phone),
  formatted: formatPhone(phone),
  valid: validatePhone(phone).isValid,
}));

cleaned.forEach(item => {
  console.log(`  ${item.original.padEnd(20)} -> ${item.formatted} [${item.valid ? '✓' : '✗'}]`);
});

// 5.4 批量处理
console.log('\n场景 4: 批量处理 (导出格式)');
const batchPhones = [
  '13800138000',
  '13912345678',
  '15012345678',
];

// 导出为 CSV 格式
const csvLines = batchPhones.map(phone => {
  const location = queryPhoneLocation(phone);
  const carrier = getCarrier(phone);
  const formatted = formatPhone(phone, { separator: '-' });
  return `${formatted},${carrier},${location.province || '未知'}`;
});

console.log('CSV 输出:');
console.log('手机号，运营商，归属地');
csvLines.forEach(line => console.log(`  ${line}`));

// ==================== 6. 性能提示 ====================

console.log('\n=== 性能提示 ===\n');
console.log('✓ 批量处理使用 formatPhones() 而非循环调用 formatPhone()');
console.log('✓ 频繁查询归属地时，可缓存 queryPhoneLocation() 结果');
console.log('✓ 验证前先 cleanPhone() 可提高准确率');
console.log('✓ 大量数据处理时，避免重复调用 getCarrier()');

console.log('\n=== 示例完成 ===');
