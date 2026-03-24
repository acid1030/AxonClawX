/**
 * 随机工具技能 - 使用示例
 * 
 * 演示 random-utils-skill.ts 的各种使用场景
 */

import {
  randomInt,
  randomFloat,
  randomString,
  randomChoice,
  shuffle,
  randomBool,
  randomUUID,
} from './random-utils-skill';

// ============================================
// 场景 1: 验证码生成
// ============================================
console.log('=== 场景 1: 验证码生成 ===');

/**
 * 生成 6 位数字验证码
 */
function generateNumericCode(length: number = 6): string {
  return randomString(length, {
    includeUppercase: false,
    includeLowercase: false,
    includeNumbers: true,
    includeSymbols: false,
  });
}

/**
 * 生成 6 位字母数字混合验证码
 */
function generateMixedCode(length: number = 6): string {
  return randomString(length, {
    includeUppercase: true,
    includeLowercase: false,
    includeNumbers: true,
    includeSymbols: false,
  });
}

console.log(`数字验证码：${generateNumericCode()}`);
console.log(`混合验证码：${generateMixedCode()}`);
console.log(`8 位数字验证码：${generateNumericCode(8)}\n`);

// ============================================
// 场景 2: 密码生成器
// ============================================
console.log('=== 场景 2: 密码生成器 ===');

/**
 * 生成强密码
 * @param length 密码长度，默认 16
 */
function generateStrongPassword(length: number = 16): string {
  return randomString(length, {
    includeUppercase: true,
    includeLowercase: true,
    includeNumbers: true,
    includeSymbols: true,
  });
}

/**
 * 生成易记密码 (仅字母)
 * @param length 密码长度，默认 12
 */
function generateMemorablePassword(length: number = 12): string {
  return randomString(length, {
    includeUppercase: true,
    includeLowercase: true,
    includeNumbers: false,
    includeSymbols: false,
  });
}

console.log(`强密码 (16 位): ${generateStrongPassword()}`);
console.log(`强密码 (20 位): ${generateStrongPassword(20)}`);
console.log(`易记密码 (12 位): ${generateMemorablePassword()}`);
console.log(`易记密码 (16 位): ${generateMemorablePassword(16)}\n`);

// ============================================
// 场景 3: 抽奖系统
// ============================================
console.log('=== 场景 3: 抽奖系统 ===');

const participants = [
  '张三',
  '李四',
  '王五',
  '赵六',
  '钱七',
  '孙八',
  '周九',
  '吴十',
];

// 抽取 1 名一等奖
const firstPrize = randomChoice(participants);
console.log(`🏆 一等奖获得者：${firstPrize}`);

// 从剩余参与者中抽取 3 名二等奖
const remainingAfterFirst = participants.filter((p) => p !== firstPrize);
const secondPrizes = randomChoice(remainingAfterFirst, 3) as string[];
console.log(`🥈 二等奖获得者：${secondPrizes.join(', ')}`);

// 从剩余参与者中抽取 5 名三等奖
const remainingAfterSecond = remainingAfterFirst.filter(
  (p) => !secondPrizes.includes(p)
);
const thirdPrizes = randomChoice(remainingAfterSecond, 5) as string[];
console.log(`🥉 三等奖获得者：${thirdPrizes.join(', ')}\n`);

// ============================================
// 场景 4: 随机数据生成 (测试用途)
// ============================================
console.log('=== 场景 4: 随机数据生成 ===');

interface TestData {
  id: string;
  age: number;
  score: number;
  isActive: boolean;
  level: string;
}

function generateTestData(count: number): TestData[] {
  const levels = ['初级', '中级', '高级', '专家'];
  
  return Array.from({ length: count }, () => ({
    id: randomUUID(),
    age: randomInt(18, 65),
    score: randomFloat(0, 100, 2),
    isActive: randomBool(0.8), // 80% 概率激活
    level: randomChoice(levels) as string,
  }));
}

const testData = generateTestData(5);
testData.forEach((data, index) => {
  console.log(`用户 ${index + 1}:`);
  console.log(`  ID: ${data.id}`);
  console.log(`  年龄：${data.age}`);
  console.log(`  分数：${data.score}`);
  console.log(`  激活状态：${data.isActive ? '✅' : '❌'}`);
  console.log(`  等级：${data.level}\n`);
});

// ============================================
// 场景 5: 随机事件模拟
// ============================================
console.log('=== 场景 5: 随机事件模拟 ===');

/**
 * 模拟掷骰子
 */
function rollDice(sides: number = 6): number {
  return randomInt(1, sides);
}

console.log('掷骰子 (6 面):');
for (let i = 0; i < 5; i++) {
  console.log(`  第 ${i + 1} 次：${rollDice()}`);
}

console.log('\n掷骰子 (20 面 - D&D):');
for (let i = 0; i < 5; i++) {
  console.log(`  第 ${i + 1} 次：${rollDice(20)}`);
}

// ============================================
// 场景 6: 随机颜色生成
// ============================================
console.log('\n=== 场景 6: 随机颜色生成 ===');

/**
 * 生成随机十六进制颜色
 */
function generateRandomColor(): string {
  const chars = '0123456789ABCDEF';
  return '#' + randomString(6, { chars });
}

/**
 * 生成随机 RGB 颜色
 */
function generateRandomRGB(): string {
  const r = randomInt(0, 255);
  const g = randomInt(0, 255);
  const b = randomInt(0, 255);
  return `rgb(${r}, ${g}, ${b})`;
}

console.log(`十六进制颜色 1: ${generateRandomColor()}`);
console.log(`十六进制颜色 2: ${generateRandomColor()}`);
console.log(`十六进制颜色 3: ${generateRandomColor()}`);
console.log(`RGB 颜色 1: ${generateRandomRGB()}`);
console.log(`RGB 颜色 2: ${generateRandomRGB()}`);
console.log(`RGB 颜色 3: ${generateRandomRGB()}\n`);

// ============================================
// 场景 7: 数组随机化
// ============================================
console.log('=== 场景 7: 数组随机化 ===');

const playlist = [
  '歌曲 A',
  '歌曲 B',
  '歌曲 C',
  '歌曲 D',
  '歌曲 E',
  '歌曲 F',
  '歌曲 G',
  '歌曲 H',
];

console.log('原始播放列表:');
playlist.forEach((song, i) => console.log(`  ${i + 1}. ${song}`));

const shuffledPlaylist = shuffle(playlist);
console.log('\n随机播放列表:');
shuffledPlaylist.forEach((song, i) => console.log(`  ${i + 1}. ${song}`));

// ============================================
// 场景 8: A/B 测试分组
// ============================================
console.log('\n=== 场景 8: A/B 测试分组 ===');

const testUsers = Array.from({ length: 20 }, (_, i) => `用户${i + 1}`);

const groupA: string[] = [];
const groupB: string[] = [];

testUsers.forEach((user) => {
  if (randomBool(0.5)) {
    groupA.push(user);
  } else {
    groupB.push(user);
  }
});

console.log(`A 组 (${groupA.length}人): ${groupA.join(', ')}`);
console.log(`B 组 (${groupB.length}人): ${groupB.join(', ')}\n`);

// ============================================
// 场景 9: 随机时间间隔
// ============================================
console.log('=== 场景 9: 随机时间间隔 ===');

/**
 * 生成随机延迟时间 (用于防抖、限流等场景)
 * @param minMs 最小毫秒数
 * @param maxMs 最大毫秒数
 */
function randomDelay(minMs: number, maxMs: number): number {
  return randomInt(minMs, maxMs);
}

console.log('模拟请求延迟:');
for (let i = 0; i < 5; i++) {
  const delay = randomDelay(100, 500);
  console.log(`  请求 ${i + 1}: 延迟 ${delay}ms`);
}

// ============================================
// 总结
// ============================================
console.log('\n✅ 所有使用示例执行完成!');
console.log('\n📚 可用函数:');
console.log('  - randomInt(min, max): 随机整数');
console.log('  - randomFloat(min, max, precision): 随机浮点数');
console.log('  - randomString(length, options): 随机字符串');
console.log('  - randomChoice(arr, count): 随机选择');
console.log('  - shuffle(arr): 数组打乱');
console.log('  - randomBool(probability): 随机布尔值');
console.log('  - randomUUID(): 随机 UUID');
