# 字符串工具技能 - 使用示例

**文件:** `src/skills/string-utils-skill.ts`  
**功能:** 字符串格式化、截断、转换

---

## 📦 导入方式

```typescript
import stringUtils, { 
  toCamelCase, 
  truncate, 
  padLeft,
  format 
} from './src/skills/string-utils-skill';

// 或直接导入所有函数
import * as StringUtils from './src/skills/string-utils-skill';
```

---

## 1️⃣ 字符串格式化

### 基础清理

```typescript
import { format, cleanWhitespace, removeSpecialChars } from './src/skills/string-utils-skill';

// 清理空白字符
const messy = '  Hello   World!  ';
const cleaned = cleanWhitespace(messy);
// 结果: "Hello World!"

// 移除特殊字符
const withSpecial = 'Hello@#$ World!123';
const clean = removeSpecialChars(withSpecial);
// 结果: "Hello World123"

// 自定义格式化选项
const formatted = format(messy, {
  trim: true,              // 去除首尾空白
  collapseSpaces: true,    // 压缩多个空格为单个
  removeSpecialChars: false
});
```

### 大小写转换

```typescript
import { capitalize, decapitalize } from './src/skills/string-utils-skill';

capitalize('hello');      // "Hello"
decapitalize('Hello');    // "hello"
```

---

## 2️⃣ 字符串截断

### 基础截断

```typescript
import { truncate, ellipsis, truncateToWord } from './src/skills/string-utils-skill';

const longText = '这是一个很长的字符串，用于演示截断功能';

// 简单截断 (添加 ...)
truncate(longText, 10);
// 结果: "这是一个很长..."

// 自定义后缀
truncate(longText, { length: 10, suffix: ' [更多]' });
// 结果: "这是一个很 [更多]"

// 保留完整单词
truncate(longText, { length: 10, preserveWords: true });
// 结果: "这是一个..." (在单词边界截断)

// 快捷省略号方法
ellipsis(longText, 8);
// 结果: "这是一个…"
```

### 实际应用场景

```typescript
// 文章标题卡片显示
const articleTitle = '2026 年最新技术趋势分析报告：人工智能与量子计算的融合';
const cardTitle = ellipsis(articleTitle, 15);
// 结果: "2026 年最新技术趋…"

// 用户评论预览
const comment = '这个功能真的太棒了！我非常喜欢这个设计，希望能够继续保持更新。';
const preview = truncate(comment, { length: 20, preserveWords: true });
// 结果: "这个功能真的太棒了！我…"
```

---

## 3️⃣ 字符串转换 (命名格式)

### 命名格式转换

```typescript
import { 
  toCamelCase, 
  toPascalCase, 
  toKebabCase, 
  toSnakeCase, 
  toConstantCase,
  toTitleCase,
  convertCase 
} from './src/skills/string-utils-skill';

const input = 'user_name';

// 驼峰命名 (camelCase) - JavaScript 变量/属性
toCamelCase('user_name');        // "userName"
toCamelCase('hello-world');      // "helloWorld"
toCamelCase('Hello World');      // "helloWorld"

// 帕斯卡命名 (PascalCase) - 类名/组件名
toPascalCase('user_profile');    // "UserProfile"
toPascalCase('button-primary');  // "ButtonPrimary"

// 短横线命名 (kebab-case) - CSS 类/URL
toKebabCase('userName');         // "user-name"
toKebabCase('Hello World');      // "hello-world"

// 下划线命名 (snake_case) - Python 变量/数据库字段
toSnakeCase('userName');         // "user_name"
toSnakeCase('Hello-World');      // "hello_world"

// 常量命名 (CONSTANT_CASE) - 环境变量/常量
toConstantCase('userName');      // "USER_NAME"
toConstantCase('api-key');       // "API_KEY"

// 标题命名 (Title Case) - 标题显示
toTitleCase('hello world');      // "Hello World"

// 通用转换函数
convertCase('user_name', 'camel');    // "userName"
convertCase('user_name', 'kebab');    // "user-name"
convertCase('userName', 'constant');  // "USER_NAME"
```

### 实际应用场景

```typescript
// API 响应字段转换 (后端 snake_case → 前端 camelCase)
const apiResponse = {
  user_name: 'john',
  first_name: 'John',
  last_name: 'Doe'
};

const normalized = {
  userName: toCamelCase('user_name'),
  firstName: toCamelCase('first_name'),
  lastName: toCamelCase('last_name')
};

// 环境变量生成
const configKey = 'database_host';
const envVar = toConstantCase(configKey);  // "DATABASE_HOST"

// CSS 类名生成
const componentName = 'ButtonPrimary';
const cssClass = toKebabCase(componentName);  // "button-primary"
```

---

## 4️⃣ 字符串填充

### 基础填充

```typescript
import { 
  pad, 
  padLeft, 
  padRight, 
  padCenter, 
  padZero 
} from './src/skills/string-utils-skill';

const text = 'ABC';

// 左填充 (默认空格)
padLeft(text, 8);           // "     ABC"
padLeft(text, 8, '-');      // "-----ABC"

// 右填充
padRight(text, 8);          // "ABC     "
padRight(text, 8, '.');     // "ABC....."

// 居中填充
padCenter(text, 8);         // "  ABC   "
padCenter(text, 8, '=');    // "==ABC==="

// 零填充 (用于数字)
padZero('42', 5);           // "00042"
padZero('123', 8);          // "00000123"

// 通用填充方法
pad(text, { 
  length: 10, 
  char: '*', 
  position: 'left'   // 'left' | 'right' | 'both'
});                   // "*******ABC"
```

### 实际应用场景

```typescript
// 订单号格式化
const orderId = '12345';
const formattedOrderId = padZero(orderId, 10);
// 结果: "0000012345"

// 表格对齐输出
const products = [
  { name: 'Apple', price: '9.99' },
  { name: 'Banana', price: '4.50' },
  { name: 'Orange', price: '6.75' }
];

products.forEach(p => {
  const namePadded = padRight(p.name, 10);
  const pricePadded = padLeft(p.price, 6);
  console.log(`${namePadded} ${pricePadded}`);
});
// 输出:
// Apple      9.99
// Banana     4.50
// Orange     6.75

// 时间格式化 (秒 → HH:MM:SS)
const seconds = '5';
const minutes = '9';
const hours = '1';
const timeString = `${padZero(hours, 2)}:${padZero(minutes, 2)}:${padZero(seconds, 2)}`;
// 结果: "01:09:05"
```

---

## 5️⃣ 其他实用工具

### 字符串操作

```typescript
import { reverse, repeat, template } from './src/skills/string-utils-skill';

// 反转字符串
reverse('hello');           // "olleh"
reverse('12345');           // "54321"

// 重复字符串
repeat('ab', 3);            // "ababab"
repeat('*', 10);            // "**********"

// 模板替换
const greeting = template('Hello {name}, welcome to {place}!', {
  name: 'World',
  place: 'OpenClaw'
});
// 结果: "Hello World, welcome to OpenClaw!"

// 模板中的缺失键会保留原样
template('Hello {name}! {missing}', { name: 'World' });
// 结果: "Hello World! {missing}"
```

---

## 🎯 综合应用示例

### 示例 1: API 数据标准化

```typescript
import { toCamelCase, format } from './src/skills/string-utils-skill';

function normalizeApiResponse(data: Record<string, any>): Record<string, any> {
  const normalized: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(data)) {
    const camelKey = toCamelCase(key);
    normalized[camelKey] = typeof value === 'string' 
      ? format(value, { trim: true, collapseSpaces: true })
      : value;
  }
  
  return normalized;
}

// 使用
const apiData = {
  user_name: '  john_doe  ',
  first_name: 'John',
  last_name: 'Doe'
};

const normalized = normalizeApiResponse(apiData);
// 结果: { userName: 'john_doe', firstName: 'John', lastName: 'Doe' }
```

### 示例 2: 显示文本处理

```typescript
import { ellipsis, cleanWhitespace } from './src/skills/string-utils-skill';

function prepareDisplayText(text: string, maxLength: number): string {
  return ellipsis(cleanWhitespace(text), maxLength);
}

// 使用
const longDescription = '  这   是   一   个   很   长   的   描   述   文   本  ';
const displayText = prepareDisplayText(longDescription, 10);
// 结果: "这是一个很…"
```

### 示例 3: 代码生成器

```typescript
import { toPascalCase, toCamelCase, toKebabCase } from './src/skills/string-utils-skill';

function generateComponentFiles(componentName: string): { 
  className: string;
  fileName: string;
  cssClass: string;
} {
  return {
    className: toPascalCase(componentName),      // "ButtonPrimary"
    fileName: `${toKebabCase(componentName)}.tsx`, // "button-primary.tsx"
    cssClass: toKebabCase(componentName)         // "button-primary"
  };
}

// 使用
const files = generateComponentFiles('button_primary');
/*
{
  className: 'ButtonPrimary',
  fileName: 'button-primary.tsx',
  cssClass: 'button-primary'
}
*/
```

---

## 🧪 运行内置示例

```typescript
import { runExamples } from './src/skills/string-utils-skill';

// 在控制台输出所有功能示例
runExamples();
```

输出:
```
=== 字符串工具技能使用示例 ===

【命名转换】
原始: "hello_world-test"
  → camelCase:     "helloWorldTest"
  → PascalCase:    "HelloWorldTest"
  → kebab-case:    "hello-world-test"
  → snake_case:    "hello_world_test"
  → CONSTANT_CASE: "HELLO_WORLD_TEST"
  → Title Case:    "Hello World Test"

【字符串截断】
原始: "这是一个很长的字符串，用于演示截断功能" (长度: 19)
  → truncate(10):     "这是一个很..."
  → truncate(10, 保留单词): "这是一个..."
  → ellipsis(8):      "这是一个…"

【字符串填充】
原始: "ABC"
  → padLeft(8):   "     ABC"
  → padRight(8):  "ABC     "
  → padCenter(8): "  ABC   "
  → padZero(5):   "00042"

【字符串格式化】
原始: "  Hello   World!  @#$  "
  → cleanWhitespace:    "Hello World! @#$"
  → removeSpecialChars: "  Hello   World     "
  → capitalize:         "Hello"

【其他工具】
  → reverse("hello"): "olleh"
  → repeat("ab", 3):  "ababab"
  → template:         "Hello World!"

【实际应用场景】
1. API 字段命名转换:
   "user_name" → camelCase: "userName" (用于 JavaScript)
   "userName" → CONSTANT:   "USER_NAME" (用于环境变量)

2. 显示文本截断:
   标题: "2026 年最新技术趋势分析报告：人工智能与量子计算的融合"
   卡片显示: "2026 年最新技术趋…"

3. 数字格式化:
   订单号: "00000123" (补足 8 位)
   价格: "99.99     " (右对齐)

=== 示例完成 ===
```

---

## 📊 API 速查表

| 函数 | 参数 | 返回值 | 描述 |
|------|------|--------|------|
| `toCamelCase(str)` | `string` | `string` | 转驼峰命名 |
| `toPascalCase(str)` | `string` | `string` | 转帕斯卡命名 |
| `toKebabCase(str)` | `string` | `string` | 转短横线命名 |
| `toSnakeCase(str)` | `string` | `string` | 转下划线命名 |
| `toConstantCase(str)` | `string` | `string` | 转常量命名 |
| `toTitleCase(str)` | `string` | `string` | 转标题命名 |
| `convertCase(str, type)` | `string, CaseType` | `string` | 通用转换 |
| `truncate(str, opts)` | `string, number \| TruncateOptions` | `string` | 截断字符串 |
| `ellipsis(str, len)` | `string, number` | `string` | 添加省略号 |
| `padLeft(str, len, char)` | `string, number, string` | `string` | 左填充 |
| `padRight(str, len, char)` | `string, number, string` | `string` | 右填充 |
| `padCenter(str, len, char)` | `string, number, string` | `string` | 居中填充 |
| `padZero(str, len)` | `string, number` | `string` | 零填充 |
| `format(str, opts)` | `string, FormatOptions` | `string` | 格式化字符串 |
| `cleanWhitespace(str)` | `string` | `string` | 清理空白 |
| `capitalize(str)` | `string` | `string` | 首字母大写 |
| `reverse(str)` | `string` | `string` | 反转字符串 |
| `template(tpl, data)` | `string, Record` | `string` | 模板替换 |

---

**创建时间:** 2026-03-13  
**版本:** 1.0.0  
**作者:** NOVA (Subagent)
