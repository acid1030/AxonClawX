# 输入验证技能 - Validate Input Skill

> 表单输入验证专家 - 邮箱/手机/身份证验证、密码强度检查、自定义验证规则

---

## 📦 安装

无需额外依赖，直接使用：

```typescript
import {
  InputValidator,
  validateEmail,
  validatePhone,
  validateIdCard,
  checkPasswordStrength,
  createValidator
} from './src/skills/validate-input-skill';
```

---

## 🚀 快速开始

### 1. 邮箱验证

```typescript
const result = InputValidator.validateEmail('test@example.com');
if (result.valid) {
  console.log('邮箱有效:', result.value);
} else {
  console.error('邮箱无效:', result.message);
}
```

### 2. 手机号验证

```typescript
const result = InputValidator.validatePhone('13812345678');
console.log(result); // { valid: true, value: '13812345678' }
```

### 3. 身份证验证

```typescript
const result = InputValidator.validateIdCard('110101199001011234');
console.log(result); // { valid: true, value: '110101199001011234' }
```

### 4. 密码强度检查

```typescript
const result = InputValidator.checkPasswordStrength('MyP@ssw0rd123');
console.log(result.level);  // 'strong'
console.log(result.score);  // 4
console.log(result.suggestions); // []
```

### 5. 自定义验证规则

```typescript
const validator = createValidator({
  username: { required: true, minLength: 3, maxLength: 20 },
  email: { required: true, rule: 'email' },
  phone: { rule: 'phone' }
});

const result = validator.validate({
  username: 'john',
  email: 'john@example.com',
  phone: '13812345678'
});

console.log(result.valid); // true
```

---

## 📖 功能详情

### 1. 邮箱验证

支持标准邮箱格式验证：

```typescript
// 有效邮箱
validateEmail('test@example.com');           // true
validateEmail('user.name@domain.co.uk');     // true
validateEmail('user+tag@example.com');       // true

// 无效邮箱
validateEmail('invalid');                    // false
validateEmail('@example.com');               // false
validateEmail('test@');                      // false
```

### 2. 手机号验证 (中国大陆)

支持所有中国大陆手机号段 (13x-19x)：

```typescript
// 有效手机号
validatePhone('13812345678');  // 移动
validatePhone('15012345678');  // 移动
validatePhone('18612345678');  // 联通
validatePhone('19912345678');  // 电信

// 无效手机号
validatePhone('12345678901');  // false
validatePhone('1381234567');   // false (位数不足)
```

### 3. 身份证验证 (中国大陆)

支持 18 位身份证验证，包含校验码验证：

```typescript
// 有效身份证
validateIdCard('110101199001011234');  // 北京
validateIdCard('310101199001011234');  // 上海

// 无效身份证
validateIdCard('123456789012345678');  // false (格式错误)
validateIdCard('11010119900101123X');  // false (校验码错误)
```

**身份证结构说明：**
- 1-6 位：地址码 (省市区)
- 7-14 位：出生日期码 (YYYYMMDD)
- 15-17 位：顺序码
- 第 18 位：校验码 (0-9 或 X)

### 4. 密码强度检查

#### 强度等级

| 等级 | 分数 | 说明 |
|------|------|------|
| weak | 0-1 | 极不安全 |
| medium | 2 | 一般 |
| strong | 3-4 | 安全 |
| very-strong | 5 | 非常安全 |

#### 评分标准

- +1 分：长度 ≥ 8 位
- +1 分：长度 ≥ 12 位
- +1 分：同时包含大小写字母
- +1 分：包含数字
- +1 分：包含特殊字符

#### 使用示例

```typescript
const result = InputValidator.checkPasswordStrength('MyP@ssw0rd123!');

console.log(result);
/*
{
  valid: true,
  level: 'very-strong',
  score: 5,
  checks: {
    minLength: true,
    hasUppercase: true,
    hasLowercase: true,
    hasNumber: true,
    hasSpecial: true
  },
  suggestions: []
}
*/

// 弱密码会提供改进建议
const weak = InputValidator.checkPasswordStrength('123456');
console.log(weak.suggestions);
// ['密码长度至少 8 位', '添加大写字母', '添加小写字母', '添加特殊字符']
```

#### 密码验证 (带配置)

```typescript
const result = InputValidator.validatePassword('MyP@ssw0rd', {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSpecial: false
});

console.log(result.valid); // true
```

### 5. 自定义验证规则

#### 创建验证器

```typescript
const validator = createValidator({
  username: {
    required: true,
    minLength: 3,
    maxLength: 20
  },
  email: {
    required: true,
    rule: 'email'
  },
  age: {
    min: 18,
    max: 100
  }
});
```

#### 验证数据

```typescript
const result = validator.validate({
  username: 'john',
  email: 'john@example.com',
  age: 25
});

if (!result.valid) {
  result.errors.forEach(err => {
    console.error(`${err.field}: ${err.message}`);
  });
}
```

#### 动态添加规则

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

// 移除规则
validator.removeRule('nickname');
```

#### 自定义验证器

```typescript
const validator = createValidator({
  password: {
    required: true,
    customValidator: (value: unknown) => {
      if (typeof value !== 'string') return '密码格式错误';
      
      const strength = InputValidator.checkPasswordStrength(value);
      return strength.valid || `密码强度不足：${strength.level}`;
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
});
```

---

## 📊 API 参考

### 静态方法

#### `InputValidator.validateEmail(email: string)`

验证邮箱地址。

**返回值:**
```typescript
{
  valid: boolean;
  value?: string;    // 验证通过时返回
  message?: string;  // 验证失败时返回
}
```

#### `InputValidator.validatePhone(phone: string)`

验证中国大陆手机号。

**返回值:** 同上

#### `InputValidator.validateIdCard(idCard: string)`

验证中国大陆身份证 (包含校验码验证)。

**返回值:** 同上

#### `InputValidator.checkPasswordStrength(password: string)`

检查密码强度。

**返回值:**
```typescript
{
  valid: boolean;
  level: 'weak' | 'medium' | 'strong' | 'very-strong';
  score: number;  // 0-5
  checks: {
    minLength: boolean;
    hasUppercase: boolean;
    hasLowercase: boolean;
    hasNumber: boolean;
    hasSpecial: boolean;
  };
  suggestions: string[];
}
```

#### `InputValidator.validatePassword(password: string, options?: PasswordOptions)`

验证密码是否符合要求。

**PasswordOptions:**
```typescript
{
  minLength?: number;        // 默认：8
  requireUppercase?: boolean; // 默认：true
  requireLowercase?: boolean; // 默认：true
  requireNumber?: boolean;    // 默认：true
  requireSpecial?: boolean;   // 默认：false
}
```

**返回值:**
```typescript
{
  valid: boolean;
  message?: string;
}
```

### 实例方法

#### `new InputValidator(rules?: ValidationRulesConfig)`

创建验证器实例。

**ValidationRulesConfig:**
```typescript
{
  [field: string]: {
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    pattern?: RegExp;
    rule?: 'email' | 'phone' | 'idCard' | 'url' | 'custom';
    customValidator?: (value: unknown) => boolean | string;
    message?: string;
  }
}
```

#### `validator.validate(data: Record<string, unknown>)`

验证表单数据。

**返回值:**
```typescript
{
  valid: boolean;
  errors: {
    field: string;
    message: string;
    code: string;
    value?: unknown;
  }[];
  data?: Record<string, unknown>;  // 验证通过时返回
}
```

#### `validator.addRule(field: string, rule: FieldRule)`

添加验证规则。

#### `validator.removeRule(field: string)`

移除验证规则。

### 便捷函数

```typescript
validateEmail(email: string): boolean
validatePhone(phone: string): boolean
validateIdCard(idCard: string): boolean
checkPasswordStrength(password: string): PasswordStrengthLevel
createValidator(rules: ValidationRulesConfig): InputValidator
validateInput(data: Record<string, unknown>, rules: ValidationRulesConfig): InputValidationResult
```

---

## 🎯 实际应用场景

### 用户注册表单

```typescript
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
  password: {
    required: true,
    customValidator: (value: unknown) => {
      const strength = InputValidator.checkPasswordStrength(value as string);
      return strength.valid || `密码强度不足：${strength.suggestions.join('，')}`;
    }
  },
  confirmPassword: {
    required: true,
    customValidator: (value: unknown, data: Record<string, unknown>) => {
      return value === data.password || '两次输入的密码不一致';
    }
  }
};

const validator = createValidator(registrationSchema);

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

### 密码修改

```typescript
const passwordChangeSchema = {
  oldPassword: { required: true },
  newPassword: {
    required: true,
    customValidator: (value: unknown) => {
      const strength = InputValidator.checkPasswordStrength(value as string);
      return strength.score >= 3 || `密码强度不足，当前等级：${strength.level}`;
    }
  },
  confirmNewPassword: {
    required: true,
    customValidator: (value: unknown, data: Record<string, unknown>) => {
      return value === data.newPassword || '两次输入的新密码不一致';
    }
  }
};

const validator = createValidator(passwordChangeSchema);
```

---

## 🧪 测试

运行测试：

```bash
npx ts-node src/skills/validate-input-skill.test.ts
```

预期输出：

```
🧪 输入验证技能测试

📧 邮箱验证测试:
  ✓ test@example.com: true (期望：true)
  ✓ user.name@domain.co.uk: true (期望：true)
  ...

📱 手机号验证测试:
  ✓ 13812345678: true (期望：true)
  ...

🆔 身份证验证测试:
  ✓ 110101199001011234: true (期望：true)
  ...

🔐 密码强度测试:
  ✓ 123456: weak (期望：weak)
  ...

✅ 测试完成！
```

---

## 📝 最佳实践

1. **前后端双重验证**: 前端验证提升用户体验，后端验证保证数据安全
2. **实时验证**: 用户输入时即时验证，而非提交时才验证
3. **友好提示**: 使用 `message` 字段提供清晰的错误说明和改进建议
4. **密码强度**: 根据安全等级调整密码要求 (普通应用 3 分，金融应用 4-5 分)
5. **自定义规则**: 使用 `customValidator` 实现业务逻辑验证

---

## 📄 示例文档

详细使用示例请参考：[validate-input-skill.examples.md](./validate-input-skill.examples.md)

---

## 📅 版本历史

### v1.0.0 (2026-03-13)

- ✅ 邮箱验证
- ✅ 手机号验证 (中国大陆)
- ✅ 身份证验证 (中国大陆，含校验码)
- ✅ 密码强度检查
- ✅ 自定义验证规则
- ✅ 表单验证器

---

## 📞 支持

如有问题或建议，请查看示例文档或联系开发团队。

---

**创建时间:** 2026-03-13  
**版本:** 1.0.0  
**作者:** AxonClaw Team
