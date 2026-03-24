/**
 * Scheduler Utils Skill - 使用示例
 * 
 * 运行：uv run tsx scheduler-utils-examples.ts
 */

import { createScheduler, validateCron, getNextCronRun, CancellationToken } from './scheduler-utils-skill';

// ==================== 示例 1: 基础任务队列 ====================
async function example1_basicQueue() {
  console.log('\n=== 示例 1: 基础任务队列 ===\n');
  
  const scheduler = createScheduler({ maxConcurrent: 2 });
  
  const task1 = scheduler.add(async () => {
    console.log('  [Task 1] Starting...');
    await new Promise(r => setTimeout(r, 1000));
    console.log('  [Task 1] Completed');
  }, { name: 'task-1' });
  
  const task2 = scheduler.add(async () => {
    console.log('  [Task 2] Starting...');
    await new Promise(r => setTimeout(r, 500));
    console.log('  [Task 2] Completed');
  }, { name: 'task-2' });
  
  const task3 = scheduler.add(async () => {
    console.log('  [Task 3] Starting...');
    await new Promise(r => setTimeout(r, 800));
    console.log('  [Task 3] Completed');
  }, { name: 'task-3' });
  
  console.log('  Tasks added:', scheduler.getTasks().length);
  console.log('  Stats:', scheduler.getStats());
  
  await scheduler.waitForAll(5000);
  console.log('  Final stats:', scheduler.getStats());
  
  scheduler.clearFinished();
}

// ==================== 示例 2: 优先级队列 ====================
async function example2_priorityQueue() {
  console.log('\n=== 示例 2: 优先级队列 ===\n');
  
  const scheduler = createScheduler({ maxConcurrent: 1 });
  
  scheduler.add(async () => {
    console.log('  [Low] Executing...');
  }, { priority: 10, name: 'low-priority' });
  
  scheduler.add(async () => {
    console.log('  [Low 2] Executing...');
  }, { priority: 10, name: 'low-priority-2' });
  
  scheduler.add(async () => {
    console.log('  [HIGH] Executing first!');
  }, { priority: 1, name: 'high-priority' });
  
  scheduler.add(async () => {
    console.log('  [Medium] Executing...');
  }, { priority: 5, name: 'medium-priority' });
  
  await scheduler.waitForAll(3000);
  console.log('  执行顺序：High → Medium → Low → Low2');
}

// ==================== 示例 3: 定时任务 (Cron) ====================
async function example3_cronTasks() {
  console.log('\n=== 示例 3: 定时任务 (Cron) ===\n');
  
  const scheduler = createScheduler();
  
  // 验证 Cron 表达式
  console.log('  Validating Cron expressions:');
  console.log('  "* * * * *":', validateCron('* * * * *'));
  console.log('  "0 2 * * *":', validateCron('0 2 * * *'));
  console.log('  "*/5 * * * *":', validateCron('*/5 * * * *'));
  console.log('  "invalid":', validateCron('invalid'));
  
  // 获取下次执行时间
  console.log('\n  Next execution times:');
  console.log('  Every minute:', getNextCronRun('* * * * *').toISOString());
  console.log('  Daily 2AM:', getNextCronRun('0 2 * * *').toISOString());
  console.log('  Every 5 min:', getNextCronRun('*/5 * * * *').toISOString());
  
  // 注册一个快速执行的定时任务 (每分钟)
  let runCount = 0;
  scheduler.add(async () => {
    runCount++;
    console.log(`  [Cron] Heartbeat #${runCount}`);
    if (runCount >= 2) {
      scheduler.stop();
    }
  }, { cron: '* * * * *', name: 'heartbeat' });
  
  console.log('  Scheduled heartbeat task (will run twice then stop)');
}

// ==================== 示例 4: 延迟任务 ====================
async function example4_delayedTasks() {
  console.log('\n=== 示例 4: 延迟任务 ===\n');
  
  const scheduler = createScheduler();
  
  console.log('  Scheduling delayed tasks...');
  
  scheduler.add(async () => {
    console.log('  [Delayed 1] Executed after 1000ms');
  }, { delay: 1000, name: 'delayed-1s' });
  
  scheduler.add(async () => {
    console.log('  [Delayed 2] Executed after 500ms');
  }, { delay: 500, name: 'delayed-500ms' });
  
  scheduler.add(async () => {
    console.log('  [Delayed 3] Executed after 1500ms');
  }, { delay: 1500, name: 'delayed-1.5s' });
  
  await scheduler.waitForAll(3000);
  console.log('  All delayed tasks completed');
}

// ==================== 示例 5: 任务取消 ====================
async function example5_taskCancellation() {
  console.log('\n=== 示例 5: 任务取消 ===\n');
  
  const scheduler = createScheduler();
  
  const task = scheduler.add(async () => {
    const token = task.cancelToken;
    for (let i = 1; i <= 10; i++) {
      if (token?.cancelled) {
        console.log('  [Task] Cancelled at step', i);
        return;
      }
      console.log(`  [Task] Step ${i}/10`);
      await new Promise(r => setTimeout(r, 500));
    }
    console.log('  [Task] Completed normally');
  }, { name: 'long-running' });
  
  console.log('  Starting long-running task...');
  
  // 2.5 秒后取消
  setTimeout(() => {
    console.log('  Cancelling task...');
    scheduler.cancel(task.id);
  }, 2500);
  
  await scheduler.waitForTask(task.id, 5000);
  console.log('  Task status:', task.status);
}

// ==================== 示例 6: 重试机制 ====================
async function example6_retryMechanism() {
  console.log('\n=== 示例 6: 重试机制 ===\n');
  
  const scheduler = createScheduler();
  let attemptCount = 0;
  
  const task = scheduler.add(async () => {
    attemptCount++;
    console.log(`  [Retry Task] Attempt #${attemptCount}`);
    
    if (attemptCount < 3) {
      throw new Error(`Simulated failure #${attemptCount}`);
    }
    
    console.log('  [Retry Task] Success!');
  }, { retries: 3, name: 'retry-task' });
  
  await scheduler.waitForTask(task.id, 10000);
  console.log('  Final status:', task.status);
  console.log('  Total attempts:', attemptCount);
}

// ==================== 示例 7: 超时控制 ====================
async function example7_timeoutControl() {
  console.log('\n=== 示例 7: 超时控制 ===\n');
  
  const scheduler = createScheduler();
  
  const task = scheduler.add(async () => {
    console.log('  [Timeout Task] Starting...');
    await new Promise(r => setTimeout(r, 5000)); // 5 秒
    console.log('  [Timeout Task] Completed');
  }, { timeout: 2000, name: 'timeout-task' }); // 2 秒超时
  
  await scheduler.waitForTask(task.id, 5000);
  console.log('  Task status:', task.status);
  console.log('  Error:', task.error?.message);
}

// ==================== 示例 8: 批量任务管理 ====================
async function example8_batchProcessing() {
  console.log('\n=== 示例 8: 批量任务管理 ===\n');
  
  const scheduler = createScheduler({ maxConcurrent: 5 });
  
  console.log('  Adding 20 tasks...');
  
  for (let i = 1; i <= 20; i++) {
    scheduler.add(async () => {
      await new Promise(r => setTimeout(r, Math.random() * 500));
    }, { name: `batch-task-${i}`, priority: Math.ceil(Math.random() * 10) });
  }
  
  console.log('  Stats before:', scheduler.getStats());
  
  await scheduler.waitForAll(10000);
  
  console.log('  Stats after:', scheduler.getStats());
  console.log('  Cleared:', scheduler.clearFinished(), 'finished tasks');
}

// ==================== 示例 9: 取消令牌手动使用 ====================
async function example9_cancellationToken() {
  console.log('\n=== 示例 9: 取消令牌手动使用 ===\n');
  
  const token = CancellationToken.create();
  
  token.onCancel(() => {
    console.log('  [Listener 1] Token cancelled!');
  });
  
  token.onCancel(() => {
    console.log('  [Listener 2] Cleanup triggered');
  });
  
  console.log('  Token cancelled:', token.cancelled);
  console.log('  Registering listeners...');
  
  setTimeout(() => {
    console.log('  Cancelling token...');
    token.cancel();
  }, 1000);
  
  await new Promise(r => setTimeout(r, 1500));
  console.log('  Token cancelled:', token.cancelled);
}

// ==================== 示例 10: 任务状态查询 ====================
async function example10_taskStatusQuery() {
  console.log('\n=== 示例 10: 任务状态查询 ===\n');
  
  const scheduler = createScheduler({ maxConcurrent: 2 });
  
  scheduler.add(async () => {
    await new Promise(r => setTimeout(r, 2000));
  }, { name: 'task-a' });
  
  scheduler.add(async () => {
    await new Promise(r => setTimeout(r, 1000));
  }, { name: 'task-b' });
  
  scheduler.add(async () => {
    await new Promise(r => setTimeout(r, 3000));
  }, { name: 'task-c' });
  
  console.log('  All tasks:', scheduler.getTasks().map(t => t.name));
  console.log('  Pending:', scheduler.getTasksByStatus('pending').map(t => t.name));
  console.log('  Running:', scheduler.getTasksByStatus('running').map(t => t.name));
  
  await new Promise(r => setTimeout(r, 1500));
  
  console.log('\n  After 1.5s:');
  console.log('  Pending:', scheduler.getTasksByStatus('pending').map(t => t.name));
  console.log('  Running:', scheduler.getTasksByStatus('running').map(t => t.name));
  console.log('  Completed:', scheduler.getTasksByStatus('completed').map(t => t.name));
  
  await scheduler.waitForAll(5000);
}

// ==================== 主函数 ====================
async function main() {
  console.log('╔════════════════════════════════════════════╗');
  console.log('║  Scheduler Utils Skill - 使用示例          ║');
  console.log('║  ACE Task Scheduler                        ║');
  console.log('╚════════════════════════════════════════════╝');
  
  try {
    await example1_basicQueue();
    await example2_priorityQueue();
    await example3_cronTasks();
    await example4_delayedTasks();
    await example5_taskCancellation();
    await example6_retryMechanism();
    await example7_timeoutControl();
    await example8_batchProcessing();
    await example9_cancellationToken();
    await example10_taskStatusQuery();
    
    console.log('\n╔════════════════════════════════════════════╗');
    console.log('║  所有示例执行完成！                        ║');
    console.log('╚════════════════════════════════════════════╝\n');
  } catch (error) {
    console.error('Error:', error);
  }
}

// 运行示例
main();
