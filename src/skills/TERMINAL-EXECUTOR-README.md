# 终端命令执行技能 (ACE)

**Terminal Executor Skill** - 强大的 Shell 命令执行工具

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue)
![Node.js](https://img.shields.io/badge/Node.js-18+-green)

---

## 📖 概述

ACE (Terminal Executor Skill) 是一个功能完整的 Shell 命令执行库，提供：

- ✅ **命令执行** - 同步/异步执行 Shell 命令
- ✅ **输出捕获** - 实时捕获 stdout/stderr
- ✅ **超时控制** - 可配置的执行超时机制
- ✅ **流式执行** - 实时处理长输出
- ✅ **并行/顺序执行** - 灵活的命令编排
- ✅ **历史记录** - 自动追踪命令历史

---

## 📦 安装

无需额外安装，技能已集成到项目中。

```typescript
import { TerminalExecutor, execCommand } from './terminal-executor-skill';
```

---

## 🚀 快速开始

### 基础使用

```typescript
import { TerminalExecutor } from './terminal-executor-skill';

const executor = new TerminalExecutor();

// 执行简单命令
const result = await executor.exec('ls -la');
console.log(result.stdout);
```

### 快捷函数

```typescript
import { execCommand } from './terminal-executor-skill';

const result = await execCommand('pwd');
console.log('当前目录:', result.stdout.trim());
```

---

## 📚 功能特性

### 1. 基础命令执行

```typescript
const result = await executor.exec('git status', {
  timeout: 10000,      // 10 秒超时
  cwd: '/workspace',   // 工作目录
  ignoreError: false,  // 抛出错误
});
```

### 2. 流式执行 (实时输出)

```typescript
await executor.execStream('npm install', {
  onStdout: (data) => process.stdout.write(data),
  onStderr: (data) => process.stderr.write(data),
  onProgress: (progress) => {
    console.log(`已处理 ${progress.bytes} 字节`);
  },
});
```

### 3. 并行执行

```typescript
const results = await executor.execParallel([
  'git status',
  'git branch',
  'git log --oneline -5',
]);
```

### 4. 顺序执行 (流水线)

```typescript
const results = await executor.execSequential([
  'npm install',
  'npm run lint',
  'npm run build',
  'npm test',
], {}, true); // 遇到错误停止
```

### 5. 命令历史

```typescript
// 查看历史
const history = executor.getHistory(10);

// 查看统计
const stats = executor.getHistoryStats();
console.log(stats);
// { total: 5, successCount: 4, failCount: 1, avgDuration: 125.5 }

// 清空历史
executor.clearHistory();
```

---

## 📊 API 文档

### TerminalExecutor 类

#### 构造函数

```typescript
constructor(defaultConfig?: ExecutionConfig)
```

#### 方法

| 方法 | 描述 | 参数 | 返回值 |
|------|------|------|--------|
| `exec` | 执行单个命令 | `command: string`, `config?: ExecutionConfig` | `Promise<ExecutionResult>` |
| `execStream` | 流式执行 | `command: string`, `config?: StreamExecutionConfig` | `Promise<ExecutionResult>` |
| `execParallel` | 并行执行多个命令 | `commands: string[]`, `config?: ExecutionConfig` | `Promise<ExecutionResult[]>` |
| `execSequential` | 顺序执行多个命令 | `commands: string[]`, `config?: ExecutionConfig`, `stopOnError?: boolean` | `Promise<ExecutionResult[]>` |
| `getHistory` | 获取命令历史 | `limit?: number` | `CommandHistoryEntry[]` |
| `getHistoryStats` | 获取历史统计 | - | `Stats` |
| `clearHistory` | 清空历史 | - | `void` |

### ExecutionResult 接口

```typescript
interface ExecutionResult {
  stdout: string;           // stdout 输出
  stderr: string;           // stderr 输出
  exitCode: number | null;  // 退出码
  signal: string | null;    // 终止信号
  duration: number;         // 执行耗时 (ms)
  timedOut: boolean;        // 是否超时
  error?: string;           // 错误信息
}
```

### ExecutionConfig 接口

```typescript
interface ExecutionConfig {
  timeout?: number;              // 超时时间 (ms)
  cwd?: string;                  // 工作目录
  env?: ProcessEnv;              // 环境变量
  maxBuffer?: number;            // 最大缓冲区 (bytes)
  shell?: string;                // Shell 类型
  ignoreError?: boolean;         // 忽略错误
  input?: string;                // stdin 输入
}
```

---

## 💡 使用场景

### Git 操作

```typescript
const executor = new TerminalExecutor({ cwd: '/workspace/project' });

const branch = await executor.exec('git branch --show-current');
console.log('当前分支:', branch.stdout.trim());
```

### 项目构建

```typescript
const results = await executor.execSequential([
  'npm ci',
  'npm run lint',
  'npm run build',
  'npm test',
], { timeout: 300000 });
```

### 文件操作

```typescript
// 查找大文件
const result = await executor.exec(
  'find . -type f -size +100M -exec ls -lh {} \\;'
);
```

### 系统监控

```typescript
const cpu = await executor.exec('top -l 1 | grep "CPU usage"');
const memory = await executor.exec('vm_stat');
const disk = await executor.exec('df -h /');
```

---

## ⚠️ 安全注意事项

### 命令注入风险

```typescript
// ❌ 危险
const userInput = getUserInput();
await executor.exec(userInput);

// ✅ 安全
const sanitized = userInput.replace(/[;&|`$()]/g, '');
await executor.exec(sanitized);

// ✅ 更安全
await exec(`echo ${JSON.stringify(userInput)}`);
```

### 超时设置

```typescript
// 快速命令
await executor.exec('ls -la'); // 默认 30 秒

// 中等命令
await executor.exec('npm install', { timeout: 120000 });

// 长时间任务
await executor.exec('docker build .', { timeout: 600000 });
```

---

## 🧪 测试

运行测试：

```bash
npm test -- terminal-executor-skill.test.ts
```

测试覆盖：

- ✅ 基础命令执行
- ✅ 超时控制
- ✅ 工作目录和环境变量
- ✅ 流式执行
- ✅ 并行/顺序执行
- ✅ 命令历史
- ✅ 错误处理

---

## 📝 示例代码

完整示例请查看：

- [terminal-executor-skill.examples.md](./terminal-executor-skill.examples.md) - 详细使用示例
- [terminal-executor-skill.test.ts](./terminal-executor-skill.test.ts) - 单元测试

---

## 🔄 版本历史

### v1.0.0 (2026-03-13)

- ✨ 初始版本
- ✅ 基础命令执行
- ✅ 流式执行
- ✅ 并行/顺序执行
- ✅ 超时控制
- ✅ 命令历史追踪

---

## 📄 许可证

MIT License

---

## 👤 作者

**Axon** - 至高意志执行者

---

## 🎯 最佳实践

1. **始终设置超时** - 防止命令卡死
2. **使用流式执行处理长输出** - 避免缓冲区溢出
3. **记录命令历史** - 便于调试和审计
4. **顺序执行依赖命令** - 确保执行顺序
5. **并行执行独立命令** - 提升性能
6. **处理错误情况** - 使用 try-catch 或 ignoreError

---

**最后更新:** 2026-03-13  
**文档版本:** 1.0.0
