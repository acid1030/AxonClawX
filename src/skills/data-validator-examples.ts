/**
 * 数据验证工具 - 使用示例
 * 
 * 演示如何使用 data-validator-skill.ts 进行数据验证
 * 
 * 功能:
 * 1. 数据类型验证
 * 2. 业务规则验证
 * 3. 数据清洗
 */

import {
  validateType,
  validateString,
  validateNumber,
  validateArray,
  validateObject,
  validateBusinessRule,
  validateSchema,
  cleanData,
  cleanObject
} from './data-validator-skill';

// ============================================
// 示例 1: 数据类型验证
// ============================================

console.log('=== 示例 1: 数据类型验证 ===\n');

// 1.1 基础类型验证
console.log('1.1 基础类型验证:');

const stringResult = validateType('Hello World', { types: 'string' });
console.log(`validateType('Hello World', { types: 'string' })`);
console.log(`结果：${stringResult.valid ? '✓' : '✗'} ${stringResult.message}\n`);

const numberResult = validateType(42, { types: 'number' });
console.log(`validateType(42, { types: 'number' })`);
console.log(`结果：${numberResult.valid ? '✓' : '✗'} ${numberResult.message}\n`);

const arrayResult = validateType([1, 2, 3], { types: 'array' });
console.log(`validateType([1, 2, 3], { types: 'array' })`);
console.log(`结果：${arrayResult.valid ? '✓' : '✗'} ${arrayResult.message}\n`);

// 1.2 多类型允许
console.log('1.2 多类型允许:');

const multiTypeResult1 = validateType('text', { types: ['string', 'number'] });
console.log(`validateType('text', { types: ['string', 'number'] })`);
console.log(`结果：${multiTypeResult1.valid ? '✓' : '✗'} ${multiTypeResult1.message}\n`);

const multiTypeResult2 = validateType(123, { types: ['string', 'number'] });
console.log(`validateType(123, { types: ['string', 'number'] })`);
console.log(`结果：${multiTypeResult2.valid ? '✓' : '✗'} ${multiTypeResult2.message}\n`);

// 1.3 可空和可选
console.log('1.3 可空和可选:');

const nullResult = validateType(null, { nullable: true });
console.log(`validateType(null, { nullable: true })`);
console.log(`结果：${nullResult.valid ? '✓' : '✗'} ${nullResult.message}\n`);

const undefinedResult = validateType(undefined, { optional: true });
console.log(`validateType(undefined, { optional: true })`);
console.log(`结果：${undefinedResult.valid ? '✓' : '✗'} ${undefinedResult.message}\n`);

// 1.4 自定义验证器
console.log('1.4 自定义验证器:');

const customResult = validateType('ABC123', {
  types: 'string',
  custom: (value: string) => /^[A-Z]+\d+$/.test(value) || '必须是大写字母 + 数字格式'
});
console.log(`validateType('ABC123', { custom: ... })`);
console.log(`结果：${customResult.valid ? '✓' : '✗'} ${customResult.message}\n`);

// ============================================
// 示例 2: 字符串验证
// ============================================

console.log('=== 示例 2: 字符串验证 ===\n');

// 2.1 邮箱验证
console.log('2.1 邮箱验证:');

const validEmail = validateString('user@example.com', { email: true });
console.log(`validateString('user@example.com', { email: true })`);
console.log(`结果：${validEmail.valid ? '✓' : '✗'} ${validEmail.message}\n`);

const invalidEmail = validateString('invalid-email', { email: true });
console.log(`validateString('invalid-email', { email: true })`);
console.log(`结果：${invalidEmail.valid ? '✓' : '✗'} ${invalidEmail.message}`);
if (invalidEmail.errors) {
  console.log(`错误：${invalidEmail.errors.map(e => e.message).join(', ')}\n`);
}

// 2.2 长度验证
console.log('2.2 长度验证:');

const lengthValid = validateString('hello', { minLength: 3, maxLength: 10 });
console.log(`validateString('hello', { minLength: 3, maxLength: 10 })`);
console.log(`结果：${lengthValid.valid ? '✓' : '✗'} ${lengthValid.message}\n`);

const lengthInvalid = validateString('hi', { minLength: 3 });
console.log(`validateString('hi', { minLength: 3 })`);
console.log(`结果：${lengthInvalid.valid ? '✓' : '✗'} ${lengthInvalid.message}\n`);

// 2.3 手机号验证
console.log('2.3 手机号验证:');

const validPhone = validateString('13812345678', { phone: true });
console.log(`validateString('13812345678', { phone: true })`);
console.log(`结果：${validPhone.valid ? '✓' : '✗'} ${validPhone.message}\n`);

const invalidPhone = validateString('1234567', { phone: true });
console.log(`validateString('1234567', { phone: true })`);
console.log(`结果：${invalidPhone.valid ? '✓' : '✗'} ${invalidPhone.message}\n`);

// 2.4 正则匹配
console.log('2.4 正则匹配:');

const patternValid = validateString('ABC123', { pattern: /^[A-Z]+\d+$/ });
console.log(`validateString('ABC123', { pattern: /^[A-Z]+\\d+$/ })`);
console.log(`结果：${patternValid.valid ? '✓' : '✗'} ${patternValid.message}\n`);

// ============================================
// 示例 3: 数字验证
// ============================================

console.log('=== 示例 3: 数字验证 ===\n');

// 3.1 范围验证
console.log('3.1 范围验证:');

const inRange = validateNumber(50, { min: 0, max: 100 });
console.log(`validateNumber(50, { min: 0, max: 100 })`);
console.log(`结果：${inRange.valid ? '✓' : '✗'} ${inRange.message}\n`);

const outOfRange = validateNumber(150, { min: 0, max: 100 });
console.log(`validateNumber(150, { min: 0, max: 100 })`);
console.log(`结果：${outOfRange.valid ? '✓' : '✗'} ${outOfRange.message}\n`);

// 3.2 整数验证
console.log('3.2 整数验证:');

const integerValid = validateNumber(42, { integer: true });
console.log(`validateNumber(42, { integer: true })`);
console.log(`结果：${integerValid.valid ? '✓' : '✗'} ${integerValid.message}\n`);

const integerInvalid = validateNumber(3.14, { integer: true });
console.log(`validateNumber(3.14, { integer: true })`);
console.log(`结果：${integerInvalid.valid ? '✓' : '✗'} ${integerInvalid.message}\n`);

// 3.3 正数验证
console.log('3.3 正数验证:');

const positiveValid = validateNumber(10, { positive: true });
console.log(`validateNumber(10, { positive: true })`);
console.log(`结果：${positiveValid.valid ? '✓' : '✗'} ${positiveValid.message}\n`);

const positiveInvalid = validateNumber(-5, { positive: true });
console.log(`validateNumber(-5, { positive: true })`);
console.log(`结果：${positiveInvalid.valid ? '✓' : '✗'} ${positiveInvalid.message}\n`);

// ============================================
// 示例 4: 数组验证
// ============================================

console.log('=== 示例 4: 数组验证 ===\n');

// 4.1 元素类型验证
console.log('4.1 元素类型验证:');

const numberArray = validateArray([1, 2, 3, 4], { itemType: 'number' });
console.log(`validateArray([1, 2, 3, 4], { itemType: 'number' })`);
console.log(`结果：${numberArray.valid ? '✓' : '✗'} ${numberArray.message}\n`);

const mixedArray = validateArray([1, 'two', 3], { itemType: 'number' });
console.log(`validateArray([1, 'two', 3], { itemType: 'number' })`);
console.log(`结果：${mixedArray.valid ? '✓' : '✗'} ${mixedArray.message}`);
if (mixedArray.errors) {
  console.log(`错误详情：${JSON.stringify(mixedArray.errors, null, 2)}\n`);
}

// 4.2 唯一性验证
console.log('4.2 唯一性验证:');

const uniqueArray = validateArray([1, 2, 3], { unique: true });
console.log(`validateArray([1, 2, 3], { unique: true })`);
console.log(`结果：${uniqueArray.valid ? '✓' : '✗'} ${uniqueArray.message}\n`);

const duplicateArray = validateArray([1, 2, 2, 3], { unique: true });
console.log(`validateArray([1, 2, 2, 3], { unique: true })`);
console.log(`结果：${duplicateArray.valid ? '✓' : '✗'} ${duplicateArray.message}\n`);

// 4.3 长度验证
console.log('4.3 长度验证:');

const lengthArray = validateArray([1, 2, 3], { minLength: 1, maxLength: 5 });
console.log(`validateArray([1, 2, 3], { minLength: 1, maxLength: 5 })`);
console.log(`结果：${lengthArray.valid ? '✓' : '✗'} ${lengthArray.message}\n`);

const emptyArray = validateArray([], { nonEmpty: true });
console.log(`validateArray([], { nonEmpty: true })`);
console.log(`结果：${emptyArray.valid ? '✓' : '✗'} ${emptyArray.message}\n`);

// ============================================
// 示例 5: 对象验证
// ============================================

console.log('=== 示例 5: 对象验证 ===\n');

const userSchema = {
  required: ['name', 'email', 'age'],
  fields: {
    name: { types: 'string' as const, minLength: 2 },
    email: { types: 'string' as const, email: true },
    age: { types: 'number' as const, min: 0, max: 150 },
    role: { types: 'string' as const, optional: true }
  }
};

console.log('5.1 有效用户对象:');

const validUser = {
  name: 'John Doe',
  email: 'john@example.com',
  age: 30
};

const validUserResult = validateObject(validUser, userSchema);
console.log(`validateObject(${JSON.stringify(validUser)}, userSchema)`);
console.log(`结果：${validUserResult.valid ? '✓' : '✗'} ${validUserResult.message}\n`);

console.log('5.2 无效用户对象:');

const invalidUser = {
  name: 'J',  // 太短
  email: 'invalid-email',  // 邮箱格式错误
  age: -5  // 负数
};

const invalidUserResult = validateObject(invalidUser, userSchema);
console.log(`validateObject(${JSON.stringify(invalidUser)}, userSchema)`);
console.log(`结果：${invalidUserResult.valid ? '✓' : '✗'} ${invalidUserResult.message}`);
if (invalidUserResult.errors) {
  console.log(`\n错误详情:`);
  invalidUserResult.errors.forEach((error, i) => {
    console.log(`  ${i + 1}. [${error.field || 'root'}] ${error.message}`);
  });
}
console.log('');

// ============================================
// 示例 6: 业务规则验证
// ============================================

console.log('=== 示例 6: 业务规则验证 ===\n');

// 6.1 范围验证
console.log('6.1 范围验证:');

const scoreValid = validateBusinessRule(75, {
  range: { min: 0, max: 100 },
  errorMessage: '分数必须在 0-100 之间'
});
console.log(`validateBusinessRule(75, { range: { min: 0, max: 100 } })`);
console.log(`结果：${scoreValid.valid ? '✓' : '✗'} ${scoreValid.message}\n`);

const scoreInvalid = validateBusinessRule(150, {
  range: { min: 0, max: 100 },
  errorMessage: '分数必须在 0-100 之间'
});
console.log(`validateBusinessRule(150, { range: { min: 0, max: 100 } })`);
console.log(`结果：${scoreInvalid.valid ? '✓' : '✗'} ${scoreInvalid.message}\n`);

// 6.2 枚举验证
console.log('6.2 枚举验证:');

const roleValid = validateBusinessRule('admin', {
  enum: ['admin', 'user', 'guest'],
  errorMessage: '角色必须是 admin、user 或 guest'
});
console.log(`validateBusinessRule('admin', { enum: ['admin', 'user', 'guest'] })`);
console.log(`结果：${roleValid.valid ? '✓' : '✗'} ${roleValid.message}\n`);

const roleInvalid = validateBusinessRule('superuser', {
  enum: ['admin', 'user', 'guest'],
  errorMessage: '角色必须是 admin、user 或 guest'
});
console.log(`validateBusinessRule('superuser', { enum: ['admin', 'user', 'guest'] })`);
console.log(`结果：${roleInvalid.valid ? '✓' : '✗'} ${roleInvalid.message}\n`);

// ============================================
// 示例 7: Schema 验证
// ============================================

console.log('=== 示例 7: Schema 验证 ===\n');

const productSchema = {
  type: 'object',
  required: ['name', 'price'],
  fields: {
    name: { type: 'string', minLength: 1 },
    price: { type: 'number', min: 0 },
    quantity: { type: 'number', min: 0, integer: true, optional: true },
    tags: { type: 'array', unique: true, optional: true },
    category: { type: 'string', enum: ['electronics', 'clothing', 'books'], optional: true }
  }
};

console.log('7.1 有效产品:');

const validProduct = {
  name: 'Laptop',
  price: 999.99,
  quantity: 10,
  tags: ['electronics', 'computer'],
  category: 'electronics'
};

const validProductResult = validateSchema(validProduct, productSchema);
console.log(`validateSchema(${JSON.stringify(validProduct)}, productSchema)`);
console.log(`结果：${validProductResult.valid ? '✓' : '✗'} ${validProductResult.message}\n`);

console.log('7.2 无效产品:');

const invalidProduct = {
  name: '',  // 空字符串
  price: -100,  // 负数
  quantity: 3.5,  // 不是整数
  tags: ['a', 'a'],  // 重复
  category: 'invalid'  // 不在枚举中
};

const invalidProductResult = validateSchema(invalidProduct, productSchema);
console.log(`validateSchema(${JSON.stringify(invalidProduct)}, productSchema)`);
console.log(`结果：${invalidProductResult.valid ? '✓' : '✗'} ${invalidProductResult.message}`);
if (invalidProductResult.errors) {
  console.log(`\n错误详情:`);
  invalidProductResult.errors.forEach((error, i) => {
    console.log(`  ${i + 1}. [${error.field || 'root'}] ${error.message}`);
  });
}
console.log('');

// ============================================
// 示例 8: 数据清洗
// ============================================

console.log('=== 示例 8: 数据清洗 ===\n');

// 8.1 字符串清洗
console.log('8.1 字符串清洗:');

const trimResult = cleanData('  Hello World  ', { trim: true });
console.log(`cleanData('  Hello World  ', { trim: true })`);
console.log(`结果：${JSON.stringify(trimResult)}\n`);

const caseResult = cleanData('Hello', { toLowerCase: true });
console.log(`cleanData('Hello', { toLowerCase: true })`);
console.log(`结果：${JSON.stringify(caseResult)}\n`);

// 8.2 默认值处理
console.log('8.2 默认值处理:');

const defaultNull = cleanData(null, { default: 'N/A' });
console.log(`cleanData(null, { default: 'N/A' })`);
console.log(`结果：${JSON.stringify(defaultNull)}\n`);

const defaultUndefined = cleanData(undefined, { default: 0 });
console.log(`cleanData(undefined, { default: 0 })`);
console.log(`结果：${JSON.stringify(defaultUndefined)}\n`);

// 8.3 数组清洗
console.log('8.3 数组清洗:');

const uniqueResult = cleanData([1, 2, 2, 3, 3, 3], { unique: true });
console.log(`cleanData([1, 2, 2, 3, 3, 3], { unique: true })`);
console.log(`结果：${JSON.stringify(uniqueResult)}\n`);

const removeEmptyResult = cleanData([1, null, 2, undefined, 3, ''], { removeEmpty: true });
console.log(`cleanData([1, null, 2, undefined, 3, ''], { removeEmpty: true })`);
console.log(`结果：${JSON.stringify(removeEmptyResult)}\n`);

// 8.4 对象字段清洗
console.log('8.4 对象字段清洗:');

const userData = {
  name: '  John Doe  ',
  email: 'JOHN@EXAMPLE.COM',
  age: null,
  score: 95.678,
  tags: ['developer', 'admin', 'developer', '']
};

const cleaningRules = {
  name: { trim: true },
  email: { trim: true, toLowerCase: true },
  age: { default: 18 },
  score: { precision: 2 },
  tags: { unique: true, removeEmpty: true }
};

console.log('原始数据:', JSON.stringify(userData, null, 2));
const cleanedUserData = cleanObject(userData, cleaningRules);
console.log('清洗结果:', JSON.stringify(cleanedUserData, null, 2));
console.log('');

// ============================================
// 示例 9: 实际应用场景 - 用户注册
// ============================================

console.log('=== 示例 9: 实际应用场景 - 用户注册表单验证 ===\n');

const registrationForm = {
  username: '  JohnDoe  ',
  email: 'john.doe@example.com',
  password: 'Str0ng!P@ss',
  age: 25,
  role: 'user',
  interests: ['coding', 'music', 'coding']
};

const registrationSchema = {
  type: 'object',
  required: ['username', 'email', 'password'],
  fields: {
    username: { type: 'string', minLength: 3, maxLength: 20 },
    email: { type: 'string', email: true },
    password: { type: 'string', minLength: 8 },
    age: { type: 'number', min: 18, max: 120 },
    role: { type: 'string', enum: ['user', 'admin'] },
    interests: { type: 'array', unique: true }
  }
};

console.log('原始表单数据:', JSON.stringify(registrationForm, null, 2));
console.log('');

// 第一步：清洗数据
const cleanedForm = cleanObject(registrationForm, {
  username: { trim: true },
  email: { trim: true, toLowerCase: true },
  interests: { unique: true }
});

console.log('清洗后的表单:', JSON.stringify(cleanedForm.data, null, 2));
console.log(`清洗修改：${cleanedForm.modified ? '是' : '否'}`);
if (cleanedForm.changes) {
  console.log('修改记录:');
  cleanedForm.changes.forEach(change => {
    console.log(`  - ${change.field}: ${change.action}`);
  });
}
console.log('');

// 第二步：验证数据
const validationResult = validateSchema(cleanedForm.data, registrationSchema);
console.log('验证结果:', validationResult.valid ? '✓ 通过' : '✗ 失败');
console.log('说明:', validationResult.message);

if (!validationResult.valid && validationResult.errors) {
  console.log('\n错误详情:');
  validationResult.errors.forEach((error, i) => {
    console.log(`  ${i + 1}. [${error.field || 'root'}] ${error.message}`);
  });
}
console.log('');

// ============================================
// 示例 10: 实际应用场景 - API 响应验证
// ============================================

console.log('=== 示例 10: 实际应用场景 - API 响应验证 ===\n');

const apiResponseSchema = {
  type: 'object',
  required: ['success', 'data'],
  fields: {
    success: { type: 'boolean' },
    data: { type: 'object', optional: true },
    error: { type: 'string', optional: true },
    timestamp: { type: 'number', min: 0 },
    pagination: {
      type: 'object',
      optional: true,
      fields: {
        page: { type: 'number', min: 1, integer: true },
        pageSize: { type: 'number', min: 1, max: 100, integer: true },
        total: { type: 'number', min: 0, integer: true }
      }
    }
  }
};

console.log('10.1 有效 API 响应:');

const validResponse = {
  success: true,
  data: { id: 1, name: 'Item' },
  timestamp: Date.now(),
  pagination: {
    page: 1,
    pageSize: 20,
    total: 100
  }
};

const validResponseResult = validateSchema(validResponse, apiResponseSchema);
console.log(`结果：${validResponseResult.valid ? '✓' : '✗'} ${validResponseResult.message}\n`);

console.log('10.2 无效 API 响应:');

const invalidResponse = {
  success: 'true',  // 应该是布尔值
  timestamp: -1000,  // 负数
  pagination: {
    page: 0,  // 应该 >= 1
    pageSize: 150,  // 超过最大值
    total: -50  // 负数
  }
};

const invalidResponseResult = validateSchema(invalidResponse, apiResponseSchema);
console.log(`结果：${invalidResponseResult.valid ? '✓' : '✗'} ${invalidResponseResult.message}`);
if (invalidResponseResult.errors) {
  console.log('\n错误详情:');
  invalidResponseResult.errors.forEach((error, i) => {
    console.log(`  ${i + 1}. [${error.field || 'root'}] ${error.message}`);
  });
}
console.log('');

// ============================================
// 示例 11: 实际应用场景 - 配置验证
// ============================================

console.log('=== 示例 11: 实际应用场景 - 应用配置验证 ===\n');

const appConfigSchema = {
  type: 'object',
  required: ['appName', 'version', 'port'],
  fields: {
    appName: { type: 'string', minLength: 1 },
    version: { type: 'string', pattern: /^\d+\.\d+\.\d+$/ },
    port: { type: 'number', min: 1, max: 65535, integer: true },
    debug: { type: 'boolean', optional: true },
    database: {
      type: 'object',
      required: ['host', 'port'],
      fields: {
        host: { type: 'string', minLength: 1 },
        port: { type: 'number', min: 1, max: 65535, integer: true },
        username: { type: 'string', optional: true },
        password: { type: 'string', optional: true }
      }
    },
    features: { type: 'array', itemType: 'string', optional: true }
  }
};

const appConfig = {
  appName: 'MyApp',
  version: '1.0.0',
  port: 3000,
  debug: true,
  database: {
    host: 'localhost',
    port: 5432,
    username: 'admin'
  },
  features: ['auth', 'logging', 'cache']
};

console.log('应用配置:', JSON.stringify(appConfig, null, 2));
const configResult = validateSchema(appConfig, appConfigSchema);
console.log(`验证结果：${configResult.valid ? '✓ 通过' : '✗ 失败'}`);
console.log(`说明：${configResult.message}\n`);

// ============================================
// 示例 12: 组合使用 - 完整数据管道
// ============================================

console.log('=== 示例 12: 组合使用 - 完整数据管道 ===\n');

interface RawUserData {
  name: string;
  email: string;
  age: string | number;
  tags: string;
}

const rawUserData: RawUserData = {
  name: '  Alice Smith  ',
  email: 'ALICE@EXAMPLE.COM',
  age: '25',  // 字符串格式
  tags: 'developer,admin,developer'  // 逗号分隔字符串
};

console.log('原始数据:', JSON.stringify(rawUserData, null, 2));

// 数据转换和清洗管道
let processedData: any = { ...rawUserData };

// 步骤 1: 字符串清洗
processedData = cleanObject(processedData, {
  name: { trim: true },
  email: { trim: true, toLowerCase: true }
}).data;

// 步骤 2: 类型转换
processedData.age = parseInt(String(processedData.age), 10);
processedData.tags = processedData.tags.split(',').map((t: string) => t.trim());

// 步骤 3: 数组清洗
processedData.tags = cleanData(processedData.tags, { unique: true }).data;

console.log('处理后数据:', JSON.stringify(processedData, null, 2));

// 步骤 4: 最终验证
const finalSchema = {
  type: 'object',
  required: ['name', 'email', 'age', 'tags'],
  fields: {
    name: { type: 'string', minLength: 2 },
    email: { type: 'string', email: true },
    age: { type: 'number', min: 18, max: 120 },
    tags: { type: 'array', itemType: 'string', minLength: 1 }
  }
};

const finalResult = validateSchema(processedData, finalSchema);
console.log(`最终验证：${finalResult.valid ? '✓ 通过' : '✗ 失败'}`);
console.log(`说明：${finalResult.message}\n`);

console.log('=== 所有示例执行完成 ===');
