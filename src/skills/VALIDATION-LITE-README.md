# 数据验证工具 - Validation Lite Skill

轻量级数据验证工具，提供常用的数据验证功能。

---

## 📋 功能概览

| 功能 | 说明 | 支持 |
|------|------|------|
| **邮箱验证** | RFC 5322 标准邮箱格式验证 | ✅ |
| **手机验证** | 中国大陆/国际手机号验证 | ✅ |
| **URL 验证** | HTTP/HTTPS URL 格式验证 | ✅ |
| **身份证验证** | 中国大陆 18 位身份证验证 | ✅ |
| **信用卡验证** | Luhn 算法 + 卡类型识别 | ✅ |
| **密码强度** | 密码强度评估与建议 | ✅ |

---

## 🚀 快速开始

### 导入模块

```typescript
import {
  validateEmail,
  validatePhone,
  validateUrl,
  validateChineseID,
  validateCreditCard,
  checkPasswordStrength,
  batchValidate,
  validateAll
} from './validation-lite-skill';
```

---

## 📖 API 文档

### 1. 邮箱验证

```typescript
validateEmail(email: string): ValidationLiteResult
```

**示例:**
```typescript
const result = validateEmail('user@example.com');
console.log(result.valid);    // true
console.log(result.message);  // "邮箱地址格式正确"
```

**验证规则:**
- 符合 RFC 5322 标准格式
- 最大长度 254 字符
- 用户名部分最大 64 字符
- 不能以点号开头或结尾

---

### 2. 手机号验证

```typescript
validatePhone(
  phone: string, 
  options?: { region?: 'CN' | 'intl' }
): ValidationLiteResult
```

**示例:**
```typescript
// 中国大陆手机号
const cnResult = validatePhone('13812345678', { region: 'CN' });
console.log(cnResult.valid);  // true

// 国际手机号
const intlResult = validatePhone('+1-555-123-4567', { region: 'intl' });
console.log(intlResult.valid);  // true
```

**验证规则:**
- CN: 11 位数字，以 1 开头
- Intl: 包含国家代码的 7-15 位数字

---

### 3. URL 验证

```typescript
validateUrl(
  url: string, 
  options?: { requireProtocol?: boolean }
): ValidationLiteResult
```

**示例:**
```typescript
// 不要求协议
const result1 = validateUrl('example.com', { requireProtocol: false });

// 要求协议
const result2 = validateUrl('https://example.com', { requireProtocol: true });
```

**验证规则:**
- 最大长度 2048 字符
- 可选是否要求 http/https 协议前缀

---

### 4. 身份证验证

```typescript
validateChineseID(idCard: string): ValidationLiteResult & { 
  info?: ChineseIDInfo 
}
```

**示例:**
```typescript
const result = validateChineseID('11010119900307667X');

if (result.valid && result.info) {
  console.log(result.info.province);    // "北京市"
  console.log(result.info.birthDate);   // "1990-03-07"
  console.log(result.info.gender);      // "male"
  console.log(result.info.age);         // 36
}
```

**验证规则:**
- 18 位格式验证
- 地区码有效性
- 出生日期合理性
- 校验码计算 (ISO 7064:1983.MOD 11-2)

**返回信息:**
- `province`: 省份
- `birthDate`: 出生日期
- `gender`: 性别
- `age`: 年龄

---

### 5. 信用卡验证

```typescript
validateCreditCard(cardNumber: string): ValidationLiteResult & { 
  info?: CreditCardInfo 
}
```

**示例:**
```typescript
const result = validateCreditCard('4532015112830366');

if (result.valid && result.info) {
  console.log(result.info.type);   // "visa"
  console.log(result.info.brand);  // "Visa"
  console.log(result.info.last4);  // "0366"
}
```

**支持的卡类型:**
- Visa
- MasterCard
- American Express
- Discover
- JCB
- Diners Club

**验证规则:**
- Luhn 算法校验
- 卡号前缀规则匹配
- 长度验证 (13-19 位)

---

### 6. 密码强度检查

```typescript
checkPasswordStrength(password: string): ValidationLiteResult & { 
  strength?: PasswordStrength
  score?: number 
}
```

**示例:**
```typescript
const result = checkPasswordStrength('Str0ng!P@ssw0rd');

console.log(result.strength);  // "strong"
console.log(result.score);     // 90
console.log(result.valid);     // true
```

**强度等级:**
- `weak` (0-39 分): 不可用
- `medium` (40-69 分): 可用
- `strong` (70-100 分): 强密码

**评分维度:**
- 长度 (0-30 分): ≥8/12/16 位
- 字符类型 (0-40 分): 大小写/数字/特殊字符
- 模式检测 (扣分): 重复字符/常见序列/常见密码

---

### 7. 批量验证

```typescript
batchValidate(
  validators: Array<() => ValidationLiteResult>
): ValidationLiteResult[]
```

**示例:**
```typescript
const results = batchValidate([
  () => validateEmail('user@example.com'),
  () => validatePhone('13812345678', { region: 'CN' }),
  () => checkPasswordStrength('Str0ng!P@ss')
]);

results.forEach(r => console.log(r.valid));
```

---

### 8. 全体验证

```typescript
validateAll(
  validators: Array<() => ValidationLiteResult>
): ValidationLiteResult
```

**示例:**
```typescript
const result = validateAll([
  () => validateEmail('user@example.com'),
  () => checkPasswordStrength('weak')
]);

console.log(result.valid);    // false
console.log(result.message);  // "验证失败：1 个问题"
console.log(result.details?.issues);  // ["密码强度弱"]
```

---

## 📊 类型定义

```typescript
interface ValidationLiteResult {
  valid: boolean;
  message?: string;
  details?: ValidationLiteDetails;
}

interface ValidationLiteDetails {
  format?: boolean;
  strength?: 'weak' | 'medium' | 'strong';
  score?: number;
  issues?: string[];
  suggestions?: string[];
}

interface ChineseIDInfo {
  valid: boolean;
  province?: string;
  city?: string;
  district?: string;
  birthDate?: string;
  gender?: 'male' | 'female';
  age?: number;
}

interface CreditCardInfo {
  valid: boolean;
  type?: string;
  brand?: string;
  last4?: string;
}
```

---

## 🎯 实际应用场景

### 用户注册表单验证

```typescript
function validateRegistration(data: {
  email: string;
  phone: string;
  password: string;
}): boolean {
  const result = validateAll([
    () => validateEmail(data.email),
    () => validatePhone(data.phone, { region: 'CN' }),
    () => checkPasswordStrength(data.password)
  ]);
  
  if (!result.valid) {
    console.error('注册失败:', result.details?.issues);
    return false;
  }
  
  return true;
}
```

### 用户资料更新

```typescript
function updateUserProfile(profile: {
  email: string;
  phone?: string;
  website?: string;
  idCard?: string;
}): boolean {
  // 必填项
  const emailResult = validateEmail(profile.email);
  if (!emailResult.valid) return false;
  
  // 可选项
  if (profile.phone) {
    const phoneResult = validatePhone(profile.phone, { region: 'CN' });
    if (!phoneResult.valid) return false;
  }
  
  if (profile.website) {
    const websiteResult = validateUrl(profile.website, { requireProtocol: true });
    if (!websiteResult.valid) return false;
  }
  
  if (profile.idCard) {
    const idResult = validateChineseID(profile.idCard);
    if (!idResult.valid) return false;
  }
  
  return true;
}
```

### 支付信息验证

```typescript
function validatePaymentInfo(cardNumber: string, cvv: string): boolean {
  const cardResult = validateCreditCard(cardNumber);
  
  if (!cardResult.valid) {
    console.error('信用卡无效:', cardResult.message);
    return false;
  }
  
  console.log('卡类型:', cardResult.info?.brand);
  console.log('末四位:', cardResult.info?.last4);
  
  return true;
}
```

---

## 🔧 高级用法

### 自定义验证流程

```typescript
interface ValidationResult {
  field: string;
  valid: boolean;
  message: string;
}

function validateForm(formData: Record<string, string>): ValidationResult[] {
  const validators: Record<string, (value: string) => ValidationLiteResult> = {
    email: validateEmail,
    phone: (v) => validatePhone(v, { region: 'CN' }),
    website: (v) => validateUrl(v, { requireProtocol: true }),
    password: checkPasswordStrength
  };
  
  return Object.entries(formData).map(([field, value]) => {
    const validator = validators[field];
    if (!validator) return { field, valid: true, message: '跳过' };
    
    const result = validator(value);
    return {
      field,
      valid: result.valid,
      message: result.message
    };
  });
}
```

### 异步验证组合

```typescript
async function validateWithAPI(email: string): Promise<boolean> {
  // 本地格式验证
  const localResult = validateEmail(email);
  if (!localResult.valid) {
    return false;
  }
  
  // API 验证 (是否存在)
  const apiResult = await fetch(`/api/validate/email?email=${email}`);
  return apiResult.ok;
}
```

---

## ⚠️ 注意事项

1. **隐私保护**: 身份证、信用卡等敏感信息验证应在安全环境中进行
2. **性能考虑**: 批量验证时使用 `batchValidate` 避免重复代码
3. **错误处理**: 始终检查 `valid` 字段，不要仅依赖异常
4. **国际化**: 目前仅支持中国大陆身份证和手机号，其他国家需扩展

---

## 📝 测试运行

```bash
# 运行示例文件
cd /Users/nike/.openclaw/workspace
npx ts-node src/skills/validation-lite-skill.examples.ts
```

---

## 📚 相关文件

- `validation-lite-skill.ts` - 核心实现
- `validation-lite-skill.examples.ts` - 使用示例
- `validation-skill.ts` - 完整版 Schema 验证 (如需复杂数据结构验证)

---

## 🆚 与 validation-skill.ts 对比

| 特性 | validation-lite | validation-skill |
|------|----------------|------------------|
| **定位** | 轻量级工具函数 | 完整 Schema 验证框架 |
| **使用场景** | 简单字段验证 | 复杂数据结构验证 |
| **学习曲线** | 低 | 中 |
| **依赖** | 无 | 无 |
| **自定义规则** | 有限 | 完全支持 |
| **嵌套验证** | 不支持 | 支持 |

**选择建议:**
- 简单字段验证 → `validation-lite-skill.ts`
- 复杂对象/数组验证 → `validation-skill.ts`

---

## 📄 许可证

MIT License

---

**最后更新:** 2026-03-13  
**版本:** 1.0.0  
**作者:** AxonClaw
