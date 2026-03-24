# Deprecation Utils - 弃用警告工具

**版本:** 1.0.0  
**作者:** Axon  
**创建日期:** 2026-03-13

---

## 📋 概述

弃用警告工具提供了一套完整的 API 弃用管理机制，包括：

1. **弃用警告** - 在运行时发出弃用通知
2. **迁移指南** - 提供替代方案文档
3. **版本追踪** - 记录弃用时间线和移除计划

---

## 🚀 快速开始

### 安装

无需额外安装，直接使用：

```typescript
import {
  registerDeprecation,
  warnDeprecated,
  generateMigrationReport
} from './src/skills/deprecation-utils-skill';
```

### 基本用法

```typescript
// 1. 注册弃用功能
registerDeprecation({
  name: 'legacyApiClient',
  deprecatedSince: '2.0.0',
  removalVersion: '3.0.0',
  replacement: 'modernApiClient',
  migrationGuide: 'https://docs.example.com/migrate-to-v3',
  notes: '旧客户端不支持 HTTP/2 和自动重试'
});

// 2. 在代码中发出警告
function createClient() {
  warnDeprecated('legacyApiClient');
  return new LegacyApiClient();
}

// 输出:
// ⚠️  DEPRECATION WARNING: "legacyApiClient"
//    Deprecated since: v2.0.0
//    Removal version: v3.0.0
//    Replacement: modernApiClient
//    Migration Guide: https://docs.example.com/migrate-to-v3
//    Notes: 旧客户端不支持 HTTP/2 和自动重试
```

---

## 📖 API 参考

### 核心函数

#### `registerDeprecation(info: DeprecationInfo)`

注册一个弃用功能。

**参数:**
- `info` - 弃用元数据
  - `name: string` - 被弃用的功能名称
  - `deprecatedSince: string` - 弃用版本
  - `removalVersion: string` - 计划移除版本
  - `replacement: string` - 替代方案
  - `migrationGuide?: string` - 迁移指南 URL
  - `level?: 'warning' | 'error' | 'silent'` - 弃用级别
  - `notes?: string` - 额外说明

**示例:**
```typescript
registerDeprecation({
  name: 'oldAuthMethod',
  deprecatedSince: '1.5.0',
  removalVersion: '2.0.0',
  replacement: 'newAuthMethod',
  level: 'error' // 抛出错误而非警告
});
```

---

#### `warnDeprecated(name: string, customMessage?: string)`

发出弃用警告。

**参数:**
- `name` - 被弃用的功能名称
- `customMessage` - 自定义消息 (可选)

**示例:**
```typescript
// 基本用法
warnDeprecated('legacyApiClient');

// 带自定义消息
warnDeprecated('legacyApiClient', '请在 Q2 前完成迁移');

// 在函数中使用
function legacyFunction() {
  warnDeprecated('legacyFunction');
  // ... 原有逻辑
}
```

---

#### `getDeprecationInfo(name: string): DeprecationInfo | undefined`

获取弃用信息。

**示例:**
```typescript
const info = getDeprecationInfo('legacyApiClient');
if (info) {
  console.log(`迁移到：${info.replacement}`);
  console.log(`移除版本：v${info.removalVersion}`);
}
```

---

#### `getAllDeprecations(): DeprecationInfo[]`

获取所有弃用记录。

**示例:**
```typescript
const allDeprecations = getAllDeprecations();
allDeprecations.forEach(dep => {
  console.log(`${dep.name} → ${dep.replacement}`);
});
```

---

### 版本追踪

#### `addVersionTrack(track: VersionTrack)`

添加版本追踪记录。

**参数:**
- `track` - 版本追踪信息
  - `version: string` - 版本号
  - `releaseDate: string` - 发布日期
  - `deprecations: string[]` - 弃用功能列表
  - `removals: string[]` - 移除功能列表
  - `breakingChanges: string[]` - 重大变更

**示例:**
```typescript
addVersionTrack({
  version: '2.0.0',
  releaseDate: '2026-03-01',
  deprecations: ['legacyApiClient', 'oldAuthMethod'],
  removals: ['v1Endpoint'],
  breakingChanges: ['认证机制从 Basic 改为 Bearer']
});
```

---

#### `getVersionHistory(): VersionTrack[]`

获取版本历史。

**示例:**
```typescript
const history = getVersionHistory();
history.forEach(track => {
  console.log(`v${track.version}: ${track.deprecations.length} 弃用`);
});
```

---

#### `checkMigrationRequired(targetVersion: string): DeprecationInfo[]`

检查是否需要迁移。

**示例:**
```typescript
const needsMigration = checkMigrationRequired('3.0.0');
needsMigration.forEach(item => {
  console.log(`需要迁移：${item.name}`);
});
```

---

#### `generateMigrationReport(): string`

生成迁移报告。

**示例:**
```typescript
const report = generateMigrationReport();
console.log(report);
```

**输出示例:**
```
📋 DEPRECATION MIGRATION REPORT
==================================================

Total Deprecated Items: 2

🚨 REMOVAL VERSION: v3.0.0
----------------------------------------

  • legacyApiClient
    Deprecated: v2.0.0
    Replace with: modernApiClient
    Guide: https://docs.example.com/migrate-to-v3
    Notes: 旧客户端不支持 HTTP/2 和自动重试

  • oldAuthMethod
    Deprecated: v1.5.0
    Replace with: newAuthMethod

==================================================
```

---

### 配置管理

#### `configureDeprecation(config: Partial<DeprecationConfig>)`

配置弃用工具。

**参数:**
- `config` - 配置选项
  - `enabled?: boolean` - 是否启用弃用警告 (默认: true)
  - `defaultLevel?: 'warning' | 'error' | 'silent'` - 默认弃用级别
  - `showStackTrace?: boolean` - 是否显示堆栈跟踪
  - `logger?: (message: string) => void` - 自定义日志函数

**示例:**
```typescript
// 禁用弃用警告
configureDeprecation({ enabled: false });

// 设置为错误级别
configureDeprecation({ defaultLevel: 'error' });

// 自定义日志
configureDeprecation({
  logger: (msg) => myLogger.warn(msg)
});

// 显示堆栈跟踪 (调试用)
configureDeprecation({ showStackTrace: true });
```

---

#### `resetDeprecationConfig()`

重置配置为默认值。

**示例:**
```typescript
resetDeprecationConfig();
```

---

### 测试工具

#### `clearWarningCache()`

清除警告记录 (避免重复警告)。

**示例:**
```typescript
clearWarningCache(); // 用于测试
```

---

#### `clearAllDeprecations()`

清除所有注册信息。

**示例:**
```typescript
clearAllDeprecations(); // 用于测试
```

---

## 🎯 高级用法

### 装饰器模式 (TypeScript)

使用装饰器自动标记弃用方法:

```typescript
import { registerDeprecation, warnDeprecated } from './deprecation-utils-skill';

function Deprecated(info: DeprecationInfo) {
  registerDeprecation(info);
  
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    
    descriptor.value = function (...args: any[]) {
      warnDeprecated(info.name);
      return originalMethod.apply(this, args);
    };
    
    return descriptor;
  };
}

// 使用装饰器
class LegacyService {
  @Deprecated({
    name: 'LegacyService.fetchData',
    deprecatedSince: '2.0.0',
    removalVersion: '3.0.0',
    replacement: 'DataService.query',
    migrationGuide: 'https://docs.example.com/data-service'
  })
  fetchData() {
    // ... 旧实现
  }
}

// 调用时自动发出警告
const service = new LegacyService();
service.fetchData(); // ⚠️ 自动发出弃用警告
```

---

### 包装旧 API

平滑迁移旧 API:

```typescript
import { warnDeprecated } from './deprecation-utils-skill';

// 注册弃用
registerDeprecation({
  name: 'createLegacyConnection',
  deprecatedSince: '2.0.0',
  removalVersion: '3.0.0',
  replacement: 'createConnection'
});

// 包装旧函数
export function createLegacyConnection(config: any) {
  warnDeprecated('createLegacyConnection');
  // 调用新实现
  return createConnection({ ...config, legacy: true });
}

// 导出新函数
export function createConnection(config: any) {
  // 新实现
}
```

---

### 条件警告

根据环境控制警告行为:

```typescript
import { configureDeprecation } from './deprecation-utils-skill';

// 生产环境禁用警告
if (process.env.NODE_ENV === 'production') {
  configureDeprecation({ enabled: false });
}

// 开发环境显示堆栈
if (process.env.NODE_ENV === 'development') {
  configureDeprecation({ showStackTrace: true });
}

// 测试环境使用自定义日志
if (process.env.NODE_ENV === 'test') {
  configureDeprecation({
    logger: (msg) => testLogger.warn(msg)
  });
}
```

---

### 批量注册

从配置文件批量注册弃用:

```typescript
import { registerDeprecation } from './deprecation-utils-skill';

const deprecations = [
  {
    name: 'api.v1.users',
    deprecatedSince: '2.0.0',
    removalVersion: '3.0.0',
    replacement: 'api.v2.users'
  },
  {
    name: 'legacyAuth',
    deprecatedSince: '1.8.0',
    removalVersion: '2.5.0',
    replacement: 'modernAuth'
  }
];

deprecations.forEach(dep => registerDeprecation(dep));
```

---

## 📊 类型定义

```typescript
// 弃用级别
type DeprecationLevel = 'warning' | 'error' | 'silent';

// 弃用元数据
interface DeprecationInfo {
  name: string;              // 被弃用的功能名称
  deprecatedSince: string;   // 弃用版本
  removalVersion: string;    // 计划移除版本
  replacement: string;       // 替代方案
  migrationGuide?: string;   // 迁移指南 URL
  level?: DeprecationLevel;  // 弃用级别
  notes?: string;            // 额外说明
}

// 版本追踪记录
interface VersionTrack {
  version: string;           // 版本号
  releaseDate: string;       // 发布日期
  deprecations: string[];    // 弃用功能列表
  removals: string[];        // 移除功能列表
  breakingChanges: string[]; // 重大变更
}

// 配置选项
interface DeprecationConfig {
  enabled: boolean;                  // 是否启用
  defaultLevel: DeprecationLevel;    // 默认级别
  showStackTrace: boolean;           // 显示堆栈
  logger?: (message: string) => void;// 自定义日志
}
```

---

## ⚠️ 注意事项

1. **避免重复警告**: 同一功能的警告只会发出一次 (基于名称去重)
2. **性能影响**: 弃用检查有轻微性能开销，生产环境可考虑禁用
3. **线程安全**: 当前实现不是线程安全的，多线程环境需加锁
4. **版本格式**: 使用语义化版本 (如 `1.0.0`, `2.1.3`)

---

## 🧪 测试示例

```typescript
import {
  registerDeprecation,
  warnDeprecated,
  clearAllDeprecations,
  clearWarningCache
} from './deprecation-utils-skill';

describe('Deprecation Utils', () => {
  beforeEach(() => {
    clearAllDeprecations();
    clearWarningCache();
  });

  test('should warn on deprecated function', () => {
    registerDeprecation({
      name: 'testFunc',
      deprecatedSince: '1.0.0',
      removalVersion: '2.0.0',
      replacement: 'newFunc'
    });

    const warnSpy = jest.spyOn(console, 'warn');
    warnDeprecated('testFunc');
    expect(warnSpy).toHaveBeenCalled();
  });

  test('should not warn twice for same function', () => {
    registerDeprecation({
      name: 'testFunc',
      deprecatedSince: '1.0.0',
      removalVersion: '2.0.0',
      replacement: 'newFunc'
    });

    const warnSpy = jest.spyOn(console, 'warn');
    warnDeprecated('testFunc');
    warnDeprecated('testFunc');
    expect(warnSpy).toHaveBeenCalledTimes(1);
  });

  test('should throw error with error level', () => {
    registerDeprecation({
      name: 'testFunc',
      deprecatedSince: '1.0.0',
      removalVersion: '2.0.0',
      replacement: 'newFunc',
      level: 'error'
    });

    expect(() => warnDeprecated('testFunc')).toThrow('DeprecationError');
  });
});
```

---

## 📝 最佳实践

1. **尽早注册**: 在模块加载时注册弃用，而非运行时
2. **提供迁移路径**: 始终指定 `replacement` 和 `migrationGuide`
3. **合理设置级别**: 
   - `warning`: 一般弃用
   - `error`: 关键弃用，需要立即处理
   - `silent`: 仅记录，不通知用户
4. **版本规划**: 至少提前一个大版本宣布弃用
5. **文档更新**: 同步更新迁移指南和文档

---

## 🔗 相关资源

- [语义化版本规范](https://semver.org/)
- [TypeScript 装饰器](https://www.typescriptlang.org/docs/handbook/decorators.html)
- [Node.js 弃用最佳实践](https://nodejs.org/en/docs/guides/publishing-npm-packages/#deprecating-dependencies)

---

**最后更新:** 2026-03-13  
**维护者:** Axon
