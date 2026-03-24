/**
 * 数组工具技能使用示例
 * 
 * 演示 ArrayUtils 的各种功能
 */

import {
  // 去重
  unique,
  uniqueBy,
  uniqueByJson,
  
  // 扁平化
  flatten,
  flattenDeep,
  flatMap,
  
  // 分组
  groupBy,
  groupByObject,
  partition,
  
  // 分块
  chunk,
  chunkByCount,
  chunkBy,
  
  // 查找
  findIndex,
  findIndexBy,
  find,
  findBy,
  findAll,
  includes,
  some,
  every,
  
  // 排序
  sortAsc,
  sortDesc,
  sortBy,
  sortByKey,
  sortNumbersAsc,
  sortNumbersDesc,
  sortStringsAsc,
  sortStringsDesc,
  
  // 高级工具
  shuffle,
  take,
  takeRight,
  drop,
  dropRight,
  intersection,
  union,
  difference,
  uniqueAndSort,
  
  ArrayUtils,
} from '../array-utils-skill';

// ==================== 1. 数组去重示例 ====================

console.log('=== 数组去重 ===\n');

// 基础去重
const numbers = [1, 2, 2, 3, 3, 3, 4];
console.log('原始数组:', numbers);
console.log('去重后:', unique(numbers));
// 输出: [1, 2, 3, 4]

// 基于自定义条件去重
const users = [
  { id: 1, name: 'Alice', age: 25 },
  { id: 2, name: 'Bob', age: 30 },
  { id: 1, name: 'Alice', age: 26 }, // 重复 ID
  { id: 3, name: 'Charlie', age: 35 },
];
console.log('\n用户数组:', users);
console.log('按 ID 去重:', uniqueBy(users, user => user.id));
// 输出: 保留第一个出现的每个 ID

// 基于 JSON 序列化去重 (适用于对象完全相同的情况)
const items = [
  { name: 'Apple', price: 10 },
  { name: 'Banana', price: 5 },
  { name: 'Apple', price: 10 }, // 完全重复
];
console.log('\n物品数组:', items);
console.log('JSON 去重:', uniqueByJson(items));

// ==================== 2. 数组扁平化示例 ====================

console.log('\n\n=== 数组扁平化 ===\n');

// 指定深度扁平化
const nested = [1, [2, 3], [4, [5, 6]]];
console.log('原始数组:', nested);
console.log('扁平化 (depth=1):', flatten(nested, 1));
// 输出: [1, 2, 3, 4, [5, 6]]

// 完全扁平化
console.log('完全扁平化:', flattenDeep(nested));
// 输出: [1, 2, 3, 4, 5, 6]

// flatMap: 扁平化并映射
const sentences = ['Hello World', 'Foo Bar', 'Baz Qux'];
console.log('\n句子数组:', sentences);
console.log('分词:', flatMap(sentences, sentence => sentence.split(' ')));
// 输出: ['Hello', 'World', 'Foo', 'Bar', 'Baz', 'Qux']

// ==================== 3. 数组分组示例 ====================

console.log('\n\n=== 数组分组 ===\n');

// 按属性分组
const products = [
  { name: 'Laptop', category: 'Electronics', price: 999 },
  { name: 'Phone', category: 'Electronics', price: 699 },
  { name: 'Desk', category: 'Furniture', price: 299 },
  { name: 'Chair', category: 'Furniture', price: 199 },
];

const groupedByCategory = groupByObject(products, p => p.category);
console.log('按类别分组:');
console.log(JSON.stringify(groupedByCategory, null, 2));

// 分区: 按条件分成两组
const ages = [15, 23, 17, 42, 8, 31];
const [adults, minors] = partition(ages, age => age >= 18);
console.log('\n年龄数组:', ages);
console.log('成年人:', adults); // [23, 42, 31]
console.log('未成年人:', minors); // [15, 17, 8]

// ==================== 4. 数组分块示例 ====================

console.log('\n\n=== 数组分块 ===\n');

// 固定大小分块
const data = [1, 2, 3, 4, 5, 6, 7, 8, 9];
console.log('原始数组:', data);
console.log('分块 (size=3):', chunk(data, 3));
// 输出: [[1,2,3], [4,5,6], [7,8,9]]

// 固定数量分块
console.log('分块 (count=4):', chunkByCount(data, 4));
// 输出: [[1,2,3], [4,5,6], [7,8], [9]]

// 按条件分块
const sequence = [1, 2, 3, 10, 11, 12, 20, 21];
console.log('\n序列数组:', sequence);
console.log('按条件分块 (新块开始于 >=10):', 
  chunkBy(sequence, (item, index) => item >= 10 && index > 0 && sequence[index - 1] < 10));

// ==================== 5. 数组查找示例 ====================

console.log('\n\n=== 数组查找 ===\n');

const inventory = [
  { id: 1, name: 'Widget', stock: 100 },
  { id: 2, name: 'Gadget', stock: 0 },
  { id: 3, name: 'Gizmo', stock: 50 },
  { id: 4, name: 'Thingamajig', stock: 25 },
];

// 查找索引
console.log('查找 stock=0 的索引:', findIndexBy(inventory, item => item.stock === 0));
// 输出: 1

// 查找元素
const outOfStock = findBy(inventory, item => item.stock === 0);
console.log('缺货商品:', outOfStock);

// 查找所有匹配
const lowStock = findAll(inventory, item => item.stock < 60);
console.log('低库存商品:', lowStock.map(i => i.name));

// 检查条件
console.log('\n是否有缺货商品？', some(inventory, item => item.stock === 0));
console.log('所有商品都有库存？', every(inventory, item => item.stock > 0));
console.log('是否包含 Widget？', includes(inventory.map(i => i.name), 'Widget'));

// ==================== 6. 数组排序示例 ====================

console.log('\n\n=== 数组排序 ===\n');

// 数字排序
const scores = [85, 92, 78, 90, 88];
console.log('原始分数:', scores);
console.log('升序:', sortNumbersAsc(scores));
console.log('降序:', sortNumbersDesc(scores));

// 字符串排序
const names = ['张三', '李四', '王五', '赵六'];
console.log('\n姓名数组:', names);
console.log('升序:', sortStringsAsc(names));
console.log('降序:', sortStringsDesc(names));

// 对象数组排序
const employees = [
  { name: 'Alice', salary: 50000 },
  { name: 'Bob', salary: 75000 },
  { name: 'Charlie', salary: 60000 },
];
console.log('\n员工数组:');
console.log('按薪资升序:', sortByKey(employees, e => e.salary));
console.log('按薪资降序:', sortByKey(employees, e => e.salary, false));
console.log('按姓名排序:', sortByKey(employees, e => e.name));

// ==================== 7. 高级工具示例 ====================

console.log('\n\n=== 高级工具 ===\n');

// 洗牌
const deck = ['A', 'K', 'Q', 'J', '10'];
console.log('原始牌组:', deck);
console.log('洗牌后:', shuffle(deck));

// 取前 N 个
const leaderboard = ['Alice', 'Bob', 'Charlie', 'David', 'Eve'];
console.log('\n排行榜:', leaderboard);
console.log('前 3 名:', take(leaderboard, 3));
console.log('后 2 名:', takeRight(leaderboard, 2));

// 移除 N 个
console.log('移除前 2 名:', drop(leaderboard, 2));
console.log('移除后 2 名:', dropRight(leaderboard, 2));

// 集合运算
const setA = [1, 2, 3, 4, 5];
const setB = [4, 5, 6, 7, 8];
console.log('\n集合 A:', setA);
console.log('集合 B:', setB);
console.log('交集:', intersection(setA, setB)); // [4, 5]
console.log('并集:', union(setA, setB)); // [1,2,3,4,5,6,7,8]
console.log('差集 (A-B):', difference(setA, setB)); // [1, 2, 3]

// 去重并排序
const messy = [5, 2, 8, 2, 1, 5, 9, 1];
console.log('\n混乱数组:', messy);
console.log('去重并排序:', uniqueAndSort(messy)); // [1, 2, 5, 8, 9]

// ==================== 8. 实际应用场景 ====================

console.log('\n\n=== 实际应用场景 ===\n');

// 场景 1: 处理 API 返回的数据
const apiResponse = [
  { id: 1, tags: ['tech', 'news'] },
  { id: 2, tags: ['sports'] },
  { id: 3, tags: ['tech', 'science'] },
  { id: 4, tags: ['news'] },
];

// 提取所有标签并去重
const allTags = flatMap(apiResponse, item => item.tags);
const uniqueTags = unique(allTags);
console.log('所有唯一标签:', uniqueTags);

// 场景 2: 分页数据处理
const allData = Array.from({ length: 100 }, (_, i) => i + 1);
const pageSize = 10;
const pages = chunk(allData, pageSize);
console.log('\n100 条数据分 10 页:', pages.length, '页');
console.log('第 1 页:', pages[0]);
console.log('第 10 页:', pages[9]);

// 场景 3: 数据过滤和分组
const sales = [
  { product: 'A', region: 'North', amount: 1000 },
  { product: 'B', region: 'South', amount: 1500 },
  { product: 'A', region: 'North', amount: 800 },
  { product: 'C', region: 'East', amount: 1200 },
  { product: 'B', region: 'North', amount: 900 },
];

// 按产品分组
const byProduct = groupByObject(sales, s => s.product);
console.log('\n按产品分组的销售:');
for (const [product, items] of Object.entries(byProduct)) {
  const total = items.reduce((sum, item) => sum + item.amount, 0);
  console.log(`  ${product}: $${total}`);
}

// 场景 4: 查找和排序组合
const highValueSales = findAll(sales, s => s.amount >= 1000);
const sortedByAmount = sortByKey(highValueSales, s => s.amount, false);
console.log('\n高价值订单 (≥$1000) 按金额降序:');
sortedByAmount.forEach(s => console.log(`  ${s.product} (${s.region}): $${s.amount}`));

console.log('\n\n=== 示例完成 ===');
