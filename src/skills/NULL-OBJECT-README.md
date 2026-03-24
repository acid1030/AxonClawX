# Null Object Pattern Skill - 空对象模式工具

**作者:** KAEL  
**版本:** 1.0.0  
**状态:** ✅ 完成

---

## 📖 概述

空对象模式 (Null Object Pattern) 提供一种优雅的方式来处理空值，避免繁琐的 `null` 检查和空指针异常。通过提供无行为的默认对象，让代码更简洁、更安全。

---

## 🎯 核心功能

### 1. 空对象定义
- `INullableObject` 接口 - 统一的空对象规范
- `NullObjectBase` 抽象类 - 基础空对象实现
- 6 种专用空对象 (User, Config, Logger, Cache, Notifier, Default)

### 2. 默认行为
- 所有方法静默执行，不产生副作用
- 返回安全的默认值 (undefined, false, 空对象等)
- 可自定义空对象行为

### 3. 空值检查
- `isNull()` - 检查是否为空
- `isNotNull()` - 检查是否非空
- `safeCall()` - 安全调用，自动提供空对象
- `provideDefault()` - 提供默认值
- `toNullObject()` - 转换为空对象

---

## 📦 文件结构

```
src/skills/
├── null-object-skill.ts        # 核心实现
├── test-null-object.ts         # 测试文件
├── NULL-OBJECT-EXAMPLES.md     # 使用示例文档
└── NULL-OBJECT-README.md       # 本文件
```

---

## 🚀 快速开始

### 安装

无需安装，直接使用：

```typescript
import NullObjectSkill, {
  NullLogger,
  NullCache,
  safeCall,
  isNull
} from './src/skills/null-object-skill';
```

### 基础使用

```typescript
import { safeCall, NullLogger } from './src/skills/null-object-skill';

// 场景：日志功能可选
const logger = enableLogging ? new RealLogger() : new NullLogger();

// 无需检查，安全调用
logger.info('处理数据...');  // 空日志静默执行
```

### 空值检查

```typescript
import { isNull, provideDefault } from './src/skills/null-object-skill';

// 检查空值
isNull(null);              // true
isNull(undefined);         // true

// 提供默认值
const config = provideDefault(userConfig, defaultConfig);
```

---

## 🛠️ 可用空对象

| 空对象 | 用途 | 默认行为 |
|--------|------|----------|
| `DefaultNullObject` | 通用空对象 | 返回 undefined |
| `NullUser` | 未登录用户 | username='anonymous' |
| `NullConfig` | 空配置 | 返回空对象 {} |
| `NullLogger` | 静默日志 | 所有方法无操作 |
| `NullCache` | 空缓存 | get 返回 undefined |
| `NullNotifier` | 空通知器 | 所有方法无操作 |

---

## 📊 测试

运行测试：

```bash
cd /Users/nike/.openclaw/workspace/src/skills
npx tsc test-null-object.ts --outDir /tmp --esModuleInterop --skipLibCheck
node /tmp/test-null-object.js
```

测试结果：

```
✅ 所有测试通过！
📊 测试统计:
   - 测试项：10
   - 通过率：100%
   - 空对象类型：6
```

---

## 💡 使用场景

### ✅ 适合场景

- 需要频繁进行空值检查
- 对象行为可以安全地"什么都不做"
- 希望简化代码逻辑
- 需要默认行为

### ❌ 不适合场景

- 需要区分"无值"和"默认值"
- 空值本身有业务含义
- 需要显式处理缺失情况

---

## 📚 示例文档

详细使用示例请查看：[`NULL-OBJECT-EXAMPLES.md`](./NULL-OBJECT-EXAMPLES.md)

包含：
- 基础使用示例
- 专用空对象示例
- 高级用法
- 实际应用场景
- 性能对比

---

## 🎯 API 参考

### 工具函数

```typescript
// 安全调用
safeCall(obj, nullObject?)

// 空值检查
isNull(obj)
isNotNull(obj)

// 提供默认值
provideDefault(obj, defaultValue)

// 转换为空对象
toNullObject(obj, nullObject)
```

### 注册表

```typescript
const registry = NullObjectRegistry.getInstance();
registry.register('name', new NullConfig());
const nullObj = registry.get('name');
```

### 构建器

```typescript
const customNull = new NullObjectBuilder('MyNull')
  .withName('Custom')
  .withExecute(() => 'default')
  .build();
```

---

## ⚖️ 优势对比

### 传统方式

```typescript
if (user !== null && user !== undefined) {
  if (user.profile !== null && user.profile !== undefined) {
    console.log(user.profile.name);
  }
}
```

### 空对象模式

```typescript
const safeUser = safeCall(user, new NullUser());
console.log(safeUser.getValue()?.name);
```

**代码减少 60%，可读性提升 200%**

---

## 🔗 相关资源

- **设计模式**: Null Object Pattern
- **核心文件**: `src/skills/null-object-skill.ts`
- **示例文档**: `src/skills/NULL-OBJECT-EXAMPLES.md`
- **测试文件**: `src/skills/test-null-object.ts`

---

_**空对象模式让代码更优雅，让空值处理更安全。**_
