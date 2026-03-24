/**
 * KAEL 数据分析工具 - 使用示例
 * 
 * 运行方式：uv run tsx src/skills/analyze-utils-skill.examples.ts
 */

import { descriptiveStats, trendAnalysis, detectAnomalies, analyze } from './analyze-utils-skill';

// ==================== 示例 1: 描述性统计 ====================

console.log('\n📊 示例 1: 描述性统计\n');

const salesData = [120, 150, 180, 220, 190, 250, 280, 310, 290, 340, 380, 420];

const stats = descriptiveStats(salesData);
console.log('销售数据统计:');
console.log(`  平均值：${stats.mean.toFixed(2)}`);
console.log(`  中位数：${stats.median.toFixed(2)}`);
console.log(`  标准差：${stats.stdDev.toFixed(2)}`);
console.log(`  最小值：${stats.min}`);
console.log(`  最大值：${stats.max}`);
console.log(`  四分位距 (IQR): ${stats.iqr.toFixed(2)}`);
console.log(`  偏度：${stats.skewness.toFixed(3)}`);
console.log(`  峰度：${stats.kurtosis.toFixed(3)}`);

// ==================== 示例 2: 趋势分析 ====================

console.log('\n📈 示例 2: 趋势分析\n');

const monthlyUsers = [1000, 1200, 1500, 1800, 2300, 2800, 3500, 4200, 5000, 6100, 7500, 9000];

const trend = trendAnalysis(monthlyUsers, 3, 3);
console.log('用户增长趋势:');
console.log(`  趋势方向：${trend.direction === 'up' ? '📈 上升' : trend.direction === 'down' ? '📉 下降' : '➡️ 稳定'}`);
console.log(`  增长率：${trend.growthRate.toFixed(2)}%`);
console.log(`  线性拟合 R²: ${trend.rSquared.toFixed(3)}`);
console.log(`  斜率：${trend.slope.toFixed(2)} (每月增长)`);
console.log(`  移动平均 (3 个月): ${trend.movingAverage.map(m => m.toFixed(0)).join(', ')}`);
console.log(`  未来 3 个月预测：${trend.predictions.map(p => p.toFixed(0)).join(', ')}`);

// ==================== 示例 3: 异常检测 ====================

console.log('\n🔍 示例 3: 异常检测\n');

const temperatureData = [22, 23, 24, 23, 25, 24, 100, 23, 24, 25, 24, -15, 23, 24];

const anomalies = detectAnomalies(temperatureData, 'both', 3);
console.log('温度数据异常检测:');
console.log(`  检测方法：${anomalies.method}`);
console.log(`  总数据点：${anomalies.totalPoints}`);
console.log(`  异常点数量：${anomalies.anomalyCount}`);
console.log(`  异常比例：${anomalies.anomalyPercentage.toFixed(1)}%`);
console.log(`  异常值：${anomalies.anomalies.join(', ')}`);
console.log(`  异常位置：${anomalies.anomalyIndices.join(', ')}`);

// ==================== 示例 4: 综合分析 ====================

console.log('\n📋 示例 4: 综合分析报告\n');

const stockPrices = [
  { value: 100 }, { value: 102 }, { value: 98 }, { value: 105 }, 
  { value: 103 }, { value: 107 }, { value: 150 }, { value: 109 }, 
  { value: 112 }, { value: 115 }, { value: 118 }, { value: 120 }
];

const report = analyze(stockPrices, {
  windowSize: 3,
  predictSteps: 2,
  anomalyMethod: 'both',
  anomalyThreshold: 3,
});

console.log(report.summary);

// ==================== 示例 5: 时间序列数据 ====================

console.log('\n⏰ 示例 5: 时间序列数据\n');

const timeSeriesData = [
  { timestamp: Date.now() - 3600000 * 5, value: 45, label: '09:00' },
  { timestamp: Date.now() - 3600000 * 4, value: 52, label: '10:00' },
  { timestamp: Date.now() - 3600000 * 3, value: 58, label: '11:00' },
  { timestamp: Date.now() - 3600000 * 2, value: 61, label: '12:00' },
  { timestamp: Date.now() - 3600000 * 1, value: 55, label: '13:00' },
  { timestamp: Date.now(), value: 63, label: '14:00' },
];

const timeStats = descriptiveStats(timeSeriesData);
const timeTrend = trendAnalysis(timeSeriesData, 2, 2);

console.log('小时级数据监控:');
console.log(`  当前值：${timeSeriesData[timeSeriesData.length - 1].value}`);
console.log(`  平均值：${timeStats.mean.toFixed(2)}`);
console.log(`  波动范围：${timeStats.stdDev.toFixed(2)}`);
console.log(`  趋势：${timeTrend.direction === 'up' ? '上升' : '下降'}`);
console.log(`  预测下 2 小时：${timeTrend.predictions.map(p => p.toFixed(1)).join(', ')}`);

// ==================== 示例 6: 性能基准测试 ====================

console.log('\n⚡ 示例 6: 性能测试\n');

const largeDataset = Array.from({ length: 10000 }, () => Math.random() * 1000);

const startTime = Date.now();
const largeAnalysis = analyze(largeDataset, {
  windowSize: 10,
  predictSteps: 5,
  anomalyMethod: 'both',
  anomalyThreshold: 3,
});
const endTime = Date.now();

console.log('万级数据点性能测试:');
console.log(`  数据量：${largeDataset.length}`);
console.log(`  分析耗时：${endTime - startTime}ms`);
console.log(`  异常检测：${largeAnalysis.anomalies.anomalyCount} 个异常点`);
console.log(`  趋势方向：${largeAnalysis.trend.direction}`);

// ==================== 示例 7: 实际业务场景 ====================

console.log('\n💼 示例 7: 电商业务场景\n');

// 每日订单量
const dailyOrders = [234, 256, 289, 312, 298, 445, 523, 267, 289, 301, 334, 356, 378, 401, 423];

const orderAnalysis = analyze(dailyOrders, {
  windowSize: 7, // 周移动平均
  predictSteps: 7, // 预测下周
  anomalyMethod: 'both',
  anomalyThreshold: 2.5, // 更敏感的异常检测
});

console.log('电商订单分析周报:');
console.log(`  本周平均订单：${orderAnalysis.descriptive.mean.toFixed(0)}`);
console.log(`  订单波动率：${(orderAnalysis.descriptive.stdDev / orderAnalysis.descriptive.mean * 100).toFixed(1)}%`);
console.log(`  周增长率：${orderAnalysis.trend.growthRate.toFixed(1)}%`);
console.log(`  周末效应：${dailyOrders[5] > orderAnalysis.descriptive.mean ? '明显' : '不明显'} (周六：${dailyOrders[5]}, 周日：${dailyOrders[6]})`);
if (orderAnalysis.anomalies.anomalyCount > 0) {
  console.log(`  ⚠️  异常日期：第 ${orderAnalysis.anomalies.anomalyIndices.map(i => i + 1).join(', ')} 天`);
}
console.log(`  下周预测：${orderAnalysis.trend.predictions.map(p => p.toFixed(0)).join(', ')}`);

console.log('\n✅ 所有示例执行完成!\n');
