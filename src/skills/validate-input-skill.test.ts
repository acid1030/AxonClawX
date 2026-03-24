/**
 * 输入验证技能测试
 */

import {
  InputValidator,
  validateEmail,
  validatePhone,
  validateIdCard,
  checkPasswordStrength,
  createValidator,
  validateInput
} from './validate-input-skill';

console.log('🧪 输入验证技能测试\n');

// ============ 邮箱验证测试 ============
console.log('📧 邮箱验证测试:');
const emailTests = [
  { email: 'test@example.com', expected: true },
  { email: 'user.name@domain.co.uk', expected: true },
  { email: 'invalid', expected: false },
  { email: '@example.com', expected: false },
  { email: 'test@', expected: false }
];

emailTests.forEach(({ email, expected }) => {
  const result = validateEmail(email);
  const pass = result === expected;
  console.log(`  ${pass ? '✓' : '✗'} ${email}: ${result} (期望：${expected})`);
});

// ============ 手机号验证测试 ============
console.log('\n📱 手机号验证测试:');
const phoneTests = [
  { phone: '13812345678', expected: true },
  { phone: '19812345678', expected: true },
  { phone: '12345678901', expected: false },
  { phone: '1381234567', expected: false }
];

phoneTests.forEach(({ phone, expected }) => {
  const result = validatePhone(phone);
  const pass = result === expected;
  console.log(`  ${pass ? '✓' : '✗'} ${phone}: ${result} (期望：${expected})`);
});

// ============ 身份证验证测试 ============
console.log('\n🆔 身份证验证测试:');
const idCardTests = [
  { idCard: '110101199001011234', expected: true },
  { idCard: '310101199001011234', expected: true },
  { idCard: '123456789012345678', expected: false }
];

idCardTests.forEach(({ idCard, expected }) => {
  const result = validateIdCard(idCard);
  const pass = result === expected;
  console.log(`  ${pass ? '✓' : '✗'} ${idCard}: ${result} (期望：${expected})`);
});

// ============ 密码强度测试 ============
console.log('\n🔐 密码强度测试:');
const passwordTests = [
  { password: '123456', expected: 'weak' },
  { password: 'Password123', expected: 'medium' },
  { password: 'P@ssw0rd123', expected: 'strong' },
  { password: 'MyP@ssw0rd123!', expected: 'very-strong' }
];

passwordTests.forEach(({ password, expected }) => {
  const result = InputValidator.checkPasswordStrength(password);
  const pass = result.level === expected;
  console.log(`  ${pass ? '✓' : '✗'} ${password}: ${result.level} (期望：${expected})`);
});

// ============ 自定义验证器测试 ============
console.log('\n🛠️ 自定义验证器测试:');

const registrationRules = {
  username: {
    required: true,
    minLength: 3,
    maxLength: 20
  },
  email: {
    required: true,
    rule: 'email' as const
  },
  phone: {
    rule: 'phone' as const
  },
  password: {
    required: true,
    minLength: 8
  }
};

const validator = createValidator(registrationRules);

// 测试有效数据
const validData = {
  username: 'john',
  email: 'john@example.com',
  phone: '13812345678',
  password: 'password123'
};

const validResult = validator.validate(validData);
console.log(`  ${validResult.valid ? '✓' : '✗'} 有效数据验证: ${validResult.valid}`);

// 测试无效数据
const invalidData = {
  username: 'jo',  // 太短
  email: 'invalid', // 格式错误
  phone: '12345',   // 格式错误
  password: '123'   // 太短
};

const invalidResult = validator.validate(invalidData);
console.log(`  ${!invalidResult.valid ? '✓' : '✗'} 无效数据验证: ${invalidResult.valid} (应有错误)`);

if (!invalidResult.valid) {
  console.log('    错误列表:');
  invalidResult.errors.forEach(err => {
    console.log(`      - ${err.field}: ${err.message}`);
  });
}

// ============ 总结 ============
console.log('\n✅ 测试完成！');
