/**
 * KAEL 数据分析工具 - 使用示例 (纯 JS 版本)
 * 
 * 运行方式：uv run node src/skills/analyze-utils-skill.examples.js
 */

// ==================== 工具函数 ====================

function sum(arr) {
  return arr.reduce((acc, val) => acc + val, 0);
}

function mean(arr) {
  if (arr.length === 0) return 0;
  return sum(arr) / arr.length;
}

function median(arr) {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 
    ? sorted[mid] 
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

function standardDeviation(arr, avg) {
  if (arr.length === 0) return 0;
  const avgValue = avg ?? mean(arr);
  const squareDiffs = arr.map(val => Math.pow(val - avgValue, 2));
  return Math.sqrt(mean(squareDiffs));
}

function quantile(arr, q) {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  if (sorted[base + 1] !== undefined) {
    return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
  }
  return sorted[base];
}

// ==================== 主功能函数 ====================

function descriptiveStats(data) {
  const values = data.map(d => typeof d === 'object' ? d.value : d);
  
  if (values.length === 0) {
    throw new Error('数据不能为空');
  }
  
  const avg = mean(values);
  const stdDevVal = standardDeviation(values, avg);
  const q1 = quantile(values, 0.25);
  const q3 = quantile(values, 0.75);
  
  return {
    count: values.length,
    mean: avg,
    median: median(values),
    stdDev: stdDevVal,
    variance: sum(values.map(val => Math.pow(val - avg, 2))) / values.length,
    min: Math.min(...values),
    max: Math.max(...values),
    range: Math.max(...values) - Math.min(...values),
    q1,
    q3,
    iqr: q3 - q1,
  };
}

function trendAnalysis(data, windowSize = 3, predictSteps = 0) {
  const values = data.map(d => typeof d === 'object' ? d.value : d);
  
  if (values.length < 2) {
    throw new Error('数据点不足，至少需要 2 个点');
  }
  
  const n = values.length;
  const xMean = (n - 1) / 2;
  const yMean = mean(values);
  
  let numerator = 0;
  let denominator = 0;
  
  values.forEach((y, x) => {
    numerator += (x - xMean) * (y - yMean);
    denominator += Math.pow(x - xMean, 2);
  });
  
  const slope = denominator !== 0 ? numerator / denominator : 0;
  const intercept = yMean - slope * xMean;
  
  const yPredicted = values.map((_, x) => slope * x + intercept);
  const ssRes = sum(values.map((y, i) => Math.pow(y - yPredicted[i], 2)));
  const ssTot = sum(values.map(y => Math.pow(y - yMean, 2)));
  const rSquared = ssTot !== 0 ? 1 - ssRes / ssTot : 0;
  
  const direction = slope > 0.01 ? 'up' : slope < -0.01 ? 'down' : 'stable';
  const growthRate = values.length > 1 
    ? ((values[values.length - 1] - values[0]) / values[0]) * 100 
    : 0;
  
  const movingAverage = [];
  for (let i = 0; i < values.length; i++) {
    if (i < windowSize - 1) {
      movingAverage.push(mean(values.slice(0, i + 1)));
    } else {
      movingAverage.push(mean(values.slice(i - windowSize + 1, i + 1)));
    }
  }
  
  const predictions = [];
  for (let i = 1; i <= predictSteps; i++) {
    predictions.push(slope * (n - 1 + i) + intercept);
  }
  
  return { slope, intercept, rSquared, direction, growthRate, movingAverage, predictions };
}

function detectAnomalies(data, method = 'both', threshold = 3) {
  const values = data.map(d => typeof d === 'object' ? d.value : d);
  
  if (values.length < 3) {
    throw new Error('数据点不足，至少需要 3 个点');
  }
  
  const anomalies = new Set();
  const anomalyIndices = new Set();
  
  if (method === 'zscore' || method === 'both') {
    const avg = mean(values);
    const stdDevVal = standardDeviation(values, avg);
    const zThreshold = threshold;
    
    values.forEach((val, idx) => {
      const zScore = stdDevVal !== 0 ? Math.abs((val - avg) / stdDevVal) : 0;
      if (zScore > zThreshold) {
        anomalies.add(val);
        anomalyIndices.add(idx);
      }
    });
  }
  
  if (method === 'iqr' || method === 'both') {
    const sorted = [...values].sort((a, b) => a - b);
    const q1 = quantile(sorted, 0.25);
    const q3 = quantile(sorted, 0.75);
    const iqr = q3 - q1;
    const iqrThreshold = 1.5;
    
    const lowerBound = q1 - iqr * iqrThreshold;
    const upperBound = q3 + iqr * iqrThreshold;
    
    values.forEach((val, idx) => {
      if (val < lowerBound || val > upperBound) {
        anomalies.add(val);
        anomalyIndices.add(idx);
      }
    });
  }
  
  return {
    anomalies: Array.from(anomalies),
    anomalyIndices: Array.from(anomalyIndices),
    method,
    threshold,
    totalPoints: values.length,
    anomalyCount: Array.from(anomalies).length,
    anomalyPercentage: (Array.from(anomalies).length / values.length) * 100,
  };
}

function analyze(data, options = {}) {
  const {
    windowSize = 3,
    predictSteps = 0,
    anomalyMethod = 'both',
    anomalyThreshold = 3,
  } = options;
  
  const descriptive = descriptiveStats(data);
  const trend = trendAnalysis(data, windowSize, predictSteps);
  const anomalies = detectAnomalies(data, anomalyMethod, anomalyThreshold);
  
  const summary = [
    `📊 数据分析报告`,
    `━━━━━━━━━━━━━━━━`,
    ``,
    `【数据概览】`,
    `  • 样本数量：${descriptive.count}`,
    `  • 平均值：${descriptive.mean.toFixed(2)}`,
    `  • 中位数：${descriptive.median.toFixed(2)}`,
    `  • 标准差：${descriptive.stdDev.toFixed(2)}`,
    `  • 范围：[${descriptive.min.toFixed(2)}, ${descriptive.max.toFixed(2)}]`,
    ``,
    `【趋势分析】`,
    `  • 方向：${trend.direction === 'up' ? '📈 上升' : trend.direction === 'down' ? '📉 下降' : '➡️ 稳定'}`,
    `  • 增长率：${trend.growthRate.toFixed(2)}%`,
    `  • 拟合度 (R²): ${trend.rSquared.toFixed(3)}`,
    ``,
    `【异常检测】`,
    `  • 异常点数量：${anomalies.anomalyCount} (${anomalies.anomalyPercentage.toFixed(1)}%)`,
    anomalies.anomalyCount > 0 ? `  • 异常值：${anomalies.anomalies.map(a => a.toFixed(2)).join(', ')}` : '',
  ].filter(l => l).join('\n');
  
  return { descriptive, trend, anomalies, summary };
}

// ==================== 示例执行 ====================

console.log('\n📊 KAEL 数据分析工具 - 使用示例\n');
console.log('═══════════════════════════════════════\n');

// 示例 1: 描述性统计
console.log('示例 1: 描述性统计');
const salesData = [120, 150, 180, 220, 190, 250, 280, 310, 290, 340, 380, 420];
const stats = descriptiveStats(salesData);
console.log(`销售数据：${salesData.join(', ')}`);
console.log(`  平均值：${stats.mean.toFixed(2)}`);
console.log(`  中位数：${stats.median.toFixed(2)}`);
console.log(`  标准差：${stats.stdDev.toFixed(2)}`);
console.log(`  范围：[${stats.min}, ${stats.max}]\n`);

// 示例 2: 趋势分析
console.log('示例 2: 趋势分析');
const monthlyUsers = [1000, 1200, 1500, 1800, 2300, 2800, 3500, 4200, 5000, 6100, 7500, 9000];
const trend = trendAnalysis(monthlyUsers, 3, 3);
console.log(`用户增长：${monthlyUsers.join(', ')}`);
console.log(`  趋势：${trend.direction === 'up' ? '📈 上升' : '📉 下降'}`);
console.log(`  增长率：${trend.growthRate.toFixed(2)}%`);
console.log(`  R²: ${trend.rSquared.toFixed(3)}`);
console.log(`  未来 3 月预测：${trend.predictions.map(p => p.toFixed(0)).join(', ')}\n`);

// 示例 3: 异常检测
console.log('示例 3: 异常检测');
const temperatureData = [22, 23, 24, 23, 25, 24, 100, 23, 24, 25, 24, -15, 23, 24];
const anomalies = detectAnomalies(temperatureData, 'both', 3);
console.log(`温度数据：${temperatureData.join(', ')}`);
console.log(`  异常点：${anomalies.anomalyCount} 个`);
console.log(`  异常值：${anomalies.anomalies.join(', ')}`);
console.log(`  位置：索引 ${anomalies.anomalyIndices.join(', ')}\n`);

// 示例 4: 综合分析
console.log('示例 4: 综合分析');
const stockPrices = [100, 102, 98, 105, 103, 107, 150, 109, 112, 115, 118, 120];
const report = analyze(stockPrices, { windowSize: 3, predictSteps: 2 });
console.log(report.summary);
console.log('');

// 示例 5: 性能测试
console.log('示例 5: 性能测试');
const largeDataset = Array.from({ length: 10000 }, () => Math.random() * 1000);
const startTime = Date.now();
const largeAnalysis = analyze(largeDataset);
const endTime = Date.now();
console.log(`  数据量：${largeDataset.length}`);
console.log(`  耗时：${endTime - startTime}ms`);
console.log(`  异常点：${largeAnalysis.anomalies.anomalyCount}个\n`);

console.log('═══════════════════════════════════════');
console.log('✅ 所有示例执行完成!\n');
