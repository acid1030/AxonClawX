/**
 * Report Utils Skill - 使用示例
 * 
 * 演示如何使用报表工具技能进行：
 * 1. 数据聚合
 * 2. 图表数据准备
 * 3. 报表导出
 */

import {
  DataAggregator,
  ChartDataPreparator,
  ReportExporter,
  aggregateData,
  prepareChartData,
  exportReport,
  type DataRecord,
  type AggregationConfig,
  type ReportConfig,
} from './report-utils-skill';

// ==================== 示例数据 ====================

const salesData: DataRecord[] = [
  { region: 'North', product: 'Product A', amount: 1000, date: '2024-01' },
  { region: 'North', product: 'Product B', amount: 1500, date: '2024-01' },
  { region: 'North', product: 'Product A', amount: 1200, date: '2024-02' },
  { region: 'North', product: 'Product B', amount: 1800, date: '2024-02' },
  { region: 'South', product: 'Product A', amount: 2000, date: '2024-01' },
  { region: 'South', product: 'Product B', amount: 2500, date: '2024-01' },
  { region: 'South', product: 'Product A', amount: 2200, date: '2024-02' },
  { region: 'South', product: 'Product B', amount: 2800, date: '2024-02' },
  { region: 'East', product: 'Product A', amount: 1500, date: '2024-01' },
  { region: 'East', product: 'Product B', amount: 1700, date: '2024-01' },
  { region: 'East', product: 'Product A', amount: 1600, date: '2024-02' },
  { region: 'East', product: 'Product B', amount: 1900, date: '2024-02' },
];

const monthlyData: DataRecord[] = [
  { month: '2024-01', revenue: 10000, cost: 8000, profit: 2000 },
  { month: '2024-02', revenue: 12000, cost: 9000, profit: 3000 },
  { month: '2024-03', revenue: 15000, cost: 10000, profit: 5000 },
  { month: '2024-04', revenue: 14000, cost: 9500, profit: 4500 },
  { month: '2024-05', revenue: 18000, cost: 11000, profit: 7000 },
  { month: '2024-06', revenue: 20000, cost: 12000, profit: 8000 },
];

// ==================== 示例 1: 基础数据聚合 ====================

console.log('=== 示例 1: 按地区聚合销售数据 ===');

const regionAggConfig: AggregationConfig = {
  groupBy: 'region',
  aggregations: [
    { field: 'amount', operation: 'sum', alias: 'totalAmount' },
    { field: 'amount', operation: 'avg', alias: 'avgAmount' },
    { field: 'product', operation: 'count', alias: 'transactionCount' },
  ],
};

const regionAggregated = aggregateData(salesData, regionAggConfig);
console.log('按地区聚合结果:');
console.table(regionAggregated);
// 输出:
// | region | totalAmount | avgAmount | transactionCount |
// |--------|-------------|-----------|------------------|
// | North  | 5500        | 1375      | 4                |
// | South  | 9500        | 2375      | 4                |
// | East   | 6700        | 1675      | 4                |

// ==================== 示例 2: 多字段分组聚合 ====================

console.log('\n=== 示例 2: 按地区 + 产品分组聚合 ===');

const multiGroupConfig: AggregationConfig = {
  groupBy: ['region', 'product'],
  aggregations: [
    { field: 'amount', operation: 'sum', alias: 'totalAmount' },
    { field: 'amount', operation: 'max', alias: 'maxAmount' },
  ],
};

const multiGroupAggregated = aggregateData(salesData, multiGroupConfig);
console.log('按地区 + 产品分组结果:');
console.table(multiGroupAggregated);
// 输出:
// | region | product   | totalAmount | maxAmount |
// |--------|-----------|-------------|-----------|
// | North  | Product A | 2200        | 1200      |
// | North  | Product B | 3300        | 1800      |
// | South  | Product A | 4200        | 2200      |
// | South  | Product B | 5300        | 2800      |
// | East   | Product A | 3100        | 1600      |
// | East   | Product B | 3600        | 1900      |

// ==================== 示例 3: 准备柱状图数据 ====================

console.log('\n=== 示例 3: 准备柱状图数据 ===');

const barChartData = prepareChartData(regionAggregated, 'bar', 'region', 'totalAmount');
console.log('柱状图数据:');
console.log(JSON.stringify(barChartData, null, 2));
// 输出:
// {
//   "labels": ["North", "South", "East"],
//   "datasets": [{
//     "label": "totalAmount",
//     "data": [5500, 9500, 6700],
//     "backgroundColor": "rgba(99, 102, 241, 0.6)",
//     "borderColor": "rgba(99, 102, 241, 1)",
//     "fill": false
//   }]
// }

// ==================== 示例 4: 准备多系列柱状图 ====================

console.log('\n=== 示例 4: 准备多系列柱状图 ===');

const productBarChart = prepareChartData(salesData, 'bar', 'region', 'amount', 'product');
console.log('多系列柱状图数据:');
console.log(JSON.stringify(productBarChart, null, 2));

// ==================== 示例 5: 准备折线图数据 ====================

console.log('\n=== 示例 5: 准备折线图数据 ===');

const lineChartData = prepareChartData(
  monthlyData,
  'line',
  'month',
  ['revenue', 'cost', 'profit']
);
console.log('折线图数据:');
console.log(JSON.stringify(lineChartData, null, 2));
// 输出包含 revenue, cost, profit 三条线的数据集

// ==================== 示例 6: 准备饼图数据 ====================

console.log('\n=== 示例 6: 准备饼图数据 ===');

const pieChartData = prepareChartData(regionAggregated, 'pie', 'region', 'totalAmount');
console.log('饼图数据:');
console.log(JSON.stringify(pieChartData, null, 2));
// 输出:
// {
//   "labels": ["North", "South", "East"],
//   "values": [5500, 9500, 6700],
//   "colors": ["#6366f1", "#10b981", "#ef4444"]
// }

// ==================== 示例 7: 导出 CSV 报表 ====================

console.log('\n=== 示例 7: 导出 CSV 报表 ===');

const csvConfig: ReportConfig = {
  title: 'Sales Report by Region',
  format: 'csv',
  includeCharts: false,
  includeSummary: true,
};

const csvReport = await exportReport(regionAggregated, csvConfig);
console.log('CSV 报表内容:');
console.log(csvReport);
// 输出:
// region,totalAmount,avgAmount,transactionCount
// North,5500,1375,4
// South,9500,2375,4
// East,6700,1675,4

// ==================== 示例 8: 导出 JSON 报表 ====================

console.log('\n=== 示例 8: 导出 JSON 报表 ===');

const jsonConfig: ReportConfig = {
  title: 'Monthly Performance Report',
  format: 'json',
  includeCharts: false,
  includeSummary: true,
};

const jsonReport = await exportReport(monthlyData, jsonConfig);
console.log('JSON 报表内容:');
console.log(jsonReport);

// ==================== 示例 9: 使用类进行高级操作 ====================

console.log('\n=== 示例 9: 使用 DataAggregator 类 ===');

const aggregator = new DataAggregator(salesData);
const customAggregated = aggregator.aggregate({
  groupBy: 'region',
  aggregations: [
    { field: 'amount', operation: 'sum' },
    { field: 'amount', operation: 'min', alias: 'minAmount' },
    { field: 'amount', operation: 'max', alias: 'maxAmount' },
  ],
});
console.log('自定义聚合结果:');
console.table(customAggregated);

// ==================== 示例 10: 使用 ChartDataPreparator 类 ====================

console.log('\n=== 示例 10: 使用 ChartDataPreparator 类 ===');

const barChart = ChartDataPreparator.prepareBarChart(
  regionAggregated,
  'region',
  'totalAmount'
);
console.log('柱状图 (类方式):');
console.log(JSON.stringify(barChart, null, 2));

const lineChart = ChartDataPreparator.prepareLineChart(
  monthlyData,
  'month',
  ['revenue', 'profit']
);
console.log('折线图 (类方式):');
console.log(JSON.stringify(lineChart, null, 2));

const pieChart = ChartDataPreparator.preparePieChart(
  regionAggregated,
  'region',
  'totalAmount'
);
console.log('饼图 (类方式):');
console.log(JSON.stringify(pieChart, null, 2));

// ==================== 示例 11: 使用 ReportExporter 类 ====================

console.log('\n=== 示例 11: 使用 ReportExporter 类 ===');

const exporter = new ReportExporter(monthlyData, {
  title: 'Monthly Report',
  format: 'csv',
  includeCharts: false,
  includeSummary: false,
});

const exportedCSV = await exporter.export();
console.log('导出的 CSV:');
console.log(exportedCSV);

// ==================== 示例 12: 实际业务场景 - 销售仪表板 ====================

console.log('\n=== 示例 12: 实际业务场景 - 销售仪表板 ===');

// 1. 聚合各地区销售总额
const regionSummary = aggregateData(salesData, {
  groupBy: 'region',
  aggregations: [{ field: 'amount', operation: 'sum', alias: 'total' }],
});

// 2. 准备仪表板图表数据
const dashboardCharts = {
  regionBar: prepareChartData(regionSummary, 'bar', 'region', 'total'),
  productPie: prepareChartData(
    aggregateData(salesData, {
      groupBy: 'product',
      aggregations: [{ field: 'amount', operation: 'sum', alias: 'total' }],
    }),
    'pie',
    'product',
    'total'
  ),
  trendLine: prepareChartData(monthlyData, 'line', 'month', ['revenue', 'profit']),
};

console.log('仪表板图表数据已准备:');
console.log('- 地区销售柱状图:', dashboardCharts.regionBar.labels.length, '个数据点');
console.log('- 产品分布饼图:', dashboardCharts.productPie.labels.length, '个数据点');
console.log('- 趋势折线图:', dashboardCharts.trendLine.labels.length, '个数据点');

// 3. 导出报表
const dashboardReport = await exportReport(salesData, {
  title: 'Sales Dashboard Report',
  format: 'csv',
  includeCharts: false,
  includeSummary: true,
});

console.log('仪表板报表已导出，长度:', dashboardReport.length, '字符');

// ==================== 完成 ====================

console.log('\n✅ 所有示例执行完成！');
console.log('📊 报表工具技能功能演示结束');
