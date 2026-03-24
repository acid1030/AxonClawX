/**
 * Intl Utils Skill - 使用示例
 * 
 * 本文件展示 intl-utils-skill 的完整使用方法
 */

import intl, { IntlUtils, Language } from './intl-utils-skill';

// ============================================================================
// 示例 1: 基础翻译
// ============================================================================

function example1_basicTranslation() {
  console.log('\n=== 示例 1: 基础翻译 ===\n');

  // 使用默认语言（中文）
  console.log('中文:', intl.t('common.loading'));
  // 输出：加载中...

  // 切换语言
  intl.setLanguage('en');
  console.log('English:', intl.t('common.loading'));
  // 输出：Loading...

  // 临时指定语言（不改变当前语言）
  console.log('日本語:', intl.t('common.loading', 'ja'));
  // 输出：読み込み中...

  // 获取当前语言
  console.log('当前语言:', intl.getLanguage());
  // 输出：en

  // 获取支持的語言列表
  console.log('支持的语言:', intl.getSupportedLanguages());
  // 输出：['zh', 'en', 'ja', 'ko', 'fr', 'de', 'es']
}

// ============================================================================
// 示例 2: 带插值的翻译
// ============================================================================

function example2_interpolation() {
  console.log('\n=== 示例 2: 带插值的翻译 ===\n');

  // 假设翻译文本为："Hello, {name}!"
  intl.setLanguage('en');
  const greeting = intl.tInterpolate('messages.greeting', { 
    name: 'Axon' 
  });
  console.log(greeting);
  // 输出：Hello, Axon!

  // 多个参数
  const message = intl.tInterpolate('messages.notification', {
    user: '张三',
    count: '5',
    action: '新消息'
  });
  console.log(message);
}

// ============================================================================
// 示例 3: 日期格式化
// ============================================================================

function example3_dateFormatting() {
  console.log('\n=== 示例 3: 日期格式化 ===\n');

  intl.setLanguage('zh');
  const now = new Date();

  // 基础格式
  console.log('基础日期:', intl.formatDate(now));
  // 输出：2026 年 3 月 13 日

  // 不同样式
  console.log('简短样式:', intl.formatDate(now, { style: 'short' }));
  // 输出：26/03/13

  console.log('中等样式:', intl.formatDate(now, { style: 'medium' }));
  // 输出：2026 年 3 月 13 日

  console.log('长样式:', intl.formatDate(now, { style: 'long' }));
  // 输出：2026 年 3 月 13 日 星期五

  // 切换语言
  intl.setLanguage('en');
  console.log('English:', intl.formatDate(now, { dateStyle: 'full' }));
  // 输出：Friday, March 13, 2026

  intl.setLanguage('ja');
  console.log('日本語:', intl.formatDate(now));
  // 输出：2026 年 3 月 13 日

  intl.setLanguage('de');
  console.log('Deutsch:', intl.formatDate(now));
  // 输出：13. März 2026
}

// ============================================================================
// 示例 4: 时间格式化
// ============================================================================

function example4_timeFormatting() {
  console.log('\n=== 示例 4: 时间格式化 ===\n');

  intl.setLanguage('zh');
  const now = new Date();

  // 基础时间
  console.log('基础时间:', intl.formatTime(now));
  // 输出：18:24

  // 不同样式
  console.log('包含秒:', intl.formatTime(now, { style: 'medium' }));
  // 输出：18:24:35

  console.log('包含时区:', intl.formatTime(now, { style: 'long' }));
  // 输出：18:24:35 中国标准时间
}

// ============================================================================
// 示例 5: 相对时间
// ============================================================================

function example5_relativeTime() {
  console.log('\n=== 示例 5: 相对时间 ===\n');

  intl.setLanguage('zh');

  // 过去的时间
  console.log('1 分钟前:', intl.formatRelativeTime(Date.now() - 60000));
  // 输出：1 分钟前

  console.log('30 分钟前:', intl.formatRelativeTime(Date.now() - 1800000));
  // 输出：30 分钟前

  console.log('2 小时前:', intl.formatRelativeTime(Date.now() - 7200000));
  // 输出：2 小时前

  console.log('3 天前:', intl.formatRelativeTime(Date.now() - 259200000));
  // 输出：3 天前

  // 未来的时间
  console.log('2 天后:', intl.formatRelativeTime(Date.now() + 172800000));
  // 输出：2 天后

  // 英语
  intl.setLanguage('en');
  console.log('English - 1 hour ago:', intl.formatRelativeTime(Date.now() - 3600000));
  // 输出：1 hour ago

  console.log('English - 2 days ago:', intl.formatRelativeTime(Date.now() - 172800000));
  // 输出：2 days ago
}

// ============================================================================
// 示例 6: 数字格式化
// ============================================================================

function example6_numberFormatting() {
  console.log('\n=== 示例 6: 数字格式化 ===\n');

  intl.setLanguage('zh');

  // 基础数字
  console.log('基础数字:', intl.formatNumber(1234567.89));
  // 输出：1,234,567.89

  // 不同语言
  intl.setLanguage('de');
  console.log('德语:', intl.formatNumber(1234567.89));
  // 输出：1.234.567,89

  intl.setLanguage('fr');
  console.log('法语:', intl.formatNumber(1234567.89));
  // 输出：1 234 567,89

  // 自定义选项
  intl.setLanguage('zh');
  console.log('无小数:', intl.formatNumber(1234567.89, { maximumFractionDigits: 0 }));
  // 输出：1,234,568

  console.log('4 位小数:', intl.formatNumber(1234567.89, { minimumFractionDigits: 4 }));
  // 输出：1,234,567.8900
}

// ============================================================================
// 示例 7: 货币格式化
// ============================================================================

function example7_currencyFormatting() {
  console.log('\n=== 示例 7: 货币格式化 ===\n');

  intl.setLanguage('zh');

  // 不同货币
  console.log('USD:', intl.formatCurrency(1234.56, 'USD'));
  // 输出：$1,234.56

  console.log('EUR:', intl.formatCurrency(1234.56, 'EUR'));
  // 输出：€1,234.56

  console.log('CNY:', intl.formatCurrency(1234.56, 'CNY'));
  // 输出：¥1,234.56

  console.log('JPY:', intl.formatCurrency(1234, 'JPY'));
  // 输出：¥1,234

  // 不同语言
  intl.setLanguage('de');
  console.log('EUR (德语):', intl.formatCurrency(1234.56, 'EUR', { locale: 'de' }));
  // 输出：1.234,56 €
}

// ============================================================================
// 示例 8: 百分比格式化
// ============================================================================

function example8_percentFormatting() {
  console.log('\n=== 示例 8: 百分比格式化 ===\n');

  intl.setLanguage('zh');

  console.log('基础百分比:', intl.formatPercent(0.75));
  // 输出：75%

  console.log('2 位小数:', intl.formatPercent(0.1234, { minimumFractionDigits: 2 }));
  // 输出：12.34%

  console.log('高精度:', intl.formatPercent(0.123456));
  // 输出：12%
}

// ============================================================================
// 示例 9: 文件大小格式化
// ============================================================================

function example9_fileSizeFormatting() {
  console.log('\n=== 示例 9: 文件大小格式化 ===\n');

  intl.setLanguage('zh');

  console.log('字节:', intl.formatFileSize(500));
  // 输出：500 字节

  console.log('KB:', intl.formatFileSize(1024));
  // 输出：1 KB

  console.log('MB:', intl.formatFileSize(1536000));
  // 输出：1.5 MB

  console.log('GB:', intl.formatFileSize(1073741824));
  // 输出：1 GB

  console.log('TB:', intl.formatFileSize(1099511627776));
  // 输出：1 TB

  // 英语
  intl.setLanguage('en');
  console.log('English:', intl.formatFileSize(1536000));
  // 输出：1.5 MB
}

// ============================================================================
// 示例 10: 复数规则
// ============================================================================

function example10_pluralRules() {
  console.log('\n=== 示例 10: 复数规则 ===\n');

  intl.setLanguage('en');

  // 基础复数
  console.log('1 item:', intl.plural(1, { one: 'item', other: 'items' }));
  // 输出：item

  console.log('5 items:', intl.plural(5, { one: 'item', other: 'items' }));
  // 输出：items

  console.log('0 items:', intl.plural(0, { zero: 'no items', one: 'item', other: 'items' }));
  // 输出：no items

  console.log('2 items:', intl.plural(2, { 
    one: 'item', 
    other: 'items' 
  }));
  // 输出：items

  // 复杂复数（阿拉伯语等有更多复数类别）
  console.log('复杂复数:', intl.plural(100, {
    zero: 'none',
    one: 'one',
    two: 'two',
    few: 'few',
    many: 'many',
    other: 'other'
  }));
  // 输出：other
}

// ============================================================================
// 示例 11: 复数翻译
// ============================================================================

function example11_pluralTranslation() {
  console.log('\n=== 示例 11: 复数翻译 ===\n');

  intl.setLanguage('en');

  // 假设翻译文件中有以下键：
  // messages.items.zero: "No items"
  // messages.items.one: "{count} item"
  // messages.items.other: "{count} items"

  console.log(intl.pluralT('messages.items', 0, { count: 0 }));
  // 输出：No items

  console.log(intl.pluralT('messages.items', 1, { count: 1 }));
  // 输出：1 item

  console.log(intl.pluralT('messages.items', 5, { count: 5 }));
  // 输出：5 items

  // 中文（复数规则较简单）
  intl.setLanguage('zh');
  console.log(intl.pluralT('messages.items', 1, { count: 1 }));
  // 输出：1 个项目

  console.log(intl.pluralT('messages.items', 5, { count: 5 }));
  // 输出：5 个项目
}

// ============================================================================
// 示例 12: 自定义实例
// ============================================================================

function example12_customInstance() {
  console.log('\n=== 示例 12: 自定义实例 ===\n');

  // 创建自定义实例
  const customIntl = new IntlUtils({
    defaultLanguage: 'ja',
    fallbackLanguage: 'en',
    supportedLanguages: ['ja', 'en', 'zh']
  });

  console.log('默认语言:', customIntl.getLanguage());
  // 输出：ja

  console.log('日语翻译:', customIntl.t('common.loading'));
  // 输出：読み込み中...

  // 只使用自定义实例，不影响全局 intl 对象
  console.log('全局默认语言:', intl.getLanguage());
}

// ============================================================================
// 示例 13: 持久化语言偏好
// ============================================================================

function example13_persistence() {
  console.log('\n=== 示例 13: 持久化语言偏好 ===\n');

  // 注意：这些方法在浏览器环境中工作
  // 在 Node.js 中会静默失败

  // 保存语言偏好
  intl.saveLanguageToStorage('en');
  console.log('已保存语言偏好：en');

  // 加载语言偏好
  const storedLang = intl.loadLanguageFromStorage();
  if (storedLang) {
    console.log('加载的语言偏好:', storedLang);
    intl.setLanguage(storedLang);
  }

  // 初始化（自动加载存储的语言）
  intl.init();
  console.log('初始化后的语言:', intl.getLanguage());
}

// ============================================================================
// 示例 14: 浏览器语言检测
// ============================================================================

function example14_browserDetection() {
  console.log('\n=== 示例 14: 浏览器语言检测 ===\n');

  // 注意：在 Node.js 环境中会返回默认语言
  const detectedLang = intl.detectBrowserLanguage();
  console.log('检测到的浏览器语言:', detectedLang);

  // 自动设置
  intl.setLanguage(detectedLang);
  console.log('当前语言:', intl.getLanguage());
}

// ============================================================================
// 示例 15: 综合应用 - 商品列表
// ============================================================================

function example15_comprehensive() {
  console.log('\n=== 示例 15: 综合应用 - 商品列表 ===\n');

  intl.setLanguage('zh');

  // 模拟商品数据
  const products = [
    { name: '商品 A', price: 1234.56, stock: 1, reviews: 0 },
    { name: '商品 B', price: 2345.67, stock: 5, reviews: 1 },
    { name: '商品 C', price: 3456.78, stock: 100, reviews: 125 },
  ];

  products.forEach((product, index) => {
    console.log(`\n--- 商品 ${index + 1} ---`);
    console.log('名称:', product.name);
    console.log('价格:', intl.formatCurrency(product.price, 'CNY'));
    console.log('库存:', intl.plural(product.stock, {
      zero: '无库存',
      one: '{count} 件',
      other: '{count} 件'
    }).replace('{count}', String(product.stock)));
    console.log('评论:', intl.plural(product.reviews, {
      zero: '暂无评论',
      one: '{count} 条评论',
      other: '{count} 条评论'
    }).replace('{count}', String(product.reviews)));
    console.log('上架时间:', intl.formatRelativeTime(Date.now() - (index + 1) * 86400000));
  });

  // 切换语言
  console.log('\n\n--- Switch to English ---\n');
  intl.setLanguage('en');

  products.forEach((product, index) => {
    console.log(`\n--- Product ${index + 1} ---`);
    console.log('Name:', product.name);
    console.log('Price:', intl.formatCurrency(product.price, 'USD'));
    console.log('Stock:', intl.plural(product.stock, {
      zero: 'Out of stock',
      one: '{count} item',
      other: '{count} items'
    }).replace('{count}', String(product.stock)));
    console.log('Reviews:', intl.plural(product.reviews, {
      zero: 'No reviews',
      one: '{count} review',
      other: '{count} reviews'
    }).replace('{count}', String(product.reviews)));
    console.log('Listed:', intl.formatRelativeTime(Date.now() - (index + 1) * 86400000));
  });
}

// ============================================================================
// 运行所有示例
// ============================================================================

function runAllExamples() {
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║       Intl Utils Skill - 完整使用示例                     ║');
  console.log('╚══════════════════════════════════════════════════════════╝');

  example1_basicTranslation();
  example2_interpolation();
  example3_dateFormatting();
  example4_timeFormatting();
  example5_relativeTime();
  example6_numberFormatting();
  example7_currencyFormatting();
  example8_percentFormatting();
  example9_fileSizeFormatting();
  example10_pluralRules();
  example11_pluralTranslation();
  example12_customInstance();
  // example13_persistence(); // 需要浏览器环境
  // example14_browserDetection(); // 需要浏览器环境
  example15_comprehensive();

  console.log('\n\n╔══════════════════════════════════════════════════════════╗');
  console.log('║                    所有示例运行完成！                      ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');
}

// 导出所有示例函数
export {
  example1_basicTranslation,
  example2_interpolation,
  example3_dateFormatting,
  example4_timeFormatting,
  example5_relativeTime,
  example6_numberFormatting,
  example7_currencyFormatting,
  example8_percentFormatting,
  example9_fileSizeFormatting,
  example10_pluralRules,
  example11_pluralTranslation,
  example12_customInstance,
  example13_persistence,
  example14_browserDetection,
  example15_comprehensive,
  runAllExamples,
};

// 如果直接运行此文件，执行所有示例
if (require.main === module) {
  runAllExamples();
}

export default runAllExamples;
