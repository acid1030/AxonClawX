/**
 * 图表工具技能 - ACE
 * 
 * 提供图表生成功能：
 * 1. ASCII 图表 - 终端友好的文本图表
 * 2. 数据可视化 - 基础图表渲染
 * 3. 统计图表 - 统计分析可视化
 */

// ============================================
// ASCII 图表工具
// ============================================

/**
 * ASCII 条形图配置
 */
interface AsciiBarChartOptions {
  width?: number;        // 图表宽度 (字符数)
  height?: number;       // 图表高度 (行数)
  showValues?: boolean;  // 显示数值
  showLabels?: boolean;  // 显示标签
  char?: string;         // 条形字符
}

/**
 * 生成 ASCII 条形图
 * 
 * @param data - 数据数组 [{label, value}]
 * @param options - 配置选项
 * @returns ASCII 条形图字符串
 * 
 * @example
 * const data = [
 *   {label: 'A', value: 30},
 *   {label: 'B', value: 50},
 *   {label: 'C', value: 70}
 * ];
 * console.log(asciiBarChart(data));
 */
export function asciiBarChart(
  data: Array<{label: string; value: number}>,
  options: AsciiBarChartOptions = {}
): string {
  const {
    width = 40,
    showValues = true,
    showLabels = true,
    char = '█'
  } = options;

  if (data.length === 0) {
    return 'No data to display';
  }

  const maxValue = Math.max(...data.map(d => d.value));
  const lines: string[] = [];

  // 顶部边框
  lines.push('┌' + '─'.repeat(width + 15) + '┐');

  data.forEach(item => {
    const barLength = Math.round((item.value / maxValue) * width);
    const bar = char.repeat(barLength);
    
    let line = '│ ';
    if (showLabels) {
      line += `${item.label.padEnd(8)} `;
    }
    line += `${bar} `;
    if (showValues) {
      line += `${item.value}`;
    }
    line += ' │';
    
    lines.push(line);
  });

  // 底部边框
  lines.push('└' + '─'.repeat(width + 15) + '┘');

  return lines.join('\n');
}

/**
 * ASCII 折线图配置
 */
interface AsciiLineChartOptions {
  width?: number;
  height?: number;
  showGrid?: boolean;
}

/**
 * 生成 ASCII 折线图
 * 
 * @param data - 数值数组
 * @param options - 配置选项
 * @returns ASCII 折线图字符串
 * 
 * @example
 * const data = [10, 25, 18, 30, 45, 35, 50];
 * console.log(asciiLineChart(data, {width: 50, height: 10}));
 */
export function asciiLineChart(
  data: number[],
  options: AsciiLineChartOptions = {}
): string {
  const {
    width = 50,
    height = 10,
    showGrid = true
  } = options;

  if (data.length === 0) {
    return 'No data to display';
  }

  const maxValue = Math.max(...data);
  const minValue = Math.min(...data);
  const range = maxValue - minValue || 1;

  const lines: string[] = [];

  // 从顶部到底部绘制
  for (let row = height; row >= 0; row--) {
    const threshold = minValue + (range * row) / height;
    let line = '';

    // Y 轴标签
    if (showGrid) {
      line += `${Math.round(threshold).toString().padStart(4)} │`;
    }

    // 绘制数据点
    for (let col = 0; col < data.length; col++) {
      const normalizedValue = (data[col] - minValue) / range;
      const valueRow = Math.round(normalizedValue * height);
      
      if (valueRow === row) {
        line += '●';
      } else if (valueRow > row && col > 0) {
        const prevNormalized = (data[col - 1] - minValue) / range;
        const prevRow = Math.round(prevNormalized * height);
        if (prevRow !== valueRow) {
          line += valueRow > prevRow ? '╱' : '╲';
        } else {
          line += '─';
        }
      } else {
        line += ' ';
      }
    }

    lines.push(line);
  }

  // X 轴
  if (showGrid) {
    lines.push('     └' + '─'.repeat(data.length));
  }

  return lines.join('\n');
}

/**
 * ASCII 饼图配置
 */
interface AsciiPieChartOptions {
  radius?: number;
  showLegend?: boolean;
  showPercent?: boolean;
}

// 饼图字符集 (不同填充密度)
const PIE_CHARS = [' ', '░', '▒', '▓', '█'];

/**
 * 生成 ASCII 饼图
 * 
 * @param data - 数据数组 [{label, value}]
 * @param options - 配置选项
 * @returns ASCII 饼图字符串
 * 
 * @example
 * const data = [
 *   {label: 'A', value: 30},
 *   {label: 'B', value: 45},
 *   {label: 'C', value: 25}
 * ];
 * console.log(asciiPieChart(data));
 */
export function asciiPieChart(
  data: Array<{label: string; value: number}>,
  options: AsciiPieChartOptions = {}
): string {
  const {
    radius = 10,
    showLegend = true,
    showPercent = true
  } = options;

  if (data.length === 0) {
    return 'No data to display';
  }

  const total = data.reduce((sum, d) => sum + d.value, 0);
  const diameter = radius * 2 + 1;
  const grid: string[][] = Array(diameter).fill(null).map(() => Array(diameter).fill(' '));

  const centerX = radius;
  const centerY = radius;

  // 计算每个数据点的起始角度
  let currentAngle = 0;
  const segments: Array<{startAngle: number; endAngle: number; char: string; percent: number}> = [];

  data.forEach((item, index) => {
    const percent = item.value / total;
    const angle = percent * 2 * Math.PI;
    const charIndex = Math.min(index, PIE_CHARS.length - 1);
    
    segments.push({
      startAngle: currentAngle,
      endAngle: currentAngle + angle,
      char: PIE_CHARS[charIndex],
      percent
    });
    
    currentAngle += angle;
  });

  // 绘制饼图
  for (let y = 0; y < diameter; y++) {
    for (let x = 0; x < diameter; x++) {
      const dx = x - centerX;
      const dy = y - centerY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance <= radius) {
        let angle = Math.atan2(dy, dx);
        if (angle < 0) angle += 2 * Math.PI;

        for (const segment of segments) {
          if (angle >= segment.startAngle && angle < segment.endAngle) {
            grid[y][x] = segment.char;
            break;
          }
        }
      }
    }
  }

  const lines: string[] = [];
  
  // 添加标题
  lines.push('┌' + '─'.repeat(diameter + 2) + '┐');
  lines.push('│ ' + 'PIE CHART'.padEnd(diameter) + ' │');
  lines.push('├' + '─'.repeat(diameter + 2) + '┤');

  // 添加饼图
  grid.forEach(row => {
    lines.push('│ ' + row.join('') + ' │');
  });

  lines.push('└' + '─'.repeat(diameter + 2) + '┘');

  // 添加图例
  if (showLegend) {
    lines.push('');
    lines.push('Legend:');
    segments.forEach((segment, index) => {
      const label = data[index]?.label || `Item ${index + 1}`;
      const percentStr = showPercent ? ` (${(segment.percent * 100).toFixed(1)}%)` : '';
      lines.push(`  ${segment.char} ${label}${percentStr}`);
    });
  }

  return lines.join('\n');
}

// ============================================
// 数据可视化工具
// ============================================

/**
 * 数据点配置
 */
interface DataPoint {
  x: number | string;
  y: number;
  label?: string;
}

/**
 * 生成简单的数据可视化摘要
 * 
 * @param data - 数据点数组
 * @returns 可视化摘要字符串
 * 
 * @example
 * const data = [
 *   {x: 'Jan', y: 100},
 *   {x: 'Feb', y: 150},
 *   {x: 'Mar', y: 200}
 * ];
 * console.log(visualizeData(data));
 */
export function visualizeData(data: DataPoint[]): string {
  if (data.length === 0) {
    return 'No data to visualize';
  }

  const values = data.map(d => d.y);
  const sum = values.reduce((a, b) => a + b, 0);
  const avg = sum / values.length;
  const min = Math.min(...values);
  const max = Math.max(...values);

  const lines: string[] = [
    '📊 Data Visualization Summary',
    '═'.repeat(40),
    `📈 Data Points: ${data.length}`,
    `📊 Sum: ${sum.toFixed(2)}`,
    `📉 Average: ${avg.toFixed(2)}`,
    `🔼 Max: ${max}`,
    `🔽 Min: ${min}`,
    `📏 Range: ${max - min}`,
    '═'.repeat(40)
  ];

  // 添加趋势指示
  if (data.length >= 2) {
    const trend = values[values.length - 1] - values[0];
    const trendIcon = trend > 0 ? '📈' : trend < 0 ? '📉' : '➡️';
    lines.push(`${trendIcon} Trend: ${trend > 0 ? '+' : ''}${trend.toFixed(2)}`);
  }

  return lines.join('\n');
}

/**
 * 生成热力图数据
 * 
 * @param matrix - 二维数值矩阵
 * @param options - 配置选项
 * @returns 热力图字符串
 * 
 * @example
 * const matrix = [
 *   [1, 2, 3],
 *   [4, 5, 6],
 *   [7, 8, 9]
 * ];
 * console.log(heatmap(matrix));
 */
export function heatmap(
  matrix: number[][],
  options: {showValues?: boolean} = {}
): string {
  const {showValues = true} = options;

  if (matrix.length === 0 || matrix[0].length === 0) {
    return 'No data to display';
  }

  const flatValues = matrix.flat();
  const min = Math.min(...flatValues);
  const max = Math.max(...flatValues);
  const range = max - min || 1;

  const heatChars = [' ', '░', '▒', '▓', '█'];

  const lines: string[] = [];
  
  // 顶部边框
  lines.push('┌' + '─'.repeat(matrix[0].length * 4 + 1) + '┐');

  matrix.forEach(row => {
    let line = '│ ';
    row.forEach(value => {
      const normalized = (value - min) / range;
      const charIndex = Math.floor(normalized * (heatChars.length - 1));
      const char = heatChars[charIndex];
      
      if (showValues) {
        line += `${char}${value.toString().padStart(2)} `;
      } else {
        line += `${char}${char} `;
      }
    });
    line += '│';
    lines.push(line);
  });

  // 底部边框
  lines.push('└' + '─'.repeat(matrix[0].length * 4 + 1) + '┘');

  // 图例
  lines.push('');
  lines.push(`Legend: ${min} ${heatChars.join('')} ${max}`);

  return lines.join('\n');
}

// ============================================
// 统计图表工具
// ============================================

/**
 * 统计数据接口
 */
interface Statistics {
  count: number;
  sum: number;
  mean: number;
  median: number;
  min: number;
  max: number;
  range: number;
  variance: number;
  stdDev: number;
  q1: number;
  q3: number;
  iqr: number;
}

/**
 * 计算统计数据
 * 
 * @param data - 数值数组
 * @returns 统计数据对象
 * 
 * @example
 * const stats = calculateStatistics([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
 * console.log(stats);
 */
export function calculateStatistics(data: number[]): Statistics {
  if (data.length === 0) {
    throw new Error('Cannot calculate statistics for empty dataset');
  }

  const sorted = [...data].sort((a, b) => a - b);
  const n = sorted.length;
  
  // 基础统计
  const sum = sorted.reduce((a, b) => a + b, 0);
  const mean = sum / n;
  const min = sorted[0];
  const max = sorted[n - 1];
  const range = max - min;

  // 中位数
  const median = n % 2 === 0
    ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2
    : sorted[Math.floor(n / 2)];

  // 方差和标准差
  const variance = sorted.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / n;
  const stdDev = Math.sqrt(variance);

  // 四分位数
  const q1Index = Math.floor(n * 0.25);
  const q3Index = Math.floor(n * 0.75);
  const q1 = sorted[q1Index];
  const q3 = sorted[q3Index];
  const iqr = q3 - q1;

  return {
    count: n,
    sum,
    mean,
    median,
    min,
    max,
    range,
    variance,
    stdDev,
    q1,
    q3,
    iqr
  };
}

/**
 * 生成统计报告
 * 
 * @param data - 数值数组
 * @returns 格式化统计报告字符串
 * 
 * @example
 * const report = statisticalReport([10, 20, 30, 40, 50]);
 * console.log(report);
 */
export function statisticalReport(data: number[]): string {
  const stats = calculateStatistics(data);

  const lines: string[] = [
    '📊 Statistical Report',
    '═'.repeat(50),
    '',
    '📈 Basic Statistics:',
    `   Count:  ${stats.count}`,
    `   Sum:    ${stats.sum.toFixed(2)}`,
    `   Mean:   ${stats.mean.toFixed(2)}`,
    `   Median: ${stats.median.toFixed(2)}`,
    '',
    '📏 Distribution:',
    `   Min:    ${stats.min}`,
    `   Max:    ${stats.max}`,
    `   Range:  ${stats.range}`,
    '',
    '📊 Variability:',
    `   Variance:   ${stats.variance.toFixed(2)}`,
    `   Std Dev:    ${stats.stdDev.toFixed(2)}`,
    `   Coeff Var:  ${((stats.stdDev / stats.mean) * 100).toFixed(2)}%`,
    '',
    '📦 Quartiles:',
    `   Q1 (25%):  ${stats.q1}`,
    `   Q3 (75%):  ${stats.q3}`,
    `   IQR:       ${stats.iqr}`,
    '═'.repeat(50)
  ];

  return lines.join('\n');
}

/**
 * 生成箱线图 (ASCII)
 * 
 * @param data - 数值数组
 * @returns ASCII 箱线图字符串
 * 
 * @example
 * const boxplot = asciiBoxplot([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
 * console.log(boxplot);
 */
export function asciiBoxplot(data: number[]): string {
  const stats = calculateStatistics(data);
  const width = 60;

  // 计算比例
  const minVal = stats.min;
  const maxVal = stats.max;
  const range = maxVal - minVal || 1;

  const scale = (value: number) => Math.round(((value - minVal) / range) * (width - 10));

  const q1Pos = scale(stats.q1);
  const medianPos = scale(stats.median);
  const q3Pos = scale(stats.q3);
  const minPos = scale(stats.min);
  const maxPos = scale(stats.max);

  const lines: string[] = [
    '📦 Box Plot (ASCII)',
    '═'.repeat(width),
    ''
  ];

  // 绘制箱线图
  let plotLine = ' '.repeat(minPos) + '├';
  plotLine += '─'.repeat(q1Pos - minPos) + '┌';
  plotLine += '─'.repeat(medianPos - q1Pos) + '│';
  plotLine += '─'.repeat(q3Pos - medianPos) + '┐';
  plotLine += '─'.repeat(maxPos - q3Pos) + '┤';
  
  lines.push(plotLine);

  // 标注
  lines.push(' '.repeat(minPos) + '└─ Min');
  lines.push(' '.repeat(q1Pos) + '└─ Q1');
  lines.push(' '.repeat(medianPos) + '└─ Median');
  lines.push(' '.repeat(q3Pos) + '└─ Q3');
  lines.push(' '.repeat(maxPos) + '└─ Max');

  lines.push('');
  lines.push(`Scale: ${minVal} to ${maxVal}`);
  lines.push('═'.repeat(width));

  return lines.join('\n');
}

/**
 * 生成直方图 (ASCII)
 * 
 * @param data - 数值数组
 * @param bins - 分组数量，默认 10
 * @returns ASCII 直方图字符串
 * 
 * @example
 * const histogram = asciiHistogram([1,2,3,4,5,6,7,8,9,10,1,2,3,4,5], 5);
 * console.log(histogram);
 */
export function asciiHistogram(data: number[], bins: number = 10): string {
  if (data.length === 0) {
    return 'No data to display';
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const binWidth = (max - min) / bins || 1;

  // 初始化桶
  const histogram = Array(bins).fill(0);

  // 填充桶
  data.forEach(value => {
    const binIndex = Math.min(
      Math.floor((value - min) / binWidth),
      bins - 1
    );
    histogram[binIndex]++;
  });

  const maxCount = Math.max(...histogram);
  const barWidth = 40;

  const lines: string[] = [
    '📊 Histogram (ASCII)',
    '═'.repeat(60),
    ''
  ];

  histogram.forEach((count, index) => {
    const binStart = min + index * binWidth;
    const binEnd = binStart + binWidth;
    const barLength = Math.round((count / maxCount) * barWidth);
    const bar = '█'.repeat(barLength);

    lines.push(
      `${binStart.toFixed(1).padStart(6)} - ${binEnd.toFixed(1).padEnd(6)} │ ${bar} ${count}`
    );
  });

  lines.push('');
  lines.push(`Total: ${data.length} values | Bins: ${bins}`);
  lines.push('═'.repeat(60));

  return lines.join('\n');
}

// ============================================
// 使用示例
// ============================================

if (require.main === module) {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║        图表工具技能 - ACE - 使用示例                   ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  // 1. ASCII 条形图
  console.log('1️⃣ ASCII 条形图:');
  console.log('─'.repeat(60));
  const barData = [
    {label: 'Q1', value: 45},
    {label: 'Q2', value: 72},
    {label: 'Q3', value: 58},
    {label: 'Q4', value: 89}
  ];
  console.log(asciiBarChart(barData, {width: 30}));
  console.log('');

  // 2. ASCII 折线图
  console.log('2️⃣ ASCII 折线图:');
  console.log('─'.repeat(60));
  const lineData = [10, 25, 18, 30, 45, 35, 50, 42, 60, 55];
  console.log(asciiLineChart(lineData, {width: 40, height: 8}));
  console.log('');

  // 3. ASCII 饼图
  console.log('3️⃣ ASCII 饼图:');
  console.log('─'.repeat(60));
  const pieData = [
    {label: 'Product A', value: 35},
    {label: 'Product B', value: 25},
    {label: 'Product C', value: 20},
    {label: 'Product D', value: 20}
  ];
  console.log(asciiPieChart(pieData, {radius: 8}));
  console.log('');

  // 4. 数据可视化摘要
  console.log('4️⃣ 数据可视化摘要:');
  console.log('─'.repeat(60));
  const vizData: DataPoint[] = [
    {x: 'Jan', y: 120},
    {x: 'Feb', y: 150},
    {x: 'Mar', y: 180},
    {x: 'Apr', y: 220},
    {x: 'May', y: 190}
  ];
  console.log(visualizeData(vizData));
  console.log('');

  // 5. 热力图
  console.log('5️⃣ 热力图:');
  console.log('─'.repeat(60));
  const heatMatrix = [
    [1, 3, 5, 7, 9],
    [2, 4, 6, 8, 10],
    [3, 6, 9, 12, 15],
    [4, 8, 12, 16, 20]
  ];
  console.log(heatmap(heatMatrix));
  console.log('');

  // 6. 统计报告
  console.log('6️⃣ 统计报告:');
  console.log('─'.repeat(60));
  const statData = [12, 15, 18, 22, 25, 28, 30, 35, 40, 45, 50, 55, 60];
  console.log(statisticalReport(statData));
  console.log('');

  // 7. ASCII 箱线图
  console.log('7️⃣ ASCII 箱线图:');
  console.log('─'.repeat(60));
  console.log(asciiBoxplot(statData));
  console.log('');

  // 8. ASCII 直方图
  console.log('8️⃣ ASCII 直方图:');
  console.log('─'.repeat(60));
  const histData = Array.from({length: 100}, () => 
    Math.floor(Math.random() * 50) + 1
  );
  console.log(asciiHistogram(histData, 8));
  console.log('');

  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║              ✅ 所有示例执行完成!                      ║');
  console.log('╚════════════════════════════════════════════════════════╝');
}
