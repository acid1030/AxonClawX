# HTML 工具技能 - 使用示例

**文件:** `src/skills/html-utils-skill.ts`  
**版本:** 1.0.0  
**作者:** Axon

---

## 📦 导入

```typescript
import HTMLUtils, {
  parseHTML,
  stringifyHTML,
  query,
  extractText,
  h,
  t,
  createHTMLDocument,
  type HTMLNode,
  type HTMLNodeType,
  type ExtractOptions
} from './src/skills/html-utils-skill';
```

---

## 1️⃣ HTML 解析

### 基础解析

```typescript
const html = `
<!DOCTYPE html>
<html>
  <head>
    <title>示例页面</title>
  </head>
  <body>
    <h1 id="main">欢迎访问</h1>
    <p class="intro">这是一个示例段落。</p>
    <ul>
      <li>项目 1</li>
      <li>项目 2</li>
      <li>项目 3</li>
    </ul>
  </body>
</html>
`;

// 解析为 DOM 树
const dom = parseHTML(html);

console.log(dom.type); // 'document'
console.log(dom.children.length); // 1 (html 元素)
```

### 解析结果结构

```typescript
// DOM 树结构示例
{
  type: 'document',
  children: [
    {
      type: 'element',
      tagName: 'html',
      attributes: {},
      children: [
        {
          type: 'element',
          tagName: 'head',
          children: [...]
        },
        {
          type: 'element',
          tagName: 'body',
          children: [...]
        }
      ]
    }
  ]
}
```

---

## 2️⃣ DOM 查询

### CSS 选择器查询

```typescript
// 查询所有 li 元素
const items = query(dom, 'li');
console.log(items.length); // 3

// 查询 ID 为 main 的元素
const mainElements = query(dom, '#main');
console.log(mainElements[0].textContent); // '欢迎访问'

// 查询 class 为 intro 的元素
const introElements = query(dom, '.intro');
console.log(introElements.length); // 1

// 查询所有段落
const paragraphs = query(dom, 'p');
```

### 遍历 DOM 树

```typescript
HTMLUtils.traverse(dom, (node, depth) => {
  if (node.type === 'element') {
    console.log(`${'  '.repeat(depth)}<${node.tagName}>`);
  }
});

// 输出:
// <html>
//   <head>
//     <title>
//   <body>
//     <h1>
//     <p>
//     <ul>
//       <li>
//       <li>
//       <li>
```

---

## 3️⃣ 数据提取

### 提取文本内容

```typescript
// 提取节点及其子节点的所有文本
const text = extractText(dom);
console.log(text);
// "欢迎访问 这是一个示例段落。 项目 1 项目 2 项目 3"

// 使用 extract 方法提取更详细的数据
const data = HTMLUtils.extract(dom, {
  text: true,
  html: false,
  allAttributes: true,
  includeChildren: true,
  trim: true
});

console.log(data);
// {
//   text: "...",
//   children: [...]
// }
```

### 提取表格数据

```typescript
const tableHTML = `
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

const tableDom = parseHTML(tableHTML);
const tableData = HTMLUtils.extractTable(tableDom);

console.log(tableData?.headers); // ['姓名', '年龄', '城市']
console.log(tableData?.rows);    // [['张三', '25', '北京'], ['李四', '30', '上海']]
console.log(tableData?.data);
// [
//   { 姓名：'张三', 年龄：'25', 城市：'北京' },
//   { 姓名：'李四', 年龄：'30', 城市：'上海' }
// ]
```

### 提取链接

```typescript
const linksHTML = `
<div>
  <a href="https://example.com" title="示例网站">访问示例</a>
  <a href="https://google.com">Google</a>
</div>
`;

const linksDom = parseHTML(linksHTML);
const links = HTMLUtils.extractLinks(linksDom);

console.log(links);
// [
//   { text: '访问示例', href: 'https://example.com', title: '示例网站' },
//   { text: 'Google', href: 'https://google.com' }
// ]
```

### 提取图片

```typescript
const imagesHTML = `
<div>
  <img src="/logo.png" alt="Logo" title="网站 Logo">
  <img src="/banner.jpg" alt="Banner">
</div>
`;

const imagesDom = parseHTML(imagesHTML);
const images = HTMLUtils.extractImages(imagesDom);

console.log(images);
// [
//   { src: '/logo.png', alt: 'Logo', title: '网站 Logo' },
//   { src: '/banner.jpg', alt: 'Banner' }
// ]
```

---

## 4️⃣ DOM 操作

### 创建元素

```typescript
// 创建 div 元素
const div = HTMLUtils.createElement('div', {
  id: 'container',
  class: 'main-content'
});

// 创建文本节点
const text = HTMLUtils.createText('Hello World');

// 添加子节点
HTMLUtils.appendChild(div, text);

// 设置属性
HTMLUtils.setAttribute(div, 'data-role', 'main');

// 获取属性
const role = HTMLUtils.getAttribute(div, 'data-role'); // 'main'

// 移除属性
HTMLUtils.removeAttribute(div, 'data-role');
```

### 使用便捷函数创建

```typescript
// 使用 h() 和 t() 快速创建
const element = h('div', { class: 'card' }, [
  h('h2', {}, [t('标题')]),
  h('p', {}, [t('这是一个卡片内容')]),
  h('button', { class: 'btn' }, [t('点击')])
]);

const html = stringifyHTML(element, { pretty: true });
console.log(html);
// <div class="card">
//   <h2>标题</h2>
//   <p>这是一个卡片内容</p>
//   <button class="btn">点击</button>
// </div>
```

### 移除子节点

```typescript
const parent = h('ul', {}, [
  h('li', {}, [t('项目 1')]),
  h('li', {}, [t('项目 2')]),
  h('li', {}, [t('项目 3')])
]);

const secondItem = parent.children[1];
const result = HTMLUtils.removeChild(parent, secondItem);

console.log(result.success); // true
console.log(parent.children.length); // 2
```

### 查找父节点

```typescript
const li = h('li', {}, [t('项目')]);
const ul = h('ul', {}, [li]);
const div = h('div', { class: 'container' }, [ul]);

HTMLUtils.appendChild(ul, li);
HTMLUtils.appendChild(div, ul);

const parentUl = HTMLUtils.findParent(li, 'ul');
console.log(parentUl?.tagName); // 'ul'

const parentDiv = HTMLUtils.findParent(li, '.container');
console.log(parentDiv?.tagName); // 'div'
```

---

## 5️⃣ HTML 生成

### 序列化 DOM

```typescript
const dom = h('div', { id: 'app' }, [
  h('h1', {}, [t('标题')]),
  h('p', { class: 'text' }, [t('内容')])
]);

// 紧凑格式
const compact = stringifyHTML(dom, { pretty: false });
// <div id="app"><h1>标题</h1><p class="text">内容</p></div>

// 格式化输出
const pretty = stringifyHTML(dom, {
  pretty: true,
  indent: '  ',
  includeDoctype: false,
  selfCloseEmpty: true
});
// <div id="app">
//   <h1>标题</h1>
//   <p class="text">内容</p>
// </div>
```

### 生成完整 HTML 文档

```typescript
const body = [
  h('header', {}, [
    h('h1', {}, [t('我的网站')])
  ]),
  h('main', {}, [
    h('article', {}, [
      h('h2', {}, [t('文章标题')]),
      h('p', {}, [t('文章内容...')])
    ])
  ]),
  h('footer', {}, [
    h('p', {}, [t('© 2026 版权所有')])
  ])
];

const document = createHTMLDocument('我的网站', body, {
  includeStyles: true,
  includeScripts: true,
  headContent: [
    h('meta', { name: 'description', content: '网站描述' }),
    h('link', { rel: 'stylesheet', href: '/styles.css' })
  ]
});

console.log(document);
// <!DOCTYPE html>
// <html lang="zh-CN">
//   <head>
//     <meta charset="UTF-8">
//     <meta name="viewport" content="width=device-width, initial-scale=1.0">
//     <title>我的网站</title>
//     <meta name="description" content="网站描述">
//     <link rel="stylesheet" href="/styles.css">
//     <style></style>
//   </head>
//   <body>
//     <header>
//       <h1>我的网站</h1>
//     </header>
//     <main>
//       <article>
//         <h2>文章标题</h2>
//         <p>文章内容...</p>
//     </article>
//     </main>
//     <footer>
//       <p>© 2026 版权所有</p>
//     </footer>
//     <script></script>
//   </body>
// </html>
```

---

## 6️⃣ HTML 转义

```typescript
// HTML 转义
const unsafe = '<script>alert("XSS")</script>';
const safe = HTMLUtils.escapeHtml(unsafe);
console.log(safe);
// &lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;

// HTML 反转义
const original = HTMLUtils.unescapeHtml(safe);
console.log(original);
// <script>alert("XSS")</script>
```

---

## 7️⃣ 综合示例

### 网页内容提取器

```typescript
function extractWebPageContent(html: string) {
  const dom = parseHTML(html);
  
  // 提取标题
  const titleNodes = query(dom, 'title');
  const title = titleNodes.length > 0 ? extractText(titleNodes[0]) : '无标题';
  
  // 提取所有链接
  const links = HTMLUtils.extractLinks(dom);
  
  // 提取所有图片
  const images = HTMLUtils.extractImages(dom);
  
  // 提取主要内容 (假设在 <main> 或 <article> 中)
  const mainNodes = query(dom, 'main, article');
  const mainContent = mainNodes.length > 0 
    ? extractText(mainNodes[0])
    : extractText(dom);
  
  return {
    title,
    links: links.map(l => ({ text: l.text, href: l.href })),
    images: images.map(i => i.src),
    mainContent: mainContent.slice(0, 500) + '...' // 限制长度
  };
}

// 使用示例
const html = `<!DOCTYPE html>...`; // 某个网页的 HTML
const content = extractWebPageContent(html);
console.log(content);
```

### 简单 HTML 模板引擎

```typescript
function renderTemplate(template: string, data: Record<string, any>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return HTMLUtils.escapeHtml(String(data[key] ?? ''));
  });
}

const template = `
<div class="user-card">
  <h2>{{name}}</h2>
  <p>邮箱：{{email}}</p>
  <p>简介：{{bio}}</p>
</div>
`;

const html = renderTemplate(template, {
  name: '张三',
  email: 'zhangsan@example.com',
  bio: '前端开发者'
});

console.log(html);
// <div class="user-card">
//   <h2>张三</h2>
//   <p>邮箱：zhangsan@example.com</p>
//   <p>简介：前端开发者</p>
// </div>
```

### 批量修改链接

```typescript
function updateLinksDomain(dom: HTMLNode, oldDomain: string, newDomain: string): number {
  let count = 0;
  
  HTMLUtils.traverse(dom, (node) => {
    if (node.type === 'element' && node.attributes?.href) {
      if (node.attributes.href.includes(oldDomain)) {
        node.attributes.href = node.attributes.href.replace(oldDomain, newDomain);
        count++;
      }
    }
  });
  
  return count;
}

// 使用示例
const html = `<a href="https://old.com/page1">Link 1</a><a href="https://old.com/page2">Link 2</a>`;
const dom = parseHTML(html);
const updated = updateLinksDomain(dom, 'old.com', 'new.com');
console.log(`更新了 ${updated} 个链接`);
console.log(stringifyHTML(dom));
```

---

## 🎯 API 速查

| 函数/方法 | 描述 | 返回值 |
|-----------|------|--------|
| `parseHTML(html)` | 解析 HTML 字符串 | `HTMLNode` |
| `stringifyHTML(node, options)` | 序列化 DOM 为 HTML | `string` |
| `query(node, selector)` | CSS 选择器查询 | `HTMLNode[]` |
| `extractText(node)` | 提取文本内容 | `string` |
| `h(tag, attrs, children)` | 创建元素 | `HTMLNode` |
| `t(content)` | 创建文本节点 | `HTMLNode` |
| `createHTMLDocument(title, body, options)` | 生成 HTML 文档 | `string` |
| `HTMLUtils.createElement(tag, attrs)` | 创建元素节点 | `HTMLNode` |
| `HTMLUtils.createText(content)` | 创建文本节点 | `HTMLNode` |
| `HTMLUtils.appendChild(parent, child)` | 添加子节点 | `DOMOperationResult` |
| `HTMLUtils.removeChild(parent, child)` | 移除子节点 | `DOMOperationResult` |
| `HTMLUtils.setAttribute(node, name, value)` | 设置属性 | `DOMOperationResult` |
| `HTMLUtils.getAttribute(node, name)` | 获取属性 | `string \| undefined` |
| `HTMLUtils.removeAttribute(node, name)` | 移除属性 | `DOMOperationResult` |
| `HTMLUtils.findParent(node, selector?)` | 查找父节点 | `HTMLNode \| null` |
| `HTMLUtils.traverse(node, callback)` | 遍历 DOM 树 | `void` |
| `HTMLUtils.extract(node, options)` | 提取节点数据 | `ExtractedData` |
| `HTMLUtils.extractTable(node)` | 提取表格数据 | `TableData \| null` |
| `HTMLUtils.extractLinks(node)` | 提取所有链接 | `LinkData[]` |
| `HTMLUtils.extractImages(node)` | 提取所有图片 | `ImageData[]` |
| `HTMLUtils.escapeHtml(text)` | HTML 转义 | `string` |
| `HTMLUtils.unescapeHtml(text)` | HTML 反转义 | `string` |

---

## 📝 注意事项

1. **解析限制**: 当前解析器支持常见 HTML 语法，但对于 malformed HTML 可能不如浏览器解析器健壮
2. **选择器支持**: 目前仅支持基础选择器 (标签、ID、类),不支持复杂选择器 (如 `>`, `+`, `~`, `:nth-child` 等)
3. **命名空间**: 不支持 XML 命名空间
4. **性能**: 对于超大 HTML 文档 (10MB+), 建议分块处理

---

**完成时间:** 5 分钟内 ✅  
**交付物:** `src/skills/html-utils-skill.ts` + 使用示例
