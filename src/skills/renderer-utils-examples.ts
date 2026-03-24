/**
 * Renderer Utils - 使用示例
 * 
 * 演示 HTML 模板渲染引擎的各种用法
 */

import {
  Renderer,
  render,
  compile,
  createRenderer,
  registerPartial,
  getPartial,
  htmlSnippets,
} from './renderer-utils-skill';

// ============== 示例 1: 基本变量插值 ==============

console.log('=== 示例 1: 基本变量插值 ===\n');

const basicTemplate = 'Hello, {{name}}! Welcome to {{site}}.';
const basicResult = render(basicTemplate, {
  name: 'Alice',
  site: 'OpenClaw',
});

console.log('模板:', basicTemplate);
console.log('结果:', basicResult);
console.log('');

// ============== 示例 2: 嵌套路径访问 ==============

console.log('=== 示例 2: 嵌套路径访问 ===\n');

const nestedTemplate = `
<div class="user-profile">
  <h2>{{user.name}}</h2>
  <p>Email: {{user.contact.email}}</p>
  <p>Phone: {{user.contact.phone}}</p>
  <p>Location: {{user.address.city}}, {{user.address.country}}</p>
</div>
`;

const nestedResult = render(nestedTemplate, {
  user: {
    name: 'Bob Smith',
    contact: {
      email: 'bob@example.com',
      phone: '+1-234-567-8900',
    },
    address: {
      city: 'New York',
      country: 'USA',
    },
  },
});

console.log('结果:', nestedResult.trim());
console.log('');

// ============== 示例 3: 条件渲染 (if) ==============

console.log('=== 示例 3: 条件渲染 (if) ===\n');

const ifTemplate = `
<div class="notification">
  {{#if isAdmin}}
    <span class="badge">Administrator</span>
  {{/if}}
  {{#if showWelcome}}
    <p>Welcome back, {{username}}!</p>
  {{/if}}
</div>
`;

const ifResult1 = render(ifTemplate, {
  isAdmin: true,
  showWelcome: true,
  username: 'Charlie',
});

const ifResult2 = render(ifTemplate, {
  isAdmin: false,
  showWelcome: false,
  username: 'Diana',
});

console.log('管理员用户:', ifResult1.trim());
console.log('普通用户:', ifResult2.trim());
console.log('');

// ============== 示例 4: 否定条件 (unless) ==============

console.log('=== 示例 4: 否定条件 (unless) ===\n');

const unlessTemplate = `
<div class="status">
  {{#unless isLoggedIn}}
    <p>Please <a href="/login">log in</a> to continue.</p>
  {{/unless}}
  {{#unless hasPermission}}
    <p class="error">Access denied.</p>
  {{/unless}}
</div>
`;

const unlessResult = render(unlessTemplate, {
  isLoggedIn: false,
  hasPermission: false,
});

console.log('结果:', unlessResult.trim());
console.log('');

// ============== 示例 5: 循环渲染 (each) ==============

console.log('=== 示例 5: 循环渲染 (each) ===\n');

const eachTemplate = `<ul class="item-list">
  {{#each items}}
  <li class="{{#if first}}first{{/if}}{{#if last}} last{{/if}}">
    {{index}}. {{this.name}} - \${{this.price}}
  </li>
  {{/each}}
</ul>`;

const eachResult = render(eachTemplate, {
  items: [
    { name: 'Apple', price: 1.50 },
    { name: 'Banana', price: 0.75 },
    { name: 'Orange', price: 2.00 },
  ],
});

console.log('结果:', eachResult.trim());
console.log('');

// ============== 示例 6: 复杂条件表达式 ==============

console.log('=== 示例 6: 复杂条件表达式 ===\n');

const complexConditionTemplate = `
<div class="access-control">
  {{#if isAdmin && isActive}}
    <p>Full access granted.</p>
  {{/if}}
  {{#if score >= 80}}
    <p>Excellent performance!</p>
  {{/if}}
  {{#if status == "premium" || status == "vip"}}
    <p>Premium member benefits available.</p>
  {{/if}}
  {{#if count > 0 && count < 10}}
    <p>Limited stock available.</p>
  {{/if}}
</div>
`;

const complexResult = render(complexConditionTemplate, {
  isAdmin: true,
  isActive: true,
  score: 85,
  status: 'premium',
  count: 5,
});

console.log('结果:', complexResult.trim());
console.log('');

// ============== 示例 7: 部分模板 ==============

console.log('=== 示例 7: 部分模板 ===\n');

const renderer = new Renderer();

// 注册部分模板
renderer.registerPartial('header', `
<header class="site-header">
  <h1>{{siteTitle}}</h1>
  <nav>{{> nav }}</nav>
</header>
`);

renderer.registerPartial('nav', `
<ul class="main-nav">
  {{#each navItems}}
  <li><a href="{{this.url}}">{{this.label}}</a></li>
  {{/each}}
</ul>
`);

renderer.registerPartial('footer', `
<footer class="site-footer">
  <p>&copy; {{year}} {{company}}. All rights reserved.</p>
</footer>
`);

const pageTemplate = `
<!DOCTYPE html>
<html>
<head><title>{{pageTitle}}</title></head>
<body>
  {{> header }}
  <main class="content">
    {{content}}
  </main>
  {{> footer }}
</body>
</html>
`;

const pageResult = renderer.render(pageTemplate, {
  siteTitle: 'My Website',
  pageTitle: 'Home Page',
  year: '2026',
  company: 'Acme Corp',
  content: '<p>Welcome to our website!</p>',
  navItems: [
    { url: '/', label: 'Home' },
    { url: '/about', label: 'About' },
    { url: '/contact', label: 'Contact' },
  ],
});

console.log('结果:', pageResult.trim());
console.log('');

// ============== 示例 8: 预编译模板 ==============

console.log('=== 示例 8: 预编译模板 ===\n');

const template = '<div class="greeting">Hello, {{name}}! {{message}}</div>';
const compiled = compile(template);

console.log('编译时间:', compiled.compiledAt.toISOString());
console.log('模板来源:', compiled.source);

const compiledResult1 = compiled.render({ name: 'Eve', message: 'Good morning!' });
const compiledResult2 = compiled.render({ name: 'Frank', message: 'Good evening!' });
const compiledResult3 = compiled.render({ name: 'Grace', message: 'Have a nice day!' });

console.log('渲染 1:', compiledResult1);
console.log('渲染 2:', compiledResult2);
console.log('渲染 3:', compiledResult3);
console.log('');

// ============== 示例 9: HTML 转义 ==============

console.log('=== 示例 9: HTML 转义 ===\n');

const escapeRenderer = createRenderer({ escapeHtml: true });

const xssTemplate = '<p>User input: {{input}}</p>';
const xssResult = escapeRenderer.render(xssTemplate, {
  input: '<script>alert("XSS")</script>',
});

console.log('模板:', xssTemplate);
console.log('转义后:', xssResult);
console.log('');

// ============== 示例 10: 自定义分隔符 ==============

console.log('=== 示例 10: 自定义分隔符 ===\n');

const customRenderer = createRenderer({
  delimiterStart: '<%',
  delimiterEnd: '%>',
});

const customTemplate = '<p>Hello, <%name%>!</p>';
const customResult = customRenderer.render(customTemplate, {
  name: 'Henry',
});

console.log('模板:', customTemplate);
console.log('结果:', customResult);
console.log('');

// ============== 示例 11: 使用预定义 HTML 片段 ==============

console.log('=== 示例 11: 使用预定义 HTML 片段 ===\n');

const cardRenderer = new Renderer();

// 注册卡片模板
cardRenderer.registerPartial('card', htmlSnippets.card);

const cardData = {
  image: 'https://example.com/image.jpg',
  title: 'Product Title',
  content: 'This is a product description.',
  action: {
    href: '/product/123',
    label: 'View Details',
  },
};

const cardResult = cardRenderer.render('{{> card }}', cardData);
console.log('卡片组件:', cardResult.trim());
console.log('');

// ============== 示例 12: 表格渲染 ==============

console.log('=== 示例 12: 表格渲染 ===\n');

const tableRenderer = new Renderer();
tableRenderer.registerPartial('table', htmlSnippets.table);

const tableData = {
  columns: ['Name', 'Email', 'Role'],
  rows: [
    ['Alice', 'alice@example.com', 'Admin'],
    ['Bob', 'bob@example.com', 'User'],
    ['Charlie', 'charlie@example.com', 'User'],
  ],
};

const tableResult = tableRenderer.render('{{> table }}', tableData);
console.log('表格:', tableResult.trim());
console.log('');

// ============== 示例 13: 分页组件 ==============

console.log('=== 示例 13: 分页组件 ===\n');

const paginationRenderer = new Renderer();
paginationRenderer.registerPartial('pagination', htmlSnippets.pagination);

const paginationData = {
  showPrev: true,
  prevPage: 2,
  pages: [
    { num: 1, active: false },
    { num: 2, active: false },
    { num: 3, active: true },
    { num: 4, active: false },
    { num: 5, active: false },
  ],
  showNext: true,
  nextPage: 4,
};

const paginationResult = paginationRenderer.render('{{> pagination }}', paginationData);
console.log('分页:', paginationResult.trim());
console.log('');

// ============== 示例 14: 表单输入 ==============

console.log('=== 示例 14: 表单输入 ===\n');

const formRenderer = new Renderer();
formRenderer.registerPartial('input', htmlSnippets.input);

const inputData = {
  id: 'email',
  label: 'Email Address',
  type: 'email',
  name: 'user_email',
  required: true,
  value: 'test@example.com',
  error: '',
};

const inputResult = formRenderer.render('{{> input }}', inputData);
console.log('表单输入:', inputResult.trim());
console.log('');

// ============== 示例 15: 全局部分模板注册 ==============

console.log('=== 示例 15: 全局部分模板注册 ===\n');

// 注册全局部分模板
registerPartial('global-header', '<header>{{title}}</header>');

// 在不同渲染器中使用
const renderer1 = new Renderer();
const renderer2 = new Renderer();

const globalResult1 = renderer1.render('{{> global-header }}', { title: 'Renderer 1' });
const globalResult2 = renderer2.render('{{> global-header }}', { title: 'Renderer 2' });

console.log('渲染器 1:', globalResult1);
console.log('渲染器 2:', globalResult2);
console.log('');

// ============== 示例 16: 注释语法 ==============

console.log('=== 示例 16: 注释语法 ===\n');

const commentTemplate = `
<div>
  {{! This is a single-line comment }}
  {{!-- 
    This is a multi-line comment
    It will be removed from output
  --}}
  <p>Visible content: {{message}}</p>
</div>
`;

const commentResult = render(commentTemplate, {
  message: 'Hello World',
});

console.log('结果:', commentResult.trim());
console.log('');

// ============== 示例 17: 嵌套循环 ==============

console.log('=== 示例 17: 嵌套循环 ===\n');

const nestedLoopTemplate = `<div class="categories">
  {{#each categories}}
  <div class="category">
    <h3>{{this.name}}</h3>
    <ul>
      {{#each this.products}}
      <li>{{this.name}} - \${{this.price}}</li>
      {{/each}}
    </ul>
  </div>
  {{/each}}
</div>`;

const nestedLoopResult = render(nestedLoopTemplate, {
  categories: [
    {
      name: 'Electronics',
      products: [
        { name: 'Laptop', price: 999 },
        { name: 'Phone', price: 699 },
      ],
    },
    {
      name: 'Books',
      products: [
        { name: 'Novel', price: 15 },
        { name: 'Textbook', price: 45 },
      ],
    },
  ],
});

console.log('结果:', nestedLoopResult.trim());
console.log('');

// ============== 示例 18: 完整页面模板 ==============

console.log('=== 示例 18: 完整页面模板 ===\n');

const fullPageRenderer = new Renderer();

// 注册所有需要的部分模板
fullPageRenderer.registerPartial('head', '<meta charset="UTF-8"><title>{{title}}</title>');
fullPageRenderer.registerPartial('body', `
<div class="container">
  {{> header }}
  <main>{{content}}</main>
  {{> footer }}
</div>
`);
fullPageRenderer.registerPartial('header', `
<header>
  <h1>{{siteName}}</h1>
  {{> nav }}
</header>
`);
fullPageRenderer.registerPartial('nav', `
<nav>
  {{#each menu}}
  <a href="{{this.href}}">{{this.label}}</a>
  {{/each}}
</nav>
`);
fullPageRenderer.registerPartial('footer', `
<footer>
  <p>&copy; {{year}} {{company}}</p>
</footer>
`);

const fullPageTemplate = htmlSnippets.html5;

const fullPageData = {
  lang: 'en',
  title: 'My Awesome Site',
  siteName: 'Awesome Inc',
  year: '2026',
  company: 'Awesome Inc',
  content: '<p>Welcome to our amazing website!</p>',
  menu: [
    { href: '/', label: 'Home' },
    { href: '/products', label: 'Products' },
    { href: '/about', label: 'About' },
    { href: '/contact', label: 'Contact' },
  ],
};

const fullPageResult = fullPageRenderer.render(fullPageTemplate, fullPageData);
console.log('完整页面:', fullPageResult.trim());
console.log('');

// ============== 性能对比示例 ==============

console.log('=== 示例 19: 性能对比 (编译 vs 直接渲染) ===\n');

const perfTemplate = '<div>{{#each items}}<span>{{this}}</span>{{/each}}</div>';
const perfData = {
  items: Array.from({ length: 100 }, (_, i) => `Item ${i}`),
};

// 直接渲染
const start1 = Date.now();
for (let i = 0; i < 1000; i++) {
  render(perfTemplate, perfData);
}
const directTime = Date.now() - start1;

// 预编译渲染
const compiledTemplate = compile(perfTemplate);
const start2 = Date.now();
for (let i = 0; i < 1000; i++) {
  compiledTemplate.render(perfData);
}
const compiledTime = Date.now() - start2;

console.log('直接渲染 1000 次:', directTime, 'ms');
console.log('预编译渲染 1000 次:', compiledTime, 'ms');
console.log('性能提升:', ((directTime - compiledTime) / directTime * 100).toFixed(2), '%');
console.log('');

console.log('=== 所有示例完成 ===');
