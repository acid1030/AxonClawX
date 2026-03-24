/**
 * Schema Utils Skill - 使用示例
 * 
 * 演示 JSON Schema 验证工具的各种使用场景
 */

import {
  SchemaValidator,
  SchemaDefinition,
  ValidationResult,
  ValidationError,
  isValid,
  validate,
  assertValid,
  SchemaValidationError
} from './schema-utils-skill';

// ============================================
// 示例 1: 基础对象验证
// ============================================

console.log('=== 示例 1: 基础对象验证 ===\n');

const userSchema: SchemaDefinition = {
  type: 'object',
  required: ['name', 'email', 'age'],
  properties: {
    name: { type: 'string', minLength: 1, maxLength: 50 },
    email: { type: 'string', format: 'email' },
    age: { type: 'integer', minimum: 0, maximum: 150 },
    phone: { type: 'string', pattern: '^1[3-9]\\d{9}$' },
    tags: {
      type: 'array',
      items: { type: 'string' }
    },
    address: {
      type: 'object',
      properties: {
        city: { type: 'string' },
        zip: { type: 'string', pattern: '^\\d{5,6}$' }
      }
    }
  }
};

const validator = new SchemaValidator(userSchema);

// 有效数据
const validUser = {
  name: 'John Doe',
  email: 'john@example.com',
  age: 25,
  phone: '13812345678',
  tags: ['developer', 'admin'],
  address: {
    city: 'Beijing',
    zip: '100000'
  }
};

let result = validator.validate(validUser);
console.log('有效数据验证:', result.valid); // true
console.log('验证耗时:', result.meta?.duration, 'ms\n');

// 无效数据
const invalidUser = {
  name: '',
  email: 'invalid-email',
  age: -5,
  phone: '12345',
  tags: ['valid', 123], // 数组项类型错误
  address: {
    city: 'Beijing',
    zip: 'abc'
  }
};

result = validator.validate(invalidUser);
console.log('无效数据验证:', result.valid); // false
console.log('错误数量:', result.errors.length);
console.log('\n错误详情:');
result.errors.forEach((error, i) => {
  console.log(`${i + 1}. ${error.path}`);
  console.log(`   ${error.message}`);
  console.log(`   代码：${error.code}\n`);
});

// ============================================
// 示例 2: 自定义错误消息
// ============================================

console.log('\n=== 示例 2: 自定义错误消息 ===\n');

const customValidator = new SchemaValidator(userSchema, {
  locale: 'zh',
  messages: {
    REQUIRED: '❗ {field} 是必填项，不能为空',
    TYPE_MISMATCH: '❌ {field} 类型错误：应该是 {expected}，实际是 {actual}',
    FORMAT_MISMATCH: '📧 {field} 格式不正确，必须是 {format} 格式',
    MIN_LENGTH: '📏 {field} 长度太短，至少需要 {min} 个字符',
    PATTERN_MISMATCH: '🔢 {field} 格式不符合要求'
  }
});

const testUser = { name: '', email: 'bad' };
const customResult = customValidator.validate(testUser);

customResult.errors.forEach(error => {
  console.log(`${error.path}: ${error.message}`);
});

// ============================================
// 示例 3: 数组验证
// ============================================

console.log('\n=== 示例 3: 数组验证 ===\n');

const productsSchema: SchemaDefinition = {
  type: 'array',
  items: {
    type: 'object',
    required: ['id', 'name', 'price'],
    properties: {
      id: { type: 'string', pattern: '^PROD-\\d+$' },
      name: { type: 'string', minLength: 1 },
      price: { type: 'number', minimum: 0 },
      quantity: { type: 'integer', minimum: 0, default: 0 },
      categories: {
        type: 'array',
        items: { type: 'string' }
      }
    }
  }
};

const productsValidator = new SchemaValidator(productsSchema);

const products = [
  { id: 'PROD-001', name: 'Laptop', price: 999.99, quantity: 10 },
  { id: 'INVALID', name: '', price: -100 }, // 多个错误
  { id: 'PROD-003', name: 'Mouse', price: 29.99 }
];

const productsResult = productsValidator.validate(products);
console.log('产品数组验证:', productsResult.valid);
if (!productsResult.valid) {
  console.log('错误:');
  productsResult.errors.forEach(e => {
    console.log(`  ${e.path}: ${e.message}`);
  });
}

// ============================================
// 示例 4: 组合 Schema (oneOf/anyOf/allOf)
// ============================================

console.log('\n=== 示例 4: 组合 Schema ===\n');

// oneOf: 必须恰好匹配一个
const contactSchema: SchemaDefinition = {
  oneOf: [
    {
      type: 'object',
      required: ['email'],
      properties: {
        email: { type: 'string', format: 'email' },
        name: { type: 'string' }
      },
      additionalProperties: false
    },
    {
      type: 'object',
      required: ['phone'],
      properties: {
        phone: { type: 'string', pattern: '^1[3-9]\\d{9}$' },
        name: { type: 'string' }
      },
      additionalProperties: false
    }
  ]
};

const contactValidator = new SchemaValidator(contactSchema);

console.log('仅邮箱:', contactValidator.validate({ email: 'test@example.com' }).valid); // true
console.log('仅手机:', contactValidator.validate({ phone: '13812345678' }).valid); // true
console.log('两者都有:', contactValidator.validate({ 
  email: 'test@example.com', 
  phone: '13812345678' 
}).valid); // false (oneOf 要求只匹配一个)
console.log('都没有:', contactValidator.validate({ name: 'John' }).valid); // false

// anyOf: 至少匹配一个
const flexibleSchema: SchemaDefinition = {
  anyOf: [
    { type: 'string', minLength: 5 },
    { type: 'number' },
    { type: 'boolean' }
  ]
};

const flexibleValidator = new SchemaValidator(flexibleSchema);
console.log('\nanyOf 测试:');
console.log('长字符串:', flexibleValidator.validate('hello').valid); // true
console.log('数字:', flexibleValidator.validate(42).valid); // true
console.log('布尔:', flexibleValidator.validate(true).valid); // true
console.log('短字符串:', flexibleValidator.validate('hi').valid); // false

// allOf: 必须匹配所有
const strictUserSchema: SchemaDefinition = {
  allOf: [
    {
      type: 'object',
      required: ['name'],
      properties: { name: { type: 'string' } }
    },
    {
      type: 'object',
      required: ['email'],
      properties: { email: { type: 'string', format: 'email' } }
    },
    {
      type: 'object',
      required: ['age'],
      properties: { age: { type: 'integer', minimum: 18 } }
    }
  ]
};

const strictValidator = new SchemaValidator(strictUserSchema);
console.log('\nallOf 测试:');
console.log('完整数据:', strictValidator.validate({ 
  name: 'John', 
  email: 'john@example.com', 
  age: 25 
}).valid); // true
console.log('缺少 age:', strictValidator.validate({ 
  name: 'John', 
  email: 'john@example.com' 
}).valid); // false

// ============================================
// 示例 5: 条件验证 (if/then/else)
// ============================================

console.log('\n=== 示例 5: 条件验证 ===\n');

const conditionalSchema: SchemaDefinition = {
  type: 'object',
  required: ['type', 'value'],
  if: {
    properties: {
      type: { const: 'email' }
    }
  },
  then: {
    properties: {
      value: { type: 'string', format: 'email' }
    }
  },
  else: {
    properties: {
      value: { type: 'string', pattern: '^1[3-9]\\d{9}$' }
    }
  }
};

const conditionalValidator = new SchemaValidator(conditionalSchema);

console.log('email 类型 + 邮箱格式:', conditionalValidator.validate({
  type: 'email',
  value: 'test@example.com'
}).valid); // true

console.log('email 类型 + 错误格式:', conditionalValidator.validate({
  type: 'email',
  value: 'invalid'
}).valid); // false

console.log('phone 类型 + 手机格式:', conditionalValidator.validate({
  type: 'phone',
  value: '13812345678'
}).valid); // true

console.log('phone 类型 + 错误格式:', conditionalValidator.validate({
  type: 'phone',
  value: '12345'
}).valid); // false

// ============================================
// 示例 6: 默认值填充
// ============================================

console.log('\n=== 示例 6: 默认值填充 ===\n');

const configSchema: SchemaDefinition = {
  type: 'object',
  properties: {
    host: { type: 'string', default: 'localhost' },
    port: { type: 'integer', default: 8080 },
    debug: { type: 'boolean', default: false },
    timeout: { type: 'number', default: 30000 },
    retries: { type: 'integer', default: 3 }
  }
};

const configValidator = new SchemaValidator(configSchema, {
  fillDefaults: true
});

const emptyConfig = {};
const resultWithDefaults = configValidator.validate(emptyConfig);

console.log('原始数据:', JSON.stringify(emptyConfig));
console.log('填充后:', JSON.stringify(resultWithDefaults.data, null, 2));

// ============================================
// 示例 7: 快捷验证函数
// ============================================

console.log('\n=== 示例 7: 快捷验证函数 ===\n');

const simpleSchema: SchemaDefinition = {
  type: 'object',
  required: ['username', 'password'],
  properties: {
    username: { type: 'string', minLength: 3, maxLength: 20 },
    password: { type: 'string', minLength: 8 }
  }
};

// isValid - 快速检查
console.log('isValid 测试:');
console.log('有效:', isValid({ username: 'john', password: 'secret123' }, simpleSchema)); // true
console.log('无效:', isValid({ username: 'jo', password: '123' }, simpleSchema)); // false

// validate - 获取错误列表
console.log('\nvalidate 测试:');
const errors = validate({ username: 'jo', password: '123' }, simpleSchema);
console.log('错误数量:', errors.length);
errors.forEach(e => console.log(`  ${e.path}: ${e.message}`));

// assertValid - 抛出异常
console.log('\nassertValid 测试:');
try {
  assertValid({ username: 'jo', password: '123' }, simpleSchema);
} catch (error) {
  if (error instanceof SchemaValidationError) {
    console.log('捕获到验证异常:');
    console.log(error.formatReport());
  }
}

// ============================================
// 示例 8: 自定义格式验证器
// ============================================

console.log('\n=== 示例 8: 自定义格式验证器 ===\n');

const customFormatSchema: SchemaDefinition = {
  type: 'object',
  properties: {
    semver: { type: 'string', format: 'semver' },
    hexColor: { type: 'string', format: 'hex-color' },
    base64: { type: 'string', format: 'base64' }
  }
};

const customFormatValidator = new SchemaValidator(customFormatSchema, {
  customFormats: {
    'semver': (value) => /^\d+\.\d+\.\d+$/.test(value),
    'hex-color': (value) => /^#?([0-9A-F]{3}){1,2}$/i.test(value),
    'base64': (value) => /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value)
  }
});

console.log('语义化版本:', customFormatValidator.validate({ 
  semver: '1.2.3' 
}).valid); // true

console.log('十六进制颜色:', customFormatValidator.validate({ 
  hexColor: '#FF5733' 
}).valid); // true

console.log('Base64:', customFormatValidator.validate({ 
  base64: 'SGVsbG8gV29ybGQ=' 
}).valid); // true

// ============================================
// 示例 9: 严格模式 vs 非严格模式
// ============================================

console.log('\n=== 示例 9: 严格模式 vs 非严格模式 ===\n');

const numberSchema: SchemaDefinition = {
  type: 'object',
  properties: {
    count: { type: 'integer' },
    price: { type: 'number' },
    enabled: { type: 'boolean' }
  }
};

// 非严格模式 (默认) - 尝试类型转换
const looseValidator = new SchemaValidator(numberSchema, { strict: false });
const looseResult = looseValidator.validate({
  count: '42',      // 字符串转整数
  price: '19.99',   // 字符串转数字
  enabled: 'true'   // 字符串转布尔
});
console.log('非严格模式:', looseResult.valid); // true
console.log('转换后数据:', looseResult.data);

// 严格模式 - 禁止类型转换
const strictModeValidator = new SchemaValidator(numberSchema, { strict: true });
const strictResult = strictModeValidator.validate({
  count: '42',
  price: '19.99',
  enabled: 'true'
});
console.log('\n严格模式:', strictResult.valid); // false
console.log('错误:');
strictResult.errors.forEach(e => console.log(`  ${e.path}: ${e.message}`));

// ============================================
// 示例 10: 复杂嵌套结构
// ============================================

console.log('\n=== 示例 10: 复杂嵌套结构 ===\n');

const blogSchema: SchemaDefinition = {
  type: 'object',
  required: ['title', 'author', 'posts'],
  properties: {
    title: { type: 'string' },
    author: {
      type: 'object',
      required: ['name', 'email'],
      properties: {
        name: { type: 'string' },
        email: { type: 'string', format: 'email' },
        bio: { type: 'string' },
        social: {
          type: 'object',
          properties: {
            twitter: { type: 'string' },
            github: { type: 'string' },
            website: { type: 'string', format: 'url' }
          }
        }
      }
    },
    posts: {
      type: 'array',
      items: {
        type: 'object',
        required: ['id', 'title', 'content', 'publishedAt'],
        properties: {
          id: { type: 'string', pattern: '^POST-\\d+$' },
          title: { type: 'string', minLength: 1 },
          content: { type: 'string' },
          publishedAt: { type: 'string', format: 'date-time' },
          tags: {
            type: 'array',
            items: { type: 'string' }
          },
          metadata: {
            type: 'object',
            properties: {
              views: { type: 'integer', minimum: 0 },
              likes: { type: 'integer', minimum: 0 },
              comments: {
                type: 'array',
                items: {
                  type: 'object',
                  required: ['author', 'content', 'createdAt'],
                  properties: {
                    author: { type: 'string' },
                    content: { type: 'string' },
                    createdAt: { type: 'string', format: 'date-time' }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
};

const blogValidator = new SchemaValidator(blogSchema);

const blogData = {
  title: 'My Tech Blog',
  author: {
    name: 'John Doe',
    email: 'john@example.com',
    bio: 'Software developer',
    social: {
      twitter: '@johndoe',
      github: 'johndoe',
      website: 'https://johndoe.com'
    }
  },
  posts: [
    {
      id: 'POST-001',
      title: 'Getting Started with TypeScript',
      content: 'TypeScript is awesome...',
      publishedAt: '2024-01-15T10:00:00Z',
      tags: ['typescript', 'javascript'],
      metadata: {
        views: 1000,
        likes: 50,
        comments: [
          {
            author: 'Jane',
            content: 'Great post!',
            createdAt: '2024-01-15T12:00:00Z'
          }
        ]
      }
    }
  ]
};

const blogResult = blogValidator.validate(blogData);
console.log('博客数据验证:', blogResult.valid); // true
console.log('验证耗时:', blogResult.meta?.duration, 'ms');

// ============================================
// 示例 11: 错误报告格式化
// ============================================

console.log('\n=== 示例 11: 错误报告格式化 ===\n');

const invalidBlogData = {
  title: '',
  author: {
    name: '',
    email: 'invalid'
  },
  posts: [
    {
      id: 'INVALID-ID',
      title: '',
      content: '',
      publishedAt: 'not-a-date',
      tags: ['valid', 123], // 类型错误
      metadata: {
        views: -100, // 负数
        likes: 50,
        comments: [
          {
            author: '',
            content: '',
            createdAt: 'invalid-date'
          }
        ]
      }
    }
  ]
};

const invalidBlogResult = blogValidator.validate(invalidBlogData);

if (!invalidBlogResult.valid) {
  try {
    throw new SchemaValidationError(invalidBlogResult.errors);
  } catch (error) {
    if (error instanceof SchemaValidationError) {
      console.log(error.formatReport());
    }
  }
}

// ============================================
// 示例 12: 性能测试
// ============================================

console.log('\n=== 示例 12: 性能测试 ===\n');

const perfSchema: SchemaDefinition = {
  type: 'object',
  required: ['id', 'name', 'value'],
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    value: { type: 'number' }
  }
};

const perfValidator = new SchemaValidator(perfSchema);
const perfData = { id: 'test', name: 'Performance Test', value: 42 };

const iterations = 10000;
const start = Date.now();

for (let i = 0; i < iterations; i++) {
  perfValidator.validate(perfData);
}

const duration = Date.now() - start;
console.log(`验证 ${iterations} 次耗时: ${duration}ms`);
console.log(`平均每次: ${(duration / iterations).toFixed(3)}ms`);
console.log(`每秒验证次数: ${Math.round(iterations / (duration / 1000))}`);

console.log('\n=== 所有示例完成 ===');
