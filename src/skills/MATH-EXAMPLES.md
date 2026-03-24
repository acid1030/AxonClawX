# Math Utils Skill - 使用示例

## 📦 导入

```typescript
import { 
  basicMath, 
  statistics, 
  vector, 
  matrix, 
  numberFormat, 
  random, 
  isNumber 
} from './math-utils-skill';

// 或者使用默认导出
import mathUtils from './math-utils-skill';
```

---

## 🔢 基础运算

### 四则运算

```typescript
// 加法
basicMath.add(1, 2, 3, 4, 5); // 15
basicMath.add(10.5, 20.3); // 30.8

// 减法 (从左到右依次相减)
basicMath.subtract(100, 20, 5); // 75
basicMath.subtract(50, 10, 5, 2); // 33

// 乘法
basicMath.multiply(2, 3, 4); // 24
basicMath.multiply(1.5, 2, 3); // 9

// 除法 (从左到右依次相除)
basicMath.divide(100, 2, 5); // 10
basicMath.divide(72, 2, 3, 2); // 6
```

### 高级运算

```typescript
// 幂运算
basicMath.power(2, 10); // 1024
basicMath.power(3, 4); // 81

// 平方根
basicMath.sqrt(144); // 12
basicMath.sqrt(2); // 1.4142135623730951

// 立方根
basicMath.cbrt(27); // 3
basicMath.cbrt(-8); // -2

// 绝对值
basicMath.abs(-42); // 42
basicMath.abs(3.14); // 3.14

// 取余
basicMath.modulo(17, 5); // 2
basicMath.modulo(100, 7); // 2

// 阶乘
basicMath.factorial(5); // 120
basicMath.factorial(0); // 1
basicMath.factorial(10); // 3628800

// 最大公约数
basicMath.gcd(48, 18); // 6
basicMath.gcd(100, 35); // 5

// 最小公倍数
basicMath.lcm(12, 18); // 36
basicMath.lcm(15, 25); // 75
```

---

## 📊 统计计算

### 基础统计

```typescript
const data = [12, 15, 18, 22, 25, 28, 30, 35, 40, 45];

// 平均值
statistics.mean(data); // 27

// 中位数
statistics.median(data); // 26.5
statistics.median([1, 3, 3, 6, 7, 8, 9]); // 6

// 众数 (返回所有众数)
statistics.mode([1, 2, 2, 3, 3, 3, 4]); // [3]
statistics.mode([1, 1, 2, 2, 3]); // [1, 2]

// 最小值/最大值
statistics.min(data); // 12
statistics.max(data); // 45

// 范围 (极差)
statistics.range(data); // 33

// 总和
statistics.sum(data); // 270

// 计数
statistics.count(data); // 10
```

### 离散程度

```typescript
const data = [12, 15, 18, 22, 25, 28, 30, 35, 40, 45];

// 方差 (样本方差)
statistics.variance(data).toFixed(2); // 117.78

// 标准差 (样本标准差)
statistics.standardDeviation(data).toFixed(2); // 10.85

// 四分位数
statistics.quartiles(data); 
// { Q1: 18, Q2: 26.5, Q3: 35 }

// 百分位数
statistics.percentile(data, 90); // 40
statistics.percentile(data, 25); // 18
statistics.percentile(data, 75); // 35
```

### 相关性分析

```typescript
// 协方差
const x = [1, 2, 3, 4, 5];
const y = [2, 4, 5, 4, 5];
statistics.covariance(x, y).toFixed(2); // 1.70

// 相关系数 (Pearson)
statistics.correlation(x, y).toFixed(2); // 0.73

// 完美正相关
statistics.correlation([1, 2, 3], [2, 4, 6]); // 1

// 完美负相关
statistics.correlation([1, 2, 3], [6, 4, 2]); // -1
```

---

## ➗ 向量运算

### 基础运算

```typescript
import { vector } from './math-utils-skill';

const vec1: vector.Vector = [1, 2, 3];
const vec2: vector.Vector = [4, 5, 6];

// 向量加法
vector.add(vec1, vec2); // [5, 7, 9]

// 向量减法
vector.subtract(vec2, vec1); // [3, 3, 3]

// 向量数乘
vector.scalarMultiply(vec1, 2); // [2, 4, 6]
vector.scalarMultiply(vec1, -1); // [-1, -2, -3]
```

### 向量积

```typescript
const vec1: vector.Vector = [1, 2, 3];
const vec2: vector.Vector = [4, 5, 6];

// 点积 (内积)
vector.dot(vec1, vec2); // 32
// 计算：1*4 + 2*5 + 3*6 = 32

// 叉积 (仅适用于 3D 向量)
vector.cross(vec1, vec2); // [-3, 6, -3]
// 结果向量垂直于 vec1 和 vec2
```

### 向量属性

```typescript
const vec: vector.Vector = [3, 4];

// 模长 (长度)
vector.magnitude(vec); // 5
// 计算：√(3² + 4²) = 5

const vec3D: vector.Vector = [1, 2, 2];
vector.magnitude(vec3D); // 3

// 归一化 (单位向量)
vector.normalize(vec); // [0.6, 0.8]
vector.normalize(vec3D); // [0.333..., 0.666..., 0.666...]

// 夹角 (弧度)
const a: vector.Vector = [1, 0];
const b: vector.Vector = [0, 1];
vector.angle(a, b); // π/2 ≈ 1.5708

// 夹角 (角度)
vector.angleDegrees(a, b); // 90

const vec1: vector.Vector = [1, 2, 3];
const vec2: vector.Vector = [4, 5, 6];
vector.angleDegrees(vec1, vec2).toFixed(2); // 12.93°
```

### 向量投影与距离

```typescript
const vec1: vector.Vector = [1, 2, 3];
const vec2: vector.Vector = [4, 5, 6];

// 投影 (vec1 在 vec2 上的投影)
vector.project(vec1, vec2); 
// [1.9836..., 2.4795..., 2.9754...]

// 距离 (欧几里得距离)
vector.distance(vec1, vec2).toFixed(2); // 5.20
// 计算：√[(4-1)² + (5-2)² + (6-3)²] = √27 ≈ 5.20
```

---

## 📐 矩阵运算

### 特殊矩阵

```typescript
import { matrix } from './math-utils-skill';

// 零矩阵
matrix.zeros(2, 3);
// [
//   [0, 0, 0],
//   [0, 0, 0]
// ]

// 单位矩阵
matrix.identity(3);
// [
//   [1, 0, 0],
//   [0, 1, 0],
//   [0, 0, 1]
// ]
```

### 基础运算

```typescript
const mat1: matrix.Matrix = [
  [1, 2],
  [3, 4],
];
const mat2: matrix.Matrix = [
  [5, 6],
  [7, 8],
];

// 矩阵加法
matrix.add(mat1, mat2);
// [[6, 8], [10, 12]]

// 矩阵减法
matrix.subtract(mat2, mat1);
// [[4, 4], [4, 4]]

// 矩阵数乘
matrix.scalarMultiply(mat1, 2);
// [[2, 4], [6, 8]]

// 矩阵乘法
matrix.multiply(mat1, mat2);
// [[19, 22], [43, 50]]
// 计算：
// [0,0]: 1*5 + 2*7 = 19
// [0,1]: 1*6 + 2*8 = 22
// [1,0]: 3*5 + 4*7 = 43
// [1,1]: 3*6 + 4*8 = 50
```

### 矩阵属性

```typescript
const mat: matrix.Matrix = [
  [1, 2],
  [3, 4],
];

// 转置
matrix.transpose(mat);
// [[1, 3], [2, 4]]

// 迹 (主对角线元素之和)
matrix.trace(mat); // 5 (1 + 4)

// 行列式 (2x2)
matrix.determinant(mat).toFixed(2); // -2.00
// 计算：1*4 - 2*3 = -2

const mat3: matrix.Matrix = [
  [1, 2, 3],
  [0, 1, 4],
  [5, 6, 0],
];

// 行列式 (3x3)
matrix.determinant(mat3).toFixed(2); // 1.00

// 行列式 (任意方阵)
const mat4: matrix.Matrix = [
  [1, 2, 3, 4],
  [5, 6, 7, 8],
  [9, 10, 11, 12],
  [13, 14, 15, 16],
];
matrix.determinant(mat4); // 0 (奇异矩阵)
```

### 逆矩阵

```typescript
const mat: matrix.Matrix = [
  [1, 2],
  [3, 4],
];

// 逆矩阵 (2x2)
const inv = matrix.inverse(mat);
// [[-2, 1], [1.5, -0.5]]

// 验证：mat × inv = I
matrix.multiply(mat, inv);
// [[1, 0], [0, 1]] (单位矩阵)

// 3x3 矩阵求逆
const mat3: matrix.Matrix = [
  [1, 2, 3],
  [0, 1, 4],
  [5, 6, 0],
];
matrix.inverse(mat3);
// [[-24, 18, 5], [20, -15, -4], [-5, 4, 1]]
```

### 矩阵与向量相乘

```typescript
const mat: matrix.Matrix = [
  [1, 2, 3],
  [4, 5, 6],
  [7, 8, 9],
];
const vec: vector.Vector = [1, 2, 3];

matrix.multiplyVector(mat, vec);
// [14, 32, 50]
// 计算：
// [0]: 1*1 + 2*2 + 3*3 = 14
// [1]: 4*1 + 5*2 + 6*3 = 32
// [2]: 7*1 + 8*2 + 9*3 = 50
```

### 变换矩阵

```typescript
// 2D 旋转矩阵 (旋转 90 度)
matrix.rotation2D(90);
// [
//   [6.123e-17, -1],
//   [1, 6.123e-17]
// ]
// 近似于 [[0, -1], [1, 0]]

// 2D 缩放矩阵
matrix.scale2D(2, 3);
// [
//   [2, 0],
//   [0, 3]
// ]
```

---

## 💰 数字格式化

### 货币与百分比

```typescript
import { numberFormat } from './math-utils-skill';

// 货币 (CNY)
numberFormat.currency(1234.567, 'CNY'); // ¥1,234.57
numberFormat.currency(1234.567, 'CNY', 'zh-CN'); // ¥1,234.57

// 货币 (USD)
numberFormat.currency(1234.567, 'USD', 'en-US'); // $1,234.57
numberFormat.currency(1234.567, 'EUR', 'de-DE'); // 1.234,57 €

// 百分比
numberFormat.percentage(0.8765); // 87.65%
numberFormat.percentage(0.5, 1); // 50.0%
numberFormat.percentage(1.23456, 3); // 123.456%
```

### 科学计数与千分位

```typescript
// 科学计数法
numberFormat.scientific(1234567); // 1.23e+6
numberFormat.scientific(0.000123); // 1.23e-4
numberFormat.scientific(1234567, 4); // 1.2346e+6

// 千分位
numberFormat.thousands(1234567.89); // 1,234,567.89
numberFormat.thousands(1234567.89, 0); // 1,234,568
numberFormat.thousands(1234.5, 3); // 1,234.500
```

### 字节与紧凑格式

```typescript
// 字节格式化
numberFormat.bytes(1536000); // 1.46 MB
numberFormat.bytes(1024); // 1.00 KB
numberFormat.bytes(1073741824); // 1.00 GB
numberFormat.bytes(500); // 500.00 B
numberFormat.bytes(1099511627776); // 1.00 TB

// 紧凑数字 (1.2K, 3.4M, 5.6B)
numberFormat.compact(1234567); // 1.2M
numberFormat.compact(1500); // 1.5K
numberFormat.compact(1234567890); // 1.2B
numberFormat.compact(1234567890000); // 1.2T
numberFormat.compact(-5000); // -5.0K
```

### 精度控制

```typescript
// 保留小数位
numberFormat.fixed(3.1415926, 3); // 3.142
numberFormat.fixed(2.5, 3); // 2.500

// 有效数字
numberFormat.precision(0.0012345, 3); // 0.00123
numberFormat.precision(12345, 3); // 1.23e+4

// 四舍五入
numberFormat.round(3.14159, 2); // 3.14
numberFormat.round(3.145, 2); // 3.15
numberFormat.round(123.456, 1); // 123.5

// 向下取整
numberFormat.floor(3.9); // 3
numberFormat.floor(-3.1); // -4

// 向上取整
numberFormat.ceil(3.1); // 4
numberFormat.ceil(-3.9); // -3

// 截断 (不四舍五入)
numberFormat.truncate(3.999, 2); // 3.99
numberFormat.truncate(3.14159, 2); // 3.14
numberFormat.truncate(-3.999, 2); // -3.99
```

---

## 🎲 随机数

```typescript
import { random } from './math-utils-skill';

// 随机整数 (包含边界)
random.int(1, 100); // 1-100 之间的随机整数
random.int(1, 6); // 模拟骰子

// 随机浮点数
random.float(0, 1); // 0-1 之间的随机浮点数
random.float(-10, 10); // -10 到 10 之间

// 随机选择
random.choice(['苹果', '香蕉', '橙子']); // 随机选择一个水果
random.choice([1, 2, 3, 4, 5, 6]); // 随机选择一个数字

// 打乱数组
random.shuffle([1, 2, 3, 4, 5]); // [3, 1, 5, 2, 4] (示例)
random.shuffle(['A', 'B', 'C', 'D']); // ['C', 'A', 'D', 'B'] (示例)

// 随机 UUID
random.uuid(); // "550e8400-e29b-41d4-a716-446655440000"
```

---

## ✅ 类型检查

```typescript
import { isNumber } from './math-utils-skill';

isNumber(123); // true
isNumber(3.14); // true
isNumber(NaN); // false
isNumber(Infinity); // false
isNumber(-Infinity); // false
isNumber('123'); // false
isNumber(null); // false
isNumber(undefined); // false
isNumber({}); // false
isNumber([]); // false
```

---

## 🎯 实际应用场景

### 1. 物理引擎 - 向量运算

```typescript
// 计算两个物体之间的距离
const pos1: vector.Vector = [100, 200, 50];
const pos2: vector.Vector = [150, 250, 75];
const distance = vector.distance(pos1, pos2); // 70.71

// 计算速度向量
const velocity: vector.Vector = [10, 5, 0];
const speed = vector.magnitude(velocity); // 11.18

// 归一化方向向量
const direction = vector.normalize(velocity); // [0.89, 0.45, 0]
```

### 2. 数据分析 - 统计计算

```typescript
// 分析销售数据
const sales = [1200, 1500, 1800, 2200, 2500, 2800, 3000];

const avgSales = statistics.mean(sales); // 2142.86
const medianSales = statistics.median(sales); // 2200
const stdDev = statistics.standardDeviation(sales); // 648.07

// 检测异常值 (超过 2 个标准差)
const threshold = 2 * stdDev;
const outliers = sales.filter(s => 
  Math.abs(s - avgSales) > threshold
);
```

### 3. 图形变换 - 矩阵运算

```typescript
// 2D 旋转点 (绕原点旋转 90 度)
const point: vector.Vector = [1, 0];
const rotationMatrix = matrix.rotation2D(90);
const rotatedPoint = matrix.multiplyVector(rotationMatrix, point);
// [0, 1] (点从 (1,0) 旋转到 (0,1))

// 缩放变换
const scaleMatrix = matrix.scale2D(2, 3);
const scaledPoint = matrix.multiplyVector(scaleMatrix, point);
// [2, 0]
```

### 4. 财务计算 - 数字格式化

```typescript
// 格式化财务报表
const revenue = 1234567.89;
const profit = 0.2345;

console.log('营收:', numberFormat.currency(revenue, 'CNY')); // ¥1,234,567.89
console.log('利润率:', numberFormat.percentage(profit)); // 23.45%
console.log('精简显示:', numberFormat.compact(revenue)); // 1.2M
```

---

## 📝 注意事项

1. **向量长度检查**: 向量运算前会检查长度是否匹配
2. **矩阵维度检查**: 矩阵运算会验证维度兼容性
3. **除零保护**: 除法和逆矩阵运算会检查除数/行列式是否为零
4. **数值精度**: 浮点数运算可能存在精度误差，比较时建议使用容差
5. **性能考虑**: 大型矩阵运算 (如行列式) 使用递归算法，对于超大矩阵建议使用专业库

---

**生成时间:** 2026-03-13  
**版本:** 1.0.0
