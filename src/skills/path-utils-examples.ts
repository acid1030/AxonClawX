/**
 * Path Utils Skill - 使用示例
 * 
 * 演示如何使用路径工具技能的各种功能
 */

import PathUtils, { parsePath, standardizePath, matchPattern } from './path-utils-skill';

// ============================================
// 1. 路径解析/格式化示例
// ============================================

console.log('=== 路径解析/格式化 ===\n');

// 解析路径
const filePath = '/Users/nike/projects/axonclaw/src/index.ts';
const parsed = parsePath(filePath);
console.log('原始路径:', filePath);
console.log('解析结果:', parsed);
// 输出:
// {
//   root: '/',
//   dir: '/Users/nike/projects/axonclaw/src',
//   base: 'index.ts',
//   ext: '.ts',
//   name: 'index',
//   isAbsolute: true,
//   segments: ['Users', 'nike', 'projects', 'axonclaw', 'src', 'index.ts']
// }

// 格式化路径
const formatted = PathUtils.formatPath(parsed);
console.log('格式化后:', formatted);

// 规范化路径 (移除 . 和 ..)
const messyPath = '/Users/nike/projects/../projects/./axonclaw/src/index.ts';
const normalized = PathUtils.normalizePath(messyPath);
console.log('混乱路径:', messyPath);
console.log('规范化后:', normalized);
// 输出: /Users/nike/projects/axonclaw/src/index.ts

// ============================================
// 2. 路径标准化示例
// ============================================

console.log('\n=== 路径标准化 ===\n');

// 标准化路径 (跨平台兼容)
const relativePath = './src/components/Button.tsx';
const standardized = PathUtils.standardizePath(relativePath, '/Users/nike/projects/axonclaw');
console.log('相对路径:', relativePath);
console.log('标准化后:', standardized);
// 输出: /Users/nike/projects/axonclaw/src/components/Button.tsx

// 标准化多个路径
const paths = [
  './src/index.ts',
  '../lib/utils.ts',
  'src/components/App.tsx',
];
const standardizedPaths = PathUtils.standardizePaths(paths, '/Users/nike/projects/axonclaw');
console.log('批量标准化:', standardizedPaths);

// 获取相对路径
const from = '/Users/nike/projects/axonclaw/src';
const to = '/Users/nike/projects/axonclaw/src/components/Button.tsx';
const relative = PathUtils.getRelativePath(from, to);
console.log(`从 ${from} 到 ${to} 的相对路径:`, relative);
// 输出: components/Button.tsx

// ============================================
// 3. 通配符匹配示例
// ============================================

console.log('\n=== 通配符匹配 ===\n');

// 单模式匹配
const testPath = '/Users/nike/projects/axonclaw/src/components/Button.tsx';

console.log('测试路径:', testPath);
console.log('匹配 *.tsx:', PathUtils.matchPattern(testPath, '*.tsx')); // false (不匹配完整路径)
console.log('匹配 **/*.tsx:', PathUtils.matchPattern(testPath, '**/*.tsx')); // true
console.log('匹配 **/components/**:', PathUtils.matchPattern(testPath, '**/components/**')); // true
console.log('匹配 **/*.{ts,tsx}:', PathUtils.matchPattern(testPath, '**/*.{ts,tsx}')); // true
console.log('匹配 **/src/**/*.ts:', PathUtils.matchPattern(testPath, '**/src/**/*.ts')); // false (是 tsx 不是 ts)

// 多模式匹配
const patterns = ['**/*.spec.ts', '**/*.test.ts', '**/__tests__/**'];
console.log('是否为测试文件:', PathUtils.matchPatterns(testPath, patterns)); // false

const testFilePath = '/Users/nike/projects/axonclaw/src/components/Button.test.tsx';
console.log('测试路径:', testFilePath);
console.log('是否为测试文件:', PathUtils.matchPatterns(testFilePath, patterns)); // true

// 过滤路径列表
const allFiles = [
  '/project/src/index.ts',
  '/project/src/App.tsx',
  '/project/src/utils.ts',
  '/project/src/App.test.tsx',
  '/project/README.md',
];

const tsFiles = PathUtils.filterByPattern(allFiles, '**/*.ts');
console.log('TypeScript 文件:', tsFiles);
// 输出: ['/project/src/index.ts', '/project/src/utils.ts']

const tsxFiles = PathUtils.filterByPattern(allFiles, '**/*.tsx');
console.log('TSX 文件:', tsxFiles);
// 输出: ['/project/src/App.tsx', '/project/src/App.test.tsx']

// ============================================
// 4. 文件查找示例
// ============================================

console.log('\n=== 文件查找 ===\n');

// 在当前目录查找所有 .ts 文件 (递归)
const tsFilesInDir = PathUtils.findMatchingFiles(process.cwd(), '**/*.ts', { recursive: true });
console.log('当前目录的 .ts 文件:', tsFilesInDir.slice(0, 5)); // 只显示前 5 个

// 查找所有测试文件
const testFiles = PathUtils.findMatchingFiles(process.cwd(), '**/*.test.{ts,tsx}', { recursive: true });
console.log('测试文件:', testFiles);

// ============================================
// 5. 实用工具示例
// ============================================

console.log('\n=== 实用工具 ===\n');

// 检查路径是否存在
console.log('package.json 存在:', PathUtils.pathExists('./package.json'));

// 检查是否为文件
console.log('package.json 是文件:', PathUtils.isFile('./package.json'));

// 检查是否为目录
console.log('src 是目录:', PathUtils.isDirectory('./src'));

// 获取扩展名
console.log('index.ts 的扩展名:', PathUtils.getExtension('index.ts')); // ts

// 获取不带扩展名的文件名
console.log('index.ts 的文件名:', PathUtils.getBasename('index.ts')); // index

// 更改扩展名
const newPath = PathUtils.changeExtension('src/index.ts', 'js');
console.log('index.ts →', newPath); // src/index.js

// 获取共同父目录
const multiplePaths = [
  '/project/src/components/Button.tsx',
  '/project/src/components/App.tsx',
  '/project/src/utils/helpers.ts',
];
const commonParent = PathUtils.findCommonParent(multiplePaths);
console.log('共同父目录:', commonParent); // /project/src

// ============================================
// 6. 实际应用场景
// ============================================

console.log('\n=== 实际应用场景 ===\n');

// 场景 1: 构建系统 - 找出所有需要编译的文件
const sourceFiles = PathUtils.filterByPatterns(allFiles, ['**/*.ts', '**/*.tsx']);
console.log('需要编译的文件:', sourceFiles);

// 场景 2: 清理脚本 - 找出所有构建产物
const buildArtifacts = PathUtils.filterByPatterns(allFiles, [
  '**/*.js',
  '**/*.d.ts',
  '**/dist/**',
  '**/build/**',
]);
console.log('构建产物:', buildArtifacts);

// 场景 3: 测试运行器 - 找出所有测试文件
const allTestFiles = PathUtils.filterByPatterns(allFiles, [
  '**/*.spec.{ts,tsx}',
  '**/*.test.{ts,tsx}',
  '**/__tests__/**/*.{ts,tsx}',
]);
console.log('测试文件:', allTestFiles);

// 场景 4: 文档生成 - 找出所有 Markdown 文件
const markdownFiles = PathUtils.filterByPattern(allFiles, '**/*.md');
console.log('文档文件:', markdownFiles);

console.log('\n=== 示例完成 ===');
