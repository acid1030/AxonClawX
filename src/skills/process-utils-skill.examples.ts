/**
 * KAEL 进程管理工具 - 使用示例
 * 
 * @author KAEL
 * @version 1.0.0
 */

import {
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
  
  // 进程终止
  killProcess,
  killProcessForce,
  killProcessGracefully,
  killProcessesByName,
} from './process-utils-skill';

// ==================== 示例 1: 同步执行命令 ====================

export function example1_syncExec() {
  console.log('=== 示例 1: 同步执行命令 ===\n');
  
  // 执行简单命令
  const result = execSyncCommand('echo "Hello from KAEL Process Utils"');
  console.log('输出:', result.stdout);
  console.log('执行时间:', result.duration, 'ms');
  
  // 执行带管道的命令
  const lsResult = execSyncCommand('ls -la | head -5');
  console.log('\n目录列表:');
  console.log(lsResult.stdout);
  
  // 执行失败的情况
  const errorResult = execSyncCommand('nonexistent_command');
  console.log('\n错误输出:', errorResult.stderr);
  console.log('退出码:', errorResult.exitCode);
}

// ==================== 示例 2: 异步执行命令 ====================

export async function example2_asyncExec() {
  console.log('\n=== 示例 2: 异步执行命令 ===\n');
  
  // 基本异步执行
  const result = await execAsync('sleep 1 && echo "Async completed"');
  console.log('输出:', result.stdout);
  console.log('执行时间:', result.duration, 'ms');
  
  // 带实时输出的执行
  console.log('\n带回调的执行:');
  await execAsync('for i in 1 2 3; do echo "Step $i"; sleep 0.5; done', {
    onStdout: (data) => {
      console.log('  [STDOUT]', data.trim());
    },
    onStderr: (data) => {
      console.log('  [STDERR]', data.trim());
    },
  } as any);
  
  // 带超时的执行
  console.log('\n超时测试 (2 秒超时):');
  const timeoutResult = await execAsync('sleep 5 && echo "Should not see this"', {
    timeout: 2000,
  });
  console.log('退出信号:', timeoutResult.signal);
}

// ==================== 示例 3: 生成后台进程 ====================

export function example3_spawnProcess() {
  console.log('\n=== 示例 3: 生成后台进程 ===\n');
  
  // 生成一个长期运行的进程
  const child = spawnProcess('node', ['-e', `
    let count = 0;
    const interval = setInterval(() => {
      console.log('Heartbeat:', count++);
      if (count >= 5) {
        clearInterval(interval);
        process.exit(0);
      }
    }, 500);
  `], {
    onStdout: (data) => {
      console.log('  [子进程]', data.trim());
    },
    onExit: (code, signal) => {
      console.log('  子进程退出：code=', code, ', signal=', signal);
    },
  });
  
  console.log('子进程 PID:', child.pid);
}

// ==================== 示例 4: 获取进程信息 ====================

export function example4_processInfo() {
  console.log('\n=== 示例 4: 获取进程信息 ===\n');
  
  // 获取当前进程信息
  const current = getProcessInfo(process.pid);
  if (current) {
    console.log('当前进程:');
    console.log('  PID:', current.pid);
    console.log('  名称:', current.name);
    console.log('  状态:', current.status);
    console.log('  启动时间:', current.startTime ? new Date(current.startTime).toISOString() : '未知');
  }
  
  // 检查进程是否存在
  console.log('\n进程存在性检查:');
  console.log('  PID 1 存在:', processExists(1));
  console.log('  PID 99999 存在:', processExists(99999));
}

// ==================== 示例 5: 监控进程资源 ====================

export function example5_processMonitor() {
  console.log('\n=== 示例 5: 监控进程资源 ===\n');
  
  // 监控当前进程
  const monitor = getProcessMonitor(process.pid);
  if (monitor) {
    console.log('当前进程资源使用:');
    console.log('  CPU:', monitor.cpuPercent.toFixed(2), '%');
    console.log('  内存:', monitor.memoryPercent.toFixed(2), '%');
    console.log('  RSS:', monitor.memoryRSS, 'KB');
    console.log('  状态:', monitor.status);
  }
}

// ==================== 示例 6: 列出和查找进程 ====================

export function example6_listProcesses() {
  console.log('\n=== 示例 6: 列出和查找进程 ===\n');
  
  // 列出所有进程 (前 10 个)
  const allProcesses = listProcesses();
  console.log('所有进程 (前 10 个):');
  allProcesses.slice(0, 10).forEach(proc => {
    console.log(`  ${proc.pid.toString().padEnd(8)} ${proc.name.padEnd(20)} ${proc.status}`);
  });
  
  // 查找特定名称的进程
  console.log('\n查找 "node" 进程:');
  const nodeProcesses = findProcessByName('node');
  nodeProcesses.forEach(proc => {
    console.log(`  PID: ${proc.pid}, 名称：${proc.name}, 状态：${proc.status}`);
  });
  
  console.log('找到', nodeProcesses.length, '个 node 进程');
}

// ==================== 示例 7: 终止进程 ====================

export async function example7_killProcess() {
  console.log('\n=== 示例 7: 终止进程 ===\n');
  
  // 生成一个测试进程
  const child = spawnProcess('sleep', ['10']);
  console.log('生成测试进程，PID:', child.pid);
  
  // 等待一下确保进程启动
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // 检查进程是否存在
  console.log('进程存在:', processExists(child.pid!));
  
  // 优雅终止
  console.log('优雅终止进程...');
  const success = await killProcessGracefully(child.pid!, 2000);
  console.log('终止成功:', success);
  
  // 再次检查
  console.log('进程存在:', processExists(child.pid!));
}

// ==================== 示例 8: 批量终止进程 ====================

export function example8_killProcessesByName() {
  console.log('\n=== 示例 8: 批量终止进程 ===\n');
  
  // 查找并终止所有 "sleep" 进程 (谨慎使用!)
  // 这里只是示例，实际执行会终止系统中的 sleep 进程
  console.log('查找 "sleep" 进程:');
  const sleepProcesses = findProcessByName('sleep');
  sleepProcesses.forEach(proc => {
    console.log(`  PID: ${proc.pid}`);
  });
  
  // 如果要终止，取消下面这行的注释
  // const count = killProcessesByName('sleep', true);
  // console.log('终止了', count, '个进程');
}

// ==================== 示例 9: 综合应用 - 进程管理器 ====================

export async function example9_processManager() {
  console.log('\n=== 示例 9: 综合应用 - 简易进程管理器 ===\n');
  
  class SimpleProcessManager {
    private processes: Map<number, { name: string; startTime: number }> = new Map();
    
    /**
     * 启动进程
     */
    async start(name: string, command: string, args: string[] = []) {
      const child = spawnProcess(command, args, {
        onExit: (code) => {
          console.log(`[${name}] 进程退出，code=${code}`);
          this.processes.delete(child.pid!);
        },
      });
      
      if (child.pid) {
        this.processes.set(child.pid, {
          name,
          startTime: Date.now(),
        });
        console.log(`[${name}] 进程启动，PID=${child.pid}`);
      }
      
      return child.pid;
    }
    
    /**
     * 停止进程
     */
    async stop(pid: number) {
      const proc = this.processes.get(pid);
      if (!proc) {
        console.log(`[PID:${pid}] 进程不存在`);
        return false;
      }
      
      console.log(`[${proc.name}] 正在停止...`);
      const success = await killProcessGracefully(pid, 5000);
      
      if (success) {
        this.processes.delete(pid);
        console.log(`[${proc.name}] 已停止`);
      } else {
        console.log(`[${proc.name}] 停止失败`);
      }
      
      return success;
    }
    
    /**
     * 查看所有进程
     */
    status() {
      console.log('\n=== 进程状态 ===');
      this.processes.forEach((info, pid) => {
        const runtime = Math.round((Date.now() - info.startTime) / 1000);
        console.log(`  PID:${pid} 名称:${info.name} 运行时间:${runtime}s`);
      });
    }
    
    /**
     * 停止所有进程
     */
    async stopAll() {
      const pids = Array.from(this.processes.keys());
      for (const pid of pids) {
        await this.stop(pid);
      }
    }
  }
  
  // 使用示例
  const manager = new SimpleProcessManager();
  
  // 启动几个测试进程
  await manager.start('test-1', 'sleep', ['30']);
  await manager.start('test-2', 'sleep', ['60']);
  
  // 查看状态
  manager.status();
  
  // 停止第一个进程
  const pids = Array.from(manager['processes'].keys());
  if (pids.length > 0) {
    await manager.stop(pids[0]);
  }
  
  // 再次查看状态
  manager.status();
  
  // 清理所有进程
  await manager.stopAll();
}

// ==================== 示例 10: 实用工具函数 ====================

export async function example10_utilities() {
  console.log('\n=== 示例 10: 实用工具函数 ===\n');
  
  // 检查端口是否被占用 (通过 lsof)
  console.log('检查端口 3000:');
  const portCheck = execSyncCommand('lsof -i :3000 2>/dev/null || echo "Port 3000 is free"');
  console.log(portCheck.stdout.trim());
  
  // 获取系统负载
  console.log('\n系统负载:');
  const uptime = execSyncCommand('uptime');
  console.log(uptime.stdout.trim());
  
  // 获取内存使用
  console.log('\n内存使用:');
  const memory = execSyncCommand('vm_stat 2>/dev/null || free -m 2>/dev/null || echo "Memory info not available"');
  console.log(memory.stdout.trim());
}

// ==================== 运行所有示例 ====================

export async function runAllExamples() {
  console.log('╔════════════════════════════════════════╗');
  console.log('║  KAEL Process Utils - 使用示例         ║');
  console.log('╚════════════════════════════════════════╝\n');
  
  try {
    example1_syncExec();
    await example2_asyncExec();
    example3_spawnProcess();
    example4_processInfo();
    example5_processMonitor();
    example6_listProcesses();
    await example7_killProcess();
    example8_killProcessesByName();
    await example9_processManager();
    await example10_utilities();
    
    console.log('\n╔════════════════════════════════════════╗');
    console.log('║  所有示例执行完成!                     ║');
    console.log('╚════════════════════════════════════════╝');
  } catch (error) {
    console.error('示例执行出错:', error);
  }
}

// 如果直接运行此文件
if (require.main === module) {
  runAllExamples();
}
