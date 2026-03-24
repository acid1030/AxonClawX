/**
 * KAEL 进程管理工具
 * 
 * 功能:
 * 1. 进程执行 - 执行 shell 命令并管理进程
 * 2. 进程监控 - 监控进程状态、资源使用
 * 3. 进程终止 - 安全终止进程
 * 
 * @author KAEL
 * @version 1.0.0
 */

import { spawn, execSync, ChildProcess } from 'child_process';

// ==================== 类型定义 ====================

export interface ProcessInfo {
  pid: number;
  name: string;
  cpu?: number;
  memory?: number;
  status: 'running' | 'stopped' | 'zombie' | 'unknown';
  startTime?: number;
  command?: string;
}

export interface ProcessResult {
  pid: number;
  stdout: string;
  stderr: string;
  exitCode: number | null;
  signal: string | null;
  duration: number;
}

export interface ProcessMonitor {
  pid: number;
  cpuPercent: number;
  memoryPercent: number;
  memoryRSS: number;
  status: string;
  threads?: number;
}

export interface ExecOptions {
  cwd?: string;
  env?: Record<string, string>;
  timeout?: number;
  shell?: string;
  detached?: boolean;
  stdio?: 'pipe' | 'inherit' | 'ignore' | Array<'pipe' | 'ipc' | 'ignore' | 'inherit'>;
}

export interface SpawnOptions extends ExecOptions {
  args?: string[];
  onStdout?: (data: string) => void;
  onStderr?: (data: string) => void;
  onExit?: (code: number | null, signal: string | null) => void;
}

// ==================== 进程执行 ====================

/**
 * 1. 同步执行命令
 * 
 * @param command 命令字符串
 * @param options 执行选项
 * @returns 执行结果
 */
export function execSyncCommand(command: string, options?: ExecOptions): ProcessResult {
  const startTime = Date.now();
  
  try {
    const result = execSync(command, {
      encoding: 'utf-8',
      cwd: options?.cwd,
      env: options?.env,
      timeout: options?.timeout,
      shell: options?.shell || '/bin/bash',
    });
    
    return {
      pid: process.pid,
      stdout: result as string,
      stderr: '',
      exitCode: 0,
      signal: null,
      duration: Date.now() - startTime,
    };
  } catch (error: any) {
    return {
      pid: process.pid,
      stdout: error.stdout?.toString() || '',
      stderr: error.stderr?.toString() || error.message,
      exitCode: error.status || 1,
      signal: error.signal || null,
      duration: Date.now() - startTime,
    };
  }
}

/**
 * 2. 异步执行命令 (Promise)
 * 
 * @param command 命令字符串
 * @param options 执行选项
 * @returns Promise<ProcessResult>
 */
export function execAsync(command: string, options?: ExecOptions): Promise<ProcessResult> {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const child = spawn(command, [], {
      shell: options?.shell || '/bin/bash',
      cwd: options?.cwd,
      env: options?.env,
      detached: options?.detached,
      stdio: options?.stdio || 'pipe',
    });
    
    let stdout = '';
    let stderr = '';
    
    child.stdout?.on('data', (data) => {
      stdout += data.toString();
      (options as SpawnOptions)?.onStdout?.(data.toString());
    });
    
    child.stderr?.on('data', (data) => {
      stderr += data.toString();
      (options as SpawnOptions)?.onStderr?.(data.toString());
    });
    
    child.on('exit', (code, signal) => {
      resolve({
        pid: child.pid || 0,
        stdout,
        stderr,
        exitCode: code,
        signal,
        duration: Date.now() - startTime,
      });
    });
    
    child.on('error', (err) => {
      resolve({
        pid: child.pid || 0,
        stdout,
        stderr: err.message,
        exitCode: null,
        signal: null,
        duration: Date.now() - startTime,
      });
    });
    
    // 超时处理
    if (options?.timeout) {
      setTimeout(() => {
        child.kill('SIGKILL');
      }, options.timeout);
    }
  });
}

/**
 * 3. 生成进程 (后台运行)
 * 
 * @param command 命令
 * @param args 参数数组
 * @param options 选项
 * @returns ChildProcess
 */
export function spawnProcess(command: string, args: string[] = [], options?: SpawnOptions): ChildProcess {
  const child = spawn(command, args, {
    shell: options?.shell || '/bin/bash',
    cwd: options?.cwd,
    env: options?.env,
    detached: options?.detached ?? true,
    stdio: options?.stdio || 'pipe',
  });
  
  if (options?.onStdout) {
    child.stdout?.on('data', (data) => options.onStdout!(data.toString()));
  }
  
  if (options?.onStderr) {
    child.stderr?.on('data', (data) => options.onStderr!(data.toString()));
  }
  
  if (options?.onExit) {
    child.on('exit', (code, signal) => options.onExit!(code, signal));
  }
  
  // 后台运行时解绑
  if (options?.detached ?? true) {
    child.unref();
  }
  
  return child;
}

// ==================== 进程监控 ====================

/**
 * 4. 获取进程信息
 * 
 * @param pid 进程 ID
 * @returns 进程信息
 */
export function getProcessInfo(pid: number): ProcessInfo | null {
  try {
    // macOS/Linux: 使用 ps 命令
    const result = execSyncCommand(`ps -p ${pid} -o pid,comm,state,lstart 2>/dev/null || echo ""`);
    
    if (!result.stdout.trim()) {
      return null;
    }
    
    const lines = result.stdout.trim().split('\n');
    if (lines.length < 2) {
      return null;
    }
    
    const parts = lines[1].trim().split(/\s+/);
    const statusMap: Record<string, ProcessInfo['status']> = {
      'R': 'running',
      'S': 'running',
      'D': 'running',
      'Z': 'zombie',
      'T': 'stopped',
      't': 'stopped',
      'X': 'stopped',
    };
    
    return {
      pid,
      name: parts[1] || 'unknown',
      status: statusMap[parts[2]] || 'unknown',
      startTime: parseProcessStartTime(lines[1]),
      command: lines[1],
    };
  } catch {
    return null;
  }
}

/**
 * 5. 获取进程资源使用情况
 * 
 * @param pid 进程 ID
 * @returns 监控数据
 */
export function getProcessMonitor(pid: number): ProcessMonitor | null {
  try {
    // macOS: 使用 top 命令
    const result = execSyncCommand(`top -l 1 -pid ${pid} 2>/dev/null || echo ""`);
    
    if (!result.stdout.trim()) {
      // 备用方案：使用 ps
      const psResult = execSyncCommand(`ps -p ${pid} -o %cpu,%mem,rss,state 2>/dev/null || echo ""`);
      const lines = psResult.stdout.trim().split('\n');
      
      if (lines.length < 2) {
        return null;
      }
      
      const parts = lines[1].trim().split(/\s+/);
      return {
        pid,
        cpuPercent: parseFloat(parts[0]) || 0,
        memoryPercent: parseFloat(parts[1]) || 0,
        memoryRSS: parseInt(parts[2]) || 0,
        status: 'running',
      };
    }
    
    // 解析 top 输出
    const cpuMatch = result.stdout.match(/CPU usage:\s*([\d.]+)%/);
    const memMatch = result.stdout.match(/PhysMem:\s*([\d.]+[KMGT]?B)/);
    
    return {
      pid,
      cpuPercent: cpuMatch ? parseFloat(cpuMatch[1]) : 0,
      memoryPercent: memMatch ? parseFloat(memMatch[1]) : 0,
      memoryRSS: 0,
      status: 'running',
    };
  } catch {
    return null;
  }
}

/**
 * 6. 列出所有进程
 * 
 * @param filter 可选的过滤条件
 * @returns 进程列表
 */
export function listProcesses(filter?: { name?: string; user?: string }): ProcessInfo[] {
  try {
    // macOS compatible ps command
    let command = 'ps -eo pid,comm,state';
    
    if (filter?.user) {
      command = `ps -U ${filter.user} -o pid,comm,state`;
    }
    
    const result = execSyncCommand(command);
    const lines = result.stdout.trim().split('\n');
    
    const processes: ProcessInfo[] = [];
    const statusMap: Record<string, ProcessInfo['status']> = {
      'R': 'running',
      'S': 'running',
      'D': 'running',
      'Z': 'zombie',
      'T': 'stopped',
      't': 'stopped',
      'X': 'stopped',
    };
    
    // Skip header line
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      const parts = line.trim().split(/\s+/);
      if (parts.length >= 2) {
        const pid = parseInt(parts[0]);
        const name = parts[1];
        const status = statusMap[parts[2]] || 'unknown';
        
        if (!filter?.name || name.includes(filter.name)) {
          processes.push({ pid, name, status });
        }
      }
    }
    
    return processes;
  } catch {
    return [];
  }
}

/**
 * 7. 查找进程 (按名称)
 * 
 * @param name 进程名称
 * @returns 匹配的进程列表
 */
export function findProcessByName(name: string): ProcessInfo[] {
  return listProcesses({ name });
}

// ==================== 进程终止 ====================

/**
 * 8. 终止进程
 * 
 * @param pid 进程 ID
 * @param signal 信号 (默认 SIGTERM)
 * @returns 是否成功
 */
export function killProcess(pid: number, signal: string = 'SIGTERM'): boolean {
  try {
    process.kill(pid, signal as NodeJS.Signals);
    return true;
  } catch {
    return false;
  }
}

/**
 * 9. 强制终止进程
 * 
 * @param pid 进程 ID
 * @returns 是否成功
 */
export function killProcessForce(pid: number): boolean {
  return killProcess(pid, 'SIGKILL');
}

/**
 * 10. 终止进程组
 * 
 * @param pid 进程组 ID
 * @returns 是否成功
 */
export function killProcessGroup(pid: number): boolean {
  try {
    // 负数 PID 表示进程组
    process.kill(-pid, 'SIGTERM');
    return true;
  } catch {
    return false;
  }
}

/**
 * 11. 优雅终止进程 (先 SIGTERM，超时后 SIGKILL)
 * 
 * @param pid 进程 ID
 * @param timeout 超时时间 (毫秒)
 * @returns 是否成功
 */
export async function killProcessGracefully(pid: number, timeout: number = 5000): Promise<boolean> {
  // 先发送 SIGTERM
  if (!killProcess(pid, 'SIGTERM')) {
    return false;
  }
  
  // 等待进程结束
  const startTime = Date.now();
  while (Date.now() - startTime < timeout) {
    const info = getProcessInfo(pid);
    if (!info) {
      return true; // 进程已结束
    }
    await sleep(100);
  }
  
  // 超时后强制终止
  return killProcessForce(pid);
}

/**
 * 12. 终止所有匹配名称的进程
 * 
 * @param name 进程名称
 * @param force 是否强制终止
 * @returns 终止的进程数量
 */
export function killProcessesByName(name: string, force: boolean = false): number {
  const processes = findProcessByName(name);
  let count = 0;
  
  for (const proc of processes) {
    const success = force ? killProcessForce(proc.pid) : killProcess(proc.pid);
    if (success) {
      count++;
    }
  }
  
  return count;
}

// ==================== 辅助函数 ====================

/**
 * 解析进程启动时间
 */
function parseProcessStartTime(psOutput: string): number | undefined {
  try {
    // ps lstart 格式: "Fri Mar 13 19:00:00 2026"
    const match = psOutput.match(/([A-Za-z]{3}\s+[A-Za-z]{3}\s+\d+\s+[\d:]+\s+\d{4})/);
    if (match) {
      return new Date(match[1]).getTime();
    }
  } catch {
    // 忽略解析错误
  }
  return undefined;
}

/**
 * 睡眠函数
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 检查进程是否存在
 */
export function processExists(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

/**
 * 获取当前进程信息
 */
export function getCurrentProcessInfo(): ProcessInfo | null {
  return getProcessInfo(process.pid);
}

/**
 * 获取父进程信息
 */
export function getParentProcessInfo(): ProcessInfo | null {
  return getProcessInfo(process.ppid);
}

// ==================== 导出 ====================

export default {
  // 进程执行
  execSyncCommand,
  execAsync,
  spawnProcess,
  
  // 进程监控
  getProcessInfo,
  getProcessMonitor,
  listProcesses,
  findProcessByName,
  processExists,
  getCurrentProcessInfo,
  getParentProcessInfo,
  
  // 进程终止
  killProcess,
  killProcessForce,
  killProcessGroup,
  killProcessGracefully,
  killProcessesByName,
};
