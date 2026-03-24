# Security Utils Skill - 使用示例

## 📦 导入方式

```typescript
// 方式 1: 导入全部
import SecurityUtils from './security-utils-skill';

// 方式 2: 按需导入
import { 
  filterXSS, 
  generateCSRFToken, 
  maskSensitiveData,
  MaskType 
} from './security-utils-skill';
```

---

## 🔒 1. XSS 过滤示例

### 基础用法 - 完全转义

```typescript
import { filterXSS } from './security-utils-skill';

const userInput = '<script>alert("XSS Attack!")</script>';
const safeOutput = filterXSS(userInput);

console.log(safeOutput);
// 输出: &lt;script&gt;alert(&quot;XSS Attack!&quot;)&lt;/script&gt;
```

### 允许部分 HTML 标签

```typescript
const userInput = '<p>Hello <b>World</b> <script>evil()</script></p>';
const safeOutput = filterXSS(userInput, {
  allowHTML: true,
  allowedTags: ['p', 'b', 'i', 'strong', 'em'],
  removeComments: true
});

console.log(safeOutput);
// 输出: <p>Hello <b>World</b> </p>
```

### 移除危险属性

```typescript
const userInput = '<img src="image.jpg" onerror="alert(1)" onclick="steal()">';
const safeOutput = filterXSS(userInput, {
  allowHTML: true,
  allowedTags: ['img']
});

console.log(safeOutput);
// 输出: <img src="image.jpg">
```

### 实际应用场景 - 评论系统

```typescript
function saveUserComment(comment: string) {
  // 过滤 XSS
  const safeComment = filterXSS(comment, {
    allowHTML: true,
    allowedTags: ['p', 'br', 'b', 'i', 'a'],
    removeComments: true
  });
  
  // 保存到数据库
  database.comments.create({
    content: safeComment,
    createdAt: new Date()
  });
}
```

---

## 🎫 2. CSRF Token 示例

### 生成 Token

```typescript
import { generateCSRFToken } from './security-utils-skill';

// 基础用法
const token = generateCSRFToken();
console.log(token);
// 输出: csrf_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6...

// 自定义长度 (更安全)
const longToken = generateCSRFToken({ length: 64 });

// 不使用前缀
const rawToken = generateCSRFToken({ addPrefix: false });
```

### 在表单中使用

```typescript
// 后端：生成并存储 Token
const csrfToken = generateCSRFToken();
session.csrfToken = csrfToken;

// 渲染表单
res.render('form', { csrfToken });
```

```html
<!-- 前端：表单中包含 Token -->
<form action="/submit" method="POST">
  <input type="hidden" name="csrf_token" value="<%= csrfToken %>">
  <input type="text" name="username">
  <button type="submit">提交</button>
</form>
```

### 验证 Token

```typescript
import { validateCSRFToken } from './security-utils-skill';

// 中间件：验证 CSRF Token
function csrfProtection(req, res, next) {
  const submittedToken = req.body.csrf_token || req.headers['x-csrf-token'];
  const expectedToken = req.session.csrfToken;
  
  if (!validateCSRFToken(submittedToken, expectedToken)) {
    return res.status(403).json({ error: 'CSRF token validation failed' });
  }
  
  next();
}

// 使用中间件
app.post('/submit', csrfProtection, (req, res) => {
  // 处理表单提交
  res.json({ success: true });
});
```

### API 请求示例

```typescript
// 前端：在请求头中携带 Token
async function apiRequest(url, data) {
  const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken
    },
    body: JSON.stringify(data)
  });
  
  return response.json();
}
```

---

## 🎭 3. 敏感数据脱敏示例

### 手机号脱敏

```typescript
import { maskSensitiveData, MaskType } from './security-utils-skill';

const phone = '13812345678';
const masked = maskSensitiveData(phone, { type: MaskType.PHONE });

console.log(masked);
// 输出: 138****5678
```

### 邮箱脱敏

```typescript
const email = 'zhangsan@example.com';
const masked = maskSensitiveData(email, { 
  type: MaskType.EMAIL,
  keepPrefix: 1 
});

console.log(masked);
// 输出: z*******@example.com
```

### 身份证号脱敏

```typescript
const idCard = '110101199001011234';
const masked = maskSensitiveData(idCard, { 
  type: MaskType.ID_CARD,
  keepPrefix: 6,
  keepSuffix: 4 
});

console.log(masked);
// 输出: 110101**********1234
```

### 银行卡号脱敏

```typescript
const bankCard = '6222021234567890123';
const masked = maskSensitiveData(bankCard, { 
  type: MaskType.BANK_CARD,
  keepPrefix: 4,
  keepSuffix: 4 
});

console.log(masked);
// 输出: 6222***********0123
```

### 姓名脱敏

```typescript
const name1 = '张三';
const name2 = '王小明';
const name3 = '李';

console.log(maskSensitiveData(name1, { type: MaskType.NAME }));
// 输出: 张*

console.log(maskSensitiveData(name2, { type: MaskType.NAME }));
// 输出: 李*明

console.log(maskSensitiveData(name3, { type: MaskType.NAME }));
// 输出: 李 (单字不脱敏)
```

### 批量脱敏对象字段

```typescript
import { maskObjectFields, MaskType } from './security-utils-skill';

const userData = {
  id: 1,
  name: '张三',
  phone: '13812345678',
  email: 'zhangsan@example.com',
  idCard: '110101199001011234',
  address: '北京市朝阳区某某街道 123 号',
  createdAt: '2024-01-01'
};

const maskedData = maskObjectFields(userData, {
  name: { type: MaskType.NAME },
  phone: { type: MaskType.PHONE },
  email: { type: MaskType.EMAIL },
  idCard: { type: MaskType.ID_CARD },
  address: { type: MaskType.ADDRESS, keepPrefix: 4, keepSuffix: 3 }
});

console.log(maskedData);
/*
输出:
{
  id: 1,
  name: '张*明',
  phone: '138****5678',
  email: 'z*******@example.com',
  idCard: '110101**********1234',
  address: '北京***********123 号',
  createdAt: '2024-01-01'
}
*/
```

### 自定义脱敏规则

```typescript
const creditCard = '1234-5678-9012-3456';
const masked = maskSensitiveData(creditCard, {
  type: MaskType.CUSTOM,
  customMask: (val) => {
    // 只保留最后 4 位
    return '****-****-****-' + val.slice(-4);
  }
});

console.log(masked);
// 输出: ****-****-****-3456
```

---

## 🚀 实际应用场景

### 场景 1: 用户信息 API 响应

```typescript
// 控制器：返回用户信息时自动脱敏
app.get('/api/user/:id', async (req, res) => {
  const user = await database.users.findById(req.params.id);
  
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  // 脱敏敏感信息
  const safeUser = maskObjectFields(user, {
    phone: { type: MaskType.PHONE },
    email: { type: MaskType.EMAIL },
    idCard: { type: MaskType.ID_CARD }
  });
  
  res.json(safeUser);
});
```

### 场景 2: 日志记录脱敏

```typescript
// 日志中间件：记录请求时脱敏敏感数据
function logRequest(req, res, next) {
  const safeBody = maskObjectFields(req.body, {
    password: { type: MaskType.CUSTOM, customMask: () => '***' },
    phone: { type: MaskType.PHONE },
    email: { type: MaskType.EMAIL }
  });
  
  logger.info('Request received', {
    path: req.path,
    method: req.method,
    body: safeBody
  });
  
  next();
}
```

### 场景 3: 富文本编辑器内容过滤

```typescript
// 保存文章时过滤 XSS
app.post('/api/articles', async (req, res) => {
  const { title, content } = req.body;
  
  // 过滤内容中的 XSS
  const safeContent = filterXSS(content, {
    allowHTML: true,
    allowedTags: ['p', 'br', 'b', 'i', 'u', 'strong', 'em', 'a', 'ul', 'ol', 'li', 'img'],
    removeComments: true
  });
  
  const article = await database.articles.create({
    title: filterXSS(title), // 标题不允许 HTML
    content: safeContent,
    authorId: req.user.id
  });
  
  res.json(article);
});
```

### 场景 4: 表单提交保护

```typescript
// Express 中间件组合
import express from 'express';
import { generateCSRFToken, validateCSRFToken, filterXSS } from './security-utils-skill';

const router = express.Router();

// 生成 CSRF Token
router.get('/form', (req, res) => {
  const csrfToken = generateCSRFToken();
  req.session.csrfToken = csrfToken;
  
  res.render('form', { csrfToken });
});

// 处理表单提交
router.post('/submit', (req, res) => {
  // 1. 验证 CSRF Token
  const submittedToken = req.body.csrf_token;
  if (!validateCSRFToken(submittedToken, req.session.csrfToken)) {
    return res.status(403).json({ error: 'Invalid CSRF token' });
  }
  
  // 2. 过滤 XSS
  const safeData = {
    username: filterXSS(req.body.username),
    comment: filterXSS(req.body.comment, { allowHTML: true })
  };
  
  // 3. 处理业务逻辑
  // ...
  
  res.json({ success: true });
});
```

---

## ⚠️ 注意事项

1. **XSS 过滤**
   - 永远不要信任用户输入
   - 输出到 HTML 时必须转义
   - 允许 HTML 标签时要严格限制白名单

2. **CSRF Token**
   - 每个会话使用不同的 Token
   - Token 应该定期轮换
   - 使用 HTTPS 传输 Token

3. **数据脱敏**
   - 脱敏不可逆，原始数据需安全存储
   - 根据业务需求调整脱敏策略
   - 日志中的敏感数据必须脱敏

---

## 📝 完整示例项目

```typescript
// app.ts
import express from 'express';
import session from 'express-session';
import {
  generateCSRFToken,
  validateCSRFToken,
  filterXSS,
  maskObjectFields,
  MaskType
} from './security-utils-skill';

const app = express();

app.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: true
}));

app.use(express.json());

// CSRF 保护中间件
app.use((req, res, next) => {
  if (!req.session.csrfToken) {
    req.session.csrfToken = generateCSRFToken();
  }
  res.locals.csrfToken = req.session.csrfToken;
  next();
});

// 用户注册接口
app.post('/api/register', (req, res) => {
  // 验证 CSRF
  if (!validateCSRFToken(req.body.csrf_token, req.session.csrfToken)) {
    return res.status(403).json({ error: 'CSRF validation failed' });
  }
  
  // 过滤输入
  const safeData = {
    username: filterXSS(req.body.username),
    email: filterXSS(req.body.email),
    phone: filterXSS(req.body.phone)
  };
  
  // 创建用户
  const user = createUser(safeData);
  
  // 返回脱敏后的用户信息
  const safeUser = maskObjectFields(user, {
    phone: { type: MaskType.PHONE },
    email: { type: MaskType.EMAIL }
  });
  
  res.json(safeUser);
});

// 获取用户信息接口
app.get('/api/user/:id', (req, res) => {
  const user = getUserById(req.params.id);
  
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  // 脱敏敏感信息
  const safeUser = maskObjectFields(user, {
    phone: { type: MaskType.PHONE },
    email: { type: MaskType.EMAIL },
    idCard: { type: MaskType.ID_CARD }
  });
  
  res.json(safeUser);
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
```

---

**版本:** 1.0.0  
**作者:** AxonClaw Security Team  
**更新时间:** 2026-03-13
