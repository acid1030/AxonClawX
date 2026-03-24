# Slug Utils 技能文档

**文件位置:** `src/skills/slug-utils-skill.ts`  
**使用示例:** `src/skills/slug-utils-skill.examples.ts`

---

## 📋 功能概述

Slug Utils 是一个强大的 URL Slug 生成工具，提供以下核心功能:

1. **Slug 生成** - 将任意文本转换为 URL 友好的 slug
2. **多语言支持** - 支持中文、英文、日文、韩文等
3. **唯一性保证** - 通过计数器确保生成的 slug 唯一

---

## 🚀 快速开始

### 基础用法

```typescript
import { generateSlug } from './slug-utils-skill';

// 英文
generateSlug('Hello World!'); // 'hello-world'

// 中文
generateSlug('你好世界'); // 'ni-hao-shi-jie'

// 日文
generateSlug('日本語テスト'); // 'ji-ben-yu-tesuto'

// 韩文
generateSlug('한국어 테스트'); // 'han-gug-eo-tesuteu'
```

### 唯一性保证

```typescript
import { SlugGenerator } from './slug-utils-skill';

const generator = new SlugGenerator();

generator.generateUnique('Hello World'); // 'hello-world'
generator.generateUnique('Hello World'); // 'hello-world-1'
generator.generateUnique('Hello World'); // 'hello-world-2'
```

---

## 📖 API 参考

### generateSlug(text, options?)

生成单个 slug

**参数:**
- `text: string` - 要转换的文本
- `options?: object` - 配置选项
  - `maxLength?: number` - 最大长度 (默认 100)
  - `separator?: string` - 分隔符 (默认 '-')
  - `lowercase?: boolean` - 是否转小写 (默认 true)
  - `stopWords?: string[]` - 停用词列表

**返回:** `string` - 生成的 slug

**示例:**
```typescript
generateSlug('The Lord of the Rings', {
  maxLength: 20,
  separator: '_',
  stopWords: ['the', 'of'],
});
// 'lord_rings'
```

---

### generateSlugs(texts, options?)

批量生成 slugs

**参数:**
- `texts: string[]` - 文本数组
- `options?: object` - 配置选项 (同 generateSlug)

**返回:** `string[]` - Slugs 数组

**示例:**
```typescript
generateSlugs(['First', 'Second', 'Third']);
// ['first', 'second', 'third']
```

---

### SlugGenerator 类

带唯一性保证的 slug 生成器

#### 构造函数

```typescript
const generator = new SlugGenerator();
```

#### generateUnique(text, options?)

生成唯一的 slug

**参数:**
- `text: string` - 要转换的文本
- `options?: object` - 配置选项

**返回:** `string` - 唯一的 slug

**示例:**
```typescript
const generator = new SlugGenerator();
generator.generateUnique('Blog Post'); // 'blog-post'
generator.generateUnique('Blog Post'); // 'blog-post-1'
```

#### generateUniqueBatch(texts, options?)

批量生成唯一 slugs

**返回:** `string[]` - 唯一 slugs 数组

#### isUsed(slug)

检查 slug 是否已被使用

**返回:** `boolean`

#### markAsUsed(slug)

标记 slug 为已使用

#### release(slug)

释放 slug (标记为未使用)

#### reset()

重置生成器 (清空所有记录)

#### getCount()

获取已使用的 slugs 数量

**返回:** `number`

#### getAll()

获取所有已使用的 slugs

**返回:** `string[]`

---

### createSlugGenerator(existingSlugs?)

从现有 slugs 创建生成器

**参数:**
- `existingSlugs?: string[]` - 已存在的 slugs 数组

**返回:** `SlugGenerator` 实例

**示例:**
```typescript
const existingSlugs = ['hello-world', 'test-slug'];
const generator = createSlugGenerator(existingSlugs);
generator.generateUnique('Hello World'); // 'hello-world-1'
```

---

### validateSlug(slug, options?)

验证 slug 是否合法

**参数:**
- `slug: string` - 要验证的 slug
- `options?: object` - 验证选项
  - `maxLength?: number` - 最大长度
  - `allowNumbers?: boolean` - 是否允许数字 (默认 true)
  - `allowSeparator?: boolean` - 是否允许分隔符 (默认 true)
  - `separator?: string` - 分隔符

**返回:** `boolean` - 是否合法

**示例:**
```typescript
validateSlug('hello-world'); // true
validateSlug('HELLO-WORLD'); // false (大写)
validateSlug('hello--world'); // false (连续分隔符)
```

---

### fixSlug(slug, options?)

修复不合法的 slug

**参数:**
- `slug: string` - 要修复的 slug
- `options?: object` - 配置选项
  - `maxLength?: number` - 最大长度
  - `separator?: string` - 分隔符

**返回:** `string` - 修复后的 slug

**示例:**
```typescript
fixSlug('Hello World!!!'); // 'hello-world'
fixSlug('hello--world'); // 'hello-world'
fixSlug('-hello-world-'); // 'hello-world'
```

---

### generateSlugWithTimestamp(text, options?)

生成带时间戳的 slug (保证唯一性)

**参数:**
- `text: string` - 要转换的文本
- `options?: object` - 配置选项
  - `maxLength?: number` - 最大长度
  - `separator?: string` - 分隔符
  - `timestampFormat?: 'date' | 'datetime' | 'unix'` - 时间戳格式

**返回:** `string` - 带时间戳的 slug

**示例:**
```typescript
generateSlugWithTimestamp('Blog Post');
// 'blog-post-2024-03-13'

generateSlugWithTimestamp('Blog Post', { timestampFormat: 'unix' });
// 'blog-post-1710324600000'
```

---

### detectLanguage(text)

检测字符串中的主要语言

**参数:**
- `text: string` - 输入字符串

**返回:** `string` - 语言代码 ('zh' | 'ja' | 'ko' | 'en')

**示例:**
```typescript
detectLanguage('你好'); // 'zh'
detectLanguage('日本語'); // 'ja'
detectLanguage('한국어'); // 'ko'
detectLanguage('Hello'); // 'en'
```

---

## 🌍 多语言支持

### 中文 (拼音转换)

```typescript
generateSlug('北京天安门'); // 'bei-jing-tian-an-men'
generateSlug('你好世界'); // 'ni-hao-shi-jie'
```

### 日文 (罗马音转换)

```typescript
generateSlug('日本語'); // 'ji-ben-yu'
generateSlug('テスト'); // 'tesuto'
```

### 韩文 (罗马音转换)

```typescript
generateSlug('한국어'); // 'han-gug-eo'
```

### 英文 (重音符号移除)

```typescript
generateSlug('Café résumé'); // 'cafe-resume'
generateSlug('Naïve coöperate'); // 'naive-cooperate'
```

---

## 💡 使用场景

### 1. 博客文章 URL

```typescript
const blogGenerator = new SlugGenerator();

const posts = [
  { title: 'React Hooks 完全指南', date: '2024-03-13' },
  { title: 'TypeScript 高级技巧', date: '2024-03-14' },
];

posts.forEach(post => {
  const slug = blogGenerator.generateUnique(post.title);
  console.log(`/blog/${slug}`);
});
```

### 2. 电商产品页面

```typescript
const products = [
  'iPhone 15 Pro Max',
  'MacBook Pro 14"',
  'AirPods Pro (2nd Gen)',
];

products.forEach(product => {
  const slug = generateSlug(product, { maxLength: 40 });
  console.log(`/products/${slug}`);
});
```

### 3. 分类标签系统

```typescript
const categoryGenerator = new SlugGenerator();

const categories = ['科技', '生活', '旅行', '美食'];

categories.forEach(cat => {
  const slug = categoryGenerator.generateUnique(cat);
  console.log(`/category/${slug}`);
});
```

### 4. 文件命名

```typescript
const fileName = generateSlugWithTimestamp('项目报告', {
  separator: '_',
  timestampFormat: 'date',
});
// 'xiang-mu-bao-gao_2024-03-13'
```

---

## ⚠️ 注意事项

### 1. 拼音映射限制

当前版本的中文拼音映射是简化版，仅包含常用汉字。对于完整支持，建议集成专业拼音库:

```bash
npm install pinyin
```

### 2. 性能考虑

- 对于大量 slug 生成，使用 `SlugGenerator` 类更高效
- 避免频繁创建新的生成器实例
- 使用 `generateUniqueBatch` 进行批量操作

### 3. SEO 最佳实践

- 使用语义化的分隔符 (`-` 优于 `_`)
- 保持 slug 简洁 (50-60 字符最佳)
- 移除停用词提高可读性
- 避免使用日期除非必要

---

## 🧪 测试

运行示例文件查看完整演示:

```bash
npx ts-node src/skills/slug-utils-skill.examples.ts
```

---

## 📝 更新日志

### v1.0.0 (2024-03-13)
- ✅ 基础 slug 生成功能
- ✅ 多语言支持 (中文/日文/韩文/英文)
- ✅ 唯一性保证 (SlugGenerator 类)
- ✅ 验证与修复功能
- ✅ 时间戳 slug 生成
- ✅ 批量处理支持

---

## 📄 许可证

MIT License

---

**维护者:** KAEL  
**最后更新:** 2024-03-13
