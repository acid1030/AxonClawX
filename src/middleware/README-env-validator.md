# EnvValidator - 环境变量验证中间件

**作者:** Axon  
**版本:** 1.0.0  
**创建时间:** 2026-03-13

---

## 📖 概述

`EnvValidator` 是一个强大的环境变量加载与验证中间件，提供以下核心功能：

- ✅ **.env 文件加载** - 支持多环境配置文件
- ✅ **类型验证** - string/number/boolean/url/email/port/path
- ✅ **必填项检查** - 确保关键配置不缺失
- ✅ **默认值支持** - 可选配置自动填充默认值
- ✅ **范围验证** - 数字/端口的最小最大值限制
- ✅ **格式验证** - 正则表达式匹配
- ✅ **枚举验证** - 限定可选值范围
- ✅ **自定义验证** - 灵活的自定义验证函数
- ✅ **Express 中间件** - 无缝集成 Web 框架

---

## 🚀 快速开始

### 1. 安装依赖

无需额外依赖，使用 Node.js 原生模块。

### 2. 创建 .env 文件

```bash
# 复制示例文件
cp .env.example .env
```

编辑 `.env` 文件，填入实际配置值。

### 3. 基本使用

```typescript
import { EnvValidator } from './middleware/env-validator';

const validator = new EnvValidator({
  schema: {
    DATABASE_URL: {
      type: 'url',
      required: true,
    },
    PORT: {
      type: 'port',
      default: 3000,
    },
    DEBUG: {
      type: 'boolean',
      default: false,
    },
  },
  strict: true, // 验证失败时抛出异常
});

await validator.load();

// 验证后的环境变量已可用
console.log(process.env.DATABASE_URL);
console.log(process.env.PORT);
```

---

## 📋 API 文档

### EnvValidator 类

#### 构造函数选项

```typescript
interface EnvValidatorOptions {
  /** .env 文件路径 (默认：.env) */
  envPath?: string;
  
  /** 验证器 schema */
  schema: EnvValidatorSchema;
  
  /** 是否严格模式 (默认：true) */
  strict?: boolean;
  
  /** 是否覆盖 process.env (默认：true) */
  overrideEnv?: boolean;
}
```

#### 方法

| 方法 | 描述 | 返回值 |
|------|------|--------|
| `load()` | 加载并验证环境变量 | `Promise<EnvValidationResult>` |
| `getEnv()` | 获取已加载的环境变量 | `Record<string, any>` |
| `get(key, default?)` | 获取单个环境变量 | `any` |

### 验证规则类型

```typescript
interface EnvValidationRule {
  /** 变量类型 */
  type: 'string' | 'number' | 'boolean' | 'url' | 'email' | 'port' | 'path';
  
  /** 是否必填 */
  required?: boolean;
  
  /** 默认值 */
  default?: any;
  
  /** 最小值 (number/port) */
  min?: number;
  
  /** 最大值 (number/port) */
  max?: number;
  
  /** 正则表达式 (string) */
  pattern?: RegExp;
  
  /** 枚举值 */
  enum?: any[];
  
  /** 自定义验证函数 */
  validate?: (value: any) => boolean;
  
  /** 错误提示 */
  errorMessage?: string;
}
```

### 验证结果

```typescript
interface EnvValidationResult {
  /** 是否成功 */
  success: boolean;
  
  /** 错误列表 */
  errors: EnvValidationError[];
  
  /** 验证后的环境变量 */
  env: Record<string, any>;
}
```

---

## 💡 使用示例

### 示例 1: 基础验证

```typescript
import { EnvValidator } from './middleware/env-validator';

const validator = new EnvValidator({
  schema: {
    DATABASE_URL: {
      type: 'url',
      required: true,
      errorMessage: '数据库 URL 是必填项',
    },
    DATABASE_PORT: {
      type: 'port',
      default: 5432,
    },
    API_KEY: {
      type: 'string',
      required: true,
      pattern: /^[a-zA-Z0-9]{32}$/,
      errorMessage: 'API_KEY 必须是 32 位字母数字',
    },
  },
});

const result = await validator.load();

if (!result.success) {
  console.error('验证失败:', result.errors);
  process.exit(1);
}
```

### 示例 2: 使用便捷函数

```typescript
import { validateEnv } from './middleware/env-validator';

const result = await validateEnv({
  NODE_ENV: {
    type: 'string',
    enum: ['development', 'production', 'test'],
    required: true,
  },
  PORT: {
    type: 'port',
    default: 3000,
  },
});

if (!result.success) {
  console.error('验证失败:', result.errors);
}
```

### 示例 3: Express 中间件

```typescript
import express from 'express';
import { createEnvMiddleware } from './middleware/env-validator';

const app = express();

// 在应用启动前验证环境变量
app.use(createEnvMiddleware({
  DATABASE_URL: { type: 'url', required: true },
  JWT_SECRET: { type: 'string', required: true },
  REDIS_HOST: { type: 'string', required: true },
  REDIS_PORT: { type: 'port', default: 6379 },
}));

app.get('/', (req, res) => {
  res.json({ message: '应用正常运行' });
});

app.listen(3000, () => {
  console.log('服务器已启动');
});
```

### 示例 4: 自定义验证函数

```typescript
const result = await validateEnv({
  API_VERSION: {
    type: 'string',
    required: true,
    validate: (value) => /^v\d+$/.test(value),
    errorMessage: 'API 版本必须是 v1, v2, v3 等格式',
  },
  TIMEOUT: {
    type: 'number',
    validate: (value) => value % 1000 === 0,
    errorMessage: '超时时间必须是 1000 的倍数',
  },
});
```

### 示例 5: 多环境配置

```typescript
const envFiles = {
  development: '.env.development',
  production: '.env.production',
  test: '.env.test',
};

const currentEnv = process.env.NODE_ENV || 'development';
const envFile = envFiles[currentEnv];

const validator = new EnvValidator({
  envPath: envFile,
  schema: {
    APP_NAME: { type: 'string', required: true },
    APP_VERSION: { type: 'string', required: true },
    // 生产环境特有配置
    ...(currentEnv === 'production' && {
      SSL_ENABLED: { type: 'boolean', required: true },
    }),
  },
});

await validator.load();
```

---

## 🎯 类型验证详解

### String (字符串)

```typescript
{
  type: 'string',
  pattern: /^[a-zA-Z0-9]+$/,  // 可选：正则验证
}
```

### Number (数字)

```typescript
{
  type: 'number',
  min: 0,      // 可选：最小值
  max: 100,    // 可选：最大值
}
```

### Boolean (布尔值)

接受：`true`, `false`, `1`, `0`, `yes`, `no` (不区分大小写)

```typescript
{
  type: 'boolean',
  default: false,
}
```

### URL (网址)

自动验证 URL 格式

```typescript
{
  type: 'url',
  required: true,
}
```

### Email (邮箱)

自动验证邮箱格式

```typescript
{
  type: 'email',
  required: true,
}
```

### Port (端口)

验证范围：1-65535

```typescript
{
  type: 'port',
  default: 3000,
}
```

### Path (路径)

验证文件路径格式

```typescript
{
  type: 'path',
  required: true,
}
```

---

## ⚠️ 错误处理

### 验证错误类型

| 错误类型 | 描述 |
|---------|------|
| `missing` | 必填项缺失 |
| `type` | 类型不匹配 |
| `range` | 超出范围 |
| `pattern` | 格式不匹配 |
| `enum` | 不在枚举值内 |
| `custom` | 自定义验证失败 |

### 错误处理示例

```typescript
try {
  await validator.load();
} catch (error) {
  if (error instanceof EnvValidationErrorClass) {
    console.error('验证错误:', error.message);
    console.error('详细错误:', error.errors);
    
    error.errors.forEach(err => {
      console.log(`${err.variable}: ${err.message}`);
    });
  }
}
```

---

## 📁 文件结构

```
src/middleware/
├── env-validator.ts           # 核心验证器
├── env-validator.example.ts   # 使用示例
└── README-env-validator.md    # 本文档

.env.example                    # 配置文件模板
.env                            # 实际配置文件 (需创建)
```

---

## 🔧 最佳实践

### 1. 在项目启动时验证

```typescript
// src/main.ts
import { EnvValidator } from './middleware/env-validator';

async function bootstrap() {
  const validator = new EnvValidator({
    schema: { /* ... */ },
    strict: true,
  });

  await validator.load(); // 启动前验证

  // 启动应用
  app.listen(3000);
}

bootstrap();
```

### 2. 使用 .env.example 作为模板

```bash
# 复制模板
cp .env.example .env

# 编辑配置
vim .env
```

### 3. 不要提交 .env 到版本控制

```gitignore
# .gitignore
.env
.env.local
.env.*.local
```

### 4. 为不同环境创建不同配置

```bash
.env.development    # 开发环境
.env.test          # 测试环境
.env.production    # 生产环境
```

### 5. 使用默认值减少配置项

```typescript
{
  PORT: { type: 'port', default: 3000 },  // 无需配置
  DEBUG: { type: 'boolean', default: false },  // 默认关闭
}
```

---

## 🧪 测试

运行示例文件：

```bash
cd /Users/nike/.openclaw/workspace
npx ts-node src/middleware/env-validator.example.ts
```

---

## 📝 更新日志

### v1.0.0 (2026-03-13)

- ✅ 初始版本发布
- ✅ 支持 7 种数据类型
- ✅ 必填项检查
- ✅ 默认值支持
- ✅ 范围验证
- ✅ 正则表达式验证
- ✅ 枚举值验证
- ✅ 自定义验证函数
- ✅ Express 中间件集成
- ✅ 多环境配置支持

---

## 🤝 贡献

遵循项目代码规范，提交 PR 前确保：

1. 代码通过 TypeScript 类型检查
2. 添加必要的单元测试
3. 更新文档

---

**最后更新:** 2026-03-13 18:00  
**维护者:** Axon
