/**
 * 图表工具技能 - 快速使用示例
 * 
 * 复制以下代码片段开始使用图表工具
 */

import {
  asciiBarChart,
  asciiLineChart,
  asciiPieChart,
  visualizeData,
  heatmap,
  calculateStatistics,
  statisticalReport,
  asciiBoxplot,
  asciiHistogram
} from './src/skills/chart-utils-skill';

// ============================================
// 示例 1: 销售数据条形图
// ============================================
const salesData = [
  {label: 'Q1', value: 45000},
  {label: 'Q2', value: 72000},
  {label: 'Q3', value: 58000},
  {label: 'Q4', value: 89000}
];

console.log('销售数据条形图:');
console.log(asciiBarChart(salesData, {width: 30}));

// ============================================
// 示例 2: 温度变化折线图
// ============================================
const temperatures = [15, 18, 22, 25, 28, 30, 32, 31, 28, 24, 20, 17];

console.log('\n温度变化折线图:');
console.log(asciiLineChart(temperatures, {height: 10}));

// ============================================
// 示例 3: 市场份额饼图
// ============================================
const marketShare = [
  {label: '公司 A', value: 35},
  {label: '公司 B', value: 25},
  {label: '公司 C', value: 20},
  {label: '其他', value: 20}
];

console.log('\n市场份额饼图:');
console.log(asciiPieChart(marketShare, {radius: 8}));

// ============================================
// 示例 4: 月度数据可视化摘要
// ============================================
const monthlyData = [
  {x: '1 月', y: 120},
  {x: '2 月', y: 150},
  {x: '3 月', y: 180},
  {x: '4 月', y: 220},
  {x: '5 月', y: 190}
];

console.log('\n月度数据摘要:');
console.log(visualizeData(monthlyData));

// ============================================
// 示例 5: 相关性热力图
// ============================================
const correlationMatrix = [
  [1.0, 0.8, 0.6, 0.3],
  [0.8, 1.0, 0.7, 0.4],
  [0.6, 0.7, 1.0, 0.5],
  [0.3, 0.4, 0.5, 1.0]
];

console.log('\n相关性热力图:');
console.log(heatmap(correlationMatrix));

// ============================================
// 示例 6: 完整统计报告
// ============================================
const surveyData = [45, 52, 48, 61, 55, 59, 63, 57, 54, 50, 58, 62, 66, 70, 68];

console.log('\n调查数据统计报告:');
console.log(statisticalReport(surveyData));

// ============================================
// 示例 7: 数据分布箱线图
// ============================================
console.log('\n数据分布箱线图:');
console.log(asciiBoxplot(surveyData));

// ============================================
// 示例 8: 成绩分布直方图
// ============================================
const scores = Array.from({length: 200}, () => 
  Math.floor(Math.random() * 41) + 60 // 60-100 分
);

console.log('\n成绩分布直方图:');
console.log(asciiHistogram(scores, 8));

// ============================================
// 示例 9: 组合使用 - 数据分析仪表板
// ============================================
function createDashboard(data: number[], label: string) {
  const stats = calculateStatistics(data);
  
  console.log(`\n📊 ${label} 分析仪表板`);
  console.log('═'.repeat(60));
  console.log(`数据点：${stats.count} | 平均值：${stats.mean.toFixed(2)} | 中位数：${stats.median}`);
  console.log(`范围：${stats.min} - ${stats.max} | 标准差：${stats.stdDev.toFixed(2)}`);
  console.log('═'.repeat(60));
  
  console.log('\n分布直方图:');
  console.log(asciiHistogram(data, 6));
  
  console.log('\n箱线图:');
  console.log(asciiBoxplot(data));
}

// 运行仪表板示例
createDashboard(scores, '成绩分析');
