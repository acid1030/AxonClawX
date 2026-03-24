/**
 * Validation Utils Skill - 使用示例
 * 
 * 演示如何使用 validation-utils-skill.ts 中的验证功能
 */

import {
  FormValidator,
  SchemaValidator,
  BuiltInRules,
  createFormValidator,
  createSchemaValidator,
  validate,
  combineRules,
  type FormValidationConfig,
  type SchemaConfig,
  type ValidationRule,
} from './validation-utils-skill';

// ============================================
// 示例 1: 基础表单验证
// ============================================

async function example1_BasicFormValidation() {
  console.log('=== 示例 1: 基础表单验证 ===\n');

  // 定义表单验证配置
  const loginFormConfig: FormValidationConfig = {
    name: 'LoginForm',
    fields: [
      {
        field: 'username',
        label: '用户名',
        required: true,
        rules: [
          BuiltInRules.minLength(3),
          BuiltInRules.maxLength(20),
        ],
      },
      {
        field: 'password',
        label: '密码',
        required: true,
        rules: [
          BuiltInRules.minLength(8),
          BuiltInRules.pattern(
            /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
            '密码必须包含大小写字母和数字'
          ),
        ],
      },
      {
        field: 'email',
        label: '邮箱',
        rules: [
          BuiltInRules.email(),
        ],
      },
    ],
  };

  const validator = createFormValidator(loginFormConfig);

  // 测试数据 1: 有效数据
  const validData = {
    username: 'john_doe',
    password: 'MyPass123',
    email: 'john@example.com',
  };

  const result1 = await validator.validate(validData);
  console.log('测试有效数据:');
  console.log('通过:', result1.valid);
  console.log('错误:', result1.errors);
  console.log();

  // 测试数据 2: 无效数据
  const invalidData = {
    username: 'jo',  // 太短
    password: '123',  // 太短且不符合规则
    email: 'invalid-email',  // 无效邮箱
  };

  const result2 = await validator.validate(invalidData);
  console.log('测试无效数据:');
  console.log('通过:', result2.valid);
  console.log('错误:', JSON.stringify(result2.errors, null, 2));
  console.log();
}

// ============================================
// 示例 2: Schema 验证
// ============================================

async function example2_SchemaValidation() {
  console.log('=== 示例 2: Schema 验证 ===\n');

  // 定义用户 Schema
  const userSchema: SchemaConfig = {
    name: 'UserSchema',
    version: '1.0.0',
    fields: {
      id: {
        type: 'uuid',
        required: true,
        description: '用户唯一标识',
      },
      username: {
        type: 'string',
        required: true,
        min: 3,
        max: 50,
        pattern: /^[a-zA-Z0-9_]+$/,
      },
      email: {
        type: 'email',
        required: true,
      },
      age: {
        type: 'integer',
        min: 0,
        max: 150,
      },
      role: {
        type: 'string',
        enum: ['admin', 'user', 'guest'],
        default: 'user',
      },
      tags: {
        type: 'array',
        items: { type: 'string' },
        max: 10,
      },
      profile: {
        type: 'object',
        properties: {
          bio: { type: 'string', max: 500 },
          avatar: { type: 'url', nullable: true },
          socialLinks: {
            type: 'object',
            properties: {
              twitter: { type: 'url', nullable: true },
              github: { type: 'url', nullable: true },
            },
          },
        },
      },
      createdAt: {
        type: 'date',
        required: true,
      },
    },
  };

  const schemaValidator = createSchemaValidator(userSchema);

  // 测试数据 1: 有效数据
  const validUser = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    username: 'john_doe',
    email: 'john@example.com',
    age: 25,
    role: 'user',
    tags: ['developer', 'typescript'],
    profile: {
      bio: 'Full-stack developer',
      avatar: 'https://example.com/avatar.jpg',
      socialLinks: {
        github: 'https://github.com/johndoe',
      },
    },
    createdAt: new Date().toISOString(),
  };

  const result1 = await schemaValidator.validate(validUser);
  console.log('测试有效用户数据:');
  console.log('通过:', result1.valid);
  console.log();

  // 测试数据 2: 无效数据
  const invalidUser = {
    id: 'invalid-uuid',  // 无效 UUID
    username: 'jo',  // 太短
    email: 'not-an-email',  // 无效邮箱
    age: 200,  // 超出范围
    role: 'superuser',  // 不在枚举中
    tags: Array(15).fill('tag'),  // 超过最大数量
    profile: {
      bio: 'A'.repeat(600),  // 超过最大长度
    },
    createdAt: 'invalid-date',  // 无效日期
  };

  const result2 = await schemaValidator.validate(invalidUser);
  console.log('测试无效用户数据:');
  console.log('通过:', result2.valid);
  console.log('错误:', JSON.stringify(result2.errors, null, 2));
  console.log();
}

// ============================================
// 示例 3: 自定义验证规则
// ============================================

async function example3_CustomRules() {
  console.log('=== 示例 3: 自定义验证规则 ===\n');

  // 自定义规则：用户名不能包含敏感词
  const noProfanityRule: ValidationRule = {
    name: 'noProfanity',
    validator: (value) => {
      if (!value) return true;
      const sensitiveWords = ['spam', 'fake', 'scam'];
      const hasSensitiveWord = sensitiveWords.some(word => 
        value.toLowerCase().includes(word)
      );
      return !hasSensitiveWord || '用户名包含不当词汇';
    },
    message: '用户名包含不当词汇',
  };

  // 自定义规则：异步验证用户名是否已存在
  const usernameNotTakenRule: ValidationRule = {
    name: 'usernameNotTaken',
    validator: async (value) => {
      if (!value) return true;
      // 模拟 API 调用
      await new Promise(resolve => setTimeout(resolve, 100));
      const takenUsernames = ['admin', 'root', 'system'];
      return !takenUsernames.includes(value) || '用户名已被占用';
    },
    message: '用户名已被占用',
  };

  // 自定义规则：密码强度验证
  const passwordStrengthRule: ValidationRule = {
    name: 'passwordStrength',
    validator: (value) => {
      if (!value) return true;
      let strength = 0;
      if (value.length >= 8) strength++;
      if (/[a-z]/.test(value)) strength++;
      if (/[A-Z]/.test(value)) strength++;
      if (/\d/.test(value)) strength++;
      if (/[^a-zA-Z0-9]/.test(value)) strength++;
      return strength >= 4 || '密码强度不足，需要包含大小写字母、数字和特殊字符';
    },
    message: '密码强度不足',
  };

  const registrationFormConfig: FormValidationConfig = {
    name: 'RegistrationForm',
    fields: [
      {
        field: 'username',
        label: '用户名',
        required: true,
        rules: [
          BuiltInRules.minLength(3),
          BuiltInRules.maxLength(20),
          noProfanityRule,
          usernameNotTakenRule,
        ],
      },
      {
        field: 'password',
        label: '密码',
        required: true,
        rules: [
          BuiltInRules.minLength(8),
          passwordStrengthRule,
        ],
      },
      {
        field: 'confirmPassword',
        label: '确认密码',
        required: true,
        rules: [
          BuiltInRules.matchesField('password'),
        ],
      },
    ],
  };

  const validator = createFormValidator(registrationFormConfig);

  // 测试数据
  const testData = {
    username: 'admin',  // 已被占用
    password: 'weak',  // 强度不足
    confirmPassword: 'different',  // 不匹配
  };

  const result = await validator.validate(testData);
  console.log('测试自定义规则:');
  console.log('通过:', result.valid);
  console.log('错误:', JSON.stringify(result.errors, null, 2));
  console.log();
}

// ============================================
// 示例 4: 条件验证和跨字段验证
// ============================================

async function example4_ConditionalValidation() {
  console.log('=== 示例 4: 条件验证和跨字段验证 ===\n');

  // 条件验证：只有当用户选择"其他"时，职业字段才必填
  const jobTitleRule: ValidationRule = BuiltInRules.when(
    (formData) => formData.employmentType === 'other',
    [BuiltInRules.required()]
  );

  // 跨字段验证：结束日期必须晚于开始日期
  const endDateAfterStartDateRule: ValidationRule = {
    name: 'endDateAfterStartDate',
    validator: (value, context) => {
      if (!value) return true;
      const startDate = context?.formData.startDate;
      if (!startDate) return true;
      return new Date(value) > new Date(startDate) || '结束日期必须晚于开始日期';
    },
    message: '结束日期必须晚于开始日期',
  };

  const projectFormConfig: FormValidationConfig = {
    name: 'ProjectForm',
    fields: [
      {
        field: 'projectName',
        label: '项目名称',
        required: true,
        rules: [
          BuiltInRules.minLength(2),
        ],
      },
      {
        field: 'employmentType',
        label: '就业类型',
        required: true,
        rules: [
          BuiltInRules.enum(['full-time', 'part-time', 'contract', 'other']),
        ],
      },
      {
        field: 'jobTitle',
        label: '职位名称',
        rules: [
          jobTitleRule,
        ],
      },
      {
        field: 'startDate',
        label: '开始日期',
        required: true,
        rules: [],
      },
      {
        field: 'endDate',
        label: '结束日期',
        rules: [
          endDateAfterStartDateRule,
        ],
      },
      {
        field: 'budget',
        label: '预算',
        rules: [
          BuiltInRules.when(
            (formData) => formData.projectType === 'enterprise',
            [BuiltInRules.minValue(10000)]
          ),
        ],
      },
    ],
  };

  const validator = createFormValidator(projectFormConfig);

  // 测试数据 1: 有效
  const validProject = {
    projectName: 'AI Assistant',
    employmentType: 'full-time',
    jobTitle: '',  // 不需要，因为不是"other"
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    budget: 5000,
  };

  const result1 = await validator.validate(validProject);
  console.log('测试有效项目数据:');
  console.log('通过:', result1.valid);
  console.log();

  // 测试数据 2: 无效
  const invalidProject = {
    projectName: 'A',  // 太短
    employmentType: 'other',
    jobTitle: '',  // 必填但未填
    startDate: '2024-12-31',
    endDate: '2024-01-01',  // 早于开始日期
    budget: 5000,  // 如果是 enterprise 类型则太少
  };

  const result2 = await validator.validate(invalidProject);
  console.log('测试无效项目数据:');
  console.log('通过:', result2.valid);
  console.log('错误:', JSON.stringify(result2.errors, null, 2));
  console.log();
}

// ============================================
// 示例 5: 组合规则和值转换
// ============================================

async function example5_CombinedRulesAndTransform() {
  console.log('=== 示例 5: 组合规则和值转换 ===\n');

  // 组合多个规则
  const strongPasswordRule = combineRules(
    BuiltInRules.minLength(8),
    BuiltInRules.pattern(/[a-z]/, '必须包含小写字母'),
    BuiltInRules.pattern(/[A-Z]/, '必须包含大写字母'),
    BuiltInRules.pattern(/\d/, '必须包含数字'),
    BuiltInRules.pattern(/[^a-zA-Z0-9]/, '必须包含特殊字符')
  );

  // 值转换：去除空格、转小写
  const trimAndLowercase = (value: any) => {
    if (typeof value === 'string') {
      return value.trim().toLowerCase();
    }
    return value;
  };

  // 值转换：字符串转数字
  const stringToNumber = (value: any) => {
    if (typeof value === 'string') {
      const num = Number(value);
      return isNaN(num) ? value : num;
    }
    return value;
  };

  const contactFormConfig: FormValidationConfig = {
    name: 'ContactForm',
    fields: [
      {
        field: 'email',
        label: '邮箱',
        required: true,
        transform: trimAndLowercase,
        rules: [
          BuiltInRules.email(),
        ],
      },
      {
        field: 'phone',
        label: '电话',
        transform: (value) => value?.replace(/\D/g, ''),  // 只保留数字
        rules: [
          BuiltInRules.when(
            (formData) => !!formData.phone,
            [BuiltInRules.pattern(/^1[3-9]\d{9}$/, '手机号格式不正确')]
          ),
        ],
      },
      {
        field: 'age',
        label: '年龄',
        transform: stringToNumber,
        rules: [
          BuiltInRules.minValue(0),
          BuiltInRules.maxValue(150),
        ],
      },
      {
        field: 'password',
        label: '密码',
        required: true,
        rules: [
          strongPasswordRule,
        ],
      },
    ],
  };

  const validator = createFormValidator(contactFormConfig);

  // 测试数据 (包含需要转换的值)
  const testData = {
    email: '  JOHN@EXAMPLE.COM  ',  // 会被转换为 john@example.com
    phone: '138-0000-0000',  // 会被转换为 13800000000
    age: '25',  // 会被转换为 25
    password: 'MyP@ss123',
  };

  const result = await validator.validate(testData);
  console.log('测试值转换:');
  console.log('通过:', result.valid);
  console.log('转换后的数据:', result.data);
  console.log();
}

// ============================================
// 示例 6: 快速验证 (简单场景)
// ============================================

async function example6_QuickValidation() {
  console.log('=== 示例 6: 快速验证 (简单场景) ===\n');

  // 快速验证：无需创建验证器实例
  const data = {
    username: 'john',
    email: 'john@example.com',
    age: 25,
  };

  const rules = {
    username: [
      BuiltInRules.required(),
      BuiltInRules.minLength(3),
    ],
    email: [
      BuiltInRules.required(),
      BuiltInRules.email(),
    ],
    age: [
      BuiltInRules.minValue(0),
      BuiltInRules.maxValue(150),
    ],
  };

  const result = await validate(data, rules);
  console.log('快速验证结果:');
  console.log('通过:', result.valid);
  console.log('错误:', result.errors);
  console.log();
}

// ============================================
// 示例 7: 嵌套对象和数组验证
// ============================================

async function example7_NestedValidation() {
  console.log('=== 示例 7: 嵌套对象和数组验证 ===\n');

  const orderSchema: SchemaConfig = {
    name: 'OrderSchema',
    fields: {
      orderId: {
        type: 'uuid',
        required: true,
      },
      customer: {
        type: 'object',
        required: true,
        properties: {
          name: { type: 'string', required: true, min: 2 },
          email: { type: 'email', required: true },
          phone: { type: 'phone', nullable: true },
          address: {
            type: 'object',
            required: true,
            properties: {
              street: { type: 'string', required: true },
              city: { type: 'string', required: true },
              zipCode: { type: 'string', pattern: /^\d{6}$/, required: true },
              country: { type: 'string', required: true },
            },
          },
        },
      },
      items: {
        type: 'array',
        required: true,
        min: 1,
        max: 100,
        items: {
          type: 'object',
          properties: {
            productId: { type: 'uuid', required: true },
            name: { type: 'string', required: true },
            quantity: { type: 'integer', required: true, min: 1 },
            price: { type: 'number', required: true, min: 0 },
          },
        },
      },
      totalAmount: {
        type: 'number',
        required: true,
        min: 0,
      },
      status: {
        type: 'string',
        enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'],
        default: 'pending',
      },
    },
  };

  const validator = createSchemaValidator(orderSchema);

  // 测试数据
  const validOrder = {
    orderId: '550e8400-e29b-41d4-a716-446655440001',
    customer: {
      name: 'John Doe',
      email: 'john@example.com',
      phone: '13800138000',
      address: {
        street: '123 Main St',
        city: 'Beijing',
        zipCode: '100000',
        country: 'China',
      },
    },
    items: [
      {
        productId: '550e8400-e29b-41d4-a716-446655440002',
        name: 'Product A',
        quantity: 2,
        price: 99.99,
      },
      {
        productId: '550e8400-e29b-41d4-a716-446655440003',
        name: 'Product B',
        quantity: 1,
        price: 199.99,
      },
    ],
    totalAmount: 399.97,
    status: 'processing',
  };

  const result = await validator.validate(validOrder);
  console.log('测试嵌套订单数据:');
  console.log('通过:', result.valid);
  if (!result.valid) {
    console.log('错误:', JSON.stringify(result.errors, null, 2));
  }
  console.log();
}

// ============================================
// 运行所有示例
// ============================================

async function runAllExamples() {
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║       Validation Utils Skill - 使用示例                   ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  await example1_BasicFormValidation();
  await example2_SchemaValidation();
  await example3_CustomRules();
  await example4_ConditionalValidation();
  await example5_CombinedRulesAndTransform();
  await example6_QuickValidation();
  await example7_NestedValidation();

  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║                    所有示例完成！                         ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
}

// 如果直接运行此文件
if (require.main === module) {
  runAllExamples().catch(console.error);
}

// 导出示例函数供测试使用
export {
  example1_BasicFormValidation,
  example2_SchemaValidation,
  example3_CustomRules,
  example4_ConditionalValidation,
  example5_CombinedRulesAndTransform,
  example6_QuickValidation,
  example7_NestedValidation,
  runAllExamples,
};
