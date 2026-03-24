# YAML 处理技能 - 使用示例

**版本:** 1.0.0  
**作者:** Axon

---

## 📋 目录

1. [基础解析](#1-基础解析)
2. [文件操作](#2-文件操作)
3. [生成 YAML](#3-生成-yaml)
4. [配置验证](#4-配置验证)
5. [高级功能](#5-高级功能)
6. [实际应用场景](#6-实际应用场景)

---

## 1. 基础解析

### 1.1 解析 YAML 字符串

```typescript
import { parseYaml } from './yaml-processor-skill';

const yamlContent = `
name: MyApplication
version: 1.0.0
enabled: true
settings:
  debug: false
  logLevel: info
`;

const result = parseYaml(yamlContent);

console.log(result.data);
// 输出:
// {
//   name: 'MyApplication',
//   version: '1.0.0',
//   enabled: true,
//   settings: {
//     debug: false,
//     logLevel: 'info'
//   }
// }

console.log(`解析耗时：${result.duration}ms`);
console.log(`错误数：${result.errors.length}`);
```

### 1.2 解析带锚点的 YAML

```typescript
import { parseYaml } from './yaml-processor-skill';

const yamlWithAnchors = `
defaults: &defaults
  adapter: postgres
  host: localhost

development:
  database: dev_db
  <<: *defaults

production:
  database: prod_db
  <<: *defaults
  host: prod.example.com
`;

const result = parseYaml(yamlWithAnchors, { merge: true });

console.log(result.data);
// 输出:
// {
//   defaults: { adapter: 'postgres', host: 'localhost' },
//   development: { database: 'dev_db', adapter: 'postgres', host: 'localhost' },
//   production: { database: 'prod_db', adapter: 'postgres', host: 'prod.example.com' }
// }
```

### 1.3 解析多文档 YAML

```typescript
import * as yaml from 'js-yaml';

const multiDocYaml = `
---
name: Document 1
value: 100
---
name: Document 2
value: 200
---
name: Document 3
value: 300
`;

const documents = yaml.loadAll(multiDocYaml);
console.log(documents);
// 输出：[ {name: 'Document 1', value: 100}, {name: 'Document 2', value: 200}, ...]
```

---

## 2. 文件操作

### 2.1 从文件读取 YAML

```typescript
import { parseYamlFile } from './yaml-processor-skill';

const result = parseYamlFile('./config/app.yml');

if (result.errors.length > 0) {
  console.error('解析错误:', result.errors);
} else {
  console.log('配置数据:', result.data);
  console.log(`解析耗时：${result.duration}ms`);
}
```

### 2.2 处理文件不存在的情况

```typescript
import { parseYamlFile } from './yaml-processor-skill';

const result = parseYamlFile('./nonexistent.yml');

if (result.errors.length > 0) {
  console.error(result.errors[0].message);
  // 输出：File not found: /absolute/path/to/nonexistent.yml
}
```

### 2.3 获取 YAML 文件统计

```typescript
import { getYamlStats } from './yaml-processor-skill';

const stats = getYamlStats('./config/app.yml');

console.log(`文件大小：${stats.fileSize} bytes`);
console.log(`总行数：${stats.lineCount}`);
console.log(`键数量：${stats.keyCount}`);
console.log(`最大深度：${stats.depth} 层`);
```

---

## 3. 生成 YAML

### 3.1 基础 JSON 转 YAML

```typescript
import { stringifyYaml } from './yaml-processor-skill';

const config = {
  name: 'MyApp',
  version: '1.0.0',
  database: {
    host: 'localhost',
    port: 5432,
    credentials: {
      username: 'admin',
      password: 'secret'
    }
  }
};

const yamlString = stringifyYaml(config);
console.log(yamlString);
// 输出:
// name: MyApp
// version: 1.0.0
// database:
//   host: localhost
//   port: 5432
//   credentials:
//     username: admin
//     password: secret
```

### 3.2 自定义缩进和格式

```typescript
import { stringifyYaml } from './yaml-processor-skill';

const config = { items: ['apple', 'banana', 'cherry'] };

// 4 空格缩进
const yaml1 = stringifyYaml(config, { indent: 4 });

// 不换行 (lineWidth: 0)
const yaml2 = stringifyYaml(config, { lineWidth: 0 });

// 使用单引号
const yaml3 = stringifyYaml(config, { quotingType: "'" });

// 排序键
const yaml4 = stringifyYaml(config, { sortKeys: true });
```

### 3.3 保存 YAML 文件

```typescript
import { saveYamlFile } from './yaml-processor-skill';

const config = {
  name: 'Production',
  settings: {
    debug: false,
    logLevel: 'error'
  }
};

const success = saveYamlFile('./config/production.yml', config, {
  indent: 2,
  sortKeys: true
});

if (success) {
  console.log('✅ 文件保存成功');
} else {
  console.error('❌ 文件保存失败');
}
```

---

## 4. 配置验证

### 4.1 基础验证

```typescript
import { validateYaml, parseYaml } from './yaml-processor-skill';

const yamlContent = `
name: MyApp
version: 1.0.0
enabled: true
`;

const parseResult = parseYaml(yamlContent);
const schema = {
  name: 'App Config',
  rules: [
    {
      path: 'name',
      type: 'string',
      required: true,
      min: 1,
      max: 50
    },
    {
      path: 'version',
      type: 'string',
      required: true,
      pattern: '^\\d+\\.\\d+\\.\\d+$'
    },
    {
      path: 'enabled',
      type: 'boolean',
      required: false
    }
  ]
};

const validationResult = validateYaml(parseResult.data, schema);

console.log(`验证通过：${validationResult.valid}`);
console.log(`验证字段数：${validationResult.validatedFields}`);
console.log(`错误数：${validationResult.errors.length}`);
console.log(`警告数：${validationResult.warnings.length}`);

if (!validationResult.valid) {
  validationResult.errors.forEach(err => {
    console.error(`❌ ${err.path}: ${err.message}`);
  });
}
```

### 4.2 验证数据库配置

```typescript
import { validateYamlFile, DATABASE_CONFIG_SCHEMA } from './yaml-processor-skill';

const result = validateYamlFile('./config/database.yml', DATABASE_CONFIG_SCHEMA);

if (!result.valid) {
  console.error('数据库配置验证失败:');
  result.errors.forEach(err => {
    console.error(`  ${err.path}: ${err.message}`);
  });
} else {
  console.log('✅ 数据库配置验证通过');
}
```

### 4.3 自定义验证规则

```typescript
import { validateYaml, parseYaml } from './yaml-processor-skill';

const customSchema = {
  name: 'Custom Config',
  rules: [
    {
      path: 'email',
      type: 'string',
      required: true,
      pattern: '^[\\w-\\.]+@([\\w-]+\\.)+[\\w-]{2,4}$',
      message: '必须是有效的邮箱地址'
    },
    {
      path: 'age',
      type: 'number',
      required: true,
      min: 18,
      max: 120,
      message: '年龄必须在 18-120 之间'
    },
    {
      path: 'role',
      type: 'string',
      required: true,
      enum: ['admin', 'user', 'guest'],
      message: '角色必须是 admin、user 或 guest'
    },
    {
      path: 'password',
      type: 'string',
      required: true,
      min: 8,
      validate: (value) => {
        // 自定义验证：必须包含大小写字母和数字
        return /[a-z]/.test(value) && /[A-Z]/.test(value) && /\d/.test(value);
      },
      message: '密码必须包含大小写字母和数字'
    }
  ],
  strict: true, // 严格模式：检查未知字段
  allowUnknown: false
};

const yamlContent = `
email: user@example.com
age: 25
role: admin
password: SecurePass123
`;

const parseResult = parseYaml(yamlContent);
const result = validateYaml(parseResult.data, customSchema);

console.log(`验证结果：${result.valid ? '✅ 通过' : '❌ 失败'}`);
```

### 4.4 使用预定义 Schema

```typescript
import { 
  validateYamlFile,
  COMMON_CONFIG_SCHEMA,
  DATABASE_CONFIG_SCHEMA,
  API_CONFIG_SCHEMA
} from './yaml-processor-skill';

// 验证通用配置
const commonResult = validateYamlFile('./config/app.yml', COMMON_CONFIG_SCHEMA);

// 验证数据库配置
const dbResult = validateYamlFile('./config/database.yml', DATABASE_CONFIG_SCHEMA);

// 验证 API 配置
const apiResult = validateYamlFile('./config/api.yml', API_CONFIG_SCHEMA);
```

---

## 5. 高级功能

### 5.1 比较配置差异

```typescript
import { compareYamlConfigs, parseYaml } from './yaml-processor-skill';

const config1 = parseYaml(`
name: MyApp
version: 1.0.0
debug: false
features:
  - auth
  - api
`).data;

const config2 = parseYaml(`
name: MyApp
version: 2.0.0
debug: true
features:
  - auth
  - api
  - webhooks
logging:
  level: info
`).data;

const diff = compareYamlConfigs(config1, config2);

console.log('新增字段:', diff.added);
// 输出：['features.2', 'logging.level']

console.log('删除字段:', diff.removed);
// 输出：[]

console.log('修改字段:', diff.modified);
// 输出：['version', 'debug']

console.log('未变字段:', diff.unchanged);
// 输出：['name', 'features.0', 'features.1']
```

### 5.2 合并多个配置

```typescript
import { mergeYamlConfigs, parseYaml } from './yaml-processor-skill';

const baseConfig = parseYaml(`
app:
  name: MyApp
  version: 1.0.0
database:
  host: localhost
  port: 5432
`).data;

const devConfig = parseYaml(`
database:
  name: dev_db
  username: dev_user
logging:
  level: debug
`).data;

const merged = mergeYamlConfigs(baseConfig, devConfig);

console.log(merged);
// 输出:
// {
//   app: { name: 'MyApp', version: '1.0.0' },
//   database: {
//     host: 'localhost',
//     port: 5432,
//     name: 'dev_db',
//     username: 'dev_user'
//   },
//   logging: { level: 'debug' }
// }
```

### 5.3 格式化 YAML 文件

```typescript
import { formatYamlFile } from './yaml-processor-skill';

// 重新格式化文件 (标准化缩进、排序等)
const success = formatYamlFile('./config/messy.yml', {
  indent: 2,
  sortKeys: true,
  lineWidth: 80
});

if (success) {
  console.log('✅ YAML 文件已格式化');
}
```

---

## 6. 实际应用场景

### 6.1 CI/CD 配置文件验证

```typescript
import { validateYamlFile } from './yaml-processor-skill';

const ciSchema = {
  name: 'CI/CD Config',
  rules: [
    { path: 'name', type: 'string', required: true },
    { path: 'on.push.branches', type: 'array', required: true },
    { path: 'on.pull_request', type: 'boolean', required: false },
    { path: 'jobs.build.runs-on', type: 'string', required: true },
    { path: 'jobs.build.steps', type: 'array', required: true, min: 1 },
  ]
};

const result = validateYamlFile('./.github/workflows/ci.yml', ciSchema);

if (!result.valid) {
  console.error('❌ CI 配置验证失败');
  process.exit(1);
} else {
  console.log('✅ CI 配置验证通过');
}
```

### 6.2 Docker Compose 验证

```typescript
import { validateYamlFile } from './yaml-processor-skill';

const dockerComposeSchema = {
  name: 'Docker Compose',
  rules: [
    { path: 'version', type: 'string', required: true },
    { path: 'services', type: 'object', required: true },
    { path: 'services.web.image', type: 'string', required: true },
    { path: 'services.web.ports', type: 'array', required: false },
    { path: 'services.db.image', type: 'string', required: false },
    { path: 'services.db.environment', type: 'object', required: false },
  ]
};

const result = validateYamlFile('./docker-compose.yml', dockerComposeSchema);

if (result.valid) {
  console.log('✅ Docker Compose 配置有效');
} else {
  result.errors.forEach(err => {
    console.error(`错误：${err.path} - ${err.message}`);
  });
}
```

### 6.3 批量配置文件检查

```typescript
import { parseYamlFile, validateYaml } from './yaml-processor-skill';
import * as fs from 'fs';
import * as path from 'path';

const configSchema = {
  name: 'App Config',
  rules: [
    { path: 'name', type: 'string', required: true },
    { path: 'version', type: 'string', required: true },
    { path: 'enabled', type: 'boolean', required: false },
  ]
};

const configDir = './configs';
const files = fs.readdirSync(configDir).filter(f => f.endsWith('.yml'));

let successCount = 0;
let failCount = 0;

for (const file of files) {
  const filePath = path.join(configDir, file);
  const parseResult = parseYamlFile(filePath);
  
  if (parseResult.errors.length > 0) {
    console.error(`❌ ${file}: 解析失败 - ${parseResult.errors[0].message}`);
    failCount++;
    continue;
  }
  
  const validationResult = validateYaml(parseResult.data, configSchema);
  
  if (validationResult.valid) {
    console.log(`✅ ${file}: 验证通过`);
    successCount++;
  } else {
    console.error(`❌ ${file}: 验证失败`);
    validationResult.errors.forEach(err => {
      console.error(`   ${err.path}: ${err.message}`);
    });
    failCount++;
  }
}

console.log(`\n总计：${files.length} 个文件，${successCount} 成功，${failCount} 失败`);
```

### 6.4 配置迁移工具

```typescript
import { parseYamlFile, stringifyYaml, saveYamlFile } from './yaml-processor-skill';

// 从旧配置迁移到新配置
const oldConfig = parseYamlFile('./config.old.yml').data;

const newConfig = {
  version: '2.0',
  app: {
    name: oldConfig.appName,
    port: oldConfig.serverPort,
  },
  database: {
    host: oldConfig.dbHost,
    port: oldConfig.dbPort,
    name: oldConfig.dbName,
  },
  features: oldConfig.enabledFeatures || [],
};

saveYamlFile('./config.new.yml', newConfig, {
  indent: 2,
  sortKeys: true
});

console.log('✅ 配置迁移完成');
```

### 6.5 环境变量注入

```typescript
import { parseYaml, stringifyYaml } from './yaml-processor-skill';

const yamlTemplate = `
database:
  host: \${DB_HOST}
  port: \${DB_PORT}
  username: \${DB_USER}
  password: \${DB_PASSWORD}
`;

const config = parseYaml(yamlTemplate).data;

// 注入环境变量
Object.keys(config.database).forEach(key => {
  const envVar = config.database[key].match(/\$\{(\w+)\}/)?.[1];
  if (envVar && process.env[envVar]) {
    config.database[key] = process.env[envVar];
  }
});

const finalYaml = stringifyYaml(config);
console.log(finalYaml);
```

---

## 🎯 最佳实践

### 1. 始终验证用户提供的配置

```typescript
// ❌ 不好：直接使用
const config = parseYaml(userInput).data;

// ✅ 好：验证后使用
const parseResult = parseYaml(userInput);
if (parseResult.errors.length > 0) {
  throw new Error(`YAML 解析失败：${parseResult.errors[0].message}`);
}

const validationResult = validateYaml(parseResult.data, schema);
if (!validationResult.valid) {
  throw new Error(`配置验证失败：${validationResult.errors.map(e => e.message).join(', ')}`);
}
```

### 2. 使用预定义 Schema

```typescript
// 复用预定义 Schema，避免重复定义
import { DATABASE_CONFIG_SCHEMA } from './yaml-processor-skill';

const result = validateYamlFile('./db.yml', DATABASE_CONFIG_SCHEMA);
```

### 3. 处理大文件时使用流式解析

```typescript
// 对于大文件，考虑分批处理
const content = fs.readFileSync('./large.yml', 'utf-8');
const documents = yaml.loadAll(content);

for (const doc of documents) {
  // 逐个处理文档
  processDocument(doc);
}
```

### 4. 错误处理

```typescript
try {
  const result = parseYamlFile('./config.yml');
  
  if (result.errors.length > 0) {
    console.warn('解析警告:', result.errors);
  }
  
  if (result.data === null) {
    throw new Error('配置为空');
  }
  
  // 使用配置...
} catch (error) {
  console.error('配置处理失败:', error);
  process.exit(1);
}
```

---

## 📊 性能提示

- **小文件 (< 10KB)**: 直接使用 `parseYamlFile`
- **中等文件 (10KB - 1MB)**: 考虑缓存解析结果
- **大文件 (> 1MB)**: 使用 `yaml.loadAll` 分文档处理
- **批量处理**: 使用 `mergeYamlConfigs` 合并后再验证

---

**文档版本:** 1.0.0  
**最后更新:** 2026-03-13
