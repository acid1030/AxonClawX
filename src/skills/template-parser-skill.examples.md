# Template Parser 使用示例

## 快速开始

```typescript
import { TemplateParser, parse, createParser } from './template-parser-skill';

// 方法 1: 静态方法快速渲染
const result = TemplateParser.render('Hello, {{name}}!', { name: 'Alice' });
console.log(result); // "Hello, Alice!"

// 方法 2: 快捷函数
const result = parse('Hello, {{name}}!', { name: 'Bob' });

// 方法 3: 创建实例 (可配置)
const parser = new TemplateParser({
  delimiterStart: '{{',
  delimiterEnd: '}}',
  ignoreUndefined: true,
  enableCache: true,
  strict: false,
});
```

---

## 1. 变量插值

### 基础变量

```typescript
const template = 'Hello, {{name}}!';
const context = { name: 'Alice' };
console.log(parse(template, context));
// 输出："Hello, Alice!"
```

### 嵌套路径

```typescript
const template = '{{user.profile.name}} - {{user.email}}';
const context = {
  user: {
    profile: { name: 'Alice' },
    email: 'alice@example.com'
  }
};
console.log(parse(template, context));
// 输出："Alice - alice@example.com"
```

### 使用过滤器

```typescript
// 内置过滤器
const templates = [
  '{{name | upper}}',           // "ALICE"
  '{{name | lower}}',           // "alice"
  '{{name | capitalize}}',      // "Alice"
  '{{text | trim}}',            // 去除首尾空格
  '{{items | length}}',         // 数组/字符串长度
  '{{items | first}}',          // 第一个元素
  '{{items | last}}',           // 最后一个元素
  '{{items | reverse}}',        // 反转数组
  '{{items | join:", "}}',      // 连接数组
  '{{items | slice:0:3}}',      // 切片
  '{{value | default:"N/A"}}',  // 默认值
  '{{price | number:2}}',       // 数字格式化
  '{{obj | json:2}}',           // JSON 格式化
  '{{text | urlencode}}',       // URL 编码
  '{{text | html}}',            // HTML 转义
];

const context = {
  name: 'alice',
  text: '  Hello  ',
  items: ['A', 'B', 'C'],
  value: undefined,
  price: 19.9,
  obj: { key: 'value' }
};
```

### 自定义过滤器

```typescript
const parser = new TemplateParser();

// 注册自定义过滤器
parser.useFilter('currency', (value, symbol = '$') => {
  return `${symbol}${Number(value).toFixed(2)}`;
});

parser.useFilter('truncate', (value, length = 10) => {
  const str = String(value);
  return str.length > length ? str.slice(0, length) + '...' : str;
});

const template = 'Price: {{price | currency:€}} | Desc: {{desc | truncate:20}}';
const context = { price: 29.99, desc: 'This is a very long description' };
console.log(parser.render(template, context));
// 输出："Price: €29.99 | Desc: This is a very long..."
```

---

## 2. 条件渲染

### 基础条件

```typescript
// if
parse('{{#if isAdmin}}Admin Panel{{/if}}', { isAdmin: true });
// 输出："Admin Panel"

// if-else
parse('{{#if isAdmin}}Admin{{else}}User{{/if}}', { isAdmin: false });
// 输出："User"
```

### 复杂条件

```typescript
const template = `
{{#if score >= 90}}优秀{{/if}}
{{#if score >= 60 && score < 90}}及格{{/if}}
{{#if score < 60}}不及格{{/if}}
`;

parse(template, { score: 85 }); // "及格"
```

### 逻辑运算

```typescript
const template = '{{#if isAdmin || isSuperUser}}Access Granted{{/if}}';
parse(template, { isAdmin: false, isSuperUser: true });
// 输出："Access Granted"

const template = '{{#if isLoggedIn && !isBanned}}Welcome{{/if}}';
parse(template, { isLoggedIn: true, isBanned: false });
// 输出："Welcome"
```

### 否定条件

```typescript
parse('{{#if !isEmpty}}Has Content{{/if}}', { isEmpty: false });
// 输出："Has Content"
```

### 字符串比较

```typescript
parse('{{#if status == "active"}}Active{{/if}}', { status: 'active' });
// 输出："Active"

parse('{{#if name != "admin"}}Not Admin{{/if}}', { name: 'user' });
// 输出："Not Admin"
```

---

## 3. 循环渲染

### each 循环

```typescript
// 基础循环
const template = '<ul>{{#each items}}<li>{{this}}</li>{{/each}}</ul>';
const context = { items: ['A', 'B', 'C'] };
console.log(parse(template, context));
// 输出："<ul><li>A</li><li>B</li><li>C</li></ul>"
```

### 循环变量

```typescript
const template = `
{{#each items}}
  {{index}}. {{this}} {{#if first}}(First){{/if}}{{#if last}}(Last){{/if}}
{{/each}}
`;

const context = { items: ['A', 'B', 'C'] };
console.log(parse(template, context));
// 输出:
// "0. A (First)
//  1. B
//  2. C (Last)"
```

### 嵌套路径循环

```typescript
const template = '{{#each users}}<p>{{this.name}} - {{this.email}}</p>{{/each}}';
const context = {
  users: [
    { name: 'Alice', email: 'alice@example.com' },
    { name: 'Bob', email: 'bob@example.com' }
  ]
};
console.log(parse(template, context));
```

### for 循环

```typescript
// 基础 for 循环
const template = '{{#for let i=0; i<5; i++}}Item {{i}} {{/for}}';
console.log(parse(template, {}));
// 输出："Item 0 Item 1 Item 2 Item 3 Item 4 "

// 倒序循环
const template = '{{#for let i=10; i>0; i--}}{{i}} {{/for}}';
console.log(parse(template, {}));
// 输出："10 9 8 7 6 5 4 3 2 1 "

// 使用循环变量
const template = '{{#for let i=0; i<3; i++}}<div class="item-{{i}}">{{/for}}';
console.log(parse(template, {}));
// 输出："<div class="item-0"><div class="item-1"><div class="item-2">"
```

---

## 4. 模板继承

### 定义父模板

```typescript
const parser = new TemplateParser();

// 注册父模板
parser.useTemplate('layout', `
<!DOCTYPE html>
<html>
<head>
  <title>{{#block title}}Default Title{{/block}}</title>
</head>
<body>
  {{#block content}}{{/block}}
</body>
</html>
`);
```

### 子模板继承

```typescript
const childTemplate = `
{{extends "layout"}}

{{#block title}}My Page{{/block}}

{{#block content}}
  <h1>Welcome!</h1>
  <p>This is my page.</p>
{{/block}}
`;

console.log(parser.render(childTemplate, {}));
// 输出完整的 HTML 页面，blocks 被替换
```

---

## 5. 模板包含

```typescript
const parser = new TemplateParser();

// 注册被包含的模板
parser.useTemplate('header', '<header>{{title}}</header>');
parser.useTemplate('footer', '<footer>© 2026</footer>');

// 使用 include
const template = `
{{include "header"}}
<main>{{content}}</main>
{{include "footer"}}
`;

console.log(parser.render(template, { title: 'My Site', content: 'Hello' }));
```

---

## 6. 预编译模板

```typescript
const parser = new TemplateParser();

// 预编译 (缓存渲染函数)
const compiled = parser.compile('Hello, {{name}}!');

// 多次使用 (性能更优)
console.log(compiled({ name: 'Alice' }));
console.log(compiled({ name: 'Bob' }));
console.log(compiled({ name: 'Charlie' }));

// 访问模板源码
console.log(compiled.source); // "Hello, {{name}}!"
```

---

## 7. 自定义指令

```typescript
const parser = new TemplateParser();

// 注册自定义指令
parser.useDirective('link', (value, context, target = '_blank') => {
  return `<a href="${value}" target="${target}">${value}</a>`;
});

parser.useDirective('img', (value, context, alt = '', width = '100') => {
  return `<img src="${value}" alt="${alt}" width="${width}">`;
});

const template = '{{url | link:_self}} | {{src | img:Logo:200}}';
const context = { url: 'https://example.com', src: '/logo.png' };
console.log(parser.render(template, context));
```

---

## 8. 复杂示例

### 用户列表卡片

```typescript
const template = `
<div class="user-list">
  {{#each users}}
  <div class="user-card {{#if this.isActive}}active{{/if}}">
    <h3>{{this.name | upper}}</h3>
    <p>Email: {{this.email}}</p>
    <p>Role: {{this.role | capitalize}}</p>
    {{#if this.isAdmin}}
      <span class="badge">Admin</span>
    {{/if}}
    {{#if this.tags}}
      <div class="tags">
        {{#each this.tags}}
          <span class="tag">{{this}}</span>
        {{/each}}
      </div>
    {{/if}}
  </div>
  {{/each}}
</div>
`;

const context = {
  users: [
    {
      name: 'alice',
      email: 'alice@example.com',
      role: 'admin',
      isAdmin: true,
      isActive: true,
      tags: ['react', 'typescript']
    },
    {
      name: 'bob',
      email: 'bob@example.com',
      role: 'user',
      isAdmin: false,
      isActive: false,
      tags: ['vue']
    }
  ]
};

console.log(parse(template, context));
```

### 数据表格

```typescript
const template = `
<table>
  <thead>
    <tr>{{#each columns}}<th>{{this}}</th>{{/each}}</tr>
  </thead>
  <tbody>
    {{#for let i=0; i<rows | length; i++}}
    <tr>
      {{#each columns}}
        <td>{{rows.[i].[this]}}</td>
      {{/each}}
    </tr>
    {{/for}}
  </tbody>
</table>
`;

const context = {
  columns: ['Name', 'Age', 'City'],
  rows: [
    { Name: 'Alice', Age: 25, City: 'NYC' },
    { Name: 'Bob', Age: 30, City: 'LA' },
    { Name: 'Charlie', Age: 35, City: 'SF' }
  ]
};
```

### 条件消息

```typescript
const template = `
{{#if error}}
  <div class="alert alert-error">{{error}}</div>
{{elseif warning}}
  <div class="alert alert-warning">{{warning}}</div>
{{elseif success}}
  <div class="alert alert-success">{{success}}</div>
{{else}}
  <div class="alert alert-info">Ready</div>
{{/if}}
`;

parse(template, { success: 'Operation completed!' });
// 输出成功消息
```

---

## 9. 配置选项

```typescript
const parser = new TemplateParser({
  delimiterStart: '{{',      // 变量开始标记
  delimiterEnd: '}}',        // 变量结束标记
  ignoreUndefined: true,     // 忽略未定义变量 (替换为空)
  enableCache: true,         // 启用编译缓存
  strict: false,             // 严格模式 (未定义变量抛错)
});

// 自定义分隔符
const parser = new TemplateParser({
  delimiterStart: '<%',
  delimiterEnd: '%>',
});

parse('<% name %>', { name: 'Alice' }); // "Alice"
```

---

## 10. 错误处理

### 严格模式

```typescript
const parser = new TemplateParser({ strict: true });

try {
  parser.render('{{undefinedVar}}', {});
} catch (error) {
  console.error(error.message); // 抛出错误
}
```

### 模板未找到

```typescript
const parser = new TemplateParser({ strict: true });

try {
  parser.render('{{extends "nonexistent"}}', {});
} catch (error) {
  console.error(error.message); // Template "nonexistent" not found
}
```

---

## API 参考

### TemplateParser 类

| 方法 | 描述 | 参数 | 返回值 |
|------|------|------|--------|
| `constructor(options)` | 创建解析器实例 | TemplateOptions | TemplateParser |
| `render(template, context)` | 渲染模板 | string, TemplateContext | string |
| `compile(template)` | 预编译模板 | string | CompiledTemplate |
| `useFilter(name, fn)` | 注册过滤器 | string, FilterFunction | this |
| `useDirective(name, fn)` | 注册指令 | string, DirectiveFunction | this |
| `useTemplate(name, content)` | 注册模板 | string, string | this |
| `clearCache()` | 清除缓存 | - | void |

### 静态方法

| 方法 | 描述 |
|------|------|
| `TemplateParser.render(template, context)` | 快速渲染 (默认配置) |

### 快捷函数

| 函数 | 描述 |
|------|------|
| `parse(template, context)` | 快速渲染别名 |
| `createParser(options)` | 创建自定义解析器 |

### 内置过滤器

- `upper` - 转大写
- `lower` - 转小写
- `capitalize` - 首字母大写
- `trim` - 去除空格
- `length` - 获取长度
- `first` / `last` - 首/尾元素
- `reverse` - 反转
- `join` - 连接数组
- `slice` - 切片
- `default` - 默认值
- `number` - 数字格式化
- `json` - JSON 格式化
- `urlencode` - URL 编码
- `html` - HTML 转义

---

## 性能提示

1. **使用预编译**: 对重复使用的模板调用 `compile()`
2. **启用缓存**: 默认开启 `enableCache: true`
3. **避免深层嵌套**: 嵌套路径不超过 3-4 层
4. **简化条件**: 复杂条件逻辑放在 JS 中处理

---

## 最佳实践

1. **模板分离**: 将模板存储在单独文件或常量中
2. **命名规范**: 使用有意义的变量名
3. **错误处理**: 生产环境使用 `ignoreUndefined: true`
4. **安全性**: 用户输入使用 `html` 过滤器转义
5. **性能**: 大数据集使用分页，避免单次渲染过多项

---

**版本**: 2.0.0  
**作者**: Axon  
**许可证**: MIT
