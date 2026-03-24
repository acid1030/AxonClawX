# 📦 Storage Utils - 本地存储工具技能

**位置:** `src/skills/storage-utils-skill.ts`

功能完备的浏览器本地存储封装，支持 localStorage 和 sessionStorage，自带过期时间管理。

---

## ✨ 核心功能

- ✅ **localStorage 封装** - 类型安全的本地存储操作
- ✅ **sessionStorage 封装** - 会话级存储支持
- ✅ **过期时间支持** - 自动清理过期数据
- ✅ **命名空间** - 避免键名冲突
- ✅ **批量操作** - 高效处理多个数据
- ✅ **存储分析** - 查看使用量和键名列表

---

## 🚀 快速开始

### 基础使用

```typescript
import { StorageUtils } from '@/skills/storage-utils-skill';

// 存储数据
StorageUtils.setItem('username', 'Axon');

// 读取数据
const username = StorageUtils.getItem<string>('username');
console.log(username); // 'Axon'

// 删除数据
StorageUtils.removeItem('username');

// 检查是否存在
const exists = StorageUtils.hasItem('username');
```

### 使用快捷方法

```typescript
import { local, session } from '@/skills/storage-utils-skill';

// localStorage 快捷操作
local.set('theme', 'dark');
const theme = local.get<string>('theme');

// sessionStorage 快捷操作
session.set('tempData', { foo: 'bar' });
const data = session.get<{ foo: string }>('tempData');
```

---

## ⏰ 过期时间管理

### 方式一：指定毫秒数

```typescript
// 1 小时后过期
local.set('token', 'abc123', { expiry: 60 * 60 * 1000 });

// 24 小时后过期
local.set('cache', data, { expiry: 24 * 60 * 60 * 1000 });
```

### 方式二：人类可读时间字符串

```typescript
// 支持单位：s (秒), m (分), h (时), d (天), w (周), y (年)

local.set('session', 'user123', { expiresIn: '1h' });    // 1 小时
local.set('config', config, { expiresIn: '2d' });        // 2 天
local.set('temp', value, { expiresIn: '30m' });          // 30 分钟
local.set('weekly', data, { expiresIn: '1w' });          // 1 周
```

### 检查和管理过期时间

```typescript
// 获取过期时间戳
const expiry = local.getExpiry('token');
console.log(expiry); // 1710345600000

// 更新过期时间 (设为永不过期)
local.updateExpiry('token', null);

// 延长过期时间
local.extendExpiry('token', '1h');  // 延长 1 小时
local.extendExpiry('token', 3600000); // 延长 1 小时 (毫秒)

// 清理所有过期数据
const cleaned = local.cleanup();
console.log(`清理了 ${cleaned} 条过期数据`);
```

---

## 📁 命名空间

避免键名冲突，推荐在大型项目中使用。

```typescript
// 设置命名空间
local.set('user', userData, undefined, 'app');
local.set('config', configData, undefined, 'app');

// 读取时需要相同的命名空间
const user = local.get<User>('user', 'app');

// 清空特定命名空间
local.clear('app');  // 只清空 'app:' 开头的键

// 获取特定命名空间的键
const appKeys = local.keys('app');  // ['user', 'config']
```

---

## 📊 批量操作

```typescript
// 批量设置
StorageUtils.setItems({
  name: 'Axon',
  role: 'Admin',
  level: 99,
}, { expiresIn: '1d' });

// 批量获取
const data = StorageUtils.getItems(['name', 'role', 'level']);
console.log(data);
// { name: 'Axon', role: 'Admin', level: 99 }

// 批量删除
StorageUtils.removeItems(['name', 'role', 'level']);
```

---

## 🔍 存储分析

```typescript
// 获取存储信息
const info = local.info();
console.log(info);
// {
//   count: 15,
//   usageBytes: 2048,
//   keys: ['user', 'config', 'theme', ...]
// }

// 获取使用量
const bytes = StorageUtils.getStorageUsage('local');
console.log(`使用了 ${bytes} 字节`);

// 获取所有键名
const allKeys = local.keys();
const sessionKeys = session.keys();
```

---

## 🛡️ 错误处理

```typescript
try {
  local.set('largeData', hugeObject);
} catch (error) {
  if (error.message.includes('quota')) {
    console.log('存储配额已满，清理过期数据...');
    local.cleanup();
    // 重试...
  }
}
```

---

## 💡 实用场景

### 1. 用户 Token 管理

```typescript
// 登录时存储 token (7 天过期)
local.set('auth_token', token, { expiresIn: '7d' });

// 请求时获取 token
const token = local.get<string>('auth_token');
if (!token) {
  // token 不存在或已过期，跳转登录
  redirectToLogin();
}

// 刷新 token 时延长过期时间
local.extendExpiry('auth_token', '7d');
```

### 2. API 响应缓存

```typescript
// 缓存 API 响应 (5 分钟)
const cacheKey = `api:${endpoint}`;
const cached = local.get(cacheKey, 'cache');

if (cached) {
  return cached;
}

const data = await fetchAPI(endpoint);
local.set(cacheKey, data, { expiresIn: '5m' }, 'cache');
return data;
```

### 3. 临时表单数据

```typescript
// 保存表单草稿 (会话级别)
session.set('form_draft', formData, undefined, 'forms');

// 页面刷新后恢复
const draft = session.get<Form>('form_draft', 'forms');
if (draft) {
  restoreForm(draft);
}

// 提交后清除
session.remove('form_draft', 'forms');
```

### 4. 主题和偏好设置

```typescript
// 永久存储偏好 (不过期)
local.set('theme', 'dark');
local.set('language', 'zh-CN');
local.set('fontSize', 14);

// 读取偏好
const theme = local.get<string>('theme') ?? 'light';
applyTheme(theme);
```

### 5. 功能开关 (Feature Flags)

```typescript
// 设置功能开关 (24 小时测试期)
local.set('feature_new_ui', true, { expiresIn: '24h' }, 'flags');

// 检查功能是否开启
const isNewUIEnabled = local.get<boolean>('feature_new_ui', 'flags');
if (isNewUIEnabled) {
  renderNewUI();
}
```

---

## 📝 API 参考

### 核心方法

| 方法 | 描述 | 参数 | 返回值 |
|------|------|------|--------|
| `setItem` | 存储数据 | key, value, options?, type?, namespace? | void |
| `getItem` | 获取数据 | key, type?, namespace? | T \| undefined |
| `removeItem` | 删除数据 | key, type?, namespace? | void |
| `hasItem` | 检查存在 | key, type?, namespace? | boolean |

### 过期时间管理

| 方法 | 描述 | 参数 | 返回值 |
|------|------|------|--------|
| `getExpiry` | 获取过期时间 | key, type?, namespace? | number \| undefined |
| `updateExpiry` | 更新过期时间 | key, expiry, type?, namespace? | void |
| `extendExpiry` | 延长过期时间 | key, extension, type?, namespace? | void |

### 批量操作

| 方法 | 描述 | 参数 | 返回值 |
|------|------|------|--------|
| `setItems` | 批量设置 | items, options?, type?, namespace? | void |
| `getItems` | 批量获取 | keys, type?, namespace? | Record<string, T> |
| `removeItems` | 批量删除 | keys, type?, namespace? | void |
| `clear` | 清空存储 | type?, namespace? | void |

### 清理和分析

| 方法 | 描述 | 参数 | 返回值 |
|------|------|------|--------|
| `cleanupExpired` | 清理过期数据 | type?, namespace? | number |
| `keys` | 获取所有键名 | type?, namespace? | string[] |
| `getStorageUsage` | 获取使用量 | type? | number |
| `getInfo` | 获取存储信息 | type?, namespace? | StorageInfo |

### 工具函数

| 方法 | 描述 | 参数 | 返回值 |
|------|------|------|--------|
| `parseTimeStr` | 解析时间字符串 | timeStr | number |

### 快捷对象

```typescript
// localStorage 快捷方法
local.set, local.get, local.remove, local.has, ...

// sessionStorage 快捷方法
session.set, session.get, session.remove, session.has, ...
```

---

## ⚠️ 注意事项

1. **浏览器环境** - 仅在浏览器中可用，服务端会抛出错误
2. **存储限制** - 大多数浏览器限制 5-10MB
3. **数据类型** - 自动 JSON 序列化，不支持循环引用
4. **安全性** - 不要存储敏感信息 (密码、密钥等)
5. **性能** - 大量数据时考虑分批操作

---

## 🎯 最佳实践

```typescript
// ✅ 推荐：使用命名空间
local.set('user', data, undefined, 'app');

// ✅ 推荐：设置过期时间
local.set('cache', data, { expiresIn: '1h' });

// ✅ 推荐：定期清理
local.cleanup();

// ❌ 避免：存储敏感数据
local.set('password', 'secret123');

// ❌ 避免：超大对象
local.set('hugeData', massiveArray);
```

---

**创建时间:** 2026-03-13  
**版本:** 1.0.0  
**作者:** NOVA (Subagent)
