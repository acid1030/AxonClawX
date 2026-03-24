/**
 * Slug Utils 使用示例
 * 
 * 演示如何使用 slug-utils-skill.ts 中的各种功能
 */

import {
  generateSlug,
  generateSlugs,
  SlugGenerator,
  createSlugGenerator,
  validateSlug,
  fixSlug,
  generateSlugWithTimestamp,
  detectLanguage,
} from './slug-utils-skill';

// ==================== 基础用法 ====================

console.log('=== 基础 Slug 生成 ===');

// 英文文本
console.log(generateSlug('Hello World!'));
// 输出: 'hello-world'

console.log(generateSlug('The Quick Brown Fox Jumps Over The Lazy Dog'));
// 输出: 'the-quick-brown-fox-jumps-over-the-lazy-dog'

// 中文文本
console.log(generateSlug('你好世界'));
// 输出: 'ni-hao-shi-jie'

console.log(generateSlug('北京天安门'));
// 输出: 'bei-jing-tian-an-men'

// 日文文本
console.log(generateSlug('日本語テスト'));
// 输出: 'ji-ben-yu-tesuto'

// 韩文文本
console.log(generateSlug('한국어 테스트'));
// 输出: 'han-gug-eo-tesuteu'

// 混合文本
console.log(generateSlug('Hello 世界！'));
// 输出: 'hello-shi-jie'

// ==================== 配置选项 ====================

console.log('\n=== 配置选项 ===');

// 自定义分隔符
console.log(generateSlug('Hello World', { separator: '_' }));
// 输出: 'hello_world'

console.log(generateSlug('Hello World', { separator: '.' }));
// 输出: 'hello.world'

// 限制长度
console.log(generateSlug('This is a very long title that should be truncated', { maxLength: 20 }));
// 输出: 'this-is-a-very-long'

// 保留大写
console.log(generateSlug('Hello World', { lowercase: false }));
// 输出: 'Hello-World'

// 移除停用词
console.log(generateSlug('The Lord of the Rings', {
  stopWords: ['the', 'of', 'a', 'an', 'and'],
}));
// 输出: 'lord-rings'

// ==================== 批量生成 ====================

console.log('\n=== 批量生成 ===');

const titles = [
  'First Article',
  'Second Article',
  'Third Article',
];

const slugs = generateSlugs(titles);
console.log(slugs);
// 输出: ['first-article', 'second-article', 'third-article']

// ==================== 唯一性保证 ====================

console.log('\n=== 唯一性保证 ===');

const generator = new SlugGenerator();

// 生成唯一 slug
console.log(generator.generateUnique('Hello World'));
// 输出: 'hello-world'

console.log(generator.generateUnique('Hello World'));
// 输出: 'hello-world-1'

console.log(generator.generateUnique('Hello World'));
// 输出: 'hello-world-2'

console.log(generator.generateUnique('Hello World'));
// 输出: 'hello-world-3'

// 从现有 slugs 创建生成器
console.log('\n--- 从现有 Slugs 创建 ---');

const existingSlugs = ['hello-world', 'hello-world-1', 'test-slug'];
const newGenerator = createSlugGenerator(existingSlugs);

console.log(newGenerator.generateUnique('Hello World'));
// 输出: 'hello-world-2' (跳过已存在的)

console.log(newGenerator.generateUnique('Test Slug'));
// 输出: 'test-slug-1'

console.log(newGenerator.generateUnique('New Title'));
// 输出: 'new-title'

// 检查 slug 是否已使用
console.log('\n--- 检查使用状态 ---');
console.log(newGenerator.isUsed('hello-world')); // true
console.log(newGenerator.isUsed('hello-world-2')); // true
console.log(newGenerator.isUsed('brand-new')); // false

// 释放 slug
newGenerator.release('hello-world');
console.log(newGenerator.isUsed('hello-world')); // false

// 获取统计信息
console.log('\n--- 统计信息 ---');
console.log('已使用数量:', newGenerator.getCount());
console.log('所有 Slugs:', newGenerator.getAll());

// ==================== 验证与修复 ====================

console.log('\n=== 验证与修复 ===');

// 验证合法 slug
console.log(validateSlug('hello-world')); // true
console.log(validateSlug('hello-world-123')); // true
console.log(validateSlug('HELLO-WORLD')); // false (大写)
console.log(validateSlug('hello--world')); // false (连续分隔符)
console.log(validateSlug('-hello-world')); // false (开头分隔符)
console.log(validateSlug('hello-world-')); // false (结尾分隔符)

// 自定义验证规则
console.log(validateSlug('hello_world', { separator: '_' })); // true
console.log(validateSlug('hello123', { allowNumbers: false })); // false

// 修复不合法的 slug
console.log(fixSlug('Hello World!!!'));
// 输出: 'hello-world'

console.log(fixSlug('hello--world'));
// 输出: 'hello-world'

console.log(fixSlug('-hello-world-'));
// 输出: 'hello-world'

console.log(fixSlug('Hello@World#2024'));
// 输出: 'hello-world-2024'

// ==================== 带时间戳的 Slug ====================

console.log('\n=== 带时间戳的 Slug ===');

console.log(generateSlugWithTimestamp('Blog Post'));
// 输出: 'blog-post-2024-03-13' (日期格式)

console.log(generateSlugWithTimestamp('Blog Post', { timestampFormat: 'datetime' }));
// 输出: 'blog-post-2024-03-13T10-30-00'

console.log(generateSlugWithTimestamp('Blog Post', { timestampFormat: 'unix' }));
// 输出: 'blog-post-1710324600000'

// ==================== 语言检测 ====================

console.log('\n=== 语言检测 ===');

console.log(detectLanguage('Hello World')); // 'en'
console.log(detectLanguage('你好世界')); // 'zh'
console.log(detectLanguage('日本語')); // 'ja'
console.log(detectLanguage('한국어')); // 'ko'
console.log(detectLanguage('Hello 世界')); // 'zh' (检测到中文)

// ==================== 实际应用场景 ====================

console.log('\n=== 实际应用场景 ===');

// 场景 1: 博客文章 URL
const blogPosts = [
  { title: 'React Hooks 完全指南', date: '2024-03-13' },
  { title: 'TypeScript 高级技巧', date: '2024-03-14' },
  { title: 'React Hooks 完全指南', date: '2024-03-15' }, // 重复标题
];

const blogGenerator = new SlugGenerator();
blogPosts.forEach(post => {
  const slug = blogGenerator.generateUnique(post.title, { maxLength: 50 });
  console.log(`${post.title} -> /blog/${slug}`);
});
// 输出:
// React Hooks 完全指南 -> /blog/react-hooks-wan-quan-zhi-nan
// TypeScript 高级技巧 -> /blog/type-script-gao-ji-ji-qiao
// React Hooks 完全指南 -> /blog/react-hooks-wan-quan-zhi-nan-1

// 场景 2: 产品页面 URL
const products = [
  'iPhone 15 Pro Max',
  'MacBook Pro 14"',
  'AirPods Pro (2nd Gen)',
];

products.forEach(product => {
  const slug = generateSlug(product, { maxLength: 40 });
  console.log(`${product} -> /products/${slug}`);
});
// 输出:
// iPhone 15 Pro Max -> /products/iphone-15-pro-max
// MacBook Pro 14" -> /products/macbook-pro-14
// AirPods Pro (2nd Gen) -> /products/airpods-pro-2nd-gen

// 场景 3: 分类标签
const categories = ['科技', '生活', '旅行', '美食', '科技']; // 重复

const categoryGenerator = new SlugGenerator();
categories.forEach(cat => {
  const slug = categoryGenerator.generateUnique(cat);
  console.log(`${cat} -> /category/${slug}`);
});
// 输出:
// 科技 -> /category/ke-ji
// 生活 -> /category/sheng-huo
// 旅行 -> /category/lv-xing
// 美食 -> /category/mei-shi
// 科技 -> /category/ke-ji-1

// ==================== 错误处理 ====================

console.log('\n=== 错误处理 ===');

// 空字符串
console.log(generateSlug('')); // 'untitled'
console.log(generateSlug(null as any)); // ''
console.log(generateSlug(undefined as any)); // ''

// 特殊字符
console.log(generateSlug('C++ Programming')); // 'c-programming'
console.log(generateSlug('Node.js Tutorial')); // 'nodejs-tutorial'
console.log(generateSlug('AI/ML Basics')); // 'aiml-basics'

// 表情符号
console.log(generateSlug('Hello 👋 World 🌍')); // 'hello-world'

// ==================== 性能提示 ====================

console.log('\n=== 性能提示 ===');

// 对于大量 slug 生成，使用 SlugGenerator 类比单独调用更高效
const largeGenerator = new SlugGenerator();
const largeDataset = Array.from({ length: 1000 }, (_, i) => `Article ${i}`);

console.time('批量生成');
const slugs2 = largeGenerator.generateUniqueBatch(largeDataset);
console.timeEnd('批量生成');
// 输出: 批量生成：X ms

console.log(`生成了 ${slugs2.length} 个唯一 slugs`);

// ==================== 最佳实践 ====================

console.log('\n=== 最佳实践 ===');

// 1. 始终使用唯一性生成器处理用户生成内容
const userContentGenerator = new SlugGenerator();

// 2. 为不同内容类型使用不同的生成器实例
const blogGenerator2 = new SlugGenerator();
const productGenerator = new SlugGenerator();
const categoryGenerator2 = new SlugGenerator();

// 3. 设置合理的最大长度 (推荐 50-100 字符)
const safeSlug = generateSlug('Very Long Title', { maxLength: 60 });

// 4. 使用语义化的分隔符 (推荐 '-' 或 '_')
const seoSlug = generateSlug('SEO Friendly Title', { separator: '-' });

// 5. 移除停用词以提高可读性
const cleanSlug = generateSlug('Introduction to the Art of Programming', {
  stopWords: ['the', 'to', 'of', 'a', 'an'],
});

console.log('SEO Slug:', seoSlug);
console.log('Clean Slug:', cleanSlug);
