/**
 * 堆工具技能使用示例
 * 
 * 运行方式: uv run tsx src/skills/heap-utils-examples.ts
 */

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
  heapSort,
  heapSortDesc,
} from './heap-utils-skill';

// ==================== 示例 1: 基础堆操作 ====================

console.log('\n=== 示例 1: 基础堆操作 ===\n');

// 最小堆
const minHeap = createMinHeap<number>();
minHeap.push(5);
minHeap.push(2);
minHeap.push(8);
minHeap.push(1);
minHeap.push(9);

console.log('最小堆内容:', minHeap.toArray());
console.log('堆顶元素:', minHeap.peek());
console.log('弹出堆顶:', minHeap.pop());
console.log('弹出后堆顶:', minHeap.peek());
console.log('当前大小:', minHeap.size());

// 最大堆
const maxHeap = createMaxHeap<number>();
maxHeap.pushMany([5, 2, 8, 1, 9]);

console.log('\n最大堆内容:', maxHeap.toArray());
console.log('堆顶元素:', maxHeap.peek());
console.log('弹出堆顶:', maxHeap.pop());
console.log('弹出后堆顶:', maxHeap.peek());

// ==================== 示例 2: 带优先级的对象 ====================

console.log('\n=== 示例 2: 带优先级的对象 ===\n');

interface Task {
  name: string;
  priority: number;
  completed: boolean;
}

const tasks: Task[] = [
  { name: '修复登录 Bug', priority: 1, completed: false },
  { name: '编写文档', priority: 5, completed: false },
  { name: '代码重构', priority: 3, completed: false },
  { name: '性能优化', priority: 2, completed: false },
  { name: '添加测试', priority: 4, completed: false },
];

const taskHeap = new MinHeap<Task>(tasks);

console.log('任务调度顺序:');
let order = 1;
while (!taskHeap.isEmpty()) {
  const task = taskHeap.pop()!;
  console.log(`${order}. [优先级:${task.priority}] ${task.name}`);
  order++;
}

// ==================== 示例 3: 自定义比较器 ====================

console.log('\n=== 示例 3: 自定义比较器 ===\n');

// 按字符串长度排序
const strHeap = new Heap<string>(
  'min',
  (a, b) => a.length - b.length
);

strHeap.pushMany(['hello', 'hi', 'world', 'a', 'typescript', 'openclaw']);

console.log('按长度排序的字符串:');
while (!strHeap.isEmpty()) {
  console.log(`  "${strHeap.pop()}"`);
}

// 按对象属性排序
interface Person {
  name: string;
  age: number;
  score: number;
}

const people: Person[] = [
  { name: 'Alice', age: 25, score: 85 },
  { name: 'Bob', age: 30, score: 92 },
  { name: 'Charlie', age: 28, score: 78 },
  { name: 'David', age: 35, score: 88 },
];

// 按年龄创建最小堆
const ageHeap = new Heap<Person>(
  'min',
  (a, b) => a.age - b.age,
  people
);

console.log('\n按年龄排序:');
while (!ageHeap.isEmpty()) {
  const person = ageHeap.pop()!;
  console.log(`  ${person.name} (${person.age}岁)`);
}

// 按分数创建最大堆
const scoreHeap = new Heap<Person>(
  'max',
  (a, b) => a.score - b.score,
  people
);

console.log('\n按分数排序 (从高到低):');
while (!scoreHeap.isEmpty()) {
  const person = scoreHeap.pop()!;
  console.log(`  ${person.name}: ${person.score}分`);
}

// ==================== 示例 4: 优先队列 ====================

console.log('\n=== 示例 4: 优先队列 ===\n');

// 最小优先队列 (优先级数字小的优先)
const minPQ = createPriorityQueue<string>();

minPQ.enqueue('紧急 Bug 修复', 1);
minPQ.enqueue('功能开发', 5);
minPQ.enqueue('代码审查', 3);
minPQ.enqueue('文档更新', 4);
minPQ.enqueue('性能优化', 2);

console.log('任务执行顺序 (优先级小的优先):');
while (!minPQ.isEmpty()) {
  const item = minPQ.dequeue()!;
  console.log(`  [优先级:${item.priority}] ${item.value}`);
}

// 最大优先队列 (优先级数字大的优先)
const maxPQ = createPriorityQueue<string>(false);

maxPQ.enqueue('低优先级', 10);
maxPQ.enqueue('高优先级', 100);
maxPQ.enqueue('中优先级', 50);

console.log('\n任务执行顺序 (优先级大的优先):');
while (!maxPQ.isEmpty()) {
  const item = maxPQ.dequeue()!;
  console.log(`  [优先级:${item.priority}] ${item.value}`);
}

// ==================== 示例 5: TopK 问题 ====================

console.log('\n=== 示例 5: TopK 问题 ===\n');

const scores = [85, 92, 78, 88, 95, 89, 91, 87, 93, 86];

console.log('所有分数:', scores);
console.log('前 3 名:', topKLargest(scores, 3));
console.log('后 3 名:', topKSmallest(scores, 3));

// 带对象的 TopK
interface Product {
  name: string;
  price: number;
  sales: number;
}

const products: Product[] = [
  { name: 'iPhone', price: 999, sales: 1000 },
  { name: 'MacBook', price: 1999, sales: 500 },
  { name: 'iPad', price: 799, sales: 800 },
  { name: 'Apple Watch', price: 399, sales: 1200 },
  { name: 'AirPods', price: 199, sales: 2000 },
];

// 最贵的 3 个产品
const expensive = TopK.largestKWithComparator(
  products,
  3,
  (a, b) => a.price - b.price
);

console.log('\n最贵的 3 个产品:');
expensive.forEach(p => console.log(`  ${p.name}: $${p.price}`));

// 销量最高的 3 个产品
const bestSellers = TopK.largestKWithComparator(
  products,
  3,
  (a, b) => a.sales - b.sales
);

console.log('\n销量最高的 3 个产品:');
bestSellers.forEach(p => console.log(`  ${p.name}: ${p.sales}件`));

// ==================== 示例 6: 堆排序 ====================

console.log('\n=== 示例 6: 堆排序 ===\n');

const unsorted = [64, 34, 25, 12, 22, 11, 90, 88, 45, 50];

console.log('原始数组:', unsorted);
console.log('升序排序:', heapSort([...unsorted]));
console.log('降序排序:', heapSortDesc([...unsorted]));

// ==================== 示例 7: 实际应用 - 合并 K 个有序数组 ====================

console.log('\n=== 示例 7: 合并 K 个有序数组 ===\n');

function mergeKSortedArrays(arrays: number[][]): number[] {
  const result: number[] = [];
  const minHeap = new Heap<{ value: number; arrayIndex: number; elementIndex: number }>(
    'min',
    (a, b) => a.value - b.value
  );

  // 初始化
  arrays.forEach((arr, arrayIndex) => {
    if (arr.length > 0) {
      minHeap.push({ value: arr[0], arrayIndex, elementIndex: 0 });
    }
  });

  // 合并
  while (!minHeap.isEmpty()) {
    const { value, arrayIndex, elementIndex } = minHeap.pop()!;
    result.push(value);

    const nextIndex = elementIndex + 1;
    if (nextIndex < arrays[arrayIndex].length) {
      minHeap.push({
        value: arrays[arrayIndex][nextIndex],
        arrayIndex,
        elementIndex: nextIndex,
      });
    }
  }

  return result;
}

const sortedArrays = [
  [1, 4, 7, 10],
  [2, 5, 8, 11],
  [3, 6, 9, 12],
];

console.log('输入数组:');
sortedArrays.forEach((arr, i) => console.log(`  数组${i + 1}: [${arr.join(', ')}]`));
console.log('合并结果:', mergeKSortedArrays(sortedArrays));

// ==================== 示例 8: 实际应用 - 前 K 个高频元素 ====================

console.log('\n=== 示例 8: 前 K 个高频元素 ===\n');

function topKFrequent(nums: number[], k: number): number[] {
  const freqMap = new Map<number, number>();
  for (const num of nums) {
    freqMap.set(num, (freqMap.get(num) || 0) + 1);
  }

  const minHeap = new Heap<[number, number]>(
    'min',
    (a, b) => a[1] - b[1]
  );

  Array.from(freqMap.entries()).forEach(([num, freq]) => {
    if (minHeap.size() < k) {
      minHeap.push([num, freq]);
    } else if (freq > minHeap.peek()![1]) {
      minHeap.replace([num, freq]);
    }
  });

  const result: number[] = [];
  while (!minHeap.isEmpty()) {
    result.push(minHeap.pop()![0]);
  }

  return result;
}

const nums = [1, 1, 1, 2, 2, 2, 2, 3, 3, 4, 4, 4, 4, 4];
console.log('输入数组:', nums);
console.log('前 2 个高频元素:', topKFrequent(nums, 2));
console.log('前 3 个高频元素:', topKFrequent(nums, 3));

// ==================== 示例 9: 实时数据流 TopK ====================

console.log('\n=== 示例 9: 实时数据流 TopK ===\n');

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

const tracker = new StreamTopK(5);
const streamData = [1, 5, 3, 9, 2, 8, 7, 4, 6, 10, 15, 20, 12, 18];

console.log('数据流:', streamData);
streamData.forEach(n => tracker.add(n));
console.log('实时追踪的前 5 大值:', tracker.getTopK());

// ==================== 示例 10: 任务调度系统 ====================

console.log('\n=== 示例 10: 任务调度系统 ===\n');

interface ScheduledTask {
  id: number;
  name: string;
  priority: number;
  createdAt: number;
}

class TaskScheduler {
  private queue: PriorityQueue<ScheduledTask>;
  private taskIdCounter: number = 0;

  constructor() {
    this.queue = new PriorityQueue<ScheduledTask>(true);
  }

  addTask(name: string, priority: number): void {
    const task: ScheduledTask = {
      id: ++this.taskIdCounter,
      name,
      priority,
      createdAt: Date.now(),
    };
    this.queue.enqueue(task, priority);
    console.log(`✓ 添加任务: ${name} (优先级:${priority})`);
  }

  processNextTask(): void {
    const item = this.queue.dequeue();
    if (item) {
      console.log(`▶ 执行任务 #${item.value.id}: ${item.value.name} (优先级:${item.value.priority})`);
    } else {
      console.log('⊘ 队列为空，无任务可执行');
    }
  }

  getPendingCount(): number {
    return this.queue.size();
  }
}

const scheduler = new TaskScheduler();
scheduler.addTask('修复登录 Bug', 1);
scheduler.addTask('编写用户文档', 5);
scheduler.addTask('API 性能优化', 2);
scheduler.addTask('添加单元测试', 4);
scheduler.addTask('代码审查', 3);

console.log(`\n待处理任务数：${scheduler.getPendingCount()}`);
console.log('\n开始处理任务:');
while (scheduler.getPendingCount() > 0) {
  scheduler.processNextTask();
}

// ==================== 完成 ====================

console.log('\n=== 所有示例执行完成 ===\n');
console.log('✅ 堆工具技能演示成功!');
console.log('\n提示:');
console.log('  - 查看完整文档：src/skills/HEAP-UTILS-README.md');
console.log('  - 源代码位置：src/skills/heap-utils-skill.ts');
console.log('');
