/**
 * 数据验证工具 - 使用示例
 * 
 * 演示如何使用 validation-lite-skill.ts 进行数据验证
 * 
 * 功能:
 * 1. 邮箱/手机/URL 验证
 * 2. 身份证/信用卡验证
 * 3. 密码强度检查
 */

import {
  validateEmail,
  validatePhone,
  validateUrl,
  validateChineseID,
  validateCreditCard,
  checkPasswordStrength,
  batchValidate,
  validateAll
} from './validation-lite-skill';

// ============ 示例 1: 邮箱验证 ============

console.log('=== 示例 1: 邮箱验证 ===\n');

const emails = [
  'user@example.com',           // 有效
  'test.user+tag@company.co',   // 有效
  'invalid-email',              // 无效 - 缺少@和域名
  '@example.com',               // 无效 - 缺少用户名
  'user@',                      // 无效 - 缺少域名
  'user@example',               // 无效 - 缺少顶级域名
  '.user@example.com',          // 无效 - 以点号开头
];

emails.forEach(email => {
  const result = validateEmail(email);
  console.log(`邮箱：${email}`);
  console.log(`结果：${result.valid ? '✓ 有效' : '✗ 无效'}`);
  console.log(`说明：${result.message}`);
  if (result.details?.suggestions) {
    console.log(`建议：${result.details.suggestions.join(', ')}`);
  }
  console.log('');
});

// ============ 示例 2: 手机号验证 ============

console.log('=== 示例 2: 手机号验证 ===\n');

const phones = [
  { number: '13812345678', region: 'CN' as const },      // 有效 - 中国移动
  { number: '19876543210', region: 'CN' as const },      // 有效 - 中国联通
  { number: '1234567', region: 'CN' as const },          // 无效 - 长度不足
  { number: '2345678', region: 'CN' as const },          // 无效 - 不是 1 开头
  { number: '+8613812345678', region: 'intl' as const }, // 有效 - 国际格式
  { number: '+1-555-123-4567', region: 'intl' as const },// 有效 - 美国号码
];

phones.forEach(({ number, region }) => {
  const result = validatePhone(number, { region });
  console.log(`手机号：${number} (${region})`);
  console.log(`结果：${result.valid ? '✓ 有效' : '✗ 无效'}`);
  console.log(`说明：${result.message}`);
  console.log('');
});

// ============ 示例 3: URL 验证 ============

console.log('=== 示例 3: URL 验证 ===\n');

const urls = [
  { url: 'https://www.example.com', requireProtocol: true },
  { url: 'http://api.example.com/v1/users', requireProtocol: true },
  { url: 'www.example.com', requireProtocol: false },
  { url: 'example.com', requireProtocol: false },
  { url: 'not-a-url', requireProtocol: false },
  { url: 'ftp://files.example.com', requireProtocol: true },  // 无效 - 不支持 ftp
];

urls.forEach(({ url, requireProtocol }) => {
  const result = validateUrl(url, { requireProtocol });
  console.log(`URL: ${url}`);
  console.log(`要求协议：${requireProtocol ? '是' : '否'}`);
  console.log(`结果：${result.valid ? '✓ 有效' : '✗ 无效'}`);
  console.log(`说明：${result.message}`);
  console.log('');
});

// ============ 示例 4: 身份证验证 ============

console.log('=== 示例 4: 身份证验证 ===\n');

const idCards = [
  '110101199003076675',  // 有效 - 北京东城，男性
  '310101199501011230',  // 有效 - 上海黄浦，男性
  '440101198808085677',  // 有效 - 广州，男性
  '11010119900307667A',  // 无效 - 校验码错误
  '123456789012345678',  // 无效 - 地区码错误
  '1101011990030766',    // 无效 - 长度不足
];

idCards.forEach(idCard => {
  const result = validateChineseID(idCard);
  console.log(`身份证：${idCard}`);
  console.log(`结果：${result.valid ? '✓ 有效' : '✗ 无效'}`);
  console.log(`说明：${result.message}`);
  
  if (result.valid && result.info) {
    console.log(`省份：${result.info.province}`);
    console.log(`出生日期：${result.info.birthDate}`);
    console.log(`性别：${result.info.gender === 'male' ? '男' : '女'}`);
    console.log(`年龄：${result.info.age}岁`);
  }
  console.log('');
});

// ============ 示例 5: 信用卡验证 ============

console.log('=== 示例 5: 信用卡验证 ===\n');

const creditCards = [
  '4532015112830366',  // 有效 - Visa
  '5425233430109903',  // 有效 - MasterCard
  '374245455400126',   // 有效 - American Express
  '6011000990139424',  // 有效 - Discover
  '4532015112830367',  // 无效 - Luhn 校验失败
  '1234567890123456',  // 无效 - 未知卡类型
];

creditCards.forEach(cardNumber => {
  const result = validateCreditCard(cardNumber);
  console.log(`信用卡号：${cardNumber}`);
  console.log(`结果：${result.valid ? '✓ 有效' : '✗ 无效'}`);
  console.log(`说明：${result.message}`);
  
  if (result.valid && result.info) {
    console.log(`卡类型：${result.info.type}`);
    console.log(`卡品牌：${result.info.brand}`);
    console.log(`末四位：${result.info.last4}`);
  }
  console.log('');
});

// ============ 示例 6: 密码强度检查 ============

console.log('=== 示例 6: 密码强度检查 ===\n');

const passwords = [
  '123456',                    // 弱 - 常见密码
  'password',                  // 弱 - 常见密码
  'abc123',                    // 弱 - 长度不足
  'MyPassword',                // 中 - 缺少数字和特殊字符
  'MyPassw0rd',                // 中 - 缺少特殊字符
  'MyP@ssw0rd',                // 强 - 包含所有字符类型
  'Str0ng!P@ssw0rd#2024',      // 强 - 长度足够，字符丰富
  'aaaaaaaa',                  // 弱 - 重复字符
  'qwerty123',                 // 弱 - 常见模式
];

passwords.forEach(password => {
  const result = checkPasswordStrength(password);
  console.log(`密码：${password}`);
  console.log(`强度：${result.strength?.toUpperCase() || 'N/A'}`);
  console.log(`分数：${result.score || 0}/100`);
  console.log(`结果：${result.valid ? '✓ 可用' : '✗ 不可用'}`);
  console.log(`说明：${result.message}`);
  
  if (result.details?.issues) {
    console.log(`问题：${result.details.issues.join(', ')}`);
  }
  if (result.details?.suggestions) {
    console.log(`建议：${result.details.suggestions.join(', ')}`);
  }
  console.log('');
});

// ============ 示例 7: 批量验证 ============

console.log('=== 示例 7: 批量验证 ===\n');

// 用户注册表单验证
const registrationData = {
  email: 'newuser@example.com',
  phone: '13812345678',
  website: 'https://mywebsite.com',
  password: 'Str0ng!P@ss'
};

const validationResults = batchValidate([
  () => validateEmail(registrationData.email),
  () => validatePhone(registrationData.phone, { region: 'CN' }),
  () => validateUrl(registrationData.website, { requireProtocol: true }),
  () => checkPasswordStrength(registrationData.password)
]);

console.log('用户注册表单验证结果:\n');
validationResults.forEach((result, index) => {
  const fields = ['邮箱', '手机', '网站', '密码'];
  console.log(`${fields[index]}: ${result.valid ? '✓' : '✗'} ${result.message}`);
});

const allValid = validationResults.every(r => r.valid);
console.log(`\n总体结果：${allValid ? '✓ 所有验证通过' : '✗ 存在验证失败'}`);
console.log('');

// ============ 示例 8: validateAll 工具 ============

console.log('=== 示例 8: validateAll 工具 ===\n');

const loginData = {
  email: 'invalid-email',
  password: 'weak'
};

const overallResult = validateAll([
  () => validateEmail(loginData.email),
  () => checkPasswordStrength(loginData.password)
]);

console.log('登录信息验证:');
console.log(`结果：${overallResult.valid ? '✓ 通过' : '✗ 失败'}`);
console.log(`说明：${overallResult.message}`);

if (overallResult.details?.issues) {
  console.log(`问题列表:`);
  overallResult.details.issues.forEach((issue, i) => {
    console.log(`  ${i + 1}. ${issue}`);
  });
}
console.log('');

// ============ 示例 9: 实际应用场景 ============

console.log('=== 示例 9: 实际应用场景 - 用户信息更新 ===\n');

interface UserProfile {
  email: string;
  phone?: string;
  website?: string;
  idCard?: string;
}

function validateUserProfile(profile: UserProfile): boolean {
  console.log('验证用户资料...\n');
  
  // 必填项验证
  const emailResult = validateEmail(profile.email);
  console.log(`邮箱验证：${emailResult.valid ? '✓' : '✗'}`);
  if (!emailResult.valid) {
    console.log(`  └─ ${emailResult.message}`);
    return false;
  }
  
  // 可选项验证
  if (profile.phone) {
    const phoneResult = validatePhone(profile.phone, { region: 'CN' });
    console.log(`手机验证：${phoneResult.valid ? '✓' : '✗'}`);
    if (!phoneResult.valid) {
      console.log(`  └─ ${phoneResult.message}`);
      return false;
    }
  }
  
  if (profile.website) {
    const websiteResult = validateUrl(profile.website, { requireProtocol: true });
    console.log(`网站验证：${websiteResult.valid ? '✓' : '✗'}`);
    if (!websiteResult.valid) {
      console.log(`  └─ ${websiteResult.message}`);
      return false;
    }
  }
  
  if (profile.idCard) {
    const idResult = validateChineseID(profile.idCard);
    console.log(`身份证验证：${idResult.valid ? '✓' : '✗'}`);
    if (!idResult.valid) {
      console.log(`  └─ ${idResult.message}`);
      return false;
    }
    if (idResult.info) {
      console.log(`  └─ 姓名：${idResult.info.gender === 'male' ? '先生' : '女士'}, ${idResult.info.age}岁`);
    }
  }
  
  console.log('\n✓ 用户资料验证通过');
  return true;
}

// 测试有效资料
const validProfile: UserProfile = {
  email: 'john.doe@company.com',
  phone: '13812345678',
  website: 'https://johndoe.dev',
  idCard: '110101199003076675'
};

validateUserProfile(validProfile);
console.log('');

// 测试无效资料
const invalidProfile: UserProfile = {
  email: 'invalid-email',
  phone: '1234567',
  website: 'not-a-url',
  idCard: '123456789012345678'
};

validateUserProfile(invalidProfile);
console.log('');

// ============ 示例 10: 密码强度等级统计 ============

console.log('=== 示例 10: 密码强度等级统计 ===\n');

const testPasswords = [
  '123456', 'password', 'qwerty', 'admin', 'letmein',
  'Welcome1', 'Passw0rd', 'Admin123', 'Summer2024',
  'Str0ng!P@ss', 'Secur3#P@ssw0rd', 'C0mplex!Pass2024'
];

const stats = { weak: 0, medium: 0, strong: 0 };

testPasswords.forEach(pwd => {
  const result = checkPasswordStrength(pwd);
  if (result.strength) {
    stats[result.strength]++;
  }
});

console.log('密码强度分布:');
console.log(`弱密码：${stats.weak} 个 (${(stats.weak / testPasswords.length * 100).toFixed(1)}%)`);
console.log(`中等密码：${stats.medium} 个 (${(stats.medium / testPasswords.length * 100).toFixed(1)}%)`);
console.log(`强密码：${stats.strong} 个 (${(stats.strong / testPasswords.length * 100).toFixed(1)}%)`);
console.log('');

console.log('=== 所有示例执行完成 ===');
