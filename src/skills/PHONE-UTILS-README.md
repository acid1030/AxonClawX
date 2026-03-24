# 手机号验证格式化工具 (phone-utils-skill)

> 中国大陆、台湾、香港、澳门及国际手机号验证、归属地查询、格式化输出工具

## 📦 功能特性

- ✅ **手机号验证** - 支持中国大陆、台湾、香港、澳门及国际号码
- 🌍 **归属地查询** - 基于号段识别省份、城市、运营商
- 🎨 **格式化输出** - 多种格式模板、分隔符、国家代码支持
- 🔒 **隐私保护** - 手机号脱敏功能
- 🧹 **数据清洗** - 清理、标准化手机号格式

## 🚀 快速开始

```typescript
import {
  validatePhone,
  queryPhoneLocation,
  formatPhone,
  getCarrier,
  maskPhone,
} from './phone-utils-skill';

// 验证手机号
const result = validatePhone('13800138000');
console.log(result); // { isValid: true, region: 'CN', type: 'mobile' }

// 查询归属地
const location = queryPhoneLocation('13800138000');
console.log(location); // { province: '北京', city: '北京', carrier: '中国移动' }

// 格式化输出
const formatted = formatPhone('13800138000', { separator: '-' });
console.log(formatted); // "138-0013-8000"

// 获取运营商
const carrier = getCarrier('13800138000');
console.log(carrier); // "中国移动"

// 脱敏处理
const masked = maskPhone('13800138000');
console.log(masked); // "*******8000"
```

## 📖 API 文档

### 验证功能

#### `validatePhone(phone: string): PhoneValidationResult`

综合验证手机号，自动识别地区。

```typescript
validatePhone('13800138000');
// { isValid: true, region: 'CN', type: 'mobile' }

validatePhone('0912345678');
// { isValid: true, region: 'TW', type: 'mobile' }

validatePhone('123456');
// { isValid: false, error: '无法识别的手机号格式' }
```

#### `validateCNMobile(phone: string): PhoneValidationResult`

验证中国大陆手机号。

```typescript
validateCNMobile('+86 138 0013 8000');
// { isValid: true, region: 'CN', type: 'mobile' }
```

#### `validateTWMobile`, `validateHKMobile`, `validateMOMobile`

验证台湾、香港、澳门手机号。

### 归属地查询

#### `queryPhoneLocation(phone: string): PhoneLocationInfo`

查询手机号归属地信息。

```typescript
queryPhoneLocation('13800138000');
// {
//   province: '北京',
//   city: '北京',
//   carrier: '中国移动',
//   prefix: '138',
//   unknown: false
// }
```

#### `getCarrier(phone: string): string`

快速获取运营商名称。

```typescript
getCarrier('13800138000'); // "中国移动"
getCarrier('13012345678'); // "中国联通"
getCarrier('13312345678'); // "中国电信"
getCarrier('19212345678'); // "中国广电"
```

### 格式化功能

#### `formatPhone(phone: string, options?: FormatOptions): string`

格式化手机号输出。

```typescript
// 默认格式 (XXX XXXX XXXX)
formatPhone('13800138000'); // "138 0013 8000"

// 自定义分隔符
formatPhone('13800138000', { separator: '-' }); // "138-0013-8000"

// 使用模板
formatPhone('13800138000', { template: 'XXX-XXXX-XXXX' }); // "138-0013-8000"

// 带国家代码
formatPhone('13800138000', { withCountryCode: true }); // "+86 138 0013 8000"
```

#### `formatPhones(phones: string[], options?: FormatOptions): string[]`

批量格式化手机号。

```typescript
formatPhones(['13800138000', '13912345678'], { separator: '-' });
// ["138-0013-8000", "139-1234-5678"]
```

#### `normalizePhone(phone: string): string`

标准化手机号 (移除分隔符，保留国家代码)。

```typescript
normalizePhone('+86 138 0013 8000'); // "+8613800138000"
normalizePhone('138-0013-8000');     // "13800138000"
```

#### `maskPhone(phone: string, maskChar?: string, showLast?: number): string`

脱敏手机号。

```typescript
maskPhone('13800138000');           // "*******8000"
maskPhone('13800138000', '*', 3);   // "******800"
maskPhone('13800138000', 'x', 4);   // "xxxxx8000"
```

### 工具函数

#### `cleanPhone(phone: string): string`

清理手机号 (移除空格、横线、括号等)。

```typescript
cleanPhone('138-0013-8000');      // "13800138000"
cleanPhone('(138) 0013-8000');    // "13800138000"
cleanPhone('138.0013.8000');      // "13800138000"
```

#### `isVirtualCarrier(phone: string): boolean`

判断是否为虚拟运营商号段。

```typescript
isVirtualCarrier('17012345678'); // true
isVirtualCarrier('13800138000'); // false
```

#### `getPrefixInfo(phone: string): { prefix: string; carrier: string } | null`

获取号段信息。

```typescript
getPrefixInfo('13800138000');
// { prefix: '138', carrier: '中国移动' }
```

## 📊 支持的号段

### 中国大陆

| 运营商 | 号段 |
|--------|------|
| 中国移动 | 134, 135, 136, 137, 138, 139, 147, 150, 151, 152, 157, 158, 159, 178, 182, 183, 184, 187, 188, 198, 195, 197 |
| 中国联通 | 130, 131, 132, 155, 156, 166, 171, 175, 176, 185, 186, 196 |
| 中国电信 | 133, 153, 173, 177, 180, 181, 189, 199, 190, 191, 193 |
| 中国广电 | 192 |
| 虚拟运营商 | 170, 162, 165, 167 |
| 5G 号段 | 190, 191, 192, 193, 195, 196, 197, 198 |

### 台湾地区

- 09xx 格式 (10 位)

### 香港地区

- 5x, 6x, 7x, 9x 开头 (8 位)

### 澳门地区

- 6x 开头 (8 位)

### 国际号码

- 支持 ITU E.164 标准格式

## 🎯 使用场景

### 1. 表单验证

```typescript
function validatePhoneForm(input: string) {
  const result = validatePhone(input);
  if (!result.isValid) {
    return { valid: false, message: result.error };
  }
  
  const carrier = getCarrier(input);
  const location = queryPhoneLocation(input);
  
  return {
    valid: true,
    message: `✓ ${carrier} (${location.province})`
  };
}
```

### 2. 用户信息展示

```typescript
// 脱敏显示
users.forEach(user => {
  console.log(`${user.name}: ${maskPhone(user.phone)}`);
});
```

### 3. 数据导入清洗

```typescript
const cleaned = importedPhones.map(phone => ({
  original: phone,
  cleaned: cleanPhone(phone),
  formatted: formatPhone(phone),
  valid: validatePhone(phone).isValid,
}));
```

### 4. 批量导出

```typescript
const csvLines = phones.map(phone => {
  const location = queryPhoneLocation(phone);
  const carrier = getCarrier(phone);
  const formatted = formatPhone(phone, { separator: '-' });
  return `${formatted},${carrier},${location.province}`;
});
```

## ⚡ 性能提示

- ✅ 批量处理使用 `formatPhones()` 而非循环调用
- ✅ 频繁查询归属地时，缓存 `queryPhoneLocation()` 结果
- ✅ 验证前先 `cleanPhone()` 可提高准确率
- ✅ 避免重复调用 `getCarrier()`

## 📝 注意事项

1. **归属地数据** - 基于号段前 7 位识别，部分新号段可能未收录
2. **虚拟运营商** - 170/171/162/165/167 等号段归属地显示为"虚拟"
3. **携号转网** - 无法识别携号转网用户，运营商信息可能不准确
4. **国际号码** - 仅验证格式，不提供归属地查询

## 📄 License

MIT
