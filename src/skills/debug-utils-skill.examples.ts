/**
 * ACE 调试工具使用示例
 * 
 * 演示如何使用 debug-utils-skill.ts 进行：
 * 1. 性能分析
 * 2. 内存监控
 * 3. 调试日志
 */

import {
  profile,
  getPerformanceReport,
  timer,
  startMemoryMonitoring,
  stopMemoryMonitoring,
  getMemorySnapshot,
  printMemoryStatus,
  createDebugSession,
  startDebugSession,
  endDebugSession,
  log,
  debug,
  info,
  warn,
  error,
  getLogHistory,
} from './debug-utils-skill';

// ==================== 示例 1: 性能分析 ====================

/**
 * 示例：使用 profile 装饰器分析函数性能
 */
function examplePerformanceProfiling() {
  console.log('\n🔍 示例 1: 性能分析\n');
  
  // 要分析的函数
  const slowFunction = (n: number): number => {
    let sum = 0;
    for (let i = 0; i < n; i++) {
      sum += i * Math.sqrt(i);
    }
    return sum;
  };
  
  // 使用 profile 包装
  const profiledFunction = profile('slowFunction', slowFunction);
  
  // 多次调用以收集统计数据
  profiledFunction(10000);
  profiledFunction(20000);
  profiledFunction(15000);
  
  // 获取性能报告
  const report = getPerformanceReport('slowFunction');
  console.log('\n性能报告:', JSON.stringify(report, null, 2));
}

/**
 * 示例：使用 timer 测量代码块执行时间
 */
function exampleTimer() {
  console.log('\n⏱️  示例 2: 计时器\n');
  
  const t = timer('数据处理流程');
  
  // 模拟一些操作
  const data = Array.from({ length: 1000 }, (_, i) => i * 2);
  const filtered = data.filter(x => x > 500);
  const transformed = filtered.map(x => Math.sqrt(x));
  
  const duration = t.end();
  console.log(`总耗时：${duration.toFixed(2)}ms\n`);
}

// ==================== 示例 2: 内存监控 ====================

/**
 * 示例：基础内存监控
 */
function exampleMemoryMonitoring() {
  console.log('\n📊 示例 3: 内存监控\n');
  
  // 打印当前内存状态
  printMemoryStatus();
  
  // 获取内存快照
  const snapshot = getMemorySnapshot();
  console.log('内存快照:', {
    heapUsed: `${(snapshot.heapUsed / 1024 / 1024).toFixed(2)} MB`,
    heapTotal: `${(snapshot.heapTotal / 1024 / 1024).toFixed(2)} MB`,
    usage: `${snapshot.heapUsedPercent.toFixed(2)}%`,
  });
}

/**
 * 示例：持续内存监控 (检测内存泄漏)
 */
function exampleMemoryLeakDetection() {
  console.log('\n🚨 示例 4: 内存泄漏检测\n');
  
  // 开始监控 (每 2 秒一次快照)
  startMemoryMonitoring(2000);
  
  // 模拟内存增长
  const largeObjects: any[] = [];
  let iteration = 0;
  
  const interval = setInterval(() => {
    iteration++;
    
    // 创建大型对象 (模拟内存泄漏)
    largeObjects.push(new Array(100000).fill({ data: 'x'.repeat(100) }));
    
    console.log(`迭代 ${iteration}: 创建了 ${largeObjects.length} 个大型对象`);
    
    if (iteration >= 10) {
      clearInterval(interval);
      stopMemoryMonitoring();
      
      // 获取内存报告
      const report = getMemoryReport();
      console.log('\n内存趋势:', report.trend);
    }
  }, 500);
}

// ==================== 示例 3: 调试日志 ====================

/**
 * 示例：分级日志记录
 */
function exampleLogging() {
  console.log('\n📝 示例 5: 调试日志\n');
  
  // 创建调试会话
  createDebugSession('example-session');
  
  // 不同级别的日志
  trace('这是追踪日志', { module: 'auth', action: 'login' });
  debug('这是调试日志', { userId: 12345 });
  info('这是信息日志', { status: 'success' });
  warn('这是警告日志', { code: 'DEPRECATED_API' });
  error('这是错误日志', { error: 'Connection timeout', retry: true });
  
  // 获取日志历史
  const allLogs = getLogHistory();
  const errorLogs = getLogHistory({ level: 'error' });
  const recentLogs = getLogHistory({ limit: 3 });
  
  console.log(`\n总日志数：${allLogs.length}`);
  console.log(`错误日志数：${errorLogs.length}`);
  console.log(`最近 3 条：`, recentLogs.map(l => l.message));
}

/**
 * 示例：带上下文的日志
 */
function exampleContextualLogging() {
  console.log('\n🏷️  示例 6: 上下文日志\n');
  
  const userContext = {
    userId: 'u_12345',
    username: 'alice',
    role: 'admin',
    session: 'sess_abc123',
  };
  
  info('用户登录', { ...userContext, action: 'login' });
  
  // 模拟业务逻辑
  const processData = profile('processData', (data: any[]) => {
    return data.map(item => ({ ...item, processed: true }));
  });
  
  const result = processData([{ id: 1 }, { id: 2 }]);
  info('数据处理完成', { count: result.length, data: result });
}

// ==================== 示例 4: 完整调试会话 ====================

/**
 * 示例：完整的调试会话流程
 */
function exampleFullDebugSession() {
  console.log('\n🎯 示例 7: 完整调试会话\n');
  
  // 启动调试会话 (自动开启内存监控)
  startDebugSession({
    id: 'full-example',
    enableMemoryMonitoring: true,
    memoryInterval: 3000,
  });
  
  // 模拟复杂业务流程
  const complexOperation = profile('complexOperation', async () => {
    const t1 = timer('阶段 1: 数据加载');
    await new Promise(resolve => setTimeout(resolve, 100));
    t1.end();
    
    const t2 = timer('阶段 2: 数据处理');
    const data = Array.from({ length: 5000 }, (_, i) => i * 2);
    const processed = data.filter(x => x > 1000).map(x => Math.sqrt(x));
    t2.end();
    
    const t3 = timer('阶段 3: 数据保存');
    await new Promise(resolve => setTimeout(resolve, 50));
    t3.end();
    
    return processed;
  });
  
  // 执行操作
  complexOperation().then(result => {
    info('复杂操作完成', { resultCount: result.length });
    
    // 结束会话并生成报告
    const { report, summary } = endDebugSession('full-example');
    console.log('\n会话报告:', summary);
  });
}

/**
 * 示例：异步函数性能分析
 */
async function exampleAsyncProfiling() {
  console.log('\n⚡ 示例 8: 异步函数分析\n');
  
  const asyncOperation = profile('asyncOperation', async (delay: number) => {
    await new Promise(resolve => setTimeout(resolve, delay));
    return { completed: true, delay };
  });
  
  // 并发执行多个异步操作
  const results = await Promise.all([
    asyncOperation(100),
    asyncOperation(200),
    asyncOperation(150),
  ]);
  
  console.log('异步操作结果:', results);
  console.log('性能报告:', getPerformanceReport('asyncOperation'));
}

// ==================== 示例 5: 实际场景 ====================

/**
 * 实际场景：API 请求调试
 */
async function exampleApiRequestDebugging() {
  console.log('\n🌐 示例 9: API 请求调试\n');
  
  const session = createDebugSession('api-debug');
  
  const fetchWithDebug = profile('fetchWithDebug', async (url: string) => {
    const t = timer(`GET ${url}`);
    
    try {
      info('发起 API 请求', { url });
      
      // 模拟 API 请求
      await new Promise(resolve => setTimeout(resolve, Math.random() * 200));
      
      const response = { data: { id: 1, name: 'Test' }, status: 200 };
      
      t.end();
      info('API 请求成功', { url, status: response.status });
      
      return response;
    } catch (err) {
      t.end();
      error('API 请求失败', { url, error: err });
      throw err;
    }
  });
  
  await fetchWithDebug('https://api.example.com/users');
  await fetchWithDebug('https://api.example.com/posts');
  
  const report = exportSessionReport(session.id);
  console.log(`\n会话统计：${report.logCount} 条日志，耗时 ${(report.duration / 1000).toFixed(2)}s`);
  
  clearSession(session.id);
}

/**
 * 实际场景：批处理任务调试
 */
function exampleBatchProcessingDebug() {
  console.log('\n📦 示例 10: 批处理任务调试\n');
  
  startDebugSession({ id: 'batch-job' });
  
  const batchProcessor = profile('batchProcessor', (items: any[], batchSize: number) => {
    const batches: any[][] = [];
    
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    
    batches.forEach((batch, idx) => {
      const t = timer(`批次 ${idx + 1}/${batches.length}`);
      
      // 处理批次
      batch.forEach(item => {
        item.processed = true;
      });
      
      t.end();
      debug(`批次 ${idx + 1} 完成`, { size: batch.length });
    });
    
    return items;
  });
  
  const items = Array.from({ length: 100 }, (_, i) => ({ id: i }));
  const processed = batchProcessor(items, 25);
  
  info('批处理完成', { total: processed.length, success: processed.filter(i => i.processed).length });
  
  const { summary } = endDebugSession('batch-job');
  console.log(summary);
}

// ==================== 运行所有示例 ====================

async function runAllExamples() {
  console.log('╔════════════════════════════════════════╗');
  console.log('║   ACE 调试工具使用示例                 ║');
  console.log('╚════════════════════════════════════════╝\n');
  
  try {
    examplePerformanceProfiling();
    exampleTimer();
    exampleMemoryMonitoring();
    exampleMemoryLeakDetection();
    exampleLogging();
    exampleContextualLogging();
    await exampleFullDebugSession();
    await exampleAsyncProfiling();
    await exampleApiRequestDebugging();
    exampleBatchProcessingDebug();
    
    console.log('\n✅ 所有示例运行完成!\n');
  } catch (err) {
    console.error('❌ 示例运行失败:', err);
  }
}

// 如果直接运行此文件
if (require.main === module) {
  runAllExamples();
}

export { runAllExamples };
