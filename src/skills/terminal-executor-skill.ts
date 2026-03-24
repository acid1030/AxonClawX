/**
 * 终端命令执行技能 - Terminal Executor Skill (ACE)
 * 
 * 功能:
 * 1. 命令执行 - 支持同步/异步 Shell 命令执行
 * 2. 输出捕获 - 实时捕获 stdout/stderr 输出
 * 3. 超时控制 - 可配置的执行超时机制
 * 
 * @author Axon
 * @version 1.0.0
 */

import { exec as nodeExec, spawn } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(nodeExec);

// ============== 类型定义 ==============

/** 执行结果 */
export interface ExecutionResult {
  /** 命令执行的 stdout 输出 */
  stdout: string;
  /** 命令执行的 stderr 输出 */
  stderr: string;
  /** 退出码 (0 表示成功) */
  exitCode: number | null;
  /** 执行信号 (如果被杀死) */
  signal: NodeJS.Signals | null;
  /** 执行耗时 (毫秒) */
  duration: number;
  /** 是否超时 */
  timedOut: boolean;
  /** 错误信息 (如果有) */
  error?: string;
}

/** 执行配置 */
export interface ExecutionConfig {
  /** 超时时间 (毫秒)，默认 30000 */
  timeout?: number;
  /** 工作目录 */
  cwd?: string;
  /** 环境变量 */
  env?: NodeJS.ProcessEnv;
  /** 最大缓冲区大小 (字节)，默认 1024 * 1024 */
  maxBuffer?: number;
  /** Shell 类型，默认 '/bin/bash' */
  shell?: string;
  /** 是否忽略错误 */
  ignoreError?: boolean;
  /** 输入数据 (stdin) */
  input?: string;
}

/** 流式执行配置 */
export interface StreamExecutionConfig extends ExecutionConfig {
  /** stdout 回调函数 */
  onStdout?: (data: string) => void;
  /** stderr 回调函数 */
  onStderr?: (data: string) => void;
  /** 进度回调函数 */
  onProgress?: (progress: StreamProgress) => void;
}

/** 流式执行进度 */
export interface StreamProgress {
  /** 当前输出行数 */
  lines: number;
  /** 当前输出字节数 */
  bytes: number;
  /** 执行耗时 (毫秒) */
  duration: number;
  /** 当前状态 */
  status: 'running' | 'completed' | 'failed' | 'timeout';
}

/** 命令历史条目 */
export interface CommandHistoryEntry {
  /** 命令 */
  command: string;
  /** 执行时间戳 */
  timestamp: number;
  /** 执行耗时 (毫秒) */
  duration: number;
  /** 退出码 */
  exitCode: number | null;
  /** 是否成功 */
  success: boolean;
}

// ============== 命令历史管理 ==============

/** 命令历史记录 */
export class CommandHistory {
  private history: CommandHistoryEntry[] = [];
  private maxSize: number;

  constructor(maxSize: number = 100) {
    this.maxSize = maxSize;
  }

  /** 添加历史记录 */
  add(entry: CommandHistoryEntry): void {
    this.history.unshift(entry);
    if (this.history.length > this.maxSize) {
      this.history.pop();
    }
  }

  /** 获取历史记录 */
  get(limit: number = 10): CommandHistoryEntry[] {
    return this.history.slice(0, limit);
  }

  /** 清空历史记录 */
  clear(): void {
    this.history = [];
  }

  /** 获取统计信息 */
  getStats(): {
    total: number;
    successCount: number;
    failCount: number;
    avgDuration: number;
  } {
    const total = this.history.length;
    const successCount = this.history.filter(h => h.success).length;
    const failCount = total - successCount;
    const avgDuration = total > 0
      ? this.history.reduce((sum, h) => sum + h.duration, 0) / total
      : 0;

    return { total, successCount, failCount, avgDuration };
  }
}

// ============== 终端执行器 ==============

/**
 * 终端命令执行器
 */
export class TerminalExecutor {
  private history: CommandHistory;
  private defaultConfig: ExecutionConfig;

  constructor(defaultConfig?: ExecutionConfig) {
    this.history = new CommandHistory();
    this.defaultConfig = defaultConfig || {};
  }

  /**
   * 执行单个命令 (同步等待结果)
   * 
   * @param command 要执行的命令
   * @param config 执行配置
   * @returns 执行结果
   * 
   * @example
   * ```typescript
   * const executor = new TerminalExecutor();
   * const result = await executor.exec('ls -la');
   * console.log(result.stdout);
   * ```
   */
  async exec(command: string, config?: ExecutionConfig): Promise<ExecutionResult> {
    const startTime = Date.now();
    const mergedConfig = { ...this.defaultConfig, ...config };
    
    try {
      const options: any = {
        timeout: mergedConfig.timeout,
        cwd: mergedConfig.cwd,
        env: mergedConfig.env,
        maxBuffer: mergedConfig.maxBuffer,
        shell: mergedConfig.shell,
      };
      
      if (mergedConfig.input) {
        options.input = mergedConfig.input;
      }
      
      const resultData = await execAsync(command, options);
      const stdout = resultData.stdout as unknown as string;
      const stderr = resultData.stderr as unknown as string;

      const duration = Date.now() - startTime;
      const result: ExecutionResult = {
        stdout,
        stderr,
        exitCode: 0,
        signal: null,
        duration,
        timedOut: false,
      };

      // 记录历史
      this.history.add({
        command,
        timestamp: startTime,
        duration,
        exitCode: 0,
        success: true,
      });

      return result;
    } catch (error: any) {
      const duration = Date.now() - startTime;
      const isTimeout = error.code === 'ETIMEDOUT' || error.killed;
      
      const result: ExecutionResult = {
        stdout: error.stdout || '',
        stderr: error.stderr || '',
        exitCode: error.code === 'ETIMEDOUT' ? null : error.code,
        signal: error.signal || null,
        duration,
        timedOut: isTimeout,
        error: error.message,
      };

      // 记录历史
      this.history.add({
        command,
        timestamp: startTime,
        duration,
        exitCode: result.exitCode,
        success: false,
      });

      if (!mergedConfig.ignoreError) {
        throw error;
      }

      return result;
    }
  }

  /**
   * 流式执行命令 (实时输出)
   * 
   * @param command 要执行的命令
   * @param config 流式执行配置
   * @returns Promise<ExecutionResult>
   * 
   * @example
   * ```typescript
   * const executor = new TerminalExecutor();
   * const result = await executor.execStream('npm install', {
   *   onStdout: (data) => console.log('OUT:', data),
   *   onStderr: (data) => console.error('ERR:', data),
   * });
   * ```
   */
  async execStream(command: string, config?: StreamExecutionConfig): Promise<ExecutionResult> {
    const startTime = Date.now();
    const mergedConfig = { ...this.defaultConfig, ...config };
    
    return new Promise((resolve, reject) => {
      const child = spawn(command, [], {
        shell: mergedConfig.shell || '/bin/bash',
        cwd: mergedConfig.cwd,
        env: mergedConfig.env,
        timeout: mergedConfig.timeout,
      });

      let stdout = '';
      let stderr = '';
      let bytes = 0;
      let lines = 0;
      let timedOut = false;

      const progress: StreamProgress = {
        lines: 0,
        bytes: 0,
        duration: 0,
        status: 'running',
      };

      // 处理 stdout
      child.stdout?.on('data', (data: Buffer) => {
        const text = data.toString();
        stdout += text;
        bytes += data.length;
        lines += text.split('\n').length - 1;
        
        progress.lines = lines;
        progress.bytes = bytes;
        progress.duration = Date.now() - startTime;
        
        mergedConfig.onStdout?.(text);
        mergedConfig.onProgress?.(progress);
      });

      // 处理 stderr
      child.stderr?.on('data', (data: Buffer) => {
        const text = data.toString();
        stderr += text;
        bytes += data.length;
        lines += text.split('\n').length - 1;
        
        progress.lines = lines;
        progress.bytes = bytes;
        progress.duration = Date.now() - startTime;
        
        mergedConfig.onStderr?.(text);
        mergedConfig.onProgress?.(progress);
      });

      // 处理错误
      child.on('error', (error) => {
        progress.status = 'failed';
        const duration = Date.now() - startTime;
        
        this.history.add({
          command,
          timestamp: startTime,
          duration,
          exitCode: null,
          success: false,
        });

        reject(error);
      });

      // 处理超时
      child.on('timeout', () => {
        timedOut = true;
        progress.status = 'timeout';
        child.kill('SIGTERM');
      });

      // 处理退出
      child.on('close', (exitCode, signal) => {
        const duration = Date.now() - startTime;
        progress.status = exitCode === 0 ? 'completed' : 'failed';
        progress.duration = duration;

        const result: ExecutionResult = {
          stdout,
          stderr,
          exitCode,
          signal,
          duration,
          timedOut,
        };

        this.history.add({
          command,
          timestamp: startTime,
          duration,
          exitCode,
          success: exitCode === 0,
        });

        resolve(result);
      });

      // 写入输入
      if (mergedConfig.input && child.stdin) {
        child.stdin.write(mergedConfig.input);
        child.stdin.end();
      }
    });
  }

  /**
   * 并行执行多个命令
   * 
   * @param commands 命令列表
   * @param config 执行配置
   * @returns 所有命令的执行结果
   * 
   * @example
   * ```typescript
   * const executor = new TerminalExecutor();
   * const results = await executor.execParallel(['git status', 'git pull']);
   * results.forEach((r, i) => console.log(`Command ${i}:`, r.exitCode));
   * ```
   */
  async execParallel(commands: string[], config?: ExecutionConfig): Promise<ExecutionResult[]> {
    const results = await Promise.allSettled(
      commands.map(cmd => this.exec(cmd, config))
    );

    return results.map(r => {
      if (r.status === 'fulfilled') {
        return r.value;
      } else {
        return {
          stdout: '',
          stderr: r.reason.stderr || '',
          exitCode: null,
          signal: null,
          duration: 0,
          timedOut: false,
          error: r.reason.message,
        };
      }
    });
  }

  /**
   * 顺序执行多个命令 (前一个成功后执行下一个)
   * 
   * @param commands 命令列表
   * @param config 执行配置
   * @param stopOnError 遇到错误是否停止 (默认 true)
   * @returns 所有命令的执行结果
   * 
   * @example
   * ```typescript
   * const executor = new TerminalExecutor();
   * const results = await executor.execSequential([
   *   'npm install',
   *   'npm run build',
   *   'npm test'
   * ]);
   * ```
   */
  async execSequential(
    commands: string[],
    config?: ExecutionConfig,
    stopOnError: boolean = true
  ): Promise<ExecutionResult[]> {
    const results: ExecutionResult[] = [];

    for (const cmd of commands) {
      try {
        const result = await this.exec(cmd, config);
        results.push(result);

        if (stopOnError && result.exitCode !== 0) {
          break;
        }
      } catch (error: any) {
        results.push({
          stdout: '',
          stderr: error.stderr || '',
          exitCode: null,
          signal: null,
          duration: 0,
          timedOut: false,
          error: error.message,
        });

        if (stopOnError) {
          break;
        }
      }
    }

    return results;
  }

  /**
   * 获取命令历史
   * 
   * @param limit 返回数量
   * @returns 历史记录
   */
  getHistory(limit: number = 10): CommandHistoryEntry[] {
    return this.history.get(limit);
  }

  /**
   * 获取历史统计
   */
  getHistoryStats(): {
    total: number;
    successCount: number;
    failCount: number;
    avgDuration: number;
  } {
    return this.history.getStats();
  }

  /**
   * 清空命令历史
   */
  clearHistory(): void {
    this.history.clear();
  }
}

// ============== 快捷函数 ==============

/**
 * 快速执行单个命令
 * 
 * @param command 命令
 * @param config 配置
 * @returns 执行结果
 */
export async function execCommand(
  command: string,
  config?: ExecutionConfig
): Promise<ExecutionResult> {
  const executor = new TerminalExecutor();
  return executor.exec(command, config);
}

/**
 * 快速流式执行命令
 * 
 * @param command 命令
 * @param config 配置
 * @returns 执行结果
 */
export async function execCommandStream(
  command: string,
  config?: StreamExecutionConfig
): Promise<ExecutionResult> {
  const executor = new TerminalExecutor();
  return executor.execStream(command, config);
}

// ============== 模块导出 ==============
// 注意：所有类、函数和类型已使用 export 关键字内联导出
// 此文件支持 ES6 模块导入
