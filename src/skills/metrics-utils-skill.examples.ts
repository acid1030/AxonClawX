/**
 * Metrics Utils Skill - 使用示例
 * 
 * 演示如何使用性能指标监控工具：
 * 1. 指标收集
 * 2. 指标聚合
 * 3. 告警触发
 */

import { MetricsCollector, MetricType, AlertLevel } from './metrics-utils-skill';

// ============== 示例 1: 基础使用 ==============

/**
 * 示例 1.1: 创建收集器并启动自动收集
 */
function example1_basic() {
  console.log('=== 示例 1.1: 基础使用 ===\n');

  // 创建收集器
  const collector = new MetricsCollector({
    collectionInterval: 5000, // 5 秒收集一次
    retentionPeriod: 3600,    // 保留 1 小时数据
    maxDataPoints: 10000,     // 最多 10000 个数据点
  });

  // 启动自动收集
  collector.startAutoCollection();

  console.log('✅ 自动收集已启动，每 5 秒收集一次系统指标');

  // 10 秒后查询指标
  setTimeout(() => {
    const cpuMetrics = collector.queryMetrics({ name: 'cpu_usage' });
    console.log(`\n📊 最新 CPU 使用率数据点数：${cpuMetrics.length}`);
    
    if (cpuMetrics.length > 0) {
      const latest = cpuMetrics[cpuMetrics.length - 1];
      console.log(`   最新值：${latest.value.toFixed(2)}%`);
    }

    // 停止收集
    collector.stopAutoCollection();
    console.log('\n✅ 自动收集已停止');
  }, 10000);
}

// ============== 示例 2: 手动收集指标 ==============

/**
 * 示例 2.1: 手动收集所有系统指标
 */
function example2_manualCollection() {
  console.log('\n=== 示例 2.1: 手动收集指标 ===\n');

  const collector = new MetricsCollector();

  // 手动收集一次
  collector.collectAllMetrics();

  // 查询 CPU 指标
  const cpuMetrics = collector.queryMetrics({ type: 'cpu' });
  console.log(`📊 收集到 ${cpuMetrics.length} 个 CPU 指标`);

  // 查询内存指标
  const memoryMetrics = collector.queryMetrics({ type: 'memory' });
  console.log(`📊 收集到 ${memoryMetrics.length} 个内存指标`);

  // 查询磁盘指标
  const diskMetrics = collector.queryMetrics({ type: 'disk' });
  console.log(`📊 收集到 ${diskMetrics.length} 个磁盘指标`);

  // 获取最新 CPU 使用率
  const latestCpu = collector.getLatestMetric('cpu_usage');
  if (latestCpu) {
    console.log(`\n💡 最新 CPU 使用率：${latestCpu.value.toFixed(2)}%`);
  }

  // 获取最新内存使用率
  const latestMemory = collector.getLatestMetric('memory_usage');
  if (latestMemory) {
    console.log(`💡 最新内存使用率：${latestMemory.value.toFixed(2)}%`);
  }
}

/**
 * 示例 2.2: 添加自定义指标
 */
function example2_customMetrics() {
  console.log('\n=== 示例 2.2: 自定义指标 ===\n');

  const collector = new MetricsCollector();

  // 添加自定义指标：API 响应时间
  collector.addCustomMetric('api_response_time', 125.5, 'ms', {
    endpoint: '/api/users',
    method: 'GET',
  });

  collector.addCustomMetric('api_response_time', 89.2, 'ms', {
    endpoint: '/api/users',
    method: 'GET',
  });

  collector.addCustomMetric('api_response_time', 234.7, 'ms', {
    endpoint: '/api/users',
    method: 'GET',
  });

  // 添加自定义指标：数据库连接数
  collector.addCustomMetric('db_connections', 45, 'count', {
    database: 'postgres',
    pool: 'main',
  });

  // 查询自定义指标
  const apiMetrics = collector.queryMetrics({ name: 'api_response_time' });
  console.log(`📊 API 响应时间数据点：${apiMetrics.length}`);

  apiMetrics.forEach((metric, index) => {
    console.log(`   [${index + 1}] ${metric.value} ${metric.unit}`);
  });
}

// ============== 示例 3: 指标聚合 ==============

/**
 * 示例 3.1: 基础聚合统计
 */
function example3_aggregation() {
  console.log('\n=== 示例 3.1: 基础聚合统计 ===\n');

  const collector = new MetricsCollector();

  // 模拟一些数据
  const now = Date.now();
  for (let i = 0; i < 100; i++) {
    // 使用 addCustomMetric 并手动设置时间戳 (通过 metadata 传递)
    collector.addCustomMetric(
      'response_time',
      Math.random() * 200 + 50, // 50-250ms
      'ms',
      { _timestamp: (now + i * 1000).toString() }
    );
  }

  // 聚合统计
  const aggregated = collector.aggregateMetrics('response_time', {
    calculatePercentiles: true,
    calculateStdDev: true,
  });

  console.log(`📊 响应时间统计:`);
  console.log(`   数据点数：${aggregated.count}`);
  console.log(`   平均值：${aggregated.avg.toFixed(2)} ms`);
  console.log(`   最大值：${aggregated.max.toFixed(2)} ms`);
  console.log(`   最小值：${aggregated.min.toFixed(2)} ms`);
  console.log(`   标准差：${aggregated.stddev?.toFixed(2) || 'N/A'} ms`);
  
  if (aggregated.percentiles) {
    console.log(`\n   百分位数:`);
    console.log(`   P50: ${aggregated.percentiles.p50.toFixed(2)} ms`);
    console.log(`   P90: ${aggregated.percentiles.p90.toFixed(2)} ms`);
    console.log(`   P95: ${aggregated.percentiles.p95.toFixed(2)} ms`);
    console.log(`   P99: ${aggregated.percentiles.p99.toFixed(2)} ms`);
  }
}

/**
 * 示例 3.2: 按时间窗口聚合
 */
function example3_windowAggregation() {
  console.log('\n=== 示例 3.2: 按时间窗口聚合 ===\n');

  const collector = new MetricsCollector();

  // 模拟 5 分钟的数据 (每 10 秒一个点)
  const now = Date.now();
  for (let i = 0; i < 30; i++) {
    collector.addCustomMetric(
      'cpu_usage',
      Math.random() * 40 + 30, // 30-70%
      'percent',
      { _timestamp: (now + i * 10000).toString() }
    );
  }

  // 按 1 分钟窗口聚合
  const windows = collector.aggregateByWindow('cpu_usage', 60);

  console.log(`📊 按 1 分钟窗口聚合 CPU 使用率:\n`);
  windows.forEach((window, index) => {
    const startTime = new Date(window.timeRange.start).toLocaleTimeString();
    console.log(`   [${index + 1}] ${startTime} - 平均：${window.avg.toFixed(2)}% (数据点：${window.count})`);
  });
}

// ============== 示例 4: 告警管理 ==============

/**
 * 示例 4.1: 添加告警规则
 */
function example4_alertRules() {
  console.log('\n=== 示例 4.1: 告警规则管理 ===\n');

  const collector = new MetricsCollector();

  // 添加 CPU 使用率告警
  collector.addAlertRule({
    name: 'CPU 使用率过高',
    level: 'warning',
    condition: {
      metricName: 'cpu_usage',
      operator: '>',
      threshold: 80,
      aggregator: 'avg',
      window: 60, // 1 分钟窗口
    },
    message: '⚠️ CPU 使用率持续过高，请检查系统负载',
    cooldown: 300, // 5 分钟冷却时间
    enabled: true,
  });

  // 添加内存使用率严重告警
  collector.addAlertRule({
    name: '内存使用率严重',
    level: 'critical',
    condition: {
      metricName: 'memory_usage',
      operator: '>',
      threshold: 90,
      aggregator: 'max',
      window: 30,
    },
    message: '🚨 内存使用率超过 90%，系统可能崩溃',
    cooldown: 60,
    enabled: true,
  });

  // 添加 API 响应时间告警
  collector.addAlertRule({
    name: 'API 响应时间过长',
    level: 'warning',
    condition: {
      metricName: 'api_response_time',
      operator: '>',
      threshold: 500,
      aggregator: 'avg',
      window: 60,
    },
    message: '⚠️ API 响应时间超过 500ms',
    cooldown: 120,
    enabled: true,
  });

  console.log('✅ 已添加 3 个告警规则:');
  console.log('   1. CPU 使用率过高 (>80%)');
  console.log('   2. 内存使用率严重 (>90%)');
  console.log('   3. API 响应时间过长 (>500ms)');
}

/**
 * 示例 4.2: 触发告警
 */
function example4_triggerAlerts() {
  console.log('\n=== 示例 4.2: 触发告警 ===\n');

  const collector = new MetricsCollector();

  // 添加告警规则
  collector.addAlertRule({
    name: 'CPU 使用率过高',
    level: 'warning',
    condition: {
      metricName: 'cpu_usage',
      operator: '>',
      threshold: 80,
      aggregator: 'avg',
      window: 60,
    },
    enabled: true,
  });

  // 添加告警规则
  collector.addAlertRule({
    name: '响应时间过长',
    level: 'critical',
    condition: {
      metricName: 'response_time',
      operator: '>',
      threshold: 1000,
      aggregator: 'max',
      window: 60,
    },
    enabled: true,
  });

  // 模拟高 CPU 使用率
  const now = Date.now();
  for (let i = 0; i < 10; i++) {
    collector.addCustomMetric('cpu_usage', 85 + Math.random() * 10, 'percent');
    collector.metrics[collector.metrics.length - 1].timestamp = now + i * 1000;
  }

  // 模拟高响应时间
  for (let i = 0; i < 10; i++) {
    collector.addCustomMetric('response_time', 1200 + Math.random() * 300, 'ms');
    collector.metrics[collector.metrics.length - 1].timestamp = now + i * 1000;
  }

  // 检查告警
  const triggeredAlerts = collector.checkAlertRules();

  if (triggeredAlerts.length > 0) {
    console.log(`🚨 触发了 ${triggeredAlerts.length} 个告警:\n`);
    triggeredAlerts.forEach((alert, index) => {
      console.log(`   [${index + 1}] ${alert.ruleName}`);
      console.log(`       级别：${alert.level.toUpperCase()}`);
      console.log(`       当前值：${alert.currentValue.toFixed(2)}`);
      console.log(`       阈值：${alert.threshold}`);
      console.log(`       消息：${alert.message}`);
      console.log(`       时间：${new Date(alert.triggeredAt).toLocaleTimeString()}\n`);
    });
  } else {
    console.log('✅ 未触发任何告警');
  }

  // 获取活跃告警
  const activeAlerts = collector.getActiveAlerts();
  console.log(`📊 当前活跃告警数：${activeAlerts.length}`);
}

/**
 * 示例 4.3: 告警历史查询
 */
function example4_alertHistory() {
  console.log('\n=== 示例 4.3: 告警历史查询 ===\n');

  const collector = new MetricsCollector();

  // 模拟一些告警
  const now = Date.now();
  for (let i = 0; i < 5; i++) {
    collector.alertHistory.push({
      id: `alert-${i}`,
      ruleId: `rule-${i % 2}`,
      ruleName: i % 2 === 0 ? 'CPU 使用率过高' : '内存使用率过高',
      level: i % 2 === 0 ? 'warning' : 'critical',
      triggeredAt: now - i * 60000,
      currentValue: 85 + i,
      threshold: 80,
      message: `告警消息 ${i}`,
      resolved: i > 2,
      resolvedAt: i > 2 ? now - i * 60000 + 30000 : undefined,
    });
  }

  // 查询所有告警
  const allAlerts = collector.getAlertHistory();
  console.log(`📊 总告警数：${allAlerts.length}`);

  // 按级别查询
  const criticalAlerts = collector.getAlertHistory({ level: 'critical' });
  console.log(`🔴 严重告警数：${criticalAlerts.length}`);

  // 查询未解决告警
  const unresolvedAlerts = collector.getAlertHistory({ resolved: false });
  console.log(`⏳ 未解决告警数：${unresolvedAlerts.length}`);

  // 解决告警
  if (allAlerts.length > 0) {
    collector.resolveAlert(allAlerts[0].id);
    console.log(`\n✅ 已解决告警：${allAlerts[0].ruleName}`);
  }
}

// ============== 示例 5: 数据导出 ==============

/**
 * 示例 5.1: 导出为 JSON
 */
function example5_exportJson() {
  console.log('\n=== 示例 5.1: 导出为 JSON ===\n');

  const collector = new MetricsCollector();

  // 添加一些数据
  for (let i = 0; i < 10; i++) {
    collector.addCustomMetric('test_metric', Math.random() * 100, 'units');
  }

  // 导出为 JSON
  const json = collector.exportToJson();
  console.log('📄 JSON 导出 (前 200 字符):');
  console.log(json.substring(0, 200) + '...\n');
}

/**
 * 示例 5.2: 导出为 CSV
 */
function example5_exportCsv() {
  console.log('\n=== 示例 5.2: 导出为 CSV ===\n');

  const collector = new MetricsCollector();

  // 添加一些数据
  for (let i = 0; i < 5; i++) {
    collector.addCustomMetric('test_metric', Math.random() * 100, 'units');
  }

  // 导出为 CSV
  const csv = collector.exportToCsv();
  console.log('📄 CSV 导出:');
  console.log(csv);
}

// ============== 示例 6: 实际应用场景 ==============

/**
 * 示例 6.1: 监控系统健康状态
 */
function example6_monitoring() {
  console.log('\n=== 示例 6.1: 系统健康监控 ===\n');

  const collector = new MetricsCollector({
    collectionInterval: 10000, // 10 秒
    retentionPeriod: 7200,     // 2 小时
  });

  // 配置告警规则
  collector.addAlertRule({
    name: '系统负载过高',
    level: 'warning',
    condition: {
      metricName: 'cpu_load1',
      operator: '>',
      threshold: os.cpus().length * 0.8, // CPU 核心数的 80%
      aggregator: 'avg',
      window: 60,
    },
    cooldown: 300,
    enabled: true,
  });

  collector.addAlertRule({
    name: '内存不足',
    level: 'critical',
    condition: {
      metricName: 'memory_usage',
      operator: '>',
      threshold: 85,
      aggregator: 'avg',
      window: 60,
    },
    cooldown: 120,
    enabled: true,
  });

  // 启动监控
  collector.startAutoCollection();

  console.log('✅ 系统监控已启动');
  console.log('   - 每 10 秒收集一次指标');
  console.log('   - 数据保留 2 小时');
  console.log('   - 配置了 2 个告警规则\n');

  // 5 秒后显示当前状态
  setTimeout(() => {
    const cpu = collector.getLatestMetric('cpu_usage');
    const memory = collector.getLatestMetric('memory_usage');

    console.log('📊 当前系统状态:');
    if (cpu) {
      console.log(`   CPU 使用率：${cpu.value.toFixed(2)}%`);
    }
    if (memory) {
      console.log(`   内存使用率：${memory.value.toFixed(2)}%`);
    }

    const activeAlerts = collector.getActiveAlerts();
    if (activeAlerts.length > 0) {
      console.log(`\n🚨 活跃告警：${activeAlerts.length}`);
    } else {
      console.log('\n✅ 无活跃告警');
    }

    collector.stopAutoCollection();
  }, 5000);
}

/**
 * 示例 6.2: 性能分析
 */
function example6_performanceAnalysis() {
  console.log('\n=== 示例 6.2: 性能分析 ===\n');

  const collector = new MetricsCollector();

  // 模拟 API 性能数据
  const now = Date.now();
  for (let i = 0; i < 60; i++) {
    // 模拟响应时间 (有波动)
    const baseTime = 100;
    const noise = Math.random() * 50;
    const spike = i > 40 && i < 50 ? 200 : 0; // 模拟性能下降
    
    collector.addCustomMetric(
      'api_response_time',
      baseTime + noise + spike,
      'ms'
    );
    collector.metrics[collector.metrics.length - 1].timestamp = now + i * 1000;
  }

  // 整体统计
  const overall = collector.aggregateMetrics('api_response_time', {
    calculatePercentiles: true,
    calculateStdDev: true,
  });

  console.log('📊 API 响应时间整体分析:');
  console.log(`   平均：${overall.avg.toFixed(2)} ms`);
  console.log(`   P95: ${overall.percentiles?.p95.toFixed(2) || 'N/A'} ms`);
  console.log(`   P99: ${overall.percentiles?.p99.toFixed(2) || 'N/A'} ms`);
  console.log(`   标准差：${overall.stddev?.toFixed(2) || 'N/A'} ms\n`);

  // 按 15 秒窗口分析趋势
  const windows = collector.aggregateByWindow('api_response_time', 15);
  
  console.log('📈 时间趋势分析 (15 秒窗口):');
  windows.forEach((window, index) => {
    const trend = window.avg > 130 ? '⚠️ 偏高' : '✅ 正常';
    console.log(`   [${index + 1}] 平均：${window.avg.toFixed(2)} ms ${trend}`);
  });
}

// ============== 运行所有示例 ==============

import * as os from 'os';

// 注意：这些示例需要按顺序运行，避免冲突
// 在实际使用时，选择需要的示例运行

console.log('╔════════════════════════════════════════════════════════╗');
console.log('║  Metrics Utils Skill - 使用示例                        ║');
console.log('║  性能指标监控工具                                      ║');
console.log('╚════════════════════════════════════════════════════════╝\n');

// 运行示例 (取消注释以运行)
// example1_basic();
// example2_manualCollection();
// example2_customMetrics();
// example3_aggregation();
// example3_windowAggregation();
// example4_alertRules();
// example4_triggerAlerts();
// example4_alertHistory();
// example5_exportJson();
// example5_exportCsv();
// example6_monitoring();
// example6_performanceAnalysis();

// 导出所有示例函数
export {
  example1_basic,
  example2_manualCollection,
  example2_customMetrics,
  example3_aggregation,
  example3_windowAggregation,
  example4_alertRules,
  example4_triggerAlerts,
  example4_alertHistory,
  example5_exportJson,
  example5_exportCsv,
  example6_monitoring,
  example6_performanceAnalysis,
};

console.log('💡 提示：取消注释上面的函数调用来运行相应示例\n');
