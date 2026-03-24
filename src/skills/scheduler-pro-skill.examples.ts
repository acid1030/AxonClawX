/**
 * Scheduler Pro Skill - 使用示例
 * 
 * 展示专业调度器的各种使用场景：
 * 1. 基础任务调度
 * 2. 优先级调度
 * 3. 速率限制
 * 4. 任务监控
 * 5. 错误处理与重试
 * 
 * @author Axon (ACE Professional Scheduler)
 * @since 2026-03-13
 */

import {
  SchedulerPro,
  TaskPriority,
  TaskStatus,
  SchedulingStrategy,
  createFIFOScheduler,
  createPriorityScheduler,
  createRateLimitedScheduler,
} from './scheduler-pro-skill';

// ============================================
// 示例 1: 基础任务调度 (FIFO)
// ============================================

async function example1_BasicFIFO() {
  console.log('\n=== 示例 1: 基础 FIFO 调度 ===\n');

  const scheduler = createFIFOScheduler(2); // 最多 2 个并发任务

  // 监听事件
  scheduler.on('task:added', (task) => {
    console.log(`[事件] 任务添加：${task.name}`);
  });

  scheduler.on('task:started', (task) => {
    console.log(`[事件] 任务开始：${task.name}`);
  });

  scheduler.on('task:completed', (task, result) => {
    console.log(`[事件] 任务完成：${task.name}, 耗时：${result.duration}ms`);
  });

  // 添加任务
  for (let i = 1; i <= 5; i++) {
    scheduler.addTask({
      id: `task_${i}`,
      name: `基础任务 ${i}`,
      handler: async () => {
        console.log(`  → 执行任务 ${i}...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        return `任务 ${i} 完成`;
      },
    });
  }

  // 启动调度器
  scheduler.start();

  // 等待所有任务完成
  await new Promise(resolve => setTimeout(resolve, 5000));

  // 查看统计
  const stats = scheduler.getStats();
  console.log('\n统计信息:', stats);

  scheduler.stop();
}

// ============================================
// 示例 2: 优先级调度
// ============================================

async function example2_PriorityScheduling() {
  console.log('\n=== 示例 2: 优先级调度 ===\n');

  const scheduler = createPriorityScheduler(3);

  // 添加不同优先级的任务
  scheduler.addTask({
    id: 'low_1',
    name: '低优先级任务',
    priority: TaskPriority.LOW,
    handler: async () => {
      console.log('  → 执行低优先级任务');
      await new Promise(resolve => setTimeout(resolve, 500));
      return '低优先级完成';
    },
  });

  scheduler.addTask({
    id: 'critical_1',
    name: '🔴 关键任务',
    priority: TaskPriority.CRITICAL,
    handler: async () => {
      console.log('  → 执行关键任务');
      await new Promise(resolve => setTimeout(resolve, 500));
      return '关键任务完成';
    },
  });

  scheduler.addTask({
    id: 'normal_1',
    name: '普通任务',
    priority: TaskPriority.NORMAL,
    handler: async () => {
      console.log('  → 执行普通任务');
      await new Promise(resolve => setTimeout(resolve, 500));
      return '普通任务完成';
    },
  });

  scheduler.addTask({
    id: 'high_1',
    name: '高优先级任务',
    priority: TaskPriority.HIGH,
    handler: async () => {
      console.log('  → 执行高优先级任务');
      await new Promise(resolve => setTimeout(resolve, 500));
      return '高优先级完成';
    },
  });

  scheduler.start();

  await new Promise(resolve => setTimeout(resolve, 3000));

  scheduler.stop();
}

// ============================================
// 示例 3: 速率限制调度
// ============================================

async function example3_RateLimiting() {
  console.log('\n=== 示例 3: 速率限制调度 ===\n');

  // 限制为每秒最多 2 个任务
  const scheduler = createRateLimitedScheduler(2, 3);

  let executionTimes: number[] = [];

  for (let i = 1; i <= 6; i++) {
    scheduler.addTask({
      id: `rate_task_${i}`,
      name: `速率限制任务 ${i}`,
      handler: async () => {
        const time = Date.now();
        executionTimes.push(time);
        console.log(`  → 任务 ${i} 执行时间：${new Date(time).toISOString()}`);
        await new Promise(resolve => setTimeout(resolve, 100));
        return `任务 ${i}`;
      },
    });
  }

  scheduler.start();

  await new Promise(resolve => setTimeout(resolve, 5000));

  // 分析执行间隔
  console.log('\n执行间隔分析:');
  for (let i = 1; i < executionTimes.length; i++) {
    const interval = executionTimes[i] - executionTimes[i - 1];
    console.log(`  任务 ${i} → ${i + 1}: ${interval}ms`);
  }

  scheduler.stop();
}

// ============================================
// 示例 4: 任务监控与统计
// ============================================

async function example4_Monitoring() {
  console.log('\n=== 示例 4: 任务监控与统计 ===\n');

  const scheduler = new SchedulerPro({
    type: SchedulingStrategy.PRIORITY,
    maxConcurrent: 2,
  });

  // 添加多个任务
  for (let i = 1; i <= 10; i++) {
    scheduler.addTask({
      id: `monitor_task_${i}`,
      name: `监控任务 ${i}`,
      priority: i % 3 === 0 ? TaskPriority.HIGH : TaskPriority.NORMAL,
      handler: async () => {
        const duration = Math.random() * 1000 + 500;
        await new Promise(resolve => setTimeout(resolve, duration));
        return `任务 ${i} 完成`;
      },
    });
  }

  scheduler.start();

  // 定期输出统计
  const statsInterval = setInterval(() => {
    const stats = scheduler.getStats();
    console.log('\n[实时监控]');
    console.log(`  总任务数：${stats.totalTasks}`);
    console.log(`  进行中：${stats.runningTasks}`);
    console.log(`  等待中：${stats.pendingTasks}`);
    console.log(`  已完成：${stats.completedTasks}`);
    console.log(`  成功率：${stats.successRate.toFixed(1)}%`);
    console.log(`  吞吐量：${stats.throughput.toFixed(2)} 任务/秒`);
    console.log(`  平均耗时：${stats.avgExecutionTime.toFixed(0)}ms`);
  }, 1000);

  await new Promise(resolve => setTimeout(resolve, 8000));

  clearInterval(statsInterval);

  // 最终统计
  console.log('\n=== 最终统计 ===');
  const finalStats = scheduler.getStats();
  console.log(JSON.stringify(finalStats, null, 2));

  scheduler.stop();
}

// ============================================
// 示例 5: 错误处理与重试
// ============================================

async function example5_ErrorHandling() {
  console.log('\n=== 示例 5: 错误处理与重试 ===\n');

  const scheduler = createPriorityScheduler(2);
  let attemptCount = 0;

  scheduler.on('task:retry', (task, attempt) => {
    console.log(`[重试] 任务 ${task.name} 第 ${attempt} 次重试`);
  });

  scheduler.on('task:failed', (task, error) => {
    console.log(`[失败] 任务 ${task.name} 最终失败：${error.message}`);
  });

  // 添加一个会失败的任务
  scheduler.addTask({
    id: 'flaky_task',
    name: '不稳定任务',
    maxRetries: 3,
    handler: async () => {
      attemptCount++;
      console.log(`  → 尝试执行 (第 ${attemptCount} 次)`);
      
      if (attemptCount < 3) {
        throw new Error(`模拟失败 (尝试 ${attemptCount})`);
      }
      
      return '最终成功!';
    },
  });

  // 添加一个注定失败的任务
  scheduler.addTask({
    id: 'always_fail',
    name: '必败任务',
    maxRetries: 2,
    handler: async () => {
      throw new Error('这个任务总是会失败');
    },
  });

  scheduler.start();

  await new Promise(resolve => setTimeout(resolve, 5000));

  scheduler.stop();
}

// ============================================
// 示例 6: 任务取消
// ============================================

async function example6_TaskCancellation() {
  console.log('\n=== 示例 6: 任务取消 ===\n');

  const scheduler = createFIFOScheduler(1);

  scheduler.on('task:cancelled', (task) => {
    console.log(`[取消] 任务 ${task.name} 已被取消`);
  });

  // 添加长时间运行的任务
  scheduler.addTask({
    id: 'long_task_1',
    name: '长时间任务 1',
    handler: async () => {
      console.log('  → 任务 1 开始 (10 秒)');
      await new Promise(resolve => setTimeout(resolve, 10000));
      console.log('  → 任务 1 完成');
      return '任务 1 完成';
    },
  });

  scheduler.addTask({
    id: 'long_task_2',
    name: '长时间任务 2',
    handler: async () => {
      console.log('  → 任务 2 开始 (10 秒)');
      await new Promise(resolve => setTimeout(resolve, 10000));
      console.log('  → 任务 2 完成');
      return '任务 2 完成';
    },
  });

  scheduler.addTask({
    id: 'long_task_3',
    name: '长时间任务 3',
    handler: async () => {
      console.log('  → 任务 3 开始 (10 秒)');
      await new Promise(resolve => setTimeout(resolve, 10000));
      console.log('  → 任务 3 完成');
      return '任务 3 完成';
    },
  });

  scheduler.start();

  // 2 秒后取消任务 2
  setTimeout(() => {
    console.log('\n[操作] 取消任务 2...');
    const cancelled = scheduler.cancelTask('long_task_2');
    console.log(`取消结果：${cancelled ? '成功' : '失败'}`);
  }, 2000);

  await new Promise(resolve => setTimeout(resolve, 15000));

  scheduler.stop();
}

// ============================================
// 示例 7: 超时控制
// ============================================

async function example7_Timeout() {
  console.log('\n=== 示例 7: 超时控制 ===\n');

  const scheduler = createPriorityScheduler(2);

  scheduler.on('task:failed', (task, error) => {
    console.log(`[失败] 任务 ${task.name}: ${error.message}`);
  });

  // 添加一个会超时的任务
  scheduler.addTask({
    id: 'timeout_task',
    name: '超时任务',
    timeout: 2000, // 2 秒超时
    handler: async () => {
      console.log('  → 任务开始 (需要 5 秒)');
      await new Promise(resolve => setTimeout(resolve, 5000));
      console.log('  → 任务完成 (但实际上不会到这里)');
      return '不会返回这个结果';
    },
  });

  // 添加一个正常任务
  scheduler.addTask({
    id: 'normal_task',
    name: '正常任务',
    timeout: 5000,
    handler: async () => {
      console.log('  → 正常任务执行');
      await new Promise(resolve => setTimeout(resolve, 1000));
      return '正常完成';
    },
  });

  scheduler.start();

  await new Promise(resolve => setTimeout(resolve, 6000));

  scheduler.stop();
}

// ============================================
// 示例 8: 动态配置更新
// ============================================

async function example8_DynamicConfig() {
  console.log('\n=== 示例 8: 动态配置更新 ===\n');

  const scheduler = new SchedulerPro({
    type: SchedulingStrategy.FIFO,
    maxConcurrent: 1,
  });

  scheduler.on('task:started', (task) => {
    const stats = scheduler.getStats();
    console.log(`[任务开始] ${task.name}, 当前并发：${stats.runningTasks}`);
  });

  // 添加任务
  for (let i = 1; i <= 6; i++) {
    scheduler.addTask({
      id: `dynamic_task_${i}`,
      name: `动态任务 ${i}`,
      handler: async () => {
        await new Promise(resolve => setTimeout(resolve, 1000));
        return `任务 ${i}`;
      },
    });
  }

  scheduler.start();

  // 2 秒后增加并发数
  setTimeout(() => {
    console.log('\n[配置更新] 增加并发数到 3');
    scheduler.updateConfig({ maxConcurrent: 3 });
  }, 2000);

  await new Promise(resolve => setTimeout(resolve, 5000));

  scheduler.stop();
}

// ============================================
// 示例 9: 任务标签与元数据
// ============================================

async function example9_TagsAndMetadata() {
  console.log('\n=== 示例 9: 任务标签与元数据 ===\n');

  const scheduler = createPriorityScheduler(2);

  scheduler.addTask({
    id: 'tagged_task_1',
    name: '带标签的任务 1',
    tags: ['api', 'critical', 'user-facing'],
    metadata: {
      userId: 'user_123',
      requestId: 'req_456',
      environment: 'production',
    },
    handler: async () => {
      console.log('  → 执行带标签的任务');
      return '完成';
    },
  });

  scheduler.start();

  await new Promise(resolve => setTimeout(resolve, 2000));

  // 获取所有任务
  const allTasks = scheduler.getAllTasks();
  console.log('\n任务详情:');
  allTasks.forEach(task => {
    console.log(`  - ${task.name}`);
    console.log(`    标签：${task.tags?.join(', ')}`);
    console.log(`    元数据：${JSON.stringify(task.metadata)}`);
  });

  scheduler.stop();
}

// ============================================
// 示例 10: 实际应用场景 - API 请求批处理
// ============================================

async function example10_APIBatchProcessing() {
  console.log('\n=== 示例 10: API 请求批处理 ===\n');

  const scheduler = createRateLimitedScheduler(5, 3); // 每秒 5 个请求，最多 3 并发

  const apiEndpoints = [
    'https://api.example.com/users',
    'https://api.example.com/posts',
    'https://api.example.com/comments',
    'https://api.example.com/albums',
    'https://api.example.com/photos',
  ];

  scheduler.on('task:completed', (task, result) => {
    console.log(`[API 完成] ${task.name}: ${result.data?.status || 'success'}`);
  });

  // 模拟 API 请求
  apiEndpoints.forEach((url, index) => {
    scheduler.addTask({
      id: `api_${index}`,
      name: `API 请求 ${index + 1}`,
      priority: TaskPriority.NORMAL,
      timeout: 10000,
      metadata: { url, method: 'GET' },
      handler: async () => {
        console.log(`  → 请求：${url}`);
        // 模拟 API 调用
        await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));
        return { status: 'success', data: { id: index } };
      },
    });
  });

  scheduler.start();

  await new Promise(resolve => setTimeout(resolve, 5000));

  const stats = scheduler.getStats();
  console.log('\n批处理统计:');
  console.log(`  总请求数：${stats.totalTasks}`);
  console.log(`  成功数：${stats.completedTasks}`);
  console.log(`  失败数：${stats.failedTasks}`);
  console.log(`  平均响应时间：${stats.avgExecutionTime.toFixed(0)}ms`);

  scheduler.stop();
}

// ============================================
// 运行所有示例
// ============================================

async function runAllExamples() {
  console.log('╔════════════════════════════════════════╗');
  console.log('║  Scheduler Pro - 使用示例合集          ║');
  console.log('╚════════════════════════════════════════╝');

  const examples = [
    example1_BasicFIFO,
    example2_PriorityScheduling,
    example3_RateLimiting,
    example4_Monitoring,
    example5_ErrorHandling,
    example6_TaskCancellation,
    example7_Timeout,
    example8_DynamicConfig,
    example9_TagsAndMetadata,
    example10_APIBatchProcessing,
  ];

  for (const example of examples) {
    try {
      await example();
      await new Promise(resolve => setTimeout(resolve, 1000)); // 示例间间隔
    } catch (error) {
      console.error('示例执行失败:', error);
    }
  }

  console.log('\n╔════════════════════════════════════════╗');
  console.log('║  所有示例执行完成！                    ║');
  console.log('╚════════════════════════════════════════╝\n');
}

// 如果直接运行此文件
if (require.main === module) {
  runAllExamples().catch(console.error);
}

// 导出所有示例函数供单独测试
export {
  example1_BasicFIFO,
  example2_PriorityScheduling,
  example3_RateLimiting,
  example4_Monitoring,
  example5_ErrorHandling,
  example6_TaskCancellation,
  example7_Timeout,
  example8_DynamicConfig,
  example9_TagsAndMetadata,
  example10_APIBatchProcessing,
  runAllExamples,
};
