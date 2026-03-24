/**
 * Task Queue - 轻量级任务队列管理
 * 
 * 功能:
 * - 任务入队/出队
 * - 优先级排序 (P0 > P1 > P2)
 * - 状态追踪
 * - 过滤查询
 */

export interface Task {
  id: string;
  label: string;
  priority: 'P0' | 'P1' | 'P2';
  status: 'pending' | 'running' | 'done' | 'failed';
  assignedTo?: string;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  error?: string;
}

export interface TaskFilters {
  status?: Task['status'];
  priority?: Task['priority'];
  assignedTo?: string;
  label?: string;
}

export class TaskQueue {
  private tasks: Map<string, Task> = new Map();
  private pendingQueue: Task[] = [];

  /**
   * 优先级权重 (用于排序)
   */
  private priorityWeight: Record<Task['priority'], number> = {
    P0: 0,
    P1: 1,
    P2: 2,
  };

  /**
   * 添加任务到队列
   */
  enqueue(task: Omit<Task, 'createdAt'>): Task {
    const newTask: Task = {
      ...task,
      createdAt: Date.now(),
    };

    this.tasks.set(newTask.id, newTask);

    if (task.status === 'pending') {
      this.pendingQueue.push(newTask);
      this.sortPendingQueue();
    }

    return newTask;
  }

  /**
   * 获取下一个任务 (按优先级)
   */
  dequeue(): Task | null {
    if (this.pendingQueue.length === 0) {
      return null;
    }

    const task = this.pendingQueue.shift()!;
    task.status = 'running';
    task.startedAt = Date.now();
    this.tasks.set(task.id, task);

    return task;
  }

  /**
   * 查询任务状态
   */
  getStatus(id: string): Task | undefined {
    return this.tasks.get(id);
  }

  /**
   * 列表查询 (支持过滤)
   */
  list(filters?: TaskFilters): Task[] {
    let result = Array.from(this.tasks.values());

    if (filters) {
      if (filters.status) {
        result = result.filter(t => t.status === filters.status);
      }
      if (filters.priority) {
        result = result.filter(t => t.priority === filters.priority);
      }
      if (filters.assignedTo) {
        result = result.filter(t => t.assignedTo === filters.assignedTo);
      }
      if (filters.label) {
        result = result.filter(t => t.label.includes(filters.label!));
      }
    }

    // 默认按优先级 + 创建时间排序
    return result.sort((a, b) => {
      const priorityDiff = this.priorityWeight[a.priority] - this.priorityWeight[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return a.createdAt - b.createdAt;
    });
  }

  /**
   * 更新任务状态
   */
  updateStatus(id: string, status: Task['status'], error?: string): Task | null {
    const task = this.tasks.get(id);
    if (!task) return null;

    task.status = status;
    if (error) task.error = error;
    if (status === 'done' || status === 'failed') {
      task.completedAt = Date.now();
    }

    this.tasks.set(id, task);
    return task;
  }

  /**
   * 分配任务给执行者
   */
  assign(id: string, assignedTo: string): Task | null {
    const task = this.tasks.get(id);
    if (!task) return null;

    task.assignedTo = assignedTo;
    this.tasks.set(id, task);
    return task;
  }

  /**
   * 删除任务
   */
  delete(id: string): boolean {
    const task = this.tasks.get(id);
    if (!task) return false;

    // 从待处理队列中移除
    const idx = this.pendingQueue.findIndex(t => t.id === id);
    if (idx !== -1) {
      this.pendingQueue.splice(idx, 1);
    }

    return this.tasks.delete(id);
  }

  /**
   * 清空已完成/失败的任务
   */
  clearCompleted(): number {
    let count = 0;
    for (const [id, task] of this.tasks.entries()) {
      if (task.status === 'done' || task.status === 'failed') {
        this.tasks.delete(id);
        count++;
      }
    }
    return count;
  }

  /**
   * 获取队列统计
   */
  getStats(): {
    total: number;
    pending: number;
    running: number;
    done: number;
    failed: number;
    byPriority: Record<Task['priority'], number>;
  } {
    const stats = {
      total: this.tasks.size,
      pending: 0,
      running: 0,
      done: 0,
      failed: 0,
      byPriority: { P0: 0, P1: 0, P2: 0 },
    };

    for (const task of this.tasks.values()) {
      stats[task.status]++;
      stats.byPriority[task.priority]++;
    }

    return stats;
  }

  /**
   * 重新入队 (失败的任务)
   */
  requeue(id: string): Task | null {
    const task = this.tasks.get(id);
    if (!task) return null;

    task.status = 'pending';
    task.startedAt = undefined;
    task.completedAt = undefined;
    task.error = undefined;

    this.pendingQueue.push(task);
    this.sortPendingQueue();
    this.tasks.set(id, task);

    return task;
  }

  /**
   * 排序待处理队列 (P0 > P1 > P2, 同优先级按创建时间)
   */
  private sortPendingQueue(): void {
    this.pendingQueue.sort((a, b) => {
      const priorityDiff = this.priorityWeight[a.priority] - this.priorityWeight[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return a.createdAt - b.createdAt;
    });
  }
}

// ============ 使用示例 ============

/**
 * 示例 1: 基础队列操作
 */
function exampleBasicUsage() {
  const queue = new TaskQueue();

  // 添加任务
  queue.enqueue({
    id: 'task-1',
    label: '处理用户请求',
    priority: 'P1',
    status: 'pending',
  });

  queue.enqueue({
    id: 'task-2',
    label: '紧急修复',
    priority: 'P0',
    status: 'pending',
  });

  queue.enqueue({
    id: 'task-3',
    label: '日志清理',
    priority: 'P2',
    status: 'pending',
  });

  // 获取下一个任务 (应该是 P0 的 task-2)
  const next = queue.dequeue();
  console.log('Next task:', next?.label); // "紧急修复"

  // 查询状态
  const status = queue.getStatus('task-1');
  console.log('Task-1 status:', status?.status); // "pending"

  // 更新状态
  queue.updateStatus('task-2', 'done');

  // 列表查询
  const pending = queue.list({ status: 'pending' });
  console.log('Pending tasks:', pending.map(t => t.label));

  // 统计
  const stats = queue.getStats();
  console.log('Stats:', stats);
}

/**
 * 示例 2: 任务分配与执行
 */
function exampleTaskAssignment() {
  const queue = new TaskQueue();

  // 批量添加任务
  const tasks = [
    { id: 't1', label: '数据同步', priority: 'P0' as const, status: 'pending' as const },
    { id: 't2', label: '报表生成', priority: 'P1' as const, status: 'pending' as const },
    { id: 't3', label: '缓存清理', priority: 'P1' as const, status: 'pending' as const },
  ];

  tasks.forEach(t => queue.enqueue(t));

  // 分配给不同执行者
  queue.assign('t1', 'worker-A');
  queue.assign('t2', 'worker-B');

  // 查询某个执行者的任务
  const workerATasks = queue.list({ assignedTo: 'worker-A' });
  console.log('Worker A tasks:', workerATasks.map(t => t.label));

  // 模拟执行流程
  while (true) {
    const task = queue.dequeue();
    if (!task) break;

    console.log(`Processing: ${task.label} (${task.priority})`);
    
    // 模拟处理...
    queue.updateStatus(task.id, 'done');
  }
}

/**
 * 示例 3: 错误处理与重试
 */
function exampleErrorHandling() {
  const queue = new TaskQueue();

  queue.enqueue({
    id: 'fragile-task',
    label: '可能失败的任务',
    priority: 'P0',
    status: 'pending',
  });

  const task = queue.dequeue();
  if (task) {
    try {
      // 模拟执行...
      throw new Error('执行失败!');
    } catch (err) {
      queue.updateStatus(task.id, 'failed', (err as Error).message);
      console.log(`Task failed: ${task.label}`);

      // 重试逻辑
      const maxRetries = 3;
      let retries = 0;
      
      while (retries < maxRetries) {
        queue.requeue(task.id);
        retries++;
        console.log(`Retry ${retries}/${maxRetries}...`);
        
        const retryTask = queue.dequeue();
        if (retryTask) {
          // 再次尝试...
          queue.updateStatus(retryTask.id, 'done');
          break;
        }
      }
    }
  }
}

/**
 * 示例 4: 优先级验证
 */
function examplePriorityOrder() {
  const queue = new TaskQueue();

  // 乱序添加任务
  queue.enqueue({ id: '1', label: 'P2 任务', priority: 'P2', status: 'pending' });
  queue.enqueue({ id: '2', label: 'P0 任务', priority: 'P0', status: 'pending' });
  queue.enqueue({ id: '3', label: 'P1 任务', priority: 'P1', status: 'pending' });
  queue.enqueue({ id: '4', label: 'P0 任务 2', priority: 'P0', status: 'pending' });

  // 出队顺序应该是: P0 任务, P0 任务 2, P1 任务, P2 任务
  console.log('Dequeue order:');
  let task;
  while ((task = queue.dequeue())) {
    console.log(`  - ${task.label} (${task.priority})`);
  }
}

// 导出单例 (可选)
export const defaultQueue = new TaskQueue();

export default TaskQueue;
