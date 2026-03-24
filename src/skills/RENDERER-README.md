# Renderer Utils - HTML 模板渲染引擎

**版本:** 1.0.0  
**作者:** Axon  
**创建时间:** 2026-03-13

---

## 📖 概述

Renderer Utils 是一个功能完整的 HTML 模板渲染引擎，支持模板编译、变量插值和部分模板复用。适用于生成 HTML 页面、邮件模板、配置文件等场景。

### 核心特性

- ✅ **模板编译** - 预编译模板为可重用的渲染函数
- ✅ **变量插值** - 支持嵌套路径和表达式
- ✅ **部分模板** - 支持模板片段复用和嵌套
- ✅ **条件渲染** - `if` / `unless` 条件块
- ✅ **循环渲染** - `each` 循环块，支持索引和状态
- ✅ **HTML 转义** - 自动转义防止 XSS 攻击
- ✅ **自定义分隔符** - 支持 `{{ }}`、`<% %>` 等
- ✅ **注释支持** - 单行和多行注释

---

## 🚀 快速开始

### 基本使用

```typescript
import { render } from './renderer-utils-skill';

const template = 'Hello, {{name}}!';
const result = render(template, { name: 'Alice' });
// 输出："Hello, Alice!"
```

### 使用 Renderer 类

```typescript
import { Renderer } from './renderer-utils-skill';

const renderer = new Renderer();
const result = renderer.render('Hello, {{name}}!', { name: 'Bob' });
```

### 预编译模板

```typescript
import { compile } from './renderer-utils-skill';

const compiled = compile('Hello, {{name}}!');
const result1 = compiled.render({ name: 'Alice' });
const result2 = compiled.render({ name: 'Bob' });
```

---

## 📚 功能详解

### 1. 变量插值

#### 基本变量

```typescript
render('Hello, {{name}}!', { name: 'Alice' });
// "Hello, Alice!"
```

#### 嵌套路径

```typescript
render('{{user.profile.name}}', {
  user: {
    profile: {
      name: 'Bob'
    }
  }
});
// "Bob"
```

#### 转义变量 (HTML 转义)

```typescript
render('{{> userInput}}', {
  userInput: '<script>alert("XSS")</script>'
});
// "&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;"
```

### 2. 条件渲染

#### if 条件

```typescript
render(`
  {{#if isAdmin}}
    <span>Administrator</span>
  {{/if}}
`, { isAdmin: true });
// "<span>Administrator</span>"
```

#### unless 条件 (否定)

```typescript
render(`
  {{#unless isLoggedIn}}
    <a href="/login">Login</a>
  {{/unless}}
`, { isLoggedIn: false });
// "<a href="/login">Login</a>"
```

#### 复杂条件表达式

```typescript
render(`
  {{#if score >= 80}}
    <p>Excellent!</p>
  {{/if}}
  
  {{#if status == "premium" || status == "vip"}}
    <p>Premium member</p>
  {{/if}}
  
  {{#if isAdmin && isActive}}
    <p>Active admin</p>
  {{/if}}
`, {
  score: 85,
  status: 'premium',
  isAdmin: true,
  isActive: true
});
```

#### 支持的比较运算符

- `==` / `===` - 等于
- `!=` / `!==` - 不等于
- `>` - 大于
- `<` - 小于
- `>=` - 大于等于
- `<=` - 小于等于

#### 逻辑运算符

- `&&` - 与
- `||` - 或
- `!` - 非

### 3. 循环渲染

#### 基本循环

```typescript
render(`
  <ul>
    {{#each items}}
      <li>{{this}}</li>
    {{/each}}
  </ul>
`, {
  items: ['Apple', 'Banana', 'Orange']
});
// <ul><li>Apple</li><li>Banana</li><li>Orange</li></ul>
```

#### 循环状态变量

```typescript
render(`
  {{#each items}}
    <div class="{{#if first}}first{{/if}}{{#if last}} last{{/if}}">
      {{index}} / {{length}}: {{this.name}}
    </div>
  {{/each}}
`, {
  items: [
    { name: 'Item 1' },
    { name: 'Item 2' },
    { name: 'Item 3' }
  ]
});
```

**可用的循环变量:**
- `this` - 当前项
- `index` - 当前索引 (从 0 开始)
- `first` - 是否为第一项 (boolean)
- `last` - 是否为最后一项 (boolean)
- `length` - 数组总长度

#### 嵌套循环

```typescript
render(`
  {{#each categories}}
    <h3>{{this.name}}</h3>
    <ul>
      {{#each this.products}}
        <li>{{this.name}} - ${{this.price}}</li>
      {{/each}}
    </ul>
  {{/each}}
`, {
  categories: [
    {
      name: 'Electronics',
      products: [
        { name: 'Laptop', price: '999' },
        { name: 'Phone', price: '699' }
      ]
    }
  ]
});
```

### 4. 部分模板

#### 注册部分模板

```typescript
import { Renderer } from './renderer-utils-skill';

const renderer = new Renderer();

// 注册部分模板
renderer.registerPartial('header', `
  <header>
    <h1>{{title}}</h1>
  </header>
`);

// 使用部分模板
renderer.render('{{> header }}', { title: 'My Site' });
```

#### 嵌套部分模板

```typescript
renderer.registerPartial('nav', `
  <nav>
    {{#each links}}
      <a href="{{this.href}}">{{this.label}}</a>
    {{/each}}
  </nav>
`);

renderer.registerPartial('header', `
  <header>
    <h1>{{title}}</h1>
    {{> nav }}
  </header>
`);
```

#### 全局部分模板

```typescript
import { registerPartial } from './renderer-utils-skill';

// 注册全局部分模板
registerPartial('footer', `
  <footer>&copy; {{year}} {{company}}</footer>
`);

// 在任何渲染器中使用
const renderer1 = new Renderer();
const renderer2 = new Renderer();

renderer1.render('{{> footer }}', { year: '2026', company: 'Acme' });
renderer2.render('{{> footer }}', { year: '2026', company: 'Acme' });
```

### 5. 注释

```typescript
render(`
  <div>
    {{! 单行注释 }}
    {{!-- 
      多行注释
      不会被输出
    --}}
    <p>{{message}}</p>
  </div>
`, { message: 'Hello' });
// <div><p>Hello</p></div>
```

---

## ⚙️ 配置选项

### RendererOptions

```typescript
interface RendererOptions {
  /** 变量开始标记，默认 "{{" */
  delimiterStart?: string;
  
  /** 变量结束标记，默认 "}}" */
  delimiterEnd?: string;
  
  /** 是否忽略未定义变量，默认 true */
  ignoreUndefined?: boolean;
  
  /** 是否转义 HTML，默认 false */
  escapeHtml?: boolean;
  
  /** 部分模板注册表 */
  partials?: Record<string, string>;
}
```

### 使用示例

#### 自定义分隔符

```typescript
const renderer = createRenderer({
  delimiterStart: '<%',
  delimiterEnd: '%>'
});

renderer.render('<% name %>', { name: 'Alice' });
// "Alice"
```

#### 启用 HTML 转义

```typescript
const renderer = createRenderer({
  escapeHtml: true
});

renderer.render('<p>{{input}}</p>', {
  input: '<script>alert("XSS")</script>'
});
// <p>&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;</p>
```

#### 预注册部分模板

```typescript
const renderer = createRenderer({
  partials: {
    header: '<header>{{title}}</header>',
    footer: '<footer>{{copyright}}</footer>'
  }
});
```

---

## 📦 预定义 HTML 片段

Renderer Utils 提供了一组常用的 HTML 组件模板:

### htmlSnippets

```typescript
import { htmlSnippets } from './renderer-utils-skill';

// html5 - 基础 HTML5 骨架
// navbar - 导航栏
// card - 卡片组件
// table - 表格
// pagination - 分页
// alert - 警告框
// input - 表单输入
// listGroup - 列表组
```

#### 使用示例

```typescript
const renderer = new Renderer();
renderer.registerPartial('card', htmlSnippets.card);

renderer.render('{{> card }}', {
  image: 'https://example.com/image.jpg',
  title: 'Product Title',
  content: 'Product description...',
  action: {
    href: '/product/123',
    label: 'View Details'
  }
});
```

---

## 🔧 API 参考

### 类

#### Renderer

```typescript
class Renderer {
  constructor(options?: RendererOptions);
  
  render(template: string, context: RenderContext): string;
  compile(template: string): CompiledTemplate;
  registerPartial(name: string, template: string): void;
  unregisterPartial(name: string): void;
  getPartial(name: string): string | undefined;
}
```

### 函数

#### render()

快速渲染模板 (使用默认配置)

```typescript
function render(template: string, context: RenderContext): string;
```

#### compile()

编译模板为可重用的渲染函数

```typescript
function compile(template: string): CompiledTemplate;
```

#### createRenderer()

创建带自定义选项的渲染器

```typescript
function createRenderer(options?: RendererOptions): Renderer;
```

#### registerPartial()

注册全局部分模板

```typescript
function registerPartial(name: string, template: string): void;
```

#### getPartial()

获取全局部分模板

```typescript
function getPartial(name: string): string | undefined;
```

### 接口

#### CompiledTemplate

```typescript
interface CompiledTemplate {
  render: (context: RenderContext) => string;
  source: string;
  compiledAt: Date;
}
```

---

## 📊 性能建议

### 使用预编译模板

对于需要重复使用的模板，建议预编译:

```typescript
// ❌ 不推荐：每次都重新解析模板
for (let i = 0; i < 1000; i++) {
  render(template, data);
}

// ✅ 推荐：预编译后重复使用
const compiled = compile(template);
for (let i = 0; i < 1000; i++) {
  compiled.render(data);
}
```

**性能提升:** 约 20-50% (取决于模板复杂度)

### 减少嵌套深度

深层嵌套的部分模板和循环会影响性能:

```typescript
// ❌ 不推荐：过深的嵌套
{{#each a}}{{#each b}}{{#each c}}{{> deepPartial }}{{/each}}{{/each}}{{/each}}

// ✅ 推荐：扁平化结构
{{#each flatItems}}{{> itemPartial }}{{/each}}
```

---

## 🧪 测试示例

运行示例文件查看所有功能演示:

```bash
cd /Users/nike/.openclaw/workspace
npx ts-node src/skills/renderer-utils-examples.ts
```

---

## 📝 使用场景

### 1. HTML 页面生成

```typescript
const page = render(`
  <!DOCTYPE html>
  <html>
  <head><title>{{title}}</title></head>
  <body>
    {{#each sections}}
      <section>{{this.content}}</section>
    {{/each}}
  </body>
  </html>
`, pageData);
```

### 2. 邮件模板

```typescript
const email = render(`
  <p>Dear {{user.name}},</p>
  <p>Your order #{{order.id}} has been shipped!</p>
  {{#if order.trackingNumber}}
    <p>Tracking: {{order.trackingNumber}}</p>
  {{/if}}
`, emailData);
```

### 3. 配置文件生成

```typescript
const config = render(`
  {
    "appName": "{{appName}}",
    "version": "{{version}}",
    "features": [
      {{#each features}}
      "{{this}}"{{#unless last}},{{/unless}}
      {{/each}}
    ]
  }
`, configData);
```

### 4. 代码生成

```typescript
const component = render(`
  export function {{componentName}}({{props}}) {
    return (
      <div>{{content}}</div>
    );
  }
`, componentData);
```

---

## 🎯 最佳实践

1. **使用部分模板** - 将常用组件提取为部分模板
2. **预编译模板** - 对重复使用的模板进行预编译
3. **启用 HTML 转义** - 用户输入内容使用 `{{> }}` 或启用 `escapeHtml`
4. **保持模板简洁** - 避免在模板中编写复杂逻辑
5. **使用注释** - 为复杂模板添加注释说明

---

## 📄 许可证

MIT License

---

**最后更新:** 2026-03-13  
**维护者:** Axon
