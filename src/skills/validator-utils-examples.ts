/**
 * 表单字段验证工具 - 使用示例
 * 
 * 演示如何使用 validator-utils-skill.ts 进行表单验证
 */

import {
  createValidator,
  validate,
  validateField,
  validateOrThrow,
  PredefinedRules,
  type ValidatorSchema,
  type FieldRule
} from './validator-utils-skill';

// ============ 示例 1: 基础必填验证 ============

console.log('=== 示例 1: 基础必填验证 ===\n');

const loginSchema: ValidatorSchema = {
  fields: {
    username: {
      type: 'string',
      required: true,
      minLength: 3,
      maxLength: 20
    },
    password: {
      type: 'string',
      required: true,
      minLength: 6
    }
  }
};

const loginValidator = createValidator(loginSchema);

// 测试有效数据
const validLogin = {
  username: 'john_doe',
  password: '123456'
};

const result1 = loginValidator.validate(validLogin);
console.log('有效登录数据:', result1);
// 输出：{ valid: true, errors: [] }

// 测试无效数据
const invalidLogin = {
  username: 'jo',  // 太短
  password: ''     // 空密码
};

const result2 = loginValidator.validate(invalidLogin);
console.log('无效登录数据:', result2);
// 输出：{ valid: false, errors: [...] }

console.log('');

// ============ 示例 2: 格式验证 (邮箱、手机、URL) ============

console.log('=== 示例 2: 格式验证 ===\n');

const contactSchema: ValidatorSchema = {
  fields: {
    email: PredefinedRules.email(true),
    phone: PredefinedRules.phoneCN(false),
    website: PredefinedRules.url(false)
  }
};

const contactValidator = createValidator(contactSchema);

const contactData = {
  email: 'invalid-email',  // 无效邮箱
  phone: '12345678901',    // 有效手机号
  website: 'https://example.com'
};

const result3 = contactValidator.validate(contactData);
console.log('联系方式验证:', result3);
// 输出：{ valid: false, errors: [{ field: 'email', code: 'email', ... }] }

console.log('');

// ============ 示例 3: 数字范围验证 ============

console.log('=== 示例 3: 数字范围验证 ===\n');

const productSchema: ValidatorSchema = {
  fields: {
    name: {
      type: 'string',
      required: true,
      minLength: 1,
      maxLength: 100
    },
    price: {
      type: 'number',
      required: true,
      min: 0,
      max: 999999
    },
    quantity: {
      type: 'number',
      required: true,
      min: 0,
      max: 10000
    },
    discount: PredefinedRules.percentage()
  }
};

const productValidator = createValidator(productSchema);

const productData = {
  name: 'iPhone 15',
  price: 7999,
  quantity: 100,
  discount: 15
};

const result4 = productValidator.validate(productData);
console.log('产品信息验证:', result4);
// 输出：{ valid: true, errors: [] }

const invalidProduct = {
  name: '',
  price: -100,      // 负数
  quantity: 50000,  // 超出范围
  discount: 150     // 超过 100%
};

const result5 = productValidator.validate(invalidProduct);
console.log('无效产品信息:', result5);
// 输出：{ valid: false, errors: [...] }

console.log('');

// ============ 示例 4: 身份证验证 ============

console.log('=== 示例 4: 身份证验证 ===\n');

const userSchema: ValidatorSchema = {
  fields: {
    name: {
      type: 'string',
      required: true,
      minLength: 2,
      maxLength: 20
    },
    idCard: PredefinedRules.idCard(true)
  }
};

const userValidator = createValidator(userSchema);

const userData = {
  name: '张三',
  idCard: '110101199003071234'  // 有效身份证号
};

const result6 = userValidator.validate(userData);
console.log('用户信息验证:', result6);
// 输出：{ valid: true, errors: [] }

const invalidIDCard = {
  name: '李四',
  idCard: '11010119900307123X'  // 校验码错误
};

const result7 = userValidator.validate(invalidIDCard);
console.log('无效身份证:', result7);
// 输出：{ valid: false, errors: [{ field: 'idCard', code: 'idCard', ... }] }

console.log('');

// ============ 示例 5: 密码强度验证 ============

console.log('=== 示例 5: 密码强度验证 ===\n');

const registerSchema: ValidatorSchema = {
  fields: {
    username: PredefinedRules.username(true),
    password: PredefinedRules.passwordStrong(true),
    email: PredefinedRules.email(true)
  }
};

const registerValidator = createValidator(registerSchema);

const weakPassword = {
  username: 'newuser',
  password: '123456',  // 弱密码
  email: 'user@example.com'
};

const result8 = registerValidator.validate(weakPassword);
console.log('弱密码验证:', result8);
// 输出：{ valid: false, errors: [{ field: 'password', code: 'custom', ... }] }

const strongPassword = {
  username: 'newuser',
  password: 'Abc123!@#',  // 强密码
  email: 'user@example.com'
};

const result9 = registerValidator.validate(strongPassword);
console.log('强密码验证:', result9);
// 输出：{ valid: true, errors: [] }

console.log('');

// ============ 示例 6: 自定义验证规则 ============

console.log('=== 示例 6: 自定义验证规则 ===\n');

const customSchema: ValidatorSchema = {
  fields: {
    username: {
      type: 'string',
      required: true,
      custom: (value, field, data) => {
        if (typeof value !== 'string') return '类型错误';
        if (value.includes('admin')) return '用户名不能包含 "admin"';
        if (value.includes('root')) return '用户名不能包含 "root"';
        return null;
      }
    },
    password: {
      type: 'string',
      required: true
    },
    confirmPassword: {
      type: 'string',
      required: true,
      custom: (value, field, data) => {
        if (value !== data.password) {
          return '两次输入的密码不一致';
        }
        return null;
      }
    },
    age: {
      type: 'number',
      required: true,
      custom: (value) => {
        if (typeof value !== 'number') return '类型错误';
        if (value < 18) return '必须年满 18 岁';
        if (value > 100) return '年龄不能超过 100 岁';
        return null;
      }
    }
  }
};

const customValidator = createValidator(customSchema);

const invalidCustom = {
  username: 'admin_user',
  password: '123456',
  confirmPassword: '1234567',  // 不匹配
  age: 15  // 未成年
};

const result10 = customValidator.validate(invalidCustom);
console.log('自定义规则验证:', result10);
// 输出：{ valid: false, errors: [...] }

console.log('');

// ============ 示例 7: 字段转换和修剪 ============

console.log('=== 示例 7: 字段转换和修剪 ===\n');

const transformSchema: ValidatorSchema = {
  fields: {
    email: {
      type: 'email',
      required: true,
      trim: true,
      transform: (value) => {
        if (typeof value === 'string') {
          return value.toLowerCase().trim();
        }
        return value;
      }
    },
    code: {
      type: 'string',
      required: true,
      transform: (value) => {
        if (typeof value === 'string') {
          return value.toUpperCase();
        }
        return value;
      }
    }
  }
};

const transformValidator = createValidator(transformSchema);

const transformData = {
  email: '  USER@EXAMPLE.COM  ',
  code: 'abc123'
};

const result11 = transformValidator.validate(transformData);
console.log('转换后验证:', result11);
// 输出：{ valid: true, errors: [] }

console.log('');

// ============ 示例 8: 枚举验证 ============

console.log('=== 示例 8: 枚举验证 ===\n');

const orderSchema: ValidatorSchema = {
  fields: {
    productId: {
      type: 'string',
      required: true
    },
    quantity: {
      type: 'number',
      required: true,
      min: 1
    },
    status: {
      type: 'string',
      required: true,
      enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled']
    },
    paymentMethod: {
      type: 'string',
      required: true,
      enum: ['alipay', 'wechat', 'credit_card', 'bank_transfer']
    }
  }
};

const orderValidator = createValidator(orderSchema);

const invalidOrder = {
  productId: 'PROD-001',
  quantity: 5,
  status: 'unknown',  // 无效状态
  paymentMethod: 'cash'  // 无效支付方式
};

const result12 = orderValidator.validate(invalidOrder);
console.log('订单验证:', result12);
// 输出：{ valid: false, errors: [...] }

console.log('');

// ============ 示例 9: 快速验证单个字段 ============

console.log('=== 示例 9: 快速验证单个字段 ===\n');

// 验证邮箱
const emailResult = validateField('email', 'test@example.com', {
  type: 'email',
  required: true
});
console.log('邮箱验证:', emailResult);
// 输出：{ valid: true, errors: [] }

// 验证手机号
const phoneResult = validateField('phone', '12345', {
  type: 'phone',
  required: true
});
console.log('手机号验证:', phoneResult);
// 输出：{ valid: false, errors: [...] }

// 验证数字范围
const ageResult = validateField('age', 150, {
  type: 'number',
  min: 0,
  max: 120
});
console.log('年龄验证:', ageResult);
// 输出：{ valid: false, errors: [...] }

console.log('');

// ============ 示例 10: 验证并抛出异常 ============

console.log('=== 示例 10: 验证并抛出异常 ===\n');

const strictSchema: ValidatorSchema = {
  fields: {
    username: PredefinedRules.username(true),
    email: PredefinedRules.email(true)
  }
};

try {
  validateOrThrow({
    username: 'valid_user',
    email: 'invalid-email'
  }, strictSchema);
} catch (error) {
  console.log('验证异常:', (error as Error).message);
  // 输出：验证失败：字段 email 必须是有效的邮箱地址
}

console.log('');

// ============ 示例 11: 动态添加/移除规则 ============

console.log('=== 示例 11: 动态添加/移除规则 ===\n');

const dynamicSchema: ValidatorSchema = {
  fields: {
    username: {
      type: 'string',
      required: true
    }
  }
};

const dynamicValidator = createValidator(dynamicSchema);

// 添加新规则
dynamicValidator.addRule('email', PredefinedRules.email(true));

const dataWithEmail = {
  username: 'user123',
  email: 'user@example.com'
};

const result13 = dynamicValidator.validate(dataWithEmail);
console.log('添加规则后验证:', result13);
// 输出：{ valid: true, errors: [] }

// 移除规则
dynamicValidator.removeRule('email');

const dataWithoutEmail = {
  username: 'user123',
  email: 'invalid'  // 不再验证
};

const result14 = dynamicValidator.validate(dataWithoutEmail);
console.log('移除规则后验证:', result14);
// 输出：{ valid: true, errors: [] } (严格模式下会报错)

console.log('');

// ============ 示例 12: 严格模式 ============

console.log('=== 示例 12: 严格模式 ===\n');

const strictModeSchema: ValidatorSchema = {
  fields: {
    username: {
      type: 'string',
      required: true
    }
  },
  strict: true  // 开启严格模式
};

const strictValidator = createValidator(strictModeSchema);

const extraFields = {
  username: 'user123',
  email: 'user@example.com',  // 未定义的字段
  age: 25  // 未定义的字段
};

const result15 = strictValidator.validate(extraFields);
console.log('严格模式验证:', result15);
// 输出：{ valid: false, errors: [{ field: 'email', ... }, { field: 'age', ... }] }

console.log('');

// ============ 示例 13: 日期时间验证 ============

console.log('=== 示例 13: 日期时间验证 ===\n');

const eventSchema: ValidatorSchema = {
  fields: {
    title: {
      type: 'string',
      required: true
    },
    date: PredefinedRules.date(true),
    startTime: {
      type: 'time',
      required: true
    },
    endTime: {
      type: 'time',
      required: true
    },
    dateTime: {
      type: 'dateTime',
      required: false
    }
  }
};

const eventValidator = createValidator(eventSchema);

const validEvent = {
  title: '团队会议',
  date: '2024-03-15',
  startTime: '09:00:00',
  endTime: '10:30:00',
  dateTime: '2024-03-15 09:00:00'
};

const result16 = eventValidator.validate(validEvent);
console.log('有效事件:', result16);
// 输出：{ valid: true, errors: [] }

const invalidEvent = {
  title: '团队会议',
  date: '2024-13-45',  // 无效日期
  startTime: '25:00:00',  // 无效时间
  endTime: '10:30:00'
};

const result17 = eventValidator.validate(invalidEvent);
console.log('无效事件:', result17);
// 输出：{ valid: false, errors: [...] }

console.log('');

// ============ 示例 14: 复杂业务场景 ============

console.log('=== 示例 14: 复杂业务场景 - 用户注册 ===\n');

const registrationSchema: ValidatorSchema = {
  fields: {
    // 基本信息
    username: PredefinedRules.username(true),
    email: PredefinedRules.email(true),
    password: PredefinedRules.passwordStrong(true),
    
    // 个人信息
    nickname: {
      type: 'string',
      required: false,
      minLength: 2,
      maxLength: 20,
      trim: true
    },
    phone: PredefinedRules.phoneCN(false),
    idCard: PredefinedRules.idCard(false),
    
    // 其他信息
    gender: {
      type: 'string',
      required: false,
      enum: ['male', 'female', 'other']
    },
    birthDate: PredefinedRules.date(false),
    age: {
      type: 'number',
      required: false,
      min: 0,
      max: 150,
      custom: (value, field, data) => {
        if (value === undefined) return null;
        if (data.birthDate) {
          // 如果提供了出生日期，验证年龄是否匹配
          const birthYear = new Date(data.birthDate as string).getFullYear();
          const currentYear = new Date().getFullYear();
          const calculatedAge = currentYear - birthYear;
          if (Math.abs(calculatedAge - (value as number)) > 1) {
            return '年龄与出生日期不匹配';
          }
        }
        return null;
      }
    }
  }
};

const registrationValidator = createValidator(registrationSchema);

const registrationData = {
  username: 'new_user_2024',
  email: 'newuser@example.com',
  password: 'SecurePass123!',
  nickname: '  小明  ',  // 会自动 trim
  phone: '13800138000',
  gender: 'male',
  birthDate: '1990-01-01',
  age: 34
};

const result18 = registrationValidator.validate(registrationData);
console.log('用户注册验证:', result18);
// 输出：{ valid: true, errors: [] }

console.log('');
console.log('=== 所有示例完成 ===');
