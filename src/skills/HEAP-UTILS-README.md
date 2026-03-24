# 堆数据结构工具技能 (Heap Utils)

**文件位置:** `src/skills/heap-utils-skill.ts`

---

## 📦 功能概览

1. **最小堆/最大堆** - 完整的堆数据结构实现
2. **优先队列** - 基于堆的优先级队列
3. **TopK 问题** - 高效的 TopK 元素查找

---

## 🚀 快速开始

### 导入模块

```typescript
import {
  Heap,
  MinHeap,
  MaxHeap,
  PriorityQueue,
  TopK,
  createMinHeap,
  createMaxHeap,
  createPriorityQueue,
  topKLargest,
  topKSmallest,
  heapSort
} from './skills/heap-utils-skill';
```

---

## 📚 API 文档

### 1. 堆类 (Heap)

#### 基础用法

```typescript
// 创建最小堆
const minHeap = new Heap<number>('min');
minHeap.push(5);
minHeap.push(2);
minHeap.push(8);
minHeap.push(1);

console.log(minHeap.peek());  // 1 (最小值)
console.log(minHeap.pop());   // 1
console.log(minHeap.pop());   // 2

// 创建最大堆
const maxHeap = new Heap<number>('max');
maxHeap.push(5);
maxHeap.push(2);
maxHeap.push(8);
maxHeap.push(1);

console.log(maxHeap.peek());  // 8 (最大值)
console.log(maxHeap.pop());   // 8
console.log(maxHeap.pop());   // 5
```

#### 便捷类

```typescript
// 最小堆
const minHeap = new MinHeap<number>([5, 2, 8, 1, 9]);
console.log(minHeap.peek());  // 1

// 最大堆
const maxHeap = new MaxHeap<number>([5, 2, 8, 1, 9]);
console.log(maxHeap.peek());  // 9
```

#### 带优先级的对象

```typescript
interface Task {
  name: string;
  priority: number;
}

const tasks: Task[] = [
  { name: 'Task A', priority: 3 },
  { name: 'Task B', priority: 1 },
  { name: 'Task C', priority: 5 },
];

const taskHeap = new MinHeap<Task>(tasks);
console.log(taskHeap.pop());  // { name: 'Task B', priority: 1 }
```

#### 自定义比较器

```typescript
// 按字符串长度创建最小堆
const strHeap = new Heap<string>(
  'min',
  (a, b) => a.length - b.length
);

strHeap.push('hello');
strHeap.push('hi');
strHeap.push('world');
strHeap.push('a');

console.log(strHeap.pop());  // 'a' (最短)
console.log(strHeap.pop());  // 'hi'
```

#### 常用方法

```typescript
const heap = new MinHeap<number>([5, 2, 8]);

heap.size();        // 3
heap.isEmpty();     // false
heap.peek();        // 2 (查看堆顶)
heap.push(1);       // 插入
heap.pop();         // 1 (弹出堆顶)
heap.replace(10);   // 替换堆顶为 10
heap.pushMany([3, 4, 5]);  // 批量插入
heap.toArray();     // [2, 3, 5, 8, 10] (副本)
heap.clear();       // 清空
```

---

### 2. 优先队列 (PriorityQueue)

```typescript
// 创建优先队列 (默认最小队列)
const pq = new PriorityQueue<string>();

// 入队 (值，优先级)
pq.enqueue('低优先级任务', 10);
pq.enqueue('高优先级任务', 1);
pq.enqueue('中优先级任务', 5);

// 出队 (优先级高的先出)
console.log(pq.dequeue());  // { value: '高优先级任务', priority: 1 }
console.log(pq.dequeue());  // { value: '中优先级任务', priority: 5 }
console.log(pq.dequeue());  // { value: '低优先级任务', priority: 10 }

// 最大队列 (优先级大的先出)
const maxPQ = new PriorityQueue<string>(false);
maxPQ.enqueue('任务 A', 10);
maxPQ.enqueue('任务 B', 20);
maxPQ.enqueue('任务 C', 15);

console.log(maxPQ.dequeue());  // { value: '任务 B', priority: 20 }
```

---

### 3. TopK 问题

#### 最大的 K 个数

```typescript
const arr = [3, 1, 5, 7, 2, 9, 4, 8, 6];

// 找最大的 3 个数
const largest3 = TopK.largestK(arr, 3);
console.log(largest3);  // [9, 8, 7] (降序)

// 便捷函数
const result = topKLargest(arr, 3);
console.log(result);  // [9, 8, 7]
```

#### 最小的 K 个数

```typescript
const arr = [3, 1, 5, 7, 2, 9, 4, 8, 6];

// 找最小的 3 个数
const smallest3 = TopK.smallestK(arr, 3);
console.log(smallest3);  // [1, 2, 3] (升序)

// 便捷函数
const result = topKSmallest(arr, 3);
console.log(result);  // [1, 2, 3]
```

#### 带自定义比较器

```typescript
interface Product {
  name: string;
  price: number;
}

const products: Product[] = [
  { name: 'A', price: 100 },
  { name: 'B', price: 50 },
  { name: 'C', price: 200 },
  { name: 'D', price: 150 },
];

// 找最贵的 2 个产品
const expensive = TopK.largestKWithComparator(
  products,
  2,
  (a, b) => a.price - b.price
);
console.log(expensive);  // [{ name: 'C', price: 200 }, { name: 'D', price: 150 }]

// 找最便宜的 2 个产品
const cheap = TopK.smallestKWithComparator(
  products,
  2,
  (a, b) => a.price - b.price
);
console.log(cheap);  // [{ name: 'B', price: 50 }, { name: 'A', price: 100 }]
```

#### 按优先级查找 TopK

```typescript
const items = [
  { value: '任务 A', priority: 10 },
  { value: '任务 B', priority: 5 },
  { value: '任务 C', priority: 20 },
  { value: '任务 D', priority: 15 },
];

// 优先级最高的 2 个
const top2 = TopK.topKByPriority(items, 2, false);
console.log(top2);
// [
//   { value: '任务 C', priority: 20 },
//   { value: '任务 D', priority: 15 }
// ]
```

---

### 4. 堆排序

```typescript
const arr = [5, 2, 8, 1, 9, 3];

// 升序排序
const sorted = heapSort(arr);
console.log(sorted);  // [1, 2, 3, 5, 8, 9]

// 降序排序
const sortedDesc = heapSortDesc(arr);
console.log(sortedDesc);  // [9, 8, 5, 3, 2, 1]
```

---

## 💡 实际应用场景

### 场景 1: 任务调度系统

```typescript
class TaskScheduler {
  private queue: PriorityQueue<Task>;
  
  constructor() {
    this.queue = new PriorityQueue<Task>(true); // 优先级小的先执行
  }
  
  addTask(name: string, priority: number): void {
    this.queue.enqueue({ name, priority, createdAt: Date.now() }, priority);
  }
  
  getNextTask(): Task | undefined {
    return this.queue.dequeue()?.value;
  }
  
  getPendingCount(): number {
    return this.queue.size();
  }
}

// 使用
const scheduler = new TaskScheduler();
scheduler.addTask('修复 Bug', 1);      // 最高优先级
scheduler.addTask('写文档', 5);
scheduler.addTask('代码重构', 3);

console.log(scheduler.getNextTask());  // 修复 Bug
```

### 场景 2: 实时数据流 TopK

```typescript
class StreamTopK {
  private k: number;
  private minHeap: MinHeap<number>;
  
  constructor(k: number) {
    this.k = k;
    this.minHeap = new MinHeap<number>();
  }
  
  add(value: number): void {
    if (this.minHeap.size() < this.k) {
      this.minHeap.push(value);
    } else if (value > this.minHeap.peek()!) {
      this.minHeap.replace(value);
    }
  }
  
  getTopK(): number[] {
    return this.minHeap.toArray().sort((a, b) => b - a);
  }
}

// 使用：实时追踪最大的 10 个数
const tracker = new StreamTopK(10);
[1, 5, 3, 9, 2, 8, 7, 4, 6, 10, 15, 20].forEach(n => tracker.add(n));
console.log(tracker.getTopK());  // [20, 15, 10, 9, 8, 7, 6, 5, 4, 3]
```

### 场景 3: 合并 K 个有序数组

```typescript
function mergeKSortedArrays(arrays: number[][]): number[] {
  const result: number[] = [];
  const minHeap = new MinHeap<{ value: number; arrayIndex: number; elementIndex: number }>(
    'min',
    (a, b) => a.value - b.value
  );
  
  // 初始化：将每个数组的第一个元素加入堆
  arrays.forEach((arr, arrayIndex) => {
    if (arr.length > 0) {
      minHeap.push({ value: arr[0], arrayIndex, elementIndex: 0 });
    }
  });
  
  // 合并
  while (!minHeap.isEmpty()) {
    const { value, arrayIndex, elementIndex } = minHeap.pop()!;
    result.push(value);
    
    // 将同一数组的下一个元素加入堆
    const nextIndex = elementIndex + 1;
    if (nextIndex < arrays[arrayIndex].length) {
      minHeap.push({
        value: arrays[arrayIndex][nextIndex],
        arrayIndex,
        elementIndex: nextIndex
      });
    }
  }
  
  return result;
}

// 使用
const arrays = [
  [1, 4, 7],
  [2, 5, 8],
  [3, 6, 9]
];
console.log(mergeKSortedArrays(arrays));  // [1, 2, 3, 4, 5, 6, 7, 8, 9]
```

### 场景 4: 前 K 个高频元素

```typescript
function topKFrequent(nums: number[], k: number): number[] {
  // 统计频率
  const freqMap = new Map<number, number>();
  for (const num of nums) {
    freqMap.set(num, (freqMap.get(num) || 0) + 1);
  }
  
  // 使用最小堆维护 K 个最高频元素
  const minHeap = new MinHeap<[number, number]>(
    'min',
    (a, b) => a[1] - b[1]
  );
  
  for (const [num, freq] of freqMap.entries()) {
    if (minHeap.size() < k) {
      minHeap.push([num, freq]);
    } else if (freq > minHeap.peek()![1]) {
      minHeap.replace([num, freq]);
    }
  }
  
  // 提取结果
  const result: number[] = [];
  while (!minHeap.isEmpty()) {
    result.push(minHeap.pop()![0]);
  }
  
  return result;
}

// 使用
console.log(topKFrequent([1, 1, 1, 2, 2, 3], 2));  // [1, 2]
```

---

## ⚡ 性能特点

| 操作 | 时间复杂度 | 空间复杂度 |
|------|-----------|-----------|
| 插入 (push) | O(log n) | O(1) |
| 删除 (pop) | O(log n) | O(1) |
| 查看 (peek) | O(1) | O(1) |
| 建堆 (heapify) | O(n) | O(1) |
| TopK | O(n log k) | O(k) |
| 堆排序 | O(n log n) | O(1) |

---

## 🧪 测试示例

```typescript
// 测试最小堆
const minHeap = new MinHeap<number>();
minHeap.pushMany([5, 3, 7, 1, 9, 2]);

const sorted: number[] = [];
while (!minHeap.isEmpty()) {
  sorted.push(minHeap.pop()!);
}
console.assert(JSON.stringify(sorted) === JSON.stringify([1, 2, 3, 5, 7, 9]));

// 测试最大堆
const maxHeap = new MaxHeap<number>([5, 3, 7, 1, 9, 2]);
console.assert(maxHeap.peek() === 9);

// 测试 TopK
const arr = [10, 20, 30, 40, 50];
console.assert(JSON.stringify(TopK.largestK(arr, 3)) === JSON.stringify([50, 40, 30]));
console.assert(JSON.stringify(TopK.smallestK(arr, 3)) === JSON.stringify([10, 20, 30]));

console.log('✅ 所有测试通过!');
```

---

## 📝 注意事项

1. **堆类型选择**: 
   - 最小堆适用于 TopK 最大元素问题
   - 最大堆适用于 TopK 最小元素问题

2. **对象比较**: 处理对象时必须提供 `priority` 属性或自定义比较器

3. **空堆处理**: `pop()` 和 `peek()` 在空堆时返回 `undefined`

4. **性能优化**: 批量插入使用 `pushMany()` 比多次 `push()` 更高效

---

**创建时间:** 2026-03-13  
**作者:** KAEL (Subagent)
