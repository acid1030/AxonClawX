/**
 * ID Generator Skill - 使用示例
 * 
 * 演示如何使用 id-generator-skill.ts 中的各种 ID 生成函数
 */

import {
  generateUUID,
  generateShortId,
  generateUniqueShortId,
  generateOrderNumber,
  batchGenerate,
} from './id-generator-skill';

// ============================================================================
// 示例 1: UUID 生成
// ============================================================================

console.log('=== UUID 生成示例 ===\n');

// 基础用法
const uuid1 = generateUUID();
console.log('标准 UUID:', uuid1);
// 输出示例：550e8400-e29b-41d4-a716-446655440000

// 批量生成 UUID
const uuids = batchGenerate(generateUUID, 3);
console.log('批量 UUID:', uuids);
// 输出示例：["uuid1", "uuid2", "uuid3"]

console.log('');

// ============================================================================
// 示例 2: 短 ID 生成
// ============================================================================

console.log('=== 短 ID 生成示例 ===\n');

// 默认长度 (8 位)
const shortId1 = generateShortId();
console.log('默认短 ID:', shortId1);
// 输出示例：aB3xK9mN

// 自定义长度
const shortId2 = generateShortId(12);
console.log('12 位短 ID:', shortId2);
// 输出示例：xK9mNaB3xK9m

// 带前缀
const shortId3 = generateShortId(8, 'usr_');
console.log('带前缀短 ID:', shortId3);
// 输出示例：usr_aB3xK9mN

// 唯一短 ID (含时间戳)
const uniqueShortId = generateUniqueShortId();
console.log('唯一短 ID:', uniqueShortId);
// 输出示例：kL8mN2pQ4r

// 批量生成短 ID
const shortIds = batchGenerate(() => generateShortId(6), 5);
console.log('批量短 ID:', shortIds);
// 输出示例：["aB3xK9", "mN2pQ4", "rS5tU6", "vW7xY8", "zA9bC0"]

console.log('');

// ============================================================================
// 示例 3: 订单号生成
// ============================================================================

console.log('=== 订单号生成示例 ===\n');

// 默认格式
const order1 = generateOrderNumber();
console.log('默认订单号:', order1);
// 输出示例：ORD-20260313-8472639

// 自定义前缀和日期格式
const order2 = generateOrderNumber({
  prefix: 'PAY',
  dateFormat: 'YYMMDD',
  randomLength: 6,
});
console.log('支付订单号:', order2);
// 输出示例：PAY-260313-847263

// 带校验位
const order3 = generateOrderNumber({
  prefix: 'ORD',
  separator: '_',
  includeCheckDigit: true,
});
console.log('带校验位订单号:', order3);
// 输出示例：ORD_20260313_8472639_5

// 无前缀订单号
const order4 = generateOrderNumber({
  prefix: '',
  dateFormat: 'YYYYMMDD',
  randomLength: 10,
  separator: '',
});
console.log('无前缀订单号:', order4);
// 输出示例：202603138472639104

// 批量生成订单号
const orders = batchGenerate(() => generateOrderNumber({ prefix: 'TEST' }), 3);
console.log('批量订单号:', orders);
// 输出示例：["TEST-20260313-1234567", "TEST-20260313-2345678", "TEST-20260313-3456789"]

console.log('');

// ============================================================================
// 示例 4: 实际应用场景
// ============================================================================

console.log('=== 实际应用场景示例 ===\n');

// 场景 1: 用户注册 - 生成用户 ID
interface User {
  id: string;
  username: string;
  createdAt: Date;
}

const newUser: User = {
  id: generateShortId(10, 'user_'),
  username: 'alice',
  createdAt: new Date(),
};
console.log('新用户:', newUser);
// 输出示例：{ id: "user_aB3xK9mN2p", username: "alice", createdAt: Date }

// 场景 2: 订单创建 - 生成订单号
interface Order {
  orderNumber: string;
  userId: string;
  amount: number;
  status: 'pending' | 'paid' | 'shipped';
}

const newOrder: Order = {
  orderNumber: generateOrderNumber({ prefix: 'ORD', dateFormat: 'YYYYMMDD', randomLength: 8 }),
  userId: generateUUID(),
  amount: 299.99,
  status: 'pending',
};
console.log('新订单:', newOrder);
// 输出示例：{ orderNumber: "ORD-20260313-8472639", userId: "uuid...", amount: 299.99, status: "pending" }

// 场景 3: 会话管理 - 生成会话令牌
interface Session {
  sessionId: string;
  token: string;
  expiresAt: Date;
}

const session: Session = {
  sessionId: generateUUID(),
  token: generateUniqueShortId(16),
  expiresAt: new Date(Date.now() + 3600000), // 1 小时后过期
};
console.log('会话令牌:', session);
// 输出示例：{ sessionId: "uuid...", token: "kL8mN2pQ4rS5tU6v", expiresAt: Date }

// 场景 4: 邀请码生成
function generateInviteCode(count: number = 1): string[] {
  return batchGenerate(() => generateShortId(8, 'INV-'), count);
}

const inviteCodes = generateInviteCode(5);
console.log('邀请码:', inviteCodes);
// 输出示例：["INV-aB3xK9mN", "INV-mN2pQ4rS", "INV-tU6vW7xY", "INV-zA9bC0dE", "INV-fG1hI2jK"]

console.log('');

// ============================================================================
// 示例 5: 性能测试
// ============================================================================

console.log('=== 性能测试示例 ===\n');

// 测试批量生成性能
const startTime = Date.now();
const bulkIds = batchGenerate(generateUUID, 1000);
const endTime = Date.now();

console.log(`生成 1000 个 UUID 耗时：${endTime - startTime}ms`);
console.log(`平均每个 ID 耗时：${((endTime - startTime) / 1000).toFixed(3)}ms`);
console.log(`生成数量：${bulkIds.length}`);

// 验证唯一性
const uniqueIds = new Set(bulkIds);
console.log(`唯一性验证：${uniqueIds.size === bulkIds.length ? '✓ 通过' : '✗ 失败'}`);

console.log('');
console.log('=== 所有示例完成 ===');
