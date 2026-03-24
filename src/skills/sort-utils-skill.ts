/**
 * Sort Utils Skill - NOVA 排序算法工具
 * 
 * 功能:
 * 1. 快速排序/归并排序
 * 2. 堆排序
 * 3. 自定义比较器
 * 
 * @author NOVA
 * @version 1.0.0
 */

export type CompareFunction<T> = (a: T, b: T) => number;
export type SortAlgorithm = 'quick' | 'merge' | 'heap';

export interface SortOptions<T> {
  algorithm?: SortAlgorithm;
  comparator?: CompareFunction<T>;
  descending?: boolean;
}

/**
 * 默认比较器 (升序)
 */
function defaultComparator<T>(a: T, b: T): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

/**
 * 创建降序比较器
 */
function createDescendingComparator<T>(comparator: CompareFunction<T>): CompareFunction<T> {
  return (a: T, b: T) => -comparator(a, b);
}

/**
 * 快速排序实现
 * Time: O(n log n) average, O(n²) worst
 * Space: O(log n)
 */
function quickSort<T>(arr: T[], comparator: CompareFunction<T>): T[] {
  if (arr.length <= 1) return arr;
  
  const pivot = arr[Math.floor(arr.length / 2)];
  const left: T[] = [];
  const middle: T[] = [];
  const right: T[] = [];
  
  for (const item of arr) {
    const cmp = comparator(item, pivot);
    if (cmp < 0) left.push(item);
    else if (cmp > 0) right.push(item);
    else middle.push(item);
  }
  
  return [...quickSort(left, comparator), ...middle, ...quickSort(right, comparator)];
}

/**
 * 归并排序实现
 * Time: O(n log n)
 * Space: O(n)
 */
function mergeSort<T>(arr: T[], comparator: CompareFunction<T>): T[] {
  if (arr.length <= 1) return arr;
  
  const mid = Math.floor(arr.length / 2);
  const left = mergeSort(arr.slice(0, mid), comparator);
  const right = mergeSort(arr.slice(mid), comparator);
  
  return merge(left, right, comparator);
}

function merge<T>(left: T[], right: T[], comparator: CompareFunction<T>): T[] {
  const result: T[] = [];
  let i = 0, j = 0;
  
  while (i < left.length && j < right.length) {
    if (comparator(left[i], right[j]) <= 0) {
      result.push(left[i++]);
    } else {
      result.push(right[j++]);
    }
  }
  
  return [...result, ...left.slice(i), ...right.slice(j)];
}

/**
 * 堆排序实现
 * Time: O(n log n)
 * Space: O(1)
 */
function heapSort<T>(arr: T[], comparator: CompareFunction<T>): T[] {
  const result = [...arr];
  const n = result.length;
  
  // Build max heap
  for (let i = Math.floor(n / 2) - 1; i >= 0; i--) {
    heapify(result, n, i, comparator);
  }
  
  // Extract elements from heap
  for (let i = n - 1; i > 0; i--) {
    [result[0], result[i]] = [result[i], result[0]];
    heapify(result, i, 0, comparator);
  }
  
  return result;
}

function heapify<T>(arr: T[], n: number, i: number, comparator: CompareFunction<T>): void {
  let largest = i;
  const left = 2 * i + 1;
  const right = 2 * i + 2;
  
  if (left < n && comparator(arr[left], arr[largest]) > 0) {
    largest = left;
  }
  
  if (right < n && comparator(arr[right], arr[largest]) > 0) {
    largest = right;
  }
  
  if (largest !== i) {
    [arr[i], arr[largest]] = [arr[largest], arr[i]];
    heapify(arr, n, largest, comparator);
  }
}

/**
 * 主排序函数
 * 
 * @param arr - 待排序数组
 * @param options - 排序选项
 * @returns 排序后的新数组
 * 
 * @example
 * // 基本用法 (升序)
 * sort([3, 1, 4, 1, 5, 9, 2, 6])
 * 
 * @example
 * // 降序
 * sort([3, 1, 4, 1, 5], { descending: true })
 * 
 * @example
 * // 自定义比较器 (按字符串长度)
 * sort(['apple', 'pi', 'banana'], { 
 *   comparator: (a, b) => a.length - b.length 
 * })
 * 
 * @example
 * // 使用特定算法
 * sort([3, 1, 4], { algorithm: 'heap' })
 */
export function sort<T>(arr: T[], options: SortOptions<T> = {}): T[] {
  const {
    algorithm = 'quick',
    comparator = defaultComparator,
    descending = false,
  } = options;
  
  const finalComparator = descending 
    ? createDescendingComparator(comparator) 
    : comparator;
  
  switch (algorithm) {
    case 'quick':
      return quickSort([...arr], finalComparator);
    case 'merge':
      return mergeSort([...arr], finalComparator);
    case 'heap':
      return heapSort([...arr], finalComparator);
    default:
      throw new Error(`Unknown algorithm: ${algorithm}`);
  }
}

/**
 * 快速排序快捷方式
 */
export function quickSortBy<T>(arr: T[], comparator?: CompareFunction<T>): T[] {
  return sort(arr, { algorithm: 'quick', comparator });
}

/**
 * 归并排序快捷方式
 */
export function mergeSortBy<T>(arr: T[], comparator?: CompareFunction<T>): T[] {
  return sort(arr, { algorithm: 'merge', comparator });
}

/**
 * 堆排序快捷方式
 */
export function heapSortBy<T>(arr: T[], comparator?: CompareFunction<T>): T[] {
  return sort(arr, { algorithm: 'heap', comparator });
}

/**
 * 按对象属性排序
 * 
 * @example
 * const users = [
 *   { name: 'Alice', age: 30 },
 *   { name: 'Bob', age: 25 },
 *   { name: 'Charlie', age: 35 }
 * ];
 * 
 * // 按年龄升序
 * sortByKey(users, 'age')
 * 
 * // 按年龄降序
 * sortByKey(users, 'age', { descending: true })
 */
export function sortByKey<T extends Record<string, any>>(
  arr: T[],
  key: keyof T,
  options: Omit<SortOptions<T>, 'comparator'> = {}
): T[] {
  const comparator: CompareFunction<T> = (a, b) => {
    if (a[key] < b[key]) return -1;
    if (a[key] > b[key]) return 1;
    return 0;
  };
  
  return sort(arr, { ...options, comparator });
}

// ============================================================================
// 使用示例
// ============================================================================

/**
 * 运行所有示例
 */
export function runExamples(): void {
  console.log('=== NOVA 排序工具示例 ===\n');
  
  // 示例 1: 基本数字排序
  console.log('1. 基本数字排序:');
  const numbers = [64, 34, 25, 12, 22, 11, 90];
  console.log('   原始:', numbers);
  console.log('   升序:', sort(numbers));
  console.log('   降序:', sort(numbers, { descending: true }));
  console.log();
  
  // 示例 2: 不同算法对比
  console.log('2. 不同算法对比:');
  const data = [5, 2, 8, 1, 9, 3];
  console.log('   快速排序:', sort(data, { algorithm: 'quick' }));
  console.log('   归并排序:', sort(data, { algorithm: 'merge' }));
  console.log('   堆排序:', sort(data, { algorithm: 'heap' }));
  console.log();
  
  // 示例 3: 自定义比较器 (字符串长度)
  console.log('3. 自定义比较器 (字符串长度):');
  const words = ['apple', 'pi', 'banana', 'cat', 'elephant'];
  console.log('   原始:', words);
  console.log('   按长度:', sort(words, { 
     comparator: (a, b) => a.length - b.length 
  }));
  console.log();
  
  // 示例 4: 对象数组排序
  console.log('4. 对象数组排序:');
  const users = [
    { name: 'Alice', age: 30, score: 85 },
    { name: 'Bob', age: 25, score: 92 },
    { name: 'Charlie', age: 35, score: 78 },
  ];
  console.log('   按年龄:', sortByKey(users, 'age'));
  console.log('   按分数降序:', sortByKey(users, 'score', { descending: true }));
  console.log();
  
  // 示例 5: 快捷方式
  console.log('5. 快捷方式:');
  const nums = [9, 3, 7, 1, 5];
  console.log('   quickSortBy:', quickSortBy(nums));
  console.log('   mergeSortBy:', mergeSortBy(nums));
  console.log('   heapSortBy:', heapSortBy(nums));
  console.log();
  
  console.log('=== 示例完成 ===');
}

// 导出默认对象
export default {
  sort,
  quickSortBy,
  mergeSortBy,
  heapSortBy,
  sortByKey,
  runExamples,
};
