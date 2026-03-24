/**
 * Stream Utils Skill - 使用示例
 * 
 * NOVA 流处理工具集演示
 * 
 * @author NOVA
 */

import {
  createFileReadable,
  createFileWritable,
  createTransformStream,
  createFilterStream,
  createMapStream,
  createCompressStream,
  createDecompressStream,
  createFilePipeline,
  pipeAsync,
  filterOp,
  mapOp,
  takeOp,
  readJsonLines,
  writeJsonLines,
  readInChunks,
  writeWithBackpressure,
  copyStreamWithBackpressure,
  streamToString,
  batchStream,
  withStreamTimeout,
} from './stream-utils-skill';
import { Readable } from 'node:stream';

// ============ 示例 1: 基础文件读写 ============

async function example1_basicReadWrite() {
  console.log('=== 示例 1: 基础文件读写 ===\n');
  
  // 读取文件
  const readable = createFileReadable('./input.txt', {
    encoding: 'utf8',
    highWaterMark: 8 * 1024,
  });
  
  // 写入文件
  const writable = createFileWritable('./output.txt');
  
  // 管道连接
  readable.pipe(writable);
  
  // 或使用 async/await
  await new Promise((resolve, reject) => {
    writable.on('finish', resolve);
    writable.on('error', reject);
  });
  
  console.log('✓ 文件复制完成\n');
}

// ============ 示例 2: JSONL 文件处理 ============

async function example2_jsonlProcessing() {
  console.log('=== 示例 2: JSONL 文件处理 ===\n');
  
  // 写入 JSONL
  const records = [
    { id: 1, name: 'Alice', age: 25 },
    { id: 2, name: 'Bob', age: 30 },
    { id: 3, name: 'Charlie', age: 35 },
  ];
  
  await writeJsonLines('./users.jsonl', records);
  console.log('✓ 写入 3 条记录\n');
  
  // 读取 JSONL
  const users = [];
  for await (const user of readJsonLines('./users.jsonl')) {
    users.push(user);
    console.log(`  读取：${user.name} (${user.age}岁)`);
  }
  
  console.log(`✓ 共读取 ${users.length} 条记录\n`);
}

// ============ 示例 3: 流转换 (过滤 + 映射) ============

async function example3_streamTransform() {
  console.log('=== 示例 3: 流转换 (过滤 + 映射) ===\n');
  
  // 创建数据源
  const source = Readable.from([
    { id: 1, value: 10 },
    { id: 2, value: 20 },
    { id: 3, value: 30 },
    { id: 4, value: 40 },
  ]);
  
  // 创建转换流
  const filter = createFilterStream<{ id: number; value: number }>(
    (item) => item.value >= 20
  );
  
  const mapper = createMapStream<{ id: number; value: number }, string>(
    (item) => `ID:${item.id} = ${item.value * 2}`
  );
  
  // 连接管道
  const output = createFileWritable('./transformed.txt', {
    encoding: 'utf8',
  });
  
  source.pipe(filter).pipe(mapper).pipe(output);
  
  await new Promise((resolve) => output.on('finish', resolve));
  
  console.log('✓ 转换完成，输出:\n');
  console.log('  ID:2 = 40\n  ID:3 = 60\n  ID:4 = 80\n');
}

// ============ 示例 4: 异步迭代器管道 ============

async function example4_asyncIteratorPipeline() {
  console.log('=== 示例 4: 异步迭代器管道 ===\n');
  
  // 创建数据源
  async function* dataSource() {
    for (let i = 1; i <= 10; i++) {
      yield { id: i, value: i * 10 };
    }
  }
  
  // 构建管道
  const result = await pipeAsync(
    dataSource(),
    filterOp<{ id: number; value: number }>((item) => item.id % 2 === 0),
    mapOp<{ id: number; value: number }, string>(
      (item) => `[${item.id}] ${item.value}`
    ),
    takeOp<string>(3)
  );
  
  console.log('管道处理结果:');
  for await (const item of result) {
    console.log(`  ${item}`);
  }
  
  console.log('\n✓ 管道执行完成\n');
}

// ============ 示例 5: 大文件分块读取 ============

async function example5_largeFileChunks() {
  console.log('=== 示例 5: 大文件分块读取 ===\n');
  
  // 假设有一个大文件
  const filePath = './large-file.bin';
  
  let totalBytes = 0;
  let chunkCount = 0;
  
  // 分块读取 (每块 64KB)
  for await (const chunk of readInChunks(filePath, 64 * 1024)) {
    totalBytes += chunk.length;
    chunkCount++;
    console.log(`  块 ${chunkCount}: ${chunk.length} 字节`);
  }
  
  console.log(`\n✓ 共读取 ${chunkCount} 块，总计 ${totalBytes} 字节\n`);
}

// ============ 示例 6: 带背压处理的写入 ============

async function example6_backpressureWrite() {
  console.log('=== 示例 6: 带背压处理的写入 ===\n');
  
  const writable = createFileWritable('./backpressure-output.txt', {
    encoding: 'utf8',
  });
  
  // 生成大量数据
  const chunks = Array.from({ length: 1000 }, (_, i) => 
    `Line ${i + 1}: ${'x'.repeat(1000)}\n`
  );
  
  // 带背压处理的写入
  await writeWithBackpressure(writable, chunks, {
    retryDelay: 100,
    maxRetries: 3,
    logging: true,
  });
  
  console.log('✓ 背压处理写入完成\n');
}

// ============ 示例 7: 流复制 (带背压) ============

async function example7_streamCopy() {
  console.log('=== 示例 7: 流复制 (带背压) ===\n');
  
  const readable = createFileReadable('./source.bin');
  const writable = createFileWritable('./destination.bin');
  
  await copyStreamWithBackpressure(readable, writable, {
    logging: true,
  });
  
  console.log('✓ 流复制完成\n');
}

// ============ 示例 8: 文件压缩管道 ============

async function example8_compressionPipeline() {
  console.log('=== 示例 8: 文件压缩管道 ===\n');
  
  // 压缩
  await createFilePipeline(
    './input.txt',
    './input.txt.gz',
    [createCompressStream()]
  );
  console.log('✓ 压缩完成: input.txt → input.txt.gz\n');
  
  // 解压
  await createFilePipeline(
    './input.txt.gz',
    './input-restored.txt',
    [createDecompressStream()]
  );
  console.log('✓ 解压完成: input.txt.gz → input-restored.txt\n');
}

// ============ 示例 9: 批处理流数据 ============

async function example9_batchProcessing() {
  console.log('=== 示例 9: 批处理流数据 ===\n');
  
  // 创建数据源
  const source = Readable.from(
    Array.from({ length: 25 }, (_, i) => ({ id: i + 1 }))
  );
  
  // 批处理 (每批 10 条)
  let batchNum = 0;
  for await (const batch of batchStream<{ id: number }>(source, 10)) {
    batchNum++;
    console.log(`  批次 ${batchNum}: ${batch.length} 条记录`);
    console.log(`    ID 范围：${batch[0].id} - ${batch[batch.length - 1].id}`);
  }
  
  console.log('\n✓ 批处理完成\n');
}

// ============ 示例 10: 带超时的流处理 ============

async function example10_timeoutHandling() {
  console.log('=== 示例 10: 带超时的流处理 ===\n');
  
  // 模拟慢速流处理
  const slowOperation = async () => {
    await new Promise((resolve) => setTimeout(resolve, 100));
    return '完成';
  };
  
  try {
    // 设置 5 秒超时
    const result = await withStreamTimeout(slowOperation, 5000);
    console.log(`✓ 处理结果：${result}\n`);
  } catch (error) {
    console.log(`✗ 超时错误：${(error as Error).message}\n`);
  }
}

// ============ 示例 11: 流转字符串 ============

async function example11_streamToString() {
  console.log('=== 示例 11: 流转字符串 ===\n');
  
  const readable = createFileReadable('./input.txt', {
    encoding: 'utf8',
  });
  
  const content = await streamToString(readable);
  console.log(`文件内容 (${content.length} 字符):\n`);
  console.log(content.slice(0, 200) + '...\n');
}

// ============ 示例 12: 复杂管道组合 ============

async function example12_complexPipeline() {
  console.log('=== 示例 12: 复杂管道组合 ===\n');
  
  // 模拟日志处理管道
  async function* logSource() {
    const logs = [
      { level: 'INFO', message: 'User logged in', timestamp: Date.now() },
      { level: 'ERROR', message: 'Database connection failed', timestamp: Date.now() },
      { level: 'WARN', message: 'High memory usage', timestamp: Date.now() },
      { level: 'INFO', message: 'Request processed', timestamp: Date.now() },
      { level: 'ERROR', message: 'Timeout exceeded', timestamp: Date.now() },
    ];
    
    for (const log of logs) {
      yield log;
    }
  }
  
  // 构建处理管道
  const processedLogs = await pipeAsync(
    logSource(),
    // 只保留 ERROR 和 WARN
    filterOp<{ level: string; message: string; timestamp: number }>(
      (log) => ['ERROR', 'WARN'].includes(log.level)
    ),
    // 格式化输出
    mapOp((log) => `[${log.level}] ${log.message} @ ${new Date(log.timestamp).toISOString()}`),
    // 限制输出数量
    takeOp<string>(10)
  );
  
  console.log('处理后的日志:');
  for await (const log of processedLogs) {
    console.log(`  ${log}`);
  }
  
  console.log('\n✓ 复杂管道执行完成\n');
}

// ============ 主函数 ============

async function main() {
  console.log('╔════════════════════════════════════════╗');
  console.log('║  NOVA Stream Utils - 使用示例          ║');
  console.log('╚════════════════════════════════════════╝\n');
  
  try {
    // 运行所有示例
    await example1_basicReadWrite();
    await example2_jsonlProcessing();
    await example3_streamTransform();
    await example4_asyncIteratorPipeline();
    // await example5_largeFileChunks(); // 需要大文件
    await example6_backpressureWrite();
    // await example7_streamCopy(); // 需要源文件
    // await example8_compressionPipeline(); // 需要输入文件
    await example9_batchProcessing();
    await example10_timeoutHandling();
    // await example11_streamToString(); // 需要输入文件
    await example12_complexPipeline();
    
    console.log('╔════════════════════════════════════════╗');
    console.log('║  ✓ 所有示例执行完成                    ║');
    console.log('╚════════════════════════════════════════╝');
  } catch (error) {
    console.error('✗ 示例执行失败:', error);
    process.exit(1);
  }
}

// 如果直接运行此文件
if (require.main === module) {
  main();
}

// 导出示例函数供测试使用
export {
  example1_basicReadWrite,
  example2_jsonlProcessing,
  example3_streamTransform,
  example4_asyncIteratorPipeline,
  example5_largeFileChunks,
  example6_backpressureWrite,
  example7_streamCopy,
  example8_compressionPipeline,
  example9_batchProcessing,
  example10_timeoutHandling,
  example11_streamToString,
  example12_complexPipeline,
};
