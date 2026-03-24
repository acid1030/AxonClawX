/**
 * 限流器工具技能 - 使用示例
 * 
 * 本文件包含 ConcurrencyLimiter 的完整使用示例
 */

import { 
  ConcurrencyLimiter, 
  createLimiter, 
  executeWithConcurrency,
  executeWithPriority,
  Priority 
} from './limiter-utils-skill';

// ==================== 示例 1: 基础并发控制 ====================

/**
 * 场景：批量抓取网页，限制并发数为 5
 */
export async function example1_basicConcurrency() {
  const limiter = new ConcurrencyLimiter({ concurrency: 5 });
  
  const urls = [
    'https://api.example.com/users/1',
    'https://api.example.com/users/2',
    'https://api.example.com/users/3',
    'https://api.example.com/users/4',
    'https://api.example.com/users/5',
    'https://api.example.com/users/6',
    'https://api.example.com/users/7',
    'https://api.example.com/users/8',
    'https://api.example.com/users/9',
    'https://api.example.com/users/10',
  ];
  
  console.log('开始抓取网页...');
  const start = Date.now();
  
  const results = await Promise.all(
    urls.map(url => 
      limiter.add(() => 
        fetch(url).then(res => res.json())
      )
    )
  );
  
  const duration = Date.now() - start;
  console.log(`完成 ${results.length} 个请求，耗时 ${duration}ms`);
  
  // 查看统计信息
  const stats = limiter.getStats();
  console.log('统计信息:', stats);
  
  return results;
}

// ==================== 示例 2: 优先级调度 ====================

/**
 * 场景：订单处理系统，VIP 订单优先处理
 */
export async function example2_priorityScheduling() {
  const limiter = new ConcurrencyLimiter({ concurrency: 2 });
  
  // 模拟订单处理函数
  const processOrder = (orderId: string, isVip: boolean) => {
    return new Promise<{ orderId: string; status: string }>((resolve) => {
      const delay = isVip ? 500 : 2000; // VIP 订单快速处理
      setTimeout(() => {
        resolve({ orderId, status: 'processed' });
      }, delay);
    });
  };
  
  console.log('开始处理订单...');
  
  // 添加普通订单
  limiter.add(() => processOrder('ORD-001', false), 'normal');
  limiter.add(() => processOrder('ORD-002', false), 'normal');
  
  // 添加 VIP 订单 (会插队)
  const vipResult = await limiter.add(
    () => processOrder('VIP-001', true), 
    'critical'
  );
  
  console.log('VIP 订单先完成:', vipResult);
  
  return vipResult;
}

// ==================== 示例 3: 任务超时控制 ====================

/**
 * 场景：调用第三方 API，设置超时保护
 */
export async function example3_timeoutControl() {
  const limiter = new ConcurrencyLimiter({ 
    concurrency: 3,
    timeout: 5000  // 5 秒超时
  });
  
  // 模拟慢速 API
  const slowApi = () => {
    return new Promise<string>((resolve, reject) => {
      setTimeout(() => {
        resolve('API 响应');
      }, 10000); // 10 秒后才返回
    });
  };
  
  console.log('调用慢速 API (5 秒超时)...');
  
  try {
    const result = await limiter.add(() => slowApi());
    console.log('API 调用成功:', result);
    return result;
  } catch (error) {
    console.error('API 调用超时:', (error as Error).message);
    return { error: 'timeout' };
  }
}

// ==================== 示例 4: 自动重试机制 ====================

/**
 * 场景：调用不稳定的服务，失败自动重试
 */
export async function example4_autoRetry() {
  const limiter = new ConcurrencyLimiter({
    concurrency: 3,
    autoRetry: true,      // 启用自动重试
    retryCount: 3,        // 最多重试 3 次
    retryDelay: 1000,     // 每次重试间隔 1 秒
  });
  
  let attemptCount = 0;
  
  // 模拟不稳定的服务 (前 2 次失败，第 3 次成功)
  const unstableService = () => {
    attemptCount++;
    return new Promise<string>((resolve, reject) => {
      setTimeout(() => {
        if (attemptCount < 3) {
          reject(new Error(`服务暂时不可用 (尝试 ${attemptCount}/${3})`));
        } else {
          resolve('服务响应成功');
        }
      }, 500);
    });
  };
  
  console.log('调用不稳定服务...');
  
  const result = await limiter.add(() => unstableService());
  
  console.log(`最终成功 (尝试 ${attemptCount} 次):`, result);
  
  return result;
}

// ==================== 示例 5: 任务取消 ====================

/**
 * 场景：用户取消长时间运行的任务
 */
export async function example5_taskCancellation() {
  const limiter = new ConcurrencyLimiter({ concurrency: 2 });
  
  // 模拟长时间任务
  const longRunningTask = () => {
    return new Promise<string>((resolve) => {
      console.log('任务开始执行...');
      setTimeout(() => {
        resolve('任务完成');
      }, 10000);
    });
  };
  
  console.log('启动长时间任务...');
  
  const resultPromise = limiter.add(() => longRunningTask());
  
  // 2 秒后取消任务
  setTimeout(() => {
    console.log('用户取消任务...');
    // 注意：这里需要任务 ID 才能取消，实际使用中需要保存 taskId
  }, 2000);
  
  try {
    const result = await resultPromise;
    console.log('任务结果:', result);
    return result;
  } catch (error) {
    console.error('任务被取消:', (error as Error).message);
    return { cancelled: true };
  }
}

// ==================== 示例 6: 批量执行工具函数 ====================

/**
 * 场景：使用便捷函数快速批量执行
 */
export async function example6_batchExecution() {
  // 模拟 20 个数据库查询
  const queries = Array.from({ length: 20 }, (_, i) => 
    () => new Promise<{ id: number; data: string }>((resolve) => {
      setTimeout(() => {
        resolve({ id: i, data: `Data ${i}` });
      }, 100 + Math.random() * 100);
    })
  );
  
  console.log('批量执行数据库查询 (并发数：5)...');
  const start = Date.now();
  
  const results = await executeWithConcurrency(queries, 5);
  
  const duration = Date.now() - start;
  console.log(`完成 ${results.length} 个查询，耗时 ${duration}ms`);
  
  return results;
}

// ==================== 示例 7: 优先级批处理 ====================

/**
 * 场景：消息通知系统，不同优先级消息分开处理
 */
export async function example7_priorityBatch() {
  // 模拟消息发送
  const sendMessage = (type: string, recipient: string) => {
    return new Promise<{ type: string; recipient: string; status: string }>((resolve) => {
      const delay = type === 'alert' ? 100 : 500;
      setTimeout(() => {
        resolve({ type, recipient, status: 'sent' });
      }, delay);
    });
  };
  
  console.log('批量发送消息...');
  
  const results = await executeWithPriority(
    {
      // 紧急告警 (立即发送)
      critical: [
        () => sendMessage('alert', 'admin@example.com'),
        () => sendMessage('alert', 'ops@example.com'),
      ],
      // 重要通知 (优先发送)
      high: [
        () => sendMessage('important', 'manager@example.com'),
      ],
      // 普通邮件 (正常发送)
      normal: [
        () => sendMessage('email', 'user1@example.com'),
        () => sendMessage('email', 'user2@example.com'),
        () => sendMessage('email', 'user3@example.com'),
      ],
      // 营销消息 (空闲时发送)
      low: [
        () => sendMessage('marketing', 'customer1@example.com'),
        () => sendMessage('marketing', 'customer2@example.com'),
      ],
    },
    3  // 3 个并发
  );
  
  console.log(`发送 ${results.length} 条消息`);
  
  return results;
}

// ==================== 示例 8: 实时监控 ====================

/**
 * 场景：监控限流器运行状态
 */
export async function example8_realtimeMonitoring() {
  const limiter = new ConcurrencyLimiter({ concurrency: 3 });
  
  // 添加 20 个任务
  const taskCount = 20;
  console.log(`添加 ${taskCount} 个任务...`);
  
  const promises = Array.from({ length: taskCount }, (_, i) => 
    limiter.add(async () => {
      // 模拟任务执行
      await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 500));
      return `Task ${i} completed`;
    })
  );
  
  // 定时打印统计信息
  const monitorInterval = setInterval(() => {
    const stats = limiter.getStats();
    const progress = ((stats.completed + stats.failed) / taskCount * 100).toFixed(1);
    
    console.log(`
      [进度] ${progress}%
      [运行] ${stats.running}
      [等待] ${stats.pending}
      [完成] ${stats.completed}
      [失败] ${stats.failed}
      [平均等待] ${stats.avgWaitTime.toFixed(0)}ms
      [平均执行] ${stats.avgExecTime.toFixed(0)}ms
    `);
    
    if (stats.completed + stats.failed >= taskCount) {
      clearInterval(monitorInterval);
      console.log('所有任务完成!');
    }
  }, 500);
  
  await Promise.all(promises);
  
  const finalStats = limiter.getStats();
  console.log('最终统计:', finalStats);
  
  return finalStats;
}

// ==================== 示例 9: 动态调整并发数 ====================

/**
 * 场景：根据系统负载动态调整并发数
 */
export async function example9_dynamicConcurrency() {
  const limiter = new ConcurrencyLimiter({ concurrency: 2 });
  
  console.log('初始并发数:', limiter.getConcurrency());
  
  // 模拟任务执行
  const tasks = Array.from({ length: 10 }, (_, i) => 
    () => new Promise<string>((resolve) => {
      setTimeout(() => resolve(`Task ${i}`), 500);
    })
  );
  
  // 添加前 5 个任务
  console.log('添加前 5 个任务...');
  const firstBatch = Promise.all(tasks.slice(0, 5).map(task => limiter.add(task)));
  
  // 1 秒后增加并发数
  setTimeout(() => {
    limiter.setConcurrency(5);
    console.log('增加到 5 个并发');
    
    // 添加后 5 个任务
    console.log('添加后 5 个任务...');
    const secondBatch = Promise.all(tasks.slice(5).map(task => limiter.add(task)));
  }, 1000);
  
  await firstBatch;
  
  return {
    finalConcurrency: limiter.getConcurrency(),
    stats: limiter.getStats(),
  };
}

// ==================== 示例 10: 错误处理最佳实践 ====================

/**
 * 场景：完善的错误处理和降级策略
 */
export async function example10_errorHandling() {
  const limiter = new ConcurrencyLimiter({
    concurrency: 3,
    timeout: 5000,
    autoRetry: true,
    retryCount: 2,
  });
  
  // 模拟可能失败的任务
  const riskyTask = (id: number) => {
    return new Promise<string>((resolve, reject) => {
      setTimeout(() => {
        if (Math.random() > 0.7) {
          reject(new Error(`Task ${id} failed`));
        } else {
          resolve(`Task ${id} success`);
        }
      }, 200);
    });
  };
  
  console.log('执行风险任务 (30% 失败率)...');
  
  const tasks = Array.from({ length: 10 }, (_, i) => i);
  
  const results = await Promise.all(
    tasks.map(id =>
      limiter.add(() => riskyTask(id))
        .catch(error => ({
          taskId: `error_${id}`,
          status: 'failed' as const,
          error,
          duration: 0,
          priority: 'normal' as const,
        }))
    )
  );
  
  const successCount = results.filter(r => r.status === 'completed').length;
  const failCount = results.filter(r => r.status === 'failed').length;
  
  console.log(`成功：${successCount}, 失败：${failCount}`);
  
  return {
    success: successCount,
    failed: failCount,
    total: results.length,
  };
}

// ==================== 示例 11: 文件批量下载 ====================

/**
 * 场景：批量下载文件，限制并发数避免带宽占用过高
 */
export async function example11_fileDownload() {
  const limiter = new ConcurrencyLimiter({ 
    concurrency: 3,
    timeout: 30000,
  });
  
  const files = [
    { url: 'https://example.com/file1.zip', name: 'file1.zip' },
    { url: 'https://example.com/file2.zip', name: 'file2.zip' },
    { url: 'https://example.com/file3.zip', name: 'file3.zip' },
    { url: 'https://example.com/file4.zip', name: 'file4.zip' },
    { url: 'https://example.com/file5.zip', name: 'file5.zip' },
  ];
  
  console.log('开始下载文件...');
  
  const downloadFile = (url: string, name: string) => {
    return new Promise<{ name: string; size: number }>((resolve, reject) => {
      console.log(`下载 ${name}...`);
      
      // 模拟下载
      setTimeout(() => {
        const size = Math.floor(Math.random() * 1000000);
        console.log(`${name} 下载完成 (${size} bytes)`);
        resolve({ name, size });
      }, 1000 + Math.random() * 2000);
    });
  };
  
  const results = await Promise.all(
    files.map(file =>
      limiter.add(() => downloadFile(file.url, file.name))
    )
  );
  
  const totalSize = results.reduce((sum, r) => sum + (r.result?.size || 0), 0);
  console.log(`总下载量：${totalSize} bytes`);
  
  return results;
}

// ==================== 示例 12: 数据库批量操作 ====================

/**
 * 场景：批量插入数据库记录，控制并发避免连接池耗尽
 */
export async function example12_databaseBatch() {
  const limiter = new ConcurrencyLimiter({ 
    concurrency: 5,
    timeout: 10000,
  });
  
  // 模拟 100 条记录
  const records = Array.from({ length: 100 }, (_, i) => ({
    id: i,
    name: `Record ${i}`,
    value: Math.random() * 1000,
  }));
  
  console.log('批量插入数据库记录...');
  const start = Date.now();
  
  const insertRecord = (record: typeof records[0]) => {
    return new Promise<{ id: number; status: string }>((resolve) => {
      // 模拟数据库插入
      setTimeout(() => {
        resolve({ id: record.id, status: 'inserted' });
      }, 50 + Math.random() * 50);
    });
  };
  
  const results = await Promise.all(
    records.map(record =>
      limiter.add(() => insertRecord(record))
    )
  );
  
  const duration = Date.now() - start;
  console.log(`插入 ${results.length} 条记录，耗时 ${duration}ms`);
  console.log(`平均速度：${(results.length / (duration / 1000)).toFixed(2)} 条/秒`);
  
  return results;
}

// ==================== 运行所有示例 ====================

/**
 * 运行指定示例
 * @param exampleNumber - 示例编号 (1-12)
 */
export async function runExample(exampleNumber: number) {
  const examples: Record<number, () => Promise<any>> = {
    1: example1_basicConcurrency,
    2: example2_priorityScheduling,
    3: example3_timeoutControl,
    4: example4_autoRetry,
    5: example5_taskCancellation,
    6: example6_batchExecution,
    7: example7_priorityBatch,
    8: example8_realtimeMonitoring,
    9: example9_dynamicConcurrency,
    10: example10_errorHandling,
    11: example11_fileDownload,
    12: example12_databaseBatch,
  };
  
  const example = examples[exampleNumber];
  if (!example) {
    throw new Error(`示例 ${exampleNumber} 不存在`);
  }
  
  console.log(`\n${'='.repeat(60)}`);
  console.log(`运行示例 ${exampleNumber}`);
  console.log('='.repeat(60));
  
  return await example();
}

// ==================== 主函数 (测试用) ====================

async function main() {
  console.log('限流器工具技能 - 使用示例\n');
  
  // 运行示例 1: 基础并发控制
  await runExample(1);
  
  // 运行示例 2: 优先级调度
  await runExample(2);
  
  // 运行示例 6: 批量执行
  await runExample(6);
  
  console.log('\n所有示例运行完成!');
}

// 导出所有示例函数
export {
  example1_basicConcurrency,
  example2_priorityScheduling,
  example3_timeoutControl,
  example4_autoRetry,
  example5_taskCancellation,
  example6_batchExecution,
  example7_priorityBatch,
  example8_realtimeMonitoring,
  example9_dynamicConcurrency,
  example10_errorHandling,
  example11_fileDownload,
  example12_databaseBatch,
  runExample,
};

// 如果直接运行此文件，执行主函数
if (typeof require !== 'undefined' && require.main === module) {
  main().catch(console.error);
}

export default ConcurrencyLimiter;
