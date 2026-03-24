# HTML Parser Skill - 使用示例

**模块:** ACE (Axon Core Engine)  
**版本:** 1.0.0  
**作者:** Axon

---

## 📦 导入方式

```typescript
// 导入整个类
import HTMLParser, { parseHTML, queryHTML, extractText, extractAttribute } from '@/skills/html-parser-skill';

// 或导入特定函数
import { parseHTML, queryHTML } from '@/skills/html-parser-skill';
```

---

## 🔧 基础用法

### 1. 解析 HTML

```typescript
import { parseHTML } from '@/skills/html-parser-skill';

const html = `
  <html>
    <body>
      <h1 id="title">Hello World</h1>
      <p class="content">这是一段文本</p>
      <div class="content">另一个内容块</div>
    </body>
  </html>
`;

// 创建解析器
const parser = parseHTML(html);

// 或使用自定义配置
const parserWithOptions = parseHTML(html, {
  keepComments: false,
  keepWhitespace: false,
  autoFix: true,
});
```

### 2. CSS 选择器查询

```typescript
// 查询所有匹配的元素
const result = parser.querySelectorAll('.content');
console.log(`找到 ${result.count} 个元素`);

// 遍历结果
result.nodes.forEach(node => {
  console.log('标签:', node.tagName);
  console.log('属性:', node.attributes);
});

// 查询单个元素
const title = parser.querySelector('#title');
if (title) {
  console.log('标题:', title.textContent);
}
```

### 3. 数据提取

```typescript
// 提取文本
const texts = parser.extract('.content', { text: true });
texts.forEach(item => {
  console.log(item.text); // "这是一段文本", "另一个内容块"
});

// 提取 HTML
const htmlContent = parser.extract('.content', { html: true });
console.log(htmlContent[0].html);

// 提取属性
const attrs = parser.extract('a', { attributes: ['href', 'title'] });
attrs.forEach(item => {
  console.log('链接:', item.attributes?.href);
  console.log('标题:', item.attributes?.title);
});

// 提取所有属性
const allAttrs = parser.extract('img', { allAttributes: true });
```

---

## 🎯 高级用法

### 4. 提取表格数据

```typescript
const html = `
  <table>
    <thead>
      <tr>
        <th>姓名</th>
        <th>年龄</th>
        <th>城市</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>张三</td>
        <td>25</td>
        <td>北京</td>
      </tr>
      <tr>
        <td>李四</td>
        <td>30</td>
        <td>上海</td>
      </tr>
    </tbody>
  </table>
`;

const parser = parseHTML(html);
const tableData = parser.extractTable();

console.log('表头:', tableData.headers); 
// ['姓名', '年龄', '城市']

console.log('数据行:', tableData.rows);
// [['张三', '25', '北京'], ['李四', '30', '上海']]

console.log('结构化数据:', tableData.data);
// [
//   { 姓名: '张三', 年龄: '25', 城市: '北京' },
//   { 姓名: '李四', 年龄: '30', 城市: '上海' }
// ]
```

### 5. 提取链接

```typescript
const html = `
  <div>
    <a href="https://example.com">Example</a>
    <a href="/about">关于我们</a>
    <a href="https://github.com" title="GitHub">GitHub</a>
  </div>
`;

const parser = parseHTML(html);
const links = parser.extractLinks('a', 'https://example.com');

links.forEach(link => {
  console.log('文本:', link.text);
  console.log('地址:', link.href);
  console.log('标题:', link.title);
  console.log('外部链接:', link.isExternal);
});

// 输出:
// 文本: Example, 地址: https://example.com, 外部链接: false
// 文本: 关于我们，地址: /about, 外部链接: false
// 文本: GitHub, 地址: https://github.com, 外部链接: true
```

### 6. 提取图片

```typescript
const html = `
  <div>
    <img src="/logo.png" alt="Logo" width="100" height="50">
    <img src="https://cdn.example.com/banner.jpg" alt="Banner" title="Banner Image">
  </div>
`;

const parser = parseHTML(html);
const images = parser.extractImages();

images.forEach(img => {
  console.log('地址:', img.src);
  console.log('替代文本:', img.alt);
  console.log('标题:', img.title);
  console.log('尺寸:', `${img.width}x${img.height}`);
});
```

### 7. 复杂 CSS 选择器

```typescript
const html = `
  <div class="container">
    <ul class="list">
      <li class="item active" data-id="1">项目 1</li>
      <li class="item" data-id="2">项目 2</li>
      <li class="item" data-id="3">项目 3</li>
    </ul>
  </div>
`;

const parser = parseHTML(html);

// 类选择器
const items = parser.querySelectorAll('.item');

// ID 选择器
const element = parser.querySelector('#unique-id');

// 属性选择器
const activeItems = parser.querySelectorAll('[data-id]');
const firstItem = parser.querySelectorAll('[data-id="1"]');

// 属性包含选择器
const itemsWithData = parser.querySelectorAll('[class*="item"]');

// 组合选择器 (逗号分隔)
const multiple = parser.querySelectorAll('.item, .container');
```

### 8. 便捷函数

```typescript
import { queryHTML, extractText, extractAttribute } from '@/skills/html-parser-skill';

const html = `...`;

// 快速查询
const result = queryHTML(html, '.content');
console.log(`找到 ${result.count} 个元素`);

// 快速提取文本
const texts = extractText(html, 'h1');
console.log(texts); // ['Hello World']

// 快速提取属性
const hrefs = extractAttribute(html, 'a', 'href');
console.log(hrefs); // ['https://example.com', '/about']
```

---

## 📊 实战场景

### 场景 1: 爬取新闻列表

```typescript
const html = await fetchNewsPage();
const parser = parseHTML(html);

const newsItems = parser.extract('.news-item', {
  text: true,
  attributes: ['data-id', 'data-category'],
  includeChildren: true,
});

newsItems.forEach(item => {
  console.log('ID:', item.attributes?.['data-id']);
  console.log('分类:', item.attributes?.['data-category']);
  console.log('标题:', item.text);
});
```

### 场景 2: 提取产品价格

```typescript
const html = await fetchProductPage();
const parser = parseHTML(html);

const prices = parser.extract('.price', { text: true });
const originalPrices = parser.extract('.original-price', { text: true });
const discountRates = parser.extract('.discount', { text: true });

console.log('当前价格:', prices[0].text);
console.log('原价:', originalPrices[0].text);
console.log('折扣:', discountRates[0].text);
```

### 场景 3: 分析页面结构

```typescript
const html = await fetchPage();
const parser = parseHTML(html);

// 提取所有链接
const allLinks = parser.extractLinks();
const externalLinks = allLinks.filter(link => link.isExternal);
const internalLinks = allLinks.filter(link => !link.isExternal);

console.log('总链接数:', allLinks.length);
console.log('外部链接:', externalLinks.length);
console.log('内部链接:', internalLinks.length);

// 提取所有图片
const allImages = parser.extractImages();
console.log('图片总数:', allImages.length);

// 提取所有标题
const headings = extractText(html, 'h1, h2, h3, h4, h5, h6');
console.log('标题结构:', headings);
```

---

## ⚠️ 注意事项

1. **性能考虑**: 对于大型 HTML 文档，建议只查询需要的部分
2. **选择器限制**: 当前实现支持基础 CSS 选择器，复杂选择器 (如 `:nth-child`, `:has()`) 暂不支持
3. **HTML 容错**: 启用 `autoFix: true` 可自动修复不规范的 HTML
4. **编码**: 默认使用 UTF-8 编码，其他编码需自行转换

---

## 🚀 性能提示

```typescript
// ✅ 推荐：直接查询目标元素
const items = parser.querySelectorAll('.product-item');

// ❌ 不推荐：先查询所有元素再过滤
const all = parser.querySelectorAll('*');
const items = all.nodes.filter(n => n.attributes?.class?.includes('product-item'));
```

---

**最后更新:** 2026-03-13  
**维护者:** Axon
