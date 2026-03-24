# Template Lite 使用示例

**文件:** `src/skills/template-lite-skill.ts`  
**版本:** 1.0.0  
**作者:** Axon

---

## 📦 安装与导入

```typescript
// ES6 导入
import { TemplateLite, template, createTemplate } from './src/skills/template-lite-skill';

// 或者使用默认导出
import TemplateLite from './src/skills/template-lite-skill';
```

---

## 1️⃣ 基本变量替换

### 简单变量

```typescript
const result = TemplateLite.render('Hello, {{name}}!', { name: 'Alice' });
console.log(result);
// 输出："Hello, Alice!"
```

### 嵌套路径

```typescript
const context = {
  user: {
    name: 'Bob',
    profile: {
      age: 25,
      city: 'Beijing'
    }
  }
};

const result = TemplateLite.render(
  '{{user.name}} is {{user.profile.age}} years old, lives in {{user.profile.city}}',
  context
);
console.log(result);
// 输出："Bob is 25 years old, lives in Beijing"
```

### 使用快捷函数

```typescript
import { template } from './src/skills/template-lite-skill';

const result = template('Welcome back, {{username}}!', { username: 'Charlie' });
console.log(result);
// 输出："Welcome back, Charlie!"
```

---

## 2️⃣ 条件渲染

### 基本条件

```typescript
// 条件为真
const result1 = TemplateLite.render(
  '{{#if isAdmin}}Admin Panel{{/if}}',
  { isAdmin: true }
);
console.log(result1);
// 输出："Admin Panel"

// 条件为假
const result2 = TemplateLite.render(
  '{{#if isAdmin}}Admin Panel{{/if}}',
  { isAdmin: false }
);
console.log(result2);
// 输出：""
```

### 否定条件

```typescript
const result = TemplateLite.render(
  '{{#if !isLoggedIn}}Please log in{{/if}}',
  { isLoggedIn: false }
);
console.log(result);
// 输出："Please log in"
```

### 比较运算

```typescript
// 大于
const result1 = TemplateLite.render(
  '{{#if score > 60}}Passed{{/if}}',
  { score: 75 }
);
console.log(result1);
// 输出："Passed"

// 等于
const result2 = TemplateLite.render(
  '{{#if status == "active"}}Active User{{/if}}',
  { status: 'active' }
);
console.log(result2);
// 输出："Active User"

// 小于等于
const result3 = TemplateLite.render(
  '{{#if count <= 10}}Low stock{{/if}}',
  { count: 5 }
);
console.log(result3);
// 输出："Low stock"
```

### 逻辑运算

```typescript
// 逻辑与 (&&)
const result1 = TemplateLite.render(
  '{{#if isAdmin && isActive}}Admin Dashboard{{/if}}',
  { isAdmin: true, isActive: true }
);
console.log(result1);
// 输出："Admin Dashboard"

// 逻辑或 (||)
const result2 = TemplateLite.render(
  '{{#if isVip || isPremium}}Special Offer{{/if}}',
  { isVip: false, isPremium: true }
);
console.log(result2);
// 输出："Special Offer"
```

### 复杂条件组合

```typescript
const context = {
  user: {
    role: 'admin',
    active: true,
    permissions: 5
  }
};

const result = TemplateLite.render(`
  {{#if user.role == "admin" && user.active && user.permissions > 3}}
    Full Access Granted
  {{/if}}
`, context);

console.log(result.trim());
// 输出："Full Access Granted"
```

---

## 3️⃣ 循环渲染

### 基础循环

```typescript
const result = TemplateLite.render(
  '<ul>{{#each items}}<li>{{this}}</li>{{/each}}</ul>',
  { items: ['Apple', 'Banana', 'Cherry'] }
);
console.log(result);
// 输出："<ul><li>Apple</li><li>Banana</li><li>Cherry</li></ul>"
```

### 循环索引

```typescript
const result = TemplateLite.render(`
  <ol>
  {{#each items}}
    <li>{{index}}: {{this}}</li>
  {{/each}}
  </ol>
`, { items: ['First', 'Second', 'Third'] });

console.log(result);
// 输出："<ol><li>0: First</li><li>1: Second</li><li>2: Third</li></ol>"
```

### 循环辅助变量

```typescript
const result = TemplateLite.render(`
  {{#each items}}
    {{#if first}}[FIRST] {{/if}}
    {{this}}
    {{#if last}} [LAST]{{/if}}
  {{/each}}
`, { items: ['A', 'B', 'C'] });

console.log(result.trim());
// 输出："[FIRST] A\n    B\n    C [LAST]"
```

### 循环中访问外部上下文

```typescript
const context = {
  prefix: 'Item',
  items: ['X', 'Y', 'Z']
};

const result = TemplateLite.render(
  '{{#each items}}{{prefix}}: {{this}} {{/each}}',
  context
);
console.log(result);
// 输出："Item: X Item: Y Item: Z "
```

### 嵌套循环

```typescript
const context = {
  categories: [
    { name: 'Fruits', items: ['Apple', 'Banana'] },
    { name: 'Vegetables', items: ['Carrot', 'Broccoli'] }
  ]
};

const result = TemplateLite.render(`
  {{#each categories}}
    <h2>{{this.name}}</h2>
    <ul>
      {{#each this.items}}
        <li>{{this}}</li>
      {{/each}}
    </ul>
  {{/each}}
`, context);

console.log(result);
// 输出：
// <h2>Fruits</h2>
// <ul><li>Apple</li><li>Banana</li></ul>
// <h2>Vegetables</h2>
// <ul><li>Carrot</li><li>Broccoli</li></ul>
```

---

## 4️⃣ 综合示例

### 用户列表卡片

```typescript
const context = {
  pageTitle: 'User Directory',
  users: [
    { name: 'Alice', email: 'alice@example.com', isAdmin: true, active: true },
    { name: 'Bob', email: 'bob@example.com', isAdmin: false, active: true },
    { name: 'Charlie', email: 'charlie@example.com', isAdmin: false, active: false }
  ]
};

const template = `
<h1>{{pageTitle}}</h1>
<div class="user-list">
  {{#each users}}
    <div class="user-card">
      <h3>{{this.name}}{{#if this.isAdmin}} (Admin){{/if}}</h3>
      <p>Email: {{this.email}}</p>
      {{#if this.active}}
        <span class="status active">Active</span>
      {{/if}}
      {{#if !this.active}}
        <span class="status inactive">Inactive</span>
      {{/if}}
    </div>
  {{/each}}
</div>
`;

const result = TemplateLite.render(template, context);
console.log(result);
```

### 订单详情

```typescript
const context = {
  order: {
    id: 'ORD-2026-001',
    customer: 'John Doe',
    items: [
      { name: 'Laptop', price: 999, quantity: 1 },
      { name: 'Mouse', price: 29, quantity: 2 }
    ],
    discount: 50,
    isPaid: true
  }
};

const template = `
Order: {{order.id}}
Customer: {{order.customer}}

Items:
{{#each order.items}}
  - {{this.name}}: ${{this.price}} x {{this.quantity}}
{{/each}}

Subtotal: ${{order.items.length}} items
Discount: ${{order.discount}}
{{#if order.isPaid}}Status: PAID{{/if}}
{{#if !order.isPaid}}Status: PENDING{{/if}}
`;

const result = TemplateLite.render(template, context);
console.log(result);
```

---

## 5️⃣ 自定义配置

### 更改分隔符

```typescript
const engine = createTemplate({
  delimiterStart: '<%',
  delimiterEnd: '%>'
});

const result = engine.render('Hello, <% name %>!', { name: 'Dave' });
console.log(result);
// 输出："Hello, Dave!"
```

### 处理未定义变量

```typescript
// 默认行为：忽略未定义变量 (替换为空字符串)
const engine1 = createTemplate({ ignoreUndefined: true });
const result1 = engine1.render('Hello, {{name}}!', {});
console.log(result1);
// 输出："Hello, !"

// 严格模式：保留原始标记
const engine2 = createTemplate({ ignoreUndefined: false });
const result2 = engine2.render('Hello, {{name}}!', {});
console.log(result2);
// 输出："Hello, {{name}}!"
```

---

## 6️⃣ 使用预定义片段

```typescript
import { snippets, template } from './src/skills/template-lite-skill';

// 问候语
console.log(template(snippets.greeting, { name: 'Eve', title: 'CEO' }));
// 输出："Hello, Eve! (CEO)"

// 列表
console.log(template(snippets.list, { items: ['A', 'B', 'C'] }));
// 输出："<ul><li>A</li><li>B</li><li>C</li></ul>"

// 条件消息
console.log(template(snippets.conditionalMessage, { success: true }));
// 输出："Operation completed successfully!"

// 用户卡片
console.log(template(snippets.userCard, { 
  user: { name: 'Frank', email: 'frank@example.com', isAdmin: true } 
}));
```

---

## 7️⃣ 实际应用场景

### 邮件模板

```typescript
const emailContext = {
  recipientName: 'Sarah',
  companyName: 'TechCorp',
  verificationCode: 'ABC123',
  expiryHours: 24
};

const emailTemplate = `
Dear {{recipientName}},

Thank you for joining {{companyName}}!

Your verification code is: {{verificationCode}}

This code will expire in {{expiryHours}} hours.

Best regards,
The {{companyName}} Team
`;

const email = TemplateLite.render(emailTemplate, emailContext);
```

### 日志格式化

```typescript
const logContext = {
  timestamp: '2026-03-13 18:30:00',
  level: 'ERROR',
  service: 'api-gateway',
  message: 'Connection timeout',
  details: {
    retryCount: 3,
    lastError: 'ETIMEDOUT'
  }
};

const logTemplate = `[{{timestamp}}] {{level}} [{{service}}] {{message}}` +
  `{{#if details.retryCount}} (Retries: {{details.retryCount}}){{/if}}` +
  `{{#if details.lastError}} (Last Error: {{details.lastError}}){{/if}}`;

const logEntry = TemplateLite.render(logTemplate, logContext);
console.log(logEntry);
// 输出："[2026-03-13 18:30:00] ERROR [api-gateway] Connection timeout (Retries: 3) (Last Error: ETIMEDOUT)"
```

### HTML 报表生成

```typescript
const reportContext = {
  reportTitle: 'Monthly Sales Report',
  generatedAt: '2026-03-13',
  metrics: [
    { name: 'Revenue', value: '$125,000', trend: 'up' },
    { name: 'Orders', value: '1,234', trend: 'up' },
    { name: 'Returns', value: '45', trend: 'down' }
  ],
  topProducts: ['Product A', 'Product B', 'Product C']
};

const reportTemplate = `
<!DOCTYPE html>
<html>
<head><title>{{reportTitle}}</title></head>
<body>
  <h1>{{reportTitle}}</h1>
  <p>Generated: {{generatedAt}}</p>
  
  <h2>Key Metrics</h2>
  <table>
    {{#each metrics}}
      <tr>
        <td>{{this.name}}</td>
        <td>{{this.value}}</td>
        <td>{{#if this.trend == "up"}}📈{{/if}}{{#if this.trend == "down"}}📉{{/if}}</td>
      </tr>
    {{/each}}
  </table>
  
  <h2>Top Products</h2>
  <ol>
    {{#each topProducts}}
      <li>{{this}}</li>
    {{/each}}
  </ol>
</body>
</html>
`;

const htmlReport = TemplateLite.render(reportTemplate, reportContext);
```

---

## ⚡ 性能提示

1. **复用实例**: 对于多次渲染，创建一次 `TemplateLite` 实例并重复使用
2. **避免深层嵌套**: 嵌套循环超过 3 层可能影响性能
3. **缓存模板**: 对于复杂模板，考虑缓存渲染结果

```typescript
// 推荐做法
const engine = new TemplateLite();
const results = data.map(item => engine.render(template, item));

// 不推荐 (每次都创建新实例)
const results = data.map(item => TemplateLite.render(template, item));
```

---

## 📝 API 参考

### 类方法

| 方法 | 参数 | 返回值 | 描述 |
|------|------|--------|------|
| `render(template, context)` | `string`, `TemplateContext` | `string` | 渲染模板 |
| `constructor(options)` | `TemplateLiteOptions` | - | 创建实例 |

### 静态方法

| 方法 | 参数 | 返回值 | 描述 |
|------|------|--------|------|
| `TemplateLite.render(template, context)` | `string`, `TemplateContext` | `string` | 快速渲染 |

### 快捷函数

| 函数 | 参数 | 返回值 | 描述 |
|------|------|--------|------|
| `template(template, context)` | `string`, `TemplateContext` | `string` | 渲染别名 |
| `createTemplate(options)` | `TemplateLiteOptions` | `TemplateLite` | 创建自定义实例 |

### 选项类型

```typescript
interface TemplateLiteOptions {
  delimiterStart?: string;      // 默认："{{"
  delimiterEnd?: string;        // 默认："}}"
  ignoreUndefined?: boolean;    // 默认：true
}
```

---

**完成时间:** 5 分钟内 ✅  
**状态:** 交付就绪
