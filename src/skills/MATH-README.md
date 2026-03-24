# Math Utils Skill - 数学计算工具

> 全面的数学计算库，支持基础运算、统计分析、向量矩阵运算和数字格式化

## 📦 功能特性

### 1. 基础数学运算 (`basicMath`)
- ✅ 四则运算 (加减乘除)
- ✅ 幂运算、平方根、立方根
- ✅ 绝对值、取余
- ✅ 阶乘计算
- ✅ 最大公约数 (GCD)、最小公倍数 (LCM)

### 2. 统计计算 (`statistics`)
- ✅ 平均值、中位数、众数
- ✅ 方差、标准差
- ✅ 最小值、最大值、范围
- ✅ 四分位数、百分位数
- ✅ 协方差、相关系数 (Pearson)

### 3. 向量运算 (`vector`)
- ✅ 向量加法、减法、数乘
- ✅ 点积 (内积)、叉积 (外积)
- ✅ 模长、归一化
- ✅ 夹角计算 (弧度/角度)
- ✅ 向量投影、距离计算

### 4. 矩阵运算 (`matrix`)
- ✅ 特殊矩阵 (零矩阵、单位矩阵)
- ✅ 矩阵加法、减法、数乘、乘法
- ✅ 转置、迹
- ✅ 行列式 (2x2、3x3、任意方阵)
- ✅ 逆矩阵
- ✅ 矩阵与向量相乘
- ✅ 变换矩阵 (旋转、缩放)

### 5. 数字格式化 (`numberFormat`)
- ✅ 货币格式化 (支持多币种)
- ✅ 百分比格式化
- ✅ 科学计数法
- ✅ 千分位分隔
- ✅ 字节格式化 (B, KB, MB, GB, TB)
- ✅ 紧凑数字 (1.2K, 3.4M, 5.6B)
- ✅ 精度控制 (四舍五入、截断、取整)

### 6. 随机数 (`random`)
- ✅ 随机整数、随机浮点数
- ✅ 随机选择、数组打乱
- ✅ UUID 生成

### 7. 类型检查 (`isNumber`)
- ✅ 数字验证 (排除 NaN、Infinity)

---

## 🚀 快速开始

```typescript
import { basicMath, statistics, vector, matrix, numberFormat } from './math-utils-skill';

// 基础运算
basicMath.add(1, 2, 3, 4, 5); // 15
basicMath.factorial(5); // 120

// 统计计算
statistics.mean([10, 20, 30, 40, 50]); // 30
statistics.standardDeviation([10, 20, 30, 40, 50]); // 15.81

// 向量运算
const v1: vector.Vector = [1, 2, 3];
const v2: vector.Vector = [4, 5, 6];
vector.dot(v1, v2); // 32
vector.cross(v1, v2); // [-3, 6, -3]

// 矩阵运算
const mat: matrix.Matrix = [[1, 2], [3, 4]];
matrix.determinant(mat); // -2
matrix.inverse(mat); // [[-2, 1], [1.5, -0.5]]

// 数字格式化
numberFormat.currency(1234.56, 'CNY'); // ¥1,234.56
numberFormat.bytes(1536000); // 1.46 MB
```

---

## 📖 详细文档

- **使用示例**: [MATH-EXAMPLES.md](./MATH-EXAMPLES.md)
- **源代码**: [math-utils-skill.ts](./math-utils-skill.ts)

---

## 📊 API 参考

### 基础运算

| 方法 | 参数 | 返回值 | 描述 |
|------|------|--------|------|
| `add` | `...numbers: number[]` | `number` | 加法 |
| `subtract` | `...numbers: number[]` | `number` | 减法 |
| `multiply` | `...numbers: number[]` | `number` | 乘法 |
| `divide` | `...numbers: number[]` | `number` | 除法 |
| `power` | `base: number, exponent: number` | `number` | 幂运算 |
| `sqrt` | `number: number` | `number` | 平方根 |
| `factorial` | `n: number` | `number` | 阶乘 |
| `gcd` | `a: number, b: number` | `number` | 最大公约数 |
| `lcm` | `a: number, b: number` | `number` | 最小公倍数 |

### 统计计算

| 方法 | 参数 | 返回值 | 描述 |
|------|------|--------|------|
| `mean` | `numbers: number[]` | `number` | 平均值 |
| `median` | `numbers: number[]` | `number` | 中位数 |
| `mode` | `numbers: number[]` | `number[]` | 众数 |
| `variance` | `numbers: number[]` | `number` | 方差 |
| `standardDeviation` | `numbers: number[]` | `number` | 标准差 |
| `quartiles` | `numbers: number[]` | `{Q1, Q2, Q3}` | 四分位数 |
| `percentile` | `numbers: number[], p: number` | `number` | 百分位数 |
| `covariance` | `x: number[], y: number[]` | `number` | 协方差 |
| `correlation` | `x: number[], y: number[]` | `number` | 相关系数 |

### 向量运算

| 方法 | 参数 | 返回值 | 描述 |
|------|------|--------|------|
| `add` | `a: Vector, b: Vector` | `Vector` | 向量加法 |
| `subtract` | `a: Vector, b: Vector` | `Vector` | 向量减法 |
| `scalarMultiply` | `vec: Vector, scalar: number` | `Vector` | 数乘 |
| `dot` | `a: Vector, b: Vector` | `number` | 点积 |
| `cross` | `a: Vector, b: Vector` | `Vector` | 叉积 (3D) |
| `magnitude` | `vec: Vector` | `number` | 模长 |
| `normalize` | `vec: Vector` | `Vector` | 归一化 |
| `angle` | `a: Vector, b: Vector` | `number` | 夹角 (弧度) |
| `angleDegrees` | `a: Vector, b: Vector` | `number` | 夹角 (角度) |
| `project` | `a: Vector, b: Vector` | `Vector` | 投影 |
| `distance` | `a: Vector, b: Vector` | `number` | 距离 |

### 矩阵运算

| 方法 | 参数 | 返回值 | 描述 |
|------|------|--------|------|
| `zeros` | `rows: number, cols: number` | `Matrix` | 零矩阵 |
| `identity` | `size: number` | `Matrix` | 单位矩阵 |
| `add` | `a: Matrix, b: Matrix` | `Matrix` | 矩阵加法 |
| `subtract` | `a: Matrix, b: Matrix` | `Matrix` | 矩阵减法 |
| `scalarMultiply` | `mat: Matrix, scalar: number` | `Matrix` | 数乘 |
| `multiply` | `a: Matrix, b: Matrix` | `Matrix` | 矩阵乘法 |
| `transpose` | `mat: Matrix` | `Matrix` | 转置 |
| `trace` | `mat: Matrix` | `number` | 迹 |
| `determinant` | `mat: Matrix` | `number` | 行列式 |
| `inverse` | `mat: Matrix` | `Matrix` | 逆矩阵 |
| `multiplyVector` | `mat: Matrix, vec: Vector` | `Vector` | 矩阵×向量 |
| `rotation2D` | `angleDegrees: number` | `Matrix` | 2D 旋转矩阵 |
| `scale2D` | `sx: number, sy: number` | `Matrix` | 2D 缩放矩阵 |

---

## ⚠️ 注意事项

1. **错误处理**: 所有方法在遇到无效输入时会抛出异常
2. **数值精度**: 浮点数运算可能存在精度误差
3. **性能**: 大矩阵运算 (如行列式) 使用递归算法，超大矩阵建议使用专业数值计算库
4. **维度检查**: 向量和矩阵运算会自动检查维度兼容性

---

## 📝 版本信息

- **版本**: 1.0.0
- **创建时间**: 2026-03-13
- **最后更新**: 2026-03-13
- **TypeScript**: ✅ 类型安全
- **测试**: 通过 TypeScript 编译检查

---

## 🎯 使用场景

- 🎮 游戏开发 (物理引擎、图形变换)
- 📊 数据分析 (统计计算、相关性分析)
- 💰 财务应用 (货币格式化、百分比计算)
- 🔬 科学计算 (向量矩阵运算)
- 📱 前端开发 (数字格式化、随机数生成)
