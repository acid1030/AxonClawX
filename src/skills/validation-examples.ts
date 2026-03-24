/**
 * 数据验证技能 - 使用示例
 * 
 * 演示如何使用 validation-skill.ts 进行数据验证
 */

import {
  DataValidator,
  ErrorFormatter,
  PredefinedRules,
  createValidator,
  validate,
  validateOrThrow,
  type Schema
} from './validation-skill';

// ============ 示例 1: 基础 Schema 验证 ============

console.log('=== 示例 1: 基础 Schema 验证 ===\n');

const userSchema: Schema = {
  fields: {
    username: {
      type: 'string',
      required: true,
      minLength: 3,
      maxLength: 20
    },
    age: {
      type: 'number',
      required: true,
      min: 0,
      max: 150
    },
    email: {
      type: 'string',
      required: true
    },
    isActive: {
      type: 'boolean',
      required: false
    },
    tags: {
      type: 'array',
      required: false,
      items: {
        type: 'string'
      }
    }
  }
};

const validator = createValidator(userSchema);

// 有效数据
const validUser = {
  username: 'john_doe',
  age: 25,
  email: 'john@example.com',
  isActive: true,
  tags: ['developer', 'designer']
};

const result1 = validator.validate(validUser);
console.log('有效数据验证结果:');
console.log(ErrorFormatter.format(result1.errors, { format: 'summary' }));
console.log('');

// 无效数据
const invalidUser = {
  username: 'jo',  // 太短
  age: 200,        // 超出范围
  email: 123,      // 类型错误
  isActive: 'yes'  // 类型错误
};

const result2 = validator.validate(invalidUser);
console.log('无效数据验证结果:');
console.log(ErrorFormatter.format(result2.errors, {
  format: 'list',
  includeCode: true,
  includeValue: true
}));
console.log('');

// ============ 示例 2: 自定义验证规则 ============

console.log('=== 示例 2: 自定义验证规则 ===\n');

const productSchema: Schema = {
  fields: {
    name: {
      type: 'string',
      required: true,
      customRules: [
        {
          name: 'noSpecialChars',
          validator: (value) => {
            if (typeof value !== 'string') return true;
            return !/[!@#$%^&*]/.test(value) || '名称不能包含特殊字符';
          },
          message: '名称包含非法字符'
        }
      ]
    },
    price: {
      type: 'number',
      required: true,
      min: 0
    },
    discountPrice: {
      type: 'number',
      required: false,
      customRules: [
        // 折扣价必须低于原价
        PredefinedRules.dependsOn(
          'price',
          (discountValue, priceValue) => {
            if (discountValue === undefined) return true;
            return typeof discountValue === 'number' && 
                   typeof priceValue === 'number' && 
                   discountValue < priceValue;
          },
          '折扣价必须低于原价'
        )
      ]
    }
  }
};

const productValidator = createValidator(productSchema);

const invalidProduct = {
  name: 'Product@Special!',
  price: 100,
  discountPrice: 150  // 高于原价
};

const result3 = productValidator.validate(invalidProduct);
console.log('自定义规则验证结果:');
console.log(ErrorFormatter.format(result3.errors, { format: 'list' }));
console.log('');

// ============ 示例 3: 使用预定义规则 ============

console.log('=== 示例 3: 使用预定义规则 ===\n');

const registrationSchema: Schema = {
  fields: {
    email: {
      type: 'string',
      required: true,
      customRules: [PredefinedRules.email]
    },
    phone: {
      type: 'string',
      required: true,
      customRules: [PredefinedRules.phone]
    },
    password: {
      type: 'string',
      required: true,
      minLength: 8,
      customRules: [PredefinedRules.passwordStrength]
    },
    website: {
      type: 'string',
      required: false,
      customRules: [PredefinedRules.url]
    },
    age: {
      type: 'number',
      required: true,
      customRules: [PredefinedRules.ageRange(18, 100)]
    }
  }
};

const regValidator = createValidator(registrationSchema);

const invalidRegistration = {
  email: 'not-an-email',
  phone: '123456',
  password: 'weak',
  website: 'not-a-url',
  age: 15
};

const result4 = regValidator.validate(invalidRegistration);
console.log('预定义规则验证结果:');
console.log(ErrorFormatter.format(result4.errors, { format: 'list', includeCode: true }));
console.log('');

// ============ 示例 4: 嵌套对象验证 ============

console.log('=== 示例 4: 嵌套对象验证 ===\n');

const addressSchema: Schema = {
  fields: {
    street: { type: 'string', required: true },
    city: { type: 'string', required: true },
    zipCode: { 
      type: 'string', 
      required: true,
      pattern: /^\d{6}$/
    }
  }
};

const orderSchema: Schema = {
  fields: {
    orderId: { type: 'string', required: true },
    customer: {
      type: 'object',
      required: true,
      properties: {
        name: { type: 'string', required: true },
        email: { 
          type: 'string', 
          required: true,
          customRules: [PredefinedRules.email]
        }
      }
    },
    shippingAddress: {
      type: 'object',
      required: true,
      properties: addressSchema.fields
    },
    items: {
      type: 'array',
      required: true,
      items: {
        type: 'object',
        properties: {
          productId: { type: 'string', required: true },
          quantity: { type: 'number', required: true, min: 1 }
        }
      }
    }
  }
};

const orderValidator = createValidator(orderSchema);

const invalidOrder = {
  orderId: 'ORD-001',
  customer: {
    name: 'John',
    email: 'invalid-email'
  },
  shippingAddress: {
    street: '123 Main St',
    city: 'Beijing',
    zipCode: '12345'  // 格式错误
  },
  items: [
    { productId: 'P001', quantity: 2 },
    { productId: 'P002', quantity: 0 }  // 数量无效
  ]
};

const result5 = orderValidator.validate(invalidOrder);
console.log('嵌套对象验证结果:');
console.log(ErrorFormatter.format(result5.errors, { format: 'list' }));
console.log('');

// ============ 示例 5: 严格模式 ============

console.log('=== 示例 5: 严格模式 (不允许额外字段) ===\n');

const strictSchema: Schema = {
  strict: true,  // 开启严格模式
  fields: {
    id: { type: 'string', required: true },
    name: { type: 'string', required: true }
  }
};

const strictValidator = createValidator(strictSchema);

const dataWithExtraFields = {
  id: '123',
  name: 'Test',
  extraField: 'should not be here',
  anotherExtra: 456
};

const result6 = strictValidator.validate(dataWithExtraFields);
console.log('严格模式验证结果:');
console.log(ErrorFormatter.format(result6.errors, { format: 'list' }));
console.log('');

// ============ 示例 6: 不同错误格式化方式 ============

console.log('=== 示例 6: 不同错误格式化方式 ===\n');

const testSchema: Schema = {
  fields: {
    username: { type: 'string', required: true, minLength: 5 },
    email: { type: 'string', required: true },
    age: { type: 'number', required: true, min: 18 }
  }
};

const testData = { username: 'abc', email: 'bad', age: 10 };
const testResult = validate(testData, testSchema);

console.log('列表格式:');
console.log(ErrorFormatter.format(testResult.errors, { format: 'list', prefix: '错误:\n' }));
console.log('');

console.log('行内格式:');
console.log(ErrorFormatter.format(testResult.errors, { format: 'inline', includeCode: true }));
console.log('');

console.log('摘要格式:');
console.log(ErrorFormatter.format(testResult.errors, { format: 'summary' }));
console.log('');

console.log('JSON 格式:');
console.log(ErrorFormatter.format(testResult.errors, { format: 'json' }));
console.log('');

// ============ 示例 7: 快速验证函数 ============

console.log('=== 示例 7: 快速验证函数 ===\n');

const quickSchema: Schema = {
  fields: {
    title: { type: 'string', required: true, minLength: 3 },
    count: { type: 'number', required: true, min: 0 }
  }
};

// 使用 validate 快速验证
const quickResult = validate({ title: 'AB', count: -5 }, quickSchema);
console.log('快速验证结果:', quickResult.valid ? '通过' : '失败');
if (!quickResult.valid) {
  console.log(ErrorFormatter.format(quickResult.errors, { format: 'summary' }));
}
console.log('');

// ============ 示例 8: 验证并抛出异常 ============

console.log('=== 示例 8: 验证并抛出异常 ===\n');

try {
  validateOrThrow({ title: 'AB', count: -5 }, quickSchema);
} catch (error) {
  if (error instanceof Error && 'format' in error) {
    console.log('捕获验证异常:');
    console.log((error as any).format({ format: 'list' }));
  }
}
console.log('');

// ============ 示例 9: 复杂业务场景 - 用户注册 ============

console.log('=== 示例 9: 复杂业务场景 - 用户注册 ===\n');

const registrationFlowSchema: Schema = {
  fields: {
    // 基本信息
    username: {
      type: 'string',
      required: true,
      minLength: 3,
      maxLength: 20,
      pattern: /^[a-zA-Z][a-zA-Z0-9_]*$/,
      customRules: [{
        name: 'noKeywords',
        validator: (value) => {
          const keywords = ['admin', 'root', 'system'];
          if (typeof value !== 'string') return true;
          return !keywords.includes(value.toLowerCase()) || '用户名不能使用保留字';
        },
        message: '用户名包含保留字'
      }]
    },
    
    // 联系方式
    email: {
      type: 'string',
      required: true,
      customRules: [PredefinedRules.email]
    },
    phone: {
      type: 'string',
      required: false,
      customRules: [PredefinedRules.phone]
    },
    
    // 安全信息
    password: {
      type: 'string',
      required: true,
      minLength: 8,
      maxLength: 32,
      customRules: [PredefinedRules.passwordStrength]
    },
    confirmPassword: {
      type: 'string',
      required: true,
      customRules: [PredefinedRules.dependsOn(
        'password',
        (confirmValue, passwordValue) => {
          return confirmValue === passwordValue || '两次输入的密码不一致';
        },
        '密码不一致'
      )]
    },
    
    // 个人信息
    age: {
      type: 'number',
      required: true,
      min: 13,
      max: 120,
      customRules: [PredefinedRules.ageRange(13, 120)]
    },
    country: {
      type: 'string',
      required: true,
      enum: ['CN', 'US', 'UK', 'JP', 'KR', 'OTHER']
    },
    
    // 可选信息
    bio: {
      type: 'string',
      required: false,
      maxLength: 500
    },
    website: {
      type: 'string',
      required: false,
      customRules: [PredefinedRules.url]
    },
    
    // 协议同意
    agreeToTerms: {
      type: 'boolean',
      required: true
    }
  }
};

const regFlowValidator = createValidator(registrationFlowSchema);

const invalidRegistrationData = {
  username: 'admin',  // 保留字
  email: 'not-email',
  phone: '123',
  password: '123',  // 太弱
  confirmPassword: '456',  // 不匹配
  age: 10,  // 太小
  country: 'XX',  // 不在枚举中
  bio: 'A'.repeat(600),  // 太长
  website: 'not-url',
  agreeToTerms: false  // 必须同意
};

const result9 = regFlowValidator.validate(invalidRegistrationData);
console.log('用户注册验证结果:');
console.log(ErrorFormatter.format(result9.errors, {
  format: 'list',
  includeCode: true,
  prefix: '注册失败，请修正以下问题:\n'
}));
console.log('');

// ============ 示例 10: 批量验证 ============

console.log('=== 示例 10: 批量验证 ===\n');

const itemsSchema: Schema = {
  fields: {
    id: { type: 'string', required: true },
    name: { type: 'string', required: true, minLength: 1 }
  }
};

const items = [
  { id: '1', name: 'Item 1' },
  { id: '2', name: '' },  // 无效
  { id: '', name: 'Item 3' },  // 无效
  { id: '4', name: 'Item 4' }
];

let totalErrors = 0;
items.forEach((item, index) => {
  const itemValidator = createValidator(itemsSchema);
  const itemResult = itemValidator.validate(item);
  if (!itemResult.valid) {
    totalErrors++;
    console.log(`物品 #${index + 1} (${item.id || '未知'}) 验证失败:`);
    console.log(ErrorFormatter.format(itemResult.errors, { format: 'inline' }));
  }
});

console.log(`\n批量验证完成：${totalErrors}/${items.length} 个物品验证失败`);

console.log('\n=== 所有示例执行完成 ===');
