/**
 * Task Scheduler Lite - 极简任务调度器
 * 监听任务完成 → 自动分配新任务
 */

import { spawn } from 'child_process';
import { EventEmitter } from 'events';

// ============ 简单队列 ============
class SimpleQueue<T> {
  private items: T[] = [];

  enqueue(item: T): void {
    this.items.push(item);
  }

  dequeue(): T | undefined {
    return this.items.shift();
  }

  isEmpty(): boolean {
    return this.items.length === 0;
  }

  size(): number {
    return this.items.length;
  }
}

// ============ 任务接口 ============
interface Task {
  id: string;
  command: string;
  args?: string[];
  priority?: number;
}

// ============ 任务调度器 ============
class TaskScheduler {
  private queue: SimpleQueue<Task>;
  private activeTasks: Map<string, any>;
  private maxConcurrent: number;

  constructor(maxConcurrent: number = 3) {
    this.queue = new SimpleQueue<Task>();
    this.activeTasks = new Map();
    this.maxConcurrent = maxConcurrent;
  }

  // 添加任务到队列
  addTask(task: Task): void {
    this.queue.enqueue(task);
    console.log(`[Scheduler] Task queued: ${task.id}`);
    this.trySpawnNext();
  }

  // 尝试生成下一个任务
  trySpawnNext(): void {
    if (this.activeTasks.size >= this.maxConcurrent) {
      return;
    }

    const nextTask = this.queue.dequeue();
    if (nextTask) {
      this.spawn(nextTask);
    }
  }

  // 生成/启动任务
  spawn(task: Task): void {
    console.log(`[Scheduler] Spawning task: ${task.id}`);
    
    const child = spawn(task.command, task.args || [], {
      stdio: ['inherit', 'pipe', 'pipe'],
      shell: true,
    });

    this.activeTasks.set(task.id, child);

    child.stdout?.on('data', (data) => {
      console.log(`[${task.id}] ${data.toString().trim()}`);
    });

    child.stderr?.on('data', (data) => {
      console.error(`[${task.id}] ERROR: ${data.toString().trim()}`);
    });

    child.on('close', (code) => {
      console.log(`[Scheduler] Task ${task.id} completed with code ${code}`);
      this.activeTasks.delete(task.id);
      
      // 任务完成，触发调度
      this.onTaskCompleted(task);
    });

    child.on('error', (err) => {
      console.error(`[Scheduler] Task ${task.id} error:`, err);
      this.activeTasks.delete(task.id);
      this.onTaskCompleted(task);
    });
  }

  // 任务完成回调
  private onTaskCompleted(task: Task): void {
    // 尝试启动下一个任务
    this.trySpawnNext();
  }

  // 获取队列状态
  getStatus(): { queued: number; active: number } {
    return {
      queued: this.queue.size(),
      active: this.activeTasks.size,
    };
  }
}

// ============ 主程序 ============
const scheduler = new TaskScheduler(3);

// 监听来自父进程的 message
process.on('message', (msg: any) => {
  console.log('[Scheduler] Received message:', msg);

  // 处理任务完成信号
  if (typeof msg === 'string' && msg.includes('just completed')) {
    console.log('[Scheduler] Task completion detected, spawning next...');
    scheduler.trySpawnNext();
  }

  // 处理新任务添加
  if (msg?.type === 'ADD_TASK') {
    scheduler.addTask(msg.task);
  }

  // 处理状态查询
  if (msg?.type === 'GET_STATUS') {
    process.send?.({ type: 'STATUS', ...scheduler.getStatus() });
  }
});

// 监听标准输入 (可选：从 stdin 接收命令)
process.stdin.on('data', (data) => {
  const input = data.toString().trim();
  
  if (input === 'status') {
    console.log('[Scheduler] Status:', scheduler.getStatus());
  } else if (input.startsWith('add ')) {
    // 简单解析：add <id> <command>
    const parts = input.slice(4).split(' ');
    const id = parts[0];
    const command = parts.slice(1).join(' ');
    scheduler.addTask({ id, command });
  }
});

// 优雅退出
process.on('SIGINT', () => {
  console.log('[Scheduler] Shutting down...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('[Scheduler] Terminating...');
  process.exit(0);
});

// 启动日志
console.log('[Scheduler] Task Scheduler Lite started');
console.log('[Scheduler] Listening for messages and stdin commands');
console.log('[Scheduler] Commands: "add <id> <command>", "status"');
