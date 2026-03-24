/**
 * 文件工具技能 - 使用示例
 * 
 * 展示 file-utils-skill.ts 的各种使用场景
 */

import {
  readFile,
  readJsonFile,
  readLines,
  writeFile,
  writeJsonFile,
  appendToFile,
  listDirectory,
  findFiles,
  getDirectoryTree,
  fileExists,
  dirExists,
  createDirectory,
  deletePath,
  copyFile
} from './file-utils-skill';
import * as path from 'path';

// ============================================
// 示例 1: 基础文件读写
// ============================================

export function example1_basicReadWrite() {
  console.log('\n=== 示例 1: 基础文件读写 ===\n');
  
  const filePath = '/tmp/kael-test/example.txt';
  
  // 写入文件
  writeFile(filePath, 'Hello, World!\n这是中文内容。\nThird line.');
  console.log('✅ 文件写入成功');
  
  // 读取文件
  const content = readFile(filePath);
  console.log('📄 文件内容:');
  console.log(content);
  
  // 读取前 2 行
  const firstLines = readLines(filePath, 2);
  console.log('📄 前 2 行:');
  console.log(firstLines);
}

// ============================================
// 示例 2: JSON 文件操作
// ============================================

export function example2_jsonOperations() {
  console.log('\n=== 示例 2: JSON 文件操作 ===\n');
  
  const jsonPath = '/tmp/kael-test/config.json';
  
  // 写入 JSON
  const config = {
    database: {
      host: 'localhost',
      port: 5432,
      name: 'mydb'
    },
    features: ['auth', 'api', 'dashboard'],
    enabled: true
  };
  
  writeJsonFile(jsonPath, config);
  console.log('✅ JSON 文件写入成功');
  
  // 读取 JSON
  const loadedConfig = readJsonFile<typeof config>(jsonPath);
  console.log('📄 读取的配置:');
  console.log(JSON.stringify(loadedConfig, null, 2));
}

// ============================================
// 示例 3: 目录遍历
// ============================================

export function example3_directoryListing() {
  console.log('\n=== 示例 3: 目录遍历 ===\n');
  
  const targetDir = '/tmp/kael-test';
  
  // 创建测试文件结构
  createDirectory(path.join(targetDir, 'subdir1'));
  createDirectory(path.join(targetDir, 'subdir2'));
  writeFile(path.join(targetDir, 'file1.txt'), 'content1');
  writeFile(path.join(targetDir, 'file2.ts'), 'const x = 1;');
  writeFile(path.join(targetDir, 'subdir1', 'nested.json'), '{}');
  
  // 列出目录内容
  const files = listDirectory(targetDir, { recursive: true });
  console.log(`📂 找到 ${files.length} 个文件/目录:`);
  
  files.forEach(file => {
    const icon = file.isDirectory ? '📁' : '📄';
    const size = file.isDirectory ? '-' : `${file.size} bytes`;
    console.log(`   ${icon} ${file.name.padEnd(20)} ${size}`);
  });
}

// ============================================
// 示例 4: 文件搜索
// ============================================

export function example4_fileSearch() {
  console.log('\n=== 示例 4: 文件搜索 ===\n');
  
  const projectDir = '/tmp/kael-test';
  
  // 搜索 TypeScript 文件
  const tsFiles = findFiles(projectDir, { extension: '.ts' });
  console.log(`🔍 TypeScript 文件 (${tsFiles.length}):`);
  tsFiles.forEach(f => console.log(`   - ${path.basename(f)}`));
  
  // 搜索 JSON 文件
  const jsonFiles = findFiles(projectDir, { extension: '.json' });
  console.log(`\n🔍 JSON 文件 (${jsonFiles.length}):`);
  jsonFiles.forEach(f => console.log(`   - ${path.basename(f)}`));
  
  // 搜索包含 'file' 的文件
  const matchedFiles = findFiles(projectDir, { pattern: 'file' });
  console.log(`\n🔍 包含 'file' 的文件 (${matchedFiles.length}):`);
  matchedFiles.forEach(f => console.log(`   - ${path.basename(f)}`));
}

// ============================================
// 示例 5: 目录树生成
// ============================================

export function example5_directoryTree() {
  console.log('\n=== 示例 5: 目录树生成 ===\n');
  
  const targetDir = '/tmp/kael-test';
  
  const tree = getDirectoryTree(targetDir, 3);
  console.log('🌳 目录树结构:');
  console.log(tree);
}

// ============================================
// 示例 6: 文件管理操作
// ============================================

export function example6_fileManagement() {
  console.log('\n=== 示例 6: 文件管理操作 ===\n');
  
  const sourceFile = '/tmp/kael-test/file1.txt';
  const destFile = '/tmp/kael-test/file1-copy.txt';
  
  // 检查文件
  console.log(`📄 源文件存在：${fileExists(sourceFile)}`);
  console.log(`📁 目录存在：${dirExists('/tmp/kael-test')}`);
  
  // 复制文件
  copyFile(sourceFile, destFile);
  console.log(`✅ 文件已复制：${path.basename(destFile)}`);
  
  // 追加内容
  appendToFile(sourceFile, '\n这是追加的内容。');
  console.log('✅ 内容已追加');
  
  // 验证
  const updatedContent = readFile(sourceFile);
  console.log('📄 更新后的内容:');
  console.log(updatedContent);
}

// ============================================
// 示例 7: 清理操作
// ============================================

export function example7_cleanup() {
  console.log('\n=== 示例 7: 清理操作 ===\n');
  
  const testDir = '/tmp/kael-test';
  
  if (dirExists(testDir)) {
    deletePath(testDir);
    console.log(`✅ 测试目录已清理：${testDir}`);
  }
}

// ============================================
// 主函数 - 运行所有示例
// ============================================

if (require.main === module) {
  console.log('╔════════════════════════════════════════╗');
  console.log('║   KAEL 文件工具技能 - 使用示例大全    ║');
  console.log('╚════════════════════════════════════════╝');
  
  try {
    example1_basicReadWrite();
    example2_jsonOperations();
    example3_directoryListing();
    example4_fileSearch();
    example5_directoryTree();
    example6_fileManagement();
    example7_cleanup();
    
    console.log('\n╔════════════════════════════════════════╗');
    console.log('║           ✅ 所有示例执行完成         ║');
    console.log('╚════════════════════════════════════════╝\n');
  } catch (error) {
    console.error('\n❌ 执行出错:', (error as Error).message);
    console.error(error);
  }
}
