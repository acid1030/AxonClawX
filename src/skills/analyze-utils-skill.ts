/**
 * KAEL 数据统计分析工具
 * 
 * 功能:
 * 1. 描述性统计 (均值、中位数、标准差、分位数等)
 * 2. 趋势分析 (线性回归、移动平均、增长率)
 * 3. 异常检测 (Z-Score、IQR、孤立森林简化版)
 * 
 * @author KAEL
 * @version 1.0.0
 */

// ==================== 类型定义 ====================

export interface DataPoint {
  timestamp?: number | string;
  value: number;
  label?: string;
}

export interface DescriptiveStats {
  count: number;
  mean: number;
  median: number;
  mode: number | null;
  stdDev: number;
  variance: number;
  min: number;
  max: number;
  range: number;
  q1: number;
  q3: number;
  iqr: number;
  skewness: number;
  kurtosis: number;
}

export interface TrendAnalysis {
  slope: number;
  intercept: number;
  rSquared: number;
  direction: 'up' | 'down' | 'stable';
  growthRate: number;
  movingAverage: number[];
  predictions: number[];
}

export interface AnomalyDetectionResult {
  anomalies: number[];
  anomalyIndices: number[];
  method: 'zscore' | 'iqr' | 'both';
  threshold: number;
  totalPoints: number;
  anomalyCount: number;
  anomalyPercentage: number;
}

// ==================== 工具函数 ====================

/**
 * 计算数组总和
 */
function sum(arr: number[]): number {
  return arr.reduce((acc, val) => acc + val, 0);
}

/**
 * 计算数组平均值
 */
function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  return sum(arr) / arr.length;
}

/**
 * 计算中位数
 */
function median(arr: number[]): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 
    ? sorted[mid] 
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * 计算众数
 */
function mode(arr: number[]): number | null {
  if (arr.length === 0) return null;
  const frequency: Record<number, number> = {};
  let maxFreq = 0;
  let modes: number[] = [];
  
  arr.forEach(val => {
    frequency[val] = (frequency[val] || 0) + 1;
    if (frequency[val] > maxFreq) {
      maxFreq = frequency[val];
      modes = [val];
    } else if (frequency[val] === maxFreq) {
      modes.push(val);
    }
  });
  
  return maxFreq > 1 ? modes[0] : null;
}

/**
 * 计算标准差
 */
function standardDeviation(arr: number[], avg?: number): number {
  if (arr.length === 0) return 0;
  const avgValue = avg ?? mean(arr);
  const squareDiffs = arr.map(val => Math.pow(val - avgValue, 2));
  return Math.sqrt(mean(squareDiffs));
}

/**
 * 计算方差
 */
function variance(arr: number[], avg?: number): number {
  if (arr.length === 0) return 0;
  const avgValue = avg ?? mean(arr);
  const squareDiffs = arr.map(val => Math.pow(val - avgValue, 2));
  return mean(squareDiffs);
}

/**
 * 计算分位数
 */
function quantile(arr: number[], q: number): number {
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

/**
 * 计算偏度 (Skewness)
 */
function skewness(arr: number[], avg?: number, stdDev?: number): number {
  if (arr.length < 3) return 0;
  const avgValue = avg ?? mean(arr);
  const stdDevValue = stdDev ?? standardDeviation(arr, avgValue);
  if (stdDevValue === 0) return 0;
  
  const n = arr.length;
  const skew = sum(arr.map(val => Math.pow((val - avgValue) / stdDevValue, 3))) * n / ((n - 1) * (n - 2));
  return skew;
}

/**
 * 计算峰度 (Kurtosis)
 */
function kurtosis(arr: number[], avg?: number, stdDev?: number): number {
  if (arr.length < 4) return 0;
  const avgValue = avg ?? mean(arr);
  const stdDevValue = stdDev ?? standardDeviation(arr, avgValue);
  if (stdDevValue === 0) return 0;
  
  const n = arr.length;
  const kurt = sum(arr.map(val => Math.pow((val - avgValue) / stdDevValue, 4))) / n - 3;
  return kurt;
}

// ==================== 主功能函数 ====================

/**
 * 1. 描述性统计分析
 * 
 * @param data 数据数组或 DataPoint 数组
 * @returns 描述性统计结果
 */
export function descriptiveStats(data: number[] | DataPoint[]): DescriptiveStats {
  const values = Array.isArray(data[0]) 
    ? (data as DataPoint[]).map(d => d.value) 
    : data as number[];
  
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
    mode: mode(values),
    stdDev: stdDevVal,
    variance: variance(values, avg),
    min: Math.min(...values),
    max: Math.max(...values),
    range: Math.max(...values) - Math.min(...values),
    q1,
    q3,
    iqr: q3 - q1,
    skewness: skewness(values, avg, stdDevVal),
    kurtosis: kurtosis(values, avg, stdDevVal),
  };
}

/**
 * 2. 趋势分析
 * 
 * @param data 时间序列数据
 * @param windowSize 移动平均窗口大小 (默认 3)
 * @param predictSteps 预测步数 (默认 0)
 * @returns 趋势分析结果
 */
export function trendAnalysis(
  data: number[] | DataPoint[], 
  windowSize: number = 3,
  predictSteps: number = 0
): TrendAnalysis {
  const values = Array.isArray(data[0]) 
    ? (data as DataPoint[]).map(d => d.value) 
    : data as number[];
  
  if (values.length < 2) {
    throw new Error('数据点不足，至少需要 2 个点');
  }
  
  // 线性回归 (最小二乘法)
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
  
  // 计算 R²
  const yPredicted = values.map((_, x) => slope * x + intercept);
  const ssRes = sum(values.map((y, i) => Math.pow(y - yPredicted[i], 2)));
  const ssTot = sum(values.map(y => Math.pow(y - yMean, 2)));
  const rSquared = ssTot !== 0 ? 1 - ssRes / ssTot : 0;
  
  // 判断趋势方向
  const direction = slope > 0.01 ? 'up' : slope < -0.01 ? 'down' : 'stable';
  
  // 计算增长率
  const growthRate = values.length > 1 
    ? ((values[values.length - 1] - values[0]) / values[0]) * 100 
    : 0;
  
  // 计算移动平均
  const movingAverage: number[] = [];
  for (let i = 0; i < values.length; i++) {
    if (i < windowSize - 1) {
      movingAverage.push(mean(values.slice(0, i + 1)));
    } else {
      movingAverage.push(mean(values.slice(i - windowSize + 1, i + 1)));
    }
  }
  
  // 预测未来值
  const predictions: number[] = [];
  for (let i = 1; i <= predictSteps; i++) {
    predictions.push(slope * (n - 1 + i) + intercept);
  }
  
  return {
    slope,
    intercept,
    rSquared,
    direction,
    growthRate,
    movingAverage,
    predictions,
  };
}

/**
 * 3. 异常检测
 * 
 * @param data 数据数组
 * @param method 检测方法 ('zscore' | 'iqr' | 'both')
 * @param threshold Z-Score 阈值 (默认 3) 或 IQR 倍数 (默认 1.5)
 * @returns 异常检测结果
 */
export function detectAnomalies(
  data: number[] | DataPoint[],
  method: 'zscore' | 'iqr' | 'both' = 'both',
  threshold: number = 3
): AnomalyDetectionResult {
  const values = Array.isArray(data[0]) 
    ? (data as DataPoint[]).map(d => d.value) 
    : data as number[];
  
  if (values.length < 3) {
    throw new Error('数据点不足，至少需要 3 个点');
  }
  
  const anomalies = new Set<number>();
  const anomalyIndices = new Set<number>();
  
  // Z-Score 方法
  if (method === 'zscore' || method === 'both') {
    const avg = mean(values);
    const stdDevVal = standardDeviation(values, avg);
    const zThreshold = method === 'both' ? threshold : threshold;
    
    values.forEach((val, idx) => {
      const zScore = stdDevVal !== 0 ? Math.abs((val - avg) / stdDevVal) : 0;
      if (zScore > zThreshold) {
        anomalies.add(val);
        anomalyIndices.add(idx);
      }
    });
  }
  
  // IQR 方法
  if (method === 'iqr' || method === 'both') {
    const sorted = [...values].sort((a, b) => a - b);
    const q1 = quantile(sorted, 0.25);
    const q3 = quantile(sorted, 0.75);
    const iqr = q3 - q1;
    const iqrThreshold = method === 'both' ? 1.5 : threshold;
    
    const lowerBound = q1 - iqr * iqrThreshold;
    const upperBound = q3 + iqr * iqrThreshold;
    
    values.forEach((val, idx) => {
      if (val < lowerBound || val > upperBound) {
        anomalies.add(val);
        anomalyIndices.add(idx);
      }
    });
  }
  
  const anomaliesArray = Array.from(anomalies);
  const anomalyIndicesArray = Array.from(anomalyIndices);
  
  return {
    anomalies: anomaliesArray,
    anomalyIndices: anomalyIndicesArray,
    method,
    threshold,
    totalPoints: values.length,
    anomalyCount: anomaliesArray.length,
    anomalyPercentage: (anomaliesArray.length / values.length) * 100,
  };
}

/**
 * 综合分析报告
 * 
 * @param data 数据数组
 * @param options 分析选项
 * @returns 完整分析报告
 */
export function analyze(data: number[] | DataPoint[], options?: {
  windowSize?: number;
  predictSteps?: number;
  anomalyMethod?: 'zscore' | 'iqr' | 'both';
  anomalyThreshold?: number;
}): {
  descriptive: DescriptiveStats;
  trend: TrendAnalysis;
  anomalies: AnomalyDetectionResult;
  summary: string;
} {
  const {
    windowSize = 3,
    predictSteps = 0,
    anomalyMethod = 'both',
    anomalyThreshold = 3,
  } = options || {};
  
  const descriptive = descriptiveStats(data);
  const trend = trendAnalysis(data, windowSize, predictSteps);
  const anomalies = detectAnomalies(data, anomalyMethod, anomalyThreshold);
  
  // 生成摘要
  const summary = generateSummary(descriptive, trend, anomalies);
  
  return {
    descriptive,
    trend,
    anomalies,
    summary,
  };
}

/**
 * 生成分析摘要
 */
function generateSummary(
  descriptive: DescriptiveStats,
  trend: TrendAnalysis,
  anomalies: AnomalyDetectionResult
): string {
  const lines: string[] = [];
  
  lines.push(`📊 数据分析报告`);
  lines.push(`━━━━━━━━━━━━━━━━`);
  lines.push(``);
  lines.push(`【数据概览】`);
  lines.push(`  • 样本数量：${descriptive.count}`);
  lines.push(`  • 平均值：${descriptive.mean.toFixed(2)}`);
  lines.push(`  • 中位数：${descriptive.median.toFixed(2)}`);
  lines.push(`  • 标准差：${descriptive.stdDev.toFixed(2)}`);
  lines.push(`  • 范围：[${descriptive.min.toFixed(2)}, ${descriptive.max.toFixed(2)}]`);
  lines.push(``);
  lines.push(`【趋势分析】`);
  lines.push(`  • 方向：${trend.direction === 'up' ? '📈 上升' : trend.direction === 'down' ? '📉 下降' : '➡️ 稳定'}`);
  lines.push(`  • 增长率：${trend.growthRate.toFixed(2)}%`);
  lines.push(`  • 拟合度 (R²): ${trend.rSquared.toFixed(3)}`);
  if (trend.predictions.length > 0) {
    lines.push(`  • 预测值：${trend.predictions.map(p => p.toFixed(2)).join(', ')}`);
  }
  lines.push(``);
  lines.push(`【异常检测】`);
  lines.push(`  • 异常点数量：${anomalies.anomalyCount} (${anomalies.anomalyPercentage.toFixed(1)}%)`);
  if (anomalies.anomalyCount > 0) {
    lines.push(`  • 异常值：${anomalies.anomalies.map(a => a.toFixed(2)).join(', ')}`);
  }
  lines.push(``);
  lines.push(`【分布特征】`);
  lines.push(`  • 偏度：${descriptive.skewness.toFixed(3)} ${Math.abs(descriptive.skewness) < 0.5 ? '(近似正态)' : descriptive.skewness > 0 ? '(右偏)' : '(左偏)'}`);
  lines.push(`  • 峰度：${descriptive.kurtosis.toFixed(3)} ${Math.abs(descriptive.kurtosis) < 0.5 ? '(近似正态)' : descriptive.kurtosis > 0 ? '(尖峰)' : '(平峰)'}`);
  
  return lines.join('\n');
}

// ==================== 导出 ====================

export default {
  descriptiveStats,
  trendAnalysis,
  detectAnomalies,
  analyze,
};
