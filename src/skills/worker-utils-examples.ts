/**
 * Worker 工具技能使用示例
 * 
 * 演示如何使用 Web Worker 线程池进行任务分发和结果聚合
 */

import {
  WorkerPool,
  createWorkerPool,
  runWorkerTasks,
  createWorkerBlobUrl,
  createMultiHandlerWorkerUrl,
  aggregateResults,
  ResultAggregator,
  WorkerUtils,
} from './worker-utils-skill';

// ==================== 示例 1: 基础用法 ====================

/**
 * 示例 1: 最简单的使用方式
 * 使用 createWorkerBlobUrl 快速创建 Worker，然后执行任务
 */
export async function example1_basic() {
  // 1. 创建 Worker 脚本 (计算数字平方)
  const workerUrl = createWorkerBlobUrl<number, number>(
    (data) => {
      // 在 Worker 中执行，不阻塞主线程
      return data * data;
    }
  );

  // 2. 创建线程池
  const pool = await createWorkerPool({
    scriptUrl: workerUrl,
    workerCount: 4, // 4 个 Worker
    debug: true,    // 启用调试日志
  });

  // 3. 分发任务
  const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const results = await Promise.all(
    numbers.map(n => pool.dispatch<number, number>(n))
  );

  console.log('Results:', results.map(r => r.result));
  // 输出：[1, 4, 9, 16, 25, 36, 49, 64, 81, 100]

  // 4. 查看统计信息
  const stats = pool.getStats();
  console.log('Pool stats:', stats);

  // 5. 销毁线程池
  await pool.destroy();
}

// ==================== 示例 2: 批量任务处理 ====================

/**
 * 示例 2: 批量处理大量数据
 * 使用 dispatchBatch 一次性分发多个任务
 */
export async function example2_batch() {
  // 创建处理图像的 Worker
  const workerUrl = createWorkerBlobUrl<{ width: number; height: number; data: number[] }, number[]>(
    async (imageData) => {
      // 模拟图像处理 (例如：计算亮度)
      const { data } = imageData;
      let totalBrightness = 0;
      
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        // 亮度公式
        totalBrightness += 0.299 * r + 0.587 * g + 0.114 * b;
      }
      
      return totalBrightness / (data.length / 4);
    }
  );

  const pool = await createWorkerPool({
    scriptUrl: workerUrl,
    workerCount: navigator.hardwareConcurrency || 4,
    maxTasksPerWorker: 2, // 每个 Worker 最多同时处理 2 个任务
  });

  // 模拟 100 张图像
  const images = Array.from({ length: 100 }, (_, i) => ({
    width: 1920,
    height: 1080,
    data: new Array(1920 * 1080 * 4).fill(0).map(() => Math.random() * 255),
  }));

  // 批量分发任务
  const results = await pool.dispatchBatch(images, 'process-image');

  // 聚合结果 (只取成功的)
  const brightnessValues = aggregateResults<number[]>(results, {
    skipErrors: true,
    transform: (r) => r.result!,
  });

  console.log('Average brightness:', brightnessValues);

  await pool.destroy();
}

// ==================== 示例 3: 多类型任务处理 ====================

/**
 * 示例 3: 处理多种类型的任务
 * 使用 createMultiHandlerWorkerUrl 创建支持多种任务类型的 Worker
 */
export async function example3_multiType() {
  // 创建支持多种任务类型的 Worker
  const workerUrl = createMultiHandlerWorkerUrl({
    // 类型 1: 数学计算
    'compute': (data: { operation: string; a: number; b: number }) => {
      switch (data.operation) {
        case 'add': return data.a + data.b;
        case 'multiply': return data.a * data.b;
        case 'power': return Math.pow(data.a, data.b);
        default: throw new Error('Unknown operation');
      }
    },

    // 类型 2: 字符串处理
    'transform': (data: { text: string; operation: string }) => {
      switch (data.operation) {
        case 'uppercase': return data.text.toUpperCase();
        case 'lowercase': return data.text.toLowerCase();
        case 'reverse': return data.text.split('').reverse().join('');
        default: throw new Error('Unknown operation');
      }
    },

    // 类型 3: 数据分析
    'analyze': (data: number[]) => {
      const sum = data.reduce((a, b) => a + b, 0);
      const avg = sum / data.length;
      const min = Math.min(...data);
      const max = Math.max(...data);
      return { sum, avg, min, max };
    },
  });

  const pool = await createWorkerPool({
    scriptUrl: workerUrl,
    workerCount: 3,
    debug: true,
  });

  // 分发不同类型的任务
  const [mathResult, textResult, analyzeResult] = await Promise.all([
    pool.dispatch({ operation: 'add', a: 10, b: 20 }, 'compute'),
    pool.dispatch({ text: 'Hello World', operation: 'uppercase' }, 'transform'),
    pool.dispatch([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 'analyze'),
  ]);

  console.log('Math result:', mathResult.result);        // 30
  console.log('Text result:', textResult.result);        // "HELLO WORLD"
  console.log('Analyze result:', analyzeResult.result);  // { sum: 55, avg: 5.5, min: 1, max: 10 }

  await pool.destroy();
}

// ==================== 示例 4: 优先级任务调度 ====================

/**
 * 示例 4: 使用优先级调度任务
 * 高优先级任务会先执行
 */
export async function example4_priority() {
  const workerUrl = createWorkerBlobUrl<number, number>(
    async (data) => {
      // 模拟耗时任务
      await new Promise(resolve => setTimeout(resolve, 100));
      return data * 2;
    }
  );

  const pool = await createWorkerPool({
    scriptUrl: workerUrl,
    workerCount: 2, // 只有 2 个 Worker，会产生队列
    maxTasksPerWorker: 1,
  });

  // 分发不同优先级的任务 (数字越小优先级越高)
  const tasks = [
    { id: 1, priority: 5, data: 1 },   // 普通优先级
    { id: 2, priority: 1, data: 2 },   // 最高优先级
    { id: 3, priority: 3, data: 3 },   // 中等优先级
    { id: 4, priority: 10, data: 4 },  // 低优先级
    { id: 5, priority: 1, data: 5 },   // 最高优先级
  ];

  // 按优先级分发
  const promises = tasks.map(t => 
    pool.dispatch<number, number>(t.data, undefined, t.priority)
  );

  const results = await Promise.all(promises);
  
  // 结果会按照任务完成的顺序，但执行顺序是按优先级
  console.log('Results:', results.map(r => r.result));

  await pool.destroy();
}

// ==================== 示例 5: 自动扩缩容 ====================

/**
 * 示例 5: 启用自动扩缩容
 * 根据任务负载自动增加或减少 Worker 数量
 */
export async function example5_autoScale() {
  const workerUrl = createWorkerBlobUrl<number, number>(
    async (data) => {
      await new Promise(resolve => setTimeout(resolve, 500));
      return data * data;
    }
  );

  const pool = await createWorkerPool({
    scriptUrl: workerUrl,
    workerCount: 2,           // 初始 2 个 Worker
    minWorkers: 1,            // 最少保留 1 个
    maxWorkers: 8,            // 最多 8 个
    autoScale: true,          // 启用自动扩缩容
    idleTimeout: 5000,        // 空闲 5 秒后销毁 Worker
    debug: true,
  });

  // 大量任务会触发自动扩容
  const tasks = Array.from({ length: 20 }, (_, i) => i + 1);
  
  console.log('Initial workers:', pool.getStats().totalWorkers);

  // 分发所有任务
  const dispatchPromise = pool.dispatchBatch(tasks);

  // 监控 Worker 数量变化
  const monitor = setInterval(() => {
    const stats = pool.getStats();
    console.log(`Workers: ${stats.totalWorkers} | Pending: ${stats.pendingTasks} | Running: ${stats.runningTasks}`);
  }, 500);

  await dispatchPromise;

  clearInterval(monitor);

  // 等待 Worker 自动缩容
  await new Promise(resolve => setTimeout(resolve, 10000));
  console.log('Final workers:', pool.getStats().totalWorkers);

  await pool.destroy();
}

// ==================== 示例 6: 流式结果处理 ====================

/**
 * 示例 6: 使用 ResultAggregator 流式处理结果
 * 适用于处理海量数据，避免内存溢出
 */
export async function example6_streaming() {
  const workerUrl = createWorkerBlobUrl<number, number>(
    (data) => data * 2
  );

  const pool = await createWorkerPool({
    scriptUrl: workerUrl,
    workerCount: 4,
  });

  // 创建聚合器 (每 100 个结果处理一次)
  const aggregator = new ResultAggregator<number>(100, async (batch) => {
    console.log(`Processing batch of ${batch.length} results...`);
    // 在这里处理批次结果，例如写入数据库、发送到服务器等
    await new Promise(resolve => setTimeout(resolve, 10)); // 模拟处理
  });

  // 处理 1000 个任务
  const totalTasks = 1000;
  const promises = Array.from({ length: totalTasks }, (_, i) =>
    pool.dispatch<number, number>(i).then(result => {
      aggregator.add(result);
      return result;
    })
  );

  await Promise.all(promises);

  // 处理剩余的结果
  const remaining = aggregator.drain();
  console.log(`Remaining results: ${remaining.length}`);

  await pool.destroy();
}

// ==================== 示例 7: 错误处理与重试 ====================

/**
 * 示例 7: 错误处理和结果过滤
 */
export async function example7_errorHandling() {
  // 创建可能失败的 Worker
  const workerUrl = createWorkerBlobUrl<number, number>(
    async (data) => {
      if (data === 5) {
        throw new Error('Task 5 failed intentionally');
      }
      return data * 2;
    }
  );

  const pool = await createWorkerPool({
    scriptUrl: workerUrl,
    workerCount: 2,
    taskTimeout: 5000,
  });

  const tasks = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const results = await pool.dispatchBatch(tasks);

  // 方式 1: 跳过失败的任务
  const successResults = aggregateResults<number>(results, {
    skipErrors: true,
    transform: (r) => r.result!,
  });
  console.log('Success only:', successResults);
  // 输出：[2, 4, 6, 8, 10, 12, 14, 16, 18, 20] (不包括 5 的结果)

  // 方式 2: 保留所有结果，包括错误
  const allResults = aggregateResults(results, {
    skipErrors: false,
  });
  
  allResults.forEach(r => {
    if (r.success) {
      console.log(`Task ${r.taskId} succeeded: ${r.result}`);
    } else {
      console.error(`Task ${r.taskId} failed: ${r.error}`);
    }
  });

  await pool.destroy();
}

// ==================== 示例 8: 使用 WorkerUtils 类 ====================

/**
 * 示例 8: 使用 WorkerUtils 工具类
 * 所有功能打包在一个类中
 */
export async function example8_utilsClass() {
  // 使用类方法创建 Worker URL
  const workerUrl = WorkerUtils.createWorkerBlobUrl<number, number>(
    (data) => data + 10
  );

  // 使用类方法创建线程池
  const pool = await WorkerUtils.createWorkerPool({
    scriptUrl: workerUrl,
    workerCount: 3,
  });

  // 使用类方法执行批量任务
  const results = await WorkerUtils.runWorkerTasks(
    [1, 2, 3, 4, 5],
    workerUrl,
    { workerCount: 2 }
  );

  console.log('Results:', results);

  // 使用类方法聚合结果
  const values = WorkerUtils.aggregateResults<number>(results, {
    transform: (r) => r.result!,
  });

  console.log('Values:', values);

  await pool.destroy();
}

// ==================== 示例 9: 实际应用场景 - 图片缩略图生成 ====================

/**
 * 示例 9: 实际应用 - 批量生成图片缩略图
 */
export async function example9_thumbnailGeneration() {
  // 创建处理图片的 Worker
  const workerUrl = createWorkerBlobUrl<{ src: string; width: number; height: number }, string>(
    async (imageData) => {
      // 在实际应用中，这里会使用 Canvas API 处理图片
      // 由于 Worker 中无法直接访问 DOM，需要使用 OffscreenCanvas
      
      // 模拟图片处理
      await new Promise(resolve => setTimeout(resolve, 100));
      
      return `thumbnail_${imageData.src}`;
    }
  );

  const pool = await createWorkerPool({
    scriptUrl: workerUrl,
    workerCount: 4,
    maxTasksPerWorker: 2,
  });

  // 模拟 50 张图片
  const images = Array.from({ length: 50 }, (_, i) => ({
    src: `image_${i}.jpg`,
    width: 200,
    height: 200,
  }));

  console.log('Generating thumbnails...');
  const startTime = Date.now();

  const results = await pool.dispatchBatch(images);
  
  const thumbnails = aggregateResults<string>(results, {
    skipErrors: true,
    transform: (r) => r.result!,
  });

  const duration = Date.now() - startTime;
  console.log(`Generated ${thumbnails.length} thumbnails in ${duration}ms`);

  const stats = pool.getStats();
  console.log(`Throughput: ${stats.throughput.toFixed(2)} tasks/s`);

  await pool.destroy();
}

// ==================== 示例 10: 实际应用场景 - 数据加密/解密 ====================

/**
 * 示例 10: 实际应用 - 批量数据加密
 */
export async function example10_encryption() {
  // 创建加密 Worker
  const workerUrl = createWorkerBlobUrl<{ data: string; key: string }, string>(
    async (payload) => {
      // 使用 Web Crypto API 进行加密 (在 Worker 中执行，不阻塞 UI)
      const encoder = new TextEncoder();
      const data = encoder.encode(payload.data);
      const keyData = encoder.encode(payload.key);
      
      // 简单的 XOR 加密示例 (实际应使用更安全的算法)
      const encrypted = new Uint8Array(data.length);
      for (let i = 0; i < data.length; i++) {
        encrypted[i] = data[i] ^ keyData[i % keyData.length];
      }
      
      // 转换为 Base64
      return btoa(String.fromCharCode(...encrypted));
    }
  );

  const pool = await createWorkerPool({
    scriptUrl: workerUrl,
    workerCount: 2,
  });

  // 批量加密数据
  const sensitiveData = [
    'password123',
    'secret_key_abc',
    'private_info_xyz',
    'confidential_data',
  ];

  const encryptTasks = sensitiveData.map(data => ({
    data,
    key: 'my-secret-key',
  }));

  const encryptedResults = await pool.dispatchBatch(encryptTasks);
  const encrypted = aggregateResults<string>(encryptedResults, {
    transform: (r) => r.result!,
  });

  console.log('Encrypted data:', encrypted);

  // 创建解密 Worker
  const decryptWorkerUrl = createWorkerBlobUrl<{ data: string; key: string }, string>(
    async (payload) => {
      const encrypted = new Uint8Array(
        atob(payload.data).split('').map(c => c.charCodeAt(0))
      );
      const keyData = new TextEncoder().encode(payload.key);
      
      const decrypted = new Uint8Array(encrypted.length);
      for (let i = 0; i < encrypted.length; i++) {
        decrypted[i] = encrypted[i] ^ keyData[i % keyData.length];
      }
      
      return new TextDecoder().decode(decrypted);
    }
  );

  const decryptPool = await createWorkerPool({
    scriptUrl: decryptWorkerUrl,
    workerCount: 2,
  });

  // 批量解密数据
  const decryptTasks = encrypted.map(data => ({
    data,
    key: 'my-secret-key',
  }));

  const decryptedResults = await decryptPool.dispatchBatch(decryptTasks);
  const decrypted = aggregateResults<string>(decryptedResults, {
    transform: (r) => r.result!,
  });

  console.log('Decrypted data:', decrypted);

  await pool.destroy();
  await decryptPool.destroy();
}

// ==================== 运行所有示例 ====================

/**
 * 运行所有示例
 */
export async function runAllExamples() {
  console.log('=== Example 1: Basic Usage ===');
  await example1_basic();

  console.log('\n=== Example 2: Batch Processing ===');
  await example2_batch();

  console.log('\n=== Example 3: Multi-type Tasks ===');
  await example3_multiType();

  console.log('\n=== Example 4: Priority Scheduling ===');
  await example4_priority();

  console.log('\n=== Example 5: Auto Scaling ===');
  await example5_autoScale();

  console.log('\n=== Example 6: Streaming Results ===');
  await example6_streaming();

  console.log('\n=== Example 7: Error Handling ===');
  await example7_errorHandling();

  console.log('\n=== Example 8: Utils Class ===');
  await example8_utilsClass();

  console.log('\n=== Example 9: Thumbnail Generation ===');
  await example9_thumbnailGeneration();

  console.log('\n=== Example 10: Encryption/Decryption ===');
  await example10_encryption();

  console.log('\n✅ All examples completed!');
}

// 如果直接运行此文件
if (typeof process !== 'undefined' && process.argv) {
  runAllExamples().catch(console.error);
}
