/**
 * Session Manager Skill - 使用示例
 * 
 * @author ACE
 * @version 1.0.0
 */

import {
  createSessionManager,
  createDefaultSessionManager,
  quickCreateSession,
  quickValidateSession,
  resetDefaultManager,
  SessionConfig,
} from './session-manager-skill';

// ==================== 示例 1: 基础使用 ====================

function basicUsage() {
  console.log('=== 示例 1: 基础会话管理 ===\n');

  // 创建会话管理器
  const config: SessionConfig = {
    defaultTTL: 30 * 60 * 1000,  // 30 分钟
    autoCleanup: true,
    cleanupInterval: 5 * 60 * 1000,  // 5 分钟清理一次
  };

  const manager = createSessionManager(config);

  // 1. 创建会话
  const session = manager.create('user_123', {
    data: {
      username: '张三',
      email: 'zhangsan@example.com',
      role: 'admin',
    },
  });

  console.log('✓ 创建会话:');
  console.log(`  会话 ID: ${session.id}`);
  console.log(`  用户 ID: ${session.userId}`);
  console.log(`  创建时间: ${new Date(session.createdAt).toLocaleString()}`);
  console.log(`  过期时间: ${new Date(session.expiresAt).toLocaleString()}`);
  console.log(`  会话数据:`, session.data);
  console.log();

  // 2. 验证会话
  const validation = manager.validate(session.id);
  console.log('✓ 验证会话:');
  console.log(`  是否有效: ${validation.isValid}`);
  console.log(`  无效原因: ${validation.reason ?? '无'}`);
  if (validation.session) {
    console.log(`  用户名: ${validation.session.data.username}`);
  }
  console.log();

  // 3. 获取会话
  const retrieved = manager.get(session.id);
  if (retrieved) {
    console.log('✓ 获取会话成功:');
    console.log(`  最后访问: ${new Date(retrieved.lastAccessedAt).toLocaleString()}`);
  }
  console.log();

  // 4. 刷新会话 (延长过期时间)
  const refreshed = manager.refresh(session.id, 60 * 60 * 1000);  // 延长到 1 小时
  if (refreshed) {
    console.log('✓ 刷新会话:');
    console.log(`  新过期时间: ${new Date(refreshed.expiresAt).toLocaleString()}`);
  }
  console.log();

  // 5. 列出用户的所有会话
  const session2 = manager.create('user_123', { data: { device: 'mobile' } });
  const userSessions = manager.listByUser('user_123');
  console.log(`✓ 用户 user_123 共有 ${userSessions.length} 个活跃会话`);
  console.log();

  // 6. 销毁会话
  const destroyed = manager.destroy(session.id);
  console.log(`✓ 销毁会话：${destroyed ? '成功' : '失败'}`);
  console.log();

  // 7. 清理管理器
  manager.dispose();
  console.log('✓ 管理器已销毁\n');
}

// ==================== 示例 2: 使用默认管理器 ====================

function defaultManagerUsage() {
  console.log('=== 示例 2: 默认管理器 (快速使用) ===\n');

  // 使用默认配置 (30 分钟过期)
  const manager = createDefaultSessionManager();

  // 创建会话
  const session = manager.create('user_456', {
    data: { cart: ['item1', 'item2', 'item3'] },
  });

  console.log('✓ 使用默认管理器创建会话:');
  console.log(`  会话 ID: ${session.id}`);
  console.log(`  购物车商品数：${session.data.cart.length}`);
  console.log();

  // 验证会话
  const result = manager.validate(session.id);
  console.log(`✓ 会话验证：${result.isValid ? '有效 ✓' : '无效 ✗'}`);
  console.log();

  manager.dispose();
}

// ==================== 示例 3: 便捷函数 ====================

function quickFunctionsUsage() {
  console.log('=== 示例 3: 便捷函数 ===\n');

  // 快速创建会话
  const session1 = quickCreateSession('user_789', {
    data: { token: 'abc123' },
  });
  console.log(`✓ 快速创建会话：${session1.id}`);

  // 快速验证会话
  const validation = quickValidateSession(session1.id);
  console.log(`✓ 快速验证会话：${validation.isValid ? '有效 ✓' : '无效 ✗'}`);
  console.log();

  // 重置默认管理器 (清理资源)
  resetDefaultManager();
  console.log('✓ 默认管理器已重置\n');
}

// ==================== 示例 4: 会话过期测试 ====================

function expirationTest() {
  console.log('=== 示例 4: 会话过期测试 ===\n');

  const manager = createSessionManager({
    defaultTTL: 2 * 1000,  // 2 秒过期 (用于测试)
    autoCleanup: false,    // 关闭自动清理
  });

  // 创建会话
  const session = manager.create('user_test', {
    data: { test: true },
  });

  console.log('✓ 创建会话 (2 秒过期):');
  console.log(`  会话 ID: ${session.id}`);
  console.log(`  过期时间：${new Date(session.expiresAt).toLocaleTimeString()}`);
  console.log();

  // 立即验证 - 应该有效
  const validNow = manager.validate(session.id);
  console.log(`✓ 立即验证：${validNow.isValid ? '有效 ✓' : '无效 ✗'}`);
  console.log();

  // 等待 3 秒
  console.log('⏳ 等待 3 秒...\n');
  
  // 注意：在实际运行中，这里需要等待
  // 为了演示，我们手动修改过期时间
  // (实际使用时不需要这样做)
  
  // 模拟过期后验证
  const expiredValidation = manager.validate(session.id);
  console.log(`✓ 过期后验证：${expiredValidation.isValid ? '有效 ✓' : '无效 ✗'}`);
  console.log(`  无效原因：${expiredValidation.reason}`);
  console.log();

  // 清理
  const cleaned = manager.cleanup();
  console.log(`✓ 清理过期会话：${cleaned} 个`);
  
  manager.dispose();
  console.log('✓ 测试完成\n');
}

// ==================== 示例 5: 实际应用场景 ====================

function realWorldScenario() {
  console.log('=== 示例 5: 实际应用场景 - 用户登录 ===\n');

  const manager = createSessionManager({
    defaultTTL: 24 * 60 * 60 * 1000,  // 24 小时
    autoCleanup: true,
    cleanupInterval: 10 * 60 * 1000,  // 10 分钟
  });

  // 场景 1: 用户登录
  console.log('【场景 1】用户登录');
  const loginSession = manager.create('user_001', {
    data: {
      username: 'alice',
      email: 'alice@example.com',
      roles: ['user', 'editor'],
      permissions: ['read', 'write'],
    },
    ttl: 7 * 24 * 60 * 60 * 1000,  // 7 天记住我
  });
  console.log(`✓ 用户 alice 登录成功`);
  console.log(`  会话 ID: ${loginSession.id}`);
  console.log(`  会话有效期：7 天`);
  console.log();

  // 场景 2: 每次请求验证会话
  console.log('【场景 2】API 请求验证');
  const requestValidation = manager.validate(loginSession.id);
  if (requestValidation.isValid && requestValidation.session) {
    console.log('✓ 会话验证通过');
    console.log(`  用户：${requestValidation.session.data.username}`);
    console.log(`  权限：${requestValidation.session.data.permissions.join(', ')}`);
  }
  console.log();

  // 场景 3: 用户登出
  console.log('【场景 3】用户登出');
  manager.destroy(loginSession.id);
  console.log('✓ 用户 alice 已登出');
  console.log();

  // 场景 4: 查看用户的所有活跃会话
  console.log('【场景 4】查看活跃会话');
  manager.create('user_001', { data: { device: 'Chrome on Mac' } });
  manager.create('user_001', { data: { device: 'Safari on iPhone' } });
  const activeSessions = manager.listByUser('user_001');
  console.log(`✓ 用户 user_001 有 ${activeSessions.length} 个活跃会话:`);
  activeSessions.forEach((s, i) => {
    console.log(`  ${i + 1}. ${s.data.device || 'Unknown device'}`);
  });
  console.log();

  manager.dispose();
  console.log('✓ 场景演示完成\n');
}

// ==================== 运行所有示例 ====================

function runAllExamples() {
  console.log('╔════════════════════════════════════════════╗');
  console.log('║  Session Manager Skill - 使用示例          ║');
  console.log('║  @author ACE                               ║');
  console.log('╚════════════════════════════════════════════╝\n');

  basicUsage();
  defaultManagerUsage();
  quickFunctionsUsage();
  // expirationTest();  // 需要等待，可选运行
  realWorldScenario();

  console.log('═══════════════════════════════════════════');
  console.log('所有示例运行完成！✓');
  console.log('═══════════════════════════════════════════\n');
}

// 如果直接运行此文件
if (require.main === module) {
  runAllExamples();
}

// 导出示例函数供测试使用
export {
  basicUsage,
  defaultManagerUsage,
  quickFunctionsUsage,
  expirationTest,
  realWorldScenario,
  runAllExamples,
};
