# 终端命令执行技能 - 使用示例

**ACE (Terminal Executor Skill)** - 强大的 Shell 命令执行工具

---

## 📦 快速开始

### 基础导入

```typescript
import {
  TerminalExecutor,
  execCommand,
  execCommandStream,
  type ExecutionConfig,
  type ExecutionResult,
} from './terminal-executor-skill';
```

---

## 🚀 使用示例

### 1. 基础命令执行

```typescript
const executor = new TerminalExecutor();

// 执行简单命令
const result = await executor.exec('ls -la');
console.log('输出:', result.stdout);
console.log('耗时:', result.duration, 'ms');
```

### 2. 带超时控制的执行

```typescript
// 设置 10 秒超时
const result = await executor.exec('npm install', {
  timeout: 10000, // 10 秒
});

if (result.timedOut) {
  console.error('命令执行超时!');
}
```

### 3. 指定工作目录

```typescript
const result = await executor.exec('git status', {
  cwd: '/path/to/your/project',
});
```

### 4. 设置环境变量

```typescript
const result = await executor.exec('echo $NODE_ENV', {
  env: {
    ...process.env,
    NODE_ENV: 'production',
  },
});
```

### 5. 流式执行 (实时输出)

```typescript
const result = await executor.execStream('npm run build', {
  timeout: 60000,
  onStdout: (data) => {
    process.stdout.write(`[BUILD] ${data}`);
  },
  onStderr: (data) => {
    process.stderr.write(`[ERROR] ${data}`);
  },
  onProgress: (progress) => {
    console.log(`进度：${progress.lines} 行，${progress.bytes} 字节`);
  },
});
```

### 6. 并行执行多个命令

```typescript
const commands = [
  'git status',
  'git branch',
  'git log --oneline -5',
];

const results = await executor.execParallel(commands);

results.forEach((result, index) => {
  console.log(`命令 ${index + 1}:`, {
    退出码：result.exitCode,
    耗时：result.duration,
    输出：result.stdout,
  });
});
```

### 7. 顺序执行 (流水线)

```typescript
const pipeline = [
  'npm install',
  'npm run lint',
  'npm run build',
  'npm test',
];

const results = await executor.execSequential(pipeline, {
  timeout: 120000, // 2 分钟总超时
}, true); // 遇到错误停止

// 检查结果
const successCount = results.filter(r => r.exitCode === 0).length;
console.log(`成功：${successCount}/${pipeline.length}`);
```

### 8. 错误处理

```typescript
try {
  const result = await executor.exec('invalid-command', {
    ignoreError: false, // 抛出错误
  });
} catch (error: any) {
  console.error('命令执行失败:', error.message);
  console.error('错误输出:', error.stderr);
}

// 或者忽略错误
const result = await executor.exec('invalid-command', {
  ignoreError: true, // 不抛出错误
});
console.log('退出码:', result.exitCode); // 非 0
console.log('错误:', result.error);
```

### 9. 命令历史追踪

```typescript
const executor = new TerminalExecutor();

// 执行一些命令
await executor.exec('ls -la');
await executor.exec('git status');
await executor.exec('npm version');

// 查看历史
const history = executor.getHistory(5);
history.forEach(entry => {
  console.log(`${entry.command} - ${entry.success ? '✓' : '✗'} (${entry.duration}ms)`);
});

// 查看统计
const stats = executor.getHistoryStats();
console.log('统计:', stats);
// { total: 3, successCount: 3, failCount: 0, avgDuration: 125.33 }

// 清空历史
executor.clearHistory();
```

### 10. 使用快捷函数

```typescript
import { execCommand, execCommandStream } from './terminal-executor-skill';

// 快速执行
const result = await execCommand('pwd');
console.log('当前目录:', result.stdout.trim());

// 快速流式执行
await execCommandStream('tail -f logs/app.log', {
  onStdout: (data) => console.log(data),
});
```

### 11. 自定义默认配置

```typescript
const executor = new TerminalExecutor({
  timeout: 30000,
  cwd: '/workspace',
  shell: '/bin/zsh',
  maxBuffer: 1024 * 1024 * 2, // 2MB
});

// 所有命令都会使用这些默认配置
const result = await executor.exec('npm run dev');
```

### 12. 管道命令支持

```typescript
// 支持复杂的管道命令
const result = await executor.exec('git log --oneline | head -10 | wc -l');
console.log('提交数量:', result.stdout.trim());

// 支持重定向
await executor.exec('echo "Hello World" > output.txt');
await executor.exec('cat output.txt');
```

### 13. 多行输入

```typescript
const result = await executor.exec('cat', {
  input: 'Line 1\nLine 2\nLine 3\n',
});
console.log('输出:', result.stdout);
```

### 14. 实际应用场景

#### A. Git 操作

```typescript
const executor = new TerminalExecutor({ cwd: '/workspace/my-project' });

// 获取当前分支
const branch = await executor.exec('git branch --show-current');
console.log('当前分支:', branch.stdout.trim());

// 拉取最新代码
const pull = await executor.exec('git pull origin main');
console.log(pull.stdout);
```

#### B. 项目构建

```typescript
const buildPipeline = async () => {
  const executor = new TerminalExecutor();
  
  const results = await executor.execSequential([
    'npm ci',
    'npm run lint',
    'npm run type-check',
    'npm run build',
    'npm run test:coverage',
  ], { timeout: 300000 }); // 5 分钟
  
  const failed = results.findIndex(r => r.exitCode !== 0);
  if (failed !== -1) {
    throw new Error(`构建失败于步骤 ${failed + 1}`);
  }
  
  return results;
};
```

#### C. 文件操作

```typescript
// 查找大文件
const result = await executor.exec(
  'find . -type f -size +100M -exec ls -lh {} \\;'
);
console.log('大文件列表:', result.stdout);

// 压缩目录
await executor.exec('tar -czf archive.tar.gz ./dist');
```

#### D. 系统监控

```typescript
// 获取系统信息
const cpu = await executor.exec('top -l 1 | grep "CPU usage"');
const memory = await executor.exec('vm_stat');
const disk = await executor.exec('df -h /');

console.log('CPU:', cpu.stdout);
console.log('内存:', memory.stdout);
console.log('磁盘:', disk.stdout);
```

---

## 📊 API 参考

### TerminalExecutor 类

| 方法 | 描述 | 返回值 |
|------|------|--------|
| `exec(command, config?)` | 执行单个命令 | `Promise<ExecutionResult>` |
| `execStream(command, config?)` | 流式执行命令 | `Promise<ExecutionResult>` |
| `execParallel(commands, config?)` | 并行执行多个命令 | `Promise<ExecutionResult[]>` |
| `execSequential(commands, config?, stopOnError?)` | 顺序执行多个命令 | `Promise<ExecutionResult[]>` |
| `getHistory(limit?)` | 获取命令历史 | `CommandHistoryEntry[]` |
| `getHistoryStats()` | 获取历史统计 | `Stats` |
| `clearHistory()` | 清空历史 | `void` |

### ExecutionResult 接口

```typescript
interface ExecutionResult {
  stdout: string;           // stdout 输出
  stderr: string;           // stderr 输出
  exitCode: number | null;  // 退出码
  signal: string | null;    // 信号
  duration: number;         // 耗时 (ms)
  timedOut: boolean;        // 是否超时
  error?: string;           // 错误信息
}
```

### ExecutionConfig 接口

```typescript
interface ExecutionConfig {
  timeout?: number;              // 超时 (ms)
  cwd?: string;                  // 工作目录
  env?: ProcessEnv;              // 环境变量
  maxBuffer?: number;            // 最大缓冲区 (bytes)
  shell?: string;                // Shell 类型
  ignoreError?: boolean;         // 忽略错误
  input?: string;                // stdin 输入
}
```

---

## ⚠️ 注意事项

### 安全警告

```typescript
// ❌ 危险：不要直接执行用户输入
const userInput = getUserInput();
await executor.exec(userInput); // 可能被注入恶意命令

// ✅ 安全：验证和清理输入
const sanitized = userInput.replace(/[;&|`$()]/g, '');
await executor.exec(sanitized);

// ✅ 更安全：使用参数化命令
await exec(`echo ${JSON.stringify(userInput)}`);
```

### 性能建议

```typescript
// ❌ 避免：大量小命令
for (let i = 0; i < 1000; i++) {
  await executor.exec(`echo ${i}`);
}

// ✅ 推荐：批量处理
await executor.exec('seq 1 1000 | xargs -I {} echo {}');
```

### 超时设置

```typescript
// 快速命令 (默认 30 秒)
await executor.exec('ls -la');

// 中等命令 (1-2 分钟)
await executor.exec('npm install', { timeout: 120000 });

// 长时间任务 (5-10 分钟)
await executor.exec('docker build .', { timeout: 600000 });
```

---

## 🎯 最佳实践

1. **始终设置超时** - 防止命令卡死
2. **使用流式执行处理长输出** - 避免缓冲区溢出
3. **记录命令历史** - 便于调试和审计
4. **顺序执行依赖命令** - 确保执行顺序
5. **并行执行独立命令** - 提升性能
6. **处理错误情况** - 使用 try-catch 或 ignoreError

---

**版本:** 1.0.0  
**作者:** Axon  
**最后更新:** 2026-03-13
