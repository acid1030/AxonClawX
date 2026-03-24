/**
 * Queue Manager - 使用示例
 * 
 * 演示内存队列、优先级队列、延迟队列的使用方法
 */

import {
  MemoryQueue,
  PriorityQueue,
  DelayQueue,
  QueueManager,
  type PriorityItem,
  type DelayItem,
} from './queue-manager-skill';

// ============================================
// 示例 1: 基础内存队列 (FIFO)
// ============================================

console.log('\n=== 示例 1: 基础内存队列 ===\n');

const taskQueue = new MemoryQueue<string>({
  name: 'tasks',
  maxSize: 10,
});

// 入队
taskQueue.enqueue('Task 1: Setup project');
taskQueue.enqueue('Task 2: Write code');
taskQueue.enqueue('Task 3: Run tests');
taskQueue.enqueue('Task 4: Deploy');

console.log('队列长度:', taskQueue.size); // 4
console.log('队首任务:', taskQueue.peek()); // Task 1: Setup project

// 出队处理
while (!taskQueue.isEmpty()) {
  const task = taskQueue.dequeue();
  console.log('处理:', task);
}

// 统计信息
const stats = taskQueue.getStats();
console.log('统计:', stats);
// { enqueues: 4, dequeues: 4, size: 0, peakSize: 4, dropped: 0 }

// ============================================
// 示例 2: 优先级队列
// ============================================

console.log('\n=== 示例 2: 优先级队列 ===\n');

interface Task {
  id: number;
  name: string;
  assignee: string;
}

const priorityQueue = new PriorityQueue<Task>({
  name: 'urgent-tasks',
});

// 添加不同优先级的任务 (优先级数字越小越优先)
priorityQueue.enqueue({ id: 1, name: 'Fix critical bug', assignee: 'Alice' }, 1); // 最高优先级
priorityQueue.enqueue({ id: 2, name: 'Update documentation', assignee: 'Bob' }, 5); // 普通优先级
priorityQueue.enqueue({ id: 3, name: 'Add new feature', assignee: 'Charlie' }, 3); // 中等优先级
priorityQueue.enqueue({ id: 4, name: 'Security patch', assignee: 'Alice' }, 1); // 最高优先级

console.log('队列长度:', priorityQueue.size); // 4

// 按优先级出队
console.log('\n按优先级处理任务:');
while (!priorityQueue.isEmpty()) {
  const item = priorityQueue.dequeue();
  if (item) {
    console.log(`[优先级:${item.priority}] ${item.data.name} - ${item.data.assignee}`);
  }
}
// 输出顺序:
// [优先级:1] Fix critical bug - Alice
// [优先级:1] Security patch - Alice
// [优先级:3] Add new feature - Charlie
// [优先级:5] Update documentation - Bob

// 查看已排序的队列
const sortedItems = priorityQueue.toArray();
console.log('\n排序后的队列:', sortedItems.map(i => i.data.name));

// ============================================
// 示例 3: 延迟队列
// ============================================

console.log('\n=== 示例 3: 延迟队列 ===\n');

interface ScheduledTask {
  id: number;
  action: string;
}

const delayQueue = new DelayQueue<ScheduledTask>({
  name: 'scheduled-tasks',
  checkInterval: 500, // 每 500ms 检查一次
});

// 添加延迟任务
console.log('添加延迟任务...');
delayQueue.enqueueDelayed({ id: 1, action: 'Send reminder' }, 1000); // 1 秒后
delayQueue.enqueueDelayed({ id: 2, action: 'Backup data' }, 2000); // 2 秒后
delayQueue.enqueueDelayed({ id: 3, action: 'Sync database' }, 3000); // 3 秒后

// 立即添加一个任务
delayQueue.enqueue({ id: 4, action: 'Process now' });

console.log('队列长度:', delayQueue.size); // 4
console.log('下一个任务延迟:', delayQueue.getNextDelay(), 'ms');

// 获取已到期和未到期的任务
console.log('已到期任务:', delayQueue.getReadyItems().length);
console.log('未到期任务:', delayQueue.getPendingItems().length);

// 启动自动处理
console.log('\n启动自动处理...');
delayQueue.start(async (task) => {
  console.log(`[自动执行] ${task.action} (ID: ${task.id})`);
});

// 等待 4 秒后停止
setTimeout(() => {
  delayQueue.stop();
  console.log('\n自动处理已停止');
  console.log('剩余任务:', delayQueue.size);
}, 4000);

// ============================================
// 示例 4: 队列管理器 (统一管理)
// ============================================

console.log('\n=== 示例 4: 队列管理器 ===\n');

const manager = new QueueManager({
  defaultType: 'fifo',
  delayCheckInterval: 1000,
});

// 创建不同类型的队列
const emailQueue = manager.createQueue<string>('email-queue', 'fifo', 100);
const alertQueue = manager.createQueue<{ level: string; message: string }>('alerts', 'priority');
const scheduledQueue = manager.createQueue<{ task: string }>('scheduled', 'delay', 50);

// 使用队列
emailQueue.enqueue('Welcome email');
emailQueue.enqueue('Password reset');

alertQueue.enqueue({ level: 'info', message: 'System started' }, 5);
alertQueue.enqueue({ level: 'critical', message: 'CPU overload' }, 1);

scheduledQueue.enqueueDelayed({ task: 'Daily backup' }, 60000);

// 列出所有队列
console.log('所有队列:');
const queues = manager.listQueues();
queues.forEach(q => {
  console.log(`  - ${q.name} (${q.type}): ${q.size} 项`);
});

// 获取全局统计
const globalStats = manager.getStats();
console.log('\n全局统计:');
console.log('  总队列数:', globalStats.totalQueues);
console.log('  总项目数:', globalStats.totalItems);

// 获取特定队列
const emails = manager.getQueue<string>('email-queue');
if (emails) {
  console.log('\n处理邮件队列:');
  while (!emails.isEmpty()) {
    console.log('  发送:', emails.dequeue());
  }
}

// 删除队列
manager.deleteQueue('email-queue');
console.log('\n删除 email-queue 后:', manager.listQueues().length, '个队列');

// 清空所有队列
manager.clearAll();
console.log('清空所有队列后:', manager.getStats().totalItems, '项');

// ============================================
// 示例 5: 实际应用场景
// ============================================

console.log('\n=== 示例 5: 实际应用场景 ===\n');

// 场景 1: 消息通知系统
class NotificationSystem {
  private queue: PriorityQueue<{
    userId: string;
    message: string;
    channel: 'email' | 'sms' | 'push';
  }>;

  constructor() {
    this.queue = new PriorityQueue({
      name: 'notifications',
      maxSize: 1000,
    });
  }

  // 发送通知 (带优先级)
  send(userId: string, message: string, channel: 'email' | 'sms' | 'push', priority: number = 5) {
    const success = this.queue.enqueue({ userId, message, channel }, priority);
    if (!success) {
      console.warn('通知队列已满，丢弃通知');
    }
    return success;
  }

  // 处理通知
  async process() {
    const notification = this.queue.dequeue();
    if (!notification) return;

    console.log(`发送${notification.data.channel}通知给 ${notification.data.userId}: ${notification.data.message}`);
    // 实际发送逻辑...
  }
}

const notifier = new NotificationSystem();
notifier.send('user1', 'Welcome!', 'email', 5);
notifier.send('user2', 'Password reset required', 'sms', 1); // 高优先级
notifier.send('user3', 'New feature available', 'push', 3);

// 场景 2: 定时任务调度器
class TaskScheduler {
  private queue: DelayQueue<{
    taskId: string;
    handler: () => Promise<void>;
  }>;

  constructor() {
    this.queue = new DelayQueue({
      name: 'scheduler',
      checkInterval: 1000,
    });
  }

  // 调度任务
  schedule(taskId: string, handler: () => Promise<void>, delayMs: number) {
    return this.queue.enqueueDelayed({ taskId, handler }, delayMs);
  }

  // 启动调度器
  start() {
    this.queue.start(async (item) => {
      console.log(`执行任务: ${item.taskId}`);
      await item.handler();
    });
  }

  // 停止调度器
  stop() {
    this.queue.stop();
  }
}

const scheduler = new TaskScheduler();
scheduler.schedule('cleanup', async () => {
  console.log('执行清理任务...');
}, 5000);

scheduler.schedule('backup', async () => {
  console.log('执行备份任务...');
}, 10000);

scheduler.start();

// ============================================
// 示例 6: 错误处理与边界情况
// ============================================

console.log('\n=== 示例 6: 错误处理 ===\n');

// 队列已满的情况
const limitedQueue = new MemoryQueue<number>({
  name: 'limited',
  maxSize: 3,
});

console.log('入队 3 个元素:');
console.log('  入队 1:', limitedQueue.enqueue(1)); // true
console.log('  入队 2:', limitedQueue.enqueue(2)); // true
console.log('  入队 3:', limitedQueue.enqueue(3)); // true
console.log('  入队 4:', limitedQueue.enqueue(4)); // false (队列已满)

const stats = limitedQueue.getStats();
console.log('丢弃次数:', stats.dropped); // 1

// 空队列出队
const emptyQueue = new MemoryQueue<string>();
console.log('\n空队列出队:', emptyQueue.dequeue()); // undefined

// 优先级队列的稳定性 (相同优先级按入队顺序)
const stableQueue = new PriorityQueue<string>();
stableQueue.enqueue('First', 5);
stableQueue.enqueue('Second', 5);
stableQueue.enqueue('Third', 5);

console.log('\n相同优先级的稳定性:');
console.log('  出队 1:', stableQueue.dequeue()?.data); // First
console.log('  出队 2:', stableQueue.dequeue()?.data); // Second
console.log('  出队 3:', stableQueue.dequeue()?.data); // Third

// ============================================
// 性能测试
// ============================================

console.log('\n=== 性能测试 ===\n');

const perfQueue = new PriorityQueue<number>();
const count = 10000;

// 入队性能
const enqueueStart = Date.now();
for (let i = 0; i < count; i++) {
  perfQueue.enqueue(i, Math.floor(Math.random() * 10));
}
const enqueueTime = Date.now() - enqueueStart;

// 出队性能
const dequeueStart = Date.now();
while (!perfQueue.isEmpty()) {
  perfQueue.dequeue();
}
const dequeueTime = Date.now() - dequeueStart;

console.log(`${count} 个元素的性能:`);
console.log(`  入队时间: ${enqueueTime}ms`);
console.log(`  出队时间: ${dequeueTime}ms`);
console.log(`  平均入队: ${(enqueueTime / count).toFixed(3)}ms/个`);
console.log(`  平均出队: ${(dequeueTime / count).toFixed(3)}ms/个`);

console.log('\n=== 所有示例完成 ===\n');
