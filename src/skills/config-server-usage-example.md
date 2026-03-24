# KAEL 配置中心技能 - 使用示例

## 快速开始

### 1. 安装与初始化

```typescript
import ConfigServer from './config-server-skill';

// 创建配置服务器实例
const config = new ConfigServer('./data/config-store.json');
```

---

## 功能演示

### 📦 功能 1: 配置存储

#### 基础操作

```typescript
// 设置单个配置项
config.set('database.host', 'localhost', 'admin');
config.set('database.port', 5432, 'admin');
config.set('app.debug', true, 'developer');

// 获取配置项 (支持默认值)
const dbHost = config.get<string>('database.host');
const dbPort = config.get<number>('database.port', 3306); // 默认值
const debugMode = config.get<boolean>('app.debug', false);

// 批量设置
config.setMany({
  'app.name': 'MyApp',
  'app.version': '1.0.0',
  'app.env': 'production',
  'cache.enabled': true,
  'cache.ttl': 3600,
}, 'admin');

// 检查配置是否存在
if (config.has('database.host')) {
  console.log('数据库主机已配置');
}

// 删除配置项
config.delete('app.debug');

// 获取所有配置
const allConfig = config.getAll();
console.log(allConfig);
```

#### 实际应用场景

```typescript
// 场景 1: 数据库配置
config.setMany({
  'db.mysql.host': process.env.DB_HOST || 'localhost',
  'db.mysql.port': parseInt(process.env.DB_PORT || '3306'),
  'db.mysql.user': process.env.DB_USER || 'root',
  'db.mysql.password': process.env.DB_PASSWORD,
  'db.mysql.database': process.env.DB_NAME || 'app',
}, 'system');

// 场景 2: API 密钥管理
config.set('apikeys.stripe', 'sk_test_xxx', 'admin');
config.set('apikeys.sendgrid', 'SG.xxx', 'admin');

// 场景 3: 功能开关
config.setMany({
  'features.newDashboard': true,
  'features.darkMode': false,
  'features.betaFeatures': ['ai-chat', 'auto-save'],
}, 'product-team');
```

---

### 🔄 功能 2: 配置刷新

#### 监听配置变更

```typescript
// 注册全局监听器
const unsubscribe = config.onChange((key, newValue, oldValue) => {
  console.log(`[配置变更] ${key}`);
  console.log(`  旧值:`, oldValue);
  console.log(`  新值:`, newValue);
  
  // 根据配置键执行特定逻辑
  if (key === 'log.level') {
    updateLogLevel(newValue);
  }
  if (key.startsWith('db.')) {
    reconnectDatabase();
  }
});

// 使用配置
config.set('log.level', 'debug', 'admin');
// 输出: [配置变更] log.level
//       旧值: info
//       新值: debug

// 取消监听 (在清理时使用)
unsubscribe();
```

#### 热重载配置

```typescript
// 场景：外部修改了配置文件，需要重新加载
config.reload();

// 场景：强制刷新特定配置项
config.refresh('database.connectionPool');

// 实际应用：配合文件监控实现自动重载
import * as fs from 'fs';

fs.watch('./data/config-store.json', (eventType) => {
  if (eventType === 'change') {
    console.log('配置文件变更，自动重载...');
    config.reload();
  }
});
```

#### 实际应用场景

```typescript
// 场景 1: 动态日志级别调整
config.onChange((key, newValue) => {
  if (key === 'logging.level') {
    logger.setLevel(newValue);
    console.log(`日志级别已更新为：${newValue}`);
  }
});

// 场景 2: 数据库连接池动态调整
config.onChange((key, newValue) => {
  if (key === 'db.pool.size') {
    dbPool.resize(newValue);
  }
  if (key === 'db.pool.timeout') {
    dbPool.setTimeout(newValue);
  }
});

// 场景 3: 功能开关实时切换
config.onChange((key, newValue) => {
  if (key.startsWith('features.')) {
    const featureName = key.replace('features.', '');
    featureFlags[featureName] = newValue;
    notifyServices('feature-update', { featureName, enabled: newValue });
  }
});
```

---

### 📚 功能 3: 版本管理

#### 创建快照

```typescript
// 创建配置快照 (在进行重大变更前)
const snapshot = config.createSnapshot('Before migration to v2.0');
console.log('快照创建成功:', snapshot.version);

// 快照包含的信息
console.log({
  version: snapshot.version,      // 版本号
  timestamp: snapshot.timestamp,  // 创建时间
  description: snapshot.description, // 描述
  configCount: Object.keys(snapshot.config).length, // 配置项数量
});
```

#### 查看历史版本

```typescript
// 获取最近 10 个版本
const history = config.getHistory(10);

history.forEach(snapshot => {
  console.log(`v${snapshot.version} - ${snapshot.description}`);
  console.log(`  创建时间：${snapshot.timestamp}`);
  console.log(`  配置项数：${Object.keys(snapshot.config).length}`);
});
```

#### 版本回滚

```typescript
try {
  // 回滚到指定版本
  config.rollback(5);
  console.log('已成功回滚到版本 5');
  
  // 回滚后验证配置
  console.log('当前配置:', config.getAll());
} catch (error) {
  console.error('回滚失败:', error.message);
}
```

#### 版本对比

```typescript
// 比较两个版本的差异
const diff = config.diffVersions(3, 7);

Object.entries(diff).forEach(([key, change]) => {
  console.log(`${key}:`);
  console.log(`  v3: ${change.old}`);
  console.log(`  v7: ${change.new}`);
});

// 输出示例:
// app.version:
//   v3: 1.0.0
//   v7: 1.2.0
// features.newUI:
//   v3: false
//   v7: true
```

#### 实际应用场景

```typescript
// 场景 1: 发布前备份
async function deployNewConfig(newConfig: Record<string, any>) {
  // 创建发布前快照
  config.createSnapshot(`Pre-deployment backup - ${new Date().toISOString()}`);
  
  // 应用新配置
  config.setMany(newConfig, 'deployment-script');
  
  console.log('部署完成，可随时回滚');
}

// 场景 2: A/B 测试配置切换
function enableABTest(variant: 'A' | 'B') {
  const snapshots = {
    'A': config.createSnapshot('A/B Test - Variant A'),
    'B': config.createSnapshot('A/B Test - Variant B'),
  };
  
  if (variant === 'A') {
    config.setMany({
      'abtest.ui': 'old',
      'abtest.algorithm': 'v1',
    }, 'ab-test-runner');
  } else {
    config.setMany({
      'abtest.ui': 'new',
      'abtest.algorithm': 'v2',
    }, 'ab-test-runner');
  }
}

// 场景 3: 配置审计
function auditConfigChanges() {
  const history = config.getHistory(100);
  const auditLog = history.map(snapshot => ({
    version: snapshot.version,
    time: snapshot.timestamp,
    description: snapshot.description,
    changedBy: Object.values(snapshot.config)
      .map((v: any) => v.updatedBy)
      .filter(Boolean)[0],
  }));
  
  console.table(auditLog);
  return auditLog;
}
```

---

### 💾 导入导出

```typescript
// 导出配置到文件
config.exportToFile('./backup/config-2026-03-13.json');

// 从文件导入配置
config.importFromFile('./backup/config-2026-03-13.json', 'restore-script');

// 场景：环境迁移
// 开发环境导出
devConfig.exportToFile('./config-dev.json');

// 生产环境导入
prodConfig.importFromFile('./config-dev.json', 'migration');
```

---

## 完整示例：配置中心服务

```typescript
import ConfigServer from './config-server-skill';
import { createServer } from 'http';

class ConfigService {
  private config: ConfigServer;
  
  constructor() {
    this.config = new ConfigServer('./data/config-store.json');
    this.setupListeners();
  }
  
  private setupListeners() {
    // 监听配置变更，自动通知相关服务
    this.config.onChange((key, newValue) => {
      console.log(`[ConfigService] ${key} 更新为 ${newValue}`);
      
      // 根据配置类型执行不同逻辑
      if (key.startsWith('db.')) {
        this.refreshDatabaseConnection();
      }
      if (key.startsWith('cache.')) {
        this.refreshCacheConfig();
      }
      if (key.startsWith('log.')) {
        this.updateLogLevel();
      }
    });
  }
  
  // HTTP API
  startServer(port: number = 3000) {
    createServer((req, res) => {
      if (req.url === '/api/config' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(this.config.getAll()));
      }
      
      if (req.url === '/api/config/history' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(this.config.getHistory(10)));
      }
    }).listen(port);
    
    console.log(`配置服务运行在 http://localhost:${port}`);
  }
  
  private refreshDatabaseConnection() {
    // 重新初始化数据库连接
    console.log('刷新数据库连接...');
  }
  
  private refreshCacheConfig() {
    // 重新配置缓存
    console.log('刷新缓存配置...');
  }
  
  private updateLogLevel() {
    // 更新日志级别
    console.log('更新日志级别...');
  }
}

// 启动服务
const service = new ConfigService();
service.startServer(3000);
```

---

## 最佳实践

### ✅ 推荐做法

1. **重要变更前创建快照**
   ```typescript
   config.createSnapshot('Before major update');
   config.setMany(majorChanges);
   ```

2. **使用有意义的描述**
   ```typescript
   config.createSnapshot('v2.0 migration - added new payment gateway');
   ```

3. **记录更新者**
   ```typescript
   config.set('api.key', 'xxx', 'deployment-script');
   ```

4. **定期清理旧版本**
   ```typescript
   // 在构造函数中设置合理的 maxHistory
   const config = new ConfigServer('./config.json');
   config.store.maxHistory = 50; // 保留 50 个版本
   ```

### ❌ 避免做法

1. **不要存储敏感信息明文**
   ```typescript
   // ❌ 错误
   config.set('db.password', 'secret123');
   
   // ✅ 正确
   config.set('db.password', encrypt('secret123'));
   ```

2. **不要频繁创建快照**
   ```typescript
   // ❌ 错误 - 每次设置都创建快照
   config.set('key', 'value');
   config.createSnapshot();
   
   // ✅ 正确 - 批量变更后创建
   config.setMany(changes);
   config.createSnapshot('Batch update');
   ```

---

## API 参考

| 方法 | 参数 | 返回值 | 描述 |
|------|------|--------|------|
| `set` | key, value, updatedBy? | void | 设置配置项 |
| `setMany` | configs, updatedBy? | void | 批量设置 |
| `get` | key, defaultValue? | T \| undefined | 获取配置项 |
| `getAll` | - | Record<string, any> | 获取所有配置 |
| `has` | key | boolean | 检查是否存在 |
| `delete` | key | boolean | 删除配置项 |
| `onChange` | callback | () => void | 注册监听器 |
| `reload` | - | void | 热重载配置 |
| `refresh` | key | void | 刷新特定配置 |
| `createSnapshot` | description? | ConfigSnapshot | 创建快照 |
| `getHistory` | limit? | ConfigSnapshot[] | 获取历史版本 |
| `rollback` | version | boolean | 回滚到版本 |
| `diffVersions` | v1, v2 | Record | 版本对比 |
| `exportToFile` | filePath | void | 导出到文件 |
| `importFromFile` | filePath, updatedBy? | void | 从文件导入 |

---

**版本:** 1.0.0  
**作者:** KAEL Engineering  
**最后更新:** 2026-03-13
