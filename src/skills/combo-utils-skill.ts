/**
 * 组合数学工具集 - Combo Utils
 * 
 * 功能:
 * 1. 排列/组合计算
 * 2. 笛卡尔积
 * 3. 子集生成
 * 
 * @author Axon
 * @created 2026-03-13
 */

// ==================== 基础数学函数 ====================

/**
 * 计算阶乘
 * @param n 非负整数
 * @returns n!
 */
export function factorial(n: number): number {
  if (n < 0) throw new Error('阶乘不支持负数');
  if (n === 0 || n === 1) return 1;
  let result = 1;
  for (let i = 2; i <= n; i++) {
    result *= i;
  }
  return result;
}

// ==================== 排列计算 ====================

/**
 * 计算排列数 P(n, k) = n! / (n-k)!
 * 从 n 个不同元素中取出 k 个进行排列
 * 
 * @param n 总元素数
 * @param k 选取元素数
 * @returns 排列数
 */
export function permutation(n: number, k: number): number {
  if (n < 0 || k < 0) throw new Error('参数必须为非负整数');
  if (k > n) return 0;
  
  let result = 1;
  for (let i = 0; i < k; i++) {
    result *= (n - i);
  }
  return result;
}

/**
 * 生成所有排列
 * 从数组中取出 k 个元素的所有排列
 * 
 * @param items 元素数组
 * @param k 选取元素数 (不传则默认为数组长度)
 * @returns 所有排列结果
 */
export function generatePermutations<T>(items: T[], k?: number): T[][] {
  const n = items.length;
  const selectK = k ?? n;
  
  if (selectK > n) return [];
  if (selectK === 0) return [[]];
  
  const results: T[][] = [];
  
  function backtrack(start: number, path: T[]) {
    if (path.length === selectK) {
      results.push([...path]);
      return;
    }
    
    for (let i = start; i < n; i++) {
      path.push(items[i]);
      backtrack(i + 1, path);
      path.pop();
    }
  }
  
  backtrack(0, []);
  
  // 对每个组合生成全排列
  const finalResults: T[][] = [];
  for (const combo of results) {
    finalResults.push(...(fullPermute(combo) as T[][]));
  }
  
  return finalResults;
}

/**
 * 全排列 (数组所有元素的排列)
 * @param items 元素数组
 * @returns 所有全排列
 */
export function fullPermute<T>(items: T[]): T[][] {
  if (items.length === 0) return [[]];
  if (items.length === 1) return [items];
  
  const results: T[][] = [];
  
  for (let i = 0; i < items.length; i++) {
    const current = items[i];
    const remaining = items.slice(0, i).concat(items.slice(i + 1));
    const perms = fullPermute(remaining);
    
    for (const perm of perms) {
      results.push([current, ...perm]);
    }
  }
  
  return results;
}

// ==================== 组合计算 ====================

/**
 * 计算组合数 C(n, k) = n! / (k! * (n-k)!)
 * 从 n 个不同元素中取出 k 个进行组合 (不考虑顺序)
 * 
 * @param n 总元素数
 * @param k 选取元素数
 * @returns 组合数
 */
export function combination(n: number, k: number): number {
  if (n < 0 || k < 0) throw new Error('参数必须为非负整数');
  if (k > n) return 0;
  if (k === 0 || k === n) return 1;
  if (k > n - k) k = n - k; // 利用对称性优化
  
  let result = 1;
  for (let i = 0; i < k; i++) {
    result = result * (n - i) / (i + 1);
  }
  return Math.floor(result);
}

/**
 * 生成所有组合
 * 从数组中取出 k 个元素的所有组合
 * 
 * @param items 元素数组
 * @param k 选取元素数 (不传则生成所有大小的组合)
 * @returns 所有组合结果
 */
export function generateCombinations<T>(items: T[], k?: number): T[][] {
  const n = items.length;
  
  if (k !== undefined) {
    if (k > n) return [];
    if (k === 0) return [[]];
    
    const results: T[][] = [];
    
    const backtrack = (start: number, path: T[]) => {
      if (path.length === k) {
        results.push([...path]);
        return;
      }
      
      for (let i = start; i < n; i++) {
        path.push(items[i]);
        backtrack(i + 1, path);
        path.pop();
      }
    };
    
    backtrack(0, []);
    return results;
  } else {
    // 生成所有大小的组合
    const allResults: T[][] = [[]];
    for (let size = 1; size <= n; size++) {
      allResults.push(...generateCombinations(items, size));
    }
    return allResults;
  }
}

// ==================== 笛卡尔积 ====================

/**
 * 计算两个集合的笛卡尔积
 * A × B = {(a, b) | a ∈ A, b ∈ B}
 * 
 * @param setA 第一个集合
 * @param setB 第二个集合
 * @returns 笛卡尔积结果
 */
export function cartesianProduct2<T, U>(setA: T[], setB: U[]): [T, U][] {
  const results: [T, U][] = [];
  
  for (const a of setA) {
    for (const b of setB) {
      results.push([a, b]);
    }
  }
  
  return results;
}

/**
 * 计算多个集合的笛卡尔积
 * A × B × C × ...
 * 
 * @param sets 多个集合的数组
 * @returns 笛卡尔积结果 (每个结果是一个数组)
 */
export function cartesianProduct<T>(...sets: T[][]): T[][] {
  if (sets.length === 0) return [[]];
  if (sets.some(s => s.length === 0)) return [];
  
  let results: T[][] = [[]];
  
  for (const set of sets) {
    const newResults: T[][] = [];
    
    for (const result of results) {
      for (const item of set) {
        newResults.push([...result, item]);
      }
    }
    
    results = newResults;
  }
  
  return results;
}

/**
 * 计算多个集合的笛卡尔积 (带自定义组合函数)
 * 
 * @param combine 组合函数，将多个元素组合成一个结果
 * @param sets 多个集合的数组
 * @returns 笛卡尔积结果
 */
export function cartesianProductWith<T, R>(
  combine: (items: T[]) => R,
  ...sets: T[][]
): R[] {
  const products = cartesianProduct(...sets);
  return products.map(combine);
}

// ==================== 子集生成 ====================

/**
 * 生成幂集 (所有子集)
 * 包含空集和原集合本身
 * 
 * @param items 元素数组
 * @returns 所有子集
 */
export function powerSet<T>(items: T[]): T[][] {
  const n = items.length;
  const total = 1 << n; // 2^n
  const results: T[][] = [];
  
  for (let mask = 0; mask < total; mask++) {
    const subset: T[] = [];
    
    for (let i = 0; i < n; i++) {
      if (mask & (1 << i)) {
        subset.push(items[i]);
      }
    }
    
    results.push(subset);
  }
  
  return results;
}

/**
 * 生成所有非空子集
 * 
 * @param items 元素数组
 * @returns 所有非空子集
 */
export function nonEmptySubsets<T>(items: T[]): T[][] {
  return powerSet(items).filter(subset => subset.length > 0);
}

/**
 * 生成指定大小的所有子集
 * 
 * @param items 元素数组
 * @param size 子集大小
 * @returns 指定大小的所有子集
 */
export function subsetsOfSize<T>(items: T[], size: number): T[][] {
  return generateCombinations(items, size);
}

// ==================== 工具函数 ====================

/**
 * 计算二项式系数 (与 combination 相同)
 * @param n 总数
 * @param k 选取数
 * @returns 二项式系数
 */
export function binomialCoefficient(n: number, k: number): number {
  return combination(n, k);
}

/**
 * 计算可重复排列数 (n^k)
 * 从 n 个元素中可重复地选取 k 个进行排列
 * 
 * @param n 总元素数
 * @param k 选取元素数
 * @returns 可重复排列数
 */
export function permutationWithRepetition(n: number, k: number): number {
  if (n < 0 || k < 0) throw new Error('参数必须为非负整数');
  if (n === 0) return 0;
  return Math.pow(n, k);
}

/**
 * 计算可重复组合数 C(n+k-1, k)
 * 从 n 个元素中可重复地选取 k 个进行组合
 * 
 * @param n 总元素数
 * @param k 选取元素数
 * @returns 可重复组合数
 */
export function combinationWithRepetition(n: number, k: number): number {
  if (n < 0 || k < 0) throw new Error('参数必须为非负整数');
  if (n === 0) return k === 0 ? 1 : 0;
  return combination(n + k - 1, k);
}

// ==================== 使用示例 ====================

/**
 * 使用示例代码
 * 取消注释即可运行测试
 */
/*
import {
  factorial,
  permutation,
  combination,
  generatePermutations,
  generateCombinations,
  cartesianProduct,
  powerSet,
  fullPermute
} from './combo-utils-skill';

// 1. 阶乘计算
console.log('5! =', factorial(5)); // 120

// 2. 排列数 P(5, 3)
console.log('P(5, 3) =', permutation(5, 3)); // 60

// 3. 组合数 C(5, 3)
console.log('C(5, 3) =', combination(5, 3)); // 10

// 4. 生成所有排列
const perms = generatePermutations([1, 2, 3], 2);
console.log('从 [1,2,3] 中选 2 个的排列:', perms);
// [[1,2], [1,3], [2,1], [2,3], [3,1], [3,2]]

// 5. 生成全排列
const fullPerms = fullPermute(['A', 'B', 'C']);
console.log('ABC 的全排列:', fullPerms);
// [['A','B','C'], ['A','C','B'], ['B','A','C'], ...]

// 6. 生成所有组合
const combos = generateCombinations([1, 2, 3, 4], 2);
console.log('从 [1,2,3,4] 中选 2 个的组合:', combos);
// [[1,2], [1,3], [1,4], [2,3], [2,4], [3,4]]

// 7. 笛卡尔积
const product = cartesianProduct([1, 2], ['a', 'b'], ['X', 'Y']);
console.log('笛卡尔积:', product);
// [[1,'a','X'], [1,'a','Y'], [1,'b','X'], ...]

// 8. 幂集 (所有子集)
const subsets = powerSet([1, 2, 3]);
console.log('幂集:', subsets);
// [[], [1], [2], [3], [1,2], [1,3], [2,3], [1,2,3]]

// 9. 可重复排列
console.log('可重复排列 P(3, 2) =', permutationWithRepetition(3, 2)); // 9

// 10. 可重复组合
console.log('可重复组合 C(3+2-1, 2) =', combinationWithRepetition(3, 2)); // 6
*/

// ==================== 导出 ====================

export default {
  factorial,
  permutation,
  combination,
  generatePermutations,
  generateCombinations,
  fullPermute,
  cartesianProduct,
  cartesianProduct2,
  cartesianProductWith,
  powerSet,
  nonEmptySubsets,
  subsetsOfSize,
  binomialCoefficient,
  permutationWithRepetition,
  combinationWithRepetition,
};
