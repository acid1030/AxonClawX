# 📡 KAEL 文件监听工具

> 高性能文件/目录监听系统，支持递归监控、事件防抖、快照对比

---

## 🚀 快速开始

```typescript
import { watchDirectory, watchFile } from './watcher-utils-skill';

// 监听单个文件
const fileWatcher = watchFile('./config.json', (event) => {
  console.log(`文件 ${event.type}: ${event.filePath}`);
});

// 监听整个目录
const dirWatcher = watchDirectory('./src', (event) => {
  console.log(`[${event.type}] ${event.filePath}`);
}, {
  recursive: true,
  filter: /\.ts$/,
  debounceMs: 200,
});
```

---

## 📋 API 文档

### 核心函数

| 函数 | 描述 | 返回值 |
|------|------|--------|
| `watchFile(path, callback)` | 监听单个文件 | `Watcher` |
| `watchDirectory(path, callback, options)` | 监听目录 | `Watcher` |
| `watchMultiple(paths, callback, options)` | 批量监听 | `Watcher[]` |
| `createDirectorySnapshot(path, options)` | 创建目录快照 | `Promise<DirectorySnapshot[]>` |
| `compareSnapshots(old, new)` | 对比快照差异 | `FileEvent[]` |
| `waitForEvent(path, type?, timeout?)` | 等待特定事件 | `Promise<FileEvent>` |
| `watchWithLogging(path, logFile, options)` | 带日志监听 | `Watcher` |

### Watcher 接口

```typescript
interface Watcher {
  close: () => void;              // 停止监听
  getPath: () => string;          // 获取监听路径
  getEventCount: () => number;    // 获取事件计数
  resetEventCount: () => void;    // 重置计数
}
```

### WatchOptions

```typescript
interface WatchOptions {
  recursive?: boolean;           // 递归监控子目录 (默认 false)
  filter?: RegExp;               // 文件过滤正则 (默认监控所有)
  debounceMs?: number;           // 防抖延迟 (默认 100ms)
  ignoreNodeModules?: boolean;   // 忽略 node_modules (默认 true)
  ignoreGit?: boolean;           // 忽略 .git (默认 true)
  ignorePaths?: string[];        // 自定义忽略路径
}
```

### FileEvent

```typescript
interface FileEvent {
  type: 'create' | 'modify' | 'delete' | 'rename';
  filePath: string;
  oldPath?: string;
  timestamp: number;
  stats?: fs.Stats;
}
```

---

## 💡 使用场景

### 1. 自动编译/构建
```typescript
watchDirectory('./src', (event) => {
  if (event.type === 'modify' && event.filePath.endsWith('.ts')) {
    console.log('触发 TypeScript 编译...');
    exec('tsc');
  }
}, { filter: /\.ts$/ });
```

### 2. 热重载配置
```typescript
watchFile('./config.json', (event) => {
  console.log('配置文件变化，重新加载...');
  reloadConfig();
});
```

### 3. 文件同步备份
```typescript
watchDirectory('./data', async (event) => {
  if (event.type === 'create' || event.type === 'modify') {
    await backupFile(event.filePath);
  }
}, { recursive: true });
```

### 4. 安全审计日志
```typescript
watchWithLogging('./sensitive', './logs/audit.log', {
  recursive: true,
  ignorePaths: ['./logs'],
});
```

### 5. 测试触发器
```typescript
watchDirectory('./src', (event) => {
  if (event.type === 'modify') {
    console.log('运行测试套件...');
    runTests();
  }
}, { debounceMs: 500 }); // 防抖避免频繁触发
```

---

## ⚡ 性能特性

- **防抖机制**: 避免 IDE 自动保存时的频繁触发
- **路径过滤**: 自动忽略 `node_modules`、`.git` 等目录
- **批量处理**: 支持同时监听多个路径
- **低内存占用**: 使用原生 `fs.watch` API
- **快照对比**: 高效检测文件变化

---

## 📊 示例代码

查看完整示例：[`watcher-utils-skill.examples.ts`](./watcher-utils-skill.examples.ts)

### 运行示例
```bash
cd src/skills
npx ts-node watcher-utils-skill.examples.ts
```

---

## ⚠️ 注意事项

1. **macOS 文件描述符限制**: 大量文件监听可能触及系统限制
   ```bash
   # 查看当前限制
   ulimit -n
   
   # 临时提高限制
   ulimit -n 4096
   ```

2. **网络文件系统**: NFS/SMB 上的监听可能不可靠

3. **递归监听**: 大型目录树建议使用快照对比替代

4. **事件顺序**: 不保证事件触发顺序，重要操作请使用快照对比

---

## 📝 更新日志

### v1.0.0 (2026-03-13)
- ✅ 单文件监听
- ✅ 目录递归监听
- ✅ 批量路径监听
- ✅ 快照创建与对比
- ✅ 事件防抖
- ✅ 日志记录
- ✅ Promise 事件等待

---

**作者:** KAEL  
**许可:** MIT
