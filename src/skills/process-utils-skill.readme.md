# KAEL 进程管理工具

> 进程执行、监控与终止的完整解决方案

## 📦 安装

无需额外安装，直接使用：

```typescript
import { 
  execSyncCommand, 
  execAsync, 
  getProcessInfo, 
  killProcess 
} from './src/skills/process-utils-skill';
```

## 🚀 快速开始

### 1. 执行命令

```typescript
// 同步执行
const result = execSyncCommand('ls -la');
console.log(result.stdout);

// 异步执行
const asyncResult = await execAsync('sleep 1 && echo done');
console.log(asyncResult.duration); // 执行时间 (ms)

// 带回调的实时输出
await execAsync('npm run build', {
  onStdout: (data) => console.log('输出:', data),
  onStderr: (data) => console.error('错误:', data),
  timeout: 60000, // 超时时间
});
```

### 2. 进程监控

```typescript
// 获取进程信息
const info = getProcessInfo(12345);
console.log(info?.name, info?.status);

// 获取资源使用情况
const monitor = getProcessMonitor(process.pid);
console.log(`CPU: ${monitor?.cpuPercent}%, 内存：${monitor?.memoryPercent}%`);

// 查找进程
const nodeProcs = findProcessByName('node');
console.log('找到', nodeProcs.length, '个 node 进程');

// 检查进程是否存在
const exists = processExists(12345);
```

### 3. 进程终止

```typescript
// 优雅终止 (先 SIGTERM，超时后 SIGKILL)
const success = await killProcessGracefully(12345, 5000);

// 强制终止
killProcessForce(12345);

// 终止所有匹配名称的进程
const count = killProcessesByName('sleep', true);
console.log('终止了', count, '个进程');
```

## 📖 API 参考

### 进程执行

| 函数 | 描述 | 返回值 |
|------|------|--------|
| `execSyncCommand(cmd, opts?)` | 同步执行命令 | `ProcessResult` |
| `execAsync(cmd, opts?)` | 异步执行命令 | `Promise<ProcessResult>` |
| `spawnProcess(cmd, args?, opts?)` | 生成后台进程 | `ChildProcess` |

### 进程监控

| 函数 | 描述 | 返回值 |
|------|------|--------|
| `getProcessInfo(pid)` | 获取进程基本信息 | `ProcessInfo \| null` |
| `getProcessMonitor(pid)` | 获取进程资源使用 | `ProcessMonitor \| null` |
| `listProcesses(filter?)` | 列出所有进程 | `ProcessInfo[]` |
| `findProcessByName(name)` | 按名称查找进程 | `ProcessInfo[]` |
| `processExists(pid)` | 检查进程是否存在 | `boolean` |

### 进程终止

| 函数 | 描述 | 返回值 |
|------|------|--------|
| `killProcess(pid, signal?)` | 终止进程 | `boolean` |
| `killProcessForce(pid)` | 强制终止 | `boolean` |
| `killProcessGracefully(pid, timeout?)` | 优雅终止 | `Promise<boolean>` |
| `killProcessesByName(name, force?)` | 批量终止 | `number` |

## 📝 类型定义

```typescript
interface ProcessResult {
  pid: number;
  stdout: string;
  stderr: string;
  exitCode: number | null;
  signal: string | null;
  duration: number;
}

interface ProcessInfo {
  pid: number;
  name: string;
  cpu?: number;
  memory?: number;
  status: 'running' | 'stopped' | 'zombie' | 'unknown';
  startTime?: number;
  command?: string;
}

interface ProcessMonitor {
  pid: number;
  cpuPercent: number;
  memoryPercent: number;
  memoryRSS: number;
  status: string;
  threads?: number;
}
```

## 💡 使用场景

### 1. 运行构建脚本

```typescript
const result = await execAsync('npm run build', {
  cwd: '/path/to/project',
  timeout: 300000,
  onStdout: (data) => process.stdout.write(data),
});

if (result.exitCode === 0) {
  console.log('构建成功!');
} else {
  console.error('构建失败:', result.stderr);
}
```

### 2. 监控服务进程

```typescript
function monitorService(pid: number) {
  setInterval(() => {
    const monitor = getProcessMonitor(pid);
    if (!monitor) {
      console.log('服务已停止');
      return;
    }
    
    if (monitor.cpuPercent > 80) {
      console.warn('警告：CPU 使用率过高');
    }
    
    console.log(`CPU: ${monitor.cpuPercent}%, MEM: ${monitor.memoryPercent}%`);
  }, 5000);
}
```

### 3. 进程管理器

```typescript
class ProcessManager {
  private processes = new Map<number, string>();
  
  async start(name: string, cmd: string, args: string[]) {
    const child = spawnProcess(cmd, args, {
      onExit: () => this.processes.delete(child.pid!),
    });
    
    if (child.pid) {
      this.processes.set(child.pid, name);
      console.log(`[${name}] 启动，PID=${child.pid}`);
    }
    
    return child.pid;
  }
  
  async stop(pid: number) {
    const name = this.processes.get(pid);
    if (!name) return false;
    
    const success = await killProcessGracefully(pid);
    if (success) this.processes.delete(pid);
    
    return success;
  }
}
```

## ⚠️ 注意事项

1. **权限**: 某些操作可能需要 sudo 权限
2. **跨平台**: 主要针对 macOS/Linux 优化，Windows 需要调整 ps 命令
3. **资源**: 避免频繁调用监控函数，建议间隔 >= 1 秒
4. **安全**: 执行用户输入的命令时注意注入风险

## 🧪 运行示例

```bash
# 运行所有示例
npx tsx src/skills/process-utils-skill.examples.ts
```

## 📄 许可证

MIT License

---

**Author:** KAEL  
**Version:** 1.0.0  
**Last Updated:** 2026-03-13
