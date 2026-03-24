# 表单字段验证工具 - Validator Utils

快速、灵活的表单字段验证工具，支持必填验证、格式验证和自定义规则。

## 🚀 快速开始

### 基础用法

```typescript
import { createValidator, validate } from './validator-utils-skill';

const schema = {
  fields: {
    username: {
      type: 'string',
      required: true,
      minLength: 3,
      maxLength: 20
    },
    email: {
      type: 'email',
      required: true
    },
    age: {
      type: 'number',
      min: 0,
      max: 120
    }
  }
};

const validator = createValidator(schema);
const result = validator.validate({
  username: 'john',
  email: 'john@example.com',
  age: 25
});

if (result.valid) {
  console.log('验证通过');
} else {
  console.log('验证失败:', result.errors);
}
```

## 📋 功能特性

### 1. 必填验证

```typescript
{
  type: 'string',
  required: true  // 必填字段
}
```

### 2. 格式验证

支持多种内置格式：

- `email` - 邮箱地址
- `phone` - 手机号 (中国大陆)
- `url` - URL 地址
- `idCard` - 身份证号 (中国大陆)
- `date` - 日期 (YYYY-MM-DD)
- `time` - 时间 (HH:MM:SS)
- `dateTime` - 日期时间
- `ipv4` - IPv4 地址
- `hexColor` - 十六进制颜色代码

```typescript
{
  type: 'email',
  required: true
}
```

### 3. 自定义规则

```typescript
{
  type: 'string',
  required: true,
  custom: (value, field, data) => {
    if (value.includes('admin')) {
      return '用户名不能包含 "admin"';
    }
    return null;  // null 表示验证通过
  }
}
```

## 📖 完整示例

### 用户注册表单

```typescript
import { createValidator, PredefinedRules } from './validator-utils-skill';

const registrationSchema = {
  fields: {
    username: PredefinedRules.username(true),
    email: PredefinedRules.email(true),
    password: PredefinedRules.passwordStrong(true),
    phone: PredefinedRules.phoneCN(false),
    age: {
      type: 'number',
      min: 18,
      max: 100
    }
  }
};

const validator = createValidator(registrationSchema);
const result = validator.validate({
  username: 'newuser',
  email: 'user@example.com',
  password: 'SecurePass123!',
  age: 25
});
```

### 密码确认验证

```typescript
const schema = {
  fields: {
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
    }
  }
};
```

## 🔧 API 参考

### createValidator(schema)

创建验证器实例。

**参数:**
- `schema: ValidatorSchema` - 验证规则定义

**返回:**
- `ValidatorInstance` - 验证器对象

**方法:**
- `validate(data)` - 验证整个表单
- `validateField(field, value, data)` - 验证单个字段
- `addRule(field, rule)` - 动态添加规则
- `removeRule(field)` - 移除规则

### validate(data, schema)

快速验证数据，无需创建验证器实例。

```typescript
const result = validate(data, schema);
```

### validateField(field, value, rule)

快速验证单个字段。

```typescript
const result = validateField('email', 'test@example.com', {
  type: 'email',
  required: true
});
```

### validateOrThrow(data, schema)

验证失败时抛出异常。

```typescript
try {
  validateOrThrow(data, schema);
} catch (error) {
  console.error(error.message);
}
```

## 📦 预定义规则

使用 `PredefinedRules` 快速定义常见字段：

```typescript
import { PredefinedRules } from './validator-utils-skill';

PredefinedRules.email(required?: boolean)
PredefinedRules.phoneCN(required?: boolean)
PredefinedRules.url(required?: boolean)
PredefinedRules.idCard(required?: boolean)
PredefinedRules.username(required?: boolean)
PredefinedRules.passwordStrong(required?: boolean)
PredefinedRules.passwordMedium(required?: boolean)
PredefinedRules.date(required?: boolean)
PredefinedRules.integer(min?: number, max?: number)
PredefinedRules.percentage()
PredefinedRules.hexColor(required?: boolean)
PredefinedRules.ipv4(required?: boolean)
```

## 🎯 验证规则选项

| 选项 | 类型 | 说明 |
|------|------|------|
| `type` | string | 字段类型 (string/number/boolean/array/object/email/phone/url/idCard/date) |
| `required` | boolean | 是否必填 |
| `minLength` | number | 最小长度 (字符串) |
| `maxLength` | number | 最大长度 (字符串) |
| `min` | number | 最小值 (数字) |
| `max` | number | 最大值 (数字) |
| `pattern` | RegExp | 正则表达式 |
| `enum` | array | 枚举值列表 |
| `custom` | function | 自定义验证函数 |
| `trim` | boolean | 是否修剪字符串 |
| `transform` | function | 值转换函数 |

## 📝 验证结果

```typescript
interface ValidatorResult {
  valid: boolean;
  errors: ValidationError[];
  warnings?: ValidatorWarning[];
}

interface ValidationError {
  field: string;
  code: string;
  message: string;
  value?: unknown;
  rule?: string;
}
```

## ⚡ 高级用法

### 字段转换

```typescript
{
  type: 'email',
  required: true,
  trim: true,
  transform: (value) => {
    return value.toLowerCase().trim();
  }
}
```

### 动态规则

```typescript
const validator = createValidator({
  fields: {
    username: { type: 'string', required: true }
  }
});

// 动态添加规则
validator.addRule('email', { type: 'email', required: true });

// 动态移除规则
validator.removeRule('username');
```

### 严格模式

```typescript
const schema = {
  fields: { ... },
  strict: true  // 拒绝未定义的字段
};
```

## 📚 更多示例

查看 `validator-utils-examples.ts` 获取完整使用示例。

---

**版本:** 1.0.0  
**作者:** AxonClaw
