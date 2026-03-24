/**
 * 堆数据结构工具技能
 * 
 * 功能:
 * 1. 最小堆/最大堆实现
 * 2. 优先队列
 * 3. TopK 问题解决方案
 * 
 * @module skills/heap-utils
 */

// ==================== 类型定义 ====================

/**
 * 比较函数类型
 */
export type Comparator<T> = (a: T, b: T) => number;

/**
 * 堆类型
 */
export type HeapType = 'min' | 'max';

/**
 * 堆节点
 */
export interface HeapNode<T> {
  value: T;
  priority?: number;
}

/**
 * 最小堆比较器
 */
function minComparator<T extends number | { priority: number }>(a: T, b: T): number {
  const aVal = typeof a === 'number' ? a : (a as any).priority;
  const bVal = typeof b === 'number' ? b : (b as any).priority;
  return aVal - bVal;
}

/**
 * 最大堆比较器
 */
function maxComparator<T extends number | { priority: number }>(a: T, b: T): number {
  const aVal = typeof a === 'number' ? a : (a as any).priority;
  const bVal = typeof b === 'number' ? b : (b as any).priority;
  return bVal - aVal;
}

// ==================== 堆类实现 ====================

/**
 * 堆类 (支持最小堆和最大堆)
 */
export class Heap<T> {
  private heap: T[];
  private compare: Comparator<T>;

  /**
   * 创建堆
   * @param type - 堆类型，默认'min'
   * @param customComparator - 自定义比较器 (可选)
   * @param initialData - 初始数据 (可选)
   */
  constructor(
    type: HeapType = 'min',
    customComparator?: Comparator<T>,
    initialData?: T[]
  ) {
    this.heap = initialData ? [...initialData] : [];
    
    if (customComparator) {
      this.compare = customComparator;
    } else {
      // 如果没有自定义比较器，使用默认比较器 (需要类型断言)
      this.compare = (type === 'min' ? minComparator : maxComparator) as Comparator<T>;
    }
    
    if (initialData && initialData.length > 0) {
      this.heapify();
    }
  }

  /**
   * 获取堆大小
   */
  size(): number {
    return this.heap.length;
  }

  /**
   * 判断堆是否为空
   */
  isEmpty(): boolean {
    return this.heap.length === 0;
  }

  /**
   * 获取堆顶元素 (不删除)
   */
  peek(): T | undefined {
    return this.heap[0];
  }

  /**
   * 获取堆数组 (只读副本)
   */
  toArray(): T[] {
    return [...this.heap];
  }

  /**
   * 插入元素
   * @param value - 要插入的值
   */
  push(value: T): void {
    this.heap.push(value);
    this.siftUp(this.heap.length - 1);
  }

  /**
   * 弹出堆顶元素
   * @returns 堆顶元素，如果堆为空则返回 undefined
   */
  pop(): T | undefined {
    if (this.heap.length === 0) {
      return undefined;
    }
    
    if (this.heap.length === 1) {
      return this.heap.pop();
    }
    
    const top = this.heap[0];
    this.heap[0] = this.heap.pop()!;
    this.siftDown(0);
    
    return top;
  }

  /**
   * 替换堆顶元素并重新调整
   * @param value - 新值
   * @returns 原堆顶元素
   */
  replace(value: T): T | undefined {
    if (this.heap.length === 0) {
      this.push(value);
      return undefined;
    }
    
    const top = this.heap[0];
    this.heap[0] = value;
    this.siftDown(0);
    
    return top;
  }

  /**
   * 批量插入元素
   * @param values - 要插入的值数组
   */
  pushMany(values: T[]): void {
    for (const value of values) {
      this.push(value);
    }
  }

  /**
   * 清空堆
   */
  clear(): void {
    this.heap = [];
  }

  /**
   * 上滤操作
   * @param index - 起始索引
   */
  private siftUp(index: number): void {
    while (index > 0) {
      const parentIndex = Math.floor((index - 1) / 2);
      
      if (this.compare(this.heap[index], this.heap[parentIndex]) < 0) {
        [this.heap[index], this.heap[parentIndex]] = [this.heap[parentIndex], this.heap[index]];
        index = parentIndex;
      } else {
        break;
      }
    }
  }

  /**
   * 下滤操作
   * @param index - 起始索引
   */
  private siftDown(index: number): void {
    const length = this.heap.length;
    
    while (true) {
      let smallest = index;
      const leftChild = 2 * index + 1;
      const rightChild = 2 * index + 2;
      
      if (leftChild < length && this.compare(this.heap[leftChild], this.heap[smallest]) < 0) {
        smallest = leftChild;
      }
      
      if (rightChild < length && this.compare(this.heap[rightChild], this.heap[smallest]) < 0) {
        smallest = rightChild;
      }
      
      if (smallest !== index) {
        [this.heap[index], this.heap[smallest]] = [this.heap[smallest], this.heap[index]];
        index = smallest;
      } else {
        break;
      }
    }
  }

  /**
   * 堆化数组
   */
  private heapify(): void {
    for (let i = Math.floor(this.heap.length / 2) - 1; i >= 0; i--) {
      this.siftDown(i);
    }
  }
}

// ==================== 最小堆 ====================

/**
 * 最小堆 (便捷类)
 */
export class MinHeap<T extends number | { priority: number }> extends Heap<T> {
  constructor(initialData?: T[]) {
    super('min', undefined as any, initialData);
  }
}

// ==================== 最大堆 ====================

/**
 * 最大堆 (便捷类)
 */
export class MaxHeap<T extends number | { priority: number }> extends Heap<T> {
  constructor(initialData?: T[]) {
    super('max', undefined as any, initialData);
  }
}

// ==================== 优先队列 ====================

/**
 * 优先队列项
 */
export interface PriorityItem<T> {
  value: T;
  priority: number;
}

/**
 * 优先队列 (基于堆实现)
 */
export class PriorityQueue<T> {
  private heap: Heap<PriorityItem<T>>;

  /**
   * 创建优先队列
   * @param min - 是否为最小队列 (优先级小的先出队)，默认 true
   */
  constructor(min: boolean = true) {
    this.heap = new Heap<PriorityItem<T>>(min ? 'min' : 'max');
  }

  /**
   * 获取队列大小
   */
  size(): number {
    return this.heap.size();
  }

  /**
   * 判断队列是否为空
   */
  isEmpty(): boolean {
    return this.heap.isEmpty();
  }

  /**
   * 查看队首元素 (不删除)
   */
  peek(): PriorityItem<T> | undefined {
    return this.heap.peek();
  }

  /**
   * 入队
   * @param value - 值
   * @param priority - 优先级
   */
  enqueue(value: T, priority: number): void {
    this.heap.push({ value, priority });
  }

  /**
   * 出队
   * @returns 队首元素，如果队列为空则返回 undefined
   */
  dequeue(): PriorityItem<T> | undefined {
    return this.heap.pop();
  }

  /**
   * 清空队列
   */
  clear(): void {
    this.heap.clear();
  }

  /**
   * 获取所有元素 (按优先级排序)
   */
  toArray(): PriorityItem<T>[] {
    return this.heap.toArray();
  }
}

// ==================== TopK 问题解决方案 ====================

/**
 * TopK 问题工具类
 */
export class TopK {
  /**
   * 找出数组中最大的 K 个元素
   * @param arr - 输入数组
   * @param k - 需要找的元素个数
   * @returns 最大的 K 个元素 (降序)
   */
  static largestK(arr: number[], k: number): number[] {
    if (k <= 0 || arr.length === 0) {
      return [];
    }
    
    if (k >= arr.length) {
      return [...arr].sort((a, b) => b - a);
    }
    
    // 使用最小堆维护 K 个最大元素
    const minHeap = new MinHeap<number>();
    
    for (const num of arr) {
      if (minHeap.size() < k) {
        minHeap.push(num);
      } else if (num > minHeap.peek()!) {
        minHeap.replace(num);
      }
    }
    
    // 提取结果并排序
    const result: number[] = [];
    while (!minHeap.isEmpty()) {
      result.push(minHeap.pop()!);
    }
    
    return result.reverse(); // 降序
  }

  /**
   * 找出数组中最小的 K 个元素
   * @param arr - 输入数组
   * @param k - 需要找的元素个数
   * @returns 最小的 K 个元素 (升序)
   */
  static smallestK(arr: number[], k: number): number[] {
    if (k <= 0 || arr.length === 0) {
      return [];
    }
    
    if (k >= arr.length) {
      return [...arr].sort((a, b) => a - b);
    }
    
    // 使用最大堆维护 K 个最小元素
    const maxHeap = new MaxHeap<number>();
    
    for (const num of arr) {
      if (maxHeap.size() < k) {
        maxHeap.push(num);
      } else if (num < maxHeap.peek()!) {
        maxHeap.replace(num);
      }
    }
    
    // 提取结果并排序
    const result: number[] = [];
    while (!maxHeap.isEmpty()) {
      result.push(maxHeap.pop()!);
    }
    
    return result.reverse(); // 升序
  }

  /**
   * 找出数组中最大的 K 个元素 (带自定义比较器)
   * @param arr - 输入数组
   * @param k - 需要找的元素个数
   * @param comparator - 比较器
   * @returns 最大的 K 个元素
   */
  static largestKWithComparator<T>(
    arr: T[],
    k: number,
    comparator: Comparator<T>
  ): T[] {
    if (k <= 0 || arr.length === 0) {
      return [];
    }
    
    if (k >= arr.length) {
      return [...arr].sort(comparator);
    }
    
    // 使用最小堆 (基于比较器)
    const minHeap = new Heap<T>('min', comparator);
    
    for (const item of arr) {
      if (minHeap.size() < k) {
        minHeap.push(item);
      } else if (comparator(item, minHeap.peek()!) > 0) {
        minHeap.replace(item);
      }
    }
    
    // 提取结果
    const result: T[] = [];
    while (!minHeap.isEmpty()) {
      result.push(minHeap.pop()!);
    }
    
    return result.reverse();
  }

  /**
   * 找出数组中最小的 K 个元素 (带自定义比较器)
   * @param arr - 输入数组
   * @param k - 需要找的元素个数
   * @param comparator - 比较器
   * @returns 最小的 K 个元素
   */
  static smallestKWithComparator<T>(
    arr: T[],
    k: number,
    comparator: Comparator<T>
  ): T[] {
    if (k <= 0 || arr.length === 0) {
      return [];
    }
    
    if (k >= arr.length) {
      return [...arr].sort(comparator);
    }
    
    // 使用最大堆 (基于比较器)
    const maxHeap = new Heap<T>('max', comparator);
    
    for (const item of arr) {
      if (maxHeap.size() < k) {
        maxHeap.push(item);
      } else if (comparator(item, maxHeap.peek()!) < 0) {
        maxHeap.replace(item);
      }
    }
    
    // 提取结果
    const result: T[] = [];
    while (!maxHeap.isEmpty()) {
      result.push(maxHeap.pop()!);
    }
    
    return result.reverse();
  }

  /**
   * 找出优先级最高的 K 个元素
   * @param items - 带优先级的元素数组
   * @param k - 需要找的元素个数
   * @param min - 是否优先级小的优先 (默认 false，即优先级大的优先)
   * @returns 优先级最高的 K 个元素
   */
  static topKByPriority<T>(
    items: PriorityItem<T>[],
    k: number,
    min: boolean = false
  ): PriorityItem<T>[] {
    if (k <= 0 || items.length === 0) {
      return [];
    }
    
    const comparator: Comparator<PriorityItem<T>> = min
      ? (a, b) => a.priority - b.priority
      : (a, b) => b.priority - a.priority;
    
    return this.largestKWithComparator(items, k, comparator);
  }
}

// ==================== 便捷函数 ====================

/**
 * 创建最小堆
 * @param initialData - 初始数据
 */
export function createMinHeap<T extends number | { priority: number }>(initialData?: T[]): MinHeap<T> {
  return new MinHeap(initialData);
}

/**
 * 创建最大堆
 * @param initialData - 初始数据
 */
export function createMaxHeap<T extends number | { priority: number }>(initialData?: T[]): MaxHeap<T> {
  return new MaxHeap(initialData);
}

/**
 * 创建优先队列
 * @param min - 是否为最小队列，默认 true
 */
export function createPriorityQueue<T>(min: boolean = true): PriorityQueue<T> {
  return new PriorityQueue<T>(min);
}

/**
 * 找出最大的 K 个元素
 * @param arr - 输入数组
 * @param k - K 值
 */
export function topKLargest(arr: number[], k: number): number[] {
  return TopK.largestK(arr, k);
}

/**
 * 找出最小的 K 个元素
 * @param arr - 输入数组
 * @param k - K 值
 */
export function topKSmallest(arr: number[], k: number): number[] {
  return TopK.smallestK(arr, k);
}

/**
 * 堆排序 (升序)
 * @param arr - 要排序的数组
 * @returns 排序后的新数组
 */
export function heapSort(arr: number[]): number[] {
  const maxHeap = new MaxHeap<number>(arr);
  const result: number[] = [];
  
  while (!maxHeap.isEmpty()) {
    result.push(maxHeap.pop()!);
  }
  
  return result.reverse(); // 反转得到升序
}

/**
 * 堆排序 (降序)
 * @param arr - 要排序的数组
 * @returns 排序后的新数组
 */
export function heapSortDesc(arr: number[]): number[] {
  const minHeap = new MinHeap<number>(arr);
  const result: number[] = [];
  
  while (!minHeap.isEmpty()) {
    result.push(minHeap.pop()!);
  }
  
  return result.reverse(); // 反转得到降序
}
