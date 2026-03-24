/**
 * Transformer Utils Skill - 使用示例
 * 
 * 演示如何使用 transformer-utils-skill.ts 中的各种功能
 */

import {
  // 对象↔数组转换
  objectToArray,
  objectToArrayCustom,
  objectToValues,
  objectToKeys,
  arrayToObject,
  arrayToObjectCustom,
  arrayToIndexedObject,
  flattenObjectToArray,
  unflattenArrayToObject,
  
  // 数据映射
  mapObject,
  mapArray,
  pick,
  omit,
  mapKeys,
  mapValues,
  mapEntries,
  
  // 数据聚合
  groupAggregate,
  sumArray,
  averageArray,
  maxArray,
  minArray,
  countArray,
  frequencyCount,
  pivotTable,
  scan,
  
  // 高级转换
  deepTransform,
  conditionalTransform,
  pipeTransform,
  
  // 工具类
  TransformerUtils,
} from './transformer-utils-skill';

// ============================================================================
// 1. 对象↔数组转换示例
// ============================================================================

console.log('=== 1. 对象↔数组转换 ===\n');

// 1.1 对象转数组 (键值对形式)
const obj1 = { name: 'Alice', age: 30, city: 'Beijing' };
const arr1 = objectToArray(obj1);
console.log('objectToArray:', arr1);
// 输出: [
//   { key: 'name', value: 'Alice' },
//   { key: 'age', value: 30 },
//   { key: 'city', value: 'Beijing' }
// ]

// 1.2 对象转数组 (自定义格式)
const obj2 = { a: 1, b: 2, c: 3 };
const arr2 = objectToArrayCustom(obj2, (key, value) => `${key}=${value}`);
console.log('objectToArrayCustom:', arr2);
// 输出: ['a=1', 'b=2', 'c=3']

// 1.3 对象转数组 (仅值)
const obj3 = { x: 10, y: 20, z: 30 };
const values = objectToValues(obj3);
console.log('objectToValues:', values);
// 输出: [10, 20, 30]

// 1.4 对象转数组 (仅键)
const keys = objectToKeys(obj3);
console.log('objectToKeys:', keys);
// 输出: ['x', 'y', 'z']

// 1.5 数组转对象 (键值对数组)
const kvArray: Array<{ key: string; value: any }> = [
  { key: 'username', value: 'john_doe' },
  { key: 'email', value: 'john@example.com' },
  { key: 'age', value: 25 }
];
const obj4 = arrayToObject(kvArray);
console.log('arrayToObject:', obj4);
// 输出：{ username: 'john_doe', email: 'john@example.com', age: 25 }

// 1.6 数组转对象 (自定义键值提取)
const users = [
  { id: 'u1', name: 'Alice', score: 90 },
  { id: 'u2', name: 'Bob', score: 85 },
  { id: 'u3', name: 'Charlie', score: 95 }
];
const userMap = arrayToObjectCustom(users, (user: any) => user.id, (user: any) => user.score);
console.log('arrayToObjectCustom:', userMap);
// 输出：{ u1: 90, u2: 85, u3: 95 }

// 1.7 数组转对象 (索引为键)
const fruits = ['apple', 'banana', 'orange'];
const indexedObj = arrayToIndexedObject(fruits);
console.log('arrayToIndexedObject:', indexedObj);
// 输出：{ 0: 'apple', 1: 'banana', 2: 'orange' }

// 1.8 嵌套对象转扁平数组
const nestedObj = {
  user: {
    name: 'Alice',
    profile: {
      age: 30,
      location: 'Beijing'
    }
  },
  status: 'active'
};
const flatArr = flattenObjectToArray(nestedObj);
console.log('flattenObjectToArray:', flatArr);
// 输出: [
//   { key: 'user.name', value: 'Alice' },
//   { key: 'user.profile.age', value: 30 },
//   { key: 'user.profile.location', value: 'Beijing' },
//   { key: 'status', value: 'active' }
// ]

// 1.9 扁平数组转嵌套对象
const flatArray: Array<{ key: string; value: any }> = [
  { key: 'config.database.host', value: 'localhost' },
  { key: 'config.database.port', value: 5432 },
  { key: 'config.debug', value: true }
];
const nestedObj2 = unflattenArrayToObject(flatArray);
console.log('unflattenArrayToObject:', nestedObj2);
// 输出：{ config: { database: { host: 'localhost', port: 5432 }, debug: true } }

// ============================================================================
// 2. 数据映射示例
// ============================================================================

console.log('\n=== 2. 数据映射 ===\n');

// 2.1 对象字段映射
const user = {
  firstName: 'John',
  lastName: 'Doe',
  email: 'john@example.com',
  age: 30
};

const mappedUser = mapObject(user, {
  fields: {
    firstName: 'name',
    lastName: 'surname'
  },
  filter: (value, key) => key !== 'age', // 过滤掉 age 字段
  valueTransform: (value, key) => {
    if (key === 'email') {
      return value.toLowerCase();
    }
    return value;
  }
});
console.log('mapObject:', mappedUser);
// 输出：{ name: 'John', surname: 'Doe', email: 'john@example.com' }

// 2.2 数组映射
const userList = [
  { firstName: 'Alice', age: 25 },
  { firstName: 'Bob', age: 30 },
  { firstName: 'Charlie', age: 35 }
];

const mappedList = mapArray(userList, {
  fields: { firstName: 'name' },
  valueTransform: (value, key) => key === 'age' ? value + 1 : value
});
console.log('mapArray:', mappedList);
// 输出: [
//   { name: 'Alice', age: 26 },
//   { name: 'Bob', age: 31 },
//   { name: 'Charlie', age: 36 }
// ]

// 2.3 选择性拾取字段
const product = {
  id: 1,
  name: 'Laptop',
  price: 999,
  description: 'A powerful laptop',
  stock: 50
};

const picked = pick(product, ['id', 'name', 'price']);
console.log('pick:', picked);
// 输出：{ id: 1, name: 'Laptop', price: 999 }

// 2.4 选择性省略字段
const omitted = omit(product, ['description', 'stock']);
console.log('omit:', omitted);
// 输出：{ id: 1, name: 'Laptop', price: 999 }

// 2.5 对象键映射
const obj5 = { a: 1, b: 2, c: 3 };
const mappedKeys = mapKeys(obj5, key => key.toUpperCase());
console.log('mapKeys:', mappedKeys);
// 输出：{ A: 1, B: 2, C: 3 }

// 2.6 对象值映射
const obj6 = { a: 1, b: 2, c: 3 };
const mappedValues = mapValues(obj6, value => value * 2);
console.log('mapValues:', mappedValues);
// 输出：{ a: 2, b: 4, c: 6 }

// 2.7 对象条目映射
const obj7 = { a: 1, b: 2, c: 3 };
const mappedEntries = mapEntries(obj7, (key, value) => [
  key.toUpperCase(),
  value * 10
]);
console.log('mapEntries:', mappedEntries);
// 输出：{ A: 10, B: 20, C: 30 }

// ============================================================================
// 3. 数据聚合示例
// ============================================================================

console.log('\n=== 3. 数据聚合 ===\n');

// 3.1 数组分组聚合
const sales = [
  { region: 'North', product: 'A', amount: 100 },
  { region: 'North', product: 'B', amount: 150 },
  { region: 'South', product: 'A', amount: 200 },
  { region: 'South', product: 'B', amount: 250 },
  { region: 'North', product: 'A', amount: 120 }
];

// 按地区分组
const groupedByRegion = groupAggregate(sales, (item: any) => item.region);
console.log('groupAggregate (by region):', groupedByRegion);

// 按地区分组并求和
const sumByRegion = groupAggregate(
  sales,
  (item: any) => item.region,
  (items: any[]) => items.reduce((sum, item) => sum + item.amount, 0)
);
console.log('groupAggregate (sum by region):', sumByRegion);
// 输出：{ North: 370, South: 450 }

// 3.2 数组求和
const numbers = [1, 2, 3, 4, 5];
const total = sumArray(numbers);
console.log('sumArray:', total);
// 输出：15

const totalAmount = sumArray(sales, (item: any) => item.amount);
console.log('sumArray (sales):', totalAmount);
// 输出：820

// 3.3 数组平均值
const avg = averageArray(numbers);
console.log('averageArray:', avg);
// 输出：3

const avgSale = averageArray(sales, (item: any) => item.amount);
console.log('averageArray (sales):', avgSale);
// 输出：164

// 3.4 数组最大值
const max = maxArray(numbers);
console.log('maxArray:', max);
// 输出：5

const maxSale = maxArray(sales, (item: any) => item.amount);
console.log('maxArray (sales):', maxSale);
// 输出：{ region: 'South', product: 'B', amount: 250 }

// 3.5 数组最小值
const min = minArray(numbers);
console.log('minArray:', min);
// 输出：1

// 3.6 数组计数
const count = countArray(numbers);
console.log('countArray:', count);
// 输出：5

const evenCount = countArray(numbers, (n: number) => n % 2 === 0);
console.log('countArray (even):', evenCount);
// 输出：2

// 3.7 频率统计
const letters = ['a', 'b', 'a', 'c', 'b', 'a', 'd', 'b', 'a'];
const freq = frequencyCount(letters);
console.log('frequencyCount:', freq);
// 输出：{ a: 4, b: 3, c: 1, d: 1 }

// 3.8 数据透视表
const pivotData = [
  { region: 'North', product: 'A', sales: 100 },
  { region: 'North', product: 'B', sales: 150 },
  { region: 'South', product: 'A', sales: 200 },
  { region: 'South', product: 'B', sales: 250 },
  { region: 'North', product: 'A', sales: 120 },
  { region: 'South', product: 'A', sales: 180 }
];

const pivot = pivotTable(pivotData, {
  rows: 'region',
  columns: 'product',
  values: 'sales',
  aggregator: 'sum'
});
console.log('pivotTable:', pivot);
// 输出：{
//   North: { A: 220, B: 150 },
//   South: { A: 380, B: 250 }
// }

// 3.9 累积聚合
const runningTotal = scan(numbers, (acc: number, item: number) => acc + item, 0);
console.log('scan (running total):', runningTotal);
// 输出：[1, 3, 6, 10, 15]

// ============================================================================
// 4. 高级转换示例
// ============================================================================

console.log('\n=== 4. 高级转换 ===\n');

// 4.1 深度转换
const deepObj = {
  level1: {
    level2: {
      value: 10
    },
    another: 20
  },
  direct: 30
};

const transformed = deepTransform(deepObj, (value: any) => {
  if (typeof value === 'number') {
    return value * 2;
  }
  return value;
}, { deep: true });

console.log('deepTransform:', transformed);
// 输出：{ level1: { level2: { value: 20 }, another: 40 }, direct: 60 }

// 4.2 条件转换
const userData = { age: 25, score: 85, name: 'Alice' };

const result = conditionalTransform(userData, [
  {
    test: (v: any) => v.age < 18,
    transform: (v: any) => ({ ...v, category: 'minor' })
  },
  {
    test: (v: any) => v.age >= 18,
    transform: (v: any) => ({ ...v, category: 'adult' })
  },
  {
    test: (v: any) => v.score >= 80,
    transform: (v: any) => ({ ...v, grade: 'A' })
  },
  {
    test: (v: any) => v.score >= 60 && v.score < 80,
    transform: (v: any) => ({ ...v, grade: 'B' })
  }
]);

console.log('conditionalTransform:', result);
// 输出：{ age: 25, score: 85, name: 'Alice', category: 'adult', grade: 'A' }

// 4.3 管道转换
const pipeline = pipeTransform(
  [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  (data: number[]) => data.filter(x => x % 2 === 0),           // 过滤偶数：[2, 4, 6, 8, 10]
  (data: number[]) => data.map(x => x * 2),                    // 翻倍：[4, 8, 12, 16, 20]
  (data: number[]) => data.reduce((sum: number, x: number) => sum + x, 0)      // 求和：60
);

console.log('pipeTransform:', pipeline);
// 输出：60

// ============================================================================
// 5. 使用工具类
// ============================================================================

console.log('\n=== 5. 使用工具类 ===\n');

// 使用 TransformerUtils 工具类
const utils = TransformerUtils;

const testObj = { a: 1, b: 2, c: 3 };
console.log('Utils.objectToKeys:', utils.objectToKeys(testObj));
console.log('Utils.objectToValues:', utils.objectToValues(testObj));
console.log('Utils.sumArray([1,2,3,4,5]):', utils.sumArray([1, 2, 3, 4, 5]));
console.log('Utils.averageArray([1,2,3,4,5]):', utils.averageArray([1, 2, 3, 4, 5]));

// ============================================================================
// 6. 实际应用场景
// ============================================================================

console.log('\n=== 6. 实际应用场景 ===\n');

// 场景 1: API 响应数据转换
const apiResponse = {
  data: {
    user_info: {
      first_name: 'John',
      last_name: 'Doe',
      email_address: 'john@example.com'
    }
  }
};

// 转换 snake_case 为 camelCase
const camelCaseData = deepTransform(apiResponse, (value: any) => {
  if (typeof value === 'string') {
    return value.replace(/_([a-z])/g, (_: any, letter: string) => letter.toUpperCase());
  }
  return value;
}, { deep: false }); // 只转换值，不递归

console.log('API 响应转换:', camelCaseData);

// 场景 2: 报表数据聚合
const orders = [
  { category: 'Electronics', month: '2024-01', revenue: 10000 },
  { category: 'Electronics', month: '2024-02', revenue: 12000 },
  { category: 'Clothing', month: '2024-01', revenue: 5000 },
  { category: 'Clothing', month: '2024-02', revenue: 6000 },
  { category: 'Electronics', month: '2024-03', revenue: 11000 },
  { category: 'Clothing', month: '2024-03', revenue: 5500 }
];

// 按类别汇总收入
const revenueByCategory = groupAggregate(
  orders,
  (order: any) => order.category,
  (orders: any[]) => orders.reduce((sum, o) => sum + o.revenue, 0)
);
console.log('按类别汇总收入:', revenueByCategory);
// 输出：{ Electronics: 33000, Clothing: 16500 }

// 按月份汇总收入
const revenueByMonth = groupAggregate(
  orders,
  (order: any) => order.month,
  (orders: any[]) => orders.reduce((sum, o) => sum + o.revenue, 0)
);
console.log('按月份汇总收入:', revenueByMonth);
// 输出：{ '2024-01': 15000, '2024-02': 18000, '2024-03': 16500 }

// 场景 3: 表单数据处理
const formData = {
  username: '  JohnDoe  ',
  email: 'JOHN@EXAMPLE.COM',
  age: '25',
  newsletter: true,
  password: 'secret123'
};

// 清理和转换表单数据
const cleanedData = mapObject(formData, {
  filter: (_: any, key: string) => key !== 'password', // 移除密码字段
  valueTransform: (value: any, key: string) => {
    if (typeof value === 'string') {
      if (key === 'email') return value.toLowerCase().trim();
      return value.trim();
    }
    if (key === 'age') return Number(value);
    return value;
  }
});
console.log('清理后的表单数据:', cleanedData);
// 输出：{ username: 'JohnDoe', email: 'john@example.com', age: 25, newsletter: true }

console.log('\n=== 示例完成 ===');
