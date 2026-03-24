# Email Utils Skill - 使用示例

邮箱验证处理工具使用示例，包含格式验证、MX 记录检查和临时邮箱检测。

---

## 📦 导入模块

```typescript
import {
  validateEmailFormat,
  checkMxRecords,
  isDisposableEmail,
  validateEmail,
  validateEmails,
  addDisposableDomains,
} from './email-utils-skill';
```

---

## 1️⃣ 邮箱格式验证

### 基础验证

```typescript
// ✅ 有效邮箱
const result1 = validateEmailFormat('user@example.com');
console.log(result1);
// { valid: true }

// ✅ 带点号的用户名
const result2 = validateEmailFormat('john.doe@example.com');
console.log(result2);
// { valid: true }

// ✅ 带加号标签
const result3 = validateEmailFormat('user+newsletter@example.com');
console.log(result3);
// { valid: true }

// ✅ 带下划线和连字符
const result4 = validateEmailFormat('user_name@my-domain.com');
console.log(result4);
// { valid: true }
```

### 无效邮箱示例

```typescript
// ❌ 缺少 @ 符号
const result5 = validateEmailFormat('invalid-email.com');
console.log(result5);
// { valid: false, reason: '邮箱必须包含 @ 符号' }

// ❌ 多个 @ 符号
const result6 = validateEmailFormat('user@@example.com');
console.log(result6);
// { valid: false, reason: '邮箱只能包含一个 @ 符号' }

// ❌ 缺少域名
const result7 = validateEmailFormat('user@');
console.log(result7);
// { valid: false, reason: '邮箱域名部分无效' }

// ❌ 缺少顶级域
const result8 = validateEmailFormat('user@example');
console.log(result8);
// { valid: false, reason: '域名必须包含顶级域 (如 .com)' }

// ❌ 用户名以点号开头
const result9 = validateEmailFormat('.user@example.com');
console.log(result9);
// { valid: false, reason: '邮箱用户名不能以点号开头或结尾' }

// ❌ 连续点号
const result10 = validateEmailFormat('user..name@example.com');
console.log(result10);
// { valid: false, reason: '邮箱用户名不能包含连续的点号' }

// ❌ 邮箱过长
const longEmail = 'a'.repeat(65) + '@example.com';
const result11 = validateEmailFormat(longEmail);
console.log(result11);
// { valid: false, reason: '邮箱用户名部分无效' }
```

### 严格模式

```typescript
// 使用严格模式验证
const result12 = validateEmailFormat('user@example.com', { strict: true });
console.log(result12);
// { valid: true }

// 某些边缘情况在严格模式下会被拒绝
const result13 = validateEmailFormat('user+tag@example.co.uk', { strict: true });
console.log(result13);
// { valid: true }
```

---

## 2️⃣ MX 记录检查

### 基础 MX 查询

```typescript
// 检查完整邮箱
const result1 = await checkMxRecords('test@gmail.com');
console.log(result1);
// {
//   exists: true,
//   records: [
//     { priority: 5, exchange: 'gmail-smtp-in.l.google.com' },
//     { priority: 10, exchange: 'alt1.gmail-smtp-in.l.google.com' },
//     ...
//   ]
// }

// 检查域名
const result2 = await checkMxRecords('example.com');
console.log(result2);
// {
//   exists: true,
//   records: [
//     { priority: 10, exchange: 'mail.example.com' }
//   ]
// }
```

### 无 MX 记录的域名

```typescript
const result = await checkMxRecords('nonexistent-domain-12345.com');
console.log(result);
// {
//   exists: false,
//   error: 'ENOTFOUND: no address for mail'
// }
```

### 自定义超时

```typescript
// 设置 10 秒超时
const result = await checkMxRecords('test@example.com', { timeout: 10000 });
console.log(result);
```

### 实际应用场景

```typescript
// 注册表单验证
async function validateUserEmail(email: string) {
  const mxResult = await checkMxRecords(email);
  
  if (!mxResult.exists) {
    return {
      success: false,
      message: '邮箱域名不存在或无法接收邮件'
    };
  }
  
  return {
    success: true,
    message: `找到 ${mxResult.records?.length || 0} 个邮件服务器`,
    servers: mxResult.records
  };
}

// 使用示例
const validation = await validateUserEmail('user@company.com');
console.log(validation);
```

---

## 3️⃣ 临时邮箱检测

### 检测已知临时邮箱

```typescript
// ✅ 检测 Mailinator
const result1 = isDisposableEmail('test@mailinator.com');
console.log(result1);
// {
//   isDisposable: true,
//   domain: 'mailinator.com',
//   confidence: 'high'
// }

// ✅ 检测 Guerrilla Mail
const result2 = isDisposableEmail('user@guerrillamail.com');
console.log(result2);
// {
//   isDisposable: true,
//   domain: 'guerrillamail.com',
//   confidence: 'high'
// }

// ✅ 检测 YOPmail
const result3 = isDisposableEmail('test@yopmail.com');
console.log(result3);
// {
//   isDisposable: true,
//   domain: 'yopmail.com',
//   confidence: 'high'
// }

// ✅ 检测 10 分钟邮箱
const result4 = isDisposableEmail('user@10minutemail.com');
console.log(result4);
// {
//   isDisposable: true,
//   domain: '10minutemail.com',
//   confidence: 'high'
// }
```

### 正常邮箱

```typescript
// ✅ Gmail
const result5 = isDisposableEmail('user@gmail.com');
console.log(result5);
// {
//   isDisposable: false,
//   domain: 'gmail.com',
//   confidence: 'high'
// }

// ✅ Outlook
const result6 = isDisposableEmail('user@outlook.com');
console.log(result6);
// {
//   isDisposable: false,
//   domain: 'outlook.com',
//   confidence: 'high'
// }

// ✅ 企业邮箱
const result7 = isDisposableEmail('employee@company.com');
console.log(result7);
// {
//   isDisposable: false,
//   domain: 'company.com',
//   confidence: 'high'
// }
```

### 模式匹配检测

```typescript
// 包含可疑关键词的域名
const result8 = isDisposableEmail('user@temp-mail-service.com');
console.log(result8);
// {
//   isDisposable: true,
//   domain: 'temp-mail-service.com',
//   confidence: 'low'
// }
```

---

## 4️⃣ 完整邮箱验证

### 执行所有验证

```typescript
const result = await validateEmail('user@gmail.com');
console.log(result);
// {
//   email: 'user@gmail.com',
//   formatValid: true,
//   mxExists: true,
//   mxRecords: [
//     { priority: 5, exchange: 'gmail-smtp-in.l.google.com' },
//     ...
//   ],
//   isDisposable: false,
//   timestamp: 1234567890123
// }
```

### 验证失败示例

```typescript
// 格式错误
const result1 = await validateEmail('invalid-email');
console.log(result1);
// {
//   email: 'invalid-email',
//   formatValid: false,
//   timestamp: 1234567890123,
//   error: '邮箱必须包含 @ 符号'
// }

// 临时邮箱
const result2 = await validateEmail('test@mailinator.com');
console.log(result2);
// {
//   email: 'test@mailinator.com',
//   formatValid: true,
//   mxExists: true,
//   mxRecords: [...],
//   isDisposable: true,
//   timestamp: 1234567890123
// }
```

### 自定义验证选项

```typescript
// 跳过 MX 检查 (加快速度)
const result1 = await validateEmail('user@example.com', {
  checkMx: false,
  checkDisposable: true
});

// 跳过临时邮箱检查
const result2 = await validateEmail('user@example.com', {
  checkMx: true,
  checkDisposable: false
});

// 严格模式 + 自定义超时
const result3 = await validateEmail('user@example.com', {
  strict: true,
  checkMx: true,
  checkDisposable: true,
  timeout: 10000
});
```

---

## 5️⃣ 批量验证

### 批量验证邮箱列表

```typescript
const emails = [
  'user1@gmail.com',
  'user2@mailinator.com',
  'invalid-email',
  'user3@company.com',
  'user4@tempmail.com'
];

const results = await validateEmails(emails);

results.forEach((result, index) => {
  console.log(`\n邮箱 ${index + 1}: ${result.email}`);
  console.log(`格式有效：${result.formatValid ? '✅' : '❌'}`);
  console.log(`MX 记录：${result.mxExists ? '✅' : '❌'}`);
  console.log(`临时邮箱：${result.isDisposable ? '⚠️ 是' : '✅ 否'}`);
  
  if (result.error) {
    console.log(`错误：${result.error}`);
  }
});
```

### 批量验证输出示例

```
邮箱 1: user1@gmail.com
格式有效：✅
MX 记录：✅
临时邮箱：✅ 否

邮箱 2: user2@mailinator.com
格式有效：✅
MX 记录：✅
临时邮箱：⚠️ 是

邮箱 3: invalid-email
格式有效：❌
错误：邮箱必须包含 @ 符号

邮箱 4: user3@company.com
格式有效：✅
MX 记录：✅
临时邮箱：✅ 否

邮箱 5: user4@tempmail.com
格式有效：✅
MX 记录：✅
临时邮箱：⚠️ 是
```

### 批量验证选项

```typescript
// 设置并发数为 10
const results = await validateEmails(emails, {
  concurrency: 10,
  checkMx: true,
  checkDisposable: true,
  timeout: 8000
});
```

---

## 6️⃣ 自定义临时邮箱域名库

### 添加自定义域名

```typescript
// 添加已知的临时邮箱域名
addDisposableDomains([
  'custom-temp.com',
  'another-fake-mail.org',
  'my-temporary-email.net'
]);

// 验证时会识别新添加的域名
const result = isDisposableEmail('user@custom-temp.com');
console.log(result);
// {
//   isDisposable: true,
//   domain: 'custom-temp.com',
//   confidence: 'high'
// }
```

### 移除域名

```typescript
// 从临时邮箱库中移除域名
removeDisposableDomains(['custom-temp.com']);

// 验证
const result = isDisposableEmail('user@custom-temp.com');
console.log(result);
// {
//   isDisposable: false,
//   domain: 'custom-temp.com',
//   confidence: 'high'
// }
```

### 查询域名库

```typescript
// 获取域名库大小
const count = getDisposableDomainCount();
console.log(`临时邮箱域名库包含 ${count} 个域名`);

// 检查特定域名
const exists = hasDisposableDomain('mailinator.com');
console.log(`mailinator.com 在库中：${exists}`);
```

---

## 7️⃣ 实际应用场景

### 用户注册验证

```typescript
async function handleUserRegistration(email: string, password: string) {
  // 1. 格式验证
  const formatResult = validateEmailFormat(email);
  if (!formatResult.valid) {
    return {
      success: false,
      error: `邮箱格式错误：${formatResult.reason}`
    };
  }

  // 2. 临时邮箱检测
  const disposableResult = isDisposableEmail(email);
  if (disposableResult.isDisposable) {
    return {
      success: false,
      error: '不支持临时邮箱地址，请使用常用邮箱'
    };
  }

  // 3. MX 记录验证
  const mxResult = await checkMxRecords(email);
  if (!mxResult.exists) {
    return {
      success: false,
      error: '邮箱域名无效，无法接收邮件'
    };
  }

  // 4. 创建用户
  // await createUser(email, password);

  return {
    success: true,
    message: '注册成功',
    mxServers: mxResult.records?.length || 0
  };
}
```

### 邮件营销列表清洗

```typescript
async function cleanEmailList(emails: string[]) {
  console.log(`开始清洗 ${emails.length} 个邮箱...`);
  
  const results = await validateEmails(emails, {
    checkMx: true,
    checkDisposable: true,
    concurrency: 10
  });

  const validEmails = results.filter(r => 
    r.formatValid && 
    r.mxExists && 
    !r.isDisposable
  );

  const stats = {
    total: emails.length,
    valid: validEmails.length,
    invalidFormat: results.filter(r => !r.formatValid).length,
    noMxRecords: results.filter(r => r.formatValid && !r.mxExists).length,
    disposable: results.filter(r => r.isDisposable).length
  };

  return {
    cleanedEmails: validEmails.map(r => r.email),
    stats
  };
}

// 使用示例
const emailList = [
  'user1@gmail.com',
  'test@mailinator.com',
  'invalid',
  'user2@company.com'
];

const cleaned = await cleanEmailList(emailList);
console.log(`清洗完成：${cleaned.stats.valid}/${cleaned.stats.total} 有效`);
```

### API 端点验证器

```typescript
// Express.js 示例
import express from 'express';
import { validateEmail } from './email-utils-skill';

const app = express();

app.post('/api/validate-email', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: '邮箱地址不能为空' });
  }

  try {
    const result = await validateEmail(email, {
      checkMx: true,
      checkDisposable: true,
      timeout: 5000
    });

    res.json({
      email: result.email,
      isValid: result.formatValid && result.mxExists && !result.isDisposable,
      details: {
        formatValid: result.formatValid,
        mxExists: result.mxExists,
        isDisposable: result.isDisposable,
        mxRecords: result.mxRecords?.length || 0
      }
    });
  } catch (error) {
    res.status(500).json({ 
      error: '验证失败',
      message: error instanceof Error ? error.message : '未知错误'
    });
  }
});
```

---

## 📊 性能提示

### 并发控制

```typescript
// ❌ 不推荐：无并发限制
const results = await Promise.all(
  largeEmailList.map(email => validateEmail(email))
);

// ✅ 推荐：使用批量验证 (默认并发 5)
const results = await validateEmails(largeEmailList, {
  concurrency: 10  // 根据需要调整
});
```

### 超时设置

```typescript
// 生产环境建议设置超时
const result = await validateEmail(email, {
  timeout: 5000,  // 5 秒超时
  checkMx: true
});
```

### 缓存优化

```typescript
// 简单的 MX 记录缓存
const mxCache = new Map<string, { records: any[], timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 分钟

async function checkMxWithCache(domain: string) {
  const cached = mxCache.get(domain);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return { exists: true, records: cached.records };
  }

  const result = await checkMxRecords(domain);
  if (result.exists && result.records) {
    mxCache.set(domain, { records: result.records, timestamp: Date.now() });
  }

  return result;
}
```

---

## 🔧 临时邮箱域名库

### 内置支持的临时邮箱服务商

- 10 Minute Mail (10minutemail.com 等)
- Guerrilla Mail (guerrillamail.com 等)
- Mailinator (mailinator.com 等)
- Temp Mail (tempmail.com 等)
- YOPmail (yopmail.com 等)
- Maildrop (maildrop.cc)
- TrashMail (trashmail.com)
- 以及其他 60+ 个常见临时邮箱域名

### 更新域名库

建议定期更新临时邮箱域名库以应对新出现的服务：

```typescript
// 定期添加新发现的临时邮箱域名
addDisposableDomains([
  'new-temp-service.com',
  'another-disposable.net'
]);
```

---

## 📝 注意事项

1. **MX 记录检查需要网络连接** - 离线环境下请设置 `checkMx: false`
2. **临时邮箱库不是 100% 完整** - 新的临时邮箱服务不断出现，建议结合多种检测方式
3. **并发数调整** - 根据网络状况和服务器负载调整 `concurrency` 参数
4. **超时设置** - 生产环境务必设置合理的超时时间
5. **隐私保护** - 不要将用户邮箱发送到第三方验证服务

---

**最后更新:** 2026-03-13  
**版本:** 1.0.0
