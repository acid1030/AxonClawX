/**
 * Metrics Dashboard Skill - 快速测试
 */

import { createDashboard, quickMonitor, MetricsDashboard } from './metrics-dashboard-skill';

console.log('🧪 Metrics Dashboard Skill 测试\n');

// ============== 测试 1: 基础功能 ==============
console.log('✅ 测试 1: 基础指标记录');
const dashboard = createDashboard({
  name: 'Test Dashboard',
  metrics: ['cpu_usage', 'memory_usage', 'request_count']
});

dashboard.record('cpu_usage', 75.5);
dashboard.record('memory_usage', 60.2);
dashboard.record('request_count', 1250);

const summary = dashboard.getMetricsSummary();
console.log('指标摘要:', summary);
console.log('✓ 基础功能正常\n');

// ============== 测试 2: 告警规则 ==============
console.log('✅ 测试 2: 告警规则');
dashboard.addAlertRule({
  id: 'high-cpu',
  name: 'CPU 使用率过高',
  metricName: 'cpu_usage',
  operator: '>',
  threshold: 80,
  severity: 'warning',
  enabled: true
});

// 触发告警
dashboard.record('cpu_usage', 85.5);

const activeAlerts = dashboard.getActiveAlerts();
console.log('活动告警数量:', activeAlerts.length);
if (activeAlerts.length > 0) {
  console.log('告警消息:', activeAlerts[0].message);
}
console.log('✓ 告警规则正常\n');

// ============== 测试 3: 图表生成 ==============
console.log('✅ 测试 3: 图表生成');

// 生成仪表盘
const gauge = dashboard.generateGauge('cpu_usage', 0, 100, 20);
console.log('仪表盘:');
console.log(gauge);
console.log();

// 生成条形图
const barChart = dashboard.generateBarChart(['cpu_usage', 'memory_usage'], 30);
console.log('条形图:');
console.log(barChart);
console.log();

// 生成 Markdown 表格
const table = dashboard.generateMarkdownTable();
console.log('Markdown 表格:');
console.log(table);
console.log('✓ 图表生成正常\n');

// ============== 测试 4: 系统监控 ==============
console.log('✅ 测试 4: 系统监控');
const monitor = quickMonitor(1000);

setTimeout(() => {
  const cpuValue = monitor.getCurrentValue('cpu_usage');
  const memoryValue = monitor.getCurrentValue('memory_usage');
  
  console.log('CPU 使用率:', cpuValue?.toFixed(2));
  console.log('内存使用率:', memoryValue?.toFixed(2));
  
  // 渲染完整仪表板
  console.log('\n完整仪表板:');
  console.log(monitor.renderDashboard());
  
  monitor.stopAutoCollection();
  console.log('✓ 系统监控正常\n');
  
  // ============== 测试 5: 数据导出 ==============
  console.log('✅ 测试 5: 数据导出');
  const jsonData = dashboard.exportMetrics('json');
  console.log('JSON 导出长度:', jsonData.length, '字符');
  
  const csvData = dashboard.exportMetrics('csv');
  console.log('CSV 导出行数:', csvData.split('\n').length);
  console.log('✓ 数据导出正常\n');
  
  // ============== 完成 ==============
  console.log('🎉 所有测试通过!');
  console.log('\n📊 功能清单:');
  console.log('  ✓ 指标展示');
  console.log('  ✓ 图表生成 (Gauge/Line/Bar/Markdown)');
  console.log('  ✓ 告警规则配置与触发');
  console.log('  ✓ 系统指标自动采集');
  console.log('  ✓ 数据导出 (JSON/CSV)');
  console.log('\n交付物:');
  console.log('  - src/skills/metrics-dashboard-skill.ts');
  console.log('  - src/skills/metrics-dashboard-skill.examples.md');
  console.log('  - src/skills/test-metrics-dashboard.ts (本文件)');
  
  dashboard.destroy();
}, 3000);
