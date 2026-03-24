/**
 * Compare Utils 使用示例
 * 
 * 运行：npx tsx src/skills/compare-utils-examples.ts
 */

import {
  deepEqual,
  objectDiff,
  arrayDiff,
  arrayDiffByKey,
  formatDiffReport,
  findDuplicates,
  compareMultiple,
} from './compare-utils-skill';

console.log('='.repeat(60));
console.log('📊 数据比较工具技能 - 使用示例');
console.log('='.repeat(60));

// ==================== 示例 1: 深度相等比较 ====================
console.log('\n【示例 1】深度相等比较\n');

const obj1 = {
  name: 'Alice',
  age: 25,
  address: {
    city: 'Beijing',
    district: 'Chaoyang'
  },
  hobbies: ['reading', 'coding']
};

const obj2 = {
  name: 'Alice',
  age: 25,
  address: {
    city: 'Beijing',
    district: 'Chaoyang'
  },
  hobbies: ['reading', 'coding']
};

const obj3 = {
  name: 'Alice',
  age: 26, // 不同
  address: {
    city: 'Beijing',
    district: 'Haidian' // 不同
  },
  hobbies: ['reading', 'coding']
};

console.log('obj1 vs obj2 (应该相等):', deepEqual(obj1, obj2));
console.log('obj1 vs obj3 (应该不等):', deepEqual(obj1, obj3));

// Date 比较
const date1 = new Date('2024-01-01');
const date2 = new Date('2024-01-01');
const date3 = new Date('2024-01-02');

console.log('\nDate 比较:');
console.log('date1 vs date2:', deepEqual(date1, date2));
console.log('date1 vs date3:', deepEqual(date1, date3));

// Map 比较
const map1 = new Map([['a', 1], ['b', 2]]);
const map2 = new Map([['a', 1], ['b', 2]]);
const map3 = new Map([['a', 1], ['b', 3]]);

console.log('\nMap 比较:');
console.log('map1 vs map2:', deepEqual(map1, map2));
console.log('map1 vs map3:', deepEqual(map1, map3));

// ==================== 示例 2: 对象差异比较 ====================
console.log('\n' + '='.repeat(60));
console.log('【示例 2】对象差异比较\n');

const oldUser = {
  id: 1,
  name: 'Alice',
  email: 'alice@example.com',
  age: 25,
  settings: {
    theme: 'dark',
    notifications: true
  }
};

const newUser = {
  id: 1,
  name: 'Alice',
  email: 'alice@newdomain.com', // 修改
  age: 26, // 修改
  phone: '123-456-7890', // 新增
  // settings 被移除
};

const objDiffResult = objectDiff(oldUser, newUser);

console.log('差异报告:');
console.log(formatDiffReport(objDiffResult));

console.log('\n结构化差异:');
console.log(JSON.stringify(objDiffResult, null, 2));

// ==================== 示例 3: 嵌套对象差异 ====================
console.log('\n' + '='.repeat(60));
console.log('【示例 3】嵌套对象差异\n');

const oldConfig = {
  database: {
    host: 'localhost',
    port: 5432,
    credentials: {
      username: 'admin',
      password: 'secret123'
    }
  },
  features: ['auth', 'logging'],
  version: '1.0.0'
};

const newConfig = {
  database: {
    host: 'production.db.com', // 修改
    port: 5432,
    credentials: {
      username: 'admin',
      password: 'newSecret456' // 修改
    }
  },
  features: ['auth', 'logging', 'metrics'], // 修改
  version: '1.0.1' // 修改
};

const configDiff = objectDiff(oldConfig, newConfig);
console.log('配置变更报告:');
console.log(formatDiffReport(configDiff));

// ==================== 示例 4: 数组差异比较 ====================
console.log('\n' + '='.repeat(60));
console.log('【示例 4】数组差异比较\n');

const oldList = [1, 2, 3, 4, 5];
const newList = [1, 3, 4, 6, 7];

const arrDiffResult = arrayDiff(oldList, newList);

console.log('旧数组:', oldList);
console.log('新数组:', newList);
console.log('\n差异:');
console.log('  添加:', arrDiffResult.added);
console.log('  移除:', arrDiffResult.removed);
console.log('  未变:', arrDiffResult.unchanged);
console.log('  修改:', arrDiffResult.modified);

// ==================== 示例 5: 对象数组差异 ====================
console.log('\n' + '='.repeat(60));
console.log('【示例 5】对象数组差异 (基于键值)\n');

const oldProducts = [
  { id: 1, name: 'Product A', price: 100, stock: 50 },
  { id: 2, name: 'Product B', price: 200, stock: 30 },
  { id: 3, name: 'Product C', price: 150, stock: 40 }
];

const newProducts = [
  { id: 1, name: 'Product A', price: 120, stock: 45 }, // 价格变化
  { id: 3, name: 'Product C', price: 150, stock: 35 }, // 库存变化
  { id: 4, name: 'Product D', price: 180, stock: 20 }  // 新增
];

const productDiff = arrayDiffByKey(
  oldProducts,
  newProducts,
  product => product.id
);

console.log('产品变更:');
console.log('  新增产品:', productDiff.added.map(p => p.name));
console.log('  移除产品:', productDiff.removed.map(p => p.name));
console.log('  修改产品:', Object.keys(productDiff.modified).map(k => {
  const change = productDiff.modified[Number(k)];
  return `${change.old.name} (价格：${change.old.price} → ${change.new.price})`;
}));

// ==================== 示例 6: 查找重复元素 ====================
console.log('\n' + '='.repeat(60));
console.log('【示例 6】查找重复元素\n');

const numbers = [1, 2, 2, 3, 3, 3, 4, 5];
const duplicateNumbers = findDuplicates(numbers);
console.log('数组:', numbers);
console.log('重复元素:', duplicateNumbers);

const users = [
  { id: 1, email: 'alice@test.com' },
  { id: 2, email: 'bob@test.com' },
  { id: 3, email: 'charlie@test.com' },
  { id: 4, email: 'alice@test.com' }, // 重复邮箱
  { id: 5, email: 'bob@test.com' }    // 重复邮箱
];

const duplicateEmails = findDuplicates(users, user => user.email);
console.log('\n用户列表:');
users.forEach(u => console.log(`  ${u.id}: ${u.email}`));
console.log('\n重复邮箱的用户:');
duplicateEmails.forEach(u => console.log(`  ${u.id}: ${u.email}`));

// ==================== 示例 7: 比较多个对象 ====================
console.log('\n' + '='.repeat(60));
console.log('【示例 7】比较多个对象\n');

const versions = [
  { version: '1.0.0', features: 5, bugs: 10 },
  { version: '1.1.0', features: 8, bugs: 5 },
  { version: '1.2.0', features: 12, bugs: 3 },
  { version: '2.0.0', features: 20, bugs: 0 }
];

const multiCompare = compareMultiple(versions);

console.log('基准版本:', multiCompare.base.version);
console.log('\n与其他版本的差异:');
versions.slice(1).forEach((v, i) => {
  const diff = multiCompare.diffs[i];
  console.log(`\n  vs ${v.version}:`);
  if (diff.hasChanges) {
    console.log('    修改字段:', Object.keys(diff.modified).join(', '));
  }
});

// ==================== 示例 8: 自定义比较器 ====================
console.log('\n' + '='.repeat(60));
console.log('【示例 8】自定义比较器\n');

const data1 = { value: 100.001, timestamp: Date.now() };
const data2 = { value: 100.002, timestamp: Date.now() + 1000 };

// 忽略小数点后 3 位的差异
const isEqual = deepEqual(data1, data2, {
  customComparator: (a, b) => {
    if (typeof a === 'number' && typeof b === 'number') {
      return Math.abs(a - b) < 0.01;
    }
    return null; // 使用默认比较
  }
});

console.log('data1:', data1);
console.log('data2:', data2);
console.log('忽略小数差异后是否相等:', isEqual);

// ==================== 总结 ====================
console.log('\n' + '='.repeat(60));
console.log('✅ 所有示例执行完成!');
console.log('='.repeat(60));
