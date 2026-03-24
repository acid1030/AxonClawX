# KAEL 环境变量管理技能 - 使用示例

## 📦 快速开始

### 1. 基础导入

```typescript
import { EnvManager, envManager } from './env-manager-skill';

// 方式 1: 使用默认实例
const manager = envManager;

// 方式 2: 创建新实例 (指定工作目录)
const manager = new EnvManager('/path/to/workspace');
```

---

## 🎯 功能示例

### 功能 1: 环境检测

```typescript
import { EnvManager } from './env-manager-skill';

const manager = new EnvManager();

// 自动检测当前环境 (优先级：NODE_ENV > 命令行参数 > 配置文件 > 默认值)
const currentEnv = manager.detectEnvironment();
console.log('当前环境:', currentEnv); // 'development' | 'staging' | 'production' | 'test'

// 获取当前环境详细信息
const info = manager.getCurrentEnvInfo();
console.log({
  environment: info.environment,      // 'development'
  apiEndpoint: info.config.apiEndpoint, // 'http://localhost:3000/api'
  logLevel: info.config.logLevel,       // 'debug'
  features: info.config.features,       // { enableDebug: true, ... }
});

// 列出所有可用环境
const envs = manager.listEnvironments();
envs.forEach(env => {
  console.log(`${env.isCurrent ? '●' : '○'} ${env.name}: ${env.config.apiEndpoint}`);
});
```

**输出示例:**
```
当前环境：development
API 端点：http://localhost:3000/api
日志级别：debug

所有可用环境:
  ● Development: http://localhost:3000/api
  ○ Staging: https://staging-api.example.com/api
  ○ Production: https://api.example.com/api
  ○ Test: http://localhost:3001/api
```

---

### 功能 2: 配置切换

```typescript
import { EnvManager } from './env-manager-skill';

const manager = new EnvManager();

// 切换到生产环境
const success = manager.switchEnvironment('production');
if (success) {
  console.log('✅ 已切换到生产环境');
}

// 更新环境配置
manager.updateConfig('staging', {
  apiEndpoint: 'https://new-staging-api.example.com/api',
  logLevel: 'debug', // 临时开启 debug 日志
  features: {
    enableDebug: true,
    enableMetrics: true,
    enableCache: false,
  },
});

// 添加自定义环境
manager.addCustomEnv('local-test', {
  name: 'Local Test Environment',
  apiEndpoint: 'http://127.0.0.1:8080/api',
  databaseUrl: 'postgresql://localhost:5432/local_test',
  logLevel: 'debug',
  features: {
    enableDebug: true,
    enableMetrics: false,
    enableCache: false,
  },
});

// 切换到自定义环境
manager.switchEnvironment('local-test');
```

**输出示例:**
```
✅ 环境已切换：development → production
   API: https://api.example.com/api
   日志级别：warn

✅ 配置已更新：staging

✅ 自定义环境已添加：local-test
```

---

### 功能 3: 密钥管理

```typescript
import { EnvManager } from './env-manager-skill';

const manager = new EnvManager();

// 存储密钥 (自动加密)
manager.setSecret('API_KEY', 'sk-1234567890abcdef');
manager.setSecret('DB_PASSWORD', 'super_secret_password');
manager.setSecret('TEMP_TOKEN', 'temp_12345', 1); // 1 小时后过期

// 获取密钥 (自动解密)
const apiKey = manager.getSecret('API_KEY');
console.log('API Key:', apiKey); // 'sk-1234567890abcdef'

const dbPassword = manager.getSecret('DB_PASSWORD');
console.log('DB Password:', dbPassword);

// 检查密钥是否存在
const hasApiKey = manager.hasSecret('API_KEY');
console.log('Has API Key:', hasApiKey); // true

// 列出所有密钥 (不显示值)
const secrets = manager.listSecrets();
secrets.forEach(secret => {
  console.log(`- ${secret.name}`);
  console.log(`  加密：${secret.encrypted}`);
  console.log(`  创建：${secret.createdAt}`);
  if (secret.expiresAt) {
    console.log(`  过期：${secret.expiresAt}`);
  }
});

// 删除密钥
manager.deleteSecret('TEMP_TOKEN');

// 尝试获取过期的密钥
const expiredToken = manager.getSecret('TEMP_TOKEN');
console.log('Expired Token:', expiredToken); // null
```

**输出示例:**
```
✅ 密钥已存储：API_KEY
✅ 密钥已存储：DB_PASSWORD
✅ 密钥已存储：TEMP_TOKEN

API Key: sk-1234567890abcdef
DB Password: super_secret_password

所有密钥:
- API_KEY
  加密：true
  创建：2026-03-13T19:04:00.000Z
- DB_PASSWORD
  加密：true
  创建：2026-03-13T19:04:00.000Z
- TEMP_TOKEN
  加密：true
  创建：2026-03-13T19:04:00.000Z
  过期：2026-03-13T20:04:00.000Z

✅ 密钥已删除：TEMP_TOKEN

⚠️  密钥已过期：TEMP_TOKEN
Expired Token: null
```

---

## 🚀 实际应用场景

### 场景 1: CI/CD 环境切换

```typescript
// .github/workflows/deploy.ts
import { EnvManager } from './env-manager-skill';

const manager = new EnvManager();

// 根据 GitHub Actions 环境变量自动切换
const githubEnv = process.env.GITHUB_ENV || 'development';
manager.switchEnvironment(githubEnv as any);

// 从 GitHub Secrets 获取密钥并存储
manager.setSecret('DEPLOY_TOKEN', process.env.DEPLOY_TOKEN!);
manager.setSecret('AWS_ACCESS_KEY', process.env.AWS_ACCESS_KEY!);
manager.setSecret('AWS_SECRET_KEY', process.env.AWS_SECRET_KEY!);

// 部署脚本使用
const deployToken = manager.getSecret('DEPLOY_TOKEN');
// ... 执行部署
```

---

### 场景 2: 多租户配置管理

```typescript
// multi-tenant-config.ts
import { EnvManager } from './env-manager-skill';

const manager = new EnvManager();

// 为不同租户创建环境
const tenants = ['tenant-a', 'tenant-b', 'tenant-c'];

tenants.forEach(tenant => {
  manager.addCustomEnv(tenant, {
    name: `Tenant ${tenant.toUpperCase()}`,
    apiEndpoint: `https://${tenant}.api.example.com/api`,
    databaseUrl: `postgresql://${tenant}-db:5432/${tenant}_db`,
    logLevel: 'info',
    features: {
      enableDebug: false,
      enableMetrics: true,
      enableCache: true,
    },
  });
  
  // 存储租户密钥
  manager.setSecret(`${tenant}_API_KEY`, generateApiKey());
  manager.setSecret(`${tenant}_DB_PASSWORD`, generateDbPassword());
});

// 切换租户环境
function switchTenant(tenant: string) {
  manager.switchEnvironment(tenant as any);
  const apiKey = manager.getSecret(`${tenant}_API_KEY`);
  return { apiKey, endpoint: manager.getCurrentEnvInfo().config.apiEndpoint };
}
```

---

### 场景 3: 开发/测试快速切换

```typescript
// test-setup.ts
import { EnvManager } from './env-manager-skill';

const manager = new EnvManager();

// 测试前切换到 test 环境
beforeAll(() => {
  manager.switchEnvironment('test');
  manager.setSecret('TEST_API_KEY', 'test-key-123');
});

// 测试后清理
afterAll(() => {
  manager.switchEnvironment('development');
  manager.deleteSecret('TEST_API_KEY');
});

// 测试用例
describe('API Tests', () => {
  it('should connect to test database', async () => {
    const config = manager.getCurrentEnvInfo().config;
    expect(config.databaseUrl).toContain('test_db');
    expect(config.logLevel).toBe('error');
  });
});
```

---

### 场景 4: 命令行工具集成

```typescript
// cli.ts
#!/usr/bin/env node
import { EnvManager } from './env-manager-skill';
import { Command } from 'commander';

const program = new Command();
const manager = new EnvManager();

program
  .name('env-manager')
  .description('KAEL 环境变量管理工具');

program
  .command('status')
  .description('显示当前环境状态')
  .action(() => {
    const info = manager.getCurrentEnvInfo();
    console.log(`当前环境：${info.environment}`);
    console.log(`API: ${info.config.apiEndpoint}`);
    console.log(`日志：${info.config.logLevel}`);
  });

program
  .command('switch <env>')
  .description('切换环境')
  .action((env) => {
    manager.switchEnvironment(env);
  });

program
  .command('secret:set <name> <value>')
  .description('存储密钥')
  .option('-e, --expires <hours>', '过期时间 (小时)')
  .action((name, value, options) => {
    manager.setSecret(name, value, options.expires);
  });

program
  .command('secret:get <name>')
  .description('获取密钥')
  .action((name) => {
    const value = manager.getSecret(name);
    if (value) console.log(value);
  });

program.parse();
```

**使用示例:**
```bash
$ node cli.ts status
当前环境：development
API: http://localhost:3000/api
日志：debug

$ node cli.ts switch production
✅ 环境已切换：development → production

$ node cli.ts secret:set API_KEY sk-123456
✅ 密钥已存储：API_KEY

$ node cli.ts secret:get API_KEY
sk-123456
```

---

## ⚙️ 配置文件格式

配置文件保存在 `.env.config.json`:

```json
{
  "currentEnv": "production",
  "configs": {
    "development": {
      "name": "Development",
      "apiEndpoint": "http://localhost:3000/api",
      "databaseUrl": "postgresql://localhost:5432/dev_db",
      "logLevel": "debug",
      "features": {
        "enableDebug": true,
        "enableMetrics": true,
        "enableCache": false
      }
    },
    "production": {
      "name": "Production",
      "apiEndpoint": "https://api.example.com/api",
      "databaseUrl": "postgresql://prod-db:5432/prod_db",
      "logLevel": "warn",
      "features": {
        "enableDebug": false,
        "enableMetrics": true,
        "enableCache": true
      }
    }
  },
  "secrets": [
    ["API_KEY", "Base64 加密的值"],
    ["DB_PASSWORD", "Base64 加密的值"]
  ]
}
```

---

## 🔒 安全注意事项

1. **加密强度**: 当前使用 Base64 编码，生产环境建议替换为 AES-256
2. **配置文件**: 将 `.env.config.json` 添加到 `.gitignore`
3. **密钥过期**: 敏感密钥应设置过期时间
4. **访问控制**: 生产环境限制密钥访问权限

```bash
# .gitignore
.env.config.json
```

---

## 📊 API 参考

| 方法 | 参数 | 返回值 | 描述 |
|------|------|--------|------|
| `detectEnvironment()` | - | `Environment` | 自动检测当前环境 |
| `getCurrentEnvInfo()` | - | `{environment, config, isActive}` | 获取当前环境信息 |
| `listEnvironments()` | - | `Array<{name, config, isCurrent}>` | 列出所有环境 |
| `switchEnvironment(env)` | `Environment` | `boolean` | 切换环境 |
| `updateConfig(env, updates)` | `Environment, Partial<EnvConfig>` | `boolean` | 更新配置 |
| `addCustomEnv(name, config)` | `string, EnvConfig` | `boolean` | 添加自定义环境 |
| `setSecret(name, value, expiresHours?)` | `string, string, number?` | `boolean` | 存储密钥 |
| `getSecret(name)` | `string` | `string \| null` | 获取密钥 |
| `deleteSecret(name)` | `string` | `boolean` | 删除密钥 |
| `listSecrets()` | - | `Array<{name, encrypted, createdAt, expiresAt?}>` | 列出密钥 |
| `hasSecret(name)` | `string` | `boolean` | 检查密钥是否存在 |

---

**创建时间:** 2026-03-13  
**作者:** KAEL  
**版本:** 1.0.0
