# Diff Utils 快速上手指南

5 分钟掌握文本差异比较、Patch 应用和合并冲突解决！

---

## 🎯 核心功能一览

| 功能 | 函数 | 用途 |
|------|------|------|
| **Diff 生成** | `generateDiff()` | 比较两个文本的差异 |
| **Patch 应用** | `applyPatch()` | 将 diff 应用到文本 |
| **三向合并** | `threeWayMerge()` | 合并两个分支的更改 |
| **冲突检测** | `detectConflicts()` | 检测合并冲突 |
| **相似度计算** | `calculateSimilarity()` | 计算文本相似度 |

---

## 📦 1 分钟快速开始

### Step 1: 导入工具

```typescript
import {
  generateDiff,
  applyPatch,
  threeWayMerge,
  formatDiffSummary,
} from './src/skills/diff-utils-skill';
```

### Step 2: 生成第一个 Diff

```typescript
const before = `function greet() {
  return 'Hello';
}`;

const after = `function greet(name) {
  return 'Hello, ' + name;
}`;

const diff = generateDiff(before, after);
console.log(formatDiffSummary(diff));
```

**输出:**
```
📊 Diff 统计:
  +2 添加
  -2 删除
  ~0 修改

--- Unified Diff ---
--- original
+++ modified
@@ -1,2 +1,2 @@
-function greet() {
-  return 'Hello';
+function greet(name) {
+  return 'Hello, ' + name;
 }
```

✅ **完成！你已经生成了第一个 diff！**

---

## 🔥 5 个核心场景

### 场景 1: 代码审查 - 查看变更

```typescript
const diff = generateDiff(oldCode, newCode, {
  contextLines: 3,  // 显示 3 行上下文
});

console.log(`变更统计:`);
console.log(`  +${diff.stats.additions} 新增`);
console.log(`  -${diff.stats.deletions} 删除`);
console.log(`  ~${diff.stats.changes} 修改`);
```

### 场景 2: 撤销更改 - 反转 Patch

```typescript
// 假设你有之前生成的 patch
const patch = diff.unifiedDiff;

// 反转 patch 来撤销更改
const result = applyPatch(currentCode, patch, {
  reverse: true,  // 关键：反转
  strict: false,
});

if (result.success) {
  console.log('✅ 已回滚到上一个版本');
}
```

### 场景 3: Git 风格合并 - 三向合并

```typescript
const base = `export const PORT = 3000;`;
const branchA = `export const PORT = 3000;
export const DEBUG = true;`;
const branchB = `export const PORT = 8080;`;

const merge = threeWayMerge(base, branchA, branchB);

if (!merge.success) {
  console.log('⚠️  冲突！需要手动解决:');
  console.log(merge.result); // 带冲突标记
}
```

**冲突标记格式:**
```
<<<<<<< CURRENT
export const PORT = 3000;
export const DEBUG = true;
=======
export const PORT = 8080;
>>>>>>> INCOMING
```

### 场景 4: 配置对比 - 忽略空白

```typescript
const config1 = `
  port: 3000,
  debug: false
`;

const config2 = `
  port: 3000,
  debug: true
`;

// 忽略空白和大小写差异
const diff = generateDiff(config1, config2, {
  ignoreWhitespace: true,
  ignoreCase: true,
});
```

### 场景 5: 文档版本追踪 - 相似度

```typescript
const docV1 = `# 用户手册\n第一章：简介...`;
const docV2 = `# 用户手册\n第一章：简介...`;

const similarity = calculateSimilarity(docV1, docV2);

if (similarity > 0.95) {
  console.log('✅ 文档只有小幅修改');
} else if (similarity > 0.8) {
  console.log('⚠️  文档有中等修改');
} else {
  console.log('🚨 文档有重大变更！');
}
```

---

## 🛠️ 实战演练：完整的代码审查流程

```typescript
import {
  generateDiff,
  applyPatch,
  validatePatch,
  formatDiffSummary,
} from './diff-utils-skill';

// 1. 开发者提交代码
const originalCode = `
function calculateTotal(items) {
  let total = 0;
  for (const item of items) {
    total += item.price;
  }
  return total;
}
`;

const submittedCode = `
function calculateTotal(items) {
  let total = 0;
  for (const item of items) {
    total += item.price * item.quantity;
  }
  // 批量折扣
  if (items.length > 10) {
    total *= 0.9;
  }
  return total;
}
`;

// 2. 生成 Diff 进行审查
const diff = generateDiff(originalCode, submittedCode);
console.log(formatDiffSummary(diff));

// 3. 提取 Patch 保存
const patch = diff.unifiedDiff;

// 4. 验证 Patch 格式
const validation = validatePatch(patch);
if (!validation.valid) {
  console.error('无效的 Patch:', validation.error);
}

// 5. 应用 Patch 到另一个分支
const result = applyPatch(originalCode, patch);
if (result.success) {
  console.log('✅ Patch 成功应用到目标分支');
} else {
  console.error('❌ 应用失败:', result.error);
}
```

---

## ⚡ 性能提示

### 大文件处理

```typescript
// 对于 >10MB 的文件，分块处理
function diffLargeFiles(file1: string, file2: string, chunkSize = 1000) {
  const lines1 = file1.split('\n');
  const lines2 = file2.split('\n');
  
  const chunks1 = Math.ceil(lines1.length / chunkSize);
  const chunks2 = Math.ceil(lines2.length / chunkSize);
  
  for (let i = 0; i < Math.max(chunks1, chunks2); i++) {
    const chunk1 = lines1.slice(i * chunkSize, (i + 1) * chunkSize).join('\n');
    const chunk2 = lines2.slice(i * chunkSize, (i + 1) * chunkSize).join('\n');
    
    const chunkDiff = generateDiff(chunk1, chunk2);
    console.log(`Chunk ${i}: +${chunkDiff.stats.additions} -${chunkDiff.stats.deletions}`);
  }
}
```

### 批量文件比较

```typescript
const files = [
  { path: 'src/a.ts', before: '...', after: '...' },
  { path: 'src/b.ts', before: '...', after: '...' },
];

let totalChanges = 0;

for (const file of files) {
  const diff = generateDiff(file.before, file.after);
  totalChanges += diff.stats.additions + diff.stats.deletions;
  console.log(`${file.path}: ${diff.stats.additions + diff.stats.deletions} 行变更`);
}

console.log(`总计：${totalChanges} 行变更`);
```

---

## 🧪 运行完整示例

```bash
# 1. 直接运行 TypeScript 示例
npx ts-node src/skills/diff-utils-examples.ts

# 2. 或编译后运行
npx tsc src/skills/diff-utils-examples.ts --outDir dist
node dist/diff-utils-examples.js
```

---

## 📋 速查表

### Diff 选项

```typescript
interface DiffOptions {
  ignoreWhitespace?: boolean;  // 忽略空白
  ignoreCase?: boolean;        // 忽略大小写
  contextLines?: number;       // 上下文行数 (默认 3)
  detailedStats?: boolean;     // 详细统计
}
```

### Patch 选项

```typescript
interface PatchOptions {
  strict?: boolean;   // 严格模式 (失败抛错)
  reverse?: boolean;  // 反转 patch (回滚)
}
```

### 返回值类型

```typescript
// Diff 结果
interface DiffResult {
  hasChanges: boolean;
  operations: DiffOperation[];
  stats: { additions, deletions, changes };
  unifiedDiff: string;
}

// Patch 结果
interface PatchResult {
  success: boolean;
  result?: string;
  error?: string;
  warnings: string[];
}

// 合并结果
interface MergeResult {
  success: boolean;
  result?: string;
  conflicts: MergeConflict[];
  stats: { autoMerged, conflictCount };
}
```

---

## ❓ 常见问题

### Q: 如何处理中文编码？
**A:** 确保输入输出都使用 UTF-8 编码，TypeScript 默认支持。

### Q: 支持二进制文件吗？
**A:** 当前版本仅支持文本文件。二进制文件需要特殊处理。

### Q: 性能如何？
**A:** LCS 算法复杂度 O(m*n)。对于超大文件，建议分块处理或使用 WebAssembly 优化版本。

### Q: 如何自定义冲突标记？
**A:** 使用 `formatConflicts()` 函数自定义标记格式。

---

## 📚 下一步

- ✅ 完成：阅读本快速指南
- ✅ 完成：运行示例代码
- ⬜ 进阶：阅读完整 API 文档 (`DIFF-README.md`)
- ⬜ 实践：在你的项目中应用 diff 工具
- ⬜ 贡献：提交改进建议或 Bug 报告

---

**🎉 恭喜！你已经掌握了 Diff Utils 的核心用法！**

有问题？查看 `src/skills/diff-utils-examples.ts` 获取更多示例！

---

**版本:** 1.0.0  
**完成时间:** 5 分钟  
**作者:** Axon (via ACE subagent)
