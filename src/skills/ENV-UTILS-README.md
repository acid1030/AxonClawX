# 环境变量工具技能 - ENV-UTILS-SKILL

**版本:** 1.0.0  
**作者:** Axon  
**功能:** 环境变量管理 (读取/验证/加载)

---

## 📦 功能概述

### 1. 环境变量读取
从 `.env` 文件读取环境变量，支持自定义路径和多环境配置。

### 2. 环境变量验证
验证环境变量是否符合指定的类型、格式、范围等规则。

### 3. 环境变量加载
将 `.env` 文件加载到 `process.env` 中。

---

## 🚀 快速开始

### 安装依赖

无需额外依赖，使用 Node.js 原生 `fs` 和 `path` 模块。

### 基本使用

```typescript
import {
  readEnvFile,
  validateEnvVars,
  loadEnvVars,
  getEnvVar,
  getEnvVars,
} from './src/skills/env-utils-skill';
```

---

## 📖 API 文档

### 1. readEnvFile(envPath?)

从 `.env` 文件读取环境变量。

**参数:**
- `envPath` (可选): .env 文件路径，默认为当前工作目录的 `.env`

**返回:**
- `Record<string, string>`: 解析后的环境变量对象

**示例:**
```typescript
// 从默认路径读取
const env = readEnvFile();

// 从指定路径读取
const prodEnv = readEnvFile('./.env.production');
```

---

### 2. validateEnvVars(schema, source?)

验证环境变量是否符合指定的规则。

**参数:**
- `schema`: 验证规则 schema
- `source` (可选): 环境变量来源，默认为 `process.env`

**返回:**
- `EnvValidationResult`: 验证结果
  - `success`: 是否成功
  - `errors`: 错误列表
  - `env`: 验证后的环境变量

**示例:**
```typescript
const result = validateEnvVars({
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
});

if (!result.success) {
  console.error('验证失败:', result.errors);
} else {
  console.log('验证通过:', result.env);
}
```

---

### 3. loadEnvVars(options?)

将 `.env` 文件加载到 `process.env` 中。

**参数:**
- `options` (可选): 加载选项
  - `envPath`: .env 文件路径
  - `override`: 是否覆盖现有环境变量，默认 `false`

**返回:**
- `success`: 是否成功
- `loaded`: 加载的变量
- `error` (可选): 错误信息

**示例:**
```typescript
const result = loadEnvVars({
  envPath: './.env.production',
  override: true,
});

if (result.success) {
  console.log(`加载了 ${Object.keys(result.loaded).length} 个变量`);
}
```

---

### 4. getEnvVar(key, defaultValue?, type?)

获取单个环境变量 (带类型转换)。

**参数:**
- `key`: 环境变量名
- `defaultValue` (可选): 默认值
- `type` (可选): 目标类型，默认 `'string'`

**返回:**
- 转换后的值

**示例:**
```typescript
const port = getEnvVar('PORT', 3000, 'number');
const debug = getEnvVar('DEBUG', false, 'boolean');
const url = getEnvVar('API_URL', 'http://localhost:3000');
```

---

### 5. getEnvVars(keys)

批量获取环境变量。

**参数:**
- `keys`: 环境变量名列表

**返回:**
- `Record<string, string | undefined>`: 包含所有请求变量的对象

**示例:**
```typescript
const { DATABASE_URL, PORT, DEBUG } = getEnvVars([
  'DATABASE_URL',
  'PORT',
  'DEBUG',
]);
```

---

## 🔧 验证类型

支持以下验证类型:

| 类型 | 描述 | 示例 |
|------|------|------|
| `string` | 字符串 | `"hello"` |
| `number` | 数字 | `42` |
| `boolean` | 布尔值 | `true/false` |
| `url` | URL 地址 | `"https://example.com"` |
| `email` | 邮箱地址 | `"test@example.com"` |
| `port` | 端口号 (1-65535) | `3000` |
| `path` | 文件路径 | `"/usr/local/bin"` |

---

## 📋 验证规则

### 完整规则示例

```typescript
const schema = {
  // 必填字符串
  API_KEY: {
    type: 'string',
    required: true,
  },
  
  // 带正则验证的字符串
  API_KEY_FORMAT: {
    type: 'string',
    pattern: /^[a-zA-Z0-9]{32}$/,
    errorMessage: 'API_KEY 必须是 32 位字母数字组合',
  },
  
  // 带范围的数字
  MAX_CONNECTIONS: {
    type: 'number',
    min: 1,
    max: 100,
    default: 10,
  },
  
  // 枚举值
  LOG_LEVEL: {
    type: 'string',
    enum: ['debug', 'info', 'warn', 'error'],
    default: 'info',
  },
  
  // 自定义验证
  CUSTOM_FIELD: {
    type: 'string',
    validate: (value) => value.length >= 10,
    errorMessage: '值必须至少 10 个字符',
  },
  
  // URL 验证
  DATABASE_URL: {
    type: 'url',
    required: true,
  },
  
  // 邮箱验证
  ADMIN_EMAIL: {
    type: 'email',
    required: true,
  },
  
  // 端口验证
  SERVER_PORT: {
    type: 'port',
    min: 1024,
    max: 65535,
    default: 3000,
  },
};
```

---

## 🎯 实际应用场景

### 场景 1: 应用启动配置验证

```typescript
import { loadEnvVars, validateEnvVars } from './src/skills/env-utils-skill';

async function startApp() {
  // 1. 加载环境变量
  const loadResult = loadEnvVars();
  if (!loadResult.success) {
    console.warn('⚠️  警告：无法加载 .env 文件');
  }
  
  // 2. 验证配置
  const configSchema = {
    NODE_ENV: {
      type: 'string',
      enum: ['development', 'production', 'test'],
      default: 'development',
    },
    PORT: {
      type: 'port',
      default: 3000,
    },
    DATABASE_URL: {
      type: 'url',
      required: true,
    },
    JWT_SECRET: {
      type: 'string',
      required: true,
      pattern: /^.{32,}$/,
    },
  };
  
  const config = validateEnvVars(configSchema);
  
  if (!config.success) {
    console.error('❌ 配置验证失败:');
    config.errors.forEach(err => {
      console.error(`  - ${err.variable}: ${err.message}`);
    });
    process.exit(1);
  }
  
  // 3. 使用配置启动应用
  console.log('✅ 配置验证通过，启动应用...');
  console.log(`环境：${config.env.NODE_ENV}`);
  console.log(`端口：${config.env.PORT}`);
  
  // startServer(config.env);
}

startApp();
```

---

### 场景 2: 多环境配置切换

```typescript
import { readEnvFile } from './src/skills/env-utils-skill';

const env = process.env.NODE_ENV || 'development';
const envConfig = readEnvFile(`./.env.${env}`);

console.log(`加载 ${env} 环境配置`);
console.log(`变量数：${Object.keys(envConfig).length}`);
```

---

### 场景 3: 敏感信息验证

```typescript
import { validateEnvVars } from './src/skills/env-utils-skill';

const sensitiveSchema = {
  API_KEY: {
    type: 'string',
    required: true,
    pattern: /^[a-zA-Z0-9]{32,64}$/,
  },
  JWT_SECRET: {
    type: 'string',
    required: true,
    validate: (value) => value.length >= 32,
  },
  ENCRYPTION_KEY: {
    type: 'string',
    required: true,
    pattern: /^[a-fA-F0-9]{64}$/,
  },
};

const result = validateEnvVars(sensitiveSchema);

if (!result.success) {
  console.error('❌ 敏感信息配置错误:');
  result.errors.forEach(err => {
    console.error(`  - ${err.variable}: ${err.message}`);
  });
  process.exit(1);
}

console.log('✅ 所有敏感信息验证通过');
```

---

## 🧪 运行示例

```bash
# 运行主技能示例
npx ts-node src/skills/env-utils-skill.ts

# 运行完整使用示例
npx ts-node src/skills/env-utils-skill.examples.ts
```

---

## 📝 错误处理

验证错误类型:

| 错误类型 | 描述 |
|----------|------|
| `missing` | 缺少必填变量 |
| `type` | 类型不匹配 |
| `range` | 超出范围 |
| `pattern` | 格式不符合正则 |
| `enum` | 不在枚举值中 |
| `custom` | 自定义验证失败 |

---

## 🔐 安全建议

1. **不要提交敏感信息**: 将 `.env` 添加到 `.gitignore`
2. **使用示例文件**: 提交 `.env.example` 作为模板
3. **验证敏感字段**: 使用 `pattern` 或 `validate` 确保格式正确
4. **最小权限原则**: 只加载必需的变量

---

## 📄 许可证

MIT License

---

**最后更新:** 2026-03-13  
**维护者:** Axon
