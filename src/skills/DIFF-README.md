# Diff Utils 技能文档

文本差异比较工具，提供 Diff 生成、Patch 应用和合并冲突检测功能。

---

## 📦 安装

```bash
# 无需额外依赖，纯 TypeScript 实现
import { generateDiff, applyPatch, detectConflicts } from './diff-utils-skill';
```

---

## 🚀 快速开始

### 1. 生成 Diff

```typescript
import { generateDiff, formatDiffSummary } from './diff-utils-skill';

const original = `function hello() {
  console.log('Hello');
}`;

const modified = `function hello(name) {
  console.log('Hello, ' + name);
}`;

const diff = generateDiff(original, modified);
console.log(formatDiffSummary(diff));
```

**输出:**
```
📊 Diff 统计:
  +2 添加
  -2 删除
  ~0 修改

操作数：2

--- Unified Diff ---
--- original
+++ modified
@@ -1,2 +1,2 @@
-function hello() {
-  console.log('Hello');
+function hello(name) {
+  console.log('Hello, ' + name);
 }
```

---

### 2. 应用 Patch

```typescript
import { applyPatch } from './diff-utils-skill';

const patch = `--- original
+++ modified
@@ -1,2 +1,2 @@
-function hello() {
-  console.log('Hello');
+function hello(name) {
+  console.log('Hello, ' + name);
 }`;

const result = applyPatch(original, patch);

if (result.success) {
  console.log('✅ Patch 应用成功');
  console.log(result.result);
} else {
  console.log('❌ 失败:', result.error);
}
```

---

### 3. 三向合并

```typescript
import { threeWayMerge } from './diff-utils-skill';

const base = `const config = {
  port: 3000,
  debug: false,
};`;

const featureA = `const config = {
  port: 3000,
  debug: true,  // A 启用了调试
};`;

const featureB = `const config = {
  port: 8080,  // B 修改了端口
  debug: false,
};`;

const mergeResult = threeWayMerge(base, featureA, featureB);

if (mergeResult.success) {
  console.log('✅ 合并成功');
} else {
  console.log('⚠️  检测到冲突:');
  console.log(mergeResult.result); // 带冲突标记的结果
}
```

**冲突输出:**
```
<<<<<<< CURRENT
const config = {
  port: 3000,
  debug: true,  // A 启用了调试
=======
const config = {
  port: 8080,  // B 修改了端口
  debug: false,
};
>>>>>>> INCOMING
```

---

## 📖 API 参考

### generateDiff(oldText, newText, options?)

生成两个文本之间的差异。

**参数:**
- `oldText` (string): 原始文本
- `newText` (string): 新文本
- `options` (DiffOptions, 可选): 配置选项

**DiffOptions:**
```typescript
interface DiffOptions {
  ignoreWhitespace?: boolean;  // 忽略空白，默认 false
  ignoreCase?: boolean;        // 忽略大小写，默认 false
  contextLines?: number;       // 上下文行数，默认 3
  detailedStats?: boolean;     // 详细统计，默认 true
}
```

**返回值:**
```typescript
interface DiffResult {
  hasChanges: boolean;
  operations: DiffOperation[];
  stats: {
    additions: number;
    deletions: number;
    changes: number;
  };
  unifiedDiff: string;
}
```

---

### applyPatch(originalText, patch, options?)

应用 Unified Diff 格式的 patch 到文本。

**参数:**
- `originalText` (string): 原始文本
- `patch` (string): Unified Diff 格式的 patch
- `options` (PatchOptions, 可选): 配置选项

**PatchOptions:**
```typescript
interface PatchOptions {
  strict?: boolean;   // 严格模式，默认 true
  reverse?: boolean;  // 反转 patch，默认 false
}
```

**返回值:**
```typescript
interface PatchResult {
  success: boolean;
  result?: string;
  error?: string;
  warnings: string[];
}
```

---

### detectConflicts(oldText, newText1, newText2)

检测两个版本之间的合并冲突。

**参数:**
- `oldText` (string): 共同祖先/原始文本
- `newText1` (string): 第一个版本
- `newText2` (string): 第二个版本

**返回值:**
```typescript
interface MergeResult {
  success: boolean;
  result?: string;
  conflicts: MergeConflict[];
  stats: {
    autoMerged: number;
    conflictCount: number;
  };
}
```

---

### threeWayMerge(base, current, incoming)

执行三向合并。

**参数:**
- `base` (string): 共同祖先
- `current` (string): 当前分支
- `incoming` (string): 传入分支

**返回值:** 同 `detectConflicts`

---

### validatePatch(patch)

验证 Patch 格式是否有效。

**返回值:**
```typescript
{ valid: boolean; error?: string }
```

---

### calculateSimilarity(text1, text2)

计算两个文本的相似度 (0-1)。

**返回值:** `number` (0.0 - 1.0)

---

### formatDiffSummary(diff)

将 Diff 结果转换为可读格式。

**返回值:** `string`

---

## 💡 使用场景

### 1. 代码审查

```typescript
// 比较 PR 前后的代码变化
const diff = generateDiff(beforeCode, afterCode);
console.log(`变更：+${diff.stats.additions} -${diff.stats.deletions}`);
```

### 2. 版本控制

```typescript
// 生成 commit diff
const commitDiff = generateDiff(v1, v2);
const patch = commitDiff.unifiedDiff;

// 后续可以应用 patch
applyPatch(v1, patch);
```

### 3. 合并冲突解决

```typescript
// Git 风格的三向合并
const result = threeWayMerge(commonAncestor, currentBranch, featureBranch);

if (!result.success) {
  // 需要手动解决冲突
  console.log(result.conflicts);
}
```

### 4. 配置文件对比

```typescript
// 比较环境配置差异
const diff = generateDiff(devConfig, prodConfig, {
  ignoreWhitespace: true,
  contextLines: 1,
});
```

### 5. 文档版本追踪

```typescript
// 检测文档变更
const similarity = calculateSimilarity(docV1, docV2);
if (similarity < 0.8) {
  console.log('⚠️  文档有重大变更');
}
```

---

## ⚙️ 高级用法

### 忽略空白和大小写

```typescript
const diff = generateDiff(text1, text2, {
  ignoreWhitespace: true,
  ignoreCase: true,
});
```

### 反转 Patch (回滚)

```typescript
// 应用反向 patch 来撤销更改
const reverseResult = applyPatch(current, patch, {
  reverse: true,
  strict: false,
});
```

### 自定义冲突处理

```typescript
const mergeResult = threeWayMerge(base, current, incoming);

if (mergeResult.conflicts.length > 0) {
  // 自动解决某些冲突
  for (const conflict of mergeResult.conflicts) {
    if (shouldAutoResolve(conflict)) {
      // 自定义解决逻辑
      resolveConflict(conflict);
    }
  }
}
```

---

## 🧪 测试示例

运行示例文件:

```bash
# TypeScript
npx ts-node src/skills/diff-utils-examples.ts

# 或编译后运行
npx tsc src/skills/diff-utils-examples.ts
node diff-utils-examples.js
```

---

## 📝 注意事项

1. **行尾处理**: 自动处理 `\r\n` 和 `\n` 的差异
2. **编码**: 确保输入文本使用相同的编码 (推荐 UTF-8)
3. **大文件**: 对于超大文件 (>10MB), 建议分块处理
4. **性能**: LCS 算法复杂度为 O(m*n), 大文件可能需要优化

---

## 📚 相关文件

- `diff-utils-skill.ts` - 主实现文件
- `diff-utils-examples.ts` - 使用示例
- `diff-utils-skill.test.ts` - 单元测试 (待创建)

---

## 🛠️ 待办事项

- [ ] 添加性能优化 (使用 WebAssembly 加速 LCS)
- [ ] 支持二进制文件 diff
- [ ] 添加更多合并策略 (ours, theirs, union)
- [ ] 支持 git diff 格式解析
- [ ] 添加交互式冲突解决 UI

---

**版本:** 1.0.0  
**作者:** KAEL  
**许可证:** MIT
