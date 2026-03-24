/**
 * 终端命令执行技能测试 - Terminal Executor Skill Tests
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  TerminalExecutor,
  CommandHistory,
  execCommand,
  execCommandStream,
  type ExecutionConfig,
} from './terminal-executor-skill';

describe('TerminalExecutor', () => {
  let executor: TerminalExecutor;

  beforeEach(() => {
    executor = new TerminalExecutor();
  });

  describe('基础命令执行', () => {
    it('应该成功执行简单命令', async () => {
      const result = await executor.exec('echo "Hello World"');
      
      expect(result.exitCode).toBe(0);
      expect(result.stdout.trim()).toBe('Hello World');
      expect(result.stderr).toBe('');
      expect(result.timedOut).toBe(false);
      expect(result.duration).toBeGreaterThan(0);
    });

    it('应该捕获 stderr 输出', async () => {
      const result = await executor.exec('echo "Error message" >&2');
      
      expect(result.exitCode).toBe(0);
      expect(result.stderr.trim()).toBe('Error message');
    });

    it('应该返回非零退出码', async () => {
      const result = await executor.exec('exit 42', {
        ignoreError: true,
      });
      
      expect(result.exitCode).toBe(42);
      expect(result.success).toBe(false);
    });
  });

  describe('超时控制', () => {
    it('应该在超时后终止命令', async () => {
      const result = await executor.exec('sleep 10', {
        timeout: 1000, // 1 秒超时
        ignoreError: true,
      });
      
      expect(result.timedOut).toBe(true);
      expect(result.duration).toBeLessThan(3000);
    });

    it('应该在超时前完成快速命令', async () => {
      const result = await executor.exec('echo "fast"', {
        timeout: 5000,
      });
      
      expect(result.timedOut).toBe(false);
      expect(result.exitCode).toBe(0);
    });
  });

  describe('工作目录和环境变量', () => {
    it('应该在指定目录执行命令', async () => {
      const result = await executor.exec('pwd', {
        cwd: '/tmp',
      });
      
      expect(result.exitCode).toBe(0);
      expect(result.stdout.trim()).toBe('/tmp');
    });

    it('应该使用自定义环境变量', async () => {
      const result = await executor.exec('echo $TEST_VAR', {
        env: {
          ...process.env,
          TEST_VAR: 'custom_value',
        },
      });
      
      expect(result.exitCode).toBe(0);
      expect(result.stdout.trim()).toBe('custom_value');
    });
  });

  describe('流式执行', () => {
    it('应该实时捕获 stdout', async () => {
      const stdoutChunks: string[] = [];
      
      const result = await executor.execStream('echo "line1" && echo "line2"', {
        onStdout: (data) => {
          stdoutChunks.push(data.trim());
        },
      });
      
      expect(result.exitCode).toBe(0);
      expect(stdoutChunks.length).toBeGreaterThan(0);
    });

    it('应该实时捕获 stderr', async () => {
      const stderrChunks: string[] = [];
      
      const result = await executor.execStream('echo "error" >&2', {
        onStderr: (data) => {
          stderrChunks.push(data.trim());
        },
      });
      
      expect(result.exitCode).toBe(0);
      expect(stderrChunks.length).toBeGreaterThan(0);
    });

    it('应该报告进度', async () => {
      const progressUpdates: number[] = [];
      
      const result = await executor.execStream('seq 1 10', {
        onProgress: (progress) => {
          progressUpdates.push(progress.bytes);
        },
      });
      
      expect(result.exitCode).toBe(0);
      expect(progressUpdates.length).toBeGreaterThan(0);
      expect(progressUpdates[progressUpdates.length - 1]).toBeGreaterThan(0);
    });
  });

  describe('并行执行', () => {
    it('应该并行执行多个命令', async () => {
      const commands = ['echo "a"', 'echo "b"', 'echo "c"'];
      
      const results = await executor.execParallel(commands);
      
      expect(results.length).toBe(3);
      results.forEach((result, index) => {
        expect(result.exitCode).toBe(0);
        expect(result.stdout.trim()).toBe(String.fromCharCode(97 + index));
      });
    });

    it('应该处理并行执行中的错误', async () => {
      const commands = ['echo "ok"', 'exit 1', 'echo "also ok"'];
      
      const results = await executor.execParallel(commands, {
        ignoreError: true,
      });
      
      expect(results.length).toBe(3);
      expect(results[0].exitCode).toBe(0);
      expect(results[1].exitCode).toBe(1);
      expect(results[2].exitCode).toBe(0);
    });
  });

  describe('顺序执行', () => {
    it('应该顺序执行命令', async () => {
      const commands = ['echo "first"', 'echo "second"', 'echo "third"'];
      
      const results = await executor.execSequential(commands);
      
      expect(results.length).toBe(3);
      expect(results[0].stdout.trim()).toBe('first');
      expect(results[1].stdout.trim()).toBe('second');
      expect(results[2].stdout.trim()).toBe('third');
    });

    it('应该在错误时停止 (默认)', async () => {
      const commands = ['echo "ok"', 'exit 1', 'echo "should not run"'];
      
      const results = await executor.execSequential(commands, {}, true);
      
      expect(results.length).toBe(2);
      expect(results[0].exitCode).toBe(0);
      expect(results[1].exitCode).toBe(1);
    });

    it('应该继续执行即使有错误', async () => {
      const commands = ['echo "ok"', 'exit 1', 'echo "still runs"'];
      
      const results = await executor.execSequential(commands, {}, false);
      
      expect(results.length).toBe(3);
      expect(results[2].stdout.trim()).toBe('still runs');
    });
  });

  describe('命令历史', () => {
    it('应该记录命令历史', async () => {
      await executor.exec('echo "test1"');
      await executor.exec('echo "test2"');
      
      const history = executor.getHistory();
      
      expect(history.length).toBe(2);
      expect(history[0].command).toBe('echo "test2"');
      expect(history[1].command).toBe('echo "test1"');
    });

    it('应该限制历史记录数量', async () => {
      const limitedExecutor = new TerminalExecutor();
      
      for (let i = 0; i < 150; i++) {
        await limitedExecutor.exec(`echo "${i}"`);
      }
      
      const history = limitedExecutor.getHistory();
      expect(history.length).toBeLessThanOrEqual(100); // 默认最大值
    });

    it('应该提供历史统计', async () => {
      await executor.exec('echo "success"');
      await executor.exec('exit 1', { ignoreError: true });
      await executor.exec('echo "success2"');
      
      const stats = executor.getHistoryStats();
      
      expect(stats.total).toBe(3);
      expect(stats.successCount).toBe(2);
      expect(stats.failCount).toBe(1);
      expect(stats.avgDuration).toBeGreaterThan(0);
    });

    it('应该清空历史记录', async () => {
      await executor.exec('echo "test"');
      expect(executor.getHistory().length).toBe(1);
      
      executor.clearHistory();
      expect(executor.getHistory().length).toBe(0);
    });
  });

  describe('错误处理', () => {
    it('应该抛出错误 (默认)', async () => {
      await expect(executor.exec('exit 1')).rejects.toThrow();
    });

    it('应该忽略错误当配置时', async () => {
      const result = await executor.exec('exit 1', {
        ignoreError: true,
      });
      
      expect(result.exitCode).toBe(1);
      expect(result.error).toBeDefined();
    });

    it('应该捕获不存在的命令', async () => {
      const result = await executor.exec('nonexistent-command-xyz', {
        ignoreError: true,
      });
      
      expect(result.exitCode).not.toBe(0);
      expect(result.error).toBeDefined();
    });
  });

  describe('输入处理', () => {
    it('应该接受 stdin 输入', async () => {
      const result = await executor.exec('cat', {
        input: 'Hello from stdin',
      });
      
      expect(result.exitCode).toBe(0);
      expect(result.stdout.trim()).toBe('Hello from stdin');
    });
  });
});

describe('CommandHistory', () => {
  it('应该管理命令历史', () => {
    const history = new CommandHistory(5);
    
    history.add({ command: 'cmd1', timestamp: 1, duration: 10, exitCode: 0, success: true });
    history.add({ command: 'cmd2', timestamp: 2, duration: 20, exitCode: 0, success: true });
    history.add({ command: 'cmd3', timestamp: 3, duration: 30, exitCode: 1, success: false });
    
    expect(history.get().length).toBe(3);
    expect(history.get(2).length).toBe(2);
    expect(history.getStats().successCount).toBe(2);
    expect(history.getStats().failCount).toBe(1);
  });

  it('应该限制最大容量', () => {
    const history = new CommandHistory(3);
    
    for (let i = 0; i < 10; i++) {
      history.add({ command: `cmd${i}`, timestamp: i, duration: i * 10, exitCode: 0, success: true });
    }
    
    expect(history.get().length).toBe(3);
    expect(history.get()[0].command).toBe('cmd9');
  });
});

describe('快捷函数', () => {
  it('execCommand 应该工作', async () => {
    const result = await execCommand('echo "shortcut"');
    expect(result.exitCode).toBe(0);
    expect(result.stdout.trim()).toBe('shortcut');
  });

  it('execCommandStream 应该工作', async () => {
    const output: string[] = [];
    const result = await execCommandStream('echo "stream"', {
      onStdout: (data) => output.push(data.trim()),
    });
    
    expect(result.exitCode).toBe(0);
    expect(output.length).toBeGreaterThan(0);
  });
});

describe('实际场景', () => {
  it('应该执行 Git 命令', async () => {
    const result = await executor.exec('git --version', {
      ignoreError: true,
    });
    
    // Git 可能未安装，但命令应该执行
    expect(result.duration).toBeGreaterThan(0);
  });

  it('应该执行文件系统操作', async () => {
    const result = await executor.exec('ls -la /tmp');
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('total');
  });

  it('应该执行管道命令', async () => {
    const result = await executor.exec('echo "hello world" | wc -w');
    expect(result.exitCode).toBe(0);
    expect(result.stdout.trim()).toBe('2');
  });
});
