/**
 * Metrics Collector Skill - 使用示例
 * 
 * 演示如何使用指标收集工具的三大核心功能:
 * 1. 指标记录
 * 2. 指标聚合
 * 3. 指标导出
 */

import {
  MetricsCollectorSkill,
  MetricType,
  AggregationType,
  ExportFormat,
} from './metrics-collector-skill';

// ============================================================================
// 初始化
// ============================================================================

const collector = new MetricsCollectorSkill({
  storagePath: './.metrics',      // 数据存储路径
  maxRetentionDays: 30,           // 最大保留 30 天
  autoAggregateInterval: 60,      // 60 秒自动聚合一次
});

// ============================================================================
// 1. 指标记录 (Metric Recording)
// ============================================================================

async function exampleRecording() {
  console.log('=== 指标记录示例 ===\n');

  // 1.1 记录单个指标 (Gauge 类型)
  const cpuUsage = await collector.record('system.cpu.usage', 45.6, {
    type: MetricType.GAUGE,
    labels: { host: 'server-01', core: '0' },
    unit: 'percent',
    description: 'CPU 使用率',
  });
  console.log('记录 CPU 使用率:', cpuUsage);

  // 1.2 记录计数器指标 (Counter 类型 - 只增不减)
  const requestCount = await collector.record('http.requests.total', 1, {
    type: MetricType.COUNTER,
    labels: { method: 'GET', path: '/api/users', status: '200' },
    description: 'HTTP 请求总数',
  });
  console.log('记录请求计数:', requestCount);

  // 1.3 批量记录指标
  const batchRecords = [
    { name: 'system.memory.used', value: 4096, unit: 'MB', labels: { host: 'server-01' } },
    { name: 'system.memory.free', value: 2048, unit: 'MB', labels: { host: 'server-01' } },
    { name: 'system.disk.io.read', value: 1024, unit: 'KB/s', labels: { device: 'sda' } },
    { name: 'system.disk.io.write', value: 512, unit: 'KB/s', labels: { device: 'sda' } },
  ];

  const recordedCount = await collector.recordBatch(batchRecords);
  console.log(`批量记录 ${recordedCount} 个指标`);

  // 1.4 模拟实时监控场景
  console.log('\n模拟实时监控 (每 5 秒记录一次):');
  for (let i = 0; i < 5; i++) {
    await collector.record('app.response.time', Math.random() * 100 + 50, {
      type: MetricType.GAUGE,
      unit: 'ms',
      labels: { endpoint: '/api/data' },
    });
    await new Promise(resolve => setTimeout(resolve, 100)); // 加速演示
  }
  console.log('完成 5 次响应时间记录');
}

// ============================================================================
// 2. 指标聚合 (Metric Aggregation)
// ============================================================================

async function exampleAggregation() {
  console.log('\n=== 指标聚合示例 ===\n');

  // 2.1 计算平均值
  const avgResult = await collector.aggregate(
    { name: 'app.response.time' },
    AggregationType.AVG
  );
  console.log('平均响应时间:', avgResult.value.toFixed(2), 'ms');
  console.log('样本数量:', avgResult.count);

  // 2.2 计算总和
  const sumResult = await collector.aggregate(
    { name: 'http.requests.total' },
    AggregationType.SUM
  );
  console.log('总请求数:', sumResult.value);

  // 2.3 计算最大值/最小值
  const maxResult = await collector.aggregate(
    { name: 'system.cpu.usage' },
    AggregationType.MAX
  );
  const minResult = await collector.aggregate(
    { name: 'system.cpu.usage' },
    AggregationType.MIN
  );
  console.log('CPU 最高使用率:', maxResult.value, 'percent');
  console.log('CPU 最低使用率:', minResult.value, 'percent');

  // 2.4 计算速率 (每秒增长)
  const rateResult = await collector.aggregate(
    { name: 'http.requests.total' },
    AggregationType.RATE
  );
  console.log('请求速率:', rateResult.value.toFixed(2), 'req/s');

  // 2.5 计算分位数 (P95/P99)
  const p95Result = await collector.aggregate(
    { name: 'app.response.time' },
    AggregationType.P95
  );
  const p99Result = await collector.aggregate(
    { name: 'app.response.time' },
    AggregationType.P99
  );
  console.log('P95 响应时间:', p95Result.value.toFixed(2), 'ms');
  console.log('P99 响应时间:', p99Result.value.toFixed(2), 'ms');

  // 2.6 多维度聚合 (按标签分组)
  const dimensionResults = await collector.aggregateByDimension(
    { name: 'system.cpu.usage' },
    AggregationType.AVG,
    'host'  // 按 host 维度分组
  );
  console.log('\n按主机维度聚合 CPU 使用率:');
  for (const [host, result] of dimensionResults) {
    console.log(`  ${host}: ${result.value.toFixed(2)} percent`);
  }
}

// ============================================================================
// 3. 指标导出 (Metric Export)
// ============================================================================

async function exampleExport() {
  console.log('\n=== 指标导出示例 ===\n');

  // 3.1 导出为 JSON
  const jsonContent = await collector.export(ExportFormat.JSON);
  console.log('JSON 导出 (前 200 字符):');
  console.log(jsonContent.substring(0, 200) + '...\n');

  // 3.2 导出为 CSV
  const csvContent = await collector.export(ExportFormat.CSV, { name: 'system.*' });
  console.log('CSV 导出 (前 200 字符):');
  console.log(csvContent.substring(0, 200) + '...\n');

  // 3.3 导出为 Prometheus 格式
  const promContent = await collector.export(ExportFormat.PROMETHEUS);
  console.log('Prometheus 导出 (前 300 字符):');
  console.log(promContent.substring(0, 300) + '...\n');

  // 3.4 导出到文件
  const outputPath = await collector.export(
    ExportFormat.JSON,
    undefined,
    './metrics-export.json'
  );
  console.log(`指标已导出到：${outputPath}`);
}

// ============================================================================
// 4. 查询与统计
// ============================================================================

async function exampleQueryAndStats() {
  console.log('\n=== 查询与统计示例 ===\n');

  // 4.1 查询特定指标
  const cpuMetrics = collector.queryMetrics({
    name: 'system.cpu.usage',
    labels: { host: 'server-01' },
  });
  console.log(`查询到 ${cpuMetrics.length} 条 CPU 使用率记录`);

  // 4.2 使用时间范围查询
  const now = Date.now();
  const recentMetrics = collector.queryMetrics({
    name: 'app.response.time',
    start: now - 60 * 1000,  // 最近 1 分钟
    end: now,
  });
  console.log(`最近 1 分钟内有 ${recentMetrics.length} 条响应时间记录`);

  // 4.3 使用通配符查询
  const allSystemMetrics = collector.queryMetrics({
    name: 'system.*',  // 所有 system 开头的指标
  });
  console.log(`系统类指标共 ${allSystemMetrics.length} 条`);

  // 4.4 获取统计信息
  const stats = collector.getStats();
  console.log('\n指标统计信息:');
  console.log('  总记录数:', stats.totalRecords);
  console.log('  唯一指标数:', stats.uniqueMetrics);
  console.log('  时间范围:', new Date(stats.timeRange.start).toLocaleString(), '-', new Date(stats.timeRange.end).toLocaleString());
  console.log('  存储大小:', (stats.storageSize / 1024).toFixed(2), 'KB');
}

// ============================================================================
// 5. 实际应用场景
// ============================================================================

async function exampleRealWorldScenarios() {
  console.log('\n=== 实际应用场景 ===\n');

  // 场景 1: API 性能监控
  console.log('场景 1: API 性能监控');
  const apiLatency = await collector.record('api.latency', 120, {
    type: MetricType.GAUGE,
    unit: 'ms',
    labels: { service: 'user-service', endpoint: '/users/:id', method: 'GET' },
  });
  console.log('  记录 API 延迟:', apiLatency.value, 'ms');

  // 场景 2: 业务指标追踪
  console.log('\n场景 2: 业务指标追踪');
  await collector.recordBatch([
    { name: 'business.orders.total', value: 1, type: MetricType.COUNTER, labels: { status: 'completed' } },
    { name: 'business.revenue.total', value: 299.99, unit: 'CNY', labels: { product: 'premium' } },
    { name: 'business.users.active', value: 1520, type: MetricType.GAUGE },
  ]);
  console.log('  记录订单、收入、活跃用户指标');

  // 场景 3: 资源使用告警
  console.log('\n场景 3: 资源使用告警');
  const memoryUsage = await collector.record('system.memory.usage', 85.5, {
    type: MetricType.GAUGE,
    unit: 'percent',
  });
  if (memoryUsage.value > 80) {
    console.log('  ⚠️  警告：内存使用率超过 80%!');
  }

  // 场景 4: 生成监控报告
  console.log('\n场景 4: 生成监控报告');
  const report = {
    generatedAt: new Date().toISOString(),
    metrics: {
      avgResponseTime: (await collector.aggregate({ name: 'api.latency' }, AggregationType.AVG)).value,
      totalRequests: (await collector.aggregate({ name: 'business.orders.total' }, AggregationType.SUM)).value,
      activeUsers: (await collector.aggregate({ name: 'business.users.active' }, AggregationType.MAX)).value,
    },
  };
  console.log('  监控报告:', JSON.stringify(report, null, 2));
}

// ============================================================================
// 主函数 - 运行所有示例
// ============================================================================

async function main() {
  console.log('🎯 Metrics Collector Skill - 使用示例\n');
  console.log('=' .repeat(50) + '\n');

  try {
    // 运行所有示例
    await exampleRecording();
    await exampleAggregation();
    await exampleExport();
    await exampleQueryAndStats();
    await exampleRealWorldScenarios();

    console.log('\n' + '=' .repeat(50));
    console.log('✅ 所有示例运行完成!\n');
  } catch (error) {
    console.error('❌ 运行错误:', error);
  }
}

// 如果直接运行此文件
if (require.main === module) {
  main();
}

export { main as runExamples };
