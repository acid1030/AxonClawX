/**
 * Metric Collector Skill - 使用示例
 * 
 * 演示 KAEL 指标监控工具的三大核心功能:
 * 1. 指标定义
 * 2. 指标收集
 * 3. 指标聚合
 * 
 * @author Axon (KAEL Engineering)
 */

import * as os from 'os';
import { MetricCollector, SYSTEM_METRIC_TEMPLATES, BUSINESS_METRIC_TEMPLATES, MetricPoint } from './metric-collector-skill';

// ============== 示例 1: 指标定义 ==============

/**
 * 示例 1.1: 手动定义指标
 */
function example1_defineMetric() {
  console.log('=== 示例 1.1: 手动定义指标 ===\n');

  const collector = new MetricCollector();

  // 定义 CPU 使用率指标
  collector.defineMetric({
    name: 'app.cpu.usage',
    description: '应用 CPU 使用率',
    kind: 'gauge',
    dataType: 'float',
    unit: 'percent',
    labelKeys: ['host', 'instance'],
    enabled: true,
    collectionInterval: 5000,
    retentionPeriod: 3600,
    thresholds: {
      warning: 70,
      critical: 90,
    },
  });

  // 定义请求数指标
  collector.defineMetric({
    name: 'app.requests.total',
    description: '总请求数',
    kind: 'counter',
    dataType: 'integer',
    unit: 'count',
    labelKeys: ['method', 'endpoint', 'status'],
    enabled: true,
    retentionPeriod: 86400, // 保留 24 小时
  });

  // 定义响应时间指标
  collector.defineMetric({
    name: 'app.response.time',
    description: 'API 响应时间',
    kind: 'histogram',
    dataType: 'float',
    unit: 'milliseconds',
    labelKeys: ['endpoint', 'method'],
    enabled: true,
    collectionInterval: 1000,
    retentionPeriod: 3600,
    thresholds: {
      warning: 500,
      critical: 1000,
    },
  });

  console.log('✅ 已定义 3 个指标');
  console.log('   - app.cpu.usage (Gauge)');
  console.log('   - app.requests.total (Counter)');
  console.log('   - app.response.time (Histogram)');

  // 列出所有指标定义
  const definitions = collector.listDefinitions();
  console.log(`\n📋 指标列表 (${definitions.length} 个):`);
  definitions.forEach(def => {
    console.log(`   - ${def.name}: ${def.description} [${def.kind}]`);
  });
}

/**
 * 示例 1.2: 使用预定义模板
 */
function example1_useTemplate() {
  console.log('\n=== 示例 1.2: 使用预定义模板 ===\n');

  const collector = new MetricCollector();

  // 使用系统指标模板
  collector.defineFromTemplate('my.cpu', 'cpu_usage');
  collector.defineFromTemplate('my.memory', 'memory_usage');

  // 使用业务指标模板
  collector.defineFromTemplate('my.requests', 'request_count');
  collector.defineFromTemplate('my.latency', 'request_duration');

  console.log('✅ 使用模板创建了 4 个指标');

  // 获取指标定义
  const cpuDef = collector.getDefinition('my.cpu');
  if (cpuDef) {
    console.log(`\n📊 CPU 指标配置:`);
    console.log(`   描述：${cpuDef.description}`);
    console.log(`   类型：${cpuDef.kind}`);
    console.log(`   单位：${cpuDef.unit}`);
    console.log(`   采集间隔：${cpuDef.collectionInterval}ms`);
    console.log(`   告警阈值：警告 ${cpuDef.thresholds?.warning}%, 严重 ${cpuDef.thresholds?.critical}%`);
  }
}

/**
 * 示例 1.3: 启用/禁用指标
 */
function example1_toggleMetric() {
  console.log('\n=== 示例 1.3: 启用/禁用指标 ===\n');

  const collector = new MetricCollector();

  collector.defineMetric({
    name: 'test.metric',
    description: '测试指标',
    kind: 'gauge',
    dataType: 'number',
    unit: 'count',
    labelKeys: [],
    enabled: true,
  });

  console.log('✅ 创建指标 (默认启用)');

  // 禁用指标
  collector.toggleMetric('test.metric', false);
  console.log('⏸️  已禁用指标');

  // 重新启用
  collector.toggleMetric('test.metric', true);
  console.log('▶️  已重新启用指标');
}

// ============== 示例 2: 指标收集 ==============

/**
 * 示例 2.1: 手动记录指标
 */
function example2_recordMetric() {
  console.log('\n=== 示例 2.1: 手动记录指标 ===\n');

  const collector = new MetricCollector();

  // 定义指标
  collector.defineMetric({
    name: 'api.response_time',
    description: 'API 响应时间',
    kind: 'histogram',
    dataType: 'float',
    unit: 'ms',
    labelKeys: ['endpoint', 'method'],
    enabled: true,
  });

  // 记录数据点
  collector.record('api.response_time', 125.5, { endpoint: '/api/users', method: 'GET' });
  collector.record('api.response_time', 89.2, { endpoint: '/api/users', method: 'GET' });
  collector.record('api.response_time', 234.7, { endpoint: '/api/users', method: 'POST' });
  collector.record('api.response_time', 156.3, { endpoint: '/api/orders', method: 'GET' });

  console.log('✅ 记录了 4 个数据点');

  // 查询数据
  const allPoints = collector.query('api.response_time');
  console.log(`\n📊 总数据点：${allPoints.length}`);

  // 按标签过滤
  const getUserPoints = collector.query('api.response_time', {
    labels: { endpoint: '/api/users', method: 'GET' },
  });
  console.log(`📊 /api/users GET 请求数据点：${getUserPoints.length}`);
  getUserPoints.forEach((p, i) => {
    console.log(`   [${i + 1}] ${p.value} ms`);
  });
}

/**
 * 示例 2.2: 自动收集系统指标
 */
function example2_collectSystemMetrics() {
  console.log('\n=== 示例 2.2: 自动收集系统指标 ===\n');

  const collector = new MetricCollector();

  // 定义系统指标
  collector.defineMetric({
    name: 'system.cpu.usage',
    description: 'CPU 使用率',
    kind: 'gauge',
    dataType: 'float',
    unit: 'percent',
    labelKeys: ['host'],
    enabled: true,
    collectionInterval: 2000,
  });

  collector.defineMetric({
    name: 'system.memory.usage',
    description: '内存使用率',
    kind: 'gauge',
    dataType: 'float',
    unit: 'percent',
    labelKeys: ['host'],
    enabled: true,
    collectionInterval: 2000,
  });

  // 启动自动收集
  collector.startCollection('system.cpu.usage', () => {
    collector.collectCpuMetrics({ host: os.hostname() });
  }, 2000);

  collector.startCollection('system.memory.usage', () => {
    collector.collectMemoryMetrics({ host: os.hostname() });
  }, 2000);

  console.log('✅ 已启动自动收集 (每 2 秒)');

  // 5 秒后查看数据
  setTimeout(() => {
    const cpuAgg = collector.aggregate('system.cpu.usage');
    const memAgg = collector.aggregate('system.memory.usage');

    if (cpuAgg) {
      console.log(`\n📊 CPU 使用率:`);
      console.log(`   当前：${cpuAgg.latest.toFixed(2)}%`);
      console.log(`   平均：${cpuAgg.avg.toFixed(2)}%`);
      console.log(`   最高：${cpuAgg.max.toFixed(2)}%`);
    }

    if (memAgg) {
      console.log(`\n📊 内存使用率:`);
      console.log(`   当前：${memAgg.latest.toFixed(2)}%`);
      console.log(`   平均：${memAgg.avg.toFixed(2)}%`);
      console.log(`   最高：${memAgg.max.toFixed(2)}%`);
    }

    // 停止收集
    collector.stopAllCollection();
    console.log('\n⏹️  已停止自动收集');
  }, 5000);
}

/**
 * 示例 2.3: 模拟业务指标收集
 */
function example2_simulateBusinessMetrics() {
  console.log('\n=== 示例 2.3: 模拟业务指标收集 ===\n');

  const collector = new MetricCollector();

  collector.defineMetric({
    name: 'http.requests.total',
    description: 'HTTP 请求总数',
    kind: 'counter',
    dataType: 'integer',
    unit: 'count',
    labelKeys: ['method', 'status'],
    enabled: true,
  });

  collector.defineMetric({
    name: 'http.response.time',
    description: 'HTTP 响应时间',
    kind: 'histogram',
    dataType: 'float',
    unit: 'ms',
    labelKeys: ['method', 'endpoint'],
    enabled: true,
  });

  // 模拟请求
  const methods = ['GET', 'POST', 'PUT', 'DELETE'];
  const endpoints = ['/api/users', '/api/orders', '/api/products'];
  const statuses = ['200', '201', '400', '404', '500'];

  console.log('🔄 模拟 100 个请求...');

  for (let i = 0; i < 100; i++) {
    const method = methods[Math.floor(Math.random() * methods.length)];
    const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
    const status = statuses[Math.random() > 0.9 ? 4 : 0]; // 10% 错误率

    // 记录请求数
    collector.record('http.requests.total', 1, { method, status });

    // 记录响应时间 (50-500ms)
    const responseTime = Math.random() * 450 + 50;
    collector.record('http.response.time', responseTime, { method, endpoint });
  }

  console.log('✅ 模拟完成');

  // 统计
  const totalRequests = collector.aggregate('http.requests.total');
  const responseTime = collector.aggregate('http.response.time', {
    calculatePercentiles: true,
  });

  if (totalRequests) {
    console.log(`\n📊 请求统计:`);
    console.log(`   总数：${totalRequests.sum}`);
  }

  if (responseTime && responseTime.percentiles) {
    console.log(`\n📊 响应时间统计:`);
    console.log(`   平均：${responseTime.avg.toFixed(2)}ms`);
    console.log(`   最小：${responseTime.min.toFixed(2)}ms`);
    console.log(`   最大：${responseTime.max.toFixed(2)}ms`);
    console.log(`   P50: ${responseTime.percentiles.p50.toFixed(2)}ms`);
    console.log(`   P90: ${responseTime.percentiles.p90.toFixed(2)}ms`);
    console.log(`   P95: ${responseTime.percentiles.p95.toFixed(2)}ms`);
    console.log(`   P99: ${responseTime.percentiles.p99.toFixed(2)}ms`);
  }
}

// ============== 示例 3: 指标聚合 ==============

/**
 * 示例 3.1: 基础聚合统计
 */
function example3_basicAggregation() {
  console.log('\n=== 示例 3.1: 基础聚合统计 ===\n');

  const collector = new MetricCollector();

  collector.defineMetric({
    name: 'test.value',
    description: '测试值',
    kind: 'gauge',
    dataType: 'float',
    unit: 'count',
    labelKeys: [],
    enabled: true,
  });

  // 生成测试数据
  for (let i = 0; i < 50; i++) {
    collector.record('test.value', Math.random() * 100);
  }

  // 基础统计
  const agg = collector.aggregate('test.value');

  if (agg) {
    console.log('📊 聚合统计结果:');
    console.log(`   数据点数：${agg.count}`);
    console.log(`   平均值：${agg.avg.toFixed(2)}`);
    console.log(`   最大值：${agg.max.toFixed(2)}`);
    console.log(`   最小值：${agg.min.toFixed(2)}`);
    console.log(`   总和：${agg.sum.toFixed(2)}`);
    console.log(`   最新值：${agg.latest.toFixed(2)}`);
    console.log(`   时间范围：${new Date(agg.timeRange.start).toLocaleTimeString()} - ${new Date(agg.timeRange.end).toLocaleTimeString()}`);
  }
}

/**
 * 示例 3.2: 百分位数统计
 */
function example3_percentiles() {
  console.log('\n=== 示例 3.2: 百分位数统计 ===\n');

  const collector = new MetricCollector();

  collector.defineMetric({
    name: 'api.latency',
    description: 'API 延迟',
    kind: 'histogram',
    dataType: 'float',
    unit: 'ms',
    labelKeys: [],
    enabled: true,
  });

  // 模拟延迟数据 (大部分在 100ms 以内，少数慢请求)
  for (let i = 0; i < 200; i++) {
    const latency = Math.random() < 0.9 
      ? Math.random() * 100 + 50  // 90% 的请求：50-150ms
      : Math.random() * 500 + 200; // 10% 的慢请求：200-700ms
    collector.record('api.latency', latency);
  }

  const agg = collector.aggregate('api.latency', {
    calculatePercentiles: true,
  });

  if (agg && agg.percentiles) {
    console.log('📊 延迟分布:');
    console.log(`   平均：${agg.avg.toFixed(2)}ms`);
    console.log(`   P50 (中位数): ${agg.percentiles.p50.toFixed(2)}ms`);
    console.log(`   P90: ${agg.percentiles.p90.toFixed(2)}ms`);
    console.log(`   P95: ${agg.percentiles.p95.toFixed(2)}ms`);
    console.log(`   P99: ${agg.percentiles.p99.toFixed(2)}ms`);
    console.log(`   最大：${agg.max.toFixed(2)}ms`);
  }
}

/**
 * 示例 3.3: 时间窗口聚合
 */
function example3_windowedAggregation() {
  console.log('\n=== 示例 3.3: 时间窗口聚合 ===\n');

  const collector = new MetricCollector();

  collector.defineMetric({
    name: 'requests.per.second',
    description: '每秒请求数',
    kind: 'gauge',
    dataType: 'integer',
    unit: 'count',
    labelKeys: [],
    enabled: true,
  });

  // 模拟 5 分钟的数据 (每秒一个点)
  const now = Date.now();
  for (let i = 0; i < 300; i++) {
    const rps = Math.floor(Math.random() * 100) + 50; // 50-150 RPS
    collector.record('requests.per.second', rps);
  }

  // 按 1 分钟窗口聚合
  const windows = collector.aggregateByWindow('requests.per.second', 60);

  console.log('📊 每分钟请求数统计:');
  windows.forEach((w, i) => {
    console.log(`\n   窗口 ${i + 1}: ${new Date(w.windowStart).toLocaleTimeString()} - ${new Date(w.windowEnd).toLocaleTimeString()}`);
    console.log(`      平均：${w.aggregation.avg.toFixed(1)} RPS`);
    console.log(`      最高：${w.aggregation.max} RPS`);
    console.log(`      最低：${w.aggregation.min} RPS`);
  });
}

/**
 * 示例 3.4: 时间段对比
 */
function example3_comparePeriods() {
  console.log('\n=== 示例 3.4: 时间段对比 ===\n');

  const collector = new MetricCollector();

  collector.defineMetric({
    name: 'response.time',
    description: '响应时间',
    kind: 'gauge',
    dataType: 'float',
    unit: 'ms',
    labelKeys: [],
    enabled: true,
  });

  const now = Date.now();

  // 模拟第一个时间段 (优化前)
  for (let i = 0; i < 60; i++) {
    const time = now - 7200000 + i * 1000; // 2 小时前
    const value = Math.random() * 100 + 200; // 200-300ms
    collector.record('response.time', value);
  }

  // 模拟第二个时间段 (优化后)
  for (let i = 0; i < 60; i++) {
    const time = now - 60000 + i * 1000; // 1 分钟前
    const value = Math.random() * 50 + 100; // 100-150ms
    collector.record('response.time', value);
  }

  const comparison = collector.compare('response.time', {
    startTime: now - 7200000,
    endTime: now - 7140000,
  }, {
    startTime: now - 120000,
    endTime: now - 60000,
  });

  if (comparison) {
    console.log('📊 性能对比:');
    console.log(`   优化前平均：${comparison.period1?.avg.toFixed(2)}ms`);
    console.log(`   优化后平均：${comparison.period2?.avg.toFixed(2)}ms`);
    console.log(`   改善：${comparison.change.toFixed(2)}ms (${comparison.changePercent.toFixed(2)}%)`);
    
    if (comparison.changePercent < 0) {
      console.log('✅ 性能提升!');
    }
  }
}

/**
 * 示例 3.5: 变化率计算
 */
function example3_rateCalculation() {
  console.log('\n=== 示例 3.5: 变化率计算 ===\n');

  const collector = new MetricCollector();

  collector.defineMetric({
    name: 'active.users',
    description: '活跃用户数',
    kind: 'gauge',
    dataType: 'integer',
    unit: 'count',
    labelKeys: [],
    enabled: true,
  });

  // 模拟用户增长 (从 100 增长到 500)
  for (let i = 0; i < 100; i++) {
    const users = 100 + i * 4;
    collector.record('active.users', users);
  }

  const agg = collector.aggregate('active.users', {
    calculateRate: true,
  });

  if (agg && agg.rate) {
    console.log('📊 活跃用户趋势:');
    console.log(`   起始：${agg.min} 用户`);
    console.log(`   结束：${agg.latest} 用户`);
    console.log(`   增长率：${agg.rate.toFixed(2)} 用户/秒`);
    console.log(`   时长：${(agg.timeRange.duration / 1000).toFixed(0)} 秒`);
  }
}

// ============== 示例 4: 数据管理 ==============

/**
 * 示例 4.1: 导出数据
 */
function example4_exportData() {
  console.log('\n=== 示例 4.1: 导出数据 ===\n');

  const collector = new MetricCollector();

  collector.defineMetric({
    name: 'export.test',
    description: '导出测试',
    kind: 'gauge',
    dataType: 'number',
    unit: 'count',
    labelKeys: ['source'],
    enabled: true,
  });

  // 生成数据
  for (let i = 0; i < 10; i++) {
    collector.record('export.test', Math.random() * 100, { source: 'test' });
  }

  // 导出 JSON
  const jsonExport = collector.exportToJson({ name: 'export.test' });
  console.log('📄 JSON 导出 (前 200 字符):');
  console.log(jsonExport.substring(0, 200) + '...');

  // 导出 CSV
  const csvExport = collector.exportToCsv('export.test');
  console.log('\n📄 CSV 导出:');
  console.log(csvExport);
}

/**
 * 示例 4.2: 收集器状态
 */
function example4_status() {
  console.log('\n=== 示例 4.2: 收集器状态 ===\n');

  const collector = new MetricCollector();

  // 定义多个指标
  collector.defineMetric({
    name: 'metric.1',
    description: '指标 1',
    kind: 'gauge',
    dataType: 'number',
    unit: 'count',
    labelKeys: [],
    enabled: true,
  });

  collector.defineMetric({
    name: 'metric.2',
    description: '指标 2',
    kind: 'gauge',
    dataType: 'number',
    unit: 'count',
    labelKeys: [],
    enabled: true,
  });

  // 记录数据
  for (let i = 0; i < 100; i++) {
    collector.record('metric.1', i);
    collector.record('metric.2', i * 2);
  }

  const status = collector.getStatus();
  console.log('📊 收集器状态:');
  console.log(`   指标数量：${status.metricCount}`);
  console.log(`   数据点总数：${status.totalDataPoints}`);
  console.log(`   活跃收集：${status.activeCollections}`);
  console.log(`   堆内存使用：${(status.memoryUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`);
  console.log(`   堆内存总计：${(status.memoryUsage.heapTotal / 1024 / 1024).toFixed(2)} MB`);
}

// ============== 运行示例 ==============

console.log('🚀 Metric Collector Skill - 使用示例\n');
console.log('=' .repeat(50));

// 运行所有示例
example1_defineMetric();
example1_useTemplate();
example1_toggleMetric();
example2_recordMetric();
// example2_collectSystemMetrics(); // 需要等待 5 秒，手动启用
example2_simulateBusinessMetrics();
example3_basicAggregation();
example3_percentiles();
example3_windowedAggregation();
example3_comparePeriods();
example3_rateCalculation();
example4_exportData();
example4_status();

console.log('\n' + '='.repeat(50));
console.log('✅ 所有示例完成!');
