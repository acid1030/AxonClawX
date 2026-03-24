/**
 * 组合数学工具 - 使用示例
 * 
 * 运行方式：uv run tsx combo-utils-examples.ts
 * 或：node --loader ts-node/esm combo-utils-examples.ts
 */

import {
  factorial,
  permutation,
  combination,
  generatePermutations,
  generateCombinations,
  cartesianProduct,
  cartesianProduct2,
  cartesianProductWith,
  powerSet,
  nonEmptySubsets,
  fullPermute,
  permutationWithRepetition,
  combinationWithRepetition,
} from './combo-utils-skill';

console.log('='.repeat(60));
console.log('🜏 组合数学工具 - 使用示例');
console.log('='.repeat(60));
console.log();

// ==================== 1. 阶乘计算 ====================
console.log('📌 示例 1: 阶乘计算');
console.log('-'.repeat(40));
console.log(`0! = ${factorial(0)}`);
console.log(`1! = ${factorial(1)}`);
console.log(`5! = ${factorial(5)}`);
console.log(`10! = ${factorial(10)}`);
console.log();

// ==================== 2. 排列数计算 ====================
console.log('📌 示例 2: 排列数 P(n, k)');
console.log('-'.repeat(40));
console.log(`P(5, 3) = ${permutation(5, 3)} (从 5 个中选 3 个排列)`);
console.log(`P(6, 2) = ${permutation(6, 2)} (从 6 个中选 2 个排列)`);
console.log(`P(4, 4) = ${permutation(4, 4)} (全排列)`);
console.log();

// ==================== 3. 组合数计算 ====================
console.log('📌 示例 3: 组合数 C(n, k)');
console.log('-'.repeat(40));
console.log(`C(5, 3) = ${combination(5, 3)} (从 5 个中选 3 个组合)`);
console.log(`C(10, 2) = ${combination(10, 2)} (从 10 个中选 2 个组合)`);
console.log(`C(52, 5) = ${combination(52, 5)} (扑克牌 5 张牌的组合数)`);
console.log();

// ==================== 4. 生成排列 ====================
console.log('📌 示例 4: 生成所有排列');
console.log('-'.repeat(40));
const items4 = ['A', 'B', 'C'];
const perms4 = generatePermutations(items4, 2);
console.log(`从 [${items4.join(', ')}] 中选 2 个的排列 (${perms4.length} 种):`);
perms4.forEach(p => console.log(`  ${p.join('')}`));
console.log();

// ==================== 5. 全排列 ====================
console.log('📌 示例 5: 全排列');
console.log('-'.repeat(40));
const items5 = [1, 2, 3];
const fullPerms = fullPermute(items5);
console.log(`[${items5.join(', ')}] 的全排列 (${fullPerms.length} 种):`);
fullPerms.forEach(p => console.log(`  [${p.join(', ')}]`));
console.log();

// ==================== 6. 生成组合 ====================
console.log('📌 示例 6: 生成所有组合');
console.log('-'.repeat(40));
const items6 = [1, 2, 3, 4];
const combos6 = generateCombinations(items6, 2);
console.log(`从 [${items6.join(', ')}] 中选 2 个的组合 (${combos6.length} 种):`);
combos6.forEach(c => console.log(`  [${c.join(', ')}]`));
console.log();

// ==================== 7. 笛卡尔积 (2 个集合) ====================
console.log('📌 示例 7: 笛卡尔积 (2 个集合)');
console.log('-'.repeat(40));
const setA = ['红', '蓝', '绿'];
const setB = ['大', '小'];
const product2 = cartesianProduct2(setA, setB);
console.log(`${JSON.stringify(setA)} × ${JSON.stringify(setB)}:`);
product2.forEach(([a, b]) => console.log(`  (${a}, ${b})`));
console.log();

// ==================== 8. 笛卡尔积 (多个集合) ====================
console.log('📌 示例 8: 笛卡尔积 (多个集合)');
console.log('-'.repeat(40));
const setSize = ['S', 'M', 'L'];
const setColor = ['红', '蓝'];
const setMaterial = ['棉', '麻'];
const productMulti = cartesianProduct(setSize, setColor, setMaterial);
console.log(`尺寸 × 颜色 × 材质 (${productMulti.length} 种组合):`);
productMulti.forEach(p => console.log(`  ${p.join('-')}`));
console.log();

// ==================== 9. 幂集 (所有子集) ====================
console.log('📌 示例 9: 幂集 (所有子集)');
console.log('-'.repeat(40));
const items9 = [1, 2, 3];
const subsets = powerSet(items9);
console.log(`[${items9.join(', ')}] 的幂集 (${subsets.length} 个子集):`);
subsets.forEach(s => console.log(`  [${s.join(', ')}]`));
console.log();

// ==================== 10. 非空子集 ====================
console.log('📌 示例 10: 非空子集');
console.log('-'.repeat(40));
const items10 = ['A', 'B'];
const nonEmpty = nonEmptySubsets(items10);
console.log(`[${items10.join(', ')}] 的非空子集 (${nonEmpty.length} 个):`);
nonEmpty.forEach(s => console.log(`  [${s.join(', ')}]`));
console.log();

// ==================== 11. 可重复排列 ====================
console.log('📌 示例 11: 可重复排列');
console.log('-'.repeat(40));
console.log(`从 3 个元素中可重复选 2 个排列: ${permutationWithRepetition(3, 2)} 种`);
console.log(`(例如：骰子掷 2 次的结果数 = ${permutationWithRepetition(6, 2)})`);
console.log();

// ==================== 12. 可重复组合 ====================
console.log('📌 示例 12: 可重复组合');
console.log('-'.repeat(40));
console.log(`从 3 种口味中选 2 个冰淇淋 (可重复): ${combinationWithRepetition(3, 2)} 种`);
console.log(`(例如：香草/巧克力/草莓，选 2 个，可重复选同一种)`);
console.log();

// ==================== 13. 实际应用场景 ====================
console.log('📌 示例 13: 实际应用场景');
console.log('-'.repeat(40));

// 场景 1: 密码组合
const digits = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
const passwordCombos = permutation(10, 4);
console.log(`4 位数字密码的可能组合数：${passwordCombos}`);

// 场景 2: 比赛排名
const teams = 8;
const podium = permutation(teams, 3);
console.log(`${teams} 支队伍比赛，前三名的排列数：${podium}`);

// 场景 3: 抽奖组合
const lottery = combination(49, 6);
console.log(`49 选 6 彩票的中奖组合数：1 / ${lottery.toLocaleString()}`);

// 场景 4: 菜单搭配
const mains = ['牛排', '鱼', '鸡'];
const sides = ['薯条', '沙拉', '米饭'];
const drinks = ['可乐', '果汁', '水'];
const menuCombos = cartesianProduct(mains, sides, drinks);
console.log(`菜单搭配方案：${menuCombos.length} 种`);

// 场景 5: 笛卡尔积带自定义组合
const sizeColor = cartesianProductWith(
  (items) => `${items[0]}号-${items[1]}`,
  ['S', 'M', 'L'],
  ['红', '蓝']
);
console.log(`尺码颜色组合：${sizeColor.join(', ')}`);

console.log();
console.log('='.repeat(60));
console.log('✅ 所有示例执行完成');
console.log('='.repeat(60));
