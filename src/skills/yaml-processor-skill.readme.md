# YAML 处理技能 - YAML Processor Skill

**版本:** 1.0.0  
**作者:** Axon  
**最后更新:** 2026-03-13

---

## 📋 概述

YAML 处理技能提供完整的 YAML 解析、生成和验证功能，适用于配置文件管理、数据交换和自动化工作流。

### 核心功能

1. **YAML 解析为 JSON** - 支持锚点、合并、多文档等高级特性
2. **JSON 转 YAML** - 可配置的缩进、格式和样式
3. **配置文件验证** - Schema 验证、类型检查、自定义规则

---

## 🚀 快速开始

### 安装依赖

```bash
npm install js-yaml
npm install --save-dev @types/js-yaml
```

### 基础使用

```typescript
import { parseYaml, stringifyYaml, validateYaml } from './yaml-processor-skill';

// 1. 解析 YAML
const yamlContent = `
name: MyApp
version: 1.0.0
enabled: true
`;

const result = parseYaml(yamlContent);
console.log(result.data); // { name: 'MyApp', version: '1.0.0', enabled: true }

// 2. 生成 YAML
const config = { name: 'MyApp', version: '2.0.0' };
const yamlString = stringifyYaml(config);

// 3. 验证配置
const schema = {
  name: 'App Config',
  rules: [
    { path: 'name', type: 'string', required: true },
    { path: 'version', type: 'string', pattern: '^\\d+\\.\\d+\\.\\d+$' }
  ]
};

const validation = validateYaml(config, schema);
console.log(validation.valid); // true
```

---

## 📚 API 参考

### 解析功能

#### `parseYaml(content, config?)`

解析 YAML 字符串为 JSON 对象。

**参数:**
- `content: string` - YAML 内容
- `config?: YamlParseConfig` - 解析配置
  - `encoding?: BufferEncoding` - 文件编码 (默认 'utf-8')
  - `json?: boolean` - JSON 兼容模式 (默认 true)
  - `allowDuplicateKeys?: boolean` - 允许重复键 (默认 false)
  - `schema?: Schema` - 自定义 Schema

**返回:** `YamlParseResult`
```typescript
{
  data: any,
  documentCount: number,
  duration: number,
  errors: ParseError[]
}
```

**示例:**
```typescript
const result = parseYaml('name: Test', { json: true });
```

---

#### `parseYamlFile(filePath, config?)`

从文件读取并解析 YAML。

**参数:**
- `filePath: string` - 文件路径
- `config?: YamlParseConfig` - 解析配置

**返回:** `YamlParseResult`

**示例:**
```typescript
const result = parseYamlFile('./config/app.yml');
if (result.errors.length === 0) {
  console.log(result.data);
}
```

---

### 生成功能

#### `stringifyYaml(data, config?)`

将 JSON 对象转换为 YAML 字符串。

**参数:**
- `data: any` - 数据对象
- `config?: YamlStringifyConfig` - 生成配置
  - `indent?: number` - 缩进空格数 (默认 2)
  - `lineWidth?: number` - 行宽 (默认 80, 0 = 不换行)
  - `forceQuotes?: boolean` - 强制引号 (默认 false)
  - `sortKeys?: boolean` - 排序键 (默认 false)
  - `quotingType?: "'" | '"'` - 引号类型 (默认 '"')

**返回:** `string`

**示例:**
```typescript
const yaml = stringifyYaml({ name: 'Test' }, { indent: 4 });
```

---

#### `saveYamlFile(filePath, data, config?)`

将数据保存为 YAML 文件。

**参数:**
- `filePath: string` - 文件路径
- `data: any` - 数据对象
- `config?: YamlStringifyConfig` - 生成配置

**返回:** `boolean` - 是否成功

**示例:**
```typescript
const success = saveYamlFile('./config.yml', { name: 'Test' });
```

---

### 验证功能

#### `validateYaml(data, schema)`

验证 YAML 数据结构。

**参数:**
- `data: any` - 待验证数据
- `schema: ValidationSchema` - 验证 Schema
  - `name?: string` - Schema 名称
  - `rules: ValidationRule[]` - 验证规则
  - `allowUnknown?: boolean` - 允许未知字段 (默认 true)
  - `strict?: boolean` - 严格模式 (默认 false)

**ValidationRule:**
```typescript
{
  path: string,           // 字段路径 (支持嵌套)
  type: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'null',
  required?: boolean,     // 是否必填
  min?: number,           // 最小值/长度
  max?: number,           // 最大值/长度
  enum?: any[],           // 枚举值
  pattern?: string,       // 正则表达式
  validate?: (value) => boolean  // 自定义验证
}
```

**返回:** `ValidationResult`
```typescript
{
  valid: boolean,
  errors: ValidationError[],
  warnings: ValidationWarning[],
  validatedFields: number,
  duration: number
}
```

**示例:**
```typescript
const schema = {
  name: 'Database Config',
  rules: [
    { path: 'database.host', type: 'string', required: true },
    { path: 'database.port', type: 'number', min: 1, max: 65535 },
    { path: 'database.username', type: 'string', required: true }
  ]
};

const result = validateYaml(config, schema);
if (!result.valid) {
  result.errors.forEach(err => {
    console.error(`${err.path}: ${err.message}`);
  });
}
```

---

#### `validateYamlFile(filePath, schema, parseConfig?)`

验证 YAML 文件。

**参数:**
- `filePath: string` - 文件路径
- `schema: ValidationSchema` - 验证 Schema
- `parseConfig?: YamlParseConfig` - 解析配置

**返回:** `ValidationResult`

---

### 高级功能

#### `compareYamlConfigs(config1, config2)`

比较两个配置的差异。

**返回:**
```typescript
{
  added: string[],    // 新增字段
  removed: string[],  // 删除字段
  modified: string[], // 修改字段
  unchanged: string[] // 未变字段
}
```

**示例:**
```typescript
const diff = compareYamlConfigs(configV1, configV2);
console.log('修改字段:', diff.modified);
```

---

#### `mergeYamlConfigs(...configs)`

合并多个配置 (后面的覆盖前面的)。

**返回:** `any` - 合并后的配置

**示例:**
```typescript
const merged = mergeYamlConfigs(baseConfig, devConfig, localConfig);
```

---

#### `getYamlStats(filePath)`

获取 YAML 文件统计信息。

**返回:**
```typescript
{
  fileSize: number,   // 文件大小 (bytes)
  lineCount: number,  // 总行数
  keyCount: number,   // 键数量
  depth: number       // 最大深度
}
```

---

#### `formatYamlFile(filePath, config?)`

格式化 YAML 文件 (标准化缩进、排序等)。

**返回:** `boolean` - 是否成功

---

## 📦 预定义 Schema

### `COMMON_CONFIG_SCHEMA`

通用配置文件验证:
- `name` (string, required, 1-100 字符)
- `version` (string, required, semver 格式)
- `enabled` (boolean, optional)

### `DATABASE_CONFIG_SCHEMA`

数据库配置验证:
- `database.host` (string, required)
- `database.port` (number, required, 1-65535)
- `database.username` (string, required)
- `database.password` (string, required, min 8)
- `database.name` (string, required)
- `database.poolSize` (number, optional, 1-100)

### `API_CONFIG_SCHEMA`

API 配置验证:
- `api.baseUrl` (string, required, http/https)
- `api.timeout` (number, optional, 1000-300000)
- `api.retries` (number, optional, 0-10)
- `api.rateLimit` (number, optional, min 1)

---

## 🎯 使用场景

### 1. CI/CD 配置验证

```typescript
import { validateYamlFile } from './yaml-processor-skill';

const ciSchema = {
  name: 'CI/CD Config',
  rules: [
    { path: 'name', type: 'string', required: true },
    { path: 'on.push.branches', type: 'array', required: true },
    { path: 'jobs.build.runs-on', type: 'string', required: true }
  ]
};

const result = validateYamlFile('./.github/workflows/ci.yml', ciSchema);
if (!result.valid) {
  console.error('CI 配置验证失败');
  process.exit(1);
}
```

---

### 2. Docker Compose 验证

```typescript
const dockerSchema = {
  name: 'Docker Compose',
  rules: [
    { path: 'version', type: 'string', required: true },
    { path: 'services', type: 'object', required: true },
    { path: 'services.web.image', type: 'string', required: true }
  ]
};

const result = validateYamlFile('./docker-compose.yml', dockerSchema);
```

---

### 3. 批量配置检查

```typescript
import { parseYamlFile, validateYaml } from './yaml-processor-skill';
import * as fs from 'fs';

const files = fs.readdirSync('./configs').filter(f => f.endsWith('.yml'));

for (const file of files) {
  const parseResult = parseYamlFile(`./configs/${file}`);
  const validationResult = validateYaml(parseResult.data, schema);
  
  if (!validationResult.valid) {
    console.error(`${file}: 验证失败`);
    validationResult.errors.forEach(err => {
      console.error(`  ${err.path}: ${err.message}`);
    });
  }
}
```

---

### 4. 配置迁移

```typescript
import { parseYamlFile, saveYamlFile } from './yaml-processor-skill';

const oldConfig = parseYamlFile('./config.old.yml').data;

const newConfig = {
  version: '2.0',
  app: {
    name: oldConfig.appName,
    port: oldConfig.serverPort
  },
  database: oldConfig.database
};

saveYamlFile('./config.new.yml', newConfig, { indent: 2, sortKeys: true });
```

---

## ✅ 最佳实践

### 1. 始终验证配置

```typescript
// ❌ 不好
const config = parseYaml(userInput).data;

// ✅ 好
const result = parseYaml(userInput);
if (result.errors.length > 0) {
  throw new Error(`解析失败：${result.errors[0].message}`);
}

const validation = validateYaml(result.data, schema);
if (!validation.valid) {
  throw new Error(`验证失败：${validation.errors.map(e => e.message).join(', ')}`);
}
```

### 2. 使用预定义 Schema

```typescript
import { DATABASE_CONFIG_SCHEMA } from './yaml-processor-skill';

const result = validateYamlFile('./db.yml', DATABASE_CONFIG_SCHEMA);
```

### 3. 错误处理

```typescript
try {
  const result = parseYamlFile('./config.yml');
  
  if (result.errors.length > 0) {
    console.warn('解析警告:', result.errors);
  }
  
  if (result.data === null) {
    throw new Error('配置为空');
  }
} catch (error) {
  console.error('配置处理失败:', error);
  process.exit(1);
}
```

---

## 📊 测试

运行测试:

```bash
npx ts-node src/skills/yaml-processor-skill.test.ts
```

测试覆盖:
- ✅ 基础解析
- ✅ 文件读写
- ✅ 配置验证
- ✅ Schema 验证
- ✅ 配置比较
- ✅ 配置合并
- ✅ 锚点支持
- ✅ 错误处理
- ✅ 自定义验证
- ✅ 枚举验证

---

## 📝 示例文档

详细使用示例请查看: [`yaml-processor-skill.examples.md`](./yaml-processor-skill.examples.md)

---

## 🛠️ 依赖

- `js-yaml` ^4.1.1
- `@types/js-yaml` (dev)

---

## 📄 许可证

MIT

---

**最后更新:** 2026-03-13  
**维护者:** Axon
