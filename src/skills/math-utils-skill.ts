/**
 * Math Utils Skill - 数学计算工具
 * 
 * 功能:
 * 1. 基础数学运算 (加减乘除、幂、平方根等)
 * 2. 统计计算 (平均值、中位数、标准差等)
 * 3. 向量矩阵运算 (点积、叉积、矩阵乘法等)
 * 4. 数字格式化 (货币、百分比、科学计数法等)
 */

// ==================== 基础数学运算 ====================

/**
 * 基础计算器
 */
export const basicMath = {
  /**
   * 加法
   */
  add: (...numbers: number[]): number => {
    return numbers.reduce((sum, num) => sum + num, 0);
  },

  /**
   * 减法 (从左到右依次相减)
   */
  subtract: (...numbers: number[]): number => {
    if (numbers.length === 0) return 0;
    return numbers.reduce((result, num) => result - num);
  },

  /**
   * 乘法
   */
  multiply: (...numbers: number[]): number => {
    return numbers.reduce((product, num) => product * num, 1);
  },

  /**
   * 除法 (从左到右依次相除)
   */
  divide: (...numbers: number[]): number => {
    if (numbers.length === 0) return 0;
    if (numbers.slice(1).includes(0)) {
      throw new Error('除数不能为零');
    }
    return numbers.reduce((result, num) => result / num);
  },

  /**
   * 幂运算
   */
  power: (base: number, exponent: number): number => {
    return Math.pow(base, exponent);
  },

  /**
   * 平方根
   */
  sqrt: (number: number): number => {
    if (number < 0) {
      throw new Error('不能计算负数的平方根');
    }
    return Math.sqrt(number);
  },

  /**
   * 立方根
   */
  cbrt: (number: number): number => {
    return Math.cbrt(number);
  },

  /**
   * 绝对值
   */
  abs: (number: number): number => {
    return Math.abs(number);
  },

  /**
   * 取余
   */
  modulo: (dividend: number, divisor: number): number => {
    if (divisor === 0) {
      throw new Error('除数不能为零');
    }
    return dividend % divisor;
  },

  /**
   * 阶乘
   */
  factorial: (n: number): number => {
    if (n < 0) {
      throw new Error('不能计算负数的阶乘');
    }
    if (n === 0 || n === 1) return 1;
    let result = 1;
    for (let i = 2; i <= n; i++) {
      result *= i;
    }
    return result;
  },

  /**
   * 最大公约数 (GCD)
   */
  gcd: (a: number, b: number): number => {
    a = Math.abs(a);
    b = Math.abs(b);
    while (b !== 0) {
      const temp = b;
      b = a % b;
      a = temp;
    }
    return a;
  },

  /**
   * 最小公倍数 (LCM)
   */
  lcm: (a: number, b: number): number => {
    if (a === 0 || b === 0) return 0;
    return Math.abs(a * b) / basicMath.gcd(a, b);
  },
};

// ==================== 向量与矩阵运算 ====================

/**
 * 向量类型
 */
export type Vector = number[];

/**
 * 矩阵类型 (二维数组)
 */
export type Matrix = number[][];

/**
 * 向量计算器
 */
export const vector = {
  /**
   * 向量加法
   */
  add: (a: Vector, b: Vector): Vector => {
    if (a.length !== b.length) {
      throw new Error('向量长度必须相同');
    }
    return a.map((val, i) => val + b[i]);
  },

  /**
   * 向量减法
   */
  subtract: (a: Vector, b: Vector): Vector => {
    if (a.length !== b.length) {
      throw new Error('向量长度必须相同');
    }
    return a.map((val, i) => val - b[i]);
  },

  /**
   * 向量数乘
   */
  scalarMultiply: (vec: Vector, scalar: number): Vector => {
    return vec.map((val) => val * scalar);
  },

  /**
   * 向量点积 (内积)
   */
  dot: (a: Vector, b: Vector): number => {
    if (a.length !== b.length) {
      throw new Error('向量长度必须相同');
    }
    return a.reduce((sum, val, i) => sum + val * b[i], 0);
  },

  /**
   * 向量叉积 (仅适用于 3D 向量)
   */
  cross: (a: Vector, b: Vector): Vector => {
    if (a.length !== 3 || b.length !== 3) {
      throw new Error('叉积仅适用于 3D 向量');
    }
    return [
      a[1] * b[2] - a[2] * b[1],
      a[2] * b[0] - a[0] * b[2],
      a[0] * b[1] - a[1] * b[0],
    ];
  },

  /**
   * 向量模长 (长度)
   */
  magnitude: (vec: Vector): number => {
    return Math.sqrt(vec.reduce((sum, val) => sum + val * val, 0));
  },

  /**
   * 向量归一化 (单位向量)
   */
  normalize: (vec: Vector): Vector => {
    const mag = vector.magnitude(vec);
    if (mag === 0) {
      throw new Error('不能归一化零向量');
    }
    return vec.map((val) => val / mag);
  },

  /**
   * 向量夹角 (弧度)
   */
  angle: (a: Vector, b: Vector): number => {
    const dotProduct = vector.dot(a, b);
    const magA = vector.magnitude(a);
    const magB = vector.magnitude(b);
    
    if (magA === 0 || magB === 0) {
      throw new Error('向量模长不能为零');
    }
    
    const cosAngle = dotProduct / (magA * magB);
    return Math.acos(Math.max(-1, Math.min(1, cosAngle)));
  },

  /**
   * 向量夹角 (角度)
   */
  angleDegrees: (a: Vector, b: Vector): number => {
    return (vector.angle(a, b) * 180) / Math.PI;
  },

  /**
   * 向量投影 (a 在 b 上的投影)
   */
  project: (a: Vector, b: Vector): Vector => {
    const dotProduct = vector.dot(a, b);
    const magBSquared = b.reduce((sum, val) => sum + val * val, 0);
    
    if (magBSquared === 0) {
      throw new Error('不能投影到零向量');
    }
    
    const scalar = dotProduct / magBSquared;
    return vector.scalarMultiply(b, scalar);
  },

  /**
   * 向量距离 (欧几里得距离)
   */
  distance: (a: Vector, b: Vector): number => {
    return vector.magnitude(vector.subtract(a, b));
  },
};

/**
 * 矩阵计算器
 */
export const matrix = {
  /**
   * 创建零矩阵
   */
  zeros: (rows: number, cols: number): Matrix => {
    return Array(rows)
      .fill(0)
      .map(() => Array(cols).fill(0));
  },

  /**
   * 创建单位矩阵
   */
  identity: (size: number): Matrix => {
    return Array(size)
      .fill(0)
      .map((_, row) =>
        Array(size)
          .fill(0)
          .map((_, col) => (row === col ? 1 : 0))
      );
  },

  /**
   * 矩阵加法
   */
  add: (a: Matrix, b: Matrix): Matrix => {
    if (a.length !== b.length || a[0].length !== b[0].length) {
      throw new Error('矩阵维度必须相同');
    }
    return a.map((row, i) => row.map((val, j) => val + b[i][j]));
  },

  /**
   * 矩阵减法
   */
  subtract: (a: Matrix, b: Matrix): Matrix => {
    if (a.length !== b.length || a[0].length !== b[0].length) {
      throw new Error('矩阵维度必须相同');
    }
    return a.map((row, i) => row.map((val, j) => val - b[i][j]));
  },

  /**
   * 矩阵数乘
   */
  scalarMultiply: (mat: Matrix, scalar: number): Matrix => {
    return mat.map((row) => row.map((val) => val * scalar));
  },

  /**
   * 矩阵乘法
   */
  multiply: (a: Matrix, b: Matrix): Matrix => {
    if (a[0].length !== b.length) {
      throw new Error('矩阵 A 的列数必须等于矩阵 B 的行数');
    }

    const rowsA = a.length;
    const colsA = a[0].length;
    const colsB = b[0].length;

    const result: Matrix = matrix.zeros(rowsA, colsB);

    for (let i = 0; i < rowsA; i++) {
      for (let j = 0; j < colsB; j++) {
        let sum = 0;
        for (let k = 0; k < colsA; k++) {
          sum += a[i][k] * b[k][j];
        }
        result[i][j] = sum;
      }
    }

    return result;
  },

  /**
   * 矩阵转置
   */
  transpose: (mat: Matrix): Matrix => {
    const rows = mat.length;
    const cols = mat[0].length;

    return Array(cols)
      .fill(0)
      .map((_, i) =>
        Array(rows)
          .fill(0)
          .map((_, j) => mat[j][i])
      );
  },

  /**
   * 矩阵迹 (主对角线元素之和)
   */
  trace: (mat: Matrix): number => {
    if (mat.length !== mat[0].length) {
      throw new Error('只有方阵才有迹');
    }
    return mat.reduce((sum, row, i) => sum + row[i], 0);
  },

  /**
   * 2x2 矩阵行列式
   */
  determinant2x2: (mat: Matrix): number => {
    return mat[0][0] * mat[1][1] - mat[0][1] * mat[1][0];
  },

  /**
   * 3x3 矩阵行列式
   */
  determinant3x3: (mat: Matrix): number => {
    return (
      mat[0][0] * (mat[1][1] * mat[2][2] - mat[1][2] * mat[2][1]) -
      mat[0][1] * (mat[1][0] * mat[2][2] - mat[1][2] * mat[2][0]) +
      mat[0][2] * (mat[1][0] * mat[2][1] - mat[1][1] * mat[2][0])
    );
  },

  /**
   * 矩阵行列式 (递归计算，适用于任意方阵)
   */
  determinant: (mat: Matrix): number => {
    if (mat.length !== mat[0].length) {
      throw new Error('只有方阵才有行列式');
    }

    const n = mat.length;

    if (n === 1) return mat[0][0];
    if (n === 2) return matrix.determinant2x2(mat);
    if (n === 3) return matrix.determinant3x3(mat);

    let det = 0;
    for (let col = 0; col < n; col++) {
      const subMatrix: Matrix = [];
      for (let i = 1; i < n; i++) {
        const row: number[] = [];
        for (let j = 0; j < n; j++) {
          if (j !== col) {
            row.push(mat[i][j]);
          }
        }
        subMatrix.push(row);
      }
      det += Math.pow(-1, col) * mat[0][col] * matrix.determinant(subMatrix);
    }

    return det;
  },

  /**
   * 矩阵与向量相乘
   */
  multiplyVector: (mat: Matrix, vec: Vector): Vector => {
    if (mat[0].length !== vec.length) {
      throw new Error('矩阵列数必须等于向量长度');
    }
    return mat.map((row) => row.reduce((sum, val, i) => sum + val * vec[i], 0));
  },

  /**
   * 2x2 矩阵逆矩阵
   */
  inverse2x2: (mat: Matrix): Matrix => {
    const det = matrix.determinant2x2(mat);
    if (det === 0) {
      throw new Error('矩阵不可逆 (行列式为零)');
    }
    return [
      [mat[1][1] / det, -mat[0][1] / det],
      [-mat[1][0] / det, mat[0][0] / det],
    ];
  },

  /**
   * 矩阵逆矩阵 (使用伴随矩阵法)
   */
  inverse: (mat: Matrix): Matrix => {
    const n = mat.length;
    if (n !== mat[0].length) {
      throw new Error('只有方阵才有逆矩阵');
    }

    const det = matrix.determinant(mat);
    if (det === 0) {
      throw new Error('矩阵不可逆 (行列式为零)');
    }

    // 对于 2x2 矩阵，使用简化公式
    if (n === 2) {
      return matrix.inverse2x2(mat);
    }

    // 计算伴随矩阵
    const cofactors: Matrix = matrix.zeros(n, n);
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const subMatrix: Matrix = [];
        for (let row = 0; row < n; row++) {
          if (row !== i) {
            const subRow: number[] = [];
            for (let col = 0; col < n; col++) {
              if (col !== j) {
                subRow.push(mat[row][col]);
              }
            }
            subMatrix.push(subRow);
          }
        }
        cofactors[i][j] = Math.pow(-1, i + j) * matrix.determinant(subMatrix);
      }
    }

    // 转置伴随矩阵并除以行列式
    const adjugate = matrix.transpose(cofactors);
    return matrix.scalarMultiply(adjugate, 1 / det);
  },

  /**
   * 矩阵旋转 (2D 旋转矩阵)
   */
  rotation2D: (angleDegrees: number): Matrix => {
    const angleRad = (angleDegrees * Math.PI) / 180;
    const cos = Math.cos(angleRad);
    const sin = Math.sin(angleRad);
    return [
      [cos, -sin],
      [sin, cos],
    ];
  },

  /**
   * 矩阵缩放 (2D 缩放矩阵)
   */
  scale2D: (sx: number, sy: number): Matrix => {
    return [
      [sx, 0],
      [0, sy],
    ];
  },
};

// ==================== 统计计算 ====================

/**
 * 统计计算器
 */
export const statistics = {
  /**
   * 平均值
   */
  mean: (numbers: number[]): number => {
    if (numbers.length === 0) return 0;
    return numbers.reduce((sum, num) => sum + num, 0) / numbers.length;
  },

  /**
   * 中位数
   */
  median: (numbers: number[]): number => {
    if (numbers.length === 0) return 0;
    const sorted = [...numbers].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid];
  },

  /**
   * 众数 (返回所有众数)
   */
  mode: (numbers: number[]): number[] => {
    if (numbers.length === 0) return [];
    const frequency: Record<number, number> = {};
    let maxFreq = 0;

    numbers.forEach((num) => {
      frequency[num] = (frequency[num] || 0) + 1;
      maxFreq = Math.max(maxFreq, frequency[num]);
    });

    return Object.keys(frequency)
      .filter((key) => frequency[Number(key)] === maxFreq)
      .map(Number);
  },

  /**
   * 方差 (样本方差)
   */
  variance: (numbers: number[]): number => {
    if (numbers.length < 2) return 0;
    const mean = statistics.mean(numbers);
    const squareDiffs = numbers.map((num) => Math.pow(num - mean, 2));
    return squareDiffs.reduce((sum, square) => sum + square, 0) / (numbers.length - 1);
  },

  /**
   * 标准差 (样本标准差)
   */
  standardDeviation: (numbers: number[]): number => {
    return Math.sqrt(statistics.variance(numbers));
  },

  /**
   * 最小值
   */
  min: (numbers: number[]): number => {
    if (numbers.length === 0) return 0;
    return Math.min(...numbers);
  },

  /**
   * 最大值
   */
  max: (numbers: number[]): number => {
    if (numbers.length === 0) return 0;
    return Math.max(...numbers);
  },

  /**
   * 范围 (最大值 - 最小值)
   */
  range: (numbers: number[]): number => {
    if (numbers.length === 0) return 0;
    return statistics.max(numbers) - statistics.min(numbers);
  },

  /**
   * 总和
   */
  sum: (numbers: number[]): number => {
    return numbers.reduce((sum, num) => sum + num, 0);
  },

  /**
   * 计数
   */
  count: (numbers: number[]): number => {
    return numbers.length;
  },

  /**
   * 四分位数 (Q1, Q2, Q3)
   */
  quartiles: (numbers: number[]): { Q1: number; Q2: number; Q3: number } => {
    if (numbers.length === 0) {
      return { Q1: 0, Q2: 0, Q3: 0 };
    }
    const sorted = [...numbers].sort((a, b) => a - b);
    const Q2 = statistics.median(sorted);

    const mid = Math.floor(sorted.length / 2);
    const lowerHalf = sorted.slice(0, mid);
    const upperHalf = sorted.slice(sorted.length % 2 === 0 ? mid : mid + 1);

    return {
      Q1: statistics.median(lowerHalf),
      Q2,
      Q3: statistics.median(upperHalf),
    };
  },

  /**
   * 百分位数
   */
  percentile: (numbers: number[], p: number): number => {
    if (numbers.length === 0) return 0;
    if (p < 0 || p > 100) {
      throw new Error('百分位数必须在 0-100 之间');
    }
    const sorted = [...numbers].sort((a, b) => a - b);
    const index = (p / 100) * (sorted.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index - lower;

    if (lower === upper) {
      return sorted[lower];
    }
    return sorted[lower] * (1 - weight) + sorted[upper] * weight;
  },

  /**
   * 协方差
   */
  covariance: (x: number[], y: number[]): number => {
    if (x.length !== y.length) {
      throw new Error('两个数组长度必须相同');
    }
    if (x.length < 2) return 0;

    const meanX = statistics.mean(x);
    const meanY = statistics.mean(y);

    let sum = 0;
    for (let i = 0; i < x.length; i++) {
      sum += (x[i] - meanX) * (y[i] - meanY);
    }

    return sum / (x.length - 1);
  },

  /**
   * 相关系数 (Pearson)
   */
  correlation: (x: number[], y: number[]): number => {
    if (x.length !== y.length) {
      throw new Error('两个数组长度必须相同');
    }

    const cov = statistics.covariance(x, y);
    const stdX = statistics.standardDeviation(x);
    const stdY = statistics.standardDeviation(y);

    if (stdX === 0 || stdY === 0) return 0;
    return cov / (stdX * stdY);
  },
};

// ==================== 数字格式化 ====================

/**
 * 数字格式化工具
 */
export const numberFormat = {
  /**
   * 格式化为货币
   */
  currency: (
    amount: number,
    currency: string = 'CNY',
    locale: string = 'zh-CN'
  ): string => {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
    }).format(amount);
  },

  /**
   * 格式化为百分比
   */
  percentage: (value: number, decimals: number = 2): string => {
    return `${(value * 100).toFixed(decimals)}%`;
  },

  /**
   * 格式化为科学计数法
   */
  scientific: (value: number, precision: number = 2): string => {
    return value.toExponential(precision);
  },

  /**
   * 格式化为千分位
   */
  thousands: (value: number, decimals: number = 2): string => {
    return value.toLocaleString('zh-CN', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  },

  /**
   * 格式化为字节 (B, KB, MB, GB, TB)
   */
  bytes: (bytes: number, decimals: number = 2): string => {
    if (bytes === 0) return '0 B';

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${(bytes / Math.pow(k, i)).toFixed(decimals)} ${sizes[i]}`;
  },

  /**
   * 格式化为紧凑数字 (1.2K, 3.4M, 5.6B)
   */
  compact: (value: number, decimals: number = 1): string => {
    const absValue = Math.abs(value);
    const negative = value < 0 ? '-' : '';

    if (absValue >= 1e12) {
      return `${negative}${(absValue / 1e12).toFixed(decimals)}T`;
    }
    if (absValue >= 1e9) {
      return `${negative}${(absValue / 1e9).toFixed(decimals)}B`;
    }
    if (absValue >= 1e6) {
      return `${negative}${(absValue / 1e6).toFixed(decimals)}M`;
    }
    if (absValue >= 1e3) {
      return `${negative}${(absValue / 1e3).toFixed(decimals)}K`;
    }

    return `${negative}${absValue.toFixed(decimals)}`;
  },

  /**
   * 保留小数位
   */
  fixed: (value: number, decimals: number = 2): string => {
    return value.toFixed(decimals);
  },

  /**
   * 保留有效数字
   */
  precision: (value: number, digits: number = 3): string => {
    return value.toPrecision(digits);
  },

  /**
   * 四舍五入到指定位数
   */
  round: (value: number, decimals: number = 0): number => {
    const factor = Math.pow(10, decimals);
    return Math.round(value * factor) / factor;
  },

  /**
   * 向下取整
   */
  floor: (value: number): number => {
    return Math.floor(value);
  },

  /**
   * 向上取整
   */
  ceil: (value: number): number => {
    return Math.ceil(value);
  },

  /**
   * 截断小数 (不四舍五入)
   */
  truncate: (value: number, decimals: number = 0): number => {
    const factor = Math.pow(10, decimals);
    return Math.trunc(value * factor) / factor;
  },
};

// ==================== 工具函数 ====================

/**
 * 检查是否为数字
 */
export const isNumber = (value: any): value is number => {
  return typeof value === 'number' && !isNaN(value) && isFinite(value);
};

/**
 * 生成随机数
 */
export const random = {
  /**
   * 生成范围内的随机整数
   */
  int: (min: number, max: number): number => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  },

  /**
   * 生成范围内的随机浮点数
   */
  float: (min: number, max: number): number => {
    return Math.random() * (max - min) + min;
  },

  /**
   * 从数组中随机选择
   */
  choice: <T>(array: T[]): T => {
    if (array.length === 0) {
      throw new Error('数组不能为空');
    }
    return array[random.int(0, array.length - 1)];
  },

  /**
   * 打乱数组
   */
  shuffle: <T>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = random.int(0, i);
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  },

  /**
   * 生成随机 UUID
   */
  uuid: (): string => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  },
};

// ==================== 使用示例 ====================

/**
 * 使用示例代码
 * 
 * 复制以下代码到你的项目中使用:
 */

/*
// ==================== 导入 ====================
import { basicMath, statistics, vector, matrix, numberFormat, random, isNumber } from './math-utils-skill';

// ==================== 基础运算示例 ====================
console.log('加法:', basicMath.add(1, 2, 3, 4, 5)); // 15
console.log('减法:', basicMath.subtract(100, 20, 5)); // 75
console.log('乘法:', basicMath.multiply(2, 3, 4)); // 24
console.log('除法:', basicMath.divide(100, 2, 5)); // 10
console.log('幂运算:', basicMath.power(2, 10)); // 1024
console.log('平方根:', basicMath.sqrt(144)); // 12
console.log('阶乘:', basicMath.factorial(5)); // 120
console.log('最大公约数:', basicMath.gcd(48, 18)); // 6
console.log('最小公倍数:', basicMath.lcm(12, 18)); // 36

// ==================== 统计计算示例 ====================
const data = [12, 15, 18, 22, 25, 28, 30, 35, 40, 45];

console.log('平均值:', statistics.mean(data)); // 27
console.log('中位数:', statistics.median(data)); // 26.5
console.log('众数:', statistics.mode([1, 2, 2, 3, 3, 3, 4])); // [3]
console.log('方差:', statistics.variance(data).toFixed(2)); // 117.78
console.log('标准差:', statistics.standardDeviation(data).toFixed(2)); // 10.85
console.log('最小值:', statistics.min(data)); // 12
console.log('最大值:', statistics.max(data)); // 45
console.log('范围:', statistics.range(data)); // 33
console.log('总和:', statistics.sum(data)); // 270
console.log('四分位数:', statistics.quartiles(data)); // { Q1: 18, Q2: 26.5, Q3: 35 }
console.log('第 90 百分位数:', statistics.percentile(data, 90)); // 40

// 相关性分析
const x = [1, 2, 3, 4, 5];
const y = [2, 4, 5, 4, 5];
console.log('协方差:', statistics.covariance(x, y).toFixed(2)); // 1.7
console.log('相关系数:', statistics.correlation(x, y).toFixed(2)); // 0.73

// ==================== 向量运算示例 ====================
const vec1: vector.Vector = [1, 2, 3];
const vec2: vector.Vector = [4, 5, 6];

console.log('向量加法:', vector.add(vec1, vec2)); // [5, 7, 9]
console.log('向量减法:', vector.subtract(vec2, vec1)); // [3, 3, 3]
console.log('向量数乘:', vector.scalarMultiply(vec1, 2)); // [2, 4, 6]
console.log('向量点积:', vector.dot(vec1, vec2)); // 32
console.log('向量叉积:', vector.cross(vec1, vec2)); // [-3, 6, -3]
console.log('向量模长:', vector.magnitude(vec1).toFixed(2)); // 3.74
console.log('向量归一化:', vector.normalize(vec1).map(v => v.toFixed(2))); // [0.27, 0.53, 0.80]
console.log('向量夹角 (度):', vector.angleDegrees(vec1, vec2).toFixed(2)); // 12.93°
console.log('向量投影:', vector.project(vec1, vec2).map(v => v.toFixed(2))); // [1.98, 2.47, 2.96]
console.log('向量距离:', vector.distance(vec1, vec2).toFixed(2)); // 5.20

// ==================== 矩阵运算示例 ====================
const mat1: matrix.Matrix = [
  [1, 2],
  [3, 4],
];
const mat2: matrix.Matrix = [
  [5, 6],
  [7, 8],
];

console.log('矩阵加法:', matrix.add(mat1, mat2)); // [[6, 8], [10, 12]]
console.log('矩阵减法:', matrix.subtract(mat2, mat1)); // [[4, 4], [4, 4]]
console.log('矩阵数乘:', matrix.scalarMultiply(mat1, 2)); // [[2, 4], [6, 8]]
console.log('矩阵乘法:', matrix.multiply(mat1, mat2)); // [[19, 22], [43, 50]]
console.log('矩阵转置:', matrix.transpose(mat1)); // [[1, 3], [2, 4]]
console.log('矩阵迹:', matrix.trace(mat1)); // 5
console.log('行列式 (2x2):', matrix.determinant(mat1).toFixed(2)); // -2.00
console.log('逆矩阵:', matrix.inverse(mat1).map(row => row.map(v => v.toFixed(2)))); // [[-2.00, 1.00], [1.50, -0.50]]

// 3x3 矩阵
const mat3: matrix.Matrix = [
  [1, 2, 3],
  [0, 1, 4],
  [5, 6, 0],
];
console.log('行列式 (3x3):', matrix.determinant(mat3).toFixed(2)); // 1.00

// 单位矩阵
console.log('单位矩阵:', matrix.identity(3)); // [[1,0,0], [0,1,0], [0,0,1]]

// 矩阵与向量相乘
const vec3: vector.Vector = [1, 2, 3];
console.log('矩阵×向量:', matrix.multiplyVector(mat3, vec3)); // [14, 14, 17]

// 2D 旋转矩阵 (旋转 90 度)
console.log('旋转矩阵 (90°):', matrix.rotation2D(90).map(row => row.map(v => v.toFixed(2))));

// ==================== 数字格式化示例 ====================
console.log('货币:', numberFormat.currency(1234.567, 'CNY')); // ¥1,234.57
console.log('货币 (USD):', numberFormat.currency(1234.567, 'USD', 'en-US')); // $1,234.57
console.log('百分比:', numberFormat.percentage(0.8765)); // 87.65%
console.log('科学计数:', numberFormat.scientific(1234567)); // 1.23e+6
console.log('千分位:', numberFormat.thousands(1234567.89)); // 1,234,567.89
console.log('字节:', numberFormat.bytes(1536000)); // 1.46 MB
console.log('紧凑数字:', numberFormat.compact(1234567)); // 1.2M
console.log('保留小数:', numberFormat.fixed(3.1415926, 3)); // 3.142
console.log('有效数字:', numberFormat.precision(0.0012345, 3)); // 0.00123
console.log('四舍五入:', numberFormat.round(3.14159, 2)); // 3.14
console.log('向下取整:', numberFormat.floor(3.9)); // 3
console.log('向上取整:', numberFormat.ceil(3.1)); // 4
console.log('截断:', numberFormat.truncate(3.999, 2)); // 3.99

// ==================== 随机数示例 ====================
console.log('随机整数 (1-100):', random.int(1, 100));
console.log('随机浮点数 (0-1):', random.float(0, 1));
console.log('随机选择:', random.choice(['苹果', '香蕉', '橙子']));
console.log('打乱数组:', random.shuffle([1, 2, 3, 4, 5]));
console.log('随机 UUID:', random.uuid());

// ==================== 类型检查 ====================
console.log('是否为数字:', isNumber(123)); // true
console.log('是否为数字:', isNumber('123')); // false
console.log('是否为数字:', isNumber(NaN)); // false
*/

// ==================== 导出所有功能 ====================
export default {
  basicMath,
  statistics,
  vector,
  matrix,
  numberFormat,
  random,
  isNumber,
};
