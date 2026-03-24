# 数据验证技能 (Validation Skill)

强大的数据验证工具，支持 Schema 验证、自定义规则和友好的错误格式化。

## 📦 核心功能

1. **Schema 验证** - 基于 JSON Schema 的数据结构验证
2. **自定义验证规则** - 支持业务逻辑验证和字段依赖
3. **错误消息格式化** - 多种格式化方式，友好的错误提示

## 🚀 快速开始

### 基础验证

```typescript
import { validate, ErrorFormatter, type Schema } from './validation-skill';

const schema: Schema = {
  fields: {
    username: { type: 'string', required: true, minLength: 3 },
    email: { type: 'string', required: true },
    age: { type: 'number', required: true, min: 18 }
  }
};

const result = validate({ username: 'jo', email: 'bad', age: 15 }, schema);

if (!result.valid) {
  console.log(ErrorFormatter.format(result.errors, { format: 'list' }));
}
```

### 使用预定义规则

```typescript
import { createValidator, PredefinedRules, type Schema } from './validation-skill';

const schema: Schema = {
  fields: {
    email: { type: 'string', required: true, customRules: [PredefinedRules.email] },
    phone: { type: 'string', customRules: [PredefinedRules.phone] },
    password: { 
      type: 'string', 
      required: true,
      customRules: [PredefinedRules.passwordStrength]
    },
    website: { type: 'string', customRules: [PredefinedRules.url] }
  }
};

const validator = createValidator(schema);
const result = validator.validate({ email: 'user@example.com', password: 'Strong123' });
```

## 📖 API 文档

### Schema 定义

```typescript
interface Schema {
  fields: Record<string, SchemaField>;
  strict?: boolean;  // 严格模式：不允许额外字段
}

interface SchemaField {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'null';
  required?: boolean;
  minLength?: number;  // 字符串最小长度
  maxLength?: number;  // 字符串最大长度
  min?: number;        // 数字最小值
  max?: number;        // 数字最大值
  pattern?: RegExp;    // 正则匹配
  enum?: unknown[];    // 枚举值
  items?: SchemaField; // 数组项类型
  properties?: Record<string, SchemaField>; // 对象属性
  customRules?: CustomRule[]; // 自定义规则
}
```

### 验证器类

```typescript
// 创建验证器
const validator = createValidator(schema);

// 验证数据
const result: ValidationResult = validator.validate(data);

// ValidationResult 结构
{
  valid: boolean;
  errors: ValidationError[];
  data?: unknown;  // 验证通过时返回原始数据
}
```

### 错误格式化

```typescript
ErrorFormatter.format(errors, options);

// 格式化选项
interface FormatOptions {
  prefix?: string;                    // 前缀文本
  format?: 'list' | 'inline' | 'json' | 'summary';
  includeCode?: boolean;              // 包含错误代码
  includeValue?: boolean;             // 包含当前值
}
```

### 预定义规则

```typescript
PredefinedRules.email          // 邮箱验证
PredefinedRules.phone          // 手机号验证 (中国大陆)
PredefinedRules.idCard         // 身份证验证 (中国大陆)
PredefinedRules.url            // URL 验证
PredefinedRules.passwordStrength  // 密码强度验证
PredefinedRules.ageRange(min, max)  // 年龄范围验证
PredefinedRules.dependsOn(field, condition, message)  // 字段依赖验证
```

## 💡 使用场景

### 1. 用户注册表单

```typescript
const registrationSchema: Schema = {
  fields: {
    username: {
      type: 'string',
      required: true,
      minLength: 3,
      maxLength: 20,
      pattern: /^[a-zA-Z][a-zA-Z0-9_]*$/
    },
    email: {
      type: 'string',
      required: true,
      customRules: [PredefinedRules.email]
    },
    password: {
      type: 'string',
      required: true,
      minLength: 8,
      customRules: [PredefinedRules.passwordStrength]
    },
    confirmPassword: {
      type: 'string',
      required: true,
      customRules: [PredefinedRules.dependsOn(
        'password',
        (confirm, password) => confirm === password || '密码不一致',
        '密码不一致'
      )]
    }
  }
};
```

### 2. API 请求验证

```typescript
import { validateOrThrow, ValidationException } from './validation-skill';

app.post('/api/users', (req, res) => {
  try {
    validateOrThrow(req.body, userSchema);
    // 处理有效数据
  } catch (error) {
    if (error instanceof ValidationException) {
      res.status(400).json({
        error: '验证失败',
        details: error.errors
      });
    }
  }
});
```

### 3. 嵌套对象验证

```typescript
const orderSchema: Schema = {
  fields: {
    customer: {
      type: 'object',
      required: true,
      properties: {
        name: { type: 'string', required: true },
        email: { type: 'string', required: true }
      }
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
```

### 4. 自定义业务规则

```typescript
const productSchema: Schema = {
  fields: {
    price: { type: 'number', required: true, min: 0 },
    discountPrice: {
      type: 'number',
      customRules: [
        PredefinedRules.dependsOn(
          'price',
          (discount, price) => {
            if (discount === undefined) return true;
            return discount < price || '折扣价必须低于原价';
          },
          '折扣价必须低于原价'
        )
      ]
    }
  }
};
```

## 🎨 错误格式化示例

```typescript
const errors: ValidationError[] = [
  { field: 'email', message: '请输入有效的邮箱地址', code: 'CUSTOM_EMAIL' },
  { field: 'password', message: '密码强度不足', code: 'CUSTOM_PASSWORDSTRENGTH' }
];

// 列表格式
ErrorFormatter.format(errors, { format: 'list' });
// 输出:
// • email: 请输入有效的邮箱地址
// • password: 密码强度不足

// 行内格式
ErrorFormatter.format(errors, { format: 'inline' });
// 输出: email: 请输入有效的邮箱地址; password: 密码强度不足

// 摘要格式
ErrorFormatter.format(errors, { format: 'summary' });
// 输出: 验证失败：共 2 个错误 - email (1 个问题), password (1 个问题)

// JSON 格式
ErrorFormatter.format(errors, { format: 'json' });
// 输出: {"errors":[...]}
```

## 📝 完整示例

查看 `validation-examples.ts` 获取 10 个完整使用示例，包括:

1. 基础 Schema 验证
2. 自定义验证规则
3. 使用预定义规则
4. 嵌套对象验证
5. 严格模式
6. 不同错误格式化方式
7. 快速验证函数
8. 验证并抛出异常
9. 复杂业务场景 - 用户注册
10. 批量验证

## 🔧 运行示例

```bash
# 编译 TypeScript
npx tsc src/skills/validation-skill.ts src/skills/validation-examples.ts --outDir dist

# 运行示例
node dist/validation-examples.js
```

## 📋 特性对比

| 特性 | 支持 |
|------|------|
| 基础类型验证 | ✅ |
| 必填字段 | ✅ |
| 字符串长度 | ✅ |
| 数字范围 | ✅ |
| 正则匹配 | ✅ |
| 枚举值 | ✅ |
| 数组验证 | ✅ |
| 嵌套对象 | ✅ |
| 自定义规则 | ✅ |
| 字段依赖 | ✅ |
| 严格模式 | ✅ |
| 错误格式化 | ✅ |
| 预定义规则 | ✅ |

---

**版本**: 1.0.0  
**作者**: Axon  
**许可**: MIT
