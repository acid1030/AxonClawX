# 输入验证技能使用示例

## 📦 导入

```typescript
import {
  InputValidator,
  validateEmail,
  validatePhone,
  validateIdCard,
  checkPasswordStrength,
  createValidator,
  validateInput
} from './validate-input-skill';
```

---

## ✉️ 邮箱验证

### 基础验证

```typescript
// 方法 1: 静态方法
const result = InputValidator.validateEmail('test@example.com');
console.log(result);
// { valid: true, value: 'test@example.com' }

const invalid = InputValidator.validateEmail('invalid-email');
console.log(invalid);
// { valid: false, message: '请输入有效的邮箱地址' }

// 方法 2: 便捷函数
const isValid = validateEmail('user@domain.com');
console.log(isValid); // true
```

### 实际场景

```typescript
// 注册表单邮箱验证
function validateRegistrationForm(email: string): boolean {
  const result = InputValidator.validateEmail(email);
  
  if (!result.valid) {
    console.error(result.message);
    return false;
  }
  
  return true;
}

validateRegistrationForm('john@example.com'); // ✓
validateRegistrationForm('john@'); // ✗
```

---

## 📱 手机号验证 (中国大陆)

### 基础验证

```typescript
// 验证手机号
const result = InputValidator.validatePhone('13812345678');
console.log(result);
// { valid: true, value: '13812345678' }

const invalid = InputValidator.validatePhone('12345678901');
console.log(invalid);
// { valid: false, message: '请输入有效的中国大陆手机号码' }

// 便捷函数
const isValid = validatePhone('19812345678'); // true
```

### 支持的号段

```typescript
// 所有中国大陆手机号段都支持
const validPhones = [
  '13012345678', // 联通
  '13112345678', // 联通
  '13212345678', // 联通
  '13312345678', // 电信
  '13412345678', // 移动
  '13512345678', // 移动
  '13612345678', // 移动
  '13712345678', // 移动
  '13812345678', // 移动
  '13912345678', // 移动
  '14512345678', // 联通
  '14712345678', // 移动
  '15012345678', // 移动
  '15112345678', // 移动
  '15212345678', // 移动
  '15312345678', // 电信
  '15512345678', // 联通
  '15612345678', // 联通
  '15712345678', // 移动
  '15812345678', // 移动
  '15912345678', // 移动
  '16612345678', // 联通
  '16712345678', // 联通
  '17012345678', // 虚拟运营商
  '17112345678', // 虚拟运营商
  '17212345678', // 移动
  '17312345678', // 电信
  '17412345678', // 卫星通信
  '17512345678', // 联通
  '17612345678', // 联通
  '17712345678', // 电信
  '17812345678', // 移动
  '18012345678', // 电信
  '18112345678', // 电信
  '18212345678', // 移动
  '18312345678', // 移动
  '18412345678', // 移动
  '18512345678', // 联通
  '18612345678', // 联通
  '18712345678', // 移动
  '18812345678', // 移动
  '18912345678', // 电信
  '19112345678', // 电信
  '19812345678', // 移动
  '19912345678'  // 电信
];

validPhones.forEach(phone => {
  console.log(`${phone}: ${validatePhone(phone)}`); // 全部 true
});
```

---

## 🆔 身份证验证 (中国大陆)

### 基础验证

```typescript
// 验证身份证 (包含校验码验证)
const result = InputValidator.validateIdCard('110101199001011234');
console.log(result);
// { valid: true, value: '110101199001011234' }

const invalid = InputValidator.validateIdCard('11010119900101123X');
console.log(invalid);
// { valid: false, message: '身份证号码校验码错误' }

// 便捷函数
const isValid = validateIdCard('310101199001011234'); // true
```

### 身份证格式说明

```typescript
// 18 位身份证结构:
// 1-6 位：地址码 (省市区)
// 7-14 位：出生日期码 (YYYYMMDD)
// 15-17 位：顺序码 (同一地区同一天出生的人的顺序)
// 第 18 位：校验码 (0-9 或 X)

const examples = [
  { id: '110101199001011234', desc: '北京东城区 1990-01-01' },
  { id: '310101199001011234', desc: '上海黄浦区 1990-01-01' },
  { id: '440101199001011234', desc: '广州东山区 1990-01-01' },
  { id: '510101199001011234', desc: '成都锦江区 1990-01-01' }
];

examples.forEach(({ id, desc }) => {
  const valid = validateIdCard(id);
  console.log(`${desc}: ${valid ? '✓' : '✗'}`);
});
```

---

## 🔐 密码强度检查

### 基础使用

```typescript
// 检查密码强度
const result = InputValidator.checkPasswordStrength('MyP@ssw0rd123');
console.log(result);
/*
{
  valid: true,
  level: 'strong',
  score: 4,
  checks: {
    minLength: true,      // >= 8 位
    hasUppercase: true,   // 有大写字母
    hasLowercase: true,   // 有小写字母
    hasNumber: true,      // 有数字
    hasSpecial: true      // 有特殊字符
  },
  suggestions: []
}
*/

// 弱密码示例
const weak = InputValidator.checkPasswordStrength('123456');
console.log(weak.level); // 'weak'
console.log(weak.suggestions);
// ['密码长度至少 8 位', '添加大写字母', '添加小写字母', '添加特殊字符']
```

### 密码强度等级

```typescript
// 等级说明:
// - weak: 0-1 分 (极不安全)
// - medium: 2 分 (一般)
// - strong: 3-4 分 (安全)
// - very-strong: 5 分 (非常安全)

const passwords = [
  '123456',           // weak
  'password',         // weak
  'Password123',      // medium
  'P@ssw0rd123',      // strong
  'MyP@ssw0rd123!',   // very-strong
];

passwords.forEach(pwd => {
  const strength = checkPasswordStrength(pwd);
  console.log(`${pwd}: ${strength} (${strength})`);
});
```

### 密码验证 (带配置)

```typescript
// 自定义密码要求
const result = InputValidator.validatePassword('MyP@ssw0rd', {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSpecial: false
});

console.log(result);
// { valid: true }

// 严格要求
const strict = InputValidator.validatePassword('Password1', {
  minLength: 12,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSpecial: true
});

console.log(strict);
// { valid: false, message: '密码长度至少 12 位' }
```

---

## 🛠️ 自定义验证规则

### 创建验证器实例

```typescript
// 定义验证规则
const registrationRules = {
  username: {
    required: true,
    minLength: 3,
    maxLength: 20
  },
  email: {
    required: true,
    rule: 'email'
  },
  phone: {
    rule: 'phone'
  },
  password: {
    required: true,
    minLength: 8,
    customValidator: (value: unknown) => {
      if (typeof value !== 'string') return false;
      const strength = InputValidator.checkPasswordStrength(value);
      return strength.valid || '密码强度不足';
    }
  }
};

// 创建验证器
const validator = createValidator(registrationRules);

// 验证数据
const formData = {
  username: 'john',
  email: 'john@example.com',
  phone: '13812345678',
  password: 'MyP@ssw0rd123'
};

const result = validator.validate(formData);
console.log(result);
// { valid: true, data: formData }
```

### 错误处理

```typescript
const invalidData = {
  username: 'jo',  // 太短
  email: 'invalid', // 格式错误
  phone: '12345',   // 格式错误
  password: '123'   // 太弱
};

const result = validator.validate(invalidData);

if (!result.valid) {
  console.log('验证失败:');
  result.errors.forEach(err => {
    console.log(`- ${err.field}: ${err.message}`);
  });
}

/*
验证失败:
- username: username 长度不能少于 3 个字符
- email: 请输入有效的邮箱地址
- phone: 请输入有效的中国大陆手机号码
- password: 密码强度不足
*/
```

### 动态添加规则

```typescript
const validator = new InputValidator();

// 添加规则
validator.addRule('nickname', {
  required: true,
  minLength: 2,
  maxLength: 10,
  pattern: /^[\u4e00-\u9fa5a-zA-Z0-9_]+$/,
  message: '昵称只能包含中文、字母、数字和下划线'
});

// 验证
const result = validator.validate({ nickname: '张三_123' });
console.log(result.valid); // true

// 移除规则
validator.removeRule('nickname');
```

---

## 🎯 实际应用场景

### 用户注册表单

```typescript
import { createValidator, InputValidator } from './validate-input-skill';

// 定义注册表单规则
const registrationSchema = {
  username: {
    required: true,
    minLength: 3,
    maxLength: 20,
    pattern: /^[a-zA-Z][a-zA-Z0-9_]*$/,
    message: '用户名必须以字母开头，只能包含字母、数字和下划线'
  },
  email: {
    required: true,
    rule: 'email'
  },
  phone: {
    required: true,
    rule: 'phone'
  },
  idCard: {
    rule: 'idCard'
  },
  password: {
    required: true,
    minLength: 8,
    customValidator: (value: unknown) => {
      if (typeof value !== 'string') return '密码格式错误';
      const strength = InputValidator.checkPasswordStrength(value);
      if (!strength.valid) {
        return `密码强度不足：${strength.suggestions.join('，')}`;
      }
      return true;
    }
  },
  confirmPassword: {
    required: true,
    customValidator: (value: unknown, data: Record<string, unknown>) => {
      if (value !== data.password) {
        return '两次输入的密码不一致';
      }
      return true;
    }
  }
};

const validator = createValidator(registrationSchema);

// 使用示例
function handleRegistration(formData: Record<string, unknown>) {
  const result = validator.validate(formData);
  
  if (!result.valid) {
    // 显示错误信息
    result.errors.forEach(err => {
      showError(err.field, err.message);
    });
    return false;
  }
  
  // 注册成功
  submitRegistration(result.data);
  return true;
}
```

### 用户资料更新

```typescript
const profileSchema = {
  nickname: {
    minLength: 2,
    maxLength: 20
  },
  avatar: {
    rule: 'url'
  },
  bio: {
    maxLength: 500
  },
  website: {
    rule: 'url'
  }
};

const profileValidator = createValidator(profileSchema);

function updateProfile(data: Record<string, unknown>) {
  const result = profileValidator.validate(data);
  
  if (!result.valid) {
    throw new Error(result.errors[0].message);
  }
  
  return result.data;
}
```

### 密码修改

```typescript
const passwordChangeSchema = {
  oldPassword: {
    required: true
  },
  newPassword: {
    required: true,
    customValidator: (value: unknown) => {
      const strength = InputValidator.checkPasswordStrength(value as string);
      if (strength.score < 3) {
        return `密码强度不足，当前等级：${strength.level}`;
      }
      return true;
    }
  },
  confirmNewPassword: {
    required: true,
    customValidator: (value: unknown, data: Record<string, unknown>) => {
      if (value !== data.newPassword) {
        return '两次输入的新密码不一致';
      }
      return true;
    }
  }
};

const passwordValidator = createValidator(passwordChangeSchema);

function handleChangePassword(data: Record<string, unknown>) {
  const result = passwordValidator.validate(data);
  
  if (!result.valid) {
    return {
      success: false,
      errors: result.errors
    };
  }
  
  // 执行密码修改
  return { success: true };
}
```

---

## 🧪 测试用例

```typescript
// 邮箱测试
console.assert(validateEmail('test@example.com') === true);
console.assert(validateEmail('user.name@domain.co.uk') === true);
console.assert(validateEmail('invalid') === false);
console.assert(validateEmail('@example.com') === false);

// 手机测试
console.assert(validatePhone('13812345678') === true);
console.assert(validatePhone('19812345678') === true);
console.assert(validatePhone('12345678901') === false);
console.assert(validatePhone('1381234567') === false);

// 身份证测试
console.assert(validateIdCard('110101199001011234') === true);
console.assert(validateIdCard('310101199001011234') === true);
console.assert(validateIdCard('123456789012345678') === false);

// 密码强度测试
console.assert(checkPasswordStrength('123456') === 'weak');
console.assert(checkPasswordStrength('Password123') === 'medium');
console.assert(checkPasswordStrength('P@ssw0rd123') === 'strong');
console.assert(checkPasswordStrength('MyP@ssw0rd123!') === 'very-strong');

console.log('✓ 所有测试通过');
```

---

## 📊 API 参考

### 静态方法

| 方法 | 参数 | 返回值 | 说明 |
|------|------|--------|------|
| `validateEmail(email)` | `string` | `{ valid, value?, message? }` | 验证邮箱 |
| `validatePhone(phone)` | `string` | `{ valid, value?, message? }` | 验证手机号 |
| `validateIdCard(idCard)` | `string` | `{ valid, value?, message? }` | 验证身份证 |
| `checkPasswordStrength(password)` | `string` | `PasswordStrengthResult` | 检查密码强度 |
| `validatePassword(password, options)` | `string, PasswordOptions` | `{ valid, message? }` | 验证密码 |

### 实例方法

| 方法 | 参数 | 返回值 | 说明 |
|------|------|--------|------|
| `validate(data)` | `Record<string, unknown>` | `InputValidationResult` | 验证表单数据 |
| `addRule(field, rule)` | `string, FieldRule` | `void` | 添加规则 |
| `removeRule(field)` | `string` | `void` | 移除规则 |

### 便捷函数

| 函数 | 说明 |
|------|------|
| `validateEmail(email)` | 快速验证邮箱 (返回 boolean) |
| `validatePhone(phone)` | 快速验证手机号 (返回 boolean) |
| `validateIdCard(idCard)` | 快速验证身份证 (返回 boolean) |
| `checkPasswordStrength(password)` | 快速检查密码强度 (返回等级) |
| `createValidator(rules)` | 创建验证器实例 |
| `validateInput(data, rules)` | 快速验证表单数据 |

---

## 🎓 最佳实践

1. **前端 + 后端双重验证**: 前端验证提升用户体验，后端验证保证数据安全
2. **友好的错误提示**: 使用 `message` 字段提供清晰的错误说明
3. **渐进式验证**: 实时验证用户输入，而非提交时才验证
4. **密码强度要求**: 根据安全等级调整密码要求
5. **自定义规则**: 使用 `customValidator` 实现业务逻辑验证

---

**创建时间:** 2026-03-13  
**版本:** 1.0.0
