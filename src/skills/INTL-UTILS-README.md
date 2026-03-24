# Intl Utils Skill - 国际化工具技能

> 完整的 i18n 多语言支持解决方案，包含翻译、日期/数字格式化和复数规则处理

---

## 📦 功能特性

- ✅ **多语言翻译** - 支持 7 种语言（中/英/日/韩/法/德/西）
- ✅ **日期格式化** - 支持多种日期样式和相对时间
- ✅ **数字格式化** - 支持数字、货币、百分比、文件大小
- ✅ **复数规则** - 自动处理不同语言的复数形式
- ✅ **类型安全** - 完整的 TypeScript 类型定义
- ✅ **本地存储** - 自动保存/加载用户语言偏好
- ✅ **浏览器检测** - 自动检测浏览器语言

---

## 🚀 快速开始

### 1. 导入模块

```typescript
import intl, { IntlUtils } from './intl-utils-skill';
```

### 2. 基础翻译

```typescript
// 使用默认语言（中文）
console.log(intl.t('common.loading')); // '加载中...'

// 切换语言
intl.setLanguage('en');
console.log(intl.t('common.loading')); // 'Loading...'

// 指定语言（不改变当前语言）
console.log(intl.t('messages.welcome', 'zh')); // '欢迎使用 ARIA'
```

### 3. 带插值的翻译

```typescript
// 翻译文本："Hello, {name}!"
console.log(intl.tInterpolate('messages.greeting', { name: 'Axon' }));
// 输出："Hello, Axon!"
```

---

## 📅 日期格式化

### 格式化日期

```typescript
// 基础格式
intl.formatDate(new Date());
// '2026 年 3 月 13 日'

// 不同样式
intl.formatDate(Date.now(), { style: 'short' });
// '26/03/13'

intl.formatDate(Date.now(), { style: 'medium' });
// '2026 年 3 月 13 日'

intl.formatDate(Date.now(), { style: 'long' });
// '2026 年 3 月 13 日 星期五'

// 切换语言
intl.formatDate(new Date(), { locale: 'en', dateStyle: 'full' });
// 'Friday, March 13, 2026'
```

### 格式化时间

```typescript
intl.formatTime(new Date());
// '18:24'

intl.formatTime(Date.now(), { style: 'long' });
// '18:24:35 中国标准时间'
```

### 相对时间（多久以前）

```typescript
// 1 分钟前
intl.formatRelativeTime(Date.now() - 60000);
// '1 分钟前'

// 2 小时前
intl.formatRelativeTime(Date.now() - 7200000);
// '2 小时前'

// 3 天后
intl.formatRelativeTime(Date.now() + 259200000);
// '3 天后'

// 英语
intl.setLanguage('en');
intl.formatRelativeTime(Date.now() - 3600000);
// '1 hour ago'
```

---

## 🔢 数字格式化

### 基础数字

```typescript
intl.formatNumber(1234567.89);
// '1,234,567.89'

intl.formatNumber(1234567.89, { locale: 'de' });
// '1.234.567,89'

intl.formatNumber(1234567.89, { 
  maximumFractionDigits: 0 
});
// '1,234,568'
```

### 货币

```typescript
intl.formatCurrency(1234.56, 'USD');
// '$1,234.56'

intl.formatCurrency(1234.56, 'EUR');
// '€1,234.56'

intl.formatCurrency(1234.56, 'CNY');
// '¥1,234.56'

intl.formatCurrency(1234.56, 'EUR', { locale: 'de' });
// '1.234,56 €'
```

### 百分比

```typescript
intl.formatPercent(0.75);
// '75%'

intl.formatPercent(0.1234, { 
  minimumFractionDigits: 2 
});
// '12.34%'
```

### 文件大小

```typescript
intl.formatFileSize(1024);
// '1 KB'

intl.formatFileSize(1536000);
// '1.5 MB'

intl.formatFileSize(1073741824);
// '1 GB'

intl.formatFileSize(500, 'en');
// '500 B'
```

---

## 🔤 复数规则

### 基础复数

```typescript
// 英语复数
intl.plural(1, { one: 'item', other: 'items' });
// 'item'

intl.plural(5, { one: 'item', other: 'items' });
// 'items'

intl.plural(0, { zero: 'no items', one: 'item', other: 'items' });
// 'no items'
```

### 复数翻译

```typescript
// 翻译文件中的复数键：
// messages.items.zero: "没有项目"
// messages.items.one: "{count} 个项目"
// messages.items.other: "{count} 个项目"

intl.pluralT('messages.items', 0);
// '没有项目'

intl.pluralT('messages.items', 1, { count: 1 });
// '1 个项目'

intl.pluralT('messages.items', 5, { count: 5 });
// '5 个项目'

// 英语
intl.setLanguage('en');
intl.pluralT('messages.items', 1, { count: 1 });
// '1 item'

intl.pluralT('messages.items', 5, { count: 5 });
// '5 items'
```

---

## 🌍 支持的语言

| 代码 | 语言 | 本地化名称 |
|------|------|-----------|
| `zh` | 中文 | 中文 |
| `en` | 英语 | English |
| `ja` | 日语 | 日本語 |
| `ko` | 韩语 | 한국어 |
| `fr` | 法语 | Français |
| `de` | 德语 | Deutsch |
| `es` | 西班牙语 | Español |

---

## ⚙️ 高级配置

### 自定义实例

```typescript
import { IntlUtils } from './intl-utils-skill';

const customIntl = new IntlUtils({
  defaultLanguage: 'ja',
  fallbackLanguage: 'en',
  supportedLanguages: ['ja', 'en', 'zh']
});

customIntl.setLanguage('ja');
console.log(customIntl.t('common.loading')); // '読み込み中...'
```

### 持久化语言偏好

```typescript
// 初始化时自动从 localStorage 加载
intl.init();

// 手动保存
intl.saveLanguageToStorage('zh');

// 手动加载
const lang = intl.loadLanguageFromStorage();
if (lang) {
  intl.setLanguage(lang);
}
```

### 浏览器语言检测

```typescript
const detectedLang = intl.detectBrowserLanguage();
intl.setLanguage(detectedLang);
```

---

## 📱 React 集成示例

```tsx
import React, { createContext, useContext, useState } from 'react';
import intl, { IntlUtils, Language } from './intl-utils-skill';

// 创建 Context
const I18nContext = createContext<IntlUtils>(intl);

// Provider 组件
export function I18nProvider({ 
  children, 
  defaultLanguage = 'zh' 
}: { 
  children: React.ReactNode;
  defaultLanguage?: Language;
}) {
  const [instance] = useState(() => {
    const i = new IntlUtils({ defaultLanguage });
    i.init();
    return i;
  });

  return (
    <I18nContext.Provider value={instance}>
      {children}
    </I18nContext.Provider>
  );
}

// Hook
export function useI18n() {
  return useContext(I18nContext);
}

// 使用示例
function MyComponent() {
  const { t, formatCurrency, formatRelativeTime, setLanguage } = useI18n();

  return (
    <div>
      <h1>{t('app.title')}</h1>
      <p>{t('messages.welcome')}</p>
      
      <div>
        价格：{formatCurrency(1234.56, 'CNY')}
      </div>
      
      <div>
        更新于：{formatRelativeTime(Date.now() - 3600000)}
      </div>
      
      <button onClick={() => setLanguage('en')}>
        Switch to English
      </button>
    </div>
  );
}
```

---

## 📋 API 参考

### IntlUtils 类

#### 翻译方法

| 方法 | 参数 | 返回值 | 说明 |
|------|------|--------|------|
| `t(keyPath, lang?)` | `keyPath: string`, `lang?: Language` | `string` | 获取翻译 |
| `tInterpolate(keyPath, params, lang?)` | `keyPath: string`, `params: Record`, `lang?: Language` | `string` | 带插值的翻译 |
| `getTranslations(lang?)` | `lang?: Language` | `Translation` | 获取完整翻译对象 |
| `setLanguage(lang)` | `lang: Language` | `void` | 设置当前语言 |
| `getLanguage()` | - | `Language` | 获取当前语言 |
| `getSupportedLanguages()` | - | `Language[]` | 获取支持的語言列表 |

#### 日期方法

| 方法 | 参数 | 返回值 | 说明 |
|------|------|--------|------|
| `formatDate(date, options?)` | `Date | number`, `DateFormatOptions` | `string` | 格式化日期 |
| `formatTime(date, options?)` | `Date | number`, `DateFormatOptions` | `string` | 格式化时间 |
| `formatDateTime(date, options?)` | `Date | number`, `DateFormatOptions` | `string` | 格式化日期时间 |
| `formatRelativeTime(date, lang?)` | `Date | number`, `lang?: Language` | `string` | 相对时间 |

#### 数字方法

| 方法 | 参数 | 返回值 | 说明 |
|------|------|--------|------|
| `formatNumber(num, options?)` | `number`, `NumberFormatOptions` | `string` | 格式化数字 |
| `formatCurrency(amount, currency, options?)` | `number`, `string`, `NumberFormatOptions` | `string` | 格式化货币 |
| `formatPercent(value, options?)` | `number`, `NumberFormatOptions` | `string` | 格式化百分比 |
| `formatFileSize(bytes, lang?)` | `number`, `lang?: Language` | `string` | 格式化文件大小 |

#### 复数方法

| 方法 | 参数 | 返回值 | 说明 |
|------|------|--------|------|
| `plural(count, rules, lang?)` | `number`, `PluralRules`, `lang?: Language` | `string` | 获取复数形式 |
| `pluralT(keyPath, count, params?, lang?)` | `string`, `number`, `Record`, `lang?: Language` | `string` | 复数翻译 |

#### 工具方法

| 方法 | 参数 | 返回值 | 说明 |
|------|------|--------|------|
| `init(storageKey?)` | `string` | `void` | 初始化（加载存储的语言） |
| `loadLanguageFromStorage(key?)` | `string` | `Language \| null` | 从 localStorage 加载 |
| `saveLanguageToStorage(lang, key?)` | `Language`, `string` | `void` | 保存到 localStorage |
| `detectBrowserLanguage()` | - | `Language` | 检测浏览器语言 |

---

## 🎯 最佳实践

### 1. 使用常量定义翻译键

```typescript
// i18n-keys.ts
export const KEYS = {
  COMMON: {
    LOADING: 'common.loading',
    ERROR: 'common.error',
    SUCCESS: 'common.success',
  },
  MESSAGES: {
    WELCOME: 'messages.welcome',
    CONFIRM_DELETE: 'messages.confirmDelete',
  },
} as const;

// 使用
intl.t(KEYS.COMMON.LOADING);
```

### 2. 懒加载翻译文件

```typescript
// 按需加载语言包
async function loadLanguage(lang: Language) {
  const module = await import(`../locales/${lang}.ts`);
  return module.default;
}
```

### 3. 处理缺失的翻译

```typescript
// 提供 fallback
function safeT(key: string, fallback: string) {
  const result = intl.t(key);
  return result === key ? fallback : result;
}
```

### 4. 性能优化

```typescript
// 缓存翻译结果
const translationCache = new Map<string, string>();

function cachedT(key: string): string {
  if (translationCache.has(key)) {
    return translationCache.get(key)!;
  }
  const result = intl.t(key);
  translationCache.set(key, result);
  return result;
}
```

---

## 🐛 故障排查

### 翻译键不存在

**问题**: 控制台警告 `Translation key not found: xxx`

**解决**: 
1. 检查键路径是否正确（使用点号分隔）
2. 确保翻译文件中定义了该键
3. 检查 fallback language 是否有该键

### 日期格式不正确

**问题**: 日期格式不符合预期

**解决**:
1. 检查 `locale` 参数是否正确
2. 使用 `style` 选项选择预设样式
3. 直接传递 `Intl.DateTimeFormatOptions` 自定义格式

### 复数规则不生效

**问题**: 复数形式总是返回 `other`

**解决**:
1. 确保提供了 `other` 字段（必需）
2. 检查语言是否支持该复数类别
3. 中文/日语等语言复数规则较简单，主要依赖 `other`

---

## 📄 许可证

MIT © AxonClaw

---

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

### 添加新语言

1. 在 `translations` 对象中添加新语言
2. 更新 `Language` 类型
3. 更新 `localeMap` 映射
4. 添加翻译内容

### 添加新翻译键

1. 在所有语言文件中添加相同的键
2. 更新 `Translation` 接口类型定义

---

**最后更新:** 2026-03-13  
**版本:** 1.0.0
