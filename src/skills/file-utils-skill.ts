/**
 * 文件工具技能 - KAEL
 * 
 * 提供常用文件操作功能：
 * 1. 文件读取
 * 2. 文件写入
 * 3. 文件遍历
 */

import * as fs from 'fs';
import * as path from 'path';

// ============================================
// 文件读取功能
// ============================================

/**
 * 读取文件内容
 * 支持文本文件和二进制文件
 * 
 * @param filePath - 文件路径
 * @param encoding - 文件编码，默认为 'utf-8'
 * @returns 文件内容
 * 
 * @example
 * readFile('/path/to/file.txt') // 返回文本内容
 * readFile('/path/to/image.png', 'base64') // 返回 base64 编码
 */
export function readFile(filePath: string, encoding: BufferEncoding = 'utf-8'): string {
  if (!fs.existsSync(filePath)) {
    throw new Error(`文件不存在：${filePath}`);
  }
  
  const stat = fs.statSync(filePath);
  if (!stat.isFile()) {
    throw new Error(`不是文件：${filePath}`);
  }
  
  return fs.readFileSync(filePath, encoding);
}

/**
 * 读取文件 JSON 内容
 * 自动解析 JSON 文件
 * 
 * @param filePath - JSON 文件路径
 * @returns 解析后的 JSON 对象
 * 
 * @example
 * readJsonFile('/path/to/config.json') // 返回 JSON 对象
 */
export function readJsonFile<T = any>(filePath: string): T {
  const content = readFile(filePath);
  try {
    return JSON.parse(content) as T;
  } catch (error) {
    throw new Error(`JSON 解析失败：${filePath} - ${(error as Error).message}`);
  }
}

/**
 * 读取文件前 N 行
 * 适用于大文件快速预览
 * 
 * @param filePath - 文件路径
 * @param lines - 要读取的行数，默认为 10
 * @returns 文件前 N 行的内容
 * 
 * @example
 * readLines('/path/to/large.log', 5) // 返回前 5 行
 */
export function readLines(filePath: string, lines: number = 10): string {
  const content = readFile(filePath);
  const lineArray = content.split('\n');
  return lineArray.slice(0, lines).join('\n');
}

// ============================================
// 文件写入功能
// ============================================

/**
 * 写入文件内容
 * 自动创建不存在的目录
 * 
 * @param filePath - 文件路径
 * @param content - 要写入的内容
 * @param options - 写入选项
 * 
 * @example
 * writeFile('/path/to/file.txt', 'Hello World')
 * writeFile('/path/to/nested/dir/file.txt', 'Content', { createDir: true })
 */
export function writeFile(
  filePath: string,
  content: string,
  options: { createDir?: boolean; encoding?: BufferEncoding } = {}
): void {
  const { createDir = true, encoding = 'utf-8' } = options;
  
  if (createDir) {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
  
  fs.writeFileSync(filePath, content, encoding);
}

/**
 * 写入 JSON 文件
 * 自动格式化 JSON 输出
 * 
 * @param filePath - JSON 文件路径
 * @param data - 要写入的数据对象
 * @param pretty - 是否格式化输出，默认为 true
 * 
 * @example
 * writeJsonFile('/path/to/config.json', { key: 'value' })
 */
export function writeJsonFile<T = any>(
  filePath: string,
  data: T,
  pretty: boolean = true
): void {
  const content = pretty ? JSON.stringify(data, null, 2) : JSON.stringify(data);
  writeFile(filePath, content);
}

/**
 * 追加内容到文件
 * 在文件末尾添加内容
 * 
 * @param filePath - 文件路径
 * @param content - 要追加的内容
 * 
 * @example
 * appendToFile('/path/to/log.txt', 'New log entry\n')
 */
export function appendToFile(filePath: string, content: string): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  fs.appendFileSync(filePath, content);
}

// ============================================
// 文件遍历功能
// ============================================

/**
 * 文件信息接口
 */
export interface FileInfo {
  name: string;
  path: string;
  size: number;
  isDirectory: boolean;
  isFile: boolean;
  extension?: string;
  modifiedTime: Date;
}

/**
 * 遍历目录
 * 获取目录下所有文件和子目录的信息
 * 
 * @param dirPath - 目录路径
 * @param options - 遍历选项
 * @returns 文件信息数组
 * 
 * @example
 * listDirectory('/path/to/dir') // 返回直接子项
 * listDirectory('/path/to/dir', { recursive: true }) // 递归遍历
 */
export function listDirectory(
  dirPath: string,
  options: { recursive?: boolean; includeHidden?: boolean } = {}
): FileInfo[] {
  const { recursive = false, includeHidden = false } = options;
  
  if (!fs.existsSync(dirPath)) {
    throw new Error(`目录不存在：${dirPath}`);
  }
  
  const stat = fs.statSync(dirPath);
  if (!stat.isDirectory()) {
    throw new Error(`不是目录：${dirPath}`);
  }
  
  const results: FileInfo[] = [];
  
  function traverse(currentPath: string) {
    const entries = fs.readdirSync(currentPath, { withFileTypes: true });
    
    for (const entry of entries) {
      // 跳过隐藏文件（除非明确包含）
      if (!includeHidden && entry.name.startsWith('.')) {
        continue;
      }
      
      const fullPath = path.join(currentPath, entry.name);
      const entryStat = fs.statSync(fullPath);
      
      const fileInfo: FileInfo = {
        name: entry.name,
        path: fullPath,
        size: entryStat.size,
        isDirectory: entryStat.isDirectory(),
        isFile: entryStat.isFile(),
        extension: entryStat.isFile() ? path.extname(entry.name) : undefined,
        modifiedTime: entryStat.mtime
      };
      
      results.push(fileInfo);
      
      // 递归遍历子目录
      if (recursive && entryStat.isDirectory()) {
        traverse(fullPath);
      }
    }
  }
  
  traverse(dirPath);
  return results;
}

/**
 * 搜索文件
 * 根据扩展名或模式搜索文件
 * 
 * @param dirPath - 搜索起始目录
 * @param options - 搜索选项
 * @returns 匹配的文件路径数组
 * 
 * @example
 * findFiles('/path/to/project', { extension: '.ts' }) // 查找所有 TypeScript 文件
 * findFiles('/path/to/project', { pattern: 'test' }) // 查找包含 'test' 的文件
 */
export function findFiles(
  dirPath: string,
  options: { extension?: string; pattern?: string; recursive?: boolean } = {}
): string[] {
  const { extension, pattern, recursive = true } = options;
  const files = listDirectory(dirPath, { recursive });
  
  return files
    .filter(file => file.isFile)
    .filter(file => {
      if (extension && !file.extension?.toLowerCase().endsWith(extension.toLowerCase())) {
        return false;
      }
      if (pattern && !file.name.toLowerCase().includes(pattern.toLowerCase())) {
        return false;
      }
      return true;
    })
    .map(file => file.path);
}

/**
 * 获取目录树结构
 * 返回可视化的目录树
 * 
 * @param dirPath - 目录路径
 * @param maxDepth - 最大深度，默认为 3
 * @returns 目录树字符串
 * 
 * @example
 * getDirectoryTree('/path/to/project', 2)
 */
export function getDirectoryTree(dirPath: string, maxDepth: number = 3): string {
  const lines: string[] = [];
  
  function buildTree(currentPath: string, prefix: string, depth: number) {
    if (depth > maxDepth) return;
    
    const entries = fs.readdirSync(currentPath, { withFileTypes: true })
      .filter(entry => !entry.name.startsWith('.'))
      .sort((a, b) => {
        // 目录优先
        if (a.isDirectory() && !b.isDirectory()) return -1;
        if (!a.isDirectory() && b.isDirectory()) return 1;
        return a.name.localeCompare(b.name);
      });
    
    entries.forEach((entry, index) => {
      const isLast = index === entries.length - 1;
      const connector = isLast ? '└── ' : '├── ';
      const extension = entry.isFile() ? path.extname(entry.name) : '';
      
      lines.push(`${prefix}${connector}${entry.name}${extension ? ` (${extension})` : ''}`);
      
      if (entry.isDirectory()) {
        const newPrefix = prefix + (isLast ? '    ' : '│   ');
        buildTree(path.join(currentPath, entry.name), newPrefix, depth + 1);
      }
    });
  }
  
  const rootName = path.basename(dirPath);
  lines.push(path.basename(dirPath) + '/');
  buildTree(dirPath, '', 1);
  
  return lines.join('\n');
}

// ============================================
// 文件操作工具
// ============================================

/**
 * 检查文件是否存在
 * 
 * @param filePath - 文件路径
 * @returns 是否存在
 */
export function fileExists(filePath: string): boolean {
  return fs.existsSync(filePath) && fs.statSync(filePath).isFile();
}

/**
 * 检查目录是否存在
 * 
 * @param dirPath - 目录路径
 * @returns 是否存在
 */
export function dirExists(dirPath: string): boolean {
  return fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory();
}

/**
 * 创建目录
 * 
 * @param dirPath - 目录路径
 * @param recursive - 是否递归创建，默认为 true
 */
export function createDirectory(dirPath: string, recursive: boolean = true): void {
  fs.mkdirSync(dirPath, { recursive });
}

/**
 * 删除文件或目录
 * 
 * @param targetPath - 目标路径
 * @param recursive - 删除目录时是否递归，默认为 true
 */
export function deletePath(targetPath: string, recursive: boolean = true): void {
  if (!fs.existsSync(targetPath)) {
    throw new Error(`路径不存在：${targetPath}`);
  }
  
  fs.rmSync(targetPath, { recursive, force: true });
}

/**
 * 复制文件
 * 
 * @param src - 源文件路径
 * @param dest - 目标文件路径
 */
export function copyFile(src: string, dest: string): void {
  if (!fs.existsSync(src)) {
    throw new Error(`源文件不存在：${src}`);
  }
  
  const destDir = path.dirname(dest);
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }
  
  fs.copyFileSync(src, dest);
}

// ============================================
// 使用示例
// ============================================

if (require.main === module) {
  console.log('=== 文件工具技能 - 使用示例 ===\n');
  
  const testDir = path.join(__dirname, '../../test-assets/file-utils-demo');
  
  // 清理测试目录
  if (fs.existsSync(testDir)) {
    fs.rmSync(testDir, { recursive: true, force: true });
  }
  
  // 1. 文件写入示例
  console.log('1️⃣ 文件写入:');
  const testFile = path.join(testDir, 'example.txt');
  writeFile(testFile, 'Hello, KAEL File Utils!\n这是第二行内容。\n这是第三行内容。');
  console.log(`   ✅ 创建文件：${testFile}`);
  
  // 2. JSON 写入示例
  console.log('\n2️⃣ JSON 写入:');
  const jsonFile = path.join(testDir, 'config.json');
  writeJsonFile(jsonFile, {
    name: 'KAEL',
    version: '1.0.0',
    features: ['文件读取', '文件写入', '文件遍历']
  });
  console.log(`   ✅ 创建 JSON 文件：${jsonFile}`);
  
  // 3. 文件读取示例
  console.log('\n3️⃣ 文件读取:');
  const content = readFile(testFile);
  console.log(`   文件内容:\n${content.split('\n').map(line => '   ' + line).join('\n')}`);
  
  // 4. 读取前 N 行示例
  console.log('\n4️⃣ 读取前 N 行:');
  const firstTwoLines = readLines(testFile, 2);
  console.log(`   前 2 行:\n${firstTwoLines.split('\n').map(line => '   ' + line).join('\n')}`);
  
  // 5. JSON 读取示例
  console.log('\n5️⃣ JSON 读取:');
  const config = readJsonFile<{ name: string; version: string }>(jsonFile);
  console.log(`   配置名称：${config.name}`);
  console.log(`   版本号：${config.version}`);
  
  // 6. 追加内容示例
  console.log('\n6️⃣ 追加内容:');
  appendToFile(testFile, '\n这是追加的第四行。');
  const updatedContent = readFile(testFile);
  console.log(`   更新后内容:\n${updatedContent.split('\n').map(line => '   ' + line).join('\n')}`);
  
  // 7. 创建更多测试文件
  console.log('\n7️⃣ 创建测试文件结构:');
  const subDir = path.join(testDir, 'subdir');
  createDirectory(subDir);
  writeFile(path.join(subDir, 'nested.txt'), '嵌套文件内容');
  writeFile(path.join(testDir, 'test.ts'), 'const x = 1;');
  writeFile(path.join(testDir, 'data.json'), JSON.stringify({ test: true }));
  console.log(`   ✅ 创建目录结构`);
  
  // 8. 遍历目录示例
  console.log('\n8️⃣ 遍历目录:');
  const files = listDirectory(testDir, { recursive: true });
  console.log(`   找到 ${files.length} 个文件/目录:`);
  files.forEach(file => {
    const type = file.isDirectory ? '📁' : '📄';
    console.log(`   ${type} ${file.name} (${file.size} bytes)`);
  });
  
  // 9. 搜索文件示例
  console.log('\n9️⃣ 搜索文件:');
  const tsFiles = findFiles(testDir, { extension: '.ts' });
  console.log(`   TypeScript 文件：${tsFiles.length} 个`);
  tsFiles.forEach(f => console.log(`      - ${path.basename(f)}`));
  
  const jsonFiles = findFiles(testDir, { extension: '.json' });
  console.log(`   JSON 文件：${jsonFiles.length} 个`);
  jsonFiles.forEach(f => console.log(`      - ${path.basename(f)}`));
  
  // 10. 目录树示例
  console.log('\n🔟 目录树:');
  const tree = getDirectoryTree(testDir, 2);
  console.log(`   ${tree.split('\n').join('\n   ')}`);
  
  // 11. 文件检查示例
  console.log('\n1️⃣1️⃣ 文件检查:');
  console.log(`   文件存在：${fileExists(testFile)}`);
  console.log(`   目录存在：${dirExists(testDir)}`);
  
  // 12. 复制文件示例
  console.log('\n1️⃣2️⃣ 复制文件:');
  const copyDest = path.join(testDir, 'example-copy.txt');
  copyFile(testFile, copyDest);
  console.log(`   ✅ 复制文件到：${copyDest}`);
  
  console.log('\n✅ 所有示例执行完成!');
  console.log(`\n📂 测试目录：${testDir}`);
  console.log('💡 提示：可以手动查看该目录验证结果');
}
