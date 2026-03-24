/**
 * NOVA 会话管理工具 - 使用示例
 * 
 * @author NOVA
 * @version 1.0.0
 */

import {
  createSessionManager,
  createSessionUtils,
  SessionData,
  SessionConfig,
} from './session-utils-skill';

// ==================== 示例 1: 基础使用 ====================

function basicUsage() {
  console.log('=== 示例 1: 基础使用 ===\n');

  // 创建会话管理器
  const config: SessionConfig = {
    defaultTTL: 30 * 60 * 1000,  // 30 分钟
    maxSessionsPerUser: 5,
    cleanupInterval: 60 * 1000,  // 1 分钟清理一次
  };

  const manager = createSessionManager(config);

  // 创建会话
  const session1 = manager.create('user_123', {
    data: { username: '张三', role: 'admin' },
    metadata: {
      userAgent: 'Mozilla/5.0...',
      ip: '192.168.1.100',
      tags: ['web', 'mobile'],
    },
  });

  console.log('✓ 创建会话:', session1.id);
  console.log('  用户 ID:', session1.userId);
  console.log('  过期时间:', new Date(session1.expiresAt).toLocaleString());

  // 获取会话
  const retrieved = manager.get(session1.id);
  if (retrieved) {
    console.log('\n✓ 获取会话成功');
    console.log('  数据:', retrieved.data);
  }

  // 更新会话数据
  manager.update(session1.id, { lastLogin: new Date().toISOString() });
  console.log('\n✓ 更新会话数据');

  // 刷新会话 (延长过期时间)
  manager.refresh(session1.id, 60 * 60 * 1000);  // 延长到 1 小时
  console.log('✓ 刷新会话过期时间');

  // 列出用户的所有会话
  const userSessions = manager.list({ userId: 'user_123' });
  console.log(`\n✓ 用户 user_123 共有 ${userSessions.length} 个会话`);

  // 销毁会话
  manager.destroy(session1.id);
  console.log('✓ 销毁会话');

  // 清理管理器
  manager.dispose();
  console.log('✓ 管理器已销毁\n');
}

// ==================== 示例 2: 使用便捷工具函数 ====================

function utilsUsage() {
  console.log('=== 示例 2: 便捷工具函数 ===\n');

  const utils = createSessionUtils({
    defaultTTL: 60 * 60 * 1000,  // 1 小时
    maxSessionsPerUser: 3,
  });

  // 创建会话
  const session = utils.createSession('user_456', {
    data: { cart: ['item1', 'item2'], preferences: { theme: 'dark' } },
  });

  console.log('✓ 创建会话:', session.id);

  // 获取会话
  const current = utils.getSession(session.id);
  console.log('✓ 当前会话数据:', current?.data);

  // 更新购物车
  utils.updateSession(session.id, { cart: ['item1', 'item2', 'item3'] });
  console.log('✓ 更新购物车');

  // 获取统计信息
  const stats = utils.getSessionStats();
  console.log('\n✓ 会话统计:');
  console.log('  总会话数:', stats.totalSessions);
  console.log('  活跃会话:', stats.activeSessions);
  console.log('  平均每会话时长:', Math.round(stats.avgSessionDuration / 1000), '秒');

  // 清理
  utils.destroySession(session.id);
  utils.dispose();
  console.log('\n✓ 清理完成\n');
}

// ==================== 示例 3: 事件监听 ====================

function eventUsage() {
  console.log('=== 示例 3: 事件监听 ===\n');

  const manager = createSessionManager({
    defaultTTL: 5 * 60 * 1000,  // 5 分钟 (快速测试)
    cleanupInterval: 10 * 1000,
  });

  // 注册事件监听器
  (manager as any).on('create', (session: SessionData) => {
    console.log('📝 [事件] 会话创建:', session.id);
  });

  (manager as any).on('update', (session: SessionData) => {
    console.log('📝 [事件] 会话更新:', session.id);
  });

  (manager as any).on('refresh', (session: SessionData) => {
    console.log('📝 [事件] 会话刷新:', session.id);
  });

  (manager as any).on('destroy', (session: SessionData) => {
    console.log('📝 [事件] 会话销毁:', session.id);
  });

  // 触发事件
  const session = manager.create('user_789');
  manager.update(session.id, { action: 'test' });
  manager.refresh(session.id);
  manager.destroy(session.id);

  manager.dispose();
  console.log('\n✓ 事件监听测试完成\n');
}

// ==================== 示例 4: 会话过期测试 ====================

async function expirationTest() {
  console.log('=== 示例 4: 会话过期测试 ===\n');

  const manager = createSessionManager({
    defaultTTL: 2000,  // 2 秒 (快速测试)
    cleanupInterval: 1000,
  });

  const session = manager.create('user_expire_test', {
    data: { test: 'value' },
  });

  console.log('✓ 创建会话:', session.id);
  console.log('  过期时间:', session.expiresAt - Date.now(), 'ms');

  // 等待 3 秒，让会话过期
  console.log('\n⏳ 等待 3 秒让会话过期...');
  await new Promise(resolve => setTimeout(resolve, 3000));

  // 尝试获取过期会话
  const expired = manager.get(session.id);
  if (!expired) {
    console.log('✓ 会话已自动过期并被清理');
  }

  // 手动清理
  const cleaned = manager.cleanup();
  console.log('✓ 手动清理完成，清理了', cleaned, '个会话');

  manager.dispose();
  console.log('\n✓ 过期测试完成\n');
}

// ==================== 示例 5: 实际应用场景 ====================

function realWorldUsage() {
  console.log('=== 示例 5: 实际应用场景 ===\n');

  // 场景 1: Web 应用会话管理
  console.log('【场景 1】Web 应用登录会话');
  const webSessions = createSessionUtils({
    defaultTTL: 2 * 60 * 60 * 1000,  // 2 小时
    maxSessionsPerUser: 3,
  });

  const webSession = webSessions.createSession('user_web', {
    data: {
      username: 'alice',
      email: 'alice@example.com',
      permissions: ['read', 'write'],
    },
    metadata: {
      userAgent: 'Chrome/120.0',
      ip: '10.0.0.1',
      tags: ['web', 'production'],
    },
  });
  console.log('  ✓ Web 会话创建:', webSession.id);

  // 场景 2: API 令牌会话
  console.log('\n【场景 2】API 令牌管理');
  const apiSessions = createSessionUtils({
    defaultTTL: 24 * 60 * 60 * 1000,  // 24 小时
    maxSessionsPerUser: 10,
  });

  const apiSession = apiSessions.createSession('api_user_1', {
    data: {
      apiKey: 'sk_xxxx_xxxx_xxxx',
      rateLimit: 1000,
      scopes: ['read', 'write', 'delete'],
    },
    metadata: {
      tags: ['api', 'production'],
    },
  });
  console.log('  ✓ API 会话创建:', apiSession.id);

  // 场景 3: 临时验证码会话
  console.log('\n【场景 3】临时验证码');
  const otpSessions = createSessionUtils({
    defaultTTL: 5 * 60 * 1000,  // 5 分钟
    maxSessionsPerUser: 5,
  });

  const otpSession = otpSessions.createSession('user_verify', {
    data: {
      code: '123456',
      type: 'email',
      attempts: 0,
    },
  });
  console.log('  ✓ OTP 会话创建:', otpSession.id);

  // 清理
  webSessions.dispose();
  apiSessions.dispose();
  otpSessions.dispose();
  console.log('\n✓ 所有场景测试完成\n');
}

// ==================== 运行所有示例 ====================

async function runAllExamples() {
  console.log('╔════════════════════════════════════════╗');
  console.log('║  NOVA 会话管理工具 - 使用示例          ║');
  console.log('╚════════════════════════════════════════╝\n');

  try {
    basicUsage();
    utilsUsage();
    eventUsage();
    await expirationTest();
    realWorldUsage();

    console.log('╔════════════════════════════════════════╗');
    console.log('║  ✓ 所有示例运行完成                    ║');
    console.log('╚════════════════════════════════════════╝');
  } catch (error) {
    console.error('✗ 示例运行失败:', error);
    process.exit(1);
  }
}

// 如果直接运行此文件
if (require.main === module) {
  runAllExamples();
}

// 导出示例函数供测试使用
export {
  basicUsage,
  utilsUsage,
  eventUsage,
  expirationTest,
  realWorldUsage,
  runAllExamples,
};
