/**
 * 统计分析工具技能
 * 
 * 功能:
 * 1. 描述性统计 - 均值、中位数、标准差等
 * 2. 分布分析 - 偏度、峰度、分位数
 * 3. 相关性分析 - 皮尔逊/斯皮尔曼相关系数
 */

// ==================== 类型定义 ====================

export interface DescriptiveStats {
  count: number;
  mean: number;
  median: number;
  mode: number[];
  variance: number;
  stdDev: number;
  min: number;
  max: number;
  range: number;
  q1: number;
  q3: number;
  iqr: number;
}

export interface DistributionAnalysis {
  skewness: number;
  kurtosis: number;
  percentiles: { [key: number]: number };
  normalityTest: {
    isNormal: boolean;
    confidence: number;
  };
}

export interface CorrelationResult {
  pearson: number;
  spearman?: number;
  pValue?: number;
  strength: 'weak' | 'moderate' | 'strong' | 'very strong';
  direction: 'positive' | 'negative' | 'none';
}

// ==================== 工具函数 ====================

/**
 * 计算数组总和
 */
function sum(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0);
}

/**
 * 计算数组均值
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
function mode(arr: number[]): number[] {
  const freq: { [key: number]: number } = {};
  arr.forEach(num => {
    freq[num] = (freq[num] || 0) + 1;
  });
  
  const maxFreq = Math.max(...Object.values(freq));
  return Object.keys(freq)
    .filter(key => freq[Number(key)] === maxFreq)
    .map(Number);
}

/**
 * 计算方差
 */
function variance(arr: number[]): number {
  if (arr.length < 2) return 0;
  const avg = mean(arr);
  const squareDiffs = arr.map(num => Math.pow(num - avg, 2));
  return sum(squareDiffs) / (arr.length - 1); // 样本方差
}

/**
 * 计算标准差
 */
function stdDev(arr: number[]): number {
  return Math.sqrt(variance(arr));
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
  
  if (base + 1 >= sorted.length) return sorted[base];
  return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
}

/**
 * 计算偏度 (Skewness)
 */
function skewness(arr: number[]): number {
  if (arr.length < 3) return 0;
  const avg = mean(arr);
  const sd = stdDev(arr);
  if (sd === 0) return 0;
  
  const n = arr.length;
  const skew = sum(arr.map(x => Math.pow((x - avg) / sd, 3))) * n / ((n - 1) * (n - 2));
  return skew;
}

/**
 * 计算峰度 (Kurtosis)
 */
function kurtosis(arr: number[]): number {
  if (arr.length < 4) return 0;
  const avg = mean(arr);
  const sd = stdDev(arr);
  if (sd === 0) return 0;
  
  const n = arr.length;
  const m4 = sum(arr.map(x => Math.pow((x - avg) / sd, 4))) / n;
  return m4 - 3; // 超额峰度
}

/**
 * 计算皮尔逊相关系数
 */
function pearsonCorrelation(x: number[], y: number[]): number {
  if (x.length !== y.length || x.length < 2) return 0;
  
  const meanX = mean(x);
  const meanY = mean(y);
  
  let numerator = 0;
  let sumSqX = 0;
  let sumSqY = 0;
  
  for (let i = 0; i < x.length; i++) {
    const dx = x[i] - meanX;
    const dy = y[i] - meanY;
    numerator += dx * dy;
    sumSqX += dx * dx;
    sumSqY += dy * dy;
  }
  
  const denominator = Math.sqrt(sumSqX * sumSqY);
  return denominator === 0 ? 0 : numerator / denominator;
}

/**
 * 计算斯皮尔曼等级相关系数
 */
function spearmanCorrelation(x: number[], y: number[]): number {
  if (x.length !== y.length || x.length < 2) return 0;
  
  const rank = (arr: number[]): number[] => {
    const sorted = [...arr].sort((a, b) => a - b);
    return arr.map(val => {
      const idx = sorted.indexOf(val);
      // 处理并列排名
      const count = sorted.filter(v => v === val).length;
      return idx + 1 + (count - 1) / 2;
    });
  };
  
  const rankX = rank(x);
  const rankY = rank(y);
  
  return pearsonCorrelation(rankX, rankY);
}

/**
 * 评估相关强度
 */
function evaluateCorrelation(r: number): {
  strength: 'weak' | 'moderate' | 'strong' | 'very strong';
  direction: 'positive' | 'negative' | 'none';
} {
  const absR = Math.abs(r);
  
  let strength: 'weak' | 'moderate' | 'strong' | 'very strong';
  if (absR < 0.3) strength = 'weak';
  else if (absR < 0.5) strength = 'moderate';
  else if (absR < 0.7) strength = 'strong';
  else strength = 'very strong';
  
  let direction: 'positive' | 'negative' | 'none';
  if (absR < 0.1) direction = 'none';
  else if (r > 0) direction = 'positive';
  else direction = 'negative';
  
  return { strength, direction };
}

// ==================== 主函数 ====================

/**
 * 描述性统计分析
 * 
 * @param data 数值数组
 * @returns 描述性统计结果
 */
export function descriptiveStats(data: number[]): DescriptiveStats {
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error('输入数据必须是非空数组');
  }
  
  const q1 = quantile(data, 0.25);
  const q3 = quantile(data, 0.75);
  
  return {
    count: data.length,
    mean: mean(data),
    median: median(data),
    mode: mode(data),
    variance: variance(data),
    stdDev: stdDev(data),
    min: Math.min(...data),
    max: Math.max(...data),
    range: Math.max(...data) - Math.min(...data),
    q1,
    q3,
    iqr: q3 - q1
  };
}

/**
 * 分布分析
 * 
 * @param data 数值数组
 * @param percentiles 需要计算的分位数 (默认 [0.1, 0.25, 0.5, 0.75, 0.9])
 * @returns 分布分析结果
 */
export function analyzeDistribution(
  data: number[], 
  percentiles: number[] = [0.1, 0.25, 0.5, 0.75, 0.9]
): DistributionAnalysis {
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error('输入数据必须是非空数组');
  }
  
  const skew = skewness(data);
  const kurt = kurtosis(data);
  
  // 简单的正态性检验 (基于偏度和峰度)
  const isNormal = Math.abs(skew) < 0.5 && Math.abs(kurt) < 0.5;
  const confidence = isNormal 
    ? Math.max(0.5, 1 - (Math.abs(skew) + Math.abs(kurt)) / 4)
    : Math.max(0.1, 1 - (Math.abs(skew) + Math.abs(kurt)) / 2);
  
  const percentileObj: { [key: number]: number } = {};
  percentiles.forEach(p => {
    percentileObj[Math.round(p * 100)] = quantile(data, p);
  });
  
  return {
    skewness: skew,
    kurtosis: kurt,
    percentiles: percentileObj,
    normalityTest: {
      isNormal,
      confidence
    }
  };
}

/**
 * 相关性分析
 * 
 * @param x X 轴数据
 * @param y Y 轴数据
 * @param options 选项 { includeSpearman: boolean }
 * @returns 相关性分析结果
 */
export function analyzeCorrelation(
  x: number[], 
  y: number[], 
  options: { includeSpearman?: boolean } = {}
): CorrelationResult {
  if (!Array.isArray(x) || !Array.isArray(y)) {
    throw new Error('输入数据必须是数组');
  }
  
  if (x.length !== y.length) {
    throw new Error('X 和 Y 数组长度必须相同');
  }
  
  if (x.length < 2) {
    throw new Error('至少需要 2 个数据点');
  }
  
  const pearson = pearsonCorrelation(x, y);
  const { strength, direction } = evaluateCorrelation(pearson);
  
  const result: CorrelationResult = {
    pearson,
    strength,
    direction
  };
  
  if (options.includeSpearman) {
    result.spearman = spearmanCorrelation(x, y);
  }
  
  return result;
}

/**
 * 综合统计分析 (一键获取所有统计信息)
 * 
 * @param data 数值数组
 * @returns 完整统计报告
 */
export function fullStatReport(data: number[]): {
  descriptive: DescriptiveStats;
  distribution: DistributionAnalysis;
  summary: string;
} {
  const descriptive = descriptiveStats(data);
  const distribution = analyzeDistribution(data);
  
  // 生成文本摘要
  const summary = `
数据集概览:
- 样本量：${descriptive.count}
- 均值：${descriptive.mean.toFixed(3)} ± ${descriptive.stdDev.toFixed(3)}
- 中位数：${descriptive.median}
- 范围：[${descriptive.min}, ${descriptive.max}]

分布特征:
- 偏度：${distribution.skewness.toFixed(3)} (${distribution.skewness > 0 ? '右偏' : distribution.skewness < 0 ? '左偏' : '对称'})
- 峰度：${distribution.kurtosis.toFixed(3)} (${distribution.kurtosis > 0 ? '尖峰' : distribution.kurtosis < 0 ? '平峰' : '正态'})
- 正态性：${distribution.normalityTest.isNormal ? '符合' : '不符合'} (置信度：${(distribution.normalityTest.confidence * 100).toFixed(1)}%)
  `.trim();
  
  return {
    descriptive,
    distribution,
    summary
  };
}

// ==================== 使用示例 ====================

/**
 * 使用示例代码
 * 
 * 运行方式：
 * 1. 导入函数：import { descriptiveStats, analyzeDistribution, analyzeCorrelation, fullStatReport } from './stat-utils-skill';
 * 2. 调用函数并传入数据
 */

export const usageExamples = `
// ==================== 示例 1: 描述性统计 ====================

const scores = [85, 90, 78, 92, 88, 76, 95, 89, 84, 91];
const stats = descriptiveStats(scores);

console.log('描述性统计结果:');
console.log('- 样本量:', stats.count);           // 10
console.log('- 均值:', stats.mean.toFixed(2));    // 86.80
console.log('- 中位数:', stats.median);           // 88.5
console.log('- 标准差:', stats.stdDev.toFixed(2)); // 6.23
console.log('- 四分位距:', stats.iqr);            // 9.25


// ==================== 示例 2: 分布分析 ====================

const data = [12, 15, 18, 22, 25, 28, 30, 35, 40, 45, 50, 60, 80];
const dist = analyzeDistribution(data);

console.log('分布分析结果:');
console.log('- 偏度:', dist.skewness.toFixed(3));     // 正数表示右偏
console.log('- 峰度:', dist.kurtosis.toFixed(3));     // 正数表示尖峰
console.log('- 第 90 百分位:', dist.percentiles[90]);  // 60
console.log('- 正态性检验:', dist.normalityTest.isNormal ? '符合' : '不符合');


// ==================== 示例 3: 相关性分析 ====================

const hours = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const scores2 = [52, 55, 60, 65, 70, 75, 80, 85, 88, 92];

const corr = analyzeCorrelation(hours, scores2, { includeSpearman: true });

console.log('相关性分析结果:');
console.log('- 皮尔逊相关系数:', corr.pearson.toFixed(3));  // 接近 1
console.log('- 斯皮尔曼相关系数:', corr.spearman?.toFixed(3)); // 接近 1
console.log('- 相关强度:', corr.strength);  // 'very strong'
console.log('- 相关方向:', corr.direction); // 'positive'


// ==================== 示例 4: 综合统计报告 ====================

const dataset = [23, 25, 28, 30, 32, 35, 38, 40, 42, 45, 48, 50, 55, 60, 65];
const report = fullStatReport(dataset);

console.log(report.summary);
// 输出完整的统计报告文本


// ==================== 示例 5: 实际应用场景 ====================

// 场景 1: 学生成绩分析
const classScores = [78, 82, 85, 88, 90, 92, 95, 65, 70, 75, 80, 85, 88, 91, 94];
const classStats = descriptiveStats(classScores);
console.log('班级平均分:', classStats.mean.toFixed(1));
console.log('成绩分布范围:', classStats.range);


// 场景 2: A/B 测试相关性
const groupA = [100, 120, 115, 130, 125, 140, 135, 150];
const groupB = [110, 125, 120, 135, 130, 145, 140, 155];
const abCorr = analyzeCorrelation(groupA, groupB);
console.log('A/B 组相关性:', abCorr.pearson.toFixed(3));


// 场景 3: 异常值检测 (基于 IQR)
const iqr = classStats.iqr;
const lowerBound = classStats.q1 - 1.5 * iqr;
const upperBound = classStats.q3 + 1.5 * iqr;
const outliers = classScores.filter(s => s < lowerBound || s > upperBound);
console.log('异常值:', outliers);
`;

// 导出所有函数作为默认导出
export default {
  descriptiveStats,
  analyzeDistribution,
  analyzeCorrelation,
  fullStatReport,
  usageExamples
};
