# ACE - Application Configuration Engine

配置管理工具技能，提供完整的配置加载、验证和热更新功能。

## 📦 安装

无需额外安装，已集成到 `src/skills/` 目录。

## 🚀 快速开始

### 1. 基础使用

```typescript
import { ConfigManager } from './config-utils-skill';

// 创建配置管理器
const config = new ConfigManager({
  configPath: './config/app.yaml',
  enableHotReload: true
});

// 加载配置
await config.load();

// 获取配置值
const port = config.get('server.port', 3000);
const host = config.get('server.host', 'localhost');
```

### 2. 带验证的配置

```typescript
import { ConfigManager, ConfigValidator } from './config-utils-skill';

// 定义验证器
const validator: ConfigValidator = {
  'server.port': {
    type: 'number',
    required: true,
    min: 1,
    max: 65535
  },
  'database.url': {
    type: 'string',
    required: true,
    validate: (value) => value.startsWith('postgres://')
  },
  'logging.level': {
    type: 'string',
    enum: ['debug', 'info', 'warn', 'error']
  }
};

// 创建带验证的管理器
const config = new ConfigManager({
  configPath: './config/app.yaml',
  validator
});

await config.load(); // 自动验证，失败会抛出异常
```

### 3. 配置热更新监听

```typescript
const config = new ConfigManager({
  configPath: './config/app.yaml',
  enableHotReload: true
});

// 监听配置变更
config.onChange((event) => {
  console.log(`配置变更：${event.key}`, {
    旧值：event.oldValue,
    新值：event.newValue,
    时间：new Date(event.timestamp).toISOString()
  });
});

await config.load();
// 当配置文件被修改时，会自动重新加载并触发 onChange
```

### 4. 环境变量覆盖

```typescript
// 在 shell 中设置环境变量
export AXONCLAW_SERVER_PORT=8080
export AXONCLAW_LOGGING_LEVEL=warn

// 代码中自动应用覆盖
const config = new ConfigManager({
  configPath: './config/app.yaml',
  envPrefix: 'AXONCLAW_'  // 默认前缀
});

await config.load();
// config.get('server.port') 将返回 8080 而非配置文件中的值
```

## 📖 API 文档

### ConfigManager 类

#### 构造函数选项

```typescript
interface ConfigUtilsOptions {
  configPath?: string;      // 配置文件路径，默认 ./config/default.yaml
  enableHotReload?: boolean; // 是否启用热重载，默认 true
  validator?: ConfigValidator; // 验证器
  envPrefix?: string;       // 环境变量前缀，默认 AXONCLAW_
  mergeDefaults?: boolean;  // 是否合并默认值
}
```

#### 方法

| 方法 | 描述 | 返回值 |
|------|------|--------|
| `load()` | 加载并验证配置 | `Promise<ConfigObject>` |
| `get(key, default)` | 获取配置值 | `any` |
| `getAll()` | 获取完整配置 | `ConfigObject` |
| `set(key, value)` | 设置配置值 (触发变更事件) | `void` |
| `onChange(listener)` | 注册变更监听器 | `void` |
| `offChange(listener)` | 移除变更监听器 | `void` |
| `close()` | 关闭文件监听 | `void` |

### 验证规则

```typescript
interface ValidationRule {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  required?: boolean;     // 是否必填
  min?: number;           // 最小值 (number) 或最小长度 (string)
  max?: number;           // 最大值 (number) 或最大长度 (string)
  pattern?: RegExp;       // 正则匹配 (string)
  enum?: any[];           // 枚举值
  validate?: (value) => boolean; // 自定义验证
  default?: any;          // 默认值
}
```

### 工具函数

```typescript
// 加载配置文件
loadConfig(path: string): ConfigObject

// 验证配置
validateConfig(config: ConfigObject, validator: ConfigValidator): ValidationError[]

// 合并配置 (深度合并)
mergeConfigs(base: ConfigObject, override: ConfigObject): ConfigObject

// 应用环境变量覆盖
applyEnvOverrides(config: ConfigObject, prefix: string): ConfigObject

// 快速加载 (一次性)
loadConfigOnce(path: string, validator?: ConfigValidator): Promise<ConfigObject>
```

## 📝 配置文件格式

### YAML 示例

```yaml
app:
  name: MyApplication
  version: 1.0.0
  env: production

server:
  port: 8080
  host: 0.0.0.0
  cors: true

database:
  host: db.example.com
  port: 5432
  name: myapp
  user: admin
  password: ${DB_PASSWORD}  # 支持环境变量引用

logging:
  level: info
  format: json
```

### JSON 示例

```json
{
  "app": {
    "name": "MyApplication",
    "version": "1.0.0",
    "env": "production"
  },
  "server": {
    "port": 8080,
    "host": "0.0.0.0",
    "cors": true
  }
}
```

## 🔧 最佳实践

### 1. 环境分离

```bash
config/
├── default.yaml      # 默认配置
├── development.yaml  # 开发环境
├── staging.yaml      # 预发布环境
└── production.yaml   # 生产环境
```

```typescript
const env = process.env.NODE_ENV || 'development';
const config = new ConfigManager({
  configPath: `./config/${env}.yaml`
});
```

### 2. 敏感信息保护

```yaml
# ❌ 不要硬编码敏感信息
database:
  password: my-secret-password

# ✅ 使用环境变量
database:
  password: ${DB_PASSWORD}
```

```bash
# .env 文件 (不提交到版本控制)
DB_PASSWORD=super-secret
```

### 3. 配置验证

```typescript
// 始终定义验证器，确保配置正确
const validator: ConfigValidator = {
  'server.port': { type: 'number', required: true, min: 1, max: 65535 },
  'database.url': { type: 'string', required: true },
  'logging.level': { type: 'string', enum: ['debug', 'info', 'warn', 'error'] }
};
```

### 4. 热更新使用场景

```typescript
// 适用于需要动态调整的配置
config.onChange((event) => {
  if (event.key === 'logging.level') {
    // 动态调整日志级别，无需重启
    logger.setLevel(event.newValue);
  }
  
  if (event.key === 'features.newUI') {
    // 动态启用/禁用功能
    featureFlags.newUI = event.newValue;
  }
});
```

## ⚠️ 注意事项

1. **热重载限制**: 仅监听文件 `change` 事件，某些编辑器可能需要保存后触发
2. **性能考虑**: 大配置文件的热重载可能有短暂延迟
3. **验证失败**: 热重载时验证失败会跳过更新，保持旧配置
4. **环境变量优先级**: 环境变量 > 配置文件 > 默认值

## 📚 示例代码

完整示例请查看:
- `config-utils-skill.examples.ts` - 使用示例集合
- `config/app.example.yaml` - 配置文件模板

## 🎯 功能清单

- ✅ YAML/JSON 配置文件加载
- ✅ 环境变量覆盖
- ✅ Schema 验证
- ✅ 自定义验证函数
- ✅ 配置热重载
- ✅ 变更事件监听
- ✅ 深度配置合并
- ✅ 嵌套键访问 (`config.get('a.b.c')`)
- ✅ 类型安全 (TypeScript)

---

**版本**: 1.0.0  
**作者**: Axon  
**许可**: MIT
