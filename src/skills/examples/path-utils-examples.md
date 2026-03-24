# Path Utils Skill - 使用示例

## 📦 导入

```typescript
// 命名导入
import {
  parsePath,
  joinPath,
  normalizePath,
  getRelativePath,
  isAbsolute,
  getExtension,
  getBasename,
  getDirname
} from './path-utils-skill';

// 或默认导入
import pathUtils from './path-utils-skill';
```

---

## 🔍 1. 路径解析 (parsePath)

### 基础用法

```typescript
import { parsePath } from './path-utils-skill';

const filePath = '/home/user/projects/src/index.ts';
const parsed = parsePath(filePath);

console.log(parsed);
/*
{
  root: '/',
  dir: '/home/user/projects/src',
  base: 'index.ts',
  ext: '.ts',
  name: 'index',
  segments: ['home', 'user', 'projects', 'src', 'index.ts'],
  isAbsolute: true,
  platform: 'posix'
}
*/
```

### 实际场景

```typescript
// 场景 1: 提取文件扩展名进行类型判断
function getFileType(filePath: string): string {
  const { ext } = parsePath(filePath);
  
  switch (ext.toLowerCase()) {
    case '.ts':
    case '.tsx':
      return 'typescript';
    case '.js':
    case '.jsx':
      return 'javascript';
    case '.py':
      return 'python';
    default:
      return 'unknown';
  }
}

// 场景 2: 获取文件所在目录
function getSourceDir(filePath: string): string {
  const { dir } = parsePath(filePath);
  return dir;
}

// 场景 3: 检查是否为绝对路径
function validatePath(filePath: string): boolean {
  const { isAbsolute } = parsePath(filePath);
  return isAbsolute;
}
```

---

## 🔗 2. 路径拼接 (joinPath)

### 基础用法

```typescript
import { joinPath } from './path-utils-skill';

// 简单拼接
const configPath = joinPath('home', 'user', '.config', 'app.json');
// 结果：'/home/user/.config/app.json' (Unix)
// 或 'home\user\.config\app.json' (Windows)

// 带选项拼接
const projectPath = joinPath(
  '~',
  'projects',
  'my-app',
  { expandHome: true, normalize: true }
);
// 结果：'/Users/nike/projects/my-app' (解析 ~ 为 home 目录)
```

### 实际场景

```typescript
// 场景 1: 构建配置文件路径
class ConfigManager {
  private baseDir: string;
  
  constructor(baseDir: string) {
    this.baseDir = baseDir;
  }
  
  getConfigPath(configName: string): string {
    return joinPath(this.baseDir, 'config', `${configName}.json`);
  }
  
  getLogPath(logName: string): string {
    return joinPath(this.baseDir, 'logs', `${logName}.log`);
  }
}

// 场景 2: 构建项目结构
function createProjectStructure(projectName: string): Record<string, string> {
  const base = joinPath('projects', projectName);
  
  return {
    root: base,
    src: joinPath(base, 'src'),
    tests: joinPath(base, 'tests'),
    docs: joinPath(base, 'docs'),
    config: joinPath(base, 'config')
  };
}

// 场景 3: 动态路径构建
function buildAssetPath(type: string, name: string, ext: string): string {
  return joinPath('assets', type, `${name}.${ext}`);
}

// 使用
const iconPath = buildAssetPath('icons', 'logo', 'png');
// 结果：'assets/icons/logo.png'
```

---

## ✨ 3. 路径规范化 (normalizePath)

### 基础用法

```typescript
import { normalizePath } from './path-utils-skill';

// 清理冗余路径
const messyPath = '/home/user/../user/./docs//file.txt';
const clean = normalizePath(messyPath);
// 结果：'/home/user/docs/file.txt'

// 统一路径分隔符
const windowsPath = 'C:\\Users\\nike\\docs\\file.txt';
const posixPath = normalizePath(windowsPath, {
  unifySeparator: true,
  platform: 'posix'
});
// 结果：'C:/Users/nike/docs/file.txt'

// 解析相对路径
const relativePath = './src/../lib';
const resolved = normalizePath(relativePath, { resolveDot: true });
// 结果：当前工作目录下的 'lib' 绝对路径
```

### 实际场景

```typescript
// 场景 1: 清理用户输入的路径
function sanitizeUserInput(userPath: string): string {
  return normalizePath(userPath, {
    unifySeparator: true,
    resolveDot: false
  });
}

// 场景 2: 跨平台路径处理
function normalizeForPlatform(filePath: string, targetPlatform: 'posix' | 'win32'): string {
  return normalizePath(filePath, {
    unifySeparator: true,
    platform: targetPlatform
  });
}

// 场景 3: 批量规范化路径列表
function normalizePathList(paths: string[]): string[] {
  return paths.map(p => normalizePath(p));
}

// 场景 4: 验证并规范化路径
function validateAndNormalize(filePath: string): { valid: boolean; path: string } {
  try {
    const normalized = normalizePath(filePath, { resolveDot: true });
    return { valid: true, path: normalized };
  } catch (error) {
    return { valid: false, path: filePath };
  }
}
```

---

## 🛠️ 4. 辅助功能

### 获取相对路径

```typescript
import { getRelativePath } from './path-utils-skill';

const from = '/home/user/docs';
const to = '/home/user/projects/src';
const relative = getRelativePath(from, to);
// 结果：'../../projects/src'
```

### 检查绝对路径

```typescript
import { isAbsolute } from './path-utils-skill';

console.log(isAbsolute('/home/user'));  // true
console.log(isAbsolute('./src'));       // false
console.log(isAbsolute('C:\\Users'));   // true (Windows)
```

### 获取扩展名

```typescript
import { getExtension } from './path-utils-skill';

console.log(getExtension('file.txt'));        // '.txt'
console.log(getExtension('archive.tar.gz'));  // '.gz'
console.log(getExtension('no-extension'));    // ''
```

### 获取文件名 (不含扩展名)

```typescript
import { getBasename } from './path-utils-skill';

console.log(getBasename('/home/user/file.txt'));  // 'file'
console.log(getBasename('archive.tar.gz'));       // 'archive.tar'
```

### 获取目录名

```typescript
import { getDirname } from './path-utils-skill';

console.log(getDirname('/home/user/docs/file.txt'));  // '/home/user/docs'
console.log(getDirname('file.txt'));                  // '.'
```

### 确保/移除末尾分隔符

```typescript
import { ensureTrailingSeparator, removeTrailingSeparator } from './path-utils-skill';

console.log(ensureTrailingSeparator('/home/user/docs'));  // '/home/user/docs/'
console.log(removeTrailingSeparator('/home/user/docs/')); // '/home/user/docs'
```

---

## 🎯 综合示例

### 示例 1: 文件路径处理器

```typescript
import { parsePath, joinPath, normalizePath } from './path-utils-skill';

class FilePathProcessor {
  private basePath: string;
  
  constructor(basePath: string) {
    this.basePath = normalizePath(basePath);
  }
  
  /**
   * 构建完整文件路径
   */
  buildPath(...segments: string[]): string {
    return joinPath(this.basePath, ...segments, { normalize: true });
  }
  
  /**
   * 获取文件信息
   */
  getFileInfo(filePath: string) {
    const parsed = parsePath(filePath);
    return {
      directory: parsed.dir,
      filename: parsed.name,
      extension: parsed.ext,
      isAbsolute: parsed.isAbsolute,
      depth: parsed.segments.length
    };
  }
  
  /**
   * 检查文件是否在指定目录下
   */
  isWithinDirectory(filePath: string, directory: string): boolean {
    const normalizedFile = normalizePath(filePath);
    const normalizedDir = normalizePath(directory);
    return normalizedFile.startsWith(normalizedDir);
  }
}

// 使用
const processor = new FilePathProcessor('/home/user/projects');
const configPath = processor.buildPath('config', 'app.json');
const info = processor.getFileInfo(configPath);
```

### 示例 2: 跨平台路径工具

```typescript
import { normalizePath, parsePath } from './path-utils-skill';

class CrossPlatformPath {
  /**
   * 转换为 POSIX 格式
   */
  static toPosix(filePath: string): string {
    return normalizePath(filePath, {
      unifySeparator: true,
      platform: 'posix'
    });
  }
  
  /**
   * 转换为 Windows 格式
   */
  static toWindows(filePath: string): string {
    return normalizePath(filePath, {
      unifySeparator: true,
      platform: 'win32'
    });
  }
  
  /**
   * 获取当前平台格式
   */
  static toCurrent(filePath: string): string {
    return normalizePath(filePath);
  }
  
  /**
   * 检测路径的平台格式
   */
  static detectPlatform(filePath: string): 'posix' | 'win32' {
    const { platform } = parsePath(filePath);
    return platform;
  }
}

// 使用
const windowsPath = 'C:\\Users\\nike\\docs\\file.txt';
const posixPath = CrossPlatformPath.toPosix(windowsPath);
// 结果：'C:/Users/nike/docs/file.txt'
```

---

## 🚀 运行示例

```typescript
import { runExamples } from './path-utils-skill';

// 执行内置示例
runExamples();
```

输出：
```
============================================================
Path Utils Skill - 使用示例
============================================================

【示例 1】路径解析
原始路径：/home/user/projects/src/index.ts
根目录：/
目录：/home/user/projects/src
文件名：index.ts
扩展名：.ts
名称：index
路径段：home / user / projects / src / index.ts
绝对路径：true
平台：posix

【示例 2】路径拼接
joinPath('home', 'user', 'projects', 'src')
结果：/home/user/projects/src

【示例 3】路径规范化
原始路径：/home/user/../user/./docs//file.txt
规范化后：/home/user/docs/file.txt

【示例 4】相对路径
从 /home/user/docs 到 /home/user/projects/src
相对路径：../../projects/src

【示例 5】辅助功能
getExtension('file.txt'): .txt
getBasename('file.txt'): file
getDirname('/home/user/file.txt'): /home/user/docs
isAbsolute('/home/user'): true
isAbsolute('./src'): false

============================================================
示例执行完成
============================================================
```

---

## 📝 API 参考

| 函数 | 描述 | 返回值 |
|------|------|--------|
| `parsePath(filePath)` | 解析路径为结构化对象 | `ParsedPath` |
| `joinPath(...segments, options)` | 拼接多个路径段 | `string` |
| `normalizePath(filePath, options)` | 规范化路径 | `string` |
| `getRelativePath(from, to)` | 获取相对路径 | `string` |
| `isAbsolute(filePath)` | 判断是否为绝对路径 | `boolean` |
| `getExtension(filePath)` | 获取扩展名 | `string` |
| `getBasename(filePath)` | 获取文件名 (不含扩展名) | `string` |
| `getDirname(filePath)` | 获取目录路径 | `string` |
| `ensureTrailingSeparator(dirPath)` | 确保末尾分隔符 | `string` |
| `removeTrailingSeparator(filePath)` | 移除末尾分隔符 | `string` |
| `runExamples()` | 运行使用示例 | `void` |

---

**版本:** 1.0.0  
**最后更新:** 2026-03-13
