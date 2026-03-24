# 📁 KAEL 文件工具技能

提供完整的文件操作功能，支持文件读取、写入、遍历等操作。

---

## 🚀 快速开始

### 导入技能

```typescript
import {
  readFile,
  writeFile,
  listDirectory,
  findFiles,
  // ... 其他函数
} from './src/skills/file-utils-skill';
```

---

## 📚 功能清单

### 1. 文件读取

| 函数 | 描述 | 示例 |
|------|------|------|
| `readFile(path, encoding)` | 读取文件内容 | `readFile('/path/to/file.txt')` |
| `readJsonFile(path)` | 读取并解析 JSON | `readJsonFile('/path/to/config.json')` |
| `readLines(path, lines)` | 读取前 N 行 | `readLines('/path/to/large.log', 10)` |

### 2. 文件写入

| 函数 | 描述 | 示例 |
|------|------|------|
| `writeFile(path, content)` | 写入文件（自动创建目录） | `writeFile('/path/to/file.txt', 'Hello')` |
| `writeJsonFile(path, data)` | 写入 JSON 文件 | `writeJsonFile('/path/to/config.json', {key: 'value'})` |
| `appendToFile(path, content)` | 追加内容到文件 | `appendToFile('/path/to/log.txt', 'New entry')` |

### 3. 文件遍历

| 函数 | 描述 | 示例 |
|------|------|------|
| `listDirectory(path, options)` | 遍历目录 | `listDirectory('/path/to/dir', {recursive: true})` |
| `findFiles(path, options)` | 搜索文件 | `findFiles('/path/to/project', {extension: '.ts'})` |
| `getDirectoryTree(path, depth)` | 生成目录树 | `getDirectoryTree('/path/to/project', 3)` |

### 4. 文件管理

| 函数 | 描述 | 示例 |
|------|------|------|
| `fileExists(path)` | 检查文件是否存在 | `fileExists('/path/to/file.txt')` |
| `dirExists(path)` | 检查目录是否存在 | `dirExists('/path/to/dir')` |
| `createDirectory(path)` | 创建目录 | `createDirectory('/path/to/new/dir')` |
| `deletePath(path)` | 删除文件或目录 | `deletePath('/path/to/old/dir')` |
| `copyFile(src, dest)` | 复制文件 | `copyFile('/src/file.txt', '/dest/file.txt')` |

---

## 💡 使用示例

### 示例 1: 读写配置文件

```typescript
import { readJsonFile, writeJsonFile } from './file-utils-skill';

// 写入配置
const config = {
  database: { host: 'localhost', port: 5432 },
  features: ['auth', 'api']
};
writeJsonFile('/path/to/config.json', config);

// 读取配置
const loaded = readJsonFile<typeof config>('/path/to/config.json');
console.log(loaded.database.host); // 'localhost'
```

### 示例 2: 搜索项目文件

```typescript
import { findFiles } from './file-utils-skill';

// 查找所有 TypeScript 文件
const tsFiles = findFiles('/path/to/project', { 
  extension: '.ts',
  recursive: true 
});

console.log(`找到 ${tsFiles.length} 个 TypeScript 文件`);
```

### 示例 3: 生成项目结构

```typescript
import { getDirectoryTree } from './file-utils-skill';

const tree = getDirectoryTree('/path/to/project', 3);
console.log(tree);
```

输出:
```
project/
├── src/
│   ├── index.ts (.ts)
│   └── utils/
│       └── helpers.ts (.ts)
├── tests/
│   └── test.ts (.ts)
└── package.json (.json)
```

### 示例 4: 日志文件操作

```typescript
import { appendToFile, readLines } from './file-utils-skill';

// 追加日志
appendToFile('/path/to/app.log', `[${new Date().toISOString()}] Info: Something happened\n`);

// 查看最新 10 条日志
const recentLogs = readLines('/path/to/app.log', 10);
console.log(recentLogs);
```

---

## 🧪 运行测试

```bash
# 运行主技能示例
npx ts-node src/skills/file-utils-skill.ts

# 运行完整示例集
npx ts-node src/skills/file-utils-skill.examples.ts
```

---

## 📋 API 详情

### FileInfo 接口

```typescript
interface FileInfo {
  name: string;        // 文件名
  path: string;        // 完整路径
  size: number;        // 文件大小 (bytes)
  isDirectory: boolean; // 是否为目录
  isFile: boolean;     // 是否为文件
  extension?: string;  // 文件扩展名
  modifiedTime: Date;  // 最后修改时间
}
```

### listDirectory 选项

```typescript
{
  recursive?: boolean;     // 是否递归遍历，默认 false
  includeHidden?: boolean; // 是否包含隐藏文件，默认 false
}
```

### findFiles 选项

```typescript
{
  extension?: string;      // 文件扩展名过滤 (如 '.ts')
  pattern?: string;        // 文件名包含模式
  recursive?: boolean;     // 是否递归搜索，默认 true
}
```

---

## ⚠️ 注意事项

1. **自动创建目录**: `writeFile` 默认会自动创建不存在的目录
2. **隐藏文件**: 遍历目录时默认跳过 `.` 开头的隐藏文件
3. **JSON 格式化**: `writeJsonFile` 默认使用 2 空格格式化输出
4. **错误处理**: 所有函数在遇到错误时会抛出异常，建议使用 try-catch

---

## 📦 依赖

- Node.js fs 模块 (原生)
- Node.js path 模块 (原生)
- 无需额外 npm 包

---

## 📝 版本

- **版本**: 1.0.0
- **作者**: KAEL
- **创建时间**: 2026-03-13

---

**交付完成 ✅**
