/**
 * Diff Utils Skill 使用示例
 * 
 * 演示文本差异比较、Patch 应用和合并冲突检测的使用场景
 */

import {
  generateDiff,
  applyPatch,
  detectConflicts,
  threeWayMerge,
  formatDiffSummary,
  validatePatch,
  calculateSimilarity,
  type DiffOptions,
  type PatchOptions,
} from './diff-utils-skill';

// ==================== 示例 1: 基础 Diff 生成 ====================

console.log('=== 示例 1: 基础 Diff 生成 ===\n');

const originalCode = `function calculateTotal(items) {
  let total = 0;
  for (const item of items) {
    total += item.price;
  }
  return total;
}`;

const updatedCode = `function calculateTotal(items) {
  let total = 0;
  for (const item of items) {
    total += item.price * item.quantity;
  }
  // 应用折扣
  if (items.length > 10) {
    total *= 0.9;
  }
  return total;
}`;

const diff = generateDiff(originalCode, updatedCode);
console.log(formatDiffSummary(diff));
console.log('\n');

// ==================== 示例 2: 带选项的 Diff ====================

console.log('=== 示例 2: 带选项的 Diff ===\n');

const text1 = `Hello World
  This is a test
    With indentation`;

const text2 = `hello world
  this is a test
    with indentation`;

// 忽略大小写和空白
const options: DiffOptions = {
  ignoreCase: true,
  ignoreWhitespace: true,
  contextLines: 2,
};

const diffWithOptions = generateDiff(text1, text2, options);
console.log('忽略大小写和空白后:');
console.log(diffWithOptions.hasChanges ? '有差异' : '无差异');
console.log('\n');

// ==================== 示例 3: Patch 应用 ====================

console.log('=== 示例 3: Patch 应用 ===\n');

const patch = `--- original
+++ modified
@@ -1,5 +1,6 @@
 function calculateTotal(items) {
   let total = 0;
   for (const item of items) {
-    total += item.price;
+    total += item.price * item.quantity;
   }
+  return total;
 }`;

const patchResult = applyPatch(originalCode, patch);
if (patchResult.success) {
  console.log('✅ Patch 应用成功');
  console.log('结果:', patchResult.result?.substring(0, 100) + '...');
} else {
  console.log('❌ Patch 应用失败:', patchResult.error);
}
console.log('\n');

// ==================== 示例 4: 反转 Patch ====================

console.log('=== 示例 4: 反转 Patch ===\n');

const reverseOptions: PatchOptions = {
  reverse: true,
  strict: false,
};

const reverseResult = applyPatch(updatedCode, patch, reverseOptions);
if (reverseResult.success) {
  console.log('✅ 反转 Patch 成功 (回滚更改)');
  console.log('结果:', reverseResult.result?.substring(0, 100) + '...');
}
console.log('\n');

// ==================== 示例 5: 三向合并 ====================

console.log('=== 示例 5: 三向合并 ===\n');

const baseVersion = `// 配置文件
const config = {
  port: 3000,
  host: 'localhost',
  debug: false,
};`;

const featureA = `// 配置文件
const config = {
  port: 3000,
  host: 'localhost',
  debug: true,  // A 启用了调试
  timeout: 5000,  // A 添加了超时
};`;

const featureB = `// 配置文件
const config = {
  port: 8080,  // B 修改了端口
  host: 'localhost',
  debug: false,
  logging: true,  // B 添加了日志
};`;

const mergeResult = threeWayMerge(baseVersion, featureA, featureB);

if (mergeResult.success) {
  console.log('✅ 合并成功，无冲突');
  console.log('合并结果:', mergeResult.result);
} else {
  console.log('⚠️  检测到冲突');
  console.log('冲突数量:', mergeResult.stats.conflictCount);
  console.log('自动合并:', mergeResult.stats.autoMerged);
  console.log('\n带冲突标记的结果:');
  console.log(mergeResult.result);
}
console.log('\n');

// ==================== 示例 6: 冲突检测 ====================

console.log('=== 示例 6: 冲突检测 ===\n');

const original = `export const API_URL = 'https://api.example.com';
export const TIMEOUT = 5000;
export const RETRIES = 3;`;

const dev1 = `export const API_URL = 'https://api-dev.example.com';
export const TIMEOUT = 5000;
export const RETRIES = 3;
export const DEBUG = true;`;

const dev2 = `export const API_URL = 'https://api.example.com';
export const TIMEOUT = 10000;
export const RETRIES = 5;`;

const conflictResult = detectConflicts(original, dev1, dev2);

if (conflictResult.conflicts.length > 0) {
  console.log(`🚨 发现 ${conflictResult.conflicts.length} 个冲突:` );
  conflictResult.conflicts.forEach((conflict, idx) => {
    console.log(`\n冲突 ${idx + 1}:`);
    console.log(`  行范围：${conflict.startLine} - ${conflict.endLine}`);
    console.log(`  当前版本：${conflict.current.join(', ')}`);
    console.log(`  传入版本：${conflict.incoming.join(', ')}`);
  });
}
console.log('\n');

// ==================== 示例 7: Patch 验证 ====================

console.log('=== 示例 7: Patch 验证 ===\n');

const validPatch = `--- original
+++ modified
@@ -1,3 +1,3 @@
 line 1
-line 2
+modified line 2
 line 3`;

const invalidPatch = `this is not a valid patch format`;

console.log('有效 Patch 验证:', validatePatch(validPatch));
console.log('无效 Patch 验证:', validatePatch(invalidPatch));
console.log('\n');

// ==================== 示例 8: 文本相似度计算 ====================

console.log('=== 示例 8: 文本相似度计算 ===\n');

const doc1 = `这是一个文档
包含多行文本
用于测试相似度`;

const doc2 = `这是一个文档
包含一些不同的文本
用于测试相似度`;

const doc3 = `完全不同的内容
没有任何相似之处`;

const similarity1 = calculateSimilarity(doc1, doc2);
const similarity2 = calculateSimilarity(doc1, doc3);

console.log(`文档 1 和文档 2 的相似度：${(similarity1 * 100).toFixed(2)}%`);
console.log(`文档 1 和文档 3 的相似度：${(similarity2 * 100).toFixed(2)}%`);
console.log('\n');

// ==================== 示例 9: 实际代码审查场景 ====================

console.log('=== 示例 9: 代码审查场景 ===\n');

const beforeRefactor = `// 用户管理模块
function getUser(id) {
  return fetch('/api/users/' + id);
}

function updateUser(id, data) {
  return fetch('/api/users/' + id, {
    method: 'PUT',
    body: JSON.stringify(data)
  });
}

function deleteUser(id) {
  return fetch('/api/users/' + id, {
    method: 'DELETE'
  });
}`;

const afterRefactor = `// 用户管理模块
const API_BASE = '/api/users';

async function getUser(id: string) {
  const response = await fetch(\`\${API_BASE}/\${id}\`);
  return response.json();
}

async function updateUser(id: string, data: any) {
  const response = await fetch(\`\${API_BASE}/\${id}\`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return response.json();
}

async function deleteUser(id: string) {
  const response = await fetch(\`\${API_BASE}/\${id}\`, {
    method: 'DELETE'
  });
  return response.ok;
}`;

const refactorDiff = generateDiff(beforeRefactor, afterRefactor, {
  contextLines: 2,
  detailedStats: true,
});

console.log('代码重构差异分析:');
console.log(formatDiffSummary(refactorDiff));
console.log('\n');

// ==================== 示例 10: 批量文件比较 ====================

console.log('=== 示例 10: 批量文件比较 (模拟) ===\n');

interface FileChange {
  path: string;
  before: string;
  after: string;
}

const fileChanges: FileChange[] = [
  {
    path: 'src/utils/helper.ts',
    before: 'export const version = "1.0.0";',
    after: 'export const version = "1.0.1";',
  },
  {
    path: 'src/config/index.ts',
    before: 'export const DEBUG = false;',
    after: 'export const DEBUG = true;',
  },
  {
    path: 'README.md',
    before: '# Project v1.0.0',
    after: '# Project v1.0.1',
  },
];

console.log('批量文件变更统计:\n');

let totalAdditions = 0;
let totalDeletions = 0;

for (const change of fileChanges) {
  const fileDiff = generateDiff(change.before, change.after);
  totalAdditions += fileDiff.stats.additions;
  totalDeletions += fileDiff.stats.deletions;
  
  console.log(`📄 ${change.path}`);
  console.log(`   +${fileDiff.stats.additions} -${fileDiff.stats.deletions}`);
}

console.log(`\n总计：+${totalAdditions} -${totalDeletions}`);
console.log('\n');

// ==================== 导出示例函数 ====================

export {
  originalCode,
  updatedCode,
  patch,
  baseVersion,
  featureA,
  featureB,
};

console.log('✅ 所有示例执行完成');
