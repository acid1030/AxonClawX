/**
 * Worker 示例脚本 - KAEL
 * 
 * 演示如何创建和使用 Worker 线程
 */

import {
  createWorkerManager,
  createThreadPool,
  generateTaskId,
  WorkerStatus
} from './worker-utils-skill';
import * as path from 'path';

// ============================================
// 示例 Worker 脚本 (内联演示)
// ============================================

const WORKER_SCRIPT = `
const { parentPort } = require('worker_threads');

if (parentPort) {
  parentPort.on('message', async (message) => {
    const { type, id, task } = message;

    if (type === 'task') {
      try {
        const result = await processTask(task);
        
        parentPort.postMessage({
          type: 'result',
          id,
          data: result
        });
      } catch (error) {
        parentPort.postMessage({
          type: 'result',
          id,
          error: error.message
        });
      }
    }
  });
}

async function processTask(task) {
  switch (task.type) {
    case 'compute':
      return computeSum(task.payload.numbers);
    
    case 'fibonacci':
      return computeFibonacci(task.payload.n);
    
    case 'prime':
      return findPrimes(task.payload.max);
    
    case 'hash':
      return computeHash(task.payload.data);
    
    default:
      throw new Error('未知任务类型：' + task.type);
  }
}

function computeSum(numbers) {
  // 模拟 CPU 密集型计算
  let sum = 0;
  for (let i = 0; i < numbers.length; i++) {
    sum += numbers[i] * numbers[i];
  }
  return { result: sum, count: numbers.length };
}

function computeFibonacci(n) {
  if (n <= 1) return n;
  
  let a = 0, b = 1;
  for (let i = 2; i <= n; i++) {
    const temp = a + b;
    a = b;
    b = temp;
  }
  return { n, result: b };
}

function findPrimes(max) {
  const primes = [];
  
  for (let num = 2; num <= max; num++) {
    let isPrime = true;
    for (let i = 2; i <= Math.sqrt(num); i++) {
      if (num % i === 0) {
        isPrime = false;
        break;
      }
    }
    if (isPrime) {
      primes.push(num);
    }
  }
  
  return { max, count: primes.length, primes: primes.slice(0, 10) };
}

function computeHash(data) {
  // 简单的哈希计算
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return { hash, length: data.length };
}
`;

// ============================================
// 示例 1: 单 Worker 管理器
// ============================================

async function example1_SingleWorker() {
  console.log('\n=== 示例 1: 单 Worker 管理器 ===\n');

  // 注意：实际使用时需要创建独立的 Worker 脚本文件
  // 这里仅做演示
  console.log('1️⃣ 创建 Worker 管理器:');
  console.log(`
  const manager = createWorkerManager({
    workerPath: path.join(__dirname, 'example-worker.js'),
    name: 'compute-worker'
  });
  `);

  console.log('2️⃣ 监听 Worker 事件:');
  console.log(`
  manager.on('online', () => {
    console.log('✅ Worker 已上线');
  });

  manager.on('taskComplete', (result) => {
    console.log('✅ 任务完成:', result);
  });

  manager.on('error', (error) => {
    console.error('❌ 错误:', error);
  });
  `);

  console.log('3️⃣ 创建并执行任务:');
  console.log(`
  await manager.create();

  const result = await manager.sendTask({
    id: generateTaskId('compute'),
    type: 'compute',
    payload: {
      numbers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
    },
    timeoutMs: 5000
  });

  console.log('结果:', result);
  // 输出：{ result: 385, count: 10 }
  `);

  console.log('4️⃣ 终止 Worker:');
  console.log(`
  await manager.terminate();
  `);
}

// ============================================
// 示例 2: 线程池批量任务
// ============================================

async function example2_ThreadPool() {
  console.log('\n=== 示例 2: 线程池批量任务 ===\n');

  console.log('1️⃣ 创建线程池:');
  console.log(`
  const pool = createThreadPool({
    minWorkers: 2,           // 最小 2 个 Worker
    maxWorkers: 8,           // 最大 8 个 Worker
    idleTimeout: 60000,      // 空闲 60 秒后销毁
    taskTimeout: 300000,     // 任务超时 5 分钟
    workerPath: path.join(__dirname, 'example-worker.js')
  });
  `);

  console.log('2️⃣ 初始化线程池:');
  console.log(`
  await pool.initialize();
  console.log('线程池已初始化');
  `);

  console.log('3️⃣ 批量执行任务:');
  console.log(`
  // 创建 10 个计算任务
  const tasks = Array.from({ length: 10 }, (_, i) => ({
    id: generateTaskId('fib'),
    type: 'fibonacci',
    payload: { n: 20 + i }  // 计算第 20-29 项斐波那契数
  }));

  // 并发执行所有任务
  const results = await Promise.all(
    tasks.map(task => pool.executeTask(task))
  );

  // 打印结果
  results.forEach((result, i) => {
    if (result.success) {
      console.log(\`任务 \${i}: F(\${result.data.n}) = \${result.data.result}\`);
    } else {
      console.error(\`任务 \${i} 失败:\`, result.error);
    }
  });
  `);

  console.log('4️⃣ 查看线程池状态:');
  console.log(`
  const status = pool.getStatus();
  console.log('线程池状态:', {
    总 Worker 数：status.totalWorkers,
    空闲：status.idleWorkers,
    忙碌：status.busyWorkers,
    队列：status.queuedTasks
  });
  `);

  console.log('5️⃣ 关闭线程池:');
  console.log(`
  await pool.shutdown();
  `);
}

// ============================================
// 示例 3: 素数查找 (CPU 密集型)
// ============================================

async function example3_PrimeNumbers() {
  console.log('\n=== 示例 3: 素数查找 (CPU 密集型) ===\n');

  console.log('使用 Worker 线程处理 CPU 密集型任务，避免阻塞主线程:\n');

  console.log(`
  const pool = createThreadPool({
    minWorkers: 4,
    maxWorkers: 4,
    workerPath: path.join(__dirname, 'example-worker.js')
  });

  await pool.initialize();

  // 查找 1-10000 之间的素数
  const tasks = [
    { id: generateTaskId('prime1'), type: 'prime', payload: { max: 2500 } },
    { id: generateTaskId('prime2'), type: 'prime', payload: { max: 5000 } },
    { id: generateTaskId('prime3'), type: 'prime', payload: { max: 7500 } },
    { id: generateTaskId('prime4'), type: 'prime', payload: { max: 10000 } }
  ];

  const startTime = Date.now();
  const results = await Promise.all(
    tasks.map(task => pool.executeTask(task))
  );
  const endTime = Date.now();

  console.log(\`计算完成，耗时：\${endTime - startTime}ms\`);
  
  const lastResult = results[results.length - 1];
  if (lastResult.success) {
    console.log(\`1-10000 之间共有 \${lastResult.data.count} 个素数\`);
    console.log('前 10 个素数:', lastResult.data.primes);
  }

  await pool.shutdown();
  `);
}

// ============================================
// 示例 4: 错误处理与重试
// ============================================

async function example4_ErrorHandling() {
  console.log('\n=== 示例 4: 错误处理与重试 ===\n');

  console.log('1️⃣ 基本错误处理:');
  console.log(`
  try {
    const result = await manager.sendTask({
      id: generateTaskId(),
      type: 'unknown_type',  // 未知类型
      payload: {},
      timeoutMs: 5000
    });

    if (!result.success) {
      console.error('任务失败:', result.error);
      // 重试或降级处理
    }
  } catch (error) {
    console.error('Worker 异常:', error);
  }
  `);

  console.log('2️⃣ 自动重试机制:');
  console.log(`
  async function executeWithRetry(task, maxRetries = 3) {
    for (let i = 0; i < maxRetries; i++) {
      try {
        const result = await pool.executeTask(task);
        if (result.success) {
          return result;
        }
        console.log(\`任务失败，重试 \${i + 1}/\${maxRetries}\`);
      } catch (error) {
        console.log(\`Worker 异常，重试 \${i + 1}/\${maxRetries}\`, error);
      }
    }
    throw new Error('任务重试失败');
  }

  // 使用
  const result = await executeWithRetry({
    id: generateTaskId(),
    type: 'compute',
    payload: { numbers: [1, 2, 3] }
  });
  `);

  console.log('3️⃣ 超时处理:');
  console.log(`
  const result = await pool.executeTask({
    id: generateTaskId(),
    type: 'compute',
    payload: { numbers: Array(1000000).fill(1) },
    timeoutMs: 1000  // 1 秒超时
  });

  if (!result.success && result.error?.message.includes('超时')) {
    console.log('任务超时，使用降级方案');
    // 降级处理...
  }
  `);
}

// ============================================
// 示例 5: 动态扩展 Worker
// ============================================

async function example5_DynamicScaling() {
  console.log('\n=== 示例 5: 动态扩展 Worker ===\n');

  console.log('线程池会根据负载自动扩展和收缩:\n');

  console.log(`
  const pool = createThreadPool({
    minWorkers: 2,   // 保持最少 2 个 Worker
    maxWorkers: 10,  // 最多扩展到 10 个
    idleTimeout: 30000,  // 空闲 30 秒后销毁多余 Worker
    workerPath: path.join(__dirname, 'example-worker.js')
  });

  await pool.initialize();

  // 提交大量任务
  const tasks = Array.from({ length: 50 }, (_, i) => ({
    id: generateTaskId('task'),
    type: 'compute',
    payload: { numbers: [i, i + 1, i + 2] }
  }));

  // 线程池会自动创建更多 Worker 来处理任务
  const results = await Promise.all(
    tasks.map(task => pool.executeTask(task))
  );

  // 查看 Worker 数量变化
  console.log('线程池状态:', pool.getStatus());
  // 输出：{ totalWorkers: 10, idleWorkers: 10, busyWorkers: 0, queuedTasks: 0 }

  // 等待空闲超时后，Worker 数量会自动减少到 minWorkers
  setTimeout(() => {
    console.log('30 秒后状态:', pool.getStatus());
    // 输出：{ totalWorkers: 2, idleWorkers: 2, busyWorkers: 0, queuedTasks: 0 }
  }, 35000);

  await pool.shutdown();
  `);
}

// ============================================
// 主函数 - 运行所有示例
// ============================================

async function main() {
  console.log('╔════════════════════════════════════════╗');
  console.log('║   Worker 工具技能 - 使用示例          ║');
  console.log('╚════════════════════════════════════════╝');

  await example1_SingleWorker();
  await example2_ThreadPool();
  await example3_PrimeNumbers();
  await example4_ErrorHandling();
  await example5_DynamicScaling();

  console.log('\n╔════════════════════════════════════════╗');
  console.log('║   ✅ 所有示例展示完成!                ║');
  console.log('╚════════════════════════════════════════╝');

  console.log('\n📝 提示:');
  console.log('   - 实际使用时需要创建独立的 Worker 脚本文件');
  console.log('   - 参考 WORKER-README.md 获取详细文档');
  console.log('   - Worker 脚本路径示例：path.join(__dirname, "my-worker.js")');
  console.log('\n🎯 下一步:');
  console.log('   1. 创建 Worker 脚本文件');
  console.log('   2. 实现任务处理逻辑');
  console.log('   3. 使用 WorkerManager 或 ThreadPoolManager');
  console.log('   4. 监控和优化性能');
}

// 运行示例
main().catch(console.error);
