# Template Utils 使用示例

**作者:** KAEL (Subagent of Axon)  
**版本:** 1.0.0  
**创建时间:** 2026-03-13

---

## 📦 快速开始

### 基本使用

```typescript
import { TemplateUtils, template, createTemplateEngine } from './template-utils-skill';

// 方式 1: 静态方法 (快速渲染)
const result = TemplateUtils.render('Hello, {{name}}!', { name: 'Alice' });
console.log(result); // 输出: "Hello, Alice!"

// 方式 2: 实例方法 (可配置)
const utils = new TemplateUtils();
const result = utils.render('Hello, {{name}}!', { name: 'Bob' });

// 方式 3: 快捷函数
const result = template('Hello, {{name}}!', { name: 'Charlie' });

// 方式 4: 自定义配置
const engine = createTemplateEngine({
  delimiterStart: '<%',
  delimiterEnd: '%>',
  enableCache: true,
  cacheMaxSize: 200,
});
const result = engine.render('<% name %>', { name: 'David' });
```

---

## 🎯 核心功能示例

### 1. 变量替换

```typescript
// 基本变量
const tpl1 = 'Hello, {{name}}!';
const result1 = TemplateUtils.render(tpl1, { name: 'Alice' });
// 输出: "Hello, Alice!"

// 嵌套路径
const tpl2 = 'User: {{user.profile.name}} ({{user.email}})';
const result2 = TemplateUtils.render(tpl2, {
  user: {
    profile: { name: 'Bob' },
    email: 'bob@example.com'
  }
});
// 输出: "User: Bob (bob@example.com)"

// 未定义变量 (默认忽略)
const tpl3 = 'Hello, {{name}}!';
const result3 = TemplateUtils.render(tpl3, {});
// 输出: "Hello, !"

// 严格模式 (抛错)
const utils = new TemplateUtils({ strict: true });
try {
  utils.render('Hello, {{name}}!', {});
} catch (e) {
  console.error(e.message); // 抛出错误
}
```

### 2. 过滤器

```typescript
// 内置过滤器
const examples = [
  ['{{name | upper}}', { name: 'alice' }],           // "ALICE"
  ['{{name | lower}}', { name: 'ALICE' }],           // "alice"
  ['{{name | capitalize}}', { name: 'alice' }],      // "Alice"
  ['{{text | trim}}', { text: '  hello  ' }],        // "hello"
  ['{{items | length}}', { items: [1, 2, 3] }],      // "3"
  ['{{items | first}}', { items: ['a', 'b', 'c'] }], // "a"
  ['{{items | last}}', { items: ['a', 'b', 'c'] }],  // "c"
  ['{{items | join: - }}', { items: ['a', 'b', 'c'] }], // "a-b-c"
  ['{{num | number:2}}', { num: 3.14159 }],          // "3.14"
  ['{{data | json:2}}', { data: { a: 1 } }],         // '{\n  "a": 1\n}'
  ['{{url | urlencode}}', { url: 'a b' }],           // "a%20b"
  ['{{html | html}}', { html: '<script>' }],         // "&lt;script&gt;"
  ['{{date | date:YYYY-MM-DD}}', { date: new Date() }], // "2026-03-13"
  ['{{text | truncate:10:...}}', { text: 'Very long text' }], // "Very long..."
];

// 链式过滤器
const tpl = '{{name | lower | capitalize}}';
const result = TemplateUtils.render(tpl, { name: 'ALICE' });
// 输出: "Alice"

// 自定义过滤器
const utils = new TemplateUtils();
utils.useFilter('slugify', (val) => 
  String(val).toLowerCase().replace(/\s+/g, '-')
);
utils.useFilter('reverse', (val) => 
  String(val).split('').reverse().join('')
);

const result1 = utils.render('{{title | slugify}}', { title: 'Hello World' });
// 输出: "hello-world"

const result2 = utils.render('{{text | reverse}}', { text: 'hello' });
// 输出: "olleh"
```

### 3. 条件渲染

```typescript
// 基本 if
const tpl1 = '{{#if isAdmin}}Admin Panel{{/if}}';
const result1 = TemplateUtils.render(tpl1, { isAdmin: true });
// 输出: "Admin Panel"

// if-else
const tpl2 = '{{#if isAdmin}}Admin{{else}}User{{/if}}';
const result2a = TemplateUtils.render(tpl2, { isAdmin: true });  // "Admin"
const result2b = TemplateUtils.render(tpl2, { isAdmin: false }); // "User"

// 比较运算
const examples = [
  ['{{#if count > 0}}Positive{{/if}}', { count: 5 }],     // "Positive"
  ['{{#if count >= 0}}Non-negative{{/if}}', { count: 0 }], // "Non-negative"
  ['{{#if name == "Alice"}}Match{{/if}}', { name: 'Alice' }], // "Match"
  ['{{#if name != "Bob"}}Not Bob{{/if}}', { name: 'Alice' }], // "Not Bob"
];

// 逻辑运算
const tpl3 = '{{#if isAdmin && isActive}}Active Admin{{/if}}';
const result3a = TemplateUtils.render(tpl3, { isAdmin: true, isActive: true });
// 输出: "Active Admin"

const result3b = TemplateUtils.render(tpl3, { isAdmin: true, isActive: false });
// 输出: ""

const tpl4 = '{{#if isAdmin || isSuper}}Admin Access{{/if}}';
const result4 = TemplateUtils.render(tpl4, { isAdmin: false, isSuper: true });
// 输出: "Admin Access"

// 否定
const tpl5 = '{{#if !isBanned}}Allowed{{/if}}';
const result5 = TemplateUtils.render(tpl5, { isBanned: false });
// 输出: "Allowed"

// 嵌套条件
const tpl6 = `
{{#if user}}
  {{#if user.isAdmin}}
    Admin: {{user.name}}
  {{else}}
    User: {{user.name}}
  {{/if}}
{{else}}
  No user
{{/if}}
`.trim();

const result6 = TemplateUtils.render(tpl6, { 
  user: { name: 'Alice', isAdmin: true } 
});
// 输出: "Admin: Alice"
```

### 4. 循环渲染

```typescript
// each 循环
const tpl1 = '<ul>{{#each items}}<li>{{this}}</li>{{/each}}</ul>';
const result1 = TemplateUtils.render(tpl1, { items: ['A', 'B', 'C'] });
// 输出: "<ul><li>A</li><li>B</li><li>C</li></ul>"

// each 循环中的特殊变量
const tpl2 = `{{#each items}}
{{index}}. {{this}}{{#if first}} (First){{/if}}{{#if last}} (Last){{/if}}
{{/each}}`.trim();

const result2 = TemplateUtils.render(tpl2, { items: ['A', 'B', 'C'] });
// 输出:
// "0. A (First)
//  1. B
//  2. C (Last)"

// each 循环中访问外部上下文
const tpl3 = '{{#each items}}{{../prefix}}: {{this}}{{/each}}';
const result3 = TemplateUtils.render(tpl3, { 
  prefix: 'Item', 
  items: ['A', 'B', 'C'] 
});
// 输出: "Item: AItem: BItem: C"

// for 循环
const tpl4 = '{{#for let i=0; i<5; i++}}Item {{i}} {{/for}}';
const result4 = TemplateUtils.render(tpl4, {});
// 输出: "Item 0 Item 1 Item 2 Item 3 Item 4 "

// for 循环嵌套
const tpl5 = '{{#for let i=0; i<3; i++}}Row {{i}}: {{#for let j=0; j<3; j++}}[{{i}},{{j}}]{{/for}} {{/for}}';
const result5 = TemplateUtils.render(tpl5, {});
// 输出: "Row 0: [0,0][0,1][0,2]  Row 1: [1,0][1,1][1,2]  Row 2: [2,0][2,1][2,2] "

// 对象数组循环
const tpl6 = `
<table>
  {{#each users}}
  <tr>
    <td>{{this.name}}</td>
    <td>{{this.email}}</td>
  </tr>
  {{/each}}
</table>
`.trim();

const result6 = TemplateUtils.render(tpl6, {
  users: [
    { name: 'Alice', email: 'alice@test.com' },
    { name: 'Bob', email: 'bob@test.com' },
  ]
});
```

### 5. 模板编译与缓存

```typescript
import { TemplateUtils } from './template-utils-skill';

const utils = new TemplateUtils({ enableCache: true, cacheMaxSize: 100 });

// 预编译模板
const compiled = utils.compile('Hello, {{name}}!', 'greeting-template');

// 多次使用编译后的模板 (性能更高)
const result1 = compiled({ name: 'Alice' });
const result2 = compiled({ name: 'Bob' });
const result3 = compiled({ name: 'Charlie' });

// 查看缓存统计
const stats = utils.getCacheStats();
console.log(stats);
// {
//   hits: 2,           // 命中次数
//   misses: 1,         // 未命中次数
//   size: 1,           // 当前缓存大小
//   maxSize: 100,      // 最大缓存大小
//   hitRate: 0.667     // 命中率 (66.7%)
// }

console.log(`Hit Rate: ${(stats.hitRate * 100).toFixed(2)}%`);
// 输出: "Hit Rate: 66.67%"

// 清除缓存
utils.clearCache();
const stats2 = utils.getCacheStats();
console.log(stats2); // { hits: 0, misses: 0, size: 0, maxSize: 100, hitRate: 0 }

// 移除特定模板
utils.compile('Template A', 'template-a');
utils.compile('Template B', 'template-b');
utils.removeFromCache('template-a');
```

---

## 🎨 实际应用场景

### 1. 邮件模板

```typescript
const emailTemplate = `
From: {{company.name}} <{{company.email}}>
To: {{recipient.name}} <{{recipient.email}}>
Subject: [{{status | upper}}] {{title}}

Dear {{recipient.name}},

{{#if status == 'success'}}
Great news! Your order #{{order.id}} has been confirmed.
{{else}}
We're sorry, but there was an issue with your order #{{order.id}}.
{{/if}}

Order Details:
{{#each order.items}}
- {{this.name}} x {{this.quantity}} = ${{this.price | number:2}}
{{/each}}

Total: ${{order.total | number:2}}

{{#if includeTracking}}
Tracking Number: {{order.trackingNumber}}
{{/if}}

Best regards,
{{company.name}} Team
`.trim();

const emailData = {
  company: { name: 'Acme Inc', email: 'support@acme.com' },
  recipient: { name: 'Alice', email: 'alice@example.com' },
  status: 'success',
  title: 'Order Confirmation',
  order: {
    id: 'ORD-12345',
    items: [
      { name: 'Widget A', quantity: 2, price: 29.99 },
      { name: 'Widget B', quantity: 1, price: 49.99 },
    ],
    total: 109.97,
    trackingNumber: 'TRK-98765',
  },
  includeTracking: true,
};

const utils = new TemplateUtils();
const email = utils.render(emailTemplate, emailData);
console.log(email);
```

### 2. HTML 报告生成

```typescript
const reportTemplate = `
<!DOCTYPE html>
<html>
<head>
  <title>{{report.title}}</title>
  <style>
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background-color: #4CAF50; color: white; }
    .positive { color: green; }
    .negative { color: red; }
  </style>
</head>
<body>
  <h1>{{report.title}}</h1>
  <p>Generated: {{report.date | date:YYYY-MM-DD HH:mm:ss}}</p>
  
  <h2>Summary</h2>
  <p>Total Records: {{report.stats.total}}</p>
  <p>Success Rate: {{report.stats.successRate | number:2}}%</p>
  
  <h2>Details</h2>
  <table>
    <thead>
      <tr>
        <th>ID</th>
        <th>Name</th>
        <th>Status</th>
        <th>Value</th>
      </tr>
    </thead>
    <tbody>
      {{#each report.records}}
      <tr>
        <td>{{this.id}}</td>
        <td>{{this.name | html}}</td>
        <td class="{{#if this.status == 'success'}}positive{{else}}negative{{/if}}">
          {{this.status | upper}}
        </td>
        <td>${{this.value | number:2}}</td>
      </tr>
      {{/each}}
    </tbody>
  </table>
  
  {{#if report.footer}}
  <footer>{{report.footer}}</footer>
  {{/if}}
</body>
</html>
`.trim();

const reportData = {
  report: {
    title: 'Monthly Sales Report',
    date: new Date(),
    stats: {
      total: 1000,
      successRate: 95.5,
    },
    records: [
      { id: 1, name: 'Product A', status: 'success', value: 1234.56 },
      { id: 2, name: 'Product B', status: 'failed', value: 789.01 },
      { id: 3, name: 'Product C', status: 'success', value: 2345.67 },
    ],
    footer: '© 2026 Acme Inc. All rights reserved.',
  },
};

const html = utils.render(reportTemplate, reportData);
// 保存为 HTML 文件或直接发送
```

### 3. 配置文件生成

```typescript
const configTemplate = `
# Application Configuration
# Generated: {{date | date:YYYY-MM-DD}}

APP_NAME={{appName}}
APP_VERSION={{version}}
APP_ENV={{env}}

# Database
DB_HOST={{database.host}}
DB_PORT={{database.port}}
DB_NAME={{database.name}}
{{#if database.user}}
DB_USER={{database.user}}
{{/if}}
{{#if database.password}}
DB_PASSWORD={{database.password}}
{{/if}}

# Features
{{#each features}}
FEATURE_{{this.name | upper}}={{this.enabled}}
{{/each}}

# Server
SERVER_HOST={{server.host}}
SERVER_PORT={{server.port}}
{{#if server.ssl}}
SERVER_SSL=true
SERVER_CERT_PATH={{server.certPath}}
{{/if}}
`.trim();

const configData = {
  date: new Date(),
  appName: 'MyApp',
  version: '1.0.0',
  env: 'production',
  database: {
    host: 'localhost',
    port: 5432,
    name: 'myapp_db',
    user: 'admin',
    password: 'secret123',
  },
  features: [
    { name: 'auth', enabled: true },
    { name: 'logging', enabled: true },
    { name: 'metrics', enabled: false },
  ],
  server: {
    host: '0.0.0.0',
    port: 8080,
    ssl: true,
    certPath: '/etc/ssl/certs/myapp.crt',
  },
};

const config = utils.render(configTemplate, configData);
console.log(config);
// 输出可保存为 .env 或 .conf 文件
```

### 4. API 响应模板

```typescript
const apiResponseTemplate = `{
  "success": {{success}},
  "timestamp": "{{timestamp | date:YYYY-MM-DDTHH:mm:ssZ}}",
  "data": {{data | json:2}},
  {{#if error}}
  "error": {
    "code": "{{error.code}}",
    "message": "{{error.message}}",
    {{#if error.details}}
    "details": {{error.details | json:2}}
    {{/if}}
  }
  {{/if}}
}`.trim();

// 成功响应
const successResponse = utils.render(apiResponseTemplate, {
  success: true,
  timestamp: new Date(),
  data: { users: [{ id: 1, name: 'Alice' }] },
});

// 错误响应
const errorResponse = utils.render(apiResponseTemplate, {
  success: false,
  timestamp: new Date(),
  data: null,
  error: {
    code: 'USER_NOT_FOUND',
    message: 'The requested user does not exist',
    details: { userId: 123, attemptedAt: new Date() },
  },
});
```

---

## 📊 性能基准

```typescript
import { TemplateUtils } from './template-utils-skill';

// 测试数据
const template = `
<div class="user-list">
  {{#each users}}
  <div class="user-card">
    <h3>{{this.name | upper}}</h3>
    <p>Email: {{this.email}}</p>
    {{#if this.isActive}}<span class="badge">Active</span>{{/if}}
  </div>
  {{/each}}
</div>
`.trim();

const data = {
  users: Array.from({ length: 100 }, (_, i) => ({
    name: `User ${i}`,
    email: `user${i}@example.com`,
    isActive: i % 2 === 0,
  })),
};

// 测试 1: 直接渲染 (无缓存)
const utils1 = new TemplateUtils({ enableCache: false });
console.time('Direct Render');
for (let i = 0; i < 1000; i++) {
  utils1.render(template, data);
}
console.timeEnd('Direct Render');

// 测试 2: 预编译 + 缓存
const utils2 = new TemplateUtils({ enableCache: true });
const compiled = utils2.compile(template, 'user-list');
console.time('Compiled + Cached');
for (let i = 0; i < 1000; i++) {
  compiled(data);
}
console.timeEnd('Compiled + Cached');

// 查看缓存统计
const stats = utils2.getCacheStats();
console.log(`Cache Hit Rate: ${(stats.hitRate * 100).toFixed(2)}%`);
// 预期：预编译版本比直接渲染快 5-10 倍
```

---

## 🔧 高级配置

### 自定义分隔符

```typescript
// 使用 EJS 风格分隔符
const ejsEngine = new TemplateUtils({
  delimiterStart: '<%',
  delimiterEnd: '%>',
});

const result = ejsEngine.render('<% name %>', { name: 'Alice' });
// 输出: "Alice"

// 使用 ASP 风格分隔符
const aspEngine = new TemplateUtils({
  delimiterStart: '<%= ',
  delimiterEnd: ' %>',
});

const result2 = aspEngine.render('<%= name %>', { name: 'Bob' });
// 输出: "Bob"
```

### 缓存调优

```typescript
// 小缓存 (适合内存受限环境)
const smallCache = new TemplateUtils({
  cacheMaxSize: 10,
});

// 大缓存 (适合高并发场景)
const largeCache = new TemplateUtils({
  cacheMaxSize: 1000,
});

// 禁用缓存 (适合一次性模板)
const noCache = new TemplateUtils({
  enableCache: false,
});

// 监控缓存性能
setInterval(() => {
  const stats = largeCache.getCacheStats();
  console.log(`Cache: ${stats.size}/${stats.maxSize}, Hit Rate: ${(stats.hitRate * 100).toFixed(2)}%`);
  
  // 如果命中率过低，考虑增加缓存大小
  if (stats.hitRate < 0.5 && stats.size >= stats.maxSize) {
    console.warn('Cache hit rate low, consider increasing cacheMaxSize');
  }
}, 60000); // 每分钟检查
```

---

## ⚠️ 注意事项

### 1. 安全性

```typescript
// ❌ 不要直接渲染用户输入
const userInput = '<script>alert("XSS")</script>';
const dangerous = utils.render('{{input}}', { input: userInput });
// 输出: "<script>alert("XSS")</script>" (危险!)

// ✅ 使用 html 过滤器转义
const safe = utils.render('{{input | html}}', { input: userInput });
// 输出: "&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;" (安全)
```

### 2. 性能优化

```typescript
// ✅ 推荐：预编译重复使用的模板
const compiled = utils.compile('Hello, {{name}}!', 'greeting');
for (let i = 0; i < 1000; i++) {
  compiled({ name: `User ${i}` });
}

// ❌ 不推荐：每次都重新编译
for (let i = 0; i < 1000; i++) {
  utils.render('Hello, {{name}}!', { name: `User ${i}` });
}
```

### 3. 错误处理

```typescript
// 严格模式下捕获错误
const strictUtils = new TemplateUtils({ strict: true });

try {
  strictUtils.render('Hello, {{name}}!', {});
} catch (error) {
  console.error('Template error:', error.message);
}

// 自定义过滤器错误处理
utils.useFilter('safeDivide', (a, b) => {
  const divisor = Number(b);
  if (divisor === 0) {
    return '0'; // 或者抛出错误
  }
  return Number(a) / divisor;
});
```

---

## 📝 API 参考

### TemplateUtils 类

| 方法 | 描述 | 参数 | 返回值 |
|------|------|------|--------|
| `constructor(options?)` | 创建实例 | `TemplateOptions` | `TemplateUtils` |
| `render(template, context)` | 渲染模板 | `string`, `TemplateContext` | `string` |
| `compile(template, id?)` | 预编译模板 | `string`, `string?` | `CompiledTemplate` |
| `useFilter(name, fn)` | 注册过滤器 | `string`, `FilterFunction` | `this` |
| `clearCache()` | 清除缓存 | - | `void` |
| `getCacheStats()` | 获取缓存统计 | - | `TemplateCacheStats` |
| `removeFromCache(key)` | 移除缓存 | `string` | `boolean` |

### TemplateOptions

| 属性 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| `delimiterStart` | `string` | `"{{"` | 变量开始标记 |
| `delimiterEnd` | `string` | `"}}"` | 变量结束标记 |
| `ignoreUndefined` | `boolean` | `true` | 忽略未定义变量 |
| `enableCache` | `boolean` | `true` | 启用缓存 |
| `cacheMaxSize` | `number` | `100` | 缓存最大条目数 |
| `strict` | `boolean` | `false` | 严格模式 |

### 内置过滤器

| 过滤器 | 描述 | 示例 |
|--------|------|------|
| `upper` | 转大写 | `{{name \| upper}}` |
| `lower` | 转小写 | `{{name \| lower}}` |
| `capitalize` | 首字母大写 | `{{name \| capitalize}}` |
| `trim` | 去除空白 | `{{text \| trim}}` |
| `length` | 获取长度 | `{{items \| length}}` |
| `first` | 第一个元素 | `{{items \| first}}` |
| `last` | 最后一个元素 | `{{items \| last}}` |
| `reverse` | 反转数组 | `{{items \| reverse}}` |
| `join` | 数组合并 | `{{items \| join:, }}` |
| `slice` | 数组切片 | `{{items \| slice:0:5}}` |
| `default` | 默认值 | `{{name \| default:Guest}}` |
| `number` | 格式化数字 | `{{num \| number:2}}` |
| `json` | JSON 格式化 | `{{data \| json:2}}` |
| `urlencode` | URL 编码 | `{{url \| urlencode}}` |
| `html` | HTML 转义 | `{{text \| html}}` |
| `date` | 日期格式化 | `{{date \| date:YYYY-MM-DD}}` |
| `truncate` | 截断文本 | `{{text \| truncate:50:...}}` |

---

**文档完成时间:** 2026-03-13  
**任务状态:** ✅ 完成
