# Layered Architecture Skill - 分层架构工具

**版本:** 1.0.0  
**作者:** KAEL Engineering  
**分类:** 架构设计 / 代码质量

---

## 📋 概述

提供分层架构管理工具，支持：
1. **层次定义** - 预定义 5 层架构模型
2. **依赖规则** - 自动验证跨层依赖合法性
3. **跨层调用** - 检测循环依赖和违规调用

---

## 🏗️ 架构层次

| 层次 | 优先级 | 允许依赖 | 描述 |
|------|--------|----------|------|
| **PRESENTATION** | 1 | BUSINESS, SHARED | 表示层 - UI/接口 |
| **BUSINESS** | 2 | DOMAIN, SHARED | 业务层 - 业务逻辑 |
| **DOMAIN** | 3 | SHARED | 领域层 - 领域模型 |
| **INFRASTRUCTURE** | 4 | DOMAIN, SHARED | 基础设施层 - 数据访问 |
| **SHARED** | 5 | 无 | 共享层 - 公共工具 |

### 依赖关系图

```
PRESENTATION (1)
    ↓
BUSINESS (2)
    ↓
DOMAIN (3)
    ↑
INFRASTRUCTURE (4)
    ↘
SHARED (5) ← 所有层可依赖
```

---

## 🚀 快速开始

### 1. 导入工具

```typescript
import {
  layeredArch,
  ArchitectureLayer,
  createModule,
  canDependOn
} from './src/skills/layered-arch-skill';
```

### 2. 注册模块

```typescript
// 表示层
layeredArch.registerModule(createModule(
  'UserController',
  ArchitectureLayer.PRESENTATION,
  'src/presentation/controllers/UserController.ts',
  ['UserService'],
  ['createUser', 'getUser']
));

// 业务层
layeredArch.registerModule(createModule(
  'UserService',
  ArchitectureLayer.BUSINESS,
  'src/business/services/UserService.ts',
  ['UserRepository'],
  ['createUser', 'updateUser']
));

// 基础设施层
layeredArch.registerModule(createModule(
  'UserRepository',
  ArchitectureLayer.INFRASTRUCTURE,
  'src/infrastructure/repositories/UserRepository.ts',
  ['UserEntity'],
  ['saveUser', 'findUser']
));

// 领域层
layeredArch.registerModule(createModule(
  'UserEntity',
  ArchitectureLayer.DOMAIN,
  'src/domain/entities/UserEntity.ts',
  [],
  ['User']
));
```

### 3. 验证依赖

```typescript
// 验证单个模块
const result = layeredArch.validateDependencies('UserController');
console.log(result.valid); // true/false
console.log(result.errors); // 错误列表

// 验证所有模块
const report = layeredArch.validateAllModules();
console.log(report.report); // 完整报告
```

---

## 📖 API 参考

### 核心类

#### `LayeredArchitectureManager`

**方法:**

| 方法 | 描述 | 返回值 |
|------|------|--------|
| `initialize()` | 初始化默认层次配置 | void |
| `registerModule(module)` | 注册模块 | void |
| `validateDependencies(name)` | 验证模块依赖 | `{valid, errors}` |
| `validateAllModules()` | 验证所有模块 | `{valid, report}` |
| `getLayerInfo(layer)` | 获取层次信息 | LayerConfig |
| `getAllLayers()` | 获取所有层次 | LayerConfig[] |
| `getCrossLayerRules()` | 获取跨层规则 | CrossLayerRule[] |
| `exportArchitectureGraph()` | 导出架构图谱 | string |
| `clear()` | 清空所有注册 | void |

### 快捷函数

```typescript
// 创建模块定义
createModule(
  name: string,
  layer: ArchitectureLayer,
  path: string,
  dependencies?: string[],
  exports?: string[]
): ModuleDefinition

// 检查层次依赖是否合法
canDependOn(from: ArchitectureLayer, to: ArchitectureLayer): boolean

// 获取层次优先级
getLayerPriority(layer: ArchitectureLayer): number
```

---

## ✅ 跨层调用规则

### 允许的规则

| 源层次 | → | 目标层次 | 说明 |
|--------|---|----------|------|
| PRESENTATION | → | BUSINESS | ✅ 表示层调用业务层 |
| PRESENTATION | → | SHARED | ✅ 表示层使用共享工具 |
| BUSINESS | → | DOMAIN | ✅ 业务层使用领域模型 |
| BUSINESS | → | SHARED | ✅ 业务层使用共享工具 |
| DOMAIN | → | SHARED | ✅ 领域层使用共享工具 |
| INFRASTRUCTURE | → | DOMAIN | ✅ 基础设施层使用领域模型 |
| INFRASTRUCTURE | → | SHARED | ✅ 基础设施层使用共享工具 |

### 禁止的规则

| 源层次 | → | 目标层次 | 说明 |
|--------|---|----------|------|
| DOMAIN | → | BUSINESS | ❌ 领域层不能依赖业务层 |
| DOMAIN | → | INFRASTRUCTURE | ❌ 领域层不能依赖基础设施 |
| BUSINESS | → | PRESENTATION | ❌ 业务层不能依赖表示层 |
| INFRASTRUCTURE | → | BUSINESS | ❌ 基础设施层不能依赖业务层 |

---

## 🔍 错误检测

### 1. 跨层调用违规

```typescript
// 错误示例：领域层依赖业务层
layeredArch.registerModule(createModule(
  'BadEntity',
  ArchitectureLayer.DOMAIN,
  'src/domain/BadEntity.ts',
  ['UserService'], // ❌ 违规！
  []
));

const result = layeredArch.validateDependencies('BadEntity');
// result.errors: ["违反跨层调用规则：BadEntity (domain) 不能依赖 UserService (business)"]
```

### 2. 循环依赖

```typescript
// 错误示例：循环依赖
layeredArch.registerModule(createModule(
  'ModuleA',
  ArchitectureLayer.BUSINESS,
  'src/business/ModuleA.ts',
  ['ModuleB'], // A → B
  []
));

layeredArch.registerModule(createModule(
  'ModuleB',
  ArchitectureLayer.BUSINESS,
  'src/business/ModuleB.ts',
  ['ModuleA'], // B → A (循环)
  []
));

const result = layeredArch.validateDependencies('ModuleA');
// result.errors: ["检测到循环依赖：ModuleA ↔ ModuleB"]
```

---

## 🛠️ 实际应用场景

### 场景 1: CI/CD 集成

```typescript
// ci/validate-architecture.ts
import { layeredArch } from '../src/skills/layered-arch-skill';
import { registerAllModules } from './module-registry';

registerAllModules();

const result = layeredArch.validateAllModules();
console.log(result.report);

if (!result.valid) {
  console.error('❌ 架构验证失败，构建终止');
  process.exit(1);
}

console.log('✅ 架构验证通过，继续构建');
```

### 场景 2: 代码审查自动化

```typescript
// scripts/pr-architecture-check.ts
import { canDependOn } from './src/skills/layered-arch-skill';

function validatePRChanges(changes: FileChange[]) {
  const violations: string[] = [];
  
  for (const change of changes) {
    const { fromLayer, toLayer } = analyzeImport(change);
    
    if (!canDependOn(fromLayer, toLayer)) {
      violations.push(
        `${change.file}: 违规导入 ${change.import} ` +
        `(${fromLayer} → ${toLayer})`
      );
    }
  }
  
  if (violations.length > 0) {
    console.error('❌ PR 包含架构违规:');
    violations.forEach(v => console.error(`  - ${v}`));
    return false;
  }
  
  return true;
}
```

### 场景 3: 架构文档生成

```typescript
// scripts/generate-arch-docs.ts
import { layeredArch } from './src/skills/layered-arch-skill';

const graph = layeredArch.exportArchitectureGraph();
const fs = require('fs');

fs.writeFileSync('docs/architecture-graph.txt', graph);
console.log('✅ 架构图谱已生成');
```

---

## 📊 验证报告示例

```
=== 分层架构验证报告 ===
模块总数：10
错误数：0
警告数：2

警告:
  ⚠️ 未使用的导出：CommonUtils.formatDate
  ⚠️ 未使用的导出：Logger.info

✅ 验证通过
```

---

## 🎯 最佳实践

### 1. 模块注册集中管理

```typescript
// module-registry.ts
export function registerAllModules() {
  // 表示层
  layeredArch.registerModule(createModule(/* ... */));
  
  // 业务层
  layeredArch.registerModule(createModule(/* ... */));
  
  // 领域层
  layeredArch.registerModule(createModule(/* ... */));
  
  // 基础设施层
  layeredArch.registerModule(createModule(/* ... */));
  
  // 共享层
  layeredArch.registerModule(createModule(/* ... */));
}
```

### 2. 在 Git Hook 中验证

```bash
# .git/hooks/pre-commit
#!/bin/bash
npx ts-node ci/validate-architecture.ts
if [ $? -ne 0 ]; then
  echo "❌ 架构验证失败"
  exit 1
fi
```

### 3. 定期生成架构报告

```typescript
// scripts/monthly-arch-report.ts
const report = layeredArch.validateAllModules();
sendToSlack(report.report); // 发送到团队频道
```

---

## 📝 扩展层次

如需自定义层次，可直接调用 `initialize()` 后修改：

```typescript
import { layeredArch, ArchitectureLayer } from './layered-arch-skill';

// 清空默认配置
layeredArch.clear();

// 自定义层次...
```

---

## 🔗 相关文件

- **源码:** `src/skills/layered-arch-skill.ts`
- **示例:** `src/skills/examples/layered-arch-examples.ts`
- **测试:** `test/layered-arch-skill.test.ts` (待创建)

---

## 📞 支持

遇到问题？联系 KAEL Engineering 团队。

---

_最后更新：2026-03-13_
