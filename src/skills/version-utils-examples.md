# 语义化版本管理工具 - 使用示例

## 📦 安装与导入

```typescript
// ES6 模块导入
import {
  parseVersion,
  compareVersions,
  compareVersionStrings,
  isVersionGreater,
  isVersionLess,
  isVersionEqual,
  matchesVersionRange,
  parseVersionRange,
  findLatestMatchingVersion,
  incrementVersion,
  versionToString,
  type SemanticVersion,
  type VersionRange,
} from './skills/version-utils-skill';
```

---

## 🔧 功能演示

### 1. 版本号解析

```typescript
// 解析标准版本号
const v1 = parseVersion('1.2.3');
// 输出: { major: 1, minor: 2, patch: 3, raw: '1.2.3' }

// 解析预发布版本
const v2 = parseVersion('2.0.0-beta.1');
// 输出: { major: 2, minor: 0, patch: 0, prerelease: 'beta.1', raw: '2.0.0-beta.1' }

// 解析带构建元数据的版本
const v3 = parseVersion('1.0.0+build.123');
// 输出: { major: 1, minor: 0, patch: 0, build: 'build.123', raw: '1.0.0+build.123' }

// 错误处理
try {
  parseVersion('invalid'); // 抛出 Error
} catch (e) {
  console.error(e.message); // "Invalid version format: invalid"
}
```

---

### 2. 版本比较

```typescript
// 比较两个版本号字符串
compareVersionStrings('1.2.3', '1.2.4'); // -1 (小于)
compareVersionStrings('2.0.0', '1.9.9'); // 1 (大于)
compareVersionStrings('1.0.0', '1.0.0'); // 0 (相等)

// 使用 SemanticVersion 对象比较
const v1 = parseVersion('1.2.3');
const v2 = parseVersion('1.2.4');
compareVersions(v1, v2); // -1

// 便捷比较函数
isVersionGreater('2.0.0', '1.9.9');     // true
isVersionGreaterOrEqual('1.0.0', '1.0.0'); // true
isVersionLess('1.0.0', '2.0.0');        // true
isVersionLessOrEqual('1.0.0', '1.0.0'); // true
isVersionEqual('1.0.0', '1.0.0');       // true

// 预发布版本比较
isVersionLess('1.0.0-beta', '1.0.0');   // true (预发布 < 正式版)
isVersionGreater('1.0.0', '1.0.0-beta'); // true
```

---

### 3. 版本范围匹配

```typescript
// 精确匹配
matchesVersionRange('1.2.3', '1.2.3');  // true
matchesVersionRange('1.2.4', '1.2.3');  // false

// 操作符匹配
matchesVersionRange('1.2.4', '>=1.2.3'); // true
matchesVersionRange('1.2.2', '>1.2.3');  // false
matchesVersionRange('1.2.2', '<=1.2.3'); // true
matchesVersionRange('1.2.2', '<1.2.3');  // true

// Caret 范围 (^) - 不改变主版本号
matchesVersionRange('1.5.0', '^1.2.3');  // true (>=1.2.3 且 <2.0.0)
matchesVersionRange('2.0.0', '^1.2.3');  // false

// Tilde 范围 (~) - 不改变主版本号和次版本号
matchesVersionRange('1.2.8', '~1.2.3');  // true (>=1.2.3 且 <1.3.0)
matchesVersionRange('1.3.0', '~1.2.3');  // false

// 通配符匹配
matchesVersionRange('1.2.5', '1.2.x');   // true
matchesVersionRange('1.2.5', '1.2.*');   // true
matchesVersionRange('1.3.0', '1.2.x');   // false
matchesVersionRange('1.9.9', '1.x');     // true
matchesVersionRange('2.0.0', '1.x');     // false
matchesVersionRange('5.0.0', '*');       // true

// 范围匹配
matchesVersionRange('1.5.0', '1.0.0 - 2.0.0'); // true
matchesVersionRange('0.9.0', '1.0.0 - 2.0.0'); // false
```

---

### 4. 查找匹配的最新版本

```typescript
const availableVersions = [
  '1.0.0',
  '1.1.0',
  '1.2.0',
  '1.2.3',
  '1.3.0',
  '2.0.0',
  '2.1.0',
];

// 查找符合 ^1.2.0 的最新版本
findLatestMatchingVersion(availableVersions, '^1.2.0'); // '1.3.0'

// 查找符合 ~1.2.0 的最新版本
findLatestMatchingVersion(availableVersions, '~1.2.0'); // '1.2.3'

// 查找符合 >=1.5.0 的最新版本
findLatestMatchingVersion(availableVersions, '>=1.5.0'); // '2.1.0'

// 查找符合 1.x 的最新版本
findLatestMatchingVersion(availableVersions, '1.x'); // '1.3.0'

// 无匹配时返回 null
findLatestMatchingVersion(availableVersions, '3.x'); // null
```

---

### 5. 版本号自增

```typescript
// 主版本号自增
incrementVersion('1.2.3', 'major'); // '2.0.0'

// 次版本号自增
incrementVersion('1.2.3', 'minor'); // '1.3.0'

// 修订号自增
incrementVersion('1.2.3', 'patch'); // '1.2.4'

// 实际应用场景
const currentVersion = '1.5.2';
const nextMajor = incrementVersion(currentVersion, 'major'); // '2.0.0'
const nextMinor = incrementVersion(currentVersion, 'minor'); // '1.6.0'
const nextPatch = incrementVersion(currentVersion, 'patch'); // '1.5.3'
```

---

### 6. SemanticVersion 对象操作

```typescript
// 解析版本号
const version = parseVersion('1.2.3-beta.1+build.456');

// 访问各个字段
version.major;      // 1
version.minor;      // 2
version.patch;      // 3
version.prerelease; // 'beta.1'
version.build;      // 'build.456'
version.raw;        // '1.2.3-beta.1+build.456'

// 转回字符串
versionToString(version); // '1.2.3-beta.1+build.456'
```

---

## 🎯 实际应用场景

### 场景 1: 包管理器依赖解析

```typescript
function resolveDependency(
  packageName: string,
  versionRange: string,
  availableVersions: string[]
): string | null {
  const latest = findLatestMatchingVersion(availableVersions, versionRange);
  
  if (!latest) {
    throw new Error(
      `No matching version found for ${packageName}@${versionRange}`
    );
  }
  
  return latest;
}

// 使用示例
const reactVersions = ['16.8.0', '17.0.0', '17.0.2', '18.0.0', '18.2.0'];
const selectedVersion = resolveDependency('react', '^17.0.0', reactVersions);
console.log(selectedVersion); // '17.0.2'
```

### 场景 2: API 兼容性检查

```typescript
function checkApiCompatibility(
  requiredVersion: string,
  currentVersion: string
): { compatible: boolean; message: string } {
  if (isVersionGreaterOrEqual(currentVersion, requiredVersion)) {
    return {
      compatible: true,
      message: `当前版本 ${currentVersion} 满足要求 (>= ${requiredVersion})`,
    };
  }
  
  return {
    compatible: false,
    message: `版本不兼容：需要 >= ${requiredVersion}，当前为 ${currentVersion}`,
  };
}

// 使用示例
checkApiCompatibility('2.0.0', '2.1.0');
// { compatible: true, message: '当前版本 2.1.0 满足要求 (>= 2.0.0)' }

checkApiCompatibility('2.0.0', '1.9.0');
// { compatible: false, message: '版本不兼容：需要 >= 2.0.0，当前为 1.9.0' }
```

### 场景 3: 自动版本号管理

```typescript
function bumpVersion(
  currentVersion: string,
  breakType: 'breaking' | 'feature' | 'fix'
): string {
  switch (breakType) {
    case 'breaking':
      return incrementVersion(currentVersion, 'major');
    case 'feature':
      return incrementVersion(currentVersion, 'minor');
    case 'fix':
      return incrementVersion(currentVersion, 'patch');
  }
}

// 使用示例
bumpVersion('1.2.3', 'breaking'); // '2.0.0' (破坏性更新)
bumpVersion('1.2.3', 'feature');  // '1.3.0' (新功能)
bumpVersion('1.2.3', 'fix');      // '1.2.4' (Bug 修复)
```

### 场景 4: 版本范围验证器

```typescript
function validateVersionConstraints(
  version: string,
  constraints: string[]
): { valid: boolean; failedConstraints: string[] } {
  const failedConstraints = constraints.filter(
    constraint => !matchesVersionRange(version, constraint)
  );
  
  return {
    valid: failedConstraints.length === 0,
    failedConstraints,
  };
}

// 使用示例
validateVersionConstraints('1.5.0', ['>=1.0.0', '<2.0.0', '~1.5.0']);
// { valid: true, failedConstraints: [] }

validateVersionConstraints('2.0.0', ['>=1.0.0', '<2.0.0', '~1.5.0']);
// { valid: false, failedConstraints: ['<2.0.0', '~1.5.0'] }
```

---

## 📝 注意事项

1. **遵循 SemVer 2.0.0 规范**: https://semver.org/
2. **预发布版本优先级**: `1.0.0-alpha < 1.0.0-beta < 1.0.0`
3. **构建元数据不参与比较**: `1.0.0+build1` 与 `1.0.0+build2` 相等
4. **版本号格式验证**: 必须为 `X.Y.Z` 格式，X/Y/Z 为非负整数
5. **错误处理**: 解析失败时抛出 Error，调用方需捕获处理

---

## 🧪 测试命令

```bash
# 运行示例代码
npx ts-node src/skills/version-utils-skill.ts

# 运行单元测试 (如已配置)
npm test -- version-utils
```

---

**创建时间:** 2026-03-13  
**作者:** KAEL  
**版本:** 1.0.0
