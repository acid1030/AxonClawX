/**
 * NOVA 排序工具 - 使用示例
 * 
 * 运行: uv run tsx src/skills/sort-utils-examples.ts
 */

import { 
  sort, 
  quickSortBy, 
  mergeSortBy, 
  heapSortBy, 
  sortByKey,
  runExamples 
} from './sort-utils-skill';

// ============================================================================
// 示例 1: 基本用法
// ============================================================================

console.log('【示例 1】基本数字排序\n');

const numbers = [64, 34, 25, 12, 22, 11, 90, 88, 45];

console.log('原始数组:', numbers);
console.log('升序排序:', sort(numbers));
console.log('降序排序:', sort(numbers, { descending: true }));
console.log();

// ============================================================================
// 示例 2: 三种算法对比
// ============================================================================

console.log('【示例 2】三种排序算法对比\n');

const data = [5, 2, 8, 1, 9, 3, 7, 4, 6];

console.log('原始数据:', data);
console.log('快速排序:', sort(data, { algorithm: 'quick' }));
console.log('归并排序:', sort(data, { algorithm: 'merge' }));
console.log('堆排序:', sort(data, { algorithm: 'heap' }));
console.log();

// ============================================================================
// 示例 3: 自定义比较器
// ============================================================================

console.log('【示例 3】自定义比较器\n');

// 按字符串长度排序
const words = ['apple', 'pi', 'banana', 'cat', 'elephant', 'dog'];
console.log('单词列表:', words);
console.log('按长度升序:', sort(words, { 
  comparator: (a, b) => a.length - b.length 
}));
console.log('按长度降序:', sort(words, { 
  comparator: (a, b) => a.length - b.length,
  descending: true 
}));
console.log();

// 按数字各位之和排序
const nums = [23, 45, 12, 89, 34, 67];
const digitSum = (n: number) => String(n).split('').reduce((s, d) => s + Number(d), 0);
console.log('数字列表:', nums);
console.log('按各位和排序:', sort(nums, {
  comparator: (a, b) => digitSum(a) - digitSum(b)
}));
console.log();

// ============================================================================
// 示例 4: 对象数组排序
// ============================================================================

console.log('【示例 4】对象数组排序\n');

interface Product {
  id: number;
  name: string;
  price: number;
  rating: number;
}

const products: Product[] = [
  { id: 1, name: 'Laptop', price: 999, rating: 4.5 },
  { id: 2, name: 'Mouse', price: 29, rating: 4.2 },
  { id: 3, name: 'Keyboard', price: 79, rating: 4.8 },
  { id: 4, name: 'Monitor', price: 299, rating: 4.6 },
  { id: 5, name: 'Headphones', price: 149, rating: 4.3 },
];

console.log('产品列表:');
products.forEach(p => console.log(`  ${p.name}: ¥${p.price} (评分:${p.rating})`));

console.log('\n按价格升序:');
sortByKey(products, 'price').forEach(p => 
  console.log(`  ${p.name}: ¥${p.price}`)
);

console.log('\n按评分降序:');
sortByKey(products, 'rating', { descending: true }).forEach(p => 
  console.log(`  ${p.name}: 评分${p.rating}`)
);
console.log();

// ============================================================================
// 示例 5: 用户数据排序
// ============================================================================

console.log('【示例 5】用户数据排序\n');

interface User {
  name: string;
  age: number;
  joinDate: string;
  points: number;
}

const users: User[] = [
  { name: '张三', age: 28, joinDate: '2023-01-15', points: 1200 },
  { name: '李四', age: 35, joinDate: '2022-06-20', points: 2500 },
  { name: '王五', age: 22, joinDate: '2024-03-10', points: 800 },
  { name: '赵六', age: 31, joinDate: '2023-08-05', points: 1800 },
];

console.log('按年龄排序:');
sortByKey(users, 'age').forEach(u => 
  console.log(`  ${u.name} (${u.age}岁)`)
);

console.log('\n按积分排名:');
sortByKey(users, 'points', { descending: true }).forEach((u, i) => 
  console.log(`  ${i + 1}. ${u.name}: ${u.points}分`)
);
console.log();

// ============================================================================
// 示例 6: 快捷方式使用
// ============================================================================

console.log('【示例 6】快捷方式\n');

const testArray = [42, 17, 88, 3, 56, 29];

console.log('原始:', testArray);
console.log('quickSortBy:', quickSortBy(testArray));
console.log('mergeSortBy:', mergeSortBy(testArray));
console.log('heapSortBy:', heapSortBy(testArray));
console.log();

// ============================================================================
// 示例 7: 复杂自定义排序
// ============================================================================

console.log('【示例 7】复杂自定义排序 - 多条件排序\n');

interface Task {
  title: string;
  priority: 'high' | 'medium' | 'low';
  dueDate: string;
  completed: boolean;
}

const tasks: Task[] = [
  { title: '完成报告', priority: 'high', dueDate: '2024-03-15', completed: false },
  { title: '回复邮件', priority: 'low', dueDate: '2024-03-14', completed: true },
  { title: '代码审查', priority: 'high', dueDate: '2024-03-16', completed: false },
  { title: '团队会议', priority: 'medium', dueDate: '2024-03-14', completed: false },
  { title: '更新文档', priority: 'medium', dueDate: '2024-03-17', completed: true },
];

const priorityOrder = { high: 0, medium: 1, low: 2 };

console.log('任务列表 (按优先级 + 完成状态):');
sort(tasks, {
  comparator: (a, b) => {
    // 先按优先级
    const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (priorityDiff !== 0) return priorityDiff;
    
    // 再按完成状态 (未完成优先)
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    
    // 最后按截止日期
    return a.dueDate.localeCompare(b.dueDate);
  }
}).forEach((t, i) => 
  console.log(`  ${i + 1}. [${t.priority}] ${t.title} (${t.completed ? '✓' : '○'})`)
);
console.log();

// ============================================================================
// 示例 8: 性能测试 (可选)
// ============================================================================

console.log('【示例 8】性能对比 (10000 个随机数)\n');

const largeArray = Array.from({ length: 10000 }, () => Math.random());

const timeAlgorithm = (name: string, fn: () => void) => {
  const start = performance.now();
  fn();
  const end = performance.now();
  console.log(`  ${name}: ${(end - start).toFixed(2)}ms`);
};

timeAlgorithm('快速排序', () => sort(largeArray, { algorithm: 'quick' }));
timeAlgorithm('归并排序', () => sort(largeArray, { algorithm: 'merge' }));
timeAlgorithm('堆排序', () => sort(largeArray, { algorithm: 'heap' }));
console.log();

// ============================================================================
// 运行内置示例
// ============================================================================

console.log('\n【内置示例】运行完整示例集\n');
runExamples();

console.log('\n✅ 所有示例执行完成!');
