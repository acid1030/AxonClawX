# Number Utils Skill - 使用示例

## 导入方式

```typescript
import numberUtilsSkill, { 
  formatNumber, 
  toChineseUppercase, 
  toScientificNotation 
} from './number-utils-skill';

// 或直接使用技能对象
const { formatCurrency, formatPercent } = numberUtilsSkill;
```

---

## 1. 数字格式化

### 千分位格式化

```typescript
import { formatNumber } from './number-utils-skill';

// 基础用法 (默认 2 位小数)
formatNumber(1234567.89);
// 输出: "1,234,567.89"

// 自定义小数位数
formatNumber(1234567.89, 0);
// 输出: "1,234,568"

formatNumber(1234567.89, 4);
// 输出: "1,234,567.8900"

// 自定义分隔符 (欧洲格式)
formatNumber(1234567.89, 2, '.', ',');
// 输出: "1.234.567,89"

// 无小数位
formatNumber(1000, 0);
// 输出: "1,000"
```

### 货币格式化

```typescript
import { formatCurrency } from './number-utils-skill';

// 人民币 (默认)
formatCurrency(1234567.89);
// 输出: "¥1,234,567.89"

// 美元
formatCurrency(1234567.89, '$');
// 输出: "$1,234,567.89"

// 欧元
formatCurrency(1234567.89, '€');
// 输出: "€1,234,567.89"

// 无小数位
formatCurrency(1234567.89, '¥', 0);
// 输出: "¥1,234,568"
```

### 百分比格式化

```typescript
import { formatPercent } from './number-utils-skill';

// 基础用法
formatPercent(0.15);
// 输出: "15%"

formatPercent(0.1567);
// 输出: "16%"

// 保留小数位
formatPercent(0.1567, 2);
// 输出: "15.67%"

formatPercent(0.003, 1);
// 输出: "0.3%"
```

### 大数格式化 (K, M, B, T)

```typescript
import { formatLargeNumber } from './number-utils-skill';

formatLargeNumber(1500);
// 输出: "1.5K"

formatLargeNumber(2500000);
// 输出: "2.5M"

formatLargeNumber(3200000000);
// 输出: "3.2B"

formatLargeNumber(1500000000000);
// 输出: "1.5T"

// 自定义小数位
formatLargeNumber(1567000, 2);
// 输出: "1.57M"

// 负数
formatLargeNumber(-2500000);
// 输出: "-2.5M"
```

---

## 2. 科学计数法

### 转换为科学计数法

```typescript
import { toScientificNotation } from './number-utils-skill';

// 基础用法
toScientificNotation(12345000000);
// 输出: "1.2345e+10"

toScientificNotation(0.000012345);
// 输出: "1.2345e-5"

// 自定义精度
toScientificNotation(12345000000, 2);
// 输出: "1.2e+10"

toScientificNotation(12345000000, 6);
// 输出: "1.234500e+10"

// 负数
toScientificNotation(-9876543210, 3);
// 输出: "-9.877e+9"

// 零
toScientificNotation(0);
// 输出: "0"
```

### 从科学计数法转换

```typescript
import { fromScientificNotation } from './number-utils-skill';

fromScientificNotation("1.2345e+10");
// 输出: 12345000000

fromScientificNotation("1.2345e-5");
// 输出: 0.000012345

fromScientificNotation("-9.877e+9");
// 输出: -9877000000
```

---

## 3. 中文大写数字

### 数字转中文大写

```typescript
import { toChineseUppercase } from './number-utils-skill';

// 基础用法
toChineseUppercase(123);
// 输出: "壹佰贰拾叁"

toChineseUppercase(1234);
// 输出: "壹仟贰佰叁拾肆"

toChineseUppercase(12345);
// 输出: "壹万贰仟叁佰肆拾伍"

toChineseUppercase(123456789);
// 输出: "壹亿贰仟叁佰肆拾伍万陆仟柒佰捌拾玖"
```

### 金额模式

```typescript
// 添加"元整"
toChineseUppercase(1234.56, { isCurrency: true });
// 输出: "壹仟贰佰叁拾肆点伍陆元"

toChineseUppercase(1234, { isCurrency: true });
// 输出: "壹仟贰佰叁拾肆元整"

toChineseUppercase(0, { isCurrency: true });
// 输出: "零元整"
```

### 负数处理

```typescript
toChineseUppercase(-1234);
// 输出: "负壹仟贰佰叁拾肆"

toChineseUppercase(-1234.56, { isCurrency: true });
// 输出: "负壹仟贰佰叁拾肆点伍陆元"
```

### 零的处理

```typescript
toChineseUppercase(1001);
// 输出: "壹仟零壹"

toChineseUppercase(100001);
// 输出: "壹拾万零壹"

toChineseUppercase(1000000001);
// 输出: "壹拾亿零壹"
```

### 中文大写转数字

```typescript
import { fromChineseUppercase } from './number-utils-skill';

fromChineseUppercase("壹佰贰拾叁");
// 输出: 123

fromChineseUppercase("壹万贰仟叁佰肆拾伍");
// 输出: 12345

fromChineseUppercase("负壹仟贰佰叁拾肆");
// 输出: -1234

fromChineseUppercase("壹仟贰佰叁拾肆元整");
// 输出: 1234
```

---

## 4. 工具函数

### 验证数字

```typescript
import { isValidNumber } from './number-utils-skill';

isValidNumber(123);
// 输出: true

isValidNumber(NaN);
// 输出: false

isValidNumber(Infinity);
// 输出: false

isValidNumber("123");
// 输出: false (字符串)
```

### 安全解析数字

```typescript
import { safeParseNumber } from './number-utils-skill';

safeParseNumber("123.45");
// 输出: 123.45

safeParseNumber("abc", 0);
// 输出: 0 (无效输入返回默认值)

safeParseNumber("", 100);
// 输出: 100
```

### 四舍五入

```typescript
import { roundTo } from './number-utils-skill';

roundTo(3.14159, 2);
// 输出: 3.14

roundTo(2.5);
// 输出: 2.5 (默认 2 位)

roundTo(123.456, 0);
// 输出: 123
```

---

## 5. 实际应用场景

### 财务报表

```typescript
import { formatCurrency, toChineseUppercase } from './number-utils-skill';

const amount = 1234567.89;

// 阿拉伯数字格式
const displayAmount = formatCurrency(amount);
// "¥1,234,567.89"

// 中文大写金额 (用于合同/支票)
const chineseAmount = toChineseUppercase(amount, { isCurrency: true });
// "壹佰贰拾叁万肆仟伍佰陆拾柒点捌玖元"
```

### 数据可视化

```typescript
import { formatLargeNumber, formatPercent } from './number-utils-skill';

// 用户数量显示
const users = 2500000;
console.log(`用户总数：${formatLargeNumber(users)}`);
// "用户总数：2.5M"

// 增长率显示
const growthRate = 0.1567;
console.log(`增长率：${formatPercent(growthRate, 2)}`);
// "增长率：15.67%"
```

### 科学计算

```typescript
import { toScientificNotation, fromScientificNotation } from './number-utils-skill';

// 物理常数
const avogadroConstant = 6.02214076e23;
console.log(toScientificNotation(avogadroConstant, 4));
// "6.0221e+23"

// 解析用户输入的科学计数法
const userInput = "3.0e8"; // 光速
const speedOfLight = fromScientificNotation(userInput);
// 300000000
```

### 表单验证

```typescript
import { isValidNumber, safeParseNumber, roundTo } from './number-utils-skill';

function processUserInput(input: string): number | null {
  const parsed = safeParseNumber(input, NaN);
  
  if (!isValidNumber(parsed)) {
    return null; // 无效输入
  }
  
  return roundTo(parsed, 2); // 保留 2 位小数
}

processUserInput("123.456");  // 123.46
processUserInput("abc");      // null
processUserInput("");         // null
```

---

## 6. 完整技能对象使用

```typescript
import numberUtilsSkill from './number-utils-skill';

// 使用技能对象
numberUtilsSkill.formatNumber(1234567.89);
numberUtilsSkill.formatCurrency(1234567.89, '$');
numberUtilsSkill.toChineseUppercase(1234, { isCurrency: true });
numberUtilsSkill.toScientificNotation(12345000000);

// 解构使用
const { formatNumber, formatLargeNumber, toChineseUppercase } = numberUtilsSkill;

formatNumber(1234567.89);
formatLargeNumber(2500000);
toChineseUppercase(1234);
```

---

## API 参考

| 函数 | 描述 | 参数 | 返回值 |
|------|------|------|--------|
| `formatNumber` | 千分位格式化 | num, decimals?, separator?, decimalPoint? | string |
| `formatCurrency` | 货币格式化 | num, currency?, decimals? | string |
| `formatPercent` | 百分比格式化 | num, decimals? | string |
| `formatLargeNumber` | 大数格式化 (K/M/B/T) | num, decimals? | string |
| `toScientificNotation` | 转科学计数法 | num, precision? | string |
| `fromScientificNotation` | 科学计数法转数字 | scientific | number |
| `toChineseUppercase` | 转中文大写 | num, options? | string |
| `fromChineseUppercase` | 中文大写转数字 | chinese | number |
| `isValidNumber` | 验证数字 | value | boolean |
| `safeParseNumber` | 安全解析数字 | str, defaultValue? | number |
| `roundTo` | 四舍五入 | num, decimals? | number |

---

**版本:** 1.0.0  
**最后更新:** 2026-03-13
